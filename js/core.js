/* ============================================================
   core.js — shared utilities and icon set
   Exposes globals: $, $$, esc, uid, nowISO, fmtDate, fmtDateTime,
   timeAgo, age, initials, byDateDesc, daysFromNow, todayISO,
   debounce, qrMatrix, qrSVG, ICONS, icon
   ============================================================ */

const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

let _uid = 0;
function uid(p) {
  return p + '_' + (Date.now().toString(36).slice(-5)) + (_uid++).toString(36) + Math.random().toString(36).slice(2, 5);
}
function nowISO() { return new Date().toISOString(); }

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (isNaN(s)) return '—';
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
  return fmtDate(iso);
}
function age(dob) {
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a;
}
function initials(n) {
  return String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function byDateDesc(a, b) { return new Date(b.date || b.ts) - new Date(a.date || a.ts); }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function debounce(fn, ms) {
  let t;
  return function () {
    clearTimeout(t);
    const a = arguments, c = this;
    t = setTimeout(() => fn.apply(c, a), ms);
  };
}

/* Deterministic pseudo-QR matrix (visual representation for the prototype) */
function qrMatrix(text, size) {
  size = size || 25;
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  const m = Array.from({ length: size }, () => new Array(size).fill(0));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) m[y][x] = rnd() > 0.48 ? 1 : 0;
  const finder = (ox, oy) => {
    for (let y = -1; y < 8; y++) for (let x = -1; x < 8; x++) {
      const yy = oy + y, xx = ox + x;
      if (yy < 0 || xx < 0 || yy >= size || xx >= size) continue;
      if (x === -1 || x === 7 || y === -1 || y === 7) { m[yy][xx] = 0; continue; }
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      m[yy][xx] = (edge || core) ? 1 : 0;
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  for (let i = 8; i < size - 8; i++) { m[6][i] = i % 2 === 0 ? 1 : 0; m[i][6] = i % 2 === 0 ? 1 : 0; }
  return m;
}
function qrSVG(text, px) {
  px = px || 128;
  const size = 25, m = qrMatrix(text, size), cell = px / size;
  let rects = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (m[y][x]) rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
  }
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" role="img" aria-label="Medical ID QR code"><rect width="${px}" height="${px}" fill="#fff"/><g fill="#0f172a">${rects}</g></svg>`;
}

const ICONS = {
  home: '<path d="m3 10.5 9-7 9 7V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z"/><path d="M9.5 21.5v-7h5v7"/>',
  timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  records: '<path d="M14 2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 2v6h6"/><path d="M8.5 13h7M8.5 17h4.5"/>',
  shield: '<path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4.5M12 17.5h.01"/>',
  scroll: '<path d="M8 3H5.5A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21H8"/><path d="M16 3h2.5A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5H16"/><path d="M12 3v18M9 8h6M9 12h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
  link: '<path d="M9.5 17H7A5 5 0 0 1 7 7h2.5"/><path d="M14.5 7H17a5 5 0 1 1 0 10h-2.5"/><path d="M8.5 12h7"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M9.5 22v-4h5v4"/><path d="M8.5 6h.01M8.5 10h.01M8.5 14h.01M15.5 6h.01M15.5 10h.01M15.5 14h.01"/>',
  bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  edit: '<path d="M11 4H4.5A2.5 2.5 0 0 0 2 6.5v13A2.5 2.5 0 0 0 4.5 22h13a2.5 2.5 0 0 0 2.5-2.5V13"/><path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7.5 11V7a4.5 4.5 0 0 1 9 0v4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  file: '<path d="M14 2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 2v6h6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  heart: '<path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 1 0-7.1 7.1L12 21l8.4-8.3a5 5 0 0 0 0-7.1z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  id: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10.5" r="2"/><path d="M5.8 16.5c.5-1.6 1.8-2.5 3.2-2.5s2.7.9 3.2 2.5"/><path d="M15 9.5h4M15 13.5h4"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  more: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2.5"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  logoutCircle: '<circle cx="12" cy="12" r="9"/><path d="M9.5 12h7M14 9l3 3-3 3"/>',
  sparkle: '<path d="M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2z"/>'
};

function icon(name, size, cls) {
  size = size || 20;
  return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
}