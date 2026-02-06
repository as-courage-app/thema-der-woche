'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import Link from 'next/link';
import { getAppMode, FREE_WEEKS_COUNT } from '@/lib/appMode';

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
  const isFree = getAppMode() === 'free';

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

  useEffect(() => {
  if (isFree) setWeeksCount(FREE_WEEKS_COUNT);
}, [isFree]);

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

    const weeksCountSafe = Math.min(2, Math.max(1, Number(payload.weeksCount) || 1));
    localStorage.setItem(
  SETUP_KEY,
  JSON.stringify({
    ...payload,
    weeksCount: weeksCountSafe,
  })
);

    // ✅ /themes bleibt frei sichtbar – wie gewünscht
    router.push('/themes');
  }

  return (
    <BackgroundLayout>
      {/* h-full statt min-h-screen, damit kein doppeltes 100vh entsteht */}
      <div className="mx-auto flex w-full max-w-none items-start px-0 py-0 sm:max-w-2xl sm:px-4 sm:py-6 sm:items-center">
        <div className="w-full rounded-none sm:rounded-2xl bg-white/98 sm:bg-white/90 p-4 sm:p-6 shadow-none sm:shadow-xl backdrop-blur-lg min-h-[100dvh] sm:min-h-0">
          <div className="flex items-start justify-between gap-4">
  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
    Setup – Thema der Woche <span className="text-base font-normal tracking-wide">(Edition 1)</span>
  </h1>

  <Link
    href="/"
    className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition shrink-0"
  >
    Startseite
  </Link>
</div>
<p className="mt-2 text-sm text-slate-800">
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
                  <div
  className={
    selectedLicenseTier === t
      ? 'font-semibold text-white'
      : 'font-semibold text-slate-900'
  }
>
  Variante {t}
</div>
                  <div className={selectedLicenseTier === t ? 'text-white/90 text-xs' : 'text-slate-800 text-xs'}>
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
                max={2}
                value={weeksCount}
                onChange={(e) => {
  const raw = e.target.value;

  // wenn jemand kurz alles löscht: wir springen auf 1 zurück
  if (raw === '') {
    setWeeksCount(1);
    setError(null);
    return;
  }

  const n = Math.floor(Number(raw));
  const clamped = Number.isFinite(n) ? Math.min(2, Math.max(1, n)) : 1;

  setWeeksCount(clamped);
  setError(null);
}}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 px-3 py-2 text-base outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
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
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 [color-scheme:light] outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStartMonday(nextMondayISO())}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
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
              className="rounded-xl border border-slate-400 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
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
