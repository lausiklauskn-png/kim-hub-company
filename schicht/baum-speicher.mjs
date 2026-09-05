/*
 * baum-speicher.mjs — Lesestoff, der schon im Arbeitsspeicher liegt.
 *
 * WOFÜR ER DA IST (Entscheidung 2026-09-04, von Klaus übergeben).
 *
 * Im Browser gibt es kein Depot. Die Frage „was bekommen Lisa, Ben und Malcom
 * dort in die Hand" hat drei denkbare Antworten, und zwei davon taugen nicht:
 *
 *   NICHTS               drei Werkzeuge, die dastehen und „geht nicht" sagen.
 *                        Ein toter Knopf kostet hier eine BEZAHLTE Runde, und
 *                        einer mit Beschriftung ist die schlimmere Sorte.
 *   DIE EIGENEN DATEIEN  die Seite könnte ihren eigenen Quelltext ausliefern.
 *                        Lesbar ja, nützlich nein: die Rollen läsen Kimhubs
 *                        Innereien, während der Nutzer nach SEINER Arbeit fragt.
 *   WAS DER NUTZER GIBT  ← das hier.
 *
 * Der Nutzer übergibt Dateien (Auswahl, Hineinziehen), und die sind der ganze
 * Lesestoff. Beide alten Zusicherungen bleiben damit stehen, und die zweite
 * wird sogar stärker:
 *
 *   nur LESEN        unverändert — es gibt kein Schreib-Werkzeug.
 *   eine GRENZE      unverändert vorhanden, aber der Nutzer zieht sie selbst.
 *                    Eine Grenze, die der Betroffene gezogen hat, muss ihm
 *                    niemand erklären.
 *
 * ⚠ WAS HIER NICHT STEHT: die Seite, die diese Dateien entgegennimmt. Es gibt
 * sie noch nicht. Dieser Baum ist trotzdem kein Vorbau ins Blaue — er wird von
 * `smoke_werkzeuge.mjs` wirklich benutzt, um zu belegen, dass die Werkbank ohne
 * Dateisystem arbeitet. Ohne einen zweiten Baum wäre das eine Behauptung.
 */

/**
 * @param dateien flach als `{ "pfad/zur/datei.md": "inhalt" }`.
 *        Pfade mit Schrägstrich, ohne führenden Schrägstrich — so, wie sie ein
 *        Browser aus einer Ordner-Auswahl herausgibt (`webkitRelativePath`).
 */
export function speicherBaum(dateien = {}, { wo = "speicher" } = {}) {
  // Normalisiert: führende „./" und „/" weg, Rückwärts-Schrägstriche gedreht.
  const inhalte = new Map(Object.entries(dateien).map(([p, t]) =>
    [String(p).split("\\").join("/").replace(/^\.?\//, ""), t]));

  const ordnerPfade = new Set();
  for (const p of inhalte.keys()) {
    const teile = p.split("/");
    for (let i = 1; i < teile.length; i++) ordnerPfade.add(teile.slice(0, i).join("/"));
  }
  ordnerPfade.add("");            // die Wurzel ist immer ein Ordner

  return {
    wo,
    aufloesen(pfad) {
      if (typeof pfad !== "string") return { ok: false, grund: "leer" };
      const roh = pfad.trim().split("\\").join("/").replace(/^\.?\//, "");
      // Kein `realpath` nötig: es gibt keine Verweise, aus denen man
      // herausklettern könnte. Ein „..“ wird trotzdem abgewiesen, statt es
      // wegzurechnen — wer danach fragt, meint etwas ausserhalb.
      if (roh.split("/").includes("..")) return { ok: false, grund: "draussen" };
      const rel = roh === "." ? "" : roh;
      if (rel !== "" && !inhalte.has(rel) && !ordnerPfade.has(rel))
        return { ok: false, grund: "fehlt" };
      return { ok: true, rel };
    },
    istOrdner: (rel) => ordnerPfade.has(rel) && !inhalte.has(rel),
    lies: (rel) => (inhalte.has(rel) ? inhalte.get(rel) : null),
    eintraege(rel) {
      if (!ordnerPfade.has(rel)) return null;
      const vorsatz = rel ? `${rel}/` : "";
      const gesehen = new Map();
      for (const p of inhalte.keys()) {
        if (!p.startsWith(vorsatz)) continue;
        const rest = p.slice(vorsatz.length);
        if (!rest) continue;
        const [kopf, ...schwanz] = rest.split("/");
        const unter = vorsatz + kopf;
        if (gesehen.has(unter)) continue;
        gesehen.set(unter, schwanz.length
          ? { name: kopf, rel: unter, ordner: true, groesse: null }
          : { name: kopf, rel: unter, ordner: false,
              groesse: new TextEncoder().encode(inhalte.get(p) || "").length });
      }
      return [...gesehen.values()];
    },
    alleDateien(rel, ueberspringen = () => false) {
      const vorsatz = rel ? `${rel}/` : "";
      return [...inhalte.keys()]
        .filter((p) => p.startsWith(vorsatz) && !ueberspringen(p));
    },
  };
}
