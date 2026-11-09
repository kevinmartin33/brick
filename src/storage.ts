// Per-device conveniences: where you stopped in each set, and your toggles.

const KEY = 'brick:v1';

interface Saved {
  progress: Record<string, number>;
  prefs: { dim: boolean; animate: boolean; narrate: boolean };
}

const DEFAULTS: Saved = { progress: {}, prefs: { dim: true, animate: true, narrate: true } };

function read(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const v = JSON.parse(raw) as Partial<Saved>;
    return { progress: v.progress ?? {}, prefs: { ...DEFAULTS.prefs, ...(v.prefs ?? {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function write(s: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: keep going without saving */ }
}

export function getProgress(setId: string): number | null {
  const v = read().progress[setId];
  return typeof v === 'number' ? v : null;
}

export function setProgress(setId: string, step: number) {
  const s = read();
  s.progress[setId] = step;
  write(s);
}

export function getPrefs() { return read().prefs; }

export function setPrefs(p: Partial<Saved['prefs']>) {
  const s = read();
  s.prefs = { ...s.prefs, ...p };
  write(s);
}
