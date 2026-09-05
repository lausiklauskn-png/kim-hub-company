#!/usr/bin/env node
/*
 * probe-api.mjs — EIN echter Aufruf, so klein wie möglich.
 *
 * WOFÜR. Bis hierher hat `EchteApi` nie gearbeitet. Die Trockenschicht beweist
 * die Kette, nicht den Draht nach draußen. Bevor eine ganze Schicht Geld
 * ausgibt, wird der Draht mit einem Aufruf geprüft, der Bruchteile eines Cents
 * kostet — und zwar auf vier Dinge zugleich:
 *
 *   1. Nimmt der Schlüssel an?
 *   2. Kommt die Antwort GEPRÜFT gegen unser Schema zurück?
 *   3. Meldet die API `usage` in der Form, mit der unsere Bremse rechnet?
 *   4. Stimmt unsere Kosten-Rechnung mit echten Zahlen überein?
 *
 * Punkt 3 und 4 sind der eigentliche Grund. Eine Bremse, die gegen erfundene
 * Token-Zahlen geprüft wurde, ist eine Bremse gegen erfundene Zahlen.
 *
 * Lauf:  node schicht/probe-api.mjs
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EchteApi } from "./api.mjs";
import { kostenUsd, PREISE } from "./kosten.mjs";
import { macheWerkbank } from "./werkzeuge.mjs";
import { dateiBaum } from "./baum-datei.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * `--werkzeuge` — die EINE Frage, die eine ganze Schicht sonst teuer beantwortet.
 *
 * Ob `tools` und `output_config.format` (das erzwungene JSON) zusammen gehen,
 * sagt die SDK-Doku NICHT. Sie zeigt beides getrennt, und für Zitate ist die
 * Kombination ausdrücklich verboten (400). Die SDK-Typen führen beide Felder an
 * derselben Schnittstelle — das ist ein Beleg, kein Beweis: der Typ beschreibt,
 * was man schicken DARF, nicht was der Server annimmt.
 *
 * Also wird es hier mit EINEM Aufruf am billigsten Modell geprüft, statt mit
 * einer Schicht für fünf Euro. Der Auftrag ist so gewählt, dass das Modell
 * greifen MUSS: die Antwort steht in einer Datei, nicht im Modell.
 */
const MIT_WERKZEUGEN = process.argv.includes("--werkzeuge");
const AUFSCHLAG = process.argv.includes("--aufschlag");
const MODELL = process.argv.find((a) => a.startsWith("claude-")) || "claude-haiku-4-5";

/*
 * EIN SCHALTER, DEN DAS PROGRAMM NICHT KENNT, DARF NICHT STILL DURCHGEHEN.
 *
 * Am 2026-08-23 ist genau das passiert: nach einem force-push scheiterte Klaus'
 * `git pull` an auseinandergelaufenen Zweigen, sein Arbeitsstand blieb alt — und
 * `--aufschlag` war dort noch unbekannt. Die alte Fassung hat den Schalter
 * schlicht ignoriert, den EINFACHEN Lauf gefahren und Geld gekostet, ohne die
 * gestellte Frage zu beantworten. Die Ausgabe sah dabei völlig richtig aus.
 *
 * Deshalb zwei Dinge: unbekannte Schalter brechen ab, und der Kopf nennt den
 * Stand, auf dem gelaufen wird. Wer eine alte Fassung fährt, sieht es.
 */
const BEKANNT = ["--werkzeuge", "--aufschlag"];
const fremd = process.argv.slice(2)
  .filter((a) => a.startsWith("--") && !BEKANNT.includes(a));
if (fremd.length) {
  console.log(`\n⛔ Unbekannter Schalter: ${fremd.join(" ")}`);
  console.log(`   Bekannt sind: ${BEKANNT.join(" · ")}`);
  console.log(`   Nichts ausgeführt, nichts bezahlt. Steht der Schalter richtig da,`);
  console.log(`   läuft hier eine ALTE Fassung — dann erst \`git pull\`.\n`);
  process.exit(2);
}

/** Auf welchem Stand läuft das hier? Ohne die Angabe sieht ein Lauf auf einer
 *  veralteten Arbeitskopie genauso aus wie einer auf der aktuellen. */
function standJetzt() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: WURZEL, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch { return "unbekannt"; }
}

const SCHEMA = MIT_WERKZEUGEN ? {
  type: "object", additionalProperties: false,
  required: ["name", "wie_gefunden"],
  properties: {
    name: { type: "string", description: "Der Wert des Feldes \"name\" aus package.json." },
    wie_gefunden: { type: "string", description: "Welches Werkzeug du benutzt hast." },
  },
} : {
  type: "object", additionalProperties: false,
  required: ["antwort", "zahl"],
  properties: {
    antwort: { type: "string", description: "Das Wort „bereit“ und sonst nichts." },
    zahl: { type: "integer", description: "Die Zahl 7." },
  },
};

console.log("\n" + (AUFSCHLAG
  ? "API-PROBE — GEZÄHLT, nicht erzeugt"
  : `API-PROBE — ein Aufruf an ${MODELL}` +
    (MIT_WERKZEUGEN ? "  ·  MIT WERKZEUGEN" : "")) +
  `   [Stand ${standJetzt()}]\n`);
if (MIT_WERKZEUGEN) {
  console.log("  Geprüft wird die benannte Annahme aus api.mjs: vertragen sich");
  console.log("  `tools` und das erzwungene JSON? Ein Aufruf statt einer Schicht.\n");
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.log("⛔ Kein ANTHROPIC_API_KEY gesetzt.\n");
  console.log("   In Termux, ohne dass der Schlüssel in der Befehls-Historie landet:");
  console.log("     read -rsp 'Schlüssel: ' ANTHROPIC_API_KEY && export ANTHROPIC_API_KEY && echo\n");
  process.exit(2);
}

/*
 * ── `--aufschlag` ─────────────────────────────────────────────────────────
 *
 * Was kosten die Werkzeuge, auch wenn keines gerufen wird?
 *
 * WARUM NICHT AUS ZWEI LÄUFEN ABGELESEN. Am 2026-08-23 lagen zwei Messungen
 * vor: 254 Eingabe-Token ohne Werkzeuge, 3 118 mit. Die Differenz sieht wie
 * der Aufschlag aus und ist keiner — die Fragen waren verschieden, das
 * Werkzeug-Ergebnis (der Dateiinhalt) kam mit in die Unterhaltung, und der
 * Werkzeug-Lauf hatte ZWEI Runden, deren Eingabe summiert wird: die zweite
 * enthält die erste noch einmal. Der Anfang wird doppelt gezählt.
 *
 * Hier wird deshalb DIESELBE Anfrage viermal gezählt — nur die Werkzeuge und
 * der Hinweis unterscheiden sich. Gezählt, nicht erzeugt: `count_tokens`
 * schreibt keine Antwort und kostet entsprechend fast nichts.
 */
if (AUFSCHLAG) {
  const { system: baueSystem } = await import("./rollen.mjs");
  const { werkzeugHinweis } = await import("./ruf.mjs");
  const mitarbeiter = JSON.parse(
    readFileSync(join(WURZEL, "schicht", "mitarbeiter.json"), "utf8")).mitarbeiter;

  const api2 = new EchteApi();
  const lesend = macheWerkbank({ baum: dateiBaum(WURZEL) });
  const mitNetz = macheWerkbank({ baum: dateiBaum(WURZEL), netz: true });

  console.log("AUFSCHLAG DER WERKZEUGE — gezählt, nicht erzeugt\n");
  console.log("  Dieselbe Anfrage, viermal gezählt. Nur die Werkzeuge und der");
  console.log("  Hinweis in der Anweisung unterscheiden sich.\n");

  const frage = [{ role: "user", content:
    "Baue eine kurze Karte für den Marktplatz. Zwei Sätze reichen." }];

  const zeilen = [];
  for (const m of mitarbeiter) {
    const grund = baueSystem(m, "");
    const mitHinweis = grund + werkzeugHinweis(lesend);
    let ohne, mitW, mitWH, mitNetzW;
    try {
      ohne     = await api2.zaehleTokens({ modell: m.modell, system: grund, nachrichten: frage });
      mitW     = await api2.zaehleTokens({ modell: m.modell, system: grund, nachrichten: frage, werkbank: lesend });
      mitWH    = await api2.zaehleTokens({ modell: m.modell, system: mitHinweis, nachrichten: frage, werkbank: lesend });
      mitNetzW = await api2.zaehleTokens({ modell: m.modell, system: grund + werkzeugHinweis(mitNetz), nachrichten: frage, werkbank: mitNetz });
    } catch (e) {
      console.log(`  ⛔ Zählen gescheitert bei ${m.rolle}: ${e.message}\n`);
      process.exit(1);
    }
    zeilen.push({ rolle: m.rolle, name: m.name, modell: m.modell,
                  ohne, mitW, mitWH, mitNetzW });
  }

  const b = (n) => String(n).padStart(6);
  console.log("  Rolle          Modell              ohne   +Werkz.  +Hinweis   +Netz");
  console.log("  " + "─".repeat(68));
  for (const z of zeilen)
    console.log(`  ${(z.name + " (" + z.rolle + ")").padEnd(22).slice(0, 22)} ` +
      `${z.modell.replace("claude-", "").padEnd(12)}` +
      `${b(z.ohne)}  ${b(z.mitW)}  ${b(z.mitWH)}  ${b(z.mitNetzW)}`);

  // Der Aufschlag ist bei allen Rollen derselbe Text — deshalb wird der
  // KLEINSTE und der GRÖSSTE genannt statt eines Mittels, das keiner zahlt.
  const aufDefs = zeilen.map((z) => z.mitW - z.ohne);
  const aufGanz = zeilen.map((z) => z.mitWH - z.ohne);
  const aufNetz = zeilen.map((z) => z.mitNetzW - z.ohne);
  const spanne = (a) => Math.min(...a) === Math.max(...a)
    ? `${Math.min(...a)}` : `${Math.min(...a)}–${Math.max(...a)}`;

  console.log("\n  DER AUFSCHLAG, je Runde und Rolle:");
  console.log(`    nur die Werkzeug-Beschreibungen   ${spanne(aufDefs)} Token`);
  console.log(`    dazu der Hinweis in der Anweisung ${spanne(aufGanz)} Token`);
  console.log(`    mit Netz (vier statt drei)        ${spanne(aufNetz)} Token`);

  // Was das in einer Schicht ausmacht — je Rolle mit IHREM Preis gerechnet,
  // nicht mit einem Mischpreis, den niemand zahlt.
  const RUNDEN_JE_ROLLE = 19 / zeilen.length;
  let usdGanz = 0, usdNetz = 0;
  for (const z of zeilen) {
    const p = PREISE[z.modell];
    usdGanz += ((z.mitWH - z.ohne) * RUNDEN_JE_ROLLE * p.ein) / 1e6;
    usdNetz += ((z.mitNetzW - z.ohne) * RUNDEN_JE_ROLLE * p.ein) / 1e6;
  }
  console.log(`\n  Hochgerechnet auf eine Schicht mit 19 Aufrufen:`);
  console.log(`    mit Lese-Werkzeugen   ${(usdGanz * 100).toFixed(3)} Cent`);
  console.log(`    mit Netz zusätzlich   ${(usdNetz * 100).toFixed(3)} Cent`);
  console.log(`\n  ⚠ EHRLICH DAZU: das ist der Aufschlag, wenn KEIN Werkzeug gerufen`);
  console.log(`    wird. Wird eines gerufen, kommt eine ganze weitere Runde dazu —`);
  console.log(`    samt allem, was vorher schon dastand, und dem Gelesenen. DAS ist`);
  console.log(`    der grosse Posten, und er hängt davon ab, wie oft die Rollen`);
  console.log(`    greifen. Diese Zahl hier ist die UNTERGRENZE.\n`);
  process.exit(0);
}

const api = new EchteApi();
const werkbank = MIT_WERKZEUGEN ? macheWerkbank({ baum: dateiBaum(WURZEL) }) : null;
const begonnen = Date.now();
let antwort;
try {
  antwort = await api.frage({
    modell: MODELL, aufwand: "low", werkbank,
    system: "Du antwortest knapp und hältst dich genau an das Schema.",
    nachrichten: [{ role: "user", content: MIT_WERKZEUGEN
      ? "Lies die Datei package.json im Depot und nenne den Wert des Feldes \"name\". " +
        "Rate nicht — benutze das Werkzeug."
      : "Sag „bereit“ und gib die Zahl 7 zurück." }],
    schema: SCHEMA,
  });
} catch (e) {
  console.log("⛔ Der Aufruf ist gescheitert:\n");
  console.log("   " + String(e.message).split("\n").join("\n   "));
  if (MIT_WERKZEUGEN) {
    console.log("\n   DAS IST DIE ANTWORT AUF DIE FRAGE, wenn oben ein 400 steht und");
    console.log("   `output_config` darin vorkommt: die beiden vertragen sich NICHT.");
    console.log("   Dann fahren die Schichten weiter mit --ohne-werkzeuge, und der");
    console.log("   Umbau ist: Werkzeuge ohne erzwungenes Schema, JSON am Ende selbst");
    console.log("   lesen (leseInhalt kann das bereits).");
  }
  console.log("\n   Nichts wurde abgebucht, außer die API hat den Aufruf angenommen");
  console.log("   und erst danach abgebrochen — das stünde in der Meldung.\n");
  process.exit(1);
}

const dauer = ((Date.now() - begonnen) / 1000).toFixed(1);
const u = antwort.usage || {};
const usd = kostenUsd(MODELL, u);

console.log("✓ Der Draht steht.\n");

if (MIT_WERKZEUGEN) {
  // DIE EIGENTLICHE AUSKUNFT. „Kein 400" beantwortet nur die halbe Frage —
  // die andere Hälfte ist, ob das Modell die Werkzeuge auch WIRKLICH benutzen
  // konnte. Eine Antwort, die stimmt, weil das Modell den Namen erraten hat,
  // beweist gar nichts. Deshalb wird gegen die echte Datei verglichen.
  const echt = JSON.parse(readFileSync(join(WURZEL, "package.json"), "utf8")).name;
  const rufe = antwort.werkzeugRufe || 0;
  const stimmt = antwort.inhalt?.name === echt;
  console.log("  ══ WERKZEUGE UND ERZWUNGENES JSON ══");
  console.log(`  Kein 400 — die beiden vertragen sich.`);
  console.log(`  Werkzeug-Aufrufe:  ${rufe}`);
  console.log(`  Gelesener Name:    ${JSON.stringify(antwort.inhalt?.name)}`);
  console.log(`  Wirklich in der Datei: ${JSON.stringify(echt)}`);
  if (rufe === 0) {
    console.log("\n  ⚠ ABER: das Modell hat KEIN Werkzeug gerufen. Der Aufruf ging");
    console.log("    durch, die Werkzeuge kamen aber nicht zum Einsatz — geprüft");
    console.log("    ist damit nur, dass das Feld angenommen wird, nicht dass die");
    console.log("    Schleife trägt. Nicht als „läuft“ melden.");
  } else if (!stimmt) {
    console.log("\n  ⚠ ABER: der gelesene Name stimmt NICHT mit der Datei überein.");
    console.log("    Das Werkzeug lief, das Ergebnis kam nicht sauber an.");
  } else {
    console.log("\n  ✓ Das Modell hat gelesen, und was es las, stimmt mit der Datei");
    console.log("    überein. Die Annahme in api.mjs ist damit GEMESSEN, nicht");
    console.log("    mehr behauptet — CLAUDE.md und der Brief gehören nachgezogen.");
  }
  console.log("");
}

console.log(`  Antwort:   ${JSON.stringify(antwort.inhalt)}`);
console.log(`  Dauer:     ${dauer} s`);
console.log(`  Abbruch:   ${antwort.stop}\n`);
console.log("  Was die API gemeldet hat:");
for (const k of ["input_tokens", "cache_creation_input_tokens",
                 "cache_read_input_tokens", "output_tokens"])
  console.log(`    ${k.padEnd(30)} ${u[k] ?? "— (nicht gemeldet)"}`);

// Der Punkt, an dem sich unsere Rechnung an der Wirklichkeit misst.
const fehlend = ["input_tokens", "output_tokens"].filter((k) => u[k] === undefined);
if (fehlend.length) {
  console.log(`\n  ⚠ ACHTUNG: ${fehlend.join(", ")} fehlt in der Antwort.`);
  console.log("    Unsere Bremse rechnet mit diesen Feldern. Fehlen sie, zählt sie zu");
  console.log("    niedrig — und ein Deckel, der zu niedrig zählt, hält nicht.");
} else {
  console.log(`\n  Kosten dieses Aufrufs:  ${usd.toFixed(6)} $  ` +
    `(Preis hinterlegt: ${PREISE[MODELL].ein} $ / ${PREISE[MODELL].aus} $ je Mio.)`);
  console.log(`  Das sind rund ${(usd * 100).toFixed(4)} Cent.`);
}

// Hochrechnung, ehrlich als solche benannt.
const proSchicht = 19;
console.log(`\n  Eine Schicht mit Konferenz hat ${proSchicht} Aufrufe. Wären alle so`);
console.log(`  klein wie dieser, kostete sie ${(usd * proSchicht).toFixed(4)} $ — sie sind es aber NICHT:`);
console.log("  Emils Bau-Aufrufe tragen ein Vielfaches an Text. Diese Zahl ist eine");
console.log("  Untergrenze, keine Schätzung.\n");
