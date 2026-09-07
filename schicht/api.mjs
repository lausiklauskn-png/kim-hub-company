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

/**
 * Ein Wert aus der Umgebung, ohne `process` vorauszusetzen. Im Browser gibt es
 * das Global nicht, und ein Zugriff darauf wirft — nicht erst beim Aufruf,
 * sondern schon beim Bauen des Objekts.
 */
function ausUmgebung(name) {
  return typeof process !== "undefined" && process?.env ? process.env[name] : undefined;
}

export const KANN = {
  "claude-opus-5":    { effort: true,  denken: "adaptive" },
  "claude-sonnet-5":  { effort: true,  denken: "adaptive" },
  "claude-haiku-4-5": { effort: false, denken: null },
};

/**
 * Holt das geprüfte Objekt aus der Antwort. Zwei Wege, in dieser Reihenfolge:
 * `parsed_output`, wenn das SDK es gefüllt hat — sonst der erste Textblock, der
 * sich als JSON lesen lässt. Gibt keiner etwas her, wird ABGEBROCHEN und nicht
 * geraten: eine halb verstandene Antwort sieht genauso aus wie eine ganze.
 */
export function leseInhalt(antwort, modell = "?") {
  if (antwort?.parsed_output) return antwort.parsed_output;
  const text = (antwort?.content || [])
    .filter((b) => b?.type === "text").map((b) => b.text).join("").trim();
  if (text) {
    try { return JSON.parse(text); } catch { /* unten abbrechen */ }
    // Manche Modelle legen JSON in einen Code-Zaun. Das ist kein Fehler, nur eine
    // Verpackung — aber sie muss ausdrücklich abgezogen werden, nicht erraten.
    const zaun = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (zaun) { try { return JSON.parse(zaun[1]); } catch { /* unten */ } }
  }
  throw new Error(`${modell} hat nichts geliefert, das zum Schema passt ` +
    `(stop_reason: ${antwort?.stop_reason}). Nicht geraten, abgebrochen.` +
    (text ? `\nAnfang der Antwort: ${text.slice(0, 200)}` : ""));
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
  constructor({ schluessel, maxTokens = 16000, basisUrl, transport = null } = {}) {
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
  }

  /** Der Bote. Hineingereicht, oder das SDK. */
  async _hol() {
    if (this._transportRein) return this._transportRein;
    if (this._client) return this._client;
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
     * baut. Gemessen an Klaus' Lauf: Emil (opus-5, Aufwand `high`) wurde bei
     * 16 000 abgeschnitten — bei adaptivem Denken zählt das Denken mit, und
     * eine ganze HTML-Datei passte daneben nicht mehr hinein. Die Schicht starb
     * nach der bezahlten Konferenz, ohne eine Zeile zu liefern.
     *
     * Ein höherer Deckel kostet NICHTS von sich aus — bezahlt wird, was
     * erzeugt wird. Er erlaubt nur, dass die Antwort zu Ende geschrieben wird.
     *
     * ⚠ 32 000 für den Bauer ist BEGRÜNDET, NICHT GEMESSEN. Wie viel Emils
     * Denken bei `high` wirklich frisst, weiss auf diesem Gerät niemand; die
     * Zahl gibt Denken und Werkstück zusammen Platz und bleibt weit unter dem,
     * was das Modell kann. Sie steht in `mitarbeiter.json` je Rolle — eine
     * Stelle, damit die nächste Messung eine Zeile ändert und nicht acht.
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
    // Datum. Die Fehlermeldung unten bleibt trotzdem — sie kostet nichts und
    // zeigt beim nächsten 400 sofort in die richtige Richtung.
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
    let runden = 0, werkzeugRufe = 0;

    for (;;) {
      let antwort;
      try {
        antwort = await bote.erzeuge({ ...bitte, messages: verlauf });
      } catch (e) {
        if (werkbank && e?.status === 400)
          throw new Error(
            `Der Aufruf mit Werkzeugen wurde abgewiesen (400): ${e.message}\n` +
            `VERDACHT, und er steht als Annahme im Code: erzwungenes JSON ` +
            `(output_config.format) und tools vertragen sich womöglich nicht. ` +
            `Prüfen, bevor irgendwo anders gesucht wird — eine Schicht ohne ` +
            `Werkzeuge (werkbank: null) läuft weiter wie bisher.`);
        throw e;
      }
      for (const k of ["input_tokens", "output_tokens"])
        summe[k] += antwort.usage?.[k] || 0;
      kontextEin = antwort.usage?.input_tokens || 0;

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
            `${werkzeugRufe} Werkzeug-Aufrufe.`);
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

      return { inhalt: leseInhalt(antwort, modell), usage: summe,
               stop: antwort.stop_reason, werkzeugRufe, kontextEin };
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
