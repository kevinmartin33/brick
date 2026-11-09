import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { origMat, type LoadedModel, type PartInfo, type SubAssembly } from './ldraw/model';

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Fit { center: THREE.Vector3; radius: number; pad: number }
interface Drop { obj: THREE.Object3D; home: THREE.Vector3; up: THREE.Vector3; h: number; start: number; dur: number }

export interface ShowResult { fresh: PartInfo[]; ctx: SubAssembly | null; attach: SubAssembly | null }

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 1, 10000);
  readonly controls: OrbitControls;
  private ghostMat = new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  private ghostEdge = new THREE.LineBasicMaterial();
  private model: LoadedModel | null = null;
  private fits = new Map<SubAssembly | 'root', Fit>();
  private drops: Drop[] = [];
  private camAnim: { t0: number; dur: number; fromT: THREE.Vector3; toT: THREE.Vector3; fromD: number; toD: number } | null = null;
  private ctxNow: SubAssembly | null | undefined = undefined;
  private current = -1;
  dim = true;
  animate = true;

  // thumbnails
  private thumbRenderer: THREE.WebGLRenderer;
  private thumbScene = new THREE.Scene();
  private thumbCam = new THREE.PerspectiveCamera(28, 1, 0.1, 10000);
  private thumbCache = new Map<string, string>();

  constructor(private stage: HTMLElement, canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.scene.environment = new THREE.PMREMGenerator(this.renderer).fromScene(new RoomEnvironment()).texture;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 1.2;

    this.thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.thumbRenderer.setSize(160, 160);
    this.thumbRenderer.toneMapping = THREE.NeutralToneMapping;
    this.thumbScene.environment = new THREE.PMREMGenerator(this.thumbRenderer).fromScene(new RoomEnvironment()).texture;

    new ResizeObserver(() => this.resize()).observe(stage);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.applyTheme());
    this.resize();
    this.applyTheme();
    this.renderer.setAnimationLoop((now) => this.tick(now));
  }

  private resize() {
    const r = this.stage.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / Math.max(1, r.height);
    this.camera.updateProjectionMatrix();
  }

  applyTheme() {
    const cs = getComputedStyle(this.stage);
    const inSub = this.stage.classList.contains('in-sub');
    this.scene.background = new THREE.Color(cs.getPropertyValue(inSub ? '--stage-sub' : '--stage').trim() || '#dfe8f1');
    this.ghostMat.color.set(cs.getPropertyValue('--ghost').trim() || '#f3f5f8');
    this.ghostEdge.color.set(cs.getPropertyValue('--ghost-edge').trim() || '#9aa6b5');
  }

  setModel(m: LoadedModel) {
    if (this.model) this.scene.remove(this.model.root);
    this.model = m;
    this.fits.clear();
    this.drops = [];
    this.camAnim = null;
    this.ctxNow = undefined;
    this.current = -1;
    this.scene.add(m.root);
    const r = this.fit(null).radius;
    this.camera.near = r / 150;
    this.camera.far = r * 80;
    this.camera.updateProjectionMatrix();
  }

  private fit(ctx: SubAssembly | null): Fit {
    const key = ctx || 'root';
    let f = this.fits.get(key);
    if (!f) {
      const box = new THREE.Box3().setFromObject(ctx ? ctx.obj : this.model!.root);
      f = { center: box.getCenter(new THREE.Vector3()), radius: Math.max(box.getSize(new THREE.Vector3()).length() / 2, 1), pad: ctx ? 1.15 : 1.02 };
      this.fits.set(key, f);
    }
    return f;
  }

  /** distance that keeps the bounding sphere inside both the vertical and horizontal field of view */
  private distFor(f: Fit) {
    const v = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * this.camera.aspect);
    return (f.radius / Math.sin(Math.min(v, h))) * f.pad;
  }

  private frame(ctx: SubAssembly | null, instant: boolean) {
    const f = this.fit(ctx);
    const dist = this.distFor(f);
    if (instant) {
      this.controls.target.copy(f.center);
      this.camera.position.copy(f.center).add(new THREE.Vector3(0.95, 0.8, 1.15).normalize().multiplyScalar(dist));
      this.camAnim = null;
      this.controls.update();
      return;
    }
    this.camAnim = {
      t0: performance.now(), dur: reduceMotion() ? 1 : 650,
      fromT: this.controls.target.clone(), toT: f.center.clone(),
      fromD: this.camera.position.distanceTo(this.controls.target), toD: dist,
    };
  }

  private setGhost(p: PartInfo, on: boolean) {
    if (p.ghost === on) return;
    p.ghost = on;
    const swap = (o: THREE.Mesh | THREE.LineSegments, mat: THREE.Material) => {
      const orig = origMat.get(o)!;
      o.material = on ? (Array.isArray(orig) ? orig.map(() => mat) : mat) : orig;
    };
    p.meshes.forEach((m) => swap(m, this.ghostMat));
    p.lines.forEach((l) => swap(l, this.ghostEdge));
  }

  show(n: number, animate: boolean): ShowResult {
    const m = this.model!;
    const forwardOne = n === this.current + 1;
    this.current = n;
    const E = m.steps[n];
    const ctx = E.ctx;
    const attach = E.kind === 'attach' ? E.sub : null;
    this.drops = [];
    for (const S of m.subs) S.obj.position.copy(S.home);
    const fresh: PartInfo[] = [];
    for (const p of m.parts) {
      const vis = p.step <= n && (!ctx || p.chain.includes(ctx));
      const highlighted = attach ? p.chain.includes(attach) : p.step === n;
      p.obj.visible = vis;
      this.setGhost(p, this.dim && vis && !highlighted);
      p.obj.position.copy(p.home);
      if (!attach && p.step === n) fresh.push(p);
    }

    const ctxChanged = ctx !== this.ctxNow;
    if (ctxChanged) this.frame(ctx, this.ctxNow === undefined);
    this.ctxNow = ctx;
    this.stage.classList.toggle('in-sub', !!ctx);
    this.applyTheme();

    if (animate && forwardOne && this.animate && !reduceMotion()) {
      const h = this.distFor(this.fit(ctx)) * 0.12;
      const t0 = performance.now() + (ctxChanged ? 350 : 0);
      if (attach) {
        attach.obj.position.copy(attach.home).addScaledVector(attach.up, h * 2.2);
        this.drops.push({ obj: attach.obj, home: attach.home, up: attach.up, h: h * 2.2, start: t0 + 150, dur: 700 });
      } else {
        fresh.forEach((p, i) => {
          p.obj.position.copy(p.home).addScaledVector(p.up, h);
          this.drops.push({ obj: p.obj, home: p.home, up: p.up, h, start: t0 + i * 70, dur: 420 });
        });
      }
    }
    return { fresh, ctx, attach };
  }

  zoom(factor: number) {
    const dir = this.camera.position.clone().sub(this.controls.target);
    const d = dir.length();
    this.camAnim = { t0: performance.now(), dur: reduceMotion() ? 1 : 350, fromT: this.controls.target.clone(), toT: this.controls.target.clone(), fromD: d, toD: d * factor };
  }

  rotate(deg: number) {
    const off = this.camera.position.clone().sub(this.controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
    this.camera.position.copy(this.controls.target).add(off);
  }

  setSpin(on: boolean) { this.controls.autoRotate = on; }
  get spinning() { return this.controls.autoRotate; }

  reset() {
    this.ctxNow = undefined;
    if (this.model && this.current >= 0) {
      const ctx = this.model.steps[this.current].ctx;
      this.frame(ctx, false);
      this.ctxNow = ctx;
    }
  }

  thumbnail(obj: THREE.Object3D, key: string): string {
    const hit = this.thumbCache.get(key);
    if (hit) return hit;
    const c = obj.clone(true);
    c.position.set(0, 0, 0); c.quaternion.identity(); c.scale.set(1, 1, 1);
    // the clone shares materials with the live object: restore true colours even if it is ghosted
    const src: THREE.Object3D[] = [];
    const dst: THREE.Object3D[] = [];
    obj.traverse((o) => src.push(o));
    c.traverse((o) => dst.push(o));
    src.forEach((o, k) => {
      const om = origMat.get(o);
      if (om) (dst[k] as THREE.Mesh).material = om;
      dst[k].visible = true;
    });
    const holder = new THREE.Group();
    holder.rotation.x = Math.PI;
    holder.add(c);
    this.thumbScene.add(holder);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = Math.max(box.getSize(new THREE.Vector3()).length(), 1);
    const center = box.getCenter(new THREE.Vector3());
    this.thumbCam.position.copy(center).add(new THREE.Vector3(1, 0.85, 1.25).normalize().multiplyScalar(size * 1.9));
    this.thumbCam.near = size / 100; this.thumbCam.far = size * 10;
    this.thumbCam.lookAt(center); this.thumbCam.updateProjectionMatrix();
    this.thumbRenderer.render(this.thumbScene, this.thumbCam);
    const url = this.thumbRenderer.domElement.toDataURL('image/png');
    this.thumbScene.remove(holder);
    this.thumbCache.set(key, url);
    return url;
  }

  private tick(now: number) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      const t = Math.min(1, Math.max(0, (now - d.start) / d.dur));
      d.obj.position.copy(d.home).addScaledVector(d.up, d.h * (1 - easeOut(t)));
      if (t >= 1) this.drops.splice(i, 1);
    }
    const a = this.camAnim;
    if (a) {
      const t = Math.min(1, (now - a.t0) / a.dur);
      const k = easeOut(t);
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this.controls.target.lerpVectors(a.fromT, a.toT, k);
      this.camera.position.copy(this.controls.target).addScaledVector(dir, a.fromD + (a.toD - a.fromD) * k);
      if (t >= 1) this.camAnim = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
