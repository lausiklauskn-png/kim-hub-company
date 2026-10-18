/*
 * api.mjs — der einzige Ort, an dem die Werkstatt nach draußen spricht.
 *
 * ZWEI FASSUNGEN, gleiche Fläche:
 *   EchteApi     ruft Anthropic an, kostet Geld
 *   TrockenApi   antwortet aus hinterlegten Beispielen, kostet nichts
 *
 * Die Trockenschicht ist kein Spielzeug, sondern der Grund, warum sich die
 * Mechanik überhaupt beweisen lässt: Reihenfolge, Bremse, Gedächtnis, Ergebnis-
 * Datei — alles ohne einen Cent. Erst wenn das steht, lohnt ein echter Aufruf.
 *
 * WAS WELCHES MODELL VERTRÄGT. Nicht jedes Modell nimmt jeden Parameter, und ein
 * falscher ist kein stiller Fehlschlag, sondern ein 400:
 *   - `output_config.effort` gibt es auf Opus 5 und Sonnet 5; auf Haiku 4.5
 *     wird es ABGEWIESEN.
 *   - `thinking: {type:"adaptive"}` gehört zu Opus 5 / Sonnet 5. Haiku 4.5 kennt
 *     nur die alte Form mit `budget_tokens` — die lassen wir hier ganz weg.
 * Deshalb steht das in einer Tabelle und nicht in einer Annahme.
 */

/*
 * DIESE DATEI ZIEHT NICHTS AUS `node:` NACH. Bis zum 2026-09-04 tat sie es —
 * über `import { MAX_RUNDEN } from "./werkzeuge.mjs"`, und darüber hing der
 * ganze `node:fs`-Graph. Ein `grep node:` fand das nicht: der Import sah
 * harmlos aus, und `process.env` in der Signatur unten ist ein GLOBAL, kein
 * Import. Wer nach dem Präfix sucht, meldet „alles sauber".
 *
 * Was daran hängt: `api.mjs`, `kosten.mjs`, `rollen.mjs` und `beispiele.mjs`
 * sind damit auch im Browser ladbar — die TrockenApi läuft dort vollständig,
 * die EchteApi holt ihr SDK erst beim ersten Aufruf. `tests/smoke_ohne_node.mjs`
 * misst das über den ganzen Import-Graphen, nicht über eine Textsuche.
 */

/** Diese Werkzeug-Runden macht eine Rolle höchstens, dann ist Schluss. Ohne
 *  Deckel dreht ein Modell im Kreis, und JEDE Runde ist bezahlt. Steht hier und
 *  nicht bei den anderen Deckeln in `werkzeuge.mjs`, weil er als einziger HIER
 *  erzwungen wird — in der Schleife weiter unten. */
export const MAX_RUNDEN = 8;

/*
 * ══ WORAN DIE RUNDE HING — die Spur zum Abbruch ═══════════════════════════
 *
 * Klaus' Fahrt 11 starb an diesem Deckel: „greift seit 8 Runden zu Werkzeugen
 * … Bisher 12 Werkzeug-Aufrufe." Die Zahl sagt, DASS es im Kreis ging, und
 * verschweigt, WORAN. Die nächste Fahrt kostet dann wieder Geld, um dasselbe
 * nicht zu erfahren — *eine Auskunft, die den nächsten Schritt nicht nennt,
 * ist eine halbe.*
 *
 * ⚠ GEZÄHLT WIRD NACH `fehlschlag`, NICHT NACH `ok`. `ok` heisst „das Werkzeug
 * gibt es"; ein Lesezugriff auf eine Datei, die es nicht gibt, ist `ok: true`.
 * Wer nach `ok === false` zählt, bekommt nur die vertippten Werkzeugnamen und
 * meldet „0 Fehlschläge", während jeder Griff ins Leere ging.
 *
 * ⚠ NUR DIE RUFE DIESES AUFRUFS. `werkbank.gerufen` sammelt über die ganze
 * Schicht; die letzten `werkzeugRufe` Einträge sind die eigenen. Die ganze
 * Liste zu nehmen hiesse, Stens Lesezugriffe in Emils Abbruch zu schreiben.
 */
export function werkzeugSpurText(gerufen, wieViele, zeigeHoechstens = 8) {
  const alle = Array.isArray(gerufen) ? gerufen : [];
  const n = Number(wieViele) > 0 ? Number(wieViele) : 0;
  const spur = n > 0 ? alle.slice(-n) : [];
  if (!spur.length) return "";
  const fehl = spur.filter((g) => g && g.fehlschlag).length;
  const zeige = spur.slice(-zeigeHoechstens);
  const zeile = (g) => {
    const e = g && g.eingabe && typeof g.eingabe === "object"
      ? Object.values(g.eingabe).filter((v) => typeof v === "string")[0] : null;
    return `     · ${g?.name}(${e ? String(e).slice(0, 60) : ""})`
      + (g?.fehlschlag ? "  → ging nicht" : "");
  };
  return "\n   Woran es hing — die Werkzeug-Rufe dieses Aufrufs"
    + (spur.length > zeige.length ? ` (die letzten ${zeige.length} von ${spur.length})` : "")
    + ":\n" + zeige.map(zeile).join("\n")
    + (fehl ? `\n   ${fehl} von ${spur.length} gingen ins Leere — das ist die Spur, der `
        + `zuerst nachzugehen ist.` : "");
}

/**
 * Ein Wert aus der Umgebung, ohne `process` vorauszusetzen. Im Browser gibt es
 * das Global nicht, und ein Zugriff darauf wirft — nicht erst beim Aufruf,
 * sondern schon beim Bauen des Objekts.
 */
function ausUmgebung(name) {
  return typeof process !== "undefined" && process?.env ? process.env[name] : undefined;
}

/*
 * WELCHE KASSEN ES GIBT (2026-09-17). Zwei, und sie sind nicht dasselbe:
 *
 *   api   über das Anthropic-SDK bzw. `transport-netz.mjs`. Jeder Aufruf zieht
 *         API-Guthaben. So lief bis hierher jede Schicht.
 *   abo   über `claude -p` als Unterprozess (`transport-cli.mjs`). Ohne
 *         `ANTHROPIC_API_KEY` in der Umgebung zieht die CLI aus dem
 *         Claude-Kontingent: derselbe Aufruf, keine Rechnung.
 *
 * ⚠ `abo` LÄUFT NUR, WO EIN PROZESS ZU STARTEN IST — auf dem Hetzner-Server,
 * nie in Company im Browser (NETZWEIT § 6b). Das ist keine Vorsicht, sondern
 * eine Tatsache über den Browser.
 */
export const ZUGAENGE = ["api", "abo"];

export const KANN = {
  "claude-opus-5":    { effort: true,  denken: "adaptive", maxAus: 128000 },
  "claude-sonnet-5":  { effort: true,  denken: "adaptive", maxAus: 128000 },
  "claude-haiku-4-5": { effort: false, denken: null,       maxAus: null },
};

/*
 * ══ WIE VIEL EINE ROLLE HÖCHSTENS AUSGEBEN DARF ═══════════════════════════
 *
 * `maxAus` ist der Ausgabe-Deckel des MODELLS, nachgeschlagen am 2026-09-21:
 * Opus 5 und Sonnet 5 geben bis zu 128 000 Token aus.
 *
 * ⚠ `null` HEISST „NICHT NACHGESCHLAGEN", NICHT „UNBEGRENZT" — und für
 * Haiku 4.5 steht dort mit Absicht `null`. Eine geratene Obergrenze klingt
 * genau wie eine nachgeschlagene, und an dieser Zahl hängt, ob ein Aufruf
 * überhaupt angenommen wird. Wer sie nachschlägt, trägt sie ein; bis dahin
 * sagt die Prüfung „nicht prüfbar" statt „in Ordnung". Drei Ausgänge, nicht
 * zwei — der dritte klagt niemanden an.
 *
 * WARUM DIE PRÜFUNG VOR DIE SCHICHT GEHÖRT UND NICHT AN DEN AUFRUF: ein zu
 * grosser Deckel wird von der Gegenseite mit einem 400 abgewiesen, und zwar
 * erst bei Emils ERSTEM Aufruf — nach der Konferenz. Die ist dann bezahlt.
 * Dieselbe Familie wie Fahrt 9 und Fahrt 10: die Schicht stirbt an etwas, das
 * vorher für nichts zu haben gewesen wäre. *Was die Arbeit voraussetzt, wird
 * geprüft, bevor gearbeitet wird.*
 */
export function deckelProbleme(mitarbeiter, vorgabe = 16000) {
  const raus = [];
  for (const m of Array.isArray(mitarbeiter) ? mitarbeiter : []) {
    const kann = KANN[m?.modell];
    if (!kann) continue;                       // unbekanntes Modell: nicht unsere Frage
    if (kann.maxAus == null) continue;         // nicht nachgeschlagen: nicht prüfbar
    const deckel = Number(m.maxTokens) > 0 ? Number(m.maxTokens) : vorgabe;
    if (deckel > kann.maxAus)
      raus.push({ rolle: m.rolle ?? "(ohne Rolle)", name: m.name ?? "(ohne Namen)",
                  modell: m.modell, deckel, maxAus: kann.maxAus });
  }
  return raus;
}

/**
 * Holt das geprüfte Objekt aus der Antwort. Zwei Wege, in dieser Reihenfolge:
 * `parsed_output`, wenn das SDK es gefüllt hat — sonst der erste Textblock, der
 * sich als JSON lesen lässt. Gibt keiner etwas her, wird ABGEBROCHEN und nicht
 * geraten: eine halb verstandene Antwort sieht genauso aus wie eine ganze.
 */
const ZITAT_AUF = "\u201E";   /* „ — deutsches Anführungszeichen, unten */
const ZITAT_ZU  = "\u201C";   /* “ — deutsches Anführungszeichen, oben   */

/**
 * ══ EIN ANFÜHRUNGSZEICHEN HAT VIER GUTE ANTWORTEN GETÖTET ══════════════════
 *
 * Gemessen am 2026-09-21 über 35 Läufe der Abo-CLI (Beleg:
 * `forschung/messungen/cli-unlesbar-2026-09-21.json`). VIER Antworten waren
 * nicht lesbar — und alle vier aus DERSELBEN Ursache:
 *
 *     "Ein Begründungssatz für „Schlüssel gehören nicht ins Depot"",
 *                              ↑ öffnet mit „      schliesst mit "  ← falsch
 *
 * Das Modell öffnet typografisch (U+201E) und schliesst mit dem GERADEN
 * Anführungszeichen (U+0022) — genau dem Zeichen, mit dem JSON seine Texte
 * beendet. Der String bricht mitten im Satz ab, der Rest ist für den Leser
 * Unsinn.
 *
 * ⚠ DIE ANTWORTEN WAREN INHALTLICH DA UND RICHTIG. Drei der vier trugen
 * „nachbessern" — das korrekte Urteil. Eine Schicht daran sterben zu lassen
 * ist die Verschwendung, die Klaus am 2026-09-21 benannt hat: *man stampft
 * keine Schicht ein, weil ein Zettel falsch gefaltet ist.*
 *
 * ⚠ UND ES WIRD TROTZDEM NICHT GERATEN. Vier Riegel, jeder mit eigener
 * Gegenprobe:
 *
 *   1. Geheilt wird NUR, was ohne Heilung schon NICHT parst. Gültiges JSON
 *      fasst diese Funktion nie an — sie kann also nichts verschlimmern.
 *   2. Geheilt wird NUR dieses eine, benannte Muster.
 *   3. Es wird nur ERSETZT, nie eingefügt oder weggenommen: die Länge muss
 *      gleich bleiben. Ein Eingriff, der Zeichen verschiebt, verschöbe auch
 *      Feldgrenzen — und DAS wäre die stille Sorte Fehler.
 *   4. Parst das Ergebnis nicht, wird abgebrochen wie bisher.
 *
 * ⚠ UND ES WIRD GESAGT. `geheilt` reist bis ins Ruf-Ereignis. Eine stille
 * Reparatur am Inhalt einer Antwort wäre genau das, wogegen die ganze
 * Werkstatt gebaut ist — *wo gekürzt wurde, steht dass gekürzt wurde.*
 */
/* Ein „ (U+201E), dann alles ausser einem Anführungszeichen oder Zeilenumbruch,
   dann das GERADE ". Als eigene Konstante, damit eine Gegenprobe darauf zeigen
   kann — inline war die Zeile voller Anführungszeichen und von aussen nicht
   sauber zu treffen. */
const ZITAT_KAPUTT = new RegExp(ZITAT_AUF + "[^\"\u201C\u201D\n]*\"", "g");

export function heileZitate(text) {
  if (typeof text !== "string" || !text.includes(ZITAT_AUF)) return null;
  /* ⚠ EIN ESCAPTES \" IST GÜLTIG UND BLEIBT STEHEN (Vorlauf der Versuchsarme,
     2026-10-01). Emils Antwort mischte beides: „Frau M." (kaputt) und
     „…wird\" (gültig). Die erste Fassung tauschte auch das zweite und machte
     daraus \“ — ein ungültiges Escape. Die Heilung brach damit eine richtige
     Stelle. Gezählt wird die Reihe der Backslashes davor: ungerade heisst
     escapt. */
  const heil = text.replace(ZITAT_KAPUTT, (m) => {
    let n = 0;
    for (let i = m.length - 2; i >= 0 && m[i] === "\\"; i--) n++;
    return n % 2 === 1 ? m : m.slice(0, -1) + ZITAT_ZU;
  });
  /* Riegel 3: gleiche Länge, sonst ist es kein Zeichen-Tausch mehr. */
  if (heil.length !== text.length || heil === text) return null;
  return heil;
}

/**
 * Liest den Inhalt UND sagt, ob dafür geheilt werden musste.
 *
 * `leseInhalt` daneben behält die alte Fläche (gibt nur den Inhalt) — ein
 * Dutzend Stellen ruft sie so, und zwei Fassungen derselben Frage liefen
 * auseinander.
 */
export function leseInhaltMitBefund(antwort, modell = "?") {
  if (antwort?.parsed_output) return { inhalt: antwort.parsed_output, geheilt: false };
  const text = (antwort?.content || [])
    .filter((b) => b?.type === "text").map((b) => b.text).join("").trim();
  if (text) {
    // Manche Modelle legen JSON in einen Code-Zaun. Das ist kein Fehler, nur eine
    // Verpackung — aber sie muss ausdrücklich abgezogen werden, nicht erraten.
    const zaun = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const kandidaten = zaun ? [text, zaun[1]] : [text];
    /* ⚠ ERST ALLE OHNE HEILUNG, DANN ERST MIT. Andersherum bekäme ein
       Kandidat, der ungeheilt gültig ist, die Heilung übergestülpt — und
       Riegel 1 wäre eine Behauptung. */
    for (const k of kandidaten) { try { return { inhalt: JSON.parse(k), geheilt: false }; } catch { /* weiter */ } }
    for (const k of kandidaten) {
      const heil = heileZitate(k);
      if (heil === null) continue;
      try { return { inhalt: JSON.parse(heil), geheilt: true }; } catch { /* unten abbrechen */ }
    }
  }
  /* ⚠ DER VOLLE TEXT REIST MIT (Vorlauf 2026-10-01). Die Meldung zeigte nur
     200 Zeichen; die Ursache stand an Stelle 709 und musste aus den
     Protokollen der CLI auf dem Server geholt werden. `roh` geht an
     `frage()` (einmal neu anfragen) und bei einem Abbruch in eine Datei. */
  throw Object.assign(new Error(`${modell} hat nichts geliefert, das zum Schema passt ` +
    `(stop_reason: ${antwort?.stop_reason}). Nicht geraten, abgebrochen.` +
    (text ? `\nAnfang der Antwort: ${text.slice(0, 200)}` : "")),
    { unlesbar: true, roh: text || "" });
}

export function leseInhalt(antwort, modell = "?") {
  return leseInhaltMitBefund(antwort, modell).inhalt;
}

/**
 * Macht aus dem SDK-Objekt einen Boten mit derselben Fläche wie jeder andere —
 * zwei Handgriffe, sonst nichts. Was das SDK an Bequemlichkeit mitbringt, wird
 * bewusst NICHT genutzt: sonst könnte der Browser-Bote es nicht nachbilden, und
 * die Naht wäre eine Behauptung.
 *
 * ⚠ EIGENE FUNKTION, WEIL SIE SONST NICHT ZU MESSEN IST. Sie stand bis zum
 * 2026-09-05 mitten in `_hol()`, hinter einem `import()` des SDK — eine Probe
 * kam dort nur vorbei, wenn das SDK installiert ist, und ein Wächter, der den
 * Boten von aussen einsetzt, fährt diese Zeilen gerade NICHT. Genau deshalb war
 * der Gegenprobe-Fall „der Zaehler erzeugt in Wahrheit eine Antwort" blind: er
 * sabotierte eine Zeile, die keine Probe je ausführte.
 *
 * Der Unterschied, um den es geht: `zaehle` nimmt `count_tokens` und NICHT
 * `create`. Beides liefert eine Eingabe-Zahl — nur ist die eine bezahlt. Ein
 * Fehler hier ist unsichtbar: gleiche Zahl, gleiche Form, eine Rechnung dahinter.
 */
export function boteAusSdk(roh) {
  return {
    /* ⚠ GESTRÖMT, GENAU WIE DER NETZ-BOTE. Zwei Boten, die sich hier
       unterscheiden, wären zwei Verhalten: im Browser liefe eine lange Antwort
       durch, an der Kommandozeile liefe sie in eine Zeitgrenze — oder
       andersherum. `finalMessage()` gibt dieselbe Form heraus wie `create()`,
       also merkt `frage()` von beidem nichts. */
    erzeuge: (bitte) => roh.messages.stream(bitte).finalMessage(),
    zaehle: (bitte) => roh.messages.countTokens(bitte).then((r) => r.input_tokens),
  };
}

/**
 * Ist dieser Fehler einer, den ein zweiter Anlauf beheben kann? Nur dann wird
 * wiederholt. Gemessen an dem, was wirklich ankam: das SDK hängt an einem
 * HTTP-Fehler `status`, an einem Fehler im Strom die rohe JSON-Meldung.
 */
export function istVoruebergehend(e) {
  if (!e || e.notaus) return false;
  const st = Number(e.status);
  if (st === 408 || st === 429 || st >= 500) return true;
  const typ = e.error?.type || e.error?.error?.type;
  if (typ === "api_error" || typ === "overloaded_error") return true;
  const m = String(e.message || "");
  return /"type":\s*"(api_error|overloaded_error)"/.test(m)
      || /Internal server error|overloaded|Connection error|ECONNRESET|ETIMEDOUT|fetch failed/i.test(m);
}

/**
 * ══ EIN 400 SAGT MEISTENS SELBST, WORAN ES LAG ═════════════════════════════
 *
 * Anlass ist Klaus' Fahrt 10 (2026-09-21). Die Gegenseite antwortete wörtlich
 * „Your credit balance is too low to access the Anthropic API" — und die
 * Werkstatt meldete darüber:
 *
 *   VERDACHT … erzwungenes JSON (output_config.format) und tools vertragen
 *   sich womöglich nicht. Prüfen, BEVOR irgendwo anders gesucht wird.
 *
 * Jeder 400 mit Werkbank bekam diesen Satz, ungelesen. Er schickte an die
 * falsche Stelle, und er war obendrein **überholt**: dass Werkzeuge und
 * erzwungenes JSON zusammengehen, ist am 2026-08-23 mit einem Aufruf gemessen
 * worden (`node schicht/probe-api.mjs --werkzeuge`, 0,36 Cent). *Eine
 * Auskunft, die in die falsche Richtung zeigt, ist teurer als gar keine* —
 * der Satz steht zwei Fehlermeldungen weiter unten in dieser Datei.
 *
 * ⚠ `null` HEISST „ICH HABE NICHTS HINZUZUFÜGEN", nicht „alles in Ordnung".
 * Was vorübergehend ist, wird hier ausdrücklich NICHT gedeutet: sonst stürbe
 * der erste 500 an einer Deutung, statt wiederholt zu werden.
 *
 * ⚠ DIE ERKENNUNG IST ENG UND FÄLLT FAIL-SOFT. Gesucht wird der Wortlaut
 * `credit balance is too low`; formuliert die Gegenseite ihn um, fällt der
 * Fall in den allgemeinen Zweig — und der gibt ihren Satz im Klartext heraus.
 * Deshalb darf er eng sein: ein Danebengreifen kostet die Einordnung, nie die
 * Auskunft. Ein weites Muster auf „billing" hätte dagegen fremde Sätze
 * eingesammelt und ihnen einen Grund angedichtet.
 */
export function deuteAbweisung(e, { werkbank = false } = {}) {
  if (!e || e.notaus || istVoruebergehend(e)) return null;
  const roh = String(e.message || e || "");
  const vierhundert = Number(e.status) === 400 || /^400\b/.test(roh);

  if (/credit balance is too low/i.test(roh))
    return (
      "Das Guthaben dieses Zugangs ist aufgebraucht. Die Gegenseite hat den " +
      "Aufruf abgewiesen, BEVOR sie etwas erzeugt hat — dieser eine kostet " +
      "also nichts; was davor lief, ist bezahlt und wird gebucht.\n" +
      "   Aufladen in der Anthropic-Console unter Plans & Billing. Danach " +
      "geht es mit --fortsetzen weiter, ohne das Bezahlte noch einmal zu " +
      "bezahlen.\n" +
      "   Wortlaut der Gegenseite: " + roh
    );

  if (!vierhundert) return null;

  return (
    "Der Aufruf wurde abgewiesen (400): " + roh + "\n" +
    (werkbank
      ? "   NICHT bei den Werkzeugen anfangen, ohne den Wortlaut darüber " +
        "gelesen zu haben: dass `tools` und erzwungenes JSON zusammengehen, " +
        "ist am 2026-08-23 gemessen worden (`node schicht/probe-api.mjs " +
        "--werkzeuge`, 0,36 Cent). Wer es trotzdem ausschliessen will, fährt " +
        "dieselbe Schicht mit `--ohne-werkzeuge`."
      : "   Ein 400 kommt beim zweiten Mal genauso zurück und wird deshalb " +
        "nicht wiederholt. Der Grund steht im Wortlaut darüber.")
  );
}

const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));

export class EchteApi {
  /** Steht so im Lauf-Protokoll. Nicht am Klassennamen ablesen — der ist Zufall. */
  art = "echt";

  /*
   * `basisUrl` — der eigene KI-Anbieter (Klaus 2026-08-23).
   *
   * „Verschiedene können ausgewählt werden, die verschiedene Schlüssel
   *  anbieten, manche auch umsonst. Deswegen soll auch die Möglichkeit gegeben
   *  werden, seine eigene KI zu integrieren, wenn das überhaupt geht."
   *
   * ES GEHT — ABER NUR FÜR EINE SORTE ANBIETER, und das gehört hierhin und
   * nicht in eine Werbezeile: das SDK spricht das **Anthropic-Messages-
   * Protokoll**. Wer eine andere Adresse einträgt, muss dieselbe Sprache
   * sprechen. Das tun Anthropic-Weiterleitungen, manche Gateways und
   * Anthropic-kompatible Torwächter.
   *
   * WAS NICHT GEHT: eine Adresse, die das OpenAI-Protokoll spricht — und das
   * sind die meisten lokalen Modelle (Ollama, LM Studio) und die meisten
   * kostenlosen Anbieter. Dafür bräuchte es einen Übersetzer zwischen zwei
   * Protokollen, und der ist NICHT gebaut. Ein Feld, das aussieht, als nähme es
   * jede Adresse, wäre ein toter Knopf mit Beschriftung.
   */
  constructor({ schluessel, maxTokens = 16000, basisUrl, transport = null,
                zugang = "api", cli = null, wiederholung = null } = {}) {
    /*
     * WIEDERHOLUNG BEI VORÜBERGEHENDEN FEHLERN DER GEGENSEITE (2026-09-17).
     *
     * Klaus' erste Schicht mit dem Sende-Prüfer-Auftrag starb nach fünf
     * Aufrufen und 1,67 € an einem `{"type":"api_error","message":"Internal
     * server error"}` — ein Fehler des Anbieters, nicht unserer. Das SDK
     * wiederholt einen abgewiesenen Aufruf zwar selbst, aber nicht einen, der
     * MITTEN IM STROM stirbt (der Fehler kommt dann als Ereignis im Strom, und
     * das SDK wirft ihn durch). Für die Werkstatt hiess das: eine Schicht, in
     * der schon vier Rollen bezahlt waren, war weg — für einen Fehler, der
     * fünf Sekunden später nicht mehr da gewesen wäre.
     *
     * `versuche` sind ZUSÄTZLICHE Anläufe je Aufruf, `wartenMs` die Pausen
     * davor. Gewartet wird wirklich; eine Probe reicht `[0, 0]` herein.
     * Wiederholt wird NUR, was `istVoruebergehend()` als vorübergehend
     * erkennt — ein 400, ein 401, ein gezogener Notaus werden nie wiederholt:
     * ein 400 kommt beim zweiten Mal genauso, und ein Notaus IST die Absicht.
     */
    this.wiederholung = { versuche: 2, wartenMs: [5000, 20000], ...(wiederholung || {}) };
    /*
     * `=== undefined`, NICHT `??` — und das ist kein Geschmack, daran hängt Geld.
     *
     * Ein Vorgabewert in der Signatur greift NUR bei `undefined`. `lauf.mjs`
     * übergibt für einen Gast ausdrücklich `basisUrl: gast.basisUrl || null`,
     * also oft `null`. Mit `??` fiele dieser Gast auf Klaus' eigene
     * Umgebungsvariable zurück und liefe über dessen Anbieter, ohne dass es
     * irgendwo stünde. So bleibt es Zeichen für Zeichen das alte Verhalten,
     * nur ohne `process` in der Signatur.
     */
    this.schluessel = schluessel === undefined ? ausUmgebung("ANTHROPIC_API_KEY") : schluessel;
    this.maxTokens = maxTokens;
    this.basisUrl = basisUrl === undefined
      ? (ausUmgebung("ANTHROPIC_BASE_URL") || null) : basisUrl;
    /*
     * ══ DIE TRANSPORT-NAHT (2026-09-05) ═══════════════════════════════════
     *
     * WO die Anfrage hinausgeht ist von WAS dabei gilt getrennt — dieselbe
     * Naht wie Ablage und Baum vom 2026-09-04, und aus demselben Anlass:
     * die Schicht soll im Browser laufen.
     *
     * Dort geht der Weg unten NICHT. `await import("@anthropic-ai/sdk")` holt
     * ein npm-Paket; ohne Bauschritt gibt es das im Browser nicht, und ein CDN
     * ist netzweit verboten (offline-first, `PWA-Toolpoint/CLAUDE.md`
     * § Disziplin). Die naheliegende Abhilfe wäre eine zweite `frage()`
     * gewesen, die mit `fetch` dasselbe tut — und das wäre eine Drift-Quelle
     * mit Ansage: dann zählte der Browser Token anders als die Kommandozeile,
     * bräche bei `max_tokens` anders ab und deckelte Werkzeug-Runden anders.
     *
     * Deshalb bleibt ALLES, was gilt, hier an einer Stelle — der Aufbau der
     * Anfrage, die Runden-Schleife, der Deckel, die Token-Summe, jede
     * Fehlermeldung. Hinausgereicht wird nur der Bote:
     *
     *     transport = { erzeuge(bitte) -> antwort, zaehle(bitte) -> zahl }
     *
     * ⚠ DER VORGABEWERT BINDET NICHTS AN NODE. Das SDK wird erst beim ersten
     * Aufruf geholt (`await import` im Rumpf, kein statischer Import) — genau
     * deshalb steht `api.mjs` seit dem 2026-09-04 in `OHNE_NODE`, und genau
     * deshalb darf es hier stehen bleiben. `tests/smoke_ohne_node.mjs` misst
     * das über den Import-Graphen, nicht über eine Textsuche.
     */
    this._transportRein = transport;
    this._client = null;
    /*
     * ⚡ WELCHE KASSE — `api` oder `abo` (2026-09-17, Bauschritt 2).
     *
     * Derselbe Aufruf, dieselbe Politik, zwei Geldquellen: `api` zieht
     * Guthaben, `abo` zieht aus Klaus' Claude-Kontingent über `claude -p`.
     * Die Wahl steht HIER und nicht in `lauf.mjs`, damit jeder Aufrufer
     * denselben Weg nimmt — auch die Proben und `probe-cli.mjs`.
     *
     * ⚠ EIN UNBEKANNTER ZUGANG BRICHT AB. Ein stillschweigender Rückfall auf
     * `api` wäre der teuerste denkbare Fehler dieser Datei: wer `abo`
     * tippfehlerhaft schreibt, bekäme eine Rechnung statt eines Gratislaufs,
     * und die Fahrt sähe im Buch aus wie gewollt. Dieselbe Strenge wie bei
     * `KANN`.
     */
    if (!ZUGAENGE.includes(zugang)) throw new Error(
      `Unbekannter Zugang "${zugang}". Bekannt: ${ZUGAENGE.join(", ")}. ` +
      `Lieber abbrechen als auf die falsche Kasse zurückfallen — ein ` +
      `Tippfehler würde hier Geld kosten statt keines.`);
    this.zugang = zugang;
    this.cli = cli;
  }

  /** Der Bote. Hineingereicht, oder — je Zugang — die CLI bzw. das SDK. */
  async _hol() {
    if (this._transportRein) return this._transportRein;
    if (this._client) return this._client;
    /*
     * ⚠ DER CLI-BOTE WIRD ERST HIER GEHOLT, und das ist kein Stil, sondern
     * eine Bedingung: `transport-cli.mjs` importiert `node:child_process`.
     * Stünde der Import oben, fiele `api.mjs` aus `OHNE_NODE` — und damit
     * wäre die ganze Schicht wieder an Node gebunden, obwohl sie seit dem
     * 2026-09-04 im Browser läuft. `tests/smoke_ohne_node.mjs` misst das über
     * den Import-Graphen; ein `await import` im Rumpf sieht er nicht, genau
     * wie beim SDK eine Zeile weiter unten.
     */
    if (this.zugang === "abo") {
      const { cliTransport } = await import("./transport-cli.mjs");
      this._client = cliTransport({ ...(this.cli || {}) });
      return this._client;
    }
    // Erst hier geladen: `npm test` und die Trockenschicht sollen laufen, ohne
    // dass das SDK installiert oder ein Schluessel gesetzt ist.
    let Anthropic;
    try {
      ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
    } catch (e) {
      throw new Error("Das Anthropic-SDK fehlt. Für eine ECHTE Schicht einmalig:\n" +
        "    npm install @anthropic-ai/sdk\n" +
        "Für die Trockenschicht wird es nicht gebraucht — deshalb steht es nicht " +
        "in den Abhängigkeiten.");
    }
    if (!this.schluessel)
      throw new Error("Kein ANTHROPIC_API_KEY gesetzt. Der Schlüssel gehört auf den " +
        "Server (Umgebungsvariable), niemals ins Repo.");
    const roh = new Anthropic(this.basisUrl
      ? { apiKey: this.schluessel, baseURL: this.basisUrl }
      : { apiKey: this.schluessel });
    this._client = boteAusSdk(roh);
    return this._client;
  }

  /*
   * ZÄHLT, OHNE ZU ERZEUGEN. `count_tokens` ist ein eigener Weg der API: er sagt,
   * wie viele Eingabe-Token eine Anfrage HÄTTE, und erzeugt dabei nichts.
   *
   * WOFÜR HIER. Der feste Aufschlag der Werkzeuge — die Beschreibungen, die in
   * JEDER Runde mitreisen — lässt sich aus zwei bezahlten Läufen NICHT ablesen:
   * die Fragen unterscheiden sich, das Werkzeug-Ergebnis kommt mit in die
   * Unterhaltung, und über mehrere Runden wird der Anfang mehrfach gezählt.
   * Eine Differenz aus zwei solchen Läufen sieht wie ein Aufschlag aus und ist
   * keiner. Hier wird stattdessen dieselbe Anfrage einmal mit und einmal ohne
   * `tools` gezählt — der Unterschied IST dann der Aufschlag.
   */
  async zaehleTokens({ modell, system, nachrichten, werkbank = null }) {
    const bote = await this._hol();
    const bitte = { model: modell, system, messages: nachrichten };
    if (werkbank) bitte.tools = werkbank.definitionen;
    return await bote.zaehle(bitte);
  }

  async frage({ modell, aufwand, system, nachrichten, schema, werkbank = null,
                unterlagen = null, weiter = null, maxTokens = null }) {
    const kann = KANN[modell];
    if (!kann) throw new Error(`Unbekanntes Modell "${modell}" — lieber abbrechen als raten.`);
    const bote = await this._hol();

    /*
     * ⚠ DER TOKEN-DECKEL GEHÖRT ZUR ROLLE, NICHT ZUR API (2026-09-07).
     *
     * Eine Zahl für alle acht ist für die eine falsch, die wirklich etwas
     * baut. Gemessen an Klaus' Läufen: Emil (opus-5, Aufwand `high`) wurde
     * erst bei 16 000 abgeschnitten, nach der Erhöhung DREIMAL auch bei
     * 32 000 — bei adaptivem Denken zählt das Denken mit, und eine ganze
     * HTML-Datei passte daneben nicht mehr hinein. Die Schicht starb jedes Mal
     * nach der bezahlten Konferenz, ohne eine Zeile zu liefern.
     *
     * Ein höherer Deckel kostet NICHTS von sich aus — bezahlt wird, was
     * erzeugt wird. Er erlaubt nur, dass die Antwort zu Ende geschrieben wird.
     *
     * ⚠ ABER ER KOSTET ETWAS AN DER KASSE, und das ist die Hälfte, die beim
     * ersten Mal fehlte: die Anlaufprüfung rechnet mit dem, was ein Aufruf
     * kosten KANN. 48 000 Token auf Opus sind 1,20 $, die alte Pauschale stand
     * bei 0,25 $. Wer nur diese Zahl erhöht und `kosten.mjs` nicht mitnimmt,
     * lässt die Werkstatt Runden beginnen, die sie nicht bezahlen kann.
     *
     * ⚠ 48 000 für den Bauer ist BEGRÜNDET, NICHT GEMESSEN. Wie viel Emils
     * Denken frisst, weiss auf diesem Gerät niemand; die Zahl liegt deutlich
     * über den 32 000, an denen er dreimal riss, und hält eine Runde mit acht
     * Rollen unter 1,60 $ — also in Reichweite eines Zwei-Euro-Deckels. Sein
     * Aufwand steht dabei auf `medium` statt `high`: er soll ausführen, was
     * die Konferenz beschlossen hat, nicht noch einmal darüber nachdenken.
     * Beides steht in `mitarbeiter.json` je Rolle — eine Stelle, damit die
     * nächste Messung eine Zeile ändert und nicht acht.
     */
    const deckel = Number(maxTokens) > 0 ? Number(maxTokens) : this.maxTokens;

    const bitte = {
      model: modell,
      max_tokens: deckel,
      system,
      output_config: { format: { type: "json_schema", schema } },
    };
    if (kann.effort && aufwand) bitte.output_config.effort = aufwand;
    if (kann.denken) bitte.thinking = { type: kann.denken };
    // ✅ GEMESSEN am 2026-08-23: `tools` und `output_config.format` vertragen
    // sich. Kein 400, ein Werkzeug-Aufruf, und der gelesene Wert deckte sich mit
    // der Datei — `node schicht/probe-api.mjs --werkzeuge`, 0,36 Cent.
    // Hier stand vorher „UNGEPRÜFTE ANNAHME". Das war beim Schreiben wahr; ein
    // Satz, den man stehen lässt, wird durch Stehenlassen zur Unwahrheit mit
    // Datum.
    // ⚠ UND DERSELBE SATZ STAND EINE ZEILE WEITER NOCH EINMAL: „die
    // Fehlermeldung unten bleibt trotzdem — sie kostet nichts". Sie hat am
    // 2026-09-21 gekostet: JEDER 400 mit Werkbank bekam den Werkzeug-Verdacht
    // angehängt, auch der, dessen Wortlaut „Your credit balance is too low"
    // lautete. Die Deutung steht jetzt in `deuteAbweisung`.
    if (werkbank) bitte.tools = werkbank.definitionen;

    // DER VERLAUF WÄCHST. Ohne Werkzeuge ist das genau eine Runde und verhält
    // sich wie vorher; mit Werkzeugen kommen Antwort und Werkzeug-Ergebnis
    // hinten dran, bis das Modell fertig ist.
    /*
     * ══ UNTERLAGEN — eine PDF geht als DOKUMENT hinein, nicht als Text ═══════
     *
     * Klaus 2026-09-06: „über vierzig Minuten für ein PDF-Dokument". Der
     * Dateiwähler las bis dahin jede Datei mit `f.text()`; bei einer PDF kommt
     * dabei kein Satz des Dokuments heraus, sondern Gerüst und Binärrauschen
     * (gemessen: 12 komprimierte Ströme). Acht bezahlte Rollen hätten daran
     * geraten.
     *
     * ⚠ SIE GEHÖREN VOR DEN TEXT. Steht die Frage zuerst, liest das Modell
     * eine Aufgabe zu einem Dokument, das es noch nicht gesehen hat.
     *
     * ⚠ UND SIE REISEN MIT JEDER FRAGE MIT. Das ist der Preis und steht
     * deshalb auch auf der Seite, nicht nur hier: acht Rollen, jede Runde.
     */
    const verlauf = nachrichten.map((n2, i) => {
      if (i !== 0 || !unterlagen || !unterlagen.length) return n2;
      const bloecke = unterlagen.map((u) => ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: u.base64 },
      }));
      /* Der Text kann schon eine Liste sein — dann wird angehängt, nicht
         ersetzt. Sonst verlöre ein späterer Umbau still den Fragetext. */
      const rest = Array.isArray(n2.content)
        ? n2.content : [{ type: "text", text: String(n2.content) }];
      return { ...n2, content: [...bloecke, ...rest] };
    });
    // JEDE Runde ist bezahlt. Würde nur die letzte `usage` zurückgegeben,
    // meldete das Fahrtenbuch zu wenig — und eine zu niedrige Zahl sieht genauso
    // aus wie eine gemessene. Deshalb wird summiert, nicht überschrieben.
    const summe = { input_tokens: 0, output_tokens: 0 };
    /*
     * WAS DIE GEGENSEITE SELBST ALS PREIS MELDET — und wie oft sie schwieg.
     *
     * Die API meldet keinen Preis; `claude -p` tut es (`total_cost_usd`). Beim
     * Abo ist das die einzige ehrliche Geld-Zahl, denn gebucht wird nichts.
     *
     * ⚠ ZWEI ZAHLEN, WEIL EINE NICHT REICHT. `gemeldetUsd` allein wäre bei
     * einer schweigenden Runde stillschweigend zu niedrig — und eine zu
     * niedrige Zahl sieht genauso aus wie eine gemessene. `gemeldetLuecken`
     * sagt, wie viele Runden nichts hergaben; erst bei 0 darf sich das
     * Fahrtenbuch „gemeldet" nennen.
     *
     * ⚠ UND `null` HEISST NICHT GEMELDET, NICHT „NULL DOLLAR". Wer beides als
     * 0 liest, meldet einen Gratislauf, wo nichts gemessen wurde.
     */
    let gemeldetUsd = null, gemeldetLuecken = 0;
    /*
     * DIE ABGERECHNETE EINGABE IST NICHT DIE GRÖSSE DES KONTEXTS.
     *
     * `summe.input_tokens` ist das, was BEZAHLT wird: jede Werkzeug-Runde
     * schickt alles Vorherige noch einmal mit, der Anfang steckt also mehrfach
     * darin. Als Rechnung richtig, als Maß für „wie viel Text lag vor dem
     * Modell" falsch — und genau diese zwei Zahlen sind am 2026-09-04
     * durcheinandergeraten, als der Agenten-Lauf seine Token meldete.
     *
     * Die LETZTE Runde trägt den ganzen Verlauf: ihre `input_tokens` sind der
     * Kontext am Ende, ohne Doppelzählung. Zwei Zahlen, zwei Fragen.
     */
    let kontextEin = 0;
    let runden = 0, werkzeugRufe = 0, wiederholungen = 0;
    /* Unlesbare Antworten: wie oft neu angefragt, und ihr voller Text. */
    let neuAngefragt = 0;
    const unlesbarRoh = [];

    /*
     * ══ WAS EIN ABGEBROCHENER AUFRUF GEKOSTET HAT, GEHT NICHT VERLOREN ═══
     *
     * ⚠ GEFUNDEN AM 2026-09-18 AN KLAUS' FAHRT 9, und die Lücke war da, seit
     * es diese Schleife gibt. Emil wurde bei 48 000 Token abgeschnitten;
     * `frage()` warf — und `kasse.buchen` in `ruf.mjs` steht HINTER dem
     * Aufruf. Die Meldung sagte wörtlich „der Aufruf ist bezahlt", und das
     * Fahrtenbuch verbuchte **0,02 € in 2 Aufrufen**. Gerechnet aus dem
     * Deckel: rund 1,20 $ Ausgabe standen in keiner Zeile.
     *
     * Das ist die Familie „als hätten sie nie gearbeitet und kein Geld
     * gekostet" zum vierten Mal — und diesmal an VIER Wurfstellen zugleich:
     * Abschneiden, Kassen-Halt mittendrin und die zwei Runden-Deckel. Vier
     * Stellen einzeln zu flicken hiesse, beim fünften Wurf wieder zu
     * vergessen; deshalb sitzt der Fang um die ganze Schleife.
     *
     * ⚠ ANGEHÄNGT WIRD NUR, WAS WIRKLICH HINAUSGING. Ohne die Bedingung
     * bekäme ein Verbindungsfehler VOR der ersten Antwort einen Eintrag über
     * null Token — eine Fahrt zählte damit einen Aufruf, den es nie gab.
     * *Eine zu hohe Zahl ist derselbe Fehler wie eine zu niedrige.*
     *
     * ⚠ UND GEBUCHT WIRD HIER NICHT. Die Politik bleibt bei der Kasse, wie
     * überall in dieser Werkstatt: `api.mjs` sagt, was es gekostet hat,
     * `ruf.mjs` bucht es. Zwei Stellen, die beide über Geld urteilen, liefen
     * auseinander.
     */
    try {

    for (;;) {
      let antwort;
      /* Ein Aufruf, bis zu `versuche` weitere Anläufe bei vorübergehenden
         Fehlern. Jeder Anlauf wird GESAGT — eine stille Wiederholung sähe im
         Fahrtenbuch aus wie ein langsamer Aufruf. Und sie wird gezählt:
         `wiederholungen` reist ins Ruf-Ereignis, damit die Forschung sieht,
         wie oft die Gegenseite gewackelt hat. */
      for (let versuch = 0; ; versuch++) {
        try {
          antwort = await bote.erzeuge({ ...bitte, messages: verlauf });
          break;
        } catch (e) {
          /* Zuerst deuten, dann wiederholen: was die Gegenseite endgültig
             abweist, kommt beim zweiten Anlauf genauso zurück. `null` heisst
             „dazu habe ich nichts zu sagen" — dann greift die Wiederholung
             unverändert. */
          /* ⚠ GEDEUTET WIRD DIE NACHRICHT, NICHT DER FEHLER. Ein frisches
             `new Error(gedeutet)` trägt keinen `status`, kein `error`, keine
             `request_id` — und `smoke_wiederholung` hat genau das gefangen,
             bevor es in einen Commit kam. Der Wortlaut der Gegenseite geht
             nicht verloren: er steht in der Deutung. */
          const gedeutet = deuteAbweisung(e, { werkbank: !!werkbank });
          if (gedeutet) { e.message = gedeutet; throw e; }
          const w = this.wiederholung;
          if (!istVoruebergehend(e) || versuch >= w.versuche) throw e;
          const pause = w.wartenMs[Math.min(versuch, w.wartenMs.length - 1)] ?? 0;
          wiederholungen++;
          console.log(`   ⟳ ${modell}: die Gegenseite hat nicht geantwortet ` +
            `(${String(e.message || e).split("\n")[0].slice(0, 120)}) — ` +
            `Anlauf ${versuch + 2} von ${w.versuche + 1} nach ${Math.round(pause / 1000)} s`);
          await schlafe(pause);
        }
      }
      for (const k of ["input_tokens", "output_tokens"])
        summe[k] += antwort.usage?.[k] || 0;
      kontextEin = antwort.usage?.input_tokens || 0;
      if (typeof antwort.gemeldeteKostenUsd === "number")
        gemeldetUsd = (gemeldetUsd || 0) + antwort.gemeldeteKostenUsd;
      else gemeldetLuecken += 1;

      if (antwort.stop_reason === "max_tokens")
        /* Die Meldung nennt den WIRKLICH benutzten Deckel. Stünde hier weiter
           `this.maxTokens`, schickte sie jemanden an die falsche Stelle —
           eine Auskunft, die in die falsche Richtung zeigt, ist teurer als
           gar keine. */
        throw new Error(`${modell} wurde bei ${deckel} Token abgeschnitten — ` +
          `die Antwort ist unvollständig. Bei Opus 5 zählt das Denken mit. ` +
          `Abhilfe: "maxTokens" der Rolle in schicht/mitarbeiter.json erhöhen ` +
          `oder ihren Aufwand senken. ` +
          `Der Aufruf ist bezahlt, das Ergebnis unbrauchbar; deshalb steht das hier ` +
          `im Klartext statt als „konnte nicht gelesen werden".`);

      /*
       * ══ DIE BREMSE GILT AUCH INNERHALB EINES AUFRUFS ═══════════════════
       *
       * ⚠ SIE FEHLTE, UND KLAUS IST IN DIE LÜCKE GELAUFEN (2026-09-07): eine
       * Schicht mit DREI EURO Deckel und zwei Stunden Laufzeit stand nach
       * SIEBEN Stunden immer noch auf „läuft". Beide Grenzen waren gesetzt,
       * beide griffen nicht — sie werden in `ruf.mjs` gefragt, also ZWISCHEN
       * den Rollen. Diese Schleife hier lief dazwischen ungebremst.
       *
       * Gefragt wird VOR jeder weiteren Runde, nie nach einer fertigen
       * Antwort: eine bezahlte Antwort wegzuwerfen wäre die teuerste Art,
       * einen Deckel einzuhalten.
       *
       * Die Politik bleibt bei der Kasse — hier wird nur gefragt.
       */
      const nochWeiter = () => {
        if (!weiter) return;
        const halt = weiter({ runde: runden, usage: { ...summe } });
        if (!halt) return;
        const fehler = new Error(
          `Mitten im Aufruf angehalten (${halt.grund || "grund unbekannt"}): ` +
          `${halt.text || ""} Der Aufruf war nach ${runden} Runde(n) noch nicht fertig; ` +
          `was bis hierher hinausging, ist bezahlt.`);
        fehler.mittendrin = true;
        fehler.grund = halt.grund || null;
        throw fehler;
      };

      // Ein Server-Werkzeug hat seine Runde voll. Anhängen und weiterreichen —
      // sonst endet der Lauf still mit einer halben Antwort. Steht so in der
      // SDK-Doku; ohne diesen Zweig ist es ein stummer Abbruch, kein Fehler.
      if (antwort.stop_reason === "pause_turn") {
        /*
         * ⚠ UND ER ZÄHLT MIT. Bis zum 2026-09-07 stand hier ein nacktes
         * `continue` ohne Zähler — eine Schleife ohne Obergrenze, in der jede
         * Runde bezahlt wird. `tool_use` daneben hatte seinen Deckel seit
         * jeher; dieser Zweig hatte gar keinen, und die beiden sehen sich so
         * ähnlich, dass es niemandem auffiel.
         *
         * **Ein `continue`, das keinen Zähler erhöht, ist eine Endlosschleife
         * mit Rechnung.**
         */
        if (++runden > MAX_RUNDEN)
          throw new Error(
            `${modell} pausiert seit ${MAX_RUNDEN} Runden für Server-Werkzeuge, ohne ` +
            `fertig zu werden. Abgebrochen — jede Runde ist bezahlt.`);
        nochWeiter();
        verlauf.push({ role: "assistant", content: antwort.content });
        continue;
      }

      if (werkbank && antwort.stop_reason === "tool_use") {
        if (++runden > MAX_RUNDEN)
          throw new Error(
            `${modell} greift seit ${MAX_RUNDEN} Runden zu Werkzeugen, ohne fertig ` +
            `zu werden. Abgebrochen — jede Runde ist bezahlt. Bisher ` +
            `${werkzeugRufe} Werkzeug-Aufrufe.` +
            werkzeugSpurText(werkbank.gerufen, werkzeugRufe));
        nochWeiter();
        verlauf.push({ role: "assistant", content: antwort.content });
        // ALLE Ergebnisse in EINE Nachricht. Auf mehrere verteilt lernt das
        // Modell ab, parallel zu greifen — steht so in der SDK-Doku.
        const ergebnisse = [];
        for (const block of antwort.content) {
          if (block.type !== "tool_use") continue;
          werkzeugRufe++;
          ergebnisse.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: await werkbank.fuehreAus(block.name, block.input || {}),
          });
        }
        verlauf.push({ role: "user", content: ergebnisse });
        continue;
      }

      /* ⚠ GEHEILT WIRD GEMELDET, NICHT VERSCHWIEGEN. `geheilt` reist wie
         `wiederholungen` ins Ruf-Ereignis; ohne das wäre ein Eingriff am
         Inhalt einer bezahlten Antwort unsichtbar. */
      let gelesen;
      try { gelesen = leseInhaltMitBefund(antwort, modell); }
      catch (e) {
        if (!e.unlesbar) throw e;
        unlesbarRoh.push(e.roh);
        /*
         * ⚠ EINMAL NEU ANFRAGEN, NICHT ÖFTER (Klaus 2026-10-01). Am 21.09.
         * waren 7 von 49 Abo-Antworten unlesbar — bei Hunderten Aufrufen
         * über Tage stirbt sonst jede längere Fahrt daran. Dieselbe Frage
         * geht noch einmal hinaus (der Verlauf ist unverändert: die
         * unlesbare Antwort wird NICHT angehängt). Ist auch die zweite
         * unlesbar, wird abgebrochen wie bisher.
         *
         * ⚠ ES WIRD GESAGT UND GEZÄHLT. `neuAngefragt` reist ins
         * Ruf-Ereignis: eine neu angefragte Antwort ist eine zweite
         * Messung, und die vier Versuchsarme dürfen das nicht verdeckt
         * ungleich tragen. Die Bremse wird vorher gefragt — der neue
         * Aufruf kostet.
         */
        if (neuAngefragt >= 1) throw e;
        nochWeiter();
        neuAngefragt++;
        console.log(`   ⟲ ${modell}: die Antwort war nicht lesbar (${e.roh.length} Zeichen) — ` +
          `dieselbe Frage geht EINMAL neu hinaus.`);
        continue;
      }
      if (gelesen.geheilt)
        console.log(`   ⌁ ${modell}: die Antwort war nicht lesbar und wurde an den ` +
          `Zitat-Zeichen geheilt (nur Zeichen getauscht, nichts eingefügt).`);
      return { inhalt: gelesen.inhalt, geheilt: gelesen.geheilt, usage: summe,
               stop: antwort.stop_reason, werkzeugRufe, kontextEin,
               gemeldetUsd, gemeldetLuecken, zugang: this.zugang, wiederholungen,
               neuAngefragt, unlesbarRoh };
    }

    } catch (fehler) {
      if (summe.input_tokens > 0 || summe.output_tokens > 0) {
        fehler.usage = { ...summe };
        fehler.kontextEin = kontextEin;
        fehler.gemeldetUsd = gemeldetUsd;
        fehler.gemeldetLuecken = gemeldetLuecken;
        fehler.zugang = this.zugang;
        fehler.werkzeugRufe = werkzeugRufe;
        fehler.wiederholungen = wiederholungen;
        fehler.neuAngefragt = neuAngefragt;
      }
      /* Der Rohtext unabhängig von den Token: er ist die Auskunft. */
      if (unlesbarRoh.length) fehler.unlesbarRoh = unlesbarRoh;
      throw fehler;
    }
  }
}

/**
 * Antwortet aus hinterlegten Beispielen. Meldet erfundene, aber plausible
 * `usage`-Zahlen, damit die Bremse auch trocken etwas zu rechnen hat — sonst
 * liefe die Kosten-Prüfung im Testlauf gegen lauter Nullen und bewiese nichts.
 */
export class TrockenApi {
  art = "trocken";

  constructor(antworten = {}, { tokenJeAufruf = { input_tokens: 2000, output_tokens: 800 } } = {}) {
    this.antworten = antworten;
    this.tokenJeAufruf = tokenJeAufruf;
    this.aufrufe = [];
  }

  async frage({ modell, rolle, runde = 0, schema_name, system, nachrichten, werkbank = null }) {
    // Die Frage wird MITGESCHRIEBEN. Ohne sie liesse sich nicht pruefen, ob die
    // Befunde des Negativbauers wirklich beim Bauer ankommen — die hinterlegte
    // Antwort kommt ja ohnehin. Eine Trockenschicht, die den Prompt wegwirft,
    // beweist die Reihenfolge und sonst nichts.
    this.aufrufe.push({ modell, rolle, runde, schema: schema_name,
      system, frage: nachrichten?.[0]?.content || "" });
    // Gesucht wird vom Genauen zum Allgemeinen: erst „schema:rolle" (Emil in der
    // Konferenz), dann „schema" (alle gleich), dann die blosse Rolle (Emil baut).
    const schluessel = schema_name && schema_name !== rolle
      ? [`${schema_name}:${rolle}`, schema_name] : [rolle];
    const gefunden = schluessel.find((k) => this.antworten[k] !== undefined);
    if (!gefunden)
      throw new Error(`Keine Beispiel-Antwort hinterlegt für ${schluessel.join(" / ")}.`);
    const vorrat = this.antworten[gefunden];
    /*
     * WERKZEUGE, TROCKEN. Eine hinterlegte Antwort darf sagen, dass sie vorher
     * etwas nachgesehen hätte: `{ __werkzeug: [{name, eingabe}], dann: {...} }`.
     * Die Werkzeuge laufen dann WIRKLICH — sie lesen ja nur — und erst danach
     * kommt der hinterlegte Inhalt.
     *
     * Das ist kein Beiwerk. Ohne diesen Zweig liesse sich der ganze
     * Werkzeug-Weg nur mit einem bezahlten Aufruf prüfen, und dann prüft ihn
     * niemand. So fällt eine Probe um, wenn der Riegel bricht — für null Cent.
     */
    if (vorrat && !Array.isArray(vorrat) && vorrat.__werkzeug) {
      if (!werkbank)
        throw new Error(`Die hinterlegte Antwort für ${gefunden} will Werkzeuge ` +
          `benutzen, aber diese Schicht hat keine Werkbank.`);
      for (const w of vorrat.__werkzeug)
        this.aufrufe.push({ modell, rolle, runde, werkzeug: w.name,
          ergebnis: await werkbank.fuehreAus(w.name, w.eingabe || {}) });
      return { inhalt: JSON.parse(JSON.stringify(vorrat.dann)),
               usage: { ...this.tokenJeAufruf }, stop: "end_turn",
               kontextEin: this.tokenJeAufruf.input_tokens,
               werkzeugRufe: vorrat.__werkzeug.length };
    }
    // Runden zählen ab 1 (Bauer/Arzt/Negativbauer); Ingenieur und Beobachter
    // laufen ohne Runde und kommen mit 0 herein. Beide sollen den ERSTEN Eintrag
    // bekommen — deshalb erst auf 0 herunterziehen, dann klemmen. Ohne das
    // bekäme die erste Bauer-Runde den zweiten Entwurf, und die Trockenschicht
    // bewiese eine Reihenfolge, die es so nie gibt.
    /* ⚠ EINE FEHLENDE RUNDE WIRD BENANNT, NICHT GERATEN (2026-09-05).
       Beim Einhängen der drei neuen Rollen habe ich `runde` bei zwei Aufrufen
       vergessen. Jede Runde bekam dadurch stumm die ERSTE Antwort — und die
       sagt bei Absicht „noch nicht fertig". Die Schicht lief bis zum
       Rundendeckel, ohne dass irgendetwas kaputt war, und meldete am Ende
       „noch nicht fertig · 4 Runden · Urteil: taugt". Ein Widerspruch, den man
       lesen musste, um ihn zu sehen.

       Eine Liste von Antworten IST eine Aussage über den Ablauf: „in Runde 1
       so, in Runde 2 anders". Wer sie ohne Runde abruft, fragt etwas anderes,
       als er glaubt. Vergessen und Absicht sehen sonst gleich aus. */
    if (Array.isArray(vorrat) && vorrat.length > 1 && !(runde >= 1)) {
      throw new Error(
        `Für „${gefunden}" sind ${vorrat.length} Antworten hinterlegt, eine je Runde — ` +
        `aber der Aufruf gibt keine Runde mit. Reich „runde" durch, sonst bekommt ` +
        `jede Runde stumm die erste.`);
    }
    const i = Math.min(Math.max(0, (runde || 0) - 1), (vorrat.length || 1) - 1);
    const inhalt = Array.isArray(vorrat) ? vorrat[i] : vorrat;
    return { inhalt: JSON.parse(JSON.stringify(inhalt)),
             usage: { ...this.tokenJeAufruf }, stop: "end_turn",
             kontextEin: this.tokenJeAufruf.input_tokens };
  }
}
