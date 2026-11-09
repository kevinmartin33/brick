// What the app says out loud for a step.

export interface SpokenGroup { count: number; word: string; dims: string; colour: string }

function plural(word: string, count: number): string {
  if (count < 2 || /[sxz]$/.test(word) || word.includes(' ')) return word;
  return word + 's';
}

export function partsSentence(groups: SpokenGroup[], max = 4): string {
  const items = groups.slice(0, max).map((g) => {
    const dims = g.dims ? ' ' + g.dims.replace(/×/g, ' par ') : '';
    return `${g.count} ${plural(g.word, g.count)}${dims}${g.colour ? ' ' + g.colour : ''}`;
  });
  const rest = groups.slice(max).reduce((s, g) => s + g.count, 0);
  if (rest) items.push(`${rest} autre${rest > 1 ? 's' : ''} pièce${rest > 1 ? 's' : ''}`);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1];
}

export function stepNarration(o: {
  n: number; total: number; kind: 'parts' | 'attach'; subName?: string; startsSub?: string | null; groups: SpokenGroup[];
}): string {
  const head = o.n === o.total ? `Dernière étape, ${o.n}.` : `Étape ${o.n}.`;
  if (o.kind === 'attach') return `${head} Fixe le sous-ensemble ${o.subName}.`;
  const intro = o.startsSub ? ` Nouveau sous-ensemble : ${o.startsSub}.` : '';
  const list = partsSentence(o.groups);
  return `${head}${intro}${list ? ` Ajoute ${list}.` : ''}`;
}
