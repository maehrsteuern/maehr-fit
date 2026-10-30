/* kern/erholung.js – Erholung 0 bis 100.
 *
 * Kernaussage: Die Erholung vergleicht die letzte Nacht mit deinem persönlichen Normalbereich der vergangenen
 * 30 Tage. 50 Punkte heißt: ein für dich ganz üblicher Morgen. Eine höhere HRV, ein niedrigerer Ruhepuls und ein gut
 * gedeckter Schlafbedarf heben den Wert; eine auffällige Atemfrequenz, Hauttemperatur oder Sauerstoffsättigung
 * zieht Punkte ab. Jeder Teil steht mit Messwert, Normalbereich, Gewicht und Beitrag im Ergebnis (`teile`).
 *
 * Rechenweg (formeln.json "erholung"): z-Werte je Teil, gewichtet, × Punkte je Streuung, + Mitte, − Abzüge,
 * begrenzt auf 0..100 und kaufmännisch gerundet. Messwerte in ganzen Einheiten (Zehntel-ms, Zehntel-Atemzüge,
 * Zehntel-Prozent, Hundertstel-°C). Beschreibt Messwerte, stellt keine Diagnose. Kein DOM, kein Netz, kein Speicher.
 */
import { formel, wert } from "./formeln.js";
import { rund, begrenze } from "./rundung.js";
import { zWert } from "./basislinie.js";
import { vereinige } from "./quellen.js";

/** Rohdatensatz-Felder und Einheitenfaktor je Teil (Faktor aus formeln.json "einheit.*"). */
const ROH = {
  hrv: { feld: "rmssdMs", faktor: () => wert("einheit.hrv") },
  ruhepuls: { feld: "bpm", faktor: () => 1 },
  atem: { feld: "proMin", faktor: () => wert("einheit.atem") },
  spo2: { feld: "prozent", faktor: () => wert("einheit.spo2") },
  hauttemp: { feld: "deltaC", faktor: () => wert("einheit.hauttemp") },
};

/**
 * Messwert vereinheitlichen: Zahl (schon ganze Einheit), {wert, quellen} oder Rohdatensatz (z. B. {rmssdMs, quelle}).
 * @returns {{wert:number, quelle:object[]}|null}
 */
export function messwert(x, teil) {
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? { wert: x, quelle: [] } : null;
  const roh = ROH[teil];
  if (roh && Number.isFinite(x[roh.feld]) && !Number.isFinite(x.wert)) {
    return { wert: rund(x[roh.feld] * roh.faktor()), quelle: vereinige(x.quelle) };
  }
  if (!Number.isFinite(x.wert)) return null;
  return { wert: x.wert, quelle: vereinige(x.quellen, x.quelle) };
}

/** Stufe zum Wert (formeln.json "erholung.stufe.*"). */
export function stufe(w) {
  if (!Number.isFinite(w)) return null;
  if (w >= wert("erholung.stufe.gruen")) return "gruen";
  if (w <= wert("erholung.stufe.rot")) return "rot";
  return "gelb";
}

const basisKurz = (b) => (b ? { mittel: b.mittel, streuung: b.streuung, n: b.n, genug: b.genug, ln: b.ln } : null);
const ausgelassen = (name, roh, grund, schluessel) => ({ name, wert: roh?.wert ?? null, basis: null, z: null, gewicht: 0, beitrag: 0, quelle: roh?.quelle ?? [], ausgelassen: true, grund, formel: formel(schluessel) });

/** Hauptteil HRV: z aus ln(RMSSD in ms). */
function teilHrv(roh, basis) {
  const k = "erholung.gewicht.hrv";
  if (!roh) return ausgelassen("hrv", null, "kein_messwert", k);
  if (!basis?.genug) return ausgelassen("hrv", roh, "basis_zu_klein", k);
  const x = Math.log(roh.wert / wert("einheit.hrv"));
  return { name: "hrv", wert: roh.wert, x: rund(x, wert("basis.stellen")), basis: basisKurz(basis), z: zWert(x, basis, wert("erholung.streuung_min").hrv), richtung: 1, quelle: roh.quelle, formel: formel(k) };
}

/** Hauptteil Ruhepuls: umgekehrt – niedriger als üblich ist positiv. */
function teilRuhepuls(roh, basis) {
  const k = "erholung.gewicht.ruhepuls";
  if (!roh) return ausgelassen("ruhepuls", null, "kein_messwert", k);
  if (!basis?.genug) return ausgelassen("ruhepuls", roh, "basis_zu_klein", k);
  return { name: "ruhepuls", wert: roh.wert, basis: basisKurz(basis), z: zWert(roh.wert, basis, wert("erholung.streuung_min").ruhepuls), richtung: -1, quelle: roh.quelle, formel: formel(k) };
}

/** Hauptteil Schlaf: Schlafleistung gegen festes Ziel und feste Skala. */
function teilSchlaf(roh) {
  const k = "erholung.gewicht.schlaf";
  if (!roh) return ausgelassen("schlaf", null, "kein_messwert", k);
  const z = (roh.wert - wert("erholung.schlaf.ziel")) / wert("erholung.schlaf.skala");
  return { name: "schlaf", wert: roh.wert, basis: { mittel: wert("erholung.schlaf.ziel"), streuung: wert("erholung.schlaf.skala"), n: null, genug: true, ln: false }, z, richtung: 1, quelle: roh.quelle, formel: formel("erholung.schlaf.ziel") };
}

/** Abzug Atemfrequenz: Punkte × max(0, |z| − Schwelle). */
function abzugAtem(roh, basis) {
  const k = "erholung.atem.strafe_je_z";
  if (!roh) return ausgelassen("atem", null, "kein_messwert", k);
  if (!basis?.genug) return ausgelassen("atem", roh, "basis_zu_klein", k);
  const z = zWert(roh.wert, basis, wert("erholung.streuung_min").atem);
  const ueber = Math.max(0, Math.abs(z) - wert("erholung.atem.schwelle_z"));
  return { name: "atem", wert: roh.wert, basis: basisKurz(basis), z, gewicht: 0, beitrag: rund(-wert(k) * ueber, 1), abzug: true, quelle: roh.quelle, formel: formel(k) };
}

/** Abzug Hauttemperatur: Punkte je °C über der Schwelle (Abweichung kommt schon relativ zur Basis). */
function abzugHauttemp(roh) {
  const k = "erholung.hauttemp.strafe_je_grad";
  if (!roh) return ausgelassen("hauttemp", null, "kein_messwert", k);
  const ueber = Math.max(0, Math.abs(roh.wert) - wert("erholung.hauttemp.schwelle"));
  return { name: "hauttemp", wert: roh.wert, basis: null, z: null, gewicht: 0, beitrag: rund(-(wert(k) * ueber) / wert("einheit.hauttemp"), 1), abzug: true, quelle: roh.quelle, formel: formel(k) };
}

/** Abzug Sauerstoffsättigung: Punkte je Prozentpunkt unter der Schwelle. */
function abzugSpo2(roh) {
  const k = "erholung.spo2.strafe_je_prozent";
  if (!roh) return ausgelassen("spo2", null, "kein_messwert", k);
  const unter = Math.max(0, wert("erholung.spo2.schwelle") - roh.wert);
  return { name: "spo2", wert: roh.wert, basis: null, z: null, gewicht: 0, beitrag: rund(-(wert(k) * unter) / wert("einheit.spo2"), 1), abzug: true, quelle: roh.quelle, formel: formel(k) };
}

/**
 * Erholung eines Morgens.
 * @param {object} arg
 * @param {*} arg.hrv       nächtliche HRV (Zehntel-ms, {wert, quellen} oder Hrv-Datensatz)
 * @param {*} arg.ruhepuls  Ruhepuls (Schläge/min)
 * @param {*} arg.schlaf    Schlafleistung 0..100 (Zahl oder Ergebnis von schlafLeistung)
 * @param {*} [arg.atem]    Atemfrequenz (Zehntel/min)
 * @param {*} [arg.hauttemp] Abweichung der Hauttemperatur (Hundertstel °C)
 * @param {*} [arg.spo2]    Sauerstoffsättigung (Zehntel %)
 * @param {{hrv?:object, ruhepuls?:object, atem?:object}} arg.basis Basislinien (HRV logarithmiert)
 * @returns {{wert:number|null, stufe:string|null, roh:number|null, teile:object[], formel:object, quellen:object[], grund?:string}}
 */
export function erholung({ hrv, ruhepuls, schlaf, atem, hauttemp, spo2, basis = {} } = {}) {
  const grenze = wert("erholung.z_grenze"), punkte = wert("erholung.punkte_je_z");
  const haupt = [
    teilHrv(messwert(hrv, "hrv"), basis.hrv),
    teilRuhepuls(messwert(ruhepuls, "ruhepuls"), basis.ruhepuls),
    teilSchlaf(messwert(schlaf, "schlaf")),
  ];
  const gewichte = { hrv: wert("erholung.gewicht.hrv"), ruhepuls: wert("erholung.gewicht.ruhepuls"), schlaf: wert("erholung.gewicht.schlaf") };
  const da = haupt.filter((t) => !t.ausgelassen && t.z !== null);
  const summeW = da.reduce((a, t) => a + gewichte[t.name], 0);
  for (const t of haupt) {
    if (t.ausgelassen || t.z === null) continue;
    t.z = begrenze(t.z, -grenze, grenze);
    t.gewicht = rund(gewichte[t.name] / summeW, 4);           // Anteil nach Hochrechnung auf 100 %
    t.beitrag = rund((punkte * t.richtung * t.z * gewichte[t.name]) / summeW, 1);
    t.z = rund(t.z, 4);
  }
  const abzuege = [abzugAtem(messwert(atem, "atem"), basis.atem), abzugHauttemp(messwert(hauttemp, "hauttemp")), abzugSpo2(messwert(spo2, "spo2"))];
  for (const a of abzuege) if (a.z !== null && a.z !== undefined) a.z = rund(a.z, 4);
  const teile = [...haupt, ...abzuege];
  const quellen = vereinige(...teile.map((t) => t.quelle));
  const physio = da.some((t) => t.name === "hrv" || t.name === "ruhepuls");
  if (!physio) return { wert: null, stufe: null, roh: null, teile, formel: formel("erholung"), quellen, grund: "zu_wenig_daten" };
  const roh = rund(wert("erholung.mitte") + teile.reduce((a, t) => a + (t.beitrag || 0), 0), 1);
  const w = begrenze(rund(roh), 0, 100);
  return { wert: w, stufe: stufe(w), roh, teile, formel: formel("erholung"), quellen };
}
