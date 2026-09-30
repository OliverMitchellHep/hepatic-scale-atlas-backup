# Learn modules — Phase 1 plan (HPB anatomy and physiology)

Status: plan only. No prose modules written. Stopped at end of Phase 1 because the plan conflicts with the repo (see "Repo findings").

## Repo findings (v46)

1. **There is no Learn tab and no content schema.** `src/page.html` and `src/atlas.js` contain no Learn/lesson/module code. The only teaching content is per-scale `TIERS[i].keys` ("Teaching points"), per-structure callouts (`data/registry.json` `info`, `cites`), and pathology panels (`BX_TXT`, `ZON_NOTE`). `CLAUDE.md` refers to a claude.ai spec doc that is not in the repo.
2. **Views are not data.** Scale = 5 tiers (`TIERS`: macro, lobule, acinus, sinusoid, hepatocyte; zoom `state.z`). Layers = `LAYERS` / `LAYER_SETS[tier]` keyed by string (macro: `parenchyma, segments, portal, artery, hepaticVein, biliary, stomach, esophagus, duodenum, pancreas, spleen, kidneys, ribcage, diaphragm`, plus `ligaments`), with On/Ghost/Off states in `state.layers`. Pathology is `state.path` (`zonal`, `masld`, `pvt`, `bcs`, `bil`, `pds`, `panc`, `tips`, `hepatofugal`, fibrosis). Camera is OrbitControls with hard-coded presets (home, biopsy, SVT). Nothing is addressable from outside except the test hook `window.__atlas`; no URL/deep-link handling.
3. **Registry**: 258 entries, `{id, name, info, cites, tier, layer}`. Well covered: segments I–IVb–VIII (`segment-*`), portal/arterial/hepatic-venous trees, biliary tree, `zone-1/2/3`, `acinus-rappaport`, `sinusoid`, `space-of-disse`, `fenestrated-endothelium`, `kupffer-cell`, `stellate-cell`, `hepatocyte` organelles and canalicular/basolateral transporters, a large pathology and procedure set. 60 entries have empty tier/layer (mostly pathology/devices/generic). Ids are permanent.
4. **Highlighting**: segments have a legend/toggle; per-id highlight for arbitrary structures is not a documented capability (verify in the engineering pass).
5. **Consequence**: the pilot requires a Learn shell, a content schema and a view-dispatch API first (E1–E3). That is beyond "minimum to render module content" only if you did not intend it, hence the stop.

## Conventions used below

- Level: **S** student, **J** MRCP/junior trainee, **R** GI/hepatology registrar. "R+" = ESEGH-depth extension available on request, not default.
- Views name real layer keys and tiers from the repo. `[NEEDS ASSET]` = see engineering requests (E-numbers).
- Module IDs are permanent, like registry ids.
- Clinical hooks are topics only. Claims, grades and guideline years are added and web-verified at drafting.

---

## ANATOMY

### A01 Liver: gross structure, surfaces and peritoneal attachments — S
- Outcomes: describe lobes, surfaces and margins; name the ligaments and the bare area; explain anatomical vs functional lobes (falciform vs Cantlie); locate the porta hepatis contents; relate the liver to adjacent organs and ribs.
- Prereq: none.
- Views: tier 0; `parenchyma` solid→ghost, `ligaments`, `ribcage`, `diaphragm`, `stomach`, `duodenum`, `kidneys`. IDs: `right-lobe, left-lobe, caudate-lobe, porta-hepatis, falciform-ligament, coronary-ligament, ligamentum-teres, glisson-s-capsule, ivc`. Missing: triangular ligaments, lesser omentum/hepatoduodenal ligament, ligamentum venosum, bare-area marker (E5).
- Hooks: liver edge on palpation and ribs, capsular stretch pain, subphrenic collections, hepatic hydrothorax route via diaphragm.

### A02 Couinaud segments and the segmental logic — S/J **(PILOT)**
- Outcomes: name the eight segments (IV a/b) and their portal/venous boundaries; explain why hepatic veins run between and pedicles within segments; apply Cantlie's line and the umbilical/right/left portal fissures; describe the caudate (I) as an autonomous segment; state the difference between Couinaud and Bismuth/Healey–Schroy nomenclature.
- Prereq: A01.
- Views: tier 0; `segments` on, `parenchyma` ghost, `portal`/`hepaticVein` alternately on. IDs `segment-i … segment-viii`, `right/middle/left-hepatic-vein`, `right-portal-branch`, `left-portal-branch`. Missing: per-segment pedicle ids, fissure/plane overlays (E5).
- Hooks: segment VIII vs VI access and resection; segment I drainage in Budd–Chiari (caudate hypertrophy, `caudate-lobe-hypertrophy`); localising HCC by segment; couinaud-guided segmentectomy.

### A03 Hepatic and portal vasculature (inflow and outflow) — S/J
- Outcomes: trace the portal vein from SMV/splenic confluence to sinusoids; describe the arterial supply from the coeliac axis and common variants; describe the three hepatic veins, short hepatic veins and their IVC confluence; state the tributaries of the portal system and the sites of portosystemic anastomosis; explain the dual supply and the arterial supply of the ducts.
- Prereq: A01.
- Views: tier 0; `portal`, `artery`, `hepaticVein`, `parenchyma` ghost, `pancreas`, `spleen`, `stomach` for the tributaries. IDs: `portal-trunk, superior-mesenteric-vein, splenic-vein, inferior-mesenteric-vein, left-gastric-vein, coeliac-trunk, common-hepatic-artery, proper-hepatic-artery, right/left-hepatic-artery, cystic-artery, gastroduodenal-artery, ivc, caudate-veins`. Portosystemic sites: `oesophageal-varices, gastric-fundal-varices, splenorenal-shunt, recanalised-paraumbilical-vein, caput-medusae` (pathology-state IDs; a normal anastomosis view is [NEEDS ASSET] E4). Variants: replaced/accessory hepatic arteries and portal trifurcation [NEEDS ASSET] (E6).
- Hooks: PVT and cavernoma, hepatic artery thrombosis after transplant, TIPSS anatomy, Budd–Chiari and hepatic venous outflow, radiological arterial-phase enhancement.

### A04 Biliary tree, gallbladder and variants — S/J
- Outcomes: name the intrahepatic to extrahepatic duct hierarchy; define the cystohepatic triangle and Calot's; state the common ductal and cystic-duct variants with cited prevalence; describe the biliary blood supply; correlate MRCP/ERCP appearances.
- Prereq: A01, A03.
- Views: tier 0; `biliary`, `parenchyma` ghost, `duodenum`, `pancreas`, `artery`. IDs: `right-hepatic-duct, left-hepatic-duct, common-hepatic-duct, common-bile-duct, cystic-duct, gallbladder, segmental-bile-duct, intrahepatic-bile-ducts, cystic-artery, choledochal-cyst-todani-*`. Variants (right posterior sectoral duct, triple confluence, low cystic-duct insertion, accessory ducts, Luschka) [NEEDS ASSET] (E6).
- Hooks: bile-duct injury at cholecystectomy, Mirizzi, PSC and cholangiocarcinoma staging (Bismuth–Corlette), living-donor duct anatomy, MRCP interpretation.

### A05 Gallbladder, pancreas and the sphincter of Oddi — J
- Outcomes: describe the pancreatic head/neck/body/tail relations and ductal system (Wirsung, Santorini, pancreas divisum); describe the ampulla and sphincter components; explain the shared pancreaticobiliary channel; relate the pancreas to SMV/SMA, splenic vein and CBD.
- Prereq: A03, A04.
- Views: tier 0; `pancreas`, `duodenum`, `biliary`, `portal`, `artery`, `stomach` ghost. IDs: `pancreas, pancreatic-duct, ampulla-of-vater, common-bile-duct, gallbladder, superior-pancreaticoduodenal-artery, gastroduodenal-artery, splenic-vein, superior-mesenteric-vein`. Missing: sphincter of Oddi components, minor papilla/accessory duct, divisum/annular variants (E5, E6).
- Hooks: gallstone pancreatitis, ERCP cannulation and sphincterotomy, post-ERCP pancreatitis, sphincter of Oddi dysfunction, pancreas divisum, periampullary tumours.

### A06 Innervation of the liver and biliary tree — J
- Outcomes: describe sympathetic (coeliac plexus) and parasympathetic (vagal) supply; describe the hepatic plexus around the artery and portal vein; explain sensory pathways and referred pain (right shoulder-tip via phrenic); describe the innervation of sphincter of Oddi and gallbladder.
- Prereq: A01.
- Views: tier 0; nerves [NEEDS ASSET] (E5); `artery`, `portal`, `biliary`, `diaphragm`, `esophagus` for vagal trunks. Only `diaphragm`, `oesophageal-hiatus` exist.
- Hooks: biliary colic, referred pain patterns, coeliac plexus block in pancreatic cancer pain, denervation in transplant.

### A07 Lymphatic drainage — J
- Outcomes: describe hepatic lymph formation and its three routes (portal, hepatic-venous/sublobular, capsular); name the nodal stations of the hepatoduodenal ligament and coeliac axis; explain lymphatic role in ascites formation and in metastatic spread.
- Prereq: A03.
- Views: lymph vessels/nodes [NEEDS ASSET] (E5); `portal`, `artery`, `biliary` as landmarks.
- Hooks: nodal staging in cholangiocarcinoma and pancreatic cancer, ascites in cirrhosis, retroperitoneal and portacaval nodes on imaging.

### A08 Surgical planes and relations — J/R
- Outcomes: define the inflow/outflow control concept; describe the principal resection planes (Cantlie, right/left/umbilical fissures) and the resulting hepatectomy nomenclature (Brisbane 2000); state relations relevant to mobilisation (IVC, right adrenal, hepatoduodenal ligament, Pringle manoeuvre); explain future liver remnant concepts.
- Prereq: A02, A03, A04.
- Views: tier 0; `segments`, `parenchyma` ghost, `portal`, `hepaticVein`, `biliary`; existing `planned-resection, transection-line, transection-surface-remnant, resection-specimen` (procedure state, `BX_TXT.resect`). Fissure/plane overlays and named hepatectomy presets [NEEDS ASSET] (E5).
- Hooks: right vs left hemihepatectomy, extended resections, portal vein embolisation, FLR and portal hypertension thresholds, living-donor graft splits.

### A09 Portosystemic collateral anatomy — J/R
- Outcomes: list the four classical sites of portosystemic anastomosis; trace gastro-oesophageal varices from the left gastric/short gastric veins to azygos; explain the spleno-renal and paraumbilical routes; correlate with endoscopic and cross-sectional findings.
- Prereq: A03.
- Views: tier 0; `portal`, `hepaticVein`, `stomach`, `esophagus`, `kidneys`, pathology `ph` state (`state.path`). IDs: `oesophageal-varices, gastric-fundal-varices, splenorenal-shunt, recanalised-paraumbilical-vein, caput-medusae, azygos-vein, left-renal-vein`. Normal-state (non-pathological) collateral overlay [NEEDS ASSET] (E5).
- Hooks: variceal bleeding, BRTO/TIPSS, hepatic encephalopathy from shunts, ectopic (rectal, stomal) varices.

### A10 Anatomical variants of the hepatobiliary system — J/R
- Outcomes: classify hepatic arterial (Michels/Hiatt) and portal variants; classify biliary confluence variants (Huang/Couinaud); state each variant's prevalence with a cited source; identify variants that change operative or donor risk.
- Prereq: A03, A04.
- Views: whole variant set [NEEDS ASSET] (E6: the atlas models one CT anatomy; a variant library is a new feature).
- Hooks: living-donor and split-liver planning, TACE/SIRT arterial mapping, bile-duct injury risk.

### A11 Microanatomy I: lobule, portal tract, acinus, zonation — S/J **(PILOT, paired with A12)**
- Outcomes: contrast the classic hexagonal lobule, portal lobule and Rappaport acinus; identify portal-tract contents; define zones 1–3 and the oxygen/nutrient gradient across them; explain why acinar zones predict injury patterns; describe the limiting plate and septa.
- Prereq: A02 (light).
- Views: tier 1 and tier 2; layer keys `lobules, portal, artery, bile, central, plates, acinar, flow` (tier 1); `plates, flow` etc. (tier 2). IDs: `portal-tract, central-vein, terminal-portal-venule, inlet-venule, zone-1, zone-2, zone-3, acinus-rappaport, limiting-plate, fibrous-septum, bile-ductule`. Path: `state.path.zonal` for zone-specific injury.
- Hooks: zone 3 ischaemic/paracetamol injury, zone 1 in eclampsia/viral hepatitis interface disease, bridging necrosis, biopsy sampling (portal-tract counts).

### A12 Microanatomy II: sinusoid, space of Disse, hepatocyte — S/J **(PILOT)**
- Outcomes: describe LSEC fenestrae and lack of basement membrane; name the cells of the sinusoid and space of Disse and their roles; explain the route from blood to bile canaliculus; relate hepatocyte polarity to transporter placement; identify the site of capillarisation in fibrosis.
- Prereq: A11.
- Views: tier 2 and tier 3 (`disse, sinusoids, plates, bile, endothelium, cells, blood, hepatocytes`), tier 4 for hepatocyte polarity. IDs: `sinusoid, fenestrated-endothelium, fenestra, space-of-disse, bile-canaliculus, kupffer-cell, stellate-cell, retinoid-droplet, perisinusoidal-collagen, hepatocyte, sinusoidal-membrane, canalicular-membrane, tight-junction, basolateral-transporter, canalicular-transporter`.
- Hooks: stellate activation and fibrosis, sinusoidal obstruction syndrome, cholestasis (transporter defects), fibrosis staging on biopsy.

*Pilot scope note: the brief's second pilot is "Sinusoid and lobule/acinus". A11 and A12 are separate modules above. For the pilot they will be delivered as one combined module (A11+A12) unless you prefer two.*

---

## PHYSIOLOGY

### P01 Hepatic blood flow and its regulation — J
- Outcomes: state the split of inflow (portal vs arterial) and the split of oxygen delivery; explain the hepatic arterial buffer response and its limits; describe flow autoregulation and sinusoidal tone (stellate cells, NO, endothelin); explain postprandial hyperaemia and effect of posture/exercise.
- Prereq: A03, A11.
- Views: tier 0 `portal, artery, hepaticVein` + tier 1/2 `flow`. Dynamic pressure/flow overlay [NEEDS ASSET] (E7).
- Hooks: ischaemic hepatitis, hepatorenal physiology, anaesthesia and shock liver, portal-vein thrombosis compensation.

### P02 Sinusoidal exchange and zonation — J
- Outcomes: describe transport across the fenestrated endothelium and space of Disse; explain uptake and first-pass extraction; define metabolic zonation (oxidative/gluconeogenic periportal, glycolytic/lipogenic and xenobiotic perivenous) with its drivers (oxygen, Wnt/β-catenin, hormones); interpret the pO₂ gradient.
- Prereq: A11, A12.
- Views: tier 2/3 `flow`, `sinusoids`, `disse`; tier 1 `acinar`. Zonation gene/enzyme overlay [NEEDS ASSET] (E7).
- Hooks: paracetamol (zone 3 CYP2E1), ischaemic zone 3 injury, drug clearance, high-extraction drugs and shunts.

### P03 Bile formation and the enterohepatic circulation — J
- Outcomes: describe canalicular (bile-acid-dependent/independent) and ductular secretion; name the key transporters (NTCP, BSEP, MRP2, MDR3) and what each disease of them causes; trace the enterohepatic circulation of bile acids; explain gallbladder concentration, CCK-mediated emptying and sphincter of Oddi coordination; describe bilirubin conjugation and excretion.
- Prereq: A04, A12.
- Views: tier 4 `transporters`; tier 3 `bile`; tier 0 `biliary`, `gallbladder`, `duodenum`. Terminal ileum and portal return path not modelled [NEEDS ASSET] (E8).
- Hooks: cholestasis (PFIC, PBC, PSC), gallstone pathogenesis, bile acid diarrhoea, cholestyramine, obeticholic-acid-class drugs, ursodeoxycholic acid.

### P04 Hepatic metabolism: carbohydrate, lipid and protein — J
- Outcomes: describe glycogenesis/glycogenolysis/gluconeogenesis and their zonation; describe VLDL assembly and β-oxidation; explain urea-cycle ammonia handling and glutamine synthesis; describe the fed-fasted switch.
- Prereq: P02.
- Views: tier 4 `mitochondria, er, lipid, glycogen`; tier 1 zone highlighting.
- Hooks: MASLD and insulin resistance, hepatic encephalopathy (ammonia), hypoglycaemia in acute liver failure, alcohol metabolism.

### P05 Xenobiotic and drug metabolism — J/R
- Outcomes: describe phase I/II/III metabolism; explain the zonation of CYP enzymes; define extraction ratio and first-pass metabolism; explain the paracetamol NAPQI pathway and glutathione depletion; identify major inducers/inhibitors relevant to hepatology practice.
- Prereq: P02.
- Views: tier 4 `er`; tier 1/2 zone 3 highlight; `state.path.zonal`.
- Hooks: paracetamol overdose and acetylcysteine, DILI patterns, drug dosing in cirrhosis.

### P06 Synthetic function, coagulation and albumin — J
- Outcomes: list proteins made by the liver; explain the short half-lives that make PT/INR an acute marker of synthetic function; describe the coagulation balance in liver disease (pro- and anti-coagulant reduction, rebalanced haemostasis); explain albumin's oncotic and binding roles.
- Prereq: P02.
- Views: tier 4 `er, ribosome, nucleus`. Coagulation diagram is non-spatial [NEEDS ASSET] (E2: a 2D diagram block in the schema).
- Hooks: INR interpretation in cirrhosis, thrombosis risk despite raised INR, albumin in SBP and large-volume paracentesis, acute liver failure criteria.

### P07 Portal pressure physiology — J/R
- Outcomes: define portal pressure, HVPG and their components (resistance, flow); explain the sinusoidal, pre- and post-sinusoidal patterns and how HVPG measures each; explain splanchnic vasodilation, hyperdynamic circulation and collateral formation; describe the thresholds of clinical significance.
- Prereq: P01, A09.
- Views: tier 0 `portal` + `state.path` (`masld`, fibrosis, `pvt`, `bcs`, `tips`) and HVPG readout (`r-hvpg` exists in the panel); HVPG procedure exists (`hvpg` dialog).
- Hooks: HVPG in varices and post-hepatectomy risk, non-selective β-blockers, TIPSS, pre-hepatic PVT vs cirrhotic PH vs Budd–Chiari.

### P08 Bilirubin, jaundice and the cholestatic pattern — S/J
- Outcomes: trace haem → bilirubin → conjugation → excretion; classify jaundice as pre-, intra- and post-hepatic; explain biochemical patterns (hepatocellular vs cholestatic); explain why conjugated bilirubin appears in urine and unconjugated does not.
- Prereq: P03.
- Views: `biliary` obstruction pathology (`state.path.bil`); tier 3/4 transporters.
- Hooks: Gilbert, Crigler–Najjar, obstructive jaundice work-up, MRCP/EUS pathway.

### P09 Splanchnic circulation, ascites and the renal axis — R
- Outcomes: explain Starling forces and lymph overflow in ascites; explain splanchnic vasodilation, RAAS and hepatorenal physiology; describe sodium and water retention mechanisms.
- Prereq: P07, A07.
- Views: `portal`, `kidneys`; ascites/fluid overlay [NEEDS ASSET] (E7).
- Hooks: diuretic choice, albumin, HRS-AKI, SBP, large-volume paracentesis.

### P10 Immunology, regeneration and the sinusoidal niche — R
- Outcomes: describe Kupffer cell and LSEC roles in tolerance and clearance; describe stellate cell activation; explain regeneration after resection (priming, proliferation, termination) and limits in cirrhosis.
- Prereq: A12, P02.
- Views: tier 3 `cells, endothelium`; `planned-resection` state.
- Hooks: liver failure after major resection, transplant tolerance, fibrosis regression.

---

## Engineering requests (separate, as asked)

| # | Request | Why | Blocking pilot? |
|---|---|---|---|
| **E1** | **Learn tab shell**: tab in the panel, module list, section renderer, view-button renderer, self-assessment widget (SBA with rationale), reference list with evidence grade. Theme: existing black scene / navy panels. Desktop first; `body.mob` layout must still work. | No Learn tab exists. | **Yes** |
| **E2** | **Content schema and loader** (`content/*.json`, `@@INCLUDE@@` or fetch at build): sections, per-section `view`, outcomes, clinical box, questions, refs. Support a non-spatial diagram block. Validator: every structure ID resolves in the registry; `[NEEDS ASSET]` allowed only under a flagged field. | No schema; `validate.py` needs a `content` check. | **Yes** |
| **E3** | **View-dispatch API**: one function `applyView({tier, layers:{key:on|ghost|off}, path:{...}, camera:{target, distance, azimuth, elevation}, highlight:[ids], zoom})` reusing existing setters (`setGroup`, `state.layers`, `state.path`, tier zoom, presets). Also "restore view". | Views are currently UI-driven; only `window.__atlas` test hook is exposed. | **Yes** |
| **E4** | **Highlight by registry id** (colour/emissive pulse + callout open) for any structure, including segments; expose to E3. | Only segments have legend toggle. | Yes for A02 |
| **E5** | New structures / overlays: hepatoduodenal ligament and lesser omentum, ligamentum venosum, triangular ligaments, bare area; hepatic lymph vessels and nodal stations; autonomic nerves (coeliac/hepatic plexus, vagal trunks); sphincter of Oddi components, minor papilla and accessory duct; per-segment portal pedicles; Cantlie line and fissure/plane overlays; normal-state portosystemic anastomosis overlay. | Anatomy modules A01, A05–A09. | No |
| **E6** | **Variant library**: alternate hepatic arterial (replaced/accessory), portal trifurcation, biliary confluence variants, pancreas divisum/annular. Needs one mesh or swap per variant. | A03, A04, A05, A10. | No |
| **E7** | **Physiology overlays**: pressure/flow colour-map on trees; zonation enzyme/gene gradient across zones 1–3; ascites/fluid overlay. | P01, P02, P07, P09. | No (P02 pilot text uses existing zone-1/2/3 and `flow`) |
| **E8** | **Enterohepatic loop**: terminal ileum and return via the portal vein (ileum/colon are not modelled). | P03. | No |

Pilot dependencies: E1–E4. E5–E8 are deferred and every `[NEEDS ASSET]` in the pilots will point at these numbers.

## Open decisions for review

1. **Build the Learn shell (E1–E3) first?** It is not "minimum engineering" and was not in the brief, so I stopped rather than build it. Recommended.
2. **Schema shape**: JSON files under `content/` keyed by module id, joined to the registry by id, with the view spec as data (my recommendation), or markdown with front-matter.
3. **Pilot 2 scope**: one combined A11+A12 module, or two?
4. **Source access**: guidelines and papers will be verified by web search at drafting; textbook chapters (Sherlock, Blumgart, Gray's, Guyton) cannot be opened here, so book citations will be [UNVERIFIED] unless you supply page/edition details.
