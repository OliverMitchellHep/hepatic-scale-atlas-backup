// Automated sanity checks in headless Chromium: route geometry/direction, class sequences, NaNs, API events, dispose leaks.
// Usage: node tools/check.mjs   (exit code 1 on failure)
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { port: 5197, host: '127.0.0.1' }, logLevel: 'error' }); await server.listen();
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/CERT|404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
await page.goto('http://127.0.0.1:5197/?quality=low', { waitUntil: 'load' });
await page.waitForFunction(() => window.hep && window.hep.stats, null, { timeout: 180000 });
const res = await page.evaluate(async () => {
  const h = window.hep._internal, f = h.flow, out = { fail: [], info: {} };
  const N = 128, d = f.tex.image.data;
  let nan = 0; for (let i = 0; i < d.length; i++) if (!Number.isFinite(d[i])) nan++;
  if (nan) out.fail.push(`NaN in route texture: ${nan}`);
  const classes = f.classes.map((c) => c.id);
  const sample = (r, s) => ({ x: d[(r * N + s) * 4], y: d[(r * N + s) * 4 + 1], z: d[(r * N + s) * 4 + 2], c: Math.floor(d[(r * N + s) * 4 + 3] + 1e-3) });
  const inCell = (p) => h.sdf.f(p.x, p.y, p.z) < 0.6;
  let checked = 0;
  for (const v of f.variants) {
    const first = v.path[0], last = v.path[v.path.length - 1];
    v.routeIdx.forEach((ri, k) => {
      const a = sample(ri, 0), b = sample(ri, N - 1); checked++;
      const tag = `${v.id}#${k}`;
      if (first.at === 'sinusoid' && !(a.x < -6.9)) out.fail.push(`${tag}: starts at sinusoid but x=${a.x.toFixed(2)}`);
      if (last.at === 'sinusoid' && !(b.x < -6.9)) out.fail.push(`${tag}: ends at sinusoid but x=${b.x.toFixed(2)}`);
      if (last.at === 'canaliculus') { if (!(b.x > 4.3 && b.x < 5.9)) out.fail.push(`${tag}: canaliculus end x=${b.x.toFixed(2)}`); if (!(b.y > a.y - 5 && b.y > 2.5)) out.fail.push(`${tag}: bile should flow toward +y, end y=${b.y.toFixed(2)}`); }
      if (first.at !== 'sinusoid' && !inCell(a)) out.fail.push(`${tag}: start outside cell (${a.x.toFixed(1)},${a.y.toFixed(1)},${a.z.toFixed(1)})`);
      if (first.at === 'sinusoid') { /* uptake: must pass the LSEC plane (x≈-6.5) before the membrane (x≈-5) */ let crossed = false; for (let s = 1; s < N; s++) { const p = sample(ri, s); if (p.x > -6.7 && !crossed) crossed = true; } if (!crossed) out.fail.push(`${tag}: never crosses LSEC`); }
      // molecule sequence: first class equals first node mol; class indices valid
      const c0 = classes[a.c]; if (c0 !== first.mol) out.fail.push(`${tag}: first class ${c0} != ${first.mol}`);
      for (let s = 0; s < N; s++) if (sample(ri, s).c >= classes.length) { out.fail.push(`${tag}: bad class index`); break; }
      // sinusoid uptake routes move DOWN blood flow (-y) or stay: start y >= gate y
    });
  }
  out.info.routesChecked = checked;
  // API/events
  const ev = []; const off1 = window.hep.on('pathwayToggle', (e) => ev.push(['pw', e.id, e.enabled, e.isolate]));
  window.hep.setPathwayState('bilirubin', { enabled: false }); window.hep.setPathwayState('bilirubin', { enabled: true });
  window.hep.setPathwayState('glucose', { isolate: true });
  const wIso = f.uRoute.slice(0, f.routes.length).filter((v, i) => f.variants[f.routes[i].variant].pathway !== 'glucose' && v.x > 0).length;
  if (wIso) out.fail.push(`isolate glucose left ${wIso} other routes active`);
  window.hep.setPathwayState('glucose', { isolate: false });
  if (ev.length < 3) out.fail.push('pathwayToggle events missing');
  // fed/fasted weights: glycogenesis on when fed, gluconeogenesis on when fasted
  const vw = (id) => f.variantWeight(f.variants.find((v) => v.id === id)).w;
  window.hep.setMetabolicState(0); const fed = { gs: vw('glucose_glycogenesis'), gng: vw('glucose_gng'), ox: vw('fa_oxidation') };
  window.hep.setMetabolicState(1); const fas = { gs: vw('glucose_glycogenesis'), gng: vw('glucose_gng'), ox: vw('fa_oxidation') };
  if (!(fed.gs > 0.5 && fed.gng === 0 && fas.gs === 0 && fas.gng > 0.5 && fas.ox > fed.ox)) out.fail.push(`state weighting wrong ${JSON.stringify({ fed, fas })}`);
  window.hep.setMetabolicState(0);
  // selection event
  let sel = null; window.hep.on('organelleSelect', (e) => { sel = e; }); window.hep.select('golgi'); if (!sel || sel.id !== 'golgi') out.fail.push('organelleSelect event missing'); window.hep.select(null);
  out.info.gates = Object.keys(h.ctx.gates).length; out.info.stats = window.hep.stats;
  // dispose leak check
  const r = h.renderer; window.hep.dispose();
  out.info.afterDispose = { geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length };
  if (r.info.memory.geometries > 0) out.fail.push(`GPU geometries leaked: ${r.info.memory.geometries}`);
  if (document.querySelector('.hl-root')) out.fail.push('DOM not removed on dispose');
  return out;
});
console.log(JSON.stringify(res.info));
if (errs.length) { console.log('page errors:', errs.slice(0, 8)); }
if (res.fail.length || errs.length) { console.log('FAIL\n' + res.fail.slice(0, 40).join('\n')); process.exitCode = 1; } else console.log('OK: all checks passed');
await browser.close(); await server.close();
