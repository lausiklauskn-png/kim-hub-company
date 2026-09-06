/*
 * buehne.js — die Werkstatt als Ort, nicht als Textwand.
 *
 * WARUM ES DAS GIBT. Klaus am 2026-08-21, nachdem er die Seite selbst
 * aufgemacht hat: „Nur Texte, Container, Knöpfe. Man sieht nicht, dass etwas
 * passiert oder passiert ist … jeder könnte denken, das ist eine tote Seite,
 * die irgendeine Geschichte erzählt."
 *
 * Er hat recht gehabt. Die Seite zeigte fertige Textblöcke und schaltete beim
 * Abspielen zwei Klassen um — ein Feld leuchtete auf, mehr nicht. Was fehlte,
 * war das Bild: die fünf treffen sich zur Konferenz, gehen auseinander,
 * woanders wird gebaut, sie kommen zur Gegenprüfung wieder zusammen.
 *
 * ES WIRD NICHTS ERFUNDEN. Die Bühne zeichnet ausschließlich aus `events[]` —
 * derselben Liste, aus der auch die Texträume kommen. Eine zweite, nachgebaute
 * Liste wäre eine Drift-Quelle mit Ansage: sie liefe auseinander, und die Bühne
 * zeigte irgendwann etwas anderes als der Text darunter.
 *
 * DIE ANZEIGE IST GEDEHNT, DIE ZAHLEN SIND ES NICHT. Klaus hat den Einwand
 * selbst vorweggenommen: „Ihr rechnet in Millisekunden, das kann man nicht in
 * derselben Zeit animieren." Stimmt — ein Trockenlauf ist in wenigen
 * Millisekunden vorbei. Deshalb läuft die Darstellung in Lesegeschwindigkeit,
 * und die gemessene Dauer steht als Zahl daneben. Dieselbe Ehrlichkeit, die im
 * Abspiel-Pult schon steht.
 *
 * KEINE FREMDBIBLIOTHEK, KEIN BILD AUS DEM NETZ. Reines SVG und CSS.
 */
(function (welt) {
  "use strict";

  /* ══ WO WER STEHT — GERECHNET, NICHT GESETZT (2026-09-05) ═════════════════
   *
   * Hier standen fünfzehn Zahlenpaare von Hand: fünf Plätze × drei
   * Aufstellungen. Als Klaus drei Rollen dazustellte, wären es vierundzwanzig
   * geworden — und jede neue Rolle hätte wieder drei Stellen gebraucht, die
   * man einzeln vergessen kann.
   *
   * Die drei Aufstellungen behalten ihre BEDEUTUNG, nur die Koordinaten
   * kommen aus der Rechnung:
   *
   *   TISCH     alle im Kreis — „zusammen"
   *   WEG       der Bauer an der Werkbank, alle anderen warten links
   *   PRUEFUNG  die Prüfenden rechts, der Bauer zurück am Tisch (er urteilt
   *             nicht mit), der Beobachter unten — er schreibt immer mit
   *
   * Der Beobachter steht in ALLEN dreien unten in der Mitte. Das ist keine
   * Ausnahme aus Bequemlichkeit: er ist der Einzige, der nie weggeht. */
  var ROLLEN = ["ingenieur", "mitingenieur", "bauer", "arzt",
                "negativbauer", "gestalterin", "nutzer", "beobachter"];

  /* Wer prüft, steht in der Gegenprüfung rechts. Der Bauer NIE — wer gebaut
     hat, urteilt nicht mit. */
  var PRUEFENDE = ["arzt", "negativbauer", "gestalterin", "nutzer"];

  var MITTE = { x: 300, y: 178 }, RX = 150, RY = 104;
  var UNTEN = { x: 300, y: 296 };

  function kreis(namen) {
    var lage = {}, n = namen.length;
    for (var i = 0; i < n; i++) {
      /* Bei -90° beginnen: der Erste steht oben, nicht rechts. Ein Kreis, der
         rechts anfängt, liest sich nicht als Reihe. */
      var w = (-Math.PI / 2) + (i * 2 * Math.PI / n);
      lage[namen[i]] = { x: Math.round(MITTE.x + RX * Math.cos(w)),
                         y: Math.round(MITTE.y + RY * Math.sin(w)) };
    }
    return lage;
  }

  /* Eine Spalte, gleichmässig verteilt — für alle, die gerade warten. */
  function spalte(namen, x, von, bis) {
    var lage = {}, n = namen.length;
    for (var i = 0; i < n; i++)
      lage[namen[i]] = { x: x, y: Math.round(n === 1 ? (von + bis) / 2
                                                     : von + i * (bis - von) / (n - 1)) };
    return lage;
  }

  function ohne(liste, weg) {
    return liste.filter(function (r) { return weg.indexOf(r) < 0; });
  }

  var TISCH = kreis(ROLLEN);

  var WEG = (function () {
    var l = spalte(ohne(ROLLEN, ["bauer", "beobachter"]), 118, 68, 288);
    l.bauer = { x: 606, y: 216 };      /* an der Werkbank, UNTER dem Werkstück */
    l.beobachter = UNTEN;
    return l;
  })();

  var PRUEFUNG = (function () {
    var l = spalte(ohne(ROLLEN, PRUEFENDE.concat(["bauer", "beobachter"])), 118, 76, 260);
    var rechts = spalte(PRUEFENDE, 606, 96, 262);
    for (var k in rechts) l[k] = rechts[k];
    l.bauer = { x: 250, y: 178 };      /* zurück am Tisch — er urteilt nicht mit */
    l.beobachter = UNTEN;
    return l;
  })();

  /* Wofür einer DA ist. Das steht unter seinem Knopf, solange nichts läuft. */
  var KURZ = { ingenieur: "Idee", mitingenieur: "schärft", bauer: "baut",
               arzt: "prüft", negativbauer: "sucht Fehler",
               gestalterin: "sieht hin", nutzer: "benutzt es",
               beobachter: "schreibt auf" };

  /* WER JEMAND IST — nicht, was er gerade tut.
   *
   * Klaus 2026-09-06, beim Zusehen: „Die einzelnen Tätigkeiten werden zwar
   * beschrieben — Ben schärft, Emil baut, Vera prüft —, aber es wird nicht
   * geschrieben, WER die einzelnen Rollen hat. Für jemanden, der zuschaut oder
   * prüft, ist das nicht eindeutig."
   *
   * Er hat recht, und es sind zwei verschiedene Auskünfte: `KURZ` sagt, was
   * gerade geschieht, und wechselt im Lauf. Das hier sagt, wer da steht, und
   * bleibt. Eine Bühne, die nur die Tätigkeit zeigt, lässt den Zuschauer die
   * Besetzung erraten — und wer prüft, braucht genau sie.
   */
  var ROLLE_WORT = { ingenieur: "Ingenieur", mitingenieur: "Mit-Ingenieur",
                     bauer: "Bauer", arzt: "Arzt", negativbauer: "Negativbauer",
                     gestalterin: "Gestalterin", nutzer: "Nutzer",
                     beobachter: "Beobachter" };

  /* ⚠ IN DER KONFERENZ TUN ALLE DASSELBE — und das ist der Punkt, den Klaus
     gefunden hat: „Im Normalfall bringen alle eine Idee ein am Konferenztisch
     … dann entscheiden alle, welche Idee die beste ist."
     Er hat recht, und die Daten sagen es auch: in `konferenz.json` trägt die
     Phase `vorschlag` FÜNF Ereignisse, eines je Rolle, und `bewertung` ebenso.
     Die feste Rollenbeschriftung ließ es aussehen, als sei nur Nora für Ideen
     zuständig. Das war falsch.
     Bei diesen Phasen bekommen deshalb ALLE dieselbe Tätigkeit angezeigt. */
  var ALLE_TUN = {
    vorschlag: "bringt eine Idee ein",
    bewertung: "bewertet die Ideen"
  };

  /* ACHT Phasen, nicht fünf. Die drei Konferenz-Phasen (`vorschlag`,
     `bewertung`, `schluss`) standen nur in `konferenz.json`; beim ersten Bau
     hatte ich allein in `lauf.json` nachgesehen und sie übersehen. Das ist
     dieselbe Falle wie überall: „nicht gefunden" ist erst dann eine Aussage,
     wenn man überall hineingesehen hat.
     `feierabend` bringt alle zurück an den Tisch — die Schicht endet, wie sie
     begann. Das ist der sichtbare Schluss. */
  /*
   * WOMIT gelaufen wurde — DREI Antworten, nicht zwei, und an EINER Stelle.
   *
   * Bis zum 2026-09-06 stand die Umrechnung in `ansicht.js` und lautete
   * `art === "trocken" ? "trocken" : "echt"`: alles, was nicht ausdrücklich
   * „trocken" hieß, galt als BEZAHLT. Ein FEHLENDES Feld sah damit genauso
   * aus wie eine gemessene Ausgabe — und genau so meldete die Bühne eine
   * Trockenschicht als „echt bezahlt" (Klaus, mit Bild), weil die Konferenz
   * im Browser kein `art` herausgab.
   *
   * Die Regel steht dreimal im Code der Schicht: im Zweifel trocken, nie
   * „echt" behaupten. Hier stand sie umgekehrt. Unbekannt heißt jetzt
   * unbekannt — eine geratene Angabe klingt genau wie eine gemessene.
   *
   * Sie steht HIER, weil `zeigeLage` die drei Fälle ohnehin schon
   * auseinanderhält und diese Datei ohne Browser läuft: eine Umrechnung, die
   * nur im Browser zu messen wäre, ist eine Behauptung.
   */
  function artWort(d) {
    if (!d) return "";
    return d.art === "trocken" ? "trocken" : d.art === "echt" ? "echt" : "";
  }
  /* Die erste Quelle, die es WEISS. Nicht dasselbe wie „die erste, die da
     ist": die Konferenz wird zuerst gefragt, aber ihr Schweigen darf den Lauf
     nicht übertönen — genau daran hing der Fehlbefund. */
  function artVon(a, b) { return artWort(a) || artWort(b); }

  function stellung(phase) {
    if (phase === "build") return WEG;
    /* Vier Phasen sind Gegenprüfung, nicht zwei: Lisa und Malcom sehen sich
       dasselbe Werkstück an wie Vera und Sten, nur mit anderer Frage. */
    if (phase === "urteil" || phase === "befund" ||
        phase === "gestaltung" || phase === "nutzung") return PRUEFUNG;
    /* `schaerfung` gehört an den TISCH: Ben spricht mit dem Ingenieur, bevor
       irgendjemand losgeht. */
    return TISCH;   /* idee · schaerfung · vorschlag · bewertung · schluss · feierabend */
  }

  /* Jede Phase MUSS hier stehen. Eine unbekannte fiele sonst still durch und
     die Blase bliebe leer — der Zuschauer sähe eine Bewegung ohne Auskunft. */
  /* ⚠ „merkliste" stand hier NIE, obwohl die Konferenz sie seit jeher
     schreibt — der mitgelieferte Beispiel-Lauf trug sie nur nicht, und deshalb
     hat es keine Probe gesehen. Aufgefallen erst, als der Lauf am 2026-09-05
     mit acht Rollen NEU AUFGEZEICHNET wurde. Dieselbe Lehre, die zwei Absätze
     weiter oben schon steht: „nicht gefunden" ist erst dann eine Aussage, wenn
     man überall hineingesehen hat — und ein Beispiel ist nicht überall. */
  var PHASEN = ["idee", "schaerfung", "vorschlag", "bewertung", "merkliste", "schluss",
                "build", "urteil", "befund", "gestaltung", "nutzung", "feierabend"];

  var STAND_WORT = {
    entwurf: "Entwurf", build: "im Bau", nachbessern: "nachbessern",
    taugt: "taugt", verwerfen: "verworfen", befund: "geprüft"
  };

  /*
   * VORLESEN (1.4, Klaus 2026-08-22): „Als Text in dem Container steht da —
   * ich möchte gern, dass es noch zum Vorlesen geht. Direkt vorlesen."
   *
   * Für Menschen, die schlecht sehen. `speechSynthesis` bringt der Browser
   * mit: kein Fremd-Dienst, keine Adresse nach außen, kein Schlüssel — es
   * passt zu „diese Seite lädt nichts von fremden Adressen".
   *
   * DREI DINGE, DIE MAN LEICHT FALSCH MACHT:
   *
   * 1. `lang` MUSS auf Deutsch stehen. Ohne das liest eine englische Stimme
   *    deutschen Text, und das Ergebnis ist unverständlicher als gar nichts.
   * 2. `getVoices()` ist beim ersten Aufruf oft LEER — die Liste kommt
   *    nachträglich. Eine leere Liste heißt deshalb NICHT „keine Stimme da";
   *    wer daraus einen Fehler macht, sperrt den Knopf auf einem Gerät, das
   *    lesen könnte. Gemeldet wird nur der Fall „Liste da, aber keine
   *    deutsche" — und auch dann wird gelesen, nur mit Warnung daneben.
   * 3. Kein toter Knopf. Kann der Browser gar nicht vorlesen, steht das da
   *    statt eines Knopfes, der nichts tut.
   */
  function stimmeLage() {
    if (!welt.speechSynthesis || typeof welt.SpeechSynthesisUtterance !== "function")
      return { geht: false, grund: "Dieser Browser kann nicht vorlesen." };
    var liste = [];
    try { liste = welt.speechSynthesis.getVoices() || []; } catch (e) { liste = []; }
    var de = [];
    for (var i = 0; i < liste.length; i++)
      if (/^de/i.test(liste[i].lang || "")) de.push(liste[i]);
    if (liste.length && !de.length)
      return { geht: true, stimme: null,
               warnung: "Keine deutsche Stimme auf diesem Gerät — es liest die Standardstimme." };
    return { geht: true, stimme: de[0] || null };
  }

  function vorlesenAus() {
    try { if (welt.speechSynthesis) welt.speechSynthesis.cancel(); } catch (e) {}
  }

  function vorlesen(text, fertig) {
    var lage = stimmeLage();
    if (!lage.geht) return false;
    vorlesenAus();                     /* nie zwei Stimmen übereinander */
    try {
      var u = new welt.SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      if (lage.stimme) u.voice = lage.stimme;
      u.rate = 1;
      if (fertig) { u.onend = fertig; u.onerror = fertig; }
      welt.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  /* Ein Vorlese-Knopf samt seinem Fail-soft — an EINER Stelle, weil ihn zwei
     Kästen brauchen (der Volltext und die Akte). Zwei Fassungen liefen
     auseinander, und dann läse der eine vor und der andere schwiege. */
  function vorleseKnopf(text) {
    var lage = stimmeLage();
    if (!lage.geht) {
      var hin = document.createElement("span");
      hin.className = "b-leise-klein";
      hin.setAttribute("data-vorlesen", "geht-nicht");
      hin.textContent = lage.grund;
      return hin;
    }
    var k = document.createElement("button");
    k.type = "button";
    k.className = "b-vorlesen";
    k.setAttribute("data-vorlesen", "bereit");
    k.setAttribute("aria-pressed", "false");
    k.title = lage.warnung || "Den Text laut vorlesen";
    k.textContent = "🔊 Vorlesen";
    function aus() {
      k.textContent = "🔊 Vorlesen";
      k.setAttribute("aria-pressed", "false");
      k.setAttribute("data-vorlesen", "bereit");
    }
    k.addEventListener("click", function () {
      if (k.getAttribute("aria-pressed") === "true") { vorlesenAus(); aus(); return; }
      var t = typeof text === "function" ? text() : text;
      if (!t) return;
      if (vorlesen(t, aus)) {
        k.textContent = "⏹ Still";
        k.setAttribute("aria-pressed", "true");
        k.setAttribute("data-vorlesen", "liest");
      } else {
        /* Auch das ist eine Auskunft: der Knopf war da, das Lesen ging nicht. */
        k.setAttribute("data-vorlesen", "geht-nicht");
        k.textContent = "Vorlesen ging nicht";
        k.disabled = true;
      }
    });
    return k;
  }

  function svgEl(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) {
      e.setAttribute(k, String(attrs[k]));
    }
    return e;
  }

  function Buehne(wurzel) {
    this.wurzel = wurzel;
    this.knoten = {};
    this.events = [];
    this.besetzung = [];
    this.letzterIdx = -1;
    this.bauen();
  }

  Buehne.prototype.bauen = function () {
    var svg = svgEl("svg", {
      viewBox: "0 0 720 356", class: "buehne-svg", role: "img",
      "aria-label": "Die Werkstatt: fünf Agenten, ein Konferenztisch, eine Werkbank"
    });

    svg.appendChild(svgEl("ellipse", { cx: 300, cy: 178, rx: 118, ry: 78, class: "b-tisch" }));
    svg.appendChild(svgEl("rect", { x: 528, y: 104, width: 156, height: 150, rx: 12, class: "b-bank" }));

    /* NUR NOCH EINE BESCHRIFTUNG. Hier stand links „Konferenztisch" — Klaus am
       2026-08-22: „Das Wort Konferenztisch … brauchen wir nicht. Ist immer im
       Weg." Er hat recht, und der Unterschied zur zweiten Station ist der
       Grund: die zweite trägt eine AUSSAGE (gebaut oder an Claude gegeben),
       die erste trug einen Namen für das Offensichtliche — fünf Leute sitzen
       sichtbar um einen Tisch. Eine Beschriftung, die nichts sagt, was das
       Bild nicht schon zeigt, kostet nur Platz. */
    var t2 = svgEl("text", { x: 606, y:  74, class: "b-ortname" });
    svg.appendChild(t2);
    this.bankName = t2;

    /* Der Pfeil zur zweiten Station — er macht sichtbar, dass etwas WEGGEHT. */
    svg.appendChild(svgEl("path", { d: "M 428 178 L 508 178", class: "b-pfeil" }));

    /* Das Werkstück wandert, pulst beim Bauen und trägt seinen Stand — in Farbe
       UND Wort. Nur Farbe wäre für Farbenblinde keine Auskunft. */
    var stueck = svgEl("g", { class: "b-stueck", transform: "translate(604,200)" });
    stueck.appendChild(svgEl("rect", { x: -26, y: -18, width: 52, height: 36, rx: 5, class: "b-stueck-k" }));
    var sl = svgEl("text", { x: 0, y: 36, class: "b-stueck-t" });
    stueck.appendChild(sl);
    svg.appendChild(stueck);
    this.stueck = stueck; this.stueckText = sl;

    var bild = document.createElement("div");
    bild.className = "b-bild";
    bild.appendChild(svg);
    this.wurzel.appendChild(bild);

    /* DIE AGENTEN SIND HTML, NICHT SVG — und das ist eine bewusste Entscheidung.
       Klaus wollte die 3D-Holo-Form von family-projekt.de auf runde Knöpfe
       übertragen. SVG kennt weder `box-shadow` noch `mix-blend-mode: screen`
       noch `conic-gradient` — die Form ließe sich dort nur NACHBAUEN, und ein
       Nachbau läuft von der Vorlage weg. Als HTML werden die Regeln aus
       `family-project/assets/style.css` KOPIERT. Tisch, Werkbank, Pfeil und
       Werkstück bleiben SVG; sie brauchen nichts davon. */
    var buehne = document.createElement("div");
    buehne.className = "b-leute";
    for (var i = 0; i < ROLLEN.length; i++) {
      var r = ROLLEN[i];
      var g = document.createElement("div");
      g.className = "b-agent b-" + r;
      g.setAttribute("data-rolle", r);
      /* ANKLICKBAR. Klaus: „Wenn ich auf einen Namen klicke, dann sollte das
         laufende Textfeld aufgehen von dem, was gerade geschrieben wird. Beim
         2. Klick wieder zugehen … anschließend den Text zum Lesen/Download
         bereitstellen."
         `role`+`tabindex`+`aria-expanded` statt eines <button>: der Knopf trägt
         die Holo-Konstruktion aus family-project, und die hängt an dieser
         Element-Schachtelung. Wer die Rolle setzt, muss auch die Tastatur
         bedienen — sonst ist es ein Knopf, den nur die Maus findet. */
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.setAttribute("aria-expanded", "false");
      var scheibe = document.createElement("span");
      scheibe.className = "b-scheibe";
      var name = document.createElement("b");
      name.className = "b-name";
      scheibe.appendChild(name);
      var tun = document.createElement("span");
      tun.className = "b-tun";
      tun.textContent = KURZ[r];
      g.appendChild(scheibe); g.appendChild(tun);
      buehne.appendChild(g);
      this.knoten[r] = { g: g, name: name, tun: tun };
    }
    bild.appendChild(buehne);          /* IN den Bild-Rahmen, nicht daneben */
    this.setzeOrt(TISCH);
    this.verfolgeZeiger(buehne);

    /* Die Sprechblase liegt ÜBER dem SVG als gewöhnliches HTML — Text in SVG
       bricht nicht um, und ein Satz, der rechts aus dem Bild läuft, ist keine
       Auskunft. */
    /* DIE BESETZUNG steht UNTER dem Bild, nicht darin. Im Bild ist kein Platz
       für eine dritte Zeile je Knopf — acht Knöpfe stehen dort dicht, und was
       sich überlappt, liest niemand. Als eigene Leiste bleibt sie ausserdem
       vollständig lesbar, während im Bild einzelne Knöpfe hervortreten. */
    this.wer = document.createElement("div");
    this.wer.className = "b-wer";
    this.wer.setAttribute("data-besetzung", "leer");
    this.wurzel.appendChild(this.wer);

    this.blase = document.createElement("div");
    this.blase.className = "b-blase";
    this.blase.hidden = true;
    this.wurzel.appendChild(this.blase);

    /*
     * DER VOLLE TEXT DES LAUFENDEN SCHRITTS (1.3, Klaus 2026-08-22).
     *
     * „Dann wird oben die Demo abgespielt … und unten seh ich nicht den Text,
     * der generiert wurde. Dann hätte ich kurz auf Anhalten machen können und
     * sehen: was hat er jetzt in diesem Augenblick gesagt."
     *
     * Die Blase über der Bühne kürzt bei 260 Zeichen — sie muss, sonst
     * verdrängt sie die Szene. Der volle Text stand nur in der Akte, und die
     * steht still: sie zeigt einen Menschen, nicht einen Augenblick. Zwischen
     * beidem klaffte genau die Lücke, die Klaus beschreibt.
     *
     * Dieser Kasten schließt sie. Er zeigt IMMER den vollen Text des Schritts,
     * auf dem das Abspielen gerade steht — ungekürzt, mit dem Namen darüber,
     * dem er gehört. Anhalten heißt damit: stehen bleiben und lesen.
     *
     * ⚠ Er trägt den Text NICHT selbst zusammen: `textVon` ist die eine
     * Stelle, aus der Blase, Akte und dieser Kasten lesen. Drei Fassungen
     * desselben Satzes wären drei Stände, und man glaubte dem falschen.
     */
    this.volltext = document.createElement("div");
    this.volltext.className = "b-volltext";
    this.volltext.setAttribute("data-volltext", "");
    this.volltext.hidden = true;
    this.wurzel.appendChild(this.volltext);

    /* ══ DIE SCHICHTUHR ═══════════════════════════════════════════════════
     * Klaus 2026-09-06: „Wenn der Werkstattlauf losgeht, dass man trotzdem
     * einen Balken hat oder irgendetwas sieht, dass der Lauf läuft. Der Text
     * reicht nicht aus. […] wie eine Betriebsuhr."
     *
     * Er hat recht: ein echter Schritt dauert eine halbe Minute und mehr, und
     * dazwischen steht das Bild still. Ein Satz in einer Zeile beantwortet
     * „läuft es noch?" nicht — eine Zahl, die sich jede Sekunde bewegt, schon.
     *
     * ⚠ SIE RECHNET AUS DER STARTZEIT DES LAUFS, nicht ab dem Moment, in dem
     * die Seite sie anlegt. Nach einem Neuladen mitten in der Schicht liefe
     * sie sonst wieder bei null los und behauptete eine Dauer, die es nicht
     * gab. `kasse.beginnIso` steht in jedem Zwischenstand.
     *
     * ⚠ UND SIE IST KEIN KNOPF. Sie sieht aus wie einer, weil sie im Feld der
     * Agenten sitzt — aber sie tut nichts, und ein Knopf, der nichts tut, ist
     * genau der tote Knopf, den diese Werkstatt nicht baut. */
    this.uhr = document.createElement("div");
    this.uhr.className = "b-uhr";
    this.uhr.setAttribute("data-schichtuhr", "aus");
    this.uhr.hidden = true;
    /* IN DAS FELD, NICHT DARUNTER (Klaus 2026-09-06: „in dem Feld, wo die
       Agenten zu sehen sind ... wie eine Betriebsuhr"). `.b-bild` traegt
       `position:relative` — die Uhr haengt darin wie eine Wanduhr ueber der
       Werkbank, statt als weitere Textzeile unter dem Bild zu stehen. Genau
       das war ja der Befund: „der Text reicht nicht aus". */
    bild.appendChild(this.uhr);
    this.uhrTakt = null;
    this.uhrBeginn = 0;

    this.lage = document.createElement("p");
    this.lage.className = "b-lage";
    this.wurzel.appendChild(this.lage);

    /* Die AKTE: alles, was EINE Person in diesem Lauf gesagt hat — vollständig,
       nicht gekürzt. Sie steht unter der Bühne und ist leer, bis jemand einen
       Namen anklickt. */
    this.akte = document.createElement("div");
    this.akte.className = "b-akte";
    this.akte.hidden = true;
    this.akte.setAttribute("data-akte", "");
    this.wurzel.appendChild(this.akte);
    this.offeneAkte = "";
    this.horcheAufNamen();
  };

  /* EIN Zuhörer an der Wurzel statt fünf an den Knöpfen — und er überlebt ein
     Neuzeichnen der Agenten, falls das je dazukommt. */
  Buehne.prototype.horcheAufNamen = function () {
    var self = this;
    function treffer(ev) {
      var g = ev.target && ev.target.closest && ev.target.closest(".b-agent");
      return g && self.wurzel.contains(g) ? g.getAttribute("data-rolle") : null;
    }
    this.wurzel.addEventListener("click", function (ev) {
      var r = treffer(ev);
      if (r) self.zeigeAkte(r);
    });
    this.wurzel.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
      var r = treffer(ev);
      if (!r) return;
      ev.preventDefault();          /* sonst scrollt die Leertaste die Seite */
      self.zeigeAkte(r);
    });
  };

  /* Alles, was diese Rolle gesagt hat — als Text, EINMAL erzeugt: die Anzeige
     und der Download lesen dieselben Zeilen. Zwei Fassungen liefen auseinander,
     und dann lädt jemand etwas anderes herunter, als er gelesen hat. */
  Buehne.prototype.akteZeilen = function (rolle) {
    var zeilen = [];
    for (var i = 0; i < this.events.length; i++) {
      var e = this.events[i];
      if (!e || e.rolle !== rolle) continue;
      var t = textVon(e);
      if (!t.kopf) continue;
      zeilen.push({ schritt: i + 1, kopf: t.kopf, inhalt: t.inhalt, ms: e.ms || 0 });
    }
    return zeilen;
  };

  /**
   * Klick auf einen Namen: Akte auf. Zweiter Klick auf denselben: zu.
   * Klick auf einen anderen: umschalten, nicht stapeln.
   */
  Buehne.prototype.zeigeAkte = function (rolle) {
    var zu = (this.offeneAkte === rolle);
    for (var k in this.knoten)
      this.knoten[k].g.setAttribute("aria-expanded", String(!zu && k === rolle));
    if (zu) {
      this.offeneAkte = "";
      this.akte.hidden = true;
      this.akte.setAttribute("data-akte", "");
      this.akte.removeAttribute("data-jetzt");
      while (this.akte.firstChild) this.akte.removeChild(this.akte.firstChild);
      /* Der Volltext-Kasten kommt zurück, und zwar auf DEM Schritt, auf dem
         die Bühne steht — nicht auf dem, der beim Öffnen galt. Ohne diese
         Zeile stünde nach dem Schließen ein alter Stand neben einer neuen
         Szene, und man glaubte dem falschen. */
      this.zeigeVolltext(this.aktuellesEreignis(), this.letzterIdx, false);
      return;
    }
    this.offeneAkte = rolle;
    this.akte.hidden = false;
    this.akte.setAttribute("data-akte", rolle);
    while (this.akte.firstChild) this.akte.removeChild(this.akte.firstChild);

    var name = (this.knoten[rolle] && this.knoten[rolle].name.textContent) || rolle;
    var zeilen = this.akteZeilen(rolle);

    var kopf = document.createElement("div");
    kopf.className = "b-akte-kopf";
    var h = document.createElement("b");
    h.textContent = name + " · " + rolle;
    kopf.appendChild(h);
    var n = document.createElement("span");
    n.className = "b-akte-zahl";
    n.textContent = zeilen.length === 1 ? "1 Beitrag" : zeilen.length + " Beiträge";
    kopf.appendChild(n);

    /* Der Download entsteht erst auf Klick — ein Blob je Akte beim Zeichnen
       wäre Müll, den niemand abholt. */
    var lad = document.createElement("button");
    lad.type = "button";
    lad.className = "b-akte-laden";
    lad.textContent = "⭳ Als Text";
    lad.disabled = !zeilen.length;
    var self = this;
    lad.addEventListener("click", function () { self.ladeAkte(rolle, name, zeilen); });
    kopf.appendChild(lad);

    /* Vorlesen auch hier (1.4) — sonst wäre ausgerechnet der längste Text der
       Seite der einzige, den man sich nicht vorlesen lassen kann. */
    kopf.appendChild(vorleseKnopf(function () {
      if (!zeilen.length) return name + " hat in diesem Lauf nichts beigetragen.";
      var t = name + ". ";
      for (var q = 0; q < zeilen.length; q++)
        t += zeilen[q].kopf + ". " + (zeilen[q].inhalt || "") + " ";
      return t;
    }));

    var zu2 = document.createElement("button");
    zu2.type = "button";
    zu2.className = "b-akte-zu";
    zu2.textContent = "✕";
    zu2.title = "Akte schließen";
    zu2.addEventListener("click", function () { self.zeigeAkte(rolle); });
    kopf.appendChild(zu2);
    this.akte.appendChild(kopf);

    if (!zeilen.length) {
      /* NICHT stumm leer. „Nichts gesagt" ist eine Auskunft, ein leerer Kasten
         sieht aus wie kaputt — und im Planmodus hat der Bauer wirklich nichts
         gesagt, weil gar nicht gebaut wurde. */
      var leer = document.createElement("p");
      leer.className = "b-akte-leer";
      leer.textContent = name + " hat in diesem Lauf nichts beigetragen.";
      this.akte.appendChild(leer);
      return;
    }
    for (var i = 0; i < zeilen.length; i++) {
      var z = zeilen[i];
      var b = document.createElement("div");
      b.className = "b-akte-beitrag";
      /* Die Schritt-Nummer als ANGABE, nicht nur im Text: daran findet das
         Abspielen den laufenden Beitrag wieder und hebt ihn hervor. Aus der
         Überschrift zu lesen hieße, den Wortlaut zu parsen — und der darf sich
         ändern, ohne dass die Hervorhebung ausfällt. */
      b.setAttribute("data-schritt", String(z.schritt));
      var k2 = document.createElement("b");
      k2.textContent = "Schritt " + z.schritt + " · " + z.kopf;
      b.appendChild(k2);
      if (z.inhalt) {
        var p2 = document.createElement("p");
        /* VOLLSTÄNDIG. Die Blase kürzt bei 260 Zeichen, damit sie die Bühne
           nicht verdrängt — genau dafür gibt es diese Ansicht. Hier zu kürzen
           hieße, denselben Text zweimal zu beschneiden und nirgends zu zeigen. */
        p2.textContent = z.inhalt;
        b.appendChild(p2);
      }
      this.akte.appendChild(b);
    }
    /* Die Hervorhebung sofort setzen, statt auf den nächsten Schritt zu warten
       — wer mitten im Abspielen eine Akte öffnet, will SEHEN, wo er ist. */
    this.zeigeVolltext(this.aktuellesEreignis(), this.letzterIdx, false);
  };

  /* Auf welchem Ereignis die Bühne gerade steht. An EINER Stelle, weil drei
     Wege danach fragen. `letzterIdx` ist -1, solange nichts gelaufen ist. */
  Buehne.prototype.aktuellesEreignis = function () {
    var i = this.letzterIdx;
    return (typeof i === "number" && i >= 0 && i < this.events.length) ? this.events[i] : null;
  };

  /* Zum Lesen und Weiterreichen — Klaus wollte den Text „zur Analyse". */
  Buehne.prototype.ladeAkte = function (rolle, name, zeilen) {
    /*
     * ⚠ ASCII-ZIERDE UND EIN BOM (Klaus 2026-08-22, mit zwei Bildern).
     *
     * Die heruntergeladene Datei stand auf seinem Tablet als „Beitrag/BeitrÃ¤ge"
     * und „â€"". Nachgesehen: die Bytes sind sauberes UTF-8. Beim Herunterladen
     * geht die Angabe `charset=utf-8` verloren — sie steht im MIME-Typ, auf der
     * Platte liegen nur Bytes —, und Androids Betrachter raet dann Latin-1.
     *
     * Der BOM ist das Zeichen, an dem er es sicher erkennt. Die Kastenzeichen
     * (`─`, `·`) weichen zusaetzlich ASCII: ignoriert ein Betrachter den BOM,
     * bleibt so wenigstens die Gliederung stehen.
     */
    var text = name + " (" + rolle + ") - " + zeilen.length + " Beitrag/Beiträge\n" +
      "aus der Werkstatt-Schicht, Reihenfolge wie auf der Bühne\n" +
      new Array(60).join("-") + "\n\n";
    for (var i = 0; i < zeilen.length; i++) {
      text += "Schritt " + zeilen[i].schritt + " | " + zeilen[i].kopf + "\n";
      if (zeilen[i].inhalt) text += zeilen[i].inhalt + "\n";
      text += "\n";
    }
    try {
      var b = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
      var u = URL.createObjectURL(b);
      var a = document.createElement("a");
      a.href = u;
      a.download = "werkstatt-" + rolle + ".txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    } catch (e) {
      /* Kein toter Knopf: klappt der Download nicht, steht der Grund da. */
      var w = document.createElement("p");
      w.className = "b-akte-leer";
      w.textContent = "Download geht in diesem Browser nicht (" + e.message + ") — " +
        "der Text steht oben zum Markieren.";
      this.akte.appendChild(w);
    }
  };

  /* Neigung und Scheinwerfer folgen dem Zeiger — dieselbe Mechanik wie in
     `family-project/assets/app.js`: vier CSS-Variablen am Element, den Rest
     macht das Stylesheet. Ohne diese Zeilen wären `--rx/--ry/--mx/--my` nur
     Deko-Variablen, die nie einen Wert bekommen, und die Form bliebe flach.

     Auf einem Tablet gibt es keinen Zeiger — dort passiert schlicht nichts,
     und die Knöpfe stehen gerade. Das ist kein Mangel: die Plastik kommt aus
     den Schatten, die Neigung ist die Zugabe für den, der eine Maus hat. */
  Buehne.prototype.verfolgeZeiger = function (wurzel) {
    var flach = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (flach) return;
    var knoten = this.knoten;
    function fuer(g) {
      g.addEventListener("pointermove", function (ev) {
        var k = g.getBoundingClientRect();
        var px = (ev.clientX - k.left) / k.width, py = (ev.clientY - k.top) / k.height;
        g.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        g.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        g.style.setProperty("--ry", ((px - 0.5) * 16).toFixed(2) + "deg");
        g.style.setProperty("--rx", ((0.5 - py) * 16).toFixed(2) + "deg");
      });
      g.addEventListener("pointerleave", function () {
        ["--mx", "--my", "--rx", "--ry"].forEach(function (v) { g.style.removeProperty(v); });
      });
    }
    for (var k in knoten) if (Object.prototype.hasOwnProperty.call(knoten, k)) fuer(knoten[k].g);
  };

  /* Die Plätze stehen weiter in viewBox-Koordinaten (720 × 356) — sie werden
     hier in Prozent umgerechnet. So bleibt die Aufstellung an EINER Stelle, und
     die Bühne skaliert mit jeder Breite mit. */
  var BREIT = 720, HOCH = 356;
  Buehne.prototype.setzeOrt = function (wo) {
    for (var i = 0; i < ROLLEN.length; i++) {
      var r = ROLLEN[i], p = wo[r], n = this.knoten[r];
      if (!p || !n) continue;
      n.g.style.left = (p.x / BREIT * 100).toFixed(3) + "%";
      n.g.style.top  = (p.y / HOCH  * 100).toFixed(3) + "%";
      /* Die Probe liest die Aufstellung hier ab — dieselbe Zahl wie im
         Datensatz, nicht die gerundete Prozentangabe. */
      n.g.setAttribute("data-x", String(p.x));
      n.g.setAttribute("data-y", String(p.y));
    }
  };

  /** Daten übernehmen. `events` ist dieselbe Liste wie in den Texträumen. */
  /** mm:ss, ab einer Stunde h:mm:ss. Keine Fremd-Abhängigkeit für sechs Zeilen. */
  /* DIE DAUER RECHNET `zeit.js`, nicht diese Datei. Eine zweite Fassung
     derselben Rechnung liefe auseinander — und nur die dort ist ohne Browser
     prüfbar. Aufgelöst wird beim GEBRAUCH, nicht beim Laden: `zeit.js` hängt
     an `defer` und ist zur Parse-Zeit dieser Datei noch nicht gelaufen. */
  function zeit() {
    return (typeof window !== "undefined" ? window : globalThis).WERKSTATT_ZEIT;
  }

  /** Startet, aktualisiert oder stoppt die Schichtuhr — je nach Lage.
   *
   * ⚠ DREI ZUSTÄNDE, NICHT ZWEI (Klaus 2026-09-06: „wenn sie zu Ende ist,
   * sollte man das auch sehen"). Die erste Fassung versteckte die Uhr am Ende
   * — damit war „fertig" von „hat nie gelaufen" nicht zu unterscheiden, und
   * genau das ist die Frage, die sie beantworten soll.
   *
   *   läuft   ● tickt jede Sekunde
   *   fertig  ✓ steht still und nennt die Gesamtdauer
   *   nichts  weg — hier ist keine Schicht gelaufen
   */
  /**
   * Schreibt die Besetzung unter das Bild: wer welche Rolle hat.
   *
   * ⚠ AUS DEM LAUF, NICHT AUS EINER FESTEN LISTE. Ein gefahrener Lauf weiss,
   * WER wirklich gearbeitet hat; eine Liste im Code sagt nur, wer heute
   * eingetragen wäre. Bei einem alten Lauf stünden dort Namen von heute unter
   * den Taten von damals — dieselbe Regel, nach der `ansicht.js` die Besetzung
   * schon dem Lauf überlässt.
   *
   * Im Planmodus gibt es keine `besetzung`; dann tragen die Ereignisse die
   * Namen (`wer`), und die stehen zu dem Zeitpunkt schon in den Knöpfen.
   */
  Buehne.prototype.werZeichnen = function () {
    if (!this.wer) return;
    this.wer.textContent = "";
    var hatte = false;
    for (var i = 0; i < ROLLEN.length; i++) {
      var r = ROLLEN[i], k = this.knoten[r];
      var name = k && k.name.textContent;
      /* Wer im Lauf nicht vorkam, steht auch nicht in der Besetzung. Ein
         Eintrag ohne Namen wäre eine Behauptung über eine Rolle, die diese
         Schicht gar nicht besetzt hat. */
      if (!name || name === r) continue;
      hatte = true;
      var z = document.createElement("span");
      z.className = "b-wer-eins b-" + r;
      var nm = document.createElement("b");
      nm.textContent = name;
      var ro = document.createElement("span");
      ro.className = "b-wer-rolle";
      /* Der Trenner steht im TEXT, nicht nur als Abstand. Ohne ihn ergibt ein
         Kopieren „NoraIngenieur" und ein Vorlesegerät liest es als ein Wort —
         der Abstand ist Gestaltung, kein Zeichen. */
      ro.textContent = "· " + (ROLLE_WORT[r] || r);
      z.appendChild(nm);
      z.appendChild(ro);
      /* Das Modell gehört dazu, wenn man PRÜFT — aber nicht in die Zeile:
         `claude-haiku-4-5` ist länger als Name und Rolle zusammen. Es steht
         im Titel, wo es nachschlägt, wer danach fragt. */
      var m = null;
      for (var j = 0; j < this.besetzung.length; j++)
        if (this.besetzung[j] && this.besetzung[j].rolle === r) m = this.besetzung[j].modell;
      z.title = name + " — " + (ROLLE_WORT[r] || r) +
        ", " + (KURZ[r] || "") + (m ? " · " + m : "");
      this.wer.appendChild(z);
    }
    this.wer.setAttribute("data-besetzung", hatte ? "da" : "leer");
    this.wer.hidden = !hatte;
  };

  Buehne.prototype.uhrZeichnen = function () {
    if (!this.uhr) return;
    if (this.uhrTakt) { clearInterval(this.uhrTakt); this.uhrTakt = null; }
    var uhr = this.uhr, beginn = this.uhrBeginn;

    /* DAS ZEICHEN STEHT IM CSS, NICHT IM TEXT. Der pulsende Punkt ist die
       Haelfte der Auskunft, die man OHNE Lesen bekommt — und pulsen kann nur,
       was ein Element ist. Als Zeichen im textContent waere er ein Buchstabe,
       der stillsteht, und eine stehengebliebene Uhr sieht aus wie eine
       laufende. Gesteuert ueber `data-schichtuhr`, damit eine Probe den
       Zustand messen kann, ohne am Wortlaut zu haengen. */

    if (this.laeuft) {
      var zeigen = function () {
        uhr.textContent = beginn
          ? "Schicht läuft · " + zeit().dauerText(Date.now() - beginn)
          : "Schicht läuft";
      };
      uhr.hidden = false;
      uhr.setAttribute("data-schichtuhr", beginn ? "laeuft" : "laeuft-ohne-zeit");
      zeigen();
      this.uhrTakt = setInterval(zeigen, 1000);
      return;
    }

    /* Gelaufen und fertig — nur wenn wirklich etwas gelaufen IST. Ohne
       Ereignisse gab es keine Schicht, und eine Uhr, die „beendet" sagt, wo
       nichts war, behauptet etwas. */
    if (this.events.length && beginn) {
      uhr.hidden = false;
      uhr.setAttribute("data-schichtuhr", "fertig");
      uhr.textContent = "Schicht beendet · " +
        zeit().dauerText(Math.max(0, (this.uhrEnde || beginn) - beginn));
      return;
    }

    uhr.hidden = true;
    uhr.setAttribute("data-schichtuhr", "aus");
    uhr.textContent = "";
  };

  Buehne.prototype.setzeDaten = function (daten) {
    daten = daten || {};
    this.events = Array.isArray(daten.events) ? daten.events : [];
    this.besetzung = Array.isArray(daten.besetzung) ? daten.besetzung : [];
    this.laeuft = daten.laeuft === true;
    /* Die WANDUHR-Startzeit des Laufs. Fehlt sie, zeigt die Uhr keine Dauer an
       statt einer erfundenen — eine geratene Zahl klingt wie eine gemessene. */
    this.uhrBeginn = Date.parse(daten.beginn || "") || 0;
    this.uhrEnde = Date.parse(daten.ende || "") || 0;
    this.istBeispiel = daten._ausBeispiel === true;
    /* Zwei Achsen, getrennt gehalten (1.5): `istBeispiel` sagt WOHER, `art`
       sagt WOMIT. Bis zum 2026-08-22 stand an der Bühne nur das Wort
       „Beispiel", und es musste beides tragen — deshalb trug es keines von
       beidem zuverlässig. */
    this.art = daten._art || "";
    this.datum = daten._datum || "";

    /* ABGELESEN, NICHT GERATEN: enthält die Reihe keine `build`-Phase, hat die
       Werkstatt nicht gebaut — sie hat entworfen, und gebaut wird woanders.
       Seit dem 2026-08-20 ist der Planmodus der Normalfall (die fünf entwerfen,
       eine Claude-Code-Sitzung baut). Die Bühne zeigte trotzdem eine Werkbank;
       Klaus hat es gefunden: „Es handelt sich nicht um einen Bauprozess,
       sondern um einen Entwurf. Der Bau findet in der Cloud statt."
       Beide Fälle sind wahr — welcher gilt, sagen die Daten. */
    this.wurdeGebaut = this.events.some(function (e) { return e && e.phase === "build"; });
    /* NICHT „Cloud" — CLAUDE. Klaus hat es ausdrücklich richtiggestellt: „Es
       heißt nicht, dass der Bau in die Cloud geht, sondern dass Claude baut.
       Das heißt, die jeweilige Sitzung." Beim ersten Bau stand hier „Cloud",
       weil ich sein gesprochenes Wort so gelesen hatte. Ein Ortsname für einen
       Rechner irgendwo ist etwas anderes als der Name dessen, der die Arbeit
       macht. */
    this.bankName.textContent = this.wurdeGebaut ? "Werkbank" : "→ Claude baut";

    for (var i = 0; i < this.besetzung.length; i++) {
      var b = this.besetzung[i];
      if (b && this.knoten[b.rolle]) this.knoten[b.rolle].name.textContent = b.name || b.rolle;
    }
    /* IM PLANMODUS GIBT ES KEINE `besetzung` — die steht in `lauf.json`, und
       im Planmodus läuft nur die Konferenz. Die Namen stehen dann trotzdem da:
       jedes Ereignis trägt `wer`. Ohne diese Zeilen hießen die fünf „ingenieur",
       „bauer", „arzt" — richtig, aber kalt, und Klaus' Werkstatt hat Namen. */
    for (var j = 0; j < this.events.length; j++) {
      var e = this.events[j];
      if (e && e.rolle && e.wer && this.knoten[e.rolle] &&
          !this.knoten[e.rolle].name.textContent) {
        this.knoten[e.rolle].name.textContent = e.wer;
      }
    }
    /* Und wenn selbst das fehlt, wenigstens die Rolle — nie ein leerer Knopf. */
    for (var k in this.knoten) {
      if (!this.knoten[k].name.textContent) this.knoten[k].name.textContent = k;
    }
    /* Eine offene Akte zeigt sonst den VORIGEN Lauf weiter — sie steht ja
       neben einer Bühne, die schon den neuen zeigt. Zwei Stände nebeneinander,
       und man glaubt dem falschen. `zeigeAkte` schaltet um: einmal zu, einmal
       auf, mit den neuen Daten. */
    if (this.offeneAkte) {
      var r = this.offeneAkte;
      this.zeigeAkte(r);            /* zu  */
      this.zeigeAkte(r);            /* auf — jetzt aus this.events */
    }
    this.werZeichnen();
    this.uhrZeichnen();
    this.zeigeStand(-1);
  };

  /**
   * Stellt die Bühne auf den Stand NACH Ereignis `idx`.
   * `idx < 0` heißt: noch nichts gelaufen.
   */
  Buehne.prototype.zeigeStand = function (idx, spielt) {
    var ev = (idx >= 0 && idx < this.events.length) ? this.events[idx] : null;
    /* Gemerkt, weil das Öffnen und Schließen einer Akte den Volltext-Kasten neu
       stellen muss — und der braucht dafür den Schritt, auf dem wir stehen.
       Ohne das zeigte er nach dem Schließen wieder den Stand von vor dem
       Öffnen: eine zweite Wahrheit neben der Bühne. */
    this.letzterIdx = idx;
    var phase = ev ? String(ev.phase || "") : "";
    var wo = stellung(phase);

    this.setzeOrt(wo);
    var gemeinsam = ev ? ALLE_TUN[phase] : null;
    for (var i = 0; i < ROLLEN.length; i++) {
      var r = ROLLEN[i], n = this.knoten[r];
      var dran = !!(ev && ev.rolle === r);
      /* Tun alle dasselbe, steht es bei allen. Sonst trägt jeder wieder das,
         wofür er da ist — die Rolle ist ja auch eine echte Auskunft. */
      n.tun.textContent = gemeinsam || KURZ[r];
      n.g.classList.toggle("dran", dran);
      /* Wer nicht dran ist, ist nicht weg — nur ruhig. Ausblenden hieße
         behaupten, er sei nicht mehr da. */
      n.g.classList.toggle("ruht", !!(ev && !dran));
    }

    /* WÄHREND DER KONFERENZ GIBT ES NOCH KEIN WERKSTÜCK. Es lag hier zuerst von
       Anfang an auf dem Tisch — als leerer Kasten, der obendrein die
       Tisch-Beschriftung verdeckte. Ein Ding zu zeigen, das noch nicht
       existiert, ist dieselbe Unwahrheit wie ein leerer Kasten, der aussieht,
       als sei etwas kaputt. Es erscheint mit dem ersten Bau-Schritt. */
    /* Wann es ein Werkstück GIBT. Im Planmodus entsteht es mit dem Schluss der
       Konferenz — dann steht der Auftrag fest und geht an die Cloud. Klaus:
       „das Senden nach Cloud … das dürfen wir ruhig kommunizieren." */
    var gebaut = (phase === "build" || phase === "urteil" ||
                  phase === "befund" || phase === "feierabend" ||
                  (!this.wurdeGebaut && phase === "schluss"));
    this.stueck.classList.toggle("da", gebaut);
    this.stueck.classList.toggle("baut", phase === "build");
    if (ev) {
      var beiBank = (phase === "build" || phase === "urteil" || phase === "befund" ||
                     (!this.wurdeGebaut && phase === "schluss"));
      this.stueck.setAttribute("transform",
        /* Beim BAUEN liegt es über dem Bauer, bei der PRÜFUNG in der Bankmitte
         zwischen den beiden Prüfern — sonst deckt einer von ihnen es zu. Genau
         das war beim ersten Bau der Fall: Vera stand auf dem Werkstück. */
      "translate(" + (beiBank ? 606 : 300) + "," +
        (phase === "build" ? 146 : beiBank ? 178 : 178) + ")");
      /* Wurde nicht gebaut, heißt das Ergebnis auch nicht „taugt", sondern was
         es ist: ein geprüfter Entwurf, der weitergereicht wird. */
      var wort = (!this.wurdeGebaut && phase === "schluss") ? "geht an Claude"
               : phase === "build" ? STAND_WORT.build
               : ev.urteil === "taugt" && !this.wurdeGebaut ? "Entwurf fertig"
               : ev.urteil ? (STAND_WORT[ev.urteil] || ev.urteil)
               : phase === "befund" ? STAND_WORT.befund
               : phase === "idee" ? STAND_WORT.entwurf : "";
      this.stueckText.textContent = wort;
      this.stueck.setAttribute("data-stand", String(ev.urteil || phase || ""));
    } else {
      this.stueckText.textContent = "";
      this.stueck.removeAttribute("data-stand");
    }

    this.zeigeBlase(ev);
    this.zeigeVolltext(ev, idx, spielt === true);
    this.zeigeLage(ev, idx);
  };

  /*
   * WAS EIN EREIGNIS SAGT — an EINER Stelle.
   *
   * Die Blase zeigt es gekürzt, die Akte vollständig. Zwei Fassungen desselben
   * Textes wären eine Drift-Quelle mit Ansage: sie laufen auseinander, und dann
   * steht in der Akte etwas anderes als in der Blase über demselben Schritt.
   *
   * ⚠ HIER STAND NUR DIE TÄTIGKEIT. Klaus: „Ich sehe nicht, was Jonas
   * schreibt. Es wäre von Vorteil zu sehen, was er gerade analysiert oder
   * aufschreibt." Er hat recht — und der Inhalt lag die ganze Zeit in den
   * Daten: jedes Ereignis trägt `titel`, `ergebnis`, `begruendung`, `stand`.
   * Eine Bühne, auf der man sieht, DASS jemand arbeitet, aber nicht WAS er tut,
   * ist eine Pantomime.
   */
  function textVon(ev) {
    var kopf = "", inhalt = "";
    var ph = ev && ev.phase;
    if (ph === "idee" || ph === "vorschlag") {
      kopf = "schlägt vor: „" + (ev.titel || ev.was || "?") + "“";
      inhalt = ev.ergebnis || ev.beschreibung || "";
    } else if (ph === "bewertung") {
      kopf = "bewertet die Vorschläge der anderen";
      inhalt = ev.begruendung || "";
    } else if (ph === "schluss") {
      kopf = "schließt die Konferenz" + (ev.sieger ? ": „" + ev.sieger + "“" : "");
      inhalt = ev.begruendung || ev.auftrag || "";
    } else if (ph === "build") {
      kopf = "schreibt " + (ev.zeichen || 0) + " Zeichen in " + (ev.dateiname || "die Datei");
      inhalt = ev.weitergabe || "";
    } else if (ph === "urteil") {
      kopf = "urteilt: " + (ev.urteil || "?");
      inhalt = ev.begruendung || "";
    } else if (ph === "befund") {
      kopf = ev.anzahl ? "findet " + ev.anzahl + " Befund(e)" : "findet nichts";
      inhalt = (ev.befunde && ev.befunde[0] && ev.befunde[0].was) || "";
    } else if (ph === "feierabend") {
      kopf = "schreibt den Feierabend-Bericht";
      inhalt = ev.stand || ev.naechsterSchritt || "";
    /* ⚠ DIE VIER, DIE HIER GEFEHLT HABEN (Klaus 2026-09-06, mit Bild).
       Bei Lisa stand auf der Bühne „unbekannte Phase „gestaltung"" — während
       die Räume denselben Schritt vollständig zeigten. Als die drei neuen
       Rollen am 2026-09-05 dazukamen, hat es die SATZ-BILDUNG in `ansicht.js`
       gelernt und diese Datei nicht. Der mitgelieferte Beispiel-Lauf trug die
       Phasen nicht, also fiel es keiner Probe auf.
       Es ist dieselbe Lehre wie bei `merkliste` am selben Tag: ein Beispiel ist
       nicht überall. Seitdem hält ein Wächter beide Listen gegeneinander — eine
       Regel, an die man sich erinnern muss, ist keine. */
    } else if (ph === "schaerfung") {
      kopf = "schärft den Vorschlag";
      inhalt = ev.schaerfung ||
        (ev.pruefmerkmalTraegt === false ? "Das Prüfmerkmal trägt nicht." : "");
    } else if (ph === "gestaltung") {
      var bef = ev.befunde || [];
      kopf = bef.length ? "sieht hin: " + bef.length + " Sache(n)" : "sieht hin: nichts im Weg";
      /* Ob nachgesehen werden KONNTE, gehört an den Befund. Ein Vergleich, den
         niemand anstellen konnte, sieht sonst aus wie keiner, den es braucht. */
      inhalt = (bef[0] && (bef[0].stelle ? bef[0].stelle + ": " + bef[0].was : bef[0].was)) ||
        (ev.konnteNachsehen === false ? "ohne Netz-Werkzeug — konnte nicht nachsehen" : "");
    } else if (ph === "nutzung") {
      kopf = ev.durchgekommen ? "benutzt es — kommt durch" : "benutzt es — bleibt stecken";
      var h = (ev.haengengeblieben || [])[0];
      inhalt = h ? "wollte " + h.wollte + " — " + h.passierte : (ev.ablauf || "");
    } else if (ph === "merkliste") {
      var eintr = ev.eintraege || [];
      kopf = eintr.length ? "merkt sich " + eintr.length + " Idee(n)" : "merkt sich nichts";
      inhalt = eintr.length ? eintr.map(function (x) { return x.titel; }).join(" · ") : "";
    } else if (ph) {
      /* Eine unbekannte Phase wird BENANNT, nicht verschwiegen. */
      kopf = "— unbekannte Phase „" + ph + "“";
    }
    return { kopf: kopf, inhalt: inhalt };
  }

  /* Was gerade getan wird — kurz, in ganzen Sätzen, aus den Daten. */
  Buehne.prototype.zeigeBlase = function (ev) {
    if (!ev) { this.blase.hidden = true; this.blase.textContent = ""; return; }
    var t = textVon(ev);

    while (this.blase.firstChild) this.blase.removeChild(this.blase.firstChild);
    if (t.kopf) {
      var z1 = document.createElement("b");
      z1.textContent = (ev.wer || ev.rolle || "") + " " + t.kopf;
      this.blase.appendChild(z1);
      if (t.inhalt) {
        var z2 = document.createElement("p");
        z2.className = "b-inhalt";
        /* Gekürzt, weil die Blase sonst die Bühne verdrängt. Der VOLLE Text
           steht in der Akte — ein Klick auf den Namen. */
        z2.textContent = t.inhalt.length > 260 ? t.inhalt.slice(0, 260) + " …" : t.inhalt;
        this.blase.appendChild(z2);
      }
    }
    this.blase.hidden = !t.kopf;
  };

  /*
   * DER VOLLE TEXT DES AUGENBLICKS — und die mitlaufende Akte (1.3).
   *
   * Zwei Fälle, und die Unterscheidung ist der ganze Punkt:
   *
   *   · Ist eine AKTE offen, gehört ihr der Platz. Sie zeigt ohnehin alles,
   *     was diese Person gesagt hat; der laufende Beitrag wird darin nur
   *     HERVORGEHOBEN und herangeholt. Ein zweiter Kasten mit demselben Text
   *     daneben wäre doppelt und verdrängte die Bühne.
   *   · Ist KEINE offen, steht hier der volle Text des Schritts, auf dem das
   *     Abspielen gerade steht.
   *
   * ⚠ HERANGEHOLT WIRD NUR BEIM ABSPIELEN. Wer von Hand einen Schritt weiter
   * klickt, hat den Blick schon dort, wo er ihn haben will — die Seite unter
   * ihm wegzuziehen wäre eine Zumutung. `spielt` sagt es, und es kommt aus
   * derselben Variablen, die das Abspielen steuert.
   */
  Buehne.prototype.zeigeVolltext = function (ev, idx, spielt) {
    /* Die offene Akte führt mit — Hervorhebung und Heranholen. */
    if (this.offeneAkte) {
      var treffer = null;
      var stuecke = this.akte.querySelectorAll(".b-akte-beitrag");
      for (var i = 0; i < stuecke.length; i++) {
        var passt = !!(ev && ev.rolle === this.offeneAkte &&
                       Number(stuecke[i].getAttribute("data-schritt")) === idx + 1);
        stuecke[i].classList.toggle("jetzt", passt);
        if (passt) treffer = stuecke[i];
      }
      this.akte.setAttribute("data-jetzt", treffer ? String(idx + 1) : "");
      if (treffer && spielt && treffer.scrollIntoView)
        treffer.scrollIntoView({ block: "center", behavior: "smooth" });
      this.volltext.hidden = true;
      this.volltext.setAttribute("data-volltext", "akte");
      return;
    }

    var t = ev ? textVon(ev) : { kopf: "", inhalt: "" };
    while (this.volltext.firstChild) this.volltext.removeChild(this.volltext.firstChild);
    if (!ev || !t.kopf) {
      this.volltext.hidden = true;
      this.volltext.setAttribute("data-volltext", "");
      return;
    }
    this.volltext.hidden = false;
    this.volltext.setAttribute("data-volltext", String(ev.rolle || ""));
    this.volltext.setAttribute("data-schritt", String(idx + 1));

    var kopf = document.createElement("div");
    kopf.className = "b-volltext-kopf";
    var wer = document.createElement("b");
    /* DER NAME STEHT ÜBER DEM TEXT, DER IHM GEHÖRT. Klaus (1.2): „Am besten
       wäre es, wenn ‚Jonas schreibt‘ unten dran auftaucht, was Jonas
       geschrieben hat." Genau das ist diese Zeile — Name und Tätigkeit einmal,
       und darunter das Gesagte, statt zweier Ebenen übereinander, die
       Verschiedenes meinen. */
    wer.textContent = (ev.wer || ev.rolle || "") + " " + t.kopf;
    kopf.appendChild(wer);
    var nr = document.createElement("span");
    nr.className = "b-volltext-nr";
    nr.textContent = "Schritt " + (idx + 1) + " von " + this.events.length;
    kopf.appendChild(nr);

    var selbst = this;
    kopf.appendChild(vorleseKnopf(function () {
      return (ev.wer || ev.rolle || "") + " " + t.kopf + ". " + (t.inhalt || "");
    }));
    var hin = stimmeLage();
    kopf.appendChild((function () {
      var a = document.createElement("button");
      a.type = "button";
      a.className = "b-volltext-akte";
      a.textContent = "Alles von " + (ev.wer || ev.rolle || "dieser Person");
      a.title = "Öffnet die Akte — jeder Beitrag dieser Person in diesem Lauf";
      a.addEventListener("click", function () { selbst.zeigeAkte(ev.rolle); });
      return a;
    })());
    this.volltext.appendChild(kopf);

    if (hin.warnung) {
      var w = document.createElement("p");
      w.className = "b-leise-klein";
      w.textContent = hin.warnung;
      this.volltext.appendChild(w);
    }

    if (t.inhalt) {
      var p = document.createElement("p");
      p.className = "b-volltext-text";
      /* UNGEKÜRZT. Das ist der ganze Zweck: die Blase schneidet bei 260
         Zeichen ab, und bis zum 2026-08-22 gab es nirgends im laufenden Bild
         den vollen Satz. Hier zu kürzen hieße, denselben Text zweimal zu
         beschneiden und nirgends zu zeigen. */
      p.textContent = t.inhalt;
      this.volltext.appendChild(p);
    } else {
      /* NICHT stumm leer: dass dieser Schritt keinen Text trägt, ist selbst
         eine Auskunft — ein leerer Kasten sähe aus, als fehle etwas. */
      var leer = document.createElement("p");
      leer.className = "b-leise-klein";
      leer.textContent = "Zu diesem Schritt steht kein weiterer Text in den Daten.";
      this.volltext.appendChild(leer);
    }
  };

  /* Und wenn nichts läuft, steht das da. Ein leerer Kasten sähe aus wie
     „kaputt" — und wer ein Beispiel sieht, erfährt es HIER, nicht im
     Kleingedruckten. */
  Buehne.prototype.zeigeLage = function (ev, idx) {
    /* HERKUNFT und ART, beide beim Namen. Vorher stand hier „Beispiel-Lauf,
       keine echte Schicht" — ein Satz, der zwei verschiedene Dinge in einem
       Wort zusammenzog und dadurch beide falsch nannte: „Beispiel" hieß im
       Code nur „nicht von diesem Gerät", und „keine echte Schicht" ist eine
       Aussage über die ART, die man aus `art` ablesen muss, nicht aus dem
       Ablageort. Klaus hat es am 2026-08-22 gefunden. */
    var teile = [];
    if (this.istBeispiel) teile.push("mitgeliefert" + (this.datum ? " vom " + this.datum : ""));
    if (this.art === "trocken") teile.push("trocken, nichts bezahlt");
    else if (this.art === "echt") teile.push("echt bezahlt");
    var vor = teile.length ? teile.join(" · ") + " — " : "";
    this.lage.setAttribute("data-herkunft", this.istBeispiel ? "mitgeliefert" : "geraet");
    this.lage.setAttribute("data-art", this.art || "");
    if (!this.events.length) {
      this.lage.textContent = vor + "Noch keine Schicht geladen.";
      return;
    }
    if (!ev) {
      this.lage.textContent = vor + "Ruhe. " + this.events.length +
        " Schritte liegen bereit — auf ▶ Abspielen drücken.";
      return;
    }
    var wo = this.wurdeGebaut ? "" : " · gebaut wird von einer Claude-Sitzung";
    this.lage.textContent = vor + "Schritt " + (idx + 1) + " von " + this.events.length + wo +
      (ev.runde ? " · Runde " + ev.runde : "") +
      " · " + (ev.ms || 0) + " ms gemessen" +
      (this.laeuft ? " · die Schicht läuft" : "");
  };

  welt.KimhubBuehne = { Buehne: Buehne, ROLLEN: ROLLEN, PHASEN: PHASEN,
                       artWort: artWort, artVon: artVon,
                       _stellung: stellung, _KURZ: KURZ,
                       _textVon: textVon, _stimmeLage: stimmeLage,
                       /* Der Vorlese-Knopf wird auch außerhalb der Bühne
                          gebraucht (Übergabe-Blatt, Ergebnis). EINE Fassung,
                          weil zwei auseinanderliefen — und dann läse die eine
                          vor und die andere schwiege. */
                       vorleseKnopf: vorleseKnopf, vorlesenAus: vorlesenAus };
})(typeof window !== "undefined" ? window : globalThis);
