// Renders the home-page atlas preview poster (public/img/atlas-preview.webp) from the atlas's own #preview mode,
// so the poster phones see is the same view desktops see live.
//   npm run build && npx http-server dist -p 4400 -s &   then   node scripts/poster.mjs [http://localhost:4400]
// Needs Playwright (npm i -g playwright; or set PLAYWRIGHT_MODULE to its index.mjs) and sharp (an Astro dependency).
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const origin = process.argv[2] || 'http://localhost:4400';
const pw = await import('playwright').catch(() => import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright/index.mjs').href));
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// 2 × the card's 650 × 436 CSS size; the camera frames by aspect, so the view matches the live card
const page = await browser.newPage({ viewport: { width: 1300, height: 872 }, ignoreHTTPSErrors: !!process.env.POSTER_IGNORE_TLS });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${origin}/atlas/#preview`);
// the preview flags readiness to its parent; loaded directly, wait for the scene and the flow to settle instead
await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('gone'), null, { timeout: 240000 });
await page.waitForTimeout(12000);
const png = await page.screenshot({ timeout: 300000 });
await sharp(png).webp({ quality: 82 }).toFile(resolve(here, '../public/img/atlas-preview.webp'));
await browser.close();
if (errors.length) { console.error('console errors:\n' + errors.join('\n')); process.exit(1); }
console.log('poster: public/img/atlas-preview.webp');
