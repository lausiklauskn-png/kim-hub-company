/*
 * company.js — die Seite, die eine Schicht IM BROWSER startet.
 *
 * ══ WAS HIER STEHT UND WAS NICHT ═══════════════════════════════════════════
 *
 * Hier steht die BEDIENUNG, sonst nichts. Wie eine Schicht abläuft, was sie
 * kosten darf, was im Gedächtnis gilt, was ein Werkzeug lesen darf — das alles
 * liegt in `schicht/*.mjs` und wird von hier nur gerufen. Eine zweite Fassung
 * davon im Browser wäre eine Drift-Quelle mit Ansage: dann liefe die Seite
 * anders als die Kommandozeile, und niemand wüsste, welche recht hat.
 *
 * Vier Nähte tragen das, alle vier nach demselben Muster — WO etwas herkommt
 * ist von WAS dabei gilt getrennt:
 *
 *   Bote    `transport-netz.mjs`   statt des SDK, das es im Browser nicht gibt
 *   Ablage  `ablage-idb.mjs`       statt Dateien
 *   Baum    `baum-speicher.mjs`    statt des Depots — hier: was der Nutzer übergibt
 *   Tresor  `schluesseltresor.js`  der Schlüssel, verschlüsselt, an einer Stelle
 *
 * ⚠ WAS ES HIER NICHT GIBT UND AUCH NICHT GEBEN SOLL: eine Übergabe an
 * irgendeinen Empfänger. Der Bauplan sieht sie vor (Entscheidung 1), und sie
 * setzt einen Absatz in einer Datenschutzerklärung voraus, den es noch nicht
 * gibt — „Sperrgrund für die Scheibe, nicht Nacharbeit". Ein Knopf, der sie
 * andeutet, wäre ein toter Knopf mit Beschriftung.
 */
import "./idb.js";
import "./schluesseltresor.js";
import { schicht, ROLLEN_REIHE } from "./schicht/schicht.mjs";
import { EchteApi, TrockenApi } from "./schicht/api.mjs";
import { netzTransport } from "./schicht/transport-netz.mjs";
import { Kasse } from "./schicht/kosten.mjs";
import { BEISPIELE } from "./schicht/beispiele.mjs";
import { deuteGrundsaetze, KEINE } from "./schicht/grundsaetze.mjs";
import { idbAblage } from "./schicht/ablage-idb.mjs";
import { speicherBaum } from "./schicht/baum-speicher.mjs";
import { macheWerkbank } from "./schicht/werkzeuge.mjs";

const TRESOR = globalThis.WERKSTATT_SCHLUESSEL;
const IDB = globalThis.WERKSTATT_IDB;
/* ⚠ ABGEBROCHEN STATT HALB WEITERGEMACHT. Ohne Tresor gäbe es keine
   Verschlüsselung, ohne Ablage keinen Wohnort — beides wäre eine Seite, die
   aussieht, als täte sie etwas. */
if (!TRESOR || !IDB) throw new Error(
  "schluesseltresor.js oder idb.js haben sich nicht ans Global gehängt.");

/* Der Name IST die Grenze zur Schwester-App: auf einer geteilten Adresse
   (`github.io`) gehört IndexedDB dem Ursprung, nicht der App. Dieselbe Regel
   wie der DB-Suffix in den SBKIM-Apps. */
const idb = IDB.macheIdb({ name: "KimHubCompany1" });

const $ = (id) => document.getElementById(id);
const zeigen = (el, ja) => { el.hidden = !ja; };

/* ── Der Zustand dieser Seite. Klein halten: was die Schicht weiss, weiss die
      Schicht, und wird von dort gelesen statt hier zweitgeführt. ──────────── */
const stand = {
  passwort: null,       // NUR im Arbeitsspeicher. Nie in eine Ablage.
  schluessel: null,     // dito — sobald aufgeschlossen
  basisUrl: null,
  laeuft: false,
  abbrechen: false,
  letzterLauf: null,
  dateien: {},          // was der Nutzer übergeben hat: {pfad: text}
};

/* ══ THEMA UND FRISCH ═══════════════════════════════════════════════════════ */
$("thema").onclick = () => {
  const w = document.documentElement.getAttribute("data-thema") === "tag" ? "nacht" : "tag";
  document.documentElement.setAttribute("data-thema", w);
  try { localStorage.setItem("kimhub_company_thema", w); } catch { /* privates Fenster */ }
};

/* Nur eine GEÄNDERTE Adresse ist für den HTTP-Cache eine andere Datei.
   `location.reload()` genügt nicht, und `reload(true)` ignorieren die Browser
   längst — dieselbe Bauart wie der ⟳ in PWA Toolpoint. */
$("frisch").onclick = async () => {
  try {
    if (window.caches) for (const k of await caches.keys()) await caches.delete(k);
    if (navigator.serviceWorker) {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    }
  } catch { /* auch ohne das neu laden */ }
  const u = new URL(location.href);
  u.searchParams.set("frisch", String(Date.now()));
  location.replace(u.toString());
};

/* ══ TEIL 2 · DER SCHLÜSSEL ═════════════════════════════════════════════════
 *
 * Drei Zustände, und sie werden UNTERSCHIEDEN statt geraten — jeder andere
 * Name führte den Nutzer in die falsche Richtung. Genau dafür gibt `holen()`
 * drei verschiedene Gründe zurück (`leer` · `fassung` · `passwort`).
 */
function lageSetzen(stand_, text) {
  const l = $("schluessel-lage");
  l.setAttribute("data-stand", stand_);
  $("schluessel-lage-text").textContent = text;
}
function sagt(text, sorte = "") {
  const p = $("schluessel-sagt");
  p.textContent = text;
  p.setAttribute("data-sagt", sorte);
}

async function schluesselLageZeichnen() {
  const liegt = await TRESOR.liegtEtwas(idb);
  const offen = stand.schluessel !== null;

  zeigen($("neu-block"), !liegt || offen === false && !liegt);
  zeigen($("einlegen"), !liegt || offen);
  zeigen($("aufschliessen"), liegt && !offen);
  zeigen($("werfen"), liegt);
  $("pw-zweck").textContent = liegt
    ? "— dasselbe wie beim Einlegen" : "— du wählst es jetzt";

  if (offen) {
    lageSetzen("offen", "aufgeschlossen, für diesen Besuch");
    zeigen($("neu-block"), false);
    $("echt").disabled = false;
  } else if (liegt) {
    lageSetzen("zu", "verschlossen — Passwort eingeben");
    $("echt").disabled = true;
  } else {
    lageSetzen("leer", "keiner hinterlegt");
    zeigen($("neu-block"), true);
    $("echt").disabled = true;
  }
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
       sonst an der falschen Stelle. Der Schlüssel selbst steht NIE in der
       Meldung; die Prüfung gibt ihn auch nicht heraus. */
    sagt(e.pruefung ? `${e.pruefung.grund}. ${e.pruefung.hinweis}`
                    : "Konnte nicht abgelegt werden: " + e.message, "fehler");
    return;
  }
  stand.passwort = pw;
  stand.schluessel = key;
  stand.basisUrl = $("basis").value.trim() || null;
  $("key").value = "";
  /* Erst FRAGEN, wenn es etwas zu schützen gibt — vorher verlangt eine leere
     App etwas, das sie nicht braucht. */
  const dauer = await IDB.dauerhaft();
  sagt(`Abgelegt und aufgeschlossen. Der Browser sagt zum dauerhaften Speicher: ` +
       `${dauer ? "zugesagt" : "nicht zugesagt — er darf ihn aufräumen"}.`, "gut");
  await schluesselLageZeichnen();
  await speicherLageZeichnen();
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
    /* ERST DIE FASSUNG, DANN DAS PASSWORT — und jeder Grund bekommt seinen
       eigenen Satz. Ein Paket aus einer künftigen Fassung als „falsches
       Passwort" zu melden schickte den Nutzer los, ein richtiges Passwort
       immer wieder einzutippen. Eine Auskunft, die in die falsche Richtung
       zeigt, ist teurer als gar keine. */
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

async function speicherLageZeichnen() {
  const l = await IDB.lage();
  const p = $("speicher-lage");
  p.setAttribute("data-wo", l.dauerhaft ? "dauerhaft" : "widerruflich");
  p.textContent = "Wohnort deiner Daten: dieser Browser, dieses Gerät. " +
    (l.dauerhaft
      ? "Der Browser hat dauerhaften Speicher zugesagt."
      : "Der Browser hat dauerhaften Speicher NICHT zugesagt — er darf ihn bei " +
        "Platzmangel aufräumen. Browserdaten löschen tut es in jedem Fall.");
}

/* ══ TEIL 3 · WAS DIE ROLLEN LESEN DÜRFEN ══════════════════════════════════
 *
 * „Was der Nutzer übergibt" (Klaus 2026-09-04). Nicht der Quelltext dieser
 * Seite — dann läsen die Rollen unsere Innereien, während der Nutzer nach
 * SEINER Arbeit fragt. Und nicht „nichts": drei Werkzeuge, die dastehen und
 * „geht nicht" sagen, kosten in einem echten Lauf eine BEZAHLTE Runde.
 *
 * Also: keine Dateien ⇒ gar keine Werkbank, und daneben steht warum.
 */
$("dateien").onchange = async (e) => {
  const liste = [...(e.target.files || [])];
  stand.dateien = {};
  for (const f of liste) {
    try { stand.dateien[f.name] = await f.text(); }
    catch { /* was sich nicht als Text lesen lässt, kommt nicht in den Baum */ }
  }
  const n = Object.keys(stand.dateien).length;
  $("dateien").nextElementSibling.innerHTML = n
    ? `<b>${n} ${n === 1 ? "Datei" : "Dateien"}</b> übergeben. Die Rollen dürfen ` +
      `darin <b>lesen und suchen</b> — schreiben kann keines der Werkzeuge, es ` +
      `gibt kein schreibendes. Was du nicht übergibst, sehen sie nicht.`
    : `Ohne Dateien laufen die Rollen <b>ohne Werkzeuge</b> — und das ist Absicht: ` +
      `drei Werkzeuge, die „geht nicht" antworten, kosten in einem echten Lauf ` +
      `eine <b>bezahlte</b> Runde.`;
};

/* ══ TEIL 4 · DER LAUF ══════════════════════════════════════════════════════ */
function startLageZeichnen() {
  const ziel = $("ziel").value.trim();
  const p = $("start-sagt");
  $("trocken").disabled = stand.laeuft;
  $("echt").disabled = stand.laeuft || !stand.schluessel || !ziel;
  p.setAttribute("data-start",
    stand.laeuft ? "laeuft" : !ziel ? "ohne-auftrag" : !stand.schluessel ? "ohne-schluessel" : "bereit");
  p.textContent = stand.laeuft
    ? "Eine Schicht läuft. Zwei gleichzeitig gingen auf dasselbe Gedächtnis."
    : !ziel
      ? "Für den echten Lauf fehlt noch der Auftrag. Der Trockenlauf geht auch ohne — er spielt eine hinterlegte Schicht ab."
      : !stand.schluessel
        ? "Für den echten Lauf fehlt noch dein Schlüssel (Abschnitt 2). Der Trockenlauf geht ohne."
        : "Bereit. Der echte Lauf gibt höchstens den Deckel aus, den du oben gesetzt hast.";
}
$("ziel").oninput = startLageZeichnen;
$("deckel").oninput = () => {
  const d = Number($("deckel").value);
  $("deckel-sagt").textContent = d >= 0.2
    ? `Eine gemessene Schicht kostete am 2026-08-23 rund 0,42 € — sie war nach einer Runde nicht fertig. Was eine Schicht kostet, die bis „fertig" läuft, ist nicht gemessen.`
    : "Unter 0,20 € reicht es nicht einmal für den Abschlussbericht.";
};

function redeZeichnen(ereignisse) {
  const w = $("reden");
  w.innerHTML = "";
  for (const e of ereignisse) {
    const d = document.createElement("div");
    d.className = "rede";
    d.setAttribute("data-rolle", e.rolle || "");
    const wer = document.createElement("div");
    wer.className = "wer";
    wer.textContent = e.wer || e.rolle || "";
    const b = document.createElement("div");
    b.className = "blase";
    const z = document.createElement("span");
    z.className = "zeit";
    /* Gemessen, nicht behauptet: `ms` ist der Abstand zum Schichtbeginn und
       kommt aus `schicht.mjs`. Ohne ihn wären alle Schritte gleich lang — und
       das sähe aus wie eine Messung. */
    z.textContent = typeof e.ms === "number" ? (e.ms / 1000).toFixed(1) + " s" : "";
    b.appendChild(z);
    b.appendChild(document.createTextNode(satzZu(e)));
    d.appendChild(wer); d.appendChild(b);
    w.appendChild(d);
  }
  w.scrollTop = w.scrollHeight;
}

function satzZu(e) {
  switch (e.phase) {
    case "idee":   return `schlägt vor: ${e.titel} (${e.art})`;
    case "build":  return `baut ${e.dateiname} — ${e.zeichen} Zeichen` +
      (e.offen && e.offen.length ? `, offen: ${e.offen.join(" · ")}` : "");
    case "urteil": return `urteilt „${e.urteil}": ${e.begruendung || ""}`;
    /* ⚠ „befund" UND „feierabend" STANDEN HIER NICHT — und der Rückfall
       schrieb dann nur das Wort `befund` in die Blase. Sten hatte gearbeitet
       und die Seite zeigte davon nichts; „nichts gefunden" und „drei
       Schwächen" sahen gleich aus. Am fertigen Bildschirm gesehen. */
    case "befund":  return e.anzahl
      ? `findet ${e.anzahl} Schwäche(n)` +
        (e.befunde?.some((x) => x.schwere === "hoch")
          ? `, davon ${e.befunde.filter((x) => x.schwere === "hoch").length} schwer: ` +
            e.befunde.filter((x) => x.schwere === "hoch").map((x) => x.titel || x.fall)
              .filter(Boolean).join(" · ")
          : "")
      : "findet nichts — und sagt das, statt etwas zu erfinden";
    case "feierabend": return `schreibt auf, wo es steht: ${e.stand || ""}` +
      (e.naechsterSchritt ? ` — nächster Schritt: ${e.naechsterSchritt}` : "");
    default:       return [e.phase, e.titel, e.begruendung, e.text]
      .filter(Boolean).join(" — ") || (e.phase || "");
  }
}

function zahlenZeichnen(z) {
  const k = z.kasse || {};
  const kacheln = [
    ["Runden", z.ergebnis?.runden ?? 0, "abgeschlossen"],
    /* ⚠ `bericht().aufrufe` IST DIE ZAHL, KEIN FELD. Hier stand
       `k.aufrufe.length || 0` — bei sechs Aufrufen ergab das `undefined` und
       damit die angezeigte **0**, neben einem Betrag von 0,0960 €. Genau die
       Sorte Fehler, vor der die Verfassung warnt: eine falsche Zahl sieht
       genauso aus wie eine gemessene, und diese hier stand sogar neben ihrem
       eigenen Widerspruch. Gefunden beim Ansehen der fertigen Seite, nicht
       von einer Probe — deshalb bewacht sie jetzt eine. */
    ["Aufrufe", k.aufrufe ?? 0, "ans Modell"],
    ["Verbraucht", (k.verbrauchtEur ?? 0).toFixed(4) + " €",
      z.art === "echt" ? "wirklich bezahlt" : "gerechnet, nicht bezahlt"],
    ["Urteil", z.ergebnis?.urteil || "—", "des Arztes"],
  ];
  $("zahlen").innerHTML = "";
  for (const [t, w, u] of kacheln) {
    const d = document.createElement("div");
    d.className = "kachel";
    d.innerHTML = `<b></b><span></span>`;
    d.querySelector("b").textContent = String(w);
    d.querySelector("span").textContent = `${t} · ${u}`;
    $("zahlen").appendChild(d);
  }
}

async function fahre({ echt }) {
  if (stand.laeuft) return;
  stand.laeuft = true; stand.abbrechen = false;
  startLageZeichnen();
  zeigen($("lauf-karte"), true);
  zeigen($("ergebnis-karte"), false);
  zeigen($("abbruch"), true);
  $("lauf-lage").setAttribute("data-stand", "offen");
  $("lauf-lage-text").textContent = "läuft";
  $("reden").innerHTML = "";
  $("zahlen").innerHTML = "";

  /* HERKUNFT und ART sind zwei Fragen — woher der Lauf kommt und womit er
     gefahren ist. Ein Wort für beides trägt keines von beidem zuverlässig. */
  $("lauf-art").setAttribute("data-art", echt ? "echt" : "trocken");
  $("lauf-art").setAttribute("data-herkunft", "dieses-geraet");
  $("lauf-art").textContent = echt
    ? "Echter Lauf auf diesem Gerät. Die Euro-Beträge sind bezahlt."
    : "Trockenlauf auf diesem Gerät: hinterlegte Antworten, echte Mechanik. " +
      "Die Euro-Beträge sind GERECHNET, nicht bezahlt.";

  try {
    const mitarbeiter = await holeMitarbeiter();
    const g = await holeGrundsaetze();
    const deckelEur = Math.max(0.20, Number($("deckel").value) || 1);
    const kasse = new Kasse({
      deckelEur,
      laufzeitMs: 2 * 3600_000,
      // Zurückgelegt für den Feierabend-Bericht — ein Zehntel, mindestens
      // 20 Cent. Ohne sie wäre der Deckel eine Falle: das Geld alle UND
      // niemand weiss, wo es weitergeht. Dieselbe Zahl wie in `lauf.mjs`.
      reserveEur: Math.max(0.20, deckelEur * 0.1),
    });

    const api = echt
      ? new EchteApi({
          schluessel: stand.schluessel,
          basisUrl: stand.basisUrl,
          transport: netzTransport({ schluessel: stand.schluessel, basisUrl: stand.basisUrl }),
        })
      : new TrockenApi(BEISPIELE);

    const dateien = Object.keys(stand.dateien);
    const werkbank = dateien.length
      ? macheWerkbank({ baum: speicherBaum(stand.dateien, { wo: "übergeben" }) })
      : null;

    const ablage = await idbAblage(idb);

    const auftrag = {
      ziel: $("ziel").value.trim() ||
        "Ein kleines, eigenständiges Werkzeug, das jemand sofort benutzen kann.",
      pruefmerkmal: $("merkmal").value.trim() || null,
    };

    const lauf = await schicht({
      api, auftrag, mitarbeiter, kasse, spindAblage: ablage, grundsaetze: g,
      werkbank,
      aufZwischenstand: (z) => {
        redeZeichnen(z.events || []);
        zahlenZeichnen(z);
      },
    });

    /* ⚠ GESICHERT WIRD NUR NACH EINEM ECHTEN LAUF — dieselbe Zusicherung wie
       in Node, an derselben Stelle. Ein Trockenlauf hinterlässt keine Spur im
       Gedächtnis; ein zweiter Riegel dafür hier drin sähe nach mehr Sicherheit
       aus und wäre weniger (eine Gegenprobe, die nur einen wegnimmt, misst
       dann nichts). */
    if (echt) await ablage.sichern();

    stand.letzterLauf = lauf;
    redeZeichnen(lauf.events || []);
    zahlenZeichnen(lauf);
    ergebnisZeichnen(lauf, echt);
    $("lauf-lage").setAttribute("data-stand", "offen");
    $("lauf-lage-text").textContent = "fertig";
  } catch (e) {
    $("lauf-lage").setAttribute("data-stand", "fehler");
    $("lauf-lage-text").textContent = "abgebrochen";
    const d = document.createElement("p");
    d.className = "merk rot";
    d.setAttribute("data-abbruch", "1");
    /* Was die Kasse WEISS, sagt sie; woran es lag, weiss sie nicht. Die erste
       Fassung in Node schrieb „der Fehler steckt in der Verbindung" — bei
       einer fehlenden Auftragsdatei war das schlicht falsch. */
    d.textContent = "Die Schicht ist abgebrochen: " + (e && e.message ? e.message : e);
    $("reden").appendChild(d);
  } finally {
    stand.laeuft = false;
    zeigen($("abbruch"), false);
    startLageZeichnen();
  }
}

function ergebnisZeichnen(lauf, echt) {
  zeigen($("ergebnis-karte"), true);
  const a = lauf.artefakt || {};
  $("werkstueck").textContent = a.inhalt || "(Es ist nichts Fertiges entstanden.)";
  const kosten = lauf.kasse?.verbrauchtEur ?? 0;
  $("ergebnis-kopf").textContent =
    `${a.dateiname || "ohne Namen"} · Urteil „${lauf.ergebnis?.urteil || "—"}" nach ` +
    `${lauf.ergebnis?.runden ?? 0} Runden · ${kosten.toFixed(4)} € ` +
    (echt ? "bezahlt" : "gerechnet (Trockenlauf — nichts bezahlt)") +
    (lauf.ergebnis?.fertig ? "" : " · NICHT fertig geworden");
}

/* ⚠ EIN BOM FÜR TEXT, KEINER FÜR JSON. Ohne ihn rät Androids Betrachter
   Latin-1 und macht aus jedem Umlaut zwei Zeichen — Klaus hat das am
   2026-08-22 mit Bild gemeldet, und die Bytes waren nie falsch. Für ein JSON
   gilt das Gegenteil: dort bricht `JSON.parse` am BOM ab, und die Datei sähe
   aus wie eine Sicherung und scheiterte beim Öffnen. */
function gib(name, text, { bom }) {
  const blob = new Blob([bom ? "﻿" + text : text],
    { type: bom ? "text/plain;charset=utf-8" : "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$("herunterladen").onclick = () => {
  const a = stand.letzterLauf?.artefakt;
  if (!a) return;
  gib(a.dateiname || "werkstueck.txt", a.inhalt || "", { bom: true });
};
$("protokoll").onclick = () => {
  if (!stand.letzterLauf) return;
  gib("lauf.json", JSON.stringify(stand.letzterLauf, null, 2), { bom: false });
};

$("trocken").onclick = () => fahre({ echt: false });
$("echt").onclick = () => fahre({ echt: true });
$("abbruch").onclick = () => { stand.abbrechen = true; };

/* ══ WAS DIE SEITE SICH HOLT ═══════════════════════════════════════════════ */
async function holeMitarbeiter() {
  const a = await fetch("schicht/mitarbeiter.json");
  if (!a.ok) throw new Error(
    `Die Besetzung (schicht/mitarbeiter.json) war nicht zu holen: ${a.status}. ` +
    `Ohne sie weiss die Schicht nicht, wer welche Rolle hat — abgebrochen statt geraten.`);
  const d = await a.json();
  const m = d.mitarbeiter || [];
  for (const r of ROLLEN_REIHE)
    if (!m.some((x) => x.rolle === r))
      throw new Error(`Für die Rolle „${r}" ist niemand eingetragen.`);
  return m;
}

/* ⚠ UNTERSCHIEDEN STATT GERATEN. `deuteGrundsaetze(null)` heisst ausdrücklich
   „ohne Haltung" und trägt seinen Hinweis mit; ein vergessenes `undefined`
   liesse `macheRufer` abbrechen. Das eine ist eine Entscheidung, das andere
   ein Versehen — und die beiden sehen sonst gleich aus. */
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
  await speicherLageZeichnen();
  $("deckel").oninput();
  startLageZeichnen();
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("company-sw.js"); } catch { /* auch ohne */ }
  }
  /* Der Haken für die Proben. Er gibt NIE ein Geheimnis heraus — nur ja/nein.
     Ein Test-Haken, der ein Geheimnis herausreicht, ist ein Loch mit
     Prüfsiegel; genau das hat die Gegenprobe in Kimhub am 2026-08-22 bewiesen. */
  window.__company = {
    bereit: true,
    hatSchluessel: () => stand.schluessel !== null,
    hatPasswort: () => stand.passwort !== null,
    laeuft: () => stand.laeuft,
    dateien: () => Object.keys(stand.dateien).slice(),
    letzterLauf: () => (stand.letzterLauf ? JSON.parse(JSON.stringify(stand.letzterLauf)) : null),
    idbName: idb.name,
  };
})();
