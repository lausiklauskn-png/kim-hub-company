/*
 * gaeste.mjs — DIE GRENZE zwischen Klaus' eigener Nutzung und Fremdnutzung.
 *
 * Klaus am 2026-08-23, auf die Frage, warum Kimhub privat steht:
 *
 *   „privat hatte den Grund, dass noch keine Grenze gezogen war zwischen
 *    meiner Nutzung einer Konferenz und Fremdnutzung. Ich würde dafür
 *    bezahlen, wenn ein Fremder eine Schicht auslöst."
 *
 * Er will die Kosten tragen. Damit das keine offene Tür ist, muss vorher
 * feststehen, WER durchgeht — und wie weit.
 *
 * ── WAS VORHER FEHLTE, gemessen am 2026-08-23 ────────────────────────────
 *
 *   darfSchichtStarten(stand, DATUM, …)   begrenzt Geld je TAG, fragt nie wer
 *   tools/pult.mjs                        keine einzige Zeile zu Identität
 *   Guthaben ohne Nachladen               begrenzt die Summe, nicht den Verbraucher
 *
 * Daraus folgte der Satz, um den es hier geht: **ein einziger Fremder konnte
 * das Tageskontingent allein aufbrauchen.** Die Bremsen begrenzten den Schaden
 * je Tag; der Helfer wusste nicht einmal, dass es Personen gibt.
 *
 * ── DIE VIERTE BREMSE ─────────────────────────────────────────────────────
 *
 * Diese hier ersetzt keine der drei, sie legt sich darüber. Sie greifen
 * unabhängig, und es gilt immer die KLEINSTE:
 *
 *   Gast-Budget       was EINE Person insgesamt verbrauchen darf     hier
 *   Tageskontingent   was ALLE zusammen an einem Tag dürfen          kontingent.mjs
 *   Schicht           eine Fahrt (Zeit + Geld)                       kosten.mjs
 *   Guthaben          bei Anthropic, ohne automatisches Nachladen    (nicht im Code)
 *
 * ── WAS EIN ZUGANGSWORT IST UND WAS NICHT ────────────────────────────────
 *
 * Es ist eine **Grenze für die Zurechnung und für den Weg von aussen** — nicht
 * ein Türschloss gegen jemanden, der Klaus' Gerät in der Hand hält. Wer am
 * entsperrten Tablet sitzt, startet die Schicht ohnehin von der Kommandozeile.
 * Das steht hier, damit niemand dieser Datei mehr zutraut, als sie hält —
 * dieselbe Ehrlichkeit wie beim Chef-Code in der Buchhaltung.
 *
 * WOGEGEN SIE WIRKLICH HILFT, und das ist nicht wenig:
 *   · ein Fremder kann nicht mehr verbrauchen, als für ihn vorgesehen ist
 *   · im Fahrtenbuch steht, WER gefahren ist — bis heute stand dort niemand
 *   · und der Helfer nimmt die teure Richtung nur noch mit Zugangswort an.
 *     Das schliesst nebenbei das Loch, das seit zwei Briefen offen steht:
 *     JEDE Seite in Klaus' Browser konnte `GET /start?echt=1` auslösen und
 *     eine bezahlte Schicht starten. Ein Zugangswort kennt sie nicht.
 *
 * ── DIE LISTE GEHÖRT NICHT INS DEPOT ─────────────────────────────────────
 *
 * `schicht/gaeste.json` steht im `.gitignore`. Ein Zugangswort im Depot wäre
 * ein Schlüssel im Depot — dieselbe Regel wie für alles andere hier.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Klaus selbst. Er braucht kein Zugangswort: wer an der Kommandozeile steht,
 * IST der Betreiber. Sein Verbrauch ist trotzdem nicht unbegrenzt — das
 * Tageskontingent gilt für ihn wie für alle. Was hier entfällt, ist nur die
 * VIERTE Bremse.
 *
 * Er steht als eigener Eintrag da und nicht als Sonderfall im Code, damit im
 * Fahrtenbuch jede Fahrt einen Namen trägt. „Keine Angabe" wäre wieder die
 * Lücke, die geschlossen werden soll.
 */
export const BETREIBER = Object.freeze({
  zugang: null, name: "Klaus (Betreiber)", kennung: "betreiber",
  budgetEur: Infinity, verbrauchtEur: 0,
});

export const VORGABE = { gaeste: [] };

/** Ein neuer Gast bekommt so viel, wenn nichts anderes dabeisteht. Bewusst
 *  klein: wer mehr braucht, bekommt mehr — aber ausdrücklich. */
export const VORGABE_BUDGET_EUR = 1.0;

export function lesen(pfad) {
  if (!existsSync(pfad)) return { gaeste: [] };
  const roh = JSON.parse(readFileSync(pfad, "utf8"));
  return { gaeste: Array.isArray(roh.gaeste) ? roh.gaeste : [] };
}

export function schreiben(pfad, stand) {
  writeFileSync(pfad, JSON.stringify(stand, null, 2) + "\n", "utf8");
}

/**
 * Wer klopft? Gibt den Gast zurück oder `null`.
 *
 * VERGLICHEN WIRD ÜBER DIE GANZE LÄNGE, nicht mit `startsWith` oder einem
 * Teilstück: ein Vergleich, der ein Präfix genügen lässt, macht aus jedem
 * Zugangswort alle kürzeren.
 */
export function finde(stand, zugangswort) {
  if (typeof zugangswort !== "string" || !zugangswort) return null;
  return (stand.gaeste || []).find(
    // BEIDE Seiten müssen etwas sein. Die Gegenprobe hat gezeigt, dass ein
    // Riegel nur auf der Frage-Seite zu wenig ist: ein Eintrag, dem beim
    // Tippen das Zugangswort fehlt (`""` oder gar kein Feld), wäre sonst für
    // jeden offen, der ebenfalls nichts angibt. Ein halber Riegel ist hier
    // schlimmer als keiner — er sieht aus wie ein ganzer.
    (g) => typeof g.zugang === "string" && g.zugang !== "" && g.zugang === zugangswort
  ) || null;
}

/*
 * BRINGT DIESER GAST SEINEN EIGENEN SCHLÜSSEL MIT? (Klaus 2026-08-23)
 *
 *   „jeder selber bezahlen … genauso wie in Mein Rezeptbuch, Mein Mixarium,
 *    dass das alles schon gebaut wurde. Deswegen ist es da einfacher zu
 *    übernehmen."
 *
 * Ein Gast-Eintrag darf statt eines Budgets einen `schluessel` tragen. Dann
 * läuft seine Schicht auf SEINER Rechnung, und Klaus' Geld wird nicht berührt.
 * Das ist BYOK — dasselbe Muster wie in Mixarium (`mxkey9m`) und Kimseek, nur
 * auf der Node-Seite statt im Browser.
 *
 * DARAUS FOLGT ETWAS FÜR DIE BUCHHALTUNG, und es ist der Punkt, an dem so etwas
 * still schiefgeht: was ein Gast auf eigenem Schlüssel verbraucht, ist **nicht
 * Klaus' Ausgabe**. Es darf weder sein Tageskontingent verbrauchen noch in
 * seiner Geldsumme auftauchen. Sonst meldet das Fahrtenbuch Kosten, die nie
 * jemand hatte — dieselbe Sorte Fehler wie eine zu niedrige Zahl, nur in die
 * andere Richtung.
 *
 * `basisUrl` ist der eigene Anbieter. Was daran geht und was nicht, steht in
 * `api.mjs` — kurz: nur wer das Anthropic-Protokoll spricht.
 */
export function zahltSelbst(gast) {
  return !!(gast && typeof gast.schluessel === "string" && gast.schluessel.trim());
}

export function restFuer(gast) {
  if (!gast) return 0;
  if (gast.budgetEur === Infinity) return Infinity;
  return Math.max(0, Number(gast.budgetEur || 0) - Number(gast.verbrauchtEur || 0));
}

/**
 * Darf dieser Gast eine Schicht mit diesem Deckel fahren?
 *
 * Gibt — wie `kontingent.darfSchichtStarten` — einen möglicherweise
 * GEKÜRZTEN Deckel zurück statt einfach nein zu sagen. Ein Rest von 60 Cent
 * soll eine kleine Schicht erlauben, nicht gar keine.
 */
export function darfGast(gast, wunschDeckelEur, mindestDeckelEur = 0.5) {
  if (!gast) return { ok: false, deckelEur: 0, gekuerzt: false,
    text: "Kein gültiges Zugangswort. Ohne das wird keine bezahlte Schicht gestartet." };
  // Wer selbst zahlt, wird von DIESER Bremse nicht gehalten — sie schützt Klaus'
  // Geld, und seines ist nicht im Spiel. Der Schicht-Deckel gilt weiter; der
  // schützt den GAST vor sich selbst.
  if (zahltSelbst(gast))
    return { ok: true, deckelEur: wunschDeckelEur, gekuerzt: false, selbstzahler: true,
      text: `${gast.name} bringt einen eigenen Schlüssel mit — diese Fahrt geht ` +
            `nicht auf Klaus' Rechnung.` };
  const rest = restFuer(gast);
  if (rest === Infinity)
    return { ok: true, deckelEur: wunschDeckelEur, gekuerzt: false, text: "" };
  if (rest < mindestDeckelEur)
    return { ok: false, deckelEur: 0, gekuerzt: false,
      text: `Budget von ${gast.name} aufgebraucht ` +
            `(${Number(gast.budgetEur).toFixed(2)} € insgesamt, davon ` +
            `${Number(gast.verbrauchtEur || 0).toFixed(2)} € verbraucht).` };
  if (rest < wunschDeckelEur)
    return { ok: true, deckelEur: rest, gekuerzt: true,
      text: `Rest für ${gast.name}: ${rest.toFixed(2)} € — die Schicht läuft mit ` +
            `diesem kleineren Deckel statt mit ${wunschDeckelEur.toFixed(2)} €.` };
  return { ok: true, deckelEur: wunschDeckelEur, gekuerzt: false, text: "" };
}

/**
 * Bucht, was verbraucht wurde. Gibt den GEÄNDERTEN Stand zurück; das Schreiben
 * macht der Aufrufer — genauso wie bei `kontingent.buchen`, damit die
 * Reihenfolge (erst Fahrtenbuch, dann Bremsen) an einer Stelle steht und nicht
 * in zwei Modulen verteilt ist.
 *
 * Der Betreiber wird NICHT gebucht: er hat kein Budget, und ein Eintrag ohne
 * Grenze wächst nur. Seine Fahrten stehen im Fahrtenbuch, dort gehören sie hin.
 */
export function buchen(stand, gast, verbrauchtEur) {
  if (!gast || gast.zugang === null) return stand;
  // Ein Selbstzahler hat kein Budget, das sinken könnte. Was er verbraucht,
  // steht auf seiner eigenen Rechnung und geht diese Liste nichts an.
  if (zahltSelbst(gast)) return stand;
  const g = (stand.gaeste || []).find((x) => x.zugang === gast.zugang);
  if (!g) return stand;
  g.verbrauchtEur = Number((Number(g.verbrauchtEur || 0) + Number(verbrauchtEur || 0)).toFixed(4));
  g.zuletzt = new Date().toISOString();
  return stand;
}
