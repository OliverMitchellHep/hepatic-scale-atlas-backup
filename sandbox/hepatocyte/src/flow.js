// One simple, continuous flow (data/pathways.json → stages): blood → LSEC fenestra → space of Disse → microvillus (uptake)
// → smooth ER (processing) → Golgi (packaging) → canalicular membrane → bile canaliculus (bile flows +z, counter to blood -z).
// GPU-instanced: routes are baked into a float texture; the vertex shader positions each particle from time.
import * as THREE from 'three';
import { rng, V3, clamp } from './util.js';
import { TRENCH } from './plan.js';

const N = 128, MAX_ROUTES = 64, BASE_SPEED = 1.15;

const VS = /* glsl */`
precision highp float; precision highp int;
uniform sampler2D uPath;
uniform float uFlowT, uSize, uJitter, uOpacity, uTime;
uniform float uOn[${MAX_ROUTES}];
uniform vec4 uClass[8];
attribute vec2 corner; attribute float aRoute; attribute float aPhase; attribute vec3 aRnd; attribute float aRate;
varying vec2 vUv; varying vec3 vCol; varying float vAlpha; varying float vPulse;
void main(){
  int r = int(aRoute + 0.5);
  float vis = uOn[r] * step(aRnd.x, uOpacity);
  float u = fract(uFlowT * aRate + aPhase);
  float fi = u * float(${N - 1}); int i0 = int(floor(fi)); float ft = fi - float(i0);
  vec4 s0 = texelFetch(uPath, ivec2(i0, r), 0);
  vec4 s1 = texelFetch(uPath, ivec2(min(i0 + 1, ${N - 1}), r), 0);
  vec3 pos = mix(s0.xyz, s1.xyz, ft);
  int ci = int(floor(s0.w + 0.001)); float pulse = fract(s0.w + 0.001) / 0.99;
  pos += vec3(sin(uTime*2.3 + aRnd.y*40.0), sin(uTime*1.9 + aRnd.z*37.0), cos(uTime*2.1 + aRnd.y*23.0)) * 0.03 * uJitter;
  vec4 cc = uClass[ci];
  float fade = smoothstep(0.0, 0.03, u) * smoothstep(1.0, 0.97, u);
  float size = 0.058 * cc.a * (0.85 + 0.35*aRnd.z) * uSize * (1.0 + pulse*0.7) * vis;
  vec4 mv = viewMatrix * vec4(pos, 1.0);
  mv.xy += corner * size * 1.6;
  gl_Position = projectionMatrix * mv;
  vUv = corner; vCol = cc.rgb; vAlpha = fade * vis * smoothstep(1.0, 4.0, -mv.z); vPulse = pulse;
}`;
const FS = /* glsl */`
precision highp float;
uniform float uGlow;
varying vec2 vUv; varying vec3 vCol; varying float vAlpha; varying float vPulse;
void main(){
  if (vAlpha < 0.01) discard;
  float d = length(vUv);
  float core = smoothstep(0.75, 0.5, d), glow = exp(-d*d*2.8) * 0.5;
  float a = core + glow; if (a < 0.02) discard;
  vec3 col = vCol * (core * 1.0 + glow * 0.4) * uGlow * (1.0 + vPulse * 0.6);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * vAlpha);
}`;

export class FlowSystem {
  constructor(ctx, data, style, quality) {
    this.ctx = ctx; this.style = style; this.data = data;
    this.classes = data.molecules.classes;
    this.idx = Object.fromEntries(this.classes.map((c, i) => [c.id, i]));
    this.scale = quality.particleScale; this.enabled = true; this.playing = true; this.time = 0;
    this._build();
  }
  _route(R, j, villi) {
    const A = this.ctx.anchors, v = villi[j % villi.length];
    let plate = A.plates[0], bd = 1e9;
    for (const p of A.plates) { const d = Math.hypot(p.y - v.y, p.z - v.tip.z) + R() * 0.25; if (d < bd) { bd = d; plate = p; } }
    const ser = A.ser.filter((s) => s.pos.z > 1.6 && s.pos.x < -2.5); const sp = ser[Math.floor(R() * ser.length)].pos;
    const gol = A.golgi[0], zg = clamp(gol.trans.z + R.range(-0.5, 0.7), TRENCH.z0 + 0.3, TRENCH.z1 - 0.3);
    const c = this.ctx.canal, P = [], K = [], PU = [];
    const add = (p, cls, pulse = 0) => { P.push(p); K.push(cls); if (pulse) PU.push(P.length - 1); };
    const y = 0.02;
    add(V3(plate.x - 1.7 + R.range(-0.35, 0.3), plate.y + R.range(-0.1, 0.15), plate.z + 1.5 + R.range(0, 1.0)), 'absorbed');     // sinusoid, upstream (+z)
    add(plate.clone(), 'absorbed');                                                                                             // LSEC fenestra
    add(V3(-6.3, v.y, v.z), 'absorbed');                                                                                        // space of Disse
    add(v.tip.clone(), 'absorbed', 1);                                                                                          // microvillus tip: uptake
    add(v.base.clone(), 'absorbed');
    add(V3(-4.0, y, v.z + R.range(-0.1, 0.4)), 'absorbed');
    add(V3(sp.x, y + 0.2, sp.z), 'processed', 1);                                                                              // smooth ER
    add(V3(-1.8, y + 0.05, 3.05 + R.range(-0.2, 0.2)), 'processed');
    add(V3(0.2, y + 0.05, 2.95 + R.range(-0.2, 0.2)), 'processed');
    add(gol.cis.clone().add(V3(R.range(-0.2, 0.1), 0, R.range(-0.35, 0.35))), 'packaged', 1);                                   // Golgi cis → trans
    add(gol.trans.clone().add(V3(0, 0, R.range(-0.3, 0.3))), 'packaged');
    add(V3(3.9, y, zg), 'packaged');
    add(V3(TRENCH.x, -0.25 + R.range(-0.15, 0.15), zg), 'bile', 1);                                                            // canalicular membrane
    add(V3(c.cx - 0.15, -0.2 + R.range(-0.1, 0.1), zg), 'bile');
    for (let z = zg + 0.8; z < c.z1 - 0.2; z += 0.8) add(V3(c.cx - 0.15 + R.range(-0.08, 0.08), -0.2 + R.range(-0.08, 0.08), z), 'bile');
    add(V3(c.cx - 0.15, -0.2, c.z1), 'bile');
    return { P, K, PU };
  }
  _build() {
    const ctx = this.ctx, R = rng(811), villi = ctx.anchors.villi.filter((v) => v.z > 0.5 && v.z < 2.6).sort((a, b) => a.z - b.z);
    const nR = Math.min(MAX_ROUTES, Math.round(this.data.pathways.pathways[0].variants[0].routes)), per = this.data.pathways.pathways[0].variants[0].particles;
    const rd = [];
    for (let i = 0; i < nR; i++) {
      const { P, K, PU } = this._route(R, Math.floor((i / nR) * villi.length), villi);
      const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal'); curve.arcLengthDivisions = 400;
      const len = curve.getLength(), M = P.length, s = new Float32Array(N * 4);
      for (let k = 0; k < N; k++) {
        const u = k / (N - 1), p = curve.getPointAt(u), t = curve.getUtoTmapping(u), seg = clamp(Math.floor(t * (M - 1) + 1e-6), 0, M - 1);
        let pulse = 0; for (const pi of PU) pulse = Math.max(pulse, Math.exp(-Math.pow((t - pi / (M - 1)) / 0.02, 2)));
        s.set([p.x, p.y, p.z, this.idx[K[seg]] + Math.min(0.98, pulse * 0.98)], k * 4);
      }
      rd.push({ s, len });
    }
    this.routes = rd;
    const d = new Float32Array(N * MAX_ROUTES * 4); rd.forEach((r, i) => d.set(r.s, i * N * 4));
    this.tex = new THREE.DataTexture(d, N, MAX_ROUTES, THREE.RGBAFormat, THREE.FloatType); this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.needsUpdate = true;
    const inst = [];
    rd.forEach((r, ri) => { const count = Math.max(4, Math.round(per * this.scale)); for (let i = 0; i < count; i++) inst.push({ route: ri, phase: (i + R()) / count, rnd: [R(), R(), R()], rate: (BASE_SPEED * R.range(0.94, 1.06)) / r.len }); });
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    const n = inst.length, aR = new Float32Array(n), aP = new Float32Array(n), aN = new Float32Array(n * 3), aT = new Float32Array(n);
    inst.forEach((p, i) => { aR[i] = p.route; aP[i] = p.phase; aN.set(p.rnd, i * 3); aT[i] = p.rate; });
    g.setAttribute('aRoute', new THREE.InstancedBufferAttribute(aR, 1)); g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(aP, 1));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(aN, 3)); g.setAttribute('aRate', new THREE.InstancedBufferAttribute(aT, 1));
    g.instanceCount = n; this.count = n;
    const cc = new Array(8).fill(0).map(() => new THREE.Vector4(1, 1, 1, 1));
    this.classes.forEach((c, i) => { const col = new THREE.Color(c.color); cc[i].set(col.r, col.g, col.b, c.size); });
    this.uOn = new Float32Array(MAX_ROUTES); this.uOn.fill(0);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      uniforms: { uPath: { value: this.tex }, uTime: ctx.shared.uTime, uFlowT: { value: 0 }, uSize: { value: 1 }, uJitter: { value: 1 }, uOpacity: { value: 1 }, uGlow: { value: 1 }, uOn: { value: this.uOn }, uClass: { value: cc } },
    });
    this.mesh = new THREE.Mesh(g, this.material); this.mesh.frustumCulled = false; this.mesh.renderOrder = 20; ctx.scene.add(this.mesh);
    this.apply();
  }
  apply() { const on = this.enabled ? 1 : 0; for (let i = 0; i < this.routes.length; i++) this.uOn[i] = on; }
  setEnabled(b) { this.enabled = !!b; this.apply(); }
  update(dt) {
    const f = this.style.flow, u = this.material.uniforms;
    if (this.playing) this.time += dt * f.speed;
    u.uFlowT.value = this.time; u.uSize.value = f.size; u.uJitter.value = f.jitter; u.uOpacity.value = clamp(f.density, 0, 1); u.uGlow.value = this.style.glow.particleGlow;
  }
  dispose() { this.ctx.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.material.dispose(); this.tex.dispose(); }
}
