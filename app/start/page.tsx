'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
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

  const [hasSession, setHasSession] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    setMode(readMode());
    setReady(true);
  }, []);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const email = data?.session?.user?.email ?? null;
      setHasSession(Boolean(data?.session));
      setSessionEmail(email);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setHasSession(Boolean(session));
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  if (!ready) return null;

  const title =
    mode === 'free' ? 'Kostenlose Version' : mode === 'full' ? 'Vollversion' : 'Bitte Version wählen';

  // In der kostenlosen Version ist Login deaktiviert.
  // In der Vollversion sollen Themen/Setup nur nach Anmeldung nutzbar sein.
  const canUseThemesSetup = mode === 'free' ? true : hasSession;

  const loginHint =
    mode === 'free'
      ? 'In der kostenlosen Version ist die Anmeldung deaktiviert.'
      : hasSession
        ? `Du bist angemeldet${sessionEmail ? ` als ${sessionEmail}` : ''}.`
        : 'Bitte melde dich an, um „Themen“ und „Setup“ zu nutzen.';

  const loginTag = mode === 'free' ? 'deaktiviert' : hasSession ? 'angemeldet' : 'nicht angemeldet';

  const topBtnBase =
    'rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';

  const topBtnEnabled =
    `${topBtnBase} cursor-pointer hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400`;

  const topBtnDisabled = `${topBtnBase} opacity-50 cursor-not-allowed`;

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          {/* Kopfzeile: Titel links, Schalt-Buttons rechts */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Thema der Woche <span className="text-slate-600">(Edition 1)</span>
              </h1>

              <div className="mt-2 text-sm text-slate-700">
                <span className="font-semibold">{title}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {canUseThemesSetup ? (
                <>
                  <Link href="/themes" className={topBtnEnabled} title="Zur Themenübersicht">
                    Themen
                  </Link>
                  <Link href="/setup" className={topBtnEnabled} title="Setup starten">
                    Setup
                  </Link>
                </>
              ) : (
                <>
                  <span className={topBtnDisabled} aria-disabled="true" title="Bitte erst anmelden">
                    Themen
                  </span>
                  <span className={topBtnDisabled} aria-disabled="true" title="Bitte erst anmelden">
                    Setup
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Anmeldeblock (wie bisher – in free deaktiviert) */}
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
        </section>
      </main>
    </BackgroundLayout>
  );
}