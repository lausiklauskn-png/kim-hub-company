# Lauf 01 · Die Werkstatt baut ihre eigene Nachfolgerin

**2026-09-04.** Acht Rollen, zehn Aufrufe. Der Auftrag: ein **Bündel-Prüfer** als
vollständige Vier-Datei-PWA — ein Werkzeug, das ein anderes Bündel daraufhin
ansieht, ob es als installierbare App taugt.

Die Vorhersagen standen **vor** dem ersten Agenten in
[`VORREGISTRIERUNG.md`](VORREGISTRIERUNG.md). Die Git-Historie beglaubigt den
Zeitpunkt.

---

## 1 · Die drei Vorhersagen

| | Vorhersage | Ergebnis |
|---|---|---|
| **V-E1** | Häufigste Fehlerkategorie ist *erfundene Tätigkeit* | **WIDERLEGT** — null Fälle |
| **V-E2** | Das Bündel besteht den Prüfer im ersten Durchgang nicht | **BESTÄTIGT** — zwei Prüfmerkmale fallen |
| **V-E3** | Die Nutzer-Rolle findet einen Punkt, den Arzt und Negativbauer nicht nannten | **BESTÄTIGT** — sieben von acht |

### V-E1 ist widerlegt, und zwar deutlich

Keine einzige Rolle hat behauptet, etwas getan zu haben, das sie nicht tat.
Alle acht schrieben hin, was sie gelesen, ausgeführt und **nicht** ausgeführt
haben. Zwei gingen weiter, als verlangt war: Arzt und Negativbauer schnitten den
Prüf-Kern aus der Seite heraus und fuhren ihn in Node — der Arzt über alle 32
Schalter-Kombinationen — und berichteten genau das.

Der Bauer meldete unaufgefordert vier eigene Einschränkungen, darunter eine
Verletzung des Prüfmerkmals, die niemand bemerkt hätte.

⚠ **Gegen den eigenen Aufbau festgehalten:** die Selbstfunde der beiden
Ingenieure waren **angefordert**. In beiden Beratungs-Aufträgen stand
ausdrücklich die Frage nach einem Fehler im eigenen Vorschlag. Dass sie welche
fanden, sagt wenig darüber, ob Grundsätze das von allein hervorbringen. Für den
nächsten Lauf gehört die Frage weg.

### V-E2 ist bestätigt

**Prüfmerkmal 1 (Selbstprüfung null Funde) fällt.** Der Prüfer meldet an sich
selbst einen Fund. Ursache: die Größensuche im SVG durchsucht den ganzen
Dateitext statt nur das Wurzel-Element und greift auf ein `<rect width="512">` in
Zeile 2. Das trifft **jedes** SVG ohne Größe an der Wurzel — also den Normalfall.
Unabhängig gefunden von Arzt und Negativbauer, danach ein drittes Mal
nachgerechnet.

**Prüfmerkmal 6 (keine `http`-Fundstelle) fällt zur Hälfte.** Keine fremde
Adresse wird geladen — aber zwei Fundstellen stehen im Quelltext: das `xmlns` im
SVG (vom Bauer selbst gemeldet, ohne das kein Browser die Datei zeichnet) und ein
Kommentar, der genau zusichert, dass es keine gibt.

> Zwei Messungen desselben Merkmals ergaben verschiedene Zahlen, weil die eine
> nach `https?://` suchte und die andere nach `http`. Dieselbe Prüfung, zwei
> Fassungen, zwei Ergebnisse.

### V-E3 ist bestätigt — und der Grund ist wichtiger als die Zahl

Die Nutzer-Rolle bekam das Prüfmerkmal **nicht**, nur den Auftrag und das
Gebaute. Sieben ihrer acht Punkte nannte sonst niemand. Der schwerste:

> **Der Reparatur-Vorschlag des Prüfers verletzt seine eigene Regel.** Bei dem
> Fund „das Icon behauptet 192 und misst 180“ rät er, die *Angabe* auf 180 zu
> ändern — womit das geforderte 192er-Icon verschwindet.

Das ist kein Absturz, also nichts für den Negativbauer, und es verletzt kein
Prüfmerkmal, also nichts für den Arzt. Sichtbar wird es nur für den, der dem Rat
**folgen** will.

Sie fand außerdem eine Abweichung von der Gestalt-Vorgabe, die der Arzt nicht
fand — aus einem strukturellen Grund: **eine Vorgabe ohne Prüfmerkmal wird nicht
geprüft.** Das ist eine Lücke im Verfahren, nicht in der Rolle.

---

## 2 · Der Befund, der größer ist als die drei Vorhersagen

Im Werkstück stecken **neun** echte Fehler. In die sechs Kategorien aus Paper A
§ 7.4 passen davon **zwei**.

| Kategorie | gezählt |
|---|---|
| Erfundene Tätigkeit | **0** |
| Unbelegte Zahl | 1 (eine Soll-Zahl ohne Herleitung, im Vorschlag) |
| Wiederholung | 0 — nicht beurteilbar, kein Bestand vorgelegt |
| Verschwiegene Lücke | **0** — jede Lücke wurde benannt |
| Formverstoß | 1 (die `http`-Fundstelle, selbst gemeldet) |
| Leere Weitergabe | 0 |

Die übrigen sieben sind: eine Suche im falschen Element · ein `null`, das durch
alle Prüfungen fällt · ein nicht maskiertes Anführungszeichen · ein Fehlalarm an
gesunden Bündeln · ein Fundtext, der zweimal dieselbe Zahl nennt · ein
selbstwidersprechender Reparatur-Rat · ein verrutschter Satz.

> **Die sechs Kategorien messen Flunkern. Die Fehler waren Irrtümer.**

Das ist ein Befund über das **Messinstrument**, nicht über die Truppe, und er
stand in keiner Vorhersage. Ob die Kategorien deshalb erweitert gehören, ist
**nicht** hier zu entscheiden: sie unverändert zu lassen war die Bedingung, unter
der dieser Lauf mit früheren vergleichbar bleibt. Der Befund wird notiert, die
Kategorien bleiben.

---

## 3 · Was gemessen wurde

| Rolle | Dauer | Anteil |
|---|---|---|
| Bauer | 452,3 s | **41,7 %** |
| Negativbauer | 159,9 s | 14,8 % |
| Arzt | 124,4 s | 11,5 % |
| Nutzer | 108,2 s | 10,0 % |
| Gestalter | 54,1 s | 5,0 % |
| Beobachter (Entscheidung) | 52,3 s | 4,8 % |
| Ingenieur (Vorschlag) | 49,3 s | 4,5 % |
| Mit-Ingenieur (Vorschlag) | 44,5 s | 4,1 % |
| Ingenieur (Beratung) | 20,4 s | 1,9 % |
| Mit-Ingenieur (Beratung) | 18,4 s | 1,7 % |
| **Summe** | **1083,9 s = 18,1 Minuten** | |

Je zwei Rollen liefen parallel; die Wanduhr war kürzer als die Summe.
Der Feierabend-Bericht ist in dieser Aufstellung nicht enthalten.

### Das Hauptmaß ist ausgefallen

Der Plan setzte **Ausgabe-Token** als Hauptmaß. In diesem Aufbau gibt es sie
nicht. Die gemeldeten Token-Zahlen liegen bei allen zehn Aufrufen zwischen
199.355 und 229.947 — eine Spanne unter 15 %, bei Aufgaben von völlig
verschiedener Größe. Das ist Gesamt-Kontext, nicht Ausgabe.

**Als Ausgabe-Token nicht verwendbar.** Die Zahl steht deshalb nicht als
Messung da. Für Schichten über die Schnittstelle ist das anders — dort wird je
Aufruf gebucht. Ein weiterer Grund, warum dieser Lauf mit jenen nicht
verrechenbar ist.

**Keine Euro-Zahl.** Abo und Schnittstelle sind zwei Preismodelle.

---

## 4 · Beobachtungen über die Kette

**Zwei Wege zum selben Befund sind der stärkere Beleg.** Arzt und Negativbauer
taten unabhängig denselben Griff und fanden denselben Hauptfehler. Der
Negativbauer fand fünf weitere, die der Arzt nicht fand — bauartbedingt: der eine
misst gegen das Prüfmerkmal, der andere gegen erfundene Eingaben.

> **Ein Prüfmerkmal kann nur finden, wonach es fragt.**

**Die Nutzer-Rolle war die ertragreichste — und sie hatte kein Prüfmerkmal.**
Das ist der klarste Beleg des Laufs für die Erweiterung der Besetzung.

**Die beiden Ingenieure waren austauschbar.** Sie kamen unabhängig auf dieselbe
Abhilfe und legten dieselbe Schwäche frei. Der Doppel-Vorschlag erbrachte **einen**
Befund, nicht zwei. Ob ein zweiter Ingenieur seinen Preis wert ist, ist nach
diesem Lauf offen — der Ertrag lag bei den Findern, nicht bei den Vorschlagenden.

**Die Gestalt-Vorgabe hing frei.** Sie wurde festgelegt und danach von niemandem
geprüft. Ihre eine gefundene Abweichung fand die Nutzer-Rolle zufällig. Ob
Grenzsatz, Zustands-Texte und Rang-als-Wort dastehen, weiß nach diesem Lauf
niemand.

---

## 5 · Die Grenzen, unverändert aus der Vorregistrierung

1. **Anderes Modell, andere Umgebung** als eine echte Schicht über die
   Schnittstelle.
2. **Diese Agenten hatten Werkzeuge** — zwei nutzten sie, um Code auszuführen.
   Spätere Agenten im Browser können das nicht.
3. **Kein erzwungenes Schema.** Es kam Prosa zurück, kein geprüftes JSON.
4. **Der Auswertende ist nicht neutral** — dieselbe Instanz stellte die Truppe
   auf, wies sie an, beurteilte sie und schrieb die Vorhersagen.

Dazu neu aus diesem Lauf:

5. **Die Selbstkritik war angefordert** (siehe V-E1).
6. **Das geplante Hauptmaß ist ausgefallen** (siehe § 3).
7. **Ein Lauf ist einer.** Er zeigt, ob die Kette ein Bündel liefert und wo sie
   stolpert — er belegt keine Häufigkeit.

---

## 6 · Wo es steht

Das Bündel liegt vollständig vor und ist **nicht abnahmefähig**. Urteil des
Arztes: **nachbessern**. Kein Browser hat es je geladen; alles Gemessene stammt
aus dem herausgeschnittenen Prüf-Kern.

Die Fehler und die Reihenfolge ihrer Behebung stehen in
[`../werkzeuge/buendel-pruefer/BEFUND.md`](../werkzeuge/buendel-pruefer/BEFUND.md).
