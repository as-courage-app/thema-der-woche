"use client";

import { useEffect, useMemo, useState } from "react";

type Draft = {
  version: "1.0";
  weeksCount: number;
  startMonday: string; // YYYY-MM-DD
  mode: "random" | "manual";
  selectedThemeIds: string[];
  plan: Array<{ weekIndex: number; themeId: string; mondayDate: string }>;
  activeWeekIndex: number;
};

const STORAGE_KEY = "thema-der-woche:draft:v1";

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed?.version) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const d = loadDraft();
    setHasDraft(Boolean(d));
  }, []);

  return (
    <main className="min-h-screen">
      {/* Background Image */}
      <div
        className="relative min-h-screen bg-cover bg-center"
        style={{ backgroundImage: "url('/images/cover-01.jpg')" }}
      >
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Content */}
        <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-10">
          <div className="max-w-xl rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur-md md:p-8">
            <p className="text-sm font-medium tracking-wide text-neutral-600">
              Das Thema der Woche · 1. Edition
            </p>

            <h1 className="mt-2 text-3xl font-semibold leading-tight text-neutral-900 md:text-4xl">
              Jede Woche ein Fokus.
              <br />
              Jeden Tag ein Impuls.
            </h1>

            <p className="mt-4 text-base leading-relaxed text-neutral-700">
              Wähle die Anzahl der Wochen, entscheide dich für Zufall oder manuelle Themenwahl
              und starte an einem Montag. Die App merkt sich deine Planung lokal auf deinem Gerät.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Loslegen
              </a>

              {hasDraft ? (
                <a
                  href="/plan"
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                >
                  Letzte Planung fortsetzen
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-400"
                  title="Noch keine gespeicherte Planung gefunden"
                >
                  Fortsetzen (noch nichts gespeichert)
                </button>
              )}
            </div>

            <p className="mt-5 text-xs text-neutral-500">
              Hinweis: Speicherung via LocalStorage (nur auf diesem Gerät/Browser).
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
