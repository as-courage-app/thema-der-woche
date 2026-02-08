'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../components/BackgroundLayout';

const FULL_LANDING_URL = process.env.NEXT_PUBLIC_FULL_LANDING_URL; // später: Shop-Landingpage

export default function HomePage() {
  const router = useRouter();

  function goFree() {
    router.push('/free');
  }

  function goFull() {
    // Später öffentlich: direkt in den Shop (wenn env gesetzt ist)
    if (FULL_LANDING_URL && FULL_LANDING_URL.startsWith('http')) {
      window.location.href = FULL_LANDING_URL;
      return;
    }
    // Für Feldtest / handverlesene Tester*innen:
    router.push('/full');
  }

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              Thema der Woche <span className="text-slate-600">(Edition 1)</span>
            </h1>
            <p className="text-sm text-slate-700">
              Bitte wähle aus, welche Version du nutzen möchtest.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={goFree}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">Free</div>
              <div className="mt-1 text-sm text-slate-700">kostenlos</div>
            </button>

            <button
              type="button"
              onClick={goFull}
              className="w-full rounded-2xl border border-slate-900 bg-slate-900 px-4 py-4 text-left text-white shadow-sm transition hover:opacity-95"
            >
              <div className="text-base font-semibold">Full</div>
              <div className="mt-1 text-sm opacity-90">mit Lizenz</div>
            </button>
          </div>

          <p className="mt-5 text-xs text-slate-600">
            Hinweis: „Full“ kann später automatisch zur Shop-Landingpage führen.
          </p>
        </section>
      </main>
    </BackgroundLayout>
  );
}
