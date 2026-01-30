"use client";

import { useEffect, useState } from "react";

type Entry = {
  thema: string;
  zitat: string;
  tage: Record<string, string>;
};

type View = "day" | "quote" | "questions";

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

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formattedDate = today.toLocaleDateString("de-DE", dateOptions);

  const startDate = new Date("2026-02-02");
  const diffTime = today.getTime() - startDate.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  const weekIndex = diffWeeks >= 0 ? diffWeeks : 0;

  const entry = data[weekIndex];

  const dayMap = ["", "Mo", "Di", "Mi", "Do", "Fr"];
  const dayKey = dayMap[weekday];

  const todayQuestion =
    !isWeekend && entry && dayKey ? entry.tage[dayKey] : null;

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Das Thema der Woche</h1>

      <p style={{ fontSize: "1.1rem", marginTop: "1rem" }}>
        {formattedDate}
      </p>

      {/* VIEW: Tagesfrage */}
      {view === "day" && (
        <>
          <div style={{ marginTop: "2.5rem", fontSize: "1.5rem" }}>
            {isWeekend ? (
              <strong>Schönes Wochenende ☀️</strong>
            ) : (
              <strong>{todayQuestion || "Heute keine Frage verfügbar."}</strong>
            )}
          </div>

          {!isWeekend && entry && (
            <>
              <p style={{ marginTop: "1.5rem", color: "#555" }}>
                Thema der Woche: <strong>{entry.thema}</strong>
              </p>

              <button
                onClick={() => setView("quote")}
                style={{
                  marginTop: "2rem",
                  padding: "0.8rem 1.2rem",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                Zitat der Woche
              </button>
            </>
          )}
        </>
      )}

      {/* VIEW: Zitat */}
      {view === "quote" && entry && (
        <>
          <h2 style={{ marginTop: "3rem" }}>{entry.thema}</h2>

          <blockquote
            style={{
              marginTop: "2rem",
              fontStyle: "italic",
              fontSize: "1.3rem",
            }}
          >
            „{entry.zitat}“
          </blockquote>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem" }}>
            <button
              onClick={() => setView("questions")}
              style={{
                padding: "0.8rem 1.2rem",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Zu den Fragen
            </button>

            <button
              onClick={() => setView("day")}
              style={{
                padding: "0.8rem 1.2rem",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Zur Tagesfrage
            </button>
          </div>
        </>
      )}

      {/* VIEW: Fragen (Mo–Fr) */}
      {view === "questions" && entry && (
        <>
          <h2 style={{ marginTop: "3rem" }}>{entry.thema}</h2>

          <div style={{ marginTop: "2rem", fontSize: "1.1rem", lineHeight: 1.6 }}>
            <div><strong>Mo:</strong> {entry.tage["Mo"]}</div>
            <div><strong>Di:</strong> {entry.tage["Di"]}</div>
            <div><strong>Mi:</strong> {entry.tage["Mi"]}</div>
            <div><strong>Do:</strong> {entry.tage["Do"]}</div>
            <div><strong>Fr:</strong> {entry.tage["Fr"]}</div>
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem" }}>
            <button
              onClick={() => setView("quote")}
              style={{
                padding: "0.8rem 1.2rem",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Zurück zum Zitat
            </button>

            <button
              onClick={() => setView("day")}
              style={{
                padding: "0.8rem 1.2rem",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Zur Tagesfrage
            </button>
          </div>
        </>
      )}

      <p style={{ marginTop: "4rem", color: "#777" }}>
        1. Edition · Zeitlose Fragen und Impulse für Führung und wertschätzende Kommunikation
      </p>
    </main>
  );
}
