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
 * ⚠ DIESER GUARD IST NICHT DER EINZIGE. `tools/sbkim-drift.mjs` beantwortet
 * eine ANDERE Frage: „ist der Knoten noch der Knoten aus SAGE?" Zwei Quellen,
 * zwei Herkuenfte, zwei Listen — zusammengeworfen wuesste bei einer Abweichung
 * niemand, in welchem Depot nachzuziehen ist, und genau das soll ein
 * Drift-Guard beantworten.
 *
 * Quelle: github.com/lausiklauskn-png/Kimhub (Stand 2026-09-08)
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
  commit: "1332336",
  datum:  "2026-10-18T20:33:25+02:00",
  betreff: "Installieren-Knopf immer da (gemeinsame Datei aus Sage) (#402)",
};

export const ERWARTET = [
  { datei: "index.html",                herkunft: "start.html",              sha: "7cbd532cf205aa19d69b83553fde90ff6cddb73fdd80abca25b535157dba332c" },
  { datei: "company.js",                herkunft: "company.js",              sha: "9a6e446cd9ab934d593ebdb9d34dfba1b329b734c7fd5af268fe78eeb98e96c2" },
  { datei: "ansicht.js",                herkunft: "ansicht.js",              sha: "282b7a131060998f2d93230dceb838510869a5801220929fa8f4963d681385b5" },
  { datei: "buehne.js",                 herkunft: "buehne.js",               sha: "4f0249c287a572240255f5ab591ac8899fc985a9c01c0b5a22e7ee2ecd760b62" },
  { datei: "zeit.js",                   herkunft: "zeit.js",                 sha: "278ac1fd6e93bff68fd51fd33e46fbc845580f6f1d956c0404861b5067dcc8e6" },
  /* ⚠ NEU AM 2026-09-07. `zusammen()` ist aus `schicht/kosten.mjs` hierher
     umgezogen, weil die Ansicht ein klassisches Skript ist und es nicht
     importieren kann. Dieselbe Bauart wie `zeit.js` — und derselbe Grund:
     was sich nachrechnen laesst, gehoert dorthin, wo es ueberall laeuft. */
  { datei: "kassen.js",                 herkunft: "kassen.js",               sha: "0f3a2550e44423b87e1f57ce8733fc0b529158b21766ffbdad3fd5471c5de193" },
  { datei: "idb.js",                    herkunft: "idb.js",                  sha: "b244ab3f832bb4d4cd5ec87e51de364df5716ee7ca6fc8a2bceeea6b6c9bbd51" },
  { datei: "schluesseltresor.js",       herkunft: "schluesseltresor.js",     sha: "eaed30e8f3921835a3f58b69f89d9b008831f69f164ad1dfec630fa43161f666" },
  { datei: "schicht/konferenz.mjs",     herkunft: "schicht/konferenz.mjs",   sha: "6af9b83b85d9b72916c42a35c072ce21afc21c68fb3d3e68ca707cc353263b9c" },
  { datei: "schicht/plan-form.mjs",  herkunft: "schicht/plan-form.mjs", sha: "6dcefbc19383235d1f0bf0ea16b12994d1dcb2af6db2acd943664a09c0a0f6a0" },
  { datei: "schicht/umfang.mjs",     herkunft: "schicht/umfang.mjs",    sha: "f0497c620434c0bc9c24268f23616174ca6ed658e4a56da0b47edf3340f35990" },
  { datei: "schicht/schicht.mjs",       herkunft: "schicht/schicht.mjs",     sha: "338f67eadbd7afe174314338c21799c8b3ba3930f380e019d16bed3d113608ca" },
  { datei: "schicht/api.mjs",           herkunft: "schicht/api.mjs",         sha: "49543deb23eb918ea0e6e59d96798b4966935b534cd131023c650fc9eebbaa57" },
  { datei: "schicht/transport-netz.mjs",herkunft: "schicht/transport-netz.mjs", sha: "6c149df086ff0ea820060385132b7513352a796f2b7c64883732acb1f1078797" },
  { datei: "schicht/kosten.mjs",        herkunft: "schicht/kosten.mjs",      sha: "c3c385694d2f5fde360ed983195ff8e5117cf70160025f0e3a5deffa4416b731" },
  { datei: "schicht/beispiele.mjs",     herkunft: "schicht/beispiele.mjs",   sha: "611e77fd8f281df1a79cda98197d94df15fab5917f48c71d35daf56e3d74dd25" },
  { datei: "schicht/grundsaetze.mjs",   herkunft: "schicht/grundsaetze.mjs", sha: "340117e1f311aba0bfce9730fad28b90e3fdddde8aa3d0e103073b0bea883523" },
  { datei: "schicht/fahrtenbuch-form.mjs",  herkunft: "schicht/fahrtenbuch-form.mjs", sha: "e31a23e8c490544b49f00ff9adcb01d8cfd695085ab6b027a68a35d16671c955" },
  { datei: "schicht/ablage-idb.mjs",    herkunft: "schicht/ablage-idb.mjs",  sha: "4e240592e9eb65e21bad68a3bb1fe8d859b113bb800009406e1254f29c5a1c9b" },
  { datei: "schicht/ablage-speicher.mjs", herkunft: "schicht/ablage-speicher.mjs", sha: "9c67aca234783a39ce2599bd2763393180d56091160b6c87f1f3c6b6bbb48fd3" },
  { datei: "schicht/baum-speicher.mjs", herkunft: "schicht/baum-speicher.mjs", sha: "f854d3a9552d9cb1eba8aabe4a4c15af711cc09364a34087e4cc3cff6528a2a9" },
  { datei: "schicht/werkzeuge.mjs",     herkunft: "schicht/werkzeuge.mjs",   sha: "6d50f0dffac439d6f4164002e9f7fecd2539e726a4e3cc1a4adb0b265fa534b1" },
  { datei: "schicht/spind.mjs",         herkunft: "schicht/spind.mjs",       sha: "6b5d0d6601139cf9c5555625e501ab7e1695c917d4f2a24463deb36d08e34c56" },
  { datei: "schicht/ruf.mjs",           herkunft: "schicht/ruf.mjs",         sha: "f1ef93996a4dd97c57b77d22dd4ba536324ed14304af3eb040c25638e7c66ab8" },
  { datei: "schicht/rollen.mjs",        herkunft: "schicht/rollen.mjs",      sha: "c8a08cf2690cb204acbdea4b84e33d0e977d97c0b45bbfd2ec7d70fc1a04567e" },
  { datei: "schicht/grundsaetze.md",    herkunft: "schicht/grundsaetze.md",  sha: "422a3c7b3cb35fea6dade1409340907621ca6a6615c9a9622cfb999d369c0bfd" },
  { datei: "schicht/mitarbeiter.json",  herkunft: "schicht/mitarbeiter.json", sha: "1510154ee2f23a65efc5df0873ca9a3166cb93bcf1ed2c55be02e749fe3078f6" },
  /* NEU 2026-10-18: company.js braucht festgefahren/zeitschaetzung, start.html den Installieren-Knopf
     (assets/installieren.js, in Kimhub byte-1:1 aus Sage). */
  { datei: "schicht/festgefahren.mjs", herkunft: "schicht/festgefahren.mjs", sha: "3928691ac868a0e8b8fc55545625996ef8e5e383687ad8dcc7963521aa8a1557" },
  { datei: "schicht/zeitschaetzung.mjs", herkunft: "schicht/zeitschaetzung.mjs", sha: "74790f30909cad44c39a8a8ddc0f98ca322202bc76453b59dc82d57141a422ce" },
  { datei: "assets/installieren.js", herkunft: "assets/installieren.js", sha: "e0644084e2e72773608633190a3e5ed287f93d88f438e7473f03c765c7f873c3" },
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
