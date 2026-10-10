# Vulkanschnegge – Phase A (Stabilität und Struktur)

Entwicklungsbranch: `phase-a/stability-modules`, erstellt von `refactor/modular-v6-4`. Weder `main` noch der Ausgangsbranch wurden verändert.

## Laufzeit-Dateien

1. `index.html` – HTML-Struktur und Script-Ladereihenfolge
2. `styles.css` – Darstellung
3. `js/setup.js` – Geräteerkennung, Assets, Hauptmenü, Charakterauswahl und zentrale Variablen
4. `js/upgrades.js` – Upgrade-Katalog und Auswahl
5. `js/player.js` – Spieler, Run-Reset, Score-Übermittlung, Bewegungsinputs und Spawns
6. `js/engine.js` – Canvas-Rendering und Game-Loop
7. `js/audio.js`, `js/leaderboard.js`, `js/ui.js`, `js/firebase.js` – weitere Dienste

`js/game.js` bleibt vorerst **als unveränderte Referenzdatei** im Branch, wird aber von `index.html` nicht mehr geladen.

## Fehlerkorrekturen

- Nach Bestätigung einer Charakterwahl wird ein neuer Run vollständig zurückgesetzt. Damit bleiben keine gekauften Upgrades, alten Scores oder Geschwindigkeitsänderungen vom vorherigen Charakter erhalten.
- Die erste Charakterwahl bleibt pausiert, bis sie bestätigt wurde.
- Ein Reset entfernt zurückgebliebene Partikel des vorherigen Runs.

## Testen

Für lokales Testen im Repository-Ordner: `py -m http.server 8000`, danach `http://localhost:8000`.

**Manuelle Testfälle:** Startmenü → Namen eingeben → Figur auswählen → Sprung → Münze sammeln → Upgrade erhalten → Reset → Figur wechseln → Game Over → Leaderboard → Mobile/Fullscreen/Audio.

**Status:** Struktur und Quelltext wurden statisch abgeglichen, aber ein interaktiver Browser-Test wurde nicht durchgeführt. Gleiche externe Bilder, Audiodateien und Firebase-Datenbank wie Version 6.4. Firestore-Regeln und serverseitige Anti-Cheat-Prüfung sind nicht Teil dieser Phase.
