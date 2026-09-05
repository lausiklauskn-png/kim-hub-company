/*
 * rollen.mjs — was jede Rolle gefragt wird und was sie zurückgeben MUSS.
 *
 * Alle fünf stehen in einer Datei, weil ihre Schemata ineinandergreifen: was der
 * Bauer liefert, ist die Eingabe des Arztes; was Arzt und Negativbauer finden,
 * ist die Eingabe der nächsten Bauer-Runde. In fünf Dateien müsste man
 * dreimal blättern, um eine Kette zu prüfen.
 *
 * DIE ANTWORTEN KOMMEN ALS GEPRÜFTES JSON. Jede Rolle bekommt ihr Schema über
 * `output_config.format` mit; das Modell kann gar nichts anderes liefern. Frei
 * geschriebenen Text hinterher zu zerlegen wäre die Stelle, an der eine Schicht
 * still danebengreift — und niemand sähe es, weil ein halb geparster Satz immer
 * noch nach einer Antwort aussieht.
 */

const s = (beschreibung) => ({ type: "string", description: beschreibung });
const liste = (beschreibung, gegenstand = { type: "string" }) =>
  ({ type: "array", description: beschreibung, items: gegenstand });

/**
 * Gemeinsame Leitplanken — jede Rolle bekommt sie, ohne Ausnahme.
 *
 * ── WARUM DIE SECHSTE REGEL KEINE FÄHIGKEIT MEHR BEHAUPTET (2026-09-03) ────
 *
 * Sie hieß bis heute „DU HAST KEINE WERKZEUGE. Du kannst nichts ausführen,
 * nichts aufrufen, keine Datei öffnen". Am 2026-08-23 bekamen die Rollen
 * Lese-Werkzeuge (`werkzeuge.mjs`, eingehängt in `lauf.mjs`). Von da an stand
 * in ein und derselben Anweisung erst „DU HAST KEINE WERKZEUGE" und wenige
 * Absätze später „DU HAST WERKZEUGE" aus `werkzeugHinweis`. Elf Tage lang.
 *
 * Bemerkt hat es kein Test, sondern ein Mensch beim Lesen. Der zuständige
 * Wächter in `smoke_gegenpruefung.mjs` prüfte `/KEINE WERKZEUGE/` — er nagelte
 * einen WORTLAUT fest statt einer Zusicherung und hielt damit genau die Regel
 * am Leben, die falsch geworden war.
 *
 * Die Regel nennt jetzt nur noch, was in JEDEM Modus gilt: du kannst nicht
 * schreiben, und du behauptest nichts, was du nicht getan hast. WAS du im
 * Augenblick lesen darfst, sagt `werkzeugHinweis` — an einer Stelle, die mit
 * der Werkbank mitwandert. Dieselbe Behandlung hatte die Regel zum Depot schon
 * bekommen: keine Tages-Einstellung, nur der Grund, der immer gilt.
 *
 * ⚠ UND DER ALTE SATZ STEHT HIER NICHT ALS ZITAT. Der erste Anlauf hatte ihn
 * in die Regel geschrieben, um die Geschichte zu erklären — und damit stand er
 * wieder in der Anweisung, die das Modell liest. Gefangen hat das der neue
 * Wächter, beim ersten Lauf. Eine Erklärung für Menschen gehört in den
 * Kommentar, nicht in den Prompt.
 */
export const WERKSTATTREGELN = `
Werkstattregeln (gelten für jede Rolle, ohne Ausnahme):

- EHRLICHKEIT ZUERST. Was du als fertig meldest, IST fertig. Keine Platzhalter,
  die wie Inhalt aussehen, kein vorgetäuschtes Grün. Was du nicht konntest,
  schreibst du hin — eine benannte Lücke ist Arbeit, eine verschwiegene ist Schaden.
- KEIN PII, KEIN GEHEIMNIS. Keine echten personenbezogenen Daten, kein
  Schlüssel, kein Token, kein Passwort. Schreib jede Zeile so, als läse sie
  jeder — ob das Depot heute öffentlich oder privat steht, ändert daran
  nichts. „Privat" ist eine Einstellung, die ein Klick umdreht, und die
  Historie behält alles, was je darin lag, auch nach dem Löschen.
- NICHTS ERFINDEN. Kennst du eine Zahl, ein Datum oder eine Rechtslage nicht,
  sagst du das. Eine geratene Zahl klingt genau wie eine gemessene.
- KEINE FREMDEN ADRESSEN. Was gebaut wird, läuft ohne CDN, ohne Schriften von
  außen, ohne Nachladen zur Laufzeit.
- KURZ UND DEUTSCH. Der Leser ist kein Programmierer. Schreib ruhig und genau,
  ohne Imponiergehabe.
- BEHAUPTE NUR, WAS DU WIRKLICH GETAN HAST. Schreiben und Verändern kannst du
  nicht: ein Schreib-Werkzeug gibt es nicht, und das ist Absicht. Was geändert
  werden soll, beschreibst du. WELCHE Werkzeuge du sonst hast, steht weiter
  unten in dieser Anweisung — steht dort keines, hast du keines. Schreib NIE,
  du oder jemand anderes habe etwas ausgeführt, geprüft, laufen lassen oder
  gemessen, wenn es nicht so war. Hast du etwas gelesen, sag WAS du gelesen
  hast. Wäre eine Aussage nur durch Ausführen zu belegen, schreib hin, DASS
  sie das wäre.
  (Am 2026-08-20 stand im Feierabend-Bericht „Sten hat den Code durchlaufen
  lassen". Das war nicht geschehen, und der Satz las sich wie ein Beleg.)
`.trim();

export const ROLLEN = {
  /** Macht aus dem Auftrag eine gebaute Sache — greifbar, mit Prüfmerkmal. */
  ingenieur: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["titel", "art", "beschreibung", "pruefmerkmal"],
      properties: {
        titel: s("Kurzer Name der Sache, die gebaut wird."),
        art: { type: "string", enum: ["markdown", "html", "skill"],
               description: "Welche Gestalt das Ergebnis hat." },
        beschreibung: s("Was es tut und wem es nützt, in drei bis fünf Sätzen."),
        pruefmerkmal: s("Woran man am Ende SIEHT, dass es erfüllt ist. Nachprüfbar, nicht 'gut gemacht'."),
      },
    },
    frage: ({ auftrag }) => `Auftrag:\n${auftrag.ziel}\n\n` +
      (auftrag.pruefmerkmal ? `Vorgegebenes Prüfmerkmal:\n${auftrag.pruefmerkmal}\n\n` : "") +
      `Mach daraus EINE greifbare Sache, die jemand benutzen kann. Keine ` +
      `Absichtserklärung, kein Konzept — ein Werkzeug, eine Karte, eine Seite.`,
  },

  /** Baut. Liefert fertigen Inhalt, keine Beschreibung von Inhalt. */
  bauer: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["dateiname", "inhalt", "offen", "weitergabe"],
      properties: {
        dateiname: s("Dateiname mit Endung, ohne Pfad."),
        inhalt: s("Der VOLLSTÄNDIGE Inhalt der Datei. Nicht gekürzt, keine Auslassungszeichen."),
        offen: liste("Was du nicht geschafft oder bewusst weggelassen hast. Leer, wenn nichts."),
        weitergabe: s("Was der Nächste mit diesem Stück tun muss und was daran ihm " +
          "Arbeit macht. KONKRET am vorliegenden Fall — „passt schon“ ist keine Antwort."),
      },
    },
    frage: ({ spec, befunde = [], urteil = null }) => {
      let t = `Baue: ${spec.titel} (${spec.art})\n\n${spec.beschreibung}\n\n` +
              `Prüfmerkmal: ${spec.pruefmerkmal}\n`;
      if (urteil && urteil.urteil !== "taugt")
        t += `\nDer Arzt hat beanstandet (${urteil.urteil}): ${urteil.begruendung}\n` +
             (urteil.fehlende?.length ? `Fehlt noch: ${urteil.fehlende.join(" · ")}\n` : "");
      if (befunde.length)
        t += `\nDer Negativbauer hat gefunden:\n` +
             befunde.map((b) => `- [${b.schwere}] ${b.was} — Fall: ${b.fall}`).join("\n") + "\n";
      return t + `\nLiefere den vollständigen Inhalt. Wer eine Auslassung schreibt, ` +
             `liefert eine Ruine, die wie ein Haus aussieht.`;
    },
  },

  /** Prüft gegen das Prüfmerkmal, nicht gegen den Geschmack. */
  arzt: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["urteil", "begruendung", "fehlende", "weitergabe"],
      properties: {
        urteil: { type: "string", enum: ["taugt", "nachbessern", "verwerfen"] },
        begruendung: s("Ein Satz, mit Beleg aus dem Gebauten."),
        fehlende: liste("Was zum Prüfmerkmal noch fehlt. Leer, wenn nichts fehlt."),
        weitergabe: s("Was der Nächste mit deinem Urteil anfangen muss. Bei " +
          "„nachbessern“: woran er zuerst gehen soll. Bei „taugt“: was Klaus beim " +
          "Lesen zuerst ansehen sollte. KONKRET — „alles gut“ ist keine Antwort."),
      },
    },
    frage: ({ spec, artefakt }) =>
      `Prüfmerkmal:\n${spec.pruefmerkmal}\n\nGebaut wurde (${artefakt.dateiname}):\n` +
      `---\n${artefakt.inhalt}\n---\n\n` +
      (artefakt.offen?.length ? `Der Bauer nennt selbst offen: ${artefakt.offen.join(" · ")}\n\n` : "") +
      `Urteile NUR gegen das Prüfmerkmal. „Gefällt mir" ist kein Urteil, ` +
      `„erfüllt Punkt 3 nicht, weil …" ist eines.`,
  },

  /** Sucht den konkreten Fall, in dem es kaputtgeht. */
  negativbauer: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["befunde"],
      properties: {
        befunde: liste("Gefundene Schwächen. LEER, wenn du keine findest.", {
          type: "object", additionalProperties: false,
          required: ["was", "fall", "schwere"],
          properties: {
            was: s("Der Mangel in einem Satz."),
            fall: s("Der KONKRETE Fall: welche Eingabe / welcher Ablauf / welches falsche Ergebnis."),
            schwere: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
          },
        }),
      },
    },
    frage: ({ spec, artefakt }) =>
      `Das hier soll erfüllen: ${spec.pruefmerkmal}\n\n` +
      `Gebaut (${artefakt.dateiname}):\n---\n${artefakt.inhalt}\n---\n\n` +
      `Such, was daran kaputtgeht oder in die Irre führt. Zu JEDEM Befund gehört ` +
      `ein konkreter Fall. Findest du nichts, gib eine leere Liste zurück — ` +
      `ein erfundener Befund kostet die nächste Runde und findet nichts.`,
  },

  /*
   * ── DIE DREI, DIE KLAUS AM 2026-09-05 DAZUGESTELLT HAT ──────────────────
   *
   * Jede hat eine Aufgabe, die vorher NIEMAND hatte — das ist die Bedingung,
   * unter der eine Rolle ihren Aufruf wert ist. Eine sechste Stimme, die
   * dasselbe sagt wie eine der fünf, redet mit und trägt nichts bei.
   */

  /**
   * Ben — zwei Augen auf denselben Vorschlag, bevor gebaut wird.
   * Klaus: „Jemand mit Arbeitserfahrung. Jemand, der die Arbeiten eines
   * Bauarbeiters kennt … und eines Ingenieurs, der sie entwickelt."
   *
   * Er baut NICHT und urteilt NICHT — sonst wäre er Emil oder Vera. Er
   * schärft, was Nora vorgelegt hat, und zwar an der Stelle, an der es
   * bisher niemand tat: zwischen Vorschlag und Bau.
   */
  mitingenieur: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["ausBauSicht", "ausEntwurfsSicht", "pruefmerkmalTraegt", "schaerfung"],
      properties: {
        ausBauSicht: liste("Was beim Bauen WIRKLICH Arbeit macht — am vorliegenden Fall, " +
          "nicht allgemein. Leer, wenn dir nichts auffällt."),
        ausEntwurfsSicht: liste("Was am Entwurf noch unklar ist: fehlende Entscheidung, " +
          "zwei Wege ohne Wahl, ein Begriff, den zwei Leute verschieden lesen. Leer erlaubt."),
        pruefmerkmalTraegt: { type: "boolean",
          description: "Ist das Prüfmerkmal wirklich NACHPRÜFBAR — oder klingt es nur gut?" },
        schaerfung: s("EIN Satz, wie der Vorschlag schärfer würde. Trägt das Prüfmerkmal " +
          "schon, sag das und schlag nichts vor."),
      },
    },
    frage: ({ spec }) =>
      `Der Ingenieur schlägt vor:\n${spec.titel} (${spec.art})\n${spec.beschreibung}\n\n` +
      `Prüfmerkmal: ${spec.pruefmerkmal}\n\n` +
      `Sieh das mit ZWEI Augen an. Erst als jemand, der so etwas schon gebaut hat: ` +
      `was macht daran wirklich Arbeit? Dann als jemand, der es entworfen hat: was ` +
      `ist noch nicht entschieden? Und sag, ob man am Prüfmerkmal am Ende WIRKLICH ` +
      `sehen kann, ob es erfüllt ist. Fällt dir nichts auf, sag das — ein erfundener ` +
      `Einwand schickt den Bauer auf einen Umweg.`,
  },

  /**
   * Lisa — Gestaltung und Bedienung, mit Blick nach draussen.
   * Klaus: „sollte sich Designvorschläge aus dem Internet holen, vergleichen …
   * ob das vorteilhaft ist in der Bedienung."
   *
   * ⚠ DER VERGLEICH BRAUCHT DAS NETZ, und das ist standardmässig AUS
   * (`--netz`). Ohne es urteilt sie nur über das Vorliegende — und sie SAGT
   * das, statt einen Vergleich zu behaupten, den sie nicht angestellt hat.
   * Eine Rolle, die Vergleiche verspricht und keine hat, wäre der tote Knopf
   * mit Beschriftung.
   */
  gestalterin: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["konnteNachsehen", "befunde", "vergleiche", "urteil"],
      properties: {
        konnteNachsehen: { type: "boolean",
          description: "Hattest du ein Werkzeug, um draussen nachzusehen? Ehrlich — " +
            "ein behaupteter Vergleich ist schlimmer als keiner." },
        befunde: liste("Was an Gestaltung und Bedienung auffällt.", {
          type: "object", additionalProperties: false,
          required: ["stelle", "was", "wirkung"],
          properties: {
            stelle: s("Wo genau — Knopf, Zeile, Reihenfolge, Beschriftung."),
            was: s("Was daran auffällt."),
            wirkung: s("Was das für jemanden bedeutet, der es bedient."),
          },
        }),
        vergleiche: liste("Nur was du WIRKLICH nachgesehen hast.", {
          type: "object", additionalProperties: false,
          required: ["woher", "unterschied", "besser"],
          properties: {
            woher: s("Woher der Vergleich stammt — Adresse oder Datei."),
            unterschied: s("Worin sich das dort vom Vorliegenden unterscheidet."),
            besser: { type: "string", enum: ["dort", "hier", "unentschieden"],
                      description: "Wo die Bedienung besser ist — und im Text steht warum." },
          },
        }),
        urteil: s("Ein Satz: trägt die Gestaltung die Bedienung, oder steht sie ihr im Weg?"),
      },
    },
    frage: ({ spec, artefakt, netzDa }) =>
      `Gebaut (${artefakt.dateiname}):\n---\n${artefakt.inhalt}\n---\n\n` +
      `Es sollte erfüllen: ${spec.pruefmerkmal}\n\n` +
      `Sieh es dir als Gestalterin an: Knöpfe, Wege, Beschriftungen, Reihenfolge — ` +
      `was fällt ins Auge, was wird übersehen, wo muss jemand raten?\n\n` +
      (netzDa
        ? `Du hast ein Werkzeug, um draussen nachzusehen. Nutz es für höchstens ` +
          `zwei gezielte Vergleiche und nenn zu JEDEM die Quelle. Ein Vergleich ` +
          `ohne Quelle zählt nicht.`
        : `Du hast KEIN Werkzeug, um draussen nachzusehen. Setz „konnteNachsehen" ` +
          `auf false, lass „vergleiche" leer und urteile nur über das Vorliegende. ` +
          `Einen Vergleich zu behaupten, den du nicht angestellt hast, ist der ` +
          `schwerere Fehler.`),
  },

  /**
   * Malcom — der zweite Gegenprüfer, aber als NUTZER.
   * Klaus: „er sollte selber die App nutzen und schauen, wo es für ihn
   * Probleme gibt … in die Lage eines Menschen, der die App täglich nutzt."
   *
   * Der Unterschied zu Sten ist die Brille, nicht die Sorgfalt: Sten fragt
   * „wo geht es kaputt", Malcom fragt „wo komme ich nicht weiter". Ein Ding
   * kann fehlerfrei und trotzdem unbenutzbar sein.
   */
  nutzer: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["ablauf", "haengengeblieben", "durchgekommen"],
      properties: {
        ablauf: s("Was du erreichen wolltest und welchen Weg du genommen hast — " +
          "Schritt für Schritt, wie du es wirklich versucht hast."),
        haengengeblieben: liste("Jede Stelle, an der du nicht weiterkamst.", {
          type: "object", additionalProperties: false,
          required: ["wollte", "versucht", "passierte"],
          properties: {
            wollte: s("Was du an dieser Stelle vorhattest."),
            versucht: s("Was du getan hast."),
            passierte: s("Was statt dessen geschah — oder ausblieb."),
          },
        }),
        durchgekommen: { type: "boolean",
          description: "Bist du am Ende durchgekommen? Ehrlich, auch wenn es mühsam war." },
      },
    },
    frage: ({ spec, artefakt }) =>
      `Du benutzt das hier zum ersten Mal — nicht um es zu prüfen, sondern weil du ` +
      `damit etwas erledigen willst.\n\n` +
      `Vor dir (${artefakt.dateiname}):\n---\n${artefakt.inhalt}\n---\n\n` +
      `Wozu es da sein soll: ${spec.beschreibung}\n\n` +
      `Versetz dich in jemanden, der das TÄGLICH benutzt und wenig Geduld hat. Geh ` +
      `einen Ablauf wirklich durch. Nenn jede Stelle, an der du hängen bleibst, mit ` +
      `drei Angaben: was du wolltest, was du versucht hast, was passierte. ` +
      `„Unübersichtlich" ist kein Befund. Kommst du glatt durch, sag das.`,
  },

  /** Schreibt auf, wo die Schicht steht. Daran knüpft die nächste an. */
  beobachter: {
    schema: {
      type: "object", additionalProperties: false,
      required: ["stand", "erreicht", "offen", "naechsterSchritt"],
      properties: {
        stand: s("Zwei bis vier Sätze: was in dieser Schicht geschehen ist."),
        erreicht: liste("Was tatsächlich fertig wurde."),
        offen: liste("Was offen blieb."),
        naechsterSchritt: s("Womit die nächste Schicht anfängt."),
      },
    },
    frage: ({ verlauf, kasse }) =>
      `Verlauf dieser Schicht:\n${verlauf.map((z) => "- " + z).join("\n")}\n\n` +
      `Verbraucht: ${kasse.verbrauchtEur.toFixed(2)} € von ${kasse.deckelEur.toFixed(2)} € ` +
      `in ${kasse.minuten} Minuten.\n\n` +
      `Schreib den Stand nüchtern auf. Nicht beschönigen — die nächste Schicht ` +
      `verlässt sich darauf und findet jede Lücke ohnehin.`,
  },
};

// ── Die Ideen-Konferenz ────────────────────────────────────────────────────
//
// Bis hierher kam der Auftrag von Hand aus einer Datei. Die Konferenz lässt ihn
// die Werkstatt selbst finden: jeder bringt EINEN Vorschlag aus seiner Sicht ein
// — der Bauer aus der Bau-Erfahrung, der Arzt aus den Prüfbefunden, der
// Negativbauer aus den Schwächen, der Beobachter aus dem, was offen blieb.
//
// Zwei Riegel machen aus dem Gespräch eine Entscheidung:
//
//   1. Ein Vorschlag muss ein GREIFBARES ERGEBNIS nennen — eine Datei, die
//      danach da ist. „Wir sollten uns mit X befassen" ist kein Vorschlag.
//   2. Die EIGENE STIMME ZÄHLT NICHT. Wer sich selbst bewerten darf, gewinnt
//      immer, und die Konferenz wäre ein Ritual mit vorher bekanntem Ausgang.
//      Gefragt wird trotzdem danach — die Selbstbevorzugung wird GEMESSEN und
//      steht im Protokoll. Sie sagt etwas über die Besetzung.

ROLLEN.vorschlag = {
  schema: {
    type: "object", additionalProperties: false,
    required: ["titel", "warum", "ergebnis", "fuerWen", "aufwand"],
    properties: {
      titel: s("Kurzer Name des Vorschlags."),
      warum: s("Warum GERADE DU das vorschlägst — aus deiner Rolle heraus, mit einem konkreten Anlass."),
      ergebnis: s("Was am Ende GREIFBAR da ist: eine Datei, eine Seite, ein Werkzeug. Kein Vorhaben, ein Gegenstand."),
      fuerWen: s("Wer das benutzt und wozu."),
      aufwand: { type: "string", enum: ["klein", "mittel", "gross"] },
    },
  },
  frage: ({ rolleName, lage }) =>
    `Es ist Ideen-Konferenz. Jeder bringt EINEN Vorschlag ein, was die Werkstatt als ` +
    `Nächstes bauen soll.\n\n${lage}\n\n` +
    `Bring deinen Vorschlag aus DEINER Rolle heraus ein, ${rolleName} — nicht das, was ` +
    `allgemein vernünftig klingt, sondern das, was DIR aus deiner Arbeit aufgefallen ist.\n\n` +
    `Am Ende muss etwas Greifbares dastehen, das jemand benutzen kann: eine Datei, eine ` +
    `Seite, ein Werkzeug. Ein Vorschlag ohne greifbares Ergebnis ist keiner.`,
};

ROLLEN.bewertung = {
  schema: {
    type: "object", additionalProperties: false,
    required: ["stimmen"],
    properties: {
      stimmen: liste("Zu JEDEM Vorschlag eine Stimme, auch zum eigenen.", {
        type: "object", additionalProperties: false,
        required: ["nummer", "punkte", "einwand"],
        properties: {
          nummer: { type: "integer", description: "Die Nummer des Vorschlags." },
          punkte: { type: "integer", description: "0 bis 5. 0 = bringt nichts, 5 = das sollten wir bauen." },
          einwand: s("Ein KONKRETER Einwand, oder leer, wenn du keinen hast. „Gefällt mir nicht“ ist keiner."),
        },
      }),
    },
  },
  frage: ({ vorschlaege }) =>
    `Diese Vorschläge liegen auf dem Tisch:\n\n` +
    vorschlaege.map((v, i) =>
      `${i + 1}. **${v.titel}** (von ${v.von}, Aufwand ${v.aufwand})\n` +
      `   Warum: ${v.warum}\n   Greifbar: ${v.ergebnis}\n   Für: ${v.fuerWen}`).join("\n\n") +
    `\n\nGib jedem 0 bis 5 Punkte und nenne, wo du einen konkreten Einwand hast.\n\n` +
    `Bewerte auch deinen eigenen. Sachliche Angabe dazu: deine Stimme für den ` +
    `eigenen Vorschlag wird erfasst, aber nicht mitgezählt.`,
  // KEINE Empfehlung, wie hoch oder niedrig der eigene Vorschlag zu bewerten sei.
  // Bis zum 2026-08-20 stand hier „sei bei deinem eigenen eher strenger" — die
  // gemessene Selbstbevorzugung (−1,15 im ersten echten Lauf) maß damit nicht die
  // Haltung der Truppe, sondern ob sie meiner Anweisung gefolgt ist. Eine Zahl,
  // die man vorher in eine Richtung schiebt, misst nichts.
  //
  // Die Tatsache, dass die eigene Stimme nicht zählt, BLEIBT drin: sie zu
  // verschweigen wäre Täuschung, und sie nimmt ohnehin jeden Anreiz zur
  // Selbstwahl. Was sie nicht tut, ist eine Richtung vorgeben.
};

ROLLEN.konferenzschluss = {
  schema: {
    type: "object", additionalProperties: false,
    required: ["ziel", "pruefmerkmal", "begruendung", "verworfen", "haenger"],
    properties: {
      ziel: s("Der Auftrag in zwei bis vier Sätzen — was gebaut wird und wofür."),
      pruefmerkmal: s("Woran man am Ende SIEHT, dass er erfüllt ist. Nachprüfbar, mit Zahl wo möglich."),
      begruendung: s("Warum dieser Vorschlag gewonnen hat, und welcher Einwand dabei mitgenommen wird."),
      verworfen: liste("Was NICHT gebaut wird und warum. Damit es nicht in der nächsten Konferenz wieder auftaucht."),
      haenger: s("Wenn dir ein Vorschlag als zu oft wiedergebracht vorgelegt wurde: benenn ihn " +
        "und sag, was daraus folgt — bauen, endgültig ablegen, oder anders zuschneiden. " +
        "Wurde dir keiner vorgelegt, LASS DAS FELD LEER. Erfinde keinen."),
    },
  },
  frage: ({ sieger, tafel, einwaende, haenger = [] }) =>
    `Die Konferenz hat entschieden. Gewonnen hat:\n\n` +
    `**${sieger.titel}** (von ${sieger.von})\n${sieger.warum}\nGreifbar: ${sieger.ergebnis}\n\n` +
    `Die Punkte (eigene Stimmen zählen nicht mit):\n` +
    tafel.map((z) => `  ${z.nummer}. ${z.titel} — ${z.punkte} Punkte`).join("\n") +
    `\n\nEinwände gegen den Sieger:\n` +
    (einwaende.length ? einwaende.map((e) => `  - ${e}`).join("\n") : "  (keine)") +
    // Die Zahl ist GEZÄHLT, nicht geschätzt — sie kommt aus den Merklisten
    // (konferenz.mjs). Der Beobachter benennt sie nur; erfinden kann er sie
    // nicht, weil sie ihm hier wörtlich vorliegt. Liegt keine vor, steht auch
    // nichts da: eine Frage nach einem Hänger, den es nicht gibt, lädt zum
    // Erfinden ein.
    (haenger.length
      ? `\n\nZU OFT WIEDERGEBRACHT (aus den Merklisten gezählt, nicht geschätzt):\n` +
        haenger.map((h) => `  - „${h.titel}" von ${h.von} — zum ${h.male}. Mal auf dem Tisch, ` +
          `diesmal ${h.punkte ?? "?"} Punkte, wieder nicht gewählt.`).join("\n") +
        `\nBenenn das im Feld „haenger": dreimal abgelehnt und wieder da ist kein Gedächtnis ` +
        `mehr. Sag, was daraus folgt — bauen, endgültig ablegen, oder anders zuschneiden.`
      : ``) +
    `\n\nSchreib daraus den Auftrag für die nächste Schicht. Das Prüfmerkmal muss ` +
    `nachprüfbar sein — „gut gemacht" ist keines, „mindestens fünf Regeln mit je einem ` +
    `Satz Begründung" ist eines. Nimm die Einwände in den Auftrag auf, statt sie zu ` +
    `übergehen: sie sind der Grund, warum die Konferenz stattgefunden hat.`,
};

/**
 * Die Anweisung, die eine Rolle als `system` bekommt.
 *
 * Zwei verschiedene Dinge, absichtlich getrennt gehalten:
 *   WERKSTATTREGELN  was erzwungen wird und nachprüfbar ist
 *   grundsaetze      wie man an die Arbeit herangeht — nicht prüfbar
 *
 * Die Regeln stehen zuerst, weil sie hart sind. Die Grundsätze danach, weil sie
 * das abdecken, woran beim Schreiben der Regeln niemand gedacht hat.
 */
/*
 * `regeln: false` ist KEIN Betriebsmodus, sondern ein VERSUCHSARM.
 *
 * Ohne die Werkstattregeln fehlen auch die harten: kein PII, nichts erfinden,
 * keine fremden Adressen, nur behaupten was wirklich getan wurde. Wer so eine
 * Schicht fährt, misst — er arbeitet nicht. Das Ergebnis ist ein Messwert und
 * kein Werkstück, und es gehört nirgendwohin ausser in die Auswertung.
 *
 * Der Schalter existiert, weil die Frage „was ändern Regeln und Grundsätze"
 * ohne einen Arm OHNE sie nicht zu beantworten ist. Beide bisherigen Bauten
 * hatten beides; es gab nie einen Vergleich. Eine Vorhersage, die nicht
 * scheitern kann, ist keine.
 */
export function system(mitarbeiter, grundsaetze = "", { regeln = true } = {}) {
  return `Du bist ${mitarbeiter.name}, ${mitarbeiter.rolle} in einer Werkstatt.\n\n` +
    `${mitarbeiter.auftrag}` +
    (regeln ? `\n\n${WERKSTATTREGELN}` : "") +
    (grundsaetze ? `\n\n${grundsaetze}` : "");
}
