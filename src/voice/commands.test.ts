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
