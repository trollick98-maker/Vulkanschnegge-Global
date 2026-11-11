# Vulkanschnegge 7.0 — Bossfight & Weapon Overhaul

Entpacke die ZIP und öffne `v7-boss-overhaul/index.html`. Im Quellstand liegt das Spiel in `v7-prototype/`. Der Offline-Build enthält alle zehn MP3s und alle Grafiken. Alternativ im Spielordner `python -m http.server 8000` ausführen und im Browser `http://localhost:8000` öffnen. Der lokale Server gibt dem Spielstand einen festen Browser-Ursprung. Der Overhaul speichert Kampagne und Profil separat. Ein V7-Spielstand am selben Browser-Ursprung kann beim ersten Start übernommen werden. Das Schneggboard liest die Online-Rangliste nur auf Knopfdruck und braucht dafür Internet.

## Spielen

Beim Öffnen des Spiels erscheint **LAUNCH** auf schwarzem Grund. Ein Klick oder Tipp startet „Home, At Last“ und das Titelbild. Der Pixel-Titel sinkt acht Sekunden lang vor Schnegg und den fünf Götter-Sternbildern ins Bild. Ein weiterer Klick oder Tipp beschleunigt den Flug. Sobald der Titel angekommen ist, erscheint **Start** und führt direkt zur Weltkarte. Die Musik läuft dabei an derselben Stelle weiter. Der Prolog beginnt vor der ersten Reise.

- Das Hauptmenü führt zur Weltkarte, zum Endlos-Modus und zum Schneggboard. Im Atlas folgen die illustrierten Biome der Reihenfolge des Seeds. Der Riss erscheint mit dem passenden Story-Kapitel.
- Pixelart-Bilder erzählen von der Entführung in der Heimatbucht bis zur Befreiung nach dem Sieg über GOD.EXE. Die beiden Schnecken kehren im Abspann gemeinsam in ihre Bucht zurück. Das Perk-Menü hat ein eigenes Bild.
- Wähle eine Figur und starte eine neue Kampagne, wenn du mit dieser Figur spielen willst. Derselbe Seed erzeugt dieselbe Karte. Normale Reisen dauern zwischen 2 und 3 Minuten, beschleunigen automatisch und starten pro späterer Zone mit 42 Tempo mehr. Bossrouten beginnen mit einer kurzen Verfolgung.
- **A/D oder Pfeiltasten** zum Steuern, **Leertaste** zum Springen und Doppelspringen, **J** oder **X** für den Panzer-Dash und **Esc** für die Karte. Auf Touch-Geräten stehen eigene Tasten zur Verfügung.
- In Gegnerleveln und Bossarenen baut jede Figur beim Lenken Tempo auf. Otter beschleunigt am stärksten, danach folgen Frogo und Schnegg. Loslassen bremst.
- Gegner, Böden und Plattformen haben eigene Biom-Sprites. Münzen tragen ein Spiralrelief. Am Ende der Gegnerlevel wechseln die Zielportale beim Öffnen von orangefarbenen Gittertoren zu türkisen Wirbeln. Boss-Geschosse haben eigene Silhouetten, und Kartenmotive markieren die Regionen.
- Nach Kämpfen wählst du einen Perk. Der Build gilt für alle weiteren Abschnitte der Kampagne. Offene Belohnungen bleiben beim Neuladen erhalten. Der Endlos-Modus hat einen eigenen Startzustand.
- Erfolgreiche Reisen, Gegnerlevel und Bosskämpfe enden auf einer illustrierten Abschlusskarte mit Münzprämie und Laufzeit. Vier Regionen und fünf Bosse haben eigene Motive und Kamerafahrten. Reise, Arena, Boss und Finale haben eigene Abschlussklänge. Der Weiter-Knopf führt zum nächsten Kampf, zur Perk-Auswahl oder zur Befreiung.
- Normale Reisen und Gegnerlevel haben feste Musik pro Kampagnenzone. In Zone 1 läuft „Pixel Depths“, in Zone 2 und 3 „Into the Deep“ und ab Zone 4 „Vulkanschnegge Theme“. Bosse haben ihre eigenen Tracks. Im Endlos-Modus wechseln die Tracks weiterhin mit dem Tempo.
- Der letzte der vier Götter vor dem Riss ergibt sich in dieser Fassung aus der Seed-Reihenfolge. GOD.EXE ist der letzte Kampf. Auf „I AM THE SOURCE“ beim Reveal folgt „RUN THE LOOP“ im Kampf. „Home, At Last“ startet im Abspann.

Die Weltkarte verwendet 38 eigene Pixel-Sprites für Navigation, Kartenmarkierungen und den Basar sowie zwei neue Hintergründe. Im Menü trägt die ausgewählte Figur die aktuell ausgerüstete Kampagnenwaffe. Käufe und Ausrüsten im Basar aktualisieren Figur und Waffenname sofort.

## Kampf und Perks

- Gegnerlevel führen über sieben oder acht Inseln mit Aufstiegen und Abstiegen. Die Kamera folgt dir auch in der Höhe. Besiege alle Gegner und erreiche das Tor am Ende der Strecke. Ein Sturz kostet ein Herz und setzt dich auf die letzte erreichte Insel zurück.
- Im Riff schnappen Muscheln zu, im Tresor fahren Goldstacheln aus, bei der Diva markieren Scheinwerfer ihre Trefferzone und im Wrack schleudern Wasserfontänen dich hoch. Jede Falle warnt vor dem Angriff und hat eigene Sprites für Ruhe und Aktivierung.
- In Arenen entspricht der Panzer-Dash-Schaden dem Tempo beim Start geteilt durch drei. Das standardmäßig ausgerüstete Glutkatana multipliziert diesen Wert mit 1,75. Sein Grundschaden greift bei wenig Tempo. Mehr Tempo macht denselben 144-Pixel-Dash schneller. Schneckenzorn verlängert die Strecke unabhängig vom Tempo. Gegnerkontakt oder ein Treffer kostet 35 % des aktuellen Tempos.
- Krabbler starten mit 100 HP, Springer mit 80 HP und gepanzerte Gegner mit 175 HP. Der Lebensbalken sitzt über jedem Gegner. In Zone vier haben sie 225 % ihrer Start-HP.
- Krabbler stürmen in die angekündigte Richtung, Springer markieren ihre Landestelle und gepanzerte Gegner feuern eine Bodenwelle. Ein Dash-Treffer unterbricht ihren Angriff.
- Landungen, Dash und Wind-ups verformen die Sprites kurz. Konter und Treffer zeigen Partikel. In Gegnerleveln kommt ein kurzer Trefferstopp dazu. Die Systemeinstellung für reduzierte Bewegung schaltet die zusätzlichen Verformungen, Nachbilder und Partikel ab.
- Zeitpolster verlängert den Eingabepuffer, Kettenreaktion lädt den Dash beim Treffer auf und Durchschlag erhöht den Schaden. Münzschwarm kann pro Abschnitt ein Herz heilen. Bestehende Perks und offene Perk-Auswahlen nutzen dieselben IDs und laden mit ihren überarbeiteten Effekten.

## Tiefenbasar

Öffne den **Tiefenbasar** neben der Weltkarte. Der Beutel sammelt gefundene Münzen und Abschlussprämien nach einem erfolgreichen Kampagnenabschnitt. Die Grundprämien betragen 20 Münzen für eine Reise, 40 für ein Gegnerlevel und 65 für einen Boss. Guthaben, Käufe und Ausrüstung gehören zu deiner Kampagne. Bei einem alten Overhaul-Spielstand wird das Startguthaben einmalig aus dem bisherigen Fortschritt berechnet.

| Händler | Freischaltung | Angebot |
| --- | --- | --- |
| Mira Krabbe | Ab der ersten Weltkarte | Gluttrank für zwei zusätzliche Herzen oder Strömungsöl für 25 % mehr Beschleunigung |
| Schmied Rostarm | Nach dem ersten Gegnerlevel | Riffspieß mit langer Reichweite, schweres Ankerbeil und Schmiedesiegel |
| Lumen vom Abgrund | Nach dem ersten Boss | Basaltamulett, Magnetperle und Leichtkristall als dauerhafte Verbesserungen |

Du kannst einen Proviantplatz belegen. Er gilt im nächsten Gegnerlevel oder Bosskampf, bleibt bei Fehlversuchen aktiv und wird nach dem Sieg verbraucht. In der Schmiede kannst du gekaufte Waffen jederzeit kostenlos wechseln. Das Glutkatana ist ab Start im Besitz. Der Testmodus führt Käufe und Guthaben in seiner eigenen Kopie des Spielstands.

## Bosskämpfe

Vor jedem Boss fährt die Kamera in der Pixelart-Illustration von Schnegg zum Gegner. Nach drei Sekunden beginnt die Verfolgung. Mit **Verfolgung starten** kannst du direkt loslegen.

Jede Route zu einem unbesiegten Boss beginnt mit einer 30-Sekunden-Verfolgung. Der Boss bleibt rechts im Bild und wechselt zwischen Zielsalven und Sperrfeuer. Helle Geschosse kannst du per Dash zurückwerfen. Die Salven werden dichter und schneller. Danach öffnet sich direkt die scrollende Plattformarena. Musik, Herzen und gesammelte Münzen gehen mit. In der Arena steuerst du mit A und D frei in beide Richtungen. Beim Loslassen bremst die Figur bis zum Stillstand, solange keine Strömung oder ein Laufband auf sie wirkt. Springe zu fliegenden Gegnern hoch und setze den Dash so an, dass der Schwertbogen den Boss schneidet. Der Glutkatana-Hieb dauert 120 Millisekunden. Jeder Waffenangriff zählt pro Ziel einmal. Treffer auf die markierte Schwachstelle bringen einen Bonus. Der Boss fällt bei 0 HP und hat dann eine kurze Siegesanimation. Don Moray startet mit 4.500 HP, nahe am bisherigen GOD.EXE mit 4.600 HP. GOD.EXE hat jetzt 7.630 HP, schnellere Salven und engere Pausen. Ein Neustart beginnt die Verfolgung mit vollen Herzen.

Angriffe durchlaufen Vorbereitung, Ausführung und Erholung. Die Bosse bewegen sich bei ortsfesten Angriffen während der Warnphase und wechseln mit kurzen Manövern die Seite. Ab Phase II kündigen sie ausgewählte Folgeangriffe als Kombo an. Sie drehen sich im Kampf zur Figur. Angriffsflächen und Geschosse halten sich an die angekündigte Bahn. Bei zwei Dritteln und einem Drittel HP unterbricht ein Phasenwechsel den Angriff für rund eine Sekunde. Emblem und Hinweis kündigen den Umbau der Arena an. Fünf Sets mit je zehn neuen Sprites zeigen Decks, Kulissen, Gefahren, Phasen und Geschosse. Angriffsbeginn und Warnung berücksichtigen den gemessenen Rhythmus des Boss-Tracks. Die Musik läuft bei Bedarf in einer Schleife. Helle Geschosse lassen sich per Dash umlenken und können andere Geschosse abfangen.

| Boss | Angriffe und Arena | Gelegenheit |
| --- | --- | --- |
| Don Moray | Das Wasser steigt, Decks treiben auf und ab, und in Phase III dreht die Strömung. Doppelfontänen lassen Lücken zum Ausweichen. | In der Erholung nach dem Spezialangriff den markierten Bereich treffen. |
| God of Greed | Hebedecks fahren seitwärts. In der Goldschmelze steigen sie höher und die Öfen speien Gold. | Der leuchtende Tresor kann das Dekret unterbrechen. |
| Diva-Schwänin | Bühnenlifte wechseln die Höhe. Erst wandert ein Spot über die Bühne, in Phase III sind es zwei. | Die markierte Pose mit einem Hieb durchbrechen. |
| Pumper Vortex | Laufbänder ziehen am Boden. In Phase III federn die Decks stärker und markierte Gewichte schlagen paarweise ein. | Nach einer Überlastung auf den Kraftgürtel zielen. |
| GOD.EXE | Markierte Decks fallen kurz aus. In Phase III schalten sich drei Firewalls versetzt ein. | Den Kern während des Resets treffen. |

Treffer, eigener Schaden, Blocks und Konter haben eigene Pixel-Effekte und Töne. Schadenszahlen zeigen die verlorenen HP. Bei eigenem Schaden leuchtet der Rand des Spielfelds rot. Mit **Effekte an/aus** schaltest du die Spielgeräusche unabhängig von der Musik.

Der Dash zieht eine türkise Spur und hat einen eigenen Sound. Bei hohem Tempo wird die Spur lavafarben und der Dash klingt kräftiger. In Arenen hörst und siehst du ein kurzes Schlittern, wenn du auf dem Boden aus hohem Tempo abbremst oder gegenlenkst.

## Sprite-Update

Fünf Tiefsee-Panoramen bewegen sich hinter Wegen, Gegnerleveln und Bossarenen mit eigenem Parallax-Tempo. Dazu kommen 16 Kulissen-Sprites und 16 Partikelsprites. Bei Levelbeginn und am Eingang zur Bossarena fährt die Kamera kurz ins Bild. Bei der ersten Steuereingabe endet die Fahrt zügig. Vier neue Storybilder zeigen die Entführung, den Riss und zwei Etappen der Heimkehr. Die Storybilder bewegen sich mit Schwenks, Zoom und kurzen Überblendungen. Reduzierte Bewegung deaktiviert diese Animationen.

24 Pixel-Sprites ergänzen die Boss- und HUD-Grafik. Eigene Symbole markieren Strom, Sprünge, Zielzonen und Systemfehler. Blasen, Schallwellen, Hanteln und rote Fehlerpakete haben unterschiedliche Silhouetten. Goldtruhe und Fallentruhe unterscheiden sich am Schloss. Goldhand und Bühnenvorhang erscheinen in den passenden Spezialangriffen. Boss-Abzeichen, Herz, Dash-Symbol und Kompass ergänzen Weltkarte und HUD. Glutkatana, Schwachstellen, Konter und Boss-Sieg haben eigene Effektsprites.

50 weitere Sprites verteilen sich auf 12 Gegnervarianten, 18 Kulissen und 20 Partikelmotive. Korallen, Anker, Bühnenrequisiten, Fitnessgeräte und Serverteile stehen entlang der Strecken und in den Arenen. Beim Dash sprühen Glutspuren, Landungen wirbeln Staub auf und Münzen funkeln beim Einsammeln. Treffer, Konter und Bossangriffe nutzen regionale Partikel. Beim Boss-Finale kommt ein größerer Ausbruch dazu. Die zusätzlichen Partikel sind auf 220 gleichzeitig begrenzt und lassen sich über die Systemeinstellung für reduzierte Bewegung ausblenden.

## Prozedurale Plattformwege

Seed und Level-ID bestimmen Inselbreiten, Plattformhöhen und Abstände. Jedes Biom hat eigene Folgen aus steigenden und fallenden Plattformen. Die Strecke bleibt beim Neustart reproduzierbar, auch mit einem anderen Perk-Build.

Die maximale Höhe eines Grundsprungs ist `v₀² / (2g)`. Für ein Ziel, das um `Δh` höher liegt, ist die Flugzeit bis zur Landung auf dem absteigenden Teil der Sprungkurve `(v₀ + √(v₀² − 2gΔh)) / g`. Daraus ergibt sich die horizontale Reichweite vom Stand bis zum Lauftempo. Der Generator rechnet mit dem niedrigsten Lauftempo und der höchsten Schwerkraft der Grundfiguren, nimmt die kleinere Reichweite beider Richtungen und verwendet höchstens 72 Prozent davon.

## Testmodus

Gib auf der Weltkarte im Feld **Seed** `admin` ein und drücke **Enter**. Mit **Zur Bossarena springen** überspringst du die Verfolgung. Mit **Abschnitt überspringen** kannst du Reisen, Gegnerlevel und Bossarenen sofort abschließen. Nach einem übersprungenen Kampf folgt die reguläre Perk-Auswahl. Der Testmodus startet mit einer Kopie deiner Kampagne und speichert keine Kampagnenfortschritte oder Rekorde. Erneut `admin` eingeben oder die Seite neu laden, um zum regulären Spielstand zurückzukehren.

## Tests

Im Spielordner `node --test tests/smoke.test.js` ausführen. Für die Prüfung des vollständigen Offline-Pakets unter Linux oder macOS `REQUIRE_OFFLINE_MEDIA=1 node --test tests/smoke.test.js` verwenden.

Die Tests prüfen unter anderem Dash-Distanz, Gegner-HP, Boss-Schaden, Angriffsmuster und Siege und die Sound- und Bewegungseffekte. Eine separate Simulation prüfte für 40 Seeds die Plattformwege mit allen drei Grundfiguren in beide Richtungen.

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

Der Overhaul liegt in einem eigenen Entwicklungsbranch. Der Ausgangsstand bleibt separat verfügbar. Im GitHub-Quellstand liegen alle Grafiken. Die MP3s liegen in der Offline-ZIP. Wenn die lokalen Boss-Tracks fehlen, greift der Quellstand auf einen Runner-Loop zurück.
