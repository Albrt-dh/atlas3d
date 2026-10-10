// Cuadro de Punnett interactivo (uno o dos genes, dominancia completa).

const GENOTIPOS = ['AA', 'Aa', 'aa'];
const ordenar = (a, b) => (a === a.toUpperCase() ? 0 : 1) - (b === b.toUpperCase() ? 0 : 1);

function gametos(genes) { // genes: ['Aa', 'Bb'] -> ['AB','Ab','aB','ab']
  return genes.reduce((acc, g) => acc.flatMap((pre) => [g[0], g[1]].map((al) => pre + al)), ['']);
}
function unir(g1, g2) { // 'Ab' + 'aB' -> 'AaBb'
  return [...g1].map((al, i) => [al, g2[i]].sort(ordenar).join('')).join('');
}
function fenotipo(genotipo) {
  const partes = genotipo.match(/../g);
  return partes.map((p) => (p[0] === p[0].toUpperCase() ? p[0].toUpperCase() + '_' : p)).join(' ');
}
function convertir(g, letra) { return g.replace(/a/g, letra.toLowerCase()).replace(/A/g, letra); }

export function montarPunnett(el) {
  el.innerHTML = `
    <div class="punnett">
      <label class="punnett-dos"><input type="checkbox" id="pn-dos"> Dos genes (cruza dihíbrida)</label>
      <div class="punnett-padres">
        <fieldset><legend>Progenitor 1</legend>
          <select id="pn-p1a" aria-label="Progenitor 1, gen A"></select>
          <select id="pn-p1b" aria-label="Progenitor 1, gen B" hidden></select></fieldset>
        <fieldset><legend>Progenitor 2</legend>
          <select id="pn-p2a" aria-label="Progenitor 2, gen A"></select>
          <select id="pn-p2b" aria-label="Progenitor 2, gen B" hidden></select></fieldset>
      </div>
      <div class="punnett-tabla" id="pn-tabla"></div>
      <div id="pn-resumen"></div>
    </div>`;
  const $ = (id) => el.querySelector('#' + id);
  const opciones = (letra) => GENOTIPOS.map((g) => `<option>${convertir(g, letra)}</option>`).join('');
  $('pn-p1a').innerHTML = $('pn-p2a').innerHTML = opciones('A');
  $('pn-p1b').innerHTML = $('pn-p2b').innerHTML = opciones('B');
  $('pn-p1a').value = $('pn-p2a').value = 'Aa';
  $('pn-p1b').value = $('pn-p2b').value = 'Bb';

  function calcular() {
    const dos = $('pn-dos').checked;
    $('pn-p1b').hidden = $('pn-p2b').hidden = !dos;
    const p1 = [$('pn-p1a').value].concat(dos ? [$('pn-p1b').value] : []);
    const p2 = [$('pn-p2a').value].concat(dos ? [$('pn-p2b').value] : []);
    const g1 = gametos(p1), g2 = gametos(p2);
    const cuentaG = {}, cuentaF = {};
    let filas = `<tr><th></th>${g2.map((g) => `<th>${g}</th>`).join('')}</tr>`;
    for (const a of g1) {
      filas += `<tr><th>${a}</th>${g2.map((b) => {
        const gt = unir(a, b); const f = fenotipo(gt);
        cuentaG[gt] = (cuentaG[gt] || 0) + 1; cuentaF[f] = (cuentaF[f] || 0) + 1;
        return `<td>${gt}</td>`;
      }).join('')}</tr>`;
    }
    $('pn-tabla').innerHTML = `<table>${filas}</table>`;
    const total = g1.length * g2.length;
    const lista = (obj) => Object.entries(obj).sort((x, y) => y[1] - x[1])
      .map(([k, v]) => `${k}: ${v}/${total}`).join(', ');
    $('pn-resumen').innerHTML = `
      <h3>Proporción genotípica</h3><p>${lista(cuentaG)}</p>
      <h3>Proporción fenotípica</h3><p>${lista(cuentaF)}</p>
      <p class="fuente">El guion bajo (A_) significa "cualquier alelo": el fenotipo dominante se expresa con AA o con Aa.</p>`;
  }
  el.addEventListener('change', calcular);
  calcular();
}
