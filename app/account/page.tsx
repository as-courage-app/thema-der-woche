'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BackgroundLayout from '@/components/BackgroundLayout';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'login' | 'signup';

const CONSENT_KEY = 'as-courage.consent.v1';

type ConsentState = {
  acceptTerms: boolean;
  acceptPrivacy: boolean;
};

function readConsent(): ConsentState {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { acceptTerms: false, acceptPrivacy: false };
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      acceptTerms: !!parsed.acceptTerms,
      acceptPrivacy: !!parsed.acceptPrivacy,
    };
  } catch {
    return { acceptTerms: false, acceptPrivacy: false };
  }
}

function writeConsent(v: ConsentState) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Hinweisbox direkt unter Impressum (für Checkout + Recovery-Hinweise)
  const [topNotice, setTopNotice] = useState<string | null>(null);

  // message für Login/Signup-Feedback (unten im Bereich)
  const [message, setMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  // Bezahlt? (erst danach darf "Konto erstellen" aktiv werden)
  const [paid, setPaid] = useState(false);

  // Pflicht-Haken: sollen nach Redirect erhalten bleiben
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const consentOk = useMemo(() => acceptTerms && acceptPrivacy, [acceptTerms, acceptPrivacy]);

  // Checkout-Buttons erst aktiv, wenn consentOk
  const checkoutDisabled = !consentOk;

  const cardBase =
    'group flex h-full flex-col rounded-2xl bg-white p-5 text-left shadow-md ring-1 ring-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';
  const cardEnabled = 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400';
  const cardDisabled = 'cursor-not-allowed opacity-60';

  // Consent beim Laden aus localStorage holen
  useEffect(() => {
    const c = readConsent();
    setAcceptTerms(c.acceptTerms);
    setAcceptPrivacy(c.acceptPrivacy);
  }, []);

  // Consent bei jeder Änderung speichern
  useEffect(() => {
    writeConsent({ acceptTerms, acceptPrivacy });
  }, [acceptTerms, acceptPrivacy]);

  // Stripe Rücksprung + Passwort-Recovery-Hinweis
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);

    const checkout = qs.get('checkout');
    const pwreset = qs.get('pwreset'); // kommt nach recovery redirect (optional)

    if (pwreset === '1') {
      setTopNotice('Du kannst jetzt ein neues Passwort setzen. Bitte melde dich danach mit dem neuen Passwort an.');
      const url = new URL(window.location.href);
      url.searchParams.delete('pwreset');
      window.history.replaceState({}, '', url.toString());
    }

    if (checkout === 'success') {
      setPaid(true);

      // Haken bleiben gesetzt (Persistenz macht das), zur Sicherheit nochmal:
      writeConsent({ acceptTerms: true, acceptPrivacy: true });
      setAcceptTerms(true);
      setAcceptPrivacy(true);

      setTopNotice('Zahlung erfolgreich. 🎉 Jetzt kannst du dein Konto anlegen.');

      // URL aufräumen
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (checkout === 'cancel') {
      setPaid(false);
      setTopNotice('Zahlung abgebrochen. Du kannst es jederzeit erneut versuchen.');

      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
      return;
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!consentOk) {
      setMessage('Bitte bestätige zuerst AGB und Datenschutzhinweise.');
      return;
    }

    if (mode === 'signup' && !paid) {
      setMessage('Konto erstellen ist erst nach erfolgreicher Zahlung möglich.');
      return;
    }

    setLoading(true);

    try {
      if (!email || !password) {
        setMessage('Bitte E-Mail und Passwort eingeben.');
        return;
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage(`Fehler: ${error.message}`);
          return;
        }
        setMessage('Konto erstellt. Bitte prüfe ggf. dein E-Mail-Postfach zur Bestätigung.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg =
            error.message?.toLowerCase().includes('invalid login credentials')
              ? 'Anmelden nicht möglich: Es gibt noch kein Konto mit diesen Daten oder das Passwort stimmt nicht.'
              : `Fehler: ${error.message}`;
          setMessage(msg);
          return;
        }
        setMessage('Erfolgreich angemeldet.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout(plan: 'A' | 'B' | 'C') {
    setTopNotice(null);

    if (!consentOk) {
      setTopNotice('Bitte bestätige zuerst AGB und Datenschutzhinweise.');
      return;
    }

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      alert(data?.error ?? 'Checkout konnte nicht gestartet werden.');
    } catch {
      alert('Checkout konnte nicht gestartet werden.');
    }
  }

  async function handleForgotPassword() {
    setMessage(null);

    if (!email) {
      setMessage('Bitte gib zuerst deine E-Mail-Adresse ein.');
      return;
    }

    if (!consentOk) {
      setMessage('Bitte bestätige zuerst AGB und Datenschutzhinweise.');
      return;
    }

    setLoading(true);
    try {
      const origin = window.location?.origin ?? '';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/account?pwreset=1`,
      });

      if (error) {
        setMessage(`Fehler: ${error.message}`);
        return;
      }

      setMessage('E-Mail zum Zurücksetzen wurde versendet (bitte Postfach/Spam prüfen).');
    } finally {
      setLoading(false);
    }
  }

  return (
    <BackgroundLayout>
      {/* Nach erfolgreicher Zahlung: klarer CTA */}
      {paid && (
        <section className="mx-auto mt-6 w-full max-w-3xl px-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-900">
              Zahlung erfolgreich – jetzt kannst du dein Konto anlegen.
            </div>
            <div className="mt-3">
              <Link
                href="/konto"
                className="inline-flex cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
              >
                Konto anlegen
              </Link>
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          {/* Feldtest-Buttons (oben rechts) */}
          <div className="mb-4 flex items-start justify-end gap-2">
            <Link
              href="/themes"
              className="cursor-pointer rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Feldtest: Themen
            </Link>

            <Link
              href="/setup"
              className="cursor-pointer rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Feldtest: Setup
            </Link>

            <Link
              href="/version"
              className="cursor-pointer rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              aria-label="Zur Startseite"
            >
              Startseite
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">
            Thema der Woche <span className="text-slate-600">(Edition 1)</span>
          </h1>

          <p className="mt-2 text-base text-slate-700">Auswahlmöglichkeit unter drei Lizenz-Varianten</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {/* Variante A */}
            <button
              type="button"
              onClick={() => startCheckout('A')}
              disabled={checkoutDisabled}
              className={`${cardBase} ${checkoutDisabled ? cardDisabled : cardEnabled}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-lg font-semibold text-slate-900">Variante A</span>
                <span className="text-lg font-bold text-slate-900">19,99 €</span>
              </div>
              <div className="mt-2 text-sm text-slate-700">browserbasierte Einzellizenz</div>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                <li>12 Mon. ab Anmeldung</li>
                <li>41 Wochenthemen</li>
                <li>41 Bilder &amp; Zitate</li>
                <li>205 Tagesimpulse</li>
              </ul>
            </button>

            {/* Variante B */}
            <button
              type="button"
              onClick={() => startCheckout('B')}
              disabled={checkoutDisabled}
              className={`${cardBase} ${checkoutDisabled ? cardDisabled : cardEnabled}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-lg font-semibold text-slate-900">Variante B</span>
                <span className="text-lg font-bold text-slate-900">39,99 €</span>
              </div>
              <div className="mt-2 text-sm text-slate-700">browserbasierte Einzellizenz</div>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                <li>dauerhaft ohne zeitliche Beschränkung</li>
                <li>41 Wochenthemen</li>
                <li>41 Bilder &amp; Zitate</li>
                <li>205 Tagesimpulse</li>
              </ul>
            </button>

            {/* Variante C */}
            <button
              type="button"
              onClick={() => startCheckout('C')}
              disabled={checkoutDisabled}
              className={`${cardBase} ${checkoutDisabled ? cardDisabled : cardEnabled}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-lg font-semibold text-slate-900">Variante C</span>
                <span className="text-lg font-bold text-slate-900">59,99 €</span>
              </div>
              <div className="mt-2 text-sm text-slate-700">browserbasierte Einzellizenz</div>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                <li>dauerhaft ohne zeitliche Beschränkung</li>
                <li>41 Wochenthemen</li>
                <li>41 Bilder &amp; Zitate</li>
                <li>205 Tagesimpulse</li>
                <li>Teamkalender iCal</li>
              </ul>

              <p className="mt-3 text-xs font-semibold text-emerald-700">
                Teamkalender/iCal-Funktion zum Download
              </p>
            </button>
          </div>

          <p className="mt-5 text-sm text-slate-700">
            Mit einem Klick auf eine Variante startest du den Bezahlvorgang, nachdem du den{' '}
            <Link href="/agb" className="font-semibold underline hover:text-slate-900">
              AGB
            </Link>{' '}
            und den{' '}
            <Link href="/datenschutz" className="font-semibold underline hover:text-slate-900">
              Datenschutzbestimmungen
            </Link>{' '}
            zugestimmt hast.
          </p>

          {/* Checkboxen */}
          <div className="mt-3 max-w-md">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300"
                />
                <span>
                  Ich akzeptiere die{' '}
                  <Link href="/agb" className="underline hover:no-underline">
                    AGB
                  </Link>
                  .
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300"
                />
                <span>
                  Ich habe die{' '}
                  <Link href="/datenschutz" className="underline hover:no-underline">
                    Datenschutzhinweise
                  </Link>{' '}
                  gelesen.
                </span>
              </label>
            </div>

            <div className="mt-2 text-sm text-slate-700">
              <Link href="/impressum" className="font-semibold underline hover:text-slate-900">
                Impressum
              </Link>
            </div>

            {topNotice && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200">
                {topNotice}
              </div>
            )}
          </div>

          <hr className="my-6 border-slate-200/70" />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Anmelden oder Konto erstellen</h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mode === 'login'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white/90 text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400'
                  } focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900`}
                >
                  Anmelden
                </button>

                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  disabled={!paid}
                  className={
                    mode === 'signup'
                      ? `cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                          paid ? 'bg-slate-900 text-white' : 'cursor-not-allowed bg-slate-200 text-slate-500'
                        }`
                      : `cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold shadow-md ring-1 ring-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                          paid
                            ? 'bg-white/90 text-slate-900 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400'
                            : 'cursor-not-allowed bg-slate-100 text-slate-500'
                        }`
                  }
                  title={!paid ? 'Konto erstellen ist erst nach erfolgreicher Zahlung möglich.' : undefined}
                >
                  Konto erstellen
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-3">
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
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              <div className="-mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  {mode === 'signup' && !paid ? 'Konto erstellen erst nach Zahlung.' : ''}
                </span>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="cursor-pointer text-sm font-semibold text-slate-700 underline hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Passwort vergessen?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !consentOk || (mode === 'signup' && !paid)}
                className="mt-1 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Bitte warten…' : mode === 'signup' ? 'Konto erstellen' : 'Anmelden'}
              </button>

              {!consentOk && (
                <p className="text-xs text-slate-600">
                  Hinweis: Bitte setze oben die Haken für AGB und Datenschutzhinweise.
                </p>
              )}
            </form>

            {message && (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{message}</p>
            )}

            <p className="mt-3 text-xs text-slate-600">
              Hinweis: Nach dem Kauf kannst du dich hier anmelden oder ein Konto erstellen.
            </p>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}
