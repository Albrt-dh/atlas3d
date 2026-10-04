// Módulo procedural: sarcómero (unidad contráctil del músculo esquelético) con filamentos
// gruesos de miosina, delgados de actina (con tropomiosina y troponina), discos Z, línea M y titina.
import { animarFlujos, rutaSalida } from '../animacion.js';

let refsSar = null;
const Z_RELAJADO = 1.6, Z_CONTRAIDO = 1.15, MIOSINA = 0.8;

const moduloSarcomero = {
  id: 'sarcomero',
  ambito: 'anatomia',
  titulo: 'Sarcómero y contracción',
  tipo: 'procedural',
  archivoDatos: './datos/sarcomero.json',
  camaraInicial: { pos: [0.6, 1.2, 4.6], objetivo: [0, 0, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const g = new THREE.Group(); ctx.raiz.add(g);
    const enX = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2);
    const M = (p, q, s) => new THREE.Matrix4().compose(p, q || new THREE.Quaternion(), s || V(1, 1, 1));

    // Posiciones en el corte transversal: gruesos en rejilla 3×3, delgados entre ellos
    const gruesos = [], delgados = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) gruesos.push([i * 0.32, j * 0.32]);
    for (let i = -1.5; i <= 1.5; i += 1) for (let j = -1.5; j <= 1.5; j += 1) delgados.push([i * 0.32, j * 0.32]);

    // Discos Z (cada uno se lleva sus filamentos delgados al moverse)
    const lados = [-1, 1].map((s) => {
      const grupo = new THREE.Group(); grupo.position.x = s * Z_RELAJADO; g.add(grupo);
      ctx.malla(new THREE.BoxGeometry(0.04, 1.25, 1.25), 'disco_z', grupo);
      const largo = 1.0, cx = -s * largo / 2;
      ctx.instancias(new THREE.CylinderGeometry(0.018, 0.018, largo, 6), 'actina',
        delgados.map(([y, z]) => M(V(cx, y, z), enX)), grupo);
      ctx.instancias(new THREE.CylinderGeometry(0.006, 0.006, largo, 4), 'tropomiosina',
        delgados.map(([y, z]) => M(V(cx, y + 0.024, z), enX)), grupo);
      const tropo = [];
      delgados.forEach(([y, z]) => { for (let k = 1; k <= 4; k++) tropo.push(M(V(-s * k * 0.22, y + 0.028, z))); });
      ctx.instancias(new THREE.IcosahedronGeometry(0.018, 0), 'troponina', tropo, grupo);
      return grupo;
    });

    // Filamentos gruesos con cabezas de miosina y línea M
    ctx.instancias(new THREE.CylinderGeometry(0.035, 0.035, MIOSINA * 2, 8), 'miosina', gruesos.map(([y, z]) => M(V(0, y, z), enX)), g);
    const cabezas = [];
    gruesos.forEach(([y, z]) => {
      for (let x = 0.18; x <= MIOSINA - 0.04; x += 0.1) for (const s of [-1, 1]) for (const k of [0, 1]) {
        const a = k * Math.PI + (x * 7);
        cabezas.push({ base: V(s * x, y + Math.cos(a) * 0.05, z + Math.sin(a) * 0.05), s, a });
      }
    });
    const geoCabeza = new THREE.CapsuleGeometry(0.014, 0.05, 2, 6);
    const mallaCabezas = ctx.instancias(geoCabeza, 'cabezas_miosina', cabezas.map(() => new THREE.Matrix4()), g);
    ctx.malla(new THREE.BoxGeometry(0.03, 1.0, 1.0), 'linea_m', g);
    const titina = ctx.instancias(new THREE.CylinderGeometry(0.005, 0.005, 1, 4), 'titina',
      gruesos.flatMap(() => [new THREE.Matrix4(), new THREE.Matrix4()]), g);

    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const calcio = ctx.instancias(new THREE.IcosahedronGeometry(0.025, 1), 'calcio', vacio(16), g);
    calcio.count = 0; calcio.frustumCulled = false;

    refsSar = { THREE, V, lados, gruesos, delgados, cabezas, mallaCabezas, titina, calcio, enX, m: new THREE.Matrix4(), q: new THREE.Quaternion() };
    colocar(Z_RELAJADO, 0);
  },

  procesos: {
    contraccion(ctx) {
      const { THREE, V, calcio, delgados } = refsSar;
      const T = 8;
      const rutas = Array.from({ length: 16 }, (_, i) => {
        const [y, z] = delgados[i % delgados.length];
        const x = (i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.12);
        const r = rutaSalida(THREE, 0, T, V(x, 0.95, z), V(x, y + 0.045, z));
        r.escalas = [1, 1, 1, 1, 1, 1, 1, 0.6, 0];
        return r;
      });
      const PASOS = [[0, '1. El impulso nervioso hace que el retículo sarcoplásmico libere Ca²⁺'],
        [0.2, '2. El Ca²⁺ se une a la troponina y la tropomiosina descubre los sitios de unión de la actina'],
        [0.35, '3. Las cabezas de miosina forman puentes cruzados y jalan la actina hacia la línea M'],
        [0.65, '4. Las bandas I y la zona H se acortan; la banda A no cambia'],
        [0.82, '5. Sin Ca²⁺ y con ATP, la miosina se suelta y el sarcómero se relaja']];
      let paso = -1;
      const parar = animarFlujos(ctx, [{ malla: calcio, rutas, periodo: 10 }], (t, s) => {
        const u = (s / 10) % 1;
        const suave = (k) => k * k * (3 - 2 * k);
        const f = u < 0.35 ? 0 : u < 0.65 ? suave((u - 0.35) / 0.3) : u < 0.82 ? 1 : 1 - suave((u - 0.82) / 0.18);
        colocar(Z_RELAJADO - (Z_RELAJADO - Z_CONTRAIDO) * f, u >= 0.35 && u < 0.82 ? s : 0);
        let k = 0; PASOS.forEach(([uf], i) => { if (u >= uf) k = i; });
        if (k !== paso) { paso = k; ctx.anunciar(PASOS[k][1]); }
      });
      return () => { parar(); colocar(Z_RELAJADO, 0); ctx.pedirRender(); };
    },
  },

  liberar() { refsSar = null; },
};

// Coloca los discos Z en ±zx y las cabezas de miosina con su golpe de fuerza (fase en segundos).
function colocar(zx, fase) {
  const { V, lados, gruesos, cabezas, mallaCabezas, titina, m, q, enX, THREE } = refsSar;
  lados[0].position.x = -zx; lados[1].position.x = zx;
  const eje = V(1, 0, 0);
  cabezas.forEach((c, i) => {
    const golpe = fase ? Math.sin(fase * 6 + c.base.x * 9) * 0.35 : 0;
    const radial = V(0, Math.cos(c.a), Math.sin(c.a));
    const dir = radial.clone().multiplyScalar(0.9).addScaledVector(eje, c.s * (0.45 + golpe)).normalize();
    q.setFromUnitVectors(V(0, 1, 0), dir);
    m.compose(c.base.clone().addScaledVector(dir, 0.03), q, V(1, 1, 1));
    mallaCabezas.setMatrixAt(i, m);
  });
  mallaCabezas.instanceMatrix.needsUpdate = true;
  let k = 0;
  gruesos.forEach(([y, z]) => {
    for (const s of [-1, 1]) {
      const largo = zx - MIOSINA;
      m.compose(V(s * (MIOSINA + largo / 2), y, z), enX, V(1, largo, 1));
      titina.setMatrixAt(k++, m);
    }
  });
  titina.instanceMatrix.needsUpdate = true;
  titina.computeBoundingSphere(); mallaCabezas.computeBoundingSphere();
}

export default moduloSarcomero;
