import * as THREE from 'three';
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader.js';
import { LDrawConditionalLineMaterial } from 'three/examples/jsm/materials/LDrawConditionalLineMaterial.js';
import { parseMeta, subAssemblyName, type Meta } from './meta';
import { autoSteps, buildSequence, type Step } from './sequence';

export interface SubAssembly {
  obj: THREE.Group;
  fn: string;
  parent: SubAssembly | null;
  count: number;
  home: THREE.Vector3;
  /** world "up" expressed in the parent's local frame, for drop animations */
  up: THREE.Vector3;
  key: string;
  name: string;
  firstIdx: number;
  attachIdx: number;
}

export interface PartInfo {
  obj: THREE.Group;
  meshes: THREE.Mesh[];
  lines: THREE.LineSegments[];
  home: THREE.Vector3;
  up: THREE.Vector3;
  fn: string;
  code: string;
  key: string;
  rawStep: number;
  step: number;
  chain: SubAssembly[];
  ghost: boolean;
}

export type StepEntry = Step<SubAssembly>;

export interface LoadedModel {
  id: string;
  root: THREE.Group;
  parts: PartInfo[];
  subs: SubAssembly[];
  steps: StepEntry[];
  generated: boolean;
  meta: Meta;
}

/** Original materials, so ghosting can be undone. */
export const origMat = new WeakMap<THREE.Object3D, THREE.Material | THREE.Material[]>();

const isPart = (g: THREE.Object3D) => /part|shortcut/i.test(g.userData.type || '');
const fileOf = (g: THREE.Object3D) => String(g.userData.fileName || g.name || '').toLowerCase().replace(/\\/g, '/');

function localUp(obj: THREE.Object3D): THREE.Vector3 {
  const wp = obj.getWorldPosition(new THREE.Vector3());
  const a = obj.parent!.worldToLocal(wp.clone());
  const b = obj.parent!.worldToLocal(wp.clone().add(new THREE.Vector3(0, 1, 0)));
  return b.sub(a);
}

export async function loadModel(text: string, id: string): Promise<LoadedModel> {
  const meta = parseMeta(text);
  const loader = new LDrawLoader();
  loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
  loader.smoothNormals = true;
  // The bundled typings lag behind three r170's loader (parse has no path argument any more).
  const raw = loader as unknown as {
    setPartsLibraryPath(p: string): void;
    parse(text: string, onLoad: (g: THREE.Group) => void, onError: (e: unknown) => void): void;
  };
  // Packed files carry every part; refuse network lookups for anything missing.
  raw.setPartsLibraryPath('data:,');
  const root = await new Promise<THREE.Group>((ok, ko) => raw.parse(text, ok, ko));
  root.rotation.x = Math.PI; // LDraw is Y-down
  root.updateMatrixWorld(true);

  // Walk the tree: parts are leaves, .ldr/.mpd groups between them are sub-assemblies.
  const found: { obj: THREE.Group; chain: SubAssembly[] }[] = [];
  const subList: SubAssembly[] = [];
  (function walk(o: THREE.Object3D, chain: SubAssembly[]) {
    for (const c of o.children) {
      if (!(c as THREE.Group).isGroup) continue;
      const g = c as THREE.Group;
      if (isPart(g)) { found.push({ obj: g, chain }); continue; }
      const fn = fileOf(g);
      if (/\.(ldr|mpd)$/.test(fn)) {
        const S: SubAssembly = {
          obj: g, fn, parent: chain[chain.length - 1] || null, count: 0,
          home: new THREE.Vector3(), up: new THREE.Vector3(), key: '', name: '', firstIdx: -1, attachIdx: -1,
        };
        subList.push(S);
        walk(g, [...chain, S]);
      } else walk(g, chain);
    }
  })(root, []);

  for (const f of found) for (const S of f.chain) S.count++;
  // a submodel holding every part is the main model itself; empty ones are noise
  const dropped = new Set(subList.filter((S) => S.count === 0 || S.count === found.length));
  let subs = subList.filter((S) => !dropped.has(S));
  subs.forEach((S, i) => {
    while (S.parent && dropped.has(S.parent)) S.parent = S.parent.parent;
    S.home = S.obj.position.clone();
    S.up = localUp(S.obj);
    S.key = `${id}|sub|${i}`;
    S.name = subAssemblyName(meta, S.fn);
  });

  const parts: PartInfo[] = found.map(({ obj, chain }) => {
    const meshes: THREE.Mesh[] = [];
    const lines: THREE.LineSegments[] = [];
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { meshes.push(o as THREE.Mesh); origMat.set(o, (o as THREE.Mesh).material); }
      else if ((o as THREE.LineSegments).isLineSegments && !(o as { isConditionalLine?: boolean }).isConditionalLine) {
        lines.push(o as THREE.LineSegments);
        origMat.set(o, (o as THREE.LineSegments).material);
      }
    });
    const fn = fileOf(obj);
    const code = String(obj.userData.colorCode ?? '');
    return {
      obj, meshes, lines, home: obj.position.clone(), up: localUp(obj), fn, code, key: `${id}|${fn}|${code}`,
      rawStep: obj.userData.buildingStep || 0, step: 0, chain: chain.filter((S) => !dropped.has(S)), ghost: false,
    };
  });

  let steps: StepEntry[];
  let generated = false;
  if (new Set(parts.map((p) => p.rawStep)).size > 1) {
    const seq = buildSequence(parts);
    steps = seq.steps;
    parts.forEach((p, i) => { p.step = seq.partStep[i]; });
    for (const S of subs) { S.firstIdx = seq.firstIdx.get(S) ?? -1; S.attachIdx = seq.attachIdx.get(S) ?? -1; }
  } else {
    generated = true;
    subs = [];
    const box = new THREE.Box3();
    const c = new THREE.Vector3();
    const order = autoSteps(parts.map((p) => {
      box.setFromObject(p.obj); box.getCenter(c);
      return { minY: box.min.y, x: c.x, z: c.z };
    }));
    const count = Math.max(...order) + 1;
    steps = Array.from({ length: count }, (_, i) => ({ kind: 'parts' as const, ctx: null, raw: i, items: [] as number[] }));
    parts.forEach((p, i) => { p.chain = []; p.step = order[i]; steps[order[i]].items.push(i); });
  }

  return { id, root, parts, subs, steps, generated, meta };
}
