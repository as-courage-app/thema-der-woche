'use client';

import { useEffect } from 'react';

export default function VersionPage() {
  useEffect(() => {
    try {
      localStorage.setItem('as-courage.appMode.v1', 'free');
    } catch {
      // bewusst leer
    }

    window.location.replace('https://thema-der-woche-kostenlos.vercel.app/version');
  }, []);

  return null;
}