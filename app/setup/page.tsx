'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';

const SETUP_KEY = 'as-courage.themeSetup.v1';

type LicenseTier = 'A' | 'B' | 'C';

type SetupState = {
  edition?: number;
  weeksCount?: number;
  startMonday?: string;
  mode?: 'manual' | 'random';
  createdAt?: string;

  // ✅ Nur Auswahl/Vorlieben – keine echte Lizenz!
  selectedLicenseTier?: LicenseTier;

  // ✅ iCal-Wunsch (nur in C aktivierbar)
  icalEnabled?: boolean;
};

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

  // ✅ Lizenz-Auswahl (nur als Auswahl gespeichert)
  const [selectedLicenseTier, setSelectedLicenseTier] = useState<LicenseTier>('A');

  // ✅ iCal (nur wenn C)
  const [icalEnabled, setIcalEnabled] = useState<boolean>(false);
  const isIcalAllowed = useMemo(() => selectedLicenseTier === 'C', [selectedLicenseTier]);

  // Wenn Lizenz nicht C: iCal sicherheitshalber aus (damit keine „Altwerte“ bleiben)
  useEffect(() => {
    if (!isIcalAllowed && icalEnabled) setIcalEnabled(false);
  }, [isIcalAllowed, icalEnabled]);

  // Vorherige Einstellungen laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETUP_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SetupState;

      if (typeof s.weeksCount === 'number' && s.weeksCount >= 1) setWeeksCount(s.weeksCount);
      if (typeof s.startMonday === 'string' && s.startMonday.length === 10) setStartMonday(s.startMonday);

      if (s.selectedLicenseTier === 'A' || s.selectedLicenseTier === 'B' || s.selectedLicenseTier === 'C') {
        setSelectedLicenseTier(s.selectedLicenseTier);
      }
      setIcalEnabled(Boolean(s.icalEnabled));
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

    const payload: SetupState = {
      edition: 1,
      weeksCount,
      startMonday,
      mode,
      createdAt: new Date().toISOString(),

      selectedLicenseTier,
      icalEnabled: isIcalAllowed ? icalEnabled : false,
    };

    localStorage.setItem(SETUP_KEY, JSON.stringify(payload));

    // ✅ /themes bleibt frei sichtbar – wie gewünscht
    router.push('/themes');
  }

  return (
    <BackgroundLayout>
      {/* h-full statt min-h-screen, damit kein doppeltes 100vh entsteht */}
      <div className="mx-auto flex h-full max-w-2xl items-center px-4 overflow-hidden">
        <div className="w-full rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold tracking-tight">Setup – Thema der Woche</h1>
          <p className="mt-1 text-sm text-slate-700">
            Wähle Anzahl Wochen, Start-Montag und deine Variante. Danach geht’s zur Themenübersicht.
          </p>

          {/* ✅ Varianten-Auswahl (ohne Preise) */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-sm font-medium text-slate-800">Variante wählen</div>
            <div className="mt-1 text-xs text-slate-600">
              Die Themenübersicht ist frei sichtbar. Bestimmte Funktionen werden später je nach gekaufter Lizenz freigeschaltet.
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(['A', 'B', 'C'] as LicenseTier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedLicenseTier(t);
                    setError(null);
                  }}
                  className={[
                    'rounded-xl border px-3 py-3 text-left text-sm transition',
                    selectedLicenseTier === t
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                >
                  <div className="font-semibold">Variante {t}</div>
                  <div className={selectedLicenseTier === t ? 'text-white/80 text-xs' : 'text-slate-600 text-xs'}>
                    {t === 'A' && 'Einzellizenz für 12 Monate · ohne iCal'}
                    {t === 'B' && 'Einzellizenz dauerhaft · ohne iCal'}
                    {t === 'C' && 'Einzellizenz dauerhaft · mit Teamkalender/iCal'}
                  </div>
                </button>
              ))}
            </div>
          </div>

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

          {/* ✅ iCal sichtbar für alle, aber nur in C aktivierbar */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={isIcalAllowed ? icalEnabled : false}
                disabled={!isIcalAllowed}
                onChange={(e) => setIcalEnabled(e.target.checked)}
              />
              <span className="text-sm text-slate-800">
                Teamkalender/iCal für diese Planung erzeugen
                <span className="block text-xs text-slate-600">
                  {isIcalAllowed ? (
                    <>Wenn aktiviert, erscheint später auf „Zitate &amp; Tagesimpulse“ ein Download-Button.</>
                  ) : (
                    <>
                      Diese Funktion ist nur in <span className="font-semibold">Variante C</span> enthalten.
                      Du kannst Variante C auswählen, um die Option zu aktivieren.
                    </>
                  )}
                </span>
              </span>
            </label>
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
            Hinweis: Beide Wege führen zur gleichen Themenübersicht. Der Unterschied ist nur: Bei „Zufall“ ist die spätere Auswahl automatisiert.
          </p>
        </div>
      </div>
    </BackgroundLayout>
  );
}
