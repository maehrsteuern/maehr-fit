// tests/node/daten_capacitor.test.mjs – Brücke zum Capacitor-Plugin "HealthConnect" (daten/bruecke_capacitor.js, daten/verbinden.js).
// Kernaussage: In der Android-App wird die Brücke beim ersten Zugriff selbst eingerichtet (ohne gebündeltes @capacitor/core, nur mit
// dem, was die native Brücke von Capacitor 6 bereitstellt); im Browser ohne Capacitor bleibt es bei "kein_android".
import { test } from "node:test";
import assert from "node:assert/strict";
import { erzeugeDaten, installiere } from "../../daten/verbinden.js";
import { speicherMap } from "../../kern/speicher.js";

/** Globale Werte sichern, Test laufen lassen, danach genau den alten Zustand wiederherstellen. */
async function mitGlobalen(neu, fn) {
  const hatte = {};
  for (const k of Object.keys(neu)) hatte[k] = Object.prototype.hasOwnProperty.call(globalThis, k) ? { wert: globalThis[k] } : null;
  for (const [k, v] of Object.entries(neu)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; }
  try { return await fn(); } finally {
    for (const [k, h] of Object.entries(hatte)) { if (h) globalThis[k] = h.wert; else delete globalThis[k]; }
  }
}

/** Nachbildung der nativen Brücke von Capacitor 6: `Plugins.HealthConnect` mit Promise-Methoden, kein `registerPlugin`. */
function nativesCapacitor(aufrufe) {
  const antwort = {
    verfuegbar: { verfuegbar: true, status: "verfuegbar", hauttemp: true, verlauf: true },
    berechtigungen: { erteilt: ["HeartRate", "SleepSession"] },
    erteilt: { erteilt: ["HeartRate"] },
    lesen: { datensaetze: [{ metadata: { id: "x1" } }] },
    einstellungen: {},
  };
  const nativePromise = async (plugin, methode, optionen) => { aufrufe.push({ plugin, methode, optionen }); return antwort[methode]; };
  const proxy = {};
  for (const m of Object.keys(antwort)) proxy[m] = (o) => nativePromise("HealthConnect", m, o);
  return { isNativePlatform: () => true, Plugins: { HealthConnect: proxy }, nativePromise };
}

test("Android-App: Brücke wird ohne MF.native beim ersten Zugriff eingerichtet, Health Connect ist verfügbar", async () => {
  await mitGlobalen({ MF: undefined, Capacitor: nativesCapacitor([]) }, async () => {
    const daten = erzeugeDaten({ speicher: speicherMap() });
    const r = await daten.healthConnect.verfuegbar();
    assert.equal(r.verfuegbar, true);
    assert.equal(r.grund, "verfuegbar");
    // eingerichtet und wiederverwendet (nicht bei jedem Aufruf neu gebaut)
    const erste = globalThis.MF.native.healthConnect;
    await daten.healthConnect.verfuegbar();
    assert.equal(globalThis.MF.native.healthConnect, erste);
  });
});

test("Android-App: Rechte und Lesen laufen mit den Namen und Formen des Kotlin-Plugins", async () => {
  const aufrufe = [];
  await mitGlobalen({ MF: undefined, Capacitor: nativesCapacitor(aufrufe) }, async () => {
    const daten = erzeugeDaten({ speicher: speicherMap() });
    const rechte = await daten.healthConnect.berechtigungen();
    assert.deepEqual(rechte.erteilt, ["HeartRate", "SleepSession"]);
    // berechtigungen({ arten }) · lesen({ art, vonMs, bisMs }) → { datensaetze } (HealthConnectPlugin.kt)
    assert.deepEqual(aufrufe[0].optionen.arten.includes("HeartRate"), true);
    const b = globalThis.MF.native.healthConnect;
    assert.deepEqual(await b.lesen("HeartRate", 1000.4, 2000.6), [{ metadata: { id: "x1" } }]);
    const l = aufrufe.find((a) => a.methode === "lesen");
    assert.deepEqual(l.optionen, { art: "HeartRate", vonMs: 1000, bisMs: 2001 }); // ganze Millisekunden (Kotlin: getLong)
    // erteilt({ arten }) → { erteilt } ohne Dialog (Abgleich beim App-Start, shell/abgleich.js); eine Brücke für alles (daten/verbinden.js)
    assert.deepEqual((await daten.healthConnect.erteilt()).erteilt, ["HeartRate"]);
    assert.equal(aufrufe.at(-1).methode, "erteilt");
    assert.equal(globalThis.MF.native.healthConnect, b);
  });
});

test("installiere(window): Android-App findet die Brücke, auch wenn Capacitor erst nach dem Start da ist", async () => {
  const ziel = {};
  const daten = installiere(ziel, { speicher: speicherMap() });
  assert.deepEqual(await daten.healthConnect.verfuegbar(), { verfuegbar: false, grund: "kein_android" });
  ziel.Capacitor = nativesCapacitor([]);
  assert.equal((await daten.healthConnect.verfuegbar()).verfuegbar, true);
});

test("Browser ohne Capacitor: kein_android; Capacitor im Browser (isNativePlatform false) ebenso", async () => {
  await mitGlobalen({ MF: undefined, Capacitor: undefined }, async () => {
    const daten = erzeugeDaten({ speicher: speicherMap() });
    assert.deepEqual(await daten.healthConnect.verfuegbar(), { verfuegbar: false, grund: "kein_android" });
    assert.equal(globalThis.MF, undefined, "ohne Capacitor wird nichts angelegt");
    await assert.rejects(() => daten.healthConnect.verbinden(), /nur in der Android-App/);
  });
  await mitGlobalen({ MF: undefined, Capacitor: { isNativePlatform: () => false, Plugins: {} } }, async () => {
    const daten = erzeugeDaten({ speicher: speicherMap() });
    assert.equal((await daten.healthConnect.verfuegbar()).grund, "kein_android");
  });
});
