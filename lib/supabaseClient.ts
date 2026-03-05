import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const REMEMBER_ME_KEY = 'as-courage.rememberMe.v1';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

// Fallback für Server/SSR oder wenn Storage blockiert ist
const memoryStore = (() => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
  } satisfies StorageLike;
})();

function readRememberMe(): boolean {
  try {
    if (typeof window === 'undefined') return true; // Default: an
    const raw = window.localStorage.getItem(REMEMBER_ME_KEY);
    if (raw === null) return true; // Default: an
    return raw === '1' || raw === 'true';
  } catch {
    return true;
  }
}

function getPreferredStore(): StorageLike {
  try {
    if (typeof window === 'undefined') return memoryStore;
    return readRememberMe() ? window.localStorage : window.sessionStorage;
  } catch {
    return memoryStore;
  }
}

// Supabase Auth Storage Adapter: nutzt je nach “Angemeldet bleiben” localStorage oder sessionStorage
const authStorage: StorageLike = {
  getItem: (key) => getPreferredStore().getItem(key),
  setItem: (key, value) => getPreferredStore().setItem(key, value),
  removeItem: (key) => getPreferredStore().removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});