import * as THREE from 'three';

/** Deterministic PRNG (mulberry32) so the cell is identical on every load. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.unit = () => {
    const u = f() * 2 - 1, t = f() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t));
  };
  f.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = f();
    while (v === 0) v = f();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return f;
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Deep merge b into a (objects only), returns a. */
export function merge(a, b) {
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) a[k] = merge(a[k] && typeof a[k] === 'object' ? a[k] : {}, b[k]);
    else a[k] = b[k];
  }
  return a;
}
export const clone = (o) => JSON.parse(JSON.stringify(o));

/** Matrix from position, an axis (local +Y maps to `axis`), a roll about it and a non-uniform scale (x,y,z local). */
const _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
export function composeAxis(pos, axis, roll, sx, sy, sz, out = new THREE.Matrix4()) {
  _q.setFromUnitVectors(_up, axis.clone().normalize());
  _q2.setFromAxisAngle(_up, roll);
  _q.multiply(_q2);
  return out.compose(pos, _q, new THREE.Vector3(sx, sy, sz));
}

/** Free a whole subtree's GPU resources. */
export function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
      for (const k of Object.keys(mm)) if (mm[k] && mm[k].isTexture) mm[k].dispose();
      if (mm.uniforms) for (const k of Object.keys(mm.uniforms)) { const v = mm.uniforms[k].value; if (v && v.isTexture) v.dispose(); }
      mm.dispose();
    });
    if (o.isInstancedMesh) o.dispose();
  });
}

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
export const yieldToUi = () => new Promise((r) => setTimeout(r, 0));
