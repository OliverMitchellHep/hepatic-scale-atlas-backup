// Deterministic organelle placement inside the cell SDF. Counts come from data/organelles.json (reduced ~10x
// from real numbers for legibility); sizes are exaggerated ~1.5-2.5x. Proportions and sources: README + organelles.json.
import * as THREE from 'three';
import { rng, V3, smoothstep } from './util.js';
import { GROOVE } from './cellShape.js';

export function planLayout(sdf, org, { binucleate = false, seed = 11, mitoScale = 1 } = {}) {
  const R = rng(seed);
  const by = (id) => org.items.find((x) => x.id === id);
  const occ = []; // {p, r}
  const free = (p, r, pad = 0.06) => { for (const o of occ) if (o.p.distanceTo(p) < o.r + r + pad) return false; return true; };
  const take = (p, r) => occ.push({ p: p.clone(), r });
  const grooveAxisDist = (p) => Math.hypot(p.x - GROOVE.x, p.z - GROOVE.z);
  const L = { nuclei: [], nucleoli: [], golgi: [], rer: [], mito: [], perox: [], lyso: [], endo: [], ld: [], glyc: [], serNodes: [], serEdges: [], occ };

  // --- nucleus (Alberts MBoC: ~6% of cell volume; one big nucleus or two smaller) ---
  if (!binucleate) L.nuclei.push({ c: V3(-0.4, 0.1, 0.0), r: 1.9 });
  else { L.nuclei.push({ c: V3(-1.7, 0.2, -0.1), r: 1.5 }); L.nuclei.push({ c: V3(1.3, 0.0, 0.2), r: 1.5 }); }
  for (const n of L.nuclei) { take(n.c, n.r + 0.05); L.nucleoli.push({ c: n.c.clone().add(V3(0.12, 0.28, 0.3).multiplyScalar(n.r / 1.9)), r: 0.5 * n.r / 1.9 }); }
  L.cut = { y: L.nuclei[0].c.y + 0.28, z: L.nuclei[0].c.z + 0.22 };
  const bmin = V3(-4.7, -3.6, -3.8), bmax = V3(4.5, 3.6, 3.8);
  const rand = () => V3(R.range(bmin.x, bmax.x), R.range(bmin.y, bmax.y), R.range(bmin.z, bmax.z));
  const tryPlace = (r, ok, tries = 400, margin = 0.2) => {
    for (let i = 0; i < tries; i++) { const p = rand(); if (!sdf.inside(p, r + margin)) continue; if (ok && !ok(p)) continue; if (!free(p, r)) continue; return p; }
    return null;
  };

  // --- Golgi: several stacks clustered near the canaliculus (Alberts; Treyer & Musch 2013) ---
  const ng = by('golgi').count;
  for (let i = 0; i < ng; i++) {
    const p = tryPlace(1.05, (q) => q.x > 1.4 && grooveAxisDist(q) < 3.4 && Math.abs(q.y) < 3.0, 900, 0.3);
    if (!p) continue;
    const axis = p.clone().sub(L.nuclei[0].c); axis.y *= 0.4; axis.normalize();      // cis face toward the nucleus, trans toward the canaliculus
    L.golgi.push({ c: p, axis, r: 0.95 }); take(p, 1.05);
  }
  // --- rough ER: perinuclear layered shells + cytoplasmic parallel stacks (basophilic bodies) ---
  const nr = by('rer').count;
  for (let i = 0; i < nr - 1; i++) {
    const p = tryPlace(0.95, (q) => q.x < 3.0, 900, 0.25);
    if (!p) continue;
    const axis = R.unit(); if (R() < 0.5) axis.copy(p.clone().sub(L.nuclei[0].c).normalize());
    L.rer.push({ c: p, axis, a: R.range(0.95, 1.35), b: R.range(0.7, 1.05), n: R.int(4, 6) }); take(p, 0.95);
  }
  // --- mitochondria: numerous, elongated, throughout cytoplasm (~1000-2000 per cell; ~110 shown) ---
  const nm = Math.round(by('mitochondrion').count * mitoScale);
  for (let i = 0; i < nm; i++) {
    const s = R.range(0.75, 1.25);
    const p = tryPlace(0.5 * s, null, 200, 0.12);
    if (!p) continue;
    const n = sdf.normal(p);
    const axis = R() < 0.5 ? R.unit() : R.unit().cross(n).normalize();
    if (!isFinite(axis.x)) axis.set(0, 1, 0);
    L.mito.push({ pos: p, axis, roll: R() * 6.28, scale: s }); take(p, 0.5 * s);
  }
  // --- lysosomes: pericanalicular ---
  for (let i = 0; i < by('lysosome').count; i++) {
    const r = R.range(0.13, 0.22);
    const p = tryPlace(r, (q) => grooveAxisDist(q) < 3.2 && q.x > 1.5, 300, 0.1) || tryPlace(r, null, 200, 0.1);
    if (p) { L.lyso.push({ pos: p, r }); take(p, r); }
  }
  // --- peroxisomes: scattered, near mitochondria / SER ---
  for (let i = 0; i < by('peroxisome').count; i++) {
    const r = R.range(0.15, 0.23);
    const p = tryPlace(r, null, 300, 0.08);
    if (p) { L.perox.push({ pos: p, r }); take(p, r); }
  }
  // --- endosomes near the sinusoidal face ---
  for (let i = 0; i < by('endosome').count; i++) {
    const r = R.range(0.1, 0.16);
    const p = tryPlace(r, (q) => q.x < -2.8, 300, 0.06);
    if (p) { L.endo.push({ pos: p, r }); take(p, r); }
  }
  // --- lipid droplets ---
  for (let i = 0; i < by('lipid_droplet').count; i++) {
    const r = R() < 0.25 ? R.range(0.38, 0.55) : R.range(0.16, 0.32);
    const p = tryPlace(r, null, 300, 0.1);
    if (p) { L.ld.push({ pos: p, r }); take(p, r); }
  }
  // --- glycogen fields ---
  for (let i = 0; i < by('glycogen').count; i++) {
    const p = tryPlace(0.42, null, 600, 0.04);
    if (p) { L.glyc.push({ c: p, r: 0.42 }); take(p, 0.42); }
  }
  // --- SER: nodes (Poisson-ish) joined to nearest neighbours ---
  const nodes = [];
  for (let i = 0; i < 2500 && nodes.length < 150; i++) {
    const p = rand();
    if (!sdf.inside(p, 0.3)) continue;
    let ok = true;
    for (const o of occ) if (o.p.distanceTo(p) < o.r + 0.07) { ok = false; break; }
    if (!ok) continue;
    for (const q of nodes) if (q.distanceTo(p) < 0.62) { ok = false; break; }
    if (ok) nodes.push(p);
  }
  L.serNodes = nodes;
  const key = new Set();
  const segFree = (a, b) => { for (let t = 0.15; t < 0.9; t += 0.25) { const p = a.clone().lerp(b, t); for (const o of occ) if (o.p.distanceTo(p) < o.r + 0.04) return false; } return true; };
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => ({ j, d: i === j ? 1e9 : a.distanceTo(b) })).sort((u, v) => u.d - v.d).slice(0, 3);
    for (const { j, d } of near) {
      if (d > 1.35) continue;
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (key.has(k)) continue;
      if (!segFree(a, nodes[j])) continue;
      key.add(k); L.serEdges.push([i, j]);
    }
  });
  L.by = by;
  return L;
}
