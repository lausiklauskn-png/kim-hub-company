#!/usr/bin/env bash
# Gegenprobe zu Kim Hub Company.
#
# ⚠ WARUM ES SIE ERST SEIT DEM 2026-09-08 GIBT — und warum sie klein bleibt.
# Der Prüfstand dieser App liegt in Kimhub: dort messen über zweitausend
# Prüfungen und eine Gegenprobe mit über neunhundert eingebauten Fehlern, ob die
# Schicht tut, was sie behauptet. Hier liegen die KOPIEN, und `tests/alle.mjs`
# prüft genau das, was Kimhub nicht prüfen kann.
#
# Mit dem SBKIM-Knoten ist etwas dazugekommen, das es NUR hier gibt: die
# dreizehn Kanon-Module und die fünf Klebstoff-Dateien. Kimhub kann sie nicht
# messen — es hat sie nicht. Und ein Wächter ohne Gegenprobe ist nur ein grüner
# Haken. Also braucht dieses Depot eine eigene.
#
# ⚠ SIE MISST NUR DIE NEUEN WÄCHTER, und das steht hier, statt es zu verschweigen.
# Die älteren Prüfungen in `tests/smoke_kopie.mjs` haben keinen Fall — sie hatten
# vor dieser Datei keinen, und sie nachträglich alle abzudecken war nicht Teil
# des Auftrags. **Eine benannte Lücke ist Arbeit, eine verschwiegene ist Schaden.**
#
# Gearbeitet wird an einer WEGWERF-KOPIE. Die echten Dateien werden nie
# angefasst: ein abgebrochener Lauf soll nichts Sabotiertes hinterlassen.
#
# Lauf: bash tests/gegenprobe.sh
#       NUR_ANKER=1 bash tests/gegenprobe.sh   # nur nachsehen, ob die Anker leben
#       NUR_FALL=<regex> bash tests/gegenprobe.sh
set -u
WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KOPIE="$(mktemp -d "${TMPDIR:-/tmp}/company-gegenprobe-XXXXXX")"
trap 'rm -rf "$KOPIE"' EXIT
gruen=0; rot=0; uebersprungen=0

# ⚠ POSITIVLISTE. Was hier fehlt, fehlt in der Kopie — und dann sind die Proben
# „schon ohne Eingriff rot", was wie ein kaputtes Depot aussieht und in Wahrheit
# eine vergessene Zeile ist. In Kimhub ist genau das dreimal passiert. Wer eine
# Datei oder ein Verzeichnis anlegt, trägt es hier nach.
#
# ⚠ UND `.git` BEKOMMT DIE KOPIE AUSDRÜCKLICH — anders als in Kimhub. Der Grund
# ist ein anderer: `smoke_knoten.mjs` und `smoke_kopie.mjs` fragen `git ls-files`,
# ob eine Datei wirklich AUSGELIEFERT wird. Ohne Depot werfen beide, und eine
# Probe, die wirft, ist ROT — damit wäre die Ausgangslage rot und kein Fall
# würde etwas messen. Kimhub hat dafür einen zweiten Weg gebaut (ein getrenntes
# git-Verzeichnis); hier wird stattdessen ein ECHTES kleines Depot in der Kopie
# angelegt. Das ist wichtiger als es klingt: ein VERWEIS auf das Original liesse
# git den Index des Originals lesen, während die Auskunft von der Kopie handelt
# — genau die Blindstelle, die Kimhub am 2026-09-07 gemessen hat.
frisch() {
  rm -rf "$KOPIE"; mkdir -p "$KOPIE"
  cp -r "$WURZEL/sbkim" "$WURZEL/schicht" "$WURZEL/tests" "$WURZEL/tools" \
        "$WURZEL/icons" "$WURZEL/forschung" "$WURZEL/werkzeuge" \
        "$WURZEL/index.html" "$WURZEL/sw.js" "$WURZEL/company.webmanifest" \
        "$WURZEL/company.js" "$WURZEL/ansicht.js" "$WURZEL/buehne.js" \
        "$WURZEL/zeit.js" "$WURZEL/kassen.js" "$WURZEL/idb.js" \
        "$WURZEL/schluesseltresor.js" "$WURZEL/version.json" \
        "$WURZEL/impressum.html" "$WURZEL/datenschutz.html" \
        "$WURZEL/package.json" "$WURZEL/.gitignore" "$WURZEL/_config.yml" \
        "$WURZEL/LICENSE" \
        "$WURZEL/CLAUDE.md" "$WURZEL/README.md" "$KOPIE/"
  (cd "$KOPIE" && git init -q . && git add -A >/dev/null 2>&1 \
    && git -c user.email=g@g -c user.name=g commit -qm gegenprobe >/dev/null 2>&1)
}

NUR_ANKER="${NUR_ANKER-}"
# ⚠ MIT EINEM BINDESTRICH. `${X:-vorgabe}` greift auch bei LEEREM X — dann
# verkleinerte ein leeres NUR_FALL den vollen Lauf still auf einen Fall, und die
# Zahl sähe genauso aus. Die Falle steht in Kimhubs Verfassung.
NUR_FALL="${NUR_FALL-}"
ANKERLISTE="${ANKERLISTE:-$KOPIE.anker}"
[ -n "$NUR_ANKER" ] && : > "$ANKERLISTE"

faellt_aus() {
  [ -z "$NUR_FALL" ] && return 1
  printf '%s' "$1" | grep -Eq -- "$NUR_FALL" && return 1
  uebersprungen=$((uebersprungen+1)); return 0
}

merkeAnker() { printf '%s\x1f%s\x1e' "$1" "$2" >> "$ANKERLISTE"; }

# Gemessen wird, ob sich die Datei WIRKLICH geändert hat — nicht, ob ein `grep`
# den Anker findet. `grep -F` mit mehrzeiligem Anker prüft die Zeilen einzeln,
# mit ODER, und meldet Erfolg, sobald EINE irgendwo vorkommt; der Fall wäre dann
# inert und meldete sich als „nicht gefangen". Befund am Werkzeug selbst, Kimhub
# 2026-08-22.
ersetze() {
  if ! ALT="$2" NEU="$3" python3 -c '
import os, sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
t = s.replace(os.environ["ALT"], os.environ["NEU"], 1)
if t == s: sys.exit(3)
open(p, "w", encoding="utf-8").write(t)
' "$1"; then
    echo "  ⚠ ANKER NICHT GEFUNDEN — dieser Fall misst nichts: ${2:0:64}…"
    rot=$((rot+1)); return 1
  fi
}

# Die Zahl der ROTEN PROBEN, nicht ein Rückgabewert. Bei roter Ausgangslage gäbe
# eine 1 jedem Fall recht.
rotZahl() {
  (cd "$KOPIE" && node tests/alle.mjs 2>/dev/null) \
    | sed -n 's/.*· \([0-9]*\) ROT ·.*/\1/p' | tail -1
}

fall() {
  local was="$1" datei="$2" alt="$3" neu="$4"
  if [ -n "$NUR_ANKER" ]; then merkeAnker "$datei" "$alt"; return; fi
  faellt_aus "$was" && return
  frisch
  ersetze "$KOPIE/$datei" "$alt" "$neu" || return
  jetzt="$(rotZahl)"
  if [ -n "$jetzt" ] && [ "$jetzt" -gt "${BASIS_ROT:-0}" ]; then
    gruen=$((gruen+1)); echo "  ✓ gefangen: $was"
  else
    rot=$((rot+1)); echo "  ✗ NICHT GEFANGEN: $was"
  fi
}

# Eine Datei ganz WEGNEHMEN. `ersetze` kann nur Text tauschen — eine Datei, von
# der nur eine Zeile verschwindet, liegt immer noch da.
fallweg() {
  local was="$1" datei="$2"
  if [ -n "$NUR_ANKER" ]; then merkeAnker "$datei" ""; return; fi
  faellt_aus "$was" && return
  frisch
  if [ ! -e "$KOPIE/$datei" ]; then
    echo "  ⚠ DATEI NICHT DA — dieser Fall misst nichts: $datei"
    rot=$((rot+1)); return
  fi
  rm -rf "$KOPIE/$datei"
  jetzt="$(rotZahl)"
  if [ -n "$jetzt" ] && [ "$jetzt" -gt "${BASIS_ROT:-0}" ]; then
    gruen=$((gruen+1)); echo "  ✓ gefangen: $was"
  else
    rot=$((rot+1)); echo "  ✗ NICHT GEFANGEN: $was"
  fi
}

echo; echo "GEGENPROBE — Kim Hub Company${NUR_ANKER:+ · nur die Anker}"; echo

if [ -z "$NUR_ANKER" ]; then
  frisch
  BASIS_ROT="$(rotZahl)"
  if [ -z "$BASIS_ROT" ]; then
    echo "⚠ ABBRUCH: die Ausgangslage laesst sich nicht messen — der Laeufer gibt"
    echo "  keine Zahl aus. Ohne Ausgangslage misst kein einziger Fall etwas."
    exit 2
  fi
  if [ "$BASIS_ROT" -gt 0 ]; then
    echo "⚠ ACHTUNG: die unversehrte Kopie hat schon $BASIS_ROT rote Probe(n)."
    echo "  Das ist KEIN Ergebnis dieser Gegenprobe, sondern ihr Ausgangspunkt."
    echo "  Gemessen wird ab hier gegen $BASIS_ROT, nicht gegen 0."
  else
    echo "  ✓ unveraendert sind die Proben gruen"
  fi
  echo
fi

# ══ DIE DREIZEHN KANON-MODULE ═══════════════════════════════════════════════
# „Kopieren, nicht klonen." Wer eine Kopie am Ort anpasst, erzeugt eine weitere
# Modul-Generation — am 2026-08-16 waren es beim Siegel VIER.

fall "ein Kanon-Modul wird am Ort abgewandelt" sbkim/01_storage.js \
  'var DB_VERSION = 4;' \
  'var DB_VERSION = 5;'

fallweg "ein Kanon-Modul fehlt ganz" sbkim/07_apoptose.js

fall "ein Fingerabdruck wird geleert — die Zeile sieht aus wie ein Waechter" tools/sbkim-drift.mjs \
  '{ datei: "sbkim/16_siegel.js",' \
  '{ datei: "sbkim/16_siegel.js", sha: "", altSha:'

fall "die Herkunft nennt keinen Sage-Commit mehr" tools/sbkim-drift.mjs \
  'commit: "6db0a9f"' \
  'commit: "irgendwann"'

# ══ DIE FUENF KLEBSTOFF-DATEIEN ═════════════════════════════════════════════

fallweg "eine Klebstoff-Datei fehlt — ohne schutz-init gibt es kein Siegel" sbkim/schutz-init.js

# ══ DIE SCHUBLADE ═══════════════════════════════════════════════════════════
# Falle 1 aus Sages LEHREN § 4. Laufen die Stellen auseinander, oeffnet die App
# zwei Schubladen und der Knoten hat zwei Identitaeten — je nachdem, wer zuerst
# zugriff.

fall "der Suffix laeuft zwischen Kopf und storage-init auseinander" sbkim/storage-init.js \
  'var DB_SUFFIX = "kimhubcompany";' \
  'var DB_SUFFIX = "kimhub";'

fall "der Suffix laeuft zwischen Kopf und Modul 23 auseinander" sbkim/rendezvous-init.js \
  'var DB_SUFFIX = "kimhubcompany";' \
  'var DB_SUFFIX = "kimhub";'

fall "die Schublade nimmt den Namen einer fremden App" index.html \
  'window.SBKIM_DB_SUFFIX = "kimhubcompany"' \
  'window.SBKIM_DB_SUFFIX = "kimboard"'

# ══ DIE BEDEUTUNGS-BESCHREIBUNG ═════════════════════════════════════════════
# Modul 03 rechnet daraus den Vektor. Ein Satz ergibt einen Knoten, der zu allem
# und zu nichts passt.

# ⚠ DER ANKER HAENGT AM FELDNAMEN, NICHT AM TEXT. Am 2026-09-09 wurde der
# Beschreibung der Knoten-Name vorangestellt (Klaus: „nicht einmal der Name steht
# darin") — und beide Faelle hier meldeten „ANKER NICHT GEFUNDEN". Sie massen
# nichts mehr, und das sah aus wie zwei bestandene Pruefungen. Ein Text, der
# verbessert werden DARF, ist ein schlechter Anker; der Feldname bleibt.
fall "die Beschreibung schrumpft auf einen Satz" sbkim/rendezvous-init.js \
  'domainDescription:' \
  'domainDescription: "Eine App fuer Auftraege." + "" +   //'

# ⚠ ZUM DRITTEN MAL DERSELBE TOTE ANKER IN DIESER DATEI. Erst hing er an
# „Acht benannte Rollen…", dann an „Kim Hub Company — acht…" — und jedes Mal hat
# eine Textverbesserung ihn ins Leere zeigen lassen. Der Text DARF sich aendern;
# der Feldname nicht. Er ist der einzige Anker, der eine Verbesserung ueberlebt.
fall "die zwei Wege zur Spore beschreiben den Knoten verschieden" sbkim/siegel-inhalt.js \
  'domainDescription:' \
  'domainDescription: "Ein anderer Knoten." + //'

# ══ DAS SIEGEL MIT DEM ANDOCK-WERKZEUG ══════════════════════════════════════
# „mit Zelle und auch dem Siegel" heisst Modul 16 MIT dem Wizard darin. Der
# Identitaets-Wechsler fehlt in fruehen Kopien am haeufigsten.

# ⚠ SABOTIERT WIRD DAS ELEMENT UND SEINE VERDRAHTUNG, nicht ein Name aus dem
# Kopf-Kommentar. Die erste Fassung dieser Faelle zielte auf `andockSwitchIdentity`
# — und den Namen gibt es in dieser Datei nur im Kommentar, der die Herkunft
# nennt. Die Gegenprobe meldete „TOTER ANKER", und dabei kam heraus, dass FUENF
# Waechter genau daran haengen geblieben waren: fuenf gruene Haken ueber einer
# Datei, in der keiner der Namen als Code vorkommt.
fall "der Identitaets-Wechsler faellt aus dem Wizard" sbkim/siegel-inhalt.js \
  '<select id="sbwiz-idsel"' \
  '<select id="sbwiz-idsel-abgeschaltet"'

fall "der Wechsler zeigt nur noch eine Liste, ohne wirklich zu wechseln" sbkim/siegel-inhalt.js \
  'function switchWizardIdentity' \
  'function switchWizardIdentityAbgeschaltet'

fall "der Knopf zum Signieren und Herunterladen der Spore ist nicht verdrahtet" sbkim/siegel-inhalt.js \
  'dlg.querySelector("#sbwiz-s2").addEventListener' \
  'dlg.querySelector("#sbwiz-s2x") && dlg.querySelector("#sbwiz-s2x").addEventListener'

fall "das Wappen-Band bleibt leer — Modul 16 raet keinen Namen" sbkim/schutz-init.js \
  'ribbonText: "KIM HUB COMPANY",' \
  ''

# ══ DER GERAETENAME ════════════════════════════════════════════════════════
# Netzweite Bauregel INTERFACES § 11.7.

fall "das Geraetenamen-Feld wird nicht mehr ins Panel gehaengt" sbkim/rendezvous-init.js \
  'feld.setAttribute("data-sbkim-geraetename", "1");' \
  'feld.setAttribute("data-sbkim-name-alt", "1");'

# ⚠ EIN ECHTER AUFRUF, KEIN KOMMENTAR. Die erste Fassung schrieb nur das Wort
# in einen Kommentar — gefangen haette das der Drift-Guard, nicht der Waechter,
# um den es hier geht. Eine Sabotage muss genau das treffen, was der Waechter
# misst. (Der Drift-Guard wird trotzdem mit rot: eine Kanon-Datei zu aendern IST
# der Fehler, und die zwei roten Zeilen sagen zusammen mehr als eine.)
fall "das Feld wandert in die byte-kopierte Panel-Datei" sbkim/23_rendezvous_ui.js \
  '(function (global) {' \
  '(function (global) { try { document.createElement("input").setAttribute("data-sbkim-geraetename", "1"); } catch (e) {}'

fall "der Geraetename wandert in die signierte Spore" sbkim/rendezvous-init.js \
  '          nodeName: CFG.nodeName,
          domainDescription: CFG.domainDescription,' \
  '          nodeName: anzeigeName(),
          domainDescription: CFG.domainDescription,'

# ══ DER OFFLINE-VORRAT ══════════════════════════════════════════════════════
# Falle 4. `c.add()` schluckt einen Fehlschlag einzeln — genau deshalb faellt
# eine vergessene Datei sonst NICHT auf.

fall "ein Kanon-Modul faellt aus dem Offline-Vorrat" sw.js \
  '"./sbkim/16_siegel.js",' \
  ''

fall "eine Klebstoff-Datei faellt aus dem Offline-Vorrat" sw.js \
  '"./sbkim/siegel-inhalt.js",' \
  ''

# ══ EMPFANGSMODUS MIT ANTWORTRECHT ══════════════════════════════════════════
# Sages Verfassung: kein Crawler, keine Pulsation, keine Eigenanfragen.

fall "der Knoten faengt an, von selbst anzufragen" sbkim/nostr-listen-init.js \
  'return A.listenNostr()' \
  'A.announce && A.announce(); return A.listenNostr()'

fall "Modul 23 legt beim Seitenstart wortlos eine Kennung an" sbkim/rendezvous-init.js \
  '          createIdentity: identitaetErzeugen,
          /* `ensureIdentity` ABSICHTLICH NICHT' \
  '          createIdentity: identitaetErzeugen,
          ensureIdentity: true,
          /* `ensureIdentity` ABSICHTLICH NICHT'

# ⚠ HIER ENDET DIE FALL-LISTE. Was dahinter steht, sammelt der Anker-Waechter
# nicht mehr ein — sein Block steigt mit einem eigenen `exit` aus.

if [ -n "$NUR_ANKER" ]; then
  python3 -c '
import os, sys
roh = open(sys.argv[1], "rb").read().decode("utf-8")
tot, geprueft = [], 0
for satz in roh.split("\x1e"):
    if not satz: continue
    datei, _, anker = satz.partition("\x1f")
    geprueft += 1
    pfad = os.path.join(sys.argv[2], datei)
    if not anker:
        if not os.path.exists(pfad): tot.append(datei + " (Datei fehlt)")
        continue
    try: inhalt = open(pfad, encoding="utf-8").read()
    except OSError: tot.append(datei + " (nicht lesbar)"); continue
    if anker not in inhalt:
        tot.append(datei + ": " + anker.splitlines()[0][:70])
for t in tot: print("  TOTER ANKER  " + t)
print("— %d Anker geprueft, %d tot —" % (geprueft, len(tot)))
sys.exit(1 if tot else 0)
' "$ANKERLISTE" "$WURZEL"
  ergebnis=$?
  rm -f "$ANKERLISTE"
  exit $ergebnis
fi

echo; echo "— $gruen gefangen, $rot durchgerutscht${uebersprungen:+, $uebersprungen uebersprungen} —"; echo
[ "$rot" -gt 0 ] && exit 1
exit 0
