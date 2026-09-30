// Prepares generated site inputs from the repo's single sources of truth. Run before dev/build.
//   1. python3 ../build.py  -> ../dist   -> public/atlas/     (vendor/ and assets, unchanged)
//                                        -> .atlas/index.html (the page; src/pages/atlas/index.astro adds the site logo)
//   2. ../content/A*.md, P*.md -> src/content/docs/{anatomy,physiology}/   (adds Starlight frontmatter)
// Generated paths are git-ignored. Edit ../content and ../src, never the copies.
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');
const repo = resolve(site, '..');

// 1. Atlas
execFileSync('python3', ['build.py'], { cwd: repo, stdio: 'inherit' });
rmSync(resolve(site, 'public/atlas'), { recursive: true, force: true });
cpSync(resolve(repo, 'dist'), resolve(site, 'public/atlas'), { recursive: true, filter: (f) => f !== resolve(repo, 'dist/index.html') });
mkdirSync(resolve(site, '.atlas'), { recursive: true });
cpSync(resolve(repo, 'dist/index.html'), resolve(site, '.atlas/index.html'));

// 2. Learn modules
const groups = { A: 'anatomy', P: 'physiology' };
for (const g of Object.values(groups)) rmSync(resolve(site, 'src/content/docs', g), { recursive: true, force: true });
const src = resolve(repo, 'content');
let n = 0;
for (const f of readdirSync(src).sort()) {
  const m = f.match(/^([AP])(\d\d)-(.+)\.md$/);
  if (!m) continue;
  const dir = resolve(site, 'src/content/docs', groups[m[1]]);
  mkdirSync(dir, { recursive: true });
  let text = readFileSync(resolve(src, f), 'utf8');
  const h1 = text.match(/^# (.+)$/m);
  const raw = h1 ? h1[1] : f;
  const title = raw.replace(/^[AP]\d\d\s*[·:-]\s*/, '');
  text = text.replace(/^# .+\n/m, ''); // Starlight renders the title from frontmatter
  const fm = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify('Module ' + m[1] + m[2])}\nsidebar:\n  label: ${JSON.stringify(m[1] + m[2] + ' · ' + title)}\n  order: ${Number(m[2])}\n---\n\n`;
  writeFileSync(resolve(dir, `${m[1].toLowerCase()}${m[2]}-${m[3]}.md`), fm + text);
  n++;
}
console.log(`prepare: atlas -> public/atlas + .atlas/index.html, ${n} modules -> src/content/docs`);
