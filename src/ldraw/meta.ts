// Text-level helpers for packed LDraw files: part descriptions, colour table, localized labels.

import type { Lang } from '../shared/i18n';

export interface LDrawColour { name: string; hex: string }
export interface Meta {
  /** lower-cased "0 FILE" name -> description line that follows it */
  desc: Record<string, string>;
  /** LDraw colour code -> colour */
  colors: Record<string, LDrawColour>;
}

export function parseMeta(text: string): Meta {
  const desc: Record<string, string> = {};
  const colors: Record<string, LDrawColour> = {};
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('0 FILE ')) {
      desc[l.slice(7).trim().toLowerCase()] = (lines[i + 1] || '').replace(/^0\s+/, '').trim();
    } else if (l.includes('!COLOUR')) {
      const m = l.match(/!COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+(#[0-9A-Fa-f]{6})/);
      if (m) colors[m[2]] = { name: m[1], hex: m[3] };
    }
  }
  return { desc, colors };
}

/* ---------- colours (LDraw names -> spoken names) ---------- */

const COLORS: Record<Lang, Record<string, string>> = {
  fr: {
    Black: 'noir', Blue: 'bleu', Green: 'vert', Red: 'rouge', White: 'blanc', Yellow: 'jaune', Orange: 'orange',
    Brown: 'marron', Tan: 'beige', Dark_Tan: 'beige foncé', Light_Grey: 'gris clair', Dark_Grey: 'gris foncé',
    Light_Bluish_Grey: 'gris clair', Dark_Bluish_Grey: 'gris foncé', Reddish_Brown: 'brun', Dark_Red: 'rouge foncé',
    Dark_Blue: 'bleu foncé', Medium_Blue: 'bleu moyen', Light_Blue: 'bleu clair', Lime: 'vert citron', Sand_Green: 'vert sable',
    Dark_Green: 'vert foncé', Bright_Green: 'vert vif', Pearl_Light_Grey: 'gris perle', Flat_Silver: 'argent',
    Metallic_Silver: 'argent', Chrome_Silver: 'chrome', Chrome_Gold: 'or', Pearl_Gold: 'or', Trans_Clear: 'transparent',
    Trans_Red: 'rouge transparent', Trans_Yellow: 'jaune transparent', Trans_Dark_Blue: 'bleu transparent',
    Trans_Light_Blue: 'bleu clair transparent', Trans_Green: 'vert transparent', Trans_Neon_Orange: 'orange fluo transparent',
    Trans_Black: 'fumé', Dark_Orange: 'orange foncé', Medium_Orange: 'orange moyen', Bright_Light_Orange: 'orange clair',
    Magenta: 'magenta', Dark_Pink: 'rose foncé', Pink: 'rose', Light_Yellow: 'jaune clair', Bright_Light_Yellow: 'jaune pâle',
    Sand_Blue: 'bleu sable', Olive_Green: 'vert olive',
  },
  en: {
    Light_Bluish_Grey: 'light gray', Dark_Bluish_Grey: 'dark gray', Light_Grey: 'light gray', Dark_Grey: 'dark gray',
    Pearl_Light_Grey: 'pearl gray', Flat_Silver: 'silver', Metallic_Silver: 'silver', Chrome_Silver: 'chrome',
    Chrome_Gold: 'gold', Pearl_Gold: 'gold', Trans_Clear: 'clear', Trans_Black: 'smoke', Lime: 'lime',
  },
  es: {
    Black: 'negro', Blue: 'azul', Green: 'verde', Red: 'rojo', White: 'blanco', Yellow: 'amarillo', Orange: 'naranja',
    Brown: 'marrón', Tan: 'beige', Dark_Tan: 'beige oscuro', Light_Grey: 'gris claro', Dark_Grey: 'gris oscuro',
    Light_Bluish_Grey: 'gris claro', Dark_Bluish_Grey: 'gris oscuro', Reddish_Brown: 'marrón rojizo', Dark_Red: 'rojo oscuro',
    Dark_Blue: 'azul oscuro', Medium_Blue: 'azul medio', Light_Blue: 'azul claro', Lime: 'verde lima', Sand_Green: 'verde arena',
    Dark_Green: 'verde oscuro', Bright_Green: 'verde vivo', Pearl_Light_Grey: 'gris perla', Flat_Silver: 'plateado',
    Metallic_Silver: 'plateado', Chrome_Silver: 'cromado', Chrome_Gold: 'dorado', Pearl_Gold: 'dorado', Trans_Clear: 'transparente',
    Trans_Red: 'rojo transparente', Trans_Yellow: 'amarillo transparente', Trans_Dark_Blue: 'azul transparente',
    Trans_Light_Blue: 'azul claro transparente', Trans_Green: 'verde transparente', Trans_Neon_Orange: 'naranja neón transparente',
    Trans_Black: 'ahumado', Dark_Orange: 'naranja oscuro', Medium_Orange: 'naranja medio', Bright_Light_Orange: 'naranja claro',
    Magenta: 'magenta', Dark_Pink: 'rosa oscuro', Pink: 'rosa', Light_Yellow: 'amarillo claro', Bright_Light_Yellow: 'amarillo pálido',
    Sand_Blue: 'azul arena', Olive_Green: 'verde oliva',
  },
};

function defaultColourName(ldrawName: string, lang: Lang): string {
  const words = ldrawName.replace(/_/g, ' ').toLowerCase().replace(/grey/g, 'gray');
  if (lang === 'en') return words.replace(/^trans /, 'transparent ');
  return words;
}

export function colourName(meta: Meta, code: string, lang: Lang = 'fr'): { name: string; hex: string } {
  const c = meta.colors[code];
  if (!c) return { name: '', hex: '#999999' };
  return { name: COLORS[lang][c.name] ?? defaultColourName(c.name, lang), hex: c.hex };
}

/* ---------- part names (first word of the LDraw description) ---------- */

const WORDS: Record<Lang, Record<string, string>> = {
  fr: {
    Brick: 'brique', Plate: 'plaque', Tile: 'tuile', Slope: 'pente', Wedge: 'aile', Hinge: 'charnière', Bar: 'barre',
    Wheel: 'roue', Tyre: 'pneu', Tire: 'pneu', Axle: 'axe', Pin: 'goupille', Cone: 'cône', Dish: 'parabole',
    Window: 'fenêtre', Door: 'porte', Antenna: 'antenne', Panel: 'panneau', Cylinder: 'cylindre', Bracket: 'équerre',
    Arch: 'arche', Fence: 'barrière', Glass: 'vitre', Windscreen: 'pare-brise', Mudguard: 'garde-boue', Steering: 'volant',
    Lever: 'levier', Turntable: 'plateau tournant', Propeller: 'hélice', Bucket: 'godet', Flag: 'drapeau', Ladder: 'échelle',
    Support: 'support', Baseplate: 'plaque de base', Boom: 'flèche', Chain: 'chaîne', Gear: 'engrenage', Beam: 'poutre',
    Connector: 'connecteur', Bush: 'bague', Wing: 'aile', Tail: 'queue', Roof: 'toit', Round: 'pièce ronde',
    Disk: 'disque', Hose: 'tuyau', Motor: 'moteur', Minifig: 'minifig', Technic: 'Technic', Electric: 'élément électrique',
    Container: 'boîte', Car: 'pièce auto', Train: 'pièce train', Crane: 'grue', Magnet: 'aimant', Rock: 'rocher',
    Plant: 'plante', Animal: 'animal', Arm: 'bras', Hand: 'main', Head: 'tête', Torso: 'torse', Hips: 'hanches',
    Legs: 'jambes', Hat: 'chapeau', Helmet: 'casque', Hair: 'cheveux', Cockpit: 'cockpit', Space: 'pièce espace',
    Lightsaber: 'sabre laser', Boat: 'pièce bateau', Vehicle: 'pièce véhicule', Sticker: 'autocollant', Grille: 'grille',
  },
  en: {
    Minifig: 'minifig part', Round: 'round part', Car: 'car part', Train: 'train part', Space: 'space part',
    Boat: 'boat part', Vehicle: 'vehicle part', Electric: 'electric part', Tyre: 'tire', Technic: 'Technic part',
  },
  es: {
    Brick: 'ladrillo', Plate: 'placa', Tile: 'baldosa', Slope: 'rampa', Wedge: 'cuña', Hinge: 'bisagra', Bar: 'barra',
    Wheel: 'rueda', Tyre: 'neumático', Tire: 'neumático', Axle: 'eje', Pin: 'pasador', Cone: 'cono', Dish: 'parabólica',
    Window: 'ventana', Door: 'puerta', Antenna: 'antena', Panel: 'panel', Cylinder: 'cilindro', Bracket: 'escuadra',
    Arch: 'arco', Fence: 'valla', Glass: 'cristal', Windscreen: 'parabrisas', Mudguard: 'guardabarros', Steering: 'volante',
    Lever: 'palanca', Turntable: 'plataforma giratoria', Propeller: 'hélice', Bucket: 'cuchara', Flag: 'bandera',
    Ladder: 'escalera', Support: 'soporte', Baseplate: 'base', Boom: 'pluma', Chain: 'cadena', Gear: 'engranaje',
    Beam: 'viga', Connector: 'conector', Bush: 'casquillo', Wing: 'ala', Tail: 'cola', Roof: 'tejado', Round: 'pieza redonda',
    Disk: 'disco', Hose: 'manguera', Motor: 'motor', Minifig: 'minifigura', Technic: 'pieza Technic', Electric: 'elemento eléctrico',
    Container: 'caja', Car: 'pieza de coche', Train: 'pieza de tren', Crane: 'grúa', Magnet: 'imán', Rock: 'roca',
    Plant: 'planta', Animal: 'animal', Arm: 'brazo', Hand: 'mano', Head: 'cabeza', Torso: 'torso', Hips: 'cadera',
    Legs: 'piernas', Hat: 'sombrero', Helmet: 'casco', Hair: 'pelo', Cockpit: 'cabina', Space: 'pieza espacial',
    Lightsaber: 'sable de luz', Boat: 'pieza de barco', Vehicle: 'pieza de vehículo', Sticker: 'pegatina', Grille: 'rejilla',
  },
};

export interface PartLabel { label: string; word: string; dims: string; en: string }

export function partLabel(desc: string, lang: Lang = 'fr'): PartLabel {
  const clean = (desc || '').replace(/^[~=_|]+/, '').replace(/\s+/g, ' ').trim();
  const first = clean.split(' ')[0] || '';
  // unknown words fall back to the English description word
  const word = WORDS[lang][first] ?? first.toLowerCase();
  const m = clean.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*x\s*(\d+(?:\.\d+)?))?/i);
  const dims = m ? [m[1], m[2], m[3]].filter(Boolean).join('×') : '';
  return { label: dims ? `${word} ${dims}` : word, word, dims, en: clean };
}

export interface PartLike { fn: string; code: string; key: string }
export interface PartGroup<P extends PartLike> extends PartLabel {
  key: string; count: number; sample: P; ref: string; colour: string; hex: string;
}

/** Groups identical parts (same file + same colour), most numerous first. */
export function groupParts<P extends PartLike>(parts: P[], meta: Meta, lang: Lang = 'fr'): PartGroup<P>[] {
  const map = new Map<string, { sample: P; count: number }>();
  for (const p of parts) {
    const g = map.get(p.key);
    if (g) g.count++;
    else map.set(p.key, { sample: p, count: 1 });
  }
  return [...map.entries()]
    .map(([key, g]) => {
      const base = g.sample.fn.split('/').pop() || g.sample.fn;
      const lbl = partLabel(meta.desc[g.sample.fn] || meta.desc[base] || base, lang);
      const col = colourName(meta, g.sample.code, lang);
      return { ...lbl, key, count: g.count, sample: g.sample, ref: base.replace(/\.dat$/, ''), colour: col.name, hex: col.hex };
    })
    .sort((a, b) => b.count - a.count);
}

/** Author of the model itself (not of the colour table or of a part), without the [login] suffix. */
export function modelAuthor(text: string): string {
  let inModel = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('0 FILE ')) inModel = !/^0 FILE (parts|p)\//i.test(line);
    else if (inModel && line.startsWith('0 Author:')) return line.slice(9).replace(/\s*\[.*\]\s*$/, '').trim();
  }
  return '';
}

/** "Mini Construction - Side" -> "Side" */
export function subAssemblyName(meta: Meta, fn: string): string {
  const d = meta.desc[fn] || fn;
  const segs = d.split(' - ');
  return segs[segs.length - 1].replace(/\.(ldr|mpd)$/i, '').trim();
}
