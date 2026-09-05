/*
 * alle.mjs — der Läufer dieses Depots.
 *
 * ⚠ ER IST BEWUSST KLEIN, UND DAS STEHT AUCH IM README. Der Prüfstand dieser
 * App liegt in **Kimhub**: dort messen 1293 Prüfungen und eine Gegenprobe mit
 * über 460 eingebauten Fehlern, ob die Schicht tut, was sie behauptet. Hier
 * liegen die KOPIEN. Ein zweiter, halb so gründlicher Prüfstand daneben wäre
 * schlimmer als keiner — er sähe aus wie eine Zusicherung und wäre eine
 * schwächere.
 *
 * Was dieses Depot deshalb prüft, ist genau das, was Kimhub NICHT prüfen kann:
 * dass die Kopien hier byte-gleich sind und dass die app-eigenen Abweichungen
 * (Startseite, Vorrat) zusammenpassen.
 *
 * DREI ERGEBNISSE, nicht zwei — wie in Kimhub:
 *   ✓ grün · ✗ ROT (nur das zählt) · ⊘ nicht lauffähig (ungeprüft, NICHT grün)
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] || "";
const dateien = readdirSync(HIER)
  .filter((f) => f.startsWith("smoke_") && f.endsWith(".mjs") && f.includes(filter))
  .sort();

let gruen = 0, rot = 0, stumm = 0;
const rotListe = [];

for (const d of dateien) {
  let mod;
  try {
    mod = await import(join(HIER, d));
  } catch (e) {
    /* Ein fehlendes PAKET ist „nicht lauffähig". Jeder andere Grund (ein
       Syntaxfehler im geprüften Code) ist ein BEFUND und zählt als ROT —
       diese Unterscheidung hat in Kimhub neun blinde Fälle gekostet. */
    if (e && e.code === "ERR_MODULE_NOT_FOUND") {
      console.log(`── ${d} ──\n  ⊘ nicht lauffähig: ${e.message}`); stumm++; continue;
    }
    console.log(`── ${d} ──\n  ✗ ROT: lässt sich nicht laden: ${e.message}`);
    rot++; rotListe.push(`${d}: nicht ladbar`); continue;
  }
  console.log(`── ${mod.NAME || d} ──`);
  const ok = (text, bedingung) => {
    if (bedingung) { gruen++; console.log(`  ✓ ${text}`); }
    else { rot++; rotListe.push(`${mod.NAME || d}: ${text}`); console.log(`  ✗ ROT: ${text}`); }
  };
  try {
    const r = await mod.lauf(ok);
    if (r === "stumm") { stumm++; console.log("  ⊘ nicht lauffähig"); }
  } catch (e) {
    /* Eine Probe, die WIRFT, ist ROT — nicht ein toter Läufer. */
    rot++; rotListe.push(`${mod.NAME || d}: gestolpert — ${e.message}`);
    console.log(`  ✗ ROT: die Probe ist unterwegs gestolpert: ${e.message}`);
  }
}

console.log(`\n═══ ${gruen} grün · ${rot} ROT · ${stumm} nicht lauffähig ═══\n`);
if (rotListe.length) { console.log("Rot:"); for (const r of rotListe) console.log("  - " + r); }
process.exit(rot ? 1 : 0);
