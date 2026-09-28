#!/usr/bin/env python3
"""v46 spleen fit (Task 3): the spleen keeps its shape and is rotated (with a small shift) so its concave gastric surface
follows the convex gastric fundus, instead of meeting it at the anteromedial upper pole and standing off below.

    python3 pipeline/spleen46.py --dry    # search and report
    python3 pipeline/spleen46.py --x rx ry rz dx dy dz    # writes data/liver-data.json ct.viscera.spleen (pos, c, a)
                                          # (degrees, mm; the v46 values are in the git log / CHANGELOG)

Gastric surface: the spleen vertices that face the stomach within 20 mm of it in the v45 placement (fixed by index, so the
same anatomical surface is scored for every candidate). Objective: the spread of that surface's gap to the stomach
(mean |gap − 2.5 mm| over the part within 12 mm, plus the fraction left beyond 12 mm), with hard limits: ≥ 1.0 mm from the
stomach everywhere, ≥ 1.0 mm from the left kidney and pancreas, ≥ 0.1 mm from the diaphragm shell (fitted over the organ tops), and the splenic artery
and vein ends staying at the hilum (within 1 mm outside to 6 mm inside the capsule). Search: rotations about the spleen's
centroid up to ±40° and shifts up to ±8 mm (Powell from six starts).
"""
import base64, json, sys
from pathlib import Path
import numpy as np
from scipy.optimize import minimize
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pancreas44 import MeshSDF
from spleen45 import mesh
DATA = ROOT / 'data/liver-data.json'; MM = 69.9757
HILUM = np.array([[1.641, 0.014, -0.585], [1.644, 0.081, -0.460]])   # splenic vein (SPL0) and splenic artery ends, src/atlas.js


class FastSDF:
    """MeshSDF, with the (slow) inside test only for points near the surface: far points are outside here"""
    def __init__(self, P, F, near=0.05): self.m = MeshSDF(P, F); self.near = near; self.T = self.m.T; self.S = self.m.S

    def __call__(self, X):
        d = self.m.T.query(X)[0]; k = d < self.near
        if k.any(): d[k] = np.where(self.m.inside(X[k]), -d[k], d[k])
        return d


def main():
    J = json.loads(DATA.read_text()); qs = J['ct']['qs']; d = J['ct']['viscera']['spleen']; c = np.array(d['c'])
    Sp, SpF = mesh(J, 'spleen'); Sd = FastSDF(Sp, SpF, near=0.2)
    St = FastSDF(*mesh(J, 'stomach')); Kl = FastSDF(*mesh(J, 'kidney_left')); Pa = FastSDF(*mesh(J, 'pancreas'))
    M = {"nv": 14088}; b = base64.b64decode(json.load(open(ROOT / 'assets/dia41.json'))['b64'])
    Dt = cKDTree(np.frombuffer(b, np.int16, M['nv'] * 3, 0).reshape(-1, 3) * 0.00015)
    fn = np.cross(Sp[SpF[:, 1]] - Sp[SpF[:, 0]], Sp[SpF[:, 2]] - Sp[SpF[:, 0]]); N = np.zeros_like(Sp)
    for k in range(3): np.add.at(N, SpF[:, k], fn)
    N /= np.linalg.norm(N, axis=1, keepdims=True)
    g0 = St(Sp); _, j = St.T.query(Sp); to = St.S[j] - Sp; to /= np.linalg.norm(to, axis=1, keepdims=True) + 1e-12
    gas = (g0 < 20 / MM) & ((N * to).sum(1) > 0.3)
    print(f'gastric surface: {gas.sum()} of {len(Sp)} vertices')
    sub = np.arange(len(Sp))[::3]

    def place(x, V):
        R = Rotation.from_rotvec(np.radians(x[:3])); return R.apply(V - c) + c + x[3:] / MM, R

    def metrics(x):
        V, R = place(x, Sp); g = St(V[gas]) * MM; ga = St(V[sub]).min() * MM
        h = Sd(R.inv().apply(HILUM - c - x[3:] / MM) + c) * MM
        return dict(gmin=min(g.min(), ga), spread=np.mean(np.abs(np.minimum(g, 12) - 2.5)), far=np.mean(g > 12), med=np.median(g),
                    kid=Kl(V[sub]).min() * MM, panc=Pa(V[sub]).min() * MM, dia=Dt.query(V[sub])[0].min() * MM, hil=h)

    def cost(x):
        if np.any(np.abs(x[:3]) > 40) or np.any(np.abs(x[3:]) > 8): return 1e6
        m = metrics(x); pen = 0
        pen += max(0, 1.0 - m['gmin']) ** 2 * 400 + max(0, 1.0 - m['kid']) ** 2 * 100 + max(0, 1.0 - m['panc']) ** 2 * 100
        pen += max(0, 0.1 - m['dia']) ** 2 * 100          # the diaphragm shell was fitted over the organ tops (v45: 0.15 mm)
        pen += sum(max(0, hv - 1.0) ** 2 + max(0, -6.0 - hv) ** 2 for hv in m['hil']) * 50
        return m['spread'] + 10 * m['far'] + pen + 0.002 * np.sum(x[:3] ** 2)

    x0 = np.zeros(6); m0 = metrics(x0); print('v45 :', {k: np.round(v, 2) for k, v in m0.items()})
    if '--x' in sys.argv:                                 # apply a transform found by an earlier --dry search (6 numbers)
        i = sys.argv.index('--x'); best = type('R', (), {'x': np.array([float(v) for v in sys.argv[i + 1:i + 7]])})
    else: best = None
    for st in ([] if best is not None else [(0, 0, 0), (0, -20, 0), (-20, -20, 0), (20, 0, 0), (0, 0, 20), (0, 0, -20)]):
        r = minimize(cost, np.array([*st, 0, 0, 0.]), method='Powell', options={'maxiter': 3000, 'xtol': 0.05, 'ftol': 1e-4})
        print('  start', st, '→', np.round(r.x, 2), round(r.fun, 3), flush=True)
        if best is None or r.fun < best.fun: best = r
    x = best.x; m = metrics(x)
    print('v46 :', {k: np.round(v, 2) for k, v in m.items()})
    print(f'rotation {np.round(x[:3], 1)}° (|θ| {np.linalg.norm(x[:3]):.1f}°), shift {np.round(x[3:], 2)} mm')
    if '--dry' in sys.argv: return
    P = np.frombuffer(base64.b64decode(d['pos']), np.int16).reshape(-1, 3).astype(np.float64) * qs   # all vertices incl. seam copies
    P2, R = place(x, P)
    d['pos'] = base64.b64encode(np.round(P2 / qs).astype(np.int16).tobytes()).decode()
    d['c'] = [round(float(v), 4) for v in c + x[3:] / MM]
    d['a'] = [round(float(v), 4) for v in place(x, np.array([d['a']]))[0][0]]
    DATA.write_text(json.dumps(J, separators=(',', ':'))); print('wrote', DATA.name, 'spleen c', d['c'])


if __name__ == '__main__':
    main()
