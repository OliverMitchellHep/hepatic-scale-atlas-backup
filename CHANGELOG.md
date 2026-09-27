# Changelog

## v44 — scene, pancreas, falciform, liver material (in progress)
- Shadows: real-time shadow maps removed everywhere (renderer, lights, meshes); grounding comes from AO. "Quality: High" now means more AO samples.
- Spine alignment: the macroscopic scene root is rotated so the least-squares centreline through the T1–L5 vertebral body centroids is vertical. Drift from vertical over its 442 mm: before 68 mm (x) / 91 mm (z) (v43 tilted the model 14.4°), after 0.00 / 0.00 mm (`validate.py` spine-axis check, < 2 mm). Default orbit target = spine axis at liver mid-height. `pipeline/spine44.py` derives the constants.
- Percutaneous biopsy view: same viewing angle, zoom removed: distance and target are fitted so the whole liver, right ribs 7–12 and the full needle path fit on screen (allowing for the side panel). The per-frame target-height follow now applies only as the zoom changes, so preset views (biopsy, SVT) keep their target.

## v43 — foundation (27 Sept 2026)
No intended visual change from v42.
- Source moved to this repository: split into `src/` (markup, styles, application, boot), `data/` and `assets/`; `build.py` assembles the page. Built from the published v42 page; the split build was byte-identical to v42 before any change.
- `data/registry.json`: the 255 structure descriptions (previously an inline `INFO` object) with permanent ids, extracted citations and, from the census, the tier and layer each structure lives in. The page's `INFO` is generated from it.
- Render-on-demand: the WebGL render (with AO and shadows) is skipped when nothing visible has changed; animation ticks and the interface keep running.
- `validate.py`: registry, size, load, clickable-name coverage, draw-call budget, idle redraw and screenshot-regression checks, plus warnings for superseded guideline citations.
- `pipeline/`: the v42 liver texture bake scripts (headless Blender).

v42 and earlier: see the project docs `hepatic-scale-atlas-vNN-changes.md`.
