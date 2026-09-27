# Hepatic Scale Atlas

Interactive 3D teaching atlas of the liver and hepatobiliary system, from the whole organ down to the hepatocyte, with a pathology and haemodynamics engine (fibrosis, portal hypertension, PVT, Budd–Chiari, HCC, cholangiocarcinoma, pancreatic disease, biliary obstruction and procedures).

Educational model. Not for clinical decision-making.

## Build and check
```
python3 build.py        # → dist/ (static site: open dist/index.html through any web server)
python3 validate.py     # build + checks → tests/out/report.md
```
Needs Python 3.10+, and for `validate.py`: `pip install playwright pillow numpy` (uses a headless Chromium).

## Host
`dist/` is a plain static site (Cloudflare Pages, Netlify, Vercel or GitHub Pages: build command `python3 build.py`, output directory `dist`).

## Credits
three.js (MIT). Anatomy derived from a TotalSegmentator-segmented CT case; see `pipeline/README.md`.
