# Bündel-Prüfer · Befund

⚠ **DIESES WERKZEUG IST NICHT ABNAHMEFÄHIG.** Urteil des Arztes:
**nachbessern**. Es liegt hier als Werkstück und als Beleg des ersten Laufs,
nicht als benutzbares Werkzeug.

**Kein Browser hat es je geladen.** Alles Gemessene stammt aus dem Prüf-Kern,
den Arzt und Negativbauer aus der Seite herausgeschnitten und in Node gefahren
haben.

Gebaut am 2026-09-04 von acht Rollen in einem Durchgang. Der Verlauf und die
Auswertung stehen in [`../../forschung/LAUF-01.md`](../../forschung/LAUF-01.md).

---

## Was es sein soll

Vier Dateien, die ein **anderes** Bündel daraufhin ansehen, ob es als
installierbare PWA taugt. Sechs Prüfpunkte: Dateien vollständig · `start_url`
und `scope` relativ · `display: standalone` · Icons 192 und 512 mit echter gegen
behauptete Größe · `fetch`-Aufruf im Service-Worker · Vorratsliste passend zu den
vorhandenen Dateien, in beide Richtungen.

Drei Eingänge, alles im Browser, nichts wird gesendet.

## Was daran stimmt

- **Die zwei Test-PNGs sind echt.** Gültige Signatur, gültiger IHDR, 192×192 und
  180×180 — nachgelesen aus den Bytes, nicht aus dem Dateinamen.
- **Alle 32 Schalter-Kombinationen des Test-Bündels ergeben exakt die Soll-Liste**,
  keine Abweichung. Damit sind die Prüfmerkmale 2, 3 und 5 erfüllt.
- Die eigene `manifest.webmanifest` und `sw.js` sind sauber: relative Pfade,
  `standalone`, 192 und 512, `fetch` vorhanden, Vorratsliste passt in beide
  Richtungen.
- Kein Hochladen, kein Senden, kein Server, keine Note, kein Siegel, keine
  Aussage „installierbar: ja". Alle Netz-Aufrufe sind relativ.

## Die neun Fehler, nach Dringlichkeit

**1 · Die Selbstprüfung fällt durch.** Die Größensuche im SVG durchsucht den
ganzen Dateitext statt nur das `<svg>`-Element und greift auf ein
`<rect width="512">` in Zeile 2. Das Werkzeug meldet an sich selbst einen Fund.
Trifft **jedes** SVG ohne Größe an der Wurzel — also den Normalfall.
*Prüfmerkmal 1 verletzt.*

**2 · Der Reparatur-Rat verletzt die eigene Regel.** Bei „das Icon behauptet 192
und misst 180" rät der Prüfer, die **Angabe** auf 180 zu ändern. Wer dem folgt,
hat kein 192er-Icon mehr — und genau das verlangt der Prüfer zwei Punkte weiter
oben. Der Rat muss das **Bild** ändern.

**3 · Stille falsche Entwarnung bei kaputtem Manifest.** Ein
`manifest.webmanifest`, dessen Inhalt `null` ist (ebenso `0`, `false`, `""`),
wirft bei `JSON.parse` nicht. Alle drei Manifest-Blöcke werden übersprungen —
kein Fund, kein Eintrag unter „nicht geprüft". Der Prüfer meldet **„Kein Fund"**.

**4 · Ein anders benannter Service-Worker lässt zwei Prüfpunkte ausfallen.**
Heißt er `pwa-sw.js` und wird über eine Variable angemeldet, greifen weder die
Suche noch der Rückfall. Prüfpunkt 5 und 6 fallen aus, ohne Vermerk — gemeldet
wird stattdessen, die Datei fehle.

**5 · Der Kopier-Knopf kopiert nichts.** Die Maskierung deckt `&`, `<`, `>` ab,
aber **nicht** `"`. Der Wert steht in einem doppelt zitierten Attribut, das nach
dem ersten Anführungszeichen endet. Sieben von acht Fundarten betroffen. Der
Knopf meldet „Kopiert".

**6 · Fehlalarm an gesunden Bündeln.** Ein Service-Worker, der sich selbst nicht
in den Vorrat legt (üblich), und eine beiliegende `README.md` erzeugen beide
einen Fund, obwohl nichts falsch ist.

**7 · Ein Fundtext, der zweimal dieselbe Zahl nennt.** Bei einem nicht
quadratischen PNG steht „192 statt 192" — verglichen wird nur die Breite.

**8 · Der Soll-Satz steht an der falschen Stelle.** Die Gestalt-Vorgabe verlangt
ihn **über** den Schaltern; er steht darunter. Wer die Schalter zuerst sieht,
liest die Funde als Zeugnis über das Werkzeug.

**9 · Zwei `http`-Fundstellen im Quelltext.** Das `xmlns` im SVG (ohne das kein
Browser die Datei zeichnet, vom Bauer selbst gemeldet) und ein Kommentar, der
genau zusichert, dass es keine gibt. *Prüfmerkmal 6 wortwörtlich verletzt.*

## Was der Nutzer außerdem beanstandet hat

Der oberste Knopf heißt „Mich selbst prüfen" und meint das **Werkzeug** — er wird
als „meine Dateien" gelesen · nach einer Reparatur gibt es kein „noch einmal
prüfen" · bei „Kein Fund" fehlt der nächste Schritt · acht Fachwörter werden
nirgends erklärt (Bündel, Service-Worker, Manifest, Vorratsliste, `start_url`,
`scope`, `display`, HTTPS) · „Keine Datei index.html im Bündel" klingt nach
kaputter App, obwohl der Nutzer sie vielleicht nur nicht mit ausgewählt hat · der
Hinweis auf Unterordner steht ganz unten statt vor der Auswahl.

## Was offen bleibt

- **Drei von zwölf Fundarten führt das Test-Bündel nicht vor** — dass sie auch
  umfallen, ist ungeprüft.
- **Die Kontrastwerte sind nach Erfahrung gesetzt, nicht gerechnet.** Es liegt
  keine Zahl vor.
- **Die Gestalt-Vorgabe ist nie systematisch geprüft worden.** Ob Grenzsatz,
  Zustands-Texte und Rang-als-Wort dastehen, weiß niemand — die eine gefundene
  Abweichung fand der Nutzer zufällig. **Eine Vorgabe ohne Prüfmerkmal wird nicht
  geprüft.**
- **Die Abbruch-Kaskade bleibt.** Ein kaputtes Manifest lässt alle
  Manifest-Prüfungen wegfallen; die Kennungen machen es sichtbar, beseitigt ist
  es nicht.
- Ob im Flugmodus wirklich alles weiterarbeitet, ist ohne Ausführen nicht
  entscheidbar.
