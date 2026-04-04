'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

const LS_ADDITIONAL_CALENDARS = 'as-courage.additionalCalendars.v1';

type SourceType = 'url' | 'file' | 'help';

type AdditionalCalendarCategory =
    | 'schoolHolidays'
    | 'regionalHolidays'
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
    sourceName?: string;
    validity?: string;
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

type AssistantTileKey =
    | 'schoolHolidays'
    | 'regionalHolidays'
    | 'nationalHolidays'
    | 'internationalHolidays'
    | 'tradeFairs'
    | 'otherCalendars';

type AssistantOption = {
    id: string;
    label: string;
    subtitle: string;
    category: AdditionalCalendarCategory;
    sourceType: SourceType;
    sourceName: string;
    validity?: string;
    sourceUrl?: string;
    helperText?: string;
    keywords: string[];
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

const ORANGE_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#F29420] bg-[#F29420] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#E4891E] hover:bg-[#E4891E] hover:shadow-lg';

const ASSISTANT_TILES: Array<{
    key: AssistantTileKey;
    title: string;
    description: string;
}> = [
        {
            key: 'schoolHolidays',
            title: '1. Schulferien',
            description: 'Bundesland wählen und Ferienquelle direkt vorbereiten.',
        },
        {
            key: 'regionalHolidays',
            title: '2. regionale Feiertage',
            description: 'Bundesland wählen und regionale Feiertage vorbereiten.',
        },
        {
            key: 'nationalHolidays',
            title: '3. nationale Feiertage',
            description: 'Deutschland, Österreich oder Schweiz direkt übernehmen.',
        },
        {
            key: 'internationalHolidays',
            title: '4. internationale Feiertage',
            description: 'Kleine Auswahl internationaler Kalender mit Suche.',
        },
        {
            key: 'tradeFairs',
            title: '5. Messekalender',
            description: 'Schlanker MVP mit Standort-/Messesuche im D-A-CH-Raum.',
        },
        {
            key: 'otherCalendars',
            title: '6. sonstige Kalender',
            description: 'Weitere Kalenderarten als Suchvorschläge vorbereiten.',
        },
    ];

const STATE_SOURCES: Array<{
    id: string;
    label: string;
    schoolUrl: string;
    regionalUrl: string;
}> = [
        {
            id: 'baden-wuerttemberg',
            label: 'Baden-Württemberg',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-baden-wuerttemberg.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/baden-wurttemberg',
        },
        {
            id: 'bayern',
            label: 'Bayern',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-bayern.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/bavaria',
        },
        {
            id: 'berlin',
            label: 'Berlin',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-berlin.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/berlin',
        },
        {
            id: 'brandenburg',
            label: 'Brandenburg',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-brandenburg.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/brandenburg',
        },
        {
            id: 'bremen',
            label: 'Bremen',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-bremen.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/bremen',
        },
        {
            id: 'hamburg',
            label: 'Hamburg',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-hamburg.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/hamburg',
        },
        {
            id: 'hessen',
            label: 'Hessen',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-hessen.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/hesse',
        },
        {
            id: 'mecklenburg-vorpommern',
            label: 'Mecklenburg-Vorpommern',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-mecklenburg-vorpommern.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/mecklenburg-vorpommern',
        },
        {
            id: 'niedersachsen',
            label: 'Niedersachsen',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-niedersachsen.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/lower-saxony',
        },
        {
            id: 'nordrhein-westfalen',
            label: 'Nordrhein-Westfalen',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-nordrhein-westfalen.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/north-rhine-westphalia',
        },
        {
            id: 'rheinland-pfalz',
            label: 'Rheinland-Pfalz',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-rheinland-pfalz.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/rhineland-palatinate',
        },
        {
            id: 'saarland',
            label: 'Saarland',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-saarland.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/saarland',
        },
        {
            id: 'sachsen',
            label: 'Sachsen',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-sachsen.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/saxony',
        },
        {
            id: 'sachsen-anhalt',
            label: 'Sachsen-Anhalt',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-sachsen-anhalt.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/saxony-anhalt',
        },
        {
            id: 'schleswig-holstein',
            label: 'Schleswig-Holstein',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-schleswig-holstein.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/schleswig-holstein',
        },
        {
            id: 'thueringen',
            label: 'Thüringen',
            schoolUrl:
                'https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-thueringen.ics',
            regionalUrl: 'https://www.officeholidays.com/ics/germany/thuringia',
        },
    ];

const NATIONAL_HOLIDAY_OPTIONS: AssistantOption[] = [
    {
        id: 'national-de',
        label: 'Deutschland',
        subtitle: 'bundesweite Feiertage',
        category: 'nationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/germany',
        keywords: ['deutschland', 'bundesweit', 'feiertage', 'national'],
    },
    {
        id: 'national-at',
        label: 'Österreich',
        subtitle: 'landesweite Feiertage',
        category: 'nationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/austria',
        keywords: ['österreich', 'austria', 'feiertage', 'national'],
    },
    {
        id: 'national-ch',
        label: 'Schweiz',
        subtitle: 'landesweite Feiertage',
        category: 'nationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/switzerland',
        keywords: ['schweiz', 'switzerland', 'feiertage', 'national'],
    },
];

const INTERNATIONAL_HOLIDAY_OPTIONS: AssistantOption[] = [
    {
        id: 'intl-various',
        label: 'International / Various',
        subtitle: 'übergreifender internationaler Kalender',
        category: 'internationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/various',
        keywords: ['international', 'various', 'aktionstage', 'weltweit'],
    },
    {
        id: 'intl-usa',
        label: 'USA',
        subtitle: 'nationale Feiertage',
        category: 'internationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/usa',
        keywords: ['usa', 'vereinigte staaten', 'amerika', 'feiertage'],
    },
    {
        id: 'intl-canada',
        label: 'Kanada',
        subtitle: 'nationale Feiertage',
        category: 'internationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/canada',
        keywords: ['kanada', 'canada', 'feiertage'],
    },
    {
        id: 'intl-france',
        label: 'Frankreich',
        subtitle: 'nationale Feiertage',
        category: 'internationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/france',
        keywords: ['frankreich', 'france', 'feiertage'],
    },
    {
        id: 'intl-italy',
        label: 'Italien',
        subtitle: 'nationale Feiertage',
        category: 'internationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/italy',
        keywords: ['italien', 'italy', 'feiertage'],
    },
    {
        id: 'intl-spain',
        label: 'Spanien',
        subtitle: 'nationale Feiertage',
        category: 'internationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/spain',
        keywords: ['spanien', 'spain', 'feiertage'],
    },
    {
        id: 'intl-australia',
        label: 'Australien',
        subtitle: 'nationale Feiertage',
        category: 'internationalHolidays',
        sourceType: 'url',
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: 'https://www.officeholidays.com/ics/australia',
        keywords: ['australien', 'australia', 'feiertage'],
    },
];

const TRADE_FAIR_OPTIONS: AssistantOption[] = [
    {
        id: 'tradefair-duesseldorf',
        label: 'Messe Düsseldorf',
        subtitle: 'alle Events in Düsseldorf',
        category: 'businessCalendar',
        sourceType: 'url',
        sourceName: 'Messe Düsseldorf',
        validity: 'laufende Synchronisierung',
        sourceUrl: 'https://www.messe-duesseldorf.de/static/mdhome/cal_md_EN.ics',
        helperText: 'Offizieller Messekalender für den Standort Düsseldorf.',
        keywords: ['messe', 'duesseldorf', 'düsseldorf', 'standort', 'rheinland'],
    },
    {
        id: 'tradefair-international',
        label: 'Messe Düsseldorf International',
        subtitle: 'internationale Events des Messeverbunds',
        category: 'businessCalendar',
        sourceType: 'url',
        sourceName: 'Messe Düsseldorf',
        validity: 'laufende Synchronisierung',
        sourceUrl: 'https://www.messe-duesseldorf.de/static/mdhome/cal_mdi_EN.ics',
        helperText: 'Offizieller internationaler Messekalender von Messe Düsseldorf.',
        keywords: ['messe', 'international', 'duesseldorf', 'düsseldorf', 'global'],
    },
    {
        id: 'tradefair-hannover',
        label: 'Hannover',
        subtitle: 'Suchvorschlag für Messekalender',
        category: 'businessCalendar',
        sourceType: 'help',
        sourceName: 'offizielle Messe-Website Hannover',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Suchen Sie auf der offiziellen Standortseite nach iCal, ICS oder Online-Kalender.',
        keywords: ['hannover', 'messe', 'industrie', 'messegelände'],
    },
    {
        id: 'tradefair-frankfurt',
        label: 'Frankfurt am Main',
        subtitle: 'Suchvorschlag für Messekalender',
        category: 'businessCalendar',
        sourceType: 'help',
        sourceName: 'offizielle Messe-Website Frankfurt',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Suchen Sie auf der offiziellen Standortseite nach iCal, ICS oder Eventkalender.',
        keywords: ['frankfurt', 'messe', 'buchmesse', 'ambiente', 'veranstaltungen'],
    },
    {
        id: 'tradefair-wien',
        label: 'Wien',
        subtitle: 'Suchvorschlag für Messekalender',
        category: 'businessCalendar',
        sourceType: 'help',
        sourceName: 'offizielle Messe-Website Wien',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Für Wien bitte nach offiziellem Messekalender, iCal oder ICS suchen.',
        keywords: ['wien', 'vienna', 'messe', 'österreich'],
    },
    {
        id: 'tradefair-zuerich',
        label: 'Zürich',
        subtitle: 'Suchvorschlag für Messekalender',
        category: 'businessCalendar',
        sourceType: 'help',
        sourceName: 'offizielle Messe-Website Zürich',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Für Zürich bitte nach offiziellem Messekalender, iCal oder ICS suchen.',
        keywords: ['zürich', 'zurich', 'messe', 'schweiz'],
    },
];

const OTHER_CALENDAR_OPTIONS: AssistantOption[] = [
    {
        id: 'other-waste',
        label: 'Abfallkalender / Entsorgung',
        subtitle: 'kommunale oder städtische Kalender',
        category: 'custom',
        sourceType: 'help',
        sourceName: 'offizielle Kommune oder Entsorger',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Geeignet für Müllabfuhr, Wertstofftermine oder kommunale Abholpläne.',
        keywords: ['abfall', 'muell', 'müll', 'entsorgung', 'kommune', 'stadt'],
    },
    {
        id: 'other-cultural',
        label: 'Kultur- und Veranstaltungskalender',
        subtitle: 'z. B. Theater, Stadtmarketing, Bürgerhaus',
        category: 'custom',
        sourceType: 'help',
        sourceName: 'offizielle Veranstaltungsseite',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Suchen Sie nach offiziellem iCal-, ICS- oder Kalenderabo-Angebot.',
        keywords: ['kultur', 'veranstaltung', 'theater', 'stadtmarketing'],
    },
    {
        id: 'other-club',
        label: 'Vereinskalender',
        subtitle: 'z. B. Sport, Ehrenamt, Bildungsarbeit',
        category: 'custom',
        sourceType: 'help',
        sourceName: 'offizielle Vereins- oder Verbandsseite',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Suchen Sie nach Vereinskalender, Termin-Feed, iCal oder ICS.',
        keywords: ['verein', 'verband', 'ehrenamt', 'termine'],
    },
    {
        id: 'other-school',
        label: 'Schul- oder Campuskalender',
        subtitle: 'z. B. Schule, Volkshochschule, Hochschule',
        category: 'custom',
        sourceType: 'help',
        sourceName: 'offizielle Bildungsseite',
        validity: 'Quelle bitte im nächsten Schritt prüfen',
        helperText:
            'Suchen Sie nach Semesterkalender, Terminfeed, iCal oder ICS.',
        keywords: ['schule', 'campus', 'hochschule', 'seminare', 'bildung'],
    },
];

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
        case 'regionalHolidays':
            return 'regionale Feiertage';
        case 'nationalHolidays':
            return 'nationale Feiertage';
        case 'internationalHolidays':
            return 'internationale Feiertage';
        case 'businessCalendar':
            return 'Messekalender / Betriebskalender';
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

function matchesSearch(option: AssistantOption, query: string): boolean {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return true;

    const haystack = [
        option.label,
        option.subtitle,
        option.sourceName,
        option.validity ?? '',
        option.helperText ?? '',
        ...option.keywords,
    ]
        .join(' ')
        .toLowerCase();

    return haystack.includes(trimmedQuery);
}

function buildSchoolHolidayOptions(): AssistantOption[] {
    return STATE_SOURCES.map((state) => ({
        id: `school-${state.id}`,
        label: state.label,
        subtitle: 'Schulferien',
        category: 'schoolHolidays' as const,
        sourceType: 'url' as const,
        sourceName: 'feiertage-deutschland.de',
        validity: 'Kalenderabo bis 2029',
        sourceUrl: state.schoolUrl,
        keywords: [state.label.toLowerCase(), 'schulferien', 'ferien', state.id],
    }));
}

function buildRegionalHolidayOptions(): AssistantOption[] {
    return STATE_SOURCES.map((state) => ({
        id: `regional-${state.id}`,
        label: state.label,
        subtitle: 'regionale Feiertage',
        category: 'regionalHolidays' as const,
        sourceType: 'url' as const,
        sourceName: 'Office Holidays',
        validity: 'laufendes Kalenderabo',
        sourceUrl: state.regionalUrl,
        keywords: [state.label.toLowerCase(), 'regionale feiertage', 'landesweite feiertage', state.id],
    }));
}

type AssistantPreset = {
    token: string;
    calendarLabel: string;
    category: AdditionalCalendarCategory;
    sourceType: SourceType;
    sourceName?: string;
    sourceUrl?: string;
    validity?: string;
    helperText?: string;
};

type AdditionalCalendarImportAssistantProps = {
    onOpenFindingAssistant?: () => void;
    preset?: AssistantPreset | null;
};

export default function AdditionalCalendarImportAssistant({
    onOpenFindingAssistant: _onOpenFindingAssistant,
    preset = null,
}: AdditionalCalendarImportAssistantProps) {
    const [sourceType, setSourceType] = useState<SourceType | null>(null);
    const [calendarLabel, setCalendarLabel] = useState('');
    const [category, setCategory] = useState<AdditionalCalendarCategory>('custom');
    const [sourceUrl, setSourceUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preparedSourceName, setPreparedSourceName] = useState('');
    const [preparedValidity, setPreparedValidity] = useState('');
    const [preparedHelperText, setPreparedHelperText] = useState('');

    const [preview, setPreview] = useState<PreviewState | null>(null);
    const [storedCalendars, setStoredCalendars] = useState<StoredAdditionalCalendar[]>([]);
    const [expandedCalendarId, setExpandedCalendarId] = useState<string | null>(null);

    const [isBusy, setIsBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [findingAssistantOpen, setFindingAssistantOpen] = useState(false);
    const [activeAssistantTile, setActiveAssistantTile] =
        useState<AssistantTileKey>('schoolHolidays');
    const [assistantSearch, setAssistantSearch] = useState('');

    const sourceSelectionSectionRef = useRef<HTMLDivElement | null>(null);
    const findingAssistantSectionRef = useRef<HTMLDivElement | null>(null);
    const assistantResultsSectionRef = useRef<HTMLDivElement | null>(null);
    const urlSectionRef = useRef<HTMLDivElement | null>(null);
    const fileSectionRef = useRef<HTMLDivElement | null>(null);
    const helpSectionRef = useRef<HTMLDivElement | null>(null);

    const schoolHolidayOptions = useMemo(() => buildSchoolHolidayOptions(), []);
    const regionalHolidayOptions = useMemo(() => buildRegionalHolidayOptions(), []);

    const filteredSchoolHolidayOptions = useMemo(
        () => schoolHolidayOptions.filter((option) => matchesSearch(option, assistantSearch)),
        [assistantSearch, schoolHolidayOptions],
    );

    const filteredRegionalHolidayOptions = useMemo(
        () => regionalHolidayOptions.filter((option) => matchesSearch(option, assistantSearch)),
        [assistantSearch, regionalHolidayOptions],
    );

    const filteredNationalHolidayOptions = useMemo(
        () => NATIONAL_HOLIDAY_OPTIONS.filter((option) => matchesSearch(option, assistantSearch)),
        [assistantSearch],
    );

    const filteredInternationalHolidayOptions = useMemo(
        () =>
            INTERNATIONAL_HOLIDAY_OPTIONS.filter((option) =>
                matchesSearch(option, assistantSearch),
            ),
        [assistantSearch],
    );

    const filteredTradeFairOptions = useMemo(
        () => TRADE_FAIR_OPTIONS.filter((option) => matchesSearch(option, assistantSearch)),
        [assistantSearch],
    );

    const filteredOtherCalendarOptions = useMemo(
        () => OTHER_CALENDAR_OPTIONS.filter((option) => matchesSearch(option, assistantSearch)),
        [assistantSearch],
    );

    useEffect(() => {
        setStoredCalendars(readStoredCalendars());
    }, []);

    useEffect(() => {
        if (!preset) return;

        setCalendarLabel(preset.calendarLabel);
        setCategory(preset.category);
        setSourceType(preset.sourceType);
        setSourceUrl(preset.sourceUrl ?? '');
        setSelectedFile(null);
        setPreparedSourceName(preset.sourceName ?? '');
        setPreparedValidity(preset.validity ?? '');
        setPreparedHelperText(preset.helperText ?? '');
        setPreview(null);
        setErrorMessage(null);
        setSuccessMessage(
            preset.sourceUrl
                ? 'Die Auswahl aus dem Assistenten wurde in die Vorbereitung übernommen. Der ICS-Link wurde bereits eingetragen.'
                : 'Die Auswahl aus dem Assistenten wurde in die Vorbereitung übernommen.',
        );

        window.setTimeout(() => {
            const targetRef =
                preset.sourceType === 'url'
                    ? urlSectionRef
                    : preset.sourceType === 'file'
                        ? fileSectionRef
                        : helpSectionRef;

            targetRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }, [preset]);

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
        setPreparedSourceName('');
        setPreparedValidity('');
        setPreparedHelperText('');
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
        resetSourceInputs();
        resetMessages();

        window.setTimeout(() => {
            sourceSelectionSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    }

    function handleOpenFindingAssistant() {
        setFindingAssistantOpen(true);
        resetMessages();

        window.setTimeout(() => {
            findingAssistantSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    }

    function handleCloseFindingAssistant() {
        setFindingAssistantOpen(false);
        setAssistantSearch('');

        window.setTimeout(() => {
            sourceSelectionSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    }

    function handleOpenAssistantTile(tileKey: AssistantTileKey) {
        setActiveAssistantTile(tileKey);
        setAssistantSearch('');

        window.setTimeout(() => {
            assistantResultsSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    }

    function applyAssistantOption(option: AssistantOption) {
        setCalendarLabel(option.label);
        setCategory(option.category);
        setSourceType(option.sourceType);
        setSourceUrl(option.sourceUrl ?? '');
        setSelectedFile(null);
        setPreparedSourceName(option.sourceName);
        setPreparedValidity(option.validity ?? '');
        setPreparedHelperText(option.helperText ?? '');
        setPreview(null);
        setErrorMessage(null);
        setSuccessMessage(
            option.sourceUrl
                ? 'Die Auswahl aus dem Assistenten wurde in die Vorbereitung übernommen. Der ICS-Link wurde bereits eingetragen.'
                : 'Die Auswahl aus dem Assistenten wurde in die Vorbereitung übernommen. Bitte prüfen oder ergänzen Sie die Quelle im nächsten Schritt.',
        );

        scrollToSelectedSource(option.sourceType);
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
            const proxyUrl = `/api/ical-proxy?url=${encodeURIComponent(trimmedUrl)}`;
            const response = await fetch(proxyUrl, {
                method: 'GET',
                cache: 'no-store',
            });

            if (!response.ok) {
                let errorMessageFromProxy = `Die Quelle antwortet mit Status ${response.status}.`;

                try {
                    const errorPayload = (await response.json()) as { error?: string };
                    if (errorPayload?.error) {
                        errorMessageFromProxy = errorPayload.error;
                    }
                } catch {
                    // Antwort war kein JSON, Standardmeldung bleibt bestehen
                }

                throw new Error(errorMessageFromProxy);
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
            sourceName: preparedSourceName || undefined,
            validity: preparedValidity || undefined,
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
                    resetSourceInputs();
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

    function renderAssistantTileButton(tile: {
        key: AssistantTileKey;
        title: string;
        description: string;
    }) {
        const isActive = activeAssistantTile === tile.key;

        return (
            <button
                key={tile.key}
                type="button"
                onClick={() => handleOpenAssistantTile(tile.key)}
                className={[
                    'w-full rounded-2xl border p-4 text-left shadow-sm transition duration-200',
                    isActive
                        ? 'cursor-pointer border-[#990000] bg-[#FFF4F4] shadow-md'
                        : 'cursor-pointer border-slate-200 bg-white hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#C88F8F] hover:bg-[#FFF8F8] hover:shadow-md',
                ].join(' ')}
            >
                <div className="text-sm font-semibold text-slate-900">{tile.title}</div>
                <div className="mt-2 text-xs leading-relaxed text-slate-600">
                    {tile.description}
                </div>
            </button>
        );
    }

    function renderAssistantOptionCard(option: AssistantOption) {
        return (
            <div
                key={option.id}
                className="rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] p-4 shadow-sm"
            >
                <div className="text-sm font-semibold text-slate-900">{option.label}</div>
                <div className="mt-1 text-xs text-slate-600">{option.subtitle}</div>
                <div className="mt-2 text-xs text-slate-600">
                    Quelle: <span className="font-medium text-slate-800">{option.sourceName}</span>
                </div>
                {option.validity ? (
                    <div className="mt-1 text-xs text-slate-600">
                        Gültigkeitszeitraum:{' '}
                        <span className="font-medium text-slate-800">{option.validity}</span>
                    </div>
                ) : null}
                {option.helperText ? (
                    <div className="mt-3 rounded-xl border border-[#E9CFCF] bg-white px-3 py-3 text-xs leading-relaxed text-slate-700">
                        {option.helperText}
                    </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => applyAssistantOption(option)}
                        className={EMPHASIS_BUTTON_CLASS}
                    >
                        in Quelle vorbereiten übernehmen
                    </button>
                </div>
            </div>
        );
    }

    function renderAssistantResults() {
        if (activeAssistantTile === 'schoolHolidays') {
            return (
                <div className="space-y-4">
                    <div className="text-sm leading-relaxed text-slate-700">
                        Bundesland auswählen oder im Suchfeld filtern.
                    </div>

                    <input
                        type="text"
                        value={assistantSearch}
                        onChange={(event) => setAssistantSearch(event.target.value)}
                        placeholder="Bundesland suchen …"
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                    />

                    {filteredSchoolHolidayOptions.length === 0 ? (
                        <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                            Kein Bundesland passend zur Suche gefunden.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredSchoolHolidayOptions.map(renderAssistantOptionCard)}
                        </div>
                    )}
                </div>
            );
        }

        if (activeAssistantTile === 'regionalHolidays') {
            return (
                <div className="space-y-4">
                    <div className="text-sm leading-relaxed text-slate-700">
                        Bundesland auswählen oder im Suchfeld filtern.
                    </div>

                    <input
                        type="text"
                        value={assistantSearch}
                        onChange={(event) => setAssistantSearch(event.target.value)}
                        placeholder="Bundesland suchen …"
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                    />

                    {filteredRegionalHolidayOptions.length === 0 ? (
                        <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                            Kein Bundesland passend zur Suche gefunden.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredRegionalHolidayOptions.map(renderAssistantOptionCard)}
                        </div>
                    )}
                </div>
            );
        }

        if (activeAssistantTile === 'nationalHolidays') {
            return (
                <div className="space-y-4">
                    <div className="text-sm leading-relaxed text-slate-700">
                        Land auswählen oder im Suchfeld filtern.
                    </div>

                    <input
                        type="text"
                        value={assistantSearch}
                        onChange={(event) => setAssistantSearch(event.target.value)}
                        placeholder="Deutschland, Österreich oder Schweiz suchen …"
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                    />

                    {filteredNationalHolidayOptions.length === 0 ? (
                        <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                            Kein Land passend zur Suche gefunden.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredNationalHolidayOptions.map(renderAssistantOptionCard)}
                        </div>
                    )}
                </div>
            );
        }

        if (activeAssistantTile === 'internationalHolidays') {
            return (
                <div className="space-y-4">
                    <div className="text-sm leading-relaxed text-slate-700">
                        Kleine internationale Vorauswahl für den MVP. Per Suchfeld können Sie nach
                        Ländern filtern.
                    </div>

                    <input
                        type="text"
                        value={assistantSearch}
                        onChange={(event) => setAssistantSearch(event.target.value)}
                        placeholder="z. B. USA, Frankreich, Various …"
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                    />

                    {filteredInternationalHolidayOptions.length === 0 ? (
                        <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                            Kein internationaler Kalender passend zur Suche gefunden.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredInternationalHolidayOptions.map(renderAssistantOptionCard)}
                        </div>
                    )}
                </div>
            );
        }

        if (activeAssistantTile === 'tradeFairs') {
            return (
                <div className="space-y-4">
                    <div className="text-sm leading-relaxed text-slate-700">
                        Schlanker MVP: zunächst mit einer kleinen, überschaubaren Auswahl. Über das
                        Suchfeld können Standort oder Messetyp gefiltert werden.
                    </div>

                    <input
                        type="text"
                        value={assistantSearch}
                        onChange={(event) => setAssistantSearch(event.target.value)}
                        placeholder="z. B. Düsseldorf, Hannover, Wien …"
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                    />

                    {filteredTradeFairOptions.length === 0 ? (
                        <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                            Kein Messekalender passend zur Suche gefunden.
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredTradeFairOptions.map(renderAssistantOptionCard)}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="text-sm leading-relaxed text-slate-700">
                    Sonstige Kalender bleiben bewusst offen. Hier bereiten Sie zunächst
                    Suchvorschläge vor und ergänzen die Quelle anschließend manuell.
                </div>

                <input
                    type="text"
                    value={assistantSearch}
                    onChange={(event) => setAssistantSearch(event.target.value)}
                    placeholder="z. B. Abfall, Kultur, Verein, Campus …"
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20"
                />

                {filteredOtherCalendarOptions.length === 0 ? (
                    <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-500">
                        Kein Suchvorschlag passend zur Suche gefunden.
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {filteredOtherCalendarOptions.map(renderAssistantOptionCard)}
                    </div>
                )}
            </div>
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

                    <button
                        type="button"
                        onClick={handleOpenFindingAssistant}
                        className="w-full cursor-pointer rounded-2xl border border-[#990000] bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-[#FFF8F8] hover:shadow-md"
                    >
                        <div className="text-sm font-semibold text-slate-900">
                            Assistent öffnen
                        </div>
                        <div className="mt-2 text-xs leading-relaxed text-slate-600">
                            Öffnet den Zusatzkalender-Assistenten mit 6 Kategorien.
                        </div>
                    </button>
                </div>
            </div>

            {findingAssistantOpen ? (
                <div
                    ref={findingAssistantSectionRef}
                    className="rounded-2xl border-2 border-[#990000] bg-white p-5"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="text-lg font-semibold text-slate-900">
                                Zusatzkalender-Assistent
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                Die Kacheln führen direkt zu einer schlanken Vorauswahl. Über
                                „in Quelle vorbereiten übernehmen“ wandert die Auswahl zurück in
                                „2. Quelle vorbereiten“.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleCloseFindingAssistant}
                            className={SECONDARY_BUTTON_CLASS}
                        >
                            schließen
                        </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {ASSISTANT_TILES.map(renderAssistantTileButton)}
                    </div>

                    <div
                        ref={assistantResultsSectionRef}
                        className="mt-5 rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] p-4"
                    >
                        <div className="text-sm font-semibold text-slate-900">
                            {ASSISTANT_TILES.find((tile) => tile.key === activeAssistantTile)?.title}
                        </div>

                        <div className="mt-4">{renderAssistantResults()}</div>
                    </div>
                </div>
            ) : null}

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
                                <option value="regionalHolidays">regionale Feiertage</option>
                                <option value="nationalHolidays">nationale Feiertage</option>
                                <option value="internationalHolidays">internationale Feiertage</option>
                                <option value="businessCalendar">Messekalender / Betriebskalender</option>
                                <option value="custom">eigener Zusatzkalender</option>
                            </select>
                        </div>

                        {preparedSourceName || preparedValidity || preparedHelperText ? (
                            <div className="rounded-2xl border border-[#D7B1B1] bg-[#FFF8F8] p-4 text-sm text-slate-800">
                                {preparedSourceName ? (
                                    <div>
                                        <span className="font-semibold">Vorbereitete Quelle:</span>{' '}
                                        {preparedSourceName}
                                    </div>
                                ) : null}

                                {preparedValidity ? (
                                    <div className="mt-2">
                                        <span className="font-semibold">Gültigkeitszeitraum:</span>{' '}
                                        {preparedValidity}
                                    </div>
                                ) : null}

                                {preparedHelperText ? (
                                    <div className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                                        <span className="font-semibold text-sm">Hinweis:</span>{' '}
                                        {preparedHelperText}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

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
                                        onClick={handleCloseSourcePreparation}
                                        className={SECONDARY_BUTTON_CLASS}
                                    >
                                        schließen
                                    </button>
                                </div>

                                {preparedHelperText ? (
                                    <div className="rounded-xl border border-[#D7B1B1] bg-white px-3 py-3 text-xs leading-relaxed text-slate-700">
                                        {preparedHelperText}
                                    </div>
                                ) : null}

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
                                        Für den ersten Test ist oft der einfachste Weg: Quelle
                                        suchen → ICS-Link kopieren oder Datei herunterladen → hier
                                        einfügen bzw. hochladen → Vorschau prüfen → Zusatzkalender
                                        übernehmen.
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
                                        {preparedSourceName ? (
                                            <div>
                                                <span className="font-semibold">
                                                    Vorbereitete Quelle:
                                                </span>{' '}
                                                {preparedSourceName}
                                            </div>
                                        ) : null}

                                        <div className={preparedSourceName ? 'mt-1' : ''}>
                                            <span className="font-semibold">Quelle:</span>{' '}
                                            {preview.sourceLabel}
                                        </div>

                                        {preparedValidity ? (
                                            <div className="mt-1">
                                                <span className="font-semibold">
                                                    Gültigkeitszeitraum:
                                                </span>{' '}
                                                {preparedValidity}
                                            </div>
                                        ) : null}

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
                                            {calendar.sourceName ? (
                                                <div className="mt-1 text-xs text-slate-600">
                                                    Vorbereitete Quelle: {calendar.sourceName}
                                                </div>
                                            ) : null}
                                            <div className="mt-1 text-xs text-slate-600">
                                                Quelle: {calendar.sourceLabel}
                                            </div>
                                            {calendar.validity ? (
                                                <div className="mt-1 text-xs text-slate-600">
                                                    Gültigkeitszeitraum: {calendar.validity}
                                                </div>
                                            ) : null}
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

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    window.location.href = '/ical-editor';
                                                }}
                                                className={ORANGE_BUTTON_CLASS}
                                            >
                                                zum iCal-Editor
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