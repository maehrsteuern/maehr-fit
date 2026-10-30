/* kern/zusammenfuehren.js – dieselbe Nacht und dasselbe Training aus mehreren Quellen zu einem Datensatz.
 *
 * Kernaussage: Kommt dieselbe Nacht oder dasselbe Training einmal aus Health Connect und einmal aus dem WHOOP-Export (CSV), sind das
 * zwei Datensätze mit verschiedener Kennung. Ohne Zusammenlegen zählte die zweite Nacht als Nickerchen und das Training doppelt
 * (Belastung doppelt). Zwei Datensätze gelten als derselbe, wenn sie sich mindestens zur Hälfte des kürzeren überdecken
 * (formeln.json "zusammenfuehren.ueberlappung"). Führend ist der Satz mit echten Daten (Schlafphasen bzw. Pulswerte, sonst
 * Phasensummen, sonst Health Connect, sonst der frühere); fehlende Felder (WHOOPs eigene Werte, Phasensummen, Zonenanteile,
 * Trainingsart) kommen aus dem anderen. Beide Quellen bleiben in `weitereQuellen` und damit im Belegfenster sichtbar.
 *
 * Punktwerte (HRV, Ruhepuls, Atemfrequenz, SpO2, Hauttemperatur) wählt `eineQuelle`: je Art und Nacht nur eine Quelle
 * (Health Connect, sonst CSV, sonst die übrigen), nie gemittelt.
 *
 * Reine Funktionen, kein DOM, kein Netz, kein Speicher.
 */
import { wert } from "./formeln.js";

/** Überdeckung in ms zweier Zeitspannen {von, bis}. */
const ueberdeckung = (a, b) => Math.min(a.bis, b.bis) - Math.max(a.von, b.von);

/** Gehören a und b zusammen (Überdeckung ≥ Anteil des kürzeren; ganzzahlig in Promille gerechnet)? */
export function gleicherSatz(a, b) {
  const kurz = Math.min(a.bis - a.von, b.bis - b.von);
  if (!(kurz > 0)) return false;
  return ueberdeckung(a, b) * 1000 >= wert("zusammenfuehren.ueberlappung") * kurz;
}

const hatPhasen = (s) => Array.isArray(s.phasen) && s.phasen.length > 0;
const hatSummen = (s) => !!s.phasenSummen && [s.phasenSummen.leichtMs, s.phasenSummen.tiefMs, s.phasenSummen.remMs].some((x) => Number.isFinite(x) && x > 0);
const hatProben = (t) => Array.isArray(t.herzschlaege) && t.herzschlaege.length >= 2;
const istHc = (x) => x.quelle?.art === "healthconnect";
const leer = (v) => v === undefined || v === null || (Array.isArray(v) && v.length === 0);

/** Rang eines Satzes als führender Satz (größer = besser). */
const rangSchlaf = (s) => (hatPhasen(s) ? 4 : 0) + (hatSummen(s) ? 2 : 0) + (istHc(s) ? 1 : 0);
const rangTraining = (t) => (hatProben(t) ? 4 : 0) + (istHc(t) ? 1 : 0);

/** Unbestimmte Trainingsart aus Health Connect ("hc_<Nr>") oder "sonstiges" gilt als unbekannt. */
const artUnbekannt = (a) => !a || /^hc_/.test(a) || a === "sonstiges";

function vereine(lead, andere, art) {
  const aus = { ...lead };
  for (const o of andere) {
    for (const [k, v] of Object.entries(o)) {
      if (k === "quelle" || k === "weitereQuellen" || k === "von" || k === "bis") continue;
      if (art === "schlaf" && (k === "phasen" || (k === "phasenSummen" && hatPhasen(lead)))) continue;
      if (art === "training" && k === "herzschlaege") continue;
      if (art === "training" && k === "art") { if (artUnbekannt(aus.art) && !artUnbekannt(v)) aus.art = v; continue; }
      if (k === "fremdwerte" && aus.fremdwerte && v) { aus.fremdwerte = { ...v, ...Object.fromEntries(Object.entries(aus.fremdwerte).filter(([, x]) => x !== null && x !== undefined)) }; continue; }
      if (leer(aus[k]) && !leer(v)) aus[k] = v;
    }
  }
  aus.weitereQuellen = [...(lead.weitereQuellen || []), ...andere.flatMap((o) => [o.quelle, ...(o.weitereQuellen || [])])].filter(Boolean);
  return aus;
}

/**
 * Liste von Spannen {von, bis} zusammenlegen.
 * @param {object[]} liste
 * @param {"schlaf"|"training"} art
 * @returns {object[]} nach Beginn sortiert; Sätze ohne Gegenstück unverändert (gleiches Objekt)
 */
export function zusammenlegen(liste, art) {
  const rang = art === "schlaf" ? rangSchlaf : rangTraining;
  const rest = (liste || []).filter((x) => x && x.bis >= x.von).slice().sort((a, b) => a.von - b.von || (istHc(b) - istHc(a)));
  const gruppen = [];
  for (const x of rest) {
    const g = gruppen.find((gr) => gr.some((y) => gleicherSatz(x, y)));
    if (g) g.push(x); else gruppen.push([x]);
  }
  return gruppen.map((g) => {
    if (g.length === 1) return g[0];
    const lead = g.reduce((b, x) => (rang(x) > rang(b) ? x : b), g[0]);
    return vereine(lead, g.filter((x) => x !== lead), art);
  }).sort((a, b) => a.von - b.von);
}

/** Datenbündel mit zusammengelegten Nächten und Trainings (die übrigen Arten unverändert). Mehrfaches Anwenden ändert nichts mehr. */
export function zusammenfuehren(daten = {}) {
  return { ...daten, schlaf: zusammenlegen(daten.schlaf, "schlaf"), training: zusammenlegen(daten.training, "training") };
}

const RANG_QUELLE = ["healthconnect", "csv"];
/**
 * Messreihe auf eine Quelle beschränken: Health Connect, sonst CSV, sonst die erste vorhandene Art.
 * @param {Array<{quelle?:{art:string}}>} liste
 */
export function eineQuelle(liste) {
  if (!liste || liste.length < 2) return liste || [];
  const arten = new Set(liste.map((x) => x.quelle?.art ?? ""));
  if (arten.size < 2) return liste;
  const wahl = RANG_QUELLE.find((a) => arten.has(a)) ?? [...arten][0];
  return liste.filter((x) => (x.quelle?.art ?? "") === wahl);
}
