/*
 * Schreibt `version.json` aus der HERKUNFT im Drift-Guard.
 *
 * WARUM ES DAS GIBT. Die Stand-Zeile oben auf der Seite beantwortet für Klaus
 * genau eine Frage: „läuft bei mir das Neue?" Bis zum 2026-09-06 war sie von
 * Hand gepflegt — und beim Kopieren der Schichtuhr blieb sie stehen. Die App
 * meldete „Stand c7a76b6" und lief auf neuerem Code. Eine falsche Auskunft an
 * dieser Stelle ist schlimmer als keine: sie beruhigt.
 *
 * Also EINE Stelle für die Herkunft (`tools/drift-guard.mjs`), und diese Datei
 * erzeugt daraus. `tests/smoke.mjs` besteht darauf, dass `version.json` genau
 * das ist, was hier herauskäme — wer die Fingerabdrücke nachzieht und den
 * Stand vergisst, wird rot statt still falsch.
 *
 *   node tools/version-schreiben.mjs          nur zeigen
 *   node tools/version-schreiben.mjs --schreiben
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HERKUNFT } from "./drift-guard.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");

/* `hinterher` sagt, wie viele Kimhub-Commits seither dazugekommen sind. Hier
   ist es immer 0: diese Bytes SIND der genannte Stand. Das Feld bleibt, weil
   die Seite es liest — eine Null, die gemessen ist, keine geratene. */
export function inhalt() {
  return JSON.stringify({
    stand: HERKUNFT.commit,
    datum: HERKUNFT.datum,
    betreff: HERKUNFT.betreff,
    hinterher: 0,
  }) + "\n";
}

if (process.argv[1] && process.argv[1].endsWith("version-schreiben.mjs")) {
  const t = inhalt();
  if (process.argv.includes("--schreiben")) {
    writeFileSync(join(WURZEL, "version.json"), t);
    console.log("✅ version.json geschrieben — " + HERKUNFT.commit);
  } else {
    process.stdout.write(t);
  }
}
