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

## Prüfen

```bash
npm test        # Drift-Guard + die Schale dieses Depots
npm run drift   # nur die byte-1:1-Kopien
npm run serve   # http://localhost:8000/
```

**⚠ Der Prüfstand dieser App liegt NICHT hier, sondern in
[Kimhub](https://github.com/lausiklauskn-png/Kimhub):** dort messen 1 293
Prüfungen und eine Gegenprobe mit über 460 eingebauten Fehlern, ob die Schicht
tut, was sie behauptet. **Hier liegen die Kopien.** Ein zweiter, halb so
gründlicher Prüfstand daneben wäre schlimmer als keiner — er sähe aus wie eine
Zusicherung und wäre eine schwächere.

Was dieses Depot deshalb prüft, ist genau das, was Kimhub nicht prüfen kann:
dass die Kopien byte-gleich sind, und dass die zwei app-eigenen Abweichungen
zusammenpassen.

## Kopieren, nicht klonen

`schicht/*`, `idb.js`, `schluesseltresor.js`, `company.js` und `index.html`
sind **byte-1:1** aus Kimhub. `tools/drift-guard.mjs` pinnt sie per SHA-256.
Reift etwas, wird es **dort** gepflegt und hier **neu kopiert** — nie
umgekehrt. Eine abgewandelte Kopie hier wäre nicht nur eine zweite Generation,
sondern eine **ungeprüfte**.

Genau zwei Dateien weichen ab, und der Grund steht in ihnen:
`company-sw.js` und `company.webmanifest` nennen den Namen der Startseite, und
der ist hier `index.html` statt `start.html`.

## Stand — ehrlich

| | |
|---|---|
| Der Trockenlauf im Browser | **gemessen** — läuft durch, 8 Ereignisse, Werkstück entsteht |
| Der Schlüssel-Tresor | **gemessen** — hinein, zu, auf, weg; in der Ablage liegt ein Paket, kein Klartext |
| Ein **echter, bezahlter** Lauf über den Browser | **nicht gemessen** |
| Was eine Schicht kostet, die bis „fertig" läuft | **nicht gemessen**. Eine gemessene Schicht an der Kommandozeile kostete am 2026-08-23 rund 0,42 € — sie war nach einer Runde nicht fertig. |
| Klaus' Sichttest am Tablet | **steht aus** |

Eine geratene Zahl klingt genau wie eine gemessene. Wo nichts gemessen wurde,
steht „nicht gemessen" — nicht „0".

## Lizenz und Rechte

Siehe [`LICENSE`](LICENSE). Web-Code ist immer lesbar; Kopierschutz und
Obfuskation sind netzweit ausdrücklich **nicht** der Weg. Der Schutz ist
Copyright und Git-Historie.
