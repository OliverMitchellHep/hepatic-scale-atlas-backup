#!/usr/bin/env python3
"""Review screenshots for one task: four fixed views of the built page, saved to review/<label>/.

    python3 tests/review.py 3            # build dist/, capture review/3/{anterior,right_lateral,inferior,pc_biopsy}.png
    python3 tests/review.py 4 --extra    # also the pancreas / liver close-ups (--only-extra: just those)

Views use the page's own presets where it has them (Reset view for the anterior, the biopsy card's pcView for the
percutaneous view); the lateral and inferior views orbit the reset target at the reset distance, in world space, so
they show the scene as a user sees it after orienting the model (unlike tests/harness.py VIEWS, which are model frame).
"""
import asyncio, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / 'tests'))
import build
from harness import Atlas

HIDE = "#topbar,#rail,#layerbar,#simbar,#hud,#panel,#anno,#vignette,#toast,#intro,#coach,#mhint,#boot,#bx,#hvpg{display:none!important}"

# world-space orbit directions about the reset target (world +x = viewer's right = patient's left)
ORBIT = {'anterior': None, 'right_lateral': [-1, 0.0, 0.0], 'inferior': [0, -0.80, 0.60]}
EXTRA = {
    'pancreas_ant': {'t': [0.55, -0.55, -0.35], 'dir': [0, -0.05, 1], 'd': 3.4,
                     'layers': {'parenchyma': 'off', 'stomach': 'ghost', 'portal': 'on', 'artery': 'on', 'hepaticVein': 'off', 'biliary': 'off'}},
    'pancreas_inf': {'t': [0.55, -0.55, -0.35], 'dir': [0, -1, 0.25], 'd': 3.4,
                     'layers': {'parenchyma': 'off', 'stomach': 'ghost', 'portal': 'on', 'artery': 'on', 'hepaticVein': 'off', 'biliary': 'off'}},
    'pancreas_sup': {'t': [0.55, -0.55, -0.05], 'dir': [0, 1, 0.18], 'd': 3.6,
                     'layers': {'parenchyma': 'off', 'stomach': 'ghost', 'portal': 'on', 'artery': 'on', 'hepaticVein': 'off', 'biliary': 'off', 'esophagus': 'off'}},
    'pancreas_close': {'t': [0.80, -0.46, 0.25], 'dir': [0.1, 0.15, 1], 'd': 1.3, 'layers': {'parenchyma': 'off', 'stomach': 'off', 'esophagus': 'off'}},
    'falciform_ant': {'t': [-0.30, 0.05, 0.75], 'dir': [0.05, 0.12, 1], 'd': 2.3, 'layers': {'stomach': 'off', 'esophagus': 'off', 'duodenum': 'off', 'pancreas': 'off', 'spleen': 'off', 'kidneys': 'off'}},
    'falciform_obl': {'t': [-0.30, 0.05, 0.75], 'dir': [0.75, -0.10, 1], 'd': 1.4, 'layers': {'stomach': 'off', 'esophagus': 'off', 'duodenum': 'off', 'pancreas': 'off', 'spleen': 'off', 'kidneys': 'off'}},
    'liver_close': {'t': [-0.75, 0.25, 0.55], 'dir': [-0.15, 0.25, 1], 'd': 1.25, 'layers': {}},
}


async def settle(page, ms=2500):
    await page.wait_for_timeout(ms)
    await page.evaluate("async()=>{ const A=window.__atlas; if(A.forceRamps) A.forceRamps(); A.PERF.lastMoveT=-1e9; if(A.ROD) A.ROD.last=performance.now();"
                        " for(let i=0;i<8;i++) await new Promise(r=>requestAnimationFrame(()=>r())); }")
    await page.wait_for_timeout(500)


async def main(label, extra, only_extra=False):
    build.build()
    out = ROOT / 'review' / label; out.mkdir(parents=True, exist_ok=True)
    async with Atlas(ROOT / 'dist') as a:
        p = a.page
        await p.add_style_tag(content=HIDE)
        for name, d in ({} if only_extra else ORBIT).items():
            await p.evaluate("""(d)=>{ const A=window.__atlas; Object.assign(A.state.layers, A.LAYER_DEFAULTS); A.applyModes();
                document.getElementById('btn-reset').click(); A.controls.update();
                if(d){ const t=A.controls.target, r=A.camera.position.distanceTo(t);
                  A.camera.position.copy(t).addScaledVector(new A.THREE.Vector3(...d).normalize(), r); A.camera.lookAt(t); A.controls.update(); }
                A.PERF.lastMoveT=-1e9; }""", d)
            await settle(p); await p.screenshot(path=str(out / f'{name}.png'), timeout=180000); print('saved', name, flush=True)
        # percutaneous biopsy: the procedure card's own camera (pcView), ribcage context loaded
        if not only_extra:
          await p.evaluate("async()=>{ const A=window.__atlas; Object.assign(A.state.layers, A.LAYER_DEFAULTS); A.applyModes(); await A.ctxLoad(); }")
          await p.evaluate("(()=>{document.getElementById('bx-pc').click(); const A=window.__atlas; A.BX.stage=2; A.BX.t=0.95; A.bxPanel(); A.pcView(); A.PERF.lastMoveT=-1e9;})()")
          await settle(p, 4000); await p.screenshot(path=str(out / 'pc_biopsy.png'), timeout=180000); print('saved pc_biopsy', flush=True)
          await p.evaluate("document.getElementById('bx-x').click()")
        if extra:
            for name, v in EXTRA.items():
                await p.evaluate("""(v)=>{ const A=window.__atlas, T=A.THREE; Object.assign(A.state.layers, A.LAYER_DEFAULTS, v.layers); A.applyModes();
                    const inner=A.tiers[0].inner; inner.updateMatrixWorld(true); const sc=new T.Vector3(); inner.getWorldScale(sc);
                    const t=inner.localToWorld(new T.Vector3(...v.t)), d=new T.Vector3(...v.dir).normalize().transformDirection(inner.matrixWorld);
                    A.controls.target.copy(t); A.camera.position.copy(t).addScaledVector(d,v.d*sc.x); A.camera.lookAt(t); A.controls.update(); A.PERF.lastMoveT=-1e9; }""", v)
                await settle(p); await p.screenshot(path=str(out / f'{name}.png'), timeout=180000); print('saved', name, flush=True)
        errs = [e for e in a.errors if 'fonts.g' not in e and 'ERR_' not in e]
        if errs: print('console:', *errs[:6], sep='\n  ')


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1], '--extra' in sys.argv or '--only-extra' in sys.argv, '--only-extra' in sys.argv))
