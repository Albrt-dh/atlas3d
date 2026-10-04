// ÚNICA capa que lee archivos. Si el empaque cambia (p. ej. Tauri), solo se modifica aquí.
let cargadorGLTF = null;

export async function cargarModelo(ruta, onProgreso) {
  if (!cargadorGLTF) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
    cargadorGLTF = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  }
  const gltf = await cargadorGLTF.loadAsync(ruta, (e) => e.total && onProgreso?.(e.loaded / e.total));
  return gltf.scene;
}

export async function cargarDatos(ruta) {
  const enLinea = window.__ATLAS_INLINE?.[ruta];
  if (enLinea) return structuredClone(enLinea);
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(`No se encontró el archivo ${ruta} (código ${r.status}). Revisa que esté subido en GitHub.`);
  return r.json();
}
