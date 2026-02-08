'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const APP_MODE_KEY = 'as-courage.appMode.v1';

export default function FullEntryPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem(APP_MODE_KEY, 'full');
    router.replace('/start'); // ✅ nach der Wahl zur Startseite (Free/Full sichtbar)
  }, [router]);

  return null;
}
