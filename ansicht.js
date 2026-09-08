/*
 * ansicht.js — die Werkstatt zum Ansehen.
 *
 * Vier Räume aus vier Dateien. Jede Datei kann fehlen; dann steht an ihrer
 * Stelle, DASS sie fehlt — nie ein leerer Kasten, der aussieht wie „nichts
 * passiert". Eine benannte Lücke ist Arbeit, eine verschwiegene ist Schaden.
 */
(function () {
  "use strict";

  var SPEICHER = "kimhub_werkstatt_";          // eigene Schublade: geteilte Adresse

  var ROLLEN = {
    ingenieur:    { kurz: "Ingenieur",    was: "bringt Ideen von außen" },
    bauer:        { kurz: "Bauer",        was: "baut" },
    arzt:         { kurz: "Arzt",         was: "urteilt gegen das Prüfmerkmal" },
    negativbauer: { kurz: "Negativbauer", was: "sucht, was schiefgeht" },
    beobachter:   { kurz: "Beobachter",   was: "schreibt auf, wo es steht" },
  };

  // Die Namen der drei Geldbeutel. Sie stehen auch im Fließtext darüber —
  // deshalb hier EINE Karte und nicht zweimal getippt: sonst nennt die Tabelle
  // etwas anders als der Absatz, der sie erklärt.
  /* WIE DER FEIERABEND HEISST. Die Kennworte kommen aus `schicht.mjs`; hier
     bekommen sie ihr Wort, an EINER Stelle. Ein unbekanntes Kennwort wird
     nicht verschwiegen — dann steht es selbst da, statt „Grund: " ohne Grund. */
  var GRUND_WORT = {
    geld:      "Das Geld war alle: ",
    zeit:      "Die Zeit war um: ",
    runden:    "Der Runden-Deckel war erreicht: ",
    verworfen: "Am Tor verworfen: ",
    fertig:    "Fertig: ",
  };

  var GELD = {
    abo:           "Abo (Max plan)",
    mehrverbrauch: "Mehrverbrauch (auto recharge)",
    api:           "API-Guthaben",
  };

  var daten = { konferenz: null, lauf: null, gegen: null, belege: null, zeiten: null, version: null };
  var buehne = null;                 /* die Werkstatt-Bühne, siehe buehne.js */
  var achse = [];        // [{ms, quelle, ereignis}] — eine Reihe über beide Läufe
  var stand = 0;         // wie viele Schritte sind zu sehen
  var laeuft = false, uhrHandle = null, livHandle = null, tickHandle = null;
  /* 4,8 s. Die erste Vorgabe waren 2,5 s — ein Vorschlag von mir. Klaus hat den
     Regler an seinem Tablet auf 4,8 gezogen, also fast auf das Doppelte. Das ist
     kein Geschmacksurteil, sondern eine Messung an einem echten Menschen vor
     einem echten Schirm, und sie schlägt meine Schätzung.
     Wer schon einmal gezogen hat, behält seine Wahl — die liegt im localStorage
     und gewinnt. Diese Zahl gilt für den, der zum ersten Mal hinsieht. */
  var SCHRITT_VORGABE = 4800;
  var schrittzeit = SCHRITT_VORGABE;

  // ── kleine Helfer ───────────────────────────────────────────────────────
  function $(w) { return document.querySelector(w); }
  function el(tag, klasse, text) {
    var n = document.createElement(tag);
    if (klasse) n.className = klasse;
    if (text != null) n.textContent = text;
    return n;
  }
  /*
   * ⚠ UND SIE STEHT HIER OBEN, NICHT WEITER UNTEN. Beim ersten Anlauf lag sie
   * versehentlich im INNEREN Scope einer anderen Funktion; `uhrZeichnen` sah
   * sie dort nicht, warf, und die Liste wurde gar nicht mehr gezeichnet — die
   * Probe meldete "0 Schlussstriche", also etwas ganz anderes als die
   * Ursache. Dieselbe Familie wie "die Werkbank stand ueber der Definition
   * des Schalters, den sie benutzt".
   */
  /*
   * ⚠ EIN AUFTRAGSTEXT VON 300 WOERTERN IN EINER TABELLENZEILE (Klaus
   * 2026-09-08, an seinem Fahrtenbuch): "beim Fahrtenbuch und der Stechuhr
   * sind die Texte noch nicht zusammengefasst. In Kimhub Forschungslink ist
   * das besser geloest?!"
   *
   * Er hat recht, und der Hinweis auf die Forschungsseite ist der richtige:
   * die legt lange Inhalte hinter `<details><summary>… (N)</summary>`.
   * KOPIERT, nicht neu erfunden — dieselbe Regel wie ueberall im Netz.
   *
   * ⚠ GEKUERZT WIRD DIE ANZEIGE, NICHT DER TEXT. Der volle Wortlaut steht
   * einen Klick weit weg; ein abgeschnittener waere ein stiller Datenverlust,
   * und gerade der Auftragstext ist das, wonach man spaeter sucht.
   */
  var LANG_AB = 140;

  function langerText(text, klasse) {
    var t = String(text == null ? "" : text);
    if (t.length <= LANG_AB) return el("div", klasse || null, t);
    var d = el("details", "langtext");
    d.setAttribute("data-langtext", String(t.length));
    var s = el("summary", klasse || null,
      t.slice(0, LANG_AB).replace(/\s+\S*$/, "") + " … (" + t.length + " Zeichen)");
    d.appendChild(s);
    d.appendChild(el("div", klasse || null, t));
    return d;
  }

  function eur(z) { return (Math.round(z * 100) / 100).toFixed(2).replace(".", ",") + " €"; }
  /* Wie eur(), aber die Währung steht am Beleg. Euro und Dollar zu addieren
     hieße, einen Wechselkurs zu erfinden, der morgen falsch ist. */
  function geld(z, w) {
    var t = (Math.round(z * 100) / 100).toFixed(2).replace(".", ",");
    return t + " " + (w === "USD" ? "$" : "€");
  }
  function msText(ms) {
    if (ms < 1000) return ms + " ms";
    if (ms < 60000) return (ms / 1000).toFixed(1).replace(".", ",") + " s";
    var m = Math.floor(ms / 60000), s = Math.round((ms % 60000) / 1000);
    return m + " min " + (s < 10 ? "0" : "") + s + " s";
  }
  function uhrzeit(sek) {
    var h = Math.floor(sek / 3600), m = Math.floor(sek % 3600 / 60), s = Math.floor(sek % 60);
    return h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function lies(schluessel, vorgabe) {
    try { var r = localStorage.getItem(SPEICHER + schluessel); return r == null ? vorgabe : JSON.parse(r); }
    catch (e) { return vorgabe; }
  }
  function schreib(schluessel, wert) {
    try { localStorage.setItem(SPEICHER + schluessel, JSON.stringify(wert)); } catch (e) {}
  }
  function leer(knoten) { while (knoten.firstChild) knoten.removeChild(knoten.firstChild); }

  // ── Laden ───────────────────────────────────────────────────────────────
  /*
   * Erst der echte Lauf DIESER Maschine, dann das hinterlegte Beispiel.
   *
   * Die Lauf-Dateien sind Laufzeit-Stand und liegen nicht mehr im Depot — sonst
   * scheitert auf jedem Gerät, das wirklich arbeitet, der nächste `git pull`.
   * Auf einem frischen Klon stünde die Seite dann leer da und sähe aus, als
   * wäre nichts geschehen. Deshalb das Beispiel — und deshalb steht auf der
   * Seite, DASS es eines ist.
   */
  function hole(pfad) {
    var lesen = function (weg) {
      return fetch(weg, { cache: "no-store" })
        .then(function (a) { return a.ok ? a.json() : null; })
        .catch(function () { return null; });
    };
    return lesen("werkstatt/" + pfad).then(function (j) {
      if (j) return j;
      return lesen("werkstatt/beispiel/" + pfad).then(function (b) {
        if (b) { b._ausBeispiel = true; b.art = b.art || "trocken"; }
        return b;
      });
    });
  }

  /*
   * Wie `hole()`, aber für eine Datei, die VERSCHLOSSEN im Depot liegen darf.
   * Drei Stufen, in dieser Reihenfolge:
   *
   *   1. Klartext auf DIESER Maschine (`…json`) — steht im `.gitignore` und
   *      reist deshalb nie mit. Liegt er da, sitzt Klaus an seinem Gerät.
   *   2. Das Tresor-Paket (`…enc.json`) — das ist die Fassung, die MITREIST.
   *      Ohne Passwort nutzlos, auch wenn Pages sie ausliefert.
   *   3. Das mitgelieferte Beispiel.
   *
   * ⚠ Die Reihenfolge ist der ganze Witz. Wer zuerst das Paket nähme, fragte
   * Klaus auf seinem eigenen Rechner nach einem Passwort für Daten, die offen
   * neben ihm liegen — und ein Passwort, das man ohne Not eingibt, tippt man
   * irgendwann auch dort, wo man es nicht sollte.
   */
  function holeTresor(pfad) {
    return hole(pfad + ".json").then(function (klar) {
      /* ⚠ AN DER FORM ERKANNT, NICHT AN DER FASSUNG. Stand hier `istTresor`
         (das auf `v === 1` besteht), fiel ein Paket aus einer neueren Fassung
         durch jedes Raster: es galt weder als Klartext noch als Paket, und die
         Seite meldete „noch nichts geladen" — waehrend die Sicherung danebenlag.
         Das ist die dritte irrefuehrende Auskunft aus derselben Verwechslung,
         und die stillste von allen: sie sieht aus wie ein leerer Browser. */
      if (klar && !istTresorForm(klar) && !klar._ausBeispiel) return { klar: klar };
      return hole(pfad + ".enc.json").then(function (paket) {
        if (istTresorForm(paket)) return { tresor: paket, ausBeispiel: !!paket._ausBeispiel };
        return klar ? { klar: klar } : null;
      });
    });
  }

  /* Wie `hole()`, nur für Text statt JSON — das Übergabe-Blatt ist Markdown.
     Derselbe Rückfall: erst diese Maschine, dann das Mitgelieferte, und die
     Herkunft wird MITGEGEBEN statt verschwiegen. */
  function holeText(pfad) {
    var lesen = function (weg) {
      return fetch(weg, { cache: "no-store" })
        .then(function (a) { return a.ok ? a.text() : null; })
        .catch(function () { return null; });
    };
    return lesen("werkstatt/" + pfad).then(function (t) {
      if (t) return { text: t, ausBeispiel: false };
      return lesen("werkstatt/beispiel/" + pfad).then(function (b) {
        return b ? { text: b, ausBeispiel: true } : null;
      });
    });
  }

  /* ══ DIE QUELL-NAHT (2026-09-05) ═══════════════════════════════════════
   *
   * WOHER die Daten kommen ist von WAS damit angezeigt wird getrennt —
   * dieselbe Naht wie Ablage, Bote und Baum vom selben Tag, und aus demselben
   * Anlass: dieselbe Ansicht soll auch in **Kim Hub Company** laufen.
   *
   * Dort gibt es keine `lauf.json` auf einem Server. Der Lauf entsteht LIVE im
   * Browser, auf dem Schlüssel des Nutzers. Die naheliegende Abhilfe wäre
   * gewesen, die Räume aus dieser Datei herauszuoperieren — gemessen am
   * 2026-09-05 ist `verdrahten()` dafür **42.841 Zeichen in EINER Funktion**,
   * und auf dieser Datei sitzen 1293 Prüfungen. Ein Umbau dort hätte Klaus'
   * laufende Werkstatt aufs Spiel gesetzt, um eine zweite App zu bauen.
   *
   * Also wandert die Datei GANZ, byte-1:1, und nur die Quelle wechselt.
   *
   * ⚠ SIE IST EIN ZUSATZ, KEIN ERSATZ. Was die Quelle NICHT liefert, wird
   * weiterhin geholt — sonst verlöre Kimhub beim ersten gespeisten Feld alle
   * übrigen. Und `null` in der Quelle heisst ausdrücklich „gibt es hier
   * nicht": in Company existiert keine Beleg-Datei von Klaus, und die Seite
   * soll das sagen, statt sie zu suchen.
   */
  function ausQuelle(name, sonst) {
    var q = window.__WERKSTATT_QUELLE;
    if (q && Object.prototype.hasOwnProperty.call(q, name)) return Promise.resolve(q[name]);
    return sonst();
  }

  function laden() {
    return Promise.all([
      ausQuelle("konferenz", function () { return hole("konferenz.json"); }),
      ausQuelle("lauf", function () { return hole("lauf.json"); }),
      ausQuelle("gegen", function () { return hole("gegenpruefung.json"); }),
      ausQuelle("belege", function () { return holeBuchhaltung("belege", "buchhaltung/anthropic-belege"); }),
      ausQuelle("zeiten", function () { return holeBuchhaltung("zeiten", "buchhaltung/zeiten"); }),
      // Das Fahrtenbuch kennt BEWUSST kein Beispiel. Ein vorgezeigtes Buch mit
      // erfundenen Ausgaben waere genau der Fehler, gegen den es angelegt ist —
      // fehlt es, sagt die Seite das, statt etwas zu zeigen.
      ausQuelle("fahrten", function () {
        return fetch("werkstatt/buchhaltung/fahrtenbuch.json", { cache: "no-store" })
          .then(function (a) { return a.ok ? a.json() : null; }).catch(function () { return null; }); }),
      // Die Zapfsaeule liegt ausserhalb von werkstatt/ und hat ebenfalls kein Beispiel.
      ausQuelle("zapf", function () {
        return fetch("schicht/kontingent.json", { cache: "no-store" })
          .then(function (a) { return a.ok ? a.json() : null; }).catch(function () { return null; }); }),
      // Der Stand kennt kein Beispiel: entweder er steht da oder er fehlt.
      ausQuelle("version", function () {
        return fetch("version.json", { cache: "no-store" })
          .then(function (a) { return a.ok ? a.json() : null; }).catch(function () { return null; }); }),
      // Das Übergabe-Blatt (1.6). Es LAG die ganze Zeit da und wurde nie geladen —
      // Raum 2 erklärte die Übergabe, statt sie zu zeigen.
      ausQuelle("blatt", function () { return holeText("plan-offen.md"); }),
      /* DIE BESETZUNG — wer die fuenf SIND, unabhaengig von einem Lauf.
         Klaus am 2026-09-05, vor der Vorschau: „hatten die Bauer nicht Namen?"
         Er hatte recht, und der Code wusste es sogar: unten in `buehne.js`
         steht „richtig, aber kalt, und Klaus' Werkstatt hat Namen". Die Namen
         standen aber NUR in `lauf.json` und in den Ereignissen — wer die Seite
         oeffnet, ohne je eine Schicht gefahren zu haben, sah „ingenieur",
         „bauer", „arzt". Die Datei mit den Namen lag die ganze Zeit daneben
         und wurde von der Ansicht nie gelesen. */
      ausQuelle("besetzung", function () {
        return fetch("schicht/mitarbeiter.json", { cache: "no-store" })
          .then(function (a) { return a.ok ? a.json() : null; })
          .then(function (j) { return (j && j.mitarbeiter) || null; })
          .catch(function () { return null; }); }),
    ]).then(function (r) {
      daten.konferenz = r[0]; daten.lauf = r[1]; daten.gegen = r[2];
      daten.belege = tresorEinsortieren("belege", r[3]);
      daten.zeiten = tresorEinsortieren("zeiten", r[4]);
      daten.fahrten = r[5]; daten.zapf = r[6]; daten.version = r[7];
      daten.blatt = r[8];
      daten.besetzung = r[9];
      neuAufbauen();
    });
  }

  // ── Die Zeitachse ───────────────────────────────────────────────────────
  function baueAchse() {
    achse = [];
    var k = daten.konferenz, l = daten.lauf, versatz = 0;
    if (k && k.events) {
      k.events.forEach(function (e) { achse.push({ ms: e.ms || 0, quelle: "konferenz", e: e }); });
      versatz = k.dauerMs || (k.events.length ? k.events[k.events.length - 1].ms : 0);
    }
    if (l && l.events) {
      // Die Schicht ist ein EIGENER Lauf mit eigener Null. Sie hinter die
      // Konferenz zu hängen ist eine Darstellungs-Entscheidung, kein Messwert —
      // zwischen beiden liegt in Wahrheit die Übergabe, und die dauert, solange
      // sie dauert.
      l.events.forEach(function (e) {
        achse.push({ ms: versatz + (e.ms || 0), quelle: "schicht", e: e });
      });
    }
    // Die Gegenpruefung ist ein dritter, eigener Lauf — sie kommt nach dem Bauen
    // und gehoert deshalb ans Ende der Reihe.
    var g = daten.gegen;
    if (g && g.events) {
      var vor = achse.length ? achse[achse.length - 1].ms : versatz;
      g.events.forEach(function (e) {
        achse.push({ ms: vor + (e.ms || 0), quelle: "gegenpruefung", e: e });
      });
    }
    achse.sort(function (a, b) { return a.ms - b.ms; });
  }

  /** Kam dieser Teil aus dem hinterlegten Beispiel statt von dieser Maschine? */
  function istBeispiel(quelle) {
    var d = { konferenz: daten.konferenz, schicht: daten.lauf, gegenpruefung: daten.gegen }[quelle];
    return !!(d && d._ausBeispiel);
  }

  function raumVon(punkt) {
    if (punkt.quelle === "konferenz") return 1;
    if (punkt.quelle === "gegenpruefung") return 3;
    if (punkt.e.phase === "feierabend") return 3;
    return 2;
  }

  // ── Zeichnen: Raum 1 ────────────────────────────────────────────────────
  function zeichneBesetzung() {
    var ziel = $("#besetzung"); leer(ziel);
    var k = daten.konferenz, l = daten.lauf;
    var liste = (l && l.besetzung) || null;
    if (!liste && k && k.events) {
      var gesehen = {};
      liste = [];
      k.events.forEach(function (e) {
        if (e.rolle && !gesehen[e.rolle]) { gesehen[e.rolle] = 1; liste.push({ rolle: e.rolle, name: e.wer, modell: "" }); }
      });
    }
    if (!liste || !liste.length) { ziel.appendChild(el("p", "leise", "Noch keine Konferenz geladen.")); return; }
    liste.forEach(function (m) {
      var r = ROLLEN[m.rolle] || { kurz: m.rolle, was: "" };
      var k2 = el("div", "kachel");
      k2.style.borderLeft = "4px solid var(--r-" + m.rolle + ", var(--kante))";
      k2.appendChild(el("small", "marke-klein", r.kurz));
      var b = el("div"); b.style.fontWeight = "700"; b.style.fontSize = "1.1rem";
      b.textContent = m.name || "?"; k2.appendChild(b);
      k2.appendChild(el("small", "leise", r.was));
      if (m.modell) { var mm = el("div", "leise"); mm.textContent = m.modell; k2.appendChild(mm); }
      ziel.appendChild(k2);
    });
  }

  function redeText(p) {
    var e = p.e;
    if (e.phase === "vorschlag")
      return { marke: "Vorschlag " + e.nummer, text: e.titel + " — " + (e.ergebnis || ""), mehr: e.begruendung };
    if (e.phase === "bewertung") {
      var st = (e.stimmen || []).map(function (s) {
        return "Nr. " + s.nummer + ": " + s.punkte + (s.einwand ? " — " + s.einwand : "");
      }).join("\n");
      return { marke: "Bewertung", text: st || "(keine Stimmen)", mehr: "" };
    }
    if (e.phase === "schluss")
      return { marke: "Auftrag", text: e.ziel, knopf: "Prüfmerkmal und Begründung",
               mehr: "Prüfmerkmal: " + e.pruefmerkmal + "\n\n" + (e.begruendung || "") };
    if (e.phase === "idee")
      return { marke: "Idee", text: e.titel, mehr: "Prüfmerkmal: " + (e.pruefmerkmal || "") };
    if (e.phase === "build")
      return { marke: "Runde " + e.runde + " · gebaut", knopf: "Weitergabe lesen",
               text: e.dateiname + " (" + e.zeichen + " Zeichen)", mehr: e.weitergabe };
    if (e.phase === "urteil")
      return { marke: "Runde " + e.runde + " · Urteil", knopf: "was fehlt",
               text: e.urteil + " — " + (e.begruendung || ""), mehr: (e.fehlende || []).join("\n") };
    if (e.phase === "befund")
      return { marke: "Runde " + e.runde + " · Befunde (" + e.anzahl + ")",
               text: (e.befunde || []).map(function (b) { return "· " + (b.text || b.was || JSON.stringify(b)); }).join("\n") || "keine",
               mehr: "" };
    /* Auch diese Phase fiel bis zum 2026-09-05 in den Auffang unten und zeigte
       rohes JSON — sie steht nur in `konferenz.json`, und der mitgelieferte
       Beispiel-Lauf trug sie nicht. */
    if (e.phase === "merkliste") {
      var eintr = e.eintraege || [];
      return { marke: "Vorgemerkt (" + eintr.length + ")", knopf: "wer sich was merkt",
               text: eintr.map(function (x) {
                 return "· " + x.titel + " — " + x.von; }).join("\n") || "nichts vorgemerkt",
               /* `geschrieben` ist der Unterschied zwischen „gemerkt" und „nur
                  gezählt": ein Trockenlauf zählt, schreibt aber nichts. */
               mehr: eintr.map(function (x) {
                 return x.von + ": " + x.titel + " (" + x.male + "×, " +
                        (x.geschrieben ? "in den Spind geschrieben" : "nur gezählt — Trockenlauf") + ")";
               }).join("\n") };
    }
    /* ⚠ DAS TOR — die Phase, die auf Klaus' Bühne als „unbekannt" stand
       (2026-09-07), und zwar am letzten Schritt eines bezahlten Laufs. Sie ist
       die Freigabe vor dem Bau; ohne diese Zeilen fiele sie in den Auffang
       unten und zeigte rohes JSON. Dass sie fehlte, konnte keine Probe sehen:
       der mitgelieferte Beispiel-Lauf hat nie ein Tor gefahren. */
    if (e.phase === "tor")
      return { marke: e.freigegeben ? "Freigegeben" : "Angehalten",
               knopf: e.freigegeben ? "gibt den Bau frei" : "hält den Bau an",
               text: e.grund || (e.freigegeben
                 ? "Freigegeben, ohne dass ein Grund genannt wurde."
                 : "Vor dem Bauen verworfen — ohne genannten Grund."),
               mehr: "" };
    /* Die drei Phasen der Rollen, die Klaus am 2026-09-05 dazugestellt hat.
       OHNE diese Zeilen fällt jede in den Auffang unten und zeigt rohes JSON —
       genau der Fehler, an dem Stens Arbeit einmal unsichtbar war. */
    if (e.phase === "schaerfung")
      return { marke: "Geschärft", knopf: "Bau- und Entwurfs-Sicht",
               text: e.schaerfung || "(nichts zu schärfen)",
               mehr: "Aus Bau-Sicht:\n" + ((e.ausBauSicht || []).map(function (x) {
                       return "· " + x; }).join("\n") || "(nichts)") +
                     "\n\nAus Entwurfs-Sicht:\n" + ((e.ausEntwurfsSicht || []).map(function (x) {
                       return "· " + x; }).join("\n") || "(nichts)") +
                     "\n\nPrüfmerkmal nachprüfbar: " + (e.pruefmerkmalTraegt ? "ja" : "NEIN") };
    if (e.phase === "gestaltung")
      return { marke: "Runde " + e.runde + " · Gestaltung (" + (e.befunde || []).length + ")",
               knopf: "Vergleiche",
               text: (e.befunde || []).map(function (b) {
                 return "· " + b.stelle + ": " + b.was; }).join("\n") || "nichts im Weg",
               /* Ob nachgesehen wurde, steht DABEI. Ein Vergleich, den niemand
                  anstellen konnte, sieht sonst aus wie keiner, den es braucht. */
               mehr: (e.konnteNachsehen
                 ? ((e.vergleiche || []).map(function (v) {
                     return "· " + v.woher + " — " + v.unterschied + " (besser: " + v.besser + ")";
                   }).join("\n") || "(nachgesehen, nichts Vergleichbares gefunden)")
                 : "Konnte nicht nachsehen — kein Netz-Werkzeug in dieser Schicht.") +
                 "\n\n" + (e.urteil || "") };
    if (e.phase === "nutzung")
      return { marke: "Runde " + e.runde + " · Nutzung" +
                      (e.durchgekommen ? " — durchgekommen" : " — steckengeblieben"),
               knopf: "der Weg",
               text: (e.haengengeblieben || []).map(function (h) {
                 return "· wollte " + h.wollte + " — " + h.passierte; }).join("\n") ||
                 "kam glatt durch",
               mehr: e.ablauf || "" };
    if (e.phase === "feierabend")
      return { marke: "Feierabend", knopf: "nächster Schritt",
               text: e.stand, mehr: "Nächster Schritt: " + (e.naechsterSchritt || "") };
    return { marke: e.phase, text: JSON.stringify(e), mehr: "" };
  }

  function zeichneReden() {
    var ziel = $("#reden"); leer(ziel);
    var raum2 = $("#runden"); leer(raum2);
    var raum3 = $("#gegen"); leer(raum3);
    var hatte2 = false;
    if (!achse.length) { ziel.appendChild(el("p", "leise", "Noch nichts.")); }
    achse.forEach(function (p, i) {
      var r = raumVon(p);
      var wo = r === 1 ? ziel : (r === 3 ? raum3 : raum2);
      if (r === 2) hatte2 = true;
      var t = redeText(p);
      var zeile = el("div", "rede" + (i < stand ? " da" : "") + (i === stand - 1 ? " jetzt" : ""));
      zeile.setAttribute("data-i", String(i));
      var wer = el("div", "wer");
      var nm = el("b", null, p.e.wer || "?");
      wer.appendChild(nm);
      wer.appendChild(el("span", null, (ROLLEN[p.e.rolle] || {}).kurz || p.e.rolle || ""));
      var blase = el("div", "blase");
      blase.style.setProperty("--rolle", "var(--r-" + p.e.rolle + ", var(--kante))");
      var kz = el("div", "kopfzeile");
      kz.appendChild(el("span", "marke-klein", t.marke));
      /*
       * Woher dieser Beitrag stammt — und zwar an JEDER Blase.
       *
       * Auf Klaus' Schirm standen am 2026-08-20 in Raum 3 der Feierabend eines
       * hinterlegten Trockenlaufs und eine echte Gegenpruefung untereinander,
       * ohne Unterschied. Wer das liest, haelt beides fuer denselben Lauf. Der
       * Hinweis oben am Pult nennt zwar die Beispiel-Teile, aber er steht weit
       * weg und man scrollt daran vorbei.
       */
      if (istBeispiel(p.quelle))
        /* Das Wort ist seit dem 2026-08-22 „mitgeliefert", nicht „Beispiel" —
           Klaus las „Beispiel" als „erfunden". Die KLASSE heißt weiter
           `beispiel-marke`: sie ist der Anker der Probe und steht in keinem
           sichtbaren Satz. */
        kz.appendChild(el("span", "beispiel-marke", "mitgeliefert"));
      kz.appendChild(el("span", "leise", msText(p.e.dauerMs || 0) + " · bei " + msText(p.ms)));
      blase.appendChild(kz);
      blase.appendChild(el("div", null, t.text || ""));
      /*
       * Der lange Text kommt hinter einen Knopf — Klaus' Wunsch vom 2026-08-20:
       * „die MD-Gesprächstexte sollen als Button zu öffnen sein". <details>
       * statt eigener Klick-Logik: Tastatur, Vorlese-Ansage und Aufklappen
       * bringt der Browser mit, und es funktioniert ohne Skript. Kurze Zusätze
       * bleiben offen — ein Knopf für zwei Wörter wäre mehr Arbeit als Nutzen.
       */
      if (t.mehr && t.mehr.trim()) {
        if (t.mehr.trim().length < 90) blase.appendChild(el("div", "leise", t.mehr));
        else {
          var d = el("details", "mehr");
          var z = t.mehr.trim().length;
          d.appendChild(el("summary", null, (t.knopf || "Begründung lesen") + " (" + z + " Zeichen)"));
          d.appendChild(el("div", "inhalt", t.mehr));
          blase.appendChild(d);
        }
      }
      zeile.appendChild(wer); zeile.appendChild(blase);
      wo.appendChild(zeile);
    });
    if (!hatte2)
      raum2.appendChild(el("p", "leise", "In dieser Betriebsart baut die Werkstatt nicht selbst — sie gibt den Plan heraus."));
    zeichneGegenKopf(raum3);
  }

  /** Der Kopf ueber den Reden der Gegenpruefung: Gegenstand und Ergebnis. */
  function zeichneGegenKopf(wo) {
    var g = daten.gegen;
    if (!g) { wo.appendChild(el("p", "leise", "Noch keine gelaufen.")); return; }
    var kopf = el("div", "hinweis");
    var z1 = el("p");
    z1.appendChild(el("b", null, g.ergebnis.bestanden ? "✓ Bestanden. " : "✗ Nicht bestanden. "));
    z1.appendChild(document.createTextNode(
      "Urteil: " + (g.ergebnis.urteil || "keins") +
      " · schwere Befunde: " + g.ergebnis.schwereBefunde +
      (g.art === "trocken" ? " · TROCKEN, nicht bezahlt" : "")));
    kopf.appendChild(z1);
    kopf.appendChild(el("p", "leise", "Geprüft wurde " + g.gegenstand.dateiname + " — " +
      (g.gegenstand.dateien || []).join(", ") + " (" + g.gegenstand.bytes + " Bytes)."));
    if (g.ergebnis.anKlaus)
      kopf.appendChild(el("p", null, "→ Das geht an den Betreiber, nicht in eine dritte Runde."));
    wo.insertBefore(kopf, wo.firstChild);
  }

  function zeichneTafel() {
    var t = $("#tafel"), koerper = el("tbody"); leer(t);
    var k = daten.konferenz;
    var tafel = (k && k.tafel) || (daten.lauf && daten.lauf.konferenz && daten.lauf.konferenz.tafel);
    if (!tafel || !tafel.length) {
      var z = el("tr"); z.appendChild(el("td", "leise", "Noch nichts.")); koerper.appendChild(z);
      t.appendChild(koerper); $("#eigenlob").textContent = ""; return;
    }
    var kopf = el("tr");
    ["Punkte", "Vorschlag", "von", "eigene Stimme"].forEach(function (h, i) {
      kopf.appendChild(el("th", i === 0 || i === 3 ? "zahl" : null, h));
    });
    koerper.appendChild(kopf);
    tafel.forEach(function (r) {
      var z = el("tr");
      z.appendChild(el("td", "zahl", String(r.punkte)));
      z.appendChild(el("td", null, r.titel));
      z.appendChild(el("td", null, r.von));
      z.appendChild(el("td", "zahl", r.eigenPunkte == null ? "–" : String(r.eigenPunkte)));
      koerper.appendChild(z);
    });
    t.appendChild(koerper);

    var el2 = (k && k.eigenlob) || (daten.lauf && daten.lauf.konferenz && daten.lauf.konferenz.eigenlob) || [];
    var mit = el2.filter(function (e) { return e.differenz !== null && e.differenz !== undefined; });
    $("#eigenlob").textContent = mit.length
      ? "Selbstbevorzugung im Schnitt: " +
        (mit.reduce(function (a, b) { return a + b.differenz; }, 0) / mit.length).toFixed(2).replace(".", ",") +
        " Punkte" + (mit.length < el2.length ? " (nicht alle messbar)" : "")
      : "Selbstbevorzugung: nicht messbar — es hat nicht jeder alle bewertet.";
  }

  // ── Zeichnen: Raum 2 + 3 ────────────────────────────────────────────────
  function zeichneAuftrag() {
    var ziel = $("#auftrag"); leer(ziel);
    var k = daten.konferenz, l = daten.lauf;
    var a = (k && k.auftrag) || (l && l.auftrag);
    if (!a) { ziel.appendChild(el("p", "leise", "Noch keiner.")); }
    else {
      ziel.appendChild(el("p", null, a.ziel));
      var pm = el("p", null); pm.appendChild(el("b", null, "Prüfmerkmal: "));
      pm.appendChild(document.createTextNode(a.pruefmerkmal || "—"));
      ziel.appendChild(pm);
      if (a.von) ziel.appendChild(el("p", "leise", "Vorgeschlagen von " + a.von + (a.sieger ? " („" + a.sieger + "\")" : "")));
      var b = (k && k.begruendung) || (l && l.konferenz && l.konferenz.begruendung);
      if (b) ziel.appendChild(el("p", "leise", b));
      var v = (k && k.verworfen) || (l && l.konferenz && l.konferenz.verworfen) || [];
      if (v.length) {
        ziel.appendChild(el("h3", null, "Was NICHT gebaut wird"));
        var u = el("ul");
        v.forEach(function (x) { u.appendChild(el("li", null, x)); });
        ziel.appendChild(u);
      }
    }
    if ((k && k.art === "trocken") || (l && l.art === "trocken")) {
      var w = el("p", "hinweis leise",
        "Trockenlauf: die Antworten stammen aus hinterlegten Beispielen, nicht aus einer echten Konferenz. Nicht bauen.");
      ziel.insertBefore(w, ziel.firstChild);
    }
  }

  /*
   * ══ ZUM MITNEHMEN ══════════════════════════════════════════════════════
   *
   * Klaus 2026-08-22 (1.7): „Ein Ergebnis ist wiederum nur in Textform
   * vorhanden. Nichts zum Kopieren, was ich mir herunterkopieren kann, um es
   * dir zu geben, damit du daraus etwas bauen kannst."
   *
   * Der Weg, den er beschreibt, ist der echte Arbeitsweg: Ergebnis heraus →
   * in eine Sitzung geben → daraus bauen → wieder hinein. Solange das nur am
   * Bildschirm steht, ist die Werkstatt eine Schaufensterpuppe.
   *
   * ⚠ KOPIEREN IST WICHTIGER ALS HERUNTERLADEN. Auf dem Tablet ist eine
   * heruntergeladene Datei drei Handgriffe von einem Chat entfernt; die
   * Zwischenablage ist null. Deshalb steht der Kopier-Knopf zuerst — und er
   * SAGT, ob es geklappt hat, statt still zu scheitern.
   */
  /*
   * ══ WARUM JEDE HERAUSGEGEBENE DATEI EINEN BOM BEKOMMT ═══════════════════
   *
   * Klaus am 2026-08-22, mit Bild: die heruntergeladene `plan-offen.md` stand
   * auf seinem Tablet als „Offener Plan â€" 2026-08-21", „AushÃ¤ngen",
   * „PrÃ¼fmerkmal". Nachgesehen, nicht vermutet: die Datei ist sauberes UTF-8
   * (`—` liegt als E2 80 94 darin, genau richtig). **Die Bytes waren nie
   * falsch.** Falsch war die Annahme, ein Betrachter erkenne das.
   *
   * Beim Herunterladen geht die Angabe `charset=utf-8` VERLOREN — sie steht im
   * MIME-Typ, und auf der Platte liegen nur Bytes. Androids Text-Betrachter
   * rät dann, und er rät Latin-1. Aus jedem Umlaut werden zwei Zeichen.
   *
   * Der BOM (U+FEFF) ist das eine Zeichen, an dem er es sicher erkennt. Er ist
   * kein Inhalt: er steht VOR dem Text und wird von jedem Betrachter, der ihn
   * versteht, nicht angezeigt.
   *
   * ⚠ ER GEHÖRT IN DIE DATEI, NICHT IN DIE ZWISCHENABLAGE. Wer den Text
   * kopiert und in einen Chat einfügt, bekäme sonst ein unsichtbares Zeichen
   * mit, das dort nichts zu suchen hat. Deshalb zwei Wege aus EINEM Text.
   */
  /*
   * ══ DER BUCHHALTUNGS-TRESOR ═════════════════════════════════════════════
   *
   * Klaus am 2026-08-22, nachdem seine Belege über die Pages-Seite öffentlich
   * lesbar waren: „Die Buchhaltung sollst Du verbergen, nicht rauslöschen …
   * mit 'nem verschlüsselten Code. Wir haben doch in der Buchhaltungs-App BLP
   * auch Schlüssel erzeugt im Repo, wo wir Dateien verstecken können. Warum
   * soll das jetzt nicht gehen?"
   *
   * ⚠ ER HAT RECHT, UND ICH HATTE ES ZU ENG GESAGT. Ich hatte geschrieben,
   * eine PIN schütze nichts. Das gilt fürs VERSTECKEN DER ANZEIGE: wer die
   * Adresse kennt, holt die JSON direkt und öffnet die Seite nie. Die DATEI zu
   * verschlüsseln ist etwas anderes — dann liegt im Depot ein Paket, das ohne
   * sein Passwort nutzlos ist, selbst wenn Pages es ausliefert.
   *
   * KOPIERT, NICHT ERFUNDEN. Das Fundament steht in
   * `BookLedgerPro/src/core/crypto.js` (adaptiert aus Mein-Tresor):
   * AES-GCM-256 mit PBKDF2-SHA256 und 600 000 Runden, selbstbeschreibendes
   * Paket `{ v, salt, iv, ct }` in base64url. Dieselben Zahlen, dasselbe
   * Format — ein zweiter Standard wäre eine zweite Fassung mit Ansage.
   *
   * ⚠ DREI DINGE, DIE NICHT VERHANDELBAR SIND:
   *
   * 1. **Das Passwort bleibt im Arbeitsspeicher.** Nicht in `localStorage`,
   *    nicht in `sessionStorage` — dort läge es im Klartext, und dann wäre die
   *    Verschlüsselung Zierde. Der Preis: bei jedem Laden einmal eingeben.
   * 2. **Der Klartext geht nie ins Depot.** Verschlüsselt wird IM BROWSER, von
   *    Klaus, mit seinem Passwort. Keine Sitzung sieht es.
   * 3. **Verlorenes Passwort heißt verlorene Daten.** Es gibt kein
   *    Zurücksetzen — das ist der Preis echter Verschlüsselung, nicht ein
   *    Mangel. Die Seite sagt es dort, wo das Passwort vergeben wird.
   */
  /* ⚠ DIE FASSUNG DES PAKETS — eine Zahl, EINE Stelle. Steht sie an zwei
     Orten, laufen sie auseinander, und dann schreibt der eine Weg `v: 1`,
     waehrend der andere nur `v: 2` annimmt. */
  var TRESOR_FASSUNG = 1;
  var TRESOR_RUNDEN = 600000;      /* vgl. BLP / Mein-Tresor / SBKIM-Backup */
  var TRESOR_SALZ_BYTES = 16;
  var TRESOR_IV_BYTES = 12;

  function tresorZufall(n) {
    var b = new Uint8Array(n);
    crypto.getRandomValues(b);
    return b;
  }
  function bytesZuB64u(bytes) {
    var bin = "", arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (var i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64uZuBytes(str) {
    var pad = str.length % 4 === 0 ? "" : new Array(5 - (str.length % 4)).join("=");
    var bin = atob(String(str).replace(/-/g, "+").replace(/_/g, "/") + pad);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  var tresorEnc = new TextEncoder(), tresorDec = new TextDecoder();

  function tresorSchluessel(passwort, salz) {
    return crypto.subtle
      .importKey("raw", tresorEnc.encode(passwort), "PBKDF2", false, ["deriveKey"])
      .then(function (basis) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: salz, iterations: TRESOR_RUNDEN, hash: "SHA-256" },
          basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      });
  }

  /** Klartext → selbstbeschreibendes Paket. Dasselbe Format wie BLP. */
  function tresorZu(passwort, klartext) {
    var salz = tresorZufall(TRESOR_SALZ_BYTES), iv = tresorZufall(TRESOR_IV_BYTES);
    return tresorSchluessel(passwort, salz).then(function (k) {
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, tresorEnc.encode(klartext));
    }).then(function (ct) {
      return { v: TRESOR_FASSUNG, salt: bytesZuB64u(salz), iv: bytesZuB64u(iv),
               ct: bytesZuB64u(new Uint8Array(ct)) };
    });
  }

  /**
   * Paket → Klartext. Falsches Passwort wirft — AES-GCM prüft mit.
   *
   * ⚠ ERST DIE FASSUNG, DANN DAS PASSWORT. Ohne diese Prüfung scheiterte ein
   * Paket aus einer künftigen Fassung an der Entschlüsselung, und die Seite
   * meldete „falsches Passwort" — Klaus hätte den Fehler bei sich gesucht und
   * ein richtiges Passwort immer wieder eingetippt. Eine Auskunft, die in die
   * falsche Richtung zeigt, ist teurer als gar keine.
   *
   * Der Fall kann heute nicht auftreten (es gibt nur `v: 1`). Genau deshalb
   * steht er hier: wer die Rundenzahl später erhöht, ändert die Fassung — und
   * bis dahin hat niemand mehr im Kopf, dass die Meldung dann lügt.
   */
  function tresorAuf(passwort, paket) {
    if (!istTresorForm(paket)) return Promise.reject(new Error("kein-paket"));
    if (paket.v !== TRESOR_FASSUNG) return Promise.reject(new Error("fassung"));
    return tresorSchluessel(passwort, b64uZuBytes(paket.salt)).then(function (k) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64uZuBytes(paket.iv) },
                                   k, b64uZuBytes(paket.ct));
    }).then(function (pt) { return tresorDec.decode(new Uint8Array(pt)); });
  }

  /* Ist das, was da liegt, ein Tresor-Paket? An der FORM erkannt, nicht am
     Dateinamen — wer die Datei umbenennt, soll trotzdem das Richtige sehen.

     ⚠ ZWEI FRAGEN, NICHT EINE. „Sieht aus wie ein Tresor-Paket" und „kann ich
     es öffnen" sind verschieden, und wer sie zusammenwirft, hat für ein Paket
     aus einer künftigen Fassung nur noch falsche Antworten: der Einlese-Weg
     hielte es für Klartext und meldete „darin steht weder eine Beleg- noch
     eine Zeiten-Liste". Das ist dieselbe irreführende Auskunft wie „falsches
     Passwort", nur an einer anderen Stelle. */
  function istTresorForm(d) {
    return !!(d && typeof d.v === "number" && typeof d.salt === "string" &&
              typeof d.iv === "string" && typeof d.ct === "string");
  }
  function istTresor(d) { return istTresorForm(d) && d.v === TRESOR_FASSUNG; }



  /* ══ WO DIE ZAHLEN WOHNEN ═══════════════════════════════════════════════
   *
   * Klaus am 2026-08-22, nach dem Blick in sein Rezeptbuch: „Diese JSON
   * Dateien … werden in einem ganz tiefen Speicher vom Browser gelegt, der
   * nicht gelöscht werden kann … Es ist tausendmal einfacher."
   *
   * ⚠ ER HAT DAS BESSERE PROBLEM GELÖST. Sein Schaden war nicht „jemand sitzt
   * an meinem Tablet", sondern: **die Datei lag im Depot, und Pages hat sie
   * ausgeliefert.** Dagegen hilft Verschlüsseln — aber es hilft besser, sie
   * gar nicht erst ins Depot zu legen. Genau das macht das Rezeptbuch.
   *
   * KOPIERT, NICHT ERFUNDEN: die Schicht darunter ist
   * `Mein-Rezeptbuch/QC_MeinRezb_*.html` § INDEXEDDB BACKUP LAYER —
   * `indexedDB.open(name, 1)`, ein Store `kv` mit `keyPath: "k"`, dazu
   * `navigator.storage.persist()`. Nachgesehen und nachgemessen, nicht
   * abgeschrieben: dort steht **keine** Verschlüsselung (gesucht nach
   * `crypto.subtle`, `AES-GCM`, `PBKDF2` — null Treffer). Sein Tresor schützt
   * gegen **Verlust**, nicht gegen Mitlesen. Beides ist nötig, aber für
   * verschiedene Aufgaben:
   *
   *   IndexedDB + persist()  →  der WOHNORT. Nichts im Depot, also nichts
   *                             über Pages zu holen. Kein Passwort im Alltag.
   *   Tresor-Paket           →  der AUSGANG. Sicherung, Umzug, Weitergabe.
   *
   * ⚠ DER PREIS, DEN KLAUS KENNT: IndexedDB hängt am Browser. Wer die
   * Browserdaten löscht oder das Gerät wechselt, hat die Zahlen verloren.
   * Deshalb ist die verschlüsselte Sicherung dann kein Luxus, sondern der
   * Rückweg — und deshalb sagt die Seite, wann zuletzt eine gemacht wurde.
   *
   * Der Name trägt „Kimhub", weil `github.io` eine GETEILTE Adresse ist: eine
   * Schwester-App mit derselben Datenbank überschriebe uns. Dieselbe Regel wie
   * der DB-Suffix in den SBKIM-Apps, nur ohne deren Modul.
   */
  /* ⚠ DIE ROHE SCHICHT STEHT SEIT DEM 2026-09-05 NICHT MEHR HIER, SONDERN IN
   * `idb.js` AN DER WURZEL — gezogen, nicht kopiert. Seit die Schicht im
   * Browser laufen soll, braucht das Gedächtnis der Spinde dieselbe Ablage;
   * eine zweite Fassung daneben wäre eine Drift-Quelle mit Ansage gewesen,
   * und der Brief verbietet sie ausdrücklich. Die Namen unten bleiben, damit
   * die 30 Aufrufstellen in dieser Datei nichts davon merken.
   *
   * ⚠ ABGEBROCHEN STATT HALB WEITERGEMACHT: fehlt das Global, gibt es keinen
   * Wohnort für die Zahlen. Eine Ablage, die stillschweigend nichts ablegt,
   * sähe beim ersten Besuch genauso aus wie eine leere — und beim zweiten
   * wären die Zahlen weg. */
  if (!window.WERKSTATT_IDB) throw new Error(
    "idb.js hat sich nicht ans Global gehängt — ohne ihn gibt es keinen " +
    "Wohnort für die Zahlen, und ein Verlust sähe aus wie ein leerer Browser.");
  /* ⚠ DER NAME IST DIE GRENZE ZUR SCHWESTER-APP, UND SEIT DEM 2026-09-05 GIBT
     ES EINE. `lausiklauskn-png.github.io` ist EINE Adresse: Werkstatt und
     Kim Hub Company liegen darauf nebeneinander, und IndexedDB gehört dem
     Ursprung, nicht der App. Ohne diese Zeile schriebe Company in Klaus'
     Buchhaltung — genau die Kollision, gegen die netzweit der DB-Suffix steht.
     Der Vorgabewert bleibt, was er war: wer nichts setzt, merkt nichts. */
  var IDB_NAME = window.__WERKSTATT_DB || "KimhubBuchhaltung1";
  var idbFach = window.WERKSTATT_IDB.macheIdb({ name: IDB_NAME });
  var idbLies = idbFach.lies, idbSchreib = idbFach.schreib, idbLoesch = idbFach.loesch;

  /*
   * Der „tiefe Speicher". Ohne das räumt der Browser bei Speicherdruck
   * stillschweigend auf — und die Zahlen wären weg, ohne dass jemand etwas
   * gelöscht hätte.
   *
   * ⚠ ERST FRAGEN, WENN ES ETWAS ZU SCHÜTZEN GIBT. Das Rezeptbuch macht es
   * genauso (`if (R.some(...)) _initPersistentStorage()`): eine leere App, die
   * dauerhaften Speicher verlangt, fragt nach etwas, das sie nicht braucht.
   */
  /* Auch diese beiden stehen jetzt in `idb.js` — sie gehören zum selben
     Speicher und liefen sonst in zwei Fassungen auseinander. Die Namen
     bleiben, aus demselben Grund wie oben. */
  var speicherDauerhaft = window.WERKSTATT_IDB.dauerhaft;
  var speicherLage = window.WERKSTATT_IDB.lage;

  var BH_SCHLUESSEL = { belege: "bh_belege", zeiten: "bh_zeiten" };
  var BH_SICHERUNG = "bh_letzte_sicherung";
  /* Das Verzeichnis dessen, was die Seite herausgegeben hat. Nicht die Dateien
     selbst — die liegen im Download-Ordner, und dahin sieht kein Browser. */
  var BH_JOURNAL = "bh_sicherungen";
  var SICHERUNGEN_MAX = 12;

  /* ══ DER CHEF-CODE ══════════════════════════════════════════════════════
   *
   * Klaus' Wunsch von Anfang an: „ein Passwort für den Mitarbeiter, also für
   * Zeiterfassung, und dann Chef Passwort." Das ist ein Schloss vor der
   * ANSICHT — die andere Hälfte zum Tresor, der die DATEI verschließt.
   *
   * ⚠ ER IST KEINE VERSCHLÜSSELUNG, UND DAS STEHT AUF DER SEITE. Die Zahlen
   * liegen weiter offen in IndexedDB; wer die Entwickler-Werkzeuge öffnet,
   * liest sie. Was er wirklich leistet: er nimmt sie aus dem Blick von jemandem,
   * der das Tablet in die Hand nimmt. Genau dafür hat Klaus ihn bestellt.
   *
   * ⚠ WARUM DANN ÜBERHAUPT PBKDF2? Weil der Code selbst nirgends stehen darf.
   * Läge er im Klartext im Speicher, wäre er beim ersten Blick dorthin zu lesen
   * — und Klaus benutzt seine Passwörter nicht nur hier. Gespeichert wird ein
   * Abdruck, aus dem sich der Code nicht zurückrechnen lässt. Dieselbe
   * Rundenzahl wie der Tresor, dieselbe Begründung.
   *
   * ⚠ KEIN ZURÜCKSETZEN. Ein Knopf, der den Code von innen löscht, nähme ihm
   * jede Wirkung: wer die Zahlen nicht sehen soll, drückte einfach ihn. Der Weg
   * zurück ist die verschlüsselte Sicherung in einem frischen Browser. Das
   * steht auf der Karte, damit niemand es erst im Ernstfall erfährt.
   */
  var CHEF_SCHLUESSEL = "chef_code";
  var CHEF_FASSUNG = 1;
  var chefOffen = false;      /* nur im Arbeitsspeicher, wie tresorPass */
  var chefStand = null;       /* der geladene Abdruck, oder null */

  function chefAbdruck(code, salz) {
    return crypto.subtle
      .importKey("raw", tresorEnc.encode(code), "PBKDF2", false, ["deriveBits"])
      .then(function (basis) {
        return crypto.subtle.deriveBits(
          { name: "PBKDF2", salt: salz, iterations: TRESOR_RUNDEN, hash: "SHA-256" },
          basis, 256);
      })
      .then(function (bits) { return bytesZuB64u(new Uint8Array(bits)); });
  }

  function chefLaden() {
    return idbLies(CHEF_SCHLUESSEL).then(function (roh) {
      if (!roh) { chefStand = null; return null; }
      try { chefStand = JSON.parse(roh); } catch (e) { chefStand = null; }
      return chefStand;
    });
  }

  function chefSetzen(code) {
    var salz = tresorZufall(TRESOR_SALZ_BYTES);
    return chefAbdruck(code, salz).then(function (ab) {
      var stand = { v: CHEF_FASSUNG, salt: bytesZuB64u(salz), abdruck: ab };
      return idbSchreib(CHEF_SCHLUESSEL, JSON.stringify(stand))
        .then(speicherDauerhaft)
        .then(function () { chefStand = stand; chefOffen = true; return true; });
    });
  }

  /* Gibt JA/NEIN heraus, niemals den Code — derselbe Grundsatz wie `hatPass`
     beim Tresor: ein Test-Haken, der ein Geheimnis herausreicht, ist ein Loch
     mit Prüfsiegel. */
  function chefPruefen(code) {
    if (!chefStand) return Promise.resolve(false);
    return chefAbdruck(code, b64uZuBytes(chefStand.salt)).then(function (ab) {
      return ab === chefStand.abdruck;
    }, function () { return false; });
  }

  /* Zeigt oder verbirgt, was Geld trägt. ⚠ Die STECHUHR steht bewusst nicht in
     dieser Liste: „Stechuhr für alle, Zahlen nur für mich" war die Vorgabe. */
  function chefZeichnen() {
    var kasten = $("#chef");
    var zu = !!(chefStand && !chefOffen);
    Array.prototype.forEach.call(document.querySelectorAll("[data-chef=\"geld\"]"),
      function (n) { n.hidden = zu; });
    /* ⚠ UND DAS GEGENSTUECK. Was NUR bei gesetztem Code dastehen soll — der
       Satz, warum das Gesamt-Blatt gerade nicht herausgegeben wird — braucht
       dieselbe Mechanik. Es an den BAUZEITPUNKT zu haengen ging schief: die
       Karte entsteht, bevor `chefLaden()` durch ist. Ein Riegel gehoert an
       das Element, nicht an die Reihenfolge. */
    Array.prototype.forEach.call(document.querySelectorAll("[data-chef=\"nur-zu\"]"),
      function (n) { n.hidden = !zu; });
    if (!kasten) return;
    var lage = !chefStand ? "aus" : chefOffen ? "offen" : "zu";
    kasten.setAttribute("data-chef-lage", lage);
    var teile = { aus: $("#chef-aus"), zu: $("#chef-zu"), offen: $("#chef-offen") };
    Object.keys(teile).forEach(function (k) {
      if (teile[k]) teile[k].hidden = k !== lage;
    });
    /* ⚠ DER AENDERN-BLOCK GEHOERT NICHT IN DIE DREI ZUSTAENDE, sondern quer
       dazu: er steht in „zu" UND in „offen", denn wer den alten Code kennt,
       darf ihn wechseln — ob die Zahlen gerade sichtbar sind oder nicht.
       In „aus" gibt es nichts zu aendern. */
    var aend = $("#chef-aendern");
    if (aend) {
      aend.hidden = !chefStand;
      aend.setAttribute("data-chef-aendern", chefStand ? lage : "");
    }
  }

  /*
   * ⚠ WAS VERBORGEN IST, DARF AUCH NICHT HERAUSGEGEBEN WERDEN (Klaus
   * 2026-09-08): „geld zahlen kann man unten auch lesen, wenn der Chef den
   * Code nicht eingegeben hat".
   *
   * Er hat recht, und der Grund war eine Bauart-Luecke: der Riegel hing
   * ausschliesslich an `data-chef="geld"` im DOKUMENT. Damit traf er weder
   * die Tabellenzellen, die das Glue SPAETER baut (die Monats-Betraege und
   * die Kosten-Zeile im Gesamt-Blatt), noch den Text, den die
   * Mitnehm-Knoepfe herausgeben. Zwei Wege zum selben Geld, einer bewacht.
   */
  function geldVerborgen() { return !!(chefStand && !chefOffen); }

  function chefSagen(text, marke) {
    var w = $("#chef-lage");
    if (!w) return;
    w.textContent = text;
    w.setAttribute("data-chef-sagt", marke);
  }

  /*
   * DIE LADEKETTE, in dieser Reihenfolge — jede Stufe hat einen Grund:
   *
   *   1. Browser-Speicher   der Wohnort. Was hier liegt, gewinnt.
   *   2. offene Datei       nur beim ERSTEN Mal: sie zieht ein und wird
   *                         danach nicht mehr gebraucht.
   *   3. Tresor-Paket       verschlossen; nach dem Aufschließen zieht es ein.
   *   4. Beispiel           damit die Seite nicht leer dasteht.
   *
   * ⚠ STUFE 2 IST EIN UMZUG, KEINE KOPIE-BEZIEHUNG. Wer die Datei danach im
   * Ordner ändert, sieht nichts davon — sie wird nicht mehr gelesen. Deshalb
   * sagt die Seite, woher die Zahlen kommen, statt es zu verschweigen.
   */
  function holeBuchhaltung(name, pfad) {
    return idbLies(BH_SCHLUESSEL[name]).then(function (roh) {
      if (roh) {
        try {
          var o = JSON.parse(roh);
          if (o) return { klar: o, wo: "browser" };
        } catch (e) { /* kaputt gespeichert — dann die Datei versuchen */ }
      }
      return holeTresor(pfad).then(function (f) {
        if (!f) return null;
        if (f.klar && !f.klar._ausBeispiel) {
          idbSchreib(BH_SCHLUESSEL[name], JSON.stringify(f.klar))
            .then(speicherDauerhaft).catch(function () { /* fail-soft */ });
          return { klar: f.klar, wo: "eingezogen" };
        }
        if (f.klar) return { klar: f.klar, wo: "beispiel" };
        return { tresor: f.tresor, wo: "paket" };
      });
    });
  }

  /* ── Der Zustand des Tresors ────────────────────────────────────────────
   *
   * ⚠ `tresorPass` LIEGT IM ARBEITSSPEICHER UND NIRGENDS SONST. Nicht in
   * `localStorage`, nicht in `sessionStorage` — dort staende es im Klartext,
   * und die Verschluesselung waere Zierde: wer die Datei lesen koennte, koennte
   * dann auch das Passwort lesen. Der Preis ist eine Eingabe je Besuch. Das ist
   * derselbe Handel, den BookLedgerPro macht ("Sitzungs-Key nur im RAM").
   */
  var tresorPass = null;
  var verschlossen = {};

  /* Nimmt entgegen, was `holeTresor()` gefunden hat. Klartext geht durch,
     ein Paket wird gemerkt und die Anzeige bleibt leer — bis aufgeschlossen. */
  var woher = {};
  function tresorEinsortieren(name, fund) {
    delete verschlossen[name];
    delete woher[name];
    if (!fund) return null;
    woher[name] = fund.wo || "datei";
    if (fund.klar) return fund.klar;
    if (fund.tresor) { verschlossen[name] = fund.tresor; return null; }
    return null;
  }

  function tresorGesperrt() { return Object.keys(verschlossen); }

  /*
   * Aufschliessen — JEDE DATEI FUER SICH, nicht alles oder nichts.
   *
   * Klaus will sein Passwort "von Zeit zu Zeit" wechseln. Dann liegt fuer eine
   * Weile eine Datei im alten und eine im neuen Stand da. "Alles oder nichts"
   * zeigte in diesem Fall gar nichts und sagte nicht, welche der beiden klemmt
   * — man suchte den Fehler beim Passwort statt bei der Datei.
   */
  function tresorOeffnen(pass) {
    var namen = tresorGesperrt(), auf = [], zu = [], fassung = [];
    if (!namen.length)
      return Promise.resolve({ auf: auf, zu: zu, fassung: fassung, nichts: true });
    return Promise.all(namen.map(function (n) {
      return tresorAuf(pass, verschlossen[n]).then(function (klartext) {
        var obj = JSON.parse(klartext);
        daten[n] = obj; delete verschlossen[n]; auf.push(n);
        /* ⚠ EINMAL AUFSCHLIESSEN, DANN WOHNT ES IM BROWSER. Sonst müsste Klaus
           das Passwort bei jedem Besuch tippen, obwohl er es längst bewiesen
           hat — und ein Passwort, das man ständig tippt, tippt man irgendwann
           an der falschen Stelle. Der Schutz galt dem Depot, nicht dem Gerät. */
        woher[n] = "aufgeschlossen";
        idbSchreib(BH_SCHLUESSEL[n], JSON.stringify(obj))
          .then(speicherDauerhaft).catch(function () { /* fail-soft */ });
      }, function (fehler) {
        zu.push(n);
        /* ⚠ DEN GRUND NICHT WEGWERFEN. Hier stand `function () {}` — jeder
           Fehlschlag wurde dadurch zu „anderes Passwort", auch der, bei dem
           das Passwort stimmt. */
        if (String(fehler && fehler.message) === "fassung") fassung.push(n);
      });
    })).then(function () {
      if (auf.length) tresorPass = pass;
      return { auf: auf, zu: zu, fassung: fassung, nichts: false };
    });
  }

  /* Die Zeile, die statt der Tabelle steht, wenn zugeschlossen ist. Sie sagt,
     WAS los ist — "fehlt" waere hier die falsche Auskunft und schickte Klaus
     los, eine Datei zu suchen, die genau da liegt, wo sie hingehoert. */
  function tresorZeile(tabelle, name) {
    var koerper = el("tbody"), z = el("tr"), d = el("td", "fehlt leise",
      "🔒 Verschlossen. Das Paket liegt im Depot und ist ohne Passwort nutzlos. "
      + "Unten aufschliessen.");
    d.setAttribute("data-tresor", name);
    z.appendChild(d); koerper.appendChild(z); tabelle.appendChild(koerper);
  }

  function tresorLage(text, marke) {
    var w = $("#tresor-lage");
    if (!w) return;
    w.textContent = text;
    w.setAttribute("data-tresor-lage", marke);
  }

  var WOHER_TEXT = {
    browser:        "im Speicher dieses Browsers",
    eingezogen:     "im Speicher dieses Browsers — gerade aus der offenen Datei eingezogen",
    aufgeschlossen: "im Speicher dieses Browsers — gerade aus der Sicherung aufgeschlossen",
    eingelesen:     "im Speicher dieses Browsers — gerade eingelesen",
    paket:          "verschlossen; noch nicht aufgeschlossen",
    beispiel:       "mitgeliefertes Beispiel — von diesem Gerät ist nichts da",
    datei:          "in einer offenen Datei im Ordner",
  };

  /*
   * ⚠ „DAUERHAFT" IST EINE ZUSICHERUNG DES BROWSERS, KEINE VON UNS. Er kann
   * sie verweigern, und dann räumt er bei Speicherdruck irgendwann auf. Wer
   * hier „geschützt" schriebe, ohne gefragt zu haben, verspräche etwas, das
   * er nicht halten kann — deshalb wird `persisted()` wirklich gelesen und das
   * Ergebnis hingeschrieben, auch das schlechte. Genau wie im Rezeptbuch
   * (`bvStoreProt` / `bvStoreUnprot`).
   */
  /*
   * Die Liste der angelegten Sicherungen — Vorbild ist der Backup-Tresor in
   * Mein Rezeptbuch (Klaus 2026-09-08: "im Prinzip ist der Tresor von KHC der
   * Gleiche wie in Mein Rezeptbuch nur sehr umstaendlich"). Dort steht jede
   * Sicherung mit Datum und "52 Rezepte" da, und genau daran sieht man, dass
   * etwas passiert ist.
   *
   * ⚠ DER UNTERSCHIED, DER BENANNT WERDEN MUSS: Rezeptbuch listet Sicherungen,
   * die IM BROWSER liegen und sich zurueckholen lassen. Diese hier liegen im
   * Download-Ordner, und dahin sieht kein Browser. Die Liste sagt deshalb
   * "das wurde herausgegeben", nicht "diese Datei liegt dort" — sonst waere
   * sie eine Auskunft, die sie nicht geben kann.
   */
  function zeichneSicherungen(liste) {
    var z = $("#tresor-sicherungen");
    if (!z) return;                            // alte Seite im Vorrat
    var l = Array.isArray(liste) ? liste : [];
    leer(z);
    z.setAttribute("data-sicherungen", String(l.length));
    if (!l.length) {
      /*
       * ⚠ ZWEI AUSKUENFTE, DIE SICH WIDERSPRECHEN (gefunden an Klaus' Seite,
       * 2026-09-08). Hier stand "noch keine Sicherung angelegt" — und eine
       * Zeile darunter "Letzte Sicherung: 2026-09-08 11:27". Beides stimmt:
       * das Datum wird seit langem gefuehrt, die LISTE erst seit heute. Aber
       * wer das nicht weiss, liest einen Fehler.
       */
      idbLies(BH_SICHERUNG).then(function (letzte) {
        z.appendChild(el("p", "leise fehlt", letzte
          ? "In dieser Liste steht noch nichts — sie wird erst seit dem "
            + "2026-09-08 gefuehrt. Die letzte Sicherung war am " + letzte
            + "; sie ist deshalb hier nicht aufgeführt."
          : "Noch keine Sicherung angelegt. Der Knopf darüber legt eine an."));
      }).catch(function () {
        z.appendChild(el("p", "leise fehlt",
          "Noch keine Sicherung angelegt. Der Knopf darüber legt eine an."));
      });
      return;
    }
    l.forEach(function (e) {
      var r = el("div", "sich-zeile");
      var d = new Date(e.wann);
      var wann = isNaN(d.getTime()) ? "?" : d.toLocaleString("de-DE",
        { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      var kopf = el("div", null, wann + "  ·  " + (e.inhalt || "Inhalt nicht gezaehlt"));
      kopf.appendChild(el("span", e.art === "offen" ? "warn" : "gut",
        e.art === "offen" ? "  offen" : "  🔒 verschlossen"));
      r.appendChild(kopf);
      var n = el("div", "leise mono", e.datei || "");
      r.appendChild(n);
      z.appendChild(r);
    });
  }

  /*
   * DER SPEICHERBALKEN (Klaus 2026-09-08): „und den Speichernutzungs balken wo
   * steht dauerhaft gesichert, der zeigt den Browserspeicher an."
   *
   * ⚠ ER ZEIGT, WAS DER BROWSER SAGT — `navigator.storage.estimate()`, nicht
   * unsere Schaetzung. Aeltere Fassungen kennen `estimate` nicht; dann steht
   * das da, statt einer erfundenen Null. Eine geratene Zahl klingt genau wie
   * eine gemessene.
   *
   * ⚠ UND `frei` IST EIN KONTINGENT, KEIN PLATZ AUF DER PLATTE. Der Browser
   * nennt dort, was er dieser Adresse zugesteht — auf einem halbleeren Geraet
   * kann das klein sein und auf einem vollen gross. Deshalb steht der Prozent
   * neben den Zahlen und nicht allein: 90 % von 60 MB ist etwas anderes als
   * 90 % von 6 GB.
   */
  function mib(n) {
    var m = n / 1048576;
    return (m >= 10 ? Math.round(m) : Math.round(m * 10) / 10) + " MB";
  }
  function speicherBalken(lage) {
    var kasten = $("#tresor-speicher");
    if (!kasten) return;
    var hat = typeof lage.benutzt === "number" && typeof lage.frei === "number"
      && lage.frei > 0;
    var teil = hat ? Math.min(100, Math.round(lage.benutzt / lage.frei * 100)) : 0;
    kasten.setAttribute("data-speicher", hat ? String(teil) : "unbekannt");
    var f = $("#tresor-sp-fuellung");
    if (f) {
      f.style.width = teil + "%";
      /* Die Farben kommen aus den Marken, nicht als feste Werte — wer das
         Thema wechselt, bekommt sie mit. */
      f.style.background = teil >= 90 ? "var(--rot)"
        : (teil >= 70 ? "var(--warn)" : "var(--gut)");
    }
    var m = $("#tresor-sp-mass");
    if (m) m.textContent = hat
      ? mib(lage.benutzt) + " / " + mib(lage.frei) + "  (" + teil + " %)"
      : "Dieser Browser nennt seinen Füllstand nicht.";
    var u = $("#tresor-sp-urteil");
    if (u) {
      /* ⚠ BEIDE ANTWORTEN SIND ERLAUBT, KEINE IST GERATEN. „Dauerhaft" ist
         eine Zusicherung des BROWSERS; wer sie schreibt, ohne gefragt zu
         haben, beruhigt ueber etwas, das er nicht halten kann. */
      u.textContent = lage.dauerhaft
        ? "🔒 Dauerhaft gesichert"
        : "⚠ KEINE Dauerhaftigkeit zugesagt — sichere regelmäßig";
      u.style.color = lage.dauerhaft ? "var(--gut)" : "var(--warn)";
      u.setAttribute("data-sp-urteil", lage.dauerhaft ? "dauerhaft" : "nicht");
    }
  }

  function tresorWoZeichnen() {
    var w = $("#tresor-wo");
    if (!w) return;
    var namen = ["belege", "zeiten"], teile = [], quellen = {};
    namen.forEach(function (n) {
      var q = verschlossen[n] ? "paket" : (woher[n] || null);
      if (q) quellen[q] = (quellen[q] || []).concat(n);
    });
    Object.keys(quellen).forEach(function (q) {
      teile.push(quellen[q].join(" + ") + ": " + (WOHER_TEXT[q] || q));
    });
    w.setAttribute("data-wo", Object.keys(quellen).sort().join(",") || "nichts");
    speicherLage().then(function (lage) {
      w.setAttribute("data-dauerhaft", lage.dauerhaft ? "ja" : "nein");
      /* ⚠ BEFUND A: HIER STAND „noch nichts geladen" — UND SONST NICHTS.
         Das ist wahr und trotzdem eine Sackgasse: es sagt, was fehlt, aber
         nicht, was man tun kann. Klaus stand damit im DeX-Chrome, während
         seine Zahlen im Tablet-Chrome lagen; die Seite hat ihm nicht gesagt,
         dass das der Grund ist, und nicht, wo der Weg zurück liegt.
         Der Weg selbst wird unten aufgeklappt (`#tresor-rueckweg`) — hier
         steht nur der Grund, damit der Satz kurz bleibt. */
      var leer = teile.length === 0;
      var satz = leer
        ? "noch nichts geladen — der Speicher gehört diesem einen Browser"
        : teile.join(" · ");
      /* ⚠ EINE MARKE, KEIN WORT. Der erste Wächter dazu suchte „Browser" im
         Satz — und war blind: der Dauerhaftigkeits-Satz daneben trägt dasselbe
         Wort, also wäre er auch ohne den Grund grün gewesen. Bewacht wird die
         Aussage „im Leerzustand steht der Grund dabei", nicht ihr Wortlaut. */
      w.setAttribute("data-wo-grund", leer ? "einzelner-browser" : "");
      speicherBalken(lage);
      var rueck = $("#tresor-rueckweg");
      if (rueck) {
        rueck.hidden = !leer;
        rueck.setAttribute("data-rueckweg", leer ? "noetig" : "unnoetig");
      }
      /* ⚠ DER DAUERHAFTIGKEITS-SATZ STAND BIS ZUM 2026-09-08 HIER — jetzt
         steht er im Speicherbalken darueber (`#tresor-sp-urteil`). Die
         Zusicherung ist NICHT gefallen, sie ist umgezogen: der Browser wird
         weiter gefragt (`data-dauerhaft` unten), und seine Antwort steht
         weiter da. Zweimal denselben Satz zu schreiben waere genau der
         Erklaertext, den Klaus beanstandet hat. */
      var sich = $("#tresor-sicherung");
      if (sich) idbLies(BH_SICHERUNG).then(function (d) {
        sich.textContent = d
          ? "Letzte Sicherung: " + d
          : "Noch nie gesichert — und der Browser-Speicher ist der einzige Ort.";
        sich.setAttribute("data-sicherung", d ? "ja" : "nie");
      });
      w.textContent = satz;
    });
  }

  function tresorZeichnen() {
    var kasten = $("#tresor"), n = tresorGesperrt().length;
    tresorWoZeichnen();
    /* Die Liste ueberlebt das Neuladen — sie liegt neben den Zahlen im
       Browser-Speicher. Ohne das waere sie nach jedem Besuch leer, und genau
       dann braucht man sie: "habe ich das schon gesichert?" */
    idbLies(BH_JOURNAL).then(zeichneSicherungen)
      .catch(function () { zeichneSicherungen([]); });
    if (!kasten) return;
    kasten.setAttribute("data-tresor-zu", String(n));
    var auf = $("#tresor-auf-block");
    if (auf) auf.hidden = n === 0;
    var frei = $("#tresor-offen");
    if (frei) {
      frei.hidden = !(n === 0 && tresorPass);
    }
  }

  /*
   * DAS WERKZEUG — verschluesseln UND Passwort wechseln in EINEM Weg.
   *
   * Die gewaehlte Datei entscheidet, was passiert: ist sie Klartext, wird sie
   * verschlossen; ist sie schon ein Paket, wird sie mit dem alten Passwort
   * geoeffnet und mit dem neuen wieder zugemacht. Zwei getrennte Knoepfe waeren
   * zwei Wege, die auseinanderlaufen — und der zweite ("Passwort aendern")
   * haette vom Zustand der Seite abgehangen statt von der Datei in der Hand.
   *
   * ⚠ ES PASSIERT ALLES IM BROWSER. Kein Klartext geht ins Netz, kein Passwort
   * verlaesst dieses Geraet, und keine Sitzung sieht es je.
   */
  function tresorSchliessen(datei, altPass, neuPass) {
    return datei.text().then(function (roh) {
      var obj = JSON.parse(roh);
      if (!istTresor(obj)) return JSON.stringify(obj, null, 2);
      if (!altPass) throw new Error("alt-fehlt");
      return tresorAuf(altPass, obj);
    }).then(function (klartext) {
      JSON.parse(klartext);          /* prueft, dass drin steht, was wir glauben */
      return tresorZu(neuPass, klartext);
    });
  }

  var BOM = "\uFEFF";
  function alsDatei(text, typ) {
    /* Nicht bei HTML: das oeffnet der Browser selbst und liest den MIME-Typ —
       dort waere der BOM ein Zeichen zu viel im Dokument.
       ⚠ UND NICHT BEI JSON. `JSON.parse` bricht an einem BOM ab — eine Datei,
       die aussieht wie Daten und beim Oeffnen scheitert. Dieselbe Lehre wie
       beim Tresor-Paket am 2026-08-22; der BOM ist fuer MENSCHEN da, die eine
       Textdatei auf dem Tablet oeffnen, nicht fuer einen Parser. */
    return /html|json/i.test(String(typ || "")) ? text : BOM + text;
  }

  function mitnehmKnoepfe(wo, name, text, typ) {
    var reihe = el("div", "mitnehmen");

    var kop = el("button", null, "⧉ Text kopieren");
    kop.type = "button";
    var lage = el("span", "leise mitnehm-lage");
    lage.setAttribute("data-kopiert", "");
    kop.addEventListener("click", function () {
      var fertig = function (wort, marke) {
        lage.textContent = wort;
        lage.setAttribute("data-kopiert", marke);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { fertig(text.length + " Zeichen kopiert.", "ja"); },
          /* KEIN stiller Fehlschlag: die Zwischenablage verweigert sich in
             manchen Browsern ohne sichtbaren Grund. Dann steht der Grund da
             und der Download daneben. */
          function (e) { fertig("Kopieren ging nicht (" + (e && e.name || "?") +
            ") — nimm den Download daneben.", "nein"); });
      } else {
        fertig("Dieser Browser gibt die Zwischenablage nicht her — nimm den Download.", "nein");
      }
    });
    reihe.appendChild(kop);

    var lad = el("a", "ergebnis-knopf", "⭳ " + name);
    try {
      lad.href = URL.createObjectURL(new Blob([alsDatei(text, typ)],
        { type: (typ || "text/plain") + ";charset=utf-8" }));
      lad.setAttribute("download", name);
    } catch (e) {
      lad.removeAttribute("href");
      lad.textContent = "Download geht hier nicht (" + e.message + ")";
    }
    reihe.appendChild(lad);

    /* Vorlesen (1.4) — dieselbe Fassung wie an der Bühne, nicht eine zweite. */
    if (window.KimhubBuehne && window.KimhubBuehne.vorleseKnopf)
      reihe.appendChild(window.KimhubBuehne.vorleseKnopf(function () { return text; }));

    reihe.appendChild(lage);
    wo.appendChild(reihe);
    return reihe;
  }

  /*
   * ══ MARKDOWN LESBAR ZEIGEN ══════════════════════════════════════════════
   *
   * Klaus am 2026-08-22, nach dem Sichttest: „Textdateien und MD-Dateien sind
   * nicht lesbar, weil sie noch als Code zu sehen sind." Auf dem Bild steht im
   * Raum 2 wörtlich `# Offener Plan`, `## Auftrag`, `**Trockenlauf.**`.
   *
   * ⚠ ICH HATTE MICH DAGEGEN ENTSCHIEDEN — und die Begründung war halb
   * richtig. Sie stand im README: „ein zweiter Renderer wäre eine zweite
   * Fassung desselben Blattes, und dann stünde auf dem Schirm etwas anderes
   * als in der Datei, die heruntergeladen wird."
   *
   * Die Gefahr ist echt, die Schlussfolgerung war es nicht. Eine ANSICHT ist
   * keine zweite Fassung — eine zweite QUELLE wäre eine. Der Fehler wäre ein
   * Renderer, der etwas verschluckt. Also: gerendert wird zum Lesen, die Datei
   * bleibt die Datei, und die Probe misst genau das — **jede Zeile der Datei
   * muss in der Anzeige wiederzufinden sein**, nur ohne die Auszeichnung.
   * (Tafel-Evolutions-Klausel: eine Tafel gilt, bis eine neuere Erkenntnis sie
   * widerlegt. Klaus' Sichttest ist die neuere Erkenntnis.)
   *
   * KEIN innerHTML. Gebaut werden Knoten, nie Zeichenketten — ein Blatt kommt
   * aus einem Modell-Lauf, und was ein Modell schreibt, ist Eingabe, kein Code.
   * Ein `innerHTML` hier wäre die Tür, durch die eine Konferenz ihre eigene
   * Oberfläche umbauen könnte.
   *
   * Wenig Markdown, absichtlich: Überschrift · Aufzählung · Zitat · fett ·
   * kursiv · Code. Genau das, was `planBlatt()` in `schicht/lauf.mjs` schreibt.
   * Was es nicht kennt, steht als gewöhnlicher Absatz da — nie verschluckt.
   */
  function inlineNach(ziel, text) {
    /* **fett** · *kursiv* · `code` — in EINEM Durchgang, damit die Reihenfolge
       der Muster nichts verschiebt. Alles andere bleibt Text. */
    var muster = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    var rest = 0, treffer;
    while ((treffer = muster.exec(text)) !== null) {
      if (treffer.index > rest)
        ziel.appendChild(document.createTextNode(text.slice(rest, treffer.index)));
      var st = treffer[0];
      if (st.slice(0, 2) === "**") ziel.appendChild(el("b", null, st.slice(2, -2)));
      else if (st.charAt(0) === "`") ziel.appendChild(el("code", null, st.slice(1, -1)));
      else ziel.appendChild(el("em", null, st.slice(1, -1)));
      rest = treffer.index + st.length;
    }
    if (rest < text.length) ziel.appendChild(document.createTextNode(text.slice(rest)));
  }

  function markdownNach(ziel, text) {
    var zeilen = String(text || "").split("\n");
    var liste = null, absatz = null;
    function absatzZu() { absatz = null; }
    function listeZu() { liste = null; }
    for (var i = 0; i < zeilen.length; i++) {
      var z = zeilen[i];
      var leerZeile = !z.trim();
      if (leerZeile) { absatzZu(); listeZu(); continue; }

      var ueber = /^(#{1,6})\s+(.*)$/.exec(z);
      if (ueber) {
        absatzZu(); listeZu();
        /* h1 des Blattes wird h4 in der Karte: die Karte hat schon eine
           Überschrift, und zwei h1 untereinander sind für einen Vorleser
           zwei Dokumente. */
        var stufe = Math.min(6, ueber[1].length + 3);
        var h = el("h" + stufe, "md-ueber");
        inlineNach(h, ueber[2]);
        ziel.appendChild(h);
        continue;
      }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(z)) {
        absatzZu(); listeZu(); ziel.appendChild(document.createElement("hr")); continue;
      }
      var zitat = /^>\s?(.*)$/.exec(z);
      if (zitat) {
        absatzZu(); listeZu();
        var q = el("blockquote", "md-zitat");
        inlineNach(q, zitat[1]);
        ziel.appendChild(q);
        continue;
      }
      var punkt = /^\s*[-*+]\s+(.*)$/.exec(z);
      if (punkt) {
        absatzZu();
        if (!liste) { liste = el("ul", "md-liste"); ziel.appendChild(liste); }
        var li = el("li");
        inlineNach(li, punkt[1]);
        liste.appendChild(li);
        continue;
      }
      listeZu();
      if (!absatz) { absatz = el("p", "md-absatz"); ziel.appendChild(absatz); }
      else absatz.appendChild(document.createTextNode(" "));
      inlineNach(absatz, z);
    }
  }

  /*
   * DAS ÜBERGABE-BLATT (1.6, Klaus 2026-08-22).
   *
   * „Was wird übergeben? Der Auftrag, Merkkarte — ich muss lesen, lesen, lesen
   * und komme nicht zu dem Punkt, was hier übergeben wird. Hier sind nur
   * Texte, die veranschaulichen sollen, was übergeben wurde."
   *
   * Er hat recht: Raum 2 ERKLÄRTE die Übergabe, statt sie zu zeigen. Das Blatt
   * gibt es wirklich — `werkstatt/plan-offen.md`, geschrieben von `planBlatt()`
   * in `schicht/lauf.mjs`. Die Seite hat es nur nie geladen.
   *
   * Es steht jetzt OBEN in Raum 2. Die Erklärungen bleiben, aber darunter und
   * gefaltet: erst die Sache, dann der Beipackzettel.
   *
   * ⚠ Es steht im `.gitignore` (Stand dieser Maschine). Fehlt es, steht DASS es
   * fehlt und woher es käme — kein leerer Kasten, der wie „nichts passiert"
   * aussieht.
   */
  function zeichneBlatt() {
    var ziel = $("#blatt");
    if (!ziel) return;
    leer(ziel);
    var b = daten.blatt;
    if (!b || !b.text) {
      ziel.setAttribute("data-blatt", "fehlt");
      ziel.appendChild(el("p", "hinweis",
        "Das Übergabe-Blatt fehlt. Es heißt werkstatt/plan-offen.md und entsteht " +
        "am Ende jeder Konferenz (planBlatt() in schicht/lauf.mjs). Es steht im " +
        ".gitignore — auf einer Maschine, auf der noch keine Schicht lief, und " +
        "über GitHub Pages gibt es das Blatt nicht."));
      return;
    }
    /*
     * ══ WOHER DIESES BLATT KOMMT — LAUT, NICHT LEISE ════════════════════════
     *
     * Klaus am 2026-08-22, nachdem seine erste echte Konferenz gelaufen war:
     * „Ganz oben steht, dieser Plan stammt nicht aus einer Konferenz … also
     * bedeutet das, dass es immer noch eine Demo ist?"
     *
     * Er hatte den Warnsatz IM BLATT gelesen — den schreibt `planBlatt()` in
     * die Datei, und im mitgelieferten steht er zu Recht. Meine Herkunfts-Zeile
     * stand direkt darüber, aber als `leise`: grau, klein, eine Zeile. **Der
     * Satz in der Datei war lauter als der Satz über der Datei.**
     *
     * Und der eigentliche Befund liegt eine Ebene tiefer: seine KONFERENZ war
     * von diesem Gerät, das BLATT nicht. Das ist kein Widerspruch, den der
     * Nutzer auflösen soll — es ist ein Zustand, den die Seite kennt und
     * benennen kann:
     *
     *   Der Läufer schreibt das Blatt NUR im Planmodus (`--nur-konferenz`),
     *   und erst ganz am Ende (`lauf.mjs`, Zweig `nurPlan`). Eine volle
     *   Schicht schreibt gar keins. Und wer die Seite ansieht, während die
     *   Konferenz noch läuft, sieht die Datei von vorhin.
     *
     * Genau das steht jetzt da — mit dem Grund, nicht nur mit der Tatsache.
     */
    var konfEigen = !!(daten.konferenz && !daten.konferenz._ausBeispiel);
    var widerspruch = b.ausBeispiel && konfEigen;
    ziel.setAttribute("data-blatt", b.ausBeispiel ? "mitgeliefert" : "geraet");
    ziel.setAttribute("data-blatt-widerspruch", widerspruch ? "ja" : "nein");

    var band = el("p", b.ausBeispiel ? "hinweis" : "hinweis gut");
    band.appendChild(el("b", null, b.ausBeispiel
      ? "Mitgeliefertes Blatt — NICHT von diesem Gerät."
      : "Von diesem Gerät."));
    band.appendChild(document.createTextNode(" " + b.text.length +
      " Zeichen. Wer baut, bekommt genau das und sonst nichts."));
    ziel.appendChild(band);

    if (widerspruch) {
      var w = el("p", "hinweis warn");
      w.appendChild(el("b", null, "Deine Konferenz liegt vor, das Blatt dazu nicht."));
      w.appendChild(document.createTextNode(
        " Was unten steht, ist das mitgelieferte" +
        (daten.blatt && /^#\s*Offener Plan\s*[—-]\s*(\S+)/.test(b.text)
          ? " vom " + b.text.match(/^#\s*Offener Plan\s*[—-]\s*(\S+)/)[1] : "") +
        ". Zwei Gründe kommen infrage, und beide sind harmlos: " +
        "die Schicht läuft noch (das Blatt entsteht ganz am Ende) — oder der " +
        "Lauf war keine Planmodus-Schicht. Nur `--nur-konferenz` schreibt ein " +
        "Blatt; eine volle Schicht schreibt keins. " +
        "Läuft sie noch, hilft ⟳ Aktualisieren, wenn sie fertig ist."));
      ziel.appendChild(w);
    }
    mitnehmKnoepfe(ziel, "plan-offen.md", b.text, "text/markdown");
    /* GERENDERT, nicht als Roh-Code (Klaus 2026-08-22). Die Datei zum
       Herunterladen bleibt Zeichen für Zeichen die Datei — geprüft wird beides
       getrennt: dass hier keine Auszeichnung mehr steht UND dass unten das
       Original herauskommt. */
    var v = el("div", "blatt-text md");
    v.setAttribute("data-gerendert", "ja");
    markdownNach(v, b.text);
    ziel.appendChild(v);
  }

  /*
   * DER GANZE LAUF ALS TEXT — das, was Klaus „dir geben" will.
   *
   * Zusammengesetzt aus DENSELBEN Daten, die die Seite zeigt. Eine zweite,
   * nachgebaute Fassung liefe auseinander, und dann läse eine Sitzung etwas
   * anderes, als Klaus auf dem Schirm hatte.
   */
  function laufAlsText() {
    var z = [];
    /*
     * ⚠ ASCII-ZIERSTRICHE, KEINE KASTENZEICHEN. Zweiter Riegel neben dem BOM:
     * ignoriert ein Betrachter den BOM trotzdem, brechen bei `─` und `·` auch
     * noch die Trennlinien und die Spalten weg, und aus einer Tabelle wird
     * Buchstabensalat. Mit `-` und `|` bleibt die Gliederung lesbar, und nur
     * die Umlaute im Inhalt saehen falsch aus.
     *
     * Die Umlaute gehoeren zum Inhalt und bleiben. Die Zierde nicht.
     */
    var strich = new Array(70).join("-");
    z.push("Werkstatt-Lauf aus Kimhub");
    z.push(strich);
    var NAMEN2 = { konferenz: "Konferenz", lauf: "Schicht", gegen: "Gegenprüfung" };
    Object.keys(NAMEN2).forEach(function (k) {
      if (daten[k]) z.push(NAMEN2[k] + ": " + herkunftSatz(daten[k], " | "));
    });
    z.push("Schritte: " + achse.length);
    z.push("");

    var a = (daten.konferenz && daten.konferenz.auftrag) || (daten.lauf && daten.lauf.auftrag);
    if (a) {
      z.push("AUFTRAG");
      z.push(a.ziel || "-");
      z.push("");
      z.push("PRÜFMERKMAL");
      z.push(a.pruefmerkmal || "-");
      z.push("");
    }
    var tafel = (daten.konferenz && daten.konferenz.tafel) || [];
    if (tafel[0] && tafel[0].einwaende && tafel[0].einwaende.length) {
      z.push("EINWÄNDE, DIE MITGEHEN (nicht erledigt, nur benannt)");
      tafel[0].einwaende.forEach(function (e) { z.push("- " + e); });
      z.push("");
    }

    z.push("WAS GESAGT WURDE");
    z.push(strich);
    var tv = window.KimhubBuehne && window.KimhubBuehne._textVon;
    achse.forEach(function (p, i) {
      var e = p.e, t = tv ? tv(e) : { kopf: e.phase || "", inhalt: "" };
      z.push("");
      z.push("[" + (i + 1) + "] " + (e.wer || e.rolle || "?") + " - " + (t.kopf || e.phase || ""));
      if (t.inhalt) z.push(t.inhalt);
    });

    var l = daten.lauf;
    if (l && l.ergebnis) {
      z.push("");
      z.push("ERGEBNIS");
      z.push(strich);
      z.push((l.ergebnis.fertig ? "Ziel erreicht - nach der Form." : "Nicht fertig.") +
        " Urteil: " + l.ergebnis.urteil + " | " + l.ergebnis.runden + " Runden | " +
        "offene Befunde: " + l.ergebnis.offeneBefunde + ".");
      if (l.artefakt && l.artefakt.inhalt) {
        z.push("");
        z.push("HERAUSGEKOMMEN IST: " + (l.artefakt.dateiname || "entwurf.txt") +
          " (" + l.artefakt.inhalt.length + " Zeichen)");
        z.push(strich);
        z.push(l.artefakt.inhalt);
      }
    }
    var offen = [];
    if (l && l.stand && l.stand.offen) offen = offen.concat(l.stand.offen);
    if (l && l.artefakt && l.artefakt.offen) offen = offen.concat(l.artefakt.offen);
    z.push("");
    z.push("WAS OFFEN BLIEB");
    z.push(strich);
    /* „Nichts benannt" ist die Angabe, der man am wenigsten trauen sollte —
       und sie gehört mit in den Text, nicht weggelassen. */
    if (!offen.length) z.push("Nichts benannt.");
    else offen.forEach(function (x) { z.push("- " + (typeof x === "string" ? x : JSON.stringify(x))); });
    z.push("");
    return z.join("\n");
  }

  function zeichneEinwaende() {
    var ziel = $("#einwaende"); leer(ziel);
    var k = daten.konferenz;
    var tafel = (k && k.tafel) || (daten.lauf && daten.lauf.konferenz && daten.lauf.konferenz.tafel) || [];
    var sieger = tafel[0];
    var liste = (sieger && sieger.einwaende) || [];
    if (!liste.length) { ziel.appendChild(el("li", "leise", "Keine — das ist selten und einen zweiten Blick wert.")); return; }
    liste.forEach(function (x) { ziel.appendChild(el("li", null, x)); });
  }

  function zeichneErgebnis() {
    var ziel = $("#ergebnis"); leer(ziel);
    var offen = $("#offen"); leer(offen);
    var l = daten.lauf;
    if (!l || !l.ergebnis) {
      ziel.appendChild(el("p", "leise",
        "Es wurde hier nichts gebaut. Im Planmodus endet die Werkstatt mit dem Plan — gebaut wird woanders."));
      var k = daten.konferenz;
      if (k && k.auftrag) offen.appendChild(el("li", null, "Der Auftrag ist noch nicht gebaut: " + k.auftrag.ziel));
      else offen.appendChild(el("li", "leise", "Noch nichts."));
      return;
    }
    var e = l.ergebnis;
    var p = el("p");
    p.appendChild(el("b", null, e.fertig ? "Ziel erreicht — nach der Form. " : "Nicht fertig. "));
    p.appendChild(document.createTextNode(
      "Urteil: " + e.urteil + " · " + e.runden + " Runden · offene Befunde: " + e.offeneBefunde + "."));
    ziel.appendChild(p);
    /*
     * ⚠ UND WORAN ES LAG (Klaus 2026-09-07). Hier stand „Nicht fertig ·
     * 0 Runden · Nichts benannt" — und kein Wort dazu, warum. Der Grund lag
     * die ganze Zeit daneben: `feierabendGrund` und `feierabendText` stehen
     * in JEDEM Ergebnis, sie wurden nur nie gezeigt.
     *
     * Null Runden hat drei ganz verschiedene Ursachen — das Geld reichte nicht,
     * die Zeit war um, die Idee wurde am Tor verworfen. Ohne den Grund sieht
     * alles drei gleich aus, und der Nutzer sucht den Fehler an der falschen
     * Stelle. **Eine Auskunft, die in die falsche Richtung zeigt, ist teurer
     * als gar keine.**
     */
    if (!e.fertig && (e.feierabendText || e.feierabendGrund)) {
      var warum = el("p", "leise");
      warum.setAttribute("data-feierabend", e.feierabendGrund || "");
      warum.appendChild(el("b", null, GRUND_WORT[e.feierabendGrund] || "Grund: "));
      /* Der Text der Kasse, wenn es einen gibt — er nennt Beträge und Fristen.
         Sonst das Kennwort, damit wenigstens die Richtung dasteht. */
      warum.appendChild(document.createTextNode(
        e.feierabendText || ("Kennwort: " + e.feierabendGrund)));
      ziel.appendChild(warum);
    }
    if (l.artefakt) {
      /* Klaus: „nicht so viel Text … ein erster Entwurf dessen, was gebaut
         wurde, direkt als Link oder Button." Das Ergebnis liegt vollständig in
         `artefakt.inhalt` — es wurde nur als Fließtext hingelegt. */
      var inhalt = l.artefakt.inhalt || "";
      var name = l.artefakt.dateiname || "entwurf.txt";
      var istSeite = /\.x?html?$/i.test(name);

      ziel.appendChild(el("p", "leise", "Herausgekommen ist " + name +
        " (" + inhalt.length + " Zeichen)."));

      var reihe = el("p");
      reihe.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin:10px 0";

      var typ = istSeite ? "text/html" : name.match(/\.md$/i) ? "text/markdown" : "text/plain";
      var blob = new Blob([alsDatei(inhalt, typ)], { type: typ + ";charset=utf-8" });
      var adresse = URL.createObjectURL(blob);

      if (istSeite) {
        /* Eine HTML-Datei lässt sich WIRKLICH ansehen — als Seite, nicht als
           Quelltext. Das ist der „erste Blick", den Klaus meint. */
        var ansehen = el("a", null, "↗ Entwurf ansehen");
        ansehen.href = adresse;
        ansehen.target = "_blank";
        ansehen.rel = "noopener";
        ansehen.className = "ergebnis-knopf";
        reihe.appendChild(ansehen);
      }
      var laden = el("a", null, "⭳ " + name + " herunterladen");
      laden.href = adresse;
      laden.setAttribute("download", name);
      laden.className = "ergebnis-knopf";
      reihe.appendChild(laden);
      ziel.appendChild(reihe);

      /* Der Text bleibt — aber eingeklappt. Wer ihn braucht, klappt ihn auf;
         wer das Ergebnis sehen will, drückt oben. */
      var kasten = el("details");
      var kopf = el("summary", null, "Den Inhalt lesen");
      kasten.appendChild(kopf);
      var stueck = inhalt.slice(0, 4000) + (inhalt.length > 4000 ? "\n…" : "");
      /* Ein Markdown-Artefakt wird gelesen wie eines. Alles andere bleibt
         `pre` — bei Code oder HTML ist die Auszeichnung der Inhalt. */
      if (/\.md$/i.test(name)) {
        var mv = el("div", "blatt-text md");
        mv.setAttribute("data-gerendert", "ja");
        markdownNach(mv, stueck);
        kasten.appendChild(mv);
      } else {
        var v = el("pre");
        v.textContent = stueck;
        kasten.appendChild(v);
      }
      ziel.appendChild(kasten);

      if (l.artefakt.weitergabe) ziel.appendChild(el("p", "leise", "Weitergabe: " + l.artefakt.weitergabe));

      /*
       * ══ DIE FRÜHEREN FASSUNGEN ═══════════════════════════════════════════
       *
       * Klaus 2026-09-07: „ursprünglich sollte 1. Version, dann 2. Version und
       * fertige Version generiert werden können." Die Runden gab es schon —
       * nur behielt sie niemand: `artefakt` wurde in jeder Runde
       * überschrieben, und das Bau-Ereignis trug nur die Zeichenzahl.
       *
       * ⚠ NUR DIE FRÜHEREN. Die letzte Fassung steht oben mit Knopf und
       * Vorschau; sie hier ein zweites Mal hinzulegen hiesse, dieselbe Datei
       * zweimal anzubieten — und der Leser fragt sich, welche gilt.
       *
       * ⚠ UND SIE STEHEN ZU. Eine Schicht mit vier Runden legte sonst vier
       * Werkstücke offen aufs Blatt; das ist genau der Text-Berg, den Klaus
       * beanstandet hat. Wer vergleichen will, klappt auf.
       */
      var fassungen = Array.isArray(l.fassungen) ? l.fassungen : [];
      var frueher = fassungen.slice(0, -1);
      if (frueher.length) {
        var vBox = el("details");
        vBox.setAttribute("data-fassungen", String(frueher.length));
        vBox.appendChild(el("summary", null,
          frueher.length === 1 ? "Die Fassung davor ansehen"
                               : "Die " + frueher.length + " Fassungen davor ansehen"));
        vBox.appendChild(el("p", "leise",
          "Jede Runde hat eine eigene Fassung gebaut. Sie stehen hier, damit man " +
          "sieht, WAS sich zwischen den Runden geändert hat — nicht nur, dass es " +
          "Runden gab."));
        frueher.forEach(function (f) {
          var fi = f.inhalt || "", fn = f.dateiname || "entwurf.txt";
          var zeile = el("p", "leise",
            "Runde " + f.runde + " · " + fn + " · " + fi.length + " Zeichen");
          vBox.appendChild(zeile);
          var fBlob = new Blob([alsDatei(fi, "text/plain")],
            { type: "text/plain;charset=utf-8" });
          var fLink = el("a", "ergebnis-knopf",
            "⭳ Runde " + f.runde + " herunterladen");
          fLink.href = URL.createObjectURL(fBlob);
          fLink.setAttribute("download", "runde" + f.runde + "-" + fn);
          vBox.appendChild(fLink);
          var fPre = el("pre");
          fPre.textContent = fi.slice(0, 4000) + (fi.length > 4000 ? "\n…" : "");
          vBox.appendChild(fPre);
        });
        ziel.appendChild(vBox);
      }
    } else {
      /* KEIN toter Knopf: liegt nichts vor, steht das da. */
      ziel.appendChild(el("p", "leise",
        "Es liegt kein Artefakt vor — dieser Lauf hat nichts abgelegt, was man ansehen könnte."));
    }
    var reste = [];
    if (l.stand && l.stand.offen) reste = reste.concat(l.stand.offen);
    if (l.artefakt && l.artefakt.offen) reste = reste.concat(l.artefakt.offen);
    if (e.feierabendText) reste.push(e.feierabendText);
    if (!reste.length) offen.appendChild(el("li", "leise", "Nichts benannt — das ist die Angabe, der man am wenigsten trauen sollte."));
    else reste.forEach(function (x) { offen.appendChild(el("li", null, typeof x === "string" ? x : JSON.stringify(x))); });
  }

  /*
   * ALLES ZUM MITNEHMEN (1.7) — an EINER Stelle, in Raum 3.
   *
   * Klaus sucht drei verschiedene Dinge, und im Brief stand ausdrücklich, man
   * solle erst nachsehen, welches er meint. Nachgesehen: er nennt in einem
   * Satz „ein Ergebnis" UND „um es dir zu geben, damit du daraus etwas bauen
   * kannst". Das sind zwei — das gebaute Stück und der Lauf, aus dem es kam.
   * Das dritte (das Übergabe-Blatt) hat er in 1.6 eigens verlangt.
   *
   * Also alle drei, jedes mit eigenem Knopf und eigenem Dateinamen. Ein Angebot
   * zu wenig kostet ihn eine Sitzung; eines zu viel kostet eine Zeile.
   *
   * Was NICHT dasteht, wenn es nichts gibt: ein Knopf. Statt seiner der Grund.
   */
  function zeichneMitnehmen() {
    var ziel = $("#mitnehmen");
    if (!ziel) return;
    leer(ziel);
    var etwas = 0;

    if (achse.length) {
      var t1 = el("h4", null, "Der ganze Lauf als Text");
      ziel.appendChild(t1);
      ziel.appendChild(el("p", "leise",
        "Auftrag, Prüfmerkmal, jeder Beitrag ungekürzt, das Ergebnis und was " +
        "offen blieb. Das ist der Block, den man in eine Sitzung gibt."));
      mitnehmKnoepfe(ziel, "werkstatt-lauf.txt", laufAlsText(), "text/plain");
      etwas++;
    }

    if (daten.blatt && daten.blatt.text) {
      ziel.appendChild(el("h4", null, "Das Übergabe-Blatt"));
      ziel.appendChild(el("p", "leise",
        "Nur der Auftrag mit Prüfmerkmal und den Einwänden — das, was die " +
        "Werkstatt an die bauende Hand gibt. Steht auch oben in Raum 2."));
      mitnehmKnoepfe(ziel, "plan-offen.md", daten.blatt.text, "text/markdown");
      etwas++;
    }

    var art = daten.lauf && daten.lauf.artefakt;
    if (art && art.inhalt) {
      ziel.appendChild(el("h4", null, "Das gebaute Stück"));
      ziel.appendChild(el("p", "leise",
        (art.dateiname || "entwurf.txt") + " · " + art.inhalt.length + " Zeichen."));
      mitnehmKnoepfe(ziel, art.dateiname || "entwurf.txt", art.inhalt,
        /\.x?html?$/i.test(art.dateiname || "") ? "text/html" : "text/plain");
      etwas++;
    }

    ziel.setAttribute("data-mitnehmen", String(etwas));
    if (!etwas) {
      ziel.appendChild(el("p", "hinweis",
        "Hier ist noch nichts zum Mitnehmen: es liegt kein Lauf vor. Ein " +
        "leerer Knopf wäre schlimmer als keiner."));
    }
  }

  /*
   * ZWEI FRAGEN, DIE NICHTS MITEINANDER ZU TUN HABEN (1.5, Klaus 2026-08-22).
   *
   * „Konferenz — da steht immer noch Beispiel. Wenn es eine Dokumentation des
   * vorhergehenden Laufes ist, ist das Wort Beispiel irreführend."
   *
   * Er hat einen echten Fehler im WORT gefunden. „Beispiel" hieß im Code
   * „aus `werkstatt/beispiel/`, nicht von diesem Gerät" — Klaus liest es als
   * „erfunden, nicht echt". Das Wort vermischte zwei Unterscheidungen:
   *
   *   HERKUNFT   von diesem Gerät   ⟷  mitgeliefert
   *   ART        echt (Modelle gefragt, Geld ausgegeben)  ⟷  trocken
   *
   * Beide gehören benannt, aber GETRENNT. Das Wort einfach zu streichen wäre
   * falsch: dann hielte jemand den mitgelieferten Lauf für seinen eigenen —
   * genau der Grund, aus dem die Marke entstanden ist.
   *
   * ⚠ UND EINE RICHTIGSTELLUNG, GEMESSEN STATT ABGESCHRIEBEN. Der Brief für
   * diese Sitzung sagte, der hinterlegte Lauf sei „ein echter, aufgezeichneter
   * Lauf mit echten Modell-Antworten". Die Dateien sagen etwas anderes: alle
   * drei tragen `"art": "trocken"`, und ein Trockenlauf fragt kein Modell —
   * seine Antworten stammen aus hinterlegten Texten (so steht es auch schon in
   * `zeichneAuftrag`). Die Euro-Beträge in seiner `kasse` sind gerechnet, nicht
   * bezahlt. Hier steht deshalb, was in den Daten steht, nicht was im Brief
   * stand.
   */
  /*
   * WOMIT gelaufen wurde — die Umrechnung steht in `buehne.js`, hier nur die
   * Tür dorthin. EINE Fassung, weil zwei auseinanderliefen: `zeigeLage` hielt
   * die drei Fälle schon richtig auseinander, während hier zwei standen und
   * alles Unbekannte als „echt bezahlt" durchging.
   *
   * KEIN Rückfall auf eine eigene Rechnung. Fehlt das Modul, ist die Antwort
   * „unbekannt" — und das ist die richtige: eine zweite Fassung wäre genau
   * die Drift-Quelle, die diesen Fehler erzeugt hat.
   */
  function buehneModul() {
    return (typeof window !== "undefined" && window.KimhubBuehne) || null;
  }
  function artWort(d) { var b = buehneModul(); return b && b.artWort ? b.artWort(d) : ""; }
  function artVon(a, z) { var b = buehneModul(); return b && b.artVon ? b.artVon(a, z) : ""; }

  /* Der eine Satz, der beide Achsen nennt — an EINER Stelle, weil ihn das Band
     und die Bühne brauchen. Zwei Fassungen liefen auseinander, und dann sagte
     die eine „Beispiel" und die andere „mitgeliefert". */
  function herkunftSatz(d, trenner) {
    if (!d) return "";
    /* Der TRENNER ist ein Parameter, die WORTE sind es nicht. Auf dem Schirm
       steht „ · ", in einer Datei „ | " — dieselbe Aussage, andere Zierde.
       Zwei Funktionen mit demselben Satz wären eine Drift-Quelle; ein
       Parameter ist keine. */
    var t = trenner || " · ";
    var wo = d._ausBeispiel ? "mitgeliefert" : "von diesem Gerät";
    var a = artWort(d);
    var was = a === "trocken" ? "trocken, keine Modelle gefragt, nichts bezahlt"
            : a === "echt"    ? "echt bezahlt"
            /* Nicht „echt bezahlt" raten. Wer die Art nicht kennt, sagt das. */
            : "Art nicht angegeben";
    return wo + t + was + (d.datum ? t + "vom " + d.datum : "");
  }

  /*
   * WARUM HIER NICHTS EIGENES LIEGT — und das hängt am ORT, nicht am Gerät.
   *
   * Klaus am 2026-08-22, während dieser Sitzung: „das einzige was gelaufen ist
   * ist der Bau eines Tools was von Termux aus gestartet wurde" — und die Seite
   * sagte trotzdem „Auf diesem Gerät ist noch nichts gelaufen."
   *
   * Der Satz war nicht falsch, aber er zeigte in die falsche Richtung. Die
   * Lauf-Dateien stehen im `.gitignore` (sie sind der Stand EINER Maschine).
   * Wer die Seite über GitHub Pages aufruft, bekommt deshalb NIE einen eigenen
   * Lauf zu sehen — auch dann nicht, wenn auf demselben Tablet gerade eine
   * Schicht gefahren ist. Es liegt nicht am Gerät, es liegt daran, WOHER die
   * Seite kommt.
   *
   * Das ist keine Kleinigkeit: „auf diesem Gerät ist nichts gelaufen" schickt
   * jemanden los, eine Schicht zu starten, die er längst gefahren hat.
   */
  /* Die REGEL für sich, prüfbar ohne Browser-Adresse. Eine Probe kann den
     Rechnernamen einer Seite nicht umschreiben; sie kann aber die Regel messen,
     die daraus die Antwort macht. Der Rest ist eine Zeile Verdrahtung — und
     die steht als „ungeprüft" im README, statt als geprüft zu gelten. */
  function istNetzHost(name) {
    return /\.github\.io$/i.test(String(name || ""));
  }
  function ausDemNetz() {
    try { return istNetzHost(location.hostname); }
    catch (e) { return false; }
  }

  /* Das Herkunfts-Band ganz oben. Es beantwortet die eine Frage, die Klaus nach
     seinem ersten echten Lauf gestellt hat: „läuft das hier wirklich live?"
     Die Antwort gab es schon — aber nur im Reiter „Abspielen", und dort sieht
     man sie nicht, wenn man in der Werkstatt steht. */
  function zeigeHerkunft(ausBeispiel, NAMEN) {
    var z = $("#herkunft");
    if (!z) return;
    leer(z);
    z.className = "herkunft";

    var eigene = Object.keys(NAMEN).filter(function (k) {
      return daten[k] && !daten[k]._ausBeispiel;
    }).map(function (k) { return NAMEN[k]; });

    /* Die TRENNUNG steht als Angabe am Element, nicht nur im Satz. Ein Wächter,
       der am Wortlaut hängt, prüft die Formulierung statt der Zusicherung — und
       bleibt grün, sobald dieselben Wörter irgendwo anders im Band vorkommen.
       Genau das ist beim Bau passiert. So bleibt der Text frei und die Aussage
       trotzdem geprüft. */
    z.setAttribute("data-eigene", eigene.join(","));
    /* Die Angabe heißt weiter `data-beispiel` — sie ist der Anker, an dem die
       Probe die TRENNUNG misst, und sie steht in keinem sichtbaren Satz.
       Geändert hat sich das WORT auf der Seite, nicht die Mechanik. */
    z.setAttribute("data-beispiel", ausBeispiel.join(","));
    /* Und die zweite Achse als eigene Angabe: echt oder trocken. Sie war
       vorher nirgends greifbar — genau deshalb konnte „Beispiel" beides
       bedeuten. */
    var arten = [];
    Object.keys(NAMEN).forEach(function (k) {
      if (daten[k]) arten.push(NAMEN[k] + "=" + artWort(daten[k]));
    });
    z.setAttribute("data-art", arten.join(","));
    z.setAttribute("data-ort", ausDemNetz() ? "netz" : "geraet");

    if (!eigene.length && !ausBeispiel.length) {
      z.appendChild(document.createTextNode("Noch nichts geladen."));
      return;
    }
    if (!ausBeispiel.length) {
      z.className = "herkunft echt";
      var b = el("b", null, "Von diesem Gerät");
      z.appendChild(b);
      z.appendChild(document.createTextNode(" — " + eigene.join(", ") +
        (daten.konferenz && daten.konferenz.datum ? " vom " + daten.konferenz.datum : "") +
        ". Nichts davon ist mitgeliefert." +
        (artWort(daten.konferenz) === "trocken" || artWort(daten.lauf) === "trocken"
          ? " Gelaufen ist er trocken: keine Modelle gefragt, nichts bezahlt." : "")));
      return;
    }
    if (eigene.length) {
      z.className = "herkunft gemischt";
      z.appendChild(el("b", null, "Teils von diesem Gerät, teils mitgeliefert."));
      z.appendChild(document.createTextNode(
        " Von diesem Gerät: " + eigene.join(", ") + ". Mitgeliefert: " +
        ausBeispiel.join(", ") + " — dafür ist hier noch nichts gelaufen."));
      /* Der häufigste Fall, und er verwirrt am meisten: im Planmodus läuft NUR
         die Konferenz. Wer das nicht weiß, hält den ganzen Lauf für unecht. */
      if (eigene.length === 1 && eigene[0] === "Konferenz") {
        z.appendChild(el("p", "leise",
          "Das ist im Planmodus normal: die Werkstatt hält die Konferenz und gibt " +
          "den Plan heraus — gebaut wird von einer Claude-Sitzung, nicht hier."));
      }
      return;
    }

    /*
     * NUR MITGELIEFERT — und hier stand das Wort, über das Klaus gestolpert
     * ist. Jetzt stehen die beiden Achsen getrennt da, und darunter der Grund,
     * warum nichts Eigenes zu sehen ist.
     */
    var artM = artVon(daten.konferenz, daten.lauf);
    var kopfWort = "Mitgelieferter Lauf" +
      (daten.konferenz && daten.konferenz.datum ? " vom " + daten.konferenz.datum : "") +
      " · " + (artM === "trocken" ? "trocken"
             : artM === "echt"    ? "echt bezahlt"
             : "Art nicht angegeben") + ".";
    z.appendChild(el("b", null, kopfWort));
    z.appendChild(document.createTextNode(
      " Das sind ZWEI Angaben, keine: er kommt nicht von diesem Gerät " +
      "(Herkunft), und er hat " +
      (artM === "trocken"
        ? "kein Modell gefragt und nichts gekostet — seine Antworten stammen aus hinterlegten Texten"
        : artM === "echt"
        ? "wirklich Modelle gefragt und Geld gekostet"
        : "nicht dabeistehen, womit er gelaufen ist") +
      " (Art). Er zeigt den Ablauf, nicht ein Ergebnis von dir."));

    /*
     * UND WARUM NICHTS EIGENES DALIEGT. Zwei verschiedene Gründe, und der
     * Unterschied schickt Klaus in zwei verschiedene Richtungen.
     */
    var grund = el("p", "leise");
    if (ausDemNetz()) {
      grund.appendChild(el("b", null, "Diese Seite kommt aus dem Netz (GitHub Pages)."));
      grund.appendChild(document.createTextNode(
        " Dort liegen die Lauf-Dateien NIE — sie stehen im .gitignore, weil sie " +
        "der Stand einer einzelnen Maschine sind. Deine eigenen Läufe liegen auf " +
        "dem Gerät, auf dem du sie gefahren hast. Zwei Wege, sie hier zu sehen: " +
        "die Werkstatt dort öffnen (in Termux: bash tools/ansicht.sh) — oder die " +
        "Dateien unten mit „Lauf laden“ hereinholen."));
    } else {
      grund.appendChild(document.createTextNode(
        "Auf diesem Gerät hat noch keine Schicht geschrieben. Lief eine woanders " +
        "(oder in einem anderen Klon), holt „Lauf laden“ ihre Dateien herein — " +
        "werkstatt/konferenz.json, lauf.json, gegenpruefung.json."));
    }
    z.appendChild(grund);
    z.appendChild(ladeKnopf());
  }

  /*
   * „LAUF LADEN" — dort, wo die Frage entsteht.
   *
   * Den Datei-Wähler gab es schon, aber im Reiter „Abspielen", also dort, wo
   * Klaus am seltensten hinsieht — und er schwieg: eine kaputte Datei wurde
   * still verschluckt, eine gute auch. Ein Knopf, der nichts sagt, ist von
   * einem toten nicht zu unterscheiden.
   *
   * Es ist KEIN zweiter Mechanismus: der Knopf drückt denselben Datei-Wähler.
   * Zwei Wähler wären zwei Wege, die auseinanderlaufen.
   */
  /* Was das Laden ergeben hat — sichtbar, nicht nur im Zustand. Sie wird nach
     `neuAufbauen()` gerufen: das zeichnet das Band neu und würde eine Meldung,
     die vorher dransteht, wieder wegwischen. */
  function ladeLage(genommen, verschmaeht) {
    var z = $("#herkunft");
    if (!z) return;
    var p = el("p", "leise");
    p.setAttribute("data-geladen", String(genommen.length) + "/" + String(verschmaeht.length));
    if (genommen.length) {
      p.appendChild(el("b", null, "Geladen: "));
      p.appendChild(document.createTextNode(genommen.join(" · ")));
    }
    if (verschmaeht.length) {
      if (genommen.length) p.appendChild(document.createElement("br"));
      p.appendChild(el("b", null, "Nicht geladen: "));
      p.appendChild(document.createTextNode(verschmaeht.join(" · ")));
    }
    if (!genommen.length && !verschmaeht.length)
      p.appendChild(document.createTextNode("Keine Datei ausgewählt."));
    z.appendChild(p);
  }

  function ladeKnopf() {
    var k = el("button", "herkunft-laden", "⭱ Lauf laden");
    k.type = "button";
    k.title = "werkstatt/*.json von diesem Gerät hereinholen";
    k.addEventListener("click", function () {
      var w = $("#datei");
      if (w) w.click();
    });
    return k;
  }

  // ── Zeichnen: Raum 4 ────────────────────────────────────────────────────
  /*
   * Das Fahrtenbuch. Der Befund dahinter (Klaus, 2026-08-22): „Bauzeit und Tag
   * und wer gebaut hat wird in der Buchhaltung nicht dokumentiert, zum Beispiel
   * heute und gestern Agentenarbeit — als hätten sie nie gearbeitet und kein Geld
   * gekostet."
   *
   * Er hatte recht. Die Kachel „Diese Schicht" zeigt immer nur den ZULETZT
   * geladenen Lauf, und lag keiner vor, sprang die Seite aufs Beispiel. Eine
   * Werkstatt, die gestern gelaufen ist, war danach nirgends mehr zu sehen.
   */
  function zeichneFahrtenbuch() {
    var t = $("#fahrten");
    // Ein Browser kann die alte Seite im Vorrat haben und das neue Skript
    // frisch holen. Ohne diese Zeile stirbt dann die GANZE Buchhaltung an
    // einem fehlenden Element — und der Nutzer sieht nicht „eine Karte fehlt",
    // sondern eine leere Seite.
    if (!t) return;
    var k = el("tbody"); leer(t);
    var f = daten.fahrten && daten.fahrten.fahrten;
    if (!f || !f.length) {
      var z = el("tr"); z.appendChild(el("td", "fehlt leise",
        "Auf dieser Maschine ist noch keine Fahrt eingetragen. Das heißt NICHT " +
        "\u201ekeine Kosten\u201c \u2014 es hei\u00dft, hier steht nichts."));
      k.appendChild(z); t.appendChild(k);
      /*
       * WARUM NICHTS DASTEHT UND WANN ETWAS DASTEHEN WIRD (1.8, Klaus
       * 2026-08-22: „Die Buchhaltung ist auch noch nicht live … vielleicht ist
       * es dann auch so, dass es dann live läuft.").
       *
       * Dass hier nichts steht, ist erwartbar und kein Fehler — aber wenn Klaus
       * es als Fehler liest, sagt die Seite es nicht deutlich genug. Und der
       * eine Grund, der wirklich zählt, fehlte ganz: über GitHub Pages wird
       * hier NIE etwas stehen. Das Buch ist im .gitignore, weil es der Stand
       * einer Maschine ist. Wer das nicht weiß, wartet auf etwas, das an
       * diesem Ort nicht kommen kann.
       */
      $("#fahrten-hinweis").textContent =
        "Das Buch entsteht beim Feierabend einer Schicht — der nächste Feierabend " +
        "auf diesem Gerät trägt die erste Zeile ein. Es liegt nicht im Depot, " +
        "sondern auf dem Gerät, das gearbeitet hat (.gitignore). " +
        (ausDemNetz()
          ? "⚠ Diese Seite kommt aus dem Netz (GitHub Pages) — DORT wird hier nie " +
            "etwas stehen, egal wie oft du eine Schicht fährst. Deine Fahrten " +
            "stehen auf dem Gerät, auf dem du sie gefahren hast; öffne die " +
            "Werkstatt dort, oder hol die Datei mit „Lauf laden“ herein."
          : "Läuft eine Schicht in einem anderen Klon, holt „Lauf laden“ das " +
            "Buch von dort herein.");
      if ($("#k-alle")) {
        $("#k-alle").textContent = "–";
        $("#k-alle-sub").textContent = "noch keine Fahrt eingetragen";
      }
      return;
    }
    var kopf = el("tr");
    ["Tag", "Was", "Dauer", "Aufrufe", "Kosten"].forEach(function (h, i) {
      kopf.appendChild(el("th", i >= 2 ? "zahl" : null, h));
    });
    k.appendChild(kopf);
    // Das Jüngste oben — wer nachsieht, fragt nach heute, nicht nach dem Anfang.
    f.slice().reverse().forEach(function (x) {
      var r = el("tr");
      r.appendChild(el("td", null, x.tag));
      var was = el("td");
      was.appendChild(el("div", null, x.artText + (x.echt ? "" : "  · trocken, nichts bezahlt")));
      if (x.titel) was.appendChild(langerText(x.titel, "leise"));
      if (x.besetzung && x.besetzung.length)
        was.appendChild(el("small", "leise", "  " + x.besetzung.join(", ")));
      r.appendChild(was);
      r.appendChild(el("td", "zahl", x.minuten + " min"));
      r.appendChild(el("td", "zahl", String(x.aufrufe)));
      r.appendChild(el("td", "zahl", x.echt ? eur(x.eur) : "–"));
      k.appendChild(r);
    });
    t.appendChild(k);

    /* ⚠ GERECHNET WIRD IN `kassen.js` (2026-09-07), nicht hier. Die drei Zahlen
       standen als Ausdrücke in dieser Datei und waren damit nur im Browser
       prüfbar — ihr Gegenprobe-Fall meldete IMMER „nicht gefangen", ohne dass
       etwas kaputt war. Dieselbe Abhilfe wie bei `zeit.js`: was sich
       nachrechnen lässt, gehört dorthin, wo es überall läuft. */
    var sum = window.WERKSTATT_KASSEN.fahrtSummen(f);
    var summe = sum.eur, min = sum.minuten;
    /*
     * ⚠ „BEZAHLT" HEISST: ES IST GELD GEFLOSSEN (Klaus 2026-09-07).
     *
     * Hier stand `echte.length` — das ist „nicht trocken". Sein Buch zeigte
     * acht Fahrten, „davon 7 bezahlt", und drei davon hatten wirklich etwas
     * gekostet: 0,01 + 0,02 + 0,01 = 0,04 €. Vier standen mit NULL Aufrufen
     * und 0,00 € da und wurden mitgezählt.
     *
     * Eine Fahrt, die vor dem ersten Aufruf starb, ist echt gemeint und
     * trotzdem nicht bezahlt. Für einen Leser heisst „bezahlt", dass Geld
     * geflossen ist — und eine zu hohe Zahl in einer Buchhaltung ist derselbe
     * Fehler wie eine zu niedrige, nur andersherum.
     *
     * Die Absicht bleibt sichtbar: `echte` steht als zweite Zahl daneben,
     * wenn sie sich unterscheiden. Sonst verlöre man, WIE VIELE Fahrten
     * überhaupt echt gemeint waren.
     */
    if ($("#k-alle")) {
      $("#k-alle").textContent = eur(summe);
      $("#k-alle-sub").textContent = sum.fahrten + " Fahrt(en), davon " +
        sum.bezahlte + " mit Kosten" +
        (sum.echte > sum.bezahlte
          ? " (" + sum.echte + " echt gemeint, der Rest starb vor dem ersten Aufruf)"
          : "") +
        " · " + min + " min zusammen";
    }
    $("#fahrten-hinweis").textContent = "An " + sum.tage + " Tag(en) gearbeitet. " +
      "Die Trockenläufe stehen mit drin: sie kosten nichts, sind aber Arbeit.";
  }

  /*
   * Die Zapfsäule daneben ist eine ZWEITE Quelle für dieselbe Tagessumme. Sie
   * steht hier nicht zur Zierde: weichen beide ab, ist zwischen dem Eintrag ins
   * Buch und dem Buchen des Kontingents etwas abgebrochen. Eine Prüfung, die
   * dir recht gibt, ist der Ort, an dem man am genauesten hinsieht.
   */
  function zeichneZapf() {
    var t = $("#zapf");
    if (!t) return;
    var k = el("tbody"); leer(t);
    var z = daten.zapf, tage = (z && z.tage) || null;
    if (!tage || !Object.keys(tage).length) {
      /*
       * ⚠ ZWEI GRÜNDE, WARUM SIE LEER IST — und nur einer war benannt
       * (Klaus 2026-09-07).
       *
       * Hier stand ausnahmslos „Noch keine ECHTE Schicht auf dieser
       * Maschine". In der Werkstatt stimmt das. In Company ist es **falsch**:
       * `schicht/kontingent.json` ist eine Node-Datei, die dort NIE entsteht —
       * die Schicht läuft im Browser und bucht ins Fahrtenbuch. Wer dort
       * bezahlte Fahrten im Buch stehen sieht und daneben „noch keine echte
       * Schicht" liest, bekommt zwei Auskünfte, die einander widersprechen.
       *
       * Geraten wird nicht, welche App das ist — GEFRAGT wird das Buch. Stehen
       * dort echte Fahrten, kann der erste Satz nicht stimmen, und die Seite
       * sagt stattdessen, was wirklich los ist.
       */
      var echteImBuch = ((daten.fahrten && daten.fahrten.fahrten) || [])
        .filter(function (x) { return x.echt; }).length;
      var r0 = el("tr"); r0.appendChild(el("td", "fehlt leise", echteImBuch
        ? "Die Zapfsäule (schicht/kontingent.json) liegt hier nicht — sie entsteht "
          + "nur dort, wo eine Schicht auf der Kommandozeile läuft. Im Browser bucht "
          + "die Schicht ins Fahrtenbuch, und dort stehen " + echteImBuch
          + " bezahlte Fahrt(en). Ein Abgleich ist hier deshalb nicht möglich — "
          + "das ist keine Abweichung."
        : "Noch keine ECHTE Schicht auf dieser Maschine — die Zapfsäule wird erst "
          + "dabei angelegt. Trockenläufe bucht sie nicht."));
      r0.firstChild.setAttribute("data-zapf-leer", echteImBuch ? "gibt-es-hier-nicht" : "noch-keine");
      k.appendChild(r0); t.appendChild(k);
      $("#zapf-hinweis").textContent = "";
      return;
    }
    var ausBuch = {};
    ((daten.fahrten && daten.fahrten.fahrten) || []).forEach(function (x) {
      if (x.echt) ausBuch[x.tag] = (ausBuch[x.tag] || 0) + (x.eur || 0);
    });
    var kopf = el("tr");
    ["Tag", "Schichten", "Zapfsäule", "Fahrtenbuch"].forEach(function (h, i) {
      kopf.appendChild(el("th", i ? "zahl" : null, h));
    });
    k.appendChild(kopf);
    var abweichungen = 0;
    Object.keys(tage).sort().reverse().forEach(function (tag) {
      var e = tage[tag] || {};
      var r = el("tr");
      r.appendChild(el("td", null, tag));
      r.appendChild(el("td", "zahl", String(e.schichten || 0)));
      r.appendChild(el("td", "zahl", eur(e.verbrauchtEur || 0)));
      var buch = ausBuch[tag];
      var passt = buch != null && Math.abs(buch - (e.verbrauchtEur || 0)) < 0.005;
      if (buch == null) { r.appendChild(el("td", "zahl leise", "steht nicht drin")); abweichungen++; }
      else { r.appendChild(el("td", passt ? "zahl" : "zahl fehlt", eur(buch))); if (!passt) abweichungen++; }
      k.appendChild(r);
    });
    t.appendChild(k);
    $("#zapf-hinweis").textContent = abweichungen
      ? "⚠ " + abweichungen + " Tag(e) weichen ab. Das Fahrtenbuch gibt es erst seit " +
        "dem 2026-08-22 — für ältere Tage ist das erwartbar. Bei einem NEUEN Tag " +
        "wäre es ein Abbruch zwischen Eintrag und Buchung."
      : "Beide Quellen sind sich einig. Tagesdeckel: " + eur(z.tagesdeckelEur || 0) + ".";
  }

  function zeichneBuchhaltung() {
    zeichneFahrtenbuch();
    zeichneZapf();
    /*
     * ⚠ BEIDE KASSEN, NICHT EINE VON BEIDEN (Klaus 2026-09-07).
     *
     * Hier stand `lauf.kasse || konferenz.kasse` — das ODER nahm die erste,
     * die dastand. Bei einem Lauf MIT Konferenz sind das zwei getrennte
     * Kassen (der Deckel wird geteilt), und die Kachel meldete **0,02 €** für
     * einen Lauf, der **0,50 €** gekostet hat. Die Zahl stimmte für die
     * Schicht-Kasse und war als Auskunft über den Lauf falsch — eine zu
     * niedrige Zahl sieht genauso aus wie eine gemessene.
     *
     * Gerechnet wird mit derselben Funktion, die auch das Fahrtenbuch
     * summiert; sie liegt seit heute in `kassen.js` an der Wurzel, damit ein
     * klassisches Skript sie erreicht. Ein zweiter Rechenweg hier wäre eine
     * Drift-Quelle mit Ansage.
     *
     * ⚠ FEHLT DIE DATEI, WIRD NICHT GERATEN. Dann steht die Schicht-Kasse da
     * wie bisher — falsch wäre erst, es zu verschweigen, und deshalb sagt der
     * Untertitel unten, woraus die Zahl besteht.
     */
    var kassen = [daten.lauf && daten.lauf.kasse,
                  daten.konferenz && daten.konferenz.kasse].filter(Boolean);
    var kasse = (window.WERKSTATT_KASSEN && kassen.length > 1)
      ? window.WERKSTATT_KASSEN.zusammen.apply(null, kassen)
      : kassen[0] || null;
    if (kasse) {
      $("#k-schicht").textContent = eur(kasse.verbrauchtEur);
      /* Die Herkunft als ANGABE, nicht nur im Satz — dieselbe Lehre wie am
         Band und am Pult: ein Wächter, der am Wortlaut hängt, verbietet das
         Richtigstellen. Diese Prüfung ist am 2026-08-22 rot geworden, weil das
         Wort „Beispiel" zu „mitgeliefert" wurde; die Zusicherung hatte sich
         nicht geändert. */
      $("#k-schicht-sub").setAttribute("data-herkunft",
        (daten.lauf && daten.lauf._ausBeispiel) || (daten.konferenz && daten.konferenz._ausBeispiel)
          ? "mitgeliefert" : "geraet");
      $("#k-schicht-sub").textContent = kasse.aufrufe + " Aufrufe · Deckel " + eur(kasse.deckelEur) +
        /* WORAUS die Zahl besteht. Eine zusammengezählte Fahrt ist sonst von
           einer einzelnen nicht zu unterscheiden — derselbe Grund, aus dem
           `zusammen()` das Feld `teile` mitgibt. */
        (kasse.teile && kasse.teile.length > 1
          ? " · Konferenz + Schicht zusammen" : "") +
        ((daten.konferenz && daten.konferenz.art === "trocken") ||
         (daten.lauf && daten.lauf.art === "trocken") ? " · TROCKEN, nichts bezahlt" : "") +
        // Ohne diesen Zusatz sieht die Kachel bei fehlendem Lauf aus wie eine
        // Auskunft über diese Maschine. Sie ist dann das hinterlegte Beispiel.
        ((daten.lauf && daten.lauf._ausBeispiel) || (daten.konferenz && daten.konferenz._ausBeispiel)
          ? " · mitgeliefert, nicht von diesem Gerät" : "");
      $("#k-ms").textContent = kasse.msGesamt != null ? msText(kasse.msGesamt) : "nicht gemessen";
    } else {
      $("#k-schicht").textContent = "–";
      $("#k-schicht-sub").textContent = "keine Schicht geladen";
      $("#k-ms").textContent = "–";
    }

    // Anthropic-Belege
    var t = $("#belege"), koerper = el("tbody"); leer(t);
    var b = daten.belege;
    if (verschlossen.belege) {
      tresorZeile(t, "belege");
      $("#belege-hinweis").textContent = "";
    } else if (!b || !b.belege) {
      var z = el("tr"); z.appendChild(el("td", "fehlt leise",
        "Die Beleg-Datei fehlt. Das heißt NICHT „keine Kosten\" — es heißt, hier steht nichts."));
      koerper.appendChild(z); t.appendChild(koerper);
      $("#belege-hinweis").textContent = "";
    } else {
      /*
       * NACH WÄHRUNG GETRENNT. Die Abo-Reihe läuft in Euro, der API-Beleg in
       * Dollar. Bis zum 2026-08-22 addierte diese Tabelle beides zu einer Zahl
       * mit €-Zeichen — solange nur ein Ausschnitt ohne Dollar-Beleg dastand,
       * fiel es nicht auf. Ein Wechselkurs wäre geraten, und eine geratene Zahl
       * klingt genau wie eine gemessene.
       */
      var summe = {}, anzahl = {}, waehrungen = [];
      b.belege.forEach(function (x) {
        var w = x.waehrung || "EUR";
        if (waehrungen.indexOf(w) < 0) waehrungen.push(w);
        summe[w] = summe[w] || {}; anzahl[w] = anzahl[w] || {};
        summe[w][x.art] = (summe[w][x.art] || 0) + x.brutto;
        anzahl[w][x.art] = (anzahl[w][x.art] || 0) + 1;
      });
      var kopf = el("tr");
      ["Art", "Belege", "brutto"].forEach(function (h, i) { kopf.appendChild(el("th", i === 2 ? "zahl" : null, h)); });
      koerper.appendChild(kopf);
      waehrungen.forEach(function (w) {
        ["abo", "mehrverbrauch", "api"].forEach(function (art) {
          var n = (anzahl[w][art] || 0);
          if (!n && waehrungen.length > 1) return;   // leere Zeile je Währung spart nichts
          var z2 = el("tr");
          z2.appendChild(el("td", null, (GELD[art] || art) + (waehrungen.length > 1 ? "  · " + w : "")));
          z2.appendChild(el("td", null, n ? String(n) : "keiner"));
          z2.appendChild(el("td", "zahl", n ? geld(summe[w][art] || 0, w) : "–"));
          koerper.appendChild(z2);
        });
        var ges = el("tr");
        var alle = Object.keys(summe[w]).reduce(function (a, k2) { return a + summe[w][k2]; }, 0);
        var stk = Object.keys(anzahl[w]).reduce(function (a, k2) { return a + anzahl[w][k2]; }, 0);
        ges.appendChild(el("td", null, "zusammen" + (waehrungen.length > 1 ? "  · " + w : "")));
        ges.appendChild(el("td", null, String(stk)));
        ges.appendChild(el("td", "zahl", geld(alle, w)));
        koerper.appendChild(ges);
      });
      t.appendChild(koerper);
      $("#belege-hinweis").textContent = (b.unvollstaendig ? "Unvollständig. " : "") +
        (b.hinweis || "") + " Fenster: " + (b.fenster || "?") + "." +
        (waehrungen.length > 1 && b.waehrungs_hinweis ? "  " + b.waehrungs_hinweis : "");
    }

    // Bauzeit
    var zt = $("#zeiten"), k3 = el("tbody"); leer(zt);
    var z3 = daten.zeiten;
    if (verschlossen.zeiten) {
      tresorZeile(zt, "zeiten");
      $("#k-bau").textContent = "🔒";
    } else if (!z3 || !z3.tage) {
      var zz = el("tr"); zz.appendChild(el("td", "fehlt leise",
        "Nicht gesammelt. `node tools/zeiten-sammeln.mjs` erzeugt die Datei."));
      k3.appendChild(zz); zt.appendChild(k3);
      $("#k-bau").textContent = "–";
    } else {
      var kopf3 = el("tr");
      ["Tag", "Commits", "Untergrenze"].forEach(function (h, i) { kopf3.appendChild(el("th", i ? "zahl" : null, h)); });
      k3.appendChild(kopf3);
      z3.tage.forEach(function (tg) {
        var r = el("tr");
        r.appendChild(el("td", null, tg.tag));
        r.appendChild(el("td", "zahl", String(tg.commits)));
        r.appendChild(el("td", "zahl", tg.minuten + " min"));
        k3.appendChild(r);
      });
      zt.appendChild(k3);
      var gesM = z3.tage.reduce(function (a, x) { return a + x.minuten; }, 0);
      $("#k-bau").textContent = Math.floor(gesM / 60) + " h " + (gesM % 60) + " min";
    }
  }

  // ── Stechuhr ────────────────────────────────────────────────────────────
  /*
   * ═══ DIE STOPPUHR (1.9, Klaus 2026-08-22) ═══════════════════════════════
   *
   * „Meine Stechuhr muss zusammengefügt werden — die zusammenhängende Zeit und
   * Dauer, die ich gesessen habe. Nach jedem Aktualisieren startet es wieder
   * bei null." Und nachgeschoben: „Den Wert der Uhr kann man übernehmen und
   * die Uhr dort anfangen lassen, wo sie aufgehört hat — oder neu anfangen,
   * wie eine Stoppuhr."
   *
   * ZWEI FEHLER LAGEN ÜBEREINANDER, und nur der zweite war ein Fehler:
   *
   *   1. Die große Anzeige zeigte NUR den laufenden Abschnitt. Nach dem Stopp
   *      stand dort 0:00:00, obwohl die Summe daneben stimmte. Das ist keine
   *      Stoppuhr, das ist eine Eieruhr.
   *   2. `uhrLaeuft` lebte NUR im Arbeitsspeicher. Wer die Uhr laufen ließ und
   *      neu lud — und Klaus lädt oft neu, der ⟳-Knopf gehört zu seinem
   *      Arbeitsweg — verlor den ganzen laufenden Abschnitt. Nicht nur die
   *      Anzeige: die Zeit war wirklich weg.
   *
   * DIE VORLAGE STAND FERTIG IN `Mein-WorkFloh/index.html` (`ovClock`) und
   * macht genau das Richtige: Start übernimmt den vorhandenen Wert und zählt
   * von dort weiter, und der Wert steht IM FELD, nicht im Arbeitsspeicher.
   * Übertragen, nicht erfunden.
   *
   * ══ DREI KNÖPFE, DREI VERSCHIEDENE DINGE ═══
   *
   *   ▶ Start   zählt WEITER, wo die Uhr stehen geblieben ist
   *   ■ Stopp   hält an — der Stand bleibt stehen
   *   ⟲ Neu     setzt die Uhr auf null, UND SONST NICHTS
   *
   * ⚠ „Neu" und „Verlauf löschen" sind zwei verschiedene Dinge, und der Brief
   * hat ausdrücklich verlangt, das vor dem Tippen zu entscheiden. Ein Knopf,
   * der beim einen Nutzer die Uhr und beim anderen den Verlauf löscht, ist
   * eine Falle.
   *
   * Gelöst über eine NULL-MARKE statt über Löschen: ⟲ merkt sich den
   * Zeitpunkt (`uhrNull`), und die Uhr zählt nur Abschnitte ab dieser Marke.
   * Damit setzt ⟲ die Uhr wirklich auf null und verliert dabei KEINE Zeile —
   * die Abschnitte samt ihrem „woran" bleiben im Verlauf stehen, und die
   * Gesamtsumme unten stimmt weiter. Löschen tut nur der Knopf, der so heißt.
   *
   * ══ ZWEI ZAHLEN, ZWEI BEDEUTUNGEN ═══
   *
   *   Die STOPPUHR  misst den laufenden Vorgang — seit dem letzten ⟲.
   *   Die KACHEL    misst alles, was je gestempelt wurde.
   *
   * Beide stehen beschriftet da. Eine Zahl ohne Beschriftung, neben der eine
   * andere Zahl mit demselben Aussehen steht, ist eine Verwechslung mit Ansage.
   *
   * ══ WARUM SEKUNDEN UND NICHT MINUTEN ═══
   *
   * Der Brief riet zu Minuten wie in WorkFloh („eine Umrechnung weniger").
   * Dagegen steht ein härteres Argument: die schon gestempelten Zeilen in
   * Klaus' Browser tragen `sekunden`. Ein Wechsel der Einheit machte aus
   * 3600 Sekunden 3600 Minuten — sechzig Stunden, die niemand gearbeitet hat,
   * und zwar rückwirkend und stumm. Gespeichert wird also weiter in Sekunden;
   * MINUTEN werden dort ausgegeben, wo eine Zahl weitergereicht wird
   * (Protokoll, Kostenrechnung), mit einer Nachkommastelle wie in WorkFloh.
   * Abweichung vom Brief, benannt statt umfahren.
   */
  var uhrLaeuft = null;   // {von: ms, was: string} — UND im Speicher, siehe oben

  /* Aus dem Speicher zurückholen. Ohne das war der laufende Abschnitt nach
     jedem Aktualisieren weg — der eigentliche Befund. */
  function uhrHolen() {
    var g = lies("uhrLaeuft", null);
    uhrLaeuft = (g && typeof g.von === "number" && g.von > 0) ? g : null;
    /* Eine Uhr, die aus dem Speicher kommt, läuft auch WEITER — sonst stünde
       die Zeit still, während die Anzeige behauptet, sie liefe. */
    if (uhrLaeuft && !tickHandle) tickHandle = setInterval(uhrTick, 1000);
  }

  function uhrAbschnitte() { return lies("stechuhr", []); }
  function uhrNull() { return Number(lies("uhrNull", 0)) || 0; }

  /*
   * ══ DIE UHR PER ADRESSE STARTEN (Klaus 2026-08-26) ═════════════════════════
   *
   * Klaus: „Starte dazu nach Sitzungsbeginn die Arbeitszeituhr in KIMHUB als
   * Schichtbeginn für mich."
   *
   * Eine Sitzung kann das nicht. Die Uhr lebt im `localStorage` DIESES
   * Browsers, und in einen fremden Browser kommt keine Sitzung hinein
   * (NETZWEIT § 6b, die Grenzen, die man nachschlägt statt neu zu entdecken).
   * Was geht, ist der nächstbeste Weg: ein Lesezeichen mit `?stechuhr=start`,
   * ein Antippen statt Suchen.
   *
   * ⚠ SIE MUSS IDEMPOTENT SEIN, UND DAS IST KEIN SCHÖNHEITSFEHLER.
   *
   * Der Knopf `#uhr-start` ist ein WECHSEL: läuft die Uhr, PAUSIERT er sie.
   * Eine Adresse, die denselben Weg nähme, hielte die Uhr an, sobald Klaus
   * sein Lesezeichen ein zweites Mal öffnet — und das sähe aus wie ein Start.
   * Deshalb startet sie hier NUR, wenn keine läuft, und pausiert nie.
   *
   * `?was=` beschriftet den Abschnitt. Ohne Angabe steht „Sitzungsbeginn"
   * darin, damit eine so gestartete Zeile später von einer von Hand
   * gestempelten zu unterscheiden ist.
   */
  var UHR_MARKE = "stechuhr=start";

  function uhrPerAdresse() {
    var such = "";
    try { such = location.search || ""; } catch (e) { return false; }
    if (such.indexOf(UHR_MARKE) < 0) return false;
    if (uhrLaeuft) return false;           /* läuft schon: NICHT pausieren */

    var was = "";
    try { was = (new URLSearchParams(such).get("was") || "").trim(); } catch (e) { was = ""; }
    uhrLaeuft = { von: Date.now(), was: (was || "Sitzungsbeginn").slice(0, 80) };
    schreib("uhrLaeuft", uhrLaeuft);
    if (!tickHandle) tickHandle = setInterval(uhrTick, 1000);
    return true;
  }

  /* Der Stand der STOPPUHR: alle Abschnitte seit der letzten Null plus der
     laufende. Genau das, was „weiterzählen, wo sie stehen geblieben ist"
     bedeutet — und es kommt aus dem Speicher, überlebt also das Neuladen. */
  function uhrStand() {
    var n = uhrNull(), sek = 0;
    uhrAbschnitte().forEach(function (e) { if ((e.von || 0) >= n) sek += e.sekunden || 0; });
    if (uhrLaeuft) sek += (Date.now() - uhrLaeuft.von) / 1000;
    return sek;
  }

  /*
   * ══ DIE SCHICHTEN ZÄHLEN MIT (Klaus 2026-08-24) ═══════════════════════════
   *
   *   „Jede Schicht die läuft dokumentieren und meine Zeit vom auslösen bis zum
   *    ende der Schicht mitrechnen, auch wenn ich nicht händisch im Programm
   *    Kimhub ausgelöst habe, da ich vor Termux nur manuell auslösen kann."
   *
   * Der Grund ist bauartbedingt und keine Bequemlichkeit: von Termux aus gibt es
   * keinen Knopf. Wer dort `node schicht/lauf.mjs` tippt, arbeitet — nur drückt
   * niemand die Stechuhr. Bis heute fiel diese Zeit deshalb heraus, und ein
   * Stundennachweis mit Löchern an genau den Tagen, an denen gearbeitet wurde,
   * ist schlimmer als keiner.
   *
   * Die Fahrten kommen daher als Abschnitte in dieselbe Liste — MARKIERT, damit
   * eine gestempelte Stunde und eine gefahrene nie verwechselt werden.
   */
  /*
   * Die Rechnung liegt in `zeit.js` — EINE Stelle für beide Welten.
   *
   * Sie stand bis zum 2026-08-25 hier, eingeschlossen in diese Klammer. Prüfbar
   * war sie damit nur im Browser, und die Gegenprobe fährt ohne Browser: acht
   * Wächter waren einzeln richtig und haben im echten Lauf nichts gemessen.
   * Eine Rechnung, die über einen Stundennachweis entscheidet, gehört dorthin,
   * wo sie überall läuft.
   */
  function zeitApi() { return window.WERKSTATT_ZEIT; }
  function fahrtAbschnitte() { return zeitApi().fahrtAbschnitte(daten.fahrten); }
  function vereinigt(a) { return zeitApi().vereinigt(a); }

  /** Gestempeltes und Gefahrenes in einer Liste, nach Beginn geordnet. */
  /*
   * ⚠ WAS GESTEMPELT IST — EINSCHLIESSLICH DER LAUFENDEN UHR (Klaus
   * 2026-09-07, mit Bild: 0:00:00 gestempelt + 1:25:14 gefahren, und die
   * grosse Zahl sagte 4:58).
   *
   * Der laufende Abschnitt steckte in der SUMME, aber in keiner der beiden
   * Haelften — `alleAbschnitte()` haengte ihn an, die Aufteilung darunter las
   * `uhrAbschnitte()`, also nur das schon Abgelegte. Die Kachel rechnete
   * damit sichtbar nicht auf, und **eine Aufteilung, die nicht aufgeht, macht
   * die Summe daneben unglaubwuerdig — auch wenn die Summe stimmt.**
   *
   * Beide lesen jetzt DIESELBE Liste. Zwei Stellen, die dasselbe
   * zusammenstellen, liefen auseinander.
   */
  function gestempelteAbschnitte() {
    var a = uhrAbschnitte();
    if (uhrLaeuft) a = a.concat([{ von: uhrLaeuft.von,
      sekunden: (Date.now() - uhrLaeuft.von) / 1000,
      was: uhrLaeuft.was, laeuft: true }]);
    return a;
  }

  function alleAbschnitte() {
    return gestempelteAbschnitte().concat(fahrtAbschnitte())
      .sort(function (x, y) { return (x.von || 0) - (y.von || 0); });
  }

  /* Alles, was je gearbeitet wurde — die Kachel in der Buchhaltung. Eine
     andere Frage als die Stoppuhr, deshalb eine andere Zahl.
     Seit dem 2026-08-24 zählen die Fahrten mit, und zwar VEREINIGT. */
  function uhrGesamt() { return vereinigt(alleAbschnitte()).sekunden; }
  function uhrUeberlappung() { return vereinigt(alleAbschnitte()).ueberlappungSek; }

  /* Minuten mit einer Nachkommastelle — die Einheit, in der die Zeit das Haus
     verlässt (Protokoll, Kostenrechnung). Wie `ovParseMin`/`persist()` in
     WorkFloh, damit beide Werkstätten dieselbe Sprache sprechen. */
  function minuten(sek) { return Math.round(sek / 6) / 10; }

  /*
   * DER STUNDENSATZ — und die Regel, die mit ihm kommt.
   *
   * Klaus: „Sichtbar natürlich in der Buchhaltung — es ist Arbeitszeit, die
   * Geld kostet." Stimmt. Aber: die Stunden sind GEMESSEN, ein Euro-Betrag
   * braucht einen Satz, den niemand gesetzt hat. Ihn zu erfinden wäre genau
   * der Fehler, gegen den in diesem Repo drei Tafeln stehen — eine geratene
   * Zahl klingt genau wie eine gemessene.
   *
   * Also: ohne Satz stehen die Stunden da und daneben, DASS kein Satz
   * hinterlegt ist. Kein „0,00 €", das nach gemessen aussieht. Genau wie
   * BookLedgerPro es tut.
   *
   * Gerechnet wird wie in `BookLedgerPro/src/domain/kalkulation.js`:
   *   zeitkosten({stunden, satzCentProStd}) = rundeCent(stunden × satz)
   * In CENT, nicht in Euro-Gleitkommazahlen — dieselbe Entscheidung wie dort,
   * und aus demselben Grund: 0,1 + 0,2 ist in Gleitkomma nicht 0,3.
   */
  function satzCent() {
    var c = Number(lies("stundensatzCent", null));
    return (isFinite(c) && c > 0) ? Math.round(c) : null;
  }
  /* ⚠ EINE Rechnung, EINE Stelle. Sie liegt seit dem 2026-09-08 in `zeit.js`,
     weil das Dashboard-Paket sie auch braucht — zwei Abschriften derselben
     Geldrechnung liefen auseinander, und dann naennte die Datei einen anderen
     Betrag als die Seite darueber. */
  function zeitkostenCent(sek, cent) {
    return zeitApi().kostenCent(sek, cent);
  }

  /*
   * Den laufenden Abschnitt ablegen und die Uhr anhalten. EINE Stelle, weil
   * zwei Wege sie brauchen (■ Stopp und ⟲ Neu) — zwei Abschriften liefen
   * auseinander, und dann verlöre der eine, was der andere behält.
   *
   * ⚠ NICHT GERUNDET. Hier stand `Math.round(… / 1000)`, und das kostete bei
   * jedem Stopp bis zu einer halben Sekunde — rückwirkend und stumm. Gemessen
   * hat es die eigene Probe: die Gesamtzeit war nach ⟲ kleiner als davor,
   * obwohl ⟲ ausdrücklich keine Zeit verlieren darf. Gespeichert wird jetzt
   * der genaue Wert; GERUNDET wird beim ANZEIGEN, wo es hingehört.
   */
  function uhrAbschnittAblegen(feierabend) {
    if (!uhrLaeuft) return false;
    var sek = (Date.now() - uhrLaeuft.von) / 1000;
    var liste = uhrAbschnitte();
    liste.push({ von: uhrLaeuft.von, sekunden: sek,
                 was: ($("#uhr-was") ? $("#uhr-was").value.trim() : "") || uhrLaeuft.was,
                 /* Der Unterschied zwischen Pause und Feierabend steht IN der
                    Zeile, nicht nur im Kopf des Nutzers. Sonst sieht ein
                    unterbrochener Tag genauso aus wie ein beendeter — und
                    genau das ist die Frage, die eine Stechuhr beantworten
                    soll. Alte Zeilen haben das Feld nicht; `!x.feierabend`
                    liest sie richtig als „nur unterbrochen". */
                 feierabend: feierabend === true });
    schreib("stechuhr", liste);
    uhrLaeuft = null;
    schreib("uhrLaeuft", null);
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    return true;
  }

  /*
   * ══ DEN ZWECK EINER GESTEMPELTEN ZEILE NACHTRAGEN ══════════════════════════
   *
   * Die Regel steht in `zeit.js` (`zweckNachtragen`) — dort, weil sie sich
   * nachrechnen laesst und die Gegenprobe ohne Browser faehrt. Hier steht nur
   * die Bedienung.
   *
   * ⚠ KEIN `prompt()`. Auf Klaus' Tablet ist ein Systemdialog das Gegenteil von
   * einem benannten Knopf in der Seite, und Chrome darf ihn unterdruecken —
   * dann waere es ein toter Knopf, der aussieht, als haette man ihn nicht
   * gedrueckt. Bearbeitet wird IN der Zeile.
   */
  function zweckSpeichern(von, text) {
    var liste = uhrAbschnitte();
    /* Gesucht wird ueber den BEGINN, und es muss genau einer sein. Zwei Treffer
       hiessen, dass die Identitaet der Zeile nicht eindeutig ist — dann lieber
       gar nichts aendern als die falsche. */
    var treffer = [];
    liste.forEach(function (e, i) { if ((e.von || 0) === von) treffer.push(i); });
    if (treffer.length !== 1) return { ok: false, grund: "nicht_eindeutig" };
    var r = zeitApi().zweckNachtragen(liste[treffer[0]], text, new Date().toISOString());
    if (!r.ok) return r;
    liste[treffer[0]] = r.eintrag;
    schreib("stechuhr", liste);
    return r;
  }

  var ZWECK_GRUND = {
    leer: "Ein Zweck laesst sich berichtigen, nicht loeschen — schreib hinein, woran du sassest.",
    unveraendert: "Da steht schon dasselbe.",
    fahrt: "Diese Zeile kommt aus dem Fahrtenbuch, nicht aus der Stechuhr — sie wird dort gefuehrt.",
    laeuft: "Die Uhr laeuft noch. Beschrifte sie im Feld ueber der Liste.",
    nicht_eindeutig: "Diese Zeile ist im Speicher nicht eindeutig zu finden. Nichts geaendert."
  };

  /** Tauscht die Zelle gegen ein Feld mit ✓ und ✗. */
  function zweckBearbeiten(zelle, e) {
    if (zelle.getAttribute("data-bearbeitet") === "ja") return;
    zelle.setAttribute("data-bearbeitet", "ja");
    var vorher = zelle.innerHTML;
    leer(zelle);
    var feld = document.createElement("input");
    feld.type = "text";
    feld.className = "zweck-feld";
    feld.value = e.was || "";
    feld.setAttribute("data-zweck-feld", String(e.von));
    feld.placeholder = "Woran hast du gesessen?";
    var meldung = el("small", "leise", "");
    meldung.setAttribute("data-zweck-meldung", "");

    function zurueck() { zelle.innerHTML = vorher; zelle.removeAttribute("data-bearbeitet"); }
    function sichern() {
      var r = zweckSpeichern(e.von, feld.value);
      if (!r.ok) { meldung.textContent = ZWECK_GRUND[r.grund] || r.grund; return; }
      /* Neu zeichnen statt die Zelle von Hand nachzuziehen: sonst stuenden zwei
         Wege nebeneinander, die dasselbe darstellen, und liefen auseinander. */
      zelle.removeAttribute("data-bearbeitet");
      uhrZeichnen();
    }
    var ja = el("button", "mini", "✓");
    ja.setAttribute("data-zweck-sichern", String(e.von));
    ja.title = "Zweck uebernehmen";
    ja.onclick = sichern;
    var nein = el("button", "mini", "✗");
    nein.setAttribute("data-zweck-abbrechen", String(e.von));
    nein.title = "Abbrechen";
    nein.onclick = zurueck;
    feld.onkeydown = function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); sichern(); }
      if (ev.key === "Escape") { ev.preventDefault(); zurueck(); }
    };
    zelle.appendChild(feld);
    zelle.appendChild(ja);
    zelle.appendChild(nein);
    zelle.appendChild(meldung);
    try { feld.focus(); } catch (ignoriert) {}
  }

  /*
   * ══ DIE MONATSTABELLE ══════════════════════════════════════════════════════
   *
   * Klaus 2026-09-08: „die stunden trotzdem erfassen immer für den jeweiligen
   * Monat am Ende zusammengefasst, damit es später in einem Dashboard erfasst
   * werden kann."
   *
   * Die Rechnung liegt in `zeit.js` (`monatsSummen`) — dort ist sie ohne
   * Browser messbar. Hier steht nur die Darstellung.
   *
   * ⚠ DER BETRAG NUR MIT SATZ. Ohne hinterlegten Stundensatz steht kein
   * „0,00 €" da: die Stunden sind gemessen, der Betrag nicht. Eine geratene
   * Zahl klingt genau wie eine gemessene.
   */
  var MONATSNAMEN = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
                     "August", "September", "Oktober", "November", "Dezember"];

  function monatName(schluessel) {
    var t = String(schluessel).split("-");
    var i = Number(t[1]) - 1;
    return (MONATSNAMEN[i] || t[1]) + " " + t[0];
  }

  function zeichneMonate() {
    var t = $("#uhr-monate");
    if (!t) return;
    var koerper = el("tbody"); leer(t);
    var reihen = zeitApi().monatsSummen(alleAbschnitte());
    t.setAttribute("data-monate", String(reihen.length));
    if (!reihen.length) {
      var z = el("tr"); z.appendChild(el("td", "leise", "Noch nichts zu summieren."));
      koerper.appendChild(z); t.appendChild(koerper); return;
    }
    var c = satzCent();
    var kopf = el("tr");
    var spalten = ["Monat", "gestempelt", "gefahren", "zusammen"];
    if (c) spalten.push("Betrag");
    spalten.forEach(function (h, i) {
      var th = el("th", i === 0 ? null : "zahl", h);
      /* Die Spalte traegt die Marke — sonst steht die Ueberschrift „Betrag"
         ueber einer leeren Spalte, und das sieht nach einem Fehler aus. */
      if (h === "Betrag") th.setAttribute("data-chef", "geld");
      kopf.appendChild(th);
    });
    koerper.appendChild(kopf);

    var gesamt = 0;
    reihen.forEach(function (m) {
      gesamt += m.sekunden;
      var r = el("tr");
      r.setAttribute("data-monat", m.monat);
      r.setAttribute("data-sekunden", String(Math.round(m.sekunden)));
      r.appendChild(el("td", null, monatName(m.monat)));
      r.appendChild(el("td", "zahl", uhrzeit(m.gestempeltSek)));
      r.appendChild(el("td", "zahl", uhrzeit(m.gefahrenSek)));
      var zus = el("td", "zahl", uhrzeit(m.sekunden));
      /* Was doppelt dalag, steht IN der Zeile — sonst rechnet der Leser
         gestempelt + gefahren zusammen und findet einen Fehler, der keiner
         ist. Dieselbe Regel wie in der Kachel oben. */
      if (m.doppeltSek >= 1)
        zus.appendChild(el("small", "leise", " (davon " + uhrzeit(m.doppeltSek) + " doppelt)"));
      r.appendChild(zus);
      if (c) {
        var bz = el("td", "zahl", eur(zeitkostenCent(m.sekunden, c) / 100));
        bz.setAttribute("data-chef", "geld");
        r.appendChild(bz);
      }
      koerper.appendChild(r);
    });

    /* Die Fusszeile ist die Gegenprobe zur Kachel oben: beide muessen dieselbe
       Gesamtzeit nennen. Steht sie nicht da, kann niemand nachrechnen, ob die
       Monatsaufteilung vollstaendig ist. */
    var f = el("tr");
    f.setAttribute("data-monate-gesamt", String(Math.round(gesamt)));
    f.appendChild(el("td", null, "zusammen"));
    f.appendChild(el("td", "zahl", ""));
    f.appendChild(el("td", "zahl", ""));
    f.appendChild(el("td", "zahl", uhrzeit(gesamt)));
    if (c) {
      var fz = el("td", "zahl", eur(zeitkostenCent(gesamt, c) / 100));
      fz.setAttribute("data-chef", "geld");
      f.appendChild(fz);
    }
    koerper.appendChild(f);
    /* ⚠ DIE MARKE ALLEIN REICHT NICHT. `chefZeichnen` laeuft beim Zeichnen der
       Karte; diese Zellen entstehen SPAETER und waeren sonst sichtbar, bis
       zufaellig etwas anderes neu zeichnet. Genau daran hing Klaus' Befund. */
    t.appendChild(koerper);
    /* ⚠ NACH dem Einhaengen, nicht davor. Die erste Fassung stand eine Zeile
       hoeher und lief damit ueber eine Tabelle, die noch gar nicht im
       Dokument stand — der Riegel griff ins Leere, und die frischen
       Betrag-Zellen standen offen. Derselbe Fehler wie immer: die
       Reihenfolge. Gefunden hat es der Waechter, nicht das Nachdenken. */
    chefZeichnen();

    /*
     * ⚠ ZWEI ZAHLEN AUF EINER SEITE, BEIDE RICHTIG (Klaus 2026-09-08). Seine
     * Kachel stand auf 25:18:32, diese Tabelle auf 24:19:33 — untereinander,
     * ohne ein Wort dazwischen. Die Differenz war eine laufende Uhr.
     *
     * Beides ist richtig: die Kachel zeigt den Stand JETZT, die Monatssummen
     * nur abgeschlossene Abschnitte, weil die Dauer einer laufenden noch
     * nicht feststeht. Der Satz steht seit demselben Tag auch in der
     * Uebergabe — hier fehlte er, und das ist die Stelle, an der man es SIEHT.
     */
    var hin = $("#monate-laeuft");
    if (hin) {
      var satz = zeitApi().laufendeUhrSatz(uhrLaeuft);
      hin.textContent = satz ? "Die Uhr laeuft gerade: " + satz : "";
      hin.setAttribute("data-monate-laeuft", satz ? "ja" : "nein");
      hin.hidden = !satz;
    }
  }

  function uhrZeichnen() {
    var t = $("#uhr-liste"), koerper = el("tbody"); leer(t);
    var gesamt = uhrGesamt();
    if ($("#k-klaus")) $("#k-klaus").textContent = uhrzeit(gesamt);
    if ($("#k-klaus-sub")) {
      var c = satzCent();
      var k = zeitkostenCent(gesamt, c);
      /* Zwei Zustände, beide ehrlich: mit Satz die Rechnung, ohne Satz die
         Auskunft, dass keiner hinterlegt ist. Nie eine Null. */
      /*
       * ⚠ DIE KACHEL SAGT, WORAUS SIE BESTEHT (Klaus 2026-09-07, mit Bild).
       *
       * Sie hiess „Klaus' Zeit (Stechuhr) — alles" und zeigte 1:01:41 samt
       * 46,27 €. Gestempelt hatte er davon NICHTS: jede Zeile im Verlauf
       * darunter sagte selbst „aus dem Fahrtenbuch". Das sind die Fahrten der
       * Agenten — Zeit, in der die Werkstatt lief, nicht unbedingt Zeit, in
       * der er davorsass.
       *
       * ⚠ DIE FAHRTEN BLEIBEN DRIN, und das ist Absicht: vor Termux gibt es
       * keinen Knopf, und ein Stundennachweis mit Löchern an genau den Tagen,
       * an denen gearbeitet wurde, ist schlimmer als keiner. Was fehlte, war
       * die AUFTEILUNG — nicht die Summe.
       *
       * **Eine Zahl, die zwei Herkünfte mischt, ohne sie zu nennen, ist keine
       * Messung, sondern eine Behauptung.** Ein Betrag darauf ist eine Zahl,
       * die niemand belegen kann. Die Aufteilung steht deshalb IMMER da, auch
       * ohne Stundensatz.
       */
      var gestempeltSek = vereinigt(gestempelteAbschnitte()).sekunden;
      var gefahrenSek = vereinigt(fahrtAbschnitte()).sekunden;
      /*
       * ⚠ UND WAS DOPPELT DALIEGT, STEHT DABEI. Die beiden Haelften werden
       * jede fuer sich vereinigt; ueberschneiden sie sich — die Stechuhr
       * laeuft, waehrend eine Schicht faehrt —, ist ihre Summe groesser als
       * die Gesamtzeit. Beide Zeilen stimmen fuer sich, nur ihre Summe nicht;
       * genau der Fall, den die Verfassung „dieselbe Stunde zaehlt EINMAL"
       * nennt.
       *
       * Gerechnet aus den DREI Zahlen, die schon dastehen — kein zweiter
       * Rechenweg. Und nur genannt, wenn es wirklich etwas zu nennen gibt:
       * eine Zeile „0:00:00 doppelt" waere Zierde.
       */
      var auf = zeitApi().aufteilung(gestempeltSek, gefahrenSek, gesamt);
      var doppeltSek = auf.doppeltSek;
      var teile = "davon " + uhrzeit(gestempeltSek) + " gestempelt · " +
        uhrzeit(gefahrenSek) + " gefahren" +
        (doppeltSek >= 1 ? " · " + uhrzeit(doppeltSek) + " doppelt, zählt einmal" : "") +
        /* ⚠ UND WENN SIE TROTZDEM NICHT AUFGEHT, STEHT DAS DA. Der Fall soll
           nicht mehr vorkommen — aber ihn stillschweigend hinzunehmen hiesse,
           genau die Zahlen wieder nebeneinanderzustellen, an denen Klaus sich
           gestossen hat. Eine benannte Lücke ist Arbeit, eine verschwiegene
           ist Schaden. */
        (auf.gehtAuf ? "" : " · ⚠ die Aufteilung geht nicht auf");
      $("#k-klaus-sub").textContent = (c
        ? minuten(gesamt).toFixed(1).replace(".", ",") + " min × " +
          eur(c / 100) + "/h = " + eur(k / 100)
        : "kein Stundensatz hinterlegt — die Stunden sind gemessen, der Betrag nicht")
        + " · " + teile;
      $("#k-klaus-sub").setAttribute("data-gestempelt", String(Math.round(gestempeltSek)));
      $("#k-klaus-sub").setAttribute("data-gefahren", String(Math.round(gefahrenSek)));
      $("#k-klaus-sub").setAttribute("data-doppelt", String(Math.round(doppeltSek)));
      $("#k-klaus-sub").setAttribute("data-satz", c ? String(c) : "keiner");
      /* Das ERGEBNIS als eigene Angabe. Der Satz daneben nennt beide Zahlen —
         den Stundensatz UND den Betrag —, und eine Prüfung, die im Text nach
         „30,00 €" sucht, findet den Stundensatz und ist zufrieden, auch wenn
         die Rechnung „0,00 €" ergibt. Genau so ist es passiert: die Gegenprobe
         ließ `zeitkostenCent` `null` zurückgeben, und der Wächter blieb grün.
         Bewacht wird die Zahl, nicht das Zeichen. */
      $("#k-klaus-sub").setAttribute("data-kosten-cent",
        (k === null || k === undefined) ? "keine" : String(k));
    }
    uhrAnzeigen();

    /* Gestempeltes UND Gefahrenes. Zwei Herkünfte, eine Liste — getrennt
       ausgewiesen, nie stillschweigend vermischt. */
    var zeilen = alleAbschnitte().filter(function (e) { return !e.laeuft; });
    if (!zeilen.length && !uhrLaeuft) {
      var z = el("tr"); z.appendChild(el("td", "leise",
        "Noch nichts gestempelt und keine Fahrt im Buch."));
      koerper.appendChild(z); t.appendChild(koerper);
      return;
    }
    var kopf = el("tr");
    ["Wann", "Woran", "Dauer"].forEach(function (h, i) { kopf.appendChild(el("th", i === 2 ? "zahl" : null, h)); });
    koerper.appendChild(kopf);
    var n = uhrNull();
    zeilen.forEach(function (e) {
      var r = el("tr");
      /* Die Abschnitte, die die Stoppuhr gerade zählt, sind markiert — sonst
         wäre nicht zu sehen, woraus ihr Stand besteht, und ⟲ sähe aus, als
         hätte es etwas gelöscht. */
      if (!e.automatisch && (e.von || 0) >= n) r.className = "uhr-jetzt";
      if (e.feierabend) r.className += " uhr-schluss";
      if (e.automatisch) r.setAttribute("data-herkunft", "fahrt");
      r.appendChild(el("td", null, new Date(e.von).toLocaleString("de-DE")));
      /* ⚠ NUR DER TEXT WIRD GEFALTET, NICHT DIE ZELLE. Der ✎-Knopf und die
         Zusatz-Angaben ("ausgecheckt", "aus dem Fahrtenbuch") bleiben
         draussen — ein Knopf in einem geschlossenen Aufklapper ist
         unsichtbar, und das hat in dieser Sitzung schon zweimal Zeit
         gekostet. */
      var woran = el("td");
      woran.appendChild(langerText(e.was || "—"));
      /* Der Schlussstrich steht IN der Zeile — man sieht, wo ein Arbeitstag
         zu Ende war und wo nur eine Pause lag. */
      if (e.feierabend) woran.appendChild(el("small", "leise", "  — ausgecheckt"));
      /* WOHER die Zeile kommt, steht in der Zeile. Eine gefahrene Stunde und
         eine gestempelte sind beide Arbeit, aber nicht dasselbe Beweisstück:
         die eine misst ein Programm, die andere ein Mensch. */
      if (e.automatisch)
        woran.appendChild(el("small", "leise", "  — aus dem Fahrtenbuch" +
          (e.echt ? "" : ", trocken") + (e.wer ? ", " + e.wer : "")));
      /*
       * ⚠ EINE NACHGETRAGENE ANGABE SIEHT MAN AN. Ohne diesen Zusatz waere eine
       * spaeter beschriftete Zeile von einer sofort beschrifteten nicht zu
       * unterscheiden — und ein Nachweis, dem man die Aenderung nicht ansieht,
       * ist von einer Faelschung nicht zu unterscheiden. Genannt wird, WANN und
       * WAS vorher dastand; „(vorher leer)" ist dabei eine Auskunft, kein
       * Platzhalter.
       */
      if (!e.automatisch && Array.isArray(e.wasVerlauf) && e.wasVerlauf.length) {
        var letzte = e.wasVerlauf[e.wasVerlauf.length - 1];
        var wann = String(letzte.geaendert || "").slice(0, 10);
        var zuvor = String(letzte.zuvor || "").trim();
        var hinweis = el("small", "leise", "  — Zweck nachgetragen" +
          (wann ? " am " + wann : "") +
          (zuvor ? " (vorher: „" + zuvor + "\u201c)" : " (vorher leer)") +
          (e.wasVerlauf.length > 1 ? ", " + e.wasVerlauf.length + "\u00d7 geaendert" : ""));
        hinweis.setAttribute("data-zweck-verlauf", String(e.wasVerlauf.length));
        woran.appendChild(hinweis);
      }
      /* Der Knopf steht NUR an gestempelten Zeilen. Eine Fahrt gehoert dem
         Fahrtenbuch; ein Knopf daran versprache eine Aenderung, die beim
         naechsten Laden wieder weg waere. */
      if (!e.automatisch) {
        var stift = el("button", "mini", "\u270e");
        stift.setAttribute("data-zweck-knopf", String(e.von));
        stift.title = "Zweck nachtragen \u2014 die Zeiten bleiben, wie gemessen";
        stift.onclick = (function (zelle, eintrag) {
          return function () { zweckBearbeiten(zelle, eintrag); };
        })(woran, e);
        woran.appendChild(stift);
      }
      r.appendChild(woran);
      /* ⚠ KEINE ERFUNDENE NULL. Eine alte Fahrt ohne Beginn hat keine messbare
         Spanne — dann steht das da, nicht „0:00". */
      r.appendChild(el("td", "zahl", e.ohneZeit ? "nicht gemessen" : uhrzeit(e.sekunden)));
      koerper.appendChild(r);
    });
    var v = vereinigt(alleAbschnitte());
    var g = el("tr");
    g.appendChild(el("td", null, "zusammen"));
    g.appendChild(el("td", null, ""));
    g.appendChild(el("td", "zahl", uhrzeit(v.sekunden)));
    g.setAttribute("data-gesamt-sekunden", String(Math.round(v.sekunden)));
    koerper.appendChild(g);
    /*
     * DIE KORREKTUR WIRD GENANNT, NICHT VERSTECKT. Lief die Stechuhr, während
     * eine Schicht fuhr, ist die Summe kleiner als die Zeilen darüber — wer das
     * nicht erklärt bekommt, hält es für einen Rechenfehler und rechnet von
     * Hand nach. Eine Korrektur, die man nicht sieht, ist von einem Fehler
     * nicht zu unterscheiden.
     */
    if (v.ueberlappungSek > 1) {
      var u = el("tr"); u.setAttribute("data-ueberlappung", String(Math.round(v.ueberlappungSek)));
      var ut = el("td", "leise", "davon doppelt erfasst und EINMAL gezählt: " +
        uhrzeit(v.ueberlappungSek) + " — gestempelt und gefahren zugleich");
      ut.setAttribute("colspan", "3");
      u.appendChild(ut); koerper.appendChild(u);
    }
    /* Und die Zeilen ohne messbare Spanne werden gezählt, statt lautlos zu
       fehlen: „drei Fahrten ohne Zeit" ist eine Auskunft, ihr Wegfall nicht. */
    var ohne = zeilen.filter(function (e) { return e.ohneZeit; }).length;
    if (ohne) {
      var o = el("tr"); o.setAttribute("data-ohne-zeit", String(ohne));
      var ot = el("td", "leise", ohne + (ohne === 1 ? " Fahrt hat" : " Fahrten haben") +
        " keine gemessene Spanne (vor dem 2026-08-24 eingetragen) und " +
        (ohne === 1 ? "zählt" : "zählen") + " deshalb nicht mit.");
      ot.setAttribute("colspan", "3");
      o.appendChild(ot); koerper.appendChild(o);
    }
    t.appendChild(koerper);
    zeichneMonate();
  }

  /* Die große Anzeige — der STAND der Stoppuhr, nicht der laufende Abschnitt.
     Das war Klaus' erster Befund: „Nach jedem Aktualisieren startet es wieder
     bei null." Es startete auch nach jedem STOPP bei null. */
  function uhrAnzeigen() {
    var a = $("#uhr-anzeige");
    if (!a) return;
    var stand = uhrStand();
    /* ⚠ DAUER, NICHT UHRZEIT. `uhrzeit()` gaebe `15:29:48` — und Klaus hat das
       am 2026-09-08 als „drei Uhr nachmittags" gelesen, zu Recht: das IST die
       Form einer Uhrzeit, und `uhrzeitJetzt()` weiter unten gibt echte
       Uhrzeiten genauso aus. Die Zahl selbst war richtig. Begruendung in
       `zeit.js` bei `dauerLang`. */
    a.textContent = zeitApi().dauerLang(stand);
    a.setAttribute("data-sekunden", String(Math.round(stand)));
    a.setAttribute("data-laeuft", uhrLaeuft ? "ja" : "nein");
    /* Und die zweite Haelfte seines Befunds: eine abgeschlossene Zaehlung soll
       man AN DER ZAHL sehen, nicht drei Zeilen tiefer im Kleingedruckten. */
    var lage = $("#uhr-lage");
    if (lage) {
      var aus = !uhrLaeuft && zeitApi().standAusgecheckt(uhrAbschnitte(), uhrNull());
      lage.textContent = aus ? "ausgecheckt \u2014 \u25b6 beginnt eine neue Z\u00e4hlung" : "";
      lage.setAttribute("data-uhr-lage", aus ? "ausgecheckt" : (uhrLaeuft ? "laeuft" : "bereit"));
    }
    var st = $("#uhr-start");
    /*
     * EIN KNOPF, ZWEI ZUSTÄNDE (Klaus 2026-08-22): „Start und danach muss das
     * Pausenzeichen kommen, in demselben Button und dann Pause und wieder
     * Start, also immer im Wechsel."
     *
     * Ein Umschalter, dem man nichts ansieht, ist keiner — deshalb wechselt
     * hier BEIDES: die Aufschrift und `aria-pressed`. Die Aufschrift ist für
     * den Finger, `aria-pressed` für den Vorleser. Nur eines von beidem wäre
     * ein Knopf, den die Hälfte der Leute nicht versteht.
     */
    if (st) {
      st.setAttribute("aria-pressed", uhrLaeuft ? "true" : "false");
      st.setAttribute("data-uhr", uhrLaeuft ? "laeuft" : "bereit");
      st.textContent = uhrLaeuft ? "❚❚ Pause" : "▶ Start";
      /* Der Knopf sagt selbst, was er als Naechstes tut — nach einem
         Feierabend ist das etwas anderes als nach einer Pause. */
      var neuAn = zeitApi().startSetztNeuAn(!!uhrLaeuft, uhrAbschnitte(), uhrNull());
      st.title = uhrLaeuft ? "Pause — ▶ zählt danach weiter"
               : neuAn ? "Start — beginnt eine neue Zählung; der Verlauf bleibt vollständig"
                       : "Start — und beim zweiten Druck Pause";
      st.setAttribute("data-uhr-neu-an", neuAn ? "ja" : "nein");
    }
  }

  function uhrTick() {
    if (!uhrLaeuft) { if (tickHandle) { clearInterval(tickHandle); tickHandle = null; } return; }
    uhrAnzeigen();
    uhrZeichnen();
  }

  /*
   * FÜR DAS PROTOKOLL (Klaus: „Den Wert weitergeben / speichern für das
   * Protokoll.").
   *
   * ⚠ DIE GRENZE ZUERST: eine Seite im Browser kann NICHT in eine Datei im
   * Depot schreiben. Das Fahrtenbuch legt `schicht/lauf.mjs` an — Node, nicht
   * die Seite. Die Stechuhr kann den Wert also nur HERAUSGEBEN; hineinlegen
   * muss ihn jemand. Von den drei Wegen im Brief ist das der erste und
   * einfachste, und er braucht keine neue Mechanik.
   *
   * ⚠ UND DER INTERNE SATZ VERLÄSST DAS HAUS NICHT — per WHITELIST, nicht per
   * Vorsicht. Der Block wird aus einer FESTEN Feldliste gebaut (Tag · woran ·
   * Minuten · Summe). Was hier nicht ausdrücklich steht, kann nicht hinaus,
   * auch wenn morgen ein Feld dazukommt. Das ist die PRIME DIRECTIVE aus
   * `BookLedgerPro/src/domain/angebote.js`, und sie wird dort genauso
   * durchgesetzt: „Verschnitt, Maschinensatz, interner Stundenkostensatz,
   * Marge … verlassen das Haus NIE."
   *
   * Der Satz geht nur mit, wenn Klaus den Haken setzt — Vorgabe ist AUS.
   */
  /*
   * Die Whitelist. Nichts sonst.
   *
   * `herkunft` ist am 2026-08-24 dazugekommen — AUSDRÜCKLICH, nicht nebenbei.
   * Seit die Fahrten mitzählen, stehen im Block zwei Sorten Zeilen: von Hand
   * gestempelte und aus dem Fahrtenbuch gelesene. Wer das nicht unterscheiden
   * kann, hat einen Nachweis, den er nicht erklären kann — und ein Nachweis,
   * den man nicht erklären kann, ist keiner.
   *
   * Der interne Stundensatz bleibt draussen wie zuvor: die Liste ist FEST, und
   * was nicht darin steht, kann nicht hinaus, auch wenn morgen ein Feld
   * dazukommt.
   */
  var PROTOKOLL_FELDER = ["tag", "woran", "minuten", "herkunft"];

  function protokollText() {
    var liste = alleAbschnitte().filter(function (e) { return !e.laeuft; });
    /* Verborgen heisst auch: nicht in den Text und nicht in die Datei, die
       jemand weitergibt. Zwei Wege zum selben Geld — beide bewacht. */
    var mitKosten = lies("satzMitgeben", false) === true && !geldVerborgen();
    var c = satzCent();
    var z = [];
    z.push("Deine Zeit an der Werkstatt - Stechuhr und Fahrtenbuch");
    z.push(new Array(50).join("-"));
    if (!liste.length) {
      z.push("Keine Abschnitte gestempelt und keine Fahrt im Buch.");
      return z.join("\n") + "\n";
    }
    var v = vereinigt(liste);
    liste.forEach(function (e) {
      /* Zeile für Zeile aus der Whitelist gebaut — nicht aus dem Eintrag. */
      var roh = { tag: new Date(e.von).toLocaleString("de-DE"),
                  woran: e.was || "-",
                  minuten: e.ohneZeit ? "nicht gemessen"
                    : minuten(e.sekunden || 0).toFixed(1).replace(".", ",") + " min",
                  herkunft: e.automatisch ? "Fahrtenbuch" : "gestempelt" };
      var teile = PROTOKOLL_FELDER.map(function (f) { return roh[f]; });
      z.push(teile.join("  |  "));
    });
    z.push(new Array(50).join("-"));
    /*
     * ⚠ DIE SUMME IST NICHT DIE SUMME DER ZEILEN. Sie ist die VEREINIGUNG der
     * Zeiträume — wer die Stechuhr laufen lässt, während eine Schicht fährt,
     * hat eine Stunde gearbeitet und nicht zwei. Steht ausdrücklich dabei,
     * sonst rechnet der Leser nach und findet einen Fehler, der keiner ist.
     */
    var summe = v.sekunden;
    z.push("zusammen: " + uhrzeit(summe) + "  (" +
      minuten(summe).toFixed(1).replace(".", ",") + " min)");
    z.push("gerechnet ueber die Zeitraeume, nicht als Summe der Zeilen.");
    if (v.ueberlappungSek > 1)
      z.push("davon doppelt erfasst und EINMAL gezaehlt: " + uhrzeit(v.ueberlappungSek));
    var ohne = liste.filter(function (e) { return e.ohneZeit; }).length;
    if (ohne)
      z.push(ohne + " Fahrt(en) ohne gemessene Spanne zaehlen nicht mit " +
        "(vor dem 2026-08-24 eingetragen).");
    var lauf = zeitApi().laufendeUhrSatz(uhrLaeuft);
    if (lauf) { z.push(lauf); }
    z.push("Gemessen wird vom Start des Befehls bis zu seinem Ende. Die Zeit davor");
    z.push("(Depot holen, Schluessel bereitlegen, Auftrag aussuchen) misst niemand.");
    if (mitKosten && c) {
      z.push("Arbeitskosten: " + eur(zeitkostenCent(summe, c) / 100) +
        "  (" + eur(c / 100) + " je Stunde)");
      z.push("");
      /* Der Vorbehalt reist MIT. Er steht so in der Nutzungsmappe von
         Mein-WorkFloh und macht die Zahl erst ehrlich: eine Stunde am
         Schreibtisch ist nicht dasselbe wie eine Stunde auf einer Rechnung. */
      z.push("Hinweis: eingesparte oder aufgewendete Zeit wirkt nur dann voll als");
      z.push("Geld, wenn sie produktiv bzw. abrechenbar genutzt wird.");
    } else if (mitKosten) {
      z.push("Arbeitskosten: nicht gerechnet - kein Stundensatz hinterlegt.");
    } else if (geldVerborgen() && c) {
      /* ⚠ WO GEKUERZT WURDE, STEHT DASS GEKUERZT WURDE. Die Zeile stumm
         wegzulassen war der erste Anlauf, und der Unterschied ist nicht
         Kosmetik: ein Blatt ohne Kosten-Zeile sieht aus wie eines, fuer das
         nie ein Satz hinterlegt war. Eine stille Luecke ist schlimmer als
         eine benannte — die eine wirft Fragen auf, die andere beantwortet sie.
         Gefunden hat es der eigene Waechter, nicht das Nachdenken. */
      z.push("Arbeitskosten: verborgen (Chef-Code) - zum Herausgeben zuerst die Zahlen zeigen.");
    }

    /*
     * ⚠ DIE MONATE REISEN MIT (Klaus 2026-09-08): „damit es später in einem
     * Dashboard erfasst werden kann." Ein Dashboard bekommt seine Zahlen aus
     * DIESEM Block — die Seite kann nicht selbst ins Depot schreiben.
     *
     * Feste Feldliste wie die Zeilen darueber: was hier nicht ausdruecklich
     * steht, kann nicht hinaus, auch wenn morgen ein Feld dazukommt. Der
     * Betrag nur, wenn der Satz ausdruecklich mitgegeben wird — er ist eine
     * INTERNE Kalkulationszahl.
     */
    var monate = zeitApi().monatsSummen(liste);
    if (monate.length) {
      z.push("");
      z.push("Monatssummen");
      z.push(new Array(50).join("-"));
      z.push("Monat    |  gestempelt  |  gefahren  |  zusammen (min)" +
             (mitKosten && c ? "  |  Betrag" : ""));
      var summeMonate = 0;
      monate.forEach(function (m) {
        summeMonate += m.sekunden;
        var teile = [m.monat,
                     minuten(m.gestempeltSek).toFixed(1).replace(".", ",") + " min",
                     minuten(m.gefahrenSek).toFixed(1).replace(".", ",") + " min",
                     minuten(m.sekunden).toFixed(1).replace(".", ",") + " min"];
        if (mitKosten && c) teile.push(eur(zeitkostenCent(m.sekunden, c) / 100));
        z.push(teile.join("  |  "));
      });
      z.push(new Array(50).join("-"));
      /*
       * ⚠ DIE PROBE AUFS EXEMPEL STEHT DABEI. Die Summe der Monate MUSS die
       * Gesamtzeit sein — dafuer wird ein Abschnitt an der Monatsgrenze
       * geteilt. Wer die Zahl nicht danebenschreibt, laesst den Leser raten,
       * ob die Aufteilung vollstaendig ist; und eine unvollstaendige sieht
       * genauso aus wie eine vollstaendige.
       */
      z.push("Summe der Monate: " + minuten(summeMonate).toFixed(1).replace(".", ",") +
             " min - dieselbe Gesamtzeit wie oben.");
      z.push("Ein Abschnitt ueber den Monatswechsel wird geteilt, nicht seinem");
      z.push("Startmonat zugeschlagen. Jeder Monat ist fuer sich vereinigt:");
      z.push("doppelt Erfasstes zaehlt auch dort nur einmal.");
    }
    z.push("");
    return z.join("\n");
  }

  function zeichneProtokoll() {
    var ziel = $("#uhr-protokoll");
    if (!ziel) return;
    leer(ziel);
    /* Auch hier BEIDE Herkünfte. Stünde hier weiter nur die Stechuhr, wäre der
       Knopf „Mitnehmen" der eine Ort, an dem die Fahrten wieder fehlten — und
       genau dieser Text ist der, der für die Forschung das Haus verlässt. */
    var liste = alleAbschnitte().filter(function (e) { return !e.laeuft; });
    ziel.setAttribute("data-abschnitte", String(liste.length));
    ziel.setAttribute("data-fahrten",
      String(liste.filter(function (e) { return e.automatisch; }).length));
    if (!liste.length) {
      ziel.appendChild(el("p", "leise",
        "Noch nichts zu übergeben — keine gestempelten Abschnitte und keine Fahrt im Buch."));
      return;
    }
    mitnehmKnoepfe(ziel, "eigene-zeit.txt", protokollText(), "text/plain");

    /*
     * ⚠ UND DAS JSON DANEBEN (Klaus 2026-09-08: „JSON für das Dashboard").
     *
     * Zwei Fassungen, EINE Quelle: beide rechnen aus `monatsSummen`. Die
     * Textfassung ist zum Lesen, diese zum Weiterverarbeiten. Zwei Rechenwege
     * liefen auseinander, und dann saehe das Dashboard etwas anderes als der
     * Mensch daneben.
     *
     * Der Stundensatz reist nur mit, wenn er ausdruecklich mitgegeben wird —
     * dieselbe Whitelist-Regel wie im Text.
     */
    /* Verborgen heisst auch: nicht in den Text und nicht in die Datei, die
       jemand weitergibt. Zwei Wege zum selben Geld — beide bewacht. */
    var mitKosten = lies("satzMitgeben", false) === true && !geldVerborgen();
    var zone = "";
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { zone = ""; }
    var buchFuerPaket = daten.fahrten && daten.fahrten.fahrten;
    var paket = zeitApi().dashboardPaket(liste, {
      erzeugt: new Date().toISOString(),
      zeitzone: zone,
      satzCent: mitKosten ? satzCent() : 0,
      agenten: buchFuerPaket && buchFuerPaket.length
        ? window.WERKSTATT_KASSEN.fahrtSummen(buchFuerPaket) : null
    });
    var erklaerung = el("p", "leise");
    erklaerung.setAttribute("data-json-erklaerung", "");
    erklaerung.textContent = "Die JSON-Datei traegt die Monatssummen fuer ein " +
      "Dashboard — dieselben Zahlen wie oben, nur maschinenlesbar. Die " +
      "einzelnen Zeilen stehen nur in der Textfassung.";
    ziel.appendChild(erklaerung);
    mitnehmKnoepfe(ziel, "eigene-zeit.json",
      JSON.stringify(paket, null, 2), "application/json");
    zeichneGesamt(liste, paket);
  }

  /*
   * ⚠ DAS GESAMT-BLATT (Klaus 2026-09-08: "am Ende auch fuer die
   * Agententaetigkeit die Stunden auch da einen Gesamtdashboard und als Text
   * laesst sich das ja so und so runterladen").
   *
   * Es rechnet NICHTS eigenes. Die eigenen Zahlen kommen aus demselben Paket,
   * das "eigene-zeit.json" traegt, die Agenten-Zahlen aus `fahrtSummen()` in
   * `kassen.js` — DERSELBEN Funktion, aus der die Kachel oben rechnet. Zwei
   * Stellen, die dasselbe behaupten, laufen auseinander, und dann sagte das
   * Blatt unten etwas anderes als die Tabelle oben.
   *
   * Und es addiert die beiden Spalten NICHT. Sie messen verschiedene Dinge und
   * ueberschneiden sich; eine Summe daraus waere eine Zahl, die es an keinem
   * Tag gab.
   */
  /*
   * ⚠ EIN DEUTSCHES BLATT SCHREIBT 929,8 — NICHT 929.8 (Klaus 2026-09-08, an
   * seiner heruntergeladenen gesamt.txt gesehen). Der Punkt kommt aus
   * JavaScript, nicht aus einer Entscheidung.
   *
   * Sie steht an EINER Stelle. Fuenf `replace(".", ",")` im Text waeren fuenf
   * Stellen, an denen die naechste vergessen wird — und die JSON-Fassung
   * daneben MUSS den Punkt behalten, sonst liest sie kein Programm mehr.
   */
  function deZahl(n) {
    return String(n == null ? "" : n).replace(".", ",");
  }

  function gesamtText(paket, ag) {
    var z = [], zeitApi_ = zeitApi();
    z.push("Gesamt - deine Zeit und die Agenten");
    z.push("Erzeugt: " + new Date().toLocaleString("de-DE"));
    z.push("");
    z.push("DEINE ZEIT (Stechuhr + Fahrtenbuch-Zeilen)");
    z.push("  zusammen        " + zeitApi_.dauerLang(paket.gesamt.sekunden)
      + "  (" + deZahl(paket.gesamt.minuten) + " min)");
    z.push("  davon gestempelt " + zeitApi_.dauerLang(paket.gesamt.gestempeltSek));
    z.push("  davon gefahren   " + zeitApi_.dauerLang(paket.gesamt.gefahrenSek));
    z.push("  doppelt erfasst, EINMAL gezaehlt: " + zeitApi_.dauerLang(paket.gesamt.doppeltSek));
    /* ⚠ WO GEKUERZT WURDE, STEHT DASS GEKUERZT WURDE. Die Zeile einfach
       wegzulassen waere eine stille Luecke — der Leser hielte das Blatt fuer
       vollstaendig.
       ⚠⚠ UND DIE ERSTE FASSUNG WAR TOTER CODE: sie stand unter
       `betragCent != null`, und bei gesetztem Code traegt das Paket gar keinen
       Betrag (`satzCent: 0`). Der „verborgen"-Zweig konnte nie laufen — eine
       Zusicherung, die genau dann schweigt, wenn sie gebraucht wird. Gefunden
       hat es der eigene Waechter, weil er die DATEI liest statt den Knopf. */
    if (geldVerborgen())
      z.push("  Betrag          verborgen (Chef-Code) - zum Herausgeben zuerst die Zahlen zeigen");
    else if (paket.gesamt.betragCent != null)
      z.push("  Betrag          " + deZahl((paket.gesamt.betragCent / 100).toFixed(2)) + " EUR");
    z.push("  Monate: " + (paket.monate.length
      ? paket.monate.map(function (m) { return m.monat + " " + deZahl(m.minuten) + " min"; }).join(", ")
      : "keine"));
    z.push("");
    if (ag) {
      z.push("AGENTEN (Fahrtenbuch)");
      z.push("  Fahrten         " + ag.fahrten + "  (echt gemeint " + ag.echte
        + ", davon mit Kosten " + ag.bezahlte + ")");
      z.push("  an Tagen        " + ag.tage);
      z.push("  Fahrzeit        " + deZahl(ag.minuten) + " min  (Trockenlaeufe zaehlen mit)");
      z.push("  Kosten          " + deZahl(ag.eur.toFixed(2))
        + " EUR  (nur echte Fahrten; Trockenlaeufe kosten nichts)");
    } else {
      z.push("AGENTEN (Fahrtenbuch)");
      z.push("  Auf dieser Maschine liegt kein Fahrtenbuch. Das heisst NICHT");
      z.push("  \"keine Kosten\" - es heisst, hier steht nichts.");
    }
    z.push("");
    var lauf2 = zeitApi().laufendeUhrSatz(uhrLaeuft);
    if (lauf2) { z.push(lauf2); z.push(""); }
    z.push("Die beiden Bloecke werden NICHT addiert: eine Fahrt laeuft oft,");
    z.push("waehrend die Stechuhr laeuft. Die Ueberschneidung steht oben.");
    return z.join("\n");
  }

  function zeichneGesamt(liste, paket) {
    var t = $("#gesamt"), m = $("#gesamt-mitnehmen");
    if (!t || !m) return;                       // alte Seite im Vorrat
    var buch = daten.fahrten && daten.fahrten.fahrten;
    /*
     * ⚠ DIESELBE FUNKTION WIE DIE KACHEL OBEN, nicht eine zweite daneben.
     * Am 2026-09-08 stand hier ein eigenes `agentenSummen`, und Klaus' Seite
     * zeigte 1,63 EUR in der Kachel und 1,75 EUR im Blatt darunter — beide
     * sahen richtig aus. Ursache war ein Feld, das ich mir ausgedacht hatte
     * (`art === "trocken"` statt `echt: false`): der Trockenlauf zaehlte als
     * echt, und seine GERECHNETEN Euro flossen ins Geld.
     */
    var ag = buch && buch.length ? window.WERKSTATT_KASSEN.fahrtSummen(buch) : null;
    /* Dasselbe Paket wie oben, nur mit dem Buch daran. Nicht neu gerechnet. */
    var voll = paket;
    if (ag) {
      voll = {}; for (var f in paket) if (Object.prototype.hasOwnProperty.call(paket, f)) voll[f] = paket[f];
      voll.agenten = ag;
      voll.art = "kimhub-gesamt";
    }
    var k = el("tbody"); leer(t);
    var kopf = el("tr");
    ["", "Du", "Agenten"].forEach(function (h, i) {
      kopf.appendChild(el("th", i ? "zahl" : null, h));
    });
    k.appendChild(kopf);
    var zeile = function (was, a, b, geld) {
      var r = el("tr");
      /* Nur die GELD-Zeile geht zu. „Stechuhr fuer alle, Zahlen nur fuer den
         Betreiber" — die Zeit-Zeilen darueber bleiben stehen. */
      if (geld) r.setAttribute("data-chef", "geld");
      r.appendChild(el("td", null, was));
      r.appendChild(el("td", "zahl", a));
      r.appendChild(el("td", "zahl", b));
      k.appendChild(r);
    };
    var d = zeitApi().dauerLang;
    zeile("Zeit", d(paket.gesamt.sekunden), ag ? deZahl(ag.minuten) + " min" : "–");
    zeile("davon gestempelt", d(paket.gesamt.gestempeltSek), "–");
    zeile("davon gefahren", d(paket.gesamt.gefahrenSek), "–");
    /* ⚠ OHNE DIESE ZEILE SIEHT DIE SPALTE WIE EIN RECHENFEHLER AUS:
       15:29:48 + 7:47:24 sind 23:17:12, oben stehen 16:30:25. Die Kachel
       nennt die Ueberschneidung, das Blatt tat es nicht. */
    zeile("doppelt, zählt einmal", d(paket.gesamt.doppeltSek), "–");
    zeile("Fahrten", "–", ag ? ag.fahrten + " (echt gemeint " + ag.echte
      + ", mit Kosten " + ag.bezahlte + ")" : "–");
    zeile("Kosten", paket.gesamt.betragCent != null
      ? (paket.gesamt.betragCent / 100).toFixed(2).replace(".", ",") + " €" : "–",
      ag ? ag.eur.toFixed(2).replace(".", ",") + " €" : "–", true);
    t.appendChild(k);
    t.setAttribute("data-gesamt-agenten", ag ? "ja" : "nein");

    /* ⚠ DIE MARKE ALLEIN REICHT NICHT — dieselbe Stelle wie in der
       Monats-Tabelle: diese Zeile entsteht SPAETER als das Zeichnen der Karte. */
    chefZeichnen();

    leer(m);
    if (!ag) m.appendChild(el("p", "leise",
      "Ohne Fahrtenbuch trägt das Blatt nur deine Zeit — das steht auch darin."));
    /*
     * ⚠ ZWEI WEGE ZUM SELBEN GELD, UND EINER WAR BEWACHT. Das Blatt traegt
     * die Kosten der Agenten (`agenten.eur`) auch dann, wenn die Karte, aus
     * der sie stammen, verborgen ist. Der Knopf, der es HERAUSGIBT, geht
     * deshalb mit zu — und ein Satz sagt, warum er fehlt, statt ihn
     * stillschweigend verschwinden zu lassen.
     */
    var hin = el("p", "leise", "Zum Mitnehmen zuerst die Zahlen zeigen —"
      + " das Blatt trägt Beträge, und der Chef-Code gilt.");
    hin.setAttribute("data-gesamt-verborgen", "");
    hin.setAttribute("data-chef", "nur-zu");
    m.appendChild(hin);
    var raus = el("div");
    raus.setAttribute("data-chef", "geld");
    mitnehmKnoepfe(raus, "gesamt.txt", gesamtText(voll, ag), "text/plain");
    mitnehmKnoepfe(raus, "gesamt.json", JSON.stringify(voll, null, 2), "application/json");
    m.appendChild(raus);
    chefZeichnen();
  }

  // ── Abspielen ───────────────────────────────────────────────────────────
  function setzeStand(n) {
    stand = Math.max(0, Math.min(achse.length, n));
    $("#leiste").value = String(stand);
    var p = achse[stand - 1];
    $("#uhr").textContent = stand + " / " + achse.length + (p ? " · " + msText(p.ms) : "");
    var reden = document.querySelectorAll(".rede");
    for (var i = 0; i < reden.length; i++) {
      var idx = Number(reden[i].getAttribute("data-i"));
      reden[i].classList.toggle("da", idx < stand);
      reden[i].classList.toggle("jetzt", idx === stand - 1);
    }
    /* Die Bühne läuft am selben Stand wie der Text — sonst zeigte das Bild
       einen anderen Schritt als die Zeile darunter, und man glaubte dem
       falschen. */
    /* `laeuft` geht MIT: die Bühne holt den laufenden Beitrag nur dann heran,
       wenn wirklich abgespielt wird. Wer von Hand weiterklickt, hat den Blick
       schon dort — ihm die Seite unter dem Finger wegzuziehen wäre eine
       Zumutung. (Klaus 1.3: anhalten und lesen können.) */
    if (buehne) buehne.zeigeStand(stand - 1, laeuft);
    if (p) {
      var ziel = document.getElementById("raum" + raumVon(p));
      var sicht = reden[stand - 1];
      if (laeuft && sicht && sicht.scrollIntoView) sicht.scrollIntoView({ block: "center", behavior: "smooth" });
      else if (laeuft && ziel) ziel.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  /* ── Eine Schicht aus der Seite heraus beginnen ──────────────────────────
   *
   * Ein Browser kann kein Programm auf dem Gerät starten. Deshalb gibt es
   * `tools/pult.mjs` — einen Helfer, den Klaus EINMAL startet und der auf
   * 127.0.0.1 zuhört. Läuft er, ist der Knopf scharf.
   *
   * UND WENN ER NICHT LÄUFT, IST DER KNOPF NICHT TOT. Er sagt in einem Satz,
   * was fehlt, und legt den Befehl zum Kopieren daneben. Ein Knopf, hinter dem
   * nichts liegt, ist schlimmer als ein fehlender — das ist die Regel, die im
   * ganzen Netz gilt.
   *
   * Der Deckel bleibt im Läufer. Dieser Knopf drückt denselben Hebel wie ein
   * Aufruf von Hand; er baut keinen zweiten und umgeht keine Bremse. */
  var PULT = "http://127.0.0.1:8787";

  /*
   * `marke` sagt, WELCHE Meldung hier steht. Ohne sie hing die Bühnen-Probe am
   * Wortlaut — und zwei Meldungen fingen mit denselben Wörtern an: die eine
   * beim Laden, die andere nach dem Klick. Die Probe wartete auf „Text länger
   * als 10 Zeichen", und das war beim Klick längst wahr; sie las die ALTE
   * Meldung und war meistens zufällig grün. (Befund 2026-08-22, im vollen Lauf
   * aufgefallen, einzeln nie.)
   */
  function schichtLage(text, befehl, marke) {
    var z = $("#schicht-lage");
    if (!z) return;
    z.setAttribute("data-lage", marke || "");
    leer(z);
    z.appendChild(document.createTextNode(text));
    if (befehl) {
      z.appendChild(document.createTextNode(" "));
      var c = el("code", null, befehl);
      c.style.cssText = "user-select:all;cursor:pointer";
      c.title = "anklicken markiert den ganzen Befehl";
      z.appendChild(c);
    }
  }

  /* ⚠ AUF DIE BEDINGUNG WARTEN, NICHT AUF DIE UHR.
     Hier stand ein Nachladen nach fester Frist (vier Sekunden). Eine echte
     Konferenz dauert aber Minuten, nicht vier Sekunden: die Seite hätte
     nachgeladen, als es noch nichts Neues gab, und danach nie wieder. Man
     hätte dagesessen und gedacht, es passiert nichts.
     Das ist dieselbe Falle, vor der die Verfassung dieses Repos an zwei
     Stellen warnt, und ich bin hineingelaufen. Jetzt wird gefragt, bis der
     Helfer sagt, dass die Schicht fertig ist — und solange steht es auch da. */
  var verfolgUhr = null;
  function verfolgeSchicht() {
    if (verfolgUhr) clearInterval(verfolgUhr);
    var seit = Date.now();
    verfolgUhr = setInterval(function () {
      fetch(PULT + "/da", { cache: "no-store" })
        .then(function (a) { return a.json(); })
        .then(function (d) {
          if (!d) return;
          if (d.laeuft) {
            var min = Math.floor((Date.now() - seit) / 60000);
            var sek = Math.floor(((Date.now() - seit) % 60000) / 1000);
            schichtLage("Die Schicht läuft — seit " +
              (min ? min + " min " : "") + sek + " s. Das dauert seine Zeit.");
            return;
          }
          clearInterval(verfolgUhr); verfolgUhr = null;
          schichtLage("Die Schicht ist fertig. Die Bühne zeigt jetzt den neuen Lauf.");
          laden();
        })
        .catch(function () {
          /* Der Helfer ist weg (Strg+C). Nicht still weiterlaufen: sagen. */
          clearInterval(verfolgUhr); verfolgUhr = null;
          schichtLage("Der Helfer antwortet nicht mehr. Was gelaufen ist, liegt in werkstatt/ — Seite neu laden zeigt es.");
        });
    }, 2000);
  }

  /*
   * ══ EIN KLICK, EIN BLOCK, EINMAL EINFÜGEN ═══════════════════════════════
   *
   * Klaus am 2026-08-22, und das war der Blocker: „Schichtbeginn klicke ich an
   * und der Helfer läuft nicht. In Termux einmal starten. Was soll ich in
   * Termux starten? Ich hab keinen Code … Das heißt, ich müsste jetzt wieder
   * zu dir gehen."
   *
   * Er hat recht, und der Knopf war damit **ein toter Knopf mit Erklärung** —
   * die schlimmste Sorte, weil sie aussieht wie Hilfe. Er nannte einen Befehl
   * (`git pull && node tools/pult.mjs`), der einen HELFER startet. Danach hätte
   * Klaus zurück auf die Seite gemusst und noch einmal drücken. Zwei Wege, und
   * der zweite stand nirgends.
   *
   * Was er will: „ein Klick, ein Code, Copy, Paste rein. Und dann müsste die
   * Schicht laufen, ohne dass ich noch irgendwas anderes eingeben muss."
   *
   * ⚠ DIE GRENZE ZUERST, damit niemand am Unmöglichen baut: **eine Seite im
   * Browser kann kein Programm auf dem Gerät starten.** Das ist keine Lücke
   * dieser App, das ist der Sinn der Sandbox. Was sie kann, ist genau zweierlei
   * — und beides tut sie jetzt:
   *
   *   1. den VOLLSTÄNDIGEN Befehl in die Zwischenablage legen (ein Block, der
   *      alles tut: Stand holen, Schlüssel, Schicht fahren, Ansicht öffnen)
   *   2. Termux nach vorn holen, über die Android-Absicht `intent:`
   *
   * Und wenn (2) nicht geht — ein Browser darf das nicht überall —, dann steht
   * das da. Nicht schweigen: der Block liegt trotzdem bereit.
   */
  /*
   * ⚠ ZWEITER ANLAUF — der erste hat bei Klaus NICHTS getan (2026-08-22,
   * abends): „Button hat zwar gewackelt beim Anklicken, aber Termux hat sich
   * nicht geöffnet."
   *
   * Zwei Gründe, beide meine:
   *
   * 1. **Chrome blockiert `intent:` aus einem `iframe`.** Das ist eine
   *    Missbrauchssperre — und ausgerechnet die Konstruktion, die ich gewählt
   *    hatte, weil sie „still scheitert". Sie scheitert still, ja: sie tut gar
   *    nichts. Ein Riegel, der das Richtige verhindert, ist kein Schutz.
   * 2. **Die Fingerberührung war verbraucht.** Zwischen Klick und Versuch lagen
   *    ein Dialog, ein Kopiervorgang und eine Netz-Anfrage. Chrome verlangt für
   *    einen App-Wechsel eine FRISCHE Geste; danach ist sie keine mehr.
   *
   * Der Weg, den Android dafür vorgesehen hat, ist eine Top-Level-Navigation
   * IN der Geste — mit `S.browser_fallback_url`. Damit kann die Seite nicht auf
   * einer Fehlerseite landen: geht es nicht, bringt Chrome uns auf die
   * Ersatz-Adresse, und das ist unsere eigene Seite mit einer Marke dran.
   *
   * Genau das war der Grund, aus dem ich `location.href` beim ersten Mal
   * verworfen hatte (die Seite starb) — die Ersatz-Adresse nimmt ihm das Gift.
   * Der Riegel bleibt also, er sitzt nur an der richtigen Stelle.
   */
  var TERMUX_ZURUECK = "termux=nein";

  function istAndroid() { return /Android/i.test(navigator.userAgent || ""); }

  function termuxAdresse() {
    var zurueck = location.origin + location.pathname + "?" + TERMUX_ZURUECK;
    return "intent:#Intent;package=com.termux;" +
           "action=android.intent.action.MAIN;" +
           "category=android.intent.category.LAUNCHER;" +
           "S.browser_fallback_url=" + encodeURIComponent(zurueck) + ";end";
  }

  /*
   * DER BLOCK. Er tut ALLES, was zwischen dem Klick und einer laufenden
   * Schicht liegt — jeder Schritt, den Klaus sonst selbst wüssen müsste:
   *
   *   cd            weil er in Termux irgendwo stehen kann
   *   git pull      „Cannot find module" ist der häufigste Fehlschlag hier, und
   *                 er kommt nicht vom Code, sondern von einem alten Klon
   *   schluessel    nur beim echten Lauf — ein trockener braucht keinen
   *   lauf.mjs      die Schicht selbst
   *   ansicht.sh    und danach die Werkstatt AUF DEM GERÄT, wo die Dateien
   *                 wirklich liegen. Über GitHub Pages sähe er sein Ergebnis
   *                 sonst nie (die Lauf-Dateien stehen im .gitignore).
   *
   * `&&` und nicht `;`: bricht ein Schritt ab, hört es auf. Ein Block, der
   * nach einem gescheiterten `git pull` trotzdem weiterfährt, baut auf einem
   * Stand, den niemand kennt.
   */
  function schichtBefehl(echt) {
    var teile = ["cd ~/Kimhub", "git pull --quiet"];
    if (echt) teile.push("source tools/schluessel.sh");
    teile.push("node schicht/lauf.mjs " + (echt ? "--echt " : "") + "--nur-konferenz --deckel 3");
    teile.push("bash tools/ansicht.sh");
    return teile.join(" \\\n  && ");
  }

  function zeigeBefehl(echt, lage) {
    var z = $("#schicht-befehl");
    if (!z) return;
    leer(z);
    z.hidden = false;
    z.setAttribute("data-befehl", echt ? "echt" : "trocken");

    z.appendChild(el("h4", null, echt ? "Echte Schicht — in Termux einfügen"
                                      : "Trockener Lauf — in Termux einfügen"));

    var schritte = el("ol");
    /* Der Ctrl-C-Schritt steht ZUERST und wird nicht verschwiegen. Klaus:
       „falls ich in Termux etwas anderes geöffnet hatte … müsste ich das in
       dem Augenblick stoppen können." Eine eingefügte Zeile kann das nicht —
       sie stellt sich hinten an. Das ist eine Tatsache, kein Mangel, und sie
       gehört an den Anfang statt ins Kleingedruckte. */
    schritte.appendChild(el("li", null,
      "Läuft in Termux noch etwas? Erst Strg+C (die Taste steht in Termux' Zusatzreihe über der Tastatur)."));
    schritte.appendChild(el("li", null,
      "Lange auf das Termux-Fenster tippen → Einfügen. Der Block liegt schon in der Zwischenablage."));
    schritte.appendChild(el("li", null,
      echt ? "Enter. Die Schicht läuft, und danach öffnet sich die Werkstatt mit DEINEM Lauf."
           : "Enter. Der Lauf kostet nichts, und danach öffnet sich die Werkstatt."));
    z.appendChild(schritte);

    var block = el("pre", null, schichtBefehl(echt));
    block.title = "antippen markiert den ganzen Block";
    z.appendChild(block);

    var reihe = el("div", "mitnehmen");
    var noch = el("button", null, "⧉ Noch einmal kopieren");
    noch.type = "button";
    /* ⚠ HIESS BIS EBEN `lage` — genauso wie der Parameter dieser Funktion.
       `var` gilt für die ganze Funktion: die Zuweisung hier überschrieb das
       übergebene Objekt, und weiter unten stand deshalb
       `data-termux="undefined"` statt „zu". Die Meldung war gebaut, richtig
       befüllt und wurde von einem Namen erschlagen.
       Gefunden hat es die Probe zum Rückweg — sie las die Angabe statt den
       Augenschein. */
    var kopierLage = el("span", "leise mitnehm-lage");
    kopierLage.setAttribute("data-kopiert", "");
    /* Derselbe Weg wie beim Klick auf „Schicht beginnen" — eine Stelle, die
       den Zustand setzt. Zwei Wege mit eigener Meldung liefen auseinander. */
    noch.addEventListener("click", function () {
      kopiere(schichtBefehl(echt), null).then(setzeKopierLage);
    });
    reihe.appendChild(noch);

    var auf = el("button", null, "↗ Termux öffnen");
    auf.type = "button";
    /* Eine EIGENE, frische Berührung — das ist der Weg mit der besten Aussicht.
       Beim ersten Anlauf hing der Versuch am Ende einer Kette aus Dialog,
       Kopieren und Netz-Anfrage; da war die Geste längst verbraucht. */
    auf.addEventListener("click", function () {
      var m = termuxOeffnen();
      setzeTermuxLage(termuxLage(m));
    });
    reihe.appendChild(auf);
    reihe.appendChild(kopierLage);
    z.appendChild(reihe);

    var t = el("p", "leise");
    t.id = "termux-lage";
    t.setAttribute("data-termux", lage ? lage.marke : "");
    t.textContent = lage ? lage.text : "";
    t.hidden = !lage;
    z.appendChild(t);
  }

  /* Die Termux-Lage nachtragen, ohne den Kasten neu zu bauen — sonst ginge die
     Kopier-Meldung darüber verloren, und die ist die wichtigere von beiden. */
  function setzeTermuxLage(lage) {
    var t = $("#termux-lage");
    if (!t || !lage) return;
    t.hidden = false;
    t.setAttribute("data-termux", lage.marke);
    t.textContent = lage.text;
  }

  /*
   * ⚠ OB DER BLOCK WIRKLICH IN DER ZWISCHENABLAGE LIEGT, MUSS DASTEHEN.
   *
   * Beim ersten Anlauf wurde beim Klick mit `lage = null` kopiert — das
   * Ergebnis ging also nirgendwohin. Klaus hätte nicht erkennen können, ob er
   * etwas zum Einfügen hat; und der Kopier-Knopf im Kasten meldete nur SEINE
   * eigenen Versuche. Ein stiller Erfolg ist von einem stillen Fehlschlag
   * nicht zu unterscheiden.
   */
  function setzeKopierLage(ok) {
    var l = $("#schicht-befehl .mitnehm-lage");
    if (!l) return;
    /* ⚠ MARKE UND WORT AUS EINER ENTSCHEIDUNG. Standen sie in zwei Zeilen,
       ließ sich die Marke auf „ja" drehen, während das Wort weiter „ging
       nicht" sagte — und keine Probe sah den Widerspruch. Zwei Riegel, die
       einander decken, gehören in EINE Zeile. */
    var w = ok ? { m: "ja", t: "Der Block liegt in der Zwischenablage." }
               : { m: "nein", t: "Kopieren ging nicht — den Block oben antippen und von Hand kopieren." };
    l.setAttribute("data-kopiert", w.m);
    l.textContent = w.t;
  }

  /* Für die Rückkehr über die Ersatz-Adresse: Chrome lädt die Seite dann NEU,
     und ohne diese Notiz wüsste sie nicht mehr, welcher Block gemeint war.
     `sessionStorage`, nicht `localStorage` — es gilt für diesen einen Weg. */
  function merkeBefehl(echt) {
    try { sessionStorage.setItem("kimhub_befehl", echt ? "echt" : "trocken"); }
    catch (e) { /* fail-soft: dann fehlt nach der Rückkehr nur der Kasten */ }
  }

  /*
   * ZURÜCK VON EINEM GESCHEITERTEN SPRUNG.
   *
   * `S.browser_fallback_url` bringt Chrome hierher, wenn Termux nicht zu öffnen
   * war. Das ist die EINZIGE Stelle, an der diese Seite es sicher erfährt —
   * gelingt der Sprung, wird sie nie wieder aufgerufen, sie liegt dann nur im
   * Hintergrund. Deshalb wird hier nichts vermutet: die Marke in der Adresse
   * IST die Auskunft.
   */
  var kamZurueck = false;
  function nachFallback() {
    var da = false;
    try { da = location.search.indexOf(TERMUX_ZURUECK) >= 0; } catch (e) { return; }
    if (!da) return;
    /* Damit die Helfer-Abfrage, die gleich antwortet, diese Meldung nicht
       überschreibt. Sie ist beim Laden die allgemeine Auskunft — nach einem
       gescheiterten Sprung ist sie die falsche. */
    kamZurueck = true;
    var echt = "trocken";
    try { echt = sessionStorage.getItem("kimhub_befehl") || "trocken"; } catch (e) {}
    schichtLage("Termux ließ sich nicht öffnen — der Block liegt trotzdem bereit.",
                null, "termux-zu");
    zeigeBefehl(echt === "echt", termuxLage("zu"));
    /* Die Marke wieder aus der Adresse nehmen: sonst stünde die Meldung nach
       jedem Neuladen wieder da, auch wenn längst nichts mehr ansteht. */
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }

  /* Kopieren an EINER Stelle — und es sagt, was passiert ist. Ein Kopier-Knopf,
     der still scheitert, ist von einem toten nicht zu unterscheiden. */
  function kopiere(text, lage) {
    function fertig(wort, marke) {
      if (!lage) return;
      lage.textContent = wort;
      lage.setAttribute("data-kopiert", marke);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () { fertig("in der Zwischenablage.", "ja"); return true; },
        function (e) {
          fertig("Kopieren ging nicht (" + (e && e.name || "?") +
            ") — den Block unten antippen und von Hand kopieren.", "nein");
          return false;
        });
    }
    fertig("Dieser Browser gibt die Zwischenablage nicht her — Block antippen und kopieren.", "nein");
    return Promise.resolve(false);
  }

  /*
   * TERMUX NACH VORN HOLEN — und das MUSS in der Berührung passieren.
   *
   * Der Rückgabewert sagt, was versucht wurde, nicht was daraus wurde: ob
   * Termux wirklich aufgeht, erfährt diese Seite erst danach — entweder gar
   * nicht (dann läuft Termux, und wir liegen im Hintergrund) oder über die
   * Ersatz-Adresse, mit der Chrome zurückkommt. **Behauptet wird nichts.**
   */
  function termuxOeffnen() {
    if (!istAndroid()) return "kein-android";
    try { location.href = termuxAdresse(); return "versucht"; }
    catch (e) { return "geht-nicht"; }
  }

  /* Was der Versuch für den Nutzer heißt — an EINER Stelle, weil drei Wege
     danach fragen (Klick, Ersatz-Adresse, Knopf im Kasten). */
  function termuxLage(marke) {
    if (marke === "kein-android")
      return { marke: marke, text:
        "Termux gibt es nur auf Android — hier läuft die Seite woanders. " +
        "Der Block liegt in der Zwischenablage; auf dem Tablet einfügen." };
    if (marke === "zu")
      return { marke: marke, text:
        "Termux ließ sich nicht öffnen. Das kann an Android liegen (manche " +
        "Fassungen lassen einen Browser keine App starten) — der Block liegt " +
        "bereit: zu Termux wechseln und lange auf das Fenster tippen → Einfügen." };
    if (marke === "geht-nicht")
      return { marke: marke, text:
        "Dieser Browser lässt den Wechsel nicht zu. Der Block liegt bereit — " +
        "Termux von Hand aufmachen und einfügen." };
    return { marke: "versucht", text:
      "Termux wird geöffnet. Bleibt diese Seite stehen, ging es nicht — dann " +
      "steht der Grund hier, sobald der Browser zurück ist." };
  }

  function verdrahteSchichtKnopf() {
    var knopf = $("#schicht-start");
    if (!knopf) return;

    function nachsehen() {
      return fetch(PULT + "/da", { cache: "no-store" })
        .then(function (a) { return a.json(); })
        .catch(function () { return null; });
    }

    /* Zuerst nachsehen, ob wir von einem gescheiterten Sprung zurückkommen —
       das ist die Auskunft, auf die Klaus wartet, und sie darf nicht auf die
       Helfer-Abfrage warten. */
    nachFallback();

    nachsehen().then(function (d) {
      if (!d) {
        knopf.setAttribute("data-pult", "fehlt");
        /*
         * ⚠ HIER STAND EIN BEFEHL, DER DEN HELFER STARTET — und das war ein
         * Weg zu viel. Klaus hätte `node tools/pult.mjs` eingefügt, wäre auf
         * die Seite zurückgegangen und hätte NOCH EINMAL drücken müssen.
         * Der zweite Schritt stand nirgends, und er hat zu Recht gefragt:
         * „Was soll ich in Termux starten?"
         *
         * Jetzt sagt die Meldung beim Laden nur, WAS beim Drücken passiert.
         * Der Block kommt beim Klick — dort, wo er gebraucht wird, und
         * vollständig.
         */
        if (!kamZurueck)
          schichtLage("Auf diesem Gerät läuft kein Helfer — der Knopf legt dir " +
            "stattdessen den vollständigen Befehl in die Zwischenablage und holt " +
            "Termux nach vorn. Einmal einfügen, fertig.", null, "kein-helfer-beim-laden");
      } else {
        knopf.setAttribute("data-pult", "da");
        schichtLage(d.laeuft ? "Es läuft gerade eine Schicht."
                             : "Der Helfer ist bereit — der Knopf ist scharf.", null, "helfer-da");
      }
    });

    knopf.addEventListener("click", function () {
      /*
       * ⚠ DIE REIHENFOLGE IST DER GANZE PUNKT.
       *
       * Gefragt und KOPIERT wird zuerst, noch in der Berührung des Fingers.
       * Erst danach wird der Helfer gesucht. Andersherum — und so stand es
       * hier — läge zwischen Klick und Kopieren eine Netz-Anfrage, und die
       * Berechtigung für die Zwischenablage ist dann in vielen Browsern weg.
       * Der Knopf hätte still nichts kopiert.
       */
      var echt = window.confirm(
        "Eine ECHTE Schicht starten? Sie ruft die Modelle auf und kostet Geld " +
        "(der Deckel im Läufer gilt).\n\nAbbrechen = trockener Lauf, kostet nichts.");

      /*
       * ⚠ ALLES, WAS DIE BERÜHRUNG BRAUCHT, PASSIERT JETZT — vor jeder
       * Netz-Anfrage. Beim ersten Anlauf lag zwischen Klick und Termux-Sprung
       * eine Abfrage beim Helfer, und danach war die Geste verbraucht: Klaus
       * sah den Knopf wackeln, und Termux blieb zu.
       *
       * Ob ein Helfer läuft, wissen wir schon vom Laden her (`data-pult`).
       * Diese Angabe ist Sekunden alt statt frisch — und das ist hier der
       * richtige Handel: eine frische Antwort kostet die Geste, und ohne Geste
       * geht der Sprung gar nicht. Die frische Abfrage kommt gleich danach und
       * korrigiert, falls sich etwas geändert hat.
       */
      var ohneHelfer = knopf.getAttribute("data-pult") !== "da";

      /* Der Block liegt SOFORT bereit — auch wenn gleich der Helfer antwortet.
         Kopieren kostet nichts und rettet den Fall, in dem der Helfer da ist,
         aber gar nicht der Weg war, den Klaus wollte. */
      var kopiert = kopiere(schichtBefehl(echt), null);

      if (ohneHelfer) {
        schichtLage(echt
          ? "Kein Helfer auf diesem Gerät — der Befehl für eine ECHTE Schicht liegt in der Zwischenablage."
          : "Kein Helfer auf diesem Gerät — der Befehl für einen trockenen Lauf liegt in der Zwischenablage.",
          null, "kein-helfer-beim-klick");
        /* Den Kasten VOR dem Sprung zeigen: springt es wirklich, kommt Klaus
           später zurück und findet ihn vor. */
        zeigeBefehl(echt, null);
        merkeBefehl(echt);
        kopiert.then(function (ok) { setzeKopierLage(ok); });
        /* UND JETZT, NOCH IN DER BERÜHRUNG. */
        setzeTermuxLage(termuxLage(termuxOeffnen()));
      }

      nachsehen().then(function (d) {
        if (!d) {
          /* Schon oben erledigt — hier nur der Fall, dass die alte Angabe
             „Helfer da" sagte und es doch keinen gibt. */
          if (!ohneHelfer) {
            schichtLage("Kein Helfer auf diesem Gerät — der Befehl liegt in der Zwischenablage.",
              null, "kein-helfer-beim-klick");
            zeigeBefehl(echt, null);
            merkeBefehl(echt);
            kopiert.then(function (ok) { setzeKopierLage(ok); });
            setzeTermuxLage(termuxLage(istAndroid() ? "zu" : "kein-android"));
          }
          return;
        }
        if (d.laeuft) {
          return fetch(PULT + "/stop").then(function () {
            schichtLage("Angehalten.", null, "angehalten");
          });
        }
        fetch(PULT + "/start?nurkonferenz=1" + (echt ? "&echt=1" : ""))
          .then(function (a) { return a.json(); })
          .then(function (r) {
            schichtLage(r.ok ? (echt ? "Echte Schicht gestartet." : "Trockener Lauf gestartet.")
                             : "Nicht gestartet: " + (r.grund || "unbekannt"),
                        null, r.ok ? "gestartet" : "nicht-gestartet");
            if (r.ok) verfolgeSchicht();
          });
      });
    });
  }

  function naechsterSchritt() {
    if (stand >= achse.length) { anhalten(); return; }
    setzeStand(stand + 1);
    /* JEDER Schritt bekommt DIESELBE Zeit, und `dauerMs` steuert sie NICHT.
       Vorher stand hier `Math.max(500, dauerMs) / tempo` — bei einem
       Trockenlauf sind die gemessenen Dauern ein bis zwei Millisekunden, es
       griff also immer der Boden von 500 ms, geteilt durch 1/2/4. Klaus:
       „Es läuft viel zu schnell … es braucht nur EINE Geschwindigkeit, und die
       muss für einen Menschen erkennbar sein."
       Er hat auch den Grund genannt: es ist eine NACHGESTELLTE SZENE. Die hat
       ihre eigene Zeit. Die gemessenen Zahlen verschwinden deshalb nicht — sie
       stehen bei jedem Schritt daneben und ändern sich nie. */
    uhrHandle = setTimeout(naechsterSchritt, schrittzeit);
  }

  function anhalten() {
    laeuft = false;
    if (uhrHandle) { clearTimeout(uhrHandle); uhrHandle = null; }
    abKnopfText("▶ Abspielen");
  }

  /* Es gibt nur noch EINEN Abspiel-Knopf (der Reiter „Abspielen" ist am
     2026-08-22 weggefallen — Klaus: „vollkommen sinnlos, zumal ich in der
     Werkstatt einen Abspiel-Button hab"). Der Sammel-Aufruf bleibt trotzdem:
     er kostet nichts und trägt, falls je ein zweiter dazukommt. Was er
     zusichert, gilt weiter — ein Knopf, der „Abspielen" zeigt, während es
     läuft, ist eine Falschauskunft. */
  function abKnopfText(t) {
    Array.prototype.forEach.call(document.querySelectorAll("#ab, #ab-buehne"),
      function (b) { b.textContent = t; });
  }

  function starten() {
    if (!achse.length) return;
    if (stand >= achse.length) setzeStand(0);
    laeuft = true;
    abKnopfText("❚❚ Anhalten");
    naechsterSchritt();
  }

  /*
   * Welcher Stand hier liegt — Klaus' Frage vom 2026-08-20.
   *
   * Die Seite sah gleich aus, egal ob gepullt war oder nicht. Eine Oberflaeche,
   * die ihren eigenen Stand nicht kennt, laesst einen an den Aenderungen
   * zweifeln statt an der Aktualitaet.
   */
  function zeichneStand() {
    var n = $("#stand"), v = daten.version;
    n.classList.remove("alt");
    if (!v) {
      n.textContent = "Stand unbekannt — version.json fehlt. " +
        "`node tools/version-schreiben.mjs` legt sie an (tools/ansicht.sh tut das von selbst).";
      n.classList.add("alt");
      return;
    }
    var wann = v.datum ? new Date(v.datum).toLocaleString("de-DE") : "?";
    var t = "Stand " + v.stand + " vom " + wann + " · " + (v.betreff || "");
    if (v.hinterher > 0) {
      t = "\u26a0 " + v.hinterher + " Commit(s) hinter origin/main — `git pull` holt sie. " + t;
      n.classList.add("alt");
    }
    if (v.schmutzig) t += " · lokal geändert";
    n.textContent = t;
  }

  /** Reiter: ein Raum auf einmal. Alles untereinander hiess zu viel Scrollen. */
  function zeigeRaum(id) {
    /* ⚠ EIN GESPEICHERTER RAUM, DEN ES NICHT MEHR GIBT, MACHT DIE SEITE LEER.
       „raum5" (der Reiter „Abspielen") ist am 2026-08-22 weggefallen — wer ihn
       zuletzt offen hatte, trägt ihn im Speicher. Ohne diese Zeile blendet die
       Schleife unten ALLE Räume aus und trifft keinen: eine weiße Seite, und
       niemand weiß, warum. */
    if (!document.getElementById(id)) id = "raum0";
    var raeume = document.querySelectorAll(".raum");
    for (var i = 0; i < raeume.length; i++)
      raeume[i].style.display = raeume[i].id === id ? "" : "none";
    var kn = document.querySelectorAll(".reiter button");
    for (var k = 0; k < kn.length; k++)
      kn[k].classList.toggle("an", kn[k].getAttribute("data-raum") === id);
    schreib("raum", id);
    window.scrollTo(0, 0);
  }

  // ── Alles neu ───────────────────────────────────────────────────────────
  function neuAufbauen() {
    baueAchse();
    $("#leiste").max = String(achse.length);
    zeichneBesetzung();
    zeichneReden();
    zeichneTafel();
    zeichneBlatt();
    zeichneAuftrag();
    zeichneEinwaende();
    zeichneErgebnis();
    zeichneMitnehmen();
    zeichneBuchhaltung();
    /*
     * ⚠ UHR UND PROTOKOLL GEHÖREN HIERHER (Klaus 2026-09-07, mit Bild).
     *
     * Seine Seite zeigte oben „Klaus' Zeit — 1:01:41" und unten „Noch nichts
     * zu übergeben — keine gestempelten Abschnitte und keine Fahrt im Buch".
     * Beide über dieselbe Sache, und sie widersprachen sich.
     *
     * Die Ursache war kein Rechenfehler, sondern eine fehlende Zeile: das
     * Fahrtenbuch kommt NACHTRÄGLICH (aus IndexedDB, asynchron). `neuAufbauen`
     * zeichnete danach die Räume neu — Uhr und Protokoll aber nicht. Das
     * Protokoll blieb auf dem Stand von vor dem Laden und sagte „nichts da",
     * während die Kachel daneben schon die Fahrten kannte.
     *
     * **Eine Anzeige, die nur halb erneuert wird, widerspricht sich selbst** —
     * und der Leser glaubt der falschen Hälfte. Beide hängen an
     * `daten.fahrten`, also werden beide hier gezeichnet, an EINER Stelle.
     */
    uhrZeichnen();
    zeichneProtokoll();
    tresorZeichnen();
    zeichneStand();

    /* Die Bühne bekommt DIESELBEN Daten wie die Texträume. Sie ist fail-soft:
       fehlt buehne.js oder der Container, läuft alles Übrige unverändert
       weiter — ein Bild, das nicht kommt, darf die Auskunft nicht mitnehmen. */
    var buehneWurzel = document.getElementById("buehne");
    if (buehneWurzel && window.KimhubBuehne) {
      if (!buehne) {
        buehne = new window.KimhubBuehne.Buehne(buehneWurzel);
        /* Nur für die Proben. Der Riegel „die Akte zeigt den GANZEN Text"
           lässt sich sonst nicht messen: er müsste eine Zahl aus dem Code
           abschreiben, statt gegen die Daten zu prüfen — und eine
           abgeschriebene Zahl bleibt grün, wenn beide Seiten sich ändern. */
        window.__buehne = buehne;
      }
      /* Die ACHSE, nicht `events`: sie führt Konferenz, Bau und Gegenprüfung zu
         EINER Reihe zusammen, und genau die steuert das Pult. Nähme die Bühne
         eine andere Liste, zeigte das Bild einen anderen Schritt als die Zeile
         darunter — und man glaubte dem falschen. */
      buehne.setzeDaten({
        events: achse.map(function (p) { return p.e; }),
        /* DER LAUF GEWINNT, die Datei traegt nur nach. Ein gefahrener Lauf
           weiss, WER wirklich gearbeitet hat — die Datei sagt nur, wer heute
           in der Liste steht. Beides zu mischen hiesse, einem alten Lauf
           Namen von heute unterzuschieben. */
        besetzung: (daten.lauf && daten.lauf.besetzung && daten.lauf.besetzung.length)
          ? daten.lauf.besetzung
          : (daten.besetzung || []),
        /* ⚠ DIE LAUFENDE SCHICHT SCHLÄGT DEN ANGEZEIGTEN LAUF. `daten.lauf`
           kann ein WIEDERHERGESTELLTER, längst fertiger Lauf sein — dann stand
           „✓ Schicht beendet" an der Bühne, während gearbeitet wurde (Klaus
           2026-09-06, mit Bild). `schichtlaeuft` speist die App beim Druck auf
           den Knopf ein und nimmt es am Ende wieder weg; nur sie weiß von der
           Konferenz-Strecke, die vor dem ersten Zwischenstand liegt. */
        laeuft: !!daten.schichtlaeuft || !!(daten.lauf && daten.lauf.laeuft),
        /* ⚠ „WARTET AUF DICH" IST KEIN UNTERFALL VON „LÄUFT" (Klaus
           2026-09-07). Am offenen Tor sagten drei Anzeigen gleichzeitig „es
           arbeitet" — die Bühne pulste, die Uhr rechnete eine Restzeit hoch,
           und die Regung-Anzeige meldete einen Hänger, der keiner war.
           `laeuft` bleibt trotzdem wahr: die Schicht LÄUFT, sie wartet nur,
           und die Zeit am Tor zählt als Arbeitszeit. Zwei Angaben, zwei
           Fragen. */
        wartet: !!daten.torwartet,
        /* DIE WANDUHR, NICHT DIE EINSPRITZBARE. `kasse.beginnIso`/`endeIso`
           stehen in JEDEM Zwischenstand — dadurch laeuft die Schichtuhr nach
           einem Neuladen mitten in der Schicht richtig weiter, statt wieder
           bei null zu beginnen und eine Dauer zu behaupten, die es nie gab.
           `minuten` daneben ist gerundet und kommt aus der Uhr, die eine
           Probe einspritzen darf — fuer eine Anzeige unbrauchbar. */
        beginn: (daten.schichtlaeuft && daten.schichtlaeuft.seit) ||
                (daten.lauf && daten.lauf.kasse && daten.lauf.kasse.beginnIso) || "",
        ende: (daten.lauf && daten.lauf.kasse && daten.lauf.kasse.endeIso) || "",
        _ausBeispiel: istBeispiel("schicht") || istBeispiel("konferenz"),
        /* Die ZWEITE Achse geht mit (1.5): woher ist nicht dasselbe wie womit.
           Ohne sie stand an der Bühne nur „Beispiel" — ein Wort für zwei
           Fragen, und Klaus las die falsche Antwort heraus. */
        /* Wie weit der laufende Lauf ist — nur solange einer läuft. Er kommt
           aus den Kassen, nicht aus dem Zwischenstand: die Konferenz davor
           sind bei acht Rollen siebzehn Aufrufe, und genau dort hat Klaus
           gewartet. */
        umfang: daten.umfang || null,
        /* ⚠ OB ER ZU ENDE LIEF. Ohne diese Zeile sagte die Uhr „✓ Schicht
           beendet" auch über einem Lauf, der nach der Idee gestorben ist —
           während die Zeile darunter „ABER er lief NICHT zu Ende" sagte.
           `laeuft` schliesst es aus: ein laufender Lauf ist weder das eine
           noch das andere. */
        fertig: (daten.lauf && daten.lauf.ergebnis && !daten.lauf.laeuft)
          ? !!daten.lauf.ergebnis.fertig
          : (daten.konferenz && typeof daten.konferenz.ok === "boolean" && !daten.lauf)
            ? daten.konferenz.ok : null,
        _art: artVon(daten.konferenz, daten.lauf),
        _datum: (daten.konferenz && daten.konferenz.datum) ||
                (daten.lauf && daten.lauf.datum) || ""
      });
    }

    var teile = [];
    // Benannt, nicht pauschal: nach einem eigenen Lauf ist meist NUR die
    // Konferenz echt und der Rest noch Beispiel. Ein pauschales „Beispiel"
    // machte den eigenen Lauf unsichtbar, ein pauschales Weglassen das
    // Beispiel — beides wäre falsch.
    var NAMEN = { konferenz: "Konferenz", lauf: "Schicht", gegen: "Gegenprüfung" };
    var ausBeispiel = Object.keys(NAMEN)
      .filter(function (k) { return daten[k] && daten[k]._ausBeispiel; })
      .map(function (k) { return NAMEN[k]; });
    /* ⚠ EIN FEHLENDES DATUM HEISST „ohne Datum", NICHT „undefined"
       (2026-09-07). Auf Klaus' Seite stand „Konferenz vom undefined (echt)".
       Die Ursache lag anderswo (der Zwischenstand trug es nicht mit, behoben
       in `konferenz.mjs`) — aber eine Anzeige, die eine Lücke als
       JavaScript-Wort ausgibt, macht aus einer fehlenden Angabe einen
       vermeintlichen Programmfehler. Das ist dieselbe Regel wie „wo nichts
       gemessen wurde, steht nicht 0". */
    var wann = function (d) { return d && d.datum ? "vom " + d.datum : "ohne Datum"; };
    if (daten.konferenz) teile.push("Konferenz " + wann(daten.konferenz) +
      " (" + daten.konferenz.art + ")" +
      (daten.konferenz.laeuft ? " — LÄUFT GERADE" : ""));
    if (daten.lauf) teile.push("Schicht " + wann(daten.lauf) + " (" + daten.lauf.art + ")" +
      (daten.lauf.laeuft ? " — LÄUFT GERADE" : ""));
    /* Die Aufzählung als ANGABE, nicht nur im Satz — dieselbe Lehre wie am
       Herkunfts-Band: ein Wächter, der am Wortlaut hängt, prüft die
       Formulierung. Zwei Prüfungen hingen hier am Wort „BEISPIEL" und wurden
       rot, als es zu „MITGELIEFERT" wurde — richtig rot, aber aus dem
       falschen Grund: die Zusicherung („benannt statt pauschal") hatte sich
       nicht geändert, nur das Wort. */
    $("#pult-lage").setAttribute("data-mitgeliefert", ausBeispiel.join(","));
    $("#pult-lage").textContent = (ausBeispiel.length
      ? "MITGELIEFERT (" + ausBeispiel.join(", ") + ") — hier hat noch keine " +
        "Schicht geschrieben. "
      : "") + (teile.length
      ? teile.join(" · ") + " · " + achse.length + " Schritte"
      : "Keine Lauf-Datei gefunden. Die Seite braucht konferenz.json oder lauf.json daneben — " +
        "oder du holst sie über „Lauf laden\" herein.");
    zeigeHerkunft(ausBeispiel, NAMEN);
    setzeStand(achse.length);   // Vorgabe: alles zu sehen. Wer abspielt, fängt vorn an.
  }

  // ── Bedienung ───────────────────────────────────────────────────────────
  function verdrahten() {
    // Reiter. OHNE Skript bleiben alle Räume sichtbar — untereinander lesbar
    // statt unsichtbar. Ein Aufklapper, der ohne Skript tot wäre, ist der tote
    // Knopf, den wir nicht bauen.
    var reiterKn = document.querySelectorAll(".reiter button");
    for (var ri = 0; ri < reiterKn.length; ri++)
      (function (b) {
        b.addEventListener("click", function () { zeigeRaum(b.getAttribute("data-raum")); });
      })(reiterKn[ri]);
    /* Die Bühne ist die Vorgabe: sie ist das Bild, das die Seite als Erstes
       zeigen soll — Klaus' Befund war ja gerade, dass man beim Öffnen nur Text
       sieht. Eine GESPEICHERTE Wahl gewinnt trotzdem; wer sich zuletzt einen
       Textraum ausgesucht hat, bekommt ihn wieder. Seine Wahl ist heilig. */
    zeigeRaum(lies("raum", "raum0"));

    // Installieren-Knopf: Chrome meldet sich, wenn die App installierbar ist.
    // Vorher bleibt er verborgen — ein Knopf, der nichts tut, wäre schlimmer
    // als keiner.
    var einladung = null;
    window.addEventListener("beforeinstallprompt", function (ev) {
      ev.preventDefault(); einladung = ev;
      $("#installieren").hidden = false;
    });
    $("#installieren").addEventListener("click", function () {
      if (!einladung) return;
      einladung.prompt();
      einladung.userChoice.then(function () { einladung = null; $("#installieren").hidden = true; });
    });

    Array.prototype.forEach.call(document.querySelectorAll("#ab, #ab-buehne"), function (b) {
      b.addEventListener("click", function () { laeuft ? anhalten() : starten(); });
    });
    var anfang = $("#anfang-buehne");
    if (anfang) anfang.addEventListener("click", function () { anhalten(); setzeStand(0); });

    verdrahteSchichtKnopf();
    $("#vor").addEventListener("click", function () { anhalten(); setzeStand(stand + 1); });
    $("#zurueck").addEventListener("click", function () { anhalten(); setzeStand(stand - 1); });
    $("#leiste").addEventListener("input", function (ev) { anhalten(); setzeStand(Number(ev.target.value)); });

    /* EIN Regler statt der Stufen 1×/2×/4×. Die Wahl wird gemerkt, wie die
       Raum-Wahl — wer sich einmal für ein Tempo entschieden hat, will es beim
       nächsten Öffnen wiederhaben. */
    /* ZWEI Regler, EIN Wert. Sie gleichen sich ab — wer den einen zieht, sieht
       den anderen mitgehen. Zwei Regler mit verschiedenen Ständen wären eine
       Anzeige, die sich selbst widerspricht. */
    var regler = document.querySelectorAll("#schrittzeit, #schrittzeit-buehne");
    var werte  = document.querySelectorAll("#schrittzeit-wert, #schrittzeit-buehne-wert");
    function zeigeSchrittzeit() {
      var t = (schrittzeit / 1000).toFixed(1).replace(".", ",") + " s";
      Array.prototype.forEach.call(werte,  function (w) { w.textContent = t; });
      Array.prototype.forEach.call(regler, function (r) { r.value = String(schrittzeit); });
    }
    if (regler.length) {
      var gemerkt = Number(lies("schrittzeit", ""));
      var min = Number(regler[0].min), max = Number(regler[0].max);
      if (gemerkt >= min && gemerkt <= max) schrittzeit = gemerkt;
      zeigeSchrittzeit();
      Array.prototype.forEach.call(regler, function (r) {
        r.addEventListener("input", function () {
          schrittzeit = Number(r.value) || SCHRITT_VORGABE;
          schreib("schrittzeit", String(schrittzeit));
          zeigeSchrittzeit();
        });
      });
    }

    /*
     * SCHICHT MITVERFOLGEN — und zwar sichtbar.
     *
     * Klaus, 2026-08-22: „Schicht mitverfolgen. Da drück ich rauf und ich sehe
     * nichts." Er hatte recht, und es war kein Anzeigefehler, sondern die
     * Bauart: der Knopf sah alle zwei Sekunden nach und sagte NUR dann etwas,
     * wenn sich etwas geändert hatte. Läuft keine Schicht, ändert sich nie
     * etwas — also passierte für immer nichts, still.
     *
     * Genau das verbietet die Verfassung an anderer Stelle schon („kein
     * stiller Fehlschlag"), nur stand es hier nicht. Jetzt sagt der Knopf beim
     * Druck sofort, was er tut, und bei jedem Nachsehen, dass er nachgesehen
     * hat — mit Uhrzeit. Ein Herzschlag statt eines Schweigens.
     */
    var livZahl = 0;
    function livLage(text, marke) {
      var z = $("#live-lage");
      if (!z) return;
      z.textContent = text;
      z.setAttribute("data-live", marke);
    }
    function uhrzeitJetzt() {
      var d = new Date();
      return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) +
             ":" + ("0" + d.getSeconds()).slice(-2);
    }
    /*
     * ⚠ NICHT JEDE SCHALE HAT DIESEN KNOPF (2026-09-07). In Kim Hub Company
     * gibt es ihn nicht mehr: er sieht alle zwei Sekunden nach `konferenz.json`
     * und `lauf.json`, und die gibt es im Browser NIE. An Klaus' Gerät stand
     * um 01:21 „338× nachgesehen" — während direkt darüber eine Schicht lief,
     * deren Daten über einen ganz anderen Weg hereinkommen.
     *
     * Diese Datei ist geteilt. Sie darf nicht voraussetzen, dass jede Schale
     * jedes Bedienelement mitbringt — sonst reisst ein weggelassener Knopf die
     * ganze Ansicht ab, und der Nutzer sieht eine leere Seite statt einer App.
     */
    /* ⚠ KEIN `return` HIER. Der erste Versuch stieg an dieser Stelle aus, wenn
       der Knopf fehlt — und riss damit alles mit, was danach gebunden wird:
       „⭱ Lauf laden", der Themen-Wechsler und der ⟳-Knopf. Ein weggelassenes
       Bedienelement hätte die halbe App stillgelegt. Es wird ein Platzhalter
       gereicht, kein Ausstieg. */
    var livKnopf = $("#live") || {
      addEventListener: function () {}, setAttribute: function () {},
      getAttribute: function () { return "false"; },
    };
    livKnopf.addEventListener("click", function () {
      var an = livKnopf.getAttribute("aria-pressed") === "true";
      livKnopf.setAttribute("aria-pressed", an ? "false" : "true");
      if (livHandle) { clearInterval(livHandle); livHandle = null; }
      if (an) {
        livLage("Nachsehen beendet — " + livZahl + "× nachgesehen. " +
          "Der Knopf schaltet es wieder an.", "aus");
        return;
      }
      /* SOFORT, nicht erst nach zwei Sekunden. Ein Knopf, dessen Wirkung erst
         später kommt, fühlt sich an wie einer, der nichts tut. */
      livZahl = 0;
      livLage("Ich sehe jetzt alle 2 Sekunden nach, ob eine Schicht weiter ist. " +
        (daten.lauf && !daten.lauf._ausBeispiel
          ? "Zuletzt: der Lauf vom " + daten.lauf.datum + "."
          : "Auf diesem Gerät liegt noch kein eigener Lauf — sobald eine Schicht " +
            "schreibt, steht es hier."), "an");
      livHandle = setInterval(function () {
        hole("lauf.json").then(function (l) {
          livZahl++;
          if (!l) {
            livLage("Noch kein eigener Lauf da. " + livZahl + "× nachgesehen, zuletzt " +
              uhrzeitJetzt() + ".", "an");
            return;
          }
          var vorher = daten.lauf ? (daten.lauf.events || []).length : -1;
          var jetzt = (l.events || []).length;
          if (jetzt === vorher && daten.lauf && daten.lauf.laeuft === l.laeuft) {
            /* NICHTS NEUES IST AUCH EINE AUSKUNFT — vorher war genau hier das
               Schweigen, über das Klaus gestolpert ist. */
            livLage("Nichts Neues (" + jetzt + " Schritte). " + livZahl +
              "× nachgesehen, zuletzt " + uhrzeitJetzt() + ".", "an");
            return;
          }
          daten.lauf = l; neuAufbauen();
          livLage((l.laeuft ? "Die Schicht läuft" : "Die Schicht ist fertig") +
            " — jetzt " + jetzt + " Schritte" +
            (vorher >= 0 ? " (vorher " + vorher + ")" : "") + ", " + uhrzeitJetzt() + ".", "an");
        });
      }, 2000);
    });

    /*
     * DATEIEN HEREINHOLEN — und SAGEN, was daraus wurde.
     *
     * ⚠ HIER STAND EIN STILLER FEHLSCHLAG. Der `catch`-Zweig verschluckte jede
     * kaputte Datei mit dem Kommentar „wirft die Seite nicht um" — richtig,
     * aber der Nutzer erfuhr nichts. Und eine Datei, die zwar gültiges JSON
     * war, aber in keine der vier Schubladen passte (etwa `plan-offen.md` oder
     * ein `fahrtenbuch.json`), verschwand ebenso spurlos: die Seite sah danach
     * genauso aus wie vorher, und Klaus hätte gedacht, der Knopf sei tot.
     *
     * Das ist derselbe stille Fehlschlag, den die Verfassung an drei anderen
     * Stellen schon verbietet. Jetzt steht hinterher da, WAS geladen wurde und
     * was nicht — auch „nichts Brauchbares dabei" ist eine Auskunft.
     */
    $("#datei").addEventListener("change", function (ev) {
      var dateien = ev.target.files || [];
      var offen = dateien.length;
      if (!offen) return;
      var genommen = [], verschmaeht = [];
      Array.prototype.forEach.call(dateien, function (d) {
        var leser = new FileReader();
        leser.onload = function () {
          try {
            var j = JSON.parse(leser.result);
            /* Fremde Marke abstreifen: was von Hand hereinkommt, IST von
               diesem Gerät — sonst behauptete das Band weiter „mitgeliefert",
               obwohl Klaus gerade seinen eigenen Lauf hereingegeben hat. */
            delete j._ausBeispiel;
            if (j.belege) { daten.belege = j; genommen.push(d.name + " → Belege"); }
            else if (j.tage) { daten.zeiten = j; genommen.push(d.name + " → Bauzeiten"); }
            /*
             * ⚠ ZUSAMMENGEFUEHRT, NICHT ERSETZT. Klaus hat zwei Browser mit je
             * eigenen Zeiten; ein Import, der ersetzt, loescht einen davon —
             * still, denn danach sieht die Liste vollstaendig aus. Die Regel
             * steht in `zeit.js`, damit sie ohne Browser messbar ist.
             */
            else if (Array.isArray(j.stechuhr)) {
              var zus = zeitApi().stechuhrZusammenfuehren(uhrAbschnitte(), j.stechuhr);
              schreib("stechuhr", zus.liste);
              genommen.push(d.name + " \u2192 Stechuhr: " + zus.dazu + " dazu"
                + (zus.schonDa ? ", " + zus.schonDa + " schon da" : ""));
              uhrZeichnen(); zeichneProtokoll();
            }
            else if (j.fahrten) { daten.fahrten = j; genommen.push(d.name + " → Fahrtenbuch"); }
            else if (j.events && j.tafel) { daten.konferenz = j; genommen.push(d.name + " → Konferenz"); }
            else if (j.events && j.gegenstand) { daten.gegen = j; genommen.push(d.name + " → Gegenprüfung"); }
            else if (j.events) { daten.lauf = j; genommen.push(d.name + " → Schicht"); }
            else verschmaeht.push(d.name + " (kein Lauf darin)");
          } catch (e) {
            verschmaeht.push(d.name + " (kein gültiges JSON)");
          }
          if (--offen === 0) { neuAufbauen(); ladeLage(genommen, verschmaeht); }
        };
        leser.readAsText(d);
      });
    });

    $("#thema").addEventListener("click", function () {
      var jetzt = document.documentElement.getAttribute("data-thema") === "tag" ? "" : "tag";
      if (jetzt) document.documentElement.setAttribute("data-thema", jetzt);
      else document.documentElement.removeAttribute("data-thema");
      schreib("thema", jetzt);
      try { localStorage.setItem(SPEICHER + "thema", jetzt); } catch (e) {}
    });

    // Aktualisieren: nur eine GEÄNDERTE Adresse ist für den Cache eine andere
    // Datei. location.reload() genügt nicht, reload(true) ignorieren die Browser.
    //
    // ⚠ NUR DIE EIGENEN VORRÄTE. `caches` gehört dem URSPRUNG, nicht dem Pfad —
    // und auf `lausiklauskn-png.github.io` liegen rund dreissig Apps. Bis zum
    // 2026-09-08 löschte diese Zeile JEDEN Vorrat des Ursprungs: ein ⟳ hier nahm
    // dem Rezeptbuch, dem Mixarium und allen anderen ihren Offline-Vorrat.
    // Gemessen und netzweit repariert — `Sage-Protokol/docs/BEFUND_geteilter-vorrat.md`.
    //
    // DER PRÄFIX KOMMT VOM WIRT, nicht aus dieser Datei. `ansicht.js` ist in
    // Kimhub und in kim-hub-company byte-1:1 dieselbe Datei (Drift-Guard), und
    // die beiden tragen verschiedene Vorräte: `kimhub-werkstatt-` bzw.
    // `kim-hub-company-`. Ein hier eingetragener Name wäre für eine der beiden
    // Apps falsch — und zwar still, denn gelöscht würde trotzdem.
    //
    // `SBKIM_VORRAT_PRAEFIX` heisst so, weil es die NETZWEITE Marke ist: Modul 22
    // liest sie genauso, und Sages Scanner (`tools/vorrat-scan.mjs`) erkennt sie.
    // Kimhub trägt kein SBKIM-Modul; ein zweiter Name für dieselbe Sache liefe
    // trotzdem auseinander, und der Scanner meldete diese Stelle als „unklar".
    //
    // OHNE die Marke wird NICHTS gelöscht (fail-soft: lieber ein eigener Vorrat
    // zu viel als dreissig fremde zu wenig). Der ⟳ wirkt auch dann — die
    // geänderte Adresse ist für den Cache eine andere Datei.
    $("#frisch").addEventListener("click", function () {
      var weg = location.pathname + "?frisch=" + Date.now();
      var praefixe = [].concat(window.SBKIM_VORRAT_PRAEFIX || [])
        .filter(function (p) { return typeof p === "string" && p; });
      var eigener = function (k) {
        return praefixe.some(function (p) { return k.indexOf(p) === 0; });
      };
      if (praefixe.length && window.caches && caches.keys) {
        caches.keys()
          .then(function (n) { return Promise.all(n.filter(eigener).map(function (x) { return caches.delete(x); })); })
          .then(function () { location.replace(weg); }, function () { location.replace(weg); });
      } else location.replace(weg);
    });

    // ── Die Stoppuhr ────────────────────────────────────────────────────
    //
    // Drei Knöpfe, drei verschiedene Dinge — die Begründung steht oben bei
    // `uhrStand()`. Der vierte („Verlauf löschen") ist ausdrücklich NICHT der
    // dritte: ⟲ setzt die Uhr auf null und verliert dabei keine Zeile.
    $("#uhr-start").addEventListener("click", function () {
      /* IM WECHSEL: läuft sie, ist das hier die Pause. Der Abschnitt wird
         sauber abgelegt (keine verlorene Zeit), und ▶ zählt danach weiter —
         die Anzeige rechnet alle Abschnitte seit dem letzten ⟲ zusammen. */
      if (uhrLaeuft) {
        uhrAbschnittAblegen(false);
        uhrZeichnen();
        zeichneProtokoll();
        return;
      }
      /*
       * ⚠ NACH DEM AUSCHECKEN BEGINNT ▶ NEU (Klaus 2026-09-08: „ja, ▶ soll
       * nach dem Auschecken neu zählen"). Nach einer PAUSE nicht — das ist
       * seine erste Beschwerde in die andere Richtung, und sie gilt weiter.
       * Die Unterscheidung steht in `zeit.js` (`startSetztNeuAn`), damit sie
       * ohne Browser messbar ist.
       *
       * Neu gezählt wird über die ⟲-Marke, genau wie beim ⟲-Knopf: keine
       * Zeile geht verloren, und die Kachel oben zählt weiter alles.
       *
       * ⚠ EIN Zeitstempel für beides. Zwei getrennte `Date.now()` könnten die
       * Marke eine Millisekunde HINTER den Beginn legen — dann fiele der
       * frisch gestartete Abschnitt aus seiner eigenen Zählung.
       */
      var jetzt = Date.now();
      if (zeitApi().startSetztNeuAn(false, uhrAbschnitte(), uhrNull())) {
        schreib("uhrNull", jetzt);
      }
      uhrLaeuft = { von: jetzt, was: $("#uhr-was").value.trim() };
      /* IN DEN SPEICHER, SOFORT. Das ist der eigentliche Fix (Klaus: „Nach
         jedem Aktualisieren startet es wieder bei null") — und die Zeile, die
         WorkFloh mit `persist()` seit jeher hat. Ohne sie lebt der laufende
         Abschnitt nur im Arbeitsspeicher und ist beim nächsten ⟳ wirklich weg,
         nicht nur unsichtbar. */
      schreib("uhrLaeuft", uhrLaeuft);
      // EIN Taktgeber, nicht bei jedem Start einer dazu: sonst laufen nach
      // dreimal Start/Stopp drei Uhren nebeneinander.
      if (!tickHandle) tickHandle = setInterval(uhrTick, 1000);
      uhrTick();
    });

    /*
     * AUSCHECKEN — nicht dasselbe wie Pause (Klaus 2026-08-22): „Stop bedeutet
     * dann auschecken sozusagen aus der Arbeit. Genau wie in dem WorkFloh."
     *
     * Der Unterschied ist keine Zierde: eine Pause sagt „ich komme gleich
     * wieder", ein Feierabend sagt „hier war Schluss". Eine Stechuhr, die
     * beides gleich aufschreibt, beantwortet die Frage nicht, für die es sie
     * gibt. Die Zeile bekommt deshalb einen Schlussstrich.
     *
     * DER STAND BLEIBT TROTZDEM STEHEN. Auf null setzt nur ⟲ — vorher wurde
     * hier auf „0:00:00" gesetzt, und genau das machte aus der Stoppuhr eine
     * Eieruhr: der eben gemessene Abschnitt war aus der großen Zahl
     * verschwunden, obwohl er in der Liste stand.
     */
    $("#uhr-stopp").addEventListener("click", function () {
      if (!uhrAbschnittAblegen(true)) return;
      uhrZeichnen();
      zeichneProtokoll();
    });

    $("#uhr-neu").addEventListener("click", function () {
      /* Läuft sie, wird der Abschnitt erst SAUBER abgelegt — sonst verlöre ⟲
         die Zeit seit dem letzten Start, und dann täte es doch, was nur
         „Verlauf löschen" darf. Dieselbe Funktion wie beim Stopp: zwei
         Abschriften desselben Ablegens liefen auseinander, und dann verlöre
         der eine Weg, was der andere behält. */
      uhrAbschnittAblegen(false);
      schreib("uhrNull", Date.now());
      uhrZeichnen();
      zeichneProtokoll();
    });

    $("#uhr-loeschen").addEventListener("click", function () {
      /* Der Name sagt jetzt, was es tut, und die Rückfrage nennt beide Wege —
         wer nur die Uhr auf null will, soll hier abbrechen können. */
      if (!confirm("Den ganzen Verlauf löschen? Alle gestempelten Abschnitte sind " +
                   "dann weg, das geht nicht zurück.\n\nNur die Uhr auf null " +
                   "setzen: abbrechen und ⟲ Neu drücken.")) return;
      schreib("stechuhr", []);
      schreib("uhrNull", 0);
      uhrLaeuft = null;
      schreib("uhrLaeuft", null);
      if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
      uhrZeichnen();
      zeichneProtokoll();
    });

    /* Der Stundensatz. Er bleibt IM BROWSER — er ist eine interne Zahl, und
       intern heißt hier auch: er geht nicht in ein Depot und nicht in einen
       Export, außer Klaus setzt den Haken darunter. */
    var satz = $("#uhr-satz");
    if (satz) {
      var c0 = satzCent();
      satz.value = c0 ? (c0 / 100).toFixed(2).replace(".", ",") : "";
      satz.addEventListener("input", function () {
        /* Komma wie Punkt lesen — sonst gibt eine deutsche Zahl `NaN`.
           Dieselbe Kleinigkeit, an der `ovParseMin` in WorkFloh hängt. */
        var roh = satz.value.replace(/[^0-9,.\-]/g, "").replace(",", ".");
        var eurW = parseFloat(roh);
        if (isFinite(eurW) && eurW > 0) schreib("stundensatzCent", Math.round(eurW * 100));
        else schreib("stundensatzCent", null);
        uhrZeichnen();
        zeichneProtokoll();
      });
    }
    var haken = $("#uhr-satz-mit");
    if (haken) {
      haken.checked = lies("satzMitgeben", false) === true;
      haken.addEventListener("change", function () {
        schreib("satzMitgeben", haken.checked);
        zeichneProtokoll();
      });
    }

    // Notiz
    var notiz = $("#notiz");
    notiz.value = lies("notiz", "");
    notiz.addEventListener("input", function () {
      schreib("notiz", notiz.value);
      $("#notiz-lage").textContent = "gespeichert";
    });

    /* ── Der Tresor ──────────────────────────────────────────────────────── */
    var tAuf = $("#tresor-auf");
    if (tAuf) tAuf.addEventListener("click", function () {
      var feld = $("#tresor-pass"), pass = feld ? feld.value : "";
      if (!pass) { tresorLage("Kein Passwort eingegeben.", "leer"); return; }
      tresorLage("Schluessel wird abgeleitet — 600 000 Runden, das dauert einen Moment.", "rechnet");
      tresorOeffnen(pass).then(function (e) {
        if (e.nichts) { tresorLage("Es ist nichts verschlossen.", "nichts"); return; }
        if (feld) feld.value = "";           /* nicht im Formular stehen lassen */
        /* ⚠ EIGENER GRUND, EIGENE AUSKUNFT. „Falsches Passwort" wäre hier
           gelogen: das Passwort mag stimmen, die Seite kann das Paket nur
           nicht lesen. Wer das zusammenwirft, schickt Klaus auf die Suche
           nach einem Fehler, den er nicht hat. */
        if (e.fassung.length && !e.auf.length) {
          tresorLage(e.fassung.join(" + ") + ": neuere Fassung des Pakets —"
            + " diese Seite kann es nicht öffnen. Am Passwort liegt es nicht."
            + " Lade die Seite neu (⟳); hilft das nicht, ist die Sicherung"
            + " jünger als diese Fassung der Werkstatt.", "fassung");
          return;
        }
        if (!e.auf.length) {
          tresorLage("Falsches Passwort — nichts aufgeschlossen.", "falsch");
          return;
        }
        /* WELCHE aufging und welche nicht, im Klartext. Ein blosses „teilweise"
           liesse offen, wo man suchen muss. */
        tresorLage(e.auf.join(" + ") + " aufgeschlossen."
          + (e.zu.length ? "  " + e.zu.join(" + ") + ": anderes Passwort." : ""),
          e.zu.length ? "teils" : "ja");
        neuAufbauen();
        tresorZeichnen();
      });
    });

    /*
     * ── DER CHEF-CODE ───────────────────────────────────────────────────
     *
     * ⚠ ZWEIMAL EINGEBEN IST HIER KEINE SCHIKANE, sondern derselbe Grund wie
     * beim Tresor: es gibt kein Zurücksetzen. Ein Tippfehler fiele sonst erst
     * auf, wenn die Zahlen schon verborgen sind.
     */
    var cSetz = $("#chef-setzen");
    if (cSetz) cSetz.addEventListener("click", function () {
      var a = $("#chef-neu").value, b = $("#chef-neu2").value;
      if (!a) { chefSagen("Kein Code eingegeben.", "leer"); return; }
      if (a !== b) { chefSagen("Die beiden Eingaben sind nicht gleich.", "ungleich"); return; }
      chefSagen("Wird gesetzt — 600 000 Runden, das dauert einen Moment.", "rechnet");
      chefSetzen(a).then(function () {
        $("#chef-neu").value = ""; $("#chef-neu2").value = "";
        chefZeichnen();
        /* ⚠ NICHT SOFORT ZUMACHEN. Wer gerade einen Code gesetzt hat, will
           sehen, dass er wirkt — und nicht vor seinen eigenen Zahlen stehen,
           ohne den Code je ausprobiert zu haben. */
        chefSagen("Code gesetzt. Die Zahlen bleiben in diesem Fenster sichtbar;"
          + " ab dem nächsten Laden fragt die Seite danach.", "gesetzt");
      }, function () { chefSagen("Ging nicht — der Code wurde NICHT gesetzt.", "fehler"); });
    });

    /*
     * ══ DEN CHEF-CODE WECHSELN (Klaus 2026-09-08) ═════════════════════════
     * „Das Chefpasswort sollte noch änderbar sein, jederzeit … mit dem alten
     * Passwort natürlich."
     *
     * ⚠ DER ALTE CODE WIRD IMMER GEPRUEFT, auch wenn die Zahlen gerade offen
     * stehen. „Offen" ist ein Fenster-Zustand, kein Beweis — sonst koennte
     * jemand am entsperrten Tablet den Code umsetzen und Klaus aus seinen
     * eigenen Zahlen aussperren. Ein Wechsel ohne den alten Code WAERE das
     * Zuruecksetzen, das es hier bewusst nicht gibt.
     *
     * ⚠ UND DIE PRUEFUNG STEHT VOR DEM SCHREIBEN. Andersherum waere der alte
     * Code schon ueberschrieben, wenn sich herausstellt, dass er nicht passte
     * — dieselbe Reihenfolge wie „erst die Fassung, dann das Passwort".
     */
    var cWechsel = $("#chef-wechseln");
    if (cWechsel) cWechsel.addEventListener("click", function () {
      var fAlt = $("#chef-alt"), f1 = $("#chef-wechsel"), f2 = $("#chef-wechsel2");
      var alt = fAlt ? fAlt.value : "", a = f1 ? f1.value : "", b = f2 ? f2.value : "";
      if (!alt) { chefSagen("Kein alter Code eingegeben — es wurde nichts geändert.", "alt-leer"); return; }
      if (!a) { chefSagen("Kein neuer Code eingegeben — es wurde nichts geändert.", "leer"); return; }
      if (a !== b) { chefSagen("Die beiden neuen Eingaben sind nicht gleich.", "ungleich"); return; }
      chefSagen("Wird geprüft — 600 000 Runden, das dauert einen Moment.", "rechnet");
      chefPruefen(alt).then(function (passt) {
        if (!passt) {
          /* Nichts geschrieben. Der alte Code gilt unverändert weiter. */
          chefSagen("Der alte Code stimmt nicht — es wurde NICHTS geändert.", "alt-falsch");
          return null;
        }
        return chefSetzen(a).then(function () {
          if (fAlt) fAlt.value = ""; if (f1) f1.value = ""; if (f2) f2.value = "";
          chefZeichnen();
          /* Wer den alten Code kannte, darf auch sehen — `chefSetzen` macht
             deshalb auf. Das steht dabei, statt zu ueberraschen. */
          chefSagen("Code geändert — der alte gilt nicht mehr."
            + " Die Zahlen stehen jetzt offen, wie nach dem Aufschließen.", "gewechselt");
          return true;
        });
      }).catch(function () {
        chefSagen("Ging nicht — der Code wurde NICHT geändert.", "fehler");
      });
    });

    var cAuf = $("#chef-auf");
    if (cAuf) cAuf.addEventListener("click", function () {
      var feld = $("#chef-code");
      var code = feld ? feld.value : "";
      if (!code) { chefSagen("Kein Code eingegeben.", "leer"); return; }
      chefSagen("Wird geprüft …", "rechnet");
      chefPruefen(code).then(function (passt) {
        if (feld) feld.value = "";      /* nicht im Formular stehen lassen */
        if (!passt) { chefSagen("Falscher Code — die Zahlen bleiben verborgen.", "falsch"); return; }
        chefOffen = true;
        chefZeichnen();
        chefSagen("", "auf");
      });
    });

    var cZu = $("#chef-wieder-zu");
    if (cZu) cZu.addEventListener("click", function () {
      chefOffen = false;
      chefZeichnen();
      chefSagen("Verborgen.", "zu");
    });

    /*
     * ── DER RÜCKWEG AUS DEM LEEREN BROWSER (Klaus 2026-08-22, Befund A) ──
     *
     * ⚠ EIN WEG, NICHT ZWEI. Dieser Knopf baut KEINEN zweiten Einlese-Pfad —
     * er klappt den vorhandenen auf und setzt den Finger hinein. Ein eigenes
     * Dateifeld daneben wäre eine zweite Fassung desselben Werkzeugs, und die
     * laufen auseinander (dieselbe Begründung wie bei `assets/karte.js` in
     * PWA Toolpoint: eine Quelle für das Markup).
     *
     * ⚠ UND ER DARF NICHT STUMM BLEIBEN. Ein Knopf, der eine Bedingung
     * abwartet, statt zu antworten, ist derselbe stille Fehlschlag wie
     * „Schicht mitverfolgen" — deshalb schreibt er in JEDEM Fall in die
     * Lage-Zeile, auch wenn alles glattgeht.
     */
    var tZum = $("#tresor-zum-einlesen");
    if (tZum) tZum.addEventListener("click", function () {
      var lage = $("#tresor-rueckweg-lage");
      var sag = function (t, m) {
        if (!lage) return;
        lage.textContent = t;
        lage.setAttribute("data-rueckweg-lage", m);
      };
      var feld = $("#tresor-datei");
      if (!feld) {
        sag("Der Einlese-Weg ist auf dieser Seite nicht zu finden.", "fehlt");
        return;
      }
      /*
       * ⚠ SEIT DEM 2026-09-08 IST NICHTS MEHR AUFZUKLAPPEN — und das ist der
       * eigentliche Fortschritt, nicht eine vereinfachte Zeile.
       *
       * Bis heute morgen steckte „tresor-datei" IN „tresor-werk": der Knopf
       * musste ZWEI Aufklapper aufreissen, sonst blieb das Feld verborgen.
       * Mittags waren es Geschwister, also einer. Seit Klaus' Urteil am Abend
       * („dann muss ich erst mal aufklappen, dann Text lesen") gibt es die
       * Bedien-Aufklapper gar nicht mehr — das Feld steht immer da.
       *
       * Der Knopf bleibt trotzdem, und er ist kein Rest: er FUEHRT hin
       * (scrollen + Finger hineinsetzen) und er ANTWORTET. Auf einer langen
       * Karte ist „wo ist das nochmal" die eigentliche Frage.
       */
      if (feld.scrollIntoView) feld.scrollIntoView({ block: "center" });
      try { feld.focus(); } catch (e) { /* ohne Tastatur nicht schlimm */ }
      sag("Hier ist der Weg: wähle deine Sicherung (.enc.json aus dem"
        + " Download-Ordner), gib ihr Passwort ein und drücke 📥.", "gezeigt");
    });

    /*
     * ── WAS AUF DEM TABLET NICHT HILFT, STEHT DORT NICHT (Befund C) ──────
     *
     * Versteckt wird genau EIN Knopf: „🔒 Verschlüsselt ablegen" nimmt eine
     * Datei AUS EINEM ORDNER, und auf Klaus' Tablet läge die in Termux —
     * dorthin kommt Chrome nicht (NETZWEIT § 6b). 📥 Einlesen bleibt, denn es
     * holt die Sicherung aus dem Download-Ordner, und den zeigt Androids
     * Dateiauswahl sehr wohl.
     *
     * ⚠ Nicht entfernt, nur versteckt: am Rechner ist dieser Knopf der einzige
     * Weg für eine Datei, die die Seite nicht selbst lädt.
     */
    (function () {
      var block = $("#tresor-machen-block"), hinweis = $("#tresor-machen-hinweis");
      if (!block) return;
      var aus = istAndroid();
      block.hidden = aus;
      block.setAttribute("data-machen", aus ? "versteckt" : "sichtbar");
      if (hinweis) hinweis.hidden = !aus;
    }());

    var tDatei = $("#tresor-datei");
    if (tDatei) tDatei.addEventListener("change", function () {
      var d = tDatei.files && tDatei.files[0];
      var altBlock = $("#tresor-alt-block");
      if (!d || !altBlock) return;
      /* Ist die gewaehlte Datei schon ein Paket? Dann braucht es das ALTE
         Passwort — und das Feld dafuer erscheint erst jetzt, statt jeden
         Besucher zu fragen, der nur einmal verschluesseln will. */
      d.text().then(function (roh) {
        var schonZu = false, o = null;
        try { o = JSON.parse(roh); } catch (e) { o = null; }
        schonZu = istTresor(o);
        if (istTresorForm(o) && o.v !== TRESOR_FASSUNG) {
          altBlock.hidden = true;
          $("#tresor-werk-lage").setAttribute("data-tresor-werk", "fassung");
          $("#tresor-werk-lage").textContent =
            "Diese Datei ist ein Paket aus einer neueren Fassung (v" + o.v
            + "). Diese Seite kann sie nicht oeffnen — am Passwort liegt es nicht.";
          return;
        }
        altBlock.hidden = !schonZu;
        $("#tresor-werk-lage").setAttribute("data-tresor-werk", schonZu ? "paket" : "klartext");
        $("#tresor-werk-lage").textContent = schonZu
          ? "Schon verschlossen — mit dem alten Passwort oeffnen und mit dem neuen wieder zumachen."
          : "Klartext (" + d.name + "). Wird verschlossen.";
      });
    });

    /*
     * ── ABLEGEN ─────────────────────────────────────────────────────────
     *
     * ⚠ HIER STEHT BEWUSST KEIN BOM, und das weicht von der Regel ab, die seit
     * dem 2026-08-22 fuer jede herausgegebene Textdatei gilt (Klaus' Umlaute
     * kamen als "AushÃ¤ngen" an, weil `charset=utf-8` beim Herunterladen
     * verlorengeht). Diese Datei liest kein Mensch, sondern ein Parser — und
     * `JSON.parse` bricht an einem BOM ab. Ein Tresor-Paket mit BOM waere eine
     * Datei, die aussieht wie eine Sicherung und beim Oeffnen scheitert.
     * Benannt statt stillschweigend umfahren (Tafel-Evolutions-Klausel).
     */
    /*
     * WAS IN EINE SICHERUNG GEHOERT — an EINER Stelle.
     *
     * Beide Ausgaenge (verschlossen und offen) bauen dieselbe Liste. Sie stand
     * zweimal da, und zwei Stellen, die dasselbe behaupten, laufen auseinander:
     * wer eine Sorte am einen Ausgang ergaenzt, vergisst den anderen, und dann
     * enthaelt die offene Sicherung etwas anderes als die verschlossene.
     *
     * ⚠ AUFGEFALLEN IST DIE DOPPELUNG NICHT BEIM LESEN, sondern an einem
     * Gegenprobe-Anker, der auf ZWEI Stellen passte. Ein mehrdeutiger Anker
     * sabotiert nach Zufall die eine oder die andere — und misst damit nicht,
     * was er zu messen glaubt.
     *
     * ⚠ WAS AUS DEM BEISPIEL STAMMT, WIRD NICHT ABGELEGT. Sonst verschluesselt
     * Klaus erfundene Zahlen und haelt sie fuer seine.
     *
     * ⚠ DIE STECHUHR GEHOERT DAZU (Klaus 2026-09-08). Sie fehlte an beiden
     * Ausgaengen: `belege` sind die Anthropic-Rechnungen, `zeiten` die
     * BAUZEITEN aus der Git-Historie — seine gestempelten Abschnitte lebten im
     * `localStorage` und hatten keinen einzigen Weg nach draussen. **Sein
     * Stundennachweis war unsicherbar**, und genau danach hat er gefragt.
     *
     * ⚠ `uhrNull` REIST NICHT MIT. Die ⟲-Marke sagt, seit wann DIESER Browser
     * zaehlt; eingelesen wuerde sie die laufende Zaehlung des Ziel-Browsers
     * umwerfen. Gesichert werden die Abschnitte, nicht der Stand einer
     * Stoppuhr.
     */
    function tresorWasAblegen() {
      var was = [];
      if (daten.belege && !daten.belege._ausBeispiel) was.push(["anthropic-belege", daten.belege]);
      if (daten.zeiten && !daten.zeiten._ausBeispiel) was.push(["zeiten", daten.zeiten]);
      var uhrZeilen = uhrAbschnitte();
      if (uhrZeilen.length) was.push(["stechuhr", { stechuhr: uhrZeilen }]);
      return was;
    }

    /*
     * ⚠ DER DATEINAME SAGT NICHT, OB ETWAS DRIN IST (Klaus 2026-09-08). Er hat
     * zweimal abgelegt und beide Pakete fuer leer gehalten — ein verschlossenes
     * Paket sieht bei jedem Lauf anders aus, und "stechuhr.enc.json abgelegt"
     * beantwortet die Frage nicht, die er hatte. Gezaehlt wird deshalb VOR dem
     * Verschluessen, an demselben Objekt, das gleich hineingeht: eine Zahl aus
     * dem Paket selbst kann nicht von ihm abweichen.
     */
    function tresorNamenMitInhalt(was, endung, jetzt) {
      return was.map(function (x) {
        var i = zeitApi().paketInhalt(x[0], x[1]);
        return zeitApi().dateiName(x[0], endung, jetzt) + (i ? " (" + i + ")" : "");
      }).join(" + ");
    }

    /*
     * ⚠ EINE SICHERUNG, DIE MAN NICHT WIEDERFINDET, IST KEINE (Klaus
     * 2026-09-08, am Muster von Mein Rezeptbuch: dort steht jede Sicherung in
     * einer Liste mit Datum und "52 Rezepte").
     *
     * Die Seite kann den Download-Ordner NICHT lesen — dieselbe Familie von
     * Grenzen wie NETZWEIT § 6b. Sie fuehrt deshalb ein eigenes Verzeichnis
     * dessen, was sie HERAUSGEGEBEN hat: Datum, Dateiname, Inhalt. Das ist
     * ehrlicher als eine Dateiliste zu behaupten — es sagt "das wurde
     * abgelegt", nicht "diese Datei liegt dort".
     */
    function sicherungMerken(eintraege) {
      idbLies(BH_JOURNAL).then(function (alt) {
        var liste = Array.isArray(alt) ? alt.slice() : [];
        eintraege.forEach(function (e) { liste.unshift(e); });
        if (liste.length > SICHERUNGEN_MAX) liste = liste.slice(0, SICHERUNGEN_MAX);
        return idbSchreib(BH_JOURNAL, liste).then(function () { zeichneSicherungen(liste); });
      }).catch(function () { /* fail-soft: eine Liste ist kein Grund, den Weg zu blockieren */ });
    }

    /*
     * ══ EINE STELLE, AN DER EINE SICHERUNG ANKOMMT ══════════════════════════
     *
     * Herausgezogen am 2026-09-08 aus dem Einlese-Knopf, weil das ZURUECKHOLEN
     * aus dem Vorrat dieselbe Arbeit tut. Zwei Fassungen davon waeren eine
     * Drift-Quelle mit Ansage: die eine wuerde die Stechuhr zusammenfuehren,
     * die andere sie irgendwann ersetzen, und niemand saehe es, bis jemand
     * seine Zeiten verliert.
     *
     * ⚠ ANGEWENDET WIRD NACH INHALT, NICHT NACH DATEINAMEN. Wer eine Sicherung
     * umbenennt, soll sie trotzdem einlesen koennen — und ein Vorrats-Eintrag
     * hat gar keinen Dateinamen.
     */
    function tresorWohin(o) {
      if (o && o.belege) return "belege";
      if (o && o.tage) return "zeiten";
      if (o && Array.isArray(o.stechuhr)) return "stechuhr";
      return null;
    }

    function tresorAnwenden(o) {
      var ziel = tresorWohin(o);
      if (!ziel) return Promise.reject(new Error("unbekannt"));
      /*
       * ⚠ ZUSAMMENGEFUEHRT, NICHT ERSETZT — und deshalb ein eigener Zweig.
       * Die Stechuhr wohnt im localStorage, nicht in IndexedDB, und ein
       * Import, der ersetzt, loescht den Bestand des Ziel-Browsers still.
       * Genau darum geht es bei Klaus: zwei Browser, zwei Zeitbestaende.
       */
      if (ziel === "stechuhr") {
        var zus = zeitApi().stechuhrZusammenfuehren(uhrAbschnitte(), o.stechuhr);
        schreib("stechuhr", zus.liste);
        uhrZeichnen(); zeichneProtokoll(); tresorZeichnen();
        return Promise.resolve("Stechuhr eingelesen — " + zus.dazu + " Abschnitt(e) dazu"
          + (zus.schonDa ? ", " + zus.schonDa + " waren schon da" : "")
          + ". Deine hiesigen Zeilen bleiben; zusammengefuehrt wird ueber den"
          + " Beginn, dieselbe Zeile kommt also nur einmal an.");
      }
      return idbSchreib(BH_SCHLUESSEL[ziel], JSON.stringify(o))
        .then(speicherDauerhaft).then(function () {
          daten[ziel] = o; delete verschlossen[ziel]; woher[ziel] = "eingelesen";
          neuAufbauen(); tresorZeichnen();
          return ziel + " eingelesen — die Zahlen stehen jetzt in diesem"
            + " Browser und ersetzen, was vorher da war.";
        });
    }

    /*
     * ══ DER VORRAT — SICHERUNGEN IM BROWSER (Klaus 2026-09-08) ══════════════
     *
     * „im Prinzip ist der Tresor von KHC der Gleiche wie in Mein Rezeptbuch nur
     * sehr umstaendlich … in mein Rezeptbuch waere ich mit einem Klick schon
     * oder mit hoechstens zwei, drei Klicks schon erledigt."
     *
     * Er hatte recht, und der Grund lag tiefer als die Optik. GEMESSEN an
     * beiden Seiten:
     *
     *   Mein Rezeptbuch  0 Aufklapper ·  0 Absaetze ·  ~33 Woerter · 1 Klick
     *   KHC (vorher)     4 Aufklapper · 19 Absaetze · 429 Woerter · Aufklapper
     *                                                   + Dateidialog + Passwort
     *
     * Der Unterschied war NICHT nur Text. Im Rezeptbuch ist jede Zeile eine
     * echte Sicherung IM BROWSER — 🔄 druecken, und sie ist zurueck. In KHC war
     * die Liste nur ein BELEG darueber, dass etwas heruntergeladen wurde; die
     * Datei lag im Download-Ordner. Das Rezeptbuch hat die Sicherung, KHC hatte
     * eine Quittung.
     *
     * ⚠ WAS BEWUSST NICHT MITKOPIERT WIRD: der Rezeptbuch-Tresor ist NICHT
     * verschluesselt (nachgemessen, steht so in der Verfassung — er schuetzt
     * gegen VERLUST, nicht gegen MITLESEN). Hier liegen Klaus' Rechnungsdaten.
     * Der Vorrat ist deshalb der bequeme Weg INNERHALB eines Browsers; der Weg
     * nach DRAUSSEN bleibt die verschluesselte Datei. Zwei Dinge, zwei
     * Aufgaben — dieselbe Trennung wie seit dem 2026-08-22.
     *
     * ⚠ UND DER VORRAT IST KEIN SCHUTZ GEGEN GERAETEVERLUST. Er liegt im
     * selben Browser wie die Zahlen: wer die Browserdaten loescht, verliert
     * beide. Das steht auf der Karte, nicht nur hier.
     */
    /*
     * ══ DER VORRAT ALS LISTE — nach dem Muster von Mein Rezeptbuch ══════════
     *
     * Eine Zeile, drei Knoepfe: 🔄 zurueckholen · 📤 verschlossen herunterladen ·
     * 🗑 loeschen. Genau die drei, die dort seit langem erprobt sind.
     *
     * ⚠ DIE KNOEPFE TRAGEN KHC-STIL, NICHT REZEPTBUCH-STIL (Klaus 2026-09-08:
     * „das UI/Button Farbe und Hintergrund sollte auf KHC abgestimmt sein").
     * Uebernommen ist der AUFBAU, nicht das Aussehen: `.sich-zeile` und
     * `button.mini` gab es hier schon, beide an KHCs Farbtoken.
     *
     * ⚠ UND JEDER KNOPF TRAEGT EIN `title`. Ein Symbol ohne Wort ist ein Raten-
     * spiel — im Rezeptbuch steht dort dieselbe Erklaerung, nur als Tooltip
     * statt als Absatz. Das ist der ganze Trick, mit dem es ohne Flietext
     * auskommt.
     */
    function zeichneVorrat(liste) {
      var z = $("#tresor-vorrat");
      if (!z) return;
      var l = Array.isArray(liste) ? liste : [];
      leer(z);
      z.setAttribute("data-vorrat", String(l.length));
      if (!l.length) {
        z.appendChild(el("p", "leise fehlt",
          "Noch keine Sicherung im Browser. Der Knopf darüber legt eine an —"
          + " danach steht sie hier und ein Druck auf 🔄 holt sie zurück."));
        return;
      }
      function vorratZeile(e) {
        var r = el("div", "sich-zeile vorrat-zeile");
        r.setAttribute("data-vorrat-id", e.id);
        var d = new Date(e.wann);
        var wann = isNaN(d.getTime()) ? "?" : d.toLocaleString("de-DE",
          { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
        var links = el("div", "vorrat-text");
        links.appendChild(el("div", "vorrat-name",
          (e.art === "auto" ? "🕐 " : "📌 ") + (e.name || (e.art === "auto" ? "Automatisch" : "Ohne Namen"))));
        links.appendChild(el("div", "leise", wann + (e.inhalt ? "  ·  " + e.inhalt : "")));
        r.appendChild(links);

        var knoepfe = el("div", "vorrat-knoepfe");
        var mach = function (zeichen, titel, tun) {
          var b = el("button", "mini", zeichen);
          b.type = "button";
          b.title = titel;
          b.setAttribute("aria-label", titel);
          b.addEventListener("click", tun);
          knoepfe.appendChild(b);
          return b;
        };
        mach("🔄", "Diese Sicherung zurückholen", function () {
          vorratSagen("Wird zurückgeholt …", "rechnet");
          vorratZurueckholen(e.id).then(function (berichte) {
            vorratSagen("Zurückgeholt: " + berichte.join(" ")
              + " Dein Stand von eben liegt als „vor dem Zurückholen“ in der Liste.",
              "zurueckgeholt");
          }).catch(function (f) {
            vorratSagen(String(f && f.message) === "weg"
              ? "Diese Sicherung gibt es nicht mehr."
              : "Ging nicht: " + String(f && f.message), "fehler");
          });
        });
        /*
         * ⚠ HERUNTERGELADEN WIRD VERSCHLOSSEN, und das braucht ein Passwort.
         * Ein Knopf, der die Zahlen offen in den Download-Ordner legt, waere
         * genau der Fehler vom 2026-08-22 — ein Tresor, neben dem der Klartext
         * liegt, ist eine Anzeige und kein Schutz.
         */
        mach("📤", "Verschlossen in den Download-Ordner legen", function () {
          var neu = tresorNeuePasswoerter(vorratSagen);
          if (!neu) return;
          vorratSagen("Wird verschlossen — 600 000 Runden, das dauert einen Moment.", "rechnet");
          var jetzt = new Date();
          Promise.all((e.teile || []).map(function (paar) {
            return tresorZu(neu, JSON.stringify(paar[1])).then(function (paket) {
              return [zeitApi().dateiName(paar[0], "enc.json", jetzt), paket];
            });
          })).then(function (fertig) {
            fertig.forEach(function (x) { tresorAblegen(x[0], x[1]); });
            vorratSagen(fertig.length + " Datei(en) heruntergeladen, verschlossen.", "fertig");
            $("#tresor-neu").value = ""; $("#tresor-neu2").value = "";
          }).catch(function (f) { vorratSagen("Ging nicht: " + String(f && f.message), "fehler"); });
        });
        mach("🗑", "Diese Sicherung aus dem Browser löschen", function () {
          /* ⚠ ERST „rechnet", DANN LOESCHEN. Ohne diese Zeile stand hier
             weiter die Meldung des vorigen Schrittes — und wer darauf wartet,
             dass sie NICHT MEHR „rechnet" sagt, wartet auf etwas, das schon
             vorher wahr war. Genau die Falle „eine Bedingung, die schon VOR
             der Handlung wahr ist, ist kein Warten". Gefunden am 2026-09-08,
             weil die Liste durch die Abschnitte etwas langsamer wurde und die
             Probe das Rennen verlor, das sie vorher zufaellig gewann. */
          vorratSagen("Wird gelöscht …", "rechnet");
          vorratLoeschen(e.id).then(function () {
            vorratSagen("Gelöscht. Eine heruntergeladene Datei ist davon nicht betroffen.",
              "geloescht");
          }).catch(function (f) {
            vorratSagen("Ging nicht: " + String(f && f.message), "fehler");
          });
        });
        r.appendChild(knoepfe);
        return r;
      }

      /* ══ ZWEI ABSCHNITTE, WIE IM REZEPTBUCH ═══════════════════════════════
       * „Eigene Backups" und „Automatische Backups (letzte 5)". Die Trennung
       * ist nicht Zierde: die von Hand benannte Sicherung ist die, die jemand
       * bewusst wollte — sie zwischen zwanzig automatischen zu suchen, macht
       * sie wertlos. `vorratKuerzen` kuerzt aus demselben Grund je Sorte.
       *
       * ⚠ DIE ZAHL WIRD GERECHNET, NICHT GETIPPT. Stuende „(letzte 5)" als
       * Text da, waere die Ueberschrift still falsch, sobald jemand
       * `VORRAT_AUTO_MAX` dreht — und niemand saehe es.
       */
      var hand = [], auto = [];
      l.forEach(function (e) { (e.art === "auto" ? auto : hand).push(e); });
      if (hand.length) {
        z.appendChild(el("div", "vorrat-sec", "Eigene Sicherungen"));
        hand.forEach(function (e) { z.appendChild(vorratZeile(e)); });
      }
      if (auto.length) {
        z.appendChild(el("div", "vorrat-sec",
          "Automatisch (letzte " + VORRAT_AUTO_MAX + ")"));
        auto.forEach(function (e) { z.appendChild(vorratZeile(e)); });
      }
    }

    function vorratSagen(text, marke) {
      var n = $("#tresor-vorrat-lage");
      if (!n) return;
      n.textContent = text;
      n.setAttribute("data-vorrat-lage", marke || "");
    }

    var BH_VORRAT = "bh_vorrat";
    var VORRAT_HAND_MAX = 12;
    var VORRAT_AUTO_MAX = 5;

    function vorratLesen() {
      return idbLies(BH_VORRAT).then(function (v) {
        return Array.isArray(v) ? v : [];
      }).catch(function () { return []; });
    }

    /*
     * ⚠ GEKUERZT WIRD JE SORTE, NICHT UEBER DEN HAUFEN. Ein gemeinsamer Deckel
     * haette die von Hand benannten Sicherungen weggeworfen, sobald genug
     * automatische dazukamen — und die von Hand angelegte ist die, die jemand
     * bewusst wollte. Dieselbe Trennung wie im Rezeptbuch (dort „Eigene
     * Backups" und „Automatische Backups (letzte 5)").
     */
    function vorratKuerzen(liste) {
      var hand = [], auto = [];
      liste.forEach(function (e) { (e.art === "auto" ? auto : hand).push(e); });
      return hand.slice(0, VORRAT_HAND_MAX).concat(auto.slice(0, VORRAT_AUTO_MAX));
    }

    function vorratSchreiben(liste) {
      var g = vorratKuerzen(liste);
      return idbSchreib(BH_VORRAT, g).then(speicherDauerhaft)
        .then(function () { zeichneVorrat(g); return g; });
    }

    /*
     * Eine Sicherung ist genau das, was auch in die DATEI ginge — dieselbe
     * Quelle (`tresorWasAblegen`). Zwei Listen, die beide behaupten „das ist
     * deine Sicherung", liefen auseinander, und dann enthielte die Datei
     * etwas anderes als die Zeile darueber.
     */
    function vorratAnlegen(name, art) {
      var teile = tresorWasAblegen();
      if (!teile.length) return Promise.resolve(null);
      var eintrag = {
        id: "v" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        wann: new Date().toISOString(),
        name: name || "",
        art: art === "auto" ? "auto" : "hand",
        inhalt: teile.map(function (x) { return zeitApi().paketInhalt(x[0], x[1]); })
          .filter(Boolean).join(" · "),
        teile: teile
      };
      return vorratLesen().then(function (liste) {
        return vorratSchreiben([eintrag].concat(liste));
      }).then(function () { return eintrag; });
    }

    /*
     * ⚠ ZURUECKHOLEN LEGT VORHER EINEN STAND AN. Ohne das waere ein Fehlgriff
     * endgueltig: wer die falsche Zeile trifft, hat seinen jetzigen Stand
     * ersetzt und keinen Weg zurueck. Ein Ruecksprung, der selbst keinen
     * Ruecksprung hat, ist eine Falle mit Knopf.
     */
    function vorratZurueckholen(id) {
      return vorratLesen().then(function (liste) {
        var e = null;
        liste.forEach(function (x) { if (x.id === id) e = x; });
        if (!e) throw new Error("weg");
        return vorratAnlegen("vor dem Zurückholen", "auto").then(function () {
          var berichte = [];
          return (e.teile || []).reduce(function (kette, paar) {
            return kette.then(function () {
              return tresorAnwenden(paar[1]).then(function (b) { berichte.push(b); });
            });
          }, Promise.resolve()).then(function () { return berichte; });
        });
      });
    }

    function vorratLoeschen(id) {
      return vorratLesen().then(function (liste) {
        return vorratSchreiben(liste.filter(function (x) { return x.id !== id; }));
      });
    }

    function tresorAblegen(name, paket) {
      var a = el("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(paket, null, 2)],
        { type: "application/json" }));
      a.setAttribute("download", name);
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }

    function tresorNeuePasswoerter(sag) {
      var neu = $("#tresor-neu").value, neu2 = $("#tresor-neu2").value;
      if (!neu) { sag("Kein neues Passwort eingegeben.", "kein-pass"); return null; }
      /* ZWEIMAL EINGEBEN IST HIER KEINE SCHIKANE. Ein Tippfehler faellt sonst
         erst auf, wenn die Datei liegt und niemand sie mehr aufbekommt — es
         gibt kein Zuruecksetzen, das ist der Preis echter Verschluesselung. */
      if (neu !== neu2) { sag("Die beiden Passwoerter sind nicht gleich.", "ungleich"); return null; }
      return neu;
    }

    function tresorSagen(t, m) {
      $("#tresor-werk-lage").textContent = t;
      $("#tresor-werk-lage").setAttribute("data-tresor-werk", m);
    }

    /*
     * ⚠ DER WEG, DER AUF KLAUS' TABLET WIRKLICH GEHT.
     *
     * Der Dateiwaehler daneben nuetzt dort nichts: Chrome kommt an Termux'
     * Ordner nicht heran (dieselbe Familie von Grenzen wie NETZWEIT § 6b —
     * eine Webseite kann kein Programm starten und nicht ins Depot schreiben).
     * Er muesste die Dateien erst nach `Downloads` kopieren, dort
     * verschluesseln und zurueckkopieren — zwei Terminal-Befehle und eine
     * OFFENE Kopie seiner Rechnungen, die in `Downloads` liegen bleibt.
     *
     * Ueberfluessig, denn die Seite HAT den Inhalt laengst: sie laedt die
     * Dateien ja, um die Tabelle zu zeichnen. Nach dem Aufschliessen liegt
     * auch der entschluesselte Stand da — deshalb erledigt derselbe Knopf das
     * erste Verschluessen UND den Passwortwechsel.
     */
    /*
     * ══ SICHERN — EIN FELD, EIN KNOPF (Klaus 2026-09-08) ════════════════════
     * Genau die Bedienung aus Mein Rezeptbuch: Name eintippen (darf leer
     * bleiben), 💾 druecken, fertig. KEIN Passwort, KEIN Dateidialog — die
     * Sicherung bleibt im Browser. Wer sie aus dem Browser heraus haben will,
     * nimmt 📤 in ihrer Zeile, und DANN kommt das Passwort.
     */
    var tSichern = $("#tresor-sichern");
    if (tSichern) tSichern.addEventListener("click", function () {
      var feld = $("#tresor-name");
      var name = feld ? feld.value.trim() : "";
      vorratSagen("Wird gesichert …", "rechnet");
      vorratAnlegen(name, "hand").then(function (e) {
        if (!e) {
          /* ⚠ EIN KNOPF, DER SCHWEIGT, IST DERSELBE STILLE FEHLSCHLAG wie
             anderswo in dieser Datei. Es gibt einen Fall, in dem nichts
             entsteht: es liegen gar keine Zahlen vor. Dann steht das da. */
          vorratSagen("Nichts zu sichern — in diesem Browser stehen keine Zahlen."
            + " Lies zuerst eine Sicherung ein oder lade einen Lauf.", "leer");
          return;
        }
        if (feld) feld.value = "";
        vorratSagen("Gesichert" + (e.inhalt ? " — " + e.inhalt : "")
          + ". Sie steht jetzt in der Liste; 🔄 holt sie zurück.", "gesichert");
      }).catch(function (f) {
        vorratSagen("Ging nicht: " + String(f && f.message), "fehler");
      });
    });

    /* Die Liste ueberlebt das Neuladen — sie liegt neben den Zahlen im
       Browser-Speicher. Ohne diese Zeile stuende sie bei jedem Besuch leer da,
       und genau dann braucht man sie. */
    vorratLesen().then(zeichneVorrat);

    /* ══ DAS AUTOMATISCHE BACKUP (Klaus 2026-09-08) ═══════════════════════
     * „Im Mein Rezeptbuch ist ein automatisches Back-up. Das heisst, es wird
     * immer ab einer bestimmten Zeit ein automatisches Back-up erstellen."
     *
     * ZWEI AUSLOESER, und keiner ersetzt den anderen:
     *   · eine Uhr, solange die Seite offen ist — Klaus' eigenes Bild
     *     („ab einer bestimmten Zeit"), und sie faengt die lange Sitzung.
     *   · das VERLASSEN der Seite (`visibilitychange` → hidden), wie im
     *     Rezeptbuch — das ist der Moment, in dem etwas verloren gehen kann.
     * Nur die Uhr faenge den nicht, der nach 25 Minuten weggeht; nur das
     * Verlassen faenge den nicht, der die Seite tagelang offen liegen laesst.
     *
     * ⚠ MIT EINEM MINDESTABSTAND — das ist der Unterschied zum Rezeptbuch.
     * Wer auf dem Tablet zwischen zwei Apps springt, loest `visibilitychange`
     * in einer Minute ein Dutzend Mal aus. Ohne Abstand waeren die fuenf
     * Auto-Plaetze nach zwanzig Sekunden mit zwanzig Sekunden Geschichte
     * gefuellt und die Sicherung von gestern weg. **Ein Vorrat, der sich
     * selbst ueberschreibt, ist kein Vorrat.**
     *
     * ⚠ DER ZEITSTEMPEL LIEGT IN `localStorage`, NICHT IN IndexedDB. Beim
     * Verlassen der Seite bleibt fuer eine asynchrone Antwort keine Zeit —
     * `localStorage` schreibt sofort. Der Vorrat selbst geht weiter nach
     * IndexedDB; geht das beim Weggehen einmal nicht durch, faengt es die Uhr
     * beim naechsten Mal. Ein verpasstes Backup ist ein Aerger, ein
     * verlorener Vorrat waere ein Schaden.
     */
    var AUTO_ABSTAND_MS = 20 * 60 * 1000;
    var AUTO_ZULETZT = "bh_auto_zuletzt";

    function autoName(d) {
      return "Auto " + d.toLocaleDateString("de-DE",
        { day: "2-digit", month: "2-digit", year: "2-digit" })
        + " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }

    function autoSichern(grund) {
      var jetzt = Date.now();
      var vorher = Number(lies(AUTO_ZULETZT, 0)) || 0;
      if (jetzt - vorher < AUTO_ABSTAND_MS) return Promise.resolve(null);
      /* Nichts da heisst nichts sichern — ein leerer Eintrag saehe aus wie
         eine Sicherung und waere keine. */
      if (!tresorWasAblegen().length) return Promise.resolve(null);
      schreib(AUTO_ZULETZT, jetzt);
      return vorratAnlegen(autoName(new Date(jetzt)), "auto").then(function (e) {
        if (e) e.grund = grund || "uhr";
        return e;
      }).catch(function () { return null; });
    }
    /* Ein Haken fuer die Proben — sie sollen den echten Weg gehen und nicht
       zwanzig Minuten warten. Er ruft dieselbe Funktion, die auch die Uhr
       ruft; ein zweiter Weg nur fuer Tests maesse einen zweiten Weg. */
    window.__werkstatt = window.__werkstatt || {};
    window.__werkstatt.autoSichern = autoSichern;
    window.__werkstatt.autoAbstandMs = AUTO_ABSTAND_MS;

    setInterval(function () { autoSichern("uhr"); }, AUTO_ABSTAND_MS);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") autoSichern("weggegangen");
    });

    /* ══ DER GANZE INHALT — PER POSITIVLISTE ══════════════════════════════
     *
     * Klaus 2026-09-08: „der gesamte Inhalt der App … für QuickShare und
     * Bluetooth zum direkten Versand an jemanden geschickt, der den Inhalt
     * haben möchte. Also Forschungsdaten oder sonst irgendetwas."
     *
     * ⚠ AUFGEZAEHLT WIRD, WAS HINEIN DARF — nicht, was draussen bleibt. Das
     * ist die PRIME DIRECTIVE aus `BookLedgerPro/src/domain/angebote.js`: was
     * hier nicht steht, kann nicht hinaus, auch wenn morgen ein Feld dazukommt.
     * Andersherum — „alles ausser dem Schluessel" — waere bei jedem neuen Feld
     * eine neue Entscheidung, und die trifft irgendwann niemand.
     *
     * ⚠ DER BYOK-SCHLUESSEL STEHT NICHT DARIN UND KANN ES NICHT. Er liegt in
     * derselben IndexedDB unter `byok_schluessel`. Eine Ablage, die „alles aus
     * der Datenbank" naehme, haette ihn mitgeschickt — verschluesselt zwar,
     * aber an einen Empfaenger, der beliebig lange raten darf. Ein Wächter in
     * `tests/smoke_tresor.mjs` legt einen echten Schluessel ein und besteht
     * darauf, dass keine seiner Zeichenketten in der Datei steht.
     */
    var GANZ_KOPF = ["art", "fassung", "wann", "woher"];
    var GANZ_FELDER = ["belege", "zeiten", "stechuhr", "vorrat", "journal", "forschung"];

    /*
     * ⚠ DIE FORSCHUNGS-AUFZEICHNUNG LIEGT ALS DATEI IM DEPOT, NICHT IM
     * BROWSER — und Klaus hat vorhergesagt, was daraus folgt: „das wird sich
     * in Company mit der Forschung nicht funktionieren. Das müsste dann in
     * KimHub sein." Er hat recht. Geloest wird es NICHT durch einen zweiten
     * Knopf: derselbe fragt, und wo es die Datei nicht gibt, fehlt sie im
     * Paket und das Ergebnis sagt das hin. Zwei Fassungen desselben Knopfes
     * liefen auseinander, und dann behauptete die eine etwas ueber die andere.
     */
    function forschungHolen() {
      try {
        return fetch("forschung/sitzungen.json", { cache: "no-store" })
          .then(function (a) { return a.ok ? a.json() : null; })
          .catch(function () { return null; });
      } catch (e) { return Promise.resolve(null); }
    }

    function ganzerInhalt() {
      /* Auch der Kopf kommt aus einer Liste — sonst waere `GANZ_KOPF` eine
         Regel, deren Fehlen nichts aendert, und das ist eine Behauptung. */
      var kopf = {
        art: "kimhub-inhalt",
        fassung: 1,
        wann: new Date().toISOString(),
        woher: location.host + location.pathname
      };
      var paket = {};
      GANZ_KOPF.forEach(function (k) { paket[k] = kopf[k]; });
      var uhr = uhrAbschnitte();
      return Promise.all([
        idbLies(BH_VORRAT).catch(function () { return null; }),
        idbLies(BH_JOURNAL).catch(function () { return null; }),
        forschungHolen()
      ]).then(function (x) {
        /* ⚠ DIE LISTE BAUT DAS PAKET, SIE FILTERT ES NICHT NACHTRAEGLICH.
           Der Unterschied ist der ganze Schutz: ein Filter laesst sich
           entfernen, und dann ist alles drin, was vorher hineingeschrieben
           wurde. Eine Liste, die KOPIERT, laesst sich nicht entfernen — ohne
           sie ist das Paket leer, und das faellt sofort auf. Dasselbe Muster
           wie `PROTOKOLL_FELDER` in BookLedgerPro. */
        var quelle = {
          belege: (daten.belege && !daten.belege._ausBeispiel) ? daten.belege : null,
          zeiten: (daten.zeiten && !daten.zeiten._ausBeispiel) ? daten.zeiten : null,
          stechuhr: uhr.length ? uhr : null,
          vorrat: (Array.isArray(x[0]) && x[0].length) ? x[0] : null,
          journal: (Array.isArray(x[1]) && x[1].length) ? x[1] : null,
          forschung: x[2] || null
        };
        GANZ_FELDER.forEach(function (k) {
          if (quelle[k] != null) paket[k] = quelle[k];
        });
        return paket;
      });
    }

    function inhaltLeer(p) {
      return !p.belege && !p.zeiten && !p.stechuhr && !p.vorrat && !p.forschung;
    }

    /* Was drin ist, wird GEZAEHLT statt behauptet — dieselbe Regel wie bei
       `tresorNamenMitInhalt`: „stechuhr.enc.json abgelegt" beantwortet die
       Frage nicht, die jemand hat. */
    function inhaltZaehlen(p) {
      var t = [];
      if (p.belege) t.push("Belege");
      if (p.zeiten) t.push("Zeiten");
      if (p.stechuhr) t.push(p.stechuhr.length + " Stechuhr-Abschnitte");
      if (p.vorrat) t.push(p.vorrat.length + " Sicherungen");
      if (p.journal) t.push(p.journal.length + " Journal-Zeilen");
      t.push(p.forschung
        ? "Forschungs-Aufzeichnung"
        : "ohne Forschungs-Aufzeichnung (die liegt nur in Kimhub)");
      return t.join(" · ");
    }

    function inhaltDatei() {
      return ganzerInhalt().then(function (p) {
        return {
          paket: p,
          name: zeitApi().dateiName("kimhub-inhalt", "json", new Date()),
          text: JSON.stringify(p, null, 2)
        };
      });
    }
    window.__werkstatt.ganzerInhalt = ganzerInhalt;
    window.__werkstatt.autoDeckel = VORRAT_AUTO_MAX;

    function lageSagen(wo, marke, text, wert) {
      var n = $(wo);
      if (!n) return;
      n.textContent = text;
      n.setAttribute(marke, wert || "");
    }

    // ── 💾 Datensicherung (JSON) — ein Knopf, eine Datei ────────────────────
    var jSich = $("#bh-json-sichern");
    if (jSich) jSich.addEventListener("click", function () {
      lageSagen("#bh-json-lage", "data-json-lage", "Wird zusammengestellt …", "rechnet");
      inhaltDatei().then(function (d) {
        if (inhaltLeer(d.paket)) {
          lageSagen("#bh-json-lage", "data-json-lage",
            "Nichts zu sichern — in diesem Browser stehen keine Zahlen.", "leer");
          return;
        }
        tresorAblegen(d.name, d.paket);
        lageSagen("#bh-json-lage", "data-json-lage",
          d.name + " heruntergeladen — " + inhaltZaehlen(d.paket), "fertig");
      }).catch(function (f) {
        lageSagen("#bh-json-lage", "data-json-lage",
          "Ging nicht: " + String(f && f.message), "fehler");
      });
    });

    // ── 📤 Teilen & Synchronisieren ────────────────────────────────────────
    /*
     * ⚠ WARUM ES ZWEI KNOEPFE SIND (Klaus 2026-09-08): „bei teilen und sichern
     * geht der download, aber teilen und die optionen nicht auf".
     *
     * `navigator.share` verlangt eine FRISCHE Nutzer-Geste. Zwischen dem Klick
     * und dem Aufruf liegen zwei IndexedDB-Lesungen und ein `fetch`; bis die
     * durch sind, hat Android die Geste verfallen lassen und `share()` wirft.
     * Derselbe Befund wie beim Termux-Sprung am 2026-08-22 — die Regel stand
     * schon da („alles Geste-Abhaengige passiert ZUERST") und half hier nicht,
     * weil die Datei erst aus dem Gesammelten entsteht.
     *
     * Klaus' eigenes Rezeptbuch loest das seit langem mit `retryShareBook`:
     * die fertige Datei liegt bereit, und ein ZWEITER Druck ruft `share()`
     * ohne ein einziges `await` davor. Nachgeschlagen, nicht neu erfunden.
     */
    var bereiteDatei = null;

    function fehlerName(f) {
      return (f && (f.name || f.message)) ? String(f.name || f.message) : "unbekannt";
    }
    function zweitenGriffZeigen() {
      var n = $("#bh-teilen-nochmal");
      if (n) n.hidden = !(bereiteDatei && navigator.share);
    }

    var tNochmal = $("#bh-teilen-nochmal");
    if (tNochmal) tNochmal.addEventListener("click", function () {
      if (!bereiteDatei) {
        lageSagen("#bh-teilen-lage", "data-teilen-lage",
          "Erst „📤 Teilen / Sichern\" drücken — dann liegt die Datei bereit.", "leer");
        return;
      }
      /* ⚠ HIER STEHT KEIN `await` UND KEIN `.then` VOR `share()`. Genau das
         ist der ganze Zweck dieses Knopfes; wer hier etwas davorschiebt,
         nimmt ihm seine Wirkung und baut den Fehler wieder ein. */
      navigator.share({ files: [bereiteDatei.datei], title: "Kimhub — Inhalt" })
        .then(function () {
          lageSagen("#bh-teilen-lage", "data-teilen-lage",
            "Geteilt — " + inhaltZaehlen(bereiteDatei.paket), "geteilt");
        })
        .catch(function (f) {
          if (f && f.name === "AbortError") {
            lageSagen("#bh-teilen-lage", "data-teilen-lage", "Abgebrochen.", "abgebrochen");
            return;
          }
          lageSagen("#bh-teilen-lage", "data-teilen-lage",
            "Teilen ging auch beim zweiten Versuch nicht (" + fehlerName(f) + "). "
            + bereiteDatei.name + " liegt im Download-Ordner: Dateien-App öffnen →"
            + " antippen → Teilen → Quick Share.", "fehler");
        });
    });

    var tTeil = $("#bh-teilen");
    if (tTeil) tTeil.addEventListener("click", function () {
      lageSagen("#bh-teilen-lage", "data-teilen-lage", "Wird zusammengestellt …", "rechnet");
      inhaltDatei().then(function (d) {
        if (inhaltLeer(d.paket)) {
          lageSagen("#bh-teilen-lage", "data-teilen-lage",
            "Nichts zu teilen — in diesem Browser stehen keine Zahlen.", "leer");
          return;
        }
        /*
         * ⚠ DER RUECKFALL IST KEIN FEHLSCHLAG, SONDERN DER ZWEITE WEG. Quick
         * Share und Bluetooth laufen ueber `navigator.share`; wo der Browser
         * das nicht kann — jeder Rechner-Browser —, landet DIESELBE Datei im
         * Download-Ordner, und von dort geht sie per E-Mail. Ein Knopf, der
         * ohne `navigator.share` gar nichts taete, waere genau der tote Knopf
         * mit Beschriftung, vor dem die Verfassung warnt.
         */
        var datei = null;
        try {
          datei = new File([new Blob([d.text], { type: "application/json" })],
            d.name, { type: "application/json" });
        } catch (e) { datei = null; }
        var kann = !!(datei && navigator.canShare && navigator.canShare({ files: [datei] }));
        /* Die fertige Datei bleibt liegen — der zweite Knopf braucht sie, und
           er darf sie NICHT neu bauen (dann waere die Geste wieder weg). */
        bereiteDatei = datei ? { datei: datei, paket: d.paket, name: d.name } : null;
        var inDenOrdner = function (warum) {
          tresorAblegen(d.name, d.paket);
          zweitenGriffZeigen();
          lageSagen("#bh-teilen-lage", "data-teilen-lage",
            warum + " — " + d.name + " liegt im Download-Ordner. "
            + inhaltZaehlen(d.paket)
            /* ⚠ DER HINWEIS MUSS ZU DEM PASSEN, WAS DASTEHT. Die erste
               Fassung versprach den zweiten Knopf auch dort, wo er verborgen
               bleibt (kein `navigator.share`) — ein Verweis auf einen Knopf,
               den es nicht gibt, ist schlimmer als kein Verweis. Gefragt wird
               deshalb dasselbe wie in `zweitenGriffZeigen`. */
            + ((bereiteDatei && navigator.share)
              ? "  Die Datei ist fertig: „📤 Jetzt teilen\" öffnet das Teilen-Fenster."
              : "  Dateien-App öffnen → antippen → Teilen → Quick Share."),
            "datei");
        };
        if (!kann) { inDenOrdner("Dieser Browser kann keine Dateien teilen"); return; }
        return navigator.share({ files: [datei], title: "Kimhub — Inhalt" })
          .then(function () {
            lageSagen("#bh-teilen-lage", "data-teilen-lage",
              "Geteilt — " + inhaltZaehlen(d.paket), "geteilt");
          })
          .catch(function (f) {
            /* Abgebrochen ist eine ENTSCHEIDUNG, kein Fehler — wer sie als
               Fehlschlag meldet, laesst den Nutzer nach einem Problem suchen,
               das er selbst gemacht hat. */
            if (f && f.name === "AbortError") {
              lageSagen("#bh-teilen-lage", "data-teilen-lage", "Abgebrochen.", "abgebrochen");
              return;
            }
            /* ⚠ DER FEHLER WIRD BEIM NAMEN GENANNT. „Teilen ging nicht" allein
               hat Klaus am 2026-09-08 eine Meldung gegeben, aus der niemand
               ablesen konnte, WORAN es lag — und der Verdacht (verfallene
               Geste) war nur ein Verdacht. Der Name steht jetzt dabei. */
            inDenOrdner("Teilen ging nicht (" + fehlerName(f) + ")");
          });
      }).catch(function (f) {
        lageSagen("#bh-teilen-lage", "data-teilen-lage",
          "Ging nicht: " + String(f && f.message), "fehler");
      });
    });

    var tGeladen = $("#tresor-geladen");
    if (tGeladen) tGeladen.addEventListener("click", function () {
      var neu = tresorNeuePasswoerter(tresorSagen);
      if (!neu) return;
      var was = tresorWasAblegen();
      if (!was.length) {
        tresorSagen(tresorGesperrt().length
          ? "Erst aufschliessen — verschlossen kann die Seite nichts weitergeben."
          : "Es ist nichts geladen, was verschlossen werden koennte.", "nichts-geladen");
        return;
      }
      /* ⚠ EINE ZEIT FUER DIE GANZE ABLAGE. Wird je Datei neu gefragt, tragen
         zwei Pakete aus demselben Druck verschiedene Minuten — und sehen dann
         aus wie zwei Sicherungen. */
      var jetztAblage = new Date();
      tresorSagen("Wird verschlossen — 600 000 Runden je Datei, das dauert einen Moment.", "rechnet");
      Promise.all(was.map(function (x) {
        return tresorZu(neu, JSON.stringify(x[1], null, 2)).then(function (p) { return [x[0], p]; });
      })).then(function (fertig) {
        fertig.forEach(function (f, i) {
          /* Nacheinander: zwei Downloads im selben Augenblick verschluckt
             Chrome gern den zweiten. */
          setTimeout(function () {
            tresorAblegen(zeitApi().dateiName(f[0], "enc.json", jetztAblage), f[1]);
          }, i * 400);
        });
        /*
         * ⚠ WAS UEBERSPRUNGEN WURDE, WIRD GENANNT — gefunden von der eigenen
         * Probe (2026-08-22). Ist EINE Datei noch verschlossen und die andere
         * offen, legte dieser Knopf klaglos nur die offene ab. Klaus haette
         * gedrueckt, eine Datei bekommen und geglaubt, er sei fertig — waehrend
         * die zweite beim alten Passwort bleibt. Ein halber Wechsel, der wie
         * ein ganzer aussieht, ist schlimmer als gar keiner: beim naechsten Mal
         * passt ein Passwort und das andere nicht, und niemand weiss warum.
         */
        var zu = tresorGesperrt();
        /* Wann zuletzt gesichert wurde, ist die Auskunft, die bei einem
           Browser-Speicher zählt — er ist der einzige Ort, an dem die Zahlen
           stehen. Ohne sie wüsste niemand, wie alt der Rückweg ist. */
        idbSchreib(BH_SICHERUNG, jetztAblage.toISOString().slice(0, 16).replace("T", " "))
          .then(tresorWoZeichnen).catch(function () { /* fail-soft */ });
        sicherungMerken(was.map(function (x) {
          return { wann: jetztAblage.toISOString(),
                   datei: zeitApi().dateiName(x[0], "enc.json", jetztAblage),
                   inhalt: zeitApi().paketInhalt(x[0], x[1]), art: "verschlossen" };
        }));
        tresorSagen(tresorNamenMitInhalt(was, "enc.json", jetztAblage)
          + " abgelegt — sie liegen in deinem Download-Ordner. Diese Dateien kommen "
          + "ins Depot, die offenen nicht."
          + (zu.length ? "  ⚠ UEBERSPRUNGEN, weil noch verschlossen: " + zu.join(" + ")
              + ". Diese Datei behaelt ihr altes Passwort — erst oben aufschliessen,"
              + " dann noch einmal." : ""),
          zu.length ? "fertig-teils" : "fertig-geladen");
        $("#tresor-neu").value = ""; $("#tresor-neu2").value = "";
      }, function () { tresorSagen("Ging nicht.", "fehler"); });
    });

    /*
     * ⚠ DER RÜCKWEG, DEN KLAUS VERMISST HAT: „ich finde keine Möglichkeit,
     * eine bestehende Datei wieder zu entschlüsseln." Er hatte recht — der
     * Tresor war einseitig gebaut. Ein Tresor, aus dem man nichts herausholen
     * kann, ist ein Briefkasten.
     */
    var tKlar = $("#tresor-klartext");
    if (tKlar) tKlar.addEventListener("click", function () {
      var jetztAblage = new Date();
      var was = tresorWasAblegen();
      if (!was.length) {
        tresorSagen(tresorGesperrt().length
          ? "Erst aufschliessen — verschlossen kann die Seite nichts weitergeben."
          : "Es ist nichts geladen, was herausgegeben werden koennte.", "nichts-geladen");
        return;
      }
      was.forEach(function (x, i) {
        setTimeout(function () {
          /* Auch hier KEIN BOM: das liest ein Parser, kein Mensch. */
          tresorAblegen(zeitApi().dateiName(x[0], "json", jetztAblage), x[1]);
        }, i * 400);
      });
      sicherungMerken(was.map(function (x) {
        return { wann: jetztAblage.toISOString(),
                 datei: zeitApi().dateiName(x[0], "json", jetztAblage),
                 inhalt: zeitApi().paketInhalt(x[0], x[1]), art: "offen" };
      }));
      var zu = tresorGesperrt();
      tresorSagen(tresorNamenMitInhalt(was, "json", jetztAblage)
        + " offen abgelegt — im Download-Ordner, unverschluesselt."
        + (zu.length ? "  ⚠ UEBERSPRUNGEN, weil noch verschlossen: " + zu.join(" + ") + "." : "")
        + "  Diese Dateien gehoeren NICHT ins Depot.",
        zu.length ? "klartext-teils" : "klartext");
    });

    /*
     * Der Weg zurück nach einem Gerätewechsel. Ohne ihn wäre eine Sicherung
     * eine Datei, die man aufheben, aber nie benutzen kann.
     */
    var tEin = $("#tresor-einlesen");
    if (tEin) tEin.addEventListener("click", function () {
      var d = $("#tresor-datei").files && $("#tresor-datei").files[0];
      if (!d) { tresorSagen("Keine Datei gewaehlt.", "keine-datei"); return; }
      var alt = $("#tresor-alt") ? $("#tresor-alt").value : "";
      /* Welche der beiden Schubladen? Am INHALT erkannt, nicht am Dateinamen —
         wer eine Sicherung umbenennt, soll sie trotzdem einlesen koennen. */
      var wohin = function (o) {
        if (o && o.belege) return "belege";
        if (o && o.tage) return "zeiten";
        /*
         * ⚠ DIE STECHUHR GEHOERTE HIER VON ANFANG AN HIN (Klaus 2026-09-08,
         * beim ersten Versuch, seine 469 Minuten zurueckzuholen).
         *
         * Am selben Tag habe ich den Tresor gelehrt, die Stechuhr ABZULEGEN —
         * und den Einlese-Zweig dafuer in den ANDEREN Weg gebaut ("⭱ Lauf
         * laden"). Der Tresor konnte sie damit hineinlegen und nicht wieder
         * herausholen: genau das, was die Verfassung schon einmal gelernt hat
         * ("ein Tresor, aus dem man nichts herausholen kann, ist ein
         * Briefkasten"), nur an einer neuen Datei.
         *
         * Und die Meldung darauf war die irrefuehrende Sorte: "Darin steht
         * weder eine Beleg- noch eine Zeiten-Liste" — wahr fuer das, was der
         * Code kannte, und falsch fuer das, was in der Datei stand.
         */
        if (o && Array.isArray(o.stechuhr)) return "stechuhr";
        return null;
      };
      tresorSagen("Wird gelesen …", "rechnet");
      d.text().then(function (roh) {
        var o = JSON.parse(roh);
        /* Ein Paket aus einer neueren Fassung sieht aus wie ein Paket und ist
           kein Klartext. Ohne diese Zeile fiele es in den Klartext-Zweig und
           die Seite meldete „darin steht weder eine Beleg- noch eine
           Zeiten-Liste" — wahr für das, was sie sieht, und irreführend. */
        if (istTresorForm(o) && o.v !== TRESOR_FASSUNG) throw new Error("fassung");
        if (!istTresor(o)) return o;
        if (!alt) throw new Error("alt-fehlt");
        return tresorAuf(alt, o).then(function (t) { return JSON.parse(t); });
      }).then(function (o) {
        return tresorAnwenden(o).then(function (bericht) {
          tresorSagen(bericht, "eingelesen");
        });
      }).catch(function (fehler) {
        var grund = String(fehler && fehler.message);
        tresorSagen(
          grund === "alt-fehlt" ? "Die Datei ist verschlossen — das Passwort fehlt (Feld darueber)."
          : grund === "fassung" ? "Diese Sicherung stammt aus einer neueren Fassung —"
            + " diese Seite kann sie nicht oeffnen. Am Passwort liegt es nicht."
          : grund === "unbekannt" ? "Darin steht keine Beleg-, Zeiten- oder Stechuhr-Liste."
          : "Ging nicht: falsches Passwort, oder die Datei ist kein JSON.",
          grund === "unbekannt" ? "unbekannt" : grund === "fassung" ? "fassung" : "fehler");
      });
    });

    var tMach = $("#tresor-machen");
    if (tMach) tMach.addEventListener("click", function () {
      var d = $("#tresor-datei").files && $("#tresor-datei").files[0];
      var alt = $("#tresor-alt") ? $("#tresor-alt").value : "";
      var sag = tresorSagen;
      if (!d) { sag("Keine Datei gewaehlt.", "keine-datei"); return; }
      var neu = tresorNeuePasswoerter(sag);
      if (!neu) return;
      sag("Wird verschlossen — 600 000 Runden, das dauert einen Moment.", "rechnet");
      tresorSchliessen(d, alt, neu).then(function (paket) {
        var name = d.name.replace(/\.enc\.json$/i, "").replace(/\.json$/i, "") + ".enc.json";
        tresorAblegen(name, paket);
        sag(name + " heruntergeladen. Diese Datei kommt ins Depot — die offene nicht.", "fertig");
        $("#tresor-neu").value = ""; $("#tresor-neu2").value = "";
        if ($("#tresor-alt")) $("#tresor-alt").value = "";
      }, function (fehler) {
        var g = String(fehler && fehler.message);
        sag(g === "alt-fehlt"
          ? "Die Datei ist schon verschlossen — das alte Passwort fehlt."
          : g === "fassung"
          ? "Diese Datei stammt aus einer neueren Fassung — diese Seite kann sie"
            + " nicht oeffnen. Am Passwort liegt es nicht."
          : "Ging nicht: falsches altes Passwort, oder die Datei ist kein JSON.",
          g === "fassung" ? "fassung" : "fehler");
      });
    });

    $("#notiz-kopieren").addEventListener("click", function () {
      var txt = notiz.value;
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(txt).then(function () { $("#notiz-lage").textContent = "kopiert"; },
          function () { $("#notiz-lage").textContent = "Kopieren ging nicht — von Hand markieren."; });
      else { notiz.select(); $("#notiz-lage").textContent = "markiert — jetzt kopieren."; }
    });
  }

  // ── Los ─────────────────────────────────────────────────────────────────
  // Für die Proben: ein Haken am ZUSTAND, nicht eine Wartezeit. `bereit` wird
  // erst wahr, wenn die Dateien wirklich da sind — würde es hier schon auf
  // wahr stehen, prüfte eine Probe eine leere Seite und wäre grün.
  window.__werkstatt = {
    /* ══ FÜR KIM HUB COMPANY: einen laufenden Lauf hereinreichen ══════════
     *
     * `schicht.mjs` gibt seinen Zwischenstand in **derselben Form** heraus wie
     * das Endergebnis — das steht dort im Code, mit der Begründung „zwei Formen
     * wären zwei Stellen, an denen eine Anzeige etwas anderes behauptet als die
     * Datei". Genau dafür ist das gebaut worden, und hier wird es eingelöst:
     * dieselben Räume zeigen einen laufenden Lauf wie eine fertige Datei.
     *
     * ⚠ EIN ZUSATZ, KEIN ERSATZ — wie die Quell-Naht oben. Wer nichts speist,
     * merkt von dieser Zeile nichts. */
    speise: function (teil, wert) {
      daten[teil] = wert;
      neuAufbauen();
    },
    daten: daten,
    achse: function () { return achse; },
    stand: function () { return stand; },
    setzeStand: setzeStand,
    /* Nur für die Probe: der Rückfall, wenn ein gespeicherter Raum fehlt. */
    zeigeRaum: zeigeRaum,
    /* Nur für die Probe: der Mitnehm-Block, gemessen statt abgeschrieben. */
    laufAlsText: laufAlsText,
    /* Nur für die Probe: einen Zustand herstellen, den die Ausgangslage nicht
       hergibt (eigene Konferenz neben mitgeliefertem Blatt). */
    neuAufbauen: function () { neuAufbauen(); },
    /* Die Regel hinter dem Pages-Hinweis — prüfbar, ohne die Adresse zu fälschen. */
    istNetzHost: istNetzHost,
    /* Die Absicht als Zeichenkette: die Ersatz-Adresse darin ist der Riegel
       gegen den Fehler vom Vormittag (Seite navigiert sich tot). Ob Android
       daraus wirklich Termux macht, sieht nur Klaus — die ADRESSE lässt sich
       aber messen. */
    termuxAdresse: termuxAdresse,
    /*
     * Und die Uhr. Ohne diese Haken ließe sich „Start zählt weiter" nur über
     * echtes Warten prüfen — und eine Probe, die auf die Uhr wartet statt auf
     * eine Bedingung, ist genau die Sorte, vor der die Verfassung warnt.
     * `uhrStand` ist die STOPPUHR (seit dem letzten ⟲), `uhrGesamt` alles.
     */
    uhr: { stand: function () { return uhrStand(); },
           gesamt: function () { return uhrGesamt(); },
           laeuft: function () { return !!uhrLaeuft; },
           abschnitte: function () { return uhrAbschnitte(); },
           protokoll: function () { return protokollText(); },
           satzCent: satzCent,
           /* Nur für die Probe: einen abgeschlossenen Abschnitt einspeisen,
              ohne eine Minute wirklich zu sitzen. */
           lege: function (sekunden, was, vorMs) {
             var l = uhrAbschnitte();
             l.push({ von: Date.now() - (vorMs || 0), sekunden: sekunden, was: was || "Probe" });
             schreib("stechuhr", l);
             uhrZeichnen(); zeichneProtokoll();
           } },
    /*
     * Nur für die Probe: Belege einspeisen und neu zeichnen. Der Riegel gegen
     * die „gemessen aussehende Null" lässt sich sonst nicht prüfen — er greift
     * bei einer LEEREN Sorte, und die echte Datei hat seit dem 2026-08-22 von
     * jeder Sorte mindestens einen. Ein Riegel, den keine Probe von seinem
     * Fehlen unterscheiden kann, ist eine Behauptung.
     */
    setzeBelege: function (b) { daten.belege = b; zeichneBuchhaltung(); },
    /*
     * Nur für die Probe: ein Fahrtenbuch einspeisen. Ohne diesen Haken wäre die
     * Doppelzählung nicht prüfbar — sie tritt nur auf, wenn eine gestempelte
     * Stunde und eine gefahrene sich WIRKLICH überschneiden, und darauf zu
     * warten hiesse, den Riegel nie zu messen. Genau die Sorte Behauptung, die
     * hier schon einmal Geld gekostet hat.
     */
    /* ⚠ AUCH DAS FAHRTENBUCH NEU ZEICHNEN. Der Haken setzte nur Uhr und
       Protokoll — die Kachel „N Fahrt(en), davon …" blieb auf dem vorigen
       Stand, und ein Wächter darauf mass das VORIGE Einspeisen. Gefunden, als
       eine neue Prüfung „davon 2 mit Kosten" las, obwohl eine Fahrt eingespeist
       war. Ein Test-Haken, der die Anzeige nur halb erneuert, misst die halbe
       Anzeige. */
    setzeFahrten: function (b) {
      daten.fahrten = b; uhrZeichnen(); zeichneProtokoll(); zeichneFahrtenbuch();
    },
    /* Und was dabei herauskommt — damit eine Probe die VEREINIGUNG messen kann
       und nicht nur, ob irgendeine Zahl dasteht. */
    zeitStand: function () {
      var v = vereinigt(alleAbschnitte());
      return { gesamtSek: v.sekunden, ueberlappungSek: v.ueberlappungSek,
               abschnitte: alleAbschnitte().length,
               fahrten: fahrtAbschnitte().length,
               protokoll: protokollText() };
    },
    /* Der Tresor, für die Proben aufgeschlüsselt. `zu()` sagt, WAS verschlossen
       ist — eine Probe, die nur „irgendetwas ist zu" prüfen könnte, wäre auch
       dann grün, wenn die falsche Datei klemmt. `pass()` gibt NICHT das
       Passwort heraus, nur ob eines im Speicher steht: ein Test-Haken, der ein
       Geheimnis herausreicht, ist ein Loch mit Prüfsiegel. */
    /* Der Wohnort, für die Proben aufgeschlüsselt. `leeren()` ist der Grund,
       warum sie überhaupt etwas messen können: ohne ihn schleppte jede Lage
       den Stand der vorigen mit, und die Probe prüfte irgendwann den Rest
       ihres eigenen letzten Laufs. */
    /* Der Chef-Code, fuer die Proben aufgeschluesselt. `gesetzt()` und `auf()`
       geben JA/NEIN heraus, NIEMALS den Code — derselbe Grundsatz wie
       `hatPass` beim Tresor. */
    chef: {
      gesetzt: function () { return !!chefStand; },
      auf: function () { return chefOffen; },
      pruefen: function (c) { return chefPruefen(c); },
      zumachen: function () { chefOffen = false; chefZeichnen(); },
    },
    speicher: {
      /* ⚠ DAMIT SICH DER WEG MESSEN LAESST, NICHT NUR DIE UMGEBUNG. Ob der
         Browser Dauerhaftigkeit ZUSAGT, ist seine Sache; ob wir ihn ueberhaupt
         FRAGEN, ist unsere. Ohne diesen Haken war beides nicht zu trennen — und
         eine Gegenprobe, die den Aufruf entfernte, blieb gruen. */
      dauerhaft: function () { return speicherDauerhaft(); },
      leeren: function () { return idbFach.leeren(); },
      lies: idbLies,
      schreib: idbSchreib,
      woher: function () { return JSON.parse(JSON.stringify(woher)); },
      lage: speicherLage,
    },
    tresor: {
      zu: function () { return tresorGesperrt().slice().sort(); },
      /* ⚠ GIBT NUR JA/NEIN, NIE DAS PASSWORT. Die Gegenprobe hat am
         2026-08-22 bewiesen, dass dieser Riegel eine Behauptung war: sie
         tauschte ihn gegen `return tresorPass` — und NICHTS fiel um, weil
         keine Probe ihn je aufrief. Ein Test-Haken, der ein Geheimnis
         herausreicht, ist ein Loch mit Pruefsiegel; jetzt misst
         smoke_tresor.mjs den Typ. */
      hatPass: function () { return tresorPass !== null; },
      zumachen: function (pass, obj) { return tresorZu(pass, JSON.stringify(obj)); },
      aufmachen: function (pass, paket) { return tresorAuf(pass, paket); },
      istPaket: istTresor,
      sperren: function (name, paket) { verschlossen[name] = paket; daten[name] = null; neuAufbauen(); },
      oeffnen: tresorOeffnen,
    },
    bereit: false,
  };

  /*
   * Der Schimmer folgt dem Zeiger — die Glas-Konstruktion aus family-project.
   * EIN Zuhörer am Dokument statt einer je Knopf: bei über hundert Knöpfen wäre
   * das sonst hundert Mal derselbe Aufwand. Ohne Zeiger (Tablet, Tastatur)
   * bleibt der Schimmer in der Mitte und der Knopf sieht trotzdem richtig aus.
   */
  document.addEventListener("pointermove", function (ev) {
    var k = ev.target && ev.target.closest && ev.target.closest("button");
    if (!k) return;
    var r = k.getBoundingClientRect();
    k.style.setProperty("--mx", Math.round(((ev.clientX - r.left) / r.width) * 100) + "%");
    k.style.setProperty("--my", Math.round(((ev.clientY - r.top) / r.height) * 100) + "%");
  }, { passive: true });

  // Der Service-Worker macht die Seite installierbar und offline-tauglich.
  // Er cacht die SCHALE, niemals die Daten — sonst zeigte die App nach dem
  // nächsten Lauf den alten Stand und sähe aus, als wäre nichts passiert.
  if ("serviceWorker" in navigator && location.protocol !== "file:")
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* fail-soft */ });
    });

  verdrahten();
  /* ⚠ ZUERST HOLEN, DANN ZEICHNEN. `uhrHolen()` liest den laufenden Abschnitt
     aus dem Speicher zurück — das ist der ganze Fix gegen „nach jedem
     Aktualisieren startet es wieder bei null". Stünde `uhrZeichnen()` davor,
     zeigte die Seite für einen Augenblick eine Uhr ohne ihren laufenden
     Abschnitt, und wer in diesem Augenblick stoppt, verlöre ihn doch. */
  uhrHolen();
  /* NACH `uhrHolen()`. Vorher wüsste sie nicht, dass schon eine Uhr läuft,
     und legte eine zweite über den laufenden Abschnitt. */
  uhrPerAdresse();
  uhrZeichnen();
  zeichneProtokoll();
  /* ⚠ DER CHEF-STAND WIRD VOR DEM „bereit" GELESEN. Käme er danach, stünden
     die Zahlen für einen Wimpernschlag offen da — und genau dieser Wimpernschlag
     ist der Grund, warum die Sperr-Liste in Kimboard mit `defer` im `<head>`
     hängt. Ein Schloss, das erst nach dem ersten Anstrich zugeht, ist keins. */
  laden()
    .then(chefLaden)
    .then(function () { chefZeichnen(); })
    .then(function () { window.__werkstatt.bereit = true; });
})();
