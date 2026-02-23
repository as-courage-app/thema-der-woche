'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import BackgroundLayout from '@/components/BackgroundLayout';
import RequireAuth from '@/components/RequireAuth';
import edition1 from '@/app/data/edition1.json';
import { useSearchParams } from 'next/navigation';

type DayKey = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr';

const DEFAULT_QUESTIONS: Record<DayKey, string> = {
  Mo: 'Frage 1 folgt…',
  Di: 'Frage 2 folgt…',
  Mi: 'Frage 3 folgt…',
  Do: 'Frage 4 folgt…',
  Fr: 'Frage 5 folgt…',
};

function NotizenContent() {
  const searchParams = useSearchParams();
  const themeIdFromUrl = searchParams.get('themeId');

  const [note, setNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [temaLabel, setTemaLabel] = useState('Thema');
  const [quote, setQuote] = useState('Zitat folgt…');
  const [questions, setQuestions] =
    useState<Record<DayKey, string>>(DEFAULT_QUESTIONS);

  const LS_NOTE_KEY = 'as-courage.notes.v1';

  // Notiz lokal laden
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_NOTE_KEY);
      if (v) setNote(v);
    } catch {}
  }, []);

  // Notiz lokal speichern
  useEffect(() => {
    try {
      localStorage.setItem(LS_NOTE_KEY, note);
    } catch {}
  }, [note]);

  // Thema / Zitat / Fragen aus Setup + Edition laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem('as-courage.themeSetup.v1');
      if (!raw) return;

      const setup: any = JSON.parse(raw);

      const activeThemeId =
        themeIdFromUrl ??
        (Array.isArray(setup?.themeIds) ? setup.themeIds[0] : null);

      const themeIdOrNr =
        activeThemeId ??
        setup?.selectedThemeId ??
        setup?.themeId ??
        setup?.theme?.id ??
        setup?.selectedTheme?.id;

      const themes: any[] =
        (edition1 as any)?.themes ??
        (edition1 as any)?.data ??
        (edition1 as any) ??
        [];

      const found: any =
        themes.find((t) => t?.id === themeIdOrNr) ||
        themes.find((t) => t?.nr === themeIdOrNr) ||
        themes.find((t) => t?.number === themeIdOrNr) ||
        themes.find((t) => String(t?.id) === String(themeIdOrNr)) ||
        themes.find((t) => String(t?.nr) === String(themeIdOrNr)) ||
        themes.find((t) => String(t?.number) === String(themeIdOrNr));

      if (!found) return;

      const label =
        String(
          found?.title ??
            found?.name ??
            found?.thema ??
            found?.label ??
            found?.id ??
            'Thema'
        ) || 'Thema';

      const zitat = found?.quote ?? found?.zitat ?? found?.Zitat ?? 'Zitat folgt…';

      const q =
        found?.questions ??
        found?.impulses ??
        found?.tagesimpulse ??
        found?.days ??
        found?.weekdays ??
        null;

      const nextQuestions: Record<DayKey, string> = { ...DEFAULT_QUESTIONS };

      if (Array.isArray(q)) {
        nextQuestions.Mo = q[0] ?? nextQuestions.Mo;
        nextQuestions.Di = q[1] ?? nextQuestions.Di;
        nextQuestions.Mi = q[2] ?? nextQuestions.Mi;
        nextQuestions.Do = q[3] ?? nextQuestions.Do;
        nextQuestions.Fr = q[4] ?? nextQuestions.Fr;
      } else if (q && typeof q === 'object') {
        nextQuestions.Mo =
          (q as any).Mo ?? (q as any).mo ?? (q as any).monday ?? nextQuestions.Mo;
        nextQuestions.Di =
          (q as any).Di ??
          (q as any).di ??
          (q as any).tuesday ??
          nextQuestions.Di;
        nextQuestions.Mi =
          (q as any).Mi ??
          (q as any).mi ??
          (q as any).wednesday ??
          nextQuestions.Mi;
        nextQuestions.Do =
          (q as any).Do ??
          (q as any).do ??
          (q as any).thursday ??
          nextQuestions.Do;
        nextQuestions.Fr =
          (q as any).Fr ??
          (q as any).fr ??
          (q as any).friday ??
          nextQuestions.Fr;
      }

      setTemaLabel(label);
      setQuote(String(zitat ?? 'Zitat folgt…'));
      setQuestions(nextQuestions);
    } catch {
      // bewusst still: Seite soll nie abstürzen
    }
  }, [themeIdFromUrl]);

  function onClear() {
    setNote('');
    try {
      localStorage.removeItem(LS_NOTE_KEY);
    } catch {}
    textareaRef.current?.focus();
  }

  function onSaveDownload() {
    const text =
      `Thema der Woche – ${temaLabel}\n\n` +
      `Thema: ${temaLabel}\n\n` +
      `Zitat: ${quote}\n\n` +
      `Tagesimpulse:\n` +
      `Mo: ${questions.Mo}\n` +
      `Di: ${questions.Di}\n` +
      `Mi: ${questions.Mi}\n` +
      `Do: ${questions.Do}\n` +
      `Fr: ${questions.Fr}\n\n` +
      `Notizen:\n${note}\n\n` +
      `---\n` +
      `App „Thema der Woche“ erstellt von Andreas Sedlag, Kompetenztrainer und systemischer Coach | www.as-courage.de | Email: kontakt@as-courage.de\n`;

    const safeName = String(temaLabel)
      .replace(/\s+/g, '_')
      .replace(/[^\w\-äöüÄÖÜß]/g, '');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Thema-der-Woche_Notizen_${safeName || 'Thema'}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function onPrint() {
    window.print();
  }

  return (
    <BackgroundLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
        <div className="rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-3">
                <Link
                  href="/quotes"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                >
                  ← Zurück zu den Tagesimpulsen
                </Link>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Notizen
              </h1>
              <p className="mt-1 text-sm text-slate-700">
                Zu deinem aktuellen Thema – speichern, löschen oder drucken.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSaveDownload}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={onClear}
                className="cursor-pointer rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={onPrint}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Drucken
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md print:bg-white print:shadow-none">
          <h2 className="text-2xl font-semibold text-slate-900">{`Thema der Woche – ${temaLabel}`}</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900">Thema</div>
              <div className="mt-1 text-base font-semibold text-slate-900">
                {temaLabel}
              </div>

              <div className="mt-4 text-sm font-medium text-slate-900">Zitat</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {quote}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900">Tagesimpulse</div>
              <ul className="mt-2 space-y-2 text-sm text-slate-800">
                <li>
                  <span className="font-semibold">Mo:</span> {questions.Mo}
                </li>
                <li>
                  <span className="font-semibold">Di:</span> {questions.Di}
                </li>
                <li>
                  <span className="font-semibold">Mi:</span> {questions.Mi}
                </li>
                <li>
                  <span className="font-semibold">Do:</span> {questions.Do}
                </li>
                <li>
                  <span className="font-semibold">Fr:</span> {questions.Fr}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium text-slate-900">Persönliche Notizen</div>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Schreibe hier deine Notizen…"
              className="mt-2 min-h-[240px] w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 print:min-h-[400px]"
            />
          </div>

          <div className="mt-6 text-sm text-slate-700 print:mt-8 print:text-slate-800">
            App „Thema der Woche“ erstellt von Andreas Sedlag, Kompetenztrainer und systemischer Coach |{' '}
            <a
              href="https://www.as-courage.de"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
            >
              www.as-courage.de
            </a>{' '}
            | Email:{' '}
            <a
              href="mailto:kontakt@as-courage.de"
              className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
            >
              kontakt@as-courage.de
            </a>
          </div>
        </div>
      </div>
    </BackgroundLayout>
  );
}

export default function NotizenPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <NotizenContent />
      </Suspense>
    </RequireAuth>
  );
}