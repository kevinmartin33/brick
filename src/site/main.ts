import './site.css';
import { CATALOG } from '../catalog';
import { detectLang, officialInstructionsUrl, saveLang, type Lang } from '../shared/i18n';
import { initAnalytics, reopenConsent, track } from '../shared/analytics';
import { STRINGS } from './strings';

let lang: Lang = detectLang();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const t = (key: string, vars: Record<string, string> = {}) =>
  (STRINGS[lang][key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

function applyLang() {
  document.documentElement.lang = lang;
  document.title = t('title');
  document.querySelector('meta[name=description]')?.setAttribute('content', t('description'));
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder!); });
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  if (lastQuery) showResult(lastQuery, false);
}

document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang as Lang;
  saveLang(lang);
  applyLang();
  track('select_language', { language: lang });
}));

/* ---------- search by set number ---------- */
let lastQuery = '';
const normalizeSet = (q: string) => q.trim().replace(/^#/, '').replace(/-\d+$/, '').replace(/\s+/g, '');

function showResult(number: string, fresh = true) {
  const box = $('result');
  box.hidden = false;
  box.className = 'result';
  if (!/^\d{3,7}$/.test(number)) {
    box.classList.add('invalid');
    box.innerHTML = `<p>${esc(t('invalid'))}</p>`;
    return;
  }
  const entry = CATALOG.find((c) => c.number === number);
  if (entry) {
    if (fresh) track('search', { search_term: number, found: true });
    box.classList.add('found');
    box.innerHTML = `<p class="result-title">${esc(t('found', { n: entry.number, name: entry.name }))}</p>
      <a class="btn primary" href="/build/${entry.id}" data-open="${entry.id}">${esc(t('open3d'))} →</a>`;
    return;
  }
  if (fresh) track('search', { search_term: number, found: false });
  box.classList.add('missing');
  box.innerHTML = `<p class="result-title">${esc(t('missing_title', { n: number }))}</p>
    <p>${esc(t('missing_body'))}</p>
    <div class="result-actions">
      <a class="btn" href="${officialInstructionsUrl(lang, number)}" target="_blank" rel="noopener" data-official="${esc(number)}">${esc(t('official'))} ↗</a>
      <button type="button" class="btn primary" data-want="${esc(number)}">${esc(t('want'))}</button>
    </div>`;
}

$('search').addEventListener('submit', (e) => {
  e.preventDefault();
  lastQuery = normalizeSet($<HTMLInputElement>('q').value);
  showResult(lastQuery);
});

$('result').addEventListener('click', (e) => {
  const el = e.target as HTMLElement;
  const want = el.closest<HTMLElement>('[data-want]');
  if (want) {
    track('request_3d', { set_number: want.dataset.want });
    want.replaceWith(Object.assign(document.createElement('p'), { className: 'thanks', textContent: t('wanted') }));
  }
  const open = el.closest<HTMLElement>('[data-open]');
  if (open) track('open_guide', { set_number: open.dataset.open, source: 'search' });
  const official = el.closest<HTMLElement>('[data-official]');
  if (official) track('official_instructions', { set_number: official.dataset.official });
});

$('chips').innerHTML = CATALOG.map((c) => `<a class="chip" href="/build/${c.id}" data-chip="${c.id}">${c.number} · ${esc(c.name)}</a>`).join(' ');
$('chips').addEventListener('click', (e) => {
  const c = (e.target as HTMLElement).closest<HTMLElement>('[data-chip]');
  if (c) track('open_guide', { set_number: c.dataset.chip, source: 'chip' });
});

$('manageCookies').addEventListener('click', () => reopenConsent());

/* ---------- live 3D demo in the hero (loaded after first paint) ---------- */
async function startDemo() {
  const [{ Viewer }, { loadModel }] = await Promise.all([import('../viewer'), import('../ldraw/model')]);
  const stage = $('stage');
  const viewer = new Viewer(stage, $<HTMLCanvasElement>('c'));
  viewer.dim = false;
  const text = await fetch('/models/4915-mini-construction.mpd').then((r) => r.text());
  const model = await loadModel(text, 'demo');
  viewer.setModel(model);
  viewer.show(model.steps.length - 1, false);
  viewer.setSpin(true);
  stage.classList.add('ready');
}

applyLang();
initAnalytics();
const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
idle(() => { startDemo().catch((err) => console.warn('3D demo unavailable', err)); });

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* offline mode unavailable */ });
}
