#!/usr/bin/env node
/*
 * aus-kimhub-holen.mjs — holt ALLE gepinnten Kopien auf einmal aus Kimhub.
 *
 * WARUM ES DIESES WERKZEUG GIBT (Klaus 2026-09-09, zum zweiten Mal derselbe
 * Befund an derselben Stelle).
 *
 * Am 2026-09-09 habe ich die Buehnen-Stellung in Kimhubs `ansicht.js` gerichtet,
 * hier aber NUR `start.html` → `index.html` kopiert. `ansicht.js` blieb auf dem
 * alten Stand. Auf Klaus' Schirm standen die Agentenpillen weiter am
 * abgebrochenen Stand — die Arbeit war getan und kam nicht an.
 *
 * ⚠ UND DER DRIFT-GUARD WAR GRUEN. Er vergleicht jede Kopie mit ihrem EIGENEN
 * Fingerabdruck; eine Datei, die niemand angefasst hat, ist „unveraendert" —
 * auch wenn die Quelle laengst weiter ist. **Ein Drift-Guard sagt
 * „unveraendert", nicht „aktuell".** Genau dieser Satz hat in derselben Woche
 * schon `PWA-Toolpoint/sbkim/15_membran.js` und `kim-hub-company/ansicht.js`
 * gefangen. Beim dritten Mal ist es keine Unachtsamkeit mehr, sondern ein
 * fehlendes Werkzeug.
 *
 * Von Hand kopieren heisst: sich an jede Datei erinnern. Eine Regel, an die man
 * sich erinnern muss, ist keine. Dieses Werkzeug kopiert die LISTE, nicht die
 * Dateien, die einem gerade einfallen — vergessen kann es keine.
 *
 * Aufruf:
 *   node tools/aus-kimhub-holen.mjs                 # nur nachsehen (Vorgabe)
 *   node tools/aus-kimhub-holen.mjs --schreiben     # kopieren + Pins nachziehen
 *   node tools/aus-kimhub-holen.mjs --quelle /pfad/zu/Kimhub
 *
 * Es liest aus dem ARBEITSBAUM des Nachbar-Klons, nicht aus `origin/main` —
 * wer hier nachzieht, will meist genau den Stand, den er nebenan gerade gebaut
 * hat. Der Stand wird als Commit-Kennung mitgeschrieben; ist der Arbeitsbaum
 * dort schmutzig, sagt es das, statt eine saubere Herkunft zu behaupten.
 *
 * Rueckgabewert: 0 wenn alles gleich ist (oder geschrieben wurde), sonst 1.
 * Nicht hinter eine Pipe haengen — `| tail` liefert den Wert von `tail`.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const schreiben = args.includes("--schreiben");
const qi = args.indexOf("--quelle");
const QUELLE = qi >= 0 && args[qi + 1] ? args[qi + 1] : join(WURZEL, "..", "Kimhub");

if (!existsSync(join(QUELLE, ".git"))) {
  console.error(`✗ Kein Kimhub-Klon unter ${QUELLE} — mit --quelle <pfad> angeben.`);
  process.exit(1);
}

const { ERWARTET, HERKUNFT } = await import(join(WURZEL, "tools", "drift-guard.mjs"));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const git = (...a) => execFileSync("git", ["-C", QUELLE, ...a], { encoding: "utf8" }).trim();

const kopf = git("rev-parse", "--short", "HEAD");
const schmutzig = git("status", "--porcelain").length > 0;

let gleich = 0; const abweichend = [];
for (const e of ERWARTET) {
  const q = join(QUELLE, e.herkunft);
  if (!existsSync(q)) { console.log(`  ?? ${e.datei} — Quelle ${e.herkunft} fehlt`); continue; }
  const qsha = sha(readFileSync(q));
  const hsha = existsSync(join(WURZEL, e.datei)) ? sha(readFileSync(join(WURZEL, e.datei))) : "";
  if (qsha === hsha) { gleich++; continue; }
  abweichend.push({ ...e, q, qsha });
  console.log(`  ⚠ hängt zurück: ${e.datei}   (Quelle ${e.herkunft})`);
}

if (!abweichend.length) {
  console.log(`✅ alle ${gleich} Kopien sind der Stand aus ${QUELLE} (${kopf}).`);
  process.exit(0);
}
if (!schreiben) {
  console.log(`\n${gleich} aktuell · ${abweichend.length} hängen zurück.`);
  console.log("Zum Nachziehen:  node tools/aus-kimhub-holen.mjs --schreiben");
  process.exit(1);
}

/* Kopieren UND den Pin in derselben Bewegung nachziehen — getrennt gemacht
   waere genau der halbe Schritt, aus dem dieser Befund entstanden ist. */
let guard = readFileSync(join(WURZEL, "tools", "drift-guard.mjs"), "utf8");
for (const e of abweichend) {
  copyFileSync(e.q, join(WURZEL, e.datei));
  const vorher = ERWARTET.find((x) => x.datei === e.datei).sha;
  guard = guard.replace(`sha: "${vorher}"`, `sha: "${e.qsha}"`);
  console.log(`  ✓ geholt: ${e.datei}`);
}
guard = guard.replace(/commit: "[0-9a-f]+"/, `commit: "${kopf}"`);
guard = guard.replace(/datum:  "[^"]*"/, `datum:  "${git("log", "-1", "--format=%cI")}"`);
guard = guard.replace(/betreff: "[^"]*"/, "betreff: " + JSON.stringify(git("log", "-1", "--format=%s")));
writeFileSync(join(WURZEL, "tools", "drift-guard.mjs"), guard, "utf8");

console.log(`\n${abweichend.length} Kopien geholt, Pins und Herkunft auf ${kopf} gesetzt.`);
if (schmutzig) console.log("⚠ Kimhubs Arbeitsbaum ist SCHMUTZIG — die Herkunft nennt " +
  `${kopf}, kopiert wurde aber der Arbeitsstand. Erst dort committen, dann hier nachziehen.`);
console.log("Danach:  node tools/version-schreiben.mjs --schreiben  ·  CACHE_VERSION erhöhen  ·  npm test");
