// Arranque del Atlas 3D
import { crearMotor } from './motor.js';
import { registrarModulo, activarModulo, obtenerModulo, idsDisponibles, iniciarProceso, detenerProceso } from './modulos.js';
import { crearUI } from './ui.js';
import { crearPanelHerramientas } from './herramientas.js';
import { store } from './store.js';
import moduloCelula from './modulos/celula.js';
import moduloMembrana from './modulos/membrana.js';
import moduloMetabolismo from './modulos/metabolismo.js';
import moduloGenetica from './modulos/genetica.js';
import moduloBiomoleculas from './modulos/biomoleculas.js';
import moduloMicro from './modulos/micro.js';
import moduloNeurona from './modulos/neurona.js';
import moduloSarcomero from './modulos/sarcomero.js';
import moduloNefrona from './modulos/nefrona.js';
import moduloAlveolo from './modulos/alveolo.js';
import moduloPiel from './modulos/tegumentario.js';
import moduloSangre from './modulos/sangre_inmune.js';
import moduloEje from './modulos/eje_hipofisis.js';

const VERSION_APP = '0.11.0';

[moduloCelula, moduloMembrana, moduloMetabolismo, moduloGenetica, moduloBiomoleculas, moduloMicro,
  moduloNeurona, moduloSarcomero, moduloNefrona, moduloAlveolo,
  moduloPiel, moduloSangre, moduloEje].forEach(registrarModulo);

const motor = crearMotor(document.getElementById('visor'));
motor.setModo(store.get('modo') || 'escultura');
const ui = crearUI({ motor, disponibles: idsDisponibles(), alAbrirTema: abrirTema,
  alProceso: (id) => (id ? iniciarProceso(id) : detenerProceso()) });
ui.setVersion(VERSION_APP);
let datosActuales = null;
const panel = crearPanelHerramientas({ motor, getDatos: () => datosActuales, avisar: ui.avisar });

async function abrirTema(id) {
  ui.mostrarCarga('Preparando el modelo…');
  try {
    const { modulo, datos } = await activarModulo(id, motor);
    store.set('ultimoModulo', id);
    datosActuales = datos;
    ui.setModulo(id, datos, modulo.titulo);
    panel.reiniciar();
    ui.ocultarCarga();
  } catch (err) {
    console.error(err);
    ui.mostrarError(err.message);
  }
}

const inicial = store.get('ultimoModulo');
abrirTema(obtenerModulo(inicial) ? inicial : 'celula');

if (!window.__ATLAS_VISTA_PREVIA && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo?.addEventListener('statechange', () => {
        if (nuevo.state === 'activated' && navigator.serviceWorker.controller) {
          ui.avisar('Se instaló una versión nueva del Atlas. Recarga la página para verla.');
        }
      });
    });
  }).catch((e) => console.warn('Sin modo sin conexión:', e));
}
