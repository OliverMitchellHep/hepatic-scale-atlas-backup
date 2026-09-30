// Hepatocyte outline: a rounded polyhedron (smooth-max of bounding planes, 1 unit ≈ 2 µm) with a
// canalicular groove (finite capsule) on the +x face. The sinusoidal (basolateral) pole is -x.
// Domain fractions follow Blouin et al. 1977 loosely (sinusoidal ≈37%, lateral ≈50%, canalicular ≈13%);
// the groove is widened for legibility. In vivo the canaliculus lies on lateral faces between hepatocytes;
// here the two poles are drawn opposite each other as in standard polarity diagrams (see README).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, V3 } from './util.js';

export const GROOVE = { x: 5.1, z: 0.0, r: 0.78, y0: -2.7, y1: 2.7 };

export function makeSDF(seed = 7) {
  const R = rng(seed);
  const planes = [];
  const add = (n, h) => { const v = n.clone().normalize(); planes.push({ n: v, h: h + R.range(-0.18, 0.18) }); };
  // faces
  add(V3(1, 0, 0), 5.0); add(V3(-1, 0, 0), 5.0);
  add(V3(0, 1, 0), 3.85); add(V3(0, -1, 0), 3.85);
  add(V3(0, 0, 1), 4.05); add(V3(0, 0, -1), 4.05);
  // edge chamfers
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(V3(sx, sy, 0), 5.35 + R.range(-0.1, 0.1));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(V3(sx, 0, sz), 5.55 + R.range(-0.1, 0.1));
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) add(V3(0, sy, sz), 4.85 + R.range(-0.1, 0.1));
  // corner chamfers
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) add(V3(sx, sy, sz), 6.75 + R.range(-0.15, 0.15));
  const K = 0.55;      // edge rounding
  const KG = 0.22;     // groove blend
  const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
  const gDist = (x, y, z) => {
    const cy = Math.min(Math.max(y, GROOVE.y0), GROOVE.y1);
    return Math.hypot(x - GROOVE.x, y - cy, z - GROOVE.z) - GROOVE.r;
  };
  const polyF = (x, y, z) => {
    let f = -1e9;
    for (let i = 0; i < planes.length; i++) { const p = planes[i]; f = smax(f, p.n.x * x + p.n.y * y + p.n.z * z - p.h, K); }
    return f;
  };
  const f = (x, y, z) => smax(polyF(x, y, z), -gDist(x, y, z), KG);
  const sdf = { planes, f, polyF, gDist };
  sdf.eval = (p) => f(p.x, p.y, p.z);
  sdf.inside = (p, margin = 0) => f(p.x, p.y, p.z) < -margin;
  sdf.normal = (p, out = new THREE.Vector3()) => {
    const e = 0.02;
    out.set(f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z), f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z), f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e));
    return out.normalize();
  };
  /** First surface hit along a ray from inside (origin must be inside). */
  sdf.raycast = (o, d, tmax = 14) => {
    let t0 = 0, t = 0;
    const step = 0.08;
    let fp = f(o.x, o.y, o.z);
    for (t = step; t < tmax; t += step) {
      const ft = f(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
      if (ft >= 0) { let a = t - step, b = t; for (let i = 0; i < 16; i++) { const m = (a + b) / 2; if (f(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m) >= 0) b = m; else a = m; } return (a + b) / 2; }
      t0 = t; fp = ft;
    }
    return null;
  };
  /** Domain weights at a surface point: { sin, can, lat } summing to 1. */
  sdf.domain = (p) => {
    let vmax = -1e9; const v = new Array(planes.length);
    for (let i = 0; i < planes.length; i++) { const pl = planes[i]; v[i] = pl.n.x * p.x + pl.n.y * p.y + pl.n.z * p.z - pl.h; if (v[i] > vmax) vmax = v[i]; }
    const vg = -gDist(p.x, p.y, p.z);
    const m = Math.max(vmax, vg);
    let ws = 0, wl = 0;
    const beta = 1 / 0.16;
    for (let i = 0; i < planes.length; i++) { const w = Math.exp((v[i] - m) * beta); if (planes[i].n.x < -0.45) ws += w; else wl += w; }
    const wc = Math.exp((vg - m) * beta * 1.6);
    const s = ws + wl + wc;
    return { sin: ws / s, can: wc / s, lat: wl / s };
  };
  return sdf;
}

/** Build the outer shell geometry. detail ≈ icosphere subdivisions. Returns geometry with `color` = domain weights. */
export function buildShell(sdf, detail = 56) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const d = V3(), o = V3(0, 0, 0), p = V3(), nn = V3();
  for (let i = 0; i < n; i++) {
    d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const t = sdf.raycast(o, d) ?? 6;
    p.copy(d).multiplyScalar(t);
    pos.setXYZ(i, p.x, p.y, p.z);
    sdf.normal(p, nn);
    nor[i * 3] = nn.x; nor[i * 3 + 1] = nn.y; nor[i * 3 + 2] = nn.z;
    const dm = sdf.domain(p);
    col[i * 3] = dm.sin; col[i * 3 + 1] = dm.can; col[i * 3 + 2] = dm.lat;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/** Area-weighted surface sampler on the shell. weightFn(domain{sin,can,lat}) -> weight per vertex. */
export function makeSampler(geo, weightFn) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color, idx = geo.index;
  const tri = idx.count / 3;
  const cum = new Float64Array(tri);
  let tot = 0;
  const a = V3(), b = V3(), c = V3();
  const wv = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) wv[i] = weightFn({ sin: col.getX(i), can: col.getY(i), lat: col.getZ(i) });
  for (let t = 0; t < tri; t++) {
    const i0 = idx.getX(t * 3), i1 = idx.getX(t * 3 + 1), i2 = idx.getX(t * 3 + 2);
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    const area = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
    tot += area * (wv[i0] + wv[i1] + wv[i2]) / 3;
    cum[t] = tot;
  }
  return {
    total: tot,
    sample(R, outN = V3()) {
      const r = R() * tot;
      let lo = 0, hi = tri - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      const i0 = idx.getX(lo * 3), i1 = idx.getX(lo * 3 + 1), i2 = idx.getX(lo * 3 + 2);
      let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const w = 1 - u - v;
      const P = V3(
        pos.getX(i0) * w + pos.getX(i1) * u + pos.getX(i2) * v,
        pos.getY(i0) * w + pos.getY(i1) * u + pos.getY(i2) * v,
        pos.getZ(i0) * w + pos.getZ(i1) * u + pos.getZ(i2) * v);
      outN.set(
        nor.getX(i0) * w + nor.getX(i1) * u + nor.getX(i2) * v,
        nor.getY(i0) * w + nor.getY(i1) * u + nor.getY(i2) * v,
        nor.getZ(i0) * w + nor.getZ(i1) * u + nor.getZ(i2) * v).normalize();
      return P;
    },
  };
}
