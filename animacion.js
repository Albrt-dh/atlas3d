// Utilidades compartidas para módulos procedurales animados.

export function crearAzar(semilla) { // mulberry32: mismo modelo en cada carga
  return () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Anima flujos de partículas. Cada ruta: { puntos: [Vector3...], escalas?: [n...], desfase }.
// Cada tramo de la ruta dura lo mismo, así se coreografían los pasos de un proceso.
// extra(t, s) permite mover proteínas al mismo tiempo. Devuelve la función para detener.
export function animarFlujos(ctx, flujos, extra) {
  const { THREE } = ctx;
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3();
  flujos.forEach((f) => { f.malla.count = f.rutas.length; });
  const t0 = performance.now();
  const parar = ctx.motor.animar((t) => {
    const s = (t - t0) / 1000;
    for (const f of flujos) {
      f.rutas.forEach((r, i) => {
        const u = (((s / f.periodo + (r.desfase || 0)) % 1) + 1) % 1;
        const n = r.puntos.length - 1;
        const x = Math.min(u, 0.99999) * n, k = Math.floor(x), fr = x - k;
        const sv = fr * fr * (3 - 2 * fr);
        p.lerpVectors(r.puntos[k], r.puntos[k + 1], sv);
        const esc = r.escalas ? r.escalas[k] + (r.escalas[k + 1] - r.escalas[k]) * sv : 1;
        e.setScalar(Math.max(esc, 0.0001));
        f.malla.setMatrixAt(i, m.compose(p, q, e));
      });
      f.malla.instanceMatrix.needsUpdate = true;
      f.malla.computeBoundingSphere();
    }
    extra?.(t, s);
    return true;
  });
  return () => {
    parar();
    flujos.forEach((f) => { f.malla.count = 0; });
    ctx.pedirRender();
  };
}

// Ruta de una partícula que aparece en el paso k (de "total" pasos) en "origen" y viaja a "destino".
export function rutaSalida(THREE, k, total, origen, destino) {
  const puntos = [], escalas = [];
  for (let j = 0; j <= total; j++) {
    const f = j <= k ? 0 : (j - k) / (total - k);
    puntos.push(new THREE.Vector3().lerpVectors(origen, destino, f));
    escalas.push(j < k ? 0 : 1);
  }
  return { puntos, escalas, desfase: 0 };
}

// Ruta de una partícula que llega desde "origen" y se consume (desaparece) en "destino" en el paso k.
export function rutaEntrada(THREE, k, total, origen, destino) {
  const puntos = [], escalas = [];
  for (let j = 0; j <= total; j++) {
    const f = j >= k ? 1 : j / k;
    puntos.push(new THREE.Vector3().lerpVectors(origen, destino, f));
    escalas.push(j < k ? 1 : 0);
  }
  return { puntos, escalas, desfase: 0 };
}
