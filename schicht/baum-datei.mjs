/*
 * baum-datei.mjs — der Lesestoff der Agenten, wenn er auf einer Platte liegt.
 *
 * Die einzige Stelle der Werkzeug-Kette, die ein Dateisystem anfasst.
 * `werkzeuge.mjs` sagt, WAS gelesen werden darf (die Sperrliste, die Deckel,
 * die Texte ans Modell); diese Datei sagt, WO es liegt, und wie man daran
 * kommt.
 *
 * DIE TRENNUNG IST GENAU DIE ALTE ZUSICHERUNG, nur an einer Naht. Es steht
 * weiterhin keine einzige schreibende Funktion in diesem Import — kein
 * `writeFileSync`, kein `mkdirSync`, kein `child_process`. Wer schreiben will,
 * muss ihn ergänzen, und dann fällt `smoke_werkzeuge.mjs` um.
 *
 * DER RIEGEL BLEIBT, WO ER WAR: jeder Pfad wird AUFGELÖST (`realpathSync`) und
 * muss unter der Wurzel liegen. Aufgelöst, nicht zusammengesetzt — sonst führt
 * ein Verweis (Symlink) aus dem Depot heraus, und `..` zu verbieten hätte
 * nichts genützt.
 */
import { readFileSync, readdirSync, statSync, realpathSync } from "node:fs";
import { resolve, relative, join, sep } from "node:path";

/** Pfade reden nach aussen immer mit Schrägstrich — auch dort, wo das
 *  Betriebssystem es anders hält. Sonst passt die Sperrliste nicht. */
const nachAussen = (p) => p.split(sep).join("/");

export function dateiBaum(wurzel) {
  if (!wurzel) throw new Error(
    "Der Datei-Baum braucht eine Wurzel — ohne sie hat er keine Grenze.");
  const w = realpathSync(wurzel);
  return {
    /** Wo der Lesestoff herkommt — fürs Protokoll und für die Fehlertexte. */
    wo: w,

    /*
     * Löst einen Pfad auf und hält ihn in der Wurzel.
     *
     * Gibt einen GRUND als Kennwort zurück, keinen fertigen Satz: was das
     * Modell zu lesen bekommt, steht in `werkzeuge.mjs`. Zwei Stellen, die
     * beide Sätze ans Modell formulieren, liefen auseinander.
     *
     * `rel === ""` ist die Wurzel selbst und ist ERLAUBT. Vorher wurde sie hier
     * abgewiesen und in `verzeichnis_zeigen` als Sonderfall wieder
     * hereingeholt — ein Riegel und eine Ausnahme davon, an zwei Stellen.
     * `relative()` gibt "" ausschliesslich dann, wenn Ziel und Wurzel dasselbe
     * sind; alles Auswärtige beginnt mit "..". Die Wurzel zuzulassen macht den
     * Riegel also nicht weiter, sondern nur ehrlich.
     */
    aufloesen(pfad) {
      if (typeof pfad !== "string") return { ok: false, grund: "leer" };
      const roh = resolve(w, pfad.trim() === "" ? "." : pfad);
      let echt;
      try { echt = realpathSync(roh); } catch { return { ok: false, grund: "fehlt" }; }
      const rel = relative(w, echt);
      if (rel.startsWith("..") || rel.startsWith(sep))
        return { ok: false, grund: "draussen" };
      return { ok: true, rel: nachAussen(rel) };
    },

    istOrdner(rel) {
      try { return statSync(join(w, rel)).isDirectory(); } catch { return false; }
    },
    lies(rel) {
      try { return readFileSync(join(w, rel), "utf8"); } catch { return null; }
    },
    eintraege(rel) {
      let e;
      try { e = readdirSync(join(w, rel), { withFileTypes: true }); } catch { return null; }
      return e.map((x) => {
        const unter = rel ? `${rel}/${x.name}` : x.name;
        let groesse = null;
        if (!x.isDirectory()) {
          try { groesse = statSync(join(w, unter)).size; } catch { /* bleibt null */ }
        }
        return { name: x.name, rel: unter, ordner: x.isDirectory(), groesse };
      });
    },

    /**
     * Alle Dateien unter `rel`, flach. `ueberspringen` entscheidet, wo gar nicht
     * erst hineingesehen wird — die REGEL dazu steht in `werkzeuge.mjs`, hier
     * läuft nur die Mechanik. Ohne diesen Haken liefe die Suche durch `.git`
     * und `node_modules`, und das ist keine Frage des Geschmacks: dort liegen
     * Zehntausende Dateien.
     */
    alleDateien(rel, ueberspringen = () => false, gesammelt = []) {
      const e = this.eintraege(rel);
      if (e === null) return gesammelt;
      for (const x of e) {
        if (ueberspringen(x.rel)) continue;
        if (x.ordner) this.alleDateien(x.rel, ueberspringen, gesammelt);
        else gesammelt.push(x.rel);
      }
      return gesammelt;
    },
  };
}
