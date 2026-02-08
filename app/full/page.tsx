'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_MODE_KEY } from '@/lib/appMode';

export default function FullEntryPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem(APP_MODE_KEY, 'full');
    router.replace('/themes');
  }, [router]);

  return null;
}
