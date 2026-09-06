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
 * DIE FRIST JE AUFRUF.
 *
 * ⚠ SIE FEHLTE, UND KLAUS IST IN DIE LÜCKE GELAUFEN (2026-09-06): eine Schicht
 * stand 30 Minuten bei Emil, ohne dass irgendetwas geschah. `fetch` ohne
 * Abbruch-Signal hat keine eigene Frist, und der Zeitdeckel der Kasse wird nur
 * ZWISCHEN den Aufrufen geprüft — er kann einen hängenden Aufruf gar nicht
 * abschneiden. Ein Lauf konnte also unbegrenzt stillstehen, und die einzige
 * Auskunft war eine Uhr, die weiterlief.
 *
 * ⚠ DIE ZAHL IST EIN NAGEL, KEINE MESSUNG. Gemessen ist nur das: am 2026-08-23
 * lagen fünf Aufrufe in vier Minuten, also rund 48 s je Aufruf — Emils
 * Bau-Aufruf ist der längste davon. Zehn Minuten sind das Zwölffache. Wie lange
 * ein Bau-Aufruf im schlimmsten Fall WIRKLICH braucht, ist nicht gemessen; wer
 * eine Messung hat, setzt die Zahl danach.
 *
 * Zu kurz wäre teuer: eine Antwort, die nach dem Abbruch eintrifft, ist bezahlt
 * und weg. Deshalb im Zweifel eher grosszügig.
 */
export const FRIST_MS = 10 * 60 * 1000;

/**
 * DIE STILLE-FRIST BEIM STRÖMEN — und warum sie eine ANDERE Zahl ist.
 *
 * Eine Gesamtfrist ist beim Strömen das falsche Maß: sie bräche genau die
 * ehrlich lange Antwort ab, für die das Strömen gebaut ist. Was wirklich
 * schiefgeht, ist STILLE — es kommt nichts mehr. Darauf wird gewartet, und der
 * Wecker geht bei jedem Häppchen von vorn los.
 *
 * Zwei Minuten, weil zwischen zwei Häppchen einer laufenden Antwort keine zwei
 * Minuten liegen. Als Nagel benannt, nicht gemessen.
 */
export const STILLE_MS = 2 * 60 * 1000;

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
/* Eine Frist unter einer Minute als „0 Minuten" zu melden waere eine falsche
   Zahl in einer Fehlermeldung — klein, aber es ist genau die Stelle, an der
   jemand nachrechnet. */
function dauerWort(ms) {
  if (ms < 2000) return `${ms} ms`;
  return ms < 120000 ? `${Math.round(ms / 1000)} Sekunden` : `${Math.round(ms / 60000)} Minuten`;
}

function fristFehler(stroemen, gilt) {
  const fehler = new Error(
    `Der Aufruf hat ${stroemen
      ? `${dauerWort(gilt)} lang nichts mehr geschickt`
      : `nach ${dauerWort(gilt)} nicht geantwortet`} und wurde abgebrochen. ` +
    `Ob die Gegenseite die Antwort trotzdem fertiggestellt hat, ist von hier aus nicht zu sehen — ` +
    `falls ja, ist sie bezahlt. Abhilfe: die Rolle mit weniger Aufwand fahren, oder die Frist erhöhen.`);
  fehler.frist = true;
  return fehler;
}

/**
 * SETZT DEN STROM WIEDER ZU EINER ANTWORT ZUSAMMEN.
 *
 * ══ WARUM ÜBERHAUPT GESTRÖMT WIRD ══════════════════════════════════════════
 *
 * Klaus, 2026-09-06: eine Schicht stand vierzig Minuten bei einem Aufruf. Alle
 * Aufrufe gingen bis dahin ungeströmt hinaus, Emil mit `max_tokens: 16000` auf
 * Opus. Genau davor warnt Anthropics eigene Anleitung: für lange Ausgaben
 * Strömen nehmen, sonst läuft die Anfrage in eine Zeitgrenze. Die Frist von
 * vorhin ist das Pflaster; DAS hier ist die Ursache.
 *
 * ══ UND WARUM ES TROTZDEM NICHTS ÄNDERT ════════════════════════════════════
 *
 * Herausgegeben wird DIESELBE Form wie vorher — ein Nachrichten-Objekt mit
 * `content`, `stop_reason` und `usage`. `api.mjs` merkt vom Strömen nichts,
 * und das ist die Zusicherung dieser Naht: der Bote trägt hinaus und bringt
 * zurück, die Politik bleibt an einer Stelle. Zwei Formen wären zwei Stellen,
 * an denen der Browser etwas anderes zählt als die Kommandozeile.
 */
async function sammleStrom(antwort, stelle) {
  if (!antwort.body || typeof antwort.body.getReader !== "function")
    throw new Error(
      "Die Antwort kam ohne lesbaren Strom. Ein `fetch`, das keinen Rumpf als " +
      "Strom hergibt, kann nicht geströmt gelesen werden.");

  const leser = antwort.body.getReader();
  const dekoder = new TextDecoder("utf-8");
  let rest = "";
  const bau = neuerBau();

  for (;;) {
    const { value, done } = await leser.read();
    /* Jedes Häppchen stellt den Wecker neu — gewartet wird auf Stille. */
    stelle();
    if (done) break;
    rest += dekoder.decode(value, { stream: true });
    /* SSE trennt Ereignisse durch eine LEERZEILE. Der letzte Rest bleibt
       liegen: ein Häppchen endet mitten in einer Zeile, und wer hier schon
       parst, verliert sie. */
    let schnitt;
    while ((schnitt = rest.indexOf("\n\n")) !== -1) {
      const roh = rest.slice(0, schnitt);
      rest = rest.slice(schnitt + 2);
      const daten = roh.split("\n")
        .filter((z) => z.startsWith("data:"))
        .map((z) => z.slice(5).trim())
        .join("");
      if (!daten || daten === "[DONE]") continue;
      let ev;
      try { ev = JSON.parse(daten); } catch { continue; }
      bau.nimm(ev);
    }
  }
  return bau.fertig();
}

/** Der Zusammenbau selbst — je Ereignis ein Schritt, kein Zustand daneben. */
function neuerBau() {
  const msg = {
    id: null, type: "message", role: "assistant", model: null,
    content: [], stop_reason: null, stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  };
  /* Die Eingaben eines Werkzeug-Aufrufs kommen als JSON-SCHNIPSEL. Sie werden
     erst am Ende des Blocks gelesen — ein halbes JSON ist kein JSON. */
  const schnipsel = [];

  return {
    nimm(ev) {
      const t = ev && ev.type;
      if (t === "message_start" && ev.message) {
        msg.id = ev.message.id || null;
        msg.model = ev.message.model || null;
        msg.role = ev.message.role || "assistant";
        if (ev.message.usage) Object.assign(msg.usage, ev.message.usage);
      } else if (t === "content_block_start") {
        msg.content[ev.index] = JSON.parse(JSON.stringify(ev.content_block || {}));
        schnipsel[ev.index] = "";
      } else if (t === "content_block_delta") {
        const b = msg.content[ev.index], d = ev.delta || {};
        if (!b) return;
        if (d.type === "text_delta") b.text = (b.text || "") + (d.text || "");
        else if (d.type === "input_json_delta") schnipsel[ev.index] += d.partial_json || "";
        else if (d.type === "thinking_delta") b.thinking = (b.thinking || "") + (d.thinking || "");
        else if (d.type === "signature_delta") b.signature = (b.signature || "") + (d.signature || "");
      } else if (t === "content_block_stop") {
        const b = msg.content[ev.index];
        if (b && b.type === "tool_use") {
          /* ⚠ LEER HEISST LEERES OBJEKT, NICHT KAPUTT. Ein Werkzeug ohne
             Eingaben schickt gar keinen Schnipsel; `JSON.parse("")` wirft, und
             ein geworfener Fehler hier sähe aus wie eine abgeschnittene
             Antwort. */
          try {
            b.input = schnipsel[ev.index] ? JSON.parse(schnipsel[ev.index]) : {};
          } catch (e) {
            throw new Error(
              `Ein Werkzeug-Aufruf kam als unvollständiges JSON an (${b.name || "?"}). ` +
              `Der Strom ist mitten im Argument abgerissen; die Antwort ist unbrauchbar ` +
              `und bezahlt.`);
          }
        }
      } else if (t === "message_delta") {
        if (ev.delta) {
          if (ev.delta.stop_reason !== undefined) msg.stop_reason = ev.delta.stop_reason;
          if (ev.delta.stop_sequence !== undefined) msg.stop_sequence = ev.delta.stop_sequence;
        }
        /* Die Ausgabe-Zahl steht ERST hier. Wer sie aus `message_start` nimmt,
           meldet null Ausgabe-Token — und eine zu niedrige Zahl sieht genauso
           aus wie eine gemessene. */
        if (ev.usage) Object.assign(msg.usage, ev.usage);
      } else if (t === "error") {
        const e = ev.error || {};
        const fehler = new Error(
          `Die Gegenseite hat den Strom mit einem Fehler beendet: ` +
          `${e.type || "unbekannt"} — ${e.message || "ohne Begründung"}`);
        fehler.imStrom = true;
        throw fehler;
      }
    },
    fertig() {
      /* Lücken kann es geben, wenn ein Block-Start fehlte. `filter(Boolean)`
         wirft sie heraus, statt `undefined` an `api.mjs` weiterzureichen. */
      msg.content = msg.content.filter(Boolean);
      return msg;
    },
  };
}

export function netzTransport({ schluessel, basisUrl = null, holen = null,
                                fristMs = FRIST_MS, stilleMs = STILLE_MS } = {}) {
  if (!schluessel) throw new Error(
    "Der Netz-Bote braucht einen Schlüssel. Im Browser tippt ihn der Nutzer " +
    "selbst ein; er steht nirgends im Code und nirgends im Depot.");

  const fetchen = holen || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  if (!fetchen) throw new Error(
    "Kein `fetch` vorhanden. Im Browser gibt es eines, in Node ab 18 auch — " +
    "wo keines ist, kann dieser Bote nicht tragen.");

  const wurzel = String(basisUrl || ANTHROPIC).replace(/\/+$/, "");

  async function schicke(pfad, koerper, { stroemen = false } = {}) {
    /* Die Frist. `AbortController` gibt es im Browser und in Node ab 18 —
       dieselbe Naht wie bei `fetch` selbst.

       ⚠ BEIM STRÖMEN WIRD SIE BEI JEDEM HÄPPCHEN NEU GESTELLT. Eine
       Gesamtfrist wäre dort das falsche Maß: sie bräche die ehrlich lange
       Antwort ab, für die das Strömen überhaupt gebaut ist. Was schiefgeht,
       ist Stille. */
    const wache = new AbortController();
    let abgelaufen = false;
    let wecker = null;
    /* ZWEI GRENZEN, ZWEI NAMEN. Eine Zahl für beides wäre entweder für den
       Strom zu streng oder für den kurzen Weg zu nachsichtig — und eine Probe
       könnte die eine nicht prüfen, ohne die andere mitzuverstellen. */
    const gilt = stroemen ? stilleMs : fristMs;
    const stelle = () => {
      if (wecker) clearTimeout(wecker);
      wecker = setTimeout(() => { abgelaufen = true; wache.abort(); }, gilt);
    };

    /* ⚠ EIN try/finally ÜBER DAS GANZE, nicht nur über den `fetch`. Beim
       Strömen kommen die Kopfzeilen sofort und der Rumpf über Minuten; ein
       `finally` direkt am `fetch` löschte den Wecker, bevor das Häppchen-Warten
       überhaupt beginnt — die Frist wäre da und wirkte nie. Und ohne
       `clearTimeout` am Ende hält der Wecker Node minutenlang wach: ein Lauf,
       der fertig ist und trotzdem nicht endet, sieht aus wie ein Hänger, also
       genau wie der Fehler, gegen den die Frist gebaut ist. */
    stelle();
    try {
      let antwort;
      try {
        antwort = await fetchen(`${wurzel}${pfad}`, {
          signal: wache.signal,
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
          body: JSON.stringify(stroemen ? { ...koerper, stream: true } : koerper),
        });
      } catch (e) {
        /* ⚠ EINE ABGELAUFENE FRIST IST KEIN NETZFEHLER. Beides kommt hier als
           geworfener Fehler an, und die alte Meldung schickte den Nutzer auf die
           Suche nach einem Netzproblem, das es nicht gibt. Was er wirklich
           wissen muss, steht in der eigenen Meldung — samt der unbequemen
           Hälfte: ob die Gegenseite die Antwort trotzdem erzeugt hat, wissen wir
           von hier aus nicht, und dann ist sie bezahlt. */
        if (abgelaufen) throw fristFehler(stroemen, gilt);
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

      if (!stroemen) return await antwort.json();
      try {
        return await sammleStrom(antwort, stelle);
      } catch (e) {
        if (abgelaufen) throw fristFehler(stroemen, gilt);
        throw e;
      }
    } finally {
      if (wecker) clearTimeout(wecker);
    }
  }

  return {
    /* GESTRÖMT, und das ist keine Feinheit. Ohne `stream: true` läuft ein
       langer Aufruf in eine Zeitgrenze — genau das stand am 2026-09-06 vierzig
       Minuten still. `count_tokens` bleibt ungeströmt: der Weg ist kurz und
       gibt eine Zahl zurück, kein Werkstück. */
    erzeuge: (bitte) => schicke("/v1/messages", bitte, { stroemen: true }),
    zaehle: (bitte) => schicke("/v1/messages/count_tokens", bitte)
      .then((r) => r.input_tokens),
  };
}
