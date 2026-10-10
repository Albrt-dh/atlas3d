// Módulo procedural: microbiología y parasitología. Bacteria en corte, comparación de pared
// Gram positiva y Gram negativa, morfologías bacterianas, virus, hongos y parásitos.
import { crearAzar } from '../animacion.js';

let refsMicro = null;

function perfilBacilo(THREE, r, mitad) {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(r * Math.cos(a), 0.001), -mitad + r * Math.sin(a))); }
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(r * Math.cos(a), 0.001), mitad + r * Math.sin(a))); }
  return pts;
}

const moduloMicro = {
  id: 'micro',
  ambito: 'celular',
  titulo: 'Microbiología y parasitología',
  tipo: 'procedural',
  archivoDatos: './datos/micro.json',
  camaraInicial: { pos: [1.0, 0, 12.2], objetivo: [1.0, -0.2, 0] },

  async cargar(ctx) {
    const { THREE } = ctx;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const azar = crearAzar(21);
    const g = new THREE.Group();
    ctx.raiz.add(g);
    const M = (p, q, s) => new THREE.Matrix4().compose(p, q || new THREE.Quaternion(), s || V(1, 1, 1));
    const ubicar = (o, x, y, z = 0) => { o.position.set(x, y, z); return o; };
    const yEje = V(0, 1, 0);

    // ---------- Bacteria (bacilo) en corte ----------
    const B = V(-2.4, 0.6, 0), MITAD = 0.65;
    const capa = (r, id) => {
      const o = ctx.malla(new THREE.LatheGeometry(perfilBacilo(THREE, r, MITAD), 40, Math.PI / 2, Math.PI), id, g);
      o.rotation.z = Math.PI / 2; o.position.copy(B); return o;
    };
    capa(0.6, 'capsula'); capa(0.5, 'pared_celular'); capa(0.45, 'membrana_bacteriana');
    const puntosN = [];
    let p = B.clone().add(V(-0.3, 0, -0.15));
    for (let i = 0; i < 40; i++) {
      const sig = p.clone().add(V((azar() - 0.5) * 0.25, (azar() - 0.5) * 0.25, (azar() - 0.5) * 0.15));
      const d = sig.clone().sub(B);
      if (Math.abs(d.x) < 0.6 && Math.hypot(d.y, d.z) < 0.28 && d.z < 0) p = sig;
      puntosN.push(p.clone());
    }
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntosN), 240, 0.012, 5), 'nucleoide', g);
    [[0.75, 0.15], [-0.85, -0.18]].forEach(([dx, dy]) => ubicar(ctx.malla(new THREE.TorusGeometry(0.07, 0.012, 6, 24), 'plasmidos', g), B.x + dx, B.y + dy, -0.2));
    const ribos = [];
    for (let i = 0; ribos.length < 140 && i < 2000; i++) {
      const q = V((azar() - 0.5) * 2.4, (azar() - 0.5) * 0.8, -azar() * 0.4);
      const yz = Math.hypot(q.y, q.z), fuera = Math.max(0, Math.abs(q.x) - MITAD);
      if (Math.hypot(fuera, yz) < 0.4) ribos.push(M(B.clone().add(q)));
    }
    ctx.instancias(new THREE.IcosahedronGeometry(0.014, 0), 'ribosomas_70s', ribos, g);
    // Flagelo: hélice desde el polo izquierdo (gira en el proceso)
    const flagelo = new THREE.Group();
    flagelo.position.set(B.x - MITAD - 0.5, B.y, -0.05); g.add(flagelo);
    const ptsF = Array.from({ length: 60 }, (_, i) => { const t = i / 59, a = t * Math.PI * 8; return V(-t * 1.6, Math.cos(a) * 0.08 * t, Math.sin(a) * 0.08 * t); });
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsF), 160, 0.012, 5), 'flagelo', flagelo);
    const pili = [];
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + azar() * Math.PI, x = (azar() - 0.5) * 1.2;
      const dir = V(0, Math.cos(a), Math.sin(a));
      if (dir.z > -0.05) continue;
      pili.push(M(B.clone().add(V(x, 0, 0)).addScaledVector(dir, 0.72), new THREE.Quaternion().setFromUnitVectors(yEje, dir)));
    }
    ctx.instancias(new THREE.CylinderGeometry(0.007, 0.007, 0.25, 4), 'pili', pili, g);

    // ---------- Pared Gram positiva y Gram negativa ----------
    const losa = (id, cx, y0, alto, ancho = 1.2, fondo = 0.9) => ubicar(ctx.malla(new THREE.BoxGeometry(ancho, alto, fondo), id, g), cx, y0 + alto / 2, 0);
    const GP = 0.4, GN = 2.0, Y0 = 0.55;
    losa('membrana_bacteriana', GP, Y0, 0.1); losa('peptidoglucano_grampos', GP, Y0 + 0.12, 0.5);
    const teicoicos = [];
    for (let i = 0; i < 14; i++) teicoicos.push(M(V(GP - 0.5 + azar(), Y0 + 0.5, (azar() - 0.5) * 0.8), null, V(1, 1, 1)));
    ctx.instancias(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), 'acidos_teicoicos', teicoicos, g);
    losa('membrana_bacteriana', GN, Y0, 0.1); losa('espacio_periplasmico', GN, Y0 + 0.1, 0.12, 1.18, 0.88);
    losa('peptidoglucano_gramneg', GN, Y0 + 0.22, 0.06); losa('espacio_periplasmico', GN, Y0 + 0.28, 0.08, 1.18, 0.88);
    losa('membrana_externa_gram', GN, Y0 + 0.36, 0.1);
    const lps = [], porinas = [];
    for (let i = 0; i < 30; i++) lps.push(M(V(GN - 0.55 + azar() * 1.1, Y0 + 0.56, (azar() - 0.5) * 0.85)));
    for (let i = 0; i < 4; i++) porinas.push(M(V(GN - 0.4 + i * 0.27, Y0 + 0.41, 0.15 - (i % 2) * 0.3)));
    ctx.instancias(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4), 'lps', lps, g);
    ctx.instancias(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10, 1, true), 'porinas', porinas, g);

    // ---------- Morfologías bacterianas ----------
    const YM = -1.7, esf = new THREE.SphereGeometry(0.11, 18, 12);
    ctx.instancias(esf, 'cocos', [M(V(-4.6, YM, 0))], g);
    ctx.instancias(esf.clone(), 'diplococos', [M(V(-3.95, YM, 0), null, V(1, 1.15, 1)), M(V(-3.73, YM, 0), null, V(1, 1.15, 1))], g);
    ctx.instancias(esf.clone(), 'estreptococos', Array.from({ length: 6 }, (_, i) => M(V(-3.2 + i * 0.21, YM + Math.sin(i * 1.1) * 0.08, 0))), g);
    const racimo = [];
    for (let i = 0; i < 9; i++) racimo.push(M(V(-1.55 + (i % 3) * 0.2 + (Math.floor(i / 3) % 2) * 0.1, YM - 0.18 + Math.floor(i / 3) * 0.18, (azar() - 0.5) * 0.15)));
    ctx.instancias(esf.clone(), 'estafilococos', racimo, g);
    const bacilo = ctx.malla(new THREE.CapsuleGeometry(0.1, 0.35, 4, 12), 'bacilos', g);
    ubicar(bacilo, -0.55, YM); bacilo.rotation.z = Math.PI / 2;
    const ptsV = Array.from({ length: 12 }, (_, i) => { const a = -0.9 + (i / 11) * 1.8; return V(0.2 + Math.sin(a) * 0.3, YM + Math.cos(a) * 0.3 - 0.25, 0); });
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsV), 30, 0.08, 10), 'vibrios', g);
    const ptsE = Array.from({ length: 50 }, (_, i) => { const t = i / 49, a = t * Math.PI * 6; return V(0.8 + t * 0.9, YM + Math.sin(a) * 0.12, Math.cos(a) * 0.12); });
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsE), 120, 0.035, 8), 'espirilos', g);

    // ---------- Virus envuelto ----------
    const VX = V(4.0, 0.9, 0);
    const env = ctx.malla(new THREE.SphereGeometry(0.55, 40, 28, Math.PI, Math.PI), 'envoltura_viral', g); // mitad trasera
    env.position.copy(VX);
    const espic = [];
    for (let i = 0; i < 70; i++) {
      const u = azar() * 2 - 1, a = azar() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const dir = V(s * Math.cos(a), u, s * Math.sin(a));
      if (dir.z > -0.05) continue;
      espic.push(M(VX.clone().addScaledVector(dir, 0.62), new THREE.Quaternion().setFromUnitVectors(yEje, dir)));
    }
    ctx.instancias(new THREE.CylinderGeometry(0.035, 0.012, 0.15, 6), 'espiculas', espic, g);
    ubicar(ctx.malla(new THREE.IcosahedronGeometry(0.33, 0), 'capside', g), VX.x, VX.y, VX.z);
    const ptsG = Array.from({ length: 30 }, () => VX.clone().add(V((azar() - 0.5) * 0.3, (azar() - 0.5) * 0.3, 0.22 + azar() * 0.08)));
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsG), 120, 0.01, 5), 'genoma_viral', g);

    // ---------- Bacteriófago ----------
    const F = V(4.0, -1.0, 0);
    ubicar(ctx.malla(new THREE.IcosahedronGeometry(0.24, 0), 'fago_cabeza', g), F.x, F.y + 0.55);
    ubicar(ctx.malla(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10), 'fago_cola', g), F.x, F.y + 0.05);
    ubicar(ctx.malla(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 6), 'fago_cola', g), F.x, F.y - 0.24);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, d = V(Math.cos(a), 0, Math.sin(a));
      const pts = [F.clone().add(V(0, -0.24, 0)), F.clone().add(d.clone().multiplyScalar(0.35)).add(V(0, -0.3, 0)), F.clone().add(d.clone().multiplyScalar(0.45)).add(V(0, -0.6, 0))];
      ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.012, 4), 'fago_cola', g);
    }

    // ---------- Hongos ----------
    const levadura = ubicar(ctx.malla(new THREE.SphereGeometry(0.28, 28, 20), 'levadura', g), 6.0, 1.15);
    levadura.scale.set(1, 1.25, 1);
    const yema = ctx.malla(new THREE.SphereGeometry(0.14, 20, 14), 'yema', g);
    ubicar(yema, 6.25, 1.5); yema.scale.set(1, 1.2, 1);
    const ptsH = [V(5.3, 0.15, 0), V(5.8, 0.25, 0), V(6.3, 0.12, 0), V(6.9, 0.22, 0)];
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsH), 60, 0.07, 10), 'hifa', g);
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(6.1, 0.2, 0), V(6.35, 0.45, 0), V(6.5, 0.7, 0)]), 30, 0.06, 10), 'hifa', g);
    const septos = [5.6, 6.05, 6.6].map((x) => M(V(x, x < 6 ? 0.22 : x < 6.4 ? 0.18 : 0.18, 0), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2 - 0.1)));
    ctx.instancias(new THREE.CylinderGeometry(0.075, 0.075, 0.015, 12), 'septos', septos, g);

    // ---------- Parásitos ----------
    const giardia = ctx.malla(new THREE.SphereGeometry(0.3, 28, 20), 'protozoario', g);
    ubicar(giardia, 6.0, -0.75); giardia.scale.set(1, 1.35, 0.45);
    ctx.instancias(new THREE.SphereGeometry(0.06, 14, 10), 'nucleos_protozoario', [M(V(5.9, -0.6, 0.12)), M(V(6.1, -0.6, 0.12))], g);
    for (let i = 0; i < 4; i++) {
      const lado = i % 2 ? 1 : -1, y = -1.0 - Math.floor(i / 2) * 0.1;
      const pts = [V(6.0 + lado * 0.08, y, 0), V(6.0 + lado * 0.22, y - 0.3, 0.02), V(6.0 + lado * 0.15, y - 0.6, 0)];
      ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.008, 4), 'flagelos_protozoario', g);
    }
    const ptsW = Array.from({ length: 20 }, (_, i) => { const t = i / 19; return V(5.2 + t * 1.6, -1.95 + Math.sin(t * Math.PI * 2.2) * 0.22, 0); });
    ctx.malla(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsW), 80, 0.06, 10), 'helminto', g);

    refsMicro = { flagelo, yema };
  },

  procesos: {
    tincion_gram(ctx) {
      const pos = ['peptidoglucano_grampos', 'acidos_teicoicos'];
      const neg = ['peptidoglucano_gramneg', 'membrana_externa_gram', 'lps'];
      const originales = Object.fromEntries([...pos, ...neg].map((id) => [id, ctx.motor.colorEstructura(id)]));
      const pintar = (ids, c) => ids.forEach((id) => ctx.motor.setColorEstructura(id, c));
      const PASOS = [
        [0, 'Paso 1: cristal violeta. Ambas paredes se tiñen de morado.', '#6a3fa0', '#6a3fa0'],
        [0.25, 'Paso 2: lugol. El yodo fija el colorante en complejos más grandes.', '#4e2a80', '#4e2a80'],
        [0.5, 'Paso 3: alcohol-acetona. La Gram negativa pierde el colorante.', '#4e2a80', '#ece6da'],
        [0.75, 'Paso 4: safranina. La Gram negativa se tiñe de rosa.', '#4e2a80', '#e07a9a'],
      ];
      if (ctx.motor.getModo() !== 'atlas') ctx.motor.setModo('atlas'); // la tinción necesita colores
      const t0 = performance.now();
      let paso = -1;
      const parar = ctx.motor.animar((t) => {
        const u = (((t - t0) / 1000) / 14) % 1;
        let k = 0;
        PASOS.forEach(([uf], i) => { if (u >= uf) k = i; });
        if (k !== paso) {
          paso = k;
          const [, texto, cPos, cNeg] = PASOS[k];
          pintar(pos, cPos); pintar(neg, cNeg); ctx.anunciar(texto);
        }
        return true;
      });
      return () => { parar(); for (const [id, c] of Object.entries(originales)) ctx.motor.setColorEstructura(id, c); };
    },

    flagelo(ctx) {
      const { flagelo } = refsMicro;
      const parar = ctx.motor.animar((t) => { flagelo.rotation.x = t / 1000 * 9; return true; });
      return () => { parar(); flagelo.rotation.x = 0; ctx.pedirRender(); };
    },

    gemacion(ctx) {
      const { yema } = refsMicro;
      const t0 = performance.now();
      const parar = ctx.motor.animar((t) => {
        const u = (((t - t0) / 1000) / 5) % 1, k = Math.min(1, u / 0.8);
        yema.scale.set(0.15 + k * 0.85, (0.15 + k * 0.85) * 1.2, 0.15 + k * 0.85);
        return true;
      });
      return () => { parar(); yema.scale.set(1, 1.2, 1); ctx.pedirRender(); };
    },
  },

  liberar() { refsMicro = null; },
};

export default moduloMicro;
