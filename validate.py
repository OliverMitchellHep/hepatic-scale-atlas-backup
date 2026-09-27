#!/usr/bin/env python3
"""Build the atlas and check it. Exit code 0 = every hard check passed.

    python3 validate.py                 # full run: build, static checks, headless load, census, budgets, screenshots
    python3 validate.py --static        # build + static checks only (seconds)
    python3 validate.py --census        # also write each structure's layer/tier back into data/registry.json
    python3 validate.py --rebaseline    # accept the current screenshots as the new baseline (after an intended visual change)

Hard checks (fail the run):
  registry      unique ids and names, id format, non-empty text
  size          dist/ and index.html under budget
  load          page boots headless with no JS errors (external font requests excepted)
  coverage      every clickable name found in the built scene has callout text (registry or a dynamic pattern)
  draw budget   draw calls / triangles with every default layer plus the context structures, under budget
  idle          render-on-demand: the page stops redrawing when nothing changes
  spine axis    the vertebral-body centreline is vertical in world space (X/Z drift < 2 mm over its length)
  screenshots   fixed views match tests/baseline/ within tolerance
Warnings (reported, do not fail): registry entries not found in the scene (pathology-only or per-face names the census
cannot reach), citations to guideline versions known to be superseded.

Report: tests/out/report.md, screenshots and diff images in tests/out/.
"""
import asyncio, json, re, sys, time
from pathlib import Path
import build

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'tests/out'
BASE = ROOT / 'tests/baseline'
BUDGET = {'dist_mb': 9.0, 'index_mb': 4.0, 'calls': 420, 'triangles_k': 2600, 'idle_draws_per_10_frames': 1}
# screenshot tolerance, calibrated on two v42 runs of the same build (SwiftShader, same machine)
TOL = {'mean': 0.6, 'frac_over_24': 0.003}
# guideline versions that the project spec marks as superseded (Sept 2026). Update when the spec changes.
SUPERSEDED = {r'\bBaveno VII\b(?!I)': 'Baveno VIII (J Hepatol 2026)', r'EASL vascular[^.]{0,20}2016': 'EASL vascular CPG 2025',
              r'\bBCLC 2022\b': 'BCLC 2026 update'}
IGNORED_ERRORS = ('fonts.googleapis', 'fonts.gstatic', 'ERR_TUNNEL_CONNECTION_FAILED', 'ERR_NAME_NOT_RESOLVED')

results, warnings, notes = [], [], []
def check(name, ok, detail=''):
    results.append((name, bool(ok), detail)); print(('PASS ' if ok else 'FAIL ') + name + (f' — {detail}' if detail else ''), flush=True)


def static_checks():
    reg = json.loads((ROOT / 'data/registry.json').read_text())['structures']
    ids = [e['id'] for e in reg]; names = [e['name'] for e in reg]
    bad = [e['id'] for e in reg if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', e['id']) or not e['name'].strip() or not e['info'].strip()]
    check('registry', len(set(ids)) == len(ids) and len(set(names)) == len(names) and not bad,
          f'{len(reg)} structures' + (f'; malformed: {bad[:5]}' if bad else '') +
          (f'; duplicate ids/names' if len(set(ids)) != len(ids) or len(set(names)) != len(names) else ''))
    for pat, new in SUPERSEDED.items():
        hits = [e['id'] for e in reg if re.search(pat, e['info'])]
        if hits: warnings.append(f'{len(hits)} entries cite a superseded guideline ({pat.strip(chr(92)+"b")} → {new}): {", ".join(hits[:6])}{" …" if len(hits) > 6 else ""}')
    dist = ROOT / 'dist'
    total = sum(p.stat().st_size for p in dist.rglob('*') if p.is_file()) / 1e6
    idx = (dist / 'index.html').stat().st_size / 1e6
    check('size', total <= BUDGET['dist_mb'] and idx <= BUDGET['index_mb'],
          f'dist {total:.2f} MB (≤ {BUDGET["dist_mb"]}), index.html {idx:.2f} MB (≤ {BUDGET["index_mb"]})')
    return reg


CENSUS_JS = r"""async ()=>{
  const A=window.__atlas, T=A.THREE, out={};
  const add=(n,tier,layer)=>{ if(!n||typeof n!=='string') return; (out[n]=out[n]||{tiers:new Set(),layers:new Set()}); out[n].tiers.add(tier); if(layer) out[n].layers.add(layer); };
  try{ if(A.ctxLoad) await A.ctxLoad(); }catch(e){}  try{ if(A.diaLoad) await A.diaLoad(); }catch(e){}
  for(let i=0;i<A.tiers.length;i++){
    A.ensure(i); const t=A.tiers[i], inner=t.inner; if(!inner) continue;
    const L=inner.userData&&inner.userData.L, key=new Map(); if(L) for(const k in L) if(L[k]&&L[k].isObject3D) key.set(L[k],k);
    inner.updateMatrixWorld(true);
    inner.traverse(o=>{
      let layer=null; for(let n=o;n&&n!==inner;n=n.parent){ if(key.has(n)){ layer=key.get(n); break; } }
      const u=o.userData||{};
      if(u.pick) add(u.pick,i,layer);
      if(u.pickFace&&o.geometry){ const g=o.geometry, nf=(g.index?g.index.count:g.attributes.position.count)/3;
        for(let f=0;f<nf;f++){ let n; try{ n=u.pickFace(f); }catch(e){} add(n,i,layer); } }
      if(u.pickBy&&o.isInstancedMesh){ for(let k=0;k<o.count;k++){ let n; try{ n=u.pickBy(k); }catch(e){} add(n,i,layer); } }
      if(u.pickAt&&o.geometry){ const p=o.geometry.attributes.position, v=new T.Vector3(), step=Math.max(1,Math.floor(p.count/400));
        for(let k=0;k<p.count;k+=step){ v.fromBufferAttribute(p,k); o.localToWorld(v); t.group.worldToLocal(v); let n; try{ n=u.pickAt(v.clone()); }catch(e){} add(n,i,layer); } }
      if(u.segmentPick){ for(const s of Object.values(A.SEG||{})) add('Segment '+s,i,layer); add('Falciform ligament',i,layer); }
    });
  }
  const res={}; for(const n in out) res[n]={tiers:[...out[n].tiers].sort(),layers:[...out[n].layers].sort(),described:!!A.info(n)};
  return res; }"""


async def browser_checks(reg, update_census, rebaseline):
    sys.path.insert(0, str(ROOT / 'tests'))
    from harness import Atlas, VIEWS
    OUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    async with Atlas(ROOT / 'dist') as a:
        boot = time.time() - t0
        page = a.page
        # screenshots first: the census below builds every tier and loads context meshes, which changes scene state
        shots_ok, lines = True, []
        from PIL import Image, ImageChops
        import numpy as np
        for v in VIEWS:
            cur = OUT / f'{v["name"]}.png'; await a.shoot(v, cur)
            base = BASE / f'{v["name"]}.png'
            if rebaseline or not base.exists():
                BASE.mkdir(parents=True, exist_ok=True); base.write_bytes(cur.read_bytes()); lines.append(f'{v["name"]}: baseline written'); continue
            A_ = np.asarray(Image.open(base).convert('RGB'), np.int16); B_ = np.asarray(Image.open(cur).convert('RGB'), np.int16)
            if A_.shape != B_.shape: shots_ok = False; lines.append(f'{v["name"]}: size changed'); continue
            d = np.abs(A_ - B_).max(-1); mean = float(np.abs(A_ - B_).mean()); frac = float((d > 24).mean())
            ok = mean <= TOL['mean'] and frac <= TOL['frac_over_24']; shots_ok &= ok
            lines.append(f'{v["name"]}: mean {mean:.2f}, {100*frac:.2f}% px > 24' + ('' if ok else '  ← over tolerance'))
            Image.fromarray(np.clip(d * 4, 0, 255).astype(np.uint8)).save(OUT / f'{v["name"]}_diff.png')
        check('screenshots', shots_ok, '; '.join(lines))
        # idle: with the flow animation off (particles are genuine motion and keep the scene drawing), a still scene
        # must stop issuing WebGL draws. Counted in frames, not seconds, because SwiftShader frames take seconds here.
        idle = await page.evaluate("""async()=>{ const A=window.__atlas; const f0=A.state.flow, i0=A.ROD.idle; A.state.flow=false; A.ROD.idle=1e9;
            const raf=()=>new Promise(r=>requestAnimationFrame(()=>r()));
            for(let i=0;i<4;i++) await raf(); const d0=A.ROD.drawn, s0=A.ROD.skipped; for(let i=0;i<10;i++) await raf();
            const r={drawn:A.ROD.drawn-d0, skipped:A.ROD.skipped-s0}; A.state.flow=f0; A.ROD.idle=i0; for(let i=0;i<3;i++) await raf(); return r; }""")
        check('idle', idle['drawn'] <= 1 and idle['skipped'] >= 8,
              f'{idle["drawn"]} WebGL draws in 10 still frames ({idle["skipped"]} skipped); flow animation on = continuous drawing, by design')
        # draw budget, measured in the last screenshot view (all default layers plus ribcage and diaphragm: the heaviest scene)
        fs = await page.evaluate('window.__atlas.frameStats()')
        check('draw budget', fs['calls'] <= BUDGET['calls'] and fs['triangles'] / 1000 <= BUDGET['triangles_k'],
              f'{fs["calls"]} calls (≤ {BUDGET["calls"]}), {fs["triangles"]/1000:.0f}k triangles (≤ {BUDGET["triangles_k"]}k)')
        # spine: the scene root is rotated so the vertebral-body centreline is vertical (world Y) within 2 mm over its length
        sp = await page.evaluate("async()=>{ const A=window.__atlas; await A.ctxLoad(); return A.spineCheck(); }")
        check('spine axis', sp and max(abs(sp['dxMm']), abs(sp['dzMm'])) < 2.0,
              f'{sp["n"]} vertebral bodies, centreline {sp["lengthMm"]:.0f} mm, drift from vertical x {sp["dxMm"]:+.2f} mm, z {sp["dzMm"]:+.2f} mm (< 2)' if sp else 'context mesh not loaded')
        # census
        census = await page.evaluate(CENSUS_JS)
        undescribed = sorted(n for n, c in census.items() if not c['described'])
        check('coverage', not undescribed, f'{len(census)} clickable names in the built scene' +
              (f'; no callout text for: {", ".join(undescribed[:8])}' if undescribed else ''))
        names = {e['name'] for e in reg}
        unseen = [e['id'] for e in reg if e['name'] not in census]
        if unseen: warnings.append(f'{len(unseen)} registry entries not reached by the census (pathology-only, procedure or dynamic names): {", ".join(unseen[:10])} …')
        dyn = sorted(n for n in census if n not in names)
        if dyn: notes.append(f'{len(dyn)} clickable names are described by dynamic patterns in info() rather than the registry (e.g. {", ".join(dyn[:4])})')
        if update_census:
            p = ROOT / 'data/registry.json'; R = json.loads(p.read_text())
            for e in R['structures']:
                c = census.get(e['name'])
                e['tier'] = c['tiers'] if c else []; e['layer'] = c['layers'] if c else []
            p.write_text(json.dumps(R, indent=1, ensure_ascii=False) + '\n'); notes.append('registry.json: tier/layer refreshed from the census')
        errs = [e for e in a.errors if (e.startswith('error') or e.startswith('pageerror')) and not any(k in e for k in IGNORED_ERRORS)]
        check('load', not errs, f'boot {boot:.0f} s' + (f'; errors: {errs[:3]}' if errs else ''))
        warns = [e for e in a.errors if e.startswith('warning')]
        if warns: warnings.append('console warnings: ' + '; '.join(w[:120] for w in warns[:5]))


def main():
    args = sys.argv[1:]
    build.build()
    reg = static_checks()
    if '--static' not in args:
        asyncio.run(browser_checks(reg, '--census' in args, '--rebaseline' in args))
    OUT.mkdir(parents=True, exist_ok=True)
    ok = all(r[1] for r in results)
    md = ['# Validation report', '', f'**{"PASS" if ok else "FAIL"}** — {time.strftime("%Y-%m-%d %H:%M")}', '', '| Check | Result | Detail |', '|---|---|---|']
    md += [f'| {n} | {"pass" if o else "**FAIL**"} | {d} |' for n, o, d in results]
    if warnings: md += ['', '## Warnings'] + [f'- {w}' for w in warnings]
    if notes: md += ['', '## Notes'] + [f'- {n}' for n in notes]
    (OUT / 'report.md').write_text('\n'.join(md) + '\n')
    for w in warnings: print('WARN ' + w)
    print('\nOVERALL ' + ('PASS' if ok else 'FAIL'))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
