/*
 * Drift-Guard — wacht per SHA-256 darüber, dass die byte-1:1 aus Kimhub
 * kopierten Dateien hier NICHT abgewandelt werden.
 *
 * WARUM. Die netzweite Leitplanke heisst „kopieren, nicht klonen". Wer eine
 * Kopie am Ort anpasst, erzeugt eine weitere Generation — und dann laufen im
 * Netz mehrere Fassungen desselben Moduls, ohne dass jemand es sieht. Am
 * 2026-08-16 waren es beim Netz-Fenster zwei Generationen und beim Siegel
 * VIER. Reift etwas, wird es in Kimhub gepflegt und hier NEU kopiert, dann der
 * Fingerabdruck unten nachgezogen — nie umgekehrt.
 *
 * ⚠ HIER HÄNGT MEHR DARAN ALS SONST. In Kimhub steht der ganze Prüfstand:
 * 1293 Prüfungen und eine Gegenprobe mit über 460 eingebauten Fehlern. Dieses
 * Depot hat davon nichts — es hat die Dateien. Eine abgewandelte Kopie hier
 * wäre also nicht nur eine zweite Generation, sondern eine UNGEPRÜFTE.
 *
 * ⚠ WAS BEWUSST NICHT GEPINNT IST: `company-sw.js` und `company.webmanifest`.
 * Sie nennen den Dateinamen der Startseite, und der ist hier ein anderer
 * (`index.html` statt `start.html`) — app-eigener Klebstoff. Der Unterschied
 * steht im Kopf des Workers, damit ihn niemand für einen Fehler hält.
 *
 * Quelle: github.com/lausiklauskn-png/Kimhub (Stand 2026-09-05)
 * Lauf:   node tools/drift-guard.mjs
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");

/* `index.html` steht hier mit dem Namen, den die Datei in Kimhub trägt —
   der Inhalt ist byte-gleich, nur die Datei heisst dort anders. */
/*
 * WOHER DIESE BYTES KOMMEN — eine Angabe, EINE Stelle.
 *
 * ⚠ Bis zum 2026-09-06 stand der Stand nur in `version.json`, von Hand
 * gepflegt. Beim Kopieren der Schichtuhr habe ich sie nicht nachgezogen: die
 * App zeigte Klaus „Stand c7a76b6" und lief dabei auf neuerem Code. Eine
 * Angabe, die von Hand nachgezogen werden muss, wird irgendwann nicht
 * nachgezogen — und eine falsche Stand-Angabe ist schlimmer als keine, weil
 * genau sie die Frage „bin ich aktuell?" beantworten soll.
 *
 * `tools/version-schreiben.mjs` erzeugt `version.json` hieraus,
 * `tests/smoke.mjs` besteht darauf, dass beide übereinstimmen. Wer die
 * Fingerabdrücke unten nachzieht und das hier vergisst, wird rot.
 */
export const HERKUNFT = {
  commit: "fbfec4a",
  datum:  "2026-09-06T23:37:15+02:00",
  betreff: "Wer welche Rolle hat — unter dem Bild, nicht nur was er gerade tut",
};

export const ERWARTET = [
  { datei: "index.html",                herkunft: "start.html",              sha: "8f253b03b5fe747e333fa9bb744dbff72a581106ac922fa5af5241f7d439a7cd" },
  { datei: "company.js",                herkunft: "company.js",              sha: "e999dbb398378bfdda11e9ba678fb433704bbbae4bcadd5965c23e60b1b3e11a" },
  { datei: "ansicht.js",                herkunft: "ansicht.js",              sha: "b33311e60079971b3bbd58a8c74ea91f26983ee006cfc9791b0867595c199060" },
  { datei: "buehne.js",                 herkunft: "buehne.js",               sha: "c438ad9d6a57464f7f743889f7c69cec83413e2abcf600c5e034e8fc799cb02b" },
  { datei: "zeit.js",                   herkunft: "zeit.js",                 sha: "48f940fd937b93d35e2752f6ad542d7ad18ff7bb956fb065197105e373816d98" },
  { datei: "idb.js",                    herkunft: "idb.js",                  sha: "b244ab3f832bb4d4cd5ec87e51de364df5716ee7ca6fc8a2bceeea6b6c9bbd51" },
  { datei: "schluesseltresor.js",       herkunft: "schluesseltresor.js",     sha: "eaed30e8f3921835a3f58b69f89d9b008831f69f164ad1dfec630fa43161f666" },
  { datei: "schicht/konferenz.mjs",     herkunft: "schicht/konferenz.mjs",   sha: "813249e0a4c88dc5f4972a2149f35b6180547f271d53be056d3ebf99435ebeb7" },
  { datei: "schicht/schicht.mjs",       herkunft: "schicht/schicht.mjs",     sha: "10b6181c20ceea09787992543f1fb5c167019fa691d39501bb2070884cb51d73" },
  { datei: "schicht/api.mjs",           herkunft: "schicht/api.mjs",         sha: "4151fb4758eea0331683e57d693961358130b598f430254207ae3fd6416153bd" },
  { datei: "schicht/transport-netz.mjs",herkunft: "schicht/transport-netz.mjs", sha: "d3bd8a6059672d3e816acaba5b68834027d6a4d9fd160e93490c5660edc76413" },
  { datei: "schicht/kosten.mjs",        herkunft: "schicht/kosten.mjs",      sha: "e901b14a295d6d332e5deb8d6100c6731cff1c3f0909e05ea0477a888c685841" },
  { datei: "schicht/beispiele.mjs",     herkunft: "schicht/beispiele.mjs",   sha: "9ac09d506f2a397b240bfec843b46908da3f29ea375dfc027557e82cf3213fef" },
  { datei: "schicht/grundsaetze.mjs",   herkunft: "schicht/grundsaetze.mjs", sha: "340117e1f311aba0bfce9730fad28b90e3fdddde8aa3d0e103073b0bea883523" },
  { datei: "schicht/fahrtenbuch-form.mjs",  herkunft: "schicht/fahrtenbuch-form.mjs", sha: "7bd321a01c05051ac2c42bcc0a11cd34c11b9ad2ccbaa47b862e858ba3b12646" },
  { datei: "schicht/ablage-idb.mjs",    herkunft: "schicht/ablage-idb.mjs",  sha: "4e240592e9eb65e21bad68a3bb1fe8d859b113bb800009406e1254f29c5a1c9b" },
  { datei: "schicht/ablage-speicher.mjs", herkunft: "schicht/ablage-speicher.mjs", sha: "9c67aca234783a39ce2599bd2763393180d56091160b6c87f1f3c6b6bbb48fd3" },
  { datei: "schicht/baum-speicher.mjs", herkunft: "schicht/baum-speicher.mjs", sha: "f854d3a9552d9cb1eba8aabe4a4c15af711cc09364a34087e4cc3cff6528a2a9" },
  { datei: "schicht/werkzeuge.mjs",     herkunft: "schicht/werkzeuge.mjs",   sha: "4e81dfbe5588104e776e2cb5e8be5b2a2cf02042563d8bbca7acce8f80761cef" },
  { datei: "schicht/spind.mjs",         herkunft: "schicht/spind.mjs",       sha: "6b5d0d6601139cf9c5555625e501ab7e1695c917d4f2a24463deb36d08e34c56" },
  { datei: "schicht/ruf.mjs",           herkunft: "schicht/ruf.mjs",         sha: "a9377af5321eb796e32fdbbcd1b7dba71950f8228c8f6f9f2981b84e8102633d" },
  { datei: "schicht/rollen.mjs",        herkunft: "schicht/rollen.mjs",      sha: "0ea2d5dee88f87ba3dd1f530efe0687512c22c51dbaaf890f0cce325bd5fb40a" },
  { datei: "schicht/grundsaetze.md",    herkunft: "schicht/grundsaetze.md",  sha: "422a3c7b3cb35fea6dade1409340907621ca6a6615c9a9622cfb999d369c0bfd" },
  { datei: "schicht/mitarbeiter.json",  herkunft: "schicht/mitarbeiter.json", sha: "1b38836c9cb5dde6804cb61169ba1bed60aa85ae0cab68774b287414bcfca8dc" },
];

export function abdruck(datei) {
  return createHash("sha256").update(readFileSync(join(WURZEL, datei))).digest("hex");
}

export function pruefe() {
  const abgewichen = [], fehlend = [], ungepinnt = [];
  for (const e of ERWARTET) {
    /* ⚠ EIN LEERER FINGERABDRUCK IST KEIN BESTANDENER. Er heisst „hier steht
       noch nichts" — und ein Eintrag ohne Abdruck bewachte gar nichts, während
       die Zeile aussieht wie ein Wächter. Deshalb zählt er als Befund. */
    if (!e.sha) { ungepinnt.push(e.datei); continue; }
    let ist;
    try { ist = abdruck(e.datei); }
    catch { fehlend.push(e.datei); continue; }
    if (ist !== e.sha) abgewichen.push({ ...e, ist });
  }
  return { abgewichen, fehlend, ungepinnt, geprueft: ERWARTET.length };
}

/* Nur beim direkten Aufruf laufen — sonst schreibt ein Import dieser Datei
   in die Ausgabe und beendet unter Umständen den Läufer. Genau das ist in
   Kimhub am 2026-08-26 passiert. */
if (process.argv[1] && process.argv[1].endsWith("drift-guard.mjs")) {
  const r = pruefe();
  for (const a of r.abgewichen)
    console.error(`  ✗ ABGEWICHEN: ${a.datei}\n      erwartet ${a.sha}\n      ist      ${a.ist}`);
  for (const f of r.fehlend) console.error(`  ✗ FEHLT: ${f}`);
  for (const u of r.ungepinnt) console.error(`  ✗ OHNE FINGERABDRUCK: ${u}`);
  const schlecht = r.abgewichen.length + r.fehlend.length + r.ungepinnt.length;
  console.log(`Drift-Guard: ${r.geprueft - schlecht} byte-1:1, ${schlecht} zu klären`);
  process.exit(schlecht ? 1 : 0);
}
