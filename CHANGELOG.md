# Changelog

## v43 — foundation (27 Sept 2026)
No intended visual change from v42.
- Source moved to this repository: split into `src/` (markup, styles, application, boot), `data/` and `assets/`; `build.py` assembles the page. Built from the published v42 page; the split build was byte-identical to v42 before any change.
- `data/registry.json`: the 255 structure descriptions (previously an inline `INFO` object) with permanent ids, extracted citations and, from the census, the tier and layer each structure lives in. The page's `INFO` is generated from it.
- Render-on-demand: the WebGL render (with AO and shadows) is skipped when nothing visible has changed; animation ticks and the interface keep running.
- `validate.py`: registry, size, load, clickable-name coverage, draw-call budget, idle redraw and screenshot-regression checks, plus warnings for superseded guideline citations.
- `pipeline/`: the v42 liver texture bake scripts (headless Blender).

v42 and earlier: see the project docs `hepatic-scale-atlas-vNN-changes.md`.
