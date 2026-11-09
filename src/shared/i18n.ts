// Language choice shared by the site and the app: saved choice, else browser languages, else English.

export const LANGS = ['en', 'fr', 'es'] as const;
export type Lang = (typeof LANGS)[number];
const KEY = 'brick:lang';

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null;
    if (saved && LANGS.includes(saved)) return saved;
  } catch { /* storage blocked */ }
  for (const l of navigator.languages ?? [navigator.language]) {
    const short = l.slice(0, 2).toLowerCase() as Lang;
    if (LANGS.includes(short)) return short;
  }
  return 'en';
}

export function saveLang(lang: Lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked */ }
}

/** speech recognition / synthesis locale */
export const SPEECH_LOCALE: Record<Lang, string> = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' };

/** lego.com locale used for "official instructions" links */
export const LEGO_LOCALE: Record<Lang, string> = { en: 'en-us', fr: 'fr-fr', es: 'es-es' };

export function officialInstructionsUrl(lang: Lang, setNumber: string) {
  return `https://www.lego.com/${LEGO_LOCALE[lang]}/service/building-instructions/${encodeURIComponent(setNumber)}`;
}
