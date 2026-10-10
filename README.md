# Vulkanschnegge 6.4 – modulare Entwicklungsfassung

Diese Fassung ist eine **strukturelle Kopie** von Version 6.4 auf dem separaten Branch `refactor/modular-v6-4`. Der ursprüngliche Branch `main` bleibt unverändert.

## Dateien
- `index.html` – Seitenaufbau und eingebundene Ressourcen
- `styles.css` – Layout, Responsive Design und UI
- `js/game.js` – Spiellogik, Bewegung, Physik, Charaktere, Upgrades, Darstellung
- `js/audio.js` – adaptive Musik, Lautstärke und Vollbild
- `js/leaderboard.js` – Aktualisierung des Rekordtextes
- `js/ui.js` – zusätzliche Events für Menüs, Charakterwahl und Sichtbarkeit
- `js/firebase.js` – Firebase-Konfiguration und Firestore-Initialisierung

## Hinweise
Die Reihenfolge der Script-Einbindungen wurde gegenüber der Originaldatei beibehalten. Die MP3-Dateien liegen weiterhin im separaten Repository `Vulkanschnegge`, Bilder werden weiterhin extern geladen. Firebase verwendet dasselbe Backend wie die bestehende Version.

**Wichtig:** Der Dateiinhaltsvergleich wurde geprüft: CSS und JavaScript sind gegenüber `main` bytegetreu übernommen, und nach Rückeinsetzen dieser Inhalte ergibt sich exakt die alte HTML-Datei. Ein tatsächlicher Browser-/Spieltest wurde bislang nicht ausgeführt.

Bei lokalem Testen einen kleinen HTTP-Server verwenden, z. B. `python -m http.server 8000`, und dann `http://localhost:8000` öffnen. Die tatsächlichen Firestore-Regeln und Deployment-Konfiguration sollten vor Veröffentlichung geprüft werden.
