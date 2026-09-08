/*
 * Kim Hub Company — Storage-Init (eigene Schublade, Modus A).
 *
 * Öffnet die EIGENE Schublade dieser App: `sbkim_kimhubcompany` statt der
 * geteilten Vorgabe `sbkim`. Läuft als ERSTER Storage-Aufruf, direkt nach
 * `sbkim/01_storage.js` und VOR allem, was eine Identität benutzt (Spore,
 * Anastomose, Rendezvous, Lauschen).
 *
 * ⚠ DIESE DATEI IST DER ZWEITE RIEGEL, NICHT DER ERSTE. Der erste steht im
 * `<head>` der Seite: `window.SBKIM_DB_SUFFIX = "kimhubcompany"`. Modul 01
 * liest ihn BEIM LADEN und macht daraus seinen Vorgabe-Namen; dieser Aufruf
 * hier ist asynchron und käme zu spät, wenn irgendein Modul vorher zugreift
 * (Modul 01 nennt das in seinem Kopf Fall (B)). Am 2026-08-16 hat genau das
 * Alis Moderaum die Beschreibung einer fremden App in den Wizard geschrieben.
 *
 * Warum überhaupt: rund zwanzig Apps liegen unter EINER Adresse
 * (`lausiklauskn-png.github.io`). IndexedDB gehört dem Ursprung, nicht dem
 * Pfad — ohne eigenen Suffix teilen sie sich eine Datenbank und damit eine
 * Identität. Dieselbe Regel wie `__WERKSTATT_DB` in dieser App: dort für die
 * Buchhaltung, hier für den Knoten.
 *
 * ⚠ UND ES IST NICHT DERSELBE SCHLÜSSEL WIE IM TRESOR. `schluesseltresor.js`
 * verwahrt den KI-Zugang des Nutzers; hier geht es um die Knoten-Identität.
 * Zwei Geheimnisse, zwei Aufgaben — wer sie zusammenlegt, baut die
 * Verwechslung ein, vor der Kimhubs Verfassung unter „Zwei Schlösser" warnt.
 *
 * Fail-soft: ohne Browser, ohne IndexedDB oder ohne Modul 01 passiert nichts.
 */
(function () {
  "use strict";
  var DB_SUFFIX = "kimhubcompany";
  try {
    if (window.SbkimStorage && typeof window.SbkimStorage.init === "function") {
      Promise.resolve(window.SbkimStorage.init({ dbSuffix: DB_SUFFIX })).then(
        function () {
          if (window.console && console.info) {
            console.info("[Company] Storage-Schublade: sbkim_" + DB_SUFFIX + " (eigene Identität).");
          }
        },
        function (e) { if (window.console && console.warn) console.warn("[Company] Storage-Init übersprungen:", e); }
      );
    }
  } catch (e) {
    if (window.console && console.warn) console.warn("[Company] Storage-Init fail-soft:", e);
  }
})();
