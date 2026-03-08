'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateDEshort(d: Date) {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = pad2(d.getFullYear() % 100);
  return `${dd}.${mm}.${yy}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function NotizenContent() {
  const searchParams = useSearchParams();
  const themeIdFromUrl = searchParams.get('themeId');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [note, setNote] = useState('');
  const [temaLabel, setTemaLabel] = useState('Thema');
  const [quote, setQuote] = useState('Zitat folgt…');
  const [questions, setQuestions] = useState<Record<DayKey, string>>(DEFAULT_QUESTIONS);

  const LS_NOTE_KEY_BASE = 'as-courage.notes.v1';

  const { activeThemeId, weekStart } = useMemo(() => {
    try {
      const raw = localStorage.getItem('as-courage.themeSetup.v1');
      if (!raw) return { activeThemeId: null as any, weekStart: null as Date | null };

      const parsed: any = JSON.parse(raw);

      const active =
        themeIdFromUrl ??
        (Array.isArray(parsed?.themeIds) ? parsed.themeIds[0] : null) ??
        parsed?.selectedThemeId ??
        parsed?.themeId ??
        parsed?.theme?.id ??
        parsed?.selectedTheme?.id ??
        null;

      // Woche berechnen: startMonday + (Index in themeIds) * 7
      let ws: Date | null = null;
      const startMondayStr: string | undefined = parsed?.startMonday;
      const themeIds: any[] = Array.isArray(parsed?.themeIds) ? parsed.themeIds : [];

      if (startMondayStr && typeof startMondayStr === 'string' && themeIds.length > 0 && active) {
        const idx = themeIds.findIndex((id) => String(id) === String(active));
        if (idx >= 0) {
          const start = new Date(startMondayStr + 'T00:00:00');
          if (!Number.isNaN(start.getTime())) ws = addDays(start, idx * 7);
        }
      }

      return { activeThemeId: active, weekStart: ws };
    } catch {
      return { activeThemeId: null as any, weekStart: null as Date | null };
    }
  }, [themeIdFromUrl]);

  // Notizen themenbezogen speichern (aber kompatibel laden)
  const noteStorageKey = useMemo(() => {
    return activeThemeId ? `${LS_NOTE_KEY_BASE}.${String(activeThemeId)}` : LS_NOTE_KEY_BASE;
  }, [activeThemeId]);

  const dayLabels = useMemo(() => {
    const days: DayKey[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    const labels: Record<DayKey, string> = { Mo: 'Mo', Di: 'Di', Mi: 'Mi', Do: 'Do', Fr: 'Fr' };

    if (!weekStart) return labels;

    days.forEach((k, i) => {
      const d = addDays(weekStart, i);
      labels[k] = `${k}, ${formatDateDEshort(d)}`;
    });

    return labels;
  }, [weekStart]);

  // Notiz laden (erst themenspezifisch, sonst Fallback)
  useEffect(() => {
    try {
      const v1 = localStorage.getItem(noteStorageKey);
      if (v1) {
        setNote(v1);
        return;
      }
      const legacy = localStorage.getItem(LS_NOTE_KEY_BASE);
      if (legacy) {
        setNote(legacy);
        localStorage.setItem(noteStorageKey, legacy);
      }
    } catch {
      // still
    }
  }, [noteStorageKey]);

  // Notiz speichern
  useEffect(() => {
    try {
      localStorage.setItem(noteStorageKey, note);
    } catch {
      // still
    }
  }, [note, noteStorageKey]);

  // Thema / Zitat / Fragen laden
  useEffect(() => {
    try {
      const themeIdOrNr = activeThemeId;

      const themes: any[] = (edition1 as any)?.themes ?? (edition1 as any)?.data ?? (edition1 as any) ?? [];

      const found: any =
        themes.find((t) => t?.id === themeIdOrNr) ||
        themes.find((t) => t?.nr === themeIdOrNr) ||
        themes.find((t) => t?.number === themeIdOrNr) ||
        themes.find((t) => String(t?.id) === String(themeIdOrNr)) ||
        themes.find((t) => String(t?.nr) === String(themeIdOrNr)) ||
        themes.find((t) => String(t?.number) === String(themeIdOrNr));

      if (!found) return;

      const label =
        String(found?.title ?? found?.name ?? found?.thema ?? found?.label ?? found?.id ?? 'Thema') || 'Thema';

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
        nextQuestions.Mo = (q as any).Mo ?? (q as any).mo ?? (q as any).monday ?? nextQuestions.Mo;
        nextQuestions.Di = (q as any).Di ?? (q as any).di ?? (q as any).tuesday ?? nextQuestions.Di;
        nextQuestions.Mi = (q as any).Mi ?? (q as any).mi ?? (q as any).wednesday ?? nextQuestions.Mi;
        nextQuestions.Do = (q as any).Do ?? (q as any).do ?? (q as any).thursday ?? nextQuestions.Do;
        nextQuestions.Fr = (q as any).Fr ?? (q as any).fr ?? (q as any).friday ?? nextQuestions.Fr;
      }

      setTemaLabel(label);
      setQuote(String(zitat ?? 'Zitat folgt…'));
      setQuestions(nextQuestions);
    } catch {
      // still
    }
  }, [activeThemeId]);

  function onClear() {
    setNote('');
    try {
      localStorage.removeItem(noteStorageKey);
      localStorage.removeItem(LS_NOTE_KEY_BASE);
    } catch {
      // still
    }
    textareaRef.current?.focus();
  }

  function onSaveDownload() {
    const text =
      `Thema der Woche – ${temaLabel}\n\n` +
      `Thema: ${temaLabel}\n\n` +
      `Zitat: ${quote}\n\n` +
      `Tagesimpulse:\n` +
      `${dayLabels.Mo}, ${questions.Mo}\n` +
      `${dayLabels.Di}, ${questions.Di}\n` +
      `${dayLabels.Mi}, ${questions.Mi}\n` +
      `${dayLabels.Do}, ${questions.Do}\n` +
      `${dayLabels.Fr}, ${questions.Fr}\n\n` +
      `Notizen:\n${note}\n\n` +
      `---\n` +
      `Projekt von Andreas Sedlag, Kompetenztrainer und systemischer Coach | www.thema-der-woche.com | mailto: (t.b.d.)\n`;

    const safeName = String(temaLabel).replace(/\s+/g, '_').replace(/[^\w\-äöüÄÖÜß]/g, '');
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

  const PrintFooter = (
    <div className="print-footer">
      <span>Projekt von Andreas Sedlag, Kompetenztrainer und systemischer Coach | </span>
      <a href="https://www.thema-der-woche.com">www.thema-der-woche.com</a>
      <span> | </span>
      <a href="mailto:t.b.d.">mailto: (t.b.d.)</a>
      <span className="pagehint"> | Seitenzahl: </span>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm 12mm 12mm 12mm;
          }

          html, body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body { background-image: none !important; }
          .print-page-bg { display: none !important; }

          * {
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
          }

          button, nav, .screen-only { display: none !important; }
          .print-only { display: block !important; }

          /* Druck-Trick: Thead/Tfoot wiederholen sich -> kein Overlay, sauberer Abstand je Seite */
          table.print-table { width: 100%; border-collapse: separate; border-spacing: 0; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }

          .print-top-spacer { height: 18mm; } /* Platz für dein Logo (pro Seite) */

          .print-footer {
            font-size: 10px;
            line-height: 1.2;
            color: #334155;
            text-align: center;
            padding: 2mm 0;
          }

          .print-footer .pagehint { margin-left: 6px; opacity: 0.9; }

          /* Notizen druckbar */
          .print-note { white-space: pre-wrap; }
        }

        .print-only { display: none; }
      `}</style>

      <BackgroundLayout>
        {/* PRINT ONLY */}
        <div className="print-only mx-auto w-full max-w-5xl px-4 py-4">
          <table className="print-table">
            <thead>
              <tr>
                <td>
                  <div className="print-top-spacer" />
                </td>
              </tr>
            </thead>

            <tfoot>
              <tr>
                <td>{PrintFooter}</td>
              </tr>
            </tfoot>

            <tbody>
              <tr>
                <td>
                  <div className="rounded-2xl bg-white p-5">
                    {/* oben: Thema + Zitat nebeneinander */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-semibold text-slate-900">Thema der Woche</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{temaLabel}</div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-semibold text-slate-900">Zitat</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{quote}</div>
                      </div>
                    </div>

                    {/* darunter: Tagesimpulse volle Breite */}
                    <h2 className="mt-4 text-lg font-semibold text-slate-900">{`Thema der Woche – ${temaLabel}`}</h2>

                    <div className="mt-3 rounded-2xl border-2 border-slate-900/70 bg-white p-4">
                      <ul className="space-y-1.5 text-sm text-slate-900">
                        {(['Mo', 'Di', 'Mi', 'Do', 'Fr'] as DayKey[]).map((k) => (
                          <li key={k} className="grid grid-cols-[120px_1fr] gap-3 leading-snug">
                            <span className="whitespace-nowrap">{dayLabels[k]}</span>
                            <span>{questions[k]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Notizen als Fließtext */}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-base font-medium text-slate-900">Persönliche Notizen</div>
                      <div className="print-note mt-2 text-sm text-slate-900">{note?.trim() ? note : '—'}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SCREEN ONLY */}
        <div className="screen-only mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
          <div className="rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={themeIdFromUrl ? `/quotes?themeId=${encodeURIComponent(themeIdFromUrl)}` : '/quotes'}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-400 hover:shadow-md cursor-pointer"
              >
                zurück
              </Link>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Notizen</h1>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onSaveDownload}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-400 hover:shadow-md cursor-pointer"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition-all hover:bg-rose-50 hover:border-rose-400 hover:shadow-md cursor-pointer"
                >
                  Löschen
                </button>
                <button
                  type="button"
                  onClick={onPrint}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-400 hover:shadow-md cursor-pointer"
                >
                  Drucken
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg text-slate-900">
              <span className="font-medium">Zitat:</span> <span className="whitespace-pre-wrap">{quote}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-lg font-semibold text-slate-900">{`Thema der Woche – ${temaLabel}`}</h2>

            <div className="mt-3 rounded-2xl border-2 border-slate-900/70 bg-white p-4">
              <ul className="space-y-1.5 text-sm text-slate-900">
                {(['Mo', 'Di', 'Mi', 'Do', 'Fr'] as DayKey[]).map((k) => (
                  <li key={k} className="grid grid-cols-[120px_1fr] gap-3 leading-snug">
                    <span className="whitespace-nowrap">{dayLabels[k]}</span>
                    <span>{questions[k]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-base font-medium text-slate-900">Persönliche Notizen</div>

              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Schreibe hier deine Notizen…"
                className="mt-2 min-h-[320px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-base text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
          </div>
        </div>
      </BackgroundLayout>
    </>
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