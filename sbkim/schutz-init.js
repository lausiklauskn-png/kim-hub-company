/*
 * Kim Hub Company — Voller-Knoten-Init: Widget (17) → Membran (15) → Siegel (16),
 * dazu Apoptose (07).
 *
 * ⚠ DIE REIHENFOLGE IST PFLICHT, und sie ist die dritte der vier Fallen aus
 * Sages LEHREN § 4. `SbkimWidget.init()` legt die Anker `#lamp-fremd` und
 * `#sbkim-siegel-badge` an; Membran und Siegel hängen sich daran. Läuft das
 * Widget danach, hängen beide LAUTLOS ins Leere — die Seite sieht normal aus,
 * nur fehlen Lampe und Abzeichen, und niemand bekommt eine Fehlermeldung.
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

  function boot() {
    var widgetFertig = Promise.resolve();
    if (window.SbkimWidget && typeof window.SbkimWidget.init === "function") {
      try {
        widgetFertig = Promise.resolve(window.SbkimWidget.init({
          allowedOrigins: ALLOWED_ORIGINS,
          repoUrl: REPO_URL,
        }));
      } catch (e) { if (window.console && console.warn) console.warn("[Company] Status-Widget übersprungen:", e); }
    }

    widgetFertig.then(function () {
      if (window.SbkimMembrane && typeof window.SbkimMembrane.init === "function") {
        try { window.SbkimMembrane.init({ allowedOrigins: ALLOWED_ORIGINS }); }
        catch (e) { if (window.console && console.warn) console.warn("[Company] Membran übersprungen:", e); }
      }
      if (window.SbkimSiegel && typeof window.SbkimSiegel.init === "function") {
        try {
          window.SbkimSiegel.init({
            badgeSelector: "#sbkim-siegel-badge",
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
