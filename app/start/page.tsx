'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [mode, setMode] = useState<AppMode>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const m = readMode();
    setMode(m);
    setReady(true);

    // Wenn noch keine Version gewählt wurde, zurück zur Auswahl
    if (m === null) router.replace('/version');
  }, [router]);

  if (!ready || mode === null) return null;

  const title = mode === 'free' ? 'Free-Version' : 'Full-Version';

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

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/themes"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">Themen auswählen</div>
              <div className="mt-1 text-sm text-slate-700">weiter zur Themenübersicht</div>
            </Link>

            <Link
              href="/setup"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">Setup starten</div>
              <div className="mt-1 text-sm text-slate-700">Wochenanzahl & Startdatum festlegen</div>
            </Link>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}
