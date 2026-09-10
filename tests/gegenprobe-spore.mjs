/*
 * gegenprobe-spore.mjs — fälscht eine Spore, damit die Gegenprobe EINZELN messen kann.
 *
 * ⚠ WARUM ES DIESES WERKZEUG BRAUCHT. Alle Felder einer Spore stehen UNTER der
 * Signatur. Wer eine abgelegte Spore von Hand verändert, um einen einzelnen
 * Wächter zu prüfen, bricht damit IMMER zuerst den Signatur-Wächter — der Fall
 * meldet „gefangen", und ob der Wächter, um den es geht, überhaupt etwas misst,
 * bleibt offen. Genau diese Falle steht seit dem 2026-09-09 im Kopf von
 * `gegenprobe.sh`, nur an einer anderen Tür.
 *
 * Also wird nicht verändert, sondern NEU SIGNIERT: ein frisches Ed25519-Paar,
 * das nur im Arbeitsspeicher lebt, unterschreibt die veränderte Fassung. Danach
 * ist die Spore in sich tadellos — und genau der eine Wächter fällt um, dessen
 * Zusicherung der Eingriff verletzt.
 *
 * ⚠ KEIN SCHLÜSSEL BERÜHRT DIE PLATTE. Das Paar entsteht bei jedem Aufruf neu
 * und wird nie abgelegt; in der Datei steht ausschliesslich der öffentliche
 * Teil. Und geschrieben wird ohnehin nur in die WEGWERF-KOPIE.
 *
 * Lauf: node tests/gegenprobe-spore.mjs <ziel.json> '<patch>'
 *       patch ist JSON; "publicKey.key_ops" adressiert ein Feld im JWK.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
const subtle = webcrypto.subtle;

/* ⚠ SCHALTER ZUERST AUSSORTIEREN. Beim Bauen stand hier `argv.slice(2)` ohne
   Filter — mit `--nagel-nachziehen` davor wurde der Schalter zum Dateinamen,
   das Werkzeug brach ab, und die Fälle meldeten sich als „NICHT GEFANGEN",
   obwohl gar nichts sabotiert war. Ein Fall, dessen Werkzeug stolpert, misst
   nichts und sieht dabei aus wie ein blinder Wächter. */
const stellung = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const [ziel, patchRoh] = stellung;
if (!ziel) { console.error("Aufruf: gegenprobe-spore.mjs <ziel.json> '<patch>'"); process.exit(2); }

const b64u = (b) => Buffer.from(b).toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const canon = (v) => v === null ? null
  : Array.isArray(v) ? v.map(canon)
  : typeof v === "object"
    ? Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {})
    : v;

const sp = JSON.parse(readFileSync(ziel, "utf8"));

const paar = await subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
sp.publicKey = await subtle.exportKey("jwk", paar.publicKey);
delete sp.publicKey.d;                       // exportKey liefert ihn hier nicht — belt and braces
sp.publicKey.key_ops = ["verify"];
sp.id = b64u(await subtle.digest("SHA-256", await subtle.exportKey("raw", paar.publicKey)));

/* Der Eingriff kommt NACH der Ableitung, sonst überschriebe die Ableitung ihn
   wieder — und der Fall wäre inert, ohne dass es jemandem auffiele. */
for (const [pfad, wert] of Object.entries(JSON.parse(patchRoh || "{}"))) {
  const teile = pfad.split(".");
  let ziel2 = sp;
  while (teile.length > 1) ziel2 = ziel2[teile.shift()];
  ziel2[teile[0]] = wert;
}

const ohneSig = {};
for (const k of Object.keys(sp)) if (k !== "signature") ohneSig[k] = sp[k];
sp.signature = b64u(await subtle.sign({ name: "Ed25519" }, paar.privateKey,
  Buffer.from(JSON.stringify(canon(ohneSig)), "utf8")));

writeFileSync(ziel, JSON.stringify(sp, null, 2) + "\n", "utf8");

/* ⚠ DER NAGEL WIRD MITGEZOGEN, und das ist kein Aufweichen des Wächters.
   Ein frisches Schlüsselpaar hat zwangsläufig eine andere Kennung — ohne diese
   Zeile feuerte bei JEDEM gefälschten Fall zuerst der genagelte Kennungs-Wächter,
   und der Fall wäre „gefangen", ohne den gemeinten Wächter je erreicht zu haben.
   Genau die Falle, gegen die dieses Werkzeug gebaut ist, nur eine Ebene höher.
   Nachgestellt wird damit ein Knoten, der seine Kennung LEGITIM gewechselt und
   den Nagel ordentlich nachgezogen hat — und dabei etwas anderes falsch macht.
   Der Fall „FREMDE Kennung" zieht ihn deshalb ausdrücklich NICHT nach. */
if (process.argv.includes("--nagel-nachziehen")) {
  const probe = "tests/smoke_knoten.mjs";
  const vorher = readFileSync(probe, "utf8");
  const nachher = vorher.replace(/const KENNUNG = "[^"]*"/, `const KENNUNG = "${sp.id}"`);
  if (nachher === vorher) { console.error("Nagel nicht gefunden — der Fall misst nichts."); process.exit(3); }
  writeFileSync(probe, nachher, "utf8");
}
