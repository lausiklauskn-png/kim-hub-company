/*
 * fahrtenbuch-form.mjs — WIE eine Fahrt aussieht, unabhängig davon, WO sie liegt.
 *
 * ⚠ GEZOGEN, NICHT KOPIERT (2026-09-06). Klaus: „auch abgebrochene Schichten
 * sollten gespeichert und dokumentiert werden, damit man sehen kann — für die
 * Forschung — was schiefgelaufen ist." Die Browser-App schrieb bis dahin gar
 * kein Fahrtenbuch: `fahrtenbuch.mjs` hängt an `node:fs`, und im Browser gibt
 * es kein Dateisystem.
 *
 * Also dieselbe Naht wie bei Ablage und Baum: **WO etwas liegt** ist von
 * **WAS dabei gilt** getrennt. Hier steht nur die Form — keine Importe, damit
 * sie überall läuft. `fahrtenbuch.mjs` reicht sie unverändert weiter, also
 * ändert sich für Node und für jede bestehende Probe nichts.
 *
 * Zwei Fassungen derselben Form wären eine Drift-Quelle mit Ansage: dann
 * trüge das Buch im Browser andere Felder als das auf der Platte, und ein
 * Forscher, der beide vergleicht, verglich Äpfel mit Birnen.
 */


export const KOPF = {
  quelle: "schicht/lauf.mjs — jede Fahrt haengt sich selbst an, keine Nacherfassung",
  bedeutung: "Stand DIESER Maschine. Fehlt die Datei, heisst das NICHT 'keine Kosten' — " +
             "es heisst, hier steht nichts.",
};

/** Wie eine Fahrt heisst, die keinen eigenen Namen hat. */
export const ARTEN = {
  planmodus: "Konferenz (Planmodus)",
  schicht: "Schicht mit Bau",
  gegenpruefung: "Gegenprüfung",
  /*
   * Eine Fahrt, die unterwegs liegen geblieben ist. Sie gehört ins Buch, WEIL
   * sie liegen geblieben ist: was bis dahin an Aufrufen hinausging, ist bezahlt.
   * Ohne diesen Eintrag fehlte das Geld in der Buchhaltung, und eine zu niedrige
   * Zahl sieht genauso aus wie eine gemessene — derselbe Befund wie am
   * 2026-08-22, nur an einer anderen Stelle.
   */
  abbruch: "Abgebrochene Fahrt",
};

/**
 * Ein Eintrag aus dem, was die Kasse ohnehin weiss. NICHTS wird hier geschaetzt:
 * jede Zahl kommt aus `Kasse.bericht()`, jeder Name aus der Besetzung.
 *
 * `minuten` ist die WIRKLICHE Dauer, nicht der Deckel. Genau diese Verwechslung
 * hat Klaus am selben Tag gemeldet („unten steht 2 Stunden Schicht, aber die
 * Schicht ist schon nach wenigen Minuten beendet"): zwei Stunden waren nie eine
 * Aussage ueber die Dauer, sondern eine Obergrenze. Beide stehen hier, getrennt
 * benannt.
 */
export function eintrag({ art, echt, datum, bericht, besetzung = [],
                          titel = "", ergebnis = "", wer = "", arm = "voll",
                          beginn = "",
                          beendet = new Date().toISOString() }) {
  if (!ARTEN[art]) throw new Error(
    `Unbekannte Fahrt-Art "${art}". Bekannt: ${Object.keys(ARTEN).join(", ")}. ` +
    `Lieber abbrechen als eine Fahrt unter falschem Namen eintragen.`);
  if (!bericht) throw new Error("Eine Fahrt ohne Kassenbericht ist keine Fahrt.");
  /*
   * WANN die Fahrt begann. Vorzugsweise aus dem Kassenbericht (Wanduhr, beim
   * Bau der Kasse gestempelt); wer keinen mitgibt, bekommt `beendet` — dann ist
   * die Spanne null, und das ist ehrlicher als eine erfundene Dauer.
   */
  const start = String(beginn || bericht.beginnIso || beendet);
  /*
   * ⚠ NICHT AUS `bericht.minuten` GERECHNET. Das ist auf ganze Minuten gerundet
   * und kommt aus der einspritzbaren Prüf-Uhr — für einen Stundennachweis beides
   * falsch. Gerechnet wird aus der WANDUHR, in Sekunden, ungerundet.
   *
   * Ungerundet abgelegt, gerundet angezeigt: dieselbe Regel wie in der Stechuhr,
   * und aus demselben Grund. Runden beim Ablegen verliert Zeit, und zwar
   * rückwirkend und stumm.
   */
  const spanneSek = Math.max(0, (Date.parse(beendet) - Date.parse(start)) / 1000) || 0;
  return {
    beginn: start,
    beendet,
    /* Die Spanne vom Auslösen bis zum Ende — Klaus' Zeit an dieser Fahrt.
       NICHT dasselbe wie `minuten`: das ist die Kassen-Laufzeit aus der
       Prüf-Uhr. Zwei Zahlen, zwei Uhren, zwei Fragen. */
    sekunden: Number(spanneSek.toFixed(3)),
    tag: datum || beendet.slice(0, 10),
    art,
    artText: ARTEN[art],
    echt: !!echt,
    /* WER gefahren ist. Bis zum 2026-08-23 stand hier niemand — es gab keine
       Grenze zwischen Klaus' eigener Nutzung und Fremdnutzung, und damit auch
       nichts einzutragen. Leer heisst „vor der Grenze eingetragen", nicht
       „unbekannt": alte Einträge nachträglich mit einem Namen zu füllen wäre
       eine erfundene Angabe. */
    wer: String(wer || ""),
    eur: Number(bericht.verbrauchtEur || 0),
    deckelEur: Number(bericht.deckelEur || 0),
    aufrufe: Number(bericht.aufrufe || 0),
    // Die gelaufene Zeit und die erlaubte Zeit sind zwei Zahlen, nicht eine.
    minuten: Number(bericht.minuten || 0),
    deckelMinuten: Number(bericht.laufzeitMinuten || 0),
    rechenMs: Number(bericht.msGesamt || 0),
    jeRolle: bericht.jeRolle || {},
    /* Wie viel TEXT je Rolle. Ohne diese Zeile lebt die Zahl nur bis zum
       nächsten Lauf: `werkstatt/lauf.json` hält den letzten, das Fahrtenbuch
       hält alle. Derselbe Grund, aus dem es das Fahrtenbuch überhaupt gibt. */
    tokenJeRolle: bericht.tokenJeRolle || {},
    /* UNTER WELCHER BEDINGUNG die Fahrt lief („voll" oder „nackt"). Eine Zahl
       ohne ihre Bedingung ist keine Messung — und alte Fahrten aus der Zeit vor
       dem Versuch tragen „voll", weil sie genau so gelaufen sind. */
    arm: String(arm || "voll"),
    besetzung: besetzung.slice(),
    titel: String(titel || ""),
    ergebnis: String(ergebnis || ""),
  };
}
