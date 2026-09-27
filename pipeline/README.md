# Asset pipeline

Offline scripts that produce the files in `assets/`. The page never runs these; they are re-run only when a mesh or texture changes.

## Liver surface maps (v42)
Inputs: `P.npy` (vertex positions) and `idx.npy` (faces), decoded from `data/liver-data.json` (`ct.pos` Int16 × `ct.qs`, `ct.idx` Uint16; the first `ct.n0` vertices are the original CT vertices, the rest are UV seam copies).

1. `python3 uv42.py` → `UV.npy`, `F.npy`, `dup.npy` (xatlas unwrap; original vertex indices kept)
2. `python3 hi42.py` → `hiV.npy`, `hiF.npy` (high-detail mesh for baking)
3. `python3 -c "import sys; sys.argv=['x','4096','2048']; exec(open('bake42.py').read())"` (headless Blender via `pip install bpy`; `BAKE_POS=1` for the position map)
4. `python3 compose42.py` → `liver42_albedo.webp`, `liver42_normal.webp`, `liver42_orm.webp`, `liver42_detail.png` → copy to `assets/`

Needs: numpy, scipy, pillow, xatlas, bpy (5.0). Blender subdivision on this mesh used >6 GB, so the high mesh is built in numpy.

## Geometry (CT → meshes)
The organ, context and diaphragm meshes come from the s1267 CT case (TotalSegmentator masks), through the scripts recorded in the project docs `hepatic-scale-atlas-v39/v40-pipeline-scripts.md`. The CT source data are held privately in the "Atlas Source s1267" artifact and are deliberately **not** in this repository until the dataset licence for public redistribution is confirmed.

## Fidelity rule for new meshes
Every new or re-exported mesh states its simplification error limit (default 0.1 % of its bounding-box diagonal for desktop) and gets a side-by-side screenshot, original vs simplified, before it replaces the old one.
