# Vulkanschnegge 7.0 — Boss-Runner

Spiel starten: `index.html` öffnen. Alternativ im Spielordner `py -m http.server 8000` ausführen und `http://localhost:8000` öffnen.

**Level:** Strömungskanal, Endlos-Modus, Muränenring.

**Bosskampf:** Die Welt scrollt automatisch; die Muräne bleibt rechts. Mit **Leertaste** springen / doppelspringen, **Shift** zum Dashen. **Rote** Projektile per Dash zurückwerfen (so verliert die Muräne Leben), **grünen** ausweichen. Auf Plattformen landen, Minen meiden, Kisten mit Dash zerstören. **A/D** zur Feinpositionierung. **Esc** zurück zur Weltkarte.

Die drei Musikstufen wechseln im Runner bei deutlich höherer Geschwindigkeit und nach Mindestlaufzeiten. Im Bosskampf läuft eine feste Musikzone.

**Tests:** `node --test tests/smoke.test.js`. Alle sechs zusätzlichen PNG-Sprites und die bisherigen Charakterbilder/Musikstücke liegen unter `assets/`.
