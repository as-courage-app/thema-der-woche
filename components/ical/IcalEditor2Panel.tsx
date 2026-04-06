'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readCurrentUserPlan } from '@/lib/userPlan';
import edition1 from '@/app/data/edition1.json';

const LS_SETUP = 'as-courage.themeSetup.v1';
const LS_EDITOR2_DRAFTS = 'as-courage.icalEditor2Drafts.v1';
const LS_EDITOR2_VISIBILITY = 'as-courage.icalEditor2Visibility.v1';
const LS_EDITOR2_HINT_PREFS = 'as-courage.icalEditor2HintPrefs.v1';

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

type DraftState = Record<string, string>;
type VisibilityState = Record<string, boolean>;

type HintPrefs = {
    country: 'DE' | 'AT' | 'CH';
    region: string;
    showSchoolHolidays: boolean;
    showNationalHolidays: boolean;
    showDiversityHints: boolean;
};

export type IcalEditor2PanelProps = {
    embedded?: boolean;
    initialThemeId?: string | null;
    initialWeekIndex?: number | null;
    onCloseEmbedded?: () => void;
    onEmbeddedWeekChange?: (payload: { themeId: string | null; weekIndex: number }) => void;
};

const THEMES: EditionRow[] = edition1 as unknown as EditionRow[];

const WORKWEEK_DAYS: { key: Exclude<DayKey, 'Sa' | 'So'>; label: string; index: number }[] = [
    { key: 'Mo', label: 'Montag', index: 0 },
    { key: 'Di', label: 'Dienstag', index: 1 },
    { key: 'Mi', label: 'Mittwoch', index: 2 },
    { key: 'Do', label: 'Donnerstag', index: 3 },
    { key: 'Fr', label: 'Freitag', index: 4 },
];

const WEEKEND_DAYS: { key: Extract<DayKey, 'Sa' | 'So'>; label: string; index: number }[] = [
    { key: 'Sa', label: 'Samstag', index: 5 },
    { key: 'So', label: 'Sonntag', index: 6 },
];

const EDITOR_DAYS: { key: DayKey; label: string; index: number }[] = [
    ...WORKWEEK_DAYS,
    ...WEEKEND_DAYS,
];

const GERMAN_STATES = [
    { value: '', label: 'Bundesland auswählen' },
    { value: 'BW', label: 'Baden-Württemberg' },
    { value: 'BY', label: 'Bayern' },
    { value: 'BE', label: 'Berlin' },
    { value: 'BB', label: 'Brandenburg' },
    { value: 'HB', label: 'Bremen' },
    { value: 'HH', label: 'Hamburg' },
    { value: 'HE', label: 'Hessen' },
    { value: 'MV', label: 'Mecklenburg-Vorpommern' },
    { value: 'NI', label: 'Niedersachsen' },
    { value: 'NW', label: 'Nordrhein-Westfalen' },
    { value: 'RP', label: 'Rheinland-Pfalz' },
    { value: 'SL', label: 'Saarland' },
    { value: 'SN', label: 'Sachsen' },
    { value: 'ST', label: 'Sachsen-Anhalt' },
    { value: 'SH', label: 'Schleswig-Holstein' },
    { value: 'TH', label: 'Thüringen' },
] as const;

const PRIMARY_RED_BUTTON =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#8B1E2D] bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#741827] hover:bg-[#741827] hover:shadow-lg';

const WHITE_CLOSE_BUTTON =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#8B1E2D] bg-white px-4 py-2 text-sm font-semibold text-[#8B1E2D] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#741827] hover:bg-slate-50 hover:shadow-lg';

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
    const d = new Date(`${iso}T00:00:00`);
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

function buildDraftKey(themeId: string, weekIndex: number, dayKey: DayKey) {
    return `${themeId}__${weekIndex}__${dayKey}`;
}

function downloadTextFile(
    filename: string,
    content: string,
    mime = 'text/plain;charset=utf-8',
) {
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

function getDefaultDayText(theme: EditionRow, day: { key: DayKey; index: number }) {
    if (day.key === 'Sa' || day.key === 'So') return 'Schönes Wochenende';
    return theme.questions?.[day.index] ?? '';
}

function buildEditor2Ics(
    setup: SetupState | null,
    selectedThemes: EditionRow[],
    drafts: DraftState,
    visibility: VisibilityState,
): string {
    const stamp = dtstampUtc();
    const uidBase = `tdw-editor2-${stamp}-${Math.random().toString(16).slice(2)}`;
    const startIso = setup?.startMonday;
    const baseDate = parseIsoDate(startIso);

    if (!baseDate || selectedThemes.length === 0) {
        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//as-courage//Teamkalender Editor 2//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Teamkalender',
            'END:VCALENDAR',
            '',
        ].join('\r\n');
    }

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//as-courage//Teamkalender Editor 2//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Teamkalender',
        'X-WR-CALDESC:Thema der Woche – schlanker Teamkalender aus Editor 2',
    ];

    let eventIndex = 0;

    for (let weekIndex = 0; weekIndex < selectedThemes.length; weekIndex++) {
        const theme = selectedThemes[weekIndex];
        const weekMonday = addDays(baseDate, weekIndex * 7);
        const title = displayTitle(theme);
        const quote = theme.quote ?? '';

        for (const day of EDITOR_DAYS) {
            const draftKey = buildDraftKey(theme.id, weekIndex, day.key);
            const isVisible = visibility[draftKey] ?? true;
            if (!isVisible) continue;

            const date = addDays(weekMonday, day.index);
            const dtStart = yyyymmdd(date);
            const dtEnd = yyyymmdd(addDays(date, 1));
            const defaultText = getDefaultDayText(theme, day);
            const text = drafts[draftKey] ?? defaultText;
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

export default function IcalEditor2Panel({
    embedded = false,
    initialThemeId = null,
    initialWeekIndex = null,
    onCloseEmbedded,
    onEmbeddedWeekChange,
}: IcalEditor2PanelProps) {

    const router = useRouter();

    const [setup, setSetup] = useState<SetupState | null>(null);
    const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [selectedDayKey, setSelectedDayKey] = useState<DayKey>('Mo');
    const [drafts, setDrafts] = useState<DraftState>({});
    const [visibility, setVisibility] = useState<VisibilityState>({});
    const [saveNotice, setSaveNotice] = useState<string | null>(null);
    const [hintPrefs, setHintPrefs] = useState<HintPrefs>({
        country: 'DE',
        region: '',
        showSchoolHolidays: true,
        showNationalHolidays: true,
        showDiversityHints: true,
    });

    useEffect(() => {
        let alive = true;

        async function loadPageData() {
            const s = readSetup();
            const plan = await readCurrentUserPlan();

            if (!alive) return;

            setSetup(s);
            setCurrentUserPlan(plan);
            setDrafts(readLocalJson<DraftState>(LS_EDITOR2_DRAFTS, {}));
            setVisibility(readLocalJson<VisibilityState>(LS_EDITOR2_VISIBILITY, {}));
            setHintPrefs(
                readLocalJson<HintPrefs>(LS_EDITOR2_HINT_PREFS, {
                    country: 'DE',
                    region: '',
                    showSchoolHolidays: true,
                    showNationalHolidays: true,
                    showDiversityHints: true,
                }),
            );

            const ids = s?.themeIds ?? [];

            if (
                embedded &&
                Number.isInteger(initialWeekIndex) &&
                (initialWeekIndex ?? -1) >= 0 &&
                (initialWeekIndex ?? -1) < ids.length
            ) {
                setPageIndex(initialWeekIndex as number);
                return;
            }

            if (embedded && initialThemeId) {
                const themeIndexFromProp = ids.findIndex((id) => id === initialThemeId);
                if (themeIndexFromProp >= 0) {
                    setPageIndex(themeIndexFromProp);
                    return;
                }
            }

            if (!embedded) {
                const params = new URLSearchParams(window.location.search);
                const themeIdFromUrl = params.get('themeId');
                const weekFromUrl = params.get('week');

                const weekIndexFromUrl = weekFromUrl ? Number(weekFromUrl) - 1 : -1;
                const themeIndexFromUrl = themeIdFromUrl ? ids.findIndex((id) => id === themeIdFromUrl) : -1;

                if (
                    Number.isInteger(weekIndexFromUrl) &&
                    weekIndexFromUrl >= 0 &&
                    weekIndexFromUrl < ids.length
                ) {
                    setPageIndex(weekIndexFromUrl);
                    return;
                }

                if (themeIndexFromUrl >= 0) {
                    setPageIndex(themeIndexFromUrl);
                    return;
                }
            }

            setPageIndex(0);
        }

        loadPageData();

        return () => {
            alive = false;
        };
    }, [embedded, initialThemeId, initialWeekIndex]);

    const selectedThemes = useMemo(() => {
        const ids = setup?.themeIds;
        if (!ids || !Array.isArray(ids) || ids.length === 0) return [];

        const map = new Map<string, EditionRow>();
        for (const t of THEMES) map.set(t.id, t);

        return ids.map((id) => map.get(id)).filter(Boolean) as EditionRow[];
    }, [setup]);

    const totalPages = selectedThemes.length;
    const clampedIndex = totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0;
    const current = totalPages > 0 ? selectedThemes[clampedIndex] : null;

    useEffect(() => {
        if (!embedded) return;
        if (!onEmbeddedWeekChange) return;

        onEmbeddedWeekChange({
            themeId: current?.id ?? null,
            weekIndex: clampedIndex,
        });
    }, [embedded, onEmbeddedWeekChange, current?.id, clampedIndex]);

    useEffect(() => {
        setSelectedDayKey('Mo');
    }, [clampedIndex, current?.id]);

    useEffect(() => {
        if (!current?.id) return;

        setDrafts((prev) => {
            let changed = false;
            const next = { ...prev };

            for (const day of EDITOR_DAYS) {
                const key = buildDraftKey(current.id, clampedIndex, day.key);
                if (!(key in next)) {
                    next[key] = getDefaultDayText(current, day);
                    changed = true;
                }
            }

            return changed ? next : prev;
        });

        setVisibility((prev) => {
            let changed = false;
            const next = { ...prev };

            for (const day of EDITOR_DAYS) {
                const key = buildDraftKey(current.id, clampedIndex, day.key);
                if (!(key in next)) {
                    next[key] = true;
                    changed = true;
                }
            }

            return changed ? next : prev;
        });
    }, [current?.id, current?.questions, clampedIndex]);

    const weekMondayDate = useMemo(() => {
        const base = parseIsoDate(setup?.startMonday);
        if (!base) return null;
        return addDays(base, clampedIndex * 7);
    }, [setup?.startMonday, clampedIndex]);

    const dateRangeText = useMemo(() => {
        if (!weekMondayDate) return '';
        const friday = addDays(weekMondayDate, 4);
        return `${formatDE(weekMondayDate)} – ${formatDE(friday)}`;
    }, [weekMondayDate]);

    const currentTitle = current ? displayTitle(current) : '';

    const currentDayEntry = useMemo(() => {
        if (!current) return null;

        const selectedDay = EDITOR_DAYS.find((day) => day.key === selectedDayKey) ?? EDITOR_DAYS[0];
        const draftKey = buildDraftKey(current.id, clampedIndex, selectedDay.key);
        const defaultText = getDefaultDayText(current, selectedDay);
        const text = drafts[draftKey] ?? defaultText;
        const isVisible = visibility[draftKey] ?? true;
        const dateText = weekMondayDate ? formatDE(addDays(weekMondayDate, selectedDay.index)) : '';

        return {
            ...selectedDay,
            draftKey,
            defaultText,
            text,
            isVisible,
            dateText,
            isEdited: text !== defaultText,
        };
    }, [current, selectedDayKey, drafts, visibility, weekMondayDate, clampedIndex]);

    const hintMessages = useMemo(() => {
        const items: string[] = [];

        if (hintPrefs.showSchoolHolidays) {
            if (hintPrefs.country !== 'DE') {
                items.push(
                    'Schulferienhinweise werden in Editor 2 zunächst nur für Deutschland vorbereitet. Österreich und Schweiz können später ergänzt werden.',
                );
            } else if (!hintPrefs.region) {
                items.push('Für Schulferienhinweise bitte zuerst ein Bundesland auswählen.');
            } else {
                const stateLabel =
                    GERMAN_STATES.find((entry) => entry.value === hintPrefs.region)?.label ?? hintPrefs.region;
                items.push(
                    `Schulferienhinweise sind für ${stateLabel} vorbereitet. Relevante Hinweise kannst du später bewusst manuell in den Tagesimpuls übernehmen.`,
                );
            }
        }

        if (hintPrefs.showNationalHolidays) {
            items.push(
                'Nationale Feiertage sind als ruhige Orientierung gedacht. Sie werden nicht automatisch importiert.',
            );
        }

        if (hintPrefs.showDiversityHints) {
            items.push(
                'Interkulturelle Hinweise, zum Beispiel aus einem Diversity-Kontext, sollen bewusst nur als Orientierung erscheinen und anschließend manuell eingetragen werden.',
            );
        }

        if (items.length === 0) {
            items.push('Aktuell sind keine zusätzlichen Hinweisarten aktiviert.');
        }

        return items;
    }, [hintPrefs]);

    function updateDraft(value: string) {
        if (!currentDayEntry) return;
        setSaveNotice(null);
        setDrafts((prev) => ({
            ...prev,
            [currentDayEntry.draftKey]: value,
        }));
    }

    function toggleVisibility() {
        if (!currentDayEntry) return;
        setSaveNotice(null);
        setVisibility((prev) => ({
            ...prev,
            [currentDayEntry.draftKey]: !(prev[currentDayEntry.draftKey] ?? true),
        }));
    }

    function resetCurrentDay() {
        if (!currentDayEntry) return;
        setSaveNotice(null);
        setDrafts((prev) => ({
            ...prev,
            [currentDayEntry.draftKey]: currentDayEntry.defaultText,
        }));
    }

    function saveEditor2State() {
        localStorage.setItem(LS_EDITOR2_DRAFTS, JSON.stringify(drafts));
        localStorage.setItem(LS_EDITOR2_VISIBILITY, JSON.stringify(visibility));
        localStorage.setItem(LS_EDITOR2_HINT_PREFS, JSON.stringify(hintPrefs));
        setSaveNotice('Änderungen lokal gespeichert.');
    }

    function downloadEditedCalendar() {
        const ics = buildEditor2Ics(setup, selectedThemes, drafts, visibility);
        downloadTextFile('teamkalender-editor-2.ics', ics, 'text/calendar;charset=utf-8');
    }

    function closeEditor() {
        if (embedded && onCloseEmbedded) {
            onCloseEmbedded();
            return;
        }

        const themeId = current?.id;
        if (themeId) {
            router.push(`/quotes?themeId=${themeId}`);
            return;
        }

        router.push('/quotes');
    }

    if (currentUserPlan && currentUserPlan !== 'C') {
        return (
            <div className={embedded ? 'w-full' : 'mx-auto flex min-h-[100svh] max-w-4xl items-start px-6 py-6'}>
                <div className="w-full rounded-2xl border border-[#8B1E2D] bg-white p-6 shadow-xl">
                    <h1 className="text-2xl font-semibold text-slate-900">iCal-Editor 2</h1>
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        iCal ist in Variante C verfügbar.
                    </div>
                    <div className="mt-5">
                        <button
                            type="button"
                            onClick={closeEditor}
                            className={WHITE_CLOSE_BUTTON}
                        >
                            zurück zu quotes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={embedded ? 'w-full' : 'mx-auto flex min-h-[100svh] max-w-7xl px-6 py-4'}>
            <div className="w-full rounded-2xl border border-[#8B1E2D] bg-white/95 shadow-xl backdrop-blur-md">
                <div className="border-b border-[#8B1E2D]/20 p-5 sm:p-7">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900">
                                iCal-Editor 2 <span className="text-slate-600">(Variante C)</span>
                            </h1>

                            <div className="mt-2 text-base text-slate-900">
                                Fokus:{' '}
                                <span className="font-semibold text-[#8B1E2D]">
                                    Thema der Woche bewusst optimieren
                                </span>
                            </div>

                            <div className="mt-2 text-sm text-slate-600">
                                Der Teamkalender bleibt transparent und blockiert keine Verfügbarkeit.
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={saveEditor2State} className={PRIMARY_RED_BUTTON}>
                                {saveNotice === 'Änderungen lokal gespeichert.'
                                    ? 'Änderungen lokal gespeichert'
                                    : 'Änderungen speichern'}
                            </button>

                            <button
                                type="button"
                                onClick={downloadEditedCalendar}
                                className={PRIMARY_RED_BUTTON}
                            >
                                bearbeiteten Teamkalender herunterladen
                            </button>

                            <button type="button" onClick={closeEditor} className={WHITE_CLOSE_BUTTON}>
                                Schließen
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-5 sm:p-7">
                    {!current ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            Ich finde noch keine ausgewählten Themen. Bitte gehe zuerst zur Themenauswahl.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="rounded-2xl border border-[#8B1E2D] bg-[#8B1E2D]/5 p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <div className="text-sm font-medium uppercase tracking-wide text-[#8B1E2D]">
                                            Bearbeitungsansicht
                                        </div>
                                        <div className="mt-1 text-base font-semibold text-slate-900">
                                            Woche {clampedIndex + 1} / {totalPages}
                                            {currentTitle ? ` · ${currentTitle}` : ''}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                                            disabled={clampedIndex <= 0}
                                            className={[
                                                PRIMARY_RED_BUTTON,
                                                clampedIndex <= 0
                                                    ? 'cursor-not-allowed opacity-40 hover:translate-y-0 hover:scale-100 hover:shadow-sm'
                                                    : '',
                                            ].join(' ')}
                                        >
                                            zurück
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                                            disabled={clampedIndex >= totalPages - 1}
                                            className={[
                                                PRIMARY_RED_BUTTON,
                                                clampedIndex >= totalPages - 1
                                                    ? 'cursor-not-allowed opacity-40 hover:translate-y-0 hover:scale-100 hover:shadow-sm'
                                                    : '',
                                            ].join(' ')}
                                        >
                                            weiter
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                                <div className="flex flex-col gap-6">
                                    <div className="rounded-2xl border border-[#8B1E2D] bg-white p-5 shadow-sm">
                                        <div className="text-sm font-semibold uppercase tracking-wide text-[#8B1E2D]">
                                            Tagesauswahl
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                                                {WORKWEEK_DAYS.map((day) => {
                                                    const draftKey = buildDraftKey(current.id, clampedIndex, day.key);
                                                    const defaultText = getDefaultDayText(current, day);
                                                    const currentText = drafts[draftKey] ?? defaultText;
                                                    const isEdited = currentText !== defaultText;
                                                    const dateText = weekMondayDate
                                                        ? formatDE(addDays(weekMondayDate, day.index))
                                                        : '';

                                                    return (
                                                        <button
                                                            key={day.key}
                                                            type="button"
                                                            onClick={() => setSelectedDayKey(day.key)}
                                                            className={[
                                                                'w-full rounded-2xl border px-3 py-3 text-left shadow-sm transition duration-200',
                                                                selectedDayKey === day.key
                                                                    ? 'cursor-pointer border-[#8B1E2D] bg-[#8B1E2D] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#741827] hover:shadow-md'
                                                                    : 'cursor-pointer border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#8B1E2D] hover:bg-slate-50 hover:shadow-md',
                                                            ].join(' ')}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <div className="text-sm font-semibold">{day.label}</div>
                                                                    <div className="mt-1 text-xs opacity-80">{dateText}</div>
                                                                </div>

                                                                {isEdited ? (
                                                                    <span className="rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase">
                                                                        bearbeitet
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                {WEEKEND_DAYS.map((day) => {
                                                    const draftKey = buildDraftKey(current.id, clampedIndex, day.key);
                                                    const defaultText = getDefaultDayText(current, day);
                                                    const currentText = drafts[draftKey] ?? defaultText;
                                                    const isEdited = currentText !== defaultText;
                                                    const dateText = weekMondayDate
                                                        ? formatDE(addDays(weekMondayDate, day.index))
                                                        : '';

                                                    return (
                                                        <button
                                                            key={day.key}
                                                            type="button"
                                                            onClick={() => setSelectedDayKey(day.key)}
                                                            className={[
                                                                'w-full rounded-2xl border px-3 py-3 text-left shadow-sm transition duration-200',
                                                                selectedDayKey === day.key
                                                                    ? 'cursor-pointer border-[#8B1E2D] bg-[#8B1E2D] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#741827] hover:shadow-md'
                                                                    : 'cursor-pointer border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#8B1E2D] hover:bg-slate-50 hover:shadow-md',
                                                            ].join(' ')}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <div className="text-sm font-semibold">{day.label}</div>
                                                                    <div className="mt-1 text-xs opacity-80">{dateText}</div>
                                                                </div>

                                                                {isEdited ? (
                                                                    <span className="rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase">
                                                                        bearbeitet
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {currentDayEntry ? (
                                            <div className="mt-5 rounded-2xl border border-[#8B1E2D] bg-[#8B1E2D]/5 p-5">
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={toggleVisibility}
                                                                className={[
                                                                    'inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border text-sm font-bold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.04]',
                                                                    currentDayEntry.isVisible
                                                                        ? 'border-[#2563EB] bg-[#2563EB] text-white hover:bg-[#1D4ED8]'
                                                                        : 'border-slate-300 bg-white text-transparent hover:border-[#2563EB] hover:bg-slate-50',
                                                                ].join(' ')}
                                                                title={
                                                                    currentDayEntry.isVisible
                                                                        ? 'Im Teamkalender ausgewählt – zum Ausblenden klicken'
                                                                        : 'Nicht im Teamkalender ausgewählt – zum Einblenden klicken'
                                                                }
                                                                aria-pressed={currentDayEntry.isVisible}
                                                            >
                                                                ✓
                                                            </button>

                                                            <div className="text-xl font-semibold text-slate-900">
                                                                {currentDayEntry.label}
                                                            </div>
                                                        </div>

                                                        <div className="mt-1 text-sm text-slate-600">
                                                            {currentDayEntry.dateText}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={resetCurrentDay}
                                                            disabled={!currentDayEntry.isEdited}
                                                            className={[
                                                                WHITE_CLOSE_BUTTON,
                                                                !currentDayEntry.isEdited
                                                                    ? 'cursor-not-allowed opacity-40 hover:translate-y-0 hover:scale-100 hover:bg-white hover:shadow-sm'
                                                                    : '',
                                                            ].join(' ')}
                                                        >
                                                            Standard wiederherstellen
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-4 rounded-xl border border-[#8B1E2D] bg-white p-4">
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {currentDayEntry.key === 'Sa' || currentDayEntry.key === 'So'
                                                            ? 'Wochenendhinweis'
                                                            : 'Tagesimpuls'}
                                                    </div>

                                                    <textarea
                                                        value={currentDayEntry.text}
                                                        onChange={(event) => updateDraft(event.target.value)}
                                                        rows={7}
                                                        className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[#8B1E2D] focus:ring-2 focus:ring-[#8B1E2D]/20"
                                                    />

                                                    <div className="mt-3 text-xs text-slate-600">
                                                        Standard:{' '}
                                                        <span className="font-semibold text-slate-900">
                                                            {currentDayEntry.defaultText || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="rounded-2xl border border-[#8B1E2D] bg-white p-5 shadow-sm">
                                        <div className="rounded-2xl border border-[#8B1E2D] bg-white p-5 shadow-sm">
                                            <div className="text-sm font-semibold uppercase tracking-wide text-[#8B1E2D]">
                                                Ruhige Hinweise vorbereiten
                                            </div>

                                            <p className="mt-3 text-sm leading-relaxed text-slate-700">
                                                Hinweise zu Ferien oder Feiertagen dienen hier nur der Orientierung.
                                                Sie werden nicht automatisch importiert. Wenn du etwas übernehmen
                                                möchtest, trägst du es bewusst selbst in den Tagesimpuls ein.
                                            </p>

                                            <div className="mt-4 grid gap-3">
                                                <label className="text-sm font-medium text-slate-800">
                                                    Land
                                                    <select
                                                        value={hintPrefs.country}
                                                        onChange={(event) => {
                                                            const nextCountry = event.target.value as HintPrefs['country'];
                                                            setSaveNotice(null);
                                                            setHintPrefs((prev) => ({
                                                                ...prev,
                                                                country: nextCountry,
                                                                region: nextCountry === 'DE' ? prev.region : '',
                                                            }));
                                                        }}
                                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#8B1E2D] focus:ring-2 focus:ring-[#8B1E2D]/20"
                                                    >
                                                        <option value="DE">Deutschland</option>
                                                        <option value="AT">Österreich</option>
                                                        <option value="CH">Schweiz</option>
                                                    </select>
                                                </label>

                                                {hintPrefs.country === 'DE' ? (
                                                    <label className="text-sm font-medium text-slate-800">
                                                        Bundesland
                                                        <select
                                                            value={hintPrefs.region}
                                                            onChange={(event) => {
                                                                setSaveNotice(null);
                                                                setHintPrefs((prev) => ({
                                                                    ...prev,
                                                                    region: event.target.value,
                                                                }));
                                                            }}
                                                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#8B1E2D] focus:ring-2 focus:ring-[#8B1E2D]/20"
                                                        >
                                                            {GERMAN_STATES.map((state) => (
                                                                <option key={state.value || 'empty'} value={state.value}>
                                                                    {state.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                ) : null}

                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                                                        <input
                                                            type="checkbox"
                                                            checked={hintPrefs.showSchoolHolidays}
                                                            onChange={(event) => {
                                                                setSaveNotice(null);
                                                                setHintPrefs((prev) => ({
                                                                    ...prev,
                                                                    showSchoolHolidays: event.target.checked,
                                                                }));
                                                            }}
                                                            className="h-4 w-4 rounded border-slate-300 text-[#8B1E2D] focus:ring-[#8B1E2D]"
                                                        />
                                                        Schulferienhinweise vorbereiten
                                                    </label>

                                                    {hintPrefs.showSchoolHolidays ? (
                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                                                            {hintPrefs.country !== 'DE'
                                                                ? 'Schulferienhinweise werden in Editor 2 zunächst nur für Deutschland vorbereitet. Österreich und Schweiz können später ergänzt werden.'
                                                                : !hintPrefs.region
                                                                    ? 'Für Schulferienhinweise bitte zuerst ein Bundesland auswählen.'
                                                                    : `Schulferienhinweise sind für ${GERMAN_STATES.find((entry) => entry.value === hintPrefs.region)?.label ??
                                                                    hintPrefs.region
                                                                    } vorbereitet. Relevante Hinweise kannst du später bewusst manuell in den Tagesimpuls übernehmen.`}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                                                        <input
                                                            type="checkbox"
                                                            checked={hintPrefs.showNationalHolidays}
                                                            onChange={(event) => {
                                                                setSaveNotice(null);
                                                                setHintPrefs((prev) => ({
                                                                    ...prev,
                                                                    showNationalHolidays: event.target.checked,
                                                                }));
                                                            }}
                                                            className="h-4 w-4 rounded border-slate-300 text-[#8B1E2D] focus:ring-[#8B1E2D]"
                                                        />
                                                        nationale Feiertage als Orientierung
                                                    </label>

                                                    {hintPrefs.showNationalHolidays ? (
                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                                                            Nationale Feiertage sind als ruhige Orientierung gedacht. Sie werden nicht automatisch importiert.
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                                                        <input
                                                            type="checkbox"
                                                            checked={hintPrefs.showDiversityHints}
                                                            onChange={(event) => {
                                                                setSaveNotice(null);
                                                                setHintPrefs((prev) => ({
                                                                    ...prev,
                                                                    showDiversityHints: event.target.checked,
                                                                }));
                                                            }}
                                                            className="h-4 w-4 rounded border-slate-300 text-[#8B1E2D] focus:ring-[#8B1E2D]"
                                                        />
                                                        interkulturelle Hinweise als Orientierung
                                                    </label>

                                                    {hintPrefs.showDiversityHints ? (
                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                                                            Interkulturelle Hinweise, zum Beispiel aus einem Diversity-Kontext, sollen bewusst nur als Orientierung erscheinen und anschließend manuell eingetragen werden.
                                                        </div>
                                                    ) : null}
                                                </div>

                                                {!hintPrefs.showSchoolHolidays &&
                                                    !hintPrefs.showNationalHolidays &&
                                                    !hintPrefs.showDiversityHints ? (
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                                                        Aktuell sind keine zusätzlichen Hinweisarten aktiviert.
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3">
                                            {hintMessages.map((message, index) => (
                                                <div
                                                    key={`${message}-${index}`}
                                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700"
                                                >
                                                    {message}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-[#8B1E2D] bg-white p-5 shadow-sm">
                                        <div className="text-sm font-semibold uppercase tracking-wide text-[#8B1E2D]">
                                            Export-Vorschau
                                        </div>

                                        <div className="mt-3 text-sm leading-relaxed text-slate-700">
                                            Im Download erscheinen nur die Tage, die als sichtbar markiert sind.
                                            Der Teamkalender bleibt transparent und blockiert keine Verfügbarkeit.
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {EDITOR_DAYS.map((day) => {
                                                if (!current) return null;

                                                const key = buildDraftKey(current.id, clampedIndex, day.key);
                                                const isVisible = visibility[key] ?? true;
                                                const text = drafts[key] ?? getDefaultDayText(current, day);

                                                return (
                                                    <div
                                                        key={day.key}
                                                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-slate-900">{day.label}</div>
                                                            <div className="mt-1 text-slate-700">{text || '—'}</div>
                                                        </div>

                                                        <div
                                                            className={[
                                                                'rounded-full px-2 py-1 text-xs font-semibold uppercase',
                                                                isVisible
                                                                    ? 'border border-[#8B1E2D] bg-white text-[#8B1E2D]'
                                                                    : 'border border-slate-200 bg-white text-slate-500',
                                                            ].join(' ')}
                                                        >
                                                            {isVisible ? 'im Export' : 'ausgeblendet'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {saveNotice ? (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                    {saveNotice}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}