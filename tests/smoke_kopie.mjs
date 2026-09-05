/*
 * smoke_kopie.mjs — ist diese Kopie noch die Kopie?
 *
 * Das ist die eine Frage, die Kimhub nicht beantworten kann: dort liegen die
 * Originale, hier die Abschriften. Wer eine Abschrift am Ort anpasst, erzeugt
 * eine zweite Generation — und die ist hier zusätzlich eine UNGEPRÜFTE, weil
 * der Prüfstand drüben steht.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pruefe, ERWARTET } from "../tools/drift-guard.mjs";

export const NAME = "Die Kopie (Drift + Schale)";
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const lies = (...t) => readFileSync(join(WURZEL, ...t), "utf8");

export async function lauf(ok) {
  /* ---- 1 · Der Drift-Guard ---------------------------------------------- */
  const r = pruefe();
  ok(`jede gepinnte Datei ist da (${ERWARTET.length} Einträge)`, r.fehlend.length === 0);
  ok(`jede trägt einen Fingerabdruck — ein leerer bewacht nichts`, r.ungepinnt.length === 0);
  ok(`keine ist abgewandelt${r.abgewichen.length ? " — " + r.abgewichen.map((a) => a.datei).join(", ") : ""}`,
    r.abgewichen.length === 0);

  /* ---- 2 · Die app-eigenen Abweichungen passen zusammen ------------------
   * Worker und Manifest sind bewusst NICHT gepinnt: sie nennen den Namen der
   * Startseite, und der ist hier `index.html` statt `start.html`. Genau
   * deshalb müssen sie gegeneinander stimmen — eine Abweichung, die niemand
   * prüft, ist eine Abweichung, die auseinanderläuft. */
  const sw = lies("company-sw.js");
  ok("der Worker kennt die Startseite dieses Depots", sw.includes('"./index.html"'));
  ok("und NICHT mehr die aus Kimhub", !sw.includes('"./start.html"'));
  const manifest = JSON.parse(lies("company.webmanifest"));
  ok("das Manifest startet in der Wurzel", manifest.start_url === "./");
  ok("der Worker sagt, warum er abweicht — sonst hält es jemand für einen Fehler",
    /ABSICHTLICH|absichtlich/.test(sw) && /start\.html/.test(sw));

  /* ---- 3 · Was die Seite lädt, muss offline dasein -----------------------
   * Abgeleitet, nicht aufgezählt. Vier Positivlisten sind in Kimhub dreimal
   * auseinandergelaufen; jedes Mal stand als Lehre daneben „wer eine Datei
   * anlegt, trägt sie nach". Eine Regel, an die man sich erinnern muss, ist
   * keine. */
  const seite = lies("index.html");
  const glue = lies("company.js");
  const skripte = [...seite.matchAll(/<script\s+(?:type="module"\s+)?src="([^"/:]+\.js)"/g)]
    .map((m) => m[1]);
  ok(`die Seite lädt ihren Klebstoff (${skripte.join(", ")})`, skripte.length >= 1);
  const importe = [...glue.matchAll(/^import\s+(?:[^'"]*?from\s+)?["']\.\/([^"']+)["']/gm)]
    .map((m) => m[1]);
  const geholt = [...glue.matchAll(/fetch\("([^"]+)"\)/g)].map((m) => m[1]);
  const gebraucht = [...skripte, ...importe, ...geholt];
  ok(`insgesamt braucht die App ${gebraucht.length} Dateien`, gebraucht.length >= 12);

  const fehltImVorrat = gebraucht.filter((g) => !sw.includes(`"./${g}"`));
  ok(`jede steht im Offline-Vorrat${fehltImVorrat.length ? " — fehlt: " + fehltImVorrat.join(", ") : ""}`,
    fehltImVorrat.length === 0);
  /* ⚠ UND SIE MUSS AUCH WIRKLICH DALIEGEN. Im Vorrat zu stehen und zu
     existieren sind zwei Dinge — `c.add()` schluckt einen Fehlschlag einzeln,
     damit eine fehlende Datei nicht die ganze Installation umwirft. Genau
     deshalb fällt eine vergessene Datei sonst NICHT auf. */
  const fehltAufPlatte = gebraucht.filter((g) => !existsSync(join(WURZEL, g)));
  ok(`jede liegt auch wirklich da${fehltAufPlatte.length ? " — fehlt: " + fehltAufPlatte.join(", ") : ""}`,
    fehltAufPlatte.length === 0);

  /* ---- 4 · Kein Schlüssel, kein Geheimnis im Depot ----------------------- */
  const verdaechtig = [];
  for (const e of ERWARTET) {
    const t = lies(e.datei);
    if (/sk-ant-api/.test(t)) verdaechtig.push(e.datei);
  }
  ok(`nirgends ein echter Schlüssel${verdaechtig.length ? " — " + verdaechtig.join(", ") : ""}`,
    verdaechtig.length === 0);
  ok("die Ausschluss-Liste steht da und nennt die Zugänge",
    /^\*\.key$/m.test(lies(".gitignore")) && /^\.env$/m.test(lies(".gitignore")));
}
