import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// SITE_URL / SITE_BASE are set by the deploy workflow (e.g. GitHub Pages project site).
// Leave unset for a custom domain served from the root.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.SITE_BASE || '/',
  integrations: [
    starlight({
      title: 'Rex Hepatis',
      description: 'Consultant-level hepatobiliary teaching, built around an interactive 3D atlas of the liver from organ to hepatocyte.',
      customCss: ['./src/styles/custom.css'],
      components: {
        ThemeProvider: './src/components/ThemeProvider.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
      expressiveCode: { themes: ['github-light'] },
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' } },
        { tag: 'link', attrs: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap' } },
      ],
      social: [],
      sidebar: [
        { label: 'Start here', items: [{ label: 'Overview', slug: 'overview' }, { label: 'Open the atlas', link: '/atlas/', attrs: { target: '_blank' } }] },
        { label: 'Anatomy', autogenerate: { directory: 'anatomy' } },
        { label: 'Physiology', autogenerate: { directory: 'physiology' } },
        { label: 'Histology', autogenerate: { directory: 'histology' } },
        { label: 'Pathology', autogenerate: { directory: 'pathology' } },
        { label: 'Guidelines', autogenerate: { directory: 'guidelines' } },
        { label: 'Research', autogenerate: { directory: 'research' } },
        { label: 'About', autogenerate: { directory: 'about' } },
      ],
    }),
  ],
});
