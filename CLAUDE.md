# Rex Hepatis (formerly Hepatic Scale Atlas) — working notes for Claude

Interactive 3D teaching model of the liver and hepatobiliary system, organ → hepatocyte, for MRCP-to-consultant audiences (owner: Oli, gastroenterology/hepatology registrar). Illustrative, not for clinical decisions. Guideline sources: EASL, BSG, UEG, NICE, NHS/NHSBT, Baveno, ESGE.

Full design spec (frame, tiers, rendering, pathology engine, open items): project doc `claude/hepatic-scale-atlas-current-spec.md` in the claude.ai project "Work / teaching". Version history before v43: the `vNN-changes.md` project docs.

## Layout
```
src/page.html      markup; @@INCLUDE:path@@ markers pull in the files below
src/atlas.css      styles
src/atlas.js       the application (three.js r160 module); INFO is generated from the registry at @@REGISTRY@@
src/boot.js        boot watchdog (runs before the engine loads)
data/liver-data.json  CT liver mesh, SDF and landmark data (inlined into the page)
data/registry.json    one entry per named structure: permanent id, name (= mesh pick label), callout text, citations, tier, layer
assets/            files served beside the page (textures, lazy-loaded context meshes)
vendor/            three.js + addons, unmodified
pipeline/          offline asset scripts (Blender bakes etc.) — see pipeline/README.md
tests/             headless harness, baseline screenshots
build.py           assembles dist/ (the publishable site)
validate.py        build + all checks; writes tests/out/report.md
```

## Every change
1. Edit `src/`, `data/` or `assets/` directly. Never patch the built page.
2. `python3 validate.py` (full run ≈ 10 min, SwiftShader; run it in the background and poll). `--static` for a quick check.
   - An intended visual change fails `screenshots`: look at `tests/out/*.png`, then `python3 validate.py --rebaseline`.
   - New clickable structures need a registry entry or `coverage` fails. `--census` refreshes tier/layer fields.
3. Commit with a one-line summary; bump the version in `src/page.html` `<title>` and add a line to `CHANGELOG.md` per release; tag `vNN`.
4. Publish `dist/index.html` as a new artifact "Rex Hepatis vNN" (v50 and earlier: "Hepatic Scale Atlas vNN"), passing every other file in `dist/` via `files` (vendor/ and assets keep their relative paths).

## Rules
- Registry ids are permanent (teaching pages and deep links use them). Rename the `name`, never the `id`; to retire an entry, keep the id with `"retired": true`.
- Model frame: +x patient left, +y superior, +z anterior; 1 unit ≈ 7 cm. New CT-anchored points are CT-frame `V3()` literals.
- CT source data (s1267 masks) stay out of this repository until the dataset licence for public release is confirmed; keep the repo private until then.
- The artifact host refuses `.ktx2`; textures are WebP/PNG.
- Desktop is the primary target; phones must still work (`body.mob` layout).
- Oli reviews each version himself. Fix clear, obvious errors without asking; spend effort on construction, not long review rounds.
- Flag guideline currency: `validate.py` warns on citations the spec marks superseded (update `SUPERSEDED` when the spec changes).
