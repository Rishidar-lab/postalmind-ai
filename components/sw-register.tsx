'use client';

import { useEffect } from 'react';

/**
 * Registers the app-shell service worker (public/sw.js) so local-only tools
 * (Quick Incident, Vault, Workday Log, Ground Reality) still load offline.
 * Fails silently in any browser/context that doesn't support it — this is
 * a progressive enhancement, never a requirement to use the app.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is best-effort; the app works fully online without it.
    });
  }, []);
  return null;
}
