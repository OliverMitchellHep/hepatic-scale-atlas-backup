#!/usr/bin/env python3
"""v45 organ surfaces for the scripted bake (pipeline/bake44.py): relief, colour and surface vessels for the stomach,
duodenum, spleen, pancreas, kidneys and oesophagus.

    python3 pipeline/organs45.py stomach      # report the arcades / vessel network (lengths, counts) without baking

Surface vessels (stomach, duodenum, oesophagus; faint capsular vessels on the kidneys) are grown on each organ's own mesh:
  arcades   stomach: the gastroepiploic arcade along the greater curvature and the left/right gastric arcade along the
            lesser curvature, painted on the gastric surface (the omentum is not rendered). duodenum: the pancreatico-
            duodenal arcade along the medial (concave) border. oesophagus: a few longitudinal trunks.
  branches  from points along each arcade, serosal branches grow across the anterior and posterior walls in ~1 mm surface
            steps (projected onto the mesh), wandering gently and dividing at ~35° into thinner branches, stopping at
            their length budget or when they reach another vessel.
  look      subtle dark-red core, pale-red edges, slightly raised (relief ∝ radius), in the colour and normal maps.
Curvature lines come from rings of equal geodesic fraction between the organ's two ends (stomach: GOJ → pylorus;
duodenum: pylorus → duodenojejunal end; oesophagus: top → GOJ): for each ring the lesser / medial side is the vertex
nearest the concavity (the mean of the ring centres), the greater side the farthest. Model units: 1 unit = 69.9757 mm.
"""
import sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from noise3 import fbm, worley_f2f1

MM = 69.9757


def lin(h): return (np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)]) / 255.0) ** 2.2


def ss(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def vnormals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); N = np.zeros_like(V)
    for k in range(3): np.add.at(N, F[:, k], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12)


class Surface:
    """dense samples of a mesh surface with normals: nearest-point projection for growing vessels"""
    def __init__(self, V, F, per=24, seed=0):
        rng = np.random.default_rng(seed); a, b = rng.random((2, len(F), per)); m = a + b > 1; a[m], b[m] = 1 - a[m], 1 - b[m]
        A, B, C = V[F[:, 0]][:, None], V[F[:, 1]][:, None], V[F[:, 2]][:, None]
        self.S = np.vstack([(A + (B - A) * a[..., None] + (C - A) * b[..., None]).reshape(-1, 3), V])
        fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-15
        self.N = np.vstack([np.repeat(fn, per, 0), vnormals(V, F)]); self.T = cKDTree(self.S)

    def project(self, P):
        _, i = self.T.query(P); return self.S[i], self.N[i]


def geodesic(V, F, src):
    import scipy.sparse as sp, scipy.sparse.csgraph as cg
    E = np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]); w = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)
    A = sp.coo_matrix((w, (E[:, 0], E[:, 1])), shape=(len(V),) * 2).tocsr(); A = A.maximum(A.T)
    return cg.dijkstra(A, indices=src, min_only=True)


def curvature_lines(V, F, a, b, nring=60, ref=None):
    """rings of equal geodesic fraction from end a to end b (points); returns (inner line, outer line, ring centres)"""
    ia = np.argsort(np.linalg.norm(V - a, axis=1))[:12]; ib = np.argsort(np.linalg.norm(V - b, axis=1))[:12]
    da, db = geodesic(V, F, ia), geodesic(V, F, ib); s = da / (da + db + 1e-12)
    edges = np.linspace(0, 1, nring + 1); cen = []
    for k in range(nring):
        m = (s >= edges[k]) & (s < edges[k + 1]); cen.append(V[m].mean(0) if m.any() else np.full(3, np.nan))
    cen = np.array(cen); ok = ~np.isnan(cen[:, 0]); cen = cen[ok]
    ref = cen.mean(0) if ref is None else np.asarray(ref)
    inner, outer = [], []
    for k in np.where(ok)[0]:
        m = (s >= edges[k]) & (s < edges[k + 1]); R = V[m]; d = np.linalg.norm(R - ref, axis=1)
        inner.append(R[d.argmin()]); outer.append(R[d.argmax()])
    sm = lambda P: np.array([P[max(0, i - 2):i + 3].mean(0) for i in range(len(P))])
    return sm(np.array(inner)), sm(np.array(outer)), cen


def resample(P, step):
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]; s = np.arange(0, L[-1], step)
    return np.stack([np.interp(s, L, P[:, k]) for k in range(3)], 1)


def grow(surf, arcades, rng, spacing=7.0, length=(22, 45), r0=0.55, sides=(1, -1), avoid=1.3, split=11.0, angle=35):
    """vessels: list of (points, radii). arcades: list of (polyline on the surface, radius mm). Branches leave each arcade
    every ~spacing mm on alternate walls (sides: ±1 across the arcade) and grow across the surface."""
    V = []
    for P, ra in arcades:
        P = resample(P, 0.5 / MM); P, _ = surf.project(P); V.append((P, np.full(len(P), ra / MM)))
    occ = [p for p, _ in V]
    tree = cKDTree(np.vstack(occ)); pending = []
    for P, ra in arcades:
        P = resample(P, spacing / MM); P, N = surf.project(P)
        T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-12
        for i in range(1, len(P) - 1):
            for sd in sides:
                if rng.random() < 0.18: continue
                d = np.cross(N[i], T[i]) * sd; pending.append((P[i], d, r0 * (0.8 + 0.4 * rng.random()), rng.uniform(*length), 0))
    step = 1.0 / MM; new = []
    while pending:
        p, d, r, Lb, gen = pending.pop()
        pts, rad = [p], [r / MM]; nsplit = split * (0.7 + 0.6 * rng.random())
        for k in range(int(Lb)):
            q, n = surf.project(pts[-1] + d * step)
            d = d - n * (d @ n); d += np.cross(n, d) * rng.normal(0, 0.18); d /= np.linalg.norm(d) + 1e-12
            q, n = surf.project(pts[-1] + d * step)
            if len(pts) > 3 and tree.query(q)[0] < avoid / MM: break
            t = k / max(Lb, 1); rr = r * (1 - 0.55 * t)
            pts.append(q); rad.append(rr / MM)
            if k > 3 and k % int(nsplit) == 0 and rr > 0.18 and gen < 3:
                rot = np.radians(angle) * rng.choice([-1, 1]); dn = d * np.cos(rot) + np.cross(n, d) * np.sin(rot)
                pending.append((q, dn / np.linalg.norm(dn), rr * 0.72, (Lb - k) * 0.75, gen + 1))
        if len(pts) > 4:
            new.append((np.array(pts), np.array(rad))); tree = cKDTree(np.vstack([tree.data, np.array(pts)[:-2]]))
    return V + new


class VesselField:
    """distance-based vessel appearance: core (dark), edge (pale), relief (raised), from vessel centrelines + radii"""
    def __init__(self, vessels, step=0.15 / MM):
        Ps, Rs = [], []
        for p, r in vessels:                     # densify: the grown centrelines are 1 mm steps (field would bead)
            L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]; s = np.arange(0, L[-1] + 1e-9, step)
            Ps.append(np.stack([np.interp(s, L, p[:, k]) for k in range(3)], 1)); Rs.append(np.interp(s, L, r))
        P = np.vstack(Ps); R = np.concatenate(Rs)
        self.P, self.R, self.T = P, R, cKDTree(P); self.rmax = R.max()

    def __call__(self, X):
        d, i = self.T.query(X, k=6, distance_upper_bound=self.rmax * 1.6)
        ok = np.isfinite(d); ii = np.where(ok, i, 0); r = np.where(ok, self.R[ii], 1e-6)
        u = np.where(ok, d / r, 9).min(1); rr = np.where(ok, r, 0).max(1)
        core = 1 - ss(u, 0.30, 0.62); edge = 1 - ss(u, 0.75, 1.15)
        relief = rr * 0.30 * np.sqrt(np.clip(1 - np.minimum(u, 1) ** 2, 0, 1))
        return core, edge, relief


# ───────────────────────── per-organ surfaces ─────────────────────────
LAND = {   # CT frame landmarks (measured on the meshes)
    'goj': np.array([0.775, 0.45, -0.017]), 'pylorus': np.array([-0.336, -0.562, 0.573]),
    'dj': np.array([1.012, -1.557, 0.25]), 'oes_top': np.array([0.335, 1.325, -0.412]), 'head': np.array([0.0, -0.9, 0.35])}


def vessels_for(organ, V, F, seed=45):
    rng = np.random.default_rng(seed); surf = Surface(V, F)
    if organ == 'stomach':
        les, gre, _ = curvature_lines(V, F, LAND['goj'], LAND['pylorus'], 70)
        return grow(surf, [(gre[2:-2], 0.95), (les[3:-2], 0.85)], rng, spacing=7.5, length=(26, 55), r0=0.55)
    if organ == 'duodenum':
        med, _, _ = curvature_lines(V, F, LAND['pylorus'], LAND['dj'], 60, ref=LAND['head'])
        return grow(surf, [(med[1:-1], 0.70)], rng, spacing=7.0, length=(16, 34), r0=0.45)
    if organ == 'esophagus':
        _, _, cen = curvature_lines(V, F, LAND['oes_top'], LAND['goj'], 40); arc = []
        T = np.gradient(cen, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True)
        for a in np.radians([20, 110, 200, 290]):
            u = np.cross(T, [1.0, 0, 0]); u /= np.linalg.norm(u, axis=1, keepdims=True); w = np.cross(T, u)
            wig = 0.9 * fbm(np.c_[np.arange(len(cen)) * 0.35, np.full(len(cen), a), np.zeros(len(cen))], 2, seed=51)   # wandering, not straight
            aa = a + wig
            line = cen + (u * np.cos(aa)[:, None] + w * np.sin(aa)[:, None]) * 0.3; line, _ = surf.project(line); arc.append((line[1:-1], 0.42))
        return grow(surf, arc, rng, spacing=9.0, length=(8, 18), r0=0.32, avoid=1.6, split=7.0, angle=45)
    if organ in ('kidney_left', 'kidney_right'):   # faint capsular vessels from the hilum
        c = V.mean(0); h = LAND['head'] if organ == 'kidney_right' else np.array([0.5, -0.7, -0.3])
        hil = V[np.argmin(np.linalg.norm(V - (c + 0.6 * (h - c) / np.linalg.norm(h - c)), axis=1))]
        lines = []
        for k in range(7):
            q = V[rng.integers(len(V))]; pts = np.linspace(hil, q, 12); pts, _ = surf.project(pts); lines.append((pts, 0.30))
        return grow(surf, lines, rng, spacing=14.0, length=(8, 16), r0=0.20, avoid=2.0, split=6.0, angle=40)
    return []


def height(organ, X, vf=None):
    """relief along the normal (model units)"""
    h = 0.0012 * fbm(X * 7.0, 3, seed=11) + 0.0006 * fbm(X * 40.0, 2, seed=12)          # subtle irregularity, no clay
    if organ in ('stomach', 'duodenum'):
        h = h + 0.0014 * fbm(X * 18.0, 3, seed=13) + 0.0008 * fbm(X * 70.0, 2, seed=19)   # serosal undulation, fine grain
    if organ == 'esophagus':
        h = h + 0.0007 * fbm(np.c_[X[:, 0] * 260, X[:, 1] * 9, X[:, 2] * 260], 2, seed=14)   # longitudinal adventitial fibres (streaks along y)
    if organ == 'spleen':
        h = 0.0006 * fbm(X * 6.0, 2, seed=15) + 0.00025 * fbm(X * 45.0, 2, seed=16)       # smooth capsule
    if organ in ('kidney_left', 'kidney_right'):
        h = 0.0007 * fbm(X * 9.0, 3, seed=17) + 0.0003 * fbm(X * 60.0, 2, seed=18)
    if vf is not None: h = h + vf(X)[2]
    return h


def spleen_notches(X, N):
    """notches on the superior (upper, medial) border: 3 short creases across the border ridge"""
    up = np.clip((X[:, 1] - 0.45) / 0.25, 0, 1) * np.clip(1 - np.abs(N[:, 1]) * 1.3, 0, 1)
    z = np.zeros(len(X))
    for k, c in enumerate([np.array([1.60, 0.72, -0.28]), np.array([1.78, 0.78, -0.36]), np.array([1.95, 0.76, -0.47])]):
        d = np.linalg.norm(X - c, axis=1); z += np.exp(-(d / (0.07 + 0.02 * k)) ** 2)
    return np.clip(z, 0, 1) * up


def compose(organ, X, ao, cav, curv, thick, onrm, vf=None):
    """albedo (linear), roughness, clearcoat/wetness for one organ"""
    ev = lambda f, s: f(X * s, 3, seed=hash(organ) % 997)
    m1 = fbm(X * 3.0, 3, seed=21); m2 = fbm(X * 14.0, 3, seed=22); m3 = fbm(X * 55.0, 2, seed=23)
    if organ in ('stomach', 'duodenum', 'esophagus'):
        base = {'stomach': '#D98E7D', 'duodenum': '#D3927A', 'esophagus': '#C88678'}[organ]
        col = lin(base)[None] * (1 + 0.08 * m1 + 0.06 * m2 + 0.03 * m3)[:, None]
        pink = lin('#E4A294'); col = col * (1 - 0.10 * np.clip(m2, 0, 1))[:, None] + pink[None] * (0.10 * np.clip(m2, 0, 1))[:, None]
        rough = np.clip(0.34 + 0.06 * m2 + 0.08 * (1 - cav), 0.22, 0.60); wet = np.clip(0.80 + 0.2 * m1 - 0.4 * (1 - cav), 0, 1)
    elif organ == 'spleen':
        col = lin('#5C2434')[None] * (1 + 0.06 * m1 + 0.03 * m2)[:, None]
        rough = np.clip(0.28 + 0.04 * m2, 0.2, 0.5); wet = np.clip(0.9 + 0.1 * m1, 0, 1)
    else:   # kidneys: red-brown capsule, a hint of perinephric fat (yellowish areolar patches), mostly near the hilum / poles
        col = lin('#8C4032')[None] * (1 + 0.07 * m1 + 0.04 * m2)[:, None]
        fat = np.clip((fbm(X * 3.5, 3, seed=31) + 0.02) / 0.40, 0, 1) ** 1.5 * np.clip((fbm(X * 14.0, 2, seed=32) + 0.45), 0, 1) * 0.28   # a hint
        col = col * (1 - fat)[:, None] + lin('#D9B274')[None] * (fat * (1 + 0.1 * m3))[:, None]
        rough = np.clip(0.36 + 0.10 * fat + 0.05 * m2, 0.2, 0.7); wet = np.clip(0.75 - 0.5 * fat, 0, 1)
    if vf is not None:
        core, edge, _ = vf(X)
        pale, dark = lin('#C86E68'), lin('#5A1216')
        e = edge * (0.55 if organ.startswith('kidney') else 0.85); c = core * (0.45 if organ.startswith('kidney') else 0.80)
        col = col * (1 - e)[:, None] + pale[None] * e[:, None]; col = col * (1 - c)[:, None] + dark[None] * c[:, None]
        rough = np.clip(rough + 0.10 * edge, 0, 1); wet = wet * (1 - 0.35 * edge)   # vessels a little less glossy than the serosa
    col = col * (0.70 + 0.30 * ao ** 0.8)[:, None] * (0.88 + 0.12 * cav)[:, None]
    return np.clip(col, 0, 1), rough, wet


if __name__ == '__main__':
    import json, base64
    organ = sys.argv[1]; ROOT = Path(__file__).resolve().parent.parent
    J = json.loads((ROOT / 'data/liver-data.json').read_text()); d = J['ct']['viscera'][organ]; qs = J['ct']['qs']
    V = np.frombuffer(base64.b64decode(d['pos']), np.int16).reshape(-1, 3).astype(float) * qs
    F = np.frombuffer(base64.b64decode(d['idx']), np.uint16).reshape(-1, 3).astype(np.int64)
    if 'dup' in d:
        n0 = d['n0']; dup = np.frombuffer(base64.b64decode(d['dup']), np.uint16).astype(np.int64); F = np.concatenate([np.arange(n0), dup])[F]; V = V[:n0]
    ves = vessels_for(organ, V, F)
    L = sum(np.linalg.norm(np.diff(p, axis=0), axis=1).sum() for p, _ in ves) * MM
    print(f'{organ}: {len(ves)} vessels, total length {L/10:.0f} cm, radii {min(r.min() for _, r in ves)*MM:.2f}-{max(r.max() for _, r in ves)*MM:.2f} mm')
    np.save(f'/tmp/ves_{organ}.npy', np.array([np.c_[p, r] for p, r in ves], dtype=object), allow_pickle=True)
