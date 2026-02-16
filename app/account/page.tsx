'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import BackgroundLayout from '../../components/BackgroundLayout';

type Mode = 'login' | 'signup';

export default function AccountPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Stripe kommt per normalem Browser-Redirect zurück.
    // In manchen Fällen (Cache/Restore) ist useSearchParams zu spät oder "stale".
    // Deshalb lesen wir direkt aus window.location.search.
    const qs = new URLSearchParams(window.location.search);
    const checkout = qs.get('checkout');

    if (checkout === 'success') {
      setMessage('Zahlung erfolgreich. 🎉 Du kannst dich jetzt anmelden oder ein Konto erstellen.');

      // URL aufräumen ohne Reload, sofort
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    if (checkout === 'cancel') {
      setMessage('Zahlung abgebrochen. Du kannst es jederzeit erneut versuchen.');

      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
      return;
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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
          setMessage(`Fehler: ${error.message}`);
          return;
        }
        setMessage('Erfolgreich angemeldet.');

        // optional: nach Login weiterleiten (kannst du später ändern)
        // router.push('/start');
      }
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout(plan: 'A' | 'B' | 'C') {
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

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <h1 className="text-2xl font-semibold text-slate-900">
  Thema der Woche <span className="text-slate-600">(Edition 1)</span>
</h1>

<p className="mt-2 text-sm text-slate-700">
  Wähle deine Lizenz-Variante. Danach wirst du zur Zahlung weitergeleitet.
</p>

<div className="mt-6 grid gap-4 md:grid-cols-3">
  {/* Variante A */}
  <button
    type="button"
    onClick={() => startCheckout('A')}
    className="group flex h-full cursor-pointer flex-col text-left rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="text-lg font-semibold text-slate-900">Variante A</span>
      <span className="text-lg font-bold text-slate-900">19,99 €</span>
    </div>
    <div className="mt-2 text-sm text-slate-700">
      Einzellizenz für 12 Monate ab Anmeldung
    </div>
    <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
      <li>41 Wochenthemen</li>
      <li>41 Bilder &amp; Zitate</li>
      <li>205 Tagesimpulse</li>
    </ul>
  </button>

  {/* Variante B */}
  <button
    type="button"
    onClick={() => startCheckout('B')}
    className="group flex h-full cursor-pointer flex-col text-left rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="text-lg font-semibold text-slate-900">Variante B</span>
      <span className="text-lg font-bold text-slate-900">39,99 €</span>
    </div>
    <div className="mt-2 text-sm text-slate-700">Einzellizenz dauerhaft ohne zeitliche Beschränkung</div>
    <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
      <li>41 Wochenthemen</li>
      <li>41 Bilder &amp; Zitate</li>
      <li>205 Tagesimpulse</li>
    </ul>
  </button>

  {/* Variante C */}
  <button
    type="button"
    onClick={() => startCheckout('C')}
    className="group flex h-full cursor-pointer flex-col text-left rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="text-lg font-semibold text-slate-900">Variante C</span>
      <span className="text-lg font-bold text-slate-900">59,99 €</span>
    </div>
    <div className="mt-2 text-sm text-slate-700">Einzellizenz dauerhaft ohne zeitliche Beschränkung</div>
    <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
      <li>41 Wochenthemen</li>
      <li>41 Bilder &amp; Zitate</li>
      <li>205 Tagesimpulse</li>
      <li>Teamkalender iCal</li>
    </ul>

    <p className="mt-3 text-xs font-semibold text-emerald-700">
      Teamkalender/iCal-Funktion zum download
    </p>
  </button>
</div>

<p className="mt-5 text-xs text-slate-700">
  Mit Klick auf eine Variante startest du den Bezahlvorgang. Es gelten unsere{' '}
  <a href="/agb" className="font-semibold underline hover:text-slate-900">
    AGB
  </a>
  , die{' '}
  <a href="/datenschutz" className="font-semibold underline hover:text-slate-900">
    Datenschutzhinweise
  </a>{' '}
  und das{' '}
  <a href="/impressum" className="font-semibold underline hover:text-slate-900">
    Impressum
  </a>
  .
</p>

{message && (
  <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{message}</p>
)}

<p className="mt-6 text-xs text-slate-600">
  Hinweis: Nach dem Kauf kannst du dich anmelden oder ein Konto erstellen.
</p>

        </section>
      </main>
    </BackgroundLayout>
  );
}
