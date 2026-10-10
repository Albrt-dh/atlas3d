// Módulo procedural: respiración celular. A la izquierda, mitocondria en corte con la
// glucólisis en el citosol y el ciclo de Krebs en la matriz. A la derecha, detalle de la
// membrana interna con la cadena de transporte de electrones y la ATP sintasa.
import { animarFlujos, rutaSalida, rutaEntrada } from '../animacion.js';

let refsMetab = null;

const moduloMetabolismo = {
  id: 'metabolismo',
  ambito: 'celular',
  titulo: 'Metabolismo y respiración celular',
  tipo: 'procedural',
  archivoDatos: './datos/metabolismo.json',
  camaraInicial: { pos: [0.2, 0.7, 7.4], objetivo: [0.2, 0.15, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const g = new THREE.Group();
    ctx.raiz.add(g);
    const ubicar = (o, p) => { o.position.copy(p); return o; };

    // ---------- Mitocondria en corte (mitad trasera, z < 0) ----------
    const M = V(-1.7, 0, 0);
    function perfilCapsula(r, mitad) {
      const pts = [];
      for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(r * Math.cos(a), 0.001), -mitad + r * Math.sin(a))); }
      for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(r * Math.cos(a), 0.001), mitad + r * Math.sin(a))); }
      return pts;
    }
    const capsulaCortada = (r, mitad, id) => {
      const o = ctx.malla(new THREE.LatheGeometry(perfilCapsula(r, mitad), 40, Math.PI / 2, Math.PI), id, g);
      o.rotation.z = Math.PI / 2; o.position.copy(M);
      return o;
    };
    capsulaCortada(0.6, 0.85, 'membrana_externa');
    capsulaCortada(0.5, 0.78, 'membrana_interna');
    [[-1.5, 0.14], [-1.25, -0.14], [-1.0, 0.14]].forEach(([x, y]) => {
      const c = ctx.malla(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 24, 1, false, Math.PI / 2, Math.PI), 'crestas', g);
      c.rotation.z = Math.PI / 2; c.position.set(x, y, 0);
    });
    const adn = ctx.malla(new THREE.TorusGeometry(0.07, 0.008, 6, 32), 'adn_mitocondrial', g);
    ubicar(adn, V(-0.75, -0.2, -0.15));
    const ribos = [];
    [[-0.7, 0.18], [-0.82, 0.05], [-1.6, -0.35], [-2.6, -0.2], [-2.55, 0.25], [-0.68, -0.05]].forEach(([x, y]) =>
      ribos.push(new THREE.Matrix4().makeTranslation(x, y, -0.18)));
    ctx.instancias(new THREE.IcosahedronGeometry(0.022, 0), 'ribosomas_mitocondriales', ribos, g);

    // ---------- Glucólisis (citosol) ----------
    const G = [V(-3.1, 1.3, 0), V(-2.6, 1.3, 0), V(-2.1, 1.3, 0), V(-1.6, 1.3, 0), V(-1.1, 1.05, 0)];
    ['glucosa', 'glucosa_6_fosfato', 'fructosa_1_6_bisfosfato', 'gliceraldehido_3_fosfato', 'piruvato']
      .forEach((id, i) => ubicar(ctx.malla(new THREE.SphereGeometry(0.075, 20, 14), id, g), G[i]));
    const tubo = (a, b, id) => ctx.malla(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, 0.008, 6), id, g);
    for (let i = 0; i < 4; i++) tubo(G[i], G[i + 1], 'ruta_glucolisis');

    // ---------- Ciclo de Krebs (matriz) ----------
    const K = V(-2.15, 0, -0.12), RK = 0.25;
    const idsKrebs = ['citrato', 'isocitrato', 'alfa_cetoglutarato', 'succinil_coa', 'succinato', 'fumarato', 'malato', 'oxalacetato'];
    const N = idsKrebs.map((id, i) => {
      const a = Math.PI / 2 - (i / 8) * Math.PI * 2;
      const p = V(K.x + Math.cos(a) * RK, K.y + Math.sin(a) * RK, K.z);
      ubicar(ctx.malla(new THREE.SphereGeometry(0.05, 16, 12), id, g), p);
      return p;
    });
    ubicar(ctx.malla(new THREE.TorusGeometry(RK, 0.007, 6, 48), 'ciclo_krebs', g), K);
    const A = V(K.x - 0.1, 0.4, K.z);
    ubicar(ctx.malla(new THREE.SphereGeometry(0.06, 16, 12), 'acetil_coa', g), A);

    // ---------- Detalle de la membrana interna ----------
    const memb = ctx.malla(new THREE.BoxGeometry(3.4, 0.36, 1.0), 'membrana_detalle', g);
    memb.position.set(2.0, 0, 0);
    const X = { I: 0.75, II: 1.3, Q: 1.55, III: 1.9, c: 2.2, IV: 2.5, V: 3.2 };
    const capsula = (r, l, id, p, esc) => { const o = ubicar(ctx.malla(new THREE.CapsuleGeometry(r, l, 4, 14), id, g), p); if (esc) o.scale.set(...esc); return o; };
    capsula(0.15, 0.24, 'complejo_i', V(X.I, 0.02, 0), [1, 1, 0.9]);
    capsula(0.08, 0.3, 'complejo_i', V(X.I + 0.06, -0.42, 0), null).rotation.z = 0.5;
    capsula(0.1, 0.1, 'complejo_ii', V(X.II, -0.16, 0));
    capsula(0.15, 0.22, 'complejo_iii', V(X.III, 0.04, 0), [1, 1, 0.9]);
    capsula(0.14, 0.2, 'complejo_iv', V(X.IV, 0.02, 0), [1, 1, 0.9]);
    ubicar(ctx.malla(new THREE.SphereGeometry(0.06, 16, 12), 'coenzima_q', g), V(X.Q, 0, 0.3));
    ubicar(ctx.malla(new THREE.SphereGeometry(0.065, 16, 12), 'citocromo_c', g), V(X.c, 0.3, 0.05));
    // ATP sintasa: F0 (anillo c y tallo, giran) + F1 (cabeza α3β3, fija, en la matriz)
    const rotor = new THREE.Group();
    rotor.position.set(X.V, 0, 0); g.add(rotor);
    ctx.malla(new THREE.CylinderGeometry(0.14, 0.14, 0.38, 20), 'atp_sintasa', rotor);
    ubicar(ctx.malla(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), 'atp_sintasa', rotor), V(0, -0.34, 0));
    const cabeza = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cabeza.push(new THREE.Matrix4().makeTranslation(X.V + Math.cos(a) * 0.1, -0.62 + (i % 2) * 0.03, Math.sin(a) * 0.1));
    }
    ctx.instancias(new THREE.SphereGeometry(0.075, 14, 10), 'atp_sintasa', cabeza, g);
    capsula(0.025, 0.5, 'atp_sintasa', V(X.V + 0.2, -0.38, 0)); // brazo estator

    // ---------- Partículas (sin instancias visibles hasta que corre un proceso) ----------
    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const ico = (r) => new THREE.IcosahedronGeometry(r, 1);
    const P = {
      metabolito: ctx.instancias(ico(0.05), 'metabolito', vacio(2), g),
      atp: ctx.instancias(new THREE.OctahedronGeometry(0.045, 0), 'atp', vacio(6), g),
      nadh: ctx.instancias(new THREE.TetrahedronGeometry(0.05, 0), 'nadh', vacio(4), g),
      fadh2: ctx.instancias(new THREE.TetrahedronGeometry(0.05, 0), 'fadh2', vacio(1), g),
      co2: ctx.instancias(ico(0.035), 'co2', vacio(2), g),
      electrones: ctx.instancias(ico(0.025), 'electrones', vacio(2), g),
      protones: ctx.instancias(ico(0.022), 'protones', vacio(10), g),
      oxigeno: ctx.instancias(ico(0.04), 'oxigeno', vacio(1), g),
      agua: ctx.instancias(ico(0.035), 'agua', vacio(1), g),
    };
    Object.values(P).forEach((m) => { m.count = 0; m.frustumCulled = false; });
    refsMetab = { G, N, A, K, X, rotor, P };
  },

  procesos: {
    glucolisis(ctx) {
      const { THREE } = ctx; const { G, P } = refsMetab; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const T = 8; // pasos: 0-1 G0, 1-2 G1, 2-3 G2, 3-4 G3 (se divide), 5-6 G4
      const ruta = (pts) => ({ puntos: pts, desfase: 0 });
      const metab = [
        ruta([G[0], G[0], G[1], G[1], G[2], G[3], G[3], G[4], G[4]]),
        { ...rutaSalida(THREE, 5, T, G[3].clone().add(V(0, -0.14, 0)), G[4].clone().add(V(0, -0.14, 0))) },
      ];
      const arriba = (p, dx = 0) => p.clone().add(V(dx, 0.55, 0.2));
      const atp = [
        rutaEntrada(THREE, 1, T, arriba(G[0], -0.2), G[0]),       // se gasta 1 ATP (hexocinasa)
        rutaEntrada(THREE, 3, T, arriba(G[1], -0.2), G[2]),       // se gasta 1 ATP (PFK-1)
        rutaSalida(THREE, 5, T, G[3], arriba(G[3], -0.15)),       // se forman 2 ATP
        rutaSalida(THREE, 5, T, G[3], arriba(G[3], 0.15)),
        rutaSalida(THREE, 7, T, G[4], arriba(G[4], -0.15)),       // se forman 2 ATP (piruvato cinasa)
        rutaSalida(THREE, 7, T, G[4], arriba(G[4], 0.15)),
      ];
      const nadh = [rutaSalida(THREE, 5, T, G[3], G[3].clone().add(V(0.25, -0.45, 0.25))),
        rutaSalida(THREE, 5, T, G[3], G[3].clone().add(V(0.4, -0.35, 0.25)))];
      return animarFlujos(ctx, [
        { malla: P.metabolito, rutas: metab, periodo: 9 },
        { malla: P.atp, rutas: atp, periodo: 9 },
        { malla: P.nadh, rutas: nadh, periodo: 9 },
      ]);
    },

    piruvato_acetil(ctx) {
      const { THREE } = ctx; const { G, A, P } = refsMetab; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const metab = [{ desfase: 0, puntos: [G[4], G[4], V(-1.75, 0.72, -0.05), V(-2.05, 0.5, -0.1), A, A, A] }];
      const co2 = [rutaSalida(THREE, 4, 6, A, V(-2.4, 1.15, 0.25))];
      const nadh = [rutaSalida(THREE, 4, 6, A, V(-1.75, 0.15, -0.05))];
      return animarFlujos(ctx, [
        { malla: P.metabolito, rutas: metab, periodo: 6 },
        { malla: P.co2, rutas: co2, periodo: 6 },
        { malla: P.nadh, rutas: nadh, periodo: 6 },
      ]);
    },

    krebs(ctx) {
      const { THREE } = ctx; const { N, A, K, P } = refsMetab; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const T = 8; // el metabolito pasa por un intermediario en cada paso
      const metab = [{ desfase: 0, puntos: [A, ...N] }];
      const fuera = (i, d = 0.3) => N[i].clone().sub(K).normalize().multiplyScalar(d).add(N[i]).add(V(0, 0, 0.12));
      return animarFlujos(ctx, [
        { malla: P.metabolito, rutas: metab, periodo: 12 },
        { malla: P.co2, rutas: [rutaSalida(THREE, 2, T, N[2], fuera(2, 0.5)), rutaSalida(THREE, 3, T, N[3], fuera(3, 0.5))], periodo: 12 },
        { malla: P.nadh, rutas: [rutaSalida(THREE, 2, T, N[2], fuera(2)), rutaSalida(THREE, 3, T, N[3], fuera(3)), rutaSalida(THREE, 7, T, N[7], fuera(7))], periodo: 12 },
        { malla: P.atp, rutas: [rutaSalida(THREE, 4, T, N[4], fuera(4))], periodo: 12 },
        { malla: P.fadh2, rutas: [rutaSalida(THREE, 5, T, N[5], fuera(5))], periodo: 12 },
      ]);
    },

    cadena_electrones(ctx) {
      const { THREE } = ctx; const { X, P } = refsMetab; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const T = 7;
      const e = [0, 0.04].map((dz) => ({ desfase: 0,
        puntos: [V(X.I, -0.45, dz), V(X.I, -0.45, dz), V(X.I, 0, dz), V(X.Q, 0, 0.3 + dz), V(X.III, 0, dz), V(X.c, 0.3, 0.05 + dz), V(X.IV, 0, dz), V(X.IV, -0.38, dz)],
        escalas: [0, 1, 1, 1, 1, 1, 1, 0] }));
      const bombeo = (x, k, dx) => ({ desfase: 0, escalas: Array(T + 1).fill(1),
        puntos: Array.from({ length: T + 1 }, (_, j) => j < k ? V(x + dx, -0.62, 0.25) : j === k ? V(x + dx * 0.4, 0, 0.1) : V(x + dx * 2, 0.62, 0.25)) });
      const protones = [bombeo(X.I, 2, -0.08), bombeo(X.I, 2, 0.08), bombeo(X.III, 4, -0.08), bombeo(X.III, 4, 0.08), bombeo(X.IV, 6, -0.06), bombeo(X.IV, 6, 0.06)];
      return animarFlujos(ctx, [
        { malla: P.nadh, rutas: [rutaEntrada(THREE, 1, T, V(X.I - 0.2, -1.05, 0.3), V(X.I, -0.5, 0.1))], periodo: 9 },
        { malla: P.fadh2, rutas: [rutaEntrada(THREE, 2, T, V(X.II, -1.05, 0.3), V(X.II, -0.3, 0.1))], periodo: 9 },
        { malla: P.electrones, rutas: e, periodo: 9 },
        { malla: P.protones, rutas: protones, periodo: 9 },
        { malla: P.oxigeno, rutas: [rutaEntrada(THREE, 7, T, V(X.IV + 0.35, -1.05, 0.3), V(X.IV, -0.4, 0.05))], periodo: 9 },
        { malla: P.agua, rutas: [{ desfase: 0, puntos: [...Array(T).fill(V(X.IV, -0.4, 0.05)), V(X.IV + 0.2, -0.95, 0.3)], escalas: [...Array(T - 1).fill(0), 1, 1] }], periodo: 9 },
      ]);
    },

    atp_sintasa(ctx) {
      const { THREE } = ctx; const { X, P, rotor } = refsMetab; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const protones = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return { desfase: i / 8, puntos: [V(X.V + Math.cos(a) * 0.35, 0.7, 0.2 + Math.sin(a) * 0.15), V(X.V + 0.15, 0.2, 0.05), V(X.V + 0.15, -0.2, 0.05), V(X.V + Math.cos(a) * 0.4, -0.95, 0.25)] };
      });
      const atp = [0, 1, 2].map((i) => ({ desfase: i / 3, escalas: [0, 1, 1],
        puntos: [V(X.V, -0.62, 0.08), V(X.V, -0.62, 0.12), V(X.V - 0.35 + i * 0.35, -1.1, 0.3)] }));
      const parar = animarFlujos(ctx, [
        { malla: P.protones, rutas: protones, periodo: 3 },
        { malla: P.atp, rutas: atp, periodo: 3 },
      ], (t, s) => { rotor.rotation.y = s * 2.4; });
      return () => { parar(); rotor.rotation.y = 0; };
    },
  },

  liberar() { refsMetab = null; },
};

export default moduloMetabolismo;
