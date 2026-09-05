/*
 * fahrtenbuch.mjs — was die Werkstatt wirklich gearbeitet hat.
 *
 * WARUM ES DIESE DATEI GIBT. Am 2026-08-22 hat Klaus einen Befund gemeldet, der
 * kein Wunsch war, sondern eine Unwahrheit: „Bauzeit und Tag und wer gebaut hat
 * wird in der Buchhaltung nicht dokumentiert, zum Beispiel heute und gestern
 * Agentenarbeit — als hätten sie nie gearbeitet und kein Geld gekostet."
 *
 * Er hatte recht, und der Grund war strukturell. Jede Schicht kennt ihre Kosten
 * ganz genau (`Kasse.bericht()`), aber sie schrieb sie nur an zwei Orte:
 *
 *   werkstatt/lauf.json      — hält NUR den LETZTEN Lauf, der nächste überschreibt ihn
 *   schicht/kontingent.json  — hält nur Tagessummen, ohne Besetzung, ohne Ergebnis
 *
 * Beides ist richtig für seinen Zweck und für die Buchhaltung wertlos: die eine
 * vergisst, die andere weiß zu wenig. Fehlte beides, zeigte die Seite das
 * Beispiel — und ein Beispiel sieht aus wie eine Auskunft.
 *
 * DAS FAHRTENBUCH VERGISST NICHT. Jede Fahrt wird ANGEHÄNGT, nie überschrieben.
 * Es ist die einzige Stelle, an der später noch steht, dass am 21. August eine
 * Schicht lief, was sie gekostet hat und wer dabei war.
 *
 * ES LIEGT NICHT IM DEPOT. Es ist der Stand DIESER Maschine — wie lauf.json und
 * kontingent.json, und aus demselben Grund (ein Depot, das man nur mit
 * `git checkout --` aktualisieren kann, hat einen Konstruktionsfehler). Wer es
 * mitnehmen will, sichert die Datei.
 *
 * TROCKENLÄUFE STEHEN MIT DRIN, und zwar als solche markiert. Sie kosten nichts,
 * aber sie sind Arbeit — und ein Buch, das nur die teuren Tage kennt, beantwortet
 * die Frage „wurde hier gearbeitet?" falsch.
 *
 * ══ ES IST AUCH EIN STUNDENNACHWEIS (Klaus 2026-08-24) ═══════════════════════
 *
 *   „Jede Schicht die läuft dokumentieren und meine Zeit vom auslösen bis zum
 *    ende der Schicht mitrechnen, auch wenn ich nicht händisch im Programm
 *    Kimhub ausgelöst habe, da ich vor Termux nur manuell auslösen kann."
 *    — und dazu: „alles für die Forschung."
 *
 * Damit hat dieses Buch eine zweite Aufgabe bekommen, und die zweite ist die
 * strengere. Für die KOSTEN genügt eine Summe. Für einen Stundennachweis muss
 * jede Zeile sagen: an welchem TAG, von WANN bis WANN, WER, und WOFÜR.
 *
 * DESHALB STEHT SEIT HEUTE `beginn` DABEI. Vorher gab es nur `beendet` und
 * `minuten` — auf ganze Minuten gerundet, aus der einspritzbaren Prüf-Uhr. Aus
 * diesen zwei Angaben lässt sich **kein Zeitraum rekonstruieren**, und ohne
 * Zeitraum kann niemand prüfen, ob sich zwei Einträge überschneiden.
 *
 * ⚠ UND GENAU DAS IST DER TEUERSTE FEHLER, DEN DIESES BUCH MACHEN KANN.
 * Dieselbe Stunde zweimal zu zählen — einmal von Hand gestempelt, einmal aus
 * einer Schicht — ist kein Rundungsfehler, sondern eine falsche Angabe. Sie
 * fällt niemandem auf, weil beide Zeilen für sich richtig sind. Die Anzeige
 * rechnet die Überschneidung deshalb heraus (`ansicht.js`, Abschnitt Stechuhr)
 * und **sagt, dass sie es getan hat**.
 *
 * ⚠ WAS NICHT DRINSTEHT, und das gehört dazugesagt: die Zeit VOR dem Befehl.
 * `git pull`, den Schlüssel bereitlegen, den Auftrag aussuchen — das misst
 * niemand, weil es niemand messen kann. Gemessen wird vom Start des Befehls bis
 * zu seinem Ende. Wer mehr behauptete, hätte eine geratene Zahl, und die klingt
 * genau wie eine gemessene.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";

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

/** Was bisher drinsteht — und eine kaputte Datei wird nicht stillschweigend geleert. */
export function lesen(pfad) {
  if (!existsSync(pfad)) return { ...KOPF, fahrten: [] };
  try {
    const roh = JSON.parse(readFileSync(pfad, "utf8"));
    return { ...KOPF, fahrten: Array.isArray(roh.fahrten) ? roh.fahrten : [] };
  } catch {
    // Eine unlesbare Datei darf weder die Schicht umwerfen noch die alten Fahrten
    // verschlucken. Sie wird beiseitegelegt, das Buch faengt neu an — und dass
    // etwas beiseitegelegt wurde, ist an der Datei daneben zu sehen.
    const beiseite = pfad.replace(/\.json$/, "") + "-kaputt-" + Date.now() + ".json";
    try { renameSync(pfad, beiseite); } catch { /* dann eben nicht */ }
    return { ...KOPF, fahrten: [], beiseitegelegt: beiseite };
  }
}

/**
 * Anhaengen. Der Rueckgabewert sagt, was passiert ist — ein Schreibfehler wird
 * gemeldet, nicht geworfen: die Fahrt ist zu diesem Zeitpunkt gelaufen und
 * bezahlt, und daran aendert ein volles Dateisystem nichts.
 */
export function anhaengen(pfad, e) {
  const buch = lesen(pfad);
  buch.fahrten.push(e);
  try {
    mkdirSync(dirname(pfad), { recursive: true });
    writeFileSync(pfad, JSON.stringify(buch, null, 2) + "\n", "utf8");
    return { ok: true, anzahl: buch.fahrten.length, beiseitegelegt: buch.beiseitegelegt || null };
  } catch (err) {
    return { ok: false, grund: err.message, anzahl: buch.fahrten.length };
  }
}

/** Der uebliche Ort. Eine Funktion, damit die Proben ihn nicht abschreiben muessen. */
export function pfadIn(wurzel) {
  return join(wurzel, "werkstatt", "buchhaltung", "fahrtenbuch.json");
}
