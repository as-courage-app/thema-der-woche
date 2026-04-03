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

type ZusatzkalenderKategorieId =
    (typeof ZUSATZKALENDER_KATEGORIEN)[number]['id'];

export default function ICalAdditionalCalendarsPage() {
    const router = useRouter();

    const [currentUserPlan, setCurrentUserPlan] = useState<'A' | 'B' | 'C' | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [selectedCategory, setSelectedCategory] =
        useState<ZusatzkalenderKategorieId | null>(null);
    const [showFindingHelp, setShowFindingHelp] = useState(false);

    const firstSourceRef = useRef<HTMLDivElement | null>(null);
    const categoryHelpRef = useRef<HTMLDivElement | null>(null);

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

        window.setTimeout(() => {
            firstSourceRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 120);
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
                                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-white px-4 py-2 text-sm font-semibold text-[#990000] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#FFF5F5] hover:shadow-md"
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
                                            <div className="text-sm font-semibold uppercase tracking-wide text-[#990000]">
                                                1. Quelle
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
                                                    <div className="text-sm font-semibold uppercase tracking-wide text-[#990000]">
                                                        2. Assistent
                                                    </div>

                                                    <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                                        Wähle die Art des Zusatzkalenders
                                                    </h2>

                                                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                                        Für Schulferien und regionale Feiertage folgt
                                                        im nächsten Schritt die Auswahl des
                                                        Bundeslandes. Danach zeigen wir die passenden
                                                        Quellen und Treffer an.
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleCloseFindingHelp}
                                                        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#990000] bg-[#990000] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#7A0000] hover:bg-[#7A0000] hover:shadow-lg"
                                                    >
                                                        Schließen
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
                                                                setSelectedCategory(category.id)
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

                                            <div className="mt-5 rounded-2xl border border-[#990000] bg-white p-4">
                                                {!selectedCategoryConfig ? (
                                                    <div className="text-sm text-slate-700">
                                                        Bitte wähle oben eine Kategorie aus.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="text-base font-semibold text-slate-900">
                                                            Ausgewählt:{' '}
                                                            {selectedCategoryConfig.title}
                                                        </div>

                                                        <div className="text-sm leading-relaxed text-slate-700">
                                                            {selectedCategoryConfig.requiresBundesland
                                                                ? 'Im nächsten Schritt blenden wir hier die Bundesland-Auswahl ein.'
                                                                : 'Im nächsten Schritt blenden wir hier direkt passende Kalender-Treffer ein.'}
                                                        </div>
                                                    </div>
                                                )}
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