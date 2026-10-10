// Módulo procedural: biomoléculas en modelo de esferas y barras con colores CPK.
// Geometría simplificada al estilo de libro de texto (ángulos y distancias aproximados).
// Algunas moléculas omiten hidrógenos de las cadenas largas para que se lean mejor.

let refsBio = null;

const ELEMENTOS = { C: ['carbono', 0.13], H: ['hidrogeno', 0.08], O: ['oxigeno', 0.12], N: ['nitrogeno', 0.12], P: ['fosforo', 0.16] };

function nuevaMol() {
  const m = { atomos: [], enlaces: [], rot: [] };
  m.a = (e, x, y, z = 0) => { m.atomos.push({ e, p: [x, y, z] }); return m.atomos.length - 1; };
  m.e = (i, j, o = 1, tipo = 'enlaces') => { m.enlaces.push([i, j, o, tipo]); };
  m.sub = (i, e, dx, dy, dz = 0, o = 1, tipo) => { const [x, y, z] = m.atomos[i].p; const k = m.a(e, x + dx, y + dy, z + dz); m.e(i, k, o, tipo); return k; };
  m.oh = (i, dx, dy, dz = 0) => { // O en la dirección dada y su H un poco desviado
    const o = m.sub(i, 'O', dx, dy, dz);
    const L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L;
    m.sub(o, 'H', ux * 0.2 - uy * 0.14, uy * 0.2 + ux * 0.14, uz * 0.2);
    return o;
  };
  m.ra = (texto, i, dx, dy, dz = 0) => { const [x, y, z] = m.atomos[i].p; m.rot.push({ texto, pos: [x + dx, y + dy, z + dz] }); };
  return m;
}

// Cadena en zigzag desde el átomo i, con dirección inicial ang. dobleEn: posición del doble enlace cis (dobla la cadena).
function cadena(m, i, n, ang, dobleEn = -1) {
  let prev = i, [bx, by] = m.atomos[i].p, a = ang;
  for (let k = 1; k <= n; k++) {
    const doble = k === dobleEn;
    if (doble) a -= 0.65;
    bx += Math.cos(a) * 0.43; by += Math.sin(a) * 0.43;
    const zig = k % 2 ? 0.12 : -0.12;
    const c = m.a('C', bx - Math.sin(a) * zig, by + Math.cos(a) * zig, 0);
    m.e(prev, c, doble ? 2 : 1);
    prev = c;
  }
  return prev;
}

function glucosa() {
  const m = nuevaMol(), R = 0.55;
  const ang = [0, 60, 120, 180, 240, 300].map((d) => (d * Math.PI) / 180);
  const anillo = ang.map((t, k) => m.a(k === 5 ? 'O' : 'C', R * Math.cos(t), 0, R * Math.sin(t)));
  anillo.forEach((a, k) => m.e(a, anillo[(k + 1) % 6]));
  [1, -1, 1, -1].forEach((s, k) => { // β-D-glucosa: OH de C1 arriba, C2 abajo, C3 arriba, C4 abajo
    m.oh(anillo[k], 0.12 * Math.cos(ang[k]), 0.46 * s, 0.12 * Math.sin(ang[k]));
    m.sub(anillo[k], 'H', 0, -0.36 * s, 0);
  });
  const c6 = m.sub(anillo[4], 'C', 0, 0.5, 0);
  m.oh(c6, -0.3, 0.32, -0.1);
  m.sub(anillo[4], 'H', 0, -0.36, 0);
  m.ra('C1: carbono anomérico (β)', anillo[0], 0.75, 0.55);
  m.ra('Oxígeno del anillo', anillo[5], 0.45, -0.3, -0.2);
  m.ra('Grupos hidroxilo (–OH)', anillo[2], -0.45, 0.85);
  m.ra('C6 (–CH₂OH)', c6, -0.2, 0.75);
  return m;
}

function aminoacido() {
  const m = nuevaMol();
  const ca = m.a('C', 0, 0, 0);
  const n = m.sub(ca, 'N', -0.48, 0.12, 0);
  const c = m.sub(ca, 'C', 0.48, 0.12, 0);
  const r = m.sub(ca, 'C', 0, -0.34, 0.36);
  m.sub(ca, 'H', 0, -0.1, -0.44);
  m.sub(n, 'H', -0.3, 0.3, 0); m.sub(n, 'H', -0.32, -0.18, 0.15);
  m.sub(c, 'O', 0.22, 0.42, 0, 2);
  m.oh(c, 0.4, -0.22, 0);
  m.sub(r, 'H', 0.32, -0.12, 0.15); m.sub(r, 'H', -0.32, -0.12, 0.15); m.sub(r, 'H', 0, -0.26, 0.3);
  m.ra('Grupo amino (–NH₂)', n, -0.55, 0.55);
  m.ra('Grupo carboxilo (–COOH)', c, 0.65, 0.65);
  m.ra('Cadena lateral R (–CH₃ en la alanina)', r, 0, -0.6);
  m.ra('Carbono α', ca, -0.1, 0.45, -0.3);
  return m;
}

function dipeptido() {
  const m = nuevaMol();
  const P = (i) => [i * 0.43 - 1.1, (i % 2) * 0.25];
  const el = ['N', 'C', 'C', 'N', 'C', 'C'];
  const at = el.map((e, i) => m.a(e, ...P(i), 0));
  for (let i = 0; i < 5; i++) m.e(at[i], at[i + 1], 1, i === 2 ? 'enlace_peptidico' : 'enlaces');
  m.sub(at[0], 'H', -0.35, 0.22, 0); m.sub(at[0], 'H', -0.3, -0.28, 0);
  m.sub(at[1], 'H', 0, 0.36, 0.24); m.sub(at[1], 'H', 0, 0.36, -0.24);       // glicina: R = H
  m.sub(at[2], 'O', 0, -0.44, 0, 2);
  m.sub(at[3], 'H', 0, 0.38, 0);
  const r = m.sub(at[4], 'C', 0, -0.46, 0);                                // alanina: R = CH₃
  m.sub(r, 'H', 0.3, -0.15, 0.15); m.sub(r, 'H', -0.3, -0.15, 0.15); m.sub(r, 'H', 0, -0.25, -0.28);
  m.sub(at[4], 'H', 0, -0.05, -0.42);
  m.sub(at[5], 'O', 0.2, 0.4, 0, 2);
  m.oh(at[5], 0.42, -0.18, 0);
  m.ra('Enlace peptídico (C–N)', at[2], 0.2, -0.85);
  m.ra('Extremo N-terminal', at[0], -0.5, 0.6);
  m.ra('Extremo C-terminal', at[5], 0.6, 0.7);
  m.ra('Glicina', at[1], 0, 0.85);
  m.ra('Alanina', r, 0, -0.55);
  return m;
}

function trigliceridos() {
  const m = nuevaMol();
  const ys = [0.55, 0, -0.55];
  const gl = ys.map((y) => m.a('C', 0, y, 0));
  m.e(gl[0], gl[1]); m.e(gl[1], gl[2]);
  ys.forEach((y, k) => {
    const o = m.sub(gl[k], 'O', 0.45, 0, 0);
    const c = m.sub(o, 'C', 0.45, 0, 0, 1, 'enlace_ester');
    m.sub(c, 'O', 0, 0.06, 0.42, 2);
    cadena(m, c, 6, 0, k === 2 ? 3 : -1);
  });
  m.ra('Glicerol', gl[1], -0.55, 0);
  m.ra('Enlaces éster', gl[0], 0.65, 0.4);
  m.ra('Ácidos grasos saturados', gl[0], 2.3, 0.35);
  m.ra('Insaturado (cis): el doble enlace dobla la cadena', gl[2], 2.0, -0.9);
  return m;
}

function fosfolipido() {
  const m = nuevaMol();
  const c1 = m.a('C', -0.4, 0, 0), c2 = m.a('C', 0.05, 0.12, 0), c3 = m.a('C', 0.5, 0, 0);
  m.e(c1, c2); m.e(c2, c3);
  [[c1, -1], [c2, 3]].forEach(([g, doble]) => {
    const o = m.sub(g, 'O', 0, -0.44, 0);
    const c = m.sub(o, 'C', 0, -0.44, 0, 1, 'enlace_ester');
    m.sub(c, 'O', 0.05, 0, 0.42, 2);
    cadena(m, c, 5, -Math.PI / 2, doble);
  });
  const o3 = m.sub(c3, 'O', 0, 0.44, 0);
  const p = m.sub(o3, 'P', 0, 0.46, 0);
  m.sub(p, 'O', 0.4, 0.08, 0, 2); m.sub(p, 'O', -0.3, 0.05, 0.3);
  const o4 = m.sub(p, 'O', 0, 0.46, 0);
  const ch1 = m.sub(o4, 'C', 0, 0.44, 0), ch2 = m.sub(ch1, 'C', 0.2, 0.38, 0);
  const n = m.sub(ch2, 'N', 0, 0.44, 0);
  m.sub(n, 'C', 0.4, 0.15, 0); m.sub(n, 'C', -0.32, 0.18, 0.2); m.sub(n, 'C', 0, 0.2, -0.4);
  m.ra('Colina', n, 0.75, 0.3);
  m.ra('Fosfato', p, 0.75, 0);
  m.ra('Glicerol', c2, 0.95, 0.1);
  m.ra('Cabeza polar (hidrofílica)', ch1, -1.25, 0);
  m.ra('Colas hidrofóbicas', c1, -0.95, -1.4);
  return m;
}

// Nucleótido de adenina: con desoxirribosa y 1 fosfato (dAMP) o con ribosa y 3 fosfatos (ATP).
function nucleotido(esATP) {
  const m = nuevaMol();
  const R = 0.42, angs = [270, 342, 54, 126, 198].map((d) => (d * Math.PI) / 180);
  const az = angs.map((t, k) => m.a(k === 0 ? 'O' : 'C', R * Math.cos(t), 0, R * Math.sin(t))); // O4', C1', C2', C3', C4'
  az.forEach((a, k) => m.e(a, az[(k + 1) % 5]));
  m.oh(az[3], 0, -0.44, 0.05);                                          // 3'-OH
  if (esATP) m.oh(az[2], 0.05, -0.44, 0.05); else m.sub(az[2], 'H', 0, -0.36, 0); // 2'-OH en la ribosa
  const c5 = m.sub(az[4], 'C', -0.1, 0.46, 0);
  const o5 = m.sub(c5, 'O', -0.4, 0.15, 0);
  // Fosfatos
  let prev = o5, primerP = null;
  for (let k = 0; k < (esATP ? 3 : 1); k++) {
    const p = m.sub(prev, 'P', -0.42, 0.2, 0, 1, k > 0 ? 'enlace_fosfoanhidrido' : 'enlaces');
    if (!primerP) primerP = p;
    m.sub(p, 'O', 0, 0.12, 0.42, 2); m.sub(p, 'O', 0.05, -0.42, 0);
    if (k < (esATP ? 2 : 0)) prev = m.sub(p, 'O', -0.42, 0.18, 0, 1, 'enlace_fosfoanhidrido');
    else m.sub(p, 'O', -0.42, 0.18, 0);
  }
  // Adenina (purina): hexágono + pentágono fusionados
  const [cx1, cy1] = m.atomos[az[1]].p;
  const n9obj = [cx1 + 0.46, -0.06];
  const RH = 0.45, v = (d) => [RH * Math.cos((d * Math.PI) / 180), RH * Math.sin((d * Math.PI) / 180)];
  const centro = [n9obj[0] + 0.69, n9obj[1] + 0.445];
  const pos = (rel) => [centro[0] + rel[0], centro[1] + rel[1]];
  const hex = { 150: 'C', 90: 'C', 30: 'N', 330: 'C', 270: 'N', 210: 'C' };
  const ih = {};
  for (const d of [150, 90, 30, 330, 270, 210]) ih[d] = m.a(hex[d], ...pos(v(d)), 0.05);
  [[150, 90, 1], [90, 30, 2], [30, 330, 1], [330, 270, 2], [270, 210, 1], [210, 150, 2]].forEach(([a, b, o]) => m.e(ih[a], ih[b], o));
  const v150 = v(150), v210 = v(210), medio = [(v150[0] + v210[0]) / 2, 0];
  const n9 = m.a('N', ...pos([v210[0] - 0.3, v210[1] - 0.22]), 0.05);
  const c8 = m.a('C', ...pos([medio[0] - 0.6, 0]), 0.05);
  const n7 = m.a('N', ...pos([v150[0] - 0.3, v150[1] + 0.22]), 0.05);
  m.e(ih[210], n9); m.e(n9, c8); m.e(c8, n7, 2); m.e(n7, ih[150]);
  m.e(az[1], n9, 1, 'enlace_n_glucosidico');
  const n6 = m.sub(ih[90], 'N', 0, 0.42, 0);
  m.sub(n6, 'H', 0.28, 0.22, 0); m.sub(n6, 'H', -0.28, 0.22, 0);
  m.ra('Adenina (base nitrogenada)', ih[30], 0.4, 0.55);
  m.ra(esATP ? 'Ribosa' : 'Desoxirribosa', az[2], 0.1, -0.7, 0.4);
  m.ra('Enlace N-glucosídico', n9, -0.1, -0.5);
  if (esATP) {
    m.ra('Fosfatos α, β y γ', primerP, -0.45, 0.85);
    m.ra('Enlaces fosfoanhídrido (alta energía)', primerP, -0.5, -0.75);
  } else {
    m.ra('Grupo fosfato', primerP, -0.2, 0.75);
    m.ra('C2′ sin –OH (desoxi)', az[2], 0.55, -0.15, 0.4);
  }
  return m;
}

const MOLECULAS = [
  { id: 'glucosa', crear: glucosa, en: [-5.0, 1.6] },
  { id: 'aminoacido', crear: aminoacido, en: [-2.6, 1.6] },
  { id: 'dipeptido', crear: dipeptido, en: [0.2, 1.6] },
  { id: 'nucleotido', crear: () => nucleotido(false), en: [4.1, 1.8] },
  { id: 'trigliceridos', crear: trigliceridos, en: [-5.6, -1.6] },
  { id: 'atp', crear: () => nucleotido(true), en: [2.0, -1.6] },
  { id: 'fosfolipido', crear: fosfolipido, en: [6.7, -1.9] },
];

const moduloBiomoleculas = {
  id: 'biomoleculas',
  ambito: 'bioquimica',
  titulo: 'Biomoléculas',
  tipo: 'procedural',
  archivoDatos: './datos/biomoleculas.json',
  camaraInicial: { pos: [1.0, -0.4, 13.4], objetivo: [1.0, -0.7, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const yEje = V(0, 1, 0), vista = V(0, 0, 1);
    const geoAtomo = new THREE.IcosahedronGeometry(1, 2);
    const geoEnlace = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
    const grupos = {}, nombres = [];
    for (const mol of MOLECULAS) {
      const m = mol.crear();
      const g = new THREE.Group();
      g.position.set(mol.en[0], mol.en[1], 0);
      ctx.raiz.add(g);
      const porElemento = {};
      m.atomos.forEach(({ e, p }) => {
        const [, r] = ELEMENTOS[e];
        (porElemento[e] ||= []).push(new THREE.Matrix4().compose(V(...p), new THREE.Quaternion(), V(r, r, r)));
      });
      for (const e in porElemento) ctx.instancias(geoAtomo, ELEMENTOS[e][0], porElemento[e], g);
      const porTipo = {};
      for (const [i, j, o, tipo] of m.enlaces) {
        const a = V(...m.atomos[i].p), b = V(...m.atomos[j].p);
        const dir = b.clone().sub(a), largo = dir.length();
        dir.normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(yEje, dir);
        let perp = dir.clone().cross(vista);
        if (perp.lengthSq() < 1e-4) perp = V(1, 0, 0);
        perp.normalize().multiplyScalar(0.05);
        const medio = a.clone().lerp(b, 0.5);
        const desplazamientos = o === 2 ? [perp, perp.clone().negate()] : [V(0, 0, 0)];
        for (const d of desplazamientos) (porTipo[tipo] ||= []).push(new THREE.Matrix4().compose(medio.clone().add(d), q, V(1, largo, 1)));
      }
      for (const t in porTipo) ctx.instancias(geoEnlace, t, porTipo[t], g);
      grupos[mol.id] = { g, rot: m.rot };
      const caja = new THREE.Box3().setFromObject(g);
      nombres.push({ texto: ctx.datos.procesos.find((p) => p.id === mol.id)?.titulo || mol.id,
        pos: [caja.getCenter(V()).x, caja.max.y + 0.3, 0] });
    }
    ctx.datos.rotulos = nombres; // rótulos de la galería (nombre de cada molécula)
    refsBio = { grupos };
  },

  liberar() { refsBio = null; },
};

// Cada "proceso" enfoca una molécula: oculta las demás, acerca la cámara y muestra sus grupos funcionales.
function enfocarMolecula(id) {
  return (ctx) => {
    const { THREE } = ctx; const { grupos } = refsBio;
    for (const [k, { g }] of Object.entries(grupos)) g.scale.setScalar(k === id ? 1 : 0.0001);
    const { g, rot } = grupos[id];
    g.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(g);
    const centro = caja.getCenter(new THREE.Vector3());
    const radio = caja.getSize(new THREE.Vector3()).length() / 2;
    const dist = (radio / Math.sin(THREE.MathUtils.degToRad(ctx.motor.fov() / 2))) * 1.05;
    ctx.motor.volar(centro, centro.clone().add(new THREE.Vector3(0.15, 0.25, 1).normalize().multiplyScalar(dist)));
    ctx.setRotulos(rot.map((r) => ({ texto: r.texto, pos: [r.pos[0] + g.position.x, r.pos[1] + g.position.y, r.pos[2]] })));
    ctx.pedirRender();
    return () => {
      if (!refsBio) return;
      for (const { g: gr } of Object.values(refsBio.grupos)) gr.scale.setScalar(1);
      ctx.setRotulos(null);
      ctx.motor.reiniciarVista();
    };
  };
}
moduloBiomoleculas.procesos = Object.fromEntries(MOLECULAS.map((m) => [m.id, enfocarMolecula(m.id)]));

export default moduloBiomoleculas;
