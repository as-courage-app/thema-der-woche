'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import { getAppMode, FREE_ALLOWED_THEMES, FREE_WEEKS_COUNT } from '@/lib/appMode';

// Datei muss liegen unter: app/data/edition1.json
import edition1 from '../data/edition1.json';

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

useEffect(() => {
  setAppMode(getAppMode());
}, []);

const isFree = appMode === 'free';
const upperWeeks = isFree ? FREE_WEEKS_COUNT : 41;

  const sortedThemes = useMemo(() => {
    return [...THEMES].sort((x, y) => sortDE(displayTitle(x), displayTitle(y)));
  }, []);

  const [mode, setMode] = useState<Mode>('manual');
  const [weeksCount, setWeeksCount] = useState<number>(4);
  const [startMonday, setStartMonday] = useState<string>(nextMondayISO());

  const [error, setError] = useState<string | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
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
  }, [upperWeeks]);

  // selection persistieren
  useEffect(() => {
    writeLS(LS.selection, selectedThemes);
  }, [selectedThemes]);

  const selectedSet = useMemo(() => new Set(selectedThemes), [selectedThemes]);
  const usedSet = useMemo(() => new Set(usedThemes), [usedThemes]);

  const canSelectMore = selectedThemes.length < weeksCount;

  function toggleTheme(id: string) {
    setError(null);
    setSelectedThemes((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  function clearSelection() {
    setError(null);
    setSelectedThemes([]);
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

  const selectedTitles = useMemo(() => {
    const map = new Map(sortedThemes.map((t) => [t.id, displayTitle(t)]));
    return selectedThemes.map((id) => map.get(id) ?? prettifyId(id));
  }, [selectedThemes, sortedThemes]);

  return (
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
                    href="/setup"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Neues Setup
                  </Link>

                  <Link
                    href="/"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Startseite
                  </Link>
                </div>
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
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />

                <p className="mt-1 text-xs text-slate-600">Pro Woche: Mo–Fr (5 Tagesimpulse).</p>
              </div>

              {/* Start */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-black sm:text-slate-800">
                <label className="block text-sm font-medium text-slate-800">Start (Montag)</label>
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
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-16 overflow-hidden rounded-lg bg-slate-100">
  <img
    src={`/images/themes/${t.id}.jpg`}
    alt=""
    className="h-full w-full object-cover object-center"
    onError={(e) => {
      (e.currentTarget as HTMLImageElement).src = '/images/demo.jpg';
    }}
  />
</div>

                              <div className="font-medium">{displayTitle(t)}</div>
                            </div>

                            <div className="flex gap-1">
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
            <div className="text-sm font-medium text-slate-800">Deine Auswahl</div>

            {selectedThemes.length === 0 ? (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                Noch nichts ausgewählt.
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTitles.map((title, i) => (
                  <span
                    key={`${title}-${i}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs"
                    title="Auswahl"
                  >
                    {title}
                  </span>
                ))}
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
  );
}
