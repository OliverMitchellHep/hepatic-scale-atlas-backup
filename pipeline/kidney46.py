#!/usr/bin/env python3
"""v46b right kidney: fill the concave dent on the inferior pole (the CT surface had a broad hollow and crease on the lower
pole's lateral / posterior / inferior side). The renal sinus at the hilum and the rest of the kidney keep their shape.

    python3 pipeline/kidney46.py --dry    # report
    python3 pipeline/kidney46.py          # writes data/liver-data.json ct.viscera.kidney_right (pos, idx; then
                                          # python3 pipeline/bake44.py kidney_right, which re-unwraps it)

Method (volumetric, so the filled surface cannot fold or stack): the kidney's signed distance is computed on a grid
(PITCH); below Y0 it is blended towards the signed distance of the kidney's convex hull (FILL of the way, fully below Y1),
which fills the dent with the pole's own outward-bulging form; the surface is re-extracted (marching cubes),
Taubin-smoothed and decimated back to the page budget. The hull is only used below Y0, above the renal sinus.
"""
import json, sys
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from spleen45 import mesh
from pancreas44 import taubin, encode
DATA = ROOT / 'data/liver-data.json'; MM = 69.9757
PITCH = 0.007                # voxel (0.49 mm)
Y0, Y1 = -1.03, -1.15        # the hull blend fades in below Y0, full below Y1 (the pole spans y -1.61 … ; sinus above -0.95)
FILL = 0.9
TARGET_V = 8000


def main():
    import trimesh, fast_simplification
    from skimage.measure import marching_cubes
    J = json.loads(DATA.read_text()); qs = J['ct']['qs']
    V, F = mesh(J, 'kidney_right'); m = trimesh.Trimesh(V, F, process=False); H = m.convex_hull
    vx = m.voxelized(PITCH).fill(); pad = 6
    occ = np.pad(vx.matrix.astype(bool), pad); lo = vx.transform[:3, 3] - pad * PITCH; n = np.array(occ.shape)
    s0 = (ndimage.distance_transform_edt(~occ) - ndimage.distance_transform_edt(occ)) * PITCH
    yy = lo[1] + PITCH * np.arange(n[1]); w = np.clip((Y0 - yy) / (Y0 - Y1), 0, 1); w = w * w * (3 - 2 * w)
    s = s0.copy(); js = np.where(w > 0)[0]
    if len(js):
        xs, zs = lo[0] + PITCH * np.arange(n[0]), lo[2] + PITCH * np.arange(n[2])
        G = np.stack(np.meshgrid(xs, yy[js], zs, indexing='ij'), -1).reshape(-1, 3)
        Nf = H.face_normals; Df = (Nf * H.triangles[:, 0]).sum(1)
        sh = np.full(len(G), -9.0)
        for a in range(0, len(G), 20000): sh[a:a + 20000] = (G[a:a + 20000] @ Nf.T - Df).max(1)   # convex: max of planes
        sh = sh.reshape(n[0], len(js), n[2]); ww = (FILL * w[js])[None, :, None]
        s[:, js, :] = s0[:, js, :] * (1 - ww) + np.minimum(s0[:, js, :], sh) * ww   # only ever adds material
    s = ndimage.gaussian_filter(s, 1.6)                                # no voxel staircase left to bake into the normal map
    verts, faces, _, _ = marching_cubes(s, 0.0, spacing=(PITCH,) * 3); verts += lo
    verts = taubin(verts, faces, it=25)
    v2, f2 = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_reduction=1 - TARGET_V / len(verts))
    v2 = v2.astype(np.float64); f2 = f2.astype(np.int64)
    if np.einsum('ij,ij->i', v2[f2[:, 0]], np.cross(v2[f2[:, 1]], v2[f2[:, 2]])).sum() < 0: f2 = f2[:, ::-1].copy()
    m2 = trimesh.Trimesh(v2, f2, process=False)
    up = V[:, 1] > Y0 + 0.03; dev = np.abs(trimesh.proximity.closest_point(m2, V[up])[1])
    dn0, dn2 = V[:, 1] < Y1, v2[:, 1] < Y1
    print(f'{len(V)} → {len(v2)} vertices; watertight {m2.is_watertight}; above the pole: mean {dev.mean()*MM:.2f} mm, max {dev.max()*MM:.2f} mm; '
          f'pole depth inside the hull: before {trimesh.proximity.signed_distance(H, V[dn0]).max()*MM:.1f} mm, after {trimesh.proximity.signed_distance(H, v2[dn2]).max()*MM:.1f} mm; '
          f'volume {m.volume*MM**3/1000:.1f} → {m2.volume*MM**3/1000:.1f} ml')
    if '--dry' in sys.argv: return
    d = J['ct']['viscera']['kidney_right']; assert len(v2) < 65536
    d['pos'], d['idx'] = encode(v2, f2, qs)
    for k in ('uv', 'dup', 'n0'): d.pop(k, None)
    DATA.write_text(json.dumps(J, separators=(',', ':'))); print('wrote', DATA.name)


if __name__ == '__main__':
    main()
