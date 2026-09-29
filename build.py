#!/usr/bin/env python3
"""Assemble the Hepatic Scale Atlas into dist/.

    python3 build.py            # build dist/
    python3 build.py --check X  # build, then confirm dist/index.html is byte-identical to file X

dist/ is exactly what gets published (artifact or static host):
    index.html          src/page.html with every @@INCLUDE:path@@ replaced by that file's text,
                        and @@REGISTRY@@ replaced by the INFO object generated from data/registry.json
    vendor/             three.js r160 + addons (unchanged third-party code)
    <assets>            everything in assets/ copied to the site root (the page loads them by bare name)
"""
import json, re, shutil, sys, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'


def registry_js():
    """INFO object literal for the page, from data/registry.json (one entry per named structure).

    Output format matches the hand-written v42 literal: one '  "Name":<json>,' line per entry."""
    reg = json.loads((ROOT / 'data/registry.json').read_text())
    lines = [f'  {json.dumps(e["name"], ensure_ascii=False)}:{json.dumps(e["info"], ensure_ascii=False)}' for e in reg['structures']]
    return '{\n' + ',\n'.join(lines) + '\n}'


def regmeta_js():
    """v50: per-name metadata for the interface (search, Isolate, guidance badges): {name: [id, layers, tiers, cites]}."""
    reg = json.loads((ROOT / 'data/registry.json').read_text())
    return json.dumps({e['name']: [e['id'], e.get('layer', []), e.get('tier', []), e.get('cites', [])] for e in reg['structures']},
                      ensure_ascii=False, separators=(',', ':'))


def assemble():
    page = (ROOT / 'src/page.html').read_text()

    def inc(m):
        text = (ROOT / m.group(1)).read_text()
        return text
    # includes may themselves contain @@REGISTRY@@ (atlas.js does)
    out = re.sub(r'@@INCLUDE:([^@]+)@@', inc, page)
    if '@@REGISTRY@@' in out:
        out = out.replace('@@REGISTRY@@', registry_js(), 1)
    if '@@REGMETA@@' in out:
        out = out.replace('@@REGMETA@@', regmeta_js(), 1)
    assert '@@INCLUDE:' not in out and '@@REGISTRY@@' not in out and '@@REGMETA@@' not in out, 'unresolved build marker'
    return out


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    html = assemble()
    (DIST / 'index.html').write_text(html)
    shutil.copytree(ROOT / 'vendor', DIST / 'vendor')
    for f in sorted((ROOT / 'assets').iterdir()):
        if f.is_file():
            shutil.copy2(f, DIST / f.name)
    total = sum(p.stat().st_size for p in DIST.rglob('*') if p.is_file())
    print(f'dist/index.html {len(html.encode())/1e6:.2f} MB · dist total {total/1e6:.2f} MB')
    return html


if __name__ == '__main__':
    html = build()
    if '--check' in sys.argv:
        ref = Path(sys.argv[sys.argv.index('--check') + 1]).read_text()
        h = lambda t: hashlib.sha256(t.encode()).hexdigest()[:16]
        same = ref == html
        print('identical to reference' if same else f'DIFFERS from reference ({h(ref)} vs {h(html)})')
        sys.exit(0 if same else 1)
