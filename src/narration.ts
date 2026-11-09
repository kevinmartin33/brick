// What the app says out loud for a step, in French, English or Spanish.

import type { Lang } from './shared/i18n';

export interface SpokenGroup { count: number; word: string; dims: string; colour: string }

function plural(word: string, count: number, lang: Lang): string {
  if (count < 2 || word.includes(' ')) return word;
  if (lang === 'es') return /[aeiouáéó]$/.test(word) ? word + 's' : word.replace(/á(?=n$)/, 'a').replace(/ó(?=n$)/, 'o') + 'es';
  if (lang === 'en') return /(s|x|ch|sh)$/.test(word) ? word + 'es' : word + 's';
  return /[sxz]$/.test(word) ? word : word + 's';
}

const BY: Record<Lang, string> = { fr: ' par ', en: ' by ', es: ' por ' };

function item(g: SpokenGroup, lang: Lang): string {
  const dims = g.dims ? g.dims.replace(/×/g, BY[lang]) : '';
  const word = plural(g.word, g.count, lang);
  if (lang === 'en') return `${g.count} ${g.colour ? g.colour + ' ' : ''}${word}${dims ? ', ' + dims : ''}`;
  return `${g.count} ${word}${dims ? ' ' + dims : ''}${g.colour ? ' ' + g.colour : ''}`;
}

const T = {
  fr: { and: 'et', others: (n: number) => `${n} autre${n > 1 ? 's' : ''} pièce${n > 1 ? 's' : ''}`,
    head: (n: number, last: boolean) => (last ? `Dernière étape, ${n}.` : `Étape ${n}.`),
    attach: (s: string) => `Fixe le sous-ensemble ${s}.`, newSub: (s: string) => `Nouveau sous-ensemble : ${s}.`,
    add: (l: string) => `Ajoute ${l}.` },
  en: { and: 'and', others: (n: number) => `${n} other part${n > 1 ? 's' : ''}`,
    head: (n: number, last: boolean) => (last ? `Last step, ${n}.` : `Step ${n}.`),
    attach: (s: string) => `Attach the ${s} sub-assembly.`, newSub: (s: string) => `New sub-assembly: ${s}.`,
    add: (l: string) => `Add ${l}.` },
  es: { and: 'y', others: (n: number) => `${n} pieza${n > 1 ? 's' : ''} más`,
    head: (n: number, last: boolean) => (last ? `Último paso, ${n}.` : `Paso ${n}.`),
    attach: (s: string) => `Fija el subconjunto ${s}.`, newSub: (s: string) => `Nuevo subconjunto: ${s}.`,
    add: (l: string) => `Añade ${l}.` },
} satisfies Record<Lang, unknown>;

export function partsSentence(groups: SpokenGroup[], max = 4, lang: Lang = 'fr'): string {
  const items = groups.slice(0, max).map((g) => item(g, lang));
  const rest = groups.slice(max).reduce((s, g) => s + g.count, 0);
  if (rest) items.push(T[lang].others(rest));
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  const sep = lang === 'en' ? '; ' : ', ';
  return items.slice(0, -1).join(sep) + ` ${T[lang].and} ` + items[items.length - 1];
}

export function stepNarration(o: {
  n: number; total: number; kind: 'parts' | 'attach'; subName?: string; startsSub?: string | null;
  groups: SpokenGroup[]; lang?: Lang;
}): string {
  const lang = o.lang ?? 'fr';
  const t = T[lang];
  const head = t.head(o.n, o.n === o.total);
  if (o.kind === 'attach') return `${head} ${t.attach(o.subName ?? '')}`;
  const intro = o.startsSub ? ` ${t.newSub(o.startsSub)}` : '';
  const list = partsSentence(o.groups, 4, lang);
  return `${head}${intro}${list ? ` ${t.add(list)}` : ''}`;
}
