// Motor 3D: un solo renderer, render bajo demanda, materiales compartidos, selección.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLOR_SELECCION = new THREE.Color('#e0a526');

// Textura matcap generada por código (sin imágenes externas): da el aspecto de escultura.
function texturaMatcap(claro, medio, oscuro) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 256;
  const g = lienzo.getContext('2d');
  const base = g.createRadialGradient(104, 92, 8, 128, 128, 132);
  base.addColorStop(0, claro); base.addColorStop(0.6, medio); base.addColorStop(1, oscuro);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  const brillo = g.createRadialGradient(92, 78, 0, 92, 78, 46);
  brillo.addColorStop(0, 'rgba(255,255,255,0.5)'); brillo.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = brillo; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(lienzo);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearMotor(contenedor) {
  const esMovil = matchMedia('(pointer: coarse)').matches;
  const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, esMovil ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const lienzo = renderer.domElement;
  lienzo.setAttribute('aria-label', 'Visor del modelo 3D');
  contenedor.appendChild(lienzo);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  camara.position.set(2.4, 1.3, 2.4);
  const controles = new OrbitControls(camara, lienzo);
  Object.assign(controles, { enableDamping: true, dampingFactor: 0.09, minDistance: 0.25,
    maxDistance: 10, zoomToCursor: true, rotateSpeed: 0.8 });
  const raiz = new THREE.Group();
  escena.add(raiz);

  const matcaps = {
    arcilla: texturaMatcap('#fdfaf5', '#cdc4b8', '#544c46'),
    neutro: texturaMatcap('#ffffff', '#b9b9b9', '#333333'),
  };
  const cacheMateriales = new Map();
  let modo = 'escultura';
  const estructuras = new Map(); // id -> { objetos: [], color, oculto }
  let seleccion = null, resaltado = null;
  let camaraInicial = { pos: new THREE.Vector3(2.4, 1.3, 2.4), objetivo: new THREE.Vector3() };
  let opacidad = 1, explosion = 0, corte = null; // corte: { eje, t, invertir }
  const plano = new THREE.Plane();
  const modelo = { caja: new THREE.Box3(), centro: new THREE.Vector3(), radio: 1 };

  const oyentes = {};
  const on = (ev, fn) => { (oyentes[ev] ||= []).push(fn); };
  const emitir = (ev, d) => oyentes[ev]?.forEach((fn) => fn(d));

  // ---------- Materiales (uno compartido por modo + color + variante) ----------
  // Variantes: n normal, h resaltado, s seleccionado, t semitransparente (por estructura)
  function material(color, variante) {
    const clave = `${modo}|${color}|${variante}|${opacidad}`;
    let m = cacheMateriales.get(clave);
    if (m) return m;
    const c = new THREE.Color(modo === 'escultura' ? '#ffffff' : color);
    if (variante === 's') c.copy(COLOR_SELECCION);
    else if (variante === 'h') c.lerp(COLOR_SELECCION, 0.35);
    const usaArcilla = modo === 'escultura' && variante !== 's';
    m = new THREE.MeshMatcapMaterial({ matcap: usaArcilla ? matcaps.arcilla : matcaps.neutro, color: c, side: THREE.DoubleSide });
    const transparente = modo === 'rayosx' ? variante !== 's' : variante === 't' || (opacidad < 1 && variante !== 's');
    if (transparente) {
      m.transparent = true; m.depthWrite = false;
      m.opacity = modo === 'rayosx' ? (variante === 'h' ? 0.4 : 0.13) : variante === 't' ? Math.min(0.22, opacidad) : opacidad;
    }
    cacheMateriales.set(clave, m);
    return m;
  }
  function purgarMateriales() { // libera materiales que ya no usa ninguna estructura
    const enUso = new Set();
    for (const e of estructuras.values()) for (const o of e.objetos) enUso.add(o.material);
    for (const [k, m] of cacheMateriales) if (!enUso.has(m)) { m.dispose(); cacheMateriales.delete(k); }
  }

  function pintar() {
    for (const [id, e] of estructuras) {
      const m = material(e.color, id === seleccion ? 's' : id === resaltado ? 'h' : e.transparente ? 't' : 'n');
      for (const o of e.objetos) { o.material = m; o.visible = !e.oculto; }
    }
    pedirRender();
  }

  // ---------- Render bajo demanda ----------
  const animaciones = new Set();
  let renderPendiente = false, cuadros = 0, ultimoConteo = performance.now();
  function pedirRender() {
    if (!renderPendiente) { renderPendiente = true; requestAnimationFrame(cuadro); }
  }
  function cuadro(t) {
    renderPendiente = false;
    for (const a of animaciones) if (!a(t)) animaciones.delete(a);
    const seMovio = controles.update();
    renderer.render(escena, camara);
    cuadros++;
    emitir('render');
    if (seMovio || animaciones.size) pedirRender();
  }
  controles.addEventListener('change', pedirRender);

  new ResizeObserver(() => {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h; camara.updateProjectionMatrix();
    pedirRender();
  }).observe(contenedor);

  // ---------- Cámara ----------
  function volarA(objetivo, posicion, ms = 650) {
    const t0 = performance.now(), a0 = controles.target.clone(), p0 = camara.position.clone();
    animaciones.add((t) => {
      const k = reducirMovimiento ? 1 : Math.min(1, Math.max(0, (t - t0) / ms));
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      controles.target.lerpVectors(a0, objetivo, e);
      camara.position.lerpVectors(p0, posicion, e);
      return k < 1;
    });
    pedirRender();
  }
  function setCamara(c, inmediato) {
    if (c) camaraInicial = { pos: new THREE.Vector3(...c.pos), objetivo: new THREE.Vector3(...c.objetivo) };
    if (inmediato) {
      camara.position.copy(camaraInicial.pos); controles.target.copy(camaraInicial.objetivo);
      controles.update(); pedirRender();
    } else volarA(camaraInicial.objetivo, camaraInicial.pos);
  }
  function enfocar(id) {
    const e = estructuras.get(id);
    if (!e) return;
    const caja = new THREE.Box3();
    e.objetos.forEach((o) => { if (o.visible) caja.expandByObject(o); });
    if (caja.isEmpty()) return;
    const centro = caja.getCenter(new THREE.Vector3());
    const radio = caja.getSize(new THREE.Vector3()).length() / 2;
    const dist = Math.max(radio / Math.sin(THREE.MathUtils.degToRad(camara.fov / 2)) * 1.1, 0.35);
    const dir = camara.position.clone().sub(controles.target).normalize();
    volarA(centro, centro.clone().addScaledVector(dir, dist));
  }

  // ---------- Selección ----------
  const rayo = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function elegir(x, y) {
    const r = lienzo.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, camara);
    const visibles = [];
    for (const e of estructuras.values()) if (!e.oculto) visibles.push(...e.objetos);
    const golpe = rayo.intersectObjects(visibles, false)
      .find((h) => !corte || plano.distanceToPoint(h.point) >= 0); // ignora lo que el corte esconde
    return golpe ? golpe.object.userData.estructura : null;
  }
  function seleccionar(id) {
    seleccion = id && estructuras.has(id) ? id : null;
    pintar();
    emitir('seleccion', seleccion);
  }

  let inicioToque = null;
  lienzo.addEventListener('pointerdown', (e) => { inicioToque = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  lienzo.addEventListener('pointerup', (e) => {
    if (!inicioToque) return;
    const d = Math.hypot(e.clientX - inicioToque.x, e.clientY - inicioToque.y);
    if (d < 6 && performance.now() - inicioToque.t < 600) seleccionar(elegir(e.clientX, e.clientY));
    inicioToque = null;
  });
  lienzo.addEventListener('dblclick', (e) => { const id = elegir(e.clientX, e.clientY); if (id) enfocar(id); });
  let movimientoPendiente = null;
  lienzo.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    if (!movimientoPendiente) requestAnimationFrame(() => {
      const { x, y } = movimientoPendiente; movimientoPendiente = null;
      const id = elegir(x, y);
      if (id !== resaltado) { resaltado = id; pintar(); }
      emitir('hover', { id, x, y });
    });
    movimientoPendiente = { x: e.clientX, y: e.clientY };
  });
  lienzo.addEventListener('pointerleave', () => {
    if (resaltado) { resaltado = null; pintar(); }
    emitir('hover', { id: null });
  });

  // ---------- Modelo: límites, separación, cortes, vistas, etiquetas ----------
  function prepararModelo() {
    raiz.updateMatrixWorld(true);
    modelo.caja.setFromObject(raiz);
    modelo.caja.getCenter(modelo.centro);
    modelo.radio = Math.max(modelo.caja.getSize(new THREE.Vector3()).length() / 2, 0.01);
    const qPadre = new THREE.Quaternion();
    for (const e of estructuras.values()) for (const o of e.objetos) {
      const dir = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).sub(modelo.centro);
      o.parent.getWorldQuaternion(qPadre).invert();
      o.userData.posOriginal = o.position.clone();
      o.userData.dirSeparar = dir.applyQuaternion(qPadre);
    }
  }
  function aplicarCorte() {
    if (!corte) { renderer.clippingPlanes = []; pedirRender(); return; }
    const i = { x: 0, y: 1, z: 2 }[corte.eje];
    const min = modelo.caja.min.getComponent(i), max = modelo.caja.max.getComponent(i);
    const valor = min + corte.t * (max - min);
    const normal = new THREE.Vector3().setComponent(i, corte.invertir ? 1 : -1);
    plano.set(normal, corte.invertir ? -valor : valor);
    renderer.clippingPlanes = [plano];
    pedirRender();
  }
  const VISTAS = { anterior: [0, 0, 1], posterior: [0, 0, -1], derecha: [-1, 0, 0], izquierda: [1, 0, 0],
    superior: [0, 1, 0.001], inferior: [0, -1, 0.001] };
  function anclaLocal(o) { // punto sobre la superficie de la estructura, en coordenadas locales
    if (o.isInstancedMesh) { // no se guarda: las instancias pueden moverse (animaciones)
      const m = new THREE.Matrix4(); o.getMatrixAt(0, m);
      return new THREE.Vector3().setFromMatrixPosition(m);
    }
    if (o.userData.ancla) return o.userData.ancla;
    const v = new THREE.Vector3();
    {
      const pos = o.geometry.attributes.position;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const c = o.geometry.boundingBox.getCenter(new THREE.Vector3()), t = new THREE.Vector3();
      let mejor = Infinity;
      const paso = Math.max(1, Math.floor(pos.count / 600));
      for (let i = 0; i < pos.count; i += paso) {
        t.fromBufferAttribute(pos, i);
        const d = t.distanceToSquared(c);
        if (d < mejor) { mejor = d; v.copy(t); }
      }
    }
    return (o.userData.ancla = v);
  }

  // ---------- API pública ----------
  return {
    raiz, on, pedirRender, pintar, setCamara, enfocar, seleccionar,
    getSeleccion: () => seleccion,
    registrarEstructura(obj, id, color) {
      obj.userData.estructura = id;
      let e = estructuras.get(id);
      if (!e) { e = { objetos: [], color, oculto: false }; estructuras.set(id, e); }
      e.objetos.push(obj);
    },
    idsEstructuras: () => [...estructuras.keys()],
    estaOculta: (id) => !!estructuras.get(id)?.oculto,
    setModo(m) { modo = m; pintar(); emitir('modo', m); },
    getModo: () => modo,
    reiniciarVista() { setCamara(null, false); },
    aislar(id = seleccion) {
      if (!id) return;
      for (const [k, e] of estructuras) e.oculto = k !== id;
      pintar();
    },
    ocultar(id = seleccion) {
      const e = estructuras.get(id);
      if (!e) return;
      e.oculto = true;
      if (id === seleccion) seleccionar(null); else pintar();
    },
    mostrarTodo() { for (const e of estructuras.values()) e.oculto = false; pintar(); },
    prepararModelo,
    anunciar(texto) { emitir('leyenda', texto); },
    rotulos(lista) { emitir('rotulos', lista); }, // reemplaza los rótulos del módulo (null = los originales)
    volar(objetivo, posicion) { volarA(objetivo.clone(), posicion.clone()); },
    setColorEstructura(id, color) { const e = estructuras.get(id); if (e) { e.color = color; pintar(); } },
    colorEstructura: (id) => estructuras.get(id)?.color,
    fov: () => camara.fov, // texto de la fase actual de un proceso (o null)
    animar(fn) { // fn(t) se llama cada cuadro mientras devuelva true; regresa la función para detenerla
      animaciones.add(fn); pedirRender();
      return () => animaciones.delete(fn);
    },
    proyectar(v) { // [x,y,z] del mundo -> px relativos al visor, o null si queda detrás
      const r = lienzo.getBoundingClientRect();
      const p = new THREE.Vector3(...v).project(camara);
      if (p.z > 1) return null;
      return { x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height };
    },
    setTransparente(id = seleccion) {
      const e = estructuras.get(id); if (!e) return false;
      e.transparente = !e.transparente; pintar(); return e.transparente;
    },
    esTransparente: (id) => !!estructuras.get(id)?.transparente,
    esSeleccionable(id) { // tiene alguna pieza visible (no partículas apagadas ni piezas escondidas)
      const e = estructuras.get(id), s = new THREE.Vector3();
      return !!e && !e.oculto && e.objetos.some((o) => !(o.isInstancedMesh && o.count === 0) && o.getWorldScale(s).x > 0.01);
    },
    setOpacidad(v) { opacidad = Math.round(v * 20) / 20; pintar(); purgarMateriales(); },
    setExplosion(f) {
      explosion = f;
      for (const e of estructuras.values()) for (const o of e.objetos) {
        if (o.userData.posOriginal) o.position.copy(o.userData.posOriginal).addScaledVector(o.userData.dirSeparar, f * 1.3);
      }
      pedirRender();
    },
    setCorte(c) { corte = c; aplicarCorte(); },
    vista(nombre) {
      const d = VISTAS[nombre]; if (!d) return;
      const dist = Math.max(camara.position.distanceTo(controles.target), modelo.radio * 1.8);
      volarA(modelo.centro.clone(), modelo.centro.clone().addScaledVector(new THREE.Vector3(...d).normalize(), dist));
    },
    anclas() { // posición en pantalla (px, relativos al visor) de cada estructura visible
      const r = lienzo.getBoundingClientRect(), salida = [];
      for (const [id, e] of estructuras) {
        const o = e.objetos.find((x) => x.visible && !(x.isInstancedMesh && x.count === 0) && x.scale.x > 0.01);
        if (!o) continue;
        const w = anclaLocal(o).clone().applyMatrix4(o.matrixWorld);
        if (corte && plano.distanceToPoint(w) < 0) continue;
        const p = w.clone().project(camara);
        if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) continue;
        salida.push({ id, x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height });
      }
      return { lista: salida, ancho: r.width, alto: r.height };
    },
    captura(fondo) {
      renderer.render(escena, camara);
      const c = document.createElement('canvas');
      c.width = lienzo.width; c.height = lienzo.height;
      const g = c.getContext('2d');
      g.fillStyle = fondo; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(lienzo, 0, 0);
      return c.toDataURL('image/png');
    },
    limpiar() {
      raiz.traverse((o) => { o.geometry?.dispose(); if (o.isInstancedMesh) o.dispose(); });
      raiz.clear();
      estructuras.clear(); seleccion = null; resaltado = null; animaciones.clear();
      explosion = 0; corte = null; renderer.clippingPlanes = [];
      pedirRender();
    },
    info() {
      const ahora = performance.now();
      const fps = Math.round((cuadros * 1000) / (ahora - ultimoConteo));
      cuadros = 0; ultimoConteo = ahora;
      return { fps, triangulos: renderer.info.render.triangles,
        geometrias: renderer.info.memory.geometries, texturas: renderer.info.memory.textures,
        estructuras: estructuras.size };
    },
  };
}
