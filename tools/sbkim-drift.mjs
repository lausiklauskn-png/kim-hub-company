/*
 * sbkim-drift.mjs — wacht per SHA-256 darüber, dass die 13 SBKIM-Kanon-Module
 * hier NICHT abgewandelt werden.
 *
 * ⚠ WARUM ES EINEN ZWEITEN DRIFT-GUARD GIBT UND NICHT NUR EINEN.
 * `tools/drift-guard.mjs` beantwortet die Frage „ist diese Kopie noch die
 * Kopie AUS KIMHUB?" — dort liegt die App. Diese Datei beantwortet eine andere:
 * „ist der Knoten noch der Knoten AUS SAGE?" Zwei Quellen, zwei Herkünfte,
 * zwei Fingerabdruck-Listen. Sie in eine Liste zu werfen wäre bequem und
 * falsch: bei einer Abweichung wüsste niemand, in welchem Depot nachzuziehen
 * ist, und genau das ist die Frage, die ein Drift-Guard beantworten soll.
 *
 * DIE LEITPLANKE HEISST „KOPIEREN, NICHT KLONEN". Wer eine Kopie am Ort
 * anpasst, erzeugt eine weitere Modul-Generation — und dann laufen im Netz
 * mehrere Fassungen desselben Moduls, ohne dass jemand es sieht. Am 2026-08-16
 * waren es beim Netz-Fenster zwei Generationen und beim Siegel VIER. Reift ein
 * Modul, wird es in Sage-Protokol gepflegt und hier NEU kopiert, dann der
 * Fingerabdruck nachgezogen — nie umgekehrt.
 *
 * ⚠ WAS HIER BEWUSST NICHT STEHT: die fünf Klebstoff-Dateien
 * (`storage-init`, `rendezvous-init`, `schutz-init`, `nostr-listen-init`,
 * `siegel-inhalt`). Sie MÜSSEN pro App verschieden sein — sie tragen den
 * DB-Suffix, den Knoten-Namen und die Bedeutungs-Beschreibung. Ein Wächter
 * darüber wäre ein Wächter gegen den Zweck der Datei. Sages
 * docs/PFLICHT_MODULE.md nennt sie ausdrücklich „kein Kanon, kein
 * Drift-Guard". Dass sie zueinander passen (derselbe Suffix, dieselbe
 * Beschreibung), misst `tests/smoke_knoten.mjs`.
 *
 * Quelle: Sage-Protokol/src/modules/<datei> (Stand 2026-09-08, origin/main)
 * Lauf:   node tools/sbkim-drift.mjs
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");

export const SAGE_HERKUNFT = {
  commit: "6db0a9f",
  datum: "2026-09-08",
  betreff: "Die Mycel-Blase bekommt einen festen Platz in der Leiste (#959)",
};

/* Die 13 aus Sages docs/PFLICHT_MODULE.md. Es sind ALLE dreizehn und nicht
   „mindestens zehn": „Weniger ist kein Knoten, sondern eine App mit Modulen
   darin." */
export const KANON = [
  { datei: "sbkim/01_storage.js",         sha: "5a5a4bf64dfcc107da7ed70fb755d7db5cce7d80e963b3e2fbc2004537747820" },
  { datei: "sbkim/02_spore.js",           sha: "6789fe6e903ad2e53f39b2dee576c640698555ef71ef4e9134eb75573fdb7d68" },
  { datei: "sbkim/03_embedding.js",       sha: "e4bb8bd6a237914e7841cab5165912daf636adf0ee90c5d4ffd0c74cc5d706e5" },
  { datei: "sbkim/04_match.js",           sha: "5de95923c3f62f141e94f576feebcac0eecc55c60e40b564540a56420436a4cd" },
  { datei: "sbkim/05_anastomose.js",      sha: "255ac79aeb3b0203e92f0cebd0a905e47c488b43efe18f41332a7d35520bbf23" },
  { datei: "sbkim/05b_nostr_relay.js",    sha: "030aa2d260149f5627b84694a0b55e916cc186158009e260117d1e4f60d429bd" },
  { datei: "sbkim/07_apoptose.js",        sha: "0acdd6ab2d95e131fa6953061cc0e95a2396e05fff091a7dc690b2668a4c035a" },
  { datei: "sbkim/15_membran.js",         sha: "f88b5d04bc089192b39c9c8bd667e44928c817a7d8c1e2641ddaf921fe848199" },
  { datei: "sbkim/16_siegel.js",          sha: "3e17f6474fc7f96fd7056a92a272805052c7b0dca13ca236f53b0f5b4df5eb85" },
  { datei: "sbkim/17_floating_widget.js", sha: "dd3e0d7fb5963904bab9257b1353344944ecd8675ca3c78897264c8a621aff82" },
  { datei: "sbkim/23_rendezvous.js",      sha: "3caa0bb1fbe7bf5293c90b6a59a74cccf8600bff45095a892b1f048244c61fcf" },
  { datei: "sbkim/23_rendezvous_ui.js",   sha: "d344a851a02535f10df349700b4237c6d33ce590cb95cfeefd6435b919404d16" },
  { datei: "sbkim/noble-secp256k1.js",    sha: "8f3879ca422c4fdfe7ca0361688636fa7cc550a59bd94d512ed6ec79aa3d55d1" },
];

export function abdruck(datei) {
  return createHash("sha256").update(readFileSync(join(WURZEL, datei))).digest("hex");
}

export function pruefe() {
  const abgewichen = [], fehlend = [], ungepinnt = [];
  for (const e of KANON) {
    /* ⚠ EIN LEERER FINGERABDRUCK IST KEIN BESTANDENER. Er heisst „hier steht
       noch nichts" — und ein Eintrag ohne Abdruck bewachte gar nichts, während
       die Zeile aussieht wie ein Wächter. Also zählt er als Befund. */
    if (!e.sha) { ungepinnt.push(e.datei); continue; }
    let ist;
    try { ist = abdruck(e.datei); } catch { fehlend.push(e.datei); continue; }
    if (ist !== e.sha) abgewichen.push({ ...e, ist });
  }
  return { abgewichen, fehlend, ungepinnt, geprueft: KANON.length };
}

/* Nur beim direkten Aufruf laufen — sonst schreibt ein Import dieser Datei in
   die Ausgabe und beendet unter Umständen den Läufer. Genau das ist in Kimhub
   am 2026-08-26 passiert. */
if (process.argv[1] && process.argv[1].endsWith("sbkim-drift.mjs")) {
  const r = pruefe();
  for (const a of r.abgewichen)
    console.error(`  ✗ ABGEWICHEN: ${a.datei}\n      erwartet ${a.sha}\n      ist      ${a.ist}`);
  for (const f of r.fehlend) console.error(`  ✗ FEHLT: ${f}`);
  for (const u of r.ungepinnt) console.error(`  ✗ OHNE FINGERABDRUCK: ${u}`);
  const schlecht = r.abgewichen.length + r.fehlend.length + r.ungepinnt.length;
  console.log(`SBKIM-Drift: ${r.geprueft - schlecht} byte-1:1 aus Sage, ${schlecht} zu klären`);
  process.exit(schlecht ? 1 : 0);
}
