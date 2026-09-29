# Rex Hepatis v51: changes from Oli's v50 review

**Version.** The request was labelled v50, but v50 already exists: it is the interface restructure on branch `v48-interface`, and it is what the review describes. This build sits on top of it as **v51**, so the v50 artifact and changelog entry stay as they are.

## What changed (request item → change)
1. **Name.** The header reads "Rex Hepatis", with the tagline "An interactive 3D model of the hepatobiliary system, from the whole organ down to the individual hepatocyte" beside it. It also appears in the page title and the intro card.
2. **Header.**
   - "Macroscopic → subcellular · CT anatomy" is removed.
   - Panel is replaced by an arrow in the right card's top corner. When the card is hidden, a tab on the right edge brings it back.
   - Segments moves to Layers › Views as a "Couinaud segments" toggle.
   - Find a structure is in the header. On phones it sits at the top of the sheet.
3. **Right card.**
   - The scale eyebrow, the size line and the lede are removed at every scale. The title is larger.
   - "The polarised hepatocyte" is now "The Hepatocyte".
   - Collapse all closes every group and item. It then reads "Expand all".
   - The Explore tab is removed. Key concepts are in Learn (per scale). The Selected card is at the top of Layers.
   - **HPB therapeutics** has two items:
     - **Biliary drainage:** Start ERCP first, then Balloon trawl, Plastic stent, Metal stent, Bilateral stents, then PTC drain.
     - **Pancreatic duct drainage:** Start ERCP, then Plastic or Metal stent. The ERCP cannulates the main pancreatic duct.
   - TIPSS, TACE and Resection are under **Liver & portal therapeutics**.
4. **Views.**
   - At the lobule, acinus and sinusoid scales, the layers are one flat On | Off list.
   - The macroscopic home view is 22% closer.
   - Lobule → acinus ends straight on: venules along screen y, plates along x.
   - Acinus → sinusoid no longer jumps. This was a real bug: an offset jumped at z = 3 after v48 changed the micro-tier scale.
5. **Macroscopic anatomy.**
   - The gallbladder fundus is closed.
   - The surface vessels come from a new connected, branching tile (`vessels51`) and are denser on the gallbladder.
   - A TIPSS stops a variceal bleed and the varices collapse. A bleed now needs a gradient of at least 12 mmHg.
6. **Cirrhosis slider.**
   - One stage table drives HVPG and liver stiffness together. F4 is split by Laennec stage.
   - At 10 mmHg the left gastric vein reverses first, then the oesophageal/GOV1 varices fill. Numbers and sources are in `CHANGELOG.md` v51.

## Decisions
- **Selected card.** It moved to Layers, because its actions (Isolate, Ghost others) are layer actions.
- **Key concepts.** They sit in Learn above the modules until they are rewritten as teaching.
- **ERCP therapy.** Balloon trawl, plastic, metal and bilateral stents are the therapy for the Start ERCP run above them. The stent is placed at the therapy stage and stays in place, listed with × to remove. PTC stays a separate percutaneous button, because it is not an ERCP.
- **Pancreatic ERCP.** It uses the same stepper with its own text (pancreatogram, pancreatic sphincterotomy, stenting; ESGE 2019).
- **Stage bands.** The METAVIR positions on the slider are unchanged, because the micro and macro morphology is tuned to them. Only HVPG and LSM are remapped. F4 is split into Laennec 4A, 4B and 4C over slider 0.82–1.
- **Vessel tile.** The new tile is shared, so the arterial vasa vasorum and the portal, venous and biliary surface vessels also become connected networks.
- **Micro tilt.** The full tilt also changes the sinusoid and hepatocyte viewing angle to straight on. Both read well; see views 4–5.

## Views for Oli to check
1. At 1440×900, home: the header shows the brand, tagline, search, Labels, Reset view and Guide. Hide the card with the arrow, then bring it back from the right-edge tab.
2. Layers: turn on the Couinaud segments toggle. Clinical: press Collapse all, then Expand all.
3. Clinical › HPB therapeutics:
   - Set Biliary obstruction to CBD stone. Choose Metal stent, then Start ERCP and step through it.
   - Then Pancreatic duct drainage › Start ERCP.
4. Zoom from the lobule to the acinus: it should end straight on. Then zoom to the sinusoid: there should be no jump.
5. Hepatocyte scale: the title reads "The Hepatocyte".
6. Drag fibrosis to about 0.90. The readouts should show HVPG 10, LSM ≈ 19 kPa and a reversed left gastric vein. Then drag to 1 and start a variceal bleed. Insert TIPSS: the bleed stops and the varices collapse.
7. Inferior view of the gallbladder: vessels form a network, and the fundus is closed.

## Open items
- If all three tabs are pinned, the card's title and hide arrow go with it; the pinned columns still collapse individually.
- Key concepts still need rewriting as Learn teaching (see `content/PLAN.md` on `claude/awesome-hamilton-73l3ft`).
- Carried from v50: the splenic artery touches the vein; oesophageal ridge; kidney lip; fundal/SVT flow offsets; the bleed ends in D2.
