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

  /**
   * WAS DAS FAHRTENBUCH ZUSAMMENZAEHLT — drei Zahlen, drei Fragen.
   *
   * ⚠ WARUM DAS HIER STEHT (2026-09-07). Die Rechnung lag in `ansicht.js`, und
   * dort ist sie nur im Browser pruefbar — die Gegenprobe faehrt ohne. Ihr Fall
   * („Trockenlaeufe zaehlen in die Geldsumme mit — aus einer Uebung wird eine
   * Rechnung") stand da und meldete IMMER „nicht gefangen", ohne dass etwas
   * kaputt war. Dieselbe Abhilfe wie bei `zeit.js` und bei `zusammen` daneben.
   *
   * Die drei Zahlen sind ausdruecklich NICHT dieselbe:
   *
   *   fahrten    ALLE Fahrten. Trockenlaeufe sind Arbeit, auch wenn sie nichts
   *              kosten — wer sie hier abzoege, verloere die Arbeitszeit.
   *   echte      was echt gemeint war (`echt`), auch wenn es vor dem ersten
   *              Aufruf starb.
   *   bezahlte   was wirklich Geld gekostet hat (`eur > 0`).
   *
   * ⚠ UND `eur` WIRD NUR UEBER DIE ECHTEN SUMMIERT. Ein Trockenlauf traegt eine
   * GERECHNETE Zahl; sie in die Geldsumme zu nehmen machte aus einer Uebung
   * eine Rechnung. Klaus' Buch zeigte am 2026-09-07 acht Fahrten, „davon 7
   * bezahlt" — bezahlt hatten drei. Eine zu hohe Zahl in einer Buchhaltung ist
   * derselbe Fehler wie eine zu niedrige, nur andersherum.
   */
  function fahrtSummen(fahrten) {
    var f = Array.isArray(fahrten) ? fahrten : [];
    var echte = f.filter(function (x) { return x && x.echt; });
    var bezahlte = echte.filter(function (x) { return (Number(x.eur) || 0) > 0; });
    var tage = {};
    f.forEach(function (x) { if (x && x.tag) tage[x.tag] = true; });
    return {
      fahrten: f.length,
      echte: echte.length,
      bezahlte: bezahlte.length,
      /* Gerundet auf Cent, wie ueberall in dieser Datei — Gleitkomma-Summen
         ueber viele Fahrten laufen sonst in der vierten Stelle auseinander. */
      eur: Number(echte.reduce(function (a, x) { return a + (Number(x.eur) || 0); }, 0).toFixed(4)),
      /* Die MINUTEN zaehlen ueber ALLE Fahrten — auch die trockenen.
         ⚠ `x &&` gehoert HIER genauso hin wie oben: eine unbrauchbare Zeile im
         Buch warf sonst, und ein Buch mit einer kaputten Zeile ist genau der
         Fall, fuer den diese Rechnung robust sein muss. Gefunden von der
         eigenen Probe, beim ersten Lauf. */
      minuten: f.reduce(function (a, x) { return a + (x ? Number(x.minuten) || 0 : 0); }, 0),
      tage: Object.keys(tage).length,
    };
  }

  if (welt) welt.WERKSTATT_KASSEN = { zusammen: zusammen, fahrtSummen: fahrtSummen };
})(typeof window !== "undefined" ? window
   : (typeof globalThis !== "undefined" ? globalThis : null));
