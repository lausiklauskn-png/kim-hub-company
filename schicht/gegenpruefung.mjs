/*
 * gegenpruefung.mjs — Vera und Sten sehen sich an, was gebaut wurde.
 *
 * DAS IST DER SCHRITT, DER DEN GANZEN AUFBAU TRÄGT. Wer baut und danach
 * berichtet, schreibt sein eigenes Zeugnis. Hier urteilt jemand, der nicht
 * gebaut hat — gegen das Prüfmerkmal, nicht gegen den Eindruck.
 *
 * Zwei Rollen, ein Durchgang:
 *   Vera (Arzt)         urteilt gegen das Prüfmerkmal: taugt / nachbessern / verwerfen
 *   Sten (Negativbauer) sucht den konkreten Fall, in dem es kaputtgeht
 *   Jonas (Beobachter)  schreibt auf, wo es danach steht
 *
 * KEIN BAUEN. Findet Sten etwas Schweres, geht es an Klaus — nicht in eine
 * dritte Runde. Sonst wäre die Gegenprüfung nur der Anfang einer Schleife, die
 * sich selbst benotet.
 *
 * Der Gegenstand wird UNVERÄNDERT vorgelegt: alle Dateien, wie sie auf der
 * Platte liegen. Wer hier auswählt, prüft seine Auswahl.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";
import * as spind from "./spind.mjs";
import { macheRufer } from "./ruf.mjs";

/** Mehr passt nicht sinnvoll in einen Aufruf — und stillschweigend kürzen gilt nicht. */
export const DECKEL_BYTES = 60 * 1024;

/**
 * Liest den Gegenstand von der Platte. Ordner werden flach gelesen, sortiert,
 * damit zwei Läufe dieselbe Reihenfolge sehen.
 */
export function lieseGegenstand(wurzel, pfad) {
  const voll = join(wurzel, pfad);
  const s = statSync(voll);
  const dateien = s.isDirectory()
    ? readdirSync(voll).filter((n) => !n.startsWith(".")).sort()
        .map((n) => join(voll, n)).filter((p) => statSync(p).isFile())
    : [voll];

  if (!dateien.length) throw new Error(`In ${pfad} liegt keine Datei.`);

  const teile = dateien.map((p) => {
    const name = relative(wurzel, p);
    return `===== ${name} =====\n${readFileSync(p, "utf8")}`;
  });
  const inhalt = teile.join("\n\n");

  // Lieber ein ehrlicher Abbruch als ein halber Gegenstand: ein Urteil über
  // 60 KB von 200 KB ist kein Urteil, sieht aber genauso aus.
  const gross = Buffer.byteLength(inhalt, "utf8");
  if (gross > DECKEL_BYTES)
    throw new Error(`${pfad} ist ${gross} Bytes gross, der Deckel liegt bei ` +
      `${DECKEL_BYTES}. Nichts wird gekuerzt — leg einen kleineren Ausschnitt vor.`);

  return { dateiname: basename(pfad) || pfad, inhalt, offen: [],
           dateien: dateien.map((p) => relative(wurzel, p)), bytes: gross };
}

/**
 * Darf gegen dieses Prüfmerkmal geurteilt werden?
 *
 * EIN TROCKENES PRUEFMERKMAL IST EIN BEISPIELTEXT, KEIN AUFTRAG. Am 2026-08-20
 * trug `werkstatt/konferenz.json` noch den Trockenlauf, und Vera hat den
 * Auslieferungspruefer gegen das Pruefmerkmal einer MERKKARTE gemessen —
 * „hoechstens eine Seite, mindestens fuenf Regeln mit Begruendung". Sie urteilte
 * „taugt", und das gruene Haekchen sah aus wie ein Beweis. Gemessen wurde nichts.
 *
 * Die Ausgabe hatte „(trocken)" sogar dazugesagt. Ein Hinweis, den man
 * ueberliest, ist kein Riegel.
 *
 * Eigene Funktion, damit die Entscheidung geprueft werden kann, ohne einen
 * ganzen Lauf zu fahren.
 */
export function pruefmerkmalTauglich({ echt, quelleArt }) {
  if (echt && quelleArt === "trocken")
    return { ok: false, grund: "trockenes Prüfmerkmal",
      text: "Das Prüfmerkmal stammt aus einem TROCKENLAUF — hinterlegte " +
            "Beispiel-Antworten, kein echter Auftrag. Ein Urteil dagegen misst " +
            "nichts und sähe trotzdem aus wie eines." };
  return { ok: true, grund: "", text: "" };
}

export async function gegenpruefung({
  api, spec, artefakt, mitarbeiter, kasse, spindAblage, datum, werkbank = null,
  grundsaetze,
} = {}) {
  const wer = Object.fromEntries(mitarbeiter.map((m) => [m.rolle, m]));
  const art = api?.art === "echt" ? "echt" : "trocken";
  const spinde = Object.fromEntries(mitarbeiter.map((m) =>
    [m.rolle, spind.oeffnen(spindAblage, m, { schreiben: art === "echt" })]));
  // Gereicht, nicht geholt — siehe die Begründung in `ruf.mjs`. Bis zum
  // 2026-09-04 verließ sich diese Stelle auf einen Vorgabewert, der eine Datei
  // las; fehlte sie, urteilte die Gegenprüfung ohne Haltung und stumm.
  const ruf = macheRufer({ api, wer, spinde, kasse, werkbank, grundsaetze });

  const beginn = Date.now();
  const events = [];
  let t = 0;
  const merke = (e) => events.push({ t: t++, ms: Date.now() - beginn, ...e });
  const verlauf = [`Gegenprüfung von ${artefakt.dateiname} (${artefakt.bytes} Bytes).`];

  let urteil = null, befunde = [], abbruch = null;

  const a = await ruf("arzt", { spec, artefakt, runde: 1 });
  if (a.abbruch) abbruch = a.abbruch;
  else {
    urteil = a.inhalt;
    merke({ phase: "urteil", runde: 1, rolle: "arzt", wer: wer.arzt.name,
            urteil: urteil.urteil, begruendung: urteil.begruendung,
            fehlende: urteil.fehlende || [], weitergabe: urteil.weitergabe || "",
            dauerMs: a.dauerMs || 0 });
    verlauf.push(`${wer.arzt.name} urteilt: ${urteil.urteil} — ${urteil.begruendung}`);
  }

  if (!abbruch) {
    const n = await ruf("negativbauer", { spec, artefakt, runde: 1 });
    if (n.abbruch) abbruch = n.abbruch;
    else {
      befunde = n.inhalt.befunde || [];
      merke({ phase: "befund", runde: 1, rolle: "negativbauer", wer: wer.negativbauer.name,
              anzahl: befunde.length, befunde, dauerMs: n.dauerMs || 0 });
      verlauf.push(`${wer.negativbauer.name} findet ${befunde.length} Befund(e)` +
        (befunde.length ? ": " + befunde.map((b) => b.was).join(" · ") : "."));
    }
  }

  // Der Beobachter darf an die Rücklage — ohne seinen Satz hat die Gegenprüfung
  // ein Urteil, aber niemand hat aufgeschrieben, was daraus folgt.
  const k = kasse.bericht();
  const b = await ruf("beobachter", { verlauf, kasse: k }, { reserveAntasten: true });
  const stand = b.abbruch ? null : b.inhalt;
  if (stand)
    merke({ phase: "feierabend", rolle: "beobachter", wer: wer.beobachter.name,
            stand: stand.stand, naechsterSchritt: stand.naechsterSchritt,
            dauerMs: b.dauerMs || 0 });

  const schwer = befunde.filter((x) => x.schwere === "hoch");

  if (art === "echt")
    for (const m of mitarbeiter)
      spind.schliessen(spindAblage, m,
        `${datum}: Gegenprüfung ${artefakt.dateiname} — Urteil ${urteil?.urteil ?? "keins"}, ` +
        `${befunde.length} Befund(e), davon ${schwer.length} schwer.`);

  return {
    laufVersion: "1.0", datum, art, laeuft: false, dauerMs: Date.now() - beginn,
    gegenstand: { dateiname: artefakt.dateiname, dateien: artefakt.dateien, bytes: artefakt.bytes },
    spec, urteil, befunde,
    ergebnis: {
      urteil: urteil?.urteil ?? null,
      schwereBefunde: schwer.length,
      // „bestanden" ist bewusst eng: ein schwerer Befund schlaegt ein „taugt".
      // Sonst koennte die Gegenpruefung sich selbst freisprechen.
      bestanden: urteil?.urteil === "taugt" && schwer.length === 0,
      anKlaus: schwer.length > 0,
      abbruch: abbruch?.text || "",
    },
    stand, verlauf, events, kasse: kasse.bericht(),
  };
}
