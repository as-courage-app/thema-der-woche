'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import { readCurrentUserPlan } from '@/lib/userPlan';
import edition1 from '../data/edition1.json';

const LS_SETUP = 'as-courage.themeSetup.v1';
const LS_ICAL_DRAFTS = 'as-courage.icalDrafts.v1';
const LS_ICAL_DAY_SELECTIONS = 'as-courage.icalDaySelections.v1';
const LS_ICAL_CALENDAR_IMPORTS = 'as-courage.icalCalendarImports.v1';

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

type CalendarImportKey = 'themeImpulse';

type CalendarImportOption = {
    key: CalendarImportKey;
    label: string;
    description: string;
};

const CALENDAR_IMPORT_OPTIONS: CalendarImportOption[] = [
    {
        key: 'themeImpulse',
        label: 'Zusatzkalender: Thema der Woche mit Tagesimpuls',
        description:
            'Ergänzt pro ausgewähltem Tag einen zusätzlichen Kalendereintrag mit Wochenthema und passendem Tagesimpuls.',
    },
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

function readIcalCalendarImports(): CalendarImportKey[] {
    try {
        const raw = localStorage.getItem(LS_ICAL_CALENDAR_IMPORTS);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((value): value is CalendarImportKey => value === 'themeImpulse');
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

function writeIcalCalendarImports(selectedCalendarImports: CalendarImportKey[]) {
    try {
        if (selectedCalendarImports.length === 0) {
            localStorage.removeItem(LS_ICAL_CALENDAR_IMPORTS);
            return;
        }

        localStorage.setItem(LS_ICAL_CALENDAR_IMPORTS, JSON.stringify(selectedCalendarImports));
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

function makeDraftKey(themeId: string, weekIndex: number, dayKey: string): string {
    return `${themeId}__${weekIndex}__${dayKey}`;
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

function buildIcsFromEditorData(
    setup: SetupState | null,
    selectedThemes: EditionRow[],
    draftTexts: DraftTexts,
    daySelections: DaySelections,
    selectedCalendarImports: CalendarImportKey[],
): string {

    const stamp = dtstampUtc();
    const uidBase = `tdw-editor-${stamp}-${Math.random().toString(16).slice(2)}`;

    const weeksCount = setup?.weeksCount ?? 0;
    const startIso = setup?.startMonday;
    const baseDate = parseIsoDate(startIso);

    if (!baseDate || weeksCount < 1 || selectedThemes.length === 0) {
        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//as-courage//Thema der Woche iCal-Editor//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'END:VCALENDAR',
            '',
        ].join('\r\n');
    }

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//as-courage//Thema der Woche iCal-Editor//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];

    let eventIndex = 0;

    const countWeeks = Math.min(weeksCount, selectedThemes.length);
    const includeThemeImpulseImport = selectedCalendarImports.includes('themeImpulse');
    void includeThemeImpulseImport;

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

            const questionText =
                weekday.index <= 4
                    ? draftTexts[draftKey] ?? theme.questions?.[weekday.index] ?? ''
                    : draftTexts[draftKey] ?? 'Schönes Wochenende';

            const standardSummary = `${weekday.label}`;
            const standardDescription = `${weekday.label} · ${formatDE(date)}`;

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${uidBase}-${eventIndex}@as-courage`);
            lines.push(`DTSTAMP:${stamp}`);
            lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
            lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
            lines.push('TRANSP:TRANSPARENT');
            lines.push(`SUMMARY:${escapeIcsText(standardSummary)}`);
            lines.push(`DESCRIPTION:${escapeIcsText(standardDescription)}`);
            lines.push('END:VEVENT');

            eventIndex++;

            if (includeThemeImpulseImport) {
                const impulseSummary =
                    weekday.index <= 4
                        ? `${title}: ${questionText || 'Tagesimpuls'}`
                        : `${title}: ${questionText || 'Schönes Wochenende'}`;

                const impulseDescription =
                    weekday.index <= 4
                        ? `Thema: ${title}\nZitat: ${quote}\nTagesimpuls: ${questionText}`
                        : `Thema: ${title}\nHinweis: ${questionText || 'Schönes Wochenende'}`;

                lines.push('BEGIN:VEVENT');
                lines.push(`UID:${uidBase}-${eventIndex}@as-courage`);
                lines.push(`DTSTAMP:${stamp}`);
                lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
                lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
                lines.push('TRANSP:TRANSPARENT');
                lines.push(`SUMMARY:${escapeIcsText(impulseSummary)}`);
                lines.push(`DESCRIPTION:${escapeIcsText(impulseDescription)}`);
                lines.push('END:VEVENT');

                eventIndex++;
            }
        }
    }

    lines.push('END:VCALENDAR', '');
    return lines.join('\r\n');
}

export default function ICalEditorPage() {
    const router = useRouter();

    const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [setup, setSetup] = useState<SetupState | null>(null);
    const [draftTexts, setDraftTexts] = useState<DraftTexts>({});
    const [daySelections, setDaySelections] = useState<DaySelections>({});
    const [storageLoaded, setStorageLoaded] = useState(false);
    const [, setSaveNotice] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedCalendarImports, setSelectedCalendarImports] = useState<CalendarImportKey[]>([]);

    useEffect(() => {
        let alive = true;

        async function loadData() {
            const plan = await readCurrentUserPlan();
            const currentSetup = readSetup();
            const storedDrafts = readIcalDrafts();
            const storedDaySelections = readIcalDaySelections();
            const storedCalendarImports = readIcalCalendarImports();

            if (!alive) return;

            setCurrentUserPlan(plan);
            setSetup(currentSetup);
            setDraftTexts(storedDrafts);
            setDaySelections(storedDaySelections);
            setSelectedCalendarImports(storedCalendarImports);
            setIsLoadingPlan(false);
            setStorageLoaded(true);
        }

        loadData();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!storageLoaded) return;
        // vorerst kein automatisches Speichern mehr
    }, [draftTexts, daySelections, storageLoaded]);

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

        return selectedThemes.map((theme, weekIndex) => {
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
    }, [setup?.startMonday, selectedThemes, draftTexts, daySelections]);

    const hasAnyChanges =
        Object.keys(draftTexts).length > 0 ||
        Object.keys(daySelections).length > 0 ||
        selectedCalendarImports.length > 0;

    const canExport = Boolean(setup?.startMonday) && selectedThemes.length > 0;

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

        setSaveSuccess(false);
        setSaveNotice('Ungespeicherte Änderungen');
    }

    function resetAllDrafts() {
        setDraftTexts({});
        setDaySelections({});
        setSelectedCalendarImports([]);
        writeIcalDrafts({});
        writeIcalDaySelections({});
        writeIcalCalendarImports([]);
        setSaveSuccess(false);
        setSaveNotice('Ungespeicherte Änderungen');
    }

    function handleSaveDrafts() {
        writeIcalDrafts(draftTexts);
        writeIcalDaySelections(daySelections);
        writeIcalCalendarImports(selectedCalendarImports);
        setSaveSuccess(true);
        setSaveNotice('Änderungen wurden im localStorage dieses Browsers auf diesem Gerät gespeichert.');
    }

    function handleDownloadEditedIcal() {
        const ics = buildIcsFromEditorData(
            setup,
            selectedThemes,
            draftTexts,
            daySelections,
            selectedCalendarImports,
        );

        const filename =
            selectedCalendarImports.length > 0
                ? 'thema-der-woche-editor-mit-zusatzkalendern.ics'
                : 'thema-der-woche-editor-standard.ics';

        downloadTextFile(filename, ics, 'text/calendar;charset=utf-8');
    }

    return (
        <BackgroundLayout>
            <div className="mx-auto flex min-h-[100svh] max-w-6xl px-10 py-3">
                <div className="w-full rounded-none border-0 bg-white/98 shadow-none sm:rounded-2xl sm:border sm:border-[#F29420] sm:bg-white/85 sm:shadow-xl sm:backdrop-blur-md">
                    <div className="p-5 sm:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-semibold text-slate-900">
                                    iCal-Editor <span className="text-slate-600">(Variante C)</span>
                                </h1>

                                <div className="mt-2 text-base text-slate-900">
                                    Aktuell:{' '}
                                    <span className="font-semibold text-[#F29420]">
                                        {isLoadingPlan ? 'wird geladen' : currentUserPlan ? `Variante ${currentUserPlan}` : 'unbekannt'}
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
                                    {saveSuccess ? 'Änderungen gespeichert' : 'Änderungen speichern'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadEditedIcal}
                                    disabled={!canExport}
                                    className={[
                                        'inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition duration-200',
                                        canExport
                                            ? 'cursor-pointer border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg'
                                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                    ].join(' ')}
                                >
                                    bearbeiteten iCal herunterladen
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

                        <div className="mt-6 rounded-2xl border-2 border-[#F29420] bg-white p-5">
                            {!isLoadingPlan && !isVariantC ? (
                                <div className="space-y-4">
                                    <div className="text-lg font-semibold text-slate-900">
                                        Dieser Bereich ist in Variante C verfügbar.
                                    </div>

                                    <p className="text-sm leading-relaxed text-slate-700">
                                        Hier entsteht die neue bearbeitbare iCal-Oberfläche für Variante C. In Variante A und B bleibt
                                        dieser Bereich deaktiviert.
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
                                <div className="space-y-5">
                                    <div className="rounded-2xl border border-[#F29420] bg-amber-50 p-4">
                                        <div className="text-sm font-semibold text-slate-900">Zusätzliche Kalender</div>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-700">
                                            Der Standard-Kalender ist immer die feste Grundlage. Zusätzliche Kalender
                                            werden per Häkchen ergänzt.
                                        </p>

                                        <div className="mt-3 rounded-xl border border-[#F29420] bg-white px-3 py-2 text-xs font-medium text-slate-800">
                                            Aktueller Download:{' '}
                                            <span className="font-semibold text-[#F29420]">
                                                {selectedCalendarImports.includes('themeImpulse')
                                                    ? 'Standard-Kalender + Zusatzkalender: Thema der Woche mit Tagesimpuls'
                                                    : 'Standard-Kalender'}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-3">
                                            {!storageLoaded ? (
                                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                                                    Zusätzliche Kalender werden geladen …
                                                </div>
                                            ) : (
                                                CALENDAR_IMPORT_OPTIONS.map((option) => {
                                                    const isChecked = selectedCalendarImports.includes(option.key);

                                                    return (
                                                        <label
                                                            key={option.key}
                                                            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    setSelectedCalendarImports((prev) =>
                                                                        prev.includes(option.key)
                                                                            ? prev.filter((key) => key !== option.key)
                                                                            : [...prev, option.key]
                                                                    );
                                                                    setSaveSuccess(false);
                                                                    setSaveNotice('Ungespeicherte Änderungen');
                                                                }}
                                                                className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-300 text-[#F29420] focus:ring-[#F29420]"
                                                            />

                                                            <span className="flex-1">
                                                                <span className="block text-sm font-semibold text-slate-900">
                                                                    {option.label}
                                                                </span>
                                                                <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                                                                    {option.description}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-lg font-semibold text-slate-900">
                                                Bearbeitbare Struktur mit bewusster Speicherung
                                            </div>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                Änderungen werden nicht mehr automatisch übernommen. Erst nach Klick auf
                                                „Änderungen speichern“ bleiben sie lokal auf diesem Gerät erhalten.
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

                                    {!setup?.startMonday || selectedThemes.length === 0 ? (
                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                            Ich finde aktuell noch kein vollständiges Setup. Bitte wähle zuerst auf der Themen-Seite Themen,
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
                                                            <div className="text-lg font-semibold text-slate-900">{week.themeTitle}</div>
                                                            <div className="mt-1 text-sm font-medium text-slate-600">{week.rangeText}</div>
                                                        </div>

                                                        <div className="rounded-xl border border-[#F29420] bg-white px-3 py-2 text-sm text-slate-700">
                                                            Woche {weekIndex + 1}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 rounded-xl border border-[#F29420] bg-white p-4">
                                                        <div className="text-sm font-semibold text-slate-900">Wochenzitat</div>
                                                        <div className="mt-2 text-sm leading-relaxed text-slate-700">„{week.quote}“</div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                        {week.days.map((day) => (
                                                            <div
                                                                key={`${week.themeId}-${weekIndex}-${day.key}`}
                                                                className="rounded-2xl border border-slate-200 bg-white p-4"
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-slate-900">{day.label}</div>
                                                                        <div className="text-xs text-slate-500">{day.dateText}</div>
                                                                    </div>

                                                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#F29420] bg-amber-50 px-3 py-2 text-xs font-semibold text-slate-800">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={day.isActive}
                                                                            onChange={() => {
                                                                                setDaySelections((prev) => {
                                                                                    const next = { ...prev };
                                                                                    const currentlyActive = prev[day.draftKey] ?? true;

                                                                                    if (currentlyActive) {
                                                                                        next[day.draftKey] = false;
                                                                                    } else {
                                                                                        delete next[day.draftKey];
                                                                                    }

                                                                                    return next;
                                                                                });
                                                                                setSaveSuccess(false);
                                                                                setSaveNotice('Ungespeicherte Änderungen');
                                                                            }}
                                                                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#F29420] focus:ring-[#F29420]"
                                                                        />
                                                                        <span>exportieren</span>
                                                                    </label>
                                                                </div>

                                                                <textarea
                                                                    value={day.currentText}
                                                                    onChange={(event) => {
                                                                        setDraftTexts((prev) => ({
                                                                            ...prev,
                                                                            [day.draftKey]: event.target.value,
                                                                        }));
                                                                        setSaveSuccess(false);
                                                                        setSaveNotice('Ungespeicherte Änderungen');
                                                                    }}
                                                                    rows={4}
                                                                    className="mt-3 min-h-[112px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[#F29420] focus:ring-2 focus:ring-[#F29420]/20"
                                                                />

                                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="text-xs text-slate-500">Standard: {day.defaultText}</div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => resetSingleDay(day.draftKey)}
                                                                        disabled={!day.isChanged}
                                                                        className={[
                                                                            'inline-flex min-h-[36px] items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition duration-200',
                                                                            day.isChanged
                                                                                ? 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'
                                                                                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                                                        ].join(' ')}
                                                                    >
                                                                        Standard
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {null}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </BackgroundLayout>
    );
}