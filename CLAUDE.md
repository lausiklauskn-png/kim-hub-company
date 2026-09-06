# Kim Hub Company — Sitzungs-Anker

**Kurz-Verfassung.** Netzweites steht in **Sage-Protokol**, die Werkstatt-Regeln
in **Kimhub**; hier steht nur, was eine Sitzung wissen muss, **bevor** sie hier
etwas anfasst.

## Was dieses Repo ist

Die **App**: eine Seite, die eine Schicht der fünf Rollen **im Browser** startet
— auf dem eigenen KI-Zugang des Nutzers (BYOK, Klaus 2026-09-04). Sie ist der
Bau aus `Kimhub/docs/sessions/BAUPLAN_kimhub-company.md`, Scheibe S4/S5.

**Hier wird nicht entwickelt, hier wird ausgeliefert.** Die Werkstatt ist
[Kimhub](https://github.com/lausiklauskn-png/Kimhub).

## Die eine Regel, auf die es hier ankommt

**Kopieren, nicht klonen.** Was `tools/drift-guard.mjs` pinnt, wird hier
**nicht** abgewandelt — es wird in Kimhub gepflegt und neu kopiert, dann der
Fingerabdruck nachgezogen.

⚠ **Hier hängt mehr daran als sonst.** In Kimhub steht der ganze Prüfstand
(1 293 Prüfungen, Gegenprobe mit über 460 eingebauten Fehlern). Dieses Depot hat
davon nichts — es hat die Dateien. Eine abgewandelte Kopie wäre also nicht nur
eine zweite Generation, sondern eine **ungeprüfte**.

Frei ist genau zweierlei: `company-sw.js` und `company.webmanifest`. Sie nennen
den Namen der Startseite (`index.html` statt `start.html`), und der Grund steht
im Kopf des Workers.

## Was hier leicht kaputtgeht

- **Cache-Bump:** wer eine Datei aus `SCHALE` in `company-sw.js` ändert, erhöht
  `CACHE_VERSION`. Sonst liefert der Service-Worker die alte Fassung weiter —
  und die App sähe aus, als wäre nichts passiert.
- **DB-Name `KimHubCompany1` nie ändern.** `github.io` ist eine **geteilte**
  Adresse: IndexedDB gehört dem Ursprung, nicht der App. Dieselbe Regel wie der
  DB-Suffix in den SBKIM-Apps — nur liegt hier ein **bezahlter Zugang** darin.
- **Der Vorrat und die Platte sind zwei Listen.** `c.add()` schluckt einen
  Fehlschlag einzeln, damit eine fehlende Datei nicht die Installation umwirft.
  Deshalb prüft `tests/smoke_kopie.mjs` beides: im Vorrat genannt UND wirklich da.
- **Das Depot ist ÖFFENTLICH.** Die Ausschluss-Liste stand vor der ersten Datei
  und bleibt. Kein Schlüssel, kein Passwort, kein Token — auch nicht „nur zum
  Testen": die Historie behält alles, was je darin lag.

## Ehrlichkeit

Was als „fertig" gemeldet wird, **ist** fertig. Eine geratene Zahl klingt genau
wie eine gemessene; wo nichts gemessen wurde, steht „nicht gemessen" — nicht
„0". **Klaus' Browser-Sichttest ist nicht ersetzbar**, und wer etwas Ansehbares
gebaut hat, legt ihm die Adresse **im Chat** hin, unaufgefordert.

## Netzweit

Freibrief zum Selbst-Mergen · frisch von `origin/main` vor jeder Arbeit · Ton ·
kein PII · Ehrlichkeit stehen **einmal** in
**[`Sage-Protokol/docs/NETZWEIT.md`](https://github.com/lausiklauskn-png/Sage-Protokol/blob/main/docs/NETZWEIT.md)**.

**Der Selbst-Merge-Freibrief gilt hier — seit 2026-09-06.** Klaus, wörtlich:
*„in kim-hub-company darfst du selbst mergen."*

> **Bis dahin stand hier das Gegenteil**, mit Verweis auf den Bauplan (*„Kein
> Merge dort ohne Klaus"*). Die Regel war richtig, solange das Depot neu war —
> und sie ist ihm an dem Abend zur Last geworden, an dem sechs Kopien
> hintereinander fertig waren: *„Du musst die App mergen oder das PR mergen,
> sonst kann ich das nicht lesen. Es geht nach GitHub, PR 10 und bla bla bla.
> Und dann weiß ich nicht, wie es weitergeht."* Jede Kopie kostete ihn einen
> Umweg über GitHub, um eine Änderung zu sehen, die er selbst bestellt hatte.
>
> Der Bauplan in Kimhub (`docs/sessions/BAUPLAN_kimhub-company.md`) trägt den
> alten Satz noch; **diese Datei ist die neuere Erkenntnis und geht vor** —
> Tafel-Evolutions-Klausel, ausdrücklich benannt statt stillschweigend
> umfahren.

**Was das NICHT lockert:** die Leitplanken bleiben. Gemergt wird, was geprüft
ist (`npm test` grün, Drift-Guard sauber), abgegrenzt und nicht architektonisch
zweifelhaft — **nicht** bei echtem Zweifel und nicht, wenn Klaus vorher
draufschauen will. Und die Adresse gehört weiter in den Chat: sein
Browser-Sichttest ist nicht ersetzbar, er kommt jetzt nur ohne Umweg.

```bash
git fetch origin --quiet && git checkout -B <branch> origin/main
git push -u origin refs/heads/<branch>:refs/heads/<branch>
git diff --stat origin/main origin/<branch>     # leer = der PR wäre leer
```
