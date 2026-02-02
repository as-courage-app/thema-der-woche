'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlanBridgePage() {
  const router = useRouter();

  useEffect(() => {
    // Wenn Setup vorhanden -> weiter zu /themes, sonst zurück zu /setup
    try {
      const raw =
        localStorage.getItem('as-courage.themeSetup.v1') ||
        localStorage.getItem('as-courage.themeSetup') ||
        localStorage.getItem('themeSetup') ||
        localStorage.getItem('setup');

      if (raw) router.replace('/themes');
      else router.replace('/setup');
    } catch {
      router.replace('/setup');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="rounded-2xl bg-white/80 p-6 shadow">
        <div className="text-lg font-semibold">Einen Moment…</div>
        <div className="text-sm text-slate-600 mt-2">
          Wir bringen dich zurück in die Planung.
        </div>
      </div>
    </div>
  );
}
