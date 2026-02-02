'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import edition1 from '../data/edition1.json';

type EditionRow = {
  id: string;
  title?: string;
  quote: string;
  questions: string[];
};

type SetupState = {
  edition?: number;
  weeksCount?: number;
  startMonday?: string;
  mode?: 'manual' | 'random';
  themeIds?: string[];
  createdAt?: string;
};

const THEMES: EditionRow[] = edition1 as unknown as EditionRow[];
const LS_SETUP = 'as-courage.themeSetup.v1';

const BRAND_ORANGE = '#F3910A';

const WEEKDAYS = [
  { key: 'Mo', label: 'Montag', index: 0 },
  { key: 'Di', label: 'Dienstag', index: 1 },
  { key: 'Mi', label: 'Mittwoch', index: 2 },
  { key: 'Do', label: 'Donnerstag', index: 3 },
  { key: 'Fr', label: 'Freitag', index: 4 },
];

function readSetup(): SetupState | null {
  try {
    const raw = localStorage.getItem(LS_SETUP);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetupState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseIsoDate(iso?: string): Date | null {
  if (!iso || iso.length !== 10) return null;
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDE(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function prettifyId(id: string): string {
  // Entfernt technische Präfixe wie "Ed1", "01" usw.
  // Beispiel: "Ed1-01-anerkennung-1" → "Anerkennung 1"
  const cleaned = id
    .replace(/^ed\d+-\d+-/i, '')   // Ed1-01-
    .replace(/^ed\d+\s*/i, '')     // Ed1 
    .replace(/^\d+-/, '')          // 01-
    .replace(/-/g, ' ')            // Bindestriche → Leerzeichen
    .trim();

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function displayTitle(row: EditionRow): string {
  const t = row.title?.trim();
  return t && t.length > 0 ? t : prettifyId(row.id);
}

export default function QuotesPage() {
  const router = useRouter();

  const [setup, setSetup] = useState<SetupState | null>(null);
  const [activeDay, setActiveDay] = useState<Record<string, number>>({});
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Fallback: wenn themes/<id>.jpg fehlt -> demo.jpg
  const [imgFallbackToDemo, setImgFallbackToDemo] = useState<boolean>(false);

  useEffect(() => {
    const s = readSetup();
    setSetup(s);

    const ids = s?.themeIds ?? [];
    const initialDays: Record<string, number> = {};
    for (const id of ids) initialDays[id] = 0;
    setActiveDay(initialDays);

    setPageIndex(0);
    setImgFallbackToDemo(false);
  }, []);

  const selectedThemes = useMemo(() => {
    const ids = setup?.themeIds;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];

    const map = new Map<string, EditionRow>();
    for (const t of THEMES) map.set(t.id, t);

    return ids.map((id) => map.get(id)).filter(Boolean) as EditionRow[];
  }, [setup]);

  const totalPages = selectedThemes.length;
  const clampedIndex = totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0;
  const current: EditionRow | null = totalPages > 0 ? selectedThemes[clampedIndex] : null;

  const dateRangeText = useMemo(() => {
    const base = parseIsoDate(setup?.startMonday);
    if (!base) return '';
    const monday = addDays(base, clampedIndex * 7);
    const friday = addDays(monday, 4);
    return `${formatDE(monday)} – ${formatDE(friday)}`;
  }, [setup?.startMonday, clampedIndex]);

  const dayIndex = current ? activeDay[current.id] ?? 0 : 0;

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < totalPages - 1;

  function goPrev() {
    setPageIndex((p) => Math.max(0, p - 1));
    setImgFallbackToDemo(false);
  }

  function goNext() {
    setPageIndex((p) => Math.min(Math.max(0, totalPages - 1), p + 1));
    setImgFallbackToDemo(false);
  }

  const imageSrc = useMemo(() => {
    if (!current) return '/images/demo.jpg';
    if (imgFallbackToDemo) return '/images/demo.jpg';
    return `/images/themes/${current.id}.jpg`;
  }, [current, imgFallbackToDemo]);

  const currentTitle = current ? displayTitle(current) : '';

  return (
    <BackgroundLayout>
      <div className="mx-auto flex h-full max-w-6xl px-10 py-3">
        <div className="w-full max-h-[calc(100vh-10rem)] rounded-2xl bg-white/85 shadow-xl backdrop-blur-md overflow-hidden flex flex-col">
          {/* Kopf */}
          <div className="p-5 sm:p-7 shrink-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Zitate & Tagesimpulse</h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/themes')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                >
                  Themen ändern
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/setup')}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:opacity-90"
                >
                  Neues Setup
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canPrev}
                className={[
                  'rounded-xl px-4 py-2 text-sm border',
                  canPrev
                    ? 'border-slate-200 bg-white hover:bg-slate-50'
                    : 'border-slate-200 bg-white opacity-40 cursor-not-allowed',
                ].join(' ')}
              >
                Zurück
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                className={[
                  'rounded-xl px-4 py-2 text-sm border',
                  canNext
                    ? 'border-slate-200 bg-white hover:bg-slate-50'
                    : 'border-slate-200 bg-white opacity-40 cursor-not-allowed',
                ].join(' ')}
              >
                Weiter
              </button>

              <div className="ml-auto text-sm text-slate-700">
                {totalPages > 0 ? (
                  <>
                    Thema <span className="font-semibold">{clampedIndex + 1}</span> / {totalPages}
                    {dateRangeText ? (
                      <>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="font-medium">{dateRangeText}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  <span className="text-slate-600">Noch keine Themen ausgewählt.</span>
                )}
              </div>
            </div>
          </div>

          {/* Split-Bereich */}
          <div className="flex-1 min-h-0 px-5 pb-5 sm:px-7 sm:pb-7">
            {!current ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Ich finde noch keine ausgewählten Themen. Bitte gehe zur Themenauswahl und wähle Themen aus.
              </div>
            ) : (
              <div className="h-full rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="h-full flex flex-col lg:flex-row">
                  {/* LINKS: Bild */}
                  <div className="relative lg:w-1/2 bg-slate-100">
                    <div className="h-64 lg:h-full">
                      <img
                        src={imageSrc}
                        alt={`Bild zu ${currentTitle}`}
                        className="h-full w-full object-cover object-center"
                        onError={() => setImgFallbackToDemo(true)}
                      />
                    </div>
                  </div>

                  {/* RECHTS: Inhalt */}
                  <div className="lg:w-1/2 h-full overflow-auto">
                    <div className="p-5 lg:p-6">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">{currentTitle}</h2>
                        <div className="text-sm text-slate-600">
                          {dateRangeText ? <span className="font-medium">{dateRangeText}</span> : null}
                        </div>
                      </div>

                      <div
                        className="mt-3 sticky top-0 z-10 rounded-xl p-4 shadow"
                        style={{ backgroundColor: BRAND_ORANGE, color: '#ffffff' }}
                      >
                        <div className="text-xs uppercase tracking-wide opacity-90">Wochenzitat</div>
                        <div className="mt-1 text-lg font-semibold leading-relaxed">„{current.quote}“</div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {WEEKDAYS.map((d) => (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() =>
                              setActiveDay((prev) => ({
                                ...prev,
                                [current.id]: d.index,
                              }))
                            }
                            className={[
                              'rounded-full px-3 py-1.5 text-xs border',
                              dayIndex === d.index
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                            ].join(' ')}
                          >
                            {d.key}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-medium text-slate-800">{WEEKDAYS[dayIndex].label}</div>
                        <div className="mt-1 text-sm text-slate-900 leading-relaxed">
                          {current.questions?.[dayIndex] ?? '—'}
                        </div>
                      </div>

                      <div className="h-6" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
        </div>
      </div>
    </BackgroundLayout>
  );
}
