// Simplified opaque-clay hepatocyte (see STYLE_SPEC.md): slab cell with the top cut away, a few chunky organelles,
// sinusoid + fenestrated endothelium on the left, bile canaliculus on the right. Sizes exaggerated; counts reduced.
// Proportions/sources: README. Layout is hand-set (deterministic) so the picture is composed, not random.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { makeMaterial } from '../materials.js';
import { makeSlab, H, TRENCH } from '../plan.js';
import { composeAxis, rng, V3 } from '../util.js';

const Y0 = H.floor;           // organelle base (cytosol floor)
export const ENV = { lsecX: -6.9, lumenX: -8.3, wallX: -9.7, zHalf: 4.7 };

export function mergeGeos(list) {
  const out = list.map((g) => { const x = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); if (!x.attributes.normal) x.computeVertexNormals(); return x; });
  const m = mergeGeometries(out, false); out.forEach((g) => g.dispose()); return m;
}
function register(ctx, id, objs, mats, pick = true) {
  const r = (ctx.registry[id] ||= { id, objects: [], mats: [], pick: [] });
  for (const o of [].concat(objs)) { r.objects.push(o); if (pick) { o.userData.orgId = id; r.pick.push(o); ctx.pickables.push(o); } }
  for (const m of [].concat(mats || [])) if (!r.mats.includes(m)) r.mats.push(m);
}
const mats4 = (ctx, id, geo, mat, list, pick = true) => {
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
  ctx.group.add(im); register(ctx, id, im, mat, pick); return im;
};
const M = (pos, sc = 1, q = new THREE.Quaternion()) => new THREE.Matrix4().compose(pos, q, V3(sc, sc, sc));

// ------------------------------------------------------------------ cell body
export function buildBody(ctx) {
  const { P, shared } = ctx;
  const slab = ctx.slab = makeSlab();
  const rimM = makeMaterial(shared, { color: '#fff', roughness: 0.6, domain: { sin: P.sinusoidal, can: P.canalicular, lat: P.lateral }, sss: 0.3, sssColor: '#ffd0e0', bump: 0.5, bumpFreq: 3, wbump: true, type: 'plasma_lateral' });
  const rim = new THREE.Mesh(slab.rim, rimM); ctx.group.add(rim); register(ctx, 'plasma_lateral', rim, rimM, false);
  rim.userData.isShell = true; rim.userData.orgId = 'plasma_lateral'; ctx.pickables.push(rim);
  const floorM = makeMaterial(shared, { color: P.cytosol, roughness: 0.75, meshTex: P.filament, bump: 0.6, bumpFreq: 3, wbump: true, sss: 0.25, sssColor: '#8fa8ff', type: 'cell_body' });
  const floor = new THREE.Mesh(slab.floor, floorM); ctx.group.add(floor); register(ctx, 'cell_body', floor, floorM, false);
  const lidM = makeMaterial(shared, { color: '#fff', roughness: 0.6, domain: { sin: P.sinusoidal, can: P.canalicular, lat: P.lateral }, sss: 0.3, sssColor: '#ffd0e0', bump: 0.5, bumpFreq: 3, wbump: true, type: 'plasma_lateral' });
  const lid = new THREE.Mesh(slab.lid, lidM); lid.visible = false; ctx.group.add(lid); ctx.lid = lid;
  register(ctx, 'plasma_lateral', [], lidM, false);
}

// ------------------------------------------------------------------ nucleus (dome with a cut quadrant), ER rings
function quarter(r, r0 = 0) {
  const s = new THREE.Shape(); s.moveTo(r0, 0); s.lineTo(r, 0); s.absarc(0, 0, r, 0, Math.PI / 2, false); s.lineTo(0, r0); if (r0 > 0) s.absarc(0, 0, r0, Math.PI / 2, 0, true); else s.lineTo(0, 0);
  return new THREE.ShapeGeometry(s, 32);
}
export function buildNucleus(ctx) {
  const { P, shared, L } = ctx, R = rng(31), noise = new SimplexNoise({ random: R });
  const env = makeMaterial(shared, { color: P.nucleus, roughness: 0.6, side: THREE.DoubleSide, bump: 1.2, bumpFreq: 6, wbump: false, sss: 0.4, sssColor: '#b48cff', cap: '#9a68e6', type: 'nucleus' });
  const band = makeMaterial(shared, { color: '#6a3fb8', roughness: 0.7, side: THREE.DoubleSide, bump: 0.6, bumpFreq: 8, type: 'nucleus' });
  const core = makeMaterial(shared, { color: P.nucleusCap, roughness: 0.85, side: THREE.DoubleSide, bump: 0.5, bumpFreq: 4, sss: 0.3, sssColor: '#d0b6ff', type: 'nucleus' });
  const pore = makeMaterial(shared, { color: '#c9aaff', roughness: 0.6, type: 'nucleus' });
  const nuM = makeMaterial(shared, { color: P.nucleolus, roughness: 0.3, clearcoat: 0.6, sss: 0.5, sssColor: '#8a6cff', bump: 0.6, bumpFreq: 8, type: 'nucleolus' });
  L.nuclei.forEach((n, ni) => {
    const g = new THREE.SphereGeometry(n.r, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = g.attributes.position, idx = g.index, keep = [];
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const d = 1 + 0.025 * noise.noise3d(x * 1.5, y * 1.5, z * 1.5); pos.setXYZ(i, x * d, y * d, z * d); }
    for (let t = 0; t < idx.count; t += 3) { const cx = (pos.getX(idx.getX(t)) + pos.getX(idx.getX(t + 1)) + pos.getX(idx.getX(t + 2))) / 3, cz = (pos.getZ(idx.getX(t)) + pos.getZ(idx.getX(t + 1)) + pos.getZ(idx.getX(t + 2))) / 3; if (!(cx > 0.02 && cz > 0.02)) keep.push(idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)); }
    g.setIndex(keep); g.computeVertexNormals();
    const dome = new THREE.Mesh(g, env); dome.position.set(n.c.x, Y0, n.c.z); ctx.group.add(dome); register(ctx, 'nucleus', dome, env);
    const t = 0.24, cap = (geo, m, rot, off) => { geo.applyMatrix4(rot); const me = new THREE.Mesh(geo, m); me.position.set(n.c.x, Y0, n.c.z).add(off || V3()); ctx.group.add(me); register(ctx, 'nucleus', me, m); };
    const rz = new THREE.Matrix4(), rx = new THREE.Matrix4().makeRotationX(Math.PI / 2), ry = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    cap(quarter(n.r, n.r - t), band, rz); cap(quarter(n.r - t), core, rz);              // wall at z = 0 (faces +z)
    cap(quarter(n.r, n.r - t), band, ry); cap(quarter(n.r - t), core, ry);              // wall at x = 0 (faces +x)
    const base = new THREE.Matrix4().makeRotationX(Math.PI / 2); base.setPosition(0, 0.01, 0);
    cap(quarter(n.r - t), core, base);                                                    // floor of the cut
    // nucleolus sits in the opening
    const nu = new THREE.Mesh(new THREE.SphereGeometry(n.r * 0.27, 40, 24), nuM); nu.position.set(n.c.x + n.r * 0.42, Y0 + n.r * 0.27, n.c.z + n.r * 0.42); ctx.group.add(nu); register(ctx, 'nucleolus', nu, nuM);
    // nuclear pores on the dome
    const pm = [];
    for (let i = 0; i < 46; i++) { const u = R(), a = R() * 6.283; const ph = Math.acos(1 - u * 0.95), d = V3(Math.sin(ph) * Math.cos(a), Math.cos(ph), Math.sin(ph) * Math.sin(a)); if (d.x > 0 && d.z > 0) continue; pm.push(M(V3(n.c.x + d.x * n.r * 1.01, Y0 + d.y * n.r * 1.01, n.c.z + d.z * n.r * 1.01), 1)); }
    const pg = new THREE.SphereGeometry(0.075, 10, 8); mats4(ctx, 'nucleus', pg, pore, pm, false);
    (ctx.anchors.nucleus ||= []).push({ pos: V3(n.c.x, Y0, n.c.z), r: n.r });
  });
}

export function buildER(ctx) {
  const { P, shared, L } = ctx, R = rng(101);
  const mat = makeMaterial(shared, { color: P.rer, roughness: 0.6, sss: 0.35, sssColor: '#7b8dff', bump: 0.25, bumpFreq: 5, type: 'rer' });
  const rib = makeMaterial(shared, { color: P.ribosome, roughness: 0.6, type: 'rer' });
  const geos = [], beads = [];
  L.nuclei.forEach((n) => {
    const rings = L.nuclei.length > 1 ? 2 : 3;
    for (let k = 0; k < rings; k++) {
      const r0 = n.r + 0.4 + 0.42 * k, w = 0.11;
      const nseg = Math.round((Math.PI * 2 * r0) / 0.8);
      for (let s = 0; s < nseg; s++) {
        const a0 = (s / nseg) * Math.PI * 2 + 0.05, a1 = ((s + 1) / nseg) * Math.PI * 2 - 0.05;
        const h = 0.4 + R() * 0.28 - 0.06 * k;
        const sh = new THREE.Shape(); sh.absarc(0, 0, r0 + w, a0, a1, false); sh.absarc(0, 0, r0, a1, a0, true);
        const g = new THREE.ExtrudeGeometry(sh, { depth: h - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelOffset: -0.03, bevelSegments: 2, curveSegments: 6 });
        g.rotateX(-Math.PI / 2); g.translate(n.c.x, Y0 + 0.02, n.c.z); g.deleteAttribute('uv'); geos.push(g);
        for (let b = 0; b < 2; b++) { const a = a0 + (a1 - a0) * R(); beads.push(M(V3(n.c.x + Math.cos(a) * (r0 + w + 0.02), Y0 + 0.1 + R() * (h - 0.15), n.c.z - Math.sin(a) * (r0 + w + 0.02)), 0.6 + R() * 0.5)); }
      }
    }
  });
  // (shape lies in x/y; after rotateX(-90°) its y becomes -z, hence the sign flip on bead z above)
  const mesh = new THREE.Mesh(mergeGeos(geos), mat); ctx.group.add(mesh); register(ctx, 'rer', mesh, mat);
  mats4(ctx, 'rer', new THREE.SphereGeometry(0.05, 8, 6), rib, beads, false);
}

// smooth ER: tubes lying on the floor
export function buildSER(ctx) {
  const { P, shared } = ctx, R = rng(203);
  const geos = [], nodes = [];
  const seeds = ctx.L.serSeeds;
  for (const [sx, sz] of seeds) for (let b = 0; b < 3; b++) {
    let a = R() * 6.28, p = V3(sx, Y0 + 0.13, sz); const pts = [p.clone()];
    for (let i = 0; i < 6; i++) { a += R.range(-0.7, 0.7); p = p.clone().add(V3(Math.cos(a) * 0.42, R.range(-0.02, 0.05), Math.sin(a) * 0.42)); if (!ctx.inCell(p.x, p.z, 0.5)) break; pts.push(p.clone()); }
    if (pts.length < 3) continue;
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.075, 8, false));
    const e = pts[pts.length - 1]; geos.push(new THREE.SphereGeometry(0.11, 10, 8).translate(e.x, e.y, e.z));
    pts.forEach((q) => nodes.push(q.clone()));
  }
  const mat = makeMaterial(shared, { color: P.ser, roughness: 0.5, sss: 0.5, sssColor: '#6fd6ff', bump: 0.4, bumpFreq: 10, type: 'ser' });
  const mesh = new THREE.Mesh(mergeGeos(geos), mat); ctx.group.add(mesh); register(ctx, 'ser', mesh, mat);
  ctx.anchors.ser = nodes.map((p) => ({ pos: p }));
}

// Golgi: fan of upright, bent pink plates with rim tubes and vesicles
export function buildGolgi(ctx) {
  const { P, shared, L } = ctx, R = rng(307);
  const geos = [], ves = [];
  for (const g0 of L.golgi) {
    for (let k = 0; k < 5; k++) {
      const w = 1.9 - 0.12 * Math.abs(k - 2), h = 0.95 - 0.06 * Math.abs(k - 2);
      const sh = new THREE.Shape(); const rr = 0.16;
      sh.moveTo(-w / 2 + rr, 0); sh.lineTo(w / 2 - rr, 0); sh.quadraticCurveTo(w / 2, 0, w / 2, rr); sh.lineTo(w / 2, h - rr); sh.quadraticCurveTo(w / 2, h, w / 2 - rr, h); sh.lineTo(-w / 2 + rr, h); sh.quadraticCurveTo(-w / 2, h, -w / 2, h - rr); sh.lineTo(-w / 2, rr); sh.quadraticCurveTo(-w / 2, 0, -w / 2 + rr, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 5 }); g.deleteAttribute('uv');
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const bend = 0.28 * x * x; pos.setXYZ(i, x, pos.getY(i) + 0.05 * Math.sin(x * 6 + k), z + bend + k * 0.4); }
      g.computeVertexNormals();
      // stack axis: local +z = trans direction (toward the canaliculus, +x)
      g.rotateY(Math.PI / 2 + g0.rot); g.translate(g0.c.x, Y0, g0.c.z); geos.push(g);
      // rim tubes
      for (const sgn of [-1, 1]) {
        const lp = V3(sgn * w / 2, 0.02, 0.02 + 0.28 * (w / 2) ** 2 + k * 0.4 + 0.04).applyAxisAngle(V3(0, 1, 0), Math.PI / 2 + g0.rot).add(V3(g0.c.x, Y0, g0.c.z));
        geos.push(new THREE.CylinderGeometry(0.075, 0.075, h * 0.7, 10).translate(lp.x, lp.y + h * 0.35, lp.z));
      }
    }
    const tr = V3(0, 0, 2.3).applyAxisAngle(V3(0, 1, 0), Math.PI / 2 + g0.rot);
    for (let i = 0; i < 10; i++) ves.push(M(V3(g0.c.x + tr.x * (0.8 + R() * 0.4) + R.range(-0.7, 0.7), Y0 + 0.1 + R() * 0.25, g0.c.z + tr.z * (0.8 + R() * 0.4) + R.range(-0.7, 0.7)), 0.07 + R() * 0.06));
    (ctx.anchors.golgi ||= []).push({ cis: V3(g0.c.x, Y0 + 0.4, g0.c.z).add(V3(0, 0, 0).sub(tr.clone().multiplyScalar(0.55))), trans: V3(g0.c.x, Y0 + 0.35, g0.c.z).add(tr.clone().multiplyScalar(1.15)) });
  }
  const mat = makeMaterial(shared, { color: P.golgi, roughness: 0.5, side: THREE.DoubleSide, sss: 0.5, sssColor: '#ff9aa6', bump: 0.7, bumpFreq: 9, type: 'golgi' });
  const mesh = new THREE.Mesh(mergeGeos(geos), mat); ctx.group.add(mesh); register(ctx, 'golgi', mesh, mat);
  const vm = makeMaterial(shared, { color: P.golgiVesicle, roughness: 0.35, clearcoat: 0.5, type: 'golgi' });
  mats4(ctx, 'golgi', new THREE.SphereGeometry(1, 14, 10), vm, ves, false);
}

// ------------------------------------------------------------------ mitochondria: opened bowls with visible cristae
function mitoGeos() {
  const CUT = 0.5;
  const shell = new THREE.SphereGeometry(1, 40, 24); const pos = shell.attributes.position, idx = shell.index, keep = [];
  for (let t = 0; t < idx.count; t += 3) { const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2); if ((pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3 < CUT - 0.01) keep.push(a, b, c); }
  shell.setIndex(keep);
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > CUT) pos.setY(i, CUT);
  shell.computeVertexNormals();
  const ry = Math.sqrt(1 - CUT * CUT);
  const lip = new THREE.TorusGeometry(1, 0.06, 8, 48); lip.rotateX(Math.PI / 2); lip.scale(ry, 1, ry); lip.translate(0, CUT, 0);
  const matrix = new THREE.CircleGeometry(0.985, 40); matrix.rotateX(-Math.PI / 2); matrix.translate(0, 0.005, 0);
  // cristae: upright baffles alternating from either wall (unit space; matrix floor at y = 0)
  const plates = [], N = 8;
  for (let i = 0; i < N; i++) {
    const x = -0.74 + (1.48 * i) / (N - 1), half = Math.sqrt(Math.max(0.03, 1 - x * x)) * 0.9, side = i % 2 ? 1 : -1;
    const z0 = side * half, z1 = -side * half * 0.25, s = new THREE.Shape();
    s.moveTo(z0, 0); s.lineTo(z1, 0); s.lineTo(z1, 0.34 + 0.04 * Math.sin(i * 2));
    for (let k = 1; k <= 8; k++) { const u = k / 8; s.lineTo(z1 + (z0 - z1) * u, 0.34 + 0.08 * Math.sin(u * 8 + i)); }
    s.lineTo(z0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 4 }); g.deleteAttribute('uv');
    g.rotateY(-Math.PI / 2); g.translate(x + 0.035, 0, 0); plates.push(g);
  }
  return { shell, lip, matrix, cristae: mergeGeos(plates) };
}
export function buildMito(ctx) {
  const { P, shared, L } = ctx;
  const g = mitoGeos();
  const shellM = makeMaterial(shared, { color: P.mitoOuter, roughness: 0.55, side: THREE.DoubleSide, cap: P.mitoMatrix, sss: 0.5, sssColor: '#ff8a4a', bump: 0.7, bumpFreq: 5, type: 'mitochondrion' });
  const lipM = makeMaterial(shared, { color: '#f08a3c', roughness: 0.5, sss: 0.5, sssColor: '#ffb070', type: 'mitochondrion' });
  const mxM = makeMaterial(shared, { color: P.mitoMatrix, roughness: 0.6, sss: 0.4, sssColor: '#ff5a3a', bump: 0.8, bumpFreq: 9, type: 'mitochondrion' });
  const crM = makeMaterial(shared, { color: P.mitoCristae, roughness: 0.5, side: THREE.DoubleSide, sss: 0.7, sssColor: '#ffc060', bump: 0.5, bumpFreq: 8, type: 'mitochondrion' });
  const mats = L.mito.map((m) => {
    (ctx.anchors.mito ||= []).push({ pos: V3(m.c.x, Y0 + 0.3, m.c.z), s: m.s });
    return new THREE.Matrix4().compose(V3(m.c.x, Y0 + 0.1, m.c.z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), m.ang), V3(m.s, 0.72 * m.s, 0.55 * m.s));
  });
  mats4(ctx, 'mitochondrion', g.shell, shellM, mats);
  mats4(ctx, 'mitochondrion', g.lip, lipM, mats, false); mats4(ctx, 'mitochondrion', g.matrix, mxM, mats, false); mats4(ctx, 'mitochondrion', g.cristae, crM, mats, false);
}

// ------------------------------------------------------------------ small organelles and decoration
export function buildSmall(ctx) {
  const { P, shared, L } = ctx, R = rng(83);
  const sph = new THREE.SphereGeometry(1, 28, 20);
  const put = (id, list, mat, hemi = false) => mats4(ctx, id, sph, mat, list.map((s) => new THREE.Matrix4().compose(V3(s.c.x, Y0 + s.r * (hemi ? 0.4 : 0.78), s.c.z), new THREE.Quaternion(), V3(s.r, s.r * (hemi ? 0.8 : 1), s.r))));
  put('lysosome', L.lyso, makeMaterial(shared, { color: P.lysosome, roughness: 0.5, sss: 0.5, sssColor: '#ff5ab0', bump: 1.4, bumpFreq: 9, type: 'lysosome' }));
  put('peroxisome', L.perox, makeMaterial(shared, { color: P.peroxisome, roughness: 0.45, sss: 0.5, sssColor: '#ffcf50', bump: 1.0, bumpFreq: 8, type: 'peroxisome' }));
  put('lipid_droplet', L.ld, makeMaterial(shared, { color: P.lipidDroplet, roughness: 0.2, clearcoat: 1, sss: 0.6, sssColor: '#ffe9a0', envMapIntensity: 1, bump: 0.2, bumpFreq: 4, type: 'lipid_droplet' }));
  // glycogen rosettes: clusters of pale beads
  const bead = new THREE.IcosahedronGeometry(1, 1), gm = makeMaterial(shared, { color: P.glycogen, roughness: 0.55, sss: 0.5, sssColor: '#ffd6e2', type: 'glycogen' });
  const gl = [];
  for (const f of L.glyc) for (let i = 0; i < 14; i++) gl.push(M(V3(f.c.x + R.range(-0.32, 0.32), Y0 + 0.08 + R() * 0.16, f.c.z + R.range(-0.32, 0.32)), 0.06 + R() * 0.03));
  mats4(ctx, 'glycogen', bead, gm, gl);
  // confetti vesicles (as in the reference renders): a handful of small coloured beads
  const cols = ['#e8b93c', '#f0a6d4', '#7fb6ff', '#b58ad6', '#ffb0a0'];
  const cm = new THREE.MeshStandardMaterial({ roughness: 0.4 });
  const ves = [];
  for (const v of L.confetti) ves.push({ v });
  ves.forEach(({ v }, i) => { const m = makeMaterial(shared, { color: cols[i % cols.length], roughness: 0.4, clearcoat: 0.3, type: 'cell_body' }); const me = new THREE.Mesh(sph, m); me.position.set(v.x, Y0 + v.r * 0.7, v.z); me.scale.setScalar(v.r); ctx.group.add(me); register(ctx, 'cell_body', me, m, false); });
  // filament ropes lying on the floor (pale blue mesh)
  const rm = makeMaterial(shared, { color: P.filament, roughness: 0.6, sss: 0.3, type: 'cell_body' }), ropes = [];
  for (let i = 0; i < 26; i++) {
    let p = V3(R.range(-4.4, 4.0), Y0 + 0.03, R.range(-3.6, 3.6)); if (!ctx.inCell(p.x, p.z, 0.45)) continue; let a = R() * 6.28; const pts = [p.clone()];
    for (let k = 0; k < 6; k++) { a += R.range(-0.5, 0.5); p = p.clone().add(V3(Math.cos(a) * 0.7, R.range(0, 0.03), Math.sin(a) * 0.7)); if (!ctx.inCell(p.x, p.z, 0.4)) break; pts.push(p.clone()); }
    if (pts.length > 2) ropes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.028, 5, false));
  }
  if (ropes.length) { const rp = new THREE.Mesh(mergeGeos(ropes), rm); ctx.group.add(rp); register(ctx, 'cell_body', rp, rm, false); }
}

// ------------------------------------------------------------------ membrane specialisations
function villusGeo() {
  const pts = [new THREE.Vector2(1.35, -0.05), new THREE.Vector2(1.0, 0.1), new THREE.Vector2(0.92, 0.5), new THREE.Vector2(0.98, 0.85)];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(0.98 * Math.cos(a), 0.85 + 0.15 * Math.sin(a))); }
  return new THREE.LatheGeometry(pts, 10);
}
export function buildMicrovilli(ctx) {
  const { P, shared } = ctx, R = rng(401), vg = villusGeo();
  const mat = makeMaterial(shared, { color: P.microvilliSin, roughness: 0.55, sss: 0.5, sssColor: '#ffc0d0', bump: 0.4, bumpFreq: 8, wbump: true, type: 'microvilli_sinusoidal' });
  const list = [], villi = [];
  const rows = [-1.15, -0.7, -0.25, 0.05];
  rows.forEach((y, ri) => { for (let z = -2.75 + (ri % 2) * 0.17; z <= 2.7; z += 0.34) {
    const len = R.range(0.55, 0.85), zz = z + R.range(-0.04, 0.04), yy = y + R.range(-0.04, 0.04), wx = -5.02;
    list.push(composeAxis(V3(wx + 0.06, yy, zz), V3(-1, 0, 0), R() * 6, 0.1, len, 0.1).clone());
    villi.push({ tip: V3(wx - len, yy, zz), base: V3(wx + 0.4, yy, zz), y: yy, z: zz });
  } });
  mats4(ctx, 'microvilli_sinusoidal', vg, mat, list);
  ctx.anchors.villi = villi;
}

export function buildCanaliculus(ctx) {
  const { P, shared } = ctx, R = rng(409);
  const cx = 4.95, cy = 0.02, cr = 0.72, z0 = TRENCH.z0 - 0.15, z1 = 3.6;
  // half-pipe trough along z (open at the top)
  const g = new THREE.BufferGeometry(), pp = [], ii = [], SEG = 32;
  for (let i = 0; i <= SEG; i++) { const a = Math.PI + (Math.PI * i) / SEG; pp.push(cx + cr * Math.cos(a), cy + cr * Math.sin(a), z0, cx + cr * Math.cos(a), cy + cr * Math.sin(a), z1); }
  for (let i = 0; i < SEG; i++) { const a = i * 2; ii.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setIndex(ii); g.computeVertexNormals();
  const mat = makeMaterial(shared, { color: P.canalicular, roughness: 0.45, side: THREE.DoubleSide, cap: '#9be9d6', clearcoat: 0.4, sss: 0.4, sssColor: '#6fe6cc', bump: 0.3, bumpFreq: 6, type: 'bile_canaliculus' });
  const tube = new THREE.Mesh(g, mat); ctx.group.add(tube); register(ctx, 'bile_canaliculus', tube, mat);
  // canalicular microvilli: short teal fingers from both walls
  const vg = villusGeo(), vm = makeMaterial(shared, { color: '#8ce6d2', roughness: 0.5, sss: 0.5, sssColor: '#7ff0d8', type: 'plasma_canalicular' }), list = [];
  for (let z = TRENCH.z0 + 0.2; z < TRENCH.z1 - 0.1; z += 0.36) for (const y of [-0.35, -0.02]) {
    list.push(composeAxis(V3(TRENCH.x + 0.03, y + R.range(-0.03, 0.03), z + R.range(-0.05, 0.05)), V3(1, 0, 0), R() * 6, 0.075, R.range(0.22, 0.4), 0.075).clone());
    list.push(composeAxis(V3(cx + cr - 0.03, y + R.range(-0.03, 0.03), z + 0.18), V3(-1, 0, 0), R() * 6, 0.075, R.range(0.22, 0.4), 0.075).clone());
  }
  mats4(ctx, 'plasma_canalicular', vg, vm, list);
  // tight-junction ropes at the trench mouth (top and bottom)
  const tj = makeMaterial(shared, { color: P.tightJunction, roughness: 0.4, emissive: P.tightJunction, emissiveIntensity: 0.25, sss: 0.4, type: 'tight_junction' }), geos = [];
  for (const y of [0.18, -1.2]) for (let k = 0; k < 2; k++) geos.push(new THREE.CylinderGeometry(0.05, 0.05, TRENCH.z1 - TRENCH.z0 + 0.4, 8).rotateX(Math.PI / 2).translate(TRENCH.x - 0.02, y - k * 0.13 * 0, (TRENCH.z0 + TRENCH.z1) / 2 + k * 0));
  const tjm = new THREE.Mesh(mergeGeos(geos), tj); ctx.group.add(tjm); register(ctx, 'tight_junction', tjm, tj);
  ctx.canal = { x: TRENCH.x, cx, cy, z0, z1, r: cr };
}

// ------------------------------------------------------------------ sinusoid side
export function buildSinusoid(ctx) {
  const { P, shared } = ctx, R = rng(601);
  const cols = 14, rows = 2, data = new Uint8Array(cols * rows), plates = [];
  const yLo = -1.55, yHi = 0.45;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const has = R() > 0.2; data[r * cols + c] = has ? 255 : 0; if (has) plates.push(V3(ENV.lsecX, yLo + ((r + 0.5) / rows) * (yHi - yLo), (1 - (c + 0.5) / cols * 2) * ENV.zHalf)); }
  const tex = new THREE.DataTexture(data, cols, rows, THREE.RedFormat, THREE.UnsignedByteType); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true; ctx.disposables.push(tex);
  const g = new THREE.PlaneGeometry(2 * ENV.zHalf, yHi - yLo, 1, 1); g.rotateY(Math.PI / 2); g.translate(ENV.lsecX, (yHi + yLo) / 2, 0);
  const uv = g.attributes.uv; // u along z (plane x-axis before rotation), v along y
  const mat = makeMaterial(shared, { color: P.lsec, roughness: 0.55, side: THREE.DoubleSide, sss: 0.4, sssColor: '#9db6ff', bump: 0.3, bumpFreq: 4, type: 'lsec' });
  mat.userData.key += '|LSEC'; const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    prev(shader); shader.uniforms.uMask = { value: tex }; shader.uniforms.uPlate = { value: new THREE.Vector2(cols, rows) };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUv = uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uMask; uniform vec2 uPlate; varying vec2 vUv;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{ vec2 uvp = vUv * uPlate; vec2 cell = floor(uvp); vec2 f = fract(uvp) - 0.5;
  float has = texture2D(uMask, (cell + 0.5) / uPlate).r;
  float plate = step(length(f * vec2(1.0, 0.75)), 0.42) * step(0.5, has);
  vec2 q = vec2(f.x * 5.5, f.y * 3.2); float row = floor(q.y + 0.5); float off = 0.5 * mod(row, 2.0);
  vec2 cc = vec2(floor(q.x - off + 0.5) + off, row);
  if (plate > 0.5 && length(q - cc) < 0.3) discard; }`);
  };
  const lsec = new THREE.Mesh(g, mat); ctx.group.add(lsec); register(ctx, 'lsec', lsec, mat);
  ctx.anchors.plates = plates;
  // vessel: floor + far wall (dark navy, opaque) so the sinusoid reads as a channel
  const fm = makeMaterial(shared, { color: '#1c2a5c', roughness: 0.8, type: 'sinusoid', bump: 0.3, bumpFreq: 3 });
  const fl = new THREE.Mesh(new THREE.BoxGeometry(ENV.lsecX - ENV.wallX + 0.3, 0.14, 2 * ENV.zHalf + 0.4), fm); fl.position.set((ENV.lsecX + ENV.wallX) / 2, H.bottom - 0.05, 0); ctx.group.add(fl); register(ctx, 'sinusoid', fl, fm);
  const wm = makeMaterial(shared, { color: '#26397a', roughness: 0.7, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, dimAlpha: true, type: 'sinusoid' });
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(2 * ENV.zHalf, yHi - yLo + 0.1).rotateY(Math.PI / 2).translate(ENV.wallX, (yHi + yLo) / 2, 0), wm); wl.renderOrder = 2; ctx.group.add(wl); register(ctx, 'sinusoid', wl, wm, false);
  // erythrocytes: ONE lane, equal speed and even spacing, so they can never overlap
  const prof = []; for (let i = 0; i <= 14; i++) { const t = i / 14; prof.push(new THREE.Vector2(t, 0.5 * (0.62 + 1.25 * t * t - 1.05 * t ** 4) * Math.sqrt(Math.max(0, 1 - t * t)) * 1.5)); }
  const lp = []; for (let i = prof.length - 1; i >= 0; i--) lp.push(prof[i].clone()); for (let i = 1; i < prof.length; i++) lp.push(new THREE.Vector2(prof[i].x, -prof[i].y));
  const rg = new THREE.LatheGeometry(lp, 28), rm = makeMaterial(shared, { color: P.rbc, roughness: 0.5, clearcoat: 0.3, sss: 0.6, sssColor: '#ff5a5a', bump: 0.15, bumpFreq: 3, type: 'sinusoid' });
  const n = 5, span = 2 * ENV.zHalf + 1.2;
  ctx.rbc = { n, span, dia: 0.95, x: ENV.lumenX, mesh: new THREE.InstancedMesh(rg, rm, n) };
  ctx.rbc.mesh.frustumCulled = false; ctx.group.add(ctx.rbc.mesh); register(ctx, 'sinusoid', ctx.rbc.mesh, rm, false);
  updateRBC(ctx, 0, true);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function updateRBC(ctx, dt, playing) {
  const r = ctx.rbc; if (!r) return;
  if (playing) r.t = ((r.t || 0) + dt * 0.6) % r.span;
  const t = r.t || 0;
  for (let i = 0; i < r.n; i++) {
    const z = ENV.zHalf + 0.6 - ((t + (i * r.span) / r.n) % r.span);               // blood flows toward -z
    _e.set(Math.PI / 2, 0, Math.sin(z * 0.9 + i) * 0.12); _q.setFromEuler(_e);      // disc axis along the flow (rouleaux-like)
    _m.compose(V3(r.x, -0.5 + Math.sin(z * 0.7 + i * 2) * 0.12, z), _q, V3(r.dia * 0.5, r.dia * 0.5, r.dia * 0.5));
    r.mesh.setMatrixAt(i, _m);
  }
  r.mesh.instanceMatrix.needsUpdate = true;
}
