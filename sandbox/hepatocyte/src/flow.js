// Continuous-flow particle system. Routes are built from data/pathways.json (anchors -> spline), baked into
// a float texture (xyz + class/pulse), and drawn as ONE instanced draw call; positions are computed in the
// vertex shader from time, so the CPU only updates per-route weights when the state/toggles change.
import * as THREE from 'three';
import { rng, V3, lerp, clamp } from './util.js';
import { ENV } from './build/environment.js';

const N = 128;               // samples per route
const MAX_ROUTES = 192;
const MAX_CLASSES = 32;
const BASE_SPEED = 1.15;     // scene units per second (× speed slider)

const ORG_OF = { mito: 'mitochondrion', ser: 'ser', rer: 'rer', golgi: 'golgi', perox: 'peroxisome', lyso: 'lysosome', endo: 'endosome', ld: 'lipid_droplet', glyc: 'glycogen', nucleus: 'nucleus', canaliculus: 'bile_canaliculus', sinusoid: 'sinusoid' };

const VS = /* glsl */`
precision highp float; precision highp int;
uniform sampler2D uPath;
uniform float uTime, uFlowT, uSize, uJitter, uOpacity;
uniform vec2 uRoute[${MAX_ROUTES}];
uniform vec4 uClassCol[${MAX_CLASSES}];
uniform float uClassShape[${MAX_CLASSES}];
attribute vec2 corner;
attribute float aRoute; attribute float aPhase; attribute vec3 aRnd; attribute float aRate;
varying vec2 vUv; varying vec3 vCol; varying float vShape; varying float vAlpha; varying float vPulse; varying vec3 vWPos;
void main(){
  int r = int(aRoute + 0.5);
  vec2 rw = uRoute[r];
  float vis = smoothstep(aRnd.x - 0.05, aRnd.x + 0.001, rw.x);
  float u = fract(uFlowT * aRate + aPhase);
  float fi = u * float(${N - 1});
  int i0 = int(floor(fi)); float ft = fi - float(i0);
  vec4 s0 = texelFetch(uPath, ivec2(i0, r), 0);
  vec4 s1 = texelFetch(uPath, ivec2(min(i0 + 1, ${N - 1}), r), 0);
  vec3 pos = mix(s0.xyz, s1.xyz, ft);
  float cf = floor(s0.w + 0.001);
  int ci = int(cf);
  float pulse = fract(s0.w + 0.001) / 0.99;
  vec3 j = vec3(sin(uTime*2.3 + aRnd.y*40.0), sin(uTime*1.9 + aRnd.z*37.0), cos(uTime*2.1 + aRnd.y*23.0)) * 0.045 * uJitter;
  pos += j;
  vec4 cc = uClassCol[ci];
  float fade = smoothstep(0.0, 0.035, u) * smoothstep(1.0, 0.965, u);
  float boost = clamp(rw.y - 1.0, 0.0, 1.0);
  float size = 0.057 * cc.a * (0.8 + 0.45*aRnd.z) * uSize * (1.0 + pulse * 0.9) * (1.0 + 0.45*boost) * vis;
  vec4 mv = viewMatrix * vec4(pos, 1.0);
  mv.xy += corner * size * 1.7;
  gl_Position = projectionMatrix * mv;
  vUv = corner; vCol = cc.rgb; vShape = uClassShape[ci];
  vAlpha = fade * vis * rw.y * uOpacity * smoothstep(1.0, 4.5, -mv.z); vPulse = pulse; vWPos = pos;
}`;

const FS = /* glsl */`
precision highp float;
uniform float uGlow, uCutOn, uCutY, uCutZ;
varying vec2 vUv; varying vec3 vCol; varying float vShape; varying float vAlpha; varying float vPulse; varying vec3 vWPos;
void main(){
  if (vAlpha < 0.01) discard;
  if (uCutOn > 0.5 && vWPos.y > uCutY && vWPos.z > uCutZ) discard;
  vec2 p = vUv; float d;
  int sh = int(vShape + 0.5);
  if (sh == 1) d = (abs(p.x) + abs(p.y)) * 0.92;
  else if (sh == 3) { vec2 q = abs(p); d = max(q.x*0.866 + q.y*0.5, q.y) * 1.02; }
  else if (sh == 4) { d = max(abs(p.x)*0.95 + (p.y + 0.15)*0.55, -(p.y + 0.15)*1.1) * 1.05; }
  else d = length(p);
  float core, glow = exp(-d*d*2.6) * 0.55;
  if (sh == 2) { core = smoothstep(0.2, 0.0, abs(d - 0.62) - 0.12); glow *= 0.7; }
  else core = smoothstep(0.78, 0.52, d);
  float a = core + glow;
  if (a < 0.02) discard;
  vec3 col = vCol * (core * 0.95 + glow * 0.55) * uGlow * (1.0 + vPulse * 1.2);
  col += vec3(0.5) * core * core * 0.25;
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * vAlpha * 0.85);
}`;

export class FlowSystem {
  constructor(ctx, pathways, molecules, style, quality) {
    this.ctx = ctx; this.data = pathways; this.style = style;
    this.classes = molecules.classes; this.families = molecules.families;
    this.classIndex = Object.fromEntries(this.classes.map((c, i) => [c.id, i]));
    this.variants = []; this.routes = [];
    this.scale = quality.particleScale;
    this.pathwayState = {}; for (const p of pathways.pathways) this.pathwayState[p.id] = { enabled: true, isolate: false };
    this.state = 0; this.playing = true; this.time = 0;
    this.isolated = null;
    this.involves = {};
    this.stepLabels = {};
    this._build();
  }

  _resolveRoute(variant, ri, R) {
    const ctx = this.ctx, sdf = ctx.sdf;
    const A = ctx.anchors;
    const bound = {};
    const pts = [], cls = [], pulses = [];
    const nodes = variant.path;
    const push = (p, mol, pulse) => { pts.push(p.clone()); cls.push(mol); if (pulse) pulses.push({ i: pts.length - 1, v: pulse }); };
    const pushOut = (p, margin = 0.25) => {
      for (const n of ctx.layout.nuclei) { const d = p.clone().sub(n.c); if (d.length() < n.r + 0.15) p.copy(n.c).add(d.setLength(n.r + 0.2)); }
      if (!sdf.inside(p, margin)) p.multiplyScalar(0.92);
      return p;
    };
    const near = (list, ref, k = 5) => {
      const s = list.map((it) => ({ it, d: ref ? it.pos.distanceTo(ref) : R() * 10 })).sort((a, b) => a.d - b.d).slice(0, k);
      return s[Math.floor(R() * s.length)].it;
    };
    const last = () => pts[pts.length - 1];
    let prevKind = null, prevMol = null;
    const cytoIdx = [];
    nodes.forEach((nd, k) => {
      const at = nd.at, mol = nd.mol ?? prevMol ?? nodes[k - 1]?.mol;
      const [base, part] = at.split(':').length > 2 ? [at.split(':').slice(0, 2).join(':'), null] : at.split(':');
      const ref = last() || null;
      const label = nd.label ? { text: nd.label, kind: nd.kind } : null;
      const pulse = nd.label ? 1 : 0;
      if (base === 'sinusoid') {
        // start: upstream of the first gate; end: downstream of the previous gate
        if (k === 0) { const nxt = nodes[1]; const g = this._gatePick(nxt.at, R, null); const F = this._plate(g.pos.y + 1.2, g.pos.z, R); const S = F.clone().add(V3(-1.8 + R.range(-0.5, 0.3), 1.3 + R.range(0, 1.2), R.range(-0.5, 0.5))); push(S, mol); bound._gate = g; bound._F = F; }
        else { const g = bound._lastGate; const F = this._plate(g.pos.y - 1.0, g.pos.z + R.range(-0.4, 0.4), R); push(F, prevMol); push(F.clone().add(V3(-1.7 + R.range(-0.4, 0.4), -1.0 - R.range(0, 1.2), R.range(-0.5, 0.5))), prevMol); }
        prevKind = 'sinusoid';
      } else if (base === 'gate') {
        const gid = at.split(':')[1];
        const def = this.data.gates[gid];
        const g = (k === 1 && prevKind === 'sinusoid' && bound._gate && bound._gate.id === gid) ? bound._gate : this._gatePick(at, R, ref);
        bound._lastGate = g;
        const n = g.normal, inbound = prevKind === 'sinusoid';
        const outer = g.pos.clone().addScaledVector(n, def.domain === 'sin' ? 0.8 : 0.5), mid = g.pos.clone().addScaledVector(n, 0.02), inner = g.pos.clone().addScaledVector(n, -0.6);
        const seq = inbound ? [outer, mid, inner] : [inner, mid, outer];
        if (inbound) { const F = bound._F; push(F, mol); }
        if (!inbound && def.domain === 'sin') { /* exit into the space of Disse */ }
        seq.forEach((p, i) => push(p, mol, (i === 1) ? pulse : 0));
        if (label) this.stepLabels[variant.id + '#' + ri + ':' + k] = { pos: mid.clone(), text: label.text, gate: gid };
        prevKind = 'gate';
      } else if (base === 'canaliculus') {
        const g = bound._lastGate; const y0 = g ? g.pos.y : 0; const c = ctx.canaliculus;
        const p0 = V3(c.x - 0.05, clamp(y0, c.y0 + 0.2, c.y1 - 0.4), c.z + R.range(-0.25, 0.25));
        push(p0, prevMol);
        // bile flows toward the portal end (+y), opposite to sinusoidal blood flow
        for (let yy = p0.y + 0.9; yy < c.y1 + 0.55; yy += 0.9) push(V3(c.x - 0.05 + R.range(-0.05, 0.05), yy, c.z + R.range(-0.2, 0.2)), prevMol);
        push(V3(c.x - 0.05, c.y1 + 0.6, c.z), prevMol);
        prevKind = 'canaliculus';
      } else if (base === 'cytosol') {
        // placeholder resolved after neighbours are known
        push(V3(), mol, pulse); cytoIdx.push({ i: pts.length - 1, k, label });
        prevKind = 'cytosol';
      } else {
        let p;
        const lst = A[base];
        if (!lst || !lst.length) { p = last() ? last().clone() : V3(); }
        else if (base === 'mito') {
          const m = bound.mito || (bound.mito = near(lst, ref, 6));
          const ax = m.axis, s = m.s;
          if (part === 'matrix') p = m.pos.clone().addScaledVector(ax, R.range(-0.4, 0.4) * s).add(R.unit().multiplyScalar(0.05));
          else if (part === 'cristae') p = m.pos.clone().addScaledVector(ax, R.range(-0.5, 0.5) * s).add(R.unit().multiplyScalar(0.12));
          else { const dir = ref ? ref.clone().sub(m.pos).setLength(0.28 * s) : V3(0.28 * s, 0, 0); p = m.pos.clone().add(dir); }
        } else {
          const it = near(lst, ref, base === 'ser' || base === 'rer' ? 8 : 4);
          if (base === 'golgi') { p = (prevKind === 'gate' || nodes[k + 1]?.at.startsWith('gate')) ? it.trans.clone() : it.cis.clone(); p.add(R.unit().multiplyScalar(0.25)); }
          else if (base === 'glyc') p = it.pos.clone().add(R.unit().multiplyScalar(it.r * 0.7));
          else if (base === 'ser' || base === 'rer') p = it.pos.clone().add(R.unit().multiplyScalar(0.12));
          else p = it.pos.clone().add(R.unit().multiplyScalar(0.4 * (it.r || 0.2)));
        }
        push(p, mol, pulse);
        if (label) this.stepLabels[variant.id + '#' + ri + ':' + k] = { pos: p.clone(), text: label.text };
        prevKind = base;
      }
      prevMol = mol;
    });
    // resolve cytosol placeholders
    cytoIdx.forEach(({ i, k, label }) => {
      const a = pts[i - 1] || pts[i + 1], b = pts[i + 1] && pts[i + 1].lengthSq() > 0 ? pts[i + 1] : a;
      const nb = (() => { for (let j = i + 1; j < pts.length; j++) if (pts[j].lengthSq() > 0) return pts[j]; return a; })();
      const p = a.clone().lerp(nb, R.range(0.35, 0.65)).add(R.unit().multiplyScalar(0.55));
      pushOut(p, 0.35); pts[i].copy(p);
      if (label) this.stepLabels[variant.id + '#' + ri + ':' + k] = { pos: p.clone(), text: label.text };
    });
    // final cleanup: keep interior points out of the nucleus
    pts.forEach((p, i) => { if (!(cls[i] && false)) { for (const n of ctx.layout.nuclei) { const d = p.clone().sub(n.c); if (d.length() < n.r * 1.02 && !(variant.path.some((x) => x.at === 'nucleus'))) p.copy(n.c).add(d.setLength(n.r * 1.06)); } } });
    return { pts, cls, pulses };
  }

  _plate(y, z, R) {
    let best = null, bd = 1e9;
    for (const p of this.ctx.lsecPlates) { const d = Math.hypot(p.y - y, p.z - z) + R() * 0.4; if (d < bd) { bd = d; best = p; } }
    return best.clone();
  }
  _gatePick(at, R, ref) {
    const gid = at.split(':')[1]; const list = this.ctx.gates[gid];
    if (!ref) return list[Math.floor(R() * list.length)];
    return list.slice().sort((a, b) => a.pos.distanceTo(ref) - b.pos.distanceTo(ref))[Math.floor(R() * Math.min(2, list.length))];
  }

  _build() {
    const ctx = this.ctx;
    const R = rng(811);
    const routeData = [];       // {curveSamples: Float32Array(N*4), length, variantIndex}
    let vIndex = 0;
    for (const pw of this.data.pathways) {
      const inv = new Set();
      for (const v of pw.variants) {
        const variant = { ...v, pathway: pw.id, index: vIndex++, routeIdx: [] };
        this.variants.push(variant);
        for (const nd of v.path) {
          const base = nd.at.split(':')[0];
          if (ORG_OF[base]) inv.add(ORG_OF[base]);
          if (base === 'gate') { const d = this.data.gates[nd.at.split(':')[1]]; inv.add(d.domain === 'sin' ? 'plasma_sinusoidal' : 'plasma_canalicular'); if (d.domain === 'sin') { inv.add('microvilli_sinusoidal'); inv.add('lsec'); inv.add('space_of_disse'); } else inv.add('bile_canaliculus'); }
        }
        const nRoutes = Math.max(1, Math.round(v.routes));
        for (let ri = 0; ri < nRoutes; ri++) {
          if (routeData.length >= MAX_ROUTES) break;
          const { pts, cls, pulses } = this._resolveRoute(variant, ri, R);
          const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
          curve.arcLengthDivisions = 400;
          const len = curve.getLength();
          const M = pts.length;
          const samples = new Float32Array(N * 4);
          for (let s = 0; s < N; s++) {
            const u = s / (N - 1), p = curve.getPointAt(u), t = curve.getUtoTmapping(u);
            const seg = clamp(Math.floor(t * (M - 1) + 1e-6), 0, M - 1);
            const ci = this.classIndex[cls[seg]] ?? 0;
            let pulse = 0; for (const pu of pulses) { const tk = pu.i / (M - 1); pulse = Math.max(pulse, Math.exp(-Math.pow((t - tk) / 0.025, 2))); }
            samples.set([p.x, p.y, p.z, ci + Math.min(0.98, pulse * 0.98)], s * 4);
          }
          variant.routeIdx.push(routeData.length);
          routeData.push({ samples, len, variant: variant.index });
        }
      }
      this.involves[pw.id] = [...inv];
    }
    this.routes = routeData;
    // path texture
    const data = new Float32Array(N * MAX_ROUTES * 4);
    routeData.forEach((r, i) => data.set(r.samples, i * N * 4));
    this.tex = new THREE.DataTexture(data, N, MAX_ROUTES, THREE.RGBAFormat, THREE.FloatType);
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter; this.tex.needsUpdate = true;
    // instances
    const inst = [];
    routeData.forEach((r, ri) => {
      const v = this.variants[r.variant];
      const count = Math.max(4, Math.round(v.particles * this.scale * 0.85));
      for (let i = 0; i < count; i++) inst.push({ route: ri, phase: (i + R()) / count, rnd: [R(), R(), R()], rate: BASE_SPEED * (v.speed ?? 1) * R.range(0.92, 1.08) / r.len });
    });
    const M = inst.length;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const aRoute = new Float32Array(M), aPhase = new Float32Array(M), aRnd = new Float32Array(M * 3), aRate = new Float32Array(M);
    inst.forEach((p, i) => { aRoute[i] = p.route; aPhase[i] = p.phase; aRnd.set(p.rnd, i * 3); aRate[i] = p.rate; });
    g.setAttribute('aRoute', new THREE.InstancedBufferAttribute(aRoute, 1));
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(aPhase, 1));
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(aRnd, 3));
    g.setAttribute('aRate', new THREE.InstancedBufferAttribute(aRate, 1));
    g.instanceCount = M;
    this.count = M;
    const cc = new Array(MAX_CLASSES).fill(0).map(() => new THREE.Vector4(1, 1, 1, 1));
    const sh = new Float32Array(MAX_CLASSES);
    this.classes.forEach((c, i) => { const col = new THREE.Color(c.color); cc[i].set(col.r, col.g, col.b, c.size); sh[i] = c.shape; });
    this.uRoute = new Array(MAX_ROUTES).fill(0).map(() => new THREE.Vector2(0, 1));
    const f = this.style.flow;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      uniforms: {
        uPath: { value: this.tex }, uTime: ctx.shared.uTime, uFlowT: { value: 0 }, uSize: { value: f.size }, uJitter: { value: f.jitter }, uOpacity: { value: f.opacity },
        uGlow: { value: this.style.glow.particleGlow },
        uRoute: { value: this.uRoute }, uClassCol: { value: cc }, uClassShape: { value: sh },
        uCutOn: ctx.shared.uCutOn, uCutY: ctx.shared.uCutY, uCutZ: ctx.shared.uCutZ,
      },
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 20;
    ctx.scene.add(this.mesh);
    this.applyWeights();
  }

  /** Effective weight of one variant (0..1) for the current state, toggles and density. */
  variantWeight(v) {
    const s = this.state, w = lerp(v.flux.fed, v.flux.fasted, s);
    const ps = this.pathwayState[v.pathway];
    if (!ps.enabled) return { w: 0, a: 1 };
    const dens = this.style.flow.density;
    if (this.isolated && this.isolated !== v.pathway) return { w: 0, a: 1 };
    return { w: w * dens, a: this.isolated ? 1.7 : 1 };
  }

  applyWeights() {
    const gateW = {};
    for (const v of this.variants) {
      const { w, a } = this.variantWeight(v);
      for (const ri of v.routeIdx) this.uRoute[ri].set(w, a);
      const ps = this.pathwayState[v.pathway];
      const flux = ps.enabled && (!this.isolated || this.isolated === v.pathway) ? lerp(v.flux.fed, v.flux.fasted, this.state) : 0;
      for (const nd of v.path) if (nd.at.startsWith('gate:')) { const id = nd.at.split(':')[1]; gateW[id] = Math.max(gateW[id] || 0, flux); }
    }
    this.gateW = gateW;
  }

  setState(s) { this.state = clamp(s, 0, 1); this.applyWeights(); }
  setPathway(id, st) { Object.assign(this.pathwayState[id], st); if (st.isolate !== undefined) { this.isolated = st.isolate ? id : (this.isolated === id ? null : this.isolated); for (const k of Object.keys(this.pathwayState)) if (k !== id && st.isolate) this.pathwayState[k].isolate = false; } this.applyWeights(); }
  setIsolated(id) { this.isolated = id; for (const k of Object.keys(this.pathwayState)) this.pathwayState[k].isolate = k === id; this.applyWeights(); }
  updateGates() {
    const ctx = this.ctx; if (!ctx.gateMesh) return;
    const c = new THREE.Color();
    ctx.gateList.forEach((g, i) => {
      const def = ctx.gateDefs[g.id];
      const w = this.gateW[g.id] || 0;
      const fam = this.families.find((f) => f.id === def.family);
      const cls = this.classes.find((x) => x.family === def.family);
      c.set(cls ? cls.color : '#8899cc');
      const dim = this.isolated && !(w > 0);
      c.multiplyScalar((0.55 + 1.7 * w) * this.style.glow.gateGlow * (dim ? 0.55 : 1));
      ctx.gateMesh.setColorAt(i, c);
    });
    ctx.gateMesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    if (this.playing) this.time += dt * this.style.flow.speed;
    const u = this.material.uniforms;
    u.uFlowT.value = this.time;
    u.uSize.value = this.style.flow.size; u.uJitter.value = this.style.flow.jitter; u.uOpacity.value = this.style.flow.opacity; u.uGlow.value = this.style.glow.particleGlow;
  }
  dispose() {
    this.ctx.scene.remove(this.mesh);
    this.mesh.geometry.dispose(); this.material.dispose(); this.tex.dispose();
  }
}
