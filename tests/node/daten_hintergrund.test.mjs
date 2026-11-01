// tests/node/daten_hintergrund.test.mjs – Hintergrund-Abgleich: Eingangskorb, Kontext, Zusammenfassung, kern.bundle.js.
// Kernaussage: Was Android bei geschlossener App sammelt, kommt beim Öffnen ohne Doppelte in den Speicher; der gekürzte Kontext
// ergibt dieselben Zahlen wie alle Daten; das Bündel für Android rechnet den Demotag genauso wie die App.
// Fixtures: daten/fixtures/healthconnect_*.json (erfunden, Musterperson), hier zu JSON Lines umgeschrieben wie in files/eingang/<Typ>.jsonl.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  jsonlLesen, eingangZuPaket, vereinen, kontextAusPaket, zusammenfassung, heuteAusMessungen, heuteAusEingang, abholen, spiegeln,
  einhaengen, fingerabdruck, einstellungenFuerKern, _zuruecksetzen, WEGE,
} from "../../daten/hintergrund.js";
import { zuordnen, RECORD_TYPEN } from "../../daten/healthconnect.js";
import { leseMessungen, ARTEN } from "../../daten/ablage.js";
import { demoDaten, isoTag, plusTage, mitternacht, wert } from "../../kern/index.js";
import { berechne } from "../../shell/kern.js";

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURES = path.join(WURZEL, "daten", "fixtures");
const hcFixture = (typ) => JSON.parse(fs.readFileSync(path.join(FIXTURES, `healthconnect_${typ}.json`), "utf8"));
const alsJsonl = (liste) => liste.map((x) => JSON.stringify(x)).join("\n") + "\n";
/** Eingangskorb wie von HintergrundAbgleichWorker.kt geschrieben: je Typ eine Datei, eine Zeile je Datensatz. */
const KORB = Object.fromEntries(RECORD_TYPEN.map((t) => [t, alsJsonl(hcFixture(t))]));

function mapSpeicher() {
  const m = new Map();
  return { m, lies: async (k) => (m.has(k) ? structuredClone(m.get(k)) : null), schreib: async (k, w) => { m.set(k, structuredClone(w)); }, liste: async (p) => [...m.keys()].filter((k) => k.startsWith(p)) };
}

// Demotag wie in der App: 60 Tage bis 30.10.2026, „jetzt“ 30.10. 09:00 Ortszeit
const HEUTE = "2026-10-30";
const DEMO = demoDaten({ bis: HEUTE, tage: 60 });
const JETZT = new Date(2026, 9, 30, 9, 0).getTime();

// ------------------------------------------------------------------ JSON Lines
test("jsonlLesen: drei gültige Zeilen, eine kaputte, Leerzeilen und \\r\\n zählen nicht", () => {
  // Rechenweg: Zeilen = {a:1}, "", {b:2}, "kaputt{", {c:3}, "" → 3 Datensätze, 1 Fehler; eine Zahl allein (42) ist kein Objekt → +1 Fehler
  const r = jsonlLesen('{"a":1}\r\n\n{"b":2}\nkaputt{\n{"c":3}\n42\n');
  assert.deepEqual(r.datensaetze, [{ a: 1 }, { b: 2 }, { c: 3 }]);
  assert.equal(r.fehler, 2);
  assert.deepEqual(jsonlLesen(""), { datensaetze: [], fehler: 0 });
  assert.deepEqual(jsonlLesen(null), { datensaetze: [], fehler: 0 });
});

test("eingangZuPaket: Korb (JSON Lines) ergibt dasselbe wie die Zuordnung der Rohdaten", () => {
  const p = eingangZuPaket(KORB);
  const hr = zuordnen("HeartRate", hcFixture("HeartRate")).herzschlag;
  assert.deepEqual(p.herzschlag.map((x) => x.quelle.id).sort(), hr.map((x) => x.quelle.id).sort());
  assert.equal(p.schlaf.length, zuordnen("SleepSession", hcFixture("SleepSession")).schlaf.length);
  assert.equal(p.hrv.length, 3);
  // Trainings bekommen die Herzschläge aus demselben Korb (wie synchronisieren in daten/healthconnect.js)
  const mitPuls = zuordnen("ExerciseSession", hcFixture("ExerciseSession"), { herzschlaege: hr }).training;
  assert.deepEqual(p.training.map((x) => x.herzschlaege.length), mitPuls.map((x) => x.herzschlaege.length));
  assert.equal(p.fehlerZeilen, 0);
});

test("eingangZuPaket: dieselbe Zeile zweimal (Worker lief doppelt) bleibt ein Datensatz; kaputte Zeile wird gezählt", () => {
  const doppelt = { ...KORB, RestingHeartRate: KORB.RestingHeartRate + KORB.RestingHeartRate + "{nicht json\n" };
  const p = eingangZuPaket(doppelt);
  assert.equal(p.ruhepuls.length, 3);
  assert.equal(p.fehlerZeilen, 1);
  assert.deepEqual(eingangZuPaket({}).herzschlag, []);
});

test("vereinen: gleiche quelle.id – das spätere Paket gewinnt; innerhalb eines Pakets bleibt alles; ohne id bleibt jeder", () => {
  const a = { hrv: [{ t: 1, rmssdMs: 50, quelle: { id: "x" } }, { t: 2, rmssdMs: 40 }], herzschlag: [{ t: 1, bpm: 50, quelle: { id: "tag" } }, { t: 2, bpm: 52, quelle: { id: "tag" } }] };
  const b = { hrv: [{ t: 1, rmssdMs: 55, quelle: { id: "x" } }] };
  const v = vereinen(a, b);
  assert.equal(v.hrv.length, 2);
  assert.equal(v.hrv.find((x) => x.quelle).rmssdMs, 55);
  assert.equal(v.herzschlag.length, 2, "Demodaten: eine id je Pulstag, trotzdem alle Werte");
  assert.equal(vereinen(a, { herzschlag: [{ t: 3, bpm: 60, quelle: { id: "tag" } }] }).herzschlag.length, 1);
  for (const art of ARTEN) assert.ok(Array.isArray(v[art]), art);
});

// ------------------------------------------------------------------ Kontext
test("kontextAusPaket: nur die Tage, die der Kern braucht – und dieselben Zahlen wie mit allen 60 Tagen", () => {
  const k = kontextAusPaket(DEMO, HEUTE);
  // Rechenweg: lang = basis.fenster.lang (30), schuld = schlaf.schuld.fenster (7), Reserve 2 Tage
  //   → alle Arten ab 30.10. − 32 Tage = 28.09. 00:00; Herzschläge ab 30.10. − 9 Tage = 21.10. 00:00
  const lang = wert("basis.fenster.lang"), schuld = wert("schlaf.schuld.fenster"), kurz = wert("basis.fenster.kurz");
  const abAlle = mitternacht(plusTage(HEUTE, -(Math.max(lang, kurz, schuld) + 2))), abHerz = mitternacht(plusTage(HEUTE, -(schuld + 2)));
  assert.ok(k.herzschlag.length > 0 && k.herzschlag.every((x) => x.t >= abHerz));
  assert.ok(k.herzschlag.length < DEMO.herzschlag.length);
  assert.ok(k.schlaf.every((x) => x.bis >= abAlle) && k.schlaf.length < DEMO.schlaf.length);
  assert.ok(k.training.filter((x) => x.von < abHerz).every((x) => x.herzschlaege.length === 0));
  assert.deepEqual(k.tagebuch, []);
  const voll = zusammenfassung(DEMO, DEMO.einstellungen, { jetzt: JETZT });
  const kurzZ = zusammenfassung(k, DEMO.einstellungen, { jetzt: JETZT });
  for (const f of ["erholung", "belastung", "schlaf", "hrv", "ruhepuls", "kernaussage", "zeile"]) assert.deepEqual(kurzZ[f], voll[f], f);
});

test("einstellungenFuerKern: nur gültige ganze Zahlen (wie shell/kern_echt.js)", () => {
  assert.deepEqual(einstellungenFuerKern({ alter: "38", maxPuls: "", ruhepuls: -3, schlafBasisMs: "28800000", sprache: "de" }),
    { alter: 38, maxPuls: undefined, ruhepuls: undefined, schlafBasisMs: 28800000 });
  assert.deepEqual(einstellungenFuerKern(null), { alter: undefined, maxPuls: undefined, ruhepuls: undefined, schlafBasisMs: undefined });
});

// ------------------------------------------------------------------ Zusammenfassung
test("zusammenfassung: Demotag – dieselben Zahlen wie die App (shell/kern.js berechne) und der Satz aus „Heute“", () => {
  const z = zusammenfassung(DEMO, DEMO.einstellungen, { jetzt: JETZT });
  const bild = berechne(DEMO, DEMO.einstellungen).tage.get(HEUTE);
  assert.equal(z.tag, HEUTE);
  assert.equal(z.istHeute, true);
  assert.equal(z.erholung.wert, bild.erholung.wert);
  assert.equal(z.erholung.stufe, bild.erholung.stufe);
  assert.equal(z.belastung.zehntel, bild.belastung.wert);
  assert.equal(z.schlaf.dauerMs, bild.schlaf.dauerMs);
  assert.equal(z.schlaf.bedarfMs, bild.schlaf.bedarfMs);
  assert.equal(z.hrv.wert, bild.hrv.wert);
  // Zeile: „Erholung 71 % · Belastung 10,6 · Schlaf 7:42 h“ – Rechenweg Schlaf: 27 720 000 ms ÷ 60 000 = 462 min = 7:42 h
  assert.equal(z.zeile, `Erholung ${z.erholung.text} · Belastung ${z.belastung.text} · Schlaf ${z.schlaf.text}`);
  assert.match(z.schlaf.text, /^\d+:\d\d h$/);
  assert.match(z.kernaussage, /^Du bist heute (gut|mittel|wenig) erholt: \d+ %\. Die Nacht /);
  assert.equal(z.schlafErkannt, true);
  assert.ok(z.schlafenszeit && z.schlafenszeit.bettMs < z.schlafenszeit.aufstehenMs);
  assert.equal(z.schlafenszeit.aufstehenMs - z.schlafenszeit.bettMs, z.schlafenszeit.bedarfMs);
  assert.equal(z.schlaf.anteil, Math.round((z.schlaf.dauerMs / z.schlaf.bedarfMs) * 100));
});

test("zusammenfassung: Englisch, leeres Paket, nur alte Tage (Tag = letzter Tag mit Werten)", () => {
  const en = zusammenfassung(DEMO, { ...DEMO.einstellungen, sprache: "en" }, { jetzt: JETZT });
  assert.match(en.zeile, /^Recovery \d+% · Strain \d+\.\d · Sleep \d+:\d\d h$/);
  assert.equal(en.texte.erholung, "Recovery");
  const leer = zusammenfassung({}, {}, { jetzt: JETZT, demo: true });
  assert.equal(leer.leer, true);
  assert.equal(leer.erholung.wert, null);
  assert.equal(leer.demo, true);
  assert.match(leer.kernaussage, /Health Connect/);
  const spaeter = zusammenfassung(DEMO, DEMO.einstellungen, { jetzt: new Date(2026, 10, 3, 9, 0).getTime() });
  assert.equal(spaeter.tag, HEUTE);
  assert.equal(spaeter.istHeute, false);
  assert.equal(spaeter.schlafErkannt, false);
  assert.match(spaeter.kernaussage, /^Am .+ warst du/);
});

test("heuteAusMessungen und heuteAusEingang: JSON-Text rein, Zusammenfassung raus", () => {
  const a = heuteAusMessungen(JSON.stringify(DEMO), JSON.stringify(DEMO.einstellungen), JETZT);
  assert.equal(a.quelle, "hintergrund");
  assert.equal(a.erholung.wert, zusammenfassung(DEMO, DEMO.einstellungen, { jetzt: JETZT }).erholung.wert);
  assert.equal(heuteAusMessungen("kaputt", "", JETZT).leer, true);
  // Kontext ohne Schlaf + Korb mit dem Schlaf (Rohformat) = alles zusammen
  const alles = eingangZuPaket(KORB);
  const jetztHc = Date.UTC(2026, 9, 30, 12, 0);
  const voll = zusammenfassung(alles, {}, { jetzt: jetztHc });
  const kontext = { ...alles, schlaf: [] };
  const r = heuteAusEingang(JSON.stringify(kontext), JSON.stringify({ SleepSession: KORB.SleepSession }), "{}", jetztHc);
  assert.deepEqual(r.schlaf, voll.schlaf);
  assert.deepEqual(r.erholung, voll.erholung);
  assert.deepEqual(r.eingang, { schlaf: 2 });
});

// ------------------------------------------------------------------ kern.bundle.js
test("kern.bundle.js: ohne Module, setzt MFKern und rechnet den Demotag wie die App", () => {
  const code = fs.readFileSync(path.join(WURZEL, "android/app/src/main/assets/kern.bundle.js"), "utf8");
  assert.doesNotMatch(code, /^\s*(import|export)\s/m);
  assert.doesNotMatch(code, /https?:\/\//);
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const K = ctx.MFKern;
  for (const f of ["alleTage", "tagAuswerten", "demoDaten", "heuteAusMessungen", "heuteAusEingang", "rechneAusNativ"]) assert.equal(typeof K[f], "function", f);
  const d = K.demoDaten({ bis: HEUTE, tage: 60 });
  const z = K.heuteAusMessungen(JSON.stringify(d), JSON.stringify(d.einstellungen), JETZT);
  const app = zusammenfassung(DEMO, DEMO.einstellungen, { jetzt: JETZT });
  assert.equal(z.erholung.wert, app.erholung.wert);
  assert.equal(z.belastung.zehntel, app.belastung.zehntel);
  assert.equal(z.schlaf.dauerMs, app.schlaf.dauerMs);
  assert.equal(z.kernaussage, app.kernaussage);
  assert.equal(K.alleTage(d, d.einstellungen).at(-1).tag, HEUTE);
  // Weg über die Java-Schnittstelle MFNativ (so ruft HintergrundAbgleichWorker.kt)
  let ergebnis = null, fehler = null;
  ctx.MFNativ = { kontext: () => JSON.stringify(kontextAusPaket(DEMO, HEUTE)), eingang: () => "{}", einstellungen: () => JSON.stringify(DEMO.einstellungen),
    jetzt: () => String(JETZT), ergebnis: (j) => { ergebnis = JSON.parse(j); }, fehler: (f) => { fehler = f; } };
  K.rechneAusNativ();
  assert.equal(fehler, null);
  assert.equal(ergebnis.erholung.wert, app.erholung.wert);
  ctx.MFNativ.kontext = () => { throw new Error("Datei weg"); };
  K.rechneAusNativ();
  assert.match(fehler, /Datei weg/);
});

// ------------------------------------------------------------------ abholen, spiegeln, einhaengen (mit Brücke und Speicher)
function korbBruecke(korb = KORB) {
  const log = [];
  let liegt = { marke: "korb-1", dateien: korb };
  return {
    log,
    eingangUebernehmen: async () => { log.push("uebernehmen"); const r = liegt; liegt = { marke: "korb-2", dateien: {} }; return r; },
    eingangBestaetigen: async ({ marke }) => { log.push("bestaetigt:" + marke); },
    kontextSchreiben: async (o) => { log.push("kontext:" + o.marke); },
    zusammenfassungSchreiben: async (o) => { log.push("zusammenfassung"); log.json = JSON.parse(o.json); },
    widgetsAktualisieren: async () => { log.push("widgets"); },
  };
}

test("abholen: Korb in den Speicher, dann bestätigen; zweiter Korb leer; Doppelte ersetzt statt verdoppelt", async () => {
  const sp = mapSpeicher(), b = korbBruecke();
  const r = await abholen({ speicher: sp, bruecke: b });
  // Rechenweg: HeartRate 2 Datensätze mit zusammen n Einzelwerten + 3 HRV + 2 SpO2 + 2 Atem + 3 Ruhepuls + Hauttemp-Deltas + 2 Schlaf + 2 Training
  const erwartet = Object.values(eingangZuPaket(KORB)).filter(Array.isArray).reduce((s, l) => s + l.length, 0);
  assert.equal(r.neu, erwartet);
  assert.equal(r.ersetzt, 0);
  assert.deepEqual(b.log, ["uebernehmen", "bestaetigt:korb-1"]);
  assert.equal((await leseMessungen(sp, "schlaf")).length, 2);
  const zweiter = await abholen({ speicher: sp, bruecke: b });
  assert.equal(zweiter.neu, 0);
  assert.equal(b.log.at(-1), "bestaetigt:korb-2");
  const nochmal = await abholen({ speicher: sp, bruecke: korbBruecke() });
  assert.equal(nochmal.neu, 0);
  assert.equal(nochmal.ersetzt, erwartet);
});

test("abholen: scheitert das Ablegen, wird nicht bestätigt (Korb bleibt für das nächste Mal)", async () => {
  const b = korbBruecke();
  const kaputt = { lies: async () => null, schreib: async () => { throw new Error("voll"); }, liste: async () => [] };
  await assert.rejects(abholen({ speicher: kaputt, bruecke: b }), /voll/);
  assert.deepEqual(b.log, ["uebernehmen"]);
  assert.deepEqual(await abholen({ speicher: null, bruecke: b }), { neu: 0, ersetzt: 0, arten: {}, fehlerZeilen: 0, marke: null });
});

test("spiegeln: Kontext nur bei Änderung, Zusammenfassung und Widgets jedes Mal; ohne eigene Daten leer statt Demo", async () => {
  _zuruecksetzen();
  const sp = mapSpeicher(), b = korbBruecke();
  const leer = await spiegeln({ speicher: sp, bruecke: b, jetzt: JETZT });
  assert.equal(leer.demo, true);
  assert.equal(leer.erholung.wert, null);
  await abholen({ speicher: sp, bruecke: b });
  const jetztHc = Date.UTC(2026, 9, 30, 12, 0);
  const z = await spiegeln({ speicher: sp, bruecke: b, jetzt: jetztHc });
  assert.equal(z.quelle, "app");
  assert.equal(z.demo, false);
  assert.deepEqual(b.log.json.zeile, z.zeile);
  const kontexte = () => b.log.filter((x) => x.startsWith("kontext:")).length;
  const vorher = kontexte();
  await spiegeln({ speicher: sp, bruecke: b, jetzt: jetztHc });
  assert.equal(kontexte(), vorher, "unveränderter Kontext wird nicht erneut geschickt");
  assert.equal(b.log.filter((x) => x === "widgets").length, 3);
  assert.equal(await spiegeln({ speicher: sp, bruecke: null }), null);
});

test("fingerabdruck: gleich für gleichen Text, anders bei Änderung", () => {
  assert.equal(fingerabdruck("abc"), fingerabdruck("abc"));
  assert.notEqual(fingerabdruck("abc"), fingerabdruck("abd"));
  assert.match(fingerabdruck(""), /^0-/);
});

test("einhaengen: wartet auf den Speicher, holt ab, lädt neu, spiegelt; Rückkehr/Verlassen; nur erlaubte Sprünge", async () => {
  _zuruecksetzen();
  const sp = mapSpeicher(), b = korbBruecke();
  let wegFn = null, neuGeladen = 0;
  b.beiWeg = (fn) => { wegFn = fn; };
  const horcher = {};
  const timer = [];
  const ziel = {
    MF: { native: { hintergrund: b } }, location: { hash: "#/heute" }, console: { warn: () => {} },
    setTimeout: (fn) => timer.push(fn),
    document: { visibilityState: "visible", addEventListener: (n, fn) => { horcher[n] = fn; } },
  };
  const steuer = einhaengen(ziel);
  assert.ok(steuer);
  assert.equal(einhaengen(ziel), steuer, "nur einmal einhängen");
  assert.equal(b.log.length, 0, "ohne Speicher noch nichts");
  ziel.MF.shell = { speicher: sp, neuLaden: async () => { neuGeladen += 1; } };
  timer.shift()();
  await steuer.spiegeln(); // wartet die Kette ab
  assert.deepEqual(b.log.slice(0, 2), ["uebernehmen", "bestaetigt:korb-1"]);
  assert.equal(neuGeladen, 1);
  assert.ok(b.log.includes("zusammenfassung"));
  ziel.document.visibilityState = "hidden";
  const n = b.log.filter((x) => x === "zusammenfassung").length;
  horcher.visibilitychange();
  await steuer.spiegeln();
  assert.ok(b.log.filter((x) => x === "zusammenfassung").length > n);
  wegFn("#/schlaf");
  assert.equal(ziel.location.hash, "#/schlaf");
  wegFn("javascript:alert(1)");
  assert.equal(ziel.location.hash, "#/schlaf");
  assert.ok(WEGE.includes("#/atem"));
  assert.equal(einhaengen({}), null, "ohne Brücke (Browser) nichts");
  assert.equal(einhaengen(undefined), null);
});

test("Ortszeit: Tag der Zusammenfassung folgt dem Gerät (isoTag)", () => {
  assert.equal(zusammenfassung(DEMO, DEMO.einstellungen, { jetzt: JETZT }).tag, isoTag(JETZT));
});
