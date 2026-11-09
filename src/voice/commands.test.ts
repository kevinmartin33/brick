import { describe, expect, it } from 'vitest';
import { parseCommand } from './commands';

const type = (s: string) => parseCommand(s)?.type ?? null;

describe('parseCommand', () => {
  it.each([
    ['suivant', 'next'],
    ['Suivante !', 'next'],
    ["c'est bon", 'next'],
    ['ok', 'next'],
    ['après', 'next'],
    ['précédent', 'prev'],
    ['retour', 'prev'],
    ['répète', 'repeat'],
    ['tu peux répéter', 'repeat'],
    ['quelles pièces', 'parts'],
    ['zoom', 'zoomIn'],
    ['rapproche', 'zoomIn'],
    ['dézoome', 'zoomOut'],
    ['recule un peu', 'zoomOut'],
    ['tourne à gauche', 'rotateLeft'],
    ['tourne à droite', 'rotateRight'],
    ['tourne', 'spin'],
    ['recentre', 'reset'],
    ['stop', 'stop'],
    ['aide', 'help'],
    ['recommencer', 'first'],
    ['dernière étape', 'last'],
  ])('« %s » → %s', (heard, expected) => {
    expect(type(heard)).toBe(expected);
  });

  it('reads step numbers in digits and words', () => {
    expect(parseCommand('étape 12')).toEqual({ type: 'goto', step: 12 });
    expect(parseCommand("va à l'étape 7")).toEqual({ type: 'goto', step: 7 });
    expect(parseCommand('étape douze')).toEqual({ type: 'goto', step: 12 });
    expect(parseCommand('étape dix-sept')).toEqual({ type: 'goto', step: 17 });
  });

  it('ignores ordinary conversation', () => {
    expect(type('il fait beau aujourd’hui')).toBeNull();
    expect(type('ok je vais chercher un verre')).toBeNull();
    expect(type('')).toBeNull();
  });

  it('prefers repeat over next when both words are said', () => {
    expect(type('ok répète')).toBe('repeat');
  });
});

describe('parseCommand in English', () => {
  const en = (s: string) => parseCommand(s, 'en')?.type ?? null;
  it.each([
    ['next', 'next'], ['done', 'next'], ['ok', 'next'], ['keep going', 'next'],
    ['back', 'prev'], ['go back', 'prev'], ['previous', 'prev'],
    ['repeat', 'repeat'], ['say that again', 'repeat'], ['what', 'repeat'],
    ['which parts', 'parts'], ['what do I need', 'parts'],
    ['zoom in', 'zoomIn'], ['zoom out', 'zoomOut'], ['closer', 'zoomIn'],
    ['turn left', 'rotateLeft'], ['rotate right', 'rotateRight'], ['spin', 'spin'],
    ['recenter', 'reset'], ['stop', 'stop'], ['help', 'help'],
    ['start over', 'first'], ['last step', 'last'],
  ])('“%s” → %s', (heard, expected) => expect(en(heard)).toBe(expected));

  it('reads step numbers', () => {
    expect(parseCommand('step 12', 'en')).toEqual({ type: 'goto', step: 12 });
    expect(parseCommand('go to step twelve', 'en')).toEqual({ type: 'goto', step: 12 });
    expect(parseCommand('step to', 'en')).toEqual({ type: 'goto', step: 2 });
  });

  it('ignores conversation', () => {
    expect(en('what a nice day')).toBeNull();
    expect(en('alright')).toBe('next');
    expect(en('the right way to do it')).toBeNull();
  });
});

describe('parseCommand in Spanish', () => {
  const es = (s: string) => parseCommand(s, 'es')?.type ?? null;
  it.each([
    ['siguiente', 'next'], ['listo', 'next'], ['vale', 'next'], ['ya está', 'next'],
    ['anterior', 'prev'], ['atrás', 'prev'],
    ['repite', 'repeat'], ['otra vez', 'repeat'], ['¿qué?', 'repeat'],
    ['piezas', 'parts'], ['qué necesito', 'parts'],
    ['acércate', 'zoomIn'], ['aleja', 'zoomOut'],
    ['gira a la izquierda', 'rotateLeft'], ['gira a la derecha', 'rotateRight'], ['gira', 'spin'],
    ['centra', 'reset'], ['para', 'stop'], ['silencio', 'stop'], ['ayuda', 'help'],
    ['empezar de nuevo', 'first'], ['último paso', 'last'],
  ])('«%s» → %s', (heard, expected) => expect(es(heard)).toBe(expected));

  it('reads step numbers', () => {
    expect(parseCommand('paso 12', 'es')).toEqual({ type: 'goto', step: 12 });
    expect(parseCommand('ve al paso doce', 'es')).toEqual({ type: 'goto', step: 12 });
  });

  it('does not stop on the preposition "para" inside a sentence', () => {
    expect(es('esto es para mi hermano')).toBeNull();
    expect(es('lo que sea')).toBeNull();
  });
});
