/**
 * Service Worker minimo do MyCash PWA.
 *
 * Objetivos:
 *  - Habilitar a instalabilidade do PWA (browsers exigem SW registrado)
 *  - Cache basico do shell da aplicacao (icones, manifest) para abertura
 *    offline rapida
 *  - NAO intercepta chamadas da API (/api/*) — sempre network
 *
 * Estrategia de cache: stale-while-revalidate para assets estaticos.
 */

const CACHE_NAME = 'mycash-shell-v1'
const SHELL_ASSETS = [
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-maskable.svg',
]

// Instala: pre-cachea o shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {
        // Nao bloqueia se algum asset nao existir
      })
  )
  // Ativa imediatamente sem esperar reload
  self.skipWaiting()
})

// Ativa: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Fetch: passa API sem cache, cacheia assets estaticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Nunca intercepta chamadas da API — dados sao dinamicos
  if (url.pathname.startsWith('/api/')) return

  // So aplica cache em GETs same-origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return

  // Stale-while-revalidate para assets estaticos
  const isAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|css|js|woff2?)$/i) ||
    url.pathname === '/manifest.webmanifest'

  if (!isAsset) return

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone())
            return response
          })
          .catch(() => cached)
        return cached || network
      })
    )
  )
})
