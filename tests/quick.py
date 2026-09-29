#!/usr/bin/env python3
"""Quick interface check (the build plan's "harness --quick"): builds dist/, boots the atlas at desktop 1440×900 and
phone 390×844, visits every dock tab and each HARNESS_SHOTS state, saves tests/out/quick_*.png and fails on any
console error or page error.

    python3 tests/quick.py            # build + check
    python3 tests/quick.py --nobuild
"""
import asyncio, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / 'tests'))
from harness import Atlas

OUT = ROOT / 'tests' / 'out'
TABS = "(t)=>{ const b=document.getElementById('tab-'+t); if(b) b.click(); return !!b; }"
# Extra interface states: (name, width, height, js run in the page before the screenshot)
HARNESS_SHOTS = [
    ('pin_layers_clinical_1440', 1440, 900, "()=>{ const d=window.__atlas.dock; if(!d) return 'no dock api'; d.unpinAll&&d.unpinAll(); d.pin('layers'); document.getElementById('tab-clinical').click(); return d.state(); }"),
    ('pin_layers_clinical_1280', 1280, 800, "()=>{ const d=window.__atlas.dock; if(!d) return 'no dock api'; d.unpinAll&&d.unpinAll(); d.pin('layers'); d.pin('clinical'); return d.state(); }"),
]
IGNORE = ('fonts.g', 'ERR_', 'GL Driver')


async def run(w, h, name):
    bad = []
    async with Atlas(ROOT / 'dist', width=w, height=h, settle_ms=1200) as a:
        p = a.page
        for t in ('explore', 'layers', 'clinical', 'learn'):
            await p.evaluate(TABS, t); await p.wait_for_timeout(400)
            await p.screenshot(path=str(OUT / f'quick_{name}_{t}.png'))
        await p.evaluate(TABS, 'explore')
        bad += [e for e in a.errors if not any(k in e for k in IGNORE)]
    return bad


async def shots():
    bad = []
    for name, w, h, js in HARNESS_SHOTS:
        async with Atlas(ROOT / 'dist', width=w, height=h, settle_ms=1200) as a:
            r = await a.page.evaluate(js); await a.page.wait_for_timeout(800)
            await a.page.screenshot(path=str(OUT / f'quick_{name}.png')); print(f'  {name}: {r}')
            bad += [e for e in a.errors if not any(k in e for k in IGNORE)]
    return bad


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if '--nobuild' not in sys.argv:
        import build; build.build()
    errs = []
    for w, h, n in ((1440, 900, 'desktop'), (390, 844, 'phone')):
        e = await run(w, h, n); print(f'{n} {w}x{h}: {len(e)} console errors'); errs += e
    if '--noshots' not in sys.argv:
        errs += await shots()
    for e in errs[:20]: print('  ', e[:300])
    print('QUICK', 'FAIL' if errs else 'PASS'); sys.exit(1 if errs else 0)

asyncio.run(main())
