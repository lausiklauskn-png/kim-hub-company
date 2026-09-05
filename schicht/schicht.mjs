/*
 * schicht.mjs — der Läufer. Eine Schicht, von Hand angestoßen, mit einem Ziel.
 *
 * DIE KETTE. Ingenieur macht aus dem Auftrag eine greifbare Sache. Dann drehen
 * sich Runden: Bauer baut, Arzt prüft gegen das Prüfmerkmal, Negativbauer sucht
 * den konkreten Fall, in dem es kaputtgeht. Beide Befunde gehen in die nächste
 * Bauer-Runde. Am Feierabend schreibt der Beobachter auf, wo es steht.
 *
 * WARUM ZWEI PRÜFER. Nicht für den Durchsatz — für den Widerspruch. Der Arzt
 * fragt „erfüllt es das Prüfmerkmal", der Negativbauer fragt „wo geht es kaputt".
 * Das sind verschiedene Fragen, und eine Kopie derselben Rolle würde nur
 * dasselbe zweimal übersehen.
 *
 * DER SPIND WIRD GELESEN, NICHT GEFRAGT. Im Plan stand, jede Rolle mache zu
 * Schichtbeginn ihren Spind mit einem eigenen Aufruf auf. Das kostet Geld für
 * nichts: der Spind ist eine Datei. Sie wird gelesen und in die Anweisung
 * gehängt — gleiche Wirkung, fünf Aufrufe billiger. Bewusst abgewichen.
 *
 * FEIERABEND VERLIERT NICHTS. Die Schicht endet ZWISCHEN zwei Runden. Was
 * angefangen ist, liegt als Entwurf in der Werkstatt, der Beobachter schreibt
 * den Stand, die nächste Schicht macht dort weiter. Für diesen Bericht ist eine
 * Rücklage zurückgelegt (siehe kosten.mjs) — ohne sie wäre der Deckel eine
 * Falle: das Geld alle UND niemand weiß, wo es weitergeht.
 */
import * as spind from "./spind.mjs";
import { macheRufer } from "./ruf.mjs";

export const LAUF_VERSION = "1.0";
export const ROLLEN_REIHE = ["ingenieur", "bauer", "arzt", "negativbauer", "beobachter"];

const kurz = (t, n = 400) => (t || "").length > n ? t.slice(0, n) + " …" : (t || "");

export async function schicht({
  api, auftrag, mitarbeiter, kasse, spindAblage, grundsaetze: g, aufZwischenstand = null, werkbank = null,
  maxRunden = 4, datum = new Date().toISOString().slice(0, 10), arm = "voll",
} = {}) {
  const wer = Object.fromEntries(mitarbeiter.map((m) => [m.rolle, m]));
  for (const r of ROLLEN_REIHE)
    if (!wer[r]) throw new Error(`Für die Rolle "${r}" ist niemand eingetragen.`);

  // Ob echt oder trocken, steht hier ganz oben — daran hängt, ob das Gedächtnis
  // beschrieben werden darf.
  const art = api?.art === "echt" ? "echt" : "trocken";
  const spinde = Object.fromEntries(
    mitarbeiter.map((m) => [m.rolle, spind.oeffnen(spindAblage, m, { schreiben: art === "echt" })]));

  const events = [];
  const verlauf = [];
  let t = 0;
  const beginn = Date.now();

  // Jedes Ereignis trägt seinen ABSTAND ZUM SCHICHTBEGINN in Millisekunden.
  // `t` bleibt als Reihenfolge daneben, aber wer eine Schicht abspielen oder
  // einen Stau finden will, braucht `ms` — sonst sind alle Schritte gleich
  // lang, und das sähe aus wie eine Messung.
  //
  // Und der Stand wird LAUFEND hinausgereicht, nicht erst am Feierabend. Sonst
  // kann eine Ansicht nur zusehen, was schon vorbei ist.
  const merke = (e) => {
    events.push({ t: t++, ms: Date.now() - beginn, ...e });
    if (aufZwischenstand) try { aufZwischenstand(zwischenstand()); } catch { /* nie den Lauf umwerfen */ }
  };

  // Was eine Ansicht schon WÄHREND der Schicht zeigen kann. Bewusst dieselbe
  // Form wie das Endergebnis, nur unfertig — zwei Formen wären zwei Stellen,
  // an denen eine Anzeige etwas anderes behauptet als die Datei.
  const zwischenstand = () => ({
    laufVersion: LAUF_VERSION, datum, laeuft: true,
    art,   // dieselbe Angabe wie im Endergebnis — nicht zweimal gerechnet
    auftrag: { ziel: auftrag?.ziel, pruefmerkmal: auftrag?.pruefmerkmal || null },
    rollen: ROLLEN_REIHE,
    besetzung: mitarbeiter.map((m) => ({ rolle: m.rolle, name: m.name, modell: m.modell })),
    spec, artefakt, stand: null,
    ergebnis: { fertig, runden: Math.max(0, runde - 1), urteil: urteil?.urteil || null,
                offeneBefunde: befunde.filter((x) => x.schwere === "hoch").length,
                feierabendGrund: null, feierabendText: "" },
    weitergaben, kasse: kasse.bericht(), events,
  });

  const ruf = macheRufer({ api, wer, spinde, kasse, grundsaetze: g, werkbank, arm });
  const weitergaben = [];

  // Vor dem ersten möglichen Abbruch angelegt: der Feierabend-Block liest sie,
  // und er läuft auch dann, wenn schon der erste Aufruf nicht mehr bezahlbar war.
  let artefakt = null, urteil = null, befunde = [], runde = 0, fertig = false, stopp = null;
  let spec = null;

  // ── Ingenieur: aus dem Auftrag wird eine Sache ────────────────────────────
  const i = await ruf("ingenieur", { auftrag });
  if (i.abbruch)
    return abschluss({ grund: i.abbruch, spec: null, artefakt: null });
  spec = i.inhalt;
  merke({ phase: "idee", rolle: "ingenieur", wer: wer.ingenieur.name,
          titel: spec.titel, art: spec.art, pruefmerkmal: spec.pruefmerkmal });
  verlauf.push(`${wer.ingenieur.name} schlägt vor: ${spec.titel} (${spec.art})`);

  // ── Runden: bauen, prüfen, angreifen ─────────────────────────────────────
  for (runde = 1; runde <= maxRunden && !fertig; runde++) {
    // Eine ganze Runde sind drei Aufrufe. Wer nur einen prüft, beginnt Runden,
    // die er nicht zu Ende bringen kann — und bricht dann doch mittendrin ab.
    const genug = kasse.darfNoch(3 * Math.max(kasse.teuersterAufrufUsd, 0.25));
    if (!genug.ok) { stopp = genug; break; }

    const b = await ruf("bauer", { spec, befunde, urteil, runde });
    if (b.abbruch) { stopp = b.abbruch; break; }
    artefakt = b.inhalt;
    merke({ phase: "build", runde, rolle: "bauer", wer: wer.bauer.name,
            dateiname: artefakt.dateiname, zeichen: (artefakt.inhalt || "").length,
            offen: artefakt.offen || [], weitergabe: artefakt.weitergabe || "" });
    if (artefakt.weitergabe)
      weitergaben.push({ runde, von: "bauer", text: artefakt.weitergabe });
    verlauf.push(`${wer.bauer.name} baut ${artefakt.dateiname} (Runde ${runde}, ` +
      `${(artefakt.inhalt || "").length} Zeichen)` +
      (artefakt.offen?.length ? `, offen: ${artefakt.offen.join(" · ")}` : ""));

    const a = await ruf("arzt", { spec, artefakt, runde });
    if (a.abbruch) { stopp = a.abbruch; break; }
    urteil = a.inhalt;
    merke({ phase: "urteil", runde, rolle: "arzt", wer: wer.arzt.name,
            urteil: urteil.urteil, begruendung: urteil.begruendung,
            fehlende: urteil.fehlende || [], weitergabe: urteil.weitergabe || "" });
    if (urteil.weitergabe)
      weitergaben.push({ runde, von: "arzt", text: urteil.weitergabe });
    verlauf.push(`${wer.arzt.name} urteilt „${urteil.urteil}": ${kurz(urteil.begruendung, 160)}`);

    const n = await ruf("negativbauer", { spec, artefakt, runde });
    if (n.abbruch) { stopp = n.abbruch; break; }
    befunde = n.inhalt.befunde || [];
    merke({ phase: "befund", runde, rolle: "negativbauer", wer: wer.negativbauer.name,
            anzahl: befunde.length, befunde });
    verlauf.push(befunde.length
      ? `${wer.negativbauer.name} findet ${befunde.length} Schwäche(n), davon ` +
        `${befunde.filter((x) => x.schwere === "hoch").length} schwer`
      : `${wer.negativbauer.name} findet nichts`);

    // Fertig ist es nur, wenn BEIDE zufrieden sind. Ein „taugt" neben einem
    // schweren Befund wäre genau das Grün, das keins ist.
    fertig = urteil.urteil === "taugt" && !befunde.some((x) => x.schwere === "hoch");
  }

  return abschluss({ grund: stopp, spec, artefakt });

  // ── Feierabend ───────────────────────────────────────────────────────────
  async function abschluss({ grund, spec, artefakt }) {
    const k = kasse.bericht();
    let stand = null;
    // Der Beobachter darf die Rücklage antasten — dafür ist sie da.
    const bb = await ruf("beobachter", { verlauf, kasse: k }, { reserveAntasten: true });
    if (!bb.abbruch) {
      stand = bb.inhalt;
      merke({ phase: "feierabend", rolle: "beobachter", wer: wer.beobachter.name,
              stand: stand.stand, naechsterSchritt: stand.naechsterSchritt });
    }

    // BEFUND 2026-08-20, im ersten echten Lauf: die Trockenschicht hatte ihren
    // Merkkarten-Vorgang in die Spinde geschrieben — mit dem Vermerk „Trockenlauf,
    // keine echte Arbeit". Jonas hat trotzdem darauf aufgebaut und in einer echten
    // Konferenz mit einem Werkstück argumentiert, das es nie gegeben hat.
    //
    // Ein Vermerk reicht also nicht. Eine Trockenschicht schreibt GAR NICHT ins
    // Gedächtnis — sie liest nur. Das ist der Unterschied zwischen einer Übung
    // und einer Erinnerung an eine Übung.
    for (const m of (art === "echt" ? mitarbeiter : [])) {
      const meins = verlauf.filter((z) => z.startsWith(m.name)).join("\n") || "(nichts in dieser Schicht)";
      spind.schliessen(spindAblage, m,
        // Kein Trockenlauf-Vermerk mehr: die Schleife läuft ausschließlich für
        // echte Schichten. Ein Vermerk, den es nie geben kann, legte nahe, dass
        // Trockenläufe hier noch schreiben — und genau das war der Fehler.
        `# Letzte Schicht — ${datum}\n\n${meins}\n\n` +
        (stand ? `## Stand der Werkstatt\n\n${stand.stand}\n\n` +
                 `Nächster Schritt: ${stand.naechsterSchritt}\n` : ""));
    }

    return {
      laufVersion: LAUF_VERSION,
      datum,
      laeuft: false,
      dauerMs: Date.now() - beginn,
      art: api?.art === "echt" ? "echt" : "trocken",   // im Zweifel trocken — nie „echt" behaupten
      auftrag: { ziel: auftrag.ziel, pruefmerkmal: auftrag.pruefmerkmal || null },
      rollen: ROLLEN_REIHE,
      besetzung: mitarbeiter.map((m) => ({ rolle: m.rolle, name: m.name, modell: m.modell })),
      spec,
      artefakt,
      ergebnis: {
        fertig,
        runden: Math.max(0, runde - 1),
        urteil: urteil?.urteil || null,
        offeneBefunde: befunde.filter((x) => x.schwere === "hoch").length,
        feierabendGrund: grund ? grund.grund : (fertig ? "fertig" : "runden"),
        feierabendText: grund ? grund.text : "",
      },
      stand,
      // Woran sich über viele Schichten ablesen lässt, ob die Grundsätze etwas
      // bewirken: stehen hier konkrete Sätze oder nur Höflichkeiten?
      /*
       * UNTER WELCHER BEDINGUNG. Ohne diese Angabe steht später eine Zahl da,
       * und niemand weiß, ob sie aus dem vollen oder dem nackten Arm stammt —
       * dann ist die Messung weg, nicht nur unbequem. Bei „nackt" haben die
       * Grundsätze NICHT gegolten, auch wenn die Datei danebenlag; deshalb
       * steht die Zahl darunter dann auf 0.
       */
      arm,
      /* WELCHES GEDÄCHTNIS gegolten hat. Dieselbe Frage wie beim Arm: eine Zahl
         ohne ihre Bedingung ist keine Messung, und das Gelernte aus einem
         früheren Lauf IST eine Bedingung. */
      spindWurzel: String(spindAblage?.wo || ""),
      grundsaetze: arm === "nackt"
        ? { anzahl: 0, fehlt: false, hinweis: `Versuchsarm „nackt": weder Werkstattregeln `
            + `noch Grundsätze haben gegolten. Das Ergebnis ist ein Messwert, kein Werkstück.` }
        : { anzahl: g.anzahl, fehlt: g.fehlt, hinweis: g.hinweis },
      weitergaben,
      kasse: kasse.bericht(),
      events,
    };
  }
}
