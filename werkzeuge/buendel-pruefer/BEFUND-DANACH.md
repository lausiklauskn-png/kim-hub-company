# Bündel-Prüfer · ein zehnter Befund, gefunden NACH dem Lauf

**Nicht Teil von Lauf 01.** `BEFUND.md` daneben ist das Ergebnis des Laufs und
bleibt unangetastet — es sind die neun Fehler, die Arzt und Negativbauer gefunden
haben. Dieser hier kam am 2026-09-08 beim Herüberholen der Dateien hinzu und
gehört deshalb in eine eigene Datei. **Wer die Fehlerquote des Laufs auszählt,
zählt neun, nicht zehn.**

## 10 · Der Service-Worker löscht die Vorräte aller Geschwister-Apps

In `sw.js` steht das übliche „alte Vorräte aufräumen":

```js
caches.keys().then(namen => Promise.all(
  namen.map(n => n === VORRAT ? null : caches.delete(n))))
```

Das ist der Standard-Ausschnitt — und er ist **überall dort falsch, wo eine
Adresse mehreren Apps gehört.** `caches` gehört dem **Ursprung**, nicht dem
Pfad. Ein Service-Worker unter `…/werkzeuge/buendel-pruefer/` darf zwar nur
seinen eigenen Pfad steuern, aber er darf **jeden** Vorrat des ganzen Ursprungs
aufzählen und löschen.

Auf `lausiklauskn-png.github.io` liegen rund 21 Apps. Ein einziger Besuch dieser
Seite räumt deren Offline-Vorräte weg.

### Gemessen, nicht geschlossen (2026-09-08)

Zwei Wegwerf-Apps unter **einem** Ursprung, App B mit genau diesem
`activate`-Handler, headless in Chromium:

```
nach App A:                      ["app-a-v1"]
nach App B (derselbe Ursprung):  ["buendel-pruefer-v1"]

BEFUND: App B hat FREMDE Vorräte gelöscht: ["app-a-v1"]
```

### Was das kostet, und was nicht

**Kein Datenverlust.** Ein Vorrat ist abgeleitet; er füllt sich beim nächsten
Besuch mit Netz wieder. IndexedDB und `localStorage` bleiben unberührt — dort
liegen die echten Daten.

**Was kaputtgeht, ist die Offline-Fähigkeit**, bis jede betroffene App einmal
online geöffnet wurde. Eine installierte PWA, die man ohne Netz aufmacht, steht
dann leer da.

### Warum trotzdem nichts an der Datei geändert wurde

Sie ist **Belegmaterial**. Eine Datei zu ändern, die als Beleg eines Laufs
mitreist, macht den Beleg wertlos — dann steht dort nicht mehr, was die Werkstatt
gebaut hat, sondern was jemand später daraus gemacht hat. Der Befund steht
deshalb daneben statt darin.

**Wer diesen Prüfer je benutzen will, ändert vorher genau eine Zeile:** die
Liste auf die eigenen Vorräte einschränken (Namenspräfix) statt „alles außer
meinem" zu löschen.

> Und die allgemeine Lehre, die über diese Datei hinausgeht: **die Regel „eigene
> Schublade auf geteilter Adresse" gilt nicht nur für IndexedDB.** Sie gilt für
> `localStorage`, für `caches` — für alles, was dem Ursprung gehört. Der
> DB-Suffix ist netzweit aufgeschrieben, der Vorrats-Name war es nicht.
