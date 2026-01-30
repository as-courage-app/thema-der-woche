"use client";

import { useEffect, useState } from "react";

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
      .then((json) => setData(json.eintraege || []))
      .catch(() => setData([]));
  }, []);

  const today = new Date();
  const weekday = today.getDay(); // 0=So ... 6=Sa
  const isWeekend = weekday === 0 || weekday === 6;

  const formattedDate = today.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Startdatum der 1. Edition: Montag, 02.02.2026
  const startDate = new Date("2026-02-02T00:00:00");
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const diffWeeks = Math.floor((today.getTime() - startDate.getTime()) / msPerWeek);

  const index = diffWeeks >= 0 ? diffWeeks : 0;
  const entry: Entry | null = index < data.length ? data[index] : null;

  const dayKeys = ["", "Mo", "Di", "Mi", "Do", "Fr"];
  const todayKey = dayKeys[weekday] || "";

  const todayQuestion =
    !isWeekend && entry && todayKey ? entry.tage[todayKey] : "";

  const topLine =
    "Zeitlose Fragen und Impulse fuer Fuehrung und wertschaetzende Kommunikation - 1. Edition";

  function MenuButton(props: { label: string; target: View }) {
    const active = view === props.target;
    return (
      <button
        onClick={() => setView(props.target)}
        style={{
          padding: "0.85rem 1.1rem",
          border: "1px solid #000",
          background: active ? "#000" : "transparent",
          color: active ? "#fff" : "#000",
          cursor: "pointer",
          fontSize: "1.1rem",
          fontWeight: 700,
        }}
      >
        {props.label}
      </button>
    );
  }

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
        color: "#000",
        fontSize: "1.1rem",
        lineHeight: 1.5,
      }}
    >
      <div style={{ position: "relative" }}>
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

        {/* Kopfzeile */}
        <div style={{ fontSize: "1.55rem", fontWeight: 700, color: "#000" }}>
          {topLine}
        </div>

        {/* Datum */}
        <div style={{ fontSize: "1.7rem", fontWeight: 700, marginTop: "0.6rem", color: "#000" }}>
          {formattedDate}
        </div>

        {/* Thema dominant */}
        <h1 style={{ fontSize: "3.1rem", marginTop: "1.0rem", color: "#000" }}>
          {entry ? entry.thema : "Thema wird geladen"}
        </h1>

        {/* Menue */}
        <div style={{ display: "flex", gap: "0.9rem", marginTop: "1.2rem", flexWrap: "wrap" }}>
          <MenuButton label="Zitat der Woche" target="quote" />
          <MenuButton label="Tagesfrage" target="day" />
          <MenuButton label="Alle Fragen der Woche" target="week" />
        </div>

        {/* Inhalt */}
        <section style={{ marginTop: "2.0rem" }}>
          {/* Tagesfrage */}
          {view === "day" && (
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#000" }}>
              {isWeekend ? "Schoenes Wochenende" : todayQuestion}
            </div>
          )}

          {/* Zitat */}
          {view === "quote" && (
            <blockquote
              style={{
                marginTop: "1rem",
                fontSize: "2.0rem",
                fontStyle: "italic",
                fontWeight: 700,
                color: "#000",
              }}
            >
              {entry ? '"' + entry.zitat + '"' : '"..."'}
            </blockquote>
          )}

          {/* Wochenfragen */}
          {view === "week" && entry && (
            <div style={{ marginTop: "0.8rem" }}>
              {["Mo", "Di", "Mi", "Do", "Fr"].map((d) => (
                <div key={d} style={{ display: "flex", gap: "1rem", marginBottom: "0.5rem" }}>
                  {/* Label-Spalte (Einzug) */}
                  <div style={{ width: "3rem", fontWeight: 800, fontSize: "1.7rem", color: "#000" }}>
                    {d}:
                  </div>
                  {/* Frage fett */}
                  <div style={{ fontWeight: 800, fontSize: "1.7rem", color: "#000" }}>
                    {entry.tage[d]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
 
