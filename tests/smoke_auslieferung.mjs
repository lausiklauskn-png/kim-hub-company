/*
 * WAS PAGES AUSLIEFERT — und was ausdrücklich nicht.
 *
 * Diese App teilt sich die Adresse `lausiklauskn-png.github.io` mit rund
 * 21 Geschwister-Apps. `caches` gehört dem URSPRUNG, nicht dem Pfad: ein
 * Service-Worker unter irgendeinem Unterpfad darf jeden Vorrat des ganzen
 * Ursprungs aufzählen und löschen.
 *
 * Genau das tut der Bündel-Prüfer unter `werkzeuge/buendel-pruefer/` — er ist
 * BELEGMATERIAL aus Lauf 01 und wird deshalb nicht repariert, sondern nicht
 * ausgeliefert (`_config.yml`, `exclude`). Gemessen am 2026-09-08 mit Jekyll
 * 4.4.1, in beide Richtungen: mit der Zeile bleibt das Verzeichnis draussen und
 * die App vollständig, ohne sie werden alle sechs Dateien ausgeliefert.
 *
 * ⚠ WAS DIESER WÄCHTER MISST — und was nicht.
 *
 * Er misst die ZUSICHERUNG, nicht die Zeile: **kein fremder Service-Worker wird
 * ausgeliefert.** Deshalb sucht er selbst nach `sw.js`-Dateien, statt einen
 * Namen abzuhaken. Käme morgen ein zweites Werkstück mit demselben Fehler
 * dazu, fiele er um — ein Wächter auf „die Zeile steht da" täte das nicht.
 *
 * Er misst NICHT, ob GitHub Pages sich daran hält. Das hängt an einer
 * Einstellung, die niemand von hier aus sieht (baut Pages mit Jekyll aus dem
 * Zweig?), und `github.io` weist der Egress-Proxy ohnehin ab. **Nach dem Merge
 * muss die Adresse einmal von Hand aufgerufen werden; sie muss 404 antworten.**
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const NAME = "Was ausgeliefert wird";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Alle sw.js im Depot, ohne die Wegwerf-Ecken. */
function arbeiterSuchen(ort, gefunden = []) {
  for (const eintrag of readdirSync(ort)) {
    if (eintrag === ".git" || eintrag === "node_modules" || eintrag === "_site") continue;
    const pfad = join(ort, eintrag);
    if (statSync(pfad).isDirectory()) arbeiterSuchen(pfad, gefunden);
    else if (/^.*sw\.js$/.test(eintrag)) gefunden.push(relative(WURZEL, pfad));
  }
  return gefunden;
}

export async function lauf(ok) {
  const konfig = readFileSync(join(WURZEL, "_config.yml"), "utf8");

  /* Die Ausschluss-Einträge, wie Jekyll sie liest: Listenpunkte unter `exclude`.
     Kommentare zählen nicht mit — sonst genügte ein erwähnender Satz. */
  const zeilen = konfig.split("\n");
  const start = zeilen.findIndex((z) => /^exclude:\s*$/.test(z));
  const ausgeschlossen = [];
  for (let i = start + 1; start >= 0 && i < zeilen.length; i++) {
    const t = zeilen[i].match(/^\s+-\s+(\S+)\s*$/);
    if (t) ausgeschlossen.push(t[1]);
    else if (zeilen[i].trim() && !zeilen[i].trimStart().startsWith("#")) break;
  }
  ok(`_config.yml hat eine exclude-Liste (${ausgeschlossen.length} Einträge)`,
    start >= 0 && ausgeschlossen.length > 0);

  /* ⚠ `exclude` ERSETZT Jekylls Vorgaben. Fehlen sie hier, sind sie weg — heute
     folgenlos, beim nächsten Zuwachs nicht. */
  ok("und trägt Jekylls eigene Vorgaben mit, weil exclude sie ersetzt",
    ausgeschlossen.includes("node_modules/") && ausgeschlossen.includes("Gemfile"));

  /* DIE ZUSICHERUNG: nur der Service-Worker DIESER App wird ausgeliefert. */
  const arbeiter = arbeiterSuchen(WURZEL);
  ok(`die Service-Worker im Depot sind gefunden (${arbeiter.join(", ")})`,
    arbeiter.length >= 1 && arbeiter.includes("sw.js"));

  const fremde = arbeiter.filter((p) => p !== "sw.js");
  const ungedeckt = fremde.filter(
    (p) => !ausgeschlossen.some((a) => p.startsWith(a.replace(/\/$/, "") + "/")));
  ok("kein FREMDER Service-Worker wird ausgeliefert" +
     (ungedeckt.length ? " — ungedeckt: " + ungedeckt.join(", ") : ""),
    ungedeckt.length === 0);

  /* Die Gegenrichtung. Ohne sie wäre die Prüfung darüber auch dann grün, wenn es
     gar keinen fremden Arbeiter gäbe — sie hätte dann nichts gemessen und sähe
     aus wie eine bestandene Prüfung. */
  ok(`es gibt überhaupt einen fremden Service-Worker zu decken (${fremde.length})`,
    fremde.length > 0);

  /* Und die App selbst darf NICHT mit ausgeschlossen werden. */
  const appTot = ["index.html", "company.js", "sw.js", "ansicht.js"]
    .filter((d) => ausgeschlossen.some((a) => d === a || d.startsWith(a.replace(/\/$/, "") + "/")));
  ok("die App selbst wird weiter ausgeliefert" +
     (appTot.length ? " — versehentlich ausgeschlossen: " + appTot.join(", ") : ""),
    appTot.length === 0);
}
