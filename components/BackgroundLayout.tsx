"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import LogoutButton from "./LogoutButton";
import InfoButton from './InfoButton';

type BackgroundLayoutProps = {
  children: React.ReactNode;
  /** Wenn false: Logout-Button wird nicht angezeigt (z. B. auf /version). */
  showLogout?: boolean;

  /**
   * Optional: aktives Theme aus /quotes (oder anderen Seiten).
   * Hinweis: Der Notizen-Button wird NICHT mehr im BackgroundLayout gerendert,
   * sondern wird auf der Quotes-Seite neben dem Podcast-Button platziert.
   */
  activeThemeId?: string;
};

export default function BackgroundLayout({
  children,
  showLogout = true,
  activeThemeId: _activeThemeId,
}: BackgroundLayoutProps) {
  // bleibt als Prop bestehen (kompatibel), wird aber hier nicht mehr genutzt
  void _activeThemeId;

  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setHasSession(!!data?.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setHasSession(!!session);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="relative w-full min-h-[100dvh] overflow-x-hidden">
      {/* Feste globale Hintergrundebene */}
      <div
        className="pointer-events-none fixed inset-0 z-0 print:hidden"
        aria-hidden="true"
      >
        <Image
          src="/images/cover-01.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {/* Mobile: Lesbarkeit */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] sm:hidden" />
        {/* Ab Tablet: leichte Abdunklung */}
        <div className="absolute inset-0 hidden bg-black/10 sm:block" />
      </div>

      {/* Logo + Info + Logout immer fixiert */}
      <div className="fixed top-3 right-3 z-50 w-[120px] max-w-[40vw] print:hidden sm:top-4 sm:right-4 sm:w-[170px] md:w-[200px]">
        <div className="pointer-events-none" aria-hidden="true">
          <Image
            src="/images/logo.jpg"
            alt=""
            width={400}
            height={150}
            priority
            style={{ width: "100%", height: "auto" }}
          />
        </div>

        <div className="mt-2 flex flex-col items-end gap-4 pointer-events-auto">
          <InfoButton className="cursor-pointer rounded-xl bg-[#F29420] text-white w-11 h-11 flex items-center justify-center text-2xl leading-none shadow-md ring-1 ring-orange-200 transition hover:-translate-y-0.5 hover:bg-[#E4891E] hover:shadow-xl hover:ring-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F29420]" />

          {showLogout && hasSession ? (
            <LogoutButton />
          ) : null}
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 flex w-full justify-center px-4 pt-28 pb-6 print:px-0 print:pt-0 print:pb-0 sm:px-[62px] sm:py-[70px]">
        {children}
      </main>
    </div>
  );
}