# Hepatic Scale Atlas — interface restructure ("v48 interface" brief), released as v50

**What changed.** Interface only: geometry, materials, lighting, physiology and anatomy are untouched.
- **Theme.** Black & Navy: a navy header and dock over a near-black stage (WebGL clear #07090B). Blue #6FA8EC is used only for selected or current things. Violet marks procedures. Amber appears only on "check" guidance badges. Radii are 4/6/8 px, and every text pair measures ≥4.6:1.
- **Frame.**
  - A 60 px header: Labels · Segments · Reset view · Quality · Guide · Panel.
  - A right dock with Explore | Layers | Clinical | Learn under a shared scale header, plus a Clinical count badge.
  - The fibrosis bar is now the **Patient state strip**, with chips for running pathology and procedures.
  - The camera view offset centres the model in whatever stage is left after the dock, pins and drawer.
- **Layers.**
  - Views presets, with micro presets such as Blood path and Bile path.
  - A layer tree with On | Ghost | Off, a mixed state for groups, and a per-layer structure list.
  - Segments moved to the header, with its legend under Views.
  - Flow row: Blood flow and Bile flow. Bile flow is disabled with "No bile flow at this scale" at the lobule and hepatocyte scales.
  - The toast is gone.
- **Clinical.**
  - Pathology: Focal lesions, Biliary & pancreatic, Vascular, Parenchymal. Procedures: Diagnostic, Therapeutic.
  - One item template, with active instances, readouts and Manage.
  - One biliary drainage control and one pancreatic duct control, each with "Drainage: … Change ›" rows elsewhere.
  - TACE, Resection and TIPSS are gated on a valid target. Controls outside their scale show "Available at Macroscopic ›".
- **Explore.** Find a structure, Key concepts with Show me, and a Selected card (Isolate, Ghost others, Teaching card ›).
- **Pop-ups.**
  - A ≤280 px identify box.
  - A left **teaching drawer** (384 px, with history, Back and ×). It holds structure and pathology cards, the biopsy/TACE/ERCP and HVPG steppers, and modules.
  - Guidance badges `{src, year, status}`.
  - At most the drawer plus the identify box are open at once.
- **Pinning.** Pinned columns are 360 px, collapsing to 44 px rails. The oldest collapses first to keep a 640 px stage; if that fails the pin is refused with "Not enough room…". State is stored in `hsa-dock`. The same DOM subtree moves (never cloned), and phones have no pins.
- **Learn.** A Portal hypertension module (6 steps, 2 checks, an HVPG try-it) and four "Coming soon" placeholders. **Share this view** stores the state in `#v=…`.
- **Onboarding.** Pointers to the header, dock (mentions pinning), strip and drawer. "Start exploring" closes everything; the key is now `hsa-intro-seen-v50`.
- **Phone.** The drawer fills the bottom sheet with a sticky step footer, and the landscape sheet is compact.

**Decisions.**
- **Version.** The repository was already at v49 (the brief assumed v47), so this release is **v50** on branch `v48-interface`.
- **Quick harness.** `harness.js --quick` became `tests/quick.py` (Python, like the existing harness).
- **Index budget.** Raised from 4.0 to 4.3 MB; the index is 4.09 MB.
- **TIPSS gate.** Placing a TIPSS needs a gradient ≥10 mmHg (CSPH), a variceal bleed, or a TIPSS already in place.
- **Pinning at 1440.** Two expanded columns plus the dock leave under 640 px of stage, so the 1440 view is Layers pinned beside Clinical in the dock. A new pin that does not fit starts as a rail.
- **Drawer and HUD.** The scale HUD and rail hide while the drawer is open.
- **Toast.** Replaced by automatic ghosting through the layer map.
- **Ghost opacity slider.** Left out (it was optional).
- **Camera.** Show me and structure framing use eased camera flights; the camera had no easing before.
- **Show me.** Omitted for 6 of the key concepts, where no single view makes the point.
- **Teaching cards.** Split into Diagnosis and Management by keyword. The prose itself is unchanged.
- **Baveno.** Baveno VIII could not be verified against the primary source. The module cites **Baveno VII 2022 with a check badge**, as do BCLC 2022 and EASL vascular 2016.
- **Count badge.** Counts active pathology, running procedures and devices in place.

**Open items.**
- The spec §5/§10 rewrite is below; paste it into the project spec (the spec is not in this repo).
- Verify Baveno VIII, then change the module's reference status.
- Write the four placeholder modules.
- Screenshot baselines were re-taken for the new background (liver_ant/inf, all_ant, context_ant).
- Carried from v49:
  - The splenic artery touches the vein.
  - Oesophageal ridge, and the kidney lip.
  - Offsets on the fundal and SVT flow routes.
  - The bleed ends in D2.

**Views for Oli to check.**
1. 1440×900: the default Explore view, then pin Layers and open Clinical. The model stays centred.
2. Clinical → Add HCC. The HCC card opens in the drawer; then TACE, then Back.
3. Clinical → HVPG. The stepper runs in the drawer with a sticky footer; the strip shows "HVPG · running".
4. Learn → Portal hypertension, steps 3–6: answer the check, try HVPG, then Back to the module.
5. 1280×800: pin Layers and Clinical. Both collapse to rails; unpin one.
6. Phone 390×844: Learn module in the sheet; tap a tab, then return via the strip or Manage.

---

## Spec §5 Interface (replacement text)
- **Frame.** A 60 px navy header (brand; Labels, Segments, Reset view, Quality, Guide, Panel). A right dock (376 px) with the scale header (eyebrow, title, sub, lede) and tabs Explore | Layers | Clinical | Learn. The patient state strip sits bottom-centre in the stage. The teaching drawer sits on the left (384 px). `setViewOffset` centres the orbit target in the stage that remains.
- **Tabs.**
  - **Explore:** search, Key concepts (Show me), Selected.
  - **Layers:** Views, layer tree (On | Ghost | Off), Flow.
  - **Clinical:** Pathology and Procedures items (template: header → configure → primary action → instances → readouts → Manage), with tier and target gating.
  - **Learn:** modules and Share this view.
- **Pop-ups.** The identify box (≤280 px) plus at most one drawer entry. The drawer keeps a history stack. Procedures always open in the drawer; closing the drawer stops them.
- **Pinning.**
  - Any tab can be pinned as a 360 px column, left of the dock, in tab order. Collapsed columns are 44 px rails.
  - The stage minimum is 640 px: the oldest pin collapses first, otherwise the pin is refused.
  - State is stored in `hsa-dock`. API: `__atlas.dock{pin, unpin, collapse, state}`. Phones have no pins.
- **Colour.**
  - Tokens: `--stage-0/1`, `--navy/-2/-in`, `--line/-2`, `--ink/-2/-3`.
  - `--acc` only for selected or current; `--proc*` for procedures; `--warn` only for "check" badges.
  - Contrast ≥4.5:1.
- **Phone (`body.mob`).** A bottom sheet (peek/half/full) holding the strip and tabs. The drawer is the sheet's content while open, and a tab tap shows the tab instead. There are no pins.

## Spec §10 Keep list (additions)
- The camera centres the model in the visible stage.
- One pop-up at a time.
- Amber only on "check" badges.
- Pins move the live subtree (no clones).
- The drawer history.
- Registry-driven teaching cards and badges.
- Module thresholds come from `computeHemo`.
- Share links (`#v=`) stay backward-compatible (`v:1`).
