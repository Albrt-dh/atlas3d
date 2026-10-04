// Módulo procedural: genética. De izquierda a derecha: doble hélice de ADN, nucleosomas,
// cromosoma metafásico con sus partes y una célula (2n = 4) que realiza mitosis o meiosis.
// Cromosomas maternos en un color y paternos en otro, para seguir a los homólogos.
import { crearAzar } from '../animacion.js';

let refsGen = null;

// Interpola entre fotogramas clave [[u, {campos}], ...] con transición suave.
function claveEn(kfs, u) {
  if (u <= kfs[0][0]) return kfs[0][1];
  for (let i = 1; i < kfs.length; i++) {
    if (u <= kfs[i][0]) {
      const [u0, a] = kfs[i - 1], [u1, b] = kfs[i];
      let f = (u - u0) / (u1 - u0 || 1);
      f = f * f * (3 - 2 * f);
      const r = {};
      for (const k in a) r[k] = a[k] + (b[k] - a[k]) * f;
      return r;
    }
  }
  return kfs[kfs.length - 1][1];
}

// Posiciones de interfase (dentro del núcleo) y de metafase mitótica para los 4 cromosomas
const INTERFASE = [{ x: -0.3, y: 0.25, ang: 0.6 }, { x: 0.25, y: 0.3, ang: -0.9 }, { x: -0.2, y: -0.3, ang: -0.4 }, { x: 0.3, y: -0.22, ang: 1.1 }];
const Y_METAFASE = [0.58, 0.12, -0.28, -0.62];

function claveInterfase(c, s) {
  const I = INTERFASE[c], sg = s ? 1 : -1;
  return { x: I.x + Math.cos(I.ang) * 0.03 * sg, y: I.y + Math.sin(I.ang) * 0.03 * sg, ang: I.ang,
    sx: 0.55, sy: 1.3, f: 0, px: sg * 0.08, py: 0.85, tip: 0 };
}

function clavesMitosis(c, s) {
  const sg = s ? 1 : -1, I = INTERFASE[c];
  const base = claveInterfase(c, s);
  const pro = { ...base, x: I.x + Math.cos(I.ang) * 0.045 * sg, y: I.y + Math.sin(I.ang) * 0.045 * sg, sx: 1, sy: 1, px: sg * 0.5, py: 0.5 };
  const met = { x: sg * 0.045, y: Y_METAFASE[c], ang: 0, sx: 1, sy: 1, f: 1, px: sg * 1.05, py: 0, tip: 0 };
  const ana = { ...met, x: sg * 0.8, y: Y_METAFASE[c] * 0.75 };
  const tel = { ...ana, x: sg * 0.82, y: Y_METAFASE[c] * 0.6, ang: I.ang * 0.4, sx: 0.6, sy: 1.3, f: 0 };
  return [[0, base], [0.12, base], [0.22, pro], [0.32, met], [0.44, met], [0.62, ana], [0.7, { ...ana, f: 0 }], [0.82, tel], [1, tel]];
}

function clavesMeiosis(c, s) {
  const p = c >> 1, m = c & 1;
  const h = p === 0 ? (m === 0 ? -1 : 1) : (m === 0 ? 1 : -1); // lado al que va el homólogo en la meiosis I
  const sS = s ? 1 : -1;
  const yMI = p === 0 ? 0.33 : -0.33;
  const xMI = h * (s === 0 ? 0.045 : 0.13); // s = 0: cromátida interna (cerca del homólogo)
  const offAna = h * (s === 0 ? -0.0425 : 0.0425);
  const xc = h * 0.9, yMII = p === 0 ? 0.25 : -0.25;
  const base = claveInterfase(c, s);
  const proI = { x: xMI, y: yMI * 0.85, ang: 0, sx: 1, sy: 1, f: 0, px: h * 0.5, py: 0.5, tip: 0 };
  const cruce = { ...proI, tip: s === 0 ? 1 : 0 };
  const metI = { ...cruce, y: yMI, f: 1, px: h * 1.05, py: 0 };
  const anaI = { ...metI, x: h * 0.8 + offAna, y: yMI * 0.8 };
  const telI = { ...anaI, x: xc + offAna, y: yMI * 0.55, sx: 0.85, sy: 1.15, f: 0 };
  const metII = { ...telI, x: xc + sS * 0.045, y: yMII, sx: 1, sy: 1, f: 1, px: xc + sS * 0.55, py: 0 };
  const anaII = { ...metII, x: xc + sS * 0.38, y: yMII * 0.8 };
  const telII = { ...anaII, x: xc + sS * 0.42, sx: 0.6, sy: 1.3, f: 0 };
  return [[0, base], [0.08, base], [0.16, proI], [0.2, proI], [0.24, cruce], [0.3, metI], [0.36, metI], [0.48, anaI],
    [0.52, { ...anaI, f: 0 }], [0.58, telI], [0.64, { ...telI, px: xc + sS * 0.3, py: 0.4 }], [0.7, metII], [0.76, metII],
    [0.86, anaII], [0.9, { ...anaII, f: 0 }], [0.95, telII], [1, telII]];
}

// Anillos: membranas celulares y envolturas nucleares {x, r}
const anillo = (x, r) => ({ x, r });
function anillosMitosis(lado) { // lado: -1 o 1 (anillo 0 o 1); 2 y 3 no se usan
  return {
    membrana: [[0, anillo(0, 1.2)], [0.66, anillo(0, 1.2)], [0.8, anillo(lado * 0.64, 0.64)], [1, anillo(lado * 0.64, 0.64)]],
    envoltura: [[0, anillo(0, 0.7)], [0.12, anillo(0, 0.7)], [0.22, anillo(0, 0)], [0.72, anillo(lado * 0.8, 0)], [0.84, anillo(lado * 0.8, 0.38)], [1, anillo(lado * 0.8, 0.38)]],
  };
}
function anillosMeiosis(lado, externo) { // externo: célula final de afuera (true) o de adentro (false)
  const xf = lado * (externo ? 1.33 : 0.47);
  return {
    membrana: [[0, anillo(0, 1.2)], [0.5, anillo(0, 1.2)], [0.58, anillo(lado * 0.9, 0.82)], [0.88, anillo(lado * 0.9, 0.82)], [0.95, anillo(xf, 0.42)], [1, anillo(xf, 0.42)]],
    envoltura: [[0, anillo(0, 0.7)], [0.08, anillo(0, 0.7)], [0.16, anillo(0, 0)], [0.54, anillo(lado * 0.9, 0)], [0.6, anillo(lado * 0.9, 0.4)],
      [0.64, anillo(lado * 0.9, 0)], [0.9, anillo(xf, 0)], [0.97, anillo(xf, 0.3)], [1, anillo(xf, 0.3)]],
  };
}

const FASES = {
  mitosis: [[0, 'Interfase (G2): el ADN ya se duplicó'], [0.12, 'Profase: los cromosomas se condensan'], [0.22, 'Prometafase: se rompe la envoltura nuclear'],
    [0.32, 'Metafase: cromosomas en el plano ecuatorial'], [0.46, 'Anafase: se separan las cromátidas hermanas'], [0.66, 'Telofase y citocinesis: dos células idénticas (2n)']],
  meiosis: [[0, 'Interfase: el ADN ya se duplicó'], [0.08, 'Profase I: los homólogos se aparean (sinapsis)'], [0.2, 'Profase I: entrecruzamiento (crossing over)'],
    [0.28, 'Metafase I: pares de homólogos en el ecuador'], [0.38, 'Anafase I: se separan los homólogos'], [0.52, 'Telofase I: dos células haploides (n)'],
    [0.62, 'Profase II'], [0.68, 'Metafase II'], [0.78, 'Anafase II: se separan las cromátidas hermanas'], [0.88, 'Telofase II: cuatro células haploides distintas']],
};

const moduloGenetica = {
  id: 'genetica',
  ambito: 'celular',
  titulo: 'Genética y herencia',
  tipo: 'procedural',
  archivoDatos: './datos/genetica.json',
  camaraInicial: { pos: [0.1, 0.2, 6.6], objetivo: [0.1, 0, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const azar = crearAzar(5);
    const g = new THREE.Group();
    ctx.raiz.add(g);

    // ---------- Doble hélice de ADN ----------
    const HX = -2.75, PARES = 24, PASO = 0.1, R = 0.22, GIRO = (36 * Math.PI) / 180;
    const y0 = -((PARES - 1) * PASO) / 2;
    const helice = (fase) => new THREE.CatmullRomCurve3(Array.from({ length: PARES * 3 }, (_, i) => {
      const k = i / 3, a = k * GIRO + fase;
      return V(HX + Math.cos(a) * R, y0 + k * PASO, Math.sin(a) * R);
    }));
    ctx.malla(new THREE.TubeGeometry(helice(0), 200, 0.028, 8), 'esqueleto_azucar_fosfato', g);
    ctx.malla(new THREE.TubeGeometry(helice(Math.PI * 0.8), 200, 0.028, 8), 'esqueleto_azucar_fosfato', g);
    const bases = { adenina: [], timina: [], guanina: [], citosina: [] };
    const PAREJA = { adenina: 'timina', timina: 'adenina', guanina: 'citosina', citosina: 'guanina' };
    const nombres = Object.keys(bases);
    const yEje = V(0, 1, 0);
    for (let k = 0; k < PARES; k++) {
      const b1 = nombres[Math.floor(azar() * 4)], b2 = PAREJA[b1];
      const y = y0 + k * PASO;
      const a1 = k * GIRO, a2 = k * GIRO + Math.PI * 0.8;
      const p1 = V(HX + Math.cos(a1) * R, y, Math.sin(a1) * R), p2 = V(HX + Math.cos(a2) * R, y, Math.sin(a2) * R);
      const centro = p1.clone().lerp(p2, 0.5);
      for (const [b, p] of [[b1, p1], [b2, p2]]) {
        const dir = centro.clone().sub(p);
        const largo = dir.length();
        const q = new THREE.Quaternion().setFromUnitVectors(yEje, dir.normalize());
        bases[b].push(new THREE.Matrix4().compose(p.clone().lerp(centro, 0.5), q, V(1, largo * 0.95, 1)));
      }
    }
    const geoBase = new THREE.CylinderGeometry(0.022, 0.022, 1, 6);
    for (const b of nombres) if (bases[b].length) ctx.instancias(geoBase.clone(), b, bases[b], g);

    // ---------- Nucleosomas (collar de perlas) ----------
    const NX = -1.85, centros = [0.75, 0, -0.75];
    const histonas = centros.map((y) => new THREE.Matrix4().compose(V(NX, y, 0),
      new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2), V(1, 1, 1)));
    ctx.instancias(new THREE.CylinderGeometry(0.13, 0.13, 0.15, 24), 'histonas', histonas, g);
    const puntosADN = [V(NX + 0.25, 1.3, 0)];
    centros.forEach((y) => {
      const vueltas = 1.65, n = 30;
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = t * vueltas * Math.PI * 2 + Math.PI / 2;
        puntosADN.push(V(NX - 0.08 + 0.16 * t, y + Math.sin(a) * 0.165, Math.cos(a) * 0.165));
      }
    });
    puntosADN.push(V(NX - 0.25, -1.3, 0));
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntosADN), 300, 0.016, 6), 'adn_enlazador', g);

    // ---------- Cromosoma metafásico grande ----------
    const CX = -1.0, YC = 0.25;
    for (const lado of [-1, 1]) {
      const p = ctx.malla(new THREE.CapsuleGeometry(0.085, 0.26, 6, 14), 'brazo_p', g);
      p.position.set(CX + lado * 0.085, YC + 0.22, 0); p.rotation.z = lado * -0.08;
      const q = ctx.malla(new THREE.CapsuleGeometry(0.085, 0.62, 6, 14), 'brazo_q', g);
      q.position.set(CX + lado * 0.085, YC - 0.42, 0); q.rotation.z = lado * 0.06;
    }
    const cen = ctx.malla(new THREE.SphereGeometry(0.075, 16, 12), 'centromero', g);
    cen.position.set(CX, YC, 0); cen.scale.set(1.6, 0.8, 1);
    for (const lado of [-1, 1]) {
      const k = ctx.malla(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), 'cinetocoro', g);
      k.position.set(CX + lado * 0.17, YC, 0); k.rotation.z = Math.PI / 2;
    }
    const telo = [];
    for (const lado of [-1, 1]) {
      telo.push(new THREE.Matrix4().makeTranslation(CX + lado * 0.1, YC + 0.56, 0));
      telo.push(new THREE.Matrix4().makeTranslation(CX + lado * 0.06, YC - 0.92, 0));
    }
    ctx.instancias(new THREE.SphereGeometry(0.075, 14, 10), 'telomeros', telo, g);

    // ---------- Célula en división (2n = 4) ----------
    const div = new THREE.Group();
    div.position.set(1.2, 0, 0);
    g.add(div);
    const geoLarga = new THREE.CapsuleGeometry(0.04, 0.36, 4, 10), geoCorta = new THREE.CapsuleGeometry(0.04, 0.2, 4, 10);
    const geoPunta = new THREE.CapsuleGeometry(0.043, 0.07, 4, 10);
    const cromatidas = [];
    for (let c = 0; c < 4; c++) {
      const largo = c < 2;
      const padre = c & 1 ? 'cromosoma_paterno' : 'cromosoma_materno';
      const otro = c & 1 ? 'cromosoma_materno' : 'cromosoma_paterno';
      for (let s = 0; s < 2; s++) {
        cromatidas.push({
          c, s, mitad: largo ? 0.22 : 0.14,
          malla: ctx.malla(largo ? geoLarga.clone() : geoCorta.clone(), padre, div),
          centro: ctx.malla(new THREE.SphereGeometry(0.03, 10, 8), 'centromero', div),
          punta: ctx.malla(geoPunta.clone(), otro, div), // segmento intercambiado en el entrecruzamiento
          fibra: ctx.malla(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), 'huso_mitotico', div),
          polo: ctx.malla(new THREE.SphereGeometry(0.035, 10, 8), 'centrosomas', div),
        });
      }
    }
    const geoAnillo = new THREE.TorusGeometry(1, 0.012, 6, 64);
    const membranas = Array.from({ length: 4 }, () => ctx.malla(geoAnillo.clone(), 'membrana_celular', div));
    const envolturas = Array.from({ length: 4 }, () => ctx.malla(new THREE.TorusGeometry(1, 0.01, 6, 48), 'envoltura_nuclear', div));

    refsGen = { THREE, cromatidas, membranas, envolturas, eje: V(0, 1, 0), tmp: V(0, 0, 0) };
    poner('mitosis', 0.38); // vista de estudio: metafase
  },

  procesos: {
    mitosis: (ctx) => animarDivision(ctx, 'mitosis', 16),
    meiosis: (ctx) => animarDivision(ctx, 'meiosis', 26),
    punnett: () => null, // es interactivo en la ficha; no anima el modelo
  },

  liberar() { refsGen = null; },
};

// Coloca todas las piezas de la célula en el instante u (0 a 1) del proceso indicado.
function poner(proceso, u) {
  const { THREE, cromatidas, membranas, envolturas, eje } = refsGen;
  for (const k of cromatidas) {
    const kf = (proceso === 'mitosis' ? clavesMitosis : clavesMeiosis)(k.c, k.s);
    const e = claveEn(kf, u);
    k.malla.position.set(e.x, e.y, 0);
    k.malla.rotation.z = e.ang;
    k.malla.scale.set(e.sx, e.sy, e.sx);
    k.centro.position.set(e.x, e.y, 0);
    k.centro.scale.setScalar(e.sx);
    const d = k.mitad * e.sy - 0.03;
    k.punta.position.set(e.x - Math.sin(e.ang) * d, e.y + Math.cos(e.ang) * d, 0);
    k.punta.rotation.z = e.ang;
    k.punta.scale.setScalar(Math.max(e.tip * e.sx, 0.0001));
    const desde = new THREE.Vector3(e.px, e.py, 0), hasta = new THREE.Vector3(e.x, e.y, 0);
    const dir = hasta.clone().sub(desde);
    const largo = Math.max(dir.length(), 0.001);
    k.fibra.position.copy(desde).lerp(hasta, 0.5);
    k.fibra.quaternion.setFromUnitVectors(eje, dir.normalize());
    const f = Math.max(e.f, 0.0001);
    k.fibra.scale.set(f, largo, f);
    k.polo.position.copy(desde);
    k.polo.scale.setScalar(f);
  }
  membranas.forEach((m, i) => {
    const lado = i % 2 ? 1 : -1;
    const a = proceso === 'mitosis' ? (i < 2 ? anillosMitosis(lado) : null) : anillosMeiosis(lado, i < 2);
    const r = a ? claveEn(a.membrana, u) : { x: 0, r: 0 };
    m.position.x = r.x; m.scale.setScalar(Math.max(r.r, 0.0001));
    const n = a ? claveEn(a.envoltura, u) : { x: 0, r: 0 };
    envolturas[i].position.x = n.x; envolturas[i].scale.setScalar(Math.max(n.r, 0.0001));
  });
}

function animarDivision(ctx, proceso, periodo) {
  const t0 = performance.now();
  let faseActual = null;
  const parar = ctx.motor.animar((t) => {
    const u = (((t - t0) / 1000) / periodo) % 1;
    poner(proceso, u);
    let fase = FASES[proceso][0][1];
    for (const [uf, texto] of FASES[proceso]) if (u >= uf) fase = texto;
    if (fase !== faseActual) { faseActual = fase; ctx.anunciar(fase); }
    return true;
  });
  return () => { parar(); if (refsGen) poner('mitosis', 0.38); ctx.anunciar(null); ctx.pedirRender(); };
}

export default moduloGenetica;
