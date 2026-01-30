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
      .then((json) => setData(json.eintraege));
  }, []);

  const today = new Date();
  const weekday = today.getDay();
  const isWeekend = weekday === 0 || weekday === 6;

  const formattedDate = today.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const startDate = new Date("2026-02-02");
  const diffWeeks = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );

  const entry =
    diffWeeks >= 0 && diffWeeks < data.length ? data[diffWeeks] : null;

  const dayMap = ["", "Mo", "Di", "Mi", "Do", "Fr"];
  const todayQuestion =
    !isWeekend && entry ? entry.tage[dayMap[weekday]] : " ";

  const topLine =
    "Zeitlose Fragen und Impulse fuer Fuehrung und wertschaetzende Kommunikation - 1. Edition";

  const MenuButton = ({
    label,
    target,
  }: {
    label: string;
    target: View;
  }) => (
    <button
      onClick={() => setView(target)}
      style={{
        padding: "0.7rem 1rem",
        border: "1px solid #000",
        background: view === target ? "#000" : "transparent",
        color: view === target ? "#fff" : "#000",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

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
      }}
    >
      <div style={{ position: "relative" }}>
        <img
          src="/images/logo.jpg"
          alt="as-courage"
          style={{
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            width: "260px",
          }}
        />

        <div style={{ fontSize: "1.25rem", fontWeight: 500 }}>{topLine}</div>
        <div style={{ fontSize: "1.4rem", fontWeight: 500, marginTop: "0.8rem" }}>
          {formattedDate} 
        </div>

        <h1 style={{ fontSize: "2.6rem", marginTop: "1.2rem" }}>
          {entry ? entry.thema : "Thema wird geladen"}
        </h1>

        <div style={{ display: "flex", gap: "0.8rem", marginTop: "1.5rem" }}>
          <MenuButton label="Zitat der Woche" target="quote" />
          <MenuButton label="Tagesfrage" target="day" />
          <MenuButton label="Alle Fragen der Woche" target="week" />
        </div>

        <section style={{ marginTop: "2.2rem" }}>
          {view === "day" && (
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>
              {isWeekend ? "Schoenes Wochenende" : todayQuestion}
            </div>
          )}

          {view === "quote" && entry && (
            <blockquote style={{ fontSize: "1.6rem", fontStyle: "italic" }}>
              "{entry.zitat}"
            </blockquote>
          )}

          {view === "week" && entry && (
            <div style={{ marginTop: "1rem" }}>
              {["Mo", "Di", "Mi", "Do", "Fr"].map((d) => (
                <div
                  key={d}
                  style={{ display: "flex", gap: "0.8rem", fontWeight: 700 }}
                >
                  <div style={{ width: "2.4rem" }}>{d}:</div>
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
