'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  className?: string;
};

export default function LogoutButton({ className = '' }: Props) {
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogout() {
    if (isBusy) return;
    setIsBusy(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMsg('Abmelden hat nicht geklappt. Bitte nochmal versuchen.');
      setIsBusy(false);
      return;
    }

    window.location.assign('/account');
  }

  const buttonClasses = [
    'fixed right-4 top-36 z-[70] flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-black text-white shadow-md ring-1 ring-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:ring-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60 sm:top-44',
    className,
  ].join(' ');

  return (
    <>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isBusy}
        className={buttonClasses}

        aria-label="Abmelden"
        title="Abmelden"
      >
        <span className="sr-only">{isBusy ? 'Abmelden…' : 'Abmelden'}</span>

        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
          <path d="M10 12h10" />
          <path d="m17 7 5 5-5 5" />
        </svg>
      </button>

      {errorMsg ? <span className="text-xs text-red-600">{errorMsg}</span> : null}
    </>
  );
}