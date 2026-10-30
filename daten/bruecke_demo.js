// Brücke „Demo-Puls“ → Live-Puls (daten/ble_puls.js).
//
// Kernaussage: Ohne Band oder ohne Bluetooth zeigt der Demo-Puls, wie die Live-Ansicht aussieht. Er spielt den erfundenen Puls der
// Musterperson (kern/demo.js, demoPuls) etwa einmal pro Sekunde ab – verpackt genau wie eine echte Bluetooth-Meldung (0x2A37 mit
// RR-Abständen), damit derselbe Weg durch Leser und Strom geprüft wird. Gespeichert wird beim Demo-Puls nichts.

import { demoPuls } from "../kern/demo.js";
import { rundBruch } from "../kern/rundung.js";

/** Meldung 0x2A37 bauen: Flags 0x10 (8-Bit-Puls, RR folgen) bzw. 0x11 (16-Bit-Puls), RR in 1/1024 s. */
export function baueHerzfrequenzMessung(bpm, rrMs = []) {
  const breit = bpm > 255, bytes = [(breit ? 0x01 : 0) | (rrMs.length ? 0x10 : 0)];
  if (breit) bytes.push(bpm & 0xff, bpm >> 8); else bytes.push(bpm);
  for (const ms of rrMs) { const roh = rundBruch(ms * 1024, 1000); bytes.push(roh & 0xff, (roh >> 8) & 0xff); }
  return new DataView(Uint8Array.from(bytes).buffer);
}

/**
 * Demo-Brücke.
 * @param {{ seed?: number, profil?: "training"|"atem", atemZyklusMs?: number, takt?: (fn, ms) => any, halt?: (id) => void }} [o]
 *   takt/halt: Zeitgeber (Standard setTimeout/clearTimeout, Kette statt Intervall; Tests übergeben eine Nachbildung)
 */
export function demoBruecke({ seed = 20261030, profil = "training", atemZyklusMs, takt = (fn, ms) => setTimeout(fn, ms), halt = (id) => clearTimeout(id) } = {}) {
  let quelle = null, laeuft = null;
  return {
    art: "demo",
    async verfuegbar() { return { verfuegbar: true, grund: null }; },
    async waehle() { return { id: "demo", name: "Demo-Puls" }; },
    async verbinde({ beiDaten }) {
      quelle = demoPuls(seed, { profil, atemZyklusMs });
      const schritt = () => { const m = quelle.naechster(); beiDaten(baueHerzfrequenzMessung(m.bpm, m.rrMs)); laeuft = takt(schritt, 1000); };
      laeuft = takt(schritt, 200); // erste Meldung gleich, dann im Sekundentakt
    },
    async trenne() { if (laeuft !== null) halt(laeuft); laeuft = null; },
  };
}
