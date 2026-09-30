// Headless screenshot + console check. Usage: node tools/shots.mjs [outDir] [--url=http://localhost:5188] [--wait=ms]
// Starts its own Vite dev server unless --url is given. Uses SwiftShader (software GL) so fps figures are NOT representative.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const out = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(root, 'shots'));
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
fs.mkdirSync(out, { recursive: true });

let server = null, url = opt.url;
if (!url) { server = await createServer({ root, server: { port: 5199, host: '127.0.0.1' }, logLevel: 'error' }); await server.listen(); url = 'http://127.0.0.1:5199'; }
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: +(opt.w || 1600), height: +(opt.h || 900) } });
const logs = [];
page.on('console', (m) => { const t = m.text(); if (!t.includes('[vite]')) logs.push(`[${m.type()}] ${t}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`${url}/?quality=${opt.quality || 'high'}&shot=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.hep && window.hep.stats, null, { timeout: 180000 });
await page.waitForTimeout(+(opt.wait || 2500));
const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('shot', name); };
const ev = (fn, arg) => page.evaluate(fn, arg);
if (opt.eval) { const r = await ev(new Function('return (async()=>{' + opt.eval + '})()')); console.log('eval ->', JSON.stringify(r)); await page.waitForTimeout(1200); }
await shot(opt.name || '01-default');
if (!opt.only) {
  await ev(() => { window.hep.setPathwayState('glucose', { isolate: true }); });
  await page.waitForTimeout(1500); await shot('02-isolate-glucose');
  await ev(() => { window.hep.setPathwayState('glucose', { isolate: false }); window.hep.setMetabolicState(1); });
  await page.waitForTimeout(1500); await shot('03-fasted');
  await ev(() => { window.hep.setMetabolicState(0); window.hep.select('mitochondrion'); });
  await page.waitForTimeout(2500); await shot('04-select-mito');
  await ev(() => { window.hep.select(null); window.hep.resetView(); });
}
const stats = await ev(() => ({ stats: window.hep.stats, fps: window.hep.fps, quality: window.hep.quality }));
console.log(JSON.stringify(stats));
console.log(logs.filter((l) => !l.includes('GPU stall') && !l.includes('GL Driver Message')).slice(0, 40).join('\n'));
await browser.close(); if (server) await server.close();
