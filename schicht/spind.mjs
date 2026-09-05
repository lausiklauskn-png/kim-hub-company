/*
 * spind.mjs — das Gedächtnis, je Mitarbeiter einer.
 *
 * SPEICHER UND GEDÄCHTNIS SIND ZWEI DINGE, und sie brauchen Gegenteiliges:
 *
 *   Speicher    was hergestellt wurde (werkstatt/, Git-Historie)  wächst für immer, wird angehängt
 *   Gedächtnis  was ein Mitarbeiter über sich und seine Arbeit weiß  DARF NICHT wachsen, wird umgeschrieben
 *
 * Wirft man beides zusammen, ertrinkt das Gedächtnis im Archiv. Ein Agent, der
 * bei jeder Runde alles liest, was je gebaut wurde, arbeitet nicht mehr — es
 * kostet jedes Mal und es rauscht. Der ganze Wert eines Gedächtnisses liegt
 * darin, dass es AUSGEWÄHLT ist.
 *
 * Deshalb der Deckel auf `gelernt.md`. Ist er erreicht, wird NICHT abgeschnitten,
 * sondern neu geschrieben: zusammenfassen, Überholtes streichen. Genau das
 * Verfahren, das Klaus' Repos schon kennen — die 3000-Zeilen-Klausel in
 * PULS.md und die Postfach-Verjährung (INTERFACES §11.6.1).
 *
 * Abschneiden wäre das Naheliegende und das Falsche: es nimmt immer das Älteste
 * weg, und das Älteste ist oft die Lehre, die am teuersten bezahlt wurde.
 *
 * SCHREIB IN DEN SPIND NICHTS, WAS NICHT JEDER LESEN DARF — nichts Persönliches
 * und keinen Schlüssel. Ob das Depot heute öffentlich oder privat steht, ändert
 * daran nichts (siehe unten). Dagegen steht unten ein Riegel — kein vollständiger Schutz, aber er
 * fängt den Fall, der wirklich passiert: ein Agent schreibt einen Schlüssel
 * mit, den er in einer Fehlermeldung gesehen hat.
 */
/*
 * ── DIE ABLAGE: EINE GEMEINSAME FLÄCHE FÜR BEIDE SEITEN (2026-09-04) ────────
 *
 * Bis heute schrieb diese Datei selbst Dateien (`writeFileSync`). Damit war das
 * Gedächtnis an Node gebunden — und mit ihm die ganze Ruf-Kette, denn `ruf.mjs`
 * importiert von hier. Klaus hat entschieden, dass jeder ausser ihm seinen
 * eigenen Schlüssel im BROWSER mitbringt; dort gibt es kein Dateisystem, aber
 * es gibt IndexedDB.
 *
 * Getrennt sind deshalb zwei Fragen, die vorher eine waren:
 *
 *   WO das Gedächtnis liegt   die Ablage — Dateien (Node) · Speicher · IndexedDB
 *   WAS darin gilt            diese Datei — Deckel, Packen, Zähler, Riegel
 *
 * Die Ablage ist mit Absicht winzig. Drei Methoden, und keine davon weiss
 * irgendetwas über Spinde, Deckel oder Merklisten:
 *
 *   lies(fach, name)          den Text oder `null`, wenn es ihn nicht gibt
 *   schreib(fach, name, text) legt an, was noch nicht da ist
 *   ort(fach)                 wo das Fach liegt — NUR zum Anzeigen und Protokoll
 *
 * `null` heisst „gibt es nicht" und ist etwas anderes als `""` („ist da, leer").
 * Derselbe Unterschied wie bei den Grundsätzen, und er wird hier gebraucht:
 * ein fehlendes Ich-Blatt wird angelegt, ein leeres nicht.
 *
 * ⚠ WARUM DIE NAHT SYNCHRON IST, obwohl IndexedDB es nicht ist. Eine Ablage
 * für den Browser lädt ihre Fächer EINMAL (das tut eine Schicht ohnehin beim
 * Schichtbeginn) und schreibt von da an gegen den geladenen Stand. Der Weg nach
 * aussen ist dann ein eigener, benannter Schritt — kein Hintergrund-Schreiben,
 * das beim Schliessen der Seite still verlorengeht. Das ist dieselbe Lehre wie
 * „stirbt eine Schicht mittendrin, war das Geld weg und stand nirgends": was
 * gesichert sein muss, wird gesichert, wo man es sieht.
 *
 * ⚠ UND WAS HIER NICHT STEHT: eine IndexedDB-Ablage ist NICHT gebaut. Sie
 * gehört zu der Seite, die die Schicht im Browser startet, und die gibt es noch
 * nicht. Eine Ablage ohne Benutzer wäre im Hintergrund vorgebaut und ungemessen
 * — beides verbietet die Verfassung. Was hier steht, ist die Naht und zwei
 * Ablagen, die wirklich benutzt werden.
 */

/** Wie das Fach eines Mitarbeiters heisst. Rein gerechnet, ohne Ablage — die
 *  Ablage entscheidet, was sie daraus macht (ein Verzeichnis, ein Schlüssel). */
export const fach = (m) => `${m.rolle}-${m.name}`.toLowerCase();

/*
 * WIE VIELE BYTES — mit `TextEncoder` statt `Buffer.byteLength`.
 *
 * Beide zählen UTF-8-Bytes und liefern dieselbe Zahl; `DECKEL_BYTES` bedeutet
 * danach genau dasselbe wie vorher. Der Unterschied ist, WO die Rechnung läuft:
 * `Buffer` gibt es nur in Node, `TextEncoder` überall.
 *
 * ⚠ HIER STAND „diese Datei wird dadurch NIE im Browser laufen". Das galt am
 * 2026-09-04 vormittags und gilt seit dem Nachmittag nicht mehr: die Datei
 * schreibt keine Dateien mehr, sie reicht an eine Ablage weiter (siehe oben).
 * Der Satz war richtig, als er geschrieben wurde, und wäre als stehengelassener
 * Kommentar zu einer Unwahrheit mit Datum geworden — dieselbe Sorte, vor der
 * die Verfassung an drei Stellen warnt.
 *
 * Was davon stehen bleibt, ist der GRUND: `istZuVoll` ist die Regel, an der ein
 * Gedächtnis abgeschnitten wird, und eine Regel, die nur in einer Umgebung
 * nachrechenbar ist, lässt sich anderswo nur behaupten. `Buffer` ist ausserdem
 * ein GLOBAL: ein `grep node:` hätte diese Bindung nie gefunden.
 */
const ZAEHLER = new TextEncoder();
export const bytes = (text) => ZAEHLER.encode(text || "").length;

/** 4 KB. Etwa eine gut gefüllte Seite — so viel, wie ein Mensch vor der Arbeit liest. */
export const DECKEL_BYTES = 4096;

const GEHEIM = [
  [/sk-ant-[A-Za-z0-9_-]{8,}/, "ein Anthropic-Schlüssel"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "ein privater Schlüssel"],
  [/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bnsec1[a-z0-9]{20,}/, "ein privater Nostr-/Wallet-Schlüssel"],
  [/\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/, "ein GitHub-Token"],
];

/*
 * Wirft, bevor etwas geschrieben wird, das nirgends stehen sollte.
 *
 * DER RIEGEL FRAGT NICHT, WIE DAS DEPOT GERADE STEHT — und das ist der Punkt.
 * Die Einstellung drehte sich am 20., 21. und noch einmal am 21. August 2026,
 * dreimal in zwei Tagen. „Privat" ist eine Einstellung, kein Zustand des
 * Inhalts: ein Klick dreht sie um, und dann ist alles oeffentlich, was je darin
 * lag, die Historie eingeschlossen. Ein Geheimnis, das einmal committet wurde,
 * holt man nicht zurueck — man kann es nur noch wechseln.
 */
export function pruefeGeheimnis(text, wo = "Spind") {
  for (const [muster, was] of GEHEIM)
    if (muster.test(text))
      throw new Error(`In ${wo} sollte ${was} geschrieben werden. Abgebrochen — ` +
        `ein Depot ist immer nur einen Klick von öffentlich entfernt, und die Historie ` +
        `vergisst nichts. Der Text bleibt ungeschrieben, nichts wird still gekürzt.`);
  return text;
}

/** Wo das Fach dieses Mitarbeiters liegt — zum Anzeigen und fürs Protokoll.
 *  Bei der Datei-Ablage ist das der Pfad, den es vorher schon war. */
export const ordner = (ablage, m) => ablage.ort(fach(m));

/**
 * Schichtbeginn: der Mitarbeiter macht seinen Spind auf und sieht nach, wer er ist.
 * Das ist der erste Schritt jeder Rolle, noch vor der Arbeit.
 */
export function oeffnen(ablage, m, { schreiben = true } = {}) {
  const f = fach(m);
  const lies = (n, vorgabe = "") => ablage.lies(f, n) ?? vorgabe;

  let ich = lies("ich.md");
  if (!ich) {
    ich = `# ${m.name} — ${m.rolle}\n\n${m.auftrag}\n\n`
        + `Modell: \`${m.modell}\`\n\nAngelegt beim ersten Schichtbeginn.\n`;
    // Eine Trockenschicht LIEST das Gedächtnis wie eine echte — sonst bewiese sie
    // die Mechanik nicht —, aber sie SCHREIBT nichts. Auch kein Ich-Blatt.
    if (schreiben) ablage.schreib(f, "ich.md", ich);
  }
  return {
    ordner: ablage.ort(f),
    ich,
    gelernt: lies("gelernt.md"),
    letzteSchicht: lies("letzte-schicht.md"),
    // Die Merkliste wird MITGELESEN, auch trocken. Sie nur beim echten Lauf zu
    // lesen hiesse, die Trockenschicht bewiese die Mechanik nicht mehr — und
    // genau dafuer ist sie da. Geschrieben wird trocken weiterhin nichts.
    merkliste: lies("merkliste.md"),
  };
}

/** Etwas Gelerntes anhängen. Meldet, ob der Deckel jetzt überschritten ist. */
export function merken(ablage, m, zeile) {
  const f = fach(m);
  pruefeGeheimnis(zeile, `den Spind von ${m.name}`);
  const alt = ablage.lies(f, "gelernt.md") ?? "";
  const neu = alt + (alt.endsWith("\n") || !alt ? "" : "\n") + "- " + zeile.trim() + "\n";
  ablage.schreib(f, "gelernt.md", neu);
  return { bytes: bytes(neu), ueberlauf: istZuVoll(neu) };
}

export const istZuVoll = (text) => bytes(text) > DECKEL_BYTES;

/**
 * Das Gelernte durch eine gepflegte Fassung ersetzen (die eine Rolle geschrieben
 * hat, nicht dieser Code). Passt sie immer noch nicht, wird sie ABGELEHNT statt
 * gekürzt: lieber steht das alte, vollständige Gedächtnis da, als ein neues, dem
 * unbemerkt der Schluss fehlt.
 */
export function ersetzeGelernt(ablage, m, text) {
  pruefeGeheimnis(text, `den Spind von ${m.name}`);
  if (istZuVoll(text))
    return { ok: false, bytes: bytes(text),
      text: `Die neue Fassung ist mit ${bytes(text)} Bytes immer noch über ` +
            `dem Deckel (${DECKEL_BYTES}). Nicht übernommen — das alte Gedächtnis bleibt stehen.` };
  ablage.schreib(fach(m), "gelernt.md", text.endsWith("\n") ? text : text + "\n");
  return { ok: true, bytes: bytes(text), text: "" };
}

/**
 * Feierabend: wo bin ich stehen geblieben. Wird JEDE Schicht überschrieben —
 * dieses Blatt ist ein Zettel, kein Tagebuch.
 */
export function schliessen(ablage, m, stand) {
  pruefeGeheimnis(stand, `den Spind von ${m.name}`);
  ablage.schreib(fach(m), "letzte-schicht.md", stand.endsWith("\n") ? stand : stand + "\n");
}

/* ───────────────────────────────────────────────────────────────────────────
 * DIE MERKLISTE — was aus einer Konferenz sonst verlorenginge.
 *
 * Bis zum 2026-08-21 überlebte eine Konferenz nur mit ihrem Sieger. Vier
 * Vorschläge landeten unter „Verworfen" und waren weg — samt der Einwände, die
 * jemand sich dazu überlegt hatte. Das ist Verschwendung: ein Vorschlag, der
 * heute zu früh kommt, ist in drei Wochen der richtige.
 *
 * SIE IST GEPACKT, NICHT ANGESAMMELT. Derselbe Deckel wie `gelernt.md`, und
 * beim Überlaufen wird NEU GESCHRIEBEN statt abgeschnitten. Der Unterschied ist
 * nicht kosmetisch: Abschneiden nimmt immer das Älteste, und das Älteste ist
 * hier der Vorschlag, der am längsten wartet.
 *
 * DER ZWEITE RIEGEL SITZT IM DATENMODELL: ein Titel bekommt EINEN Eintrag, nicht
 * einen je Konferenz. Wer denselben Vorschlag zum dritten Mal einbringt, erhöht
 * einen Zähler — er hängt keine dritte Kopie an. Damit wächst die Liste mit der
 * Zahl der IDEEN, nicht mit der Zahl der Konferenzen, und der Zähler ist genau
 * die Zahl, an der sich ein Hänger erkennen lässt (siehe konferenz.mjs).
 *
 * NUR DER EIGENE VORSCHLAG gehört hinein. Eine Liste, in der jeder alles
 * notiert, ist ein zweites Archiv — und das Archiv gibt es schon.
 * ───────────────────────────────────────────────────────────────────────── */

/*
 * AB WANN EIN WIEDERBRINGEN EIN HÄNGER IST.
 *
 * Die Zahl steht HIER und nirgends sonst. `ruf.mjs` schreibt sie in die
 * Anweisung an die Rolle („steht ein Titel dort schon mit N oder mehr Malen,
 * ist er abgelehnt"), `konferenz.mjs` misst dagegen. Stünde sie an zwei Stellen
 * als Ziffer, liefen die beiden irgendwann auseinander — und dann sagte die
 * Anweisung etwas anderes, als der Beobachter später anmahnt.
 *
 * 4 heißt: dreimal vorgeschlagen und nicht gewählt ist Gedächtnis, beim vierten
 * Mal ist es keins mehr. Die Rolle wird bei 3 gewarnt (HAENGER_AB − 1); bringt
 * sie ihn trotzdem, ist genau das der Fall, den der Beobachter benennt.
 */
export const HAENGER_AB = 4;

const TITELZEILE = /^##\s+(.+?)\s*$/;
const STANDZEILE = /^-\s+zuletzt\s+(\S+)\s+·\s+(\d+)×\s+vorgeschlagen(?:\s+·\s+(\d+)\s+Punkte)?/;
const VERDICHTET = /^>\s+Beim Packen weggefallen:\s*(.+?)\s*$/;

/** Liest die Merkliste zurück in Einträge. Unbekannte Zeilen werden übergangen. */
export function lieseMerkliste(text) {
  const eintraege = [];
  const weggefallen = [];
  let jetzt = null;
  for (const zeile of String(text || "").split("\n")) {
    const t = TITELZEILE.exec(zeile);
    if (t) { jetzt = { titel: t[1], zuletzt: "", male: 1, punkte: null,
                       ergebnis: "", einwaende: [] };
             eintraege.push(jetzt); continue; }
    const v = VERDICHTET.exec(zeile);
    if (v) {
      for (const stueck of v[1].split(" · ")) {
        const m = /^(.*?)\s*\((\d+)×\)$/.exec(stueck.trim());
        if (m) weggefallen.push({ titel: m[1], male: Number(m[2]) });
      }
      continue;
    }
    if (!jetzt) continue;
    const st = STANDZEILE.exec(zeile);
    if (st) { jetzt.zuletzt = st[1]; jetzt.male = Number(st[2]);
              jetzt.punkte = st[3] === undefined ? null : Number(st[3]); continue; }
    if (zeile.startsWith("- Greifbar: ")) jetzt.ergebnis = zeile.slice(12).trim();
    else if (zeile.startsWith("- Einwand ")) jetzt.einwaende.push(zeile.slice(10).trim());
  }
  return { eintraege, weggefallen };
}

/**
 * Wie oft ein Titel schon eingebracht wurde — auch dann noch, wenn sein Eintrag
 * beim Packen weggefallen ist. Ohne das letzte Stück fiele ein Hänger genau in
 * dem Moment aus der Zählung, in dem die Liste voll ist.
 */
export function zaehleWiederholungen(text) {
  const { eintraege, weggefallen } = lieseMerkliste(text);
  const zahl = new Map();
  for (const e of [...eintraege, ...weggefallen])
    zahl.set(schluesselTitel(e.titel), Math.max(zahl.get(schluesselTitel(e.titel)) || 0, e.male));
  return zahl;
}

/** Groß/klein und Zwischenräume sollen keinen zweiten Eintrag erzeugen. */
export const schluesselTitel = (t) =>
  String(t || "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Zum wievielten Mal dieser Titel eingebracht würde — OHNE etwas zu schreiben.
 *
 * Dieselbe Rechnung, die `vormerken` gleich anstellt; sie steht hier, damit die
 * Konferenz die Zahl auch dann kennt, wenn sie nichts schreiben darf (trockener
 * Lauf). Zwei getrennte Rechnungen wären zwei Zahlen, die sich eines Tages
 * widersprechen — deshalb ruft `vormerken` genau diese hier auf.
 */
export function wievielMal(merklisteText, titel) {
  return (zaehleWiederholungen(merklisteText).get(schluesselTitel(titel)) || 0) + 1;
}

/**
 * Setzt die Liste zusammen und PACKT sie, bis sie unter den Deckel passt.
 * Vier Stufen, von der schonendsten zur härtesten:
 *
 *   0  alles
 *   1  bei den ältesten fällt die „Greifbar"-Zeile weg
 *   2  bei den ältesten fallen auch die Einwände weg
 *   3  die ältesten Einträge fallen ganz weg — aber mit ihrem Titel und ihrem
 *      Zähler in einer sichtbaren Zeile. Ein stiller Verlust wäre genau das
 *      Abschneiden, das hier nicht passieren soll.
 */
export function baueMerkliste(m, eintraege, weggefallen = []) {
  const neuZuerst = [...eintraege].sort((a, b) =>
    String(b.zuletzt).localeCompare(String(a.zuletzt)));
  let raus = [...weggefallen];

  for (let stufe = 0; stufe <= 3; stufe++) {
    for (let behalten = neuZuerst.length; behalten >= 1; behalten--) {
      if (stufe < 3 && behalten !== neuZuerst.length) break;   // kürzen erst in Stufe 3
      const drin = neuZuerst.slice(0, behalten);
      const weg = [...raus, ...neuZuerst.slice(behalten).map(
        (e) => ({ titel: e.titel, male: e.male }))];
      const text = zusammensetzen(m, drin, weg, stufe);
      if (!istZuVoll(text)) return { text, stufe, weggefallen: weg };
    }
  }
  // Selbst ein einziger Eintrag passt nicht mehr: dann steht wenigstens der Kopf
  // und die Zeile, die sagt, dass gepackt wurde.
  const nur = zusammensetzen(m, [], [...raus,
    ...neuZuerst.map((e) => ({ titel: e.titel, male: e.male }))], 3);
  return { text: nur, stufe: 3,
           weggefallen: [...raus, ...neuZuerst.map((e) => ({ titel: e.titel, male: e.male }))] };
}

function zusammensetzen(m, eintraege, weggefallen, stufe) {
  const z = [`# Merkliste — ${m.name} (${m.rolle})`, "",
    "Eigene Vorschläge, die eine Konferenz nicht gewählt hat. Gepackt, nicht",
    "angesammelt: ein Titel bekommt EINEN Eintrag, das Wiedereinbringen erhöht",
    "nur den Zähler.", ""];
  eintraege.forEach((e, i) => {
    // Gekürzt wird von hinten, also beim Ältesten — das Neueste bleibt vollständig.
    const alt = stufe >= 1 && i >= Math.ceil(eintraege.length / 2);
    z.push(`## ${e.titel}`);
    z.push(`- zuletzt ${e.zuletzt} · ${e.male}× vorgeschlagen` +
      (e.punkte === null || e.punkte === undefined ? "" : ` · ${e.punkte} Punkte`));
    if (e.ergebnis && !(alt && stufe >= 1)) z.push(`- Greifbar: ${e.ergebnis}`);
    if (!(alt && stufe >= 2)) for (const ein of e.einwaende) z.push(`- Einwand ${ein}`);
    z.push("");
  });
  if (weggefallen.length)
    z.push(`> Beim Packen weggefallen: ` +
      weggefallen.map((w) => `${w.titel} (${w.male}×)`).join(" · "), "");
  return z.join("\n");
}

/**
 * Einen eigenen, nicht gewählten Vorschlag vormerken.
 *
 * Gibt zurück, zum wievielten Mal dieser Titel eingebracht wurde — die Zahl,
 * mit der die Konferenz einen Hänger erkennt.
 */
export function vormerken(ablage, m, { titel, ergebnis = "", einwaende = [],
                                       punkte = null, datum = "" } = {}) {
  if (!titel || !String(titel).trim())
    return { ok: false, male: 0, bytes: 0, stufe: 0, text: "Ohne Titel kein Eintrag." };
  const f = fach(m);
  const alt = ablage.lies(f, "merkliste.md") ?? "";

  const { eintraege, weggefallen } = lieseMerkliste(alt);
  const schluessel = schluesselTitel(titel);
  // EINE Rechnung für den Zähler, nicht zwei: `wievielMal` ist dieselbe Zahl,
  // die die Konferenz vorher schon kennt. Stünde sie hier noch einmal als
  // eigene Zeile (`e.male += 1`), wichen die beiden irgendwann voneinander ab —
  // und die gemeldete Zahl wäre eine andere als die geschriebene.
  const male = wievielMal(alt, titel);
  let e = eintraege.find((x) => schluesselTitel(x.titel) === schluessel);
  if (e) { e.male = male; }
  else {
    e = { titel: String(titel).trim(), male };
    eintraege.push(e);
  }
  e.zuletzt = datum || new Date().toISOString().slice(0, 10);
  e.punkte = punkte;
  if (ergebnis) e.ergebnis = String(ergebnis).trim();
  e.einwaende = einwaende.map((x) => String(x).trim()).filter(Boolean);

  const rest = weggefallen.filter((w) => schluesselTitel(w.titel) !== schluessel);
  const gebaut = baueMerkliste(m, eintraege, rest);
  // Derselbe Riegel wie überall im Spind: kein Schlüssel, nichts Persönliches.
  // Er sitzt VOR dem Schreiben, nicht danach.
  pruefeGeheimnis(gebaut.text, `die Merkliste von ${m.name}`);
  ablage.schreib(f, "merkliste.md", gebaut.text.endsWith("\n") ? gebaut.text : gebaut.text + "\n");
  return { ok: true, male: e.male, stufe: gebaut.stufe,
           bytes: bytes(gebaut.text),
           weggefallen: gebaut.weggefallen };
}
