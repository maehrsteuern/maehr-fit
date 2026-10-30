// Import des WHOOP-Datenexports (CSV-Dateien aus dem ZIP) → normierte Messwerte.
//
// Dateien (WHOOP-App → Einstellungen → Data Export, per E-Mail-Link als ZIP):
//   physiological_cycles.csv  → Ruhepuls, Hrv, SpO2, Hauttemp, Fremdwerte (Erholung, Tagesbelastung, Schlafleistung)
//   sleeps.csv                → Schlaf (nur Summen je Phase, keine Zeitachse), Atemfrequenz
//   workouts.csv              → Training (nur Zonenanteile in %, keine Einzelherzschläge)
//   journal_entries.csv       → Tagebuch (Ja/Nein je Frage)
//
// Spaltennamen werden über den Namen gesucht (nicht über die Position), tolerant gegenüber Groß-/Kleinschreibung,
// Leer- und Sonderzeichen ("Recovery score %" = "recovery score (%)"). Fehlende Spalten ergeben null.
// Deutscher Export (Kopfzeilen vom Nutzer, 30.10.2026): jeweils als weitere Angabe hinter den englischen Namen.
// Die englischen Spaltennamen stammen aus Nutzerberichten und eigener Kenntnis, nicht aus einer WHOOP-Dokumentation
// (docs/technik/daten.md, Abschnitt "Was bestätigt ist").
//
// WHOOPs eigene Werte bleiben als `fremdwerte` erhalten, damit die App "WHOOP sagte X, MF rechnet Y" zeigen kann.

import { leseZeit, versatzFuer, tagIso } from "./zeit.js";
import { leeresPaket } from "./ablage.js";

// ---------------------------------------------------------------------------------------------------
// CSV nach RFC 4180
// ---------------------------------------------------------------------------------------------------

/** Trennzeichen raten: Komma (WHOOP) oder Semikolon (in deutschem Excel neu gespeichert) oder Tab. */
function rateTrenner(text) {
  const zaehl = { ",": 0, ";": 0, "\t": 0 };
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQ = !inQ;
    else if (!inQ && (c === "\n" || c === "\r")) break;
    else if (!inQ && c in zaehl) zaehl[c] += 1;
  }
  if (zaehl[";"] > zaehl[","] && zaehl[";"] >= zaehl["\t"]) return ";";
  if (zaehl["\t"] > zaehl[","]) return "\t";
  return ",";
}

/**
 * CSV-Text zerlegen (RFC 4180): Anführungszeichen, verdoppelte "" im Feld, Zeilenumbrüche im Feld,
 * CRLF/LF/CR, BOM. Leere Zeilen werden übersprungen.
 * @returns {{ kopf: string[], zeilen: {zeile:number, werte:string[]}[], trenner: string }}
 *   `zeile` = physische Zeilennummer (1 = Kopf), an der der Datensatz beginnt.
 */
export function parseCsv(text, trenner) {
  let s = String(text ?? "");
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const t = trenner || rateTrenner(s);
  const saetze = [];
  let feld = "";
  let satz = [];
  let inQ = false;
  let zeile = 1;
  let start = 1;
  let feldAngefangen = false;
  const satzEnde = () => {
    satz.push(feld);
    if (!(satz.length === 1 && satz[0] === "" && !feldAngefangen)) saetze.push({ zeile: start, werte: satz });
    satz = [];
    feld = "";
    feldAngefangen = false;
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { feld += '"'; i++; } else inQ = false;
      } else {
        if (c === "\n" || (c === "\r" && s[i + 1] !== "\n")) zeile++;
        feld += c;
      }
      continue;
    }
    if (c === '"') { inQ = true; feldAngefangen = true; continue; }
    if (c === t) { satz.push(feld); feld = ""; feldAngefangen = true; continue; }
    if (c === "\r" || c === "\n") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      satzEnde();
      zeile++;
      start = zeile;
      continue;
    }
    feld += c;
    feldAngefangen = true;
  }
  if (feld !== "" || satz.length || feldAngefangen) satzEnde();
  const [kopfSatz, ...rest] = saetze;
  return { kopf: kopfSatz ? kopfSatz.werte.map((k) => k.trim()) : [], zeilen: rest, trenner: t };
}

/** Spaltenname vereinheitlichen: klein, nur Buchstaben und Ziffern. */
export function normName(n) {
  return String(n ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------------------------------
// Spalten je Datei (erste Angabe = WHOOP-Name, weitere = tolerierte Varianten)
// ---------------------------------------------------------------------------------------------------

export const SPALTEN = {
  zyklusStart: ["Cycle start time", "Cycle start", "Startzeit des Zyklus"],
  zyklusEnde: ["Cycle end time", "Cycle end", "Endzeit des Zyklus"],
  zone: ["Cycle timezone", "Timezone", "Time zone", "Zeitzone des Zyklus"],
  erholung: ["Recovery score %", "Recovery score", "Recovery", "Erholungswert %"],
  ruhepuls: ["Resting heart rate (bpm)", "Resting heart rate", "RHR", "Ruheherzfrequenz (Schläge pro Minute)"],
  hrv: ["Heart rate variability (ms)", "Heart rate variability", "HRV (ms)", "HRV", "Herzfrequenzvariabilität (ms)"],
  hauttemp: ["Skin temp (celsius)", "Skin temperature (celsius)", "Skin temp", "Hauttemperatur (Celsius)"],
  spo2: ["Blood oxygen %", "Blood oxygen", "SpO2 %", "SpO2", "Blutsauerstoff %"],
  tagesbelastung: ["Day Strain", "Strain", "Tagesbelastung"],
  einschlafen: ["Sleep onset", "Sleep start time", "Beginn des Schlafs"],
  aufwachen: ["Wake onset", "Sleep end time", "Beginn des Aufwachens"],
  schlafLeistung: ["Sleep performance %", "Sleep performance", "Schlafleistung %"],
  atem: ["Respiratory rate (rpm)", "Respiratory rate", "Atemfrequenz (Atemzüge/Min.)"],
  schlafMin: ["Asleep duration (min)", "Schlafdauer (Min.)"],
  imBettMin: ["In bed duration (min)", "Dauer im Bett (Min.)"],
  leichtMin: ["Light sleep duration (min)", "Dauer des Leichtschlafs (Min.)"],
  tiefMin: ["Deep (SWS) duration (min)", "Deep sleep duration (min)", "SWS duration (min)", "Dauer des Tiefschlafs (Min.)"],
  remMin: ["REM duration (min)", "REM sleep duration (min)", "Dauer des REM-Schlafs (Min.)"],
  wachMin: ["Awake duration (min)", "Dauer des Aufwachens (Min.)"],
  bedarfMin: ["Sleep need (min)", "Schlafbedarf (Min.)"],
  schuldMin: ["Sleep debt (min)", "Schlafdefizit (Min.)"],
  effizienz: ["Sleep efficiency %", "Sleep efficiency", "Schlafeffizienz %"],
  konstanz: ["Sleep consistency %", "Sleep consistency", "Schlafbeständigkeit %"],
  nickerchen: ["Nap", "Nickerchen"],
  trainingStart: ["Workout start time", "Workout start", "Startzeit des Trainings"],
  trainingEnde: ["Workout end time", "Workout end", "Endzeit des Trainings"],
  dauerMin: ["Duration (min)", "Dauer (Min.)"],
  aktivitaet: ["Activity name", "Activity", "Sport", "Name der Aktivität"],
  trainingsbelastung: ["Activity Strain", "Workout strain", "Aktivitätsbelastung"],
  energie: ["Energy burned (cal)", "Energy burned (kcal)", "Calories", "Verbrannte Energie (cal)"],
  maxPuls: ["Max HR (bpm)", "Max heart rate (bpm)", "Max HF (Schläge pro Minute)"],
  mittelPuls: ["Average HR (bpm)", "Average heart rate (bpm)", "Durchschnittliche HF (Schläge pro Minute)"],
  zone1: ["HR Zone 1 %", "HF-Zone 1 %"], zone2: ["HR Zone 2 %", "HF-Zone 2 %"], zone3: ["HR Zone 3 %", "HF-Zone 3 %"], zone4: ["HR Zone 4 %", "HF-Zone 4 %"], zone5: ["HR Zone 5 %", "HF-Zone 5 %"],
  distanz: ["Distance (meters)", "Distance (m)"],
  frage: ["Question text", "Question", "Fragetext"],
  antwort: ["Answered yes", "Answer", "Beantwortet mit Ja"],
  notiz: ["Notes", "Note", "Anmerkungen"],
};

/**
 * Dateiart erkennen: zuerst am Namen, sonst an typischen Spalten.
 * Englischer Export: physiological_cycles, sleeps, workouts, journal_entries. Deutscher Export (Befund 30.10.2026, Dateinamen
 * vom Nutzer): physiologische_zyklen, Schlaf, Trainings, logbuch_eintraege – ohne Rücksicht auf Groß-/Kleinschreibung, Ordner
 * und Endung. „schlaf“ und „training(s)“ gelten nur als ganzer Dateiname, damit fremde Dateien nicht versehentlich passen.
 */
export function erkenneDatei(name, kopf = []) {
  const n = String(name || "").toLowerCase();
  const stamm = n.split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/, "");
  if (n.includes("physiological_cycles") || n.includes("physiological-cycles") || stamm.includes("physiologische_zyklen") || stamm.includes("physiologische-zyklen")) return "zyklen";
  if (n.includes("sleeps") || stamm === "schlaf") return "schlaf";
  if (n.includes("workouts") || stamm === "trainings" || stamm === "training") return "training";
  if (n.includes("journal_entries") || n.includes("journal") || stamm.includes("logbuch")) return "tagebuch";
  const k = new Set(kopf.map(normName));
  const hat = (feld) => SPALTEN[feld].some((x) => k.has(normName(x)));
  if (hat("frage") && hat("antwort")) return "tagebuch";
  if (hat("trainingStart")) return "training";
  if (hat("erholung") || hat("tagesbelastung")) return "zyklen";
  if (hat("einschlafen") && hat("aufwachen")) return "schlaf";
  return null;
}

function spaltenIndex(kopf) {
  const index = new Map(kopf.map((k, i) => [normName(k), i]));
  const aus = {};
  for (const [feld, namen] of Object.entries(SPALTEN)) {
    const treffer = namen.map((x) => index.get(normName(x))).find((i) => i !== undefined);
    if (treffer !== undefined) aus[feld] = treffer;
  }
  return aus;
}

// ---------------------------------------------------------------------------------------------------
// Werte lesen
// ---------------------------------------------------------------------------------------------------

/** Zahl aus Text: "45.3", "45,3" (Dezimalkomma, auch deutsche Dateien mit ";"), "87 %", "" → null. Tausenderpunkte werden nicht gelesen. */
export function leseZahl(text) {
  if (text === null || text === undefined) return null;
  let s = String(text).trim().replace(/%$/, "").trim();
  if (s === "" || /^(n\/?a|null|none|-)$/i.test(s)) return null;
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Ja/Nein aus Text → true/false/null. */
export function leseJaNein(text) {
  const s = String(text ?? "").trim().toLowerCase();
  if (["true", "yes", "ja", "1", "y", "wahr"].includes(s)) return true;
  if (["false", "no", "nein", "0", "n", "falsch"].includes(s)) return false;
  return null;
}

/** Minuten (Zahl) → ganze Millisekunden. */
function minZuMs(min) {
  return min === null ? null : Math.round(min * 60000);
}

/** Fragetext → Schlüssel: "Did you drink alcohol?" → "did_you_drink_alcohol". */
export function frageSchluessel(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Bekannte WHOOP-Aktivitätsnamen → MF-Kürzel (wie bei Health Connect). Sonst: Name als Kürzel. */
const AKTIVITAETEN = {
  running: "laufen", cycling: "radfahren", walking: "gehen", hiking: "wandern", "hiking/rucking": "wandern",
  weightlifting: "gewichtheben", "strength trainer": "krafttraining", "functional fitness": "krafttraining",
  yoga: "yoga", hiit: "hiit", swimming: "schwimmen_becken", rowing: "rudern", pilates: "pilates",
  stretching: "dehnen", soccer: "fussball", tennis: "tennis", spin: "heimtrainer", elliptical: "crosstrainer",
  activity: "sonstiges", other: "sonstiges",
};
function aktivitaetKuerzel(name) {
  const k = String(name ?? "").trim().toLowerCase();
  return AKTIVITAETEN[k] || frageSchluessel(k) || "sonstiges";
}

function median(werte) {
  const s = [...werte].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// ---------------------------------------------------------------------------------------------------
// Zuordnung je Datei
// ---------------------------------------------------------------------------------------------------

function zeilenLeser(kopf, satz, optionen) {
  const sp = spaltenIndex(kopf);
  return {
    sp,
    text: (feld) => (sp[feld] === undefined ? null : (satz.werte[sp[feld]] ?? "").trim()),
    zahl(feld) { return leseZahl(this.text(feld)); },
    zone() { const z = this.text("zone"); return z ? z : optionen.zone; },
    zeit(feld) { return leseZeit(this.text(feld), this.zone()); },
    zoneMin(t) { const z = this.zone(); return z === undefined || z === null ? undefined : versatzFuer(z, t) ?? undefined; },
  };
}

function quelleCsv(datei, zeile, id) {
  return { art: "csv", id, datei, zeile };
}

function mitZone(d, zoneMin) {
  if (zoneMin !== undefined) d.zoneMin = zoneMin;
  return d;
}

/** Spalten, ohne die eine Datei keine Zeile ergibt (Feldnamen aus SPALTEN). */
const ERFORDERLICH = { zyklen: ["zyklusStart"], schlaf: ["einschlafen", "aufwachen"], training: ["trainingStart"], tagebuch: ["zyklusStart", "frage"] };

/** Hinweis mit der Kopfzeile einer Datei (nur Spaltennamen, nie Werte) – damit man sie abfotografieren und die Zuordnung ergänzen kann. */
export function kopfHinweis(datei, kopf, text) {
  return { datei, zeile: 1, text, kopf: [...kopf] };
}

function fehlendeSpalten(art, kopf) {
  const index = spaltenIndex(kopf);
  return (ERFORDERLICH[art] || []).filter((f) => index[f] === undefined);
}

function zyklen(datei, csv, optionen, paket, hinweise) {
  const hautRoh = [];
  for (const satz of csv.zeilen) {
    const z = zeilenLeser(csv.kopf, satz, optionen);
    const start = z.zeit("zyklusStart");
    if (start === null) {
      hinweise.push({ datei, zeile: satz.zeile, text: "Zyklusbeginn fehlt oder ist unlesbar – Zeile übersprungen." });
      continue;
    }
    // Messzeitpunkt der Nachtwerte = Aufwachen; fehlt es, Zyklusbeginn (markiert).
    const wach = z.zeit("aufwachen");
    const t = wach ?? start;
    const zoneMin = z.zoneMin(t);
    const zusatz = wach === null ? { zeitGeschaetzt: true } : {};
    if (wach === null) hinweise.push({ datei, zeile: satz.zeile, text: "Aufwachzeit fehlt – Zyklusbeginn als Messzeit genutzt." });
    const basis = `whoop:zyklus:${start}`;
    const q = (art) => quelleCsv(datei, satz.zeile, `${basis}:${art}`);
    const rhr = z.zahl("ruhepuls");
    if (rhr !== null) paket.ruhepuls.push(mitZone({ t, bpm: rhr, ...zusatz, quelle: q("ruhepuls") }, zoneMin));
    const hrv = z.zahl("hrv");
    if (hrv !== null) paket.hrv.push(mitZone({ t, rmssdMs: hrv, ...zusatz, quelle: q("hrv") }, zoneMin));
    const spo2 = z.zahl("spo2");
    if (spo2 !== null) paket.spo2.push(mitZone({ t, prozent: spo2, ...zusatz, quelle: q("spo2") }, zoneMin));
    const haut = z.zahl("hauttemp");
    if (haut !== null) hautRoh.push({ t, mc: Math.round(haut * 1000), zoneMin, zusatz, quelle: q("hauttemp") });
    // Tag der WHOOP-Werte: Aufwachtag; ohne Aufwachzeit die Zyklusmitte (siehe Tagebuch), sonst Zyklusbeginn.
    const ende = z.zeit("zyklusEnde");
    const tagBezug = wach ?? (ende !== null && ende > start ? start + Math.floor((ende - start) / 2) : start);
    const fw = { erholung: z.zahl("erholung"), belastung: z.zahl("tagesbelastung"), schlafLeistung: z.zahl("schlafLeistung") };
    if (fw.erholung !== null || fw.belastung !== null || fw.schlafLeistung !== null) {
      paket.fremdwerte.push(mitZone({
        tag: tagIso(tagBezug, z.zoneMin(tagBezug)), t, anbieter: "whoop", ...fw, ...zusatz, quelle: q("fremdwerte"),
      }, zoneMin));
    }
  }
  // WHOOP liefert die Hauttemperatur absolut. Normiert ist die Abweichung: hier zum Median aller Werte dieses
  // Imports (in Tausendstel Grad gerechnet). Die eigentliche Basislinie bildet der Kern (basislinie()).
  const basisMc = median(hautRoh.map((h) => h.mc));
  for (const h of hautRoh) {
    paket.hauttemp.push(mitZone({
      t: h.t, deltaC: (h.mc - basisMc) / 1000, absolutC: h.mc / 1000, basisC: basisMc / 1000,
      deltaBasis: "median_import", ...h.zusatz, quelle: h.quelle,
    }, h.zoneMin));
  }
}

function schlaf(datei, csv, optionen, paket, hinweise) {
  for (const satz of csv.zeilen) {
    const z = zeilenLeser(csv.kopf, satz, optionen);
    const von = z.zeit("einschlafen");
    const bis = z.zeit("aufwachen");
    if (von === null || bis === null || bis <= von) {
      hinweise.push({ datei, zeile: satz.zeile, text: "Einschlaf- oder Aufwachzeit fehlt oder ist unlesbar – Zeile übersprungen." });
      continue;
    }
    const zoneMin = z.zoneMin(bis);
    const basis = `whoop:schlaf:${von}`;
    const d = {
      von,
      bis,
      phasen: [], // WHOOP-Export enthält keine Zeitachse der Phasen
      phasenSummen: {
        wachMs: minZuMs(z.zahl("wachMin")),
        leichtMs: minZuMs(z.zahl("leichtMin")),
        tiefMs: minZuMs(z.zahl("tiefMin")),
        remMs: minZuMs(z.zahl("remMin")),
      },
      schlafMs: minZuMs(z.zahl("schlafMin")),
      imBettMs: minZuMs(z.zahl("imBettMin")),
      bedarfMs: minZuMs(z.zahl("bedarfMin")),
      schuldMs: minZuMs(z.zahl("schuldMin")),
      effizienzProzent: z.zahl("effizienz"),
      konstanzProzent: z.zahl("konstanz"),
      nickerchen: leseJaNein(z.text("nickerchen")) === true,
      fremdwerte: { anbieter: "whoop", schlafLeistung: z.zahl("schlafLeistung") },
      quelle: quelleCsv(datei, satz.zeile, basis),
    };
    paket.schlaf.push(mitZone(d, zoneMin));
    const atem = z.zahl("atem");
    if (atem !== null) {
      paket.atemfrequenz.push(mitZone({ t: bis, proMin: atem, quelle: quelleCsv(datei, satz.zeile, `${basis}:atem`) }, zoneMin));
    }
  }
}

function training(datei, csv, optionen, paket, hinweise) {
  for (const satz of csv.zeilen) {
    const z = zeilenLeser(csv.kopf, satz, optionen);
    const von = z.zeit("trainingStart");
    let bis = z.zeit("trainingEnde");
    const dauer = minZuMs(z.zahl("dauerMin"));
    if (von !== null && bis === null && dauer !== null) bis = von + dauer;
    if (von === null || bis === null || bis <= von) {
      hinweise.push({ datei, zeile: satz.zeile, text: "Trainingsbeginn oder -ende fehlt oder ist unlesbar – Zeile übersprungen." });
      continue;
    }
    const name = z.text("aktivitaet") || "";
    const zonen = ["zone1", "zone2", "zone3", "zone4", "zone5"].map((f) => z.zahl(f));
    const d = {
      von,
      bis,
      art: aktivitaetKuerzel(name),
      name,
      herzschlaege: [], // WHOOP-Export: keine Einzelherzschläge
      zonenProzent: zonen.every((x) => x === null) ? null : zonen,
      maxPuls: z.zahl("maxPuls"),
      mittelPuls: z.zahl("mittelPuls"),
      energieKcal: z.zahl("energie"),
      distanzM: z.zahl("distanz"),
      fremdwerte: { anbieter: "whoop", belastung: z.zahl("trainingsbelastung") },
      quelle: quelleCsv(datei, satz.zeile, `whoop:training:${von}`),
    };
    paket.training.push(mitZone(d, z.zoneMin(von)));
  }
}

function tagebuch(datei, csv, optionen, paket, hinweise) {
  const tage = new Map();
  for (const satz of csv.zeilen) {
    const z = zeilenLeser(csv.kopf, satz, optionen);
    const start = z.zeit("zyklusStart");
    const frage = z.text("frage");
    if (start === null || !frage) {
      hinweise.push({ datei, zeile: satz.zeile, text: "Zyklusbeginn oder Frage fehlt – Zeile übersprungen." });
      continue;
    }
    // Tag = Kalendertag der Zyklusmitte. Ein WHOOP-Zyklus läuft von Einschlafen (meist am Vorabend) bis zum
    // nächsten Einschlafen; die Mitte liegt sicher im gemeinten Tag. Ohne Zyklusende: Tag des Zyklusbeginns.
    const ende = z.zeit("zyklusEnde");
    const bezug = ende !== null && ende > start ? start + Math.floor((ende - start) / 2) : start;
    const tag = tagIso(bezug, z.zoneMin(bezug));
    if (!tage.has(tag)) {
      tage.set(tag, {
        tag, eintraege: {}, fragen: {}, notizen: {},
        quelle: quelleCsv(datei, satz.zeile, `whoop:tagebuch:${tag}`), zeilen: [],
      });
    }
    const e = tage.get(tag);
    const k = frageSchluessel(frage);
    const ja = leseJaNein(z.text("antwort"));
    if (ja !== null) e.eintraege[k] = ja;
    else {
      const n = z.zahl("antwort");
      if (n !== null) e.eintraege[k] = n;
    }
    e.fragen[k] = frage;
    const notiz = z.text("notiz");
    if (notiz) e.notizen[k] = notiz;
    e.zeilen.push(satz.zeile);
  }
  paket.tagebuch.push(...tage.values());
}

/**
 * WHOOP-Export importieren.
 * @param {{name:string, text:string}[]} dateien CSV-Dateien (Namen wie im ZIP)
 * @param {{zone?: number|string}} [optionen] Zeitzone, falls die CSV keine Spalte "Cycle timezone" hat
 *   (Minuten Versatz, "UTC+01:00" oder IANA-Name). Ohne Angabe: Gerätezeitzone.
 * @returns {{ paket: object, hinweise: {datei,zeile,text}[], dateien: {name, art, zeilen}[] }}
 */
export function importiereWhoop(dateien, optionen = {}) {
  const paket = leeresPaket();
  const hinweise = [];
  const uebersicht = [];
  for (const datei of dateien) {
    const name = String(datei.name || "").split(/[\\/]/).pop();
    const csv = parseCsv(datei.text);
    const art = erkenneDatei(name, csv.kopf);
    uebersicht.push({ name, art, zeilen: csv.zeilen.length });
    if (!art) {
      hinweise.push(kopfHinweis(name, csv.kopf, "Datei nicht erkannt – nicht importiert."));
      continue;
    }
    // Erkannt, aber Spaltennamen passen nicht (z. B. andere Sprache): Zeilen nicht raten, Kopfzeile melden
    const fehlt = fehlendeSpalten(art, csv.kopf);
    if (fehlt.length) {
      hinweise.push(kopfHinweis(name, csv.kopf, `Pflichtspalten nicht gefunden (${fehlt.map((f) => SPALTEN[f][0]).join(", ")}) – Datei nicht importiert.`));
      uebersicht[uebersicht.length - 1].fehlt = fehlt;
      continue;
    }
    if (art === "zyklen") zyklen(name, csv, optionen, paket, hinweise);
    if (art === "schlaf") schlaf(name, csv, optionen, paket, hinweise);
    if (art === "training") training(name, csv, optionen, paket, hinweise);
    if (art === "tagebuch") tagebuch(name, csv, optionen, paket, hinweise);
  }
  return { paket, hinweise, dateien: uebersicht };
}
