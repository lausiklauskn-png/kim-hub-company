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

  /**
   * DER TAG, AN DEM GEARBEITET WURDE — in ORTSZEIT, nicht in UTC.
   *
   * ⚠ WARUM DAS EINE EIGENE FUNKTION IST (Klaus 2026-09-07, mit Bild): sein
   * Verlauf nannte „7.9.2026, 01:20:32", das Fahrtenbuch daneben „2026-09-06".
   * Dieselbe Fahrt, zwei Tage.
   *
   * Die Ursache war `new Date().toISOString().slice(0, 10)` — und
   * `toISOString()` ist UTC. Um 01:20 in Mitteleuropa ist es 23:20 des
   * Vortags in Greenwich. **Jede Fahrt zwischen Mitternacht und zwei Uhr
   * wurde auf den Vortag gebucht.**
   *
   * ⚠ UND DARAN HÄNGT GELD. Das Tageskontingent zählt nach diesem Tag: eine
   * Nachtschicht belastet das Budget von gestern, und der Tagesdeckel greift
   * am falschen Tag. Ein Buchungsdatum, das um einen Tag verrutscht, ist
   * kein Schönheitsfehler.
   *
   * Ein Betreiber denkt in SEINEN Tagen. Ein Tagesdeckel ist ein Budget in
   * seinem Leben, nicht in Greenwich.
   *
   * @param {Date} [d] — einspritzbar, damit eine Probe einen Zeitpunkt
   *                     festhalten kann, ohne auf Mitternacht zu warten.
   */
  function tagOrt(d) {
    var t = d || new Date();
    var zz = function (n) { return (n < 10 ? "0" : "") + n; };
    return t.getFullYear() + "-" + zz(t.getMonth() + 1) + "-" + zz(t.getDate());
  }

  /**
   * GEHT DIE AUFTEILUNG AUF? — wie viel der beiden Haelften doppelt daliegt.
   *
   * ⚠ WARUM DAS HIER STEHT UND NICHT IN DER ANSICHT (Klaus 2026-09-07, mit
   * Bild: „0:00:00 gestempelt · 1:25:14 gefahren", und die grosse Zahl sagte
   * 4:58). Die Kachel nennt drei Zahlen; **eine Aufteilung, die nicht aufgeht,
   * macht die Summe daneben unglaubwuerdig — auch wenn die Summe stimmt.**
   *
   * Gestempeltes und Gefahrenes werden jedes fuer sich vereinigt. Ueberschneiden
   * sie sich — die Stechuhr laeuft, waehrend eine Schicht faehrt —, ist ihre
   * Summe groesser als die Gesamtzeit. Beide Zeilen stimmen fuer sich, nur ihre
   * Summe nicht: genau der Fall, den „dieselbe Stunde zaehlt EINMAL" meint.
   *
   * In `ansicht.js` waere diese Rechnung nur im Browser pruefbar, und die
   * Gegenprobe faehrt ohne. Dieselbe Abhilfe wie beim Rest dieser Datei am
   * 2026-08-25: was sich nachrechnen laesst, gehoert dorthin, wo es ueberall
   * laeuft.
   *
   * ⚠ NIE NEGATIV. Waere `gesamt` groesser als beide Haelften zusammen, laege
   * ein Fehler eine Ebene tiefer — eine negative „Doppelzeit" waere davon die
   * unbrauchbarste Auskunft.
   */
  function aufteilung(gestempeltSek, gefahrenSek, gesamtSek) {
    var a = Number(gestempeltSek) || 0, b = Number(gefahrenSek) || 0;
    var g = Number(gesamtSek) || 0;
    return { gestempeltSek: a, gefahrenSek: b, gesamtSek: g,
             doppeltSek: Math.max(0, a + b - g),
             /* Geht sie auf? Eine Toleranz von einer Sekunde, weil angezeigt
                wird, was gerundet ist — nicht, um einen Fehler zuzudecken. */
             gehtAuf: Math.abs((a + b - Math.max(0, a + b - g)) - g) < 1 };
  }


  /*
   * ══ EINEN ZWECK NACHTRAGEN — NUR DEN ZWECK ═════════════════════════════════
   *
   * Klaus am 2026-09-08, nachdem er es vergeblich versucht hatte: „bau die
   * Beschriftung, nur den Zweck, Zeiten fest."
   *
   * DER SCHADEN, DER DAHINTER STAND. Eine gestempelte Zeile bekam ihre
   * Beschriftung an genau zwei Stellen — beim Start und beim Stoppen, beide aus
   * dem Feld `#uhr-was`. Danach gab es keinen Weg mehr dorthin. Wer eine Uhr
   * ohne Zweck losgeschickt hatte, konnte ihn nie nachtragen; die Zeile stand
   * mit „—" da, endgültig. Am 2026-09-07 traf das die groesste Zeile der ganzen
   * Aufstellung: 15:03:24 von 16:30:23, also 91 % der gezaehlten Zeit, ohne
   * Angabe wofuer. Klaus' Ausweg war, einen NEUEN Abschnitt zu beginnen — die
   * alte Zeile blieb blank.
   *
   * ⚠ WARUM NUR DER ZWECK, UND DIE ZEITEN NIE.
   *
   * Ein Stundennachweis, dessen Zeiten sich nachtraeglich aendern lassen, ist
   * ein anderes Dokument als einer, dessen Zeiten feststehen — er belegt dann
   * nicht mehr, was die Uhr gemessen hat, sondern was jemand spaeter dazu
   * meinte. **Gemessen wird einmal.** Die Beschriftung dagegen ist keine
   * Messung, sondern eine Angabe des Menschen darueber, woran er sass; sie
   * nachzutragen faelscht nichts, sie fuellt eine Luecke.
   *
   * Deshalb ist die Grenze nicht Vorsicht, sondern Bauart: diese Funktion
   * KOPIERT den Eintrag und ueberschreibt genau zwei Felder. `von`,
   * `sekunden`, `feierabend`, `automatisch` gehen unveraendert durch, weil sie
   * hier gar nicht angefasst werden. Wer sie aendern wollte, muesste diese
   * Funktion umbauen — und dann faellt `smoke_zeit` um.
   *
   * ⚠ UND DIE AENDERUNG IST SICHTBAR. `wasVerlauf` haelt fest, was vorher
   * dastand und wann es ersetzt wurde. Eine stille Aenderung an einem Nachweis
   * ist von einer Faelschung nicht zu unterscheiden — auch dann nicht, wenn sie
   * ehrlich gemeint war. Der Verlauf waechst an, er wird nie ueberschrieben:
   * sonst verschluckte die zweite Korrektur die erste.
   *
   * ⚠ LEEREN IST KEIN AENDERN. Ein Zweck laesst sich berichtigen, nicht
   * loeschen — sonst waere der Weg zurueck zu „—" ein Weg, eine Angabe
   * spurlos verschwinden zu lassen. Dieselbe Richtungs-Regel wie bei der
   * Sperr-Liste in Kimboard: aus der Oberflaeche geht es nur nach oben.
   *
   * ⚠ UND EINE FAHRT WIRD NICHT BESCHRIFTET. Ihre Zeile kommt aus dem
   * Fahrtenbuch, nicht aus dem Browser-Speicher; die Seite besitzt sie nicht.
   * Sie hier zu aendern hiesse, in ein fremdes Buch zu schreiben — und beim
   * naechsten Laden staende wieder der alte Text da, ohne dass jemand wuesste
   * warum.
   *
   * Rueckgabe: `{ok:true, eintrag}` oder `{ok:false, grund}` mit einem der
   * Gruende `fahrt` · `laeuft` · `leer` · `unveraendert`. Unterschieden statt
   * geraten: ein `null` fuer alle vier Faelle liesse die Oberflaeche raten,
   * was sie dem Nutzer sagen soll.
   */
  function zweckNachtragen(eintrag, neuerText, jetztIso) {
    if (!eintrag || typeof eintrag !== "object") return { ok: false, grund: "leer" };
    if (eintrag.automatisch) return { ok: false, grund: "fahrt" };
    if (eintrag.laeuft) return { ok: false, grund: "laeuft" };
    var neu = String(neuerText == null ? "" : neuerText).trim();
    if (!neu) return { ok: false, grund: "leer" };
    var alt = String(eintrag.was == null ? "" : eintrag.was).trim();
    if (neu === alt) return { ok: false, grund: "unveraendert" };

    /* Der Eintrag wird KOPIERT, nicht am Original geaendert: der Aufrufer haelt
       dieselbe Liste in der Hand, und eine Aenderung im Vorbeigehen waere von
       aussen nicht zu sehen. */
    var k = {};
    for (var f in eintrag) if (Object.prototype.hasOwnProperty.call(eintrag, f)) k[f] = eintrag[f];

    /* Ein vorhandener Verlauf wird fortgeschrieben, nie ersetzt. Ist das Feld
       kaputt (kein Feld), faengt der Verlauf hier an — das ist ehrlicher als
       ein Abbruch, denn die Zeile selbst ist in Ordnung. */
    var verlauf = Array.isArray(eintrag.wasVerlauf) ? eintrag.wasVerlauf.slice() : [];
    verlauf.push({ zuvor: alt, geaendert: String(jetztIso || new Date().toISOString()) });

    k.was = neu;
    k.wasVerlauf = verlauf;
    return { ok: true, eintrag: k };
  }

  /* Die Zeitfelder einer Zeile — an EINER Stelle benannt, damit die Probe und
     die Funktion oben nicht zwei verschiedene Listen meinen. Wer ein Feld
     ergaenzt, das eine Zeit traegt, traegt es hier nach. */
  var ZEITFELDER = ["von", "sekunden", "feierabend", "automatisch", "ohneZeit"];


  /*
   * ══ DIE GROSSE ZAHL IST EINE DAUER, KEINE UHRZEIT ══════════════════════════
   *
   * Klaus am 2026-09-08, 12:09 Uhr, vor der Stechuhr: „ich sehe, dass die Uhr
   * noch auf fünfzehn Uhr gestellt ist. Jetzt ist es zwölf Uhr neun … Das ist
   * natürlich falsch."
   *
   * Es war nicht falsch, und er hat trotzdem recht. Dastand `15:29:48`, und
   * das war die GESAMMELTE Arbeitszeit seit dem letzten ⟲ — fünfzehn Stunden,
   * neunundzwanzig Minuten. Gelesen hat er eine Uhrzeit, und zwar zu Recht:
   * `h:mm:ss` IST die Form, in der Uhrzeiten dastehen.
   *
   * ⚠ UND IM SELBEN CODE STEHT `uhrzeitJetzt()`, das echte Uhrzeiten in
   * EXAKT dieser Form ausgibt. Zwei Bedeutungen, ein Format — die Verwechslung
   * war eingebaut, nicht seine Unachtsamkeit.
   *
   * Die Abhilfe ist NICHT, das Verhalten zu ändern. ▶ zählt bewusst weiter, wo
   * die Uhr stehen geblieben ist; auf null setzt nur ⟲. Das war Klaus' ERSTE
   * Beschwerde in die andere Richtung („nach jedem Aktualisieren startet es
   * wieder bei null"), und sie ist teuer bezahlt. Geändert wird, was man
   * SIEHT.
   *
   * ⚠ DIE EINHEITEN BLEIBEN AUFGEFUELLT, sobald eine groessere daneben steht:
   * `15 h 09 min 08 s` statt `15 h 9 min 8 s`. Eine Anzeige, die im Sekunden-
   * takt die Breite wechselt, springt — und eine springende Zahl liest sich
   * schlechter als eine ruhige. Vorn wird NICHT aufgefuellt: `09 h` sähe
   * wieder nach Uhrzeit aus, und genau darum geht es hier.
   */
  function dauerLang(sek) {
    var s = Math.max(0, Math.floor(Number(sek) || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    var zz = function (n) { return (n < 10 ? "0" : "") + n; };
    if (h > 0) return h + " h " + zz(m) + " min " + zz(r) + " s";
    if (m > 0) return m + " min " + zz(r) + " s";
    return r + " s";
  }

  /*
   * ⚠ UND DIE ZWEITE HAELFTE SEINES BEFUNDS: „wenn ich jetzt wieder starte,
   * startet das bei 15:29:48."
   *
   * Ja — weil er am Morgen AUSGECHECKT hat und die Zaehlung seitdem
   * abgeschlossen dasteht. Der Knopf dafuer ist ⟲, und das stand nur im
   * Kleingedruckten unter den Knoepfen. Wer eine abgeschlossene Zaehlung vor
   * sich hat, soll das AN DER ZAHL sehen, nicht drei Zeilen tiefer.
   *
   * Gemessen wird der JUENGSTE gestempelte Abschnitt seit dem letzten ⟲ —
   * nicht irgendeiner: ein Feierabend von vorgestern sagt nichts darueber, ob
   * die Zaehlung von heute abgeschlossen ist.
   *
   * Fahrten bleiben aussen vor. Sie kommen aus dem Fahrtenbuch und haben
   * keinen Feierabend; sie wuerden hier nur die Reihenfolge verfaelschen.
   */
  function standAusgecheckt(abschnitte, nullZeit) {
    var n = Number(nullZeit) || 0;
    var seit = (abschnitte || []).filter(function (e) {
      return e && !e.automatisch && !e.laeuft && (Number(e.von) || 0) >= n;
    });
    if (!seit.length) return false;
    var juengste = seit[0];
    seit.forEach(function (e) { if ((Number(e.von) || 0) >= (Number(juengste.von) || 0)) juengste = e; });
    return juengste.feierabend === true;
  }

  if (welt) welt.WERKSTATT_ZEIT = {
    fahrtAbschnitte: fahrtAbschnitte, vereinigt: vereinigt, dauerText: dauerText,
    tagOrt: tagOrt, aufteilung: aufteilung,
    zweckNachtragen: zweckNachtragen, ZEITFELDER: ZEITFELDER,
    dauerLang: dauerLang, standAusgecheckt: standAusgecheckt
  };
})(typeof window !== "undefined" ? window
   : (typeof globalThis !== "undefined" ? globalThis : null));
