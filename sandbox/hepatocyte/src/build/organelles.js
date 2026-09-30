// Nucleus (+ nucleolus, pores, chromatin), mitochondria (visible cristae), peroxisomes, lysosomes,
// endosomes, lipid droplets, glycogen rosettes. Sizes exaggerated ~1.5-2.5x; counts reduced (see organelles.json).
import * as THREE from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { makeMaterial } from '../materials.js';
import { composeAxis, rng, V3 } from '../util.js';
import { mergeGeos, register, addAnchor, instanced, proxyFor } from './common.js';

const proxyGeo = new THREE.IcosahedronGeometry(1, 1);

/** Planar cut caps for spherical solids: updated when the cut moves. */
export function addCapDiscs(ctx, center, radius, color, id, bump = 1, lift = 0.004) {
  const geo = new THREE.CircleGeometry(1, 72);
  const mf = makeMaterial(ctx.shared, { color, roughness: 0.8, bump, bumpFreq: 7, wbump: true, sss: 0.3, capPlane: 'floor', side: THREE.DoubleSide, type: id, polygonOffset: -2 - lift * 200 });
  const mw = makeMaterial(ctx.shared, { color, roughness: 0.8, bump, bumpFreq: 7, wbump: true, sss: 0.3, capPlane: 'wall', side: THREE.DoubleSide, type: id, polygonOffset: -2 - lift * 200 });
  const floor = new THREE.Mesh(geo, mf), wall = new THREE.Mesh(geo, mw);
  floor.rotation.x = -Math.PI / 2;
  floor.userData.cap = wall.userData.cap = true;
  ctx.capDiscs.push({ center, radius, floor, wall, lift });
  ctx.group.add(floor, wall);
  register(ctx, id, [floor, wall], [mf, mw]);
}
export function updateCapDiscs(ctx) {
  const cy = ctx.shared.uCutY.value, cz = ctx.shared.uCutZ.value;
  for (const d of ctx.capDiscs) {
    const dy = cy - d.center.y, dz = cz - d.center.z;
    const fr = Math.sqrt(Math.max(0, d.radius * d.radius - dy * dy));
    d.floor.visible = Math.abs(dy) < d.radius;
    d.floor.position.set(d.center.x, cy + d.lift, d.center.z);
    d.floor.scale.setScalar(Math.max(fr, 1e-3));
    const wr = Math.sqrt(Math.max(0, d.radius * d.radius - dz * dz));
    d.wall.visible = Math.abs(dz) < d.radius;
    d.wall.position.set(d.center.x, d.center.y, cz + d.lift);
    d.wall.scale.setScalar(Math.max(wr, 1e-3));
  }
}

export function buildNucleus(ctx) {
  const { L, P, shared } = ctx;
  const R = rng(31);
  const noise = new SimplexNoise({ random: R });
  const env = makeMaterial(shared, { color: P.nucleus, roughness: 0.55, side: THREE.DoubleSide, bump: 1.4, bumpFreq: 5, sss: 0.55, sssColor: '#b48cff', cap: P.nucleusCap, type: 'nucleus' });
  const poreMat = makeMaterial(shared, { color: '#cdb0ff', roughness: 0.6, bump: 0.6, bumpFreq: 14, sss: 0.3, type: 'nucleus' });
  const chromMat = makeMaterial(shared, { color: '#6a3cc0', roughness: 0.7, bump: 1, bumpFreq: 8, type: 'nucleus' });
  const nuMat = makeMaterial(shared, { color: P.nucleolus, roughness: 0.32, clearcoat: 0.6, sss: 0.5, sssColor: '#8a6cff', bump: 0.8, bumpFreq: 9, side: THREE.DoubleSide, cap: '#3a1d88', type: 'nucleolus' });
  const objs = [];
  L.nuclei.forEach((n, ni) => {
    const g = new THREE.SphereGeometry(1, 96, 64);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const d = 1 + 0.035 * noise.noise3d(x * 1.6, y * 1.6, z * 1.6) + 0.012 * noise.noise3d(x * 5, y * 5, z * 5);
      pos.setXYZ(i, x * d * n.r, y * d * n.r, z * d * n.r);
    }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, env); mesh.position.copy(n.c);
    ctx.group.add(mesh); objs.push(mesh);
    register(ctx, 'nucleus', mesh, env, { pick: mesh });
    // pores (fibonacci points, jittered)
    const np = Math.round(90 * (n.r * n.r) / 3.6), mats = [];
    for (let i = 0; i < np; i++) {
      const t = (i + 0.5) / np, phi = Math.acos(1 - 2 * t), th = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = V3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
      const p = dir.clone().multiplyScalar(n.r * 1.005).add(n.c);
      mats.push(composeAxis(p, dir, R() * 6.28, 1, 1, 1).clone());
      // torus axis is local Z; rotate so it points along +Y before composing
    }
    const tg = new THREE.TorusGeometry(0.07, 0.03, 8, 14); tg.rotateX(Math.PI / 2);
    const pores = instanced(tg, poreMat, mats);
    ctx.group.add(pores); register(ctx, 'nucleus', pores, poreMat);
    // heterochromatin clumps just under the envelope (visible through the cut)
    const cm = [];
    for (let i = 0; i < 70; i++) {
      const dir = R.unit(); const s = R.range(0.14, 0.3);
      const p = dir.clone().multiplyScalar(n.r * R.range(0.78, 0.94)).add(n.c);
      cm.push(composeAxis(p, dir, R() * 6.28, s * 1.4, s * 0.7, s * 1.1).clone());
    }
    const clumps = instanced(new THREE.IcosahedronGeometry(1, 1), chromMat, cm);
    ctx.group.add(clumps); register(ctx, 'nucleus', clumps, chromMat);
    addCapDiscs(ctx, n.c, n.r * 0.985, P.nucleusCap, 'nucleus', 1.6);
    addAnchor(ctx, 'nucleus', { pos: n.c.clone(), r: n.r });
  });
  L.nucleoli.forEach((u) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(u.r, 48, 32), nuMat); m.position.copy(u.c);
    ctx.group.add(m); register(ctx, 'nucleolus', m, nuMat, { pick: m });
    addCapDiscs(ctx, u.c, u.r * 0.985, '#5a34b8', 'nucleolus', 1.2, 0.012);
  });
}

// ---- mitochondrion: outer membrane shell + matrix + lamellar cristae (unit ellipsoid space) ----
function cristaeGeometry(R) {
  const geos = [];
  const N = 11;
  for (let k = 0; k < N; k++) {
    const y = -0.68 + (1.36 * k) / (N - 1);
    const rad = Math.sqrt(Math.max(0.02, 1 - y * y)) * 0.92;
    const side = k % 2 === 0 ? 1 : -1;                    // alternate walls
    const reach = R.range(0.55, 0.85);                     // how far the shelf extends across the matrix
    const segs = 14, rings = 4;
    const pos = [], idx = [];
    for (let r = 0; r <= rings; r++) {
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs - 0.5) * 2.0 * (1.0 - 0.15 * r / rings) * 1.15;   // arc around the wall
        const rr = rad * (1 - reach * (r / rings) * (0.6 + 0.4 * Math.cos(a * 1.3)));
        const wob = 0.02 * Math.sin(a * 7 + k) * r / rings;
        pos.push(side * Math.cos(a) * rr, y + wob, Math.sin(a) * rr);
      }
    }
    for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) {
      const a = r * (segs + 1) + s, b = a + 1, c = a + segs + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    geos.push(g);
  }
  return mergeGeos(geos);
}

export function buildMitochondria(ctx) {
  const { L, P, shared } = ctx;
  if (!L.mito.length) return;
  const R = rng(57);
  const shellG = new THREE.SphereGeometry(1, 28, 18);
  const coreG = new THREE.SphereGeometry(0.93, 24, 14);
  const cristaeG = cristaeGeometry(R);
  const shellM = makeMaterial(shared, { color: P.mitoOuter, roughness: 0.4, clearcoat: 0.5, transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false, sss: 0.7, sssColor: '#ff7a3a', rim: 0.6, rimColor: '#ffb070', bump: 0.4, bumpFreq: 6, type: 'mitochondrion', dimAlpha: true });
  const coreM = makeMaterial(shared, { color: P.mitoMatrix, roughness: 0.6, transparent: true, opacity: 0.26, depthWrite: false, sss: 0.5, sssColor: '#ff3a2a', type: 'mitochondrion', dimAlpha: true });
  const cristM = makeMaterial(shared, { color: P.mitoCristae, roughness: 0.42, side: THREE.DoubleSide, sss: 1.0, sssColor: '#ffb040', emissive: '#7a3a08', emissiveIntensity: 0.5, bump: 0.7, bumpFreq: 12, type: 'mitochondrion' });
  const mats = [], cols = [];
  L.mito.forEach((m) => {
    const s = m.scale;
    mats.push(composeAxis(m.pos, m.axis, m.roll, 0.30 * s, 0.78 * s, 0.30 * s).clone());
    const c = new THREE.Color().setHSL(R.range(-0.015, 0.02) + 0.045, 1, 1); c.setRGB(1, 1, 1).multiplyScalar(R.range(0.85, 1.1));
    cols.push(c);
    addAnchor(ctx, 'mito', { pos: m.pos.clone(), axis: m.axis.clone(), s });
  });
  const shell = instanced(shellG, shellM, mats), core = instanced(coreG, coreM, mats), cr = instanced(cristaeG, cristM, mats, cols);
  shell.renderOrder = 6; core.renderOrder = 5;
  ctx.group.add(core, cr, shell);
  const proxy = proxyFor(shell, proxyGeo); ctx.group.add(proxy);
  register(ctx, 'mitochondrion', [shell, core, cr], [shellM, coreM, cristM], { pick: proxy });
  ctx.mitoMatrices = mats;
}

// ---- small spherical organelles ----
export function buildSmall(ctx) {
  const { L, P, shared } = ctx;
  const R = rng(83);
  // peroxisomes: translucent gold shell with dense crystalloid core
  if (L.perox.length) {
    const sg = new THREE.SphereGeometry(1, 20, 14), cg = new THREE.BoxGeometry(1, 1, 1);
    const sm = makeMaterial(shared, { color: P.peroxisome, roughness: 0.4, clearcoat: 0.5, transparent: true, opacity: 0.55, depthWrite: false, sss: 0.6, sssColor: '#ffcf50', rim: 0.4, bump: 0.5, bumpFreq: 9, type: 'peroxisome', dimAlpha: true });
    const cm = makeMaterial(shared, { color: P.peroxisomeCore, roughness: 0.7, bump: 0.8, bumpFreq: 14, type: 'peroxisome' });
    const a = [], b = [];
    L.perox.forEach((p) => { a.push(new THREE.Matrix4().compose(p.pos, new THREE.Quaternion(), V3(p.r, p.r, p.r))); b.push(composeAxis(p.pos, R.unit(), R() * 6, p.r * 0.5, p.r * 0.5, p.r * 0.5).clone()); addAnchor(ctx, 'perox', { pos: p.pos.clone(), r: p.r }); });
    const shell = instanced(sg, sm, a), core = instanced(cg, cm, b);
    shell.renderOrder = 6;
    ctx.group.add(core, shell);
    register(ctx, 'peroxisome', [shell, core], [sm, cm], { pick: proxyFor(shell, proxyGeo) });
    ctx.group.add(ctx.registry.peroxisome.pick[0]);
  }
  // lysosomes: dense magenta granular spheres
  if (L.lyso.length) {
    const g = new THREE.SphereGeometry(1, 22, 16);
    const m = makeMaterial(shared, { color: P.lysosome, roughness: 0.5, sss: 0.5, sssColor: '#ff5ab0', bump: 1.6, bumpFreq: 11, type: 'lysosome', rim: 0.3, rimColor: '#ff8ac8' });
    const mats = L.lyso.map((p) => { addAnchor(ctx, 'lyso', { pos: p.pos.clone(), r: p.r }); return new THREE.Matrix4().compose(p.pos, new THREE.Quaternion(), V3(p.r, p.r, p.r)); });
    const im = instanced(g, m, mats); ctx.group.add(im);
    const px = proxyFor(im, proxyGeo); ctx.group.add(px);
    register(ctx, 'lysosome', im, m, { pick: px });
  }
  // endosomes / clathrin-coated vesicles (flat-shaded icosahedron = coat lattice)
  if (L.endo.length) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const m = makeMaterial(shared, { color: P.endosome, roughness: 0.45, sss: 0.5, sssColor: '#ff9ad0', type: 'endosome' }); m.flatShading = true;
    const mats = L.endo.map((p) => { addAnchor(ctx, 'endo', { pos: p.pos.clone(), r: p.r }); return new THREE.Matrix4().compose(p.pos, new THREE.Quaternion(), V3(p.r, p.r, p.r)); });
    const im = instanced(g, m, mats); ctx.group.add(im);
    const px = proxyFor(im, proxyGeo); ctx.group.add(px);
    register(ctx, 'endosome', im, m, { pick: px });
  }
  // lipid droplets: creamy glossy translucent
  if (L.ld.length) {
    const g = new THREE.SphereGeometry(1, 32, 22);
    const m = makeMaterial(shared, { color: P.lipidDroplet, roughness: 0.16, clearcoat: 1, transparent: true, opacity: 0.88, sss: 0.7, sssColor: '#ffe9a0', bump: 0.25, bumpFreq: 4, cap: '#f0d98a', side: THREE.DoubleSide, envMapIntensity: 1.1, type: 'lipid_droplet', dimAlpha: true });
    const mats = L.ld.map((p) => { addAnchor(ctx, 'ld', { pos: p.pos.clone(), r: p.r }); return new THREE.Matrix4().compose(p.pos, new THREE.Quaternion(), V3(p.r, p.r, p.r)); });
    const im = instanced(g, m, mats); im.renderOrder = 7; ctx.group.add(im);
    ctx.ldMesh = im; ctx.ldBase = mats.map((x) => x.clone());
    const px = proxyFor(im, proxyGeo); ctx.group.add(px);
    register(ctx, 'lipid_droplet', im, m, { pick: px });
  }
  // glycogen rosettes
  if (L.glyc.length) {
    const unit = [];
    const bead = new THREE.IcosahedronGeometry(1, 1);
    const centre = bead.clone().scale(0.06, 0.06, 0.06); unit.push(centre);
    const N = 16;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N, phi = Math.acos(1 - 2 * t), th = Math.PI * (1 + Math.sqrt(5)) * i;
      const d = V3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
      const g = bead.clone().scale(0.042, 0.042, 0.042).translate(d.x * 0.1, d.y * 0.1, d.z * 0.1); unit.push(g);
    }
    const ug = mergeGeos(unit);
    const m = makeMaterial(shared, { color: P.glycogen, roughness: 0.5, sss: 0.6, sssColor: '#ffd6e2', type: 'glycogen' });
    const mats = [], hub = [];
    L.glyc.forEach((f) => {
      const n = R.int(8, 12);
      for (let i = 0; i < n; i++) {
        const p = f.c.clone().add(R.unit().multiplyScalar(f.r * Math.cbrt(R())));
        const s = R.range(0.85, 1.25);
        mats.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6)), V3(s, s, s)));
      }
      addAnchor(ctx, 'glyc', { pos: f.c.clone(), r: f.r });
    });
    const im = instanced(ug, m, mats); ctx.group.add(im);
    ctx.glycMesh = im; ctx.glycBase = mats.map((x) => x.clone());
    const pg = new THREE.InstancedMesh(proxyGeo, new THREE.MeshBasicMaterial(), L.glyc.length);
    L.glyc.forEach((f, i) => pg.setMatrixAt(i, new THREE.Matrix4().compose(f.c, new THREE.Quaternion(), V3(f.r * 1.15, f.r * 1.15, f.r * 1.15))));
    pg.visible = false; pg.computeBoundingSphere(); ctx.group.add(pg);
    register(ctx, 'glycogen', im, m, { pick: pg });
  }
}

/** Fed/fasted: rosettes shrink toward fasting, droplets swell slightly (data/states.json). */
export function applyStateToOrganelles(ctx, s, states) {
  const gk = states.glycogen.fed + (states.glycogen.fasted - states.glycogen.fed) * s;
  const lk = states.lipidDroplet.fed + (states.lipidDroplet.fasted - states.lipidDroplet.fed) * s;
  const tmp = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  if (ctx.glycMesh) {
    ctx.glycBase.forEach((m, i) => { m.decompose(p, q, sc); tmp.compose(p, q, sc.multiplyScalar(gk)); ctx.glycMesh.setMatrixAt(i, tmp); });
    ctx.glycMesh.instanceMatrix.needsUpdate = true;
  }
  if (ctx.ldMesh) {
    ctx.ldBase.forEach((m, i) => { m.decompose(p, q, sc); tmp.compose(p, q, sc.multiplyScalar(lk)); ctx.ldMesh.setMatrixAt(i, tmp); });
    ctx.ldMesh.instanceMatrix.needsUpdate = true;
  }
}
