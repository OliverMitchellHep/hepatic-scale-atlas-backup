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

## What is in the scene (revision 2: simplified)

An opaque, clay-style slab hepatocyte with the top cut away (as in the reference renders), viewed from above at ~40°.

- **Sinusoidal face (left):** chunky microvilli into the **space of Disse**, a fenestrated endothelium (sieve plates), and a sinusoid with a single lane of red cells (equal speed, even spacing, so they cannot overlap; blood flows toward −z).
- **Canalicular face (right):** a trough-shaped **bile canaliculus** with short microvilli and tight-junction ropes; bile flows toward +z, counter to blood.
- **Organelles (few, well defined):** nucleus dome with a cut quadrant and nucleolus (binucleate toggle), rough-ER rings with ribosomes, smooth-ER tubes, Golgi, 5 opened mitochondria with cristae, lysosomes, peroxisomes, lipid droplets, glycogen, filament ropes.
- **One flow, four stages** (gold → cyan → pink → green): **1** microvilli take up contents from the space of Disse, **2** processed in the endoplasmic reticulum, **3** packaged/handled by the Golgi, **4** secreted into the bile canaliculus. The numbered card on the left is also the legend; the same numbers are labelled in the scene.
- **Controls:** cross-section on/off (off = opaque lid), binucleate, play/pause, speed; click or hover an organelle for the side panel (function, enzymes, clinical relevance, sources); Rotate / Isolate / Hide Others / Reset View / Screenshot.

The earlier eight-pathway, fed/fasted version is in git history (commit `e6f8a86`). `setMetabolicState()` and `setPathwayState()` remain in the API for the integration contract, but the simplified build has one pathway (`bile_formation`) and the fed/fasted value has no visual effect yet.

**Biology caveat (see `UNCERTAINTIES.md`):** most bile constituents cross the canalicular membrane through ATP-dependent pumps (BSEP, MRP2, ABCG5/G8), not in Golgi-derived vesicles. "Packaged" is a teaching abstraction requested for this version.

Sources for organelle proportions and counts: Alberts *MBoC* 6th ed. (hepatocyte volume fractions), Blouin, Bolender & Weibel *J Cell Biol* 1977;72:441, Wisse et al. *Hepatology* 1985;5:683. Counts are far below real numbers (5 mitochondria vs ≈1,000–2,000) and sizes exaggerated for legibility.

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

- Schematic polarity (canaliculus opposite the sinusoidal pole); one generic cell, no zonation.
- Organelle counts/sizes are illustrative; the fed/fasted API value is unused.
- Particles are additive glows (hidden by opaque geometry, not shadowed); no AO pass.
- Web fonts load from Google Fonts when reachable, otherwise fallbacks.
- Frame rate is unverified on real GPUs (headless checks use software GL).

## Layout

```
STYLE_SPEC.md  style spec (+ revision 2)      UNCERTAINTIES.md  flagged unknowns (generated)
reference/     reference renders             data/             all content JSON
src/index.js   API + orchestration           src/flow.js       route + GPU particles
src/plan.js    slab outline/geometry         src/layout.js     hand-set organelle layout
src/build/scene.js  all organelles/surfaces  src/materials.js  patched physical materials
src/ui.js      DOM UI                        src/dev.js        harness + lil-gui
tools/         check.mjs, shots.mjs, probe.mjs, gen-docs.mjs
```
