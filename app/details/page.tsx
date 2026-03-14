import Link from 'next/link';
import DetailsViewer from './DetailsViewer';

type DetailsPageProps = {
  searchParams: Promise<{
    themeId?: string;
    view?: string;
  }>;
};

export default async function DetailsPage({ searchParams }: DetailsPageProps) {
  const params = await searchParams;
  const rawThemeId = params?.themeId ?? '';
  const requestedView = params?.view === 'lang' ? 'lang' : 'kurz';

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

  const themeSlugMap: Record<string, string> = {
    '01': 'anerkennung-1',
    '02': 'belastung',
    '03': 'diskriminierung',
    '04': 'ehrlichkeit',
    '05': 'entscheidungsfindung',
    '06': 'erfolg',
    '07': 'feedback',
    '08': 'fehlerkultur',
    '09': 'flexibilitaet-1',
    '10': 'fluktuation',
    '11': 'fuehrung-1',
    '12': 'gerechtigkeit',
    '13': 'gleichberechtigung',
    '14': 'grenzen',
    '15': 'humor',
    '16': 'kennzahlen-1',
    '17': 'klarheit',
    '18': 'kommunikation-1',
    '19': 'konflikte-1',
    '20': 'kreativitaet',
    '21': 'kritik-1',
    '22': 'lernen-1',
    '23': 'macht-1',
    '24': 'ma-gespraeche-1',
    '25': 'motivation',
    '26': 'nachhaltigkeit',
    '27': 'pausen',
    '28': 'proritaeten',
    '29': 'qualitaet-1',
    '30': 'regeln-1',
    '31': 'selbstfuehrung',
    '32': 'selbstwirksamkleit',
    '33': 'sinn',
    '34': 'stress-1',
    '35': 'transparenz',
    '36': 'veraenderung',
    '37': 'verantwortung',
    '38': 'verbesserung',
    '39': 'vision',
    '40': 'wertschaetzung-1',
    '41': 'zusammenarbeit',
  };

  const themeTitle = themeTitleMap[themeNumber] ?? 'unbekannt';
  const themeSlug = themeSlugMap[themeNumber] ?? `thema-${themeNumber}`;

  const standardSrc = `/details/thema-${themeNumber}-${themeSlug}-kurz.pdf`;
  const detailSrc = `/details/thema-${themeNumber}-${themeSlug}-lang.pdf`;

  const backHref = rawThemeId
    ? `/quotes?themeId=${encodeURIComponent(rawThemeId)}`
    : '/quotes';

  return (
    <>
      <main className="mx-auto max-w-none px-4 py-8">


        <DetailsViewer
          standardSrc={standardSrc}
          detailSrc={detailSrc}
          themeNumber={themeNumber}
          initialView={requestedView}
          backHref={backHref}
        />
      </main>
    </>
  );
}