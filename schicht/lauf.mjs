#!/usr/bin/env node
/*
 * lauf.mjs — was Klaus' Klick auslöst.
 *
 *   node schicht/lauf.mjs --trocken                 kostet nichts, beweist die Mechanik
 *   node schicht/lauf.mjs --auftrag auftraege/x.json --deckel 5 --stunden 2
 *
 * KEINE ÜBERSTUNDEN. Läuft die Schicht aus, ist sie zu Ende. Eine zweite ist ein
 * neuer Aufruf — eine bewusste Handlung statt eines Nickens auf eine Frage, die
 * man müde wegdrückt.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Kasse } from "./kosten.mjs";
import * as kontingent from "./kontingent.mjs";
import * as gaeste from "./gaeste.mjs";
import { EchteApi, TrockenApi } from "./api.mjs";
import { schicht } from "./schicht.mjs";
import { konferenz } from "./konferenz.mjs";
import { gegenpruefung, lieseGegenstand, pruefmerkmalTauglich } from "./gegenpruefung.mjs";
import { BEISPIELE } from "./beispiele.mjs";
import { ladeGrundsaetze } from "./grundsaetze-datei.mjs";
import { dateiAblage } from "./ablage-datei.mjs";
import { pruefeForm } from "./schluessel.mjs";
import * as fahrtenbuch from "./fahrtenbuch.mjs";
import { macheWerkbank } from "./werkzeuge.mjs";
import { dateiBaum } from "./baum-datei.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const KONTINGENT = join(WURZEL, "schicht", "kontingent.json");
/*
 * WO DAS GEDÄCHTNIS LIEGT — umlenkbar wie die Gästeliste, und aus demselben
 * Grund: eine Messung darf den echten Bestand nicht anfassen.
 *
 * Gebraucht wird es für den Zwei-Arm-Versuch (M4). Jede ECHTE Schicht schreibt
 * in die Spinde; der zweite Lauf sieht also, was der erste gelernt hat. „Der
 * zweite Bau von irgendetwas ist schneller" ist genau der Störer, den der Brief
 * benennt — und über zwei Arme hinweg wäre er verheerend, weil dann der eine
 * Arm aus dem anderen gelernt hätte.
 */
const SPINDE = process.env.KIMHUB_SPINDE || join(WURZEL, "spinde");
/*
 * DIE ABLAGE WIRD HIER GEBAUT, wo das Dateisystem bekannt ist — genau wie die
 * Werkbank ein paar Zeilen weiter. `schicht.mjs`, `konferenz.mjs` und der Spind
 * selbst wissen seit dem 2026-09-04 nichts mehr von Verzeichnissen; sie
 * bekommen eine Ablage gereicht. Im Browser ist es eine andere, und das ist der
 * ganze Zweck.
 */
const SPIND_ABLAGE = dateiAblage(SPINDE);
const LAUF = join(WURZEL, "werkstatt", "lauf.json");
const PLAN = join(WURZEL, "werkstatt", "plan-offen.md");
const KONF = join(WURZEL, "werkstatt", "konferenz.json");
const GEGEN = join(WURZEL, "werkstatt", "gegenpruefung.json");
const FAHRTENBUCH = fahrtenbuch.pfadIn(WURZEL);
/*
 * Umlenkbar — und zwar aus einem Grund, der nicht „Testbarkeit" heisst: eine
 * Probe, die den echten Pfad benutzt, würde Klaus' Gästeliste überschreiben.
 * Ein Wächter, der beim Messen kaputtmacht, wovon er handelt, ist schlimmer als
 * keiner. Im Normalbetrieb ist die Umgebungsvariable nicht gesetzt.
 */
const GAESTE = process.env.KIMHUB_GAESTE || join(WURZEL, "schicht", "gaeste.json");

/*
 * WAS BIS ZUM ABBRUCH SCHON BEZAHLT WAR.
 *
 * Anlass: Klaus' Lauf am 2026-08-23 starb mit „Connection error." — vor dem
 * ersten Aufruf, also ohne Kosten. Beim Nachsehen fiel die eigentliche Lücke
 * auf: stirbt eine Schicht MITTENDRIN, ist das Geld ausgegeben und steht
 * NIRGENDS. Weder im Fahrtenbuch noch in der Zapfsäule — beide werden erst am
 * Ende geschrieben.
 *
 * Das ist genau der Befund vom 2026-08-22 noch einmal, nur an einer anderen
 * Stelle: „heute und gestern Agentenarbeit, als hätten sie nie gearbeitet und
 * kein Geld gekostet." Eine zu niedrige Zahl sieht genauso aus wie eine
 * gemessene.
 *
 * Deshalb hält der Einstieg eine Kennung auf die laufende Kasse. Bricht etwas
 * ab, sagt die Meldung, was verbraucht wurde — und bucht es, damit die
 * Buchhaltung nicht lügt.
 */
let laufendeKasse = null;
let laufendeLage = null;

function arg(name, vorgabe) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1] : vorgabe;
}
const hat = (name) => process.argv.includes("--" + name);

/*
 * DIE WERKBANK (Klaus 2026-08-23: „die agenten bekommen die entsprechenden
 * werkzeuge in die hand").
 *
 * Sie wird HIER gebaut, nicht in der Schicht — weil hier die Wurzel bekannt
 * ist, und die Wurzel IST die Grenze. Eine Werkbank ohne Wurzel gibt es nicht
 * (`macheWerkbank` wirft dann).
 *
 * Lesen ist AN, weil genau das der Auftrag war. Das Netz ist AUS und braucht
 * `--netz` — nicht aus Vorsicht, sondern damit im Fahrtenbuch steht, welche
 * Schicht draussen WAR und nicht nur, welche es gedurft haette.
 *
 * `--ohne-werkzeuge` ist der Weg zurueck. Solange der erste bezahlte Lauf mit
 * Werkzeugen nicht gemessen ist (siehe api.mjs: `tools` + `output_config.format`
 * ist eine benannte Annahme), muss es einen Schalter geben, der die Schicht
 * genau so fahren laesst wie vorher.
 */
const werkbank = hat("ohne-werkzeuge")
  ? null
  : macheWerkbank({ baum: dateiBaum(WURZEL), netz: hat("netz") });

/*
 * `--nackt` — DER ZWEITE ARM DES VERSUCHS (M4, 2026-09-04).
 *
 * Ohne Werkstattregeln, ohne Grundsätze: die blosse Auftragsbeschreibung. Das
 * ist der Arm, den es nie gab — beide bisherigen Bauten liefen mit vollem
 * Briefing, und deshalb liess sich über die Wirkung von Regeln und Grundsätzen
 * bisher nur reden.
 *
 * ⚠ ES IST EINE MESSUNG, KEIN BETRIEBSMODUS. Mit den Werkstattregeln fallen
 * auch die harten weg: kein PII, nichts erfinden, keine fremden Adressen, nur
 * behaupten was wirklich getan wurde. Was dabei entsteht, ist ein Messwert und
 * geht NICHT in die Arbeit. Deshalb steht der Arm im Lauf-Protokoll und im
 * Fahrtenbuch — eine Zahl ohne ihre Bedingung ist keine Messung.
 */
const arm = hat("nackt") ? "nackt" : "voll";

/*
 * WER FÄHRT? — die Grenze zwischen eigener Nutzung und Fremdnutzung.
 *
 * Ohne `--gast` ist es der Betreiber: wer an der Kommandozeile steht, IST
 * Klaus. Mit `--gast <wort>` wird in `schicht/gaeste.json` nachgesehen.
 *
 * EIN UNBEKANNTES WORT BRICHT AB, statt stillschweigend als Betreiber
 * durchzugehen. Das ist der ganze Zweck: „ich kenne dich nicht" muss teurer
 * sein als „ich frage nicht".
 */
const gastStand = gaeste.lesen(GAESTE);
const gastWort = arg("gast", null);
const gast = gastWort === null ? gaeste.BETREIBER : gaeste.finde(gastStand, gastWort);
if (gastWort !== null && !gast) {
  console.log(`\n⛔ Unbekanntes Zugangswort. Es wird nichts gestartet und nichts bezahlt.`);
  console.log(`   Gäste stehen in schicht/gaeste.json — die Datei liegt NUR auf`);
  console.log(`   diesem Gerät und gehört nicht ins Depot.\n`);
  process.exit(2);
}

/*
 * Jede Fahrt traegt sich selbst ein — und zwar BEVOR das Tageskontingent
 * gebucht wird. Die Reihenfolge ist Absicht: bricht etwas dazwischen ab, steht
 * die Fahrt im Buch und fehlt in der Zapfsaeule. Andersherum waere Geld gebucht,
 * das nirgends mehr steht — und genau diese Luecke war der Befund.
 */
function eintragen({ art, echt, datum, bericht, mitarbeiter = [], titel = "", ergebnis = "" }) {
  let e;
  try {
    e = fahrtenbuch.eintrag({ art, echt, datum, bericht, titel, ergebnis, arm,
      wer: gast?.name || "",
      besetzung: mitarbeiter.map((m) => `${m.name} (${m.rolle})`) });
  } catch (err) {
    console.log(`  ⚠ Fahrtenbuch: ${err.message}`);
    return;
  }
  const r = fahrtenbuch.anhaengen(FAHRTENBUCH, e);
  if (!r.ok) {
    // Nicht werfen. Die Fahrt ist gelaufen und bezahlt; ein volles Dateisystem
    // aendert daran nichts. Aber es wird gesagt — still waere es dasselbe
    // Verschweigen noch einmal.
    console.log(`  ⚠ Fahrtenbuch nicht geschrieben: ${r.grund}`);
    return;
  }
  if (r.beiseitegelegt)
    console.log(`  ⚠ Das alte Fahrtenbuch war unlesbar und liegt jetzt unter ${r.beiseitegelegt}.`);
  /*
   * ZWEI DAUERN, ZWEI ZEILEN. `minuten` ist die Kassen-Laufzeit (Prüf-Uhr,
   * gerundet), `sekunden` die Spanne an der Wanduhr — Klaus' Zeit vom Auslösen
   * bis zum Ende. Sie in eine Zeile zu werfen wäre genau die Verwechslung, die
   * er am 2026-08-22 schon einmal gemeldet hat („unten steht 2 Stunden").
   */
  const kz = (n) => n >= 60 ? `${Math.round(n / 6) / 10} min` : `${Math.round(n)} s`;
  console.log(`  Im Fahrtenbuch: Fahrt ${r.anzahl} (${e.artText}, ` +
    `${e.eur.toFixed(2)} €${e.echt ? "" : " — trocken"}).`);
  console.log(`  Deine Zeit an dieser Fahrt: ${kz(e.sekunden)} ` +
    `(${e.beginn.slice(11, 16)}–${e.beendet.slice(11, 16)} Uhr) — steht als ` +
    `Arbeitszeit im Buch.`);
}

export async function main() {
  // GELD KOSTET NUR, WER ES AUSDRÜCKLICH SAGT. Vorher war es umgekehrt: ohne
  // `--trocken` lief die Schicht echt, und ein vertippter Aufruf hätte gezahlt.
  // Die teure Richtung gehört hinter das ausdrückliche Wort, nicht die billige.
  const echt = hat("echt");
  const trocken = !echt;

  // Der Schlüssel wird VOR dem ersten Aufruf geprüft, nicht beim ersten Aufruf.
  // Sonst liefe die halbe Konferenz, bevor auffällt, dass gar nichts geht — und
  // ein halb gelaufener Abbruch ist schlimmer als ein sauberer am Anfang.
  // Und nicht nur, OB er da ist, sondern ob er ueberhaupt wie einer aussieht.
  // `read -rsp` zeigt beim Tippen nichts an; wer dort die Befehlszeile einfuegt,
  // bekommt sonst erst nach dem ersten bezahlten Aufruf ein „401 invalid
  // x-api-key" — und diese Meldung sagt „ungueltig", nicht „das war kein
  // Schluessel". (Genau so passiert, Klaus 2026-08-20.)
  if (echt) {
    const f = pruefeForm(process.env.ANTHROPIC_API_KEY);
    if (!f.ok) {
      console.log(`\n⛔ Der Schlüssel stimmt nicht: ${f.grund}.`);
      console.log(`   ${f.hinweis}\n`);
      console.log("   Nochmal, und diesmal NUR den Schlüssel einfügen:");
      console.log("     unset ANTHROPIC_API_KEY");
      console.log("     source tools/schluessel.sh\n");
      console.log("   Danach der kleine Test:  node schicht/probe-api.mjs\n");
      process.exit(2);
    }
  }
  const datum = arg("datum", new Date().toISOString().slice(0, 10));
  const wunschDeckel = Number(arg("deckel", 5));
  const stunden = Number(arg("stunden", 2));
  // PLANMODUS (Klaus 2026-08-20): die Konferenz sucht den Auftrag, danach ist
  // Schluss. Gebaut wird nicht von Emil, sondern von einer Claude-Code-Sitzung,
  // die Werkzeuge hat — sie kann die Repos lesen, Proben laufen lassen,
  // gegenmessen. Emil bleibt in der Konferenz, weil sein Vorschlag aus der
  // Bau-Erfahrung kommt; er baut nur nicht mehr selbst.
  //
  // Nebenwirkung, die zählt: 11 Aufrufe statt 19, und der Bau kann nicht mehr
  // mitten in einer bezahlten Runde an einer Token-Grenze zerbrechen.
  const nurPlan = hat("nur-konferenz");
  const mitKonferenz = hat("konferenz") || nurPlan;
  const { mitarbeiter } = JSON.parse(
    readFileSync(join(WURZEL, "schicht", "mitarbeiter.json"), "utf8"));
  // GEGENPRÜFUNG (Klaus 2026-08-20): das Gebaute geht zurück an Vera und Sten.
  // Der Schritt, der den ganzen Aufbau trägt — wer baut und danach berichtet,
  // schreibt sein eigenes Zeugnis.
  const gegenPfad = arg("gegenpruefen", null);

  let auftrag = (mitKonferenz || gegenPfad) ? null : JSON.parse(readFileSync(
    join(WURZEL, arg("auftrag", "auftraege/beispiel.json")), "utf8"));

  // ── Zapfsäule zuerst ─────────────────────────────────────────────────────
  const stand = kontingent.lesen(KONTINGENT);
  /*
   * DAS TAGESKONTINGENT SCHÜTZT KLAUS' GELD. Zahlt der Gast selbst, ist keines
   * im Spiel — dann darf es ihn weder bremsen noch von ihm verbraucht werden.
   * Ohne diese Unterscheidung meldete das Buch Kosten, die nie jemand hatte;
   * dieselbe Sorte Fehler wie eine zu niedrige Zahl, nur andersherum.
   */
  const selbstzahler = !trocken && gaeste.zahltSelbst(gast);
  const darf = selbstzahler
    ? { ok: true, deckelEur: wunschDeckel, gekuerzt: false, text: "" }
    : kontingent.darfSchichtStarten(stand, datum, wunschDeckel);
  if (!trocken && !darf.ok) {
    console.log("\n⛔ " + darf.text + "\n");
    process.exit(2);
  }
  if (darf.text) console.log("\nℹ " + darf.text);

  /*
   * DIE VIERTE BREMSE, und sie stapelt sich auf die dritte. Es gilt die
   * KLEINERE der beiden Grenzen — Tageskontingent und Gast-Budget greifen
   * unabhängig. Ein Gast mit grossem Budget kommt trotzdem nicht an einem
   * aufgebrauchten Tag durch, und umgekehrt.
   */
  const darfG = gaeste.darfGast(gast, darf.deckelEur, kontingent.MINDEST_DECKEL_EUR);
  if (!trocken && !darfG.ok) {
    console.log("\n⛔ " + darfG.text + "\n");
    process.exit(2);
  }
  if (darfG.text) console.log("\nℹ " + darfG.text);
  if (!trocken) console.log(`\n👤 Diese Fahrt läuft auf: ${gast.name}`);

  const deckelEur = trocken ? wunschDeckel : Math.min(darf.deckelEur, darfG.deckelEur);
  const kasse = new Kasse({
    deckelEur,
    laufzeitMs: stunden * 3600_000,
    // Zurückgelegt für den Feierabend-Bericht — ein Zehntel, mindestens 20 Cent.
    reserveEur: Math.max(0.20, deckelEur * 0.1),
  });

  /*
   * WESSEN SCHLÜSSEL? Bringt der Gast einen mit, läuft die Schicht auf SEINEM —
   * und `basisUrl` erlaubt ihm sogar einen eigenen Anbieter. Ohne eigenen
   * Schlüssel läuft sie auf Klaus'.
   */
  laufendeKasse = kasse;
  laufendeLage = { datum, trocken, selbstzahler, mitarbeiter };

  const api = trocken ? new TrockenApi(BEISPIELE) : new EchteApi(
    gaeste.zahltSelbst(gast)
      ? { schluessel: gast.schluessel, basisUrl: gast.basisUrl || null }
      : {});

  if (gegenPfad) {
    // Das Prüfmerkmal kommt aus der Konferenz, die den Auftrag gestellt hat —
    // nicht aus dem Kopf dessen, der gebaut hat. Nur wenn es dort keins gibt,
    // darf es von Hand kommen, und dann steht das auch dabei.
    let spec = null, quelle = "", quelleArt = "echt";
    const vonHand = arg("pruefmerkmal", null);
    const ausDatei = arg("auftrag", null);
    if (vonHand) { spec = { titel: arg("titel", gegenPfad), pruefmerkmal: vonHand };
                   quelle = "von Hand mitgegeben"; }
    else if (ausDatei) {
      const a = JSON.parse(readFileSync(join(WURZEL, ausDatei), "utf8"));
      spec = { titel: a.sieger || a.titel || ausDatei, pruefmerkmal: a.pruefmerkmal, ziel: a.ziel };
      quelle = `aus ${ausDatei}` + (a._herkunft ? ` (${a._herkunft.split(".")[0]})` : "");
    }
    else {
      try {
        const k = JSON.parse(readFileSync(KONF, "utf8"));
        if (k?.auftrag?.pruefmerkmal) {
          spec = { titel: k.auftrag.sieger || gegenPfad, pruefmerkmal: k.auftrag.pruefmerkmal,
                   ziel: k.auftrag.ziel };
          quelle = `aus der Konferenz vom ${k.datum} (${k.art})`;
          quelleArt = k.art;
        }
      } catch { /* keine Konferenz da — dann sagt die Zeile unten warum */ }
    }

    const tauglich = pruefmerkmalTauglich({ echt, quelleArt });
    if (!tauglich.ok) {
      console.log(`\n⛔ ${tauglich.text}\n`);
      console.log("   Entweder eine echte Konferenz fahren:");
      console.log("     node schicht/lauf.mjs --echt --nur-konferenz --deckel 3");
      console.log("   oder den Auftrag mitgeben:");
      console.log("     --auftrag auftraege/<datei>.json");
      console.log('     --pruefmerkmal "Erfüllt, wenn …"\n');
      process.exit(2);
    }

    if (!spec) {
      console.log("\n⛔ Kein Prüfmerkmal. Ohne eines ist eine Gegenprüfung ein Geschmacksurteil.");
      console.log("   Entweder liegt werkstatt/konferenz.json daneben, oder:");
      console.log('     --pruefmerkmal "Erfüllt, wenn …"\n');
      process.exit(2);
    }

    let gegenstand;
    try { gegenstand = lieseGegenstand(WURZEL, gegenPfad); }
    catch (e) { console.log(`\n⛔ ${e.message}\n`); process.exit(2); }

    console.log(`\nGEGENPRÜFUNG ${trocken
      ? "(trocken — keine API, keine Kosten)"
      : "· ECHT — dieser Lauf kostet Geld"}`);
    console.log(`  Gegenstand:  ${gegenPfad} — ${gegenstand.dateien.length} Datei(en), ` +
      `${gegenstand.bytes} Bytes`);
    console.log(`  Prüfmerkmal: ${quelle}`);
    console.log(`    „${(spec.pruefmerkmal || "").slice(0, 160)}${
      (spec.pruefmerkmal || "").length > 160 ? "…" : ""}"`);
    console.log(`  Es prüfen:   ${mitarbeiter.filter((m) => ["arzt", "negativbauer", "beobachter"]
      .includes(m.rolle)).map((m) => `${m.name} (${m.rolle})`).join(", ")}`);
    console.log(`  NICHT dabei: der Bauer. Wer gebaut hat, urteilt hier nicht mit.\n`);

    /* Gereicht, nicht geholt. Bis zum 2026-09-04 las der Rufer die Datei selbst
       — dort, wo niemand den Hinweis „es gibt keine Grundsätze" mehr sah. */
    const g = await gegenpruefung({ api, spec, artefakt: gegenstand,
      mitarbeiter, kasse, spindAblage: SPIND_ABLAGE, datum, werkbank,
      grundsaetze: ladeGrundsaetze() });

    mkdirSync(dirname(GEGEN), { recursive: true });
    writeFileSync(GEGEN, JSON.stringify(g, null, 2) + "\n", "utf8");

    if (g.urteil) {
      console.log(`  ${mitarbeiter.find((m) => m.rolle === "arzt").name}: ` +
        `${g.urteil.urteil.toUpperCase()} — ${g.urteil.begruendung}`);
      for (const f of g.urteil.fehlende || []) console.log(`    fehlt: ${f}`);
      if (g.urteil.weitergabe) console.log(`    weiter: ${g.urteil.weitergabe}`);
    }
    console.log(`\n  ${mitarbeiter.find((m) => m.rolle === "negativbauer").name}: ` +
      `${g.befunde.length} Befund(e)`);
    for (const b of g.befunde)
      console.log(`    [${b.schwere}] ${b.was}\n           Fall: ${b.fall}`);

    if (g.stand) {
      console.log(`\n  ${mitarbeiter.find((m) => m.rolle === "beobachter").name}: ${g.stand.stand}`);
      console.log(`  Nächster Schritt: ${g.stand.naechsterSchritt}`);
    }

    const kg = g.kasse;
    console.log(`\n  ${g.ergebnis.bestanden ? "✓ BESTANDEN" : "✗ NICHT bestanden"}` +
      ` — Urteil ${g.ergebnis.urteil ?? "keins"}, ${g.ergebnis.schwereBefunde} schwere(r) Befund(e).`);
    if (g.ergebnis.anKlaus)
      console.log("  → Das geht an Klaus, NICHT in eine dritte Runde.");
    console.log(`  Verbraucht ${kg.verbrauchtEur.toFixed(2)} € in ${kg.minuten} Minuten (${kg.aufrufe} Aufrufe).`);
    console.log(`  Das Urteil liegt in werkstatt/gegenpruefung.json.`);
    if (trocken) console.log("  Das war ein Trockenlauf. Für eine echte Prüfung: --echt");
    console.log("");

    eintragen({ art: "gegenpruefung", echt: !trocken, datum, bericht: kg, mitarbeiter,
      titel: gegenPfad,
      ergebnis: (g.ergebnis.bestanden ? "bestanden" : "nicht bestanden") +
        ` — ${g.ergebnis.schwereBefunde} schwere(r) Befund(e)` });
    if (!trocken) {
      kontingent.schreiben(KONTINGENT,
        kontingent.buchen(stand, datum, selbstzahler ? 0 : kg.verbrauchtEur));
      gaeste.schreiben(GAESTE, gaeste.buchen(gastStand, gast, kg.verbrauchtEur));
    }
    return { gegenpruefung: g };
  }

  console.log(`\nSCHICHT ${trocken
    ? "(trocken — keine API, keine Kosten)"
    : "· ECHT — dieser Lauf kostet Geld"}`);
  console.log(`  Deckel:   ${deckelEur.toFixed(2)} €  ·  hoechstens ${stunden} h`);
  if (arm === "nackt") {
    console.log(`\n  ⚠ VERSUCHSARM „nackt" — weder Werkstattregeln noch Grundsätze.`);
    console.log(`    Damit fehlen auch kein-PII, nichts-erfinden und`);
    console.log(`    nur-behaupten-was-getan-wurde. Das Ergebnis ist ein MESSWERT,`);
    console.log(`    kein Werkstück: es gehört in die Auswertung, nicht in die Arbeit.`);
  }
  // „Laufzeit: 2 h" stand hier bis zum 2026-08-22 und las sich wie eine Dauer.
  // Klaus: „unten steht 2 Stunden Schicht, aber die Schicht ist schon nach
  // wenigen Minuten beendet." Es war nie eine Dauer, sondern eine Obergrenze —
  // die Schicht endet, sobald sie fertig ist. Was sie WIRKLICH gedauert hat,
  // steht im Feierabend-Bericht und im Fahrtenbuch.
  console.log("  Die Schicht endet, sobald sie fertig ist — nicht erst dann.");
  console.log(`  Besetzung: ${mitarbeiter.map((m) => `${m.name} (${m.rolle})`).join(", ")}\n`);

  // ── Ideen-Konferenz, wenn verlangt ───────────────────────────────────────
  let konf = null;
  if (mitKonferenz) {
    console.log("── Ideen-Konferenz ─────────────────────────────────────");
    konf = await konferenz({ api, mitarbeiter, kasse, spindAblage: SPIND_ABLAGE, datum, werkbank,
      grundsaetze: ladeGrundsaetze(),
      lage: arg("lage", "Die Werkstatt hat gerade nichts Angefangenes liegen.") });
    for (const z of konf.protokoll) console.log("  " + z);
    if (!konf.ok) {
      console.log(`\n⛔ Die Konferenz kam zu keinem Auftrag: ${konf.grund}\n`);
      process.exit(3);
    }
    console.log("\n  Punkte (eigene Stimmen zählen nicht mit):");
    for (const z of konf.tafel) console.log(`    ${z.punkte}  ${z.titel}  (${z.von})`);
    const schnitt = konf.eigenlob.filter((e) => e.differenz !== null);
    if (schnitt.length) {
      const mittel = schnitt.reduce((a, b) => a + b.differenz, 0) / schnitt.length;
      console.log(`  Selbstbevorzugung im Schnitt: ${mittel > 0 ? "+" : ""}${mittel.toFixed(2)} Punkte` +
        (mittel >= 1 ? "  ← jeder setzt sich deutlich obenauf" : ""));
    }
    if (konf.vorgemerkt?.length) {
      const g = konf.vorgemerkt.filter((v) => v.geschrieben).length;
      console.log(`\n  In die Merklisten: ${konf.vorgemerkt.length} nicht gewählte Vorschläge` +
        (g ? "" : " (trocken — nur gezählt, nichts geschrieben)"));
      for (const v of konf.vorgemerkt)
        console.log(`    ${v.male}×  ${v.titel}  (${v.von})`);
    }
    for (const h of konf.haenger || [])
      console.log(`  ⚠ Hänger: „${h.titel}" (${h.von}) zum ${h.male}. Mal — ` +
        `ab ${konf.haengerAb || "?"} ist das kein Gedächtnis mehr.`);
    console.log(`\n  Auftrag: ${konf.auftrag.ziel}`);
    console.log(`  Prüfmerkmal: ${konf.auftrag.pruefmerkmal}`);
    if (konf.verworfen.length)
      console.log(`  Verworfen: ${konf.verworfen.join(" · ")}`);
    console.log("");
    auftrag = konf.auftrag;

    schreibeKonferenz(konf, datum, trocken, kasse);

    if (nurPlan) {
      mkdirSync(dirname(PLAN), { recursive: true });
      writeFileSync(PLAN, planBlatt(konf, kasse, datum, trocken), "utf8");
      const k = kasse.bericht();
      eintragen({ art: "planmodus", echt: !trocken, datum, bericht: k, mitarbeiter,
        titel: konf.auftrag.sieger || konf.auftrag.titel || konf.auftrag.ziel || "",
        ergebnis: "Plan liegt in werkstatt/plan-offen.md" });
      if (!trocken) {
        kontingent.schreiben(KONTINGENT,
          kontingent.buchen(stand, datum, selbstzahler ? 0 : kasse.verbrauchtEur()));
        gaeste.schreiben(GAESTE, gaeste.buchen(gastStand, gast, kasse.verbrauchtEur()));
      }
      console.log("── Planmodus ───────────────────────────────────────────");
      console.log(`  Der Plan liegt in werkstatt/plan-offen.md.`);
      console.log(`  Gebaut wird er NICHT hier — das übernimmt eine Sitzung mit Werkzeugen.`);
      console.log(`\n  Verbraucht ${k.verbrauchtEur.toFixed(2)} € von ${k.deckelEur.toFixed(2)} € ` +
        `in ${k.minuten} Minuten (${k.aufrufe} Aufrufe).`);
      if (trocken) console.log("  Das war ein Trockenlauf. Für eine echte Konferenz: --echt");
      console.log("");
      return { planmodus: true, konferenz: konf, kasse: k };
    }
  } else {
    console.log(`  Auftrag:  ${auftrag.ziel}\n`);
  }

  // Waehrend die Schicht laeuft, wird der Zwischenstand in dieselbe Datei
  // geschrieben, die auch das Ergebnis traegt. Die Ansichtsseite liest sie
  // im Takt und sieht `laeuft: true` — mehr braucht ein Mitsehen nicht.
  mkdirSync(dirname(LAUF), { recursive: true });
  const lauf = await schicht({
    api, auftrag, mitarbeiter, kasse, spindAblage: SPIND_ABLAGE, datum, werkbank, arm,
    grundsaetze: ladeGrundsaetze(),
    aufZwischenstand: (z) => {
      try { writeFileSync(LAUF, JSON.stringify(z, null, 2) + "\n", "utf8"); }
      catch { /* ein Schreibfehler darf die Schicht nicht umwerfen */ }
    },
  });
  if (konf) lauf.konferenz = {
    tafel: konf.tafel, eigenlob: konf.eigenlob, verworfen: konf.verworfen,
    begruendung: konf.begruendung, protokoll: konf.protokoll,
    events: konf.events || [],
    vorgemerkt: konf.vorgemerkt || [], haenger: konf.haenger || [],
    haengerText: konf.haengerText || "",
  };

  writeFileSync(LAUF, JSON.stringify(lauf, null, 2) + "\n", "utf8");

  if (lauf.artefakt) {
    const ziel = join(WURZEL, "werkstatt", "entwurf", lauf.artefakt.dateiname);
    mkdirSync(dirname(ziel), { recursive: true });
    writeFileSync(ziel, lauf.artefakt.inhalt, "utf8");
    console.log(`  → werkstatt/entwurf/${lauf.artefakt.dateiname}`);
  }

  eintragen({ art: "schicht", echt: !trocken, datum, bericht: lauf.kasse, mitarbeiter,
    titel: auftrag.sieger || auftrag.titel || auftrag.ziel || "",
    ergebnis: lauf.artefakt ? `werkstatt/entwurf/${lauf.artefakt.dateiname}`
                            : (lauf.ergebnis && lauf.ergebnis.stand) || "" });
  if (!trocken) {
    kontingent.schreiben(KONTINGENT,
      kontingent.buchen(stand, datum, selbstzahler ? 0 : lauf.kasse.verbrauchtEur));
    gaeste.schreiben(GAESTE, gaeste.buchen(gastStand, gast, lauf.kasse.verbrauchtEur));
  }

  // ── Feierabend-Bericht ───────────────────────────────────────────────────
  const e = lauf.ergebnis, k = lauf.kasse;
  console.log("\n── Feierabend ──────────────────────────────────────────");
  console.log(`  ${e.fertig ? "✓ Ziel erreicht" : "○ noch nicht fertig"}` +
    `  ·  ${e.runden} Runde(n)  ·  Urteil: ${e.urteil || "—"}`);
  if (e.feierabendText) console.log(`  ${e.feierabendText}`);
  if (lauf.stand) {
    console.log(`\n  ${lauf.stand.stand}`);
    console.log(`  Nächster Schritt: ${lauf.stand.naechsterSchritt}`);
  }

  // Die Weitergabe-Angaben stehen hier, nicht nur in lauf.json. Ein Grundsatz,
  // dessen Antwort niemand zu Gesicht bekommt, wird beim nächsten Mal mit einer
  // Höflichkeit beantwortet — und dann misst er nichts mehr.
  if (lauf.weitergaben?.length) {
    console.log("\n  Was der Nächste damit zu tun hat:");
    for (const w of lauf.weitergaben)
      console.log(`    [Runde ${w.runde} · ${w.von}] ${w.text}`);
  }
  if (lauf.grundsaetze?.hinweis) console.log(`\n  ⚠ ${lauf.grundsaetze.hinweis}`);
  console.log(`\n  Verbraucht ${k.verbrauchtEur.toFixed(2)} € von ${k.deckelEur.toFixed(2)} € ` +
    `in ${k.minuten} Minuten (${k.aufrufe} Aufrufe).`);
  /*
   * WIE LANG DIE ANTWORTEN WAREN. Die Zahlen lagen seit jeher in `usage`, nur
   * las sie niemand: der Bericht kannte Euro und Minuten, nicht Text.
   *
   * DREI Spalten, weil eine irreführt. „aus" ist das saubere Maß; „ein" ist die
   * ABGERECHNETE Eingabe und enthält bei Werkzeug-Runden den Anfang mehrfach;
   * „Kontext" ist der größte Verlauf, den diese Rolle in EINEM Aufruf vor sich
   * hatte. Wer die drei zusammenwirft, meldet Gesamt-Kontext und nennt es
   * Ausgabe — genau das ist am 2026-09-04 passiert.
   */
  if (Object.keys(k.tokenJeRolle || {}).length) {
    console.log(`\n  Token je Rolle (aus = Ausgabe · ein = abgerechnete Eingabe,`
      + ` über Werkzeug-Runden summiert · Kontext = größter Verlauf in einem Aufruf):`);
    for (const [rolle, t] of Object.entries(k.tokenJeRolle))
      console.log(`    ${rolle.padEnd(14)} ${String(t.aus).padStart(7)} aus · `
        + `${String(t.ein).padStart(8)} ein · ${String(t.kontext).padStart(7)} Kontext`
        + `  (${t.aufrufe} Aufrufe)`);
  }
  if (!trocken) {
    const nachher = kontingent.lesen(KONTINGENT);
    console.log(`  Tageskontingent noch: ${kontingent.restAmTag(nachher, datum).toFixed(2)} €.`);
  }
  if (trocken) {
    console.log("  Das war ein Trockenlauf. Für eine echte Schicht: --echt");
  }
  console.log("");
  return lauf;
}

/**
 * Das Blatt, das die Konferenz an die Bau-Sitzung übergibt.
 *
 * Es trägt bewusst mehr als den Auftrag: die EINWÄNDE gegen den Sieger und das
 * VERWORFENE mit Begründung. Ohne die Einwände baut die nächste Hand genau die
 * Schwächen wieder ein, die hier schon jemand gesehen hat. Ohne das Verworfene
 * baut sie womöglich etwas, das die Runde bereits abgelehnt hat.
 */
/**
 * Die Konferenz als Daten — fuer die Ansichtsseite.
 *
 * Das Planblatt ist zum Lesen da, diese Datei zum Abspielen. Beide aus derselben
 * Konferenz; wer nur eine schreibt, hat spaeter zwei Wahrheiten.
 */
function schreibeKonferenz(konf, datum, trocken, kasse) {
  mkdirSync(dirname(KONF), { recursive: true });
  writeFileSync(KONF, JSON.stringify({
    laufVersion: "1.0", datum, art: trocken ? "trocken" : "echt",
    dauerMs: konf.dauerMs || 0,
    auftrag: konf.auftrag, begruendung: konf.begruendung || "",
    verworfen: konf.verworfen || [], tafel: konf.tafel || [],
    eigenlob: konf.eigenlob || [], vorschlaege: konf.vorschlaege || [],
    vorgemerkt: konf.vorgemerkt || [], haenger: konf.haenger || [],
    haengerAb: konf.haengerAb ?? null, haengerText: konf.haengerText || "",
    protokoll: konf.protokoll || [], events: konf.events || [],
    kasse: kasse.bericht(),
  }, null, 2) + "\n", "utf8");
}

function planBlatt(konf, kasse, datum, trocken) {
  const k = kasse.bericht();
  const sieger = konf.tafel[0];
  const z = [];
  z.push(`# Offener Plan — ${datum}`);
  if (trocken) z.push(`\n> **Trockenlauf.** Dieser Plan stammt aus hinterlegten Beispielen,`
    + ` nicht aus einer echten Konferenz. Nicht bauen.`);
  z.push(`\n## Auftrag\n\n${konf.auftrag.ziel}`);
  z.push(`\n## Prüfmerkmal\n\n${konf.auftrag.pruefmerkmal}`);
  z.push(`\n*Nachprüfbar, nicht „gut gemacht". Wer baut, misst am Ende hiergegen —`
    + ` und nicht am eigenen Eindruck.*`);
  z.push(`\n## Woher der Auftrag kommt\n`);
  z.push(`Vorgeschlagen von **${konf.auftrag.von}**, angenommen mit ${sieger.punkte} Punkten`
    + ` (eigene Stimmen zählen nicht mit).\n`);
  z.push(konf.begruendung);
  if (sieger.einwaende?.length) {
    z.push(`\n## Einwände gegen diesen Vorschlag\n`);
    z.push(`Sie sind **nicht** erledigt, nur benannt. Wer baut, nimmt sie mit`
      + ` oder schreibt hin, warum nicht.\n`);
    for (const e of sieger.einwaende) z.push(`- ${e}`);
  }
  if (konf.verworfen?.length) {
    z.push(`\n## Was NICHT gebaut wird\n`);
    for (const v of konf.verworfen) z.push(`- ${v}`);
  }
  if (konf.vorgemerkt?.length) {
    z.push(`\n## Was in die Merklisten gegangen ist\n`);
    z.push(`Nicht verloren, nur vertagt — beim jeweiligen Einbringer, mit den Einwänden`
      + ` dagegen. Wer einen davon wieder einbringt, nennt ihn beim Namen.\n`);
    for (const v of konf.vorgemerkt)
      z.push(`- **${v.titel}** *(${v.von})* — ${v.male}. Mal`
        + (v.punkte === null || v.punkte === undefined ? "" : `, ${v.punkte} Punkte`));
  }
  if (konf.haenger?.length) {
    z.push(`\n## Hänger\n`);
    z.push(`Gezählt, nicht geschätzt: diese Titel stehen zum ${konf.haengerAb ?? "?"}. Mal`
      + ` oder öfter auf dem Tisch und wurden wieder nicht gewählt. Das ist kein`
      + ` Gedächtnis mehr, sondern eine Schleife.\n`);
    for (const h of konf.haenger) z.push(`- **${h.titel}** *(${h.von})* — ${h.male}. Mal`);
    if (konf.haengerText) z.push(`\n${konf.haengerText}`);
  }
  z.push(`\n## Die Punkte\n`);
  for (const t of konf.tafel) z.push(`- **${t.punkte}** — ${t.titel} *(${t.von})*`);
  const el = konf.eigenlob.filter((e) => e.differenz !== null);
  if (el.length) {
    const m = el.reduce((a, b) => a + b.differenz, 0) / el.length;
    z.push(`\nSelbstbevorzugung im Schnitt: ${m > 0 ? "+" : ""}${m.toFixed(2)} Punkte`
      + ` — wie viel höher jeder den eigenen Vorschlag setzt als die der anderen.`);
  }
  z.push(`\n## Was diese Konferenz gekostet hat\n`);
  z.push(`${k.verbrauchtEur.toFixed(2)} € in ${k.aufrufe} Aufrufen.`);
  z.push(`\n---\n`);
  z.push(`## Für die Hand, die baut\n`);
  z.push(`**Ein Durchgang.** Bauen, dann geht es zurück an Vera und Sten zum`
    + ` Gegenprüfen. Findet Sten etwas Schweres, geht es an Klaus — nicht in`
    + ` Runde drei.\n`);
  z.push(`**Der PR bleibt Entwurf.** Nur Klaus setzt ihn auf fertig. Kein Ablauf`
    + ` darf das selbst tun.\n`);
  z.push(`**Gemessen wird gegen das Prüfmerkmal oben**, nicht gegen den eigenen`
    + ` Eindruck. Wer baut und danach berichtet, ist der Beteiligte, der sein`
    + ` eigenes Zeugnis schreibt — deshalb die Gegenprüfung.`);
  return z.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await main();
  } catch (e) {
    console.log("\n⛔ Die Schicht ist gescheitert:\n");
    console.log("   " + String(e.message).split("\n").join("\n   ") + "\n");

    const verbraucht = laufendeKasse ? laufendeKasse.verbrauchtEur() : 0;
    const aufrufe = laufendeKasse ? laufendeKasse.bericht().aufrufe : 0;

    if (!laufendeKasse || aufrufe === 0) {
      // Kein Aufruf ging hinaus — also ist auch nichts abgebucht worden. Das
      // gehört HINGESCHRIEBEN: „Connection error." allein lässt jemanden im
      // Unklaren, ob sein Guthaben gerade kleiner geworden ist.
      // ⚠ SAGT NUR, WAS SIE WEISS. Die erste Fassung schrieb „der Fehler steckt
      // in der Verbindung" — bei einer fehlenden Auftragsdatei ist das schlicht
      // falsch. Die Kasse weiss, dass nichts hinausging; woran es lag, weiss sie
      // nicht. Aufgefallen ist es, weil der Pfad wirklich gefahren wurde statt
      // nur gelesen.
      console.log("   Es ging kein einziger Aufruf hinaus — es wurde NICHTS bezahlt");
      console.log("   und nichts gebucht. Woran es lag, steht oben.\n");
    } else {
      console.log(`   Bis hierher verbraucht: ${verbraucht.toFixed(2)} € in ${aufrufe} Aufruf(en).`);
      console.log("   DAS GELD IST AUSGEGEBEN — es wird jetzt gebucht, damit die");
      console.log("   Buchhaltung nicht zu wenig meldet.\n");
      try {
        eintragen({ art: "abbruch", echt: !laufendeLage?.trocken,
          datum: laufendeLage?.datum, bericht: laufendeKasse.bericht(),
          mitarbeiter: laufendeLage?.mitarbeiter || [],
          ergebnis: `Abgebrochen: ${String(e.message).split("\n")[0]}` });
        if (!laufendeLage?.trocken) {
          const st = kontingent.lesen(KONTINGENT);
          kontingent.schreiben(KONTINGENT, kontingent.buchen(st,
            laufendeLage.datum, laufendeLage.selbstzahler ? 0 : verbraucht));
        }
      } catch (buchFehler) {
        // Nicht werfen. Der Abbruch ist schon schlimm genug; ein Fehler beim
        // Aufschreiben darf ihn nicht verdecken — aber er wird gesagt.
        console.log(`   ⚠ Und das Buchen ist auch gescheitert: ${buchFehler.message}\n`);
      }
    }
    process.exit(1);
  }
}
