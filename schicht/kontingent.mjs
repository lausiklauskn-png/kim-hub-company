/*
 * kontingent.mjs — die Zapfsäule.
 *
 * Klaus' Bild: ist der Sprit alle, wird gewartet, bis die Tankstelle wieder
 * aufmacht. Drei Bremsen liegen übereinander, und sie greifen UNABHÄNGIG:
 *
 *   Tageskontingent   wie viele Schichten der Tag hergibt      hier
 *   Schicht           eine Fahrt (Zeit + Geld)                 kosten.mjs
 *   Guthaben          bei Anthropic, OHNE automatisches Nachladen — die
 *                     Bremse, die auch dann hält, wenn sich dieser Code verrechnet
 *
 * Die dritte ist die wichtigste und steht NICHT in diesem Repo. Ein Abo für
 * Claude Code und die API sind zwei getrennte Geldbeutel: was Klaus für die
 * Sitzung zahlt, bezahlt keinen einzigen Aufruf, den ein Skript auf seinem
 * Server macht. Dafür braucht es API-Guthaben, getrennt aufgeladen, und die
 * Einstellung „nicht automatisch nachladen" in der Console.
 *
 * KEINE ÜBERSTUNDEN. Eine zweite Schicht ist ein neuer Klick, keine
 * Verlängerung. Ein Mechanismus statt zweier — und eine bewusste Handlung statt
 * eines Nickens auf eine Frage, die man müde wegdrückt.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/** Unter diesem Betrag lohnt keine Schicht mehr — eine Runde kostet mehr. */
export const MINDEST_DECKEL_EUR = 0.50;

export const VORGABE = { tagesdeckelEur: 15, tage: {} };

export function lesen(pfad) {
  if (!existsSync(pfad)) return { ...VORGABE, tage: {} };
  const roh = JSON.parse(readFileSync(pfad, "utf8"));
  return { tagesdeckelEur: roh.tagesdeckelEur ?? VORGABE.tagesdeckelEur,
           tage: roh.tage || {} };
}

export function schreiben(pfad, stand) {
  writeFileSync(pfad, JSON.stringify(stand, null, 2) + "\n", "utf8");
}

export function verbrauchtAmTag(stand, datum) {
  return Number(stand.tage?.[datum]?.verbrauchtEur || 0);
}

export function restAmTag(stand, datum) {
  return Math.max(0, stand.tagesdeckelEur - verbrauchtAmTag(stand, datum));
}

/**
 * Darf heute noch eine Schicht starten — und mit welchem Deckel?
 *
 * Reicht der Rest nicht für die volle Schicht, wird sie NICHT abgelehnt, sondern
 * mit dem kleineren Deckel gefahren und das gesagt. Eine Ablehnung, obwohl noch
 * Geld da ist, wäre eine Bremse, die mehr verhindert als nötig — und Klaus
 * müsste den Deckel von Hand herunterrechnen, um weiterarbeiten zu können.
 */
export function darfSchichtStarten(stand, datum, wunschDeckelEur) {
  const rest = restAmTag(stand, datum);
  const schichten = Number(stand.tage?.[datum]?.schichten || 0);
  if (rest < MINDEST_DECKEL_EUR) {
    return { ok: false, deckelEur: 0, schichtenHeute: schichten,
      text: `Tageskontingent aufgebraucht (${stand.tagesdeckelEur.toFixed(2)} € für ${datum}, ` +
            `davon ${verbrauchtAmTag(stand, datum).toFixed(2)} € verbraucht in ${schichten} Schicht(en)). ` +
            `Die Zapfsäule ist zu — morgen wieder.` };
  }
  if (rest < wunschDeckelEur) {
    return { ok: true, deckelEur: rest, schichtenHeute: schichten, gekuerzt: true,
      text: `Rest heute ${rest.toFixed(2)} € — die Schicht läuft mit diesem kleineren ` +
            `Deckel statt mit ${wunschDeckelEur.toFixed(2)} €.` };
  }
  return { ok: true, deckelEur: wunschDeckelEur, schichtenHeute: schichten, gekuerzt: false, text: "" };
}

/** Nach Feierabend eintragen, was die Schicht gekostet hat. */
export function buchen(stand, datum, verbrauchtEur) {
  const tag = stand.tage[datum] || { verbrauchtEur: 0, schichten: 0 };
  tag.verbrauchtEur = Number((tag.verbrauchtEur + verbrauchtEur).toFixed(4));
  tag.schichten += 1;
  stand.tage[datum] = tag;
  return stand;
}
