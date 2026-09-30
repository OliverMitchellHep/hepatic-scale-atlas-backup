// Rough ER (ribosome-studded, fenestrated cisternae; perinuclear layers + cytoplasmic stacks),
// smooth ER (tubular network), Golgi (stacked fenestrated cisternae + vesicles).
// Fenestrations are cut on the CPU (triangles removed) so ribosomes are only placed on real membrane.
import * as THREE from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { makeMaterial } from '../materials.js';
import { rng, V3 } from '../util.js';
import { mergeGeos, register, addAnchor, instanced } from './common.js';

class Acc {
  constructor() { this.p = []; this.n = []; this.samples = []; }
  tri(a, b, c, na, nb, nc) { this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); this.n.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z); }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.computeBoundingSphere(); return g; }
}

/**
 * Thin two-layer sheet from a parametric surface fn(u,v) (u,v in [-1,1]); mask(u,v)=false removes a cell.
 * Both faces are emitted with outward normals so FrontSide culling is correct. Returns face samples for ribosomes.
 */
function addSheet(acc, fn, nu, nv, thick, mask, sampleRate, R) {
  const P = [], N = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = (i / nu) * 2 - 1, v = (j / nv) * 2 - 1, e = 0.01;
    const p = fn(u, v);
    const du = fn(u + e, v).sub(fn(u - e, v)), dv = fn(u, v + e).sub(fn(u, v - e));
    P.push(p); N.push(du.cross(dv).normalize());
  }
  const at = (i, j) => i * (nv + 1) + j;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const uc = ((i + 0.5) / nu) * 2 - 1, vc = ((j + 0.5) / nv) * 2 - 1;
    if (!mask(uc, vc)) continue;
    const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
    const h = thick / 2;
    const top = q.map((k) => P[k].clone().addScaledVector(N[k], h)), bot = q.map((k) => P[k].clone().addScaledVector(N[k], -h));
    const nt = q.map((k) => N[k]), nb = q.map((k) => N[k].clone().negate());
    acc.tri(top[0], top[1], top[2], nt[0], nt[1], nt[2]); acc.tri(top[0], top[2], top[3], nt[0], nt[2], nt[3]);
    acc.tri(bot[0], bot[2], bot[1], nb[0], nb[2], nb[1]); acc.tri(bot[0], bot[3], bot[2], nb[0], nb[3], nb[2]);
    if (sampleRate > 0) for (let s = 0; s < 2; s++) if (R() < sampleRate) {
      const k = q[Math.floor(R() * 4)], k2 = q[Math.floor(R() * 4)];
      const base = P[k].clone().lerp(P[k2], R());
      const nn = N[k].clone().lerp(N[k2], 0.5).normalize();
      const side = R() < 0.5 ? 1 : -1;
      acc.samples.push({ p: base.addScaledVector(nn, side * (h + 0.02)), n: nn.multiplyScalar(side) });
    }
  }
}

export function buildRER(ctx) {
  const { L, P, shared } = ctx;
  const R = rng(101), noise = new SimplexNoise({ random: R });
  const acc = new Acc();
  const holeNoise = (u, v, f, ph) => noise.noise3d(u * f + ph, v * f, ph * 0.7);
  const keep = (T, f, ph, edge = 0.9) => (u, v) => holeNoise(u, v, f, ph) > T && (1 - Math.max(Math.abs(u), Math.abs(v))) + noise.noise3d(u * 2.2 + ph, v * 2.2, 1) * 0.35 > 1 - edge;

  // perinuclear layered shells (nuclear envelope is continuous with the RER)
  L.nuclei.forEach((n, ni) => {
    for (let j = 0; j < 3; j++) {
      const Rr = n.r * (1.17 + 0.13 * j), ph = R() * 10, phi0 = R() * 6.28, span = R.range(1.7, 2.6), thSpan = R.range(0.85, 1.15);
      const fn = (u, v) => {
        const phi = phi0 + u * span, th = Math.PI / 2 + v * thSpan;
        const d = 1 + 0.03 * noise.noise3d(u * 2 + ph, v * 2, j);
        return V3(Math.sin(th + 0) * Math.cos(phi), Math.cos(th), Math.sin(th) * Math.sin(phi)).multiplyScalar(Rr * d).add(n.c);
      };
      addSheet(acc, fn, 46, 30, 0.07, keep(-0.12, 3.2, ph, 0.95), 0.55, R);
      addAnchor(ctx, 'rer', { pos: fn(0, 0), r: 0.6 });
    }
  });
  // cytoplasmic stacks
  L.rer.forEach((s, si) => {
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), s.axis);
    const roll = R() * 6.28;
    const bend = R.range(-0.5, 0.5), sp = 0.17;
    for (let k = 0; k < s.n; k++) {
      const ph = R() * 10, a = s.a * (1 - 0.05 * k), b = s.b * (1 - 0.04 * k);
      const fn = (u, v) => {
        const lp = V3(a * u, b * v, (k - (s.n - 1) / 2) * sp + bend * (u * u + v * v * 0.6) + 0.06 * noise.noise3d(u * 2 + ph, v * 2, k));
        lp.applyAxisAngle(V3(0, 0, 1), roll).applyQuaternion(q).add(s.c);
        return lp;
      };
      addSheet(acc, fn, 34, 24, 0.07, keep(-0.2, 2.6, ph, 0.9), 0.5, R);
    }
    addAnchor(ctx, 'rer', { pos: s.c.clone(), r: s.a });
  });
  const geo = acc.geo();
  const mat = makeMaterial(shared, { color: P.rer, roughness: 0.5, sss: 0.4, sssColor: '#6f86ff', bump: 0.9, bumpFreq: 8, rim: 0.25, rimColor: '#7b8dff', type: 'rer' });
  const mesh = new THREE.Mesh(geo, mat); ctx.group.add(mesh);
  // ribosomes
  const rg = new THREE.IcosahedronGeometry(0.03, 0);
  const rm = makeMaterial(shared, { color: P.ribosome, roughness: 0.6, sss: 0.3, type: 'rer' });
  const mats = acc.samples.map((s) => new THREE.Matrix4().compose(s.p, new THREE.Quaternion(), V3(1, 1, 1).multiplyScalar(0.8 + R() * 0.6)));
  const rib = instanced(rg, rm, mats); ctx.group.add(rib);
  register(ctx, 'rer', [mesh, rib], [mat, rm], { pick: mesh });
  ctx.stats.ribosomes = mats.length;
}

export function buildSER(ctx) {
  const { L, P, shared } = ctx;
  if (!L.serNodes.length) return;
  const R = rng(203);
  const geos = [];
  L.serEdges.forEach(([i, j]) => {
    const a = L.serNodes[i], b = L.serNodes[j];
    const mid = a.clone().lerp(b, 0.5).add(R.unit().multiplyScalar(0.1));
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    geos.push(new THREE.TubeGeometry(curve, 8, R.range(0.045, 0.065), 6, false));
  });
  const sg = new THREE.SphereGeometry(1, 8, 6);
  L.serNodes.forEach((p) => { const r = R.range(0.07, 0.11); geos.push(sg.clone().scale(r, r, r).translate(p.x, p.y, p.z)); addAnchor(ctx, 'ser', { pos: p.clone(), r: 0.1 }); });
  const geo = mergeGeos(geos);
  const mat = makeMaterial(shared, { color: P.ser, roughness: 0.45, sss: 0.55, sssColor: '#5fd0ff', bump: 0.5, bumpFreq: 10, rim: 0.3, rimColor: '#8fe6ff', type: 'ser' });
  const mesh = new THREE.Mesh(geo, mat); ctx.group.add(mesh);
  register(ctx, 'ser', mesh, mat, { pick: mesh });
}

export function buildGolgi(ctx) {
  const { L, P, shared } = ctx;
  if (!L.golgi.length) return;
  const R = rng(307), noise = new SimplexNoise({ random: R });
  const acc = new Acc(); const vesicles = [];
  L.golgi.forEach((g) => {
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), g.axis);
    const roll = R() * 6.28, n = 5, sp = 0.19;
    for (let k = 0; k < n; k++) {
      const Rk = g.r * (1 - 0.07 * k), ph = R() * 10;
      const fn = (u, v) => {
        const lp = V3(Rk * u, Rk * v, (k - 2) * sp + 0.36 * (u * u + v * v) * (1 - 0.05 * k) + 0.02 * noise.noise3d(u * 3 + ph, v * 3, k));
        lp.applyAxisAngle(V3(0, 0, 1), roll).applyQuaternion(q).add(g.c);
        return lp;
      };
      const mask = (u, v) => {
        const r = Math.hypot(u, v), th = Math.atan2(v, u);
        const lim = 0.98 + 0.12 * Math.sin(5 * th + ph) + 0.06 * noise.noise3d(u * 2 + ph, v * 2, 3);
        if (r > lim) return false;
        return r < 0.55 || noise.noise3d(u * 5 + ph, v * 5, k) > -0.3;
      };
      addSheet(acc, fn, 28, 28, 0.075, mask, 0, R);
    }
    // vesicles budding from rims and trans face
    for (let i = 0; i < 26; i++) {
      const th = R() * 6.28, rr = g.r * R.range(0.75, 1.25);
      const lp = V3(Math.cos(th) * rr, Math.sin(th) * rr, R.range(-0.3, 0.9) + (rr > g.r * 1.0 ? 0.3 : 0.7));
      lp.applyAxisAngle(V3(0, 0, 1), roll).applyQuaternion(q).add(g.c);
      vesicles.push({ p: lp, r: R.range(0.05, 0.1) });
    }
    addAnchor(ctx, 'golgi', { pos: g.c.clone().addScaledVector(g.axis, 0.35), cis: g.c.clone().addScaledVector(g.axis, -0.5), trans: g.c.clone().addScaledVector(g.axis, 0.8), axis: g.axis.clone(), r: g.r });
  });
  const mat = makeMaterial(shared, { color: P.golgi, roughness: 0.45, sss: 0.55, sssColor: '#ff9aa6', bump: 1.0, bumpFreq: 9, rim: 0.3, rimColor: '#ffb0b8', type: 'golgi' });
  const mesh = new THREE.Mesh(acc.geo(), mat); ctx.group.add(mesh);
  const vm = makeMaterial(shared, { color: P.golgiVesicle, roughness: 0.3, clearcoat: 0.6, sss: 0.6, sssColor: '#ffc0b0', type: 'golgi' });
  const vg = new THREE.SphereGeometry(1, 14, 10);
  const im = instanced(vg, vm, vesicles.map((v) => new THREE.Matrix4().compose(v.p, new THREE.Quaternion(), V3(v.r, v.r, v.r))));
  ctx.group.add(im);
  register(ctx, 'golgi', [mesh, im], [mat, vm], { pick: mesh });
}
