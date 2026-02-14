'use client';

import { useEffect, useState } from 'react';
import BackgroundLayout from '../../components/BackgroundLayout';

const APP_MODE_KEY = 'as-courage.appMode.v1';

type AppMode = 'free' | 'full' | null;

function readMode(): AppMode {
  try {
    const v = localStorage.getItem(APP_MODE_KEY);
    if (v === 'free' || v === 'full') return v;
    return null;
  } catch {
    return null;
  }
}

export default function StartPage() {
  const [mode, setMode] = useState<AppMode>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMode(readMode());
    setReady(true);
  }, []);

  if (!ready) return null;

  const title =
    mode === 'free' ? 'Kostenlose Version' : mode === 'full' ? 'Vollversion' : 'Bitte Version wählen';

  const loginHint =
    mode === 'free'
      ? 'In der kostenlosen Version ist die Anmeldung deaktiviert.'
      : 'Anmeldung ist in der Vollversion vorgesehen (Feldtest: Platzhalter).';

  const loginTag = mode === 'free' ? 'deaktiviert' : 'Platzhalter';

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-slate-900">
            Thema der Woche <span className="text-slate-600">(Edition 1)</span>
          </h1>

          <div className="mt-2 text-sm text-slate-700">
            <span className="font-semibold">{title}</span>
          </div>

          {/* Anmeldeblock (sichtbar, aber im Feldtest deaktiviert) */}
          <div
            className={`mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
              mode === 'free' ? 'opacity-60' : ''
            }`}
            aria-disabled={mode === 'free'}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">Anmeldung</div>
                <div className="mt-1 text-sm text-slate-700">{loginHint}</div>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {loginTag}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="email"
                placeholder="E-Mail"
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
              <input
                type="password"
                placeholder="Passwort"
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </div>

            <button
              type="button"
              disabled
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Anmelden
            </button>
          </div>

          {/* Buttons darunter (wie gewünscht sichtbar) */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <a
              href="/themes"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">Themen auswählen</div>
              <div className="mt-1 text-sm text-slate-700">weiter zur Themenübersicht</div>
            </a>

            <a
              href="/setup"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">Setup starten</div>
              <div className="mt-1 text-sm text-slate-700">Wochenanzahl &amp; Startdatum festlegen</div>
            </a>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}