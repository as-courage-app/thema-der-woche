export const APP_MODE_KEY = 'as-courage.appMode.v1';

export type AppMode = 'free' | 'full';

export function getAppMode(): AppMode {
  if (typeof window === 'undefined') return 'full';
  const mode = window.localStorage.getItem(APP_MODE_KEY);
return mode === 'free' || mode === 'full' ? mode : 'full';
}

export const FREE_ALLOWED_THEMES = new Set<string>([
  'ed1-01-anerkennung-1',
  'ed1-02-belastung',
  'ed1-03-diskriminierung',
  'ed1-04-ehrlichkeit',
]);

export const FREE_WEEKS_COUNT = 2;
