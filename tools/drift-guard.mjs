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
 * ⚠ WAS BEWUSST NICHT GEPINNT IST: `sw.js` und `company.webmanifest`.
 * Sie nennen den Dateinamen der Startseite, und der ist hier ein anderer
 * (`index.html` statt `start.html`) — app-eigener Klebstoff. Der Unterschied
 * steht im Kopf des Workers, damit ihn niemand für einen Fehler hält.
 *
 * Quelle: github.com/lausiklauskn-png/Kimhub (Stand 2026-09-07)
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
  commit: "af010c8",
  datum:  "2026-09-07T23:03:09+02:00",
  betreff: "Emil reisst nicht mehr, die Konferenz steht im Buch, das Tor sagt dass es wartet",
};

export const ERWARTET = [
  { datei: "index.html",                herkunft: "start.html",              sha: "c7064cdbf85b9dc9780c1278ddc25d42dd1f59a3537595aff66aab06afe7a5ce" },
  { datei: "company.js",                herkunft: "company.js",              sha: "8225958ef89441c83cceb7265c4f17423017f24fb8bc61c2f9e218e587629870" },
  { datei: "ansicht.js",                herkunft: "ansicht.js",              sha: "b4f87404f9b0542f520d92dbb6f493925c9d95aff1d720bec7034cf4ba19317a" },
  { datei: "buehne.js",                 herkunft: "buehne.js",               sha: "2b55844be02df209c8f18d7f8434b4a39bebe2621b7720a3e2b725bfdecaee9c" },
  { datei: "zeit.js",                   herkunft: "zeit.js",                 sha: "be43df30dd1a47045094f2a623d2089583c0354c8b58a640370f251d0b600a1a" },
  /* ⚠ NEU AM 2026-09-07. `zusammen()` ist aus `schicht/kosten.mjs` hierher
     umgezogen, weil die Ansicht ein klassisches Skript ist und es nicht
     importieren kann. Dieselbe Bauart wie `zeit.js` — und derselbe Grund:
     was sich nachrechnen laesst, gehoert dorthin, wo es ueberall laeuft. */
  { datei: "kassen.js",                 herkunft: "kassen.js",               sha: "c6caa23ea7c11d4c81955ef8f3348537a2b2cbfd606fd2efa203dbf3da205e29" },
  { datei: "idb.js",                    herkunft: "idb.js",                  sha: "b244ab3f832bb4d4cd5ec87e51de364df5716ee7ca6fc8a2bceeea6b6c9bbd51" },
  { datei: "schluesseltresor.js",       herkunft: "schluesseltresor.js",     sha: "eaed30e8f3921835a3f58b69f89d9b008831f69f164ad1dfec630fa43161f666" },
  { datei: "schicht/konferenz.mjs",     herkunft: "schicht/konferenz.mjs",   sha: "41e2e4f38bc68f380da7e590955715a4b93c431572bfec451b3f7813b0dcaf39" },
  { datei: "schicht/plan-form.mjs",  herkunft: "schicht/plan-form.mjs", sha: "6dcefbc19383235d1f0bf0ea16b12994d1dcb2af6db2acd943664a09c0a0f6a0" },
  { datei: "schicht/umfang.mjs",     herkunft: "schicht/umfang.mjs",    sha: "f0497c620434c0bc9c24268f23616174ca6ed658e4a56da0b47edf3340f35990" },
  { datei: "schicht/schicht.mjs",       herkunft: "schicht/schicht.mjs",     sha: "d2fde3cb48c2dcbda9312bc1eed8413c4d1dabef6105e89b09d6b46e8ee7dbec" },
  { datei: "schicht/api.mjs",           herkunft: "schicht/api.mjs",         sha: "7474a117b640f6c1f4a722c44b51025f93e6ba365e0fffe92e2888322009bb94" },
  { datei: "schicht/transport-netz.mjs",herkunft: "schicht/transport-netz.mjs", sha: "6c149df086ff0ea820060385132b7513352a796f2b7c64883732acb1f1078797" },
  { datei: "schicht/kosten.mjs",        herkunft: "schicht/kosten.mjs",      sha: "eefa1fa5e1e48693df90b68e08f3bf051fb04c3052eb6a38f6584158293df96e" },
  { datei: "schicht/beispiele.mjs",     herkunft: "schicht/beispiele.mjs",   sha: "8529582d68441b87b14bc70e35cc32e355b173bd2c1b1f4103d5b9ac24fddb5f" },
  { datei: "schicht/grundsaetze.mjs",   herkunft: "schicht/grundsaetze.mjs", sha: "340117e1f311aba0bfce9730fad28b90e3fdddde8aa3d0e103073b0bea883523" },
  { datei: "schicht/fahrtenbuch-form.mjs",  herkunft: "schicht/fahrtenbuch-form.mjs", sha: "85c99d330b36f95ef601a90903a74af42567a3d68e7ddfb13d055ed0e91f5553" },
  { datei: "schicht/ablage-idb.mjs",    herkunft: "schicht/ablage-idb.mjs",  sha: "4e240592e9eb65e21bad68a3bb1fe8d859b113bb800009406e1254f29c5a1c9b" },
  { datei: "schicht/ablage-speicher.mjs", herkunft: "schicht/ablage-speicher.mjs", sha: "9c67aca234783a39ce2599bd2763393180d56091160b6c87f1f3c6b6bbb48fd3" },
  { datei: "schicht/baum-speicher.mjs", herkunft: "schicht/baum-speicher.mjs", sha: "f854d3a9552d9cb1eba8aabe4a4c15af711cc09364a34087e4cc3cff6528a2a9" },
  { datei: "schicht/werkzeuge.mjs",     herkunft: "schicht/werkzeuge.mjs",   sha: "4e81dfbe5588104e776e2cb5e8be5b2a2cf02042563d8bbca7acce8f80761cef" },
  { datei: "schicht/spind.mjs",         herkunft: "schicht/spind.mjs",       sha: "6b5d0d6601139cf9c5555625e501ab7e1695c917d4f2a24463deb36d08e34c56" },
  { datei: "schicht/ruf.mjs",           herkunft: "schicht/ruf.mjs",         sha: "a58adfbe1e5b3cf241f63a29f70d7e1ae0c1530013ef775d037c712d5499ab3b" },
  { datei: "schicht/rollen.mjs",        herkunft: "schicht/rollen.mjs",      sha: "00faa686ccb8f73d83dc8aff4c630942c894c4f58a6a3c6ce61b5ec9eb01fd4f" },
  { datei: "schicht/grundsaetze.md",    herkunft: "schicht/grundsaetze.md",  sha: "422a3c7b3cb35fea6dade1409340907621ca6a6615c9a9622cfb999d369c0bfd" },
  { datei: "schicht/mitarbeiter.json",  herkunft: "schicht/mitarbeiter.json", sha: "c5329371b437e58ad40d67c4d9c3f00d0bf300be2fda17f016bb3db1ce8c110a" },
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
