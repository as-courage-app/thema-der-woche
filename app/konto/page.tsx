'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '@/components/BackgroundLayout';
import { supabase } from '@/lib/supabaseClient';

type Salutation = 'm' | 'w' | 'd' | 'frei';

const MARKETING_TEXT =
  'Ich möchte Infos zu weiteren Produkten/Dienstleistungen (z. B. zu Seminaren, Trainings, Workshops) von as-courage erhalten (jederzeit abbestellbar).';

const CHECKOUT_EMAIL_KEY = 'as-courage.checkoutEmail.v1';

function readCheckoutEmail(): string {
  try {
    return localStorage.getItem(CHECKOUT_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeCheckoutEmail(v: string) {
  try {
    localStorage.setItem(CHECKOUT_EMAIL_KEY, v);
  } catch {
    // ignore
  }
}

export default function KontoPage() {
  const router = useRouter();

  const [salutation] = useState<Salutation>('frei');
  const [salutationFree, setSalutationFree] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  const [phone, setPhone] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const salutationValue = useMemo(() => salutationFree.trim(), [salutationFree]);

  // E-Mail vorbefüllen: Query -> localStorage -> eingeloggter User
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      const qEmail = qs.get('email');
      if (qEmail) {
        setEmail(qEmail);
        writeCheckoutEmail(qEmail);

        const url = new URL(window.location.href);
        url.searchParams.delete('email');
        window.history.replaceState({}, '', url.toString());
        return;
      }
    } catch {
      // ignore
    }

    const saved = readCheckoutEmail();
    if (saved) setEmail(saved);

    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (u?.email) setEmail(u.email);
    });
  }, []);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!salutationValue) {
      setMsg('Bitte trage eine freie Anrede ein (z. B. Mx, keine Angabe, Frau, Herr, …).');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !password2) {
      setMsg('Bitte fülle Vorname, Name, E-Mail sowie Passwort und Passwort-Bestätigung aus.');
      return;
    }

    // ZWINGEND: Passwort bestätigen (dein Punkt 7)
    if (password !== password2) {
      setMsg('Die beiden Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim();
      writeCheckoutEmail(cleanEmail);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        setMsg(`Fehler: ${error.message}`);
        return;
      }

      const userId = data?.user?.id;

      // Profil speichern, wenn userId vorhanden
      if (userId) {
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
          router.push(
            `/account?notice=confirm-email&email=${encodeURIComponent(cleanEmail)}&profile=error`
          );
          return;
        }
      }

      // Zurück zu /account mit deutlichem Hinweis (dein Punkt 7)
      router.push(`/account?notice=confirm-email&email=${encodeURIComponent(cleanEmail)}`);
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  writeCheckoutEmail(e.target.value);
                }}
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
              Passwort bestätigen
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
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
