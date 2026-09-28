
addEventListener('error', e=>{
  const m=document.getElementById('boot-msg'), b=document.getElementById('boot');
  if(m && b && !b.classList.contains('gone')){
    m.style.textTransform='none'; m.style.letterSpacing='0'; m.style.color='#C7534A';
    m.textContent='Failed to start: '+(e.message||e.error||'unknown error');
  }
});

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three/addons/bvh/three-mesh-bvh.module.js';
{ const BVH_MIN=1500;
  THREE.BufferGeometry.prototype.computeBoundsTree=computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree=disposeBoundsTree;
  THREE.Mesh.prototype.raycast=function(rc,out){
    const g=this.geometry, P=g&&g.attributes.position;
    if(P && !g.morphAttributes.position && (g.index?g.index.count:P.count)/3>=BVH_MIN){
      if(g.boundsTree && g.__bvhA!==P){ g.disposeBoundsTree(); }
      if(!g.boundsTree){ g.computeBoundsTree({indirect:true,maxLeafTris:8}); g.__bvhA=P; g.__bvhV=P.version; }
      else if(g.__bvhV!==P.version){ g.boundsTree.refit(); g.__bvhV=P.version; }
    }
    return acceleratedRaycast.call(this,rc,out);
  };
}
window.__bootStage='build';
/* ?liver=ct swaps the parenchyma and viscera for one CT-derived patient (TotalSegmentator); default stays v13 */
const CT_REQ = true;   // the CT case is the model
document.getElementById('boot-msg').textContent='assembling parenchyma\u2026';
await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));   // let the splash repaint before the heavy build

/* Anatomical frame:  +x = patient's LEFT   +y = superior   +z = anterior
   Default camera is anterior, so the patient's RIGHT lobe renders on screen left. */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = {
  tissue:0x57291F, tissueMid:0x4A241C, tissueDeep:0x371A14, capsule:0x7A4638,
  portal:0x7A5CB4, artery:0xB83A30, bile:0xB9BC5E, gb:0xC6CB80, vein:0x2F5A9E,
  amber:0xE0A33E, kupffer:0x7C5F9C, stellate:0xB79F68, collagen:0xC9C2B0,
  nucleus:0x50719A, mito:0xBE7A32, er:0x6F988F, lipid:0xDCC98C, glyc:0x8A98A8,
  duo:0xA87E62
};
const SEG = ['I','II','III','IVa','IVb','V','VI','VII','VIII'];
const SEG_COL = [0x5E5173,0x2F5566,0x356355,0x6A5A2E,0x7A6832,0x7A452A,0x6C3330,0x513350,0x86552C];

/* ════════════ content ════════════ */
const TIERS = [
  { id:'macro', name:'Macroscopic', mag:'\u00d71', sub:'\u2248 20 cm transverse \u00b7 layered',
    title:'The liver in situ',
    lede:'One scene with switchable layers. Set the parenchyma to Ghost or Off and the portal, arterial, hepatic venous and biliary trees stay in place inside the same liver \u2014 each one clickable, in the territory it actually supplies.',
    keys:[
      ['01','Anatomical \u2260 functional division','The falciform separates the anatomical lobes. The functional split is Cantlie\u2019s line, from the gallbladder fossa to the IVC \u2014 which puts segment IV on the left.'],
      ['02','Pedicles in, hepatic veins between','Each portal pedicle runs into the middle of its segment; the hepatic veins run in the planes between segments. Ghost the parenchyma and the opposition is obvious.'],
      ['03','One artery for the ducts','The biliary tree is supplied by the hepatic artery alone \u2014 hence ischaemic cholangiopathy after hepatic artery thrombosis.']
    ],
    annos:[
      {p:[-1.10,0.30,0.30],l:'Right lobe',layer:'parenchyma',surface:1},
      {p:[1.05,0.40,0.10],l:'Left lobe',layer:'parenchyma',surface:1},
      {p:[-0.05,0.25,-0.78],l:'Caudate lobe',layer:'parenchyma',chip:1},
      {p:[-0.28,-0.18,0.02],l:'Porta hepatis',layer:'parenchyma'},
      {p:[-0.70,0.60,0.20],l:'Glisson\u2019s capsule',layer:'parenchyma',chip:1,surface:1},
      {p:[-0.95,0.05,0.30],l:'Subcapsular veins',layer:'parenchyma',chip:1,surface:1},
      {p:[0.20,0.42,0.40],l:'Falciform ligament',layer:'ligaments',surface:1},
      {p:[0.05,-0.78,0.00],l:'Ligamentum teres',layer:'ligaments'},
      {p:[-0.39,-0.72,0.96],l:'Gallbladder',layer:'biliary'},
      {p:[-0.35,-1.05,0.02],l:'Common bile duct',layer:'biliary'},
      {p:[-0.16,-1.58,-0.10],l:'Ampulla of Vater',layer:'biliary',chip:1},
      {p:[0.02,-0.95,-0.26],l:'Portal trunk',layer:'portal'},
      {p:[-0.52,0.06,-0.04],l:'Right portal vein',layer:'portal'},
      {p:[0.00,0.09,-0.10],l:'Left portal vein',layer:'portal'},
      {p:[0.17,-2.02,-0.27],l:'Superior mesenteric vein',layer:'portal'},
      {p:[1.10,-1.30,-0.67],l:'Splenic vein',layer:'portal'},
      {p:[0.45,-0.85,-0.43],l:'Left gastric vein',layer:'portal',chip:1},
      {p:[-0.07,1.22,0.03],l:'Aorta',layer:'artery'},
      {p:[0.06,-1.06,-0.98],l:'Coeliac trunk',layer:'artery',chip:1},
      {p:[-0.05,-1.10,-0.72],l:'Common hepatic artery',layer:'artery',chip:1},
      {p:[-0.03,-0.66,0.06],l:'Proper hepatic artery',layer:'artery'},
      {p:[0.90,-1.12,-0.86],l:'Splenic artery',layer:'artery'},
      {p:[0.33,-1.78,-0.56],l:'Superior mesenteric artery',layer:'artery',chip:1},
      {p:[-0.14,-1.50,-0.36],l:'Gastroduodenal artery',layer:'artery',chip:1},
      {p:[-0.38,-0.12,0.18],l:'Cystic artery',layer:'artery',chip:1},
      {p:[-0.33,1.22,0.02],l:'IVC',layer:'hepaticVein'},
      {p:[-0.95,0.40,-0.14],l:'Right hepatic vein',layer:'hepaticVein'},
      {p:[-0.18,0.36,0.18],l:'Middle hepatic vein',layer:'hepaticVein'},
      {p:[0.62,0.34,0.02],l:'Left hepatic vein',layer:'hepaticVein'},
      {p:[2.10,-0.55,-0.75],l:'Spleen',layer:'viscera'},
      {p:[1.05,-1.00,-0.05],l:'Stomach',layer:'viscera'},
      {p:[0.36,0.45,-0.80],l:'Oesophagus',layer:'viscera',chip:1},
      {p:[1.22,-1.90,-1.10],l:'Left kidney',layer:'viscera',chip:1},
      {p:[0.40,-1.97,-1.02],l:'Left renal vein',layer:'hepaticVein',chip:1}
    ]},
  { id:'lobule', name:'Lobule', mag:'×70', sub:'≈ 2 mm · hexagonal',
    title:'Lobule and acinus',
    lede:'The classical lobule is a hexagonal prism with a central vein at its axis and portal tracts at its corners. Rappaport’s acinus rotates the frame: the functional unit runs from one portal tract toward the two nearest central veins.',
    keys:[
      ['01','Zone 1 is periportal','Highest pO₂ (~60–65 mmHg). β-oxidation, gluconeogenesis, ureagenesis. Injured first by toxins arriving in high concentration (iron, yellow phosphorus) and at the interface in autoimmune and chronic viral hepatitis.'],
      ['02','Zone 3 is most vulnerable to ischaemia','Lowest pO₂ (~30–35 mmHg) and least oxygen reserve, so it necroses first in hypoxic (ischaemic) hepatitis and shock liver. Also CYP2E1-rich — paracetamol (NAPQI) and alcohol-related injury — and congested in venous outflow obstruction.'],
      ['03','Blood and bile oppose','Blood runs portal tract → sinusoid → central vein; bile runs canaliculus → canal of Hering → ductule, back toward the tract.'],
      ['04','Lobule = structure, acinus = function','The classic lobule is a structural unit: a hexagon drawn around one central vein with portal tracts at its corners, as it appears on a histology slide. Rappaport’s acinus is the functional unit: the parenchyma supplied by one terminal portal venule and hepatic arteriole running along the border between two lobules, draining to the central veins on either side — a diamond that spans parts of two lobules (toggle Acinar). Its zones 1 → 3 follow the direction of blood flow and the fall in oxygen, nutrients and toxin concentration, which is why injury patterns (ischaemic, toxic, congestive, metabolic) are described by acinar zone rather than by position in the lobule.'],
      ['05','Portal lobule: the biliary view','A third convention, the portal lobule, is a triangle centred on one portal tract with central veins at its corners: the territory draining bile into that tract’s ductule.']
    ],
    annos:[
      {p:[0,0,1.28],l:'Central vein',layer:'central'},{p:[0.74,0.43,0.80],l:'Portal tract',layer:'portal'},
      {p:[0.54,0.31,0.55],l:'Zone 1',layer:'plates'},{p:[0.24,-0.14,0.55],l:'Zone 3',layer:'plates'},
      {p:[-0.66,0.0,0.30],l:'Limiting plate',layer:'plates'},
      {p:[0.35,-0.40,0.55],l:'Sinusoidal blood flow',layer:'flow'},
      {p:[0.70,1.21,1.28],l:'Central vein (adjacent lobule)',layer:'acinar'},{p:[0.35,0.60,1.2],l:'Acinus (Rappaport)',layer:'acinar'}
    ]},
  { id:'acinus', name:'Acinus', mag:'×430', sub:'≈ 400 µm · portal → central',
    title:'Portal venule to central venule',
    lede:'The microcirculatory unit. Blood leaves the terminal portal venule through short inlet venules, crosses an anastomosing sinusoidal network between plates of hepatocytes, and is collected by the terminal hepatic venule. Bile runs the other way.',
    keys:[
      ['01','What you are looking at','One acinus opened along its axis. On the left, a portal tract: terminal portal venule, hepatic arteriole and bile ductule. On the right, the terminal hepatic (central) venule. Between them, plates of hepatocytes one to two cells thick, separated by sinusoids.'],
      ['02','Two inflows mix at zone 1','About 75% of hepatic blood flow is portal venous (nutrient-rich, partly deoxygenated) and 25% arterial (oxygen-rich, roughly half the oxygen supply). Inlet venules and arteriolar branches empty into the sinusoids at the periphery of the acinus, so mixed blood enters at zone 1.'],
      ['03','Blood flows centripetally: zone 1 → 3','Blood crosses the plates from portal to central venule. pO₂ falls from ~65 to ~30 mmHg over about 400 µm, and nutrients, hormones and toxins are extracted along the way. Zones are positions on that gradient, not compartments — and they explain zonal injury.'],
      ['04','Bile flows the other way: zone 3 → 1','Hepatocytes secrete bile into canaliculi formed between neighbouring cells. Bile runs centrifugally, toward the portal tract, entering the canals of Hering at the limiting plate and then the bile ductule — counter-current to blood.'],
      ['05','Lymph drains toward the portal tract','Plasma filtered through the endothelial fenestrae into the space of Disse drains toward the portal tract (space of Mall) as hepatic lymph, a large share of thoracic duct flow. When sinusoidal pressure rises, lymph formation outstrips drainage — one source of ascites.'],
      ['06','Inlet venules feed the network','Sinusoids arise from the terminal portal venule along its length, not from a single ostium, so perfusion is distributed rather than end-arterial.'],
      ['07','Fibrosis follows this axis','With fibrosis, stellate cells lay collagen in Disse, sinusoids narrow, and septa bridge portal tract to central vein along the same axis, short-circuiting the sinusoidal bed and raising intrahepatic resistance.']
    ],
    annos:[
      {p:[-1.45,0.48,0.0],l:'Terminal portal venule',layer:'portal'},{p:[1.45,0.48,0.0],l:'Central vein',layer:'central'},
      {p:[-1.18,-0.43,0.10],l:'Inlet venule',layer:'portal'},{p:[0.0,0.14,0.10],l:'Sinusoid',layer:'sinusoids'},
      {p:[-0.80,0.98,0.0],l:'Zone 1',layer:'plates'},{p:[0.85,0.98,0.0],l:'Zone 3',layer:'plates'},
      {p:[-1.45,-0.62,-0.22],l:'Bile ductule',layer:'bile'}
    ]},
  { id:'sinusoid', name:'Sinusoid', mag:'×6 500', sub:'≈ 26 µm · cut open', annoScale:0.60,
    title:'Sinusoid and space of Disse',
    lede:'One sinusoid opened along its length. A low-pressure channel lined by fenestrated endothelium with no basement membrane, separated from the hepatocyte microvilli by the space of Disse — where stellate cells sit and where fibrosis begins.',
    keys:[
      ['01','What you are looking at','One hepatic sinusoid opened along its length, running from the portal (zone 1) end on the left to the central (zone 3) end on the right. Red cells travel in the lumen. The wall is a thin fenestrated endothelium; outside it lies the space of Disse, and beyond that the plates of hepatocytes, whose microvilli project into Disse.'],
      ['02','Fenestrated endothelium','Liver sinusoidal endothelial cells are perforated by clusters of 50–200 nm fenestrae (sieve plates, ~6–8% porosity) and have no basement membrane. Plasma, lipoproteins, albumin-bound drugs and small particles pass freely into Disse; blood cells do not. The fenestrations are in the endothelium, not in the hepatocytes.'],
      ['03','Space of Disse','The perisinusoidal space between endothelium and hepatocytes. Plasma bathes the hepatocyte microvilli here, the site of uptake (bile acids, bilirubin, drugs) and secretion (albumin, clotting factors, lipoproteins). Normally it holds only a sparse, low-density matrix and the stellate cells.'],
      ['04','Cells of the sinusoid','Kupffer cells are resident macrophages inside the lumen, clearing gut-derived bacteria, endotoxin and old red cells. Stellate (Ito) cells sit in Disse, storing vitamin A in lipid droplets. Pit cells (liver NK cells) patrol the lumen.'],
      ['05','What cirrhosis does','Injury activates stellate cells into myofibroblasts that lay fibrillar collagen (types I and III) and a basement membrane in Disse. Fenestrae shrink and close (defenestration), turning the sinusoid into a capillary-like tube: capillarisation. The lumen narrows and stiffens. This comes before, and alongside, bridging fibrosis.'],
      ['06','Why it matters','Capillarisation blocks exchange between blood and hepatocytes, impairing clearance of lipoproteins and drugs and hepatocyte oxygenation. It raises intrahepatic resistance, compounded by endothelial dysfunction (reduced nitric oxide) and contractile stellate cells: the sinusoidal basis of portal hypertension. Drag the fibrosis slider to watch it happen.']
    ],
    annos:[
      {p:[-0.49,-0.10,1.30],l:'Fenestrated endothelium',layer:'endothelium'},
      {p:[-0.40,0.56,0.60],l:'Space of Disse',layer:'disse'},
      {p:[-0.56,-1.06,-1.05],l:'Hepatocyte plate',layer:'hepatocytes'},
      {p:[-0.10,1.54,1.10],l:'Bile canaliculus',layer:'bile'},
      {p:[0.00,0.05,0.80],l:'Kupffer cell',layer:'cells'},
      {p:[-0.20,0.56,-1.05],l:'Stellate cell',layer:'cells'},
      {p:[-0.56,0.60,-0.30],l:'Perisinusoidal collagen',layer:'disse',chip:1},
      {p:[0,0,0],l:'Erythrocyte',layer:'blood',chip:1}
    ]},
  { id:'cell', name:'Hepatocyte', mag:'×12 000', sub:'≈ 14 µm · polarised',
    title:'The polarised hepatocyte',
    lede:'A cuboidal epithelial cell with two distinct membrane domains. Uptake happens on the sinusoidal face; excretion happens on the canalicular face. Cholestasis is, mechanically, a transporter problem.',
    keys:[
      ['01','What you are looking at','One hepatocyte opened up: nucleus, mitochondria, rough and smooth ER, glycogen and lipid. It has three membrane domains: the basolateral (sinusoidal) face, whose microvilli project into the space of Disse; the lateral faces, sealed by tight junctions; and the apical canalicular groove it shares with its neighbour, which forms the bile canaliculus. Transporters are shown as generic uptake and export sites on the two faces.'],
      ['02','Basolateral uptake','NTCP takes up conjugated bile acids (sodium-dependent). OATP1B1/1B3 take up organic anions, including bilirubin glucuronides, statins and many drugs. OCT1 takes up cations such as metformin.'],
      ['03','Canalicular export','ABC transporters pump against steep gradients. BSEP (ABCB11) exports bile acids; MRP2 (ABCC2) exports conjugated bilirubin and glutathione conjugates; MDR3 (ABCB4) flops phosphatidylcholine into bile to form mixed micelles that protect the duct epithelium; ATP8B1 (FIC1) flips aminophospholipids back, keeping the canalicular membrane rigid; ABCG5/8 export cholesterol.'],
      ['04','Cholestasis by transporter','PFIC1 (ATP8B1) and PFIC2 (ABCB11): low-GGT cholestasis. PFIC3 (ABCB4): high-GGT, and in adults low-phospholipid cholelithiasis (LPAC) and intrahepatic cholestasis of pregnancy. Dubin–Johnson (MRP2) and Rotor (OATP1B1/1B3): benign conjugated hyperbilirubinaemia. Drugs that inhibit BSEP (e.g. bosentan) cause cholestatic drug-induced liver injury.'],
      ['05','Adaptive escape in cholestasis','When canalicular export fails, the cell turns down NTCP uptake and turns up basolateral efflux through MRP3, MRP4 and OSTα/β, returning bile acids and conjugated bilirubin to the blood. That is why conjugated bilirubin rises in cholestasis. The nuclear receptor FXR coordinates the response.'],
      ['06','Zone 3 cells are CYP-rich','Smooth ER density and CYP2E1 expression rise toward the central vein: the structural correlate of zonal drug injury (paracetamol, alcohol).']
    ],
    annos:[
      {p:[-0.46,0,0],l:'Nucleus',layer:'nucleus'},{p:[-0.9,0.5,0.7],l:'Mitochondria',layer:'mitochondria'},
      {p:[-0.7,0.4,-0.6],l:'Endoplasmic reticulum',layer:'er'},{p:[-0.12,-1.13,0.4],l:'Canalicular membrane',layer:'transporters'},
      {p:[0.1,1.14,-0.7],l:'Sinusoidal membrane',layer:'membrane'},{p:[-0.9,-0.5,0.8],l:'Lipid droplets',layer:'lipid'}
    ]}
];

const INFO = @@REGISTRY@@;

function info(l){
  if(INFO[l]) return INFO[l];
  let cm=l.match(/^CCA \d+ · intrahepatic · segment (\S+) · ([\d.]+) cm/);
  if(cm) return `Intrahepatic (mass-forming) cholangiocarcinoma, ${cm[2]} cm, segment ${cm[1]}. Grey-white, firm and desmoplastic, with infiltrative margins; capsular retraction is characteristic. Imaging shows rim arterial enhancement with progressive central (delayed) enhancement rather than washout — LI-RADS LR-M, so biopsy is needed even in cirrhosis. Resection with negative margins is the only curative option; molecular profiling (FGFR2 fusions, IDH1 mutations) guides systemic therapy (EASL–ILCA 2023; BSG 2023).`;
  cm=l.match(/^CCA \d+ · perihilar · Bismuth–Corlette (\S+) · ([\d.]+) cm/);
  if(cm) return `Perihilar (Klatskin) cholangiocarcinoma, Bismuth–Corlette ${cm[1]}, ${cm[2]} cm of duct. A periductal-infiltrating stricture: painless obstructive jaundice, dilated intrahepatic ducts and a collapsed CBD. Bismuth–Corlette maps ductal extent — I: CHD below the confluence; II: the confluence; IIIa/IIIb: extending into the right/left hepatic duct; IV: both sides — and so the resection (IIIa → extended right, IIIb → extended left hepatectomy, both with caudate lobe). Diagnose and stage with MRCP/CT before any stenting; tissue by ERCP brush cytology ± cholangioscopic biopsy (BSG 2023).`;
  cm=l.match(/^CCA \d+ · distal extrahepatic · ([\d.]+) cm/);
  if(cm) return `Distal extrahepatic cholangiocarcinoma, ${cm[1]} cm of duct. Arises in the distal (intrapancreatic) CBD: painless jaundice with dilatation of the whole tree above, often a palpable gallbladder (Courvoisier). Managed like other periampullary cancers — staging CT, EUS ± FNB and ERCP tissue sampling, then pancreaticoduodenectomy if resectable (BSG 2023).`;
  let pm=l.match(/^PDAC \d+ · head · ([\d.]+) cm/);
  if(pm) return `Pancreatic ductal adenocarcinoma of the head, ${pm[1]} cm. About two-thirds arise in the head: painless obstructive jaundice with a palpable gallbladder (Courvoisier), and obstruction of both the bile duct and the main pancreatic duct, the double duct sign. Hypovascular, desmoplastic and poorly marginated on pancreatic-protocol CT. Stage with pancreatic-protocol CT, then FDG-PET/CT and EUS-guided biopsy where needed (NICE NG85); resectability depends on contact with the SMA, coeliac axis, SMV and portal vein. Resectable: pancreaticoduodenectomy without preoperative biliary drainage unless surgery is delayed, then an endoscopic metal stent. Unresectable: endoscopic metal stent rather than surgical bypass (NICE NG85).`;
  pm=l.match(/^PDAC \d+ · tail · ([\d.]+) cm/);
  if(pm) return `Pancreatic ductal adenocarcinoma of the tail, ${pm[1]} cm. Body and tail cancers do not obstruct the bile duct, so they present late with pain, weight loss or new-onset diabetes and are more often unresectable or metastatic at diagnosis. Invasion or thrombosis of the splenic vein behind the pancreas causes left-sided (sinistral) portal hypertension, with isolated gastric fundal varices and a normal HVPG. Resectable disease: distal pancreatectomy with splenectomy, then adjuvant chemotherapy (NICE NG85).`;
  const bm=l.match(/^(Abscess|Cyst|Haemangioma|FNH|Adenoma) \d+ · segment (\S+) · ([\d.]+) cm/);
  if(bm){ const s=`${bm[3]} cm, segment ${bm[2]}. `; return {
    Abscess:`Pyogenic liver abscess, ${s}Arises from biliary disease, portal seeding from the bowel (diverticulitis, appendicitis) or haematogenous spread; often cryptogenic. Klebsiella pneumoniae and the Streptococcus anginosus group predominate (S. anginosus should prompt a search for a colonic source). Fever, right upper quadrant pain and raised inflammatory markers; ultrasound or CT shows a complex, often multiloculated collection with an enhancing rim. Treatment: blood cultures, IV antibiotics and image-guided aspiration or catheter drainage for larger collections (commonly >3–5 cm), with 4–6 weeks of antibiotics in total. Consider amoebic abscess with relevant travel (serology; metronidazole).`,
    Cyst:`Simple hepatic cyst, ${s}Thin-walled, anechoic, no septa or nodularity. EASL 2022: ultrasound is the first-line test and CT/MRI are not needed once a simple cyst is seen; asymptomatic cysts are not followed up. Symptomatic cysts without biliary communication get the best local volume-reducing therapy: aspiration sclerotherapy (volume reduction 76–100%, slow over ≥6 months) or laparoscopic deroofing (recurrence <8%). Thick septation or nodularity (with upstream biliary dilatation) suggests a mucinous cystic neoplasm, which should be resected.`,
    Haemangioma:`Haemangioma, ${s}The commonest benign liver tumour. MRI/CT: peripheral nodular discontinuous enhancement with centripetal fill-in, bright on T2. A typical haemangioma needs no follow-up or treatment whatever its size (EASL 2016); treatment is reserved for symptoms, growth or complications.`,
    FNH:`Focal nodular hyperplasia, ${s}A hyperplastic response to an arterial malformation, typically in young women; the central stellate scar carries the feeding artery. Arterial hyperenhancement, iso-intense in the portal phase, and iso- or hyperintense in the hepatobiliary phase on gadoxetic-acid MRI. No follow-up is needed once typical, and oral contraceptives need not be stopped (EASL 2016).`,
    Adenoma:`Hepatocellular adenoma, ${s}Linked to oestrogen exposure, anabolic steroids and obesity; subtypes HNF1A-inactivated, inflammatory, β-catenin-activated and sonic hedgehog (bleeding). EASL 2016: stop oral contraceptives and lose weight; resect lesions ≥5 cm after 6 months of lifestyle change, all adenomas in men, and β-catenin-activated adenomas (malignant-transformation risk). Haemorrhage is treated by embolisation.`}[bm[1]]; }
  const hm=l.match(/^HCC \d+ · segment (\S+) · ([\d.]+) cm/);
  if(hm) return `Hepatocellular carcinoma, ${hm[2]} cm, segment ${hm[1]}. In cirrhosis a lesion ≥1 cm with arterial-phase hyperenhancement and portal-venous/delayed washout on multiphasic CT or MRI is diagnostic without biopsy (EASL 2025 CPG; LI-RADS 5). Staging and treatment follow BCLC (2022 strategy; the BCLC 2026 update is published in J Hepatol): very early/early disease → resection, ablation or transplant; Milan criteria (one ≤5 cm or up to three ≤3 cm, no macrovascular invasion) define transplant benefit, with UK criteria extending to up to five ≤3 cm or a single 5–7 cm lesion stable for 6 months (AFP ≤1000).`;
  let m=l.match(/^Portal branch, segment (\w+)/);
  if(m) return `The segmental portal pedicle to segment ${m[1]}, running into the centre of its territory with its artery and duct \u2014 the unit an anatomical segmentectomy ligates.`;
  return 'No description recorded for this structure yet.';
}

/* ════════════ renderer ════════════ */
/* v36 render settings in one place (tone mapper, exposure, light rig, environment strength) */
/* ACESFilmic kept: against AgX at matched brightness it holds the teaching colour code apart (CIEDE2000, home view:
   artery–portal 33.5 vs 27.3, bile–artery 43.8 vs 31.3, fat–nutmeg 15.3 vs 10.1, portal–hepatic vein 19.6 vs 15.7). */
/* v44 (Task 9): environment map + key light. The coloured fill (blue) and rim (amber) lights are gone: on the wet liver
   the amber rim left gold streaks on the visceral surface. The key is the world key plus the viewer-mounted headlight
   (so the side turned to the viewer stays lit), the flat ambient is lower (it flattened surfaces towards clay), and the
   studio environment carries a little more of the fill and the wet reflections. No shadow maps (Task 1). */
const R36={tm:THREE.ACESFilmicToneMapping, exp:1.15, env:1.75,
  key:[0xFFF1E4,1.50,-4,5,6], amb:[0x1C2734,0.34], cam:0.80};
const stageEl = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = R36.tm;
renderer.toneMappingExposure = R36.exp;
stageEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070A0E);
scene.fog = new THREE.FogExp2(0x070A0E, 0.020);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 500);
/* v45: pulled back along the v38 direction (×2.04 from the orbit target) so the whole ribcage (ribs 1–12, costal cartilages,
   sternum, T1–T12) fits a 16:9 desktop frame with the side panel open; the orbit target (0,−0.45,0) is unchanged.
   v38–v44: (0.061,−0.145,7.137). */
const HOME = new THREE.Vector3(0.124, 0.172, 14.559);
camera.position.copy(HOME);

const pmrem = new THREE.PMREMGenerator(renderer);
/* studio environment (v36): a dark neutral room lit by large emissive softboxes, rendered once to PMREM.
   Key upper-left (viewer's side), fill right, dim rim behind, soft overhead; no horizon colour. Lighting only:
   the background stays the dark instrument colour. */
function studioEnv(){
  const s=new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(30,32,16),new THREE.MeshBasicMaterial({color:0x121316,side:THREE.BackSide})));
  const box=(w,h,p,k,c)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(k),side:THREE.DoubleSide}));
    m.position.set(...p); m.lookAt(0,0,0); s.add(m); };
  box(9,7,[-8,8,7],5.0,0xFFF4EA);      // key softbox, upper left, towards the viewer
  box(6,9,[10,1,5],1.6,0xE8EFFF);      // fill strip, right
  box(12,3,[0,5,-11],1.1,0xFFFFFF);    // rim strip behind
  box(16,16,[0,16,0],0.35,0xFFFFFF);   // soft overhead
  box(20,6,[0,-12,4],0.10,0xFFFFFF);   // faint floor bounce
  const t=pmrem.fromScene(s,0.035).texture; s.traverse(o=>{ if(o.isMesh){ o.geometry.dispose(); o.material.dispose(); } }); return t;
}
scene.environment = studioEnv();

function addLight(col, inten, x,y,z){
  const l = new THREE.DirectionalLight(col, inten);
  l.position.set(x,y,z); scene.add(l); return l;   // position is read-only: always .set()
}
const LIGHTS={key:addLight(R36.key[0],R36.key[1],R36.key[2],R36.key[3],R36.key[4]), amb:new THREE.AmbientLight(R36.amb[0],R36.amb[1])};
scene.add(LIGHTS.amb);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false; controls.enablePan = false;
controls.enableDamping = true; controls.dampingFactor = 0.075;
controls.rotateSpeed = 0.62; controls.autoRotate = false;
controls.target.set(0,-0.45,0);

/* ════════════ helpers ════════════ */
const rng = (s=>()=>(s=(s*16807)%2147483647)/2147483647)(987654321);
function mat(color,o={}){
  return new THREE.MeshPhysicalMaterial(Object.assign({
    color, roughness:0.45, metalness:0, clearcoat:0.35, clearcoatRoughness:0.5,
    transparent:true, opacity:1, envMapIntensity:R36.env}, o));
}
/* ── organ skin (v35) ──
   One 512² tileable atlas, generated once: R = cellular lobulation (Worley F2−F1), G = smooth undulation (fBm),
   B = colour mottling (fBm), A = fine serosal vessel network (ridged, domain-warped noise). Each organ samples it
   triplanar in object space at its own scales; the height drives a derivative bump that also breaks up the clearcoat,
   B tints the albedo, A darkens along vessels, and a fresnel term adds soft subsurface-like rim light. */
const SKIN_TEX=(()=>{
  const N=Math.min(innerWidth,innerHeight)<=520 ? 256 : 512, D=new Uint8Array(N*N*4);   // phones: quarter the boot cost
  const hash=(i,j,s)=>{ let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(s,1442695041))|0;
    h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967296; };
  const fade=t=>t*t*t*(t*(t*6-15)+10);
  const GT={}, gtab=(P,s)=>{ const k=P*1000+s; let t=GT[k]; if(t) return t; t=GT[k]=new Float32Array(P*P*2);
    for(let j=0;j<P;j++) for(let i=0;i<P;i++){ const a=hash(i,j,s)*6.2831853; t[(j*P+i)*2]=Math.cos(a); t[(j*P+i)*2+1]=Math.sin(a); } return t; };
  const pn=(x,y,P,s)=>{ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, T=gtab(P,s);
    const i0=((xi%P)+P)%P, j0=((yi%P)+P)%P, i1=(i0+1)%P, j1=(j0+1)%P;
    const g=(i,j,dx,dy)=>{ const o=(j*P+i)*2; return T[o]*dx+T[o+1]*dy; };
    const n00=g(i0,j0,xf,yf), n10=g(i1,j0,xf-1,yf), n01=g(i0,j1,xf,yf-1), n11=g(i1,j1,xf-1,yf-1);
    const u=fade(xf), v=fade(yf), a=n00+(n10-n00)*u, b=n01+(n11-n01)*u; return a+(b-a)*v; };
  const fbm=(u,v,P,oct,s)=>{ let a=0,amp=1,tot=0; for(let o=0;o<oct;o++){ a+=amp*pn(u*P,v*P,P,s+o); tot+=amp; amp*=0.5; P*=2; } return a/tot; };
  const FT={}, ftab=(P,s)=>{ const k=P*1000+s; let t=FT[k]; if(t) return t; t=FT[k]=new Float32Array(P*P*2);
    for(let j=0;j<P;j++) for(let i=0;i<P;i++){ t[(j*P+i)*2]=hash(i,j,s); t[(j*P+i)*2+1]=hash(i,j,s+17); } return t; };
  const WR=[0,0], wor=(u,v,P,s)=>{ const x=u*P, y=v*P, xi=Math.floor(x), yi=Math.floor(y), T=ftab(P,s); let f1=81,f2=81;
    for(let dj=-1;dj<=1;dj++) for(let di=-1;di<=1;di++){ const ci=xi+di, cj=yi+dj, o=((((cj%P)+P)%P)*P+(((ci%P)+P)%P))*2;
      const dx=ci+T[o]-x, dy=cj+T[o+1]-y, d=dx*dx+dy*dy; if(d<f1){ f2=f1; f1=d; } else if(d<f2) f2=d; }
    WR[0]=Math.sqrt(f1); WR[1]=Math.sqrt(f2); return WR; };
  const ss=(a,b,x)=>{ const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){
    const u=i/N, v=j/N, o=(j*N+i)*4;
    let w=wor(u,v,16,3); const f1=w[0], f2=w[1]; w=wor(u,v,7,9); const g1=w[0], g2=w[1];
    const R=0.55*ss(0.0,0.30,f2-f1)+0.25*(1-Math.min(1,f1*1.2))+0.20*ss(0.0,0.35,g2-g1);
    const G=0.5+0.75*fbm(u,v,4,5,11);
    const B=0.5+0.8*fbm(u,v,5,4,31)-0.12*(1-ss(0.0,0.18,g1));
    const wu=u+0.06*fbm(u,v,3,3,51), wv=v+0.06*fbm(u+0.37,v+0.11,3,3,61);
    const r1=1-Math.abs(fbm(wu,wv,3,3,71))*2.2, r2=1-Math.abs(fbm(wu,wv,6,3,81))*2.2;
    const A=Math.max(ss(0.80,0.96,r1), 0.55*ss(0.84,0.97,r2));
    D[o]=Math.round(255*Math.min(1,Math.max(0,R))); D[o+1]=Math.round(255*Math.min(1,Math.max(0,G)));
    D[o+2]=Math.round(255*Math.min(1,Math.max(0,B))); D[o+3]=Math.round(255*Math.min(1,Math.max(0,A)));
  }
  const t=new THREE.DataTexture(D,N,N,THREE.RGBAFormat);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter;
  t.generateMipmaps=true; t.anisotropy=renderer.capabilities.getMaxAnisotropy(); t.needsUpdate=true; return t;   // v44: device maximum (was 4)
})();
/* per-organ settings. S: repeats per model unit for the fine / mid / vessel samples.
   K: bump from lobulation, bump from undulation, albedo mottling, bump from vessels.
   K2: vessel darkening, roughness variation, clearcoat breakup. vein: albedo multiplier along vessels. rim: fresnel glow */
const SKIN={
  liver:   {S:[2.4,1.3,1.1], K:[0.0005,0.0022,0.14,0.0000], K2:[0.06,0.12,0.25], vein:0x5A2A40, rim:0x7A2A22},
  stomach: {S:[3.0,1.3,1.4], K:[0.0012,0.0070,0.07,0.0020], K2:[0.24,0.20,0.45], vein:0x9A4A62, rim:0xE6A08E},
  duodenum:{S:[3.2,1.8,1.8], K:[0.0012,0.0060,0.07,0.0018], K2:[0.22,0.20,0.45], vein:0x9A4A62, rim:0xE0A088},
  oes:     {S:[5.0,2.0,2.0], K:[0.0010,0.0050,0.06,0.0016], K2:[0.24,0.25,0.55], vein:0x9A4A62, rim:0xE0A088},
  spleen:  {S:[6.0,1.4,1.4], K:[0.0016,0.0055,0.12,0.0012], K2:[0.18,0.30,0.55], vein:0x3A1830, rim:0x8A3048},
  pancreas:{S:[2.6,2.0,1.6], K:[0.0110,0.0040,0.10,0.0000], K2:[0.10,0.50,0.70], vein:0xA0604A, rim:0xE8C08A},
  kidney:  {S:[5.0,1.8,1.8], K:[0.0010,0.0045,0.10,0.0012], K2:[0.20,0.25,0.50], vein:0x4A1E28, rim:0x9A4A38},
  gb:      {S:[6.0,2.2,2.2], K:[0.0006,0.0030,0.06,0.0012], K2:[0.25,0.20,0.40], vein:0x2E4A20, rim:0x9ABF6A},
  serosa:  {S:[6.0,3.0,3.0], K:[0.0006,0.0020,0.10,0.0008], K2:[0.25,0.25,0.40], vein:0xB06A6A, rim:0xF0D8C0},
  bone:    {S:[9.0,2.6,2.0], K:[0.0016,0.0026,0.10,0.0000], K2:[0.00,0.40,0.60], vein:0xB8A888, rim:0xE8DCC4},
  cart:    {S:[6.0,2.4,2.0], K:[0.0005,0.0018,0.06,0.0000], K2:[0.00,0.20,0.40], vein:0xB89A5C, rim:0xF0DDB0},
  dia:     {S:[8.0,3.0,2.4], K:[0.0007,0.0020,0.08,0.0005], K2:[0.15,0.30,0.45], vein:0xA05050, rim:0xF0C8C0}
};
const SKIN_ENV={liver:1.0,stomach:1.15,duodenum:1.1,oes:1.0,spleen:0.95,pancreas:0.6,kidney:0.8,gb:1.0,serosa:1.1,bone:0.55,cart:0.9,dia:0.95};
function skin(m,kind,rest=false){
  const k=SKIN[kind]; if(!k||m.userData.skin) return m;
  const lite=innerWidth<=860||(innerHeight<=520&&matchMedia('(pointer:coarse)').matches), liv=kind==='liver';
  m.envMapIntensity=(SKIN_ENV[kind]??1)*R36.env; m.userData.skinKind=kind;
  const U={tSkin:{value:SKIN_TEX}, uSkS:{value:new THREE.Vector3(...k.S)}, uSkK:{value:new THREE.Vector4(...k.K)},
           uSkK2:{value:new THREE.Vector3(...k.K2)}, uSkVein:{value:new THREE.Color(k.vein)}, uSkRim:{value:new THREE.Color(k.rim).multiplyScalar(0.22)}, uSkLob:{value:1}, uSkDbg:{value:0},
           tLvA:{value:null}, tLvO:{value:null}, tOrgO:{value:null}, uLvTis:{value:new THREE.Color(C.tissue)}, uLvMean:{value:new THREE.Color(0x6A3130)}, uLvNod:{value:0}};
  m.userData.skin=U;
  if(rest) m.defines=Object.assign(m.defines||{},{SKIN_REST:''});
  if(lite) m.defines=Object.assign(m.defines||{},{SKIN_LITE:''});
  if(liv) m.defines=Object.assign(m.defines||{},{SKIN_LIVER:''});
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,m.userData.skin);
    sh.vertexShader=sh.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vSkP; varying vec3 vSkN;\n#ifdef SKIN_REST\nattribute vec3 skinP;\n#endif')
      .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef SKIN_REST\nvSkP=skinP;\n#else\nvSkP=transformed;\n#endif\nvSkN=objectNormal;');
    sh.fragmentShader=sh.fragmentShader
      .replace('#include <common>',`#include <common>
uniform sampler2D tSkin; uniform vec3 uSkS; uniform vec4 uSkK; uniform vec3 uSkK2; uniform vec3 uSkVein; uniform vec3 uSkRim; uniform float uSkLob; uniform float uSkDbg;
uniform sampler2D tLvA; uniform sampler2D tLvO; uniform vec3 uLvTis; uniform vec3 uLvMean; uniform float uLvNod; uniform sampler2D tOrgO;
varying vec3 vSkP; varying vec3 vSkN;
vec4 skTri(float s, vec3 w){ vec3 p=vSkP*s;
  return texture2D(tSkin,p.yz)*w.x+texture2D(tSkin,p.zx+vec2(0.37,0.11))*w.y+texture2D(tSkin,p.xy+vec2(0.71,0.53))*w.z; }
vec3 skPerturb(vec3 sp, vec3 sn, vec2 dH, float fd){ vec3 sx=dFdx(sp), sy=dFdy(sp); vec3 r1=cross(sy,sn), r2=cross(sn,sx);
  float det=dot(sx,r1)*fd; vec3 gr=sign(det)*(dH.x*r1+dH.y*r2); return normalize(abs(det)*sn-gr); }`)
      .replace('#include <color_fragment>',`#include <color_fragment>
vec3 skW=pow(abs(normalize(vSkN)),vec3(4.0)); skW/=(skW.x+skW.y+skW.z);
#ifdef SKIN_LITE
vec4 skM=skTri(uSkS.y,skW), skF=skM, skV=skM;
#else
vec4 skF=skTri(uSkS.x,skW), skM=skTri(uSkS.y,skW), skV=skTri(uSkS.z,skW);
#endif
float skFw=length(fwidth(vSkP));                     // model units per pixel: fade detail finer than ~3 px
float skAF=(1.0-smoothstep(0.12,0.40,skFw*uSkS.x*16.0))*uSkLob, skAM=1.0-smoothstep(0.10,0.35,skFw*uSkS.y*24.0), skAV=1.0-smoothstep(0.10,0.35,skFw*uSkS.z*12.0);
float skH=uSkK.x*skAF*skF.r+uSkK.y*skAM*skM.g+uSkK.w*skAV*skV.a;
diffuseColor.rgb*=(1.0+uSkK.z*(skM.b-0.5)*2.0)*(1.0-uSkK.z*0.30*skAF*(1.0-skF.r));
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*uSkVein*1.6,clamp(uSkK2.x*skV.a*(0.4+0.6*skAV),0.0,1.0));
float skMat=0.0;
#ifdef SKIN_LIVER
{ vec3 p=vSkP, n=normalize(vSkN);
  // bare area: posterior–superior surface of the right lobe up to and around the IVC groove (no peritoneum)
  float bare=(1.0-smoothstep(0.6,1.0,length((p-vec3(-0.30,0.38,-0.62))/vec3(0.80,0.50,0.62))))*smoothstep(-0.10,-0.45,n.z);
  float grv=(1.0-smoothstep(0.22,0.34,length(p.xz-vec2(0.15,-0.02))))*smoothstep(0.05,0.30,p.y)*smoothstep(0.10,-0.30,n.z);
  // gallbladder bed: along the fossa from neck to fundus, on the downward-facing visceral surface
  vec3 a=vec3(-0.515,-0.42,0.33), b=vec3(-0.70,-0.80,0.92); float h=clamp(dot(p-a,b-a)/dot(b-a,b-a),0.0,1.0);
  float bed=(1.0-smoothstep(0.16,0.26,length(p-a-(b-a)*h)))*smoothstep(0.05,-0.35,n.y);
  skMat=clamp(max(max(bare,grv),bed),0.0,1.0); }
#ifdef SKIN_TEX42
// v42: baked colour modulates the vertex colour. Healthy tissue takes the map's full hue; pathology colours
// (fat, iron, congestion, cirrhosis) keep their hue and take only the map's light/dark pattern, so every overlay still reads.
vec3 lvA=texture2D(tLvA,vNormalMapUv).rgb, lvR=lvA/max(uLvMean,vec3(1e-3)), lvH=lvA/max(uLvTis,vec3(1e-3)); vec4 lvO=texture2D(tLvO,vNormalMapUv);
float lvW=clamp(length(vColor.rgb-uLvTis)*7.0,0.0,1.0), lvL=dot(lvR,vec3(0.2126,0.7152,0.0722));
diffuseColor.rgb*=mix(lvH,vec3(lvL),lvW)*mix(1.0,0.85+0.15*lvO.r,uLvNod);
#endif
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,0.1,0.1),uSkDbg*skMat);
#endif`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n#ifdef SKIN_ORG44\nvec4 orgO=texture2D(tOrgO,vNormalMapUv); roughnessFactor=orgO.g;\n#endif\nroughnessFactor=clamp(roughnessFactor*(1.0+uSkK2.y*skAF*(0.5-skF.r)*2.0),0.04,1.0);\n#ifdef SKIN_TEX42\nroughnessFactor=clamp(roughnessFactor+(lvO.g-0.36)*(1.0-0.5*lvW),0.08,1.0);\n#endif')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=skPerturb(-vViewPosition,normal,vec2(dFdx(skH),dFdy(skH)),faceDirection);')
      .replace('#include <clearcoat_normal_fragment_begin>','#include <clearcoat_normal_fragment_begin>\n#ifdef USE_CLEARCOAT\nclearcoatNormal=normalize(mix(nonPerturbedNormal,normal,uSkK2.z));\n#endif')
      .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n#if defined(SKIN_ORG44)&&defined(USE_CLEARCOAT)\nmaterial.clearcoat*=orgO.b;\n#endif\n#ifdef SKIN_LIVER\nmaterial.roughness=mix(material.roughness,0.74,skMat);\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat*=1.0-0.85*skMat; material.clearcoatRoughness=mix(material.clearcoatRoughness,0.6,skMat);\n#ifdef SKIN_TEX42\nmaterial.clearcoat*=mix(0.35,1.0,lvO.b); material.clearcoatRoughness=clamp(material.clearcoatRoughness+0.22*(1.0-lvO.b),0.0,1.0);\n#endif\n#endif\n#ifdef USE_SHEEN\nmaterial.sheenColor*=1.0-0.7*skMat;\n#endif\n#endif')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{ float skFr=1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0); totalEmissiveRadiance+=uSkRim*skFr*skFr*(0.6+0.8*skM.g); }');
  };
  if(kind==='dia'){ const ob=m.onBeforeCompile; m.onBeforeCompile=sh=>{ ob(sh); sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_begin>',
    '{ float tw=smoothstep(0.50,0.72,vColor.g); material.roughness=mix(material.roughness,0.26,tw); }\n#include <lights_fragment_begin>'); }; }   // v41: glossy central tendon
  { const ob=m.onBeforeCompile; m.onBeforeCompile=sh=>{ ob(sh); sh.fragmentShader=sh.fragmentShader.replace('#include <aomap_fragment>',
    '#include <aomap_fragment>\n#ifdef SKIN_ORG44\n{ reflectedLight.indirectDiffuse*=mix(1.0,orgO.r,0.8); reflectedLight.indirectSpecular*=mix(1.0,orgO.r,0.5); }\n#endif'); }; }
  if(liv){ const ob=m.onBeforeCompile; m.onBeforeCompile=sh=>{ ob(sh); sh.fragmentShader=sh.fragmentShader.replace('#include <aomap_fragment>',
    '#include <aomap_fragment>\n#ifdef SKIN_TEX42\n{ float lvAO=mix(1.0,lvO.r,0.85); reflectedLight.indirectDiffuse*=lvAO; reflectedLight.indirectSpecular*=mix(1.0,lvO.r,0.6); }\n#endif'); }; }
  m.customProgramCacheKey=()=>'skin'+(rest?'R':'')+(lite?'L':'')+(liv?'V':'')+(kind==='dia'?'D':'')+(m.defines&&m.defines.SKIN_TEX42!==undefined?'T':'')+(m.defines&&m.defines.SKIN_ORG44!==undefined?'O':'');
  m.needsUpdate=true; return m;
}
function tube(pts,r,seg=24,rad=8){
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rad, false);
}
/** tube whose radius varies along its length — ducts, gallbladder, tapering vessels */
function varTube(pts, rFn, N=48, R=14, cap=true){
  const curve = new THREE.CatmullRomCurve3(pts);
  const fr = curve.computeFrenetFrames(N, false);
  const pos=[], nor=[], idx=[], p=new THREE.Vector3();
  for(let i=0;i<=N;i++){
    const t=i/N; curve.getPointAt(t,p); const r=rFn(t);
    const nm=fr.normals[i], bn=fr.binormals[i];
    for(let j=0;j<=R;j++){
      const a=j/R*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
      const nx=nm.x*ca+bn.x*sa, ny=nm.y*ca+bn.y*sa, nz=nm.z*ca+bn.z*sa;
      pos.push(p.x+nx*r, p.y+ny*r, p.z+nz*r); nor.push(nx,ny,nz);
    }
  }
  for(let i=0;i<N;i++) for(let j=0;j<R;j++){
    const a=i*(R+1)+j, b=a+R+1;
    idx.push(a,a+1,b, b,a+1,b+1);
  }
  if(cap){
    const base=pos.length/3;
    const p0=curve.getPointAt(0), p1=curve.getPointAt(1);
    const t0=curve.getTangentAt(0), t1=curve.getTangentAt(1);
    pos.push(p0.x,p0.y,p0.z); nor.push(-t0.x,-t0.y,-t0.z);
    pos.push(p1.x,p1.y,p1.z); nor.push(t1.x,t1.y,t1.z);
    const last=N*(R+1);
    for(let j=0;j<R;j++){ idx.push(base, j+1, j); idx.push(base+1, last+j, last+j+1); }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor,3));
  g.setIndex(idx); g.computeBoundingSphere();
  return g;
}
function perp(v){
  const a = Math.abs(v.x)<0.9 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0);
  return new THREE.Vector3().crossVectors(v,a).normalize();
}
const tag = (o,name)=>{ o.userData.pick=name; return o; };
const tagAll = (o,name)=>{ o.traverse(c=>{ if(c.isMesh) c.userData.pick=name; }); return o; };

function registerFade(obj){
  obj.traverse(o=>{ if(o.isMesh||o.isPoints){
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{
      if(m && m.userData.baseOpacity===undefined){ m.userData.baseOpacity=m.opacity; m.transparent=true; }});
  }});
}
function setFade(obj,k,outgoing){
  const walk=(o,g)=>{ const gk=o.userData.keepInGhost ? 1 : g*(o.userData.ghostK??1);
    if(o.isMesh||o.isPoints){ const f=(o.isInstancedMesh&&o.userData.noPick)?g:gk;
      (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{
        if(!m) return;
        const b=m.userData.baseOpacity ?? 1;
        m.opacity=b*k*f;
        m.depthWrite = outgoing ? false : (m.opacity>0.9 && b>=0.99 && f>=1);
      }); }
    for(const c of o.children) walk(c,gk); };
  walk(obj,1);
}

/* ════════════ liver envelope (signed distance field) ════════════ */
function sdEllipsoid(px,py,pz,cx,cy,cz,rx,ry,rz){
  const x=px-cx,y=py-cy,z=pz-cz;
  const k0=Math.sqrt((x/rx)**2+(y/ry)**2+(z/rz)**2);
  const k1=Math.sqrt((x/(rx*rx))**2+(y/(ry*ry))**2+(z/(rz*rz))**2);
  if(k1===0) return -Math.min(rx,ry,rz);
  return k0*(k0-1)/k1;
}
function sdBox(px,py,pz,cx,cy,cz,bx,by,bz){
  const dx=Math.abs(px-cx)-bx, dy=Math.abs(py-cy)-by, dz=Math.abs(pz-cz)-bz;
  const mx=Math.max(dx,0), my=Math.max(dy,0), mz=Math.max(dz,0);
  return Math.sqrt(mx*mx+my*my+mz*mz)+Math.min(Math.max(dx,Math.max(dy,dz)),0);
}
const sdRB=(px,py,pz,cx,cy,cz,bx,by,bz,r)=>sdBox(px,py,pz,cx,cy,cz,bx-r,by-r,bz-r)-r;
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*0.25;};
const smax=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k*0.25;};

/* Envelope baked offline from the reference GLB (Meshy "Human Liver Anatomy"): the mesh was
   mirrored in x to anatomical handedness, uniformly scaled and centred, voxelised at 0.05 and
   converted to a signed distance field (negative inside), stored as int8 in 1/64 units. */
const LD = JSON.parse(document.getElementById('liver-data').textContent);
const CT_MODE = CT_REQ && !!LD.ct;
const LDL = CT_MODE ? LD.ct : LD;          // the envelope in use: v13 (default) or the CT case
if(CT_MODE){ const hl=new THREE.DirectionalLight(0xFFF1E6,R36.cam); LIGHTS.cam=hl; hl.position.set(0.35,0.45,1); hl.target.position.set(0,0,-1);
  camera.add(hl); camera.add(hl.target); scene.add(camera); }
function b64(str){ const bin=atob(str), u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
const SDF_Q = new Int8Array(b64(LDL.sdf).buffer);
const [SNX,SNY,SNZ] = LDL.sdfN, SO = LDL.sdfO, SPITCH = LDL.sdfP;
const SURF = CT_MODE ? LDL.SURF : -0.03;   // v13: the field's zero level sits ~0.03 outside the mesh; CT: exact distance, re-derived
function sdfLiver(x,y,z){
  const fx=(x-SO[0])/SPITCH, fy=(y-SO[1])/SPITCH, fz=(z-SO[2])/SPITCH;
  if(fx<0||fy<0||fz<0||fx>=SNX-1||fy>=SNY-1||fz>=SNZ-1) return 1.0;
  const i=fx|0, j=fy|0, k=fz|0, u=fx-i, v=fy-j, w=fz-k;
  const at=(a,b,c)=>SDF_Q[((i+a)*SNY+(j+b))*SNZ+(k+c)];
  const c00=at(0,0,0)*(1-u)+at(1,0,0)*u, c10=at(0,1,0)*(1-u)+at(1,1,0)*u;
  const c01=at(0,0,1)*(1-u)+at(1,0,1)*u, c11=at(0,1,1)*(1-u)+at(1,1,1)*u;
  const c0=c00*(1-v)+c10*v, c1=c01*(1-v)+c11*v;
  return (c0*(1-w)+c1*w)/64;
}
/* thin parts of the model that are not parenchyma: the two outflow stubs and the hanging teres */
const inStubOrTeres= CT_MODE ? ()=>false : (x,y,z)=> y>0.93 || (Math.abs(x-0.05)<0.2 && y<-0.50 && Math.abs(z)<0.2);
/* Couinaud classification by the standard planes */
/* Planes solved against the baked envelope for published proportions:
   right hemiliver 62%, anterior sector 35%, posterior 27%, caudate 2%; the umbilical plane
   follows the model's visible falciform / umbilical fissure rather than a volume target. */
/* v13 offsets by default; ?liver=ct uses the same planes with offsets refitted to the CT envelope (build log) */
const SEGP = CT_MODE ? LDL.seg : {cx:-0.05,cy:0.25,cz:-0.70,yp:-0.15,cant:0.12,rhv:0.50,ua:0.155,ub:0.10,l23:0.10};
function segAt(x,y,z){
  if(((x-SEGP.cx)/0.30)**2 + ((y-SEGP.cy)/0.38)**2 + ((z-SEGP.cz)/0.26)**2 < 1) return 0;   // I
  const yp = SEGP.yp;                                      // portal plane
  const cant = 0.948*x + 0.318*z + SEGP.cant;                 // Cantlie: GB fossa -> retrohepatic IVC
  if(cant < 0){
    const rhv = 0.414*x + 0.910*z + SEGP.rhv;                // right hepatic vein plane
    if(rhv > 0) return y>yp ? 8 : 5;                     // VIII / V
    return y>yp ? 7 : 6;                                 // VII / VI
  }
  const umb = x - SEGP.ua - SEGP.ub*z;                        // umbilical fissure along the falciform
  if(umb > 0) return (y*0.78 - z*0.62) > SEGP.l23 ? 1 : 2;   // II posterosuperior / III anteroinferior
  return y>yp ? 3 : 4;                                   // IVa / IVb
}
/* falciform line on the surface: v13 follows the model's ridge; CT follows the umbilical fissure measured on the scan */
const FALC = CT_MODE ? LDL.falc : {a:0.155,b:0.10};
const falcX = z => FALC.a + FALC.b*z;
const falcZone = CT_MODE ? (x,y,z)=> y>-0.75 && (z>0.30 || (y>0.45 && z>-0.35)) : (x,y,z)=> y>-0.42 && (z>0.35||y>0.55);
if(CT_MODE){
  TIERS[0].annos.splice(0,TIERS[0].annos.length,...[{"p": [-1.05, 0.25, 0.3], "l": "Right lobe", "layer": "parenchyma", "surface": 1}, {"p": [0.6, 0.3, 0.45], "l": "Left lobe", "layer": "parenchyma", "surface": 1}, {"p": [0.26, 0.1, 0.217], "l": "Caudate lobe", "layer": "parenchyma", "chip": 1}, {"p": [-0.26, -0.3, 0.22], "l": "Porta hepatis", "layer": "parenchyma"}, {"p": [-0.6, 0.55, 0.3], "l": "Glisson’s capsule", "layer": "parenchyma", "chip": 1, "surface": 1}, {"p": [-0.314, 0.25, 0.8], "l": "Falciform ligament", "layer": "parenchyma", "surface": 1}, {"p": [-0.593, -0.633, 0.693], "l": "Gallbladder", "layer": "biliary"}, {"p": [-0.08, -0.66, 0.40], "l": "Common bile duct", "layer": "biliary"}, {"p": [-0.273, -1.049, 0.259], "l": "Ampulla of Vater", "layer": "biliary", "chip": 1}, {"p": [0.1, -0.36, 0.37], "l": "Portal trunk", "layer": "portal"}, {"p": [-0.45, -0.11, 0.115], "l": "Right portal vein", "layer": "portal"}, {"p": [-0.24, -0.05, 0.3], "l": "Left portal vein", "layer": "portal"}, {"p": [0.35, -0.9, 0.6], "l": "Superior mesenteric vein", "layer": "portal"}, {"p": [1.348, -0.291, -0.336], "l": "Splenic vein", "layer": "portal"}, {"p": [0.66, -0.12, 0.32], "l": "Left gastric vein", "layer": "portal", "chip": 1}, {"p": [0.78, 0.7, -0.45], "l": "Aorta", "layer": "artery"}, {"p": [0.58, -0.38, 0.22], "l": "Coeliac trunk", "layer": "artery", "chip": 1}, {"p": [0.36, -0.4, 0.32], "l": "Common hepatic artery", "layer": "artery", "chip": 1}, {"p": [-0.08, -0.26, 0.4], "l": "Proper hepatic artery", "layer": "artery"}, {"p": [1.082, -0.291, -0.213], "l": "Splenic artery", "layer": "artery"}, {"p": [0.5, -0.95, 0.48], "l": "Superior mesenteric artery", "layer": "artery", "chip": 1}, {"p": [0.1, -0.62, 0.56], "l": "Gastroduodenal artery", "layer": "artery", "chip": 1}, {"p": [-0.5, -0.26, 0.31], "l": "Cystic artery", "layer": "artery", "chip": 1}, {"p": [0.26, 0.93, -0.03], "l": "IVC", "layer": "hepaticVein"}, {"p": [-1.0, 0.4, -0.19], "l": "Right hepatic vein", "layer": "hepaticVein"}, {"p": [-0.12, 0.52, 0.28], "l": "Middle hepatic vein", "layer": "hepaticVein"}, {"p": [0.45, 0.15, 0.78], "l": "Left hepatic vein", "layer": "hepaticVein"}, {"p": [0.8, -0.7, -0.35], "l": "Left renal vein", "layer": "hepaticVein", "chip": 1}, {"p": [2.407, 0.449, -0.028], "l": "Spleen", "layer": "spleen"}, {"p": [0.932, -0.796, 1.265], "l": "Stomach", "layer": "stomach"}, {"p": [0.099, -1.224, 0.424], "l": "Pancreas", "layer": "pancreas"}, {"p": [0.228, -1.817, 0.444], "l": "Duodenum", "layer": "duodenum"}, {"p": [-0.658, -1.528, -0.387], "l": "Right kidney", "layer": "kidneys"}, {"p": [0.335, 1.245, -0.412], "l": "Oesophagus", "layer": "esophagus", "chip": 1}, {"p": [1.584, -1.468, -0.635], "l": "Left kidney", "layer": "kidneys", "chip": 1}, {"p": [-0.02, -0.6, -0.4], "l": "Renal artery", "layer": "kidneys", "chip": 1}, {"p": [-0.1, -0.69, -0.25], "l": "Renal vein", "layer": "kidneys", "chip": 1}, {"p": [0, 0, 0], "l": "About this anatomy", "chip": 1}]);
  TIERS[0].sub='≈ 19 cm transverse · CT-derived · layered';
  TIERS[0].lede='A macroscopic view of the hepatobiliary and gastrointestinal systems of an example patient.';
}
/* v13 anchor coordinate -> the same anatomical point on the CT case (built offline, ctmap.json) */
const CTP={"-0.280,0.060,0.000":[-0.28,-0.1,0.2],"-0.280,-0.160,0.000":[-0.26,-0.3,0.22],"-0.660,0.040,-0.050":[-0.62,-0.12,0.03],"-0.820,0.020,0.240":[-0.72,-0.09,0.11],"-0.920,0.020,-0.340":[-0.76,-0.09,-0.14],"0.120,0.100,-0.080":[-0.2,0.0,0.4],"0.180,0.100,0.180":[-0.16,-0.08,0.58],"0.210,0.060,0.460":[-0.05,-0.18,0.78],"-0.480,0.060,-0.040":[-0.45,-0.11,0.115],"-0.740,0.030,0.100":[-0.67,-0.105,0.07],"-0.800,0.030,-0.200":[-0.69,-0.105,-0.055],"-0.060,0.090,-0.100":[-0.24,-0.05,0.3],"0.220,-1.480,-0.420":[0.42,-0.52,0.49],"0.020,-0.950,-0.260":[0.1,-0.36,0.37],"-0.180,-0.450,-0.080":[-0.12,-0.25,0.27],"0.080,-1.120,-0.320":[0.26,-0.44,0.43],"0.160,-2.150,-0.220":[0.3,-1.3,0.62],"0.180,-1.800,-0.300":[0.35,-0.9,0.6],"1.620,-1.180,-0.720":[1.641,0.014,-0.585],"1.000,-1.320,-0.660":[1.08,-0.2,0.06],"0.550,-1.420,-0.550":[0.66,-0.279,0.335],"0.700,-2.100,-0.620":[0.86,-1.2,0.42],"0.720,-1.750,-0.620":[0.83,-0.85,0.44],"0.720,-1.390,-0.600":[0.78,-0.525,0.093],"0.560,-0.620,-0.420":[0.82,0.24,0.08],"0.400,-0.980,-0.420":[0.66,-0.12,0.32],"0.150,-1.300,-0.370":[0.46,-0.46,0.47],"0.900,-1.300,-0.660":[0.88,-0.321,-0.171],"1.700,-0.950,-0.780":[1.9,0.3,-0.36],"-0.330,1.300,0.060":[0.29,1.1,-0.05],"-0.330,0.970,0.000":[0.26,0.93,-0.03],"-0.330,0.550,-0.400":[0.12,0.5,0.06],"-0.310,-0.100,-0.600":[0.05,-0.06,-0.07],"-0.290,-0.700,-0.600":[0.0,-0.4,0.03],"-0.270,-1.400,-0.520":[-0.04,-0.6,0.07],"-0.260,-1.600,-0.520":[-0.03,-0.68,0.09],"-0.250,-1.800,-0.500":[-0.02,-0.75,0.1],"-0.240,-2.200,-0.480":[0.06,-1.25,0.13],"-0.070,0.970,0.030":[0.82,1.2,-0.61],"-0.040,0.700,-0.620":[0.78,0.7,-0.45],"0.020,0.100,-1.080":[0.66,0.1,-0.2],"0.050,-1.000,-1.120":[0.57,-0.4,-0.05],"0.060,-2.150,-1.020":[0.4,-1.4,0.21],"0.050,-1.020,-1.100":[0.58,-0.36,0.02],"0.060,-1.060,-0.980":[0.58,-0.37,0.12],"0.070,-1.080,-0.860":[0.58,-0.38,0.22],"-0.120,-1.120,-0.560":[0.15,-0.42,0.4],"0.300,-0.920,-0.740":[0.7,-0.1,0.2],"0.500,-0.660,-0.520":[0.8,0.22,0.1],"0.350,-1.120,-0.900":[0.72,-0.3,0.33],"0.620,-1.020,-0.840":[0.957,-0.252,-0.075],"0.900,-1.120,-0.860":[1.082,-0.291,-0.213],"1.200,-1.020,-0.820":[1.279,-0.176,-0.351],"1.580,-1.080,-0.800":[1.644,0.081,-0.46],"-0.040,-1.100,-0.740":[0.36,-0.4,0.32],"-0.160,-1.400,-0.400":[0.1,-0.62,0.56],"-0.120,-1.780,-0.240":[0.06,-0.92,0.62],"-0.020,-0.800,0.020":[0.06,-0.36,0.46],"-0.060,-0.450,0.140":[-0.08,-0.26,0.4],"-0.180,-0.150,0.150":[-0.2,-0.17,0.34],"-0.400,0.100,0.070":[-0.45,-0.1,0.26],"-0.380,-0.120,0.180":[-0.5,-0.26,0.31],"-0.310,-0.380,0.230":[-0.53,-0.4,0.35],"0.050,-1.260,-1.120":[0.55,-0.5,0.06],"0.220,-1.420,-0.840":[0.55,-0.62,0.28],"0.330,-1.780,-0.560":[0.5,-0.95,0.48],"0.360,-2.150,-0.440":[0.47,-1.3,0.52],"-0.330,0.800,-0.160":[0.12,0.7,0.1],"-0.200,0.800,-0.100":[0.26,0.72,0.16],"-0.600,0.660,-0.200":[-0.3,0.6,0.0],"-0.950,0.400,-0.140":[-1.0,0.4,-0.19],"-1.150,0.020,-0.040":[-1.2,0.0,-0.1],"-1.280,-0.450,0.040":[-1.3,-0.45,-0.03],"-0.160,0.520,0.080":[-0.12,0.52,0.28],"-0.200,0.150,0.300":[-0.6,0.12,0.45],"-0.280,-0.140,0.580":[-0.72,-0.25,0.75],"0.180,0.620,-0.060":[0.3,0.45,0.45],"0.620,0.340,0.020":[0.45,0.15,0.78],"1.080,0.200,0.080":[0.72,-0.05,0.95],"-0.020,0.320,-0.620":[0.3,0.2,0.15],"-0.160,0.280,-0.600":[0.18,0.18,0.06],"-0.300,0.240,-0.560":[0.1,0.16,0.0],"-0.060,0.080,-0.660":[0.3,0.0,0.12],"-0.180,0.060,-0.630":[0.18,-0.02,0.03],"-0.300,0.040,-0.600":[0.08,-0.04,-0.03],"-0.280,0.160,-0.560":[0.1,0.16,-0.02],"-0.470,0.058,-0.040":[-0.44,-0.13,0.07],"-0.580,0.200,-0.090":[-0.52,0.05,-0.02],"-0.680,0.400,-0.150":[-0.56,0.28,-0.08],"-0.650,0.600,-0.200":[-0.46,0.5,-0.08],"-0.500,0.730,-0.190":[-0.22,0.64,-0.02],"-0.370,0.800,-0.160":[0.04,0.7,0.06],"-0.330,0.870,-0.110":[0.16,0.8,0.03],"-0.400,0.060,-0.020":[-0.4,-0.12,0.1],"0.300,1.320,-0.880":[0.43,1.25,-0.42],"0.330,0.620,-0.860":[0.51,0.87,-0.32],"0.380,0.020,-0.820":[0.57,0.68,-0.22],"0.460,-0.360,-0.720":[0.71,0.49,-0.04],"0.600,-0.560,-0.540":[0.87,0.36,0.0],"1.050,-0.300,-0.620":[1.418,0.423,-0.091],"1.720,-0.660,-0.800":[1.95,0.24,-0.38],"2.020,-0.740,-1.020":[1.92,0.3,-0.67],"0.700,-0.660,-0.460":[0.926,0.208,0.165],"0.840,-0.820,-0.340":[1.006,0.153,0.244],"0.900,-0.980,-0.200":[1.046,-0.3,0.605],"0.740,-0.620,-0.520":[0.959,0.159,0.137],"0.920,-0.780,-0.440":[1.135,-0.076,0.367],"1.020,-0.940,-0.300":[1.079,-0.236,0.525],"1.500,-1.220,-0.740":[1.7,0.05,-0.35],"1.420,-1.550,-0.960":[1.55,-0.3,-0.5],"1.180,-1.860,-1.100":[1.3,-0.55,-0.6],"0.930,-2.080,-1.160":[1.07,-0.67,-0.62],"0.550,-1.990,-1.100":[0.8,-0.7,-0.35],"0.070,-1.900,-0.900":[0.48,-0.72,0.2],"-0.220,-1.900,-0.520":[0.04,-0.72,0.12],"-0.120,-1.250,-1.160":[0.33,-0.55,-0.25],"-0.150,-0.400,-1.260":[0.45,0.0,-0.4],"-0.170,0.400,-1.280":[0.52,0.5,-0.6],"-0.180,1.050,-1.220":[0.58,1.0,-0.78],"-0.140,1.420,-0.950":[0.6,1.3,-0.7],"0.040,-1.420,1.120":[0.3,-1.3,2.3],"0.170,-0.300,0.420":[-0.2,-0.45,0.98],"0.120,-0.600,0.640":[-0.45,-0.86,1.24],"0.080,-1.020,0.940":[-0.113,-1.058,1.717],"-0.300,-0.240,0.120":[-0.32,-0.2,0.3],"-0.360,-0.620,0.080":[-0.4,-0.42,0.28],"-0.160,-1.580,-0.100":[-0.273,-1.049,0.259],"-0.310,-0.080,0.120":[-0.31,-0.15,0.3],"-0.330,-0.450,0.100":[-0.37,-0.32,0.3],"-0.360,-0.950,0.020":[-0.37,-0.66,0.22],"-0.280,-1.300,-0.080":[-0.31,-0.92,0.23],"0.460,-1.560,-0.280":[0.513,-0.451,0.602],"0.140,-1.600,-0.180":[0.066,-0.97,0.477],"-0.390,-0.720,0.940":[-0.901,-0.931,1.149],"-0.370,-0.680,0.700":[-0.642,-0.772,0.736],"-0.350,-0.620,0.480":[-0.593,-0.633,0.693],"-0.320,-0.520,0.320":[-0.561,-0.529,0.516],"-0.300,-0.420,0.200":[-0.515,-0.419,0.33],"-0.340,-0.520,0.140":[-0.458,-0.419,0.305]};
const PT=(x,y,z)=>{ const k=x.toFixed(3)+','+y.toFixed(3)+','+z.toFixed(3), q=CTP[k];
  if(!q){ console.warn('unmapped anchor',k); return new THREE.Vector3(x,y,z); } return new THREE.Vector3(q[0],q[1],q[2]); };
const insideLiver = p => !inStubOrTeres(p.x,p.y,p.z) && sdfLiver(p.x,p.y,p.z) < -0.08;

function modelGeometry(){
  const pos16=new Int16Array(b64(LDL.pos).buffer);
  const idx=new Uint16Array(b64(LDL.idx).buffer);
  const cls=LDL.cls ? b64(LDL.cls) : new Uint8Array(idx.length/3);   // CT: every face is parenchyma
  const n=pos16.length/3, P=new Float32Array(pos16.length);
  for(let i=0;i<pos16.length;i++) P[i]=pos16[i]*LDL.qs;
  const posAttr=new THREE.BufferAttribute(P,3);
  const col=new Float32Array(n*3), c=new THREE.Color();
  for(let v=0;v<n;v++){
    c.setHex(SEG_COL[segAt(P[v*3],P[v*3+1],P[v*3+2])]);
    col[v*3]=c.r; col[v*3+1]=c.g; col[v*3+2]=c.b;
  }
  // class 1 (outflow stubs) splits by side: the right stub is the IVC, the left one is the aorta
  const parts=[[],[],[],[]];
  for(let f=0;f<cls.length;f++){
    let k=cls[f];
    if(k===1){ const cx=(P[idx[f*3]*3]+P[idx[f*3+1]*3]+P[idx[f*3+2]*3])/3; if(cx>-0.2) k=3; }
    parts[k].push(idx[f*3],idx[f*3+1],idx[f*3+2]);
  }
  const mk=(list,withColor)=>{
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',posAttr);
    if(withColor) g.setAttribute('color',new THREE.BufferAttribute(col,3));
    g.setIndex(list); g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  };
  // parenchyma-only vertices (not shared with the stubs or teres) can be deformed by cirrhosis
  const other=new Uint8Array(n);
  for(let f=0;f<cls.length;f++) if(cls[f]) { other[idx[f*3]]=1; other[idx[f*3+1]]=1; other[idx[f*3+2]]=1; }
  const pv=[]; for(const f of new Set(parts[0])) if(!other[f]) pv.push(f);
  const paren=mk(parts[0],true);
  if(LDL.uv){ const q=new Uint16Array(b64(LDL.uv).buffer), uv=new Float32Array(q.length); for(let i=0;i<q.length;i++) uv[i]=q[i]/65535;
    paren.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    const dup=new Uint16Array(b64(LDL.dup).buffer), n0=LDL.n0, weld=g=>{ const N=g.attributes.normal.array;
      for(let k=0;k<dup.length;k++){ const a=dup[k]*3, d=(n0+k)*3; N[a]+=N[d]; N[a+1]+=N[d+1]; N[a+2]+=N[d+2]; }
      for(let k=0;k<dup.length;k++){ const a=dup[k]*3, l=Math.hypot(N[a],N[a+1],N[a+2])||1; N[a]/=l; N[a+1]/=l; N[a+2]/=l; }
      for(let k=0;k<dup.length;k++){ const a=dup[k]*3, d=(n0+k)*3; N[d]=N[a]; N[d+1]=N[a+1]; N[d+2]=N[a+2]; }
      g.attributes.normal.needsUpdate=true; };
    const cvn=paren.computeVertexNormals.bind(paren); paren.computeVertexNormals=()=>{ cvn(); weld(paren); }; paren.computeVertexNormals(); }
  return {parenchyma:paren, stubs:mk(parts[1],false), aortaStub:mk(parts[3],false), teres:mk(parts[2],false),
          posAttr, P0:P.slice(), N0:paren.attributes.normal.array.slice(), segCol:col.slice(),
          pv:Int32Array.from(pv)};
}

/* Regenerative nodules: a Worley field on the surface. F2 − F1 distance to random surface
   seeds is ~0 along the septa between nodules and peaks at nodule centres. Built lazily. */
function nodularity(MG){
  if(MG.nod) return MG.nod;
  const P=MG.P0, pv=MG.pv, n=P.length/3, NC=1100;
  const cx=new Float32Array(NC), cy=new Float32Array(NC), cz=new Float32Array(NC), cr=new Float32Array(NC);
  for(let k=0;k<NC;k++){ const v=pv[Math.floor(rng()*pv.length)];
    cx[k]=P[v*3]; cy[k]=P[v*3+1]; cz[k]=P[v*3+2]; cr[k]=0.7+rng()*0.6; }   // mixed nodule sizes
  const nod=new Float32Array(n);
  for(const v of pv){
    const x=P[v*3], y=P[v*3+1], z=P[v*3+2]; let d1=1e9, d2=1e9;
    for(let k=0;k<NC;k++){
      const dx=x-cx[k], dy=y-cy[k], dz=z-cz[k];
      const d=Math.sqrt(dx*dx+dy*dy+dz*dz)/cr[k];
      if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d;
    }
    nod[v]=Math.min(1,(d2-d1)/0.065);
  }
  return MG.nod=nod;
}
let cirrStep=-1;
function applyCirrhosis(u,f){
  const step=Math.round(f*24)/24;
  if(step===cirrStep && !u.forceCirr) return;
  cirrStep=step; u.forceCirr=false;
  u.cz={step, nod: step>0.15 ? nodularity(u.MG) : null,
    amp:0.050*THREE.MathUtils.smoothstep(step,0.40,1.0),     // nodules from F3
    rough:0.010*THREE.MathUtils.smoothstep(step,0.15,0.55),  // capsular irregularity from F1-2
    shrink:1-0.03*THREE.MathUtils.smoothstep(step,0.55,1.0), // small shrunken cirrhotic liver
    pale:THREE.MathUtils.smoothstep(step,0.20,1.0), sW:THREE.MathUtils.smoothstep(step,0.35,1.0)};
  surfaceUpdate(u);
  const pm=u.plainMat, pale=u.cz.pale;
  pm.roughness=THREE.MathUtils.lerp(0.34,0.66,pale); pm.clearcoat=THREE.MathUtils.lerp(0.85,0.22,pale);
  pm.sheen=THREE.MathUtils.lerp(0.22,0.04,pale);
  // lobular pattern gives way to the regenerative nodules from F2 to F4
  for(const mm of [u.plainMat,u.segMat]) if(mm.userData.skin) mm.userData.skin.uSkLob.value=1-THREE.MathUtils.smoothstep(step,0.5,1.0);
  if(pm.userData.cc42){ pm.clearcoat*=0.62; pm.clearcoatRoughness=0.24; pm.roughness=Math.max(pm.roughness,0.40); }
  for(const mm of [u.plainMat,u.segMat]) if(mm.normalMap) mm.normalScale.setScalar(1-0.7*THREE.MathUtils.smoothstep(step,0.2,0.8));
  if(u.surfVeins) u.surfVeins.userData.cirrFade=1-THREE.MathUtils.smoothstep(step,0.25,0.70);
}
/* v44: the falciform fold follows the parenchyma's morph (cirrhotic nodules move the capsule by up to ~±3 mm, far more
   than the 0.7 mm fold, so a rigidly scaled fold floated or sank at F3–F4): each fold vertex takes the shrink, nodule
   displacement and caudate morph of its nearest parenchyma vertex (nearest found once, on the rest shape). */
function falcFollow(MG,sc,cw,CC){
  const f=MG.falcG&&MG.falcG.children.find(o=>o.userData.pick==='Falciform ligament'); if(!f) return;
  const g=f.geometry, A=g.attributes.position, P0=MG.P0, N0=MG.N0, pv=MG.pv;
  if(!g.userData.rest){ g.userData.rest=A.array.slice(); const near=new Int32Array(A.count);
    // candidates: parenchyma vertices near the fold's bounding box
    g.computeBoundingBox(); const bb=g.boundingBox.clone().expandByScalar(0.08), cand=[];
    for(const v of pv){ const x=P0[v*3],y=P0[v*3+1],z=P0[v*3+2]; if(x>=bb.min.x&&x<=bb.max.x&&y>=bb.min.y&&y<=bb.max.y&&z>=bb.min.z&&z<=bb.max.z) cand.push(v); }
    const R=g.userData.rest; for(let i=0;i<A.count;i++){ let bd=1e9,bi=cand[0]; const x=R[i*3],y=R[i*3+1],z=R[i*3+2];
      for(const v of cand){ const d=(P0[v*3]-x)**2+(P0[v*3+1]-y)**2+(P0[v*3+2]-z)**2; if(d<bd){ bd=d; bi=v; } } near[i]=bi; }
    g.userData.near=near; }
  const R=g.userData.rest, near=g.userData.near, Q=A.array;
  for(let i=0;i<A.count;i++){ const v=near[i], d=MG.dispV[v], w=MG.caudW[v]*cw;
    for(let a=0;a<3;a++) Q[i*3+a]=R[i*3+a]*sc + N0[v*3+a]*d + (P0[v*3+a]-CC[a])*w; }
  A.needsUpdate=true; g.computeVertexNormals(); g.computeBoundingSphere();
}
/* parenchymal surface = anatomy × cirrhosis × pathology morphs (caudate hypertrophy, steatotic swelling)
   and colour = tissue → tawny cirrhosis → fatty yellow → rust (iron) → nutmeg congestion → septa */
function surfaceUpdate(u){
  const MG=u.MG, P=MG.posAttr.array, P0=MG.P0, N0=MG.N0, pv=MG.pv, cz=u.cz, m=u.P?u.P.m:{caud:0,cong:0,fat:0,iron:0};
  const n=P.length/3, nod=cz.nod;
  if(!MG.caudW){ MG.caudW=new Float32Array(n); const c=new THREE.Vector3(SEGP.cx,SEGP.cy,SEGP.cz);
    for(const v of pv){ const dx=P0[v*3]-c.x, dy=P0[v*3+1]-c.y, dz=P0[v*3+2]-c.z;
      MG.caudW[v]=Math.exp(-(dx*dx+dy*dy+dz*dz)/(2*0.30*0.30)); }
    MG.mott=new Float32Array(n);
    for(const v of pv){ const x=P0[v*3],y=P0[v*3+1],z=P0[v*3+2];
      // fine lobular speckle: dark congested centres on a paler reticulum (the nutmeg pattern)
      const a=Math.sin(x*44+1.3)*Math.sin(y*41+0.7)*Math.sin(z*47+2.1), b=Math.sin(x*23+0.4)*Math.sin(y*27+2.2)*Math.sin(z*25+1.1);
      MG.mott[v]=a*0.75+b*0.35; } }
  const sc=cz.shrink*(1+0.035*m.fat+0.02*m.cong), cw=0.24*m.caud, CC=[SEGP.cx,SEGP.cy,SEGP.cz];
  if(!MG.dispV) MG.dispV=new Float32Array(n);
  for(const v of pv){
    const b = nod ? Math.sqrt(nod[v]) : 0.5, disp=cz.amp*(b-0.55)+cz.rough*(b-0.5), w=MG.caudW[v]*cw; MG.dispV[v]=disp;
    for(let a=0;a<3;a++) P[v*3+a]=P0[v*3+a]*sc + N0[v*3+a]*disp + (P0[v*3+a]-CC[a])*w;
  }
  falcFollow(MG,sc,cw,CC);
  MG.posAttr.needsUpdate=true;
  MG.parenchyma.computeVertexNormals(); MG.parenchyma.computeBoundingSphere();
  const col=u.fibCol, base=new THREE.Color(C.tissue), tan=new THREE.Color(0x724431),
        sept=new THREE.Color(0x542818), node=new THREE.Color(0x996B56), fat=new THREE.Color(0xC49A5E),
        rust=new THREE.Color(0x8E3F12), mar=new THREE.Color(0x3C1320), paleN=new THREE.Color(0xA87A58), c=new THREE.Color();
  // falciform ligament: the model's own ridge along the umbilical fissure, coloured like the teres
  if(!MG.falc){ MG.falc=new Float32Array(n);
    for(let v=0;v<n;v++){ const x=P0[v*3],y=P0[v*3+1],z=P0[v*3+2];
      const ny=N0[v*3+1], nz=N0[v*3+2];
      if(falcZone(x,y,z) && ny>-0.05 && (ny>0.25||nz>0.45)){ const d=Math.abs(x-falcX(z));
        MG.falc[v]=1-THREE.MathUtils.smoothstep(d,0.020,0.042); } } }
  const lig=new THREE.Color(0xD9C7A2), ligOn=state.layers.ligaments;
  for(let v=0;v<n;v++){
    c.copy(base).lerp(tan,cz.pale*0.80);
    if(m.fat>0) c.lerp(fat,0.62*m.fat);
    if(m.iron>0) c.lerp(rust,0.78*m.iron);
    if(m.cong>0){ const t=MG.mott[v]||0; c.lerp(paleN,m.cong*0.50); c.lerp(mar,m.cong*0.9*THREE.MathUtils.smoothstep(t,0.05,0.45)); }
    if(nod){ const b=nod[v]; c.lerp(sept,Math.pow(1-b,2.2)*cz.sW*0.80); c.lerp(node,b*b*cz.sW*0.45); }
    col[v*3]=c.r; col[v*3+1]=c.g; col[v*3+2]=c.b;
  }
  if(MG.falcG){ MG.falcG.visible=!!ligOn; for(const t of MG.falcG.userData.teres||[]) t.scale.setScalar(cz.shrink); }
  if(!state.layers.segments){ MG.parenchyma.attributes.color.array.set(col); MG.parenchyma.attributes.color.needsUpdate=true; }
}

/* segment centroids, sampled once on a coarse grid */
const SEG_CENTROID = (()=>{
  const acc = SEG.map(()=>[0,0,0,0]);
  const GB = CT_MODE ? {x0:SO[0],x1:SO[0]+(SNX-1)*SPITCH,y0:SO[1],y1:SO[1]+(SNY-1)*SPITCH,z0:SO[2],z1:SO[2]+(SNZ-1)*SPITCH}
                     : {x0:-1.7,x1:1.7,y0:-1.45,y1:0.95,z0:-1.1,z1:1.1};
  for(let x=GB.x0;x<=GB.x1;x+=0.08) for(let y=GB.y0;y<=GB.y1;y+=0.08) for(let z=GB.z0;z<=GB.z1;z+=0.08){
    if(!inStubOrTeres(x,y,z) && sdfLiver(x,y,z) < -0.04){ const s=segAt(x,y,z);
      acc[s][0]+=x; acc[s][1]+=y; acc[s][2]+=z; acc[s][3]++; }
  }
  return acc.map(a => a[3] ? new THREE.Vector3(a[0]/a[3], a[1]/a[3], a[2]/a[3]) : new THREE.Vector3());
})();

/* ════════════ branching trees ════════════ */
function growTree(seed, dir, len, rad, depth, spread, out, limit){
  if(depth<=0 || out.length>limit) return;
  let end = seed.clone().addScaledVector(dir, len);
  if(!insideLiver(end)){
    // clip the branch to the capsule instead of discarding it
    let lo=0, hi=len;
    for(let i=0;i<12;i++){
      const m=(lo+hi)/2;
      if(insideLiver(seed.clone().addScaledVector(dir,m))) lo=m; else hi=m;
    }
    if(lo < len*0.22) return;
    end = seed.clone().addScaledVector(dir, lo);
    out.push(tube([seed, seed.clone().lerp(end,0.5), end], rad, 8, 6));
    return;
  }
  const mid = seed.clone().lerp(end,0.5).addScaledVector(perp(dir), len*0.16*(rng()-0.5));
  out.push(tube([seed, mid, end], rad, 10, 6));
  const n = depth>3 ? 2 : (rng()<0.4 ? 3 : 2);
  for(let i=0;i<n;i++){
    const ax = perp(dir).applyAxisAngle(dir, rng()*Math.PI*2);
    const nd = dir.clone().applyAxisAngle(ax, spread*(0.55+rng()*0.9)).normalize();
    nd.lerp(dir, 0.15).normalize();
    growTree(end, nd, len*(0.70+rng()*0.08), rad*0.71, depth-1, spread, out, limit);
  }
}
function treeMesh(seeds, colour, rad0, len0, depth, spread, limit, opacity){
  const parts = [];
  seeds.forEach(s=>growTree(s.p.clone(), s.d.clone().normalize(), len0, rad0, depth, spread, parts, limit));
  if(!parts.length) return null;
  const geo = BGU.mergeGeometries(parts, false);
  parts.forEach(p=>p.dispose());
  const m = mat(colour,{roughness:0.32, clearcoat:0.6, clearcoatRoughness:0.3,
    emissive:new THREE.Color(colour).multiplyScalar(0.14)});
  if(opacity!==undefined) m.opacity = opacity;
  const mesh = new THREE.Mesh(geo, m);
  mesh.userData.branches = parts.length;
  return mesh;
}
const HILUM_IN  = PT(-0.28, 0.06, 0.00);   // inside the parenchyma, above the porta
const HILUM_OUT = PT(-0.28,-0.16, 0.00);   // porta hepatis, roof of the visceral bowl
const HV_IN     = new THREE.Vector3(-0.12, 0.72,-0.02);   // beneath the model's hepatic venous outflow

/* ════════════ smooth vessel systems ════════════ */
/* Every branch is a tapered tube whose calibre falls continuously along its length; a joint sphere
   sits at each node, so parent and daughter vessels blend instead of stepping. Branches are named
   so a click on any face of the merged mesh reports the right vessel. */
class Vessels{
  constructor(){ this.segs=[]; }
  /* rf: calibre of the parent vessel at this branch's origin — the branch flares from it, so junctions blend */
  path(pts,r0,r1,name,rf){ const sg={pts:pts.map(q=>q.clone()),r0,r1,name,rf:rf||0}; this.segs.push(sg); return sg; }
  /* pd: parent direction at the origin — the first control point leaves along it, so the branch takes off
     tangentially instead of kinking at the junction */
  fill(start,dir,len,r,depth,spread,name,budget,rp,pd){
    if(depth<=0||budget.n<=0||r<0.0055) return;
    let end=start.clone().addScaledVector(dir,len), terminal=false;
    if(!insideLiver(end)){
      let lo=0,hi=len;
      for(let i=0;i<10;i++){const m=(lo+hi)/2; if(insideLiver(start.clone().addScaledVector(dir,m))) lo=m; else hi=m;}
      if(lo<len*0.25) return;
      end=start.clone().addScaledVector(dir,lo); terminal=true;
    }
    const mid=start.clone().lerp(end,0.5).addScaledVector(perp(dir),len*0.12*(rng()-0.5));
    const rEnd=terminal? r*0.55 : r*0.84;
    const pts=[start];
    if(pd){ const t0=pd.clone().multiplyScalar(0.5).add(dir.clone().multiplyScalar(0.5)).normalize();
      pts.push(start.clone().addScaledVector(t0,start.distanceTo(end)*0.22)); }
    pts.push(mid,end);
    this.path(pts,r,rEnd,name,rp||0); budget.n--;
    if(terminal) return;
    const ax=perp(dir).applyAxisAngle(dir,rng()*Math.PI*2);
    this.fill(end,dir.clone().applyAxisAngle(ax,spread*(0.15+rng()*0.3)).normalize(),len*0.82,rEnd*0.92,depth-1,spread,name,budget,rEnd,dir);
    this.fill(end,dir.clone().applyAxisAngle(ax,-spread*(0.7+rng()*0.6)).normalize(),len*0.68,rEnd*0.68,depth-1,spread,name,budget,rEnd,dir);
    if(depth>2&&rng()<0.35){
      const ax2=perp(dir).applyAxisAngle(dir,rng()*Math.PI*2);
      this.fill(end,dir.clone().applyAxisAngle(ax2,spread*(0.8+rng()*0.5)).normalize(),len*0.55,rEnd*0.5,depth-2,spread,name,budget,rEnd,dir);
    }
  }
  /* sprout a territory from the end of a named path */
  sprout(sg,n,len,depth,spread){
    const a=sg.pts[sg.pts.length-2], b=sg.pts[sg.pts.length-1];
    const d=b.clone().sub(a).normalize(), budget={n};
    for(let i=0;i<3;i++){
      const ax=perp(d).applyAxisAngle(d,i*2.1+rng());
      this.fill(b,d.clone().applyAxisAngle(ax,0.35+rng()*0.4).normalize(),len,sg.r1*0.9,depth,spread,sg.name,budget,sg.r1,d);
    }
  }
  /* tributaries along a path: small trees leaving it at intervals */
  tributaries(sg,ts,len,depth,spread){
    const c=new THREE.CatmullRomCurve3(sg.pts);
    for(const t of ts){
      const p0=c.getPointAt(t), tg=c.getTangentAt(t), r=THREE.MathUtils.lerp(sg.r0,sg.r1,t);
      for(const sgn of [1,-1]){
        const ax=perp(tg).applyAxisAngle(tg,rng()*Math.PI*2);
        const d=tg.clone().multiplyScalar(-0.35).addScaledVector(ax,sgn).normalize();
        this.fill(p0,d,len,r*0.62,depth,spread,sg.name,{n:40},r*0.9,tg.clone().negate());
      }
    }
  }
  /* a companion system (artery or duct) running beside this one */
  companion(off,scale,minR,rename){
    const c=new Vessels(), o=off.clone().normalize();
    const key=q=>`${Math.round(q.x*100)},${Math.round(q.y*100)},${Math.round(q.z*100)}`;
    const kept=[], endAt=new Map();
    for(const sg of this.segs){
      if(sg.r0<minR) continue;
      const k=sg.pts.length;
      const pts=sg.pts.map((q,i)=>{ const rp=THREE.MathUtils.lerp(sg.r0,sg.r1,k>1?i/(k-1):0);
        return q.clone().addScaledVector(o,rp*(1+scale)+0.008); });
      kept.push({sg,pts}); const ek=key(sg.pts[k-1]); if(!endAt.has(ek)) endAt.set(ek,pts[k-1]);
    }
    // a companion branch starts exactly where its parent companion ends, so the companion tree stays connected
    for(const {sg,pts} of kept){ const p=endAt.get(key(sg.pts[0])); if(p) pts[0]=p.clone();
      c.path(pts,sg.r0*scale,sg.r1*scale,rename(sg.name),sg.rf*scale); }
    return c;
  }
  /* One continuous tube per chain: at each node the daughter that best continues the parent's direction (and
     calibre) is joined to it into a single swept surface, so a trunk can be followed without seams; the other
     daughters leave the side of that tube, flaring from its calibre. A ball is kept only where no tube runs
     through a node. Faces are wound outward; ctr/bt carry the centreline and (local t, segment) per vertex. */
  mesh(color,opacity,meta){
    const segs=this.segs, S=segs.length;
    const key=q=>`${Math.round(q.x*100)},${Math.round(q.y*100)},${Math.round(q.z*100)}`;
    const byStart=new Map(); segs.forEach((sg,i)=>{ const k=key(sg.pts[0]); if(!byStart.has(k)) byStart.set(k,[]); byStart.get(k).push(i); });
    const endR=new Map(); for(const sg of segs){ const k=key(sg.pts[sg.pts.length-1]); endR.set(k,Math.max(endR.get(k)||0,sg.r1)); }
    const dEnd=sg=>{ const n=sg.pts.length; return sg.pts[n-1].clone().sub(sg.pts[n-2]).normalize(); };
    const dStart=sg=>sg.pts[1].clone().sub(sg.pts[0]).normalize();
    const next=new Int32Array(S).fill(-1), isCont=new Uint8Array(S), thru=new Set();
    segs.forEach((sg,i)=>{ const ek=key(sg.pts[sg.pts.length-1]), kids=byStart.get(ek); if(!kids) return;
      const de=dEnd(sg); let best=-1, bd=-2;
      for(const j of kids){ if(j===i||isCont[j]) continue; const c=segs[j]; if(c.r0<0.5*sg.r1) continue;
        const d=de.dot(dStart(c)); if(d>bd){ bd=d; best=j; } }
      if(best>=0 && bd>0.5){ next[i]=best; isCont[best]=1; thru.add(ek); } });
    const lenOf=sg=>{ let L=0; for(let i=1;i<sg.pts.length;i++) L+=sg.pts[i].distanceTo(sg.pts[i-1]); return L; };
    const rFnOf=(sg,rf,cont)=>{ const L=lenOf(sg);
      if(cont){ const tf=Math.min(0.5,1.2*Math.max(rf,sg.r0)/Math.max(L,1e-3));   // continuation: exact calibre at the join
        return t=>{ let r=THREE.MathUtils.lerp(sg.r0,sg.r1,t); if(t<tf){ const u=t/tf, s=1-u*u*(3-2*u); r+=(rf-sg.r0)*s; } return r; }; }
      const tf=Math.min(0.45,1.9*Math.max(rf,sg.r0)/Math.max(L,1e-3));
      return t=>{ let r=THREE.MathUtils.lerp(sg.r0,sg.r1,t);
        if(rf>sg.r0 && t<tf){ const u=t/tf, s=1-u*u*(3-2*u); r+=(rf*0.94-sg.r0)*s; } return r; }; };

    const geos=[], faceSegs=[];
    const T=new THREE.Vector3(), Nv=new THREE.Vector3(), Bv=new THREE.Vector3(), p=new THREE.Vector3(), tmp=new THREE.Vector3();
    const seen=new Uint8Array(S);
    const order=[...Array(S).keys()].filter(i=>!isCont[i]).concat([...Array(S).keys()].filter(i=>isCont[i]));
    for(const s0 of order){
      if(seen[s0]) continue;
      const chain=[]; for(let i=s0;i>=0&&!seen[i];i=next[i]){ seen[i]=1; chain.push(i); }
      // control points of the whole chain; seg c occupies control points [k0[c], k1[c]]
      const all=[], k0=[], k1=[];
      chain.forEach((si,c)=>{ const P=segs[si].pts; k0.push(c?all.length-1:0); (c?P.slice(1):P).forEach(q=>all.push(q)); k1.push(all.length-1); });
      const curve=new THREE.CatmullRomCurve3(all), n1=all.length-1, div=n1*16, Ls=curve.getLengths(div), tot=Ls[div]||1e-6;
      const uAt=k=>Ls[k*16]/tot;
      const root=segs[chain[0]], R=root.r0>0.05?18:(root.r0>0.02?14:9);
      // rings
      const rings=[];   // {u (chain arc fraction), t (local), si, r}
      chain.forEach((si,c)=>{ const sg=segs[si], L=lenOf(sg), Ni=Math.max(10,Math.min(72,Math.round(L/0.012)));
        const rf = c ? segs[chain[c-1]].r1 : (sg.rf||endR.get(key(sg.pts[0]))||0);
        const rFn=rFnOf(sg,rf,c>0), ua=uAt(k0[c]), ub=uAt(k1[c]);
        for(let i=(c?1:0);i<=Ni;i++){ const t=i/Ni; rings.push({u:ua+(ub-ua)*t,t,si,r:Math.max(0.002,rFn(t))}); } });
      const nr=rings.length, nv=nr*(R+1)+2;
      const pos=new Float32Array(nv*3), nor=new Float32Array(nv*3), ctr=meta?new Float32Array(nv*3):null, bt=meta?new Float32Array(nv*2):null;
      // parallel-transport frame: no twist along the chain
      curve.getTangentAt(0,T); Nv.set(Math.abs(T.x)<0.9?1:0, Math.abs(T.x)<0.9?0:1, 0); Nv.addScaledVector(T,-Nv.dot(T)).normalize();
      let v=0;
      rings.forEach((rg,i)=>{
        curve.getPointAt(Math.min(1,rg.u),p); curve.getTangentAt(Math.min(1,rg.u),T);
        Nv.addScaledVector(T,-Nv.dot(T)); if(Nv.lengthSq()<1e-10) Nv.set(0,1,0).addScaledVector(T,-T.y); Nv.normalize();
        Bv.crossVectors(T,Nv);
        for(let j=0;j<=R;j++){ const a=j/R*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
          tmp.copy(Nv).multiplyScalar(ca).addScaledVector(Bv,sa);
          pos[v*3]=p.x+tmp.x*rg.r; pos[v*3+1]=p.y+tmp.y*rg.r; pos[v*3+2]=p.z+tmp.z*rg.r;
          nor[v*3]=tmp.x; nor[v*3+1]=tmp.y; nor[v*3+2]=tmp.z;
          if(meta){ ctr[v*3]=p.x; ctr[v*3+1]=p.y; ctr[v*3+2]=p.z; bt[v*2]=rg.t; bt[v*2+1]=rg.si; }
          v++; }
        rg.p=p.clone(); rg.T=T.clone();
      });
      const idx=[], fs=[];
      for(let i=0;i<nr-1;i++){ const si=rings[i+1].si;
        for(let j=0;j<R;j++){ const a=i*(R+1)+j, b=a+R+1; idx.push(a,a+1,b, b,a+1,b+1); fs.push(si,si); } }
      // end caps (outward)
      for(const [end,ri] of [[0,0],[1,nr-1]]){ const rg=rings[ri], c=v;
        pos[c*3]=rg.p.x; pos[c*3+1]=rg.p.y; pos[c*3+2]=rg.p.z; const sgn=end?1:-1;
        nor[c*3]=rg.T.x*sgn; nor[c*3+1]=rg.T.y*sgn; nor[c*3+2]=rg.T.z*sgn;
        if(meta){ ctr[c*3]=rg.p.x; ctr[c*3+1]=rg.p.y; ctr[c*3+2]=rg.p.z; bt[c*2]=rg.t; bt[c*2+1]=rg.si; }
        v++; const base=ri*(R+1);
        for(let j=0;j<R;j++){ if(end) idx.push(c,base+j,base+j+1); else idx.push(c,base+j+1,base+j); fs.push(rg.si); } }
      const g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
      if(meta){ g.setAttribute('ctr',new THREE.BufferAttribute(ctr,3)); g.setAttribute('bt',new THREE.BufferAttribute(bt,2)); }
      g.setIndex(idx); geos.push(g); faceSegs.push(fs);
    }
    // a ball only where daughters leave a node that no tube runs through
    segs.forEach((sg,si)=>{ const q=sg.pts[sg.pts.length-1], k=key(q);
      if(next[si]>=0 || thru.has(k) || !byStart.has(k)) return;
      const R=sg.r0>0.05?18:(sg.r0>0.02?14:9);
      const sp=new THREE.SphereGeometry(sg.r1*1.02,R,Math.max(7,(R*0.6)|0));
      sp.deleteAttribute('uv'); sp.translate(q.x,q.y,q.z);
      if(meta){ const n=sp.attributes.position.count, c=new Float32Array(n*3), b=new Float32Array(n*2);
        for(let w=0;w<n;w++){ c[w*3]=q.x; c[w*3+1]=q.y; c[w*3+2]=q.z; b[w*2]=1; b[w*2+1]=si; }
        sp.setAttribute('ctr',new THREE.BufferAttribute(c,3)); sp.setAttribute('bt',new THREE.BufferAttribute(b,2)); }
      thru.add(k); geos.push(sp); faceSegs.push(new Array(sp.index.count/3).fill(si)); });
    const geo=BGU.mergeGeometries(geos,false); geos.forEach(g=>g.dispose());
    const F=new Uint16Array(geo.index.count/3); { let o=0; for(const fs of faceSegs){ F.set(fs,o); o+=fs.length; } }
    const m=new THREE.Mesh(geo,mat(color,{roughness:0.46,clearcoat:0.30,clearcoatRoughness:0.45,
      emissive:new THREE.Color(color).multiplyScalar(0.20)}));
    if(opacity!==undefined) m.material.opacity=opacity;
    m.userData.pickFace=fi=>segs[F[fi]]?.name;
    m.userData.pick=segs[0]?.name;
    m.userData.segs=S; m.userData.segNames=segs.map(s=>s.name);
    m.userData.radialN=true; m.userData.chains=faceSegs.length;
    return m;
  }
}

const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
/* per-scale toggles: every structure in a microscopic tier sits in a named group */
function layerer(parent,map={}){
  const f=key=>{ if(!map[key]){ map[key]=new THREE.Group(); map[key].name=key; parent.add(map[key]); } return map[key]; };
  f.map=map; return f;
}
function segTarget(k){                       // segment centroid, pulled inside the parenchyma if needed
  const c=SEG_CENTROID[k].clone();
  for(let i=0;i<50&&!insideLiver(c);i++) c.lerp(HILUM_IN,0.07);
  return c;
}

/* ════════════ pathology engine: geometry helpers ════════════ */
const srng=seed=>{ let q=((seed|0)*9301+49297)%233280; if(q<0) q+=233280; return ()=>((q=(q*9301+49297)%233280)/233280); };
/* tube with per-vertex centreline point ('ctr') and (u along the tube, id) in 'bt', so it can later be
   dilated, narrowed, grown or deployed by moving each vertex along its own radius */
function metaTube(pts,rFn,N,R,cap,id){
  const g=varTube(pts,rFn,N,R,cap);
  const curve=new THREE.CatmullRomCurve3(pts), n=g.attributes.position.count;
  const ctr=new Float32Array(n*3), bt=new Float32Array(n*2), p=new THREE.Vector3(); let v=0;
  for(let i=0;i<=N;i++){ curve.getPointAt(i/N,p); for(let j=0;j<=R;j++){ ctr[v*3]=p.x; ctr[v*3+1]=p.y; ctr[v*3+2]=p.z; bt[v*2]=i/N; bt[v*2+1]=id||0; v++; } }
  if(cap){ for(const t of [0,1]){ curve.getPointAt(t,p); ctr[v*3]=p.x; ctr[v*3+1]=p.y; ctr[v*3+2]=p.z; bt[v*2]=t; bt[v*2+1]=id||0; v++; } }
  g.setAttribute('ctr',new THREE.BufferAttribute(ctr,3)); g.setAttribute('bt',new THREE.BufferAttribute(bt,2));
  return g;
}
/* sweep a closed surface along part of a curve (arc fraction a → b) with radius r(u,θ); meta as above */
function sweep(curve,a,b,rFn,N=48,R=20,id=0){
  const fr=curve.computeFrenetFrames(200,false), pos=[], ctr=[], bt=[], idx=[], p=new THREE.Vector3();
  for(let i=0;i<=N;i++){
    const u=i/N, t=a+(b-a)*u; curve.getPointAt(t,p);
    const fi=Math.min(200,Math.round(t*200)), nm=fr.normals[fi], bn=fr.binormals[fi];
    for(let j=0;j<=R;j++){
      const th=j/R*Math.PI*2, r=rFn(u,th), c=Math.cos(th), s=Math.sin(th);
      pos.push(p.x+(nm.x*c+bn.x*s)*r, p.y+(nm.y*c+bn.y*s)*r, p.z+(nm.z*c+bn.z*s)*r);
      ctr.push(p.x,p.y,p.z); bt.push(u,id);
    }
  }
  for(let i=0;i<N;i++) for(let j=0;j<R;j++){ const q=i*(R+1)+j, w=q+R+1; idx.push(q,q+1,w, w,q+1,w+1); }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('ctr',new THREE.Float32BufferAttribute(ctr,3));
  g.setAttribute('bt',new THREE.Float32BufferAttribute(bt,2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* braided metal stent: two opposing sets of helical wires around a centreline */
function wireStent(curve,a,b,R,pitch,nW=8,wr=0.0042){
  const L=curve.getLength()*(b-a), M=Math.max(40,Math.round(L/0.006)), fr=curve.computeFrenetFrames(240,false);
  const pos=[], ctr=[], bt=[], idx=[], p=new THREE.Vector3(), q=new THREE.Vector3(), tg=new THREE.Vector3();
  const RS=4; let base=0;
  for(const dir of [1,-1]) for(let w=0;w<nW;w++){
    const th0=w/nW*Math.PI*2, ring=[];
    for(let i=0;i<=M;i++){
      const u=i/M, t=a+(b-a)*u; curve.getPointAt(t,p);
      const fi=Math.min(240,Math.round(t*240)), nm=fr.normals[fi], bn=fr.binormals[fi];
      const th=th0+dir*u*L/pitch*Math.PI*2, c=Math.cos(th), s=Math.sin(th);
      q.set(p.x+(nm.x*c+bn.x*s)*R, p.y+(nm.y*c+bn.y*s)*R, p.z+(nm.z*c+bn.z*s)*R);
      ring.push({q:q.clone(),p:p.clone(),u,out:new THREE.Vector3(nm.x*c+bn.x*s,nm.y*c+bn.y*s,nm.z*c+bn.z*s)});
    }
    for(let i=0;i<=M;i++){
      const r=ring[i], nx=ring[Math.min(M,i+1)].q, pv=ring[Math.max(0,i-1)].q;
      tg.subVectors(nx,pv).normalize(); const side=new THREE.Vector3().crossVectors(tg,r.out).normalize();
      for(let k=0;k<RS;k++){ const an=k/RS*Math.PI*2, c=Math.cos(an)*wr, s=Math.sin(an)*wr;
        pos.push(r.q.x+r.out.x*c+side.x*s, r.q.y+r.out.y*c+side.y*s, r.q.z+r.out.z*c+side.z*s);
        ctr.push(r.p.x,r.p.y,r.p.z); bt.push(r.u,0); }
    }
    for(let i=0;i<M;i++) for(let k=0;k<RS;k++){ const a0=base+i*RS+k, a1=base+i*RS+(k+1)%RS, b0=a0+RS, b1=a1+RS; idx.push(a0,b0,a1, b0,b1,a1); }
    base+=(M+1)*RS;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('ctr',new THREE.Float32BufferAttribute(ctr,3));
  g.setAttribute('bt',new THREE.Float32BufferAttribute(bt,2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* tortuous (serpiginous) course around a guide path; the ends stay attached to the guide */
function tortuous(guide,amp,waves,seed,n=72){
  const c=new THREE.CatmullRomCurve3(guide), fr=c.computeFrenetFrames(n,false), rnd=srng(seed);
  const ph1=rnd()*6.28, ph2=rnd()*6.28, w2=waves*(0.75+rnd()*0.5), out=[];
  for(let i=0;i<=n;i++){
    const t=i/n, p=c.getPointAt(t), env=Math.pow(Math.sin(Math.PI*t),0.5);
    p.addScaledVector(fr.normals[i],amp*env*Math.sin(t*waves*Math.PI*2+ph1))
     .addScaledVector(fr.binormals[i],amp*env*Math.cos(t*w2*Math.PI*2+ph2));
    out.push(p);
  }
  return out;
}
function mergeMeta(geos){
  const g=BGU.mergeGeometries(geos.map(q=>{ for(const k of Object.keys(q.attributes))
    if(!['position','normal','ctr','bt'].includes(k)) q.deleteAttribute(k); return q; }),false);
  geos.forEach(q=>q.dispose()); return g;
}
/* dynamic meta mesh: grow/deploy/dilate by moving vertices along their own radius */
function flipWinding(g){ return g; }   // v19 per-mesh fix, superseded: tubes are wound outward at source (v20)
/* normals after a centreline deformation: radial for tubes (no seam or cap artefacts), recomputed otherwise */
function metaNormals(m,radial=m.userData.radialN){ const g=m.geometry;
  if(!radial||!g.attributes.ctr){ g.computeVertexNormals(); return; }
  const P=g.attributes.position.array, C=g.attributes.ctr.array, N=g.attributes.normal.array;
  for(let v=0;v<P.length/3;v++){ const x=P[v*3]-C[v*3], y=P[v*3+1]-C[v*3+1], z=P[v*3+2]-C[v*3+2], l=Math.hypot(x,y,z);
    if(l>1e-6){ N[v*3]=x/l; N[v*3+1]=y/l; N[v*3+2]=z/l; } }
  g.attributes.normal.needsUpdate=true; }
function metaMesh(geo,material,name){
  const m=tag(new THREE.Mesh(geo,material),name);
  const P=geo.attributes.position.array;
  m.userData.mo={P0:P.slice(),ctr:geo.attributes.ctr.array,bt:geo.attributes.bt.array,last:''};
  return m;
}
/* k(u) per vertex from a deploy front d with collapsed radius kMin */
function deployMeta(m,d,kMin,gain=1,rev=false){
  const mo=m.userData.mo, key=d.toFixed(3)+'|'+kMin.toFixed(3)+'|'+gain.toFixed(3)+(rev?'r':'');
  if(mo.last===key) return; mo.last=key;
  const P=m.geometry.attributes.position.array, P0=mo.P0, C=mo.ctr, B=mo.bt, n=P.length/3;
  for(let v=0;v<n;v++){
    const kk=THREE.MathUtils.clamp((d-(rev?1-B[v*2]:B[v*2]))/0.06,0,1), k=(kMin+(1-kMin)*kk)*gain;
    for(let a=0;a<3;a++){ const c=C[v*3+a]; P[v*3+a]=c+(P0[v*3+a]-c)*k; }
  }
  m.geometry.attributes.position.needsUpdate=true;
  m.geometry.computeBoundingSphere();
}
/* per-vertex scale (array) about the centreline */
function scaleMeta(m,K){
  const mo=m.userData.mo, P=m.geometry.attributes.position.array, P0=mo.P0, C=mo.ctr, n=P.length/3;
  for(let v=0;v<n;v++){ const k=K[v]; for(let a=0;a<3;a++){ const c=C[v*3+a]; P[v*3+a]=c+(P0[v*3+a]-c)*k; } }
  m.geometry.attributes.position.needsUpdate=true;
}

/* particle flow along weighted routes; particles re-choose a route each time they finish, so changes
   in weights (a clot, a shunt, a TIPSS) spread smoothly through the stream */
class FlowNet{
  constructor(n,r,parent){
    this.mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(r,8,6),
      new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9}),n);
    this.mesh.userData.noPick=true; parent.add(this.mesh);
    for(let i=0;i<n;i++) this.mesh.setColorAt(i,new THREE.Color(0xffffff));
    this.off=new THREE.InstancedBufferAttribute(new Float32Array(n),1); this.mesh.geometry.setAttribute('aOff',this.off);
    this.mesh.material.onBeforeCompile=sh=>{ sh.vertexShader='attribute float aOff;\n'+sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  mvPosition.z += aOff*length(modelViewMatrix[0].xyz);\n  gl_Position = projectionMatrix*mvPosition;'); };
    this.pr=r; this.rk=1; this.radius=null;
    this.mesh.renderOrder=5;   // after the vessel walls: particles don't write depth (opacity < 0.9), so draw them last
    this.n=n; this.routes=[]; this.p=[]; for(let i=0;i<n;i++) this.p.push({r:-1,s:0});
    this.o=new THREE.Object3D(); this.c=new THREE.Color(); this.scale=1; this.init=false;
  }
  route(key,pts,opt={}){
    const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'), len=curve.getLength();
    const R=Object.assign({key,curve,len,w:0,wc:0,speed:1,c0:new THREE.Color(0xC2AEF2),c1:null,split:1,block:null,size:1},opt);
    this.routes.push(R); return R;
  }
  arc(R,pt){ let best=0,bd=1e9; const q=new THREE.Vector3();
    for(let i=0;i<=300;i++){ R.curve.getPointAt(i/300,q); const d=q.distanceToSquared(pt); if(d<bd){bd=d; best=i/300;} }
    return best*R.len; }
  pick(){ let tot=0; for(const R of this.routes) tot+=R.wc; if(tot<1e-4) return -1;
    let x=rng()*tot; for(let i=0;i<this.routes.length;i++){ x-=this.routes[i].wc; if(x<=0) return i; } return this.routes.length-1; }
  update(dt,v){
    const a=Math.min(1,dt*1.4); let settling=false;
    for(const R of this.routes){ R.wc+=(R.w-R.wc)*a; if(Math.abs(R.w-R.wc)>1e-5) settling=true; }
    // v43: with flow off and route weights settled nothing moves, so skip the per-frame buffer rewrite (lets the
    // render-on-demand loop see a still scene); one pass still runs whenever that state is first reached
    const key=this.scale+'|'+this.pr, still=this.init&&v===0&&!settling;
    if(still&&this._stillKey===key) return;
    this._stillKey=still?key:null;
    if(!this.init){ this.init=true; for(const R of this.routes) R.wc=R.w;
      for(const p of this.p){ p.r=this.pick(); if(p.r>=0){ const R=this.routes[p.r]; p.s=rng()*(R.block??R.len); } } }
    const o=this.o, c=this.c, M=this.mesh, OFF=this.off.array;
    if(this.radius) for(const R of this.routes) if(!R.rt){ R.rt=new Float32Array(33); const q=new THREE.Vector3();
      for(let k=0;k<=32;k++){ R.curve.getPointAt(k/32,q); R.rt[k]=this.radius(q); } }
    for(let i=0;i<this.n;i++){
      const p=this.p[i];
      if(p.r<0){ p.r=this.pick(); p.s=0; }
      if(p.r<0){ o.scale.setScalar(0); o.updateMatrix(); M.setMatrixAt(i,o.matrix); continue; }
      let R=this.routes[p.r];
      p.s+=v*R.speed*dt;
      let end=R.block??R.len;
      if(p.s>=end){ p.r=this.pick(); p.s=rng()*0.02; if(p.r<0){ o.scale.setScalar(0); o.updateMatrix(); M.setMatrixAt(i,o.matrix); continue; } R=this.routes[p.r]; end=R.block??R.len; }
      const u=Math.min(1,p.s/R.len);
      R.curve.getPointAt(u,o.position);
      const fade=Math.max(0,Math.min(1,p.s/0.05,(end-p.s)/(R.block!=null?0.14:0.05)));
      o.scale.setScalar(fade*this.scale*R.size); o.updateMatrix(); M.setMatrixAt(i,o.matrix);
      OFF[i]=(R.rt?R.rt[Math.round(u*32)]*this.rk*1.04:0)+this.pr*fade*this.scale*R.size;
      if(R.c1){ const k=THREE.MathUtils.smoothstep(u,R.split-0.02,R.split+0.02); c.copy(R.c0).lerp(R.c1,k); } else c.copy(R.c0);
      M.setColorAt(i,c);
    }
    M.instanceMatrix.needsUpdate=true; if(M.instanceColor) M.instanceColor.needsUpdate=true; this.off.needsUpdate=true;
  }
}
/* nearest-centreline radius lookup over every tube (ctr attribute) under the given groups */
function vesselRadiusLookup(groups){ const cell=0.05, G=new Map(), ck=(x,y,z)=>(Math.floor(x/cell)+512)*1048576+(Math.floor(y/cell)+512)*1024+(Math.floor(z/cell)+512);
  for(const grp of groups) grp.traverse(o=>{ if(!o.isMesh||o.isInstancedMesh) return; const g=o.geometry, C=g.attributes.ctr; if(!C) return;
    const P=o.userData.mo?o.userData.mo.P0:g.attributes.position.array, c=C.array;
    for(let v=0;v<c.length/3;v+=3){ const x=c[v*3],y=c[v*3+1],z=c[v*3+2], r=Math.hypot(P[v*3]-x,P[v*3+1]-y,P[v*3+2]-z); if(r<1e-4) continue;
      const k=ck(x,y,z); let a=G.get(k); if(!a) G.set(k,a=[]); a.push(x,y,z,r); } });
  return q=>{ let bd=1e9, br=0; const i0=Math.floor(q.x/cell), j0=Math.floor(q.y/cell), k0=Math.floor(q.z/cell);
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) for(let k=-1;k<=1;k++){ const a=G.get((i0+i+512)*1048576+(j0+j+512)*1024+(k0+k+512)); if(!a) continue;
      for(let s=0;s<a.length;s+=4){ const d=(a[s]-q.x)**2+(a[s+1]-q.y)**2+(a[s+2]-q.z)**2; if(d<bd){ bd=d; br=a[s+3]; } } }
    return br; }; }

/* ════════════ pathology engine: macroscopic structures ════════════
   Everything here exists from the start but is collapsed or transparent; pathTick() grows, deploys
   and fades it according to state.path, so every change animates rather than switches. */
function buildPatho(g,L,K){
  const P={cols:{},thr:{},bcs:{},tips:{},bil:{},K};
  const COLL=0xA45CF2;   // portosystemic collaterals: brighter violet so they separate from the native portal tree
  const vmat=(c,o={})=>mat(c,Object.assign({roughness:0.36,clearcoat:0.6,clearcoatRoughness:0.3,
    emissive:new THREE.Color(c).multiplyScalar(0.30)},o));
  const col=(key,parent,label)=>(P.cols[key]={key,parent,label,meshes:[],open:0,target:0});
  const strands=(G,list,m,name)=>{
    const geos=list.map((q,i)=>metaTube(q.pts,t=>q.r*(0.82+0.18*Math.sin(Math.PI*t)),Math.max(24,q.pts.length-1),8,true,i));
    const me=metaMesh(mergeMeta(geos),m,name); me.visible=false; G.parent.add(me); G.meshes.push(me); return me; };
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);

  /* — oesophageal and GOV1 varices: left gastric (coronary) vein → submucosal columns → azygos — */
  const oes=new THREE.CatmullRomCurve3(K.OES), ofr=oes.computeFrenetFrames(80,false);
  const eso=col('eso',L.portal,'Oesophageal varices'), esoList=[];
  for(let j=0;j<4;j++){
    const pts=[];
    for(let i=0;i<=40;i++){ const u=1-0.46*i/40, p=oes.getPointAt(u), fi=Math.round(u*80);
      const ph=j/4*Math.PI*2+0.4+0.42*Math.sin(u*36+j*1.7), rr=0.072;
      pts.push(p.addScaledVector(ofr.normals[fi],Math.cos(ph)*rr).addScaledVector(ofr.binormals[fi],Math.sin(ph)*rr)); }
    esoList.push({pts,r:0.024+0.006*(j%2)});
  }
  P.esoCols=esoList.map(q=>q.pts);
  const LGV=[K.LGV0.clone(),PT(0.40,-0.98,-0.42),PT(0.56,-0.62,-0.42),K.GOJ.clone()];
  const lgvT=tortuous(LGV,0.018,5,11,60);
  esoList.push({pts:lgvT,r:0.034});
  const gov=[tortuous([K.GOJ.clone(),PT(0.70,-0.66,-0.46),PT(0.84,-0.82,-0.34),PT(0.90,-0.98,-0.20)],0.016,5,21,50),
             tortuous([K.GOJ.clone(),PT(0.74,-0.62,-0.52),PT(0.92,-0.78,-0.44),PT(1.02,-0.94,-0.30)],0.016,6,22,50)];
  gov.forEach(pts=>esoList.push({pts,r:0.022}));
  const AZY=[PT(-0.12,-1.25,-1.16),PT(-0.15,-0.40,-1.26),PT(-0.17,0.40,-1.28),PT(-0.18,1.05,-1.22),PT(-0.14,1.42,-0.95)];
  const perf=[0.62,0.78].map((u,i)=>{ const p=oes.getPointAt(u); const az=new THREE.CatmullRomCurve3(AZY);
    let best=0,bd=9,q=new THREE.Vector3(); for(let k=0;k<=60;k++){ az.getPointAt(k/60,q); const d=Math.abs(q.y-p.y); if(d<bd){bd=d; best=k/60;} }
    return tortuous([p,p.clone().lerp(az.getPointAt(best),0.5).add(V(0,0.05,0)),az.getPointAt(best)],0.035,3,31+i,40); });
  perf.forEach(pts=>esoList.push({pts,r:0.017}));
  P.lgvT=lgvT; P.perf=perf; P.AZY=AZY; P.gov=gov;
  strands(eso,esoList,vmat(COLL),'Oesophageal varices');
  const azy=col('azy',L.hepaticVein,'Azygos vein');
  strands(azy,[{pts:AZY,r:0.034}],vmat(C.vein),'Azygos vein');

  /* — fundal varices via short gastric veins (splenic hilum → fundus) — */
  const FUN=PT(1.05,-0.30,-0.62), HIL=PT(1.72,-0.66,-0.80);
  const fun=col('fun',L.portal,'Gastric fundal varices'), funList=[];
  const sgv=[0,1,2].map(i=>{ const a=HIL.clone().add(V(-0.02,0.10*i-0.05,0.04*i)), b=FUN.clone().add(V(0.28,0.05*i-0.02,-0.10+0.03*i));
    return tortuous([a,a.clone().lerp(b,0.5).add(V(0,0.08,0.02)),b],0.035,4,41+i,50); });
  sgv.forEach(pts=>funList.push({pts,r:0.022}));
  const rf=srng(51);
  for(let i=0;i<7;i++){ const th=0.3+rf()*1.4, ph=-0.4+rf()*1.2, pts=[];
    for(let k=0;k<=24;k++){ const t=k/24, a=th+0.9*t, b=ph+0.35*Math.sin(t*Math.PI*2+i);
      pts.push(FUN.clone().add(V(Math.cos(a)*Math.cos(b),Math.sin(b),-Math.sin(a)*Math.cos(b)).multiplyScalar(0.395+0.012*Math.sin(t*20)))); }
    funList.push({pts,r:0.026}); }
  P.sgv=sgv;
  strands(fun,funList,vmat(COLL),'Gastric fundal varices');

  /* — spontaneous splenorenal shunt, draining to a dilated left renal vein — */
  const sr=col('sr',L.portal,'Splenorenal shunt');
  const srPts=tortuous([PT(1.50,-1.22,-0.74),PT(1.42,-1.55,-0.96),PT(1.18,-1.86,-1.10),K.LRV_PTS[0].clone().add(V(-0.02,0.02,0.02))],0.05,3,61,70);
  P.srPts=srPts;
  strands(sr,[{pts:srPts,r:0.046}],vmat(COLL),'Splenorenal shunt');
  const lrv=col('lrv',L.hepaticVein,'Left renal vein (dilated)');
  const lrvM=metaMesh(sweep(new THREE.CatmullRomCurve3(K.LRV_PTS),0,1,(u)=>0.062*Math.min(1,Math.pow(Math.min(u,1-u)/0.06,0.5)+0.4),40,18),vmat(C.vein),'Left renal vein');
  lrvM.visible=false; L.hepaticVein.add(lrvM); lrv.meshes.push(lrvM);

  /* — recanalised paraumbilical vein → umbilicus → caput medusae — */
  const UMBIL=PT(0.04,-1.42,1.12);
  const pu=col('pu',L.portal,'Recanalised paraumbilical vein');
  const puPts=tortuous([K.UMB.clone(),PT(0.17,-0.30,0.42),PT(0.12,-0.60,0.64),PT(0.08,-1.02,0.94),UMBIL],0.016,6,71,90);
  P.puPts=puPts;
  strands(pu,[{pts:puPts,r:0.03}],vmat(COLL),'Recanalised paraumbilical vein');
  const cap=col('caput',L.portal,'Caput medusae'), capList=[];
  const nrm=V(0,0.18,1).normalize(), e1=V(1,0,0), e2=new THREE.Vector3().crossVectors(nrm,e1).normalize();
  const rc=srng(81);
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+rc()*0.3, L0=0.38+rc()*0.34;
    const d=e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2,Math.sin(a));
    const pts=tortuous([UMBIL.clone(),UMBIL.clone().addScaledVector(d,L0*0.5).addScaledVector(nrm,0.03),UMBIL.clone().addScaledVector(d,L0)],0.04,4,90+i,40);
    capList.push({pts,r:0.017}); }
  P.caput=capList.map(q=>q.pts);
  strands(cap,capList,vmat(COLL),'Caput medusae');
  const umb=tag(new THREE.Mesh(new THREE.TorusGeometry(0.05,0.016,10,28),mat(0xC9A08A,{roughness:0.7})),'Umbilicus');
  umb.position.copy(UMBIL); umb.lookAt(UMBIL.clone().add(nrm)); umb.visible=false; L.portal.add(umb); cap.extra=[umb];

  /* — portal cavernoma (chronic PVT): tortuous periportal channels bypassing the occluded trunk — */
  const trunkC=new THREE.CatmullRomCurve3([K.CONF,PT(0.08,-1.12,-0.32),K.PT_MID,K.PT_UP,HILUM_OUT,HILUM_IN]);
  const tfr=trunkC.computeFrenetFrames(80,false);
  const cav=col('cav',L.portal,'Portal cavernoma'), cavList=[];
  for(let j=0;j<8;j++){ const pts=[];
    for(let i=0;i<=40;i++){ const u=0.03+0.80*i/40, p=trunkC.getPointAt(u), fi=Math.round(u*80);
      const ph=j/8*Math.PI*2+u*2.4, rr=0.105+0.035*Math.sin(u*14+j);
      pts.push(p.addScaledVector(tfr.normals[fi],Math.cos(ph)*rr).addScaledVector(tfr.binormals[fi],Math.sin(ph)*rr)); }
    cavList.push({pts:tortuous(pts,0.012,9,101+j,60),r:0.016}); }
  P.cavPts=cavList.map(q=>q.pts);
  strands(cav,cavList,vmat(COLL),'Portal cavernoma');

  /* — Budd–Chiari: hepatic vein thrombosis, IVC web, intrahepatic 'spider-web' collaterals — */
  const clotM=mat(0x6E1A26,{roughness:0.78,clearcoat:0.12,emissive:new THREE.Color(0x6E1A26).multiplyScalar(0.28)});
  const cap5=u=>Math.pow(Math.min(1,u/0.08,(1-u)/0.08),0.45);
  const hvClot=[[K.rhv,0.45,0.063],[K.mhv,0.45,0.055],[K.lhv,0.40,0.052],[[K.OST,K.CT],1,0.068]].map(([pts,b,r],i)=>
    sweep(new THREE.CatmullRomCurve3(pts),0,b,(u,th)=>r*(0.55+0.45*cap5(u))*(1+0.05*Math.sin(th*4+u*20)),40,16,i));
  P.bcs.hv=metaMesh(mergeMeta(hvClot),clotM,'Hepatic vein thrombosis'); P.bcs.hv.visible=false; L.hepaticVein.add(P.bcs.hv);
  const IVCC=new THREE.CatmullRomCurve3([PT(-0.33,0.55,-0.40),PT(-0.33,0.97,0.00)]);
  const webP=IVCC.getPointAt(0.72), webT=IVCC.getTangentAt(0.72);
  const web=new THREE.Group(); web.position.copy(webP); web.quaternion.setFromUnitVectors(V(0,1,0),webT);
  web.add(tag(new THREE.Mesh(new THREE.CylinderGeometry(0.088,0.088,0.010,32),mat(0xE7D9C4,{roughness:0.6,opacity:0.95})),'IVC web'));
  web.add(tag(new THREE.Mesh(new THREE.TorusGeometry(0.097,0.014,10,36).rotateX(Math.PI/2),mat(0xE7D9C4,{roughness:0.5})),'IVC web'));
  web.visible=false; L.hepaticVein.add(web); P.bcs.web=web; P.bcs.webP=webP;
  const spider=col('web',L.hepaticVein,'Intrahepatic venovenous collaterals'), spList=[], rs=srng(131);
  const hvSegs=K.HVsegs.filter(q=>/^(Right|Middle|Left) hepatic vein$/.test(q.name));
  const CAUD_IVC=PT(-0.28,0.16,-0.56);
  for(let i=0;i<22&&hvSegs.length;i++){
    const sg=hvSegs[Math.floor(rs()*hvSegs.length)], c=new THREE.CatmullRomCurve3(sg.pts), p=c.getPointAt(0.3+rs()*0.6);
    if(!insideLiver(p)) continue;
    const d1=CAUD_IVC.clone().sub(p).normalize().add(V(rs()-0.5,rs()-0.5,rs()-0.5).multiplyScalar(0.9)).normalize();
    const L1=0.16+rs()*0.18, q1=p.clone().addScaledVector(d1,L1), d2=perp(d1).applyAxisAngle(d1,rs()*6.28);
    const q2=q1.clone().addScaledVector(d1,L1*0.6).addScaledVector(d2,0.10);
    if(!insideLiver(q2)) continue;
    spList.push({pts:tortuous([p,q1,q2],0.02,3,140+i,36),r:0.011}); }
  strands(spider,spList,vmat(0x5B84C8),'Intrahepatic venovenous collaterals');
  const caud=col('caud',L.hepaticVein,'Enlarged caudate veins');
  const caudVeins=[[PT(-0.02,0.32,-0.62),PT(-0.16,0.28,-0.60),PT(-0.30,0.24,-0.56)],[PT(-0.06,0.08,-0.66),PT(-0.18,0.06,-0.63),PT(-0.30,0.04,-0.60)]];
  strands(caud,caudVeins.map(pts=>({pts,r:0.042})),vmat(C.vein),'Enlarged caudate veins');
  P.caudVeins=caudVeins;

  /* — portal vein thrombosis: partial (mural), acute occlusive, chronic (fibrotic cord), SMV extension — */
  const thrM=mat(0x6E1A26,{roughness:0.78,clearcoat:0.12,emissive:new THREE.Color(0x6E1A26).multiplyScalar(0.28)});
  P.thr.acute=metaMesh(sweep(trunkC,0.08,0.78,(u,th)=>0.097*(0.5+0.5*cap5(u))*(1+0.05*Math.sin(th*5+u*16)),60,20),thrM,'Portal vein thrombus (acute, occlusive)');
  P.thr.partial=metaMesh(sweep(trunkC,0.20,0.60,(u,th)=>{ const m=Math.max(0,Math.cos(th-0.9));
    return 0.086*(0.25+0.75*cap5(u))*(0.32+0.72*Math.pow(m,0.7)); },50,24),thrM.clone(),'Portal vein thrombus (partial, non-occlusive)');
  P.thr.chronic=metaMesh(sweep(trunkC,0.04,0.82,(u,th)=>0.044*(0.6+0.4*cap5(u))*(1+0.08*Math.sin(u*30+th*3)),60,16),
    mat(0xB5A597,{roughness:0.9,clearcoat:0.05}),'Chronic portal vein occlusion (fibrotic cord)');
  const smvC=new THREE.CatmullRomCurve3([K.SMV0,PT(0.18,-1.80,-0.30),K.CONF]);
  P.thr.smv=metaMesh(sweep(smvC,0.22,1.0,(u,th)=>0.080*(0.5+0.5*Math.pow(Math.min(1,u/0.1),0.5))*(1+0.05*Math.sin(th*5+u*12)),40,20),thrM.clone(),'SMV thrombus');
  for(const k in P.thr){ P.thr[k].visible=false; L.portal.add(P.thr[k]); }
  P.trunkC=trunkC; P.smvC=smvC;

  /* — TIPSS: covered stent from the right hepatic vein through the parenchyma into the right portal vein — */
  const rhvC=new THREE.CatmullRomCurve3(K.rhv);
  let tJ=0.3; { let bd=1e9; for(let i=0;i<=300;i++){ const q=rhvC.getPoint(i/300), dd=Math.abs(q.x+0.62); if(dd<bd){ bd=dd; tJ=i/300; } } }
  const tipJ=rhvC.getPoint(tJ), tipT=rhvC.getTangent(tJ), ven=[];
  for(let i=5;i>=0;i--) ven.push(rhvC.getPoint(tJ*i/6));
  const tipE=K.OST.clone().addScaledVector(rhvC.getTangent(0).negate(),0.05);
  const TIPS=[PT(-0.47,0.058,-0.04),PT(-0.58,0.20,-0.09),tipJ.clone().addScaledVector(tipT,0.06).add(V3(0,-0.11,0)),tipJ,...ven,tipE];
  const tipsC=new THREE.CatmullRomCurve3(TIPS); P.tips.curve=tipsC; P.tips.pts=TIPS;
  { const Ls=tipsC.getLengths(400); P.tips.uJ=Ls[Math.round(3/(TIPS.length-1)*400)]/Ls[400]; }
  const tipsCath=(()=>{ const ivc=K.HVsegs.find(s=>s.name==='IVC').pts, top=ivc[0], dn=ivc[1].clone().sub(top).normalize();
    const d0=TIPS[0].clone().sub(TIPS[1]).normalize(), raw=[top.clone().addScaledVector(dn,-0.75),top.clone().addScaledVector(dn,-0.3),top.clone(),
      ...TIPS.slice().reverse(),TIPS[0].clone().addScaledVector(d0,0.10)], cp=[raw[0]];
    for(const p of raw.slice(1)) if(p.distanceTo(cp[cp.length-1])>0.03) cp.push(p);
    return new THREE.CatmullRomCurve3(cp,false,'centripetal'); })();
  const metal=new THREE.MeshPhysicalMaterial({color:0xD0D6DC,metalness:0.92,roughness:0.26,clearcoat:0.6,transparent:true,opacity:1});
  P.tips.wire=metaMesh(wireStent(tipsC,0,1,0.052,0.10,8),metal,'TIPSS stent');
  const cov=sweep(tipsC,0.24,1.0,()=>0.050,70,28); { const b=cov.attributes.bt.array; for(let i=0;i<b.length;i+=2) b[i]=0.24+0.76*b[i]; }
  P.tips.cover=metaMesh(cov,mat(0xDCE3EA,{roughness:0.35,clearcoat:0.8,opacity:0.42,side:THREE.DoubleSide,depthWrite:false}),'TIPSS stent (ePTFE-covered segment)');
  const mk=tag(new THREE.Mesh(new THREE.TorusGeometry(0.054,0.008,8,28),mat(0xE3B341,{metalness:0.6,roughness:0.3})),'TIPSS radiopaque marker');
  mk.position.copy(tipsC.getPointAt(0.24)); mk.quaternion.setFromUnitVectors(V(0,0,1),tipsC.getTangentAt(0.24));
  P.tips.marker=mk;
  P.tips.cath=metaMesh(sweep(tipsCath,0,1,()=>0.016,240,10),mat(0x2F74D6,{roughness:0.3,clearcoat:0.8,emissive:new THREE.Color(0x2F74D6).multiplyScalar(0.2)}),'TIPSS sheath, needle and wire');
  P.tips.group=new THREE.Group(); P.tips.group.add(P.tips.wire,P.tips.cover,mk,P.tips.cath); P.tips.group.visible=false; g.add(P.tips.group);

  /* — biliary: stones and stents (stents are rebuilt for each configuration) — */
  const stoneM=mat(0xffffff,{vertexColors:true,roughness:0.65,clearcoat:0.35,flatShading:true,emissive:new THREE.Color(0x1A1206)});
  const stone=(r,seed)=>{ const q=new THREE.IcosahedronGeometry(r,1), rr=srng(seed), cp=q.attributes.position, c=new Float32Array(cp.count*3);
    const base=new THREE.Color([0x7A5A24,0x4E3418,0x9A8040,0x3E2E1A][seed%4]), cc=new THREE.Color();
    for(let i=0;i<cp.count;i++){ cp.setXYZ(i,cp.getX(i)*(0.85+0.3*rr()),cp.getY(i)*(0.85+0.3*rr()),cp.getZ(i)*(0.85+0.3*rr()));
      cc.copy(base).multiplyScalar(0.85+0.3*rr()); c[i*3]=cc.r; c[i*3+1]=cc.g; c[i*3+2]=cc.b; }
    q.setAttribute('color',new THREE.BufferAttribute(c,3)); q.computeVertexNormals(); return q; };
  const gbC=new THREE.CatmullRomCurve3(K.gbPts);
  const gbStones=new THREE.Group();
  for(let i=0;i<7;i++){ const s=new THREE.Mesh(stone(0.034+0.014*((i*7)%3),i+3),stoneM);
    s.position.copy(gbC.getPointAt(0.12+0.06*i)).add(V(Math.sin(i*2.1)*0.05,-0.03-0.02*(i%2),Math.cos(i*1.7)*0.04)); gbStones.add(s); }
  tagAll(gbStones,'Gallstones'); P.bil.gbStones=gbStones;
  const cbdC=new THREE.CatmullRomCurve3(K.ducts.cbd.pts);
  const cbdStones=new THREE.Group();
  [[0.86,0.050,1],[0.74,0.040,2],[0.64,0.034,5]].forEach(([u,r,sd])=>{ const s=new THREE.Mesh(stone(r,sd),stoneM); s.position.copy(cbdC.getPointAt(u)); cbdStones.add(s); });
  tagAll(cbdStones,'Common bile duct stone'); P.bil.cbdStones=cbdStones;
  const miri=new THREE.Mesh(stone(0.054,7),stoneM);
  miri.position.copy(new THREE.CatmullRomCurve3(K.cysPts).getPointAt(0.80));
  tag(miri,'Impacted stone (Mirizzi syndrome)');
  P.bil.mirizzi=miri;
  for(const o of [gbStones,cbdStones,miri]){ o.visible=false; o.userData.keepInGhost=true; L.biliary.add(o); }
  P.bil.stentGroup=new THREE.Group(); P.bil.stentGroup.userData.keepInGhost=true; L.biliary.add(P.bil.stentGroup);

  /* — flow: portal (violet → blue once systemic) and hepatic venous / systemic (blue) — */
  const pf=new FlowNet(230,0.013,L.portal), hf=new FlowNet(130,0.013,L.hepaticVein);
  P.pflow=pf; P.hflow=hf;
  const lil=new THREE.Color(0xC2AEF2), blu=new THREE.Color(0x9DBBF2);
  const SRC_S=[K.SMV0,PT(0.18,-1.80,-0.30),K.CONF];
  const SRC_P=[K.SPL0,V3(1.564,-0.071,-0.550),V3(1.470,-0.175,-0.461),V3(1.412,-0.232,-0.381),V3(1.348,-0.291,-0.336),V3(1.268,-0.333,-0.314),V3(1.192,-0.367,-0.307),V3(1.126,-0.389,-0.299),V3(1.077,-0.397,-0.281),V3(1.021,-0.397,-0.262),V3(0.968,-0.366,-0.211),V3(0.904,-0.341,-0.140),V3(0.801,-0.305,0.046),V3(0.696,-0.299,0.240),PT(0.55,-1.42,-0.55),K.CONF];
  const TRUNK=[PT(0.08,-1.12,-0.32),K.PT_MID,K.PT_UP,HILUM_OUT,HILUM_IN];
  const IVC_UP=[PT(-0.33,0.97,0.00),PT(-0.33,1.30,0.06)];
  P.routes={hp:[],cav:[],tips:[],col:{},hf:[],hv:{}};
  K.tails.forEach((tl,i)=>{ const src=i%3===2?SRC_P:SRC_S;
    P.routes.hp.push(pf.route('hp'+i,src.concat(TRUNK,tl),{c0:lil}));
    P.routes.cav.push(pf.route('cav'+i,src.concat(P.cavPts[i%8].filter((_,k)=>k%3===0),[HILUM_IN],tl),{c0:lil})); });
  const tipsPts=tipsC.getPoints(40);
  [SRC_S,SRC_P].forEach((src,i)=>{ const pts=src.concat(TRUNK,[PT(-0.40,0.06,-0.02)],tipsPts,IVC_UP.slice(1));
    const R=pf.route('tips'+i,pts,{c0:lil,c1:blu}); R.split=pf.arc(R,TIPS[TIPS.length-2])/R.len; P.routes.tips.push(R); });
  const rt=P.routes.col;
  { const pts=SRC_S.concat(lgvT.filter((_,k)=>k%2===0),P.esoCols[0].filter((_,k)=>k%2===0),perf[1],AZY.slice(2));
    rt.eso=pf.route('eso',pts,{c0:lil,c1:blu}); rt.eso.split=pf.arc(rt.eso,perf[1][perf[1].length-1])/rt.eso.len;
    const pts2=SRC_P.concat(lgvT.filter((_,k)=>k%2===0),P.esoCols[2].filter((_,k)=>k%2===0),perf[0],AZY.slice(2));
    rt.eso2=pf.route('eso2',pts2,{c0:lil,c1:blu}); rt.eso2.split=pf.arc(rt.eso2,perf[0][perf[0].length-1])/rt.eso2.len; }
  rt.lgv=pf.route('lgv',lgvT.slice().reverse().filter((_,k)=>k%2===0).concat(TRUNK,K.tails[1]),{c0:lil}); rt.lgv.speed=0.55;
  rt.fun=pf.route('fun',[PT(1.62,-1.18,-0.72),PT(1.70,-0.95,-0.78)].concat(sgv[1],funList[5].pts),{c0:lil});
  rt.svt=pf.route('svt',[PT(1.62,-1.18,-0.72),PT(1.70,-0.95,-0.78)].concat(sgv[1],funList[5].pts,lgvT.slice().reverse().filter((_,k)=>k%2===0),TRUNK,K.tails[1]),{c0:lil}); rt.svt.speed=0.7;
  rt.sr=pf.route('sr',[PT(0.90,-1.30,-0.66)].concat(srPts,K.LRV_PTS.slice(1),[PT(-0.26,-1.60,-0.52),PT(-0.29,-0.70,-0.60),PT(-0.31,-0.10,-0.60),PT(-0.33,0.55,-0.40)],IVC_UP),{c0:lil,c1:blu});
  rt.sr.split=pf.arc(rt.sr,K.LRV_PTS[0])/rt.sr.len;
  rt.pu=pf.route('pu',SRC_S.concat(TRUNK,[PT(-0.06,0.09,-0.10),K.LT,K.UMB_MID],puPts,P.caput[3]),{c0:lil,c1:blu});
  rt.pu.split=pf.arc(rt.pu,UMBIL)/rt.pu.len;
  // hepatofugal: blood leaves the liver down the trunk into the collaterals
  const rev=a=>a.slice().reverse();
  P.routes.hf.push(pf.route('hf0',rev(K.tails[0]).concat(rev(TRUNK).slice(1),[K.CONF],lgvT.filter((_,k)=>k%2===0),P.esoCols[1].filter((_,k)=>k%2===0),perf[1],AZY.slice(2)),{c0:lil,c1:blu}));
  P.routes.hf.push(pf.route('hf1',rev(K.tails[4]).concat(rev(TRUNK).slice(1),[K.CONF],rev(SRC_P).slice(1,3),[PT(1.50,-1.22,-0.74)],srPts,K.LRV_PTS.slice(1),[PT(-0.26,-1.60,-0.52),PT(-0.31,-0.10,-0.60),PT(-0.33,0.55,-0.40)],IVC_UP),{c0:lil,c1:blu}));
  P.routes.hf.forEach(R=>{ R.split=0.62; });
  // hepatic venous outflow and systemic return
  const IVC_FROM=y=>{ const all=[PT(-0.24,-2.20,-0.48),PT(-0.25,-1.80,-0.50),PT(-0.27,-1.40,-0.52),PT(-0.29,-0.70,-0.60),PT(-0.31,-0.10,-0.60),PT(-0.33,0.55,-0.40),PT(-0.33,0.97,0.00),PT(-0.33,1.30,0.06)];
    return all.filter(p=>p.y>y); };
  const hv=P.routes.hv;
  hv.rhv=hf.route('rhv',rev(K.rhv).concat(IVC_UP),{c0:blu});
  hv.mhv=hf.route('mhv',rev(K.mhv).concat([K.OST],IVC_UP),{c0:blu});
  hv.lhv=hf.route('lhv',rev(K.lhv).concat([K.OST],IVC_UP),{c0:blu});
  hv.cau=hf.route('cau',caudVeins[0].concat(IVC_FROM(caudVeins[0][2].y+0.01)),{c0:blu});
  hv.cau2=hf.route('cau2',caudVeins[1].concat(IVC_FROM(caudVeins[1][2].y+0.01)),{c0:blu});
  hv.ivc=hf.route('ivc',IVC_FROM(-3),{c0:blu});
  hv.lrv=hf.route('lrv',K.LRV_PTS.slice(0,3).concat(IVC_FROM(K.LRV_PTS[3].y)),{c0:blu});
  hv.azy=hf.route('azy',AZY,{c0:blu});
  P.webArc={}; for(const k in hv) P.webArc[k]=hf.arc(hv[k],webP);
  P.ostArc={rhv:hf.arc(hv.rhv,K.OST)-0.06,mhv:hf.arc(hv.mhv,K.CT)-0.06,lhv:hf.arc(hv.lhv,K.CT)-0.06};
  P.clotArc=P.routes.hp.map(R=>pf.arc(R,trunkC.getPointAt(0.10)));
  P.cavUp=HILUM_IN;
  // morph state (current values chase targets in pathTick)
  P.m={caud:0,cong:0,fat:0,iron:0,spl:0,vasc:0,bil:0};
  return P;
}

/* ════════════ TIER 0 — macroscopic, one scene with switchable layers ════════════ */
/* Subcapsular veins: branching curves walked across the liver surface, so the
   capsule reads as living tissue rather than a plain shell. */
function surfaceVessels(){
  const parts=[];
  const project=p=>{
    const dir=p.clone().normalize(); let r=p.length();
    for(let k=0;k<26;k++){
      const d=sdfLiver(dir.x*r,dir.y*r,dir.z*r)-SURF;
      if(Math.abs(d)<0.003) break;
      r-=THREE.MathUtils.clamp(d*0.80,-0.05,0.30);
      if(r<0.1||r>3.2) break;
    }
    return dir.multiplyScalar(r);
  };
  const walk=(start,dir,len,rad,depth)=>{
    if(depth<=0||parts.length>90) return;
    const pts=[start.clone()]; let p=start.clone(), d=dir.clone();
    for(let i=0;i<6;i++){
      const n=p.clone().normalize();
      d.addScaledVector(n,-d.dot(n)).normalize();
      p=project(p.clone().addScaledVector(d,len/6));
      if(CT_MODE && Math.abs(sdfLiver(p.x,p.y,p.z)-SURF)>0.012) break;   // CT: stop where the walk leaves the capsule (porta, fissures)
      if(inStubOrTeres(p.x,p.y,p.z)||p.y>(CT_MODE?9:0.9)) break;
      d.applyAxisAngle(n,(rng()-0.5)*0.55);
      pts.push(p.clone());
    }
    if(pts.length<3) return;
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,rad,5,false));
    const n=p.clone().normalize();
    for(let b=0;b<2;b++)
      walk(p,d.clone().applyAxisAngle(n,(b?1:-1)*(0.45+rng()*0.5)),len*0.68,rad*0.66,depth-1);
  };
  for(let i=0,tries=0;i<13&&tries<80;tries++){
    const a=rng()*Math.PI*2, b=Math.acos(2*rng()-1);
    const seed=project(new THREE.Vector3(Math.sin(b)*Math.cos(a),Math.cos(b)*0.8,
      Math.sin(b)*Math.sin(a)).multiplyScalar(2.2));
    if(inStubOrTeres(seed.x,seed.y,seed.z)||seed.y>(CT_MODE?9:0.85)) continue;
    i++;
    const n=seed.clone().normalize();
    const t=perp(n).applyAxisAngle(n,rng()*Math.PI*2);
    walk(seed,t,0.62,0.0135,3);
  }
  if(!parts.length) return null;
  const geo=BGU.mergeGeometries(parts,false);
  parts.forEach(x=>x.dispose());
  return geo;
}

/* CT viscera: one TotalSegmentator case, same frame and scale as the parenchyma, so contacts are native.
   Stomach remodelled as a textbook J on this patient's landmarks (GOJ, fundus, pylorus); pancreas rebuilt in v44
   (see PANC_MPD). The spleen is centred on its own centroid so the portal-pressure growth scales it in place.
   Each organ is one switchable object; the kidneys carry short renal artery and vein segments. */
/* v44 pancreas remodel (pipeline/pancreas44.py): the gland is one smooth arc on this patient's landmarks (head in the C-loop
   right of the SMV, uncinate behind it, neck in front of the confluence, body across the aorta at L1–L2 behind the stomach,
   tail rising to the splenic hilum); it replaces the thinned CT pancreas, whose body turned ~90° straight back. The splenic
   vein follows the posterior (tail: posterosuperior) surface of the new body and tail from the hilum to the confluence, and the
   main pancreatic duct runs on the gland's axis, then through the head to the ampulla. CT-frame points. */
const SPLV_PTS=(hilum,conf)=>[hilum,V3(1.423,-0.043,-0.454),V3(1.323,-0.097,-0.405),V3(1.223,-0.152,-0.366),V3(1.128,-0.206,-0.315),V3(1.029,-0.251,-0.247),V3(0.934,-0.290,-0.159),V3(0.853,-0.325,-0.064),V3(0.777,-0.370,0.035),V3(0.713,-0.411,0.135),V3(0.651,-0.447,0.228),V3(0.585,-0.481,0.318),V3(0.514,-0.488,0.407),conf];
const PANC_MPD=[V3(1.500,-0.135,-0.430),V3(1.401,-0.199,-0.361),V3(1.294,-0.265,-0.296),V3(1.188,-0.321,-0.230),V3(1.087,-0.365,-0.148),V3(0.999,-0.401,-0.049),V3(0.921,-0.430,0.066),V3(0.852,-0.451,0.182),V3(0.781,-0.467,0.298),V3(0.702,-0.481,0.408),V3(0.610,-0.489,0.518),V3(0.503,-0.497,0.604),V3(0.372,-0.514,0.645),V3(0.243,-0.558,0.641),V3(0.137,-0.641,0.603),V3(0.050,-0.740,0.550)];
/* v44: baked organ maps (pipeline/bake44.py): albedo, tangent-space normal and ORM (R occlusion, G roughness, B clearcoat /
   wetness), 2K on desktop and 1K on phones, chosen at load. They replace the organ's procedural skin detail (the shared
   512² triplanar atlas and its screen-derivative bump, which read as a soft blur on the pancreas: its lobulation bump was
   5–20× the other organs' and faded out at normal viewing distance). The material colour goes to white so the map carries
   the hue; pathology tints (pancreatitis) still multiply it. Until the maps arrive the procedural skin stays. */
const ORG_TEX={};
function organTex44(m,organ,o){
  const phone=innerWidth<=860||(innerHeight<=520&&matchMedia('(pointer:coarse)').matches), tag=phone?'1k':'2k';
  const ld=new THREE.TextureLoader(), an=renderer.capabilities.getMaxAnisotropy();
  const L=(f,cs)=>new Promise((ok,no)=>ld.load(`${organ}44_${f}_${tag}.webp`,t=>{ t.colorSpace=cs; t.anisotropy=an; ok(t); },undefined,()=>no(new Error(f))));
  Promise.all([L('albedo',THREE.SRGBColorSpace),L('normal',THREE.NoColorSpace),L('orm',THREE.NoColorSpace)]).then(([A,N,O])=>{
    const U=m.userData.skin; m.map=A; m.normalMap=N; m.normalScale=new THREE.Vector2(1,1);
    if(U){ U.tOrgO.value=O; U.uSkK.value.set(0,0,0,0); U.uSkK2.value.set(0,0,0.75); }   // clearcoat follows the baked relief
    m.color.set(0xffffff); m.emissive.copy(new THREE.Color(0xE8B080).multiplyScalar(o.emissive)); m.clearcoat=o.clearcoat; m.clearcoatRoughness=o.clearcoatRoughness;
    m.defines=Object.assign(m.defines||{},{SKIN_ORG44:''}); m.needsUpdate=true; ORG_TEX[organ]=true;
    const P=tiers[0].built&&tiers[0].inner.userData.P; if(organ==='pancreas'&&P&&P.panc){ P.panc.base.copy(m.color); P.panc.baseE.copy(m.emissive); P.panc.key=''; }
  }).catch(e=>console.warn(organ+' maps unavailable:',e.message));
  return m;
}
let CT_ORGANS=null;
function ctViscera(L,gutMat){
  const Vd=LDL.viscera, qs=LDL.qs, out={};
  const geom=(d,c)=>{ const p16=new Int16Array(b64(d.pos).buffer), ix=new Uint16Array(b64(d.idx).buffer), P=new Float32Array(p16.length);
    for(let i=0;i<p16.length;i++) P[i]=p16[i]*qs-(c?c[i%3]:0);
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(P,3));
    g.setIndex(new THREE.BufferAttribute(ix,1));
    if(d.uv){ const q=new Uint16Array(b64(d.uv).buffer), uv=new Float32Array(q.length); for(let i=0;i<q.length;i++) uv[i]=q[i]/65535;
      g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); const dup=new Uint16Array(b64(d.dup).buffer), n0=d.n0, cvn=g.computeVertexNormals.bind(g);
      g.computeVertexNormals=()=>{ cvn(); const N=g.attributes.normal.array;   // v44: seam copies share one normal (no lighting seam)
        for(let k=0;k<dup.length;k++){ const a=dup[k]*3, e=(n0+k)*3; N[a]+=N[e]; N[a+1]+=N[e+1]; N[a+2]+=N[e+2]; }
        for(let k=0;k<dup.length;k++){ const a=dup[k]*3, l=Math.hypot(N[a],N[a+1],N[a+2])||1; N[a]/=l; N[a+1]/=l; N[a+2]/=l; }
        for(let k=0;k<dup.length;k++){ const a=dup[k]*3, e=(n0+k)*3; N[e]=N[a]; N[e+1]=N[a+1]; N[e+2]=N[a+2]; } g.attributes.normal.needsUpdate=true; }; }
    g.computeVertexNormals(); g.computeBoundingSphere(); return g; };
  const glossy=(c,o={})=>mat(c,Object.assign({roughness:0.34,clearcoat:0.6,clearcoatRoughness:0.35,emissive:new THREE.Color(c).multiplyScalar(0.18)},o));
  const STY={
    stomach:()=>skin(mat(0xD98A7A,{roughness:0.46,clearcoat:0.85,clearcoatRoughness:0.18,sheen:0.35,sheenColor:new THREE.Color(0xF2B8A8),sheenRoughness:0.6,side:THREE.DoubleSide}),'stomach'),
    duodenum:()=>skin(mat(0xD08A76,{roughness:0.46,clearcoat:0.80,clearcoatRoughness:0.2,sheen:0.30,sheenColor:new THREE.Color(0xEDB49A),sheenRoughness:0.6,side:THREE.DoubleSide}),'duodenum'),
    esophagus:()=>skin(mat(0xC6857A,{roughness:0.50,clearcoat:0.70,clearcoatRoughness:0.24,sheen:0.30,sheenColor:new THREE.Color(0xEDB0A0),sheenRoughness:0.6,side:THREE.DoubleSide}),'oes'),
    spleen:()=>skin(mat(0x57202F,{roughness:0.48,clearcoat:0.6,clearcoatRoughness:0.28,sheen:0.25,sheenColor:new THREE.Color(0xA0506A),sheenRoughness:0.6,emissive:new THREE.Color(0x57202F).multiplyScalar(0.10)}),'spleen'),
    kidney_left:()=>skin(mat(0x8A3E32,{roughness:0.56,clearcoat:0.35,clearcoatRoughness:0.38}),'kidney'),
    kidney_right:()=>skin(mat(0x8A3E32,{roughness:0.56,clearcoat:0.35,clearcoatRoughness:0.38}),'kidney'),
    pancreas:()=>organTex44(skin(mat(0xD4A872,{roughness:0.70,clearcoat:0.15,clearcoatRoughness:0.5,emissive:new THREE.Color(0xD4A872).multiplyScalar(0.07)}),'pancreas'),'pancreas',
      {clearcoat:0.55,clearcoatRoughness:0.30,emissive:0.03})};
  const mesh={};
  for(const k in Vd){ const d=Vd[k], own=k==='spleen';
    const m=tag(new THREE.Mesh(geom(d,own?d.c:null),STY[k]()),d.name);
    if(own) m.position.set(...d.c);
    mesh[k]=m; }
  // kidneys: both kidneys plus short renal artery (posterior) and renal vein (anterior) segments at each hilum
  const kid=new THREE.Group(); kid.add(mesh.kidney_left, mesh.kidney_right);
  const stub=(pts,r0,r1,col,name)=>kid.add(tag(new THREE.Mesh(
    varTube(pts.map(p=>new THREE.Vector3(...p)),t=>THREE.MathUtils.lerp(r0,r1,t),28,14),glossy(col)),name));
  stub([[1.13,-0.63,-0.67],[1.01,-0.64,-0.54],[0.87,-0.65,-0.38]],0.040,0.036,C.artery,'Renal artery');
  stub([[1.12,-0.70,-0.58],[0.97,-0.71,-0.47],[0.83,-0.71,-0.36]],0.058,0.054,C.vein,'Renal vein');
  stub([[-0.21,-0.61,-0.64],[-0.02,-0.60,-0.42],[0.20,-0.60,-0.22]],0.038,0.034,C.artery,'Renal artery');
  stub([[-0.21,-0.68,-0.55],[-0.12,-0.69,-0.30],[-0.05,-0.69,-0.07]],0.056,0.060,C.vein,'Renal vein');
  for(const [k,o] of [['stomach',mesh.stomach],['esophagus',mesh.esophagus],['duodenum',mesh.duodenum],['pancreas',mesh.pancreas],['spleen',mesh.spleen],['kidneys',kid]]){
    L.viscera.add(o); out[k]=o; }
  CT_ORGANS=out;
  return {spleen:mesh.spleen, SPLEEN_C:new THREE.Vector3(...Vd.spleen.c)};
}
/* v40 context structures (Stage 2): ribs 1–12, costal cartilages, sternum, T1–L5 and the sacrum, segmented from the same
   CT (TotalSegmentator s1267) and registered to the model frame (about 1 mm). The geometry sits beside the page in
   ctx40.json (base64) and is fetched the first time the layer is switched on, so the default view never pays for it. One merged
   mesh per material (bone, cartilage); a part id per face drives picking. */
const CTX_META={"qs":0.00015,"groups":{"bone":{"nv":38552,"nf":77060,"pos":0,"idx":231312,"idx32":false,"pid":693672},"cart":{"nv":4921,"nf":9762,"pos":770732,"idx":800260,"idx32":false,"pid":858832}},"parts":[{"n":"rib_R1","l":"1st rib (right)","g":"bone"},{"n":"rib_R2","l":"2nd rib (right)","g":"bone"},{"n":"rib_R3","l":"3rd rib (right)","g":"bone"},{"n":"rib_R4","l":"4th rib (right)","g":"bone"},{"n":"rib_R5","l":"5th rib (right)","g":"bone"},{"n":"rib_R6","l":"6th rib (right)","g":"bone"},{"n":"rib_R7","l":"7th rib (right)","g":"bone"},{"n":"rib_R8","l":"8th rib (right)","g":"bone"},{"n":"rib_R9","l":"9th rib (right)","g":"bone"},{"n":"rib_R10","l":"10th rib (right)","g":"bone"},{"n":"rib_R11","l":"11th rib (right)","g":"bone"},{"n":"rib_R12","l":"12th rib (right)","g":"bone"},{"n":"rib_L1","l":"1st rib (left)","g":"bone"},{"n":"rib_L2","l":"2nd rib (left)","g":"bone"},{"n":"rib_L3","l":"3rd rib (left)","g":"bone"},{"n":"rib_L4","l":"4th rib (left)","g":"bone"},{"n":"rib_L5","l":"5th rib (left)","g":"bone"},{"n":"rib_L6","l":"6th rib (left)","g":"bone"},{"n":"rib_L7","l":"7th rib (left)","g":"bone"},{"n":"rib_L8","l":"8th rib (left)","g":"bone"},{"n":"rib_L9","l":"9th rib (left)","g":"bone"},{"n":"rib_L10","l":"10th rib (left)","g":"bone"},{"n":"rib_L11","l":"11th rib (left)","g":"bone"},{"n":"rib_L12","l":"12th rib (left)","g":"bone"},{"n":"sternum","l":"Sternum","g":"bone"},{"n":"vert_T1","l":"T1 vertebra","g":"bone"},{"n":"vert_T2","l":"T2 vertebra","g":"bone"},{"n":"vert_T3","l":"T3 vertebra","g":"bone"},{"n":"vert_T4","l":"T4 vertebra","g":"bone"},{"n":"vert_T5","l":"T5 vertebra","g":"bone"},{"n":"vert_T6","l":"T6 vertebra","g":"bone"},{"n":"vert_T7","l":"T7 vertebra","g":"bone"},{"n":"vert_T8","l":"T8 vertebra","g":"bone"},{"n":"vert_T9","l":"T9 vertebra","g":"bone"},{"n":"vert_T10","l":"T10 vertebra","g":"bone"},{"n":"vert_T11","l":"T11 vertebra","g":"bone"},{"n":"vert_T12","l":"T12 vertebra","g":"bone"},{"n":"vert_L1","l":"L1 vertebra","g":"bone"},{"n":"vert_L2","l":"L2 vertebra","g":"bone"},{"n":"vert_L3","l":"L3 vertebra","g":"bone"},{"n":"vert_L4","l":"L4 vertebra","g":"bone"},{"n":"vert_L5","l":"L5 vertebra","g":"bone"},{"n":"sacrum","l":"Sacrum","g":"bone"},{"n":"cc_R1","l":"Costal cartilage, 1st rib (right)","g":"cart"},{"n":"cc_R2","l":"Costal cartilage, 2nd rib (right)","g":"cart"},{"n":"cc_R3","l":"Costal cartilage, 3rd rib (right)","g":"cart"},{"n":"cc_R4","l":"Costal cartilage, 4th rib (right)","g":"cart"},{"n":"cc_R5","l":"Costal cartilage, 5th rib (right)","g":"cart"},{"n":"cc_R6","l":"Costal cartilage, 6th rib (right)","g":"cart"},{"n":"cc_R7","l":"Costal cartilage, 7th rib (right)","g":"cart"},{"n":"cc_R8","l":"Costal cartilage, 8th rib (right)","g":"cart"},{"n":"cc_R9","l":"Costal cartilage, 9th rib (right)","g":"cart"},{"n":"cc_R10","l":"Costal cartilage, 10th rib (right)","g":"cart"},{"n":"cc_L1","l":"Costal cartilage, 1st rib (left)","g":"cart"},{"n":"cc_L2","l":"Costal cartilage, 2nd rib (left)","g":"cart"},{"n":"cc_L3","l":"Costal cartilage, 3rd rib (left)","g":"cart"},{"n":"cc_L4","l":"Costal cartilage, 4th rib (left)","g":"cart"},{"n":"cc_L5","l":"Costal cartilage, 5th rib (left)","g":"cart"},{"n":"cc_L6","l":"Costal cartilage, 6th rib (left)","g":"cart"},{"n":"cc_L7","l":"Costal cartilage, 7th rib (left)","g":"cart"},{"n":"cc_L8","l":"Costal cartilage, 8th rib (left)","g":"cart"},{"n":"cc_L9","l":"Costal cartilage, 9th rib (left)","g":"cart"},{"n":"cc_L10","l":"Costal cartilage, 10th rib (left)","g":"cart"}]};
const CTX={ready:false,failed:false,loading:null,group:null};
function ctxLoad(){
  if(CTX.loading) return CTX.loading;
  CTX.loading=fetch('ctx41.json').then(r=>{ if(!r.ok) throw new Error('ctx40.json '+r.status); return r.json(); })
    .then(j=>{ const s=atob(j.b64), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u.buffer; })   // base64: the artifact host serves no raw binary type
    .then(buf=>{ ctxBuild(buf); CTX.ready=true; applyModes(); })
    .catch(e=>{ CTX.failed=true; console.warn('context geometry unavailable:',e.message); });
  return CTX.loading;
}
function ctxBuild(buf){
  const M=CTX_META, qs=M.qs, L=tiers[0].inner.userData.L, g=new THREE.Group(); g.name='ribcage';
  const STY={
    bone:()=>skin(mat(0xE6DAC0,{roughness:0.66,clearcoat:0.10,clearcoatRoughness:0.6,sheen:0.25,sheenColor:new THREE.Color(0xFFF2D8),sheenRoughness:0.8,emissive:new THREE.Color(0xE6DAC0).multiplyScalar(0.05)}),'bone'),
    cart:()=>skin(mat(0xD6BA7C,{roughness:0.40,clearcoat:0.45,clearcoatRoughness:0.3,sheen:0.25,sheenColor:new THREE.Color(0xF4E4B8),sheenRoughness:0.5,emissive:new THREE.Color(0xD6BA7C).multiplyScalar(0.06)}),'cart')};
  for(const k of ['bone','cart']){ const G=M.groups[k];
    const p16=new Int16Array(buf,G.pos,G.nv*3), P=new Float32Array(G.nv*3); for(let i=0;i<P.length;i++) P[i]=p16[i]*qs;
    const ix=(G.idx32?new Uint32Array(buf,G.idx,G.nf*3):new Uint16Array(buf,G.idx,G.nf*3)).slice(), pid=new Uint8Array(buf,G.pid,G.nf).slice();
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(P,3)); geo.setIndex(new THREE.BufferAttribute(ix,1));
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    const m=new THREE.Mesh(geo,STY[k]()); m.name='ctx-'+k; m.userData.pickFace=f=>{ const p=M.parts[pid[f]]; return p?p.l:'Ribcage & spine'; };
    g.add(m); }
  L.viscera.add(g); registerFade(g); CTX.group=g;
}

/* v41 diaphragm (textbook form): thin musculotendinous shell built offline (agentic/dia41.py) from the thoracic floor of the same
   CT (lung and heart masks, fitting only; lungs are not rendered) and the model's organ tops (organs win); trefoil central tendon,
   crura to L1–L3 (right) and L1–L2 (left), median arcuate ligament, openings for the IVC, oesophagus and aorta. dia41.json, fetched
   on first use. Vertex colour carries muscle vs tendon; a part id per face drives picking. */
const DIA_META={"qs":0.00015,"nv":14088,"nf":28000,"pos":0,"idx":84528,"col":252528,"pid":294792,"parts":["Diaphragm (muscular part)","Central tendon of the diaphragm","Right crus of the diaphragm","Left crus of the diaphragm","Median arcuate ligament","Caval opening (diaphragm)","Oesophageal hiatus","Aortic hiatus"]};
const DIA={ready:false,failed:false,loading:null,group:null};
function diaLoad(){
  if(DIA.loading) return DIA.loading;
  DIA.loading=fetch('dia41.json').then(r=>{ if(!r.ok) throw new Error('dia41.json '+r.status); return r.json(); })
    .then(j=>{ const s=atob(j.b64), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u.buffer; })
    .then(buf=>{ diaBuild(buf); DIA.ready=true; applyModes(); })
    .catch(e=>{ DIA.failed=true; console.warn('diaphragm geometry unavailable:',e.message); });
  return DIA.loading;
}
function diaBuild(buf){
  const M=DIA_META, L=tiers[0].inner.userData.L, g=new THREE.Group(); g.name='diaphragm';
  const p16=new Int16Array(buf,M.pos,M.nv*3), P=new Float32Array(M.nv*3); for(let i=0;i<P.length;i++) P[i]=p16[i]*M.qs;
  const c8=new Uint8Array(buf,M.col,M.nv*3), Cc=new Float32Array(M.nv*3); for(let i=0;i<Cc.length;i++) Cc[i]=Math.pow(c8[i]/255,2.2);
  const ix=new Uint16Array(buf,M.idx,M.nf*3).slice(), pid=new Uint8Array(buf,M.pid,M.nf).slice();
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(P,3)); geo.setAttribute('color',new THREE.BufferAttribute(Cc,3));
  geo.setIndex(new THREE.BufferAttribute(ix,1)); geo.computeVertexNormals(); geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,skin(mat(0xFFFFFF,{vertexColors:true,roughness:0.55,clearcoat:0.35,clearcoatRoughness:0.45,sheen:0.3,sheenColor:new THREE.Color(0xF0C8C0),sheenRoughness:0.6,emissive:new THREE.Color(0x3A1210).multiplyScalar(0.25)}),'dia'));
  m.name='ctx-dia'; m.userData.pickFace=f=>M.parts[pid[f]]||'Diaphragm';
  g.add(m); L.viscera.add(g); registerFade(g); DIA.group=g;
}

/* v44: spine centreline in world space, from the loaded context mesh (same body selection as pipeline/spine44.py): X / Z drift
   of the least-squares line through the T1–L5 vertebral body centroids from world vertical, over its length, in mm */
function spineCheck(){
  if(!CTX.group) return null; const m=CTX.group.children.find(o=>o.name==='ctx-bone'); if(!m) return null;
  m.updateMatrixWorld(true); const g=m.geometry, P=g.attributes.position, I=g.index.array, M=CTX_META, pid=new Map();
  const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3(), cen=[];
  const pidOf=m.userData.pickFace; M.parts.forEach((p,i)=>{ if(p.n.startsWith('vert_')) pid.set(p.l,i); });
  const faces=new Map(); for(let f=0;f<I.length/3;f++){ const l=pidOf(f); if(pid.has(l)){ (faces.get(l)||faces.set(l,[]).get(l)).push(f); } }
  for(const [,fs] of faces){ const C=fs.map(f=>{ a.fromBufferAttribute(P,I[f*3]); b.fromBufferAttribute(P,I[f*3+1]); c.fromBufferAttribute(P,I[f*3+2]);
      const ar=b.clone().sub(a).cross(c.clone().sub(a)).length()/2; return {p:a.clone().add(b).add(c).multiplyScalar(1/3),ar}; });
    const zs=C.map(q=>q.p.z), z0=Math.min(...zs), z1=Math.max(...zs), xm=[...C.map(q=>q.p.x)].sort((u,v)=>u-v)[C.length>>1];
    const s=new THREE.Vector3(); let w=0; for(const q of C) if(q.p.z>z1-0.38*(z1-z0)&&Math.abs(q.p.x-xm)<0.45){ s.addScaledVector(q.p,q.ar); w+=q.ar; }
    cen.push(s.multiplyScalar(1/w).applyMatrix4(m.matrixWorld)); }
  const mu=cen.reduce((s,p)=>s.add(p),new THREE.Vector3()).multiplyScalar(1/cen.length);
  // principal axis by power iteration on the scatter matrix
  const S=[0,0,0,0,0,0,0,0,0]; for(const p of cen){ const d=[p.x-mu.x,p.y-mu.y,p.z-mu.z]; for(let i=0;i<3;i++) for(let j=0;j<3;j++) S[i*3+j]+=d[i]*d[j]; }
  let v=[0,1,0]; for(let it=0;it<200;it++){ const n=[0,1,2].map(i=>S[i*3]*v[0]+S[i*3+1]*v[1]+S[i*3+2]*v[2]), l=Math.hypot(...n); v=n.map(x=>x/l); }
  if(v[1]<0) v=v.map(x=>-x);
  const t=cen.map(p=>(p.x-mu.x)*v[0]+(p.y-mu.y)*v[1]+(p.z-mu.z)*v[2]), L=Math.max(...t)-Math.min(...t);
  const mm=UNIT_M*1000/tiers[0].group.scale.x;
  return {n:cen.length, lengthMm:L*mm, dxMm:v[0]/v[1]*L*mm, dzMm:v[2]/v[1]*L*mm, dir:v, centroid:[mu.x,mu.y,mu.z]};
}
/* v41: draw calls / triangles / CPU submit time of one frame (renderer.info.autoReset off around the frame; the v40 harness read
   the last post-processing pass only) */
function frameStats(){ const info=renderer.info, ar=info.autoReset; info.autoReset=false; info.reset(); let s=camera; while(s.parent) s=s.parent;
  const t0=performance.now(); renderer.render(s,camera); renderer.getContext().finish(); const ms=performance.now()-t0;
  const r={calls:info.render.calls,triangles:info.render.triangles,ms:+ms.toFixed(1)}; info.autoReset=ar; info.reset(); return r; }
/* right lower ribs (5–12), surface samples: percutaneous needle and drain tracks are chosen to clear them */
const RIBS_R=(()=>{ const R={"5":[[-1.475,2.026,-0.076],[-1.468,1.931,0.02],[-0.895,2.958,-1.08],[-1.068,1.255,1.034],[-0.246,3.184,-1.099],[-0.24,3.084,-1.085],[-1.536,1.825,0.117],[-1.344,1.449,0.66],[-1.089,1.354,0.987],[-1.184,2.659,-0.93],[-1.365,1.469,0.624],[-0.311,3.136,-1.143],[-1.269,2.577,-0.73],[-1.487,2.342,-0.465],[-0.318,3.07,-1.098],[-1.381,1.545,0.571],[-1.483,1.728,0.307],[-0.838,1.16,1.132],[-1.5,2.045,-0.034],[-1.473,1.641,0.363],[-1.391,1.618,0.409],[-1.156,1.409,0.895],[-1.109,2.768,-1.001],[-0.616,2.993,-1.149],[-0.798,3.005,-1.145],[-0.961,2.913,-1.037],[-0.18,3.073,-0.999],[-0.357,3.096,-1.147],[-1.026,2.816,-0.962],[-1.28,2.586,-0.714],[-1.382,1.622,0.521],[-1.389,2.492,-0.681],[-1.2,2.628,-0.839],[-1.377,2.482,-0.58],[-1.089,2.763,-1.023],[-0.715,3.058,-1.139],[-1.467,2.15,-0.219],[-1.052,1.322,0.965],[-1.412,2.451,-0.643],[-1.318,2.581,-0.779],[-1.551,2.011,-0.085],[-1.431,2.315,-0.409],[-1.485,2.05,-0.061],[-0.667,3.084,-1.147],[-1.068,2.772,-0.934],[-1.228,2.599,-0.809],[-1.185,1.431,0.8],[-1.076,1.247,0.954],[-0.108,3.106,-0.936],[-1.105,1.227,0.999],[-1.323,2.506,-0.758],[-1.525,1.782,0.14],[-1.505,2.126,-0.137],[-0.962,1.254,1.11],[-1.546,2.054,-0.103],[-0.693,1.128,1.27],[-0.62,3.027,-1.215],[-0.297,3.074,-1.045],[-0.858,2.887,-1.085],[-1.261,2.565,-0.764],[-0.49,3.046,-1.119],[-1.47,1.88,0.182],[-0.882,2.895,-1.048],[-0.272,3.176,-1.004],[-0.11,3.126,-0.935],[-0.711,3.043,-1.108],[-1.515,1.883,-0.011],[-1.504,2.147,-0.167],[-1.13,1.268,0.973],[-1.356,1.604,0.476],[-1.498,1.84,0.055],[-0.992,1.145,1.061],[-1.416,1.593,0.495],[-1.424,2.316,-0.52],[-1.411,1.674,0.338],[-0.596,3.0,-1.148],[-0.755,3.0,-1.191],[-0.736,2.942,-1.138],[-0.201,3.196,-0.98],[-0.751,2.994,-1.089],[-1.514,2.147,-0.345],[-1.107,1.223,0.94],[-1.375,1.457,0.608],[-1.47,2.227,-0.431],[-1.52,2.214,-0.388],[-1.39,1.636,0.399],[-1.011,1.244,1.082],[-1.457,1.705,0.238],[-0.769,1.192,1.206],[-1.478,1.712,0.326],[-1.174,1.25,0.919],[-1.424,1.774,0.262],[-1.191,2.738,-0.863],[-0.962,2.905,-1.082],[-1.168,2.68,-0.947],[-0.271,3.149,-1.132],[-0.233,3.185,-0.984],[-1.182,1.344,0.901],[-1.212,1.361,0.783],[-1.445,1.64,0.426],[-1.289,1.511,0.625],[-1.147,1.25,0.954],[-1.433,1.733,0.253],[-1.216,1.403,0.837],[-1.263,1.425,0.774],[-1.169,1.272,0.929],[-1.311,2.606,-0.709],[-0.827,1.217,1.137],[-0.702,2.994,-1.216],[-1.439,2.328,-0.562],[-1.164,1.409,0.826],[-0.887,1.12,1.121],[-0.217,3.104,-1.101],[-0.144,3.18,-0.952],[-1.477,1.91,0.143],[-0.66,1.061,1.245],[-0.279,3.076,-1.027],[-0.746,2.931,-1.155],[-1.23,1.458,0.732],[-1.278,2.651,-0.775],[-1.194,1.418,0.852],[-1.531,2.023,-0.206],[-0.836,1.191,1.181],[-0.702,3.065,-1.156],[-0.944,1.322,1.086],[-1.521,1.785,0.183],[-1.053,2.774,-0.952],[-0.721,2.939,-1.181],[-0.111,3.12,-0.966],[-0.788,2.993,-1.171],[-1.554,2.042,-0.157],[-0.814,3.003,-1.097],[-1.324,2.547,-0.775],[-1.518,2.093,-0.287],[-1.497,1.971,-0.099],[-1.074,2.807,-1.026],[-1.445,2.422,-0.57],[-0.949,1.181,1.057],[-1.347,1.514,0.534],[-1.206,2.695,-0.904],[-1.453,1.872,0.131],[-1.15,1.338,0.855],[-1.02,1.347,1.037],[-1.526,2.221,-0.304],[-1.038,1.185,1.059],[-1.486,2.329,-0.489],[-1.089,1.297,1.008],[-0.986,1.307,1.077],[-0.25,3.102,-0.98],[-0.902,2.945,-1.113],[-0.84,1.13,1.154],[-1.159,2.684,-0.861],[-0.154,3.18,-1.061],[-0.648,1.114,1.271],[-1.521,2.107,-0.301],[-0.55,3.12,-1.171],[-1.514,2.223,-0.273],[-0.166,3.182,-0.952],[-1.377,2.503,-0.701],[-0.88,1.289,1.115],[-0.849,1.275,1.138],[-1.489,2.047,-0.191],[-1.53,2.199,-0.268],[-0.354,3.064,-1.099],[-1.205,1.354,0.87],[-0.712,2.977,-1.111],[-1.095,1.398,0.953],[-1.413,1.548,0.523],[-1.398,2.454,-0.668],[-0.681,1.14,1.282],[-1.463,2.219,-0.403],[-0.997,1.325,1.014],[-1.113,2.803,-0.928],[-0.277,3.088,-1.005],[-1.544,2.159,-0.266],[-1.222,1.44,0.744],[-1.278,1.513,0.643],[-1.298,1.352,0.741],[-1.288,2.565,-0.82],[-1.476,2.004,-0.088],[-0.928,2.933,-1.095],[-1.489,2.287,-0.338],[-1.2,2.674,-0.815],[-1.461,2.289,-0.514],[-1.146,2.709,-0.971],[-1.154,2.761,-0.946],[-1.5,2.307,-0.441],[-0.564,3.028,-1.206],[-0.837,1.144,1.173],[-0.964,2.862,-1.109],[-1.464,1.82,0.129],[-1.053,2.849,-1.008],[-1.441,2.291,-0.499],[-0.171,3.084,-1.036],[-1.539,1.861,0.088],[-1.528,2.133,-0.16],[-0.712,3.016,-1.096],[-1.342,2.563,-0.663],[-0.751,2.937,-1.197],[-1.008,1.307,1.065],[-0.202,3.203,-1.001],[-0.359,3.189,-1.085],[-0.654,3.028,-1.215],[-1.448,1.807,0.28],[-0.224,3.149,-0.963],[-0.289,3.136,-1.137],[-1.513,1.939,0.092],[-0.133,3.081,-0.956],[-0.838,2.969,-1.151],[-0.761,2.952,-1.105],[-1.55,2.098,-0.241],[-1.049,2.853,-0.981],[-1.314,1.583,0.578],[-1.311,1.572,0.615],[-1.391,1.674,0.461],[-1.319,2.499,-0.671],[-1.471,1.966,-0.011],[-1.386,1.687,0.403],[-1.369,2.453,-0.697],[-0.954,1.33,1.054],[-0.315,3.112,-1.14],[-0.862,2.933,-1.159],[-1.502,1.757,0.157],[-1.301,2.557,-0.805],[-0.897,1.224,1.087],[-1.395,1.698,0.375],[-1.545,1.975,-0.019],[-1.518,1.8,0.096],[-1.472,2.078,-0.165],[-0.406,3.154,-1.146],[-1.418,2.322,-0.496],[-1.222,1.293,0.814],[-1.397,1.563,0.54],[-0.35,3.132,-1.15],[-0.74,1.185,1.228],[-1.547,2.038,-0.09],[-0.961,2.829,-1.021],[-0.868,2.871,-1.115],[-0.302,3.068,-1.069],[-1.273,1.391,0.697],[-0.914,1.307,1.083],[-0.882,2.964,-1.102],[-0.651,1.106,1.238],[-1.461,2.17,-0.307],[-1.532,2.025,-0.029],[-1.123,2.689,-0.942],[-0.299,3.084,-1.024],[-1.044,2.832,-0.956],[-1.186,1.366,0.886],[-1.418,1.569,0.405],[-1.423,2.41,-0.622],[-1.49,1.975,0.055],[-1.156,1.436,0.87],[-0.848,1.169,1.183],[-1.479,1.664,0.346],[-1.482,2.313,-0.368],[-0.733,1.2,1.206],[-1.374,2.406,-0.578],[-1.52,2.088,-0.09],[-0.701,1.149,1.264]],"6":[[-1.019,0.808,1.114],[-1.092,0.731,1.021],[-1.355,0.949,0.682],[-1.375,2.153,-0.758],[-1.013,0.727,1.161],[-0.339,2.844,-1.26],[-0.19,2.845,-1.147],[-1.531,1.499,0.137],[-1.457,1.357,0.24],[-1.452,2.086,-0.545],[-0.831,2.571,-1.235],[-1.491,1.64,-0.144],[-1.358,1.056,0.605],[-0.677,2.64,-1.316],[-0.825,0.648,1.232],[-1.207,2.319,-0.874],[-1.43,1.25,0.375],[-1.273,0.998,0.776],[-1.459,1.154,0.426],[-0.668,2.69,-1.33],[-1.147,0.889,1.003],[-1.079,0.686,1.047],[-0.958,0.558,1.167],[-1.491,1.98,-0.446],[-1.469,1.313,0.4],[-0.412,2.826,-1.288],[-0.88,2.626,-1.252],[-1.42,1.066,0.608],[-1.142,2.409,-1.065],[-1.38,0.972,0.645],[-1.473,1.776,-0.209],[-1.526,1.548,0.094],[-0.897,0.495,1.277],[-1.459,1.946,-0.524],[-0.931,2.618,-1.173],[-1.271,0.935,0.866],[-0.863,2.639,-1.18],[-1.438,1.073,0.539],[-1.273,2.319,-0.911],[-1.472,1.251,0.44],[-1.361,1.024,0.615],[-1.101,0.876,1.032],[-1.203,0.74,0.986],[-1.251,0.881,0.908],[-0.965,0.528,1.213],[-1.45,2.085,-0.592],[-1.467,1.366,0.209],[-1.55,1.63,-0.072],[-1.452,1.109,0.513],[-0.387,2.823,-1.292],[-1.42,1.083,0.514],[-1.476,1.608,-0.057],[-1.479,1.23,0.439],[-1.168,0.874,0.995],[-1.229,0.835,0.951],[-0.714,2.656,-1.329],[-1.538,1.699,-0.115],[-1.528,1.753,-0.164],[-0.834,2.661,-1.27],[-1.41,2.124,-0.697],[-1.471,1.538,0.067],[-0.845,0.658,1.213],[-1.532,1.81,-0.259],[-1.109,0.671,1.042],[-0.827,2.617,-1.199],[-0.524,2.789,-1.314],[-1.413,1.156,0.579],[-0.915,0.489,1.226],[-1.171,2.382,-1.035],[-1.307,0.882,0.767],[-1.524,1.618,0.012],[-0.809,2.614,-1.212],[-0.657,2.644,-1.308],[-1.293,2.279,-0.887],[-1.545,1.506,0.02],[-1.416,1.962,-0.501],[-0.951,0.677,1.134],[-1.454,1.116,0.484],[-1.48,1.964,-0.389],[-0.848,0.444,1.265],[-0.453,2.74,-1.321],[-1.313,1.052,0.736],[-1.525,1.857,-0.322],[-1.05,2.428,-1.099],[-1.392,1.012,0.595],[-1.482,1.503,0.046],[-0.984,0.628,1.206],[-1.484,1.744,-0.272],[-1.485,1.253,0.415],[-1.31,2.257,-0.733],[-1.437,1.174,0.423],[-0.904,2.606,-1.156],[-0.891,0.619,1.265],[-0.207,2.846,-1.217],[-1.1,0.745,1.099],[-0.896,2.521,-1.237],[-0.25,2.77,-1.183],[-0.955,0.559,1.232],[-0.645,2.771,-1.269],[-1.431,1.131,0.57],[-1.37,0.961,0.724],[-1.271,2.249,-0.788],[-1.515,1.456,0.06],[-1.475,1.609,-0.021],[-1.331,2.202,-0.689],[-0.874,0.486,1.294],[-1.367,2.083,-0.649],[-1.5,1.617,0.021],[-1.232,0.779,0.952],[-1.515,1.307,0.283],[-0.894,0.604,1.183],[-0.932,0.569,1.174],[-0.868,0.453,1.28],[-0.745,2.675,-1.222],[-1.369,1.0,0.716],[-1.47,1.9,-0.468],[-0.876,0.524,1.212],[-0.944,0.677,1.217],[-1.354,2.193,-0.796],[-1.191,0.743,1.005],[-1.15,0.777,0.958],[-0.412,2.782,-1.317],[-0.987,0.753,1.1],[-1.354,2.261,-0.762],[-1.108,2.487,-1.077],[-0.79,0.528,1.256],[-1.414,1.975,-0.481],[-1.499,1.334,0.215],[-0.928,2.595,-1.14],[-1.382,1.163,0.521],[-0.549,2.685,-1.293],[-1.033,0.657,1.088],[-1.135,0.677,1.033],[-1.482,1.685,-0.091],[-0.983,0.602,1.211],[-1.544,1.594,-0.094],[-1.53,1.818,-0.319],[-1.157,0.722,1.049],[-0.894,2.55,-1.178],[-1.335,2.173,-0.805],[-1.477,1.847,-0.263],[-1.449,1.849,-0.331],[-0.859,0.672,1.204],[-0.96,0.721,1.189],[-0.362,2.851,-1.236],[-1.053,0.726,1.05],[-1.545,1.72,-0.172],[-1.066,2.499,-1.13],[-1.104,0.773,1.0],[-1.486,1.606,-0.086],[-1.363,0.993,0.634],[-0.533,2.692,-1.282],[-0.764,2.593,-1.307],[-0.767,2.693,-1.301],[-1.11,2.427,-1.098],[-0.999,0.753,1.158],[-1.278,2.236,-0.896],[-1.47,1.476,0.111],[-1.285,2.265,-0.898],[-0.976,0.705,1.114],[-1.46,1.963,-0.393],[-1.454,1.135,0.521],[-0.84,0.478,1.322],[-1.406,1.01,0.64],[-1.197,2.312,-0.909],[-0.441,2.819,-1.296],[-1.467,1.278,0.297],[-1.409,1.056,0.631],[-0.294,2.853,-1.213],[-0.802,0.595,1.24],[-0.62,2.778,-1.288],[-1.084,2.421,-1.037],[-1.275,2.353,-0.882],[-1.479,1.376,0.333],[-1.459,2.031,-0.464],[-0.776,2.614,-1.234],[-1.409,2.131,-0.577],[-0.934,0.653,1.232],[-1.136,0.697,1.012],[-1.364,2.136,-0.761],[-1.0,0.685,1.183],[-1.456,1.219,0.364],[-1.4,2.156,-0.715],[-1.15,0.887,0.948],[-1.091,0.672,1.118],[-1.411,2.081,-0.533],[-0.22,2.766,-1.271],[-0.627,2.656,-1.306],[-0.483,2.702,-1.303],[-1.311,2.174,-0.771],[-1.374,1.148,0.545],[-1.217,0.83,0.876],[-1.465,2.023,-0.568],[-1.421,2.027,-0.624],[-0.266,2.756,-1.194],[-0.537,2.713,-1.328],[-1.401,1.079,0.638],[-1.366,2.094,-0.619],[-1.349,2.12,-0.668],[-0.914,2.627,-1.183],[-1.207,2.301,-0.976],[-1.514,1.365,0.281],[-1.433,1.202,0.408],[-0.858,2.655,-1.195],[-1.076,2.527,-1.087],[-1.345,2.245,-0.808],[-0.944,2.494,-1.217],[-1.475,1.591,-0.034],[-1.113,0.757,1.086],[-0.891,2.544,-1.271],[-0.867,2.585,-1.281],[-1.239,0.946,0.823],[-1.266,0.965,0.853],[-1.508,1.685,-0.06],[-1.217,0.918,0.855],[-1.291,1.018,0.739],[-0.864,2.614,-1.175],[-1.543,1.703,-0.213],[-1.14,0.733,1.067],[-0.778,0.523,1.272],[-0.954,2.488,-1.196],[-1.426,2.129,-0.651],[-0.915,0.561,1.264],[-1.272,0.921,0.777],[-1.326,2.292,-0.808],[-1.405,1.099,0.516],[-1.481,1.667,-0.071],[-1.476,1.632,-0.069],[-1.476,1.695,-0.132],[-1.346,1.092,0.625],[-1.471,1.742,-0.187],[-0.401,2.756,-1.316],[-0.447,2.725,-1.259],[-1.464,1.286,0.428],[-1.475,2.008,-0.543],[-1.309,1.018,0.778],[-0.581,2.679,-1.284],[-1.464,1.243,0.457],[-1.193,0.905,0.948],[-0.475,2.712,-1.268],[-0.834,0.629,1.279],[-0.725,2.628,-1.261],[-1.512,1.483,0.188],[-1.013,2.515,-1.075],[-1.314,2.187,-0.716],[-1.057,0.67,1.068],[-0.215,2.756,-1.182],[-0.371,2.72,-1.279],[-0.452,2.774,-1.24],[-1.144,0.817,0.952],[-1.11,2.41,-0.997],[-0.263,2.746,-1.281],[-0.392,2.838,-1.271],[-1.041,0.826,1.059],[-1.361,2.234,-0.696],[-1.229,0.767,0.916],[-1.289,2.247,-0.756],[-0.52,2.709,-1.267],[-0.605,2.666,-1.315],[-1.347,2.119,-0.698]],"7":[[-1.43,0.542,0.827],[-1.565,0.723,0.478],[-1.533,1.207,-0.036],[-1.117,2.042,-1.102],[-1.533,1.115,0.166],[-1.055,2.006,-1.231],[-1.276,1.874,-1.005],[-1.392,1.713,-0.655],[-1.529,1.064,0.153],[-1.439,0.618,0.757],[-0.813,2.236,-1.412],[-0.303,2.401,-1.361],[-0.286,2.363,-1.332],[-1.565,1.471,-0.243],[-1.453,1.777,-0.687],[-1.363,1.753,-0.766],[-1.358,1.801,-0.735],[-1.032,0.048,1.26],[-0.173,2.396,-1.329],[-0.992,2.066,-1.247],[-1.552,1.36,-0.285],[-1.332,1.942,-0.915],[-1.553,1.035,0.121],[-1.49,0.765,0.601],[-1.401,1.766,-0.644],[-1.333,0.288,1.008],[-1.55,1.517,-0.408],[-1.164,0.001,1.181],[-1.412,0.376,0.903],[-0.411,2.227,-1.421],[-1.164,1.995,-1.156],[-0.78,2.157,-1.433],[-1.52,0.928,0.409],[-1.18,0.045,1.095],[-1.587,1.187,0.101],[-1.417,0.546,0.73],[-1.455,1.591,-0.472],[-0.787,2.188,-1.435],[-1.285,0.197,1.058],[-0.525,2.267,-1.389],[-1.594,1.142,0.002],[-0.97,2.186,-1.307],[-1.488,1.56,-0.38],[-1.549,1.071,0.084],[-1.56,0.714,0.525],[-1.387,1.796,-0.834],[-1.4,1.687,-0.669],[-1.573,1.148,-0.034],[-1.432,1.766,-0.744],[-1.219,0.144,1.134],[-1.058,2.055,-1.17],[-0.339,2.326,-1.436],[-1.295,1.959,-0.884],[-0.241,2.41,-1.33],[-1.192,0.212,1.037],[-1.599,1.129,0.054],[-1.279,1.974,-1.002],[-1.542,1.574,-0.42],[-1.156,0.246,1.125],[-1.41,0.562,0.747],[-1.47,0.69,0.583],[-1.197,1.925,-1.066],[-1.361,0.361,0.874],[-1.569,1.46,-0.327],[-1.586,0.986,0.308],[-0.211,2.299,-1.383],[-1.528,0.914,0.288],[-0.723,2.197,-1.377],[-1.523,0.808,0.394],[-0.234,2.295,-1.33],[-1.44,1.79,-0.71],[-1.53,1.13,0.122],[-1.512,0.927,0.338],[-1.029,2.053,-1.208],[-1.151,0.181,1.164],[-1.145,-0.03,1.192],[-1.587,1.361,-0.198],[-1.401,1.844,-0.799],[-1.156,2.016,-1.056],[-1.097,-0.003,1.132],[-1.231,0.233,1.107],[-1.589,1.134,0.157],[-1.368,1.824,-0.72],[-1.492,0.727,0.64],[-1.416,1.664,-0.59],[-1.261,1.982,-1.029],[-1.307,0.323,0.927],[-1.546,1.123,0.194],[-1.49,0.807,0.493],[-1.508,1.379,-0.236],[-1.599,1.056,0.133],[-1.113,0.033,1.233],[-1.259,1.905,-0.928],[-0.954,2.1,-1.264],[-0.384,2.24,-1.436],[-1.574,1.286,-0.191],[-1.549,1.204,-0.084],[-1.409,1.765,-0.788],[-1.306,0.368,1.018],[-1.469,1.745,-0.659],[-1.094,0.084,1.226],[-1.475,1.508,-0.432],[-1.21,0.122,1.144],[-1.531,1.477,-0.242],[-1.523,0.763,0.432],[-1.576,1.415,-0.278],[-0.281,2.393,-1.337],[-0.282,2.266,-1.412],[-0.261,2.327,-1.419],[-1.035,0.079,1.245],[-0.927,2.204,-1.294],[-0.326,2.247,-1.407],[-0.226,2.339,-1.403],[-1.577,0.977,0.34],[-1.371,1.74,-0.743],[-1.516,0.884,0.345],[-1.455,1.757,-0.691],[-1.445,1.67,-0.525],[-0.908,2.187,-1.373],[-1.408,1.817,-0.79],[-0.304,2.364,-1.409],[-1.526,1.084,0.175],[-1.6,1.224,-0.009],[-1.548,0.941,0.404],[-0.393,2.261,-1.449],[-1.141,2.098,-1.118],[-0.594,2.265,-1.463],[-1.538,1.166,0.125],[-1.142,1.961,-1.128],[-0.676,2.274,-1.38],[-1.524,1.311,-0.183],[-1.545,1.256,-0.146],[-0.952,2.102,-1.358],[-1.426,1.804,-0.751],[-1.466,1.59,-0.44],[-1.444,1.73,-0.569],[-0.564,2.251,-1.39],[-1.466,1.6,-0.592],[-1.518,0.564,0.68],[-1.523,0.991,0.235],[-1.095,0.034,1.122],[-1.517,0.997,0.288],[-1.529,0.667,0.628],[-0.801,2.124,-1.395],[-1.447,0.568,0.796],[-0.963,2.194,-1.289],[-1.382,0.434,0.82],[-1.582,0.801,0.41],[-1.024,2.162,-1.257],[-1.312,0.41,0.919],[-1.445,1.744,-0.715],[-0.569,2.239,-1.468],[-1.188,0.017,1.144],[-0.731,2.262,-1.371],[-1.47,1.702,-0.656],[-1.39,1.705,-0.69],[-0.942,2.204,-1.316],[-1.047,0.062,1.251],[-1.129,0.23,1.126],[-1.296,0.399,0.945],[-0.522,2.34,-1.44],[-1.495,1.589,-0.565],[-1.413,1.822,-0.684],[-1.13,2.027,-1.091],[-0.488,2.256,-1.391],[-1.515,1.563,-0.35],[-0.729,2.293,-1.396],[-0.702,2.22,-1.376],[-0.703,2.303,-1.413],[-0.471,2.338,-1.445],[-1.545,0.672,0.584],[-1.102,2.057,-1.118],[-1.105,0.067,1.227],[-1.531,1.613,-0.465],[-0.935,2.082,-1.3],[-1.552,1.411,-0.148],[-1.225,0.304,1.008],[-0.579,2.27,-1.387],[-1.523,0.986,0.345],[-1.532,1.306,-0.067],[-1.504,0.551,0.724],[-1.496,1.435,-0.289],[-1.221,0.139,1.042],[-1.341,0.363,0.887],[-1.516,1.512,-0.47],[-0.91,2.146,-1.383],[-1.364,1.753,-0.789],[-1.474,0.606,0.744],[-1.561,0.913,0.416],[-0.692,2.19,-1.45],[-1.471,0.725,0.574],[-1.59,0.852,0.351],[-1.579,0.943,0.364],[-0.918,2.08,-1.325],[-1.518,1.651,-0.486],[-1.227,0.214,1.114],[-0.273,2.327,-1.329],[-1.546,1.097,0.057],[-1.398,1.798,-0.669],[-1.175,1.98,-1.142],[-1.36,0.29,0.959],[-1.515,0.977,0.305],[-1.196,0.033,1.122],[-1.208,1.947,-1.101],[-1.59,0.872,0.313],[-0.754,2.189,-1.368],[-1.578,1.425,-0.213],[-0.692,2.184,-1.395],[-1.6,1.044,0.182],[-0.618,2.309,-1.395],[-1.382,1.882,-0.828],[-1.277,1.938,-1.013],[-0.875,2.199,-1.393],[-1.578,1.427,-0.241],[-1.01,-0.046,1.204],[-1.527,1.363,-0.133],[-1.277,0.278,0.962],[-1.136,1.962,-1.153],[-1.512,1.383,-0.198],[-1.313,1.877,-0.821],[-0.371,2.34,-1.361],[-1.592,0.942,0.321],[-1.578,1.052,0.086],[-1.582,1.346,-0.228],[-1.032,0.104,1.227],[-1.251,1.893,-0.954],[-1.015,2.043,-1.242],[-0.267,2.308,-1.333],[-1.344,0.469,0.905],[-0.649,2.191,-1.408],[-0.891,2.123,-1.31],[-1.537,0.764,0.563],[-1.328,1.811,-0.904],[-0.908,2.221,-1.338],[-1.03,2.063,-1.292],[-1.357,0.408,0.964],[-1.102,0.142,1.112],[-1.381,1.857,-0.73],[-1.436,1.783,-0.732],[-1.533,1.068,0.129],[-1.551,1.529,-0.385],[-0.891,2.117,-1.395],[-0.671,2.174,-1.43],[-1.593,1.019,0.145],[-1.578,0.853,0.427],[-1.6,1.155,0.07],[-0.984,0.029,1.223],[-1.321,0.234,1.007],[-1.364,1.778,-0.717],[-0.256,2.368,-1.394],[-1.414,0.399,0.902],[-1.041,2.097,-1.283],[-1.558,1.502,-0.286],[-1.505,1.453,-0.394],[-1.526,1.488,-0.442],[-1.518,1.603,-0.395],[-1.5,1.445,-0.376],[-1.555,0.891,0.271],[-1.498,0.772,0.473],[-1.105,0.06,1.114]],"8":[[-1.621,0.449,0.248],[-1.558,0.707,0.046],[-1.567,0.299,0.347],[-1.277,1.415,-0.951],[-1.262,-0.361,0.911],[-1.361,1.306,-0.773],[-1.001,1.57,-1.32],[-1.022,1.671,-1.338],[-0.813,1.752,-1.475],[-0.793,1.808,-1.424],[-1.452,1.114,-0.553],[-1.444,-0.047,0.71],[-1.456,1.295,-0.639],[-1.583,0.649,0.131],[-1.254,-0.419,0.91],[-0.78,1.689,-1.432],[-1.265,1.454,-0.956],[-0.904,1.661,-1.358],[-0.6,1.812,-1.508],[-0.394,1.874,-1.505],[-1.569,0.325,0.323],[-0.26,1.894,-1.478],[-1.603,0.572,0.176],[-1.617,0.468,0.249],[-0.541,1.812,-1.509],[-1.228,-0.5,0.938],[-1.38,1.267,-0.745],[-1.143,1.572,-1.224],[-1.083,1.632,-1.207],[-1.329,1.333,-0.878],[-1.404,-0.079,0.786],[-0.977,1.581,-1.349],[-1.462,1.124,-0.457],[-0.426,1.922,-1.484],[-0.291,1.927,-1.386],[-1.263,-0.393,0.903],[-1.365,-0.178,0.823],[-0.274,1.979,-1.413],[-1.479,-0.13,0.738],[-1.118,1.499,-1.235],[-1.443,0.007,0.724],[-1.483,1.033,-0.392],[-1.409,1.241,-0.63],[-0.748,1.75,-1.415],[-1.211,1.501,-1.144],[-0.714,1.808,-1.427],[-1.359,1.462,-0.823],[-1.591,0.171,0.478],[-1.534,0.841,-0.129],[-1.163,1.592,-1.116],[-1.609,0.554,0.06],[-1.432,1.261,-0.73],[-1.32,1.343,-0.901],[-0.632,1.832,-1.504],[-1.569,0.9,-0.209],[-0.859,1.783,-1.414],[-1.331,-0.265,0.945],[-1.48,1.074,-0.527],[-1.146,1.49,-1.167],[-0.381,1.894,-1.411],[-1.551,0.881,-0.296],[-1.357,-0.3,0.914],[-1.583,0.164,0.522],[-0.807,1.726,-1.397],[-0.12,1.846,-1.368],[-1.36,-0.221,0.913],[-1.468,-0.056,0.677],[-0.404,1.819,-1.438],[-1.257,1.402,-1.058],[-1.545,0.139,0.495],[-1.481,-0.124,0.719],[-1.554,0.288,0.38],[-1.435,-0.038,0.787],[-1.484,1.215,-0.518],[-0.99,1.592,-1.368],[-1.429,1.259,-0.576],[-1.578,0.15,0.473],[-1.253,1.51,-0.979],[-0.695,1.802,-1.496],[-0.161,1.886,-1.443],[-0.311,1.962,-1.408],[-1.299,1.448,-0.89],[-0.144,1.929,-1.32],[-1.486,1.16,-0.575],[-1.514,1.118,-0.47],[-1.543,0.778,-0.135],[-1.529,0.098,0.646],[-0.272,1.924,-1.376],[-0.171,1.855,-1.359],[-0.761,1.822,-1.434],[-1.254,-0.443,1.011],[-1.289,1.481,-1.026],[-1.274,-0.34,0.901],[-1.546,0.076,0.546],[-1.364,-0.198,0.904],[-1.606,0.498,0.115],[-1.544,0.314,0.393],[-1.612,0.572,0.14],[-1.218,-0.414,0.956],[-1.52,0.945,-0.228],[-1.301,1.5,-0.997],[-0.65,1.754,-1.484],[-1.608,0.291,0.399],[-1.178,1.583,-1.097],[-1.226,-0.378,0.975],[-1.366,-0.316,0.898],[-0.494,1.853,-1.431],[-0.942,1.62,-1.403],[-1.597,0.563,0.035],[-1.039,1.649,-1.247],[-1.497,1.176,-0.512],[-1.502,0.964,-0.33],[-0.287,1.876,-1.388],[-1.533,0.957,-0.21],[-0.532,1.846,-1.514],[-1.414,1.207,-0.69],[-1.585,0.791,-0.133],[-1.531,0.893,-0.306],[-0.997,1.65,-1.366],[-0.713,1.846,-1.455],[-1.298,1.506,-0.918],[-1.56,0.485,0.279],[-1.602,0.521,0.085],[-1.399,-0.152,0.773],[-1.544,0.135,0.606],[-1.434,1.226,-0.716],[-1.553,0.971,-0.335],[-1.332,1.386,-0.955],[-1.592,0.313,0.432],[-1.502,0.122,0.572],[-1.364,-0.244,0.814],[-1.582,0.379,0.255],[-0.3,1.954,-1.455],[-0.154,1.843,-1.407],[-1.547,0.998,-0.283],[-1.508,1.031,-0.473],[-0.724,1.801,-1.492],[-1.215,-0.466,0.935],[-1.586,0.427,0.353],[-1.476,1.234,-0.535],[-1.351,1.436,-0.913],[-1.582,0.217,0.404],[-1.029,1.553,-1.313],[-1.319,1.422,-0.849],[-1.36,-0.261,0.913],[-1.526,0.108,0.536],[-1.526,0.905,-0.183],[-1.588,0.647,-0.046],[-1.143,1.48,-1.197],[-1.581,0.823,-0.169],[-1.562,0.555,0.211],[-1.42,1.374,-0.72],[-0.448,1.916,-1.439],[-1.583,0.706,-0.114],[-1.291,1.524,-0.945],[-0.125,1.877,-1.33],[-0.894,1.643,-1.372],[-0.932,1.744,-1.37],[-1.589,0.475,0.306],[-1.289,1.528,-1.011],[-1.454,1.115,-0.498],[-1.598,0.699,0.026],[-1.193,1.604,-1.122],[-1.187,-0.475,1.021],[-1.517,-0.035,0.65],[-1.586,0.308,0.314],[-0.75,1.768,-1.489],[-0.224,1.894,-1.468],[-1.575,0.338,0.301],[-1.198,-0.462,1.052],[-0.859,1.644,-1.411],[-1.587,0.785,-0.064],[-1.551,0.722,-0.016],[-1.559,0.523,0.198],[-1.562,0.937,-0.23],[-1.342,-0.186,0.86],[-0.933,1.669,-1.331],[-0.214,1.911,-1.462],[-1.614,0.306,0.351],[-1.203,1.475,-1.067],[-0.641,1.779,-1.433],[-1.394,-0.111,0.794],[-1.083,1.551,-1.216],[-1.14,1.507,-1.221],[-0.237,1.835,-1.427],[-1.285,1.379,-0.962],[-1.386,1.429,-0.823],[-1.086,1.518,-1.256],[-0.287,1.828,-1.449],[-1.278,1.41,-1.041],[-1.399,1.259,-0.664],[-1.453,1.193,-0.662],[-1.591,0.227,0.48],[-1.38,1.356,-0.712],[-1.218,-0.523,0.955],[-1.51,-0.012,0.71],[-1.419,1.314,-0.622],[-1.524,0.141,0.625],[-1.016,1.564,-1.338],[-1.462,1.239,-0.514],[-1.236,1.575,-1.053],[-1.221,1.525,-1.027],[-0.843,1.693,-1.384],[-1.493,0.124,0.599],[-0.781,1.771,-1.408],[-1.445,-0.082,0.709],[-1.268,1.437,-1.06],[-1.552,0.793,-0.038],[-1.174,1.514,-1.19],[-0.89,1.638,-1.427],[-0.31,1.838,-1.413],[-1.326,1.405,-0.833],[-1.326,-0.203,0.896],[-1.533,0.862,-0.143],[-1.503,0.056,0.698],[-1.513,0.931,-0.276],[-1.454,1.266,-0.668],[-0.901,1.693,-1.44],[-1.535,0.815,-0.123],[-1.038,1.692,-1.304],[-1.352,-0.185,0.839],[-1.587,0.749,-0.001],[-1.428,1.291,-0.741],[-1.27,1.476,-1.056],[-1.237,1.542,-1.011],[-1.289,1.452,-1.027],[-0.484,1.874,-1.514],[-1.555,0.672,0.048],[-0.707,1.729,-1.45],[-1.086,1.589,-1.199],[-1.548,0.33,0.371],[-1.338,-0.337,0.932],[-1.053,1.686,-1.271],[-1.013,1.636,-1.351],[-1.047,1.62,-1.318],[-1.261,-0.468,0.972],[-0.475,1.902,-1.44],[-0.371,1.813,-1.466],[-1.287,-0.269,0.921],[-1.366,1.402,-0.888],[-1.501,1.133,-0.529],[-1.531,0.222,0.468],[-1.49,-0.104,0.728],[-1.526,1.08,-0.36],[-1.441,1.309,-0.697],[-1.513,0.971,-0.258],[-1.314,1.423,-0.985],[-1.266,1.497,-1.061],[-1.282,-0.407,0.894],[-1.394,1.325,-0.824],[-1.568,0.253,0.382],[-1.371,1.35,-0.875],[-1.313,-0.346,0.961],[-1.511,0.197,0.556],[-1.539,0.289,0.424],[-1.568,0.832,-0.075],[-1.174,1.599,-1.177],[-1.325,1.419,-0.966],[-1.533,0.857,-0.254],[-0.601,1.889,-1.473]],"9":[[-1.011,1.207,-1.292],[-1.596,-0.204,0.301],[-1.65,0.273,-0.149],[-1.635,0.146,-0.14],[-1.647,0.069,-0.074],[-0.151,1.484,-1.439],[-1.335,1.033,-0.983],[-1.393,0.937,-0.856],[-0.255,1.555,-1.398],[-1.597,-0.367,0.356],[-1.686,0.061,-0.012],[-1.582,-0.353,0.441],[-1.087,1.099,-1.289],[-1.043,1.131,-1.281],[-0.967,1.275,-1.332],[-1.634,-0.023,0.07],[-1.434,-0.717,0.698],[-1.647,-0.08,0.082],[-0.387,1.412,-1.465],[-0.806,1.32,-1.484],[-0.318,1.426,-1.461],[-1.635,-0.245,0.303],[-1.601,0.338,-0.332],[-1.082,1.2,-1.303],[-0.685,1.406,-1.451],[-1.491,-0.474,0.537],[-0.907,1.33,-1.398],[-0.621,1.346,-1.457],[-0.244,1.458,-1.384],[-0.103,1.482,-1.412],[-1.493,0.691,-0.626],[-1.482,-0.524,0.626],[-1.061,1.241,-1.312],[-1.183,1.139,-1.207],[-0.236,1.521,-1.465],[-0.463,1.505,-1.478],[-1.602,0.493,-0.465],[-1.46,-0.622,0.684],[-1.608,0.504,-0.376],[-1.423,0.775,-0.853],[-1.418,-0.649,0.735],[-1.465,-0.526,0.578],[-1.487,-0.648,0.597],[-1.596,0.52,-0.485],[-0.194,1.471,-1.454],[-1.575,-0.444,0.437],[-1.616,-0.296,0.35],[-1.084,1.08,-1.263],[-1.542,-0.515,0.464],[-1.619,0.447,-0.411],[-0.485,1.398,-1.453],[-1.567,-0.295,0.356],[-1.599,-0.345,0.401],[-1.072,1.19,-1.239],[-0.822,1.217,-1.457],[-1.426,0.84,-0.768],[-0.105,1.56,-1.322],[-0.738,1.253,-1.462],[-0.762,1.371,-1.494],[-1.466,0.689,-0.748],[-1.435,0.834,-0.751],[-1.117,1.193,-1.209],[-1.263,0.956,-1.061],[-1.41,-0.762,0.699],[-1.476,0.738,-0.66],[-1.563,0.564,-0.572],[-1.673,0.093,0.031],[-1.4,0.835,-0.823],[-1.675,0.031,-0.046],[-0.469,1.385,-1.476],[-1.664,0.132,-0.001],[-1.406,-0.633,0.716],[-1.392,0.8,-0.899],[-1.622,-0.079,0.155],[-1.526,0.566,-0.592],[-0.815,1.354,-1.476],[-1.592,0.37,-0.341],[-0.612,1.458,-1.475],[-0.512,1.487,-1.492],[-1.619,0.268,-0.186],[-1.393,-0.649,0.709],[-0.718,1.336,-1.507],[-1.059,1.123,-1.314],[-0.801,1.216,-1.447],[-1.559,0.538,-0.442],[-1.251,1.019,-1.059],[-0.57,1.4,-1.518],[-1.291,0.939,-1.017],[-1.183,1.013,-1.158],[-1.458,-0.618,0.559],[-0.505,1.372,-1.486],[-1.287,0.974,-1.013],[-1.528,0.572,-0.552],[-1.257,1.067,-1.126],[-1.663,0.271,-0.177],[-1.231,1.072,-1.156],[-1.524,-0.549,0.573],[-1.643,-0.167,0.268],[-1.1,1.21,-1.284],[-1.608,0.519,-0.405],[-1.65,0.325,-0.285],[-0.54,1.359,-1.491],[-1.607,0.314,-0.309],[-0.487,1.472,-1.509],[-1.643,0.346,-0.225],[-1.67,0.159,-0.175],[-1.637,0.17,-0.072],[-1.457,0.798,-0.704],[-1.538,-0.517,0.539],[-1.682,0.037,-0.021],[-1.374,0.873,-0.871],[-1.618,-0.172,0.185],[-0.954,1.221,-1.403],[-1.627,0.204,-0.204],[-1.028,1.216,-1.349],[-1.585,-0.274,0.301],[-0.622,1.322,-1.486],[-1.445,-0.642,0.575],[-1.603,0.528,-0.452],[-1.653,-0.171,0.241],[-1.505,-0.541,0.611],[-1.559,0.513,-0.441],[-0.682,1.323,-1.447],[-0.324,1.544,-1.462],[-0.196,1.552,-1.364],[-0.562,1.441,-1.453],[-1.612,0.281,-0.264],[-1.58,0.508,-0.388],[-1.381,0.816,-0.886],[-1.677,-0.049,0.063],[-1.396,0.96,-0.892],[-1.544,0.564,-0.602],[-1.394,0.832,-0.912],[-1.521,-0.562,0.497],[-1.322,0.935,-1.033],[-1.593,-0.363,0.416],[-1.327,0.96,-1.033],[-1.627,-0.128,0.254],[-0.833,1.358,-1.46],[-1.138,1.201,-1.235],[-1.512,-0.572,0.592],[-1.646,-0.222,0.267],[-0.163,1.559,-1.425],[-0.991,1.251,-1.31],[-1.61,-0.31,0.298],[-1.68,-0.038,0.089],[-1.637,0.32,-0.326],[-1.048,1.151,-1.267],[-1.657,0.243,-0.247],[-0.253,1.492,-1.378],[-1.537,-0.424,0.423],[-0.104,1.503,-1.406],[-1.517,0.734,-0.677],[-0.316,1.513,-1.406],[-0.862,1.324,-1.392],[-1.663,-0.006,0.131],[-0.203,1.434,-1.398],[-1.403,0.865,-0.906],[-0.433,1.418,-1.449],[-1.637,0.12,-0.046],[-1.609,0.315,-0.246],[-0.392,1.446,-1.427],[-1.351,0.942,-0.908],[-1.425,-0.695,0.605],[-0.752,1.269,-1.485],[-1.027,1.167,-1.282],[-1.581,0.541,-0.528],[-1.485,0.654,-0.7],[-1.273,1.047,-1.107],[-1.446,0.886,-0.812],[-1.634,0.418,-0.341],[-0.132,1.444,-1.361],[-0.285,1.536,-1.469],[-0.317,1.515,-1.484],[-1.662,0.029,0.101],[-1.506,-0.444,0.533],[-1.43,-0.597,0.688],[-1.643,0.001,0.011],[-1.633,-0.164,0.157],[-1.684,0.028,0.001],[-0.271,1.443,-1.467],[-1.229,1.097,-1.159],[-0.76,1.301,-1.494],[-1.505,-0.511,0.486],[-0.537,1.444,-1.517],[-1.434,0.738,-0.806],[-0.474,1.402,-1.502],[-1.596,0.36,-0.366],[-0.872,1.217,-1.388],[-1.433,0.799,-0.848],[-1.554,0.645,-0.586],[-1.207,1.051,-1.178],[-1.451,0.857,-0.746],[-1.299,0.991,-1.072],[-1.547,0.672,-0.596],[-1.624,-0.294,0.304],[-1.174,1.094,-1.142],[-1.685,0.113,-0.058],[-0.821,1.203,-1.439],[-1.367,0.851,-0.95],[-0.844,1.211,-1.41],[-0.672,1.333,-1.507],[-0.967,1.194,-1.327],[-1.121,1.159,-1.195],[-0.719,1.294,-1.495],[-1.638,-0.018,0.131],[-1.42,0.812,-0.87],[-0.548,1.404,-1.45],[-0.581,1.439,-1.517],[-1.592,0.562,-0.437],[-1.078,1.239,-1.276],[-0.246,1.431,-1.434],[-1.66,0.057,0.077],[-0.236,1.539,-1.379],[-1.562,0.623,-0.567],[-0.316,1.553,-1.437],[-1.672,0.086,-0.108],[-1.678,-0.057,0.104],[-1.504,-0.486,0.488],[-1.375,-0.718,0.688],[-1.62,0.228,-0.198],[-0.334,1.493,-1.409],[-0.713,1.423,-1.471],[-1.664,0.18,-0.196],[-1.634,-0.106,0.231],[-1.607,0.503,-0.445],[-1.441,-0.612,0.581],[-0.999,1.252,-1.368],[-1.642,0.026,0.09],[-1.115,1.094,-1.212],[-0.855,1.284,-1.385],[-1.3,1.022,-1.073],[-1.434,0.749,-0.783],[-1.499,0.737,-0.727],[-1.552,0.5,-0.492],[-1.377,-0.697,0.702],[-0.842,1.307,-1.471],[-1.623,0.259,-0.275],[-1.337,0.9,-0.943],[-1.309,0.996,-0.977],[-1.363,0.957,-0.895],[-1.621,0.462,-0.343],[-1.545,-0.489,0.529],[-1.642,-0.037,0.046],[-0.411,1.442,-1.503],[-1.293,0.909,-1.031],[-1.082,1.133,-1.238],[-1.631,0.195,-0.104],[-0.201,1.445,-1.443],[-0.708,1.273,-1.476],[-1.622,-0.171,0.296],[-0.46,1.407,-1.451],[-1.686,0.086,-0.04],[-1.382,-0.686,0.665],[-1.646,0.315,-0.188],[-1.53,0.649,-0.653],[-0.975,1.162,-1.333],[-1.587,0.521,-0.51],[-0.875,1.189,-1.43],[-0.233,1.439,-1.448]],"10":[[-0.764,0.879,-1.419],[-1.618,-0.627,-0.109],[-0.609,0.932,-1.513],[-1.202,0.631,-1.213],[-1.607,-0.692,-0.09],[-1.002,0.777,-1.321],[-1.458,0.296,-0.909],[-1.593,-0.808,-0.037],[-1.636,-0.817,0.039],[-1.601,-0.266,-0.45],[-0.556,1.049,-1.466],[-1.638,-0.324,-0.481],[-0.776,0.764,-1.413],[-1.619,-0.143,-0.586],[-0.959,0.802,-1.347],[-0.98,0.65,-1.361],[-0.897,0.645,-1.376],[-0.992,0.805,-1.352],[-0.628,0.864,-1.445],[-1.639,-0.587,-0.25],[-1.48,0.194,-0.873],[-0.859,0.855,-1.394],[-0.556,1.057,-1.495],[-0.854,0.789,-1.456],[-1.125,0.515,-1.216],[-1.609,-0.781,0.074],[-1.434,0.159,-0.849],[-1.089,0.6,-1.243],[-1.526,-1.021,0.186],[-0.458,0.998,-1.43],[-0.806,0.77,-1.464],[-1.673,-0.363,-0.325],[-1.612,-0.349,-0.381],[-1.272,0.541,-1.093],[-1.589,-0.157,-0.518],[-1.438,0.243,-0.931],[-1.287,0.413,-1.117],[-0.881,0.883,-1.417],[-1.638,-0.419,-0.403],[-0.324,1.064,-1.479],[-1.622,-0.551,-0.178],[-1.616,-0.826,-0.044],[-1.226,0.583,-1.202],[-1.612,-0.692,-0.043],[-1.408,0.381,-0.981],[-0.722,0.924,-1.513],[-0.999,0.642,-1.349],[-0.908,0.705,-1.411],[-1.551,-0.983,0.104],[-1.282,0.366,-1.076],[-0.673,0.834,-1.483],[-0.955,0.639,-1.362],[-0.911,0.742,-1.421],[-0.73,0.827,-1.488],[-1.337,0.403,-1.01],[-0.449,1.02,-1.425],[-0.27,1.063,-1.376],[-1.518,-0.067,-0.721],[-1.182,0.488,-1.166],[-1.605,-0.332,-0.426],[-1.393,0.298,-0.996],[-0.189,1.117,-1.349],[-1.129,0.679,-1.232],[-1.618,-0.897,0.114],[-0.813,0.828,-1.479],[-1.255,0.524,-1.172],[-1.066,0.612,-1.31],[-0.842,0.751,-1.384],[-1.236,0.556,-1.191],[-0.299,1.062,-1.47],[-0.693,0.951,-1.443],[-0.755,0.96,-1.478],[-1.399,0.357,-0.935],[-1.206,0.502,-1.139],[-1.659,-0.681,-0.096],[-1.158,0.602,-1.258],[-1.122,0.598,-1.217],[-0.517,0.943,-1.489],[-1.627,-0.861,0.051],[-1.086,0.657,-1.247],[-1.582,-0.199,-0.518],[-1.227,0.608,-1.16],[-1.662,-0.581,-0.228],[-1.245,0.55,-1.112],[-0.675,0.909,-1.513],[-0.897,0.869,-1.424],[-1.645,-0.249,-0.411],[-1.621,-0.371,-0.333],[-1.138,0.635,-1.212],[-0.235,1.051,-1.376],[-0.458,1.076,-1.498],[-1.302,0.335,-1.049],[-0.869,0.655,-1.381],[-0.167,1.13,-1.345],[-1.602,-0.197,-0.589],[-0.752,0.83,-1.418],[-0.496,0.979,-1.435],[-0.542,0.934,-1.494],[-1.541,0.096,-0.767],[-1.589,-0.973,0.184],[-1.123,0.573,-1.216],[-1.285,0.515,-1.146],[-1.159,0.636,-1.199],[-1.338,0.482,-1.042],[-1.588,-0.959,0.203],[-0.481,1.043,-1.434],[-1.664,-0.614,-0.121],[-1.571,-0.886,0.155],[-1.051,0.693,-1.274],[-1.367,0.227,-0.96],[-1.257,0.488,-1.093],[-1.003,0.687,-1.305],[-1.552,-0.128,-0.603],[-0.847,0.663,-1.392],[-1.552,0.03,-0.651],[-1.203,0.466,-1.154],[-0.479,1.022,-1.508],[-0.558,0.945,-1.441],[-1.082,0.664,-1.319],[-1.373,0.25,-0.992],[-1.052,0.637,-1.327],[-0.726,0.948,-1.442],[-1.563,-0.121,-0.576],[-0.935,0.735,-1.41],[-1.214,0.528,-1.204],[-1.661,-0.441,-0.372],[-1.317,0.432,-1.098],[-0.754,0.849,-1.496],[-0.986,0.748,-1.385],[-1.349,0.314,-1.036],[-0.643,0.989,-1.451],[-1.649,-0.223,-0.507],[-0.651,1.015,-1.493],[-1.604,-0.713,-0.058],[-0.753,0.801,-1.479],[-1.418,0.262,-0.961],[-0.62,0.906,-1.438],[-0.44,1.07,-1.433],[-1.492,0.105,-0.75],[-0.607,1.022,-1.463],[-1.649,-0.519,-0.314],[-1.373,0.404,-1.037],[-0.84,0.891,-1.413],[-0.251,1.073,-1.458],[-0.991,0.67,-1.365],[-1.658,-0.245,-0.43],[-1.133,0.667,-1.282],[-1.632,-0.833,0.054],[-0.349,1.016,-1.467],[-1.636,-0.825,0.021],[-1.102,0.584,-1.284],[-1.604,-0.323,-0.447],[-1.492,0.166,-0.772],[-1.672,-0.486,-0.307],[-1.029,0.647,-1.341],[-0.583,1.025,-1.454],[-1.304,0.388,-1.04],[-0.812,0.748,-1.396],[-1.565,-0.892,0.076],[-1.663,-0.476,-0.334],[-1.538,-0.101,-0.674],[-1.681,-0.397,-0.348],[-1.544,-1.028,0.172],[-1.23,0.494,-1.181],[-1.269,0.467,-1.146],[-1.211,0.626,-1.182],[-0.349,1.109,-1.412],[-0.638,0.963,-1.521],[-1.375,0.435,-1.03],[-0.871,0.739,-1.435],[-0.614,0.883,-1.492],[-1.672,-0.588,-0.184],[-1.221,0.454,-1.134],[-0.654,0.926,-1.517],[-1.621,-0.252,-0.419],[-0.555,0.998,-1.438],[-1.267,0.388,-1.1],[-1.268,0.405,-1.124],[-1.674,-0.56,-0.216],[-1.355,0.233,-0.982],[-1.647,-0.664,-0.045],[-1.557,-0.086,-0.596],[-1.545,-0.947,0.122],[-1.551,0.034,-0.741],[-0.387,1.094,-1.487],[-1.334,0.465,-1.03],[-1.576,-0.219,-0.57],[-1.537,-0.089,-0.69],[-1.621,-0.498,-0.232],[-1.54,-0.981,0.123],[-1.651,-0.2,-0.479],[-1.364,0.337,-0.968],[-0.884,0.85,-1.388],[-0.276,1.024,-1.422],[-1.593,-0.283,-0.503],[-1.405,0.342,-0.993],[-1.186,0.649,-1.221],[-1.109,0.526,-1.232],[-1.611,-0.289,-0.411],[-1.099,0.617,-1.234],[-1.528,-0.994,0.177],[-1.167,0.532,-1.176],[-0.255,1.15,-1.391],[-1.209,0.583,-1.216],[-1.608,-0.693,-0.066],[-1.486,0.083,-0.755],[-0.23,1.038,-1.414],[-1.306,0.526,-1.081],[-1.614,-0.851,0.122],[-1.438,0.291,-0.873],[-0.288,1.044,-1.388],[-1.579,0.021,-0.639],[-1.447,0.064,-0.838],[-1.672,-0.374,-0.392],[-1.617,-0.535,-0.231],[-0.151,1.152,-1.362],[-1.335,0.337,-1.004],[-1.657,-0.649,-0.072],[-1.545,-0.049,-0.718],[-1.652,-0.318,-0.343],[-1.612,-0.744,0.033],[-1.647,-0.562,-0.129],[-1.56,0.009,-0.633],[-1.619,-0.447,-0.29],[-0.189,1.169,-1.38],[-1.506,0.066,-0.718],[-1.424,0.353,-0.922],[-0.785,0.764,-1.463],[-0.336,1.087,-1.482],[-1.437,0.089,-0.843],[-1.665,-0.404,-0.394],[-0.769,0.877,-1.501],[-1.642,-0.709,-0.003],[-1.622,-0.601,-0.125],[-1.502,0.099,-0.824],[-1.448,0.163,-0.827],[-1.529,-0.987,0.201],[-1.618,-0.326,-0.488],[-0.523,1.031,-1.443],[-1.595,-0.199,-0.49],[-0.605,0.866,-1.473],[-1.52,-0.039,-0.678],[-1.256,0.432,-1.142],[-1.549,0.108,-0.722],[-0.92,0.66,-1.387],[-0.596,1.005,-1.448],[-1.173,0.476,-1.201],[-0.868,0.693,-1.417],[-1.358,0.338,-1.038],[-1.589,-0.963,0.09],[-0.546,0.954,-1.505],[-1.461,0.051,-0.801],[-0.474,1.089,-1.477],[-1.104,0.691,-1.304],[-1.603,-0.3,-0.438],[-1.332,0.426,-1.083],[-0.491,1.051,-1.509],[-0.94,0.655,-1.378],[-0.189,1.108,-1.438],[-1.618,-0.409,-0.386]],"11":[[-1.39,-0.788,-0.781],[-1.4,-0.813,-0.761],[-0.846,0.101,-1.284],[-0.716,0.133,-1.347],[-1.291,-0.523,-0.925],[-1.063,-0.221,-1.14],[-0.584,0.269,-1.379],[-0.974,-0.011,-1.265],[-0.811,0.139,-1.362],[-0.632,0.327,-1.341],[-0.484,0.335,-1.372],[-0.976,-0.122,-1.245],[-0.392,0.511,-1.354],[-0.918,-0.027,-1.239],[-0.53,0.371,-1.409],[-0.61,0.278,-1.399],[-1.384,-0.912,-0.715],[-0.595,0.387,-1.411],[-0.978,-0.152,-1.234],[-1.378,-0.869,-0.675],[-1.438,-0.984,-0.572],[-0.957,0.036,-1.25],[-1.331,-0.646,-0.831],[-0.279,0.468,-1.301],[-0.923,0.09,-1.283],[-0.335,0.538,-1.339],[-0.304,0.51,-1.366],[-1.308,-0.775,-0.835],[-0.427,0.37,-1.346],[-1.239,-0.603,-0.964],[-0.979,-0.016,-1.222],[-1.318,-0.754,-0.808],[-0.634,0.288,-1.41],[-0.695,0.16,-1.37],[-1.415,-0.832,-0.68],[-1.391,-0.909,-0.635],[-0.75,0.212,-1.322],[-0.288,0.549,-1.354],[-0.861,0.151,-1.304],[-0.661,0.261,-1.405],[-1.178,-0.296,-1.096],[-1.28,-0.692,-0.874],[-1.263,-0.5,-0.941],[-0.255,0.536,-1.285],[-0.539,0.405,-1.346],[-1.43,-0.969,-0.561],[-0.825,0.057,-1.337],[-0.984,-0.169,-1.196],[-0.413,0.446,-1.394],[-1.104,-0.176,-1.136],[-0.654,0.192,-1.366],[-0.308,0.464,-1.352],[-1.051,-0.141,-1.161],[-1.123,-0.419,-1.076],[-0.821,0.12,-1.355],[-0.476,0.346,-1.345],[-1.39,-0.873,-0.657],[-0.466,0.349,-1.375],[-1.417,-0.875,-0.64],[-1.286,-0.527,-0.95],[-0.506,0.368,-1.33],[-0.949,0.045,-1.282],[-1.231,-0.41,-1.028],[-1.26,-0.668,-0.917],[-1.006,-0.173,-1.181],[-0.648,0.305,-1.337],[-1.113,-0.398,-1.085],[-0.838,0.03,-1.326],[-0.743,0.172,-1.383],[-0.896,0.068,-1.317],[-1.295,-0.739,-0.854],[-1.262,-0.479,-0.987],[-1.122,-0.213,-1.117],[-1.236,-0.581,-0.94],[-0.713,0.21,-1.325],[-1.152,-0.311,-1.118],[-1.361,-0.896,-0.727],[-1.07,-0.267,-1.128],[-1.268,-0.552,-0.967],[-1.058,-0.105,-1.205],[-0.351,0.431,-1.313],[-1.039,-0.114,-1.174],[-1.216,-0.568,-0.989],[-1.292,-0.643,-0.868],[-1.351,-0.771,-0.757],[-0.842,0.076,-1.338],[-0.388,0.476,-1.39],[-0.922,0.055,-1.259],[-0.898,-0.014,-1.251],[-0.478,0.466,-1.385],[-1.113,-0.302,-1.093],[-0.9,0.013,-1.305],[-1.05,-0.265,-1.181],[-1.006,-0.117,-1.236],[-1.335,-0.782,-0.838],[-0.368,0.455,-1.382],[-0.963,-0.131,-1.211],[-1.419,-0.874,-0.695],[-0.433,0.457,-1.331],[-1.045,-0.071,-1.204],[-0.727,0.143,-1.37],[-1.357,-0.763,-0.828],[-1.269,-0.671,-0.893],[-0.881,-0.032,-1.265],[-1.245,-0.528,-0.993],[-1.42,-0.849,-0.706],[-1.02,-0.18,-1.216],[-0.351,0.426,-1.351],[-0.319,0.492,-1.298],[-1.241,-0.423,-1.016],[-1.116,-0.385,-1.118],[-0.349,0.459,-1.376],[-1.368,-0.886,-0.75],[-1.375,-0.918,-0.659],[-0.818,0.026,-1.301],[-1.36,-0.842,-0.719],[-1.388,-0.835,-0.77],[-0.502,0.357,-1.397],[-0.364,0.489,-1.315],[-1.177,-0.467,-1.015],[-1.397,-0.997,-0.608],[-0.943,0.026,-1.288],[-0.446,0.473,-1.348],[-1.12,-0.411,-1.104],[-0.83,0.169,-1.308],[-0.582,0.267,-1.355],[-0.745,0.1,-1.348],[-1.212,-0.361,-1.051],[-0.739,0.284,-1.375],[-1.172,-0.423,-1.027],[-0.994,-0.07,-1.248],[-1.416,-0.957,-0.576],[-1.398,-0.986,-0.634],[-0.998,-0.186,-1.218],[-0.307,0.548,-1.32],[-0.994,-0.032,-1.252],[-1.393,-0.819,-0.689],[-1.0,-0.007,-1.236],[-0.854,0.061,-1.276],[-0.859,0.155,-1.334],[-0.651,0.36,-1.394],[-0.285,0.502,-1.356],[-0.248,0.539,-1.346],[-1.067,-0.111,-1.175],[-1.044,-0.307,-1.161],[-1.361,-0.823,-0.8],[-0.905,0.039,-1.309],[-0.268,0.55,-1.35],[-0.291,0.525,-1.362],[-1.097,-0.256,-1.113],[-0.647,0.349,-1.412],[-0.454,0.477,-1.38],[-0.859,-0.009,-1.277],[-0.783,0.106,-1.303],[-1.352,-0.814,-0.742],[-0.58,0.399,-1.36],[-0.214,0.537,-1.301],[-0.752,0.134,-1.315],[-0.832,0.192,-1.324],[-1.064,-0.166,-1.149],[-1.16,-0.479,-1.056],[-0.922,-0.097,-1.252],[-1.403,-1.001,-0.584],[-1.309,-0.673,-0.839],[-0.502,0.324,-1.362],[-0.259,0.569,-1.305],[-0.874,0.005,-1.311],[-1.198,-0.542,-1.009],[-0.941,-0.119,-1.245],[-1.022,-0.24,-1.166],[-1.262,-0.638,-0.904],[-0.368,0.421,-1.364],[-1.178,-0.47,-1.056],[-0.309,0.552,-1.341],[-0.638,0.22,-1.346],[-1.225,-0.386,-1.036],[-1.193,-0.432,-1.058],[-0.895,-0.055,-1.277],[-0.666,0.192,-1.344],[-0.481,0.361,-1.391],[-0.608,0.309,-1.411],[-0.778,0.077,-1.344],[-0.834,0.158,-1.352],[-0.425,0.377,-1.37],[-0.299,0.459,-1.302],[-1.377,-0.949,-0.668],[-0.704,0.236,-1.329],[-1.361,-0.791,-0.735],[-0.732,0.13,-1.33],[-1.29,-0.581,-0.938],[-0.567,0.311,-1.399],[-1.243,-0.555,-0.938],[-1.29,-0.716,-0.859],[-0.459,0.382,-1.329],[-1.365,-0.896,-0.692],[-1.185,-0.296,-1.071],[-1.181,-0.448,-1.063],[-0.975,-0.044,-1.264],[-0.85,-0.009,-1.3],[-1.379,-0.87,-0.76],[-1.308,-0.703,-0.835],[-0.952,-0.052,-1.271],[-1.305,-0.701,-0.892],[-1.349,-0.846,-0.74],[-1.143,-0.325,-1.07],[-1.114,-0.194,-1.162],[-0.519,0.429,-1.406],[-1.331,-0.623,-0.885],[-1.414,-0.945,-0.662],[-0.551,0.363,-1.335],[-1.03,-0.157,-1.216],[-0.766,0.213,-1.384],[-1.143,-0.449,-1.056],[-0.828,0.203,-1.343],[-0.941,-0.091,-1.224],[-0.958,-0.035,-1.222],[-0.688,0.183,-1.381],[-0.728,0.238,-1.328],[-1.346,-0.718,-0.853],[-0.551,0.419,-1.406],[-1.408,-0.933,-0.599],[-1.273,-0.655,-0.928],[-1.196,-0.404,-1.016],[-1.201,-0.329,-1.052],[-1.136,-0.335,-1.125],[-0.647,0.218,-1.382],[-0.263,0.505,-1.345],[-0.955,-0.062,-1.218],[-1.374,-0.85,-0.691],[-0.679,0.226,-1.329],[-1.364,-0.692,-0.792],[-0.537,0.332,-1.397],[-0.643,0.245,-1.396],[-0.839,0.131,-1.292],[-0.444,0.358,-1.366],[-0.534,0.405,-1.413],[-1.382,-0.746,-0.747],[-0.82,0.123,-1.294],[-1.137,-0.384,-1.06],[-0.947,-0.09,-1.261],[-1.295,-0.558,-0.936],[-0.854,0.121,-1.341],[-1.035,-0.274,-1.155],[-0.435,0.41,-1.394],[-0.701,0.299,-1.401],[-0.627,0.279,-1.332],[-0.761,0.257,-1.376],[-1.084,-0.313,-1.155],[-0.798,0.042,-1.325],[-0.797,0.064,-1.341],[-1.308,-0.565,-0.916],[-0.231,0.528,-1.33],[-0.334,0.519,-1.314],[-1.333,-0.608,-0.856],[-1.109,-0.16,-1.156],[-1.216,-0.421,-1.001],[-0.651,0.327,-1.416],[-1.281,-0.586,-0.894],[-0.956,-0.011,-1.229],[-1.422,-0.951,-0.641]],"12":[[-1.023,-1.048,-0.965],[-0.303,-0.024,-1.196],[-0.497,-0.32,-1.25],[-0.919,-0.862,-1.017],[-0.673,-0.528,-1.201],[-0.184,0.022,-1.149],[-0.415,-0.155,-1.27],[-0.58,-0.419,-1.196],[-0.427,-0.174,-1.272],[-0.984,-0.956,-1.006],[-0.956,-0.966,-0.985],[-0.741,-0.458,-1.183],[-0.551,-0.364,-1.199],[-0.85,-0.689,-1.129],[-0.307,-0.109,-1.235],[-0.978,-0.899,-1.027],[-0.708,-0.594,-1.173],[-0.791,-0.642,-1.119],[-0.601,-0.47,-1.211],[-0.58,-0.297,-1.21],[-0.578,-0.299,-1.262],[-0.434,-0.231,-1.206],[-0.969,-0.812,-1.042],[-0.892,-0.711,-1.074],[-0.175,-0.019,-1.178],[-1.017,-0.921,-0.984],[-0.373,-0.105,-1.202],[-0.457,-0.154,-1.226],[-0.774,-0.492,-1.187],[-0.154,0.003,-1.183],[-0.697,-0.567,-1.158],[-0.56,-0.325,-1.201],[-0.216,0.039,-1.175],[-0.968,-0.884,-1.035],[-0.834,-0.742,-1.109],[-0.963,-0.832,-1.016],[-0.857,-0.686,-1.088],[-0.608,-0.392,-1.194],[-0.832,-0.652,-1.105],[-0.312,-0.086,-1.252],[-0.121,0.08,-1.191],[-0.145,0.022,-1.135],[-0.056,0.09,-1.104],[-0.524,-0.361,-1.205],[-0.919,-0.777,-1.043],[-0.142,0.07,-1.139],[-0.241,0.035,-1.203],[-0.545,-0.305,-1.204],[-0.18,-0.003,-1.204],[-0.876,-0.734,-1.108],[-0.448,-0.262,-1.207],[-0.685,-0.387,-1.23],[-0.189,0.061,-1.201],[-0.68,-0.432,-1.185],[-0.549,-0.411,-1.227],[-0.899,-0.797,-1.08],[-0.784,-0.536,-1.186],[-0.348,-0.087,-1.197],[-0.277,0.003,-1.196],[-0.679,-0.464,-1.177],[-0.311,-0.014,-1.216],[-0.999,-0.941,-0.969],[-0.766,-0.639,-1.126],[-1.052,-1.016,-0.948],[-0.334,-0.135,-1.24],[-0.478,-0.326,-1.235],[-0.324,-0.121,-1.205],[-0.389,-0.125,-1.266],[-0.953,-0.807,-1.027],[-0.99,-0.987,-0.993],[-0.11,0.044,-1.175],[-0.485,-0.302,-1.253],[-0.886,-0.798,-1.046],[-0.842,-0.611,-1.125],[-0.874,-0.701,-1.119],[-0.871,-0.67,-1.129],[-0.346,-0.063,-1.202],[-0.814,-0.59,-1.166],[-0.181,0.018,-1.212],[-0.556,-0.272,-1.213],[-0.978,-0.852,-1.036],[-0.206,-0.037,-1.172],[-1.022,-1.018,-0.944],[-0.656,-0.368,-1.241],[-0.775,-0.696,-1.128],[-0.156,-0.008,-1.165],[-0.609,-0.481,-1.194],[-0.449,-0.279,-1.246],[-0.386,-0.198,-1.215],[-1.057,-1.092,-0.923],[-0.807,-0.572,-1.171],[-0.846,-0.71,-1.122],[-0.893,-0.755,-1.097],[-0.862,-0.626,-1.134],[-0.907,-0.708,-1.102],[-1.056,-1.043,-0.954],[-0.621,-0.473,-1.219],[-0.427,-0.129,-1.262],[-0.658,-0.427,-1.235],[-0.756,-0.653,-1.151],[-0.939,-0.759,-1.055],[-0.701,-0.481,-1.217],[-0.379,-0.072,-1.222],[-0.627,-0.436,-1.234],[-1.028,-1.039,-0.939],[-0.702,-0.521,-1.163],[-0.553,-0.424,-1.21],[-0.758,-0.545,-1.195],[-0.1,0.027,-1.127],[-0.538,-0.315,-1.261],[-0.701,-0.436,-1.184],[-0.177,0.075,-1.181],[-0.928,-0.833,-1.02],[-0.236,-0.003,-1.235],[-0.678,-0.464,-1.225],[-0.861,-0.741,-1.07],[-0.929,-0.79,-1.074],[-0.492,-0.227,-1.211],[-0.13,0.106,-1.17],[-0.812,-0.619,-1.12],[-0.599,-0.414,-1.192],[-0.498,-0.177,-1.247],[-0.523,-0.271,-1.207],[-0.701,-0.506,-1.211],[-0.395,-0.099,-1.262],[-1.022,-1.067,-0.958],[-0.892,-0.862,-1.047],[-0.936,-0.935,-1.005],[-0.421,-0.199,-1.203],[-0.405,-0.23,-1.23],[-0.998,-0.96,-0.962],[-0.649,-0.516,-1.202],[-0.794,-0.671,-1.111],[-0.459,-0.294,-1.215],[-0.95,-0.779,-1.046],[-0.339,-0.035,-1.224],[-0.732,-0.463,-1.212],[-0.587,-0.372,-1.196],[-0.466,-0.276,-1.257],[-0.437,-0.274,-1.224],[-0.37,-0.181,-1.218],[-0.414,-0.106,-1.255],[-0.788,-0.651,-1.154],[-0.217,0.036,-1.22],[-1.064,-1.092,-0.943],[-0.374,-0.136,-1.2],[-0.22,-0.012,-1.16],[-0.842,-0.749,-1.076],[-0.691,-0.549,-1.195],[-0.441,-0.154,-1.271],[-0.393,-0.112,-1.207],[-0.196,0.038,-1.159],[-0.546,-0.291,-1.266],[-0.53,-0.32,-1.201],[-0.998,-0.892,-0.99],[-0.129,0.013,-1.165],[-0.61,-0.461,-1.188],[-0.976,-0.914,-0.981],[-0.425,-0.127,-1.218],[-0.09,0.05,-1.162],[-0.726,-0.427,-1.211],[-0.37,-0.163,-1.207],[-0.91,-0.845,-1.025],[-0.872,-0.816,-1.054],[-0.145,0.094,-1.155],[-0.48,-0.193,-1.279],[-0.302,-0.044,-1.187],[-0.633,-0.455,-1.228],[-0.977,-1.0,-0.971],[-0.589,-0.283,-1.257],[-0.639,-0.323,-1.219],[-0.243,-0.067,-1.19],[-0.338,-0.095,-1.26],[-0.9,-0.845,-1.058],[-0.997,-0.887,-1.018],[-0.652,-0.335,-1.234],[-0.607,-0.439,-1.23],[-0.887,-0.842,-1.043],[-0.758,-0.661,-1.129],[-0.925,-0.809,-1.069],[-0.092,0.101,-1.121],[-0.973,-0.975,-0.971],[-0.92,-0.881,-1.044],[-0.721,-0.5,-1.21],[-0.851,-0.767,-1.097],[-0.311,-0.063,-1.255],[-0.49,-0.26,-1.205],[-0.747,-0.571,-1.188],[-0.611,-0.311,-1.214],[-0.293,-0.097,-1.196],[-0.235,-0.034,-1.167],[-0.756,-0.634,-1.162],[-0.208,0.018,-1.16],[-0.518,-0.212,-1.226],[-0.993,-0.999,-0.957],[-0.924,-0.756,-1.084],[-0.747,-0.57,-1.145],[-1.028,-0.973,-0.982],[-0.427,-0.214,-1.265],[-0.986,-0.872,-1.028],[-0.289,-0.078,-1.243],[-0.257,0.018,-1.193],[-0.231,0.011,-1.169],[-0.754,-0.507,-1.162],[-0.882,-0.656,-1.107],[-0.568,-0.44,-1.209],[-0.488,-0.342,-1.226],[-0.12,0.11,-1.147],[-0.336,-0.044,-1.247],[-0.652,-0.466,-1.225],[-1.009,-0.949,-0.999],[-1.032,-0.973,-0.961],[-0.83,-0.729,-1.085],[-0.49,-0.214,-1.277],[-0.436,-0.172,-1.208],[-0.205,0.007,-1.222],[-0.166,0.077,-1.162],[-0.537,-0.337,-1.255],[-0.723,-0.629,-1.147],[-0.363,-0.053,-1.229],[-0.913,-0.752,-1.054],[-0.868,-0.804,-1.078],[-1.028,-0.942,-0.981],[-0.624,-0.391,-1.246],[-0.702,-0.397,-1.22],[-0.84,-0.668,-1.138],[-0.403,-0.136,-1.205],[-0.065,0.052,-1.139],[-0.654,-0.446,-1.231],[-0.285,-0.021,-1.186],[-0.524,-0.34,-1.202],[-0.369,-0.14,-1.259],[-0.938,-0.858,-1.009],[-0.762,-0.489,-1.17],[-0.713,-0.445,-1.219],[-0.069,0.115,-1.158],[-1.079,-1.123,-0.918],[-0.834,-0.674,-1.097],[-0.094,0.053,-1.114],[-0.465,-0.306,-1.239],[-0.265,-0.079,-1.22],[-0.954,-0.802,-1.059],[-0.534,-0.226,-1.267],[-0.465,-0.193,-1.211],[-0.635,-0.404,-1.191],[-0.221,0.047,-1.197],[-0.26,-0.057,-1.177],[-0.463,-0.169,-1.273],[-0.781,-0.574,-1.138],[-0.089,0.037,-1.146],[-0.658,-0.433,-1.185],[-0.62,-0.297,-1.235],[-0.783,-0.514,-1.185],[-0.863,-0.656,-1.101],[-0.359,-0.077,-1.261],[-1.01,-0.992,-0.988],[-0.158,0.087,-1.181],[-0.58,-0.254,-1.246],[-0.373,-0.064,-1.245],[-0.552,-0.366,-1.249]]}, o={}; for(const n in R) o[n]=R[n].map(p=>V3(p[0],p[1],p[2])); return o; })();
function ribClear(a,b){   // closest approach (model units) of segment a→b to the rib surfaces, and the rib it comes nearest to
  let best=9, rib=null; const ab=b.clone().sub(a), L2=ab.lengthSq(), q=new THREE.Vector3();
  for(const n in RIBS_R) for(const p of RIBS_R[n]){ const t=Math.max(0,Math.min(1,q.copy(p).sub(a).dot(ab)/L2)); const d=q.copy(a).addScaledVector(ab,t).distanceTo(p);
    if(d<best){ best=d; rib=+n; } }
  return {d:best,rib};
}


/* v35: the falciform is found by ray-casting the parenchyma in the umbilical-fissure plane (x = falcX(z)), so the fold
   stands exactly on this liver.
   v44 (after the tissue-liver-4 reference): only the ANTERIOR course is modelled, from where the anterior surface turns
   onto the dome down to the umbilical notch; the wide superior / posterior section is gone. The fold is low and soft:
   about 0.7 mm high on a ~1.2 cm base, its flanks tucked under the capsule at ~25° (no coplanar overlap, so no z-fighting),
   fading in at the notch and out towards the dome. Colour: the liver's own red-brown, slightly paler.
   The ligamentum teres (stump at the notch, cord in the fissure) is still built and kept in the scene graph but hidden
   (visible=false, userData.teachingHidden) for later teaching use. */
function falciformBuild(body){
  const g=new THREE.Group(), rc=new THREE.Raycaster(), C0=new THREE.Vector2(-0.15,0.25), hit=(th)=>{
    const dy=Math.sin(th), dz=Math.cos(th), zo=C0.y+dz*3, yo=C0.x+dy*3;
    const o=V3(falcX(zo),yo,zo), c=V3(falcX(C0.y),C0.x,C0.y);
    rc.set(o,c.clone().sub(o).normalize()); rc.far=4; const h=rc.intersectObject(body,false)[0];
    return h&&h.face ? {p:h.point.clone(), n:h.face.normal.clone()} : null; };
  // the anterior course = the longest run of consecutive anterior-facing hits (gaps of ≤ 3 steps bridged)
  const hs=[]; for(let i=0;i<=460;i++){ const h=hit(THREE.MathUtils.degToRad(-80+i*0.5)); if(h){ h.i=i; hs.push(h); } }
  const ant=h=>falcZone(h.p.x,h.p.y,h.p.z) && h.n.y>-0.30 && h.n.z>0.22 && h.n.y<0.92;
  let run=[], best=[]; for(const h of hs){ if(!ant(h)) continue; if(run.length&&h.i-run[run.length-1].i>4) run=[]; run.push(h); if(run.length>best.length) best=run; }
  const up=best, i0=up.length?up[0].i:0, fis=hs.filter(h=>h.i<i0 && h.n.y<-0.2 && h.p.z>0.55);
  if(up.length<12) return g;
  // resample by arc length (u = 0 at the notch, 1 towards the dome), smooth the normals
  const curve=new THREE.CatmullRomCurve3(up.map(h=>h.p),false,'centripetal'), NS=90, P=[], Nn=[];
  for(let i=0;i<=NS;i++){ const u=i/NS, p=curve.getPointAt(u); let best=null,bd=9;
    for(const h of up){ const d=h.p.distanceToSquared(p); if(d<bd){ bd=d; best=h; } } P.push(p); Nn.push(best.n.clone()); }
  for(let it=0;it<8;it++) for(let i=1;i<NS;i++) Nn[i].add(Nn[i-1]).add(Nn[i+1]).normalize();
  const sm=THREE.MathUtils.smoothstep, H=0.010, W=0.085, INS=0.020, SINK=0.004, J=12;
  const pos=[], uvs=[], idx=[], ring=2*J+1;
  for(let i=0;i<=NS;i++){ const u=i/NS, t=curve.getTangentAt(u), s=new THREE.Vector3().crossVectors(t,Nn[i]).normalize(), n=new THREE.Vector3().crossVectors(s,t).normalize();
    const ends=sm(u,0.0,0.05)*(1-sm(u,0.90,1.0)), top=1-sm(Nn[i].y,0.70,0.92);          // fade in at the notch, out onto the dome
    const h=H*ends*top, w=W*(0.80+0.20*ends);
    for(let q=0;q<ring;q++){ const tl=(q-J)/J, a=1-tl*tl;
      const hh=h*a*a-INS*tl*tl*tl*tl-SINK*(1-ends*top);                                  // soft dome, flanks under the capsule
      const p=P[i].clone().addScaledVector(s,tl*w).addScaledVector(n,hh); pos.push(p.x,p.y,p.z); uvs.push(u,(tl+1)/2); } }
  for(let i=0;i<NS;i++) for(let q=0;q<ring-1;q++){ const a=i*ring+q, b=a+ring; idx.push(a,b,a+1, a+1,b,b+1); }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(idx); geo.computeVertexNormals();
  { const nA=geo.attributes.normal, nn=new THREE.Vector3();   // face outward (along the capsule normal)
    let k=0; for(let i=0;i<nA.count;i+=ring){ nn.fromBufferAttribute(nA,i+J); k+=nn.dot(Nn[Math.round(i/ring)]); }
    if(k<0){ const I=geo.index.array; for(let f=0;f<I.length;f+=3){ const tmp=I[f+1]; I[f+1]=I[f+2]; I[f+2]=tmp; } geo.index.needsUpdate=true; geo.computeVertexNormals(); } }
  const FALC_COL=0x8E4F40;   // v44: the liver's red-brown (Task 8 palette, #7A3B2E superior), a step paler; liver skin, not the warm serosa rim
  const fm=skin(mat(FALC_COL,{roughness:0.42,clearcoat:0.55,clearcoatRoughness:0.26,sheen:0.10,sheenColor:new THREE.Color(0xB88078),sheenRoughness:0.6,
    emissive:new THREE.Color(FALC_COL).multiplyScalar(0.02)}),'liver');
  const fmesh=tag(new THREE.Mesh(geo,fm),'Falciform ligament'); g.add(fmesh);
  // ligamentum teres: cut stump from the free edge at the notch, then back along the umbilical fissure (hidden, see above)
  const n0=Nn[0].clone(), p0=P[0].clone(), outD=V3(0,-0.55,0.84).addScaledVector(n0,0.6).normalize();
  const stump=[p0.clone().addScaledVector(n0,-0.03)];
  for(let k=1;k<=4;k++) stump.push(p0.clone().addScaledVector(outD,0.042*k).add(V3(0,-0.010*k*k/4,0)));   // v42: ~1.2 cm stub
  const tm=skin(mat(0xB88A74,{roughness:0.40,clearcoat:0.7,clearcoatRoughness:0.2,emissive:new THREE.Color(0xB88A74).multiplyScalar(0.05)}),'serosa');
  const teres=[]; const tt=varTube(stump,t=>0.021*(1-0.15*t),30,14,true); teres.push(tag(new THREE.Mesh(tt,tm),'Ligamentum teres'));
  if(fis.length>4){ fis.sort((a,b)=>b.p.z-a.p.z); const fp=[p0.clone().addScaledVector(n0,-0.02)];
    for(const h of fis){ if(h.p.distanceTo(fp[fp.length-1])>0.06) fp.push(h.p.clone().addScaledVector(h.n,-0.012)); if(fp.length>7) break; }
    if(fp.length>2) teres.push(tag(new THREE.Mesh(varTube(fp,t=>0.022*(1-0.3*t),40,12,true),tm),'Ligamentum teres')); }
  for(const m of teres){ m.visible=false; m.userData.teachingHidden=true; g.add(m); }
  g.userData.P0=P; g.userData.teres=teres; return g;
}
/* v42: baked liver maps (Blender, see v42 pipeline doc). WebP: the artifact host does not serve .ktx2 (tested 27 Sept).
   v44: the maps come from pipeline/bake44.py (one scripted headless run: tangent normal, self-AO, cavity, curvature,
   thickness and position bakes → albedo, normal and ORM = R occlusion, G roughness, B clearcoat / wetness), 4K on desktop
   and 2K on phones, chosen at load (phones had no liver maps before). The tiling detail map replaces the generic skin atlas
   on the liver at close range (desktop), with the macro maps carrying colour, capsular veins, creases, wetness and AO.
   v44 (Task 9): the detail map is liver44_micro.webp, a fine capsular grain with sparse soft pits and no lobular cells (the
   v42 Worley lobules read as a blurred pattern at mid distance); the skin shader fades it out by screen footprint, so it
   only appears at close range. */
/* v44: uLvMean (skin uniforms) is the mean of the composed liver albedo (bake44.py prints it), so pathology colours keep
   their luminance when they take only the map's light/dark pattern */
const LIVER_PHONE=innerWidth<=860||(innerHeight<=520&&matchMedia('(pointer:coarse)').matches);
const LIVER_DETAIL_TEX=(()=>{ if(LIVER_PHONE) return null;
  const t=new THREE.TextureLoader().load('liver44_micro.webp'); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=renderer.capabilities.getMaxAnisotropy(); t.colorSpace=THREE.NoColorSpace; return t; })();
function liverTex42(...mats){
  const ld=new THREE.TextureLoader(), an=renderer.capabilities.getMaxAnisotropy(), tag=LIVER_PHONE?'2k':'4k';
  const L=(f,cs)=>new Promise((ok,no)=>ld.load(f,t=>{ t.colorSpace=cs; t.anisotropy=an; ok(t); },undefined,()=>no(new Error(f))));
  Promise.all([L(`liver44_albedo_${tag}.webp`,THREE.SRGBColorSpace),L(`liver44_normal_${tag}.webp`,THREE.NoColorSpace),L(`liver44_orm_${tag}.webp`,THREE.NoColorSpace)])
    .then(([A,Nm,O])=>{ for(const m of mats){ const U=m.userData.skin; if(!U) continue;
        U.tLvA.value=A; U.tLvO.value=O; if(LIVER_DETAIL_TEX) U.tSkin.value=LIVER_DETAIL_TEX; U.uSkS.value.set(3.9,9,1); U.uSkK.value.set(0.00009,0.00010,0.03,0);
        U.uSkK2.value.set(0,0.10,0.35); U.uLvNod.value=1; if(m.clearcoat>0.5){ m.userData.cc42=true; }
        m.normalMap=Nm; m.normalScale=new THREE.Vector2(1,1); m.userData.nScale=1; m.defines=Object.assign(m.defines||{},{SKIN_TEX42:''}); m.needsUpdate=true; }
      LIVER_TEX.ready=true; const u=tiers[0].inner&&tiers[0].inner.userData; if(u&&u.plainMat){ u.forceCirr=true; applyCirrhosis(u,state.fibrosis); } })
    .catch(e=>console.warn('liver maps unavailable:',e.message));
}
const LIVER_TEX={ready:false};
function buildMacro(){
  const g=new THREE.Group();
  const MG=modelGeometry();
  const geo=MG.parenchyma;
  const L={parenchyma:new THREE.Group(),portal:new THREE.Group(),artery:new THREE.Group(),
           hepaticVein:new THREE.Group(),biliary:new THREE.Group(),ligaments:new THREE.Group(),
           viscera:new THREE.Group()};
  for(const k in L){ L[k].name=k; g.add(L[k]); }

  /* ── parenchyma ── */
  const plainMat=mat(0xffffff,{vertexColors:true,
    roughness:0.34, clearcoat:0.9, clearcoatRoughness:0.13, sheen:0.22,
    sheenColor:new THREE.Color(0xF2D6C8), sheenRoughness:0.35,
    transmission:0, thickness:1.4, ior:1.4});
  const segMat=mat(0xffffff,{vertexColors:true, roughness:0.64, clearcoat:0.18,
    clearcoatRoughness:0.6, sheen:0.12});
  geo.setAttribute('skinP',new THREE.BufferAttribute(MG.P0,3)); skin(plainMat,'liver',true); skin(segMat,'liver',true);
  const body=tag(new THREE.Mesh(geo,plainMat),'Parenchyma');
  body.userData.segmentPick=true; L.parenchyma.add(body);
  if(CT_MODE){ MG.falcG=falciformBuild(body); L.parenchyma.add(MG.falcG); }
  if(CT_MODE&&LDL.uv) liverTex42(plainMat,segMat);

  const cap=tag(new THREE.Mesh(geo,mat(C.capsule,{
    roughness:0.08, clearcoat:1, opacity:0.10, side:THREE.FrontSide,
    depthWrite:false, blending:THREE.AdditiveBlending})),'Glisson’s capsule');
  cap.scale.setScalar(1.010); cap.userData.noPick=true; cap.visible=false; L.parenchyma.add(cap);   // v38: folded into plainMat

  const svGeo=CT_MODE?null:surfaceVessels();   // CT: no painted subcapsular veins
  const surfVeins = svGeo ? tag(new THREE.Mesh(svGeo,
    mat(0x3A4568,{roughness:0.35,clearcoat:0.8,opacity:0.85})),'Subcapsular veins') : null;
  if(surfVeins) L.parenchyma.add(surfVeins);

  /* ── ligaments: the model carries its own falciform ridge (picked by position on the
        parenchyma) and a hanging ligamentum teres, split out of the mesh ── */
  if(!CT_MODE) L.ligaments.add(tag(new THREE.Mesh(MG.teres,
    mat(0xD9C7A2,{roughness:0.7,clearcoat:0.2})),'Ligamentum teres'));

  /* ── biliary: placed against this model's visceral surface ── */
  const gbPts=[PT(-0.39,-0.72,0.94), PT(-0.37,-0.68,0.70),
               PT(-0.35,-0.62,0.48), PT(-0.32,-0.52,0.32),
               PT(-0.30,-0.42,0.20)];
  { let S=new THREE.CatmullRomCurve3(gbPts.slice(),false,'centripetal').getSpacedPoints(40);
    for(let it=0;it<60;it++){ const T=S.map(p=>p.clone()); for(let i=1;i<S.length-1;i++) T[i].copy(S[i-1]).add(S[i+1]).multiplyScalar(0.5).lerp(S[i],0.5); S=T; }
    const Cs=new THREE.CatmullRomCurve3(S); gbPts.length=0; for(let i=0;i<=8;i++) gbPts.push(Cs.getPointAt(i/8)); }
  const gbMesh=metaMesh(metaTube(gbPts,t=>{ const R=0.165, dome=0.21;
      if(t<dome){ const u=1-t/dome; return R*Math.sqrt(Math.max(0,1-u*u))+0.003; }
      const s=(t-dome)/(1-dome), body=R*(1-0.62*Math.pow(s,1.6))+0.012*s; return THREE.MathUtils.lerp(body,0.040,THREE.MathUtils.smoothstep(s,0.70,1)); },84,28,false,0),
    skin(mat(0x8FA457,{roughness:0.30,clearcoat:0.9,clearcoatRoughness:0.18,
      emissive:new THREE.Color(0x8FA457).multiplyScalar(0.07)}),'gb'),'Gallbladder');
  flipWinding(gbMesh.geometry); L.biliary.add(gbMesh);
  const bilMeshes=[{m:gbMesh,kind:'gb'}];
  const conf=V3(-0.34,-0.22,0.33), cysJ=V3(-0.27,-0.37,0.37), BD_HI=V3(-0.335,-0.145,0.31);
  const BD_CHD=[V3(-0.315,-0.30,0.36)], BD_CBD=[V3(-0.13,-0.49,0.38),V3(-0.08,-0.66,0.40),V3(-0.11,-0.82,0.44),V3(-0.17,-0.93,0.40),V3(-0.23,-1.00,0.33)];
  const amp0=PT(-0.16,-1.58,-0.10);
  const duct=(pts,r0,r1,name,seg,kind,cap=true)=>{ const m=metaMesh(
    metaTube(pts,t=>THREE.MathUtils.lerp(r0,r1,t),Math.max(48,seg||36),16,cap,0),
    mat(C.bile,{roughness:0.32,clearcoat:0.7,
      emissive:new THREE.Color(C.bile).multiplyScalar(0.16)}),name);
    flipWinding(m.geometry); L.biliary.add(m); bilMeshes.push({m,kind}); return m; };
  const gN=gbPts[gbPts.length-1], gT=gN.clone().sub(gbPts[gbPts.length-2]).normalize();
  const cysPts=[gN.clone().addScaledVector(gT,-0.025), gN.clone().addScaledVector(gT,0.05), V3(-0.47,-0.335,0.335),
                V3(-0.40,-0.345,0.36), V3(-0.33,-0.36,0.37), cysJ.clone()];
  { const sm=THREE.MathUtils.smoothstep;
    const m=metaMesh(metaTube(cysPts,t=>0.030+0.0095*(1-sm(t,0.06,0.26))+0.012*sm(t,0.84,1),80,24,false,0),
      mat(C.bile,{roughness:0.32,clearcoat:0.7,emissive:new THREE.Color(C.bile).multiplyScalar(0.16)}),'Cystic duct');
    flipWinding(m.geometry); L.biliary.add(m); bilMeshes.push({m,kind:'cystic'}); }
  const MPD=[...PANC_MPD,V3(-0.050,-0.920,0.450),V3(-0.150,-1.040,0.350),amp0];
  duct(MPD,0.010,0.021,'Pancreatic duct',140,'pd');
  const amp=tag(new THREE.Mesh(new THREE.TorusGeometry(0.055,0.022,10,20),
    mat(0xD8C05C,{roughness:0.4,clearcoat:0.6,
      emissive:new THREE.Color(0xD8C05C).multiplyScalar(0.22)})),'Ampulla of Vater');
  amp.position.copy(amp0); amp.rotation.y=0.5; L.biliary.add(amp);
  if(!CT_MODE) L.biliary.add(tag(new THREE.Mesh(varTube([
      new THREE.Vector3(-0.10,-1.22,0.14),new THREE.Vector3(-0.20,-1.50,0.04),
      new THREE.Vector3(-0.08,-1.78,-0.06),new THREE.Vector3(0.28,-1.88,-0.12),
      new THREE.Vector3(0.62,-1.78,-0.16)],()=>0.125,44,16),
    mat(C.duo,{roughness:0.6,opacity:0.20,side:THREE.DoubleSide})),'Duodenum'));

  /* ── neighbouring viscera: oesophagus, stomach, spleen and left kidney (where the collaterals go) ── */
  const OES=[PT(0.30,1.32,-0.88),PT(0.33,0.62,-0.86),PT(0.38,0.02,-0.82),PT(0.46,-0.36,-0.72),PT(0.60,-0.56,-0.54)];
  const GOJ=PT(0.60,-0.56,-0.54);
  const gutMat=c=>mat(c,{roughness:0.55,clearcoat:0.3,opacity:0.22,side:THREE.DoubleSide,depthWrite:false});
  let spleen, SPLEEN_C;
  if(!CT_MODE){
  L.viscera.add(tag(new THREE.Mesh(varTube(OES,()=>0.085,48,18),mat(0xC98E7E,{roughness:0.55,clearcoat:0.3,opacity:0.38,side:THREE.DoubleSide,depthWrite:false})),'Oesophagus'));
  const STOM=[V3(1.12,-0.34,-0.60),V3(1.17,-0.78,-0.40),V3(0.97,-1.13,-0.13),V3(0.56,-1.31,0.07),V3(0.18,-1.26,0.13),V3(-0.07,-1.22,0.14)];
  const stomR=t=>THREE.MathUtils.lerp(0.30,0.075,Math.pow(t,1.25))+0.03*Math.sin(Math.PI*t);
  L.viscera.add(tag(new THREE.Mesh(varTube(STOM,stomR,64,24),gutMat(0xC98E7E)),'Stomach'));
  const fundus=new THREE.Mesh(new THREE.SphereGeometry(0.31,28,20),gutMat(0xC98E7E));
  fundus.position.set(1.05,-0.30,-0.62); fundus.scale.set(1,1.02,0.9); tag(fundus,'Stomach'); L.viscera.add(fundus);
  L.viscera.add(tag(new THREE.Mesh(varTube([GOJ,V3(0.76,-0.54,-0.58),V3(0.92,-0.46,-0.62)],t=>0.085+0.12*t*t,20,18),gutMat(0xC98E7E)),'Stomach'));
  // spleen: bean-shaped, long axis along the 10th rib, hilum facing the splenic vein
  const splG=new THREE.SphereGeometry(1,40,28), sp=splG.attributes.position, sv=new THREE.Vector3();
  for(let i=0;i<sp.count;i++){ sv.fromBufferAttribute(sp,i);
    const hil=Math.max(0,-sv.x)*Math.exp(-sv.y*sv.y*2.2);           // concave hilum, medial
    sv.x-=0.32*hil; sv.x*=0.27; sv.y*=0.70; sv.z*=0.40;
    sv.y+=0.03*Math.sin(sv.z*18)*Math.max(0,sv.x);                    // notched superior border
    sp.setXYZ(i,sv.x,sv.y,sv.z); }
  splG.computeVertexNormals();
  spleen=tag(new THREE.Mesh(splG,mat(0x3F1824,{roughness:0.6,clearcoat:0.25,clearcoatRoughness:0.45,
    emissive:new THREE.Color(0x3F1824).multiplyScalar(0.12)})),'Spleen');
  SPLEEN_C=PT(2.02,-0.74,-1.02);
  spleen.position.copy(SPLEEN_C); spleen.rotation.set(-0.50,0.50,-0.25); L.viscera.add(spleen);
  const kid=new THREE.SphereGeometry(1,32,24), kp=kid.attributes.position;
  for(let i=0;i<kp.count;i++){ sv.fromBufferAttribute(kp,i);
    const hil=Math.max(0,-sv.x)*Math.exp(-sv.y*sv.y*3.0); sv.x-=0.35*hil;
    kp.setXYZ(i,sv.x*0.30,sv.y*0.62,sv.z*0.26); }
  kid.computeVertexNormals();
  const kidney=tag(new THREE.Mesh(kid,mat(0x7C3E33,{roughness:0.45,clearcoat:0.4,opacity:0.38,depthWrite:false})),'Left kidney');
  kidney.position.set(1.22,-2.10,-1.30); kidney.rotation.z=0.18; L.viscera.add(kidney);
  } else ({spleen,SPLEEN_C}=ctViscera(L,gutMat));

  /* ═══ portal venous system ═══
     SMV + splenic vein join behind the pancreatic neck; the trunk ascends in the hepatoduodenal
     ligament (posterior to duct and artery) to the porta and divides. Right PV → anterior (V, VIII)
     and posterior (VI, VII) sectoral branches; left PV: transverse part, then the umbilical portion
     in the umbilical fissure giving II, III and IV; caudate branches from both. */
  const SMV0=PT(0.16,-2.15,-0.22), CONF=PT(0.22,-1.48,-0.42);
  const PT_MID=PT(0.02,-0.95,-0.26), PT_UP=PT(-0.18,-0.45,-0.08);
  const PVe=new Vessels();
  PVe.path([SMV0,PT(0.18,-1.80,-0.30),CONF],0.068,0.076,'Superior mesenteric vein');
  const SPL0=PT(1.62,-1.18,-0.72);
  PVe.path(SPLV_PTS(SPL0,CONF),0.054,0.064,'Splenic vein');
  const nearOn=(pts,q)=>{ const c=new THREE.CatmullRomCurve3(pts); let bd=1e9,bp=null;
    for(let i=0;i<=400;i++){ const p=c.getPoint(i/400), dd=p.distanceToSquared(q); if(dd<bd){ bd=dd; bp=p; } } return bp; };
  const SPLp=SPLV_PTS(SPL0,CONF);
  const IMV0=nearOn(SPLp,PT(0.72,-1.39,-0.60)), LGV0=nearOn(SPLp,PT(0.15,-1.30,-0.37));
  PVe.path([PT(0.70,-2.10,-0.62),PT(0.72,-1.75,-0.62),PT(0.72,-1.39,-0.60).lerp(IMV0,0.5),IMV0],0.024,0.030,'Inferior mesenteric vein');
  PVe.path([PT(0.56,-0.62,-0.42),PT(0.40,-0.98,-0.42),PT(0.15,-1.30,-0.37).lerp(LGV0,0.5),LGV0],0.017,0.023,'Left gastric vein');
  PVe.path([CONF,PT(0.08,-1.12,-0.32),PT_MID,PT_UP,HILUM_OUT,HILUM_IN],0.084,0.078,'Portal trunk');

  const PVi=new Vessels();
  const RPV_D=PT(-0.66,0.04,-0.05), RA=PT(-0.82,0.02,0.24), RP=PT(-0.92,0.02,-0.34);
  const LT=PT(0.12,0.10,-0.08), UMB_MID=PT(0.18,0.10,0.18), UMB=PT(0.21,0.06,0.46);
  PVi.path([HILUM_IN,PT(-0.48,0.06,-0.04),RPV_D],0.078,0.068,'Right portal vein');
  PVi.path([RPV_D,PT(-0.74,0.03,0.10),RA],0.062,0.054,'Right anterior portal branch');
  PVi.path([RPV_D,PT(-0.80,0.03,-0.20),RP],0.062,0.054,'Right posterior portal branch');
  PVi.path([HILUM_IN,PT(-0.06,0.09,-0.10),LT],0.072,0.064,'Left portal vein');
  PVi.path([LT,UMB_MID,UMB],0.060,0.046,'Umbilical portion');
  const segBr=(from,k,r0)=>{
    const to=segTarget(k), mid=from.clone().lerp(to,0.5);
    return PVi.path([from,mid,to],r0,r0*0.74,'Portal branch, segment '+SEG[k]);
  };
  const pbr=[segBr(RA,5,0.048),segBr(RA,8,0.050),segBr(RP,6,0.048),segBr(RP,7,0.050),
             segBr(LT,1,0.044),segBr(UMB,2,0.040),segBr(UMB_MID,3,0.040),segBr(UMB_MID,4,0.038),
             segBr(HILUM_IN,0,0.030)];
  pbr.forEach(sg=>PVi.sprout(sg,34,0.24,4,0.55));
  const PV=new Vessels(); PV.segs=PVe.segs.concat(PVi.segs);
  const portalMesh=PV.mesh(C.portal,undefined,true); portalMesh.userData.nExt=PVe.segs.length;
  portalMesh.userData.mo={P0:portalMesh.geometry.attributes.position.array.slice(),ctr:portalMesh.geometry.attributes.ctr.array,
    bt:portalMesh.geometry.attributes.bt.array,last:''};
  L.portal.add(portalMesh); const portalMeshes=[portalMesh];

  /* ═══ hepatic arterial system ═══
     Coeliac trunk at T12 → left gastric, splenic and common hepatic arteries; CHA → GDA (down) and
     proper hepatic artery (up, anteromedial in the hepatoduodenal ligament) → right and left
     hepatic arteries running with the portal pedicles; cystic artery from the right. */
  const HA=new Vessels();
  HA.path([PT(-0.07,0.97,0.03),PT(-0.04,0.70,-0.62),PT(0.02,0.10,-1.08),PT(0.05,-1.00,-1.12),PT(0.06,-2.15,-1.02)],
          0.110,0.100,'Aorta');
  const CTD=PT(0.07,-1.08,-0.86), CHAD=PT(-0.12,-1.12,-0.56);
  HA.path([PT(0.05,-1.02,-1.10),PT(0.06,-1.06,-0.98),CTD],0.050,0.046,'Coeliac trunk');
  HA.path([CTD,PT(0.30,-0.92,-0.74),PT(0.50,-0.66,-0.52)],0.020,0.015,'Left gastric artery');
  HA.path([CTD,PT(0.35,-1.12,-0.90),V3(0.957,-0.252,-0.075),V3(0.988,-0.287,-0.151),V3(1.039,-0.293,-0.195),V3(1.082,-0.291,-0.213),V3(1.127,-0.284,-0.251),V3(1.207,-0.239,-0.294),V3(1.279,-0.176,-0.351),V3(1.373,-0.127,-0.451),V3(1.509,-0.008,-0.456),V3(1.644,0.081,-0.460)],
          0.034,0.029,'Splenic artery');
  HA.path([CTD,PT(-0.04,-1.10,-0.74),CHAD],0.036,0.034,'Common hepatic artery');
  HA.path([CHAD,PT(-0.16,-1.40,-0.40),PT(-0.12,-1.78,-0.24)],0.022,0.017,'Gastroduodenal artery');
  const offA=V3(0.35,0.35,0.87).normalize(), offB=V3(-0.40,0.25,0.88).normalize();
  const HA_ROOT=HILUM_IN.clone().addScaledVector(offA,0.078*1.34+0.008);
  HA.path([CHAD,PT(-0.02,-0.80,0.02),PT(-0.06,-0.45,0.14),PT(-0.18,-0.15,0.15),HA_ROOT],0.032,0.027,'Proper hepatic artery');
  HA.path([PT(-0.40,0.10,0.07),PT(-0.38,-0.12,0.18),PT(-0.31,-0.38,0.23)],0.013,0.011,'Cystic artery');
  HA.path([PT(0.05,-1.26,-1.12),PT(0.22,-1.42,-0.84),PT(0.33,-1.78,-0.56),PT(0.36,-2.15,-0.44)],0.044,0.040,'Superior mesenteric artery');
  const HAi=PVi.companion(offA,0.34,0.018,n=>n==='Right portal vein'?'Right hepatic artery':
    (n==='Left portal vein'||n==='Umbilical portion')?'Left hepatic artery':'Segmental hepatic artery');
  { const HAall=new Vessels(); HAall.segs=HA.segs.concat(HAi.segs); L.artery.add(HAall.mesh(C.artery)); }
  const aortaStub=new THREE.Mesh(MG.aortaStub,mat(C.artery,{roughness:0.3,clearcoat:0.6,
    emissive:new THREE.Color(C.artery).multiplyScalar(0.14)}));
  tag(aortaStub,'Aorta'); L.artery.add(aortaStub);
  { const s=HA.segs.find(q=>q.name==='Aorta'), e=s.pts[s.pts.length-1]; const cap=new THREE.Mesh(new THREE.SphereGeometry(s.r1*0.99,24,16),mat(C.artery,{roughness:0.3,clearcoat:0.6,emissive:new THREE.Color(C.artery).multiplyScalar(0.14)})); cap.position.copy(e); tag(cap,'Aorta'); L.artery.add(cap); }   // v41: no flat cut

  /* ═══ hepatic venous system ═══
     Right, middle and left hepatic veins run in the intersegmental planes (right sectoral plane,
     Cantlie's plane, left intersectoral plane) and enter the suprahepatic IVC; middle and left
     usually share a trunk. Short caudate veins drain straight into the retrohepatic IVC. */
  const HV=new Vessels();
  HV.path([PT(-0.33,0.97,0.00),PT(-0.33,0.55,-0.40),PT(-0.31,-0.10,-0.60),PT(-0.29,-0.70,-0.60),PT(-0.27,-1.40,-0.52)],
          0.090,0.088,'IVC');
  const OST=PT(-0.33,0.80,-0.16), CT=PT(-0.20,0.80,-0.10);
  const rhv=HV.path([OST,PT(-0.60,0.66,-0.20),PT(-0.95,0.40,-0.14),PT(-1.15,0.02,-0.04),PT(-1.28,-0.45,0.04)],0.066,0.028,'Right hepatic vein');
  HV.path([OST,CT],0.070,0.066,'Middle and left hepatic vein trunk');
  const mhv=HV.path([CT,PT(-0.16,0.52,0.08),PT(-0.20,0.15,0.30),PT(-0.28,-0.14,0.58)],0.058,0.026,'Middle hepatic vein');
  const lhv=HV.path([CT,PT(0.18,0.62,-0.06),PT(0.62,0.34,0.02),PT(1.08,0.20,0.08)],0.054,0.022,'Left hepatic vein');
  HV.path([PT(-0.27,-1.40,-0.52),PT(-0.25,-1.80,-0.50),PT(-0.24,-2.20,-0.48)],0.088,0.090,'IVC');
  const LRV_PTS=[V3(1.07,-0.67,-0.62),V3(0.86,-0.70,-0.24),V3(0.69,-0.715,0.10),V3(0.52,-0.72,0.213),V3(0.26,-0.72,0.18),V3(0.04,-0.72,0.12)];
  HV.path(LRV_PTS,0.034,0.042,'Left renal vein');
  HV.path([PT(-0.02,0.32,-0.62),PT(-0.16,0.28,-0.60),PT(-0.30,0.24,-0.56)],0.018,0.024,'Caudate veins');
  HV.path([PT(-0.06,0.08,-0.66),PT(-0.18,0.06,-0.63),PT(-0.30,0.04,-0.60)],0.016,0.022,'Caudate veins');
  HV.tributaries(rhv,[0.22,0.45,0.68,0.88],0.24,3,0.55);
  HV.tributaries(mhv,[0.28,0.55,0.82],0.22,3,0.55);
  HV.tributaries(lhv,[0.30,0.58,0.84],0.20,3,0.55);
  { const hm=HV.mesh(C.vein,undefined,true);   // meta: the right hepatic vein dilates around a TIPSS
    hm.userData.mo={P0:hm.geometry.attributes.position.array.slice(),ctr:hm.geometry.attributes.ctr.array,bt:hm.geometry.attributes.bt.array,last:''};
    L.hepaticVein.add(hm); }
  const stubs=new THREE.Mesh(MG.stubs,mat(C.vein,{roughness:0.3,clearcoat:0.6,
    emissive:new THREE.Color(C.vein).multiplyScalar(0.14)}));
  tag(stubs,'IVC'); L.hepaticVein.add(stubs);
  { const s=HV.segs.filter(q=>q.name==='IVC').pop(), e=s.pts[s.pts.length-1]; const cap=new THREE.Mesh(new THREE.SphereGeometry(s.r1*0.99,24,16),mat(C.vein,{roughness:0.3,clearcoat:0.6,emissive:new THREE.Color(C.vein).multiplyScalar(0.14)})); cap.position.copy(e); tag(cap,'IVC'); L.hepaticVein.add(cap); }

  /* ═══ intrahepatic bile ducts: companions of the portal pedicles, draining to the hilar confluence ═══ */
  const BDi=PVi.companion(offB,0.30,0.018,n=>n==='Right portal vein'?'Right hepatic duct':
    (n==='Left portal vein'||n==='Umbilical portion')?'Left hepatic duct':'Segmental bile duct');
  const BD_ROOT=HILUM_IN.clone().addScaledVector(offB,0.078*1.30+0.008);
  BDi.path([amp0,...BD_CBD.slice().reverse(),cysJ],0.034,0.044,'Common bile duct');
  BDi.path([cysJ,...BD_CHD.slice().reverse(),conf,BD_HI,BD_ROOT],0.044,0.030,'Common hepatic duct');
  const bdiMesh=BDi.mesh(C.bile,undefined,true); bdiMesh.userData.mo={P0:bdiMesh.geometry.attributes.position.array.slice(),
    ctr:bdiMesh.geometry.attributes.ctr.array,bt:bdiMesh.geometry.attributes.bt.array,last:''};
  L.biliary.add(bdiMesh); bilMeshes.push({m:bdiMesh,kind:'tree',segs:BDi.segs});
  // duct centrelines for the extrahepatic cholangiocarcinoma simulation (root → periphery / downstream)
  const firstSeg=n=>{ const sg=BDi.segs.find(q=>q.name===n); return sg?{pts:sg.pts,r:(sg.r0+sg.r1)/2}:null; };
  const ducts={
    root:BD_ROOT.clone(),
    chd:{pts:[BD_ROOT.clone(),BD_HI.clone(),conf.clone(),...BD_CHD.map(q=>q.clone()),cysJ.clone()],r:0.040},
    cbd:{pts:[cysJ.clone(),...BD_CBD.map(q=>q.clone()),amp0.clone()],r:0.044},
    rhd:firstSeg('Right hepatic duct'), lhd:firstSeg('Left hepatic duct')};

  /* ── pathology engine: collaterals, thrombus, TIPSS, Budd–Chiari, biliary obstruction, flow ── */
  const K={LGV0,MPD,SMV0,CONF,PT_MID,PT_UP,SPL0,RPV_D,RA,RP,LT,UMB_MID,UMB,OST,CT,rhv:rhv.pts,mhv:mhv.pts,lhv:lhv.pts,
    OES,GOJ,SPLEEN_C,spleen,LRV_PTS,ducts,gbPts,cysPts,conf,cysJ,amp0,BD_ROOT,bilMeshes,HVsegs:HV.segs,HAsegs:HA.segs.concat(HAi.segs),HA_ROOT,
    tails:[[PT(-0.48,0.06,-0.04),RPV_D,RA,segTarget(5)],[PT(-0.48,0.06,-0.04),RPV_D,RA,segTarget(8)],
           [PT(-0.48,0.06,-0.04),RPV_D,RP,segTarget(6)],[PT(-0.48,0.06,-0.04),RPV_D,RP,segTarget(7)],
           [PT(-0.06,0.09,-0.10),LT,segTarget(1)],[PT(-0.06,0.09,-0.10),LT,UMB_MID,UMB,segTarget(2)],
           [PT(-0.06,0.09,-0.10),LT,UMB_MID,segTarget(3)],[PT(-0.06,0.09,-0.10),LT,UMB_MID,segTarget(4)]]};
  const P=buildPatho(g,L,K);

  /* segment markers, shown with the Segments layer */
  const segMarks=new THREE.Group(); segMarks.visible=false;
  SEG.forEach((sname,i)=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.05,14,10),
      mat(SEG_COL[i],{roughness:0.35,opacity:0.9,
        emissive:new THREE.Color(SEG_COL[i]).multiplyScalar(0.4)}));
    m.position.copy(SEG_CENTROID[i]); m.userData.pick='Segment '+sname; segMarks.add(m);
  });
  g.add(segMarks);

  registerFade(g);
  const fibCol=new Float32Array(MG.segCol.length);
  { const c=new THREE.Color(C.tissue); for(let v=0;v<fibCol.length;v+=3){fibCol[v]=c.r;fibCol[v+1]=c.g;fibCol[v+2]=c.b;} }
  geo.attributes.color.array.set(fibCol); geo.attributes.color.needsUpdate=true;
  g.userData={ducts,portalMeshes,flowScale:1,MG,fibCol,L,body,plainMat,segMat,cap,surfVeins,segMarks,P,K,
              hvMesh:L.hepaticVein.children[0],
              trees:{portal:portalMesh.userData.segs,artery:HAi.segs.length+HA.segs.length,
                     hepaticVein:HV.segs.length,biliary:BDi.segs.length}};
  return g;
}

/* ════════════ TIER 1 — lobule ════════════ */
function buildLobule(){
  const g=new THREE.Group(); const lay=layerer(g);
  const R=0.82,H=2.3;
  const hexGeo=new THREE.CylinderGeometry(R*0.955,R*0.955,H,6,1); hexGeo.rotateX(Math.PI/2);
  const cells=[];
  // pointy-top hexagons with corners at 30° + 60°k (where the portal tracts sit); neighbours lie across each edge
  for(let k=0;k<6;k++){ const a=k*Math.PI/3; cells.push([Math.cos(a)*Math.sqrt(3)*R*0.98,Math.sin(a)*Math.sqrt(3)*R*0.98]); }
  const neigh=tag(new THREE.InstancedMesh(hexGeo,
    mat(C.tissueMid,{roughness:0.62,clearcoat:0.25,opacity:0.20,side:THREE.DoubleSide}),cells.length),
    'Parenchyma');
  const d=new THREE.Object3D();
  cells.forEach(([x,y],i)=>{d.position.set(x,y,0);d.rotation.z=0;d.updateMatrix();
    neigh.setMatrixAt(i,d.matrix);});
  neigh.instanceMatrix.needsUpdate=true; lay('lobules').add(neigh);

  const heroGeo=new THREE.CylinderGeometry(R*0.975,R*0.975,H*0.99,6,1); heroGeo.rotateX(Math.PI/2);
  const hero=tag(new THREE.Mesh(heroGeo,
    mat(C.tissue,{roughness:0.7,clearcoat:0.15,opacity:0.12,side:THREE.DoubleSide})),'Parenchyma');
  hero.rotation.z=0; lay('lobules').add(hero);

  const ringGeo=new THREE.TorusGeometry(R*0.98,0.020,6,6);
  const ringMat=mat(C.collagen,{roughness:0.8,opacity:0.45,clearcoat:0});
  [H/2,-H/2].forEach(z=>{const r0=new THREE.Mesh(ringGeo,ringMat);
    r0.rotation.z=Math.PI/6;r0.position.z=z;r0.userData.noPick=true;lay('lobules').add(r0);});

  const cv=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.18,H*1.05,22,1,true),
    mat(C.vein,{roughness:0.3,side:THREE.DoubleSide,clearcoat:0.5,
      emissive:new THREE.Color(C.vein).multiplyScalar(0.22)})),'Central vein');
  cv.rotation.x=Math.PI/2; lay('central').add(cv);

  for(let i=0;i<6;i++){
    const a=Math.PI/6+i*Math.PI/3, cx=Math.cos(a)*R*0.98, cy=Math.sin(a)*R*0.98;
    const sheath=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,H,16,1),
      mat(C.collagen,{roughness:0.85,opacity:0.26,clearcoat:0})),'Portal tract');
    sheath.rotation.x=Math.PI/2; sheath.position.set(cx,cy,0); lay('portal').add(sheath);
    [[C.portal,0.060,0,0,'Portal tract'],[C.artery,0.028,0.070,0.046,'Hepatic artery'],
     [C.bile,0.025,-0.064,0.052,'Bile ductule']].forEach(([c,r,ox,oy,nm])=>{
      const m=tag(new THREE.Mesh(new THREE.CylinderGeometry(r,r,H,10,1),
        mat(c,{roughness:0.3,clearcoat:0.5,emissive:new THREE.Color(c).multiplyScalar(0.18)})),nm);
      m.rotation.x=Math.PI/2; m.position.set(cx+ox,cy+oy,0); lay(nm==='Hepatic artery'?'artery':nm==='Bile ductule'?'bile':'portal').add(m);
    });
  }

  const cordGeo=new THREE.CylinderGeometry(0.016,0.016,1,6,1); cordGeo.translate(0,0.5,0);
  const perCorner=18,layers=5,total=6*perCorner*layers;
  const cords=new THREE.InstancedMesh(cordGeo,mat(0xffffff,{roughness:0.5,clearcoat:0.3}),total);
  const zoneOf=new Uint8Array(total), col=new THREE.Color();
  const zc=[new THREE.Color(0xA85C3C),new THREE.Color(0x8A4433),new THREE.Color(0x63302F)];
  const cb={pos:new Float32Array(total*3),quat:new Float32Array(total*4),len:new Float32Array(total),z:new Float32Array(total)};
  let n=0;
  for(let i=0;i<6;i++){
    const a=Math.PI/6+i*Math.PI/3, cx=Math.cos(a)*R*0.98, cy=Math.sin(a)*R*0.98;
    for(let L=0;L<layers;L++){
      const zz=-H/2+H*(L+0.5)/layers;
      for(let k=0;k<perCorner;k++){
        // cords run from the limiting plate to the outer wall of the central vein (r ≈ 0.22), no further
        const STEP=0.56/perCorner, f0=0.16+STEP*k;
        const from=new THREE.Vector3(cx*(1-f0),cy*(1-f0),zz);
        const to=new THREE.Vector3(cx*(1-f0-STEP),cy*(1-f0-STEP),zz);
        const dir=to.clone().sub(from), len=dir.length();
        d.position.copy(from);
        d.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
        d.scale.set(1,len*1.12,1); d.updateMatrix(); cords.setMatrixAt(n,d.matrix);
        const kf=k/perCorner, zi=kf<0.34?0:(kf<0.67?1:2);
        cb.pos.set([from.x,from.y,from.z],n*3); cb.quat.set([d.quaternion.x,d.quaternion.y,d.quaternion.z,d.quaternion.w],n*4);
        cb.len[n]=len*1.12; cb.z[n]=(k+0.5)/perCorner;
        zoneOf[n]=zi; col.copy(zc[zi]); cords.setColorAt(n,col); n++;
      }
    }
  }
  cords.instanceMatrix.needsUpdate=true;
  if(cords.instanceColor) cords.instanceColor.needsUpdate=true;
  cords.userData.pick='Zone 1';
  cords.userData.pickBy=id=>['Zone 1','Zone 2','Zone 3'][zoneOf[id]];
  lay('plates').add(cords);
  // pathology overlay: fat droplets, iron, inflammatory cells, red cells, Councilman bodies — placed along the cords
  const ND=1100, dots=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),mat(0xffffff,{roughness:0.35,clearcoat:0.6}),ND);
  const dz=new Float32Array(ND), dr=new Float32Array(ND*4), dp=new Float32Array(ND*3), rnd=srng(777), tmpQ=new THREE.Quaternion(), up=new THREE.Vector3();
  for(let i=0;i<ND;i++){ const c=Math.floor(rnd()*total), t=rnd();
    tmpQ.set(cb.quat[c*4],cb.quat[c*4+1],cb.quat[c*4+2],cb.quat[c*4+3]); up.set(0,1,0).applyQuaternion(tmpQ);
    dp[i*3]=cb.pos[c*3]+up.x*cb.len[c]*t+(rnd()-0.5)*0.05; dp[i*3+1]=cb.pos[c*3+1]+up.y*cb.len[c]*t+(rnd()-0.5)*0.05;
    dp[i*3+2]=cb.pos[c*3+2]+up.z*cb.len[c]*t+(rnd()-0.5)*0.07;
    dz[i]=cb.z[c]; for(let k=0;k<4;k++) dr[i*4+k]=rnd();
    d.position.set(dp[i*3],dp[i*3+1],dp[i*3+2]); d.quaternion.identity(); d.scale.setScalar(0); d.updateMatrix(); dots.setMatrixAt(i,d.matrix);
    dots.setColorAt(i,new THREE.Color(0xffffff)); }
  dots.instanceMatrix.needsUpdate=true; dots.visible=false;
  const dotType=new Uint8Array(ND);
  dots.userData.pick='Lesion'; dots.userData.pickBy=id=>DOT_NAMES[dotType[id]]||'Hepatocyte plate';
  lay('plates').add(dots);

  const lp=tag(new THREE.Mesh(new THREE.TorusGeometry(R*0.80,0.018,6,44),
    mat(0xC08A66,{roughness:0.6,opacity:0.35})),'Limiting plate');
  lay('plates').add(lp);

  const septa=new THREE.Group();
  for(let i=0;i<6;i++){
    const a1=Math.PI/6+i*Math.PI/3, a2=Math.PI/6+(i+1)*Math.PI/3;
    const p1=new THREE.Vector3(Math.cos(a1)*R*0.98,Math.sin(a1)*R*0.98,0);
    const p2=new THREE.Vector3(Math.cos(a2)*R*0.98,Math.sin(a2)*R*0.98,0);
    const mp=p1.clone().lerp(p2,0.5).multiplyScalar(1.03);
    [0,H*0.32,-H*0.32].forEach(dz=>{
      const m=new THREE.Mesh(tube([p1,mp,p2],0.048,14,6),
        mat(C.collagen,{roughness:0.95,clearcoat:0.05}));
      m.material.opacity=0; m.material.userData.baseOpacity=0;
      m.position.z=dz; m.userData.pick='Fibrous septum'; septa.add(m);
    });
  }
  g.add(septa);
  { // acinus overlay: rhombus from this central vein to the adjacent one, its short axis the shared lobular edge
    // (terminal portal venule running between the two portal tracts); zones 1 → 3 widen out from that axis
    const s=R*0.98, pa=new THREE.Vector2(Math.cos(Math.PI/6)*s,Math.sin(Math.PI/6)*s), pb=new THREE.Vector2(0,s);
    const cv1=new THREE.Vector2(Math.cos(Math.PI/3),Math.sin(Math.PI/3)).multiplyScalar(Math.sqrt(3)*s), cv0=new THREE.Vector2(0,0);
    const mid=pa.clone().add(pb).multiplyScalar(0.5);
    const rh=k=>[pa, mid.clone().lerp(cv1,k), pb, mid.clone().lerp(cv0,k)];
    const shape=(k,hole)=>{ const P=rh(k), sh=new THREE.Shape(P); if(hole){ const Q=rh(hole).reverse(); sh.holes.push(new THREE.Path(Q)); } return sh; };
    const ZC=[0xE0574A,0xE3A33B,0x6A5ACD], NM=['Zone 1','Zone 2','Zone 3'], K=[0.34,0.67,1.0];
    K.forEach((k,z)=>{   // a thin slab on the lobule's cut face, so the three bands read cleanly
      const geo=new THREE.ExtrudeGeometry(shape(k,z?K[z-1]:0),{depth:0.05,bevelEnabled:false}); geo.translate(0,0,H/2+0.012);
      const m=tag(new THREE.Mesh(geo,mat(ZC[z],{roughness:0.6,clearcoat:0,opacity:0.72,side:THREE.DoubleSide,depthWrite:false,
        emissive:new THREE.Color(ZC[z]).multiplyScalar(0.45)})),NM[z]);
      m.renderOrder=4; lay('acinar').add(m); });
    const cv2=tag(new THREE.Mesh(cv.geometry,cv.material),'Central vein (adjacent lobule)');
    cv2.rotation.x=Math.PI/2; cv2.position.set(cv1.x,cv1.y,0); lay('acinar').add(cv2);
  }
  registerFade(g);
  septa.traverse(o=>{if(o.isMesh) o.material.userData.baseOpacity=0;});
  /* blood: enters along the lobular margin from each portal tract, crosses the plates to the
     central vein, then runs up its axis; colour darkens as oxygen is extracted (zone 1 → 3) */
  const NB=240;
  const blood=new THREE.InstancedMesh(new THREE.SphereGeometry(0.022,8,6),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.95}),NB);
  blood.userData.noPick=true;
  const bst=[];
  for(let k=0;k<NB;k++){
    const ci=k%6, a=Math.PI/6+ci*Math.PI/3;
    const along=(rng()-0.5)*0.9;                       // spread along the adjacent lobular edges
    const ta=a+Math.PI/2;
    const sx=Math.cos(a)*R*0.95+Math.cos(ta)*along*R*0.5, sy=Math.sin(a)*R*0.95+Math.sin(ta)*along*R*0.5;
    bst.push({sx,sy,z:(rng()-0.5)*H*0.9,t:rng()*1.3,sp:0.85+rng()*0.3});
  }
  for(let k=0;k<NB;k++) blood.setColorAt(k,new THREE.Color(0xC9473C));
  lay('flow').add(blood);
  g.userData={septa,cords,blood,bst,H,R,LG:lay.map,cb,dots,dz,dr,dp,dotType,cv,lp,zc,
    cur:null};
  return g;
}

/* ════════════ TIER 2 — acinus: portal venule → sinusoids → central venule ════════════ */
function buildAcinus(){
  const g=new THREE.Group(); const lay=layerer(g);
  const PX=-1.45, CX=1.45, HALF=0.86;      // portal venule x, central venule x, vertical half-height

  // terminal portal venule, hepatic arteriole and bile ductule in a collagen sheath
  const sheath=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,2.35,20,1,true),
    mat(C.collagen,{roughness:0.9,opacity:0.16,side:THREE.DoubleSide,clearcoat:0})),'Portal tract');
  sheath.position.set(PX,0,0); lay('portal').add(sheath);
  // venules are hollow, glassy tubes so the blood inside shows its direction:
  // portal blood runs down the venule (−y), central blood runs up toward the hepatic vein (+y)
  const hollow=(c,r0,r1,name,x)=>{
    const grp=new THREE.Group(); grp.position.set(x,0,0);
    const wall=tag(new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,2.35,32,1,true),
      mat(c,{roughness:0.18,clearcoat:0.9,clearcoatRoughness:0.15,opacity:0.30,side:THREE.DoubleSide,
        emissive:new THREE.Color(c).multiplyScalar(0.30)})),name);
    grp.add(wall);
    [[1.175,r0],[-1.175,r1]].forEach(([y,r])=>{ const rim=tag(new THREE.Mesh(new THREE.TorusGeometry(r,0.012,8,40),
      mat(c,{roughness:0.3,clearcoat:0.6,emissive:new THREE.Color(c).multiplyScalar(0.35)})),name);
      rim.rotation.x=Math.PI/2; rim.position.y=y; grp.add(rim); });
    return grp;
  };
  const pv=hollow(C.portal,0.15,0.17,'Terminal portal venule',PX); lay('portal').add(pv);
  const ha=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.050,0.050,2.35,14,1),
    mat(C.artery,{roughness:0.3,clearcoat:0.55,
      emissive:new THREE.Color(C.artery).multiplyScalar(0.25)})),'Hepatic artery');
  ha.position.set(PX-0.22,0,0.18); lay('artery').add(ha);
  const bd=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,2.35,14,1),
    mat(C.bile,{roughness:0.3,clearcoat:0.6,
      emissive:new THREE.Color(C.bile).multiplyScalar(0.28)})),'Bile ductule');
  bd.position.set(PX-0.20,0,-0.20); lay('bile').add(bd);

  // terminal hepatic (central) venule
  const cv=hollow(C.vein,0.21,0.23,'Central vein',CX); lay('central').add(cv);
  // blood inside the venules
  const VN=46, vGeo=new THREE.SphereGeometry(0.030,10,8);
  const pvBlood=new THREE.InstancedMesh(vGeo,new THREE.MeshBasicMaterial({color:0xE0574A,transparent:true,opacity:1}),VN);
  const cvBlood=new THREE.InstancedMesh(vGeo,new THREE.MeshBasicMaterial({color:0x9A4E92,transparent:true,opacity:1}),VN);
  pvBlood.userData.noPick=cvBlood.userData.noPick=true;
  lay('portal').add(pvBlood); lay('central').add(cvBlood);
  const venState=[]; for(let i=0;i<VN;i++) venState.push({t:rng(),a:rng()*Math.PI*2,r:Math.sqrt(rng())*0.72});

  /* sinusoidal bed: straight, translucent channels running portal → central, each lined above and
     below by a one-cell-thick hepatocyte plate. Plates and channels alternate along the venule axis. */
  const rows=6, gap=2*HALF/rows, SR=0.036, SZ=0.028;          // channels, spacing, lumen radius, forward offset
  const X0=PX+0.10, X1=CX-0.10;
  const sinusoids=[], parts=[];
  for(let i=0;i<rows;i++){
    const y=-HALF+gap*(i+0.5);
    const curve=new THREE.LineCurve3(new THREE.Vector3(X0,y,SZ),new THREE.Vector3(X1,y,SZ));
    sinusoids.push(curve);
    const tg=new THREE.CylinderGeometry(SR,SR,X1-X0,14,1,true);
    tg.rotateZ(-Math.PI/2); tg.translate((X0+X1)/2,y,SZ);
    parts.push(tg);
  }
  /* each channel: fenestrated endothelial lining (fixed pores that narrow and close with fibrosis), a pale
     space of Disse between it and the plates, and perisinusoidal collagen that is laid down there as the
     lumen narrows (capillarisation) — the acinar-scale view of the sinusoid tier */
  const sinMat=new THREE.MeshPhysicalMaterial({color:0xF0B4A6,roughness:0.2,clearcoat:0.8,clearcoatRoughness:0.2,
    transparent:true,opacity:0.34,side:THREE.DoubleSide,depthWrite:false,alphaMap:fenestraTexture(0,[1,9]),alphaTest:0.12,
    emissive:new THREE.Color(0x5A2A24)});
  const DOUT=SR+0.0165;                                            // outer edge of Disse = the plate faces
  const disMat=mat(0xF1DC8C,{roughness:0.5,clearcoat:0.1,opacity:0.30,side:THREE.DoubleSide,depthWrite:false,
    emissive:new THREE.Color(0xF1DC8C).multiplyScalar(0.40)});
  const colMat=()=>mat(0xF6F3EC,{roughness:0.55,clearcoat:0.2,emissive:new THREE.Color(0xF6F3EC).multiplyScalar(0.3)});
  const chans=[], acFib=[];
  for(let i=0;i<rows;i++){
    const y=-HALF+gap*(i+0.5), Lc=X1-X0, cxm=(X0+X1)/2;
    const sg=new THREE.CylinderGeometry(SR,SR,Lc,20,1,true); sg.rotateZ(-Math.PI/2);
    const sm=tag(new THREE.Mesh(sg,sinMat),'Sinusoid'); sm.position.set(cxm,y,SZ); sm.renderOrder=3; lay('sinusoids').add(sm);
    const dg=new THREE.CylinderGeometry(DOUT,DOUT,Lc,24,1,true); dg.rotateZ(-Math.PI/2);
    const dm=tag(new THREE.Mesh(dg,disMat),'Space of Disse'); dm.position.set(cxm,y,SZ); dm.renderOrder=2; lay('disse').add(dm);
    chans.push({sm,y});
    for(let k=0;k<14;k++){                                           // collagen strands running along the channel inside Disse
      const Lf=0.35+rng()*0.9, x=X0+0.1+rng()*(Lc-0.2-Lf)+Lf/2, a=rng()*Math.PI*2;
      const fm=new THREE.Mesh(new THREE.CylinderGeometry(0.0065,0.0065,Lf,6,1),colMat()); fm.rotation.z=Math.PI/2;
      fm.material.opacity=0; fm.material.userData.baseOpacity=0; fm.userData.pick='Perisinusoidal collagen';
      lay('disse').add(fm); acFib.push({m:fm,x,y,a,stag:rng()*0.35});
    }
  }
  let acStep=-1;
  const acSetFib=f=>{
    const k=1-0.40*THREE.MathUtils.smoothstep(f,0.10,1.0), r=SR*k;        // lumen narrows; Disse widens into the space it leaves
    for(const c of chans) c.sm.scale.set(1,k,k);
    for(const fb of acFib){ const rr=r+(DOUT-r)*0.55;
      fb.m.position.set(fb.x,fb.y+Math.cos(fb.a)*rr,SZ+Math.sin(fb.a)*rr);
      fb.m.material.userData.baseOpacity=THREE.MathUtils.clamp((f-0.12-fb.stag)*2.2,0,1); }
    const step=Math.round(f*16)/16;
    if(step!==acStep){ acStep=step; const old=sinMat.alphaMap; sinMat.alphaMap=fenestraTexture(step,[1,9]); if(old) old.dispose(); sinMat.needsUpdate=true; }
  };

  // inlet venules: the first stretch of each channel as it leaves the portal venule
  const inlets=[];
  for(let i=0;i<rows;i++){
    const y=-HALF+gap*(i+0.5), L0=PX+0.12, L1=PX+0.36;
    const ig=new THREE.CylinderGeometry(SR*1.25,SR*1.05,L1-L0,12,1,true);
    ig.rotateZ(-Math.PI/2); ig.translate((L0+L1)/2,y,SZ); inlets.push(ig);
  }
  const inletMat=mat(C.portal,{roughness:0.3,clearcoat:0.6,opacity:0.55,side:THREE.DoubleSide,
    emissive:new THREE.Color(C.portal).multiplyScalar(0.25)});
  lay('portal').add(tag(new THREE.Mesh(BGU.mergeGeometries(inlets,false),inletMat),'Inlet venule'));
  inlets.forEach(p=>p.dispose());

  // hepatocyte plates: rows+1 plates, the outer two bounding the acinar sheet; tinted by zone
  const cols=14, rowsP=rows+1, total=cols*rowsP;
  const PL0=PX+0.38, PL1=CX-0.32, cw=(PL1-PL0)/cols;
  const plate=new RoundedBoxGeometry(cw*0.93,gap-2*SR-0.035,0.13,2,0.026);
  const heps=new THREE.InstancedMesh(plate,mat(0xffffff,{roughness:0.55,clearcoat:0.3}),total);
  const zoneOf=new Uint8Array(total), d=new THREE.Object3D(), col=new THREE.Color();
  const zc=[new THREE.Color(0xB86A4C),new THREE.Color(0x94503C),new THREE.Color(0x6C3530)];
  const hb={pos:new Float32Array(total*3),z:new Float32Array(total)};
  let n=0;
  for(let r=0;r<rowsP;r++) for(let c2=0;c2<cols;c2++){
    const t=(c2+0.5)/cols;
    d.position.set(PL0+cw*(c2+0.5),-HALF+gap*r,0);
    hb.pos.set([d.position.x,d.position.y,0],n*3); hb.z[n]=t;
    d.rotation.set(0,0,0); d.scale.set(1,1,1); d.updateMatrix();
    heps.setMatrixAt(n,d.matrix);
    const zi=t<0.34?0:(t<0.67?1:2);
    zoneOf[n]=zi; col.copy(zc[zi]); heps.setColorAt(n,col); n++;
  }
  heps.instanceMatrix.needsUpdate=true;
  if(heps.instanceColor) heps.instanceColor.needsUpdate=true;
  heps.userData.pick='Hepatocyte plate';
  heps.userData.pickBy=id=>['Zone 1','Zone 2','Zone 3'][zoneOf[id]];
  lay('plates').add(heps);
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,10),mat(0xffffff,{roughness:0.25,clearcoat:0.9}),total);
  for(let i=0;i<total;i++){ d.position.set(hb.pos[i*3],hb.pos[i*3+1],0.055); d.rotation.set(0,0,0); d.scale.setScalar(0); d.updateMatrix();
    drops.setMatrixAt(i,d.matrix); drops.setColorAt(i,new THREE.Color(0xffffff)); }
  drops.visible=false; const dropType=new Uint8Array(total);
  drops.userData.pick='Lesion'; drops.userData.pickBy=id=>DOT_NAMES[dropType[id]]||'Hepatocyte plate';
  lay('plates').add(drops);

  // bile canaliculi: along the front of each plate, draining back to the ductule (canal of Hering)
  const canal=[], canalCurves=[];
  for(let r=0;r<rowsP;r++){
    const y=-HALF+gap*r, zc0=0.072;
    const cc=new THREE.CatmullRomCurve3([
      new THREE.Vector3(PX-0.20,y*0.96,-0.20), new THREE.Vector3(PX-0.02,y,-0.30),
      new THREE.Vector3(PX+0.26,y,zc0*0.6), new THREE.Vector3(PX+0.40,y,zc0),
      new THREE.Vector3(0,y,zc0), new THREE.Vector3(CX-0.34,y,zc0)]);
    cc.curveType='centripetal';
    canalCurves.push(cc);
    canal.push(new THREE.TubeGeometry(cc,60,0.013,6,false));
  }
  lay('bile').add(tag(new THREE.Mesh(BGU.mergeGeometries(canal,false),
    mat(C.bile,{roughness:0.3,clearcoat:0.7,
      emissive:new THREE.Color(C.bile).multiplyScalar(0.3)})),'Bile canaliculus'));
  canal.forEach(p=>p.dispose());

  // flow particles: erythrocytes inside each channel, bile back along the canaliculi
  const bloodN=96;
  const blood=new THREE.InstancedMesh(new THREE.SphereGeometry(0.026,10,8),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:1}),bloodN);
  for(let i=0;i<bloodN;i++) blood.setColorAt(i,new THREE.Color(0xE0574A));
  blood.userData.noPick=true; blood.renderOrder=2; lay('flow').add(blood);
  const bloodState=[]; for(let i=0;i<bloodN;i++) bloodState.push({t:rng(),row:i%rows});
  const bileN=28;
  const bileP=new THREE.InstancedMesh(new THREE.SphereGeometry(0.020,7,6),
    new THREE.MeshBasicMaterial({color:0xF2D97A,transparent:true,opacity:0.95}),bileN);
  bileP.userData.noPick=true; lay('bile').add(bileP);
  const bileState=[]; for(let i=0;i<bileN;i++) bileState.push({t:rng(),row:i%rowsP});

  // bridging fibrosis hook: septa linking the portal tract to the central vein
  const septa=new THREE.Group();
  [-0.75,0.0,0.75].forEach(y0=>{
    const m=new THREE.Mesh(varTube([
      new THREE.Vector3(PX+0.26,y0,0), new THREE.Vector3(-0.5,y0+0.18,0.1),
      new THREE.Vector3(0.6,y0-0.16,-0.1), new THREE.Vector3(CX-0.28,y0,0)
    ], t=>0.085*(0.7+0.6*Math.sin(Math.PI*t)), 40, 10),
      mat(C.collagen,{roughness:0.95,clearcoat:0.05}));
    m.material.opacity=0; m.material.userData.baseOpacity=0;
    m.userData.pick='Fibrous septum'; septa.add(m);
  });
  g.add(septa);

  registerFade(g);
  septa.traverse(o=>{if(o.isMesh) o.material.userData.baseOpacity=0;});
  g.userData={sinusoids,canalCurves,blood,bloodState,bileP,bileState,septa,rows,rowsP,LG:lay.map,
    pvBlood,cvBlood,venState,PX,CX,heps,hb,drops,dropType,zc,cv,cw,gap,setFib:acSetFib};
  return g;
}

/* ════════════ TIER 3 — sinusoid, cut open ════════════ */
/* ════════════ TIER 3 — sinusoid, cut open ════════════ */
/* Fenestrae: one fixed set of sieve plates. With fibrosis each pore narrows and a growing share close
   completely (defenestration) — but no pore ever moves. */
const FEN_HOLES=(()=>{ const r=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(4242424), out=[];
  for(let p=0;p<22;p++){ const px=r()*1024, py=r()*1024, pr=54+r()*34;
    for(let i=0;i<34;i++){ const a=r()*Math.PI*2, rr=Math.sqrt(r())*pr;
      out.push({x:px+Math.cos(a)*rr, y:py+Math.sin(a)*rr, r:11*(0.75+r()*0.5), close:0.15+0.85*r()}); } }
  return out; })();
function fenestraTexture(fib,rep){
  const s=1024, cv=document.createElement('canvas'); cv.width=cv.height=s;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,s,s);
  ctx.fillStyle='#000000';
  const shrink=1-0.62*THREE.MathUtils.smoothstep(fib,0.05,1.0);
  for(const h of FEN_HOLES){
    const shut=1-THREE.MathUtils.smoothstep(fib,h.close*0.95,h.close*0.95+0.18);   // this pore closes as fibrosis passes its threshold
    const rr=h.r*shrink*shut; if(rr<0.8) continue;
    for(const [ox,oy] of [[0,0],[s,0],[-s,0],[0,s],[0,-s]]){   // wrap across the tile edges
      const x=h.x+ox, y=h.y+oy; if(x<-20||x>s+20||y<-20||y>s+20) continue;
      ctx.beginPath(); ctx.arc(x,y,rr,0,Math.PI*2); ctx.fill(); }
  }
  const t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(...(rep||[3,1.6]));
  return t;
}
function buildSinusoid(){
  /* Posed like the acinus (TIER_XF[3]): the channel runs portal → central left to right, the
     portal and central venules are the acinar venules at right angles to it, and the hepatocyte
     plates sit either side of it along the venule axis — the same plane and stacking as the acinus. */
  const g=new THREE.Group(); const lay=layerer(g);
  const core=new THREE.Group(); g.add(core);
  const layC=layerer(core,lay.map);
  const LEN=4.4, LUM=0.44, HF=0.61, d=new THREE.Object3D();

  // fenestrated endothelium (radius falls with capillarisation / perisinusoidal fibrosis)
  const endoG=new THREE.Group(); layC('endothelium').add(endoG);
  const endoMat=new THREE.MeshPhysicalMaterial({
    color:0xC98F84, roughness:0.34, clearcoat:0.6, side:THREE.DoubleSide,
    transparent:true, opacity:1, alphaMap:fenestraTexture(0), alphaTest:0.42});
  // the viewer-facing wall is cut away (a 140° window) so the lumen, Kupffer cell and erythrocytes show
  const CUT0=4.14+1.22, CUTL=Math.PI*2-2.44, WIN=Math.atan2(0.54,-0.84);
  const endo=tag(new THREE.Mesh(new THREE.CylinderGeometry(LUM+0.05,LUM+0.05,LEN,64,1,true,CUT0,CUTL),endoMat),'Fenestrated endothelium');
  endo.rotation.x=Math.PI/2; endoG.add(endo);
  const rim=new THREE.InstancedMesh(new THREE.TorusGeometry(0.075,0.010,6,16),mat(0xE8B9A8,{roughness:0.4,opacity:0.75}),26);
  for(let k=0;k<26;k++){
    const a=WIN+1.25+rng()*(Math.PI*2-2.5), z=-LEN/2+0.3+rng()*(LEN-0.6);
    d.position.set(Math.cos(a)*(LUM+0.05),Math.sin(a)*(LUM+0.05),z);
    d.lookAt(0,0,z); d.scale.setScalar(0.7+rng()*0.7); d.updateMatrix(); rim.setMatrixAt(k,d.matrix);
  }
  rim.instanceMatrix.needsUpdate=true; rim.userData.pick='Fenestra';   // pore rims retired: the pores themselves carry the change
  const bmG=new THREE.Group(); layC('endothelium').add(bmG);
  const bmMat=mat(C.collagen,{roughness:0.9,clearcoat:0,side:THREE.DoubleSide}); bmMat.opacity=0;
  const bm=tag(new THREE.Mesh(new THREE.CylinderGeometry(LUM+0.095,LUM+0.095,LEN,40,1,true,CUT0,CUTL),bmMat),'Basement membrane');
  bm.rotation.x=Math.PI/2; bmG.add(bm); bmMat.userData.baseOpacity=0;

  // space of Disse: pale layer between endothelium and the hepatocyte faces; widens with fibrosis
  const disseMat=mat(0xF1DC8C,{roughness:0.55,clearcoat:0.1,opacity:0.72,side:THREE.DoubleSide,
    emissive:new THREE.Color(0xF1DC8C).multiplyScalar(0.38)});
  const slabs=[];
  for(const sgn of [1,-1]){
    const sl=tag(new THREE.Mesh(new THREE.BoxGeometry(1.10,1,LEN),disseMat),'Space of Disse');
    layC('disse').add(sl); slabs.push([sl,sgn]);
  }
  // perisinusoidal collagen: white linear strands laid down in Disse as fibrosis advances
  const fibres=[];
  for(let k=0;k<96;k++){
    const Lf=0.5+rng()*1.3;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.014,Lf,6,1),
      mat(0xF6F3EC,{roughness:0.55,clearcoat:0.2,emissive:new THREE.Color(0xF6F3EC).multiplyScalar(0.3)}));
    m.rotation.x=Math.PI/2; m.material.opacity=0; m.material.userData.baseOpacity=0;
    m.position.set((rng()-0.5)*0.98,0,(rng()-0.5)*(LEN-Lf));
    m.userData.pick='Perisinusoidal collagen'; layC('disse').add(m);
    fibres.push({m,sgn:k%2?1:-1,frac:0.2+rng()*0.6,stag:rng()*0.35});
  }

  // hepatocytes: packed edge to edge, slightly rounded
  const HN=4, HD=LEN/HN;
  const heps=tag(new THREE.InstancedMesh(new RoundedBoxGeometry(1.12,0.90,HD,3,0.09),
    mat(0xffffff,{roughness:0.5,clearcoat:0.4,clearcoatRoughness:0.5,emissive:new THREE.Color(0x3A1812)}),HN*2),'Hepatocyte plate');
  let i=0; const hz=[], hpos=[];
  for(const sgn of [1,-1]) for(let k=0;k<HN;k++){
    d.position.set(0,sgn*1.06,-LEN/2+HD*(k+0.5)); d.rotation.set(0,0,0); d.scale.set(1,1,1); d.updateMatrix();
    hpos.push(d.position.clone()); hz.push((k+0.5)/HN);
    heps.setColorAt(i,new THREE.Color(0x7A3A2C)); heps.setMatrixAt(i++,d.matrix);
  }
  // fat droplets / iron granules / necrotic change shown on the viewer-facing side of each plate cell
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,20,14),mat(0xffffff,{roughness:0.2,clearcoat:1}),HN*2*3);
  for(let k=0;k<HN*2*3;k++){ const c=hpos[Math.floor(k/3)], j=k%3;
    d.position.set(-0.50,c.y+(j-1)*0.24,c.z+(j===1?0.18:-0.2)); d.scale.setScalar(0); d.updateMatrix(); drops.setMatrixAt(k,d.matrix); drops.setColorAt(k,new THREE.Color(0xffffff)); }
  drops.visible=false; const dropType=new Uint8Array(HN*2*3);
  drops.userData.pick='Lesion'; drops.userData.pickBy=id=>DOT_NAMES[dropType[id]]||'Hepatocyte plate';
  layC('hepatocytes').add(drops);
  heps.instanceMatrix.needsUpdate=true; layC('hepatocytes').add(heps);

  // bile canaliculi (no tight-junction rings at this scale) with counter-current bile
  const caliMat=mat(C.bile,{roughness:0.28,clearcoat:0.7,emissive:new THREE.Color(C.bile).multiplyScalar(0.3)});
  for(const sgn of [1,-1]){
    const c=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,LEN,14,1),caliMat),'Bile canaliculus');
    c.rotation.x=Math.PI/2; c.position.set(0,sgn*1.54,0); layC('bile').add(c);
  }
  const bp=new THREE.InstancedMesh(new THREE.SphereGeometry(0.030,8,6),
    new THREE.MeshBasicMaterial({color:0xF2D97A,transparent:true,opacity:0.95}),26);
  bp.userData.noPick=true;
  const bpState=[]; for(let k=0;k<26;k++) bpState.push({t:rng(),s:k%2?1:-1});
  layC('bile').add(bp);

  // Kupffer cell (lumen) and stellate cell (Disse)
  const kg=new THREE.IcosahedronGeometry(0.20,2);
  {const q=kg.attributes.position,v=new THREE.Vector3();
   for(let k=0;k<q.count;k++){v.fromBufferAttribute(q,k);
     v.multiplyScalar(1+0.42*Math.sin(v.x*9)*Math.sin(v.y*7.5)*Math.sin(v.z*8.5)); q.setXYZ(k,v.x,v.y,v.z);}
   kg.computeVertexNormals();}
  const kup=tag(new THREE.Mesh(kg,mat(C.kupffer,{roughness:0.55,clearcoat:0.3})),'Kupffer cell');
  kup.position.set(-0.20,0.05,0.80); layC('cells').add(kup);
  const stel=new THREE.Group();
  const soma=tag(new THREE.Mesh(new THREE.SphereGeometry(0.13,20,14),mat(C.stellate,{roughness:0.45,clearcoat:0.4})),'Stellate cell');
  stel.add(soma);
  for(let k=0;k<7;k++){
    const dr=tag(new THREE.Mesh(new THREE.SphereGeometry(0.038,10,8),
      mat(C.amber,{roughness:0.15,clearcoat:1,emissive:new THREE.Color(C.amber).multiplyScalar(0.4)})),'Retinoid droplet');
    const a=rng()*Math.PI*2; dr.position.set(Math.cos(a)*0.07,Math.sin(a)*0.03,(rng()-0.5)*0.14);
    dr.userData.droplet=true; stel.add(dr);
  }
  const procs=new THREE.Group();
  for(let k=0;k<5;k++){
    const a=(k/5)*Math.PI*2;
    procs.add(new THREE.Mesh(tube([V3(0,0,0),V3(Math.cos(a)*0.24,0,Math.sin(a)*0.30),V3(Math.cos(a)*0.36,0,Math.sin(a)*0.62)],0.013,14,5),
      mat(C.stellate,{roughness:0.5})));
  }
  tagAll(procs,'Stellate cell'); stel.add(procs);
  stel.position.set(-0.30,0.56,-1.05); layC('cells').add(stel);

  // erythrocytes
  const rbcGeo=new THREE.SphereGeometry(0.098,14,10); rbcGeo.scale(1,0.40,1);
  const rbc=tag(new THREE.InstancedMesh(rbcGeo,mat(0xA83128,{roughness:0.32,clearcoat:0.6}),96),'Erythrocyte');
  const rbcState=[];
  for(let k=0;k<96;k++) rbcState.push({t:rng(),a:rng()*Math.PI*2,rr:Math.sqrt(rng())*LUM*0.72,tilt:rng()*Math.PI});
  rbc.count=34;
  layC('blood').add(rbc);

  // terminal portal venule (inlet, left) and central venule (outlet, right), at right angles
  const vesselMat=c=>mat(c,{roughness:0.18,clearcoat:0.9,clearcoatRoughness:0.15,opacity:0.32,side:THREE.DoubleSide,emissive:new THREE.Color(c).multiplyScalar(0.3)});
  const PVR=0.30, CVR=0.34, pvz=-LEN/2-PVR+0.02, cvz=LEN/2+CVR-0.02;
  const pvMesh=tag(new THREE.Mesh(new THREE.CylinderGeometry(PVR,PVR,3.6,36,1,true),vesselMat(C.portal)),'Terminal portal venule');
  pvMesh.position.set(0,0,pvz);
  const cvMesh=tag(new THREE.Mesh(new THREE.CylinderGeometry(CVR,CVR,3.6,36,1,true),vesselMat(C.vein)),'Central vein');
  cvMesh.position.set(0,0,cvz);
  const vN=60, vGeo=new THREE.SphereGeometry(0.06,10,8);
  const pvPart=new THREE.InstancedMesh(vGeo,new THREE.MeshBasicMaterial({color:0xE0574A,transparent:true,opacity:1}),vN);
  const cvPart=new THREE.InstancedMesh(vGeo,new THREE.MeshBasicMaterial({color:0x9A4E92,transparent:true,opacity:1}),vN);
  pvPart.userData.noPick=true; cvPart.userData.noPick=true;

  const vst=[]; for(let k=0;k<vN;k++) vst.push({t:rng(),a:rng()*Math.PI*2,r:rng()*0.6});

  g.scale.setScalar(0.60);
  registerFade(g);

  const u={heps,hpos,hz,drops,dropType,cong:0,endoMat,bmMat,LEN,LUM,rbc,rbcState,bp,bpState,stel,soma,procs,pvPart,cvPart,vst,pvz,cvz,PVR,CVR,lumK:1,LG:lay.map,
    fibres,
    setFib(f){
      const r=LUM*(1-0.36*THREE.MathUtils.smoothstep(f,0.10,1.0))*(1+0.16*u.cong);
      const k=(r+0.05)/(LUM+0.05); endoG.scale.set(k,k,1);
      const kb=(r+0.095)/(LUM+0.095); bmG.scale.set(kb,kb,1);
      const inner=r+0.07, th=HF-inner;
      for(const [sl,sgn] of slabs){ sl.scale.y=th; sl.position.y=sgn*(inner+th/2); }
      for(const fb of fibres){
        fb.m.position.y=fb.sgn*(inner+fb.frac*th);
        fb.m.material.userData.baseOpacity=THREE.MathUtils.clamp((f-0.12-fb.stag)*2.2,0,1);
      }
      stel.position.y=inner+th*0.5;
      kup.position.set(-0.20*r/LUM,0.05,0.80);
      u.lumK=r/LUM;
    }};
  u.setFib(0);
  g.userData=u;
  return g;
}

/* ════════════ TIER 4 — hepatocyte ════════════ */
/* cell palette: warm translucent cytoplasm, organelles in clear, distinct, muted hues */
const K={membrane:0xE3B3A0, cyto:0xF2DCCD, nucleus:0x5B63B5, nucleolus:0x343A86, mito:0xDB7B5F,
  er:0x5FB3A1, ribo:0x2F7A6C, lipid:0xF3DE95, glyc:0xB7B0DA, canal:0xD9B64A, tj:0xF5ECCB,
  canTr:0xF0C24E, basTr:0x6FA8DC};
function buildCell(){
  /* The same cuboidal hepatocyte as in the sinusoid plate (same proportions and pose): x across the
     plate, y along the venule axis (+y = sinusoidal face toward Disse, −y = canalicular face),
     z along the sinusoid. Dimensions = plate cell × 0.6 × 4.2 so the cross-fade lines up. */
  const g=new THREE.Group(); const lay=layerer(g);
  const HX=1.41, HY=1.135, HZ=1.385, RAD=0.24;
  const shell=tag(new THREE.Mesh(new RoundedBoxGeometry(2*HX,2*HY,2*HZ,5,RAD),
    mat(K.membrane,{roughness:0.30,clearcoat:0.9,clearcoatRoughness:0.18,side:THREE.DoubleSide,
      opacity:0.26,emissive:new THREE.Color(K.membrane).multiplyScalar(0.08)})),'Sinusoidal membrane');
  lay('membrane').add(shell);
  const cyto=tag(new THREE.Mesh(new RoundedBoxGeometry(2*HX-0.05,2*HY-0.05,2*HZ-0.05,4,RAD-0.02),
    mat(K.cyto,{roughness:0.9,clearcoat:0,side:THREE.BackSide,opacity:0.20})),'Hepatocyte');
  lay('membrane').add(cyto);

  const nuc=tag(new THREE.Mesh(new THREE.SphereGeometry(0.46,36,26),
    mat(K.nucleus,{roughness:0.34,clearcoat:0.6,emissive:new THREE.Color(K.nucleus).multiplyScalar(0.12)})),'Nucleus');
  lay('nucleus').add(nuc);
  const nucl=tag(new THREE.Mesh(new THREE.SphereGeometry(0.14,20,14),mat(K.nucleolus,{roughness:0.5})),'Nucleolus');
  nucl.position.set(-0.16,0.08,0.14); lay('nucleus').add(nucl);

  // random point in the cytoplasm: inside the box (with margin), outside the nucleus
  const inCell=(v,m)=>{ do{ v.set((rng()*2-1)*(HX-m),(rng()*2-1)*(HY-m),(rng()*2-1)*(HZ-m)); }while(v.length()<0.62); return v; };
  const d=new THREE.Object3D();
  const mito=tag(new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.055,0.15,6,12),
    mat(K.mito,{roughness:0.4,clearcoat:0.5,emissive:new THREE.Color(K.mito).multiplyScalar(0.12)}),78),'Mitochondria');
  for(let k=0;k<78;k++){ inCell(d.position,0.22);
    d.rotation.set(rng()*3,rng()*3,rng()*3); d.scale.setScalar(0.8+rng()*0.6); d.updateMatrix(); mito.setMatrixAt(k,d.matrix); }
  mito.instanceMatrix.needsUpdate=true; lay('mitochondria').add(mito);

  const er=new THREE.Group();
  for(let k=0;k<9;k++){
    const sh=new THREE.Mesh(new THREE.TorusGeometry(0.60+k*0.055,0.012,5,40,Math.PI*0.75),
      mat(K.er,{roughness:0.45,clearcoat:0.4,opacity:0.92,emissive:new THREE.Color(K.er).multiplyScalar(0.10)}));
    sh.rotation.set(0.5+k*0.06,-0.9+k*0.10,0.3); er.add(sh);
  }
  tagAll(er,'Endoplasmic reticulum'); lay('er').add(er);
  const ribo=tag(new THREE.InstancedMesh(new THREE.SphereGeometry(0.016,6,5),mat(K.ribo,{roughness:0.6,opacity:0.9}),120),'Ribosome');
  for(let k=0;k<120;k++){
    const kk=Math.floor(rng()*9),rr=0.60+kk*0.055,a=rng()*Math.PI*0.75;
    d.position.set(Math.cos(a)*rr,Math.sin(a)*rr,0).applyEuler(new THREE.Euler(0.5+kk*0.06,-0.9+kk*0.10,0.3));
    d.rotation.set(0,0,0); d.scale.setScalar(1); d.updateMatrix(); ribo.setMatrixAt(k,d.matrix);
  }
  ribo.instanceMatrix.needsUpdate=true; lay('er').add(ribo);

  const lip=tag(new THREE.InstancedMesh(new THREE.SphereGeometry(0.10,16,12),
    mat(K.lipid,{roughness:0.12,clearcoat:1,emissive:new THREE.Color(K.lipid).multiplyScalar(0.10)}),12),'Lipid droplets');
  for(let k=0;k<12;k++){ inCell(d.position,0.25); d.rotation.set(0,0,0); d.scale.setScalar(0.6+rng()*0.9); d.updateMatrix(); lip.setMatrixAt(k,d.matrix); }
  lip.instanceMatrix.needsUpdate=true; lay('lipid').add(lip);

  const glyc=tag(new THREE.InstancedMesh(new THREE.SphereGeometry(0.022,7,6),mat(K.glyc,{roughness:0.6,opacity:0.8}),190),'Glycogen');
  for(let k=0;k<190;k++){ inCell(d.position,0.12); d.rotation.set(0,0,0); d.scale.setScalar(0.7+rng()*0.8); d.updateMatrix(); glyc.setMatrixAt(k,d.matrix); }
  glyc.instanceMatrix.needsUpdate=true; lay('glycogen').add(glyc);

  // canalicular face (−y): the hemi-canaliculus runs along z, as in the sinusoid plate, sealed by tight junctions
  const cali=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,2*HZ-0.3,24,1),
    mat(K.canal,{roughness:0.3,clearcoat:0.7,emissive:new THREE.Color(K.canal).multiplyScalar(0.22)})),'Canalicular membrane');
  cali.rotation.x=Math.PI/2; cali.position.set(0,-HY+0.02,0); lay('transporters').add(cali);
  for(const sx of [-1,1]){
    const tj=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,2*HZ-0.3,8,1),mat(K.tj,{roughness:0.4,clearcoat:0.6})),'Tight junction');
    tj.rotation.x=Math.PI/2; tj.position.set(sx*0.16,-HY+0.01,0); lay('transporters').add(tj);
  }
  const stud=(colour,n,name,place)=>{
    const m=tag(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.030,0.030,0.075,8,1),
      mat(colour,{roughness:0.3,clearcoat:0.7,emissive:new THREE.Color(colour).multiplyScalar(0.32)}),n),name);
    for(let k=0;k<n;k++){place(d,k); d.updateMatrix(); m.setMatrixAt(k,d.matrix);}
    m.instanceMatrix.needsUpdate=true; return m;
  };
  lay('transporters').add(stud(K.canTr,24,'Canalicular transporter',(o,k)=>{
    const a=Math.PI*(0.15+0.7*((k%2)?1:0)+0.0), zz=-HZ+0.3+(k>>1)/12*(2*HZ-0.6);
    const side=(k%2)?1:-1;
    o.position.set(side*0.12,-HY+0.10,zz); o.rotation.set(0,0,side*Math.PI/2); o.scale.setScalar(1);
  }));
  // sinusoidal (basolateral) face, +y: uptake transporters (NTCP, OATP1B1/1B3)
  lay('transporters').add(stud(K.basTr,34,'Basolateral transporter',(o,k)=>{
    o.position.set((rng()*2-1)*(HX-0.3),HY+0.01,(rng()*2-1)*(HZ-0.3));
    o.rotation.set(0,0,0); o.scale.setScalar(1);
  }));

  // pathology: macrovesicular fat droplet (displaces the nucleus), Mallory–Denk bodies, haemosiderin
  const drop=tag(new THREE.Mesh(new THREE.SphereGeometry(1,48,32),mat(0xF6E6AE,{roughness:0.1,clearcoat:1,opacity:0.96,
    emissive:new THREE.Color(0xF6E6AE).multiplyScalar(0.18)})),'Macrovesicular fat droplet');
  drop.position.set(0.25,0.12,0.30); drop.scale.setScalar(0.001); drop.visible=false; lay('pathology').add(drop);
  const mdbG=[]; for(let k=0;k<4;k++){ const c=V3(0.46,0.20,0.10), pts=[];
    for(let i=0;i<=40;i++){ const t=i/40*Math.PI*4+k*1.6; pts.push(c.clone().add(V3(Math.cos(t)*0.12*(1+0.3*Math.sin(t*1.7)),Math.sin(t*1.3+k)*0.10,Math.sin(t)*0.12))); }
    mdbG.push(metaTube(pts,()=>0.018,60,6,true,k)); }
  const mdb=tag(new THREE.Mesh(mergeMeta(mdbG),mat(0xE36D8E,{roughness:0.5,clearcoat:0.3,opacity:1})),'Mallory–Denk bodies');
  mdb.visible=false; lay('pathology').add(mdb);
  const fe=tag(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.032,0),mat(0xB5782A,{roughness:0.5,clearcoat:0.5,flatShading:true}),170),'Haemosiderin (iron) granules');
  { const r=srng(333); for(let k=0;k<170;k++){ d.position.set((r()*2-1)*(HX-0.25),-HY+0.12+Math.pow(r(),1.8)*1.1,(r()*2-1)*(HZ-0.25));
      if(Math.abs(d.position.x)<0.25 && d.position.y<-HY+0.3) d.position.x+=0.35*Math.sign(d.position.x||1);
      d.rotation.set(r()*3,r()*3,r()*3); d.scale.setScalar(0.7+r()*0.8); d.updateMatrix(); fe.setMatrixAt(k,d.matrix); } }
  fe.visible=false; fe.scale.setScalar(0.001); lay('pathology').add(fe);
  // remember organelle positions so the droplet can push them to the periphery
  const baseOf=im=>{ const a=[]; const M=new THREE.Matrix4(); for(let k=0;k<im.count;k++){ im.getMatrixAt(k,M); a.push(M.clone()); } return a; };
  const moveable=[[mito,baseOf(mito)],[lip,baseOf(lip)],[glyc,baseOf(glyc)]];
  registerFade(g);
  g.userData={lip,mito,glyc,LG:lay.map,drop,mdb,fe,nuc,nucl,er,ribo,moveable,HX,HY,HZ,dropR:0,bal:0,feK:0,mdbK:0};
  return g;
}

/* ════════════ assemble ════════════ */
const builders=[buildMacro,buildLobule,buildAcinus,buildSinusoid,buildCell];
const tiers=TIERS.map((t,i)=>{
  const grp=new THREE.Group(); grp.visible=false; scene.add(grp);
  return {...t,index:i,group:grp,built:false,w:0};
});
/* Lobule and acinus are posed identically: vessel axes point at the viewer, tilted 0.55 rad so the
   plates read in depth; one portal tract sits on the left and the central vein on the right, with the
   midpoint of that axis at the zoom origin — so zooming into the lobule lands in the acinus. */
const TILT=0.55, MICRO_TILT=0.45;
/* the sinusoid tier is drawn 1.12× larger while it cross-fades with the acinus (plates and cells coincide), easing to
   its native size before the hepatocyte tier appears */
const SIN_K=z=>1.12-0.12*THREE.MathUtils.smoothstep(z,3.0,3.45);
const TIER_XF={
  1:{rot:[-TILT,0,-Math.PI/6], pos:[0.40,0,0]},   // lobule: corner rotated to 180°, portal–central midpoint on the origin
  2:{rot:[Math.PI/2-TILT,0,0], pos:[0,-0.1662*Math.cos(Math.PI/2-TILT),-0.1662*Math.sin(Math.PI/2-TILT)], scl:1.16}, // acinus: vessels on the lobule axis; portal–central span = lobule's × 4.2
  3:{rot:[Math.PI/2-TILT,Math.PI/2,0], pos:[0.126,0,0]}, // sinusoid: channel along x; cells phased onto the acinar plate columns
  4:{rot:[Math.PI/2-TILT,Math.PI/2,0], pos:[0,0,0]}  // hepatocyte: posed exactly as the plate cell it zooms from
};
function xfMatrix(i){
  const x=TIER_XF[i]; if(!x) return null;
  const o=new THREE.Object3D(); o.rotation.set(...x.rot); o.position.set(...x.pos); o.scale.setScalar(x.scl||1); o.updateMatrix();
  return o.matrix;
}
function ensure(i){
  const t=tiers[i];
  if(t.built) return false;
  t.group.add(t.inner=builders[i]());
  const x=TIER_XF[i];
  if(x){ t.inner.rotation.set(...x.rot); t.inner.position.set(...x.pos); if(x.scl) t.inner.scale.multiplyScalar(x.scl); }
  t.built=true; return true;
}
ensure(0);
/* physical scale: the model's transverse extent is taken as an adult liver's ~20 cm */
const LIVER_CM = CT_MODE ? LDL.LIVER_CM : 20;   // CT: measured transverse extent of s1267's liver
const UNIT_M=(()=>{ const bb=new THREE.Box3().setFromBufferAttribute(tiers[0].inner.userData.MG.parenchyma.attributes.position);
  return LIVER_CM/100/(bb.max.x-bb.min.x); })();

const LAYERS=[
  {k:'parenchyma',  label:'Liver parenchyma', cycle:['solid','ghost','off']},
  {k:'segments',    label:'Segments'},
  {k:'portal',      label:'Portal venous', swatch:0x7A5CB4, cycle:['on','ghost','off']},
  {k:'artery',      label:'Hepatic arterial', swatch:0xB83A30, cycle:['on','ghost','off']},
  {k:'hepaticVein', label:'Hepatic veins / IVC', swatch:0x2F5A9E, cycle:['on','ghost','off']},
  {k:'biliary',     label:'Biliary', swatch:0xB9BC5E, cycle:['on','ghost','off']},
  {k:'stomach',     label:'Stomach', swatch:0xC98E7E, cycle:['on','ghost','off']},
  {k:'esophagus',   label:'Oesophagus', swatch:0xB5806F, cycle:['on','ghost','off']},
  {k:'duodenum',    label:'Duodenum', swatch:0xA87E62, cycle:['on','ghost','off']},
  {k:'pancreas',    label:'Pancreas', swatch:0xC9A16B, cycle:['on','ghost','off']},
  {k:'spleen',      label:'Spleen', swatch:0x6A2A3C, cycle:['on','ghost','off']},
  {k:'kidneys',     label:'Kidneys', swatch:0x7C3E33, cycle:['on','ghost','off']},
  {k:'ribcage',     label:'Ribcage & spine', swatch:0xE6DAC0, cycle:['on','ghost','off'], ctx:1},
  {k:'diaphragm',   label:'Diaphragm', swatch:0xA84A40, cycle:['on','ghost','off'], ctx:1}
];
const LAYER_GROUPS=[
  {k:'g_all',    label:'All',                    members:LAYERS.filter(L=>!L.ctx).map(L=>L.k), solo:true},
  {k:'g_liver',  label:'Liver',                  members:['parenchyma','segments']},
  {k:'g_vessels',label:'Vessels',                members:['portal','artery','hepaticVein']},
  {k:'g_visc',   label:'All non-liver viscera',  members:['biliary','stomach','esophagus','duodenum','pancreas','spleen','kidneys']},
  {k:'g_ctx',    label:'Context',                members:['ribcage','diaphragm']}];
const CYC3=['on','ghost','off'];
/* a group's state: the shared state of its cycling layers (the liver's 'solid' counts as on), else 'mixed' */
function groupValue(G){ const vs=G.members.filter(k=>LAYERS.find(L=>L.k===k).cycle).map(k=>state.layers[k]==='solid'?'on':state.layers[k]);
  return vs.every(v=>v===vs[0]) ? vs[0] : 'mixed'; }
function setGroup(G,v){ for(const k of G.members){ const Ld=LAYERS.find(L=>L.k===k);
    if(Ld.cycle) state.layers[k] = (k==='parenchyma'&&v==='on') ? 'solid' : v;
    else if(v==='off') state.layers[k]=false; } }
const ORGAN_KEYS=['stomach','esophagus','duodenum','pancreas','spleen','kidneys'];
const LAYER_SETS={
  0:LAYERS,
  1:[{k:'lobules',label:'Neighbouring lobules',swatch:0x4E2820},{k:'portal',label:'Portal venules',swatch:0x7A5CB4},
     {k:'artery',label:'Hepatic arterioles',swatch:0xB83A30},{k:'bile',label:'Bile ductules',swatch:0xB9BC5E},
     {k:'central',label:'Central vein',swatch:0x2F5A9E},{k:'plates',label:'Plates (zones)',swatch:0xA85C3C},
     {k:'acinar',label:'Acinar',swatch:0xE0574A},
     {k:'flow',label:'Blood flow',swatch:0xD1473A}],
  2:[{k:'disse',label:'Space of Disse',swatch:0xEAD58E},{k:'portal',label:'Portal venule',swatch:0x7A5CB4},{k:'artery',label:'Hepatic arteriole',swatch:0xB83A30},
     {k:'bile',label:'Bile',swatch:0xB9BC5E},{k:'central',label:'Central vein',swatch:0x2F5A9E},
     {k:'sinusoids',label:'Sinusoids',swatch:0xF0B4A6},{k:'plates',label:'Hepatocyte plates',swatch:0xB86A4C},
     {k:'flow',label:'Blood flow',swatch:0xD86A5E}],
  3:[{k:'endothelium',label:'Endothelium',swatch:0xC98F84},{k:'disse',label:'Space of Disse',swatch:0xEAD58E},
     {k:'hepatocytes',label:'Hepatocytes',swatch:0x57291F},{k:'bile',label:'Bile canaliculi',swatch:0xB9BC5E},
     {k:'cells',label:'Kupffer + stellate',swatch:0x7C5F9C},{k:'blood',label:'Erythrocytes',swatch:0xA83128}],
  4:[{k:'membrane',label:'Cell membrane',swatch:K.membrane},{k:'nucleus',label:'Nucleus',swatch:K.nucleus},
     {k:'mitochondria',label:'Mitochondria',swatch:K.mito},{k:'er',label:'ER',swatch:K.er},
     {k:'lipid',label:'Lipid droplets',swatch:K.lipid},{k:'glycogen',label:'Glycogen',swatch:K.glyc},
     {k:'transporters',label:'Transporters',swatch:K.canTr},{k:'pathology',label:'Pathology',swatch:0xE36D8E}]
};
const state={z:0,zTarget:0,fibrosis:0,pvt:false,flow:!REDUCED,tl:{1:{acinar:false},2:{},3:{},4:{}},
  path:{pvt:'none',pvtSMV:false,bcs:'none',tips:false,hepatofugal:false,masld:0,mash:false,zonal:'none',bil:{cause:'none',stent:'none',cc:'none'},pds:'none',panc:{type:'none',svt:false}},
  layers:{parenchyma:'solid',segments:false,portal:'on',artery:'on',viscera:true,
          hepaticVein:'on',biliary:'on',ligaments:true,
          stomach:'on',esophagus:'on',duodenum:'on',pancreas:'on',spleen:'on',kidneys:'on',ribcage:'off',diaphragm:'off'}};
const LAYER_DEFAULTS=JSON.parse(JSON.stringify(state.layers));
const METRES=[0.17,0.0022,4.0e-4,2.6e-5,1.4e-5];

/* ════════════ UI ════════════ */
const $=s=>document.querySelector(s);
const rail=$('#rail');
tiers.forEach((t,i)=>{
  const b=document.createElement('button');
  b.className='stop'; b.dataset.i=i;
  b.innerHTML=`<span class="tick"></span><span class="lbl"><em>${t.name}</em><small>${t.mag}</small></span>`;
  b.addEventListener('click',()=>{ if(i>state.zTarget) centreFocus(); state.zTarget=i;});
  rail.appendChild(b);
});
const stopEls=[...document.querySelectorAll('.stop')];

const anno=$('#anno'), selEl=$('#sel'), hoverEl=$('#hover');
function snapForward(v){            // march anteriorly until just outside the capsule
  const q=v.clone();
  for(let i=0;i<260;i++){ if(sdfLiver(q.x,q.y,q.z)>SURF+0.01) break; q.z+=0.01; }
  return q;
}
const pins=tiers.map(t=>t.annos.map(a=>{
  a._v = new THREE.Vector3(...a.p).multiplyScalar(t.annoScale ?? 1);
  { const M=xfMatrix(t.index); if(M) a._v.applyMatrix4(M); }
  if(a.surface && t.index===0) a._v = snapForward(a._v);
  const el=document.createElement('div');
  el.className='pin';
  el.innerHTML=`<span class="dot"></span><span class="txt">${a.l}</span>`;
  el.addEventListener('click',()=>setSelection(t.index,a._v,a.l));
  anno.appendChild(el);
  return {el,a,v:a._v};
}));
/* label anchors: every pin's dot is moved onto the nearest viewer-facing point of the mesh that
   carries the same name (whole meshes, instanced cells by pickBy, merged vessel trees by pickFace) */
const _sv=new THREE.Vector3(), _sq=new THREE.Vector3(), _rel=new THREE.Matrix4(), _inst=new THREE.Matrix4(), _gInv=new THREE.Matrix4();
function snapAnnos(ti){
  const t=tiers[ti]; if(!t.built) return 0;
  const byName=new Map();
  t.group.updateMatrixWorld(true);
  _gInv.copy(t.group.matrixWorld).invert();
  const view=camera.position.clone().applyMatrix4(_gInv).normalize();   // toward the viewer, tier-local
  t.annos.forEach(a=>{
    if(a.chip || !a._v || (ti===0 && a.surface)) return;
    if(!a._q) a._q=a._v.clone();
    a._best=Infinity; a._hit=null;
    a._qb=a._q.clone().addScaledVector(view,ti===0?0.06:0.14);           // nudge toward the viewer → front face
    const key=a.snap||a.l; if(!byName.has(key)) byName.set(key,[]); byName.get(key).push(a);
  });
  if(!byName.size) return 0;
  const tri=new THREE.Triangle(), A=new THREE.Vector3(), B=new THREE.Vector3(), Cc=new THREE.Vector3(), cp=new THREE.Vector3();
  const faces=(geo,fn)=>{ const ix=geo.index, n=ix?ix.count/3:geo.attributes.position.count/3;
    for(let f=0;f<n;f++) fn(f, ix?ix.getX(3*f):3*f, ix?ix.getX(3*f+1):3*f+1, ix?ix.getX(3*f+2):3*f+2); };
  const test=(list,M,pos,i0,i1,i2)=>{
    A.fromBufferAttribute(pos,i0).applyMatrix4(M); B.fromBufferAttribute(pos,i1).applyMatrix4(M);
    Cc.fromBufferAttribute(pos,i2).applyMatrix4(M); tri.set(A,B,Cc);
    for(const a of list){
      tri.closestPointToPoint(a._qb,cp); const d=cp.distanceToSquared(a._qb);
      if(d<a._best){ a._best=d; a._hit=(a._hit||new THREE.Vector3()).copy(cp); } } };
  t.inner.traverse(o=>{
    if(!o.isMesh || o.userData.noPick || o.userData.segmentPick) return;
    const geo=o.geometry, pos=geo?.attributes?.position; if(!pos) return;
    let nm=null; for(let n=o;n;n=n.parent){ if(n.userData.pick){nm=n.userData.pick;break;} }
    _rel.multiplyMatrices(_gInv,o.matrixWorld);
    if(o.isInstancedMesh){
      for(let k=0;k<o.count;k++){
        const list=byName.get(o.userData.pickBy?o.userData.pickBy(k):nm); if(!list) continue;
        o.getMatrixAt(k,_inst); _inst.premultiply(_rel);
        faces(geo,(f,i0,i1,i2)=>test(list,_inst,pos,i0,i1,i2));
      }
    } else if(o.userData.pickFace){
      faces(geo,(f,i0,i1,i2)=>{ const list=byName.get(o.userData.pickFace(f)); if(list) test(list,_rel,pos,i0,i1,i2); });
    } else {
      const list=byName.get(nm); if(!list) return;
      faces(geo,(f,i0,i1,i2)=>test(list,_rel,pos,i0,i1,i2));
    }
  });
  let n=0;
  byName.forEach(list=>list.forEach(a=>{ if(a._hit){ a._v.copy(a._hit); n++; } }));
  return n;
}
// segment labels, shown only in segment mode
const segPins=SEG.map((s,i)=>{
  const el=document.createElement('div');
  el.className='pin seg';
  el.style.color='#'+SEG_COL[i].toString(16).padStart(6,'0');
  el.innerHTML=`<span class="dot"></span><span class="txt">${s}</span>`;
  el.addEventListener('click',()=>setSelection(0,SEG_CENTROID[i],'Segment '+s));
  anno.appendChild(el);
  return {el,v:SEG_CENTROID[i]};
});

/* ════════════ pathology: HCC and cholangiocarcinoma ════════════ */
const lesGroup=new THREE.Group(); tiers[0].inner.add(lesGroup);
const lesions=[]; const serial={hcc:0,cca:0,pc:0};
const LES_STYLE={
  hcc:{base:0xC9A866,alt:0x8E9A4E,spot:0x7A2E26,pale:0xE3D3A6,lobes:[6,10],amp:[0.14,0.40],w:[0.35,0.70],rough:0.035,rgh:0.62},
  cca:{base:0xD3D9DA,alt:0xAEBABF,spot:0x8E9AA0,pale:0xF1F2EE,lobes:[11,16],amp:[0.10,0.34],w:[0.18,0.40],rough:0.06,rgh:0.78},
  abs:{base:0xD9C27C,alt:0xB99D55,spot:0x8E3A2E,pale:0xEEE3B8,lobes:[4,7],amp:[0.20,0.42],w:[0.40,0.70],rough:0.05,rgh:0.55},
  cyst:{base:0xB9D2DB,alt:0xA9C5D1,spot:0x9DB9C6,pale:0xDAE8EE,lobes:[1,2],amp:[0.02,0.05],w:[0.5,0.6],rough:0.004,rgh:0.10},
  hem:{base:0x8E2F45,alt:0x6E2238,spot:0xB24A5E,pale:0xA64A5E,lobes:[6,10],amp:[0.10,0.25],w:[0.30,0.50],rough:0.03,rgh:0.40},
  fnh:{base:0xB9876A,alt:0xA3765C,spot:0xE8E0D2,pale:0xC89C80,lobes:[5,8],amp:[0.08,0.18],w:[0.30,0.50],rough:0.02,rgh:0.50},
  hca:{base:0xC9A46A,alt:0xB08A52,spot:0x7A2E26,pale:0xDCC08A,lobes:[3,5],amp:[0.05,0.12],w:[0.40,0.60],rough:0.015,rgh:0.45},
  pc:{base:0xDCD3C0,alt:0xC2B69C,spot:0x9C8E78,pale:0xF0EBDF,lobes:[9,14],amp:[0.10,0.30],w:[0.20,0.45],rough:0.05,rgh:0.80}};
SEG.forEach((sn,i)=>{ for(const id of ['#hcc-seg','#cca-seg','#bll-seg']){ const o=document.createElement('option'); o.value=i; o.textContent=sn;
  if(sn===(id==='#hcc-seg'?'V':'VIII')) o.selected=true; $(id).appendChild(o); } });
const segCands={};
function segmentCandidates(k){                 // interior grid points of segment k with their depth below the capsule
  if(segCands[k]) return segCands[k];
  const bb=new THREE.Box3().setFromBufferAttribute(tiers[0].inner.userData.MG.posAttr);
  const out=[], st=0.05;
  for(let x=bb.min.x;x<=bb.max.x;x+=st) for(let y=bb.min.y;y<=bb.max.y;y+=st) for(let z=bb.min.z;z<=bb.max.z;z+=st){
    if(inStubOrTeres(x,y,z)) continue;
    const sd=sdfLiver(x,y,z); if(sd>=-0.02) continue;
    if(segAt(x,y,z)!==k) continue;
    out.push({p:new THREE.Vector3(x,y,z),d:-sd});
  }
  return segCands[k]=out;
}
const seeded=seed=>{ let q=(seed*9301+49297)%233280; return ()=>((q=(q*9301+49297)%233280)/233280); };
function paintVerts(geo,st,rnd,dir){           // variegated surface colour
  const P=geo.attributes.position, col=new Float32Array(P.count*3), v=new THREE.Vector3(), c=new THREE.Color();
  const cB=new THREE.Color(st.base), cA=new THREE.Color(st.alt), cS=new THREE.Color(st.spot), cP=new THREE.Color(st.pale);
  const ph=[rnd()*9,rnd()*9,rnd()*9], sc=dir||1;
  for(let i=0;i<P.count;i++){
    v.fromBufferAttribute(P,i).multiplyScalar(sc);
    const n1=Math.sin(v.x*5.3+ph[1])*Math.sin(v.y*4.7+ph[2])*Math.sin(v.z*5.9+ph[0]);
    const n2=Math.sin(v.x*9.1+ph[2])*Math.sin(v.y*8.3+ph[0])*Math.sin(v.z*7.7+ph[1]);
    c.copy(cB);
    if(n1>0.25) c.lerp(cA,Math.min(1,(n1-0.25)*2.4));
    if(n2>0.42) c.lerp(cS,Math.min(0.9,(n2-0.42)*3.2));
    if(n1<-0.45) c.lerp(cP,Math.min(0.8,(-n1-0.45)*2.5));
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
}
function massGeometry(r,seed,kind){
  const st=LES_STYLE[kind], rnd=seeded(seed);
  let geo=new THREE.IcosahedronGeometry(1,5); geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo=BGU.mergeVertices(geo);                      // shared vertices → smooth shading
  const P=geo.attributes.position, v=new THREE.Vector3();
  const lobes=[], nl=st.lobes[0]+Math.floor(rnd()*(st.lobes[1]-st.lobes[0]+1));
  for(let i=0;i<nl;i++) lobes.push({d:new THREE.Vector3(rnd()*2-1,rnd()*2-1,rnd()*2-1).normalize(),
    a:st.amp[0]+rnd()*(st.amp[1]-st.amp[0]),w:st.w[0]+rnd()*(st.w[1]-st.w[0])});
  const ph=[rnd()*9,rnd()*9,rnd()*9];
  let maxL=0; const f=new Float32Array(P.count);
  for(let i=0;i<P.count;i++){
    v.fromBufferAttribute(P,i);
    let k=0.78;
    for(const L of lobes){ const c=v.dot(L.d)-(1-L.w); if(c>0) k+=L.a*Math.pow(c/L.w,1.6); }
    k+=st.rough*Math.sin(v.x*7+ph[0])*Math.sin(v.y*6+ph[1])*Math.sin(v.z*8+ph[2]);
    if(kind==='cca'||kind==='pc'||kind==='abs') k+=0.03*Math.sin(v.x*17+ph[1])*Math.sin(v.y*15+ph[2])*Math.sin(v.z*19+ph[0]); // infiltrative margin
    f[i]=k; maxL=Math.max(maxL,k);
  }
  for(let i=0;i<P.count;i++){ v.fromBufferAttribute(P,i).multiplyScalar(f[i]/maxL*r); P.setXYZ(i,v.x,v.y,v.z); }
  paintVerts(geo,st,rnd,1/r);
  geo.computeVertexNormals(); geo.computeBoundingSphere();
  return geo;
}
/* periductal-infiltrating sleeve along part of a duct centreline (arc-length a → b, units) */
function sleeveGeometry(pts,a,b,rIn,rOut,seed){
  const curve=new THREE.CatmullRomCurve3(pts), Lc=curve.getLength();
  a=Math.max(0,Math.min(a,Lc-0.02)); b=Math.max(a+0.02,Math.min(b,Lc));
  const N=40, R=18, fr=curve.computeFrenetFrames(N*4,false), rnd=seeded(seed);
  const ph=[rnd()*9,rnd()*9,rnd()*9], pos=[], idx=[], p=new THREE.Vector3();
  for(let i=0;i<=N;i++){
    const u=i/N, t=(a+(b-a)*u)/Lc; curve.getPointAt(t,p);
    const fi=Math.min(N*4,Math.round(t*N*4)), nm=fr.normals[fi], bn=fr.binormals[fi];
    const taper=0.32+0.68*Math.pow(Math.sin(Math.PI*u),0.45);
    for(let j=0;j<=R;j++){
      const th=j/R*Math.PI*2;
      const bump=1+0.20*Math.sin(th*3+ph[0]+u*5)*Math.sin(u*9+ph[1])+0.10*Math.sin(th*7+ph[2])*Math.cos(u*13);
      const rr=rIn+(rOut-rIn)*taper*bump;
      pos.push(p.x+(nm.x*Math.cos(th)+bn.x*Math.sin(th))*rr, p.y+(nm.y*Math.cos(th)+bn.y*Math.sin(th))*rr,
               p.z+(nm.z*Math.cos(th)+bn.z*Math.sin(th))*rr);
    }
  }
  for(let i=0;i<N;i++) for(let j=0;j<R;j++){ const q=i*(R+1)+j, w=q+R+1; idx.push(q,q+1,w, w,q+1,w+1); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx);
  return g;
}
function placeMass(k,r){
  const C=segmentCandidates(k); if(!C.length) return null;
  const dMax=C.reduce((m,c)=>Math.max(m,c.d),0);
  const want=Math.min(0.62*r, dMax*0.85);        // subcapsular, bulging the capsule
  let best=null, bs=Infinity; const e=0.04;
  for(const c of C){
    let sc=Math.abs(c.d-want)*4 + rng()*0.04;
    if(sc<1.2){                                   // prefer the surface facing the default (anterior) view
      const p0=c.p, gz=sdfLiver(p0.x,p0.y,p0.z+e)-sdfLiver(p0.x,p0.y,p0.z-e),
            gx=sdfLiver(p0.x+e,p0.y,p0.z)-sdfLiver(p0.x-e,p0.y,p0.z), gy=sdfLiver(p0.x,p0.y+e,p0.z)-sdfLiver(p0.x,p0.y-e,p0.z);
      sc+=0.35*(1-gz/Math.max(1e-6,Math.hypot(gx,gy,gz)));
    } else sc+=0.7;
    for(const h of lesions){ if(!h.r) continue; const dd=c.p.distanceTo(h.c), lim=(r+h.r)*1.02; if(dd<lim) sc+=6*(1-dd/lim)+2; }
    if(sc<bs){ bs=sc; best=c; }
  }
  return best.p.clone();
}
const cmU=cm=>cm/(UNIT_M*100);                   // centimetres → model units
function frontPoint(mesh){                        // vertex of a lesion facing the viewer, for its label
  tiers[0].group.updateMatrixWorld(true);
  const bs=mesh.geometry.boundingSphere||(mesh.geometry.computeBoundingSphere(),mesh.geometry.boundingSphere);
  const ctr=bs.center.clone().add(mesh.position);
  const view=camera.position.clone().applyMatrix4(tiers[0].group.matrixWorld.clone().invert()).sub(ctr).normalize();
  const P=mesh.geometry.attributes.position, v=new THREE.Vector3(), out=new THREE.Vector3(); let bd=-1e9;
  for(let i=0;i<P.count;i++){ v.fromBufferAttribute(P,i).add(mesh.position); const dd=v.clone().sub(ctr).dot(view); if(dd>bd){bd=dd; out.copy(v);} }
  return out;
}
function addLesion(kind,mesh,label,short,info){
  mesh.material.userData.baseOpacity=1; lesGroup.add(mesh);
  const a={l:label,_v:frontPoint(mesh)};
  const el=document.createElement('div'); el.className='pin'+(kind!=='hcc'?' '+kind:'');
  el.innerHTML=`<span class="dot"></span><span class="txt">${short}</span>`;
  el.addEventListener('click',()=>setSelection(0,a._v,a.l));
  anno.appendChild(el);
  const pin={el,a,v:a._v}; pins[0].push(pin);
  const L=Object.assign({kind,mesh,pin,label,short},info); lesions.push(L);
  occState=''; renderLesions(); setSelection(0,a._v,label,true);
}
const BLL_NAME={abs:'Abscess',cyst:'Cyst',hem:'Haemangioma',fnh:'FNH',hca:'Adenoma'};
function addBLL(){
  if(!tiers[0].built) return;
  const type=$('#bll-type').value, st=type==='bfl'?$('#bll-sub').value:type;
  const cm=THREE.MathUtils.clamp(parseFloat($('#bll-size').value)||0,0.5,20); $('#bll-size').value=cm;
  const k=+$('#bll-seg').value, r=cmU(cm/2), c=placeMass(k,r); if(!c) return;
  serial[st]=(serial[st]||0)+1; const id=serial[st], nm=BLL_NAME[st];
  const label=`${nm} ${id} · segment ${SEG[k]} · ${cm.toFixed(1)} cm`;
  const opt={vertexColors:true,roughness:LES_STYLE[st].rgh,clearcoat:st==='cyst'?1:0.3,clearcoatRoughness:st==='cyst'?0.05:0.5};
  if(st==='cyst') Object.assign(opt,{opacity:0.82,transmission:0.35,thickness:0.6});
  const mesh=tag(new THREE.Mesh(massGeometry(r,id*11+k+(st.length*5),st),mat(0xffffff,opt)),label);
  mesh.position.copy(c);
  if(st==='fnh'){ // central stellate scar
    const sg=new THREE.Group(); for(let i=0;i<6;i++){ const a=i/6*Math.PI*2, sp=tag(new THREE.Mesh(new THREE.CylinderGeometry(r*0.035,r*0.02,r*0.95,6),mat(0xF1ECE2,{roughness:0.8})),label);
      sp.position.set(Math.cos(a)*r*0.42,Math.sin(a)*r*0.42,r*0.55); sp.rotation.z=a-Math.PI/2; sg.add(sp); }
    const hub=tag(new THREE.Mesh(new THREE.SphereGeometry(r*0.14,12,10),mat(0xF1ECE2,{roughness:0.8})),label); hub.position.z=r*0.55; sg.add(hub); mesh.add(sg); }
  addLesion(type,mesh,label,`${nm} ${id}`,{id,k,cm,r,c,sub:`segment ${SEG[k]} · ${cm.toFixed(1)} cm`,st});
}
function addHCC(){
  const cm=THREE.MathUtils.clamp(parseFloat($('#hcc-size').value)||0,0.5,20); $('#hcc-size').value=cm;
  if(!tiers[0].built) return;
  const k=+$('#hcc-seg').value, r=cmU(cm/2), c=placeMass(k,r); if(!c) return;
  const id=++serial.hcc, label=`HCC ${id} · segment ${SEG[k]} · ${cm.toFixed(1)} cm`;
  const mesh=tag(new THREE.Mesh(massGeometry(r,id*7+k,'hcc'),
    mat(0xffffff,{vertexColors:true,roughness:LES_STYLE.hcc.rgh,clearcoat:0.25,clearcoatRoughness:0.5})),label);
  mesh.position.copy(c);
  addLesion('hcc',mesh,label,`HCC ${id}`,{id,k,cm,r,c,sub:`segment ${SEG[k]} · ${cm.toFixed(1)} cm`});
}
function addCCA(){
  const type=$('#cca-type').value, U=tiers[0].inner.userData.ducts;
  const cm=THREE.MathUtils.clamp(parseFloat($('#cca-size').value)||0,0.5,15); $('#cca-size').value=cm;
  const id=++serial.cca, mt=()=>mat(0xffffff,{vertexColors:true,roughness:LES_STYLE.cca.rgh,clearcoat:0.15,clearcoatRoughness:0.6});
  if(type==='i'){
    const k=+$('#cca-seg').value, r=cmU(cm/2), c=placeMass(k,r); if(!c) return;
    const label=`CCA ${id} · intrahepatic · segment ${SEG[k]} · ${cm.toFixed(1)} cm`;
    const mesh=tag(new THREE.Mesh(massGeometry(r,id*13+k,'cca'),mt()),label); mesh.position.copy(c);
    addLesion('cca',mesh,label,`CCA ${id}`,{id,k,cm,r,c,sub:`intrahepatic · segment ${SEG[k]} · ${cm.toFixed(1)} cm`});
    return;
  }
  const Lu=cmU(cm), thick=cmU(Math.min(0.9,0.35+0.08*cm)), parts=[];
  const sl=(d,a0,b0)=>{ if(d) parts.push(sleeveGeometry(d.pts,a0,b0,d.r*0.8,d.r+thick,id*31+parts.length)); };
  let label, sub;
  if(type==='p'){
    const bis=$('#cca-bis').value, rootBlob=()=>{ const g=massGeometry(thick*1.15+U.chd.r,id*17,'cca'); g.translate(U.root.x,U.root.y,U.root.z); parts.push(g); };
    if(bis==='I'){ sl(U.chd,cmU(0.5),cmU(0.5)+Lu); var bil={main:[cmU(0.5),cmU(0.5)+Lu],label:'CHD (perihilar CCA, Bismuth I)'}; }
    else {
      rootBlob();
      const hd = bis==='II'?[0.4,0.4]:bis==='IIIa'?[1,0.25]:bis==='IIIb'?[0.25,1]:[1,1];
      sl(U.chd,0,Lu*0.5); sl(U.rhd,0,Math.max(cmU(0.4),Lu*hd[0])); sl(U.lhd,0,Math.max(cmU(0.4),Lu*hd[1]));
      var bil={hilar:true,label:'hilar confluence (Bismuth '+bis+')'};
    }
    label=`CCA ${id} · perihilar · Bismuth–Corlette ${bis} · ${cm.toFixed(1)} cm`; sub=`perihilar · Bismuth ${bis} · ${cm.toFixed(1)} cm`;
  } else {
    const Lcbd=new THREE.CatmullRomCurve3(U.cbd.pts).getLength(), mid=Lcbd*0.72;
    sl(U.cbd,mid-Lu/2,mid+Lu/2);
    var bil={main:[(BIL.mCys||0)+mid-Lu/2,(BIL.mCys||0)+mid+Lu/2],label:'distal CBD (cholangiocarcinoma)'};
    label=`CCA ${id} · distal extrahepatic · ${cm.toFixed(1)} cm`; sub=`distal · ${cm.toFixed(1)} cm`;
  }
  const geo=BGU.mergeGeometries(parts.map(g=>{ const q=g.index?g.toNonIndexed():g;
    for(const k of Object.keys(q.attributes)) if(k!=='position') q.deleteAttribute(k); return q; }),false);
  parts.forEach(g=>g.dispose());
  const geoF=BGU.mergeVertices(geo,1e-4); geo.dispose();
  geoF.computeVertexNormals(); paintVerts(geoF,LES_STYLE.cca,seeded(id*5),12);
  const mesh=tag(new THREE.Mesh(geoF,mt()),label);
  addLesion('cca',mesh,label,`CCA ${id}`,{id,cm,r:0,c:U.root.clone(),sub,type,bil});
  if(state.path.bil.stent!=='none') bilStentBuild(tiers[0].inner.userData.P);
  pathChanged();
}
/* pancreatic ductal adenocarcinoma: head (encasing the intrapancreatic CBD and main pancreatic duct) or tail */
function addPC(){
  if(!tiers[0].built||!CT_ORGANS||!CT_ORGANS.pancreas) return;
  const P=tiers[0].inner.userData.P, K=P.K; if(!BIL.ready) bilPrepare(P);
  const site=$('#pc-site').value, cm=THREE.MathUtils.clamp(parseFloat($('#pc-size').value)||0,0.5,12); $('#pc-size').value=cm;
  const r=cmU(cm/2), id=++serial.pc;
  let c, bil=null, pd=null;
  const pdm=K.bilMeshes.find(b=>b.kind==='pd').m, mo=pdm.userData.mo, n=mo.ctr.length/3, q=new THREE.Vector3();
  if(site==='head'){
    const cb=new THREE.CatmullRomCurve3(K.ducts.cbd.pts).getPointAt(0.80);
    let pdP=null, bd=1e9; for(let v=0;v<n;v+=4){ const d=Math.abs(mo.bt[v*2]-0.86); if(d<bd){ bd=d; pdP=q.fromArray(mo.ctr,v*3).clone(); } }
    c=cb.clone().lerp(pdP,0.40);
    const m=BIL.mAt(c.x,c.y,c.z), m0=Math.max(BIL.mCys+0.05,m-0.75*r), m1=Math.min(BIL.ML-0.035,m+0.75*r);
    bil={main:[m0,m1],label:'intrapancreatic CBD (pancreatic head cancer)'};
    // main pancreatic duct: the u range the tumour covers
    let u0=1, u1=0; for(let v=0;v<n;v+=2){ if(q.fromArray(mo.ctr,v*3).distanceTo(c)<r*0.95){ const u=mo.bt[v*2]; u0=Math.min(u0,u); u1=Math.max(u1,u); } }
    if(u1>u0) pd={u0,u1};
  } else {
    const A=CT_ORGANS.pancreas.geometry.attributes.position, vs=[];
    for(let i=0;i<A.count;i++) vs.push(new THREE.Vector3().fromBufferAttribute(A,i));
    vs.sort((a,b)=>b.x-a.x); const k=Math.max(20,Math.round(vs.length*0.08)); c=new THREE.Vector3();
    for(let i=0;i<k;i++) c.add(vs[i]); c.multiplyScalar(1/k); c.x-=0.25*r;
  }
  const label=`PDAC ${id} · ${site} · ${cm.toFixed(1)} cm`;
  const mesh=tag(new THREE.Mesh(massGeometry(r,id*19+(site==='head'?3:7),'pc'),
    mat(0xffffff,{vertexColors:true,roughness:LES_STYLE.pc.rgh,clearcoat:0.15,clearcoatRoughness:0.6})),label);
  mesh.position.copy(c);
  addLesion('pc',mesh,label,`PDAC ${id}`,{id,cm,r,c,sub:`${site} · ${cm.toFixed(1)} cm`,site,bil,pd,malig:true});
  if(state.path.bil.stent!=='none') bilStentBuild(P);
  if(state.path.pds!=='none') pdStentBuild(P);
  pathChanged({inside:'The tumour lies within the pancreas'+(site==='head'?', inside the duodenal loop.':'.'),layer:site==='head'?'pancreas,duodenum':'pancreas'});
}
function removeLesion(L){
  const i=lesions.indexOf(L); if(i<0) return;
  lesGroup.remove(L.mesh); L.mesh.geometry.dispose(); L.mesh.material.dispose();
  L.pin.el.remove(); pins[0].splice(pins[0].indexOf(L.pin),1); lesions.splice(i,1);
  if(selection&&selection.label===L.label) clearSelection();
  renderLesions();
  if(L.bil){ if(state.path.bil.stent!=='none') bilStentBuild(tiers[0].inner.userData.P); pathChanged(); }
}
function renderLesions(){
  for(const [lid,kinds] of [['hcc',['hcc']],['cca',['cca']],['pc',['pc']],['bll',['abs','cyst','bfl']]]){
    const ul=$('#'+lid+'-list'); ul.innerHTML='';
    lesions.filter(L=>kinds.includes(L.kind)).forEach(L=>{
      const li=document.createElement('li'); li.className=lid;
      li.innerHTML=`<i></i><span>${L.short} <small>${L.sub}</small></span><button title="Remove" aria-label="Remove ${L.short}">×</button>`;
      li.addEventListener('click',()=>setSelection(0,L.pin.a._v,L.label));
      li.querySelector('button').addEventListener('click',e=>{e.stopPropagation(); removeLesion(L);});
      ul.appendChild(li);
    });
  }
  const H=lesions.filter(L=>L.kind==='hcc'), n=H.length, cr=$('#hcc-crit');
  $('#tace-go').disabled=!n; $('#resect-go').disabled=!n;
  if(!n){ cr.innerHTML=''; return; }
  const mx=Math.max(...H.map(h=>h.cm)), all3=H.every(h=>h.cm<=3);
  const milan=(n===1&&mx<=5)||(n<=3&&all3);
  const uk=(n===1&&mx<=5)||(n<=5&&all3), ukCond=!uk&&n===1&&mx>5&&mx<=7;
  cr.innerHTML=`<span>Lesions · largest</span><b>${n} · ${mx.toFixed(1)} cm</b>`+
    `<span>Milan criteria</span><b data-s="${milan?'':'crit'}">${milan?'within':'outside'}</b>`+
    `<span>UK (NHSBT) criteria</span><b data-s="${uk?'':(ukCond?'warn':'crit')}">${uk?'within':(ukCond?'if stable ≥6 months':'outside')}</b>`;
}
function ccaForm(){
  const t=$('#cca-type').value;
  $('#cca-seg-wrap').hidden=t!=='i'; $('#cca-bis-wrap').hidden=t!=='p';
  $('#cca-sizelab').textContent=t==='i'?'Size':'Length';
}
$('#cca-type').addEventListener('change',ccaForm); ccaForm();
document.querySelectorAll('.pnote').forEach(n=>{ n.innerHTML=n.innerHTML.replace('a ~20 cm transverse liver',`this liver’s ${LIVER_CM.toFixed(1)} cm transverse extent`); });
document.querySelector('.brand span').innerHTML='Macroscopic &rarr; subcellular &middot; CT anatomy';
$('#hcc-go').addEventListener('click',addHCC);
$('#hcc-size').addEventListener('keydown',e=>{ if(e.key==='Enter') addHCC(); });
$('#cca-go').addEventListener('click',addCCA);
$('#pc-go').addEventListener('click',addPC);
$('#bll-go').addEventListener('click',addBLL);
$('#bll-type').addEventListener('change',()=>{ $('#bll-sub-wrap').hidden=$('#bll-type').value!=='bfl'; });
$('#pc-size').addEventListener('keydown',e=>{ if(e.key==='Enter') addPC(); });
$('#cca-size').addEventListener('keydown',e=>{ if(e.key==='Enter') addCCA(); });
/* ════════════ pathology panel wiring ════════════ */
const ZON_NOTE={none:'Painted across the lobule, acinus and sinusoid by acinar zone.',
  apap:'Paracetamol: CYP2E1-rich zone 3 makes NAPQI; once glutathione is exhausted, centrilobular necrosis follows. Acetylcysteine restores glutathione (UK: treat above the 100 mg/L at 4 h line).',
  ischaemic:'Ischaemic (hypoxic) hepatitis: zone 3, with the lowest pO₂, necroses after shock or low cardiac output; transaminases exceed 1000 IU/L within 24–48 h, then fall quickly.',
  congestive:'Congestive hepatopathy (right heart failure, Budd–Chiari, SOS): zone 3 sinusoids dilate and fill with red cells, plates atrophy — grossly the nutmeg liver.',
  iron:'Hereditary haemochromatosis: iron loads periportal (zone 1) hepatocytes first, pericanalicular, with a zone 1 → 3 gradient; the liver turns rust-brown.',
  aih:'Autoimmune hepatitis: a lymphoplasmacytic infiltrate breaches the limiting plate from the portal tract — interface hepatitis.',
  yf:'Yellow fever: midzonal (zone 2) necrosis with Councilman bodies, sparing periportal and pericentral cells.'};
let toastT=0;
let toastLay='parenchyma';
function toast(msg,lay){
  lay=lay||'parenchyma'; const ks=lay.split(',');
  if(!ks.some(k=>state.layers[k]==='solid'||state.layers[k]==='on')) return;
  toastLay=lay; $('#toast-go').textContent=lay==='parenchyma'?'Ghost parenchyma':'Ghost '+ks.join(' and ');
  { const t=$('#toast'); if(selection&&selection.dock&&selEl.style.display==='block'){ const b=selEl.querySelector('.box').getBoundingClientRect(); t.style.bottom=(innerHeight-b.top+10)+'px'; } else t.style.bottom=''; }
  $('#toast-t').textContent=msg; $('#toast').hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{$('#toast').hidden=true;},7000);
}
$('#toast-go').addEventListener('click',()=>{ toastLay.split(',').forEach(k=>{ state.layers[k]='ghost'; }); applyModes(); if(layerTier===0) refreshLayerChrome(); $('#toast').hidden=true; });
$('#toast-x').addEventListener('click',()=>{ $('#toast').hidden=true; });
function refreshPathUI(){
  const S=state.path, val={bcc:S.bil.cc||'none',panc:S.panc?S.panc.type:'none',pvt:S.pvt,bcs:S.bcs,bilc:S.bil.cause,bils:S.bil.stent,masld:String(S.masld),zonal:S.zonal,pds:S.pds,ercpT:ERCP_T||'trawl'};
  document.querySelectorAll('.segctl').forEach(sc=>sc.querySelectorAll('button').forEach(b=>b.dataset.on=(b.dataset.v===val[sc.dataset.key])?'1':'0'));
  $('#pvt-smv').checked=S.pvtSMV; $('#pvt-smv').disabled=S.pvt==='none'; $('#pvt-smv').parentElement.classList.toggle('dis',S.pvt==='none');
  $('#mash').checked=S.mash;
  { const pn=S.panc||{type:'none',svt:false}; $('#panc-svt').checked=pn.svt; $('#panc-svt').disabled=pn.type==='none'; $('#panc-svt').parentElement.classList.toggle('dis',pn.type==='none');
    $('#panc-read').innerHTML = pn.type==='none' ? '' :
      (pn.type==='acute' ? `<span>Gland</span><b data-s="warn">oedematous, inflamed</b><span>Collections</span><b>peripancreatic fluid, fat stranding</b>`
                         : `<span>Gland</span><b data-s="warn">atrophic, calcified</b><span>Main duct</span><b data-s="warn">dilated, irregular</b><span>Collections</span><b>pseudocysts</b>`)+
      (pn.svt ? `<span>Splenic vein</span><b data-s="crit">thrombosed · sinistral portal hypertension</b><button id="svt-view" type="button">View thrombus</button>` : ''); }
  $('#tips-btn').textContent=S.tips?'Remove TIPSS':'Insert TIPSS'; $('#tips-btn').dataset.on=S.tips?'1':'0';
  $('#zon-note').textContent=ZON_NOTE[S.zonal]||ZON_NOTE.none;
  const P=tiers[0].built?tiers[0].inner.userData.P:null, O=HEMO.open;
  const svtOn=!!(S.panc&&S.panc.svt&&S.panc.type!=='none');
  const openList=[['eso','oesophageal/GOV1'],['fun','fundal'],['pu','paraumbilical'],['sr','splenorenal'],['cav','cavernoma']].filter(([k])=>(O[k]||0)>0.3||(k==='fun'&&svtOn)).map(q=>q[1]==='fundal'&&svtOn&&(O.fun||0)<=0.3?'isolated gastric (sinistral)':q[1]);
  $('#ph-read').innerHTML=`<span>Gradient</span><b data-s="${HEMO.ppg>=12?'crit':HEMO.ppg>=10?'warn':''}">${Math.round(HEMO.ppg)} mmHg${S.tips?` <em>(was ${Math.round(HEMO.ppgNat)})</em>`:''}</b>`+
    `<span>HVPG</span><b>${HEMO.hvpgOK?Math.round(HEMO.hvpg)+' mmHg':'not measurable'}</b>`+
    `<span>Collaterals</span><b>${openList.length?openList.join(', '):'none'}</b>`+
    `<span>Spleen</span><b>${HEMO.ppg>=14||svtOn?'enlarged':HEMO.ppg>=10?'mildly enlarged':'normal'}</b>`;
  if(BIL.ready&&BIL.O){ const O2=BIL.O, dil=O2.dilR&&O2.dilL?(O2.mainBlocked?'intra- and extrahepatic':'both lobes, intrahepatic'):O2.dilR?'right intrahepatic':O2.dilL?'left intrahepatic':O2.psc?'beaded (strictures and saccules)':'none';
    const bilH=`<span>Level</span><b>${O2.label}</b><span>Dilatation</span><b data-s="${dil==='none'||dil.startsWith('beaded')?'':'warn'}">${dil}</b>`+
      `<span>Gallbladder</span><b>${O2.gbDist?'distended (Courvoisier)':O2.gbStones?'stones, not distended':'normal'}</b>`+
      (O2.cc?`<span>Choledochal cyst</span><b data-s="warn">Todani ${O2.cc}${O2.cc==='V'?' (Caroli)':''}</b>`:'')+
      (O2.pd?`<span>Pancreatic duct</span><b data-s="${S.pds==='none'?'warn':''}">${S.pds==='none'?'dilated (double duct sign)':'stented ('+(S.pds==='plastic'?'plastic':'metal')+'), decompressed'}</b>`
            :(S.pds!=='none'?`<span>Pancreatic duct</span><b>stented (${S.pds==='plastic'?'plastic':'metal'})</b>`:''))+
      (S.bil.stent!=='none'?`<span>Drainage</span><b>${S.bil.stent==='ptc'?'PTC internal–external · '+(O2.hilar.R&&O2.hilar.L?'right lobe only (~60%)':'whole tree'):S.bil.stent==='bilateral'?'both lobes':O2.hilar.R?'right lobe only (~60%)':'common duct'}</b>`:'');
    document.querySelectorAll('.bilro').forEach(e=>{ e.innerHTML=bilH; }); }
}
function pathChanged(opts={}){
  pathTargets(); refreshPathUI(); applySim();
  if(opts.inside) toast(opts.inside,opts.layer);
}
document.querySelectorAll('.segctl').forEach(sc=>sc.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return; const v=b.dataset.v, S=state.path, k=sc.dataset.key;
  if(k==='pvt'){ S.pvt=v; if(v==='none') S.pvtSMV=false; pathChanged({inside:v!=='none'?'The thrombus lies inside the portal vein behind the liver edge.':null}); }
  if(k==='bcs'){ S.bcs=v; pathChanged({inside:v!=='none'?'Hepatic vein thrombi and the spider-web collaterals are inside the liver.':null}); }
  if(k==='pds'){ S.pds=v; if(tiers[0].built) pdStentBuild(tiers[0].inner.userData.P); pathChanged(); }
  if(k==='ercpT'){ ERCP_T=v; refreshPathUI(); }
  if(k==='panc'){ S.panc.type=v; if(v==='none') S.panc.svt=false; pathChanged({inside:v!=='none'?'The pancreas lies behind the stomach.':null,layer:'stomach'}); }
  if(k==='bcc'){ S.bil.cc=v; pathChanged({inside:v==='V'||v==='IVa'?'The intrahepatic cysts lie within the liver.':null}); todaniCard(v); }
  if(k==='bilc'){ S.bil.cause=v; S.bil.cleared=false; if(tiers[0].built) bilStentBuild(tiers[0].inner.userData.P); pathChanged({inside:v==='psc'?'The beaded intrahepatic ducts are inside the liver.':null}); }
  if(k==='bils'){ S.bil.stent=v; if(tiers[0].built) bilStentBuild(tiers[0].inner.userData.P); pathChanged({inside:v==='ptc'?'The drain crosses the liver from the right flank to reach the ducts.':null}); }
  if(k==='masld'){ S.masld=+v; pathChanged(); }
  if(k==='zonal'){ S.zonal=v; pathChanged(); }
}));
document.addEventListener('click',e=>{ if(e.target&&e.target.id==='svt-view') svtView(true); });
/* v40: camera preset for splenic vein thrombosis: from in front, below and to the left, with the liver and stomach ghosted
   (the pancreas is already translucent while the thrombus is shown) */
function svtView(){
  if(!tiers[0].built) return;
  for(const k of ['parenchyma','stomach']) if(state.layers[k]==='solid'||state.layers[k]==='on') state.layers[k]='ghost';
  applyModes(); if(layerTier===0) refreshLayerChrome();
  const inn=tiers[0].inner; inn.updateMatrixWorld(true);
  const t=inn.localToWorld(V3(1.12,-0.36,-0.22)), d=V3(0.30,-0.28,1).transformDirection(inn.matrixWorld);
  controls.target.copy(t); camera.position.copy(t).addScaledVector(d,3.6); controls.update();
}
$('#panc-svt').addEventListener('change',e=>{ state.path.panc.svt=e.target.checked; pathChanged({inside:e.target.checked?'The thrombus lies in the splenic vein behind the pancreas.':null,layer:'pancreas,stomach'}); });
$('#pvt-smv').addEventListener('change',e=>{ state.path.pvtSMV=e.target.checked; pathChanged(); });
$('#mash').addEventListener('change',e=>{ state.path.mash=e.target.checked; pathChanged(); });
$('#path-collapse').addEventListener('click',()=>{ document.querySelectorAll('#path-block details.sub').forEach(d=>{ d.open=false; }); });
$('#hvpg-btn').addEventListener('click',()=>{ HVPG.on?hvpgStop():hvpgStart(); });
$('#hvpg-x').addEventListener('click',hvpgStop);
$('#hvpg-next').addEventListener('click',()=>hvpgGo(1));
$('#hvpg-prev').addEventListener('click',()=>hvpgGo(-1));
$('#hvpg-replay').addEventListener('click',()=>{ hvpgStop(); hvpgStart(); });
$('#path-clear').addEventListener('click',()=>{ hvpgStop(); bxStop(); });
$('#path-clear').addEventListener('click',()=>{
  lesions.slice().forEach(removeLesion);
  Object.assign(state.path,{pvt:'none',pvtSMV:false,bcs:'none',tips:false,hepatofugal:false,masld:0,mash:false,zonal:'none',bil:{cause:'none',stent:'none',cc:'none'},pds:'none',panc:{type:'none',svt:false}});
  state.fibrosis=0; $('#sl-fib').value=0;
  if(tiers[0].built){ bilStentBuild(tiers[0].inner.userData.P); pdStentBuild(tiers[0].inner.userData.P); }
  pathChanged(); clearSelection();
});
$('#tips-btn').addEventListener('click',()=>{ state.path.tips=!state.path.tips; pathChanged({inside:state.path.tips?'TIPSS: from the right internal jugular vein the sheath enters the right hepatic vein, a needle crosses the parenchyma into the right portal vein, and the stent is released over the wire.':null}); });

/* labels for pathology features: shown only while the feature is present */
function featurePins(){
  const u=tiers[0].inner.userData, P=u.P, K=P.K, O=()=>P.cols;
  const list=[
    ['Oesophageal varices',P.esoCols[0][14],()=>O().eso.open>0.35],
    ['Gastric fundal varices',P.sgv[1][30],()=>O().fun.open>0.35],
    ['Splenorenal shunt',P.srPts[34],()=>O().sr.open>0.35],
    ['Recanalised paraumbilical vein',P.puPts[58],()=>O().pu.open>0.35],
    ['Caput medusae',P.caput[1][26],()=>O().caput.open>0.35],
    ['Azygos vein',P.AZY[2],()=>O().azy.open>0.35],
    ['Portal cavernoma',P.cavPts[2][22],()=>O().cav.open>0.35],
    ['Portal vein thrombus (acute, occlusive)',P.trunkC.getPointAt(0.45),()=>pathCur.pvt.acute>0.6],
    ['Portal vein thrombus (partial, non-occlusive)',P.trunkC.getPointAt(0.40),()=>pathCur.pvt.partial>0.6],
    ['Chronic portal vein occlusion (fibrotic cord)',P.trunkC.getPointAt(0.40),()=>pathCur.pvt.chronic>0.6],
    ['SMV thrombus',P.smvC.getPointAt(0.55),()=>pathCur.pvt.smv>0.6],
    ['TIPSS stent',P.tips.curve.getPointAt(0.55),()=>pathCur.tips>0.8],
    ['Hepatic vein thrombosis',new THREE.CatmullRomCurve3(K.rhv).getPointAt(0.25),()=>pathCur.hv>0.6],
    ['IVC web',P.bcs.webP,()=>pathCur.web>0.6],
    ['Caudate lobe hypertrophy',new THREE.Vector3(SEGP.cx,SEGP.cy-0.05,SEGP.cz-0.18),()=>P.m.caud>0.6],
    ['Intrahepatic venovenous collaterals',P.cols.web.meshes[0]?new THREE.Vector3().fromArray(P.cols.web.meshes[0].userData.mo.ctr,300):null,()=>O().web.open>0.6],
    ['Common bile duct stone',P.bil.cbdStones.children[0].position,()=>(P.bil.cbdStones.userData.f||0)>0.6],
    ['Gallstones',P.bil.gbStones.children[2].position,()=>(P.bil.gbStones.userData.f||0)>0.6],
    ['Impacted stone (Mirizzi syndrome)',P.bil.mirizzi.position,()=>(P.bil.mirizzi.userData.f||0)>0.6],
  ];
  for(const [l,v,cond] of list){ if(!v) continue;
    const a={l,_v:v.clone(),cond};
    const el=document.createElement('div'); el.className='pin';
    el.innerHTML=`<span class="dot"></span><span class="txt">${l.replace(/ \(.*\)$/,'')}</span>`;
    el.addEventListener('click',()=>setSelection(0,a._v,a.l));
    anno.appendChild(el); pins[0].push({el,a,v:a._v}); }
}
featurePins();


let selection=null;
/* labels that belong to pathology (lesions, stents, thrombi, collaterals, procedures): their text docks above the slider */
function isPathLabel(label){
  if(/^Choledochal cyst/.test(label)) return true;
  if(typeof lesions!=='undefined'&&lesions.some(L=>L.label===label)) return true;
  const s=new Set(), add=o=>{ if(o&&o.traverse) o.traverse(c=>{ if(c.userData&&c.userData.pick) s.add(c.userData.pick); }); };
  if(typeof lesGroup!=='undefined') add(lesGroup);
  const P=tiers[0].built?tiers[0].inner.userData.P:null;
  if(P){ add(P.bil.stentGroup); add(P.bil.gbStones); add(P.bil.cbdStones); add(P.bil.mirizzi); if(P.bil.extras) Object.values(P.bil.extras).forEach(add);
    add(P.tips.group); for(const k in P.thr) add(P.thr[k]); add(P.bcs.hv); add(P.bcs.web);
    for(const k in P.cols){ (P.cols[k].meshes||[]).forEach(add); (P.cols[k].extra||[]).forEach(add); }
    if(P.panc) ['halo','calc','pcy','svt'].forEach(k=>add(P.panc[k])); if(P.pds) add(P.pds.g); }
  if(typeof BX!=='undefined'&&BX.O) add(BX.O.g);
  if(typeof HVPG!=='undefined'&&HVPG.grp) add(HVPG.grp);
  return s.has(label);
}
function setSelection(ti,local,label,dock=false){
  selection={tier:ti,local:local.clone(),label,dock};
  selEl.classList.toggle('dock',!!dock);
  const d=$('#detail');
  d.hidden=true;   // the callout carries the text; no panel block
  if(!dock&&isPathLabel(label)){ dock=true; selection.dock=true; selEl.classList.add('dock'); }
  d.innerHTML=`<b>${label}</b>${info(label)}`;
  selEl.querySelector('b').textContent=label;
  const txt=info(label);
  selEl.querySelector('span').textContent=txt; selEl.classList.toggle('long',txt.length>260);
  selEl.style.display='block';
  document.querySelectorAll('#p-struct .chip').forEach(c=>c.dataset.sel=(c.textContent===label)?'1':'0');
  pins[ti].forEach(p=>p.el.dataset.sel=(p.a.l===label)?'1':'0');
  if(document.body.classList.contains('mob')) mobCard(label,txt);
}
function clearSelection(){
  selection=null; selEl.style.display='none'; $('#detail').hidden=true; { const c=document.getElementById('mcard'); if(c) c.hidden=true; }
  document.querySelectorAll('#p-struct .chip').forEach(c=>c.dataset.sel='0');
  pins.forEach(ps=>ps.forEach(p=>p.el.dataset.sel='0'));
}

let shownTier=-1;
function paintPanel(i){
  if(i===shownTier) return;
  shownTier=i; const t=tiers[i];
  $('#p-eyebrow').textContent=`Scale 0${i+1} · ${t.mag}`;
  $('#p-title').textContent=t.title;
  $('#p-sub').textContent=t.sub;
  $('#p-lede').textContent=t.lede;
  const ks=$('#p-keys'); ks.innerHTML='';
  t.keys.forEach(([n,h,b])=>{
    const li=document.createElement('li');
    li.innerHTML=`<i>${n}</i><span><b>${h}</b> — ${b}</span>`; ks.appendChild(li);
  });
  const st=$('#p-struct'); st.innerHTML='';
  t.annos.forEach(a=>{
    const c=document.createElement('button'); c.className='chip'; c.textContent=a.l;
    c.addEventListener('click',()=>setSelection(i, a._v || new THREE.Vector3(...a.p), a.l));
    st.appendChild(c);
  });
  renderLayerButtons(i);
  $('#seg-block').hidden = !(i===0 && state.layers.segments);
  document.querySelectorAll('#path-block .sub').forEach(d=>{ d.hidden=!(d.dataset.tiers||'0').split(',').includes(String(i)); });
  clearSelection();
  coachFor(i);
}
const legend=$('#seg-legend');
SEG.forEach((s,i)=>{
  const dv=document.createElement('div');
  dv.innerHTML=`<i style="background:#${SEG_COL[i].toString(16).padStart(6,'0')}"></i>${s}`;
  dv.style.cursor='pointer';
  dv.addEventListener('click',()=>setSelection(0,SEG_CENTROID[i],'Segment '+s));
  legend.appendChild(dv);
});

const togglePanel=()=>{ if(document.body.classList.contains('mob')){ if(performance.now()-MOB.justDragged<400) return; mobSheet(MOB.state==='peek'?'half':'peek'); return; }
  $('#app').classList.toggle('pclosed',$('#panel').classList.toggle('closed')); resize(); };
$('#btn-panel').addEventListener('click',togglePanel);
$('#grip').addEventListener('click',togglePanel);
$('#btn-reset').addEventListener('click',()=>{camera.position.copy(HOME); controls.target.set(0,-0.45,0); if(document.body.classList.contains('mob')) mobCam();});
$('#btn-lab').addEventListener('click',e=>{
  const on=anno.classList.toggle('nolabels'); e.currentTarget.setAttribute('aria-pressed',String(!on));});
/* ---- layer switches: one list per scale ---- */
const layerBox=$('#layers'); let layerEls={}, layerTier=-1;
function layerValue(i,k){ return i===0 ? state.layers[k] : (state.tl[i][k]!==false); }
function applyTierLayers(i){
  if(i===0||!tiers[i]||!tiers[i].built) return;
  const LG=tiers[i].inner.userData.LG||{};
  for(const k in LG) LG[k].visible = state.tl[i][k]!==false;
}
function refreshLayerChrome(){
  if(layerTier===0) for(const G of LAYER_GROUPS){ const el=layerEls[G.k]; if(!el) continue; const v=groupValue(G);
    el.dataset.on=v==='off'?'0':'1'; el.dataset.mixed=v==='mixed'?'1':'0'; el.querySelector('b').textContent=v;
    el.querySelector('i').style.background = v==='off'?'var(--rule)':v==='ghost'?'var(--amber-dim)':'var(--amber)'; }
  (LAYER_SETS[layerTier]||[]).forEach(Ld=>{
    const el=layerEls[Ld.k]; if(!el) return;
    const v=layerValue(layerTier,Ld.k), on=Ld.cycle? v!=='off' : !!v;
    el.dataset.on=on?'1':'0';
    el.querySelector('b').textContent = Ld.cycle ? v : (on?'on':'off');
    if(!Ld.swatch) el.querySelector('i').style.background = on?'var(--amber)':'var(--rule)';
    else el.querySelector('i').style.opacity = on?1:0.3;
  });
}
function renderLayerButtons(i){
  layerTier=i; layerBox.innerHTML=''; layerEls={};
  layerBox.classList.toggle('grouped',i===0);
  if(i===0){
    const mk=(Ld,head)=>{ const b=document.createElement('button'); b.className='lay'+(head?' lhead':''); b.dataset.k=Ld.k;
      b.innerHTML=`<i${Ld.swatch?` style="background:#${Ld.swatch.toString(16).padStart(6,'0')}"`:''}></i><em>${Ld.label}</em><b></b>`;
      layerEls[Ld.k]=b; return b; };
    for(const G of LAYER_GROUPS){
      const row=document.createElement('div'); row.className='lgrp'+(G.solo?' solo':'');
      const h=mk(G,true); row.appendChild(h); const kids=document.createElement('div'); kids.className='kids'; row.appendChild(kids);
      if(!G.solo){ const cx=document.createElement('s'); cx.className='cx'; cx.textContent='▸'; h.appendChild(cx);   // phones: expand a group
        cx.addEventListener('click',e=>{ e.stopPropagation(); row.classList.toggle('x'); cx.textContent=row.classList.contains('x')?'▾':'▸'; }); }
      h.addEventListener('click',()=>{ const v=groupValue(G); setGroup(G,v==='mixed'?'on':CYC3[(CYC3.indexOf(v)+1)%3]); applyModes(); refreshLayerChrome(); });
      if(!G.solo) for(const k of G.members){ const Ld=LAYERS.find(L=>L.k===k), b=mk(Ld,false); kids.appendChild(b);
        b.addEventListener('click',()=>{
          if(Ld.cycle){ const c=Ld.cycle, j=c.indexOf(state.layers[k]); state.layers[k]=c[(j+1)%c.length]; }
          else state.layers[k]=!state.layers[k];
          applyModes(); refreshLayerChrome(); }); }
      layerBox.appendChild(row);
    }
    refreshLayerChrome(); return;
  }
  (LAYER_SETS[i]||[]).forEach(Ld=>{
    const b=document.createElement('button');
    b.className='lay'; b.dataset.k=Ld.k;
    b.innerHTML=`<i${Ld.swatch?` style="background:#${Ld.swatch.toString(16).padStart(6,'0')}"`:''}></i>`+
                `<em>${Ld.label}</em><b></b>`;
    b.addEventListener('click',()=>{
      if(i===0){
        if(Ld.cycle){ const c=Ld.cycle, j=c.indexOf(state.layers[Ld.k]); state.layers[Ld.k]=c[(j+1)%c.length];
          if(Ld.k==='allvisc') ORGAN_KEYS.forEach(k=>{ state.layers[k]=state.layers.allvisc; }); }
        else state.layers[Ld.k]=!state.layers[Ld.k];
        applyModes();
      } else { state.tl[i][Ld.k]=!(state.tl[i][Ld.k]!==false); applyTierLayers(i); }
      refreshLayerChrome();
    });
    layerBox.appendChild(b); layerEls[Ld.k]=b;
  });
  refreshLayerChrome();
}

function applyModes(){
  const Ls=state.layers;
  if(layerTier===0) refreshLayerChrome();
  $('#seg-block').hidden = !(shownTier===0 && Ls.segments);
  if(!tiers[0].built) return;

  const u=tiers[0].inner.userData, L=u.L;
  L.portal.visible=Ls.portal!=='off'; L.artery.visible=Ls.artery!=='off';
  { // ghosted portal tree: walls go glassy (set per frame in pathTick) and the flow particles grow
    const pg=Ls.portal==='ghost';
    u.flowScale = pg ? 1.7 : 1;
    u.P.pflow.mesh.material.opacity = pg ? 1 : 0.9;
  }
  L.hepaticVein.visible=Ls.hepaticVein!=='off'; L.biliary.visible=Ls.biliary!=='off';
  // ghosted systems and organs fade to a faint shell (see setFade) and yield clicks to what lies behind them
  for(const k of ['artery','hepaticVein','biliary']) L[k].userData.ghostK = Ls[k]==='ghost' ? (k==='biliary'?0.22:0.36) : 1;
  if(CT_ORGANS) for(const k of ORGAN_KEYS){ const o=CT_ORGANS[k]; if(!o) continue; o.visible=Ls[k]!=='off'; o.userData.ghostK = Ls[k]==='ghost' ? 0.3 : 1; }
  { const v=Ls.ribcage||'off'; if(v!=='off'&&!CTX.loading) ctxLoad();
    if(CTX.group){ CTX.group.visible=v!=='off'; CTX.group.userData.ghostK = v==='ghost' ? 0.3 : 1; } }
  { const v=Ls.diaphragm||'off'; if(v!=='off'&&!DIA.loading) diaLoad();
    if(DIA.group){ DIA.group.visible=v!=='off'; DIA.group.userData.ghostK = v==='ghost' ? 0.3 : 1; } }
  L.ligaments.visible=false; L.viscera.visible=true;
  if(u.ligState!==Ls.ligaments){ u.ligState=Ls.ligaments; u.forceCirr=true; applyCirrhosis(u,state.fibrosis); }
  L.parenchyma.visible = Ls.parenchyma!=='off';
  u.segMarks.visible = Ls.segments;

  u.body.material = Ls.segments ? u.segMat : u.plainMat;
  { const ca=u.MG.parenchyma.attributes.color; ca.array.set(Ls.segments?u.MG.segCol:u.fibCol); ca.needsUpdate=true; }
  const ghost = Ls.parenchyma==='ghost';
  const m=u.body.material;
  m.userData.baseOpacity = ghost ? 0.24 : 1;
  m.transmission = ghost ? 0.55 : 0;
  m.roughness = ghost ? 0.22 : (Ls.segments?0.64:0.34);
  m.depthWrite = !ghost;
  m.needsUpdate = true;
  u.body.userData.ghost = ghost; occState='';
  u.cap.material.userData.baseOpacity = ghost ? 0.05 : 0.10;
  if(u.MG.falcG) u.MG.falcG.traverse(o=>{ if(o.isMesh){ o.material.userData.baseOpacity = (ghost ? 0.18 : 1)*(o.userData.op??1); o.material.depthWrite=!ghost&&!o.userData.op; } });
  if(u.surfVeins) u.surfVeins.material.userData.baseOpacity = (ghost ? 0.25 : 0.85)*(u.surfVeins.userData.cirrFade??1);
}

$('#sl-fib').addEventListener('input',e=>{state.fibrosis=+e.target.value; applySim();});
$('#tg-flow').addEventListener('click',e=>{
  state.flow=!state.flow; e.currentTarget.setAttribute('aria-pressed',String(state.flow));
  e.currentTarget.querySelector('.led').style.background=state.flow?'var(--amber)':'var(--rule)';});

renderer.domElement.addEventListener('wheel',e=>{
  e.preventDefault();
  if(e.deltaY>0) setMacroFocus(e.clientX,e.clientY);
  const k=state.zTarget<1?0.6:1;               // finer steps through the long macroscopic zoom
  state.zTarget=THREE.MathUtils.clamp(
    state.zTarget+k*e.deltaY*(e.deltaMode===1?0.03:0.0011),0,tiers.length-1);
},{passive:false});
let pinchStart=null;
renderer.domElement.addEventListener('touchstart',e=>{
  if(e.touches.length===2){pinchStart={d:touchDist(e),z:state.zTarget};
    setMacroFocus((e.touches[0].clientX+e.touches[1].clientX)/2,(e.touches[0].clientY+e.touches[1].clientY)/2);}},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&pinchStart)
    state.zTarget=THREE.MathUtils.clamp(pinchStart.z+Math.log2(touchDist(e)/pinchStart.d)*1.4,
      0,tiers.length-1);},{passive:true});
renderer.domElement.addEventListener('touchend',()=>{pinchStart=null;},{passive:true});
function touchDist(e){const a=e.touches[0],b=e.touches[1];
  return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);}
addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='+'){centreFocus(); state.zTarget=Math.min(tiers.length-1,state.zTarget+1);}
  if(e.key==='ArrowUp'||e.key==='-'){state.zTarget=Math.max(0,state.zTarget-1);}
  if(e.key==='Escape') clearSelection();
});

/* picking */
const ray=new THREE.Raycaster(), pointer=new THREE.Vector2();
let down=null,lastMove={x:0,y:0},frameNo=0;
function dominant(){let best=tiers[0]; tiers.forEach(t=>{if(t.w>best.w) best=t;}); return best;}
function hitInfo(ev){
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((ev.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((ev.clientY-rect.top)/rect.height)*2+1;
  ray.setFromCamera(pointer,camera);
  const t=dominant();
  if(!t.built||t.w<0.35) return null;
  const hits=ray.intersectObjects(t.group.children,true);
  let fallback=null;
  for(const h of hits){
    const o=h.object;
    if(o.userData.noPick) continue;
    { let n=o, hidden=false; while(n&&n!==t.group){ if(!n.visible){hidden=true;break;} n=n.parent; } if(hidden) continue; }
    if(o.material && o.material.opacity<0.04) continue;
    { let gk=1; for(let n=o;n&&n!==t.group;n=n.parent){ if(n.userData.keepInGhost){ gk=1; break; } gk*=n.userData.ghostK??1; }
      if(gk<1){ if(!fallback){ let n=o; while(n&&!n.userData.pick&&!n.userData.pickFace) n=n.parent;
        const lb=n?(n.userData.pickFace&&h.faceIndex!=null?n.userData.pickFace(h.faceIndex):n.userData.pick):null;
        if(lb) fallback={tier:t.index,local:t.group.worldToLocal(h.point.clone()),label:lb}; } continue; } }
    let label=null;
    if(o.userData.segmentPick){
      const q=t.group.worldToLocal(h.point.clone());
      label='Segment '+SEG[segAt(q.x,q.y,q.z)];
      // the model's falciform ridge runs along the umbilical fissure line
      if(Math.abs(q.x-falcX(q.z))<0.030 && falcZone(q.x,q.y,q.z) && (!h.face || (h.face.normal.y>-0.30 && h.face.normal.z>0.22 && h.face.normal.y<0.92)))   // v44: anterior course only
        label='Falciform ligament';
      // ghosted parenchyma must not shadow the vessels behind it
      if(o.userData.ghost){
        if(!fallback) fallback={tier:t.index,local:q,label};
        continue;
      }
    }
    else if(o.userData.pickBy && h.instanceId!=null) label=o.userData.pickBy(h.instanceId);
    else if(o.userData.pickAt) label=o.userData.pickAt(t.group.worldToLocal(h.point.clone()));
    else if(o.userData.pickFace && h.faceIndex!=null) label=o.userData.pickFace(h.faceIndex);
    if(!label){ let node=o; while(node){ if(node.userData.pick){label=node.userData.pick; break;} node=node.parent; } }
    if(label) return {tier:t.index,local:t.group.worldToLocal(h.point.clone()),label};
  }
  return fallback;
}
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!down) return;
  const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y), quick=performance.now()-down.t<600;
  down=null;
  if(moved>6||!quick) return;
  const hit=hitInfo(e);
  if(hit) setSelection(hit.tier,hit.local,hit.label); else clearSelection();
});
renderer.domElement.addEventListener('pointermove',e=>{lastMove={x:e.clientX,y:e.clientY,ev:e};});
renderer.domElement.addEventListener('pointerleave',()=>{hoverEl.style.display='none';});


/* simulation couplings */
function applySim(){
  const f=state.fibrosis;
  $('#v-fib').textContent = f<0.12?'F0 · normal' : f<0.34?'F1 · portal fibrosis' :
    f<0.58?'F2 · septa forming' : f<0.82?'F3 · bridging fibrosis' : 'F4 · cirrhosis';

  if(tiers[3] && tiers[3].built){
    const u=tiers[3].inner.userData;
    const step=Math.round(f*16)/16;
    if(u.fenStep!==step){
      u.fenStep=step;
      const old=u.endoMat.alphaMap;
      u.endoMat.alphaMap=fenestraTexture(step);
      if(old) old.dispose();
      u.endoMat.needsUpdate=true;
    }
    u.bmMat.userData.baseOpacity=0.85*THREE.MathUtils.smoothstep(f,0.18,0.75);
    u.setFib(f); tiers[3].snapped=false;
    u.soma.scale.set(1-0.35*f,1-0.35*f,1+0.9*f);
    u.stel.children.forEach(c=>{if(c.userData.droplet) c.scale.setScalar(Math.max(0.08,1-1.05*f));});
    u.soma.material.color.setHex(f>0.45?0xA8825E:C.stellate);
    u.procs.scale.set(1+0.9*f,1,1+0.5*f);
  }
  if(tiers[2] && tiers[2].built){
    tiers[2].inner.userData.setFib(f);
    tiers[2].inner.userData.septa.children.forEach((c,k)=>{
      c.material.userData.baseOpacity=THREE.MathUtils.clamp((f-0.34-k*0.10)*2.0,0,0.92);
    });
  }
  if(tiers[1] && tiers[1].built){
    tiers[1].inner.userData.septa.children.forEach((c,k)=>{
      c.material.userData.baseOpacity=THREE.MathUtils.clamp((f-0.28-(k%3)*0.10)*1.8,0,0.9);
    });
  }
  if(tiers[0].built){
    const u=tiers[0].inner.userData;
    applyCirrhosis(u,f);
    if(u.surfVeins) u.surfVeins.material.userData.baseOpacity =
      (state.layers.parenchyma==='ghost'?0.25:0.85)*(u.surfVeins.userData.cirrFade??1);
  }

  computeHemo(); if(tiers[0].built) pathTargets();
  if(typeof refreshPathUI==='function' && BIL.ready) refreshPathUI();
  const hvpg=Math.round(HEMO.hvpg);
  $('#r-hvpg').textContent=HEMO.hvpgOK?hvpg+' mmHg':'n/m (HV occluded)';
  $('#r-hvpg').dataset.s=!HEMO.hvpgOK?'warn':hvpg>=12?'crit':(hvpg>=6?'warn':'');
  clinUpdate();
}

/* labels hidden behind solid parenchyma (porta, caudate, intrahepatic branches) */
const occRay=new THREE.Raycaster(), occLast=new THREE.Vector3(1e9,0,0);
let occState='';
function updateOcclusion(){
  if(!tiers[0].built) return;
  const key=state.layers.parenchyma+'|'+tiers[0].w.toFixed(2)+'|'+mz.s.toFixed(3)+'|'+mz.pos.x.toFixed(3)+mz.pos.y.toFixed(3);
  if(camera.position.distanceTo(occLast)<0.004 && key===occState) return;
  occLast.copy(camera.position); occState=key;
  const body=tiers[0].inner.userData.body;
  const solid=state.layers.parenchyma==='solid';
  const wp=new THREE.Vector3(), dir=new THREE.Vector3();
  pins[0].forEach(p=>{
    if(!solid){ p.occluded=false; return; }
    wp.copy(p.v).applyMatrix4(tiers[0].group.matrixWorld);
    dir.copy(wp).sub(camera.position); const dist=dir.length(); dir.normalize();
    occRay.set(camera.position,dir); occRay.far=Math.max(0,dist-0.08); occRay.firstHitOnly=true;
    p.occluded = occRay.intersectObject(body,false).length>0;
  });
}

/* ════════════ pathology engine: haemodynamics, targets and per-frame animation ════════════ */
const HEMO={sin:3,ppg:3,ppgNat:3,hvpgOK:true,inflow:1,flow:'hepatopetal',open:{},varices:'none'};
function computeHemo(){
  const f=state.fibrosis, S=state.path, sm=THREE.MathUtils.smoothstep;
  const sin=3+16*Math.pow(f,1.35);
  const pre={none:0,partial:2,acute:7,chronic:11}[S.pvt]+(S.pvtSMV&&S.pvt!=='none'?1:0);
  const post={none:0,hv:12,ivc:10,mixed:14}[S.bcs];
  const nat=sin+pre+post, ppg=S.tips?Math.min(nat,6+0.12*nat):nat;
  HEMO.sin=sin; HEMO.hvpg=S.tips?Math.min(sin,6+0.12*sin):sin; HEMO.ppgNat=nat; HEMO.ppg=ppg; HEMO.hvpgOK=!(S.bcs==='hv'||S.bcs==='mixed');
  const o=th=>sm(ppg,th,th+7), acute=S.pvt==='acute';
  const ivcObs=S.bcs==='ivc'||S.bcs==='mixed', hvObs=S.bcs==='hv'||S.bcs==='mixed';
  // collaterals need time to form: acute occlusion raises pressure but has not yet opened them
  const tk=acute?0.25:1;
  HEMO.open={eso:o(10)*tk, fun:o(12)*tk, sr:o(14)*tk, pu:o(12)*tk, caput:o(14)*tk,
    cav:S.pvt==='chronic'?1:0, web:hvObs?1:(ivcObs?0.45:0), caud:S.bcs!=='none'?1:0};
  HEMO.open.azy=Math.max(HEMO.open.eso,ivcObs?1:0); HEMO.open.lrv=HEMO.open.sr;
  HEMO.hf=S.hepatofugal && nat>=12 && !S.tips && S.pvt!=='acute' && S.pvt!=='chronic';
  let inflow=1-0.40*sm(f,0.3,1);
  if(S.pvt==='partial') inflow*=0.75; if(acute) inflow*=0.2; if(S.pvt==='chronic') inflow*=0.65;
  if(S.bcs!=='none') inflow*=0.5; if(S.tips) inflow*=0.45;
  HEMO.flow = HEMO.hf?'hepatofugal' : acute?'occluded (acute PVT)' : S.pvt==='chronic'?'via cavernoma'
    : S.tips?'diverted via TIPSS' : S.pvt==='partial'?'reduced (partial PVT)' : S.bcs!=='none'?'reduced (outflow block)'
    : f>0.6?'reduced':'hepatopetal';
  if(HEMO.hf) inflow=-0.3;
  HEMO.inflow=inflow;
  const e=HEMO.open.eso;
  HEMO.varices = e<0.05?'none' : ppg<12?'small' : 'large · bleed risk ↑';
}

/* ——— biliary obstruction model ——— */
const BIL={ready:false};
function bilPrepare(P){
  const K=P.K, main=K.ducts.chd.pts.concat(K.ducts.cbd.pts.slice(1));   // the same landmarks as the duct meshes
  const mc=new THREE.CatmullRomCurve3(main), S=400, samp=[], q=new THREE.Vector3();
  const ML=mc.getLength(); for(let i=0;i<=S;i++){ mc.getPointAt(i/S,q); samp.push(q.clone()); }
  const mAt=(x,y,z)=>{ let b=0,bd=1e9; for(let i=0;i<=S;i+=2){ const p=samp[i], d=(p.x-x)**2+(p.y-y)**2+(p.z-z)**2; if(d<bd){bd=d;b=i;} } return b/S*ML; };
  BIL.ML=ML; BIL.mCys=mAt(K.cysJ.x,K.cysJ.y,K.cysJ.z); BIL.mConf=mAt(K.conf.x,K.conf.y,K.conf.z); BIL.mAt=mAt;
  BIL.cbdL=new THREE.CatmullRomCurve3(K.ducts.cbd.pts).getLength();
  BIL.items=K.bilMeshes.map(it=>{
    const mo=it.m.userData.mo, n=mo.P0.length/3, C=mo.ctr, B=mo.bt;
    const info={it,n,kind:new Uint8Array(n),m:new Float32Array(n),side:new Uint8Array(n),u:new Float32Array(n),seg:new Float32Array(n),
      K:new Float32Array(n).fill(1),Kt:new Float32Array(n).fill(1)};
    // kinds: 0 intrahepatic, 1 main duct, 2 gallbladder, 3 cystic, 4 pancreatic
    for(let v=0;v<n;v++){
      const x=C[v*3],y=C[v*3+1],z=C[v*3+2]; info.u[v]=B[v*2]; info.seg[v]=B[v*2+1];
      if(it.kind==='tree'){
        const nm=it.segs[B[v*2+1]]?.name;
        if(nm==='Common hepatic duct'||nm==='Common bile duct'){ info.kind[v]=1; info.m[v]=mAt(x,y,z); }
        else { info.kind[v]=0; const s=segAt(x,y,z); info.side[v]=(s>=5)?1:0;
          if(nm==='Right hepatic duct') info.side[v]=1; if(nm==='Left hepatic duct') info.side[v]=0; }
      } else if(it.kind==='main'){ info.kind[v]=1; info.m[v]=mAt(x,y,z); }
      else info.kind[v]={gb:2,cystic:3,pd:4}[it.kind];
    }
    return info;
  });
  BIL.ready=true;
}
function bilModel(){
  const S=state.path.bil, O={cc:S.cc&&S.cc!=='none'?S.cc:null,mains:[],hilar:{R:false,L:false},psc:S.cause==='psc',malig:false,stones:false,gbStones:false,label:'none',pd:null};
  if(S.cause==='stricture'){ const m=BIL.mCys+0.42*BIL.cbdL; O.mains.push({m0:m-0.07,m1:m+0.07,str:true}); O.label='mid CBD (benign stricture)'; }
  if(S.cause==='cbd'&&S.cleared){ O.gbStones=true; O.label='CBD cleared at ERCP (gallstones remain)'; }
  else if(S.cause==='cbd'){ const m=BIL.mCys+0.86*BIL.cbdL; O.mains.push({m0:m-0.035,m1:m+0.035,stone:true}); O.stones=true; O.gbStones=true; O.label='distal CBD (stone)'; }
  if(S.cause==='mirizzi'){ const mp=tiers[0].inner.userData.P.bil.mirizzi.position, m=BIL.mAt(mp.x,mp.y,mp.z+0.04); O.mains.push({m0:m-0.05,m1:m+0.05,ext:true}); O.gbStones=true; O.label='common hepatic duct (Mirizzi)'; }
  for(const L of (typeof lesions!=='undefined'?lesions:[])){
    if(L.pd) O.pd=O.pd?{u0:Math.min(O.pd.u0,L.pd.u0),u1:Math.max(O.pd.u1,L.pd.u1)}:{...L.pd};
    if(!L.bil) continue;
    if(L.bil.main){ O.mains.push({m0:L.bil.main[0],m1:L.bil.main[1],malig:true}); O.malig=true; O.label=L.bil.label; }
    if(L.bil.hilar){ O.hilar.R=true; O.hilar.L=true; O.malig=true; O.label=L.bil.label; }
  }
  if(O.psc && O.label==='none') O.label='multifocal (PSC)';
  // stents drain what they cross
  const st=S.stent; O.drain={main:st!=='none',R:st!=='none',L:st==='bilateral'};
  const mMax=O.mains.reduce((a,b)=>Math.max(a,b.m1),-1), mMin=O.mains.reduce((a,b)=>Math.min(a,b.m0),9);
  O.mMax=mMax; O.mMin=mMin;
  O.mainBlocked=O.mains.length>0 && !O.drain.main;
  O.dilR=O.mainBlocked || (O.hilar.R && !O.drain.R);
  O.dilL=O.mainBlocked || (O.hilar.L && !O.drain.L);
  O.gbDist=O.mainBlocked && O.malig && O.mains.some(q=>q.m0>BIL.mCys) && !O.gbStones;
  O.active=O.mains.length>0||O.hilar.R||O.psc||st!=='none'||O.gbStones||!!O.pd||!!O.cc;
  return O;
}
function bilTargets(){
  if(!BIL.ready) return;
  const O=bilModel(); BIL.O=O;
  const sm=THREE.MathUtils.smoothstep;
  for(const I of BIL.items){
    for(let v=0;v<I.n;v++){
      let k=1; const kind=I.kind[v];
      if(kind===0){ const dil=I.side[v]?O.dilR:O.dilL; if(dil) k=2.25; }
      else if(kind===1){ const m=I.m[v];
        if(O.mainBlocked){ const up=1-sm(m,O.mMax-0.08,O.mMax+0.01); k=1+1.15*up; }
        for(const q of O.mains){ if(m>q.m0 && m<q.m1){ k = q.stone?1.55 : q.ext?0.55 : q.str?0.42 : 0.5; } }
        if(O.hilar.R && m<0.10 && !O.drain.main) k=Math.min(k,0.6); }
      else if(kind===2){ if(O.gbDist) k=1.32; else if(O.gbStones) k=0.94; }
      else if(kind===4 && O.pd && state.path.pds==='none'){ const u=I.u[v];   // obstructed main pancreatic duct: dilated upstream (towards the tail)
        k = u>=O.pd.u0&&u<=O.pd.u1 ? 0.55 : u<O.pd.u0 ? 1+1.3*(1-sm(u,O.pd.u0-0.10,O.pd.u0)) : 1; }
      if(kind===4 && state.path.panc && state.path.panc.type==='chronic' && state.path.pds==='none'){   // chronic pancreatitis: dilated, irregular main duct ('chain of lakes')
        const s=Math.sin(I.u[v]*Math.PI*13+0.7); k=Math.max(k, s>-0.55 ? 1.8+0.6*s : 0.9); }
      if(O.cc && kind<=1){                      // choledochal cysts (Todani), independent of any obstruction
        const cc=O.cc, m=kind===1?I.m[v]:-1, e0=BIL.mCys-0.10, e1=BIL.ML-0.06;
        if(kind===1 && (cc==='I'||cc==='IVa')){ const w=sm(m,e0-0.10,e0+0.04)*(1-sm(m,e1-0.02,e1+0.05)); k*=1+1.9*w; }
        if(kind===1 && cc==='III'){ const w=sm(m,BIL.ML-0.12,BIL.ML-0.03); k*=1+1.4*w; }
        if(kind===0 && cc==='IVa'){ // cystic dilatation of the larger (central) intrahepatic ducts, in continuity with the extrahepatic cyst
          const mo=I.it.m.userData.mo, r0=Math.hypot(mo.P0[v*3]-mo.ctr[v*3],mo.P0[v*3+1]-mo.ctr[v*3+1],mo.P0[v*3+2]-mo.ctr[v*3+2]);
          const cen=sm(r0,0.008,0.016), s=Math.sin(I.u[v]*Math.PI*2.4+I.seg[v]*1.9);
          k*=1+cen*(s>0.1 ? 0.6+2.2*(s-0.1)/0.9 : 0.6); }
        if(kind===1 && cc==='IVb'){ const x=(m-e0)/(e1-e0); if(x>0&&x<1){ const s=Math.sin(x*Math.PI*7); k*= s>0 ? 1+1.7*s : 1; } }
        if(kind===0 && cc==='V'){ const s=Math.sin(I.u[v]*Math.PI*3.2+I.seg[v]*2.3); k*= s>0.35 ? 1+1.8*(s-0.35)/0.65 : 1.05; }
      }
      if(O.psc && kind<=1){                     // beading: short strictures with saccular segments between
        const t = kind===1 ? I.m[v]/BIL.ML*7 : I.u[v]*2.2+I.seg[v]*0.37;
        const s=Math.sin(t*Math.PI*2+I.seg[v]*1.7);
        k*= s<-0.72 ? 0.45 : 1.05+0.45*Math.max(0,s);
      }
      I.Kt[v]=k;
    }
    I.dirty=true;
  }
  // devices: hold the duct open around each stent or drain
  const Pp=tiers[0].inner.userData.P, lines=((state.path.bil.stent!=='none'&&Pp.bil.lines)||[]).concat(Pp.pds&&Pp.pds.line?[Pp.pds.line]:[]);
  if(lines.length){
    const cell=0.03, grid=new Map(), key=(x,y,z)=>`${Math.floor(x/cell)},${Math.floor(y/cell)},${Math.floor(z/cell)}`;
    for(const Lr of lines){ const c=Lr.c, n=Math.ceil(c.getLength()/0.006), u0=Lr.u0||0;
      for(let i=0;i<=n;i++){ const p=c.getPointAt(u0+(1-u0)*i/n), k=key(p.x,p.y,p.z); if(!grid.has(k)) grid.set(k,[]); grid.get(k).push([p,Lr.r]); } }
    const q=new THREE.Vector3(), p0=new THREE.Vector3();
    for(const I of BIL.items){ if(I.it.kind!=='tree'&&I.it.kind!=='pd') continue;
      const mo=I.it.m.userData.mo;
      if(!I.r0){ I.r0=new Float32Array(I.n); for(let v=0;v<I.n;v++) I.r0[v]=p0.fromArray(mo.P0,v*3).distanceTo(q.fromArray(mo.ctr,v*3)); }
      for(let v=0;v<I.n;v++){ if(I.kind[v]>1&&I.kind[v]!==4) continue; q.fromArray(mo.ctr,v*3);
        const gx=Math.floor(q.x/cell), gy=Math.floor(q.y/cell), gz=Math.floor(q.z/cell); let rr=0;
        for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++) for(let c=-1;c<=1;c++){ const L=grid.get(`${gx+a},${gy+b},${gz+c}`); if(!L) continue;
          for(const [p,r] of L) if(p.distanceToSquared(q)<0.00025) rr=Math.max(rr,r); }
        if(rr>0&&I.r0[v]>1e-4) I.Kt[v]=Math.max(I.Kt[v],(rr+0.010)/I.r0[v]); }
      I.dirty=true; }
  }
}
/* main pancreatic duct stent: from the duodenal lumen through the papilla up the duct beyond the stricture */
function pdStentBuild(P){
  if(!P.pds){ P.pds={g:new THREE.Group(),m:null,d:0,line:null}; P.pds.g.userData.keepInGhost=true; tiers[0].inner.userData.L.biliary.add(P.pds.g); }
  const G=P.pds.g; while(G.children.length){ const c=G.children.pop(); c.geometry.dispose(); } P.pds.m=null; P.pds.d=0; P.pds.line=null;
  const st=state.path.pds; if(st==='none') return;
  const K=P.K, c0=new THREE.CatmullRomCurve3(K.MPD), O=BIL.ready?bilModel():{}, uTop=O.pd?Math.max(0.05,O.pd.u0-0.10):0.80;
  const pts=[K.amp0.clone().add(V3(-0.05,-0.03,-0.09))]; for(let i=0;i<=24;i++) pts.push(c0.getPointAt(1-(1-uTop)*i/24));
  const c=new THREE.CatmullRomCurve3(pts);
  const m = st==='plastic'
    ? metaMesh(sweep(c,0,1,(u,th)=>0.014*(1+0.45*Math.exp(-((u-0.05)**2)/0.0006)*Math.max(0,Math.cos(th))),90,10),mat(0x3E9A5C,{roughness:0.35,clearcoat:0.8}),'Plastic pancreatic stent')
    : metaMesh(wireStent(c,0,1,0.036,0.07,8,0.0030),new THREE.MeshPhysicalMaterial({color:0xD0D6DC,metalness:0.92,roughness:0.26,clearcoat:0.6,transparent:true,opacity:1}),'Metal pancreatic stent (fully covered)');
  G.add(m); P.pds.m=m; deployMeta(m,0,st==='plastic'?0:0.15); P.pds.line={c,r:st==='plastic'?0.014:0.036};
}
/* benign stricture sleeve and the choledochal cyst meshes that are not duct dilatation (type II diverticulum, type III
   choledochocele bulging into the duodenum) — built once, shown by the pathology state */
function bilExtras(P){
  if(P.bil.extras) return P.bil.extras;
  const K=P.K, U=K.ducts, L=tiers[0].inner.userData.L, c=new THREE.CatmullRomCurve3(U.cbd.pts), Lc=c.getLength(), mid=0.42*Lc;
  const strict=tag(new THREE.Mesh(sleeveGeometry(U.cbd.pts,mid-0.07,mid+0.07,U.cbd.r*0.40,U.cbd.r*0.95,11),
    mat(0xE6E0D2,{roughness:0.7,clearcoat:0.2})),'Benign CBD stricture');
  strict.geometry.computeVertexNormals();
  const p2=c.getPointAt(0.30), t2=c.getTangentAt(0.30), side=new THREE.Vector3(-1,0,0.3).addScaledVector(t2,-new THREE.Vector3(-1,0,0.3).dot(t2)).normalize();
  const cc2=tag(new THREE.Mesh(new THREE.SphereGeometry(0.095,28,20),mat(C.bile,{roughness:0.32,clearcoat:0.7,emissive:new THREE.Color(C.bile).multiplyScalar(0.16)})),'Choledochal cyst');
  cc2.position.copy(p2).addScaledVector(side,0.105);
  const neck=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.030,0.030,0.10,14),cc2.material),'Choledochal cyst');
  neck.position.copy(p2).addScaledVector(side,0.05); neck.quaternion.setFromUnitVectors(V3(0,1,0),side); const g2=new THREE.Group(); g2.add(cc2,neck);
  const duoIn=K.amp0.clone().add(V3(-0.05,-0.03,-0.09)).sub(K.amp0).normalize();
  const cc3=tag(new THREE.Mesh(new THREE.SphereGeometry(0.075,24,18),cc2.material),'Choledochal cyst'); cc3.position.copy(K.amp0).addScaledVector(duoIn,0.045);
  for(const o of [strict,g2,cc3]){ o.visible=false; L.biliary.add(o); }
  return P.bil.extras={strict,cc2:g2,cc3};
}
/* Todani explanation: shown in the docked box above the cirrhosis slider */
function todaniCard(v){
  if(v==='none'){ if(selection&&/^Choledochal cyst · Todani/.test(selection.label)) clearSelection(); return; }
  if(!tiers[0].built) return;
  const K=tiers[0].inner.userData.P.K, c=new THREE.CatmullRomCurve3(K.ducts.cbd.pts);
  const at = v==='III' ? K.amp0.clone() : v==='V' ? K.BD_ROOT.clone() : c.getPointAt(0.35);
  setSelection(0,at,'Choledochal cyst · Todani '+v,true);
}
function bilStentBuild(P){
  const G=P.bil.stentGroup; while(G.children.length){ const c=G.children.pop(); c.geometry.dispose(); }
  P.bil.lines=[];
  const st=state.path.bil.stent; P.bil.stents=[]; P.bil.sd=0; if(st==='none') return;
  if(st==='ptc'){ ptcBuild(P,G); return; }
  const K=P.K, O=bilModel(), duo=K.amp0.clone().add(V3(-0.05,-0.03,-0.09));
  const up=[duo,K.amp0.clone()].concat(K.ducts.cbd.pts.slice(0,-1).reverse(),K.ducts.chd.pts.slice(0,-1).reverse());
  const into=side=>{ const d=K.ducts[side]; return d?d.pts.slice(1):[]; };
  const paths=[];
  if(st==='bilateral'){ paths.push(up.concat(into('rhd'))); paths.push(up.concat(into('lhd'))); }
  else if(O.hilar.R) paths.push(up.concat(into('rhd')));
  else { // stop 2 cm above the highest main obstruction, or in the CHD
    const c=new THREE.CatmullRomCurve3(up), Lc=c.getLength(), top=Math.min(Lc,(BIL.ML-(O.mains.length?O.mMin:BIL.mCys))+0.12+cmU(2));
    const pts=[]; for(let i=0;i<=30;i++) pts.push(c.getPointAt(Math.min(1,top/Lc)*i/30)); paths.push(pts); }
  const metal=new THREE.MeshPhysicalMaterial({color:0xD0D6DC,metalness:0.92,roughness:0.26,clearcoat:0.6,transparent:true,opacity:1});
  paths.forEach((pts,i)=>{
    if(i===1) pts=pts.map(p=>p.clone().add(V3(0.014,0,0.010)));
    const c=new THREE.CatmullRomCurve3(pts);
    let m;
    if(st==='plastic') m=metaMesh(sweep(c,0,1,(u,th)=>0.021*(1+0.35*Math.exp(-((u-0.06)**2)/0.0004)+0.35*Math.exp(-((u-0.94)**2)/0.0004)*Math.max(0,Math.cos(th))),80,12),
      mat(0x2F74D6,{roughness:0.35,clearcoat:0.8}),'Plastic biliary stent');
    else m=metaMesh(wireStent(c,0,1,0.050,0.09,8,0.0036),metal,'Metal biliary stent (SEMS)');
    G.add(m); P.bil.stents.push(m); deployMeta(m,0,st==='plastic'?0:0.15);
    P.bil.lines.push({c,r:st==='plastic'?0.021:0.050});
  });
}

/* percutaneous transhepatic internal–external drain: skin (right mid-axillary line) → capsule → a peripheral
   segment VI duct → right hepatic duct → CHD → CBD → across the papilla → pigtail coiled in the duodenum */
function ptcRoute(P){
  if(P.bil.ptc) return P.bil.ptc;
  const K=P.K, T=K.bilMeshes.find(b=>b.kind==='tree'); if(!T) return null;
  const segs=T.segs, key=q=>`${Math.round(q.x*100)},${Math.round(q.y*100)},${Math.round(q.z*100)}`;
  const byEnd=new Map(); segs.forEach(s=>byEnd.set(key(s.pts[s.pts.length-1]),s));
  const cands=[]; for(const s of segs){ if(s.name!=='Segmental bile duct'||s.r0<0.009) continue; const e=s.pts[s.pts.length-1];
    if(SEG[segAt(e.x,e.y,e.z)]==='VI') cands.push(s); }
  if(!cands.length) return null;
  cands.sort((a,b)=>a.pts[a.pts.length-1].x-b.pts[b.pts.length-1].x);
  const capOf=(E,d)=>{ const q=E.clone(); for(let i=0;i<120&&sdfLiver(q.x,q.y,q.z)<SURF;i++) q.addScaledVector(d,0.01); return q; };
  let tg=cands[0], dLatS=V3(-1,-0.22,0.12).normalize(), bestS=-1;   // v40: intercostal track
  search: for(const s of cands.slice(0,14)){ const E0=new THREE.CatmullRomCurve3(s.pts).getPointAt(0.55);
    for(const dy of [0,0.04,-0.04,0.08,-0.08,0.12,-0.12,0.16,-0.16]) for(const dz of [0,0.08,-0.08,0.16]){
      const d=V3(-1,-0.22+dy,0.12+dz).normalize(), q=capOf(E0,d), rc=ribClear(q,q.clone().addScaledVector(d,0.56));
      if(rc.d>bestS){ bestS=rc.d; tg=s; dLatS=d; } if(rc.d>=0.050) break search; } }
  const chain=[]; for(let s=tg,g=0;s&&g<24;g++){ chain.push(s); if(s.name==='Right hepatic duct') break; s=byEnd.get(key(s.pts[0])); }
  const E=new THREE.CatmullRomCurve3(tg.pts).getPointAt(0.55);
  const inner=[E]; chain.forEach(s=>{ for(let i=s.pts.length-2;i>=0;i--) inner.push(s.pts[i].clone()); });
  // needle track: lateral, a little caudal and anterior, from the duct to the capsule, then through the body wall
  const dLat=dLatS, X=E.clone();
  for(let i=0;i<120&&sdfLiver(X.x,X.y,X.z)<SURF;i++) X.addScaledVector(dLat,0.01);
  const S=X.clone().addScaledVector(dLat,0.30), Ex=S.clone().addScaledVector(dLat,0.26).add(V3(0,-0.10,0.04));
  // duodenal lumen beside the papilla
  let dC=K.amp0.clone().add(V3(-0.07,0.03,-0.09));
  if(CT_ORGANS&&CT_ORGANS.duodenum){ const A=CT_ORGANS.duodenum.geometry.attributes.position, q=new THREE.Vector3(), s=new THREE.Vector3(); let nn=0;
    for(let i=0;i<A.count;i++){ q.fromBufferAttribute(A,i); if(q.distanceTo(K.amp0)<0.35){ s.add(q); nn++; } } if(nn>50) dC=s.multiplyScalar(1/nn); }
  const dIn=dC.clone().sub(K.amp0).normalize(), p1=K.amp0.clone().addScaledVector(dIn,0.045);
  const nV=V3(0,-1,0).addScaledVector(dIn,dIn.y).normalize(), rL=0.085, c0=p1.clone().addScaledVector(nV,rL), loop=[];
  for(let i=1;i<=22;i++){ const th=i/22*Math.PI*2*0.92, rr=rL*(1-0.16*i/22);
    loop.push(c0.clone().addScaledVector(nV,-Math.cos(th)*rr).addScaledVector(dIn,Math.sin(th)*rr).addScaledVector(nV.clone().cross(dIn),0.012*i/22)); }
  const main=K.ducts.chd.pts.slice(1).concat(K.ducts.cbd.pts.slice(1));
  const pts=[Ex,Ex.clone().lerp(S,0.5),S,X.clone().lerp(E,0.5),...inner,...main,p1,...loop];
  // drop control points closer than 1.5 mm so the spline stays smooth
  const out=[pts[0]]; for(const p of pts.slice(1)) if(p.distanceTo(out[out.length-1])>0.02) out.push(p);
  { const c=new THREE.CatmullRomCurve3(out,false,'centripetal'), Ls=c.getLengths(600); let bi=0,bd=1e9;
    for(let i=0;i<=600;i++){ const dd=c.getPoint(i/600).distanceToSquared(E); if(dd<bd){ bd=dd; bi=i; } }
    var uE=Ls[bi]/Ls[600]; }
  return P.bil.ptc={pts:out,S,Ex,dLat,uE};
}
function ptcBuild(P,G){
  const R=ptcRoute(P); if(!R) return;
  const c=new THREE.CatmullRomCurve3(R.pts,false,'centripetal'), Lc=c.getLength();
  const m=metaMesh(sweep(c,0,1,(u,th)=>0.019,Math.max(160,Math.round(Lc/0.012)),12),
    mat(0xECE5D2,{roughness:0.36,clearcoat:0.75,clearcoatRoughness:0.3,emissive:new THREE.Color(0xECE5D2).multiplyScalar(0.10)}),'PTC drain (internal–external)');
  G.add(m); P.bil.stents.push(m); deployMeta(m,0,0); P.bil.lines.push({c,r:0.019,u0:R.uE});
  // external hub and the skin entry site
  const hub=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.030,0.036,0.10,16),mat(0x3A7BD5,{roughness:0.4,clearcoat:0.6})),'PTC drain (internal–external)');
  const tE=c.getTangentAt(0).negate(); hub.position.copy(R.Ex).addScaledVector(tE,0.05);
  hub.quaternion.setFromUnitVectors(V3(0,1,0),tE); G.add(hub);
  const skin=tag(new THREE.Mesh(new THREE.TorusGeometry(0.045,0.010,8,28),mat(0xD9A78C,{roughness:0.7})),'PTC drain (internal–external)');
  skin.position.copy(R.S); skin.quaternion.setFromUnitVectors(V3(0,0,1),R.dLat); G.add(skin);
  { // side holes: small dark ovals on the drain wall every ~5 mm, rotating round the circumference
    const L=c.getLength(), pos=[], ctr=[], bt=[], idx=[], p=new THREE.Vector3(), T=new THREE.Vector3(), N=new THREE.Vector3(), B=new THREE.Vector3();
    let k=0; for(let s=R.uE*L+0.03; s<L-0.01; s+=0.07, k++){
      const u=s/L; c.getPointAt(u,p); c.getTangentAt(u,T);
      N.set(0,1,0); if(Math.abs(N.dot(T))>0.9) N.set(1,0,0); N.addScaledVector(T,-N.dot(T)).normalize();
      N.applyAxisAngle(T,k*2.1); B.crossVectors(T,N);
      const o=pos.length/3, cen=p.clone().addScaledVector(N,0.0198);
      pos.push(cen.x,cen.y,cen.z); ctr.push(p.x,p.y,p.z); bt.push(u,0);
      for(let j=0;j<12;j++){ const a=j/12*Math.PI*2, q=cen.clone().addScaledVector(T,Math.cos(a)*0.0085).addScaledVector(B,Math.sin(a)*0.0055);
        pos.push(q.x,q.y,q.z); ctr.push(p.x,p.y,p.z); bt.push(u,0); idx.push(o,o+1+j,o+1+(j+1)%12); } }
    if(pos.length){ const hg=new THREE.BufferGeometry(); hg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      hg.setAttribute('ctr',new THREE.Float32BufferAttribute(ctr,3)); hg.setAttribute('bt',new THREE.Float32BufferAttribute(bt,2)); hg.setIndex(idx);
      const hm=metaMesh(hg,mat(0x2A1E16,{roughness:0.6,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),'PTC drain side hole');
      G.add(hm); P.bil.stents.push(hm); deployMeta(hm,0,0); } }
  hub.userData.ptcExtra=skin.userData.ptcExtra=true; hub.visible=skin.visible=false; P.bil.ptcExtras=[hub,skin];
}

/* ——— pancreatitis: the CT pancreas swells and reddens (acute) or shrinks towards its duct and pales (chronic); a halo of
   peripancreatic fluid, calcifications, pseudocysts and a splenic vein thrombus are shown as the state requires ——— */
function pancBuild(P){
  if(P.panc) return P.panc;
  const pm=CT_ORGANS&&CT_ORGANS.pancreas; if(!pm) return null;
  const g=pm.geometry, K=P.K, L=tiers[0].inner.userData.L, mpd=new THREE.CatmullRomCurve3(K.MPD), S=mpd.getSpacedPoints(120);
  const P0=g.attributes.position.array.slice(), N0=g.attributes.normal.array.slice(), n=P0.length/3, near=new Float32Array(n*3), q=new THREE.Vector3();
  for(let v=0;v<n;v++){ q.fromArray(P0,v*3); let bd=1e9,bi=0; for(let i=0;i<S.length;i++){ const d=S[i].distanceToSquared(q); if(d<bd){ bd=d; bi=i; } } S[bi].toArray(near,v*3); }
  const base=pm.material.color.clone(), baseE=pm.material.emissive.clone();
  // peripancreatic fluid / fat stranding: an enlarged translucent shell
  const halo=tag(new THREE.Mesh(g.clone(),mat(0xD9C07A,{roughness:0.6,opacity:0.34,depthWrite:false,side:THREE.BackSide})),'Peripancreatic inflammation (fluid, fat stranding)');
  { const hp=halo.geometry.attributes.position.array; for(let v=0;v<n;v++) for(let a=0;a<3;a++) hp[v*3+a]=P0[v*3+a]+N0[v*3+a]*0.075; halo.geometry.computeVertexNormals(); }
  // calcifications along the duct
  const calc=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.014,0),mat(0xF4F2EA,{roughness:0.5,emissive:new THREE.Color(0xF4F2EA).multiplyScalar(0.2)}),46);
  { const d=new THREE.Object3D(); for(let i=0;i<46;i++){ const p=mpd.getPointAt(0.06+0.9*rng()); d.position.copy(p).add(V3((rng()-0.5)*0.09,(rng()-0.5)*0.07,(rng()-0.5)*0.09)); d.scale.setScalar(0.6+rng()*1.2); d.updateMatrix(); calc.setMatrixAt(i,d.matrix); } }
  calc.userData.pick='Pancreatic calcification';
  // pseudocysts: round, thick-walled fluid collections in the lesser sac against the body and tail
  const pcy=new THREE.Group();
  for(const [u,r,dir] of [[0.52,0.17,V3(0.05,0.45,1).normalize()],[0.28,0.11,V3(0.10,0.30,1).normalize()]]){
    const m=tag(new THREE.Mesh(new THREE.SphereGeometry(r,32,24),mat(0xC9B690,{roughness:0.25,clearcoat:0.8,opacity:0.88,transmission:0.25,thickness:0.5})),'Pancreatic pseudocyst');
    const a=mpd.getPointAt(u), q=new THREE.Vector3(); let best=null, bs=-1e9;
    for(let v=0;v<n;v++){ if(Math.hypot(near[v*3]-a.x,near[v*3+1]-a.y,near[v*3+2]-a.z)>0.10) continue;
      for(let k=0;k<3;k++) q.setComponent(k,P0[v*3+k]+(near[v*3+k]-P0[v*3+k])*0.38);      // the fully atrophic surface
      const d=q.clone().sub(a).dot(dir); if(d>bs){ bs=d; best=q.clone(); } }
    m.position.copy(best||a).addScaledVector(dir,r*0.70); m.scale.set(1,0.85,1); pcy.add(m); }
  // splenic vein thrombus
  const spc=new THREE.CatmullRomCurve3(SPLV_PTS(K.SPL0,K.CONF)), sp=[]; for(let i=0;i<=24;i++) sp.push(spc.getPointAt(0.08+0.72*i/24));
  const svt=metaMesh(metaTube(sp,t=>0.066*(1+0.07*Math.sin(t*41)+0.04*Math.sin(t*97)),120,16,true,0),mat(0x8A1024,{roughness:0.5,clearcoat:0.5,clearcoatRoughness:0.3,emissive:new THREE.Color(0x7A0E20)}),'Splenic vein thrombosis');
  svt.userData.keepInGhost=true;
  for(const o of [halo,calc,pcy]){ o.visible=false; L.viscera.add(o); }
  svt.visible=false; L.portal.add(svt); deployMeta(svt,0,0);
  return P.panc={g,P0,N0,near,base,baseE,halo,calc,pcy,svt,a:0,c:0,s:0,key:''};
}
function pancTick(P,dt){
  const S=state.path.panc; if(!S) return;
  if(S.type==='none'&&!P.panc) return;
  const Q=pancBuild(P); if(!Q) return;
  const now=performance.now()/1000, dw=Math.min(1.5,Math.max(0,now-(Q.tw||now))); Q.tw=now;   // v41: time-driven
  const k=Q.force?1:1-Math.exp(-dw*2.4); Q.force=false;
  Q.a+=((S.type==='acute'?1:0)-Q.a)*k; Q.c+=((S.type==='chronic'?1:0)-Q.c)*k; Q.s+=((S.svt&&S.type!=='none'?1:0)-Q.s)*k;
  { const o=CT_ORGANS&&CT_ORGANS.pancreas; if(o&&state.layers.pancreas==='on'){ const gk=(S.svt&&S.type!=='none')?0.16:1; if(o.userData.ghostK!==gk) o.userData.ghostK=gk; } }   // v40: show the splenic vein thrombus through the gland (set from the state, not the ramp, which stalls when the loop idles)
  const key=Q.a.toFixed(3)+'|'+Q.c.toFixed(3);
  if(key!==Q.key){ Q.key=key; const A=Q.g.attributes.position.array, n=A.length/3;
    for(let v=0;v<n;v++) for(let a=0;a<3;a++){ const p0=Q.P0[v*3+a]; A[v*3+a]=p0+Q.N0[v*3+a]*0.030*Q.a+(Q.near[v*3+a]-p0)*0.38*Q.c; }
    Q.g.attributes.position.needsUpdate=true; Q.g.computeVertexNormals(); Q.g.computeBoundingSphere();
    const m=CT_ORGANS.pancreas.material; m.color.copy(Q.base).lerp(PANC_RED,0.55*Q.a).lerp(PANC_PALE,0.32*Q.c); m.emissive.copy(Q.baseE).lerp(PANC_GLOW,Q.a); }
  const show=(o,f)=>{ o.visible=f>0.02; if(o.visible) o.traverse(c=>{ if(c.material){ if(c.material.userData.b0===undefined) c.material.userData.b0=c.material.opacity; c.material.userData.baseOpacity=c.material.userData.b0*Math.min(1,f*1.3); } }); };
  show(Q.halo,Q.a*(1-0.75*Q.s)); show(Q.calc,Q.c); show(Q.pcy,Q.c);
  for(const kk of ['a','c','s']){ const tg=kk==='a'?(S.type==='acute'?1:0):kk==='c'?(S.type==='chronic'?1:0):(S.svt&&S.type!=='none'?1:0); if(Math.abs(Q[kk]-tg)<0.004) Q[kk]=tg; }
  Q.svt.visible=Q.s>0.02; if(Q.svt.visible) deployMeta(Q.svt,Q.s*1.08,0,1);
}
function forceRamps(){ const P=tiers[0].built&&tiers[0].inner.userData.P; if(P&&P.panc){ P.panc.force=true; pancTick(P,0); pancTick(P,0); } }
const PANC_RED=new THREE.Color(0xC4624A), PANC_PALE=new THREE.Color(0xB8A882), PANC_GLOW=new THREE.Color(0x3A0E08);

/* ——— per-frame: chase targets so every change animates ——— */
const pathCur={tips:0,pvt:{acute:0,partial:0,chronic:0,smv:0},hv:0,web:0,bil:0};
function pathTargets(){
  computeHemo();
  const t=tiers[0]; if(!t.built) return;
  const u=t.inner.userData, P=u.P, S=state.path, f=state.fibrosis;
  for(const k in P.cols) P.cols[k].target=HEMO.open[k]??0;
  // flow routing
  const R=P.routes, hp=R.hp, sp=S.pvt;
  const blockHP = sp==='acute'||sp==='chronic';
  const hpW = HEMO.hf?0:(S.tips?0.30:1)*(blockHP?0.35:1);
  hp.forEach((r,i)=>{ r.w=hpW/8; r.block=blockHP?P.clotArc[i]:null; r.speed=(sp==='partial'?0.55:1)*(S.bcs!=='none'?0.5:1)*(blockHP?0.5:1); });
  R.cav.forEach(r=>{ r.w=sp==='chronic'&&!HEMO.hf?0.85/8:0; r.speed=0.7; });
  R.tips.forEach(r=>{ r.w=S.tips&&!blockHP?0.9:0; r.speed=1.4; r.block=null; });
  const dc=S.tips?0.35:1, O=HEMO.open;
  R.col.lgv.w=(HEMO.hf?0:0.06)*(1-THREE.MathUtils.smoothstep(O.eso,0.05,0.35))*(blockHP?0.3:1);
  R.col.eso.w=0.20*O.eso*dc; R.col.eso2.w=0.16*O.eso*dc; R.col.fun.w=0.13*O.fun*dc; R.col.sr.w=0.20*O.sr*dc; R.col.pu.w=0.13*O.pu*dc;
  R.hf.forEach(r=>{ r.w=HEMO.hf?0.6:0; r.speed=0.8; });
  const hv=R.hv, hvObs=S.bcs==='hv'||S.bcs==='mixed', ivcObs=S.bcs==='ivc'||S.bcs==='mixed';
  const base={rhv:0.22,mhv:0.18,lhv:0.18,cau:0.04,cau2:0.03,ivc:0.22,lrv:0.10,azy:0};
  for(const k in hv){ const r=hv[k]; r.w=base[k]; r.block=null; r.speed=1;
    if(hvObs && (k==='rhv'||k==='mhv'||k==='lhv')){ r.block=P.ostArc[k]; r.w=0.08; r.speed=0.35; }
    if(ivcObs && k!=='azy' && P.webArc[k]<r.len-0.12){ r.block=Math.min(r.block??1e9,P.webArc[k]); r.w*=0.5; r.speed*=0.5; }
    if(S.bcs!=='none' && (k==='cau'||k==='cau2')) r.w=0.16; }
  hv.azy.w=0.22*O.azy; hv.lrv.w=0.10+0.10*O.sr;
  // PVT meshes
  pathCur.pvtT={acute:sp==='acute'?1:0,partial:sp==='partial'?1:0,chronic:sp==='chronic'?1:0,smv:S.pvtSMV&&sp!=='none'?1:0};
  pathCur.smvChronic=sp==='chronic';
  pathCur.tipsT=S.tips?1:0; pathCur.hvT=hvObs?1:0; pathCur.webT=ivcObs?1:0;
  P.m.caudT=S.bcs!=='none'?1:0;
  P.m.congT=(S.bcs!=='none'||state.path.zonal==='congestive')?1:0;
  P.m.fatT=state.path.masld/3; P.m.ironT=state.path.zonal==='iron'?1:0;
  P.m.splT=THREE.MathUtils.smoothstep(HEMO.ppg,8,24);
  // splenic vein thrombosis: left-sided (sinistral) portal hypertension — gastric fundal collaterals and splenomegaly with a normal HVPG
  if(R.col.svt) R.col.svt.w=0;
  if(S.panc&&S.panc.svt&&S.panc.type!=='none'){ P.cols.fun.target=Math.max(P.cols.fun.target,0.85); P.m.splT=Math.max(P.m.splT,0.55);
    // splenic blood cannot pass the thrombus: routes that start in the splenic vein carry nothing, and the splenic
    // outflow goes by the short gastric and fundal varices to the left gastric vein and the portal vein
    hp.forEach((r,i)=>{ if(i%3===2) r.w=0; }); R.cav.forEach((r,i)=>{ if(i%3===2) r.w=0; }); if(R.tips[1]) R.tips[1].w=0;
    R.col.eso2.w=0; R.col.fun.w=0; if(R.col.svt) R.col.svt.w=0.30; }
  P.m.vascT=(sp!=='none'||S.tips||S.bcs!=='none')?1:0;
  if(BIL.ready){ bilTargets(); P.m.bilT=BIL.O.active?1:0; }
  microTargets();
}
/* ════════════ HVPG measurement: transjugular balloon catheter, FHVP → WHVP → HVPG ════════════
   Stage 1: catheter from the right atrium down the IVC to the hepatic vein ostia.
   Stage 2: tip 2–4 cm into the right hepatic vein, balloon down: free hepatic venous pressure.
   Stage 3: balloon up, vein occluded: wedged hepatic venous pressure; HVPG = WHVP − FHVP.
   Pressures follow the model: HVPG is the sinusoidal gradient (fibrosis), unchanged by pre-hepatic PVT, lowered by
   TIPSS; FHVP is raised by an IVC block; hepatic-vein Budd–Chiari prevents cannulation. */
const HVPG={on:false,t:0,stage:0,path:null,uOst:0.6,tube:null,tip:null,bal:null,grp:null,lastS:-1,
  F:null,W:null,dispW:null,trace:[],tAcc:0,prevLayers:null,blocked:false};
const HV_T={s1:4.5,s2a:2.0,s2b:2.2,s3a:1.4,s3b:2.4};          // seconds per phase
function hvpgTargets(){
  const S=state.path, sin=HEMO.sin;
  const F=5+(S.bcs==='ivc'?9:0)+(S.tips?2:0);
  const g=HEMO.hvpg;
  return {F, W:F+g, blocked:S.bcs==='hv'||S.bcs==='mixed'};
}
/* ——— liver biopsy: transjugular (catheter via the IVC into the right hepatic vein, needle fired anteriorly into the
   parenchyma without crossing the capsule) and percutaneous (right intercostal, mid-axillary line, 16G core) ——— */
const BX={on:false,mode:null,stage:1,t:0,grp:null,n:3};
var ERCP_T;
/* duodenoscope route: lumen centreline of this CT stomach and duodenum (distance-weighted shortest path, smoothed) from
   the gastro-oesophageal junction through body, antrum, pylorus and D1 to D2 opposite the papilla */
const SCOPE_PATH=[[1.1,0.25,0.05],[1.34,0.05,0.22],[1.26,-0.28,0.52],[1.06,-0.58,0.76],[0.8,-0.84,0.92],[0.46,-0.92,0.95],[0.1,-0.85,0.87],[-0.14,-0.72,0.72],[-0.26,-0.6,0.6],[-0.284,-0.652,0.416],[-0.344,-0.803,0.245],[-0.363,-1.017,0.146]];
const BX_TXT={
  tace:{title:'Transarterial chemoembolisation (TACE)',
    when:['Intermediate-stage HCC (BCLC B): multinodular disease without macrovascular invasion or extrahepatic spread (EASL 2025).',
      'Preserved liver function (Child–Pugh A, selected B7) and good performance status.',
      'Also used to bridge or downstage to liver transplantation.',
      'Avoid in decompensated cirrhosis, main portal vein occlusion or hepatofugal flow, and in tumour burden too large for selective treatment.'],
    steps:[['1 · Arterial access','Common femoral (or radial) artery puncture; a catheter is passed up the aorta into the coeliac axis and hepatic artery, and angiography maps the arterial supply, including variants.'],
      ['2 · Selective catheterisation','A microcatheter is advanced as selectively as possible into the segmental artery feeding the tumour. HCC is arterially supplied and shows a tumour blush.'],
      ['3 · Chemoembolisation','Conventional TACE: a lipiodol–doxorubicin emulsion then embolic particles, or drug-eluting beads. Lipiodol is retained in the tumour.'],
      ['4 · Response','Post-embolisation syndrome (pain, fever, nausea) is common. Response is assessed by CT or MRI at 4–6 weeks (mRECIST); TACE is repeated on demand and stopped at untreatable progression in favour of systemic therapy.']],
    note:'Complications: post-embolisation syndrome, liver decompensation, abscess and non-target embolisation.'},
  resect:{title:'Liver resection',
    when:['First-line for a single HCC with preserved liver function when enough liver will remain, whatever the tumour size (EASL 2025).',
      'Clinically significant portal hypertension (HVPG ≥10 mmHg, or liver stiffness ≥25 kPa) raises the risk of decompensation after hepatectomy; the extent of resection and liver function are weighed together.',
      'Future liver remnant by CT volumetry: usually at least 40% in cirrhosis (less in a normal liver); portal vein embolisation can enlarge it.',
      'Anatomical (segmental) resection is preferred where feasible.'],
    steps:[['1 · Planning','CT volumetry defines the segment to be removed and the future liver remnant (shaded).'],
      ['2 · Transection','Intraoperative ultrasound confirms the tumour and its segmental portal pedicle. Inflow is controlled (Pringle manoeuvre) and the parenchyma divided along the segment boundary marked by the hepatic veins.'],
      ['3 · Specimen','The segment is removed with the tumour, aiming for a clear margin; the raw surface is secured.'],
      ['4 · Recovery','The remnant regenerates over weeks. Recurrence is common (about 70% at 5 years), so surveillance imaging continues.']],
    note:''},
  ercp:{title:'ERCP',
    when:['Therapeutic rather than diagnostic: confirm the cause with MRCP or EUS first when it is uncertain (BSG 2017).',
      'Common bile duct stones: sphincterotomy with balloon or basket clearance, and a plastic stent if the duct cannot be cleared (BSG 2017).',
      'Acute cholangitis that does not settle with antibiotics, or with septic shock: urgent biliary drainage.',
      'Malignant distal biliary obstruction needing drainage: an endoscopic self-expanding metal stent (NICE NG85; ESGE).',
      'Gallstone pancreatitis: only with coexisting cholangitis or persistent biliary obstruction.'],
    steps:[['1 · Intubation','The side-viewing duodenoscope passes the oesophagus, stomach and pylorus into the second part of the duodenum and is shortened to face the major papilla.'],
      ['2 · Cannulation and cholangiogram','A sphincterotome over a guidewire is steered by the elevator through the papilla into the bile duct. Contrast outlines the biliary tree; stones and strictures show as filling defects.'],
      ['3 · Sphincterotomy','Diathermy cuts the roof of the papilla along the 11–12 o’clock axis to open the biliary orifice.'],
      ['4 · Therapy','Balloon trawl: an extraction balloon is inflated above the stone and drawn down through the sphincterotomy. Stent: a plastic or self-expanding metal stent is placed across the stone or stricture.']],
    note:'Complications: post-ERCP pancreatitis (about 3.5–9.7%), post-sphincterotomy bleeding, perforation and cholangitis. ESGE recommends 100 mg rectal diclofenac or indomethacin for all patients without contraindication, and a prophylactic pancreatic stent when the risk is high.'},
  tj:{title:'Transjugular liver biopsy',
    when:['INR &gt;1.4 or platelets &lt;50 ×10⁹/L: BSG/RCR/RCPath 2020 recommend a transvenous route for non-lesional biopsy.',
      'Ascites, where a percutaneous route is less attractive.',
      'When pressure studies are also needed: HVPG (and wedged venography) can be done in the same sitting.',
      'Trade-off: thinner (18–19G), often fragmented cores, so several passes are taken; not the route for targeting a focal lesion.'],
    steps:[['1 · Venous access','Ultrasound-guided puncture of the right internal jugular vein; a sheath is placed and a catheter passed through the right atrium into the IVC under fluoroscopy.'],
      ['2 · Hepatic vein','The catheter is steered into the right hepatic vein (the middle hepatic vein is an alternative) and its position confirmed with contrast. HVPG can be measured here.'],
      ['3 · Core','A stiffening cannula is turned to point anteriorly and the needle is fired 1–2 cm into the parenchyma. The capsule is not crossed, so any bleeding drains back into the vein. Usually 3–4 passes.']],
    note:'Complications are uncommon: neck haematoma, arrhythmia as the catheter crosses the right atrium, and rarely capsular perforation.'},
  pc:{title:'Percutaneous liver biopsy',
    when:['The standard route for diffuse (non-lesional) disease when coagulation allows: INR ≤1.4 and platelets ≥50 ×10⁹/L.',
      'The route for a targeted biopsy of a focal lesion: an INR of 1.5–2.0 is not a contraindication in stable liver disease.',
      'Needs a cooperative patient who can hold their breath and a safe ultrasound window avoiding the gallbladder, large vessels, dilated ducts and lung.',
      'Gives the best tissue: a 16G needle and a core of at least 20 mm are recommended for staging diffuse disease.'],
    steps:[['1 · Ultrasound window','Ultrasound identifies a safe window over the right lobe in the 8th or 9th intercostal space, mid-axillary line, below the lung edge; local anaesthetic is infiltrated over the upper border of the lower rib down to the capsule. The ribcage is shown ghosted.'],
      ['2 · Needle','On held breath the core needle is advanced through the intercostal space, just above the lower rib (the neurovascular bundle runs under each rib), and crosses the capsule once.'],
      ['3 · Core','The cutting throw takes a core of at least 20 mm. The patient is then observed for pain, bleeding and haemodynamic change.']],
    note:'Bleeding of any kind in up to 10.9%, major bleeding 0.1–4.6%, mortality less than 1 in 1000 (BSG/RCR/RCPath 2020). Image guidance is recommended.'}};
function bxBuild(mode){
  const u=tiers[0].inner.userData, K=u.K, g=new THREE.Group(); g.userData.keepInGhost=true;
  const metal=mat(0xD7DDE3,{metalness:0.85,roughness:0.28,clearcoat:0.6}), core=mat(0x9C4A3A,{roughness:0.6,clearcoat:0.3});
  const O={g};
  if(mode==='tace'||mode==='resect'){
    const H=lesions.filter(L=>L.kind==='hcc'); if(!H.length) return null; O.les=H[H.length-1];
  }
  if(mode==='tace'){
    const S=K.HAsegs, c=O.les.c, byName=n=>S.find(s=>s.name===n), key=q=>`${Math.round(q.x*100)},${Math.round(q.y*100)},${Math.round(q.z*100)}`;
    const byEnd=new Map(); S.forEach(s=>byEnd.set(key(s.pts[s.pts.length-1]),s));
    let tg=null, bd=1e9;
    for(const s of S){ if(s.r0<0.006||!/hepatic artery/.test(s.name)||s.name==='Common hepatic artery'||s.name==='Proper hepatic artery') continue;
      const cc=new THREE.CatmullRomCurve3(s.pts); for(let i=0;i<=10;i++){ const d=cc.getPoint(i/10).distanceTo(c); if(d<bd){ bd=d; tg={s,t:i/10}; } } }
    const chain=[]; for(let s=tg.s,gd=0;s&&gd<30;gd++){ chain.unshift(s); s=byEnd.get(key(s.pts[0])); }
    const ao=byName('Aorta').pts, co=byName('Coeliac trunk').pts, cha=byName('Common hepatic artery').pts, pha=byName('Proper hepatic artery').pts;
    const pts=[ao[ao.length-1].clone().add(V3(0.05,-0.55,0.25)),ao[ao.length-1].clone(),ao[ao.length-2].clone().lerp(ao[ao.length-1],0.4),co[0].clone(),...co.slice(1),...cha.slice(1),...pha.slice(1)];
    const uPHA=pts.length-1;
    chain.forEach((s,i)=>{ const ps=(i===chain.length-1)?new THREE.CatmullRomCurve3(s.pts).getPoints(10).slice(0,Math.max(2,Math.round(tg.t*10)+1)):s.pts; for(const p of ps) if(p.distanceTo(pts[pts.length-1])>0.02) pts.push(p.clone()); });
    const cc=new THREE.CatmullRomCurve3(pts,false,'centripetal'), Ls=cc.getLengths(600);
    O.uPHA=Ls[Math.round(uPHA/(pts.length-1)*600)]/Ls[600];
    O.cath=metaMesh(sweep(cc,0,1,(u)=>u<O.uPHA?0.016:0.010,300,10),mat(0xF2F4F6,{roughness:0.3,clearcoat:0.8,emissive:new THREE.Color(0xF2F4F6).multiplyScalar(0.15)}),'TACE catheter and microcatheter');
    g.add(O.cath); deployMeta(O.cath,0,0);
    const m=O.les.mesh.material; O.m0={c:m.color.clone(),e:m.emissive.clone(),ei:m.emissiveIntensity}; O.s0=O.les.mesh.scale.x;
    tiers[0].inner.add(g); registerFade(g); return O;
  }
  if(mode==='resect'){
    const u=tiers[0].inner.userData, geo=u.MG.parenchyma, pos=geo.attributes.position.array, idx0=geo.index.array.slice(), k=O.les.k;
    const keep=[], spec=[], a=new THREE.Vector3();
    for(let i=0;i<idx0.length;i+=3){ const i0=idx0[i],i1=idx0[i+1],i2=idx0[i+2];
      a.set((pos[i0*3]+pos[i1*3]+pos[i2*3])/3,(pos[i0*3+1]+pos[i1*3+1]+pos[i2*3+1])/3,(pos[i0*3+2]+pos[i1*3+2]+pos[i2*3+2])/3);
      (segAt(a.x,a.y,a.z)===k?spec:keep).push(i0,i1,i2); }
    // cut loops: edges used once within the specimen patch
    const em=new Map(); for(let i=0;i<spec.length;i+=3) for(let e=0;e<3;e++){ const p=spec[i+e], q=spec[i+(e+1)%3], kk=p<q?p+'_'+q:q+'_'+p; em.set(kk,(em.get(kk)||0)+1); }
    const nxt=new Map(); for(let i=0;i<spec.length;i+=3) for(let e=0;e<3;e++){ const p=spec[i+e], q=spec[i+(e+1)%3], kk=p<q?p+'_'+q:q+'_'+p; if(em.get(kk)===1) nxt.set(p,q); }
    const loops=[], seen=new Set(); for(const s of nxt.keys()){ if(seen.has(s)) continue; const lp=[]; let v=s, g2=0; while(v!==undefined&&!seen.has(v)&&g2<20000){ seen.add(v); lp.push(v); v=nxt.get(v); g2++; } if(lp.length>=3) loops.push(lp); }
    const capPos=[]; for(const lp of loops){ const c=new THREE.Vector3(); for(const v of lp) c.x+=pos[v*3],c.y+=pos[v*3+1],c.z+=pos[v*3+2]; c.multiplyScalar(1/lp.length);
      for(let i=0;i<lp.length;i++){ const p=lp[i], q=lp[(i+1)%lp.length]; capPos.push(pos[p*3],pos[p*3+1],pos[p*3+2],pos[q*3],pos[q*3+1],pos[q*3+2],c.x,c.y,c.z); } }
    const capG=new THREE.BufferGeometry(); capG.setAttribute('position',new THREE.Float32BufferAttribute(capPos,3)); capG.computeVertexNormals();
    { const nA=capG.attributes.normal.array, nn=new THREE.Vector3(); for(let i=0;i<nA.length;i+=3){ const sg=(nn.x*nA[i]+nn.y*nA[i+1]+nn.z*nA[i+2])<0&&i>0?-1:1; nn.x+=sg*nA[i]; nn.y+=sg*nA[i+1]; nn.z+=sg*nA[i+2]; }
      nn.normalize(); for(let i=0;i<nA.length;i+=3){ nA[i]=nn.x; nA[i+1]=nn.y; nA[i+2]=nn.z; } }   // one smooth cut face rather than a faceted fan
    const rawMat=mat(0x8E2B22,{roughness:0.75,clearcoat:0.2,side:THREE.DoubleSide,emissive:new THREE.Color(0x2A0806)});
    O.capR=tag(new THREE.Mesh(capG,rawMat),'Transection surface (remnant)'); O.capR.visible=false; g.add(O.capR);
    // specimen: the segment's own surface plus its cut face, moved away with the tumour
    const sg=new THREE.BufferGeometry(); sg.setAttribute('position',geo.attributes.position); sg.setAttribute('normal',geo.attributes.normal); sg.setAttribute('color',geo.attributes.color); sg.setIndex(spec);
    const body=u.L.parenchyma.children.find(o=>o.userData.segmentPick);
    O.spec=new THREE.Group(); O.spec.add(tag(new THREE.Mesh(sg,body.material.clone()),'Resection specimen'),tag(new THREE.Mesh(capG,rawMat),'Resection specimen'));
    O.spec.visible=false; g.add(O.spec);
    O.plan=tag(new THREE.Mesh(sg,mat(0xE0A33E,{opacity:0.45,depthWrite:false,emissive:new THREE.Color(0xE0A33E).multiplyScalar(0.35),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),'Planned resection');
    O.plan.visible=false; g.add(O.plan);
    const lpPts=loops.length?loops.sort((x,y)=>y.length-x.length)[0].filter((_,i)=>i%3===0).map(v=>V3(pos[v*3],pos[v*3+1],pos[v*3+2])):[];
    if(lpPts.length>4){ const lc=new THREE.CatmullRomCurve3(lpPts,true); O.line=tag(new THREE.Mesh(new THREE.TubeGeometry(lc,lpPts.length*3,0.010,8,true),mat(0xFFE08A,{emissive:new THREE.Color(0xFFD060).multiplyScalar(0.8)})),'Transection line'); O.line.visible=false; g.add(O.line); }
    const sc=new THREE.Vector3(); let ns=0; for(let i=0;i<spec.length;i++){ const v=spec[i]; sc.x+=pos[v*3]; sc.y+=pos[v*3+1]; sc.z+=pos[v*3+2]; ns++; } sc.multiplyScalar(1/Math.max(1,ns));
    const lc=new THREE.Box3().setFromBufferAttribute(geo.attributes.position).getCenter(new THREE.Vector3());
    O.dir=sc.clone().sub(lc).normalize(); O.geo=geo; O.idx0=idx0; O.keep=keep; O.cut=false; O.lesP0=O.les.mesh.position.clone();
    // volumetry from the interior grid
    let tot=0; const cnt=SEG.map((_,i)=>{ const n=segmentCandidates(i).length; tot+=n; return n; });
    O.frac=cnt[k]/Math.max(1,tot);
    BX_TXT.resect.note=`Planned: anatomical resection of segment ${SEG[k]}, about ${Math.round(O.frac*100)}% of liver volume; future liver remnant about ${Math.round((1-O.frac)*100)}%.`;
    tiers[0].inner.add(g); registerFade(g); return O;
  }
  if(mode==='ercp'){
    const top=K.OES[0].clone().add(V3(0,0.7,0.05)), sp=[top,...K.OES.map(p=>p.clone()),...SCOPE_PATH.map(a=>V3(a[0],a[1],a[2]))];
    const c=new THREE.CatmullRomCurve3(sp,false,'centripetal');
    O.scope=metaMesh(sweep(c,0,1,()=>0.058,280,16),mat(0x1E2226,{roughness:0.35,clearcoat:0.9}),'Duodenoscope (side-viewing)'); g.add(O.scope); deployMeta(O.scope,0,0);
    const tip=c.getPointAt(1), cb=K.ducts.cbd.pts, upB=cb.slice(0,-1).reverse();      // CBD from the ampulla upwards
    const cc=new THREE.CatmullRomCurve3([tip.clone(),tip.clone().lerp(K.amp0,0.55),K.amp0.clone(),...upB.slice(0,4)]);
    O.cann=metaMesh(sweep(cc,0,1,()=>0.011,110,10),mat(0xF2F4F6,{roughness:0.3,clearcoat:0.8}),'Sphincterotome / cannula'); g.add(O.cann); deployMeta(O.cann,0,0);
    const dUp=upB[0].clone().sub(K.amp0).normalize();
    O.cut=tag(new THREE.Mesh(new THREE.CapsuleGeometry(0.013,0.05,4,10),mat(0xE0452C,{roughness:0.4,emissive:new THREE.Color(0xE0452C).multiplyScalar(0.6)})),'Biliary sphincterotomy');
    O.cut.position.copy(K.amp0).addScaledVector(dUp,0.03); O.cut.quaternion.setFromUnitVectors(V3(0,1,0),dUp); O.cut.visible=false; g.add(O.cut);
    O.bal=tag(new THREE.Mesh(new THREE.SphereGeometry(0.048,20,14),mat(0xF2D27A,{roughness:0.2,clearcoat:1,opacity:0.85,emissive:new THREE.Color(0xF2D27A).multiplyScalar(0.3)})),'Extraction balloon');
    O.bal.visible=false; g.add(O.bal);
    O.trawl=new THREE.CatmullRomCurve3([...upB.slice(0,4).reverse(),K.amp0.clone(),K.amp0.clone().lerp(tip,0.7)]);
    const stones=tiers[0].inner.userData.P.bil.cbdStones;
    if(state.path.bil.cause==='cbd'&&!state.path.bil.cleared&&stones.children.length){ const sc=new THREE.Vector3(); stones.children.forEach(s=>sc.add(s.position)); sc.multiplyScalar(1/stones.children.length);
      let bs=0,bd=1e9; for(let i=0;i<=200;i++){ const dd=O.trawl.getPointAt(i/200).distanceToSquared(sc); if(dd<bd){ bd=dd; bs=i/200; } } O.stones=stones; O.sStone=bs; }
    O.therapy=ERCP_T||'trawl'; O.applied=false;
    O.dmats=BIL.items.filter(I=>I.it.kind!=='pd').map(I=>({m:I.it.m.material,c:I.it.m.material.color.clone(),e:I.it.m.material.emissive.clone()}));
    tiers[0].inner.add(g); registerFade(g); return O;
  }
  if(mode==='tj'){
    const ivc=K.HVsegs.find(s=>s.name==='IVC').pts, top=ivc[0], dn=ivc[1].clone().sub(top).normalize(), rc=new THREE.CatmullRomCurve3(K.rhv);
    const ent=top.clone().addScaledVector(dn,-0.85);
    const pts=[ent,top.clone().addScaledVector(dn,-0.4),top,top.clone().lerp(K.OST,0.5),K.OST.clone(),rc.getPoint(0.12),rc.getPoint(0.26),rc.getPoint(0.40)];
    const c=new THREE.CatmullRomCurve3(pts,false,'centripetal'), Ls=c.getLengths(400);
    O.uIVC=Ls[Math.round(3/7*400)]/Ls[400];
    O.cath=metaMesh(sweep(c,0,1,()=>0.017,160,12),mat(0xE9EEF2,{roughness:0.28,clearcoat:0.9,emissive:new THREE.Color(0xE9EEF2).multiplyScalar(0.25)}),'Transjugular biopsy sheath and cannula');
    g.add(O.cath); deployMeta(O.cath,0,0);
    // needle: from the cannula tip, turned anteriorly (and a little caudally), kept inside the capsule
    const tip=c.getPointAt(1), d=V3(0,-0.30,1).normalize(); let L=0.29;
    while(L>0.12){ const e=tip.clone().addScaledVector(d,L+0.04); if(sdfLiver(e.x,e.y,e.z)<SURF-0.02) break; L-=0.01; }
    const nc=new THREE.CatmullRomCurve3([tip.clone().addScaledVector(c.getTangentAt(1),-0.05),tip,tip.clone().addScaledVector(d,L*0.5),tip.clone().addScaledVector(d,L)]);
    O.needle=metaMesh(sweep(nc,0,1,()=>0.0085,40,10),metal,'Transjugular biopsy needle (18–19G)'); g.add(O.needle); deployMeta(O.needle,0,0);
    const cc=new THREE.CatmullRomCurve3([tip.clone().addScaledVector(d,0.05),tip.clone().addScaledVector(d,L)]);
    O.core=metaMesh(sweep(cc,0,1,()=>0.011,20,10),core,'Liver core (transjugular)'); g.add(O.core); deployMeta(O.core,0,0);
    O.target=tip.clone().addScaledVector(d,L*0.6);
  } else {
    // a segment VI/VII target 3–4 cm below the lateral capsule, reached along a lateral intercostal line
    const dLat=V3(-1,-0.10,0.10).normalize(); let best=null, bs=1e9;
    for(const k of [SEG.indexOf('VI'),SEG.indexOf('VII')]) for(const cnd of segmentCandidates(k)){
      if(cnd.d<0.15) continue; const X=cnd.p.clone(); let n=0; while(sdfLiver(X.x,X.y,X.z)<SURF&&n<200){ X.addScaledVector(dLat,0.01); n++; }
      const L=cnd.p.distanceTo(X); if(L<0.40||L>0.60) continue;
      let sc=Math.abs(L-0.48)*4+Math.abs(cnd.p.y+0.05)*0.8+Math.abs(cnd.p.z)*0.5;
      { const rc=ribClear(X,X.clone().addScaledVector(dLat,0.50)); if(rc.d<0.050) continue; sc+=Math.max(0,rc.d-0.08)*3; }   // v40: intercostal, over the upper border of the lower rib
      if(sc<bs){ bs=sc; best={T:cnd.p.clone(),X}; } }
    if(!best) return null;
    const S=best.X.clone().addScaledVector(dLat,0.32), Ex=S.clone().addScaledVector(dLat,0.18);
    const c=new THREE.CatmullRomCurve3([Ex,S,best.X,best.T]), Ls=c.getLengths(400);
    O.uCap=Ls[Math.round(2/3*400)]/Ls[400];
    O.needle=metaMesh(sweep(c,0,1,()=>0.012,80,12),metal,'Percutaneous biopsy needle (16G)'); g.add(O.needle); deployMeta(O.needle,0,0);
    const hub=tag(new THREE.Mesh(new THREE.CylinderGeometry(0.030,0.030,0.12,16),mat(0x6B8FD6,{roughness:0.4,clearcoat:0.6})),'Percutaneous biopsy needle (16G)');
    hub.position.copy(Ex).addScaledVector(dLat,0.06); hub.quaternion.setFromUnitVectors(V3(0,1,0),dLat); g.add(hub); O.hub=hub; hub.visible=false;
    const skin=tag(new THREE.Mesh(new THREE.TorusGeometry(0.05,0.010,8,28),mat(0xD9A78C,{roughness:0.7})),'Skin entry (right intercostal, mid-axillary line)');
    skin.position.copy(S); skin.quaternion.setFromUnitVectors(V3(0,0,1),dLat); g.add(skin); O.skin=skin;
    const thr=best.T.clone().addScaledVector(dLat,Math.min(0.29,best.T.distanceTo(best.X)-0.04));
    const cc=new THREE.CatmullRomCurve3([thr,best.T]);
    O.core=metaMesh(sweep(cc,0,1,()=>0.014,20,10),core,'Liver core (percutaneous, 16G)'); g.add(O.core); deployMeta(O.core,0,0);
    O.target=best.T.clone();
  }
  tiers[0].inner.add(g); registerFade(g); return O;
}
function bxStart(mode){
  if(!tiers[0].built) return;
  bxStop(); hvpgStop();
  const O=bxBuild(mode); if(!O) return;
  Object.assign(BX,{on:true,mode,stage:1,t:0,O,n:BX_TXT[mode].steps.length});
  const LY = mode==='tace' ? {parenchyma:'ghost',artery:'ghost',portal:'ghost',hepaticVein:'ghost',biliary:'ghost',stomach:'ghost',duodenum:'ghost',pancreas:'ghost'}
           : mode==='resect' ? {} : mode==='ercp' ? {parenchyma:'ghost',stomach:'ghost',duodenum:'ghost',esophagus:'ghost',pancreas:'ghost',portal:'ghost',artery:'ghost',hepaticVein:'ghost',spleen:'ghost',kidneys:'ghost'}
           : mode==='tj' ? {parenchyma:'ghost',hepaticVein:'ghost'} : {parenchyma:'ghost',ribcage:'ghost'};
  BX.prevLayers={}; for(const k in LY){ BX.prevLayers[k]=state.layers[k]; if(state.layers[k]==='solid'||state.layers[k]==='on'||(k==='ribcage'&&state.layers[k]==='off')) state.layers[k]=LY[k]; }
  applyModes(); if(layerTier===0) refreshLayerChrome();
  const T=BX_TXT[mode];
  $('#bx-title').textContent=T.title;
  $('#bx-when').innerHTML=T.when.map(s=>`<li>${s}</li>`).join('');
  $('#bx-steps').innerHTML=T.steps.map(([h,s])=>`<li class="hst"><em>${h}</em><span>${s}</span></li>`).join('');
  $('#bx-note').textContent=T.note;
  $('#bx').hidden=false; document.querySelectorAll('#bx-tj,#bx-pc,#ercp-go,#tace-go,#resect-go').forEach(b=>b.dataset.on=(b.id==='bx-'+mode||b.id===mode+'-go')?'1':'0');
  $('#ercp-go').textContent=mode==='ercp'?'End ERCP':'Start ERCP';
  bxPanel();
  if(mode==='pc') pcView();
}
/* v41: oblique view of the percutaneous biopsy needle: about 60° to the track, from in front, below and lateral.
   v44: same direction, no zoom: the camera distance and target are solved so the whole liver, the right lower ribs (7–12)
   and the full needle path (hub to target) project inside the view with a margin (pinhole fit in the camera's basis). */
function pcView(){ const O=BX.O; if(!O||!O.skin||!O.target) return; const inn=tiers[0].inner; inn.updateMatrixWorld(true);
  const s=O.skin.position.clone(), t=O.target.clone(), d=s.clone().sub(t).normalize(), a=V3(0,-0.15,1);
  const perp=a.clone().addScaledVector(d,-a.dot(d)).normalize(), dir=perp.multiplyScalar(0.86).addScaledVector(d,0.50).normalize();
  const w=dir.transformDirection(inn.matrixWorld), pts=[];
  const body=inn.userData.body, P=body.geometry.attributes.position; body.updateMatrixWorld(true);
  for(let i=0;i<P.count;i+=7) pts.push(new THREE.Vector3().fromBufferAttribute(P,i).applyMatrix4(body.matrixWorld));
  for(let r=7;r<=12;r++) for(const q of RIBS_R[r]||[]) pts.push(inn.localToWorld(q.clone()));
  const ex=s.clone().addScaledVector(s.clone().sub(t).normalize(),0.30);   // hub end of the needle, outside the skin
  for(const q of [ex,s,t]) pts.push(inn.localToWorld(q));
  // camera basis for this direction (OrbitControls keeps world +y up)
  const up=V3(0,1,0), R=new THREE.Vector3().crossVectors(up,w).normalize(), U=new THREE.Vector3().crossVectors(w,R);
  let r0=1e9,r1=-1e9,u0=1e9,u1=-1e9; for(const q of pts){ const x=q.dot(R), y=q.dot(U); r0=Math.min(r0,x); r1=Math.max(r1,x); u0=Math.min(u0,y); u1=Math.max(u1,y); }
  const c0=pts.reduce((m,q)=>m.add(q),new THREE.Vector3()).multiplyScalar(1/pts.length), cw=c0.dot(w);
  const c=R.clone().multiplyScalar((r0+r1)/2).addScaledVector(U,(u0+u1)/2).addScaledVector(w,cw);
  // usable half-extents: the side panel / phone sheet shift the view (setViewOffset), leaving W − 2·offsetX by H − 2·|offsetY|
  const V=camera.view&&camera.view.enabled?camera.view:null, kx=V?Math.max(0.3,1-2*Math.abs(V.offsetX)/V.fullWidth):1, ky=V?Math.max(0.3,1-2*Math.abs(V.offsetY)/V.fullHeight):1;
  const tv=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*0.92*ky, th=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*0.92*camera.aspect*kx;
  let dist=0; for(const q of pts){ const v=q.clone().sub(c), z=v.dot(w); dist=Math.max(dist,z+Math.abs(v.dot(R))/th,z+Math.abs(v.dot(U))/tv); }
  controls.target.copy(c); camera.position.copy(c).addScaledVector(w,dist); controls.update(); }
function bxStop(){
  if(!BX.on) return;
  BX.on=false;
  if(BX.O&&BX.O.dmats) for(const q of BX.O.dmats){ q.m.color.copy(q.c); q.m.emissive.copy(q.e); }
  if(BX.O&&BX.O.stones) BX.O.stones.position.set(0,0,0);
  if(BX.O&&BX.mode==='resect'){ const O=BX.O; O.geo.setIndex(Array.from(O.idx0)); if(O.geo.boundsTree) O.geo.disposeBoundsTree();
    O.les.mesh.position.copy(O.lesP0); O.les.mesh.visible=true; if(O.cut&&lesions.includes(O.les)) removeLesion(O.les); }
  if(BX.O&&BX.mode==='tace'&&!BX.O.done){ const m=BX.O.les.mesh.material; m.color.copy(BX.O.m0.c); m.emissive.copy(BX.O.m0.e); BX.O.les.mesh.scale.setScalar(BX.O.s0); }
  if(BX.O){ const g=BX.O.g; g.parent&&g.parent.remove(g); g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); BX.O=null; }
  if(BX.prevLayers){ Object.assign(state.layers,BX.prevLayers); BX.prevLayers=null; applyModes(); if(layerTier===0) refreshLayerChrome(); }
  $('#bx').hidden=true; document.querySelectorAll('#bx-tj,#bx-pc,#ercp-go,#tace-go,#resect-go').forEach(b=>b.dataset.on='0'); $('#ercp-go').textContent='Start ERCP';
}
const TACE_LIP=new THREE.Color(0xF2E7B8), TACE_LIPG=new THREE.Color(0x6A5A20), TACE_NEC=new THREE.Color(0x6E645C), TACE_BLUSH=new THREE.Color(0xB0201A);
const ERCP_WHITE=new THREE.Color(0xF0F2F4), ERCP_GLOW=new THREE.Color(0x7A8088);
const bxEnd=s=>s/(BX.n||3);   // each stage animates over its share of t ∈ [0,1]
function bxPanel(){
  const st=BX.stage, done=BX.t>=bxEnd(st)-1e-6;
  const n=BX.n||3;
  $('#bx-prev').disabled=st<=1; $('#bx-next').disabled=st>=n||!done;
  $('#bx-st').textContent=`Stage ${st} of ${n} · `+(done?(st<n?'complete — press Next':'complete'):'in progress…');
  document.querySelectorAll('#bx .hst').forEach((el,i)=>{ el.dataset.s=i+1<st?'done':i+1===st?'now':'todo'; });
}
function bxTick(dt){
  if(!BX.on||!BX.O) return;
  const tgt=bxEnd(BX.stage), was=BX.t>=tgt-1e-6;
  BX.t = BX.t<tgt ? Math.min(tgt,BX.t+dt*0.16*3/(BX.n||3)) : Math.max(tgt,BX.t-dt*0.5);
  const O=BX.O, t=BX.t, sm=THREE.MathUtils.smoothstep;
  if(BX.mode==='tace'){
    deployMeta(O.cath,(sm(t,0,0.23)*O.uPHA+sm(t,0.27,0.46)*(1-O.uPHA))*1.03,0,1);
    const m=O.les.mesh.material, blush=sm(t,0.40,0.48)*(1-sm(t,0.55,0.62)), lip=sm(t,0.55,0.72), nec=sm(t,0.80,0.97);
    m.color.copy(O.m0.c).lerp(TACE_LIP,0.55*lip).lerp(TACE_NEC,0.75*nec);
    m.emissive.copy(O.m0.e).lerp(TACE_BLUSH,blush).lerp(TACE_LIPG,0.6*lip*(1-nec)); m.emissiveIntensity=1;
    O.les.mesh.scale.setScalar(O.s0*(1-0.12*nec));
    if(t>0.99&&!O.done){ O.done=true; O.les.sub=O.les.sub.replace(/ · TACE.*$/,'')+' · TACE'; renderLesions(); }
  } else if(BX.mode==='resect'){
    const plan=sm(t,0.02,0.2)*(1-sm(t,0.5,0.56)); O.plan.visible=plan>0.02; if(O.plan.visible) O.plan.material.userData.baseOpacity=0.45*plan*(0.75+0.25*Math.sin(performance.now()*0.004));
    if(O.line){ O.line.visible=t>0.28&&t<0.56; }
    const cut=t>0.52;
    if(cut!==O.cut){ O.cut=cut; O.geo.setIndex(cut?O.keep:Array.from(O.idx0)); if(O.geo.boundsTree) O.geo.disposeBoundsTree(); O.capR.visible=cut; O.spec.visible=cut; }
    const lift=sm(t,0.54,0.74), fade=sm(t,0.80,0.95);
    O.spec.position.copy(O.dir).multiplyScalar(0.75*lift);
    O.spec.traverse(c=>{ if(c.material) c.material.userData.baseOpacity=1-fade; }); O.spec.visible=cut&&fade<0.99;
    O.les.mesh.position.copy(O.lesP0).addScaledVector(O.dir,0.75*lift); O.les.mesh.material.userData.baseOpacity=1-fade; O.les.mesh.visible=fade<0.99;
  } else if(BX.mode==='ercp'){
    deployMeta(O.scope,sm(t,0,0.24)*1.02,0,1);
    deployMeta(O.cann,sm(t,0.27,0.40)*1.06,0,1);
    const ct=sm(t,0.38,0.49); const tr=sm(t,0.70,0.76);   // at the therapy stage the contrast-filled ducts turn see-through, like fluoroscopy
    for(const q of O.dmats){ q.m.color.copy(q.c).lerp(ERCP_WHITE,0.8*ct); q.m.emissive.copy(q.e).lerp(ERCP_GLOW,ct); q.m.userData.baseOpacity=1-0.6*tr; }
    const cs=sm(t,0.55,0.70); O.cut.visible=cs>0.01; O.cut.scale.setScalar(Math.max(0.01,cs));
    if(O.therapy==='trawl'){
      const s=sm(t,0.79,0.97); O.bal.visible=t>0.76&&t<0.995; O.bal.scale.setScalar(Math.max(0.01,sm(t,0.76,0.79))); O.trawl.getPointAt(s,O.bal.position);
      if(O.stones){ const k=s-O.sStone; if(k>0){ O.stones.position.copy(O.trawl.getPointAt(Math.min(1,O.sStone+k))).sub(O.trawl.getPointAt(O.sStone)); } else O.stones.position.set(0,0,0); }
      if(t>0.985&&!O.applied){ O.applied=true; if(state.path.bil.cause==='cbd'){ state.path.bil.cleared=true; pathChanged(); } }
    } else if(t>0.76&&!O.applied){ O.applied=true; state.path.bil.stent=O.therapy; bilStentBuild(tiers[0].inner.userData.P); pathChanged(); }
  } else if(BX.mode==='tj'){
    const a=sm(t,0,1/3)*O.uIVC+sm(t,1/3,2/3)*(1-O.uIVC);
    deployMeta(O.cath,a*1.06,0,1); deployMeta(O.needle,sm(t,0.70,0.90)*1.08,0,1); deployMeta(O.core,sm(t,0.88,0.99)*1.1,0,1);
  } else {
    O.hub.visible=t>0.36;
    deployMeta(O.needle,(sm(t,1/3,0.60)*O.uCap+sm(t,0.66,0.86)*(1-O.uCap))*1.04,0,1); deployMeta(O.core,sm(t,0.86,0.99)*1.1,0,1);
  }
  if((BX.t>=tgt-1e-6)!==was || frameNo%15===0) bxPanel();
}
function bxGo(d){ BX.stage=THREE.MathUtils.clamp(BX.stage+d,1,BX.n||3); bxPanel(); }
$('#ercp-go').addEventListener('click',()=>{ BX.on&&BX.mode==='ercp'?bxStop():bxStart('ercp'); });
$('#tace-go').addEventListener('click',()=>{ BX.on&&BX.mode==='tace'?bxStop():bxStart('tace'); });
$('#resect-go').addEventListener('click',()=>{ BX.on&&BX.mode==='resect'?bxStop():bxStart('resect'); });
$('#bx-tj').addEventListener('click',()=>{ BX.on&&BX.mode==='tj'?bxStop():bxStart('tj'); });
$('#bx-pc').addEventListener('click',()=>{ BX.on&&BX.mode==='pc'?bxStop():bxStart('pc'); });
$('#bx-x').addEventListener('click',bxStop);
$('#bx-next').addEventListener('click',()=>bxGo(1));
$('#bx-prev').addEventListener('click',()=>bxGo(-1));
$('#bx-replay').addEventListener('click',()=>{ const m=BX.mode; bxStop(); bxStart(m); });
function hvpgBuild(){
  const u=tiers[0].inner.userData, K=u.K, ivc=K.HVsegs.find(s=>s.name==='IVC').pts;
  const top=ivc[0], dn=ivc[1].clone().sub(top).normalize();
  const ent=top.clone().addScaledVector(dn,-0.55), rc=new THREE.CatmullRomCurve3(K.rhv);
  const pts=[ent, top.clone().addScaledVector(dn,-0.2), top, top.clone().lerp(K.OST,0.5), K.OST.clone(),
             rc.getPointAt(0.10), rc.getPointAt(0.20), rc.getPointAt(0.27)];
  HVPG.path=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  { const L=HVPG.path.getLengths(400), tot=L[400]; let k=0; const want=HVPG.path.getLength()*0;
    // arc fraction at the ostium (control point 4 of 7)
    HVPG.uOst=L[Math.round(4/7*400)]/tot; }
  const g=new THREE.Group(); g.name='hvpg';
  HVPG.cMat=mat(0xE9EEF2,{roughness:0.28,clearcoat:0.9,emissive:new THREE.Color(0xE9EEF2).multiplyScalar(0.28)});
  HVPG.tip=tag(new THREE.Mesh(new THREE.SphereGeometry(0.017,14,10),mat(0x2B2F36,{roughness:0.3,clearcoat:0.8})),'HVPG catheter (radio-opaque tip)');
  HVPG.bal=tag(new THREE.Mesh(new THREE.SphereGeometry(1,24,16),mat(0xF2D27A,{roughness:0.2,clearcoat:1,opacity:0.8,
    emissive:new THREE.Color(0xF2D27A).multiplyScalar(0.3)})),'Occlusion balloon (wedged position)');
  HVPG.bal.visible=false; g.add(HVPG.tip); g.add(HVPG.bal);
  g.userData.noAO=true; tiers[0].inner.add(g); HVPG.grp=g;
}
function hvpgTube(s){
  if(Math.abs(s-HVPG.lastS)<0.004) return; HVPG.lastS=s;
  if(HVPG.tube){ HVPG.grp.remove(HVPG.tube); HVPG.tube.geometry.dispose(); HVPG.tube=null; }
  if(s<0.01) { HVPG.tip.visible=false; return; }
  const n=Math.max(6,Math.round(60*s)), pts=[]; for(let i=0;i<=n;i++) pts.push(HVPG.path.getPointAt(s*i/n));
  HVPG.tube=tag(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.max(12,n*2),0.014,10,false),HVPG.cMat),'HVPG balloon catheter');
  HVPG.grp.add(HVPG.tube);
  HVPG.tip.visible=true; HVPG.tip.position.copy(pts[pts.length-1]);
}
function hvpgStart(){
  if(!tiers[0].built) return;
  bxStop();
  if(!HVPG.path) hvpgBuild();
  Object.assign(HVPG,{on:true,t:0,stage:1,F:null,W:null,dispW:null,trace:[],tAcc:0,lastS:-1});
  HVPG.grp.visible=true; HVPG.bal.visible=false;
  // see the catheter inside the liver and the hepatic veins
  HVPG.prevLayers={parenchyma:state.layers.parenchyma,hepaticVein:state.layers.hepaticVein};
  if(state.layers.parenchyma==='solid') state.layers.parenchyma='ghost';
  if(state.layers.hepaticVein==='on') state.layers.hepaticVein='ghost';
  applyModes();
  $('#hvpg').hidden=false; $('#hvpg-btn').dataset.on='1'; $('#hvpg-btn').textContent='End HVPG measurement';
  hvpgPanel();
}
function hvpgStop(){
  if(!HVPG.on) return;
  HVPG.on=false; if(HVPG.grp) HVPG.grp.visible=false;
  if(HVPG.tube){ HVPG.grp.remove(HVPG.tube); HVPG.tube.geometry.dispose(); HVPG.tube=null; }
  if(HVPG.prevLayers){ Object.assign(state.layers,HVPG.prevLayers); HVPG.prevLayers=null; applyModes(); }
  $('#hvpg').hidden=true; $('#hvpg-btn').dataset.on='0'; $('#hvpg-btn').textContent='Measure HVPG';
}
function hvpgInterp(h){
  return h<=5?'Normal (≤5 mmHg)' : h<10?'Subclinical portal hypertension (6–9 mmHg)'
    : h<12?'Clinically significant portal hypertension (≥10 mmHg)' : 'CSPH ≥12 mmHg: risk of variceal bleeding and decompensation';
}
function hvpgPanel(){
  const st=HVPG.stage, T=hvpgTargets(), S=state.path, E=hvpgEnds(), done=HVPG.t>=E[st]-1e-6;
  $('#hvpg-prev').disabled=st<=1;
  $('#hvpg-next').disabled=st>=3 || !done || (HVPG.blocked&&st>=2);
  $('#hv-st').textContent=`Stage ${st} of 3 · `+(done?(st<3&&!(HVPG.blocked&&st>=2)?'complete — press Next':'complete'):'in progress…');
  document.querySelectorAll('#hvpg .hst').forEach((el,i)=>{ el.dataset.s = i+1<st?'done':i+1===st?'now':'todo'; });
  const f=HVPG.F, w=HVPG.dispW;
  $('#hv-f').textContent = f==null?'—':Math.round(f)+' mmHg';
  $('#hv-w').textContent = HVPG.blocked?'not obtainable' : w==null?'—':Math.round(w)+' mmHg';
  const h = (f!=null&&w!=null&&!HVPG.blocked) ? Math.round(w)-Math.round(f) : null;
  $('#hv-h').textContent = HVPG.blocked?'not measurable' : h==null?'—':h+' mmHg';
  let note='';
  if(HVPG.blocked && st>=2) note='The right hepatic vein is occluded (Budd–Chiari): it cannot be cannulated, so HVPG cannot be measured.';
  else if(h!=null){ note=hvpgInterp(h)+(S.tips?' — measured with a TIPSS in place.':'.');
    if(S.pvt!=='none') note+=' PVT is pre-hepatic: the wedge reflects sinusoidal pressure, so HVPG underestimates the portal pressure.';
    if(S.bcs==='ivc') note+=' IVC obstruction raises the free pressure; interpret with caution.'; }
  $('#hv-note').textContent=note; $('#hv-note').hidden=!note;
}
function hvpgPressure(t){          // what the transducer reads now (mmHg), with respiratory and cardiac swing
  const T=hvpgTargets(), resp=Math.sin(t*Math.PI*2/4.2), card=Math.sin(t*Math.PI*2*1.15);
  const ra=4+(state.path.tips?2:0);
  if(HVPG.stage===1) return ra+1.1*resp+0.9*card;
  if(HVPG.stage===2) return T.F+0.9*resp+0.35*card;
  const k=HVPG.blocked?0:1-Math.exp(-Math.max(0,HVPG.t-(HV_T.s1+HV_T.s2a+HV_T.s2b+HV_T.s3a))/0.7);
  const W=HVPG.dispW!=null?HVPG.dispW:T.W;
  return T.F+(W-T.F)*k+(0.9-0.6*k)*resp+0.3*(1-k)*card;
}
function hvpgEnds(){ const P=HV_T, e1=P.s1, e2=e1+P.s2a+P.s2b; return [0,e1,e2,e2+P.s3a+P.s3b]; }
function hvpgGo(d){
  if(!HVPG.on) return; const E=hvpgEnds(), st=HVPG.stage+d;
  if(st<1||st>3) return;
  if(d>0){ if(HVPG.t<E[HVPG.stage]-1e-6 || (HVPG.blocked&&st===3)) return; HVPG.stage=st; }
  else { HVPG.stage=st; HVPG.t=E[st];                                  // back: that stage, as completed
    if(st<3){ HVPG.dispW=null; } if(st<2){ HVPG.F=null; } }
  hvpgPanel();
}
function hvpgTick(dt){
  if(!HVPG.on) return;
  $('#hvpg').hidden = shownTier!==0;
  const T=hvpgTargets(), P=HV_T, E=hvpgEnds(), stage=HVPG.stage;
  HVPG.blocked=T.blocked;
  // the clock runs only to the end of the current stage; "Next stage" moves on
  HVPG.t=Math.min(HVPG.t+dt,E[stage]); const t=HVPG.t; HVPG.clk=(HVPG.clk||0)+dt;
  const e1=E[1], e2a=e1+P.s2a, e2b=E[2], e3a=e2b+P.s3a, e3b=E[3];
  const sm=THREE.MathUtils.smoothstep;
  let s;
  if(stage===1) s=HVPG.uOst*sm(t,0,e1);
  else if(T.blocked) s=HVPG.uOst;
  else if(stage===2) s=HVPG.uOst+(1-HVPG.uOst)*sm(t,e1,e2a);
  else s=1;
  hvpgTube(s);
  if(!T.blocked && t>=e2b && HVPG.F==null) HVPG.F=T.F;
  if(HVPG.F!=null) HVPG.F+= (T.F-HVPG.F)*Math.min(1,dt*1.5);
  // balloon: inflates just behind the tip to the calibre of the vein
  const inflate=T.blocked?0:sm(t,e2b,e3a);
  HVPG.bal.visible=inflate>0.01;
  if(HVPG.bal.visible){ const tg=HVPG.path.getTangentAt(0.985), c=HVPG.path.getPointAt(0.95);
    const r=0.050*inflate+0.012; HVPG.bal.position.copy(c);
    HVPG.bal.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tg); HVPG.bal.scale.set(r,r*2.3,r); }
  if(!T.blocked && t>=e3b){ HVPG.dispW = HVPG.dispW==null ? T.W : HVPG.dispW+(T.W-HVPG.dispW)*Math.min(1,dt*1.2); }
  else if(!T.blocked && t>=e3a && HVPG.dispW==null){ /* rising: shown on the trace, value filled at plateau */ }
  // trace
  HVPG.tAcc+=dt; while(HVPG.tAcc>0.05){ HVPG.tAcc-=0.05; HVPG.trace.push(hvpgPressure(HVPG.clk)); if(HVPG.trace.length>160) HVPG.trace.shift(); }
  if(frameNo%3===0){ hvpgPanel(); hvpgDraw(); }
}
function hvpgDraw(){
  const cv=$('#hv-trace'), c=cv.getContext('2d'), W=cv.width, H=cv.height, max=32;
  c.clearRect(0,0,W,H);
  c.strokeStyle='rgba(255,255,255,.08)'; c.lineWidth=1; c.font='9px IBM Plex Mono, monospace'; c.fillStyle='rgba(200,210,220,.45)';
  for(const v of [0,10,20,30]){ const y=H-4-(v/max)*(H-10); c.beginPath(); c.moveTo(22,y); c.lineTo(W,y); c.stroke(); c.fillText(String(v),2,y+3); }
  const tr=HVPG.trace; if(tr.length<2) return;
  c.strokeStyle=HVPG.stage===3?'#F2D27A':'#8FD3A8'; c.lineWidth=1.6; c.beginPath();
  tr.forEach((v,i)=>{ const x=22+(W-24)*i/159, y=H-4-(Math.max(0,Math.min(max,v))/max)*(H-10); i?c.lineTo(x,y):c.moveTo(x,y); });
  c.stroke();
}

/* ════════════ illustrative clinical readout: one example patient generated from the model state ════════════
   Labs follow the fibrosis slider (synthetic failure only in the cirrhotic range), portal pressure (platelets,
   ascites), biliary obstruction (bilirubin), outflow block, TIPSS and acute zonal injury. Scores use the published
   formulas; the inputs are illustrative. Non-invasive tests: Baveno VII/VIII "rule of five" for liver stiffness and
   the 15/150 rule; MASLD fibrosis pathway (FIB-4 → VCTE, EASL–EASD–EASO 2024; ELF, NICE NG49). */
const CLIN_AGE=55;
function clinLabs(){
  const f=state.fibrosis, S=state.path, sm=THREE.MathUtils.smoothstep;
  const dec=sm(f,0.82,1.0), O=(typeof BIL!=='undefined'&&BIL.O)||{}, bcs=S.bcs!=='none';
  let obs=0; if(O.mainBlocked) obs=1; else if(O.dilR&&O.dilL) obs=0.7; else if(O.dilR||O.dilL) obs=0.25; if(O.psc) obs=Math.max(obs,0.15);
  const z=S.zonal;
  let bili=10+32*Math.pow(dec,1.4)+170*obs+(bcs?12:0);
  let alb=43-15*dec-(bcs?3:0);
  let inr=1.0+0.75*Math.pow(dec,1.3)+(bcs?0.15:0);
  let creat=72+45*Math.pow(dec,2);
  let na=140-9*dec-(bcs?2:0);
  let ast=24+30*f+(S.mash?18:0)+4*S.masld+22*obs, alt=26+9*S.masld+(S.mash?24:0)+10*f-10*dec+30*obs;
  if(z==='apap'){ ast=3800; alt=4200; inr=Math.max(inr,2.4); bili=Math.max(bili,38); creat=Math.max(creat,130); }
  if(z==='ischaemic'){ ast=4500; alt=2600; inr=Math.max(inr,1.9); creat=Math.max(creat,160); }
  if(z==='congestive'){ ast=Math.max(ast,70); alt=Math.max(alt,60); bili=Math.max(bili,30); }
  if(z==='aih'){ ast=Math.max(ast,420); alt=Math.max(alt,560); }
  if(z==='yf'){ ast=Math.max(ast,2200); alt=Math.max(alt,1400); bili=Math.max(bili,90); }
  const ppgEff=S.tips?0.95*HEMO.ppgNat:HEMO.ppgNat;                    // hypersplenism improves only a little after TIPSS
  const plt=Math.round(250-150*sm(ppgEff,6,22));
  const asc0=Math.max(sm(HEMO.ppgNat,11,20)*sm(f,0.75,1), bcs?0.8:0), asc=S.tips?asc0*0.35:asc0;
  const he=Math.max(sm(dec,0.6,1)*0.8, S.tips?0.5:0);
  // liver stiffness (VCTE): fibrosis stage, plus the confounders that raise it independently of fibrosis
  const P=[[0,4.6],[0.12,5.5],[0.34,7.4],[0.58,10.2],[0.82,15.5],[0.9,21],[1,34]];
  let lsm=P[P.length-1][1]; for(let i=1;i<P.length;i++) if(f<=P[i][0]){ const [x0,y0]=P[i-1],[x1,y1]=P[i]; lsm=y0+(y1-y0)*(f-x0)/(x1-x0); break; }
  const conf=[]; if(bcs){ lsm+=14; conf.push('venous congestion'); } if(obs>0.2){ lsm+=6*obs; conf.push('cholestasis'); }
  if(alt>150){ lsm+=Math.min(12,alt/300); conf.push('hepatitic flare'); }
  const elf=7.6+4.6*Math.pow(f,1.3)+(S.mash?0.3:0);
  const acute=['apap','ischaemic','yf','aih'].includes(z);
  return {bili,alb,inr,creat,na,ast,alt,plt,asc,he,lsm,conf,elf,obs,acute,bcs,chronic:f>=0.82};
}
function clinScores(L){
  const pt=(v,a,b)=>v<a?1:v<=b?2:3;
  const cpB=L.bili<34?1:L.bili<=50?2:3, cpA=L.alb>35?1:L.alb>=28?2:3, cpI=L.inr<1.7?1:L.inr<=2.3?2:3;
  const cpAs=L.asc<0.2?1:L.asc<0.6?2:3, cpH=L.he<0.25?1:L.he<0.75?2:3;
  const cp=cpB+cpA+cpI+cpAs+cpH, cpc=cp<=6?'A':cp<=9?'B':'C';
  const b=Math.max(1,L.bili/17.1), c=Math.min(4,Math.max(1,L.creat/88.4)), i=Math.max(1,L.inr);
  let meld=Math.round(3.78*Math.log(b)+11.2*Math.log(i)+9.57*Math.log(c)+6.43);
  let meldna=meld; if(meld>11){ const n=Math.min(137,Math.max(125,L.na)); meldna=Math.round(meld+1.32*(137-n)-0.033*meld*(137-n)); }
  const ukeld=Math.round(5.395*Math.log(L.inr)+1.485*Math.log(L.creat)+3.13*Math.log(L.bili)-81.565*Math.log(L.na)+435);
  const albi=Math.log10(L.bili)*0.66-0.085*L.alb, albiG=albi<=-2.60?1:albi<=-1.39?2:3;
  const fib4=CLIN_AGE*L.ast/(L.plt*Math.sqrt(L.alt));
  return {cp,cpc,meld,meldna,ukeld,albi,albiG,fib4};
}
function clinBaveno(L){
  const l=L.lsm, p=L.plt;
  if(L.conf.length) return {acld:'not interpretable: '+L.conf.join(' and ')+(L.conf.length>1?' raise':' raises')+' stiffness', csph:{t:'not interpretable until the confounder settles',s:'warn'}};
  const acld = l<10?'cACLD unlikely (<10 kPa)' : l<15?'cACLD suggestive (10–15 kPa)' : 'cACLD highly suggestive (≥15 kPa)';
  let csph;
  if(l<=15&&p>=150) csph={t:'CSPH ruled out (≤15 kPa and platelets ≥150)',s:''};
  else if(l>=25) csph={t:'CSPH ruled in (≥25 kPa)',s:'crit'};
  else if((l>=20&&p<150)||(l>=15&&p<110)) csph={t:'CSPH likely (~60%): 20–25 kPa with platelets <150, or 15–20 kPa with <110',s:'warn'};
  else csph={t:'Grey zone: consider spleen stiffness or HVPG',s:'warn'};
  return {acld,csph};
}
const clinF1=x=>x.toFixed(1), clinI0=x=>String(Math.round(x));
function clinUpdate(){
  const L=clinLabs(), Sc=clinScores(L), B=clinBaveno(L), S=state.path;
  // sim bar
  const el=$('#r-lsm'); if(el){ el.textContent=clinF1(L.lsm)+' kPa'; el.dataset.s=L.lsm>=25?'crit':L.lsm>=10?'warn':''; }
  const ep=$('#r-plt'); if(ep){ ep.textContent=L.plt+' ×10⁹/L'; ep.dataset.s=L.plt<100?'crit':L.plt<150?'warn':''; }
  const ec=$('#r-cp'); if(ec){ ec.textContent=Sc.cpc+Sc.cp+' · MELD-Na '+Sc.meldna; ec.dataset.s=Sc.cpc==='C'?'crit':Sc.cpc==='B'?'warn':''; }
  // panel: labs, scores, non-invasive tests
  const asc=L.asc<0.2?'none':L.asc<0.6?'mild':'moderate–severe', he=L.he<0.25?'none':L.he<0.75?'grade 1–2':'grade 3–4';
  const w=(v,lo,hi)=>v<lo||v>hi?'warn':'';
  const R=$('#clin-read'); if(R) R.innerHTML=
    `<span>Bilirubin</span><b data-s="${L.bili>34?(L.bili>50?'crit':'warn'):''}">${clinI0(L.bili)} µmol/L</b>`+
    `<span>Albumin</span><b data-s="${L.alb<35?(L.alb<28?'crit':'warn'):''}">${clinI0(L.alb)} g/L</b>`+
    `<span>INR</span><b data-s="${L.inr>1.3?(L.inr>2.3?'crit':'warn'):''}">${L.inr.toFixed(2)}</b>`+
    `<span>Creatinine</span><b data-s="${w(L.creat,45,110)}">${clinI0(L.creat)} µmol/L</b>`+
    `<span>Sodium</span><b data-s="${L.na<135?'warn':''}">${clinI0(L.na)} mmol/L</b>`+
    `<span>Platelets</span><b data-s="${L.plt<150?(L.plt<100?'crit':'warn'):''}">${L.plt} ×10⁹/L</b>`+
    `<span>AST / ALT</span><b data-s="${L.alt>200||L.ast>200?'crit':(L.alt>40||L.ast>40?'warn':'')}">${clinI0(L.ast)} / ${clinI0(L.alt)} U/L</b>`+
    `<span>Ascites</span><b data-s="${L.asc>=0.2?'warn':''}">${asc}</b>`+
    `<span>Encephalopathy</span><b data-s="${L.he>=0.25?'warn':''}">${he}</b>`;
  const Q=$('#clin-scores'); if(Q) Q.innerHTML=
    `<span>Child–Pugh</span><b data-s="${Sc.cpc==='C'?'crit':Sc.cpc==='B'?'warn':''}">${Sc.cpc} (${Sc.cp})</b>`+
    `<span>MELD / MELD-Na</span><b data-s="${Sc.meldna>=20?'crit':Sc.meldna>=15?'warn':''}">${Sc.meld} / ${Sc.meldna}</b>`+
    `<span>UKELD</span><b data-s="${L.chronic&&Sc.ukeld>=49?'crit':''}">${Sc.ukeld}${!L.chronic?' · applies to chronic liver disease only':Sc.ukeld>=49?' · ≥49: meets UK elective listing threshold':''}</b>`+
    `<span>ALBI</span><b data-s="${Sc.albiG===3?'crit':Sc.albiG===2?'warn':''}">${Sc.albi.toFixed(2)} · grade ${Sc.albiG}</b>`+
    ((!L.chronic||L.acute||L.obs>0.2)?`<span>Note</span><b data-s="warn">Child–Pugh, MELD and ALBI are validated in chronic liver disease${L.acute?'; in acute liver injury use the King’s College criteria':L.obs>0.2?'; here bilirubin reflects obstruction':''}</b>`:'');
  const N=$('#clin-nit'); if(N) N.innerHTML=
    `<span>Liver stiffness</span><b data-s="${L.lsm>=25?'crit':L.lsm>=10?'warn':''}">${clinF1(L.lsm)} kPa</b>`+
    `<span>cACLD</span><b data-s="${L.lsm>=15?'warn':''}">${B.acld}</b>`+
    `<span>CSPH</span><b data-s="${B.csph.s}">${B.csph.t}</b>`;
  // MASLD pathway
  const M=$('#masld-read'); if(M&&(L.acute||L.obs>0.2||L.bcs)){ M.innerHTML=`<span>FIB-4 / VCTE / ELF</span><b data-s="warn">not valid during ${L.acute?'acute hepatitis':L.obs>0.2?'biliary obstruction':'venous outflow obstruction'}</b>`; }
  else if(M){ const f4=Sc.fib4, lo=CLIN_AGE>=65?2.0:1.3;
    const band=f4<lo?['low risk: reassess in 1–3 years','']:f4<=2.67?['indeterminate: second-line test','warn']:['high risk: second-line test / refer','crit'];
    const v=L.lsm<8?['<8 kPa: low risk, manage in primary care','']:L.lsm<12?['8–12 kPa: indeterminate, specialist assessment','warn']:['≥12 kPa: high risk of advanced fibrosis, refer to hepatology','crit'];
    const e=L.elf>=10.51?['≥10.51: advanced fibrosis, refer','crit']:['<10.51: advanced fibrosis unlikely, retest in 3 years',''];
    M.innerHTML=`<span>FIB-4 (age ${CLIN_AGE})</span><b data-s="${band[1]}">${f4.toFixed(2)} · ${band[0]}</b>`+
      `<span>VCTE (EASL–EASD–EASO)</span><b data-s="${f4<lo?'':v[1]}">${f4<lo?'not needed (FIB-4 low)':clinF1(L.lsm)+' kPa · '+v[0]}</b>`+
      `<span>ELF (NICE NG49)</span><b data-s="${e[1]}">${L.elf.toFixed(2)} · ${e[0]}</b>`; }
}

function pathTick(dt){
  const t=tiers[0]; if(!t.built) return;
  const u=t.inner.userData, P=u.P, a=Math.min(1,dt*1.3), a2=Math.min(1,dt*2.2);
  if(!BIL.ready){ bilPrepare(P); pathTargets(); }
  const L=u.L, ghostP=state.layers.portal==='ghost', gP=ghostP?0.5:1;
  // collaterals grow from their source along their length, then thicken
  for(const k in P.cols){ const G=P.cols[k]; G.open+=(G.target-G.open)*a;
    const vis=G.open>0.012;
    for(const m of G.meshes){ m.visible=vis; if(vis) deployMeta(m,G.open*1.35,0.2,0.55+0.45*G.open);
      m.material.userData.baseOpacity=Math.min(1,G.open*2.2)*(G.parent===L.portal?gP:1); }
    if(G.extra) for(const e of G.extra){ e.visible=vis; e.material.userData.baseOpacity=Math.min(1,G.open*2); }
  }
  // thrombi
  for(const k of ['acute','partial','chronic','smv']){
    const cur=pathCur.pvt, tg=pathCur.pvtT?.[k]||0; cur[k]+=(tg-cur[k])*a2;
    const m=P.thr[k]; m.visible=cur[k]>0.01; if(m.visible){ deployMeta(m,cur[k]*1.12,0,1); m.material.userData.baseOpacity=Math.min(1,cur[k]*3); }
  }
  if(P.thr.smv.visible){ const ch=pathCur.smvChronic; P.thr.smv.material.color.setHex(ch?0xB5A597:0x6E1A26); P.thr.smv.material.emissive.setHex(ch?0x2A2622:0x1F070B); }
  // TIPSS is placed from above: the sheath runs from the right internal jugular vein down the IVC into the right
  // hepatic vein, the needle and wire cross the parenchyma into the right portal vein, and the stent is released
  // over the wire (bare portal end first, then the covered part back to the hepatic vein); the sheath then withdraws
  const tOn=(pathCur.tipsT||0)>0.5;
  pathCur.tseq=THREE.MathUtils.clamp((pathCur.tseq||0)+(tOn?dt/7:-dt*2),0,1);
  const sq=pathCur.tseq, smq=THREE.MathUtils.smoothstep;
  pathCur.tips = tOn ? smq(sq,0.52,0.90) : Math.min(pathCur.tips,sq);
  const td=pathCur.tips; P.tips.group.visible=td>0.01||(tOn&&sq>0.001);
  if(P.tips.cath){ P.tips.cath.visible=tOn&&sq<0.95; if(P.tips.cath.visible) deployMeta(P.tips.cath,smq(sq,0.02,0.48)*1.05,0,1); }
  if(P.tips.group.visible){ deployMeta(P.tips.wire,td*1.08,0.16,1); deployMeta(P.tips.cover,td*1.08,0.14,1);
    P.tips.wire.material.userData.baseOpacity=Math.min(1,td*4); P.tips.cover.material.userData.baseOpacity=0.42*Math.min(1,td*4);
    P.tips.marker.material.userData.baseOpacity=Math.min(1,td*4); }
  // the right hepatic vein is held open around the stent (the stent lies inside the vein, not through its wall)
  if(u.hvMesh&&u.hvMesh.userData.mo){ const M=u.hvMesh, mo=M.userData.mo;
    if(!P.tips.vIdx){ const S=[], n=mo.P0.length/3, c=P.tips.curve, L=c.getLength(), N=Math.ceil(L*(1-P.tips.uJ)/0.006);
      for(let i=0;i<=N;i++) S.push(c.getPointAt(P.tips.uJ+(1-P.tips.uJ)*i/N));
      const out=[], q=new THREE.Vector3(), p0=new THREE.Vector3();
      for(let v=0;v<n;v++){ q.fromArray(mo.ctr,v*3); let near=false; for(const s of S){ if(s.distanceToSquared(q)<0.0004){ near=true; break; } }
        if(!near) continue; const r0=p0.fromArray(mo.P0,v*3).distanceTo(q); if(r0>1e-4&&r0<0.060) out.push([v,0.060/r0]); }
      P.tips.vIdx=out; }
    const key=td.toFixed(2);
    if(key!==P.tips.vKey){ P.tips.vKey=key; const Kv=P.tips.vK||(P.tips.vK=new Float32Array(mo.P0.length/3).fill(1));
      const g=Math.min(1,td*1.25); for(const [v,k] of P.tips.vIdx) Kv[v]=1+(k-1)*g; scaleMeta(M,Kv); metaNormals(M); M.geometry.computeBoundingSphere(); } }
  // Budd–Chiari
  pathCur.hv+=((pathCur.hvT||0)-pathCur.hv)*a2; P.bcs.hv.visible=pathCur.hv>0.01;
  if(P.bcs.hv.visible){ deployMeta(P.bcs.hv,pathCur.hv*1.1,0,1); P.bcs.hv.material.userData.baseOpacity=Math.min(1,pathCur.hv*3); }
  pathCur.web+=((pathCur.webT||0)-pathCur.web)*a2; P.bcs.web.visible=pathCur.web>0.01;
  if(P.bcs.web.visible){ P.bcs.web.scale.setScalar(Math.max(0.01,pathCur.web)); P.bcs.web.children.forEach(c=>c.material.userData.baseOpacity=Math.min(1,pathCur.web*2)); }
  // parenchymal morph + colour
  const m=P.m; let ch=false, mov=false;
  for(const k of ['caud','cong','fat','iron']){ const tg=m[k+'T']||0, d=tg-m[k];
    if(Math.abs(d)>0.002){ m[k]+=d*Math.min(1,dt*1.1); ch=true; mov=true; } else if(m[k]!==tg){ m[k]=tg; ch=true; } }
  if(ch && u.cz && (!mov || frameNo%2===0)) surfaceUpdate(u);
  // spleen size
  m.spl+=((m.splT||0)-m.spl)*a; const ss=1+0.32*m.spl; P.K.spleen.scale.setScalar(ss);
  // portal trunk, SMV and splenic vein: up to ~1.4x calibre as the gradient rises from 10 to 22 mmHg (TIPSS lowers it)
  m.pvd=(m.pvd||0)+(THREE.MathUtils.smoothstep(HEMO.ppg,10,22)-(m.pvd||0))*a;
  m.pvu=(m.pvu||0)+(({none:0,partial:0.35,acute:1,chronic:0.75})[state.path.pvt]-(m.pvu||0))*a;
  { const M=u.portalMeshes[0], kt=1+0.40*m.pvd, ku=Math.max(kt,1+0.55*m.pvu), key=kt.toFixed(3)+'|'+ku.toFixed(3);
    if(key!==M.userData.pkKey){ M.userData.pkKey=key; M.userData.pk=kt; M.userData.pku=ku;
      const B=M.userData.mo.bt, n=B.length/2, Kv=M.userData.pkArr||(M.userData.pkArr=new Float32Array(n));
      const up=M.userData.upSeg||(M.userData.upSeg=M.userData.segNames.map(s=>/Superior mesenteric|Splenic|Inferior mesenteric/.test(s)));
      const nm=M.userData.segNames, nE=M.userData.nExt, sm=THREE.MathUtils.smoothstep;
      for(let v=0;v<n;v++){ const si=B[v*2+1]|0, t=B[v*2];
        Kv[v] = si<nE ? (up[si]?ku : nm[si]==='Portal trunk' ? ku+(kt-ku)*sm(t,0,0.2) : kt)
                      : (nm[si]==='Right portal vein'||nm[si]==='Left portal vein') ? kt+(1-kt)*sm(t,0,0.6) : 1; }
      scaleMeta(M,Kv); metaNormals(M); M.geometry.computeBoundingSphere(); P.pflow.rk=kt; } }
  // walls stay opaque when the layer is On; Ghost (layer bar) is the only thing that makes them translucent
  const pw=ghostP?0.28:1;
  u.portalMeshes.forEach(M=>{ M.material.userData.baseOpacity=pw; M.material.emissiveIntensity=ghostP?1.8:1; });
  if(u.hvMesh) u.hvMesh.material.userData.baseOpacity=1;
  // biliary: dilatation / beading, stones, stents (ducts stay opaque)
  if(BIL.ready){
    m.bil+=((m.bilT||0)-m.bil)*a;
    for(const I of BIL.items){ I.it.m.material.userData.baseOpacity=1;
      if(!I.dirty) continue; let moving=false;
      for(let v=0;v<I.n;v++){ const d=I.Kt[v]-I.K[v]; if(Math.abs(d)>0.002){ I.K[v]+=d*Math.min(1,dt*1.6); moving=true; } else I.K[v]=I.Kt[v]; }
      scaleMeta(I.it.m,I.K); if(!moving||frameNo%6===0) metaNormals(I.it.m,I.it.kind!=='gb'); if(!moving) I.dirty=false; }
    const O=BIL.O||{};
    const fadeIn=(o,on)=>{ if(!o.userData.ownMat){ o.userData.ownMat=true; o.traverse(c=>{ if(c.material){ c.material=c.material.clone(); registerFade(c); } }); }
      o.userData.f=(o.userData.f||0)+((on?1:0)-(o.userData.f||0))*a2; o.visible=o.userData.f>0.02;
      o.traverse(c=>{ if(c.material) c.material.userData.baseOpacity=Math.min(1,o.userData.f*1.5); }); o.scale.setScalar(0.6+0.4*o.userData.f); };
    fadeIn(P.bil.gbStones,O.gbStones); fadeIn(P.bil.cbdStones,O.stones); fadeIn(P.bil.mirizzi,state.path.bil.cause==='mirizzi');
    { const bx=bilExtras(P); fadeIn(bx.strict,state.path.bil.cause==='stricture'); fadeIn(bx.cc2,O.cc==='II'); fadeIn(bx.cc3,O.cc==='III'); }
    if(P.bil.stents&&P.bil.stents.length){ P.bil.sd+=(1-P.bil.sd)*Math.min(1,dt*0.9);
      const st=state.path.bil.stent, km=(st==='sems'||st==='bilateral')?0.15:0;
      for(const s of P.bil.stents) deployMeta(s,P.bil.sd*1.08,km,1,st!=='ptc');   // stents open from the duct end down to the duodenum; PTC from the skin in
      if(st==='ptc'&&P.bil.ptcExtras) P.bil.ptcExtras.forEach(e=>{ e.visible=P.bil.sd>0.04; }); }
    if(P.pds&&P.pds.m){ P.pds.d+=(1-P.pds.d)*Math.min(1,dt*0.9); deployMeta(P.pds.m,P.pds.d*1.08,state.path.pds==='plastic'?0:0.15,1,true); }
  }
  pancTick(P,dt);
  // flow
  const vv=state.flow?0.26*(1-0.35*state.fibrosis):0;
  if(!P.pflow.radius){ const look=vesselRadiusLookup([L.portal,L.hepaticVein]); P.pflow.radius=look; P.hflow.radius=look; }
  P.pflow.scale=u.flowScale||1; P.pflow.update(dt,vv); P.hflow.update(dt,vv*0.9);
}
/* ════════════ pathology engine: microscopic scales (zonal painting) ════════════ */
const DOT_NAMES=['','Fat droplets (macrovesicular steatosis)','Haemosiderin (iron) granules','Inflammatory cells',
  'Lymphoplasmacytic infiltrate (interface hepatitis)','Sinusoidal congestion (red cells)','Councilman (acidophil) body'];
const DOT_COL=[0xffffff,0xF4EBD2,0xD08E30,0x9A7CF0,0x6E6CE8,0xB0242C,0xFF8FA6].map(c=>new THREE.Color(c));
const ZC={fat:new THREE.Color(0xE2C48E),bal:new THREE.Color(0xE8CDB8),nec:new THREE.Color(0xE7B9AE),
  haem:new THREE.Color(0x4C0F18),iron:new THREE.Color(0x7E4B1C)};
/* one zonal field for every scale: z = 0 periportal (zone 1) → 1 pericentral (zone 3) */
function zfield(z,base,out){
  const S=state.path, sm=THREE.MathUtils.smoothstep, g=S.masld;
  out.c.copy(base); out.s=1; out.d.fill(0);
  if(g>0){ const t0=1-g/3, w=sm(z,t0-0.1,t0+0.06); out.c.lerp(ZC.fat,0.55*w); out.s*=1+0.30*w; out.d[1]=0.85*w; }
  if(S.mash){ const w=sm(z,0.55,0.8); out.c.lerp(ZC.bal,0.35*w); out.s*=1+0.25*w; out.d[3]+=0.25*w; }
  switch(S.zonal){
    case 'apap':{ const w=sm(z,0.55,0.72); out.c.lerp(ZC.nec,0.85*w); out.s*=1-0.55*w; out.d[3]+=0.14*sm(z,0.42,0.58)*(1-0.6*w); break; }
    case 'ischaemic':{ const w=sm(z,0.58,0.75); out.c.lerp(ZC.nec,0.8*w); out.s*=1-0.55*w; break; }
    case 'congestive':{ const w=sm(z,0.45,0.78); out.c.lerp(ZC.haem,0.85*w); out.s*=1-0.35*w; out.d[5]=0.95*w; break; }
    case 'iron':{ const w=1-sm(z,0.18,0.75); out.c.lerp(ZC.iron,0.45*w); out.d[2]=0.95*w; break; }
    case 'aih':{ const w=1-sm(z,0.06,0.24); out.c.lerp(ZC.nec,0.6*w); out.s*=1-0.4*w; out.d[4]=1.0*(1-sm(z,0.12,0.42))+0.06; break; }
    case 'yf':{ const w=sm(z,0.28,0.40)*(1-sm(z,0.60,0.72)); out.c.lerp(ZC.nec,0.85*w); out.s*=1-0.5*w; out.d[6]=0.35*w; break; }
  }
  if(S.bcs!=='none' && S.zonal!=='congestive'){ const w=sm(z,0.45,0.78); out.c.lerp(ZC.haem,0.8*w); out.s*=1-0.3*w; out.d[5]=Math.max(out.d[5],0.9*w); }
  return out;
}
const ZF={c:new THREE.Color(),s:1,d:new Float32Array(7)};
const DOT_ORDER=[5,1,2,4,6,3];
function pickDot(d,r){ for(const t of DOT_ORDER){ if(r[t%4]<d[t]) return t; } return 0; }
function zoneBase(zc,z){ const c=new THREE.Color(); return z<0.5?c.copy(zc[0]).lerp(zc[1],z*2):c.copy(zc[1]).lerp(zc[2],(z-0.5)*2); }
function microTargets(){
  const S=state.path, anyZ=S.masld>0||S.mash||S.zonal!=='none'||S.bcs!=='none';
  const cong=(S.bcs!=='none'||S.zonal==='congestive')?1:0;
  const lob=tiers[1].built?tiers[1].inner.userData:null;
  if(lob){ const n=lob.cb.len.length, N=lob.dz.length;
    if(!lob.cur){ lob.cur={c:new Float32Array(n*3),s:new Float32Array(n).fill(1),dc:new Float32Array(N*3).fill(1),ds:new Float32Array(N)};
      for(let i=0;i<n;i++){ const c=zoneBase(lob.zc,lob.cb.z[i]); lob.cur.c.set([c.r,c.g,c.b],i*3); } }
    lob.tg={c:new Float32Array(n*3),s:new Float32Array(n),dc:new Float32Array(N*3),ds:new Float32Array(N)};
    for(let i=0;i<n;i++){ zfield(lob.cb.z[i],zoneBase(lob.zc,lob.cb.z[i]),ZF); lob.tg.c.set([ZF.c.r,ZF.c.g,ZF.c.b],i*3); lob.tg.s[i]=ZF.s; }
    const SZ=[0,0.024,0.017,0.016,0.018,0.020,0.020], r=[0,0,0,0];
    for(let i=0;i<N;i++){ zfield(lob.dz[i],ZC.fat,ZF); for(let k=0;k<4;k++) r[k]=lob.dr[i*4+k];
      const t=pickDot(ZF.d,r); lob.dotType[i]=t; lob.tg.ds[i]=t?SZ[t]*(0.75+0.5*r[(t+1)%4]):0;
      const c=DOT_COL[t]; lob.tg.dc.set([c.r,c.g,c.b],i*3); }
    lob.cvT=1+0.45*cong; lob.lpT=S.zonal==='aih'?0.10:0.35; lob.dirty=true; lob.dotsOn=anyZ;
  }
  const ac=tiers[2].built?tiers[2].inner.userData:null;
  if(ac){ const n=ac.hb.z.length;
    if(!ac.cur){ ac.cur={c:new Float32Array(n*3),s:new Float32Array(n).fill(1),dc:new Float32Array(n*3).fill(1),ds:new Float32Array(n)};
      for(let i=0;i<n;i++){ const c=zoneBase(ac.zc,ac.hb.z[i]); ac.cur.c.set([c.r,c.g,c.b],i*3); } }
    ac.tg={c:new Float32Array(n*3),s:new Float32Array(n),dc:new Float32Array(n*3),ds:new Float32Array(n)};
    const SZ=[0,0.062,0.030,0.034,0.034,0.040,0.036], rr=srng(55), r=[0,0,0,0];
    for(let i=0;i<n;i++){ zfield(ac.hb.z[i],zoneBase(ac.zc,ac.hb.z[i]),ZF); ac.tg.c.set([ZF.c.r,ZF.c.g,ZF.c.b],i*3); ac.tg.s[i]=ZF.s;
      for(let k=0;k<4;k++) r[k]=rr(); const t=pickDot(ZF.d,r); ac.dropType[i]=t; ac.tg.ds[i]=t?SZ[t]:0;
      const c=DOT_COL[t]; ac.tg.dc.set([c.r,c.g,c.b],i*3); }
    ac.cvT=1+0.35*cong; ac.dirty=true; ac.dotsOn=anyZ;
  }
  const sn=tiers[3].built?tiers[3].inner.userData:null;
  if(sn){ const n=sn.hz.length, N=n*3, base=new THREE.Color(0x7A3A2C);
    if(!sn.cur) sn.cur={c:new Float32Array(n*3).fill(0),s:new Float32Array(n).fill(1),dc:new Float32Array(N*3).fill(1),ds:new Float32Array(N)};
    if(!sn.curInit){ for(let i=0;i<n;i++) sn.cur.c.set([base.r,base.g,base.b],i*3); sn.curInit=true; }
    sn.tg={c:new Float32Array(n*3),s:new Float32Array(n),dc:new Float32Array(N*3),ds:new Float32Array(N)};
    const SZ=[0,0.20,0.055,0.07,0.07,0.08,0.07], rr=srng(91), r=[0,0,0,0];
    for(let i=0;i<n;i++){ zfield(sn.hz[i],base,ZF); sn.tg.c.set([ZF.c.r,ZF.c.g,ZF.c.b],i*3); sn.tg.s[i]=Math.min(1.12,Math.max(0.7,ZF.s));
      for(let j=0;j<3;j++){ const q=i*3+j; for(let k=0;k<4;k++) r[k]=rr(); const t=pickDot(ZF.d,r); sn.dropType[q]=t;
        sn.tg.ds[q]=t?SZ[t]*(0.8+0.4*r[1]):0; const c=DOT_COL[t]; sn.tg.dc.set([c.r,c.g,c.b],q*3); } }
    sn.congT=cong; sn.dirty=true; sn.dotsOn=anyZ;
  }
  const ce=tiers[4].built?tiers[4].inner.userData:null;
  if(ce){ ce.dropT=S.masld>0?0.45+0.17*S.masld:0; ce.balT=S.mash?1:0; ce.feT=S.zonal==='iron'?1:0; ce.mdbT=S.mash?1:0; ce.dirty=true; }
}
function lerpArr(cur,tg,a){ let mv=false; for(let i=0;i<cur.length;i++){ const d=tg[i]-cur[i]; if(Math.abs(d)>1e-3){ cur[i]+=d*a; mv=true; } else cur[i]=tg[i]; } return mv; }
const _mo=new THREE.Object3D(), _mq=new THREE.Quaternion(), _mc=new THREE.Color(), _mm=new THREE.Matrix4(), _mv=new THREE.Vector3();
function microTick(dt){
  const a=Math.min(1,dt*2.2);
  const lob=tiers[1].built?tiers[1].inner.userData:null;
  if(lob&&lob.dirty&&lob.tg){ const C=lob.cur,T=lob.tg; let mv=false;
    mv=lerpArr(C.c,T.c,a)|mv; mv=lerpArr(C.s,T.s,a)|mv; mv=lerpArr(C.dc,T.dc,a)|mv; mv=lerpArr(C.ds,T.ds,a)|mv;
    const n=C.s.length, cb=lob.cb;
    for(let i=0;i<n;i++){ _mo.position.set(cb.pos[i*3],cb.pos[i*3+1],cb.pos[i*3+2]); _mo.quaternion.set(cb.quat[i*4],cb.quat[i*4+1],cb.quat[i*4+2],cb.quat[i*4+3]);
      _mo.scale.set(C.s[i],cb.len[i],C.s[i]); _mo.updateMatrix(); lob.cords.setMatrixAt(i,_mo.matrix);
      _mc.setRGB(C.c[i*3],C.c[i*3+1],C.c[i*3+2]); lob.cords.setColorAt(i,_mc); }
    lob.cords.instanceMatrix.needsUpdate=true; lob.cords.instanceColor.needsUpdate=true;
    const N=C.ds.length; let any=false;
    for(let i=0;i<N;i++){ _mo.position.set(lob.dp[i*3],lob.dp[i*3+1],lob.dp[i*3+2]); _mo.quaternion.identity(); _mo.scale.setScalar(C.ds[i]); _mo.updateMatrix();
      lob.dots.setMatrixAt(i,_mo.matrix); _mc.setRGB(C.dc[i*3],C.dc[i*3+1],C.dc[i*3+2]); lob.dots.setColorAt(i,_mc); if(C.ds[i]>0.001) any=true; }
    lob.dots.instanceMatrix.needsUpdate=true; lob.dots.instanceColor.needsUpdate=true; lob.dots.visible=any;
    const k=lob.cv.scale.x+(lob.cvT-lob.cv.scale.x)*a; lob.cv.scale.set(k,1,k);
    lob.lp.material.userData.baseOpacity+=(lob.lpT-lob.lp.material.userData.baseOpacity)*a;
    if(!mv && Math.abs(k-lob.cvT)<1e-3) lob.dirty=false;
  }
  const ac=tiers[2].built?tiers[2].inner.userData:null;
  if(ac&&ac.dirty&&ac.tg){ const C=ac.cur,T=ac.tg; let mv=false;
    mv=lerpArr(C.c,T.c,a)|mv; mv=lerpArr(C.s,T.s,a)|mv; mv=lerpArr(C.dc,T.dc,a)|mv; mv=lerpArr(C.ds,T.ds,a)|mv;
    const n=C.s.length, hb=ac.hb; let any=false;
    for(let i=0;i<n;i++){ _mo.position.set(hb.pos[i*3],hb.pos[i*3+1],0); _mo.quaternion.identity(); _mo.scale.set(C.s[i],Math.min(1.08,C.s[i]),C.s[i]); _mo.updateMatrix();
      ac.heps.setMatrixAt(i,_mo.matrix); _mc.setRGB(C.c[i*3],C.c[i*3+1],C.c[i*3+2]); ac.heps.setColorAt(i,_mc);
      _mo.position.set(hb.pos[i*3]+(i%3-1)*0.03,hb.pos[i*3+1]+((i*7)%3-1)*0.02,0.06); _mo.scale.setScalar(C.ds[i]); _mo.updateMatrix();
      ac.drops.setMatrixAt(i,_mo.matrix); _mc.setRGB(C.dc[i*3],C.dc[i*3+1],C.dc[i*3+2]); ac.drops.setColorAt(i,_mc); if(C.ds[i]>0.001) any=true; }
    ac.heps.instanceMatrix.needsUpdate=true; ac.heps.instanceColor.needsUpdate=true;
    ac.drops.instanceMatrix.needsUpdate=true; ac.drops.instanceColor.needsUpdate=true; ac.drops.visible=any;
    const k=ac.cv.scale.x+(ac.cvT-ac.cv.scale.x)*a; ac.cv.scale.set(k,1,k);
    if(!mv && Math.abs(k-ac.cvT)<1e-3) ac.dirty=false;
  }
  const sn=tiers[3].built?tiers[3].inner.userData:null;
  if(sn&&sn.dirty&&sn.tg){ const C=sn.cur,T=sn.tg; let mv=false;
    mv=lerpArr(C.c,T.c,a)|mv; mv=lerpArr(C.s,T.s,a)|mv; mv=lerpArr(C.dc,T.dc,a)|mv; mv=lerpArr(C.ds,T.ds,a)|mv;
    const n=C.s.length; let any=false;
    for(let i=0;i<n;i++){ _mo.position.copy(sn.hpos[i]); _mo.quaternion.identity(); _mo.scale.setScalar(C.s[i]); _mo.updateMatrix();
      sn.heps.setMatrixAt(i,_mo.matrix); _mc.setRGB(C.c[i*3],C.c[i*3+1],C.c[i*3+2]); sn.heps.setColorAt(i,_mc); }
    for(let q=0;q<C.ds.length;q++){ const c=sn.hpos[Math.floor(q/3)], j=q%3, s=C.s[Math.floor(q/3)];
      _mo.position.set(-0.50*s,c.y+(j-1)*0.24*s,c.z+(j===1?0.18:-0.2)*s); _mo.scale.setScalar(C.ds[q]); _mo.updateMatrix();
      sn.drops.setMatrixAt(q,_mo.matrix); _mc.setRGB(C.dc[q*3],C.dc[q*3+1],C.dc[q*3+2]); sn.drops.setColorAt(q,_mc); if(C.ds[q]>0.001) any=true; }
    sn.heps.instanceMatrix.needsUpdate=true; sn.heps.instanceColor.needsUpdate=true;
    sn.drops.instanceMatrix.needsUpdate=true; sn.drops.instanceColor.needsUpdate=true; sn.drops.visible=any;
    const dc=sn.congT-sn.cong; if(Math.abs(dc)>1e-3){ sn.cong+=dc*a; sn.setFib(state.fibrosis); mv=true; } else if(sn.cong!==sn.congT){ sn.cong=sn.congT; sn.setFib(state.fibrosis); }
    sn.rbc.count=Math.round(34+62*sn.cong);
    if(!mv) sn.dirty=false;
  }
  const ce=tiers[4].built?tiers[4].inner.userData:null;
  if(ce&&ce.dirty){ let mv=false;
    const step=(k,tk)=>{ const d=(ce[tk]||0)-ce[k]; if(Math.abs(d)>1e-3){ ce[k]+=d*a; mv=true; } else ce[k]=ce[tk]||0; };
    step('dropR','dropT'); step('bal','balT'); step('feK','feT'); step('mdbK','mdbT');
    const R=ce.dropR, Dc=ce.drop.position;
    ce.drop.visible=R>0.01; ce.drop.scale.setScalar(Math.max(0.001,R));
    // nucleus (with its ER) is pushed to the periphery — the 'signet ring' of macrovesicular steatosis
    const dir=_mv.set(-Dc.x,-Dc.y,-Dc.z).normalize(), need=R>0.01?Math.max(Dc.length(),R+0.50):Dc.length();
    const np=new THREE.Vector3().copy(Dc).addScaledVector(dir,need);
    np.x=THREE.MathUtils.clamp(np.x,-(ce.HX-0.5),ce.HX-0.5); np.y=THREE.MathUtils.clamp(np.y,-(ce.HY-0.5),ce.HY-0.5); np.z=THREE.MathUtils.clamp(np.z,-(ce.HZ-0.5),ce.HZ-0.5);
    const off=R>0.01?np:np.set(0,0,0);
    ce.nuc.position.copy(off); ce.nucl.position.set(-0.16,0.08,0.14).add(off); ce.er.position.copy(off); ce.ribo.position.copy(off);
    for(const [im,base] of ce.moveable){ for(let k=0;k<base.length;k++){ _mm.copy(base[k]); _mv.setFromMatrixPosition(_mm);
        const d=_mv.distanceTo(Dc); if(R>0.01 && d<R+0.10){ const p=_mv.clone().sub(Dc).normalize().multiplyScalar(R+0.10).add(Dc);
          p.x=THREE.MathUtils.clamp(p.x,-(ce.HX-0.12),ce.HX-0.12); p.y=THREE.MathUtils.clamp(p.y,-(ce.HY-0.12),ce.HY-0.12); p.z=THREE.MathUtils.clamp(p.z,-(ce.HZ-0.12),ce.HZ-0.12);
          _mm.setPosition(p); }
        im.setMatrixAt(k,_mm); } im.instanceMatrix.needsUpdate=true; }
    // ballooning: the cell swells and its cytoplasm rarefies; Mallory–Denk bodies condense by the nucleus
    const bs=1+0.16*ce.bal; for(const k in ce.LG) ce.LG[k].scale.setScalar(bs);
    ce.glyc.material.userData.baseOpacity=0.8*(1-0.7*ce.bal);
    ce.mdb.visible=ce.mdbK>0.01; ce.mdb.material.userData.baseOpacity=Math.min(1,ce.mdbK*1.5); ce.mdb.position.copy(off);
    ce.mdb.scale.setScalar(0.3+0.7*ce.mdbK);
    ce.fe.visible=ce.feK>0.01; ce.fe.scale.setScalar(Math.max(0.001,ce.feK));
    if(!mv) ce.dirty=false;
  }
}

/* label declutter: a label whose text box would cover another label (or its dot) is flipped to
   the left of its dot; the dot itself never moves off the structure */
function declutter(list){
  // text box only (the 10px dot + 7px gap sit at the anchor), plus each dot as an obstacle
  const R=(e,side)=>{ const dy=side[1]==='u'?-15:side[1]==='d'?15:0, y0=e._y+dy-e._h/2, y1=e._y+dy+e._h/2;
    return side[0]==='r'?[e._x+10,y0,e._x-5+e._w,y1]:[e._x+5-e._w,y0,e._x-10,y1]; };
  const SIDES=['r','l','ru','rd','lu','ld'];
  const D=e=>[e._x-6,e._y-6,e._x+6,e._y+6];
  const hit=(a,b)=>a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3];
  list.forEach(e=>{ if(!e._w){ e._w=e.offsetWidth; e._h=e.offsetHeight; } e._side='r'; });
  list.sort((a,b)=>a._x-b._x);
  const clash=(A,side)=>{ const r=R(A,side); let n=0;
    for(const B of list){ if(B===A) continue; if(hit(r,R(B,B._side))) n+=2; if(hit(r,D(B))) n+=1; } return n; };
  for(let pass=0;pass<2;pass++) for(const A of list){
    let best='r', bc=clash(A,'r');
    for(const sd of SIDES){ if(!bc) break; const c=clash(A,sd); if(c<bc){ bc=c; best=sd; } }
    A._side=best;
  }
  list.forEach(e=>{ e.classList.toggle('left',e._side[0]==='l');
    e.classList.toggle('up',e._side[1]==='u'); e.classList.toggle('down',e._side[1]==='d'); });
}

/* macroscopic zoom goes toward the point under the cursor (kept fixed on screen), and relaxes
   back to centre on the way out */
const MACRO_ZOOM=10, MACRO_HOLD=0.82;
const mz={s:1,pos:new THREE.Vector3(),Q:null};
/* v44: the rotation lives on the macroscopic scene root (tier 0 group), never on the camera or on meshes. AXIS_UP is the
   least-squares centreline through the T1–L5 vertebral body centroids (pipeline/spine44.py), so the spine is vertical in
   world space (v43 tilted it 14.4°: 68 mm / 91 mm of X / Z drift over its 442 mm). AXIS_A is the point on that centreline
   that maps to the world origin; the default orbit target (0,−0.45,0) is the spine axis at the liver's mid-height, so the
   scene orbits about the spine. spineCheck() re-measures the drift at run time (validate.py: spine axis). */
const AXIS_UP=new THREE.Vector3(-0.003686,0.999896,0.013910).normalize(), AXIS_A=new THREE.Vector3(0.4183,0.0126,-0.4710);
const AXIS_Q=new THREE.Quaternion().setFromUnitVectors(AXIS_UP,new THREE.Vector3(0,1,0));
const AXIS={on:true};
function macroFocus(grp,s){
  if(Math.abs(s-mz.s)>1e-7){
    if(s>mz.s && mz.Q) mz.pos.sub(mz.Q).multiplyScalar(s/mz.s).add(mz.Q);
    else if(s<mz.s) mz.pos.multiplyScalar(mz.s>1.00001 ? Math.max(0,(s-1)/(mz.s-1)) : 0);
    mz.s=s;
  }
  grp.quaternion.copy(AXIS.on?AXIS_Q:new THREE.Quaternion());
  grp.position.copy(mz.pos); if(AXIS.on) grp.position.sub(AXIS_A.clone().applyQuaternion(AXIS_Q).multiplyScalar(s));
}
const focusRay=new THREE.Raycaster(); let focusT=0;
function centreFocus(){ const r=renderer.domElement.getBoundingClientRect(); focusT=0;
  const pw=(innerWidth>860&&!document.getElementById('panel').classList.contains('closed'))?352:0;
  setMacroFocus(r.left+(r.width-pw)/2,r.top+r.height/2); }
function focusAt(cx,cy){                     // world point under a screen position (front-most visible surface)
  const rect=renderer.domElement.getBoundingClientRect();
  focusRay.setFromCamera(new THREE.Vector2(((cx-rect.left)/rect.width)*2-1,-((cy-rect.top)/rect.height)*2+1),camera);
  const t=tiers[0];
  if(t.built){
    const hits=focusRay.intersectObjects(t.group.children,true);
    for(const h of hits){ const o=h.object;
      if(o.userData.noPick||(o.material&&o.material.opacity<0.1)) continue;
      let n=o,hid=false; while(n&&n!==t.group){ if(!n.visible){hid=true;break;} n=n.parent; } if(hid) continue;
      return h.point.clone(); }
  }
  const pl=new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(),controls.target);
  return focusRay.ray.intersectPlane(pl,new THREE.Vector3()) || controls.target.clone();
}
function setMacroFocus(cx,cy){
  if(state.z>=1) return;
  const now=performance.now(); if(now-focusT<90 && mz.Q) return; focusT=now;
  mz.Q=focusAt(cx,cy);
}
/* sinusoid → hepatocyte: the zoom closes on one hepatocyte of the lower plate, which glides to centre
   where the cell view (same shape and pose) takes over */
const HEP_G=new THREE.Vector3(0,-1.06,0.55).multiplyScalar(0.60);
function hepFocus(grp,s,z){
  if(z<3){ grp.position.set(0,0,0); return; }
  if(!HEP_G.userData){ HEP_G.applyMatrix4(xfMatrix(3)); HEP_G.userData=1; }
  const g=THREE.MathUtils.smoothstep(z,3.05,3.85);
  grp.position.copy(HEP_G).applyQuaternion(grp.quaternion).multiplyScalar(1-g-s);
}

/* ════════════ loop ════════════ */
function fmt(m){
  if(m>=0.01) return (m*100).toFixed(m>=0.1?0:1)+' cm';
  if(m>=1e-3) return (m*1000).toFixed(m>=1e-2?0:1)+' mm';
  if(m>=1e-6) return (m*1e6).toFixed(m>=1e-5?0:1)+' µm';
  return (m*1e9).toFixed(0)+' nm';
}
function viewName(){
  const v=camera.position.clone().sub(controls.target);
  const el=Math.asin(THREE.MathUtils.clamp(v.y/v.length(),-1,1))*180/Math.PI;
  if(el>58) return 'Superior';
  if(el<-58) return 'Inferior (visceral)';
  const az=Math.atan2(v.x,v.z)*180/Math.PI;
  if(az>-45&&az<=45) return 'Anterior';
  if(az>45&&az<=135) return 'Left lateral';
  if(az<=-45&&az>-135) return 'Right lateral';
  return 'Posterior';
}
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;
  if(document.body.classList.contains('mob')){ const sh=Math.min(window.__mobH||0,innerHeight*0.6);
    camera.setViewOffset(innerWidth,innerHeight,0,sh/2,innerWidth,innerHeight); camera.updateProjectionMatrix(); return; }
  const panel = (innerWidth>860 && !document.getElementById('panel').classList.contains('closed')) ? 352 : 0;
  const dy = innerWidth>860 ? 26 : 0;          // lift the scene clear of the bottom simulation bar
  if(panel||dy) camera.setViewOffset(innerWidth,innerHeight,panel/2,dy,innerWidth,innerHeight);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize',resize); resize();
/* ── phone layout (v34): one bottom sheet (drag between peek, half and full) holds the fibrosis slider, the panel,
   the layers and every text card and procedure card, so nothing floats over the model ── */
const MOBQ=()=>innerWidth<=860||(innerHeight<=520&&matchMedia('(pointer:coarse)').matches);
const MOB={on:false,state:'peek',h:140,homes:new Map(),justDragged:0};
function mobMove(el,dest,before){ if(!MOB.homes.has(el)) MOB.homes.set(el,{p:el.parentNode,n:el.nextSibling}); dest.insertBefore(el,before||null); }
function mobRestore(){ const list=[...MOB.homes]; for(let i=list.length-1;i>=0;i--){ const [el,h]=list[i]; h.p.insertBefore(el,(h.n&&h.n.parentNode===h.p)?h.n:null); } MOB.homes.clear(); }
function mobPeekH(){ return $('#grip').offsetHeight+$('#mhead').offsetHeight+4; }
function mobSetH(h){ MOB.h=h; window.__mobH=h; document.body.style.setProperty('--sheetH',Math.round(h)+'px'); }
function mobSheet(st){ if(!MOB.on) return; MOB.state=st; const H=innerHeight;
  mobSetH(st==='peek'?mobPeekH():st==='half'?Math.round(H*0.5):Math.round(H*0.86)); resize(); if(typeof coachLayout==='function') coachLayout(); }
function mobTab(t){ $('#panel').classList.toggle('tab-layers',t==='layers'); document.querySelectorAll('#mtabs button').forEach(b=>b.dataset.on=b.dataset.t===t?'1':'0'); }
function mobRaise(){ if(!MOB.on) return; mobTab('explore'); if(MOB.state==='peek') mobSheet('half'); const sc=$('#panel .scroll'); if(sc) sc.scrollTop=0; }
function mobCard(label,txt){ const c=$('#mcard'); if(!MOB.on||!c) return;
  c.innerHTML=`<div class="mc-h"><b></b><button aria-label="Close">×</button></div><p></p>`;
  c.querySelector('b').textContent=label; c.querySelector('p').textContent=txt; c.hidden=false;
  c.querySelector('button').addEventListener('click',()=>clearSelection()); mobRaise(); }
/* frame the whole organ on a narrow or short screen: pull the camera back by the aspect and the sheet's share of the height */
function mobCam(){ if(!MOB.on) return; const T=new THREE.Vector3(0,-0.45,0), a=innerWidth/innerHeight, ph=mobPeekH();
  const k=Math.max(1/1.22,Math.min(2.3,Math.max(1,0.9/a,0.9*innerHeight/Math.max(1,innerHeight-ph)))/1.22);
  camera.position.copy(HOME).sub(T).multiplyScalar(k).add(T); controls.target.copy(T); controls.update(); }
function mobApply(){ const on=MOBQ();
  if(on===MOB.on){ if(on) mobSheet(MOB.state); return; }
  MOB.on=on; document.body.classList.toggle('mob',on);
  if(on){ const sc=$('#panel .scroll'), after=$('#mpane-layers').nextSibling;
    mobMove($('#simbar'),$('#mslot-sim')); mobMove($('#layerbar'),$('#mpane-layers')); mobMove($('#bx'),sc,after); mobMove($('#hvpg'),sc,after);
    $('#panel').classList.remove('closed'); $('#app').classList.remove('pclosed'); $('#btn-reset').textContent='Reset';
    mobTab('explore'); requestAnimationFrame(()=>{ mobSheet('peek'); mobCam(); }); }
  else { mobRestore(); window.__mobH=0; document.body.style.removeProperty('--sheetH'); mobTab('explore'); $('#mcard').hidden=true;
    $('#btn-reset').textContent='Reset view'; camera.position.copy(HOME); controls.target.set(0,-0.45,0); controls.update(); resize(); }
}
{ let d=null;
  const start=e=>{ if(!MOB.on||e.target.closest('input,button,select,label,a')) return; d={y:e.clientY,h:MOB.h,moved:false}; };
  const move=e=>{ if(!d) return; const dy=e.clientY-d.y; if(!d.moved&&Math.abs(dy)>5){ d.moved=true; $('#panel').classList.add('dragging'); }
    if(d.moved){ mobSetH(THREE.MathUtils.clamp(d.h-dy,mobPeekH(),innerHeight*0.9)); } };
  const end=()=>{ if(!d) return; $('#panel').classList.remove('dragging');
    if(d.moved){ const H=innerHeight, c=[['peek',mobPeekH()],['half',H*0.5],['full',H*0.86]]; let b=c[0]; for(const x of c) if(Math.abs(x[1]-MOB.h)<Math.abs(b[1]-MOB.h)) b=x;
      MOB.justDragged=performance.now(); mobSheet(b[0]); }
    d=null; };
  $('#grip').addEventListener('pointerdown',start); $('#mhead').addEventListener('pointerdown',start);
  addEventListener('pointermove',move); addEventListener('pointerup',end); addEventListener('pointercancel',end); }
document.querySelectorAll('#mtabs button').forEach(b=>b.addEventListener('click',()=>{ mobTab(b.dataset.t); if(MOB.state==='peek') mobSheet('half'); }));
{ const mo=new MutationObserver(ms=>{ for(const m of ms){ if(MOB.on&&!m.target.hidden){ $('#mcard').hidden=true; mobRaise(); } } });
  for(const id of ['#bx','#hvpg']) mo.observe($(id),{attributes:true,attributeFilter:['hidden']}); }
addEventListener('resize',mobApply); mobApply();
if(MOB.on){ anno.classList.add('nolabels'); $('#btn-lab').setAttribute('aria-pressed','false'); }
/* first-run introduction: a card in the centre, dashed arrows to the layer bar, the panel and the fibrosis slider */
function introLayout(){
  const el=$('#intro'); if(el.hidden) return;
  const W=innerWidth, H=innerHeight, mob=MOBQ(), card=$('.intro-card');
  el.classList.toggle('mob',mob);
  if(mob){ card.style.left=''; card.style.top=''; $('#intro-paths').innerHTML=''; return; }
  const R=s=>$(s).getBoundingClientRect(), lb=R('#layers'), pn=R('#panel'), sb=R('#simbar');
  const sceneR=$('#panel').classList.contains('closed')?W:pn.left;
  const cw=card.offsetWidth, ch=card.offsetHeight;
  const cx=Math.round(sceneR/2), cy=Math.round((lb.bottom+sb.top)/2);
  card.style.left=(cx-cw/2)+'px'; card.style.top=Math.max(lb.bottom+12,cy-ch/2)+'px';
  const C=card.getBoundingClientRect(), tag=k=>el.querySelector(`.intro-tag[data-k="${k}"]`);
  const g=$('#intro-paths'); g.innerHTML='';
  const arrow=(x1,y1,qx,qy,x2,y2)=>{ const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',`M${x1},${y1} Q${qx},${qy} ${x2},${y2}`); p.setAttribute('marker-end','url(#intro-ah)'); g.appendChild(p); };
  const place=(t,x,y)=>{ t.style.left=Math.round(Math.max(8,Math.min(W-t.offsetWidth-8,x)))+'px'; t.style.top=Math.round(Math.max(8,Math.min(H-t.offsetHeight-8,y)))+'px'; return t.getBoundingClientRect(); };
  // left column, upper: layers
  const colW=Math.min(230,C.left-40);
  for(const k of ['top','bottom']) tag(k).style.maxWidth=Math.max(160,colW)+'px';
  const on=k=>!tag(k).classList.contains('off');
  let T=place(tag('top'), C.left-tag('top').offsetWidth-24, lb.bottom+34);
  if(on('top')){ const ex=Math.min(T.left+T.width*0.5+70,lb.right-20); arrow(T.left+T.width*0.5,T.top, ex,T.top, ex,lb.bottom+6); }
  // left column, lower: fibrosis slider
  T=place(tag('bottom'), C.left-tag('bottom').offsetWidth-24, sb.top-tag('bottom').offsetHeight-36);
  if(on('bottom')) arrow(T.right,T.top+T.height*0.6, sb.left+70,T.top+T.height*0.6, sb.left+70,sb.top-6);
  // right: the panel
  tag('right').style.maxWidth=Math.max(150,Math.min(220,sceneR-C.right-44))+'px';
  T=place(tag('right'), C.right+22, C.top+24);
  if(on('right')) arrow(T.left+T.width*0.5,T.bottom, T.left+T.width*0.5,T.bottom+40, sceneR+6,T.bottom+56);
}
/* the centre card and each pointer close independently; the introduction is done when all are closed */
function introShow(){ const el=$('#intro'); el.hidden=false; el.classList.remove('nocard');
  el.querySelectorAll('.intro-card,.intro-tag').forEach(n=>n.classList.remove('off')); requestAnimationFrame(introLayout); }
function introDone(){ $('#intro').hidden=true; try{ localStorage.setItem('hsa-intro-seen','1'); }catch(e){} }
function introCheck(){ const el=$('#intro'), mob=el.classList.contains('mob');
  const left=[...el.querySelectorAll('.intro-tag')].filter(t=>!t.classList.contains('off'));
  if(el.querySelector('.intro-card').classList.contains('off') && (mob||!left.length)) introDone(); else introLayout(); }
function introHide(){ const el=$('#intro'); el.querySelector('.intro-card').classList.add('off'); el.classList.add('nocard'); introCheck(); }
function introCardOpen(){ return !$('#intro').hidden && !$('#intro .intro-card').classList.contains('off'); }
$('#intro-x').addEventListener('click',introHide); $('#intro-go').addEventListener('click',introHide);
$('#intro').addEventListener('click',e=>{ if(e.target.id==='intro') introHide(); });
document.querySelectorAll('#intro .intro-tx').forEach(b=>b.addEventListener('click',()=>{ b.parentElement.classList.add('off'); introCheck(); }));
$('#btn-intro').addEventListener('click',()=>{ if(shownTier>0) coachFor(shownTier,true); else introShow(); });
addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('#intro').hidden){ if(introCardOpen()) introHide(); else introDone(); } });
addEventListener('resize',introLayout);
/* first-visit hints on the microscopic scales: small pointers to the slider, the pathology panel and the acinar layer.
   Each can be closed with its ×; once all are closed, or the scale is left, they are not shown again for that scale
   (Guide re-opens them). They never block the scene. */
const COACH={
  1:[{k:'slider',h:'Fibrosis slider',t:'Drag the slider to see septa form and bridge the portal tracts, and watch how blood flow through the lobule slows and is diverted.'},
     {k:'path',h:'Pathology',t:'Open Pathology and toggle MASLD, zonal injury or Budd–Chiari to see which areas of the lobule each one affects.'},
     {k:'acinar',h:'Acinar',t:'Toggle this on to see the functional anatomy of the acinus, between two central veins.'}],
  2:[{k:'slider',h:'Fibrosis slider',t:'Drag the slider: collagen fills the space of Disse, the sinusoids narrow and septa bridge portal to central. Watch the flow slow.'}],
  3:[{k:'slider',h:'Fibrosis slider',t:'Drag the slider: the fenestrae shrink and close, collagen fills the space of Disse and the lumen narrows. This is capillarisation.'}],
  4:[{k:'transp',h:'Transporters',t:'Toggle Transporters to see uptake on the sinusoidal face and export into the bile canaliculus. The teaching points explain cholestasis transporter by transporter.'},
     {k:'path',h:'Pathology',t:'Open Pathology and raise the MASLD grade, or pick a zonal injury, to see what happens inside the cell.'}]};
const coach={tier:-1,tags:[]};
const coachSeen=i=>{ try{ return localStorage.getItem('hsa-coach-'+i)==='1'; }catch(e){ return false; } };
const coachMark=i=>{ try{ localStorage.setItem('hsa-coach-'+i,'1'); }catch(e){} };
function coachClear(mark){ if(coach.tier>=0&&mark) coachMark(coach.tier); coach.tags.forEach(t=>t.el.remove()); coach.tags=[]; coach.tier=-1;
  $('#coach').hidden=true; $('#coach-paths').innerHTML=''; }
function coachFor(i,force){
  coachClear(true);
  if(!COACH[i]||(!force&&coachSeen(i))||introCardOpen()) return;
  coach.tier=i; const box=$('#coach');
  for(const d of COACH[i]){ const el=document.createElement('div'); el.className='coach-tag'; el.dataset.k=d.k;
    el.innerHTML=`<b>${d.h}</b>${d.t}<button aria-label="Close hint">&times;</button>`;
    el.querySelector('button').addEventListener('click',()=>{ el.remove(); coach.tags=coach.tags.filter(t=>t.el!==el);
      if(!coach.tags.length) coachClear(true); else coachLayout(); });
    box.appendChild(el); coach.tags.push({k:d.k,el}); }
  box.hidden=false; setTimeout(coachLayout,60);
  if(document.body.classList.contains('mob')) setTimeout(()=>{ if(coach.tier===i) coachClear(true); },9000);
}
function coachLayout(){
  if(coach.tier<0) return;
  const W=innerWidth, H=innerHeight, g=$('#coach-paths'); g.innerHTML='';
  const arrow=(x1,y1,qx,qy,x2,y2)=>{ const p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',`M${x1},${y1} Q${qx},${qy} ${x2},${y2}`); p.setAttribute('marker-end','url(#coach-ah)'); g.appendChild(p); };
  const place=(el,x,y)=>{ el.style.left=Math.round(Math.max(8,Math.min(W-el.offsetWidth-8,x)))+'px';
    el.style.top=Math.round(Math.max(8,Math.min(H-el.offsetHeight-8,y)))+'px'; return el.getBoundingClientRect(); };
  const panelOpen=!$('#panel').classList.contains('closed'), mob=W<=860;
  if(document.body.classList.contains('mob')){ let y=$('#topbar').getBoundingClientRect().bottom+6;
    for(const {el} of coach.tags){ el.style.display=''; el.style.left='10px'; el.style.top=y+'px'; y+=el.offsetHeight+6; } return; }
  for(const {k,el} of coach.tags){
    el.style.display='';
    if(k==='slider'){ const r=$('#sl-fib').getBoundingClientRect(), sb=$('#simbar').getBoundingClientRect();
      const tx=r.left+r.width*Math.max(0.04,state.fibrosis), ty=r.top+2;
      const T=place(el, sb.left, sb.top-el.offsetHeight-44);
      const sx=Math.min(T.right-20,Math.max(T.left+20,tx)); arrow(sx,T.bottom, sx,(T.bottom+ty)/2, tx,ty-4); }
    else if(k==='path'){ const s=$('#path-block > summary').getBoundingClientRect(), pn=$('#panel').getBoundingClientRect();
      if(!panelOpen||s.height===0||s.bottom<pn.top||s.top>H){ el.style.display='none'; continue; }
      const tx=mob?s.left+60:s.left-6, ty=mob?s.top-4:s.top+s.height/2;
      const T=mob? place(el, W-el.offsetWidth-12, pn.top-el.offsetHeight-60) : place(el, pn.left-el.offsetWidth-46, ty-el.offsetHeight-40);
      if(mob) arrow(T.left+T.width*0.6,T.bottom, tx,T.bottom+20, tx,ty); else arrow(T.right,T.top+T.height*0.5, tx-30,T.top+T.height*0.5, tx,ty); }
    else if(k==='acinar'||k==='transp'){ const b=document.querySelector(`#layers .lay[data-k=${k==='acinar'?'acinar':'transporters'}]`); if(!b){ el.style.display='none'; continue; }
      const r=b.getBoundingClientRect(), tx=r.left+r.width/2, ty=r.bottom+4;
      const T=place(el, r.left-30, r.bottom+56); const sx=Math.min(T.right-20,Math.max(T.left+20,tx));
      arrow(sx,T.top, sx,(T.top+ty)/2, tx,ty); }
  }
}
addEventListener('resize',coachLayout);
{ let seen=false; try{ seen=localStorage.getItem('hsa-intro-seen')==='1'; }catch(e){} if(!seen) introShow(); }

const tmp=new THREE.Vector3(), clock=new THREE.Clock();
const PERF={full:Math.min(devicePixelRatio,(innerWidth<=860||innerHeight<=520)?1.5:2), move:1, lastMoveT:-1e9, moving:false,
  cam:new THREE.Vector3(), q:new THREE.Quaternion(), fps:0, n:0, t0:performance.now(), occMs:0, rMs:0,
  el:null, on:false};
PERF.move=PERF.full;   // v44: same pixel ratio while moving (v43 dropped to 1× in motion: sharper at rest than rotating)
const acA=new THREE.Color(0xE0574A), acB=new THREE.Color(0x9A4E92), accol=new THREE.Color();
/* ── ambient occlusion (v37) ──
   RenderPass → GTAOPass → OutputPass (tone mapping and sRGB move into OutputPass) into a 4× MSAA half-float target.
   Only at the macroscopic tier, only at rest (fades in ~200 ms after the camera stops), and only opaque solids write
   the AO normal/depth buffer (and scenes with ghosted layers or an open procedure stay on the direct path): ghosted or translucent surfaces, additive shells, particles, instanced flow, anything
   under a ghosted layer, and the HVPG apparatus are hidden for that pass so they leave no halos. Radius is in model
   units (0.07 ≈ 5 mm) and follows the macroscopic zoom. Phones (the MOBQ test) skip it: headless cost at 390×844 was +19% at full and +13% at half resolution
   against no change with it off, and real mobile GPUs pay more for full-screen passes. AO.half remains available. */
const aoPhone=()=>innerWidth<=860||(innerHeight<=520&&matchMedia('(pointer:coarse)').matches);
/* v44 acceptance: the image must not change between rotating and at rest. GTAO only ran at rest (fading in ~200 ms after
   the camera stopped), so it is off; contact grounding and crease darkening come from the baked self-AO in the organ
   maps (bake44.py), which is identical in motion. AO.enabled can still be set by hand for comparison. */
const AO={enabled:false, half:false, k:0, base:0.8, radius:0.07, w:0, h:0, pr:0, active:false};
const aoRT=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
const composer=new EffectComposer(renderer,aoRT);
composer.addPass(new RenderPass(scene,camera));
const gtao=new GTAOPass(scene,camera,1,1,undefined,{radius:AO.radius,distanceExponent:1.4,thickness:0.3,scale:1.5,samples:16,distanceFallOff:0,screenSpaceRadius:false},
  {lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:12});
{ const ss=gtao.setSize.bind(gtao); gtao.setSize=(w,h)=>ss(Math.max(1,Math.round(AO.half?w/2:w)),Math.max(1,Math.round(AO.half?h/2:h))); }
gtao.overrideVisibility=function(){
  const cache=this._visibilityCache;
  this.scene.traverse(o=>{ cache.set(o,o.visible); });
  this.scene.traverse(o=>{ if(!o.visible) return;
    if(o.isPoints||o.isLine||o.isSprite||o.isInstancedMesh||o.userData.noAO){ o.visible=false; return; }
    if(o.isMesh){ const m=Array.isArray(o.material)?o.material[0]:o.material;
      let gk=1; for(let n=o;n;n=n.parent) gk*=n.userData.ghostK??1;
      if(!m||m.opacity<0.97||m.transmission>0||m.depthWrite===false||m.blending!==THREE.NormalBlending||gk<1) o.visible=false; } });
  for(let i=1;i<tiers.length;i++) tiers[i].group.visible=false;
};
composer.addPass(gtao);

composer.addPass(new OutputPass());
/* the composer tone-maps the cleared background too (the direct path clears in output space), so feed it the linear
   colour that ACES maps back to the instrument background */
const AO_BG=(()=>{ const tgt=new THREE.Color(0x070A0E), lin=[tgt.r,tgt.g,tgt.b], x=lin.slice(), e=R36.exp/0.6;
  const IN=[[0.59719,0.35458,0.04823],[0.07600,0.90834,0.01566],[0.02840,0.13383,0.83777]], OUT=[[1.60475,-0.53108,-0.07367],[-0.10208,1.10813,-0.00605],[-0.00327,-0.07276,1.07602]];
  const mul=(M,v)=>M.map(r=>r[0]*v[0]+r[1]*v[1]+r[2]*v[2]), fit=v=>{ const a=v*(v+0.0245786)-0.000090537, b=v*(0.983729*v+0.4329510)+0.238081; return a/b; };
  const tm=c=>mul(OUT,mul(IN,c.map(v=>v*e)).map(fit)).map(v=>Math.min(1,Math.max(0,v)));
  for(let it=0;it<60;it++){ const y=tm(x); for(let i=0;i<3;i++) x[i]=Math.max(0,x[i]*(lin[i]+1e-5)/(y[i]+1e-5)); }
  return new THREE.Color(x[0],x[1],x[2]); })();
function aoFrame(pr){
  // the composer carries every frame in which the macroscopic tier is the only one drawn, so the look does not jump
  // when AO fades in; the AO pass itself runs only at rest
  if(!AO.enabled||!tiers[0].built||!tiers[0].group.visible) return false;
  // translucent scenes (any ghosted layer, a procedure card or the HVPG apparatus) stay on the direct path: the
  // composer blends in linear light, which makes ghosts read far more opaque than the sRGB blend they were tuned for
  if(BX.on||HVPG.on) return false;
  for(const k in state.layers) if(state.layers[k]==='ghost') return false;
  for(let i=1;i<tiers.length;i++) if(tiers[i].group.visible) return false;
  if(AO.w!==innerWidth||AO.h!==innerHeight||AO.pr!==pr){ AO.w=innerWidth; AO.h=innerHeight; AO.pr=pr; composer.setPixelRatio(pr); composer.setSize(innerWidth,innerHeight); }
  AO.k = PERF.moving ? 0 : THREE.MathUtils.clamp((performance.now()-PERF.lastMoveT-200)/200,0,1);
  gtao.enabled = AO.k>0.01;
  if(gtao.enabled){ gtao.updateGtaoMaterial({radius:AO.radius*tiers[0].group.scale.x}); gtao.blendIntensity=AO.base*AO.k; }
  const bg=scene.background; scene.background=AO_BG; composer.render(); scene.background=bg; return true;
}
/* v42 quality. v44: no real-time shadow maps anywhere (renderer, lights and meshes); contact grounding comes from the
   baked self-AO in the liver maps and the screen-space GTAO at rest. High quality = more AO samples and full AO strength. */
const QUAL={high:false, phone:aoPhone, frame:0};
renderer.shadowMap.enabled=false;
for(const k in LIGHTS) if(LIGHTS[k].isLight) LIGHTS[k].castShadow=false;
function qualSet(h){ QUAL.high=!!h&&!aoPhone();
  AO.base=QUAL.high?1.0:0.8; gtao.updateGtaoMaterial({samples:QUAL.high?24:16});
  const b=document.getElementById('btn-q'); if(b){ b.textContent='Quality: '+(QUAL.high?'High':'Standard'); b.setAttribute('aria-pressed',QUAL.high?'true':'false'); b.hidden=true; }   // v44: hidden: with GTAO off the setting no longer changes the image
  try{ localStorage.setItem('hsa-q',QUAL.high?'h':'s'); }catch(e){} }
document.getElementById('btn-q').addEventListener('click',()=>qualSet(!QUAL.high));
{ let q='h'; try{ q=localStorage.getItem('hsa-q')||'h'; }catch(e){} qualSet(q==='h'); }
addEventListener('resize',()=>{ if(aoPhone()&&QUAL.high) qualSet(false); const b=document.getElementById('btn-q'); if(b) b.hidden=true; });
let booted=false;

/* v43 render-on-demand. The frame loop still runs every animation frame (simulation ticks, flow, overlays), but the
   WebGL render (including GTAO) is skipped when nothing visible has changed. "Changed" is measured, not
   declared: a signature over the camera, canvas size, and every visible object's world matrix, material state and
   buffer versions (plus skin/shader uniforms). After any change the scene keeps rendering for ROD.tail ms so eased
   effects (the AO fade-in, cross-fades) finish, and a safety frame is drawn every ROD.idle ms regardless. */
const ROD={debug:false, changes:[], dbgMap:null, on:true, tail:1000, idle:1000, last:-1e9, lastDraw:-1e9, sig:NaN, drawn:0, skipped:0};
function rodNum(v){ if(typeof v==='number') return v; if(typeof v==='boolean') return v?1:0; if(!v) return 0;
  if(v.isColor) return v.r*3.1+v.g*5.7+v.b*7.3; if(v.isVector2) return v.x*1.3+v.y*2.9; if(v.isVector3) return v.x*1.3+v.y*2.9+v.z*4.1;
  if(v.isVector4||v.isQuaternion) return v.x*1.3+v.y*2.9+v.z*4.1+v.w*5.3; if(v.isTexture) return v.version*11+v.id;
  if(v.isMatrix4||v.isMatrix3){ let t=0; const e=v.elements; for(let i=0;i<e.length;i++) t+=Math.round(e[i]*1e6)*(i+1); return t; } return 0; }
function rodUniforms(u){ let t=0, k=1; for(const n in u){ const v=u[n]&&u[n].value!==undefined?u[n].value:u[n]; t+=rodNum(v)*(k++); } return t; }
function rodMat(m){ if(!m) return 0; let t=m.version*3+m.opacity*17+(m.visible?1:0)+m.id*0.001+rodNum(m.color)+rodNum(m.emissive)
    +(m.transmission||0)*5+(m.clearcoat||0)*7+(m.roughness||0)*11+(m.normalMap?m.normalMap.id+m.normalMap.version:0)+(m.map?m.map.version:0);
  if(m.uniforms) t+=rodUniforms(m.uniforms); if(m.userData&&m.userData.skin) t+=rodUniforms(m.userData.skin); return t; }
function sceneSig(){
  scene.updateMatrixWorld(); camera.updateMatrixWorld();
  let a=rodNum(camera.matrixWorld)+rodNum(camera.projectionMatrix)*0.7+renderer.domElement.width*13+renderer.domElement.height*17
    +renderer.getPixelRatio()*19+renderer.toneMappingExposure*23+rodNum(scene.background), b=0, k=0;
  const dbg=ROD.debug?new Map():null;
  const walk=o=>{ if(!o.visible) return; k++; const a0=a, b0=b;
    const e=o.matrixWorld.elements, q=x=>Math.round(x*1e6);   // quantised: controls.update() leaves ~1e-20 jitter
    a+=(q(e[0])+q(e[1])*2+q(e[5])*3+q(e[6])*4+q(e[10])*5+q(e[12])*7+q(e[13])*11+q(e[14])*13)*(k%89+1);
    if(o.isMesh||o.isPoints||o.isLine||o.isSprite){
      const ms=Array.isArray(o.material)?o.material:[o.material]; for(const m of ms) b+=rodMat(m)*(k%53+1);
      const g=o.geometry; if(g){ for(const n in g.attributes) b+=g.attributes[n].version*(k%31+1); if(g.index) b+=g.index.version*37;
        b+=(g.drawRange.count===Infinity?0:g.drawRange.count)+g.drawRange.start*3; }
      if(o.isInstancedMesh){ b+=o.count*41+o.instanceMatrix.version*43+(o.instanceColor?o.instanceColor.version*47:0); }
      if(o.morphTargetInfluences) for(let i=0;i<o.morphTargetInfluences.length;i++) b+=o.morphTargetInfluences[i]*(i+3);
    } else if(o.isLight){ b+=o.intensity*53+rodNum(o.color); }
    if(dbg) dbg.set(o,(a-a0)+'/'+(b-b0));
    const c=o.children; for(let i=0;i<c.length;i++) walk(c[i]); };
  walk(scene);
  if(dbg){ const prev=ROD.dbgMap; ROD.dbgMap=dbg; if(prev){ const ch=[]; for(const [o,v] of dbg) if(prev.get(o)!==v){ let n=o, p=[]; for(let i=0;i<4&&n;i++){ p.push(n.userData.pick||n.name||n.type); n=n.parent; } ch.push(p.join(' < ')); }
      if(ch.length) ROD.changes.push(ch.slice(0,8)); if(ROD.changes.length>20) ROD.changes.shift(); } }
  return a*1.000001+b+k*61;
}
function rodShouldDraw(now){
  if(!ROD.on||window.__rodOff) return true;
  if(PERF.moving) { ROD.last=now; return true; }
  const sg=sceneSig();
  if(sg!==ROD.sig){ ROD.sig=sg; ROD.last=now; }
  return now-ROD.last<ROD.tail || now-ROD.lastDraw>ROD.idle;
}
// the renderer itself bumps some material versions while drawing (the transmission pass flips double-sided
// transmissive materials to BackSide and back), so the reference signature is taken after each draw
function rodAfterDraw(){ if(ROD.on&&!window.__rodOff) ROD.sig=sceneSig(); }
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),0.05), el=clock.elapsedTime;
  frameNo++;

  state.z+=(state.zTarget-state.z)*Math.min(1,dt*3.2);
  const z=state.z;

  const i0=Math.floor(Math.min(z,tiers.length-1-1e-6));
  const f=z-i0;
  // hold each scale for the first 58% of the step (≈2.3× magnification) before the next fades in
  const hold = i0===0 ? MACRO_HOLD : 0.58;         // the macroscopic scene holds much longer
  const fb=THREE.MathUtils.clamp((f-hold)/(1-hold),0,1);
  const t=fb*fb*fb*(fb*(fb*6-15)+10);
  let builtNow=false;
  if(ensure(i0)) builtNow=true;
  if(ensure(Math.min(i0+1,tiers.length-1))) builtNow=true;
  if(builtNow){ applySim(); applyModes(); for(let k=1;k<tiers.length;k++) applyTierLayers(k); pathTargets(); }

  tiers.forEach((tr,i)=>{
    const w=(i===i0)?1-t:(i===i0+1?t:0);
    tr.w=w;
    if(w<=0.004||!tr.built){tr.group.visible=false; return;}
    tr.group.visible=true;
    const sc = i===0 ? Math.pow(MACRO_ZOOM,z) : Math.pow(4.2,z-i)*(i===1?0.78:i===3?SIN_K(z):1);   // lobule framed wider
    tr.group.scale.setScalar(sc);
    if(!tr.snapped && frameNo%4===0){ tr.snapped=true; snapAnnos(i); }
    // below the lobule the microvascular unit tips up so the acinar sheet faces the viewer
    if(i>=1&&i<=4) tr.group.rotation.x=-MICRO_TILT*THREE.MathUtils.smoothstep(z,1.3,2.0);
    if(i===0) macroFocus(tr.group,sc);
    if(i===3) hepFocus(tr.group,sc,z);
    const outgoing=(i===i0&&t>0.001);
    tr.group.renderOrder=outgoing?-2:2;
    setFade(tr.group,w,outgoing);
  });

  pathTick(dt); hvpgTick(dt); bxTick(dt); microTick(dt);
  // flow: acinus tier — blood portal→central, bile central→portal
  if(tiers[2].built&&tiers[2].w>0.02){
    const u=tiers[2].inner.userData, o=new THREE.Object3D();
    const sp=state.flow?0.085*(1-0.6*state.fibrosis)*Math.max(0.2,Math.abs(HEMO.inflow)):0;
    for(let i=0;i<u.bloodState.length;i++){
      const s=u.bloodState[i];
      s.t=(s.t+sp*dt*3.4)%1;
      u.sinusoids[s.row].getPointAt(s.t,o.position);
      o.rotation.set(0,0,0); o.scale.setScalar(1); o.updateMatrix();
      u.blood.setMatrixAt(i,o.matrix);
      u.blood.setColorAt(i,accol.copy(acA).lerp(acB,s.t));      // desaturates as O₂ is extracted
    }
    u.blood.instanceMatrix.needsUpdate=true; u.blood.instanceColor.needsUpdate=true;
    const vs=sp*0.9;
    for(let i=0;i<u.venState.length;i++){
      const s=u.venState[i];
      s.t=(s.t+vs*dt*3.4)%1;
      const y=1.12-2.24*s.t;
      o.position.set(u.PX+Math.cos(s.a)*s.r*0.15, y, Math.sin(s.a)*s.r*0.15); o.updateMatrix(); u.pvBlood.setMatrixAt(i,o.matrix);
      o.position.set(u.CX+Math.cos(s.a+1.7)*s.r*0.20, -y, Math.sin(s.a+1.7)*s.r*0.20); o.updateMatrix(); u.cvBlood.setMatrixAt(i,o.matrix);
    }
    u.pvBlood.instanceMatrix.needsUpdate=true; u.cvBlood.instanceMatrix.needsUpdate=true;
    for(let i=0;i<u.bileState.length;i++){
      const s=u.bileState[i];
      s.t=(s.t+(state.flow?0.05:0)*dt*3.4)%1;
      u.canalCurves[s.row].getPointAt(1-s.t,o.position);
      o.rotation.set(0,0,0); o.scale.setScalar(1); o.updateMatrix();
      u.bileP.setMatrixAt(i,o.matrix);
    }
    u.bileP.instanceMatrix.needsUpdate=true;
  }
  // flow: lobule tier — portal tracts → central vein → up the vein
  if(tiers[1].built&&tiers[1].w>0.02){
    const u=tiers[1].inner.userData, o=new THREE.Object3D(), col=new THREE.Color();
    const cA=new THREE.Color(0xD1473A), cB=new THREE.Color(0x6A3C78);
    const sp=state.flow?0.16*(1-0.65*state.fibrosis)*Math.max(0.2,Math.abs(HEMO.inflow)):0;
    for(let i=0;i<u.bst.length;i++){
      const s=u.bst[i];
      s.t+=sp*s.sp*dt*3.4; if(s.t>1.35) s.t=0;
      if(s.t<=1){
        const e=s.t*s.t*(3-2*s.t)*0.15+s.t*0.85;
        const r=1-e, cv=0.16;
        const len=Math.hypot(s.sx,s.sy);
        o.position.set(s.sx*r+(s.sx/len)*cv*e, s.sy*r+(s.sy/len)*cv*e, s.z);
        col.copy(cA).lerp(cB,s.t);
      } else {
        const q=(s.t-1)/0.35;
        o.position.set(Math.cos(i)*0.06, Math.sin(i)*0.06, s.z+(u.H/2+0.2-s.z)*q);
        col.copy(cB);
      }
      o.scale.setScalar(1); o.updateMatrix(); u.blood.setMatrixAt(i,o.matrix); u.blood.setColorAt(i,col);
    }
    u.blood.instanceMatrix.needsUpdate=true; u.blood.instanceColor.needsUpdate=true;
  }
  // flow: sinusoid tier
  if(tiers[3].built&&tiers[3].w>0.02){
    const u=tiers[3].inner.userData, o=new THREE.Object3D();
    const speed=state.flow?Math.max(0,0.11*(1-0.72*state.fibrosis)*Math.max(0.15,Math.abs(HEMO.inflow))):0;
    for(let i=0;i<u.rbcState.length;i++){
      const s=u.rbcState[i];
      s.t=(s.t+speed*dt*3.4+1)%1;
      o.position.set(Math.cos(s.a)*s.rr*u.lumK,Math.sin(s.a)*s.rr*u.lumK,-u.LEN/2+s.t*u.LEN);
      o.rotation.set(s.tilt,s.t*2.0,0.4); o.scale.setScalar(1); o.updateMatrix();
      u.rbc.setMatrixAt(i,o.matrix);
    }
    u.rbc.instanceMatrix.needsUpdate=true;
    for(let i=0;i<u.bpState.length;i++){
      const s=u.bpState[i];
      s.t=(s.t+(state.flow?0.055:0)*dt*3.4+1)%1;
      o.position.set(0,s.s*1.54,u.LEN/2-s.t*u.LEN);
      o.rotation.set(0,0,0); o.scale.setScalar(1); o.updateMatrix(); u.bp.setMatrixAt(i,o.matrix);
    }
    u.bp.instanceMatrix.needsUpdate=true;
    // venules: same slowing as the sinusoid (fibrosis raises resistance through the whole unit)
    const vs=state.flow?0.06*(1-0.65*state.fibrosis)*Math.max(0.2,Math.abs(HEMO.inflow)):0;
    for(let i=0;i<u.vst.length;i++){
      const s=u.vst[i];
      s.t=(s.t+vs*dt*3.4)%1;
      for(const [mesh,R,zc,dir] of [[u.pvPart,u.PVR,u.pvz,-1],[u.cvPart,u.CVR,u.cvz,1]]){
        const rr=R*0.8*s.r;
        // portal blood keeps running down past the sinusoid inlet; central blood arrives from upstream
        o.position.set(Math.cos(s.a)*rr, dir<0?1.75-s.t*3.5:-1.75+s.t*3.5, zc+Math.sin(s.a)*rr);
        o.rotation.set(0,0,0); o.scale.setScalar(1); o.updateMatrix(); mesh.setMatrixAt(i,o.matrix);
      }
    }
    u.pvPart.instanceMatrix.needsUpdate=true; u.cvPart.instanceMatrix.needsUpdate=true;
  }

  // the orbit target rises from −0.45 to 0 as the macroscopic tier zooms into the lobule. v44: applied as a change, so
  // a preset's own target (biopsy, SVT views) is not pulled back to −0.45 on the next frame
  { const ty=THREE.MathUtils.lerp(-0.45,0,THREE.MathUtils.clamp(z,0,1)); if(PERF.ty===undefined) PERF.ty=ty;
    const dy=ty-PERF.ty; PERF.ty=ty;
    if(Math.abs(dy)>1e-5&&!window.__camLock){ controls.target.y+=dy; camera.position.y+=dy; } }
  controls.update();
  { const now=performance.now();
    const mv = camera.position.distanceToSquared(PERF.cam)>3e-5 || 1-Math.abs(camera.quaternion.dot(PERF.q))>2e-7
      || Math.abs(state.zTarget-state.z)>0.002;
    PERF.cam.copy(camera.position); PERF.q.copy(camera.quaternion);
    if(mv) PERF.lastMoveT=now;
    PERF.moving = now-PERF.lastMoveT<200;
    const pr = PERF.moving ? PERF.move : PERF.full;
    if(pr!==renderer.getPixelRatio()) renderer.setPixelRatio(pr);
    if(rodShouldDraw(now)){ ROD.drawn++; ROD.lastDraw=now;
      const r0=performance.now(); if(!aoFrame(pr)) renderer.render(scene,camera); PERF.rMs+=performance.now()-r0; rodAfterDraw(); } else ROD.skipped++; }

  /* overlays */
  const near=t<0.5?i0:Math.min(i0+1,tiers.length-1);
  paintPanel(near);
  stopEls.forEach((s,i)=>{s.dataset.on=(i===near)?'1':'0';});

  // field of view in metres, from the dominant tier's own frame
  let m;
  if(near===0){ const d=camera.position.distanceTo(controls.target);
    m=2*d*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect*UNIT_M/Math.pow(MACRO_ZOOM,z); }
  else m=METRES[near]/Math.pow(4.2,z-near);
  $('#scalebar .val').textContent='≈ '+fmt(m*104/innerWidth);
  $('#depth').innerHTML=`depth ${z.toFixed(2)} / ${(tiers.length-1).toFixed(2)} · field <u>${fmt(m)}</u>`;
  $('#orient').innerHTML=`view <b>${viewName()}</b>`;

  const shown=[];
  const place=(el,v,grp,k,thresh)=>{
    if(k<=thresh){el.style.opacity='0'; el.style.pointerEvents='none'; return;}
    tmp.copy(v).applyMatrix4(grp.matrixWorld).project(camera);
    if(tmp.z>1||Math.abs(tmp.x)>1.25||Math.abs(tmp.y)>1.25){
      el.style.opacity='0'; el.style.pointerEvents='none'; return;}
    el.style.opacity=((k-thresh)/(1-thresh)).toFixed(2);
    el.style.pointerEvents='auto';
    el._x=(tmp.x*0.5+0.5)*innerWidth; el._y=(-tmp.y*0.5+0.5)*innerHeight;
    el.style.left=el._x+'px'; el.style.top=el._y+'px';
    shown.push(el);
  };
  if(coach.tier>=0 && frameNo%12===0) coachLayout();
  if(frameNo%10===0){ const o0=performance.now(); updateOcclusion(); PERF.occMs=Math.max(PERF.occMs*0.8,performance.now()-o0); }
  if(++PERF.n>=30){ const now=performance.now(), dtm=(now-PERF.t0)/PERF.n;
    if(PERF.on){ if(!PERF.el){ PERF.el=document.createElement('div'); PERF.el.id='perf'; document.body.appendChild(PERF.el); }
      PERF.el.style.display='block';
      PERF.el.textContent=`${(1000/dtm).toFixed(0)} fps · ${dtm.toFixed(1)} ms/frame · render ${(PERF.rMs/PERF.n).toFixed(1)} ms · occl ${PERF.occMs.toFixed(2)} ms · `+
        `${renderer.info.render.calls} draws · ${(renderer.info.render.triangles/1000).toFixed(0)}k tris · px ${renderer.getPixelRatio()}`; }
    else if(PERF.el) PERF.el.style.display='none';
    PERF.fps=1000/dtm; PERF.n=0; PERF.rMs=0; PERF.t0=now; }
  pins.forEach((ps,ti)=>{
    const tr=tiers[ti];
    ps.forEach(p=>{
      const lay=p.a.layer;
      const on = !p.a.chip && !p.occluded && (!p.a.cond || p.a.cond()) && (!lay || (ti===0
        ? (state.layers[lay]!==false && state.layers[lay]!=='off')
        : state.tl[ti][lay]!==false));
      place(p.el,p.v,tr.group,(tr.group.visible&&on)?tr.w:0,0.74);
    });
  });
  segPins.forEach(p=>place(p.el,p.v,tiers[0].group,
    (state.layers.segments&&tiers[0].group.visible)?tiers[0].w:0,0.6));
  if(frameNo%6===0) declutter(shown);

  if(selection&&selection.dock){
    const tr=tiers[selection.tier], r=$('#simbar').getBoundingClientRect();
    selEl.style.display=(tr.group.visible&&tr.w>=0.5&&!document.body.classList.contains('mob'))?'block':'none';
    selEl.style.left=(r.left+r.width/2)+'px'; selEl.style.top=(r.top-10)+'px';
    selEl.classList.remove('below'); selEl.querySelector('.box').style.transform='';
  } else if(selection){
    const tr=tiers[selection.tier];
    if(!tr.group.visible||tr.w<0.5) selEl.style.display='none';
    else{
      tmp.copy(selection.local).applyMatrix4(tr.group.matrixWorld).project(camera);
      if(tmp.z>1||Math.abs(tmp.x)>1.3||Math.abs(tmp.y)>1.3) selEl.style.display='none';
      else{
        selEl.style.display='block';
        const sx=(tmp.x*0.5+0.5)*innerWidth, sy=(-tmp.y*0.5+0.5)*innerHeight;
        selEl.style.left=sx+'px'; selEl.style.top=sy+'px';
        { const bx=selEl.querySelector('.box'), h=bx.offsetHeight, w=bx.offsetWidth;
          const topLim=$('#layerbar').getBoundingClientRect().bottom+8, below=sy-h-14<topLim;
          selEl.classList.toggle('below',below);
          const right=innerWidth-((innerWidth>860&&!$('#panel').classList.contains('closed'))?352:0)-10;
          const dx=Math.min(0,right-(sx+w/2))+Math.max(0,10-(sx-w/2));
          bx.style.transform=dx?`translateX(${dx}px)`:''; }
      }
    }
  }

  if(frameNo%5===0&&lastMove.ev&&!down&&!PERF.moving){
    const hit=hitInfo(lastMove.ev);
    if(hit){
      hoverEl.style.display='none';
      renderer.domElement.style.cursor='pointer';
    } else {
      hoverEl.style.display='none'; renderer.domElement.style.cursor='grab';
    }
  }

  if(!booted){booted=true; setTimeout(()=>$('#boot').classList.add('gone'),240);}
}


applySim(); applyModes(); paintPanel(0); pathTargets(); refreshPathUI(); frame();

// exposed for the headless build check

/* v40: extra harness screenshots (model-frame cameras; see harness.js) */
const HARNESS_SHOTS=[
  {name:'ctx_ribcage_front', wait:'ctx', cam:{model:true,t:[0.46,0.95,0.35],dir:[0,0.06,1],d:11.0,layers:{ribcage:'on'}}},
  {name:'ctx_ribcage_ghost', wait:'ctx', cam:{model:true,t:[-0.25,0.05,0.35],dir:[-0.35,0.12,1],d:6.4,layers:{ribcage:'ghost'}}},
  {name:'ctx_ribcage_right', wait:'ctx', cam:{model:true,t:[-0.55,0.25,0.0],dir:[-1,0.08,0.12],d:7.0,layers:{ribcage:'on'}}},
  {name:'ctx_spine_post',    wait:'ctx', cam:{model:true,t:[0.46,0.4,-0.6],dir:[0,0.08,-1],d:10.0,layers:{ribcage:'on'}}},
  {name:'ctx_all_home',      wait:'ctx', cam:{home:true,layers:{ribcage:'on'}}},
  {name:'dia_ant',           wait:'ctx', cam:{model:true,t:[0.40,0.55,0.30],dir:[0.10,0.35,1],d:7.2,layers:{diaphragm:'on',ribcage:'on'}}},
  {name:'dia_postsup',       wait:'ctx', cam:{model:true,t:[0.45,0.45,-0.40],dir:[0.15,0.80,-0.80],d:6.6,layers:{diaphragm:'on',parenchyma:'solid'}}},
  {name:'cc_front',          wait:'ctx', cam:{model:true,t:[0.46,0.75,0.60],dir:[0,0.10,1],d:6.8,layers:{ribcage:'on'}}},
  {name:'pc_biopsy_v41',     wait:'ctx', cam:{keep:true,layers:null}, pre:"(()=>{document.getElementById('bx-pc').click(); const A=window.__atlas; A.BX.stage=2; A.BX.t=0.95; A.bxPanel(); A.pcView();})()", post:"document.getElementById('bx-x').click()"},
  {name:'panc_acute_v41',    cam:{model:true,t:[0.6,-0.5,0.3],dir:[0,0.3,1],d:4.2,layers:{parenchyma:'off',stomach:'ghost'}}, pre:"document.querySelector('.segctl[data-key=panc] button[data-v=acute]').click()", settle:0.5, post:"document.getElementById('path-clear').click()"},
  {name:'pc_biopsy_ribs',    wait:'ctx', cam:{model:true,t:[-1.72,-0.03,-0.06],dir:[-0.30,0.12,1],d:1.9,layers:null},
     pre:"(()=>{document.getElementById('bx-pc').click(); const A=window.__atlas; A.BX.stage=2; A.BX.t=0.95; A.bxPanel();})()", post:"document.getElementById('bx-x').click()"},
  {name:'hilum_post_v40',    cam:{model:true,t:[1.35,-0.20,-0.40],dir:[0.15,0.25,-1],d:2.4,layers:{parenchyma:'off',kidneys:'ghost',stomach:'on',pancreas:'on',spleen:'on',portal:'on',artery:'on'}}},
  {name:'panc_tail_ant',     cam:{model:true,t:[1.15,-0.30,-0.15],dir:[0.1,-0.1,1],d:3.0,layers:{parenchyma:'off',stomach:'ghost',pancreas:'on',spleen:'on',kidneys:'on',portal:'on',artery:'on'}}},
  {name:'svt_preset',        cam:{model:true,t:[1.12,-0.36,-0.22],dir:[0.30,-0.28,1],d:3.6,layers:{parenchyma:'ghost',stomach:'ghost'}},
     pre:"(()=>{document.querySelector('.segctl[data-key=\"panc\"] button[data-v=\"acute\"]').click(); const c=document.getElementById('panc-svt'); c.checked=true; c.dispatchEvent(new Event('change'));})()", settle:1.5, post:"document.getElementById('path-clear').click()"}
];
window.__atlas = {ORG_TEX, spineCheck, ROD, sceneSig, ensure, QUAL, qualSet, LIVER_TEX, R36, LIGHTS, studioEnv, SKIN_ENV, scene, AO, gtao, composer, aoFrame, AO_BG, AXIS, AXIS_Q, AXIS_A, HOME, SKIN, mz, CT_ORGANS:()=>CT_ORGANS, tiers, state, snapAnnos, SEG, SEG_CENTROID, sdfLiver, insideLiver, segAt, HILUM_IN,
  CT_MODE, SEGP, falcX, SURF, LIVER_CM, UNIT_M, pins, updateOcclusion, CTP, PT, ORGAN_KEYS, SDF:{O:SO,N:[SNX,SNY,SNZ],P:SPITCH}, info, hitInfo, setSelection, camera, controls, applyModes, applySim, THREE, PERF, renderer, HVPG, hvpgStart, hvpgStop, hvpgGo, BIL, BX, bxPanel, pathCur, CTX, ctxLoad, svtView, HARNESS_SHOTS, LAYER_DEFAULTS, ribClear, DIA, diaLoad, pcView, forceRamps, frameStats, CTX_KEYS:['ribcage','diaphragm']};
