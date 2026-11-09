# Vulkanschnegge 7.0 — The Great Update

Entpacke die ZIP und öffne `v7-prototype/index.html`. Der Offline-Build enthält alle zehn MP3s und alle Grafiken. Alternativ im Spielordner `python -m http.server 8000` ausführen und im Browser `http://localhost:8000` öffnen. Der lokale Server gibt dem Spielstand einen festen Browser-Ursprung. Das Schneggboard liest die Online-Rangliste nur auf Knopfdruck und braucht dafür Internet.

## Spielen

Beim Öffnen des Spiels sinkt der Pixel-Titel vor Schnegg und den fünf Götter-Sternbildern ins Bild. **Start** öffnet direkt die Weltkarte. „Home, At Last“ läuft dabei an derselben Stelle weiter und begleitet die Karte. Falls der Browser Musik erst nach einem Klick zulässt, kannst du sie schon auf dem Titelbild mit **Musik starten** einschalten. Der Prolog beginnt vor der ersten Reise.

- Das Hauptmenü führt zur Weltkarte, zum Endlos-Modus und zum Schneggboard. Im Atlas folgen die illustrierten Biome der Reihenfolge des Seeds. Der Riss erscheint mit dem passenden Story-Kapitel.
- Sieben Pixelart-Bilder erzählen Schneggs Geschichte von der Heimatbucht bis zum Abspann. Das Perk-Menü hat ein eigenes Bild.
- Wähle eine Figur und starte eine neue Kampagne, wenn du mit dieser Figur spielen willst. Derselbe Seed erzeugt dieselbe Karte. Reisen dauern zwischen 2 und 3 Minuten, beschleunigen automatisch und starten pro späterer Zone mit 42 Tempo mehr.
- **A/D oder Pfeiltasten** zum Steuern, **Leertaste** zum Springen und Doppelspringen, **Shift** für den Panzer-Dash und **Esc** für die Karte. Auf Touch-Geräten stehen eigene Tasten zur Verfügung.
- In Gegnerleveln und Bossarenen baut jede Figur beim Lenken Tempo auf. Otter beschleunigt am stärksten, danach folgen Frogo und Schnegg. Loslassen bremst.
- Gegner, Böden und Plattformen haben eigene Biom-Sprites. Münzen tragen ein Spiralrelief. Am Ende der Gegnerlevel wechseln die Zielportale beim Öffnen von orangefarbenen Gittertoren zu türkisen Wirbeln. Boss-Geschosse haben eigene Silhouetten, und Kartenmotive markieren die Regionen.
- Nach Kämpfen wählst du einen Perk. Der Build gilt für alle weiteren Abschnitte der Kampagne. Offene Belohnungen bleiben beim Neuladen erhalten. Der Endlos-Modus hat einen eigenen Startzustand.
- Reisen und Gegnerlevel haben feste Musik pro Kampagnenzone. In Zone 1 läuft „Pixel Depths“, in Zone 2 und 3 „Into the Deep“ und ab Zone 4 „Vulkanschnegge Theme“. Bosse haben ihre eigenen Tracks. Im Endlos-Modus wechseln die Tracks weiterhin mit dem Tempo.
- Der letzte der vier Götter vor dem Riss ergibt sich in dieser Fassung aus der Seed-Reihenfolge. GOD.EXE ist der letzte Kampf. Auf „I AM THE SOURCE“ beim Reveal folgt „RUN THE LOOP“ im Kampf. „Home, At Last“ startet im Abspann.

## Kampf und Perks

- Gegnerlevel führen über sieben oder acht Inseln mit Aufstiegen und Abstiegen. Die Kamera folgt dir auch in der Höhe. Besiege alle Gegner und erreiche das Tor am Ende der Strecke. Ein Sturz kostet ein Herz und setzt dich auf die letzte erreichte Insel zurück.
- Im Riff schnappen Muscheln zu, im Tresor fahren Goldstacheln aus, bei der Diva markieren Scheinwerfer ihre Trefferzone und im Wrack schleudern Wasserfontänen dich hoch. Jede Falle warnt vor dem Angriff und hat eigene Sprites für Ruhe und Aktivierung.
- In Arenen entspricht der Dash-Schaden dem Tempo beim Start geteilt durch drei, auf ganze HP gerundet. Mehr Tempo macht denselben 144-Pixel-Dash schneller. Schneckenzorn verlängert die Strecke unabhängig vom Tempo. Gegnerkontakt oder ein Treffer kostet 35 % des aktuellen Tempos.
- Krabbler starten mit 100 HP, Springer mit 80 HP und gepanzerte Gegner mit 175 HP. Der Lebensbalken sitzt über jedem Gegner. In Zone vier haben sie 225 % ihrer Start-HP.
- Krabbler stürmen in die angekündigte Richtung, Springer markieren ihre Landestelle und gepanzerte Gegner feuern eine Bodenwelle. Ein Dash-Treffer unterbricht ihren Angriff.
- Landungen, Dash und Wind-ups verformen die Sprites kurz. Konter und Treffer zeigen Partikel, einen kurzen Trefferstopp und beim Boss einen sichtbaren Rückstoß. Die Systemeinstellung für reduzierte Bewegung schaltet die zusätzlichen Verformungen, Nachbilder und Partikel ab.
- Zeitpolster verlängert den Eingabepuffer, Kettenreaktion lädt den Dash beim Treffer auf und Durchschlag erhöht den Schaden. Münzschwarm kann pro Abschnitt ein Herz heilen. Bestehende Perks und offene Perk-Auswahlen nutzen dieselben IDs und laden mit ihren überarbeiteten Effekten.

## Bosskämpfe

Vor jedem Boss steht Schnegg in einem eigenen Pixelart-Intro seinem riesigen Gegner gegenüber. Das Bild bleibt drei Sekunden stehen. Mit **Kampf starten** kannst du es direkt überspringen.

In der Verfolgung springst du über Hindernisse und wirfst markierte Geschosse per Dash zurück. Sobald du die Arena erreichst und der Schild gebrochen ist, beginnt das Finale. Herzen und Bossmusik gehen in die nächste Phase mit.

In der Arena wechseln die Bosse nach ihren Angriffsfenstern die Position. Die Diva fliegt, GOD.EXE schwebt, und die übrigen Bosse bleiben in Bodennähe. Die Schussrichtung wird vor dem Schuss angezeigt. Nach einer Salve öffnet sich die Deckung für einen Dash-Treffer. Der Knopf zum Wiederholen startet nach einem Verlust direkt in der Bossarena.

Treffer, eigener Schaden, Blocks und Konter haben eigene Pixel-Effekte und Töne. Schadenszahlen zeigen die verlorenen HP. Bei eigenem Schaden leuchtet der Rand des Spielfelds rot. Mit **Effekte an/aus** schaltest du die Spielgeräusche unabhängig von der Musik.

Der Dash zieht eine türkise Spur und hat einen eigenen Sound. Bei hohem Tempo wird die Spur lavafarben und der Dash klingt kräftiger. In Arenen hörst und siehst du ein kurzes Schlittern, wenn du auf dem Boden aus hohem Tempo abbremst oder gegenlenkst.

## Prozedurale Plattformwege

Seed und Level-ID bestimmen Inselbreiten, Plattformhöhen und Abstände. Jedes Biom hat eigene Folgen aus steigenden und fallenden Plattformen. Die Strecke bleibt beim Neustart reproduzierbar, auch mit einem anderen Perk-Build.

Die maximale Höhe eines Grundsprungs ist `v₀² / (2g)`. Für ein Ziel, das um `Δh` höher liegt, ist die Flugzeit bis zur Landung auf dem absteigenden Teil der Sprungkurve `(v₀ + √(v₀² − 2gΔh)) / g`. Daraus ergibt sich die horizontale Reichweite vom Stand bis zum Lauftempo. Der Generator rechnet mit dem niedrigsten Lauftempo und der höchsten Schwerkraft der Grundfiguren, nimmt die kleinere Reichweite beider Richtungen und verwendet höchstens 72 Prozent davon.

## Testmodus

Gib auf der Weltkarte im Feld **Seed** `admin` ein und drücke **Enter**. Mit **Abschnitt überspringen** kannst du Reisen, Gegnerlevel und Bossarenen sofort abschließen. In der Verfolgung bringt dich **Zur Bossarena** direkt ins Finale. Nach einem übersprungenen Kampf folgt die reguläre Perk-Auswahl. Der Testmodus startet mit einer Kopie deiner Kampagne und speichert keine Kampagnenfortschritte oder Rekorde. Erneut `admin` eingeben oder die Seite neu laden, um zum regulären Spielstand zurückzukehren.

## Tests

Im Spielordner `node --test tests/smoke.test.js` ausführen. Für die Prüfung des vollständigen Offline-Pakets unter Linux oder macOS `REQUIRE_OFFLINE_MEDIA=1 node --test tests/smoke.test.js` verwenden.

Die 36 Tests prüfen unter anderem die Dash-Distanz, Gegner-HP, Bossbewegungen und die Sound- und Bewegungseffekte. Eine separate Simulation prüfte für 40 Seeds die Plattformwege mit allen drei Grundfiguren in beide Richtungen.

## Messung des Runners vor dem Kampf-Update

Node-Simulation mit der Offline-Fassung von PR #9 als Ausgangspunkt. Pro Stand fünf Endlosläufe von je zehn simulierten Minuten mit 60 Updates pro Sekunde und deaktiviertem Trefferschaden. Zeiten messen Start und Logik im Testprozess. Browser-Paint und Medien-Decoding sind darin nicht enthalten.

| Messwert | PR #9 | Great Update |
| --- | ---: | ---: |
| Laden der Runner-Module und erster Runner, Median | 0,58 ms | 0,55 ms |
| Ein Logik-Update, 95. Perzentil | 0,0040 ms | 0,0038 ms |
| Maximum gehaltener Hindernisse, Münzen und Plattformen | 144 | 32 |
| Heap-Differenz nach fünf Neustarts und Garbage Collection | −26 KiB | −70 KiB |

Die Heap-Differenzen schwanken im kleinen Bereich. Aus ihnen lässt sich keine Aussage zum Speicherbedarf im Browser ableiten.

## GitHub

Die Änderungen zum Stand von PR #9 liegen ausschließlich in `v7-prototype/`. Im GitHub-Quellstand liegen alle Grafiken. Die MP3s liegen in der Offline-ZIP. Wenn die lokalen Boss-Tracks fehlen, greift der Quellstand auf einen Runner-Loop zurück.
