import React from "react";
import Image from "next/image";

type BackgroundLayoutProps = {
  children: React.ReactNode;
};

export default function BackgroundLayout({ children }: BackgroundLayoutProps) {
  return (
    <div className="relative w-full min-h-[100dvh] overflow-x-hidden">
      {/* Hintergrundbild: immer da, auf Mobile dezent */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/images/cover-01.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
        {/* Mobile: Abdunklung/Weichzeichnung, damit Inhalt lesbar bleibt */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] sm:hidden" />
        {/* Ab Tablet: nur leichte Abdunklung, damit Bild wirken darf */}
        <div className="absolute inset-0 bg-black/10 hidden sm:block" />
      </div>

      {/* Logo: immer sichtbar, aber auf Mobile klein und zurückhaltend */}
      <div
        className="pointer-events-none absolute top-3 right-3 z-20 w-[120px] max-w-[40vw] sm:top-4 sm:right-4 sm:w-[170px] md:w-[200px]"
        aria-hidden="true"
      >
        <Image
          src="/images/logo.jpg"
          alt=""
          width={400}
          height={150}
          priority
          style={{ width: "100%", height: "auto" }}
        />
      </div>

      {/* Content: Mobile oben starten + scrollen, ab Tablet zentrieren */}
      <main className="relative z-10 flex w-full justify-center px-4 pt-20 pb-6 sm:px-[62px] sm:py-[70px]">
        {children}
      </main>
    </div>
  );
}
