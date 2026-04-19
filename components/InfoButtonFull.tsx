'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type InfoButtonProps = {
  className?: string;
};


type InfoItem = {
  title: string;
  summary?: ReactNode;
  body: ReactNode;
};

const RAW_INFO_ITEMS: InfoItem[] = [
  {
    title: 'Änderung der Reihenfolge (Themenauswahl)',
    body: (
      <>
        <p className="font-semibold text-slate-900">Änderung der Reihenfolge</p>
        <p className="mt-1">
          Mit diesen Pfeilen verschiebst du ausgewählte Themen nach oben oder
          unten. Die dunkleren Button sind jeweils aktiv anwählbar.
        </p>

        <div className="mt-2 grid w-fit grid-cols-2 gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8D9AE] text-[#D1B187] ring-1 ring-[#F1D2AA]">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 fill-current"
            >
              <polygon points="12,7 18,17 6,17" />
            </svg>
          </span>

          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#F29420] text-slate-900 shadow-md ring-1 ring-orange-200">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 fill-current rotate-180"
            >
              <polygon points="12,7 18,17 6,17" />
            </svg>
          </span>

        </div>
      </>
    ),
  },
  {
    title: 'Anwendungsbeispiele',
    body: (
      <div className="space-y-0">
        <div className="leading-5">
          <p className="font-semibold text-slate-900">Leichter Smalltalk</p>
          <p className="mt-1">
            Für kurze Gespräche zwischendurch, zum Beispiel in Pausen oder an der
            Kaffeemaschine.
          </p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-900">Nutzen:</span> mehr
            Kontakt und ein freundlicher Einstieg.
          </p>
        </div>

        <div className="mt-4 border-t-2 border-slate-300 pt-4 leading-5">
          <p className="font-semibold text-slate-900">
            1:1-Gespräch mit ehrlichem Interesse
          </p>
          <p className="mt-1">
            Das Thema kann bewusst in ein Einzelgespräch eingebracht werden, mit
            Offenheit, Zuhören und einer wertschätzenden Haltung.
          </p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-900">Nutzen:</span> mehr
            Vertrauen, mehr Verständnis und ein echterer Austausch.
          </p>
        </div>

        <div className="mt-4 border-t-2 border-slate-300 pt-4 leading-5">
          <p className="font-semibold text-slate-900">
            Einstieg ins Team-Meeting
          </p>
          <p className="mt-1">
            Als kurzer Impuls zu Beginn eines Treffens, mit freiwilligen Antworten.
          </p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-900">Nutzen:</span> ruhiger Start, mehr Beteiligung, besseres Zuhören.
          </p>
        </div>

        <div className="mt-4 border-t-2 border-slate-300 pt-4 leading-5">
          <p className="font-semibold text-slate-900">
            Auch remote einsetzbar      </p>
          <p className="mt-1">
            Nutzbar in Videokonferenzen, Chats oder digitalen Teamräumen.
          </p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-900">Nutzen:</span> mehr Verbindung trotz Distanz.      </p>
        </div>

        <div className="mt-4 border-t-2 border-slate-300 pt-4 leading-5">
          <p className="font-semibold text-slate-900">
            Zur Selbstreflexion
          </p>
          <p className="mt-1">
            Zum Innehalten, Nachdenken und inneren Ausrichten.
          </p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-900">Nutzen:</span> Klarheit und Festigung eigener Gedanken.      </p>
        </div>

        <div className="mt-4 border-t-2 border-slate-300 pt-4 leading-5">
          <p className="font-semibold text-slate-900">
            Gesamtnutzen
          </p>
          <p className="mt-1">
            Einfache Impulse für Austausch, Reflexion und ein wertschätzendes Miteinander.      </p>
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={(e) => {
              const details = e.currentTarget.closest('details');

              if (!(details instanceof HTMLDetailsElement)) {
                return;
              }

              const summary = details.querySelector('summary');

              details.removeAttribute('open');

              requestAnimationFrame(() => {
                if (summary instanceof HTMLElement) {
                  summary.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }
              });
            }}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm"
            aria-label="Anwendungsbeispiele schließen"
            title="Schließen"
          >
            <span aria-hidden="true">▲</span>
            <span>Schließen</span>
          </button>
        </div>

      </div>
    ),
  },
  {
    title: 'Anzahl Wochen (Themenauswahl)',
    body: (
      <>
        <div className="w-full max-w-xs rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-700">Anzahl Wochen</p>

          <div className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 shadow-sm">
            2
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Pro Woche: Mo–Fr (5 Tagesimpulse).
          </p>
        </div>

        <p className="mt-2">
          Hier legst du fest, für wie viele Wochen nacheinander Themen ausgewählt
          werden sollen. Die Anzahl ist jederzeit veränderbar. In der
          <span className="font-semibold text-slate-900"> kostenlosen</span>{' '} Version sind 1 oder 2 Wochen auswählbar.
          In den <span className="font-semibold text-slate-900">Vollversionen</span>{' '} sind bis zu 41 Wochen auswählbar.
        </p>
      </>
    ),
  },
  {
    title: 'Auswahl löschen (Themenauswahl)',
    body: (
      <>
        <span className="inline-flex min-h-[32px] items-center rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          Auswahl löschen
        </span>

        <p className="mt-1">
          Damit entfernst du deine bisherige Themenauswahl. Danach kannst du neu
          starten und deine Auswahl neu aufbauen.
        </p>

        <div className="mt-2">

        </div>
      </>
    ),
  },
  {
    title: 'Details (Zitate & Tagesimpulse)',
    body: (
      <>
        <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          <span aria-hidden="true">📘</span>
          <span>Details</span>
        </span>

        <p className="mt-1">
          Über den Button Details {' '}
          <span className="font-semibold text-slate-900">(Variante B und C)</span>{' '} kommst du zu drei weiteren Unterpunkten zum ausgewählten Thema.
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            <span aria-hidden="true">🖼️</span>
            <span>Infografik</span>
          </span>

          <p className="mt-1">
            Hier öffnest du eine KI-generierte Infografik zum download und ausdrucken.
          </p>

          <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            <span aria-hidden="true">📄</span>
            <span>Kurzversion</span>
          </span>

          <p className="mt-1">
            Mit der Kurzversion öffnest du eine kurze Übersicht zum jeweiligen Thema, <br />
            die du herunterladen und ausdrucken kannst.
          </p>

          <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            <span aria-hidden="true">📑</span>
            <span>Langversion</span>
          </span>

          <p className="mt-1">
            Mit der Langversion öffnest du eine umfassende Übersicht zum jeweiligen Thema, <br />
            die du herunterladen und ausdrucken kannst.
          </p>


        </div>
      </>
    ),
  },
  {
    title: 'Teamkalender (Standard) (Themenauswahl)',
    body: (
      <>
        <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#4EA72E] bg-[#F6FBF4] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm">
          <span aria-hidden="true">⬇️</span>
          <span>Teamkalender herunterladen (Standard)</span>
        </span>

        <p className="mt-2">
          Der Teamkalender ist der zentrale Standardkalender der App. Er basiert auf deiner Themenauswahl, der festgelegten Anzahl an Wochen und dem gewählten Startdatum. So werden Themen, Zitate und Tagesimpulse für den ausgewählten Zeitraum als Kalender vorbereitet.
        </p>

        <p className="mt-2">
          <span className="font-semibold text-slate-900">Standard</span> bedeutet:
          Dieser Teamkalender ist noch im Originalzustand und wurde noch nicht bearbeitet oder ergänzt.
        </p>
      </>
    ),
  },

  {
    title: 'Teamkalender + herunterladen (Editor)',
    body: (
      <>
        <span className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#A61E2D] px-4 py-2 text-sm font-semibold text-white shadow-sm">
          <span aria-hidden="true">⬇️</span>
          <span>Teamkalender + herunterladen</span>
        </span>

        <p className="mt-2">
          Dieser Button lädt den <span className="font-semibold text-slate-900">Teamkalender +</span> herunter.
        </p>

        <p className="mt-2">
          <span className="font-semibold text-slate-900">Teamkalender +</span> bedeutet:
          Der ursprüngliche Standard-Teamkalender wurde im Editor bearbeitet und/oder durch Zusatztermine ergänzt.
        </p>

      </>
    ),
  },

  {
    title: 'Editor (Teamkalender) einblenden oder ausblenden',
    body: (
      <>
        <span className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#A61E2D] px-4 py-2 text-sm font-semibold text-white shadow-sm">
          <span aria-hidden="true">✏️</span>
          <span>Editor einblenden oder ausblenden</span>
        </span>

        <p className="mt-2">
          Mit diesem Button blendest du den <span className="font-semibold text-slate-900">Editor für den Zusatzkalender</span>{' '}
          ein oder aus. Hier kannst du Änderungen am Standard-Teamkalender vornehmen und Zusatzkalender einbinden.
        </p>
      </>
    ),
  },

  {
    title: 'Zusatzkalender',
    body: (
      <>

        <span className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#A61E2D] px-4 py-2 text-sm font-semibold text-white shadow-sm">
          <span>Zusatzkalender auswählen</span>
        </span>

        <p className="mt-2">
          Zusatzkalender ergänzen den Teamkalender um weitere Termine, zum Beispiel
          Ferien, Feiertage oder andere zusätzliche Einträge.
        </p>

        <p className="mt-2">
          Eingelesen werden derzeit <span className="font-semibold text-slate-900">Zusatzkalender im ICS-/iCal-Format (.ics)</span>.
          Diese Dateien müssen vorher aus dem Internet heruntergeladen und lokal auf
          diesem Gerät gespeichert werden.
        </p>

        <p className="mt-2">
          Zusatztermine bleiben eigenständige Kalendereinträge und werden nicht mit
          Zitaten oder Tagesimpulsen vermischt.
        </p>

        <p className="mt-2">
          Im Editor kannst du Zusatzkalender einblenden, prüfen und bei Bedarf einzelne Ereignisse oder alle Termine übernehmen.
        </p>
      </>
    ),
  },

  {
    title: 'Modus (Themenauswahl)',
    body: (
      <>
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Modus</p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <span className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-[#F29420] bg-[#FFF3E8] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm">
              Manuell
            </span>

            <span className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm">
              Zufall
            </span>
          </div>
        </div>

        <p className="mt-2">
          Hier entscheidest du, ob du deine Themen
          <span className="font-semibold text-slate-900"> manuell</span>{' '}
          oder per
          <span className="font-semibold text-slate-900"> Zufall</span>{' '}
          auswählen möchtest. In der{' '}
          <span className="font-semibold text-slate-900">kostenlosen Version</span>{' '}
          stehen dir 4 von 41 Themen zur Auswahl. In den{' '}
          <span className="font-semibold text-slate-900">
            Varianten A, B und C
          </span>{' '}
          stehen dir alle Themen zur Verfügung.
        </p>
      </>
    ),
  },
  {
    title: 'Mediathek (Zitate & Tagesimpulse)',
    body: (
      <>
        <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          <span aria-hidden="true">🎞️</span>
          <span>Mediathek</span>
        </span>

        <p className="mt-1">
          Hier findest du ergänzende Medieninhalte, mit denen du Themen auditiv
          oder visuell vertiefen kannst.
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            <span aria-hidden="true">🎧</span>
            <span>Podcast</span>
          </span>

          <p className="mt-1">
            Hier kannst du dir den Audioinhalt zum aktuellen Thema anhören.
            Das ist praktisch für unterwegs oder als ruhiger Zusatzimpuls.
          </p>

          <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
            <span aria-hidden="true">🎬</span>
            <span>Video</span>
          </span>

          <p className="mt-1">
            Hier findest du ergänzende KI-generierte Videoinhalte.
            Sie können helfen, ein Thema anschaulicher und lebendiger zu verstehen.
          </p>

        </div>
      </>
    ),
  },
  {
    title: 'Nächster Montag (Themenauswahl)',
    body: (
      <>
        <span className="inline-flex min-h-[32px] items-center rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          Nächster Montag
        </span>

        <p className="mt-1">
          Damit legst du das Startdatum auf den nächsten kommenden Montag fest. Du kannst auch manuell einen anderen Start-Montag festlegen.
        </p>

        <div className="mt-2">

        </div>
      </>
    ),
  },
  {
    title: 'Notizen (Zitate & Tagesimpulse)',
    body: (
      <>
        <span className="inline-flex min-h-[32px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          <span aria-hidden="true">📝</span>
          <span>Notizen</span>
        </span>

        <p className="mt-1">
          Hier kannst du eigene Gedanken, Beobachtungen oder Ideen zum Thema
          festhalten. So wird aus einem Impuls schneller ein eigener
          Arbeitsstand. Die Notizen werden beim Schließen automatisch gespeichert.
          Du kannst aber auch in eigenen Ordnern speichern sowie löschen und ausdrucken.
        </p>

        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
          <span className="font-semibold text-slate-900">Wichtig:</span> Notizen
          werden automatisch ausschließlich lokal im Browser auf diesem Gerät gespeichert.
          Es erfolgt <span className="font-semibold text-slate-900">keine</span> automatische Übertragung an eine Cloud oder Datenbank.
        </p>
      </>
    ),
  },

  {
    title: 'Themen (Themenauswahl)',
    body: (
      <>
        <div className="w-full rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">
              Themen (alphabetisch)
            </p>
            <p className="text-right text-xs text-slate-500">
              Auswahl vollständig
              <br />
              (weitere Auswahl deaktiviert)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#0F1B44] p-3 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <span className="h-10 w-16 rounded-lg bg-gradient-to-br from-sky-100 to-amber-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    Anerkennung 1
                  </p>
                </div>
              </div>

              <div className="mt-0 flex items-center justify-end gap-2">
                <span className="inline-flex items-center rounded-full bg-[#FFF3D6] px-2 py-0.5 text-xs font-medium text-[#9A5A00]">
                  genutzt
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-sm">
                  ✓
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-400">
              <div className="flex items-center gap-3">
                <span className="h-10 w-16 rounded-lg bg-slate-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Belastung</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-400">
              <div className="flex items-center gap-3">
                <span className="h-10 w-16 rounded-lg bg-slate-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    Diskriminierung
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0F1B44] p-3 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <span className="h-10 w-16 rounded-lg bg-gradient-to-br from-rose-100 to-stone-200" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Ehrlichkeit</p>
                </div>
              </div>

              <div className="mt-0 flex items-center justify-end gap-2">
                <span className="inline-flex items-center rounded-full bg-[#FFF3D6] px-2 py-0.5 text-xs font-medium text-[#9A5A00]">
                  genutzt
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/30 text-sm">
                  ✓
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2">
          Hier wählst du deine Themen aus. Bereits ausgewählte Themen werden
          deutlich hervorgehoben. Wenn die gewählte <span className="font-semibold text-slate-900">Anzahl Wochen</span>{' '} erreicht ist,
          wird die weitere Auswahl deaktiviert. Beim nachträglichen Ändern der
          <span className="font-semibold text-slate-900"> Anzahl Wochen</span>{' '}
          werden bereits gewählte Themen deaktiviert oder weitere freigegeben.
          Bereits genutzte Themen werden mit dem Hinweis <span className="font-semibold text-slate-900">genutzt</span>{' '} gekennzeichent. Diese Kennzeichnung
          kann jederzeit wieder gelöscht werden.
        </p>
      </>
    ),
  },
  {
    title: 'Weiter (Themenauswahl) + (Zitate & Tagesimpulse)',
    body: (
      <>
        <div className="space-y-3">
          <div>
            <span className="inline-flex items-center rounded-lg bg-[#4EA72E] px-3 py-1 text-sm font-semibold text-white">
              Weiter
            </span>
            <p className="mt-1">
              Mit dem grünen Weiter-Button auf der Seite <span className="font-semibold text-slate-900">Themenauswahl</span>{' '}
              springst du auf die Seite <span className="font-semibold text-slate-900"><br />
                Zitate &amp; Tagesimpulse</span>.
            </p>
          </div>

          <div>
            <span className="inline-flex items-center rounded-xl border border-[#4EA72E] bg-[#F6FBF4] px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
              Weiter
            </span>
            <p className="mt-1">
              Mit dem Weiter-Button auf der Seite <span className="font-semibold text-slate-900">Zitate &amp; Tagesimpulse</span>{' '}
              springst du ein Thema weiter.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    title: 'zum Upgrade (mehrere Seiten)',
    body: (
      <>
        <span className="inline-flex min-h-[32px] items-center rounded-xl border-2 border-[#F29420] bg-[#FFF3E8] px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          zum Upgrade
        </span>

        <p className="mt-2">
          Hier findest du den Weg zu der Seite, wo du alle Vollversionen auswählen kannst.<br />
          Damit bekommst du bei Bedarf weitere Funktionen der Vollversion.
        </p>
      </>
    ),
  },
  {
    title: 'Zufall (Themenauswahl)',
    body: (
      <>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-[32px] items-center rounded-xl border-2 border-[#F29420] bg-[#FFF3E8] px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
            Zufall
          </span>
        </div>

        <p className="mt-2">
          Mit <span className="font-semibold text-slate-900">Zufall</span>{' '}
          wird die passende Anzahl an Themen sofort automatisch ausgelost.
          Die Auswahl kannst du mit den Pfeiltasten in der Reihenfolge anpassen.
        </p>

        <p className="mt-2">
          Über <span className="font-semibold text-slate-900">Auswahl aufheben</span>{' '}
          kannst du die Auswahl zurücksetzen. Danach kannst du mit einem erneuten Klick auf{' '}
          <span className="font-semibold text-slate-900">Zufall</span>{' '}
          direkt neu auslosen.
        </p>
      </>
    ),
  },
  {
    title: 'zurück (mehrere Seiten)',
    body: (
      <>
        <span className="inline-flex min-h-[32px] items-center rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
          zurück
        </span>

        <p className="mt-2">
          Je nachdem, auf welcher Seite du dich befindest, leitet dieser Button
          eine Seite zurück oder zur Begrüßungsseite mit der Auswahl zur
          kostenlosen oder Vollversion.
        </p>
      </>
    ),
  },
];

export default function InfoButtonFull({ className = '' }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFarblogikOpen, setIsFarblogikOpen] = useState(false);

  const infoItems = useMemo(() => {
    return [...RAW_INFO_ITEMS].sort((a, b) =>
      a.title.localeCompare(b.title, 'de', { sensitivity: 'base' })
    );
  }, []);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredExampleItems = infoItems.filter(
    (item) =>
      item.title === 'Anwendungsbeispiele' &&
      item.title.toLowerCase().includes(normalizedSearchTerm)
  );

  const filteredFunctionItems = infoItems.filter(
    (item) =>
      item.title !== 'Anwendungsbeispiele' &&
      item.title.toLowerCase().includes(normalizedSearchTerm)
  );

  const showFarblogik =
    normalizedSearchTerm === '' ||
    [
      'farblogik',
      'farbe',
      'farben',
      'orange',
      'grün',
      'gruen',
      'rot',
      'orientierung',
      'themenauswahl',
      'anzahl wochen',
      'startdatum',
      'hauptseite',
      'themen',
      'zitate',
      'tagesimpulse',
      'editor',
      'zusatzkalender',
    ].some((entry) => entry.includes(normalizedSearchTerm));

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const buttonClasses = [
    'fixed z-[70] flex h-11 w-11 items-center justify-center rounded-xl text-2xl leading-none shadow-md transition focus:outline-none focus-visible:ring-2',
    className ||
    'cursor-pointer bg-white/90 text-slate-900 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus-visible:ring-slate-900',
  ].join(' ');

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={buttonClasses}
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 5.5rem)',
          right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        }}
        aria-label="Info Vollversion öffnen"
        title="Info Vollversion"
      >
        ℹ️
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-dialog-title"
        >
          <div
            className="absolute inset-0 bg-black/35"
            onMouseDown={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 id="info-dialog-title" className="text-xl font-semibold text-slate-900">
                  Info Vollversion
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Hier findest du kurze Erklärungen zu den wichtigsten Funktionen sowie eine Infosuche.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg px-2 py-1 text-slate-700 transition hover:bg-slate-100"
                aria-label="Schließen"
                title="Schließen"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-5">
              <div className="rounded-xl border-2 border-[#F29420] bg-white p-4 text-sm leading-6 text-slate-900">
                <p className="text-lg font-semibold text-slate-900">Kurzer Hinweis</p>
                <p className="mt-2">
                  Tippe oder klicke auf einen Begriff, um die passende Erklärung zu öffnen.
                  Die Liste ist alphabetisch sortiert. Der Text in den Klammern weist auf die Seite hin,
                  auf der die Funktion verfügbar ist. Die dargestellten beschrifteten Button dienen zur Orientierung
                  und haben hier keine weitere Funktion.
                </p>
              </div>

              <>
                {filteredExampleItems.map((item) => (
                  <div key={item.title} className="mt-4">
                    <details className="rounded-xl border border-slate-200 bg-white">
                      <summary className="cursor-pointer rounded-xl px-4 py-3 font-semibold text-slate-900">
                        {item.summary ?? item.title}
                      </summary>
                      <div className="px-4 pb-4 text-sm leading-6 text-slate-700">
                        {item.body}
                      </div>
                    </details>
                  </div>
                ))}

                {showFarblogik ? (
                  <details className="mt-4 rounded-xl border border-slate-200 bg-white">
                    <summary className="cursor-pointer rounded-xl px-4 py-3 font-semibold text-slate-900">
                      Farblogik
                    </summary>

                    <div className="px-4 pb-4 text-sm text-slate-700">
                      <p className="leading-6">
                        Die App nutzt drei Leitfarben zur besseren Orientierung.
                      </p>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-11 w-24 shrink-0 items-center justify-center rounded-xl bg-[#F29420] text-sm font-semibold text-slate-900 shadow-sm">
                            Orange
                          </span>
                          <p className="pt-2 leading-6">
                            steht für Orientierung, Themenauswahl, Anzahl Wochen und Startdatum.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-11 w-24 shrink-0 items-center justify-center rounded-xl bg-[#4EA72E] text-sm font-semibold text-white shadow-sm">
                            Grün
                          </span>
                          <p className="pt-2 leading-6">
                            kennzeichnet die Hauptseite mit Themen, Zitaten und Tagesimpulsen.
                          </p>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-11 w-24 shrink-0 items-center justify-center rounded-xl bg-[#990000] text-sm font-semibold text-white shadow-sm">
                            Rot
                          </span>
                          <p className="pt-2 leading-6">
                            steht für den Editor des Zusatzkalenders.
                          </p>
                        </div>
                      </div>
                    </div>
                  </details>
                ) : null}

                <div className="mt-5 rounded-xl border-2 border-[#F29420] bg-white p-4 text-sm leading-6 text-slate-900">
                  <p className="text-lg font-semibold text-slate-900">Funktionen der App</p>

                  <div className="mt-4">
                    <label htmlFor="info-search" className="block text-lg font-semibold text-slate-900">
                      Infosuche
                    </label>
                    <input
                      id="info-search"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Begriff eingeben, zum Beispiel Notizen oder Teamkalender"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">

                  {filteredFunctionItems.map((item) => (
                    <details
                      key={item.title}
                      className="rounded-xl border border-slate-200 bg-white"
                    >
                      <summary className="cursor-pointer rounded-xl px-4 py-3 font-semibold text-slate-900">
                        {item.title}
                      </summary>
                      <div className="px-4 pb-4 text-sm leading-6 text-slate-700">
                        {item.body}
                      </div>
                    </details>
                  ))}
                </div>
              </>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[#F29420] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E4891E] hover:shadow-lg"
                  aria-label="Info Vollversion schließen"
                  title="Schließen"
                >
                  <span aria-hidden="true" className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9" />
                      <path d="M10 17l5-5-5-5" />
                      <path d="M15 12H7" />
                    </svg>
                  </span>
                  <span>Schließen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}