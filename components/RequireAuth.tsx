'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;

      if (!alive) return;

      if (!hasSession) {
        // Zurück zu /account, und wir merken uns, woher die Person kam
        router.replace(`/account?next=${encodeURIComponent(pathname || '/')}`);
        return;
      }

      setOk(true);
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace(`/account?next=${encodeURIComponent(pathname || '/')}`);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (!ok) return null; // bewusst leer, damit es nicht flackert

  return <>{children}</>;
}
