/**
 * PostalMind AI — minimal app-shell service worker.
 *
 * Scope: cache the pages that are genuinely local-only (Quick Incident,
 * Vault, Workday Log, Ground Reality, the dashboard, the home page) so they
 * still load with no network. It deliberately never intercepts /api/* — an
 * API route is never meant to work offline, and serving a stale cached copy
 * of one (e.g. /api/health) would be actively misleading.
 *
 * No secrets and no private evidence are cached here: private data lives in
 * IndexedDB (lib/storage/*), never in this cache, and this worker only ever
 * caches the static page shell, not vault contents.
 */

const CACHE_NAME = 'postalmind-shell-v1';
const OFFLINE_URL = '/offline';

const SHELL_URLS = ['/', '/dashboard', '/evidence/quick', '/evidence/vault', '/tools/workday', '/ground-reality', OFFLINE_URL];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never intercept API routes

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && SHELL_URLS.includes(url.pathname)) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
  );
});
