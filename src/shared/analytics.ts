// Google Analytics 4 (the Firebase project's web stream), loaded only after the visitor accepts.
// CNIL/GDPR: nothing is loaded and no cookie is set before consent; refusing is as easy as accepting.

import { detectLang, type Lang } from './i18n';

const MEASUREMENT_ID = import.meta.env.VITE_GA_ID as string | undefined;
const KEY = 'brick:consent';
type Consent = 'granted' | 'denied';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { dataLayer: unknown[]; gtag?: (...args: any[]) => void } }

let loaded = false;
const queue: [string, Record<string, unknown>][] = [];

function readConsent(): Consent | null {
  try { return (localStorage.getItem(KEY) as Consent | null) ?? null; } catch { return null; }
}
function writeConsent(c: Consent) {
  try { localStorage.setItem(KEY, c); } catch { /* storage blocked: ask again next visit */ }
}

function load() {
  if (loaded || !MEASUREMENT_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  const gtag: (...args: any[]) => void = function gtag() { window.dataLayer.push(arguments); } as any;
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, { app_name: 'Brick' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);
  for (const [name, params] of queue.splice(0)) gtag('event', name, params);
}

/** Records a usage event. Kept in memory until consent, dropped if the visitor refuses. */
export function track(name: string, params: Record<string, unknown> = {}) {
  if (loaded && window.gtag) window.gtag('event', name, params);
  else if (readConsent() === null && queue.length < 50) queue.push([name, params]);
}

const TEXT: Record<Lang, { msg: string; yes: string; no: string; more: string }> = {
  fr: {
    msg: 'Brick mesure son audience (pages vues, pays, sets consultés) avec Google Analytics, uniquement si tu es d’accord.',
    yes: 'Accepter', no: 'Refuser', more: 'En savoir plus',
  },
  en: {
    msg: 'Brick measures its audience (page views, countries, sets opened) with Google Analytics, only if you agree.',
    yes: 'Accept', no: 'Decline', more: 'Learn more',
  },
  es: {
    msg: 'Brick mide su audiencia (páginas vistas, países, sets consultados) con Google Analytics, solo si estás de acuerdo.',
    yes: 'Aceptar', no: 'Rechazar', more: 'Más información',
  },
};

function banner() {
  if (!MEASUREMENT_ID || document.getElementById('consent')) return;
  const t = TEXT[detectLang()];
  const el = document.createElement('div');
  el.id = 'consent';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Cookies');
  el.innerHTML = `
    <p>${t.msg} <a href="/#privacy">${t.more}</a></p>
    <div class="consent-actions">
      <button type="button" data-c="denied">${t.no}</button>
      <button type="button" data-c="granted">${t.yes}</button>
    </div>`;
  const style = document.createElement('style');
  style.textContent = `
    #consent { position: fixed; z-index: 50; left: max(12px, env(safe-area-inset-left)); right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom)); max-width: 560px; margin-inline: auto; padding: 14px 16px;
      background: #141a22; color: #f3f6fa; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.25);
      font: 14px/1.45 system-ui, sans-serif; display: grid; gap: 10px; }
    #consent p { margin: 0; } #consent a { color: inherit; }
    .consent-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .consent-actions button { flex: 1 1 0; max-width: 160px; padding: 9px 12px; border-radius: 8px; font: inherit; font-weight: 700;
      cursor: pointer; border: 1.5px solid #f3f6fa; background: transparent; color: inherit; }
    .consent-actions button[data-c="granted"] { background: #f3f6fa; color: #141a22; }`;
  el.prepend(style);
  el.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest('button')?.dataset.c as Consent | undefined;
    if (!c) return;
    writeConsent(c);
    el.remove();
    if (c === 'granted') load();
    else { queue.length = 0; deleteGaCookies(); }
  });
  document.body.appendChild(el);
}

function deleteGaCookies() {
  const host = location.hostname;
  const domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (!name.startsWith('_ga')) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? '; domain=' + d : ''}`;
  }
}

export function initAnalytics() {
  const c = readConsent();
  if (c === 'granted') load();
  else if (c === null) banner();
}

/** "Manage cookies" link: forget the choice and ask again. */
export function reopenConsent() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  if (loaded) { location.reload(); return; }
  banner();
}
