import React from "react";
import Image from "next/image";

type BackgroundLayoutProps = {
  children: React.ReactNode;
};

export default function BackgroundLayout({ children }: BackgroundLayoutProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden", // kein Scrollbalken
      }}
    >
      {/* Hintergrundbild */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <Image
          src="/images/cover-01.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>

      {/* Logo – unverändert, ohne Overlay davor */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 2,
          width: "200px",
          maxWidth: "40vw",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <Image
          src="/images/logo.jpg"
          alt=""
          width={400}
          height={150}
          priority
          style={{
            width: "100%",
            height: "auto",
          }}
        />
      </div>

      {/* Content – zentriert, mit mehr Luft links/rechts (62px) */}
      <main
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "70px 62px", // oben/unten 24px, links/rechts 62px (≈ 38px weniger Content je Seite)
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
}
