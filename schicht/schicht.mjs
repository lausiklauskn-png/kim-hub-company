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
import { macheRufer, laufKennung, mitHerkunft, ARM_LAGE } from "./ruf.mjs";
import { blockerDerRunde, festgefahren, bezahlbar, lageText,
         FESTGEFAHREN_AB } from "./festgefahren.mjs";

export const LAUF_VERSION = "1.0";
/* Die Reihe IST der Ablauf, von links nach rechts gelesen. Seit dem
   2026-09-05 acht statt fuenf (Klaus): Ben schaerft, bevor gebaut wird; Lisa
   und Malcom pruefen mit, nachdem gebaut wurde. */
export const ROLLEN_REIHE = ["ingenieur", "mitingenieur", "bauer", "arzt",
                             "negativbauer", "gestalterin", "nutzer", "beobachter"];

/* WER IN EINER RUNDE WIRKLICH DRANKOMMT — die Grundlage, auf der die Kasse
   entscheidet, ob eine weitere Runde bezahlbar ist. Ingenieur und Mitingenieur
   laufen EINMAL vor den Runden, der Beobachter EINMAL danach; sie gehören
   deshalb nicht hinein. */
export const RUNDEN_ROLLEN = ["bauer", "arzt", "negativbauer", "gestalterin", "nutzer"];

const kurz = (t, n = 400) => (t || "").length > n ? t.slice(0, n) + " …" : (t || "");

export async function schicht({
  api, auftrag, mitarbeiter, kasse, spindAblage, grundsaetze: g, aufZwischenstand = null, werkbank = null,
  unterlagen = null, freigabe = null,
  maxRunden = 4, datum = tagOrt(), arm = "voll", laufId = null,
  /*
   * ══ FORTSETZUNG (2026-09-17) ═══════════════════════════════════════════
   *
   * Das Ergebnis von `fortsetzungAus()` aus fortsetzung.mjs — oder null, und
   * dann ändert sich hier NICHTS. Mit ihr beginnt die Schicht nicht bei Nora,
   * sondern bei der ersten Rolle, deren Ereignis in der alten `lauf.json`
   * fehlt: bezahlte Vorschläge, Schärfungen und Fassungen werden übernommen,
   * nicht noch einmal gekauft. Kennung und Ereignisse bleiben dieselben, die
   * neuen tragen einen höheren `abschnitt`.
   *
   * ⚠ WAS SIE NICHT TUT: sie prüft nicht selbst, ob Auftrag und Art passen.
   * Das tut `fortsetzungAus()`, VOR dem ersten Aufruf und mit Text — hier
   * käme die Auskunft nach dem ersten bezahlten Aufruf, also zu spät.
   */
  fortsetzung = null,
  /*
   * ══ DER NOTAUSGANG (Klaus 2026-09-21) ══════════════════════════════════
   *
   * Eine Funktion `(lage, { zusatzDeckel }) => Promise<konferenzErgebnis>`,
   * oder null — und dann ändert sich hier NICHTS. `lauf.mjs` hängt die echte
   * `konferenz()` daran, wenn `--notausgang` gesetzt ist.
   *
   * ⚠ SIE KOMMT VON AUSSEN, STATT HIER IMPORTIERT ZU WERDEN. Sonst wäre die
   * Bedingung, die sie auslöst, nur über einen ganzen Lauf zu prüfen: eine
   * Probe müsste die halbe API stellen, um eine Zählung zu messen. So lässt
   * sich ein Stellvertreter einsetzen und der Auslöser ALLEIN messen.
   *
   * ⚠ UND SIE IST AUSGESCHALTET, SOLANGE NIEMAND SIE HINEINGIBT. Sie kostet
   * siebzehn bezahlte Aufrufe; die teure Richtung gehört hinter ein
   * ausdrückliches Wort, nicht in die Vorgabe.
   */
  zweiteKonferenz = null,
} = {}) {
  const wer = Object.fromEntries(mitarbeiter.map((m) => [m.rolle, m]));
  for (const r of ROLLEN_REIHE)
    if (!wer[r]) throw new Error(`Für die Rolle "${r}" ist niemand eingetragen.`);
  if (fortsetzung && fortsetzung.ok !== true)
    throw new Error("Eine Fortsetzung, die fortsetzungAus() abgewiesen hat, wird nicht " +
      "gefahren: " + (fortsetzung && fortsetzung.text || "ohne Grund"));

  // Ob echt oder trocken, steht hier ganz oben — daran hängt, ob das Gedächtnis
  // beschrieben werden darf.
  const art = api?.art === "echt" ? "echt" : "trocken";
  /*
   * ══ DIE KENNUNG DIESES LAUFS (Bauschritt 3, 2026-09-17) ═══════════════════
   *
   * Einmal gezogen, an jedes Ereignis und jeden Befund gehängt. Wer eine
   * mitgibt (die Browser-Schale, ein Test), bekommt seine; wer keine mitgibt,
   * bekommt eine aus Art und Zeitpunkt. Ohne sie liess sich ein Befund nach
   * dem nächsten Lauf keinem Lauf mehr zuordnen — `lauf.json` hält nur den
   * letzten, und das Fahrtenbuch kennt die Befunde nicht.
   */
  /* Bei einer Fortsetzung gewinnt die ALTE Kennung — es ist derselbe Lauf. */
  laufId = laufId || (fortsetzung && fortsetzung.laufId) || laufKennung(art);
  const spinde = Object.fromEntries(
    mitarbeiter.map((m) => [m.rolle, spind.oeffnen(spindAblage, m, { schreiben: art === "echt" })]));

  /* Die alten Ereignisse bleiben, wie sie waren — auch ihr `ms`, das auf der
     Uhr des ERSTEN Abschnitts steht. Die neuen zählen ab diesem Beginn und
     tragen ihren Abschnitt; wer Abstände rechnet, rechnet je Abschnitt. */
  const events = fortsetzung ? fortsetzung.events.slice() : [];
  const verlauf = fortsetzung ? fortsetzung.verlauf.slice() : [];
  const abschnitt = fortsetzung ? fortsetzung.abschnitt : 1;
  let t = events.length;
  const beginn = Date.now();

  // Jedes Ereignis trägt seinen ABSTAND ZUM SCHICHTBEGINN in Millisekunden.
  // `t` bleibt als Reihenfolge daneben, aber wer eine Schicht abspielen oder
  // einen Stau finden will, braucht `ms` — sonst sind alle Schritte gleich
  // lang, und das sähe aus wie eine Messung.
  //
  // Und der Stand wird LAUFEND hinausgereicht, nicht erst am Feierabend. Sonst
  // kann eine Ansicht nur zusehen, was schon vorbei ist.
  const merke = (e) => {
    events.push({ t: t++, ms: Date.now() - beginn,
                  ...(fortsetzung ? { abschnitt } : {}), ...e });
    if (aufZwischenstand) try { aufZwischenstand(zwischenstand()); } catch { /* nie den Lauf umwerfen */ }
  };
  /*
   * WAS JEDES RUF-EREIGNIS SEIT BAUSCHRITT 3 TRÄGT — aus der Antwort des
   * Rufers, an EINER Stelle abgeleitet:
   *
   *   werkzeugRufe  wie oft die Rolle wirklich nachgesehen hat
   *   werkzeuge     womit (Name, Kennzeichen der Eingabe, ob es ging)
   *   herkunft      Lauf, Rolle, Runde, Modell, Zugang — die Auskunft, die
   *                 „findet Haiku andere Befunde als Opus?" erst zu einer
   *                 Frage mit Zahlen macht
   *
   * Der Rufer kennt die Lauf-Kennung nicht; sie wird hier angehängt.
   */
  const spur = (x) => ({
    werkzeugRufe: x.werkzeugRufe || 0, wiederholungen: x.wiederholungen || 0,
    neuAngefragt: x.neuAngefragt || 0,
    ...(x.unlesbar && x.unlesbar.length ? { unlesbar: x.unlesbar } : {}),
    werkzeuge: x.werkzeuge || [],
    herkunft: { laufId, ...(x.herkunft || {}) },
  });

  // Was eine Ansicht schon WÄHREND der Schicht zeigen kann. Bewusst dieselbe
  // Form wie das Endergebnis, nur unfertig — zwei Formen wären zwei Stellen,
  // an denen eine Anzeige etwas anderes behauptet als die Datei.
  const zwischenstand = () => ({
    laufVersion: LAUF_VERSION, laufId, datum, laeuft: true,
    art,   // dieselbe Angabe wie im Endergebnis — nicht zweimal gerechnet
    auftrag: { ziel: auftrag?.ziel, pruefmerkmal: auftrag?.pruefmerkmal || null },
    rollen: ROLLEN_REIHE,
    besetzung: mitarbeiter.map((m) => ({ rolle: m.rolle, name: m.name, modell: m.modell })),
    spec, artefakt, fassungen, stand: null,
    ergebnis: { fertig, runden: Math.max(0, runde - 1), angefangen,
                urteil: urteil?.urteil || null,
                offeneBefunde: befunde.filter((x) => x.schwere === "hoch").length,
                feierabendGrund: null, feierabendText: "" },
    weitergaben, kasse: kasse.bericht(), events,
    /* Der Notausgang steht schon WÄHREND der Schicht da — er ist das, was
       Klaus auf der Bühne sehen soll, während beraten wird. `null` heisst
       „bisher nicht nötig", nicht „ausgeschaltet"; ob er verdrahtet ist, steht
       im Endergebnis daneben. */
    notausgang,
    ...(fortsetzung ? { fortsetzung: fortsetzungsVermerk() } : {}),
  });

  const ruf = macheRufer({ api, wer, spinde, kasse, grundsaetze: g, werkbank, arm, unterlagen });
  const weitergaben = fortsetzung ? fortsetzung.weitergaben.slice() : [];

  // Vor dem ersten möglichen Abbruch angelegt: der Feierabend-Block liest sie,
  // und er läuft auch dann, wenn schon der erste Aufruf nicht mehr bezahlbar war.
  let artefakt = null, urteil = null, befunde = [], runde = 0, fertig = false, stopp = null;
  /*
   * ⚠ RUNDEN, DIE BEGONNEN HABEN, SIND NICHT RUNDEN, DIE FERTIG WURDEN.
   *
   * Klaus' Fahrt 7 (2026-09-17): Runde 3 begann, Emil baute — der teuerste
   * Aufruf — und dann reichte das Geld für Vera nicht mehr. `runden` zählte
   * 2, und im Bericht stand „2 Runde(n)" über einer Schicht mit drei
   * Bau-Aufrufen. Die Zahl war nicht falsch, sie beantwortete nur die
   * Frage „wie viele Runden sind DURCH?" — und niemand las daraus, dass eine
   * bezahlte Fassung ungeprüft liegen blieb. `angefangen` steht daneben,
   * `runden` bleibt, was es war: jeder Leser findet dieselbe Zahl wie vorher.
   */
  let angefangen = 0;
  let nutzung = null;
  /*
   * Was JEDE Runde aufgehalten hat — die Grundlage, auf der der Notausgang
   * zählt. Sie wird auch dann geführt, wenn keine zweite Konferenz verdrahtet
   * ist: die Liste steht im Ergebnis, und damit ist an einem Lauf im
   * Nachhinein abzulesen, ob der Notausgang gefeuert HÄTTE. Ohne sie wäre die
   * Frage „wie oft träfe das zu?" nur mit einem bezahlten Lauf zu beantworten.
   */
  const rundenBlocker = fortsetzung && Array.isArray(fortsetzung.rundenBlocker)
    ? fortsetzung.rundenBlocker.slice() : [];
  /* Höchstens EINER je Schicht. Ein Notausgang, der sich seinerseits im Kreis
     dreht, ist teurer als ein Abbruch — und siebzehn Aufrufe sind kein
     Beiwerk. Was daraus wurde, steht im Ergebnis, auch wenn er nicht feuerte. */
  let notausgang = null;
  /*
   * ══ JEDE FASSUNG BLEIBT ═════════════════════════════════════════════════
   *
   * Klaus 2026-09-07: „ursprünglich sollte 1. Version, dann 2. Version und
   * fertige Version generiert werden können."
   *
   * ⚠ DIE RUNDEN GAB ES SCHON — nur behielt sie niemand. `artefakt` war eine
   * einzige Veränderliche und wurde in jeder Runde überschrieben; das
   * Bau-Ereignis trug nur Dateiname und Zeichenzahl. **Version 1 war weg,
   * sobald Version 2 entstand** — bezahlt und nicht mehr zu sehen.
   *
   * Und es ist mehr als ein Andenken: erst nebeneinander sieht man, ob die
   * Truppe wirklich besser wird oder nur anders. Ohne die Vorstufen ist
   * „nach drei Runden fertig" eine Behauptung über einen Weg, den niemand
   * nachgehen kann.
   *
   * ⚠ SIE STEHT NEBEN `artefakt`, NICHT AN SEINER STELLE. Die letzte Fassung
   * bleibt, wo sie war — jeder Leser dieses Ergebnisses (Anzeige, Blatt,
   * Gegenprüfung) findet sie unverändert. Zwei Stellen umzubauen, um eine
   * hinzuzufügen, wäre der grössere Eingriff mit dem grösseren Risiko.
   */
  const fassungen = fortsetzung ? fortsetzung.fassungen.slice() : [];
  let spec = fortsetzung ? fortsetzung.spec : null;
  let schaerfung = null;

  /*
   * WO EINE FORTSETZUNG EINSTEIGT. `ab` nennt Rolle und Runde der ersten
   * fehlenden Antwort; alles davor ist bezahlt und wird übernommen. Ohne
   * Fortsetzung ist `ab` null, und jede Zeile unten läuft wie immer.
   */
  const ab = fortsetzung ? fortsetzung.ab : null;
  const REIHE_VOR_DEN_RUNDEN = ["ingenieur", "mitingenieur"];
  const uebersprungen = (rolle, r = 0) => {
    if (!ab) return false;
    if (REIHE_VOR_DEN_RUNDEN.includes(rolle))
      return ab.rolle === "beobachter" || ab.runde > 0
        || REIHE_VOR_DEN_RUNDEN.indexOf(rolle) < REIHE_VOR_DEN_RUNDEN.indexOf(ab.rolle);
    /* In der Runde, in der es weitergeht, sind die Rollen VOR `ab.rolle`
       schon dran gewesen; in jeder späteren Runde niemand. */
    return r === ab.runde && RUNDEN_ROLLEN.indexOf(rolle) < RUNDEN_ROLLEN.indexOf(ab.rolle);
  };
  if (fortsetzung) {
    artefakt = fortsetzung.artefakt; urteil = fortsetzung.urteil;
    befunde = fortsetzung.befunde || []; nutzung = fortsetzung.nutzung;
    /* Angefangen ist, was ein Bau-Ereignis hat: die Runde, in der es
       weitergeht, wenn der Bauer dort schon dran war — sonst die davor. */
    angefangen = Math.max(0, fortsetzung.runde - (ab.rolle === "bauer" || ab.runde === 0 ? 1 : 0));
    if (ab.rolle === "beobachter") { fertig = true; runde = fortsetzung.runde + 1; }
  }

  // ── Ingenieur: aus dem Auftrag wird eine Sache ────────────────────────────
  if (!uebersprungen("ingenieur")) {
    const i = await ruf("ingenieur", { auftrag });
    if (i.abbruch)
      return abschluss({ grund: i.abbruch, spec: null, artefakt: null });
    spec = i.inhalt;
    merke({ phase: "idee", rolle: "ingenieur", wer: wer.ingenieur.name,
            titel: spec.titel, art: spec.art, pruefmerkmal: spec.pruefmerkmal, ...spur(i) });
    verlauf.push(`${wer.ingenieur.name} schlägt vor: ${spec.titel} (${spec.art})`);
  }

  // ── Ben schärft, bevor gebaut wird ───────────────────────────────────────
  //
  // EINMAL je Schicht, nicht je Runde: er sieht den VORSCHLAG an, und der
  // ändert sich zwischen den Runden nicht. Ihn je Runde zu fragen kostete
  // Aufrufe für dieselbe Antwort.
  //
  // Sein Ergebnis geht in `spec.schaerfung` und damit in die Anweisung an den
  // Bauer — sonst wäre er ein Aufruf, dessen Antwort niemand liest. Das
  // Prüfmerkmal selbst rührt er NICHT an: es ist der Maßstab, an dem der Arzt
  // misst, und wer den Maßstab verschiebt, verschiebt das Urteil mit.
  if (!uebersprungen("mitingenieur")) {
    const mi = await ruf("mitingenieur", { spec });
    if (mi.abbruch) return abschluss({ grund: mi.abbruch, spec, artefakt: null });
    schaerfung = mi.inhalt;
    spec = { ...spec, schaerfung: schaerfung.schaerfung || "",
             ausBauSicht: schaerfung.ausBauSicht || [] };
    merke({ phase: "schaerfung", rolle: "mitingenieur", wer: wer.mitingenieur.name,
            ausBauSicht: schaerfung.ausBauSicht || [],
            ausEntwurfsSicht: schaerfung.ausEntwurfsSicht || [],
            pruefmerkmalTraegt: !!schaerfung.pruefmerkmalTraegt,
            schaerfung: schaerfung.schaerfung || "", ...spur(mi) });
    verlauf.push(`${wer.mitingenieur.name} schärft: ${kurz(schaerfung.schaerfung, 160)}` +
      (schaerfung.pruefmerkmalTraegt ? "" : " — und hält das Prüfmerkmal für nicht nachprüfbar"));
  }

  /*
   * ══ DAS TOR ZWISCHEN IDEE UND BAU (Klaus 2026-09-06) ══════════════════════
   *
   * „Vielleicht ist es sinnvoll, wenn eine Idee, die die Agenten haben, einmal
   *  zwischen dir und mir noch einmal zum Schluss geprüft wird, BEVOR die
   *  bauen … sie entscheiden, eine PDF-Liste zu machen, die sie selber nur
   *  lesen können — völlig sinnlos, weil kein anderer Nutzer etwas damit
   *  anfangen kann."
   *
   * ⚠ ES STEHT GENAU HIER, UND DAS IST DER GANZE PUNKT. Bis hierher sind zwei
   * billige Aufrufe gelaufen (Nora, Ben). Dahinter beginnt die erste Runde mit
   * FÜNF Aufrufen, darunter der einzige auf Opus. Ein Tor davor kostet nichts
   * und spart alles, wenn die Idee nichts taugt; ein Tor dahinter spart nur
   * noch die zweite Runde.
   *
   * ⚠ ES STEHT NACH BEN, NICHT VOR IHM. Er sagt, ob das Prüfmerkmal überhaupt
   * nachprüfbar ist — und genau das will ein Mensch wissen, bevor er „bauen"
   * drückt. Sein Aufruf ist einer, der billigste Preis für die bessere Frage.
   *
   * ⚠ OHNE `freigabe` ÄNDERT SICH NICHTS. An der Kommandozeile und im
   * Trockenlauf ist niemand da, der drückt; ein Tor, das dort wartet, wäre ein
   * Hänger. Wer nichts übergibt, merkt von dieser Stelle nichts.
   *
   * ⚠ DIE UHR LÄUFT WEITER, während überlegt wird. Für die Kosten ist das
   * gleichgültig (es geht nichts hinaus), für den Stundennachweis richtig — es
   * IST Arbeitszeit. Nur der Laufzeit-Deckel zählt sie mit; bei zwei Stunden
   * ist das reichlich, aber es steht hier, statt jemanden zu überraschen.
   */
  /* Bei einer Fortsetzung steht das Tor nur dann noch einmal, wenn es nie
     durchschritten wurde UND noch nichts gebaut ist — ein Tor vor einer
     bezahlten Fassung hielte nichts mehr zurück, es fragte nur noch einmal. */
  const torSchonOffen = fortsetzung && (fassungen.length > 0
    || events.some((e) => e && e.phase === "tor" && e.freigegeben === true));
  if (freigabe && !torSchonOffen) {
    let antwort = null;
    try {
      antwort = await freigabe({
        titel: spec?.titel || auftrag?.ziel || "",
        warum: spec?.warum || "",
        fuerWen: spec?.fuerWen || "",
        ergebnis: spec?.ergebnis || "",
        pruefmerkmal: auftrag?.pruefmerkmal || spec?.pruefmerkmal || "",
        schaerfung: spec?.schaerfung || "",
        ausBauSicht: spec?.ausBauSicht || [],
        pruefmerkmalTraegt: !!schaerfung?.pruefmerkmalTraegt,
      });
    } catch (e) {
      /* Ein Tor, das beim Fragen stolpert, darf keinen bezahlten Lauf
         mitreissen — es hält ihn an, und der Grund steht dabei. */
      antwort = { weiter: false, grund: "Das Tor hat nicht geantwortet: " +
        (e && e.message ? e.message : e) };
    }
    if (!antwort || antwort.weiter !== true) {
      merke({ phase: "tor", rolle: "ingenieur", wer: wer.ingenieur.name,
              freigegeben: false, grund: (antwort && antwort.grund) || "" });
      return abschluss({
        grund: { grund: "verworfen", text: (antwort && antwort.grund) ||
          "Vor dem Bauen verworfen — die Idee wurde nicht freigegeben." },
        spec, artefakt: null });
    }
    merke({ phase: "tor", rolle: "ingenieur", wer: wer.ingenieur.name,
            freigegeben: true, grund: (antwort && antwort.grund) || "" });
  }

  // ── Runden: bauen, prüfen, angreifen ─────────────────────────────────────
  for (runde = (ab && ab.runde >= 1 ? ab.runde : 1); runde <= maxRunden && !fertig; runde++) {
    /* Was diese Runde noch kostet: bei einer Fortsetzung mitten in der Runde
       nur die Rollen, die noch dran sind — die übersprungenen sind bezahlt. */
    const nochDran = RUNDEN_ROLLEN.filter((r) => !uebersprungen(r, runde));
    /*
     * ⚠ GERECHNET WIRD MIT DER BESETZUNG, NICHT MIT EINER ZAHL (2026-09-07).
     *
     * Hier stand `5 * Math.max(kasse.teuersterAufrufUsd, 0.25)` — fünf Aufrufe
     * zum Preis des teuersten. Das war eine Zahl an zwei Stellen (hier und als
     * Laenge der Schleife unten) UND ein falscher Preis: der Bauer darf seit
     * heute 48 000 Token schreiben und kostet damit allein bis zu 1,20 $,
     * während die Untergrenze bei 0,25 $ stand. Die Werkstatt begann Runden,
     * die sie nicht bezahlen konnte, und schnitt Emil dann mittendrin ab.
     *
     * `RUNDEN_ROLLEN` ist jetzt die eine Stelle: die Schätzung liest sie, und
     * `smoke_schicht.mjs` misst sie gegen die Rollen, die eine Runde WIRKLICH
     * aufruft — nicht mehr gegen eine Ziffer im Quelltext.
     */
    const genug = kasse.darfNoch(
      kasse.rundenSchaetzungUsd(nochDran.map((r) => wer[r])));
    if (!genug.ok) { stopp = genug; break; }
    angefangen = Math.max(angefangen, runde);

    if (!uebersprungen("bauer", runde)) {
      const b = await ruf("bauer", { spec, befunde, urteil, runde });
      if (b.abbruch) { stopp = b.abbruch; break; }
      artefakt = b.inhalt;
      /* ⚠ EINE KOPIE, KEIN VERWEIS. `artefakt` zeigt in der nächsten Runde auf
         etwas anderes; ein Verweis liesse die Liste stillschweigend mitwandern,
         und am Ende stünden dort n-mal dieselbe letzte Fassung. */
      fassungen.push({ runde, ...artefakt });
      /* Das EREIGNIS trägt weiterhin nur die Kennzahlen — es geht an die Bühne
         und ins Abspielen, und ganze Werkstücke darin blähten jede Anzeige auf.
         Der Inhalt steht in `fassungen`, an EINER Stelle. */
      /* Alle Dateien einer Fassung, die Hauptdatei zuerst. Die ZAHL gehört in
         das Ereignis, nicht nur die erste — sonst meldet der Bericht eine Datei,
         während vier abgelegt werden, und die Anzeige sähe aus, als hätte der
         Bauer weniger geliefert, als er hat. */
      const weitere = Array.isArray(artefakt.weitere) ? artefakt.weitere : [];
      const zeichenGesamt = (artefakt.inhalt || "").length
        + weitere.reduce((n, d) => n + ((d && d.inhalt) || "").length, 0);
      merke({ phase: "build", runde, rolle: "bauer", wer: wer.bauer.name,
              dateiname: artefakt.dateiname, zeichen: (artefakt.inhalt || "").length,
              dateien: weitere.length + 1,
              weitereNamen: weitere.map((d) => (d && d.dateiname) || ""),
              zeichenGesamt,
              offen: artefakt.offen || [], weitergabe: artefakt.weitergabe || "", ...spur(b) });
      if (artefakt.weitergabe)
        weitergaben.push({ runde, von: "bauer", text: artefakt.weitergabe });
      verlauf.push(`${wer.bauer.name} baut ${artefakt.dateiname}` +
        (weitere.length ? ` und ${weitere.length} weitere` : "") +
        ` (Runde ${runde}, ${zeichenGesamt} Zeichen)` +
        (artefakt.offen?.length ? `, offen: ${artefakt.offen.join(" · ")}` : ""));
    }

    if (!uebersprungen("arzt", runde)) {
      const a = await ruf("arzt", { spec, artefakt, runde });
      if (a.abbruch) { stopp = a.abbruch; break; }
      urteil = a.inhalt;
      merke({ phase: "urteil", runde, rolle: "arzt", wer: wer.arzt.name,
              urteil: urteil.urteil, begruendung: urteil.begruendung,
              fehlende: urteil.fehlende || [], weitergabe: urteil.weitergabe || "", ...spur(a) });
      if (urteil.weitergabe)
        weitergaben.push({ runde, von: "arzt", text: urteil.weitergabe });
      verlauf.push(`${wer.arzt.name} urteilt „${urteil.urteil}": ${kurz(urteil.begruendung, 160)}`);
    }

    if (!uebersprungen("negativbauer", runde)) {
      const n = await ruf("negativbauer", { spec, artefakt, runde });
      if (n.abbruch) { stopp = n.abbruch; break; }
      /* JEDER BEFUND TRÄGT SEINE HERKUNFT — nicht nur das Ereignis. Der Befund
         reist weiter: in die nächste Bauer-Runde, in `ergebnis.offeneBefunde`,
         in ein Blatt. Dort ist das Ereignis nicht mehr dabei. */
      befunde = mitHerkunft(n.inhalt.befunde || [], spur(n).herkunft);
      merke({ phase: "befund", runde, rolle: "negativbauer", wer: wer.negativbauer.name,
              anzahl: befunde.length, befunde, ...spur(n) });
      verlauf.push(befunde.length
        ? `${wer.negativbauer.name} findet ${befunde.length} Schwäche(n), davon ` +
          `${befunde.filter((x) => x.schwere === "hoch").length} schwer`
        : `${wer.negativbauer.name} findet nichts`);
    }

    /* ⚠ GEFRAGT WIRD DIE WERKBANK, NICHT EIN SCHALTER DANEBEN.
       Ob Lisa nachsehen kann, hängt daran, ob wirklich ein Netz-Werkzeug in
       ihrer Hand liegt — `--netz` ist der Weg dorthin, aber nicht die Antwort.
       Ein zweiter Wert, der dasselbe behauptet, läuft irgendwann auseinander,
       und dann verspricht die Anweisung einen Vergleich, den sie nicht
       anstellen kann. Genau der tote Knopf mit Beschriftung. */
    const netzDa = !!(werkbank && (werkbank.definitionen || [])
      .some((d) => d && d.name === "netz_holen"));
    if (!uebersprungen("gestalterin", runde)) {
      const g = await ruf("gestalterin", { spec, artefakt, netzDa, runde });
      if (g.abbruch) { stopp = g.abbruch; break; }
      const gestaltung = g.inhalt;
      merke({ phase: "gestaltung", runde, rolle: "gestalterin", wer: wer.gestalterin.name,
              konnteNachsehen: !!gestaltung.konnteNachsehen,
              befunde: mitHerkunft(gestaltung.befunde || [], spur(g).herkunft),
              vergleiche: gestaltung.vergleiche || [],
              urteil: gestaltung.urteil || "", ...spur(g) });
      verlauf.push(`${wer.gestalterin.name} sieht ${(gestaltung.befunde || []).length} Sache(n) ` +
        `an der Bedienung` +
        (gestaltung.konnteNachsehen
          ? `, mit ${(gestaltung.vergleiche || []).length} Vergleich(en)`
          : ` — ohne Vergleich, sie konnte nicht nachsehen`));
    }

    if (!uebersprungen("nutzer", runde)) {
      const nz = await ruf("nutzer", { spec, artefakt, runde });
      if (nz.abbruch) { stopp = nz.abbruch; break; }
      nutzung = nz.inhalt;
      const haenger = mitHerkunft(nutzung.haengengeblieben || [], spur(nz).herkunft);
      merke({ phase: "nutzung", runde, rolle: "nutzer", wer: wer.nutzer.name,
              ablauf: nutzung.ablauf || "", haengengeblieben: haenger,
              durchgekommen: !!nutzung.durchgekommen, ...spur(nz) });
      verlauf.push(nutzung.durchgekommen
        ? `${wer.nutzer.name} kommt durch` + (haenger.length ? `, bleibt aber ${haenger.length}× hängen` : "")
        : `${wer.nutzer.name} kommt NICHT durch (${haenger.length} Stelle(n))`);
    }

    /* Fertig ist es nur, wenn ALLE VIER zufrieden sind — der Arzt am
       Prüfmerkmal, der Negativbauer an den Schwächen, und Malcom daran, dass
       man überhaupt durchkommt. Ein „taugt" neben einem schweren Befund wäre
       das Grün, das keins ist; ein „taugt" an etwas, durch das niemand
       durchkommt, ebenso.

       Lisas Befunde zählen hier bewusst NICHT als Sperre: Gestaltung ist eine
       Verbesserung, kein Mangel, und eine Rolle, die jede Runde etwas findet,
       machte die Schicht endlos. Ihre Befunde stehen im Protokoll und gehen
       an den Bauer weiter.

       ⚠ GERECHNET WIRD AUS DEN BLOCKERN, NICHT DANEBEN (2026-09-21). Hier
       stand dieselbe Bedingung ein zweites Mal ausgeschrieben; `festgefahren.mjs`
       braucht sie ebenfalls, um zu zählen, WAS eine Runde aufgehalten hat.
       Zwei Fassungen derselben Frage laufen auseinander — und dann meldete der
       Notausgang einen Hänger an einer Schicht, die längst fertig ist, oder
       umgekehrt. **Fertig heisst: kein Blocker.**

       ⚠ UND EIN FEHLENDES URTEIL WIRFT SEITDEM NICHT MEHR. Vorher stand hier
       `urteil.urteil`; ohne Urteil starb die Schicht an dieser Zeile. Jetzt ist
       „kein Urteil" ein Blocker wie jeder andere — nicht fertig ist die sichere
       Richtung. */
    const blocker = blockerDerRunde({ urteil, befunde, nutzung });
    rundenBlocker.push({ runde, blocker });
    fertig = blocker.length === 0;

    /*
     * ══ DER NOTAUSGANG ════════════════════════════════════════════════════
     *
     * ⚠ ER STEHT HIER, ZWISCHEN ZWEI RUNDEN — nicht am Ende. In der letzten
     * Runde hätte ein neuer Weg keine Runde mehr, in der er gegangen werden
     * könnte; siebzehn Aufrufe für eine Auskunft, die niemand mehr einlöst.
     */
    if (!fertig && zweiteKonferenz && !notausgang && runde < maxRunden) {
      const weiter = await notausgangVersuchen(runde);
      if (weiter === "abbruch") {
        stopp = notausgang.stopp;
        /* ⚠ `runden` RECHNET `runde - 1`, WEIL DIE SCHLEIFE SONST IMMER OBEN
           VERLASSEN WIRD — bei Geld und Zeit bricht sie MITTEN in der Runde ab,
           und dann ist die angefangene nicht gelaufen. Dieser Abbruch steht am
           ENDE der Runde: sie ist vollständig durch und bezahlt. Ohne diese
           Zeile meldete der Bericht eine Runde weniger, als gefahren wurde —
           die zu niedrige Zahl, die niemandem auffällt. */
        runde++;
        break;
      }
    }
  }

  return abschluss({ grund: stopp, spec, artefakt });

  /*
   * ══ DIE ZWEITE KONFERENZ — Klaus' Notausgang (2026-09-21) ════════════════
   *
   * „Kann man für den Fall, dass sowohl Vera als auch Sten keine Antwort
   *  finden … dass noch einmal eine Sitzung einberufen wird und noch einmal
   *  alle Agenten angefragt werden … um dann wieder einen gemeinsamen Konsens
   *  zu finden nach einer Abstimmung."
   *
   * DREI AUSGÄNGE, NICHT ZWEI — und jeder steht danach im Ergebnis:
   *
   *   "weiter"   die Runde hat einen Weg gefunden. Er geht in `spec.schaerfung`
   *              und damit in die Anweisung an den Bauer. Die Schicht läuft.
   *   "abbruch"  die Runde kam zu keinem Auftrag. Das geht an Klaus, nicht in
   *              die nächste Runde: die Schicht ist gemessen festgefahren, und
   *              weitere Runden kosten Geld für dieselbe Schleife.
   *   "nein"     er hat gar nicht gefeuert (nicht festgefahren, oder das Geld
   *              reicht nicht). Die Schicht läuft unverändert weiter.
   *
   * ⚠ DAS PRÜFMERKMAL WIRD NIE ANGEFASST. `auftrag.pruefmerkmal` steht in der
   * Lage und kommt aus der Konferenz zurück — genommen wird es NICHT. Es ist
   * der Maßstab, an dem der Arzt misst; wer ihn verschiebt, verschiebt das
   * Urteil mit, und die Schicht könnte „taugt" melden, weil die Latte gesunken
   * ist. Dieselbe Tafel, die Ben verbietet, ihn anzurühren. Hält die Runde ihn
   * für den eigentlichen Blocker, sagt sie das im Text — und das geht an Klaus.
   */
  async function notausgangVersuchen(inRunde) {
    const fest = festgefahren(rundenBlocker);
    if (!fest.fest) return "nein";

    /* Ob danach noch eine Runde bezahlbar wäre — mit derselben Schätzung, mit
       der die Schleife oben entscheidet. Eine zweite Rechnung dafür liefe
       auseinander, und dann beriete die Werkstatt sich um ihre letzte Runde. */
    const naechsteRundeUsd = kasse.rundenSchaetzungUsd(RUNDEN_ROLLEN.map((r) => wer[r]));
    const geld = bezahlbar({ kasse, rundeSchaetzungUsd: naechsteRundeUsd });

    notausgang = {
      runde: inRunde, ab: fest.ab, haenger: fest.haenger,
      gefeuert: false, ausgang: "nein", grund: geld.grund, text: geld.text,
      deckelEur: Number(geld.deckelEur.toFixed(4)),
    };

    /* ⚠ AUCH DER NICHT GEFEUERTE FALL WIRD GEMELDET. „Festgefahren, aber kein
       Geld für einen Rat" ist eine Auskunft — sie sagt Klaus, dass die Schicht
       hängt UND warum ihr nicht geholfen wurde. Stillschweigend weiterzudrehen
       wäre genau der stille Fehlschlag, gegen den diese Werkstatt gebaut ist. */
    merke({ phase: "notausgang", runde: inRunde, gefeuert: false,
            ab: fest.ab, haenger: fest.haenger, grund: geld.grund, text: geld.text });
    verlauf.push(`Die Schicht steckt fest (${fest.haenger.length} Hänger über ` +
      `${fest.ab} Runden). ` + (geld.ok ? "Eine zweite Konferenz wird einberufen."
                                        : `Kein Notausgang: ${geld.text}`));
    if (!geld.ok) return "nein";

    const lage = lageText({ auftrag, spec, artefakt, urteil, befunde, nutzung,
                            haenger: fest.haenger, runde: inRunde, maxRunden });

    let k = null;
    try {
      k = await zweiteKonferenz(lage, { zusatzDeckel: geld.deckelEur, laufId, runde: inRunde });
    } catch (e) {
      /* ⚠ EIN FEHLER IM NOTAUSGANG DARF DIE SCHICHT NICHT VERSCHLUCKEN — aber
         er darf sie auch nicht stillschweigend weiterlaufen lassen. Was bis
         hierher hinausging, ist bezahlt; der Grund gehört zu Klaus. */
      k = { ok: false, grund: "Die zweite Konferenz ist gestolpert: " +
            (e && e.message ? e.message : String(e)) };
    }

    notausgang.gefeuert = true;
    notausgang.kosten = k && k.kasse ? k.kasse : null;
    notausgang.protokoll = (k && k.protokoll) || [];
    notausgang.events = (k && k.events) || [];

    if (!k || k.ok !== true) {
      notausgang.ausgang = "abbruch";
      notausgang.grund = "keine-einigung";
      notausgang.text = (k && k.grund) || "ohne Grund";
      notausgang.stopp = { grund: "notausgang", text:
        `Die Schicht steckt fest, und die zweite Konferenz kam zu keinem ` +
        `Auftrag (${notausgang.text}). Das geht an den Betreiber, nicht in ` +
        `eine weitere Runde.` };
      merke({ phase: "notausgang", runde: inRunde, gefeuert: true,
              ausgang: "abbruch", ab: fest.ab, haenger: fest.haenger,
              grund: notausgang.grund, text: notausgang.text });
      verlauf.push(`Die zweite Konferenz kam zu keinem Auftrag — das geht an den Betreiber.`);
      return "abbruch";
    }

    /*
     * ⚠ DER NEUE WEG GEHT IN DIE SCHÄRFUNG, NICHT IN DEN AUFTRAG. `spec` ist
     * das, was der Bauer zu lesen bekommt; `auftrag` ist der Maßstab. Die
     * frühere Schärfung wird NICHT überschrieben, sondern ergänzt — Bens
     * Bau-Sicht bleibt gültig, auch wenn die Runde einen neuen Weg beschlossen
     * hat. Zwei Auskünfte, die einander nicht widersprechen.
     */
    const neu = `Die Runde hat sich beraten, weil es hier feststeckte. Was jetzt ` +
      `anders gemacht wird:\n${k.auftrag.ziel}` +
      (k.begruendung ? `\n\nWarum: ${k.begruendung}` : "");
    spec = { ...spec, schaerfung: (spec?.schaerfung ? spec.schaerfung + "\n\n" : "") + neu };
    notausgang.ausgang = "weiter";
    notausgang.grund = "offen";
    notausgang.text = "";
    notausgang.schaerfung = neu;
    notausgang.sieger = k.auftrag.sieger || "";
    merke({ phase: "notausgang", runde: inRunde, gefeuert: true, ausgang: "weiter",
            ab: fest.ab, haenger: fest.haenger, sieger: notausgang.sieger,
            ziel: k.auftrag.ziel, begruendung: k.begruendung || "" });
    verlauf.push(`Die zweite Konferenz beschliesst: ${kurz(k.auftrag.ziel, 160)}`);
    return "weiter";
  }

  // ── Feierabend ───────────────────────────────────────────────────────────
  async function abschluss({ grund, spec, artefakt }) {
    const k = kasse.bericht();
    let stand = null;
    // Der Beobachter darf die Rücklage antasten — dafür ist sie da.
    const bb = await ruf("beobachter", { verlauf, kasse: k }, { reserveAntasten: true });
    if (!bb.abbruch) {
      stand = bb.inhalt;
      merke({ phase: "feierabend", rolle: "beobachter", wer: wer.beobachter.name,
              stand: stand.stand, naechsterSchritt: stand.naechsterSchritt, ...spur(bb) });
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
      laufId,
      datum,
      laeuft: false,
      dauerMs: Date.now() - beginn,
      art: api?.art === "echt" ? "echt" : "trocken",   // im Zweifel trocken — nie „echt" behaupten
      auftrag: { ziel: auftrag.ziel, pruefmerkmal: auftrag.pruefmerkmal || null },
      rollen: ROLLEN_REIHE,
      besetzung: mitarbeiter.map((m) => ({ rolle: m.rolle, name: m.name, modell: m.modell })),
      spec,
      artefakt,
      /* ⚠ AUCH HIER, NICHT NUR IM ZWISCHENSTAND. Die erste Fassung ergänzte
         nur `zwischenstand()`; das Endergebnis kam ohne Fassungen zurück, und
         ein Lauf, den man hinterher ansieht, hätte wieder nur die letzte
         Version gezeigt. Gemessen an einer Trockenschicht: „Runden: 2 ·
         Fassungen: 0". **Zwei Ausgänge derselben Sache, und nur einer war
         nachgezogen.** */
      fassungen,
      ergebnis: {
        fertig,
        runden: Math.max(0, runde - 1),
        /* Begonnene Runden — siehe die Begründung an der Deklaration. Gleich
           `runden`, wenn keine Runde mittendrin abgebrochen ist. */
        angefangen,
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
      /*
       * ⚠ GEFRAGT WIRD DIE TAFEL, NICHT DER NAME (2026-09-22). Hier stand
       * `arm === "nackt"`. Mit vier Armen ist das falsch: in
       * „nur-regeln" gelten die Grundsätze ebenfalls NICHT, und der Zweig
       * hätte dort `g.anzahl` gemeldet — eine Zahl über eine Haltung, die
       * gar nicht hinausging. Das ist die stillste Sorte Fehler: die Zahl
       * sieht richtig aus und gehört zum falschen Arm.
       */
      grundsaetze: ARM_LAGE[arm].haltung
        ? { anzahl: g.anzahl, fehlt: g.fehlt, hinweis: g.hinweis }
        : { anzahl: 0, fehlt: false, hinweis: `Versuchsarm „${arm}": die Grundsätze haben `
            + `NICHT gegolten (Werkstattregeln: ${ARM_LAGE[arm].regeln ? "ja" : "nein"}). `
            + `Das Ergebnis ist ein Messwert, kein Werkstück.` },
      weitergaben,
      kasse: kasse.bericht(),
      events,
      /*
       * ══ WAS JEDE RUNDE AUFGEHALTEN HAT ═════════════════════════════════
       *
       * Steht auch dann da, wenn KEIN Notausgang verdrahtet war. Damit ist an
       * einem gefahrenen Lauf im Nachhinein abzulesen, ob er gefeuert HÄTTE —
       * und das ist die einzige Art, die Frage „wie oft träfe das zu?" zu
       * beantworten, ohne eine bezahlte Schicht dafür zu kaufen.
       */
      rundenBlocker,
      /*
       * `null` heisst NICHT dasselbe wie `{gefeuert:false}`:
       *   null                    er war nie fällig (oder gar nicht verdrahtet)
       *   {gefeuert:false, …}     die Schicht steckte fest, und es gab keinen
       *                           Rat — der Grund steht dabei
       *   {gefeuert:true,  …}     eine zweite Konferenz ist gelaufen
       * Wer die drei zusammenzieht, meldet „alles in Ordnung" über eine Schicht,
       * die hängt und der niemand geholfen hat.
       */
      notausgang,
      notausgangVerdrahtet: !!zweiteKonferenz,
      /* Nur bei einer Fortsetzung — ein Lauf ohne trägt das Feld nicht, damit
         niemand „fortsetzung: null" für eine Auskunft hält. */
      ...(fortsetzung ? { fortsetzung: fortsetzungsVermerk() } : {}),
    };
  }

  /*
   * WAS ÜBERNOMMEN WURDE UND WAS ES GEKOSTET HAT — in beiden Ausgängen
   * (Zwischenstand und Ergebnis) dieselbe Form, aus derselben Funktion.
   *
   * `vorherEur` ist gebucht (als Abbruch oder Schicht des ersten Abschnitts),
   * `dieserAbschnittEur` bucht dieser Lauf, `gesamtEur` ist die Summe. Eine
   * Fortsetzung, die nur ihre eigenen Kosten nennt, sähe billiger aus, als
   * der Lauf war — die zu niedrige Zahl, die niemandem auffällt.
   */
  function fortsetzungsVermerk() {
    const eigen = Number(kasse.verbrauchtEur().toFixed(4));
    return {
      von: fortsetzung.laufId, abschnitt, ab: { ...fortsetzung.ab },
      uebernommen: { ...fortsetzung.uebernommen },
      vorherEur: fortsetzung.vorherEur, dieserAbschnittEur: eigen,
      gesamtEur: Number((fortsetzung.vorherEur + eigen).toFixed(4)),
    };
  }
}
