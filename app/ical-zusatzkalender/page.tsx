'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '@/components/BackgroundLayout';
import AdditionalCalendarImportAssistant from '@/components/ical/AdditionalCalendarImportAssistant';
import { readCurrentUserPlan } from '@/lib/userPlan';

const ZUSATZKALENDER_KATEGORIEN = [
    {
        id: 'schoolHolidays',
        title: 'Schulferien',
        description: 'Ferienkalender nach Bundesland',
        requiresBundesland: true,
    },
    {
        id: 'regionalHolidays',
        title: 'regionale Feiertage',
        description: 'Gesetzliche Feiertage nach Bundesland',
        requiresBundesland: true,
    },
    {
        id: 'nationalHolidays',
        title: 'nationale Feiertage',
        description: 'Bundesweite Feiertage für Deutschland',
        requiresBundesland: false,
    },
    {
        id: 'internationalHolidays',
        title: 'internationale Feiertage',
        description: 'Internationale Feiertage und internationale Bezüge',
        requiresBundesland: false,
    },
    {
        id: 'otherCalendars',
        title: 'sonstige Kalender',
        description: 'Betriebskalender, Messekalender oder andere öffentliche Zusatzkalender',
        requiresBundesland: false,
    },
] as const;

const BUNDESLAENDER = [
    'Baden-Württemberg',
    'Bayern',
    'Berlin',
    'Brandenburg',
    'Bremen',
    'Hamburg',
    'Hessen',
    'Mecklenburg-Vorpommern',
    'Niedersachsen',
    'Nordrhein-Westfalen',
    'Rheinland-Pfalz',
    'Saarland',
    'Sachsen',
    'Sachsen-Anhalt',
    'Schleswig-Holstein',
    'Thüringen',
] as const;

type ZusatzkalenderKategorieId =
    (typeof ZUSATZKALENDER_KATEGORIEN)[number]['id'];

type PreparedSourceCard = {
    title: string;
    description: string;
    validity: string;
    sourceName: string;
    sourceType: 'url' | 'file';
    sourceUrl?: string;
    sourceHint: string;
    reviewNote?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const NEXT_YEAR = CURRENT_YEAR + 1;

const DIRECT_SOURCE_CARDS: Record<
    Exclude<ZusatzkalenderKategorieId, 'schoolHolidays' | 'regionalHolidays'>,
    PreparedSourceCard[]
> = {
    nationalHolidays: [
        {
            title: `Bundesweite Feiertage Deutschland ${CURRENT_YEAR}`,
            description:
                'Feste abonnierbare iCal-Quelle für Feiertage in Deutschland mit deutschen Feiertagsnamen.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Office Holidays',
            sourceType: 'url',
            sourceUrl: 'https://www.officeholidays.com/ics-local-name/germany',
            sourceHint:
                'Gut lesbar, weil die Feiertage mit deutscher Namensvariante ausgegeben werden.',
            reviewNote:
                'Sehr passend als erste echte Standardquelle für nationale Feiertage.',
        },
        {
            title: 'Deutschland-Feiertage als laufendes Kalenderabo',
            description:
                'Feste abonnierbare iCal-Quelle für Feiertage in Deutschland ohne Ländernamen im Titel der Termine.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Office Holidays',
            sourceType: 'url',
            sourceUrl: 'https://www.officeholidays.com/ics-clean/germany',
            sourceHint:
                'Praktisch, wenn die Terminüberschriften möglichst kurz und sauber bleiben sollen.',
            reviewNote:
                'Sinnvolle zweite Vergleichsquelle mit derselben fachlichen Grundlage, aber anderer Benennung.',
        },
    ],
    internationalHolidays: [
        {
            title: `Internationale Feiertage ${CURRENT_YEAR}`,
            description:
                'Feste abonnierbare iCal-Quelle für internationale Feiertage mit Ländernamen im Titel der Termine.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Office Holidays',
            sourceType: 'url',
            sourceUrl: 'https://www.officeholidays.com/ics/various',
            sourceHint:
                'Geeignet, wenn in den Terminüberschriften der jeweilige Länderbezug sichtbar bleiben soll.',
            reviewNote:
                'Sinnvoll als internationale Sammelquelle mit klarem Abo-Charakter.',
        },
        {
            title: 'Internationale Feiertage ohne Ländernamen',
            description:
                'Feste abonnierbare iCal-Quelle für internationale Feiertage mit kürzeren Terminüberschriften ohne Ländernamen.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Office Holidays',
            sourceType: 'url',
            sourceUrl: 'https://www.officeholidays.com/ics-clean/various',
            sourceHint:
                'Praktisch, wenn die Titel im Kalender möglichst kurz und ruhig bleiben sollen.',
            reviewNote:
                'Gute zweite Vergleichsquelle mit derselben fachlichen Grundlage, aber reduzierter Benennung.',
        },
    ],
    otherCalendars: [
        {
            title: 'Messe Düsseldorf – alle Veranstaltungen in Düsseldorf',
            description:
                'Feste abonnierbare iCal-Quelle für alle aktuellen und zukünftigen Veranstaltungen der Messe Düsseldorf am Standort Düsseldorf.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Messe Düsseldorf',
            sourceType: 'url',
            sourceUrl: 'https://www.messe-duesseldorf.de/static/mdhome/cal_md_DE.ics',
            sourceHint:
                'Geeignet als öffentliches Beispiel für einen Messe- und Veranstaltungskalender mit laufender Aktualisierung.',
            reviewNote:
                'Sehr passend als reale Beispielquelle für sonstige öffentliche Zusatzkalender.',
        },
        {
            title: 'Messe Düsseldorf – internationale Veranstaltungen',
            description:
                'Feste abonnierbare iCal-Quelle für internationale Veranstaltungen der Messe Düsseldorf.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Messe Düsseldorf',
            sourceType: 'url',
            sourceUrl: 'https://www.messe-duesseldorf.de/static/mdhome/cal_mdi_DE.ics',
            sourceHint:
                'Geeignet als zweites reales Beispiel für einen öffentlich abonnierbaren Veranstaltungskalender.',
            reviewNote:
                'Sinnvolle Vergleichsquelle, weil sie denselben Anbieter mit internationalem Fokus abbildet.',
        },
    ],
};

function getSchoolHolidaySourceUrl(bundesland: string): string {
    const slugMap: Record<string, string> = {
        'Baden-Württemberg': 'baden-wuerttemberg',
        Bayern: 'bayern',
        Berlin: 'berlin',
        Brandenburg: 'brandenburg',
        Bremen: 'bremen',
        Hamburg: 'hamburg',
        Hessen: 'hessen',
        'Mecklenburg-Vorpommern': 'mecklenburg-vorpommern',
        Niedersachsen: 'niedersachsen',
        'Nordrhein-Westfalen': 'nordrhein-westfalen',
        'Rheinland-Pfalz': 'rheinland-pfalz',
        Saarland: 'saarland',
        Sachsen: 'sachsen',
        'Sachsen-Anhalt': 'sachsen-anhalt',
        'Schleswig-Holstein': 'schleswig-holstein',
        Thüringen: 'thueringen',
    };

    return `https://www.feiertage-deutschland.de/kalender-download/ics/schulferien-${slugMap[bundesland]}.ics`;
}

function getRegionalHolidaySourceUrl(bundesland: string): string {
    const slugMap: Record<string, string> = {
        'Baden-Württemberg': 'baden-wurttemberg',
        Bayern: 'bavaria',
        Berlin: 'berlin',
        Brandenburg: 'brandenburg',
        Bremen: 'bremen',
        Hamburg: 'hamburg',
        Hessen: 'hesse',
        'Mecklenburg-Vorpommern': 'mecklenburg-western-pomerania',
        Niedersachsen: 'lower-saxony',
        'Nordrhein-Westfalen': 'north-rhine-westphalia',
        'Rheinland-Pfalz': 'rhineland-palatinate',
        Saarland: 'saarland',
        Sachsen: 'saxony',
        'Sachsen-Anhalt': 'saxony-anhalt',
        'Schleswig-Holstein': 'schleswig-holstein',
        Thüringen: 'thuringia',
    };

    return `https://www.officeholidays.com/ics/germany/${slugMap[bundesland]}`;
}

function createBundeslandCards(
    categoryId: 'schoolHolidays' | 'regionalHolidays',
    bundesland: string,
): PreparedSourceCard[] {
    if (categoryId === 'schoolHolidays') {
        return [
            {
                title: `Schulferien ${bundesland}`,
                description:
                    'Feste abonnierbare iCal-Quelle für die Schulferien dieses Bundeslandes.',
                validity: `laufendes Kalenderabo bis 2029, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
                sourceName: 'feiertage-deutschland.de',
                sourceType: 'url',
                sourceUrl: getSchoolHolidaySourceUrl(bundesland),
                sourceHint: `Geeignet für ${bundesland}; der Kalender ist als Ferien-Abo je Bundesland veröffentlicht.`,
                reviewNote:
                    'Gute Standardquelle für Schulferien, weil die URL direkt je Bundesland aufgebaut ist.',
            },
            {
                title: `Schulferien ${bundesland} als direkte Vergleichsquelle`,
                description:
                    'Zweite vorbereitete Karte mit derselben echten Ferienquelle, damit die Übernahme-Logik im Assistenten konsistent bleibt.',
                validity: `laufendes Kalenderabo bis 2029, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
                sourceName: 'feiertage-deutschland.de',
                sourceType: 'url',
                sourceUrl: getSchoolHolidaySourceUrl(bundesland),
                sourceHint: `Direkter ICS-Link für ${bundesland}.`,
                reviewNote:
                    'Technisch dieselbe belastbare Quelle; die zweite Karte dient hier zunächst als stabile Arbeitskarte.',
            },
        ];
    }

    return [
        {
            title: `Regionale Feiertage ${bundesland}`,
            description:
                'Feste abonnierbare iCal-Quelle für Feiertage mit Bundesland-Bezug.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Office Holidays',
            sourceType: 'url',
            sourceUrl: getRegionalHolidaySourceUrl(bundesland),
            sourceHint: `Geeignet für ${bundesland}; die Quelle ist als Bundesland-Abo veröffentlicht.`,
            reviewNote:
                'Sinnvoll für regionale Feiertage, weil die Quelle je Bundesland getrennt angeboten wird.',
        },
        {
            title: `Regionale Feiertage ${bundesland} ohne weitere Zusätze`,
            description:
                'Zweite vorbereitete Karte mit derselben echten Feiertagsquelle für dieses Bundesland.',
            validity: `laufendes Kalenderabo, nutzbar im Jahr ${CURRENT_YEAR} und darüber hinaus`,
            sourceName: 'Office Holidays',
            sourceType: 'url',
            sourceUrl: getRegionalHolidaySourceUrl(bundesland),
            sourceHint: `Direkter ICS-Link für ${bundesland}.`,
            reviewNote:
                'Technisch dieselbe belastbare Quelle; die zweite Karte dient hier zunächst als stabile Arbeitskarte.',
        },
    ];
}

type AssistantPresetState = {
    token: string;
    calendarLabel: string;
    category:
    | 'schoolHolidays'
    | 'regionalHolidays'
    | 'nationalHolidays'
    | 'internationalHolidays'
    | 'businessCalendar'
    | 'custom';
    sourceType: 'url' | 'file' | 'help';
    sourceName?: string;
    sourceUrl?: string;
    validity?: string;
} | null;

const WHITE_CLOSE_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-white px-4 py-2 text-sm font-semibold text-[#990000] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#FFF5F5] hover:shadow-md';

function buildAssistantPreset(params: {
    categoryId: ZusatzkalenderKategorieId;
    card: PreparedSourceCard;
    bundesland: string | null;
}): NonNullable<AssistantPresetState> {
    const { categoryId, card, bundesland } = params;

    if (categoryId === 'schoolHolidays') {
        return {
            token: `${Date.now()}-school-${card.title}`,
            calendarLabel: bundesland ? `Schulferien ${bundesland}` : card.title,
            category: 'schoolHolidays',
            sourceType: 'url',
            sourceName: card.sourceName,
            sourceUrl: card.sourceUrl,
            validity: card.validity,
        };
    }

    if (categoryId === 'regionalHolidays') {
        return {
            token: `${Date.now()}-regional-${card.title}`,
            calendarLabel: bundesland ? `Regionale Feiertage ${bundesland}` : card.title,
            category: 'regionalHolidays',
            sourceType: 'url',
            sourceName: card.sourceName,
            sourceUrl: card.sourceUrl,
            validity: card.validity,
        };
    }

    if (categoryId === 'nationalHolidays') {
        return {
            token: `${Date.now()}-national-${card.title}`,
            calendarLabel: 'Nationale Feiertage Deutschland',
            category: 'nationalHolidays',
            sourceType: 'url',
            sourceName: card.sourceName,
            sourceUrl: card.sourceUrl,
            validity: card.validity,
        };
    }

    if (categoryId === 'internationalHolidays') {
        return {
            token: `${Date.now()}-international-${card.title}`,
            calendarLabel: 'Internationale Feiertage',
            category: 'internationalHolidays',
            sourceType: 'url',
            sourceName: card.sourceName,
            sourceUrl: card.sourceUrl,
            validity: card.validity,
        };
    }

    return {
        token: `${Date.now()}-business-${card.title}`,
        calendarLabel: 'Sonstiger öffentlicher Zusatzkalender',
        category: 'businessCalendar',
        sourceType: 'url',
        sourceName: card.sourceName,
        sourceUrl: card.sourceUrl,
        validity: card.validity,
    };
}

export default function ICalAdditionalCalendarsPage() {
    const router = useRouter();

    const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [selectedCategory, setSelectedCategory] =
        useState<ZusatzkalenderKategorieId | null>(null);
    const [selectedBundesland, setSelectedBundesland] = useState<string | null>(null);
    const [showFindingHelp, setShowFindingHelp] = useState(false);
    const [assistantPreset, setAssistantPreset] = useState<AssistantPresetState>(null);

    const firstSourceRef = useRef<HTMLDivElement | null>(null);
    const categoryHelpRef = useRef<HTMLDivElement | null>(null);
    const openedCategoryAreaRef = useRef<HTMLDivElement | null>(null);
    const openedPreparedAreaRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let alive = true;

        async function loadPlan() {
            const plan = await readCurrentUserPlan();

            if (!alive) return;

            setCurrentUserPlan(plan);
            setIsLoadingPlan(false);
        }

        loadPlan();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!showFindingHelp || !selectedCategory) return;

        window.setTimeout(() => {
            openedCategoryAreaRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }, [selectedCategory, showFindingHelp]);

    useEffect(() => {
        if (!showFindingHelp || !selectedBundesland) return;

        window.setTimeout(() => {
            openedPreparedAreaRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }, [selectedBundesland, showFindingHelp]);

    const isVariantC = currentUserPlan === 'C';

    const selectedCategoryConfig =
        ZUSATZKALENDER_KATEGORIEN.find((item) => item.id === selectedCategory) ?? null;

    function handleOpenFindingAssistant() {
        setShowFindingHelp(true);

        window.setTimeout(() => {
            categoryHelpRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }

    function handleCloseFindingHelp() {
        setShowFindingHelp(false);
        setSelectedCategory(null);
        setSelectedBundesland(null);

        window.setTimeout(() => {
            firstSourceRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }

    function handleCloseCategoryDetails() {
        setSelectedCategory(null);
        setSelectedBundesland(null);

        window.setTimeout(() => {
            categoryHelpRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }

    function handleClosePreparedDetails() {
        setSelectedBundesland(null);

        window.setTimeout(() => {
            openedCategoryAreaRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }

    function handleSelectCategory(categoryId: ZusatzkalenderKategorieId) {
        setSelectedCategory(categoryId);
        setSelectedBundesland(null);
    }

    function handleTakePreparedSource(card: PreparedSourceCard) {
        if (!selectedCategory) return;

        const nextPreset = buildAssistantPreset({
            categoryId: selectedCategory,
            card,
            bundesland: selectedBundesland,
        });

        setAssistantPreset(nextPreset);
        setShowFindingHelp(false);
        setSelectedCategory(null);
        setSelectedBundesland(null);

        window.setTimeout(() => {
            firstSourceRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
    }

    const preparedCards =
        selectedCategory === 'schoolHolidays' || selectedCategory === 'regionalHolidays'
            ? selectedBundesland
                ? createBundeslandCards(selectedCategory, selectedBundesland)
                : []
            : selectedCategory
                ? DIRECT_SOURCE_CARDS[selectedCategory]
                : [];

    function renderPreparedSourceCard(card: PreparedSourceCard) {
        return (
            <div className="rounded-2xl border border-[#D7B1B1] bg-white p-4 shadow-sm">
                <div className="text-base font-semibold text-slate-900">{card.title}</div>

                <div className="mt-2 text-sm leading-relaxed text-slate-700">
                    {card.description}
                </div>

                <div className="mt-3 rounded-xl border border-[#E8C8C8] bg-[#FFF8F8] px-3 py-3 text-sm text-slate-800">
                    <div>
                        <span className="font-semibold">Gültigkeitszeitraum:</span> {card.validity}
                    </div>

                    <div className="mt-2">
                        <span className="font-semibold">Quelle:</span> {card.sourceName}
                    </div>

                    {card.sourceUrl ? (
                        <div className="mt-2 break-all">
                            <span className="font-semibold">ICS-Link:</span> {card.sourceUrl}
                        </div>
                    ) : null}

                    <div className="mt-2">
                        <span className="font-semibold">Hinweis zur Quelle:</span> {card.sourceHint}
                    </div>

                    {card.reviewNote ? (
                        <div className="mt-2">
                            <span className="font-semibold">Prüfhinweis:</span> {card.reviewNote}
                        </div>
                    ) : null}
                </div>

                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => handleTakePreparedSource(card)}
                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-[#990000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg"
                    >
                        in Quelle vorbereiten übernehmen
                    </button>
                </div>
            </div>
        );
    }

    return (
        <BackgroundLayout>
            <div className="mx-auto flex min-h-[100svh] max-w-6xl px-10 py-3">
                <div className="w-full rounded-none border-0 bg-white/98 shadow-none sm:rounded-2xl sm:border sm:border-[#990000] sm:bg-white/85 sm:shadow-xl sm:backdrop-blur-md">
                    <div className="p-5 sm:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-semibold text-slate-900">
                                    Zusatzkalender-Assistent{' '}
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
                                    onClick={() => router.push('/ical-editor')}
                                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#F29420] bg-[#F29420] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#E4891E] hover:bg-[#E4891E] hover:shadow-lg"
                                >
                                    zurück zum iCal-Editor
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.push('/quotes')}
                                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-[#990000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg"
                                >
                                    Schließen
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 rounded-2xl border-2 border-[#990000] bg-[#FFF5F5] p-5">
                            {!isLoadingPlan && !isVariantC ? (
                                <div className="space-y-4">
                                    <div className="text-lg font-semibold text-slate-900">
                                        Dieser Bereich ist in Variante C verfügbar.
                                    </div>

                                    <p className="text-sm leading-relaxed text-slate-700">
                                        Zusatzkalender werden hier als eigener Test- und
                                        Prüfbereich vorbereitet. In Variante A und B bleibt dieser
                                        Bereich deaktiviert.
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href="/account"
                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#F29420] bg-[#F29420] px-4 py-2 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#E4891E] hover:bg-[#E4891E] hover:shadow-xl"
                                        >
                                            zum upgrade
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => router.push('/quotes')}
                                            className={WHITE_CLOSE_BUTTON_CLASS}
                                        >
                                            zurück
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div
                                        ref={firstSourceRef}
                                        className="rounded-2xl border-2 border-[#990000] bg-white p-5 shadow-sm"
                                    >
                                        <div>
                                            <div className="text-xl font-semibold uppercase tracking-wide text-[#990000]">
                                                Quelle
                                            </div>

                                            <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                                Zusatzkalender prüfen und übernehmen
                                            </h2>

                                            <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                Hier prüfst du konkrete Kalenderquellen und
                                                bereitest sie für die spätere Übernahme vor.
                                            </p>
                                        </div>

                                        <div className="mt-5 rounded-2xl border border-[#990000] bg-[#FFF5F5] p-3 sm:p-4">
                                            <AdditionalCalendarImportAssistant
                                                onOpenFindingAssistant={handleOpenFindingAssistant}
                                                preset={assistantPreset}
                                            />
                                        </div>
                                    </div>

                                    {showFindingHelp ? (
                                        <div
                                            ref={categoryHelpRef}
                                            className="rounded-2xl border-2 border-[#990000] bg-[#FFF5F5] p-5 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="text-xl font-semibold uppercase tracking-wide text-[#990000]">
                                                        Assistent
                                                    </div>

                                                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                                        Wähle die Art des Zusatzkalenders
                                                    </h2>

                                                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                        Für Schulferien und regionale Feiertage folgt
                                                        im nächsten Schritt die Auswahl des
                                                        Bundeslandes. Für die anderen Bereiche werden
                                                        direkt vorbereitete Trefferbereiche
                                                        eingeblendet.
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleCloseFindingHelp}
                                                        className={WHITE_CLOSE_BUTTON_CLASS}
                                                    >
                                                        schließen
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                                {ZUSATZKALENDER_KATEGORIEN.map((category) => {
                                                    const isActive =
                                                        selectedCategory === category.id;

                                                    return (
                                                        <button
                                                            key={category.id}
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelectCategory(category.id)
                                                            }
                                                            className={`flex min-h-[120px] cursor-pointer flex-col items-start justify-between rounded-2xl border px-4 py-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg ${isActive
                                                                ? 'border-[#990000] bg-[#990000] text-white'
                                                                : 'border-[#990000] bg-white text-slate-900 hover:bg-[#FFF5F5]'
                                                                }`}
                                                        >
                                                            <div className="space-y-2">
                                                                <div className="text-base font-semibold">
                                                                    {category.title}
                                                                </div>

                                                                <div
                                                                    className={`text-sm leading-relaxed ${isActive
                                                                        ? 'text-white/95'
                                                                        : 'text-slate-600'
                                                                        }`}
                                                                >
                                                                    {category.description}
                                                                </div>
                                                            </div>

                                                            <div
                                                                className={`mt-4 text-xs font-semibold uppercase tracking-wide ${isActive
                                                                    ? 'text-white/90'
                                                                    : 'text-[#990000]'
                                                                    }`}
                                                            >
                                                                {category.requiresBundesland
                                                                    ? 'mit Bundesland-Auswahl'
                                                                    : 'direkte Auswahl'}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {selectedCategoryConfig ? (
                                                <div
                                                    ref={openedCategoryAreaRef}
                                                    className="mt-5 rounded-2xl border border-[#990000] bg-white p-4"
                                                >
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="space-y-2">
                                                            <div className="text-base font-semibold text-slate-900">
                                                                Ausgewählt:{' '}
                                                                {selectedCategoryConfig.title}
                                                            </div>

                                                            <div className="text-sm leading-relaxed text-slate-700">
                                                                {selectedCategoryConfig.requiresBundesland
                                                                    ? 'Bitte wähle jetzt das passende Bundesland. Danach erscheinen vorbereitete Trefferbereiche mit sichtbarem Gültigkeitszeitraum.'
                                                                    : 'Hier erscheinen direkt vorbereitete Trefferbereiche mit sichtbarem Gültigkeitszeitraum.'}
                                                            </div>
                                                        </div>

                                                        <div className="flex shrink-0 flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleCloseCategoryDetails}
                                                                className={WHITE_CLOSE_BUTTON_CLASS}
                                                            >
                                                                schließen
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {selectedCategoryConfig.requiresBundesland ? (
                                                        <div className="mt-4 space-y-4">
                                                            <div>
                                                                <div className="mb-3 text-sm font-semibold text-slate-900">
                                                                    Bundesland auswählen
                                                                </div>

                                                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                                                    {BUNDESLAENDER.map((bundesland) => {
                                                                        const isSelected =
                                                                            selectedBundesland ===
                                                                            bundesland;

                                                                        return (
                                                                            <button
                                                                                key={bundesland}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setSelectedBundesland(
                                                                                        bundesland,
                                                                                    )
                                                                                }
                                                                                className={`min-h-[44px] cursor-pointer rounded-xl border px-3 py-2 text-left text-sm font-semibold shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md ${isSelected
                                                                                    ? 'border-[#990000] bg-[#990000] text-white'
                                                                                    : 'border-[#D7B1B1] bg-[#FFF8F8] text-slate-900 hover:border-[#990000]'
                                                                                    }`}
                                                                            >
                                                                                {bundesland}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {!selectedBundesland ? (
                                                                <div className="rounded-xl border border-[#D7B1B1] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-700">
                                                                    Bitte wähle ein Bundesland,
                                                                    damit die vorbereiteten
                                                                    Trefferbereiche angezeigt
                                                                    werden.
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    ref={openedPreparedAreaRef}
                                                                    className="space-y-3"
                                                                >
                                                                    <div className="flex flex-col gap-3 rounded-xl border border-[#990000] bg-[#FFF8F8] px-4 py-4 text-sm text-slate-800 sm:flex-row sm:items-start sm:justify-between">
                                                                        <div>
                                                                            <span className="font-semibold">
                                                                                Aktuelle Auswahl:
                                                                            </span>{' '}
                                                                            {selectedCategoryConfig.title}{' '}
                                                                            · {selectedBundesland}
                                                                        </div>

                                                                        <div className="flex shrink-0 flex-wrap gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={handleClosePreparedDetails}
                                                                                className={WHITE_CLOSE_BUTTON_CLASS}
                                                                            >
                                                                                schließen
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {preparedCards.map((card) => (
                                                                        <React.Fragment
                                                                            key={`${selectedCategory}-${selectedBundesland}-${card.title}`}
                                                                        >
                                                                            {renderPreparedSourceCard(
                                                                                card,
                                                                            )}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            ref={openedPreparedAreaRef}
                                                            className="mt-4 space-y-3"
                                                        >
                                                            {preparedCards.map((card) => (
                                                                <React.Fragment
                                                                    key={`${selectedCategory}-${card.title}`}
                                                                >
                                                                    {renderPreparedSourceCard(card)}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="mt-5 rounded-2xl border border-[#990000] bg-white p-4">
                                                    <div className="text-sm text-slate-700">
                                                        Bitte wähle oben eine Kategorie aus.
                                                    </div>
                                                </div>
                                            )}
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