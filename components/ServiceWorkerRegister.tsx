'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // bewusst still
      });
    };

    // Wenn die Seite schon geladen ist: sofort registrieren
    if (document.readyState === 'complete') {
      register();
      return;
    }

    // Sonst: nach dem Laden registrieren
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
