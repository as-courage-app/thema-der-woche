'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readCurrentUserPlan } from '@/lib/userPlan';
import BackgroundLayout from '../../components/BackgroundLayout';
import DetailsMenu from './DetailsMenu';
import edition1 from '../data/edition1.json';
import Link from 'next/link';
import PodcastMiniPlayer from '../../components/PodcastMiniPlayer';
import { podcastEpisodes } from '../../lib/podcastEpisodes';
import RequireAuth from '@/components/RequireAuth';
import MediathekMenu from './MediathekMenu';
import { SELECTED_PLAN_KEY } from '@/lib/storageKeys';
import { EmbeddedNotesHistoryCard } from '@/components/notes/NotesHistoryCard';

const LS_SETUP = 'as-courage.themeSetup.v1';

type EditionRow = {
  id: string;
  title?: string;
  quote: string;
  questions: string[];
};

type LicenseTier = 'A' | 'B' | 'C';

type SetupState = {
  edition?: number;
  weeksCount?: number;
  startMonday?: string;
  mode?: 'manual' | 'random';
  themeIds?: string[];
  createdAt?: string;

  // ✅ neu: für A/B/C-Logik (robust: akzeptiert alten + neuen Feldnamen)
  selectedLicenseTier?: LicenseTier;
  licenseTier?: LicenseTier;

  // ✅ neu: iCal Haken
  icalEnabled?: boolean;
};

const THEMES: EditionRow[] = edition1 as unknown as EditionRow[];

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
    const possibleKeys = [
      LS_SETUP, // as-courage.themeSetup.v1
      'as-courage.themeSetup', // ältere Variante
      'themeSetup',
      'setup',
      'as-courage.setup.v1',
    ];

    for (const k of possibleKeys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as SetupState;
      if (parsed && typeof parsed === 'object') return parsed;
    }

    return null;
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
  const cleaned = id
    .replace(/^ed\d+-\d+-/i, '') // Ed1-01-
    .replace(/^ed\d+\s*/i, '') // Ed1
    .replace(/^\d+-/, '') // 01-
    .replace(/-/g, ' ')
    .trim();

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function displayTitle(row: EditionRow): string {
  const t = row.title?.trim();
  return t && t.length > 0 ? t : prettifyId(row.id);
}

/** ✅ Download-Helfer */
function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ✅ Minimal gültige ICS (Platzhalter) – echte Inhalte bauen wir als nächsten Schritt */
function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function yyyymmdd(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function escapeIcsText(s: string) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function dtstampUtc() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  const hh = pad2(now.getUTCHours());
  const mm = pad2(now.getUTCMinutes());
  const ss = pad2(now.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * ✅ Erzeugt eine echte ICS-Datei nach deinen Regeln:
 * - ganztägig
 * - Mo–Fr: Thema + Zitat + Tagesfrage
 * - Sa/So: "Schönes Wochenende"
 */
function buildIcsFromPlan(setup: SetupState | null, selectedThemes: EditionRow[]): string {
  const stamp = dtstampUtc();
  const uidBase = `tdw-${stamp}-${Math.random().toString(16).slice(2)}`;

  const weeksCount = setup?.weeksCount ?? 0;
  const startIso = setup?.startMonday;

  const baseDate = parseIsoDate(startIso);
  if (!baseDate || weeksCount < 1 || selectedThemes.length === 0) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//as-courage//Thema der Woche//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  // Begrenzung: nicht mehr Wochen exportieren als Themen vorhanden sind
  const countWeeks = Math.min(weeksCount, selectedThemes.length);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//as-courage//Thema der Woche//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  let eventIndex = 0;

  for (let w = 0; w < countWeeks; w++) {
    const theme = selectedThemes[w];
    const weekMonday = addDays(baseDate, w * 7);
    const title = displayTitle(theme);
    const quote = theme.quote ?? '';

    // Mo–Fr
    for (let day = 0; day < 5; day++) {
      const date = addDays(weekMonday, day);
      const dtStart = yyyymmdd(date);
      const dtEnd = yyyymmdd(addDays(date, 1));

      const question = theme.questions?.[day] ?? '';
      const summary = `${title}: ${question || 'Tagesimpuls'}`;
      const desc = `Thema: ${title}\nZitat: ${quote}\nTagesfrage: ${question}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uidBase}-${eventIndex}@as-courage`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push('TRANSP:TRANSPARENT');
      lines.push(`SUMMARY:${escapeIcsText(summary)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
      lines.push('END:VEVENT');

      eventIndex++;
    }

    // Sa/So
    for (let day = 5; day < 7; day++) {
      const date = addDays(weekMonday, day);
      const dtStart = yyyymmdd(date);
      const dtEnd = yyyymmdd(addDays(date, 1));

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uidBase}-${eventIndex}@as-courage`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push('TRANSP:TRANSPARENT');
      lines.push(`SUMMARY:${escapeIcsText('Schönes Wochenende')}`);
      lines.push(`DESCRIPTION:${escapeIcsText('Schönes Wochenende!')}`);
      lines.push('END:VEVENT');

      eventIndex++;
    }
  }

  lines.push('END:VCALENDAR', '');
  return lines.join('\r\n');
}

export default function QuotesPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
  const [activeDay, setActiveDay] = useState<Record<string, number>>({});
  const [pageIndex, setPageIndex] = useState<number>(0);

  // Fallback: wenn themes/<id>.jpg fehlt -> demo.jpg
  const [imgFallbackToDemo, setImgFallbackToDemo] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;

    async function loadPageData() {
      const themeIdFromUrl = new URLSearchParams(window.location.search).get('themeId');
      const s = readSetup();
      const plan = await readCurrentUserPlan();

      if (!alive) return;

      setSetup(s);
      setCurrentUserPlan(plan);

      console.log('TDW setup:', s);
      console.log('TDW startMonday:', s?.startMonday);
      console.log('TDW weeksCount:', s?.weeksCount);
      console.log('TDW themeIds:', s?.themeIds);

      const ids = s?.themeIds ?? [];
      const initialDays: Record<string, number> = {};
      for (const id of ids) initialDays[id] = 0;
      setActiveDay(initialDays);

      const initialIndex = themeIdFromUrl ? ids.findIndex((id) => id === themeIdFromUrl) : -1;
      setPageIndex(initialIndex >= 0 ? initialIndex : 0);
      setImgFallbackToDemo(false);
    }

    loadPageData();

    return () => {
      alive = false;
    };
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

  const [showPodcast, setShowPodcast] = useState(false);
  const [podcastNotice, setPodcastNotice] = useState<string | null>(null);
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null);
  const [notesNotice, setNotesNotice] = useState<string | null>(null);
  const [showEmbeddedNotes, setShowEmbeddedNotes] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const currentThemeNumber = useMemo(() => {
    const id = current?.id ?? '';
    const m = id.match(/-(\d{1,2})-/);
    return m ? Number(m[1]) : null;
  }, [current?.id]);

  const currentEpisode = useMemo(() => {
    if (!currentThemeNumber) return null;
    return podcastEpisodes.find((ep) => ep.themeNumber === currentThemeNumber) ?? null;
  }, [currentThemeNumber]);

  const selectedPlanRaw =
    typeof window !== 'undefined' ? localStorage.getItem(SELECTED_PLAN_KEY) : null;

  const licenseTier: LicenseTier | undefined =
    selectedPlanRaw === 'A' || selectedPlanRaw === 'B' || selectedPlanRaw === 'C'
      ? selectedPlanRaw
      : setup?.selectedLicenseTier ?? setup?.licenseTier;
  const podcastAllowed =
    currentUserPlan === 'B' ||
    currentUserPlan === 'C' ||
    (!currentUserPlan && (licenseTier === 'B' || licenseTier === 'C'));
  const podcastReady =
    !!currentEpisode && currentThemeNumber !== null;

  const weekMondayDate = useMemo(() => {
    const base = parseIsoDate(setup?.startMonday);
    if (!base) return null;
    return addDays(base, clampedIndex * 7);
  }, [setup?.startMonday, clampedIndex]);

  const weekdayDateText = useMemo(() => {
    // liefert für Mo–Fr: "dd.mm.yyyy" passend zur aktuellen Woche
    if (!weekMondayDate) return (index: number) => '';
    return (index: number) => formatDE(addDays(weekMondayDate, index));
  }, [weekMondayDate]);

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
    setShowPodcast(false);
    setPageIndex((p) => Math.max(0, p - 1));
    setImgFallbackToDemo(false);
  }

  function goNext() {
    setShowPodcast(false);
    setPageIndex((p) => Math.min(Math.max(0, totalPages - 1), p + 1));
    setImgFallbackToDemo(false);
  }

  const imageSrc = useMemo(() => {
    if (!current) return '/images/demo.jpg';
    if (imgFallbackToDemo) return '/images/demo.jpg';
    return `/images/themes/${current.id}.jpg`;
  }, [current, imgFallbackToDemo]);

  const currentTitle = current ? displayTitle(current) : '';

  // ✅ Button nur bei C + iCal-Haken (robust: alter/neuer Feldname)
  const showIcalButton = useMemo(() => {
    return currentUserPlan === 'C' && Boolean(setup?.icalEnabled);
  }, [currentUserPlan, setup]);

  return (
    <RequireAuth>
      <BackgroundLayout activeThemeId={current?.id}>
        <div className="mx-auto flex h-full min-h-[100svh] lg:min-h-0 max-w-6xl px-10 py-3">
          <div className="w-full max-h-none rounded-none sm:rounded-2xl border-0 sm:border sm:border-[#F29420] bg-white/98 sm:bg-white/85 shadow-none sm:shadow-xl backdrop-blur-md min-h-[100dvh] sm:min-h-0 overflow-visible flex flex-col">
            {/* Kopf */}
            <div className="p-5 sm:p-7 shrink-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Thema der Woche <span className="text-slate-600">(Edition 1)</span>
                  </h1>

                  <div className="mt-2 text-base text-slate-900">
                    Aktuell:{' '}
                    <span className="font-semibold text-[#F29420]">
                      {currentUserPlan ? `Variante ${currentUserPlan}` : 'wird geladen'}
                    </span>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                  <div className="flex flex-wrap gap-2">

                    {currentUserPlan && currentUserPlan !== 'C' && (
                      <Link
                        href="/account"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm text-slate-900 shadow-md transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                        title="Zum Upgrade"
                      >
                        zum upgrade
                      </Link>
                    )}

                    {showIcalButton && (
                      <button
                        type="button"
                        onClick={() => {
                          const ics = buildIcsFromPlan(setup, selectedThemes);
                          downloadTextFile('thema-der-woche.ics', ics, 'text/calendar;charset=utf-8');
                        }}
                        className="rounded-xl border border-[#F29420] bg-[#F29420] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#E4891E]"
                        title="iCal-Datei herunterladen"
                      >
                        iCal herunterladen
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => router.push('/themes')}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#4EA72E] bg-[#4EA72E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg cursor-pointer"
                    >
                      zurück zur Themenauswahl
                    </button>

                  </div>

                </div>
              </div>

              {/* Navigation */}

              {podcastNotice || detailsNotice || notesNotice ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {podcastNotice ? (
                    <div className="inline-block max-w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="flex items-start justify-between gap-3">
                        <span>{podcastNotice}</span>
                        <button
                          type="button"
                          onClick={() => setPodcastNotice(null)}
                          className="rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {detailsNotice ? (
                    <div className="inline-block max-w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="flex items-start justify-between gap-3">
                        <span>{detailsNotice}</span>
                        <button
                          type="button"
                          onClick={() => setDetailsNotice(null)}
                          className="rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {notesNotice ? (
                    <div className="inline-block max-w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="flex items-start justify-between gap-3">
                        <span>{notesNotice}</span>
                        <button
                          type="button"
                          onClick={() => setNotesNotice(null)}
                          className="rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canPrev}
                  className={[
                    'min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium border shadow-sm transition duration-200',
                    canPrev
                      ? 'border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#3f8a25] hover:border-[#3f8a25] hover:shadow-lg cursor-pointer'
                      : 'border-slate-200 bg-white text-slate-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  zurück
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canNext}
                  className={[
                    'min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium border shadow-sm transition duration-200',
                    canNext
                      ? 'border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#3f8a25] hover:border-[#3f8a25] hover:shadow-lg cursor-pointer'
                      : 'border-slate-200 bg-white text-slate-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  weiter
                </button>

                <MediathekMenu
                  themeId={current?.id}
                  podcastAllowed={podcastAllowed}
                  podcastReady={podcastReady}
                  onPodcastClick={() => {
                    if (!podcastAllowed) {
                      setPodcastNotice((prev) =>
                        prev === 'Mediathek nur in Variante B oder C verfügbar.'
                          ? null
                          : 'Mediathek nur in Variante B oder C verfügbar.',
                      );
                      return;
                    }
                    if (!podcastReady) {
                      setPodcastNotice((prev) =>
                        prev === 'Podcastfolge in Bearbeitung und aktuell nicht verfügbar.'
                          ? null
                          : 'Podcastfolge in Bearbeitung und aktuell nicht verfügbar.',
                      );
                      return;
                    }
                    setPodcastNotice(null);
                    setShowPodcast((s) => !s);
                  }}
                />

                <DetailsMenu
                  themeId={current?.id}
                  currentUserPlan={currentUserPlan}
                  onBlockedClick={(message) => {
                    setDetailsNotice((prev) => (prev ? null : message));
                  }}
                />


                {currentUserPlan === 'B' || currentUserPlan === 'C' ? (
                  <button
                    type="button"
                    onClick={() => setShowEmbeddedNotes((prev) => !prev)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 hover:border-slate-400 hover:shadow-lg cursor-pointer"
                    title={showEmbeddedNotes ? 'Notizen ausblenden' : 'Notizen einblenden'}
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      📝
                    </span>{' '}
                    {showEmbeddedNotes ? 'Notizen ausblenden' : 'Notizen einblenden'}
                  </button>
                ) : (

                  <button
                    type="button"
                    onClick={() => {
                      setNotesNotice((prev) =>
                        prev === 'Notizen nur in Variante B oder C verfügbar.'
                          ? null
                          : 'Notizen nur in Variante B oder C verfügbar.',
                      );
                    }}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 hover:border-slate-400 hover:shadow-lg cursor-pointer"
                    title="Notizen öffnen"
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      📝
                    </span>{' '}
                    Notizen
                  </button>
                )}

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

            {showPodcast && podcastAllowed && currentEpisode ? (
              <PodcastMiniPlayer
                src={currentEpisode.audioSrc}
                title={(() => {
                  const src = currentEpisode.audioSrc || '';
                  const match = src.match(/thema-(\d+)\.mp3$/i);
                  const nr = match ? Number(match[1]) : NaN;

                  if (!Number.isFinite(nr)) return currentEpisode.title;

                  const prefix = `ed1-${String(nr).padStart(2, '0')}-`;
                  const theme = (edition1 as any[]).find((t) =>
                    String(t?.id ?? '').startsWith(prefix)
                  );

                  return theme?.title?.trim() || currentEpisode.title || `Podcast Folge ${nr}`;
                })()}
              />
            ) : null}

            {/* Split-Bereich */}
            <div className="flex-1 min-h-0 overflow-auto lg:overflow-hidden px-5 pb-5 sm:px-7 sm:pb-7">
              {!current ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Ich finde noch keine ausgewählten Themen. Bitte gehe zur Themenauswahl und wähle Themen aus.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white lg:h-full lg:overflow-hidden">
                  <div className="flex flex-col lg:flex-row">
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
                    <div className="lg:w-1/2 lg:h-full lg:overflow-auto">
                      <div className="p-5 lg:p-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h2 className="text-lg font-semibold text-slate-900">{currentTitle}</h2>
                          <div className="text-sm text-slate-600">
                            {dateRangeText ? <span className="font-medium">{dateRangeText}</span> : null}
                          </div>
                        </div>

                        <div
                          className="mt-3 sticky top-0 z-10 rounded-xl border-2 bg-slate-50 p-4 shadow-sm"
                          style={{ borderColor: BRAND_ORANGE }}
                        >
                          <div className="text-lg font-semibold tracking-wide text-slate-900">Wochenzitat</div>
                          <div className="mt-2 text-lg leading-relaxed text-slate-900">„{current.quote}“</div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
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
                                'w-full rounded-2xl px-3 py-2 text-sm border shadow-sm transition duration-200 cursor-pointer',
                                dayIndex === d.index
                                  ? 'bg-[#4EA72E] text-white border-[#4EA72E] hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#3f8a25] hover:border-[#3f8a25] hover:shadow-md'
                                  : 'bg-white text-slate-700 border-slate-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-50 hover:border-slate-300 hover:shadow-md',
                              ].join(' ')}
                            >
                              <span className="flex flex-col items-center leading-tight">
                                <span className="font-medium">{d.key}</span>
                                <span className="text-xs opacity-80">{weekdayDateText(d.index)}</span>
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 rounded-xl border-2 border-[#F29420] bg-slate-50 p-5">
                          <div className="text-lg font-semibold text-slate-900">{WEEKDAYS[dayIndex].label}</div>
                          <div className="mt-2 text-lg leading-relaxed text-slate-900">
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

            {showEmbeddedNotes && current?.id ? (
              <div className="px-5 pb-5 sm:px-7 sm:pb-7">
                <EmbeddedNotesHistoryCard
                  themeId={current.id}
                  onClose={() => setShowEmbeddedNotes(false)}
                />
              </div>
            ) : null}

            {/* Footer */}
          </div>
        </div>
      </BackgroundLayout>
    </RequireAuth>
  );
}
