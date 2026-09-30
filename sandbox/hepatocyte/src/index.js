// Public module: mount(container, options) -> instance. See README "Integration contract".
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import DEFAULTS from './defaults.js';
import { clone, merge, disposeObject, V3, clamp, lerp, nextFrame } from './util.js';
import { createShared } from './materials.js';
import { makeSDF } from './cellShape.js';
import { planLayout } from './layout.js';
import { buildEnvironment, updateRBC } from './build/environment.js';
import { buildShellAndSurface, buildGates } from './build/surface.js';
import { buildNucleus, buildMitochondria, buildSmall, updateCapDiscs, applyStateToOrganelles } from './build/organelles.js';
import { buildRER, buildSER, buildGolgi } from './build/er.js';
import { buildCytoskeleton, buildCaps, updateCaps } from './build/cyto.js';
import { FlowSystem } from './flow.js';
import { HepUI } from './ui.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

class Hepatocyte {
  constructor(container, options = {}) {
    this.container = container; this.opts = options;
    const data = { ...DEFAULTS, ...(options.data || {}) };
    this.data = data;
    this.style = merge(clone(data.style), options.style || {});
    if (options.tokens) merge(this.style.tokens, options.tokens);
    if (options.background) this.style.tokens.bg = options.background;
    this.listeners = {};
    this.disposed = false;
    this.viewMode = options.viewMode || 'layers';
    this.metabolic = options.initialState?.metabolic ?? 0;
    this.binucleate = !!options.binucleate;
    this.selected = null; this.selPathway = null; this.hover = null;
    this.tools = { rotate: false, isolate: false, hide: false };
    this.playing = true;
    this.pathwayState = {};
    for (const p of data.pathways.pathways) this.pathwayState[p.id] = { enabled: true, isolate: false, ...(options.initialState?.pathways?.[p.id] || {}) };
    const mobile = matchMedia('(pointer: coarse)').matches || Math.min(container.clientWidth || 1200, container.clientHeight || 800) < 520;
    this.qualityName = options.quality && options.quality !== 'auto' ? options.quality : (mobile ? 'low' : 'high');
    this.quality = this.style.quality[this.qualityName];
    this.ready = this._init();
  }

  // ---------------------------------------------------------------- events
  on(evt, cb) { (this.listeners[evt] ||= new Set()).add(cb); return () => this.listeners[evt].delete(cb); }
  _emit(evt, payload) {
    for (const cb of this.listeners[evt] || []) { try { cb(payload); } catch (e) { console.error(e); } }
    const h = { organelleSelect: 'onOrganelleSelect', pathwayToggle: 'onPathwayToggle', metabolicState: 'onMetabolicState', ready: 'onReady' }[evt];
    if (h && typeof this.opts[h] === 'function') { try { this.opts[h](payload); } catch (e) { console.error(e); } }
  }

  // ---------------------------------------------------------------- setup
  async _init() {
    const el = this.container;
    const root = this.root = document.createElement('div'); root.className = 'hl-root';
    el.appendChild(root);
    const cv = this.canvas = document.createElement('canvas'); cv.className = 'hl-canvas'; cv.tabIndex = 0; root.appendChild(cv);
    const T = this.style.tokens;
    const loading = document.createElement('div'); loading.className = 'hl-loading';
    loading.innerHTML = `<div>${this.data.labels.title}<small>Building cell…</small><div class="bar"><i></i></div></div>`;
    const bar = loading.querySelector('.bar i'), sm = loading.querySelector('small');
    const step = async (p, msg) => { bar.style.width = `${p * 100}%`; sm.textContent = msg; await nextFrame(); };

    // renderer
    const q = this.quality;
    let renderer;
    try { renderer = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: q.msaa === 0 || !q.bloom, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: !!this.opts.preserveDrawingBuffer }); }
    catch (err) { root.innerHTML = '<div style="padding:24px;color:#a9b6d8;font:14px system-ui">WebGL 2 is not available in this browser, so the 3D hepatocyte cannot be shown.</div>'; this.failed = true; throw err; }
    this.dprBase = Math.min(this.opts.pixelRatio || window.devicePixelRatio || 1, q.dprMax); this.dpr = this.dprBase;
    renderer.setPixelRatio(this.dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(T.bg, 1);
    const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color(T.bg);
    scene.fog = new THREE.FogExp2(T.bg, this.style.fog.density);
    const cam = this.camera = new THREE.PerspectiveCamera(this.style.camera.fov, 1, 0.1, 200);
    this._setupLights();
    const pm = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment(); this.envTex = pm.fromScene(room, 0.04).texture; scene.environment = this.envTex; room.dispose?.(); pm.dispose();

    // controls
    const c = this.style.camera;
    const ctl = this.controls = new OrbitControls(cam, cv);
    ctl.enableDamping = true; ctl.dampingFactor = c.damping; ctl.rotateSpeed = 0.6; ctl.zoomSpeed = 0.8; ctl.screenSpacePanning = true;
    ctl.minDistance = c.minDistance; ctl.maxDistance = c.maxDistance; ctl.minPolarAngle = 0.14; ctl.maxPolarAngle = Math.PI - 0.14;
    ctl.autoRotateSpeed = c.autoRotateSpeed * 3;
    this.homeTarget = V3(-1.9, 0, 0);
    this._homeCamera();
    ctl.addEventListener('start', () => { this.tween = null; this.userMoved = true; this.lastInput = performance.now(); });
    this.lastInput = -1e9;

    // UI
    this.ui = null;
    if (this.opts.ui !== false) {
      this.ui = new HepUI(root, {
        labels: this.data.labels, molecules: this.data.molecules, pathways: this.data.pathways, states: this.data.states, style: this.style, fonts: this.opts.fonts !== false,
        api: {
          setViewMode: (m) => this.setViewMode(m), setCrossSection: (b) => this.setCrossSection(b), setBinucleate: (b) => this.setBinucleate(b),
          setFlow: (k, v) => { this.style.flow[k] = v; this.refreshStyle(); }, setPlaying: (b) => this.setPlaying(b), tool: (n) => this._tool(n),
          setMetabolicState: (s) => this.setMetabolicState(s), select: (id) => this.select(id), selectPathway: (id) => this.selectPathway(id),
          setPathwayState: (id, st) => this.setPathwayState(id, st),
        },
      });
    }
    root.appendChild(loading);
    this.sdf = makeSDF();
    await step(0.05, 'Shaping the membrane…');
    await this._buildCell(step);
    this._setupComposer();
    this._bindEvents();
    this.resize();
    this.setViewMode(this.viewMode, true);
    this.setMetabolicState(this.metabolic, true);
    for (const [id, st] of Object.entries(this.pathwayState)) this.ui?.syncPathway(id, st);
    this.ui?.setPlaying(true); this.ui?.setSwitch('bin', this.binucleate);
    this.clock = new THREE.Clock(); this.frames = 0; this.msAvg = 16;
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
    await step(1, 'Ready');
    setTimeout(() => { loading.style.opacity = '0'; setTimeout(() => loading.remove(), 600); }, 150);
    this._emit('ready', this);
    return this;
  }

  _setupLights() {
    const L = this.style.lights, s = this.scene;
    this.lights = {
      hemi: new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemi),
      key: new THREE.DirectionalLight(L.key, L.keyI), fill: new THREE.DirectionalLight(L.fill, L.fillI), rim: new THREE.DirectionalLight(L.rim, L.rimI),
    };
    this.lights.key.position.set(-6, 9, 7); this.lights.fill.position.set(8, 2, 4); this.lights.rim.position.set(2, 4, -9);
    Object.values(this.lights).forEach((l) => s.add(l));
    this.renderer.toneMappingExposure = L.exposure;
  }

  _setupComposer() {
    const q = this.quality;
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    if (!q.bloom) return;
    const size = new THREE.Vector2(); this.renderer.getDrawingBufferSize(size);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q.msaa, colorSpace: THREE.LinearSRGBColorSpace });
    const comp = this.composer = new EffectComposer(this.renderer, rt);
    comp.addPass(new RenderPass(this.scene, this.camera));
    const g = this.style.glow;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), g.bloomStrength, g.bloomRadius, g.bloomThreshold);
    comp.addPass(this.bloom);
    comp.addPass(new OutputPass());
  }

  async _buildCell(step) {
    const s = (p, m) => (step ? step(p, m) : Promise.resolve());
    if (this.group) { this.scene.remove(this.group); disposeObject(this.group); this.ctx.disposables.forEach((d) => d.dispose()); }
    this.flow?.dispose();
    if (!this.shared) this.shared = createShared();
    const group = this.group = new THREE.Group(); this.scene.add(group);
    const ctx = this.ctx = {
      group, scene: this.scene, shared: this.shared, style: this.style, P: this.style.palette, sdf: this.sdf, org: this.data.organelles,
      registry: {}, pickables: [], anchors: {}, capDiscs: [], stats: {}, disposables: [], shellGeoCache: this.shellGeoCache,
    };
    ctx.layout = ctx.L = planLayout(this.sdf, this.data.organelles, { binucleate: this.binucleate, mitoScale: this.quality.mitoCount });
    this.shared.uCutY.value = ctx.L.cut.y; this.shared.uCutZ.value = ctx.L.cut.z;
    this.cutBase = { y: ctx.L.cut.y, z: ctx.L.cut.z };
    await s(0.12, 'Membrane and surface…');
    buildShellAndSurface(ctx, this.quality.cellDetail); this.shellGeoCache = ctx.shellGeo;
    await s(0.3, 'Sinusoid and endothelium…'); buildEnvironment(ctx);
    await s(0.38, 'Nucleus…'); buildNucleus(ctx);
    await s(0.46, 'Mitochondria…'); buildMitochondria(ctx);
    await s(0.56, 'Vesicles, droplets, glycogen…'); buildSmall(ctx);
    await s(0.64, 'Rough ER…'); buildRER(ctx);
    await s(0.72, 'Smooth ER and Golgi…'); buildSER(ctx); buildGolgi(ctx);
    await s(0.8, 'Cytoskeleton and sections…'); buildCytoskeleton(ctx); buildCaps(ctx);
    // haze + caps join the body registry
    await s(0.86, 'Transporters…'); buildGates(ctx, this.data.pathways);
    await s(0.92, 'Flow routes…');
    this.flow = new FlowSystem(ctx, this.data.pathways, this.data.molecules, this.style, this.quality);
    this.flow.playing = this.playing;
    for (const [id, st] of Object.entries(this.pathwayState)) this.flow.pathwayState[id] = st;
    this.flow.setState(this.metabolic); this.flow.isolated = Object.entries(this.pathwayState).find(([, v]) => v.isolate)?.[0] || null; this.flow.applyWeights();
    this.applyCut(); this._collectMats();
    updateCapDiscs(ctx); applyStateToOrganelles(ctx, this.metabolic, this.data.states);
    this._applyVisual();
    // stats for the README/dev overlay
    this.stats = { ...ctx.stats, mitochondria: ctx.L.mito.length, ribosomes: ctx.stats.ribosomes, particles: this.flow.count, routes: this.flow.routes.length, gates: ctx.gateList.length };
  }

  _collectMats() {
    const all = new Set();
    this.scene.traverse((o) => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.userData?.own) { all.add(x); if (x.userData.envBase === undefined) x.userData.envBase = x.envMapIntensity; } }); });
    this.mats = [...all];
    this._palApplied = clone(this.style.palette);
  }

  // ---------------------------------------------------------------- camera
  _homeDist() { const a = (this.w || this.container.clientWidth || 1200) / (this.h || this.container.clientHeight || 800); return this.style.camera.distance * Math.max(1, 1.45 / a); }
  _homeCamera() {
    const asp = (this.w || this.container.clientWidth || 1200) / (this.h || this.container.clientHeight || 800);
    this.homeTarget.x = asp < 1.2 ? -0.5 : -1.9;
    const c = this.style.camera, az = THREE.MathUtils.degToRad(c.azimuthDeg), el = THREE.MathUtils.degToRad(c.elevationDeg);
    const dir = V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.camera.position.copy(this.homeTarget).addScaledVector(dir, this._homeDist());
    this.controls.target.copy(this.homeTarget); this.controls.update();
    this.camera.fov = c.fov; this.camera.updateProjectionMatrix();
  }
  resetView() { this._flyTo(this.homeTarget, this._homeDist(), null, 700); }
  _flyTo(target, dist, dir, dur = 800) {
    const cam = this.camera, ctl = this.controls;
    const d = dir ? dir.clone().normalize() : cam.position.clone().sub(ctl.target).normalize();
    this.tween = { t0: performance.now(), dur, fromT: ctl.target.clone(), toT: target.clone(), fromP: cam.position.clone(), toP: target.clone().addScaledVector(d, dist) };
  }
  _stepTween(now) {
    const tw = this.tween; if (!tw) return;
    const k = clamp((now - tw.t0) / tw.dur, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    this.controls.target.lerpVectors(tw.fromT, tw.toT, e); this.camera.position.lerpVectors(tw.fromP, tw.toP, e);
    if (k >= 1) this.tween = null;
  }

  // ---------------------------------------------------------------- cut / view
  applyCut() {
    const on = this.cutOn ?? (this.viewMode !== 'solid');
    this.shared.uCutOn.value = on ? 1 : 0;
    this.shared.uCutY.value = this.cutBase.y + (this.cutOffset?.y || 0); this.shared.uCutZ.value = this.cutBase.z + (this.cutOffset?.z || 0);
    updateCaps(this.ctx); updateCapDiscs(this.ctx);
    if (this.ctx.caps) { this.ctx.caps.floor.mesh.visible = on; this.ctx.caps.wall.mesh.visible = on; }
    this.ctx.capDiscs.forEach((d) => { if (!on) d.floor.visible = d.wall.visible = false; });
  }
  setCrossSection(on) { this.cutOn = !!on; this.ui?.setSwitch('cut', on); this.applyCut(); }
  setViewMode(m, silent) {
    this.viewMode = m; this.ui?.setViewMode(m);
    const mem = this.style.membrane, solid = m === 'solid';
    this.cutOn = !solid; this.ui?.setSwitch('cut', !solid);
    this.applyCut();
    const own = this.ctx.shellMat.userData.own;
    own.uAF.value = solid ? 0.93 : mem.opacityFront; own.uAB.value = solid ? 0.96 : mem.opacityBack;
    this.ctx.shellMat.depthWrite = solid; this.ctx.shellMat.needsUpdate = true;
    this._applyVisual();
  }
  async setBinucleate(b) {
    if (b === this.binucleate || this.rebuilding) return;
    this.rebuilding = true; this.binucleate = !!b; this.ui?.setSwitch('bin', b);
    this.selected = null; this.hover = null; this.ui?.hideDetails();
    await this._buildCell(null); this.setViewMode(this.viewMode, true); this.rebuilding = false;
  }

  // ---------------------------------------------------------------- state
  setMetabolicState(s, silent) {
    this.metabolic = clamp(s, 0, 1);
    this.flow?.setState(this.metabolic); this.ui?.setState(this.metabolic);
    if (this.ctx) applyStateToOrganelles(this.ctx, this.metabolic, this.data.states);
    if (!silent) this._emit('metabolicState', this.metabolic);
    if (this.selPathway) this._showPathway(this.selPathway);
  }
  setPathwayState(id, st) {
    const cur = this.pathwayState[id]; if (!cur) return;
    if (st.isolate) for (const k of Object.keys(this.pathwayState)) if (k !== id) { this.pathwayState[k].isolate = false; this.ui?.syncPathway(k, this.pathwayState[k]); }
    Object.assign(cur, st);
    if (st.isolate) cur.enabled = true;
    this.flow.pathwayState = this.pathwayState;
    this.flow.isolated = Object.entries(this.pathwayState).find(([, v]) => v.isolate)?.[0] || null;
    this.flow.applyWeights();
    this.ui?.syncPathway(id, cur);
    this._applyVisual();
    this._emit('pathwayToggle', { id, enabled: cur.enabled, isolate: cur.isolate });
  }
  setPlaying(b) { this.playing = !!b; if (this.flow) this.flow.playing = this.playing; this.ui?.setPlaying(this.playing); }
  setSpeed(v) { this.style.flow.speed = v; }
  _tool(n) {
    if (n === 'reset') { this.resetView(); this.select(null); return; }
    if (n === 'shot') { const a = document.createElement('a'); a.href = this.screenshot(); a.download = 'hepatocyte.png'; a.click(); return; }
    this.tools[n] = !this.tools[n]; this.ui?.setTool(n, this.tools[n]);
    if (n === 'rotate') this.controls.autoRotate = this.tools.rotate;
    this._applyVisual();
  }

  // ---------------------------------------------------------------- selection + visual state
  select(id, hit) {
    if (id === this.selected && !hit) return;
    this.selected = id; this.selPathway = null; this.ui?.markPathwaySelected(null);
    if (id) {
      const it = this.data.organelles.items.find((x) => x.id === id);
      this.ui?.showDetails({ title: it.name, color: it.color, html: this._organelleHtml(it) });
      const fp = hit?.point || this._centroid(id);
      if (fp) { this.focusPoint = fp.clone(); const r = 3.2 * (it.id === 'nucleus' ? 1.9 : it.id === 'mitochondrion' ? 0.5 : 0.7) + 3; this._flyTo(fp, clamp(r, 5, 13)); }
    } else { this.ui?.hideDetails(); this.focusPoint = null; }
    this._applyVisual();
    this._emit('organelleSelect', id ? { id, name: this.data.organelles.items.find((x) => x.id === id).name } : null);
  }
  selectPathway(id) {
    this.selected = null; this.selPathway = id; this.ui?.markPathwaySelected(id); this._showPathway(id); this._applyVisual();
  }
  /** Focus point for an organelle type: for instanced types the visible instance nearest the camera; else the mesh centre. */
  _centroid(id) {
    const r = this.ctx.registry[id]; if (!r || !r.pick.length) return null;
    const m = new THREE.Matrix4(), p = V3(), cy = this.shared.uCutY.value, cz = this.shared.uCutZ.value, on = this.shared.uCutOn.value > 0.5;
    let best = null, bd = 1e9;
    for (const pk of r.pick) {
      if (pk.isInstancedMesh) {
        for (let i = 0; i < pk.count; i++) { pk.getMatrixAt(i, m); p.setFromMatrixPosition(m); if (on && p.y > cy && p.z > cz) continue; const d = p.distanceTo(this.camera.position); if (d < bd) { bd = d; best = p.clone(); } }
      } else { pk.geometry.computeBoundingSphere(); p.copy(pk.geometry.boundingSphere.center).applyMatrix4(pk.matrixWorld); const d = p.distanceTo(this.camera.position); if (d < bd) { bd = d; best = p.clone(); } }
    }
    return best;
  }
  _applyVisual() {
    if (!this.ctx) return;
    const reg = this.ctx.registry, sel = this.selected, iso = this.flow?.isolated;
    const focus = sel && (this.tools.isolate || this.viewMode === 'focus');
    const involved = iso ? new Set(this.flow.involves[iso] || []) : null;
    for (const [id, r] of Object.entries(reg)) {
      let dim = 0;
      if (focus && id !== sel) dim = 0.8;
      else if (involved && !involved.has(id) && id !== 'plasma_lateral' && id !== 'cell_body') dim = 0.72;
      else if (involved && id === 'cytoskeleton') dim = 0.8;
      const hv = this.hover && (id === this.hover || (id === 'plasma_lateral' && this.hover.startsWith('plasma_')));
      const hi = (id === sel || (id === 'plasma_lateral' && sel && sel.startsWith('plasma_')) ? 0.3 : 0) + (hv ? 0.45 : 0);
      const involvedHi = involved && involved.has(id) && id !== 'plasma_lateral' ? 0.12 : 0;
      for (const m of r.mats) { m.userData.own.uDim.value = dim; m.userData.own.uHi.value = hi + involvedHi; }
      const hidden = this.tools.hide && sel && id !== sel;
      for (const o of r.objects) if (!o.userData.cap) o.visible = !hidden;
    }
    if (this.flow) this.flow.mesh.visible = !(this.tools.hide && sel);
    this.ctx.capDiscs.forEach((d) => { if (this.tools.hide && sel) { d.floor.visible = d.wall.visible = false; } });
    if (!(this.tools.hide && sel)) updateCapDiscs(this.ctx);
    if (this.ctx.caps) { const on = this.shared.uCutOn.value > 0.5 && !(this.tools.hide && sel); this.ctx.caps.floor.mesh.visible = on; this.ctx.caps.wall.mesh.visible = on; }
  }
  _setHover(id) { if (id === this.hover) return; this.hover = id; this._applyVisual(); }

  // ---------------------------------------------------------------- side-panel content
  _cite(keys) { return (keys || []).map((k) => `<div class="src">${esc(this.data.citations[k] || k)}</div>`).join(''); }
  _list(a) { return a && a.length ? `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''; }
  _organelleHtml(it) {
    const S = this.data.labels.sideSections, pws = this.data.pathways.pathways.filter((p) => (this.flow?.involves[p.id] || p.involves || []).includes(it.id));
    const size = [it.sizeUm, it.volumeFraction ? `≈${Math.round(it.volumeFraction * 100)}% of cell volume (Alberts MBoC; Blouin 1977)` : '', it.realCount ? `Real count: ${it.realCount}` : '', it.count > 1 && it.id !== 'microvilli_sinusoidal' ? `Shown: ${it.count} (illustrative)` : ''].filter(Boolean);
    return `<p>${esc(it.function)}</p>
      ${it.keyEnzymes?.length ? `<h5>${S.enzymes}</h5>${this._list(it.keyEnzymes)}` : ''}
      ${it.keyTransporters?.length ? `<h5>${S.transporters}</h5>${this._list(it.keyTransporters)}` : ''}
      <h5>${S.clinical}</h5><p>${esc(it.clinical)}</p>
      <h5>${S.size}</h5>${this._list(size)}
      ${pws.length ? `<h5>Pathways</h5>${pws.map((p) => `<div><span class="lnk" data-pw="${p.id}">${esc(p.name)}</span></div>`).join('')}` : ''}
      <h5>${S.sources}</h5>${this._cite(it.citations)}
      <div class="src" style="margin-top:10px">${esc(this.data.labels.disclaimer)}</div>`;
  }
  _showPathway(id) {
    const p = this.data.pathways.pathways.find((x) => x.id === id); if (!p) return;
    const S = this.data.labels.sideSections, unc = this.data.uncertainties[id] || [];
    const s = this.metabolic;
    const vars = p.variants.map((v) => { const w = lerp(v.flux.fed, v.flux.fasted, s); return `<div class="hl-var"><span style="flex:1">${esc(v.name)}</span><span class="b"><i style="width:${Math.round(w * 100)}%"></i></span></div>`; }).join('');
    const cls = [...new Set(p.variants.flatMap((v) => v.path.map((n) => n.mol)).filter(Boolean))].map((m) => this.data.molecules.classes.find((c) => c.id === m)).filter(Boolean);
    this.ui?.showDetails({
      title: p.name, color: cls[0]?.color || '#8899cc',
      html: `<p>${esc(p.summary)}</p>
      <h5>${S.variants} · ${this.data.labels.panels.state.toLowerCase()}</h5>${vars}<div class="src" style="margin-top:4px"><span class="lnk" data-solo="${p.id}">${this.data.labels.panels.solo}: isolate this pathway</span></div>
      <h5>${S.route}</h5><p>${esc(p.compartmentRoute)}</p>
      <h5>${S.direction}</h5><p>${esc(p.direction)}</p>
      <h5>${S.enzymes} / ${S.transporters.toLowerCase()}</h5>${this._list(p.transportersEnzymes)}
      <h5>${this.data.molecules.families.length ? 'Substrates' : ''}</h5>${this._list(p.substrates)}
      <h5>${S.clinical}</h5><p>${esc(p.clinical)}</p>
      ${unc.length ? `<h5>${S.uncertainty}</h5><ul class="unc">${unc.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <h5>${S.sources}</h5>${this._cite(p.citations)}
      <div class="src" style="margin-top:10px">${esc(this.data.labels.disclaimer)}</div>`,
    });
  }

  // ---------------------------------------------------------------- interaction
  _bindEvents() {
    const cv = this.canvas;
    this.ray = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.pointer = { x: 0, y: 0, in: false, dirty: false };
    this._onMove = (e) => { const r = cv.getBoundingClientRect(); this.pointer.x = e.clientX - r.left; this.pointer.y = e.clientY - r.top; this.pointer.in = true; this.pointer.dirty = true; };
    this._onLeave = () => { this.pointer.in = false; this._setHover(null); };
    this._onDown = (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    this._onUp = (e) => {
      if (!this.down) return; const d = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y), dt = performance.now() - this.down.t; this.down = null;
      if (d < 5 && dt < 600 && e.button === 0) { const h = this._pick(); if (h) this.select(h.id, h.hit); else this.select(null); }
    };
    this._onKey = (e) => { if (e.key === 'Escape') { this.select(null); this.selPathway = null; this.ui?.hideDetails(); this.ui?.markPathwaySelected(null); this._applyVisual(); } };
    cv.addEventListener('pointermove', this._onMove); cv.addEventListener('pointerleave', this._onLeave); cv.addEventListener('pointerdown', this._onDown); cv.addEventListener('pointerup', this._onUp);
    window.addEventListener('keydown', this._onKey);
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(this.container);
    this._vis = () => { this.hiddenDoc = document.hidden; }; document.addEventListener('visibilitychange', this._vis);
  }
  _pick() {
    if (!this.pointer.in && !this.down) return null;
    const cv = this.canvas, w = cv.clientWidth, h = cv.clientHeight;
    const px = this.pointer.x, py = this.pointer.y;
    this.mouse.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
    const hits = this.ray.intersectObjects(this.ctx.pickables, false);
    const cy = this.shared.uCutY.value, cz = this.shared.uCutZ.value, on = this.shared.uCutOn.value > 0.5;
    const tier = (o) => (o.userData.isShell ? 2 : (o.userData.orgId === 'lsec' || o.userData.orgId === 'sinusoid' || o.userData.orgId === 'cytoskeleton') ? 1 : 0);
    let best = null;
    for (const hit of hits) {
      const o = hit.object; if (!o.userData.orgId) continue;
      if (this.tools.hide && this.selected && o.userData.orgId !== this.selected) continue;
      if (on && hit.point.y > cy && hit.point.z > cz) continue;
      if (this.viewMode === 'solid' && !o.userData.isShell && tier(o) === 0 && o.userData.orgId !== 'microvilli_sinusoidal' && o.userData.orgId !== 'tight_junction' && o.userData.orgId !== 'gap_junction' && o.userData.orgId !== 'desmosome' && o.userData.orgId !== 'plasma_canalicular' && o.userData.orgId !== 'bile_canaliculus') continue;
      const t = tier(o);
      if (!best || t < best.t) best = { hit, t, id: o.userData.orgId };
    }
    if (!best) return null;
    if (best.hit.object.userData.isShell) {
      const col = best.hit.object.geometry.attributes.color, f = best.hit.face;
      const w3 = [f.a, f.b, f.c].map((i) => [col.getX(i), col.getY(i), col.getZ(i)]).reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
      best.id = w3[0] > 1.2 ? 'plasma_sinusoidal' : w3[1] > 0.9 ? 'plasma_canalicular' : 'plasma_lateral';
    }
    return best;
  }

  resize() {
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
    this.w = w; this.h = h;
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the whole cell in view on narrow / portrait windows
    const c = this.style.camera; const fitDist = c.distance * (w / h < 1.25 ? 1.25 / (w / h) : 1);
    if (!this.userMoved && !this.tween && this.controls && this.homeTarget) this._homeCamera();
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h); this.composer?.setPixelRatio?.(this.dpr);
    this.bloom?.resolution.set(w * this.dpr / 2, h * this.dpr / 2);
    this.ui?.setMobile(w < 820);
  }

  // ---------------------------------------------------------------- style
  getStyle() { return this.style; }
  /** Re-apply style values after they were edited (lil-gui calls this on change). */
  refreshStyle() {
    const S = this.style, L = S.lights;
    this.lights.hemi.color.set(L.hemiSky); this.lights.hemi.groundColor.set(L.hemiGround); this.lights.hemi.intensity = L.hemi;
    this.lights.key.color.set(L.key); this.lights.key.intensity = L.keyI; this.lights.fill.color.set(L.fill); this.lights.fill.intensity = L.fillI; this.lights.rim.color.set(L.rim); this.lights.rim.intensity = L.rimI;
    this.renderer.toneMappingExposure = L.exposure;
    this.scene.fog.density = S.fog.density;
    this.scene.background.set(S.tokens.bg); this.scene.fog.color.set(S.tokens.bg); this.renderer.setClearColor(S.tokens.bg, 1);
    if (this.bloom) { this.bloom.strength = S.glow.bloomStrength; this.bloom.radius = S.glow.bloomRadius; this.bloom.threshold = S.glow.bloomThreshold; }
    this.shared.uBumpK.value = S.material.bump; this.shared.uSssK.value = S.material.sss;
    for (const m of this.mats) m.envMapIntensity = (m.userData.envBase ?? 0.6) * (L.env / 0.5);
    const solid = this.viewMode === 'solid', own = this.ctx.shellMat.userData.own;
    own.uAF.value = solid ? 0.93 : S.membrane.opacityFront; own.uAB.value = solid ? 0.96 : S.membrane.opacityBack;
    this.ctx.hazeMat.opacity = S.membrane.haze; this.shared.uRimK.value = S.membrane.rim;
    if (this.camera.fov !== S.camera.fov) { this.camera.fov = S.camera.fov; this.camera.updateProjectionMatrix(); }
    this.controls.autoRotateSpeed = S.camera.autoRotateSpeed * 3;
    // palette edits: recolour materials whose colours equal the old palette entry
    for (const [k, v] of Object.entries(S.palette)) {
      const old = this._palApplied[k];
      if (old && old.toLowerCase() !== v.toLowerCase()) { this._recolor(old, v); this._palApplied[k] = v; }
    }
    this.flow.applyWeights();
  }
  _recolor(oldHex, newHex) {
    const o = new THREE.Color(oldHex).getHex(), n = new THREE.Color(newHex);
    const swap = (c) => { if (c && c.getHex() === o) c.copy(n); };
    for (const m of this.mats) {
      swap(m.color); swap(m.emissive);
      for (const u of Object.values(m.userData.own)) if (u.value && u.value.isColor) swap(u.value);
    }
  }
  setStyle(path, value) { const keys = path.split('.'); let o = this.style; while (keys.length > 1) o = o[keys.shift()]; o[keys[0]] = value; this.refreshStyle(); }

  // ---------------------------------------------------------------- loop
  _updateLabels() {
    if (!this.ui) return;
    const out = [], w = this.w, h = this.h, v = V3();
    const cy = this.shared.uCutY.value, cz = this.shared.uCutZ.value, on = this.shared.uCutOn.value > 0.5;
    const proj = (p) => { v.copy(p).project(this.camera); if (v.z > 1 || v.z < -1) return null; return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; };
    const item = (id) => this.data.organelles.items.find((x) => x.id === id);
    const add = (key, id, p, extra = {}) => { const it = item(id); if (!it || !p) return; if (on && p.y > cy && p.z > cz) return; const s = proj(p); if (s) out.push({ key, x: s.x, y: s.y - 14, text: it.callout, color: it.color, ...extra }); };
    if (this.hover && this.hoverPoint && this.hover !== this.selected) add('hover', this.hover, this.hoverPoint);
    if (this.selected && this.focusPoint) add('sel', this.selected, this.focusPoint);
    const pid = this.flow.isolated || this.selPathway;
    if (pid) {
      const seen = new Set(); let n = 0;
      for (const [k, l] of Object.entries(this.flow.stepLabels)) {
        const vid = k.split('#')[0]; const vr = this.flow.variants.find((x) => x.id === vid); if (!vr || vr.pathway !== pid || !k.includes('#0:')) continue;
        if (seen.has(l.text) || n > 16) continue; seen.add(l.text);
        if (this.flow.variantWeight(vr).w <= 0.01) continue;
        if (on && l.pos.y > cy && l.pos.z > cz) continue;
        const s = proj(l.pos); if (s) { out.push({ key: k, x: s.x, y: s.y - 10, text: l.text, color: '#7f9bd8', step: true }); n++; }
      }
    }
    // nudge overlapping labels apart vertically
    out.sort((a, b) => a.y - b.y);
    for (let i = 1; i < out.length; i++) for (let j = 0; j < i; j++) { if (Math.abs(out[i].x - out[j].x) < 190 && Math.abs(out[i].y - out[j].y) < 20) out[i].y = out[j].y + 21; }
    this.ui.setLabels(out);
  }

  _loop() {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this._loop);
    if (this.hiddenDoc || this.rebuilding) return;
    const dt = Math.min(0.05, this.clock.getDelta()), now = performance.now();
    const t0 = now;
    this.shared.uTime.value += dt;
    // auto-rotate pauses briefly after user input
    this.controls.autoRotate = this.tools.rotate && now - this.lastInput > 4000;
    this._stepTween(now);
    this.controls.update();
    if (this.pointer.dirty && this.pointer.in && !this.tween) {
      this.pointer.dirty = false; const h = this._pick();
      this.hoverPoint = h ? h.hit.point.clone() : null; this._setHover(h ? h.id : null);
      this.canvas.style.cursor = h ? 'pointer' : 'grab';
    }
    this.flow.update(dt); this.flow.updateGates();
    updateRBC(this.ctx, dt, this.playing);
    this._updateLabels();
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    // adaptive resolution: hold ~60 fps on mid-range GPUs
    this.frames++;
    const ft = performance.now() - t0; this.msAvg = this.msAvg * 0.95 + (dt * 1000) * 0.05;
    if (this.opts.adaptive !== false && this.frames % 45 === 0 && this.frames > 90) {
      if (this.msAvg > 20 && this.dpr > 0.75) { this.dpr = Math.max(0.75, this.dpr - 0.15); this.resize(); }
      else if (this.msAvg < 13.5 && this.dpr < this.dprBase) { this.dpr = Math.min(this.dprBase, this.dpr + 0.1); this.resize(); }
    }
    this.fps = 1000 / Math.max(1, this.msAvg);
  }

  screenshot() {
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    cancelAnimationFrame(this.raf);
    const cv = this.canvas;
    if (cv && this._onMove) cv.removeEventListener('pointermove', this._onMove); cv.removeEventListener('pointerleave', this._onLeave); cv.removeEventListener('pointerdown', this._onDown); cv.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('keydown', this._onKey); document.removeEventListener('visibilitychange', this._vis);
    this._ro?.disconnect();
    this.flow?.dispose();
    this.controls?.dispose();
    if (this.group) { disposeObject(this.group); this.ctx.disposables.forEach((d) => d.dispose()); }
    this.scene?.traverse((o) => { if (o.isLight && o.dispose) o.dispose(); });
    this.envTex?.dispose(); this.composer?.dispose?.(); this.bloom?.dispose?.();
    this.ui?.dispose();
    this.renderer?.dispose(); this.renderer?.forceContextLoss();
    this.root.remove();
    this.listeners = {};
  }
}

/**
 * Mount the hepatocyte into `container`. Returns the instance immediately; `instance.ready` resolves when built.
 * options: { tokens, style, data, quality: 'auto'|'high'|'medium'|'low', ui, fonts, background, viewMode, binucleate,
 *   initialState: { metabolic, pathways: { id: { enabled, isolate } } }, onOrganelleSelect, onPathwayToggle, onMetabolicState, onReady }
 */
export function mount(container, options = {}) {
  return facade(new Hepatocyte(container, options));
}

// Public facade: thin wrapper so internals stay private.
function facade(h) {
  const api = {
    ready: h.ready.then(() => api),
    dispose: () => h.dispose(),
    setPathwayState: (id, st) => h.setPathwayState(id, st),
    setMetabolicState: (s) => h.setMetabolicState(s),
    setBinucleate: (b) => h.setBinucleate(b),
    setCrossSection: (b) => h.setCrossSection(b),
    setViewMode: (m) => h.setViewMode(m),
    setPlaying: (b) => h.setPlaying(b),
    setSpeed: (v) => h.setSpeed(v),
    select: (id) => h.select(id),
    selectPathway: (id) => h.selectPathway(id),
    resetView: () => h.resetView(),
    screenshot: () => h.screenshot(),
    getStyle: () => h.getStyle(), refreshStyle: () => h.refreshStyle(), setStyle: (p, v) => h.setStyle(p, v),
    getPathways: () => h.data.pathways.pathways.map((p) => ({ id: p.id, name: p.name, ...h.pathwayState[p.id] })),
    getOrganelles: () => h.data.organelles.items.map((o) => ({ id: o.id, name: o.name })),
    on: (e, cb) => h.on(e, cb),
    get stats() { return h.stats; }, get fps() { return h.fps; }, get quality() { return h.qualityName; },
    _internal: h,
  };
  return api;
}

