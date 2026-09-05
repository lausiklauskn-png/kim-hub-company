/*
 * grundsaetze-datei.mjs — WOHER der Grundsatz-Text kommt, wenn Node läuft.
 *
 * Diese Datei ist die einzige Stelle der Grundsatz-Kette, die ein Dateisystem
 * anfasst. Sie steht deshalb getrennt: `grundsaetze.mjs` deutet den Text und
 * läuft überall, diese hier holt ihn und läuft nur in Node.
 *
 * Im Browser tritt an ihre Stelle ein Abruf oder ein eingebetteter Text — beide
 * geben denselben String an `deuteGrundsaetze` weiter. Es gibt deshalb KEINE
 * zweite Fassung der Deutung, und das ist der ganze Zweck der Trennung: zwei
 * Fassungen liefen auseinander, und dann zählte der Browser andere Grundsätze
 * als Node.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { deuteGrundsaetze } from "./grundsaetze.mjs";

export const PFAD = join(dirname(fileURLToPath(import.meta.url)), "grundsaetze.md");

/**
 * Liest die Datei und deutet sie. Fehlt sie, kommt `null` in die Deutung —
 * nicht `""`. Der Unterschied ist der zwischen „such die Datei" und „schreib
 * etwas hinein", und beide Hinweise gibt es nur, solange er erhalten bleibt.
 */
export function ladeGrundsaetze(pfad = PFAD) {
  return deuteGrundsaetze(existsSync(pfad) ? readFileSync(pfad, "utf8") : null,
    { woher: pfad });
}
