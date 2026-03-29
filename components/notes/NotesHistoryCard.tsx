'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import BackgroundLayout from '@/components/BackgroundLayout';
import RequireAuth from '@/components/RequireAuth';
import edition1 from '@/app/data/edition1.json';
import { useSearchParams } from 'next/navigation';
import { readCurrentUserPlan } from '@/lib/userPlan';

type DayKey = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr';

type ThemeData = {
    themeId: string;
    themeLabel: string;
    quote: string;
    questions: Record<DayKey, string>;
};

type NoteRun = {
    runId: string;
    runNumber: number;
    themeId: string;
    themeLabel: string;
    quote: string;
    questions: Record<DayKey, string>;
    weekStartIso: string;
    weekEndIso: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
    importedLegacy?: boolean;
    deletedAt?: string;
};

type StoredNotesV2 = Record<string, NoteRun[]>;

type ThemeSource = {
    id?: string | number;
    nr?: string | number;
    number?: string | number;
    title?: string;
    name?: string;
    thema?: string;
    label?: string;
    quote?: string;
    zitat?: string;
    Zitat?: string;
    questions?: unknown;
    impulses?: unknown;
    tagesimpulse?: unknown;
    days?: unknown;
    weekdays?: unknown;
};

const DEFAULT_QUESTIONS: Record<DayKey, string> = {
    Mo: 'Frage 1 folgt…',
    Di: 'Frage 2 folgt…',
    Mi: 'Frage 3 folgt…',
    Do: 'Frage 4 folgt…',
    Fr: 'Frage 5 folgt…',
};

const DAY_KEYS: DayKey[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

const LS_NOTES_KEY_V2 = 'as-courage.notes.v2';
const LS_NOTE_KEY_BASE = 'as-courage.notes.v1';
const SELECTED_THEMES_KEY = 'as-courage.selectedThemes.v1';
const SETUP_KEYS = [
    'as-courage.themeSetup.v1',
    'as-courage.themeSetup',
    'themeSetup',
    'setup',
    'as-courage.setup.v1',
];

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
}

function toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseIsoDate(value: string | null | undefined): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateDEshort(date: Date): string {
    return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${pad2(date.getFullYear() % 100)}`;
}

function formatIsoDateDEshort(iso: string): string {
    const date = parseIsoDate(iso);
    return date ? formatDateDEshort(date) : 'ohne Datum';
}

function formatDateRange(weekStartIso: string, weekEndIso: string): string {
    if (!weekStartIso && !weekEndIso) return 'früherer Stand ohne festes Datum';
    if (!weekStartIso) return `bis ${formatIsoDateDEshort(weekEndIso)}`;
    if (!weekEndIso) return `ab ${formatIsoDateDEshort(weekStartIso)}`;
    return `${formatIsoDateDEshort(weekStartIso)} – ${formatIsoDateDEshort(weekEndIso)}`;
}

function safeJsonParse<T>(value: string | null): T | null {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function readFirstExistingSetup(): Record<string, unknown> | null {
    if (typeof window === 'undefined') return null;

    for (const key of SETUP_KEYS) {
        const parsed = safeJsonParse<Record<string, unknown>>(window.localStorage.getItem(key));
        if (parsed) return parsed;
    }

    return null;
}

function asString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
}

function extractThemeIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
        .map((entry) => {
            if (typeof entry === 'string' || typeof entry === 'number') {
                return String(entry);
            }

            if (entry && typeof entry === 'object') {
                const candidate = entry as { id?: unknown; themeId?: unknown };
                return asString(candidate.id) ?? asString(candidate.themeId);
            }

            return null;
        })
        .filter((entry): entry is string => Boolean(entry));
}

function pickFirstNonEmptyThemeIds(...candidates: unknown[]): string[] {
    for (const candidate of candidates) {
        const ids = extractThemeIds(candidate);
        if (ids.length > 0) return ids;
    }
    return [];
}

function getEditionThemes(): ThemeSource[] {
    const raw = edition1 as unknown;

    if (Array.isArray(raw)) {
        return raw as ThemeSource[];
    }

    if (raw && typeof raw === 'object') {
        const obj = raw as { themes?: unknown; data?: unknown };

        if (Array.isArray(obj.themes)) return obj.themes as ThemeSource[];
        if (Array.isArray(obj.data)) return obj.data as ThemeSource[];
    }

    return [];
}

function toQuestionRecord(
    value: unknown,
    fallback: Record<DayKey, string> = DEFAULT_QUESTIONS,
): Record<DayKey, string> {
    const next: Record<DayKey, string> = { ...fallback };

    if (Array.isArray(value)) {
        next.Mo = asString(value[0]) ?? next.Mo;
        next.Di = asString(value[1]) ?? next.Di;
        next.Mi = asString(value[2]) ?? next.Mi;
        next.Do = asString(value[3]) ?? next.Do;
        next.Fr = asString(value[4]) ?? next.Fr;
        return next;
    }

    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        next.Mo = asString(obj.Mo) ?? asString(obj.mo) ?? asString(obj.monday) ?? next.Mo;
        next.Di = asString(obj.Di) ?? asString(obj.di) ?? asString(obj.tuesday) ?? next.Di;
        next.Mi = asString(obj.Mi) ?? asString(obj.mi) ?? asString(obj.wednesday) ?? next.Mi;
        next.Do = asString(obj.Do) ?? asString(obj.do) ?? asString(obj.thursday) ?? next.Do;
        next.Fr = asString(obj.Fr) ?? asString(obj.fr) ?? asString(obj.friday) ?? next.Fr;
    }

    return next;
}

function getThemeData(themeId: string | null): ThemeData {
    if (!themeId) {
        return {
            themeId: '',
            themeLabel: 'Thema',
            quote: 'Zitat folgt…',
            questions: { ...DEFAULT_QUESTIONS },
        };
    }

    const themes = getEditionThemes();

    const found =
        themes.find((t) => String(t.id) === String(themeId)) ||
        themes.find((t) => String(t.nr) === String(themeId)) ||
        themes.find((t) => String(t.number) === String(themeId));

    if (!found) {
        return {
            themeId,
            themeLabel: 'Thema',
            quote: 'Zitat folgt…',
            questions: { ...DEFAULT_QUESTIONS },
        };
    }

    const themeLabel =
        asString(found.title) ??
        asString(found.name) ??
        asString(found.thema) ??
        asString(found.label) ??
        asString(found.id) ??
        'Thema';

    const quote =
        asString(found.quote) ??
        asString(found.zitat) ??
        asString(found.Zitat) ??
        'Zitat folgt…';

    const questionSource =
        found.questions ??
        found.impulses ??
        found.tagesimpulse ??
        found.days ??
        found.weekdays ??
        null;

    return {
        themeId,
        themeLabel,
        quote,
        questions: toQuestionRecord(questionSource, DEFAULT_QUESTIONS),
    };
}

function compareRunsNewestFirst(a: NoteRun, b: NoteRun): number {
    const aPrimary = a.weekStartIso || '';
    const bPrimary = b.weekStartIso || '';

    if (aPrimary < bPrimary) return 1;
    if (aPrimary > bPrimary) return -1;

    if (a.updatedAt < b.updatedAt) return 1;
    if (a.updatedAt > b.updatedAt) return -1;

    return 0;
}

function compareRunsOldestFirst(a: NoteRun, b: NoteRun): number {
    const aPrimary = a.weekStartIso || '';
    const bPrimary = b.weekStartIso || '';

    if (aPrimary < bPrimary) return -1;
    if (aPrimary > bPrimary) return 1;

    if (a.createdAt < b.createdAt) return -1;
    if (a.createdAt > b.createdAt) return 1;

    return 0;
}

function withStableRunNumbers(runs: NoteRun[]): NoteRun[] {
    const ordered = [...runs].sort(compareRunsOldestFirst);

    let nextRunNumber = Math.max(
        0,
        ...ordered.map((run) =>
            typeof run.runNumber === 'number' && Number.isFinite(run.runNumber) && run.runNumber > 0
                ? run.runNumber
                : 0,
        ),
    );

    const numbered = ordered.map((run) => {
        if (
            typeof run.runNumber === 'number' &&
            Number.isFinite(run.runNumber) &&
            run.runNumber > 0
        ) {
            return run;
        }

        nextRunNumber += 1;

        return {
            ...run,
            runNumber: nextRunNumber,
        };
    });

    return numbered.sort(compareRunsNewestFirst);
}

function normalizeRun(themeId: string, run: Partial<NoteRun>): NoteRun {
    const themeData = getThemeData(themeId);

    return {
        runId: asString(run.runId) ?? `${themeId}-${Date.now()}`,
        runNumber:
            typeof run.runNumber === 'number' && Number.isFinite(run.runNumber)
                ? run.runNumber
                : 0,
        themeId,
        themeLabel: asString(run.themeLabel) ?? themeData.themeLabel,
        quote: asString(run.quote) ?? themeData.quote,
        questions: toQuestionRecord(run.questions, themeData.questions),
        weekStartIso: asString(run.weekStartIso) ?? '',
        weekEndIso: asString(run.weekEndIso) ?? '',
        notes: typeof run.notes === 'string' ? run.notes : '',
        createdAt: asString(run.createdAt) ?? new Date().toISOString(),
        updatedAt: asString(run.updatedAt) ?? asString(run.createdAt) ?? new Date().toISOString(),
        importedLegacy: Boolean(run.importedLegacy),
        deletedAt: asString(run.deletedAt) ?? undefined,
    };
}

function loadStoredNotes(): StoredNotesV2 {
    if (typeof window === 'undefined') return {};

    const result: StoredNotesV2 = {};
    const parsed = safeJsonParse<Record<string, Partial<NoteRun>[]>>(
        window.localStorage.getItem(LS_NOTES_KEY_V2),
    );

    if (parsed && typeof parsed === 'object') {
        for (const [themeId, runs] of Object.entries(parsed)) {
            if (!Array.isArray(runs)) continue;

            result[themeId] = withStableRunNumbers(
                runs.map((run) => normalizeRun(themeId, run)),
            );
        }
    }

    for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(`${LS_NOTE_KEY_BASE}.`)) continue;

        const themeId = key.slice(`${LS_NOTE_KEY_BASE}.`.length);
        const legacyNote = window.localStorage.getItem(key);

        if (!legacyNote || !legacyNote.trim()) continue;

        const existingRuns = result[themeId] ?? [];
        const alreadyImported = existingRuns.some(
            (run) => run.importedLegacy && run.notes.trim() === legacyNote.trim(),
        );

        if (alreadyImported) continue;

        const themeData = getThemeData(themeId);
        const now = new Date().toISOString();

        const legacyRun: NoteRun = {
            runId: `legacy-${themeId}`,
            runNumber: existingRuns.length + 1,
            themeId,
            themeLabel: themeData.themeLabel,
            quote: themeData.quote,
            questions: themeData.questions,
            weekStartIso: '',
            weekEndIso: '',
            notes: legacyNote,
            createdAt: now,
            updatedAt: now,
            importedLegacy: true,
        };

        result[themeId] = withStableRunNumbers([...existingRuns, legacyRun]);
    }

    return result;
}

function persistStoredNotes(notesByTheme: StoredNotesV2): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LS_NOTES_KEY_V2, JSON.stringify(notesByTheme));
}

function getMostRecentThemeId(notesByTheme: StoredNotesV2): string | null {
    let newestThemeId: string | null = null;
    let newestRun: NoteRun | null = null;

    for (const [themeId, runs] of Object.entries(notesByTheme)) {
        if (!runs.length) continue;
        const topRun = [...runs].sort(compareRunsNewestFirst)[0];

        if (!newestRun || compareRunsNewestFirst(topRun, newestRun) < 0) {
            newestRun = topRun;
            newestThemeId = themeId;
        }
    }

    return newestThemeId;
}

function readActiveThemeContext(themeIdFromUrl: string | null): {
    activeThemeId: string | null;
    weekStart: Date | null;
} {
    if (typeof window === 'undefined') {
        return {
            activeThemeId: themeIdFromUrl ?? null,
            weekStart: null,
        };
    }

    try {
        const setup = readFirstExistingSetup();

        const selectedFromDedicatedKey = safeJsonParse<unknown>(
            window.localStorage.getItem(SELECTED_THEMES_KEY),
        );

        const selectedThemeIds = pickFirstNonEmptyThemeIds(
            setup?.themeIds,
            setup?.selectedThemes,
            setup?.selectedThemeIds,
            selectedFromDedicatedKey,
        );

        const activeRaw =
            themeIdFromUrl ??
            (selectedThemeIds.length > 0 ? selectedThemeIds[0] : null) ??
            asString(setup?.selectedThemeId) ??
            asString(setup?.themeId) ??
            asString((setup?.theme as { id?: unknown } | undefined)?.id) ??
            asString((setup?.selectedTheme as { id?: unknown } | undefined)?.id);

        const activeThemeId = activeRaw ? String(activeRaw) : null;

        let weekStart: Date | null = null;
        const startMondayStr = asString(setup?.startMonday);

        if (startMondayStr && selectedThemeIds.length > 0 && activeThemeId) {
            const idx = selectedThemeIds.findIndex((id) => String(id) === String(activeThemeId));
            if (idx >= 0) {
                const start = new Date(`${startMondayStr}T00:00:00`);
                if (!Number.isNaN(start.getTime())) {
                    weekStart = addDays(start, idx * 7);
                }
            }
        }

        return { activeThemeId, weekStart };
    } catch {
        return {
            activeThemeId: themeIdFromUrl ?? null,
            weekStart: null,
        };
    }
}

function sanitizeFileName(value: string): string {
    const cleaned = value
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w\-äöüÄÖÜß]/g, '');

    return cleaned || 'Thema';
}

function buildThemeImageCandidates(themeId: string | null): string[] {
    if (!themeId) return [];

    return [
        `/images/themes/${themeId}.jpg`,
        `/images/themes/${themeId}.png`,
        `/images/themes/${themeId}.webp`,
        `/images/themes/${themeId}.jpeg`,
    ];
}

type NotesHistoryCardContentProps = {
    embedded?: boolean;
    themeId?: string | null;
    onClose?: () => void;
};

function NotesHistoryCardShell({
    embedded = false,
    children,
}: {
    embedded?: boolean;
    children: ReactNode;
}) {
    if (embedded) {
        return <>{children}</>;
    }

    return <BackgroundLayout>{children}</BackgroundLayout>;
}

export function NotesHistoryCardContent({
    embedded = false,
    themeId = null,
    onClose,
}: NotesHistoryCardContentProps) {

    const searchParams = useSearchParams();
    const themeIdFromUrl = themeId ?? searchParams.get('themeId');

    const [planCode, setPlanCode] = useState<string | null>(null);
    const [planReady, setPlanReady] = useState(false);

    const [notesByTheme, setNotesByTheme] = useState<StoredNotesV2>({});
    const [storageReady, setStorageReady] = useState(false);

    const { activeThemeId, weekStart } = useMemo(
        () => readActiveThemeContext(themeIdFromUrl),
        [themeIdFromUrl],
    );

    const currentThemeData = useMemo(
        () => getThemeData(activeThemeId),
        [activeThemeId],
    );

    const currentWeekStartIso = useMemo(
        () => (weekStart ? toIsoDate(weekStart) : ''),
        [weekStart],
    );

    const currentWeekEndIso = useMemo(
        () => (weekStart ? toIsoDate(addDays(weekStart, 4)) : ''),
        [weekStart],
    );

    useEffect(() => {
        let cancelled = false;

        async function loadPlan(): Promise<void> {
            try {
                const plan = await readCurrentUserPlan();
                if (!cancelled) {
                    setPlanCode(plan ?? null);
                }
            } catch {
                if (!cancelled) {
                    setPlanCode(null);
                }
            } finally {
                if (!cancelled) {
                    setPlanReady(true);
                }
            }
        }

        loadPlan();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const stored = loadStoredNotes();
        setNotesByTheme(stored);
        setStorageReady(true);
    }, []);

    useEffect(() => {
        if (!storageReady) return;
        persistStoredNotes(notesByTheme);
    }, [notesByTheme, storageReady]);

    useEffect(() => {
        if (!storageReady || !activeThemeId || !currentWeekStartIso || !currentWeekEndIso) return;

        setNotesByTheme((current) => {
            const themeRuns = current[activeThemeId] ?? [];
            const alreadyExists = themeRuns.some(
                (run) =>
                    run.weekStartIso === currentWeekStartIso &&
                    run.weekEndIso === currentWeekEndIso,
            );

            if (alreadyExists) return current;

            const now = new Date().toISOString();

            const newRun: NoteRun = {
                runId: `${activeThemeId}-${currentWeekStartIso}`,
                runNumber:
                    Math.max(
                        0,
                        ...themeRuns.map((run) =>
                            typeof run.runNumber === 'number' && Number.isFinite(run.runNumber)
                                ? run.runNumber
                                : 0,
                        ),
                    ) + 1,
                themeId: activeThemeId,
                themeLabel: currentThemeData.themeLabel,
                quote: currentThemeData.quote,
                questions: currentThemeData.questions,
                weekStartIso: currentWeekStartIso,
                weekEndIso: currentWeekEndIso,
                notes: '',
                createdAt: now,
                updatedAt: now,
            };

            return {
                ...current,
                [activeThemeId]: [newRun, ...themeRuns].sort(compareRunsNewestFirst),
            };
        });
    }, [
        activeThemeId,
        currentThemeData,
        currentWeekEndIso,
        currentWeekStartIso,
        storageReady,
    ]);

    const displayThemeId = useMemo(
        () => activeThemeId ?? getMostRecentThemeId(notesByTheme),
        [activeThemeId, notesByTheme],
    );

    const displayRuns = useMemo(() => {
        if (!displayThemeId) return [];
        return [...(notesByTheme[displayThemeId] ?? [])].sort(compareRunsNewestFirst);
    }, [displayThemeId, notesByTheme]);

    const displayThemeData = useMemo(
        () => getThemeData(displayThemeId),
        [displayThemeId],
    );

    const displayThemeLabel =
        displayRuns[0]?.themeLabel ||
        displayThemeData.themeLabel ||
        'Notizen';

    const runNumbers = useMemo(() => {
        const map: Record<string, number> = {};

        displayRuns.forEach((run) => {
            map[run.runId] =
                typeof run.runNumber === 'number' && Number.isFinite(run.runNumber) && run.runNumber > 0
                    ? run.runNumber
                    : 1;
        });

        return map;
    }, [displayRuns]);

    const currentRun = useMemo(
        () =>
            displayRuns.find(
                (run) =>
                    activeThemeId === run.themeId &&
                    currentWeekStartIso === run.weekStartIso &&
                    currentWeekEndIso === run.weekEndIso,
            ) ?? null,
        [activeThemeId, currentWeekEndIso, currentWeekStartIso, displayRuns],
    );

    const themeImageCandidates = useMemo(
        () => buildThemeImageCandidates(displayThemeId),
        [displayThemeId],
    );

    const [themeImageIndex, setThemeImageIndex] = useState(0);

    useEffect(() => {
        setThemeImageIndex(0);
    }, [displayThemeId]);

    const themeImageSrc =
        themeImageIndex < themeImageCandidates.length
            ? themeImageCandidates[themeImageIndex]
            : null;

    function updateRunNotes(runId: string, nextValue: string): void {
        if (!displayThemeId) return;

        setNotesByTheme((current) => {
            const runs = current[displayThemeId] ?? [];
            const nextRuns = runs.map((run) =>
                run.runId === runId
                    ? {
                        ...run,
                        notes: nextValue,
                        updatedAt: new Date().toISOString(),
                    }
                    : run,
            );

            return {
                ...current,
                [displayThemeId]: nextRuns.sort(compareRunsNewestFirst),
            };
        });
    }

    function deleteRun(runId: string): void {
        if (!displayThemeId) return;

        const confirmed = window.confirm(
            'Dieser Durchlauf wird als gelöscht markiert und bleibt zur Nachvollziehbarkeit in der Historie sichtbar.',
        );

        if (!confirmed) return;

        setNotesByTheme((current) => {
            const runs = current[displayThemeId] ?? [];
            const now = new Date().toISOString();

            const nextRuns = runs.map((run) =>
                run.runId === runId
                    ? {
                        ...run,
                        notes: '',
                        updatedAt: now,
                        deletedAt: now,
                    }
                    : run,
            );

            return {
                ...current,
                [displayThemeId]: nextRuns.sort(compareRunsNewestFirst),
            };
        });
    }

    function handleSaveDownload(): void {
        const headerLines = [
            `Thema der Woche – ${displayThemeLabel}`,
            '',
            `Zitat: ${displayThemeData.quote}`,
            '',
            'Tagesimpulse:',
            ...DAY_KEYS.map((dayKey) => `${dayKey}: ${displayThemeData.questions[dayKey]}`),
            '',
            'Notizenverlauf:',
            '',
        ];

        const runLines = displayRuns.flatMap((run) => [
            `${runNumbers[run.runId] ?? 1}. Durchlauf | ${formatDateRange(run.weekStartIso, run.weekEndIso)}`,
            run.notes?.trim() ? run.notes : '—',
            '',
        ]);

        const footerLines = [
            '---',
            'Projekt von Andreas Sedlag, Kompetenztrainer und systemischer Coach',
        ];

        const text = [...headerLines, ...runLines, ...footerLines].join('\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `Thema-der-Woche_Notizen_${sanitizeFileName(displayThemeLabel)}.txt`;
        link.click();

        URL.revokeObjectURL(url);
    }

    function handlePrint(): void {
        window.print();
    }

    if (!planReady || !storageReady) {
        return (
            <NotesHistoryCardShell embedded={embedded}>
                <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center px-4 py-6">
                    <div className="rounded-2xl bg-white/90 px-6 py-5 shadow-xl backdrop-blur-md">
                        <p className="text-base font-semibold text-slate-900">Notizen werden geladen …</p>
                    </div>
                </div>
            </NotesHistoryCardShell>
        );
    }

    if (planCode !== 'B' && planCode !== 'C') {
        return (
            <NotesHistoryCardShell embedded={embedded}>
                <div className="mx-auto w-full max-w-4xl px-4 py-6">
                    <div className="overflow-hidden rounded-[28px] border border-amber-200 bg-white/95 shadow-xl backdrop-blur">
                        <div className="border-b border-amber-100 bg-amber-50 px-6 py-5">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                                Notizen
                            </p>
                            <h1 className="mt-2 text-2xl font-bold text-slate-900">
                                Diese Funktion ist erst ab Variante B verfügbar
                            </h1>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-base leading-7 text-slate-700">
                                In Variante B oder C kannst du Notizen speichern. Mehrere Durchläufe eines Themas
                                bleiben dabei sauber getrennt erhalten.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    href="/account"
                                    className="inline-flex items-center justify-center rounded-2xl bg-[#F29420] px-5 py-3 text-sm font-semibold text-black shadow-md transition hover:-translate-y-0.5 hover:bg-[#E4891E] hover:shadow-lg"
                                >
                                    zur Konto-Seite / Upgrade
                                </Link>

                                {onClose ? (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                                    >
                                        Ausblenden
                                    </button>
                                ) : (
                                    <Link
                                        href={themeIdFromUrl ? `/quotes?themeId=${encodeURIComponent(themeIdFromUrl)}` : '/quotes'}
                                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                                    >
                                        Ausblenden
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </NotesHistoryCardShell>
        );
    }

    return (
        <NotesHistoryCardShell embedded={embedded}>
            <div className="mx-auto w-full max-w-5xl px-4 py-6 print:px-0 print:py-0">
                <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/95 shadow-xl backdrop-blur print:rounded-none print:border-0 print:bg-white print:shadow-none">
                    <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-orange-50 px-5 py-5 sm:px-7 print:bg-white">
                        <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Notizenverlauf
                                </p>
                                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                                    {displayThemeLabel}
                                </h1>
                                {currentRun ? (
                                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                                        Das Thema wurde zum {runNumbers[currentRun.runId] ?? 1}. Mal gewählt.
                                    </p>
                                ) : (
                                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                                        Neue Wochen werden ergänzt, alte Inhalte werden nicht überschrieben.
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleSaveDownload}
                                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                                >
                                    Speichern
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                                >
                                    Drucken
                                </button>

                                <Link
                                    href={themeIdFromUrl ? `/quotes?themeId=${encodeURIComponent(themeIdFromUrl)}` : '/quotes'}
                                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                                >
                                    Ausblenden
                                </Link>
                            </div>
                        </div>

                        {!embedded ? (
                            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.95fr] lg:grid-rows-[auto_auto] lg:items-stretch print:grid-cols-1">
                                {themeImageSrc ? (
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-3 sm:p-4 lg:h-[440px]">
                                        <div className="flex h-full items-center justify-center">
                                            <img
                                                src={themeImageSrc}
                                                alt={displayThemeLabel}
                                                className="block max-h-full max-w-full object-contain"
                                                onError={() => {
                                                    setThemeImageIndex((current) => current + 1);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                <div
                                    className={`rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-5 ${themeImageSrc ? 'lg:h-[440px]' : ''
                                        }`}
                                >
                                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-base">
                                        Fragen der Woche
                                    </p>

                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                        {DAY_KEYS.map((dayKey, index) => (
                                            <div
                                                key={dayKey}
                                                className={`grid grid-cols-[56px_1fr] gap-3 px-4 py-3 ${index !== DAY_KEYS.length - 1 ? 'border-b border-slate-200' : ''
                                                    }`}
                                            >
                                                <p className="text-sm font-semibold text-slate-500">{dayKey}</p>
                                                <p className="text-sm leading-6 text-slate-800">
                                                    {displayThemeData.questions[dayKey]}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 lg:col-span-2">
                                    <p className="text-base leading-8 text-slate-800 sm:text-lg">
                                        <span className="font-semibold text-slate-500">Zitat - </span>
                                        {displayThemeData.quote.replace(/\s*\n+\s*/g, ' ').trim()}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="px-5 py-6 sm:px-7 sm:py-7">
                        {displayRuns.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                                <p className="text-lg font-semibold text-slate-900">Noch keine Notizen vorhanden</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Sobald ein Thema gestartet wurde, erscheint hier automatisch ein eigener Block
                                    für den jeweiligen Durchlauf.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {displayRuns.map((run) => {
                                    const isCurrentRun =
                                        activeThemeId === run.themeId &&
                                        currentWeekStartIso === run.weekStartIso &&
                                        currentWeekEndIso === run.weekEndIso;

                                    return (
                                        <section
                                            key={run.runId}
                                            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                                        >
                                            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                                                                {runNumbers[run.runId] ?? 1}. Durchlauf
                                                            </h2>

                                                            {isCurrentRun ? (
                                                                <span className="rounded-full border border-[#F29420] bg-white px-3 py-1 text-xs font-semibold text-black">
                                                                    aktueller Durchlauf
                                                                </span>
                                                            ) : null}

                                                            {run.importedLegacy ? (
                                                                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                                                    aus alter Notiz übernommen
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <p className="mt-2 text-sm font-medium text-slate-600">
                                                            {formatDateRange(run.weekStartIso, run.weekEndIso)}
                                                        </p>
                                                    </div>

                                                    {run.deletedAt ? (
                                                        <div className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm">
                                                            gelöscht
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteRun(run.runId)}
                                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-md"
                                                        >
                                                            Löschen
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="px-5 py-5 sm:px-6">
                                                {run.deletedAt ? (
                                                    <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-800">
                                                        Notizenblock vom {runNumbers[run.runId] ?? 1}. Durchlauf vom {formatDateRange(run.weekStartIso, run.weekEndIso)} wurde am{' '}
                                                        {run.deletedAt ? formatDateDEshort(new Date(run.deletedAt)) : 'unbekanntem Datum'} gelöscht.
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        value={run.notes}
                                                        onChange={(event) => updateRunNotes(run.runId, event.target.value)}
                                                        placeholder="Hier ist Platz für Beobachtungen, Aussagen von Menschen, Gedanken, Beispiele oder persönliche Notizen zu genau diesem Durchlauf …"
                                                        className="min-h-[220px] w-full resize-y rounded-[22px] border border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#F29420] focus:bg-white"
                                                    />
                                                )}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </NotesHistoryCardShell>
    );
}

export function EmbeddedNotesHistoryCard({
    themeId = null,
    onClose,
}: {
    themeId?: string | null;
    onClose?: () => void;
}) {
    return (
        <Suspense fallback={null}>
            <NotesHistoryCardContent embedded themeId={themeId} onClose={onClose} />
        </Suspense>
    );
}

export default function NotesHistoryCard() {
    return (
        <Suspense fallback={null}>
            <RequireAuth>
                <NotesHistoryCardContent />
            </RequireAuth>
        </Suspense>
    );
}