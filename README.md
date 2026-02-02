# Das Thema der Woche – App (Edition 1)

## Kurzbeschreibung
„Das Thema der Woche“ ist eine kleine Web-App zur einfachen Wochenplanung mit thematischen Impulsen.  
Nutzer*innen wählen die Anzahl der Wochen, ein Startdatum (Montag) und entscheiden, ob Themen zufällig oder manuell ausgewählt werden. Die Planung wird lokal im Browser gespeichert.

## Zielgruppe
- Trainer*innen, Coaches
- Teams und Organisationen
- Menschen, die mit Wochenimpulsen (Mo–Fr) arbeiten

## Kernnutzen
- Klarer Fokus pro Woche
- Konkrete Tagesimpulse (Montag bis Freitag)
- Schnelle Einrichtung ohne Account
- Lokale Speicherung (LocalStorage)

## Funktionsumfang (Edition 1)

### Enthalten
- Startseite (Deckblatt)
- Setup (`/setup`)
  - Wochenanzahl (1–41)
  - Startdatum (nur Montag)
  - Modus: Zufall oder Manuell
- Themenauswahl (`/themes`)
  - 41 Wochenthemen
  - alphabetisch sortiert
  - Auswahl-Limit = Wochenanzahl
- Lokale Speicherung der Planung (Draft)

### In Arbeit / folgt
- Plan-Generierung (`/plan`)
- Wochenansicht (Mo–Fr)
- Verknüpfung mit Zitaten & Tagesfragen (`edition1.json`)
- Reset / Neu planen / Fortsetzen

## UX-Prinzipien
- Wenige Schritte, klare Sprache
- Konsistentes Layout (Hintergrundbild + Overlay + Content-Card)
- Barrierearm & verständlich
- Kein Overengineering – iterativ & pragmatisch

## Technik
- Framework: Next.js (App Router)
- Hosting: Vercel
- Speicherung: LocalStorage
- Entwicklung: Webpack-Dev-Server (Turbopack deaktiviert)

## Projektstatus
- Startseite: ✅
- Setup-Seite: ✅
- Themenauswahl: ✅
- Plan-Logik: ⏳ in Vorbereitung

## Arbeitsweise
- Schritt-für-Schritt-Entwicklung
- Änderungen erst nach visueller Prüfung
- Fokus auf Verständlichkeit & UX-Kohärenz

---

© as-courage – Das Thema der Woche
