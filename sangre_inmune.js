// Módulo procedural: células de la sangre (arriba), anticuerpo IgG (derecha) y dos procesos de
// defensa: fagocitosis por un macrófago y neutralización de un virus por anticuerpos.
import { crearAzar, animarFlujos, rutaSalida } from '../animacion.js';

let refsSan = null;

const moduloSangre = {
  id: 'sangre_inmune',
  ambito: 'anatomia',
  titulo: 'Células sanguíneas y anticuerpos',
  tipo: 'procedural',
  archivoDatos: './datos/sangre_inmune.json',
  camaraInicial: { pos: [0, 0.2, 8.2], objetivo: [0, -0.1, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const azar = crearAzar(31);
    const g = new THREE.Group(); ctx.raiz.add(g);
    const M = (p, s = V(1, 1, 1), q = new THREE.Quaternion()) => new THREE.Matrix4().compose(p, q, s);
    const media = (r, id, p) => { const o = ctx.malla(new THREE.SphereGeometry(r, 32, 22, Math.PI, Math.PI), id, g); o.position.copy(p); return o; };
    const esfera = (r, id, p, s) => { const o = ctx.malla(new THREE.SphereGeometry(r, 18, 12), id, g); o.position.copy(p); if (s) o.scale.set(...s); return o; };
    const Y = 1.15;

    // Eritrocitos: disco bicóncavo (perfil de revolución)
    const perfil = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, r = 0.001 + t * 0.26; perfil.push(new THREE.Vector2(r, 0.02 + 0.07 * Math.pow(t, 2) * (1 - Math.pow(t, 6)) * 1.6)); }
    for (let i = 16; i >= 0; i--) { const t = i / 16, r = 0.001 + t * 0.26; perfil.push(new THREE.Vector2(r, -(0.02 + 0.07 * Math.pow(t, 2) * (1 - Math.pow(t, 6)) * 1.6))); }
    const geoEri = new THREE.LatheGeometry(perfil, 32);
    ctx.instancias(geoEri, 'eritrocito', [[-4.0, Y + 0.25, 0.4], [-3.65, Y - 0.15, 1.1], [-4.15, Y - 0.35, -0.3]].map(([x, y, a]) =>
      M(V(x, y), V(1, 1, 1), new THREE.Quaternion().setFromEuler(new THREE.Euler(a + 1.2, a, 0)))), g);

    // Leucocitos en corte (mitad trasera) con sus núcleos y gránulos
    const N = V(-2.75, Y), E = V(-1.75, Y), B = V(-0.75, Y), L = V(0.2, Y), MO = V(1.25, Y);
    media(0.33, 'neutrofilo', N);
    [[-0.12, 0.1], [0, 0.14], [0.11, 0.04], [0.06, -0.1]].forEach(([dx, dy]) => esfera(0.075, 'nucleo_neutrofilo', N.clone().add(V(dx, dy, -0.1))));
    media(0.34, 'eosinofilo', E);
    [-0.1, 0.1].forEach((dx) => esfera(0.1, 'nucleo_eosinofilo', E.clone().add(V(dx, 0.05, -0.1))));
    const granE = [], granB = [];
    for (let i = 0; i < 26; i++) { const a = azar() * Math.PI * 2, r = 0.12 + azar() * 0.15; granE.push(M(E.clone().add(V(Math.cos(a) * r, Math.sin(a) * r, -0.05 - azar() * 0.15)))); }
    for (let i = 0; i < 34; i++) { const a = azar() * Math.PI * 2, r = 0.05 + azar() * 0.22; granB.push(M(B.clone().add(V(Math.cos(a) * r, Math.sin(a) * r, -0.02 - azar() * 0.15)))); }
    ctx.instancias(new THREE.SphereGeometry(0.025, 8, 6), 'granulos_eosinofilo', granE, g);
    media(0.32, 'basofilo', B);
    esfera(0.11, 'nucleo_basofilo', B.clone().add(V(0, 0, -0.14)), [1.3, 0.8, 1]);
    ctx.instancias(new THREE.SphereGeometry(0.03, 8, 6), 'granulos_basofilo', granB, g);
    media(0.28, 'linfocito', L);
    esfera(0.23, 'nucleo_linfocito', L.clone().add(V(0.02, 0, -0.06)), [1, 1, 0.6]);
    media(0.42, 'monocito', MO);
    const rinon = ctx.malla(new THREE.TorusGeometry(0.17, 0.08, 10, 24, Math.PI * 1.3), 'nucleo_monocito', g);
    rinon.position.copy(MO).add(V(0, 0, -0.12)); rinon.rotation.z = -0.4;
    ctx.instancias(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 10), 'plaquetas', [[2.05, Y + 0.15], [2.25, Y - 0.05], [2.1, Y - 0.25]].map(([x, y]) =>
      M(V(x, y), V(1, 1, 1), new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, azar(), 0)))), g);

    // Anticuerpo IgG: dos cadenas pesadas y dos ligeras en forma de Y
    const A = V(3.3, -0.55);
    const capsula = (r, a, b, id) => {
      const o = ctx.malla(new THREE.CapsuleGeometry(r, Math.max(a.distanceTo(b) - 2 * r, 0.01), 4, 10), id, g);
      o.position.copy(a).lerp(b, 0.5); o.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); return o;
    };
    const bisagra = A.clone().add(V(0, 0.35));
    for (const s of [-1, 1]) {
      capsula(0.075, A.clone().add(V(s * 0.085, -0.7)), bisagra.clone().add(V(s * 0.085, 0)), 'cadenas_pesadas');
      const dir = V(s * 0.72, 0.72).normalize();
      const finP = bisagra.clone().addScaledVector(dir, 0.85);
      capsula(0.075, bisagra.clone().add(V(s * 0.06, 0.04)), finP, 'cadenas_pesadas');
      const fuera = V(dir.y * s, -dir.x * s).multiplyScalar(-0.15);
      capsula(0.065, bisagra.clone().addScaledVector(dir, 0.2).add(fuera), finP.clone().add(fuera), 'cadenas_ligeras');
      esfera(0.09, 'sitio_union', finP.clone().addScaledVector(dir, 0.1).add(fuera.clone().multiplyScalar(0.5)));
      capsula(0.012, bisagra.clone().addScaledVector(dir, 0.55), bisagra.clone().addScaledVector(dir, 0.55).add(fuera), 'puentes_disulfuro');
    }
    esfera(0.07, 'bisagra', bisagra);
    capsula(0.012, bisagra.clone().add(V(-0.085, -0.08)), bisagra.clone().add(V(0.085, -0.08)), 'puentes_disulfuro');

    // Macrófago, bacterias y virus para los procesos
    const MA = V(-2.3, -1.3);
    media(0.6, 'macrofago', MA).scale.set(1.25, 0.85, 1);
    esfera(0.16, 'nucleo_macrofago', MA.clone().add(V(-0.25, 0.05, -0.2)), [1.3, 0.8, 1]);
    const lis = [];
    for (let i = 0; i < 6; i++) lis.push(M(MA.clone().add(V(0.1 + azar() * 0.35, (azar() - 0.5) * 0.4, -0.2))));
    ctx.instancias(new THREE.SphereGeometry(0.045, 10, 8), 'lisosomas', lis, g);
    const VI = V(0.6, -1.3);
    ctx.malla(new THREE.IcosahedronGeometry(0.24, 0), 'virus', g).position.copy(VI);
    const espic = [];
    for (let i = 0; i < 20; i++) {
      const d = V(azar() - 0.5, azar() - 0.5, azar() - 0.5).normalize();
      espic.push(M(VI.clone().addScaledVector(d, 0.29), V(1, 1, 1), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d)));
    }
    ctx.instancias(new THREE.CylinderGeometry(0.025, 0.01, 0.1, 5), 'antigenos', espic, g);

    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const P = {
      bacterias: ctx.instancias(new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), 'bacterias', vacio(4), g),
      anticuerpos: ctx.instancias(new THREE.TetrahedronGeometry(0.06, 0), 'anticuerpos_libres', vacio(10), g),
    };
    Object.values(P).forEach((m) => { m.count = 0; m.frustumCulled = false; });
    refsSan = { V, P, MA, VI, espic, azar };
  },

  procesos: {
    fagocitosis(ctx) {
      const { V, P, MA, azar } = refsSan;
      const rutas = Array.from({ length: 4 }, (_, i) => {
        const a = Math.PI * (0.1 + i * 0.27), ini = MA.clone().add(V(Math.cos(a) * 1.4 + 0.6, Math.sin(a) * 0.8 - 0.1, 0.25));
        const borde = MA.clone().add(V(Math.cos(a) * 0.72, Math.sin(a) * 0.5, 0.1));
        const dentro = MA.clone().add(V(0.15 + (azar() - 0.5) * 0.2, (azar() - 0.5) * 0.3, -0.1));
        return { desfase: 0, puntos: [ini, ini.clone().lerp(borde, 0.5), borde, borde, dentro, dentro, dentro], escalas: [1, 1, 1, 1, 0.9, 0.5, 0] };
      });
      const PASOS = [[0, '1. Quimiotaxis: el fagocito se dirige hacia las bacterias'], [0.28, '2. Adherencia: anticuerpos y complemento marcan a la bacteria (opsonización)'],
        [0.5, '3. Ingestión: la membrana la rodea y forma un fagosoma'], [0.7, '4. Digestión: los lisosomas se fusionan y forman el fagolisosoma']];
      let paso = -1;
      return animarFlujos(ctx, [{ malla: P.bacterias, rutas, periodo: 9 }], (t, s) => {
        const u = (s / 9) % 1; let k = 0; PASOS.forEach(([uf], i) => { if (u >= uf) k = i; });
        if (k !== paso) { paso = k; ctx.anunciar(PASOS[k][1]); }
      });
    },

    neutralizacion(ctx) {
      const { THREE } = ctx; const { V, P, VI, espic, azar } = refsSan;
      const T = 6;
      const rutas = Array.from({ length: 10 }, (_, i) => {
        const destino = new THREE.Vector3().setFromMatrixPosition(espic[i * 2]).sub(VI).multiplyScalar(1.3).add(VI);
        const r = rutaSalida(THREE, 0, T, VI.clone().add(V((azar() - 0.5) * 2.4, 0.9 + azar() * 0.4, 0.3)), destino);
        r.puntos = r.puntos.map((p, j) => (j >= 4 ? destino.clone() : p));
        return r;
      });
      ctx.anunciar('Los anticuerpos cubren los antígenos del virus y le impiden entrar a la célula');
      return animarFlujos(ctx, [{ malla: P.anticuerpos, rutas, periodo: 6 }]);
    },
  },

  liberar() { refsSan = null; },
};

export default moduloSangre;
