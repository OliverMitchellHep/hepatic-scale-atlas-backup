// Plasma membrane shell (domain-tinted, translucent), cytosol haze, microvilli (sinusoidal + canalicular),
// canaliculus lumen, tight-junction strands, gap junctions, desmosomes, transporter gates.
// Domain fractions: Blouin 1977; polarity: Treyer & Müsch 2013; junction layout: Boyer 2013.
import * as THREE from 'three';
import { makeMaterial } from '../materials.js';
import { buildShell, makeSampler, GROOVE } from '../cellShape.js';
import { composeAxis, rng, V3 } from '../util.js';
import { mergeGeos, register, addAnchor, instanced } from './common.js';

function villusGeometry() {
  // unit villus along +Y (length 1, radius 1 in xz): shaft with rounded tip and slight base flare
  const pts = [];
  pts.push(new THREE.Vector2(1.5, -0.05), new THREE.Vector2(1.0, 0.08), new THREE.Vector2(0.9, 0.5), new THREE.Vector2(0.95, 0.85));
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(0.95 * Math.cos(a), 0.85 + 0.15 * Math.sin(a) * 1.0)); }
  const g = new THREE.LatheGeometry(pts, 8);
  return g;
}

export function buildShellAndSurface(ctx, detail) {
  const { P, shared, sdf, style } = ctx;
  const R = rng(401);
  const geo = buildShell(sdf, detail);
  ctx.shellGeo = geo;
  const mem = style.membrane;
  const shellMat = makeMaterial(shared, {
    color: '#ffffff', roughness: 0.5, clearcoat: 0.2, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    domain: { sin: P.sinusoidal, can: P.canalicular, lat: P.lateral }, shell: { front: mem.opacityFront, back: mem.opacityBack },
    rim: 1.0, rimColor: '#c9b6ff', sss: 0.15, sssColor: '#ffd0e0', bump: 0.25, bumpFreq: 3, type: 'membrane', envMapIntensity: 0.5,
  });
  const shell = new THREE.Mesh(geo, shellMat); shell.renderOrder = 8;
  ctx.group.add(shell);
  ctx.shellMesh = shell; ctx.shellMat = shellMat;
  register(ctx, 'plasma_lateral', shell, shellMat);           // dim/hover of the whole membrane is done via this entry
  // domain picking is done by weight at the hit vertex (see interaction); shell is a pick target of last resort
  shell.userData.orgId = 'plasma_lateral'; shell.userData.isShell = true; ctx.pickables.push(shell);

  // cytosol haze: additive back-face volume tint (depth cue)
  const hazeMat = makeMaterial(shared, { color: P.cytosol, roughness: 1, transparent: true, opacity: mem.haze, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending, type: 'membrane', bump: 0 });
  hazeMat.userData.own.uDim.value = 0;
  const haze = new THREE.Mesh(geo, hazeMat); haze.renderOrder = 2; ctx.group.add(haze);
  ctx.hazeMat = hazeMat;

  // ---------- microvilli ----------
  const vg = villusGeometry();
  const sSin = makeSampler(geo, (d) => Math.pow(d.sin, 3));
  const nS = 320, mS = [], cS = [];
  for (let i = 0; i < nS; i++) {
    const n = V3(); const p = sSin.sample(R, n);
    const len = R.range(0.32, 0.72);
    mS.push(composeAxis(p.clone().addScaledVector(n, -0.03), n, R() * 6, 0.046, len, 0.046).clone());
    cS.push(new THREE.Color().setScalar(R.range(0.85, 1.1)));
  }
  const mvMat = makeMaterial(shared, { color: P.microvilliSin, roughness: 0.45, sss: 0.6, sssColor: '#ffc0d0', sway: 0.6, type: 'microvilli_sinusoidal', rim: 0.25, rimColor: '#ffd0dc' });
  const mv = instanced(vg, mvMat, mS, cS); ctx.group.add(mv);
  const pgeo = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0);
  const pvx = instanced(pgeo, new THREE.MeshBasicMaterial(), mS.map((m) => m.clone().multiply(new THREE.Matrix4().makeScale(2.2, 1, 2.2)))); pvx.visible = false; ctx.group.add(pvx);
  register(ctx, 'microvilli_sinusoidal', mv, mvMat, { pick: pvx });
  ctx.villiSinCount = nS;

  // canalicular microvilli: on our groove wall (teal) + mirrored on the neighbouring hepatocyte's wall (schematic)
  const sCan = makeSampler(geo, (d) => Math.pow(d.can, 3));
  const nC = 90, mC = [], mC2 = [];
  for (let i = 0; i < nC; i++) {
    const n = V3(); const p = sCan.sample(R, n);
    const len = R.range(0.16, 0.34), roll = R() * 6;
    mC.push(composeAxis(p.clone().addScaledVector(n, -0.02), n, roll, 0.05, len, 0.05).clone());
    const p2 = p.clone(); p2.x = 2 * (GROOVE.x) - p2.x; const n2 = n.clone(); n2.x = -n2.x;
    mC2.push(composeAxis(p2, n2, roll, 0.05, len, 0.05).clone());
  }
  const cvMat = makeMaterial(shared, { color: '#8ce6d2', roughness: 0.45, sss: 0.6, sssColor: '#7ff0d8', sway: 0.3, type: 'plasma_canalicular', rim: 0.25, rimColor: '#b8fff0' });
  const cv1 = instanced(vg, cvMat, mC), cv2 = instanced(vg, cvMat, mC2); ctx.group.add(cv1, cv2);
  register(ctx, 'plasma_canalicular', [cv1, cv2], cvMat);

  // ---------- canaliculus lumen (capsule along y) ----------
  const cap = new THREE.CapsuleGeometry(GROOVE.r * 0.96, GROOVE.y1 - GROOVE.y0, 8, 28);
  const lumenMat = makeMaterial(shared, { color: P.canalicular, roughness: 0.2, clearcoat: 0.8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, rim: 1.0, rimColor: '#7ff0d8', sss: 0.5, sssColor: '#4fc9b0', type: 'bile_canaliculus', dimAlpha: true });
  const lumen = new THREE.Mesh(cap, lumenMat); lumen.position.set(GROOVE.x, (GROOVE.y0 + GROOVE.y1) / 2, GROOVE.z); lumen.renderOrder = 9;
  ctx.group.add(lumen);
  register(ctx, 'bile_canaliculus', lumen, lumenMat, { pick: lumen });
  ctx.canaliculus = { x: GROOVE.x, z: GROOVE.z, y0: GROOVE.y0, y1: GROOVE.y1, r: GROOVE.r };

  // ---------- tight-junction strands: stadium loops flanking the groove mouth ----------
  const tjMat = makeMaterial(shared, { color: P.tightJunction, roughness: 0.35, emissive: P.tightJunction, emissiveIntensity: 0.35, sss: 0.5, type: 'tight_junction' });
  const loops = [];
  const mouthX = 4.98;
  const halfW = Math.sqrt(Math.max(0.05, GROOVE.r * GROOVE.r - (GROOVE.x - mouthX) ** 2)) + 0.02;
  let lastX = mouthX;
  const surfX = (y, z) => { // outer surface x at (y,z): march inward from +x
    for (let x = 6.5; x > 3.5; x -= 0.02) if (sdf.f(x, y, z) <= 0) return (lastX = x);
    return lastX;
  };
  for (let s = 0; s < 3; s++) {
    const w = halfW + s * 0.11, pts = [];
    const straight = GROOVE.y1 - GROOVE.y0;
    const nseg = 90;
    for (let i = 0; i < nseg; i++) {
      // stadium perimeter parameter
      const per = 2 * straight + 2 * Math.PI * w, tt = (i / nseg) * per;
      let y, z;
      if (tt < straight) { y = GROOVE.y0 + tt; z = w; }
      else if (tt < straight + Math.PI * w) { const a = (tt - straight) / w; y = GROOVE.y1 + Math.sin(a) * w; z = Math.cos(a) * w; }
      else if (tt < 2 * straight + Math.PI * w) { y = GROOVE.y1 - (tt - straight - Math.PI * w); z = -w; }
      else { const a = (tt - 2 * straight - Math.PI * w) / w; y = GROOVE.y0 - Math.sin(a) * w; z = -Math.cos(a) * w; }
      pts.push(V3(surfX(y, z + GROOVE.z) + 0.015, y, z + GROOVE.z));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    loops.push(new THREE.TubeGeometry(curve, 140, 0.032, 5, true));
  }
  const tj = new THREE.Mesh(mergeGeos(loops), tjMat); ctx.group.add(tj);
  register(ctx, 'tight_junction', tj, tjMat, { pick: tj });

  // ---------- lateral-face junctions ----------
  const lat = makeSampler(geo, (d) => (d.lat > 0.9 ? 1 : 0));
  const okLat = (p, n) => p.x > -3.9 && p.x < 4.2 && Math.abs(n.x) < 0.6 || Math.abs(n.y) > 0.5 || Math.abs(n.z) > 0.5;
  const place = (count, minSep, taken) => {
    const out = [];
    for (let i = 0; i < 3000 && out.length < count; i++) {
      const n = V3(); const p = lat.sample(R, n);
      if (p.x < -3.6 || p.x > 4.3) continue;
      if (Math.abs(n.x) > 0.7) continue;
      if ([...out, ...taken].some((o) => o.p.distanceTo(p) < minSep)) continue;
      out.push({ p, n });
    }
    return out;
  };
  const gj = place(ctx.org.items.find((x) => x.id === 'gap_junction').count, 1.4, []);
  const ds = place(ctx.org.items.find((x) => x.id === 'desmosome').count, 1.4, gj);
  // gap junction: plaque of hexameric connexon pores
  {
    const parts = [new THREE.CylinderGeometry(0.17, 0.17, 0.035, 20)];
    for (let i = 0; i < 7; i++) { const a = i === 0 ? 0 : ((i - 1) / 6) * 6.283, r = i === 0 ? 0 : 0.105; const c = new THREE.CylinderGeometry(0.036, 0.036, 0.13, 8).translate(Math.cos(a) * r, 0, Math.sin(a) * r); parts.push(c); }
    const g = mergeGeos(parts);
    const m = makeMaterial(shared, { color: P.gapJunction, roughness: 0.35, sss: 0.7, sssColor: '#a8e8ff', emissive: P.gapJunction, emissiveIntensity: 0.18, type: 'gap_junction' });
    const im = instanced(g, m, gj.map((s) => composeAxis(s.p, s.n, R() * 6, 1, 1, 1).clone())); ctx.group.add(im);
    const px = instanced(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 8), new THREE.MeshBasicMaterial(), gj.map((s) => composeAxis(s.p, s.n, 0, 1, 1, 1).clone())); px.visible = false; ctx.group.add(px);
    register(ctx, 'gap_junction', im, m, { pick: px });
  }
  // desmosome: paired plaques with keratin filaments fanning inward
  {
    const parts = [new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20).translate(0, -0.03, 0), new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20).translate(0, 0.03, 0)];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.283, tilt = 0.55;
      const c = new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4).translate(0, -0.3, 0);
      c.rotateZ(Math.cos(a) * tilt); c.rotateX(Math.sin(a) * tilt); c.translate(Math.cos(a) * 0.08, -0.05, Math.sin(a) * 0.08);
      parts.push(c);
    }
    const g = mergeGeos(parts);
    const m = makeMaterial(shared, { color: P.desmosome, roughness: 0.45, sss: 0.6, sssColor: '#ffbf90', type: 'desmosome' });
    const im = instanced(g, m, ds.map((s) => composeAxis(s.p, s.n, R() * 6, 1, 1, 1).clone())); ctx.group.add(im);
    const px = instanced(new THREE.CylinderGeometry(0.36, 0.36, 0.4, 8), new THREE.MeshBasicMaterial(), ds.map((s) => composeAxis(s.p, s.n, 0, 1, 1, 1).clone())); px.visible = false; ctx.group.add(px);
    register(ctx, 'desmosome', im, m, { pick: px });
  }
  ctx.stats.gapJunctions = gj.length; ctx.stats.desmosomes = ds.length;
  ctx.samplers = { sin: makeSampler(geo, (d) => Math.pow(d.sin, 4)), can: makeSampler(geo, (d) => Math.pow(d.can, 4)) };
}

/** Transporter gates: glowing rings on the membrane at fixed sites (positions reused by the flow routes). */
export function buildGates(ctx, pathwaysData) {
  const { shared, style } = ctx;
  const R = rng(509);
  const gateDefs = pathwaysData.gates;
  const geo = new THREE.TorusGeometry(0.17, 0.05, 8, 22); geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: false, toneMapped: false });
  const list = [], mats = [];
  ctx.gates = {};
  const taken = [];
  for (const [id, def] of Object.entries(gateDefs)) {
    ctx.gates[id] = [];
    for (let c = 0; c < def.copies; c++) {
      let best = null;
      for (let t = 0; t < 60; t++) {
        const n = V3();
        const p = (def.domain === 'sin' ? ctx.samplers.sin : ctx.samplers.can).sample(R, n);
        if (def.domain === 'sin' && (Math.abs(p.z) > 3.2 || Math.abs(p.y) > 3.1 || p.x > -4.2)) continue;
        if (def.domain === 'can' && Math.abs(p.y) > 2.6) continue;
        if (taken.some((q) => q.distanceTo(p) < 0.85)) continue;
        best = { p, n }; break;
      }
      if (!best) { const n = V3(); best = { p: (def.domain === 'sin' ? ctx.samplers.sin : ctx.samplers.can).sample(R, n), n }; }
      taken.push(best.p);
      const g = { id, pos: best.p.clone(), normal: best.n.clone(), index: list.length, domain: def.domain };
      ctx.gates[id].push(g); list.push(g);
    }
  }
  const im = new THREE.InstancedMesh(geo, mat, list.length);
  const c = new THREE.Color();
  list.forEach((g, i) => {
    im.setMatrixAt(i, composeAxis(g.pos.clone().addScaledVector(g.normal, 0.03), g.normal, 0, 1, 1, 1));
    c.set('#7f8bb0'); im.setColorAt(i, c);
  });
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  im.renderOrder = 12; im.frustumCulled = false;
  ctx.group.add(im); ctx.gateMesh = im; ctx.gateList = list; ctx.gateDefs = gateDefs;
  ctx.gateGeo = geo; ctx.gateMat = mat;
}
