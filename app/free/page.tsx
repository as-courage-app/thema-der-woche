'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const APP_MODE_KEY = 'as-courage.appMode.v1';

export default function FreeEntryPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem(APP_MODE_KEY, 'free');
    router.replace('/start'); // ✅ nach der Wahl zur Startseite (Free/Full sichtbar)
  }, [router]);

  return null;
}
