/*
 * Kim Hub Company — Lauschen am Relais (Empfangsmodus mit Antwortrecht).
 *
 * Der Knoten lauscht auf eingehende Handshakes und ANTWORTET nur. Er
 * initiiert nie von sich aus: kein Crawler, keine Pulsation, keine
 * Eigenanfrage ins offene Netz. Das aktive Anmelden im Raum bleibt dem
 * Nutzer-Knopf im Verbinden-Fenster vorbehalten (Modul 23).
 *
 * ⚠ DAS IST NICHT DER KI-AUFRUF. Eine Schicht geht an die KI-Adresse, die
 * der Nutzer eingestellt hat, und kostet sein Geld. Das Lauschen hier geht
 * an ein Nostr-Relais, kostet nichts und hat mit der Schicht nichts zu tun.
 * Zwei Wege nach draußen, zwei Gründe — wer sie verwechselt, sucht die
 * Kosten an der falschen Stelle.
 *
 * Vollständig fail-soft und nicht blockierend: ohne WebCrypto/IndexedDB, ohne
 * Relais-Client (Modul 05b, ES-Modul) oder bei Netz-Fehler passiert schlicht
 * nichts — die App bleibt vollständig bedienbar.
 */
(function () {
  "use strict";

  function autoListen() {
    var A = window.SbkimAnastomose;
    if (!A || typeof A.init !== "function") return;
    Promise.resolve()
      .then(function () { return A.init(); })
      .then(function () {
        if (typeof A.listenNostr === "function" && window.SbkimNostrRelay) {
          return A.listenNostr()
            .then(function () {
              if (window.console && console.info) {
                console.info("[Company] Lauschen aktiv (Empfangsmodus mit Antwortrecht).");
              }
              try { window.dispatchEvent(new CustomEvent("sbkim:nostr-listening", { detail: { active: true } })); } catch (_e) {}
            })
            .catch(function (e) { if (window.console && console.warn) console.warn("[Company] Lauschen übersprungen:", e); });
        }
      })
      .catch(function (e) { if (window.console && console.warn) console.warn("[Company] Andock-Init übersprungen (braucht Browser):", e); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoListen);
  else autoListen();
})();
