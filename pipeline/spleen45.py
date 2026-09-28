#!/usr/bin/env python3
"""v45 spleen placement (Task 9): the spleen keeps its shape; it is moved rigidly only as far as needed to clear the stomach.

    python3 pipeline/spleen45.py --dry    # report
    python3 pipeline/spleen45.py          # writes data/liver-data.json ct.viscera.spleen (pos and c)

Finding (reported, v45): the spleen already touches the fundus at its upper pole (0.56 mm, below the ≥ 1 mm required) while
its lower gastric surface stands 5–10 mm off, because its gastric surface is flatter than the fundus. A search over rigid
placements (rotations to ±16° about the upper contact, shifts to ±6 mm in each axis, hilum moving ≤ 12 mm) keeping ≥ 1.3 mm
to the stomach, ≥ 1 mm to the left kidney and pancreas and not entering the diaphragm found no placement closer to the
fundus than the present one (best median fundus-to-spleen gap 4.4 mm vs 3.7 mm now). So the spleen is not moved closer;
it is translated along the stomach's surface normal at the contact by the least amount that gives a 1.1 mm gap.
"""
import base64, json, sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pancreas44 import MeshSDF
DATA = ROOT / 'data/liver-data.json'; MM = 69.9757; TARGET = 1.1 / MM


def mesh(J, k):
    d = J['ct']['viscera'][k]; qs = J['ct']['qs']
    V = np.frombuffer(base64.b64decode(d['pos']), np.int16).reshape(-1, 3).astype(np.float64) * qs
    F = np.frombuffer(base64.b64decode(d['idx']), np.uint16).reshape(-1, 3).astype(np.int64)
    if 'dup' in d:
        n0 = d['n0']; dup = np.frombuffer(base64.b64decode(d['dup']), np.uint16).astype(np.int64); F = np.concatenate([np.arange(n0), dup])[F]; V = V[:n0]
    return V, F


if __name__ == '__main__':
    J = json.loads(DATA.read_text()); qs = J['ct']['qs']
    Sp, SpF = mesh(J, 'spleen'); St = MeshSDF(*mesh(J, 'stomach')); Kl = MeshSDF(*mesh(J, 'kidney_left')); Pa = MeshSDF(*mesh(J, 'pancreas'))
    M = {"nv": 14088}; b = base64.b64decode(json.load(open(ROOT / 'assets/dia41.json'))['b64'])
    Dt = cKDTree(np.frombuffer(b, np.int16, M['nv'] * 3, 0).reshape(-1, 3) * 0.00015)
    rep = lambda V: f"stomach {St(V).min()*MM:.2f} mm, left kidney {Kl(V).min()*MM:.1f}, pancreas {Pa(V).min()*MM:.1f}, diaphragm {Dt.query(V)[0].min()*MM:.2f}"
    print('before:', rep(Sp))
    g = St(Sp); i = g.argmin(); p = Sp[i]
    eps = 0.2 / MM; n = np.array([(St(p[None] + e)[0] - St(p[None] - e)[0]) / (2 * eps) for e in np.eye(3) * eps]); n /= np.linalg.norm(n)
    lo, hi = 0.0, 3 / MM
    for _ in range(30):
        m = (lo + hi) / 2
        if St(Sp + n * m).min() < TARGET: lo = m
        else: hi = m
    t = n * hi; V2 = Sp + t
    print(f'shift {hi*MM:.2f} mm along {np.round(n, 3)} (stomach normal at the contact {np.round(p, 3)})')
    print('after: ', rep(V2))
    if '--dry' in sys.argv: sys.exit()
    d = J['ct']['viscera']['spleen']; P = np.frombuffer(base64.b64decode(d['pos']), np.int16).reshape(-1, 3).astype(np.float64) * qs
    d['pos'] = base64.b64encode(np.round((P + t) / qs).astype(np.int16).tobytes()).decode()
    d['c'] = [round(float(v), 4) for v in np.array(d['c']) + t]
    DATA.write_text(json.dumps(J, separators=(',', ':'))); print('wrote', DATA.name, 'spleen c', d['c'])
