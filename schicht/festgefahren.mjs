/*
 * festgefahren.mjs — wann eine Schicht sich im Kreis dreht, und was sie dann
 * kostet. Reine Rechnung: kein `node:fs`, kein Aufruf, kein Browser.
 *
 * Klaus 2026-09-21: „Kann man für den Fall, dass sowohl Vera als auch Sten
 * keine Antwort finden … dass noch einmal eine Sitzung einberufen wird und noch
 * einmal alle Agenten angefragt werden … um dann wieder einen gemeinsamen
 * Konsens zu finden nach einer Abstimmung."
 *
 * ⚠ SIE STEHT HIER UND NICHT IN `schicht.mjs`, WEIL SIE SONST NICHT EINZELN ZU
 * FRAGEN WÄRE. In der Schleife wäre sie nur über einen ganzen Lauf erreichbar,
 * und ein Gegenprobe-Fall müsste eine Schicht fahren, um eine Zahl zu prüfen.
 * *Eine Rechnung, die man nicht einzeln fragen kann, kann man auch nicht
 * einzeln gegenprüfen* — dieselbe Naht wie `umfang.mjs` und `plan-form.mjs`.
 *
 * ── DIE DREI SACHEN, AN DENEN ALLES HÄNGT ────────────────────────────────
 *
 * EIN BLOCKER ist ein Grund, aus dem eine Runde NICHT fertig wurde. Er kommt
 * aus genau den drei Sachen, an denen `fertig` in `schicht.mjs` hängt: dem
 * Urteil des Arztes, den schweren Befunden, und daran, ob der Nutzer
 * durchkommt.
 *
 * ⚠ UND `fertig` WIRD SEITDEM AUS DIESER LISTE GERECHNET, NICHT DANEBEN.
 * Stünden beide Rechnungen nebeneinander, liefen sie auseinander — und dann
 * meldete der Notausgang einen Hänger an einer Schicht, die längst fertig ist,
 * oder umgekehrt. Es ist EINE Quelle: fertig heisst „kein Blocker".
 *
 * ── BENANNT IST NICHT DASSELBE WIE BLOCKIEREND ───────────────────────────
 *
 * JEDER Blocker hält `fertig` auf. Nur ein BENANNTER zählt für „festgefahren".
 * Der Unterschied ist der ganze Riegel gegen eine Bremse, die immer feuert:
 *
 *   „nachbessern" ist der GEWÖHNLICHE Zustand einer unfertigen Runde. Ein
 *   Lauf mit r1 nachbessern (Befund A), r2 nachbessern (Befund B), r3 taugt
 *   ist eine Schicht, die ARBEITET — sie findet in jeder Runde etwas anderes.
 *   Zählte „nachbessern" mit, feuerte der Notausgang nach Runde 2 auf genau
 *   diesem gesunden Verlauf. Das ist die Bremse, die immer greift, und eine
 *   Bremse, die immer greift, ist keine.
 *
 *   Ein BENANNTER Blocker sagt dagegen, WAS hängt: dieser eine schwere Befund,
 *   dieser Ablauf, an dem niemand durchkommt, oder ein „verwerfen". Kommt er
 *   nach einem Neubau wieder, hat Emil gebaut und dieselbe Sache steht noch da.
 *
 * ── AB WANN ──────────────────────────────────────────────────────────────
 *
 * `FESTGEFAHREN_AB = 2` heisst: derselbe benannte Blocker in ZWEI
 * aufeinanderfolgenden Runden — er hat einen Neubau überlebt.
 *
 * ⚠ DIE ZAHL IST GERECHNET, NICHT GEMESSEN, und das gehört dazu: eine
 * festgefahrene Schicht gibt es in den Daten NICHT. Fahrt 7 ist am Geld
 * gestorben, nicht an einer Schleife. Gerechnet ist sie aus `maxRunden = 4`:
 * bei 3 könnte der Notausgang frühestens nach Runde 3 feuern und liesse EINE
 * Runde übrig, bei 2 sind es zwei. Und „hat einen Neubau überlebt" ist der
 * kleinste ehrliche Beleg dafür, dass es hängt. *Eine geratene Zahl klingt
 * genau wie eine gemessene* — deshalb steht hier, woher sie kommt.
 *
 * ⚠ BENANNTE GRENZE: GEZÄHLT WIRD AUF TEXT. Zwei Runden können denselben
 * Mangel mit anderen Worten beschreiben, und dann sieht diese Rechnung zwei
 * verschiedene Blocker. Der Notausgang feuert dann NICHT — er meldet zu wenig,
 * nie zu viel. Dieselbe Schwäche hat der Hänger-Melder der Konferenz seit
 * jeher; deshalb wird mit DERSELBEN Normalisierung gezählt (`schluesselTitel`
 * aus `spind.mjs`) und nicht mit einer zweiten.
 */
import { schluesselTitel } from "./spind.mjs";

export const FESTGEFAHREN_AB = 2;

/*
 * WIEVIEL VOM REST EINE ZWEITE KONFERENZ HÖCHSTENS KOSTEN DARF.
 *
 * ⚠ ES IST EIN ANTEIL AM REST, NICHT AM DECKEL — und das ist kein Feinschliff.
 * `ruf.mjs` vergleicht `zusatzDeckel` gegen das BISHER VERBRAUCHTE. Mitten in
 * einer Schicht ist ein Drittel des GANZEN Deckels längst überschritten; ein
 * Notausgang mit dieser Grenze bräche beim ersten Aufruf ab und sähe aus wie
 * ein Fehler. Die Grenze, die hier herauskommt, ist deshalb eine absolute
 * Obergrenze fürs Verbrauchte: `verbraucht + Anteil × frei`.
 *
 * Die Zahl ist dieselbe wie `KONFERENZ_ANTEIL` und aus demselben Grund — eine
 * Beratung darf die Arbeit nicht verreden. Sie steht trotzdem eigens hier, weil
 * sie etwas ANDERES misst; die beiden zusammenzubinden hiesse, zwei Fragen für
 * eine zu halten.
 */
export const NOTAUSGANG_ANTEIL = 1 / 3;

const text = (t, n = 200) =>
  String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * Die Blocker EINER Runde — die Gründe, aus denen sie nicht fertig wurde.
 *
 * Leere Liste heisst fertig. `schicht.mjs` rechnet `fertig` genau so.
 *
 * @param {object}   urteil   was der Arzt gesagt hat (oder null)
 * @param {Array}    befunde  die Befunde des Negativbauers
 * @param {object}   nutzung  was der Nutzer erlebt hat (oder null)
 * @returns {Array<{art:string,schluessel:string,text:string,benannt:boolean}>}
 */
export function blockerDerRunde({ urteil, befunde, nutzung } = {}) {
  const raus = [];

  /* ⚠ KEIN URTEIL IST EIN BLOCKER, ABER KEIN BENANNTER. Vorher stand in der
     Schleife `urteil.urteil === "taugt"` — ohne Urteil warf das. Nicht fertig
     zu sein ist die sichere Richtung; ein Zustand ohne Urteil sagt aber nichts
     darüber, ob der Bauer an einer Sache hängt, und gehört deshalb nicht in
     die Hänger-Zählung. */
  if (!urteil || typeof urteil.urteil !== "string") {
    raus.push({ art: "urteil", schluessel: "urteil:ohne",
                text: "Es liegt kein Urteil vor.", benannt: false });
  } else if (urteil.urteil !== "taugt") {
    raus.push({ art: "urteil", schluessel: `urteil:${schluesselTitel(urteil.urteil)}`,
                text: `Der Arzt urteilt „${text(urteil.urteil, 40)}".`,
                /* „nachbessern" ist der gewöhnliche Zustand einer unfertigen
                   Runde — siehe oben. „verwerfen" ist es nicht. */
                benannt: schluesselTitel(urteil.urteil) !== "nachbessern" });
  }

  for (const b of Array.isArray(befunde) ? befunde : []) {
    if (!b || b.schwere !== "hoch") continue;
    raus.push({ art: "befund", schluessel: `befund:${schluesselTitel(b.was)}`,
                text: text(b.was), benannt: true });
  }

  if (!nutzung) {
    raus.push({ art: "nutzer", schluessel: "nutzer:ohne",
                text: "Der Nutzer war noch nicht dran.", benannt: false });
  } else if (!nutzung.durchgekommen) {
    raus.push({ art: "nutzer", schluessel: "nutzer:durchgekommen",
                text: "Der Nutzer kommt nicht durch.", benannt: true });
  }

  return raus;
}

/**
 * Steckt die Schicht fest? Gerechnet aus den Blockern der gefahrenen Runden.
 *
 * Gezählt wird die längste Kette AUFEINANDERFOLGENDER Runden, in denen
 * derselbe benannte Blocker steht. Aufeinanderfolgend heisst: die Runden-Nummern
 * liegen um eins auseinander — ein Blocker, der verschwindet und wiederkommt,
 * ist etwas anderes als einer, der nie weg war.
 *
 * @param {Array<{runde:number,blocker:Array}>} rundenBlocker in Runden-Reihenfolge
 * @param {number} ab  ab wie vielen Runden in Folge
 */
export function festgefahren(rundenBlocker, { ab = FESTGEFAHREN_AB } = {}) {
  const runden = (Array.isArray(rundenBlocker) ? rundenBlocker : [])
    .filter((r) => r && Number.isFinite(Number(r.runde)))
    .map((r) => ({ runde: Number(r.runde),
                   blocker: (Array.isArray(r.blocker) ? r.blocker : []).filter((b) => b && b.benannt) }))
    .sort((a, b) => a.runde - b.runde);

  /* Je Schlüssel die längste Kette. `laufend` hält die Kette, die gerade
     offen ist; bricht sie ab, bleibt das Maximum stehen. */
  const gesehen = new Map();
  for (const { runde, blocker } of runden) {
    for (const b of blocker) {
      const e = gesehen.get(b.schluessel)
        || { schluessel: b.schluessel, art: b.art, text: b.text,
             male: 0, runden: [], laufend: 0, laufendAb: runde, letzte: null };
      e.laufend = e.letzte === runde - 1 ? e.laufend + 1 : 1;
      if (e.laufend === 1) e.laufendAb = runde;
      e.letzte = runde;
      if (e.laufend > e.male) {
        e.male = e.laufend;
        e.runden = []; for (let r = e.laufendAb; r <= runde; r++) e.runden.push(r);
        e.text = b.text;            // der zuletzt gesehene Wortlaut
      }
      gesehen.set(b.schluessel, e);
    }
  }

  const haenger = [...gesehen.values()]
    .filter((e) => e.male >= ab)
    .map(({ schluessel, art, text: t, male, runden: rr }) =>
      ({ schluessel, art, text: t, male, runden: rr }))
    /* Deterministisch sortiert: längste Kette zuerst, dann die frühere Runde,
       dann der Schlüssel. Eine Reihenfolge nach Zufall wäre eine Auskunft, die
       zweimal anders ausgeht. */
    .sort((a, b) => b.male - a.male || a.runden[0] - b.runden[0]
                    || a.schluessel.localeCompare(b.schluessel));

  return { fest: haenger.length > 0, haenger, geprueft: runden.length, ab };
}

/**
 * DARF EINE ZWEITE KONFERENZ ÜBERHAUPT LOSLAUFEN — und mit welcher Obergrenze?
 *
 * Zwei Bedingungen, und die zweite ist die wichtigere:
 *
 *   1. Es ist überhaupt noch Geld da (ohne die Rücklage anzutasten).
 *   2. ⚠ NACH der Konferenz muss noch EINE RUNDE bezahlbar sein. Sonst frisst
 *      die Rettung die Schicht, die sie retten soll: beraten, einen neuen Weg
 *      finden — und ihn nicht mehr bauen können. Das wäre der teuerste aller
 *      Ausgänge, denn bezahlt ist dann beides und da ist nichts.
 *
 * @param {object} kasse             die Kasse der laufenden Schicht
 * @param {number} rundeSchaetzungUsd  was EINE weitere Runde schätzungsweise kostet
 * @param {number} anteil            wieviel vom Rest die Konferenz nehmen darf
 * @returns {{ok:boolean,grund:string,text:string,deckelEur:number,freiEur:number}}
 */
export function bezahlbar({ kasse, rundeSchaetzungUsd = 0, anteil = NOTAUSGANG_ANTEIL } = {}) {
  const jeEuro = kasse.usdJeEuro || 1;
  const freiUsd = kasse.freiUsd();
  const freiEur = freiUsd / jeEuro;
  const verbrauchtEur = kasse.verbrauchtEur();
  const eur = (u) => u / jeEuro;

  /* Die absolute Obergrenze fürs Verbrauchte, die `ruf.mjs` als `zusatzDeckel`
     erwartet — nicht der Betrag, den die Konferenz ausgeben darf. */
  const budgetUsd = freiUsd * anteil;
  const deckelEur = verbrauchtEur + eur(budgetUsd);

  if (freiUsd <= 0)
    return { ok: false, grund: "geld", deckelEur, freiEur,
      text: `Für einen Notausgang ist nichts mehr da (frei: ${freiEur.toFixed(2)} €).` };

  const restNachUsd = freiUsd - budgetUsd;
  if (restNachUsd < rundeSchaetzungUsd)
    return { ok: false, grund: "keine-runde-danach", deckelEur, freiEur,
      text: `Ein Notausgang wäre bezahlbar (${eur(budgetUsd).toFixed(2)} € von ` +
            `${freiEur.toFixed(2)} € frei), aber danach reichte es für keine Runde mehr ` +
            `(${eur(restNachUsd).toFixed(2)} € übrig, eine Runde kostet etwa ` +
            `${eur(rundeSchaetzungUsd).toFixed(2)} €). Beraten und nicht mehr bauen ` +
            `können wäre teurer als weiterzumachen.` };

  return { ok: true, grund: "offen", deckelEur, freiEur,
    text: `Der Notausgang darf bis ${eur(budgetUsd).toFixed(2)} € von ` +
          `${freiEur.toFixed(2)} € frei nehmen; danach bleibt noch ` +
          `${eur(restNachUsd).toFixed(2)} € für mindestens eine Runde.` };
}

/**
 * Was die zweite Konferenz zu sehen bekommt.
 *
 * ⚠ OHNE DIESEN TEXT BERIETE SIE ÜBER ETWAS ANDERES ALS DIE SCHICHT. Die
 * Konferenz am Eingang bekommt `lage` als „was liegt an" — dieselbe Stelle
 * trägt hier den Zwischenstand. Ein zweiter Weg hinein wäre eine zweite
 * Fassung derselben Übergabe.
 *
 * ⚠ DAS PRÜFMERKMAL STEHT DARIN, WIRD ABER NICHT ZUR ABSTIMMUNG GESTELLT. Es
 * ist der Massstab, an dem der Arzt misst; wer ihn verschiebt, verschiebt das
 * Urteil mit (dieselbe Tafel, die Ben verbietet, ihn anzufassen). Hält die
 * Runde ihn für den eigentlichen Blocker, sagt sie das — und DAS geht an Klaus.
 */
export function lageText({ auftrag, spec, artefakt, urteil, befunde, nutzung,
                           haenger = [], runde = 0, maxRunden = 0 } = {}) {
  const z = [];
  z.push(`Die Schicht steckt fest. Das ist keine Ideen-Konferenz — es wird nicht ` +
         `gesucht, was als Nächstes gebaut wird, sondern wie DIESE Sache hier ` +
         `weitergeht.`);
  z.push("");
  z.push(`AUFTRAG: ${text(auftrag?.ziel, 600)}`);
  z.push(`PRÜFMERKMAL: ${text(auftrag?.pruefmerkmal, 600)}`);
  z.push(`⚠ Das Prüfmerkmal steht NICHT zur Abstimmung. Es ist der Maßstab, an dem ` +
         `geprüft wird. Haltet ihr es für den eigentlichen Grund, aus dem es nicht ` +
         `weitergeht, dann sagt das — es geht dann an den Betreiber, nicht in eine ` +
         `weitere Runde.`);
  if (spec?.name || spec?.beschreibung) {
    z.push("");
    z.push(`GEBAUT WERDEN SOLL: ${text(spec.name, 120)} — ${text(spec.beschreibung, 400)}`);
  }
  z.push("");
  z.push(`STAND: Runde ${runde} von ${maxRunden}.`);
  if (artefakt?.dateiname) {
    const weitere = Array.isArray(artefakt.weitere) ? artefakt.weitere : [];
    z.push(`Zuletzt gebaut: ${text(artefakt.dateiname, 120)}` +
      (weitere.length ? ` und ${weitere.length} weitere Datei(en)` : "") +
      ` (${(artefakt.inhalt || "").length} Zeichen).`);
  } else {
    z.push(`Gebaut wurde bisher nichts.`);
  }
  if (urteil?.urteil)
    z.push(`Der Arzt urteilt „${text(urteil.urteil, 40)}": ${text(urteil.begruendung, 400)}`);
  const schwer = (Array.isArray(befunde) ? befunde : []).filter((b) => b && b.schwere === "hoch");
  if (schwer.length) {
    z.push("");
    z.push(`SCHWERE BEFUNDE (${schwer.length}):`);
    for (const b of schwer) z.push(`  - ${text(b.was)}${b.fall ? ` — Fall: ${text(b.fall)}` : ""}`);
  }
  if (nutzung && !nutzung.durchgekommen) {
    const h = Array.isArray(nutzung.haengengeblieben) ? nutzung.haengengeblieben : [];
    z.push("");
    z.push(`DER NUTZER KOMMT NICHT DURCH${h.length ? ` (${h.length} Stelle(n))` : ""}:`);
    for (const x of h.slice(0, 5)) z.push(`  - ${text(x.was || x)}`);
  }
  if (haenger.length) {
    z.push("");
    /* Die Zahl ist GEZÄHLT, nicht geschätzt — sie kommt aus `festgefahren()`.
       Dieselbe Trennung wie in der Konferenz: dieser Code zählt, die Rolle
       benennt. Eine Rolle kann eine Zahl erfinden, diese Rechnung nicht. */
    z.push(`WAS HÄNGT (gezählt über die Runden, nicht geschätzt):`);
    for (const h of haenger)
      z.push(`  - ${text(h.text)} — steht in Runde ${h.runden.join(" und ")} ` +
             `unverändert da, also über ${h.male} Runden hinweg trotz Neubau.`);
  }
  z.push("");
  z.push(`Bringt jeder EINEN Vorschlag ein, wie es hier weitergeht: was als Nächstes ` +
         `anders gemacht wird, damit genau das aufhört zu hängen.`);
  return z.join("\n");
}
