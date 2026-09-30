# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Hepatology and gastroenterology clinicians from MRCP-level trainees to consultants, using the atlas for self-study and teaching sessions. Confirmed audience is professional only; patients and the public are out of scope. Owner: Oli, a gastroenterology/hepatology registrar, who reviews each version himself.

## Product Purpose
Rex Hepatis (formerly Hepatic Scale Atlas) is an interactive 3D teaching model of the liver and hepatobiliary system, spanning scales from whole organ down to the hepatocyte. It is illustrative and explicitly not for clinical decisions. Design work on the `website-trial` branch targets a landing site around the atlas: what it is, who it is for, and how to use it.

## Positioning
A single continuous multi-scale model (organ to hepatocyte) built on real CT-derived liver geometry, with a pathology engine and guideline-cited callouts (EASL, BSG, UEG, NICE, NHS/NHSBT, Baveno, ESGE), written by a practising hepatology registrar.

## Operating Context
Static site assembled by `build.py` into `dist/` and published as a versioned artifact ("Rex Hepatis vNN"). Source lives in `src/` (page.html, atlas.css, atlas.js, three.js r160 module); structures are defined in `data/registry.json`. Desktop is the primary target; phones must still work (`body.mob` layout).

## Capabilities and Constraints
- Registry ids are permanent; rename `name`, never `id`.
- Model frame: +x patient left, +y superior, +z anterior; 1 unit is about 7 cm.
- The artifact host refuses `.ktx2`; textures must be WebP/PNG.
- CT source data (s1267 masks) stays out of the repository until the dataset licence for public release is confirmed; the repo stays private until then. Undecided: public release date and licence terms, so the landing site must not claim either.
- Guideline currency is tracked (`validate.py` warns on superseded citations).

## Evidence on Hand
The working 3D atlas and its registry of cited structures. No testimonials, usage figures, institutional endorsements or licence statements exist; future work must not fabricate them.

## Product Principles
- Clinical honesty first: always signal that the model is illustrative and not for clinical decisions.
- Credibility comes from citations and construction, not marketing claims.
- Serve a professional learner: dense, precise, no lay-audience softening.
- Desktop-first, but never break on a phone.

## Accessibility & Inclusion
No specific standard was stated. Desktop-first with working phone layout is the recorded baseline; open decision whether to adopt a formal target such as WCAG AA.
