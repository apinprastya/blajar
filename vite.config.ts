import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function ortAssets(): Plugin {
  return {
    name: 'elajar:ort-assets',
    configureServer(server) {
      const publicDir = path.resolve(server.config.publicDir);
      server.middlewares.use((request, response, next) => {
        const url = (request.url ?? '').split('?')[0];
        if (!url.startsWith('/ort/')) {
          next();
          return;
        }
        const filePath = path.resolve(path.join(publicDir, url));
        if (!filePath.startsWith(publicDir + path.sep) || !existsSync(filePath)) {
          next();
          return;
        }
        response.setHeader(
          'Content-Type',
          filePath.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        );
        response.setHeader('Cache-Control', 'no-cache');
        createReadStream(filePath).pipe(response);
      });
    },
  };
}

export default defineConfig({
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'kokoro-js'],
  },
  plugins: [
    ortAssets(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'fonts/*.woff2'],
      manifest: {
        name: 'eLajar — Belajar Seru',
        short_name: 'eLajar',
        description: 'Belajar Matematika dan Bahasa Inggris dengan seru!',
        lang: 'id',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#FDF6EC',
        theme_color: '#7C5CFC',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,json,bin,mp3,wasm}'],
        globIgnores: ['ort/**', 'assets/ort-*'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/ort\/.*\.(wasm|mjs)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ort-wasm',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
});
