// Módulo procedural: bloque de piel en corte con sus capas y anexos. La cara frontal (z = 0)
// es el plano de corte; las estructuras internas asoman por esa cara.
import { crearAzar, animarFlujos } from '../animacion.js';

let refsPiel = null;

const CAPAS = [ // [id, y inferior, y superior]
  ['estrato_corneo', 1.1, 1.2], ['estrato_granuloso', 1.03, 1.1], ['estrato_espinoso', 0.86, 1.03], ['estrato_basal', 0.8, 0.86],
  ['dermis_papilar', 0.55, 0.8], ['dermis_reticular', -0.3, 0.55], ['hipodermis', -1.1, -0.3],
];

const moduloPiel = {
  id: 'tegumentario',
  ambito: 'anatomia',
  titulo: 'Sistema tegumentario (piel)',
  tipo: 'procedural',
  archivoDatos: './datos/tegumentario.json',
  camaraInicial: { pos: [1.6, 1.4, 4.4], objetivo: [0, 0.1, -0.4] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const azar = crearAzar(23);
    const g = new THREE.Group(); ctx.raiz.add(g);
    const tubo = (pts, r, id, padre = g, seg = 40) => ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 10), id, padre);
    const M = (p, s = V(1, 1, 1)) => new THREE.Matrix4().compose(p, new THREE.Quaternion(), s);

    for (const [id, y0, y1] of CAPAS) ctx.malla(new THREE.BoxGeometry(3, y1 - y0, 1.6), id, g).position.set(0, (y0 + y1) / 2, -0.8);

    // Pelo y folículo (giran juntos en la piloerección, con pivote en el bulbo)
    const bulbo = V(-0.75, -0.45, 0);
    const pelo = new THREE.Group(); pelo.position.copy(bulbo); g.add(pelo);
    tubo([V(0, 0), V(0.15, 0.8), V(0.33, 1.65)], 0.085, 'foliculo_piloso', pelo);
    tubo([V(0, 0.05), V(0.15, 0.8), V(0.36, 1.7), V(0.55, 2.35)], 0.035, 'tallo_piloso', pelo);
    ctx.malla(new THREE.SphereGeometry(0.14, 20, 14), 'bulbo_piloso', pelo);
    const sebacea = [];
    for (let i = 0; i < 7; i++) sebacea.push(M(V(0.28 + (azar() - 0.5) * 0.12, 1.0 + (azar() - 0.5) * 0.16, (azar() - 0.5) * 0.1)));
    ctx.instancias(new THREE.SphereGeometry(0.075, 14, 10), 'glandula_sebacea', sebacea, pelo);
    const erector = ctx.malla(new THREE.CapsuleGeometry(0.035, 0.85, 4, 8), 'musculo_erector', g);
    const ini = V(-0.6, 0.15, 0), fin = V(0.05, 0.74, 0);
    erector.position.copy(ini).lerp(fin, 0.5);
    erector.quaternion.setFromUnitVectors(V(0, 1, 0), fin.clone().sub(ini).normalize());

    // Glándula sudorípara ecrina: ovillo en la dermis profunda y conducto en espiral hasta la superficie
    const ovillo = Array.from({ length: 40 }, (_, i) => { const a = i * 0.9; return V(0.75 + Math.cos(a) * 0.14, -0.5 + i * 0.006, Math.sin(a) * 0.05); });
    const conducto = [V(0.75, -0.26), V(0.72, 0.3), V(0.78, 0.8), ...Array.from({ length: 10 }, (_, i) => V(0.75 + Math.cos(i * 1.6) * 0.04, 0.86 + i * 0.034, 0)), V(0.75, 1.21)];
    tubo([...ovillo, ...conducto], 0.035, 'glandula_sudoripara', g, 200);

    // Vasos de la dermis con asas capilares en las papilas
    tubo([V(-1.5, -0.05), V(0, 0.0), V(1.5, -0.08)], 0.05, 'arteriola', g);
    tubo([V(-1.5, -0.2), V(0, -0.15), V(1.5, -0.22)], 0.055, 'venula', g);
    [-0.2, 0.35, 1.2].forEach((x) => tubo([V(x, 0.0), V(x - 0.04, 0.55), V(x, 0.74), V(x + 0.08, 0.55), V(x + 0.06, -0.15)], 0.018, 'capilares_dermicos', g, 30));

    // Receptores sensoriales y nervio
    const meissner = ctx.malla(new THREE.SphereGeometry(0.06, 14, 10), 'corpusculo_meissner', g);
    meissner.position.set(0.12, 0.72, 0); meissner.scale.set(0.8, 1.4, 0.8);
    const pacini = new THREE.Group(); pacini.position.set(1.05, -0.75, 0); g.add(pacini);
    ctx.malla(new THREE.SphereGeometry(0.16, 20, 14), 'corpusculo_pacini', pacini).scale.set(1, 1.6, 1);
    [0.6, 0.85, 1.1].forEach((s) => { const a = ctx.malla(new THREE.TorusGeometry(0.17 * s, 0.008, 6, 24), 'corpusculo_pacini', pacini); a.scale.set(1, 1.6, 1); });
    tubo([V(1.5, -1.0), V(1.15, -1.05), V(1.05, -1.0)], 0.02, 'nervio_cutaneo', g, 12);
    tubo([V(1.5, -0.95), V(0.6, -0.35), V(0.2, 0.3), V(0.12, 0.66)], 0.015, 'nervio_cutaneo', g, 30);

    // Melanocitos en el estrato basal y adipocitos en la hipodermis
    const melan = [-1.3, -1.0, -0.2, 0.3, 1.0, 1.35].map((x) => M(V(x, 0.83, 0)));
    ctx.instancias(new THREE.SphereGeometry(0.035, 10, 8), 'melanocitos', melan, g);
    const adip = [];
    for (let x = -1.35; x <= 1.36; x += 0.27) for (const y of [-0.5, -0.78, -1.0]) if (Math.hypot(x - 1.05, y + 0.75) > 0.32) adip.push(M(V(x + (azar() - 0.5) * 0.05, y, 0), V(1, 0.85, 0.6)));
    ctx.instancias(new THREE.SphereGeometry(0.13, 16, 12), 'adipocitos', adip, g);

    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const P = {
      sudor: ctx.instancias(new THREE.IcosahedronGeometry(0.03, 1), 'sudor', vacio(10), g),
      queratinocitos: ctx.instancias(new THREE.SphereGeometry(0.04, 12, 8), 'queratinocitos', vacio(12), g),
    };
    Object.values(P).forEach((m) => { m.count = 0; m.frustumCulled = false; });
    refsPiel = { V, P, pelo, erector, conducto, ovillo, azar };
  },

  procesos: {
    sudoracion(ctx) {
      const { V, P, conducto, ovillo } = refsPiel;
      const camino = [ovillo[20], ovillo[39], ...conducto, V(0.82, 1.45, 0.05)];
      const rutas = Array.from({ length: 10 }, (_, i) => ({ desfase: i / 10, puntos: camino }));
      ctx.anunciar('Termorregulación: el sudor sale a la superficie y al evaporarse enfría la piel');
      return animarFlujos(ctx, [{ malla: P.sudor, rutas, periodo: 6 }]);
    },

    piloereccion(ctx) {
      const { pelo, erector } = refsPiel;
      ctx.anunciar('El frío o el miedo activan el simpático: el músculo erector se contrae y el pelo se levanta');
      const parar = ctx.motor.animar((t) => {
        const k = (Math.sin(t / 1000 * 1.6) + 1) / 2;
        pelo.rotation.z = k * 0.22; erector.scale.set(1 + k * 0.3, 1 - k * 0.18, 1 + k * 0.3);
        return true;
      });
      return () => { parar(); pelo.rotation.z = 0; erector.scale.set(1, 1, 1); ctx.pedirRender(); };
    },

    renovacion(ctx) {
      const { V, P, azar } = refsPiel;
      const rutas = Array.from({ length: 12 }, (_, i) => {
        const x = -1.3 + (i / 11) * 2.6 + (azar() - 0.5) * 0.1;
        return { desfase: i / 12, puntos: [V(x, 0.83, 0.02), V(x, 0.95, 0.02), V(x, 1.07, 0.02), V(x, 1.16, 0.02), V(x, 1.3, 0.04)], escalas: [1, 1, 0.85, 0.6, 0] };
      });
      ctx.anunciar('Los queratinocitos nacen en el estrato basal, suben, se aplanan y se descaman');
      return animarFlujos(ctx, [{ malla: P.queratinocitos, rutas, periodo: 8 }]);
    },
  },

  liberar() { refsPiel = null; },
};

export default moduloPiel;
