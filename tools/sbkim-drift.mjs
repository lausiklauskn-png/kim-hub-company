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
  { datei: "sbkim/02_spore.js",           sha: "0cbf0664e2a79f1301c03e52f7ac0030d4b2961f03b97b38e8634827a52353c5" },
  { datei: "sbkim/03_embedding.js",       sha: "2e31baa09a2959c95efff8eecd224e8343e75695b4b293aa35209d8f96d1f3b5" },
  { datei: "sbkim/04_match.js",           sha: "721eecc3c0d6ea4c259259e6071215ec1cd16f1c43c87b42ce9e72e9a0b5e41c" },
  { datei: "sbkim/05_anastomose.js",      sha: "255ac79aeb3b0203e92f0cebd0a905e47c488b43efe18f41332a7d35520bbf23" },
  { datei: "sbkim/05b_nostr_relay.js",    sha: "37eee5b196b3efad57131edd1cc3c0ee23acb97b5ca40740d6a0771db4b4a421" },
  { datei: "sbkim/07_apoptose.js",        sha: "0acdd6ab2d95e131fa6953061cc0e95a2396e05fff091a7dc690b2668a4c035a" },
  { datei: "sbkim/15_membran.js",         sha: "829a5bc01976b59c5ce428125314b87b314b6212cd5a473634c2d22c02579397" },
  { datei: "sbkim/16_siegel.js",          sha: "84959978d9ac974af243545bf899fd7a20dd8cfee966fe6b4054c08bffced692" },
  { datei: "sbkim/17_floating_widget.js", sha: "e4ee076c1295910d0e83470ebda327e7419f29bc06f6718148369c8369e1a5ce" },
  { datei: "sbkim/23_rendezvous.js",      sha: "48165ffc96b67d447625082dd805a92ec4384621580b97ad96151d42f4ba3a4e" },
  { datei: "sbkim/23_rendezvous_ui.js",   sha: "efecd89ea80d8fa19c61c61a77b71a6d1b8cc8981c6ec1efd10ee92595a44f40" },
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
