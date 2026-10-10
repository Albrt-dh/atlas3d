// Módulo procedural: neurona mielinizada completa y, a la derecha, el detalle de una sinapsis química.
import { crearAzar, animarFlujos, rutaSalida, rutaEntrada } from '../animacion.js';

let refsNeu = null;

const moduloNeurona = {
  id: 'neurona',
  ambito: 'anatomia',
  titulo: 'Neurona y sinapsis',
  tipo: 'procedural',
  archivoDatos: './datos/neurona.json',
  camaraInicial: { pos: [0.6, 0.4, 8.2], objetivo: [0.6, 0.1, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const azar = crearAzar(9);
    const g = new THREE.Group(); ctx.raiz.add(g);
    const M = (p, q, s) => new THREE.Matrix4().compose(p, q || new THREE.Quaternion(), s || V(1, 1, 1));
    const tubo = (pts, r, id, seg = 40) => ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 7), id, g);
    const enX = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2);
    const Y = 0.2;

    // Soma en corte (mitad trasera), núcleo y cuerpos de Nissl
    const S = V(-2.4, Y, 0);
    ctx.malla(new THREE.SphereGeometry(0.4, 36, 24, Math.PI, Math.PI), 'soma', g).position.copy(S);
    ctx.malla(new THREE.SphereGeometry(0.15, 24, 16), 'nucleo_neuronal', g).position.copy(S).add(V(-0.05, 0, -0.08));
    const nissl = [];
    for (let i = 0; i < 14; i++) {
      const a = azar() * Math.PI * 2, r = 0.22 + azar() * 0.1;
      nissl.push(M(S.clone().add(V(Math.cos(a) * r, Math.sin(a) * r, -0.12 - azar() * 0.1)), null, V(1, 0.45, 1)));
    }
    ctx.instancias(new THREE.SphereGeometry(0.035, 10, 8), 'cuerpos_nissl', nissl, g);

    // Dendritas ramificadas
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.55 + (i / 6) * 0.9) + (azar() - 0.5) * 0.2;
      const d = V(Math.cos(a), Math.sin(a), (azar() - 0.5) * 0.3).normalize();
      const p0 = S.clone().addScaledVector(d, 0.36), p1 = p0.clone().addScaledVector(d, 0.45).add(V(0, (azar() - 0.5) * 0.2, 0));
      const p2 = p1.clone().addScaledVector(d, 0.4).add(V((azar() - 0.5) * 0.3, (azar() - 0.5) * 0.3, 0));
      tubo([p0, p1, p2], 0.035, 'dendritas', 16);
      const lado = V(-d.y, d.x, 0).multiplyScalar(azar() > 0.5 ? 1 : -1);
      tubo([p1, p1.clone().addScaledVector(d, 0.2).addScaledVector(lado, 0.2), p1.clone().addScaledVector(d, 0.3).addScaledVector(lado, 0.4)], 0.02, 'dendritas', 10);
    }

    // Cono axónico, axón, mielina y nodos de Ranvier
    const cono = ctx.malla(new THREE.CylinderGeometry(0.05, 0.13, 0.32, 16), 'cono_axonico', g);
    cono.position.set(S.x + 0.5, Y, 0); cono.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -Math.PI / 2));
    const X0 = -1.84, X1 = 1.9;
    const axon = ctx.malla(new THREE.CylinderGeometry(0.045, 0.045, X1 - X0, 10), 'axon', g);
    axon.position.set((X0 + X1) / 2, Y, 0); axon.quaternion.copy(enX);
    const nodos = [], mielina = [];
    let x = X0 + 0.06;
    for (let i = 0; i < 6; i++) {
      mielina.push(M(V(x + 0.25, Y, 0), enX));
      x += 0.5;
      nodos.push(x + 0.04);
      x += 0.08;
    }
    ctx.instancias(new THREE.CylinderGeometry(0.11, 0.11, 0.48, 20), 'vaina_mielina', mielina, g);
    ctx.instancias(new THREE.TorusGeometry(0.052, 0.012, 6, 18), 'nodos_ranvier',
      nodos.slice(0, 5).map((nx) => M(V(nx, Y, 0), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2))), g);

    // Terminales axónicos
    const botones = [];
    [[0.32, 0.15], [0.12, 0.3], [-0.12, 0.28], [-0.32, 0.12]].forEach(([dy, dz]) => {
      const fin = V(X1 + 0.45, Y + dy, dz * 0.6);
      tubo([V(X1, Y, 0), V(X1 + 0.2, Y + dy * 0.5, dz * 0.3), fin], 0.022, 'terminales_axonicos', 10);
      botones.push(M(fin));
    });
    ctx.instancias(new THREE.SphereGeometry(0.07, 14, 10), 'terminales_axonicos', botones, g);

    // ---------- Detalle de la sinapsis ----------
    const B = V(3.8, 0.75, 0);
    ctx.malla(new THREE.SphereGeometry(0.62, 40, 28, Math.PI, Math.PI, 0, Math.PI * 0.82), 'boton_presinaptico', g).position.copy(B);
    const yZonaActiva = B.y - 0.62 * Math.cos(Math.PI * 0.18);
    const vesic = [];
    for (let i = 0; vesic.length < 22 && i < 400; i++) {
      const p = B.clone().add(V((azar() - 0.5) * 0.8, -0.1 - azar() * 0.35, -azar() * 0.45));
      if (p.distanceTo(B) < 0.5) vesic.push(M(p));
    }
    ctx.instancias(new THREE.SphereGeometry(0.045, 12, 8), 'vesiculas_sinapticas', vesic, g);
    const canales = [-0.3, -0.1, 0.1, 0.3].map((dx) => M(V(B.x + dx, yZonaActiva + 0.02, -0.05)));
    ctx.instancias(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10, 1, true), 'canales_calcio', canales, g);
    const yPost = yZonaActiva - 0.32;
    ctx.malla(new THREE.BoxGeometry(1.5, 0.1, 1.0), 'membrana_postsinaptica', g).position.set(B.x, yPost - 0.05, -0.1);
    const receptores = [-0.35, -0.18, 0, 0.18, 0.35].map((dx) => M(V(B.x + dx, yPost + 0.04, 0.05)));
    ctx.instancias(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), 'receptores', receptores, g);

    // Partículas
    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const P = {
      impulso: ctx.instancias(new THREE.IcosahedronGeometry(0.07, 1), 'impulso', vacio(1), g),
      calcio: ctx.instancias(new THREE.IcosahedronGeometry(0.03, 1), 'calcio', vacio(4), g),
      fusion: ctx.instancias(new THREE.SphereGeometry(0.045, 12, 8), 'vesiculas_sinapticas', vacio(3), g),
      nt: ctx.instancias(new THREE.IcosahedronGeometry(0.02, 0), 'neurotransmisor', vacio(15), g),
      sodioPost: ctx.instancias(new THREE.IcosahedronGeometry(0.025, 1), 'sodio_postsinaptico', vacio(5), g),
    };
    Object.values(P).forEach((m) => { m.count = 0; m.frustumCulled = false; });
    refsNeu = { V, P, S, Y, X1, nodos, B, yZonaActiva, yPost };
  },

  procesos: {
    potencial_accion(ctx) {
      const { V, P, S, Y, X1, nodos } = refsNeu;
      const puntos = [V(S.x + 0.5, Y, 0.12), ...nodos.slice(0, 5).map((x) => V(x, Y, 0.12)), V(X1, Y, 0.12), V(X1 + 0.45, Y + 0.32, 0.15)];
      ctx.anunciar('Conducción saltatoria: el impulso salta de un nodo de Ranvier al siguiente');
      return animarFlujos(ctx, [{ malla: P.impulso, rutas: [{ desfase: 0, puntos }], periodo: 3 }]);
    },

    sinapsis(ctx) {
      const { THREE } = ctx; const { V, P, B, yZonaActiva, yPost } = refsNeu;
      const T = 8;
      const calcio = [-0.3, -0.1, 0.1, 0.3].map((dx) => rutaEntrada(THREE, 2, T, V(B.x + dx * 1.5, yPost + 0.15, 0.25), V(B.x + dx, yZonaActiva + 0.1, 0)));
      const fusion = [-0.15, 0.05, 0.22].map((dx) => ({ desfase: 0,
        puntos: [...Array(3).fill(V(B.x + dx, yZonaActiva + 0.28, 0.02)), V(B.x + dx, yZonaActiva + 0.05, 0.02), ...Array(5).fill(V(B.x + dx, yZonaActiva + 0.05, 0.02))],
        escalas: [1, 1, 1, 1, 0, 0, 0, 0, 0] }));
      const nt = Array.from({ length: 15 }, (_, i) => {
        const dx = -0.2 + (i % 5) * 0.1;
        const r = rutaSalida(THREE, 4, T, V(B.x + dx * 0.6, yZonaActiva - 0.02, 0.02), V(B.x + dx * 1.6, yPost + 0.09, 0.05));
        r.escalas[T] = 0; return r;
      });
      const sodio = [-0.35, -0.18, 0, 0.18, 0.35].map((dx) => {
        const r = rutaSalida(THREE, 6, T, V(B.x + dx, yPost + 0.25, 0.2), V(B.x + dx, yPost - 0.4, 0.1));
        return r;
      });
      const PASOS = [[0, '1. Llega el potencial de acción al botón presináptico'], [0.2, '2. Se abren canales de Ca²⁺ y entra calcio'],
        [0.38, '3. Las vesículas se fusionan con la membrana (exocitosis)'], [0.5, '4. El neurotransmisor cruza la hendidura y se une a sus receptores'],
        [0.72, '5. Se abren canales en la membrana postsináptica: entra Na⁺ y se despolariza']];
      let paso = -1;
      return animarFlujos(ctx, [
        { malla: P.calcio, rutas: calcio, periodo: 9 }, { malla: P.fusion, rutas: fusion, periodo: 9 },
        { malla: P.nt, rutas: nt, periodo: 9 }, { malla: P.sodioPost, rutas: sodio, periodo: 9 },
      ], (t, s) => {
        const u = (s / 9) % 1; let k = 0;
        PASOS.forEach(([uf], i) => { if (u >= uf) k = i; });
        if (k !== paso) { paso = k; ctx.anunciar(PASOS[k][1]); }
      });
    },
  },

  liberar() { refsNeu = null; },
};

export default moduloNeurona;
