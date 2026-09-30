// Cytoskeleton (microtubules from a perinuclear organising centre, cortical actin, pericanalicular actin belt)
// and the cross-section caps (cytosol cut faces with a filament-mesh texture, as in the reference renders).
import * as THREE from 'three';
import { makeMaterial } from '../materials.js';
import { rng, V3 } from '../util.js';
import { GROOVE } from '../cellShape.js';
import { mergeGeos, register } from './common.js';

export function buildCytoskeleton(ctx) {
  const { L, P, shared, sdf } = ctx;
  const R = rng(701);
  const tubes = [], actin = [];
  const n0 = L.nuclei[0];
  const oc = n0.c.clone().add(V3(0.6, -0.4, 0.9).normalize().multiplyScalar(n0.r + 0.25));  // organising centre beside the nucleus
  const dir = V3(), tmp = V3();
  const inside = (p) => sdf.inside(p, 0.12);
  // microtubules: from the OC toward random surface points, bent around obstacles
  for (let i = 0; i < 46; i++) {
    R.unit().toArray().forEach((v, k) => dir.setComponent(k, v));
    const t = sdf.raycast(oc, dir, 12); if (!t) continue;
    const end = oc.clone().addScaledVector(dir, t * 0.94);
    const mid1 = oc.clone().lerp(end, 0.4).add(R.unit().multiplyScalar(0.5)), mid2 = oc.clone().lerp(end, 0.75).add(R.unit().multiplyScalar(0.4));
    const pts = [oc.clone(), mid1, mid2, end].map((p) => { let q = p.clone(); if (!inside(q)) q.multiplyScalar(0.9); return q; });
    // keep out of the nucleus
    for (const q of pts.slice(1)) for (const nu of L.nuclei) { const d = q.clone().sub(nu.c); if (d.length() < nu.r * 1.05) q.copy(nu.c).add(d.setLength(nu.r * 1.08)); }
    tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.014, 4, false));
  }
  // cortical actin: short arcs hugging the membrane
  const c0 = V3(), nrm = V3();
  for (let i = 0; i < 260; i++) {
    R.unit().toArray().forEach((v, k) => dir.setComponent(k, v));
    const t = sdf.raycast(c0, dir, 12); if (!t) continue;
    const p = dir.clone().multiplyScalar(t - 0.14);
    if (p.x > 3.9 && Math.abs(p.z) < 1.1 && Math.abs(p.y) < 3.4) continue;           // leave the groove to the belt
    sdf.normal(p, nrm);
    const tan = R.unit().cross(nrm).normalize(); const len = R.range(0.5, 1.2);
    const pts = [p.clone(), p.clone().addScaledVector(tan, len * 0.5).addScaledVector(nrm, -0.03), p.clone().addScaledVector(tan, len).addScaledVector(nrm, -0.06)];
    actin.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.009, 4, false));
  }
  // pericanalicular actin belt: three loops just inside the groove mouth
  for (let s = 0; s < 3; s++) {
    const w = 1.05 + s * 0.16, pts = [], nseg = 80, straight = GROOVE.y1 - GROOVE.y0, per = 2 * straight + 2 * Math.PI * w;
    for (let i = 0; i < nseg; i++) {
      const tt = (i / nseg) * per; let y, z;
      if (tt < straight) { y = GROOVE.y0 + tt; z = w; } else if (tt < straight + Math.PI * w) { const a = (tt - straight) / w; y = GROOVE.y1 + Math.sin(a) * w; z = Math.cos(a) * w; }
      else if (tt < 2 * straight + Math.PI * w) { y = GROOVE.y1 - (tt - straight - Math.PI * w); z = -w; } else { const a = (tt - 2 * straight - Math.PI * w) / w; y = GROOVE.y0 - Math.sin(a) * w; z = -Math.cos(a) * w; }
      pts.push(V3(GROOVE.x - 1.02 - 0.05 * s, y, z + GROOVE.z));
    }
    // clip points outside the cell
    const ok = pts.filter((p) => sdf.inside(p, 0.02));
    if (ok.length > 8) actin.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ok, false), 120, 0.016, 5, false));
  }
  const mat = makeMaterial(shared, { color: P.cytoskeleton, roughness: 0.6, transparent: true, opacity: 0.38, depthWrite: false, sss: 0.4, type: 'cytoskeleton', dimAlpha: true });
  const a = new THREE.Mesh(mergeGeos(tubes), mat), b = new THREE.Mesh(mergeGeos(actin), mat);
  a.renderOrder = 4; b.renderOrder = 4;
  ctx.group.add(a, b);
  register(ctx, 'cytoskeleton', [a, b], mat, { pick: [a, b] });
}

/** Cut-face caps in cytosol colour, rebuilt when the section moves. */
export function buildCaps(ctx) {
  const { P, shared } = ctx;
  const SEG = 180;
  const mk = (plane) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3));
    const idx = []; for (let i = 0; i < SEG; i++) idx.push(0, i + 1, i + 2 > SEG ? 1 : i + 2);
    g.setIndex(idx);
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3).map((_, i) => (i % 3 === (plane === 'floor' ? 1 : 2) ? 1 : 0)), 3));
    const m = makeMaterial(shared, { color: P.cytosol, roughness: 0.9, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, capPlane: plane, sss: 0.3, sssColor: '#8fa8ff', type: 'membrane', meshTex: '#c5d3f0', polygonOffset: 1, wbump: true, bump: 0.5, bumpFreq: 4 });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 3; mesh.frustumCulled = false;
    ctx.group.add(mesh);
    return { g, m, mesh };
  };
  ctx.caps = { floor: mk('floor'), wall: mk('wall') };
  ctx.capsSeg = SEG;
  updateCaps(ctx);
}

export function updateCaps(ctx) {
  const { sdf, shared } = ctx; if (!ctx.caps) return;
  const cy = shared.uCutY.value, cz = shared.uCutZ.value, SEG = ctx.capsSeg;
  const o = V3(), d = V3();
  // floor: plane y = cy, star-shaped about (x0, cy, 0)
  {
    const pos = ctx.caps.floor.g.attributes.position; const c = V3(-0.2, cy, 0.0);
    pos.setXYZ(0, c.x, cy, c.z);
    for (let i = 0; i < SEG; i++) { const a = (i / SEG) * Math.PI * 2; d.set(Math.cos(a), 0, Math.sin(a)); const t = sdf.raycast(c, d, 12) ?? 5; pos.setXYZ(i + 1, c.x + d.x * t, cy, c.z + d.z * t); }
    pos.needsUpdate = true; ctx.caps.floor.g.computeBoundingSphere();
  }
  {
    const pos = ctx.caps.wall.g.attributes.position; const c = V3(-0.2, 0, cz);
    pos.setXYZ(0, c.x, c.y, cz);
    for (let i = 0; i < SEG; i++) { const a = (i / SEG) * Math.PI * 2; d.set(Math.cos(a), Math.sin(a), 0); const t = sdf.raycast(c, d, 12) ?? 5; pos.setXYZ(i + 1, c.x + d.x * t, c.y + d.y * t, cz); }
    pos.needsUpdate = true; ctx.caps.wall.g.computeBoundingSphere();
  }
}
