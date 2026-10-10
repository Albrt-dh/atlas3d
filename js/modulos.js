// Registro de módulos y ciclo cargar/liberar
import * as THREE from 'three';
import { cargarDatos } from './recursos.js';

const registroModulos = new Map();
const MATERIAL_TEMPORAL = new THREE.MeshBasicMaterial();
let moduloActivo = null;
let ctxActivo = null;
let detenerActual = null;

export function iniciarProceso(id) {
  detenerProceso();
  const fn = moduloActivo?.procesos?.[id];
  if (fn) detenerActual = fn(ctxActivo) || null;
}
export function detenerProceso() {
  if (detenerActual) { detenerActual(); detenerActual = null; }
  ctxActivo?.anunciar(null);
  ctxActivo?.setRotulos(null);
}

export function registrarModulo(m) { registroModulos.set(m.id, m); }
export function obtenerModulo(id) { return registroModulos.get(id); }
export function idsDisponibles() { return new Set(registroModulos.keys()); }

export async function activarModulo(id, motor) {
  const m = registroModulos.get(id);
  if (!m) throw new Error(`El tema "${id}" todavía no tiene modelo.`);
  if (moduloActivo) {
    detenerProceso();
    moduloActivo.liberar?.(ctxActivo);
    motor.limpiar();
    moduloActivo = null; ctxActivo = null;
  }
  const datos = m.archivoDatos ? await cargarDatos(m.archivoDatos) : { estructuras: {} };
  const colorDe = (idE) => datos.estructuras[idE]?.color || '#c8c2ba';
  const ctx = {
    THREE, motor, datos, raiz: motor.raiz, pedirRender: motor.pedirRender, anunciar: motor.anunciar, setRotulos: motor.rotulos,
    malla(geo, idE, padre = motor.raiz) {
      const o = new THREE.Mesh(geo, MATERIAL_TEMPORAL);
      padre.add(o); motor.registrarEstructura(o, idE, colorDe(idE));
      return o;
    },
    instancias(geo, idE, matrices, padre = motor.raiz) {
      const o = new THREE.InstancedMesh(geo, MATERIAL_TEMPORAL, matrices.length);
      matrices.forEach((mt, i) => o.setMatrixAt(i, mt));
      o.instanceMatrix.needsUpdate = true;
      o.computeBoundingBox(); o.computeBoundingSphere();
      padre.add(o); motor.registrarEstructura(o, idE, colorDe(idE));
      return o;
    },
  };
  await m.cargar(ctx);
  motor.prepararModelo();
  motor.pintar();
  motor.setCamara(m.camaraInicial, true);
  moduloActivo = m; ctxActivo = ctx;
  return { modulo: m, datos };
}
