// Panel de herramientas del visor: opacidad, separar, cortes, vistas, etiquetas y captura.
// Es genérico: funciona con cualquier módulo porque solo usa la API del motor.

export function crearPanelHerramientas({ motor, getDatos, avisar }) {
  const q = (s) => document.getElementById(s);
  const rOpacidad = q('r-opacidad'), rExplosion = q('r-explosion'), sCorte = q('s-corte');
  const rCorte = q('r-corte'), bInvertir = q('b-invertir'), sVista = q('s-vista');
  const bEtiquetas = q('b-etiquetas'), bCaptura = q('b-captura'), panel = q('panel-herr');
  const capa = q('etiquetas'), lineas = q('lineas'), capaRotulos = q('rotulos');
  let rotulos = [];
  let invertir = false, etiquetasActivas = false;
  const nodos = new Map(); // id -> { etiqueta, linea }

  // Opacidad y separación
  rOpacidad.addEventListener('input', () => motor.setOpacidad(+rOpacidad.value));
  rExplosion.addEventListener('input', () => motor.setExplosion(+rExplosion.value));

  // Planos de corte
  function aplicarCorte() {
    const eje = sCorte.value;
    rCorte.disabled = bInvertir.disabled = !eje;
    motor.setCorte(eje ? { eje, t: +rCorte.value, invertir } : null);
  }
  sCorte.addEventListener('change', aplicarCorte);
  rCorte.addEventListener('input', aplicarCorte);
  bInvertir.addEventListener('click', () => {
    invertir = !invertir;
    bInvertir.setAttribute('aria-pressed', String(invertir));
    aplicarCorte();
  });

  // Vistas rápidas
  sVista.addEventListener('change', () => {
    if (sVista.value) motor.vista(sVista.value);
    sVista.value = '';
  });

  // Etiquetas con línea guía
  function construirEtiquetas() {
    capa.innerHTML = ''; lineas.innerHTML = ''; nodos.clear();
    const datos = getDatos();
    for (const id of motor.idsEstructuras()) {
      const etiqueta = document.createElement('button');
      etiqueta.type = 'button';
      etiqueta.className = 'etq';
      etiqueta.textContent = datos?.estructuras?.[id]?.nombre || id;
      etiqueta.addEventListener('click', () => { motor.seleccionar(id); });
      const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      capa.appendChild(etiqueta); lineas.appendChild(linea);
      nodos.set(id, { etiqueta, linea });
    }
  }
  function actualizarEtiquetas() {
    if (!etiquetasActivas) return;
    const { lista, ancho, alto } = motor.anclas();
    const cx = ancho / 2, cy = alto / 2, sel = motor.getSeleccion();
    const visibles = new Set(lista.map((a) => a.id));
    for (const [id, n] of nodos) {
      const ver = visibles.has(id);
      n.etiqueta.hidden = !ver;
      n.linea.style.display = ver ? '' : 'none';
    }
    for (const a of lista) {
      const n = nodos.get(a.id);
      if (!n) continue;
      let dx = a.x - cx, dy = a.y - cy;
      const largo = Math.hypot(dx, dy) || 1;
      dx /= largo; dy /= largo;
      const ex = a.x + dx * 58, ey = a.y + dy * 40;
      n.etiqueta.style.transform = `translate(${ex}px, ${ey}px) translate(${dx < 0 ? '-100%' : '0'}, -50%)`;
      n.etiqueta.classList.toggle('activa', a.id === sel);
      n.linea.setAttribute('x1', a.x); n.linea.setAttribute('y1', a.y);
      n.linea.setAttribute('x2', ex); n.linea.setAttribute('y2', ey);
      n.linea.classList.toggle('activa', a.id === sel);
    }
  }
  bEtiquetas.addEventListener('click', () => {
    etiquetasActivas = !etiquetasActivas;
    bEtiquetas.setAttribute('aria-pressed', String(etiquetasActivas));
    capa.hidden = lineas.hidden = !etiquetasActivas;
    if (etiquetasActivas) { construirEtiquetas(); actualizarEtiquetas(); }
  });
  motor.on('render', actualizarEtiquetas);

  // Rótulos fijos del módulo (p. ej. "Espacio extracelular")
  function construirRotulos(lista) {
    capaRotulos.innerHTML = '';
    rotulos = (lista || getDatos()?.rotulos || []).map((r) => {
      const el = document.createElement('span');
      el.className = 'rotulo'; el.textContent = r.texto;
      capaRotulos.appendChild(el);
      return { el, pos: r.pos };
    });
    actualizarRotulos();
  }
  function actualizarRotulos() {
    for (const r of rotulos) {
      const p = motor.proyectar(r.pos);
      r.el.hidden = !p;
      if (p) r.el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    }
  }
  motor.on('render', actualizarRotulos);
  motor.on('rotulos', (lista) => construirRotulos(lista));
  motor.on('seleccion', actualizarEtiquetas);

  // Captura PNG
  bCaptura.addEventListener('click', () => {
    if (window.__ATLAS_VISTA_PREVIA) { avisar('La captura se descarga en la versión instalada desde GitHub.'); return; }
    const fondo = getComputedStyle(document.documentElement).getPropertyValue('--visor-b').trim() || '#b7c3c9';
    const enlace = document.createElement('a');
    enlace.href = motor.captura(fondo);
    enlace.download = `atlas3d-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
    enlace.click();
    avisar('Captura guardada en tu carpeta de descargas.');
  });

  // Panel plegable en pantallas pequeñas
  q('b-panel').addEventListener('click', (e) => {
    const abierto = panel.classList.toggle('abierto');
    e.currentTarget.setAttribute('aria-expanded', String(abierto));
  });

  return {
    reiniciar() { // al cambiar de módulo
      rExplosion.value = 0; sCorte.value = ''; rCorte.value = 0.5; invertir = false;
      bInvertir.setAttribute('aria-pressed', 'false');
      aplicarCorte();
      motor.setOpacidad(+rOpacidad.value);
      construirRotulos(null);
      if (etiquetasActivas) { construirEtiquetas(); actualizarEtiquetas(); }
    },
  };
}
