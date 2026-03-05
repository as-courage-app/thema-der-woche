'use client';

import { useEffect, useState } from 'react';

type InfoButtonProps = {
  className?: string;
};

export default function InfoButton({ className = '' }: InfoButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const btnClass =
    className ||
    'cursor-pointer rounded-xl bg-white/90 w-11 h-11 flex items-center justify-center text-2xl leading-none shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={btnClass}
        aria-label="Info öffnen"
        title="Info"
      >
        ℹ️
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onMouseDown={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Kopf (fix) */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Info</h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-100"
                aria-label="Schließen"
                title="Schließen"
              >
                ✕
              </button>
            </div>

            {/* Inhalt (scrollt bei Bedarf) */}
            <div className="p-5 max-h-[70vh] overflow-auto">
              <div className="text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Anwendungsbeispiel (5 Minuten)</p>
                <br />
                Montag im Team-Meeting: Die Teamleitung zeigt das Wochenthema, liest den Tagesimpuls vor und lädt zu 1 – 2 Minuten Nachdenken oder Murmeln ein. Dann geben Freiwillige eine Antwort ohne Bewertungen der Zuhörenden. Ergebnis: gemeinsame Orientierung, mehr Zuhören, weniger Missverständnisse.

              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 max-h-[40vh] overflow-auto">
                <p className="font-semibold text-slate-900">So funktioniert es</p>
                <ul className="mt-2 list-disc pl-5">
                  <li>Anzahl der Wochen festlegen</li>
                  <li>Wochenthemen in der Anzahl auswählen</li>
                  <li>Auswahl manuell oder per Zufall</li>
                  <li>Reihenfolge kann geändert werden</li>
                  <li>Empfehlung: 4 Wochen auswählen</li>
                  <li>Start-Montag festlegen</li>
                  <li>pro Wochentag eine Frage</li>
                  <li>freiwilig niedrigschwellig, ohne Bewertung</li>
                  <li>eigene Notizen anlegen, speichern und drucken (in Variante B und C)</li>
                  <li>optional iCal als Teamkalender (nur Variante C verfügbar) laden</li>
                  <br />
                  <li>Als Gesprächseinstieg</li>
                  <li>Check-In am Anfang im Team-Meeting</li>
                  <li>30 Sek. Stille aushalten</li>
                  <li>freiwillige Antworten unkommentiert lassen</li>
                  <li>mehr Zuhören = weniger Missverständnisse</li>
                </ul>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-xl bg-[#F29420] px-4 py-2 text-2xl font-semibold text-white leading-none transition hover:shadow-lg hover:bg-[#E4891E]"
                  aria-label="Schließen"
                  title="Schließen"
                >
                  ℹ️
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}