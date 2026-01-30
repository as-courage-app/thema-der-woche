"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  thema: string;
  zitat: string;
  tage: Record<string, string>;
};

type View = "quote" | "day" | "week";

export default function Home() {
  const [data, setData] = useState<Entry[]>([]);
  const [view, setView] = useState<View>("day");

  useEffect(() => {
    fetch("/data/edition1.json")
      .then((res) => res.json())
      .then((json) => setData(json.eintraege));
  }, []);

  const today = new Date();
  const weekday = today.getDay(); // 0 = So, 6 = Sa
  const isWeekend = weekday === 0 || weekday === 6;

  const formattedDate = useMemo(() => {
    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    return today.toLocaleDateString("de-DE", dateOptions);
  }, [today]);

  // Startdatum der Edition: Montag, 02.02.2026
  const startDate = new Date("2026-02-02");
  const diffTime = today.getTime() - startDate.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  const weekIndex = diffWeeks >= 0 ? diffWeeks : 0;

  const entry = data[weekIndex];

  const dayMap = ["", "Mo", "Di", "Mi", "Do", "Fr"];
  const dayKey = dayMap[weekday];
  const todayQuestion =
    !isWeekend && entry && dayKey ? entry.tage[dayKey] : null;

  const topLine =
    "Zeitlose Fragen und Impulse für Führung und wertschätzende Kommunikation – 1. Edition";

  const MenuButton = ({
    label,
    target,
  }: {
    label: string;
    target: View;
  }) => {
    const active = view === target;
    return (
      <button
        onClick={() => setView(target)}
        style={{
          padding: "0.7rem 1rem",
          fontSize: "1rem",
          cursor: "pointer",
          border: "1px solid #000",
          background: active ? "#000" : "transparent",
          color: active ? "#fff" : "#000",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <main
  style={{
    minHeight: "100vh",
    padding: "2rem",
    fontFamily: "Arial, sans-serif",
    backgroundImage: "url(/images/bg.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
  }}
>
{/* Lesbarkeits-Overlay */}
<div
  style={{
    position: "absolute",
    inset: 0,
    background: "rgba(255,255,255,0.65)",
    zIndex: 0,
  }}
/>

{/* Inhalt-Layer */}
<div style={{ position: "relative", zIndex: 1 }}>
  {/* Logo oben rechts */}
  <img
    src="/images/logo.jpg"
    alt="as-courage"
    style={{
      position: "absolute",
      top: "1.5rem",
      right: "1.5rem",
      width: "260px",
      height: "auto",
    }}
  />

      {/* 3) Editionssatz ganz nach oben */}
      <div style={{ fontSize: "0.95rem", color: "#333" }}>{topLine}</div>

      {/* Datum immer sichtbar */}
      <div style={{ marginTop: "0.8rem", fontSize: "1.05rem" }}>
        {formattedDate}
      </div>

      {/* 1) Thema der Woche dominant und immer sichtbar */}
      <h1 style={{ marginTop: "1.2rem", fontSize: "2.2rem" }}>
        {entry ? entry.thema : "Thema wird geladen …"}
      </h1>

      {/* 2) Menüauswahl */}
      <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.5rem" }}>
        <MenuButton label="Zitat der Woche" target="quote" />
        <MenuButton label="Tagesfrage" target="day" />
        <MenuButton label="Alle Fragen der Woche" target="week" />
      </div>

      {/* Inhalt */}
      <section style={{ marginTop: "2.2rem" }}>
        {/* Wochenende Hinweis */}
        {isWeekend && view === "day" && (
          <div style={{ fontSize: "1.5rem" }}>
            <strong>Schönes Wochenende ☀️</strong>
          </div>
        )}

        {/* Zitat */}
        {view === "quote" && entry && (
          <blockquote
            style={{
              marginTop: "1rem",
              fontStyle: "italic",
              fontSize: "1.6rem",
              lineHeight: 1.4,
            }}
          >
            „{entry.zitat}“
          </blockquote>
        )}

        {/* Tagesfrage */}
        {view === "day" && !isWeekend && entry && (
          <div style={{ fontSize: "1.7rem", lineHeight: 1.4 }}>
            <strong>{todayQuestion || "Heute keine Frage verfügbar."}</strong>
          </div>
        )}

        {/* Wochenfragen mit sauberem Einzug */}
        {view === "week" && entry && (
          <div style={{ fontSize: "1.15rem", lineHeight: 1.7 }}>
            {(["Mo", "Di", "Mi", "Do", "Fr"] as const).map((d) => (
              <div key={d} style={{ display: "flex", gap: "0.8rem" }}>
               <div style={{ width: "2.4rem" }}><strong>{d}:</strong></div>
                <div>{entry.tage[d]}</div>
              </div>
            ))}
          </div>
        )}
      </section>
</div> 
</main>
  );
}
