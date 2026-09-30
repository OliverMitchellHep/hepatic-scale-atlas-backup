# Hepatocyte lab — style spec

Written from the five reference renders in `reference/` (animal cell, neuron, white blood cell,
epithelial cell, plant cell; via <https://x.com/DilumSanjaya/status/2053155739389378849>).
The references are cream-background, clay-sculpted cutaway cells with a paper-and-ink UI. Rex Hepatis
has hard constraints (black scene, dark navy panels, light type), so this spec separates
**what we take from the references** (form, material, lighting logic, camera, typographic character)
from **what we override** (background, panel colours). Everything below is implemented in
`src/render/` and exposed as tweakables (`data/style.json` defaults, lil-gui at runtime).

## 1. What the references do (observed)

| Aspect | Observation |
|---|---|
| Form | One cell as a *specimen*: cut open with a clean wedge/section so the interior reads at once. Chunky, exaggerated organelles (a few dozen, not thousands), each instantly recognisable in silhouette. |
| Surface | Sculpted-clay / painted-resin. Fine procedural bump (pores, dimples, crackle) everywhere, matte-satin roughness (~0.45–0.6), a soft broad specular, no mirror gloss except on small vesicles. |
| Colour | Saturated but slightly chalky, one hue family per organelle, with a lighter tint on raised areas and a darker, more saturated tint in crevices. Cytoplasm is a cool periwinkle/steel blue with a lighter filament mesh. |
| Membranes | Read as thick glossy skins with a pale edge highlight where the section cuts them; the cut face is a clean, flat, slightly lighter cap. |
| Depth | Soft ambient-occlusion darkening between organelles, gentle vignette, size perspective; no fog, no depth-of-field. |
| Lighting | High-key studio: warm key from upper-left, cool fill from the right, weak rim. Shadows soft and short. |
| Camera | ~35–45° elevated 3/4 view, model centred and filling ~75% of the frame, slow damped orbit, scroll zoom, ctrl-drag pan. |
| Type | High-contrast display serif title (Cormorant-like), italic grey subtitle; handwritten "tip" note on a taped sticky; small-caps italic letter-spaced panel labels; sans (Inter-like) for buttons. |
| UI | Rounded (14–18 px) cards with faint shadow, segmented icon buttons whose selected state takes the accent colour of the subject, toggle switch, bottom-left tool strip (Rotate · Isolate · Hide Others · Reset View), bottom-right (Screenshot). |

## 2. Overrides for the atlas

- **Scene background: pure black `#000000`.** No gradient, no floor. Depth is carried by lighting and a very
  soft radial vignette from the CSS layer only (the canvas itself is clear-colour black).
- **Panels: dark navy**, never white. Panel fill `rgba(10,20,44,0.86)` with `1px` border `#1f3160`,
  16 px radius, `backdrop-filter: blur(10px)`, shadow `0 10px 30px rgba(0,0,0,.5)`.
- **Text: light.** Primary `#e9eefc`, secondary `#a9b6d8`, tertiary `#7383ab`. Never below 4.5:1 on the panel fill.
- The atlas can override every colour token through `mount(container, { tokens })` (see README).

## 3. Palette

Colours are the *base* albedo; the shader lifts raised areas ~12 % and darkens crevices ~25 % (bump-driven).

| Element | Base | Notes |
|---|---|---|
| Cytosol tint (volume haze) | `#3f5bb8` @ 10 % | periwinkle, cool; the "floor" colour of the references |
| Plasma membrane – sinusoidal domain | `#e58aa0` | warm rose (microvilli slightly lighter `#f2a7b8`) |
| Plasma membrane – canalicular domain | `#4fc9b0` | teal-green, reads as bile |
| Plasma membrane – lateral domain | `#b58ad6` | soft lilac |
| Tight junction strands | `#ffe7a3` | pale gold, thin |
| Gap junctions | `#7fd6ff` | sky-blue plaques |
| Desmosomes | `#ff9a6b` | apricot discs |
| Nucleus (envelope / chromatin) | `#8a55d6` / `#a57bf0` | violet; cap face `#b48cff` |
| Nucleolus | `#4a27a8` | deep indigo, glossy sphere |
| Rough ER | `#3b4fb0` | indigo-blue; ribosomes `#f4e7b0` |
| Smooth ER | `#3fb4d6` | cyan-blue tubes |
| Golgi | `#ee7f8c` | salmon-pink stacks, `#ffb0a0` vesicles |
| Mitochondria – outer membrane | `#e0662e` | burnt orange, 30 % opaque shell |
| Mitochondria – cristae / matrix | `#b8321f` / `#f0b04a` | red matrix, gold cristae edges |
| Peroxisome | `#e6b93c` | gold, dark crystalline core `#5a3b12` |
| Lysosome | `#c23a86` | magenta, granular |
| Lipid droplet | `#f6e7a1` | cream, glossy, translucent |
| Glycogen rosette | `#f7c9d6` | pale pink beads |
| Microtubules / actin | `#c7d6f5` @ 35 % | subtle mesh |
| LSEC | `#7ea2ff` @ 30 % | thin sheet, sieve plates visible |
| Erythrocytes | `#c4353f` | biconcave discs |

Flow-particle colours live in `data/molecules.json` (grouped into families with a legend; each family is
distinguishable by hue *and* by shape so it survives colour-vision deficiency).

## 4. Materials

- **Base:** `MeshPhysicalMaterial`, roughness 0.5, metalness 0, `envMapIntensity` 0.6.
- **Bump:** procedural 3-octave value-noise bump in the fragment shader on local position (no textures
  to load; `bumpScale` per organelle). Nuclear pores, Golgi rims and cristae edges get extra bump.
- **Sub-surface (faked):** `emissive += sssColour * sss * pow(1 - N·V, 2.5)` plus a wrap-diffuse term. Applied to
  nucleus, lipid droplets, vesicles, glycogen, mitochondria (strong on orange). Zero cost beyond one pow.
- **Membrane sheen:** the plasma membrane is a translucent double-sided shell (front alpha ≈ 0.10, back
  alpha ≈ 0.20) with fresnel rim `pow(1 - N·V, 3)` in the domain colour and a `clearcoat 0.5` broad highlight.
- **Translucency:** mitochondrial outer membrane (alpha 0.28), lipid droplets (0.85), LSEC (0.3), sinusoid wall.
  Translucent instanced meshes are drawn after opaque, `depthWrite: false`; sorting is per-mesh only (accepted).
- **Cut face ("cap"):** opaque solids (nucleus, lipid droplets, peroxisomes, lysosomes) draw back faces in
  a flat, lighter cap colour so a section reads as solid material, as in the references.
- **Fenestrations:** RER, Golgi and LSEC sheets discard fragments from a 3-D noise field, giving perforated
  cisternae like the epithelial/animal references.

## 5. Lighting

- `HemisphereLight` sky `#b9c8ff` / ground `#2a1b3a`, intensity 0.55.
- Key `DirectionalLight` `#fff1dc`, intensity 2.6, from (-6, 9, 7) (upper-left-front).
- Fill `DirectionalLight` `#8fb2ff`, 0.9, from (8, 2, 4).
- Rim `DirectionalLight` `#ffd0f0`, 1.2, from (2, 4, -9).
- Environment: neutral studio PMREM (`RoomEnvironment`) at intensity 0.35 for the membrane/vesicle sheen; **never shown as background**.
- Tone mapping ACES Filmic, exposure 0.92, sRGB output. No shadow maps (soft contact cues come from bump,
  vertex AO on the shell and the cytosol haze; cheaper and steadier at 60 fps).
- Bloom (half-res, threshold 1.0, strength 0.42, radius 0.5) catches only particles, gates and highlights.

## 6. Depth cues

1. Cytosol haze: a back-face additive shell tinted `#3f5bb8` gives the interior volume.
2. Exponential fog to black (density 0.012) so far organelles sink into the dark background.
3. Fresnel rim and edge brightening on translucent membranes.
4. Particle size attenuation and additive glow with per-depth fade.
5. Section planes: the cut floor/back-wall caps give the eye two large flat references.

## 7. Background

Black canvas (`#000`). A CSS-only radial vignette (transparent centre → `rgba(0,0,0,.35)`) may sit above it; the
canvas stays opaque black so it composites cleanly in the atlas.

## 8. Label typography

- Display title: `"Cormorant Garamond", "Cormorant", Georgia, serif`, weight 500, 64 px (desktop), tracking -0.01em.
- Subtitle: same family, italic, 22 px, secondary text colour.
- Panel labels: same family, italic, uppercase, 12 px, letter-spacing 0.18em, tertiary colour ("VIEW MODE").
- Note / tip: `"Caveat", "Segoe Script", cursive`, 17 px, on a muted amber paper card (`#3a3320`, border `#6b5c2f`,
  tape strip `#7a6a35`) — the reference's sticky, dimmed for a dark UI.
- Buttons, callouts, panel body: `Inter, system-ui, sans-serif`, 13–14 px.
- Organelle callouts: 12 px sans, pill with navy fill, 1 px organelle-coloured border, a 1 px leader line to the
  anchor; visible on hover/selection and for the isolated pathway's transporter/enzyme steps.
- Web fonts are optional: fallbacks are chosen so nothing shifts layout if the font CDN is blocked.

## 9. Camera behaviour

- Perspective 35° FOV; default azimuth -24°, elevation 32°, distance 24.5 (wider on portrait screens), target offset so the sinusoid and the cell both sit between the UI columns.
- `OrbitControls` with damping 0.08, rotate speed 0.6, zoom to cursor off, pan on ctrl/right-drag, min/max distance 4 – 38 units,
  polar clamp 8°–172°.
- **Rotate** button: slow auto-orbit, pauses on user input for 4 s.
- **Reset view**: tweened return (700 ms, ease-in-out cubic).
- **Isolate / select**: camera glides to frame the chosen organelle (distance = 3.2 × its radius, min 4), others dim to 18 %.
- Motion budget: no camera shake, no roll; user input always wins over tweens.
- Desktop first: 60 fps target on a mid-range discrete GPU with bloom + MSAA ×4; phones get `quality: "low"`
  (no composer, no MSAA, ¼ particle count, DPR ≤ 1.5).


## 10. Revision 2 (owner feedback): simpler, opaque, closer to the references

Supersedes conflicting parts above.
- **Form:** an opaque clay slab cell (raised membrane rim around a recessed cytosol floor), top cut away as in the animal/plant-cell
  references. No translucent shell, no wedge. "Cross-section" off puts an opaque lid on the cell.
- **Organelles:** few, chunky, well-defined: nucleus dome with one cut quadrant (flat cut faces, nucleolus ball), concentric brick-like
  RER rings, cyan SER tubes, upright pink Golgi plates, opened mitochondria showing gold cristae on a red matrix, sparse vesicles,
  pale filament ropes on a periwinkle floor.
- **Flow:** one story, four stage colours (uptake gold → ER cyan → Golgi pink → bile green), one particle shape. No per-metabolite symbols.
- **UI:** no sticky note; a numbered "How it works" card doubles as legend; cross-section / binucleate switches, play + speed, tool strip.
- **Blood:** one lane of erythrocytes at equal speed and even spacing (cannot overlap; checked by `npm run check`).
