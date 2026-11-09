import { describe, expect, it } from 'vitest';
import { autoSteps, buildSequence, type SubNode } from './sequence';

interface Sub extends SubNode { name: string; parent: Sub | null }
const sub = (name: string, parent: Sub | null = null): Sub => ({ name, parent });

describe('buildSequence', () => {
  it('keeps flat files as one step per original STEP', () => {
    const seq = buildSequence<Sub>([
      { chain: [], rawStep: 0 }, { chain: [], rawStep: 0 }, { chain: [], rawStep: 1 }, { chain: [], rawStep: 2 },
    ]);
    expect(seq.steps.map((s) => s.kind)).toEqual(['parts', 'parts', 'parts']);
    expect(seq.partStep).toEqual([0, 0, 1, 2]);
  });

  it('builds a sub-assembly apart, then adds an attach step', () => {
    const wing = sub('Wing');
    const seq = buildSequence<Sub>([
      { chain: [], rawStep: 0 },
      { chain: [wing], rawStep: 1 },
      { chain: [wing], rawStep: 2 },
      { chain: [], rawStep: 3 },
    ]);
    const kinds = seq.steps.map((s) => (s.kind === 'attach' ? `attach:${s.sub.name}` : `parts:${s.ctx?.name ?? 'main'}`));
    expect(kinds).toEqual(['parts:main', 'parts:Wing', 'parts:Wing', 'attach:Wing', 'parts:main']);
    expect(seq.firstIdx.get(wing)).toBe(1);
    expect(seq.attachIdx.get(wing)).toBe(3);
    const attach = seq.steps[3];
    expect(attach.kind === 'attach' && attach.items).toEqual([1, 2]);
  });

  it('attaches nested sub-assemblies innermost first', () => {
    const wing = sub('Wing');
    const engine = sub('Engine', wing);
    const seq = buildSequence<Sub>([
      { chain: [wing], rawStep: 0 },
      { chain: [wing, engine], rawStep: 1 },
      { chain: [], rawStep: 2 },
    ]);
    const kinds = seq.steps.map((s) => (s.kind === 'attach' ? `attach:${s.sub.name}` : `parts:${s.ctx?.name ?? 'main'}`));
    expect(kinds).toEqual(['parts:Wing', 'parts:Engine', 'attach:Engine', 'attach:Wing', 'parts:main']);
    const engineAttach = seq.steps[2];
    expect(engineAttach.ctx).toBe(wing);
  });

  it('separates parts of the same STEP that belong to different assemblies', () => {
    const fig = sub('Pilot');
    const seq = buildSequence<Sub>([{ chain: [], rawStep: 5 }, { chain: [fig], rawStep: 5 }]);
    expect(seq.steps.filter((s) => s.kind === 'parts')).toHaveLength(2);
  });
});

describe('autoSteps', () => {
  it('orders bottom-up and splits big layers', () => {
    const boxes = [
      { minY: 24, x: 0, z: 0 },
      ...Array.from({ length: 8 }, (_, i) => ({ minY: 0, x: i * 20, z: 0 })),
    ];
    const steps = autoSteps(boxes, 6);
    expect(steps[0]).toBe(2); // top brick comes after the two chunks of the bottom layer
    expect(new Set(steps.slice(1))).toEqual(new Set([0, 1]));
  });
});
