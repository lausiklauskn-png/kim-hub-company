/*
 * ablage-speicher.mjs — das Gedächtnis im Arbeitsspeicher. Läuft überall.
 *
 * Zwei Aufgaben, und beide sind echt:
 *
 *   1. SIE BEWEIST DIE NAHT. Solange es nur eine Ablage gibt, ist „spind.mjs
 *      läuft überall" eine Behauptung: der Beweis wäre eine zweite Umgebung,
 *      und die gibt es in einer Probe nicht. Mit einer zweiten Ablage läuft
 *      derselbe Spind gemessen auf zwei verschiedenen Böden.
 *   2. SIE IST DER UNTERBAU FÜR DEN BROWSER. Eine IndexedDB-Ablage lädt ihre
 *      Fächer einmal und arbeitet dann gegen den geladenen Stand — das ist
 *      genau das hier, mit einem Lade- und einem Sicher-Schritt davor und
 *      danach. `alles()` und `laden()` sind diese beiden Türen.
 *
 * ⚠ SIE ÜBERLEBT NICHTS. Wer sie wegwirft, wirft das Gedächtnis weg. Das ist
 * für eine Probe richtig und für eine Schicht falsch — deshalb heisst sie, wie
 * sie heisst, statt „Ablage" schlechthin.
 */

/**
 * @param inhalt vorgefundener Stand, als `{ "<fach>/<name>": "text" }`.
 *        Dieselbe flache Form, die `alles()` zurückgibt — hinein und heraus
 *        passen zusammen, sonst wäre ein Umzug eine Übersetzung.
 */
export function speicherAblage(inhalt = {}) {
  const inhalte = new Map(Object.entries(inhalt));
  const schluessel = (fach, name) => `${fach}/${name}`;
  return {
    /** Der ganze Ablage-Ort, für das Lauf-Protokoll. */
    wo: "speicher",
    // Kein Pfad, aber auch keine Lüge: die Kennung sagt, wo das Fach liegt,
    // nämlich nirgends auf einer Platte. Ein erfundener Pfad stünde später im
    // Lauf-Protokoll und sähe aus wie ein Ort, an dem man nachsehen kann.
    ort: (fach) => `speicher:${fach}`,
    lies: (fach, name) => inhalte.has(schluessel(fach, name))
      ? inhalte.get(schluessel(fach, name)) : null,
    schreib(fach, name, text) { inhalte.set(schluessel(fach, name), text); },
    /** Der ganze Stand, flach — zum Sichern, Vergleichen oder Weiterreichen. */
    alles: () => Object.fromEntries(inhalte),
    /** Einen Stand übernehmen (was schon da ist, bleibt daneben stehen). */
    laden(stand) { for (const [k, v] of Object.entries(stand || {})) inhalte.set(k, v); },
  };
}
