import { describe, expect, it } from 'vitest';
import { partsSentence, stepNarration } from './narration';
import { groupParts, modelAuthor, parseMeta, partLabel, subAssemblyName } from './ldraw/meta';

describe('narration', () => {
  it('reads the parts of a step in French', () => {
    const text = stepNarration({
      n: 3, total: 40, kind: 'parts',
      groups: [
        { count: 2, word: 'plaque', dims: '2×4', colour: 'rouge' },
        { count: 1, word: 'brique', dims: '1×2', colour: 'noir' },
      ],
    });
    expect(text).toBe('Étape 3. Ajoute 2 plaques 2 par 4 rouge et 1 brique 1 par 2 noir.');
  });

  it('announces new sub-assemblies and attach steps', () => {
    expect(stepNarration({ n: 5, total: 9, kind: 'parts', startsSub: 'R2-D2', groups: [{ count: 1, word: 'tuile', dims: '', colour: 'blanc' }] }))
      .toBe('Étape 5. Nouveau sous-ensemble : R2-D2. Ajoute 1 tuile blanc.');
    expect(stepNarration({ n: 9, total: 9, kind: 'attach', subName: 'Aile', groups: [] }))
      .toBe('Dernière étape, 9. Fixe le sous-ensemble Aile.');
  });

  it('summarises long lists', () => {
    const g = Array.from({ length: 6 }, () => ({ count: 1, word: 'tuile', dims: '1×1', colour: 'gris' }));
    expect(partsSentence(g, 4)).toMatch(/et 2 autres pièces$/);
  });
});

describe('LDraw meta', () => {
  const text = [
    '0 !COLOUR Red  CODE   4   VALUE #C91A09   EDGE #333333',
    '0 FILE 4915 - Mini Construction - Side.ldr',
    '0 Mini Construction - Side',
    '0 FILE parts/3001.dat',
    '0 Brick  2 x  4',
  ].join('\n');

  it('reads descriptions and colours', () => {
    const meta = parseMeta(text);
    expect(meta.colors['4']).toEqual({ name: 'Red', hex: '#C91A09' });
    expect(meta.desc['parts/3001.dat']).toBe('Brick  2 x  4');
    expect(subAssemblyName(meta, '4915 - mini construction - side.ldr')).toBe('Side');
  });

  it('finds the model author, not the colour table or part authors', () => {
    const file = [
      '0 Name: LDConfig.ldr', '0 Author: LDraw.org',
      '0 FILE 7140 - Ship.ldr', '0 Ship', '0 Author: Daniel Goerner [TK-949]',
      '0 FILE parts/3001.dat', '0 Brick  2 x  4', '0 Author: James Jessiman',
    ].join('\n');
    expect(modelAuthor(file)).toBe('Daniel Goerner');
    expect(modelAuthor('0 Author: LDraw.org\n0 FILE parts/3001.dat\n0 Author: Someone')).toBe('');
  });

  it('labels parts in French', () => {
    expect(partLabel('Brick  2 x  4').label).toBe('brique 2×4');
    expect(partLabel('Plate  1 x  2 x  0.667').dims).toBe('1×2×0.667');
    expect(partLabel('~Dish  3 x  3 Inverted').word).toBe('parabole');
  });
});

describe('narration in English and Spanish', () => {
  const groups = [
    { count: 2, word: 'plate', dims: '2×4', colour: 'red' },
    { count: 1, word: 'brick', dims: '1×2', colour: 'black' },
  ];
  it('reads a step in English', () => {
    expect(stepNarration({ n: 3, total: 40, kind: 'parts', groups, lang: 'en' }))
      .toBe('Step 3. Add 2 red plates, 2 by 4 and 1 black brick, 1 by 2.');
    expect(stepNarration({ n: 9, total: 9, kind: 'attach', subName: 'Wing', groups: [], lang: 'en' }))
      .toBe('Last step, 9. Attach the Wing sub-assembly.');
  });
  it('reads a step in Spanish', () => {
    const es = [{ count: 2, word: 'placa', dims: '2×4', colour: 'rojo' }, { count: 3, word: 'motor', dims: '', colour: 'negro' }];
    expect(stepNarration({ n: 3, total: 40, kind: 'parts', startsSub: 'R2-D2', groups: es, lang: 'es' }))
      .toBe('Paso 3. Nuevo subconjunto: R2-D2. Añade 2 placas 2 por 4 rojo y 3 motores negro.');
  });
  it('labels parts and colours per language', () => {
    const meta = parseMeta('0 !COLOUR Light_Bluish_Grey CODE 71 VALUE #A0A5A9 EDGE #333333\n0 FILE parts/3001.dat\n0 Brick  2 x  4');
    expect(partLabel('Brick  2 x  4', 'en').label).toBe('brick 2×4');
    expect(partLabel('Brick  2 x  4', 'es').label).toBe('ladrillo 2×4');
    const [g] = groupParts([{ fn: 'parts/3001.dat', code: '71', key: 'k' }], meta, 'es');
    expect(`${g.word} ${g.colour}`).toBe('ladrillo gris claro');
    expect(groupParts([{ fn: 'parts/3001.dat', code: '71', key: 'k' }], meta, 'en')[0].colour).toBe('light gray');
  });
});
