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

const PLAN_DETAILS: Record<
  PlanTier,
  {
    price: string;
    tag: string;
    duration: string;
    features: string[];
    extraNote?: string;
  }
> = {
  A: {
    price: '19,99 €',
    tag: 'Start',
    duration: '12 Monate ab Anmeldung',
    features: ['41 Wochenthemen', '41 Bilder & Zitate', '205 Tagesimpulse'],
  },
  B: {
    price: '39,99 €',
    tag: 'Dauerhaft',
    duration: 'ohne zeitliche Beschränkung',
    features: [
      '41 Wochenthemen',
      '41 Bilder & Zitate',
      '205 Tagesimpulse',
      '41 Podcast-Folgen',
      '41 Videos',
      'Notizfunktion',
    ],
  },
  C: {
    price: '59,99 €',
    tag: 'Komplett',
    duration: 'ohne zeitliche Beschränkung',
    features: [
      '41 Wochenthemen',
      '41 Bilder & Zitate',
      '205 Tagesimpulse',
      'Teamkalender iCal',
      '41 Podcast-Folgen',
      '41 Videos',
      '41 Infografiken',
      '41 Details in Kurz-/Langform',
      'Notizfunktion',
    ],
    extraNote: 'Teamkalender/iCal-Funktion zum Download',
  },
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
  const consentConfirmed = consentOk || authed;

  const canOpenThemes = mounted && authed && !!currentUserPlan;
  const planCardsVisibleAsActive = authed && (viewMode === 'plan-select' || currentUserPlan !== null);

  const cardBase =
    'group flex h-full flex-col rounded-[24px] border p-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';

  const cardEnabled = 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl';
  const cardDisabled = 'cursor-not-allowed opacity-55';

  const panelClass = 'rounded-[28px] bg-white/92 p-5 shadow-sm ring-1 ring-slate-200 md:p-6';
  const fieldClass =
    'mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';
  const darkButtonClass =
    'inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60';
  const orangeButtonClass =
    'inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-2xl bg-[#F29420] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#E4891E] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60';
  const greenButtonClass =
    'inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-2xl bg-[#4EA72E] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#449327] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60';
  const softButtonClass =
    'inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400';

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
    if (!consentConfirmed) return false;

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

      const { error } = await supabase.auth.signUp({
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

      setTopNotice('E-Mail zum Zurücksetzen wurde versendet. Bitte prüfe dein Postfach und auch den Spam-Ordner.');
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

    if (!consentConfirmed) {
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

  function renderPlanCard(plan: PlanTier) {
    const details = PLAN_DETAILS[plan];
    const enabled = isPlanActionAllowed(plan);
    const isActive = currentUserPlan === plan;
    const isUpgrade = !!currentUserPlan && planRank(plan) > planRank(currentUserPlan);

    return (
      <button
        key={plan}
        type="button"
        onClick={() => startCheckout(plan)}
        disabled={!enabled}
        className={`${cardBase} ${enabled ? cardEnabled : ''} ${isActive
          ? 'border-orange-300 bg-orange-50/95 shadow-lg ring-2 ring-orange-200'
          : !enabled
            ? 'border-slate-200 bg-slate-50/70 opacity-55'
            : 'border-slate-200 bg-white'
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
              {details.tag}
            </span>

            <h3 className="mt-3 text-xl font-semibold text-slate-900">{planButtonLabel(plan)}</h3>
            <p className="mt-1 text-sm text-slate-600">browserbasierte Einzellizenz</p>
          </div>

          <div className="text-right">
            <div className="text-xl font-bold text-slate-900">{details.price}</div>
            <div className="mt-1 text-xs text-slate-600">{details.duration}</div>
          </div>
        </div>

        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          {details.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-0.5 text-base leading-none text-[#F29420]">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {details.extraNote && (
          <p className="mt-4 rounded-2xl bg-white/90 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {details.extraNote}
          </p>
        )}

        {isActive && <p className="mt-4 text-xs font-semibold text-emerald-700">aktuell aktiv</p>}

        {isUpgrade && enabled && (
          <p className="mt-4 text-xs font-semibold text-slate-700">Upgrade jetzt direkt möglich</p>
        )}

        {!planCardsVisibleAsActive && (
          <p className="mt-4 text-xs text-slate-500">Nach der Anmeldung auswählbar</p>
        )}

        {selectedPlan === plan && !currentUserPlan && (
          <p className="mt-4 text-xs font-semibold text-slate-700">zuletzt ausgewählt</p>
        )}
      </button>
    );
  }

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
        <section className="rounded-[30px] border border-[#F29420] bg-white/85 p-4 shadow-xl backdrop-blur-md md:p-6">
          <div className="mb-4 flex items-start justify-end gap-2">
            {canOpenThemes ? (
              <Link href="/themes" className={softButtonClass}>
                Themenauswahl
              </Link>
            ) : (
              <span
                className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 opacity-50 shadow-md ring-1 ring-slate-200"
                aria-disabled="true"
                title="Bitte erst anmelden"
              >
                Themenauswahl
              </span>
            )}

            <Link href="https://thema-der-woche-kostenlos.vercel.app/version" className={softButtonClass}>
              zurück
            </Link>
          </div>

          <section className="overflow-hidden rounded-[30px] border border-[#F29420] bg-gradient-to-br from-white via-orange-50/70 to-slate-50 ring-1 ring-orange-200">
            <div className="grid gap-6 p-6 md:grid-cols-[1.08fr_0.92fr] md:items-center md:p-8">
              <div>
                <div className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-[#A35B06] ring-1 ring-orange-200">
                  Edition 1 · browserbasierte Einzellizenz
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                  Schön, dass du da bist.
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  Thema der Woche unterstützt dich und dein Team mit klaren Fragen, guten Gedanken und
                  alltagstauglichen Impulsen. Melde dich an und wähle anschließend die Variante, die zu dir passt.
                </p>

                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-700">
                  <span className="rounded-2xl border border-orange-200 bg-white px-3 py-2 shadow-sm">
                    41 Wochenthemen
                  </span>
                  <span className="rounded-2xl border border-orange-200 bg-white px-3 py-2 shadow-sm">
                    205 Tagesimpulse
                  </span>
                  <span className="rounded-2xl border border-orange-200 bg-white px-3 py-2 shadow-sm">
                    Podcast, Videos und mehr
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-orange-200 bg-white/90 p-3 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schritt 1</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">Konto anmelden</div>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-white/90 p-3 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schritt 2</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">Variante auswählen</div>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-white/90 p-3 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schritt 3</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">Direkt loslegen</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="overflow-hidden rounded-[30px] bg-white shadow-xl ring-1 ring-slate-200">
                  <img
                    src="https://thema-der-woche-kostenlos.vercel.app/version-aufsteller.jpg"
                    alt="Thema der Woche als Tischaufsteller"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </section>

          {topNotice && (
            <div className="mt-5 rounded-[24px] bg-white p-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200">
              {topNotice}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
              {message}
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className={`${panelClass} border border-[#F29420]`}>
              {viewMode === 'reset-password' && !authed ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Neues Passwort setzen</h2>
                      <p className="mt-1 text-sm text-slate-700">Vergib jetzt ein neues Passwort für dein Konto.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('login');
                        setTopNotice(null);
                        setMessage(null);
                      }}
                      className="cursor-pointer text-sm font-semibold text-slate-700 underline hover:text-slate-900"
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
                        className={fieldClass}
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
                        className={fieldClass}
                        placeholder="Passwort wiederholen"
                        autoComplete="new-password"
                      />
                    </label>

                    <button type="submit" disabled={loading} className={darkButtonClass}>
                      {loading ? 'Bitte warten…' : 'Neues Passwort speichern'}
                    </button>
                  </form>
                </div>
              ) : !authed ? (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Zugang zu deiner Vollversion</h2>
                      <p className="mt-1 text-sm text-slate-700">Melde dich an oder lege ein neues Konto an.</p>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
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
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
                      Deine E-Mail-Adresse ist bestätigt. Bitte melde dich jetzt an.
                    </div>
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
                        className={fieldClass}
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
                        className={fieldClass}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </label>

                    <div className="-mt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={loading}
                        className="cursor-pointer text-sm font-semibold text-slate-700 underline hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Passwort vergessen?
                      </button>
                    </div>

                    <button type="submit" disabled={loading} className={orangeButtonClass}>
                      {loading ? 'Bitte warten…' : 'Anmelden'}
                    </button>
                  </form>

                  {viewMode !== 'register' && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                      <span className="text-sm text-slate-700">Noch kein Konto?</span>

                      <button type="button" onClick={handleShowRegister} className={softButtonClass}>
                        Konto anlegen
                      </button>
                    </div>
                  )}

                  {viewMode === 'register' && (
                    <section className="rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">Konto anlegen</h3>
                          <p className="mt-1 text-sm text-slate-700">
                            Danach bestätigst du deine E-Mail-Adresse über die Mail von Supabase.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleCancelRegister}
                          className="cursor-pointer text-sm font-semibold text-slate-700 underline hover:text-slate-900"
                        >
                          schließen
                        </button>
                      </div>

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
                            className={fieldClass}
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
                            className={fieldClass}
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
                            className={fieldClass}
                            placeholder="Passwort wiederholen"
                            autoComplete="new-password"
                          />
                        </label>

                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
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

                          <label className="flex cursor-pointer items-start gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-slate-800 ring-1 ring-slate-200">
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

                        <button type="submit" disabled={loading} className={orangeButtonClass}>
                          {loading ? 'Bitte warten…' : 'Konto anlegen'}
                        </button>
                      </form>
                    </section>
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Dein Konto</h2>
                    <p className="mt-1 text-sm text-slate-700">
                      Schön, dass du angemeldet bist. Von hier aus geht es direkt weiter.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-orange-300 bg-orange-50/95 p-4 shadow-lg ring-2 ring-orange-200">
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
                        Für ein Upgrade kannst du unten eine höhere Variante auswählen.
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-600">Wähle jetzt unten deine Variante A, B oder C.</div>
                    )}
                  </div>

                  <div className="rounded-[24px] bg-white p-4 ring-1 ring-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zugang</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {canOpenThemes ? 'Themenauswahl mit allen Themen freigeschaltet' : 'Warten auf Variantenauswahl'}
                    </div>
                  </div>

                  {canOpenThemes && (
                    <div className="pt-1">
                      <Link href="/themes" className={`${greenButtonClass} w-full`}>
                        Zur Themenauswahl
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className={`${panelClass} border border-[#F29420]`}>
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Wähle die passende Variante</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Du kannst mit Variante A starten oder direkt eine dauerhafte Vollversion wählen. Nach der Anmeldung
                    werden die passenden Auswahlmöglichkeiten für dich freigeschaltet.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-orange-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Flexibel starten</div>
                    <p className="mt-1 text-sm text-slate-700">
                      Variante A eignet sich gut für einen klaren Einstieg über 12 Monate.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-orange-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Dauerhaft nutzen</div>
                    <p className="mt-1 text-sm text-slate-700">
                      Varianten B und C bleiben ohne zeitliche Begrenzung verfügbar.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-orange-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Upgrade möglich</div>
                    <p className="mt-1 text-sm text-slate-700">
                      Varianten A oder B können jederzeit auf eine höhere Variante upgraden.
                    </p>
                  </div>
                </div>

                {viewMode === 'register' && !consentConfirmed ? (
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    Die Auswahl der Varianten ist nach Bestätigung von AGB und Datenschutzhinweisen möglich.
                  </div>
                ) : authed ? (
                  <div className="rounded-[24px] bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
                    AGB und Datenschutzhinweise sind bestätigt. Du kannst jetzt die freigeschalteten Varianten
                    auswählen. Danach erfolgt eine Weiterleitung zum Bezahldienst stripe.com
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-[28px] bg-white/92 p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Deine Varianten im Überblick</h2>
                <p className="mt-1 text-sm text-slate-700">
                  Sichtbar für alle, auswählbar nach bestätigter Anmeldung und mit bestätigten Hinweisen.
                </p>
              </div>

              {selectedPlan && !currentUserPlan && (
                <div className="text-sm font-semibold text-slate-700">Letzte Auswahl: Variante {selectedPlan}</div>
              )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">{(['A', 'B', 'C'] as PlanTier[]).map((plan) => renderPlanCard(plan))}</div>

            {!planCardsVisibleAsActive && (
              <p className="mt-4 text-sm text-slate-600">
                Die Varianten sind sichtbar, aber zunächst deaktiviert. Nach bestätigter Anmeldung werden sie auswählbar.
              </p>
            )}
          </section>
        </section>
      </main>
    </BackgroundLayout>
  );
}