#!/usr/bin/env python3
"""v44 organ surface bake: one reproducible, headless run per organ (bpy is used as a Python module; no Blender GUI).

    python3 pipeline/bake44.py pancreas            # UVs → high mesh → Cycles bakes → composed maps in assets/
    python3 pipeline/bake44.py pancreas --stage compose   # re-compose only (after tuning colours; bakes are cached)

Stages (work files in pipeline/work44/<organ>/, not committed):
  uv       xatlas unwrap of the runtime mesh in data/liver-data.json; the original vertices keep their indices and seam
           copies are appended (ct.viscera.<organ>: pos, idx, uv, dup, n0), as uv42.py does for the liver, so the page can
           weld normals across seams and vertex-indexed pathology code is unaffected.
  high     numpy: 2× midpoint subdivision + Taubin smoothing, then the organ's surface relief along the normal
           (pancreas: lobules and interlobular septa from 3D Worley noise, fine secondary lobulation, broad undulation).
  bake     Blender Cycles, CPU, high → low (selected to active):
             normal     tangent space (MikkTSpace)
             ao         self-occlusion (organ only), distance ≈ creases and folds
             cav        cavity: AO at ~1–2 mm
             curv       mean curvature of the high mesh (vertex colour → emission bake)
             thick      thickness: AO baked from inside (normals flipped) — thin rims read bright
             onrm       object-space normal (orientation-driven colour: superior vs visceral surface)
             pos        object-space position (so compose noise is 3D and continuous across UV seams)
  compose  numpy: albedo (sRGB), tangent normal, ORM (R ambient occlusion, G roughness, B clearcoat / wetness mask),
           each at the desktop and the mobile resolution; WebP (the artifact host refuses .ktx2, see CLAUDE.md).

Needs numpy, scipy, pillow, xatlas, bpy (5.0).
"""
import base64, json, os, sys, time
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from noise3 import fbm, worley_f2f1

DATA = ROOT / 'data/liver-data.json'
MM = 69.9757

ORGANS = {
    # res: output sizes (desktop, mobile); lores: bake size of the AO / cavity / curvature / thickness maps (upsampled in compose)
    'pancreas': dict(res=(2048, 1024), lores=2048, subdiv=2, ao_dist=0.12, cav_dist=0.02, thick_dist=0.20, cage=0.02, ray=0.05),
    'liver':    dict(res=(4096, 2048), lores=2048, subdiv=2, ao_dist=0.25, cav_dist=0.035, thick_dist=0.45, cage=0.10, ray=0.22, keep_uv=True),
}


def work(organ):
    d = ROOT / 'pipeline/work44' / organ; d.mkdir(parents=True, exist_ok=True); return d


# ───────────────────────── data ─────────────────────────
def b64a(s, dt): return np.frombuffer(base64.b64decode(s), dt)
def a64(a): return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def load_low(organ):
    if organ == 'liver':
        J, V, F, UV, n0, dup = load_ct_liver(); orig = np.concatenate([np.arange(n0), dup]); return J, V[:n0], orig[F]
    J = json.loads(DATA.read_text()); d = J['ct']['viscera'][organ]; qs = J['ct']['qs']
    P = b64a(d['pos'], np.int16).reshape(-1, 3).astype(np.float64) * qs
    F = b64a(d['idx'], np.uint16).reshape(-1, 3).astype(np.int64)
    if 'dup' in d:   # already unwrapped: return the original (welded) mesh
        n0 = d['n0']; dup = b64a(d['dup'], np.uint16).astype(np.int64)
        orig = np.concatenate([np.arange(n0), dup]); P, F = P[:n0], orig[F]
    return J, P, F


def load_ct_liver():
    J = json.loads(DATA.read_text()); ct = J['ct']; qs = ct['qs']
    V = b64a(ct['pos'], np.int16).reshape(-1, 3).astype(np.float64) * qs
    F = b64a(ct['idx'], np.uint16).reshape(-1, 3).astype(np.int64)
    UV = b64a(ct['uv'], np.uint16).reshape(-1, 2) / 65535.0
    n0 = ct['n0']; dup = b64a(ct['dup'], np.uint16).astype(np.int64)
    return J, V, F, UV, n0, dup


def stage_uv(organ, res):
    if ORGANS[organ].get('keep_uv'):   # the liver keeps its v42 xatlas unwrap (pipeline/uv42.py)
        J, V, F, UV, n0, dup = load_ct_liver(); w = work(organ)
        np.save(w / 'loV.npy', V); np.save(w / 'loF.npy', F); np.save(w / 'loUV.npy', UV)
        print(f'uv: kept the existing liver unwrap ({n0} vertices + {len(dup)} seam copies)', flush=True); return
    import xatlas
    J, P, F = load_low(organ)
    at = xatlas.Atlas(); at.add_mesh(P.astype(np.float32), F.astype(np.uint32))
    co = xatlas.ChartOptions(); co.max_iterations = 4; co.normal_deviation_weight = 2.0
    po = xatlas.PackOptions(); po.resolution = res; po.padding = 8; po.bilinear = True; po.blockAlign = True
    at.generate(co, po)
    vmap, ind, uv = at[0]; n = len(P); m = len(vmap)
    newidx = np.full(m, -1, np.int64); prim = np.full(n, -1, np.int64); dup = []
    for k in range(m):
        o = vmap[k]
        if prim[o] < 0: prim[o] = k; newidx[k] = o
        else: newidx[k] = n + len(dup); dup.append(o)
    dup = np.array(dup, np.int64); M = n + len(dup); assert M < 65536
    UV = np.zeros((M, 2), np.float64); UV[newidx] = uv
    F2 = newidx[ind].astype(np.int64)
    assert (np.concatenate([np.arange(n), dup])[F2] == F).all(), 'face order changed'
    V = np.concatenate([P, P[dup]])
    qs = J['ct']['qs']; d = J['ct']['viscera'][organ]
    d['pos'] = a64(np.round(V / qs).astype(np.int16)); d['idx'] = a64(F2.astype(np.uint16))
    d['uv'] = a64(np.round(np.clip(UV, 0, 1) * 65535).astype(np.uint16)); d['dup'] = a64(dup.astype(np.uint16)); d['n0'] = int(n)
    DATA.write_text(json.dumps(J, separators=(',', ':')))
    w = work(organ); np.save(w / 'loV.npy', V); np.save(w / 'loF.npy', F2); np.save(w / 'loUV.npy', UV)
    print(f'uv: {n} vertices → {M} ({len(dup)} seam copies), {at.chart_count} charts; wrote {DATA.name}', flush=True)


# ───────────────────────── high mesh ─────────────────────────
def subdiv(V, F):
    E = np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), 1)
    u, inv = np.unique(E, axis=0, return_inverse=True); inv = inv.ravel()
    n = len(V); V2 = np.concatenate([V, (V[u[:, 0]] + V[u[:, 1]]) / 2])
    a, b, c = inv[:len(F)] + n, inv[len(F):2 * len(F)] + n, inv[2 * len(F):] + n
    return V2, np.concatenate([np.stack([F[:, 0], a, c], 1), np.stack([a, F[:, 1], b], 1), np.stack([c, b, F[:, 2]], 1), np.stack([a, b, c], 1)])


def lap(V, F):
    import scipy.sparse as sp
    n = len(V); r = np.concatenate([F[:, 0], F[:, 1], F[:, 2], F[:, 1], F[:, 2], F[:, 0]]); c = np.concatenate([F[:, 1], F[:, 2], F[:, 0], F[:, 0], F[:, 1], F[:, 2]])
    A = sp.csr_matrix((np.ones(len(r)), (r, c)), shape=(n, n)); A.data[:] = 1; return sp.diags(1 / np.asarray(A.sum(1)).ravel()) @ A


def taubin(V, F, it, lam=0.5, mu=-0.53):
    W = lap(V, F)
    for _ in range(it): V = V + lam * (W @ V - V); V = V + mu * (W @ V - V)
    return V


def vnormals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); N = np.zeros_like(V)
    for k in range(3): np.add.at(N, F[:, k], fn)
    return N / np.linalg.norm(N, axis=1, keepdims=True)


def chunked(fn, X, n=400_000):
    return np.concatenate([fn(X[s:s + n]) for s in range(0, len(X), n)])


# pancreas relief (model units; 1 unit ≈ 70 mm). Shared by the high mesh and the compose stage so colour sits on the bumps.
PANC = dict(lob_f=12.5, lob_w=0.13, lob_d=0.0055, dome=0.0055, fine_f=36.0, fine_d=0.0014, und_f=3.5, und_d=0.0040)


def panc_fields(X):
    p = PANC
    L = worley_f2f1(X * p['lob_f'], seed=5)                      # ≈ 5–6 mm lobules; 0 on the septa
    Lf = worley_f2f1(X * p['fine_f'], seed=9)                    # ≈ 2 mm secondary lobulation
    und = fbm(X * p['und_f'], 3, seed=13)
    return L, Lf, und


def panc_height(X):
    p = PANC; L, Lf, und = panc_fields(X)
    sep = np.exp(-(L / p['lob_w']) ** 2); fsep = np.exp(-(Lf / 0.16) ** 2)
    return -p['lob_d'] * sep + p['dome'] * np.clip(L, 0, 0.6) / 0.6 - p['fine_d'] * fsep + p['und_d'] * und


# liver relief (v44, Task 9): contouring after tissue-liver-5 (broad undulation plus soft shallow creases), subcapsular
# veins very slightly raised along the same network the albedo darkens, and a slightly coarse capsular grain (~1.3 mm)
# after maleinternalorans3dsmodel25. No lobular cells (the v42 lobule speckle and detail cells read as blur at mid distance).
def liver_height(X):
    h = 0.0070 * fbm(X * 3.2, 4, seed=3) + 0.0050 * fbm(X * 1.4, 2, seed=4)            # contour: broad undulation
    # soft shallow creases: a few long, gently curving grooves (zero set of a warped low-frequency field), only where a
    # second field allows them, so they read as contour folds, not as a cellular network (v42's Worley creases did)
    wx = X + 0.12 * np.stack([fbm(X * 1.8, 2, seed=101), fbm(X * 1.8 + 5.3, 2, seed=102), fbm(X * 1.8 + 9.1, 2, seed=103)], -1)
    g = fbm(wx * 2.6, 3, seed=7); allow = np.clip((fbm(X * 1.1, 2, seed=8) + 0.05) / 0.35, 0, 1)
    h += -0.0022 * np.exp(-(g / 0.045) ** 2) * allow
    h += 0.0009 * liver_veins(X)                                                         # veins, faintly raised
    return h + 0.0017 * fbm(X * 52.0, 3, seed=11)                                        # coarse capsular grain


def stage_high(organ, cfg):
    w = work(organ); V = np.load(w / 'loV.npy'); F = np.load(w / 'loF.npy')
    J, P0, F0 = load_low(organ)                       # welded mesh (no seam copies) for the high surface
    Vh = taubin(P0, F0, 12 if organ == 'liver' else 4); Fh = F0
    for _ in range(cfg['subdiv']): Vh, Fh = subdiv(Vh, Fh)
    Vh = taubin(Vh, Fh, 20 if organ == 'liver' else 10); N = vnormals(Vh, Fh)
    h = chunked({'pancreas': panc_height, 'liver': liver_height}[organ], Vh)
    if organ == 'liver': h = h + falciform().fields(Vh, N)[3]          # v45: the falciform / coronary relief (falc45.py)
    Vh = Vh + N * h[:, None]
    # mean curvature (signed, per vertex): Laplacian displacement along the normal, normalised by the mean edge length
    W = lap(Vh, Fh); Nh = vnormals(Vh, Fh); H = ((W @ Vh - Vh) * Nh).sum(1)
    e = np.linalg.norm(Vh[Fh[:, 0]] - Vh[Fh[:, 1]], axis=1).mean(); H = H / (e * e)
    np.save(w / 'hiV.npy', Vh.astype(np.float32)); np.save(w / 'hiF.npy', Fh.astype(np.int32)); np.save(w / 'hiH.npy', H.astype(np.float32))
    print(f'high: {len(Vh)} vertices, {len(Fh)} faces; relief sd {h.std()*MM:.2f} mm', flush=True)


# ───────────────────────── Blender bakes ─────────────────────────
def stage_bake(organ, cfg):
    import bpy
    w = work(organ); R = cfg['res'][0]; r = cfg['lores']
    V = np.load(w / 'loV.npy'); F = np.load(w / 'loF.npy'); UV = np.load(w / 'loUV.npy')
    Vh = np.load(w / 'hiV.npy').astype(np.float64); Fh = np.load(w / 'hiF.npy'); H = np.load(w / 'hiH.npy')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
    sc.world = bpy.data.worlds.new('w')

    def mk(name, verts, faces, uv=None, col=None):
        me = bpy.data.meshes.new(name); me.from_pydata(verts.tolist(), [], faces.tolist()); me.validate(); me.update()
        li = np.array([l.vertex_index for l in me.loops])
        if uv is not None: ul = me.uv_layers.new(name='UV'); ul.data.foreach_set('uv', uv[li].ravel())
        if col is not None:
            ca = me.color_attributes.new('curv', 'FLOAT_COLOR', 'POINT'); c4 = np.ones((len(verts), 4), np.float32); c4[:, :3] = col[:, None]
            ca.data.foreach_set('color', c4.ravel())
        me.shade_smooth(); ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob

    lo = mk('lo', V, F, UV)
    k = np.clip(H / (np.percentile(np.abs(H), 98) + 1e-9), -1, 1) * 0.5 + 0.5
    hi = mk('hi', Vh, Fh, col=k)
    # low: image target; high: emission of the curvature colour (only read by the EMIT bake)
    ml = bpy.data.materials.new('lo'); ml.use_nodes = True; nt = ml.node_tree; lo.data.materials.append(ml)
    tn = nt.nodes.new('ShaderNodeTexImage')
    mh = bpy.data.materials.new('hi'); mh.use_nodes = True; hn = mh.node_tree; hi.data.materials.append(mh)
    em = hn.nodes.new('ShaderNodeEmission'); at = hn.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'curv'
    hn.links.new(at.outputs['Color'], em.inputs['Color']); hn.links.new(em.outputs['Emission'], hn.nodes['Material Output'].inputs['Surface'])

    def img(name, res, float_=False):
        im = bpy.data.images.new(name, res, res, alpha=False, float_buffer=float_); im.colorspace_settings.name = 'Non-Color'; return im

    only = [k for k in os.environ.get('BAKE_ONLY', '').split(',') if k]   # e.g. BAKE_ONLY=onrm: re-bake a subset

    def bake(kind, res, target=lo, float_=False, type_=None, sel=True, **kw):
        if only and kind not in only: return
        im = img(kind, res, float_); tn.image = im; nt.nodes.active = tn
        bpy.ops.object.select_all(action='DESELECT'); target.select_set(True); bpy.context.view_layer.objects.active = target
        if sel: hi.select_set(True); kw.update(use_selected_to_active=True, cage_extrusion=cfg['cage'], max_ray_distance=cfg['ray'])
        t = time.time(); bpy.ops.object.bake(type=type_ or kind.upper(), margin=16, margin_type='EXTEND', target='IMAGE_TEXTURES', **kw)
        px = np.array(im.pixels[:], np.float32).reshape(res, res, 4)[..., :3]
        np.save(w / f'bake_{kind}.npy', px.astype(np.float32 if float_ else np.float16)); print(f'bake {kind} {res}² {time.time()-t:.0f} s', flush=True)

    bake('normal', R, normal_space='TANGENT')
    bake('onrm', r, type_='NORMAL', normal_space='OBJECT')           # object-space normal (colour = n·0.5 + 0.5), for orientation-driven colour
    bake('curv', r, type_='EMIT')
    sc.cycles.samples = 64; sc.world.light_settings.distance = cfg['ao_dist']; bake('ao', r, type_='AO')
    sc.cycles.samples = 32; sc.world.light_settings.distance = cfg['cav_dist']; bake('cav', r, type_='AO')
    # thickness: the low mesh alone with its normals flipped, AO looking inward (rays that escape = thick)
    hi.hide_render = True
    import bmesh
    bm = bmesh.new(); bm.from_mesh(lo.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(lo.data); bm.free()
    sc.cycles.samples = 48; sc.world.light_settings.distance = cfg['thick_dist']; bake('thick', r, type_='AO', sel=False)
    bm = bmesh.new(); bm.from_mesh(lo.data); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(lo.data); bm.free()
    # position (object space) for 3D-continuous compose noise
    em2 = nt.nodes.new('ShaderNodeEmission'); tc = nt.nodes.new('ShaderNodeTexCoord')
    nt.links.new(tc.outputs['Object'], em2.inputs['Color']); nt.links.new(em2.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    sc.cycles.samples = 1; bake('pos', R, type_='EMIT', float_=True, sel=False)


# ───────────────────────── compose ─────────────────────────
def lin(h): return (np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)]) / 255.0) ** 2.2


def compose_pancreas(X, ao, cav, curv, thick):
    """pancreas: peach-orange lobules, paler yellow-tan septa (interlobular fat), warmer where thin; wet but not glassy"""
    L, Lf, und = panc_fields(X)
    sep = np.exp(-(L / PANC['lob_w']) ** 2); fsep = np.exp(-(Lf / 0.16) ** 2)
    cell = fbm(X * PANC['lob_f'] * 0.5, 2, seed=17)                    # lobule-to-lobule tone drift
    lob, fat, deep = lin('#E08E58'), lin('#EDB27A'), lin('#A85A32')
    col = lob[None] * (1 + 0.10 * cell)[:, None]
    col = col * (1 - 0.28 * sep)[:, None] + fat[None] * (0.28 * sep)[:, None]
    col = col * (1 - 0.06 * fsep)[:, None]
    col = col * (1 - 0.18 * (1 - cav))[:, None] + deep[None] * (0.18 * (1 - cav))[:, None]
    col = col * (0.62 + 0.38 * ao ** 0.8)[:, None]
    col = col * (1 + 0.06 * (thick - 0.5))[:, None]
    rough = np.clip(0.38 + 0.16 * sep + 0.10 * (1 - cav) - 0.05 * np.clip(curv - 0.5, 0, 1) + 0.04 * und, 0.22, 0.70)
    wet = np.clip(0.75 - 0.40 * sep - 0.5 * (1 - cav) + 0.15 * und, 0, 1)
    return np.clip(col, 0, 1), rough, wet


def liver_veins(x):
    w = x + 0.08 * np.stack([fbm(x * 2.5, 2, seed=61), fbm(x * 2.5 + 3.1, 2, seed=62), fbm(x * 2.5 + 7.7, 2, seed=63)], -1)
    r = 1 - np.abs(fbm(w * 2.2, 3, seed=67)) * 3.0; r2 = 1 - np.abs(fbm(w * 5.0, 2, seed=71)) * 3.2
    return np.maximum(np.clip((r - 0.80) / 0.2, 0, 1) ** 2, 0.5 * np.clip((r2 - 0.82) / 0.18, 0, 1) ** 2)


_FALC = None


def falciform():
    """v45: the falciform ligament's fan and coronary continuation, painted into the liver maps (pipeline/falc45.py)"""
    global _FALC
    if _FALC is None:
        from falc45 import Falciform; _FALC = Falciform()
    return _FALC


FALC_COL = '#DDCDAF'   # v45: pale cream / off-white fibrous tissue, clearly paler than the liver


LIVER_SUP, LIVER_INF = '#7A3B2E', '#5A2433'   # v44 (Task 8): browner diaphragmatic surface, deeper purple-red visceral surface


def compose_liver(X, ao, cav, curv, thick, onrm=None):
    """liver colour (v44): heterogeneous red-brown. The base colour blends from the superior / diaphragmatic surface
    (LIVER_SUP) to the inferior / visceral surface (LIVER_INF) by surface orientation (the texel's object-space normal,
    +y superior) plus low-frequency 3D noise, through a wide smoothstep, so there is no boundary. On top: patchy mottling,
    fine mottle, capsular veins, cavity and a light AO term (the page also occludes indirect light). v44 Task 9: no
    lobular speckle (the Worley 'lob' cells read as a blurred pattern at mid distance).
    Wetness also follows the baked curvature (drier on convex ridges and the thin inferior border)."""
    ev = lambda fn: chunked(fn, X, 1_000_000)
    sup, inf, dark = lin(LIVER_SUP), lin(LIVER_INF), lin('#2E1018')
    ny = onrm[:, 1] if onrm is not None else np.zeros(len(X))
    lf = ev(lambda x: fbm(x * 1.3, 3, seed=91))                                    # ~5 cm drift of the transition
    t = np.clip((ny + 0.50 * lf + 0.15 - (-0.55)) / (0.60 - (-0.55)), 0, 1); wgt = t * t * (3 - 2 * t)
    col = inf[None] * (1 - wgt)[:, None] + sup[None] * wgt[:, None]
    m2 = ev(lambda x: fbm(x * 6.0, 4, seed=33)); m3 = ev(lambda x: fbm(x * 30.0, 2, seed=45))
    vn = ev(liver_veins); wet = ev(lambda x: fbm(x * 2.2, 3, seed=81))
    col *= (1 + 0.09 * m2)[:, None]; col *= (1 + 0.05 * m3)[:, None]
    col = col * (1 - 0.24 * vn[:, None]) + dark * 0.24 * vn[:, None]                    # subcapsular veins (tissue-liver-5)
    col *= (0.72 + 0.28 * ao ** 0.8)[:, None]; col *= (0.85 + 0.15 * cav)[:, None]
    rough = np.clip(0.40 - 0.126 * np.clip(wet * 1.8 + 0.1, -1, 1) - 0.10 * (1 - cav) + 0.05 * m3, 0.16, 0.62)
    wetn = np.clip(0.55 + 0.9 * wet + 0.4 * (1 - ao) - 0.25 * np.clip(curv - 0.6, 0, 1) - 0.15 * (1 - thick), 0, 1)
    # v45 (Task 7): falciform band, fan and coronary ligament: pale cream fibrous tissue with fine striations along the
    # fibres; the thin fan membrane lets a little of the liver show through; slightly less glossy than the capsule
    fm, fk, fb, _ = falciform().fields(X, onrm)
    k = fm > 0
    if k.any():
        lc = lin(FALC_COL)[None] * (1 + 0.11 * fb[k] + 0.05 * m2[k])[:, None] * (0.78 + 0.22 * ao[k] ** 0.8)[:, None]
        lc = lc * (1 - 0.08 * (1 - fm[k]))[:, None] + lin('#C89A86')[None] * (0.08 * (1 - fm[k]))[:, None]   # translucent edges
        a = fm[k] * np.where(fk[k] == 1, 0.78, 0.92)
        col[k] = col[k] * (1 - a)[:, None] + lc * a[:, None]
        rough[k] = rough[k] * (1 - fm[k]) + (0.46 + 0.05 * fb[k]) * fm[k]; wetn[k] = wetn[k] * (1 - 0.45 * fm[k])
    return np.clip(col, 0, 1), rough, wetn


def stage_compose(organ, cfg):
    from PIL import Image
    from scipy.ndimage import distance_transform_edt
    w = work(organ); R = cfg['res'][0]
    pos = np.load(w / 'bake_pos.npy').astype(np.float32); nrm = np.load(w / 'bake_normal.npy').astype(np.float32)
    from scipy.ndimage import zoom
    g = {k: np.load(w / f'bake_{k}.npy').astype(np.float32)[..., 0] for k in ('ao', 'cav', 'curv', 'thick')}
    g = {k: (zoom(v, R / v.shape[0], order=1) if v.shape[0] != R else v) for k, v in g.items()}
    on = None
    if (w / 'bake_onrm.npy').exists():
        on = np.load(w / 'bake_onrm.npy').astype(np.float32) * 2 - 1
        if on.shape[0] != R: on = zoom(on, (R / on.shape[0], R / on.shape[0], 1), order=1)
    cov = np.abs(pos).sum(-1) > 1e-6
    n = nrm * 2 - 1; bad = cov & ((n[..., 2] < 0.35) | (np.linalg.norm(n, axis=-1) < 0.6))
    print(f'compose: {cov.sum()} texels, {100*bad.sum()/cov.sum():.3f}% implausible normals repaired', flush=True)
    n[bad] = [0, 0, 1]; n /= np.linalg.norm(n, axis=-1, keepdims=True)
    X = pos[cov].astype(np.float64)
    th = g['thick'][cov]; th = (th - np.percentile(th, 2)) / (np.percentile(th, 98) - np.percentile(th, 2) + 1e-6)
    args = (X, g['ao'][cov], g['cav'][cov], g['curv'][cov], np.clip(th, 0, 1))
    col, rough, wet = compose_pancreas(*args) if organ == 'pancreas' else compose_liver(*args, onrm=on[cov] if on is not None else None)
    mean = col.mean(0); print('compose: mean albedo (linear)', mean.round(4), 'sRGB #%02X%02X%02X' % tuple((mean ** (1 / 2.2) * 255 + 0.5).astype(int)), flush=True)
    A = np.zeros((R, R, 3), np.float32); A[cov] = col
    ORM = np.zeros((R, R, 3), np.float32); ORM[cov] = np.stack([g['ao'][cov], rough, wet], 1)
    _, ind = distance_transform_edt(~cov, return_indices=True)            # bleed charts into the gutters (no mip halos)
    A = A[ind[0], ind[1]]; ORM = ORM[ind[0], ind[1]]; n[~cov] = n[ind[0], ind[1]][~cov]
    out = {}
    for r in cfg['res']:
        f = R // r
        ds = (lambda a: a.reshape(r, f, r, f, a.shape[-1]).mean((1, 3))) if f > 1 else (lambda a: a)
        nn = ds(n); nn /= np.linalg.norm(nn, axis=-1, keepdims=True)
        tag = f'{r // 1024}k'
        files = {f'{organ}44_albedo_{tag}.webp': (np.clip(ds(A), 0, 1) ** (1 / 2.2), 90),
                 f'{organ}44_normal_{tag}.webp': (nn * 0.5 + 0.5, 88), f'{organ}44_orm_{tag}.webp': (ds(ORM), 86)}
        for name, (a, q) in files.items():
            Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)[::-1]).save(ROOT / 'assets' / name, quality=q, method=6)
            out[name] = (ROOT / 'assets' / name).stat().st_size // 1024
    print('compose:', ', '.join(f'{k} {v} KB' for k, v in out.items()), flush=True)


def stage_detail(organ, cfg):
    """liver close-range micro-texture (v44, replaces liver42_detail.png's lobular Worley cells): 1024² tileable, sampled
    triplanar by the page's skin shader at 3.9 / 9 repeats per unit and faded out by screen footprint, so it only shows up
    close. R: fine capsular grain (isotropic 1/f noise with sparse soft pits, ~0.2–0.6 mm), G: mid grain for the bump,
    B: micro mottle. No cells, no ridges — nothing that reads as a pattern at mid distance."""
    from PIL import Image
    D = 1024; rng = np.random.default_rng(44)
    f = np.fft.fftfreq(D); k = np.hypot(*np.meshgrid(f, f)); k[0, 0] = 1

    def per(beta, lo=0.0, hi=1.0, seed=0):
        w = np.random.default_rng(seed).standard_normal((D, D)); band = (k >= lo * 0.5) & (k <= hi * 0.5)
        s = np.real(np.fft.ifft2(np.fft.fft2(w) / k ** beta * band)); return (s - s.mean()) / s.std()
    grain = per(0.9, 0.02, 1.0, 1)
    pits = np.zeros((D, D)); yy, xx = np.mgrid[0:D, 0:D]
    for _ in range(900):                                   # sparse soft pits (capsular micro-dimpling), periodic
        cx, cy, r = rng.random() * D, rng.random() * D, 2 + rng.random() * 4
        dx = (xx - cx + D / 2) % D - D / 2; dy = (yy - cy + D / 2) % D - D / 2
        m = (np.abs(dx) < 4 * r) & (np.abs(dy) < 4 * r); pits[m] -= np.exp(-(dx[m] ** 2 + dy[m] ** 2) / (r * r))
    R = np.clip(0.55 + 0.16 * grain + 0.22 * pits, 0, 1)
    G = np.clip(0.5 + 0.20 * per(1.1, 0.0, 0.25, 2), 0, 1)
    B = np.clip(0.5 + 0.14 * per(0.8, 0.0, 0.6, 3), 0, 1)
    img = np.stack([R, G, B], -1)                                   # lossy WebP: the grain is noise (a PNG was 2.7 MB)
    Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGB').save(ROOT / 'assets' / f'{organ}44_micro.webp', quality=90, method=6)
    print('detail:', f'{organ}44_micro.webp', (ROOT / 'assets' / f'{organ}44_micro.webp').stat().st_size // 1024, 'KB', flush=True)


if __name__ == '__main__':
    organ = sys.argv[1]; cfg = ORGANS[organ]
    stages = ['uv', 'high', 'bake', 'compose']
    if '--stage' in sys.argv: stages = sys.argv[sys.argv.index('--stage') + 1].split(',')
    for s in stages:
        t = time.time()
        {'uv': lambda: stage_uv(organ, cfg['res'][0]), 'high': lambda: stage_high(organ, cfg), 'bake': lambda: stage_bake(organ, cfg),
         'compose': lambda: stage_compose(organ, cfg), 'detail': lambda: stage_detail(organ, cfg)}[s]()
        print(f'[{s}] {time.time()-t:.0f} s', flush=True)
