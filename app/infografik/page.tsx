import Link from 'next/link';
import BackgroundLayout from '@/components/BackgroundLayout';

type InfografikPageProps = {
  searchParams: Promise<{
    themeId?: string;
  }>;
};

export default async function InfografikPage({ searchParams }: InfografikPageProps) {
  const params = await searchParams;
  const rawThemeId = params?.themeId ?? '';

  const themeNumber = (rawThemeId.split('-')[1] ?? '1').padStart(2, '0');
  const standardSrc = `/infografik/thema-${themeNumber}-standard.jpg`;
  const detailSrc = `/infografik/thema-${themeNumber}-detail.jpg`;

  const availableStandardThemes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
  const availableDetailThemes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

  const backHref = rawThemeId
    ? `/quotes?themeId=${encodeURIComponent(rawThemeId)}`
    : '/quotes';

  return (
    <BackgroundLayout>
      <main className="mx-auto max-w-5xl px-4 py-8">

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/90 px-4 py-3 shadow-sm">
          <h1 className="text-2xl font-bold">
            Infografik – {rawThemeId || 'unbekannt'}
          </h1>

          <div className="flex items-center gap-2">
            <a
              href={standardSrc}
              download
              className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-400 hover:shadow-md cursor-pointer"
            >
              download
            </a>

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
            <div className="inline-block rounded-xl bg-white px-3 py-1 shadow-sm">
              <h2 className="text-lg font-semibold">Standard</h2>
            </div>

            {availableStandardThemes.includes(themeNumber) ? (
              <img
                src={standardSrc}
                alt={`Infografik Standard Thema ${themeNumber}`}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
              />
            ) : (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-slate-700">
                  Grafik in Bearbeitung und wird in Kürze zur Verfügung gestellt.
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="inline-block rounded-xl bg-white px-3 py-1 shadow-sm">
              <h2 className="text-lg font-semibold">Detail</h2>
            </div>

            {availableDetailThemes.includes(themeNumber) ? (
              <img
                src={detailSrc}
                alt={`Infografik Detail Thema ${themeNumber}`}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
              />
            ) : (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-slate-700">
                  Grafik in Bearbeitung und wird in Kürze zur Verfügung gestellt.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </BackgroundLayout>
  );
}