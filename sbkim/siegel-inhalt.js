/*
 * Siegel-Inhalt — DIE IDENTITÄT DIESES KNOTENS, und sonst nichts.
 *
 * ⚠ HIER STEHT KEIN KANON. Der Andock-Wizard, alle Anzeigetexte und alle
 * Prüfungen liegen seit A18 (2026-09-14) in EINER netzweit byte-gleichen
 * Datei — `sbkim/sbkim-andock-wizard.js`, Kanon `Sage-Protokol/src/modules/16b_andock_wizard.js`.
 * Diese Datei trägt nur noch, was in jedem Knoten ANDERS sein muss.
 *
 * Warum die Trennung: gemessen über die 20 Kopien im Netz standen am 2026-09-14
 * ZWÖLF verschiedene Code-Fassungen desselben Werkzeugs. Jede Verbesserung
 * kostete Handarbeit mal zwanzig und unterblieb deshalb meistens.
 *
 * ⚠ UND DIESE DATEI WIRD NIE VERTEILT. Sie trägt die BEDEUTUNG des Knotens; ein
 * Überschreiben gäbe dieser App den Namen und den Vektor einer fremden — der
 * Schaden vom 2026-08-16 in Alis Moderaum.
 *
 * Vertrag: Sage-Protokol/docs/INTERFACES.md §11.9.
 */
(function () {
  "use strict";
  window.SBKIM_SIEGEL_WIZ = {
    domain: "Werkstatt/KI-Rollen/Auftrag",
    endpoint: "https://lausiklauskn-png.github.io/kim-hub-company/",
    nodeType: "hybrid",
    nodeName: "Kim Hub Company",
    /* ⚠ WORTGLEICH MIT sbkim/rendezvous-init.js. Zwei Beschreibungen ergeben zwei
       Vektoren fuer denselben Knoten — je nachdem, ueber welchen Weg die Spore
       entstand. Ein Waechter in tests/smoke_knoten.mjs vergleicht beide Stellen. */
    domainDescription: "Kim Hub Company ist eine Werkstatt für brauchbare Werkzeuge. ZWECK: aus einer Idee in eigenen Worten in einem Durchgang einen ausgearbeiteten Auftrag, ein geprüftes Werkstück und ein Übergabe-Blatt zu machen — einen Auftrag in Worten, den man an ein großes Sprachmodell weiterreichen kann. Damit auch jemand, der nicht programmiert, am Ende ein Werkzeug in der Hand hält, das er wirklich benutzen kann, statt einer Antwort, mit der er nichts anfangen kann. FORSCHUNG: Kim Hub Company ist ein Endknoten im SBKIM-Mycel und Bestandteil der Sage-Forschung am SBKIM-Protokoll — Semantisches Bidirektionales KI-Matching. Untersucht wird, ob agentenbasiertes Matching brauchbare Werkzeuge hervorbringt: Knoten, die einander über Bedeutungs-Vektoren finden statt über Stichwörter, und Rollen, die einen Auftrag gemeinsam bearbeiten statt eines einzelnen Modells. Untersucht wird ebenso, wie Regeln und Grundsätze eine Arbeit steuern — die Arbeitsweise selbst ist der Gegenstand. Jede Schicht wird gemessen und dokumentiert, auch die misslungene; die Messungen sind offen einsehbar. Semantisch verbunden mit Kimhub (der Werkstatt, in der diese App gebaut und geprüft wird), Sage-Protokol (Hub und Bibliothek des Protokolls), SB-KIMTool-Point (Werkzeugkiste), Kimseek (Bedeutungs-Suche), Kimboard (semantische Pinnwand), BookLedgerPro (Buchhaltung, Angebot, Rechnung), Mein WorkFloh (Auftragsabwicklung) und dem offenen Marktplatz PWA Toolpoint. WIE ES ARBEITET: acht benannte Rollen arbeiten nacheinander an einem Auftrag. Eine schlägt vor, was gebaut wird. Eine schärft den Vorschlag mit Bau- und Entwurfserfahrung. Eine baut es. Eine prüft gegen ein vorher genanntes Merkmal. Eine sucht, was daran kaputtgeht. Eine sieht auf Gestaltung und Bedienung. Eine benutzt es wie jemand, der es täglich benutzt. Eine schreibt auf, wo es steht. Das Ganze läuft im Browser auf dem eigenen KI-Zugang des Nutzers; der Schlüssel bleibt verschlüsselt auf dem Gerät und wird an niemanden weitergegeben. Ein Trockenlauf zeigt den vollständigen Ablauf ohne Schlüssel und ohne Kosten. Jede Fahrt hat einen Geldeckel, eine Uhr und einen Notaus, und jede trägt sich in ein Fahrtenbuch ein — auch die abgebrochene, denn was bis dahin hinausging, ist bezahlt. Kim Hub Company ist dabei nicht auf ein Fach festgelegt: was die acht Rollen ausarbeiten, kann eine App, ein Text, ein Plan oder eine Entscheidung sein. Ein Baukasten wie die Schwester-Knoten — Rollen umbenennen, Grundsätze anpassen, einen eigenen Auftrag laden. Server-los, offline im Browser, ohne Anmeldung, mit eigenem SBKIM-Siegel und eigener Identität im Knotennetz.",
    domainKeywords: [
      "Werkstatt",
      "Auftrag",
      "Werkzeug bauen",
      "brauchbares Werkzeug",
      "acht Rollen",
      "Rollen-Kette",
      "Agenten",
      "agentenbasiertes Matching",
      "SBKIM",
      "SBKIM-Protokoll",
      "Semantisches Bidirektionales KI-Matching",
      "Sage-Protokoll",
      "Mycel",
      "Knotennetz",
      "Endknoten",
      "Bedeutungs-Vektor",
      "semantische Suche",
      "Forschung",
      "Messung",
      "Prüfmerkmal",
      "Gegenprobe",
      "Übergabe-Blatt",
      "Prompt für ein großes Modell",
      "KI-Zugang",
      "BYOK",
      "eigener Schlüssel",
      "Trockenlauf",
      "Geldeckel",
      "Notaus",
      "Fahrtenbuch",
      "Kostenkontrolle",
      "offline",
      "server-los",
      "ohne Anmeldung",
      "Siegel",
      "Kim Hub Company",
    ],
    stammCategories: ["Auftrag", "Uebergabe-Blatt", "Fahrtenbuch"],
    guestCategories: ["Rollen-Befund", "Gegenpruefung", "Messung"],
    backupPrefix: "kim-hub-company-backup",   // Dateiname-Praefix des verschluesselten Backups
  };
})();
