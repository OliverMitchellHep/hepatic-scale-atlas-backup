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

## Geometry (CT → meshes)
The organ, context and diaphragm meshes come from the s1267 CT case (TotalSegmentator masks), through the scripts recorded in the project docs `hepatic-scale-atlas-v39/v40-pipeline-scripts.md`. The CT source data are held privately in the "Atlas Source s1267" artifact and are deliberately **not** in this repository until the dataset licence for public redistribution is confirmed.

## Fidelity rule for new meshes
Every new or re-exported mesh states its simplification error limit (default 0.1 % of its bounding-box diagonal for desktop) and gets a side-by-side screenshot, original vs simplified, before it replaces the old one.
