/*
 * kassen.js — ZWEI KASSEN, EINE FAHRT.
 *
 * ══ WARUM DAS EINE EIGENE DATEI IST ════════════════════════════════════════
 *
 * Diese Rechnung stand bis zum 2026-09-07 in `schicht/kosten.mjs` und war
 * damit nur dort zu haben, wo ES-Module laufen. Die Ansicht ist ein
 * klassisches Skript; sie konnte nicht summieren und nahm deshalb EINE der
 * beiden Kassen — `daten.lauf.kasse || daten.konferenz.kasse`.
 *
 * Klaus' Befund vom 2026-09-07: die Kachel „Diese Schicht" meldete **0,02 €**,
 * der Lauf hatte **0,50 €** gekostet. Die Zahl stimmte für die Schicht-Kasse
 * und war als Auskunft ueber den Lauf falsch — **eine zu niedrige Zahl sieht
 * genauso aus wie eine gemessene.**
 *
 * Dieselbe Abhilfe wie bei `zeit.js` am 2026-08-25 und aus demselben Grund:
 * **was sich nachrechnen laesst, gehoert an eine Stelle, die ueberall
 * laeuft.** Ein zweiter Rechenweg in der Ansicht waere eine Drift-Quelle mit
 * Ansage — dann stuende auf der Kachel eine andere Zahl als im Fahrtenbuch.
 *
 * `schicht/kosten.mjs` holt sie sich von hier und reicht sie unveraendert
 * weiter; die Aufrufer in Node merken vom Umzug nichts.
 */
(function (welt) {
  "use strict";

  /**
   * ZWEI KASSEN, EINE FAHRT — und warum es diese Funktion überhaupt gibt.
   *
   * Im Browser laufen Konferenz und Schicht mit GETRENNTEN Kassen (der Deckel
   * wird geteilt). Das Fahrtenbuch bekam bis zum 2026-09-07 aber nur die
   * SCHICHT-Kasse zu sehen. Gemessen an Klaus' Lauf: 0,47 € in 17 Aufrufen für
   * die Konferenz, 0,01 € in 2 für die Schicht — im Buch stand 0,01 €.
   *
   * Das ist derselbe Befund wie am 2026-08-22 („als hätten sie nie gearbeitet
   * und kein Geld gekostet"), nur an der Vorstufe: **eine zu niedrige Zahl sieht
   * genauso aus wie eine gemessene.**
   *
   * Drei Dinge werden hier NICHT addiert, und jedes hat seinen Grund:
   *
   *   minuten            Die Läufe folgen AUFEINANDER. Gerechnet wird die
   *                      Spanne vom frühesten Beginn bis zum spätesten Ende —
   *                      eine Summe zweier Dauern verlöre die Zeit dazwischen
   *                      (Überlegen, Nachladen) und wäre für einen
   *                      Stundennachweis zu klein.
   *   kontext            Ein MAXIMUM, keine Summe. Kontexte zu addieren ergäbe
   *                      eine Zahl, die es in keinem Aufruf gab.
   *   laufzeitMinuten    Ein DECKEL, keine Dauer. Beide Kassen tragen denselben;
   *                      addiert stünde dort eine Erlaubnis, die nie galt.
   */
  function zusammen(...berichte) {
    const teile = berichte.filter(Boolean);
    if (teile.length === 0) return null;
    if (teile.length === 1) return teile[0];

    const summe = (feld) => Number(teile.reduce((n, b) => n + (Number(b[feld]) || 0), 0).toFixed(4));
    const frueh = teile.map((b) => b.beginnIso).filter(Boolean).sort()[0] || null;
    const spaet = teile.map((b) => b.endeIso).filter(Boolean).sort().slice(-1)[0] || null;

    /* Die Spanne, wenn beide Enden dastehen — sonst die Summe der Dauern, und
       dann steht in `spanneGemessen` ausdrücklich, dass sie geraten ist. Eine
       Null wäre hier die schlechteste Antwort: sie sähe aus wie „ging schnell". */
    const spanneMin = (frueh && spaet)
      ? Math.max(0, Math.round((Date.parse(spaet) - Date.parse(frueh)) / 60000))
      : teile.reduce((n, b) => n + (Number(b.minuten) || 0), 0);

    const jeRolle = {};
    const tokenJeRolle = {};
    const msJeRolle = {};
    for (const b of teile) {
      for (const [r, v] of Object.entries(b.jeRolle || {}))
        jeRolle[r] = Number(((jeRolle[r] || 0) + (Number(v) || 0)).toFixed(4));
      for (const [r, v] of Object.entries(b.msJeRolle || {}))
        msJeRolle[r] = (msJeRolle[r] || 0) + (Number(v) || 0);
      for (const [r, v] of Object.entries(b.tokenJeRolle || {})) {
        const e = tokenJeRolle[r] || (tokenJeRolle[r] = { ein: 0, aus: 0, kontext: 0, aufrufe: 0 });
        e.ein += Number(v.ein || 0);
        e.aus += Number(v.aus || 0);
        e.kontext = Math.max(e.kontext, Number(v.kontext || 0));
        e.aufrufe += Number(v.aufrufe || 0);
      }
    }

    return {
      aufrufe: teile.reduce((n, b) => n + (Number(b.aufrufe) || 0), 0),
      beginnIso: frueh,
      endeIso: spaet,
      verbrauchtEur: summe("verbrauchtEur"),
      deckelEur: summe("deckelEur"),
      restEur: summe("restEur"),
      reserveEur: summe("reserveEur"),
      minuten: spanneMin,
      spanneGemessen: !!(frueh && spaet),
      laufzeitMinuten: Math.max(...teile.map((b) => Number(b.laufzeitMinuten) || 0)),
      /* WORAUS die Zahl besteht — sonst ist eine zusammengezählte Fahrt von einer
         einzelnen nicht zu unterscheiden, und genau das war der Fehler. */
      teile: teile.map((b) => ({ aufrufe: b.aufrufe, verbrauchtEur: b.verbrauchtEur })),
      jeRolle,
      tokenJeRolle,
      msJeRolle,
      msGesamt: teile.reduce((n, b) => n + (Number(b.msGesamt) || 0), 0),
    };
  }

  if (welt) welt.WERKSTATT_KASSEN = { zusammen: zusammen };
})(typeof window !== "undefined" ? window
   : (typeof globalThis !== "undefined" ? globalThis : null));
