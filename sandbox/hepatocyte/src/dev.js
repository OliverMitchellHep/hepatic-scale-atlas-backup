// Dev harness: mounts the module and adds the lil-gui tweak panel. Not part of the integration contract.
import GUI from 'lil-gui';
import { mount } from './index.js';

const params = new URLSearchParams(location.search);
const hep = mount(document.getElementById('app'), {
  quality: params.get('quality') || 'auto',
  binucleate: params.get('bin') === '1',
  preserveDrawingBuffer: params.has('shot'),
  onOrganelleSelect: (o) => console.debug('[hepatocyte] select', o),
  onPathwayToggle: (p) => console.debug('[hepatocyte] pathway', p),
});
window.hep = hep;

hep.ready.then((api) => {
  const S = api.getStyle();
  const gui = new GUI({ title: 'Hepatocyte tweaks', width: 300 }); gui.close();
  window.gui = gui;
  const on = () => api.refreshStyle();
  const col = (f, o, k, n) => f.addColor(o, k).name(n || k).onChange(on);
  const f1 = gui.addFolder('Flow');
  f1.add(S.flow, 'speed', 0, 3, 0.01).onChange(on); f1.add(S.flow, 'size', 0.3, 3, 0.01).name('particle size').onChange(on);
  f1.add(S.flow, 'density', 0, 1, 0.01).name('particle density').onChange(on); f1.add(S.flow, 'jitter', 0, 3, 0.01).onChange(on); f1.add(S.flow, 'opacity', 0, 1.5, 0.01).onChange(on);
  const f2 = gui.addFolder('Glow');
  f2.add(S.glow, 'bloomStrength', 0, 2, 0.01).onChange(on); f2.add(S.glow, 'bloomRadius', 0, 1.5, 0.01).onChange(on); f2.add(S.glow, 'bloomThreshold', 0, 1.5, 0.01).onChange(on);
  f2.add(S.glow, 'particleGlow', 0, 3, 0.01).onChange(on); f2.add(S.glow, 'gateGlow', 0, 3, 0.01).onChange(on);
  const f3 = gui.addFolder('Membrane & material');
  f3.add(S.membrane, 'opacityFront', 0, 1, 0.01).onChange(on); f3.add(S.membrane, 'opacityBack', 0, 1, 0.01).onChange(on);
  f3.add(S.membrane, 'rim', 0, 3, 0.01).onChange(on); f3.add(S.membrane, 'haze', 0, 0.5, 0.005).onChange(on);
  f3.add(S.material, 'bump', 0, 3, 0.01).onChange(on); f3.add(S.material, 'sss', 0, 3, 0.01).name('sub-surface').onChange(on);
  const f4 = gui.addFolder('Lighting'); const L = S.lights;
  col(f4, L, 'key', 'key colour'); f4.add(L, 'keyI', 0, 6, 0.05).name('key intensity').onChange(on);
  col(f4, L, 'fill', 'fill colour'); f4.add(L, 'fillI', 0, 4, 0.05).name('fill intensity').onChange(on);
  col(f4, L, 'rim', 'rim colour'); f4.add(L, 'rimI', 0, 4, 0.05).name('rim intensity').onChange(on);
  col(f4, L, 'hemiSky'); col(f4, L, 'hemiGround'); f4.add(L, 'hemi', 0, 2, 0.01).onChange(on);
  f4.add(L, 'env', 0, 2, 0.01).name('environment').onChange(on); f4.add(L, 'exposure', 0.3, 2.5, 0.01).onChange(on); f4.add(S.fog, 'density', 0, 0.06, 0.001).name('fog').onChange(on);
  const f5 = gui.addFolder('Camera'); f5.add(S.camera, 'fov', 20, 70, 1).onChange(on); f5.add(S.camera, 'autoRotateSpeed', 0, 3, 0.05).onChange(on);
  f5.add({ reset: () => api.resetView() }, 'reset').name('reset view');
  const f6 = gui.addFolder('Colours'); f6.close();
  for (const k of Object.keys(S.palette)) col(f6, S.palette, k);
  const f7 = gui.addFolder('Section'); const h = api._internal;
  h.cutOffset = { y: 0, z: 0 };
  f7.add(h.cutOffset, 'y', -3, 3, 0.02).name('cut height').onChange(() => h.applyCut()); f7.add(h.cutOffset, 'z', -3, 3, 0.02).name('cut depth').onChange(() => h.applyCut());
  const f8 = gui.addFolder('Debug'); f8.close();
  const stat = { fps: 0, particles: api.stats.particles, routes: api.stats.routes, quality: api.quality };
  f8.add(stat, 'fps').listen().disable(); f8.add(stat, 'particles').disable(); f8.add(stat, 'routes').disable(); f8.add(stat, 'quality').disable();
  setInterval(() => { stat.fps = Math.round(api.fps || 0); }, 500);
});
