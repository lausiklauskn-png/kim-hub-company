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

## Seit 2026-09-08 auch ein SBKIM-Endknoten

Klaus, wörtlich: *„Beide Tools, Company und das Ausliefer-Tool, sollen als
eigenständige Knoten agieren … mit Zelle und auch dem Siegel. Und zwar nach dem
Bauplan von Sage-Protokoll."*

Eigene Identität, eigene Spore, eigenes Siegel mit dem Andock-Werkzeug darin,
eigene Schublade **`sbkim_kimhubcompany`**. Die 13 Kanon-Module und die fünf
app-eigenen Klebstoff-Dateien liegen unter `sbkim/`.

⚠ **DER EINBAU STEHT IN KIMHUB, NICHT HIER.** `index.html` ist eine byte-gleiche
Kopie der abgeleiteten `start.html`. Wer die Modul-Zeilen hier hineinschreibt,
bricht die Kopie — der Drift-Guard wird zu Recht rot, und die nächste Sitzung
sucht an der falschen Stelle. Der Weg:

```
Kimhub/tools/company-schale-bauen.mjs   ← die Kette + die Schublade im <head>
Kimhub/tools/company-steuerung.html     ← der Weg zur eigenen Kennung
        ↓  node tools/company-schale-bauen.mjs
Kimhub/start.html  →  byte-gleich hierher als index.html
```

⚠ **DIE MODUL-DATEIEN LIEGEN NUR HIER, und daraus folgt die Arbeitsteilung beim
Prüfen.** Kimhub hat sie nicht (die Werkstatt wird kein Knoten) und kann sie
deshalb nicht messen:

| wo | was gemessen wird |
|---|---|
| Kimhub, `tests/smoke_company_form.mjs` | die **Kette** in der abgeleiteten Seite: alle 13 namentlich, Reihenfolge, Schublade im Kopf — reiner Text, ohne Browser |
| hier, `tests/smoke_knoten.mjs` | die **Dateien**: byte-1:1 aus Sage, im Offline-Vorrat, von git geführt, und ob die app-eigenen Werte zueinander passen |

Keines ersetzt das andere. Eine Kette mit richtigen Namen kann auf fehlende
Dateien zeigen, und Dateien, die daliegen, können ungenannt bleiben — zwei
Fehler mit derselben Wirkung.

**Zwei Drift-Guards, zwei Fragen.** `tools/drift-guard.mjs` fragt „ist diese
Kopie noch die Kopie **aus Kimhub**?", `tools/sbkim-drift.mjs` fragt „ist der
Knoten noch der Knoten **aus Sage**?" Zusammengeworfen wüsste bei einer
Abweichung niemand, in welchem Depot nachzuziehen ist.

⚠ **Die fünf Klebstoff-Dateien werden BEWUSST nicht gepinnt** — sie *müssen* pro
App verschieden sein (Suffix, Knoten-Name, Bedeutungs-Beschreibung). Sages
`docs/PFLICHT_MODULE.md` nennt sie ausdrücklich „kein Kanon, kein Drift-Guard".
Dass sie zueinander passen, misst `tests/smoke_knoten.mjs`.

⚠ **Und die Bedeutungs-Beschreibung ist keine Zierde.** Modul 03 rechnet daraus
den Domänen-Vektor, Modul 04 vergleicht damit. Sie steht an **zwei** Stellen
(`sbkim/rendezvous-init.js` und `sbkim/siegel-inhalt.js`), weil es zwei Wege zur
Spore gibt — das Verbinden-Fenster und den Andock-Wizard im Siegel. Zwei
verschiedene Texte ergäben zwei verschiedene Vektoren für denselben Knoten. Ein
Wächter vergleicht sie wortgleich.

⚠ **SEIT DEM 2026-09-10 LIEGT `sbkim/spore.json` DA — und hier stand vorher das
Gegenteil.** Der Satz lautete „Im Depot liegt KEINE `spore.json`, und das bleibt
so." Sein **Grund** war richtig und gilt weiter: eine **erfundene** Spore ist
schlimmer als keine — sie beantwortet „hat dieser Knoten eine Kennung?" mit einem
Ja, das niemand geprüft hat. Der **Wächter** dazu maß aber nur den **Dateinamen**,
und ein Wächter am Namen schneidet an beiden Kanten falsch:

- Er wirft Klaus' **echte**, signierte Spore hinaus. Sages `status.json` nannte
  für diesen Knoten die ganze Zeit `…/kim-hub-company/sbkim/spore.json` — eine
  Adresse, die nichts auslieferte. Sages Tafel sagt ausdrücklich: die Spore im
  Netz ist nicht die Spore im Depot, die Datei ist **„Ablage und Beleg, kein
  Sender"**. Zwölf Geschwister-Knoten legen sie genau so ab.
- Er lässt eine **erfundene** durch, sobald sie anders heißt.

Bewacht wird deshalb die **Zusicherung statt der Zeile**. Liegt hier eine Spore,
muss sie sich gegen ihren eigenen Schlüssel **verifizieren**, darf **keinen
privaten Teil** tragen und muss **diesen** Knoten ankündigen — mit der Kennung,
die im Netz für ihn steht, und mit der Beschreibung, die die App **heute**
mitbringt. Liegt keine da, ist das weiterhin in Ordnung.

⚠ **Der private Schlüssel bleibt trotzdem in Klaus' Browser.** Was hier liegt,
ist die öffentliche Hälfte; ein Wächter besteht auf `key_ops: ["verify"]` und auf
der Abwesenheit von `d`.

⚠ **Die Kennung ist GENAGELT** (`KENNUNG` in `tests/smoke_knoten.mjs`). Ohne den
Nagel fängt kein Wächter eine erfundene Spore: wer ein frisches Schlüsselpaar
erzeugt und damit unterschreibt, bekommt eine, die in sich tadellos ist und nur
einen anderen Knoten ankündigt. **Wer die Kennung wechselt** — der
Identitäts-Wechsler im Siegel kann das —, zieht sie **hier UND in
`Sage-Protokol/status.json`** nach. Das ist der Preis, und er ist beabsichtigt:
ein Identitäts-Wechsel soll eine Spur im Verlauf hinterlassen.

⚠ **Der Service-Worker friert sie nicht ein.** `sw.js` holt für `.json` **Netz
zuerst** und greift auf den Vorrat nur offline zurück. Eine neu signierte Spore
kommt also sofort an — eine eingefrorene wäre schlimmer als keine, weil sie
aussieht, als gälte sie noch.

## Prüfen

```bash
npm test              # tests/alle.mjs — Kopie, Schale, Knoten
npm run drift         # ist die Kopie noch die Kopie aus Kimhub?
npm run sbkim-drift   # ist der Knoten noch der Knoten aus Sage?
npm run gegenprobe    # baut Fehler ein — jeder MUSS eine Probe umwerfen

node tools/aus-kimhub-holen.mjs              # nur nachsehen: hängt eine Kopie zurück?
node tools/aus-kimhub-holen.mjs --schreiben  # alle auf einmal holen + Pins nachziehen
```

Zuletzt gemessen (2026-09-10, nach der abgelegten Spore): **68 grün · 0 ROT ·
0 nicht lauffähig** · Gegenprobe **40 gefangen · 0 durchgerutscht · 35 Anker
geprüft, 0 tot**.

⚠ **Die neun Fälle zur abgelegten Spore mussten NEU UNTERSCHREIBEN, statt zu
verbiegen.** Jedes Feld einer Spore steht **unter** der Signatur — ein Eingriff
von Hand bricht also immer zuerst den Signatur-Wächter, und der Fall wäre
„gefangen", ohne den gemeinten Wächter je erreicht zu haben. Genau die Falle,
die im Kopf von `tests/gegenprobe.sh` schon an einer anderen Tür steht.
`tests/gegenprobe-spore.mjs` unterschreibt deshalb mit einem frischen Paar, das
nur im Arbeitsspeicher lebt; danach ist die Spore in sich tadellos, und **genau
ein** Wächter fällt um. Beim Nachstellen von Hand hat das dreimal etwas gefunden,
das der Lauf als „gefangen" gemeldet hätte: der genagelte Kennungs-Wächter feuerte
bei **jeder** Fälschung mit (der Fälscher zieht den Nagel jetzt nach) · der
Platte-vs-Depot-Wächter hing an der **Anzahl** statt an der **Datei** und fiel bei
einer zweiten Spore mit um · und `--nagel-nachziehen` **vor** dem Dateinamen machte
den Schalter zum Dateinamen, worauf drei Fälle nichts mehr sabotierten und wie
blinde Wächter aussahen.

⚠ **`npm test` allein ist nicht „die Prüfung".** Ein Wächter ohne Gegenprobe ist
nur ein grüner Haken — beim Bau des Knotens waren **acht** eigene Wächter blind,
und gefunden hat sie nicht das Nachdenken, sondern die Gegenprobe: fünf suchten
Namen, die in dieser Datei nur im **Kopf-Kommentar** stehen, zwei fanden ihren
Namen im Erklär-Kommentar daneben, einer verwechselte
`switchWizardIdentityAbgeschaltet` mit `switchWizardIdentity`. Behoben wurden
die **Wächter**, nicht die Fälle.

## ⚠ EIN DRIFT-GUARD SAGT „UNVERÄNDERT", NICHT „AKTUELL"

Am 2026-09-09 hat Klaus zum zweiten Mal denselben Befund geschickt: *„und die
Agentenpillen die sind immmer noch nicht in der Startposition."* Die Arbeit war
getan — in **Kimhubs** `ansicht.js`. Hierher kopiert hatte ich nur `index.html`.

**Und alle Wächter waren grün.** `tools/drift-guard.mjs` vergleicht jede Kopie
mit **ihrem eigenen** Fingerabdruck; eine Datei, die niemand angefasst hat, ist
„unverändert" — auch wenn die Quelle längst weiter ist. Es ist die Frage nach
der **Abwandlung**, nicht die nach dem **Stand**, und die zweite hatte niemand
gestellt.

Derselbe Satz hat in derselben Woche schon zweimal zugeschnappt:
`PWA-Toolpoint/sbkim/15_membran.js` hing eine ganze Modul-Generation zurück,
und hier war es `ansicht.js`. **Beim dritten Mal ist es keine Unachtsamkeit
mehr, sondern ein fehlendes Werkzeug.**

`tools/aus-kimhub-holen.mjs` holt deshalb **alle** gepinnten Kopien auf einmal
und zieht Pins und Herkunft in derselben Bewegung nach. Es liest seine Liste
aus `drift-guard.mjs` — eine zweite Liste liefe auseinander, und die vergessene
Datei wäre wieder genau die, an die niemand denkt. **Von Hand kopieren heißt,
sich an jede Datei zu erinnern; eine Regel, an die man sich erinnern muss, ist
keine.**

⚠ **BENANNTE GRENZE:** dass die Kopien wirklich aktuell **sind**, misst keine
Probe. Dafür braucht es den Kimhub-Klon daneben, und der ist in einem frischen
Container nicht da. Gemessen wird, dass das Werkzeug dasteht und aus der einen
Liste liest — beides mit Gegenprobe. Wer hier etwas ändert, ruft es vorher auf.

## ⚠ WAS IN DER BESCHREIBUNG STEHEN MUSS — und warum eine Zahl es nicht misst

Klaus hat die Bedeutungs-Beschreibung **zweimal** beanstandet. Beim ersten Mal
fehlte der **Name** des Werkzeugs, beim zweiten Mal der **Zweck** und die
**Forschung**:

> *„die Beschreibung ist mager, sie erwähnt die Forschung nicht, dass
> brauchbare Werkzeuge hergestellt werden, mit agentenbasiertem Matching …
> SBKIM Bestandteil der Sage-Forschung"* · *„es muss zusätzlich der Zweck
> angegeben werden."*

**Beim zweiten Mal hatte sie 1851 Zeichen.** Der Wächter davor maß die Länge —
und Länge sah aus wie Substanz. **Eine Zahl misst Umfang, keinen Inhalt.**
Gemessen werden seitdem vier Sachen **einzeln**, jede mit eigenem Namen in der
roten Zeile: der Name des Werkzeugs · der **Zweck** · Forschung und
**SBKIM-Protokoll** · **agentenbasiertes Matching**. Gemessen wird der Begriff,
nicht die Formulierung — ein Wächter, der einen Satz festnagelt, verbietet das
nächste Richtigstellen.

### ⚠ Modul 03 schneidet bei 512 Tokens ab, und es sagt es nur der Konsole

`EMBEDDING_MAX_TOKENS = 512`. Was dahinter steht, geht **nicht** in den Vektor
ein — still. Und weil `embedPassage` erst die Beschreibung und dann die
Stichwörter bekommt, fällt bei einem Schnitt **zuerst die Stichwort-Liste** weg.

⚠ **WO DER SCHNITT LIEGT, IST NICHT GEMESSEN.** Das Modell läuft im Browser; in
dieser Umgebung ist huggingface gesperrt und ein lokaler Tokenizer liegt nicht
vor (die `models/`-Ordner der Geschwister-Apps tragen nur einen Platzhalter —
nachgesehen, nicht angenommen). **Eine geschätzte Token-Zahl klingt genau wie
eine gemessene**, deshalb steht hier keine.

Was daraus folgt, gilt unabhängig davon, wo der Schnitt fällt: **das Wichtigste
steht vorne** — Zweck, dann Forschung und Protokoll, dann die acht Rollen, dann
die Sicherungen, zuletzt der Baukasten-Absatz. **Wer kürzen muss, kürzt von
hinten.**

**Messen kann es nur Klaus, und es kostet einen Blick:** beim Signieren im
Siegel die Konsole (Eruda) öffnen. Steht dort `MODUL 03 EMBEDDING: Eingabe >
512 Tokens, abgeschnitten`, wird der letzte Absatz gestrichen.

### ⚠ Und ein Gegenprobe-Fall, der nur EINEN Weg zur Spore trifft, misst den falschen Wächter

Die Beschreibung steht in `sbkim/rendezvous-init.js` **und**
`sbkim/siegel-inhalt.js`, und ein Wächter vergleicht beide wortgleich.
Sabotiert man nur eine Datei, fällt **immer** dieser Wächter um — der Fall
meldet „gefangen", und ob der Wächter, um den es geht, überhaupt etwas misst,
bleibt offen.

**Genau so ist es am 2026-09-09 passiert, und zwar doppelt:** der Fall „der
Name des Werkzeugs verschwindet" galt als gefangen, **und der Namens-Wächter
war dabei grün** — der Name steht **zweimal** in der Beschreibung, ersetzt
wurde die erste Stelle. Zwei Fehler in einem Fall, und der Lauf sagte
„bestanden". Gefunden hat es nicht der Lauf, sondern das **Nachstellen von
Hand**.

`fall2` in `tests/gegenprobe.sh` ersetzt deshalb in **beiden** Dateien und an
**allen** Stellen. Jeder der vier Fälle erzeugt seitdem **genau eine** rote
Zeile — die mit seinem eigenen Namen.

## ⚠ WER „AUTOMATISCH" BITTET UND EINEN KNOPF BEKOMMT, HAT NICHT BEKOMMEN, WORUM ER BAT

Klaus hat es **zweimal** gesagt. Beim ersten Mal (2026-09-10): *„Wolltest du
nicht den neuen Text automatisch in das Siegel einfügen, damit ich jederzeit neu
erzeugen kann? Der neue Text ist da noch nicht drin."*

**Der Grund war NICHT der Offline-Vorrat** — das lag nahe und war falsch.
Nachgesehen statt geraten: der Text stand in beiden Dateien auf `main`, und
`CACHE_VERSION` war bei **jedem** der drei Commits erhöht worden (v52 → v53 →
v54 → v55). Der Grund stand im Code: das Feld wurde mit `WIZ.domainDescription`
vorbelegt und danach **von der gespeicherten Spore überschrieben**.

**Meine erste Abhilfe war zu zaghaft, und Klaus hat sie zu Recht beanstandet.**
Ich ließ die gespeicherte Spore weiter gewinnen und stellte einen Knopf daneben
(„↺ Text dieser App hereinholen") plus eine Zeile, die nennt, welcher Text im
Feld steht. An seinem Schirm gemessen: **Hinweis da, Knopf da — und trotzdem der
alte Text im Feld**, weil er erst einen zweiten Knopf finden und drücken musste.
Er schrieb: *„Die Beschreibung ist vollkommen [unzureichend], nicht mal der Name
steht drin."*

> **Wer „automatisch" bittet und einen Knopf bekommt, hat nicht bekommen, worum
> er gebeten hat.** Eine Abhilfe, die eine Handlung mehr verlangt als die Bitte,
> ist keine Abhilfe, sondern eine Verschiebung.

**Seitdem gewinnt der Vorschlag der App.** Er ist der gepflegte Text — er wird
mit dem Depot aktualisiert, und vier Wächter bestehen darauf, dass er den Namen
des Werkzeugs, den Zweck, die Forschung und das SBKIM-Protokoll nennt. Wer
nichts weiter tut und neu signiert, bekommt genau ihn.

⚠ **Und nichts geht dabei verloren**, sonst wäre es die andere Sorte Schaden: der
zuletzt signierte Text steht weiter in der Spore, bis wirklich neu signiert wird;
solange er abweicht, holt ihn ein Knopf mit einem Griff zurück. Die Zeile darüber
**nennt jedes Mal**, welcher der beiden im Feld steht — ohne sie wäre der Tausch
still, und still ist hier schlimmer als falsch.

**Gemessen im Browser, beide Lagen** (2026-09-10, headless Chromium mit
gestellter `getOwnSpore`):

| | Feld | Länge | Name·Zweck·Forschung | Knopf |
|---|---|---|---|---|
| gespeicherte Spore mit altem Text | **Vorschlag der App** | 2602 | ja·ja·ja | sichtbar |
| … nach Klick auf den Knopf | eigener Text | — | — | verschwunden |
| frischer Browser, keine Spore | **Vorschlag der App** | 2602 | ja·ja·ja | **nicht** da |

### ⚠ Und ein Wächter dazu war blind — an einem Ausdruck, der zweimal dasteht

`ta.value = WIZ.domainDescription;` stand nach dem ersten Bau **zweimal**: als
Vorbelegung und im Klick-Handler. Der Wächter suchte ihn **frei in der Datei**
und blieb grün, als die Vorbelegung ausgebaut war — er fand die Stelle im Knopf.

**Gefunden hat es die Gegenprobe, nicht das Nachdenken:** der Fall meldete sich
als „NICHT GEFANGEN", während der Schaden angerichtet war. Gemessen wird jetzt
der **Block** zwischen dem Anlegen des Feldes und der Herkunfts-Zeile, und im
Lade-Pfad wird **gezählt**, dass dort nur noch **eine** Zuweisung an `ta.value`
steht — die im Knopf. Dieselbe Falle wie beim Fahrtenbuch am 2026-09-06 —
*„sie fragten, ob ein Ausdruck irgendwo steht, statt an seiner Stelle"*.

## Die eine Regel, auf die es hier ankommt

**Kopieren, nicht klonen.** Was `tools/drift-guard.mjs` pinnt, wird hier
**nicht** abgewandelt — es wird in Kimhub gepflegt und neu kopiert, dann der
Fingerabdruck nachgezogen. Dasselbe gilt für `sbkim/`, nur ist die Quelle dort
**Sage-Protokol/src/modules/** und der Wächter `tools/sbkim-drift.mjs`.

⚠ **Hier hängt mehr daran als sonst.** In Kimhub steht der ganze Prüfstand
(1 293 Prüfungen, Gegenprobe mit über 460 eingebauten Fehlern). Dieses Depot hat
davon nichts — es hat die Dateien. Eine abgewandelte Kopie wäre also nicht nur
eine zweite Generation, sondern eine **ungeprüfte**.

Frei ist genau zweierlei: `sw.js` und `company.webmanifest`. Sie nennen
den Namen der Startseite (`index.html` statt `start.html`), und der Grund steht
im Kopf des Workers.

> **Bis zum 2026-09-07 stand hier `company-sw.js`** — an drei Stellen, und die
> Datei gibt es hier nicht. Sie heisst `sw.js`, weil `ansicht.js` genau diesen
> Namen registriert. `tests/smoke_kopie.mjs` misst das seit langem und besteht
> ausdrücklich darauf, dass der alte Name **nicht** danebenliegt — die Probe
> hatte also recht, und drei Doku-Stellen widersprachen ihr. Wer sie las,
> suchte eine Datei, die es nicht gibt.

## Was hier leicht kaputtgeht

- **Cache-Bump:** wer eine Datei aus `SCHALE` in `sw.js` ändert, erhöht
  `CACHE_VERSION`. Sonst liefert der Service-Worker die alte Fassung weiter —
  und die App sähe aus, als wäre nichts passiert.
- **Drei Schubladen, drei Aufgaben — nie verwechseln.** `__WERKSTATT_DB`
  (`KimHubCompany1`) ist die Buchhaltung, `schluesseltresor.js` verwahrt den
  KI-Zugang, `window.SBKIM_DB_SUFFIX` (`kimhubcompany`) ist die
  Knoten-Identität. Wer sie zusammenlegt, baut die Verwechslung ein, vor der
  Kimhubs Verfassung unter „Zwei Schlösser" warnt.
- **`window.SBKIM_DB_SUFFIX` gehört in den `<head>`, vor jedes Modul.** Modul 01
  liest es beim LADEN; steht es weiter unten, hat es die geteilte Schublade
  `sbkim` längst geöffnet. Gesetzt wird es vom Ableiter in Kimhub, nicht hier.
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
