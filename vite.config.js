import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pages = ['index', 'menu', 'deals', 'about', 'contact', '404'];

// <!-- @include header --> pulls in src/partials/header.html, so shared markup lives in one place
function partials() {
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) =>
          readFileSync(resolve(__dirname, `src/partials/${name}.html`), 'utf8')),
    },
  };
}

// Vercel serves /menu from menu.html (cleanUrls); mirror that locally
function cleanUrls() {
  const rewrite = (req, _res, next) => {
    const [path, query = ''] = req.url.split('?');
    if (pages.includes(path.slice(1)) && path !== '/index') req.url = `${path}.html${query ? '?' + query : ''}`;
    next();
  };
  return {
    name: 'clean-urls',
    // braces matter: a returned function would be treated as a post-middleware hook
    configureServer(server) { server.middlewares.use(rewrite); },
    configurePreviewServer(server) { server.middlewares.use(rewrite); },
  };
}

export default defineConfig({
  plugins: [partials(), cleanUrls()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(__dirname, `${p}.html`)])),
    },
    chunkSizeWarningLimit: 900,
  },
});
