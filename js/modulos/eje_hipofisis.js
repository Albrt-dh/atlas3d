// Módulo procedural: hipotálamo, hipófisis (adenohipófisis y neurohipófisis) con su sistema porta,
// y tres glándulas diana. Procesos: ejes con retroalimentación negativa y neurohipófisis.
import { animarFlujos } from '../animacion.js';

let refsEje = null;

const moduloEje = {
  id: 'eje_hipofisis',
  ambito: 'anatomia',
  titulo: 'Eje hipotálamo-hipófisis',
  tipo: 'procedural',
  archivoDatos: './datos/eje_hipofisis.json',
  camaraInicial: { pos: [0, 0.2, 7.0], objetivo: [0, 0.1, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const g = new THREE.Group(); ctx.raiz.add(g);
    const tubo = (pts, r, id, seg = 30) => ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8), id, g);
    const ovoide = (r, id, p, s) => { const o = ctx.malla(new THREE.SphereGeometry(r, 28, 18), id, g); o.position.copy(p); if (s) o.scale.set(...s); return o; };

    // Hipotálamo y núcleos
    ovoide(0.6, 'hipotalamo', V(0, 1.75, -0.15), [1.3, 0.5, 0.8]);
    const NPV = V(-0.3, 1.8, 0.15), NSO = V(0.3, 1.7, 0.15), NARC = V(-0.05, 1.5, 0.15);
    ovoide(0.08, 'nucleos_neurosecretores', NPV); ovoide(0.08, 'nucleos_neurosecretores', NSO);
    ovoide(0.07, 'nucleos_parvocelulares', NARC);
    tubo([V(0, 1.45), V(0.03, 1.1), V(0.12, 0.8)], 0.07, 'infundibulo');

    // Hipófisis
    const AL = V(-0.2, 0.55), PL = V(0.22, 0.55);
    ovoide(0.26, 'adenohipofisis', AL, [1, 0.8, 0.9]);
    ovoide(0.2, 'neurohipofisis', PL, [1, 0.9, 0.9]);
    for (const n of [NPV, NSO]) tubo([n, V(n.x * 0.3, 1.25, 0.08), V(0.1, 0.95, 0.05), PL.clone().add(V(0, 0.05, 0.05))], 0.012, 'tracto_hipotalamo_hipofisario', 40);
    tubo([V(-0.6, 1.25, 0.2), V(-0.15, 1.12, 0.2), V(-0.05, 0.95, 0.15), V(-0.15, 0.72, 0.18), AL.clone().add(V(0, 0, 0.2))], 0.02, 'sistema_porta', 40);

    // Glándulas diana
    const TI = V(-2.3, -1.3), SR = V(0, -1.45), GO = V(2.3, -1.35);
    for (const s of [-1, 1]) { const l = ovoide(0.17, 'tiroides', TI.clone().add(V(s * 0.22, 0)), [0.8, 1.5, 0.6]); l.rotation.z = s * 0.15; }
    ctx.malla(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10), 'tiroides', g).position.copy(TI).add(V(0, -0.12)).setY(TI.y - 0.12);
    g.children[g.children.length - 1].rotation.z = Math.PI / 2;
    ovoide(0.32, 'rinon', SR.clone().add(V(0, -0.3)), [0.7, 1, 0.6]);
    const sr = ctx.malla(new THREE.ConeGeometry(0.22, 0.28, 16), 'glandula_suprarrenal', g); sr.position.copy(SR).add(V(0, 0.08));
    ovoide(0.2, 'gonada', GO, [1.4, 0.85, 0.8]);
    const salida = V(0, 0.2);
    [TI, SR, GO].forEach((d) => tubo([salida, V(d.x * 0.5, -0.3, 0.1), d.clone().add(V(0, 0.32))], 0.015, 'circulacion_sistemica'));

    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const ico = (r) => new THREE.IcosahedronGeometry(r, 1);
    const P = {};
    for (const id of ['trh', 'tsh', 't3t4', 'crh', 'acth', 'cortisol', 'gnrh', 'fsh_lh', 'hormonas_sexuales']) {
      P[id] = ctx.instancias(ico(0.04), id, vacio(4), g);
    }
    P.adh = ctx.instancias(new THREE.OctahedronGeometry(0.04, 0), 'adh_oxitocina', vacio(8), g);
    Object.values(P).forEach((m) => { m.count = 0; m.frustumCulled = false; });
    refsEje = { V, P, NPV, NSO, NARC, AL, PL, TI, SR, GO, salida };
  },

  procesos: {
    eje_tiroideo: (ctx) => animarEje(ctx, 'TI', ['trh', 'tsh', 't3t4'], ['TRH', 'TSH', 'la tiroides libera T3 y T4', 'T3 y T4']),
    eje_suprarrenal: (ctx) => animarEje(ctx, 'SR', ['crh', 'acth', 'cortisol'], ['CRH', 'ACTH (corticotropina)', 'la corteza suprarrenal libera cortisol', 'el cortisol']),
    eje_gonadal: (ctx) => animarEje(ctx, 'GO', ['gnrh', 'fsh_lh', 'hormonas_sexuales'], ['GnRH', 'FSH y LH', 'la gónada libera estrógenos o testosterona', 'las hormonas sexuales']),

    neurohipofisis(ctx) {
      const { V, P, NPV, NSO, PL, salida } = refsEje;
      const rutas = Array.from({ length: 8 }, (_, i) => {
        const n = i % 2 ? NPV : NSO;
        return { desfase: i / 8, puntos: [n, V(n.x * 0.3, 1.25, 0.12), V(0.1, 0.95, 0.1), PL.clone().add(V(0, 0.05, 0.22)), PL.clone().add(V(0, -0.1, 0.25)), salida.clone().add(V(0.25, -0.1, 0.2))], escalas: [1, 1, 1, 1, 1, 0] };
      });
      ctx.anunciar('La ADH y la oxitocina se fabrican en el hipotálamo, bajan por los axones y se liberan en la neurohipófisis');
      return animarFlujos(ctx, [{ malla: P.adh, rutas, periodo: 7 }]);
    },
  },

  liberar() { refsEje = null; },
};

// Eje de tres niveles con retroalimentación negativa. Pasos de igual duración (T = 8).
function animarEje(ctx, clave, ids, textos) {
  const { V, P, NARC, AL } = refsEje;
  const diana = refsEje[clave], arribaDiana = diana.clone().add(V(0, 0.32, 0.15));
  const desvio = (i) => V((i - 1.5) * 0.06, 0, 0.18);
  const lib = [0, 1, 2, 3].map((i) => ({ desfase: 0, escalas: [1, 1, 1, 0, 0, 0, 0, 0, 0],
    puntos: [NARC.clone().add(desvio(i)), V(-0.1, 1.05, 0.2).add(desvio(i)), AL.clone().add(V(0, 0.05, 0.25)), ...Array(6).fill(AL.clone().add(V(0, 0, 0.25)))] }));
  const medio = V(diana.x * 0.5, -0.3, 0.2);
  const tro = [0, 1, 2, 3].map((i) => ({ desfase: 0, escalas: [0, 0, 0, 1, 1, 1, 0, 0, 0],
    puntos: [...Array(3).fill(AL.clone().add(V(0, -0.1, 0.25))), AL.clone().add(V(0, -0.25, 0.25)).add(desvio(i)), medio.clone().add(desvio(i)), arribaDiana.clone().add(desvio(i)), ...Array(3).fill(arribaDiana)] }));
  const per = [0, 1, 2, 3].map((i) => {
    const sube = i < 2 ? V(-0.1, 1.45, 0.25) : AL.clone().add(V(0.05, 0, 0.3)); // frena al hipotálamo y a la hipófisis
    return { desfase: 0, escalas: [0, 0, 0, 0, 0, 0, 1, 1, 0],
      puntos: [...Array(6).fill(arribaDiana.clone().add(desvio(i))), V(diana.x * 0.35 + 0.3, -0.1, 0.35), V(0.3, 0.9, 0.35), sube] };
  });
  const PASOS = [[0, `1. El hipotálamo libera ${textos[0]} al sistema porta hipofisario`], [0.3, `2. La adenohipófisis responde y libera ${textos[1]}`],
    [0.6, `3. Por la sangre llega a su glándula diana y ${textos[2]}`], [0.78, `4. Retroalimentación negativa: ${textos[3]} frena al hipotálamo y a la hipófisis`]];
  let paso = -1;
  return animarFlujos(ctx, [
    { malla: P[ids[0]], rutas: lib, periodo: 10 }, { malla: P[ids[1]], rutas: tro, periodo: 10 }, { malla: P[ids[2]], rutas: per, periodo: 10 },
  ], (t, s) => {
    const u = (s / 10) % 1; let k = 0; PASOS.forEach(([uf], i) => { if (u >= uf) k = i; });
    if (k !== paso) { paso = k; ctx.anunciar(PASOS[k][1]); }
  });
}

export default moduloEje;
