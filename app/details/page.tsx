import Link from 'next/link';
import BackgroundLayout from '@/components/BackgroundLayout';
import DetailsViewer from './DetailsViewer';

type InfografikPageProps = {
  searchParams: Promise<{
    themeId?: string;
  }>;
};

export default async function InfografikPage({ searchParams }: InfografikPageProps) {
  const params = await searchParams;
  const rawThemeId = params?.themeId ?? '';

  const themeNumber = (rawThemeId.split('-')[1] ?? '1').padStart(2, '0');
  const themeSlugMap: Record<string, string> = {
    '01': 'anerkennung',
    '02': 'belastung',
    '03': 'diskriminierung',
    '04': 'ehrlichkeit',
    '05': 'entscheidungsfindung',
    '06': 'erfolg',
    '07': 'feedback',
    '08': 'fehlerkultur',
    '09': 'flexibilitaet',
    '10': 'fluktuation',
    '11': 'thema-11',
    '12': 'thema-12',
    '13': 'thema-13',
    '14': 'thema-14',
    '15': 'thema-15',
    '16': 'thema-16',
    '17': 'thema-17',
    '18': 'thema-18',
    '19': 'thema-19',
    '20': 'thema-20',
    '21': 'thema-21',
    '22': 'thema-22',
    '23': 'thema-23',
    '24': 'thema-24',
    '25': 'thema-25',
    '26': 'thema-26',
    '27': 'thema-27',
    '28': 'thema-28',
    '29': 'thema-29',
    '30': 'thema-30',
    '31': 'thema-31',
    '32': 'thema-32',
    '33': 'thema-33',
    '34': 'thema-34',
    '35': 'thema-35',
    '36': 'thema-36',
    '37': 'thema-37',
    '38': 'thema-38',
    '39': 'thema-39',
    '40': 'thema-40',
    '41': 'thema-41',
  };

  const themeSlug = themeSlugMap[themeNumber] ?? `thema-${themeNumber}`;
  const standardSrc = `/details/thema-${themeNumber}-${themeSlug}-kurz.pdf`;
  const detailSrc = `/details/thema-${themeNumber}-${themeSlug}-lang.pdf`;

  const availableStandardThemes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
  const availableDetailThemes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

  const backHref = rawThemeId
    ? `/quotes?themeId=${encodeURIComponent(rawThemeId)}`
    : '/quotes';

  return (
    <BackgroundLayout>
      <main className="mx-auto max-w-none px-4 py-8">

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-sm">
          <h1 className="text-2xl font-bold">
            Details – {rawThemeId || 'unbekannt'}
          </h1>

          <div className="flex items-center gap-2">
            

            <Link
              href={backHref}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100 hover:border-slate-400 hover:shadow-md transition-all"
            >
              zurück
            </Link>
          </div>
        </div>

        <DetailsViewer
  standardSrc={standardSrc}
  detailSrc={detailSrc}
  themeNumber={themeNumber}
/>
      </main>
    </BackgroundLayout>
  );
}