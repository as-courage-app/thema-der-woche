'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '@/components/BackgroundLayout';
import { supabase } from '@/lib/supabaseClient';

// Wir behalten den Type vorerst, damit nichts rot wird.
type Salutation = 'm' | 'w' | 'd' | 'frei';

const MARKETING_TEXT =
  'Ich möchte Infos zu weiteren Produkten/Dienstleistungen (z. B. zu Seminaren, Trainings, Workshops) von as-courage erhalten (jederzeit abbestellbar).';

export default function KontoPage() {
  const router = useRouter();

  // Anrede-Auswahl ist entfernt, aber wir lassen die States (noch) drin, damit nichts meckert.
  const [salutation] = useState<Salutation>('frei');
  const [salutationFree, setSalutationFree] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const salutationValue = useMemo(() => salutationFree.trim(), [salutationFree]);

  // Komfort: falls jemand schon eingeloggt ist, E-Mail vorfüllen
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (u?.email && !email) setEmail(u.email);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!salutationValue) {
      setMsg('Bitte trage eine freie Anrede ein (z. B. Mx, keine Angabe, Frau, Herr, …).');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setMsg('Bitte fülle Vorname, Name, E-Mail und Passwort aus.');
      return;
    }

    setLoading(true);
    try {
      // 1) Supabase Auth User erstellen
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg(`Fehler: ${error.message}`);
        return;
      }

      const userId = data?.user?.id;

      // Wenn Bestätigung nötig ist, kann userId fehlen – dann nur zurück.
      if (!userId) {
        setMsg(
          'Konto angelegt. Bitte prüfe ggf. dein E-Mail-Postfach zur Bestätigung. Danach kannst du dich anmelden.'
        );
        router.push('/account');
        return;
      }

      // 2) Profil speichern (profiles)
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          user_id: userId,
          salutation: salutationValue,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          marketing_opt_in: marketingOptIn,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (profileError) {
        setMsg(
          'Konto erstellt, aber Profil konnte nicht gespeichert werden. (Das fixen wir gleich in der Datenbank.)'
        );
        router.push('/account');
        return;
      }

      setMsg('Konto erstellt. Du wirst zurück zur Anmeldung geleitet.');
      router.push('/account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Konto anlegen</h1>
            <Link
              href="/account"
              className="cursor-pointer rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Zurück
            </Link>
          </div>

          <p className="text-lg font-semibold text-slate-700">
            Bitte richte jetzt dein Konto ein. Danach kannst du dich auf der Account-Seite anmelden.
          </p>

          <form onSubmit={handleCreateAccount} className="mt-5 flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-900">
              Freie Anrede
              <input
                type="text"
                value={salutationFree}
                onChange={(e) => setSalutationFree(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                placeholder="z. B. Mx, keine Angabe, Herr, Frau, …"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-900">
                Vorname
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </label>

              <label className="text-sm font-semibold text-slate-900">
                Name
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
              </label>
            </div>

            <label className="text-sm font-semibold text-slate-900">
              E-Mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                placeholder="name@beispiel.de"
                autoComplete="email"
              />
            </label>

            <label className="text-sm font-semibold text-slate-900">
              Passwort
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>

            <label className="text-sm font-semibold text-slate-900">
              Telefon (freiwillig)
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                placeholder="+49 …"
                autoComplete="tel"
              />
            </label>

            <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-base text-slate-800 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300"
              />
              <span className="leading-snug">{MARKETING_TEXT}</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Bitte warten…' : 'Konto anlegen'}
            </button>

            {msg && (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 ring-1 ring-slate-200">
                {msg}
              </p>
            )}
          </form>
        </section>
      </main>
    </BackgroundLayout>
  );
}
