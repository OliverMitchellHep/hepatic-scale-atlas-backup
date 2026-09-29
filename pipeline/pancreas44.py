#!/usr/bin/env python3
"""Pancreas remodel (v44): a gently curved gland built as an implicit surface on this patient's CT landmarks.

    python3 pipeline/pancreas44.py            # writes data/liver-data.json ct.viscera.pancreas and prints the JS literals
    python3 pipeline/pancreas44.py --dry      # build and report only

v43 used the thinned CT pancreas, whose body ran transversely and then turned ~90° straight back to the spleen. This
builds the gland from one smooth centreline (head → neck → body → tail) with an elliptical section, plus a head and an
uncinate process, blended with a smooth union:
  head      in the duodenal C-loop, to the right of the SMV (model +x = patient left)
  uncinate  hooks medially behind the SMV (between the SMV in front and the IVC / aorta behind)
  neck      in front of the SMV–splenic confluence
  body      crosses in front of the aorta at L1–L2, behind the stomach (lesser sac between)
  tail      rises gently towards the splenic hilum
The stomach, duodenum, spleen, left kidney, SMV and portal trunk are subtracted with a clearance margin, so the surface
cannot intersect them. The splenic vein is then laid along the posterior surface of the body and tail (the centreline
offset backwards by the half-thickness plus the vein radius), and the main pancreatic duct along the centreline; both are
printed as CT-frame V3() literals for src/atlas.js.

v45 (head in the C-loop): the head is enlarged towards the duodenum by a second ellipsoid on the medial wall of D2 and is
then carved by the duodenum at a 0.8 mm clearance, so it abuts D2's medial wall along the C-loop instead of sitting in front
of it (v44 gap 6-25 mm). The larger head could reach the vessels behind it, so the IVC, aorta, SMA, left renal vein and right
kidney are subtracted too. The distal CBD and the terminal main duct are wrapped in a parenchymal sheath (tube union) from
where they enter the head down to the ampulla: both stay inside the gland until they reach the duodenal wall (v44: the CBD
left the gland ~12 mm above the ampulla and ran up to 8 mm outside it).

v46 (rounder head): the head is one near-spherical ellipsoid in the C-loop (the second lobe towards D2 and the uncinate
tube are gone, and the neck tapers into the head instead of ending in a thick lobe), so nothing sticks out of it. The CBD now
enters the head from above: the duct sheath is kept only for the last few millimetres at the ampulla (y < SHEATH_Y), where
the head meets D2, instead of wrapping the CBD from y = -0.62 down (which raised a tower of gland around the duct).

v46b: the v46 head was too spherical; the head is now the v43 head (the thinned CT gland, taller and flattened
front to back, widening down to D2), read from git and blended into the v44+ neck; still carved by the duodenum and
every vessel, and the ducts' sheath still meets D2 at the ampulla.

Output mesh: marching cubes (0.011 units ≈ 0.8 mm), Taubin smoothing, quantised like the other viscera (Int16 × ct.qs,
Uint16 index, base64). Needs numpy, scipy, scikit-image, fast-simplification, trimesh (+ rtree).
"""
import base64, json, sys
from pathlib import Path
import numpy as np
from scipy.interpolate import CubicSpline
from scipy.spatial import cKDTree
from skimage.measure import marching_cubes

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data/liver-data.json'
MM = 69.9757

# ── landmarks, CT model frame (+x patient left, +y superior, +z anterior); from src/atlas.js ──
SMV = np.array([[0.30, -1.30, 0.62], [0.35, -0.90, 0.60], [0.42, -0.52, 0.49]]); SMV_R = 0.076   # SMV0 → CONF
PVT = np.array([[0.42, -0.52, 0.49], [0.10, -0.36, 0.37], [-0.12, -0.25, 0.27]]); PVT_R = 0.084  # portal trunk
CONF = SMV[-1]
SPL0 = np.array([1.641, 0.014, -0.585])          # splenic vein at the hilum
SV_R0, SV_R1 = 0.054, 0.064                       # splenic vein radius, hilum → confluence
# arteries that run in grooves on the gland (splenic along the superior border, GDA on the anterior head): subtracted too
SPA = np.array([[0.58, -0.35, 0.21], [0.72, -0.3, 0.33], [0.957, -0.252, -0.075], [0.988, -0.287, -0.151], [1.039, -0.293, -0.195], [1.082, -0.291, -0.213], [1.127, -0.284, -0.251], [1.207, -0.239, -0.294], [1.279, -0.176, -0.351], [1.373, -0.127, -0.451], [1.509, -0.008, -0.456], [1.644, 0.081, -0.46]]); SPA_R = (0.034, 0.029)
# v45 (Task 6): GDA behind D1 and on the anterior head, with its two branches (src/atlas.js)
GDA = np.array([[0.16, -0.31, 0.54], [0.1, -0.51, 0.49], [-0.02, -0.57, 0.48], [-0.12, -0.62, 0.462], [-0.15, -0.68, 0.462], [-0.135, -0.77, 0.497], [-0.08, -0.84, 0.572]]); GDA_R = (0.022, 0.018)
GDA_BR = [(np.array([[-0.08, -0.84, 0.572], [-0.14, -0.92, 0.582], [-0.19, -1.02, 0.578], [-0.21, -1.14, 0.535]]), (0.013, 0.010)), (np.array([[-0.08, -0.84, 0.572], [-0.055, -0.98, 0.612], [-0.04, -1.11, 0.745], [0.03, -1.18, 0.895], [0.2, -1.245, 0.955], [0.4, -1.31, 0.995]]), (0.016, 0.012))]

# ── gland centreline: tail tip → neck → head (control points; spline through them) ──
CL = np.array([
    [1.500, -0.135, -0.430],   # tail tip, at the splenic hilum
    [1.400, -0.200, -0.360],
    [1.250, -0.290, -0.270],   # tail, between the stomach's back wall and the left kidney
    [1.100, -0.360, -0.160],
    [0.950, -0.420, 0.020],    # body, behind the stomach (lesser sac between)
    [0.815, -0.460, 0.245],
    [0.665, -0.485, 0.455],    # body over the aorta and the SMA origin (L1–L2)
    [0.470, -0.500, 0.620],    # neck, in front of the confluence
    [0.270, -0.545, 0.645],
    [0.050, -0.740, 0.550],    # head
])
# half-thickness (antero-posterior, a) and half-height (cranio-caudal, b) along the centreline, tail → head (param s∈[0,1])
A_PROF = [(0.00, 0.050), (0.12, 0.070), (0.40, 0.085), (0.62, 0.080), (0.75, 0.072), (1.00, 0.085)]   # v46: end 0.110 → 0.085
B_PROF = [(0.00, 0.075), (0.12, 0.115), (0.40, 0.135), (0.62, 0.130), (0.75, 0.120), (1.00, 0.120)]   # v46: end 0.170 → 0.120
# v45: CBD (cystic junction -> ampulla) and the terminal main duct, from src/atlas.js (cysJ, BD_CBD, amp0; PANC_MPD tail)
CBD = np.array([[-0.27, -0.37, 0.37], [-0.13, -0.49, 0.38], [-0.08, -0.66, 0.40], [-0.11, -0.82, 0.44], [-0.17, -0.93, 0.40],
                [-0.23, -1.00, 0.33], [-0.273, -1.049, 0.259]]); CBD_R = 0.044
MPD_HEAD = np.array([[0.137, -0.641, 0.603], [0.05, -0.74, 0.55], [-0.05, -0.92, 0.45], [-0.15, -1.04, 0.35], [-0.273, -1.049, 0.259]])
SHEATH = 0.030                                   # parenchyma around each duct (radius beyond the duct wall)
SHEATH_Y = -1.00                                 # v46: sheath only below this (the ducts' last few mm to the ampulla)
# v45: vessels behind the enlarged head (centrelines from src/atlas.js, CT frame)
IVC = np.array([[0.0, -0.4, 0.03], [-0.04, -0.6, 0.07], [-0.02, -0.75, 0.10], [0.06, -1.25, 0.13]]); IVC_R = 0.090
AORTA = np.array([[0.66, 0.1, -0.2], [0.57, -0.4, -0.05], [0.4, -1.4, 0.21]]); AORTA_R = (0.105, 0.100)
SMA = np.array([[0.55, -0.5, 0.06], [0.55, -0.62, 0.28], [0.5, -0.95, 0.48], [0.47, -1.3, 0.52]]); SMA_R = (0.044, 0.040)
LRV = np.array([[1.07, -0.67, -0.62], [0.86, -0.7, -0.24], [0.69, -0.715, 0.1], [0.52, -0.72, 0.213], [0.26, -0.72, 0.18], [0.04, -0.72, 0.12]]); LRV_R = (0.034, 0.042)
K_BLEND = 0.07
CLEAR = {'stomach': 0.028, 'duodenum': 0.012, 'spleen': 0.030, 'kidney_left': 0.020, 'smv': 0.010, 'pv': 0.012, 'sv': 0.003, 'spa': 0.003, 'gda': 0.003,
         'kidney_right': 0.020, 'ivc': 0.012, 'aorta': 0.012, 'sma': 0.010, 'lrv': 0.010}
H = 0.011
TARGET_V = 11000


def decode(d, qs):
    p = np.frombuffer(base64.b64decode(d['pos']), np.int16).reshape(-1, 3) * qs
    f = np.frombuffer(base64.b64decode(d['idx']), np.uint16).reshape(-1, 3)
    return p.astype(np.float64), f.astype(np.int64)


def encode(P, F, qs):
    return (base64.b64encode(np.round(P / qs).astype(np.int16).tobytes()).decode(),
            base64.b64encode(F.astype(np.uint16).tobytes()).decode())


def vnormals(P, F):
    n = np.zeros_like(P); fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    for k in range(3): np.add.at(n, F[:, k], fn)
    return n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)


class MeshSDF:
    """Signed distance to a closed triangle mesh: unsigned distance to dense surface samples; inside/outside by ray parity
    (a ray towards +z from the point's (x, y), rasterised on a CELL grid), so it does not depend on the mesh's winding
    (the CT duodenum has a locally inverted patch)."""
    CELL = 0.004

    def __init__(self, P, F, per_tri=6):
        rng = np.random.default_rng(1); a, b = rng.random((2, len(F), per_tri)); m = a + b > 1; a[m], b[m] = 1 - a[m], 1 - b[m]
        A, B, C = P[F[:, 0]][:, None], P[F[:, 1]][:, None], P[F[:, 2]][:, None]
        self.S = np.vstack([(A + (B - A) * a[..., None] + (C - A) * b[..., None]).reshape(-1, 3), P]); self.T = cKDTree(self.S)
        # crossings: for every cell centre (x, y) covered by a triangle's xy projection, the z where the triangle meets it
        c = self.CELL; keys, zs = [], []
        for t in P[F]:
            lo = np.floor(t[:, :2].min(0) / c).astype(int); hi = np.floor(t[:, :2].max(0) / c).astype(int)
            gx, gy = np.meshgrid(np.arange(lo[0], hi[0] + 1), np.arange(lo[1], hi[1] + 1), indexing='ij')
            q = (np.stack([gx.ravel(), gy.ravel()], 1) + 0.5) * c
            v0, v1 = t[1, :2] - t[0, :2], t[2, :2] - t[0, :2]; den = v0[0] * v1[1] - v0[1] * v1[0]
            if abs(den) < 1e-14: continue
            w = q - t[0, :2]; u = (w[:, 0] * v1[1] - w[:, 1] * v1[0]) / den; v = (v0[0] * w[:, 1] - v0[1] * w[:, 0]) / den
            k = (u >= 0) & (v >= 0) & (u + v < 1)
            if not k.any(): continue
            keys.append(np.stack([gx.ravel()[k], gy.ravel()[k]], 1)); zs.append(t[0, 2] + u[k] * (t[1, 2] - t[0, 2]) + v[k] * (t[2, 2] - t[0, 2]))
        K = np.vstack(keys); Z = np.concatenate(zs); self.base = K.min(0); kk = K - self.base; self.ny = kk[:, 1].max() + 1
        lin = kk[:, 0] * self.ny + kk[:, 1]; o = np.lexsort((Z, lin)); self.lin, self.Z = lin[o], Z[o]

    def inside(self, X):
        kk = np.floor(X[:, :2] / self.CELL).astype(int) - self.base
        ok = (kk >= 0).all(1) & (kk[:, 1] < self.ny); lin = kk[:, 0] * self.ny + kk[:, 1]
        a = np.searchsorted(self.lin, lin, 'left'); b = np.searchsorted(self.lin, lin, 'right')
        # crossings above the point = entries in [a, b) with Z > X.z  (Z sorted within each cell)
        above = np.array([b[i] - np.searchsorted(self.Z[a[i]:b[i]], X[i, 2], 'right') - a[i] if b[i] > a[i] else 0 for i in range(len(X))])
        return ok & (above % 2 == 1)

    def __call__(self, X):
        d = self.T.query(X)[0]; return np.where(self.inside(X), -d, d)


def seg_dist(X, pts, r):
    """distance to a polyline tube of radius r (scalar or per-vertex)"""
    r = np.broadcast_to(np.asarray(r, float), (len(pts),)); best = np.full(len(X), 9.0)
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]; ab = b - a; t = np.clip(((X - a) @ ab) / (ab @ ab), 0, 1)
        d = np.linalg.norm(X - (a + t[:, None] * ab), axis=1) - (r[i] + (r[i + 1] - r[i]) * t); best = np.minimum(best, d)
    return best


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h)


def smax(a, b, k): return -smin(-a, -b, k)


def interp(prof, s): xs, ys = zip(*prof); return np.interp(s, xs, ys)


def centreline(n=500):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(CL, axis=0), axis=1))]; sp = CubicSpline(d / d[-1], CL, bc_type='natural')
    s = np.linspace(0, 1, n); P = sp(s); T = sp(s, 1); T /= np.linalg.norm(T, axis=1, keepdims=True)
    # section frame: 'up' = superior projected off the tangent, 'ant' = anterior (T × up, sign so it points +z-ish)
    U = np.array([0, 1, 0.]) - T * T[:, 1:2]; U /= np.linalg.norm(U, axis=1, keepdims=True)
    Aant = np.cross(T, U); Aant *= np.sign(Aant[:, 2:3] + 1e-9)
    return s, P, T, U, Aant


_H43 = None


def head_v43(X):
    """v46b: signed distance to the v43 pancreatic head (the thinned CT gland of commit 233307b, x < HEAD43_X), cut off
    smoothly towards the neck so the v44+ body joins it. The v43 mesh is read from git (assets/ never held it)."""
    global _H43
    if _H43 is None:
        import subprocess
        J = json.loads(subprocess.run(['git', 'show', '233307b:data/liver-data.json'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
        P, F = decode(J['ct']['viscera']['pancreas'], J['ct']['qs']); _H43 = (MeshSDF(P, F), P.min(0) - 0.03, P.max(0) + 0.03)
    m, lo, hi = _H43; d = m.T.query(X)[0]
    box = ((X >= lo) & (X <= hi)).all(1) & (X[:, 0] < HEAD43_X + 0.05) & (d < 0.30)
    if box.any(): d[box] = np.where(m.inside(X[box]), -d[box], d[box])
    return smax(d, X[:, 0] - HEAD43_X, 0.05)


HEAD43_X = 0.22                                    # v46b: the head is taken from v43 left of this plane (patient right of the neck)


def gland_sdf(X, cl):
    s, P, T, U, Aa = cl; tree = cKDTree(P); _, i = tree.query(X)
    d = X - P[i]; a = interp(A_PROF, s[i]); b = interp(B_PROF, s[i])
    u = np.einsum('ij,ij->i', d, Aa[i]); v = np.einsum('ij,ij->i', d, U[i]); w = np.einsum('ij,ij->i', d, T[i])
    q = np.sqrt((u / a) ** 2 + (v / b) ** 2); body = (q - 1) * np.minimum(a, b)
    # round both ends: beyond the first / last centreline sample, grow with the along-axis offset
    end = ((i == 0) & (w < 0)) | ((i == len(s) - 1) & (w > 0)); body = np.where(end, np.sqrt(np.maximum(body, 0) ** 2 + w ** 2) + np.minimum(body, 0), body)
    head = head_v43(X)                             # v46b: the v43 head shape (was one near-spherical ellipsoid, v46)
    f = smin(body, head, K_BLEND * 2.0)            # no second lobe (HEAD2) or uncinate tube (UNC); wide neck blend
    return smin(f, ducts_sdf(X), 0.03)


def dense(pts, n=160):
    """polyline through pts resampled by arc length (the page's Catmull-Rom curves stay within ~1 mm of it)"""
    from scipy.interpolate import CubicSpline
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]; return CubicSpline(d, pts, bc_type='natural')(np.linspace(0, d[-1], n))


def ducts_sdf(X):
    """parenchymal sheath around the intrapancreatic CBD (from where it meets the head) and the terminal main duct"""
    cbd = dense(CBD); cbd = cbd[cbd[:, 1] < SHEATH_Y]; mpd = dense(MPD_HEAD); mpd = mpd[mpd[:, 1] < SHEATH_Y]
    return np.minimum(seg_dist(X, cbd, CBD_R + SHEATH), seg_dist(X, mpd, 0.021 + SHEATH))


def taubin(P, F, it=12, lam=0.5, mu=-0.53):
    nb = [set() for _ in range(len(P))]
    for a, b, c in F: nb[a].update((b, c)); nb[b].update((a, c)); nb[c].update((a, b))
    idx = [np.fromiter(n, int) for n in nb]
    for _ in range(it):
        for f in (lam, mu):
            L = np.array([P[n].mean(0) if len(n) else p for p, n in zip(P, idx)]) - P; P = P + f * L
    return P


def build():
    J = json.loads(DATA.read_text()); ct = J['ct']; qs = ct['qs']; V = ct['viscera']
    obst = {}
    for k in ('stomach', 'duodenum', 'spleen', 'kidney_left', 'kidney_right'):
        P, F = decode(V[k], qs); obst[k] = MeshSDF(P, F)
    cl = centreline()
    lo = np.array([-0.50, -1.55, -0.65]); hi = np.array([1.70, 0.05, 0.95])
    n = np.ceil((hi - lo) / H).astype(int) + 1
    g = np.stack(np.meshgrid(*[lo[k] + H * np.arange(n[k]) for k in range(3)], indexing='ij'), -1).reshape(-1, 3)
    f = gland_sdf(g, cl)
    band = f < 0.06
    X = g[band]; fb = f[band]
    dist = {k: o(X) for k, o in obst.items()}
    dist['smv'] = seg_dist(X, SMV, SMV_R); dist['pv'] = seg_dist(X, PVT, PVT_R)
    SV, _ = veins(cl); dist['sv'] = seg_dist(X, SV, np.linspace(SV_R0, SV_R1, len(SV)))
    dist['spa'] = seg_dist(X, SPA, np.linspace(*SPA_R, len(SPA))); dist['gda'] = gda_dist(X)
    dist.update(vessel_dists(X))
    for k, d in dist.items(): fb = smax(fb, -(d - CLEAR[k]), 0.02)
    f[band] = fb; f[~band] = np.maximum(f[~band], 0.06)
    vol = f.reshape(n)
    verts, faces, _, _ = marching_cubes(vol, 0.0, spacing=(H, H, H))
    verts += lo
    # keep the largest component (subtraction can leave slivers)
    import scipy.sparse as sps, scipy.sparse.csgraph as csg
    m = sps.coo_matrix((np.ones(len(faces) * 3), (np.repeat(faces[:, 0], 3), faces.reshape(-1))), shape=(len(verts),) * 2)
    ncomp, lab = csg.connected_components(m, directed=False); big = np.bincount(lab).argmax()
    keep = lab == big; remap = -np.ones(len(verts), int); remap[keep] = np.arange(keep.sum())
    faces = remap[faces]; faces = faces[(faces >= 0).all(1)]; verts = verts[keep]
    verts = taubin(verts, faces)
    # decimate to the page budget; fidelity rule: max deviation ≤ 0.1 % of the bounding-box diagonal (pipeline/README.md)
    import fast_simplification
    if '--dry' in sys.argv: np.save('/tmp/panc_hv.npy', verts); np.save('/tmp/panc_hf.npy', faces)
    diag = np.linalg.norm(verts.max(0) - verts.min(0))
    v2, f2 = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_reduction=1 - TARGET_V / len(verts))
    v2 = v2.astype(np.float64); f2 = f2.astype(np.int64)
    import trimesh
    err = max(np.abs(trimesh.proximity.closest_point(trimesh.Trimesh(v2, f2, process=False), verts)[1]).max(),
              np.abs(trimesh.proximity.closest_point(trimesh.Trimesh(verts, faces, process=False), v2)[1]).max())   # two-sided Hausdorff
    print(f'decimated {len(verts)} → {len(v2)} vertices; max deviation {err*MM:.3f} mm (limit {0.001*diag*MM:.3f} mm = 0.1 % of diagonal)')
    # outward winding (counter-clockwise seen from outside, as three.js front faces expect): positive signed volume
    vol = np.einsum('ij,ij->i', v2[f2[:, 0]], np.cross(v2[f2[:, 1]], v2[f2[:, 2]])).sum() / 6
    if vol < 0: f2 = f2[:, ::-1].copy()
    return J, v2, f2, cl, obst, ncomp


def gda_dist(X):
    """GDA and its branches, on the page's curves (spline through the control points)"""
    d = np.full(len(X), 9.0)
    for pts, (r0, r1) in [(GDA, GDA_R)] + GDA_BR:
        c = dense(pts, 80); d = np.minimum(d, seg_dist(X, c, np.linspace(r0, r1, len(c))))
    return d


def vessel_dists(X):
    return {'ivc': seg_dist(X, IVC, IVC_R), 'aorta': seg_dist(X, AORTA, np.linspace(*AORTA_R, len(AORTA))),
            'sma': seg_dist(X, SMA, np.linspace(*SMA_R, len(SMA))), 'lrv': seg_dist(X, LRV, np.linspace(*LRV_R, len(LRV)))}


def report(verts, faces, obst):
    out = {k: v.min() for k, v in vessel_dists(verts).items()}
    for k, o in obst.items(): d = o(verts); out[k] = d.min()
    out['smv'] = seg_dist(verts, SMV, SMV_R).min(); out['pv'] = seg_dist(verts, PVT, PVT_R).min()
    out['splenic a.'] = seg_dist(verts, SPA, np.linspace(*SPA_R, len(SPA))).min(); out['GDA'] = gda_dist(verts).min()
    return out


def veins(cl):
    """splenic vein along the posterior surface of the tail and body (posterior-superior in the tail, where the left kidney
    leaves no room behind), from the hilum to the confluence behind the neck; MPD on the gland's axis"""
    s, P, T, U, Aa = cl
    a = interp(A_PROF, s); b = interp(B_PROF, s)
    k = s <= 0.66
    up = np.interp(s[k], [0, 0.35, 0.60], [0.85, 0.60, 0.0])[:, None]          # share of 'superior' in the offset direction
    D = -Aa[k] * np.sqrt(1 - up ** 2) + U[k] * up
    reach = 1 / np.sqrt((np.sqrt(1 - up[:, 0] ** 2) / a[k]) ** 2 + (up[:, 0] / b[k]) ** 2)   # ellipse radius along D
    r = np.interp(s[k], [0, 0.66], [SV_R0, SV_R1])
    sv = P[k] + D * (reach + r + 0.004)[:, None]
    pick = np.linspace(0, len(sv) - 1, 12).round().astype(int)
    SV = np.vstack([SPL0, sv[pick], CONF])
    mp = np.linspace(0, len(P) - 1, 16).round().astype(int)
    return SV, P[mp]


if __name__ == '__main__':
    J, verts, faces, cl, obst, ncomp = build()
    clr = report(verts, faces, obst)
    ext = verts.max(0) - verts.min(0)
    print(f'pancreas: {len(verts)} vertices, {len(faces)} faces, {ncomp} components before cleanup; extent {np.round(ext*MM)} mm')
    print('clearance to neighbours (mm, >0 = no intersection):', {k: round(v * MM, 1) for k, v in clr.items()})
    G = MeshSDF(verts, faces); cb = dense(CBD, 400); ins = G(cb) < -CBD_R * 0.5
    ent = cb[np.argmax(ins)] if ins.any() else None
    print('CBD: enters the gland at', None if ent is None else np.round(ent, 3), f'; inside from there to the ampulla: {ins[np.argmax(ins):].mean()*100:.0f} %',
          f'; head extent (x<0.2) {np.round((verts[verts[:,0]<0.2].max(0)-verts[verts[:,0]<0.2].min(0))*MM)} mm')
    # v46b: no vessel may run through the gland (a carved tunnel = encased): vessel axes must stay outside it
    enc = {n: float((G(dense(np.asarray(v, float), 200)) < 0).mean()) for n, v in
           [('SMV', SMV), ('portal', PVT), ('IVC', IVC), ('aorta', AORTA), ('SMA', SMA), ('LRV', LRV), ('splenic a.', SPA), ('GDA', GDA)]}
    print('vessel axis inside the gland (fraction, 0 = not encased):', {k: round(v, 3) for k, v in enc.items()})
    SV, MPD = veins(cl)
    sv_r = np.linspace(SV_R0, SV_R1, len(SV)); sv_pts = np.vstack([np.linspace(SV[i], SV[i + 1], 12) for i in range(len(SV) - 1)])
    sv_rr = np.repeat([(sv_r[i] + sv_r[i + 1]) / 2 for i in range(len(SV) - 1)], 12)
    print('splenic vein clearance (mm):', {k: round(float((o(sv_pts) - sv_rr).min() * MM), 1) for k, o in obst.items()},
          'gland surface to vein axis min (mm):', round(float(seg_dist(verts, SV, 0).min() * MM), 1), '(vein radius', SV_R0 * MM, '–', SV_R1 * MM, ')')
    fmt = lambda A: ','.join(f'V3({x:.3f},{y:.3f},{z:.3f})' for x, y, z in A)
    print('SPLV=[' + fmt(SV) + ']')
    print('MPD=[' + fmt(MPD) + ']')
    s, P, T, U, Aa = cl
    ang = np.degrees(np.arccos(np.clip((T[1:] * T[:-1]).sum(1), -1, 1))); dl = np.linalg.norm(np.diff(P, axis=0), axis=1)
    print(f'centreline {dl.sum()*MM:.0f} mm; max turn rate {np.max(ang/(dl*MM)):.2f} °/mm; total turn {ang.sum():.0f}°')
    if '--dry' not in sys.argv:
        pos, idx = encode(verts, faces, J['ct']['qs']); v = J['ct']['viscera']['pancreas']
        assert len(verts) < 65536, 'index must stay Uint16'
        v['pos'], v['idx'] = pos, idx
        for k in ('uv', 'dup', 'n0'): v.pop(k, None)   # a new mesh invalidates any UV unwrap (pipeline/bake44.py redoes it)
        DATA.write_text(json.dumps(J, separators=(',', ':')))
        print('wrote', DATA)
    else:
        np.save('/tmp/panc_v.npy', verts); np.save('/tmp/panc_f.npy', faces)
