/* kern/zeit.js – Tage, Wochen, Dauern.
 *
 * Kernaussage: Ein Tag in MAEHR FIT läuft vom Aufwachen bis zum nächsten Aufwachen. So gehört das späte Training
 * noch zum selben Tag und die Nacht danach zur Erholung des nächsten Morgens. Gibt es keine Schlafdaten, gilt
 * Mitternacht bis Mitternacht in der Zeitzone des Geräts. Zeitumstellungen (23- oder 25-Stunden-Tage) werden über
 * die örtliche Uhrzeit des Geräts richtig behandelt, Kalenderrechnungen laufen über reine Datumsarithmetik.
 *
 * Alle Zeiten als Unix-Millisekunden. Kein DOM, kein Netz, kein Speicher.
 */
import { wert } from "./formeln.js";
import { rundBruch } from "./rundung.js";

// SI-Definitionen (keine fachlichen Konstanten): 1 s = 1000 ms, 1 min = 60 s, 1 h = 60 min.
export const MS_SEKUNDE = 1000;
export const MS_MINUTE = 60 * MS_SEKUNDE;
export const MS_STUNDE = 60 * MS_MINUTE;
const MS_KALENDERTAG_UTC = 24 * MS_STUNDE; // nur für reine Datumsrechnung in UTC (ohne Zeitumstellung)

const zwei = (n) => String(n).padStart(2, "0");

/** Ist s ein Tag "JJJJ-MM-TT"? */
export const istIsoTag = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function teile(tagIso) {
  if (!istIsoTag(tagIso)) throw new Error("zeit: Tag als 'JJJJ-MM-TT' erwartet, erhalten: " + tagIso);
  return [Number(tagIso.slice(0, 4)), Number(tagIso.slice(5, 7)), Number(tagIso.slice(8, 10))];
}

/** Örtlicher Kalendertag eines Zeitpunkts als "JJJJ-MM-TT". */
export function isoTag(ms) {
  const d = new Date(ms);
  return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate());
}

/** Unix-ms der örtlichen Mitternacht (00:00) eines Tages. */
export function mitternacht(tagIso) {
  const [j, m, t] = teile(tagIso);
  return new Date(j, m - 1, t).getTime();
}

/** Unix-ms einer örtlichen Uhrzeit: Tag + Minuten seit Mitternacht (Wanduhr; negative Minuten = Vorabend). */
export function lokal(tagIso, minuten) {
  const [j, m, t] = teile(tagIso);
  return new Date(j, m - 1, t, 0, minuten).getTime();
}

/** Kalendertag um n Tage verschieben (reine Datumsrechnung, unabhängig von Zeitzone und Zeitumstellung). */
export function plusTage(tagIso, n) {
  const [j, m, t] = teile(tagIso);
  const d = new Date(Date.UTC(j, m - 1, t) + n * MS_KALENDERTAG_UTC);
  return d.getUTCFullYear() + "-" + zwei(d.getUTCMonth() + 1) + "-" + zwei(d.getUTCDate());
}

/** Anzahl Kalendertage von a bis b (b − a). */
export function tageZwischen(a, b) {
  const [ja, ma, ta] = teile(a), [jb, mb, tb] = teile(b);
  return Math.round((Date.UTC(jb, mb - 1, tb) - Date.UTC(ja, ma - 1, ta)) / MS_KALENDERTAG_UTC);
}

/** Länge des örtlichen Kalendertags in ms (23, 24 oder 25 Stunden bei Zeitumstellung). */
export const tagLaengeMs = (tagIso) => mitternacht(plusTage(tagIso, 1)) - mitternacht(tagIso);

/** Wochentag 0 = Montag … 6 = Sonntag. */
export function wochentag(tagIso) {
  const [j, m, t] = teile(tagIso);
  return (new Date(Date.UTC(j, m - 1, t)).getUTCDay() + 6) % 7;
}

/** ISO-Kalenderwoche "JJJJ-Www" (ISO 8601-1:2019; formeln.json "zeit.iso_woche"). */
export function isoWoche(tagIso) {
  const donnerstag = plusTage(tagIso, 3 - wochentag(tagIso)); // Donnerstag derselben Woche bestimmt das Jahr
  const jahr = Number(donnerstag.slice(0, 4));
  const nr = Math.floor(tageZwischen(jahr + "-01-01", donnerstag) / 7) + 1;
  return jahr + "-W" + zwei(nr);
}

/** Montag der ISO-Woche eines Tages. */
export const wochenBeginn = (tagIso) => plusTage(tagIso, -wochentag(tagIso));

/** Kalendermonat "JJJJ-MM". */
export const monat = (tagIso) => (teile(tagIso), tagIso.slice(0, 7));

/** Minuten seit örtlicher Mitternacht des Kalendertags von ms (Wanduhr). */
export function uhrMinuten(ms) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Dauer als reine Daten: auf ganze Minuten gerundet (kaufmännisch), dann in Stunden und Minuten zerlegt.
 * @param {number} ms
 * @returns {{h:number, min:number, negativ:boolean, gesamtMin:number}}
 */
export function dauer(ms) {
  if (!Number.isFinite(ms)) return { h: 0, min: 0, negativ: false, gesamtMin: 0 };
  const gesamt = rundBruch(Math.round(ms), MS_MINUTE);
  const b = Math.abs(gesamt);
  return { h: Math.floor(b / 60), min: b % 60, negativ: gesamt < 0, gesamtMin: gesamt };
}

/** Schlafdauer im Bett (bis − von). */
const imBett = (s) => s.bis - s.von;

/**
 * Hauptschlaf eines Tages: längster Schlaf, der an diesem örtlichen Kalendertag endet und mindestens
 * "zeit.hauptschlaf_min" dauert. Gleich lang → der frühere.
 * @param {string} tagIso
 * @param {Array<{von:number,bis:number}>} schlaefe
 * @returns {object|null}
 */
export function hauptschlaf(tagIso, schlaefe = []) {
  const min = wert("zeit.hauptschlaf_min");
  let best = null;
  for (const s of schlaefe) {
    if (!s || !(s.bis > s.von) || isoTag(s.bis) !== tagIso || imBett(s) < min) continue;
    if (!best || imBett(s) > imBett(best) || (imBett(s) === imBett(best) && s.von < best.von)) best = s;
  }
  return best;
}

/**
 * Tagesgrenzen: vom Aufwachen aus dem Hauptschlaf des Tages bis zum Aufwachen am Folgetag (formeln.json
 * "zeit.tagesgrenzen"). Fehlt ein Hauptschlaf, gilt die örtliche Mitternacht. Die Fenster aufeinanderfolgender
 * Tage stoßen lückenlos aneinander.
 * @param {string} tagIso
 * @param {object} [einstellungen] darf `schlaf` (Schlaf[]) tragen
 * @param {Array} [schlaefe] Schlafdatensätze (Vorrang vor einstellungen.schlaf)
 * @returns {{von:number, bis:number, beginn:"aufwachen"|"mitternacht", ende:"aufwachen"|"mitternacht", quellen:Array}}
 */
export function tagesgrenzen(tagIso, einstellungen = {}, schlaefe) {
  const liste = schlaefe ?? einstellungen?.schlaf ?? [];
  const heute = hauptschlaf(tagIso, liste), morgen = hauptschlaf(plusTage(tagIso, 1), liste);
  let von = heute ? heute.bis : mitternacht(tagIso);
  let bis = morgen ? morgen.bis : mitternacht(plusTage(tagIso, 1));
  let beginn = heute ? "aufwachen" : "mitternacht", ende = morgen ? "aufwachen" : "mitternacht";
  if (!(bis > von)) { von = mitternacht(tagIso); bis = mitternacht(plusTage(tagIso, 1)); beginn = ende = "mitternacht"; }
  const quellen = [heute, morgen].filter(Boolean).map((s) => s.quelle).filter(Boolean);
  return { von, bis, beginn, ende, quellen };
}
