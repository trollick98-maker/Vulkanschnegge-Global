# Vulkanschnegge 7.0 – World / Runner / Combat Prototype

Eigenständiger, spielbarer Konzeptprototyp. **Er verändert weder Version 6.4 noch historische Branches oder Dateien.**

## Spielen

`index.html` einfach doppelklicken (Chrome/Edge/Firefox). Internetzugang, Datenbank, Pakete und Server sind nicht nötig. Bei Bedarf im Verzeichnis `python -m http.server 8000` und `http://localhost:8000` öffnen.

## Enthalten

- **Weltkarte:** Zwei frei anwählbare Level, lokale Speicherung abgeschlossener Level.
- **Runner / Strömungskanal:** Automatisches Scrolling, Doppelsprung, Münzen, Hindernisse, Panzer-Boost gegen lila Trümmer, Ziellinie.
- **Combat / Muränenring:** Freie Bewegung, Doppelsprung, Momentum-Dash, Rebound, drei leicht zu besiegende normale Gegner und ein Miniboss mit telegraphierter Boden-Stoßwelle und Verwundbarkeitsphasen.
- **Grafik:** Prozedural im Canvas gezeichnet, keine externen Assets / Audio-Abhängigkeiten.

## Steuerung

- `A` / `D` oder Pfeiltasten: Laufen (Combat)
- `Leertaste` / `W` / `Pfeil hoch`: Springen und Doppelsprung
- `Shift` / `J`: Panzer-Dash bzw. Boost
- `Esc`: zurück zur Weltkarte
- Touch-Geräte: eingeblendete Richtungstasten und Aktionsbuttons (Querformat empfohlen)

## Kampfregeln

Ein Dash trifft kleine Gegner sofort und erzeugt einen Rebound. Der erste Dash benötigt keinen Anlauf. Mit Schwung über ca. 195 px/s verursacht der Dash **2 statt 1** Schaden am Boss. Die Muräne ist ausschließlich in der goldenen Phase nach ihrer Stoßwelle verletzlich. Der Angriff wird zuvor rot angekündigt; die Bodenwelle lässt sich überspringen. Jeder erfolgreiche Treffer öffnet die Möglichkeit, die Flugbahn erneut zu kontrollieren.

## Architektur

`config.js` (Konstanten, Kollisionsprüfung, Speicherstand), `input.js` (Tastatur/Touch), `runner.js` (Runner-Logik), `combat.js` (Kampf-Physik/AI), `render.js` (Canvas-Zeichnung), `main.js` (Scene-Manager, HUD, Levelwechsel). Keine Build-Tools.

## Testen

`node --test tests/smoke.test.js`

## Grenzen / nächste Iteration

Dies ist ein **Vertical Slice**, kein vollständiges 7.0-Spiel. Keine NPCs, Story-Sequenzen, echte Open World, Online-Scores, ausgearbeiteten Gegner-KI, Gamepad-Steuerung oder externe Musik. Balancing, mobile Querformat-Usability und Grafik sind vorläufig. Die alte 6.4 bleibt weiterhin separat verfügbar.
