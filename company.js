/*
 * company.js — der app-eigene Klebstoff von Kim Hub Company.
 *
 * ══ WAS HIER STEHT UND WAS NICHT ═══════════════════════════════════════════
 *
 * Diese Datei zeichnet NICHTS. Die Räume — Werkstatt mit Bühne, Konferenz,
 * Übergabe, Ergebnis, Buchhaltung — kommen aus `ansicht.js` und `buehne.js`,
 * byte-1:1 aus der Werkstatt. Hier steht nur, was Company mehr hat als sie:
 * der eigene KI-Zugang, der Auftrag, und der Start der Schicht IM BROWSER.
 *
 * ⚠ WARUM DAS SO IST — und es war anders (Klaus 2026-09-05). Die erste Fassung
 * dieser Seite war ein Formular mit einer selbstgebauten Fortschritts-Liste.
 * Klaus hat beide Seiten nebeneinandergelegt und gefragt, ob das eine Kopie
 * sein soll: „Also wenn ich sehe, die Werkstatt, die Buchhaltung und all diese
 * ganzen Sachen und auch das Abspielen bei Kimhub, dann sieht das ganz, ganz
 * anders aus als Company." Er hatte recht. Es war keine Kopie, es war ein
 * Nachbau — und ein Nachbau ist eine zweite Fassung, die ausläuft.
 *
 * Der erste Reparatur-Versuch war ebenfalls falsch: die Räume aus `ansicht.js`
 * herausoperieren. Gemessen ist `verdrahten()` dort **42.841 Zeichen in EINER
 * Funktion**, und auf der Datei sitzen 1293 Prüfungen — ein Umbau hätte Klaus'
 * laufende Werkstatt aufs Spiel gesetzt, um eine zweite App zu bauen.
 *
 * Was den besseren Weg möglich gemacht hat, war seine Entscheidung, dass
 * Fahrtenbuch und Stechuhr MITGEHEN sollen („falls Forscher, die mein Paper
 * lesen, nachschauen wollen, wie wir das gelöst haben mit der Dokumentation").
 * Damit fällt der Grund weg, überhaupt zu schneiden: **die Datei wandert ganz,
 * und nur die QUELLE wechselt.** Dieselbe Naht wie Ablage, Bote und Baum vom
 * selben Tag — WO etwas herkommt ist von WAS damit gilt getrennt.
 */
import "./idb.js";
import "./schluesseltresor.js";
import { schicht, ROLLEN_REIHE } from "./schicht/schicht.mjs";
import { konferenz, KONFERENZ_ANTEIL } from "./schicht/konferenz.mjs";
import { EchteApi, TrockenApi, MAX_RUNDEN } from "./schicht/api.mjs";
import { netzTransport, macheNotaus, FRIST_MS } from "./schicht/transport-netz.mjs";
import { planBlatt, auftragsBlatt } from "./schicht/plan-form.mjs";
import { erwarteteAufrufe, stillstandAbMs } from "./schicht/umfang.mjs";
import { Kasse, zusammen } from "./schicht/kosten.mjs";
import { BEISPIELE } from "./schicht/beispiele.mjs";
import { deuteGrundsaetze, KEINE } from "./schicht/grundsaetze.mjs";
import { idbAblage } from "./schicht/ablage-idb.mjs";
import { eintrag as fahrtEintrag } from "./schicht/fahrtenbuch-form.mjs";
import { speicherBaum } from "./schicht/baum-speicher.mjs";
import { macheWerkbank } from "./schicht/werkzeuge.mjs";

const TRESOR = globalThis.WERKSTATT_SCHLUESSEL;
const IDB = globalThis.WERKSTATT_IDB;
/* ⚠ ABGEBROCHEN STATT HALB WEITERGEMACHT. Ohne Tresor gäbe es keine
   Verschlüsselung, ohne Ablage keinen Wohnort — beides wäre eine Seite, die
   aussieht, als täte sie etwas. */
if (!TRESOR || !IDB) throw new Error(
  "schluesseltresor.js oder idb.js haben sich nicht ans Global gehängt.");
/* Und ohne die Ansicht gäbe es keine Räume. Sie wird VOR dieser Datei geladen
   (klassisches `defer` läuft vor Modulen) — fehlt sie trotzdem, sagen wir das,
   statt eine Seite ohne Inhalt zu zeigen. */
if (!window.__werkstatt || typeof window.__werkstatt.speise !== "function")
  throw new Error("ansicht.js fehlt oder ist zu alt — ohne die Quell-Naht " +
    "(`__werkstatt.speise`) kann ein laufender Lauf nicht in die Räume.");

/* Der Name IST die Grenze zur Schwester-App: `github.io` ist EINE Adresse, und
   IndexedDB gehört dem Ursprung, nicht der App. Derselbe Name wie im `<head>`;
   dass beide übereinstimmen, bewacht eine Probe. */
const idb = IDB.macheIdb({ name: window.__WERKSTATT_DB || "KimHubCompany1" });

/* ══ DER LAUF ÜBERLEBT EIN ZURÜCK ═══════════════════════════════════════════
 *
 * ⚠ KLAUS HAT AM 2026-09-06 EINEN BEZAHLTEN LAUF VERLOREN. Er drückte einmal
 * „zurück", der Reiter war weg, und mit ihm die ganze Schicht — Konferenz,
 * Beiträge, Ergebnis. Neu starten war der einzige Weg, und das kostete noch
 * einmal.
 *
 * Der Grund stand im Code, nur nicht als Schaden: `speise()` schreibt in die
 * ANSICHT, nicht in die Datenbank, und `ablage.sichern()` sichert das
 * Gedächtnis der Agenten — nicht den Lauf. Zwischen Knopf und Feierabend lag
 * alles im Arbeitsspeicher.
 *
 * `ablage-idb.mjs` nennt genau diesen Preis und hält ihn für den richtigen
 * Schnitt: „Für eine Schicht, die von einem Knopf bis zum Feierabend läuft."
 * **Das galt für Node.** In einem Browser-Tab auf einem Tablet ist „zurück"
 * eine Fingerbewegung, und der Satz stimmt nicht mehr — dieselbe Datei sagt
 * selbst, was dann zu tun ist: „wer später Zwischenstände sichern will, ruft
 * `sichern()` öfter."
 *
 * ⚠ EIN WIEDERHERGESTELLTER LAUF WIRD BENANNT. Ein abgebrochener, der aussieht
 * wie ein fertiger, ist schlimmer als gar keiner — er behauptet ein Ergebnis,
 * das niemand hat. Deshalb trägt der Stand `fertig` mit.
 */
const LAUF_FACH = "lauf-stand";

/* ══ DAS FAHRTENBUCH DIESES BROWSERS ════════════════════════════════════════
 *
 * ⚠ KLAUS AM 2026-09-06: „auch abgebrochene Schichten sollten gespeichert und
 * dokumentiert werden, damit man sehen kann — für die Forschung — was
 * schiefgelaufen ist."
 *
 * Bis dahin schrieb diese App **gar kein** Buch. Die Ansicht suchte es unter
 * `werkstatt/buchhaltung/fahrtenbuch.json` — eine Datei, die es hier nie gibt.
 * Seine bezahlten Läufe hinterliessen damit keine Spur: nicht was sie
 * kosteten, nicht wie lange sie liefen, nicht warum einer abbrach. Dieselbe
 * Lücke wie am 2026-08-22 in der Werkstatt, nur eine Ebene weiter:
 * **„als hätten sie nie gearbeitet und kein Geld gekostet."**
 *
 * ⚠ DIE ABGEBROCHENE FAHRT IST DER EIGENTLICHE PUNKT. Was bis zum Abbruch
 * hinausging, IST bezahlt. Fehlte sie im Buch, wäre die Summe zu niedrig — und
 * eine zu niedrige Zahl sieht genauso aus wie eine gemessene.
 *
 * Der Ort ist der Browser-Speicher, nicht das Depot: es ist der Stand DIESES
 * Geräts, und in ihm stehen die Ausgaben seines Besitzers.
 */
const FAHRTEN_FACH = "fahrtenbuch";
const FAHRTEN_KOPF = {
  quelle: "kim-hub-company · company.js — jede Fahrt hängt sich selbst an",
  bedeutung: "Stand DIESES Browsers. Fehlt es, heisst das NICHT „keine Kosten\" — " +
             "es heisst, hier steht nichts.",
};

async function buchLesen() {
  let roh = null;
  try { roh = await idb.lies(FAHRTEN_FACH); } catch (e) { roh = null; }
  if (!roh) return { ...FAHRTEN_KOPF, fahrten: [] };
  try {
    const b = JSON.parse(roh);
    /* Ein kaputtes Buch wird NICHT stillschweigend geleert — dieselbe Regel wie
       in `fahrtenbuch.mjs`. Was nicht zu lesen ist, wird beiseitegelegt und
       gesagt; ein leeres Buch sähe aus wie „nichts ausgegeben". */
    if (!Array.isArray(b && b.fahrten))
      return { ...FAHRTEN_KOPF, fahrten: [], beiseitegelegt: "unlesbar" };
    return { ...FAHRTEN_KOPF, fahrten: b.fahrten };
  } catch (e) {
    return { ...FAHRTEN_KOPF, fahrten: [], beiseitegelegt: String(e && e.message || e) };
  }
}

/** Trägt eine Fahrt ein. Wirft nie: die Fahrt IST gelaufen und bezahlt, daran
 *  ändert ein voller Speicher nichts — aber es wird gesagt, still wäre dasselbe
 *  Verschweigen noch einmal. */
async function fahrtEintragen({ art, echt, bericht, titel = "", ergebnis = "",
                                mitarbeiter = [], beginn = "" }) {
  if (!bericht) return null;
  let e;
  try {
    e = fahrtEintrag({
      art, echt, bericht,
      datum: new Date().toISOString().slice(0, 10),
      titel, ergebnis,
      /* WANN die Fahrt begann — ausdruecklich, wo die Kasse es nicht weiss.
         Seit die Konferenz getrennt gebucht wird, faengt die Schicht-Kasse
         VOR ihr an zu laufen (beide Kassen entstehen vor dem ersten Aufruf).
         Ohne diese Angabe truege der Schicht-Eintrag die Konferenz-Zeit noch
         einmal, und zwei Eintraege meldeten dieselbe Stunde. */
      beginn,
      /* `wer` bleibt LEER. In dieser App bringt jeder seinen eigenen Zugang mit;
         einen Namen zu erfinden wäre eine Angabe, die niemand gemacht hat. */
      wer: "",
      besetzung: (mitarbeiter || []).map((m) => `${m.name} (${m.rolle})`),
    });
  } catch (err) { console.warn("Fahrtenbuch:", err.message); return null; }

  try {
    const buch = await buchLesen();
    buch.fahrten.push(e);
    await idb.schreib(FAHRTEN_FACH, JSON.stringify(buch));
    window.__werkstatt.speise("fahrten", buch);
  } catch (err) { console.warn("Fahrtenbuch nicht geschrieben:", err); }
  return e;
}
/*  steht mit drin, weil es das Einzige ist, was ein abgebrochener Lauf
   hinterlässt, das man weitergeben kann. Ohne diese Zeile wäre es nach einem
   Neuladen weg — und ein Auftrag, den man verloren hat, ist keiner. */
let letzterStand = { konferenz: null, lauf: null, blatt: null, wann: "", fertig: false, echt: false };
let sicherKette = Promise.resolve();

/** Sichert den Stand — nie im Weg, nie laut. Ein Lauf darf nicht daran
 *  scheitern, dass das Sichern scheitert; er darf es aber auch nicht
 *  verschweigen, deshalb geht ein Fehlschlag in die Konsole. */
function standSichern() {
  sicherKette = sicherKette
    .then(() => idb.schreib(LAUF_FACH, JSON.stringify(letzterStand)))
    .catch((e) => console.warn("Lauf-Stand nicht gesichert:", e));
  return sicherKette;
}


const $ = (id) => document.getElementById(id);
const zeigen = (el, ja) => { if (el) el.hidden = !ja; };

const stand = {
  passwort: null,       // NUR im Arbeitsspeicher. Nie in eine Ablage.
  schluessel: null,
  basisUrl: null,
  laeuft: false,
  letzterLauf: null,
  dateien: {},
  unterlagen: [],
};

/* ══ TEIL 1 · DER SCHLÜSSEL ═════════════════════════════════════════════════
 *
 * Drei Zustände, und sie werden UNTERSCHIEDEN statt geraten — dafür gibt
 * `holen()` drei verschiedene Gründe zurück (`leer` · `fassung` · `passwort`).
 */
function lageSetzen(wert, text) {
  const l = $("schluessel-lage");
  if (!l) return;
  l.setAttribute("data-stand", wert);
  $("schluessel-lage-text").textContent = text;
}
function sagt(text, sorte = "") {
  const p = $("schluessel-sagt");
  if (!p) return;
  p.textContent = text;
  p.setAttribute("data-sagt", sorte);
}

async function schluesselLageZeichnen() {
  const liegt = await TRESOR.liegtEtwas(idb);
  const offen = stand.schluessel !== null;

  zeigen($("einlegen"), !liegt || offen);
  zeigen($("aufschliessen"), liegt && !offen);
  zeigen($("werfen"), liegt);
  zeigen($("neu-block"), !liegt);
  $("pw-zweck").textContent = liegt ? "— dasselbe wie beim Einlegen" : "— du wählst es jetzt";

  if (offen) lageSetzen("offen", "aufgeschlossen, für diesen Besuch");
  else if (liegt) lageSetzen("zu", "verschlossen — Passwort eingeben");
  else lageSetzen("leer", "keiner hinterlegt");
  startLageZeichnen();
}

$("einlegen").onclick = async () => {
  const pw = $("pw").value, key = $("key").value.trim();
  if (!pw) { sagt("Ohne Passwort kann nichts verschlossen werden.", "fehlt"); return; }
  try {
    await TRESOR.einlegen(idb, pw, key);
  } catch (e) {
    /* Die Form-Prüfung sagt genau, WAS nicht stimmt — „zu kurz" und „sieht aus
       wie eine Befehlszeile" sind verschiedene Fehler, und der Nutzer sucht
       sonst an der falschen Stelle. Der Schlüssel steht NIE in der Meldung. */
    sagt(e.pruefung ? `${e.pruefung.grund}. ${e.pruefung.hinweis}`
                    : "Konnte nicht abgelegt werden: " + e.message, "fehler");
    return;
  }
  stand.passwort = pw; stand.schluessel = key;
  stand.basisUrl = $("basis").value.trim() || null;
  $("key").value = "";
  const dauer = await IDB.dauerhaft();   // erst fragen, wenn es etwas zu schützen gibt
  sagt("Abgelegt und aufgeschlossen. Der Browser sagt zum dauerhaften Speicher: " +
       (dauer ? "zugesagt" : "nicht zugesagt — er darf ihn aufräumen") + ".", "gut");
  await schluesselLageZeichnen();
};

$("aufschliessen").onclick = async () => {
  const pw = $("pw").value;
  if (!pw) { sagt("Ohne Passwort geht der Tresor nicht auf.", "fehlt"); return; }
  try {
    stand.schluessel = await TRESOR.holen(idb, pw);
    stand.passwort = pw;
    stand.basisUrl = $("basis").value.trim() || null;
    sagt("Aufgeschlossen. Er bleibt für diesen Besuch offen.", "gut");
  } catch (e) {
    /* ERST DIE FASSUNG, DANN DAS PASSWORT — jeder Grund bekommt seinen eigenen
       Satz. Eine Auskunft, die in die falsche Richtung zeigt, ist teurer als
       gar keine: der Nutzer tippte sonst ein richtiges Passwort immer wieder. */
    const grund = e && e.message;
    sagt(grund === "fassung"
        ? "Der hinterlegte Schlüssel stammt aus einer neueren Fassung dieser Seite. " +
          "Das Passwort ist NICHT das Problem — lade die Seite neu (⟳), oder wirf " +
          "den Schlüssel weg und lege ihn erneut ein."
      : grund === "leer"
        ? "Es liegt gar nichts da. In diesem Browser wurde noch kein Schlüssel abgelegt."
        : "Das Passwort passt nicht zu dem, was hier liegt.", "fehler");
  }
  await schluesselLageZeichnen();
};

$("werfen").onclick = async () => {
  await TRESOR.werfen(idb);
  stand.schluessel = null; stand.passwort = null;
  sagt("Weg. Es gibt kein Zurückholen — das ist der Preis echter Verschlüsselung.", "gut");
  await schluesselLageZeichnen();
};

/* ══ TEIL 2 · WAS DIE ROLLEN LESEN DÜRFEN ══════════════════════════════════
 * „Was der Nutzer übergibt" (Klaus 2026-09-04). Keine Dateien ⇒ gar keine
 * Werkbank: drei Werkzeuge, die „geht nicht" sagen, kosten eine BEZAHLTE Runde. */

/* ⚠ EINE PDF IST KEIN TEXT — und `f.text()` merkt das nicht.
 *
 * Klaus 2026-09-06: „über vierzig Minuten für ein PDF-Dokument". Gemessen an
 * einer echten PDF aus seinen Repos: `f.text()` wirft NICHT, sie liefert
 * klaglos 27 158 Zeichen, in denen der Inhalt in 12 komprimierten Strömen
 * steckt. Was ankam, war PDF-Gerüst (`/Type`, `/Pages`, `FlateDecode`) und
 * Binärrauschen — kein einziger Satz des Dokuments. Der `catch` daneben lief
 * nie: es gab nichts zu fangen.
 *
 * Acht bezahlte Rollen hätten an diesem Rauschen geraten. Deshalb geht eine
 * PDF NICHT in den Baum, sondern als DOKUMENT in die Anfrage — die API nimmt
 * sie direkt entgegen und liest sie selbst. Zwei Wege, zwei Töpfe:
 *
 *   stand.dateien     Text, für die Werkzeuge (lesen und suchen)
 *   stand.unterlagen  PDF, reist als Dokument mit JEDER Frage
 */
function istPdf(f) {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");
}

/** Bytes als base64 — ohne Zeilenumbrüche, die weist die API ab. */
function alsBase64(puffer) {
  const b = new Uint8Array(puffer);
  let roh = "";
  /* In Stücken, sonst sprengt eine grosse Datei den Aufruf-Stapel
     (`String.fromCharCode(...b)` mit 20 MB wirft „Maximum call stack size"). */
  for (let i = 0; i < b.length; i += 8192)
    roh += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
  return btoa(roh);
}

$("dateien").onchange = async (e) => {
  const liste = [...(e.target.files || [])];
  stand.dateien = {};
  stand.unterlagen = [];
  for (const f of liste) {
    if (istPdf(f)) {
      try {
        stand.unterlagen.push({ name: f.name, bytes: f.size, base64: alsBase64(await f.arrayBuffer()) });
      } catch { /* unlesbar — dann eben nicht, aber nie als Text weiterreichen */ }
      continue;
    }
    try { stand.dateien[f.name] = await f.text(); } catch { /* kein Text, kein Baum */ }
  }
  const n = Object.keys(stand.dateien).length;
  const u = stand.unterlagen.length;
  const wo = document.querySelector("[data-werkzeug-grund]");
  if (!wo) return;
  if (!n && !u) {
    wo.innerHTML =
      `Ohne Dateien laufen die Rollen <b>ohne Werkzeuge</b> — und das ist Absicht: ` +
      `drei Werkzeuge, die „geht nicht" antworten, kosten in einem echten Lauf eine ` +
      `<b>bezahlte</b> Runde.`;
    return;
  }
  const teile = [];
  if (n) teile.push(
    `<b>${n} ${n === 1 ? "Textdatei" : "Textdateien"}</b> übergeben. Die Rollen dürfen darin ` +
    `<b>lesen und suchen</b> — schreiben kann keines der Werkzeuge, es gibt kein ` +
    `schreibendes.`);
  if (u) teile.push(
    /* ⚠ DER PREIS STEHT DABEI. Eine Unterlage reist mit JEDER Frage mit, also
       bei acht Rollen achtmal je Runde. Wer das nicht dazuschreibt, lässt den
       Nutzer den Betrag erst auf der Rechnung sehen. */
    `<b>${u} ${u === 1 ? "PDF" : "PDFs"}</b> (${Math.round(
      stand.unterlagen.reduce((k, x) => k + x.bytes, 0) / 1024)} KB) gehen als ` +
    `<b>Dokument</b> in jede Frage — die KI liest sie selbst, nicht über ein Werkzeug. ` +
    `Das kostet: sie reisen bei <b>jeder</b> Rolle und <b>jeder</b> Runde mit. ` +
    `Sieben der acht Rollen laufen auf einem Modell mit kleinerem Fenster; dort sind ` +
    `<b>100 Seiten</b> die Grenze.`);
  teile.push(`Was du nicht übergibst, sehen sie nicht.`);
  wo.innerHTML = teile.join(" ");
};

/* ══ DAS TOR ZWISCHEN IDEE UND BAU (Klaus 2026-09-06) ══════════════════════
 *
 * „Vielleicht ist es sinnvoll, wenn eine Idee, die die Agenten haben, einmal
 *  zwischen dir und mir noch einmal geprüft wird, BEVOR die bauen … sie
 *  entscheiden, eine PDF-Liste zu machen, die sie selber nur lesen können —
 *  völlig sinnlos, weil kein anderer Nutzer etwas damit anfangen kann."
 *
 * ⚠ „FÜR WEN" STEHT GANZ OBEN, und das ist kein Layout-Geschmack. Genau diese
 * Frage hat gefehlt: das Feld gibt es längst, und im mitgelieferten Beispiel
 * steht darin „mich selbst und jeden, der nach mir baut" — niemand hat
 * widersprochen. Wer es zuerst liest, verwirft so etwas in einer Sekunde.
 */
var TOR_FELDER = [
  ["fuerWen", "Für wen"],
  ["titel", "Was"],
  ["warum", "Warum"],
  ["ergebnis", "Was herauskommt"],
  ["pruefmerkmal", "Woran man es sieht"],
  ["schaerfung", "Was Ben dazu sagt"],
];

function torText(idee) {
  var z = [];
  for (var i = 0; i < TOR_FELDER.length; i++) {
    var k = TOR_FELDER[i][0];
    if (idee[k]) z.push(TOR_FELDER[i][1] + ": " + idee[k]);
  }
  if (idee.ausBauSicht && idee.ausBauSicht.length)
    z.push("Aus Bau-Sicht: " + idee.ausBauSicht.join(" · "));
  /* Derselbe Wortlaut wie im Tor, und aus demselben Grund: was in die Sitzung
     kopiert wird, darf nicht mehr behaupten als das, was auf dem Schirm steht. */
  if (!idee.pruefmerkmalTraegt)
    z.push("⚠ Ben hält das Prüfmerkmal für nicht durchgehend nachprüfbar — "
      + "was daran nicht nachprüfbar ist, kann die Gegenprüfung nicht messen.");
  return z.join("\n");
}

/** Öffnet das Tor und gibt zurück, was Klaus entschieden hat. */
function torOeffnen(idee) {
  return new Promise(function (fertig) {
    var kasten = $("tor"), liste = $("tor-idee"), sagt = $("tor-sagt");
    liste.textContent = "";
    for (var i = 0; i < TOR_FELDER.length; i++) {
      var k = TOR_FELDER[i][0];
      if (!idee[k]) continue;
      var dt = document.createElement("dt"); dt.textContent = TOR_FELDER[i][1];
      var dd = document.createElement("dd"); dd.textContent = idee[k];
      liste.appendChild(dt); liste.appendChild(dd);
    }
    if (idee.ausBauSicht && idee.ausBauSicht.length) {
      var dt2 = document.createElement("dt"); dt2.textContent = "Aus Bau-Sicht";
      var dd2 = document.createElement("dd"); dd2.textContent = idee.ausBauSicht.join(" · ");
      liste.appendChild(dt2); liste.appendChild(dd2);
    }
    /* ⚠ BENS EINWAND IST DIE WICHTIGSTE ZEILE, wenn er ihn hat. Er sagt, ob das
       Prüfmerkmal überhaupt nachprüfbar ist — ohne das misst die Gegenprüfung
       später gegen etwas, das sich nicht messen lässt. */
    var w = $("tor-warnung");
    w.hidden = !!idee.pruefmerkmalTraegt;
    /*
     * ⚠ DER ZWEITE SATZ WAR ABSOLUTER ALS BENS BEFUND (Klaus 2026-09-07).
     *
     * Hier stand „Dann kann auch die Gegenprüfung am Ende nichts messen." Ben
     * beanstandet aber nicht das ganze Prüfmerkmal, sondern einzelne Zeilen
     * darin — in Klaus' Lauf zwei von fünf; die anderen drei waren sehr wohl
     * messbar. **Eine Warnung, die mehr behauptet als der Befund, den sie
     * weitergibt, ist keine Warnung, sondern eine zweite Behauptung.**
     *
     * Und sie ist die teurere Sorte Fehler: wer liest, dass gar nichts messbar
     * sei, verwirft eine Idee, die zu drei Vierteln getragen hätte.
     */
    w.textContent = idee.pruefmerkmalTraegt ? ""
      : "⚠ Ben hält das Prüfmerkmal für nicht durchgehend nachprüfbar. " +
        "Was daran nicht nachprüfbar ist, kann die Gegenprüfung am Ende nicht " +
        "messen — der Rest schon. Was er beanstandet, steht oben unter " +
        "\u201eWas Ben dazu sagt\u201c.";
    sagt.textContent = "";
    kasten.hidden = false;
    kasten.setAttribute("data-tor", "offen");

    /*
     * ══ „WARTET AUF DICH" IST KEIN UNTERFALL VON „LÄUFT" ══════════════════
     *
     * Klaus 2026-09-07: „Wie soll ein Fremder auf die Idee kommen, dass man
     * nach unten scrollen muss? Das ist nicht intuitiv handhabbar."
     *
     * Am offenen Tor sagten DREI Dinge gleichzeitig „es arbeitet": die Bühne
     * pulste, die Uhr rechnete eine Restzeit hoch, und „seit 43:52 nichts
     * fertig" schickte zum ANHALTEN-Knopf. Der dritte war der schlimmste — er
     * soll einen Hänger melden und meldete am Tor einen, der keiner ist. Der
     * richtige Knopf heisst „Bauen" und stand ausserhalb des Sichtfelds.
     *
     * `torwartet` ist deshalb ein EIGENER Kanal, nicht ein Abschalten von
     * `schichtlaeuft`: die Schicht läuft ja, sie wartet nur. Wer den einen
     * durch den anderen ersetzte, bekäme eine Uhr, die stehen bleibt — und
     * die Zeit am Tor IST Arbeitszeit, so steht es in `schicht.mjs`.
     */
    window.__werkstatt.speise("torwartet", { seit: new Date().toISOString() });

    /*
     * ⚠ UND DIE SEITE FÜHRT HIN, statt es zu erwähnen. Das Tor steht in der
     * Werkstatt (Raum 0); wer beim Warten die Bühne ansieht, ist in einem
     * anderen Reiter, und ein geschlossener Reiter zeigt seine Knöpfe nicht.
     * Ein Hinweis „scroll nach unten" wäre genau der Rat, den Klaus nicht
     * ausführen konnte — die Stelle war gar nicht sichtbar.
     *
     * Kein eigener Weg: es wird der Reiter-Knopf gedrückt, den ein Mensch auch
     * drücken würde. Zwei Wege in denselben Raum liefen auseinander.
     */
    var reiter = document.querySelector('.reiter button[data-raum="raum0"]');
    if (reiter) reiter.click();
    if (kasten.scrollIntoView) kasten.scrollIntoView({ block: "center" });
    $("tor-bauen").focus();

    function schliesse(antwort) {
      kasten.hidden = true;
      kasten.setAttribute("data-tor", "zu");
      $("tor-bauen").onclick = null;
      $("tor-verwerfen").onclick = null;
      /* ⚠ AUF JEDEM WEG HINAUS. Bliebe die Marke stehen, sagte die Bühne
         „wartet auf dich", während längst gebaut wird — dieselbe Sorte
         Unwahrheit wie eine Uhr über einem toten Lauf, nur andersherum. */
      window.__werkstatt.speise("torwartet", null);
      fertig(antwort);
    }
    $("tor-bauen").onclick = function () { schliesse({ weiter: true }); };
    $("tor-verwerfen").onclick = function () {
      schliesse({ weiter: false, grund: "Vor dem Bauen verworfen — die Idee " +
        "wurde nicht freigegeben." });
    };
    /* Kopieren schliesst das Tor NICHT: wer die Idee bespricht, will danach
       immer noch entscheiden. Ein Knopf, der nebenbei zumacht, wäre eine Falle. */
    $("tor-kopieren").onclick = function () {
      var t = torText(idee);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(
          function () { sagt.textContent = "Kopiert — in die Sitzung einfügen."; },
          function () { sagt.textContent = "Kopieren ging nicht. Der Text steht oben."; });
      } else {
        sagt.textContent = "Kopieren ging nicht. Der Text steht oben.";
      }
    };
  });
}

/* ══ TEIL 3 · DER LAUF ══════════════════════════════════════════════════════ */
function startLageZeichnen() {
  const ziel = ($("ziel").value || "").trim();
  const p = $("start-sagt");
  $("trocken").disabled = stand.laeuft;
  $("echt").disabled = stand.laeuft || !stand.schluessel || !ziel;
  /*
   * ══ DER NOTAUS IST IMMER DA (Klaus 2026-09-07) ═══════════════════════════
   *
   * „Er sollte immer da sein, auch eine angehaltene Schicht sollte beendet
   * werden."
   *
   * ⚠ HIER STAND DAS GEGENTEIL, und die Begründung war gut: „ein Notaus, der
   * immer dasteht und meistens nichts tut, ist ein toter Knopf; einer, der
   * erscheint, sagt schon durch sein Erscheinen, dass etwas läuft." Der Preis
   * dafür war, dass er GENAU DANN fehlte, wenn man ihn sucht: nach einem
   * Neuladen lebt der Notaus nicht mehr, die Anzeige behauptete aber weiter
   * einen Lauf. Klaus stand vor einer Uhr, die seit sieben Stunden zählte,
   * und suchte einen Knopf, den es in dem Zustand nicht gab.
   *
   * Ein Knopf, der verschwindet, ist von einem Knopf, den es nie gab, nicht zu
   * unterscheiden. Er steht jetzt immer da und sagt, WAS er tun wird —
   * ausgegraut, wenn es nichts zu tun gibt. (Tafel-Evolutions-Klausel:
   * benannt, nicht stillschweigend umgefahren.)
   *
   * DREI ZUSTÄNDE, DREI BESCHRIFTUNGEN:
   *   · ein bezahlter Lauf läuft          → „■ Anhalten"
   *   · er ist gezogen                    → „■ Wird angehalten …"
   *   · die Anzeige behauptet einen Lauf,
   *     es läuft aber nichts (Geist)      → „■ Schicht beenden"
   *   · sonst                             → ausgegraut
   */
  const halt = $("anhalten");
  /*
   * ⚠ „WIRD ANGEHALTEN …" WAR SELBST EINE SACKGASSE. Nach dem Zug stand der
   * Knopf ausgegraut da und lud zum Warten ein — und wenn der Abruf tot ist
   * (eingefrorener Tab, abgerissenes Netz), kommt die Schicht nie zurück, das
   * `finally` läuft nie, und die Uhr zählt weiter. Genau Klaus' Satz vom
   * 2026-09-07: „auch eine angehaltene Schicht sollte beendet werden."
   *
   * Nach dem Zug geht deshalb kein Aufruf mehr hinaus — Beenden kostet ab da
   * nichts mehr und ist der ehrliche Ausweg, kein Notbehelf.
   *
   * ⚠ `stand.laeuft` GEHÖRT IN DEN GEIST, nicht nur der Notaus. Ein
   * TROCKENLAUF setzt `schichtlaeuft`, bekommt aber keinen Notaus — die erste
   * Fassung hielt ihn deshalb für einen Geist und bot an, ihn wegzuräumen,
   * WÄHREND er lief.
   */
  const geist = !stand.laeuft && zeigtLauf();
  const beendbar = !!(laufendesNotaus && laufendesNotaus.gezogen) || geist;
  halt.hidden = false;
  halt.disabled = !(laufendesNotaus && !laufendesNotaus.gezogen) && !beendbar;
  halt.textContent = laufendesNotaus && !laufendesNotaus.gezogen
    ? "■ Anhalten" : beendbar ? "■ Schicht beenden" : "■ Anhalten";
  halt.setAttribute("data-halt",
    laufendesNotaus && !laufendesNotaus.gezogen ? "bereit"
      : laufendesNotaus ? "gezogen" : geist ? "geist" : "nichts");
  p.setAttribute("data-start",
    stand.laeuft ? "laeuft" : !ziel ? "ohne-auftrag"
      : !stand.schluessel ? "ohne-schluessel" : "bereit");
  p.textContent = stand.laeuft
    ? "Eine Schicht läuft. Zwei gleichzeitig gingen auf dasselbe Gedächtnis."
    : !ziel
      ? "Für den echten Lauf fehlt noch der Auftrag. Der Trockenlauf geht auch ohne — er spielt eine hinterlegte Schicht ab."
      : !stand.schluessel
        ? "Für den echten Lauf fehlt noch dein Schlüssel (oben). Der Trockenlauf geht ohne."
        : "Bereit. Der echte Lauf gibt höchstens den Deckel aus, den du gesetzt hast.";
}
$("ziel").oninput = startLageZeichnen;
/* ⚠ ER BRICHT NICHT AB, ER HÄLT AN — der Unterschied steht in der Meldung.
   Der laufende Aufruf wird abgebrochen und kein weiterer geschickt; was bis
   dahin hinausging, IST bezahlt und geht denselben Weg wie jeder andere
   Abbruch: in die Kasse, ins Fahrtenbuch, in den gesicherten Stand. Ein
   Knopf, der stattdessen die Seite neu lüde, wäre der teurere Weg — dabei
   läuft KEIN Abbruch-Pfad, und das Geld stünde in keinem Buch. */
/**
 * BEHAUPTET DIE ANZEIGE GERADE, DASS ETWAS LÄUFT?
 *
 * Zwei Quellen, dieselbe wie in `ansicht.js`: die App selbst (`schichtlaeuft`,
 * gesetzt beim Druck auf den Knopf) und der angezeigte Lauf. Gefragt wird die
 * ANZEIGE, nicht der Ablauf — genau darin liegt der Geist: der Ablauf ist
 * vorbei, die Anzeige weiss es nicht.
 */
function zeigtLauf() {
  const d = (window.__werkstatt && window.__werkstatt.daten) || {};
  return !!d.schichtlaeuft || !!(d.lauf && d.lauf.laeuft);
}

/**
 * WAS DER NOTAUS SAGT — in seiner EIGENEN ZEILE.
 *
 * ⚠ DIESELBE FALLE ZUM DRITTEN MAL. `startLageZeichnen()` schreibt
 * `#start-sagt` bedingungslos neu; wer seine Meldung dorthin schreibt und
 * danach neu zeichnet, hat sie schon wieder gelöscht. Genau so stand es hier:
 * die „Angehalten"-Meldung lebte so lange, wie der Klick dauert, und Klaus
 * hätte danach „Eine Schicht läuft" gelesen — über einer Schicht, die er
 * gerade angehalten hat.
 *
 * Aufgeschrieben war die Lehre längst („zwei Aussagen, zwei Zeilen", 2026-09-05
 * an `#wieder-sagt`, 2026-09-06 an `#abbruch-sagt`). Sie steht jetzt an der
 * Stelle, an der sie gilt.
 */
/**
 * DIE ANZEIGE HÖRT AUF ZU LAUFEN — an einer Stelle, für beide Hälften.
 *
 * Klaus 2026-09-07, mit Bild: die Schicht war abgebrochen (die Meldung stand
 * darunter im Klartext), und die Bühne zählte weiter — „Schicht läuft ·
 * 58:41", Nora leuchtete, und im Fuß stand „LÄUFT GERADE".
 *
 * Der Grund: `zwischenstand()` trägt fest `laeuft: true`, und der Abbruch-Pfad
 * hat die Anzeige nie geradegerückt. Das ist derselbe Befund wie bei der
 * Geister-Schicht vom selben Tag, nur ohne Neuladen — er trat schon im
 * laufenden Fenster auf.
 *
 * ⚠ BEIDE HÄLFTEN. Die Konferenz meldet seit dem 2026-09-07 ebenfalls einen
 * Zwischenstand mit `laeuft: true`; wer nur die Schicht geraderückt, lässt im
 * Fuß „Konferenz — LÄUFT GERADE" stehen. Eine Anzeige, die zur Hälfte die
 * Unwahrheit sagt, ist von einer ganzen nicht zu unterscheiden.
 */
function anzeigeAnhalten() {
  window.__werkstatt.speise("schichtlaeuft", null);
  for (const fach of ["lauf", "konferenz"]) {
    const alt = letzterStand && letzterStand[fach];
    if (!alt || !alt.laeuft) continue;
    letzterStand[fach] = { ...alt, laeuft: false };
    window.__werkstatt.speise(fach, letzterStand[fach]);
  }
}

function sageNotaus(lage, text) {
  const p = $("abbruch-sagt");
  p.hidden = false;
  p.setAttribute("data-abbruch", lage);
  p.textContent = text;
}

$("anhalten").onclick = () => {
  /*
   * ══ ZWEI AUFGABEN, EIN KNOPF — und der Unterschied steht in der Meldung ══
   *
   * Läuft wirklich etwas, wird es angehalten. Behauptet die Anzeige nur einen
   * Lauf, wird die Behauptung geräumt. Beides heisst für Klaus dasselbe: „die
   * Schicht ist vorbei, und ich sehe das auch."
   */
  if (laufendesNotaus && !laufendesNotaus.gezogen) {
    laufendesNotaus.ziehen();
    sageNotaus("anhalten",
      "Angehalten. Der laufende Aufruf wird abgebrochen — was bis hierher " +
      "hinausging, ist bezahlt und kommt ins Buch.");
    startLageZeichnen();
    return;
  }

  /* Ab hier heisst der Knopf „beenden". Erlaubt ist das, wenn der Notaus
     gezogen ist (dann geht ohnehin nichts mehr hinaus) oder wenn die Anzeige
     einen Lauf behauptet, den es in dieser Seite nicht gibt. */
  const gezogen = !!(laufendesNotaus && laufendesNotaus.gezogen);
  if (!gezogen && !zeigtLauf()) return;
  laufendesNotaus = null;

  /*
   * ══ EINE GEISTER-SCHICHT BEENDEN ════════════════════════════════════════
   *
   * ⚠ UND ZWAR ENDGÜLTIG. Nur die Anzeige zu räumen reichte nicht: der Stand
   * liegt in IndexedDB und käme beim nächsten Öffnen zurück. Klaus hätte
   * gedrückt, es wäre weg gewesen — und am nächsten Morgen wieder da.
   *
   * ⚠ ES WIRD NICHTS GEBUCHT. Was dieser Lauf gekostet hat, steht in seiner
   * eigenen Kasse, und die ist mit der Seite gestorben; hier ist keine Zahl
   * mehr zu holen. Eine erfundene wäre schlimmer als keine — sie sähe aus wie
   * eine gemessene. Deshalb sagt die Meldung ausdrücklich, dass die Kosten
   * dieses Laufs hier NICHT stehen.
   */
  anzeigeAnhalten();
  if (letzterStand.lauf || letzterStand.konferenz) standSichern();
  stand.laeuft = false;
  sageNotaus("beendet", gezogen
    ? "Beendet. Seit dem Anhalten ging kein Aufruf mehr hinaus — von hier an " +
      "kostet nichts mehr. Ob die Gegenseite die letzte Antwort noch " +
      "fertiggestellt hat, ist von hier aus nicht zu sehen; falls ja, ist sie bezahlt."
    : "Beendet. Die Anzeige hat einen Lauf behauptet, der nicht mehr " +
      "lief — das kommt vor, wenn die Seite mitten in einer Schicht neu geladen wurde. " +
      "Was er gekostet hat, steht hier nicht: seine Kasse ist mit der Seite gegangen.");
  startLageZeichnen();
};

/* Der Notaus DIESES Laufs. Modulweit, weil der Knopf ihn braucht und die
   Fahrt ihn setzt — und `null`, sobald nichts läuft: ein Notaus, der einen
   toten Lauf anhielte, wäre ein Knopf ohne Wirkung mit Beschriftung. */
let laufendesNotaus = null;

async function fahre({ echt }) {
  if (stand.laeuft) return;
  stand.laeuft = true;
  /* ⚠ NUR DER ECHTE LAUF BEKOMMT EINEN. Ein Trockenlauf schickt nichts hinaus
     und ist in Millisekunden vorbei; ein Anhalten-Knopf daneben verspräche,
     etwas aufzuhalten, das schon vorbei ist. */
  laufendesNotaus = echt ? macheNotaus() : null;
  /* Die Meldung des VORIGEN Abbruchs geht weg, sobald ein neuer Lauf beginnt —
     sonst stünde sie über einer Schicht, die gerade gut läuft. */
  $("abbruch-sagt").hidden = true;
  $("abbruch-sagt").removeAttribute("data-abbruch");
  startLageZeichnen();

  /* ⚠ DIE UHR BEGINNT MIT DEM DRUCK, NICHT MIT DEM ERSTEN ZWISCHENSTAND.
   *
   * Klaus 2026-09-06, mit Bild: „Uhr läuft nicht obwohl die Schicht begonnen
   * hat." Sie lief wirklich nicht — und schlimmer: sie stand auf „✓ Schicht
   * beendet · 00:00", weil die Bühne noch den WIEDERHERGESTELLTEN Lauf von
   * vorhin zeigte. Eine Uhr, die „beendet" sagt, während gearbeitet wird, ist
   * schlimmer als gar keine: sie beantwortet die Frage, und zwar falsch.
   *
   * Die Ursache war eine Lücke in der Reihenfolge. `laeuft` und der Beginn
   * kamen bis dahin AUS DEM LAUF (`kasse.beginnIso`), und der erste
   * Zwischenstand entsteht erst, wenn die erste Rolle der Schicht geantwortet
   * hat. Die Konferenz davor — fünf Aufrufe, Minuten — lag komplett davor.
   *
   * Also ein eigener Teil: die APP weiss, wann Klaus gedrückt hat, und das ist
   * die Zeit, die ihn interessiert. Er ersetzt den Lauf nicht (sonst wäre das
   * bisher Gezeigte weg, bevor Neues da ist) — er legt sich darüber. */
  window.__werkstatt.speise("schichtlaeuft", { seit: new Date().toISOString() });

  /* ⚠ WAS DER `catch` BRAUCHT, STEHT VOR DEM `try`. `const` im try-Block ist
   * im catch nicht sichtbar — und bei einem `const` in der toten Zone wirft
   * sogar `typeof`, der übliche Ausweg wäre also selbst der nächste Fehler.
   * Der Abbruch-Eintrag ins Fahrtenbuch braucht die Kasse und die Besetzung;
   * ohne diese zwei Zeilen wäre er genau dort kaputt, wo er gebraucht wird. */
  /* ⚠ VOR dem `try`, weil das `finally` ihn abräumen muss. Ein `const` im
     try-Block ist im finally nicht sichtbar — dieselbe Falle wie beim
     Fahrtenbuch am 2026-09-06, dort mit Kasse und Besetzung. */
  let umfangTakt = null;
  /* ⚠ BEIDE KASSEN STEHEN VOR DEM `try`. `kasseKonf` war bis zum 2026-09-07
     ein `const` mitten im Block — im `catch` also nicht sichtbar, und die
     abgebrochene Fahrt konnte die Konferenz gar nicht mitbuchen. Dieselbe
     Falle wie beim Fahrtenbuch am 2026-09-06: was der `catch` braucht,
     wird VOR dem `try` angelegt. */
  let kasse = null, kasseKonf = null, mitarbeiter = [], konfGebucht = null;
  /* ⚠ VOR DEM `try`, WIE DIE BEIDEN KASSEN — und aus demselben Grund. Ein
     `const` im try-Block ist im `catch` nicht sichtbar, und `typeof` wirft
     dort ebenfalls (tote Zone). Der Abbruch-Eintrag unten braucht diesen Wert.
     Dieselbe Lehre wie beim Fahrtenbuch am 2026-09-06, an derselben Stelle. */
  let schichtBeginn = "";

  try {
    mitarbeiter = await holeMitarbeiter();
    const g = await holeGrundsaetze();
    /* ══ ZWEI KASSEN AUS EINEM DECKEL ═════════════════════════════════════
     *
     * ⚠ DER ERSTE ANLAUF GAB BEIDEN DIESELBE KASSE, und der Trockenlauf brach
     * mit `feierabendGrund: "geld"` ab — gemessen am 2026-09-05: die Konferenz
     * verbrauchte 0,126 € von 1,00 €, und danach reichte der Rest der Schicht
     * nicht mehr für ihre Anlaufprüfung (`3 × teuerster Aufruf` gegen den Rest
     * ohne Rücklage). Der Nutzer hätte für eine Konferenz bezahlt und kein
     * Werkstück bekommen.
     *
     * In Kimhub sind das ZWEI Läufe mit je eigenem Deckel — `lauf.mjs` ruft
     * entweder die Konferenz oder die Schicht. Company fährt beide hintereinander,
     * also bekommt jede ihren Teil: `KONFERENZ_ANTEIL` (ein Drittel) für die
     * Konferenz, der Rest fürs Bauen. **Die Summe bleibt der Deckel, den du
     * gesetzt hast** — mehr wird nie ausgegeben, und das ist der ganze Zweck
     * einer Bremse. */
    const deckelEur = Math.max(0.20, Number($("deckel").value) || 1);
    /* ⚠ DIE KONFERENZ IST ZUSCHALTBAR UND STANDARDMÄSSIG AUS — gemessen am
       2026-09-05, warum: mit beiden auf einem Deckel von 1,00 € brach die
       Schicht mit `feierabendGrund: "geld"` ab (die Konferenz hatte 0,126 €
       verbraucht, der Rest reichte der Schicht nicht mehr für ihre
       Anlaufprüfung). Mit geteiltem Deckel war dann BEIDES zu knapp.
       In Kimhub sind das zwei getrennte Läufe mit je vollem Deckel — hier ist
       es eine Entscheidung des Nutzers, und sie steht mit ihrem Preis daneben.
       Ein Lauf, der still das halbe Geld in eine Vorstufe steckt und ohne
       Werkstück endet, wäre die teuerste Art, nichts zu liefern. */
    const mitKonferenz = !!($("mit-konferenz") && $("mit-konferenz").checked);
    const deckelKonferenz = mitKonferenz ? deckelEur * KONFERENZ_ANTEIL : 0;
    const deckelSchicht = deckelEur - deckelKonferenz;
    const macheKasse = (d) => new Kasse({
      deckelEur: d,
      laufzeitMs: 2 * 3600_000,
      // Zurückgelegt für den Feierabend-Bericht — ein Zehntel, mindestens 20
      // Cent. Dieselbe Zahl wie in `lauf.mjs`; eine Probe hält beide zusammen.
      reserveEur: Math.max(0.20, d * 0.1),
    });
    kasse = macheKasse(deckelSchicht);

    const api = echt
      ? new EchteApi({
          schluessel: stand.schluessel, basisUrl: stand.basisUrl,
          transport: netzTransport({ schluessel: stand.schluessel, basisUrl: stand.basisUrl,
                                     notaus: laufendesNotaus }),
        })
      : new TrockenApi(BEISPIELE);

    const dateien = Object.keys(stand.dateien);
    const werkbank = dateien.length
      ? macheWerkbank({ baum: speicherBaum(stand.dateien, { wo: "übergeben" }) })
      : null;
    const ablage = await idbAblage(idb);

    /* ⚠ `let`, NICHT `const` — nach einer Konferenz wird er ERSETZT. Siehe die
       Zeile nach `konferenz(…)` weiter unten; ohne sie lief die Abstimmung ins
       Leere. */
    let auftrag = {
      ziel: ($("ziel").value || "").trim() ||
        "Ein kleines, eigenständiges Werkzeug, das jemand sofort benutzen kann.",
      pruefmerkmal: ($("merkmal").value || "").trim() || null,
    };

    /* ══ ERST DIE KONFERENZ, DANN DIE SCHICHT ═══════════════════════════
     *
     * Das ist der volle Ablauf der Werkstatt, und Klaus hat genau ihn gezeigt:
     * fünf Rollen schlagen vor und bewerten, aus dem Sieger wird ein Auftrag,
     * dann wird gebaut. Ohne sie bliebe Raum 1 („Wer spricht" · „Was gesagt
     * wurde") in Company leer — der Raum aus seinem Bildschirmfoto.
     *
     * `konferenz()` hat dieselbe Form wie `schicht()` und steht seit dem
     * 2026-09-04 in `OHNE_NODE`: sie läuft im Browser, ohne dass etwas daran
     * geändert werden müsste.
     *
     * ⚠ SIE KOSTET MIT. `KONFERENZ_ANTEIL` teilt den Deckel — die Konferenz
     * bekommt ihren Teil, der Rest bleibt fürs Bauen. Das ist die Aufteilung
     * aus Kimhub, nicht eine hier erfundene.
     */
    /* Die Konferenz-Kasse bekommt einen NAMEN, weil das Übergabe-Blatt ihren
       Bericht braucht. Inline hätte niemand mehr Zugriff darauf, und die
       Kosten-Zeile im Blatt stünde leer.
     *
     * ⚠ NUR WENN ES EINE KONFERENZ GIBT. Die erste Fassung zog die Zeile aus
     * dem Ternär heraus und baute sie IMMER — ohne Konferenz ist der Anteil 0,
     * und `Kasse` wirft zu Recht „Die Kasse braucht einen Deckel > 0". Die
     * ganze Schicht starb, bevor sie begann, und die Meldung wurde vom
     * `finally` gleich wieder überschrieben.
     *
     * **Eine Zeile, die aus einer Bedingung herauswandert, läuft in Fällen,
     * für die sie nie gedacht war.** Gefunden hat es die Browser-Probe, weil
     * sie den Weg OHNE Konferenz wirklich fährt. */
    kasseKonf = mitKonferenz ? macheKasse(deckelKonferenz) : null;

    /*
     * ══ WIE WEIT UND WIE LANGE NOCH ═════════════════════════════════════
     *
     * Klaus 2026-09-07, aus der Bestandsaufnahme: Geld war nicht die Grenze,
     * ZEIT war es — und die Zahl stand nirgends. Er hat vierzig Minuten
     * gewartet, ohne zu wissen, worauf.
     *
     * ⚠ GEZÄHLT WIRD AN DER KASSE, nicht am Zwischenstand. Der kommt erst,
     * wenn die Schicht beginnt — die Konferenz davor sind bei acht Rollen
     * SIEBZEHN Aufrufe, also genau die Strecke, auf der er gewartet hat.
     * Beide Kassen zusammen sind der ganze Weg.
     */
    const erwartet = erwarteteAufrufe({ rollen: mitarbeiter.length, mitKonferenz }).gesamt;
    /*
     * ══ SEIT WANN NICHTS MEHR FERTIG WURDE ══════════════════════════════
     *
     * Klaus 2026-09-07, nach sieben Stunden an einer Schicht mit zwei Stunden
     * Deckel: die Uhr zählte weiter, und mehr stand nicht da. **Eine laufende
     * Uhr über einem stehenden Lauf sieht aus wie Fortschritt.**
     *
     * Gezählt wird der Abstand zum letzten FERTIGEN Aufruf, nicht zum Start.
     * Das ist die Zahl, an der man Arbeit von Stillstand unterscheidet — und
     * sie steht ab der ersten Sekunde da, nicht erst ab einer Schwelle: eine
     * Auskunft, die erst bei Verdacht erscheint, kommt zu spät.
     */
    let letzteZahl = -1, letzteRegung = Date.now();
    const stehtAb = stillstandAbMs({ maxRunden: MAX_RUNDEN, fristMs: FRIST_MS });
    umfangTakt = setInterval(() => {
      const getan = (kasseKonf ? kasseKonf.aufrufe.length : 0) + kasse.aufrufe.length;
      if (getan !== letzteZahl) { letzteZahl = getan; letzteRegung = Date.now(); }
      window.__werkstatt.speise("umfang", {
        getan, gesamt: erwartet, mitKonferenz,
        seitRegungMs: Date.now() - letzteRegung, stehtAbMs: stehtAb,
      });
    }, 1000);
    const konf = mitKonferenz ? await konferenz({
      api, mitarbeiter, kasse: kasseKonf, spindAblage: ablage,
      unterlagen: stand.unterlagen.length ? stand.unterlagen : null,
      grundsaetze: g, werkbank, lage: auftrag.ziel,
      /* `anteil: 1` — die Konferenz hat hier eine EIGENE Kasse, ihr Anteil ist
         also schon im Deckel enthalten. Ohne diese Zeile nähme sie ein Drittel
         von einem Drittel. */
      anteil: 1,
      /*
       * ⚠ DAS BILD FOLGT JETZT AUCH HIER MIT (Klaus 2026-09-07). Vorher meldete
       * sich nur `schicht()`; die Konferenz — bei acht Rollen SIEBZEHN von rund
       * dreissig Aufrufen — lief hinter einer stehenden Bühne ab. Das ist die
       * erste Hälfte jedes Laufs und die erste, die man sieht: wer hier
       * zusieht, sah minutenlang nichts und hielt es für einen Hänger.
       */
      aufZwischenstand: (z) => window.__werkstatt.speise("konferenz", z),
    }) : null;
    /*
     * ⚠ SIE STEHT HIER, WEIL SIE GLEICH DARUNTER GERUFEN WIRD (Klaus
     * 2026-09-07, mit Bild): „Die Schicht ist abgebrochen: Cannot access
     * 'blattSchreiben' before initialization."
     *
     * Ein `const` ist in seiner toten Zone nicht nur undefiniert — der Zugriff
     * WIRFT. Die Definition stand unter dem `if (konf) { … }`, das sie
     * benutzt; damit starb JEDE Schicht mit Konferenz genau an der teuersten
     * Stelle: siebzehn Aufrufe bezahlt, und dann nichts.
     *
     * ⚠ UND KEINE PROBE HAT ES GESEHEN. Sie lasen den Quelltext; die
     * Browser-Probe fuhr den Weg OHNE Konferenz. Dieselbe Lehre wie am
     * 2026-08-23 („ein Wächter, der eine Datei LIEST, misst nicht, ob sie
     * LÄUFT") — nur an einem Zweig, den keine Probe je betreten hat.
     */
    /*
     * ══ EINE STELLE, DIE DAS BLATT BAUT ═════════════════════════════════
     *
     * Sie wird zweimal gerufen: nach der Konferenz (ohne Schärfung, als
     * Versicherung) und noch einmal, sobald Ben geschärft hat. Der zweite
     * Aufruf überschreibt den ersten — das frühe Blatt ist die Rückfalllinie
     * für eine Schicht, die danach stirbt, das späte das vollständige.
     *
     * ⚠ UND ES ENTSTEHT AUCH OHNE KONFERENZ (Klaus 2026-09-07). Sein
     * Mindestmaß gilt auch dann, wenn er den Haken wegnimmt; bis dahin bekam
     * er in dem Fall wieder nichts.
     */
    const blattSchreiben = (schaerfung) => {
      const heute = new Date().toISOString().slice(0, 10);
      const text = (konf && konf.ok && konf.auftrag)
        ? planBlatt(konf, kasseKonf.bericht(), heute, !echt, schaerfung)
        : auftragsBlatt({ auftrag, schaerfung, bericht: kasse.bericht(),
                          datum: heute, trocken: !echt });
      letzterStand.blatt = { text, ausBeispiel: false };
      window.__werkstatt.speise("blatt", letzterStand.blatt);
    };

    if (konf) {
      /* ⚠ MIT IHRER KASSE (Klaus 2026-09-07). Der Node-Weg legt sie seit jeher
         in `konferenz.json` ab (`schreibeKonferenz`); im Browser fehlte sie —
         und die Kachel „Diese Schicht" konnte deshalb gar nicht summieren.
         Sie meldete 0,02 € fuer einen Lauf, der 0,50 € gekostet hat. */
      konf.kasse = kasseKonf.bericht();
      window.__werkstatt.speise("konferenz", konf);
      /*
       * ══ DAS ÜBERGABE-BLATT — DER AUSGANG, DER GEFEHLT HAT ═══════════════
       *
       * Klaus 2026-09-07, nach drei Tagen ohne Ergebnis: „ich müsste
       * mindestens einen Prompt herausbekommen, den ich an ein großes Modell
       * weitergeben kann, damit der etwas bauen kann."
       *
       * Das Blatt IST dieser Prompt — und es entstand bis heute nur in Node.
       * Raum 2 meldete bei jedem Browser-Lauf „Das Übergabe-Blatt fehlt".
       *
       * ⚠ ES ENTSTEHT HIER, NICHT AM ENDE. Eine Schicht, die später abbricht
       * oder am Deckel stirbt, hat die Konferenz trotzdem bezahlt — und dann
       * ist dieses Blatt das EINZIGE, was übrig bleibt. Am Ende gebaut wäre
       * es genau in dem Fall weg, in dem man es am nötigsten braucht.
       */
      if (konf.ok && konf.auftrag) blattSchreiben("");
      /*
       * ══ DER SIEGER WIRD DER AUFTRAG ═══════════════════════════════════
       *
       * ⚠ DIESE ZEILE HAT GEFEHLT — und sie ist der teuerste Befund aus Klaus'
       * erstem echten Lauf mit der Vorlage (2026-09-07).
       *
       * Die Konferenz kostete 0,47 € in siebzehn Aufrufen und wählte mit
       * 33 Punkten den „Spannungsfall-Rechner für Leitungen". Danach bekam die
       * Schicht weiterhin den URSPRÜNGLICHEN Text aus dem Feld — sie hatte vom
       * Sieger nie gehört. Nora schlug daraufhin etwas ganz anderes vor
       * („Werkstatt-Nachricht: Stilles Schwarzes Brett"), Ben schärfte das
       * Neue, und das Übergabe-Blatt trug oben den einen und unten den anderen
       * Auftrag. **Ein Blatt mit zwei verschiedenen Aufträgen darin.**
       *
       * `lauf.mjs` macht es seit jeher richtig (`auftrag = konf.auftrag`). Im
       * Browser fehlte die Zeile schlicht — und keine Probe fragte danach, weil
       * die Browser-Probe den Weg mit Konferenz nicht bis hierher fährt.
       *
       * Der Sieger trägt `ausKonferenz: true`; `rollen.mjs` sagt Nora daraufhin
       * ausdrücklich, dass das WAS entschieden ist und sie es nicht wechselt.
       */
      if (konf.ok && konf.auftrag) auftrag = konf.auftrag;
      letzterStand.konferenz = konf;
      letzterStand.wann = new Date().toISOString();
      await standSichern();

      /*
       * ══ DIE KONFERENZ WIRD HIER GEBUCHT, NICHT AM SCHICHTENDE ═══════════
       *
       * ⚠ ZUM DRITTEN MAL DERSELBE BEFUND, nur eine Ebene weiter. Am
       * 2026-08-22 hiess er „als hätten sie nie gearbeitet und kein Geld
       * gekostet", am 2026-09-06 „ein bezahlter Lauf, den man nicht anhalten
       * kann". Hier: die Konferenz ist bezahlt und durch — und dahinter
       * wartet das TOR, unbegrenzt lange, auf Klaus' Entscheidung. Lädt er in
       * dieser Zeit die Seite neu, läuft KEIN Abbruch-Pfad: das `catch` unten
       * bekommt nichts mit, wenn die Seite selbst verschwindet. Siebzehn von
       * rund dreissig Aufrufen standen danach in keinem Buch.
       *
       * Gebucht wird deshalb, sobald sie durch ist — mit `planmodus`, dem Namen,
       * den eine Konferenz ohne Bau auch an der Kommandozeile trägt.
       *
       * ⚠ UND SIE WIRD DANACH NICHT NOCH EINMAL GEBUCHT. Der Eintrag am Ende
       * trägt seither NUR die Schicht-Kasse; sonst stünde dieselbe Ausgabe
       * zweimal im Buch, und eine zu hohe Zahl ist derselbe Fehler wie eine zu
       * niedrige, nur andersherum.
       */
      konfGebucht = await fahrtEintragen({
        art: "planmodus", echt, bericht: kasseKonf.bericht(), mitarbeiter,
        titel: (konf.auftrag && konf.auftrag.ziel) || (($("ziel").value || "").trim()),
        ergebnis: konf.ok
          ? `Sieger: ${(konf.auftrag && konf.auftrag.ziel) || "—"}`
          : "Konferenz ohne Ergebnis",
      });
    }

    /* Ab HIER läuft die Schicht. Der Zeitpunkt geht als `beginn` in ihren
       Eintrag: die Schicht-Kasse steht schon seit vor der Konferenz, und ihr
       `beginnIso` würde deren Zeit ein zweites Mal mitzählen. Das Warten am
       Tor gehört dagegen hinein — es IST Arbeitszeit, so steht es in
       `schicht.mjs` an der Stelle, an der das Tor wartet. */
    schichtBeginn = new Date().toISOString();


    /* ⚠ HIER LÖST SICH DIE NAHT EIN. `schicht.mjs` gibt seinen Zwischenstand in
       DERSELBEN Form heraus wie das Endergebnis — das steht dort im Code, mit
       der Begründung „zwei Formen wären zwei Stellen, an denen eine Anzeige
       etwas anderes behauptet als die Datei". Also geht er unverändert in die
       Räume: Bühne, Konferenz, Übergabe, Ergebnis zeichnen mit, während die
       Schicht läuft. */
    const lauf = await schicht({
      api, auftrag, mitarbeiter, kasse, spindAblage: ablage, grundsaetze: g, werkbank,
      unterlagen: stand.unterlagen.length ? stand.unterlagen : null,
      /* ⚠ NUR BEIM ECHTEN LAUF. Im Trockenlauf kostet das Bauen nichts, und ein
         Tor, das dort nach Freigabe fragt, hält eine Vorführung an, die gerade
         zeigen soll, dass die Kette durchläuft. */
      freigabe: echt ? torOeffnen : null,
      aufZwischenstand: (z) => {
        window.__werkstatt.speise("lauf", z);
        /* Sobald Ben geschärft hat, bekommt das Blatt seinen nützlichsten
           Absatz. Vorher gab es ihn nirgends: das Blatt wurde am Ende der
           Konferenz geschrieben, und Ben kommt danach. */
        if (z && z.spec && z.spec.schaerfung) blattSchreiben(z.spec.schaerfung);
        letzterStand.lauf = z;
        letzterStand.wann = new Date().toISOString();
        standSichern();
      },
    });

    /* ⚠ GESICHERT WIRD NUR NACH EINEM ECHTEN LAUF — dieselbe Zusicherung wie in
       Node, an derselben Stelle. Ein zweiter Riegel in der Ablage sähe nach mehr
       Sicherheit aus und wäre weniger. */
    if (echt) await ablage.sichern();

    stand.letzterLauf = lauf;
    window.__werkstatt.speise("lauf", lauf);
    letzterStand.lauf = lauf;
    letzterStand.wann = new Date().toISOString();
    letzterStand.fertig = true;
    await standSichern();

    /* ⚠ ERST DAS BUCH, DANN DIE MELDUNG. Bricht etwas dazwischen ab, steht die
       Fahrt im Buch und die Meldung fehlt — andersherum wäre Geld ausgegeben,
       das nirgends steht, und genau diese Lücke war der Befund. Dieselbe
       Reihenfolge wie in `lauf.mjs`. */
    await fahrtEintragen({
      art: "schicht", echt,
      /* ⚠ NUR NOCH DIE KONFERENZ, DIE NICHT SCHON GEBUCHT IST.
         Bis zum 2026-09-07 stand hier nur die Schicht-Kasse, und die Konferenz
         — bei acht Rollen SIEBZEHN von rund dreissig Aufrufen — fehlte im Buch
         (gemessen: 0,47 € + 0,01 € ausgegeben, 0,01 € gebucht). Dann standen
         beide hier, und die Konferenz war bis zum Schichtende ungebucht — ein
         Neuladen am offenen Tor liess sie spurlos verschwinden. Jetzt bucht
         sie sich selbst, sobald sie durch ist, und `konfGebucht` hält fest,
         dass es geschehen ist. `zusammen` bleibt für den Fall stehen, dass es
         NICHT geschah (Konferenz ohne verwertbaren Sieger) — dann ist ihr Geld
         hier immer noch besser aufgehoben als nirgends. */
      bericht: konfGebucht
        ? (lauf && lauf.kasse)
        : zusammen(kasseKonf && kasseKonf.bericht(), lauf && lauf.kasse),
      beginn: konfGebucht ? schichtBeginn : "",
      mitarbeiter,
      titel: (auftrag && auftrag.ziel) || "",
      ergebnis: (lauf && lauf.ergebnis && lauf.ergebnis.urteil) || "",
    });
  } catch (e) {
    /* Ein Abbruch ist ein Stand wie jeder andere — er wird gesichert, nur
       ausdrücklich NICHT als fertig. Ohne diese Zeile wäre der letzte
       Zwischenstand nach einem Absturz beim nächsten Öffnen als „fertig"
       zu sehen, und das wäre ein behauptetes Ergebnis. */
    letzterStand.fertig = false;
    letzterStand.wann = new Date().toISOString();
    /* ⚠ UND DIE ANZEIGE HÖRT AUF ZU LAUFEN. Ohne diese Zeile zählte die Uhr
       nach dem Abbruch weiter, während die Meldung daneben sagte, dass er
       stattgefunden hat. Von zwei Auskünften, die einander widersprechen,
       glaubt man der lauteren — und das ist die laufende Uhr. */
    anzeigeAnhalten();
    standSichern();

    /* ⚠ UND DIE ABGEBROCHENE FAHRT GEHÖRT INS BUCH, WEIL sie abgebrochen ist:
       was bis dahin hinausging, IST bezahlt. Ohne diesen Eintrag fehlte das
       Geld in der Buchhaltung — und eine zu niedrige Zahl sieht genauso aus
       wie eine gemessene. Klaus' Grund war ein anderer und derselbe: „damit
       man sehen kann, für die Forschung, was schiefgelaufen ist." */
    try {
      await fahrtEintragen({
        art: "abbruch", echt,
        /* Auch hier: die Konferenz nur, wenn sie nicht schon ihren eigenen
           Eintrag hat. Eine Schicht, die nach der Konferenz stirbt, hat deren
           Aufrufe bezahlt — das ist der Fall, in dem die Lücke am teuersten
           war, denn er trifft genau die Läufe ohne Ergebnis. Seit die Konferenz
           sich selbst bucht, stünde sie hier ein zweites Mal. */
        bericht: konfGebucht
          ? (kasse && kasse.bericht())
          : zusammen(kasseKonf && kasseKonf.bericht(), kasse && kasse.bericht()),
        beginn: konfGebucht ? schichtBeginn : "",
        mitarbeiter,
        titel: (($("ziel").value || "").trim()) || "",
        /* Der GRUND steht im Buch, nicht nur „abgebrochen". Ein Eintrag, der
           verschweigt, woran es lag, dokumentiert die Zeile und nicht den
           Vorfall. */
        ergebnis: "abgebrochen: " + (e && e.message ? e.message : String(e)),
      });
    } catch (err) { console.warn("Abbruch nicht ins Buch:", err); }
    /*
     * ⚠ DER GRUND BEKOMMT EINE EIGENE ZEILE — sonst wischt ihn das `finally`
     * weg. `startLageZeichnen()` schreibt `#start-sagt` bedingungslos neu; die
     * Abbruch-Meldung stand also genau so lange da, wie der `catch` dauert,
     * und Klaus sah danach „Bereit." Eine Schicht, die stirbt und dabei sagt
     * „bereit", ist die schlimmste Auskunft von allen.
     *
     * Dieselbe Lehre wie bei `#wieder-sagt` am 2026-09-05: **zwei Aussagen,
     * zwei Zeilen.**
     */
    const p = $("abbruch-sagt");
    p.hidden = false;
    p.setAttribute("data-abbruch", "ja");
    p.textContent = "Die Schicht ist abgebrochen: " + (e && e.message ? e.message : e);
  } finally {
    stand.laeuft = false;
    laufendesNotaus = null;
    /* Der Zähler geht mit dem Lauf — sonst tickte er weiter und die Uhr
       schätzte eine Restzeit für etwas, das längst vorbei ist. */
    if (umfangTakt) clearInterval(umfangTakt);
    window.__werkstatt.speise("umfang", null);
    /* Und weg damit — sonst tickte sie weiter, während nichts mehr läuft.
       Der fertige Lauf trägt seine eigene Zeit; ab hier gilt wieder seine. */
    window.__werkstatt.speise("schichtlaeuft", null);
    /* ⚠ AUCH HIER, UND ZWAR IM `finally`. Stirbt der Lauf, WÄHREND das Tor
       offen steht (ein Fehler im Tor selbst, ein Abbruch von aussen), käme
       `schliesse` nie dazu, die Marke wegzunehmen — und die Bühne sagte
       danach „wartet auf deine Entscheidung" über einem Lauf, den es nicht
       mehr gibt. Ein Zustand, aus dem die Seite keinen Weg zeigt, ist ein
       toter Knopf ohne Knopf. Zweimal wegnehmen schadet nicht; einmal
       vergessen schon. */
    window.__werkstatt.speise("torwartet", null);
    startLageZeichnen();
  }
}

$("trocken").onclick = () => fahre({ echt: false });
$("echt").onclick = () => fahre({ echt: true });

/* ⚠ EIN ZURÜCK IST EINE FINGERBEWEGUNG, EIN BEZAHLTER LAUF NICHT.
 * Der Browser fragt nur nach, wenn eine Seite es verlangt — und er fragt nur,
 * WENN etwas läuft: eine Nachfrage, die immer kommt, klickt man weg, ohne sie
 * zu lesen. Sie hält niemanden auf, der wirklich gehen will; sie macht aus
 * einem stillen Verlust eine Entscheidung. Den Text bestimmt der Browser,
 * nicht wir — deshalb steht hier keiner. */
window.addEventListener("beforeunload", (e) => {
  if (!stand.laeuft) return;
  e.preventDefault();
  e.returnValue = "";
});

/* ══ WAS BEIM ÖFFNEN WIEDER DA IST ══════════════════════════════════════════
 * Der letzte Stand kommt zurück in die Räume — und mit ihm die Angabe, WANN er
 * war und ob er zu Ende lief. Ein abgebrochener Lauf, der aussieht wie ein
 * fertiger, behauptet ein Ergebnis, das es nicht gibt. */
/* Das Buch dieses Browsers kommt beim Öffnen in die Buchhaltung — sonst stünde
 * dort „kein Fahrtenbuch", während die Fahrten daneben im Speicher liegen. */
(async function buchZeigen() {
  const buch = await buchLesen();
  if (buch.fahrten.length) window.__werkstatt.speise("fahrten", buch);
})();

(async function laufWiederherstellen() {
  let roh = null;
  try { roh = await idb.lies(LAUF_FACH); } catch (e) { roh = null; }
  if (!roh) return;
  let g = null;
  try { g = JSON.parse(roh); } catch (e) { return; }
  if (!g || (!g.lauf && !g.konferenz)) return;

  letzterStand = g;
  /* `laeuft: false` aus demselben Grund wie bei `g.lauf` unten: was aus der
     Ablage kommt, läuft nicht. Seit die Konferenz einen Zwischenstand meldet,
     trägt auch sie das Feld — und ohne diese Zeile hätte die wiederhergestellte
     Konferenz eine Geister-Meldung ergeben, genau die, die unten beschrieben
     ist, nur an der anderen Hälfte. */
  if (g.konferenz) window.__werkstatt.speise("konferenz", { ...g.konferenz, laeuft: false });
  /*
   * ⚠ WAS AUS DER ABLAGE KOMMT, LÄUFT NICHT — und daran hing Klaus' Geister-
   * Schicht (2026-09-07): seine Seite zeigte „Schicht läuft · 7:09:36", und
   * es lief nichts.
   *
   * `zwischenstand()` in `schicht.mjs` trägt fest `laeuft: true` — richtig,
   * solange er WÄHREND des Laufs herausgereicht wird. Gesichert wird er
   * trotzdem, und beim nächsten Öffnen kam er unverändert zurück in die
   * Anzeige. Die Bühne las `laeuft: true` und den ursprünglichen Beginn, also
   * zählte sie los; der Notaus lebt aber im Arbeitsspeicher und war nach dem
   * Neuladen weg. **Eine Uhr, die läuft, und kein Knopf, der sie anhält.**
   *
   * Das ist dieselbe Sorte wie „ein abgebrochener Lauf, der aussieht wie ein
   * fertiger" — nur eine Ebene weiter: ein toter Lauf, der aussieht wie ein
   * laufender. Und die schlimmere Hälfte ist, dass sie jedes Neuladen
   * überlebt: sie liegt in IndexedDB, bis ein neuer Lauf sie überschreibt.
   *
   * Die Zeile gehört HIERHIN und nicht in `zwischenstand()`: dort ist
   * `laeuft: true` die Wahrheit. Falsch wird es erst beim Wiederherstellen —
   * also wird es dort geradegerückt, an der Stelle, die weiss, dass sie aus
   * der Ablage liest.
   */
  if (g.lauf) window.__werkstatt.speise("lauf", { ...g.lauf, laeuft: false });
  /* Auch das Blatt überlebt ein Neuladen — sonst wäre der Auftrag weg, den
     Klaus gerade weitergeben wollte. */
  if (g.blatt) window.__werkstatt.speise("blatt", g.blatt);

  /* ⚠ EIGENE ZEILE, NICHT `#start-sagt` (Klaus 2026-09-06: „Trockenlauf startet
   * nicht"). Die erste Fassung schrieb diese Meldung in dieselbe Zeile, in der
   * `startLageZeichnen()` sagt, WARUM nichts startet — „fehlt noch der
   * Auftrag", „fehlt noch dein Schlüssel". Sie überdeckte damit genau die
   * Auskunft, die man in dem Moment braucht, und aus „es fehlt etwas" wurde
   * „es geht einfach nicht".
   *
   * Zwei Aussagen, zwei Zeilen. Die Bereitschafts-Zeile gehört
   * `startLageZeichnen()` allein — sonst streiten sich zwei Schreiber um
   * denselben Platz, und wer gewinnt, hängt an der Reihenfolge. */
  const anker = $("start-sagt");
  if (!anker) return;
  let w = document.getElementById("wieder-sagt");
  if (!w) {
    w = document.createElement("p");
    w.id = "wieder-sagt";
    w.className = anker.className;
    anker.insertAdjacentElement("afterend", w);
  }
  const wann = g.wann ? new Date(g.wann).toLocaleString("de-DE") : "unbekannt";
  w.setAttribute("data-wieder", g.fertig ? "fertig" : "abgebrochen");
  w.textContent = g.fertig
    ? `Der letzte Lauf vom ${wann} ist wieder da — er lief zu Ende.`
    : `Der letzte Lauf vom ${wann} ist wieder da, ABER er lief NICHT zu Ende. ` +
      `Was du siehst, ist der Stand bis zum Abbruch, kein Ergebnis.`;
  /* ⚠ UND DER KNOPF WIRD NEU GEZEICHNET. Er hängt an dem, was die ANZEIGE
     behauptet; wird die beim Öffnen gefüllt, muss er danach noch einmal
     hinsehen. Ohne diese Zeile stünde er auf dem Stand von vor der
     Wiederherstellung — ausgegraut über einer Anzeige, die einen Lauf zeigt. */
  startLageZeichnen();
})();

/* ══ WAS DIE SEITE SICH HOLT ═══════════════════════════════════════════════ */
async function holeMitarbeiter() {
  const a = await fetch("schicht/mitarbeiter.json");
  if (!a.ok) throw new Error(
    `Die Besetzung (schicht/mitarbeiter.json) war nicht zu holen: ${a.status}. ` +
    `Ohne sie weiss die Schicht nicht, wer welche Rolle hat — abgebrochen statt geraten.`);
  const d = await a.json();
  const m = d.mitarbeiter || [];
  for (const r of ROLLEN_REIHE)
    if (!m.some((x) => x.rolle === r)) throw new Error(`Für die Rolle „${r}" ist niemand eingetragen.`);
  return m;
}

/* ⚠ UNTERSCHIEDEN STATT GERATEN. `KEINE` heisst ausdrücklich „ohne Haltung" und
   trägt seinen Hinweis mit; ein vergessenes `undefined` liesse `macheRufer`
   abbrechen. Das eine ist eine Entscheidung, das andere ein Versehen. */
async function holeGrundsaetze() {
  try {
    const a = await fetch("schicht/grundsaetze.md");
    if (!a.ok) return KEINE;
    return deuteGrundsaetze(await a.text(), { woher: "schicht/grundsaetze.md" });
  } catch { return KEINE; }
}

/* ══ HOCHFAHREN ════════════════════════════════════════════════════════════ */
(async function start() {
  await schluesselLageZeichnen();
  startLageZeichnen();
  /* Der Haken für die Proben. Er gibt NIE ein Geheimnis heraus — nur ja/nein.
     Ein Test-Haken, der ein Geheimnis herausreicht, ist ein Loch mit Prüfsiegel;
     genau das hat die Gegenprobe in Kimhub am 2026-08-22 bewiesen. */
  window.__company = {
    bereit: true,
    hatSchluessel: () => stand.schluessel !== null,
    hatPasswort: () => stand.passwort !== null,
    laeuft: () => stand.laeuft,
    dateien: () => Object.keys(stand.dateien).slice(),
    letzterLauf: () => (stand.letzterLauf ? JSON.parse(JSON.stringify(stand.letzterLauf)) : null),
    /* ⚠ FÜR DIE EINE PRÜFUNG, DIE GEFEHLT HAT (2026-09-07): kam der Sieger der
       Konferenz wirklich bei der Schicht an? Die Browser-Probe fuhr den Weg mit
       Konferenz und prüfte nur, DASS etwas herauskam — nicht, dass es dasselbe
       ist. Genau dadurch blieb ein Lauf grün, in dem die Abstimmung ins Leere
       lief. Hier ist kein Geheimnis drin: es ist der Auftragstext, den der
       Nutzer selbst sieht. */
    letzterSieger: () => (letzterStand.konferenz && letzterStand.konferenz.auftrag
      ? { ziel: letzterStand.konferenz.auftrag.ziel,
          sieger: letzterStand.konferenz.auftrag.sieger || null } : null),
    /* ⚠ EINE WHITELIST, KEIN DURCHREICHEN DES BUCHES (2026-09-07). Gebraucht
       wird die FORM der Buchung — dass eine Konferenz ihre eigene Fahrt bekommt
       und die Schicht danach ihre, ohne dieselbe Stunde zweimal zu nennen.
       Dafür reichen vier Felder. Was hier nicht steht, kann nicht heraus, auch
       wenn das Fahrtenbuch morgen ein Feld mehr trägt — dieselbe Bauart wie
       PROTOKOLL_FELDER im Übergabe-Block. */
    fahrten: async () => {
      const b = await buchLesen();
      return (b.fahrten || []).map((f) => ({
        art: f.art, echt: f.echt, beginn: f.beginn, beendet: f.beendet,
        eur: f.eur, aufrufe: f.aufrufe,
      }));
    },
    idbName: idb.name,
  };
})();
