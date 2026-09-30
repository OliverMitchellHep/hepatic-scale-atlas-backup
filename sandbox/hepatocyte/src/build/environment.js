// Sinusoid side: fenestrated LSEC (sieve plates), sinusoid lumen with drifting erythrocytes, opposite wall,
// space of Disse. Fenestrae ≈100-200 nm in sieve plates (Wisse et al. 1985). Blood flows in -y, bile in +y.
import * as THREE from 'three';
import { makeMaterial } from '../materials.js';
import { composeAxis, rng, V3 } from '../util.js';
import { register, addAnchor, instanced } from './common.js';

export const ENV = { lsecX: -6.55, lumenX: -8.3, wallX: -10.1, plateRows: 7, plateCols: 8, zHalf: 5.2, yHalf: 4.6 };

export function buildEnvironment(ctx) {
  const { P, shared } = ctx;
  const R = rng(601);
  const cols = ENV.plateCols, rows = ENV.plateRows;
  // plate mask: 1 = sieve plate present (CPU knows exactly which; shader samples the same texture)
  const data = new Uint8Array(cols * rows);
  const plates = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const has = R() > 0.22; data[r * cols + c] = has ? 255 : 0;
    if (has) plates.push(V3(ENV.lsecX, ((r + 0.5) / rows * 2 - 1) * ENV.yHalf, ((c + 0.5) / cols * 2 - 1) * ENV.zHalf));
  }
  const tex = new THREE.DataTexture(data, cols, rows, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true;
  ctx.disposables.push(tex);

  // LSEC sheet (gently undulating), fenestrae via shader discard from the plate mask
  const g = new THREE.PlaneGeometry(2 * ENV.zHalf, 2 * ENV.yHalf, 120, 100);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const zz = pos.getX(i), yy = pos.getY(i); pos.setXYZ(i, ENV.lsecX + 0.12 * Math.sin(zz * 0.9 + yy * 0.5), yy, zz); }
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  const mat = makeMaterial(shared, { color: P.lsec, roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false, rim: 0.7, rimColor: '#a8c0ff', sss: 0.4, sssColor: '#7ea2ff', type: 'lsec', dimAlpha: true });
  mat.userData.key += '|LSEC';
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    prev(shader);
    shader.uniforms.uMask = { value: tex };
    shader.uniforms.uPlate = { value: new THREE.Vector2(cols, rows) };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uMask; uniform vec2 uPlate; varying vec2 vUv;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{ vec2 uvp = vUv * uPlate; vec2 cell = floor(uvp); vec2 f = fract(uvp) - 0.5;
  float has = texture2D(uMask, (cell + 0.5) / uPlate).r;
  float rad = length(f * vec2(1.0, 1.0));
  float plate = step(rad, 0.42) * step(0.5, has);
  vec2 q = f * 7.5; vec2 hx = vec2(q.x, q.y * 1.1547 ); vec2 i2 = floor(hx + 0.5);
  vec2 g1 = fract(q * vec2(1.0, 1.0)) - 0.5;
  // hex-ish array of small holes inside the plate
  vec2 a = vec2(q.x, q.y); vec2 b1 = floor(a + vec2(0.5 * mod(floor(a.y + 0.5), 2.0), 0.0) + 0.5);
  vec2 cc = vec2(floor(a.x - 0.5 * mod(floor(a.y + 0.5), 2.0) + 0.5) + 0.5 * mod(floor(a.y + 0.5), 2.0), floor(a.y + 0.5));
  float dh = length(a - cc);
  if (plate > 0.5 && dh < 0.3) discard;
}`);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
varying vec2 vUv;`).replace('#include <begin_vertex>', `#include <begin_vertex>
vUv = uv;`);
  };
  const lsec = new THREE.Mesh(g, mat); lsec.renderOrder = 10; ctx.group.add(lsec);
  register(ctx, 'lsec', lsec, mat, { pick: lsec });
  ctx.lsecPlates = plates;

  // opposite sinusoid wall (very faint) to frame the lumen
  const w = new THREE.PlaneGeometry(2 * ENV.zHalf, 2 * ENV.yHalf, 2, 2).rotateY(Math.PI / 2).translate(ENV.wallX, 0, 0);
  const wm = makeMaterial(shared, { color: '#3a4a8a', roughness: 0.6, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false, type: 'sinusoid', dimAlpha: true, noCut: false });
  const wall = new THREE.Mesh(w, wm); wall.renderOrder = 1; ctx.group.add(wall);
  register(ctx, 'sinusoid', wall, wm, { pick: wall });

  // erythrocytes (biconcave discs) drifting -y through the sinusoid
  const prof = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; const r = t; const h = 0.5 * (0.6 + 1.2 * t * t - 1.1 * t * t * t * t) * (1 - t * t * 0.0) * Math.sqrt(Math.max(0, 1 - t * t)) * 1.6; prof.push(new THREE.Vector2(r * 1.0, h)); }
  const half = prof.map((p) => new THREE.Vector2(p.x, p.y)); 
  const lp = []; for (let i = half.length - 1; i >= 0; i--) lp.push(new THREE.Vector2(half[i].x, half[i].y));
  for (let i = 1; i < half.length; i++) lp.push(new THREE.Vector2(half[i].x, -half[i].y));
  const rg = new THREE.LatheGeometry(lp, 20);
  const rm = makeMaterial(shared, { color: P.rbc, roughness: 0.45, clearcoat: 0.4, sss: 0.7, sssColor: '#ff5a5a', bump: 0.2, bumpFreq: 3, type: 'sinusoid' });
  const n = 5;
  ctx.rbc = { mesh: null, items: [] };
  for (let i = 0; i < n; i++) ctx.rbc.items.push({ y: R.range(-ENV.yHalf, ENV.yHalf), x: ENV.lumenX - 0.4 + R.range(-0.4, 0.4), z: R.range(-3.2, 3.2), s: R.range(0.5, 0.62), ph: R() * 6, v: R.range(0.3, 0.45), tilt: R.range(-0.5, 0.5) });
  const im = new THREE.InstancedMesh(rg, rm, n); im.frustumCulled = false; ctx.group.add(im);
  ctx.rbc.mesh = im; register(ctx, 'sinusoid', im, rm);
  addAnchor(ctx, 'sinusoid', { pos: V3(ENV.lumenX, 0, 0) });
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
export function updateRBC(ctx, dt, playing) {
  if (!ctx.rbc?.mesh) return;
  for (let i = 0; i < ctx.rbc.items.length; i++) {
    const r = ctx.rbc.items[i];
    if (playing) { r.y -= r.v * dt; if (r.y < -ENV.yHalf - 1.5) r.y = ENV.yHalf + 1.5; }
    _e.set(Math.PI / 2 + r.tilt * 0.3 + Math.sin(r.ph + r.y) * 0.15, 0, Math.PI / 2 + Math.sin(r.ph * 2 + r.y * 0.7) * 0.4);
    _q.setFromEuler(_e);
    _m.compose(V3(r.x, r.y, r.z), _q, V3(r.s * 1.5, r.s * 1.5, r.s * 1.5));
    ctx.rbc.mesh.setMatrixAt(i, _m);
  }
  ctx.rbc.mesh.instanceMatrix.needsUpdate = true;
}
