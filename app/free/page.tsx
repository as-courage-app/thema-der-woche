'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const APP_MODE_KEY = 'as-courage.appMode.v1';

export default function FreeEntryPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem(APP_MODE_KEY, 'free');

    // ✅ Setup-State in Free sofort bereinigen: weeksCount nur 1..2
    try {
      const SETUP_KEY = 'as-courage.themeSetup.v1';
      const raw = localStorage.getItem(SETUP_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const loaded = Number(s?.weeksCount) || 1;
        const clamped = Math.min(2, Math.max(1, loaded));

        if (clamped !== loaded) {
          localStorage.setItem(SETUP_KEY, JSON.stringify({ ...s, weeksCount: clamped }));
        }
      }
    } catch {
      // ignorieren
    }

    router.replace('/setup');
  }, [router]);

  return null;
}
