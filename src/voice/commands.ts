// Maps what the speech recogniser heard to an app command, in French, English or Spanish.

import type { Lang } from '../shared/i18n';

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

/** Words and phrases are written without accents (see normalize). `*Exact` only match the whole utterance. */
interface Vocab {
  stepWords: string[];
  numbers: Record<string, number>;
  first: string[];
  last: string[];
  stop: string[];
  stopExact: string[];
  help: string[];
  parts: string[];
  repeat: string[];
  repeatExact: string[];
  prev: string[];
  next: string[];
  nextExact: string[];
  zoomOut: string[];
  zoomIn: string[];
  rotate: string[];
  left: string[];
  right: string[];
  reset: string[];
}

const VOCAB: Record<Lang, Vocab> = {
  fr: {
    stepWords: ['etape', 'page', 'numero'],
    numbers: {
      un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
      onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, 'dix-sept': 17, 'dix-huit': 18,
      'dix-neuf': 19, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100,
    },
    first: ['debut', 'premiere etape', 'recommence', 'recommencer'],
    last: ['derniere etape', 'la fin', 'a la fin'],
    stop: ['stop', 'silence', 'chut', 'tais toi', 'arrete', 'pause'],
    stopExact: [],
    help: ['aide', 'commandes', 'que dire', 'qu est-ce que je peux dire'],
    parts: ['pieces', 'piece', 'liste', 'inventaire', 'quoi prendre'],
    repeat: ['repete', 'repeter', 'encore', 'redis', 'pardon'],
    repeatExact: ['quoi', 'comment'],
    prev: ['precedent', 'precedente', 'retour', 'reviens', 'en arriere', 'back'],
    next: ['suivant', 'suivante', 'next', 'apres', 'continue', 'continuer', 'c est bon', 'c est fait', 'j ai fini', 'fini', 'termine', 'vas-y', 'go', 'ensuite'],
    nextExact: ['ok', 'okay', 'oui', 'd accord'],
    zoomOut: ['dezoome', 'dezoomer', 'recule', 'eloigne', 'plus loin', 'moins pres'],
    zoomIn: ['zoom', 'zoome', 'zoomer', 'rapproche', 'plus pres', 'agrandis'],
    rotate: ['tourne', 'tourner', 'pivote', 'rotation'],
    left: ['gauche'],
    right: ['droite'],
    reset: ['recentre', 'centre', 'reinitialise', 'vue normale', 'vue d ensemble'],
  },
  en: {
    stepWords: ['step', 'page', 'go to step', 'go to page', 'number'],
    numbers: {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
      eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100,
      to: 2, too: 2, for: 4, // common mishearings after "step"
    },
    first: ['start over', 'first step', 'restart', 'from the beginning', 'beginning'],
    last: ['last step', 'the end', 'final step'],
    stop: ['stop', 'quiet', 'silence', 'pause', 'shut up', 'be quiet'],
    stopExact: [],
    help: ['help', 'commands', 'what can i say'],
    parts: ['parts', 'pieces', 'which parts', 'what do i need', 'part list'],
    repeat: ['repeat', 'again', 'say again', 'say that again', 'pardon', 'come again'],
    repeatExact: ['what', 'sorry'],
    prev: ['previous', 'back', 'go back', 'last one', 'undo'],
    next: ['next', 'done', 'continue', 'go on', 'finished', 'got it', 'forward', 'keep going', 'move on'],
    nextExact: ['ok', 'okay', 'yes', 'yep', 'alright'],
    zoomOut: ['zoom out', 'further', 'farther', 'move away', 'wider'],
    zoomIn: ['zoom in', 'zoom', 'closer', 'get closer'],
    rotate: ['rotate', 'turn', 'spin'],
    left: ['left'],
    right: ['right'],
    reset: ['reset', 'reset view', 'recenter', 'recentre', 'center', 'centre'],
  },
  es: {
    stepWords: ['paso', 'etapa', 'pagina', 've al paso', 'numero'],
    numbers: {
      uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
      once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
      diecinueve: 19, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, cien: 100,
    },
    first: ['empezar de nuevo', 'primer paso', 'desde el principio', 'al principio', 'reiniciar', 'reinicia'],
    last: ['ultimo paso', 'al final', 'el final'],
    stop: ['silencio', 'basta', 'calla', 'callate', 'pausa', 'stop'],
    stopExact: ['para', 'parar', 'detente'],
    help: ['ayuda', 'comandos', 'que puedo decir'],
    parts: ['piezas', 'pieza', 'lista', 'que necesito'],
    repeat: ['repite', 'repetir', 'otra vez', 'de nuevo', 'perdon'],
    repeatExact: ['que', 'como'],
    prev: ['anterior', 'atras', 'volver', 'vuelve', 'regresa'],
    next: ['siguiente', 'sigue', 'seguir', 'listo', 'hecho', 'ya esta', 'adelante', 'continua', 'continuar', 'termine'],
    nextExact: ['vale', 'ok', 'si', 'bueno', 'venga'],
    zoomOut: ['aleja', 'alejate', 'mas lejos', 'reduce', 'alejar'],
    zoomIn: ['acerca', 'acercate', 'zoom', 'mas cerca', 'amplia', 'acercar'],
    rotate: ['gira', 'girar', 'rota', 'rotar', 'da la vuelta'],
    left: ['izquierda'],
    right: ['derecha'],
    reset: ['centra', 'centrar', 'recentra', 'restablece', 'vista inicial'],
  },
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

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (t: string, words: string[]) => words.some((w) => new RegExp(`(^| )${esc(w)}( |$)`).test(t));
const is = (t: string, words: string[]) => words.includes(t);

export function parseCommand(raw: string, lang: Lang = 'fr'): Command | null {
  const v = VOCAB[lang];
  const t = normalize(raw);
  if (!t) return null;

  const go = t.match(new RegExp(`(?:^| )(?:${v.stepWords.map(esc).join('|')})(?: (?:numero|number))? (\\d+|[a-z-]+)(?: |$)`));
  if (go) {
    const n = /^\d+$/.test(go[1]) ? Number(go[1]) : v.numbers[go[1]];
    if (n) return { type: 'goto', step: n };
  }
  if (has(t, v.first)) return { type: 'first' };
  if (has(t, v.last)) return { type: 'last' };
  if (has(t, v.stop) || is(t, v.stopExact)) return { type: 'stop' };
  if (has(t, v.help)) return { type: 'help' };
  if (has(t, v.parts)) return { type: 'parts' };
  if (has(t, v.repeat) || is(t, v.repeatExact)) return { type: 'repeat' };
  if (has(t, v.zoomOut)) return { type: 'zoomOut' };
  if (has(t, v.prev)) return { type: 'prev' };
  if (has(t, v.next) || is(t, v.nextExact)) return { type: 'next' };
  if (has(t, v.zoomIn)) return { type: 'zoomIn' };
  if (has(t, v.rotate)) {
    if (has(t, v.left)) return { type: 'rotateLeft' };
    if (has(t, v.right)) return { type: 'rotateRight' };
    return { type: 'spin' };
  }
  if (has(t, v.reset)) return { type: 'reset' };
  return null;
}

export const COMMAND_HELP: Record<Lang, { say: string; does: string }[]> = {
  fr: [
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
  ],
  en: [
    { say: 'next · done · continue', does: 'next step' },
    { say: 'back · previous', does: 'previous step' },
    { say: 'step 12', does: 'go to a step' },
    { say: 'repeat', does: 'read the step again' },
    { say: 'parts', does: 'read the parts to take' },
    { say: 'zoom in · zoom out', does: 'move the view closer or further' },
    { say: 'turn left · turn right', does: 'rotate the model' },
    { say: 'spin', does: 'automatic rotation' },
    { say: 'recenter', does: 'back to the starting view' },
    { say: 'stop', does: 'stop talking' },
  ],
  es: [
    { say: 'siguiente · listo · vale', does: 'paso siguiente' },
    { say: 'anterior · atrás', does: 'paso anterior' },
    { say: 'paso 12', does: 'ir a un paso' },
    { say: 'repite', does: 'volver a leer el paso' },
    { say: 'piezas', does: 'leer las piezas que hay que coger' },
    { say: 'acerca · aleja', does: 'acercar o alejar la vista' },
    { say: 'gira a la izquierda · a la derecha', does: 'girar el modelo' },
    { say: 'gira', does: 'rotación automática' },
    { say: 'centra', does: 'volver a la vista inicial' },
    { say: 'para · silencio', does: 'dejar de hablar' },
  ],
};
