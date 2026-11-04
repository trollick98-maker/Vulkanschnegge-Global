# Vulkanschnegge 7.0 – Hybrid-Prototyp mit Rückübernahme aus 6.4

**Eigenständiger Entwicklungsstand** – die historische 6.4, `main` und der erste V7-Prototyp bleiben unverändert.

## Lokal starten

`index.html` in Chrome/Edge doppelklicken. Für die modulare Version empfohlen:

```bash
cd Vulkanschnegge_7_Prototyp
py -m http.server 8000
```

Dann `http://localhost:8000` aufrufen. Für die originalen Charakter- und Hindernis-Sprites sowie die drei alten MP3-Titel ist eine Internetverbindung nötig; wenn der Bilder-Host nicht erreichbar ist, erscheinen Canvas-Platzhalter. Das Kernspiel selbst funktioniert offline.

## Weltkarte und Spielmodi

- **Strömungskanal:** Kurze Runner-Strecke mit Finish, Münzen, Hindernissen, Doppeljumps und Upgrades.
- **Endlos-Modus:** Klassische Highscore-Jagd ohne Ziel; die Strecke wird nachgeladen, das Tempo wächst und Upgrades werden nach überholten Hindernissen angeboten.
- **Muränenring:** Freie Bewegung, Dash mit Momentum-Bonus, Rebound, drei kleine Gegner und eine Muräne, die nur im goldenen Schwachstellen-Fenster Schaden nimmt.

## Rückübernommene Funktionen aus Version 6.4

- Originale Charakterbilder für **Schnegg**, **Otter im Eimer** und **Frogo**, plus ursprüngliches Hindernisbild. Quellen sind unverändert die alten Imgur-Dateien; bei Ladefehlern wird Ersatz-Art gezeichnet.
- Charakterwahl und unterschiedliche Werte: Schnegg +1 HP/langsamer/mehr Gravity; Otter größerer Münz-Magnet; Frogo geringere Gravity.
- **16 Perk-Typen** aus dem 6.4-Katalog: Extrajumps, Gold-/Speed-Multiplikatoren, HP, Magnet, Gravitation, Tiny/Fat, Spin, Sisyphos etc. Auf den kürzeren 7.0-Runner angepasst; die Perks werden **nur für den jeweiligen Run** erworben.
- Münzen, Speed-Scoring, Multiplikatoren, HP-Anzeige, Upgrade-Fortschritt und Reset.
- **Originalmusik**: Pixel Depths, Into the Deep, Vulkanschnegge Theme; automatische Übergänge nach Geschwindigkeit bzw. Bossphase, Musik ein/aus und Lautstärkeregelung.
- Spielername, lokale V7-Rekorde im Schneggboard und Import des 6.4-Lokal-Highscores, soweit noch im selben Browser gespeichert.
- Das frühere **Online-Schneggboard kann optional nur lesend** geöffnet werden. **V7-Prototypdaten werden nicht an die 6.4-Firebase-Datenbank übermittelt.** Wenn Firebase/Netzwerk nicht erreichbar sind, bleibt die lokale Rangliste verfügbar.
- Vollbild, Tastatur-/Touch-Bedienung und Modus-Neustart.

## Steuerung

| Taste | Wirkung |
| --- | --- |
| A/D oder Pfeile links/rechts | Bewegung im Kampf |
| Leertaste, W oder Pfeil nach oben | Springen / Doppelsprung |
| Shift oder J | Panzer-Dash / Runner-Boost |
| Esc | Weltkarte |

Perks können während eines Runs durch Klick auf eine der drei angezeigten Optionen gewählt werden.

## Architektur

`js/config.js` – Grunddaten; `js/assets.js` – originale Sprites; `js/profile.js` – Charakterwahl/Speicherstand; `js/upgrades.js` – ursprünglicher Perk-Katalog; `js/audio.js` – drei dynamische Musikstücke; `js/online-board.js` – **nur lesendes** 6.4-Schneggboard; `js/input.js` – Steuerung; `js/runner.js` – Story-/Endlosrunner; `js/combat.js` – Kampfphysik und Boss; `js/render.js` – Canvas; `js/main.js` – Menüs, HUD und Szenenwechsel.

## Qualitätssicherung

```bash
node --test tests/smoke.test.js
```

11 Node-Regressionstests plus Browser-Smoke-Test (Weltkarte, Auswahl, Endlosmodus, Perks, Bossraum, Reset, Schneggboard). Die Browser-Umgebung hatte keinen Zugriff auf externe Bild- und Musik-Hosts; deren tatsächliche Auslieferung ist auf dem lokalen PC zu prüfen. Der Live-Firebase-Zugriff wurde ebenfalls nicht mit echten Zugangsdaten oder Schreibvorgängen getestet.

## Noch offen

Dies ist ein Prototyp, **kein vollständiges V7-Spiel**. Animationen und Bossgrafiken sind teilweise Platzhalter. Es fehlt die vollständige 6.4-Online-Score-Übermittlung (bewusst isoliert), der alte Weltrekord-Spruch als interaktives Schreibfeature und der 6.4-Endloscode wurde für 7.0 neu adaptiert, nicht bytegenau kopiert. Spätere Arbeit: Sound-/Sprite-Dateien lokal paketieren, Level-Balancing, Browser-/Mobiltest, sichere V7-Server-Rangliste und weitere Story-Gebiete.

## Stabilitätspflege (04.11.2026)

- Endlos-Strecke nutzt unabhängige Spawn-Zähler für neue Münzen und Hindernisse. Dadurch funktionieren Spawn und Bereinigung auch nach der Münz-Spawnperk-Auswahl oder leer gewordenen Objektlisten stabil.
- Adaptive Musik initialisiert den aktiven Track über dieselbe Logik wie spätere Musikwechsel; die erste Wiedergabe bleibt nicht versehentlich lautlos.
- Zwei zusätzliche Regressionstests für diese Fälle, ausführbar mit `node --test tests/smoke.test.js`.
- Alte Version 6.4 und die bisherigen Entwicklungsstände bleiben unverändert; Änderungen nur im dedizierten Bugfix-Branch.
