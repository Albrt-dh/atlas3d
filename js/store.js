// Estado del usuario, persistido en localStorage (clave atlas3d-store)
const CLAVE_STORE = 'atlas3d-store';
const ESTADO_BASE = { tema: null, modo: 'escultura', ultimoModulo: 'celula', vistos: {}, totales: {} };

function leerStore() {
  try { return { ...ESTADO_BASE, ...JSON.parse(localStorage.getItem(CLAVE_STORE) || '{}') }; }
  catch (e) { return { ...ESTADO_BASE }; }
}
let estadoStore = leerStore();
function guardarStore() {
  try { localStorage.setItem(CLAVE_STORE, JSON.stringify(estadoStore)); } catch (e) { /* sin almacenamiento */ }
}

export const store = {
  get: (k) => estadoStore[k],
  set(k, v) { estadoStore[k] = v; guardarStore(); },
  marcarVisto(modulo, id) {
    const lista = estadoStore.vistos[modulo] || (estadoStore.vistos[modulo] = []);
    if (!lista.includes(id)) { lista.push(id); guardarStore(); }
  },
  vistos: (modulo) => estadoStore.vistos[modulo] || [],
  setTotal(modulo, n) { estadoStore.totales[modulo] = n; guardarStore(); },
  total: (modulo) => estadoStore.totales[modulo] || 0,
};
