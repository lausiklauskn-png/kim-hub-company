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
  /**
   * EINE Rechnung, die Token einer Rolle zusammenzählt — für `zusammen`
   * (zwei Kassen einer Fahrt) und `tokenSummen` (alle Fahrten des Buchs).
   * Zwei Fassungen liefen auseinander, und dann stünde auf der Kachel eine
   * andere Zahl als im Fahrtenbuch.
   *
   * ⚡ DER CACHE GETRENNT, JE ZUGANG (Bauschritt 3, 2026-09-17). `ein` ist
   * die Summe aus frisch + cacheNeu + cacheAlt; der Kontext bleibt ein
   * MAXIMUM, keine Summe.
   *
   * ⚠ ALTE EINTRÄGE KENNEN DIE TRENNUNG NICHT. Ein `tokenJeRolle` von vor
   * dem 2026-09-17 trägt nur `ein` — dort ist nicht mehr zu sagen, wie viel
   * davon aus dem Cache kam. Es wird NICHT geraten (als „frisch" gebucht
   * sähe es aus wie eine Messung): die Zahl landet in `ungetrennt`, und die
   * Anzeige sagt dazu, dass sie älter ist als die Trennung.
   */
  function leerToken() {
    return { ein: 0, aus: 0, kontext: 0, aufrufe: 0,
             frisch: 0, cacheNeu: 0, cacheAlt: 0, ungetrennt: 0, jeZugang: {} };
  }
  function tokenAddieren(ziel, rolle, v) {
    if (!v || typeof v !== "object") return;
    const e = ziel[rolle] || (ziel[rolle] = leerToken());
    e.ein += Number(v.ein || 0);
    e.aus += Number(v.aus || 0);
    e.kontext = Math.max(e.kontext, Number(v.kontext || 0));
    e.aufrufe += Number(v.aufrufe || 0);
    if (v.frisch === undefined && v.cacheNeu === undefined && v.cacheAlt === undefined) {
      e.ungetrennt += Number(v.ein || 0);
    } else {
      e.frisch += Number(v.frisch || 0);
      e.cacheNeu += Number(v.cacheNeu || 0);
      e.cacheAlt += Number(v.cacheAlt || 0);
      e.ungetrennt += Number(v.ungetrennt || 0);
    }
    for (const [zg, z] of Object.entries(v.jeZugang || {})) {
      const t = e.jeZugang[zg] || (e.jeZugang[zg] = { ein: 0, aus: 0, frisch: 0, cacheNeu: 0,
                                                       cacheAlt: 0, aufrufe: 0 });
      for (const f of ["ein", "aus", "frisch", "cacheNeu", "cacheAlt", "aufrufe"])
        t[f] += Number((z || {})[f] || 0);
    }
  }

  /**
   * TOKEN JE AGENT ÜBER ALLE FAHRTEN (Bauschritt 3, 2026-09-17).
   *
   * `kasse.bericht()` kennt die Zahlen je FAHRT, das Fahrtenbuch hebt sie je
   * Fahrt auf — und die Ansicht zeigte sie nirgends. Hier werden sie über das
   * ganze Buch zusammengezählt, je Rolle, Cache getrennt, je Zugang.
   *
   * ⚠ NUR ECHTE FAHRTEN. Ein Trockenlauf trägt Token aus einem hinterlegten
   * Vorrat — dieselbe Zahl bei jedem Aufruf, keine Messung. Sie in die Summe
   * zu nehmen hiesse, erfundene Token neben gemessene zu stellen, und beide
   * sähen gleich aus. Wie viele Fahrten deshalb NICHT mitzählen, steht in
   * `ausgelassen` — eine Lücke wird benannt, nicht verschwiegen.
   */
  function tokenSummen(fahrten) {
    var f = Array.isArray(fahrten) ? fahrten : [];
    var jeRolle = {};
    var echte = 0, ausgelassen = 0, ohneToken = 0;
    f.forEach(function (x) {
      if (!x || !x.echt) { if (x) ausgelassen += 1; return; }
      echte += 1;
      var t = x.tokenJeRolle;
      if (!t || typeof t !== "object" || !Object.keys(t).length) { ohneToken += 1; return; }
      Object.keys(t).forEach(function (r) { tokenAddieren(jeRolle, r, t[r]); });
    });
    var gesamt = leerToken();
    Object.keys(jeRolle).forEach(function (r) { tokenAddieren({ g: gesamt }, "g", jeRolle[r]); });
    /* Ein Maximum über Rollen hinweg ist keine Auskunft — jede Rolle hat
       ihren eigenen Kontext. Die Gesamtzeile trägt deshalb keinen. */
    gesamt.kontext = null;
    return { jeRolle: jeRolle, gesamt: gesamt, fahrten: echte,
             ausgelassen: ausgelassen, ohneToken: ohneToken };
  }

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
      for (const [r, v] of Object.entries(b.tokenJeRolle || {}))
        tokenAddieren(tokenJeRolle, r, v);
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
    /*
     * ⚡ DER ZUGANG, seit Bauschritt 2 (2026-09-17).
     *
     * Eine Abo-Fahrt bucht `eur: 0` — sie lief über `claude -p` und hat keine
     * Rechnung erzeugt. Damit sah sie in der Anzeige genauso aus wie eine
     * Fahrt, die vor dem ersten Aufruf starb, und die Unterzeile behauptete
     * wörtlich „der Rest starb vor dem ersten Aufruf". **Das war eine
     * Unwahrheit über eine Fahrt, die vollständig gelaufen ist.**
     *
     * ⚠ UND DAS IST DER GRUND, AUS DEM HIER EINE VIERTE ZAHL STEHT:
     * „echt gemeint minus bezahlt" ist NICHT „starb vor dem ersten Aufruf".
     * Es war eine Rechnung, die im Normalfall dasselbe Ergebnis hatte — und
     * genau deshalb fiel sie nicht auf. Gezählt wird jetzt, was gemeint ist:
     * **null Aufrufe**.
     *
     * ⚠ `eurGerechnet` FÄLLT AUF `eur` ZURÜCK. Fahrten von VOR dem 2026-09-17
     * tragen das Feld nicht; ohne diesen Rückfall wäre die gesparte Summe für
     * jede alte Fahrt 0 und für die neuen richtig — eine Zahl, die je nach
     * Alter der Zeile etwas anderes bedeutet.
     */
    var abo = echte.filter(function (x) { return x.zugang === "abo"; });
    var gemischt = echte.filter(function (x) { return x.zugang === "gemischt"; });
    var gestorben = echte.filter(function (x) { return (Number(x.aufrufe) || 0) === 0; });
    var gerechnetVon = function (x) {
      var g = Number(x.eurGerechnet);
      return isFinite(g) && g > 0 ? g : (Number(x.eur) || 0);
    };
    var tage = {};
    f.forEach(function (x) { if (x && x.tag) tage[x.tag] = true; });
    return {
      fahrten: f.length,
      echte: echte.length,
      bezahlte: bezahlte.length,
      /* WIE VIELE über welche Kasse liefen. */
      aboFahrten: abo.length,
      gemischteFahrten: gemischt.length,
      /* Fahrten, die vor dem ersten Aufruf starben — GEMESSEN, nicht aus
         „echt minus bezahlt" geschlossen. */
      vorAufrufGestorben: gestorben.length,
      /*
       * WAS DAS ABO GESPART HAT. Das ist der Forschungs-Gewinn von
       * Bauschritt 2, und bis hierher entstand die Zahl in `api.mjs` und
       * wurde weggeworfen — genau der Fehler, den Kimhubs Verfassung dreimal
       * beschreibt.
       *
       * ⚠ `null` HEISST „KEINE ABO-FAHRT DA", nicht „null Euro gespart".
       * Wer beides als 0 liest, meldet „das Abo hat nichts gebracht", wo
       * schlicht nichts gemessen wurde.
       */
      gespartEur: abo.length
        ? Number(abo.reduce(function (a, x) { return a + gerechnetVon(x); }, 0).toFixed(4))
        : null,
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

  if (welt) welt.WERKSTATT_KASSEN = { zusammen: zusammen, fahrtSummen: fahrtSummen,
                                     tokenSummen: tokenSummen };
})(typeof window !== "undefined" ? window
   : (typeof globalThis !== "undefined" ? globalThis : null));
