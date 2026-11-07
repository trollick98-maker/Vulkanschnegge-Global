# Vulkanschnegge 7.0 — The Great Update

Entpacke die ZIP und öffne `v7-prototype/index.html`. Der Offline-Build enthält alle zehn MP3s und alle Grafiken. Alternativ im Spielordner `python -m http.server 8000` ausführen und im Browser `http://localhost:8000` öffnen. Der lokale Server gibt dem Spielstand einen festen Browser-Ursprung. Das Schneggboard liest die Online-Rangliste nur auf Knopfdruck und braucht dafür Internet.

## Spielen

- Wähle eine Figur und starte eine neue Kampagne, wenn du mit dieser Figur spielen willst. Derselbe Seed erzeugt dieselbe Karte. Die Reisezeiten liegen zwischen 2 und 3 Minuten.
- **A/D oder Pfeiltasten** zum Steuern, **Leertaste** zum Springen und Doppelspringen, **Shift** für den Panzer-Dash und **Esc** für die Karte. Auf Touch-Geräten stehen eigene Tasten zur Verfügung.
- Im Gegnerlevel erhöhen Anlauf und Rebounds die Wirkung des Dashs. Im Bossrunner verraten Ansagen und Markierungen die Angriffe. Die konterbaren Geschosse lassen sich mit einem Dash zurückwerfen.
- Gegner und Plattformen haben je Biom eigene Sprites. In der optionalen Hafengasse steht eine Schildkrabbe. Boss-Geschosse haben eigene Silhouetten, und Kartenmotive markieren die Regionen.
- Nach Kämpfen wählst du einen Perk. Der Build gilt für alle weiteren Abschnitte der Kampagne. Offene Belohnungen bleiben beim Neuladen erhalten. Der Endlos-Modus hat einen eigenen Startzustand.
- Reisen und Gegnerlevel haben feste Musik pro Kampagnenzone. In Zone 1 läuft „Pixel Depths“, in Zone 2 und 3 „Into the Deep“ und ab Zone 4 „Vulkanschnegge Theme“. Bosse haben ihre eigenen Tracks. Im Endlos-Modus wechseln die Tracks weiterhin mit dem Tempo.
- Der letzte der vier Götter vor dem Riss ergibt sich in dieser Fassung aus der Seed-Reihenfolge. GOD.EXE ist der letzte Kampf. Auf „I AM THE SOURCE“ beim Reveal folgt „RUN THE LOOP“ im Kampf. „Home, At Last“ startet im Abspann.

## Kampf und Perks

- Gegnerlevel sind scrollende Kampfstrecken mit drei oder vier Inseln. Besiege alle Gegner und erreiche rechts das Tor. Ein Sturz kostet ein Herz und setzt dich auf die letzte erreichte Insel zurück.
- Ein etwas zu früh gedrückter Dash löst aus, sobald die Abklingzeit endet. Im Bosskampf stößt der Dash nach vorn, mit **A/D** auch in die gewählte Richtung. Der Konter hat etwas Reichweite um die Figur und gibt den Dash schneller wieder frei.
- Krabbler stürmen in die angekündigte Richtung, Springer markieren ihre Landestelle und gepanzerte Gegner feuern eine Bodenwelle. Ein Dash-Treffer unterbricht ihren Angriff.
- Landungen, Dash und Wind-ups verformen die Sprites kurz. Konter und Treffer zeigen Partikel, einen kurzen Trefferstopp und beim Boss einen sichtbaren Rückstoß. Die Systemeinstellung für reduzierte Bewegung schaltet die zusätzlichen Verformungen, Nachbilder und Partikel ab.
- Zeitpolster verlängert den Eingabepuffer, Kettenreaktion lädt den Dash beim Treffer auf und Durchschlag erhöht den Schaden. Münzschwarm kann pro Abschnitt ein Herz heilen. Bestehende Perks und offene Perk-Auswahlen nutzen dieselben IDs und laden mit ihren überarbeiteten Effekten.

## Prozedurale Plattformwege

Seed und Level-ID bestimmen Inselbreiten, Plattformhöhen und Abstände. Jedes Biom hat eigene Folgen aus steigenden und fallenden Plattformen. Die Strecke bleibt beim Neustart reproduzierbar, auch mit einem anderen Perk-Build.

Die maximale Höhe eines Grundsprungs ist `v₀² / (2g)`. Für ein Ziel, das um `Δh` höher liegt, ist die Flugzeit bis zur Landung auf dem absteigenden Teil der Sprungkurve `(v₀ + √(v₀² − 2gΔh)) / g`. Daraus ergibt sich die horizontale Reichweite vom Stand bis zum Lauftempo. Der Generator rechnet mit dem niedrigsten Lauftempo und der höchsten Schwerkraft der Grundfiguren, nimmt die kleinere Reichweite beider Richtungen und verwendet höchstens 72 Prozent davon.

## Testmodus

Gib auf der Weltkarte im Feld **Seed** `admin` ein und drücke **Enter**. Mit **Abschnitt überspringen** kannst du Reisen, Gegnerlevel und Bosskämpfe sofort abschließen. Nach einem übersprungenen Kampf folgt die reguläre Perk-Auswahl. Der Testmodus startet mit einer Kopie deiner Kampagne und speichert keine Kampagnenfortschritte oder Rekorde. Erneut `admin` eingeben oder die Seite neu laden, um zum regulären Spielstand zurückzukehren.

## Tests

Im Spielordner `node --test tests/smoke.test.js` ausführen. Für die Prüfung des vollständigen Offline-Pakets unter Linux oder macOS `REQUIRE_OFFLINE_MEDIA=1 node --test tests/smoke.test.js` verwenden.

Alle 29 Tests bestanden. Die Plattformtests prüfen 40 Seeds rechnerisch und springen ausgewählte Strecken mit allen drei Grundfiguren in beide Richtungen ab. Ein zusätzlicher Kampagnendurchlauf mit nachgebildeten Browser-Schnittstellen deckte neun Reisen, vier Gegnerlevel mit echten Sprungeingaben, alle fünf Bosse und den Abspann ab. Kampftreffer wurden dabei gezielt vorbereitet. Darstellung, Audioausgabe und Bildrate auf echten Geräten wurden nicht gemessen.

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
