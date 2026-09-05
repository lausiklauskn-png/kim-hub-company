/*
 * transport-netz.mjs — der Bote über `fetch`. Läuft im Browser UND in Node.
 *
 * ══ WOFÜR ES IHN GIBT ══════════════════════════════════════════════════════
 *
 * `api.mjs` holt sein SDK mit `await import("@anthropic-ai/sdk")`. Im Browser
 * gibt es das nicht: ein npm-Paket bräuchte einen Bauschritt, und ein CDN ist
 * netzweit verboten. Seit Klaus' BYOK-Entscheidung vom 2026-09-04 tippt aber
 * genau dort ein Fremder seinen bezahlten Zugang ein.
 *
 * ⚠ WAS HIER NICHT STEHT, IST DER GANZE PUNKT. Kein Aufbau der Anfrage, keine
 * Runden-Schleife, kein Deckel, keine Token-Summe, keine Fehlermeldung über
 * `max_tokens` — das alles bleibt in `api.mjs`, an EINER Stelle. Diese Datei
 * trägt hinaus und bringt zurück, sonst nichts. Zwei Fassungen der Politik
 * wären eine Drift-Quelle mit Ansage: dann zählte der Browser Token anders
 * als die Kommandozeile, und niemand wüsste, welche recht hat.
 *
 * ══ DER RIEGEL, DEN DAS SDK IM BROWSER SETZT — UND WARUM ER HIER FÄLLT ═════
 *
 * Das SDK verweigert den Browser, bis man `dangerouslyAllowBrowser` setzt. Die
 * Warnung dazu handelt durchgehend von **`your` credentials**: dem Schlüssel
 * des Betreibers, der im ausgelieferten Code steckt und den jeder Besucher
 * herausziehen kann. **Dieser Fall liegt bei BYOK nicht vor** — der Schlüssel
 * gehört dem Nutzer, wird von ihm eingegeben, und abgerechnet wird auf seinem
 * Konto. Es liegt kein Schlüssel im Code; es gibt keinen im Depot.
 *
 * ⚠ UND DARAUS FOLGT NICHT, DASS ES ERLAUBT IST. Die offizielle Doku zählt
 * zwei Fälle auf, in denen es „not dangerous" sei — interne Werkzeuge und
 * Entwicklung. Eine öffentlich verteilte Seite steht nicht darin; die Doku
 * stellt die Frage gar nicht. Aus „der genannte Schaden trifft uns nicht"
 * folgt keine Erlaubnis. Der Stand, die zwei Quellen, die von hier aus nicht
 * erreichbar waren, und das eine Suchwort, mit dem Klaus es in einer Minute
 * klären kann, stehen in `docs/BYOK_BEDINGUNGEN.md`. **Offene Flanke,
 * benannt** — hier, im Code, der sie öffnet, nicht nur in einer Doku daneben.
 */

/** Die Anschrift. Eine eigene steht in `basisUrl` — siehe `EchteApi`. */
export const ANTHROPIC = "https://api.anthropic.com";

/** Die Fassung des Protokolls. Genagelt, nicht geraten: eine stillschweigend
 *  mitwandernde Version änderte irgendwann das Antwortformat, und `api.mjs`
 *  läse dann Felder, die es nicht mehr gibt. */
export const PROTOKOLL = "2023-06-01";

/**
 * Ein Bote für `EchteApi`.
 *
 * @param {{schluessel:string, basisUrl?:string|null, holen?:Function}} opt
 *        `holen` ist `fetch`, hineingereicht — damit eine Probe messen kann,
 *        WAS hinausgeht, ohne dass ein Aufruf bezahlt wird. Ohne diese Naht
 *        wäre jeder Wächter hier auf echtes Geld angewiesen, und es gäbe
 *        deshalb keinen.
 * @returns {{erzeuge:Function, zaehle:Function}}
 */
export function netzTransport({ schluessel, basisUrl = null, holen = null } = {}) {
  if (!schluessel) throw new Error(
    "Der Netz-Bote braucht einen Schlüssel. Im Browser tippt ihn der Nutzer " +
    "selbst ein; er steht nirgends im Code und nirgends im Depot.");

  const fetchen = holen || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  if (!fetchen) throw new Error(
    "Kein `fetch` vorhanden. Im Browser gibt es eines, in Node ab 18 auch — " +
    "wo keines ist, kann dieser Bote nicht tragen.");

  const wurzel = String(basisUrl || ANTHROPIC).replace(/\/+$/, "");

  async function schicke(pfad, koerper) {
    let antwort;
    try {
      antwort = await fetchen(`${wurzel}${pfad}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": schluessel,
          "anthropic-version": PROTOKOLL,
          /* Ohne diesen Kopf weist die API einen Aufruf aus dem Browser ab.
             Er ist die ausdrückliche Form von „ich weiss, was ich tue" — und
             was wir dabei wissen und was nicht, steht oben im Kopf der Datei. */
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(koerper),
      });
    } catch (e) {
      /* ⚠ DER SCHLÜSSEL KOMMT NIE IN EINE MELDUNG. Was in eine Meldung gerät,
         landet früher oder später in einem Protokoll — die Regel steht in
         `schluesseltresor.js` und gilt hier genauso. Deshalb nur die Adresse,
         und die trägt ihn nicht. */
      throw new Error(
        `Die Anfrage an ${wurzel} kam nicht durch: ${e && e.message ? e.message : e}. ` +
        `Das kann am Netz liegen, an einer falschen eigenen Adresse — oder daran, ` +
        `dass der Anbieter dort das Anthropic-Protokoll gar nicht spricht.`);
    }

    if (!antwort.ok) {
      /* Der Text der Antwort geht mit, denn dort steht der Grund (`401 invalid
         x-api-key`, `400 …`). Ein blosses „ging nicht" schickte den Nutzer auf
         die Suche — und das ist teurer als gar keine Auskunft. */
      let text = "";
      try { text = (await antwort.text()).slice(0, 600); } catch { /* egal */ }
      const fehler = new Error(
        `${antwort.status} ${antwort.statusText || ""}`.trim() + (text ? ` — ${text}` : ""));
      /* `status` liegt an, weil `api.mjs` bei 400 mit Werkbank eine eigene,
         genauere Meldung baut. Nähme dieser Bote ihm die Angabe weg, zeigte
         die Auskunft beim nächsten 400 in die falsche Richtung. */
      fehler.status = antwort.status;
      throw fehler;
    }
    return await antwort.json();
  }

  return {
    erzeuge: (bitte) => schicke("/v1/messages", bitte),
    zaehle: (bitte) => schicke("/v1/messages/count_tokens", bitte)
      .then((r) => r.input_tokens),
  };
}
