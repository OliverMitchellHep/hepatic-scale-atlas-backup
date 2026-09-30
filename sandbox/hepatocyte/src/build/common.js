import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Merge geometries after normalising attributes (position + normal only, non-indexed). */
export function mergeGeos(list) {
  const out = list.map((g) => {
    let x = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k);
    if (!x.attributes.normal) x.computeVertexNormals();
    return x;
  });
  const m = mergeGeometries(out, false);
  out.forEach((g) => g.dispose());
  return m;
}

/** Register objects + materials under an organelle id (hover / dim / hide handled centrally). */
export function register(ctx, id, objs, mats, opts = {}) {
  const r = (ctx.registry[id] ||= { id, objects: [], mats: [], pick: [] });
  for (const o of [].concat(objs)) { if (o && !r.objects.includes(o)) r.objects.push(o); }
  for (const m of [].concat(mats || [])) if (m && !r.mats.includes(m)) r.mats.push(m);
  if (opts.pick) for (const p of [].concat(opts.pick)) { p.userData.orgId = id; r.pick.push(p); ctx.pickables.push(p); }
  return r;
}

export function addAnchor(ctx, name, item) { (ctx.anchors[name] ||= []).push(item); }

/** Instanced mesh helper: matrices array -> InstancedMesh. */
export function instanced(geo, mat, matrices, colors) {
  const im = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => im.setMatrixAt(i, m));
  if (colors) colors.forEach((c, i) => im.setColorAt(i, c));
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

/** Invisible low-poly proxy used for picking instanced organelles. */
export function proxyFor(im, geo) {
  const p = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial(), im.count);
  p.instanceMatrix = im.instanceMatrix;
  p.visible = false;
  p.computeBoundingSphere();
  return p;
}
