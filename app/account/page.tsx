'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '@/components/BackgroundLayout';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'login' | 'signup';

const CONSENT_KEY = 'as-courage.consent.v1';
const SELECTED_PLAN_KEY = 'as-courage.selectedPlan.v1';
const CHECKOUT_EMAIL_KEY = 'as-courage.checkoutEmail.v1';

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

function readSelectedPlan(): 'A' | 'B' | 'C' | null {
  try {
    const v = localStorage.getItem(SELECTED_PLAN_KEY);
    return v === 'A' || v === 'B' || v === 'C' ? v : null;
  } catch {
    return null;
  }
}

function writeSelectedPlan(plan: 'A' | 'B' | 'C') {
  try {
    localStorage.setItem(SELECTED_PLAN_KEY, plan);
  } catch {
    // ignore
  }
}

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

export default function AccountPage() {
  const router = useRouter();

  // Hinweisbox oben
  const [topNotice, setTopNotice] = useState<string | null>(null);

  // message im Login-Bereich
  const [message, setMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>('login'); // Start: Login (Konto wird über /konto angelegt)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  // Zahlung
  const [paid, setPaid] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'A' | 'B' | 'C' | null>(null);

  // Consent
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  // Auth
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);

  const consentOk = useMemo(() => acceptTerms && acceptPrivacy, [acceptTerms, acceptPrivacy]);
  const checkoutDisabled = !consentOk;

  const cardBase =
    'group flex h-full flex-col rounded-2xl bg-white p-5 text-left shadow-md ring-1 ring-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';
  const cardEnabled = 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400';
  const cardDisabled = 'cursor-not-allowed opacity-60';

  // 1) Consent + Plan + Checkout-Email laden
  useEffect(() => {
    const c = readConsent();
    setAcceptTerms(c.acceptTerms);
    setAcceptPrivacy(c.acceptPrivacy);

    const p = readSelectedPlan();
    setSelectedPlan(p);

    const checkoutMail = readCheckoutEmail();
    if (checkoutMail) setEmail(checkoutMail);
  }, []);

  // 2) Consent speichern
  useEffect(() => {
    writeConsent({ acceptTerms, acceptPrivacy });
  }, [acceptTerms, acceptPrivacy]);

  // 3) Auth Status initial + live
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const mail = data.session?.user?.email ?? null;
      setAuthedEmail(mail);
      if (mail) setEmail(mail);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const mail = session?.user?.email ?? null;
      setAuthedEmail(mail);
      if (mail) setEmail(mail);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 4) Query Handling: checkout + pwreset + notice/email
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);

    const checkout = qs.get('checkout');
    const pwreset = qs.get('pwreset');
    const qEmail = qs.get('email');

    const notice = qs.get('notice'); // confirm-email
    const noticeEmail = qs.get('email'); // gleiches Feld, nutzen wir fürs Prefill

    if (qEmail) {
      setEmail(qEmail);
      writeCheckoutEmail(qEmail);
    }

    // Notice von /konto anzeigen (dein Punkt 7)
    if (notice === 'confirm-email') {
      const m = noticeEmail || readCheckoutEmail() || '';
      if (m) {
        setTopNotice(
          `Konto angelegt. Bitte bestätige deine E-Mail-Adresse (${m}). Bitte auch im Spam-Ordner nachsehen.`
        );
      } else {
        setTopNotice('Konto angelegt. Bitte bestätige deine E-Mail-Adresse. Bitte auch im Spam-Ordner nachsehen.');
      }
    }

    if (pwreset === '1') {
      setTopNotice('Du kannst jetzt ein neues Passwort setzen. Bitte melde dich danach mit dem neuen Passwort an.');
    }

    if (checkout === 'success') {
      setPaid(true);

      // Haken bleiben gesetzt + zusätzlich auf "an"
      writeConsent({ acceptTerms: true, acceptPrivacy: true });
      setAcceptTerms(true);
      setAcceptPrivacy(true);

      // Plan noch mal aus LocalStorage
      const p = readSelectedPlan();
      setSelectedPlan(p);

      setTopNotice('Zahlung erfolgreich. 🎉 Jetzt kannst du dein Konto anlegen.');
    }

    if (checkout === 'cancel') {
      setPaid(false);
      setTopNotice('Zahlung abgebrochen. Du kannst es jederzeit erneut versuchen.');
    }

    // URL aufräumen (damit Refresh nicht wieder triggert)
    if (checkout || pwreset || notice) {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      url.searchParams.delete('pwreset');
      url.searchParams.delete('notice');
      // email NICHT löschen – soll für Prefill bleiben
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  function requirePlanBeforeKonto(): boolean {
    if (!selectedPlan) {
      setTopNotice('Bitte wähle zuerst eine Variante A, B oder C.');
      return false;
    }
    return true;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!consentOk) {
      setMessage('Bitte bestätige zuerst AGB und Datenschutzhinweise.');
      return;
    }

    if (!email || !password) {
      setMessage('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg =
          error.message?.toLowerCase().includes('invalid login credentials')
            ? 'Anmelden nicht möglich: Entweder gibt es noch kein Konto mit diesen Daten oder das Passwort stimmt nicht.'
            : `Fehler: ${error.message}`;
        setMessage(msg);
        return;
      }

      setMessage('Erfolgreich angemeldet.');
      // Buttons erscheinen automatisch über authedEmail
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

    writeSelectedPlan(plan);
    setSelectedPlan(plan);

    if (email) writeCheckoutEmail(email);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: email || undefined }),
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

  const authed = !!authedEmail;

  return (
    <BackgroundLayout>
      {/* Nach erfolgreicher Zahlung: CTA */}
      {paid && (
        <section className="mx-auto mt-6 w-full max-w-3xl px-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-900">
              Zahlung erfolgreich – jetzt kannst du dein Konto anlegen.
            </div>

            {email && (
              <div className="mt-1 text-sm text-emerald-900/90">
                E-Mail: <span className="font-semibold">{email}</span>
              </div>
            )}

            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  if (!requirePlanBeforeKonto()) return;
                  router.push(`/konto?email=${encodeURIComponent(email || readCheckoutEmail() || '')}`);
                }}
                className="inline-flex cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
              >
                Konto anlegen
              </button>
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          {/* Feldtest-Buttons (oben rechts) – wieder sichtbar */}
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
              <p className="mt-3 text-xs font-semibold text-emerald-700">Teamkalender/iCal-Funktion zum Download</p>
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

          {/* Login-Bereich */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Anmelden</h2>

              {/* Mode bleibt, aber Signup ist praktisch über /konto */}
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
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-2 flex flex-col gap-3">
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
                  autoComplete="current-password"
                />
              </label>

              <div className="-mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-600" />

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
                disabled={loading || !consentOk}
                className="mt-1 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Bitte warten…' : 'Anmelden'}
              </button>

              {!consentOk && (
                <p className="text-base font-semibold text-slate-700">
                  Hinweis: Bitte setze oben die Haken für AGB und Datenschutzhinweise.
                </p>
              )}
            </form>

            {message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{message}</p>}

            {/* Nach Login: Buttons (dein Punkt 12) */}
            {authed && (
              <div className="mt-3 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200">
                <div className="text-sm text-slate-700">
                  Angemeldet als: <span className="font-semibold text-slate-900">{authedEmail}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/themes"
                    className="inline-flex cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    Themen
                  </Link>
                  <Link
                    href="/setup"
                    className="inline-flex cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    Setup
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}
