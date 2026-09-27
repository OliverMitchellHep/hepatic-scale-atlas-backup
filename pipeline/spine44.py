#!/usr/bin/env python3
"""Spine centreline for the scene-root alignment (v44).

    python3 pipeline/spine44.py

Reads the vertebrae T1–L5 from assets/ctx41.json (layout in CTX_META, src/atlas.js), takes each vertebral BODY as the
anterior 38 % (antero-posterior) of the vertebra within 3 cm of its midline (drops the arch, spinous and transverse
processes), and its area-weighted surface centroid. A least-squares line (SVD) through the 17 centroids gives the axis.
Prints AXIS_UP (the axis) and AXIS_A (the point on the axis that the page maps to the world origin, chosen so the default
orbit target (0,-0.45,0) lies on the spine at the old target's height), and the X/Z drift of the fitted line from world
vertical over its length before and after, in mm. The page re-measures the same thing at run time (spineCheck()).
"""
import base64, json, re
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MM = 69.9757   # mm per model unit (LIVER_CM / liver transverse extent)


def centroids():
    src = (ROOT / 'src/atlas.js').read_text()
    M = json.loads(re.search(r'const CTX_META=(\{.*?\});\n', src).group(1))
    buf = base64.b64decode(json.loads((ROOT / 'assets/ctx41.json').read_text())['b64'])
    G = M['groups']['bone']
    P = np.frombuffer(buf, np.int16, G['nv'] * 3, G['pos']).reshape(-1, 3) * M['qs']
    F = np.frombuffer(buf, np.uint16, G['nf'] * 3, G['idx']).reshape(-1, 3)
    pid = np.frombuffer(buf, np.uint8, G['nf'], G['pid'])
    out = []
    for i, p in enumerate(M['parts']):
        if not p['n'].startswith('vert_'): continue
        tri = P[F[pid == i]]; c = tri.mean(1); a = 0.5 * np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1)
        z0, z1 = c[:, 2].min(), c[:, 2].max()
        sel = (c[:, 2] > z1 - 0.38 * (z1 - z0)) & (np.abs(c[:, 0] - np.median(c[:, 0])) < 0.45)
        out.append((p['n'][5:], (c[sel] * a[sel, None]).sum(0) / a[sel].sum()))
    return out


def rot(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = a @ b
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]); return np.eye(3) + K + K @ K / (1 + c)


def drift(W):
    m = W.mean(0); d = np.linalg.svd(W - m)[2][0]; d *= np.sign(d[1]); t = (W - m) @ d; L = t.max() - t.min()
    perp = (W - m) - np.outer(t, d)
    return L * MM, d[0] / d[1] * L * MM, d[2] / d[1] * L * MM, np.sqrt((perp ** 2).sum(1).mean()) * MM


if __name__ == '__main__':
    lab_c = centroids(); C = np.array([c for _, c in lab_c])
    m = C.mean(0); d = np.linalg.svd(C - m)[2][0]; d *= np.sign(d[1])
    up_old, A_old = np.array([0.1454, 0.9718, -0.1855]), np.array([0.367, 0, -0.091])   # v43 AXIS_UP / AXIS_A
    R_old = rot(up_old, np.array([0, 1, 0]))
    tgt = R_old.T @ np.array([0, -0.45, 0]) + A_old                  # v43 orbit target, model frame
    A_new = m + d * (tgt[1] - m[1]) / d[1] + d * 0.45
    R_new = rot(d, np.array([0, 1, 0]))
    for n, c in lab_c: print(f'{n:>4} {c.round(4)}')
    print('AXIS_UP', d.round(6), ' AXIS_A', A_new.round(4), ' spine centroid (model)', m.round(4))
    for tag, R, A in (('before (v43)', R_old, A_old), ('after (v44)', R_new, A_new)):
        L, dx, dz, rms = drift((R @ (C - A).T).T)
        print(f'{tag}: fitted centreline {L:.0f} mm long, drift from vertical dx {dx:+.2f} mm, dz {dz:+.2f} mm; '
              f'centroids about the line (natural curvature) rms {rms:.1f} mm')
