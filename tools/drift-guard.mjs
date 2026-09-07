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
  commit: "6ffc0be",
  datum:  "2026-09-07T11:31:52+02:00",
  betreff: "Jede Schicht mit Konferenz starb an einer toten Zone (#118)",
};

export const ERWARTET = [
  { datei: "index.html",                herkunft: "start.html",              sha: "7befb19477857707d14ffd34095cebdfaccf9d6cf4095482bad1d49dd5e451e9" },
  { datei: "company.js",                herkunft: "company.js",              sha: "8fdae5a6d29f76f66ae89df9e71977beee22c4a0ad35f57aca6bce89838985bc" },
  { datei: "ansicht.js",                herkunft: "ansicht.js",              sha: "f00f27a86d88d4138d6e9f81fe8834d56a60c57e4b8cf89e86b47643f98a8f98" },
  { datei: "buehne.js",                 herkunft: "buehne.js",               sha: "a9b1f566181746af1c6790ce69c04f4fee3f633bc2d4ab96b139e6263fdb7951" },
  { datei: "zeit.js",                   herkunft: "zeit.js",                 sha: "48f940fd937b93d35e2752f6ad542d7ad18ff7bb956fb065197105e373816d98" },
  { datei: "idb.js",                    herkunft: "idb.js",                  sha: "b244ab3f832bb4d4cd5ec87e51de364df5716ee7ca6fc8a2bceeea6b6c9bbd51" },
  { datei: "schluesseltresor.js",       herkunft: "schluesseltresor.js",     sha: "eaed30e8f3921835a3f58b69f89d9b008831f69f164ad1dfec630fa43161f666" },
  { datei: "schicht/konferenz.mjs",     herkunft: "schicht/konferenz.mjs",   sha: "88495480475be2844ee2f5253f07e0a74b5740056b9d4a01c07652d0b209a147" },
  { datei: "schicht/plan-form.mjs",  herkunft: "schicht/plan-form.mjs", sha: "3e94b0840f7e55b345ff9f5310a1bba3009208b1af8c06c6866b4600f88a7bad" },
  { datei: "schicht/umfang.mjs",     herkunft: "schicht/umfang.mjs",    sha: "f0497c620434c0bc9c24268f23616174ca6ed658e4a56da0b47edf3340f35990" },
  { datei: "schicht/schicht.mjs",       herkunft: "schicht/schicht.mjs",     sha: "353177c0fa24843bd64647765db12a145063c4b401b07446b96bbe0365214ad0" },
  { datei: "schicht/api.mjs",           herkunft: "schicht/api.mjs",         sha: "8c4408345485064e5c0bd4ec4769cd7aa3e7d914c5e36b24f11f9b860b5b3e00" },
  { datei: "schicht/transport-netz.mjs",herkunft: "schicht/transport-netz.mjs", sha: "6c149df086ff0ea820060385132b7513352a796f2b7c64883732acb1f1078797" },
  { datei: "schicht/kosten.mjs",        herkunft: "schicht/kosten.mjs",      sha: "a6e6c2bed9a67ca4961971527fa4fb26283d0687ce994cc7416859e399115c0e" },
  { datei: "schicht/beispiele.mjs",     herkunft: "schicht/beispiele.mjs",   sha: "8529582d68441b87b14bc70e35cc32e355b173bd2c1b1f4103d5b9ac24fddb5f" },
  { datei: "schicht/grundsaetze.mjs",   herkunft: "schicht/grundsaetze.mjs", sha: "340117e1f311aba0bfce9730fad28b90e3fdddde8aa3d0e103073b0bea883523" },
  { datei: "schicht/fahrtenbuch-form.mjs",  herkunft: "schicht/fahrtenbuch-form.mjs", sha: "7bd321a01c05051ac2c42bcc0a11cd34c11b9ad2ccbaa47b862e858ba3b12646" },
  { datei: "schicht/ablage-idb.mjs",    herkunft: "schicht/ablage-idb.mjs",  sha: "4e240592e9eb65e21bad68a3bb1fe8d859b113bb800009406e1254f29c5a1c9b" },
  { datei: "schicht/ablage-speicher.mjs", herkunft: "schicht/ablage-speicher.mjs", sha: "9c67aca234783a39ce2599bd2763393180d56091160b6c87f1f3c6b6bbb48fd3" },
  { datei: "schicht/baum-speicher.mjs", herkunft: "schicht/baum-speicher.mjs", sha: "f854d3a9552d9cb1eba8aabe4a4c15af711cc09364a34087e4cc3cff6528a2a9" },
  { datei: "schicht/werkzeuge.mjs",     herkunft: "schicht/werkzeuge.mjs",   sha: "4e81dfbe5588104e776e2cb5e8be5b2a2cf02042563d8bbca7acce8f80761cef" },
  { datei: "schicht/spind.mjs",         herkunft: "schicht/spind.mjs",       sha: "6b5d0d6601139cf9c5555625e501ab7e1695c917d4f2a24463deb36d08e34c56" },
  { datei: "schicht/ruf.mjs",           herkunft: "schicht/ruf.mjs",         sha: "2e5b8e1d0dff1fcbb2ba8098c9fba43f69ab7ee3e363163f4ea8a1442f92f07e" },
  { datei: "schicht/rollen.mjs",        herkunft: "schicht/rollen.mjs",      sha: "e75438066ff26e59dd3586f7e7332842bd87ed1a3e0dccfb80083eeb95ead72c" },
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
