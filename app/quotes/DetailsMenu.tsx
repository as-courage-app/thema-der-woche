'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type DetailsMenuProps = {
  themeId?: string;
};

export default function DetailsMenu({ themeId }: DetailsMenuProps) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-100 hover:border-slate-400 hover:shadow-md cursor-pointer"
        title="Details öffnen"
      >
        <span aria-hidden="true" className="text-base leading-none">❗</span>
        Details
      </button>

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
        </div>
      ) : null}
    </div>
  );
}