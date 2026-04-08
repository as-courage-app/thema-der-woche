'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { EmbeddedNotesHistoryCard } from '@/components/notes/NotesHistoryCard';

const LS_SETUP = 'as-courage.themeSetup.v1';
const LS_EDITOR2_DRAFTS = 'as-courage.icalEditor2Drafts.v1';
const LS_EDITOR2_VISIBILITY = 'as-courage.icalEditor2Visibility.v1';

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
  selectedLicenseTier?: LicenseTier;
  licenseTier?: LicenseTier;
  icalEnabled?: boolean;
};

type DayKey = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr' | 'Sa' | 'So';

type InlineIcalDraftState = Record<string, string>;
type InlineIcalVisibilityState = Record<string, boolean>;

const THEMES: EditionRow[] = edition1 as unknown as EditionRow[];

const BRAND_ORANGE = '#F3910A';
const EDITOR_RED = '#8B1E2D';
const EXPORT_BLUE = '#2563EB';

const DISPLAY_DAYS: { key: DayKey; label: string; index: number }[] = [
  { key: 'Mo', label: 'Montag', index: 0 },
  { key: 'Di', label: 'Dienstag', index: 1 },
  { key: 'Mi', label: 'Mittwoch', index: 2 },
  { key: 'Do', label: 'Donnerstag', index: 3 },
  { key: 'Fr', label: 'Freitag', index: 4 },
  { key: 'Sa', label: 'Samstag', index: 5 },
  { key: 'So', label: 'Sonntag', index: 6 },
];

function readSetup(): SetupState | null {
  try {
    const possibleKeys = [
      LS_SETUP,
      'as-courage.themeSetup',
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

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
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
    .replace(/^ed\d+-\d+-/i, '')
    .replace(/^ed\d+\s*/i, '')
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
    .trim();

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function displayTitle(row: EditionRow): string {
  const t = row.title?.trim();
  return t && t.length > 0 ? t : prettifyId(row.id);
}

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

function buildInlineIcalDraftKey(themeId: string, weekIndex: number, dayKey: DayKey) {
  return `${themeId}__${weekIndex}__${dayKey}`;
}

function getDefaultDayText(theme: EditionRow, day: { key: DayKey; index: number }) {
  if (day.key === 'Sa' || day.key === 'So') return 'Schönes Wochenende';
  return theme.questions?.[day.index] ?? '—';
}

function buildIcsFromPlan(
  setup: SetupState | null,
  selectedThemes: EditionRow[],
  inlineDrafts: InlineIcalDraftState = {},
  inlineVisibility: InlineIcalVisibilityState = {},
): string {
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
      'X-WR-CALNAME:Teamkalender',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  const countWeeks = Math.min(weeksCount, selectedThemes.length);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//as-courage//Thema der Woche//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Teamkalender',
    'X-WR-CALDESC:Thema der Woche – Teamkalender',
  ];

  let eventIndex = 0;

  for (let w = 0; w < countWeeks; w++) {
    const theme = selectedThemes[w];
    const weekMonday = addDays(baseDate, w * 7);
    const title = displayTitle(theme);
    const quote = theme.quote ?? '';

    for (const day of DISPLAY_DAYS) {
      const draftKey = buildInlineIcalDraftKey(theme.id, w, day.key);
      const isVisible = inlineVisibility[draftKey] ?? true;
      if (!isVisible) continue;

      const date = addDays(weekMonday, day.index);
      const dtStart = yyyymmdd(date);
      const dtEnd = yyyymmdd(addDays(date, 1));
      const text = inlineDrafts[draftKey] ?? getDefaultDayText(theme, day);
      const summary = `${title}: ${text || day.label}`;
      const description =
        day.key === 'Sa' || day.key === 'So'
          ? `Thema: ${title}\nZitat: ${quote}\nWochenendhinweis: ${text}`
          : `Thema: ${title}\nZitat: ${quote}\nTagesimpuls: ${text}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uidBase}-${eventIndex}@as-courage`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push('TRANSP:TRANSPARENT');
      lines.push(`SUMMARY:${escapeIcsText(summary)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
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
  const [imgFallbackToDemo, setImgFallbackToDemo] = useState<boolean>(false);

  const [showPodcast, setShowPodcast] = useState(false);
  const [podcastNotice, setPodcastNotice] = useState<string | null>(null);
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null);
  const [icalNotice, setIcalNotice] = useState<string | null>(null);
  const [notesNotice, setNotesNotice] = useState<string | null>(null);

  const [showEmbeddedNotes, setShowEmbeddedNotes] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [inlineIcalDrafts, setInlineIcalDrafts] = useState<InlineIcalDraftState>({});
  const [inlineIcalVisibility, setInlineIcalVisibility] = useState<InlineIcalVisibilityState>({});
  const [editorStateLoaded, setEditorStateLoaded] = useState(false);

  const notesBlockRef = useRef<HTMLDivElement | null>(null);
  const pendingNotesScrollRef = useRef(false);

  useEffect(() => {
    let alive = true;

    async function loadPageData() {
      const themeIdFromUrl = new URLSearchParams(window.location.search).get('themeId');
      const s = readSetup();
      const plan = await readCurrentUserPlan();
      const storedDrafts = readLocalJson<InlineIcalDraftState>(LS_EDITOR2_DRAFTS, {});
      const storedVisibility = readLocalJson<InlineIcalVisibilityState>(LS_EDITOR2_VISIBILITY, {});

      if (!alive) return;

      setSetup(s);
      setCurrentUserPlan(plan);
      setInlineIcalDrafts(storedDrafts);
      setInlineIcalVisibility(storedVisibility);
      setEditorStateLoaded(true);

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

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!showEmbeddedNotes) return;
    if (!pendingNotesScrollRef.current) return;

    const node = notesBlockRef.current;
    if (!node) return;

    pendingNotesScrollRef.current = false;

    requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [showEmbeddedNotes]);

  useEffect(() => {
    if (!editorStateLoaded) return;
    localStorage.setItem(LS_EDITOR2_DRAFTS, JSON.stringify(inlineIcalDrafts));
  }, [inlineIcalDrafts, editorStateLoaded]);

  useEffect(() => {
    if (!editorStateLoaded) return;
    localStorage.setItem(LS_EDITOR2_VISIBILITY, JSON.stringify(inlineIcalVisibility));
  }, [inlineIcalVisibility, editorStateLoaded]);

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

  const currentThemeNumber = useMemo(() => {
    const id = current?.id ?? '';
    const m = id.match(/-(\d{1,2})-/);
    return m ? Number(m[1]) : null;
  }, [current?.id]);

  const currentEpisode = useMemo(() => {
    if (!currentThemeNumber) return null;
    return podcastEpisodes.find((ep) => ep.themeNumber === currentThemeNumber) ?? null;
  }, [currentThemeNumber]);

  const licenseTier: LicenseTier | undefined = setup?.selectedLicenseTier ?? setup?.licenseTier;

  const podcastAllowed =
    currentUserPlan === 'B' ||
    currentUserPlan === 'C' ||
    (!currentUserPlan && (licenseTier === 'B' || licenseTier === 'C'));

  const podcastReady = !!currentEpisode && currentThemeNumber !== null;

  const weekMondayDate = useMemo(() => {
    const base = parseIsoDate(setup?.startMonday);
    if (!base) return null;
    return addDays(base, clampedIndex * 7);
  }, [setup?.startMonday, clampedIndex]);

  const weekdayDateText = useMemo(() => {
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

  useEffect(() => {
    if (!current?.id) return;

    setInlineIcalDrafts((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const day of DISPLAY_DAYS) {
        const draftKey = buildInlineIcalDraftKey(current.id, clampedIndex, day.key);
        if (!(draftKey in next)) {
          next[draftKey] = getDefaultDayText(current, day);
          changed = true;
        }
      }

      return changed ? next : prev;
    });

    setInlineIcalVisibility((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const day of DISPLAY_DAYS) {
        const draftKey = buildInlineIcalDraftKey(current.id, clampedIndex, day.key);
        if (!(draftKey in next)) {
          next[draftKey] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [current?.id, current?.questions, clampedIndex]);

  const dayIndex = current ? activeDay[current.id] ?? 0 : 0;
  const currentDayConfig = DISPLAY_DAYS[dayIndex] ?? DISPLAY_DAYS[0];

  const currentDraftKey = current
    ? buildInlineIcalDraftKey(current.id, clampedIndex, currentDayConfig.key)
    : null;

  const currentDefaultText =
    current && currentDayConfig ? getDefaultDayText(current, currentDayConfig) : '—';

  const currentDisplayText =
    currentDraftKey && current ? inlineIcalDrafts[currentDraftKey] ?? currentDefaultText : '—';

  const currentDayVisible = currentDraftKey ? (inlineIcalVisibility[currentDraftKey] ?? true) : true;
  const currentDayEdited = currentDisplayText !== currentDefaultText;

  const currentTitle = current ? displayTitle(current) : '';

  const imageSrc = useMemo(() => {
    if (!current) return '/images/demo.jpg';
    if (imgFallbackToDemo) return '/images/demo.jpg';
    return `/images/themes/${current.id}.jpg`;
  }, [current, imgFallbackToDemo]);

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < totalPages - 1;

  const activeExportDays = useMemo(() => {
    if (!current) return [];

    return DISPLAY_DAYS.filter((day) => {
      const draftKey = buildInlineIcalDraftKey(current.id, clampedIndex, day.key);
      return inlineIcalVisibility[draftKey] ?? true;
    });
  }, [current, clampedIndex, inlineIcalVisibility]);

  function updateInlineIcalDraft(themeId: string, weekIndex: number, dayKey: DayKey, value: string) {
    const draftKey = buildInlineIcalDraftKey(themeId, weekIndex, dayKey);

    setInlineIcalDrafts((prev) => ({
      ...prev,
      [draftKey]: value,
    }));
  }

  function toggleInlineIcalVisibility(themeId: string, weekIndex: number, dayKey: DayKey) {
    const draftKey = buildInlineIcalDraftKey(themeId, weekIndex, dayKey);

    setInlineIcalVisibility((prev) => ({
      ...prev,
      [draftKey]: !(prev[draftKey] ?? true),
    }));
  }

  function resetCurrentDay() {
    if (!current) return;

    updateInlineIcalDraft(current.id, clampedIndex, currentDayConfig.key, currentDefaultText);
  }

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

  function toggleEditMode() {
    if (currentUserPlan !== 'C') {
      setIcalNotice((prev) =>
        prev === 'iCal ist in Variante C verfügbar.' ? null : 'iCal ist in Variante C verfügbar.',
      );
      return;
    }

    setIcalNotice(null);
    setIsEditMode((prev) => !prev);
  }

  function downloadTeamCalendar() {
    const ics = buildIcsFromPlan(setup, selectedThemes, inlineIcalDrafts, inlineIcalVisibility);
    downloadTextFile('Teamkalender.ics', ics, 'text/calendar;charset=utf-8');
  }

  return (
    <RequireAuth>
      <BackgroundLayout activeThemeId={current?.id}>
        <div className="mx-auto flex h-full max-w-6xl min-h-[100svh] px-10 py-3 lg:min-h-0">
          <div
            className={[
              'flex min-h-[100dvh] w-full max-h-none flex-col overflow-visible rounded-none border-0 shadow-none backdrop-blur-md sm:min-h-0 sm:rounded-2xl sm:border sm:shadow-xl',
              isEditMode ? 'bg-white/95 sm:border-[#8B1E2D]' : 'bg-white/98 sm:border-[#F29420] sm:bg-white/85',
            ].join(' ')}
          >
            <div className="shrink-0 p-5 sm:p-7">
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
                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm text-slate-900 shadow-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                        title="Zum Upgrade"
                      >
                        zum upgrade
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => router.push('/themes')}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#4EA72E] bg-[#4EA72E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg"
                    >
                      zurück zur Themenauswahl
                    </button>
                  </div>
                </div>
              </div>

              {podcastNotice || detailsNotice || icalNotice || notesNotice ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {podcastNotice ? (
                    <div className="inline-block max-w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="flex items-start justify-between gap-3">
                        <span>{podcastNotice}</span>
                        <button
                          type="button"
                          onClick={() => setPodcastNotice(null)}
                          className="cursor-pointer rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
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
                          className="cursor-pointer rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {icalNotice ? (
                    <div className="inline-block max-w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="flex items-start justify-between gap-3">
                        <span>{icalNotice}</span>
                        <button
                          type="button"
                          onClick={() => setIcalNotice(null)}
                          className="cursor-pointer rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
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
                          className="cursor-pointer rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div
                className={[
                  'mt-4 flex flex-wrap items-center gap-2 rounded-2xl border p-3',
                  isEditMode ? 'border-[#8B1E2D]/30 bg-[#8B1E2D]/5' : 'border-slate-200 bg-white',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canPrev}
                  className={[
                    'min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition duration-200',
                    canPrev
                      ? 'cursor-pointer border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg'
                      : 'cursor-not-allowed border-slate-200 bg-white text-slate-400',
                  ].join(' ')}
                >
                  zurück
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canNext}
                  className={[
                    'min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition duration-200',
                    canNext
                      ? 'cursor-pointer border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg'
                      : 'cursor-not-allowed border-slate-200 bg-white text-slate-400',
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
                        prev === 'Mediathek in Variante B und C verfügbar.'
                          ? null
                          : 'Mediathek in Variante B und C verfügbar.',
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

                {totalPages > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentUserPlan !== 'C') {
                          setIcalNotice((prev) =>
                            prev === 'iCal ist in Variante C verfügbar.'
                              ? null
                              : 'iCal ist in Variante C verfügbar.',
                          );
                          return;
                        }

                        setIcalNotice(null);
                        downloadTeamCalendar();
                      }}
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#2563EB] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#1D4ED8] hover:bg-[#1D4ED8] hover:shadow-lg"
                      title={isEditMode ? 'Bearbeiteten Teamkalender herunterladen' : 'Teamkalender als Standard herunterladen'}
                    >
                      <span aria-hidden="true" className="text-base leading-none">
                        ⬇️
                      </span>
                      {isEditMode ? 'Teamkalender herunterladen' : 'iCal herunterladen (Standard)'}
                    </button>

                    <button
                      type="button"
                      onClick={toggleEditMode}
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#8B1E2D] bg-[#8B1E2D] px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#741827] hover:bg-[#741827] hover:shadow-lg"
                      title="Bearbeitungsmodus umschalten"
                    >
                      <span aria-hidden="true" className="text-base leading-none">
                        ✏️
                      </span>
                      {isEditMode ? 'Editor ausblenden' : 'Editor einblenden'}
                    </button>
                  </>
                ) : null}

                {currentUserPlan === 'B' || currentUserPlan === 'C' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!showEmbeddedNotes) {
                        pendingNotesScrollRef.current = true;
                        setShowEmbeddedNotes(true);
                        return;
                      }

                      pendingNotesScrollRef.current = false;
                      setShowEmbeddedNotes(false);
                    }}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:shadow-lg"
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
                        prev === 'Notizen in Variante B und C verfügbar.'
                          ? null
                          : 'Notizen in Variante B und C verfügbar.',
                      );
                    }}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:shadow-lg"
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
                  const theme = (edition1 as any[]).find((t) => String(t?.id ?? '').startsWith(prefix));

                  return theme?.title?.trim() || currentEpisode.title || `Podcast Folge ${nr}`;
                })()}
              />
            ) : null}

            <div
              className={
                showEmbeddedNotes
                  ? 'px-5 pb-5 sm:px-7 sm:pb-7'
                  : 'flex-1 min-h-0 overflow-auto px-5 pb-5 sm:px-7 sm:pb-7 lg:overflow-hidden'
              }
            >
              {!current ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Ich finde noch keine ausgewählten Themen. Bitte gehe zur Themenauswahl und wähle Themen aus.
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div
                    className={[
                      'rounded-2xl bg-white',
                      showEmbeddedNotes || isEditMode
                        ? 'border shadow-sm'
                        : 'border border-slate-200 lg:h-full lg:overflow-hidden',
                      isEditMode ? 'border-[#8B1E2D]' : 'border-slate-200',
                    ].join(' ')}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start">
                      <div className="lg:w-1/2 lg:self-start">
                        <div className="relative bg-slate-100">
                          <div className="flex items-center justify-center p-4 lg:p-5">
                            <img
                              src={imageSrc}
                              alt={`Bild zu ${currentTitle}`}
                              className="h-auto w-full object-contain"
                              onError={() => setImgFallbackToDemo(true)}
                            />
                          </div>
                        </div>

                        {isEditMode ? (
                          <div className="space-y-4 p-4 lg:p-5">
                            <div className="rounded-2xl border border-[#8B1E2D] bg-white p-5 shadow-sm">
                              <div className="text-sm font-semibold uppercase tracking-wide text-[#8B1E2D]">
                                Schulferien
                              </div>
                              <div className="mt-3 text-sm leading-relaxed text-slate-700">
                                Dieser Bereich ist als ruhiger Hinweisbereich vorbereitet. Er gehört nicht automatisch
                                zum Export und soll später eine bewusste Übernahme unterstützen.
                              </div>
                            </div>

                            <div className="rounded-2xl border border-[#8B1E2D] bg-white p-5 shadow-sm">
                              <div className="text-sm font-semibold uppercase tracking-wide text-[#8B1E2D]">
                                Nationale Feiertage
                              </div>
                              <div className="mt-3 text-sm leading-relaxed text-slate-700">
                                Feiertage werden hier bewusst nur als zusätzliche Orientierung gedacht. Exportiert wird
                                weiterhin nur der aktive Text im Tagesbereich oben.
                              </div>
                            </div>

                            <div className="rounded-2xl border border-[#8B1E2D] bg-white p-5 shadow-sm">
                              <div className="text-sm font-semibold uppercase tracking-wide text-[#8B1E2D]">
                                Interkulturelle Hinweise
                              </div>
                              <div className="mt-3 text-sm leading-relaxed text-slate-700">
                                Auch dieser Bereich ist als getrennte Hinweisfläche vorbereitet. So bleibt klar
                                sichtbar, was exportiert wird und was nur als Denkstütze dient.
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div
                        className={[
                          'lg:w-1/2 lg:overflow-auto',
                          isEditMode ? 'bg-[#8B1E2D]/5' : '',
                        ].join(' ')}
                      >
                        <div className="p-5 lg:p-6">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="text-lg font-semibold text-slate-900">{currentTitle}</h2>
                            <div className="text-sm text-slate-600">
                              {dateRangeText ? <span className="font-medium">{dateRangeText}</span> : null}
                            </div>
                          </div>

                          {isEditMode ? (
                            <div className="mt-4 rounded-2xl border border-[#8B1E2D] bg-[#8B1E2D]/10 px-4 py-3 text-sm text-slate-900">
                              <div className="font-semibold text-[#8B1E2D]">Bearbeitungsmodus</div>
                              <div className="mt-1">
                                Die Quotes-Ansicht bleibt die Hauptbühne. Du bearbeitest jetzt direkt den exportierten
                                Tagesimpuls oder den Wochenendhinweis.
                              </div>
                            </div>
                          ) : null}

                          <div
                            className="sticky top-0 z-10 mt-4 rounded-xl border-2 p-4 shadow-sm"
                            style={{
                              borderColor: isEditMode ? EDITOR_RED : BRAND_ORANGE,
                              backgroundColor: isEditMode ? 'rgba(139, 30, 45, 0.06)' : '#F8FAFC',
                            }}
                          >
                            <div className="text-lg font-semibold tracking-wide text-slate-900">Wochenzitat</div>
                            <div className="mt-2 text-lg leading-relaxed text-slate-900">„{current.quote}“</div>
                          </div>

                          <div className="mt-4 space-y-2">
                            <div className="grid grid-cols-5 gap-2">
                              {DISPLAY_DAYS.slice(0, 5).map((d) => {
                                const draftKey = buildInlineIcalDraftKey(current.id, clampedIndex, d.key);
                                const isVisibleInExport = inlineIcalVisibility[draftKey] ?? true;
                                const isActiveDay = dayIndex === d.index;

                                return (
                                  <div
                                    key={d.key}
                                    className={[
                                      'flex w-full items-stretch rounded-2xl border text-sm shadow-sm transition duration-200',
                                      isEditMode
                                        ? isActiveDay
                                          ? 'border-[#8B1E2D] bg-[#8B1E2D] text-white'
                                          : isVisibleInExport
                                            ? 'border-[#8B1E2D]/40 bg-[#8B1E2D]/12 text-[#8B1E2D]'
                                            : 'border-slate-200 bg-white text-slate-700'
                                        : isActiveDay
                                          ? 'border-[#4EA72E] bg-[#4EA72E] text-white'
                                          : 'border-slate-200 bg-white text-slate-700',
                                    ].join(' ')}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveDay((prev) => ({
                                          ...prev,
                                          [current.id]: d.index,
                                        }))
                                      }
                                      className="flex min-h-[56px] flex-1 cursor-pointer items-center px-3 py-2 text-left transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02]"
                                    >
                                      <span className="font-medium">{d.key}</span>
                                    </button>

                                    {isEditMode ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleInlineIcalVisibility(current.id, clampedIndex, d.key)}
                                        className={[
                                          'mr-2 self-center inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border text-[11px] font-bold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.04]',
                                          isVisibleInExport
                                            ? 'border-[#2563EB] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                                            : 'border-slate-300 bg-white text-transparent hover:border-[#2563EB] hover:bg-slate-50',
                                        ].join(' ')}
                                        title={
                                          isVisibleInExport
                                            ? 'Im Export ausgewählt – zum Ausblenden klicken'
                                            : 'Nicht im Export ausgewählt – zum Einblenden klicken'
                                        }
                                        aria-pressed={isVisibleInExport}
                                      >
                                        ✓
                                      </button>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:max-w-[40%]">
                              {DISPLAY_DAYS.slice(5).map((d) => {
                                const draftKey = buildInlineIcalDraftKey(current.id, clampedIndex, d.key);
                                const isVisibleInExport = inlineIcalVisibility[draftKey] ?? true;
                                const isActiveDay = dayIndex === d.index;

                                return (
                                  <div
                                    key={d.key}
                                    className={[
                                      'flex w-full items-stretch rounded-2xl border text-sm shadow-sm transition duration-200',
                                      isEditMode
                                        ? isActiveDay
                                          ? 'border-[#8B1E2D] bg-[#8B1E2D] text-white'
                                          : isVisibleInExport
                                            ? 'border-[#8B1E2D]/40 bg-[#8B1E2D]/12 text-[#8B1E2D]'
                                            : 'border-slate-200 bg-white text-slate-700'
                                        : isActiveDay
                                          ? 'border-[#4EA72E] bg-[#4EA72E] text-white'
                                          : 'border-slate-200 bg-white text-slate-700',
                                    ].join(' ')}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveDay((prev) => ({
                                          ...prev,
                                          [current.id]: d.index,
                                        }))
                                      }
                                      className="flex min-h-[56px] flex-1 cursor-pointer items-center px-3 py-2 text-left transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02]"
                                    >
                                      <span className="font-medium">{d.key}</span>
                                    </button>

                                    {isEditMode ? (
                                      <button
                                        type="button"
                                        onClick={() => toggleInlineIcalVisibility(current.id, clampedIndex, d.key)}
                                        className={[
                                          'mr-2 self-center inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border text-[11px] font-bold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.04]',
                                          isVisibleInExport
                                            ? 'border-[#2563EB] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                                            : 'border-slate-300 bg-white text-transparent hover:border-[#2563EB] hover:bg-slate-50',
                                        ].join(' ')}
                                        title={
                                          isVisibleInExport
                                            ? 'Im Export ausgewählt – zum Ausblenden klicken'
                                            : 'Nicht im Export ausgewählt – zum Einblenden klicken'
                                        }
                                        aria-pressed={isVisibleInExport}
                                      >
                                        ✓
                                      </button>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div
                            className={[
                              'mt-3 rounded-xl border-2 p-5',
                              isEditMode ? 'border-[#8B1E2D] bg-white' : 'border-[#F29420] bg-slate-50',
                            ].join(' ')}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="text-lg font-semibold text-slate-900">{currentDayConfig.label}</div>

                                <div className="mt-2 text-sm text-slate-600">
                                  {weekdayDateText(currentDayConfig.index)}
                                </div>
                              </div>

                              {isEditMode ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={resetCurrentDay}
                                    disabled={!currentDayEdited}
                                    className={[
                                      'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#8B1E2D] bg-white px-4 py-2 text-sm font-semibold text-[#8B1E2D] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#741827] hover:bg-slate-50 hover:shadow-lg',
                                      !currentDayEdited
                                        ? 'cursor-not-allowed opacity-40 hover:translate-y-0 hover:scale-100 hover:bg-white hover:shadow-sm'
                                        : '',
                                    ].join(' ')}
                                  >
                                    Standard wiederherstellen
                                  </button>
                                </div>
                              ) : null}
                            </div>

                            {isEditMode ? (
                              <div className="mt-4 rounded-xl border border-[#8B1E2D] bg-[#8B1E2D]/5 p-4">
                                <div className="text-sm font-semibold text-slate-900">
                                  {currentDayConfig.key === 'Sa' || currentDayConfig.key === 'So'
                                    ? 'Wochenendhinweis'
                                    : 'Tagesimpuls'}
                                </div>

                                <textarea
                                  value={currentDisplayText}
                                  onChange={(event) => {
                                    if (!current) return;
                                    updateInlineIcalDraft(
                                      current.id,
                                      clampedIndex,
                                      currentDayConfig.key,
                                      event.target.value,
                                    );
                                  }}
                                  rows={7}
                                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[#8B1E2D] focus:ring-2 focus:ring-[#8B1E2D]/20"
                                />

                                <div className="mt-3 text-xs text-slate-600">
                                  Standard:{' '}
                                  <span className="font-semibold text-slate-900">
                                    {currentDefaultText || '—'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-lg leading-relaxed text-slate-900">{currentDisplayText}</div>
                            )}
                          </div>

                          <div className="h-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showEmbeddedNotes && current?.id ? (
              <div ref={notesBlockRef} className="px-5 pb-5 sm:px-7 sm:pb-7">
                <EmbeddedNotesHistoryCard
                  themeId={current.id}
                  onClose={() => {
                    pendingNotesScrollRef.current = false;
                    setShowEmbeddedNotes(false);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </BackgroundLayout>
    </RequireAuth>
  );
}