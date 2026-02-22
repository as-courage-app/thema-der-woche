'use client';
import React from "react";
import Image from "next/image";
import LogoutButton from "./LogoutButton";

type BackgroundLayoutProps = {
  children: React.ReactNode;
  /** Wenn false: Logout-Button wird nicht angezeigt (z. B. auf /version). */
  showLogout?: boolean;
};

export default function BackgroundLayout({
  children,
  showLogout = true,
}: BackgroundLayoutProps) {
  return (
    <div className="relative w-full min-h-[100dvh] overflow-x-hidden">
      {/* Hintergrundbild */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
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
        <div className="absolute inset-0 bg-black/10 hidden sm:block" />
      </div>

      {/* Logo + optional Logout */}
      <div className="absolute top-3 right-3 z-50 w-[120px] max-w-[40vw] sm:top-4 sm:right-4 sm:w-[170px] md:w-[200px]">
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

        {showLogout ? (
          <div className="mt-2 flex justify-end pointer-events-auto">
            <LogoutButton className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50" />
          </div>
        ) : null}
      </div>

      {/* Content */}
      <main className="relative z-10 flex w-full justify-center px-4 pt-20 pb-6 sm:px-[62px] sm:py-[70px]">
        {children}
      </main>
    </div>
  );
}