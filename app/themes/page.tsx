'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import RequireAuth from '@/components/RequireAuth';
import { readCurrentUserPlan } from '@/lib/userPlan';
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
    return Object.values(input as Record<string, unknown>).filter((x): x is string => typeof x === 'string');
  }
  return [];
}

export default function ThemesPage() {
  const router = useRouter();

  const SETUP_KEY = 'as-courage.themeSetup.v1';

  const [isPlanC, setIsPlanC] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
  const [icalPref, setIcalPref] = useState(false);
  const [icalNotice, setIcalNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>('manual');
  const [weeksCount, setWeeksCount] = useState<number>(1);
  const [startMonday, setStartMonday] = useState<string>(nextMondayISO());
  const [setupLoaded, setSetupLoaded] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [usedThemes, setUsedThemes] = useState<string[]>([]);

  const upperWeeks = 41;

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

  const sortedThemes = useMemo(() => {
    return [...THEMES].sort((x, y) => sortDE(displayTitle(x), displayTitle(y)));
  }, []);

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
  }, [setupLoaded, isPlanC, icalPref, weeksCount, startMonday]);

  function moveSelectedTheme(from: number, dir: -1 | 1) {
    setSelectedThemes((prev) => {
      const to = Math.max(0, Math.min(prev.length - 1, from + dir));
      if (to === from) return prev;
      const next = moveItem(prev, from, to);

      try {
        writeLS(LS.selection, next);
      } catch {
        // egal
      }

      return next;
    });
  }

  useEffect(() => {
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

    const usedRaw = readLS<unknown>(LS.usedThemes, []);
    const usedArr = normalizeStringArray(usedRaw);
    writeLS(LS.usedThemes, usedArr);
    setUsedThemes(usedArr);

    const selRaw = readLS<unknown>(LS.selection, []);
    const selArr = normalizeStringArray(selRaw);
    setSelectedThemes(selArr.slice(0, Math.min(selArr.length, upperWeeks)));
    setSelectionLoaded(true);
    setSetupLoaded(true);
  }, []);

  useEffect(() => {
    if (!selectionLoaded) return;
    writeLS(LS.selection, selectedThemes);
  }, [selectionLoaded, selectedThemes]);

  const selectedSet = useMemo(() => new Set(selectedThemes), [selectedThemes]);
  const usedSet = useMemo(() => new Set(usedThemes), [usedThemes]);

  const canSelectMore = selectedThemes.length < weeksCount;
  const selectionComplete = weeksCount > 0 && selectedThemes.length >= weeksCount;
  const showThemesList = !selectionComplete;

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

    const pool = sortedThemes.map((t) => t.id);
    const n = Math.min(weeksCount, pool.length);
    const copy = [...pool];

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    const next = copy.slice(0, n);
    setSelectedThemes(next);
    writeLS(LS.selection, next);
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
        <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl px-2 py-2 sm:px-4 sm:py-3 lg:px-6">
          <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#F29420] bg-white/85 shadow-xl backdrop-blur-md">
            <div className="shrink-0 p-4 sm:p-6 lg:p-7">
              <header>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-900">
                      Thema der Woche <span className="text-slate-600">(Edition 1)</span>
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="text-base text-slate-900">
                        Aktuell:{' '}
                        <span className="font-semibold text-[#F29420]">
                          {currentUserPlan ? `Variante ${currentUserPlan}` : 'wird geladen'}
                        </span>
                      </div>

                      {!isPlanC && (
                        <Link
                          href="/account"
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm font-medium text-slate-900 shadow-md transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl cursor-pointer"
                          title="Zum Upgrade"
                        >
                          zum upgrade
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end">
                    <Link
                      href="https://thema-der-woche-kostenlos.vercel.app/version"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 hover:border-slate-400 hover:shadow-xl cursor-pointer"
                      title="Zur Begrüßungsseite"
                    >
                      zurück
                    </Link>

                    <div className="flex flex-col gap-2">
                      <div
                        role="button"
                        tabIndex={0}
                        className="text-left"
                        onClick={() => {
                          if (!isPlanC) {
                            setIcalNotice((prev) => (prev ? null : 'iCal ist in Variante C möglich.'));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (!isPlanC && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setIcalNotice((prev) => (prev ? null : 'iCal ist in Variante C möglich.'));
                          }
                        }}
                      >
                        <div
                          className={[
                            'flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-xs text-slate-900',
                            isPlanC && icalPref
                              ? 'border border-[#F29420] bg-orange-100'
                              : 'border border-orange-200 bg-orange-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#F29420]"
                            checked={isPlanC ? icalPref : false}
                            aria-disabled={!isPlanC}
                            onChange={(e) => {
                              if (!isPlanC) return;
                              setIcalPref(e.target.checked);
                              setIcalNotice(null);
                            }}
                          />
                          <span className="leading-5">
                            iCal aktivieren (nur in Variante C möglich)
                            <span className="block text-[11px] text-slate-700">
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
              </header>
            </div>

            <div
              className={[
                showThemesList
                  ? 'min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7'
                  : 'overflow-visible px-4 sm:px-6 lg:px-7',
              ].join(' ')}
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-black sm:text-slate-800">
                  <label className="block text-sm font-medium text-slate-800">Anzahl Wochen (Empfehlung max. 4)</label>

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
                        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-semibold shadow-sm transition',
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
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm outline-none focus:border-slate-400"
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
                        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-semibold shadow-sm transition',
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

                <div className="rounded-xl border border-slate-200 bg-white p-3 text-black sm:text-slate-800">
                  <label className="block text-sm font-medium text-slate-800">Start (bitte montags starten)</label>
                  <input
                    type="date"
                    value={startMonday}
                    onChange={(e) => {
                      setStartMonday(e.target.value);
                      setError(null);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStartMonday(nextMondayISO())}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs transition hover:bg-slate-50"
                    >
                      Nächster Montag
                    </button>

                    <div className="self-center text-xs text-slate-600">{isMondayISO(startMonday) ? '✓ Montag' : '✕ kein Montag'}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 text-black sm:text-slate-800">
                  <label className="block text-sm font-medium text-slate-800">Modus</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('manual');
                        setError(null);
                      }}
                      className={[
                        'rounded-lg border px-3 py-2 text-sm transition',
                        mode === 'manual'
                          ? 'border-[#F29420] bg-[#F29420] text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
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
                        'rounded-lg border px-3 py-2 text-sm transition',
                        mode === 'random'
                          ? 'border-[#F29420] bg-[#F29420] text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                      ].join(' ')}
                    >
                      Zufall
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 mb-4 flex flex-wrap items-center gap-2">
                {mode === 'random' && (
                  <button
                    type="button"
                    onClick={pickRandomThemes}
                    className="inline-flex h-[48px] cursor-pointer items-center rounded-xl border border-[#F29420] bg-[#F29420] px-4 py-0 text-sm text-white shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#E4891E] hover:bg-[#E4891E] hover:shadow-xl"
                  >
                    Zufallsauswahl erzeugen
                  </button>
                )}

                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex h-[48px] cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-0 text-sm text-black shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:shadow-xl"
                >
                  Auswahl aufheben
                </button>

                <button
                  type="button"
                  onClick={clearUsedThemes}
                  className="inline-flex h-[48px] cursor-pointer items-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-0 text-sm text-amber-900 shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-amber-400 hover:bg-amber-100 hover:shadow-xl"
                >
                  genutzt löschen
                </button>

                {selectionComplete && (
                  <button
                    type="button"
                    onClick={onContinue}
                    className="inline-flex h-[48px] cursor-pointer items-center rounded-xl border border-[#4EA72E] bg-[#4EA72E] px-5 py-0 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-xl"
                  >
                    Weiter
                  </button>
                )}

                <div className="ml-auto inline-flex h-[48px] items-center rounded-xl border border-[#F29420] bg-white px-4 py-0 text-base font-semibold text-slate-900">
                  Ausgewählt:&nbsp;<span className="font-semibold">{selectedThemes.length}</span>&nbsp;/&nbsp;{weeksCount}
                </div>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {error}
                </div>
              )}

              {showThemesList && (
                <div className="mt-4">
                  <div className="mb-3 rounded-2xl border border-[#F29420] bg-white p-4 text-base text-slate-700 shadow-sm">
                    <p>
                      Hier wählst du deine <span className="font-semibold text-slate-900">Themen</span> aus. Sobald die gewünschte{' '}
                      <span className="font-semibold text-slate-900">Anzahl</span> erreicht ist, wird die Themenliste automatisch
                      ausgeblendet. So erscheint <span className="font-semibold text-slate-900">„Deine Auswahl“</span> direkt im Blick.
                    </p>

                    <p className="mt-3">
                      Dort siehst du <span className="font-semibold text-slate-900">Bild</span>,{' '}
                      <span className="font-semibold text-slate-900">Titel</span> und{' '}
                      <span className="font-semibold text-slate-900">Zeitraum</span> deiner gewählten Themen. Mit den{' '}
                      <span className="font-semibold text-slate-900">Pfeiltasten</span> kannst du die Reihenfolge beliebig
                      verändern. Bereits genutzte <span className="font-semibold text-slate-900">Themen</span> werden markiert und können immer wieder genutzt werden.
                    </p>

                    <p className="mt-3">
                      Wähle genau <span className="font-semibold text-slate-900">{weeksCount}</span> Thema/Themen aus.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-2 sm:p-3" aria-label="Themenliste">
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {sortedThemes.map((t) => {
                        const isSelected = selectedSet.has(t.id);
                        const isUsed = usedSet.has(t.id);

                        const disabled = mode === 'manual' && !isSelected && selectedThemes.length >= weeksCount;

                        const dimBecauseLimit =
                          (mode === 'manual' && !isSelected && selectedThemes.length >= weeksCount) ||
                          (mode === 'random' && selectedThemes.length > 0 && !isSelected);

                        return (
                          <li key={t.id} className="min-w-0">
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (mode === 'random') return;
                                toggleTheme(t.id);
                              }}
                              className={[
                                'w-full min-w-0 rounded-xl border p-3 text-left transition',
                                isSelected
                                  ? 'border-[#F29420] bg-[#F29420] text-white'
                                  : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
                                disabled || dimBecauseLimit ? 'cursor-not-allowed opacity-40' : '',
                              ].join(' ')}
                            >
                              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                                <div className="h-32 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-32 sm:shrink-0">
                                  <img
                                    src={`/images/themes/${t.id}.jpg`}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/images/demo.jpg';
                                    }}
                                  />
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {isUsed && (
                                      <span
                                        className={[
                                          'rounded-full px-2 py-0.5 text-xs',
                                          isSelected
                                            ? 'border border-white/25 bg-white/10 text-white'
                                            : 'border border-amber-200 bg-amber-50 text-amber-800',
                                        ].join(' ')}
                                      >
                                        genutzt
                                      </span>
                                    )}

                                    {isSelected && (
                                      <span className="rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-xs text-white">
                                        ✓ ausgewählt
                                      </span>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div
                                      className={[
                                        'text-base font-semibold leading-6 break-words',
                                        isSelected ? 'text-white' : 'text-slate-900',
                                      ].join(' ')}
                                    >
                                      Thema {String(t.id).match(/-(\d{2})-/)?.[1] ?? ''}
                                    </div>
                                    <div
                                      className={[
                                        'text-base font-semibold leading-6 break-words',
                                        isSelected ? 'text-white' : 'text-slate-900',
                                      ].join(' ')}
                                    >
                                      {displayTitle(t)}
                                    </div>
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
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-7">
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
                  <div className="hidden border-b border-slate-200 bg-slate-50 sm:grid sm:grid-cols-[minmax(170px,220px)_1fr]">
                    <div className="px-3 py-2 text-sm font-semibold text-slate-900">Datum</div>
                    <div className="px-3 py-2 text-sm font-semibold text-slate-900">Thema</div>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {selectedScheduleRows.map((item, i) => {
                      const isFirst = i === 0;
                      const isLast = i === selectedScheduleRows.length - 1;

                      return (
                        <div key={`${item.id}-${i}`} className="grid grid-cols-1 sm:grid-cols-[minmax(170px,220px)_1fr]">
                          <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 sm:border-b-0 sm:border-r">
                            <div>
                              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:hidden">Datum</span>
                              {item.dateRange}
                            </div>
                          </div>

                          <div className="px-3 py-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:hidden">Thema</span>

                                <div className="flex min-w-0 items-center gap-4">
                                  <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                    <img
                                      src={`/images/themes/${item.id}.jpg`}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/images/demo.jpg';
                                      }}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="text-base font-semibold leading-6 break-words text-slate-900">
                                      Thema {String(item.id).match(/-(\d{2})-/)?.[1] ?? ''}
                                    </div>
                                    <div className="text-base font-semibold leading-6 break-words text-slate-900">
                                      {item.title}
                                    </div>
                                  </div>
                                </div>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                {selectionComplete && (
                  <button
                    type="button"
                    onClick={onContinue}
                    className="inline-flex h-[48px] items-center rounded-xl border border-[#4EA72E] bg-[#4EA72E] px-5 py-0 text-sm font-medium text-white transition hover:bg-[#3f8a25]"
                  >
                    Weiter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </BackgroundLayout>
    </RequireAuth>
  );
}