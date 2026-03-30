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
  selectedLicenseTier?: LicenseTier;
  licenseTier?: LicenseTier;
  icalEnabled?: boolean;
};

type BottomSectionKey = 'notes' | 'ical';

type InlineIcalDraftState = Record<string, string>;

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

function buildInlineIcalDraftKey(themeId: string, weekIndex: number, dayKey: string) {
  return `${themeId}__${weekIndex}__${dayKey}`;
}

function buildIcsFromPlan(
  setup: SetupState | null,
  selectedThemes: EditionRow[],
  inlineDrafts: InlineIcalDraftState = {},
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
  ];

  let eventIndex = 0;

  for (let w = 0; w < countWeeks; w++) {
    const theme = selectedThemes[w];
    const weekMonday = addDays(baseDate, w * 7);
    const title = displayTitle(theme);
    const quote = theme.quote ?? '';

    for (let day = 0; day < 5; day++) {
      const date = addDays(weekMonday, day);
      const dtStart = yyyymmdd(date);
      const dtEnd = yyyymmdd(addDays(date, 1));
      const dayKey = WEEKDAYS[day]?.key ?? '';
      const draftKey = buildInlineIcalDraftKey(theme.id, w, dayKey);
      const question = inlineDrafts[draftKey] ?? theme.questions?.[day] ?? '';
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

    for (let day = 5; day < 7; day++) {
      const date = addDays(weekMonday, day);
      const dtStart = yyyymmdd(date);
      const dtEnd = yyyymmdd(addDays(date, 1));
      const dayKey = day === 5 ? 'Sa' : 'So';
      const draftKey = buildInlineIcalDraftKey(theme.id, w, dayKey);
      const weekendText = inlineDrafts[draftKey] ?? 'Schönes Wochenende';

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uidBase}-${eventIndex}@as-courage`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push('TRANSP:TRANSPARENT');
      lines.push(`SUMMARY:${escapeIcsText(weekendText)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(weekendText)}`);
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
  const [showInlineIcal, setShowInlineIcal] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [bottomSectionOrder, setBottomSectionOrder] = useState<BottomSectionKey[]>([]);
  const [inlineIcalDrafts, setInlineIcalDrafts] = useState<InlineIcalDraftState>({});

  const [showIcalMenu, setShowIcalMenu] = useState(false);
  const icalMenuRef = useRef<HTMLDivElement | null>(null);
  const notesBlockRef = useRef<HTMLDivElement | null>(null);
  const icalBlockRef = useRef<HTMLDivElement | null>(null);
  const pendingNotesScrollRef = useRef(false);
  const pendingIcalScrollRef = useRef(false);

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
    if (!showInlineIcal) return;
    if (!pendingIcalScrollRef.current) return;

    const node = icalBlockRef.current;
    if (!node) return;

    pendingIcalScrollRef.current = false;

    requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [showInlineIcal]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!icalMenuRef.current) return;
      if (icalMenuRef.current.contains(event.target as Node)) return;
      setShowIcalMenu(false);
    }

    if (showIcalMenu) {
      document.addEventListener('mousedown', handlePointerDown);
    }

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showIcalMenu]);

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

      for (const day of WEEKDAYS) {
        const draftKey = buildInlineIcalDraftKey(current.id, clampedIndex, day.key);
        if (!(draftKey in next)) {
          next[draftKey] = current.questions?.[day.index] ?? '—';
          changed = true;
        }
      }

      const saturdayKey = buildInlineIcalDraftKey(current.id, clampedIndex, 'Sa');
      if (!(saturdayKey in next)) {
        next[saturdayKey] = 'Schönes Wochenende';
        changed = true;
      }

      const sundayKey = buildInlineIcalDraftKey(current.id, clampedIndex, 'So');
      if (!(sundayKey in next)) {
        next[sundayKey] = 'Schönes Wochenende';
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [current?.id, current?.questions, clampedIndex]);

  const currentInlineIcalEntries = useMemo(() => {
    const currentThemeId = current?.id;

    const weekdayEntries = WEEKDAYS.map((day) => {
      const fallbackText = current?.questions?.[day.index] ?? '—';
      const draftKey = currentThemeId
        ? buildInlineIcalDraftKey(currentThemeId, clampedIndex, day.key)
        : null;

      return {
        key: day.key,
        label: day.label,
        dateText: weekdayDateText(day.index),
        text:
          currentThemeId && draftKey
            ? getInlineIcalDraftValue(currentThemeId, clampedIndex, day.key, fallbackText)
            : fallbackText,
        kind: 'weekday' as const,
        questionIndex: day.index,
        editable: true,
      };
    });

    const saturdayText = weekMondayDate
      ? formatDE(addDays(weekMondayDate, 5))
      : weekdayDateText(5) || '—';

    const sundayText = weekMondayDate
      ? formatDE(addDays(weekMondayDate, 6))
      : weekdayDateText(6) || '—';

    const saturdayDraftKey = currentThemeId
      ? buildInlineIcalDraftKey(currentThemeId, clampedIndex, 'Sa')
      : null;

    const sundayDraftKey = currentThemeId
      ? buildInlineIcalDraftKey(currentThemeId, clampedIndex, 'So')
      : null;

    return [
      ...weekdayEntries,
      {
        key: 'Sa',
        label: 'Samstag',
        dateText: saturdayText,
        text:
          currentThemeId && saturdayDraftKey
            ? getInlineIcalDraftValue(currentThemeId, clampedIndex, 'Sa', 'Schönes Wochenende')
            : 'Schönes Wochenende',
        kind: 'weekend' as const,
        questionIndex: null,
        editable: true,
      },
      {
        key: 'So',
        label: 'Sonntag',
        dateText: sundayText,
        text:
          currentThemeId && sundayDraftKey
            ? getInlineIcalDraftValue(currentThemeId, clampedIndex, 'So', 'Schönes Wochenende')
            : 'Schönes Wochenende',
        kind: 'weekend' as const,
        questionIndex: null,
        editable: true,
      },
    ];
  }, [current?.id, current?.questions, clampedIndex, inlineIcalDrafts, weekdayDateText, weekMondayDate]);

  const dayIndex = current ? activeDay[current.id] ?? 0 : 0;

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < totalPages - 1;

  const imageSrc = useMemo(() => {
    if (!current) return '/images/demo.jpg';
    if (imgFallbackToDemo) return '/images/demo.jpg';
    return `/images/themes/${current.id}.jpg`;
  }, [current, imgFallbackToDemo]);

  const currentTitle = current ? displayTitle(current) : '';

  const showIcalButton = useMemo(() => {
    return selectedThemes.length > 0;
  }, [selectedThemes.length]);

  const orderedBottomSections = useMemo(() => {
    return bottomSectionOrder.filter((section) => {
      if (section === 'notes') return showEmbeddedNotes && !!current?.id;
      if (section === 'ical') return showInlineIcal;
      return false;
    });
  }, [bottomSectionOrder, showEmbeddedNotes, showInlineIcal, current?.id]);

  const hasBottomSections = orderedBottomSections.length > 0;

  function getInlineIcalDraftValue(
    themeId: string,
    weekIndex: number,
    dayKey: string,
    fallbackValue: string,
  ) {
    const draftKey = buildInlineIcalDraftKey(themeId, weekIndex, dayKey);
    return inlineIcalDrafts[draftKey] ?? fallbackValue;
  }

  function updateInlineIcalDraft(themeId: string, weekIndex: number, dayKey: string, value: string) {
    const draftKey = buildInlineIcalDraftKey(themeId, weekIndex, dayKey);

    setInlineIcalDrafts((prev) => ({
      ...prev,
      [draftKey]: value,
    }));
  }

  function goPrev() {
    setShowPodcast(false);
    setShowIcalMenu(false);
    setPageIndex((p) => Math.max(0, p - 1));
    setImgFallbackToDemo(false);
  }

  function goNext() {
    setShowPodcast(false);
    setShowIcalMenu(false);
    setPageIndex((p) => Math.min(Math.max(0, totalPages - 1), p + 1));
    setImgFallbackToDemo(false);
  }

  function openIcalEditor() {
    setShowIcalMenu(false);
    pendingIcalScrollRef.current = true;
    setBottomSectionOrder((prev) => (prev.includes('ical') ? prev : [...prev, 'ical']));
    setShowInlineIcal(true);
  }

  function downloadIcalDirectly() {
    const ics = buildIcsFromPlan(setup, selectedThemes, inlineIcalDrafts);
    setShowIcalMenu(false);
    downloadTextFile('thema-der-woche.ics', ics, 'text/calendar;charset=utf-8');
  }

  return (
    <RequireAuth>
      <BackgroundLayout activeThemeId={current?.id}>
        <div className="mx-auto flex h-full max-w-6xl min-h-[100svh] px-10 py-3 lg:min-h-0">
          <div className="flex min-h-[100dvh] w-full max-h-none flex-col overflow-visible rounded-none border-0 bg-white/98 shadow-none backdrop-blur-md sm:min-h-0 sm:rounded-2xl sm:border sm:border-[#F29420] sm:bg-white/85 sm:shadow-xl">
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
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm text-slate-900 shadow-md transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
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

              {podcastNotice || detailsNotice || (icalNotice && icalNotice !== 'Änderungen lokal gespeichert.') || notesNotice ? (
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

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
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

                {showIcalButton && (
                  <div className="relative" ref={icalMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentUserPlan !== 'C') {
                          setIcalNotice((prev) =>
                            prev === 'iCal ist in Variante C verfügbar.'
                              ? null
                              : 'iCal ist in Variante C verfügbar.',
                          );
                          setShowIcalMenu(false);
                          return;
                        }

                        setIcalNotice(null);
                        setShowIcalMenu((prev) => !prev);
                      }}
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:shadow-lg"
                      title="iCal öffnen"
                      aria-expanded={showIcalMenu}
                      aria-haspopup="menu"
                    >
                      <span aria-hidden="true" className="text-base leading-none">
                        📅
                      </span>
                      iCal
                      <span aria-hidden="true" className="text-xs leading-none">
                        {showIcalMenu ? '▲' : '▼'}
                      </span>
                    </button>

                    {currentUserPlan === 'C' && showIcalMenu ? (
                      <div className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                        <button
                          type="button"
                          onClick={downloadIcalDirectly}
                          className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-slate-50"
                        >
                          <span aria-hidden="true" className="pt-0.5 text-base leading-none">
                            📥
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-900">
                              iCal direkt herunterladen
                            </span>
                            <span className="block text-xs text-slate-600">
                              Standard-iCal sofort als Datei herunterladen
                            </span>
                          </span>
                        </button>

                        <div className="border-t border-slate-100" />

                        <button
                          type="button"
                          onClick={openIcalEditor}
                          className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-slate-50"
                        >
                          <span aria-hidden="true" className="pt-0.5 text-base leading-none">
                            ✏️
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-900">
                              iCal aktuelle Woche schnell bearbeiten
                            </span>
                            <span className="block text-xs text-slate-600">
                              Schnellbearbeitung direkt unterhalb der Quotes-Seite öffnen
                            </span>
                          </span>
                        </button>

                        <div className="border-t border-slate-100" />

                        <button
                          type="button"
                          onClick={() => {
                            setShowIcalMenu(false);
                            router.push('/ical-editor');
                          }}
                          className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-slate-50"
                        >
                          <span aria-hidden="true" className="pt-0.5 text-base leading-none">
                            🗂️
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-900">
                              iCal mehrere Wochen im iCal-Editor bearbeiten
                            </span>
                            <span className="block text-xs text-slate-600">
                              Vollständigen Editor für mehrere Wochen und gemeinsamen Download öffnen
                            </span>
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {currentUserPlan === 'B' || currentUserPlan === 'C' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!showEmbeddedNotes) {
                        pendingNotesScrollRef.current = true;
                        setBottomSectionOrder((prev) =>
                          prev.includes('notes') ? prev : [...prev, 'notes'],
                        );
                        setShowEmbeddedNotes(true);
                        return;
                      }

                      pendingNotesScrollRef.current = false;
                      setShowEmbeddedNotes(false);
                      setBottomSectionOrder((prev) => prev.filter((entry) => entry !== 'notes'));
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
                hasBottomSections
                  ? 'px-5 pb-5 sm:px-7 sm:pb-7'
                  : 'flex-1 min-h-0 overflow-auto px-5 pb-5 sm:px-7 sm:pb-7 lg:overflow-hidden'
              }
            >
              {!current ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Ich finde noch keine ausgewählten Themen. Bitte gehe zur Themenauswahl und wähle Themen aus.
                </div>
              ) : (
                <div
                  className={
                    hasBottomSections
                      ? 'rounded-2xl border border-slate-200 bg-white'
                      : 'rounded-2xl border border-slate-200 bg-white lg:h-full lg:overflow-hidden'
                  }
                >
                  <div className="flex flex-col lg:flex-row">
                    <div className="relative bg-slate-100 lg:w-1/2">
                      <div className="h-64 lg:h-full">
                        <img
                          src={imageSrc}
                          alt={`Bild zu ${currentTitle}`}
                          className="h-full w-full object-cover object-center"
                          onError={() => setImgFallbackToDemo(true)}
                        />
                      </div>
                    </div>

                    <div className="lg:h-full lg:w-1/2 lg:overflow-auto">
                      <div className="p-5 lg:p-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h2 className="text-lg font-semibold text-slate-900">{currentTitle}</h2>
                          <div className="text-sm text-slate-600">
                            {dateRangeText ? <span className="font-medium">{dateRangeText}</span> : null}
                          </div>
                        </div>

                        <div
                          className="sticky top-0 z-10 mt-3 rounded-xl border-2 bg-slate-50 p-4 shadow-sm"
                          style={{ borderColor: BRAND_ORANGE }}
                        >
                          <div className="text-lg font-semibold tracking-wide text-slate-900">
                            Wochenzitat
                          </div>
                          <div className="mt-2 text-lg leading-relaxed text-slate-900">
                            „{current.quote}“
                          </div>
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
                                'w-full cursor-pointer rounded-2xl border px-3 py-2 text-sm shadow-sm transition duration-200',
                                dayIndex === d.index
                                  ? 'border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-md'
                                  : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-50 hover:shadow-md',
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
                          <div className="text-lg font-semibold text-slate-900">
                            {WEEKDAYS[dayIndex].label}
                          </div>
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

            {orderedBottomSections.map((section) => {
              if (section === 'notes' && current?.id) {
                return (
                  <div key="notes" ref={notesBlockRef} className="px-5 pb-5 sm:px-7 sm:pb-7">
                    <EmbeddedNotesHistoryCard
                      themeId={current.id}
                      onClose={() => {
                        pendingNotesScrollRef.current = false;
                        setShowEmbeddedNotes(false);
                        setBottomSectionOrder((prev) => prev.filter((entry) => entry !== 'notes'));
                      }}
                    />
                  </div>
                );
              }

              if (section === 'ical') {
                return (
                  <div key="ical" ref={icalBlockRef} className="px-5 pb-5 sm:px-7 sm:pb-7">
                    <div className="rounded-2xl border border-[#F29420] bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div>
                                <h3 className="text-2xl font-semibold text-slate-900">
                                  iCal-Schnellbearbeitung <span className="text-slate-600"><br />
                                    (Variante C)</span>
                                </h3>
                                <div className="mt-2 text-base text-slate-900">
                                  Aktuell: <span className="font-semibold text-[#F29420]">Aktuelle Woche</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 xl:justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    localStorage.setItem(
                                      'as-courage.inlineIcalDrafts.v1',
                                      JSON.stringify(inlineIcalDrafts),
                                    );
                                    setIcalNotice('Änderungen lokal gespeichert.');
                                  }}
                                  className={[
                                    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02]',
                                    icalNotice === 'Änderungen lokal gespeichert.'
                                      ? 'bg-[#4EA72E] hover:bg-[#3f8a25] hover:shadow-xl'
                                      : 'bg-[#F29420] hover:bg-[#E4891E] hover:shadow-xl',
                                  ].join(' ')}
                                >
                                  {icalNotice === 'Änderungen lokal gespeichert.'
                                    ? 'Änderungen lokal gespeichert'
                                    : 'Änderungen speichern'}
                                </button>

                                <button
                                  type="button"
                                  onClick={downloadIcalDirectly}
                                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#4EA72E] bg-[#4EA72E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg"
                                >
                                  bearbeiteten iCal herunterladen
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    pendingIcalScrollRef.current = false;
                                    setShowInlineIcal(false);
                                    setBottomSectionOrder((prev) => prev.filter((entry) => entry !== 'ical'));
                                  }}
                                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-[#F29420] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                                >
                                  Schließen
                                </button>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-[#F29420] bg-white p-5">
                              <h4 className="text-xl font-semibold text-slate-900">
                                Aktuelle Woche mit bewusster Speicherung bearbeiten
                              </h4>
                              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                                Diese Schnellbearbeitung gilt für die aktuell sichtbare Woche. Für mehrere Wochen mit gemeinsamem iCal-Download steht im iCal-Menü zusätzlich der iCal-Editor zur Verfügung.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border-2 border-[#F29420] bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-lg font-semibold text-slate-900">{currentTitle || '—'}</div>
                              <div className="mt-1 text-sm font-medium text-slate-600">{dateRangeText || '—'}</div>
                            </div>

                            <div className="rounded-xl border border-[#F29420] bg-white px-3 py-2 text-sm text-slate-700">
                              Woche {clampedIndex + 1}
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-[#F29420] bg-white p-4">
                            <div className="text-sm font-semibold text-slate-900">Wochenzitat</div>
                            <div className="mt-2 text-sm leading-relaxed text-slate-700">„{current?.quote ?? '—'}“</div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {currentInlineIcalEntries.map((entry) => {
                              const defaultText =
                                entry.questionIndex !== null
                                  ? current?.questions?.[entry.questionIndex] ?? '—'
                                  : 'Schönes Wochenende';

                              const isEdited = entry.text !== defaultText;

                              return (
                                <div
                                  key={entry.key}
                                  className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold text-slate-900">{entry.label}</div>
                                    <div className="text-xs text-slate-500">{entry.dateText}</div>
                                  </div>

                                  <textarea
                                    value={entry.text}
                                    onChange={(event) => {
                                      if (icalNotice === 'Änderungen lokal gespeichert.') {
                                        setIcalNotice(null);
                                      }

                                      updateInlineIcalDraft(current!.id, clampedIndex, entry.key, event.target.value);
                                    }}
                                    rows={4}
                                    className="mt-3 min-h-[112px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[#F29420] focus:ring-2 focus:ring-[#F29420]/20"
                                  />

                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-xs text-slate-500">Standard: {defaultText}</div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (icalNotice === 'Änderungen lokal gespeichert.') {
                                          setIcalNotice(null);
                                        }

                                        updateInlineIcalDraft(current!.id, clampedIndex, entry.key, defaultText);
                                      }}
                                      disabled={!isEdited}
                                      className={[
                                        'inline-flex min-h-[36px] items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition duration-200',
                                        isEdited
                                          ? 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'
                                          : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                      ].join(' ')}
                                    >
                                      Standard
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </BackgroundLayout>
    </RequireAuth>
  );
}