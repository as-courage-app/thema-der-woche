'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const APP_MODE_KEY = 'as-courage.appMode.v1';

export default function FreeEntryPage() {
  const router = useRouter();

  useEffect(() => {
    // Free-Modus „klebt“ dauerhaft im Browser, bis wir ihn später aktiv auf FULL setzen.
    localStorage.setItem(APP_MODE_KEY, 'free');

    // Weiter in den normalen Flow (Setup). Falls deine Startlogik anders ist,
    // passen wir dieses Ziel im nächsten Schritt an.
    router.replace('/setup');
  }, [router]);

  return null;
}
