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
    sourceHint: string;
};

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
} | null;

const WHITE_CLOSE_BUTTON_CLASS =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-white px-4 py-2 text-sm font-semibold text-[#990000] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#FFF5F5] hover:shadow-md';

const DIRECT_SOURCE_CARDS: Record<
    Exclude<ZusatzkalenderKategorieId, 'schoolHolidays' | 'regionalHolidays'>,
    PreparedSourceCard[]
> = {
    nationalHolidays: [
        {
            title: 'Bundesweite Feiertage Deutschland',
            description:
                'Vorbereiteter Trefferbereich für bundesweit geltende Feiertage. Hier sollen im nächsten Ausbauschritt passende ICS-Quellen oder direkt prüfbare Kalenderquellen erscheinen.',
            validity: 'meist kalenderjährlich, z. B. 01.01.2026 bis 31.12.2026',
            sourceHint:
                'Bevorzugt: offizielle oder klar gepflegte Kalenderquelle mit Deutschland-Bezug',
        },
        {
            title: 'Feiertagskalender Deutschland mit Jahresbezug',
            description:
                'Geeignet für wiederkehrende Feiertagsübersichten, wenn der Geltungszeitraum klar erkennbar ist und die Quelle echte VEVENT-Einträge liefert.',
            validity: 'pro Kalenderjahr prüfen',
            sourceHint: 'Auf klare Jahresangabe und vollständige Feiertagsliste achten',
        },
    ],
    internationalHolidays: [
        {
            title: 'Internationale Gedenk- und Feiertage',
            description:
                'Vorbereiteter Trefferbereich für internationale Feiertage, Welttage oder grenzüberschreitende Kalendereinträge mit öffentlichem Bezug.',
            validity: 'je nach Quelle kalenderjährlich oder mehrjährig',
            sourceHint:
                'Nur Quellen mit klarem Geltungsbereich und sinnvoller Terminstruktur verwenden',
        },
        {
            title: 'Internationale Kalender mit Europa- oder Weltbezug',
            description:
                'Geeignet für Quellen, die internationale Aktionstage oder öffentliche internationale Termine in iCal-Form bereitstellen.',
            validity: 'Zeitraum immer vor Übernahme prüfen',
            sourceHint: 'Wichtig: echte ICS-Quelle mit brauchbarer Vorschau und sauberer Datierung',
        },
    ],
    otherCalendars: [
        {
            title: 'Betriebskalender oder öffentliche Organisationskalender',
            description:
                'Hier sollen später Treffer für Betriebskalender, Veranstaltungsreihen, öffentliche Messekalender oder ähnliche Zusatzkalender erscheinen.',
            validity: 'oft jahresbezogen oder veranstaltungsbezogen',
            sourceHint:
                'Nur öffentlich zugängliche Kalender mit nachvollziehbarer Quelle übernehmen',
        },
        {
            title: 'Sonstige öffentliche Zusatzkalender',
            description:
                'Geeignet für thematische Kalender, wenn sie offen zugänglich sind, einen klaren Zeitraum haben und technisch als iCal-Quelle geprüft werden können.',
            validity: 'Zeitraum laut Quelle vor Übernahme sichtbar prüfen',
            sourceHint: 'Unklare Sammelseiten ohne echten Kalender besser vermeiden',
        },
    ],
};

function createBundeslandCards(
    categoryId: 'schoolHolidays' | 'regionalHolidays',
    bundesland: string,
): PreparedSourceCard[] {
    if (categoryId === 'schoolHolidays') {
        return [
            {
                title: `Schulferien ${bundesland}`,
                description:
                    'Vorbereiteter Trefferbereich für Ferienkalender dieses Bundeslandes. Hier sollen im nächsten Ausbauschritt passende Ferienquellen und prüfbare ICS-Treffer erscheinen.',
                validity: 'in der Regel schuljahres- oder kalenderjahresbezogen',
                sourceHint: `Auf eindeutigen Bezug zu ${bundesland} und auf den sichtbaren Zeitraum achten`,
            },
            {
                title: `Ferienübersicht ${bundesland} mit Kalenderbezug`,
                description:
                    'Geeignet für Quellen, die Ferienzeiten klar datiert aufführen und als iCal-Quelle oder herunterladbare ICS-Datei bereitstellen.',
                validity: 'Ferienjahr bzw. Kalenderjahr laut Quelle',
                sourceHint: 'Wichtig: offizielle oder verlässlich gepflegte Quelle bevorzugen',
            },
        ];
    }

    return [
        {
            title: `Regionale Feiertage ${bundesland}`,
            description:
                'Vorbereiteter Trefferbereich für Feiertage mit Bundesland-Bezug. Hier sollen im nächsten Ausbauschritt passende Quellen oder direkte Treffer erscheinen.',
            validity: 'meist kalenderjährlich',
            sourceHint: `Nur Quellen verwenden, die klar für ${bundesland} gelten`,
        },
        {
            title: `Gesetzliche Feiertage ${bundesland} mit Jahresbezug`,
            description:
                'Geeignet für regionale Feiertagskalender, wenn die Einträge als VEVENT vorliegen und der Zeitraum eindeutig sichtbar ist.',
            validity: 'Kalenderjahr laut Quelle',
            sourceHint:
                'Vor Übernahme prüfen, ob die Feiertage tatsächlich regional und nicht bundesweit sind',
        },
    ];
}

function buildAssistantPreset(params: {
    categoryId: ZusatzkalenderKategorieId;
    cardTitle: string;
    bundesland: string | null;
}): NonNullable<AssistantPresetState> {
    const { categoryId, cardTitle, bundesland } = params;

    if (categoryId === 'schoolHolidays') {
        return {
            token: `${Date.now()}-school-${cardTitle}`,
            calendarLabel: bundesland ? `Schulferien ${bundesland}` : cardTitle,
            category: 'schoolHolidays',
            sourceType: 'url',
        };
    }

    if (categoryId === 'regionalHolidays') {
        return {
            token: `${Date.now()}-regional-${cardTitle}`,
            calendarLabel: bundesland ? `Regionale Feiertage ${bundesland}` : cardTitle,
            category: 'regionalHolidays',
            sourceType: 'url',
        };
    }

    if (categoryId === 'nationalHolidays') {
        return {
            token: `${Date.now()}-national-${cardTitle}`,
            calendarLabel: 'Nationale Feiertage Deutschland',
            category: 'nationalHolidays',
            sourceType: 'url',
        };
    }

    if (categoryId === 'internationalHolidays') {
        return {
            token: `${Date.now()}-international-${cardTitle}`,
            calendarLabel: 'Internationale Feiertage',
            category: 'internationalHolidays',
            sourceType: 'url',
        };
    }

    return {
        token: `${Date.now()}-business-${cardTitle}`,
        calendarLabel: 'Sonstiger öffentlicher Zusatzkalender',
        category: 'businessCalendar',
        sourceType: 'url',
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

    function handleTakePreparedSource(cardTitle: string) {
        if (!selectedCategory) return;

        const nextPreset = buildAssistantPreset({
            categoryId: selectedCategory,
            cardTitle,
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
                        <span className="font-semibold">Hinweis zur Quelle:</span> {card.sourceHint}
                    </div>
                </div>

                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => handleTakePreparedSource(card.title)}
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