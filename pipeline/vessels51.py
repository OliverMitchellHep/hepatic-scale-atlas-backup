#!/usr/bin/env python3
"""v51 surface-vessel tile (v46's, reworked to be one connected, more branched network): one seamless (periodic) texture of
small branching vessels drawn the way organs45.py grows the gastric serosal vessels (wandering vessels that divide at ~35°
into thinner branches; dark core, pale edge, slightly raised), plus a low-frequency irregularity field.
v51: after the first trunk every new vessel leaves an existing one as a side branch, so the network is connected; a vessel
that reaches another joins it (a short run straight to the nearest point: an anastomosis) instead of stopping short of it;
branching goes one level deeper and a little more often; vessels end at 1.1 texels, not 0.9 (no dotted hairlines).

    python3 pipeline/vessels51.py            # writes assets/vessels51.webp (1024², RGBA, lossless)

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
SEED = 51


def grow(rng, target=21000):
    """vessel polylines in tile units [0, 1)² (periodic): list of (points (k, 2), radii (k,)) in texels. Growth stops at
    `target` texels of total length (≈ the gastric serosal density of organs45.py)."""
    step = 1.6 / N; paths = []; occ = []; pids = []           # occ: x, y, r, path id, parent id of finished vessels
    T = [None]; tot = [0.0]; ids = [0]

    def near_other(p, r, own, par):
        """the nearest point of another vessel within reach (tile units, unwrapped next to p), or None"""
        if T[0] is None: return None
        P, tree = T[0]
        js = tree.query_ball_point(p, (8.0 + r + 2.5) / N)                         # periodic tree (boxsize 1)
        if not js: return None
        js = np.array(js); d = P[js, :2] - p; d = (d + 0.5) % 1.0 - 0.5; dist = np.hypot(d[:, 0], d[:, 1]) * N
        other = (P[js, 3] != own) & (P[js, 4] != own) & (P[js, 3] != par)          # not itself, its branches or its parent
        ok = other & (dist < P[js, 2] + r + 2.5)
        if not ok.any(): return None
        k = np.argmin(np.where(ok, dist, np.inf)); return p + d[k]

    def walk(p, ang, r, budget, depth, par):
        pid = ids[0] = ids[0] + 1
        pts, rad = [p.copy()], [r]; s = 0.0; nxt = rng.uniform(30, 55)
        joined = False
        while s < budget and r > 1.1 and tot[0] < target:
            ang += rng.normal(0, 0.10); p = (p + step * np.array([np.cos(ang), np.sin(ang)])) % 1.0
            s += step * N; tot[0] += step * N; r *= 0.9990
            q = near_other(p, r, pid, par) if len(pts) > 6 else None
            if q is not None:                                                      # v51: run on into it (anastomosis)
                seg = q - p; L = np.hypot(*seg) * N
                for k in range(1, max(2, int(L / 1.6)) + 1): pts.append((p + seg * min(1.0, k * 1.6 / max(L, 1e-6))) % 1.0); rad.append(r)
                joined = True; break
            pts.append(p.copy()); rad.append(r)
            if s >= nxt and depth < 4:                                            # divide: a thinner branch leaves at ~35°
                side = rng.choice([-1, 1]); a2 = ang + side * np.radians(rng.uniform(28, 45))
                ang -= side * np.radians(rng.uniform(4, 10))                         # the parent bends a little away
                walk(p.copy(), a2, r * rng.uniform(0.64, 0.78), budget * rng.uniform(0.35, 0.55), depth + 1, pid)
                nxt = s + rng.uniform(30, 60)
        if len(pts) > 10 or (joined and len(pts) > 3):                             # no short stubs (a joining link may be short)
            paths.append((np.array(pts), np.array(rad))); pids.append(pid)
            for q, rr in zip(pts, rad): occ.append([q[0], q[1], rr, pid, par])
            P = np.array(occ); T[0] = (P, cKDTree(P[:, :2] % 1.0, boxsize=1.0))

    for _ in range(4):                                                             # a few long trunks, which join where they meet
        walk(rng.random(2), rng.uniform(0, 2 * np.pi), rng.uniform(3.6, 5.0), rng.uniform(700, 1000), 0, -1)
    k = 0
    while tot[0] < target and k < 900:                                            # v51: fill the emptiest part of the tile with a
        P, tree = T[0]                                                              # branch of the nearest vessel, heading into it,
        C = rng.random((96, 2)); dC, _ = tree.query(C % 1.0)                        # so the network stays connected and even
        c = C[np.argmax(dC)]; _, js = tree.query(c)
        q = P[js, :2]; d = c - q; d = (d + 0.5) % 1.0 - 0.5
        a = np.arctan2(d[1], d[0]) + rng.normal(0, 0.25)
        walk(q.copy(), a, min(3.4, max(2.0, P[js, 2] * rng.uniform(0.72, 0.88))), rng.uniform(260, 560), 1, int(P[js, 3])); k += 1
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
    out = ROOT / 'assets/vessels51.webp'
    Image.fromarray(np.round(img * 255).astype(np.uint8), 'RGBA').save(out, lossless=True, quality=100, method=6, exact=True)
    print(f'wrote {out.name}: {out.stat().st_size/1024:.0f} KB; coverage core {np.mean(core>0.2)*100:.1f} %, edge {np.mean(edge>0.2)*100:.1f} %')


if __name__ == '__main__':
    main()
