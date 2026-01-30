export default function Home() {
  const today = new Date();
  const weekday = today.getDay(); // 0 = Sonntag, 6 = Samstag

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const formattedDate = today.toLocaleDateString("de-DE", options);

  const isWeekend = weekday === 0 || weekday === 6;

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Das Thema der Woche</h1>

      <p style={{ fontSize: "1.2rem", marginTop: "1rem" }}>
        {formattedDate}
      </p>

      <div style={{ marginTop: "3rem", fontSize: "1.4rem" }}>
        {isWeekend ? (
          <strong>Schönes Wochenende ☀️</strong>
        ) : (
          <strong>Willkommen! Die Tagesfrage folgt gleich.</strong>
        )}
      </div>

      <p style={{ marginTop: "2rem", color: "#555" }}>
        1. Edition · Zeitlose Fragen und Impulse für Führung und wertschätzende Kommunikation
      </p>
    </main>
  );
}
