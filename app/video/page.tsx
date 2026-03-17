import Link from 'next/link';
import BackgroundLayout from '@/components/BackgroundLayout';

type VideoPageProps = {
  searchParams: Promise<{
    themeId?: string;
  }>;
};

export default async function VideoPage({ searchParams }: VideoPageProps) {
  const params = await searchParams;
  const rawThemeId = params?.themeId ?? '';

  const themeNumber = (rawThemeId.split('-')[1] ?? '1').padStart(2, '0');

  const themeTitleMap: Record<string, string> = {
    '01': 'Anerkennung',
    '02': 'Belastung',
    '03': 'Diskriminierung',
    '04': 'Ehrlichkeit',
    '05': 'Entscheidungsfindung',
    '06': 'Erfolg',
    '07': 'Feedback',
    '08': 'Fehlerkultur',
    '09': 'Flexibilität',
    '10': 'Fluktuation',
    '11': 'Führung',
    '12': 'Gerechtigkeit',
    '13': 'Gleichberechtigung',
    '14': 'Grenzen',
    '15': 'Humor',
    '16': 'Kennzahlen',
    '17': 'Klarheit',
    '18': 'Kommunikation',
    '19': 'Konflikte',
    '20': 'Kreativität',
    '21': 'Kritik',
    '22': 'Lernen',
    '23': 'Macht',
    '24': 'Mitarbeitendengespräche',
    '25': 'Motivation',
    '26': 'Nachhaltigkeit',
    '27': 'Pausen',
    '28': 'Prioritäten',
    '29': 'Qualität',
    '30': 'Regeln',
    '31': 'Selbstführung',
    '32': 'Selbstwirksamkeit',
    '33': 'Sinn',
    '34': 'Stress',
    '35': 'Transparenz',
    '36': 'Veränderung',
    '37': 'Verantwortung',
    '38': 'Verbesserung',
    '39': 'Vision',
    '40': 'Wertschätzung',
    '41': 'Zusammenarbeit',
  };

  const themeTitle = themeTitleMap[themeNumber] ?? 'unbekannt';

  const videoMap: Record<string, string> = {
    '01': 'CVAfSDEADI0',
    '02': 'WVTPrz0N9eI',
    '03': 'y7B_9Bc7hTw',
    '04': 'hZWRuwzorn4',
    '05': '-iFn6smAJVM',
    '06': '',
    '07': '',
    '08': '',
    '09': '',
    '10': '',
    '11': '',
    '12': '',
    '13': '',
    '14': '',
    '15': '',
    '16': '',
    '17': '',
    '18': '',
    '19': '',
    '20': '',
    '21': '',
    '22': '',
    '23': '',
    '24': '',
    '25': '',
    '26': '',
    '27': '',
    '28': '',
    '29': '',
    '30': '',
    '31': '',
    '32': '',
    '33': '',
    '34': '',
    '35': '',
    '36': '',
    '37': '',
    '38': '',
    '39': '',
    '40': '',
    '41': '',
  };

  const videoId = videoMap[themeNumber] ?? '';

  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : '';

  const backHref = rawThemeId
    ? `/quotes?themeId=${encodeURIComponent(rawThemeId)}`
    : '/quotes';

  return (
    <BackgroundLayout>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-sm">
          <h1 className="text-2xl font-bold">
            Video – {themeTitle}
          </h1>

          <div className="flex items-center gap-2">
            <Link
              href={backHref}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-400 hover:shadow-md cursor-pointer"
            >
              zurück
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-8">
          <section>
            {videoId ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="aspect-video w-full">
                  <iframe
                    className="h-full w-full"
                    src={embedUrl}
                    title={`Video Thema ${themeNumber}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-slate-700">
                  Für dieses Thema ist noch kein Video hinterlegt.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </BackgroundLayout>
  );
}