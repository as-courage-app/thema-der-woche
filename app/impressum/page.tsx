'use client';

import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function ImpressumPage() {
  const router = useRouter();

  return (
    <BackgroundLayout>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-slate-900">Impressum</h1>

          <div className="mt-4 space-y-5 text-sm leading-6 text-slate-800">
            <div>
              <p className="font-semibold text-slate-900">as-courage - Andreas Sedlag</p>
              <p>freiberuflicher Kompetenztrainer und systemischer Coach</p>
            </div>

            <div>
              <p>Christianstr. 1</p>
              <p>29320 Hermannsburg</p>
              <p>Deutschland</p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">Kontakt:</p>
              <p>E-Mail: kontakt@as-courage.de</p>
              <p>Telefon: +49 (0) 5052 94696</p>
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG
              </p>
              <p>DE400748450</p>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Schließen
            </button>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}