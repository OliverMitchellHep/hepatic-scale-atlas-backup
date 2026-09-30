# Hepatocyte lab

Standalone, animated 3-D hepatocyte for **Rex Hepatis**. Developed in isolation from the atlas (nothing here imports atlas source)
so it can be tuned on its own and lifted in later at the atlas's hepatocyte zoom level.

- Branch: `hepatocyte-lab` (off `main`). Nothing outside `sandbox/hepatocyte/` was touched.
- Illustrative teaching model; **not for clinical decisions**. Organelle sizes are exaggerated and counts reduced for legibility.

## Run it

```bash
cd sandbox/hepatocyte
npm install
npm run dev:hepatocyte        # http://localhost:5188  (also reachable on the LAN)
```

From the repo root without `cd`: `npm --prefix sandbox/hepatocyte install && npm --prefix sandbox/hepatocyte run dev:hepatocyte`.

Other scripts: `npm run build:hepatocyte` (static build to `dist/`), `npm run check` (headless route/API/dispose checks),
`npm run shots` (headless screenshots to `shots/`), `npm run docs` (regenerate `UNCERTAINTIES.md`).
URL flags for the harness: `?quality=high|medium|low`, `?bin=1` (binucleate).

**Tooling matches the atlas:** three.js **r160** ES modules (`three@0.160.0`, the same version the atlas vendors), addons imported as
`three/addons/...`, no framework. Vite is used only as the dev server/bundler; the module itself is plain ESM and works under an
import map exactly like `src/page.html` does (see "Lifting into the atlas").

## What is in the scene

Everything is procedural (no textures, no model files) and seeded, so the cell is identical on every load.

| Domain / structure | How it is drawn |
|---|---|
| Polyhedral cell | Smooth-max of 26 bounding planes (rounded polyhedron), ≈20 µm across (1 unit = 2 µm). Translucent, domain-tinted shell (fresnel rim) + cytosol haze. |
| Sinusoidal (basolateral) face, −x | ≈320 swaying microvilli into the space of Disse; fenestrated **LSEC** (sieve plates, holes cut in-shader from a plate-mask texture); **sinusoid lumen** with drifting erythrocytes. Blood flows −y. |
| Canalicular (apical) face, +x | Groove containing the **bile canaliculus** (translucent lumen, short microvilli from both cells), flanked by three **tight-junction strand** loops. Bile flows +y (toward the portal end, counter-current to blood). |
| Lateral faces | **Gap junctions** (connexon plaques) and **desmosomes** (paired plaques with keratin fans). |
| Organelles | Nucleus (envelope, pores, heterochromatin, nucleolus; **binucleate toggle**), rough ER (fenestrated stacks + perinuclear layers, ≈16 k ribosomes), smooth ER (tubular network), Golgi (3 stacks + vesicles, pericanalicular), mitochondria (outer membrane, matrix, lamellar **cristae**), peroxisomes (dense core), lysosomes (pericanalicular), endosomes, lipid droplets, glycogen rosettes, microtubules / cortical actin / pericanalicular actin belt. |
| Section | "Cross-section" cuts away the front-top wedge (as in the reference renders); cut faces are capped (cytosol mesh texture, nucleus/nucleolus caps). |

### Proportions and sources (also in code comments and `data/organelles.json`)

Volume fractions of a hepatocyte (Alberts *Molecular Biology of the Cell*, 6th ed., relative volumes of intracellular compartments in a
hepatocyte; Blouin, Bolender & Weibel, *J Cell Biol* 1977;72:441): cytosol ≈54 %, mitochondria ≈22 % (≈1,000–2,000 per cell), RER ≈9 %,
SER + Golgi ≈6 %, nucleus ≈6 %, peroxisomes ≈1 %, lysosomes ≈1 %. Surface fractions (Blouin 1977): sinusoidal ≈37 %, lateral ≈50 %,
canalicular ≈13 %. Fenestrae ≈100–200 nm in sieve plates (Wisse et al., *Hepatology* 1985;5:683). Binucleate/polyploid hepatocytes:
Gentric & Desdouets, *Am J Pathol* 2014;184:322.

The model **shows**: mitochondria 106 (×~10 fewer than real, ~1.5× larger), ER extensive (7 RER units + a 150-node SER network),
Golgi ×3, peroxisomes ×34, lysosomes ×26, lipid droplets ×9, glycogen fields ×8–14. Exact numbers per build: `hep.stats`.
Verify table/page numbers against the edition the atlas cites (see `UNCERTAINTIES.md`).

## Live function: continuous flow

One instanced draw call, shader-driven along splines: routes are baked from `data/pathways.json` into a float texture
(xyz + molecule class + reaction pulse); the vertex shader positions each particle from time, so per-frame CPU cost is only a few
uniform updates. Particle colour **and shape** are by molecule class (legend bottom-right; also `data/molecules.json`), changing at the
enzyme step where the molecule changes (e.g. glucose → G6P → glycogen). Transporter **gates** (rings on the membrane) glow with the
current flux.

| # | Pathway (`id`) | Routes (fed ↔ fasted weight) |
|---|---|---|
| 1 | Glucose (`glucose`) | GLUT2 → glycogenesis (1 ↔ 0); → glycolysis (0.6 ↔ 0); glycogenolysis → G6Pase (ER) → GLUT2 out (0 ↔ 0.75); lactate → gluconeogenesis → G6Pase → GLUT2 out (0 ↔ 1) |
| 2 | Fatty acids (`fatty_acids`) | CD36/FATP → β-oxidation → acetyl-CoA → TCA/OXPHOS → ATP (0.15 ↔ 1); → ketogenesis → export (0 ↔ 0.8); → TG → VLDL (ER → Golgi → sinusoidal exocytosis) (0.85 ↔ 0.35); → lipid droplet |
| 3 | Protein (`protein_synthesis`) | amino acids → RER → Golgi → exocytosis to Disse (albumin, clotting factors) |
| 4 | Urea cycle (`urea_cycle`) | NH₃ → mitochondrion (CPS1, OTC) → ORNT1 → cytosol (ASS1, ASL, ARG1) → urea out; ornithine returns |
| 5 | Bilirubin (`bilirubin`) | OATP1B1/1B3 → SER UGT1A1 → MRP2 → canaliculus; minor MRP3 back-flux |
| 6 | Bile acids (`bile_acids`) | NTCP → BSEP → canaliculus; de novo CYP7A1 → peroxisome/conjugation → BSEP |
| 7 | Xenobiotics (`xenobiotics`) | uptake → SER CYP450 (phase I) → phase II → MRP2/P-gp/BCRP (bile) or MRP3/4 (blood) |
| 8 | Cholesterol & remnants (`cholesterol`) | LDLR/LRP1 → endosome → lysosome (LAL, NPC1/2) → ER pool → ABCG5/G8 (bile) / ester storage |

Each pathway carries `id, substrates, transportersEnzymes, compartmentRoute, direction, citations` (plus `clinical`, per-variant flux
and a node list). A **node** is `{ at, mol, label }`: an anchor (`sinusoid`, `gate:<id>`, `mito:matrix`, `ser`, `golgi`,
`canaliculus`, …), the molecule class leaving that node and the transporter/enzyme acting there. Crossings between the sinusoid and the
membrane are automatically routed through an LSEC fenestra and the space of Disse. `npm run check` verifies that every route starts and
ends where its data says (uptake through the LSEC, export into the canaliculus and up the bile flow direction, class sequence).

**Controls:** per-pathway toggle and **solo/isolate** (dims all other pathways *and* organelles not involved, shows the transporter/enzyme
step labels); **fed ↔ fasted** slider (insulin/glucagon bars; changes flux weights, shrinks glycogen rosettes, swells lipid droplets slightly);
play/pause, speed, particle density; click an organelle or pathway for the side panel (function, key enzymes/transporters, clinical
relevance in liver disease, size/proportion, route, flux, flagged uncertainties, sources). Toolbar: Rotate, Isolate, Hide Others, Reset
View, Screenshot. View mode: Solid / Layers (cut-away) / Focus. Esc clears the selection.

**Flow directions are biological, not decorative** — where the literature is unsettled the model flags it rather than inventing:
see [`UNCERTAINTIES.md`](UNCERTAINTIES.md) (generated from `data/uncertainties.json`, also shown in each pathway panel).

## Tweaking (`lil-gui`, top-left tab "Hepatocyte tweaks")

Flow (speed, size, density, jitter, opacity) · Glow (bloom, particle/gate glow) · Membrane & material (opacities, rim, bump, sub-surface) ·
Lighting (colours, intensities, environment, exposure, fog) · Camera · every palette colour · section height/depth · debug (fps, counts).
All defaults are in `data/style.json` and follow `STYLE_SPEC.md`. Palette edits recolour materials live (no rebuild).

## Data (all content is JSON, separate from rendering)

`data/organelles.json` (names, callouts, counts, sizes, function, enzymes, clinical, citations) · `data/pathways.json` ·
`data/molecules.json` (classes/families/colours/shapes) · `data/states.json` (fed↔fasted) · `data/labels.json` (UI strings) ·
`data/citations.json` · `data/uncertainties.json` · `data/style.json`. The atlas can pass its own copies through `mount(..., { data })`.

## Integration contract (built now, integrate later)

```js
import { mount } from './src/index.js';

const hep = mount(containerEl, {
  tokens: { bg: '#000', panel: 'rgba(10,20,44,.86)', panelBorder: '#1f3160', text: '#e9eefc', textDim: '#a9b6d8', accent: '#e58aa0' }, // atlas colour tokens
  style:  { palette: { nucleus: '#8a55d6' } },   // any data/style.json key
  data:   { /* optional overrides of the bundled JSON */ },
  quality: 'auto',                               // 'high' | 'medium' | 'low'; auto picks low on phones
  ui: true, fonts: true,                         // ui:false = canvas only (atlas draws its own controls)
  onOrganelleSelect: (o) => {}, onPathwayToggle: (p) => {}, onMetabolicState: (s) => {},
});
await hep.ready;
hep.setPathwayState('bilirubin', { enabled: true, isolate: false });
hep.setMetabolicState(0.7);                      // 0 fed … 1 fasted
hep.on('organelleSelect', (e) => {});            // returns an unsubscribe fn
hep.dispose();                                   // frees all GPU resources, DOM, listeners, RAF
```

Also: `setBinucleate`, `setCrossSection`, `setViewMode`, `setPlaying`, `setSpeed`, `select(id)`, `selectPathway(id)`, `resetView`,
`screenshot()`, `getStyle/refreshStyle/setStyle`, `getPathways()`, `getOrganelles()`, `stats`, `fps`. No global state is used; two
instances can coexist; `dispose()` is checked by `npm run check` (0 GPU geometries left).

### Intended hook (not implemented)

At the atlas's `cell` scale (the "Hepatocyte" tier, ×12 000), the atlas hides its own hepatocyte group, mounts this module into an overlay
container above (or in place of) the atlas canvas with the atlas tokens, and hands off the camera intent (zoom in → mount, zoom out past
the tier threshold → `dispose()`). The atlas's scale-title/callout system stays in charge of navigation; this module's UI is disabled
(`ui:false`) or re-skinned via tokens. At integration: (1) register the organelle ids from `organelles.json` in `data/registry.json`
(ids are permanent), (2) `three@0.160.0` is already vendored, but the atlas `vendor/addons` lacks `postprocessing/UnrealBloomPass.js` and
`shaders/LuminosityHighPassShader.js` (unmodified copies needed, or run with `quality: 'low'`/no bloom), (3) map the JSON imports in
`src/defaults.js` to fetches (no bundler in the atlas), (4) reconcile the cell-size wording (14 µm vs ≈20 µm; see UNCERTAINTIES).

## Performance and quality

Target: 60 fps on a mid-range discrete GPU; long first load is acceptable (≈40 programs compile). Per frame (high): ≈60 draw calls,
≈1.6 M triangles (incl. post), ≈3 k particles in one instanced draw. Adaptive resolution (0.75×–DPR) protects the frame rate.
`low` (auto on phones): no post-processing/MSAA, ≈¼ particles, half the mitochondria, DPR ≤ 1.25; the phone UI collapses to two buttons.
**Headless SwiftShader numbers are not representative** (software GL); frame-rate must be judged on a real GPU.

## Known limitations

- Section caps are analytic (cytosol cut faces, nucleus/nucleolus discs). Other solids are open shells that read as hollow when sliced.
- Translucent instanced layers (mitochondrial membranes, droplets) sort per mesh, not per instance (small popping possible).
- Schematic polarity: canaliculus opposite the sinusoidal pole (in vivo it lies on lateral faces); one generic hepatocyte, no zonation.
- Particles are additive glows, hidden by opaque organelles but not shadowed; no ambient-occlusion pass (bump + haze + fog give depth).
- Web fonts (Cormorant, Caveat, Inter) load from Google Fonts when reachable, otherwise the fallbacks in `STYLE_SPEC.md` apply.
- No 3D-export button (present in the references; out of scope).

## Layout

```
STYLE_SPEC.md   style spec written before code        UNCERTAINTIES.md  flagged unknowns (generated)
reference/      the five reference renders             data/             all content JSON
src/index.js    public API + orchestration             src/flow.js       routes + GPU particles
src/materials.js  patched physical materials           src/cellShape.js  SDF cell, domains, samplers
src/layout.js   seeded organelle placement             src/ui.js         DOM UI (navy panels)
src/build/*     organelles, ER/Golgi, surface, LSEC, cytoskeleton, caps       src/dev.js  harness + lil-gui
tools/          check.mjs, shots.mjs, probe.mjs, gen-docs.mjs
```
