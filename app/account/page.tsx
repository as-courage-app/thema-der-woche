'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '@/components/BackgroundLayout';
import { supabase } from '@/lib/supabaseClient';
import { SELECTED_PLAN_KEY } from '@/lib/storageKeys';
import { readCurrentUserPlan } from '@/lib/userPlan';

const CONSENT_KEY = 'as-courage.accountConsent.v1';
const CHECKOUT_EMAIL_KEY = 'as-courage.checkoutEmail.v1';
const REMEMBER_ME_KEY = 'as-courage.rememberMe.v1';

type PlanTier = 'A' | 'B' | 'C';
type AccountView = 'login' | 'register' | 'confirmed-login' | 'reset-password' | 'plan-select';

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
    // bewusst leer
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
    // bewusst leer
  }
}

function readRememberMe(): boolean {
  try {
    const raw = localStorage.getItem(REMEMBER_ME_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

function writeRememberMe(v: boolean) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, v ? '1' : '0');
  } catch {
    // bewusst leer
  }
}

function readPendingCheckoutPlan(): PlanTier | null {
  try {
    const raw = localStorage.getItem(SELECTED_PLAN_KEY);
    return raw === 'A' || raw === 'B' || raw === 'C' ? raw : null;
  } catch {
    return null;
  }
}

function writePendingCheckoutPlan(plan: PlanTier) {
  try {
    localStorage.setItem(SELECTED_PLAN_KEY, plan);
  } catch {
    // bewusst leer
  }
}

function planRank(plan: PlanTier): number {
  if (plan === 'A') return 1;
  if (plan === 'B') return 2;
  return 3;
}

export default function AccountPage() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<AccountView>('login');

  const [topNotice, setTopNotice] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordRepeat, setRegisterPasswordRepeat] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');

  const [loading, setLoading] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);

  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [currentUserPlan, setCurrentUserPlan] = useState<PlanTier | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [mounted, setMounted] = useState(false);

  const consentOk = useMemo(() => acceptTerms && acceptPrivacy, [acceptTerms, acceptPrivacy]);

  const authed = !!authedEmail;
  const canOpenThemes = mounted && authed && !!currentUserPlan;
  const planCardsVisibleAsActive = authed && (viewMode === 'plan-select' || currentUserPlan !== null);

  const cardBase =
    'group flex h-full flex-col rounded-2xl bg-white p-5 text-left shadow-md ring-1 ring-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';

  const cardEnabled = 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400';
  const cardDisabled = 'cursor-not-allowed opacity-50';

  useEffect(() => {
    const consent = readConsent();
    setAcceptTerms(consent.acceptTerms);
    setAcceptPrivacy(consent.acceptPrivacy);

    const rememberedEmail = readCheckoutEmail();
    if (rememberedEmail) setEmail(rememberedEmail);

    setRememberMe(readRememberMe());
    setSelectedPlan(readPendingCheckoutPlan());
    setMounted(true);
  }, []);

  useEffect(() => {
    writeConsent({ acceptTerms, acceptPrivacy });
  }, [acceptTerms, acceptPrivacy]);

  useEffect(() => {
    writeRememberMe(rememberMe);
  }, [rememberMe]);

  useEffect(() => {
    let alive = true;

    async function syncAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      const mail = session?.user?.email ?? null;
      setAuthedEmail(mail);

      if (mail) {
        setEmail(mail);
        writeCheckoutEmail(mail);

        const plan = await readCurrentUserPlan();
        if (!alive) return;
        setCurrentUserPlan(plan);
      } else {
        setCurrentUserPlan(null);
      }
    }

    syncAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const mail = session?.user?.email ?? null;
      setAuthedEmail(mail);

      if (mail) {
        setEmail(mail);
        writeCheckoutEmail(mail);

        readCurrentUserPlan().then((plan) => {
          if (!alive) return;
          setCurrentUserPlan(plan);
        });
      } else {
        setCurrentUserPlan(null);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);

    const confirmed = qs.get('confirmed');
    const pwreset = qs.get('pwreset');
    const checkout = qs.get('checkout');

    if (confirmed === '1') {
      const rememberedEmail = readCheckoutEmail();
      if (rememberedEmail) setEmail(rememberedEmail);

      void supabase.auth.signOut();

      setPassword('');
      setViewMode('confirmed-login');
      setTopNotice('Deine E-Mail-Adresse wurde bestätigt. Bitte melde dich jetzt mit deinem Passwort an.');
    }

    if (pwreset === '1') {
      const rememberedEmail = readCheckoutEmail();
      if (rememberedEmail) setEmail(rememberedEmail);

      setNewPassword('');
      setNewPasswordRepeat('');
      setViewMode('reset-password');
      setTopNotice('Bitte vergib jetzt ein neues Passwort und wiederhole es zur Sicherheit.');
    }

    if (checkout === 'success') {
      setSelectedPlan(readPendingCheckoutPlan());

      void supabase.auth.signOut();
      setAuthedEmail(null);
      setCurrentUserPlan(null);
      setPassword('');
      setViewMode('login');
      setTopNotice('Zahlung erfolgreich. Bitte melde dich jetzt mit deinem Konto an.');
    }

    if (checkout === 'cancel') {
      setSelectedPlan(readPendingCheckoutPlan());
      setTopNotice('Der Bezahlvorgang wurde abgebrochen. Du kannst später jederzeit erneut starten.');
    }

    if (confirmed || pwreset || checkout) {
      const url = new URL(window.location.href);
      url.searchParams.delete('confirmed');
      url.searchParams.delete('pwreset');
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (viewMode === 'register' || viewMode === 'reset-password' || viewMode === 'confirmed-login') {
      return;
    }

    if (authed) {
      if (currentUserPlan) {
        setViewMode('login');
      } else {
        setViewMode('plan-select');
      }
    } else {
      setViewMode('login');
    }
  }, [authed, currentUserPlan, mounted, viewMode]);

  function isPlanActionAllowed(plan: PlanTier): boolean {
    if (!planCardsVisibleAsActive) return false;
    if (!consentOk) return false;

    if (!currentUserPlan) return true;

    return planRank(plan) > planRank(currentUserPlan);
  }

  function planButtonLabel(plan: PlanTier): string {
    if (!currentUserPlan) return `Variante ${plan}`;

    if (currentUserPlan === plan) return `Variante ${plan} aktiv`;

    if (planRank(plan) > planRank(currentUserPlan)) return `Upgrade auf Variante ${plan}`;

    return `Variante ${plan}`;
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setTopNotice(null);

    if (!email || !password) {
      setMessage('Bitte gib E-Mail-Adresse und Passwort ein.');
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

      writeCheckoutEmail(email);
      setPassword('');

      const plan = await readCurrentUserPlan();
      setCurrentUserPlan(plan);

      if (plan) {
        router.replace('/themes');
        return;
      }

      setViewMode('plan-select');
      setTopNotice('Anmeldung erfolgreich. Wähle jetzt deine Variante A, B oder C.');
    } finally {
      setLoading(false);
    }
  }

  function handleShowRegister() {
    setMessage(null);
    setTopNotice(null);
    setRegisterPassword('');
    setRegisterPasswordRepeat('');
    setViewMode('register');
  }

  function handleCancelRegister() {
    setMessage(null);
    setTopNotice(null);
    setRegisterPassword('');
    setRegisterPasswordRepeat('');
    setViewMode('login');
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setTopNotice(null);

    if (!email) {
      setMessage('Bitte gib zuerst eine E-Mail-Adresse ein.');
      return;
    }

    if (!registerPassword || !registerPasswordRepeat) {
      setMessage('Bitte gib das Passwort zweimal ein.');
      return;
    }

    if (registerPassword.length < 8) {
      setMessage('Das Passwort sollte mindestens 8 Zeichen lang sein.');
      return;
    }

    if (registerPassword !== registerPasswordRepeat) {
      setMessage('Die beiden Passwort-Eingaben stimmen nicht überein.');
      return;
    }

    if (!consentOk) {
      setMessage('Bitte bestätige AGB und Datenschutzhinweise.');
      return;
    }

    setLoading(true);

    try {
      const origin = window.location?.origin ?? '';

      const { data, error } = await supabase.auth.signUp({
        email,
        password: registerPassword,
        options: {
          emailRedirectTo: `${origin}/account?confirmed=1`,
        },
      });

      if (error) {
        if (error.message === 'User already registered') {
          setMessage('Zu dieser E-Mail-Adresse gibt es bereits ein Konto. Bitte melde dich an oder nutze „Passwort vergessen“.');
        } else {
          setMessage(`Fehler: ${error.message}`);
        }
        return;
      }

      writeCheckoutEmail(email);
      writeConsent({ acceptTerms: true, acceptPrivacy: true });

      setRegisterPassword('');
      setRegisterPasswordRepeat('');
      setPassword('');
      setViewMode('login');
      setTopNotice('Konto angelegt. Bitte bestätige jetzt deine E-Mail-Adresse über die Mail von Supabase.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMessage(null);
    setTopNotice(null);

    if (!email) {
      setMessage('Bitte gib zuerst deine E-Mail-Adresse ein.');
      return;
    }

    setLoading(true);

    try {
      const origin = window.location?.origin ?? '';

      writeCheckoutEmail(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/account?pwreset=1`,
      });

      if (error) {
        setMessage(`Fehler: ${error.message}`);
        return;
      }

      setMessage('E-Mail zum Zurücksetzen wurde versendet. Bitte prüfe dein Postfach und auch den Spam-Ordner.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setTopNotice(null);

    if (!newPassword || !newPasswordRepeat) {
      setMessage('Bitte gib das neue Passwort zweimal ein.');
      return;
    }

    if (newPassword.length < 8) {
      setMessage('Das neue Passwort sollte mindestens 8 Zeichen lang sein.');
      return;
    }

    if (newPassword !== newPasswordRepeat) {
      setMessage('Die beiden Passwort-Eingaben stimmen nicht überein.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setMessage(`Fehler: ${error.message}`);
        return;
      }

      await supabase.auth.signOut();

      setAuthedEmail(null);
      setCurrentUserPlan(null);
      setPassword('');
      setNewPassword('');
      setNewPasswordRepeat('');
      setViewMode('login');
      setTopNotice('Neues Passwort gespeichert. Bitte melde dich jetzt mit deiner E-Mail-Adresse und dem neuen Passwort an.');
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout(plan: PlanTier) {
    setMessage(null);
    setTopNotice(null);

    if (!authed) {
      setTopNotice('Bitte melde dich zuerst an.');
      setViewMode('login');
      return;
    }

    if (!consentOk) {
      setTopNotice('Bitte bestätige zuerst AGB und Datenschutzhinweise.');
      return;
    }

    if (currentUserPlan && !isPlanActionAllowed(plan)) {
      setTopNotice('Diese Auswahl ist aktuell nicht möglich. Es werden nur passende Upgrades freigegeben.');
      return;
    }

    writePendingCheckoutPlan(plan);
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

      setMessage(data?.error ?? 'Checkout konnte nicht gestartet werden.');
    } catch {
      setMessage('Checkout konnte nicht gestartet werden.');
    }
  }

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <div className="mb-4 flex items-start justify-end gap-2">
            {canOpenThemes ? (
              <Link
                href="/themes"
                className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                Themenauswahl
              </Link>
            ) : (
              <span
                className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 opacity-50 cursor-not-allowed"
                aria-disabled="true"
                title="Bitte erst anmelden"
              >
                Themenauswahl
              </span>
            )}

            <Link
              href="/version"
              className="cursor-pointer rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              zurück
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">
            Thema der Woche <span className="text-slate-600">(Edition 1)</span>
          </h1>

          <p className="mt-2 text-base text-slate-700">
            Auswahlmöglichkeit unter drei Lizenz-Varianten
          </p>

          {topNotice && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200">
              {topNotice}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200">
              {message}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => startCheckout('A')}
              disabled={!isPlanActionAllowed('A')}
              className={`${cardBase} ${isPlanActionAllowed('A') ? cardEnabled : cardDisabled}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-lg font-semibold text-slate-900">{planButtonLabel('A')}</span>
                <span className="text-lg font-bold text-slate-900">19,99 €</span>
              </div>

              <div className="mt-2 text-sm text-slate-700">browserbasierte Einzellizenz</div>

              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                <li>12 Mon. ab Anmeldung</li>
                <li>41 Wochenthemen</li>
                <li>41 Bilder &amp; Zitate</li>
                <li>205 Tagesimpulse</li>
              </ul>

              {currentUserPlan === 'A' && (
                <p className="mt-3 text-xs font-semibold text-emerald-700">aktuell aktiv</p>
              )}
            </button>

            <button
              type="button"
              onClick={() => startCheckout('B')}
              disabled={!isPlanActionAllowed('B')}
              className={`${cardBase} ${isPlanActionAllowed('B') ? cardEnabled : cardDisabled}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-lg font-semibold text-slate-900">{planButtonLabel('B')}</span>
                <span className="text-lg font-bold text-slate-900">39,99 €</span>
              </div>

              <div className="mt-2 text-sm text-slate-700">browserbasierte Einzellizenz</div>

              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                <li>dauerhaft ohne zeitliche Beschränkung</li>
                <li>41 Wochenthemen</li>
                <li>41 Bilder &amp; Zitate</li>
                <li>205 Tagesimpulse</li>
                <li>41 Podcast-Folgen</li>
                <li>41 Videos</li>
                <li>Notizfunktion</li>
              </ul>

              {currentUserPlan === 'B' && (
                <p className="mt-3 text-xs font-semibold text-emerald-700">aktuell aktiv</p>
              )}
            </button>

            <button
              type="button"
              onClick={() => startCheckout('C')}
              disabled={!isPlanActionAllowed('C')}
              className={`${cardBase} ${isPlanActionAllowed('C') ? cardEnabled : cardDisabled}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-lg font-semibold text-slate-900">{planButtonLabel('C')}</span>
                <span className="text-lg font-bold text-slate-900">59,99 €</span>
              </div>

              <div className="mt-2 text-sm text-slate-700">browserbasierte Einzellizenz</div>

              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                <li>dauerhaft ohne zeitliche Beschränkung</li>
                <li>41 Wochenthemen</li>
                <li>41 Bilder &amp; Zitate</li>
                <li>205 Tagesimpulse</li>
                <li>Teamkalender iCal</li>
                <li>41 Podcast-Folgen</li>
                <li>41 Videos</li>
                <li>41 Infografiken</li>
                <li>41 Details in Kurz-/Langform</li>
                <li>Notizfunktion</li>
              </ul>

              <p className="mt-3 text-xs font-semibold text-emerald-700">Teamkalender/iCal-Funktion zum Download</p>

              {currentUserPlan === 'C' && (
                <p className="mt-3 text-xs font-semibold text-emerald-700">aktuell aktiv</p>
              )}
            </button>
          </div>

          {!planCardsVisibleAsActive && (
            <p className="mt-4 text-sm text-slate-600">
              Die Varianten sind sichtbar, aber zunächst deaktiviert. Nach bestätigter Anmeldung werden sie auswählbar.
            </p>
          )}

          {planCardsVisibleAsActive && !consentOk && (
            <div className="mt-5 max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm text-slate-900 ring-1 ring-slate-200">
              <p className="font-semibold text-slate-900">
                Bitte bestätige vor dem Bezahlvorgang einmal AGB und Datenschutzhinweise.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
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

                <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                  <span>
                    <Link href="/datenschutz" className="underline hover:no-underline">
                      Datenschutzhinweise
                    </Link>{' '}
                    gelesen.
                  </span>
                </label>
              </div>

              <div className="mt-3 text-sm text-slate-700">
                <Link href="/impressum" className="font-semibold underline hover:text-slate-900">
                  Impressum
                </Link>
              </div>
            </div>
          )}

          <hr className="my-6 border-slate-200/70" />

          {!authed && viewMode !== 'reset-password' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Anmelden</h2>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                  <span className="select-none font-semibold text-slate-900">Angemeldet bleiben</span>
                </label>
              </div>

              {viewMode === 'confirmed-login' && (
                <p className="text-sm text-slate-700">
                  Deine E-Mail-Adresse ist bestätigt. Bitte melde dich jetzt mit deinem eben gesetzten Passwort an.
                </p>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
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
                  disabled={loading}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? 'Bitte warten…'
                    : topNotice && viewMode !== 'register'
                      ? topNotice
                      : 'Anmelden'}
                </button>
              </form>

              {viewMode !== 'register' && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-700">Noch kein Konto?</span>

                  <button
                    type="button"
                    onClick={handleShowRegister}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Konto anlegen
                  </button>
                </div>
              )}

              {viewMode === 'register' && (
                <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900">Konto anlegen</h3>

                    <button
                      type="button"
                      onClick={handleCancelRegister}
                      className="text-sm font-semibold text-slate-700 underline hover:text-slate-900"
                    >
                      schließen
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-slate-700">
                    Lege jetzt dein Konto an. Danach bestätigst du deine E-Mail-Adresse über die Mail von Supabase.
                  </p>

                  {message && (
                    <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm text-slate-900 shadow-sm ring-1 ring-amber-200">
                      {message}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="mt-4 flex flex-col gap-3">
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
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                        placeholder="mindestens 8 Zeichen"
                        autoComplete="new-password"
                      />
                    </label>

                    <label className="text-sm font-semibold text-slate-900">
                      Passwort wiederholen
                      <input
                        type="password"
                        value={registerPasswordRepeat}
                        onChange={(e) => setRegisterPasswordRepeat(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                        placeholder="Passwort wiederholen"
                        autoComplete="new-password"
                      />
                    </label>

                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
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

                      <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
                        <input
                          type="checkbox"
                          checked={acceptPrivacy}
                          onChange={(e) => setAcceptPrivacy(e.target.checked)}
                          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300"
                        />
                        <span>
                          <Link href="/datenschutz" className="underline hover:no-underline">
                            Datenschutzhinweise
                          </Link>{' '}
                          gelesen.
                        </span>
                      </label>
                    </div>

                    <div className="text-sm text-slate-700">
                      <Link href="/impressum" className="font-semibold underline hover:text-slate-900">
                        Impressum
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Bitte warten…' : 'Konto anlegen'}
                    </button>
                  </form>
                </section>
              )}
            </div>
          )}

          {viewMode === 'reset-password' && !authed && (
            <section className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Neues Passwort setzen</h2>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setTopNotice(null);
                    setMessage(null);
                  }}
                  className="text-sm font-semibold text-slate-700 underline hover:text-slate-900"
                >
                  zurück zur Anmeldung
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-slate-900">
                  Neues Passwort
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    placeholder="mindestens 8 Zeichen"
                    autoComplete="new-password"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-900">
                  Neues Passwort wiederholen
                  <input
                    type="password"
                    value={newPasswordRepeat}
                    onChange={(e) => setNewPasswordRepeat(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                    placeholder="Passwort wiederholen"
                    autoComplete="new-password"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Bitte warten…' : 'Neues Passwort speichern'}
                </button>
              </form>
            </section>
          )}

          {authed && (
            <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="text-sm text-slate-700">
                Angemeldet als: <span className="font-semibold text-slate-900">{authedEmail}</span>
              </div>

              <div className="mt-2 text-sm text-slate-700">
                Aktuelle Variante:{' '}
                <span className="font-semibold text-slate-900">
                  {currentUserPlan ? `Variante ${currentUserPlan}` : 'noch keine'}
                </span>
              </div>

              {currentUserPlan ? (
                <div className="mt-2 text-xs text-slate-600">
                  Für ein Upgrade kannst du oben eine höhere Variante auswählen.
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-600">
                  Bitte wähle jetzt oben deine Variante A, B oder C.
                </div>
              )}
            </section>
          )}
        </section>
      </main>
    </BackgroundLayout>
  );
}