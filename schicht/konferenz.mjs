/*
 * konferenz.mjs — die Werkstatt sucht sich ihren Auftrag selbst.
 *
 * DREI RUNDEN:
 *   1. Jeder bringt EINEN Vorschlag ein — aus seiner Rolle heraus. Der Bauer aus
 *      der Bau-Erfahrung, der Arzt aus den Prüfbefunden, der Negativbauer aus
 *      den Schwächen, der Beobachter aus dem, was offen blieb.
 *   2. Jeder bewertet ALLE Vorschläge und nennt konkrete Einwände.
 *   3. Der Beobachter macht aus dem Sieger einen Auftrag mit Prüfmerkmal.
 *
 * DIE EIGENE STIMME ZÄHLT NICHT. Wer sich selbst bewerten darf, gewinnt immer,
 * und die Konferenz wäre ein Ritual mit vorher bekanntem Ausgang. Gefragt wird
 * trotzdem danach — die Selbstbevorzugung wird GEMESSEN und steht im Protokoll.
 * Sie sagt etwas über die Besetzung, und man sieht sie sonst nie.
 *
 * WAS NICHT GEWÄHLT WURDE, GEHT IN DIE MERKLISTE — aber nur bei dem, der es
 * eingebracht hat. Vier Vorschläge landeten bis zum 2026-08-21 unter „Verworfen"
 * und waren weg, samt der Einwände, die jemand sich dazu überlegt hatte. Ein
 * Vorschlag, der heute zu früh kommt, ist in drei Wochen der richtige.
 *
 * Notierte jeder alles, wäre die Merkliste ein zweites Archiv — und das Archiv
 * gibt es schon. Der SIEGER wird gar nicht vorgemerkt: er wird gebaut.
 *
 * DER ZÄHLER IST DER HÄNGER-MELDER. Ein Titel bekommt EINEN Eintrag mit Zähler
 * (spind.mjs). Steht er beim HAENGER_AB-ten Mal wieder auf dem Tisch, ist das
 * kein Gedächtnis mehr, sondern eine Schleife. GEZÄHLT wird hier — im Code, aus
 * den Merklisten, nicht geschätzt; BENANNT wird es vom Beobachter, der die Zahl
 * in seiner Frage vorgelegt bekommt. Beides getrennt, weil eine Rolle eine Zahl
 * erfinden kann und dieser Code nicht.
 *
 * DIE KONFERENZ DARF DIE SCHICHT NICHT VERREDEN. Sie läuft mit demselben Geld,
 * bekommt darin aber einen eigenen Anteil (Vorgabe: ein Drittel). Ist der
 * aufgebraucht, wird abgestimmt mit dem, was da ist — statt weiterzureden, bis
 * fürs Bauen nichts mehr übrig ist.
 */
import "../zeit.js";

/*
 * DER TAG KOMMT AUS DER ORTSZEIT, NICHT AUS UTC (Klaus 2026-09-07, mit Bild).
 *
 * Sein Verlauf nannte „7.9.2026, 01:20:32", das Fahrtenbuch daneben
 * „2026-09-06" — dieselbe Fahrt, zwei Tage. `toISOString()` ist UTC; um 01:20
 * in Mitteleuropa ist es 23:20 des Vortags in Greenwich. Jede Fahrt zwischen
 * Mitternacht und zwei Uhr wurde auf den Vortag gebucht — und daran hängt das
 * TAGESKONTINGENT, also Geld.
 *
 * `zeit.js` ist ein klassisches Skript und setzt ein Global; das ist derselbe
 * Weg, den `buehne.js` und `ansicht.js` nehmen. Die Rechnung steht dort an
 * EINER Stelle, damit Browser und Kommandozeile nicht zwei Tage kennen.
 */
const tagOrt = () => globalThis.WERKSTATT_ZEIT.tagOrt();

import * as spind from "./spind.mjs";
import { macheRufer } from "./ruf.mjs";

export const KONFERENZ_ANTEIL = 1 / 3;

/**
 * Zählt die Punkte aus. Reine Rechnung, kein Aufruf — damit sie sich prüfen
 * lässt, ohne eine Konferenz zu fahren.
 */
export function auszaehlen(vorschlaege, stimmzettel) {
  const tafel = vorschlaege.map((v, i) => ({
    nummer: i + 1, titel: v.titel, von: v.von, rolle: v.rolle,
    punkte: 0, eigenPunkte: null, einwaende: [],
  }));

  for (const { rolle, stimmen } of stimmzettel) {
    for (const st of stimmen || []) {
      const z = tafel.find((x) => x.nummer === st.nummer);
      if (!z) continue;                       // eine Nummer, die es nicht gibt
      const punkte = Math.max(0, Math.min(5, Number(st.punkte) || 0));
      if (z.rolle === rolle) {
        z.eigenPunkte = punkte;               // gemessen, aber NICHT gezählt
      } else {
        z.punkte += punkte;
        if (st.einwand && st.einwand.trim()) z.einwaende.push(`${rolle}: ${st.einwand.trim()}`);
      }
    }
  }

  // Selbstbevorzugung: wie viel höher setzt jemand sich selbst als den
  // Durchschnitt, den er den anderen gibt. Hoch bei allen heißt: die Runde hat
  // sich nicht auf die Sache eingelassen.
  const eigenlob = stimmzettel.map(({ rolle, stimmen }) => {
    const meins = tafel.find((x) => x.rolle === rolle);
    const eigen = (stimmen || []).find((st) => st.nummer === meins?.nummer);
    const fremd = (stimmen || []).filter((st) => st.nummer !== meins?.nummer)
      .map((st) => Number(st.punkte) || 0);
    if (!eigen || !fremd.length) return { rolle, differenz: null };
    const schnitt = fremd.reduce((a, b) => a + b, 0) / fremd.length;
    return { rolle, differenz: Number(((Number(eigen.punkte) || 0) - schnitt).toFixed(2)) };
  });

  // Gleichstand wird nach der Vorschlags-Nummer entschieden, nicht nach Zufall:
  // eine Konferenz, die zweimal anders ausgeht, ist keine Entscheidung.
  const sortiert = [...tafel].sort((a, b) => b.punkte - a.punkte || a.nummer - b.nummer);
  const gleichstand = sortiert.length > 1 && sortiert[0].punkte === sortiert[1].punkte;

  return { tafel, sortiert, sieger: sortiert[0] || null, eigenlob, gleichstand };
}

/**
 * Merkt jeden EIGENEN, nicht gewählten Vorschlag beim Einbringer vor und meldet,
 * welcher davon zu oft wiederkommt.
 *
 * Drei Entscheidungen stecken darin, und jede hat einen Grund:
 *
 *   DER SIEGER WIRD NICHT VORGEMERKT. Er wird gebaut. Stünde er in der
 *   Merkliste, läse die Rolle beim nächsten Mal „das wurde nicht gewählt" über
 *   etwas, das gerade entsteht.
 *
 *   NUR BEIM EIGENEN EINBRINGER. Notierte jeder alles, wäre die Liste ein
 *   zweites Archiv — und sie hat einen Deckel von 4 KB, den fünf Fremdideen je
 *   Konferenz in wenigen Runden sprengen.
 *
 *   TROCKEN WIRD GEZÄHLT, ABER NICHT GESCHRIEBEN. Ein Übungslauf, der eine
 *   Erinnerung hinterlässt, macht aus einer Übung eine Erinnerung an eine Übung
 *   — genau der Fehler vom 2026-08-20, als Jonas in der Konferenz mit einem
 *   Werkstück argumentierte, das es nie gegeben hat. Die ZAHL kommt trotzdem
 *   heraus (`wievielMal` liest nur), sonst bewiese die Trockenschicht den
 *   Hänger-Melder nicht.
 */
export function merkeVor({ api, wer, spinde, spindAblage, vorschlaege, tafel, sieger,
                           datum = "" } = {}) {
  const vorgemerkt = [];
  vorschlaege.forEach((v, i) => {
    const nummer = i + 1;
    if (sieger && nummer === sieger.nummer) return;      // der Sieger wird gebaut
    const m = wer[v.rolle];
    if (!m) return;
    const z = (tafel || []).find((x) => x.nummer === nummer);
    const angaben = {
      titel: v.titel,
      ergebnis: v.ergebnis || "",
      einwaende: z?.einwaende || [],
      punkte: z?.punkte ?? null,
      datum,
    };
    // Die geschriebene Zahl ist die maßgebliche; ohne Schreiben rechnet
    // `wievielMal` dieselbe. Es ist dieselbe Funktion — `vormerken` ruft sie auf.
    const geschrieben = api?.art === "echt"
      ? spind.vormerken(spindAblage, m, angaben) : null;
    const male = geschrieben?.ok
      ? geschrieben.male
      : spind.wievielMal(spinde?.[v.rolle]?.merkliste || "", v.titel);
    vorgemerkt.push({ titel: v.titel, von: v.von, rolle: v.rolle, male,
                      punkte: angaben.punkte, geschrieben: Boolean(geschrieben?.ok) });
  });
  return { vorgemerkt, haenger: vorgemerkt.filter((x) => x.male >= spind.HAENGER_AB) };
}

export async function konferenz({
  api, mitarbeiter, kasse, spindAblage, lage = "", anteil = KONFERENZ_ANTEIL, werkbank = null,
  grundsaetze, datum = tagOrt(), unterlagen = null,
  aufZwischenstand = null,
} = {}) {
  const wer = Object.fromEntries(mitarbeiter.map((m) => [m.rolle, m]));
  /*
   * WOMIT gelaufen wurde — an JEDEM Ergebnis, auch am abgebrochenen.
   *
   * `schicht.mjs` und `gegenpruefung.mjs` tragen das seit jeher; die Konferenz
   * war die einzige, die es nicht tat. In Node fiel das nicht auf, weil
   * `schreibeKonferenz` das Feld beim Schreiben der Datei aus `trocken`
   * nachtraegt — im Browser gibt es diese Datei nicht, dort geht das Ergebnis
   * unveraendert in die Anzeige. Eine Trockenschicht stand dadurch als
   * „echt bezahlt" auf der Buehne (Klaus 2026-09-06, mit Bild).
   *
   * Im Zweifel trocken — nie „echt" behaupten. Dieselbe Regel, derselbe
   * Wortlaut wie an den beiden anderen Stellen.
   */
  const art = api?.art === "echt" ? "echt" : "trocken";
  const spinde = Object.fromEntries(
    mitarbeiter.map((m) => [m.rolle,
      spind.oeffnen(spindAblage, m, { schreiben: api?.art === "echt" })]));
  /*
   * DIE GRUNDSÄTZE KOMMEN VON AUSSEN (2026-09-04).
   *
   * Hier stand „Grundsätze lädt der Rufer selbst" — und das tat er, mit einem
   * Vorgabewert, der eine Datei las. Zwei Dinge waren daran falsch: es band die
   * ganze Ruf-Kette an Node, und wo die Datei fehlte, verschwand der Hinweis
   * darauf spurlos. Die Konferenz lief dann ohne Haltung und sagte es niemandem.
   */
  const ruf = macheRufer({ api, wer, spinde, kasse, werkbank, grundsaetze, unterlagen });
  const deckel = kasse.deckelEur * anteil;

  const protokoll = [];
  const vorschlaege = [];

  // Dieselbe Ereignis-Spur wie in der Schicht: `t` ist die Reihenfolge, `ms` der
  // Abstand zum Beginn. Ohne `ms` liesse sich ein Abspielen nur auf gleich
  // langen Schritten bauen — das saehe aus wie eine Messung und waere erfunden.
  const beginn = Date.now();
  const events = [];
  let t = 0;
  /*
   * ══ DIE KONFERENZ MELDET SICH, WÄHREND SIE LÄUFT ═════════════════════════
   *
   * ⚠ SIE TAT ES ALS EINZIGE NICHT — und das ist genau die Strecke, auf der
   * Klaus wartet. `schicht()` hat `aufZwischenstand` seit jeher; die Konferenz
   * hatte nichts. Bei acht Rollen sind das SIEBZEHN von rund dreissig
   * Aufrufen, in denen die Bühne unverändert dastand: die erste Hälfte jedes
   * Laufs, und die erste, die man sieht.
   *
   * Klaus 2026-09-07: „wir machen es so, dass wir die echte Zeit annehmen,
   * keine verzögerte Zeit, damit ich das besser sehen kann." Das Bild lag
   * nicht in Zeitlupe hinterher — es stand still.
   *
   * ⚠ EIN FEHLER IM ZUSCHAUER DARF DEN LAUF NIE UMWERFEN. Er ist bezahlt;
   * eine Anzeige ist es nicht wert. Dieselbe Klammer wie in `schicht.mjs`.
   */
  const melde = () => {
    if (!aufZwischenstand) return;
    /* ⚠ DAS DATUM GEHÖRT MIT (2026-09-07). Ohne es stand auf Klaus' Seite
       „Konferenz vom undefined (echt)" — die Zeile darunter nannte für die
       Schicht ein Datum und für die Konferenz ein Wort, das nach einem Fehler
       aussieht. Der fertige Stand trägt es seit jeher; nur der Zwischenstand
       nicht, und der ist genau das, was während des Laufs zu sehen ist. */
    try { aufZwischenstand({ art, datum, events: events.slice(), laeuft: true,
                             beginn: new Date(beginn).toISOString() }); }
    catch { /* nie den Lauf umwerfen */ }
  };
  const merke = (e) => { events.push({ t: t++, ms: Date.now() - beginn, ...e }); melde(); };

  // ── Runde 1: jeder bringt einen ein ──────────────────────────────────────
  for (const m of mitarbeiter) {
    const a = await ruf(m.rolle, { schema: "vorschlag", rolleName: m.name, lage },
      { zusatzDeckel: deckel });
    if (a.abbruch) break;
    vorschlaege.push({ ...a.inhalt, von: m.name, rolle: m.rolle });
    protokoll.push(`${m.name} schlägt vor: ${a.inhalt.titel} — ${a.inhalt.ergebnis}`);
    merke({ phase: "vorschlag", rolle: m.rolle, wer: m.name, nummer: vorschlaege.length,
            titel: a.inhalt.titel, ergebnis: a.inhalt.ergebnis,
            begruendung: a.inhalt.begruendung || "", dauerMs: a.dauerMs || 0 });
  }
  if (vorschlaege.length < 2)
    return { ok: false, art, grund: "zu wenige Vorschläge", vorschlaege, protokoll, events,
             auftrag: null, tafel: [], eigenlob: [], vorgemerkt: [], haenger: [] };

  // ── Runde 2: jeder bewertet alle ─────────────────────────────────────────
  const stimmzettel = [];
  for (const m of mitarbeiter) {
    const a = await ruf(m.rolle, { schema: "bewertung", vorschlaege, rolleName: m.name },
      { zusatzDeckel: deckel });
    if (a.abbruch) break;
    stimmzettel.push({ rolle: m.rolle, name: m.name, stimmen: a.inhalt.stimmen || [] });
    merke({ phase: "bewertung", rolle: m.rolle, wer: m.name,
            stimmen: a.inhalt.stimmen || [], dauerMs: a.dauerMs || 0 });
  }
  if (!stimmzettel.length)
    return { ok: false, art, grund: "niemand hat abgestimmt", vorschlaege, protokoll, events,
             auftrag: null, tafel: [], eigenlob: [], vorgemerkt: [], haenger: [] };

  const { tafel, sortiert, sieger, eigenlob, gleichstand } = auszaehlen(vorschlaege, stimmzettel);
  protokoll.push(`Abgestimmt haben ${stimmzettel.length} von ${mitarbeiter.length}. ` +
    `Vorn liegt „${sieger.titel}" mit ${sieger.punkte} Punkten` +
    (gleichstand ? " (Gleichstand, nach Vorschlags-Nummer entschieden)." : "."));

  // ── Die Merkliste füllen ─────────────────────────────────────────────────
  // Jeder eigene, nicht gewählte Vorschlag wird beim EIGENEN Einbringer
  // vorgemerkt — mit den Einwänden der anderen, denn ohne sie käme er beim
  // nächsten Mal mit denselben Schwächen zurück.
  const { vorgemerkt, haenger } = merkeVor({
    api, wer, spinde, spindAblage, vorschlaege, tafel, sieger, datum });
  for (const h of haenger)
    protokoll.push(`Hänger: „${h.titel}" (${h.von}) steht zum ${h.male}. Mal auf dem Tisch ` +
      `und ist wieder nicht gewählt.`);
  if (vorgemerkt.length)
    merke({ phase: "merkliste", eintraege: vorgemerkt, haenger });

  // ── Runde 3: daraus wird ein Auftrag ─────────────────────────────────────
  const voll = vorschlaege[sieger.nummer - 1];
  // Der Beobachter darf hier ueber den Konferenz-Anteil hinaus: ohne diesen einen
  // Aufruf haette die ganze Konferenz kein Ergebnis, nur einen Punktestand.
  const schluss = await ruf("beobachter", {
    schema: "konferenzschluss", sieger: voll,
    tafel: sortiert, einwaende: sieger.einwaende, haenger,
  });
  if (schluss.abbruch)
    return { ok: false, art, grund: schluss.abbruch.text, vorschlaege, protokoll, events,
             auftrag: null, tafel: sortiert, eigenlob, vorgemerkt, haenger };

  merke({ phase: "schluss", rolle: "beobachter", wer: wer.beobachter?.name || "",
          ziel: schluss.inhalt.ziel, pruefmerkmal: schluss.inhalt.pruefmerkmal,
          begruendung: schluss.inhalt.begruendung,
          verworfen: schluss.inhalt.verworfen || [],
          haengerText: schluss.inhalt.haenger || "", dauerMs: schluss.dauerMs || 0 });

  return {
    ok: true, art,
    events, dauerMs: Date.now() - beginn,
    auftrag: { ziel: schluss.inhalt.ziel, pruefmerkmal: schluss.inhalt.pruefmerkmal,
               ausKonferenz: true, sieger: voll.titel, von: voll.von },
    begruendung: schluss.inhalt.begruendung,
    verworfen: schluss.inhalt.verworfen || [],
    vorschlaege, stimmzettel, tafel: sortiert, eigenlob, gleichstand, protokoll,
    vorgemerkt, haenger, haengerAb: spind.HAENGER_AB,
    // Was der Beobachter dazu sagt — getrennt gehalten von `haenger`, das die
    // gezählte Tatsache ist. Eine Zahl und ein Urteil darüber sind zweierlei.
    haengerText: schluss.inhalt.haenger || "",
  };
}
