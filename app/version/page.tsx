'use client';

import Link from 'next/link';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function VersionSelectPage() {
  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-slate-900">
            Thema der Woche <span className="text-slate-600">(Edition 1)</span>
          </h1>

          <p className="mt-2 text-sm text-slate-700">
            Bitte wähle aus, welche Version du nutzen möchtest.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/free"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold text-slate-900">
                Free
              </div>
              <div className="mt-1 text-sm text-slate-700">
                kostenlos
              </div>
            </Link>

            <Link
              href="/full"
                className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <div className="text-base font-semibold">
                Full
              </div>
              <div className="mt-1 text-sm opacity-90">
                mit Lizenz
              </div>
            </Link>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}
