import './style.css';
import { CATALOG } from '../catalog';
import { loadModel, type LoadedModel, type PartInfo, type SubAssembly } from '../ldraw/model';
import { groupParts, modelAuthor } from '../ldraw/meta';
import { partsSentence, stepNarration } from '../narration';
import { Viewer } from '../viewer';
import { Speaker } from '../voice/speaker';
import { VoiceControl, type VoiceState } from '../voice/listener';
import { COMMAND_HELP, parseCommand, type Command } from '../voice/commands';
import { getPrefs, getProgress, setPrefs, setProgress } from '../storage';
import { initAnalytics, track } from '../shared/analytics';
import { detectLang, LEGO_LOCALE, saveLang, type Lang } from '../shared/i18n';
import { APP_STRINGS } from './strings';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

let lang: Lang = detectLang();
const t = (key: string, vars: Record<string, string | number> = {}) =>
  (APP_STRINGS[lang][key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const viewer = new Viewer($('stage'), $<HTMLCanvasElement>('c'));
const speaker = new Speaker(lang);
const voice = new VoiceControl(lang);
let voiceState: VoiceState = 'off';
let author = '';

let model: LoadedModel | null = null;
let current = 0;
let loadToken = 0;
let lastShown: { fresh: PartInfo[]; ctx: SubAssembly | null; attach: SubAssembly | null } | null = null;
let completed = false;

/** /build/7140 (or the older ?set=7140) */
function setIdFromUrl(): string | null {
  const m = location.pathname.match(/^\/build\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : new URLSearchParams(location.search).get('set');
}

/* ---------------- preferences ---------------- */
const prefs = getPrefs();
const optNarrate = $<HTMLInputElement>('optNarrate');
const optGhost = $<HTMLInputElement>('optGhost');
const optDrop = $<HTMLInputElement>('optDrop');
const optSpin = $<HTMLInputElement>('optSpin');
optNarrate.checked = prefs.narrate;
optGhost.checked = viewer.dim = prefs.dim;
optDrop.checked = viewer.animate = prefs.animate;

/* ---------------- loading ---------------- */
async function openSet(id: string, text?: string, label?: string) {
  const token = ++loadToken;
  const loading = $('loading');
  loading.hidden = false;
  loading.textContent = t('loading');
  $('resume').hidden = true;
  try {
    let src = text;
    if (!src) {
      const entry = CATALOG.find((c) => c.id === id) ?? CATALOG[0];
      id = entry.id;
      const res = await fetch(entry.file);
      if (!res.ok) throw new Error(t('server_error', { status: res.status }));
      src = await res.text();
    }
    if (token !== loadToken) return;
    loading.textContent = t('assembling');
    const m = await loadModel(src, id);
    if (token !== loadToken) return;
    model = m;
    viewer.setModel(m);
    author = modelAuthor(src);
    renderMeta();
    $('invCount').textContent = `· ${m.parts.length}`;
    $('invParts').innerHTML = '';
    if (($('inv') as HTMLDetailsElement).open) renderInventory();
    $<HTMLInputElement>('slider').max = String(m.steps.length - 1);
    loading.hidden = true;
    const entry = CATALOG.find((c) => c.id === id);
    document.title = `${label ?? (entry ? `${entry.number} ${entry.name}` : id)} · Brick`;
    completed = false;
    track(text ? 'file_open' : 'guide_open', { set_number: text ? 'file' : id, steps: m.steps.length });

    const fromUrl = Number(new URLSearchParams(location.search).get('step'));
    const saved = text ? null : getProgress(id);
    if (fromUrl >= 1 && fromUrl <= m.steps.length) goTo(fromUrl - 1, false, true);
    else {
      goTo(0, false, true);
      if (saved && saved > 0 && saved < m.steps.length) {
        $('resumeText').textContent = t('resume_text', { n: saved + 1, total: m.steps.length });
        $('resume').hidden = false;
      }
    }
  } catch (err) {
    console.error(err);
    loading.textContent = t('open_error', { msg: (err as Error).message });
  }
}

function renderMeta() {
  if (!model) return;
  const m = model;
  $('author').textContent = author ? t('by_author', { name: author }) : '';
  $('meta').innerHTML =
    `<span>${esc(t('meta_parts', { n: m.parts.length }))}</span><span>${esc(t('meta_steps', { n: m.steps.length }))}</span>` +
    (m.subs.length ? `<span>${esc(t('meta_subs', { n: m.subs.length }))}</span>` : '') +
    `<span class="chip ${m.generated ? 'auto' : ''}">${esc(t(m.generated ? 'steps_generated' : 'steps_original'))}</span>`;
}

/* ---------------- steps ---------------- */
function goTo(n: number, animate = true, quiet = false) {
  if (!model) return;
  n = Math.max(0, Math.min(model.steps.length - 1, n));
  current = n;
  lastShown = viewer.show(n, animate);
  const { ctx, attach, fresh } = lastShown;

  const label = $('ctx');
  label.hidden = !(ctx || attach);
  if (attach) label.innerHTML = `${esc(t('ctx_attach'))} <b>${esc(attach.name)}</b>`;
  else if (ctx) label.innerHTML = `${esc(t('ctx_sub'))} <b>${esc(ctx.name)}</b>`;

  $('stepBig').textContent = String(n + 1);
  $('stepOf').textContent = `/ ${model.steps.length}`;
  $<HTMLInputElement>('slider').value = String(n);
  $<HTMLButtonElement>('prev').disabled = n === 0;
  $<HTMLButtonElement>('next').disabled = n === model.steps.length - 1;
  if (attach) renderAttach(attach);
  else renderParts(fresh);

  const isFile = model.id.startsWith('file:');
  if (!quiet && !isFile) setProgress(model.id, n);
  if (!quiet) {
    $('resume').hidden = true;
    track('step_view', { set_number: isFile ? 'file' : model.id, step: n + 1 });
    if (n === model.steps.length - 1 && !completed) {
      completed = true;
      track('guide_complete', { set_number: isFile ? 'file' : model.id, steps: model.steps.length });
    }
  }
  history.replaceState(null, '', `/build/${isFile ? '' : encodeURIComponent(model.id)}?step=${n + 1}`);

  if (!quiet && (optNarrate.checked || voice.active)) narrate();
}

function narrate() {
  if (!model || !lastShown) return;
  const { fresh, ctx, attach } = lastShown;
  speaker.speak(stepNarration({
    n: current + 1,
    total: model.steps.length,
    kind: attach ? 'attach' : 'parts',
    subName: attach?.name,
    startsSub: ctx && ctx.firstIdx === current ? ctx.name : null,
    groups: groupParts(fresh, model.meta, lang).map((g) => ({ count: g.count, word: g.word, dims: g.dims, colour: g.colour })),
    lang,
  }));
}

function partItem(g: ReturnType<typeof groupParts<PartInfo>>[number]) {
  const li = document.createElement('li');
  li.className = 'part';
  li.title = `${g.en} — ${g.ref}`;
  const name = g.label.charAt(0).toUpperCase() + g.label.slice(1);
  li.innerHTML = `<div class="thumb"></div><div class="qty">${g.count}×</div>` +
    `<div class="name"><span class="sw" style="background:${g.hex}"></span>${esc(name)} ${esc(g.colour)}</div>` +
    `<div class="ref">${esc(g.ref)}</div>`;
  const img = new Image();
  img.alt = '';
  img.src = viewer.thumbnail(g.sample.obj, g.key);
  li.querySelector('.thumb')!.appendChild(img);
  return li;
}

function renderParts(fresh: PartInfo[]) {
  const groups = groupParts(fresh, model!.meta, lang);
  $('calloutTitle').textContent = t('step_parts');
  $('calloutCount').textContent = t(fresh.length > 1 ? 'parts_many' : 'parts_one', { n: fresh.length });
  $('stepParts').replaceChildren(...groups.map(partItem));
}

function renderAttach(S: SubAssembly) {
  $('calloutTitle').textContent = t('attach_title');
  $('calloutCount').textContent = '';
  const li = document.createElement('li');
  li.className = 'part sub';
  li.innerHTML = `<div class="thumb"></div><div class="name">${esc(S.name)}</div>`;
  const img = new Image();
  img.alt = '';
  img.src = viewer.thumbnail(S.obj, S.key);
  li.querySelector('.thumb')!.appendChild(img);
  $('stepParts').replaceChildren(li);
}

function renderInventory() {
  if (!model || $('invParts').childElementCount) return;
  const groups = groupParts(model.parts, model.meta, lang);
  const ul = $('invParts');
  const token = loadToken;
  let i = 0;
  (function chunk() {
    if (token !== loadToken) return;
    for (let k = 0; k < 8 && i < groups.length; k++, i++) ul.appendChild(partItem(groups[i]));
    if (i < groups.length) setTimeout(chunk, 16);
  })();
}

/* ---------------- voice ---------------- */
let toastTimer = 0;
function toast(html: string, miss = false) {
  const t = $('toast');
  t.innerHTML = html;
  t.classList.toggle('miss', miss);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { t.hidden = true; }, 2200);
}

function run(cmd: Command) {
  if (!model) return;
  const last = model.steps.length - 1;
  switch (cmd.type) {
    case 'next':
      if (current === last) speaker.speak(t('say_last'));
      else goTo(current + 1);
      break;
    case 'prev': goTo(current - 1); break;
    case 'goto': goTo(cmd.step - 1); break;
    case 'first': goTo(0); break;
    case 'last': goTo(last); break;
    case 'repeat': narrate(); break;
    case 'parts': {
      const fresh = lastShown?.fresh ?? [];
      const s = partsSentence(groupParts(fresh, model.meta, lang).map((g) => ({ count: g.count, word: g.word, dims: g.dims, colour: g.colour })), 8, lang);
      speaker.speak(s ? t('say_take', { list: s }) : t('say_no_parts'));
      break;
    }
    case 'zoomIn': viewer.zoom(0.7); break;
    case 'zoomOut': viewer.zoom(1.4); break;
    case 'rotateLeft': viewer.rotate(-45); break;
    case 'rotateRight': viewer.rotate(45); break;
    case 'spin': viewer.setSpin(!viewer.spinning); optSpin.checked = viewer.spinning; break;
    case 'reset': viewer.setSpin(false); optSpin.checked = false; viewer.reset(); break;
    case 'stop': speaker.stop(); viewer.setSpin(false); optSpin.checked = false; break;
    case 'help':
      speaker.speak(t('say_help'));
      break;
  }
}

const voiceBtn = $<HTMLButtonElement>('voiceBtn');
function renderVoice(detail?: string) {
  const on = voice.active;
  voiceBtn.setAttribute('aria-pressed', String(on));
  voiceBtn.classList.toggle('paused', voiceState === 'paused');
  $('voiceLabel').textContent = t(on ? 'voice_btn_on' : 'voice_btn');
  $('voiceStatus').textContent = t(`st_${voiceState}`) + (voiceState === 'error' && detail ? ` (${detail})` : '');
  if (!on) $('heard').hidden = true;
}
voice.onState = (s, detail) => {
  voiceState = s;
  renderVoice(detail);
};
voice.onCommand = (cmd, heard) => {
  toast(`<q>${esc(heard)}</q>`);
  $('heard').hidden = true;
  track('voice_command', { command: cmd.type }); // the command type only, never what was said
  run(cmd);
};
voice.onUnknown = (heard) => {
  if (!heard) return;
  track('voice_unrecognized');
  $('heard').textContent = t('heard_unknown', { t: heard });
  $('heard').hidden = false;
};
speaker.onStart = () => voice.pause();
speaker.onEnd = () => voice.resume();

voiceBtn.addEventListener('click', () => {
  if (voice.active) { voice.stop(); releaseWakeLock(); return; }
  if (!voice.supported) { voice.onState?.('unsupported'); return; }
  voice.start();
  track('voice_on');
  keepAwake();
  speaker.speak(t('say_start'));
});

/* ---------------- keep the screen on while building ---------------- */
let wakeLock: { release(): Promise<void> } | null = null;
async function keepAwake() {
  try {
    wakeLock = await (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } })
      .wakeLock?.request('screen') ?? null;
  } catch { /* not allowed here: the screen may dim */ }
}
function releaseWakeLock() { wakeLock?.release().catch(() => {}); wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && voice.active) keepAwake();
});

/* ---------------- controls ---------------- */
const setSel = $<HTMLSelectElement>('setSel');
setSel.innerHTML = CATALOG.map((c) => `<option value="${c.id}">${c.number} · ${esc(c.name)}</option>`).join('');
setSel.addEventListener('change', () => {
  if (setSel.value === 'file') return;
  history.pushState(null, '', `/build/${encodeURIComponent(setSel.value)}`);
  openSet(setSel.value);
});
$<HTMLInputElement>('fileIn').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const text = await f.text();
  if (![...setSel.options].some((o) => o.value === 'file')) setSel.add(new Option(t('file_option', { name: f.name }), 'file'));
  else setSel.querySelector<HTMLOptionElement>('option[value=file]')!.text = t('file_option', { name: f.name });
  setSel.value = 'file';
  history.pushState(null, '', '/build/');
  openSet(`file:${f.name}`, text, f.name);
});
$('prev').addEventListener('click', () => goTo(current - 1));
$('next').addEventListener('click', () => goTo(current + 1));
$<HTMLInputElement>('slider').addEventListener('input', (e) => goTo(Number((e.target as HTMLInputElement).value), false));
$('resumeGo').addEventListener('click', () => {
  const s = model ? getProgress(model.id) : null;
  if (s !== null) goTo(s, false);
});
$('resumeReset').addEventListener('click', () => { if (model) { setProgress(model.id, 0); goTo(0, false); } });
$('zoomIn').addEventListener('click', () => viewer.zoom(0.7));
$('zoomOut').addEventListener('click', () => viewer.zoom(1.4));
$('recenter').addEventListener('click', () => viewer.reset());

optNarrate.addEventListener('change', () => { setPrefs({ narrate: optNarrate.checked }); if (optNarrate.checked) narrate(); else speaker.stop(); });
optGhost.addEventListener('change', () => { viewer.dim = optGhost.checked; setPrefs({ dim: optGhost.checked }); goTo(current, false, true); });
optDrop.addEventListener('change', () => { viewer.animate = optDrop.checked; setPrefs({ animate: optDrop.checked }); });
optSpin.addEventListener('change', () => viewer.setSpin(optSpin.checked));
$('inv').addEventListener('toggle', () => { if (($('inv') as HTMLDetailsElement).open) renderInventory(); });

addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('select, input, textarea')) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
});

/* ---------------- language ---------------- */
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria!)));
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle!); });
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  $<HTMLAnchorElement>('legoLink').href = `https://www.lego.com/${LEGO_LOCALE[lang]}/service/building-instructions`;
  $('cmds').innerHTML = COMMAND_HELP[lang].map((c) => `<dt><q>${esc(c.say)}</q></dt><dd>${esc(c.does)}</dd>`).join('');
  renderVoice();
  if (model) {
    renderMeta();
    $('invParts').innerHTML = '';
    if (($('inv') as HTMLDetailsElement).open) renderInventory();
    goTo(current, false, true);
    const saved = getProgress(model.id);
    if (!$('resume').hidden && saved !== null) $('resumeText').textContent = t('resume_text', { n: saved + 1, total: model.steps.length });
  }
}
document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.lang === lang) return;
  lang = b.dataset.lang as Lang;
  saveLang(lang);
  speaker.setLang(lang);
  voice.setLang(lang);
  applyLang();
  track('select_language', { language: lang });
}));
applyLang();

/* ---------------- start ---------------- */
function openFromUrl() {
  const id = setIdFromUrl();
  const start = CATALOG.find((c) => c.id === id) ?? CATALOG[0];
  setSel.value = start.id;
  openSet(start.id);
}
addEventListener('popstate', openFromUrl);
initAnalytics();
openFromUrl();

// Dev only: simulate what the recogniser heard, e.g. __brick.hear('étape 12'), to test without a mic.
if (import.meta.env.DEV) {
  (window as unknown as { __brick: unknown }).__brick = {
    hear(text: string) {
      const c = parseCommand(text, lang);
      if (c) voice.onCommand?.(c, text);
      else voice.onUnknown?.(text);
    },
  };
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* offline mode unavailable */ });
}
