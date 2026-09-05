/*
 * ablage-datei.mjs — das Gedächtnis in Dateien. Nur für Node.
 *
 * Die einzige Stelle der Spind-Kette, die ein Dateisystem anfasst. Sie steht
 * deshalb getrennt: `spind.mjs` sagt, WAS im Gedächtnis gilt, und läuft überall;
 * diese Datei sagt, WO es liegt, und läuft nur hier.
 *
 * Am Ergebnis ändert sich nichts. Ein Fach ist ein Verzeichnis unter der Wurzel,
 * genau wie vorher — dieselben Pfade, dieselben Dateinamen, dieselben Inhalte.
 * Ein bestehendes Gedächtnis wird also weitergelesen und nicht etwa neu
 * angelegt; ein Umbau, der die Spinde leert, hätte das Gelernte aus jedem
 * früheren Lauf weggeworfen, und zwar still.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Die Ablage über einem Verzeichnis.
 *
 * ⚠ HIER STAND EIN ZWEITER RIEGEL, und er ist wieder heraus. Die erste Fassung
 * kannte `schreiben: false`, damit eine Trockenschicht nichts hinterlässt. Die
 * Zusicherung ist richtig — sie wird nur schon woanders gehalten:
 * `schicht.mjs` und `gegenpruefung.mjs` rufen `spind.schliessen` ausschließlich
 * für `art === "echt"`, und `oeffnen` bekommt sein `schreiben` von dort.
 *
 * Ein zweiter Riegel über derselben Zusicherung sieht nach mehr Sicherheit aus
 * und ist weniger: eine Gegenprobe, die nur einen von beiden wegnimmt, misst
 * nichts und meldet trotzdem „gefangen". Genau die Falle, die in dieser
 * Werkstatt schon zweimal zugeschnappt ist (`umask` + `chmod`, und `finde()`
 * in der Gästeliste). Deshalb: EIN Riegel, an der Stelle, an der er schon war.
 */
export function dateiAblage(wurzel) {
  if (!wurzel) throw new Error(
    "Die Datei-Ablage braucht eine Wurzel — ohne sie wüsste sie nicht, wo die " +
    "Spinde liegen, und legte sie irgendwo an.");
  const wo = (fach) => join(wurzel, fach);
  return {
    /** Der ganze Ablage-Ort, für das Lauf-Protokoll. Bei Dateien die Wurzel. */
    wo: String(wurzel),
    ort: wo,
    // `null`, nicht `""` — „gibt es nicht" ist etwas anderes als „ist leer",
    // und `spind.oeffnen` hängt daran: ein fehlendes Ich-Blatt wird angelegt.
    lies(fach, name) {
      const p = join(wo(fach), name);
      return existsSync(p) ? readFileSync(p, "utf8") : null;
    },
    schreib(fach, name, text) {
      mkdirSync(wo(fach), { recursive: true });
      writeFileSync(join(wo(fach), name), text, "utf8");
    },
  };
}
