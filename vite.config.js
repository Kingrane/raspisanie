import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Расписание мехмата ЮФУ',
                short_name: 'Расписание',
                description: 'Расписание занятий мехмата ЮФУ: группы, курсы, верхняя и нижняя недели.',
                lang: 'ru',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                background_color: '#0e100f',
                theme_color: '#0e100f',
                icons: [
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                // Исходник картинки лежит в public, но на сайт не нужен: фавиконка уже свёрстана
                globIgnores: ['icon.png'],
                runtimeCaching: [
                    {
                        // Расписание с API мехмата: сначала сеть, при офлайне — последний ответ.
                        urlPattern: /^https:\/\/schedule\.sfedu\.ru\/APIv1\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'sfedu-schedule-api',
                            networkTimeoutSeconds: 8,
                            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // Шрифты Google: статичные, отдаём из кэша.
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: { cacheName: 'google-fonts-css', expiration: { maxEntries: 5 } },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-webfonts',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
    ],
    base: '/',
    build: {
        outDir: 'dist'
    }
})
