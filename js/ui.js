// Interfaz del dashboard: temario, ficha de espécimen, herramientas y avisos.
import { store } from './store.js';
import { AMBITOS, TEMAS } from './catalogo.js';
import { montarPunnett } from './punnett.js';
import { icono } from './iconos.js';
import { crearExamen } from './examen.js';

const $ = (s) => document.querySelector(s);
const escapar = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function crearUI({ motor, disponibles, alAbrirTema, alProceso }) {
  let datos = null, moduloId = null;
  const nav = $('#temario'), lateral = $('#lateral'), ficha = $('#ficha'), contenido = $('#ficha-contenido');
  const tooltip = $('#tooltip'), carga = $('#carga'), cargaTexto = $('#carga-texto');
  const depuracion = $('#depuracion'), aviso = $('#aviso');
  let temporizadorAviso = null, intervaloRend = null;

  // ---------- Temario ----------
  const avance = $('#avance'), velo = $('#velo');
  function itemTema(t) {
    const listo = disponibles.has(t.id);
    const total = store.total(t.id), vistos = store.vistos(t.id).length;
    const pct = total ? Math.round((vistos / total) * 100) : 0;
    const ex = (store.get('examenes') || {})[t.id];
    const meta = listo
      ? `<span class="tema-meta">${ex ? `<span class="tema-ex" title="Tu mejor resultado en el examen">${ex.mejor} %</span>` : ''}${total ? `${vistos}/${total}` : 'Nuevo'}</span><span class="tema-barra"><span style="width:${pct}%"></span></span>`
      : `<span class="tema-meta">${icono('candado')}Fase ${t.fase}</span>`;
    return `<li><button type="button" class="tema${listo ? '' : ' pendiente'}" data-id="${t.id}"
      ${t.id === moduloId ? 'aria-current="true"' : ''}><span class="tema-titulo">${escapar(t.titulo)}</span>${meta}</button></li>`;
  }
  function pintarTemario() {
    const cerrados = store.get('ambitosCerrados') || [];
    nav.innerHTML = AMBITOS.map((a) => {
      const temas = TEMAS.filter((t) => t.ambito === a.id);
      const listos = temas.filter((t) => disponibles.has(t.id)).length;
      const abierto = !cerrados.includes(a.id);
      return `<section class="ambito${abierto ? ' abierto' : ''}" data-ambito="${a.id}">
        <button type="button" class="ambito-cab" aria-expanded="${abierto}">
          <span class="ambito-icono">${icono(a.icono)}</span>
          <span class="ambito-titulo">${escapar(a.titulo)}</span>
          <span class="ambito-cuenta" title="Temas disponibles">${listos}/${temas.length}</span>${icono('chevron', 'chevron')}
        </button>
        <div class="ambito-cuerpo"><ul>${temas.map(itemTema).join('')}</ul></div></section>`;
    }).join('');
    // Avance general
    let vistos = 0, total = 0;
    const listos = TEMAS.filter((t) => disponibles.has(t.id));
    for (const t of listos) { vistos += store.vistos(t.id).length; total += store.total(t.id); }
    const pct = total ? Math.round((vistos / total) * 100) : 0;
    avance.innerHTML = `<strong>Tu avance</strong>
      <div class="barra-avance"><span style="width:${pct}%"></span></div>
      <p>${vistos} de ${total} estructuras revisadas. ${listos.length} de ${TEMAS.length} temas disponibles.</p>`;
  }
  function abrirMenu(abrir) {
    lateral.classList.toggle('abierta', abrir);
    velo.hidden = !abrir;
  }
  nav.addEventListener('click', (e) => {
    const cab = e.target.closest('.ambito-cab');
    if (cab) {
      const sec = cab.parentElement, id = sec.dataset.ambito;
      const abierto = sec.classList.toggle('abierto');
      cab.setAttribute('aria-expanded', String(abierto));
      const cerrados = new Set(store.get('ambitosCerrados') || []);
      abierto ? cerrados.delete(id) : cerrados.add(id);
      store.set('ambitosCerrados', [...cerrados]);
      return;
    }
    const b = e.target.closest('.tema');
    if (!b) return;
    const t = TEMAS.find((x) => x.id === b.dataset.id);
    abrirMenu(false);
    if (!disponibles.has(t.id)) { avisar(`"${t.titulo}" se construye en la fase ${t.fase} del plan.`); return; }
    if (t.id !== moduloId) alAbrirTema(t.id);
  });
  $('#btn-menu').addEventListener('click', () => abrirMenu(true));
  $('#btn-cerrar-menu').addEventListener('click', () => abrirMenu(false));
  velo.addEventListener('click', () => abrirMenu(false));

  // ---------- Ficha ----------
  const seccion = (titulo, texto, clase = '') => texto ? `<h3>${titulo}</h3><p class="${clase}">${escapar(texto)}</p>` : '';
  function listaEstructuras(actual) {
    const vistos = store.vistos(moduloId);
    const ids = motor.idsEstructuras();
    return `<h3>Estructuras de este modelo</h3><div class="lista-estr">${ids.map((id) => {
      const e = datos?.estructuras?.[id] || { nombre: id };
      return `<button type="button" data-estr="${id}" ${id === actual ? 'aria-current="true"' : ''}>
        <span class="punto" style="background:${escapar(e.color || '#999')}"></span>${escapar(e.nombre)}
        ${vistos.includes(id) ? '<span class="visto" aria-label="ya revisada">✓</span>' : ''}</button>`;
    }).join('')}</div>`;
  }
  function mostrarFicha(id) {
    const e = id && datos?.estructuras?.[id];
    if (!e) {
      contenido.innerHTML = `<p class="intro">Haz clic en una estructura del modelo, o elige una de la lista, para ver su ficha. Arrastra para girar, usa la rueda o pellizca para acercar y haz doble clic para centrar.</p>${listaEstructuras(null)}`;
      aplicarFiltro();
      return;
    }
    contenido.innerHTML = `
      <article class="etiqueta"><h2>${escapar(e.nombre)}</h2>${e.latin ? `<p class="latin">${escapar(e.latin)}</p>` : ''}</article>
      <div class="acciones">
        <button type="button" class="herr" data-acc="centrar">Centrar</button>
        <button type="button" class="herr" data-acc="aislar">Aislar</button>
        <button type="button" class="herr" data-acc="ocultar">Ocultar</button>
        <button type="button" class="herr" data-acc="transp" aria-pressed="${motor.esTransparente(id)}">Semitransparente</button>
      </div>
      ${seccion('Función', e.funcion)}
      ${seccion('Para el examen', e.claveExamen, 'clave')}
      ${seccion('Relación clínica', e.clinica)}
      ${e.pendiente ? '<p class="fuente">Ficha pendiente de revisión.</p>' : ''}
      ${(e.fuente || datos.fuenteGeneral) ? `<p class="fuente">Fuente: ${escapar(e.fuente || datos.fuenteGeneral)}</p>` : ''}
      ${listaEstructuras(id)}`;
    aplicarFiltro();
  }

  // ---------- Buscador (filtra la lista; Enter abre la primera coincidencia) ----------
  const buscar = $('#buscar');
  const normalizar = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function aplicarFiltro() {
    const texto = normalizar(buscar.value.trim());
    let hay = 0;
    contenido.querySelectorAll('[data-estr]').forEach((b) => {
      const e = datos?.estructuras?.[b.dataset.estr] || {};
      const coincide = !texto || normalizar(`${e.nombre} ${e.latin || ''}`).includes(texto);
      b.classList.toggle('oculto-filtro', !coincide);
      if (coincide) hay++;
    });
    contenido.querySelector('.sin-resultados')?.remove();
    if (texto && !hay) contenido.querySelector('.lista-estr')?.insertAdjacentHTML('afterend', '<p class="sin-resultados">Ninguna estructura coincide. Prueba con otra palabra o con el nombre en latín.</p>');
  }
  buscar.addEventListener('input', aplicarFiltro);
  buscar.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const primero = contenido.querySelector('[data-estr]:not(.oculto-filtro)');
    if (primero) primero.click();
  });
  contenido.addEventListener('click', (e) => {
    const acc = e.target.closest('[data-acc]')?.dataset.acc;
    const sel = motor.getSeleccion();
    if (acc === 'centrar') motor.enfocar(sel);
    if (acc === 'aislar') motor.aislar(sel);
    if (acc === 'ocultar') motor.ocultar(sel);
    if (acc === 'transp') e.target.closest('[data-acc]').setAttribute('aria-pressed', String(motor.setTransparente(sel)));
    const estr = e.target.closest('[data-estr]')?.dataset.estr;
    if (estr) {
      if (motor.estaOculta(estr)) motor.mostrarTodo();
      motor.seleccionar(estr); motor.enfocar(estr);
    }
  });
  $('#btn-ficha').addEventListener('click', () => abrirFicha(!ficha.classList.contains('abierta')));
  function abrirFicha(abrir) {
    ficha.classList.toggle('abierta', abrir);
    $('#btn-ficha').setAttribute('aria-expanded', String(abrir));
  }

  // ---------- Procesos animados ----------
  const barraProc = $('#procesos');
  let procesoActivo = null;
  function pintarProcesos() {
    const ps = datos?.procesos || [];
    barraProc.hidden = !ps.length;
    barraProc.innerHTML = ps.length ? `<div class="procesos-caja"><p class="procesos-titulo">${escapar(datos.procesosTitulo || 'Procesos')}</p>` + ps.map((p) =>
      `<button type="button" class="herr" data-proc="${p.id}" aria-pressed="${p.id === procesoActivo}">${escapar(p.titulo)}</button>`).join('') + '</div>' : '';
  }
  function mostrarFichaProceso(p) {
    contenido.innerHTML = `
      <article class="etiqueta"><h2>${escapar(p.titulo)}</h2><p class="tipo-proceso">${escapar(p.tipo)}</p></article>
      ${p.widget ? '' : `<div class="acciones"><button type="button" class="herr" data-detener>${escapar(datos.procesosDetener || 'Detener animación')}</button></div>`}
      ${seccion('Cómo funciona', p.descripcion)}
      ${seccion('Para el examen', p.claveExamen, 'clave')}
      ${seccion('Relación clínica', p.clinica)}
      ${p.widget === 'punnett' ? '<div id="widget-punnett"></div>' : ''}
      ${datos.fuenteGeneral ? `<p class="fuente">Fuente: ${escapar(datos.fuenteGeneral)}</p>` : ''}
      ${listaEstructuras(null)}`;
    aplicarFiltro();
    if (p.widget === 'punnett') montarPunnett($('#widget-punnett'));
    abrirFicha(true);
  }
  function activarProceso(id) {
    if (examen.activo()) examen.salir();
    procesoActivo = id;
    alProceso(id);
    pintarProcesos();
    if (id) { motor.seleccionar(null); mostrarFichaProceso(datos.procesos.find((p) => p.id === id)); }
    else mostrarFicha(motor.getSeleccion());
  }
  barraProc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-proc]');
    if (b) activarProceso(procesoActivo === b.dataset.proc ? null : b.dataset.proc);
  });
  contenido.addEventListener('click', (e) => { if (e.target.closest('[data-detener]')) activarProceso(null); });

  // ---------- Modo examen ----------
  const examen = crearExamen({ motor, contenido, abrirFicha, alSalir: () => { pintarTemario(); mostrarFicha(null); } });
  $('#btn-examen').addEventListener('click', () => {
    if (!datos) return;
    if (procesoActivo) activarProceso(null);
    if (!examen.iniciar(datos, moduloId)) avisar('Este modelo todavía no tiene suficientes estructuras para un examen.');
  });

  motor.on('seleccion', (id) => {
    if (examen.alSeleccionar(id)) return;
    mostrarFicha(id);
    if (id) {
      store.marcarVisto(moduloId, id);
      pintarTemario();
      abrirFicha(true);
    }
  });
  const leyenda = $('#leyenda');
  motor.on('leyenda', (t) => { leyenda.hidden = !t; if (t) leyenda.textContent = t; });

  motor.on('hover', ({ id, x, y }) => {
    const nombre = !examen.activo() && id && datos?.estructuras?.[id]?.nombre;
    if (!nombre) { tooltip.style.display = 'none'; return; }
    tooltip.textContent = nombre;
    tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px';
    tooltip.style.display = 'block';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]') && document.activeElement !== buscar) motor.seleccionar(null);
  });

  // ---------- Herramientas ----------
  document.querySelectorAll('[data-herr]').forEach((b) => b.addEventListener('click', () => {
    const h = b.dataset.herr;
    if (h === 'reiniciar') motor.reiniciarVista();
    if (h === 'aislar') motor.getSeleccion() ? motor.aislar() : avisar('Primero selecciona una estructura.');
    if (h === 'ocultar') motor.getSeleccion() ? motor.ocultar() : avisar('Primero selecciona una estructura.');
    if (h === 'mostrar') motor.mostrarTodo();
  }));
  const botonesModo = document.querySelectorAll('[data-modo]');
  function marcarModo(m) {
    botonesModo.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(b.dataset.modo === m));
      if (b.dataset.modo === m) $('#segmento-modo').style.setProperty('--i', i);
    });
  }
  botonesModo.forEach((b) => b.addEventListener('click', () => {
    motor.setModo(b.dataset.modo); store.set('modo', b.dataset.modo); marcarModo(b.dataset.modo);
  }));
  marcarModo(motor.getModo());
  motor.on('modo', (m) => { marcarModo(m); store.set('modo', m); });

  const interruptor = $('#switch-tema');
  const temaEfectivo = () => document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  function pintarInterruptor() {
    const oscuro = temaEfectivo() === 'dark';
    interruptor.setAttribute('aria-checked', String(oscuro));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#0d1317' : '#eaeef2');
  }
  interruptor.addEventListener('click', () => {
    const nuevo = temaEfectivo() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nuevo;
    store.set('tema', nuevo);
    pintarInterruptor();
  });
  pintarInterruptor();

  $('#btn-rend').addEventListener('click', (e) => {
    const activo = depuracion.hidden;
    depuracion.hidden = !activo;
    e.currentTarget.setAttribute('aria-pressed', String(activo));
    clearInterval(intervaloRend);
    if (activo) {
      const pintarRend = () => {
        const i = motor.info();
        depuracion.textContent = `Cuadros por segundo: ${i.fps}${i.fps === 0 ? ' (en reposo)' : ''}\nTriángulos: ${i.triangulos.toLocaleString('es-MX')}\nGeometrías en memoria: ${i.geometrias}\nEstructuras: ${i.estructuras}`;
      };
      motor.info(); pintarRend();
      intervaloRend = setInterval(pintarRend, 1000);
    }
  });

  const dialogo = $('#acerca');
  $('#btn-acerca').addEventListener('click', () => dialogo.showModal());

  // ---------- Avisos ----------
  function avisar(texto) {
    aviso.textContent = texto; aviso.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 4500);
  }

  document.querySelectorAll('[data-icono]').forEach((el) => el.insertAdjacentHTML('afterbegin', icono(el.dataset.icono)));
  pintarTemario();
  return {
    avisar,
    setVersion(v) { $('#version').textContent = v; },
    mostrarCarga(texto) { cargaTexto.textContent = texto; carga.hidden = false; $('#visor').classList.add('cambiando'); },
    ocultarCarga() { carga.hidden = true; requestAnimationFrame(() => $('#visor').classList.remove('cambiando')); },
    mostrarError(texto) { cargaTexto.textContent = `No se pudo abrir el modelo. ${texto}`; carga.hidden = false; },
    setModulo(id, d, titulo) {
      examen.salir();
      moduloId = id; datos = d;
      store.setTotal(id, motor.idsEstructuras().length);
      $('#titulo-modulo').textContent = titulo;
      const tema = TEMAS.find((t) => t.id === id);
      $('#miga').textContent = AMBITOS.find((a) => a.id === tema?.ambito)?.titulo || '';
      document.title = `${titulo} | Atlas 3D`;
      buscar.value = ''; procesoActivo = null; pintarProcesos();
      pintarTemario(); mostrarFicha(null); abrirFicha(false);
    },
  };
}
