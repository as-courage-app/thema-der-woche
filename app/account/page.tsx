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
          <h1 className="text-2xl font-semibold text-slate-900">Anmelden oder Konto erstellen</h1>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow ${
                mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}
            >
              Konto erstellen
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold shadow ${
                mode === 'login' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}
            >
              Anmelden
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-900">
              E-Mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm"
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              {loading ? 'Bitte warten…' : mode === 'signup' ? 'Konto erstellen' : 'Anmelden'}
            </button>

            <button
              type="button"
              onClick={() => startCheckout('A')}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Vollversion kaufen (A) – 19,99 €
            </button>

            {message && (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{message}</p>
            )}
          </form>

          <p className="mt-6 text-xs text-slate-600">
            Provisorisch: Lizenz-Auswahl (A/B/C) und „Themen/Setup“ sperren wir als Nächstes nach Login.
          </p>
        </section>
      </main>
    </BackgroundLayout>
  );
}
