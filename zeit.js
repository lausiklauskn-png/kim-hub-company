/*
 * zeit.js — WIE AUS ABSCHNITTEN EINE ARBEITSZEIT WIRD.
 *
 * ══ WARUM DAS EINE EIGENE DATEI IST ════════════════════════════════════════
 *
 * Diese Rechnung stand bis zum 2026-08-25 in `ansicht.js`, eingeschlossen in
 * dessen Klammer. Prüfbar war sie damit nur im Browser — und die Gegenprobe
 * fährt mit `WERKSTATT_OHNE_BROWSER=1`. Ergebnis: acht Wächter, die einzeln
 * richtig waren und im echten Lauf **nichts gemessen** haben. Sie standen als
 * „NICHT GEFANGEN" da, ohne dass etwas kaputt war.
 *
 * Eine Rechnung, die über einen Stundennachweis entscheidet, gehört an eine
 * Stelle, die **überall** läuft. Dieselbe Bauart wie die SBKIM-Module und wie
 * `assets/karte.js` in PWA Toolpoint: ein Objekt, das sich an `window` hängt,
 * wenn es eines gibt, und sonst exportiert wird.
 *
 * ══ WAS HIER ENTSCHIEDEN WIRD ══════════════════════════════════════════════
 *
 * Klaus 2026-08-24: „meine Zeit vom auslösen bis zum ende der Schicht
 * mitrechnen … alles für die Forschung."
 *
 * Damit zählt hier nicht Bequemlichkeit, sondern Nachweisbarkeit. Und der
 * teuerste Fehler ist die ZU HOHE Zahl: wer die Stechuhr laufen lässt und
 * zugleich eine Schicht fährt, hat EINE Stunde gearbeitet, nicht zwei. Beide
 * Zeilen stimmen für sich — nur ihre Summe nicht. Deshalb wird über die
 * VEREINIGUNG der Zeiträume gerechnet, nie addiert.
 */
(function (welt) {
  "use strict";

  /**
   * Fahrten aus dem Fahrtenbuch als Zeit-Abschnitte.
   *
   * ⚠ ALTE ZEILEN BEKOMMEN KEINE ERFUNDENE SPANNE. Vor dem 2026-08-24 trug das
   * Buch nur `beendet` und `minuten` (gerundet, aus der einspritzbaren
   * Prüf-Uhr). Daraus einen Zeitraum zu rekonstruieren ginge nicht, und `0`
   * hinzuschreiben wäre die „gemessen aussehende Null". Sie stehen in der
   * Liste, tragen `ohneZeit` und zählen nicht mit.
   */
  function fahrtAbschnitte(buch) {
    if (!buch || !Array.isArray(buch.fahrten)) return [];
    var raus = [];
    buch.fahrten.forEach(function (f) {
      var von = Date.parse(f.beginn || f.beendet || "");
      if (!isFinite(von)) return;
      var sek = Number(f.sekunden);
      var ohneZeit = !isFinite(sek) || sek < 0 || !f.beginn;
      raus.push({ von: von, sekunden: ohneZeit ? 0 : sek,
                  was: (f.artText || f.art || "Schicht") + (f.titel ? " — " + f.titel : ""),
                  automatisch: true, ohneZeit: ohneZeit,
                  echt: !!f.echt, wer: f.wer || "" });
    });
    return raus;
  }

  /**
   * Die VEREINIGUNG der Zeiträume — nicht ihre Summe.
   *
   * Gibt zurück, wie viel wirklich gearbeitet wurde, UND wie viel doppelt
   * erfasst war. Die zweite Zahl ist kein Beiwerk: eine Korrektur, die man
   * nicht sieht, ist von einem Fehler nicht zu unterscheiden.
   */
  function vereinigt(abschnitte) {
    var iv = (abschnitte || [])
      .filter(function (e) { return e && !e.ohneZeit && (e.sekunden || 0) > 0; })
      .map(function (e) { return [e.von, e.von + (e.sekunden || 0) * 1000]; })
      .sort(function (a, b) { return a[0] - b[0]; });
    var ms = 0, ueberMs = 0, jetzt = null;
    iv.forEach(function (p) {
      if (!jetzt) { jetzt = [p[0], p[1]]; return; }
      if (p[0] <= jetzt[1]) {
        // Überlappt oder schliesst nahtlos an. Bei „schliesst an" ist der
        // Beitrag 0 — richtig, dort geht keine Zeit doppelt.
        ueberMs += Math.min(jetzt[1], p[1]) - p[0];
        jetzt[1] = Math.max(jetzt[1], p[1]);
      } else { ms += jetzt[1] - jetzt[0]; jetzt = [p[0], p[1]]; }
    });
    if (jetzt) ms += jetzt[1] - jetzt[0];
    return { sekunden: ms / 1000, ueberlappungSek: ueberMs / 1000 };
  }

  /*
   * ══ DER WEG NACH DRAUSSEN IST DAS GLOBAL — UND NUR DAS ════════════════════
   *
   * Hier stand zuerst zusätzlich `module.exports = API`, das übliche Muster für
   * „läuft im Browser und in Node". In DIESEM Depot läuft es nie:
   * `package.json` trägt `"type": "module"`, also ist jede `.js` ein
   * ES-Modul, `module` gibt es dort nicht, und die Zeile wurde stillschweigend
   * übersprungen. `require()` gab ein leeres Objekt zurück — eine Zeile, die
   * aussah, als arbeitete sie.
   *
   * Ein `export` statt dessen ginge auch nicht: die Seite lädt diese Datei mit
   * einem gewöhnlichen `<script>`, und das verträgt keine Export-Anweisung.
   *
   * Also EIN Weg für beide Welten, und zwar derselbe, den die Seite geht: das
   * Objekt hängt am Global. Eine Probe importiert die Datei und liest es von
   * dort — damit misst sie genau den Pfad, den auch der Browser nimmt, statt
   * einen zweiten, der nur für Tests existiert.
   */
  /**
   * Eine Spanne in Millisekunden als Uhrzeit-Text: `mm:ss`, ab einer Stunde
   * `h:mm:ss`.
   *
   * ⚠ SIE STEHT HIER UND NICHT IN `buehne.js`, obwohl nur die Schichtuhr sie
   * braucht. Der Grund ist derselbe, aus dem diese Datei überhaupt existiert:
   * eine Rechnung in `buehne.js` wäre nur im Browser prüfbar, und die
   * Gegenprobe fährt mit `WERKSTATT_OHNE_BROWSER=1` — der Wächter darüber
   * wäre die fünfte Art, wie ein Fall nichts misst.
   *
   * Abgeschnitten, nicht gerundet: eine Uhr, die bei 0,6 s schon „01" zeigt,
   * ginge der Wirklichkeit voraus.
   */
  function dauerText(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    var zz = function (n) { return (n < 10 ? "0" : "") + n; };
    return h > 0 ? h + ":" + zz(m) + ":" + zz(r) : zz(m) + ":" + zz(r);
  }

  if (welt) welt.WERKSTATT_ZEIT = {
    fahrtAbschnitte: fahrtAbschnitte, vereinigt: vereinigt, dauerText: dauerText
  };
})(typeof window !== "undefined" ? window
   : (typeof globalThis !== "undefined" ? globalThis : null));
