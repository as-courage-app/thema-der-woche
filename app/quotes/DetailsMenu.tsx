'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type DetailsMenuProps = {
  themeId?: string;
  currentUserPlan?: 'A' | 'B' | 'C' | null;
  onBlockedClick?: (message: string) => void;
};

export default function DetailsMenu({
  themeId,
  currentUserPlan,
  onBlockedClick,
}: DetailsMenuProps) {
  const [open, setOpen] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleWindowFocus() {
      setOpen(false);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const kurzHref = themeId
    ? `/details?themeId=${encodeURIComponent(themeId)}&view=kurz`
    : '/details?view=kurz';

  const langHref = themeId
    ? `/details?themeId=${encodeURIComponent(themeId)}&view=lang`
    : '/details?view=lang';

  const infografikHref = themeId
    ? `/infografik?themeId=${encodeURIComponent(themeId)}`
    : '/infografik';

  function handleDetailsClick() {
    if (currentUserPlan !== 'C') {
      setOpen(false);

      if (onBlockedClick) {
        onBlockedClick('Details in Variante C verfügbar.');
      } else {
        setPlanNotice((prev) =>
          prev ? null : 'Details in Variante C verfügbar.',
        );
      }

      return;
    }

    setPlanNotice(null);
    setOpen((prev) => !prev);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative inline-flex flex-col items-end">
        <button
          type="button"
          onClick={handleDetailsClick}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:shadow-lg cursor-pointer"
          title="Details öffnen"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ❗
          </span>
          Details
        </button>

        {planNotice && (
          <div className="absolute top-full right-0 z-30 mt-2 w-max max-w-[260px] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm">
            {planNotice}
          </div>
        )}
      </div>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <Link
            href={kurzHref}
            className="block rounded-lg px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Kurzversion
          </Link>

          <Link
            href={langHref}
            className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Langversion
          </Link>

          <Link
            href={infografikHref}
            className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Infografik
          </Link>
        </div>
      ) : null}
    </div>
  );
}