'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  children: React.ReactNode;
};

/**
 * Feldtest-Regel:
 * - Diese Pfade (und Unterpfade) sind IM FELDTEST ohne Login erreichbar.
 * - Alle anderen Seiten werden bei fehlender Session auf /account?next=... umgeleitet.
 */
const FIELDTEST_PUBLIC_PREFIXES: string[] = [];

function isPublicPath(pathname: string | null) {
  if (!pathname) return false;
  return FIELDTEST_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export default function RequireAuth({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  const publicHere = useMemo(() => isPublicPath(pathname), [pathname]);

  useEffect(() => {
    let alive = true;

    // Feldtest: öffentliche Seiten sofort freigeben (kein Supabase-Call, kein Redirect)
    if (publicHere) {
      setOk(true);
      return;
    }

    async function check() {
      const { data, error } = await supabase.auth.getSession();
      const hasSession = !!data?.session && !error;
      
      if (!alive) return;

      if (!hasSession) {
        router.replace(`/account?next=${encodeURIComponent(pathname || '/')}`);
        return;
      }

      setOk(true);
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Feldtest: öffentliche Seiten niemals weg-redirecten
      if (publicHere) return;

      if (!session) {
        router.replace(`/account?next=${encodeURIComponent(pathname || '/')}`);
      }
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router, pathname, publicHere]);

  // bewusst leer, damit es nicht flackert
  if (!ok) return null;

  return <>{children}</>;
}