# Flagged uncertainties

Generated from `data/uncertainties.json` (`npm run docs`). Where the literature is unsettled or the model simplifies, it is flagged here rather than invented. Also shown in each pathway's side panel.

## Model-wide

- Geometry is schematic. The canalicular groove sits on the +x face opposite the sinusoidal pole for legibility; in vivo the canaliculus is a groove on a lateral face between two hepatocytes, and each hepatocyte has two sinusoidal faces (both sides of the plate). Surface fractions (sinusoidal ≈37%, lateral ≈50%, canalicular ≈13%; Blouin 1977) are approximated, not measured from the mesh.
- Organelle sizes are exaggerated ≈1.5–2.5× and counts reduced ≈10× (mitochondria 110 vs ≈1,000–2,000) so structures read at full-cell scale; the relative volume of organelles is therefore only indicative (Alberts MBoC hepatocyte volume fractions: cytosol ≈54%, mitochondria ≈22%, RER ≈9%, SER + Golgi ≈6%, nucleus ≈6%, peroxisomes ≈1%, lysosomes ≈1%). Verify the exact table/page in the edition the atlas cites.
- Binucleate fraction: quoted as ≈25–30% of adult human hepatocytes from memory of Gentric & Desdouets 2014 and older ploidy studies; the figure varies with age and disease and should be checked against the primary source before it is shown to learners.
- Sinusoidal microvilli count/length, glycogen rosette size (≈100–200 nm α-particles) and fenestra diameter (≈100–200 nm) are order-of-magnitude values from reviews, not taken from one dataset.
- The fed↔fasted slider applies linear interpolation between two hand-set flux weights per route. Real regulation is time-dependent (glycogenolysis dominates the first ≈12–24 h of fasting, gluconeogenesis later), zonated along the sinusoid (periportal vs perivenous) and hormone-dose dependent. The weights are teaching illustrations, not quantitative fluxes.
- Metabolic zonation (periportal urea cycle and gluconeogenesis vs perivenous glycolysis, glutamine synthesis, CYP expression) is not drawn: one generic hepatocyte carries all pathways.
- Cell size: this model is ≈20 µm across (10 scene units × 2 µm), inside the literature range for hepatocytes (≈20–30 µm). The atlas 'cell' scale card currently quotes '≈ 14 µm'; reconcile the two before integration.

## Glucose handling (`glucose`)

- How glucose leaves the ER lumen after glucose-6-phosphatase is unresolved (proposed: GLUT7-like facilitated transport, vesicular routes, or cytosolic-side hydrolysis). The model routes ER → cytosol → GLUT2 without naming a transporter.
- Lactate uptake in the gluconeogenic route is drawn through a generic 'MCT' gate; the dominant human hepatocyte isoform(s) (MCT1 vs MCT2) and their zonal expression need confirmation.
- Glycogenolysis versus gluconeogenesis relative weights in the fasted state depend on fasting duration; the model shows both at fixed weights.

## Fatty acid handling (`fatty_acids`)

- Ketone-body efflux from hepatocytes is drawn through an MCT gate; the responsible transporter(s) in human hepatocytes are not firmly established.
- VLDL assembly is compressed to ER (triglyceride synthesis) → RER lumen (MTTP/ApoB100) → Golgi → sinusoidal exocytosis. The two-step model (primordial VLDL, then bulk lipidation) and the exact ER subdomain are simplified.
- Hepatic lipid-droplet size in the fasted state is scaled up slightly (fasting lipolysis raises hepatic fatty-acid delivery); the magnitude is illustrative.

## Protein synthesis & secretion (`protein_synthesis`)

- Amino-acid uptake is drawn through a single generic gate representing several SLC38 and SLC7 carriers; individual transporter kinetics and zonation are not shown.
- Nuclear transcription and mRNA export to ribosomes are not animated.

## Ammonia → urea (`urea_cycle`)

- Route of ammonia entry to the hepatocyte is shown as a generic 'NH3/NH4+ entry' gate; NH3 diffuses, and the contribution of Rh glycoproteins (RhBG) is debated. Periportal versus perivenous localisation of RhBG should be checked (Weiner et al. 2003).
- Urea export is shown via 'AQP9 / UT-B'; the principal sinusoidal urea exporter in human hepatocytes is not settled.
- Aspartate supply (citrin / aspartate–glutamate carrier) and fumarate return to the TCA cycle are not drawn.

## Bilirubin (`bilirubin`)

- Whether OATP1B1/1B3 are the only route for unconjugated bilirubin uptake (versus passive flip-flop diffusion) is debated; the model shows the carrier route.
- Some UGT1A1 topology details (UDP-glucuronic acid transport into the ER lumen) are compressed into a single SER node.

## Bile acids (`bile_acids`)

- Bile-acid synthesis flux is held constant across the fed/fasted slider: its regulation is FGF19/FXR and circadian rather than a simple insulin/glucagon switch. The uptake route is scaled up in the fed state to reflect post-prandial enterohepatic return.
- Peroxisomal versus cytosolic conjugation (BAAT) is compressed into one peroxisome step.

## Xenobiotic metabolism (`xenobiotics`)

- Flux weights are generic: real CYP induction/inhibition and the biliary versus renal split depend on molecular weight and polarity of each drug (larger amphipathic conjugates favour bile). One generic xenobiotic is shown.
- Uptake carriers differ by drug class; the gate is labelled 'OATP / OCT1 / passive' to reflect this.

## Cholesterol & lipoprotein remnants (`cholesterol`)

- Cholesterol de novo synthesis (HMG-CoA reductase) and HDL selective uptake via SR-B1 are not animated; they are mentioned in the text only.
- The ER cholesterol pool is drawn as a node on the SER network; sterol trafficking between compartments (non-vesicular transport) is compressed.
