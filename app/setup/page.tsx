'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';

const SETUP_KEY = 'as-courage.themeSetup.v1';

function isMondayISO(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.getDay() === 1; // Mo = 1
}

function nextMondayISO(from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0..6
  const diff = (8 - day) % 7 || 7; // bis nächster Montag (wenn schon Mo -> 7)
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function SetupPage() {
  const router = useRouter();

  const [weeksCount, setWeeksCount] = useState<number>(4);
  const [startMonday, setStartMonday] = useState<string>(nextMondayISO());
  const [error, setError] = useState<string | null>(null);

  // Wenn schon mal etwas gespeichert wurde: wieder laden (nice UX)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETUP_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.weeksCount === 'number' && s.weeksCount >= 1) setWeeksCount(s.weeksCount);
      if (typeof s.startMonday === 'string' && s.startMonday.length === 10) setStartMonday(s.startMonday);
    } catch {
      // ignorieren
    }
  }, []);

  function saveAndGo(mode: 'manual' | 'random') {
    setError(null);

    if (!startMonday || startMonday.length !== 10) {
      setError('Bitte ein gültiges Startdatum auswählen.');
      return;
    }
    if (!isMondayISO(startMonday)) {
      setError('Das Startdatum muss ein Montag sein.');
      return;
    }
    if (!weeksCount || weeksCount < 1) {
      setError('Bitte mindestens 1 Woche auswählen.');
      return;
    }

    // ✅ EINHEITLICH speichern – das liest /themes später aus
    localStorage.setItem(
      SETUP_KEY,
      JSON.stringify({
        edition: 1,
        weeksCount,
        startMonday,
        mode, // 'manual' | 'random'
        createdAt: new Date().toISOString(),
      })
    );

    router.push('/themes');
  }

  return (
    <BackgroundLayout>
      {/* Wichtig: h-full statt min-h-screen, damit kein doppeltes 100vh entsteht */}
      <div className="mx-auto flex h-full max-w-2xl items-center px-4 overflow-hidden">
        <div className="w-full rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold tracking-tight">Setup – Thema der Woche</h1>
          <p className="mt-1 text-sm text-slate-700">
            Wähle Anzahl Wochen und den Start-Montag. Danach geht’s zur Themenauswahl.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <label className="block text-sm font-medium text-slate-800">Anzahl Wochen</label>
              <input
                type="number"
                min={1}
                max={52}
                value={weeksCount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setWeeksCount(Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1);
                  setError(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <p className="mt-1 text-xs text-slate-600">Pro Woche: Mo–Fr (5 Tagesimpulse).</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <label className="block text-sm font-medium text-slate-800">Startdatum (Montag)</label>
              <input
                type="date"
                value={startMonday}
                onChange={(e) => {
                  setStartMonday(e.target.value);
                  setError(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStartMonday(nextMondayISO())}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50"
                >
                  Nächster Montag
                </button>
                <span className="text-xs text-slate-600">
                  {isMondayISO(startMonday) ? '✓ Montag' : '✕ kein Montag'}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveAndGo('manual')}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90"
            >
              Manuell auswählen
            </button>

            <button
              type="button"
              onClick={() => saveAndGo('random')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              Zufall auswählen
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-600">
            Hinweis: Beide Wege führen zur gleichen Themenauswahl. Der Unterschied ist nur: Dort ist „Zufall“ bereits
            vorausgewählt.
          </p>
        </div>
      </div>
    </BackgroundLayout>
  );
}
