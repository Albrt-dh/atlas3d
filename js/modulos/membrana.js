// Módulo procedural: fragmento de membrana plasmática (modelo de mosaico fluido) con
// animaciones de transporte. Eje y: arriba = espacio extracelular, abajo = citoplasma.

import { crearAzar, animarFlujos } from '../animacion.js';

let refsMembrana = null; // referencias de la carga actual (se reemplazan en cada carga)

const moduloMembrana = {
  id: 'membrana',
  ambito: 'bioquimica',
  titulo: 'Transporte membranal',
  tipo: 'procedural',
  archivoDatos: './datos/membrana.json',
  camaraInicial: { pos: [0.4, 1.35, 3.7], objetivo: [0, -0.05, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const azar = crearAzar(11);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const grupo = new THREE.Group();
    ctx.raiz.add(grupo);
    const mat = (p, q, s) => new THREE.Matrix4().compose(p, q || new THREE.Quaternion(), s || V(1, 1, 1));

    // Posiciones de las proteínas y de la zona de endocitosis
    const P = {
      canal: V(-1.15, 0, 0.1), transportador: V(-0.45, 0, 0.1), acuaporina: V(0.25, 0, 0.1),
      bomba: V(0.95, 0, 0.1), pozo: V(0.55, 0, -0.62),
    };
    const huecos = [[P.canal, 0.2], [P.transportador, 0.24], [P.acuaporina, 0.18], [P.bomba, 0.26], [P.pozo, 0.34]];
    const libre = (x, z) => huecos.every(([c, r]) => Math.hypot(x - c.x, z - c.z) > r);

    // Bicapa de fosfolípidos: cabezas (esferas) y dos colas por lípido
    const cabezas = [], colas = [], colesterol = [];
    const Y_CAB = 0.27;
    for (let x = -1.8; x <= 1.801; x += 0.12) {
      for (let z = -1.0; z <= 1.001; z += 0.12) {
        for (const lado of [1, -1]) {
          const px = x + (azar() - 0.5) * 0.04, pz = z + (azar() - 0.5) * 0.04;
          if (!libre(px, pz)) continue;
          cabezas.push(mat(V(px, Y_CAB * lado, pz)));
          for (const d of [-0.018, 0.018]) {
            colas.push(mat(V(px + d, 0.125 * lado, pz), null, V(1, 1, 1)));
          }
          if (azar() < 0.12) colesterol.push(mat(V(px + 0.06, 0.15 * lado, pz + 0.06)));
        }
      }
    }
    ctx.instancias(new THREE.IcosahedronGeometry(0.05, 1), 'cabezas_polares', cabezas, grupo);
    ctx.instancias(new THREE.CylinderGeometry(0.012, 0.009, 0.19, 5, 1, true), 'colas_hidrofobicas', colas, grupo);
    ctx.instancias(new THREE.CapsuleGeometry(0.014, 0.07, 2, 6), 'colesterol', colesterol, grupo);

    // Canal iónico (5 subunidades alrededor de un poro)
    const geoSub = new THREE.CapsuleGeometry(0.045, 0.5, 4, 10);
    const subunidades = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      subunidades.push(mat(V(P.canal.x + Math.cos(a) * 0.1, 0, P.canal.z + Math.sin(a) * 0.1)));
    }
    ctx.instancias(geoSub, 'canal_ionico', subunidades, grupo);

    // Acuaporina (4 subunidades, poro estrecho)
    const subAcua = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      subAcua.push(mat(V(P.acuaporina.x + Math.cos(a) * 0.075, 0, P.acuaporina.z + Math.sin(a) * 0.075), null, V(0.85, 1, 0.85)));
    }
    ctx.instancias(geoSub.clone(), 'acuaporina', subAcua, grupo);

    // Transportador (acarreador): dos mitades que se balancean
    const geoMitad = new THREE.CapsuleGeometry(0.075, 0.42, 4, 12);
    const mitades = [-1, 1].map((lado) => {
      const pivote = new THREE.Group();
      pivote.position.set(P.transportador.x + lado * 0.085, 0, P.transportador.z);
      grupo.add(pivote);
      ctx.malla(lado < 0 ? geoMitad : geoMitad.clone(), 'transportador', pivote);
      return pivote;
    });

    // Bomba Na⁺/K⁺ ATPasa
    const bomba = ctx.malla(new THREE.CapsuleGeometry(0.16, 0.42, 6, 18), 'bomba_na_k', grupo);
    bomba.position.copy(P.bomba);
    bomba.scale.set(1, 1, 0.8);

    // Proteína periférica (cara interna)
    const periferica = ctx.malla(new THREE.SphereGeometry(0.11, 20, 14), 'proteina_periferica', grupo);
    periferica.position.set(-1.45, -0.38, 0.55);
    periferica.scale.set(1.4, 0.6, 1);

    // Glucocáliz: cadenas de azúcares sobre proteínas y lípidos de la cara externa
    const azucares = [];
    const bases = [V(P.bomba.x, 0.34, P.bomba.z), V(P.transportador.x, 0.3, P.transportador.z), V(-1.6, Y_CAB + 0.04, -0.5),
      V(-0.1, Y_CAB + 0.04, 0.75), V(1.5, Y_CAB + 0.04, 0.6), V(-0.8, Y_CAB + 0.04, 0.7), V(1.35, Y_CAB + 0.04, -0.3)];
    for (const b of bases) {
      const p = b.clone();
      for (let k = 0; k < 4; k++) {
        p.add(V((azar() - 0.5) * 0.05, 0.055, (azar() - 0.5) * 0.05));
        azucares.push(mat(p.clone()));
        if (k === 2) azucares.push(mat(p.clone().add(V(0.05, 0.03, 0))));
      }
    }
    ctx.instancias(new THREE.IcosahedronGeometry(0.024, 0), 'glucocaliz', azucares, grupo);

    // Zona de endocitosis / exocitosis: copa que se hunde + disco inferior + vesícula
    const perfil = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI / 2;
      perfil.push(new THREE.Vector2(0.001 + 0.3 * Math.sin(a), -Math.cos(a)));
    }
    const copa = ctx.malla(new THREE.LatheGeometry(perfil, 32), 'zona_vesicular', grupo);
    copa.position.set(P.pozo.x, Y_CAB, P.pozo.z);
    copa.scale.set(1, 0.02, 1);
    const disco = ctx.malla(new THREE.CircleGeometry(0.3, 32), 'zona_vesicular', grupo);
    disco.rotation.x = Math.PI / 2;
    disco.position.set(P.pozo.x, -Y_CAB, P.pozo.z);
    const vesicula = ctx.malla(new THREE.SphereGeometry(0.2, 24, 16), 'vesicula', grupo);
    vesicula.position.set(P.pozo.x, -0.9, P.pozo.z);
    vesicula.scale.setScalar(0.0001);

    // Partículas (empiezan sin instancias visibles; cada proceso las activa)
    const vacio = (n) => Array.from({ length: n }, () => new THREE.Matrix4());
    const geoPart = (r) => new THREE.IcosahedronGeometry(r, 1);
    const particulas = {
      gases: ctx.instancias(geoPart(0.03), 'gases', vacio(20), grupo),
      potasioCanal: ctx.instancias(geoPart(0.035), 'potasio', vacio(12), grupo),
      glucosa: ctx.instancias(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 6), 'glucosa', vacio(6), grupo),
      agua: ctx.instancias(geoPart(0.025), 'agua', vacio(22), grupo),
      sodio: ctx.instancias(geoPart(0.04), 'sodio', vacio(3), grupo),
      potasioBomba: ctx.instancias(geoPart(0.035), 'potasio', vacio(2), grupo),
      atp: ctx.instancias(new THREE.OctahedronGeometry(0.05, 0), 'atp', vacio(1), grupo),
      carga: ctx.instancias(geoPart(0.04), 'carga', vacio(5), grupo),
    };
    Object.values(particulas).forEach((m) => { m.count = 0; m.frustumCulled = false; });

    refsMembrana = { P, Y_CAB, mitades, bomba, copa, disco, vesicula, particulas, azar };
  },

  procesos: {
    difusion_simple(ctx) {
      const { THREE } = ctx; const { particulas, azar } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const rutas = Array.from({ length: 20 }, () => {
        const x = -1.25 + azar() * 1.2, z = -0.9 + azar() * 0.55, j = () => (azar() - 0.5) * 0.15;
        return { desfase: azar(), puntos: [V(x, 1.15, z), V(x + j(), 0.3, z + j()), V(x + j(), -0.3, z + j()), V(x + j() * 3, -1.15, z + j())] };
      });
      return animarFlujos(ctx, [{ malla: particulas.gases, rutas, periodo: 5 }]);
    },

    difusion_canal(ctx) {
      const { THREE } = ctx; const { particulas, azar, P } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const c = P.canal, r = () => (azar() - 0.5) * 0.7;
      const rutas = Array.from({ length: 12 }, () => ({ desfase: azar(),
        puntos: [V(c.x + r(), -1.15, c.z + r()), V(c.x, -0.42, c.z), V(c.x, 0.42, c.z), V(c.x + r(), 1.15, c.z + r())] }));
      return animarFlujos(ctx, [{ malla: particulas.potasioCanal, rutas, periodo: 3.5 }]);
    },

    difusion_acarreador(ctx) {
      const { THREE } = ctx; const { particulas, azar, P, mitades } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const c = P.transportador, r = () => (azar() - 0.5) * 0.6;
      const rutas = Array.from({ length: 6 }, (_, i) => ({ desfase: i / 6,
        puntos: [V(c.x + r(), 1.15, c.z + r()), V(c.x, 0.42, c.z), V(c.x, 0, c.z), V(c.x, -0.42, c.z), V(c.x + r(), -1.15, c.z + r())] }));
      const parar = animarFlujos(ctx, [{ malla: particulas.glucosa, rutas, periodo: 6 }], (t, s) => {
        const a = Math.sin(s * Math.PI * 2 / 1) * 0.18; // cambio de conformación
        mitades[0].rotation.z = a; mitades[1].rotation.z = -a;
      });
      return () => { parar(); mitades.forEach((m) => { m.rotation.z = 0; }); };
    },

    osmosis(ctx) {
      const { THREE } = ctx; const { particulas, azar, P } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const c = P.acuaporina, r = () => (azar() - 0.5) * 0.8;
      const rutas = Array.from({ length: 22 }, () => ({ desfase: azar(),
        puntos: [V(c.x + r(), 1.15, c.z + r()), V(c.x, 0.42, c.z), V(c.x, -0.42, c.z), V(c.x + r(), -1.15, c.z + r())] }));
      return animarFlujos(ctx, [{ malla: particulas.agua, rutas, periodo: 3 }]);
    },

    bomba_na_k(ctx) {
      const { THREE } = ctx; const { particulas, P, bomba } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const b = P.bomba;
      const sodio = [-0.07, 0, 0.07].map((o) => ({ desfase: 0,
        puntos: [V(b.x + o * 4, -1.1, b.z + o * 3), V(b.x + o, -0.14, b.z), V(b.x + o, -0.14, b.z), V(b.x + o, 0.14, b.z), V(b.x + o * 5, 1.1, b.z - o * 3)] }));
      const potasio = [-0.05, 0.05].map((o) => ({ desfase: 0,
        puntos: [V(b.x + o * 6, 1.1, b.z + o * 3), V(b.x + o * 6, 1.1, b.z + o * 3), V(b.x + o, 0.14, b.z), V(b.x + o, -0.14, b.z), V(b.x + o * 6, -1.1, b.z - o * 4)] }));
      const atp = [{ desfase: 0, puntos: [V(b.x + 0.35, -1.0, b.z + 0.3), V(b.x, -0.42, b.z), V(b.x, -0.42, b.z), V(b.x + 0.4, -1.0, b.z - 0.2), V(b.x + 0.4, -1.0, b.z - 0.2)] }];
      const parar = animarFlujos(ctx, [
        { malla: particulas.sodio, rutas: sodio, periodo: 5 },
        { malla: particulas.potasioBomba, rutas: potasio, periodo: 5 },
        { malla: particulas.atp, rutas: atp, periodo: 5 },
      ], (t, s) => {
        const u = (s / 5) % 1;
        const pulso = u > 0.45 && u < 0.6 ? Math.sin((u - 0.45) / 0.15 * Math.PI) : 0;
        bomba.scale.set(1 + pulso * 0.1, 1 - pulso * 0.06, 0.8 + pulso * 0.08);
      });
      return () => { parar(); bomba.scale.set(1, 1, 0.8); };
    },

    endocitosis(ctx) { return animarVesicula(ctx, false); },
    exocitosis(ctx) { return animarVesicula(ctx, true); },
  },

  liberar() { refsMembrana = null; },
};

// Endocitosis (salida = false) o exocitosis (salida = true)
function animarVesicula(ctx, salida) {
  const { THREE } = ctx;
  const { P, Y_CAB, copa, disco, vesicula, particulas } = refsMembrana;
  const carga = particulas.carga;
  const offs = [[0, 0], [0.07, 0.03], [-0.06, 0.05], [0.02, -0.07], [-0.04, -0.04]];
  const m = new THREE.Matrix4();
  carga.count = offs.length;
  const t0 = performance.now(), PERIODO = 7;
  const tramo = (u, a, b) => Math.min(1, Math.max(0, (u - a) / (b - a)));
  const suave = (k) => k * k * (3 - 2 * k);
  const parar = ctx.motor.animar((t) => {
    let u = (((t - t0) / 1000 / PERIODO) % 1);
    if (salida) u = 1 - u; // la exocitosis es la endocitosis al revés
    let yCarga, prof, yVes, verVes;
    if (u < 0.15) { prof = 0.02; yCarga = 1.1 - suave(tramo(u, 0, 0.15)) * 0.75; verVes = false; }
    else if (u < 0.55) { const k = suave(tramo(u, 0.15, 0.55)); prof = 0.02 + k * 0.62; yCarga = 0.35 - k * 0.52; verVes = false; }
    else { const k = suave(tramo(u, 0.6, 1)); prof = 0.02; verVes = true; yVes = -0.28 - k * 0.8; yCarga = yVes; }
    copa.scale.y = verVes ? 0.02 : prof;
    disco.scale.setScalar(u > 0.15 && u < 0.62 ? 0.0001 : 1);
    vesicula.scale.setScalar(verVes ? 1 : 0.0001);
    vesicula.position.y = verVes ? yVes : -0.9;
    offs.forEach(([dx, dz], i) => {
      m.makeTranslation(P.pozo.x + dx, yCarga + (i % 2) * 0.03, P.pozo.z + dz);
      carga.setMatrixAt(i, m);
    });
    carga.instanceMatrix.needsUpdate = true;
    carga.computeBoundingSphere();
    return true;
  });
  return () => {
    parar();
    carga.count = 0; copa.scale.y = 0.02; disco.scale.setScalar(1); vesicula.scale.setScalar(0.0001);
    ctx.pedirRender();
  };
}

export default moduloMembrana;
