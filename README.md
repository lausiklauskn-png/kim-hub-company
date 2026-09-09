# Kim Hub Company

**Fünf Rollen bauen an einem Auftrag — in deinem Browser, auf deinem eigenen
KI-Zugang.**

Du gibst einen Auftrag ein. Fünf Rollen arbeiten ihn nacheinander ab:
**Nora** schlägt vor, was gebaut wird · **Emil** baut es · **Vera** prüft gegen
ein vorher genanntes Merkmal · **Sten** sucht, was daran kaputtgeht ·
**Jonas** schreibt auf, wo es steht.

## Zwei Wege, und der erste kostet nichts

| | |
|---|---|
| **Trockenlauf** | spielt eine hinterlegte Schicht ab. Kein Schlüssel, kein Cent. Dieselbe Mechanik wie ein echter Lauf — nur die Antworten kommen aus einer Datei. **Seine Euro-Beträge sind gerechnet, nicht bezahlt**, und das steht auch dran. |
| **Echter Lauf** | ruft wirklich Modelle auf. Auf **deinem** Schlüssel, auf **deine** Rechnung. |

## Wo dein Schlüssel landet

In **deinem Browser, auf deinem Gerät**, verschlüsselt: AES-256-GCM, Schlüssel
aus deinem Passwort über PBKDF2-SHA256 mit 600 000 Runden — dasselbe Verfahren
wie im Buchhaltungs-Tresor der Werkstatt. Er wird an **genau eine** Stelle
geschickt: an die KI-Adresse, die in der Seite steht.

**Nicht ins Depot. Nicht zu uns. In kein Protokoll.**

Das **Passwort** bleibt nur im Arbeitsspeicher — einmal je Besuch eintippen.
Das ist der Preis dafür, dass es nirgends liegt, wo es jemand lesen könnte.
Wegwerfen geht mit einem Knopf; ein Zurücksetzen gibt es nicht, das ist der
Preis echter Verschlüsselung.

> ⚠ **Eine offene Flanke, benannt statt weggelächelt.** Das offizielle SDK
> sperrt den Browser, bis man es ausdrücklich freigibt. Die Warnung dazu
> handelt von *deinen* Zugangsdaten als Betreiber — von einem Schlüssel, der
> im ausgelieferten Code steckt. Dieser Fall liegt hier nicht vor: im Code
> steht keiner, im Depot auch nicht. **Daraus folgt aber nicht, dass es
> erlaubt ist** — die Doku stellt die Frage gar nicht. Der Stand steht in
> [`Kimhub/docs/BYOK_BEDINGUNGEN.md`](https://github.com/lausiklauskn-png/Kimhub/blob/main/docs/BYOK_BEDINGUNGEN.md).

## Was diese Seite NICHT tut

Nichts geht von allein hinaus. Kein Zähler beim Laden, keine Meldung über deine
Nutzung, keine Telemetrie. Sie läuft vollständig, auch wenn du nie einen Knopf
drückst, der etwas verschickt. Keine CDNs — nach dem ersten Besuch läuft sie
offline, bis auf die KI-Aufrufe selbst.

## Ein eigener Knoten im SBKIM-Netz

Seit dem 2026-09-08 ist diese App zugleich ein **eigenständiger SBKIM-Endknoten**:
eigene Identität, eigene Spore, ein Siegel mit dem Andock-Werkzeug darin, und
eine eigene Schublade in der Browser-Datenbank (`sbkim_kimhubcompany`).

Zwei Knöpfe führen dorthin, und **beide tun nichts von selbst**:

- **🌐 Mit dem Netz verbinden** (das Fenster unten links) — dort entsteht die
  Kennung, dort steht der Gerätename, dort meldet man sich im Raum an.
- **Das Siegel** (oben in der Status-Leiste) — Kennung erzeugen, Spore
  signieren und herunterladen, verschlüsselte Sicherung, Wiederherstellen,
  Identitäts-Wechsler.

⚠ **Der private Schlüssel verlässt den Browser nie, und im Depot liegt keine
Spore.** Sie entsteht erst, wenn du sie erzeugst. Eine Datei, die aussieht wie
eine Identität, wäre schlimmer als keine.

⚠ **Das ist NICHT dein KI-Zugang.** Der Schlüssel im Formular bezahlt die
Schicht; die Kennung sagt dem Netz, wer dieser Knoten ist und was er kann. Zwei
Geheimnisse, zwei Aufgaben.

## Prüfen

```bash
npm test              # Drift-Guard, die Schale und der Knoten
npm run drift         # ist die Kopie noch die Kopie aus Kimhub?
npm run sbkim-drift   # ist der Knoten noch der Knoten aus Sage?
npm run gegenprobe    # baut Fehler ein — jeder MUSS eine Probe umwerfen
npm run serve         # http://localhost:8000/
```

Zuletzt gemessen (2026-09-08): **50 grün · 0 ROT · 0 nicht lauffähig** ·
Gegenprobe **21 gefangen · 0 durchgerutscht**.

**⚠ Der Prüfstand dieser App liegt NICHT hier, sondern in
[Kimhub](https://github.com/lausiklauskn-png/Kimhub):** dort messen 1 293
Prüfungen und eine Gegenprobe mit über 460 eingebauten Fehlern, ob die Schicht
tut, was sie behauptet. **Hier liegen die Kopien.** Ein zweiter, halb so
gründlicher Prüfstand daneben wäre schlimmer als keiner — er sähe aus wie eine
Zusicherung und wäre eine schwächere.

Was dieses Depot deshalb prüft, ist genau das, was Kimhub nicht prüfen kann:
dass die Kopien byte-gleich sind, dass die zwei app-eigenen Abweichungen
zusammenpassen — **und den Knoten**, denn dessen Dateien liegen nur hier.

**Seit dem 2026-09-08 gibt es dafür eine eigene Gegenprobe** (`npm run
gegenprobe`, 21 Fälle). Sie deckt die neuen Wächter ab, nicht die älteren aus
`tests/smoke_kopie.mjs` — das ist eine benannte Lücke, keine verschwiegene. Und
sie hat sich sofort bezahlt: **acht** frisch geschriebene Wächter waren blind,
weil sie Namen suchten, die nur in Kommentaren stehen.

## Kopieren, nicht klonen

`schicht/*`, `idb.js`, `schluesseltresor.js`, `company.js` und `index.html`
sind **byte-1:1** aus Kimhub. `tools/drift-guard.mjs` pinnt sie per SHA-256.
Reift etwas, wird es **dort** gepflegt und hier **neu kopiert** — nie
umgekehrt. Eine abgewandelte Kopie hier wäre nicht nur eine zweite Generation,
sondern eine **ungeprüfte**.

Genau zwei Dateien weichen ab, und der Grund steht in ihnen:
`sw.js` und `company.webmanifest` nennen den Namen der Startseite, und
der ist hier `index.html` statt `start.html`. (Der Worker heisst hier `sw.js`,
nicht `company-sw.js` wie in Kimhub — `ansicht.js` registriert genau diesen
Namen.)

## Stand — ehrlich

| | |
|---|---|
| Der Trockenlauf im Browser | **gemessen** — läuft durch, 8 Ereignisse, Werkstück entsteht |
| Der Schlüssel-Tresor | **gemessen** — hinein, zu, auf, weg; in der Ablage liegt ein Paket, kein Klartext |
| Ein **echter, bezahlter** Lauf über den Browser | **nicht gemessen** |
| Was eine Schicht kostet, die bis „fertig" läuft | **nicht gemessen**. Eine gemessene Schicht an der Kommandozeile kostete am 2026-08-23 rund 0,42 € — sie war nach einer Runde nicht fertig. |
| Der Knoten: 13 Module byte-1:1, Kette, Reihenfolge, Vorrat | **gemessen** (50 Prüfungen, Gegenprobe 21/0) |
| Ob der Knoten im Rendezvous-Raum wirklich auftaucht | **nicht gemessen** — das sieht nur ein Browser |
| Klaus' Sichttest am Tablet | **steht aus** |

Eine geratene Zahl klingt genau wie eine gemessene. Wo nichts gemessen wurde,
steht „nicht gemessen" — nicht „0".

## Lizenz und Rechte

Siehe [`LICENSE`](LICENSE). Web-Code ist immer lesbar; Kopierschutz und
Obfuskation sind netzweit ausdrücklich **nicht** der Weg. Der Schutz ist
Copyright und Git-Historie.
