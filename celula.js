// Módulo procedural: célula eucariota animal en corte (un cuarto abierto hacia la cámara).
// Coordenadas locales: el corte abierto queda en x<0, z<0. El grupo se gira 180° para que
// ese corte mire a la cámara inicial (+x, +z).

function generadorAleatorio(semilla) { // mulberry32: mismo modelo en cada carga
  return () => {
    semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const moduloCelula = {
  id: 'celula',
  ambito: 'celular',
  titulo: 'Organelos celulares',
  tipo: 'procedural',
  archivoDatos: './datos/celula.json',
  camaraInicial: { pos: [2.35, 1.2, 2.35], objetivo: [0, 0, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const azar = generadorAleatorio(7);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const celula = new THREE.Group();
    celula.rotation.y = Math.PI;
    ctx.raiz.add(celula);

    const CORTE = Math.PI * 1.5; // 3/4 de esfera: el cuarto faltante es el corte
    const N = V(0.1, 0.02, 0.1);  // centro del núcleo
    const RN = 0.34;              // radio del núcleo
    const dirEsfera = (phi, theta) => V(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
    const enCorte = (p) => p.x < 0.05 && p.z < 0.05;
    const colocados = [];
    function puntoLibre(radio, distNucleo, separacion) {
      for (let i = 0; i < 400; i++) {
        const p = V(azar() * 2 - 1, azar() * 2 - 1, azar() * 2 - 1).multiplyScalar(0.9);
        if (p.length() > 0.88 - radio || enCorte(p) || p.distanceTo(N) < distNucleo) continue;
        if (colocados.some((q) => q.p.distanceTo(p) < q.r + radio + separacion)) continue;
        colocados.push({ p, r: radio });
        return p;
      }
      return null;
    }
    const matriz = (p, q = new THREE.Quaternion(), s = V(1, 1, 1)) => new THREE.Matrix4().compose(p, q, s);
    const giroAzar = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(azar() * 6.28, azar() * 6.28, azar() * 6.28));

    // Membrana plasmática
    ctx.malla(new THREE.SphereGeometry(1, 96, 64, 0, CORTE), 'membrana', celula);

    // Núcleo: envoltura, poros, nucléolo y cromatina
    const envoltura = ctx.malla(new THREE.SphereGeometry(RN, 64, 48, 0, CORTE), 'nucleo', celula);
    envoltura.position.copy(N);
    const poros = [];
    for (let i = 0; i < 80; i++) {
      const dir = dirEsfera(azar() * CORTE, 0.25 + azar() * (Math.PI - 0.5));
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir);
      poros.push(matriz(N.clone().addScaledVector(dir, RN), q));
    }
    ctx.instancias(new THREE.TorusGeometry(0.016, 0.006, 6, 12), 'poros_nucleares', poros, celula);
    const nucleolo = ctx.malla(new THREE.SphereGeometry(0.11, 32, 24), 'nucleolo', celula);
    nucleolo.position.copy(N).add(V(-0.06, 0.04, -0.06));
    for (let i = 0; i < 7; i++) {
      let p = N.clone().add(V(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(0.3));
      const puntos = [];
      for (let k = 0; k < 7; k++) {
        const sig = p.clone().add(V(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(0.12));
        if (sig.distanceTo(N) < RN - 0.05 && sig.distanceTo(nucleolo.position) > 0.13) p = sig;
        puntos.push(p.clone());
      }
      ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 48, 0.008, 5), 'cromatina', celula);
    }

    // Retículo endoplásmico rugoso: cisternas curvas alrededor del núcleo (lado opuesto al corte)
    const ribosomasRER = [];
    [0.42, 0.47, 0.52].forEach((r, i) => {
      const phi0 = Math.PI * (0.28 + i * 0.03), largo = Math.PI * 0.9;
      const lamina = ctx.malla(new THREE.SphereGeometry(r, 48, 24, phi0, largo, 0.45, 2.2), 'rer', celula);
      lamina.position.copy(N);
      for (let k = 0; k < 110; k++) {
        const dir = dirEsfera(phi0 + azar() * largo, 0.45 + azar() * 2.2);
        ribosomasRER.push(matriz(N.clone().addScaledVector(dir, r + 0.009)));
      }
    });
    const geoRibosoma = new THREE.IcosahedronGeometry(0.0075, 0);
    ctx.instancias(geoRibosoma, 'ribosomas', ribosomasRER, celula);

    // Aparato de Golgi: pila de cisternas curvas con la cara cis hacia el núcleo
    const G = V(0.5, 0.08, -0.42);
    colocados.push({ p: G, r: 0.24 });
    const eje = N.clone().sub(G).normalize();
    const giroGolgi = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), eje);
    const RC = 0.3;
    for (let i = 0; i < 5; i++) {
      const theta = 0.5 - 0.05 * Math.abs(i - 2);
      const cisterna = ctx.malla(new THREE.SphereGeometry(RC, 40, 6, 0, Math.PI * 2, 0, theta), 'golgi', celula);
      cisterna.quaternion.copy(giroGolgi);
      cisterna.position.copy(G).addScaledVector(eje, -RC + (i - 2) * 0.035);
    }
    const vesiculas = [];
    for (let i = 0; i < 20; i++) {
      const p = G.clone().addScaledVector(eje, -0.1 - azar() * 0.12)
        .add(V(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(0.3));
      vesiculas.push(matriz(p, undefined, V(1, 1, 1).multiplyScalar(0.8 + azar() * 0.5)));
    }
    ctx.instancias(new THREE.SphereGeometry(0.02, 12, 8), 'vesiculas', vesiculas, celula);

    // Retículo endoplásmico liso: túbulos ramificados
    const centroREL = V(-0.45, -0.28, 0.4);
    colocados.push({ p: centroREL, r: 0.2 });
    for (let i = 0; i < 6; i++) {
      const puntos = [];
      for (let k = 0; k < 6; k++) puntos.push(centroREL.clone().add(V(azar() - 0.5, azar() - 0.5, azar() - 0.5).multiplyScalar(0.42)));
      ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 60, 0.014, 6), 'rel', celula);
    }

    // Centriolos: dos cilindros perpendiculares (centrosoma)
    const C = V(-0.32, 0.42, 0.28);
    colocados.push({ p: C, r: 0.1 });
    const geoCentriolo = new THREE.CylinderGeometry(0.022, 0.022, 0.11, 9);
    const c1 = ctx.malla(geoCentriolo, 'centriolos', celula);
    c1.position.copy(C);
    const c2 = ctx.malla(geoCentriolo.clone(), 'centriolos', celula);
    c2.position.copy(C).add(V(0.05, 0, 0)); c2.rotation.z = Math.PI / 2;

    // Organelos repetidos (instanciados)
    function repartir(cantidad, radio, distNucleo, separacion, conGiro) {
      const lista = [];
      for (let i = 0; i < cantidad; i++) {
        const p = puntoLibre(radio, distNucleo, separacion);
        if (p) lista.push(matriz(p, conGiro ? giroAzar() : undefined));
      }
      return lista;
    }
    ctx.instancias(new THREE.CapsuleGeometry(0.045, 0.15, 4, 14), 'mitocondrias', repartir(9, 0.12, 0.6, 0.04, true), celula);
    ctx.instancias(new THREE.SphereGeometry(0.042, 20, 14), 'lisosomas', repartir(7, 0.045, 0.58, 0.04), celula);
    ctx.instancias(new THREE.SphereGeometry(0.03, 16, 12), 'peroxisomas', repartir(6, 0.032, 0.58, 0.04), celula);

    const libres = [];
    for (let i = 0; i < 2000 && libres.length < 280; i++) {
      const p = V(azar() * 2 - 1, azar() * 2 - 1, azar() * 2 - 1).multiplyScalar(0.9);
      if (p.length() < 0.92 && !enCorte(p) && p.distanceTo(N) > RN + 0.03) libres.push(matriz(p));
    }
    ctx.instancias(geoRibosoma.clone(), 'ribosomas', libres, celula);
  },

  liberar() { /* el motor libera la geometría de ctx.raiz */ },
};

export default moduloCelula;
