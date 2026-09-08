/*
 * Kim Hub Company — Rendezvous-Init (Modul 23, „🌐 Mit dem Netz verbinden").
 *
 * Der app-eigene Klebstoff zwischen dieser App und dem Netz-Fenster. Er trägt
 * drei Dinge, die es nur einmal geben darf: den Namen des Knotens, die
 * BEDEUTUNGS-BESCHREIBUNG und die Stichworte.
 *
 * ⚠ DIE BESCHREIBUNG IST KEINE ZIERDE. Modul 03 rechnet daraus den
 * Domänen-Vektor, Modul 04 vergleicht damit. Ein Satz oder ein leeres Feld
 * ergibt einen Knoten, der zu allem und zu nichts passt — und der findet dann
 * die falschen Nachbarn, ohne dass es jemandem auffällt. Der Text unten ist
 * vorausgefüllt (Klaus 2026-09-08) und stammt aus dem, was diese App wirklich
 * tut, nicht aus einer Vorstellung davon. Wer ihn ändert, ändert die Bedeutung
 * dieses Knotens im Netz; das ist erlaubt und gehört dann begründet.
 *
 * ⚠ UND DIE SPORE ENTSTEHT IM BROWSER, NICHT IM DEPOT. Aus diesem Text
 * rechnet Modul 03 den Vektor, wenn der Nutzer im Verbinden-Fenster seine
 * Identität erzeugt; der private Schlüssel bleibt dabei auf dem Gerät. Im
 * Depot liegt deshalb KEINE `spore.json` — eine Datei, die aussieht wie eine
 * Identität, wäre schlimmer als keine.
 *
 * VERFASSUNGSTREU: `init()` mountet nur, es ruft nichts ins Netz. Angemeldet
 * und gesucht wird auf ausdrücklichen Klick.
 */
(function () {
  "use strict";

  var DB_SUFFIX = "kimhubcompany";   // == sbkim/storage-init.js == <head>

  var CFG = {
    nodeName: "Kim Hub Company",
    domain: "Werkstatt/KI-Rollen/Auftrag",
    endpoint: "https://lausiklauskn-png.github.io/kim-hub-company/",
    nodeType: "hybrid",
    domainDescription:
      "Acht benannte Rollen arbeiten nacheinander an einem Auftrag: eine schlägt vor, " +
      "was gebaut wird, eine schärft den Vorschlag mit Bau- und Entwurfserfahrung, eine " +
      "baut es, eine prüft gegen ein vorher genanntes Merkmal, eine sucht was daran " +
      "kaputtgeht, eine sieht auf Gestaltung und Bedienung, eine benutzt es wie jemand " +
      "der es täglich benutzt, eine schreibt auf wo es steht. Das Ganze läuft im " +
      "Browser auf dem eigenen KI-Zugang des Nutzers; der Schlüssel bleibt " +
      "verschlüsselt auf dem Gerät und wird an niemanden weitergegeben. Ein Trockenlauf " +
      "zeigt den vollständigen Ablauf ohne Schlüssel und ohne Kosten. Jede Fahrt hat " +
      "einen Geldeckel, eine Uhr und einen Notaus, und jede trägt sich in ein " +
      "Fahrtenbuch ein — auch die abgebrochene, denn was bis dahin hinausging, ist " +
      "bezahlt. Am Ende steht ein Übergabe-Blatt: ein Auftrag in Worten, den man an ein " +
      "großes Modell weitergeben kann.",
    domainKeywords: [
      "Auftrag ausarbeiten", "mehrere Blickwinkel", "bauen lassen", "gegenprüfen lassen",
      "KI-Team", "Agenten", "Rollen", "eigener KI-Zugang", "BYOK", "Trockenlauf",
      "Kostendeckel", "Notaus", "Fahrtenbuch", "Übergabe-Blatt",
      "Werkzeug für Entwickler", "im Browser, ohne Server"
    ],
  };

  /* ---- Gerätename ---------------------------------------------------------
     Netzweite Bauregel (INTERFACES § 11.7): das Feld gehört INS Verbinden-Panel
     und wird vom app-eigenen Klebstoff hineingehängt — NIE in die byte-kopierte
     Panel-Datei, sonst schlägt der Drift-Guard zu Recht an.

     Der Name hängt NUR an Anzeige und Anmeldung, NICHT an der signierten Spore:
     kein Re-Sign, kein Protokoll-Bump. Er ist selbst gewählt und damit ein
     Hinweis, kein Vertrauens-Beweis — deshalb steht im Raum immer die Kennung
     daneben. */
  function geraetename() {
    try { return (localStorage.getItem("sbkim_geraetename") || "").trim().slice(0, 40); }
    catch (_e) { return ""; }
  }
  function anzeigeName() { var g = geraetename(); return g ? (CFG.nodeName + " · " + g) : CFG.nodeName; }
  /* Eine App darf mehrere Namensfelder haben; sie schreiben denselben Speicher
     und dürfen beim Tippen nicht auseinanderlaufen. Programmatisches Setzen
     von .value löst kein "input" aus — also keine Schleife. */
  function felderAbgleichen() {
    try {
      var wert = geraetename();
      var liste = document.querySelectorAll("[data-sbkim-geraetename]");
      for (var i = 0; i < liste.length; i++) { if (liste[i].value !== wert) liste[i].value = wert; }
    } catch (_e) {}
  }
  function feldEinhaengen() {
    function versuch() {
      var panel = document.getElementById("sbkim-rdv-panel");
      if (!panel) return false;
      /* Erkennungs-Marke statt fester id, und bewusst NUR im Panel gesucht: ein
         app-eigenes Feld an anderer Stelle bleibt erlaubt (es zieht per
         felderAbgleichen mit), aber im Panel steht nie ein zweites. */
      if (panel.querySelector("[data-sbkim-geraetename]")) return true;
      var zeile = document.createElement("div");
      zeile.style.cssText = "margin:8px 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap";
      var beschriftung = document.createElement("label");
      beschriftung.setAttribute("for", "sbkim-geraetename");
      beschriftung.textContent = "🏷️ Gerätename:";
      beschriftung.style.cssText = "color:#9aa7b6;font-size:.85rem";
      var feld = document.createElement("input");
      feld.id = "sbkim-geraetename"; feld.type = "text"; feld.maxLength = 40;
      feld.setAttribute("data-sbkim-geraetename", "1");
      feld.placeholder = "z. B. Klaus-Handy (frei wählbar)";
      feld.value = geraetename();
      feld.title = "Nur ein Anzeige-Hinweis, kein Vertrauens-Beweis — die Kennung steht daneben.";
      feld.style.cssText = "flex:1;min-width:120px;padding:4px 6px;border-radius:6px;border:1px solid #33414f;background:#0d1520;color:#dfeaf2;font:inherit";
      feld.addEventListener("input", function () {
        try { localStorage.setItem("sbkim_geraetename", String(feld.value || "").trim().slice(0, 40)); } catch (_e) {}
        try { window.dispatchEvent(new CustomEvent("sbkim:geraetename-changed")); } catch (_e) {}
      });
      zeile.appendChild(beschriftung); zeile.appendChild(feld);
      panel.insertBefore(zeile, panel.children[1] || null);
      return true;
    }
    if (versuch()) return;
    try {
      var beobachter = new MutationObserver(function () { if (versuch()) beobachter.disconnect(); });
      beobachter.observe(document.body, { childList: true, subtree: true });
    } catch (_e) {}
  }

  /* ---- Identität + Spore auf ausdrücklichen Wunsch -------------------------
     Das Sprach-Modell wiegt einmalig rund 30 MB. Ohne Prozent-Anzeige sieht
     das am Tablet aus wie „hängt", und wer zumacht, bricht mittendrin ab
     (Klaus 2026-07-08, netzweite Pflicht). */
  function identitaetErzeugen() {
    if (!window.SbkimEmbedding || !window.SbkimSpore) {
      return Promise.reject(new Error("Module 02/03 (Spore/Embedding) nicht geladen."));
    }
    function sag(text) {
      if (window.console && console.info) console.info("[Company] " + text);
      try {
        var aus = document.getElementById("sbkim-rdv-out");
        if (aus) aus.textContent += "\n  … " + text;
      } catch (_e) {}
    }
    function balkenEl() {
      var aus = document.getElementById("sbkim-rdv-out");
      if (!aus || !aus.parentNode) return null;
      var el = document.getElementById("company-modell-fortschritt");
      if (!el) {
        el = document.createElement("div");
        el.id = "company-modell-fortschritt";
        el.style.cssText = "margin:6px 0 0;font:.74rem/1.4 monospace;color:#6ee7d3;white-space:pre-wrap";
        aus.parentNode.insertBefore(el, aus.nextSibling);
      }
      return el;
    }
    var aufFortschritt = function (ev) {
      var d = ev && ev.detail; if (!d) return;
      var el = balkenEl(); if (!el) return;
      if (typeof d.progress === "number" && isFinite(d.progress)) {
        var pct = Math.max(0, Math.min(100, Math.round(d.progress)));
        var voll = Math.round(pct / 5);
        el.textContent = "Modell laedt  " + "█".repeat(voll) + "░".repeat(20 - voll) +
          "  " + pct + " %   (" + (d.file ? String(d.file).split("/").pop() : "Modell") + ", ~30 MB einmalig)";
      } else if (d.status === "done" || d.status === "ready") {
        el.textContent = "Modell geladen ✓";
      }
    };
    function fortschrittAus() { try { window.removeEventListener("sbkim:embedding-progress", aufFortschritt); } catch (_e) {} }
    try { window.addEventListener("sbkim:embedding-progress", aufFortschritt); } catch (_e) {}

    sag("Sprach-Modell wird geladen (einmalig, ~30 MB — am Tablet 1–2 Minuten)…");
    return window.SbkimEmbedding.init()
      .then(function () {
        sag("Modell geladen, berechne Bedeutungs-Vektor…");
        return window.SbkimEmbedding.embedPassage(CFG.domainDescription + ". " + CFG.domainKeywords.join(", "));
      })
      .then(function (vek) {
        sag("erzeuge deine Identität + Visitenkarte (Spore)…");
        /* Der Gerätename geht hier bewusst NICHT hinein — die Spore bleibt
           kanonisch, sonst wäre jede Namensänderung ein Re-Sign. */
        return window.SbkimSpore.generateOwnSpore({
          domain: CFG.domain,
          endpoint: CFG.endpoint,
          nodeType: CFG.nodeType,
          nodeName: CFG.nodeName,
          domainDescription: CFG.domainDescription,
          domainKeywords: CFG.domainKeywords,
          domainVector: Array.from(vek),
        });
      })
      .then(function (spore) { fortschrittAus(); sag("Identität fertig — melde dich jetzt im Raum an…"); return spore; })
      .catch(function (e) {
        fortschrittAus();
        sag("✗ Identitäts-Erzeugung fehlgeschlagen: " + (e && e.message ? e.message : e));
        throw e;
      });
  }

  function mounten() {
    if (window.SbkimRendezvous && typeof window.SbkimRendezvous.init === "function") {
      try {
        window.SbkimRendezvous.init({
          nodeName: anzeigeName(),
          dbSuffix: DB_SUFFIX,
          createIdentity: identitaetErzeugen,
          /* `ensureIdentity` ABSICHTLICH NICHT (netzweite Stufe 0b, 2026-07-30):
             es legte beim Seiten-Start WORTLOS eine neue Kennung an, wenn die
             Schublade leer war. Aus einem Speicher-Problem wurde so unbemerkt
             ein Identitäts-Wechsel. Die Kennung entsteht nur noch auf
             ausdrückliche Entscheidung im Panel. */
        });
      } catch (e) { if (window.console && console.warn) console.warn("[Company] Rendezvous-Init übersprungen:", e); }
    }
    if (!window.SbkimRendezvousUI) {
      if (window.console && console.warn) console.warn("[Company] SbkimRendezvousUI fehlt — sbkim/23_rendezvous_ui.js nicht geladen?");
      return;
    }
    try {
      window.SbkimRendezvousUI.init({
        nodeName: anzeigeName(),
        dbSuffix: DB_SUFFIX,
        corner: "bl",
        createIdentity: identitaetErzeugen,
      });
      feldEinhaengen();
      window.addEventListener("sbkim:geraetename-changed", function () {
        felderAbgleichen();
        try {
          if (window.SbkimRendezvous && window.SbkimRendezvous.configure) {
            window.SbkimRendezvous.configure({ nodeName: anzeigeName() });
          }
        } catch (_e) {}
      });
    } catch (e) { if (window.console && console.warn) console.warn("[Company] Rendezvous-UI übersprungen:", e); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mounten);
  else mounten();
})();
