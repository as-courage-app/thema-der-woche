'use client';

import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import { useEffect, useState } from 'react';

const APP_MODE_KEY = 'as-courage.appMode.v1';

export default function VersionPage() {
  const router = useRouter();

  function choose(next: 'free' | 'full') {
    try {
      localStorage.setItem(APP_MODE_KEY, next);
    } catch {
      // bewusst leer
    }
    if (next === 'free') {
      router.push('/start');
    } else {
      router.push('/account');
    }
  }
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <BackgroundLayout showLogout={false}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              Thema der Woche <span className="text-slate-600">(Edition 1)</span>
            </h1>

            <a
              href="mailto:kontakt@as-courage.de?subject=Thema%20der%20Woche%20%E2%80%93%20Vollversion%20anfragen"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              title="E-Mail öffnen"
            >
              E-Mail für weitere Anfragen
              <span aria-hidden="true">✉</span>
            </a>
          </div>

          <div className="mt-2 text-sm text-slate-700">Browserbasierte App (ohne Installation) für PC · Android · Apple - und analog als Tischaufsteller</div>

          {/* Hinweis (temporär) */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700 shadow-sm backdrop-blur">
            <div className="text-lg font-semibold text-slate-900">Herzlich willkommen beim Thema der Woche</div>
            <p className="mt-3 text-base text-slate-700">
              <span className="font-semibold">Ein Thema pro Woche. Ein Impuls pro Tag. Mehr Miteinander.</span>
            </p>

            <p className="mt-2 text-base text-slate-700">
              „Thema der Woche“ stärkt{' '}
              <a
                href="https://www.as-courage.de/wertsch%C3%A4tzung"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline hover:text-slate-900"
              >
                Wertschätzung
              </a>{' '}
              und{' '}
              <a
                href="https://www.as-courage.de/psy_safety"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline hover:text-slate-900"
              >
                psychologische Sicherheit
              </a>{' '}
              durch kurze, alltagstaugliche Reflexionsfragen – perfekt als Gesprächseinstieg, Check-in im Team oder für die eigene
              Selbstführung. <span className="font-semibold">Links zur App (kostenlos und Vollversion) weiter unten!</span>
            </p>

          </div>

          {/* Hero: Bild + Willkommenstext */}
          <div className="mt-6">
            <img
              src="/version-aufsteller.jpg"
              alt="Thema der Woche als Tischaufsteller"
              className="w-full rounded-2xl shadow-md ring-1 ring-slate-200"
            />

            <div className="mt-4 rounded-2xl bg-white/85 p-6 shadow-sm ring-1 ring-slate-200">

              <h2 className="text-xl font-semibold text-slate-900">Mini-Impulse für Führung und wertschätzende Kommunikation</h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Vorteile</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>Fokus mit einer klaren Haltung</li>
                    <li>Reflexion und Perspektivwechsel</li>
                    <li>Gute Fragen für bessere Gespräche</li>
                    <li>Aktives Zuhören bei den Antworten</li>

                  </ul>
                </div>

                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">Ziele</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    <li>Führung im Alltag entlasten</li>
                    <li>Motivation und Bindung stärken</li>
                    <li>Ehrliches Interesse am Menschen</li>
                    <li>Psychologische Sicherheit fördern</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {/* Kostenlose Version */}
            <button
              type="button"
              onClick={() => choose('free')}
              className="block h-full cursor-pointer rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-slate-500 hover:bg-slate-50 hover:shadow-xl hover:ring-4 hover:ring-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">Kostenlose Version - hier klicken</div>
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Funktionsumfang:</div>
                <ul className="mt-1 list-disc pl-5">
                  <li>alle 41 Wochenthemen sichtbar</li>
                  <li>4 von 41 Wochenthemen zur Auswahl</li>
                  <li>4 von 41 Zitaten und Bildern sichtbar</li>
                  <li>4 von 41 Podcastfolgen hörbar</li>
                  <li>max. 2 Themen gleichzeitig auswählbar</li>
                  <li>Reihenfolge der Themen veränderbar</li>
                  <li>Kennzeichnung der genutzten Themen</li>
                  <li>alle 4 Themen wiederverwendbar</li>
                  <li>Startdatum festlegbar (jeweils montags)</li>
                  <li>20 Tagesimpulse (Mo–Fr) anwählbar</li>
                  <li>Team-/Kalenderfunktionen (iCal)</li>
                  <li>Notizfunktion mit Druckausgabe</li>
                  <li className="invisible" aria-hidden="true">Platzhalter</li>
                  <li className="invisible" aria-hidden="true">Platzhalter</li>
                  <li className="invisible" aria-hidden="true">Platzhalter</li>
                  <li className="invisible" aria-hidden="true">Platzhalter</li>
                </ul>
              </div>
            </button>

            {/* Vollversion */}
            <button
              type="button"
              onClick={() => choose('full')}
              className="block h-full cursor-pointer rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-slate-500 hover:bg-slate-50 hover:shadow-xl hover:ring-4 hover:ring-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">Vollversion (Lizenz) - hier klicken</div>

                </div>
              </div>

              <div className="mt-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Funktionsumfang (Vollversion):</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Alle Inhalte: 41 Wochen-Themen, Bilder, Zitate und 205 Tagesimpulse</li>
                  <li>41 Podcastfolgen hörbar</li>
                  <li>Freie Themenwahl manuell oder per Zufall</li>
                  <li>Reihenfolge aller Themen veränderbar</li>
                  <li>Startdatum festlegbar (Wochenstart jeweils am Montag)</li>
                  <li>Bereits genutzte Wochen-Themen werden gekennzeichnet</li>
                  <li>Gekennzeichnete Themen sind wiederverwendbar</li>
                  <li>Team-/Kalenderfunktionen (iCal) je nach Lizenz</li>
                  <li>Notizfunktion mit Druckausgabe</li>
                </ul>
              </div>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href="https://forms.gle/5hVJ7qVBfsgSd1EBA"
              target="_blank"
              rel="noreferrer"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              Für Verbesserungsvorschläge und Rückmeldungen (Google Formular)
              <span aria-hidden="true">↗</span>
            </a>
          </div>

        </section>
      </main>
    </BackgroundLayout >
  );
}
