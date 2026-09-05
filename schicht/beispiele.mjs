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
    { nummer: 2, punkte: 4, einwand: "Betrifft nur uns, niemand sonst hat etwas davon." },
    { nummer: 3, punkte: 3, einwand: "" },
    { nummer: 4, punkte: 3, einwand: "" },
    { nummer: 5, punkte: 2, einwand: "Eine Vorlage für eine Vorlage." } ] },
  "bewertung:bauer": { stimmen: [
    { nummer: 1, punkte: 5, einwand: "Eine Seite ist knapp — sechs Regeln mit Begründung passen kaum." },
    { nummer: 2, punkte: 5, einwand: "" },
    { nummer: 3, punkte: 2, einwand: "" },
    { nummer: 4, punkte: 3, einwand: "" },
    { nummer: 5, punkte: 2, einwand: "" } ] },
  "bewertung:arzt": { stimmen: [
    { nummer: 1, punkte: 5, einwand: "Braucht ein Prüfmerkmal mit Zahl, sonst fällt es bei mir durch." },
    { nummer: 2, punkte: 3, einwand: "" },
    { nummer: 3, punkte: 5, einwand: "" },
    { nummer: 4, punkte: 4, einwand: "" },
    { nummer: 5, punkte: 2, einwand: "" } ] },
  "bewertung:negativbauer": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "Wer sie aushängt, hat sie noch nicht gelesen." },
    { nummer: 2, punkte: 3, einwand: "" },
    { nummer: 3, punkte: 3, einwand: "" },
    { nummer: 4, punkte: 5, einwand: "" },
    { nummer: 5, punkte: 1, einwand: "" } ] },
  "bewertung:beobachter": { stimmen: [
    { nummer: 1, punkte: 4, einwand: "" },
    { nummer: 2, punkte: 3, einwand: "" },
    { nummer: 3, punkte: 3, einwand: "" },
    { nummer: 4, punkte: 3, einwand: "" },
    { nummer: 5, punkte: 5, einwand: "" } ] },

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
          schwere: "mittel" },
      ] },
    { befunde: [] },
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
