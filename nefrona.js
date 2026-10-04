// Módulo procedural: nefrona completa (corpúsculo renal, túbulos, asa de Henle y túbulo colector)
// con su irrigación. Arriba la corteza, abajo la médula.
import { crearAzar, animarFlujos } from '../animacion.js';

let refsNef = null;

const moduloNefrona = {
  id: 'nefrona',
  ambito: 'anatomia',
  titulo: 'Nefrona y formación de orina',
  tipo: 'procedural',
  archivoDatos: './datos/nefrona.json',
  camaraInicial: { pos: [-0.2, -0.1, 7.6], objetivo: [-0.2, -0.1, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const azar = crearAzar(13);
    const g = new THREE.Group(); ctx.raiz.add(g);
    const curva = (pts) => new THREE.CatmullRomCurve3(pts);
    const tubo = (pts, r, id, seg = 80) => ctx.malla(new THREE.TubeGeometry(curva(pts), seg, r, 10), id, g);

    // Corpúsculo renal
    const G = V(-1.5, 1.2);
    ctx.malla(new THREE.SphereGeometry(0.4, 36, 24, Math.PI, Math.PI), 'capsula_bowman', g).position.copy(G);
    const ptsGlom = [V(-2.0, 1.45)];
    let p = G.clone().add(V(-0.2, 0.15));
    for (let i = 0; i < 26; i++) {
      const sig = p.clone().add(V((azar() - 0.5) * 0.22, (azar() - 0.5) * 0.22, (azar() - 0.5) * 0.18));
      if (sig.distanceTo(G) < 0.28) p = sig;
      ptsGlom.push(p.clone());
    }
    ptsGlom.push(V(-2.0, 1.0));
    tubo(ptsGlom, 0.035, 'glomerulo', 200);
    tubo([V(-2.9, 1.75), V(-2.4, 1.55), V(-2.0, 1.45)], 0.06, 'arteriola_aferente', 20);

    // Túbulos (con un poco de profundidad para que se lean en 3D)
    const TCP = [V(-1.12, 1.2), V(-0.85, 1.48, 0.12), V(-0.55, 1.2, -0.1), V(-0.3, 1.52, 0.1), V(0.0, 1.25, -0.1), V(0.25, 1.5, 0.1), V(0.5, 1.2)];
    const DESC = [V(0.5, 1.2), V(0.5, 0.4), V(0.5, -0.6), V(0.53, -1.5), V(0.7, -1.85)];
    const ASC = [V(0.7, -1.85), V(0.9, -1.5), V(0.92, -0.6), V(0.92, 0.4), V(0.85, 0.75)];
    const TCD = [V(0.85, 0.75), V(0.45, 0.62, 0.1), V(0.0, 0.82, -0.1), V(-0.5, 0.6, 0.1), V(-0.95, 0.78), V(-0.55, 0.4, -0.1), V(0.3, 0.35, 0.1), V(1.3, 0.45), V(1.7, 0.6)];
    const COL = [V(1.7, 1.8), V(1.7, 0.6), V(1.72, -0.5), V(1.75, -2.2)];
    tubo(TCP, 0.065, 'tcp'); tubo(DESC, 0.035, 'asa_descendente', 40); tubo(ASC, 0.048, 'asa_ascendente', 40);
    tubo(TCD, 0.052, 'tcd'); tubo(COL, 0.075, 'tubulo_colector', 40);
    const md = [];
    for (let i = 0; i < 7; i++) md.push(new THREE.Matrix4().makeTranslation(-0.98 + (azar() - 0.5) * 0.12, 0.86 + (azar() - 0.5) * 0.08, (azar() - 0.5) * 0.12));
    ctx.instancias(new THREE.SphereGeometry(0.03, 10, 8), 'macula_densa', md, g);

    // Arteriola eferente y capilares peritubulares (con vasa recta en la médula)
    const peri = [V(-2.0, 1.0), V(-1.7, 0.75, 0.25), V(-0.9, 1.05, 0.28), V(-0.1, 1.15, 0.28), V(0.4, 0.9, 0.25), V(0.65, 0.2, 0.25),
      V(0.68, -1.2, 0.2), V(0.8, -2.0, 0.2), V(1.05, -1.3, 0.22), V(1.1, 0.2, 0.25), V(0.2, 0.5, 0.3), V(-1.2, 0.45, 0.3), V(-2.9, 0.3, 0.2)];
    tubo([V(-2.0, 1.0), V(-2.2, 0.9), V(-1.9, 0.78, 0.2)], 0.045, 'arteriola_eferente', 20);
    tubo(peri, 0.028, 'capilares_peritubulares', 160);

    // Trayecto completo del filtrado para las partículas
    const todos = [G.clone(), ...TCP, ...DESC.slice(1), ...ASC.slice(1), ...TCD.slice(1), V(1.7, 0.6), ...COL.slice(2)];
    const ruta = curva(todos).getSpacedPoints(90);
    const indice = (q) => ruta.reduce((mejor, r, i) => (r.distanceTo(q) < ruta[mejor].distanceTo(q) ? i : mejor), 0);
    const segmentos = { tcp: [1, indice(TCP[6])], desc: [indice(DESC[1]), indice(DESC[4])], asc: [indice(ASC[1]), indice(ASC[4])],
      tcd: [indice(TCD[1]), indice(TCD[8])], col: [indice(COL[1]), ruta.length - 1] };

    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const ico = (r) => new THREE.IcosahedronGeometry(r, 1);
    const P = {
      agua: ctx.instancias(ico(0.028), 'agua', vacio(16), g),
      glucosa: ctx.instancias(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6), 'glucosa', vacio(6), g),
      sodio: ctx.instancias(ico(0.03), 'sodio', vacio(10), g),
      urea: ctx.instancias(ico(0.03), 'urea', vacio(6), g),
      secrecion: ctx.instancias(ico(0.028), 'secrecion', vacio(5), g),
      eritrocitos: ctx.instancias(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), 'eritrocitos', vacio(14), g),
    };
    Object.values(P).forEach((m) => { m.count = 0; m.frustumCulled = false; });
    refsNef = { V, P, ruta, segmentos, azar, peri, ptsGlom, aferente: [V(-2.9, 1.75), V(-2.4, 1.55), V(-2.0, 1.45)] };
  },

  procesos: {
    formacion_orina(ctx) {
      const { V, P, ruta, segmentos, azar } = refsNef;
      // Ruta que recorre el túbulo hasta el índice "hasta" y luego sale hacia el capilar (o sigue hasta la orina).
      const N = 24;
      const recorrido = (hasta, sale, desfase, entraEn = 0) => {
        const puntos = [], escalas = [];
        for (let j = 0; j <= N; j++) {
          const idx = Math.round((j / N) * (ruta.length - 1));
          if (idx < entraEn) { puntos.push(ruta[entraEn].clone().add(V(0, 0, 0.35))); escalas.push(0); continue; }
          if (sale && idx > hasta) { puntos.push(ruta[hasta].clone().add(V(0, 0, 0.32))); escalas.push(j * (ruta.length - 1) / N > hasta + 6 ? 0 : 1); continue; }
          puntos.push(ruta[Math.min(idx, ruta.length - 1)].clone()); escalas.push(1);
        }
        return { puntos, escalas, desfase };
      };
      const enSeg = ([a, b]) => Math.round(a + azar() * (b - a));
      const flujo = (malla, n, generador) => ({ malla, rutas: Array.from({ length: n }, (_, i) => generador(i / n)), periodo: 14 });
      return animarFlujos(ctx, [
        flujo(P.glucosa, 6, (d) => recorrido(enSeg(segmentos.tcp), true, d)),
        flujo(P.agua, 16, (d) => { const r = azar(); const s = r < 0.55 ? segmentos.tcp : r < 0.8 ? segmentos.desc : r < 0.92 ? segmentos.col : null;
          return s ? recorrido(enSeg(s), true, d) : recorrido(0, false, d); }),
        flujo(P.sodio, 10, (d) => { const r = azar(); const s = r < 0.6 ? segmentos.tcp : r < 0.85 ? segmentos.asc : segmentos.tcd;
          return recorrido(enSeg(s), true, d); }),
        flujo(P.urea, 6, (d) => recorrido(0, false, d)),
        flujo(P.secrecion, 5, (d) => recorrido(0, false, d, enSeg(azar() < 0.6 ? segmentos.tcp : segmentos.tcd))),
      ]);
    },

    flujo_sanguineo(ctx) {
      const { P, peri, ptsGlom, aferente } = refsNef;
      const trayecto = [...aferente, ...ptsGlom.slice(1), ...peri.slice(1)];
      const rutas = Array.from({ length: 14 }, (_, i) => ({ desfase: i / 14, puntos: trayecto }));
      return animarFlujos(ctx, [{ malla: P.eritrocitos, rutas, periodo: 16 }]);
    },
  },

  liberar() { refsNef = null; },
};

export default moduloNefrona;
