import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';
export default defineConfig({ base: './', plugins: [VitePWA({ strategies: 'generateSW', registerType: 'autoUpdate', manifest, workbox: { cacheId: 'petit-astronome', clientsClaim: true, cleanupOutdatedCaches: true, globPatterns: ['**/*.{html,js,css,svg,woff2,png,webmanifest}'], runtimeCaching: [] } })] });
