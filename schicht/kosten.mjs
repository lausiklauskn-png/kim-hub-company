/*
 * kosten.mjs — die Bremse.
 *
 * WARUM ES DIESE DATEI GIBT. Das Aufgaben-Budget der API (`task_budget`) ist ein
 * HINWEIS an das Modell: es teilt sich seine Kräfte ein. Es wird davon nicht
 * gestoppt. Wer sich darauf verlässt, hat keinen Deckel, sondern eine Bitte.
 * Der harte Riegel steht hier, im eigenen Code, vor jedem Aufruf.
 *
 * WIE GERECHNET WIRD. Nach jedem Aufruf meldet die API in `usage`, was er
 * gekostet hat. Vier Zahlen, drei Preise:
 *
 *   input_tokens                 frische Eingabe          voller Eingangspreis
 *   cache_creation_input_tokens  in den Cache geschrieben  1,25× Eingangspreis
 *   cache_read_input_tokens      aus dem Cache gelesen     0,1×  Eingangspreis
 *   output_tokens                Ausgabe                  Ausgangspreis
 *
 * Die drei Eingangs-Zahlen überschneiden sich NICHT — sie werden addiert, nicht
 * gegeneinander verrechnet.
 *
 * WÄHRUNG. Die Preise stehen in Dollar, Klaus denkt in Euro. Statt einen
 * Wechselkurs zu erfinden, der morgen falsch ist, rechnen wir **einen Dollar wie
 * einen Euro**. Das ist zu viel — und deshalb sicher: der Deckel greift eher zu
 * früh als zu spät. Wer es genauer will, setzt `usdJeEuro` ausdrücklich.
 */

/** Preise in Dollar je 1 Mio. Token (Anthropic-eigene API, Stand 2026-08-20). */
export const PREISE = {
  "claude-opus-5":    { ein: 5.00, aus: 25.00 },
  "claude-sonnet-5":  { ein: 3.00, aus: 15.00 },
  "claude-haiku-4-5": { ein: 1.00, aus: 5.00 },
};

const CACHE_SCHREIBEN = 1.25;   // 5-Minuten-Frist; bei "1h" wären es 2,0
const CACHE_LESEN = 0.10;

/** Was ein einzelner Aufruf gekostet hat, in Dollar. */
export function kostenUsd(modell, usage = {}) {
  const p = PREISE[modell];
  if (!p) throw new Error(`Kein Preis hinterlegt für Modell "${modell}". ` +
    `Bekannt: ${Object.keys(PREISE).join(", ")}. Lieber abbrechen als raten.`);
  const ein  = Number(usage.input_tokens || 0);
  const neu  = Number(usage.cache_creation_input_tokens || 0);
  const alt  = Number(usage.cache_read_input_tokens || 0);
  const aus  = Number(usage.output_tokens || 0);
  return ((ein + neu * CACHE_SCHREIBEN + alt * CACHE_LESEN) * p.ein
          + aus * p.aus) / 1_000_000;
}

/**
 * Die Kasse führt Buch und sagt Halt. Sie kennt zwei Grenzen, und JEDE für sich
 * beendet die Schicht: das Geld und die Uhr.
 *
 * Absichtlich mit einer einspeisbaren Uhr (`jetzt`) gebaut — sonst ließe sich
 * die Zeitgrenze nicht prüfen, ohne zwei Stunden zu warten. Eine Grenze, die man
 * nicht prüfen kann, ist eine Behauptung.
 */
export class Kasse {
  constructor({ deckelEur, laufzeitMs, usdJeEuro = 1, reserveEur = 0,
                jetzt = () => Date.now() } = {}) {
    if (!(deckelEur > 0)) throw new Error("Die Kasse braucht einen Deckel > 0.");
    if (!(laufzeitMs > 0)) throw new Error("Die Kasse braucht eine Laufzeit > 0.");
    if (reserveEur >= deckelEur)
      throw new Error("Die Rücklage darf nicht den ganzen Deckel auffressen.");
    this.reserveUsd = reserveEur * usdJeEuro;
    this.deckelUsd = deckelEur * usdJeEuro;
    this.deckelEur = deckelEur;
    this.usdJeEuro = usdJeEuro;
    this.laufzeitMs = laufzeitMs;
    this.jetzt = jetzt;
    this.beginn = jetzt();
    /*
     * DIE WANDUHR, getrennt von `jetzt`.
     *
     * `jetzt` ist einspritzbar — die Proben schieben eine erfundene Uhr hinein,
     * damit ein Deckel prüfbar ist, ohne zwei Stunden zu warten. Für die KOSTEN
     * ist das richtig. Für einen STUNDENNACHWEIS ist es unbrauchbar: dort muss
     * dastehen, an welchem Tag und zu welcher Uhrzeit gearbeitet wurde.
     *
     * Deshalb zwei Uhren mit zwei Aufgaben. Wer sie zusammenlegte, bekäme
     * entweder eine Probe, die zwei Stunden dauert, oder einen Nachweis, der
     * das Jahr 1970 nennt.
     */
    this.beginnIso = new Date().toISOString();
    this.ausgegebenUsd = 0;
    this.aufrufe = [];
    this.teuersterAufrufUsd = 0;
  }

  /** Nach jedem Aufruf: eintragen, was er gekostet hat. */
  buchen(rolle, modell, usage, { begonnen = null, dauerMs = null, kontextEin = null } = {}) {
    const usd = kostenUsd(modell, usage);
    this.ausgegebenUsd += usd;
    this.teuersterAufrufUsd = Math.max(this.teuersterAufrufUsd, usd);
    this.aufrufe.push({ rolle, modell, usd, usage, begonnen, dauerMs, kontextEin });
    return usd;
  }

  restUsd() { return Math.max(0, this.deckelUsd - this.ausgegebenUsd); }
  /** Der Rest OHNE die Rücklage — das, was die Arbeit noch ausgeben darf. */
  freiUsd() { return Math.max(0, this.restUsd() - this.reserveUsd); }
  restEur() { return this.restUsd() / this.usdJeEuro; }
  verbrauchtEur() { return this.ausgegebenUsd / this.usdJeEuro; }
  verstricheneMs() { return this.jetzt() - this.beginn; }

  /**
   * Darf noch eine Runde? Gefragt wird VOR dem Aufruf, nicht danach.
   *
   * Die RÜCKLAGE bleibt dabei unangetastet. Sie ist der Grund, warum eine
   * Schicht immer noch aufschreiben kann, wo sie stehen geblieben ist. Ohne sie
   * wäre der Deckel eine Falle: das Geld alle UND niemand weiß, wo es weitergeht.
   * `reserveAntasten: true` gibt sie frei — genau einmal, für den Beobachter.
   *
   * Geschätzt wird mit dem TEUERSTEN bisher gesehenen Aufruf, nicht mit dem
   * Durchschnitt. Der Durchschnitt lädt dazu ein, eine Runde zu beginnen, die
   * dann über den Deckel läuft — und ein Deckel, den man überschreiten darf,
   * ist keiner. Solange noch nichts gemessen wurde, gilt `schaetzungUsd`.
   */
  darfNoch(schaetzungUsd = 0.25, { reserveAntasten = false } = {}) {
    if (this.verstricheneMs() >= this.laufzeitMs)
      return { ok: false, grund: "zeit", text: "Die Schicht ist um." };
    // Fuer eine Arbeits-Runde wird mit dem teuersten bisherigen Aufruf gerechnet.
    // Fuer den Feierabend-Bericht NICHT: die Ruecklage ist fuer genau diesen
    // einen, billigen Aufruf bemessen. Mit dem Bauer-Preis gerechnet waere sie
    // nie erreichbar — eine Ruecklage, an die man nicht herankommt, ist keine.
    const noetig = reserveAntasten
      ? Math.min(schaetzungUsd, Math.max(this.reserveUsd, schaetzungUsd))
      : Math.max(this.teuersterAufrufUsd, schaetzungUsd);
    const verfuegbar = reserveAntasten ? this.restUsd() : this.freiUsd();
    if (verfuegbar < noetig)
      return { ok: false, grund: "geld",
        text: `Frei sind noch ${(verfuegbar / this.usdJeEuro).toFixed(2)} € ` +
              `(Rücklage für den Feierabend-Bericht abgezogen) — das reicht für keine weitere Runde ` +
              `(gerechnet mit ${(noetig / this.usdJeEuro).toFixed(2)} €).` };
    return { ok: true, grund: "offen", text: "" };
  }

  /**
   * DARF EIN AUFRUF, DER SCHON LÄUFT, NOCH EINE RUNDE?
   *
   * ⚠ WARUM ES DIESE ZWEITE FRAGE ÜBERHAUPT BRAUCHT (Klaus 2026-09-07, nach
   * sieben Stunden an einer Schicht mit drei Euro Deckel): `darfNoch` wird
   * ZWISCHEN den Rollen gefragt, einmal je Aufruf. Was innerhalb eines Aufrufs
   * passiert — Werkzeug-Runden, `pause_turn`, ein Modell, das nicht fertig wird
   * — lief bis dahin **ohne jede Bremse**. Weder das Geld noch die Uhr konnten
   * dort greifen, und gebucht wird erst, wenn der Aufruf zurückkommt.
   *
   * **Ein Deckel, der einen laufenden Aufruf nicht abschneiden kann, ist für
   * genau den Fall keiner, in dem man ihn braucht.**
   *
   * `laufendUsd` ist, was dieser Aufruf bis hierher gekostet hat — gerechnet
   * aus den echten Token seiner bisherigen Runden, nicht geschätzt. Es ist noch
   * nicht gebucht (das geschieht erst, wenn der Aufruf zurückkommt), muss aber
   * mitgezählt werden: sonst prüft die Bremse gegen einen Stand, der Stunden
   * alt ist.
   *
   * Die RÜCKLAGE bleibt auch hier unangetastet — der Feierabend-Bericht muss
   * noch bezahlbar sein, sonst endet die Schicht ohne die Auskunft, wo sie
   * stehen geblieben ist.
   *
   * @param {number} laufendUsd was der laufende Aufruf bisher gekostet hat
   */
  darfWeiter(laufendUsd = 0) {
    if (this.verstricheneMs() >= this.laufzeitMs)
      return { ok: false, grund: "zeit",
        text: `Die Schicht ist um (${Math.round(this.laufzeitMs / 60000)} Minuten) — ` +
              `mitten in einem Aufruf. Was bis hierher hinausging, ist bezahlt.` };
    const frei = this.freiUsd() - Math.max(0, Number(laufendUsd) || 0);
    if (frei <= 0)
      return { ok: false, grund: "geld",
        text: `Der Deckel ist erreicht — mitten in einem Aufruf. ` +
              `Dieser Aufruf hat bis hierher ${((Number(laufendUsd) || 0) / this.usdJeEuro).toFixed(2)} € ` +
              `gekostet, gebucht waren vorher ${this.verbrauchtEur().toFixed(2)} € ` +
              `von ${this.deckelEur.toFixed(2)} €.` };
    return { ok: true, grund: "offen", text: "" };
  }

  bericht() {
    const min = Math.round(this.verstricheneMs() / 60000);
    return {
      aufrufe: this.aufrufe.length,
      /*
       * WANN die Fahrt lief — für den Stundennachweis, nicht für die Kosten.
       * `minuten` darunter bleibt, was es war (gerundet, aus der einspritzbaren
       * Uhr); diese beiden kommen von der Wanduhr und sind das, woraus das
       * Fahrtenbuch seine Dauer rechnet.
       */
      beginnIso: this.beginnIso,
      endeIso: new Date().toISOString(),
      verbrauchtEur: Number(this.verbrauchtEur().toFixed(4)),
      deckelEur: this.deckelEur,
      restEur: Number(this.restEur().toFixed(4)),
      reserveEur: Number((this.reserveUsd / this.usdJeEuro).toFixed(4)),
      minuten: min,
      laufzeitMinuten: Math.round(this.laufzeitMs / 60000),
      jeRolle: this.aufrufe.reduce((k, a) => {
        k[a.rolle] = Number(((k[a.rolle] || 0) + a.usd / this.usdJeEuro).toFixed(4));
        return k;
      }, {}),
      /*
       * WIE VIEL TEXT — drei Zahlen, drei Fragen. Sie standen bis zum
       * 2026-09-04 in keinem Bericht, obwohl sie in `usage` längst dalagen:
       * der Agenten-Lauf meldete nur Gesamt-Kontext, und wie lang die Antworten
       * einer Rolle wirklich sind, war damit NICHT gemessen.
       *
       *   aus      die AUSGABE. Das saubere Maß: jede Runde erzeugt eigenen
       *            Text, hier wird nichts doppelt gezählt.
       *   ein      die ABGERECHNETE Eingabe, über alle Werkzeug-Runden
       *            summiert. Enthält den Anfang mehrfach — richtig als
       *            Rechnung, falsch als Textmenge.
       *   kontext  der GRÖSSTE Kontext, den diese Rolle in einem Aufruf vor
       *            sich hatte (die letzte Runde trägt den ganzen Verlauf).
       *            Ein Maximum, keine Summe — Kontexte zu addieren ergäbe eine
       *            Zahl, die es nirgends gab.
       *
       * `ein` zählt alle drei Eingabe-Sorten zusammen (frisch, in den Cache
       * geschrieben, aus dem Cache gelesen). Sie überschneiden sich nicht, und
       * bezahlt sind sie alle — nur zu verschiedenen Preisen, und das rechnet
       * `kostenUsd`, nicht diese Zahl.
       */
      tokenJeRolle: this.aufrufe.reduce((k, a) => {
        const u = a.usage || {};
        const e = k[a.rolle] || (k[a.rolle] = { ein: 0, aus: 0, kontext: 0, aufrufe: 0 });
        e.ein += Number(u.input_tokens || 0) + Number(u.cache_creation_input_tokens || 0)
               + Number(u.cache_read_input_tokens || 0);
        e.aus += Number(u.output_tokens || 0);
        e.kontext = Math.max(e.kontext, Number(a.kontextEin || 0));
        e.aufrufe += 1;
        return k;
      }, {}),
      // Wo die ZEIT hingeht — das ist eine andere Frage als, wo das Geld
      // hingeht, und die Antworten fallen auseinander: die billigen Prüfer
      // laufen oft länger als der teure Bauer.
      msJeRolle: this.aufrufe.reduce((k, a) => {
        k[a.rolle] = (k[a.rolle] || 0) + (a.dauerMs || 0); return k;
      }, {}),
      msGesamt: this.aufrufe.reduce((n, a) => n + (a.dauerMs || 0), 0),
    };
  }
}
