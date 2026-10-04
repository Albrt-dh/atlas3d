// Íconos SVG en línea (trazo), sin archivos externos.
const TRAZOS = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  reiniciar: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  aislar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  ocultar: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a10 10 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  mostrar: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  actividad: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  corazon: '<path d="M19.5 13.5 12 21l-7.5-7.5A5 5 0 0 1 12 6a5 5 0 0 1 7.5 7.5z"/><path d="M5 12h3l2-3 3 6 2-3h4"/>',
  celula: '<circle cx="12" cy="12" r="9"/><circle cx="13" cy="11" r="3.5"/><circle cx="7.5" cy="15.5" r="1"/><circle cx="16" cy="17" r="0.8"/>',
  molecula: '<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="M8.3 8.3l2.4 6.4M15.7 8.3l-2.4 6.4M8.5 7h7"/>',
  examen: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
export function icono(nombre, clase = '') {
  return `<svg class="ico ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[nombre] || ''}</svg>`;
}
