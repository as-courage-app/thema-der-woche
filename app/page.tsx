async function getEdition() {
  const res = await fetch(
    "https://das-thema-der-woche.vercel.app/data/edition1.json",
    { cache: "no-store" }
  );
  return res.json();
}

export default async function Home() {
  const data = await getEdition();

  const today = new Date();
  const weekday = today.getDay(); // 0 = So, 1 = Mo ... 6 = Sa

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const formattedDate = today.toLocaleDateString("de-DE", dateOptions);

  const isWeekend = weekday === 0 || weekday === 6;

  // Startdatum der Edition: Montag, 02.02.2026
  const startDate = new Date("2026-02-02");
  const diffTime = today.getTime() - startDate.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

  const currentWeek = diffWeeks >= 0 ? diffWeeks : 0;
  const entry = data.eintraege[currentWeek];

  const dayMap = ["", "Mo", "Di", "Mi", "Do", "Fr"];
  const dayKey = dayMap[weekday];

  const question =
    !isWeekend && entry && dayKey ? entry.tage[dayKey] : null;

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Das Thema der Woche</h1>

      <p style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
        {formattedDate}
      </p>

      <div style={{ marginTop: "2.5rem", fontSize: "1.5rem" }}>
        {isWeekend ? (
          <strong>Schönes Wochenende ☀️</strong>
        ) : (
          <strong>{question || "Heute keine Frage verfügbar."}</strong>
        )}
      </div>

      {!isWeekend && entry && (
        <p style={{ marginTop: "2rem", color: "#555" }}>
          Thema der Woche: <strong>{entry.thema}</strong>
        </p>
      )}

      <p style={{ marginTop: "3rem", color: "#777" }}>
        1. Edition · Zeitlose Fragen und Impulse für Führung und wertschätzende Kommunikation
      </p>
    </main>
  );
}

