// Modo examen: genera preguntas a partir de las fichas del módulo activo.
// Tipos: "señala" (clic en el modelo), "nombra" (estructura iluminada) y "opción" (por su descripción).
import { store } from './store.js';

const escaparEx = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const barajarEx = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Oculta el nombre de la estructura dentro de su propia descripción.
function enmascarar(texto, nombre) {
  let t = texto;
  for (const palabra of nombre.replace(/[()]/g, ' ').split(/\s+/)) {
    if (palabra.length < 5) continue;
    const raiz = palabra.slice(0, 5).replace(/[.*+?^${}|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`(?<![\\p{L}])${raiz}[\\p{L}]*`, 'giu'), '____');
  }
  return t;
}

export function crearExamen({ motor, contenido, abrirFicha, alSalir }) {
  let estado = null;

  function generar(datos, n) {
    const E = datos.estructuras;
    const ids = Object.keys(E).filter((id) => motor.esSeleccionable(id));
    if (ids.length < 4) return [];
    const nombresUnicos = (id) => barajarEx(ids.filter((x) => x !== id && E[x].nombre !== E[id].nombre)).slice(0, 3);
    const opciones = (id) => barajarEx([id, ...nombresUnicos(id)]);
    const extras = (datos.preguntas || []).filter((p) => p.tipo === 'senala' && ids.includes(p.estructura));
    const lista = [];
    const orden = barajarEx(ids);
    const tipos = ['senala', 'nombra', 'opcion'];
    for (let i = 0; lista.length < n && i < orden.length * 2; i++) {
      const id = orden[i % orden.length], tipo = tipos[lista.length % 3];
      if (lista.some((p) => p.id === id && p.tipo === tipo)) continue;
      const e = E[id];
      if (tipo === 'senala') {
        const extra = extras.find((p) => p.estructura === id);
        lista.push({ tipo, id, enunciado: extra ? extra.enunciado : `Señala: ${e.nombre}` });
      } else if (tipo === 'nombra') {
        lista.push({ tipo, id, enunciado: '¿Qué estructura está iluminada?', opciones: opciones(id) });
      } else if (e.funcion) {
        lista.push({ tipo, id, enunciado: enmascarar(e.funcion, e.nombre), opciones: opciones(id) });
      }
    }
    return lista;
  }

  function pintar() {
    const { preguntas, i, aciertos, respondida, datos } = estado;
    const p = preguntas[i], E = datos.estructuras;
    const pct = Math.round((i / preguntas.length) * 100);
    const etiquetaTipo = { senala: 'Señala en el modelo', nombra: 'Nombra la estructura', opcion: '¿Qué estructura es?' }[p.tipo];
    let cuerpo = '';
    if (p.tipo === 'senala') {
      cuerpo = respondida ? '' : '<p class="intro">Haz clic sobre la estructura en el modelo. Puedes girar y acercar la cámara.</p><div class="acciones"><button type="button" class="herr" data-ex="nose">No sé</button></div>';
    } else {
      cuerpo = `<div class="ex-opciones">${p.opciones.map((id) => {
        let clase = '';
        if (respondida) clase = id === p.id ? ' correcta' : id === respondida.elegida ? ' incorrecta' : '';
        return `<button type="button" class="ex-opcion${clase}" data-op="${id}" ${respondida ? 'disabled' : ''}>${escaparEx(E[id].nombre)}</button>`;
      }).join('')}</div>`;
    }
    const e = E[p.id];
    const retro = respondida ? `
      <div class="ex-retro ${respondida.ok ? 'ok' : 'mal'}" role="status">
        <p><strong>${respondida.ok ? 'Correcto.' : `No. Era: ${escaparEx(e.nombre)}.`}</strong></p>
        <p>${escaparEx(e.claveExamen || e.funcion || '')}</p>
      </div>
      <div class="acciones"><button type="button" class="herr destacado" data-ex="siguiente">${i + 1 < preguntas.length ? 'Siguiente pregunta' : 'Ver resultados'}</button></div>` : '';
    contenido.innerHTML = `
      <article class="examen">
        <div class="ex-cab"><span>Pregunta ${i + 1} de ${preguntas.length}</span><span>Aciertos: ${aciertos}</span></div>
        <div class="barra-avance"><span style="width:${pct}%"></span></div>
        <p class="ex-tipo">${etiquetaTipo}</p>
        <h2 class="ex-enunciado">${escaparEx(p.enunciado)}</h2>
        ${cuerpo}${retro}
        <div class="acciones ex-salir"><button type="button" class="herr" data-ex="salir">Salir del examen</button></div>
      </article>`;
    abrirFicha(true);
  }

  function preparar() {
    const p = estado.preguntas[estado.i];
    motor.mostrarTodo();
    if (p.tipo === 'nombra') { motor.seleccionar(p.id); motor.enfocar(p.id); }
    else { motor.seleccionar(null); motor.reiniciarVista(); }
    pintar();
  }

  function responder(ok, elegida) {
    estado.respondida = { ok, elegida };
    if (ok) estado.aciertos++;
    else estado.fallos.push(estado.preguntas[estado.i].id);
    const id = estado.preguntas[estado.i].id;
    motor.seleccionar(id); motor.enfocar(id);
    pintar();
  }

  function resultados() {
    const { preguntas, aciertos, fallos, datos, moduloId } = estado;
    const historial = store.get('examenes') || {};
    const previo = historial[moduloId] || { mejor: 0, intentos: 0 };
    const pct = Math.round((aciertos / preguntas.length) * 100);
    historial[moduloId] = { mejor: Math.max(previo.mejor, pct), ultimo: pct, intentos: previo.intentos + 1, fecha: new Date().toISOString().slice(0, 10) };
    store.set('examenes', historial);
    const unicos = [...new Set(fallos)];
    contenido.innerHTML = `
      <article class="examen">
        <p class="ex-tipo">Resultado</p>
        <h2 class="ex-enunciado">${aciertos} de ${preguntas.length} correctas</h2>
        <div class="barra-avance"><span style="width:${pct}%"></span></div>
        <p class="intro">${pct >= 80 ? 'Muy bien: dominas este modelo.' : pct >= 60 ? 'Vas bien. Repasa las que fallaste y vuelve a intentarlo.' : 'Repasa las fichas de abajo y vuelve a intentarlo.'}
          Tu mejor resultado en este tema: ${historial[moduloId].mejor} %.</p>
        ${unicos.length ? `<h3>Para repasar</h3><div class="lista-estr">${unicos.map((id) => `<button type="button" data-repasar="${id}"><span class="punto" style="background:${escaparEx(datos.estructuras[id].color || '#999')}"></span>${escaparEx(datos.estructuras[id].nombre)}</button>`).join('')}</div>` : ''}
        <div class="acciones"><button type="button" class="herr destacado" data-ex="otra">Otra ronda</button><button type="button" class="herr" data-ex="salir">Terminar</button></div>
      </article>`;
    estado.terminado = true;
  }

  contenido.addEventListener('click', (ev) => {
    if (!estado) return;
    const op = ev.target.closest('[data-op]');
    if (op && !estado.respondida) { responder(op.dataset.op === estado.preguntas[estado.i].id, op.dataset.op); return; }
    const rep = ev.target.closest('[data-repasar]');
    if (rep) { const id = rep.dataset.repasar; salir(); motor.seleccionar(id); motor.enfocar(id); return; }
    const acc = ev.target.closest('[data-ex]')?.dataset.ex;
    if (acc === 'nose') responder(false, null);
    if (acc === 'siguiente') { estado.i++; estado.respondida = null; estado.i < estado.preguntas.length ? preparar() : resultados(); }
    if (acc === 'otra') iniciar(estado.datos, estado.moduloId);
    if (acc === 'salir') salir();
  });

  function iniciar(datos, moduloId, n = 10) {
    const preguntas = generar(datos, n);
    if (!preguntas.length) return false;
    estado = { datos, moduloId, preguntas, i: 0, aciertos: 0, fallos: [], respondida: null };
    document.body.classList.add('en-examen');
    preparar();
    return true;
  }
  function salir() {
    if (!estado) return;
    estado = null;
    document.body.classList.remove('en-examen');
    motor.seleccionar(null);
    alSalir?.();
  }

  return {
    iniciar, salir,
    activo: () => !!estado,
    // Devuelve true si el examen se encarga de esta selección (la interfaz no debe mostrar la ficha).
    alSeleccionar(id) {
      if (!estado || estado.terminado) return !!estado;
      const p = estado.preguntas[estado.i];
      if (p.tipo === 'senala' && !estado.respondida) { if (id) responder(id === p.id, id); return true; }
      if (p.tipo === 'nombra' && !estado.respondida && id !== p.id) motor.seleccionar(p.id);
      return true;
    },
  };
}
