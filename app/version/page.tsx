'use client';

import { useEffect } from 'react';

export default function VersionPage() {
  useEffect(() => {
    try {
      localStorage.setItem('as-courage.appMode.v1', 'free');
    } catch {
      // bewusst leer
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      window.location.replace('/account');
      return;
    }

    window.location.replace('https://thema-der-woche-kostenlos.vercel.app/version');
  }, []);

  return null;
}