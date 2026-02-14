'use client';

import Link from 'next/link';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function VersionPage() {
  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-slate-900">
            Thema der Woche <span className="text-slate-600">(Edition 1)</span>
          </h1>

          <div className="mt-2 text-sm text-slate-700">Kostenlose Version zum Testen der Kernfunktionen</div>

          {/* Hinweis (temporär) */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700 shadow-sm backdrop-blur">
            <div className="font-semibold text-slate-900"> Hinweis</div>

            <p className="mt-2">
              Sie  können dauerhaft testen! Über ein kurzes Feedback zu Bedienung, Darstellung und Inhalten würde ich mich sehr freuen. 
              Haben Sie Verbesserungsvorschläge? Dann einfach kurz beschreiben, fertig. 😊
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
  <a
    href="https://forms.gle/5hVJ7qVBfsgSd1EBA"
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
  >
    Zum Auswertebogen (Google Formular)
    <span aria-hidden="true">↗</span>
  </a>

  <a
    href="mailto:kontakt@as-courage.de?subject=Thema%20der%20Woche%20%E2%80%93%20Vollversion%20anfragen"
    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
    title="E-Mail öffnen"
  >
    E-Mail für Anfragen zur Vollversion
    <span aria-hidden="true">✉</span>
  </a>
</div>

            <p className="mt-2 text-xs text-slate-500">
              Vielen Dank für Ihre Mitwirkung.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {/* Free bleibt normal klickbar */}
    <Link
  href="/start"
  className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
>
  <div className="flex items-start justify-between gap-3">
    <div className="text-base font-semibold text-slate-900">Kostenlose Version</div>

    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      PC · Android · Apple
    </span>
  </div>

  <div className="mt-3 text-sm text-slate-700">
    <div className="font-semibold text-slate-900">Funktionsumfang:</div>
    <ul className="mt-1 list-disc pl-5">
      <li>alle 41 Wochenthemen sichtbar</li>
      <li>4 von 41 Wochenthemen zur Auswahl</li>
      <li>4 von 41 Zitaten und Bildern sichtbar</li>
      <li>max. 2 Themen gleichzeitig auswählbar</li>
      <li>Kennzeichnung der genutzten Themen</li>
      <li>alle 4 Themen wiederverwendbar</li>
      <li>Startdatum festlegbar (jeweils Montags)</li>
      <li>20 Tagesimpulse (Mo–Fr) anwählbar</li>
    </ul>
  </div>
</Link>

            {/* Full bleibt sichtbar, aber deaktiviert */}
            <div
              className="block cursor-not-allowed rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm opacity-50"
              aria-disabled="true"
              title="In der Freeware ist Full deaktiviert."
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">Vollversion (Lizenz)</div>
                  <div className="mt-1 text-sm text-slate-700">deaktiviert in der kostenlosen Version - Anfragen zur Vollversion vorerst per E-Mail</div>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                  Vorschau
                </span>
              </div>

                            <div className="mt-3 text-sm text-slate-700">
                <div className="font-semibold">Funktionsumfang (Vollversion)</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Alle Inhalte: 41 Wochen-Themen, Bilder, Zitate und 205 Tagesimpulse</li>
                  <li>Freie Themenwahl manuell oder per Zufall</li>
                  <li>Startdatum festlegbar (Wochenstart jeweils am Montag)</li>
                  <li>Bereits genutzte Wochen-Themen werden gekennzeichnet</li>
                  <li>Gekennzeichneten Themen sind wiederverwendbar</li>
                  <li>Team-/Kalenderfunktionen (z.&nbsp;B. iCal) je nach Lizenz</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}