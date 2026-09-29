# Asset pipeline

Offline scripts that produce the files in `assets/`. The page never runs these; they are re-run only when a mesh or texture changes.

## Liver surface maps (v42, superseded by bake44.py; kept for the record)
Inputs: `P.npy` (vertex positions) and `idx.npy` (faces), decoded from `data/liver-data.json` (`ct.pos` Int16 × `ct.qs`, `ct.idx` Uint16; the first `ct.n0` vertices are the original CT vertices, the rest are UV seam copies).

1. `python3 uv42.py` → `UV.npy`, `F.npy`, `dup.npy` (xatlas unwrap; original vertex indices kept)
2. `python3 hi42.py` → `hiV.npy`, `hiF.npy` (high-detail mesh for baking)
3. `python3 -c "import sys; sys.argv=['x','4096','2048']; exec(open('bake42.py').read())"` (headless Blender via `pip install bpy`; `BAKE_POS=1` for the position map)
4. `python3 compose42.py` → `liver42_albedo.webp`, `liver42_normal.webp`, `liver42_orm.webp`, `liver42_detail.png` → copy to `assets/`

Needs: numpy, scipy, pillow, xatlas, bpy (5.0). Blender subdivision on this mesh used >6 GB, so the high mesh is built in numpy.

## Organ surface maps (v44) — `bake44.py`
One scripted headless run per organ (bpy imported as a module; no Blender GUI). Work files go to `pipeline/work44/<organ>/` (not committed).

    python3 pipeline/bake44.py liver        # ~15 min on 4 cores; writes assets/liver44_{albedo,normal,orm}_{4k,2k}.webp
    python3 pipeline/bake44.py pancreas     # ~4 min; writes assets/pancreas44_*_{2k,1k}.webp and the pancreas UVs in data/liver-data.json
    python3 pipeline/bake44.py liver --stage compose    # re-compose only (bakes cached)

Stages: `uv` (xatlas; the liver keeps its v42 unwrap because pathology code indexes its vertices), `high` (numpy subdivision + relief),
`bake` (Cycles, CPU, high → low: tangent-space normal, self-AO, cavity, curvature (vertex colour → emission), thickness (AO from inside
with flipped normals), object-space position), `compose` (albedo, normal, ORM = R occlusion, G roughness, B clearcoat / wetness mask,
at the desktop and the mobile size; the page picks one set by device at load).

Format: WebP, not KTX2 — the artifact host refuses `.ktx2` (see CLAUDE.md), so UASTC / ETC1S compression is not used. If the site
moves to a host that serves KTX2, add a `toktx`/`basisu` step after compose (UASTC for `*_normal_*`, ETC1S for albedo and ORM) and
load with `KTX2Loader`.

Needs numpy, scipy, pillow, xatlas, bpy (5.0). `pancreas44.py` (the pancreas remodel) additionally needs scikit-image,
fast-simplification and trimesh; `spine44.py` needs numpy only.

## v45 additions
    python3 pipeline/pancreas44.py          # pancreas (v45: head in the C-loop, CBD/MPD sheath, GDA + branches grooved)
    python3 pipeline/fossa45.py             # gallbladder fossa re-mesh on the liver (then re-bake the liver)
    python3 pipeline/spleen45.py            # spleen placement (least move for a 1.1 mm stomach gap)
    python3 pipeline/falc45.py              # prints the falciform centreline literal (FALC45) for src/atlas.js
    python3 pipeline/bake44.py <organ>      # liver, pancreas, stomach, duodenum, esophagus, spleen, kidney_left, kidney_right

- `falc45.py`: the falciform band, fan and coronary ligament as surface fields; `bake44.py liver` adds their relief and colour.
- `fossa45.py`: rebuilds the gallbladder surface exactly as the page does, re-meshes the bed, re-unwraps the liver and updates the SDF.
- `organs45.py`: relief, colour and grown surface vessels (arcades + branching serosal vessels) for the other organs.
  Tangent-space normal maps like the liver's (object-space maps were tried: 8-bit object normals stair-step in the
  highlights of smooth glossy capsules such as the spleen's). UV charts get 32 px gutters at 4K so mip levels do not bleed
  between charts.
- Every organ set is 4K desktop / 2K phone WebP (`<organ>44_{albedo,normal,orm}_{4k,2k}.webp`), chosen at load.

## Geometry (CT → meshes)
The organ, context and diaphragm meshes come from the s1267 CT case (TotalSegmentator masks), through the scripts recorded in the project docs `hepatic-scale-atlas-v39/v40-pipeline-scripts.md`. The CT source data are held privately in the "Atlas Source s1267" artifact and are deliberately **not** in this repository until the dataset licence for public redistribution is confirmed.

## Fidelity rule for new meshes
Every new or re-exported mesh states its simplification error limit (default 0.1 % of its bounding-box diagonal for desktop) and gets a side-by-side screenshot, original vs simplified, before it replaces the old one.

## v46 additions
    python3 pipeline/spleen46.py --dry                       # search a rotation fitting the spleen to the fundus
    python3 pipeline/spleen46.py --x 1.01 -6.28 3.69 -2.65 -0.21 3.33   # apply it (degrees, mm)
    python3 pipeline/vessels46.py                            # assets/vessels46.webp: seamless surface-vessel tile

- `pancreas44.py`: v46 head (one ellipsoid; no HEAD2 / uncinate; duct sheath only below SHEATH_Y), then `bake44.py pancreas`.
- `falc45.py`: v46 band / fan / coronary sizes and the run down to the inferior border, then `bake44.py liver`.
- `organs45.py`: v46 kidney colour (no fat, no vessels), sparser oesophageal vessels; re-bake those organs.

## v47 additions
    python3 pipeline/kidney46.py            # right kidney: fill the inferior-pole hollow (then bake44.py kidney_right)

- `pancreas44.py`: the head is taken from the v43 gland (read from git, commit 233307b) and blended into the neck; reports
  whether any vessel axis runs through the gland.
- `falc45.py` / `bake44.py`: falciform raised ~2 mm, painted much more transparently.
- `organs45.py`: tortuous gastric / duodenal arcades, vessels raised in sections and varying in opacity, the v44 subserosal
  network, darker colour patches; lengthwise pale oesophageal vessels; rougher kidneys with paler patches.

## v48 additions
- `falc45.py`: the ligament follows `ct.falc` / `ct.seg.ua` moved 0.105 units to the patient's left (into the umbilical notch);
  `APEX_NY` 0.58 → 0.80 (triangle higher on the superior surface), `SIDE_POW` 1.9 (concave sides), `BOW` 5 mm (concave
  base). Prints the `FALC45` literal for `src/atlas.js`; then `bake44.py liver --stage high,bake,compose`.
