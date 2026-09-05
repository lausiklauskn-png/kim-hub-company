/*
 * ablage-idb.mjs — das Gedächtnis im Browser. Der dritte Boden unter demselben Spind.
 *
 * `spind.mjs` sagt, WAS im Gedächtnis gilt, und läuft überall. Diese Datei sagt,
 * WO es liegt — wie `ablage-datei.mjs` für Node, nur dass hier kein Dateisystem
 * steht, sondern IndexedDB. Dieselbe Naht, dritter Boden.
 *
 * ══ WARUM SIE DEN SPEICHER-BODEN BENUTZT STATT EINEN EIGENEN ═══════════════
 *
 * `ablage-speicher.mjs` sagt es seit dem 2026-09-04 selbst voraus:
 *
 *   „SIE IST DER UNTERBAU FÜR DEN BROWSER. Eine IndexedDB-Ablage lädt ihre
 *    Fächer einmal und arbeitet dann gegen den geladenen Stand — das ist genau
 *    das hier, mit einem Lade- und einem Sicher-Schritt davor und danach.
 *    `alles()` und `laden()` sind diese beiden Türen."
 *
 * Genau so ist es gebaut. Und es ist nicht bloss bequem, sondern die einzige
 * Bauart, die geht: **die Spind-Naht ist gleichzeitig, IndexedDB ist es nicht.**
 * `spind.lies` gibt Text zurück, kein Versprechen — wer daraus ein `await`
 * machte, müsste `spind.mjs`, `ruf.mjs`, `schicht.mjs` und jede Probe daran
 * anfassen. Ein Umbau von vier Modulen, damit eine Ablage anders liegt: das ist
 * die Naht andersherum, und sie wäre falsch.
 *
 * Also einmal laden, gleichzeitig arbeiten, einmal sichern.
 *
 * ⚠ WAS DAS KOSTET, UND ES STEHT HIER STATT IN EINER FUSSNOTE: zwischen `laden`
 * und `sichern` liegt der Stand NUR im Arbeitsspeicher. Bricht der Reiter
 * währenddessen weg, ist das Gelernte dieser Schicht verloren — nicht das
 * frühere, das liegt unberührt in der Datenbank. Für eine Schicht, die von
 * einem Knopf bis zum Feierabend läuft, ist das der richtige Schnitt; wer
 * später Zwischenstände sichern will, ruft `sichern()` öfter.
 *
 * ══ WER SICHERT, UND WANN ══════════════════════════════════════════════════
 *
 * ⚠ `sichern()` GEHÖRT DEM AUFRUFER, NICHT DIESER DATEI — genau wie in Node.
 * Dort schreibt `schicht.mjs` das Gedächtnis nur für `art === "echt"`
 * (`spind.schliessen` wird nur dann gerufen), und `ablage-datei.mjs` hat seinen
 * zweiten Riegel dafür wieder ausgebaut, mit Begründung: „Ein zweiter Riegel
 * über derselben Zusicherung sieht nach mehr Sicherheit aus und ist weniger."
 * Dieselbe Zusicherung, dieselbe Stelle, kein zweiter Riegel hier.
 */
import { speicherAblage } from "./ablage-speicher.mjs";

/* Ein Schlüssel in der Datenbank trägt den GANZEN Spind-Stand, flach. Nicht
   ein Schlüssel je Fach: ein Fach kann zwischen zwei Schichten dazukommen, und
   dann müsste jemand die Fächer aufzählen können — IndexedDB kann das, aber
   dafür bräuchte es einen zweiten Lesepfad, der wieder auseinanderliefe. */
export const SCHLUESSEL = "spinde";

/**
 * Die Ablage über einer IndexedDB.
 *
 * @param idb  was `idb.js` aus `macheIdb` gibt — `{name, lies, schreib}`.
 *             Hineingereicht, nicht selbst gebaut: diese Datei kennt weder den
 *             Datenbanknamen noch den Store. Wer den Namen hier hineinschriebe,
 *             hätte ihn an zwei Stellen, und auf der geteilten `github.io`-
 *             Adresse ist genau der Name die Grenze zur Schwester-App.
 * @param schluessel  unter welchem Schlüssel der Stand liegt.
 * @returns {Promise<object>} die Ablage — Spind-Form, dazu `sichern()`.
 */
export async function idbAblage(idb, { schluessel = SCHLUESSEL } = {}) {
  if (!idb || typeof idb.lies !== "function" || typeof idb.schreib !== "function")
    throw new Error(
      "Die IndexedDB-Ablage braucht eine Ablage aus `idb.js` (macheIdb). Ohne " +
      "sie wüsste sie nicht, in welcher Datenbank die Spinde liegen — und ein " +
      "geratener Name ist auf einer geteilten Adresse eine Kollision.");

  /* `lies` gibt `null`, wenn nichts da ist ODER wenn es schiefging — das ist
     die Aufteilung aus `idb.js`, und sie ist hier richtig: beim ERSTEN Besuch
     ist beides dasselbe, nämlich ein leeres Gedächtnis. Was NICHT dasselbe
     ist, steht unten in `geladen`: ob wirklich etwas vorgefunden wurde. */
  const roh = await idb.lies(schluessel);
  const stand = roh && typeof roh === "object" ? roh : {};
  const innen = speicherAblage(stand);

  return {
    /* Der ganze Ablage-Ort, für das Lauf-Protokoll. Kein Pfad, aber auch keine
       Lüge — dieselbe Regel wie bei `ablage-speicher.mjs`: die Kennung sagt,
       wo nachzusehen ist, ohne einen Ort zu erfinden, den es nicht gibt. */
    wo: `indexeddb:${idb.name}/${schluessel}`,
    ort: (fach) => `indexeddb:${idb.name}/${schluessel}#${fach}`,

    lies: innen.lies,
    schreib: innen.schreib,
    alles: innen.alles,
    laden: innen.laden,

    /** Lag beim Öffnen schon etwas da? Für die Anzeige — „erster Besuch" und
     *  „Gedächtnis aus früheren Schichten" sehen sonst gleich aus. */
    geladen: Object.keys(stand).length,

    /** Der Stand zurück in die Datenbank. Wirft durch, wenn es nicht klappt:
     *  wer glaubt, das Gelernte sei abgelegt, und es ist nichts abgelegt,
     *  erfährt es sonst erst bei der nächsten Schicht — an einem Spind, der
     *  leer ist, ohne dass jemand ihn geleert hätte. */
    sichern: () => idb.schreib(schluessel, innen.alles()),
  };
}
