/**
 * DAS ÜBERGABE-BLATT — die FORM, ohne Node.
 *
 * ⚠ WARUM ES DIESE DATEI GIBT (Klaus 2026-09-07). Nach drei Tagen ohne
 * Ergebnis: *„ich müsste mindestens einen Prompt herausbekommen, den ich an
 * ein großes Modell weitergeben kann, damit der etwas bauen kann."*
 *
 * Genau das ist dieses Blatt — und es entstand bis heute **nur in Node**.
 * `planBlatt()` stand in `schicht/lauf.mjs`, das an `node:fs` hängt; im
 * Browser gab es null Treffer dafür. Raum 2 „Die Übergabe" meldete deshalb bei
 * JEDEM Browser-Lauf „Das Übergabe-Blatt fehlt", und die Werkstatt war an der
 * Sache, für die Klaus sie benutzt, nie getestet.
 *
 * Vierte Naht nach demselben Muster wie Ablage, Baum, Bote und Fahrtenbuch:
 * **WAS gilt, getrennt von WO es hinkommt.** Der Rumpf ist **gezogen, nicht
 * kopiert** — zwei Fassungen trügen im Browser andere Abschnitte als auf der
 * Platte, und wer beide vergleicht, verglich Äpfel mit Birnen.
 *
 * Der einzige Unterschied zur alten Fassung: sie nimmt den **Bericht** statt
 * der Kasse. Ein Objekt mit Methoden ist eine Bindung an den Aufrufer; eine
 * Zahlen-Tafel ist überall dieselbe.
 */
/*
 * ⚠ DER KOPF UND DER FUSS SIND GETEILT — sonst laufen zwei Blätter
 * auseinander. Seit dem 2026-09-07 gibt es zwei Wege hierher: mit Konferenz
 * (`planBlatt`) und ohne (`auftragsBlatt`). Zwei Fassungen desselben Textes
 * wären eine Drift-Quelle mit Ansage, und der Unterschied fiele erst
 * jemandem auf, der beide nebeneinanderlegt.
 */
function kopf(z, datum, trocken, woher) {
  z.push(`# Offener Plan — ${datum}`);
  if (trocken) z.push(`\n> **Trockenlauf.** Dieser Plan stammt aus hinterlegten Beispielen,`
    + ` nicht aus ${woher}. Nicht bauen.`);
}

function auftragsTeil(z, auftrag) {
  z.push(`\n## Auftrag\n\n${auftrag.ziel}`);
  z.push(`\n## Prüfmerkmal\n\n${auftrag.pruefmerkmal}`);
  z.push(`\n*Nachprüfbar, nicht „gut gemacht". Wer baut, misst am Ende hiergegen —`
    + ` und nicht am eigenen Eindruck.*`);
}

/*
 * WAS BEN GESCHÄRFT HAT — und warum es überhaupt ins Blatt gehört.
 *
 * Der Mit-Ingenieur sieht den Vorschlag als jemand an, der so etwas gebaut
 * hat. Sein Ergebnis geht in die Anweisung an den Bauer; für eine Hand, die
 * NACH der Schicht weiterbaut, ist es der nützlichste Absatz überhaupt — und
 * er stand bis zum 2026-09-07 in keinem Blatt, weil das Blatt am Ende der
 * Konferenz geschrieben wurde und Ben danach kommt.
 */
function schaerfungsTeil(z, schaerfung) {
  if (!schaerfung) return;
  z.push(`\n## Was der Mit-Ingenieur geschärft hat\n`);
  z.push(String(schaerfung));
}

function kostenTeil(z, k) {
  z.push(`\n## Was diese Konferenz gekostet hat\n`);
  z.push(`${k.verbrauchtEur.toFixed(2)} € in ${k.aufrufe} Aufrufen.`);
}

function handTeil(z) {
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
}

/**
 * DAS BLATT OHNE KONFERENZ.
 *
 * ⚠ Klaus' Mindestmaß gilt auch dann, wenn er den Haken wegnimmt: *„ich müsste
 * mindestens einen Prompt herausbekommen."* Bis zum 2026-09-07 entstand das
 * Blatt NUR mit Konferenz — wer ohne sie fuhr, bekam wieder nichts.
 *
 * Es fehlen die Abschnitte, die es ohne Konferenz nicht gibt (Punkte,
 * Einwände, Verworfenes). Was da ist, steht drin; was nicht, wird nicht
 * erfunden.
 */
export function auftragsBlatt({ auftrag, schaerfung = "", bericht, datum, trocken } = {}) {
  const z = [];
  kopf(z, datum, trocken, "einer echten Schicht");
  auftragsTeil(z, auftrag);
  z.push(`\n## Woher der Auftrag kommt\n`);
  z.push(`Direkt eingegeben — ohne Konferenz. Es gibt deshalb keine Punkte,`
    + ` keine Einwände und nichts Verworfenes; die acht Rollen haben über`
    + ` diesen Auftrag nicht abgestimmt.`);
  schaerfungsTeil(z, schaerfung);
  kostenTeil(z, bericht);
  handTeil(z);
  return z.join("\n") + "\n";
}

export function planBlatt(konf, bericht, datum, trocken, schaerfung = "") {
  const k = bericht;
  const sieger = konf.tafel[0];
  const z = [];
  kopf(z, datum, trocken, "einer echten Konferenz");
  auftragsTeil(z, konf.auftrag);
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
  schaerfungsTeil(z, schaerfung);
  kostenTeil(z, k);
  handTeil(z);
  return z.join("\n") + "\n";
}
