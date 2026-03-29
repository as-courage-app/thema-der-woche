'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import { readCurrentUserPlan } from '@/lib/userPlan';
import edition1 from '../data/edition1.json';

const LS_SETUP = 'as-courage.themeSetup.v1';
const LS_ICAL_DRAFTS = 'as-courage.icalDrafts.v1';

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

    const countWeeks = Math.min(weeksCount, selectedThemes.length);

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//as-courage//Thema der Woche iCal-Editor//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];

    let eventIndex = 0;

    for (let weekIndex = 0; weekIndex < countWeeks; weekIndex++) {
        const theme = selectedThemes[weekIndex];
        const weekMonday = addDays(baseDate, weekIndex * 7);
        const title = displayTitle(theme);
        const quote = theme.quote ?? '';

        for (const weekday of WEEKDAYS) {
            const date = addDays(weekMonday, weekday.index);
            const dtStart = yyyymmdd(date);
            const dtEnd = yyyymmdd(addDays(date, 1));
            const draftKey = makeDraftKey(theme.id, weekIndex, weekday.key);

            const questionText =
                weekday.index <= 4
                    ? draftTexts[draftKey] ?? theme.questions?.[weekday.index] ?? ''
                    : draftTexts[draftKey] ?? 'Schönes Wochenende';

            const summary =
                weekday.index <= 4
                    ? `${title}: ${questionText || 'Tagesimpuls'}`
                    : questionText || 'Schönes Wochenende';

            const description =
                weekday.index <= 4
                    ? `Thema: ${title}\nZitat: ${quote}\nTagesfrage: ${questionText}`
                    : questionText || 'Schönes Wochenende!';

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

export default function ICalEditorPage() {
    const router = useRouter();

    const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [setup, setSetup] = useState<SetupState | null>(null);
    const [draftTexts, setDraftTexts] = useState<DraftTexts>({});
    const [draftsLoaded, setDraftsLoaded] = useState(false);
    const [saveNotice, setSaveNotice] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        async function loadData() {
            const plan = await readCurrentUserPlan();
            const currentSetup = readSetup();
            const storedDrafts = readIcalDrafts();

            if (!alive) return;

            setCurrentUserPlan(plan);
            setSetup(currentSetup);
            setDraftTexts(storedDrafts);
            setIsLoadingPlan(false);
            setDraftsLoaded(true);
        }

        loadData();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!draftsLoaded) return;
        // vorerst kein automatisches Speichern mehr
    }, [draftTexts, draftsLoaded]);

    const isVariantC = true;

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

                return {
                    ...weekday,
                    draftKey,
                    dateText: formatDE(date),
                    defaultText,
                    currentText,
                    isEdited,
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
    }, [setup?.startMonday, selectedThemes, draftTexts]);

    const hasAnyDrafts = Object.keys(draftTexts).length > 0;
    const canExport = Boolean(setup?.startMonday) && selectedThemes.length > 0;

    function resetSingleDraft(draftKey: string) {
        setDraftTexts((prev) => {
            const next = { ...prev };
            delete next[draftKey];
            return next;
        });
        setSaveNotice('Ungespeicherte Änderungen');
    }

    function resetAllDrafts() {
        setDraftTexts({});
        setSaveNotice('Ungespeicherte Änderungen');
    }

    function handleSaveDrafts() {
        writeIcalDrafts(draftTexts);
        setSaveNotice('Änderungen wurden im localStorage dieses Browsers auf diesem Gerät gespeichert.');
    }

    function handleDownloadEditedIcal() {
        const ics = buildIcsFromEditorData(setup, selectedThemes, draftTexts);
        downloadTextFile('thema-der-woche-editor.ics', ics, 'text/calendar;charset=utf-8');
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
                                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#F29420] bg-[#F29420] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-lg"
                                >
                                    Änderungen speichern
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
                                        Dieser Bereich ist nur in Variante C verfügbar.
                                    </div>

                                    <p className="text-sm leading-relaxed text-slate-700">
                                        Hier entsteht die neue bearbeitbare iCal-Oberfläche für Variante C. In Variante A und B bleibt
                                        dieser Bereich gesperrt.
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
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-lg font-semibold text-slate-900">
                                                Bearbeitbare Struktur mit bewusster Speicherung
                                            </div>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                Änderungen werden nicht mehr automatisch übernommen. Erst nach Klick auf
                                                „Änderungen speichern“ bleiben sie lokal auf diesem Gerät erhalten.
                                            </p>

                                            {saveNotice ? (
                                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                                    {saveNotice}
                                                </div>
                                            ) : null}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={resetAllDrafts}
                                            disabled={!hasAnyDrafts}
                                            className={[
                                                'inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition duration-200',
                                                hasAnyDrafts
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
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="text-sm font-semibold text-slate-900">{day.label}</div>
                                                                    <div className="text-xs text-slate-500">{day.dateText}</div>
                                                                </div>

                                                                <textarea
                                                                    value={day.currentText}
                                                                    onChange={(event) => {
                                                                        setDraftTexts((prev) => ({
                                                                            ...prev,
                                                                            [day.draftKey]: event.target.value,
                                                                        }));
                                                                        setSaveNotice('Ungespeicherte Änderungen');
                                                                    }}
                                                                    rows={4}
                                                                    className="mt-3 min-h-[112px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[#F29420] focus:ring-2 focus:ring-[#F29420]/20"
                                                                />

                                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="text-xs text-slate-500">Standard: {day.defaultText}</div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => resetSingleDraft(day.draftKey)}
                                                                        disabled={!day.isEdited}
                                                                        className={[
                                                                            'inline-flex min-h-[36px] items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition duration-200',
                                                                            day.isEdited
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

                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                        Nächster Schritt: die bestehende iCal-Logik aus der Quotes-Seite in eine gemeinsame Helper-Datei
                                        auslagern, damit Editor und Quotes dieselbe Exportbasis nutzen.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </BackgroundLayout>
    );
}