"""Shared headless-browser harness: serves a built site folder and opens the atlas in Chromium (SwiftShader WebGL).

    async with Atlas('dist') as a:        # boots the page, intro suppressed, camera lock on
        await a.page.evaluate(...)        # window.__atlas is the page's test API
        a.errors                          # console errors/warnings and page errors so far
"""
import asyncio, functools, http.server, os, socket, threading
from pathlib import Path
from playwright.async_api import async_playwright

LIVER_ONLY = {'portal': 'off', 'artery': 'off', 'hepaticVein': 'off', 'biliary': 'off', 'stomach': 'off', 'esophagus': 'off',
              'duodenum': 'off', 'pancreas': 'off', 'spleen': 'off', 'kidneys': 'off', 'viscera': False, 'ribcage': 'off', 'diaphragm': 'off'}

# Fixed views for regression screenshots (model frame: +x patient left, +y superior, +z anterior).
VIEWS = [
    {'name': 'liver_ant', 't': [-0.2, 0.05, 0.2], 'dir': [0, 0.05, 1], 'd': 4.6},
    {'name': 'liver_inf', 't': [-0.2, -0.2, 0.1], 'dir': [0.0, -0.85, 0.55], 'd': 4.6},
    {'name': 'liver_close', 't': [-0.75, 0.25, 0.55], 'dir': [-0.15, 0.25, 1], 'd': 1.25},
    {'name': 'all_ant', 't': [0.25, -0.35, 0.1], 'dir': [0, 0.05, 1], 'd': 5.2, 'layers': 'defaults'},
    {'name': 'context_ant', 't': [0.2, -0.2, 0.2], 'dir': [0.1, 0.1, 1], 'd': 8.5,
     'layers': {'ribcage': 'on', 'diaphragm': 'ghost'}, 'pre': 'await Promise.all([A.ctxLoad&&A.ctxLoad(), A.diaLoad&&A.diaLoad()])'},
]


def _free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


class Atlas:
    def __init__(self, site, width=1440, height=900, settle_ms=3000):
        self.site = str(Path(site).resolve()); self.w, self.h, self.settle = width, height, settle_ms
        self.errors = []

    async def __aenter__(self):
        self.port = _free_port()
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=self.site)
        http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
        self.httpd = http.server.ThreadingHTTPServer(('127.0.0.1', self.port), handler)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader',
                                                           '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        self.page = await self.browser.new_page(viewport={'width': self.w, 'height': self.h})
        self.page.on('console', lambda m: self.errors.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        self.page.on('pageerror', lambda e: self.errors.append(f'pageerror: {e}'))
        # web fonts are the page's only external requests; stub them so a proxy or offline runner cannot fail the load check
        await self.page.route(lambda u: 'fonts.googleapis' in u or 'fonts.gstatic' in u, lambda r: r.fulfill(status=200, body='', content_type='text/css'))
        await self.page.add_init_script("try{localStorage.setItem('hsa-intro-seen','1');localStorage.setItem('hsa-intro-seen-v50','1')}catch(e){}; window.__camLock=true;")
        await self.page.goto(f'http://127.0.0.1:{self.port}/index.html')
        await self.page.wait_for_function("document.getElementById('boot')&&document.getElementById('boot').classList.contains('gone')",
                                          timeout=300000)
        # desktop liver maps load after boot; wait for them (or give up after 60 s and let the diff catch it)
        try: await self.page.wait_for_function("window.__atlas&&window.__atlas.LIVER_TEX&&window.__atlas.LIVER_TEX.ready", timeout=60000)
        except Exception: self.errors.append('warning: liver maps not ready after 60 s')
        # v45: the organ map sets (stomach, duodenum, oesophagus, spleen, pancreas, both kidneys) load after boot too; v46: + the surface-vessel tile (vessels51 since v51)
        try: await self.page.wait_for_function("window.__atlas&&Object.keys(window.__atlas.ORG_TEX).length>=8", timeout=120000)
        except Exception: self.errors.append('warning: organ maps not all ready after 120 s')
        await self.page.wait_for_timeout(self.settle)
        return self

    async def __aexit__(self, *a):
        await self.browser.close(); await self.pw.stop(); self.httpd.shutdown()

    async def shoot(self, view, path):
        """Pose a fixed camera (model frame), set layers, wait for the scene to settle, save a PNG."""
        await self.page.add_style_tag(content="#topbar,#rail,#layerbar,#simbar,#hud,#panel,#anno,#vignette,#toast,#intro,#coach,#mhint,#boot{display:none!important}")
        await self.page.evaluate("""async ([s,lay,liver])=>{ const A=window.__atlas, T=A.THREE;
            Object.assign(A.state.layers, A.LAYER_DEFAULTS);
            if(lay!=='defaults') Object.assign(A.state.layers, liver, lay||{});
            if(s.pre) await eval('(async()=>{'+s.pre+'})()');
            A.applyModes();
            const inner=A.tiers[0].inner; inner.updateMatrixWorld(true); const sc=new T.Vector3(); inner.getWorldScale(sc);
            const t=inner.localToWorld(new T.Vector3(...s.t)), d=new T.Vector3(...s.dir).normalize().transformDirection(inner.matrixWorld);
            A.controls.target.copy(t); A.camera.position.copy(t).addScaledVector(d,s.d*sc.x); A.camera.lookAt(t); A.controls.update();
            A.camera.clearViewOffset(); A.camera.updateProjectionMatrix(); A.PERF.lastMoveT=-1e9; }""",
                                 [view, view.get('layers'), LIVER_ONLY])
        # settle: wall time for eased effects (AO fade), then a fixed number of rendered frames, so the capture
        # does not depend on how fast this machine renders
        await self.page.wait_for_timeout(view.get('wait', 2500))
        await self.page.evaluate("async()=>{ const A=window.__atlas; if(A.forceRamps) A.forceRamps(); A.PERF.lastMoveT=-1e9; if(A.ROD) A.ROD.last=performance.now();"
                                 " for(let i=0;i<8;i++) await new Promise(r=>requestAnimationFrame(()=>r())); }")
        await self.page.wait_for_timeout(500)
        await self.page.screenshot(timeout=180000, path=str(path))
