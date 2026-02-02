'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../components/BackgroundLayout';

const SETUP_KEY = 'as-courage.themeSetup.v1';

type SetupState = {
  edition?: number;
  weeksCount?: number;
  startMonday?: string;
  mode?: 'manual' | 'random';
  createdAt?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [lastSetup, setLastSetup] = useState<SetupState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETUP_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SetupState;
      setLastSetup(parsed);
    } catch {
      // ignorieren
    }
  }, []);

  const hasSetup =
    !!lastSetup &&
    typeof lastSetup.weeksCount === 'number' &&
    typeof lastSetup.startMonday === 'string' &&
    (lastSetup.mode === 'manual' || lastSetup.mode === 'random');

  return (
    <BackgroundLayout>
      {/* Seite garantiert ohne Scrollbalken */}
      <div className="min-h-screen w-full overflow-hidden px-4">
        {/* Zentrum / Overlay auf Hintergrundbild */}
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center">
          {/* Content-Box */}
          <div className="w-full rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md sm:p-8">
            <h1 className="text-3xl font-semibold tracking-tight">Thema der Woche</h1>
            <p className="mt-2 text-sm text-slate-700">
              Starte ein neues Wochenpaket (Edition 1) oder mache dort weiter, wo du zuletzt aufgehört hast.
            </p>

            {/* Letzter Stand */}
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-800">Letzter Stand</div>

              {!hasSetup ? (
                <p className="mt-2 text-sm text-slate-600">
                  Noch kein Setup gespeichert. Klicke auf „Neues Setup starten“.
                </p>
              ) : (
                <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <div>
                    <span className="font-medium">Edition:</span> {lastSetup.edition ?? 1}
                  </div>
                  <div>
                    <span className="font-medium">Modus:</span>{' '}
                    {lastSetup.mode === 'manual' ? 'Manuell' : 'Zufall'}
                  </div>
                  <div>
                    <span className="font-medium">Wochen:</span> {lastSetup.weeksCount}
                  </div>
                  <div>
                    <span className="font-medium">Start (Mo):</span> {lastSetup.startMonday}
                  </div>
                </div>
              )}
            </div>

            {/* Aktionen */}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push('/setup')}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Neues Setup starten
              </button>

              <button
                type="button"
                onClick={() => router.push('/themes')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                title="Geht zur Themenauswahl"
              >
                Zur Themenauswahl
              </button>

              {hasSetup && (
                <button
                  type="button"
                  onClick={() => router.push('/themes')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  title="Macht mit dem gespeicherten Stand weiter"
                >
                  Weiter mit letztem Stand
                </button>
              )}
            </div>

            {/* Fahrplan */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-800">Kurzer Fahrplan</div>
              <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
                <li>Setup: Wochenzahl + Start-Montag + Modus</li>
                <li>Themen auswählen (Edition 1: 41 Themen)</li>
                <li>Zitate/Fragen anzeigen & später CSV/Export (wenn du willst)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </BackgroundLayout>
  );
}
