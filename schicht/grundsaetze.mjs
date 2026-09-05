/*
 * grundsaetze.mjs — bringt die Grundsätze in die Truppe. OHNE Node.
 *
 * Die Grundsätze SELBST stehen in `grundsaetze.md`. Die Datei ist absichtlich
 * Markdown und nicht Code: Klaus soll sie ändern können, ohne dass jemand ein
 * Programm anfasst. Was die Truppe leitet, gehört nicht in eine Quelldatei.
 *
 * WAS SICH AM 2026-09-04 GEÄNDERT HAT — und warum es keine Umräumerei ist.
 *
 * Bis heute las diese Datei die Markdown-Datei selbst, mit `readFileSync`. Damit
 * war sie an Node gebunden, und über `ruf.mjs` war es die ganze Ruf-Kette mit.
 * Klaus hat am 2026-09-04 entschieden, dass jeder ausser ihm seinen eigenen
 * Schlüssel im BROWSER mitbringt — und ein Schlüssel im Browser heisst, die
 * Schicht läuft im Browser. Dort gibt es kein `readFileSync`.
 *
 * Getrennt sind deshalb ZWEI Fragen, die vorher eine waren:
 *
 *   WO der Text herkommt   `grundsaetze-datei.mjs` (Node) · ein Abruf · eingebettet
 *   WAS er bedeutet        diese Datei — zählen, prüfen, in die Anweisung setzen
 *
 * Die zweite ist überall dieselbe. Sie lief nur nirgends sonst, weil sie an die
 * erste genagelt war.
 *
 * FEHLT DER TEXT, LÄUFT DIE SCHICHT TROTZDEM — aber sie sagt es. Ein stilles
 * Weglassen wäre das Schlimmste von beidem: die Grundsätze wirken nicht, und
 * niemand merkt, warum die Arbeit anders aussieht als sonst. Diese Zusicherung
 * ist unverändert; sie hängt jetzt nur nicht mehr am Dateisystem.
 */

/** Höchstens sieben — die Datei sagt selbst, warum. */
export const HOECHSTZAHL = 7;

/**
 * Deutet den Text der Grundsatz-Datei.
 *
 * `null` bedeutet „es gibt keine Datei" und ist etwas ANDERES als `""` („die
 * Datei ist da, aber leer"). Wer beides zusammenwirft, kann die zwei Hinweise
 * unten nicht mehr auseinanderhalten — und der eine sagt „such die Datei", der
 * andere „schreib etwas hinein".
 *
 * `woher` steht nur im Hinweis. Es ist ein Pfad, wenn die Datei gelesen wurde,
 * und eine Adresse, wenn sie geholt wurde — beides soll in der Meldung stehen
 * können, ohne dass diese Datei wissen muss, welches von beidem es war.
 */
export function deuteGrundsaetze(text, { woher = "" } = {}) {
  if (text === null || text === undefined)
    return { text: "", anzahl: 0, fehlt: true,
             hinweis: `Keine Grundsätze gefunden${woher ? ` (${woher})` : ""}. Die Schicht läuft, ` +
               `aber ohne Haltung — nur mit den erzwungenen Regeln.` };
  // Gezählt werden die nummerierten Überschriften. Steht dort nichts, ist die
  // Datei zwar da, aber leer — und das ist etwas anderes als „fehlt".
  const anzahl = (text.match(/^##\s+\d+\.\s+/gm) || []).length;
  return {
    text, anzahl, fehlt: false,
    hinweis: anzahl === 0
      ? `Die Grundsatz-Datei ist da, enthält aber keinen einzigen Grundsatz.`
      : anzahl > HOECHSTZAHL
        ? `${anzahl} Grundsätze — mehr als ${HOECHSTZAHL}. Die Datei sagt selbst, ` +
          `dass sie schrumpfen können muss; ab hier liest sie niemand mehr ganz.`
        : "",
  };
}

/**
 * Der Zustand „es gibt keine Grundsätze", ausdrücklich hingeschrieben.
 *
 * Er wird gebraucht, wo eine Schicht bewusst ohne Haltung läuft — der Arm
 * „nackt" aus dem M4-Versuch. Ausdrücklich, damit dort `null` steht und nicht
 * ein vergessenes `undefined`: das eine ist eine Entscheidung, das andere ein
 * Versehen, und `macheRufer` unterscheidet sie (siehe `ruf.mjs`).
 */
export const KEINE = Object.freeze(deuteGrundsaetze(null));

/**
 * Der Teil, der in die Anweisung jeder Rolle wandert.
 *
 * Die Datei enthält auch Verwaltungs-Abschnitte (wie man merkt ob es wirkt, wie
 * geändert wird) — die gehen an Klaus, nicht an die Truppe. Weitergegeben wird,
 * was VOR der ersten waagerechten Linie nach dem Kopf steht bis zur letzten:
 * die Grundsätze selbst, mit ihrer Begründung.
 */
export function fuerAnweisung(g = KEINE) {
  if (!g || !g.text) return "";
  const teile = g.text.split(/^---$/m);
  const kern = (teile[1] || g.text).trim();
  if (!kern) return "";
  return "So gehen wir an die Arbeit heran. Das sind keine Regeln zum Abhaken, " +
    "sondern Fragen, die du an deine eigene Arbeit stellst:\n\n" + kern;
}
