// Módulo procedural: fragmento de membrana plasmática (modelo de mosaico fluido) con
// animaciones de transporte. Eje y: arriba = espacio extracelular, abajo = citoplasma.

import { crearAzar, animarFlujos } from '../animacion.js';
import { cargarModelo } from '../recursos.js';

let refsMembrana = null; // referencias de la carga actual (se reemplazan en cada carga)

const moduloMembrana = {
  id: 'membrana',
  ambito: 'bioquimica',
  titulo: 'Transporte membranal',
  tipo: 'procedural',
  archivoDatos: './datos/membrana.json',
  camaraInicial: { pos: [0.5, 1.5, 6.2], objetivo: [0, -0.2, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const azar = crearAzar(11);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const grupo = new THREE.Group();
    ctx.raiz.add(grupo);
    const mat = (p, q, s) => new THREE.Matrix4().compose(p, q || new THREE.Quaternion(), s || V(1, 1, 1));

    // Posiciones de las proteínas y de la zona de endocitosis (la bicapa mide 5.4 × 2 unidades)
    const P = {
      canal: V(-2.3, 0, 0.1), transportador: V(-1.4, 0, 0.1), acuaporina: V(-0.3, 0, 0.1),
      bomba: V(1.05, 0, 0.1), pozo: V(2.3, 0, -0.62),
    };
    const huecos = [[P.canal, 0.47], [P.transportador, 0.43], [P.acuaporina, 0.5], [P.bomba, 0.62], [P.pozo, 0.34]];
    const libre = (x, z) => huecos.every(([c, r]) => Math.hypot(x - c.x, z - c.z) > r);

    // Bicapa de fosfolípidos: una cabeza polar y dos colas onduladas (la de la derecha con un doblez cis).
    // Cada instancia es un fosfolípido; los de la cara interna se voltean 180°.
    const cabezas = [], colas = [], colesterol = [];
    const Y_CAB = 0.27, X_MIN = -2.85, X_MAX = 2.85;
    const geoCola = (() => {
      const mk = (dx, kink) => {
        const pts = [];
        for (let i = 0; i <= 4; i++) {
          const t = i / 4, ondula = Math.sin(t * Math.PI * 2 + dx * 40) * 0.008;
          const doblez = kink && t > 0.45 ? 0.016 * Math.min(1, (t - 0.45) / 0.15) : 0;
          pts.push(new THREE.Vector3(dx + ondula + doblez, -t * 0.2, ondula * 0.6));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 4, 0.0105, 4, false);
      };
      const a = mk(-0.018, false), b = mk(0.018, true);
      const pos = [], idx = []; let off = 0;
      for (const g of [a, b]) {
        pos.push(...g.attributes.position.array); idx.push(...Array.from(g.index.array, (k) => k + off));
        off += g.attributes.position.count; g.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    })();
    const giro = new THREE.Quaternion(), vArriba = V(0, 1, 0), vX = V(1, 0, 0);
    for (let x = X_MIN; x <= X_MAX + 0.001; x += 0.135) {
      for (let z = -1.0; z <= 1.001; z += 0.135) {
        for (const lado of [1, -1]) {
          const px = x + (azar() - 0.5) * 0.04, pz = z + (azar() - 0.5) * 0.04;
          if (!libre(px, pz)) continue;
          const a = azar() * Math.PI * 2, tilt = (azar() - 0.5) * 0.16;
          // La cola apunta hacia el centro (-y local para lado = 1); en la cara interna se voltea con una rotación en x.
          giro.setFromAxisAngle(vArriba, a);
          const qx = new THREE.Quaternion().setFromAxisAngle(vX, (lado === 1 ? 0 : Math.PI) + tilt);
          const q = giro.clone().multiply(qx);
          cabezas.push(mat(V(px, Y_CAB * lado, pz), q));
          colas.push(mat(V(px, (Y_CAB - 0.04) * lado, pz), q));
          if (azar() < 0.12) colesterol.push(mat(V(px + 0.06, 0.15 * lado, pz + 0.06)));
        }
      }
    }
    ctx.instancias(new THREE.SphereGeometry(0.052, 6, 4), 'cabezas_polares', cabezas, grupo);
    ctx.instancias(geoCola, 'colas_hidrofobicas', colas, grupo);
    ctx.instancias(new THREE.CapsuleGeometry(0.014, 0.07, 2, 6), 'colesterol', colesterol, grupo);

    // Proteínas reales (Protein Data Bank): canal de K⁺ KcsA (1BL8), transportador GLUT1 (4PYP), acuaporina 1 (1J4N) y bomba Na⁺/K⁺ (3B8E).
    // Superficies moleculares generadas con herramientas/generar_proteinas.py; y = 0 es el centro de la bicapa.
    const prot = await cargarModelo('./modelos/membrana_proteinas.glb');
    const aGrupo = new THREE.Group(), bomba = new THREE.Group(), kGrupo = new THREE.Group();
    aGrupo.position.copy(P.acuaporina); bomba.position.copy(P.bomba); kGrupo.position.copy(P.canal);
    grupo.add(aGrupo, bomba, kGrupo);
    // GLUT1: dominio N y dominio C giran en sentido contrario alrededor del centro de la proteína (modelo del balancín)
    const mitades = [new THREE.Group(), new THREE.Group()];
    mitades.forEach((m) => { m.position.copy(P.transportador); grupo.add(m); });
    const piezas = [], poros = [];
    let sx = 0, sz = 0, sn = 0;
    prot.traverse((o) => { if (o.isMesh) piezas.push(o); });
    for (const o of piezas) {
      const aqp = o.name.startsWith('aqp1'), kcsa = o.name.startsWith('kcsa'), glut = o.name.startsWith('glut1');
      const id = aqp ? 'acuaporina' : kcsa ? 'canal_ionico' : glut ? 'transportador'
        : o.name === 'bomba_alfa' ? 'bomba_na_k' : o.name === 'bomba_beta' ? 'bomba_beta' : 'bomba_gamma';
      const geo = o.geometry.clone(); geo.computeVertexNormals();
      ctx.malla(geo, id, aqp ? aGrupo : kcsa ? kGrupo : glut ? mitades[o.name === 'glut1_n' ? 0 : 1] : bomba);
      if (o.name.startsWith('aqp1')) { // cada monómero tiene su propio poro de agua, cerca de su centro
        geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(new THREE.Vector3());
        poros.push(V(P.acuaporina.x + c.x, 0, P.acuaporina.z + c.z));
      } else if (o.name === 'bomba_alfa') { // eje de iones: centro de la subunidad α a la altura de la bicapa
        const a = geo.attributes.position;
        for (let i = 0; i < a.count; i++) if (Math.abs(a.getY(i)) < 0.17) { sx += a.getX(i); sz += a.getZ(i); sn++; }
      }
    }
    const ejeBomba = V(P.bomba.x + sx / Math.max(sn, 1), 0, P.bomba.z + sz / Math.max(sn, 1));
    prot.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });

    // Proteína periférica (cara interna)
    const periferica = ctx.malla(new THREE.SphereGeometry(0.11, 20, 14), 'proteina_periferica', grupo);
    periferica.position.set(-0.3, -0.38, -0.7);
    periferica.scale.set(1.4, 0.6, 1);

    // Glucocáliz: cadenas de azúcares sobre proteínas y lípidos de la cara externa
    const azucares = [];
    const bases = [V(ejeBomba.x, 0.5, ejeBomba.z), V(P.transportador.x, 0.45, P.transportador.z), V(-2.6, Y_CAB + 0.04, -0.5),
      V(-0.1, Y_CAB + 0.04, 0.85), V(2.2, Y_CAB + 0.04, 0.7), V(-1.0, Y_CAB + 0.04, 0.8), V(1.9, Y_CAB + 0.04, -0.3)];
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

    refsMembrana = { P, Y_CAB, poros, ejeBomba, mitades, bomba, copa, disco, vesicula, particulas, azar };
  },

  procesos: {
    difusion_simple(ctx) {
      const { THREE } = ctx; const { particulas, azar } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const rutas = Array.from({ length: 20 }, () => {
        const x = -1.1 + azar() * 0.9, z = -0.95 + azar() * 0.4, j = () => (azar() - 0.5) * 0.15;
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
      const { THREE } = ctx; const { particulas, azar, poros } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const r = () => (azar() - 0.5) * 0.5;
      const rutas = Array.from({ length: 22 }, (_, i) => { // el agua cruza en fila por el poro de cada monómero
        const c = poros[i % poros.length];
        return { desfase: azar(), puntos: [V(c.x + r(), 1.15, c.z + r()), V(c.x, 0.45, c.z), V(c.x, -0.45, c.z), V(c.x + r(), -1.15, c.z + r())] };
      });
      return animarFlujos(ctx, [{ malla: particulas.agua, rutas, periodo: 3 }]);
    },

    bomba_na_k(ctx) {
      const { THREE } = ctx; const { particulas, ejeBomba, bomba } = refsMembrana; const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const b = ejeBomba;
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
        bomba.scale.set(1 + pulso * 0.05, 1 - pulso * 0.03, 1 + pulso * 0.04);
      });
      const ids = ['bomba_na_k', 'bomba_beta', 'bomba_gamma'];
      const ya = ids.map((i) => ctx.motor.esTransparente(i));
      ids.forEach((i, k) => { if (!ya[k]) ctx.motor.setTransparente(i); }); // se ve a los iones pasar por dentro de la proteína
      return () => { parar(); bomba.scale.set(1, 1, 1); ids.forEach((i, k) => { if (!ya[k] && ctx.motor.esTransparente(i)) ctx.motor.setTransparente(i); }); };
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
