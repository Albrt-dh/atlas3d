// Módulo procedural: vía aérea terminal con saco alveolar (izquierda) y detalle de un alvéolo
// en corte con su capilar (derecha), donde ocurre el intercambio gaseoso.
import { crearAzar, animarFlujos, rutaSalida } from '../animacion.js';

let refsAlv = null;

const moduloAlveolo = {
  id: 'alveolo',
  ambito: 'anatomia',
  titulo: 'Alvéolo e intercambio gaseoso',
  tipo: 'procedural',
  archivoDatos: './datos/alveolo.json',
  camaraInicial: { pos: [-0.3, 0.3, 7.0], objetivo: [-0.3, 0.1, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const azar = crearAzar(17);
    const g = new THREE.Group(); ctx.raiz.add(g);
    const tubo = (pts, r, id, seg = 40, padre = g) => ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 10), id, padre);
    const M = (p, s = 1) => new THREE.Matrix4().compose(p, new THREE.Quaternion(), V(s, s, s));

    // ---------- Vía aérea terminal y saco alveolar ----------
    const racimo = new THREE.Group(); g.add(racimo);
    tubo([V(-3.7, 1.7), V(-3.2, 1.2), V(-2.7, 0.65)], 0.11, 'bronquiolo', 30, racimo);
    const anillos = [0.2, 0.45, 0.7].map((t) => {
      const p = new THREE.CatmullRomCurve3([V(-3.7, 1.7), V(-3.2, 1.2), V(-2.7, 0.65)]).getPoint(t);
      return new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(1, -1, 0).normalize()), V(1, 1, 1));
    });
    ctx.instancias(new THREE.TorusGeometry(0.115, 0.018, 6, 20), 'musculo_liso', anillos, racimo);
    tubo([V(-2.7, 0.65), V(-2.35, 0.25), V(-2.1, 0.0)], 0.075, 'conducto_alveolar', 20, racimo);
    const C = V(-1.95, -0.35), alv = [];
    for (let i = 0; alv.length < 11 && i < 300; i++) {
      const d = V(azar() - 0.5, azar() - 0.5, azar() - 0.5).normalize().multiplyScalar(0.25 + azar() * 0.25);
      const q = C.clone().add(d);
      if (alv.every((a) => a.distanceTo(q) > 0.3)) alv.push(q);
    }
    const saco = ctx.instancias(new THREE.SphereGeometry(0.21, 20, 14), 'saco_alveolar', alv.map((q) => M(q.clone().sub(C))), racimo);
    saco.position.copy(C); // así "respira" desde su centro
    for (let i = 0; i < 8; i++) {
      const pts = [];
      let q = C.clone().add(V((azar() - 0.5) * 0.9, 0.5, 0.3));
      for (let k = 0; k < 7; k++) { pts.push(q.clone().add(V(0, 0, 0.05))); q = C.clone().add(V((azar() - 0.5) * 1.0, 0.45 - k * 0.15, 0.25 + azar() * 0.15)); }
      tubo(pts, 0.012, i % 2 ? 'capilares_venosos' : 'capilares_arteriales', 40, racimo);
    }

    // ---------- Detalle: alvéolo en corte ----------
    const A = V(1.5, 0.15), R = 1.05;
    const detalle = new THREE.Group(); detalle.position.copy(A); g.add(detalle);
    ctx.malla(new THREE.SphereGeometry(R, 48, 32, Math.PI, Math.PI), 'neumocitos_i', detalle);
    ctx.malla(new THREE.SphereGeometry(R - 0.035, 48, 32, Math.PI, Math.PI), 'surfactante', detalle);
    const dirII = V(-0.5, 0.55, -0.67).normalize();
    const tipoII = ctx.malla(new THREE.SphereGeometry(0.17, 20, 14), 'neumocito_ii', detalle);
    tipoII.position.copy(dirII.clone().multiplyScalar(R - 0.08)); tipoII.scale.set(1, 1, 0.7);
    tipoII.quaternion.setFromUnitVectors(V(0, 0, 1), dirII);
    const granulos = [];
    for (let i = 0; i < 6; i++) granulos.push(M(dirII.clone().multiplyScalar(R - 0.2).add(V((azar() - 0.5) * 0.14, (azar() - 0.5) * 0.14, (azar() - 0.5) * 0.06))));
    ctx.instancias(new THREE.SphereGeometry(0.03, 10, 8), 'cuerpos_lamelares', granulos, detalle);
    const macro = ctx.malla(new THREE.IcosahedronGeometry(0.2, 2), 'macrofago_alveolar', detalle);
    macro.position.set(0.35, -0.72, -0.45); macro.scale.set(1.2, 0.7, 1);

    // Capilar sobre el borde del corte (arco inferior), con eritrocitos
    const arco = Array.from({ length: 24 }, (_, i) => { const a = Math.PI * (1.05 + (i / 23) * 0.9); return V(Math.cos(a) * (R + 0.1), Math.sin(a) * (R + 0.1), -0.05); });
    tubo(arco, 0.09, 'capilar', 80, detalle);

    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const P = {
      oxigeno: ctx.instancias(new THREE.IcosahedronGeometry(0.035, 1), 'oxigeno', vacio(14), detalle),
      co2: ctx.instancias(new THREE.IcosahedronGeometry(0.035, 1), 'co2', vacio(10), detalle),
      eritrocitos: ctx.instancias(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 14), 'eritrocitos', vacio(9), detalle),
      aire: ctx.instancias(new THREE.IcosahedronGeometry(0.03, 1), 'aire', vacio(10), racimo),
    };
    Object.values(P).forEach((m) => { m.count = 0; m.frustumCulled = false; });
    refsAlv = { V, P, arco, racimo, detalle, azar, C };
  },

  procesos: {
    intercambio_gaseoso(ctx) {
      const { THREE } = ctx; const { V, P, arco, azar } = refsAlv;
      const T = 6;
      const ptoArco = () => arco[4 + Math.floor(azar() * 16)];
      const o2 = Array.from({ length: 14 }, (_, i) => {
        const r = rutaSalida(THREE, 0, T, V((azar() - 0.5) * 0.9, 0.1 + azar() * 0.4, -0.3 - azar() * 0.3), ptoArco().clone());
        r.desfase = i / 14; return r;
      });
      const co2 = Array.from({ length: 10 }, (_, i) => {
        const r = rutaSalida(THREE, 0, T, ptoArco().clone(), V((azar() - 0.5) * 0.9, 0.2 + azar() * 0.4, -0.25 - azar() * 0.3));
        r.desfase = i / 10; return r;
      });
      const eri = Array.from({ length: 9 }, (_, i) => ({ desfase: i / 9, puntos: arco }));
      ctx.anunciar('O₂ pasa del alvéolo a la sangre y CO₂ de la sangre al alvéolo, por difusión simple');
      return animarFlujos(ctx, [
        { malla: P.oxigeno, rutas: o2, periodo: 4 }, { malla: P.co2, rutas: co2, periodo: 4 },
        { malla: P.eritrocitos, rutas: eri, periodo: 7 },
      ]);
    },

    ventilacion(ctx) {
      const { V, P, racimo, detalle, azar } = refsAlv;
      const entrada = [V(-3.8, 2.0), V(-3.7, 1.7), V(-3.2, 1.2), V(-2.7, 0.65), V(-2.35, 0.25), V(-2.0, -0.2)];
      const rutas = Array.from({ length: 10 }, (_, i) => ({ desfase: 0,
        puntos: [...entrada, ...entrada.slice(0, -1).reverse()].map((q) => q.clone().add(V((azar() - 0.5) * 0.06, 0, (azar() - 0.5) * 0.06))),
        escalas: undefined }));
      rutas.forEach((r, i) => { r.desfase = i * 0.012; });
      let fase = null;
      const parar = animarFlujos(ctx, [{ malla: P.aire, rutas, periodo: 6 }], (t, s) => {
        const u = (s / 6) % 1, k = 1 + 0.07 * Math.sin(u * Math.PI);
        racimo.children.forEach((o) => { if (o.userData.estructura === 'saco_alveolar') o.scale.setScalar(k); });
        detalle.scale.setScalar(k);
        const f = u < 0.5 ? 'Inspiración: el diafragma se contrae, baja la presión y entra el aire' : 'Espiración: el diafragma se relaja y el aire sale';
        if (f !== fase) { fase = f; ctx.anunciar(f); }
      });
      return () => {
        parar(); detalle.scale.setScalar(1);
        racimo.children.forEach((o) => { if (o.userData.estructura === 'saco_alveolar') o.scale.setScalar(1); });
      };
    },
  },

  liberar() { refsAlv = null; },
};

export default moduloAlveolo;
