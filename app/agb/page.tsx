import Link from 'next/link';
import BackgroundLayout from '../../components/BackgroundLayout';

export default function AgbPage() {
  return (
    <BackgroundLayout>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-slate-900">AGB</h1>

          <p className="mt-3 text-sm text-slate-700">Platzhalter. Inhalt folgt.</p>

          <div className="mt-6">
            <Link
              href="/account"
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Zurück zur Anmeldung
            </Link>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}
