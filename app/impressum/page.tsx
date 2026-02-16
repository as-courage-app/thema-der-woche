import BackgroundLayout from '../../components/BackgroundLayout';

export default function ImpressumPage() {
  return (
    <BackgroundLayout>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-slate-900">Impressum</h1>
          <p className="mt-3 text-sm text-slate-700">
            Platzhalter. Inhalt folgt.
          </p>
        </section>
      </main>
    </BackgroundLayout>
  );
}
