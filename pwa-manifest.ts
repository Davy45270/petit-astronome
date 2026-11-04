import type { ManifestOptions } from 'vite-plugin-pwa';
export const manifest: Partial<ManifestOptions> = {
    name: 'Petit Astronome', short_name: 'Astronome', lang: 'fr', display: 'standalone', theme_color: '#0a0f2e', background_color: '#0a0f2e', start_url: './', scope: './',
    description: 'Découvrir le Soleil, les planètes, la Lune, les étoiles et les constellations en jouant.',
    icons: [
        { src: 'icons/astro-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/astro-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/astro-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
};
