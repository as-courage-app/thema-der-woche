'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

const LS_ADDITIONAL_CALENDARS = 'as-courage.additionalCalendars.v1';

type SourceType = 'url' | 'file' | 'help';

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

type PreviewState = {
    sourceType: 'url' | 'file';
    sourceLabel: string;
    sourceUrl?: string;
    fileName?: string;
    rawIcs: string;
    eventCount: number;
    previewEvents: AdditionalCalendarPreviewEvent[];
};

const PRIMARY_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-[#990000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg';

const EMPHASIS_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-[#990000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg';

const SECONDARY_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md';

const OUTLINE_RED_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-white px-4 py-2 text-sm font-semibold text-[#7A0000] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#FFF4F4] hover:border-[#7A0000] hover:shadow-md';

const DISABLED_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 shadow-sm';

function readStoredCalendars(): StoredAdditionalCalendar[] {
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

function writeStoredCalendars(calendars: StoredAdditionalCalendar[]) {
    try {
        if (calendars.length === 0) {
            localStorage.removeItem(LS_ADDITIONAL_CALENDARS);
            return;
        }

        localStorage.setItem(LS_ADDITIONAL_CALENDARS, JSON.stringify(calendars));
    } catch {
        // lokal still behandeln
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

function generateId(): string {
    return `additional-calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function unfoldIcsText(text: string): string {
    return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function readIcsField(block: string, fieldName: string): string {
    const regex = new RegExp(`^${fieldName}(?:;[^:\\r\\n]+)*:(.*)$`, 'mi');
    const match = block.match(regex);
    return match?.[1]?.trim() ?? '';
}

function unescapeIcsText(value: string): string {
    return value
        .replace(/\\n/g, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

function formatIcsDateValue(rawValue: string): string {
    if (!rawValue) return '—';

    const value = rawValue.trim();

    if (/^\d{8}$/.test(value)) {
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);
        const day = value.slice(6, 8);
        return `${day}.${month}.${year}`;
    }

    const utcMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    if (utcMatch) {
        const [, year, month, day, hour, minute, second] = utcMatch;
        const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
        return date.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    const localMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
    if (localMatch) {
        const [, year, month, day, hour, minute] = localMatch;
        return `${day}.${month}.${year}, ${hour}:${minute}`;
    }

    return value;
}

function parseIcsPreview(icsText: string): {
    eventCount: number;
    previewEvents: AdditionalCalendarPreviewEvent[];
} {
    const unfolded = unfoldIcsText(icsText);

    if (!unfolded.includes('BEGIN:VCALENDAR')) {
        throw new Error('Die Quelle enthält keinen gültigen iCal-Kalender.');
    }

    const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

    if (blocks.length === 0) {
        throw new Error('Die Quelle enthält keine Kalendereinträge.');
    }

    const previewEvents = blocks.slice(0, 8).map((block, index) => {
        const uid = readIcsField(block, 'UID') || `preview-${index}`;
        const summary = unescapeIcsText(readIcsField(block, 'SUMMARY') || 'Ohne Titel');
        const startText = formatIcsDateValue(readIcsField(block, 'DTSTART'));
        const endText = formatIcsDateValue(readIcsField(block, 'DTEND'));
        const description = unescapeIcsText(readIcsField(block, 'DESCRIPTION') || '');

        return {
            uid,
            summary,
            startText,
            endText,
            description,
        };
    });

    return {
        eventCount: blocks.length,
        previewEvents,
    };
}

export default function AdditionalCalendarImportAssistant() {
    const [sourceType, setSourceType] = useState<SourceType | null>(null);
    const [calendarLabel, setCalendarLabel] = useState('');
    const [category, setCategory] = useState<AdditionalCalendarCategory>('custom');
    const [sourceUrl, setSourceUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [storedCalendars, setStoredCalendars] = useState<StoredAdditionalCalendar[]>([]);
    const [expandedCalendarId, setExpandedCalendarId] = useState<string | null>(null);

    const [isBusy, setIsBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const sourceSelectionSectionRef = useRef<HTMLDivElement | null>(null);
    const urlSectionRef = useRef<HTMLDivElement | null>(null);
    const fileSectionRef = useRef<HTMLDivElement | null>(null);
    const helpSectionRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setStoredCalendars(readStoredCalendars());
    }, []);

    const activeCalendarCount = useMemo(
        () => storedCalendars.filter((calendar) => calendar.isEnabled).length,
        [storedCalendars],
    );

    function resetMessages() {
        setErrorMessage(null);
        setSuccessMessage(null);
    }

    function resetSourceInputs() {
        setPreview(null);
        setSourceUrl('');
        setSelectedFile(null);
    }

    function scrollToSelectedSource(targetType: SourceType) {
        window.setTimeout(() => {
            const targetRef =
                targetType === 'url'
                    ? urlSectionRef
                    : targetType === 'file'
                        ? fileSectionRef
                        : helpSectionRef;

            targetRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    }

    function handleCloseSourcePreparation() {
        setSourceType(null);
        setPreview(null);
        resetMessages();

        window.setTimeout(() => {
            sourceSelectionSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    }

    async function handleCheckUrlSource() {
        resetMessages();
        setPreview(null);

        const trimmedUrl = sourceUrl.trim();
        const trimmedLabel = calendarLabel.trim();

        if (!trimmedLabel) {
            setErrorMessage('Bitte vergeben Sie zuerst einen Namen für den Zusatzkalender.');
            return;
        }

        if (!trimmedUrl) {
            setErrorMessage('Bitte fügen Sie einen ICS-Link ein.');
            return;
        }

        setIsBusy(true);

        try {
            const response = await fetch(trimmedUrl);

            if (!response.ok) {
                throw new Error(`Die Quelle antwortet mit Status ${response.status}.`);
            }

            const icsText = await response.text();

            if (!icsText.trim()) {
                throw new Error('Die Quelle ist leer.');
            }

            if (icsText.length > 500000) {
                throw new Error('Die Datei ist für diesen ersten Teststand zu groß.');
            }

            const parsed = parseIcsPreview(icsText);

            setPreview({
                sourceType: 'url',
                sourceLabel: trimmedUrl,
                sourceUrl: trimmedUrl,
                rawIcs: icsText,
                eventCount: parsed.eventCount,
                previewEvents: parsed.previewEvents,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Die Quelle konnte nicht gelesen werden. Manche Anbieter blockieren direkte Browser-Zugriffe. Laden Sie die ICS-Datei in diesem Fall bitte herunter und nutzen Sie den Datei-Upload.';
            setErrorMessage(message);
        } finally {
            setIsBusy(false);
        }
    }

    async function handleCheckFileSource() {
        resetMessages();
        setPreview(null);

        const trimmedLabel = calendarLabel.trim();

        if (!trimmedLabel) {
            setErrorMessage('Bitte vergeben Sie zuerst einen Namen für den Zusatzkalender.');
            return;
        }

        if (!selectedFile) {
            setErrorMessage('Bitte wählen Sie zuerst eine ICS-Datei aus.');
            return;
        }

        setIsBusy(true);

        try {
            const icsText = await selectedFile.text();

            if (!icsText.trim()) {
                throw new Error('Die gewählte Datei ist leer.');
            }

            if (icsText.length > 500000) {
                throw new Error('Die Datei ist für diesen ersten Teststand zu groß.');
            }

            const parsed = parseIcsPreview(icsText);

            setPreview({
                sourceType: 'file',
                sourceLabel: selectedFile.name,
                fileName: selectedFile.name,
                rawIcs: icsText,
                eventCount: parsed.eventCount,
                previewEvents: parsed.previewEvents,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Die Datei konnte nicht gelesen werden.';
            setErrorMessage(message);
        } finally {
            setIsBusy(false);
        }
    }

    function handleTakeOverPreview() {
        resetMessages();

        const trimmedLabel = calendarLabel.trim();

        if (!preview || !trimmedLabel) {
            setErrorMessage('Bitte prüfen Sie zuerst eine Quelle und vergeben Sie einen Namen.');
            return;
        }

        const nextEntry: StoredAdditionalCalendar = {
            id: generateId(),
            label: trimmedLabel,
            category,
            sourceType: preview.sourceType,
            sourceLabel: preview.sourceLabel,
            sourceUrl: preview.sourceUrl,
            fileName: preview.fileName,
            importedAt: new Date().toISOString(),
            isEnabled: true,
            rawIcs: preview.rawIcs,
            eventCount: preview.eventCount,
            previewEvents: preview.previewEvents,
        };

        const nextCalendars = [nextEntry, ...storedCalendars];
        setStoredCalendars(nextCalendars);
        writeStoredCalendars(nextCalendars);

        setSuccessMessage(
            'Der Zusatzkalender wurde lokal gespeichert. Er ist damit vorbereitet, wird aber noch nicht automatisch in den Teamkalender eingebaut.',
        );

        setCalendarLabel('');
        setCategory('custom');
        resetSourceInputs();
    }

    function handleToggleCalendar(calendarId: string) {
        const nextCalendars = storedCalendars.map((calendar) =>
            calendar.id === calendarId ? { ...calendar, isEnabled: !calendar.isEnabled } : calendar,
        );

        setStoredCalendars(nextCalendars);
        writeStoredCalendars(nextCalendars);
        setSuccessMessage('Der Status des Zusatzkalenders wurde aktualisiert.');
        setErrorMessage(null);
    }

    function handleDeleteCalendar(calendarId: string) {
        const nextCalendars = storedCalendars.filter((calendar) => calendar.id !== calendarId);
        setStoredCalendars(nextCalendars);
        writeStoredCalendars(nextCalendars);

        if (expandedCalendarId === calendarId) {
            setExpandedCalendarId(null);
        }

        setSuccessMessage('Der Zusatzkalender wurde entfernt.');
        setErrorMessage(null);
    }

    function renderSourceCard(key: SourceType, title: string, description: string) {
        const isActive = sourceType === key;

        return (
            <button
                type="button"
                onClick={() => {
                    setSourceType(key);
                    resetMessages();
                    setPreview(null);
                    scrollToSelectedSource(key);
                }}
                className={[
                    'w-full rounded-2xl border p-4 text-left shadow-sm transition duration-200',
                    isActive
                        ? 'cursor-pointer border-[#990000] bg-[#FFF4F4] shadow-md'
                        : 'cursor-pointer border-slate-200 bg-white hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#C88F8F] hover:bg-[#FFF8F8] hover:shadow-md',
                ].join(' ')}
            >
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <div className="mt-2 text-xs leading-relaxed text-slate-600">{description}</div>
            </button>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-[#990000] bg-[#FFF4F4] p-4">
                <div className="text-sm font-semibold text-slate-900">
                    Zusatzkalender getrennt vorbereiten
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">
                    Hier können Nutzer*innen Zusatzkalender erst prüfen, benennen und lokal
                    speichern. Der eigentliche Teamkalender bleibt dabei vorerst unberührt. Erst
                    wenn alles sauber getestet ist, kann die spätere Zusammenführung in einer
                    gemeinsamen Download-Datei folgen.
                </p>

                <div className="mt-3 rounded-xl border border-[#D7B1B1] bg-white px-3 py-2 text-xs font-medium text-slate-800">
                    Gespeicherte Zusatzkalender:{' '}
                    <span className="font-semibold text-[#990000]">{storedCalendars.length}</span>{' '}
                    · aktiv für spätere Nutzung:{' '}
                    <span className="font-semibold text-[#990000]">{activeCalendarCount}</span>
                </div>
            </div>

            <div
                ref={sourceSelectionSectionRef}
                className="rounded-2xl border-2 border-[#990000] bg-white p-5"
            >
                <div className="text-lg font-semibold text-slate-900">1. Quelle auswählen</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    Wählen Sie zuerst, wie der Zusatzkalender eingebunden werden soll.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {renderSourceCard(
                        'url',
                        'ICS-Link einfügen',
                        'Für Nutzer*innen, die bereits eine direkte Kalender-URL haben.',
                    )}
                    {renderSourceCard(
                        'file',
                        'ICS-Datei hochladen',
                        'Für Nutzer*innen, die eine .ics-Datei bereits lokal heruntergeladen haben.',
                    )}
                    {renderSourceCard(
                        'help',
                        'Hilfe zum Finden',
                        'Für Nutzer*innen, die noch nicht wissen, wo sie einen passenden Zusatzkalender finden.',
                    )}
                </div>
            </div>

            <div className="rounded-2xl border-2 border-[#990000] bg-white p-5">
                <div className="text-lg font-semibold text-slate-900">2. Quelle vorbereiten</div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-900">
                                Name des Zusatzkalenders
                            </label>
                            <input
                                type="text"
                                value={calendarLabel}
                                onChange={(event) => setCalendarLabel(event.target.value)}
                                placeholder="z. B. Schulferien Niedersachsen"
                                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-900">
                                Zuordnung
                            </label>
                            <select
                                value={category}
                                onChange={(event) =>
                                    setCategory(event.target.value as AdditionalCalendarCategory)
                                }
                                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                            >
                                <option value="schoolHolidays">Schulferien</option>
                                <option value="nationalHolidays">nationale Feiertage</option>
                                <option value="internationalHolidays">internationale Feiertage</option>
                                <option value="businessCalendar">Betriebskalender</option>
                                <option value="custom">eigener Zusatzkalender</option>
                            </select>
                        </div>

                        {sourceType === 'url' ? (
                            <div
                                ref={urlSectionRef}
                                className="space-y-3 rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="text-sm font-semibold text-slate-900">
                                        ICS-Link einfügen
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCloseSourcePreparation}
                                        className={SECONDARY_BUTTON_CLASS}
                                    >
                                        schließen
                                    </button>
                                </div>

                                <input
                                    type="url"
                                    value={sourceUrl}
                                    onChange={(event) => setSourceUrl(event.target.value)}
                                    placeholder="https://..."
                                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                                />

                                <div className="text-xs leading-relaxed text-slate-600">
                                    Manche Anbieter blockieren direkte Browser-Zugriffe. Wenn die
                                    Prüfung per Link nicht klappt, laden Sie die Datei bitte
                                    herunter und nutzen Sie den Datei-Upload.
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCheckUrlSource}
                                        disabled={isBusy}
                                        className={isBusy ? DISABLED_BUTTON_CLASS : PRIMARY_BUTTON_CLASS}
                                    >
                                        {isBusy ? 'Quelle wird geprüft …' : 'Quelle prüfen'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetSourceInputs}
                                        className={SECONDARY_BUTTON_CLASS}
                                    >
                                        Eingabe leeren
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {sourceType === 'file' ? (
                            <div
                                ref={fileSectionRef}
                                className="space-y-3 rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="text-sm font-semibold text-slate-900">
                                        ICS-Datei hochladen
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCloseSourcePreparation}
                                        className={SECONDARY_BUTTON_CLASS}
                                    >
                                        schließen
                                    </button>
                                </div>

                                <input
                                    type="file"
                                    accept=".ics,text/calendar"
                                    onChange={(event) =>
                                        setSelectedFile(event.target.files?.[0] ?? null)
                                    }
                                    className="block w-full max-w-full text-xs text-slate-700 file:mb-2 file:block file:w-full file:cursor-pointer file:rounded-xl file:border file:border-[#990000] file:bg-[#990000] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#7A0000] sm:text-sm sm:file:inline-block sm:file:w-auto"
                                />

                                <div className="text-xs leading-relaxed text-slate-600">
                                    Für den Teststand eignet sich der Datei-Upload besonders gut,
                                    weil die Vorschau direkt im Browser erzeugt werden kann.
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCheckFileSource}
                                        disabled={isBusy}
                                        className={isBusy ? DISABLED_BUTTON_CLASS : PRIMARY_BUTTON_CLASS}
                                    >
                                        {isBusy ? 'Datei wird geprüft …' : 'Datei prüfen'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetSourceInputs}
                                        className={SECONDARY_BUTTON_CLASS}
                                    >
                                        Auswahl leeren
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {sourceType === 'help' ? (
                            <div
                                ref={helpSectionRef}
                                className="space-y-4 rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="text-sm font-semibold text-slate-900">
                                        Hilfe zum Finden
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSourceType('url')}
                                        className={OUTLINE_RED_BUTTON_CLASS}
                                    >
                                        schließen
                                    </button>
                                </div>

                                <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            Worauf Sie achten sollten
                                        </div>
                                        <div className="mt-1">
                                            Suchen Sie möglichst nach offiziellen oder gut
                                            erkennbaren Quellen, einer aktuellen .ics-Datei und
                                            einem klar passenden Geltungsbereich.
                                        </div>
                                    </div>

                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            Woran Sie eine gute Quelle erkennen
                                        </div>
                                        <div className="mt-1">
                                            Der Kalendername ist nachvollziehbar, die Termine wirken
                                            stimmig, und die Vorschau zeigt sinnvolle Einträge.
                                        </div>
                                    </div>

                                    <div>
                                        <div className="font-semibold text-slate-900">
                                            Was Sie besser vermeiden
                                        </div>
                                        <div className="mt-1">
                                            Unklare Sammelseiten, veraltete Dateien oder Quellen ohne
                                            erkennbare Herkunft.
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-[#D7B1B1] bg-white px-3 py-3 text-xs leading-relaxed text-slate-700">
                                        Für den ersten Test ist oft der einfachste Weg: Datei
                                        herunterladen → hier hochladen → Vorschau prüfen →
                                        Zusatzkalender übernehmen.
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-4">
                        {errorMessage ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
                                {errorMessage}
                            </div>
                        ) : null}

                        {successMessage ? (
                            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-relaxed text-green-800">
                                {successMessage}
                            </div>
                        ) : null}

                        <div className="rounded-2xl border border-[#990000] bg-white p-4">
                            <div className="text-sm font-semibold text-slate-900">Prüfvorschau</div>

                            {!preview ? (
                                <div className="mt-3 rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                                    Nach dem Prüfen einer Quelle erscheint hier die Vorschau mit
                                    ersten Einträgen, Anzahl der Termine und der Möglichkeit zur
                                    Übernahme.
                                </div>
                            ) : (
                                <div className="mt-3 space-y-4">
                                    <div className="rounded-xl border border-[#990000] bg-[#FFF4F4] px-3 py-3 text-sm text-slate-800">
                                        <div>
                                            <span className="font-semibold">Quelle:</span>{' '}
                                            {preview.sourceLabel}
                                        </div>
                                        <div className="mt-1">
                                            <span className="font-semibold">Einträge:</span>{' '}
                                            {preview.eventCount}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {preview.previewEvents.map((event) => (
                                            <div
                                                key={event.uid}
                                                className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] p-3"
                                            >
                                                <div className="text-sm font-semibold text-slate-900">
                                                    {event.summary || 'Ohne Titel'}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-600">
                                                    Beginn: {event.startText}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-600">
                                                    Ende: {event.endText}
                                                </div>
                                                {event.description ? (
                                                    <div className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                                                        {event.description}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleTakeOverPreview}
                                            className={EMPHASIS_BUTTON_CLASS}
                                        >
                                            Zusatzkalender übernehmen
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPreview(null)}
                                            className={SECONDARY_BUTTON_CLASS}
                                        >
                                            Vorschau verwerfen
                                        </button>
                                    </div>

                                    <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-3 py-3 text-xs leading-relaxed text-slate-600">
                                        Mit „Zusatzkalender übernehmen“ wird die geprüfte Quelle
                                        lokal gespeichert. Sie wird noch nicht automatisch in den
                                        Teamkalender eingebaut.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border-2 border-[#990000] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-lg font-semibold text-slate-900">
                            3. Gespeicherte Zusatzkalender
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                            Hier sehen Sie alle lokal vorbereiteten Zusatzkalender. Aktiv bedeutet:
                            für die spätere Zusammenführung vorgemerkt. Noch nicht aktiv bedeutet:
                            gespeichert, aber vorerst nicht vorgesehen.
                        </p>
                    </div>
                </div>

                {storedCalendars.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                        Noch keine Zusatzkalender gespeichert.
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {storedCalendars.map((calendar) => {
                            const isExpanded = expandedCalendarId === calendar.id;

                            return (
                                <div
                                    key={calendar.id}
                                    className="rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">
                                                {calendar.label}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-600">
                                                Kategorie: {categoryLabel(calendar.category)}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-600">
                                                Quelle: {calendar.sourceLabel}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-600">
                                                Gespeichert:{' '}
                                                {new Date(calendar.importedAt).toLocaleString('de-DE')}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-600">
                                                Einträge: {calendar.eventCount}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span
                                                className={[
                                                    'inline-flex min-h-[36px] items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold',
                                                    calendar.isEnabled
                                                        ? 'border-[#990000] bg-[#FCEEEE] text-[#7A0000]'
                                                        : 'border-slate-300 bg-white text-slate-600',
                                                ].join(' ')}
                                            >
                                                {calendar.isEnabled
                                                    ? 'aktiv vorbereitet'
                                                    : 'derzeit deaktiviert'}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedCalendarId(
                                                        isExpanded ? null : calendar.id,
                                                    )
                                                }
                                                className={SECONDARY_BUTTON_CLASS}
                                            >
                                                {isExpanded
                                                    ? 'Vorschau ausblenden'
                                                    : 'Vorschau prüfen'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleCalendar(calendar.id)}
                                                className={
                                                    calendar.isEnabled
                                                        ? SECONDARY_BUTTON_CLASS
                                                        : PRIMARY_BUTTON_CLASS
                                                }
                                            >
                                                {calendar.isEnabled ? 'deaktivieren' : 'aktivieren'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCalendar(calendar.id)}
                                                className={OUTLINE_RED_BUTTON_CLASS}
                                            >
                                                entfernen
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded ? (
                                        <div className="mt-4 space-y-3">
                                            {calendar.previewEvents.map((event) => (
                                                <div
                                                    key={event.uid}
                                                    className="rounded-xl border border-[#D7B1B1] bg-white p-3 shadow-sm"
                                                >
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {event.summary || 'Ohne Titel'}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-600">
                                                        Beginn: {event.startText}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-600">
                                                        Ende: {event.endText}
                                                    </div>
                                                    {event.description ? (
                                                        <div className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                                                            {event.description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}