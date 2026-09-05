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
export const ERWARTET = [
  { datei: "index.html",                herkunft: "start.html",              sha: "3c01a391e805786e55efb137412e2389f29fc89813ca6757ee163ecd4a738c7f" },
  { datei: "company.js",                herkunft: "company.js",              sha: "10fdd6d1db975e63c1a3287997c442f34d0bb635712384313f225ce12b8e91a9" },
  { datei: "ansicht.js",                herkunft: "ansicht.js",              sha: "36122e911ce68a8a512ab8b6808d1b9543aa0e2b31cd74d7db297651008df04d" },
  { datei: "buehne.js",                 herkunft: "buehne.js",               sha: "3795be82de5d08e51b8ab0bd41268cdbcaaf49b8012bd4f355d3609467b6ec92" },
  { datei: "zeit.js",                   herkunft: "zeit.js",                 sha: "1bdb42884e8385e32aa3bc6572c1c8736d928e48bde6847081cc98efcbb85822" },
  { datei: "idb.js",                    herkunft: "idb.js",                  sha: "b244ab3f832bb4d4cd5ec87e51de364df5716ee7ca6fc8a2bceeea6b6c9bbd51" },
  { datei: "schluesseltresor.js",       herkunft: "schluesseltresor.js",     sha: "eaed30e8f3921835a3f58b69f89d9b008831f69f164ad1dfec630fa43161f666" },
  { datei: "schicht/konferenz.mjs",     herkunft: "schicht/konferenz.mjs",   sha: "af06f97c8c9d2b4e356534a90233c19499ff4dc9cd81d8d37decdd2c613b47b7" },
  { datei: "schicht/schicht.mjs",       herkunft: "schicht/schicht.mjs",     sha: "74f5d8b8f717de31f7677537cd1d1c7c8b36ce870b4619b37a1d8d0496e99238" },
  { datei: "schicht/api.mjs",           herkunft: "schicht/api.mjs",         sha: "aca8768c19fcd3620edade75aa6df410c59ccd5a41768cdcd360c8c38d37e94a" },
  { datei: "schicht/transport-netz.mjs",herkunft: "schicht/transport-netz.mjs", sha: "1fc935a19609a7f2f3769e49a9f2ae8fe189a0dcca016c978bf91c53b078169c" },
  { datei: "schicht/kosten.mjs",        herkunft: "schicht/kosten.mjs",      sha: "e901b14a295d6d332e5deb8d6100c6731cff1c3f0909e05ea0477a888c685841" },
  { datei: "schicht/beispiele.mjs",     herkunft: "schicht/beispiele.mjs",   sha: "43e1945604d59243a7276ba7613f0179e55ad92613ee82e65cba534532db42fd" },
  { datei: "schicht/grundsaetze.mjs",   herkunft: "schicht/grundsaetze.mjs", sha: "340117e1f311aba0bfce9730fad28b90e3fdddde8aa3d0e103073b0bea883523" },
  { datei: "schicht/ablage-idb.mjs",    herkunft: "schicht/ablage-idb.mjs",  sha: "4e240592e9eb65e21bad68a3bb1fe8d859b113bb800009406e1254f29c5a1c9b" },
  { datei: "schicht/ablage-speicher.mjs", herkunft: "schicht/ablage-speicher.mjs", sha: "9c67aca234783a39ce2599bd2763393180d56091160b6c87f1f3c6b6bbb48fd3" },
  { datei: "schicht/baum-speicher.mjs", herkunft: "schicht/baum-speicher.mjs", sha: "f854d3a9552d9cb1eba8aabe4a4c15af711cc09364a34087e4cc3cff6528a2a9" },
  { datei: "schicht/werkzeuge.mjs",     herkunft: "schicht/werkzeuge.mjs",   sha: "4e81dfbe5588104e776e2cb5e8be5b2a2cf02042563d8bbca7acce8f80761cef" },
  { datei: "schicht/spind.mjs",         herkunft: "schicht/spind.mjs",       sha: "6b5d0d6601139cf9c5555625e501ab7e1695c917d4f2a24463deb36d08e34c56" },
  { datei: "schicht/ruf.mjs",           herkunft: "schicht/ruf.mjs",         sha: "4f244ec43da12ab5bf6aed1e9fb0d55ba45832d2aa3261f326b376304d14d2c3" },
  { datei: "schicht/rollen.mjs",        herkunft: "schicht/rollen.mjs",      sha: "64c1a0e70b88b985b1fadac951926fa83f6e206b597836400577c3c6c26bccf8" },
  { datei: "schicht/grundsaetze.md",    herkunft: "schicht/grundsaetze.md",  sha: "422a3c7b3cb35fea6dade1409340907621ca6a6615c9a9622cfb999d369c0bfd" },
  { datei: "schicht/mitarbeiter.json",  herkunft: "schicht/mitarbeiter.json", sha: "297ee36260e7cd2701221c5e38db33e8144ac2fdbcf63e432c7cbd0ac63269ff" },
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
