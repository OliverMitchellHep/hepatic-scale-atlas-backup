# Flagged uncertainties

Generated from `data/uncertainties.json` (`npm run docs`). Where the literature is unsettled or the model simplifies, it is flagged here rather than invented. Also shown in each pathway's side panel.

## Model-wide

- The design is a deliberate simplification requested by the owner: one generic flow (uptake → ER → Golgi → bile) instead of eight pathways. Individual substrates, transporters and metabolic-state effects are not shown; the earlier multi-pathway version is in git history (commit e6f8a86).
- Biology of stage 3: most bile constituents (bile acids, conjugated bilirubin, xenobiotic conjugates) cross the canalicular membrane directly through ATP-dependent pumps (BSEP, MRP2, ABCG5/G8), not in Golgi-derived vesicles. The Golgi/vesicular system delivers those pumps to the canalicular membrane and handles biliary proteins, IgA and some lipids. 'Packaged' is therefore a teaching abstraction; the flow is not a literal vesicle route for bile salts.
- Schematic geometry: canaliculus opposite the sinusoidal pole (in vivo it lies on lateral faces between hepatocytes; each hepatocyte has two sinusoidal faces). Organelle sizes are exaggerated and counts reduced (mitochondria 5 shown vs ≈1,000–2,000 real). Volume fractions (Alberts MBoC hepatocyte table; Blouin 1977) are not reproduced by the picture.
- Blood flows toward −z and bile toward +z (counter-current, as described for the acinus); the model has no periportal/perivenous zonation.
- Binucleate fraction (≈25–30% of adult human hepatocytes) is quoted from memory of Gentric & Desdouets 2014 and should be verified.
- Cell size: ≈20 µm across in this model (literature ≈20–30 µm); the atlas 'cell' card currently says ≈14 µm. Reconcile before integration.
