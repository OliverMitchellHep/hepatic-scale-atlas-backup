// Multi-step probe: node tools/probe.mjs outDir steps.json  (steps: [{name, code}], code runs in page with `h` = internal instance)
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2]); const steps = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root, server: { port: 5198, host: '127.0.0.1' }, logLevel: 'error' }); await server.listen();
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = []; page.on('console', (m) => logs.push(m.text())); page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
await page.goto('http://127.0.0.1:5198/?quality=' + (process.env.Q || 'high') + '&shot=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.hep && window.hep.stats, null, { timeout: 180000 });
await page.waitForTimeout(2000);
for (const s of steps) {
  const r = await page.evaluate(new Function('h', 'return (async()=>{' + (s.code || '') + '})()').toString().replace(/^function anonymous\(h\n\) \{/, '(h) => {').replace(/^\(h\) => \{/, '(h) => {') && `(async()=>{const h=window.hep._internal; ${s.code||''}})()`);
  if (r !== undefined) console.log(s.name, '->', JSON.stringify(r));
  await page.waitForTimeout(s.wait || 900);
  if (s.name) { await page.screenshot({ path: path.join(out, s.name + '.png'), clip: s.clip, timeout: 180000 }); console.log('shot', s.name); }
}
console.log(logs.filter((l) => /error|warn|fail/i.test(l) && !/GPU stall|CERT|404/.test(l)).slice(0, 20).join('\n'));
await browser.close(); await server.close();
