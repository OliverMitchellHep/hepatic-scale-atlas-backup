# Rex Hepatis website (trial)

Astro Starlight site that wraps the atlas. Single sources of truth stay where they were:

| Thing | Source | Generated into |
|---|---|---|
| The atlas | `../src`, `../data`, `../assets`, `../build.py` | `public/atlas/` (via `python3 ../build.py`) |
| Anatomy / physiology modules | `../content/A*.md`, `../content/P*.md` | `src/content/docs/anatomy`, `.../physiology` |
| Hand-written pages (home, histology, pathology, guidelines, about) | `src/content/docs/**` | — |

Generated folders are git-ignored. `npm run dev` / `npm run build` run `scripts/prepare.mjs` first.

```
cd site
npm install
npm run dev        # http://localhost:4321  (atlas at /atlas/)
npm run build      # -> site/dist
```

## Linking a page into the atlas
`src/components/AtlasLink.astro` builds a link in the atlas's own `#v=` share format (no atlas code changed):

```mdx
import AtlasLink from '../../../components/AtlasLink.astro';
<AtlasLink z={3}>Open at sinusoid scale</AtlasLink>
<AtlasLink path={{ pvt: 'chronic' }} fibrosis={0.2}>PVT simulation</AtlasLink>
<AtlasLink layers={{ ribcage: 'ghost', segments: true }}>Segments with ribs</AtlasLink>
```

## Adding a page or tab
Add a `.md`/`.mdx` file under `src/content/docs/<section>/`; it appears in the sidebar automatically. Use `<Tabs>` from `@astrojs/starlight/components` for tabbed pages (see `histology/index.mdx`).

## Deploy
`.github/workflows/deploy-site.yml` (manual trigger) publishes to GitHub Pages. Private repos need a paid plan for Pages; Cloudflare Pages/Netlify work with build command `cd site && npm ci && npm run build`, output `site/dist`.
The atlas contains no CT source masks; `CLAUDE.md` says keep the repo private until the dataset licence for public release is confirmed. The built site does include the derived atlas meshes.
