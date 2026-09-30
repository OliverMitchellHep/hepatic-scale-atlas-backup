// Automated sanity checks in headless Chromium: route geometry/direction, class sequence, NaNs, RBC spacing, API events, dispose leaks.
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
  const h = window.hep._internal, f = h.flow, out = { fail: [], info: {} }, N = 128, d = f.tex.image.data;
  let nan = 0; for (let i = 0; i < d.length; i++) if (!Number.isFinite(d[i])) nan++; if (nan) out.fail.push(`NaN in route texture: ${nan}`);
  const cls = f.classes.map((c) => c.id), S = (r, s) => ({ x: d[(r * N + s) * 4], y: d[(r * N + s) * 4 + 1], z: d[(r * N + s) * 4 + 2], c: Math.floor(d[(r * N + s) * 4 + 3] + 1e-3) });
  f.routes.forEach((_, r) => {
    const a = S(r, 0), b = S(r, N - 1), tag = `route ${r}`;
    if (!(a.x < -7.0)) out.fail.push(`${tag}: should start in the sinusoid (x=${a.x.toFixed(2)})`);
    if (!(b.x > 4.3 && b.x < 5.6 && b.z > 3.0)) out.fail.push(`${tag}: should end in the canaliculus, flowing +z (x=${b.x.toFixed(2)}, z=${b.z.toFixed(2)})`);
    // order of stages along the route: sinusoid → LSEC (x≈-6.9) → tips (x<-5) → ER (x<-2.5, processed) → Golgi (x>1.5, packaged) → canaliculus (bile)
    const seq = []; let last = -1; for (let s = 0; s < N; s++) { const c = S(r, s).c; if (c !== last) { seq.push(cls[c]); last = c; } }
    if (seq.join('>') !== 'absorbed>processed>packaged>bile') out.fail.push(`${tag}: stage order ${seq.join('>')}`);
    let crossed = false; for (let s = 0; s < N; s++) { const p = S(r, s); if (Math.abs(p.x + 6.9) < 0.35) crossed = true; } if (!crossed) out.fail.push(`${tag}: never crosses the LSEC plane`);
    let min = 1e9; for (let s = 0; s < N; s++) { const p = S(r, s); if (p.y < -1.6 || p.y > 0.6) out.fail.push(`${tag}: leaves the cell/vessel height (y=${p.y.toFixed(2)})`); if (!h.ctx.inCell(p.x, p.z, -0.6) && p.x > -4.9 && p.x < 4.3) { min = Math.min(min, 0); out.fail.push(`${tag}: inside-cell point outside outline (${p.x.toFixed(1)},${p.z.toFixed(1)})`); break; } }
  });
  out.info.routes = f.routes.length;
  // RBCs never overlap: neighbouring discs stay further apart than one diameter for a full lap
  const r = h.ctx.rbc; let mind = 1e9;
  for (let t = 0; t < r.span; t += 0.05) { r.t = t; const zs = []; for (let i = 0; i < r.n; i++) { let z = 4.7 + 0.6 - ((t + (i * r.span) / r.n) % r.span); zs.push(z); } zs.sort((a, b) => a - b); for (let i = 1; i < zs.length; i++) mind = Math.min(mind, zs[i] - zs[i - 1]); const wrap = zs[0] + r.span - zs[zs.length - 1]; mind = Math.min(mind, wrap); }
  out.info.rbcMinGap = +mind.toFixed(2); if (!(mind > r.dia * 1.05)) out.fail.push(`RBCs closer than a diameter (${mind.toFixed(2)} < ${r.dia})`);
  // API / events
  const ev = []; window.hep.on('pathwayToggle', (e) => ev.push(e)); window.hep.setPathwayState('bile_formation', { enabled: false }); window.hep.setPathwayState('bile_formation', { enabled: true });
  if (ev.length < 2) out.fail.push('pathwayToggle events missing'); let sel = null; window.hep.on('organelleSelect', (e) => { sel = e; }); window.hep.select('golgi'); if (!sel || sel.id !== 'golgi') out.fail.push('organelleSelect event missing'); window.hep.select(null);
  window.hep.setCrossSection(false); if (!h.ctx.lid.visible) out.fail.push('lid not shown when section is off'); window.hep.setCrossSection(true);
  out.info.stats = window.hep.stats;
  const rr = h.renderer; window.hep.dispose(); out.info.afterDispose = { geometries: rr.info.memory.geometries };
  if (rr.info.memory.geometries > 0) out.fail.push(`GPU geometries leaked: ${rr.info.memory.geometries}`); if (document.querySelector('.hl-root')) out.fail.push('DOM not removed on dispose');
  return out;
});
console.log(JSON.stringify(res.info)); if (errs.length) console.log('page errors:', errs.slice(0, 8));
if (res.fail.length || errs.length) { console.log('FAIL\n' + res.fail.slice(0, 40).join('\n')); process.exitCode = 1; } else console.log('OK: all checks passed');
await browser.close(); await server.close();
