#!/usr/bin/env python3
"""v46 surface-vessel tile: one seamless (periodic) texture of small branching vessels drawn the way organs45.py grows the
gastric serosal vessels (wandering trunks that divide at ~35° into thinner branches, stopping at their length budget or
when they reach another vessel; dark core, pale edge, slightly raised), plus a low-frequency irregularity field.

    python3 pipeline/vessels46.py            # writes assets/vessels46.webp (1024², RGBA, lossless)

Channels: R core (dark lumen line), G edge (pale halo, wider than the core), B relief (0 = flat, 1 = crest of the widest
vessel; ∝ radius, as in organs45.py), A irregularity (smooth periodic fBm, 0.5 = mean) for mottling and a soft bump.
The page samples it in object space (triplanar) on the gallbladder's inferior surface (stomach-sized vessels), the arteries
(vasa vasorum: fine, faint) and the veins, portal system and bile ducts (surface vessels + irregularity). Nothing here
depends on the CT data. Needs numpy, scipy, pillow.
"""
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
N = 1024                     # texels per tile
SEED = 46


def grow(rng, target=30000):
    """vessel polylines in tile units [0, 1)² (periodic): list of (points (k, 2), radii (k,)) in texels. Growth stops at
    `target` texels of total length (≈ the gastric serosal density of organs45.py)."""
    step = 1.6 / N; paths = []; occ = []           # occ: x, y, r, path id, parent id of finished vessels
    T = [None]; tot = [0.0]; ids = [0]

    def near_other(p, r, own, par):
        if T[0] is None: return False
        P, tree = T[0]
        js = tree.query_ball_point(p, (8.0 + r + 2.5) / N)                         # periodic tree (boxsize 1)
        if not js: return False
        js = np.array(js); d = np.abs(P[js, :2] - p); d = np.minimum(d, 1 - d); dist = np.hypot(d[:, 0], d[:, 1]) * N
        other = (P[js, 3] != own) & (P[js, 4] != own) & (P[js, 3] != par)          # not itself, its branches or its parent
        return bool((other & (dist < P[js, 2] + r + 2.5)).any())

    def walk(p, ang, r, budget, depth, par):
        pid = ids[0] = ids[0] + 1
        pts, rad = [p.copy()], [r]; s = 0.0; nxt = rng.uniform(30, 55)
        while s < budget and r > 0.9 and tot[0] < target:
            ang += rng.normal(0, 0.10); p = (p + step * np.array([np.cos(ang), np.sin(ang)])) % 1.0
            s += step * N; tot[0] += step * N; r *= 0.9990
            if len(pts) > 6 and near_other(p, r, pid, par): break
            pts.append(p.copy()); rad.append(r)
            if s >= nxt and depth < 3:                                            # divide: a thinner branch leaves at ~35°
                side = rng.choice([-1, 1]); a2 = ang + side * np.radians(rng.uniform(28, 45))
                ang -= side * np.radians(rng.uniform(4, 10))                         # the parent bends a little away
                walk(p.copy(), a2, r * rng.uniform(0.62, 0.75), budget * rng.uniform(0.30, 0.50), depth + 1, pid)
                nxt = s + rng.uniform(40, 80)
        if len(pts) > 10:                                                          # no short stubs
            paths.append((np.array(pts), np.array(rad)))
            for q, rr in zip(pts, rad): occ.append([q[0], q[1], rr, pid, par])
            P = np.array(occ); T[0] = (P, cKDTree(P[:, :2] % 1.0, boxsize=1.0))

    k = 0
    while tot[0] < target and k < 60:                                             # trunks until the density is reached
        walk(rng.random(2), rng.uniform(0, 2 * np.pi), rng.uniform(3.4, 5.0), rng.uniform(500, 900), 0, -1); k += 1
    return paths


def fields(paths):
    S = np.vstack([np.c_[p, r] for p, r in paths])                                # samples: x, y, r
    # periodic: replicate the samples into the 8 neighbouring tiles
    off = np.array([(i, j) for i in (-1, 0, 1) for j in (-1, 0, 1)], float)
    Sx = np.vstack([np.c_[S[:, :2] + o, S[:, 2]] for o in off])
    tree = cKDTree(Sx[:, :2] * N)
    g = (np.stack(np.meshgrid(np.arange(N), np.arange(N), indexing='xy'), -1).reshape(-1, 2) + 0.5)
    rmax = S[:, 2].max()
    core = np.zeros(len(g)); edge = np.zeros(len(g)); rel = np.zeros(len(g))
    idx = tree.query_ball_point(g, rmax * 2.2 + 1.5)
    for i, js in enumerate(idx):
        if not js: continue
        js = np.array(js); d = np.linalg.norm(Sx[js, :2] * N - g[i], axis=1); r = Sx[js, 2]
        u = d / r
        core[i] = np.clip(1.25 - 2.2 * u, 0, 1).max()                              # lumen line: ~45 % of the width
        edge[i] = np.clip(1.6 - 1.0 * u, 0, 1).max() ** 1.5                         # pale halo out to ~1.6 r
        rel[i] = (np.sqrt(np.clip(1 - (u / 1.3) ** 2, 0, 1)) * r).max()            # rounded crest, height ∝ radius
    sh = (N, N)
    return core.reshape(sh), edge.reshape(sh), (rel / rmax).reshape(sh)


def periodic_fbm(rng, oct_=5):
    y, x = np.mgrid[0:N, 0:N] / N; f = np.zeros((N, N)); amp = 1.0; tot = 0
    for o in range(oct_):
        k = 2 ** (o + 1)
        for _ in range(6):
            kx, ky = rng.integers(-k, k + 1, 2); ph = rng.uniform(0, 2 * np.pi)
            f += amp * np.sin(2 * np.pi * (kx * x + ky * y) + ph)
        tot += amp * 6; amp *= 0.55
    return f / np.sqrt(tot)


def main():
    rng = np.random.default_rng(SEED)
    paths = grow(rng)
    L = sum(np.linalg.norm(np.diff(p, axis=0), axis=1).sum() for p, _ in paths) * N
    print(f'{len(paths)} vessels, {L:.0f} texels of length; radii {min(r.min() for _, r in paths):.1f}-{max(r.max() for _, r in paths):.1f} texels')
    core, edge, rel = fields(paths)
    irr = np.clip(0.5 + 0.22 * periodic_fbm(rng), 0, 1)
    img = np.stack([core, edge, rel, irr], -1)
    out = ROOT / 'assets/vessels46.webp'
    Image.fromarray(np.round(img * 255).astype(np.uint8), 'RGBA').save(out, lossless=True, quality=100, method=6, exact=True)
    print(f'wrote {out.name}: {out.stat().st_size/1024:.0f} KB; coverage core {np.mean(core>0.2)*100:.1f} %, edge {np.mean(edge>0.2)*100:.1f} %')


if __name__ == '__main__':
    main()
