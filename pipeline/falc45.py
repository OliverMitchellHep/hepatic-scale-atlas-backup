#!/usr/bin/env python3
"""v45 falciform ligament, painted into the liver bake (relief + colour) instead of a separate fold mesh.

    python3 pipeline/falc45.py          # prints the centreline as the FALC45 literal for src/atlas.js (picking)

The centreline is found as the page's v35–v44 falciformBuild found it: rays cast in the umbilical-fissure plane
x = falc.a + falc.b·z (data/liver-data.json ct.falc) onto the CT liver, keeping the run of hits from the umbilical notch
up the anterior surface and over the anterosuperior slope. On it, in surface coordinates (s = arc length from the notch,
d = signed distance across the band, patient-left positive):
  band      s < S_A: a narrow pale fibrous strip, 10 mm wide (half-width W0 ± 10 % slow wobble and fine edge jitter),
            slightly raised, with fine striations along its length; it reaches the inferior margin at the notch.
  fan       S_A ≤ s ≤ S_B (from where the surface turns superior): the two layers diverge; half-width grows linearly to
            W_B at the base. The diverging edges (the layers) are denser than the thinner membrane between them, whose
            fibres fan out from the apex.
  coronary  at the base, the layers turn and run left and right across the superior surface as the coronary ligament
            (a narrow transverse band, tapering out before the lateral margins: the triangular ligaments are not modelled).
The ligamentum teres stays hidden (page). All lengths in model units (1 unit = 69.9757 mm).

v46: thinner and subtler. The band is 4 mm wide (was 10) and a little more raised (0.75 mm crest), and it now runs down
the whole anterior surface to its inferior border (the ray run accepted only surface facing no more than 17° downwards, so it
stopped ~18 mm above the margin). The superior triangle is smaller (32 mm across its base, was 76; 26 mm long, was 52) and
fainter, with a narrower, shorter coronary continuation; bake44.py paints the fan at lower opacity.
"""
import json, sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from noise3 import fbm

MM = 69.9757
W0 = 2.0 / MM            # band half-width (v46: 4 mm band; v45 10 mm)
W_B = 16.0 / MM          # fan half-width at its base (v46; v45 38)
LAYER = 2.0 / MM         # width of each diverging layer (v46; v45 3.5)
FAN_LEN = 26.0 / MM      # apex → base along the centreline (clipped to the run's end; v46; v45 52)
COR_W = 2.0 / MM         # coronary band half-width (v46; v45 3.2)
COR_L = 28.0 / MM        # coronary: how far each band runs beyond the fan's base corners (v46; v45 48)
APEX_NY = 0.58           # the fan starts where the surface normal turns superior (n.y ≥ this)


def _liver():
    import base64
    J = json.loads((ROOT / 'data/liver-data.json').read_text()); ct = J['ct']; qs = ct['qs']
    V = np.frombuffer(base64.b64decode(ct['pos']), np.int16).reshape(-1, 3).astype(np.float64) * qs
    F = np.frombuffer(base64.b64decode(ct['idx']), np.uint16).reshape(-1, 3).astype(np.int64)
    return ct, V, F


def _hits(V, F, a, b):
    """rays in the plane x = a + b z from a circle of radius 3 around (y,z) = (-0.15, 0.25), as falciformBuild casts them"""
    import trimesh
    m = trimesh.Trimesh(V, F, process=False); out = []
    for i in range(461):
        th = np.radians(-80 + i * 0.5); dy, dz = np.sin(th), np.cos(th); zo, yo = 0.25 + dz * 3, -0.15 + dy * 3
        o = np.array([a + b * zo, yo, zo]); c = np.array([a + b * 0.25, -0.15, 0.25]); d = (c - o) / np.linalg.norm(c - o)
        loc, _, tri = m.ray.intersects_location([o], [d])
        if not len(loc): continue
        k = np.argmin(np.linalg.norm(loc - o, axis=1)); n = m.face_normals[tri[k]]
        out.append((i, loc[k], n))
    return out


def centreline(n_out=None):
    ct, V, F = _liver(); a, b = ct['falc']['a'], ct['falc']['b']
    hs = _hits(V, F, a, b)
    zone = lambda p: p[1] > -0.90 and (p[2] > 0.30 or (p[1] > 0.45 and p[2] > -0.35))
    # v46: down to the inferior border (the lowest anterior surface faces up to ~40° downwards; the inferior surface beyond)
    ok = lambda p, n: zone(p) and n[1] > -0.66 and (n[2] > 0.22 or n[1] > 0.55) and abs(n[0]) < 0.75
    run, best = [], []
    for i, p, n in hs:
        if not ok(p, n): continue
        if run and i - run[-1][0] > 4: run = []
        run.append((i, p, n))
        if len(run) > len(best): best = run
    P = np.array([p for _, p, _ in best]); N = np.array([n for _, _, n in best])
    if P[0][1] > P[-1][1]: P, N = P[::-1], N[::-1]                      # notch (lowest) first
    # resample by arc length (0.5 mm), smooth normals
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]; s = np.arange(0, L[-1], 0.5 / MM)
    C = np.stack([np.interp(s, L, P[:, k]) for k in range(3)], 1); Nc = np.stack([np.interp(s, L, N[:, k]) for k in range(3)], 1)
    for _ in range(20): Nc[1:-1] = (Nc[:-2] + Nc[2:] + 2 * Nc[1:-1]) / 4
    Nc /= np.linalg.norm(Nc, axis=1, keepdims=True)
    return s, C, Nc


class Falciform:
    def __init__(self):
        s, C, Nc = centreline()
        self.s, self.C, self.N = s, C, Nc
        T = np.gradient(C, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True); self.T = T
        A = np.cross(T, Nc); A *= np.sign(A[:, :1] + 1e-12); A /= np.linalg.norm(A, axis=1, keepdims=True); self.A = A   # +x-ish
        ia = int(np.argmax(Nc[:, 1] >= APEX_NY)); self.sA = s[ia]
        self.sB = min(self.sA + FAN_LEN, s[-1] - 2 / MM); ib = int(np.searchsorted(s, self.sB))
        self.CB, self.TB, self.AB, self.NB = C[ib], T[ib], A[ib], Nc[ib]
        self.tree = cKDTree(C)

    def fields(self, X, nrm=None):
        """per point: m (0..1 coverage), kind (0 band, 1 fan membrane, 2 layer, 3 coronary), fibre (−1..1), relief (units)"""
        X = np.asarray(X, float); n = len(X)
        m = np.zeros(n); rel = np.zeros(n); fib = np.zeros(n); kind = np.zeros(n)
        dist, i = self.tree.query(X, distance_upper_bound=W_B + COR_L + 0.3)
        near = np.isfinite(dist); ii = i[near]; Xn = X[near]
        D = X[near] - self.C[ii]; s = self.s[ii] + np.einsum('ij,ij->i', D, self.T[ii])   # continuous (sample steps sawed the edge)
        d = np.einsum('ij,ij->i', D, self.A[ii]); h = np.einsum('ij,ij->i', D, self.N[ii])
        ss = lambda x, e0, e1: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))
        onsurf = 1 - ss(np.abs(h), 0.035, 0.07)                           # smooth (a hard cut here jagged the fan's edge)
        if nrm is not None: onsurf = onsurf * ss(np.einsum('ij,ij->i', nrm[near], self.N[ii]), 0.10, 0.30)
        # irregular edges: slow wobble along the length and fine jitter
        wob = 1 + 0.10 * fbm(np.c_[s * 9, np.zeros_like(s), np.full_like(s, 3.1)], 2, seed=201)
        jit = 0.22 / MM * fbm(Xn * 60.0, 2, seed=203)                     # gently irregular, not serrated
        # band
        w = W0 * wob + jit; u = np.abs(d) / w
        band = (1 - ss(u, 0.74, 1.16)) * (1 - ss(s, self.sA + 1 / MM, self.sA + 5 / MM)) * ss(s, 0, 1.5 / MM)
        # fan
        f = np.clip((s - self.sA) / (self.sB - self.sA), 0, 1); wf = W0 + f * (W_B - W0) + jit; inF = (s >= self.sA - 2 / MM) & (s <= self.sB + 0.5 / MM)
        ef = 1 - ss(np.abs(d), wf - 0.7 / MM, wf + 0.8 / MM)                               # inside the fan outline (v45 T10: softer, no sawtooth)
        lay = ef * (1 - ss(np.abs(d), wf - LAYER - 0.8 / MM, wf - LAYER + 0.8 / MM))         # the two diverging layers
        fan = inF * np.maximum(lay, ef * (0.62 + 0.38 * (1 - ss(s, self.sA, self.sA + 12 / MM))))   # membrane thins away from the apex
        # coronary: a transverse band on the superior surface through the fan's base, running out beyond its corners
        Db = Xn - self.CB; t = Db @ self.TB; lat = np.abs(Db @ self.AB)
        cw = COR_W * (1 - 0.55 * ss(lat, W_B, W_B + COR_L)) + jit * 0.6
        cor = (1 - ss(np.abs(t + 0.5 * COR_W), cw * 0.75, cw * 1.15)) * (1 - ss(lat, W_B + 0.45 * COR_L, W_B + COR_L)) * ss(lat, W_B * 0.35, W_B * 0.8)
        up = ss(Xn[:, 1], self.CB[1] - 0.26, self.CB[1] - 0.18)
        if nrm is not None: up = up * ss(nrm[near][:, 1], 0.12, 0.40)
        cor *= up
        mm = np.maximum(np.maximum(band, fan) * onsurf, cor)
        k = np.where(cor > np.maximum(band, fan), 3, np.where(band >= fan, 0, np.where(lay > 0.5 * ef, 2, 1)))
        # relief: soft dome across the band; layers and coronary a little raised, fan membrane lower
        prof = np.where(k == 0, 1 - np.clip(u, 0, 1) ** 2, np.where(k == 3, 1 - np.clip(np.abs(t + 0.5 * COR_W) / cw, 0, 1) ** 2, 1.0))
        hgt = np.select([k == 0, k == 1, k == 2, k == 3], [2.0, 0.25, 0.60, 0.55]) / MM   # v46b: band raised ~2 mm (v46 0.75, v45 0.60)
        # fibres: along the band and the coronary, radiating from the apex across the fan
        ang = np.arctan2(d, np.maximum(s - self.sA, 1e-3) + 4 / MM)
        fu = np.select([k == 0, k == 3], [d * 420, t * 420], ang * 55)
        fv = np.select([k == 0, k == 3], [s * 14, lat * 14], (s - self.sA) * 14)
        fb = fbm(np.c_[fu, fv, np.full_like(fu, 7.7)], 3, seed=207)
        m[near] = mm; kind[near] = k; fib[near] = fb * (mm > 0)
        # relief tapers over ~3 mm inside the fan's outline (a plateau ending in a 1.5 mm cliff stair-stepped in the normal map)
        taper = np.where((k == 1) | (k == 2), 1 - ss(np.abs(d), wf - 3.5 / MM, wf + 0.5 / MM), 1.0)
        rel[near] = mm * (hgt * prof * taper + 0.05 / MM * fb)
        return m, kind, fib, rel


if __name__ == '__main__':
    fc = Falciform()
    print(f'centreline: {len(fc.s)} samples, {fc.s[-1]*MM:.0f} mm; apex at s = {fc.sA*MM:.0f} mm {np.round(fc.C[np.searchsorted(fc.s, fc.sA)], 3)}, '
          f'base at s = {fc.sB*MM:.0f} mm {np.round(fc.CB, 3)}')
    k = np.linspace(0, len(fc.s) - 1, 40).round().astype(int)
    print('FALC45={s:[' + ','.join(f'{v:.4f}' for v in fc.s[k]) + '],C:[' + ','.join(f'[{x:.4f},{y:.4f},{z:.4f}]' for x, y, z in fc.C[k]) + ']'
          + f',sA:{fc.sA:.4f},sB:{fc.sB:.4f},CB:[{",".join(f"{v:.4f}" for v in fc.CB)}],TB:[{",".join(f"{v:.4f}" for v in fc.TB)}],AB:[{",".join(f"{v:.4f}" for v in fc.AB)}]'
          + f',W0:{W0:.4f},WB:{W_B:.4f},CW:{COR_W:.4f},CL:{COR_L:.4f}' + '}')
