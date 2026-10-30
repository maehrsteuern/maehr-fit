// Live-Puls über Bluetooth (Heart Rate Service 0x180D, Merkmal Heart Rate Measurement 0x2A37).
//
// Kernaussage: Viele Pulsmesser – Brustgurte, Uhren und das WHOOP-Band mit eingeschalteter „Heart Rate Broadcast“ – senden
// ihren Puls nach einem gemeinsamen Bluetooth-Standard, etwa einmal pro Sekunde. Diese Datei liest eine solche Meldung
// (parseHerzfrequenzMessung) und macht daraus einen Strom normierter Herzschlag-Datensätze (livePuls). Bricht die Verbindung ab,
// verbindet sie sich mit wachsender Wartezeit neu. Alle zehn Sekunden wird gesammelt in den Speicher geschrieben
// (messung:herzschlag:<tag>, über daten/ablage.js); gleiche Kennung ersetzt, nie doppelt.
//
// Woher die Meldungen kommen, entscheidet die Brücke (gleiche Form für alle):
//   bruecke = { art, verfuegbar() → { verfuegbar, grund }, waehle() → { id, name },
//               verbinde({ beiDaten(DataView), beiTrennung() }) → Promise, trenne() → Promise }
//   daten/bruecke_webbluetooth.js (Chrome am Rechner und unter Android), daten/bruecke_ble_capacitor.js (Android-App),
//   daten/bruecke_demo.js (erfundener Puls der Musterperson).
//
// Datensatz (docs/technik/schnittstellen.md, Herzschlag erweitert): { t, bpm, rrMs: number[], energieKj?, kontakt?, quelle: { art: "ble", id: "<gerät>:<t>" } }

import { rundBruch } from "../kern/rundung.js";
import { speichereMessungen } from "./ablage.js";

export const HR_DIENST = 0x180d;
export const HR_MESSUNG = 0x2a37;
/** Volle 128-Bit-Kennungen (Bluetooth-Basis-UUID), wie das Capacitor-Plugin sie verlangt. */
export const HR_DIENST_UUID = "0000180d-0000-1000-8000-00805f9b34fb";
export const HR_MESSUNG_UUID = "00002a37-0000-1000-8000-00805f9b34fb";

/** Technische Taktung (keine Rechenregel): Speichern alle 10 s, Neuverbinden nach 1, 2, 4, 8, 16, dann alle 30 s. */
export const STAPEL_MS = 10000;
export const WARTEN_MS = [1000, 2000, 4000, 8000, 16000, 30000];

/** Uint8Array aus DataView, ArrayBuffer, Uint8Array oder Zahlenliste. */
function alsBytes(x) {
  if (x instanceof Uint8Array) return x;
  if (typeof DataView !== "undefined" && x instanceof DataView) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (Array.isArray(x)) return Uint8Array.from(x);
  throw new Error("parseHerzfrequenzMessung: DataView, ArrayBuffer oder Uint8Array erwartet");
}

/**
 * Eine Meldung des Merkmals 0x2A37 lesen (Bluetooth SIG, Heart Rate Service 1.0, formeln.json "live.formel_puls").
 *   Byte 0 = Flags: Bit 0 → Puls 16 Bit (sonst 8 Bit) · Bit 1/2 → Hautkontakt erkannt / unterstützt · Bit 3 → Energie (16 Bit, kJ)
 *   · Bit 4 → RR-Abstände folgen (je 16 Bit, Einheit 1/1024 s). Mehrbyte-Werte little-endian.
 * RR in ms = rund(Rohwert × 1000 ÷ 1024), kaufmännisch und ganzzahlig (kern/rundung.js).
 * @param {DataView|ArrayBuffer|Uint8Array} dataView
 * @returns {{bpm:number, rrMs:number[], energieKj?:number, kontakt:boolean|null}}
 */
export function parseHerzfrequenzMessung(dataView) {
  const b = alsBytes(dataView);
  if (b.length < 2) throw new Error("Herzfrequenz-Meldung zu kurz");
  const flags = b[0];
  let i = 1;
  const u16 = () => { const v = b[i] | (b[i + 1] << 8); i += 2; return v; };
  let bpm;
  if (flags & 0x01) { if (b.length < 3) throw new Error("Herzfrequenz-Meldung zu kurz"); bpm = u16(); } else bpm = b[i++];
  const kontakt = flags & 0x04 ? !!(flags & 0x02) : null;
  const aus = { bpm, rrMs: [], kontakt };
  if (flags & 0x08) { if (i + 1 < b.length) aus.energieKj = u16(); else i = b.length; }
  if (flags & 0x10) while (i + 1 < b.length) aus.rrMs.push(rundBruch(u16() * 1000, 1024));
  return aus;
}

/** Hex-Text („0a 3c 00“ oder „0a3c00“) in Bytes – so liefert das Capacitor-Plugin unter Android die Werte. */
export function hexZuBytes(text) {
  const ziffern = String(text || "").replace(/[^0-9a-f]/gi, "");
  const aus = new Uint8Array(Math.floor(ziffern.length / 2));
  for (let k = 0; k < aus.length; k++) aus[k] = parseInt(ziffern.slice(2 * k, 2 * k + 2), 16);
  return aus;
}

/** Gerätekennung für quelle.id: nur Buchstaben, Ziffern, - und _ (keine Doppelpunkte, die trennen die Zeit ab). */
const kennung = (g) => String(g?.name || g?.id || "ble").trim().replace(/[^\w-]+/g, "_").slice(0, 40) || "ble";

/**
 * Live-Pulsstrom, unabhängig von der Quelle.
 * @param {{ bruecke: object, speicher?: {lies,schreib,liste}, jetzt?: () => number, warte?: (ms:number) => Promise<void>,
 *           stapelMs?: number, wartenMs?: number[] }} p  speicher fehlt → nichts wird abgelegt (z. B. Demo-Puls)
 * @returns {{ start: () => Promise<{id,name}>, stop: () => Promise<void>, abonniere: (cb) => () => void,
 *             beobachte: (cb) => () => void, zustand: () => object, sichern: () => Promise<number> }}
 */
export function livePuls({ bruecke, speicher = null, jetzt = () => Date.now(), warte = (ms) => new Promise((r) => setTimeout(r, ms)), stapelMs = STAPEL_MS, wartenMs = WARTEN_MS } = {}) {
  if (!bruecke) throw new Error("livePuls: bruecke fehlt");
  const abos = new Set(), beobachter = new Set();
  let geraet = null, stand = "aus", versuch = 0, gewollt = false, stapel = [], letzteSicherung = 0, sichernLaeuft = Promise.resolve(0), fehler = null;
  const zustand = () => ({ stand, geraet: geraet ? { ...geraet } : null, versuch, fehler, art: bruecke.art || "ble" });
  const melde = (s, f = null) => { stand = s; fehler = f; for (const cb of beobachter) { try { cb(zustand()); } catch (e) { console.error(e); } } };

  function sichern() {
    if (!speicher || !stapel.length) return sichernLaeuft;
    const teil = stapel; stapel = []; letzteSicherung = jetzt();
    // nacheinander, damit zwei Stapel desselben Tages sich nicht überschreiben
    sichernLaeuft = sichernLaeuft.then(() => speichereMessungen(speicher, { herzschlag: teil })).then((r) => r.neu + r.ersetzt).catch((e) => { stapel = teil.concat(stapel); console.error(e); return 0; });
    return sichernLaeuft;
  }

  function beiDaten(roh) {
    let m;
    try { m = parseHerzfrequenzMessung(roh); } catch (e) { console.warn(e); return; }
    if (!(m.bpm > 0)) return; // 0 = kein Kontakt zur Haut
    const t = jetzt();
    const satz = { t, bpm: m.bpm, rrMs: m.rrMs, quelle: { art: "ble", id: `${kennung(geraet)}:${t}` } };
    if (m.energieKj !== undefined) satz.energieKj = m.energieKj;
    if (m.kontakt !== null) satz.kontakt = m.kontakt;
    if (speicher) { stapel.push(satz); if (!letzteSicherung) letzteSicherung = t; if (t - letzteSicherung >= stapelMs) sichern(); }
    for (const cb of abos) { try { cb(satz); } catch (e) { console.error(e); } }
  }

  async function verbinden() {
    await bruecke.verbinde({ beiDaten, beiTrennung });
    versuch = 0; melde("verbunden");
  }

  async function beiTrennung() {
    if (!gewollt) return;
    sichern();
    melde("getrennt");
    while (gewollt) {
      const ms = wartenMs[Math.min(versuch, wartenMs.length - 1)];
      versuch += 1; melde("wieder", fehler);
      await warte(ms);
      if (!gewollt) return;
      try { await verbinden(); return; } catch (e) { fehler = String(e?.message || e); }
    }
  }

  return {
    async start() {
      if (stand === "verbunden" || stand === "suche") return geraet;
      gewollt = true; melde("suche");
      try {
        if (!geraet) geraet = await bruecke.waehle();
        await verbinden();
        return geraet;
      } catch (e) { gewollt = false; melde("fehler", String(e?.message || e)); throw e; }
    },
    async stop() {
      gewollt = false;
      try { await bruecke.trenne(); } catch (e) { console.warn(e); }
      await sichern();
      melde("aus");
    },
    abonniere(cb) { abos.add(cb); return () => abos.delete(cb); },
    beobachte(cb) { beobachter.add(cb); return () => beobachter.delete(cb); },
    zustand,
    sichern,
  };
}
