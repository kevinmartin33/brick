// Turns LDraw STEP data + submodel nesting into the list of steps the app shows.
// Pure functions, no three.js, so they can be unit-tested.

export interface SubNode { parent: SubNode | null }

export interface PartsStep<S> { kind: 'parts'; ctx: S | null; raw: number; items: number[] }
export interface AttachStep<S> { kind: 'attach'; sub: S; ctx: S | null; items: number[] }
export type Step<S> = PartsStep<S> | AttachStep<S>;

export interface Sequence<S> {
  steps: Step<S>[];
  /** step index for each input part */
  partStep: number[];
  firstIdx: Map<S, number>;
  attachIdx: Map<S, number>;
}

/**
 * One step per run of parts sharing the same original STEP and the same innermost sub-assembly,
 * plus an "attach" step every time a sub-assembly is finished (innermost first).
 * `parts` must be in file order (depth-first), which is how LDrawLoader numbers steps.
 */
export function buildSequence<S extends SubNode>(parts: { chain: S[]; rawStep: number }[]): Sequence<S> {
  const steps: Step<S>[] = [];
  const partStep: number[] = [];
  const firstIdx = new Map<S, number>();
  const attachIdx = new Map<S, number>();
  let prevChain: S[] = [];

  const exit = (from: S[], to: S[]) => {
    const left = from.filter((s) => !to.includes(s)).reverse();
    for (const s of left) {
      steps.push({ kind: 'attach', sub: s, ctx: (s.parent as S | null) ?? null, items: [] });
      attachIdx.set(s, steps.length - 1);
    }
  };

  parts.forEach((p, i) => {
    exit(prevChain, p.chain);
    const ctx = p.chain[p.chain.length - 1] ?? null;
    const last = steps[steps.length - 1];
    if (last && last.kind === 'parts' && last.ctx === ctx && last.raw === p.rawStep) last.items.push(i);
    else steps.push({ kind: 'parts', ctx, raw: p.rawStep, items: [i] });
    const idx = steps.length - 1;
    partStep[i] = idx;
    for (const s of p.chain) if (!firstIdx.has(s)) firstIdx.set(s, idx);
    prevChain = p.chain;
  });
  exit(prevChain, []);

  // an attach step "contains" every part of the sub-assembly it attaches
  parts.forEach((p, i) => {
    for (const s of p.chain) {
      const a = attachIdx.get(s);
      if (a !== undefined) steps[a].items.push(i);
    }
  });
  return { steps, partStep, firstIdx, attachIdx };
}

/**
 * Fallback for files without STEP data: bottom-up layers (by lowest point, world Y up),
 * big layers split into chunks of at most `perStep` neighbouring parts.
 */
export function autoSteps(boxes: { minY: number; x: number; z: number }[], perStep = 6, layerTolerance = 6): number[] {
  const rows = boxes.map((b, i) => ({ ...b, i })).sort((a, b) => a.minY - b.minY);
  const layers: { y0: number; items: typeof rows }[] = [];
  for (const r of rows) {
    const L = layers[layers.length - 1];
    if (L && r.minY - L.y0 < layerTolerance) L.items.push(r);
    else layers.push({ y0: r.minY, items: [r] });
  }
  const out = new Array<number>(boxes.length);
  let step = 0;
  for (const L of layers) {
    L.items.sort((a, b) => a.x - b.x || a.z - b.z);
    const chunks = Math.ceil(L.items.length / perStep);
    const size = Math.ceil(L.items.length / chunks);
    L.items.forEach((r, k) => { out[r.i] = step + Math.floor(k / size); });
    step += chunks;
  }
  return out;
}
