'use client';

import { useState } from 'react';

type DetailsViewerProps = {
  standardSrc: string;
  detailSrc: string;
  themeNumber: string;
};

export default function DetailsViewer({
  standardSrc,
  detailSrc,
  themeNumber,
}: DetailsViewerProps) {
  const [activeView, setActiveView] = useState<'none' | 'kurz' | 'lang'>('none');

  if (activeView === 'kurz') {
    return (
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <div className="inline-block rounded-xl bg-white px-3 py-1 shadow-sm">
            <h2 className="text-lg font-semibold">Kurzversion</h2>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('none')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100 hover:border-slate-400 hover:shadow-md transition-all"
          >
            zurück zur Vorschau
          </button>
        </div>

        <iframe
          src={standardSrc}
          title={`Kurzversion Thema ${themeNumber}`}
          className="h-[900px] w-[calc(100vw-2rem)] max-w-none rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </section>
    );
  }

  if (activeView === 'lang') {
    return (
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <div className="inline-block rounded-xl bg-white px-3 py-1 shadow-sm">
            <h2 className="text-lg font-semibold">Langversion</h2>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('none')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100 hover:border-slate-400 hover:shadow-md transition-all"
          >
            zurück zur Vorschau
          </button>
        </div>

        <iframe
          src={detailSrc}
          title={`Langversion Thema ${themeNumber}`}
          className="h-[900px] w-[calc(100vw-2rem)] max-w-none rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </section>
    );
  }

  return (
    <section className="mt-8 grid gap-4 md:grid-cols-2">
      <button
        type="button"
        onClick={() => setActiveView('kurz')}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-100 hover:border-slate-400 hover:shadow-md transition-all"
      >
        <div className="inline-block rounded-xl bg-white px-3 py-1 shadow-sm">
          <h2 className="text-lg font-semibold">Kurzversion</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Anklicken zum Öffnen
        </p>
      </button>

      <button
        type="button"
        onClick={() => setActiveView('lang')}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-100 hover:border-slate-400 hover:shadow-md transition-all"
      >
        <div className="inline-block rounded-xl bg-white px-3 py-1 shadow-sm">
          <h2 className="text-lg font-semibold">Langversion</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Anklicken zum Öffnen
        </p>
      </button>
    </section>
  );
}