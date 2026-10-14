/*
 * Kim Hub Company — Voller-Knoten-Init: Widget (17) → Membran (15) → Siegel (16),
 * dazu Apoptose (07).
 *
 * ⚠ DIE ANKER KOMMEN AUS DER SEITE, NICHT AUS MODUL 17 (Klaus 2026-09-09).
 * Sages LEHREN § 4 nennt als dritte Falle: `SbkimWidget.init()` legt
 * `#lamp-fremd` und `#sbkim-siegel-badge` an, also muss es VOR Membran und
 * Siegel laufen. Die Falle greift hier nicht mehr — diese Seite bringt ihre
 * Lampen-Leiste selbst mit (`.lamps` in der Kopfzeile), genau wie PWA
 * Toolpoints Marktplatz. Modul 17 wird deshalb gar nicht geladen.
 *
 * Der Umweg davor war, 17s VERSTECKTEN Proxy-Kasten sichtbar zu machen, um
 * sein schwebendes Fenster zu behalten. Klaus dazu: „das Siegel ist jetzt
 * völlig verworren … Das Design ist so gestaltet, dass es überall passt."
 * Das Wappen hing hinter dem Schliessen-Kreuz. Zwei Anker mit derselben
 * Kennung waeren ausserdem doppelte IDs.
 *
 * `badgeSelector: ".lamps"` ist die VORGABE von Modul 16: es zeigt auf einen
 * CONTAINER, in den das Wappen gehaengt wird — nicht auf das Wappen selbst.
 *
 * Das Siegel stellt sich SELBST aus (Bronze), sobald die acht Pflicht-Module
 * geladen sind (01/02/03/04/05/05b/07/15 — 05b kam am 2026-08-16 dazu, weil
 * ein Siegel golden leuchten konnte, während der Raum tot war). Gold wird es
 * nach dem ersten Handshake „established". Beides ohne Zutun.
 *
 * `ribbonText` ist PFLICHT — ohne ihn bleibt das Band im Wappen leer. Modul 16
 * leitet bewusst nichts aus dem Repo-Namen ab: auf eine Auszeichnung gehört
 * kein geratener Name.
 *
 * Fail-soft: fehlt ein Modul, wird der Schritt übersprungen und die App bleibt
 * vollständig bedienbar.
 */
(function () {
  "use strict";

  /* Wer per postMessage mit diesem Knoten reden darf. Alles andere weist
     Modul 15 ab und meldet es an der FREMD-Lampe.
     ⚠ `github.io` ist eine GETEILTE Adresse — hier stehen rund zwanzig Apps.
     Diese Liste trennt also NICHT die Geschwister-Apps voneinander; das tut
     der DB-Suffix. Sie hält Fremde von außerhalb dieser Adresse ab, und mehr
     verspricht sie nicht. */
  var ALLOWED_ORIGINS = ["https://lausiklauskn-png.github.io"];
  var REPO_URL = "https://github.com/lausiklauskn-png/kim-hub-company";

  /* Die Lampen zeigen ECHTE Ereignisse, nie einen geschaetzten Zustand: wo
     nichts passiert, leuchtet nichts. Uebernommen aus PWA Toolpoints
     `assets/sbkim-init.js` — dieselben Ereignis-Namen, dieselben Klassen. */
  function lampe(id, klasse) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("on", "warn", "bad");
    if (klasse) el.classList.add(klasse);
  }
  function pulsSetzen(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("traffic-pulse");
    setTimeout(function () { el.classList.remove("traffic-pulse"); }, 950);
  }
  function lampenVerdrahten() {
    window.addEventListener("sbkim:alive", function () { lampe("lamp-alive", "on"); });
    window.addEventListener("sbkim:nostr-listening", function (e) {
      lampe("lamp-traffic", (e && e.detail && e.detail.active) ? "on" : null);
    });
    window.addEventListener("sbkim:handshake",   function () { pulsSetzen("lamp-traffic"); });
    window.addEventListener("sbkim:postmessage", function () { pulsSetzen("lamp-traffic"); });
    window.addEventListener("sbkim:fremd-alert", function () { lampe("lamp-fremd", "bad"); });
  }

  /* Bau 04.J (Sage #1082, 2026-10-14): Modul 04 prüft vor dem KI-Richter die
     Suchfrage und jede fremde Antwort mit der Prüfliste (window.PrueferMail,
     byte-1:1 aus dem Auslieferungsprüfer). Fehlt sie, läuft der Richter nicht.
     ⚠ Die Kette in index.html kommt aus Kimhub (company-schale-bauen.mjs) und
     wird HIER nicht angefasst — deshalb holt dieser Klebstoff die Liste nach.
     04 fragt sie erst beim Richten ab, nicht beim Laden. */
  function prueflisteLaden() {
    if (window.PrueferMail || document.querySelector('script[data-pruefliste]')) return;
    var s = document.createElement("script");
    s.src = "./sbkim/pruefer-mail.js";
    s.setAttribute("data-pruefliste", "");
    s.onerror = function () { if (window.console && console.warn) console.warn("[Company] Prüfliste nicht geladen — der KI-Richter läuft ohne sie nicht."); };
    (document.head || document.documentElement).appendChild(s);
  }
  prueflisteLaden();

  function boot() {
    lampenVerdrahten();
    var widgetFertig = Promise.resolve();
    widgetFertig.then(function () {
      if (window.SbkimMembrane && typeof window.SbkimMembrane.init === "function") {
        try { window.SbkimMembrane.init({ allowedOrigins: ALLOWED_ORIGINS,
               lampSelector: "#lamp-fremd" }); }
        catch (e) { if (window.console && console.warn) console.warn("[Company] Membran übersprungen:", e); }
      }
      if (window.SbkimSiegel && typeof window.SbkimSiegel.init === "function") {
        try {
          window.SbkimSiegel.init({
            badgeSelector: ".lamps",
            repoUrl: REPO_URL,
            ribbonText: "KIM HUB COMPANY",
          });
        } catch (e) { if (window.console && console.warn) console.warn("[Company] Siegel übersprungen:", e); }
      }
    });

    if (window.SbkimApoptose && typeof window.SbkimApoptose.init === "function") {
      try { Promise.resolve(window.SbkimApoptose.init()).catch(function () {}); }
      catch (e) { if (window.console && console.warn) console.warn("[Company] Apoptose übersprungen:", e); }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
