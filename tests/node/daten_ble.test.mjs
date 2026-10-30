// Tests daten/ble_puls.js, daten/bruecke_demo.js, daten/bruecke_webbluetooth.js, daten/bruecke_ble_capacitor.js.
//
// Handrechnung Merkmal 0x2A37 (Bluetooth SIG Heart Rate Service; Byte 0 = Flags, Werte little-endian, RR in 1/1024 s):
//   A 8 Bit, ohne RR:       [0x00, 0x48]                         → Puls 0x48 = 72; RR []; Kontakt unbekannt (Bit 2 aus) → null
//   B 8 Bit, mit RR:        [0x10, 0x3C, 0x00,0x04, 0x33,0x04]   → Puls 60; RR 0x0400 = 1024 → 1024·1000/1024 = 1000 ms;
//                                                                   0x0433 = 1075 → 1 075 000/1024 = 1049,80 → 1050 ms
//   C 16 Bit, Energie, RR:  [0x19, 0x2C,0x01, 0xE8,0x03, 0x9A,0x02] → Flags 0x01|0x08|0x10; Puls 0x012C = 300;
//                                                                   Energie 0x03E8 = 1000 kJ; RR 0x029A = 666 → 650,39 → 650 ms
//   D 16 Bit, Kontakt ja:   [0x07, 0x5A,0x00]                    → Puls 90; Bit 2 (unterstützt) und Bit 1 (erkannt) → true
//   E 8 Bit, Kontakt nein:  [0x04, 0x50]                         → Puls 80; unterstützt, nicht erkannt → false
//   F Rundung genau halb:   RR-Rohwert 64 → 64 000/1024 = 62,5 → 63 ms (kaufmännisch, kern/rundung.js)
//   G ungerades Restbyte:   [0x10, 0x3C, 0x00, 0x04, 0x99] → nur ein RR (1000 ms), das letzte Byte wird nicht gelesen
// Strom (livePuls): Uhr 0, 4 s, 8 s, 12 s → beim Wert bei 12 s sind seit der ersten Sicherung (0 s) ≥ 10 s vergangen → ein Stapel
//   mit 4 Werten in messung:herzschlag:<tag>; quelle.id = "<Gerät>:<t>". Trennung → Wartezeiten 1000, 2000 ms (zweiter Versuch klappt).
import test from "node:test";
import assert from "node:assert/strict";
import { parseHerzfrequenzMessung, hexZuBytes, livePuls, HR_DIENST_UUID, HR_MESSUNG_UUID } from "../../daten/ble_puls.js";
import { baueHerzfrequenzMessung, demoBruecke } from "../../daten/bruecke_demo.js";
import { webBluetoothBruecke } from "../../daten/bruecke_webbluetooth.js";
import { capacitorBleBruecke } from "../../daten/bruecke_ble_capacitor.js";
import { speicherMap } from "../../kern/speicher.js";
import { tagIso } from "../../daten/zeit.js";

const dv = (bytes) => new DataView(Uint8Array.from(bytes).buffer);

test("0x2A37: 8 Bit ohne RR (A)", () => {
  assert.deepEqual(parseHerzfrequenzMessung(dv([0x00, 0x48])), { bpm: 72, rrMs: [], kontakt: null });
});
test("0x2A37: 8 Bit mit RR (B)", () => {
  assert.deepEqual(parseHerzfrequenzMessung(dv([0x10, 0x3c, 0x00, 0x04, 0x33, 0x04])), { bpm: 60, rrMs: [1000, 1050], kontakt: null });
});
test("0x2A37: 16 Bit mit Energie und RR (C)", () => {
  assert.deepEqual(parseHerzfrequenzMessung(dv([0x19, 0x2c, 0x01, 0xe8, 0x03, 0x9a, 0x02])), { bpm: 300, rrMs: [650], energieKj: 1000, kontakt: null });
});
test("0x2A37: Hautkontakt (D, E), Rundung halb (F), Restbyte (G)", () => {
  assert.equal(parseHerzfrequenzMessung(dv([0x07, 0x5a, 0x00])).kontakt, true);
  assert.equal(parseHerzfrequenzMessung(dv([0x07, 0x5a, 0x00])).bpm, 90);
  assert.equal(parseHerzfrequenzMessung(dv([0x04, 0x50])).kontakt, false);
  assert.deepEqual(parseHerzfrequenzMessung(dv([0x10, 60, 64, 0])).rrMs, [63]);
  assert.deepEqual(parseHerzfrequenzMessung(dv([0x10, 0x3c, 0x00, 0x04, 0x99])).rrMs, [1000]);
});
test("0x2A37: Eingabeformen und Fehler", () => {
  const roh = Uint8Array.from([0xff, 0x10, 0x3c, 0x00, 0x04]);
  assert.equal(parseHerzfrequenzMessung(new DataView(roh.buffer, 1)).bpm, 60, "DataView mit Versatz");
  assert.equal(parseHerzfrequenzMessung(roh.subarray(1)).rrMs[0], 1000, "Uint8Array");
  assert.equal(parseHerzfrequenzMessung(Uint8Array.from([0, 70]).buffer).bpm, 70, "ArrayBuffer");
  assert.throws(() => parseHerzfrequenzMessung(dv([0x00])), /zu kurz/);
  assert.throws(() => parseHerzfrequenzMessung(dv([0x01, 0x50])), /zu kurz/);
  assert.throws(() => parseHerzfrequenzMessung("x"), /erwartet/);
});
test("Hex-Text (Capacitor unter Android) und Demo-Meldung: Hin und zurück", () => {
  assert.deepEqual([...hexZuBytes("10 3c 00 04")], [0x10, 0x3c, 0x00, 0x04]);
  assert.deepEqual([...hexZuBytes("103C0004")], [0x10, 0x3c, 0x00, 0x04]);
  // 1050 ms → 1050·1024/1000 = 1075,2 → 1075 → zurück 1050 (B)
  assert.deepEqual(parseHerzfrequenzMessung(baueHerzfrequenzMessung(60, [1000, 1050])), { bpm: 60, rrMs: [1000, 1050], kontakt: null });
  assert.equal(parseHerzfrequenzMessung(baueHerzfrequenzMessung(300, [])).bpm, 300);
  assert.equal(HR_DIENST_UUID.slice(4, 8), "180d");
  assert.equal(HR_MESSUNG_UUID.slice(4, 8), "2a37");
});

/** Nachgebildete Brücke: senden(bytes), trennen() von außen. */
function falscheBruecke({ fehlschlaege = 0 } = {}) {
  const b = { art: "test", verbunden: 0, getrennt: 0, h: null, fehl: fehlschlaege };
  b.verfuegbar = async () => ({ verfuegbar: true });
  b.waehle = async () => ({ id: "AA:BB", name: "WHOOP 4A2B" });
  b.verbinde = async (h) => { if (b.verbunden > 0 && b.fehl-- > 0) throw new Error("noch weg"); b.verbunden += 1; b.h = h; };
  b.trenne = async () => { b.getrennt += 1; };
  b.senden = (bytes) => b.h.beiDaten(dv(bytes));
  return b;
}

test("livePuls: normierte Datensätze, Stapel alle 10 s im Speicher, ohne Doppelte", async () => {
  const bruecke = falscheBruecke(), speicher = speicherMap();
  let uhr = Date.UTC(2026, 9, 30, 10, 0, 0);
  const strom = livePuls({ bruecke, speicher, jetzt: () => uhr });
  const saetze = [], staende = [];
  strom.abonniere((s) => saetze.push(s));
  strom.beobachte((z) => staende.push(z.stand));
  const g = await strom.start();
  assert.equal(g.name, "WHOOP 4A2B");
  const start = uhr;
  for (let i = 0; i < 4; i++) { bruecke.senden([0x10, 60 + i, 0x00, 0x04]); uhr += 4000; }
  assert.equal(saetze.length, 4);
  assert.deepEqual(saetze[0], { t: start, bpm: 60, rrMs: [1000], quelle: { art: "ble", id: `WHOOP_4A2B:${start}` } });
  await strom.sichern(); // wartet auf den laufenden Stapel
  const k = `messung:herzschlag:${tagIso(start)}`;
  assert.equal((await speicher.lies(k)).length, 4, "Stapel nach 12 s geschrieben");
  bruecke.senden([0x00, 0]); // Puls 0 = kein Hautkontakt → verworfen
  assert.equal(saetze.length, 4);
  bruecke.senden([0x00, 99]);
  await strom.stop();
  assert.equal((await speicher.lies(k)).length, 5, "Rest beim Beenden gesichert");
  await strom.sichern();
  assert.equal((await speicher.lies(k)).length, 5, "nichts doppelt");
  assert.deepEqual(staende, ["suche", "verbunden", "aus"]);
  assert.equal(bruecke.getrennt, 1);
});

test("livePuls: Neuverbinden nach Trennung mit wachsender Wartezeit, Ende bei stop()", async () => {
  const bruecke = falscheBruecke({ fehlschlaege: 1 }), gewartet = [];
  const strom = livePuls({ bruecke, warte: async (ms) => { gewartet.push(ms); }, wartenMs: [1000, 2000, 4000] });
  const staende = [];
  strom.beobachte((z) => staende.push(`${z.stand}${z.stand === "wieder" ? z.versuch : ""}`));
  await strom.start();
  await bruecke.h.beiTrennung();
  assert.deepEqual(gewartet, [1000, 2000]);
  assert.equal(bruecke.verbunden, 2);
  assert.deepEqual(staende, ["suche", "verbunden", "getrennt", "wieder1", "wieder2", "verbunden"]);
  await strom.stop();
  await bruecke.h.beiTrennung(); // nach stop: kein Neuverbinden
  assert.equal(bruecke.verbunden, 2);
});

test("livePuls: Abbruch in der Geräteauswahl meldet Fehler, ohne Speicher wird nichts abgelegt", async () => {
  const bruecke = falscheBruecke();
  bruecke.waehle = async () => { throw new Error("User cancelled the requestDevice() chooser."); };
  const strom = livePuls({ bruecke });
  await assert.rejects(strom.start(), /cancelled/);
  assert.equal(strom.zustand().stand, "fehler");
  assert.throws(() => livePuls({}), /bruecke fehlt/);
});

test("Demo-Brücke: Meldungen im Takt, gleiche Reihe bei gleichem Startwert", async () => {
  const takte = [];
  const b = demoBruecke({ seed: 3, takt: (fn, ms) => { takte.push({ fn, ms }); return takte.length; }, halt: () => {} });
  const daten = [];
  await b.verbinde({ beiDaten: (d) => daten.push(parseHerzfrequenzMessung(d)) });
  for (let i = 0; i < 5; i++) takte[i].fn();
  assert.equal(daten.length, 5);
  assert.deepEqual(takte.map((x) => x.ms), [200, 1000, 1000, 1000, 1000, 1000]);
  assert.ok(daten.every((d) => d.bpm > 40 && d.rrMs.length >= 0));
  await b.trenne();
});

test("Web-Bluetooth-Brücke: Filter heart_rate, Benachrichtigungen, Trennung", async () => {
  const ereignisse = {};
  const merkmal = { addEventListener: (n, f) => { ereignisse[n] = f; }, removeEventListener: (n) => { delete ereignisse[n]; }, startNotifications: async () => {}, stopNotifications: async () => {} };
  const geraet = { id: "g1", name: "WHOOP", addEventListener: (n, f) => { ereignisse[n] = f; }, removeEventListener: (n) => { delete ereignisse[n]; },
    gatt: { connected: true, connect: async () => ({ getPrimaryService: async (s) => { assert.equal(s, "heart_rate"); return { getCharacteristic: async (c) => { assert.equal(c, "heart_rate_measurement"); return merkmal; } }; } }), disconnect() { this.connected = false; } } };
  let filter = null;
  const nav = { bluetooth: { requestDevice: async (o) => { filter = o; return geraet; }, getAvailability: async () => true } };
  assert.equal(webBluetoothBruecke({}), null);
  const b = webBluetoothBruecke(nav);
  assert.deepEqual(await b.verfuegbar(), { verfuegbar: true, grund: null });
  assert.deepEqual(await b.waehle(), { id: "g1", name: "WHOOP" });
  assert.deepEqual(filter, { filters: [{ services: ["heart_rate"] }] });
  const empfangen = []; let getrennt = 0;
  await b.verbinde({ beiDaten: (d) => empfangen.push(parseHerzfrequenzMessung(d).bpm), beiTrennung: () => { getrennt += 1; } });
  ereignisse.characteristicvaluechanged({ target: { value: dv([0, 77]) } });
  assert.deepEqual(empfangen, [77]);
  ereignisse.gattserverdisconnected();
  assert.equal(getrennt, 1);
  await b.trenne();
});

test("Capacitor-Brücke: rohe Plugin-Aufrufe, Hex-Werte, Trennungsereignis", async () => {
  const aufrufe = [], hoerer = {};
  const plugin = {
    initialize: async (o) => { aufrufe.push(["initialize", o]); }, isEnabled: async () => ({ value: true }),
    requestDevice: async (o) => { aufrufe.push(["requestDevice", o]); return { deviceId: "D1", name: "WHOOP 4A2B" }; },
    connect: async (o) => { aufrufe.push(["connect", o]); }, disconnect: async (o) => { aufrufe.push(["disconnect", o]); },
    startNotifications: async (o) => { aufrufe.push(["start", o]); }, stopNotifications: async (o) => { aufrufe.push(["stop", o]); },
    addListener: async (n, f) => { hoerer[n] = f; return { remove: async () => { delete hoerer[n]; } }; },
  };
  assert.equal(capacitorBleBruecke({}), null);
  assert.equal(capacitorBleBruecke({ Capacitor: { isNativePlatform: () => false, Plugins: { BluetoothLe: plugin } } }), null, "Browser: kein Plugin");
  const b = capacitorBleBruecke({ Capacitor: { isNativePlatform: () => true, Plugins: { BluetoothLe: plugin } } });
  assert.deepEqual(await b.verfuegbar(), { verfuegbar: true, grund: null });
  assert.deepEqual(await b.waehle(), { id: "D1", name: "WHOOP 4A2B" });
  const werte = []; let getrennt = 0;
  await b.verbinde({ beiDaten: (d) => werte.push(parseHerzfrequenzMessung(d)), beiTrennung: () => { getrennt += 1; } });
  hoerer[`notification|D1|${HR_DIENST_UUID}|${HR_MESSUNG_UUID}`]({ value: "10 3c 00 04 " });
  assert.deepEqual(werte, [{ bpm: 60, rrMs: [1000], kontakt: null }]);
  hoerer["disconnected|D1"]();
  assert.equal(getrennt, 1);
  await b.trenne();
  assert.deepEqual(aufrufe.map((a) => a[0]), ["initialize", "requestDevice", "connect", "start", "stop", "disconnect"]);
  assert.deepEqual(aufrufe[0][1], { androidNeverForLocation: true });
  assert.deepEqual(aufrufe[1][1], { services: [HR_DIENST_UUID] });
});
