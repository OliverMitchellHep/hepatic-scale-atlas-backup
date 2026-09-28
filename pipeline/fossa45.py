#!/usr/bin/env python3
"""v45 gallbladder fossa: rebuild the bed on the CT liver's visceral surface as a clean concave fossa.

    python3 pipeline/fossa45.py --dry     # build and report only (writes /tmp/fossa_V.npy, /tmp/fossa_F.npy)
    python3 pipeline/fossa45.py           # writes data/liver-data.json (ct.pos, idx, uv, dup, n0; ct.sdf around the fossa)
    then: python3 pipeline/bake44.py liver   (the bed is part of the liver bake: relief, colour, matte finish)

v44's bed was an imprint of the gallbladder tube itself: the liver wrapped about half the gallbladder's circumference with
near-vertical walls, and 146 crumpled, folded-over triangles in five pleats (paper-thin sheets, slivers up to 22 mm long)
where an earlier radial projection collapsed the surface onto the fundus dome. With the gallbladder ghosted or off it read
as a smooth gallbladder-shaped stub, and the bake streaked along the pleats. Vertex relaxation cannot untangle those
pleats, so the patch is re-meshed:
  1. cut out the bed: every visceral face within 14 mm of the gallbladder wall that faces it, plus all folded faces, as one
     disk (enclosed islands included);
  2. re-triangulate the hole in the plane of its mean normal ('triangle', constrained, quality, ~1.3 mm edges);
  3. height along that normal = smooth minimum of (a) the harmonic membrane spanning the untouched rim and (b) the
     gallbladder's upper surface + 1.2 mm, flared at 55° from its footprint (a bowl, not vertical walls), so the bed is
     concave, clears the gallbladder wall by ≥ 1.2 mm and meets the rim smoothly.
The liver is then re-unwrapped (xatlas; nothing in the page reads the liver UVs or indexes its vertices — the parenchyma
vertex list, nodules and caudate weights are derived at run time) and the SDF grid is recomputed around the fossa.

The gallbladder is rebuilt here exactly as src/atlas.js builds it (gbPts smoothing, centripetal Catmull–Rom, arc-length
sampling, fundus-dome / tapering-neck radius profile): its mesh vertices lie within 0.05 mm of this surface.
"""
import base64, json, sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data/liver-data.json'
MM = 69.9757
GAP = 1.2 / MM                 # bed ↔ gallbladder wall
ZONE = 14.0 / MM               # re-meshed patch: faces within this of the wall
EDGE = 1.3 / MM                # target edge length in the patch (the CT liver's median is 1.6 mm)
FLARE = np.tan(np.radians(55)) # bowl wall slope away from the gallbladder footprint
KSM = 3.0 / MM                 # smooth-minimum width (rounded rim of the bowl)
GB0 = np.array([[-0.901, -0.931, 1.149], [-0.642, -0.772, 0.736], [-0.593, -0.633, 0.693], [-0.561, -0.529, 0.516], [-0.515, -0.419, 0.33]])


# ───────── the gallbladder, as the page builds it ─────────
def cr(P, n_per=60):
    """three.js CatmullRomCurve3 (centripetal, open), sampled densely by its own parameter"""
    P = np.asarray(P, float); ext = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]]); out = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = ext[i:i + 4]
        dt = [max(np.linalg.norm(b - a) ** 0.5, 1e-4) for a, b in ((p0, p1), (p1, p2), (p2, p3))]
        t1 = ((p1 - p0) / dt[0] - (p2 - p0) / (dt[0] + dt[1]) + (p2 - p1) / dt[1]) * dt[1]
        t2 = ((p2 - p1) / dt[1] - (p3 - p1) / (dt[1] + dt[2]) + (p3 - p2) / dt[2]) * dt[1]
        for u in np.linspace(0, 1, n_per, endpoint=(i == len(P) - 2)):
            out.append((2*u**3 - 3*u**2 + 1) * p1 + (u**3 - 2*u**2 + u) * t1 + (-2*u**3 + 3*u**2) * p2 + (u**3 - u**2) * t2)
    return np.array(out)


def at_arclength(D, n):
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(D, axis=0), axis=1))]; s = np.linspace(0, L[-1], n)
    return np.stack([np.interp(s, L, D[:, k]) for k in range(3)], 1)


def gb_axis(n=600):
    S = at_arclength(cr(GB0), 41)                                          # getSpacedPoints(40)
    for _ in range(60):
        T = S.copy(); T[1:-1] = 0.5 * (0.5 * (S[:-2] + S[2:])) + 0.5 * S[1:-1]; S = T
    pts = at_arclength(cr(S, 30), 9)                                        # Cs.getPointAt(i/8)
    C = at_arclength(cr(pts, 80), n); t = np.linspace(0, 1, n)              # metaTube: curve.getPointAt(i/N)
    R, dome = 0.165, 0.21
    u = 1 - t / dome; r_d = R * np.sqrt(np.clip(1 - u * u, 0, None)) + 0.003
    s = (t - dome) / (1 - dome); body = R * (1 - 0.62 * np.clip(s, 0, None) ** 1.6) + 0.012 * s
    sm = np.clip((s - 0.70) / 0.30, 0, 1); sm = sm * sm * (3 - 2 * sm)
    return C, np.where(t < dome, r_d, body + (0.040 - body) * sm)


class GBTube:
    def __init__(self):
        self.C, self.r = gb_axis(); self.tree = cKDTree(self.C)

    def __call__(self, X):
        """signed distance to the gallbladder wall (+ outside)"""
        _, i = self.tree.query(X); return np.linalg.norm(X - self.C[i], axis=1) - self.r[i]


# ───────── mesh helpers ─────────
def load():
    J = json.loads(DATA.read_text()); ct = J['ct']; qs = ct['qs']
    V = np.frombuffer(base64.b64decode(ct['pos']), np.int16).reshape(-1, 3).astype(np.float64) * qs
    F = np.frombuffer(base64.b64decode(ct['idx']), np.uint16).reshape(-1, 3).astype(np.int64)
    dup = np.frombuffer(base64.b64decode(ct['dup']), np.uint16).astype(np.int64); n0 = ct['n0']
    orig = np.concatenate([np.arange(n0), dup])
    return J, V[:n0], orig[F]


def fnormals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); return fn / (np.linalg.norm(fn, axis=1, keepdims=True) + 1e-15)


def edge_faces(F):
    E = np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), 1); fi = np.tile(np.arange(len(F)), 3)
    o = np.lexsort((E[:, 1], E[:, 0])); E, fi = E[o], fi[o]; same = (E[1:] == E[:-1]).all(1)
    return fi[:-1][same], fi[1:][same]


def folds(V, F, thr=100):
    fn = fnormals(V, F); a, b = edge_faces(F)
    ang = np.degrees(np.arccos(np.clip(np.einsum('ij,ij->i', fn[a], fn[b]), -1, 1)))
    bad = np.zeros(len(F), bool); bad[a[ang > thr]] = True; bad[b[ang > thr]] = True
    return bad, ang


def boundary_loops(F):
    """ordered boundary loops of a triangle set (directed edges without a twin)"""
    D = np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]); S = set(map(tuple, D))
    nxt = {a: b for a, b in D if (b, a) not in S}; loops = []
    while nxt:
        a0 = next(iter(nxt)); loop = [a0]; a = nxt.pop(a0)
        while a != a0: loop.append(a); a = nxt.pop(a)
        loops.append(np.array(loop))
    return loops


def select_patch(V, F, gb):
    """the bed: visceral faces near the gallbladder and facing it, plus the pleats; one disk"""
    import scipy.sparse as sp, scipy.sparse.csgraph as cg
    c = V[F].mean(1); g = gb(c); fn = fnormals(V, F)
    _, i = gb.tree.query(c); toGB = gb.C[i] - c; toGB /= np.linalg.norm(toGB, axis=1, keepdims=True)
    bad, _ = folds(V, F)
    sel = ((g < ZONE) & (np.einsum('ij,ij->i', fn, toGB) > 0.2) & (i < 0.80 * len(gb.C))) | bad   # fundus + body; the neck's bed at the porta is left as is
    a, b = edge_faces(F); n = len(F)
    vf = lambda msk: np.isin(F, np.unique(F[msk])).any(1)                 # faces sharing a vertex with msk
    ar = np.linalg.norm(np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]), axis=1)
    core = (g < 3 / MM) & ~bad & (i < 0.80 * len(gb.C)); D0 = (toGB[core] * ar[core, None]).sum(0); D0 /= np.linalg.norm(D0)   # bed floor normal
    along = (fn @ D0 > 0.35) | bad                                          # keep the patch a height field along D0
    sel &= along
    for _ in range(3): sel = sel | (vf(sel) & (g < ZONE + 6 / MM) & along)  # swallow pleat remnants at the rim

    def tidy(sel):
        for inside in (True, False):   # largest component of the selection, then fill enclosed islands of the rest
            m = sel[a] & sel[b] if inside else ~sel[a] & ~sel[b]
            A = sp.coo_matrix((np.ones(m.sum()), (a[m], b[m])), shape=(n, n))
            _, lab = cg.connected_components(A, directed=False)
            pick = sel if inside else ~sel
            big = np.bincount(lab[pick]).argmax()
            sel = (pick & (lab == big)) if inside else (sel | (pick & (lab != big)))
        return sel
    badz = bad.copy()
    for _ in range(3): badz |= vf(badz)                                   # pleats and three rings round them: always inside
    along |= badz; sel = tidy(sel | badz)
    for _ in range(20):                # a simple rim: grow at any vertex the boundary passes through twice
        D = np.vstack([F[sel][:, [0, 1]], F[sel][:, [1, 2]], F[sel][:, [2, 0]]]); S = set(map(tuple, D))
        bnd = np.array([e0 for e0, e1 in D if (e1, e0) not in S])
        if not len(bnd): break
        vv, cc = np.unique(bnd, return_counts=True); multi = vv[cc > 1]
        if not len(multi): break
        sel = tidy(sel | (np.isin(F, multi).any(1) & along))
    return sel


def tidy_patch(F, sel):
    import scipy.sparse as sp, scipy.sparse.csgraph as cg
    a, b = edge_faces(F); n = len(F)
    for inside in (True, False):
        m = sel[a] & sel[b] if inside else ~sel[a] & ~sel[b]
        _, lab = cg.connected_components(sp.coo_matrix((np.ones(m.sum()), (a[m], b[m])), shape=(n, n)), directed=False)
        pick = sel if inside else ~sel; big = np.bincount(lab[pick]).argmax()
        sel = (pick & (lab == big)) if inside else (sel | (pick & (lab != big)))
    return sel


def patch_frame(V, F, sel, gb):
    """frame of the patch plane: D = the bed floor's normal (gallbladder → liver, averaged near the wall)"""
    c = V[F].mean(1); _, i = gb.tree.query(c); t = c - gb.C[i]; t /= np.linalg.norm(t, axis=1, keepdims=True)
    ar = np.linalg.norm(np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]), axis=1)
    core = sel & (gb(c) < 3 / MM); D = -(t[core] * ar[core, None]).sum(0); D /= np.linalg.norm(D)
    U = np.cross(D, [0, 0, 1.0]); U /= np.linalg.norm(U); W = np.cross(D, U)
    return D, U, W


def rebuild(V, F, gb):
    import triangle
    import scipy.sparse as sp
    from scipy.sparse.linalg import spsolve
    sel = select_patch(V, F, gb)
    from shapely.geometry import Polygon, LineString
    from shapely.strtree import STRtree
    D, U, W = patch_frame(V, F, sel, gb)
    for it in range(40):          # grow the patch where its rim, seen along D, crosses itself (pleats at the rim)
        loops = boundary_loops(F[sel]); assert len(loops) == 1, f'patch is not a disk ({len(loops)} boundary loops)'
        B = loops[0]; O = V[B].mean(0); b2 = np.stack([(V[B] - O) @ U, (V[B] - O) @ W], 1); nb = len(B)
        if Polygon(b2).is_valid: break
        segs = [LineString([b2[k], b2[(k + 1) % nb]]) for k in range(nb)]; tr = STRtree(segs); hot = set()
        for k, sg in enumerate(segs):
            for j in tr.query(sg):
                if abs(int(j) - k) > 1 and abs(int(j) - k) != nb - 1 and sg.intersects(segs[int(j)]): hot |= {B[k], B[(k + 1) % nb]}
        grow = np.isin(F, list(hot)).any(1)
        for _ in range(1): grow |= np.isin(F, np.unique(F[grow])).any(1)
        sel = tidy_patch(F, sel | grow)
    else: raise AssertionError('the rim could not be made simple')
    print(f'rim: simple after {it} growth steps ({sel.sum()} faces)', flush=True)
    # constrained quality triangulation of the hole, boundary kept exactly
    T = triangle.triangulate({'vertices': b2, 'segments': np.c_[np.arange(nb), (np.arange(nb) + 1) % nb]},
                             f'pYq28a{0.433 * EDGE * EDGE:.10f}')
    P2, T2 = T['vertices'], T['triangles']; assert len(P2) >= nb and np.allclose(P2[:nb], b2)
    m = len(P2); interior = np.arange(nb, m)
    # (a) harmonic membrane: height along D, boundary heights from the rim
    E = np.vstack([T2[:, [0, 1]], T2[:, [1, 2]], T2[:, [2, 0]]])
    A = sp.coo_matrix((np.ones(len(E)), (E[:, 0], E[:, 1])), shape=(m, m)).tocsr(); A = ((A + A.T) > 0).astype(float)
    L = (sp.diags(np.asarray(A.sum(1)).ravel()) - A).tocsr()
    h = np.zeros(m); h[:nb] = (V[B] - O) @ D
    h[interior] = spsolve(L[interior][:, interior].tocsc(), -(L[interior][:, :nb] @ h[:nb]))
    # (b) the gallbladder's upper surface + GAP along D (first contact coming from the liver side), flared
    grid = 0.5 / MM; lo, hi = P2.min(0) - 0.02, P2.max(0) + 0.02
    gx, gy = np.meshgrid(np.arange(lo[0], hi[0], grid), np.arange(lo[1], hi[1], grid), indexing='ij'); G2 = np.c_[gx.ravel(), gy.ravel()]
    ws = np.arange(h.min() - 0.30, h.max() + 0.40, 0.1 / MM); top = np.full(len(G2), np.inf)
    for k in range(0, len(G2), 2000):
        Q = O + G2[k:k + 2000, :1] * U + G2[k:k + 2000, 1:] * W
        P3 = Q[:, None, :] + ws[None, :, None] * D                          # march along D (towards the gallbladder)
        g = gb(P3.reshape(-1, 3)).reshape(len(Q), len(ws)); hit = g < GAP
        j = np.where(hit.any(1), hit.argmax(1), -1); top[k:k + 2000] = np.where(j >= 0, ws[np.maximum(j, 0)], np.inf)
    fp = np.isfinite(top); tree = cKDTree(G2[fp]); tf = top[fp]
    d, i = tree.query(P2, k=min(600, int(fp.sum())))
    bound = (tf[i] + FLARE * d).min(1)                                      # highest allowed height along D (flared footprint)
    hh = np.clip(0.5 + 0.5 * (bound - h) / KSM, 0, 1)
    z = bound + (h - bound) * hh - KSM * hh * (1 - hh)                       # smooth minimum
    z[:nb] = h[:nb]
    Pn = O + P2[:, :1] * U + P2[:, 1:] * W + z[:, None] * D
    for _ in range(10):                                                     # any remaining contact: back along −D
        g = gb(Pn[interior]); low = g < GAP
        if not low.any(): break
        Pn[interior[low]] -= D * (GAP - g[low] + 0.02 / MM)[:, None]
    # assemble: drop the patch faces and their now-unused vertices, append the new interior vertices and faces
    newidx = np.full(m, -1); newidx[:nb] = B; newidx[nb:] = len(V) + np.arange(m - nb); V2 = np.vstack([V, Pn[nb:]])
    F2n = newidx[T2]
    if (fnormals(V2, F2n) @ D).mean() < 0: F2n = F2n[:, ::-1]
    Fall = np.vstack([F[~sel], F2n])
    used = np.zeros(len(V2), bool); used[Fall.ravel()] = True; remap = -np.ones(len(V2), int); remap[used] = np.arange(used.sum())
    V3, F3 = V2[used], remap[Fall]
    # finish: where the rim itself runs close to the wall (the fundus at the inferior margin), clear it to GAP along −D and
    # spread the displacement over the neighbouring rings, so the old surface meets the new floor without a crease
    import scipy.sparse as sp
    n3 = len(V3); E3 = np.vstack([F3[:, [0, 1]], F3[:, [1, 2]], F3[:, [2, 0]]])
    A3 = sp.coo_matrix((np.ones(len(E3)), (E3[:, 0], E3[:, 1])), shape=(n3, n3)).tocsr(); A3 = ((A3 + A3.T) > 0).astype(float)
    W3 = sp.diags(1 / np.maximum(np.asarray(A3.sum(1)).ravel(), 1)) @ A3
    g3 = gb(V3); mob = g3 < 11 / MM                                         # vertices allowed to move
    for _ in range(4): mob |= (A3 @ mob.astype(float) > 0) & (g3 < 16 / MM)
    for _ in range(80):
        g3 = gb(V3); need = np.maximum(GAP + 0.03 / MM - g3, 0) * mob
        disp = -D[None, :] * need[:, None]
        for _ in range(6): disp = np.maximum(disp @ -D, (W3 @ (disp @ -D)))[:, None] * -D[None, :] * mob[:, None]
        V3 = V3 + disp
        L = W3 @ V3 - V3; V3 = V3 + 0.5 * mob[:, None] * L; L = W3 @ V3 - V3; V3 = V3 - 0.52 * mob[:, None] * L
        if gb(V3).min() >= GAP and np.abs(disp).max() < 1e-7: break
    # last: relax any faces still folded (slivers on the sharp inferior margin at the fundus notch) and soften the rim
    # crease with a narrow Taubin band across the old/new boundary, keeping the wall gap
    rimv = np.zeros(n3, bool); rimv[remap[B]] = True
    band = rimv.copy()
    for _ in range(3): band |= A3 @ band.astype(float) > 0
    for it in range(30):
        bad3, _ = folds(V3, F3); fv = np.zeros(n3, bool); fv[np.unique(F3[bad3])] = True
        if it >= 10 and not fv.any(): break
        fv |= A3 @ fv.astype(float) > 0
        V3 = V3 + (0.5 * fv)[:, None] * (W3 @ V3 - V3)
        if it < 10:
            L = W3 @ V3 - V3; V3 = V3 + (0.4 * band)[:, None] * L; L = W3 @ V3 - V3; V3 = V3 - (0.42 * band)[:, None] * L
        g3 = gb(V3); low = g3 < GAP; V3[low] -= D * (GAP - g3[low] + 0.02 / MM)[:, None]
    return V3, F3, dict(removed_faces=int(sel.sum()), new_faces=len(F2n), boundary=nb)


def fossa_depth(V, F, gb):
    """bed centre vs its rim along the outward normal, mm (negative = recessed / concave)"""
    c = V[F].mean(1); g = gb(c); fn = fnormals(V, F)
    _, i = gb.tree.query(c); face = np.einsum('ij,ij->i', fn, gb.C[i] - c) > 0
    core = face & (g < 3 / MM); rim = face & (g > 11 / MM) & (g < 15 / MM)
    P = c[rim]; o = P.mean(0); _, _, vt = np.linalg.svd(P - o); pn = vt[2]
    if pn @ fn[core].mean(0) < 0: pn = -pn
    return float((c[core].mean(0) - o) @ pn * MM)


def check(V, F, gb, tag):
    cnt = np.unique(np.sort(np.vstack([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), 1), axis=0, return_counts=True)[1]
    bad, ang = folds(V, F); g = gb(V); a, b = edge_faces(F)
    near = gb(V[F].mean(1)) < ZONE + 3 / MM; na = near[a] & near[b]
    print(f'{tag}: {len(V)} vertices, {len(F)} faces; edges not shared by exactly 2 faces: {(cnt != 2).sum()}; folded faces {bad.sum()}; '
          f'bed dihedral p99 {np.percentile(ang[na], 99):.0f}°, max {ang[na].max():.0f}°; min gap to the gallbladder wall {g.min()*MM:.2f} mm; '
          f'bed centre vs rim {fossa_depth(V, F, gb):+.1f} mm', flush=True)


def unwrap(V, F, res=4096):
    import xatlas
    at = xatlas.Atlas(); at.add_mesh(V.astype(np.float32), F.astype(np.uint32))
    co = xatlas.ChartOptions(); co.max_iterations = 4; co.normal_deviation_weight = 2.0
    po = xatlas.PackOptions(); po.resolution = res; po.padding = 8; po.bilinear = True; po.blockAlign = True
    at.generate(co, po); vmap, ind, uv = at[0]; n = len(V); mm = len(vmap)
    newidx = np.full(mm, -1, np.int64); prim = np.full(n, -1, np.int64); dup = []
    for k in range(mm):
        o = vmap[k]
        if prim[o] < 0: prim[o] = k; newidx[k] = o
        else: newidx[k] = n + len(dup); dup.append(o)
    dup = np.array(dup, np.int64); M = n + len(dup); assert M < 65536, M
    UV = np.zeros((M, 2)); UV[newidx] = uv; F2 = newidx[ind].astype(np.int64)
    assert (np.concatenate([np.arange(n), dup])[F2] == F).all()
    return np.concatenate([V, V[dup]]), F2, UV, dup, at.chart_count


def update_sdf(J, V, F, box):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from pancreas44 import MeshSDF
    ct = J['ct']; O = np.array(ct['sdfO']); Nn = ct['sdfN']; P = ct['sdfP']
    q = np.frombuffer(base64.b64decode(ct['sdf']), np.int8).copy().reshape(Nn)
    lo = np.maximum(np.floor((box[0] - O) / P).astype(int), 0); hi = np.minimum(np.ceil((box[1] - O) / P).astype(int), np.array(Nn) - 1)
    ii = np.stack(np.meshgrid(*[np.arange(lo[k], hi[k] + 1) for k in range(3)], indexing='ij'), -1).reshape(-1, 3)
    d = MeshSDF(V, F)(O + ii * P); old = q[ii[:, 0], ii[:, 1], ii[:, 2]].astype(float) / 64
    q[ii[:, 0], ii[:, 1], ii[:, 2]] = np.clip(np.round(d * 64), -128, 127).astype(np.int8)
    ct['sdf'] = base64.b64encode(q.tobytes()).decode()
    return len(ii), np.abs(np.clip(d, -2, 2) - old).max() * MM


if __name__ == '__main__':
    gb = GBTube(); J, V0, F0 = load()
    check(V0, F0, gb, 'before')
    V1, F1, rep = rebuild(V0, F0, gb)
    print(f'patch: removed {rep["removed_faces"]} faces, kept {rep["boundary"]} rim vertices, {rep["new_faces"]} new faces')
    check(V1, F1, gb, 'after ')
    if '--dry' in sys.argv: np.save('/tmp/fossa_V.npy', V1); np.save('/tmp/fossa_F.npy', F1); sys.exit()
    Vall, F2, UV, dup, charts = unwrap(V1, F1)
    ct = J['ct']; qs = ct['qs']
    ct['pos'] = base64.b64encode(np.round(Vall / qs).astype(np.int16).tobytes()).decode()
    ct['idx'] = base64.b64encode(F2.astype(np.uint16).tobytes()).decode()
    ct['uv'] = base64.b64encode(np.round(np.clip(UV, 0, 1) * 65535).astype(np.uint16).tobytes()).decode()
    ct['dup'] = base64.b64encode(dup.astype(np.uint16).tobytes()).decode(); ct['n0'] = int(len(V1))
    c = V1[F1].mean(1); near = gb(c) < ZONE + 0.05; box = (c[near].min(0) - 0.12, c[near].max(0) + 0.12)
    ncell, dmax = update_sdf(J, V1, F1, box)
    DATA.write_text(json.dumps(J, separators=(',', ':')))
    print(f'unwrap: {len(V1)} vertices + {len(dup)} seam copies, {charts} charts; SDF: {ncell} cells around the fossa '
          f'(max change {dmax:.1f} mm); wrote {DATA.name}')
