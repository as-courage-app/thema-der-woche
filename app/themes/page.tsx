'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import { getAppMode, FREE_ALLOWED_THEMES, FREE_WEEKS_COUNT } from '@/lib/appMode';
import RequireAuth from '@/components/RequireAuth';
import { readCurrentUserPlan } from '@/lib/userPlan';

// Datei muss liegen unter: app/data/edition1.json
import edition1 from '../data/edition1.json';
function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

type Mode = 'manual' | 'random';

type EditionRow = {
  id: string;
  title?: string;
  quote: string;
  questions: string[];
};

const THEMES: EditionRow[] = edition1 as unknown as EditionRow[];

const LS = {
  setup: 'as-courage.themeSetup.v1',
  usedThemes: 'as-courage.usedThemes.v1',
  selection: 'as-courage.selectedThemes.v1',
};

// Ordner heißt "quotes" → Route ist /quotes
const NEXT_ROUTE = '/quotes';

function sortDE(a: string, b: string) {
  return a.localeCompare(b, 'de', { sensitivity: 'base' });
}

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T) {
  try {
    if (Array.isArray(value)) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    if (value && typeof value === 'object') {
      const prevRaw = localStorage.getItem(key);
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      const next = { ...prev, ...(value as any) };
      localStorage.setItem(key, JSON.stringify(next));
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // bewusst leer
  }
}

function isMondayISO(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.getDay() === 1;
}

function nextMondayISO(from = new Date()) {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDE(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function prettifyId(id: string): string {
  const cleaned = id.replace(/^ed\d+-\d+-/i, '').replace(/-/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function displayTitle(t: { id: string; title?: string }): string {
  const title = t.title?.trim();
  return title && title.length > 0 ? title : prettifyId(t.id);
}

function normalizeStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((x): x is string => typeof x === 'string');
  }
  if (input && typeof input === 'object') {
    // Reparatur: {"0":"id1","1":"id2"} -> ["id1","id2"]
    return Object.values(input as Record<string, unknown>).filter((x): x is string => typeof x === 'string');
  }
  return [];
}

export default function ThemesPage() {
  const router = useRouter();

  const [appMode, setAppMode] = useState<'free' | 'full' | null>(null);

  const SETUP_KEY = 'as-courage.themeSetup.v1';

  const [isPlanC, setIsPlanC] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
  const [icalPref, setIcalPref] = useState(false);
  const [icalNotice, setIcalNotice] = useState<string | null>(null);

  // Plan + iCal-Vorliebe laden
  useEffect(() => {
    let alive = true;

    async function loadPlanAndIcalPref() {
      let plan: 'A' | 'B' | 'C' | null = null;
      let planC = false;

      try {
        plan = await readCurrentUserPlan();
      } catch {
        plan = null;
      }

      if (!alive) return;

      setCurrentUserPlan(plan);
      planC = plan === 'C';

      try {
        const raw = localStorage.getItem(SETUP_KEY);
        if (raw) {
          const s = JSON.parse(raw) as { icalEnabled?: boolean };
          setIcalPref(Boolean(s.icalEnabled));
        }
      } catch {
        // ignorieren
      }

      setIsPlanC(planC);
    }

    loadPlanAndIcalPref();

    return () => {
      alive = false;
    };
  }, []);

  // iCal-Vorliebe speichern (nur wenn Plan C, sonst immer false)

  useEffect(() => {
    setAppMode(getAppMode());
  }, []);

  const isFree = appMode === 'free' && currentUserPlan === null;
  const upperWeeks = isFree ? FREE_WEEKS_COUNT : 41;

  const sortedThemes = useMemo(() => {
    return [...THEMES].sort((x, y) => sortDE(displayTitle(x), displayTitle(y)));
  }, []);

  const [mode, setMode] = useState<Mode>('manual');
  const [weeksCount, setWeeksCount] = useState<number>(1);
  const [startMonday, setStartMonday] = useState<string>(nextMondayISO());
  const [setupLoaded, setSetupLoaded] = useState(false);

  // iCal-Vorliebe + Datumsbasis in SETUP_KEY speichern
  useEffect(() => {
    if (!setupLoaded) return;
    try {
      const raw = localStorage.getItem(SETUP_KEY);
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

      const next = {
        ...prev,
        icalEnabled: isPlanC ? icalPref : false,
        weeksCount,
        startMonday,
      };

      localStorage.setItem(SETUP_KEY, JSON.stringify(next));
    } catch {
      // ignorieren
    }
  }, [isPlanC, icalPref, weeksCount, startMonday]);

  const [error, setError] = useState<string | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  function moveSelectedTheme(from: number, dir: -1 | 1) {
    setSelectedThemes((prev) => {
      const to = Math.max(0, Math.min(prev.length - 1, from + dir));
      if (to === from) return prev;
      const next = moveItem(prev, from, to);

      // Reihenfolge persistieren (selber Key wie bisher)
      try {
        writeLS(LS.selection, next);
      } catch {
        // egal, dann bleibt es nur im UI
      }

      return next;
    });
  }
  const [usedThemes, setUsedThemes] = useState<string[]>([]);

  // Initial laden + alte/kaputte LS-Strukturen reparieren
  useEffect(() => {
    // Setup aus LS lesen (inkl. möglicher Alt-Keys)
    const possibleKeys = [LS.setup, 'as-courage.themeSetup', 'themeSetup', 'setup', 'as-courage.setup.v1'];

    let setup: any = null;
    for (const k of possibleKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setup = parsed;
          break;
        }
      } catch {
        // weiter
      }
    }

    if (setup) {
      const wc =
        (typeof setup.weeksCount === 'number' && setup.weeksCount) ||
        (typeof setup.weeks === 'number' && setup.weeks) ||
        (typeof setup.anzahlWochen === 'number' && setup.anzahlWochen) ||
        null;

      if (wc && wc >= 1) setWeeksCount(Math.min(upperWeeks, Math.max(1, wc)));
      if (typeof setup.startMonday === 'string' && setup.startMonday.length === 10) setStartMonday(setup.startMonday);
      if (setup.mode === 'manual' || setup.mode === 'random') setMode(setup.mode);
    }

    // usedThemes laden + reparieren
    const usedRaw = readLS<unknown>(LS.usedThemes, []);
    const usedArr = normalizeStringArray(usedRaw);
    writeLS(LS.usedThemes, usedArr);
    setUsedThemes(usedArr);

    // selection laden
    const selRaw = readLS<unknown>(LS.selection, []);
    const selArr = normalizeStringArray(selRaw);
    setSelectedThemes(selArr.slice(0, Math.min(selArr.length, upperWeeks)));
    setSelectionLoaded(true);
    setSetupLoaded(true);
  }, [upperWeeks]);

  // selection persistieren
  useEffect(() => {
    if (!selectionLoaded) return;
    writeLS(LS.selection, selectedThemes);
  }, [selectedThemes]);

  const selectedSet = useMemo(() => new Set(selectedThemes), [selectedThemes]);
  const usedSet = useMemo(() => new Set(usedThemes), [usedThemes]);

  const canSelectMore = selectedThemes.length < weeksCount;

  function toggleTheme(id: string) {
    setError(null);
    setSelectedThemes((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeLS(LS.selection, next);
      return next;
    });
  }

  function clearSelection() {
    setError(null);
    setSelectedThemes([]);
    writeLS(LS.selection, []);
  }

  function clearUsedThemes() {
    setError(null);
    setUsedThemes([]);
    writeLS(LS.usedThemes, []);
  }

  function pickRandomThemes() {
    setError(null);

    const pool = sortedThemes
      .map((t) => t.id)
      .filter((id) => !isFree || FREE_ALLOWED_THEMES.has(id));

    const n = Math.min(weeksCount, pool.length);
    const copy = [...pool];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    setSelectedThemes(copy.slice(0, n));
  }

  function validate(): boolean {
    setError(null);

    if (!startMonday || startMonday.length !== 10) {
      setError('Bitte ein gültiges Startdatum wählen.');
      return false;
    }
    if (!isMondayISO(startMonday)) {
      setError('Das Startdatum muss ein Montag (Mo) sein.');
      return false;
    }
    if (weeksCount < 1) {
      setError('Bitte mindestens 1 Woche auswählen.');
      return false;
    }
    if (selectedThemes.length !== weeksCount) {
      setError(`Bitte genau ${weeksCount} Thema/Themen auswählen (aktuell: ${selectedThemes.length}).`);
      return false;
    }
    return true;
  }

  function onContinue() {
    if (!validate()) return;

    const setup = {
      edition: 1,
      weeksCount,
      startMonday,
      mode,
      themeIds: selectedThemes,
      createdAt: new Date().toISOString(),
    };
    writeLS(LS.setup, setup);

    const nextUsed = Array.from(new Set([...usedThemes, ...selectedThemes]));
    setUsedThemes(nextUsed);
    writeLS(LS.usedThemes, nextUsed);

    router.push(NEXT_ROUTE);
  }

  const selectedScheduleRows = useMemo(() => {
    const titleMap = new Map(sortedThemes.map((t) => [t.id, displayTitle(t)]));
    const baseDate = parseIsoDate(startMonday);

    return selectedThemes.map((id, index) => {
      const monday = baseDate ? addDays(baseDate, index * 7) : null;
      const friday = monday ? addDays(monday, 4) : null;

      return {
        id,
        title: titleMap.get(id) ?? prettifyId(id),
        dateRange: monday && friday ? `${formatDE(monday)} – ${formatDE(friday)}` : '',
      };
    });
  }, [selectedThemes, sortedThemes, startMonday]);

  return (
    <RequireAuth>
      <BackgroundLayout>
        <div className="mx-auto flex min-h-[100svh] max-w-6xl px-3 py-2 sm:px-10 sm:py-3">
          <div className="w-full rounded-2xl bg-white/85 shadow-xl backdrop-blur-md flex flex-col">
            {/* Kopf bleibt sichtbar */}
            <div className="p-5 sm:p-7 shrink-0">
              <header>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-semibold tracking-tight text-black">
                    Themenauswahl <span className="text-base font-normal tracking-wide">(Edition 1)</span>
                  </h1>


                  <div className="flex gap-2">
                    <Link
                      href="https://thema-der-woche-kostenlos.vercel.app/version"
                      className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 hover:border-slate-400 hover:shadow-xl cursor-pointer"
                      title="Zur Begrüßungsseite"
                    >
                      zurück
                    </Link>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <div
                          role="button"
                          tabIndex={0}
                          className="text-left"
                          onClick={() => {
                            if (!isPlanC) {
                              setIcalNotice((prev) =>
                                prev ? null : 'iCal ist nur in Variante C möglich.',
                              );
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!isPlanC && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              setIcalNotice((prev) =>
                                prev ? null : 'iCal ist nur in Variante C möglich.',
                              );
                            }
                          }}
                        >
                          <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer"
                              checked={isPlanC ? icalPref : false}
                              aria-disabled={!isPlanC}
                              onChange={(e) => {
                                if (!isPlanC) {
                                  return;
                                }
                                setIcalPref(e.target.checked);
                                setIcalNotice(null);
                              }}
                            />
                            <span>
                              iCal aktivieren (nur in Variante C möglich)
                              <span className="block text-[11px] text-slate-500">
                                Download später bei „Zitate &amp; Tagesimpulse“
                              </span>
                            </span>
                          </div>
                        </div>

                        {icalNotice && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            {icalNotice}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="text-base text-slate-700">
                    Aktuelle Variante:{' '}
                    <span className="font-semibold text-slate-900">
                      {currentUserPlan ? `Variante ${currentUserPlan}` : 'wird geladen'}
                    </span>
                  </div>

                  {!isPlanC && (
                    <Link
                      href="/account"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm text-slate-900 shadow-md transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                      title="Zum Upgrade"
                    >
                      zum upgrade
                    </Link>
                  )}
                </div>

                <p className="mt-2 text-sm text-black">
                  Wähle genau{' '}
                  <span className="font-semibold text-slate-900">{weeksCount}</span>{' '}
                  Thema/Themen aus. Bereits genutzte Themen bleiben auswählbar – sie sind nur markiert.
                </p>

              </header>
            </div>

            {/* Inhalt scrollt IN der Karte */}
            <div className="px-5 pb-5 sm:px-7 sm:pb-7 flex-1 min-h-0 overflow-auto">
              {/* Setup-Zeile */}
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Modus */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-black sm:text-slate-800">
                  <label className="block text-sm font-medium text-slate-800">Modus</label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('manual');
                        setError(null);
                      }}
                      className={[
                        'flex-1 rounded-lg border px-3 py-2 text-sm',
                        mode === 'manual'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      Manuell
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('random');
                        setError(null);
                      }}
                      className={[
                        'flex-1 rounded-lg border px-3 py-2 text-sm',
                        mode === 'random'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      Zufall
                    </button>
                  </div>
                </div>

                {/* Anzahl Wochen */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-black sm:text-slate-800">
                  <label className="block text-sm font-medium text-slate-800">Anzahl Wochen</label>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, weeksCount - 1);
                        setWeeksCount(next);
                        setSelectedThemes((prev) => prev.slice(0, next));
                        setError(null);
                      }}
                      disabled={weeksCount <= 1}
                      className={[
                        'inline-flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-semibold shadow-sm transition',
                        weeksCount > 1
                          ? 'border-slate-300 bg-white text-slate-900 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 hover:border-slate-400 hover:shadow-xl cursor-pointer'
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed',
                      ].join(' ')}
                      aria-label="Eine Woche weniger"
                      title="Eine Woche weniger"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={1}
                      max={41}
                      value={weeksCount}
                      onChange={(e) => {
                        const raw = e.target.value;

                        if (raw === '') {
                          setWeeksCount(1);
                          setSelectedThemes((prev) => prev.slice(0, 1));
                          setError(null);
                          return;
                        }

                        const n = Math.floor(Number(raw));
                        const next = Number.isFinite(n) ? Math.min(upperWeeks, Math.max(1, n)) : 1;

                        setWeeksCount(next);
                        setSelectedThemes((prev) => prev.slice(0, next));
                        setError(null);
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm outline-none focus:border-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(upperWeeks, weeksCount + 1);
                        setWeeksCount(next);
                        setSelectedThemes((prev) => prev.slice(0, next));
                        setError(null);
                      }}
                      disabled={weeksCount >= upperWeeks}
                      className={[
                        'inline-flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-semibold shadow-sm transition',
                        weeksCount < upperWeeks
                          ? 'border-slate-300 bg-white text-slate-900 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 hover:border-slate-400 hover:shadow-xl cursor-pointer'
                          : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed',
                      ].join(' ')}
                      aria-label="Eine Woche mehr"
                      title="Eine Woche mehr"
                    >
                      +
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-slate-600">Pro Woche: Mo–Fr (5 Tagesimpulse).</p>
                </div>

                {/* Start */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-black sm:text-slate-800">
                  <label className="block text-sm font-medium text-slate-800">Start (bitte Montags starten)</label>
                  <input
                    type="date"
                    value={startMonday}
                    onChange={(e) => {
                      setStartMonday(e.target.value);
                      setError(null);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStartMonday(nextMondayISO())}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50"
                    >
                      Nächster Montag
                    </button>

                    <div className="self-center text-xs text-slate-600">{isMondayISO(startMonday) ? '✓ Montag' : '✕ kein Montag'}</div>
                  </div>
                </div>
              </div>

              {/* Aktionen */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {mode === 'random' && (
                  <button
                    type="button"
                    onClick={pickRandomThemes}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90"
                  >
                    Zufallsauswahl erzeugen
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-black hover:bg-slate-50"
                >
                  Auswahl löschen
                </button>

                <button
                  type="button"
                  onClick={clearUsedThemes}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 hover:bg-amber-100"
                >
                  genutzt löschen
                </button>

                <button
                  type="button"
                  onClick={onContinue}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Weiter
                </button>

                <div className="ml-auto text-sm text-black sm:text-slate-700">
                  Ausgewählt: <span className="font-semibold">{selectedThemes.length}</span> / {weeksCount}
                </div>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              )}

              {/* Themenliste */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-800">Themen (alphabetisch)</div>
                  <div className="text-xs text-slate-600">
                    {mode === 'manual'
                      ? canSelectMore
                        ? 'Du kannst noch auswählen.'
                        : 'Auswahl vollständig (Weitere Auswahl deaktiviert).'
                      : 'In Zufall: Auswahl wird durch Ziehung gesetzt, ist aber weiterhin änderbar.'}
                  </div>
                </div>

                <div className="h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-2" aria-label="Themenliste">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {sortedThemes.map((t) => {
                      const isAllowedInFree = !isFree || FREE_ALLOWED_THEMES.has(t.id);
                      const isSelected = selectedSet.has(t.id);
                      const isUsed = usedSet.has(t.id);

                      const disabled =
                        !isAllowedInFree || (mode === 'manual' && !isSelected && selectedThemes.length >= weeksCount);

                      const dimBecauseLimit =
                        (mode === 'manual' && !isSelected && selectedThemes.length >= weeksCount) ||
                        (mode === 'random' && selectedThemes.length > 0 && !isSelected);

                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (mode === 'random') return;
                              toggleTheme(t.id);
                            }}
                            className={[
                              'w-full rounded-xl border px-3 py-3 text-left text-sm transition',
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                              disabled || dimBecauseLimit ? 'cursor-not-allowed opacity-40' : '',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                                <img
                                  src={`/images/themes/${t.id}.jpg`}
                                  alt=""
                                  className="h-full w-auto object-contain"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/images/demo.jpg';
                                  }}
                                />
                              </div>

                              <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                                <div className="flex flex-col">
                                  <div className="text-base font-semibold leading-6 text-slate-900">
                                    Thema {String(t.id).match(/-(\d{2})-/)?.[1] ?? ''}
                                  </div>
                                  <div className="text-base font-semibold leading-6 text-slate-900">
                                    {displayTitle(t)}
                                  </div>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                  {isUsed && (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                                      genutzt
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="rounded-full border border-white/30 bg-white/10 px-2 py-0.5 text-xs text-white">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer: IMMER sichtbar + nicht transparent */}
            <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
              <div className="text-sm text-slate-800">
                <span className="text-base font-semibold">Deine Auswahl</span>{' '}
                <span className="font-medium">(Reihenfolge nach Auswahl mit Pfeiltasten frei veränderbar)</span>
              </div>

              {selectedThemes.length === 0 ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  Noch nichts ausgewählt.
                </div>
              ) : (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-[minmax(170px,220px)_1fr] border-b border-slate-200 bg-slate-50">
                    <div className="px-3 py-2 text-sm font-semibold text-slate-900">Datum</div>
                    <div className="px-3 py-2 text-sm font-semibold text-slate-900">Thema</div>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {selectedScheduleRows.map((item, i) => {
                      const isFirst = i === 0;
                      const isLast = i === selectedScheduleRows.length - 1;

                      return (
                        <div
                          key={`${item.id}-${i}`}
                          className="grid grid-cols-[minmax(170px,220px)_1fr] items-stretch"
                        >
                          <div className="flex items-center border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
                            {item.dateRange}
                          </div>

                          <div className="flex items-center justify-between gap-3 px-3 py-3">
                            <div className="min-w-0 text-sm font-medium text-slate-900">
                              <span className="block truncate">{item.title}</span>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => moveSelectedTheme(i, -1)}
                                disabled={isFirst}
                                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[#F29420] bg-[#F29420] px-2 py-1 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                                title="Hoch"
                                aria-label="Thema nach oben schieben"
                              >
                                ▲
                              </button>

                              <button
                                type="button"
                                onClick={() => moveSelectedTheme(i, 1)}
                                disabled={isLast}
                                className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[#F29420] bg-[#F29420] px-2 py-1 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                                title="Runter"
                                aria-label="Thema nach unten schieben"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onContinue}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Weiter
                </button>
              </div>
            </div>
          </div>
        </div>
      </BackgroundLayout>
    </RequireAuth>
  );
}

