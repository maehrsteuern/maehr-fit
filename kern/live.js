/* kern/live.js – Auswertung des Live-Pulses vom Band (Bluetooth, docs/apps/live.md).
 *
 * Kernaussage: Während du trainierst oder atmest, kommt etwa jede Sekunde ein Pulswert vom Band, oft mit den genauen Abständen
 * zwischen den letzten Herzschlägen. Diese Datei sagt, in welcher Pulszone du gerade bist, wie hoch die Belastung der laufenden
 * Einheit schon ist, wie stark die Herzschlag-Abstände in der letzten Minute schwanken (Kurz-HRV) und wie gleichmäßig dein Puls
 * dem Atemtakt folgt (Kohärenz). Zonen und Belastung kommen unverändert aus kern/belastung.js; alle Grenzen aus formeln.json.
 *
 * Ganzzahlig: Zeiten in ms, RR-Abstände in ms, Kurz-HRV in Zehntel-ms, Kohärenz in ganzen Punkten 0–100.
 * Kein DOM, kein Netz, kein Speicher.
 *
 * Schnittstelle:
 *   zoneVon(bpm, { maxPuls, ruhepuls })                      → 0..5 oder null (Einstellungen fehlen)
 *   laufendeBelastung(herzschlaege, { maxPuls, ruhepuls }, zustand?) → { wert, wertZehntel, zonen, trimpMs, ohneZoneMs, formel, zustand }
 *   rrFilter(rrMs)                                           → { gueltig: number[], paare: [[a,b]…], verworfen }
 *   hrvKurz(rrMs, fenster?)                                  → { rmssdZehntel|null, n, verworfen, formel, grund? }
 *   atemKohaerenz(rrMs, atemZyklusMs)                        → { wert: 0..100|null, zyklen, n, formel, grund? }
 *   trainingMindestMs() · pulsFormel()
 */
import { formel, wert } from "./formeln.js";
import { rund, begrenze } from "./rundung.js";
import { zoneVon as zoneBelastung, trimpMs, kurveZehntel } from "./belastung.js";
import { MS_MINUTE } from "./zeit.js";

const pulsOk = (e) => !!e && Number.isFinite(e.maxPuls) && Number.isFinite(e.ruhepuls) && e.maxPuls > e.ruhepuls;

/**
 * Zone eines Pulswerts – dieselbe Regel wie die Tagesbelastung (Karvonen 1957, Grenzen aus "belastung.zonen").
 * @param {number} bpm
 * @param {{maxPuls:number, ruhepuls:number}} einstellungen
 * @returns {number|null} 0 = unter Zone 1, 1..5, null wenn Max- oder Ruhepuls fehlen
 */
export function zoneVon(bpm, einstellungen) {
  if (!pulsOk(einstellungen) || !Number.isFinite(bpm)) return null;
  return zoneBelastung(bpm, einstellungen.maxPuls, einstellungen.ruhepuls);
}

/** Leerer Zustand einer laufenden Einheit. */
const neuerZustand = () => ({ letzter: null, zonenMs: wert("belastung.zonen").map(() => 0), ohneZoneMs: 0, n: 0 });

/**
 * Belastung einer laufenden Einheit, Schritt für Schritt. Wer nur die neuen Herzschläge und den letzten Zustand übergibt,
 * erhält dasselbe Ergebnis wie belastung() über die ganze Reihe: Jeder Pulswert gilt bis zum nächsten, höchstens
 * "belastung.luecke_max_ms"; Zonen-Minuten gewichtet nach "belastung.gewichte"; Kurve nach "belastung".
 * @param {Array<{t:number,bpm:number}>} herzschlaege neue Herzschläge (zeitlich nach dem Zustand)
 * @param {{maxPuls:number, ruhepuls:number}} einstellungen
 * @param {object} [zustand] Rückgabe .zustand des letzten Aufrufs
 * @returns {object|null} null, wenn Max-/Ruhepuls fehlen
 */
export function laufendeBelastung(herzschlaege, einstellungen, zustand) {
  if (!pulsOk(einstellungen)) return null;
  const z = zustand ? { ...zustand, zonenMs: zustand.zonenMs.slice() } : neuerZustand();
  const luecke = wert("belastung.luecke_max_ms");
  const neu = (herzschlaege || []).filter((h) => h && Number.isFinite(h.t) && Number.isFinite(h.bpm)).slice().sort((a, b) => a.t - b.t);
  for (const h of neu) {
    if (z.letzter && h.t > z.letzter.t) {
      const ms = Math.min(luecke, h.t - z.letzter.t);
      const zone = zoneBelastung(z.letzter.bpm, einstellungen.maxPuls, einstellungen.ruhepuls);
      if (zone === 0) z.ohneZoneMs += ms; else z.zonenMs[zone - 1] += ms;
    }
    if (!z.letzter || h.t >= z.letzter.t) z.letzter = { t: h.t, bpm: h.bpm };
    z.n += 1;
  }
  const zonen = z.zonenMs.map((ms, i) => ({ zone: i + 1, ms }));
  const t = trimpMs(zonen), wertZehntel = kurveZehntel(t);
  return {
    wert: wertZehntel / 10, wertZehntel, zonen, trimpMs: t, zonenMinuten: rund(t / MS_MINUTE, 1), ohneZoneMs: z.ohneZoneMs,
    formel: formel("belastung"), zonenFormel: formel("belastung.karvonen"), zustand: z,
  };
}

/**
 * Artefaktfilter für RR-Abstände: außerhalb [live.rr.min_ms, live.rr.max_ms] oder Sprung über live.rr.sprung_promille
 * zum letzten gültigen Abstand → verworfen (Karlsson et al. 2012). paare = direkt aufeinanderfolgende gültige Abstände.
 * @param {number[]} rrMs
 * @returns {{gueltig:number[], paare:Array<[number,number]>, verworfen:number}}
 */
export function rrFilter(rrMs) {
  const min = wert("live.rr.min_ms"), max = wert("live.rr.max_ms"), sprung = wert("live.rr.sprung_promille");
  const gueltig = [], paare = [];
  let vorher = null, vorherDirekt = false, verworfen = 0;
  for (const roh of rrMs || []) {
    const rr = Math.round(Number(roh));
    const ok = Number.isFinite(rr) && rr >= min && rr <= max && (vorher === null || 1000 * Math.abs(rr - vorher) <= sprung * vorher);
    if (!ok) { verworfen += 1; vorherDirekt = false; continue; }
    if (vorher !== null && vorherDirekt) paare.push([vorher, rr]);
    gueltig.push(rr); vorher = rr; vorherDirekt = true;
  }
  return { gueltig, paare, verworfen };
}

/**
 * Kurz-HRV (RMSSD) über die letzten `fenster` RR-Abstände, nach dem Artefaktfilter.
 * Ganzzahlig: Summe der quadrierten Differenzen (ms²) ist ganz; Ergebnis = rund(√(100 × Summe ÷ n)) Zehntel-ms.
 * @param {number[]} rrMs RR-Abstände in ms, zeitlich geordnet
 * @param {number} [fenster] Standard: "live.hrv_kurz.fenster"
 * @returns {{rmssdZehntel:number|null, n:number, verworfen:number, formel:object, grund?:string}}
 */
export function hrvKurz(rrMs, fenster = wert("live.hrv_kurz.fenster")) {
  const roh = (rrMs || []).slice(-Math.max(2, Math.floor(fenster)));
  const { paare, verworfen } = rrFilter(roh);
  const f = formel("live.hrv_kurz");
  if (paare.length < wert("live.hrv_kurz.min_differenzen")) return { rmssdZehntel: null, n: paare.length, verworfen, formel: f, grund: "zu_wenig_daten" };
  const summe = paare.reduce((s, [a, b]) => s + (b - a) * (b - a), 0);
  return { rmssdZehntel: rund(Math.sqrt((100 * summe) / paare.length)), n: paare.length, verworfen, formel: f };
}

/**
 * Kohärenz 0–100: Anteil der Schwankung der RR-Abstände, der genau im Atemtakt schwingt (eigene, vereinfachte Festlegung).
 * Es zählen die letzten ganzen Atemzüge (min/max aus formeln.json); die Abstände werden gleichmäßig im Abstand ihres Mittels
 * gelegt (t_i = i × Mittel), damit eine ganze Zahl von Atemzügen ohne Leck in die Rechnung geht.
 * @param {number[]} rrMs RR-Abstände in ms
 * @param {number} atemZyklusMs Dauer eines Atemzugs (ein + aus + halten) in ms
 * @returns {{wert:number|null, zyklen:number, n:number, verworfen:number, formel:object, grund?:string}}
 */
export function atemKohaerenz(rrMs, atemZyklusMs) {
  const f = formel("live.kohaerenz");
  const T = Number(atemZyklusMs);
  const { gueltig, verworfen } = rrFilter(rrMs);
  const leer = (grund, zyklen = 0) => ({ wert: null, zyklen, n: 0, verworfen, formel: f, grund });
  if (!(T > 0)) return leer("kein_atemtakt");
  const summe = gueltig.reduce((s, x) => s + x, 0);
  const zyklen = Math.min(wert("live.kohaerenz.max_zyklen"), Math.floor(summe / T));
  if (zyklen < wert("live.kohaerenz.min_zyklen")) return leer("zu_wenig_daten", zyklen);
  // vom Ende her so viele Abstände nehmen, bis die Dauer der ganzen Atemzüge erreicht ist
  const ziel = zyklen * T, teil = [];
  let dauer = 0;
  for (let i = gueltig.length - 1; i >= 0 && dauer < ziel; i--) { teil.unshift(gueltig[i]); dauer += gueltig[i]; }
  const n = teil.length;
  const mittel = teil.reduce((s, x) => s + x, 0) / n;
  let a = 0, b = 0, streuung = 0;
  teil.forEach((rr, i) => {
    const d = rr - mittel, w = (2 * Math.PI * i * mittel) / T;
    a += d * Math.cos(w); b += d * Math.sin(w); streuung += d * d;
  });
  if (!(streuung > 0)) return { wert: 0, zyklen, n, verworfen, formel: f, grund: "keine_schwankung" };
  a = (2 * a) / n; b = (2 * b) / n;
  const leistung = (a * a + b * b) / 2;
  return { wert: begrenze(rund((100 * leistung) / (streuung / n)), 0, 100), zyklen, n, verworfen, formel: f };
}

/** Kürzeste Live-Aufzeichnung, die als Training gespeichert wird (formeln.json "live.training.min_ms"). */
export const trainingMindestMs = () => wert("live.training.min_ms");

/** Formel zur Herkunft des Live-Pulses (Belegfenster). */
export const pulsFormel = () => formel("live.formel_puls");
