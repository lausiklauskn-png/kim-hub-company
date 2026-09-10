/*
 * smoke_knoten.mjs — ist diese App wirklich ein SBKIM-Endknoten?
 *
 * Klaus 2026-09-08: „Beide Tools, Company und das Ausliefer-Tool, sollen als
 * eigenständige Knoten agieren … mit Zelle und auch dem Siegel. Und zwar nach
 * dem Bauplan von Sage-Protokoll."
 *
 * ⚠ DIE ARBEITSTEILUNG MIT KIMHUB GEHÖRT DAZU, sonst messen zwei Proben
 * dasselbe und keine das Fehlende:
 *
 *   Kimhub (smoke_company_form.mjs)  →  die KETTE in der abgeleiteten Seite:
 *                                        Vollständigkeit, Reihenfolge, die
 *                                        Schublade im Kopf. Reiner Text.
 *   HIER                             →  die DATEIEN: liegen sie da, sind sie
 *                                        byte-1:1 aus Sage, stehen sie im
 *                                        Offline-Vorrat, führt git sie, und
 *                                        passen die app-eigenen Werte
 *                                        zueinander.
 *
 * Keines ersetzt das andere. Eine Kette, die die richtigen Namen nennt, kann
 * auf fehlende Dateien zeigen; Dateien, die daliegen, können ungenannt bleiben.
 * Genau diese zwei Fehler haben verschiedene Ursachen und dieselbe Wirkung:
 * kein Knoten, und niemand bekommt eine Meldung.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pruefe as driftPruefe, KANON, SAGE_HERKUNFT } from "../tools/sbkim-drift.mjs";

export const NAME = "Der Knoten (SBKIM)";
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (...t) => readFileSync(join(WURZEL, ...t), "utf8");

/* Die netzweit VERGEBENEN Schubladen. Register: Sage-Protokol/sbkim/DB-SUFFIXE.md
   — diese Liste ist eine benannte KOPIE daraus, keine zweite Wahrheit. Sie steht
   hier, weil eine Probe nicht in ein fremdes Depot sehen kann.

   ⚠ SIE IST GEMESSEN, NICHT ABGESCHRIEBEN. Der Brief zu dieser Sitzung nannte
   16 vergebene Suffixe; über alle Klone gezählt sind es 22, und `toolpoint`
   gehört SB·KIMTool·Point, nicht PWA Toolpoint (das heisst `pwatoolpoint` und
   fehlte in der Liste ganz). Eine unvollständige Liste ist genau dann
   gefährlich, wenn sie beruhigt.
   Gezählt wird auf DREI Wegen, weil ein Suffix auf drei Wegen gesetzt wird —
   im `<head>`, als Konstante im Klebstoff, als Feld in einer Konfiguration.
   Wer nur den ersten nimmt, findet `companybrain` und `privatbrain` nicht. */
const VERGEBEN = [
  "alismoderaum",
  "blp",
  "bookledgerpro",
  "companybrain",
  "familyprojekt",
  "jasonstresor",
  "kimbell",
  "kimboard",
  "kimseek",
  "meintresor",
  "mixarium",
  "muttisrezeptbuch",
  "perfectskinbeauty",
  "perfectskinfashion",
  "privatbrain",
  "pwatoolpoint",
  "rezeptbuch",
  "sage",
  "tomyhub",
  "toolpoint",
  "workfloh",
  "workflohpage",
  "auslieferungspruefer",
];

const KLEBSTOFF = ["storage-init", "rendezvous-init", "schutz-init",
                   "nostr-listen-init", "siegel-inhalt"];

export async function lauf(ok) {
  /* ---- 1 · Die 13 Kanon-Module, byte-1:1 aus Sage ------------------------ */
  const d = driftPruefe();
  ok(`alle 13 Kanon-Module liegen da (${KANON.length} Einträge)`, d.fehlend.length === 0);
  ok("jedes trägt einen Fingerabdruck — ein leerer bewacht nichts", d.ungepinnt.length === 0);
  ok(`keines ist abgewandelt${d.abgewichen.length ? " — " + d.abgewichen.map((a) => a.datei).join(", ") : ""}`,
    d.abgewichen.length === 0);
  ok(`die Herkunft nennt einen Sage-Commit (${SAGE_HERKUNFT.commit})`,
    /^[0-9a-f]{7,40}$/.test(SAGE_HERKUNFT.commit) && !!SAGE_HERKUNFT.datum);

  /* ---- 2 · Die fünf Klebstoff-Dateien ------------------------------------
     Sie sind KEIN Kanon und werden absichtlich nicht gepinnt (sie tragen den
     Suffix, den Namen und die Beschreibung). Dass sie DA sind, ist trotzdem
     eine Zusicherung: ohne `schutz-init` gibt es kein Siegel, ohne
     `siegel-inhalt` ein Siegel ohne Andock-Werkzeug — ein Abzeichen. */
  const fehltKlebstoff = KLEBSTOFF.filter((g) => !existsSync(join(WURZEL, "sbkim", g + ".js")));
  ok(`die fünf app-eigenen Klebstoff-Dateien liegen da${fehltKlebstoff.length ? " — fehlt: " + fehltKlebstoff.join(", ") : ""}`,
    fehltKlebstoff.length === 0);

  /* ---- 3 · Die Schublade heisst ÜBERALL gleich ---------------------------
     ⚠ DREI STELLEN NENNEN SIE, UND SIE MÜSSEN ÜBEREINSTIMMEN. Der Kopf der
     Seite setzt den Vorgabe-Namen für Modul 01, `storage-init` ruft
     `init({dbSuffix})`, `rendezvous-init` gibt ihn an Modul 23 weiter. Laufen
     sie auseinander, öffnet die App zwei Schubladen und der Knoten hat zwei
     Identitäten — je nachdem, wer zuerst zugriff. Das ist genau der Befund
     vom 2026-08-16, nur eine Ebene tiefer. */
  const seite = lies("index.html");
  /* ⚠ DER MASSSTAB IST DIE SEITE, NICHT EINE ZAHL IN DIESER PROBE. Stünde der
     erwartete Wert hier als Konstante, prüfte die Probe nur ihre eigene
     Erinnerung: wer den Suffix netzweit doppelt vergibt, müsste ZWEI Stellen
     ändern, und die zweite wäre eine Probe — das fällt beim Lesen nie auf.
     Gelesen wird der Kopf der ausgelieferten Seite; alles andere muss sich
     danach richten. */
  const stellen = {
    /* ⚠ `var DB_SUFFIX`, NICHT NUR `DB_SUFFIX`. Die erste Fassung suchte
       `/DB_SUFFIX\s*=\s*"…"/` — und beide Dateien NENNEN im Kopf-Kommentar
       `window.SBKIM_DB_SUFFIX = "kimhubcompany"`. Gelesen wurde also der
       Kommentar; der Gegenprobe-Fall „der Suffix läuft auseinander" rutschte
       durch. Dieselbe Falle wie beim Wizard eine Kachel weiter unten. */
    "sbkim/storage-init.js": (lies("sbkim", "storage-init.js").match(/\bvar DB_SUFFIX\s*=\s*"([a-z0-9_-]+)"/) || [])[1],
    "sbkim/rendezvous-init.js": (lies("sbkim", "rendezvous-init.js").match(/\bvar DB_SUFFIX\s*=\s*"([a-z0-9_-]+)"/) || [])[1],
  };
  const SUFFIX = (seite.match(/<script>\s*window\.SBKIM_DB_SUFFIX\s*=\s*"([a-z0-9_-]+)"/) || [])[1] || "";
  const abweichend = Object.entries(stellen).filter(([, v]) => v !== SUFFIX).map(([k, v]) => `${k}=${v}`);
  ok(`alle drei Stellen nennen dieselbe Schublade „${SUFFIX}"${abweichend.length ? " — " + abweichend.join(", ") : ""}`,
    !!SUFFIX && abweichend.length === 0);
  ok(`… und „${SUFFIX}" war netzweit noch nicht vergeben`,
    !!SUFFIX && !VERGEBEN.includes(SUFFIX));

  /* ---- 4 · Die Bedeutungs-Beschreibung ----------------------------------
     ⚠ SIE IST KEINE ZIERDE. Modul 03 rechnet daraus den Domänen-Vektor, Modul
     04 vergleicht damit. Ein Satz oder ein leeres Feld ergibt einen Knoten,
     der zu allem und zu nichts passt — und der findet die falschen Nachbarn,
     ohne dass es jemandem auffällt.

     ⚠ UND SIE STEHT AN ZWEI STELLEN, weil es zwei Wege zur Spore gibt: das
     Verbinden-Fenster (`rendezvous-init`) und den Andock-Wizard im Siegel
     (`siegel-inhalt`). Zwei Beschreibungen ergäben zwei VERSCHIEDENE Vektoren
     für denselben Knoten, je nachdem, über welchen Weg die Spore entstand.
     Verglichen wird deshalb der Text, nicht seine Anwesenheit. */
  const holBeschreibung = (t) => {
    /* Aus `rendezvous-init` kommt sie als mehrteilige Zeichenkette („…" + „…"),
       aus `siegel-inhalt` als eine. Zusammengesetzt wird hier, nicht dort —
       eine zweite Fassung in EINER Zeile wäre unlesbar. */
    const m = t.match(/domainDescription:\s*([\s\S]*?),\n\s*domainKeywords/);
    if (!m) return "";
    return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]).join("");
  };
  const bRdv = holBeschreibung(lies("sbkim", "rendezvous-init.js"));
  const bSieg = holBeschreibung(lies("sbkim", "siegel-inhalt.js"));
  ok(`die Beschreibung trägt Substanz (${bRdv.length} Zeichen, mehr als ein Satz)`,
    bRdv.length > 400 && bRdv.split(/[.!?]\s/).length >= 4);
  ok("… und sie steht in beiden Wegen zur Spore WORTGLEICH da",
    !!bRdv && bRdv === bSieg);
  /* ⚠ VIER DINGE MÜSSEN NAMENTLICH DARIN STEHEN (Klaus 2026-09-09).
     Er hat die Beschreibung zweimal beanstandet, und beide Male fehlte etwas,
     das kein Wächter verlangt hatte: erst der NAME des Werkzeugs, dann der
     ZWECK und die FORSCHUNG. Sein Wort: *„die Beschreibung ist mager, sie
     erwähnt die Forschung nicht, dass brauchbare Werkzeuge hergestellt werden,
     mit agentenbasiertem Matching … SBKIM Bestandteil der Sage-Forschung"* und
     *„es muss zusätzlich der Zweck angegeben werden."*

     ⚠ EINE LÄNGENPRÜFUNG FÄNGT DAS NICHT. 1851 Zeichen sahen aus wie Substanz,
     und der Zweck stand trotzdem nirgends — eine Zahl misst Umfang, nicht
     Inhalt. Gemessen werden deshalb die vier Sachen selbst, jede einzeln, mit
     eigenem Namen in der roten Zeile. Wer eine herausnimmt, sieht welche.

     Gemessen wird der BEGRIFF, nicht die Formulierung: ein Wächter, der einen
     Satz festnagelt, verbietet das nächste Richtigstellen. */
  for (const [was, muster] of [
    ["den Namen des Werkzeugs", /Kim Hub Company/],
    ["den ZWECK ausdrücklich", /\bZWECK\b/i],
    ["die Forschung und das Protokoll", /SBKIM-Protokoll/],
    ["agentenbasiertes Matching", /agentenbasiert\w*\s+Matching/i],
  ]) ok(`die Beschreibung nennt ${was}`, muster.test(bRdv));

  ok("… die Stichworte ebenso, und es sind mehr als eine Handvoll",
    (lies("sbkim", "rendezvous-init.js").match(/domainKeywords/) ? true : false) &&
    (lies("sbkim", "siegel-inhalt.js").match(/"BYOK"/) ? true : false) &&
    (lies("sbkim", "rendezvous-init.js").match(/"BYOK"/) ? true : false));

  /* ---- 5 · Das Siegel trägt das Andock-Werkzeug, nicht nur ein Abzeichen --
     „mit Zelle und auch dem Siegel" heisst Modul 16 MIT dem Wizard darin. Der
     IDENTITÄTS-WECHSLER (Baustein 5) fehlt in frühen Kopien am häufigsten —
     deshalb wird er einzeln genannt und nicht in einer Summe mitgezählt. */
  const wiz = lies("sbkim", "siegel-inhalt.js");
  /* ⚠ DIESE FÜNF WÄCHTER WAREN ZUERST ALLE BLIND, und die Gegenprobe hat es
     gemeldet („TOTER ANKER"). Sie suchten die Namen aus dem Sage-Original
     (`andockStep1Identity` …) — und die stehen in dieser Datei ausschliesslich
     im KOPF-KOMMENTAR, der die Herkunft nennt. Fünf grüne Haken über einer
     Datei, in der keiner der Namen als Code vorkommt.

     Gemessen wird jetzt, was der Nutzer wirklich bekommt: das Bedienelement UND
     seine Verdrahtung. Ein Knopf ohne `addEventListener` ist ein toter Knopf,
     und ein toter Knopf mit Beschriftung ist die schlimmste Sorte — er sieht
     aus wie Hilfe. */
  const verdrahtet = (id) => wiz.includes(`"#${id}"`) &&
    new RegExp(`#${id}"\\)\\.addEventListener|#${id}"\\)\\s*\\.addEventListener`).test(wiz);
  for (const [was, id] of [
    ["Identität erzeugen", "sbwiz-s1"],
    ["Spore signieren und herunterladen", "sbwiz-s2"],
    ["verschlüsselte Sicherung", "sbwiz-s3"],
    ["Wiederherstellen", "sbwiz-s4"],
    ["Identitäts-Wechsler", "sbwiz-idsel"],
  ]) ok(`der Andock-Wizard hat den Baustein „${was}" — mit Element UND Verdrahtung`,
    wiz.includes(`id="${id}"`) && verdrahtet(id));
  /* Und der Wechsler wechselt wirklich, statt nur eine Liste zu zeigen. Sein
     Versprechen ist zweiteilig: die aktive Kennung umstellen und dabei NICHTS
     löschen — die zweite Hälfte ist der Grund, warum man ihn gefahrlos anfassen
     darf. */
  /* ⚠ MIT KLAMMER. Ohne sie ist `switchWizardIdentityAbgeschaltet` von
     `switchWizardIdentity` nicht zu unterscheiden — der Gegenprobe-Fall
     rutschte genau daran durch. Ein Name, der der ANFANG eines anderen ist,
     ist in dieser Sitzung dreimal zugeschnappt. */
  ok("… und der Wechsler stellt die aktive Kennung wirklich um",
    /\bfunction switchWizardIdentity\s*\(/.test(wiz));

  /* `ribbonText` ist Pflicht — ohne ihn bleibt das Band im Wappen LEER. Modul
     16 leitet bewusst nichts aus dem Repo-Namen ab: auf eine Auszeichnung
     gehört kein geratener Name. */
  ok("das Wappen-Band ist graviert (`ribbonText` gesetzt)",
    /ribbonText:\s*"KIM HUB COMPANY"/.test(lies("sbkim", "schutz-init.js")));

  /* ---- 6 · Der Gerätename hängt per Glue INS Panel ----------------------
     Netzweite Bauregel (INTERFACES § 11.7). Wer ihn in die byte-kopierte
     Panel-Datei schreibt, erzeugt eine zweite Modul-Generation — und der
     Drift-Guard schlägt zu Recht an. Gemessen wird BEIDES: dass der Glue ihn
     hineinhängt UND dass die Kanon-Datei unberührt ist. Nur die zweite Hälfte
     unterscheidet „richtig gebaut" von „an der falschen Stelle gebaut". */
  const rdv = lies("sbkim", "rendezvous-init.js");
  /* ⚠ GEMESSEN WIRD DAS SETZEN DER MARKE, nicht ihre Nennung. Die erste
     Fassung suchte `/data-sbkim-geraetename/` — und der Erklär-Kommentar über
     der Funktion nennt sie. Der Gegenprobe-Fall „das Feld wird nicht mehr
     eingehängt" rutschte durch. */
  ok("der app-eigene Glue hängt das Gerätenamen-Feld ins Verbinden-Panel",
    /setAttribute\("data-sbkim-geraetename"/.test(rdv) &&
    /getElementById\("sbkim-rdv-panel"\)/.test(rdv) &&
    /panel\.insertBefore/.test(rdv));
  /* ⚠ BENANNTE ÜBERDECKUNG. Jede Änderung an einer Kanon-Datei fängt schon der
     Drift-Guard oben — dieser Wächter ist deshalb nicht ISOLIERT messbar. Er
     steht trotzdem da, weil er etwas anderes leistet: er sagt, WARUM die
     Änderung falsch war. Eine rote Zeile „Fingerabdruck abgewichen" schickt
     eine Sitzung zum Nachziehen des Abdrucks; diese hier schickt sie in den
     Glue. Gemessen wird das SETZEN, symmetrisch zur Zeile darüber — nicht die
     Nennung, sonst verbietet der Wächter einen Kommentar im Kanon. */
  ok("… und die byte-kopierte Panel-Datei legt selbst KEIN eigenes Feld an",
    !/setAttribute\(\s*["']data-sbkim-geraetename/.test(lies("sbkim", "23_rendezvous_ui.js")));
  /* Der Name geht NUR an Anzeige und Anmeldung, NIE an `generateOwnSpore` —
     sonst wäre jede Namensänderung ein Re-Sign, und der Name ist ein Hinweis,
     kein Vertrauens-Beweis. Gemessen am Aufruf, nicht am Vorsatz. */
  const iGen = rdv.indexOf("generateOwnSpore({");
  const genBlock = iGen >= 0 ? rdv.slice(iGen, rdv.indexOf("});", iGen)) : "";
  ok("der Gerätename geht NICHT in die signierte Spore",
    genBlock.length > 100 && !/anzeigeName|geraetename/.test(genBlock));

  /* ---- 7 · Alles im Offline-Vorrat, auf der Platte UND von git geführt ---
     Falle 4 aus Sages LEHREN § 4. Drei Fragen, drei verschiedene Fehler mit
     derselben Wirkung: `c.add()` schluckt einen Fehlschlag einzeln, damit eine
     fehlende Datei nicht die Installation umwirft — genau deshalb fällt eine
     vergessene Datei sonst NICHT auf. Und die Platte ist nicht das Depot: am
     2026-09-05 lag `schluesseltresor.js` hier, war aber nie eingecheckt. */
  const sw = lies("sw.js");
  const knotenDateien = [...KANON.map((k) => k.datei),
    ...KLEBSTOFF.map((g) => `sbkim/${g}.js`)];
  const fehltVorrat = knotenDateien.filter((g) => !sw.includes(`"./${g}"`));
  ok(`jede Knoten-Datei steht im Offline-Vorrat${fehltVorrat.length ? " — fehlt: " + fehltVorrat.join(", ") : ""}`,
    fehltVorrat.length === 0);
  const fehltPlatte = knotenDateien.filter((g) => !existsSync(join(WURZEL, g)));
  ok(`jede liegt auch wirklich da${fehltPlatte.length ? " — fehlt: " + fehltPlatte.join(", ") : ""}`,
    fehltPlatte.length === 0);
  const gefuehrt = new Set(execFileSync("git", ["-C", WURZEL, "ls-files"], { encoding: "utf8" })
    .split("\n").filter(Boolean));
  const nichtGefuehrt = knotenDateien.filter((g) => !gefuehrt.has(g));
  ok(`jede wird auch von git geführt${nichtGefuehrt.length ? " — NUR auf der Platte: " + nichtGefuehrt.join(", ") : ""}`,
    nichtGefuehrt.length === 0);

  /* ---- 8 · Was NICHT im Depot liegt ------------------------------------
     ⚠ KEINE ERFUNDENE SPORE. Klaus erzeugt sie im Browser, der private
     Schlüssel bleibt dort. Eine Datei, die aussieht wie eine Identität, ist
     schlimmer als keine — sie beantwortet die Frage „hat dieser Knoten eine
     Kennung?" mit einem Ja, das niemand geprüft hat.
     Gemessen wird das DEPOT, nicht die Platte: was ein Besucher bekommt, ist
     das, was `git` führt. */
  const verdaechtig = [...gefuehrt].filter((f) => /(^|\/)spore\.json$/.test(f));
  ok(`keine erfundene Spore im Depot${verdaechtig.length ? " — " + verdaechtig.join(", ") : ""}`,
    verdaechtig.length === 0);
  const mitSchluessel = knotenDateien.filter((f) => /sk-ant-api|BEGIN [A-Z ]*PRIVATE KEY/.test(lies(f)));
  ok(`kein Schlüssel in einer Knoten-Datei${mitSchluessel.length ? " — " + mitSchluessel.join(", ") : ""}`,
    mitSchluessel.length === 0);

  /* ---- 9 · Der Knoten ist Empfangsmodus, kein Crawler -------------------
     Sages Verfassung: „Kein Crawler, keine Pulsation, keine Eigenanfragen ins
     offene Netz. Der Knoten ist Empfangsmodus mit Antwortrecht." Gemessen wird
     die Zusicherung im Glue, das das Lauschen startet — dass es LAUSCHT und
     nicht von selbst ANMELDET. */
  const lauschen = lies("sbkim", "nostr-listen-init.js");
  ok("der Knoten lauscht und antwortet, statt von selbst anzufragen",
    /listenNostr/.test(lauschen) && !/announce|publishOwn|connectTo/.test(lauschen));
  /* Und Modul 23 legt beim Start KEINE Identität wortlos an (netzweite Stufe
     0b, 2026-07-30): aus einem Speicher-Problem wurde sonst unbemerkt ein
     Identitäts-Wechsel. Gemessen an der Abwesenheit von `ensureIdentity` im
     Init-Aufruf — die Zeile, die es früher tat. */
  const iInit = rdv.indexOf("SbkimRendezvous.init({");
  const initBlock = iInit >= 0 ? rdv.slice(iInit, rdv.indexOf("});", iInit)) : "";
  ok("Modul 23 legt beim Seitenstart keine Kennung wortlos an",
    initBlock.length > 50 && !/ensureIdentity:\s*(true|function)/.test(initBlock));

  /* ---- Welcher Text im Beschreibungs-Feld steht --------------------------
     ⚠ Klaus hat es ZWEIMAL gesagt, und beim zweiten Mal deutlich: „Wolltest du
     nicht den neuen Text AUTOMATISCH in das Siegel einfügen?" — und: „nicht mal
     der Name steht drin."

     Der erste Bau zeigte die GESPEICHERTE Spore und stellte einen Knopf daneben,
     der den Text der App hereinholte. An seinem Schirm gemessen: Hinweis da,
     Knopf da — und trotzdem der alte Text im Feld, weil er erst einen zweiten
     Knopf finden und drücken musste. **Wer „automatisch" bittet und einen Knopf
     bekommt, hat nicht bekommen, worum er gebeten hat.**

     Jetzt gewinnt der Vorschlag der App, und der zuletzt signierte Text ist der,
     den ein Knopf zurückholt. Vier Zusicherungen, die einander NICHT abdecken. */
  const sieg = lies("sbkim", "siegel-inhalt.js");

  /* ⚠ GEMESSEN AN SEINER STELLE, NICHT IRGENDWO IN DER DATEI. Die erste Fassung
     dieses Wächters suchte `ta.value = WIZ.domainDescription;` frei und blieb
     grün, als die Vorbelegung ausgebaut war — sie fand die Stelle im Knopf.
     Gefunden hat es die Gegenprobe, nicht das Nachdenken. */
  const iFeld = sieg.indexOf('ta.id = "sbkim-si-semantik-text"');
  const iHerk = sieg.indexOf("var herkunft = document.createElement");
  const vorbelegung = iFeld >= 0 && iHerk > iFeld ? sieg.slice(iFeld, iHerk) : "";
  ok("das Feld zeigt den Vorschlag der App",
    vorbelegung.length > 0 && /ta\.value\s*=\s*WIZ\.domainDescription\s*;/.test(vorbelegung));

  /* ⚠ UND DIE GESPEICHERTE SPORE UEBERSCHREIBT IHN NICHT MEHR. Genau das war
     der Fehler: `ta.value = sp.domainDescription` im Lade-Pfad. Der Wert darf
     nur noch auf Knopfdruck ins Feld. */
  const iLade = sieg.indexOf("getOwnSpore()");
  const iEnde = sieg.indexOf('ta.addEventListener("input"', iLade);
  const ladePfad = iLade >= 0 && iEnde > iLade ? sieg.slice(iLade, iEnde) : "";
  const imKnopf = /zurueck\.addEventListener[\s\S]{0,200}?ta\.value\s*=\s*eigener\s*;/.test(ladePfad);
  const stilleZuweisungen = (ladePfad.match(/ta\.value\s*=/g) || []).length;
  ok("… und die gespeicherte Spore überschreibt ihn NICHT mehr von selbst",
    ladePfad.length > 0 && imKnopf && stilleZuweisungen === 1);

  /* ⚠ Der Wächter hängt an der MARKE, nicht am Satz — ein Wächter, der eine
     Formulierung festnagelt, verbietet das nächste Richtigstellen. */
  ok("eine Zeile nennt, WELCHER der beiden Texte im Feld steht",
    /data-woher/.test(sieg)
    && /setAttribute\("data-woher",\s*"app"\)/.test(sieg)
    && /setAttribute\("data-woher",\s*"spore"\)/.test(sieg));

  /* ⚠ Der Knopf erscheint nur bei Abweichung: wer zuletzt mit genau diesem
     Vorschlag signiert hat, braucht keinen — und einer, der immer dasteht, ist
     bald einer, den niemand mehr liest. Gemessen wird der Vergleich der TEXTE,
     nicht ob eine Spore da ist. */
  ok("der Knopf holt den eigenen Text zurück und zeigt sich nur bei Abweichung",
    /id\s*=\s*"sbkim-si-semantik-eigener-text"/.test(sieg)
    && /zurueck\.hidden\s*=\s*true\s*;/.test(sieg)
    && /abweichend\s*=[\s\S]{0,120}?eigener\.trim\(\)\s*!==/.test(sieg)
    && /if\s*\(!abweichend\)\s*return\s*;/.test(sieg)
    && /zurueck\.hidden\s*=\s*false\s*;/.test(sieg));
}
