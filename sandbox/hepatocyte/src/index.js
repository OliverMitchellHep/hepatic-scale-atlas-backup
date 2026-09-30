// Public module: mount(container, options) -> instance. See README "Integration contract".
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import DEFAULTS from './defaults.js';
import { clone, merge, disposeObject, V3, clamp, nextFrame } from './util.js';
import { createShared } from './materials.js';
import { inside, offsetInward } from './plan.js';
import { planLayout } from './layout.js';
import { buildBody, buildNucleus, buildER, buildSER, buildGolgi, buildMito, buildSmall, buildMicrovilli, buildCanaliculus, buildSinusoid, updateRBC } from './build/scene.js';
import { FlowSystem } from './flow.js';
import { HepUI } from './ui.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

class Hepatocyte {
  constructor(container, options = {}) {
    this.container = container; this.opts = options;
    const data = this.data = { ...DEFAULTS, ...(options.data || {}) };
    this.style = merge(clone(data.style), options.style || {});
    if (options.tokens) merge(this.style.tokens, options.tokens);
    if (options.background) this.style.tokens.bg = options.background;
    this.listeners = {}; this.disposed = false;
    this.binucleate = !!options.binucleate; this.section = options.crossSection !== false;
    this.selected = null; this.hover = null; this.tools = { rotate: false, isolate: false, hide: false };
    this.playing = true; this.metabolic = options.initialState?.metabolic ?? 0;
    this.pathwayState = {}; for (const p of data.pathways.pathways) this.pathwayState[p.id] = { enabled: true, isolate: false, ...(options.initialState?.pathways?.[p.id] || {}) };
    const mobile = matchMedia('(pointer: coarse)').matches || Math.min(container.clientWidth || 1200, container.clientHeight || 800) < 520;
    this.qualityName = options.quality && options.quality !== 'auto' ? options.quality : (mobile ? 'low' : 'high');
    this.quality = this.style.quality[this.qualityName];
    this.ready = this._init();
  }
  on(evt, cb) { (this.listeners[evt] ||= new Set()).add(cb); return () => this.listeners[evt].delete(cb); }
  _emit(evt, payload) {
    for (const cb of this.listeners[evt] || []) { try { cb(payload); } catch (e) { console.error(e); } }
    const h = { organelleSelect: 'onOrganelleSelect', pathwayToggle: 'onPathwayToggle', metabolicState: 'onMetabolicState', ready: 'onReady' }[evt];
    if (h && typeof this.opts[h] === 'function') { try { this.opts[h](payload); } catch (e) { console.error(e); } }
  }

  async _init() {
    const root = this.root = document.createElement('div'); root.className = 'hl-root'; this.container.appendChild(root);
    const cv = this.canvas = document.createElement('canvas'); cv.className = 'hl-canvas'; cv.tabIndex = 0; root.appendChild(cv);
    const T = this.style.tokens, q = this.quality;
    const loading = document.createElement('div'); loading.className = 'hl-loading';
    loading.innerHTML = `<div>${this.data.labels.title}<small>Building cell…</small><div class="bar"><i></i></div></div>`;
    const bar = loading.querySelector('.bar i'), sm = loading.querySelector('small');
    const step = async (p, m) => { bar.style.width = `${p * 100}%`; sm.textContent = m; await nextFrame(); };
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: q.msaa === 0 || !q.bloom, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: !!this.opts.preserveDrawingBuffer });
    } catch (err) { root.innerHTML = '<div style="padding:24px;color:#a9b6d8;font:14px system-ui">WebGL 2 is not available in this browser, so the 3D hepatocyte cannot be shown.</div>'; throw err; }
    const renderer = this.renderer;
    this.dprBase = Math.min(this.opts.pixelRatio || window.devicePixelRatio || 1, q.dprMax); this.dpr = this.dprBase;
    renderer.setPixelRatio(this.dpr); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(T.bg, 1);
    const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color(T.bg);
    this.camera = new THREE.PerspectiveCamera(this.style.camera.fov, 1, 0.1, 200);
    this._setupLights();
    const pm = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(); this.envTex = pm.fromScene(room, 0.04).texture; scene.environment = this.envTex; room.dispose?.(); pm.dispose();
    const c = this.style.camera, ctl = this.controls = new OrbitControls(this.camera, cv);
    ctl.enableDamping = true; ctl.dampingFactor = c.damping; ctl.rotateSpeed = 0.6; ctl.screenSpacePanning = true;
    ctl.minDistance = c.minDistance; ctl.maxDistance = c.maxDistance; ctl.minPolarAngle = 0.12; ctl.maxPolarAngle = Math.PI / 2 - 0.03; ctl.autoRotateSpeed = c.autoRotateSpeed * 3;
    this.homeTarget = V3(-2.4, -0.4, 0); this.lastInput = -1e9;
    ctl.addEventListener('start', () => { this.tween = null; this.userMoved = true; this.lastInput = performance.now(); });
    this._homeCamera();
    if (this.opts.ui !== false) {
      this.ui = new HepUI(root, {
        labels: this.data.labels, molecules: this.data.molecules, pathways: this.data.pathways, style: this.style, fonts: this.opts.fonts !== false,
        api: { setCrossSection: (b) => this.setCrossSection(b), setBinucleate: (b) => this.setBinucleate(b), setFlow: (k, v) => { this.style.flow[k] = v; }, setPlaying: (b) => this.setPlaying(b), tool: (n) => this._tool(n), select: (id) => this.select(id) },
      });
    }
    root.appendChild(loading);
    await step(0.1, 'Building the cell…');
    await this._buildCell(step);
    this._setupComposer(); this._bindEvents(); this.resize();
    this.setCrossSection(this.section); this.ui?.setSwitch('bin', this.binucleate);
    this.clock = new THREE.Clock(); this.frames = 0; this.msAvg = 16;
    this._loop = this._loop.bind(this); this.raf = requestAnimationFrame(this._loop);
    await step(1, 'Ready'); setTimeout(() => { loading.style.opacity = '0'; setTimeout(() => loading.remove(), 600); }, 150);
    this._emit('ready', this); return this;
  }
  _setupLights() {
    const L = this.style.lights, s = this.scene;
    this.lights = { hemi: new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemi), key: new THREE.DirectionalLight(L.key, L.keyI), fill: new THREE.DirectionalLight(L.fill, L.fillI), rim: new THREE.DirectionalLight(L.rim, L.rimI) };
    this.lights.key.position.set(-6, 10, 7); this.lights.fill.position.set(8, 3, 4); this.lights.rim.position.set(2, 4, -9);
    Object.values(this.lights).forEach((l) => s.add(l)); this.renderer.toneMappingExposure = L.exposure;
  }
  _setupComposer() {
    const q = this.quality; this.composer?.dispose?.(); this.composer = null; if (!q.bloom) return;
    const size = new THREE.Vector2(); this.renderer.getDrawingBufferSize(size);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q.msaa, colorSpace: THREE.LinearSRGBColorSpace });
    const comp = this.composer = new EffectComposer(this.renderer, rt); comp.addPass(new RenderPass(this.scene, this.camera));
    const g = this.style.glow; this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), g.bloomStrength, g.bloomRadius, g.bloomThreshold);
    comp.addPass(this.bloom); comp.addPass(new OutputPass());
  }

  async _buildCell(step) {
    const s = (p, m) => (step ? step(p, m) : Promise.resolve());
    if (this.group) { this.scene.remove(this.group); disposeObject(this.group); this.ctx.disposables.forEach((d) => d.dispose()); }
    this.flow?.dispose();
    if (!this.shared) this.shared = createShared();
    this.shared.uCutOn.value = 0;
    const group = this.group = new THREE.Group(); this.scene.add(group);
    const ctx = this.ctx = { group, scene: this.scene, shared: this.shared, style: this.style, P: this.style.palette, org: this.data.organelles, registry: {}, pickables: [], anchors: {}, disposables: [] };
    ctx.L = planLayout({ binucleate: this.binucleate });
    buildBody(ctx);
    const offs = {}; ctx.inCell = (x, z, m = 0) => { const k = m.toFixed(2); offs[k] ||= offsetInward(ctx.slab.inner, m); return inside(x, z, offs[k]); };
    await s(0.3, 'Nucleus and ER…'); buildNucleus(ctx); buildER(ctx); buildSER(ctx);
    await s(0.5, 'Golgi and mitochondria…'); buildGolgi(ctx); buildMito(ctx); buildSmall(ctx);
    await s(0.7, 'Membrane and sinusoid…'); buildMicrovilli(ctx); buildCanaliculus(ctx); buildSinusoid(ctx);
    await s(0.85, 'Flow…');
    this.flow = new FlowSystem(ctx, this.data, this.style, this.quality); this.flow.playing = this.playing; this.flow.setEnabled(this.pathwayState.bile_formation?.enabled !== false);
    this._collectMats(); this._applyVisual();
    this.stats = { particles: this.flow.count, routes: this.flow.routes.length, mitochondria: ctx.L.mito.length };
  }
  _collectMats() {
    const all = new Set(); this.scene.traverse((o) => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.userData?.own) { all.add(x); if (x.userData.envBase === undefined) x.userData.envBase = x.envMapIntensity; } }); });
    this.mats = [...all]; this._palApplied = clone(this.style.palette);
  }

  // ---- camera
  _homeDist() { const a = (this.w || 1200) / (this.h || 800); return this.style.camera.distance * Math.max(1, 1.5 / a); }
  _homeCamera() {
    const asp = (this.w || 1200) / (this.h || 800); this.homeTarget.x = asp < 1.2 ? -0.8 : -2.4;
    const c = this.style.camera, az = THREE.MathUtils.degToRad(c.azimuthDeg), el = THREE.MathUtils.degToRad(c.elevationDeg);
    this.camera.position.copy(this.homeTarget).addScaledVector(V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)), this._homeDist());
    this.controls.target.copy(this.homeTarget); this.controls.update(); this.camera.fov = c.fov; this.camera.updateProjectionMatrix();
  }
  resetView() { this._flyTo(this.homeTarget, this._homeDist(), null, 700); }
  _flyTo(target, dist, dir, dur = 800) {
    const d = dir ? dir.clone().normalize() : this.camera.position.clone().sub(this.controls.target).normalize();
    this.tween = { t0: performance.now(), dur, fromT: this.controls.target.clone(), toT: target.clone(), fromP: this.camera.position.clone(), toP: target.clone().addScaledVector(d, dist) };
  }
  _stepTween(now) {
    const tw = this.tween; if (!tw) return; const k = clamp((now - tw.t0) / tw.dur, 0, 1), e = k < 0.5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2;
    this.controls.target.lerpVectors(tw.fromT, tw.toT, e); this.camera.position.lerpVectors(tw.fromP, tw.toP, e); if (k >= 1) this.tween = null;
  }

  // ---- state / API
  setCrossSection(on) { this.section = !!on; this.ui?.setSwitch('cut', this.section); if (this.ctx?.lid) this.ctx.lid.visible = !this.section; if (this.flow) this.flow.mesh.visible = !(this.tools.hide && this.selected); this._applyVisual(); }
  setViewMode(m) { this.setCrossSection(m !== 'solid'); }
  async setBinucleate(b) {
    if (b === this.binucleate || this.rebuilding) return; this.rebuilding = true; this.binucleate = !!b; this.ui?.setSwitch('bin', b);
    this.selected = null; this.hover = null; this.ui?.hideDetails(); await this._buildCell(null); this.setCrossSection(this.section); this.rebuilding = false;
  }
  /** Kept for the integration contract. The simplified build has one flow and no fed/fasted effect (see README). */
  setMetabolicState(s, silent) { this.metabolic = clamp(s, 0, 1); if (!silent) this._emit('metabolicState', this.metabolic); }
  setPathwayState(id, st) {
    const cur = this.pathwayState[id]; if (!cur) return; Object.assign(cur, st);
    this.flow.setEnabled(cur.enabled); this._emit('pathwayToggle', { id, enabled: cur.enabled, isolate: cur.isolate });
  }
  setPlaying(b) { this.playing = !!b; if (this.flow) this.flow.playing = this.playing; this.ui?.setPlaying(this.playing); }
  setSpeed(v) { this.style.flow.speed = v; }
  _tool(n) {
    if (n === 'reset') { this.resetView(); this.select(null); return; }
    if (n === 'shot') { const a = document.createElement('a'); a.href = this.screenshot(); a.download = 'hepatocyte.png'; a.click(); return; }
    this.tools[n] = !this.tools[n]; this.ui?.setTool(n, this.tools[n]); if (n === 'rotate') this.controls.autoRotate = this.tools.rotate; this._applyVisual();
  }
  select(id, hit) {
    if (id === this.selected && !hit) return; this.selected = id;
    if (id) {
      const it = this.data.organelles.items.find((x) => x.id === id);
      if (it) { this.ui?.showDetails({ title: it.name, color: it.color, html: this._organelleHtml(it) }); }
      const fp = hit?.point || this._centroid(id); if (fp) { this.focusPoint = fp.clone(); this._flyTo(fp, clamp(id === 'nucleus' ? 9 : 6, 5, 10)); }
    } else { this.ui?.hideDetails(); this.focusPoint = null; }
    this._applyVisual(); const it = id && this.data.organelles.items.find((x) => x.id === id); this._emit('organelleSelect', it ? { id, name: it.name } : null);
  }
  selectPathway() { /* single pathway: the numbered guide is always shown */ }
  _centroid(id) {
    const r = this.ctx.registry[id]; if (!r || !r.pick.length) return null; const m = new THREE.Matrix4(), p = V3(); let best = null, bd = 1e9;
    for (const pk of r.pick) {
      if (pk.isInstancedMesh) for (let i = 0; i < pk.count; i++) { pk.getMatrixAt(i, m); p.setFromMatrixPosition(m); const d = p.distanceTo(this.camera.position); if (d < bd) { bd = d; best = p.clone(); } }
      else { pk.geometry.computeBoundingSphere(); p.copy(pk.geometry.boundingSphere.center).applyMatrix4(pk.matrixWorld); const d = p.distanceTo(this.camera.position); if (d < bd) { bd = d; best = p.clone(); } }
    }
    return best;
  }
  _applyVisual() {
    if (!this.ctx) return; const sel = this.selected, focus = sel && this.tools.isolate;
    for (const [id, r] of Object.entries(this.ctx.registry)) {
      const keep = id === 'cell_body' || id === 'plasma_lateral' || id === 'sinusoid' || id === 'lsec';
      const dim = focus && id !== sel && !keep ? 0.8 : 0;
      const hv = this.hover && (id === this.hover || (id === 'plasma_lateral' && this.hover.startsWith('plasma_')));
      const hi = (id === sel ? 0.28 : 0) + (hv ? 0.4 : 0);
      for (const m of r.mats) { m.userData.own.uDim.value = dim; m.userData.own.uHi.value = hi; }
      const hidden = this.tools.hide && sel && id !== sel && id !== 'cell_body' && id !== 'plasma_lateral';
      for (const o of r.objects) o.visible = !hidden;
    }
    if (this.flow) this.flow.mesh.visible = !(this.tools.hide && sel);
  }
  _setHover(id) { if (id === this.hover) return; this.hover = id; this._applyVisual(); }
  _organelleHtml(it) {
    const S = this.data.labels.sideSections, cite = (ks) => (ks || []).map((k) => `<div class="src">${esc(this.data.citations[k] || k)}</div>`).join(''), list = (a) => (a && a.length ? `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
    const size = [it.sizeUm, it.volumeFraction ? `≈${Math.round(it.volumeFraction * 100)}% of cell volume (Alberts MBoC; Blouin 1977)` : '', it.realCount ? `Real count: ${it.realCount}` : ''].filter(Boolean);
    return `<p>${esc(it.function)}</p>${it.keyEnzymes?.length ? `<h5>${S.enzymes}</h5>${list(it.keyEnzymes)}` : ''}${it.keyTransporters?.length ? `<h5>${S.transporters}</h5>${list(it.keyTransporters)}` : ''}
      <h5>${S.clinical}</h5><p>${esc(it.clinical)}</p><h5>${S.size}</h5>${list(size)}<h5>${S.sources}</h5>${cite(it.citations)}<div class="src" style="margin-top:10px">${esc(this.data.labels.disclaimer)}</div>`;
  }

  // ---- interaction
  _bindEvents() {
    const cv = this.canvas; this.ray = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.pointer = { x: 0, y: 0, in: false, dirty: false };
    this._onMove = (e) => { const r = cv.getBoundingClientRect(); this.pointer.x = e.clientX - r.left; this.pointer.y = e.clientY - r.top; this.pointer.in = true; this.pointer.dirty = true; };
    this._onLeave = () => { this.pointer.in = false; this._setHover(null); };
    this._onDown = (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    this._onUp = (e) => { if (!this.down) return; const d = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y), dt = performance.now() - this.down.t; this.down = null; if (d < 5 && dt < 600 && e.button === 0) { const h = this._pick(); if (h) this.select(h.id, h.hit); else this.select(null); } };
    this._onKey = (e) => { if (e.key === 'Escape') this.select(null); };
    cv.addEventListener('pointermove', this._onMove); cv.addEventListener('pointerleave', this._onLeave); cv.addEventListener('pointerdown', this._onDown); cv.addEventListener('pointerup', this._onUp); window.addEventListener('keydown', this._onKey);
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(this.container);
    this._vis = () => { this.hiddenDoc = document.hidden; }; document.addEventListener('visibilitychange', this._vis);
  }
  _pick() {
    const cv = this.canvas; this.mouse.set((this.pointer.x / cv.clientWidth) * 2 - 1, -(this.pointer.y / cv.clientHeight) * 2 + 1); this.ray.setFromCamera(this.mouse, this.camera);
    const hits = this.ray.intersectObjects(this.ctx.pickables.filter((o) => o.visible), false); let best = null;
    const tier = (o) => (o.userData.isShell ? 2 : ['lsec', 'sinusoid'].includes(o.userData.orgId) ? 1 : 0);
    for (const hit of hits) { const o = hit.object; if (this.tools.hide && this.selected && o.userData.orgId !== this.selected) continue; const t = tier(o); if (!best || t < best.t) best = { hit, t, id: o.userData.orgId }; }
    if (best?.hit.object.userData.isShell) { const p = best.hit.point; best.id = p.x < -4.5 ? 'plasma_sinusoidal' : p.x > 4.2 ? 'plasma_canalicular' : 'plasma_lateral'; }
    return best;
  }
  resize() {
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600; this.w = w; this.h = h;
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h); this.composer?.setPixelRatio?.(this.dpr); this.bloom?.resolution.set((w * this.dpr) / 2, (h * this.dpr) / 2);
    if (!this.userMoved && !this.tween && this.controls) this._homeCamera(); this.ui?.setMobile(w < 820);
  }

  // ---- style (lil-gui)
  getStyle() { return this.style; }
  refreshStyle() {
    const S = this.style, L = S.lights;
    this.lights.hemi.color.set(L.hemiSky); this.lights.hemi.groundColor.set(L.hemiGround); this.lights.hemi.intensity = L.hemi;
    this.lights.key.color.set(L.key); this.lights.key.intensity = L.keyI; this.lights.fill.color.set(L.fill); this.lights.fill.intensity = L.fillI; this.lights.rim.color.set(L.rim); this.lights.rim.intensity = L.rimI;
    this.renderer.toneMappingExposure = L.exposure; this.scene.background.set(S.tokens.bg); this.renderer.setClearColor(S.tokens.bg, 1);
    if (this.bloom) { this.bloom.strength = S.glow.bloomStrength; this.bloom.radius = S.glow.bloomRadius; this.bloom.threshold = S.glow.bloomThreshold; }
    this.shared.uBumpK.value = S.material.bump; this.shared.uSssK.value = S.material.sss; this.shared.uRimK.value = S.membrane.rim;
    for (const m of this.mats) m.envMapIntensity = (m.userData.envBase ?? 0.6) * (L.env / 0.4);
    if (this.camera.fov !== S.camera.fov) { this.camera.fov = S.camera.fov; this.camera.updateProjectionMatrix(); }
    this.controls.autoRotateSpeed = S.camera.autoRotateSpeed * 3;
    for (const [k, v] of Object.entries(S.palette)) { const old = this._palApplied[k]; if (old && old.toLowerCase() !== v.toLowerCase()) { this._recolor(old, v); this._palApplied[k] = v; } }
  }
  _recolor(oldHex, newHex) {
    const o = new THREE.Color(oldHex).getHex(), n = new THREE.Color(newHex), swap = (c) => { if (c && c.getHex() === o) c.copy(n); };
    for (const m of this.mats) { swap(m.color); swap(m.emissive); for (const u of Object.values(m.userData.own)) if (u.value && u.value.isColor) swap(u.value); }
  }
  setStyle(path, value) { const k = path.split('.'); let o = this.style; while (k.length > 1) o = o[k.shift()]; o[k[0]] = value; this.refreshStyle(); }

  // ---- labels + loop
  _updateLabels() {
    if (!this.ui) return; const out = [], v = V3(), w = this.w, h = this.h, A = this.ctx.anchors, Cx = this.data.labels.context;
    const proj = (p) => { v.copy(p).project(this.camera); return v.z > 1 ? null : { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; };
    const ser = A.ser.filter((s) => s.pos.z > 1.6)[3]?.pos || V3(-3.4, -0.3, 2.5), gol = A.golgi[0], c = this.ctx.canal, st = this.data.labels.steps, cls = this.data.molecules.classes, pw = this.data.pathways.pathways[0].stages;
    const col = (i) => cls.find((x) => x.id === pw[i].mol).color;
    const add = (key, p, text, extra) => { const s = proj(p); if (s) out.push({ key, x: s.x, y: s.y - 6, text, ...extra }); };
    add('s1', V3(-6.1, 0.5, 2.2), st[0].short, { n: 1, color: col(0) }); add('s2', ser.clone().setY(0.5), st[1].short, { n: 2, color: col(1) });
    add('s3', V3(gol.cis.x + 0.7, 1.1, gol.cis.z), st[2].short, { n: 3, color: col(2) }); add('s4', V3(c.cx, 0.55, 0.6), st[3].short, { n: 4, color: col(3) });
    add('c1', V3(-8.3, 0.7, -3.4), Cx.sinusoid, { ctx: true }); add('c2', V3(-6.4, 0.75, -1.0), Cx.disse, { ctx: true }); add('c3', V3(-6.9, 0.55, 3.9), Cx.lsec, { ctx: true });
    add('c4', V3(c.cx, 0.5, 3.6), Cx.bileflow, { ctx: true });
    if (this.hover && this.hoverPoint && this.hover !== this.selected) { const it = this.data.organelles.items.find((x) => x.id === this.hover); if (it) { const s = proj(this.hoverPoint); if (s) out.push({ key: 'hover', x: s.x, y: s.y - 16, text: it.callout, color: it.color }); } }
    if (this.selected && this.focusPoint) { const it = this.data.organelles.items.find((x) => x.id === this.selected); const s = proj(this.focusPoint); if (it && s) out.push({ key: 'sel', x: s.x, y: s.y - 16, text: it.callout, color: it.color }); }
    this.ui.setLabels(out);
  }
  _loop() {
    if (this.disposed) return; this.raf = requestAnimationFrame(this._loop); if (this.hiddenDoc || this.rebuilding) return;
    const dt = Math.min(0.05, this.clock.getDelta()), now = performance.now(); this.shared.uTime.value += dt;
    this.controls.autoRotate = this.tools.rotate && now - this.lastInput > 4000; this._stepTween(now); this.controls.update();
    if (this.pointer.dirty && this.pointer.in && !this.tween) { this.pointer.dirty = false; const h = this._pick(); this.hoverPoint = h ? h.hit.point.clone() : null; this._setHover(h ? h.id : null); this.canvas.style.cursor = h ? 'pointer' : 'grab'; }
    this.flow.update(dt); updateRBC(this.ctx, dt, this.playing); this._updateLabels();
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.frames++; this.msAvg = this.msAvg * 0.95 + dt * 1000 * 0.05;
    if (this.opts.adaptive !== false && this.frames % 45 === 0 && this.frames > 90) { if (this.msAvg > 20 && this.dpr > 0.75) { this.dpr = Math.max(0.75, this.dpr - 0.15); this.resize(); } else if (this.msAvg < 13.5 && this.dpr < this.dprBase) { this.dpr = Math.min(this.dprBase, this.dpr + 0.1); this.resize(); } }
    this.fps = 1000 / Math.max(1, this.msAvg);
  }
  screenshot() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); return this.canvas.toDataURL('image/png'); }
  dispose() {
    if (this.disposed) return; this.disposed = true; cancelAnimationFrame(this.raf); const cv = this.canvas;
    if (cv) { cv.removeEventListener('pointermove', this._onMove); cv.removeEventListener('pointerleave', this._onLeave); cv.removeEventListener('pointerdown', this._onDown); cv.removeEventListener('pointerup', this._onUp); }
    window.removeEventListener('keydown', this._onKey); document.removeEventListener('visibilitychange', this._vis); this._ro?.disconnect();
    this.flow?.dispose(); this.controls?.dispose(); if (this.group) { disposeObject(this.group); this.ctx.disposables.forEach((d) => d.dispose()); }
    this.scene?.traverse((o) => { if (o.isLight && o.dispose) o.dispose(); }); this.envTex?.dispose(); this.composer?.dispose?.(); this.bloom?.dispose?.(); this.ui?.dispose();
    this.renderer?.dispose(); this.renderer?.forceContextLoss(); this.root?.remove(); this.listeners = {};
  }
}

function facade(h) {
  const api = {
    ready: h.ready.then(() => api), dispose: () => h.dispose(),
    setPathwayState: (id, st) => h.setPathwayState(id, st), setMetabolicState: (s) => h.setMetabolicState(s), setBinucleate: (b) => h.setBinucleate(b),
    setCrossSection: (b) => h.setCrossSection(b), setViewMode: (m) => h.setViewMode(m), setPlaying: (b) => h.setPlaying(b), setSpeed: (v) => h.setSpeed(v),
    select: (id) => h.select(id), selectPathway: (id) => h.selectPathway(id), resetView: () => h.resetView(), screenshot: () => h.screenshot(),
    getStyle: () => h.getStyle(), refreshStyle: () => h.refreshStyle(), setStyle: (p, v) => h.setStyle(p, v),
    getPathways: () => h.data.pathways.pathways.map((p) => ({ id: p.id, name: p.name, ...h.pathwayState[p.id] })), getOrganelles: () => h.data.organelles.items.map((o) => ({ id: o.id, name: o.name })),
    on: (e, cb) => h.on(e, cb), get stats() { return h.stats; }, get fps() { return h.fps; }, get quality() { return h.qualityName; }, _internal: h,
  };
  return api;
}
/** mount(container, { tokens, style, data, quality, ui, fonts, background, binucleate, crossSection, initialState, onOrganelleSelect, onPathwayToggle, onMetabolicState, onReady }) */
export function mount(container, options = {}) { return facade(new Hepatocyte(container, options)); }
