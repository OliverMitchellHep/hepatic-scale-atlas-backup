// Renders UNCERTAINTIES.md from data/uncertainties.json (+ pathway names).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const u = JSON.parse(fs.readFileSync(path.join(root, 'data/uncertainties.json'), 'utf8'));
const pw = JSON.parse(fs.readFileSync(path.join(root, 'data/pathways.json'), 'utf8'));
let md = '# Flagged uncertainties\n\nGenerated from `data/uncertainties.json` (`npm run docs`). Where the literature is unsettled or the model simplifies, it is flagged here rather than invented. Also shown in each pathway\'s side panel.\n\n## Model-wide\n\n';
for (const x of u.model) md += `- ${x}\n`;
for (const p of pw.pathways) { if (!u[p.id]) continue; md += `\n## ${p.name} (\`${p.id}\`)\n\n`; for (const x of u[p.id]) md += `- ${x}\n`; }
fs.writeFileSync(path.join(root, 'UNCERTAINTIES.md'), md);
console.log('wrote UNCERTAINTIES.md');
