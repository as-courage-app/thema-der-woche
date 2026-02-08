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

          <div className="mt-2 text-sm text-slate-700">
            Bitte wähle deine Version:
          </div>

          {/* Feldtest-Hinweis (temporär) */}
<div className="mt-4 rounded-2xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-700 shadow-sm backdrop-blur">
  <div className="font-semibold text-slate-900">Feldtest-Hinweis</div>

  <p className="mt-2">
    Danke fürs Testen! Bitte gib kurzes Feedback zu Bedienung, Darstellung und Inhalt.
    Wenn etwas hakt: Screenshot machen, kurz beschreiben, fertig. 😊
  </p>

  <div className="mt-3">
    <a
      href="https://forms.gle/5hVJ7qVBfsgSd1EBA"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
    >
      Zum Auswertebogen (Google Formular)
      <span aria-hidden="true">↗</span>
    </a>
  </div>

  <p className="mt-2 text-xs text-slate-500">
    (Dieser Hinweis ist nur vorübergehend und hat keine Auswirkung auf die Funktionen.)
  </p>
</div>


          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/free"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">Free</div>
              <div className="mt-1 text-sm text-slate-700">kostenlos (dauerhaft)</div>
            </Link>

            <Link
              href="/full"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">Full</div>
              <div className="mt-1 text-sm text-slate-700">mit Lizenz (nach Ende des Feldtests)</div>
            </Link>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}
