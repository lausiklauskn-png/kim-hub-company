/*
 * beispiele.mjs — die Antworten für die Trockenschicht.
 *
 * WOFÜR. Die Mechanik einer Schicht — Reihenfolge, Bremse, Rücklage, Gedächtnis,
 * Ergebnis-Datei — muss sich beweisen lassen, OHNE einen Cent auszugeben. Erst
 * wenn das steht, lohnt ein echter Aufruf.
 *
 * Die Geschichte hier ist absichtlich nicht die bequeme: Runde 1 reicht nicht,
 * der Arzt sagt „nachbessern", der Negativbauer findet einen schweren Fall,
 * beides geht in Runde 2, und ERST DANN ist es fertig. Ein Beispiel, in dem
 * gleich alles klappt, würde genau die Kette nicht prüfen, für die es die
 * Werkstatt gibt.
 */
export const BEISPIELE = {
  // ── Ideen-Konferenz ──────────────────────────────────────────────────────
  // Jeder bringt einen Vorschlag AUS SEINER ROLLE ein — das ist der ganze Sinn
  // der Übung. Fünf gleich gute Ideen wären keine Konferenz, sondern eine
  // Umfrage. Und die Abstimmung ist absichtlich so gebaut, dass sich jeder
  // selbst obenauf setzt: nur so lässt sich prüfen, dass die eigene Stimme
  // wirklich nicht zählt und die Selbstbevorzugung gemessen wird.
  "vorschlag:ingenieur": {
    titel: "Merkkarte KI im Arbeitsalltag",
    warum: "Mir fällt auf, dass wir viel über KI bauen, aber nichts haben, das einem " +
      "Mitarbeiter in einem Satz sagt, was er darf.",
    ergebnis: "merkkarte-ki.md — eine Seite zum Aushängen.",
    fuerWen: "Betriebe, die KI einsetzen und ihre Leute nicht schulen können.",
    aufwand: "klein",
  },
  "vorschlag:bauer": {
    titel: "Bau-Checkliste für neue Seiten",
    warum: "Ich stolpere in jeder zweiten Schicht über dieselben drei Dinge — Cache-Version " +
      "vergessen, Symbol nicht im Vorrat, Prüfmerkmal ohne Zahl.",
    ergebnis: "bau-checkliste.md — die Punkte, die vor jedem Bau abzuhaken sind.",
    fuerWen: "Mich selbst und jeden, der nach mir baut.",
    aufwand: "klein",
  },
  "vorschlag:arzt": {
    titel: "Sammlung durchgefallener Prüfmerkmale",
    warum: "Die Hälfte meiner Ablehnungen kommt daher, dass das Prüfmerkmal gar nicht " +
      "prüfbar war. Das ließe sich vorher abfangen.",
    ergebnis: "pruefmerkmale.md — gute und schlechte nebeneinander, mit Begründung.",
    fuerWen: "Den Ingenieur, bevor er ein Prüfmerkmal formuliert.",
    aufwand: "mittel",
  },
  "vorschlag:negativbauer": {
    titel: "Liste der wiederkehrenden Lücken",
    warum: "Ich finde immer wieder dieselben drei Sorten Lücke. Wenn die aufgeschrieben " +
      "wären, müsste ich sie nicht jedes Mal neu finden.",
    ergebnis: "luecken.md — die Muster, nach denen ich suche, mit je einem echten Fall.",
    fuerWen: "Den Bauer, damit er sie gar nicht erst einbaut.",
    aufwand: "mittel",
  },
  "vorschlag:mitingenieur": {
    titel: "Bau-Notizen zu jedem Prüfmerkmal",
    warum: "Ich sehe jedes Mal dieselbe Lücke zwischen dem, was der Vorschlag verlangt, " +
      "und dem, was beim Bauen wirklich Arbeit macht. Das steht nirgends.",
    ergebnis: "bau-notizen.md — je Prüfmerkmal ein Satz, was daran der Aufwand ist.",
    fuerWen: "Den Bauer, damit er nicht zweimal anfängt.",
    aufwand: "klein",
  },
  "vorschlag:gestalterin": {
    titel: "Kurze Liste: was ein Knopf sagen muss",
    warum: "Mir fällt an fast jedem Entwurf auf, dass die Beschriftung sagt, was das " +
      "Programm tut, statt was der Mensch bekommt.",
    ergebnis: "knopf-beschriftung.md — sechs Beispiele, je falsch und richtig nebeneinander.",
    fuerWen: "Jeden, der eine Oberfläche baut.",
    aufwand: "klein",
  },
  "vorschlag:nutzer": {
    titel: "Der erste Weg durch die App, aufgeschrieben",
    warum: "Ich bleibe jedes Mal an derselben dritten Stelle hängen, und beim nächsten " +
      "Mal weiß niemand mehr, wo das war.",
    ergebnis: "erster-weg.md — Schritt für Schritt, mit den Stellen, an denen man rät.",
    fuerWen: "Den Bauer und den Ingenieur.",
    aufwand: "mittel",
  },
  "vorschlag:beobachter": {
    titel: "Übergabe-Vorlage für den Schichtwechsel",
    warum: "Ich schreibe jede Schicht dasselbe Gerüst neu und lasse dabei mal dies, mal " +
      "jenes weg.",
    ergebnis: "uebergabe.md — die Vorlage, die ich am Feierabend ausfülle.",
    fuerWen: "Die nächste Schicht.",
    aufwand: "klein",
  },

  // Jeder setzt sich selbst auf 5 — das ist der Fall, den die Auszaehlung
  // aushalten muss. Ohne den Riegel gaebe es hier fuenffachen Gleichstand.
  "bewertung:ingenieur": { stimmen: [
    { nummer: 1, punkte: 5, einwand: "" },
    { nummer: 2, punkte: 4, einwand: "" },
    { nummer: 3, punkte: 2, einwand: "" },
    { nummer: 4, punkte: 3, einwand: "" },
    { nummer: 5, punkte: 1, einwand: "" },
    { nummer: 6, punkte: 4, einwand: "" },
    { nummer: 7, punkte: 2, einwand: "" },
    { nummer: 8, punkte: 3, einwand: "" }
  ] },
  "bewertung:bauer": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "Eine Seite ist knapp — sechs Regeln mit Begründung passen kaum." },
    { nummer: 2, punkte: 2, einwand: "" },
    { nummer: 3, punkte: 5, einwand: "" },
    { nummer: 4, punkte: 3, einwand: "" },
    { nummer: 5, punkte: 1, einwand: "" },
    { nummer: 6, punkte: 4, einwand: "" },
    { nummer: 7, punkte: 2, einwand: "" },
    { nummer: 8, punkte: 3, einwand: "" }
  ] },
  "bewertung:arzt": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "Braucht ein Prüfmerkmal mit Zahl, sonst fällt es bei mir durch." },
    { nummer: 2, punkte: 2, einwand: "" },
    { nummer: 3, punkte: 3, einwand: "Eine Checkliste, die niemand abhakt, ist eine Liste." },
    { nummer: 4, punkte: 5, einwand: "" },
    { nummer: 5, punkte: 1, einwand: "" },
    { nummer: 6, punkte: 4, einwand: "" },
    { nummer: 7, punkte: 2, einwand: "" },
    { nummer: 8, punkte: 3, einwand: "" }
  ] },
  "bewertung:negativbauer": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "Wer sie aushängt, hat sie noch nicht gelesen." },
    { nummer: 2, punkte: 2, einwand: "Wer sie aushängt, hat sie noch nicht gelesen." },
    { nummer: 3, punkte: 3, einwand: "" },
    { nummer: 4, punkte: 1, einwand: "" },
    { nummer: 5, punkte: 5, einwand: "" },
    { nummer: 6, punkte: 4, einwand: "" },
    { nummer: 7, punkte: 2, einwand: "" },
    { nummer: 8, punkte: 3, einwand: "" }
  ] },
  "bewertung:mitingenieur": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "" },
    { nummer: 2, punkte: 5, einwand: "" },
    { nummer: 3, punkte: 2, einwand: "" },
    { nummer: 4, punkte: 3, einwand: "" },
    { nummer: 5, punkte: 1, einwand: "Klingt gut, ist aber ohne echten Fall nicht zu bauen." },
    { nummer: 6, punkte: 4, einwand: "" },
    { nummer: 7, punkte: 2, einwand: "" },
    { nummer: 8, punkte: 3, einwand: "" }
  ] },
  "bewertung:gestalterin": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "Eine Karte, die man aushängt, muss man aus drei Metern lesen können." },
    { nummer: 2, punkte: 2, einwand: "" },
    { nummer: 3, punkte: 3, einwand: "" },
    { nummer: 4, punkte: 1, einwand: "" },
    { nummer: 5, punkte: 4, einwand: "" },
    { nummer: 6, punkte: 5, einwand: "" },
    { nummer: 7, punkte: 2, einwand: "" },
    { nummer: 8, punkte: 3, einwand: "" }
  ] },
  "bewertung:nutzer": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "" },
    { nummer: 2, punkte: 2, einwand: "" },
    { nummer: 3, punkte: 3, einwand: "Ich würde sie beim dritten Mal nicht mehr aufmachen." },
    { nummer: 4, punkte: 1, einwand: "" },
    { nummer: 5, punkte: 4, einwand: "" },
    { nummer: 6, punkte: 2, einwand: "Hilft mir beim Benutzen nicht." },
    { nummer: 7, punkte: 5, einwand: "" },
    { nummer: 8, punkte: 3, einwand: "" }
  ] },
  "bewertung:beobachter": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "" },
    { nummer: 2, punkte: 2, einwand: "" },
    { nummer: 3, punkte: 3, einwand: "" },
    { nummer: 4, punkte: 1, einwand: "" },
    { nummer: 5, punkte: 4, einwand: "" },
    { nummer: 6, punkte: 2, einwand: "" },
    { nummer: 7, punkte: 3, einwand: "" },
    { nummer: 8, punkte: 5, einwand: "" }
  ] },

  konferenzschluss: {
    ziel: "Eine Merkkarte zum Aushängen, die einem Betrieb in wenigen Regeln sagt, worauf " +
      "beim Einsatz von KI im Arbeitsalltag zu achten ist. Jede Regel mit einem Satz " +
      "Begründung, damit sie nicht nur befolgt, sondern verstanden wird.",
    pruefmerkmal: "Erfüllt, wenn die Karte höchstens eine Seite lang ist, mindestens fünf " +
      "konkrete Regeln nennt und jede Regel einen Satz Begründung hat.",
    begruendung: "Der Vorschlag hat die meisten Fremdstimmen bekommen und ist der einzige, " +
      "der jemandem außerhalb der Werkstatt nützt. Veras Einwand wird mitgenommen: das " +
      "Prüfmerkmal trägt jetzt eine Zahl.",
    verworfen: [
      "Bau-Checkliste — nützt nur uns selbst, kommt wieder, wenn das Netz größer ist.",
      "Übergabe-Vorlage — der Beobachter schreibt sie sich sowieso jede Schicht neu.",
    ],
    // Leer, und das ist die richtige Antwort: die Trockenschicht laeuft mit
    // leeren Merklisten, es LIEGT kein Haenger vor. Stuende hier einer, uebte
    // das Beispiel das Erfinden ein — genau das, was das Feld verhindern soll.
    haenger: "",
  },

  ingenieur: {
    titel: "Merkkarte KI im Arbeitsalltag",
    art: "markdown",
    beschreibung:
      "Eine Karte zum Aushängen, die einem Betrieb in wenigen Regeln sagt, worauf beim " +
      "Einsatz von KI zu achten ist. Kein Rechtstext, sondern etwas, das jemand am " +
      "Arbeitsplatz nachliest, bevor er etwas in ein KI-Feld tippt.",
    fuerWen: "Betriebe, die KI einsetzen und ihre Leute nicht schulen können — " +
      "nicht die Werkstatt selbst.",
    pruefmerkmal:
      "Erfüllt, wenn die Karte höchstens eine Seite lang ist, mindestens fünf konkrete " +
      "Regeln nennt und jede Regel einen Satz Begründung hat.",
  },

  bauer: [
    { // Runde 1 — zu wenig, absichtlich
      dateiname: "merkkarte-ki.md",
      inhalt: "# KI im Arbeitsalltag\n\n" +
        "1. Nur freigegebene Dienste benutzen.\n" +
        "2. Keine Passwörter eingeben.\n" +
        "3. Ergebnisse prüfen.\n",
      offen: ["Begründungen fehlen noch", "nur drei Regeln"],
      weitergabe: "Vera muss gegen ein Prüfmerkmal messen, das fünf Regeln verlangt — " +
        "ich liefere drei. Sie kann das Urteil in einem Blick fällen, aber sie muss " +
        "mir sagen, welche zwei Themen noch fehlen, sonst rate ich in Runde 2.",
    },
    { // Runde 2 — nachgebessert
      dateiname: "merkkarte-ki.md",
      inhalt: "# KI im Arbeitsalltag\n\n" +
        "**1. Nur freigegebene Dienste benutzen.**\n" +
        "Was der Betrieb geprüft hat, ist bekannt — bei allem anderen weiß niemand, wohin die Eingaben gehen.\n\n" +
        "**2. Keine Passwörter, Zugangsdaten oder Kundendaten eingeben.**\n" +
        "Eine Eingabe lässt sich nicht zurückholen, auch nicht durch Löschen des Verlaufs.\n\n" +
        "**3. Wichtige Ergebnisse gegenprüfen.**\n" +
        "KI schreibt Falsches genauso überzeugend wie Richtiges; man sieht es dem Text nicht an.\n\n" +
        "**4. Bei Entscheidungen über Menschen nie allein auf KI stützen.**\n" +
        "Einstellung, Kündigung, Bonität — hier haftet der Betrieb, nicht das Werkzeug.\n\n" +
        "**5. Fremde Inhalte nicht ungeprüft übernehmen.**\n" +
        "Bilder und Texte können Rechte Dritter berühren, auch wenn eine KI sie erzeugt hat.\n\n" +
        "**6. Auffälligkeiten melden.**\n" +
        "Ein gemeldeter Fehler ist ein Vorfall, ein verschwiegener wird irgendwann ein Schaden.\n",
      offen: [],
      weitergabe: "Klaus hängt das aus. Regel 4 nennt Bonität und Kündigung — wenn sein " +
        "Betrieb solche Entscheidungen gar nicht trifft, steht dort ein Punkt zu viel und " +
        "die Karte wirkt fremd. Das sollte er zuerst ansehen.",
    },
  ],

  arzt: [
    { urteil: "nachbessern",
      begruendung: "Das Prüfmerkmal verlangt mindestens fünf Regeln mit je einer Begründung; " +
        "die Karte hat drei Regeln und keine einzige Begründung.",
      fehlende: ["mindestens zwei weitere Regeln", "je ein Satz Begründung"],
      weitergabe: "Emil geht zuerst an die Begründungen — die fehlen bei ALLEN drei " +
        "Regeln, das ist der größere Brocken. Die zwei zusätzlichen Regeln sind danach " +
        "schnell dazugeschrieben." },
    { urteil: "taugt",
      begruendung: "Sechs Regeln, jede mit einem Satz Begründung, zusammen unter einer Seite — " +
        "damit ist jeder Punkt des Prüfmerkmals belegt.",
      fehlende: [],
      weitergabe: "Klaus liest sie als Erstes auf den Ton hin. Sie ist knapp und " +
        "anweisend geschrieben; in einem kleinen Betrieb kann das schroff wirken." },
  ],

  negativbauer: [
    { befunde: [
        { was: "Regel 2 verbietet Passwörter, sagt aber nichts zu Kundendaten.",
          fall: "Jemand fügt eine Kundenliste in ein KI-Feld ein, um sie sortieren zu lassen — " +
                "nach dem Wortlaut der Karte ist das erlaubt.",
          schwere: "hoch" },
        { was: "„Ergebnisse prüfen“ sagt nicht, woran.",
          fall: "Ein Mitarbeiter liest den Text zweimal, findet ihn schlüssig und hält ihn " +
                "damit für geprüft.",
          schwere: "mittel" } ]
      },
    { befunde: [] },
  ],

  /* EINMAL je Schicht — Ben sieht den Vorschlag an, nicht die Runde. Deshalb
     KEINE Liste wie bei Bauer und Arzt, sondern eine Antwort. */
  mitingenieur: {
    ausBauSicht: [
      "Sechs Regeln mit je einem Satz Begründung sind sechs Entscheidungen, nicht eine — " +
      "die Begründungen kosten mehr Arbeit als die Regeln.",
      "„Höchstens eine Seite\" heißt beim Schreiben: dreimal kürzen.",
    ],
    ausEntwurfsSicht: [
      "Nicht entschieden, ob die Karte für den Betrieb oder für einen einzelnen " +
      "Mitarbeiter geschrieben ist — der Ton hängt daran.",
    ],
    pruefmerkmalTraegt: true,
    schaerfung: "Sag dazu, für wen die Karte hängt: Betrieb oder Einzelner. Danach " +
      "richtet sich, ob sie anweist oder erklärt.",
  },

  /* Je Runde eine Antwort, wie bei Arzt und Negativbauer. Die erste Runde
     findet etwas, die zweite ist zufrieden — sonst zeigte der Trockenlauf
     eine Schicht, die nie fertig wird. */
  gestalterin: [
    { konnteNachsehen: false,
      befunde: [
        { stelle: "Überschrift der Karte",
          was: "Sie nennt das Thema, nicht den Nutzen.",
          wirkung: "Wer sie im Vorbeigehen sieht, weiß nicht, ob sie ihn angeht." },
        { stelle: "Reihenfolge der Regeln",
          was: "Die wichtigste steht an vierter Stelle.",
          wirkung: "Wer nur den Anfang liest, liest das Falsche zuerst." },
      ],
      vergleiche: [],
      urteil: "Die Gestaltung trägt, sobald die Reihenfolge stimmt — im Weg steht sie nicht." },
    { konnteNachsehen: false, befunde: [], vergleiche: [],
      urteil: "Reihenfolge und Überschrift sitzen jetzt; nichts mehr im Weg." },
  ],

  nutzer: [
    { ablauf: "Ich wollte wissen, ob ich eine Kundenliste in ein KI-Feld einfügen darf. " +
        "Ich habe die Karte von oben gelesen und bei Regel 2 aufgehört, weil sie von " +
        "Passwörtern spricht.",
      haengengeblieben: [
        { wollte: "Wissen, ob Kundendaten erlaubt sind.",
          versucht: "Regel 2 gelesen, dann die Überschriften überflogen.",
          passierte: "Kundendaten kommen nicht vor. Ich hätte sie eingefügt." },
      ],
      durchgekommen: false },
    { ablauf: "Dieselbe Frage noch einmal. Regel 3 nennt Kundendaten jetzt ausdrücklich, " +
        "ich war nach zwei Sätzen fertig.",
      haengengeblieben: [],
      durchgekommen: true },
  ],

  beobachter: {
    stand: "Die Merkkarte ist in zwei Runden entstanden. Der erste Entwurf hatte drei Regeln " +
      "ohne Begründung und fiel beim Arzt durch; der Negativbauer fand dazu eine Lücke, die " +
      "wirklich zählt — Kundendaten waren nicht genannt. Der zweite Entwurf hat sechs Regeln " +
      "mit Begründung und beide Prüfer zufriedengestellt.",
    erreicht: ["merkkarte-ki.md mit sechs begründeten Regeln", "Kundendaten-Lücke geschlossen"],
    offen: ["Klaus hat die Karte noch nicht gelesen", "keine Druckfassung"],
    naechsterSchritt: "Klaus die Karte zeigen und fragen, ob der Ton für seinen Betrieb passt.",
  },
};
