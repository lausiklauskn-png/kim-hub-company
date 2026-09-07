/**
 * WIE GROSS EIN LAUF IST — in Aufrufen, nicht in Hoffnung.
 *
 * ⚠ WARUM ES DIESE DATEI GIBT (Klaus 2026-09-07). Nach drei Tagen ohne
 * Ergebnis war die Bestandsaufnahme eindeutig: **Geld war nicht die Grenze,
 * Zeit war es.** Sein Fahrtenbuch nennt 9 Minuten für zwei Aufrufe; ein voller
 * Lauf sind dreissig. Das sind über zwei Stunden — und **die Zahl stand
 * nirgends.** Er hat gewartet, ohne zu wissen, worauf.
 *
 * Eine Schätzung ist keine Messung, und deshalb wird sie hier auch nicht als
 * eine ausgegeben: `erwarteteAufrufe` ist **gerechnet** (aus der Besetzung und
 * dem Rundendeckel), `restSchaetzung` ist **hochgerechnet** aus dem, was auf
 * DIESEM Gerät bisher wirklich gedauert hat. Wer keine eigene Messung hat,
 * bekommt `null` — und die Seite schreibt dann „noch nicht gemessen" statt
 * einer erfundenen Minutenzahl.
 *
 * Portabel wie `zeit.js` und `plan-form.mjs`: kein `node:`, damit die Zahl im
 * Browser dieselbe ist wie auf der Platte.
 */

/**
 * Wie viele Aufrufe ein vollständiger Lauf braucht.
 *
 * ⚠ GERECHNET AUS DER BESETZUNG, nicht abgeschrieben. Eine feste Zahl wäre
 * beim nächsten Rollen-Zuwachs still falsch — genau das ist am 2026-09-05
 * sechzehn Wächtern passiert, die „fünf" festgenagelt hatten.
 *
 * Nachgerechnet an einer echten Trockenschicht (2026-09-07, acht Rollen,
 * zwei Runden): Konferenz **17**, Schicht **13**, zusammen **30**.
 */
export function erwarteteAufrufe({ rollen, runden = 2, mitKonferenz = true } = {}) {
  const n = Number(rollen) || 0;
  if (n < 2) return { konferenz: 0, schicht: 0, gesamt: 0 };
  /* Jeder schlägt vor, jeder bewertet, der Beobachter schliesst ab. */
  const konferenz = mitKonferenz ? 2 * n + 1 : 0;
  /* Ingenieur und Mit-Ingenieur einmal, der Beobachter zum Feierabend einmal —
     die übrigen je Runde. Bei acht Rollen sind das fünf pro Runde. */
  const jeRunde = Math.max(1, n - 3);
  const schicht = 2 + jeRunde * Math.max(1, Number(runden) || 1) + 1;
  return { konferenz, schicht, gesamt: konferenz + schicht };
}

/**
 * Was von einem laufenden Lauf noch aussteht — hochgerechnet aus dem, was
 * bisher gedauert hat.
 *
 * ⚠ ERST AB DEM ZWEITEN AUFRUF. Aus einem einzigen Messpunkt eine Dauer
 * hochzurechnen ergibt eine Zahl, die genauso aussieht wie eine begründete —
 * und der erste Aufruf trägt zudem den Verbindungsaufbau. Vorher: `null`.
 */
export function restSchaetzung({ getan, gesamt, verstricheneMs } = {}) {
  const g = Number(getan) || 0, ges = Number(gesamt) || 0, ms = Number(verstricheneMs) || 0;
  if (g < 2 || ges <= 0 || ms <= 0) return null;
  /* Mehr getan als erwartet heisst NICHT „gleich fertig": der Rundendeckel
     lässt bis zu acht Runden zu. Dann gibt es keine ehrliche Restzahl. */
  if (g >= ges) return null;
  const jeAufrufMs = ms / g;
  return { jeAufrufMs, restMs: jeAufrufMs * (ges - g), gesamtMs: jeAufrufMs * ges };
}

/* DER WEG ZUR BÜHNE. `buehne.js` ist ein klassisches Skript und kann nicht
   importieren; ein zweiter Rechenweg dort wäre eine Drift-Quelle mit Ansage —
   dann stünde auf der Uhr eine andere Zahl als im Bericht. Dieselbe Bauart wie
   `zeit.js` und `WERKSTATT_ZEIT`. */
if (typeof globalThis !== "undefined")
  globalThis.WERKSTATT_UMFANG = { erwarteteAufrufe, restSchaetzung };
