'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import { readCurrentUserPlan } from '@/lib/userPlan';
import edition1 from '../data/edition1.json';

const LS_SETUP = 'as-courage.themeSetup.v1';
const LS_ICAL_DRAFTS = 'as-courage.icalDrafts.v1';
const LS_ICAL_DAY_SELECTIONS = 'as-courage.icalDaySelections.v1';
const LS_ADDITIONAL_CALENDARS = 'as-courage.additionalCalendars.v1';
const LS_ICAL_ADDITIONAL_CALENDAR_SELECTIONS =
    'as-courage.icalAdditionalCalendarSelections.v1';

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

type EditionRow = {
    id: string;
    title?: string;
    quote: string;
    questions: string[];
};

type DraftTexts = Record<string, string>;
type DaySelections = Record<string, boolean>;

type AdditionalCalendarCategory =
    | 'schoolHolidays'
    | 'nationalHolidays'
    | 'internationalHolidays'
    | 'businessCalendar'
    | 'custom';

type AdditionalCalendarPreviewEvent = {
    uid: string;
    summary: string;
    startText: string;
    endText: string;
    description: string;
};

type StoredAdditionalCalendar = {
    id: string;
    label: string;
    category: AdditionalCalendarCategory;
    sourceType: 'url' | 'file';
    sourceLabel: string;
    sourceUrl?: string;
    fileName?: string;
    importedAt: string;
    isEnabled: boolean;
    rawIcs: string;
    eventCount: number;
    previewEvents: AdditionalCalendarPreviewEvent[];
};

const THEMES: EditionRow[] = edition1 as unknown as EditionRow[];

const WEEKDAYS = [
    { key: 'Mo', label: 'Montag', index: 0 },
    { key: 'Di', label: 'Dienstag', index: 1 },
    { key: 'Mi', label: 'Mittwoch', index: 2 },
    { key: 'Do', label: 'Donnerstag', index: 3 },
    { key: 'Fr', label: 'Freitag', index: 4 },
    { key: 'Sa', label: 'Samstag', index: 5 },
    { key: 'So', label: 'Sonntag', index: 6 },
] as const;

function readSetup(): SetupState | null {
    try {
        const possibleKeys = [
            LS_SETUP,
            'as-courage.themeSetup',
            'themeSetup',
            'setup',
            'as-courage.setup.v1',
        ];

        for (const key of possibleKeys) {
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            const parsed = JSON.parse(raw) as SetupState;
            if (parsed && typeof parsed === 'object') return parsed;
        }

        return null;
    } catch {
        return null;
    }
}

function readIcalDrafts(): DraftTexts {
    try {
        const raw = localStorage.getItem(LS_ICAL_DRAFTS);
        if (!raw) return {};

        const parsed = JSON.parse(raw) as DraftTexts;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

        return parsed;
    } catch {
        return {};
    }
}

function readIcalDaySelections(): DaySelections {
    try {
        const raw = localStorage.getItem(LS_ICAL_DAY_SELECTIONS);
        if (!raw) return {};

        const parsed = JSON.parse(raw) as DaySelections;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

        return parsed;
    } catch {
        return {};
    }
}

function isStoredAdditionalCalendar(value: unknown): value is StoredAdditionalCalendar {
    if (!value || typeof value !== 'object') return false;

    const candidate = value as Partial<StoredAdditionalCalendar>;

    return (
        typeof candidate.id === 'string' &&
        typeof candidate.label === 'string' &&
        typeof candidate.category === 'string' &&
        (candidate.sourceType === 'url' || candidate.sourceType === 'file') &&
        typeof candidate.sourceLabel === 'string' &&
        typeof candidate.importedAt === 'string' &&
        typeof candidate.isEnabled === 'boolean' &&
        typeof candidate.rawIcs === 'string' &&
        typeof candidate.eventCount === 'number' &&
        Array.isArray(candidate.previewEvents)
    );
}

function readStoredAdditionalCalendars(): StoredAdditionalCalendar[] {
    try {
        const raw = localStorage.getItem(LS_ADDITIONAL_CALENDARS);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];

        return parsed.filter(isStoredAdditionalCalendar);
    } catch {
        return [];
    }
}

function readIcalAdditionalCalendarSelections(): string[] {
    try {
        const raw = localStorage.getItem(LS_ICAL_ADDITIONAL_CALENDAR_SELECTIONS);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((value): value is string => typeof value === 'string');
    } catch {
        return [];
    }
}

function writeIcalDrafts(drafts: DraftTexts) {
    try {
        if (Object.keys(drafts).length === 0) {
            localStorage.removeItem(LS_ICAL_DRAFTS);
            return;
        }

        localStorage.setItem(LS_ICAL_DRAFTS, JSON.stringify(drafts));
    } catch {
        // lokal still behandeln
    }
}

function writeIcalDaySelections(daySelections: DaySelections) {
    try {
        if (Object.keys(daySelections).length === 0) {
            localStorage.removeItem(LS_ICAL_DAY_SELECTIONS);
            return;
        }

        localStorage.setItem(LS_ICAL_DAY_SELECTIONS, JSON.stringify(daySelections));
    } catch {
        // lokal still behandeln
    }
}

function writeIcalAdditionalCalendarSelections(selectedCalendarIds: string[]) {
    try {
        if (selectedCalendarIds.length === 0) {
            localStorage.removeItem(LS_ICAL_ADDITIONAL_CALENDAR_SELECTIONS);
            return;
        }

        localStorage.setItem(
            LS_ICAL_ADDITIONAL_CALENDAR_SELECTIONS,
            JSON.stringify(selectedCalendarIds),
        );
    } catch {
        // lokal still behandeln
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
    const title = row.title?.trim();
    return title && title.length > 0 ? title : prettifyId(row.id);
}

function categoryLabel(category: AdditionalCalendarCategory): string {
    switch (category) {
        case 'schoolHolidays':
            return 'Schulferien';
        case 'nationalHolidays':
            return 'nationale Feiertage';
        case 'internationalHolidays':
            return 'internationale Feiertage';
        case 'businessCalendar':
            return 'Betriebskalender';
        case 'custom':
            return 'eigener Zusatzkalender';
        default:
            return 'Zusatzkalender';
    }
}

function makeDraftKey(themeId: string, weekIndex: number, dayKey: string): string {
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

function sanitizeFileName(value: string): string {
    const trimmed = value.trim();
    const normalized = trimmed.length > 0 ? trimmed : 'kalender';

    return normalized
        .replace(/[\\/:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
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

function unfoldImportedIcsText(text: string): string {
    return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function extractImportedEventBlocks(rawIcs: string): string[][] {
    const unfolded = unfoldImportedIcsText(rawIcs);
    const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

    return blocks.map((block) =>
        block
            .split(/\r?\n/)
            .map((line) => line.trimEnd())
            .filter((line) => line.length > 0),
    );
}

function buildAdditionalCalendarEvents(
    selectedAdditionalCalendars: StoredAdditionalCalendar[],
    stamp: string,
    uidBase: string,
    startEventIndex: number,
) {
    const lines: string[] = [];
    let nextEventIndex = startEventIndex;

    selectedAdditionalCalendars.forEach((calendar, calendarIndex) => {
        const eventBlocks = extractImportedEventBlocks(calendar.rawIcs);

        eventBlocks.forEach((eventLines, eventBlockIndex) => {
            let hasUid = false;
            let hasDtstamp = false;

            const replacementUid = `${uidBase}-additional-${calendarIndex}-${eventBlockIndex}-${nextEventIndex}@as-courage`;

            const normalizedLines = eventLines.map((line) => {
                if (/^UID(?:;|:)/i.test(line)) {
                    hasUid = true;
                    return `UID:${replacementUid}`;
                }

                if (/^DTSTAMP(?:;|:)/i.test(line)) {
                    hasDtstamp = true;
                    return `DTSTAMP:${stamp}`;
                }

                return line;
            });

            const beginIndex = normalizedLines.findIndex((line) => line === 'BEGIN:VEVENT');
            const insertIndex = beginIndex >= 0 ? beginIndex + 1 : 0;

            if (!hasUid) {
                normalizedLines.splice(insertIndex, 0, `UID:${replacementUid}`);
            }

            if (!hasDtstamp) {
                const dtstampInsertIndex = !hasUid ? insertIndex + 1 : insertIndex;
                normalizedLines.splice(dtstampInsertIndex, 0, `DTSTAMP:${stamp}`);
            }

            lines.push(...normalizedLines);
            nextEventIndex++;
        });
    });

    return {
        lines,
        nextEventIndex,
    };
}

function buildIcsFromEditorData(
    setup: SetupState | null,
    selectedThemes: EditionRow[],
    draftTexts: DraftTexts,
    daySelections: DaySelections,
    selectedAdditionalCalendars: StoredAdditionalCalendar[],
): string {
    const stamp = dtstampUtc();
    const uidBase = `teamkalender-${stamp}-${Math.random().toString(16).slice(2)}`;

    const weeksCount = setup?.weeksCount ?? 0;
    const startIso = setup?.startMonday;
    const baseDate = parseIsoDate(startIso);

    if (!baseDate || weeksCount < 1 || selectedThemes.length === 0) {
        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//as-courage//Teamkalender//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Teamkalender',
            'X-WR-CALDESC:Teamkalender',
            'END:VCALENDAR',
            '',
        ].join('\r\n');
    }

    const activeAdditionalCalendarLabels = selectedAdditionalCalendars.map(
        (calendar) => calendar.label,
    );

    const calendarDescription =
        activeAdditionalCalendarLabels.length > 0
            ? `Teamkalender mit Zusatzkalendern: ${activeAdditionalCalendarLabels.join(', ')}`
            : 'Teamkalender ohne Zusatzkalender';

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//as-courage//Teamkalender//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Teamkalender',
        `X-WR-CALDESC:${escapeIcsText(calendarDescription)}`,
    ];

    let eventIndex = 0;

    const countWeeks = Math.min(weeksCount, selectedThemes.length);

    for (let weekIndex = 0; weekIndex < countWeeks; weekIndex++) {
        const theme = selectedThemes[weekIndex];
        const weekMonday = addDays(baseDate, weekIndex * 7);
        const title = displayTitle(theme);
        const quote = theme.quote ?? '';

        for (const weekday of WEEKDAYS) {
            const draftKey = makeDraftKey(theme.id, weekIndex, weekday.key);
            const isActive = daySelections[draftKey] ?? true;

            if (!isActive) continue;

            const date = addDays(weekMonday, weekday.index);
            const dtStart = yyyymmdd(date);
            const dtEnd = yyyymmdd(addDays(date, 1));

            const dayText =
                weekday.index <= 4
                    ? draftTexts[draftKey] ?? theme.questions?.[weekday.index] ?? ''
                    : draftTexts[draftKey] ?? 'Schönes Wochenende';

            const summary = `Teamkalender · ${title} · ${weekday.label}`;

            const description =
                weekday.index <= 4
                    ? [
                        'Teamkalender',
                        `Datum: ${formatDE(date)}`,
                        `Wochenthema: ${title}`,
                        `Zitat: ${quote}`,
                        `Tagesimpuls: ${dayText}`,
                    ].join('\n')
                    : [
                        'Teamkalender',
                        `Datum: ${formatDE(date)}`,
                        `Wochenthema: ${title}`,
                        `Hinweis: ${dayText || 'Schönes Wochenende'}`,
                    ].join('\n');

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

    if (selectedAdditionalCalendars.length > 0) {
        const additionalCalendarEvents = buildAdditionalCalendarEvents(
            selectedAdditionalCalendars,
            stamp,
            uidBase,
            eventIndex,
        );

        lines.push(...additionalCalendarEvents.lines);
    }

    lines.push('END:VCALENDAR', '');

    return lines.join('\r\n');
}

export default function ICalEditorPage() {
    const router = useRouter();
    const additionalCalendarsSectionRef = useRef<HTMLDivElement | null>(null);
    const previousScrollYRef = useRef<number | null>(null);

    const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [setup, setSetup] = useState<SetupState | null>(null);
    const [draftTexts, setDraftTexts] = useState<DraftTexts>({});
    const [daySelections, setDaySelections] = useState<DaySelections>({});
    const [storedAdditionalCalendars, setStoredAdditionalCalendars] = useState<
        StoredAdditionalCalendar[]
    >([]);
    const [selectedAdditionalCalendarIds, setSelectedAdditionalCalendarIds] = useState<
        string[]
    >([]);
    const [showAdditionalCalendarsSection, setShowAdditionalCalendarsSection] =
        useState(false);
    const [storageLoaded, setStorageLoaded] = useState(false);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        let alive = true;

        async function loadData() {
            const plan = await readCurrentUserPlan();
            const currentSetup = readSetup();
            const storedDrafts = readIcalDrafts();
            const storedDaySelections = readIcalDaySelections();
            const preparedAdditionalCalendars = readStoredAdditionalCalendars();
            const storedAdditionalCalendarSelections =
                readIcalAdditionalCalendarSelections();

            const validAdditionalCalendarSelections =
                storedAdditionalCalendarSelections.filter((calendarId) =>
                    preparedAdditionalCalendars.some(
                        (calendar) => calendar.id === calendarId && calendar.isEnabled,
                    ),
                );

            if (!alive) return;

            setCurrentUserPlan(plan);
            setSetup(currentSetup);
            setDraftTexts(storedDrafts);
            setDaySelections(storedDaySelections);
            setStoredAdditionalCalendars(preparedAdditionalCalendars);
            setSelectedAdditionalCalendarIds(validAdditionalCalendarSelections);
            setIsLoadingPlan(false);
            setStorageLoaded(true);
        }

        loadData();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!showAdditionalCalendarsSection) return;

        const frame = window.requestAnimationFrame(() => {
            additionalCalendarsSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [showAdditionalCalendarsSection]);

    const isVariantC = currentUserPlan === 'C';

    const selectedThemes = useMemo(() => {
        const ids = setup?.themeIds;
        if (!ids || !Array.isArray(ids) || ids.length === 0) return [];

        const map = new Map<string, EditionRow>();
        for (const theme of THEMES) {
            map.set(theme.id, theme);
        }

        return ids.map((id) => map.get(id)).filter(Boolean) as EditionRow[];
    }, [setup]);

    const weeks = useMemo(() => {
        const baseDate = parseIsoDate(setup?.startMonday);
        if (!baseDate || selectedThemes.length === 0) return [];

        const countWeeks = Math.min(
            setup?.weeksCount ?? selectedThemes.length,
            selectedThemes.length,
        );

        return selectedThemes.slice(0, countWeeks).map((theme, weekIndex) => {
            const monday = addDays(baseDate, weekIndex * 7);
            const friday = addDays(monday, 4);

            const days = WEEKDAYS.map((weekday) => {
                const date = addDays(monday, weekday.index);
                const draftKey = makeDraftKey(theme.id, weekIndex, weekday.key);

                const defaultText =
                    weekday.index <= 4
                        ? theme.questions?.[weekday.index] ?? '—'
                        : 'Schönes Wochenende';

                const currentText = draftTexts[draftKey] ?? defaultText;
                const isEdited = currentText !== defaultText;
                const isActive = daySelections[draftKey] ?? true;
                const isChanged = isEdited || !isActive;

                return {
                    ...weekday,
                    draftKey,
                    dateText: formatDE(date),
                    defaultText,
                    currentText,
                    isEdited,
                    isActive,
                    isChanged,
                };
            });

            return {
                themeId: theme.id,
                themeTitle: displayTitle(theme),
                quote: theme.quote ?? '',
                rangeText: `${formatDE(monday)} – ${formatDE(friday)}`,
                days,
            };
        });
    }, [setup?.startMonday, setup?.weeksCount, selectedThemes, draftTexts, daySelections]);

    const activePreparedAdditionalCalendars = useMemo(
        () => storedAdditionalCalendars.filter((calendar) => calendar.isEnabled),
        [storedAdditionalCalendars],
    );

    const selectedAdditionalCalendars = useMemo(
        () =>
            activePreparedAdditionalCalendars.filter((calendar) =>
                selectedAdditionalCalendarIds.includes(calendar.id),
            ),
        [activePreparedAdditionalCalendars, selectedAdditionalCalendarIds],
    );

    const hasAnyChanges =
        Object.keys(draftTexts).length > 0 ||
        Object.keys(daySelections).length > 0 ||
        selectedAdditionalCalendarIds.length > 0;

    const canExport = Boolean(setup?.startMonday) && selectedThemes.length > 0;
    const hasSelectedAdditionalCalendars = selectedAdditionalCalendars.length > 0;
    const selectedAdditionalCalendarNames = selectedAdditionalCalendars.map(
        (calendar) => calendar.label,
    );

    function markDirty() {
        setSaveSuccess(false);
        setSaveNotice('Ungespeicherte Änderungen');
    }

    function resetSingleDay(draftKey: string) {
        setDraftTexts((prev) => {
            const next = { ...prev };
            delete next[draftKey];
            return next;
        });

        setDaySelections((prev) => {
            const next = { ...prev };
            delete next[draftKey];
            return next;
        });

        markDirty();
    }

    function resetAllDrafts() {
        setDraftTexts({});
        setDaySelections({});
        setSelectedAdditionalCalendarIds([]);
        writeIcalDrafts({});
        writeIcalDaySelections({});
        writeIcalAdditionalCalendarSelections([]);
        setSaveSuccess(false);
        setSaveNotice('Alle lokalen Änderungen wurden zurückgesetzt.');
    }

    function handleSaveDrafts() {
        writeIcalDrafts(draftTexts);
        writeIcalDaySelections(daySelections);
        writeIcalAdditionalCalendarSelections(selectedAdditionalCalendarIds);
        setSaveSuccess(true);
        setSaveNotice(
            'Änderungen wurden im localStorage dieses Browsers auf diesem Gerät gespeichert.',
        );
    }

    function handleDownloadTeamCalendarOnly() {
        const ics = buildIcsFromEditorData(
            setup,
            selectedThemes,
            draftTexts,
            daySelections,
            [],
        );
        downloadTextFile('Teamkalender.ics', ics, 'text/calendar;charset=utf-8');
    }

    function handleDownloadIntegratedCalendar() {
        const ics = buildIcsFromEditorData(
            setup,
            selectedThemes,
            draftTexts,
            daySelections,
            selectedAdditionalCalendars,
        );

        downloadTextFile(
            'Teamkalender-mit-Zusatzkalendern.ics',
            ics,
            'text/calendar;charset=utf-8',
        );
    }

    function handleDownloadSingleAdditionalCalendar(calendar: StoredAdditionalCalendar) {
        const fileName = `${sanitizeFileName(calendar.label)}.ics`;
        downloadTextFile(fileName, calendar.rawIcs, 'text/calendar;charset=utf-8');
    }

    function toggleAdditionalCalendarSelection(calendarId: string) {
        setSelectedAdditionalCalendarIds((prev) =>
            prev.includes(calendarId)
                ? prev.filter((id) => id !== calendarId)
                : [...prev, calendarId],
        );
        markDirty();
    }

    function handleOpenAdditionalCalendarsSection() {
        if (showAdditionalCalendarsSection) {
            additionalCalendarsSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            return;
        }

        previousScrollYRef.current = window.scrollY;
        setShowAdditionalCalendarsSection(true);
    }

    function handleCloseAdditionalCalendarsSection() {
        const scrollTarget = previousScrollYRef.current ?? 0;
        setShowAdditionalCalendarsSection(false);

        window.requestAnimationFrame(() => {
            window.scrollTo({
                top: scrollTarget,
                behavior: 'smooth',
            });
            previousScrollYRef.current = null;
        });
    }

    return (
        <BackgroundLayout>
            <div className="mx-auto flex min-h-[100svh] max-w-6xl px-10 py-3">
                <div className="w-full rounded-none border-0 bg-white/98 shadow-none sm:rounded-2xl sm:border sm:border-[#F29420] sm:bg-white/85 sm:shadow-xl sm:backdrop-blur-md">
                    <div className="p-5 sm:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-semibold text-slate-900">
                                    iCal-Editor{' '}
                                    <span className="text-slate-600">(Variante C)</span>
                                </h1>

                                <div className="mt-2 text-base text-slate-900">
                                    Aktuell:{' '}
                                    <span className="font-semibold text-[#F29420]">
                                        {isLoadingPlan
                                            ? 'wird geladen'
                                            : currentUserPlan
                                                ? `Variante ${currentUserPlan}`
                                                : 'unbekannt'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveDrafts}
                                    className={[
                                        'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg',
                                        saveSuccess
                                            ? 'border-[#4EA72E] bg-[#4EA72E] hover:border-[#3f8a25] hover:bg-[#3f8a25]'
                                            : 'border-[#F29420] bg-[#F29420] hover:border-[#E4891E] hover:bg-[#E4891E]',
                                    ].join(' ')}
                                >
                                    {saveSuccess
                                        ? 'Änderungen gespeichert'
                                        : 'Änderungen speichern'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.push('/quotes')}
                                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#F29420] bg-[#F29420] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#E4891E] hover:bg-[#E4891E] hover:shadow-lg"
                                >
                                    Schließen
                                </button>
                            </div>
                        </div>

                        {saveNotice ? (
                            <div
                                className={[
                                    'mt-4 rounded-2xl border px-4 py-3 text-sm',
                                    saveSuccess
                                        ? 'border-[#4EA72E] bg-green-50 text-[#2f6a1c]'
                                        : 'border-[#F29420] bg-amber-50 text-slate-800',
                                ].join(' ')}
                            >
                                {saveNotice}
                            </div>
                        ) : null}

                        <div className="mt-6 rounded-2xl border-2 border-[#F29420] bg-white p-5">
                            {!isLoadingPlan && !isVariantC ? (
                                <div className="space-y-4">
                                    <div className="text-lg font-semibold text-slate-900">
                                        Dieser Bereich ist in Variante C verfügbar.
                                    </div>

                                    <p className="text-sm leading-relaxed text-slate-700">
                                        Hier entsteht die neue bearbeitbare iCal-Oberfläche
                                        für Variante C. In Variante A und B bleibt dieser
                                        Bereich deaktiviert.
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href="/account"
                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                                        >
                                            zum upgrade
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => router.push('/quotes')}
                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                                        >
                                            zurück
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="rounded-2xl border border-[#F29420] bg-amber-50 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="max-w-3xl">
                                                <div className="text-sm font-semibold text-slate-900">
                                                    Teamkalender
                                                </div>
                                                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                    Hier sehen Sie bewusst zuerst nur die
                                                    ausgewählten Wochenthemen und
                                                    Tagesimpulse. Den Teamkalender können Sie
                                                    direkt als Standard oder in der aktuell
                                                    bearbeiteten Fassung laden.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleDownloadTeamCalendarOnly}
                                                    disabled={!canExport}
                                                    className={[
                                                        'inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition duration-200',
                                                        canExport
                                                            ? 'cursor-pointer border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg'
                                                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                                    ].join(' ')}
                                                >
                                                    Teamkalender standard / bearbeitet laden
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleOpenAdditionalCalendarsSection}
                                                    className={[
                                                        'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg',
                                                        showAdditionalCalendarsSection
                                                            ? 'border-[#7A0000] bg-[#7A0000] hover:border-[#660000] hover:bg-[#660000]'
                                                            : 'border-[#990000] bg-[#990000] hover:border-[#7A0000] hover:bg-[#7A0000]',
                                                    ].join(' ')}
                                                >
                                                    Zusatzkalender
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {!setup?.startMonday || selectedThemes.length === 0 ? (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                            Ich finde aktuell noch kein vollständiges Setup.
                                            Bitte wähle zuerst auf der Themen-Seite Themen,
                                            Startmontag und iCal aus.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {weeks.map((week, weekIndex) => (
                                                <div
                                                    key={`${week.themeId}-${weekIndex}`}
                                                    className="rounded-2xl border-2 border-[#F29420] bg-slate-50 p-4"
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <div className="text-lg font-semibold text-slate-900">
                                                                {week.themeTitle}
                                                            </div>
                                                            <div className="mt-1 text-sm font-medium text-slate-600">
                                                                {week.rangeText}
                                                            </div>
                                                        </div>

                                                        <div className="rounded-xl border border-[#F29420] bg-white px-3 py-2 text-sm text-slate-700">
                                                            Woche {weekIndex + 1}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 rounded-xl border border-[#F29420] bg-white p-4">
                                                        <div className="text-sm font-semibold text-slate-900">
                                                            Wochenzitat
                                                        </div>
                                                        <div className="mt-2 text-sm leading-relaxed text-slate-700">
                                                            „{week.quote}“
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                        {week.days.map((day) => (
                                                            <div
                                                                key={`${week.themeId}-${weekIndex}-${day.key}`}
                                                                className="rounded-2xl border border-slate-200 bg-white p-4"
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-slate-900">
                                                                            {day.label}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {day.dateText}
                                                                        </div>
                                                                    </div>

                                                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#F29420] bg-amber-50 px-3 py-2 text-xs font-semibold text-slate-800">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={
                                                                                day.isActive
                                                                            }
                                                                            onChange={() => {
                                                                                setDaySelections(
                                                                                    (prev) => {
                                                                                        const next =
                                                                                        {
                                                                                            ...prev,
                                                                                        };
                                                                                        const currentlyActive =
                                                                                            prev[
                                                                                            day
                                                                                                .draftKey
                                                                                            ] ??
                                                                                            true;

                                                                                        if (
                                                                                            currentlyActive
                                                                                        ) {
                                                                                            next[
                                                                                                day
                                                                                                    .draftKey
                                                                                            ] =
                                                                                                false;
                                                                                        } else {
                                                                                            delete next[
                                                                                                day
                                                                                                    .draftKey
                                                                                            ];
                                                                                        }

                                                                                        return next;
                                                                                    },
                                                                                );
                                                                                markDirty();
                                                                            }}
                                                                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#F29420] focus:ring-[#F29420]"
                                                                        />
                                                                        <span>
                                                                            exportieren
                                                                        </span>
                                                                    </label>
                                                                </div>

                                                                <textarea
                                                                    value={
                                                                        day.currentText
                                                                    }
                                                                    onChange={(event) => {
                                                                        setDraftTexts(
                                                                            (prev) => ({
                                                                                ...prev,
                                                                                [day.draftKey]:
                                                                                    event.target
                                                                                        .value,
                                                                            }),
                                                                        );
                                                                        markDirty();
                                                                    }}
                                                                    rows={4}
                                                                    className="mt-3 min-h-[112px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[#F29420] focus:ring-2 focus:ring-[#F29420]/20"
                                                                />

                                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="text-xs text-slate-500">
                                                                        Standard:{' '}
                                                                        {
                                                                            day.defaultText
                                                                        }
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            resetSingleDay(
                                                                                day.draftKey,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !day.isChanged
                                                                        }
                                                                        className={[
                                                                            'inline-flex min-h-[36px] items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition duration-200',
                                                                            day.isChanged
                                                                                ? 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'
                                                                                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                                                        ].join(
                                                                            ' ',
                                                                        )}
                                                                    >
                                                                        Standard
                                                                        wiederherstellen
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-lg font-semibold text-slate-900">
                                                Bearbeitbare Struktur mit bewusster
                                                Speicherung
                                            </div>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                Änderungen werden nicht automatisch
                                                übernommen. Erst nach Klick auf
                                                „Änderungen speichern“ bleiben sie lokal auf
                                                diesem Gerät erhalten.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={resetAllDrafts}
                                            disabled={!hasAnyChanges}
                                            className={[
                                                'inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition duration-200',
                                                hasAnyChanges
                                                    ? 'cursor-pointer border-[#F29420] bg-[#F29420] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-lg'
                                                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                            ].join(' ')}
                                        >
                                            alle Änderungen zurücksetzen
                                        </button>
                                    </div>

                                    {showAdditionalCalendarsSection ? (
                                        <div
                                            ref={additionalCalendarsSectionRef}
                                            className="rounded-2xl border border-[#990000] bg-[#FFF4F4] p-4"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="max-w-3xl">
                                                    <div className="text-lg font-semibold text-slate-900">
                                                        Zusatzkalender
                                                    </div>
                                                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                        Hier wählen Sie lokal gespeicherte
                                                        Zusatzkalender aus, die zusätzlich in
                                                        den Teamkalender integriert werden
                                                        sollen. Jeder Zusatzkalender kann
                                                        außerdem einzeln geladen werden.
                                                    </p>
                                                </div>

                                                <div className="ml-auto flex w-full max-w-[520px] flex-wrap items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(
                                                                '/ical-zusatzkalender',
                                                            )
                                                        }
                                                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-[#990000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg"
                                                    >
                                                        weiter zu iCal-Zusatzkalender
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={handleCloseAdditionalCalendarsSection}
                                                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-[#990000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg"
                                                    >
                                                        schließen
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                                <div className="rounded-2xl border border-[#990000] bg-white p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-[#7A0000]">
                                                        Lokal gespeichert
                                                    </div>
                                                    <div className="mt-2 text-sm font-semibold text-slate-900">
                                                        {storedAdditionalCalendars.length}{' '}
                                                        Zusatzkalender
                                                    </div>
                                                    <div className="mt-1 text-xs leading-relaxed text-slate-600">
                                                        Davon{' '}
                                                        {
                                                            activePreparedAdditionalCalendars.length
                                                        }{' '}
                                                        aktuell einsatzbereit
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-[#990000] bg-white p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-[#7A0000]">
                                                        Für Teamkalender ausgewählt
                                                    </div>
                                                    <div className="mt-2 text-sm font-semibold text-slate-900">
                                                        {
                                                            selectedAdditionalCalendars.length
                                                        }{' '}
                                                        Zusatzkalender
                                                    </div>
                                                    <div className="mt-1 text-xs leading-relaxed text-slate-600">
                                                        {hasSelectedAdditionalCalendars
                                                            ? selectedAdditionalCalendarNames.join(
                                                                ', ',
                                                            )
                                                            : 'Aktuell keine Auswahl'}
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-[#990000] bg-white p-4">
                                                    <div className="text-xs font-semibold uppercase tracking-wide text-[#7A0000]">
                                                        Gemeinsamer Export
                                                    </div>
                                                    <div className="mt-2 text-sm font-semibold text-slate-900">
                                                        Teamkalender mit Auswahl
                                                    </div>
                                                    <div className="mt-1 text-xs leading-relaxed text-slate-600">
                                                        Lädt Teamkalender plus markierte
                                                        Zusatzkalender
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                {!storageLoaded ? (
                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                                        Zusatzkalender werden geladen …
                                                    </div>
                                                ) : storedAdditionalCalendars.length ===
                                                    0 ? (
                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                                                        Es sind noch keine
                                                        Zusatzkalender lokal gespeichert.
                                                        Bitte zuerst im
                                                        Zusatzkalender-Assistenten prüfen,
                                                        benennen und speichern.
                                                    </div>
                                                ) : (
                                                    storedAdditionalCalendars.map(
                                                        (calendar) => {
                                                            const isSelected =
                                                                selectedAdditionalCalendarIds.includes(
                                                                    calendar.id,
                                                                );

                                                            return (
                                                                <div
                                                                    key={
                                                                        calendar.id
                                                                    }
                                                                    className={[
                                                                        'rounded-2xl border px-4 py-4 shadow-sm transition duration-200',
                                                                        calendar.isEnabled
                                                                            ? 'border-[#C88F8F] bg-white'
                                                                            : 'border-[#E7CACA] bg-[#FFF8F8]',
                                                                    ].join(
                                                                        ' ',
                                                                    )}
                                                                >
                                                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)_auto] lg:items-center">
                                                                        <div className="min-w-0">
                                                                            <div className="text-sm font-semibold text-slate-900">
                                                                                {
                                                                                    calendar.label
                                                                                }
                                                                            </div>

                                                                            <div className="mt-1 text-xs leading-relaxed text-slate-600">
                                                                                Kategorie:{' '}
                                                                                {categoryLabel(
                                                                                    calendar.category,
                                                                                )}{' '}
                                                                                ·
                                                                                Quelle:{' '}
                                                                                {
                                                                                    calendar.sourceLabel
                                                                                }
                                                                            </div>

                                                                            <div className="mt-1 text-xs leading-relaxed text-slate-600">
                                                                                Einträge:{' '}
                                                                                {
                                                                                    calendar.eventCount
                                                                                }
                                                                            </div>

                                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                                <span className="inline-flex rounded-xl border border-[#C88F8F] bg-[#FFF4F4] px-2.5 py-1 text-[11px] font-semibold text-[#7A0000]">
                                                                                    lokal
                                                                                    gespeichert
                                                                                </span>

                                                                                {calendar.isEnabled ? (
                                                                                    <span
                                                                                        className={[
                                                                                            'inline-flex rounded-xl border px-2.5 py-1 text-[11px] font-semibold',
                                                                                            isSelected
                                                                                                ? 'border-[#990000] bg-[#FCEEEE] text-[#7A0000]'
                                                                                                : 'border-[#D7B1B1] bg-white text-slate-700',
                                                                                        ].join(
                                                                                            ' ',
                                                                                        )}
                                                                                    >
                                                                                        {isSelected
                                                                                            ? 'für Teamkalender ausgewählt'
                                                                                            : 'nicht ausgewählt'}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex rounded-xl border border-[#D7B1B1] bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                                                                                        im
                                                                                        Assistenten
                                                                                        deaktiviert
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <label
                                                                            className={[
                                                                                'flex min-h-[72px] items-center gap-3 rounded-2xl border px-4 py-3 transition duration-200',
                                                                                calendar.isEnabled
                                                                                    ? 'cursor-pointer border-[#990000] bg-[#FFF4F4] hover:-translate-y-0.5 hover:shadow-md'
                                                                                    : 'cursor-not-allowed border-[#E7CACA] bg-[#FFF8F8] text-slate-400',
                                                                            ].join(
                                                                                ' ',
                                                                            )}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={
                                                                                    isSelected
                                                                                }
                                                                                disabled={
                                                                                    !calendar.isEnabled
                                                                                }
                                                                                onChange={() => {
                                                                                    if (
                                                                                        !calendar.isEnabled
                                                                                    )
                                                                                        return;
                                                                                    toggleAdditionalCalendarSelection(
                                                                                        calendar.id,
                                                                                    );
                                                                                }}
                                                                                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#F29420] focus:ring-[#F29420] disabled:cursor-not-allowed"
                                                                            />

                                                                            <div className="min-w-0">
                                                                                <div className="text-sm font-semibold text-slate-900">
                                                                                    in
                                                                                    Teamkalender
                                                                                    integrieren
                                                                                </div>
                                                                                <div className="mt-1 text-xs leading-relaxed text-slate-600">
                                                                                    {calendar.isEnabled
                                                                                        ? 'Dieser Kalender wird beim gemeinsamen Export zusätzlich übernommen.'
                                                                                        : 'Diesen Kalender bitte zuerst im Zusatzkalender-Assistenten wieder aktivieren.'}
                                                                                </div>
                                                                            </div>
                                                                        </label>

                                                                        <div className="flex lg:justify-end">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleDownloadSingleAdditionalCalendar(
                                                                                        calendar,
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    !calendar.isEnabled
                                                                                }
                                                                                className={[
                                                                                    'inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition duration-200',
                                                                                    calendar.isEnabled
                                                                                        ? 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'
                                                                                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                                                                ].join(
                                                                                    ' ',
                                                                                )}
                                                                            >
                                                                                einzeln
                                                                                laden
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        },
                                                    )
                                                )}
                                            </div>

                                            {storageLoaded &&
                                                storedAdditionalCalendars.length > 0 &&
                                                activePreparedAdditionalCalendars.length ===
                                                0 ? (
                                                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                                    Es sind Zusatzkalender lokal
                                                    gespeichert, aber aktuell keiner ist
                                                    einsatzbereit. Aktivieren Sie den
                                                    gewünschten Kalender zuerst im
                                                    Zusatzkalender-Assistenten.
                                                </div>
                                            ) : null}

                                            <div className="mt-4 rounded-2xl border border-[#990000] bg-[#FFF4F4] p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="max-w-3xl">
                                                        <div className="text-sm font-semibold text-slate-900">
                                                            Teamkalender mit Auswahl
                                                        </div>
                                                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                            Hier laden Sie den
                                                            Teamkalender gemeinsam mit
                                                            allen Zusatzkalendern
                                                            herunter, die oben per
                                                            Checkbox ausgewählt wurden.
                                                        </p>

                                                        <div className="mt-3 rounded-xl border border-[#D7B1B1] bg-white px-3 py-3 text-xs leading-relaxed text-slate-700">
                                                            {hasSelectedAdditionalCalendars ? (
                                                                <>
                                                                    Ausgewählt:{' '}
                                                                    <span className="font-semibold text-[#990000]">
                                                                        {selectedAdditionalCalendarNames.join(
                                                                            ', ',
                                                                        )}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Aktuell ist noch kein
                                                                    Zusatzkalender für
                                                                    den Teamkalender
                                                                    ausgewählt.
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleDownloadIntegratedCalendar
                                                        }
                                                        disabled={
                                                            !canExport ||
                                                            !hasSelectedAdditionalCalendars
                                                        }
                                                        className={[
                                                            'inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition duration-200',
                                                            canExport &&
                                                                hasSelectedAdditionalCalendars
                                                                ? 'cursor-pointer border-[#990000] bg-[#990000] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg'
                                                                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                                        ].join(' ')}
                                                    >
                                                        Teamkalender mit Auswahl laden
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </BackgroundLayout>
    );
}