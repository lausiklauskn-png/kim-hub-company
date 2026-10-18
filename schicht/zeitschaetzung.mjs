/**
 * WIE LANGE EINE SCHICHT DAUERT — geschätzt, und aus dem Irrtum gelernt.
 *
 * WARUM ES DIESE DATEI GIBT (Klaus 2026-09-22):
 *
 * > „eine Einstellung, wo man die Arbeitszeit der Schicht einstellen kann. Ein
 * > Schieberegler. … Die KI über Kimhub soll voreinstellen, was sie schätzt …
 * > Wenn sie sich nach oben verschätzt, soll beim nächsten Mal die Zeit anders
 * > eingestellt werden. Wenn sie sich nach unten verschätzt, genauso."
 *
 * ⚠ DIE DATEN LAGEN SEIT WOCHEN DA, UND NIEMAND HAT SIE GEFRAGT. Das
 * Fahrtenbuch trägt je Fahrt `minuten` (wirklich gelaufen) und `deckelMinuten`
 * (erlaubt). Dieselbe Familie wie `werkzeugRufe` und `total_cost_usd` — eine
 * Zahl entsteht und wird weggeworfen; hier immerhin geschrieben und nie
 * gelesen.
 *
 * ⚠ BENANNTE ABWEICHUNG VON KLAUS' WORTLAUT: die Rohschätzung kommt NICHT aus
 * einem Modell-Aufruf, sondern aus der MESSUNG — erwartete Aufrufe mal der
 * Minuten je Aufruf, die auf DIESEM Gerät bisher wirklich gebraucht wurden.
 * Zwei Gründe, und beide wiegen:
 *   · Ein Modell nach seiner eigenen Dauer zu fragen kostet einen bezahlten
 *     Aufruf und liefert eine SELBSTAUSKUNFT. Die Rückkopplung ist genau der
 *     Riegel dagegen — dann lieber gleich messen.
 *   · Die Messung ist da, ohne etwas zu kaufen.
 * Der Platz für eine Selbstauskunft ist trotzdem gebaut (`rohMinuten`): wer
 * sie will, reicht sie herein, und der gelernte Faktor korrigiert sie genauso.
 *
 * PORTABEL: kein `node:`, keine Datei, keine Uhr aus der Umgebung.
 */

/** Wie weit der gelernte Faktor gehen darf. */
export const FAKTOR_MIN = 0.5;
export const FAKTOR_MAX = 3;

/** Wie stark eine einzelne Fahrt den Faktor bewegt (0..1). */
export const DAEMPFUNG = 0.4;

/** Unter so vielen Punkten wird nichts gelernt — eine Fahrt ist kein Trend. */
export const MINDEST_PUNKTE = 2;

/**
 * Taugt eine Fahrt als Messpunkt?
 *
 * ⚠ EINE ABGEBROCHENE FAHRT IST KEIN MESSPUNKT, SONDERN EINE UNTERGRENZE.
 * Wer am Zeit-Deckel abgeschnitten wird, hat nicht „genau 60 min gebraucht",
 * sondern MINDESTENS 60. Als Istwert gerechnet sinkt die Schätzung mit jedem
 * abgebrochenen Lauf weiter — und dann bricht bald JEDE Fahrt ab. Ein Fehler,
 * der sich selbst verstärkt und dabei plausibel aussieht.
 *
 * ⚠ TROCKENLÄUFE ZÄHLEN NICHT. Sie tragen Zeiten aus einem hinterlegten
 * Vorrat; wer sie mitrechnet, lernt aus erfundenen Zahlen. Dieselbe Regel gilt
 * in der Token-Summe schon.
 *
 * ⚠ UND EIN VON HAND GEZOGENER REGLER WIDERLEGT KEINE SCHÄTZUNG. Diese Fahrten
 * gehören nicht in die Rückkopplung — sonst lernt sie Klaus' Eingriffe statt
 * der Dauer.
 */
export function taugtAlsPunkt(f) {
  if (!f || typeof f !== "object") return false;
  if (f.echt !== true) return false;                 // Trockenlauf
  if (f.art === "abbruch") return false;             // Untergrenze, kein Wert
  if (f.zeitVonHand === true) return false;          // kein Irrtum der Schätzung
  if (!(Number(f.minuten) > 0)) return false;
  if (!(Number(f.zeitSchaetzungMin) > 0)) return false;
  /* ⚠ AM ZEIT-DECKEL ABGESCHNITTEN IST AUCH EINE UNTERGRENZE, auch ohne
     `art: "abbruch"`. Eine Minute Spiel, weil auf ganze Minuten gerundet wird. */
  const deckel = Number(f.deckelMinuten) || 0;
  if (deckel > 0 && Number(f.minuten) >= deckel - 1) return false;
  return true;
}

/**
 * Lernt einen Faktor aus den bisherigen Fahrten: gemessen ÷ geschätzt.
 *
 * ⚠ EIN FAKTOR, KEINE MINUTEN. Minuten je Auftrag hätten zu wenige Punkte —
 * ein Faktor lernt über alle Aufträge hinweg. Und er wird GEDÄMPFT: eine
 * einzelne ungewöhnliche Fahrt soll die Vorgabe nicht umwerfen.
 *
 * @returns `{ faktor, punkte, roh }` — oder `{ faktor: null }`, wenn es keine
 *          Grundlage gibt. **`null` heisst „noch nicht gemessen", nicht 1.**
 *          Wer beides gleich liest, meldet eine gelernte Vorgabe, die niemand
 *          gelernt hat.
 */
export function lernFaktor(fahrten) {
  const punkte = (Array.isArray(fahrten) ? fahrten : []).filter(taugtAlsPunkt);
  if (punkte.length < MINDEST_PUNKTE) return { faktor: null, punkte: punkte.length, roh: null };
  /* Die jüngsten wiegen mehr: eine Werkstatt, die schneller geworden ist, soll
     das nicht erst nach zwanzig Fahrten merken. */
  let faktor = 1;
  for (const f of punkte) {
    const einzeln = Number(f.minuten) / Number(f.zeitSchaetzungMin);
    faktor = faktor + (einzeln - faktor) * DAEMPFUNG;
  }
  const roh = faktor;
  return {
    faktor: Math.min(FAKTOR_MAX, Math.max(FAKTOR_MIN, faktor)),
    punkte: punkte.length,
    roh,
  };
}

/**
 * Die Rohschätzung aus der Messung: wie lange ein Aufruf auf diesem Gerät
 * bisher gebraucht hat, mal der Zahl der erwarteten Aufrufe.
 *
 * ⚠ AUS ECHTEN FAHRTEN, und nur aus denen, die durchgelaufen sind — eine
 * abgebrochene sagt über die Dauer je Aufruf nichts Falsches, aber über die
 * Zahl der Aufrufe. Gerechnet wird deshalb je Aufruf, nicht je Fahrt.
 */
export function minutenJeAufruf(fahrten) {
  const gut = (Array.isArray(fahrten) ? fahrten : []).filter(
    (f) => f && f.echt === true && Number(f.minuten) > 0 && Number(f.aufrufe) > 0);
  if (!gut.length) return null;
  const min = gut.reduce((a, f) => a + Number(f.minuten), 0);
  const ruf = gut.reduce((a, f) => a + Number(f.aufrufe), 0);
  return min / ruf;
}

/**
 * Was der Regler vorschlagen soll.
 *
 * @param opt.aufrufe     wie viele Aufrufe erwartet werden (`erwarteteAufrufe`).
 * @param opt.fahrten     das Fahrtenbuch.
 * @param opt.rohMinuten  eine Selbstauskunft, falls es je eine gibt. Sie
 *                        GEWINNT über die Messung — wer sie einholt, will sie
 *                        auch benutzt sehen.
 * @returns `{ minuten, grundlage, faktor, punkte, satz }` — `minuten: null`
 *          heisst „noch nicht gemessen", nicht 0.
 */
export function vorschlag({ aufrufe, fahrten, rohMinuten } = {}) {
  const gelernt = lernFaktor(fahrten);
  const jeAufruf = minutenJeAufruf(fahrten);
  const n = Number(aufrufe) || 0;

  let roh = null, grundlage = "nichts";
  if (Number(rohMinuten) > 0) { roh = Number(rohMinuten); grundlage = "selbstauskunft"; }
  else if (jeAufruf !== null && n > 0) { roh = jeAufruf * n; grundlage = "messung"; }

  if (roh === null) {
    return { minuten: null, grundlage, faktor: gelernt.faktor, punkte: gelernt.punkte,
      satz: "Noch nicht gemessen — diese Werkstatt hat keine echte Fahrt, aus der sich eine Dauer ableiten liesse." };
  }
  const f = gelernt.faktor === null ? 1 : gelernt.faktor;
  const minuten = Math.max(1, Math.round(roh * f));
  const satz = gelernt.faktor === null
    ? `Geschätzt aus ${n} erwarteten Aufrufen. Noch kein gelernter Faktor — dafür braucht es ${MINDEST_PUNKTE} abgeschlossene echte Fahrten.`
    : `Geschätzt aus ${n} erwarteten Aufrufen, korrigiert um Faktor ${f.toFixed(2)} aus ${gelernt.punkte} Fahrt(en).`;
  return { minuten, grundlage, faktor: gelernt.faktor, punkte: gelernt.punkte, roh, satz };
}

/* Der Weg zur Seite — dieselbe Bauart wie `WERKSTATT_UMFANG` und `zeit.js`.
   Ein zweiter Rechenweg im Browser wäre eine Drift-Quelle mit Ansage: dann
   stünde am Regler eine andere Zahl als im Bericht. */
if (typeof globalThis !== "undefined")
  globalThis.WERKSTATT_ZEITSCHAETZUNG = {
    FAKTOR_MIN, FAKTOR_MAX, DAEMPFUNG, MINDEST_PUNKTE,
    taugtAlsPunkt, lernFaktor, minutenJeAufruf, vorschlag,
  };
