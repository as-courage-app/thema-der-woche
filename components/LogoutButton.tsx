'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  className?: string;
};

export default function LogoutButton({ className }: Props) {
  const router = useRouter();
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

    router.push('/start');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isBusy}
        className={
          className ??
          'cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
        }
        aria-label="Abmelden"
        title="Abmelden"
      >
        {isBusy ? 'Abmelden…' : 'Abmelden'}
      </button>

      {errorMsg ? <span className="text-xs text-red-600">{errorMsg}</span> : null}
    </div>
  );
}