// Slab hepatocyte plan (top view, x = sinusoidal(-) → canalicular(+), z toward viewer, y up; 1 unit ≈ 2 µm).
// The cell is an opaque, rounded clay slab: raised membrane rim around a recessed cytosol floor, top open (cut-away).
import * as THREE from 'three';

export const H = { bottom: -1.5, floor: -0.5, rim: 0.25, lid: 0.5 };
// plan outline (x, z). The +x side has a shallow trench that holds the bile canaliculus.
const BASE = [[-5, -3.2], [-3.4, -4.1], [2.4, -4.2], [4.9, -2.7], [4.35, -2.2], [4.35, 2.2], [4.9, 2.7], [2.6, 4.1], [-2.8, 4.2], [-5, 3.0]];
export const TRENCH = { x: 4.35, z0: -2.3, z1: 2.3 };

function chaikin(pts, it) {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = q;
  }
  return p;
}
const area = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + (a[0] * b[1] - b[0] * a[1]); }, 0) / 2;

export function outline() { return chaikin(BASE, 3); }
export function offsetInward(pts, d) {
  const sgn = area(pts) > 0 ? 1 : -1;
  return pts.map((a, i) => {
    const p = pts[(i - 1 + pts.length) % pts.length], n = pts[(i + 1) % pts.length];
    let tx = n[0] - p[0], tz = n[1] - p[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    // left normal of the tangent points inward for counter-clockwise (positive-area) polygons
    return [a[0] + sgn * -tz * d, a[1] + sgn * tx * d];
  });
}
export function inside(x, z, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function extrude(pts, holePts, y0, y1, bevel = 0.07) {
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1])));
  if (holePts) shape.holes.push(new THREE.Path(holePts.map((p) => new THREE.Vector2(p[0], -p[1]))));
  const depth = y1 - y0 - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  g.deleteAttribute('uv');
  return g;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function domainColors(g) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const sin = smooth(-4.55, -5.0, x), can = Math.abs(z) < 2.6 ? smooth(4.55, 4.35, x) : 0;
    col[i * 3] = sin; col[i * 3 + 1] = can; col[i * 3 + 2] = Math.max(0, 1 - sin - can);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function makeSlab() {
  const out = outline(), inn = offsetInward(out, 0.34);
  const rim = domainColors(extrude(out, inn, H.bottom, H.rim, 0.07));
  const floor = extrude(inn, null, H.bottom, H.floor, 0.02);
  const lid = domainColors(extrude(out, null, H.rim - 0.02, H.lid, 0.06));
  return { out, inner: inn, rim, floor, lid };
}
