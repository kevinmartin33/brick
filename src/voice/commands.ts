// Maps what the speech recogniser heard (French) to an app command.

export type Command =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goto'; step: number }
  | { type: 'first' }
  | { type: 'last' }
  | { type: 'repeat' }
  | { type: 'parts' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'rotateLeft' }
  | { type: 'rotateRight' }
  | { type: 'spin' }
  | { type: 'reset' }
  | { type: 'stop' }
  | { type: 'help' };

const NUMBERS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix-sept': 17, 'dix-huit': 18,
  'dix-neuf': 19, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100,
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (t: string, words: string[]) => words.some((w) => new RegExp(`(^| )${w}( |$)`).test(t));

export function parseCommand(raw: string): Command | null {
  const t = normalize(raw);
  if (!t) return null;

  const go = t.match(/(?:^| )(?:etape|page|numero)(?: numero)? (\d+|[a-z-]+)(?: |$)/);
  if (go) {
    const n = /^\d+$/.test(go[1]) ? Number(go[1]) : NUMBERS[go[1]];
    if (n) return { type: 'goto', step: n };
  }
  if (has(t, ['debut', 'premiere etape', 'recommence', 'recommencer'])) return { type: 'first' };
  if (has(t, ['derniere etape', 'la fin', 'a la fin'])) return { type: 'last' };
  if (has(t, ['stop', 'silence', 'chut', 'tais toi', 'arrete', 'pause'])) return { type: 'stop' };
  if (has(t, ['aide', 'commandes', 'que dire', 'qu est-ce que je peux dire'])) return { type: 'help' };
  if (has(t, ['pieces', 'piece', 'liste', 'inventaire', 'quoi prendre'])) return { type: 'parts' };
  if (has(t, ['repete', 'repeter', 'encore', 'redis', 'pardon', 'quoi', 'comment'])) return { type: 'repeat' };
  if (has(t, ['precedent', 'precedente', 'retour', 'reviens', 'en arriere', 'back'])) return { type: 'prev' };
  if (has(t, ['suivant', 'suivante', 'next', 'apres', 'continue', 'continuer', 'c est bon', 'c est fait', 'j ai fini', 'fini', 'termine', 'vas-y', 'go', 'ensuite'])) return { type: 'next' };
  if (/^(ok|okay|oui|d accord)$/.test(t)) return { type: 'next' };
  if (has(t, ['dezoome', 'dezoomer', 'recule', 'eloigne', 'plus loin', 'moins pres'])) return { type: 'zoomOut' };
  if (has(t, ['zoom', 'zoome', 'zoomer', 'rapproche', 'plus pres', 'agrandis'])) return { type: 'zoomIn' };
  if (has(t, ['tourne', 'tourner', 'pivote', 'rotation'])) {
    if (has(t, ['gauche'])) return { type: 'rotateLeft' };
    if (has(t, ['droite'])) return { type: 'rotateRight' };
    return { type: 'spin' };
  }
  if (has(t, ['recentre', 'centre', 'reinitialise', 'vue normale', 'vue d ensemble'])) return { type: 'reset' };
  return null;
}

export const COMMAND_HELP: { say: string; does: string }[] = [
  { say: 'suivant · c’est bon · après', does: 'étape suivante' },
  { say: 'précédent · retour', does: 'étape précédente' },
  { say: 'étape 12', does: 'aller à une étape' },
  { say: 'répète', does: 'relire l’étape' },
  { say: 'pièces', does: 'lire les pièces à prendre' },
  { say: 'zoom · recule', does: 'rapprocher ou éloigner la vue' },
  { say: 'tourne à gauche · à droite', does: 'pivoter le modèle' },
  { say: 'tourne', does: 'rotation automatique' },
  { say: 'recentre', does: 'revenir à la vue de départ' },
  { say: 'stop', does: 'couper la voix' },
];
