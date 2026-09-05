/*
 * idb.js — DER TIEFE BROWSER-SPEICHER, AN EINER STELLE.
 *
 * ══ WARUM DAS EINE EIGENE DATEI IST ════════════════════════════════════════
 *
 * Diese Schicht stand bis zum 2026-09-05 mitten in `ansicht.js` und gehörte
 * dort der Buchhaltung. Seit die Schicht im Browser laufen soll, braucht sie
 * ein zweiter Benutzer — das Gedächtnis der Spinde. Die naheliegende Abhilfe
 * wäre eine zweite Fassung daneben gewesen, und der Brief verbietet sie
 * ausdrücklich: „Nicht neu erfinden … Nicht daneben eine zweite bauen."
 *
 * Also **gezogen, nicht kopiert** — dieselbe Bewegung wie die Form-Prüfung von
 * `schicht/schluessel.mjs` nach `schluesseltresor.js` am selben Tag. Danach
 * gibt es genau eine Fassung, und beide Benutzer gehen denselben Weg zu ihr.
 * Zwei Fassungen wären eine Drift-Quelle mit Ansage: dann räumte die eine auf,
 * was die andere für dauerhaft hält.
 *
 * Herkunft unverändert: `Mein-Rezeptbuch/QC_MeinRezb_*.html`
 * § INDEXEDDB BACKUP LAYER — `indexedDB.open(name, 1)`, ein Store `kv` mit
 * `keyPath: "k"`, dazu `navigator.storage.persist()`.
 *
 * ══ WAS SIE NICHT IST ══════════════════════════════════════════════════════
 *
 * ⚠ SIE SCHÜTZT GEGEN VERLUST, NICHT GEGEN MITLESEN. Im Rezeptbuch steht
 * keine Verschlüsselung (am 2026-08-22 nachgemessen: `crypto.subtle`,
 * `AES-GCM`, `PBKDF2` — null Treffer), und hier steht auch keine. Wer das
 * verwechselt, hält einen Datenverlust-Schutz für einen Zugriffsschutz.
 * Was verschlüsselt gehört, verschlüsselt der Aufrufer, BEVOR er `schreib`
 * ruft — so macht es `schluesseltresor.js`.
 *
 * ⚠ DER NAME IST DIE GRENZE ZUR SCHWESTER-APP. `github.io` ist eine GETEILTE
 * Adresse: eine Schwester-App mit derselben Datenbank überschriebe uns.
 * Dieselbe Regel wie der DB-Suffix in den SBKIM-Apps, nur ohne deren Modul.
 * Deshalb ist `name` ein Pflichtfeld und hat keinen Vorgabewert — ein
 * geratener Name wäre genau die Kollision, gegen die die Regel steht.
 */
(function (welt) {
  "use strict";

  var STORE = "kv";

  /* Eine Frist, damit ein blockiertes Öffnen die Seite nicht aufhängt — wie im
     Rezeptbuch. Sorte A: hier wird auf etwas gewartet, das KOMMT, also gehört
     die Frist an eine Bedingung und nicht an die Uhr. Sie ist der Notausgang,
     nicht die Messung. */
  var FRIST_MS = 3000;

  /**
   * Eine Datenbank, ein Store, vier Handgriffe.
   *
   * @param {{name:string, store?:string}} opt
   * @returns {{name:string, store:string, lies:Function, schreib:Function,
   *            loesch:Function, leeren:Function}}
   */
  function macheIdb(opt) {
    var o = opt || {};
    if (!o.name) throw new Error(
      "Die IndexedDB-Ablage braucht einen Namen. `github.io` ist eine geteilte " +
      "Adresse — ohne eigenen Namen überschreibt die nächste Schwester-App " +
      "diesen Bestand, und zwar still.");
    var name = String(o.name), store = String(o.store || STORE);
    var handle = null;

    function offen() {
      return new Promise(function (res, rej) {
        if (handle) { res(handle); return; }
        if (typeof indexedDB === "undefined") { rej(new Error("kein-idb")); return; }
        var req = indexedDB.open(name, 1);
        var t = setTimeout(function () { rej(new Error("idb-frist")); }, FRIST_MS);
        req.onerror = function () { clearTimeout(t); rej(req.error); };
        req.onblocked = function () { clearTimeout(t); rej(new Error("idb-blockiert")); };
        req.onsuccess = function () { clearTimeout(t); handle = req.result; res(handle); };
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains(store))
            d.createObjectStore(store, { keyPath: "k" });
        };
      });
    }

    /* ⚠ SCHREIBEN MELDET SEIN SCHEITERN, LESEN NICHT.
     *
     * Das ist keine Nachlässigkeit, sondern die Aufteilung, die `ansicht.js`
     * seit jeher hatte, und sie hat einen Grund an jeder der beiden Stellen:
     *
     *   lies   — „nichts da" und „ging schief" laufen zusammen auf `null`.
     *            Der Aufrufer will wissen, ob er etwas hat; ein Wurf zwänge
     *            jede Anzeige in ein `catch`, das dann doch `null` einsetzt.
     *   schreib— hier ist der Unterschied echt. Wer glaubt, sein Schlüssel sei
     *            abgelegt, und es ist nichts abgelegt, erfährt es sonst erst
     *            beim nächsten Besuch — und hält es dann für ein falsches
     *            Passwort. Deshalb wirft `schreib` durch.
     */
    function lies(k) {
      return offen().then(function (db) {
        return new Promise(function (res) {
          var tx = db.transaction(store, "readonly");
          var req = tx.objectStore(store).get(k);
          req.onsuccess = function () { res(req.result ? req.result.v : null); };
          req.onerror = function () { res(null); };
        });
      }).catch(function () { return null; });
    }

    function schreib(k, v) {
      return offen().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction(store, "readwrite");
          tx.objectStore(store).put({ k: k, v: v });
          tx.oncomplete = function () { res(true); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    }

    function loesch(k) {
      return offen().then(function (db) {
        return new Promise(function (res) {
          var tx = db.transaction(store, "readwrite");
          tx.objectStore(store).delete(k);
          tx.oncomplete = function () { res(true); };
          tx.onerror = function () { res(false); };
        });
      }).catch(function () { return false; });
    }

    function leeren() {
      handle = null;
      return new Promise(function (res) {
        try {
          var r = indexedDB.deleteDatabase(name);
          r.onsuccess = r.onerror = r.onblocked = function () { res(true); };
        } catch (e) { res(false); }
      });
    }

    return { name: name, store: store,
             lies: lies, schreib: schreib, loesch: loesch, leeren: leeren };
  }

  /*
   * Der „tiefe Speicher". Ohne das räumt der Browser bei Speicherdruck
   * stillschweigend auf — und der Bestand wäre weg, ohne dass jemand etwas
   * gelöscht hätte.
   *
   * ⚠ „DAUERHAFT" IST EINE ZUSICHERUNG DES BROWSERS, KEINE VON UNS. Er darf
   * sie verweigern. Wer „geschützt" schreibt, ohne `persisted()` gelesen zu
   * haben, verspricht etwas, das er nicht halten kann — und eine behauptete
   * Zusicherung ist schlimmer als eine fehlende, weil sie beruhigt.
   *
   * ⚠ ERST FRAGEN, WENN ES ETWAS ZU SCHÜTZEN GIBT. Das Rezeptbuch macht es
   * genauso: eine leere App, die dauerhaften Speicher verlangt, fragt nach
   * etwas, das sie nicht braucht.
   */
  function dauerhaft() {
    try {
      if (!navigator.storage || !navigator.storage.persist)
        return Promise.resolve(false);
      var schon = navigator.storage.persisted
        ? navigator.storage.persisted() : Promise.resolve(false);
      return schon.then(function (ja) {
        return ja ? true : navigator.storage.persist();
      }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  /** Was der Browser über den Speicher sagt — gefragt, nicht angenommen. */
  function lage() {
    var l = { dauerhaft: false, benutzt: null, frei: null };
    try {
      if (!navigator.storage || !navigator.storage.persisted)
        return Promise.resolve(l);
      return navigator.storage.persisted().then(function (d) {
        l.dauerhaft = !!d;
        if (!navigator.storage.estimate) return l;
        return navigator.storage.estimate().then(function (e) {
          l.benutzt = e.usage; l.frei = e.quota; return l;
        }, function () { return l; });
      }, function () { return l; });
    } catch (e) { return Promise.resolve(l); }
  }

  /* ══ DER WEG NACH DRAUSSEN IST DAS GLOBAL — UND NUR DAS ══════════════════
   * Derselbe Grund wie in `zeit.js` und `schluesseltresor.js`:
   * `module.exports` läuft in diesem Depot NIE (`"type": "module"` in der
   * `package.json`), und ein `export` verträgt der `<script>`-Weg nicht, auf
   * dem `ansicht.js` diese Datei bekommt. Also EIN Weg für beide Welten —
   * `schicht/ablage-idb.mjs` liest von hier und geht damit genau den Pfad,
   * den auch die Seite nimmt. */
  if (welt) welt.WERKSTATT_IDB = {
    STORE: STORE, FRIST_MS: FRIST_MS,
    macheIdb: macheIdb, dauerhaft: dauerhaft, lage: lage,
  };
})(typeof window !== "undefined" ? window
   : (typeof globalThis !== "undefined" ? globalThis : null));
