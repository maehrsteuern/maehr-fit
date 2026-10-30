// Adapter Android Health Connect → normierte Messwerte (docs/technik/schnittstellen.md).
//
// Aufbau:
//  1. Die Brücke `window.MF.native.healthConnect` (vom Capacitor-Plugin, siehe daten/bruecke_capacitor.js) liefert
//     Rohdatensätze im "Brückenformat" (docs/technik/healthconnect.md): Feldnamen wie in Health Connect,
//     alle Zeiten als Unix-ms.
//  2. Die Zuordnung hier ist rein (keine Brücke, kein Speicher) und wird mit Fixtures getestet.
//  3. `synchronisieren` holt je Datenart nur das Neue seit dem letzten Abgleich und legt es im Speicher ab.
//
// Health Connect wird nur gelesen. Es gibt keine Netzverbindung.

import { zeitMs } from "./zeit.js";
import { ARTEN, leeresPaket, paketeVereinen, speichereMessungen, tagVon } from "./ablage.js";

/** Gelesene Health-Connect-Datenarten, in Abgleich-Reihenfolge (Training zuletzt, braucht Herzschlag). */
export const RECORD_TYPEN = [
  "HeartRate",
  "HeartRateVariabilityRmssd",
  "RestingHeartRate",
  "RespiratoryRate",
  "OxygenSaturation",
  "SkinTemperature",
  "SleepSession",
  "ExerciseSession",
];

/** Health-Connect-Datenart → Art im Messpaket. */
export const ART_ZU_PAKET = {
  HeartRate: "herzschlag",
  HeartRateVariabilityRmssd: "hrv",
  RestingHeartRate: "ruhepuls",
  RespiratoryRate: "atemfrequenz",
  OxygenSaturation: "spo2",
  SkinTemperature: "hauttemp",
  SleepSession: "schlaf",
  ExerciseSession: "training",
};

/**
 * Schlafstufen von Health Connect (SleepSessionRecord.STAGE_TYPE_*, Werte aus connect-client 1.1.0-alpha08)
 * → MF-Phasen. `null` = nicht verwertbar (Lücke).
 * SLEEPING (2) heißt "schläft, Stufe unbekannt": wird als "leicht" geführt und mit `unbestimmt: true` markiert.
 */
export const SCHLAFSTUFEN = {
  0: null, // UNKNOWN
  1: "wach", // AWAKE
  2: "leicht", // SLEEPING (unbestimmt)
  3: "wach", // OUT_OF_BED
  4: "leicht", // LIGHT
  5: "tief", // DEEP
  6: "rem", // REM
  7: "wach", // AWAKE_IN_BED
};
const STUFEN_NAMEN = {
  UNKNOWN: 0, AWAKE: 1, SLEEPING: 2, OUT_OF_BED: 3, LIGHT: 4, DEEP: 5, REM: 6, AWAKE_IN_BED: 7,
};

/** Häufige Trainingsarten (ExerciseSessionRecord.EXERCISE_TYPE_*) → MF-Kürzel. Andere: "hc_<nummer>". */
export const TRAININGSARTEN = {
  0: "sonstiges", 8: "radfahren", 9: "heimtrainer", 25: "crosstrainer", 33: "atemuebung", 36: "hiit",
  37: "wandern", 48: "pilates", 53: "rudern", 54: "rudergeraet", 56: "laufen", 57: "laufband", 64: "fussball",
  70: "krafttraining", 71: "dehnen", 73: "schwimmen_freiwasser", 74: "schwimmen_becken", 76: "tennis",
  79: "gehen", 81: "gewichtheben", 83: "yoga",
};

/**
 * Technische Vorgaben des Abgleichs (keine Rechenformeln, daher nicht in kern/formeln/formeln.json).
 * - ersterZeitraumMs: Wie weit der erste Abgleich zurückgreift. Health Connect gibt ohne Zusatzrecht
 *   (READ_HEALTH_DATA_HISTORY) ohnehin nur Daten bis 30 Tage vor der ersten Freigabe heraus.
 * - ueberlappungMs: Jeder weitere Abgleich beginnt so viel früher als der letzte endete, weil WHOOP
 *   Daten verzögert nach Health Connect schreibt. Doppelte fängt der Abgleich über quelle.id ab.
 * - fensterMs: Größe eines Lesefensters. Ein Tag Herzschlag im Sekundentakt sind rund 86 400 Werte.
 * - kleinsterFensterMs: Scheitert ein Fenster, wird es halbiert, bis höchstens diese Größe erreicht ist (Befund 30.10.2026:
 *   Ein einzelnes gescheitertes Tagesfenster brach früher die ganze Art ab, die App zeigte nur Tage bis dorthin).
 * - wiederholungen / wartenMs: Versuche und Pause (ms) für ein kleinstes Fenster, bevor es als Lücke gilt.
 * - luckenSerieMax: So viele Lücken hintereinander, dann gibt der Abgleich diese Art für diesen Lauf auf.
 * - lesenZeitgrenzeMs / rechteZeitgrenzeMs: Antwortet die Brücke so lange nicht, wird der Aufruf mit einer Meldung beendet,
 *   statt endlos zu hängen (Lesen bzw. Rechte-Dialog).
 */
export const VORGABEN = {
  ersterZeitraumMs: 30 * 24 * 3600 * 1000,
  ueberlappungMs: 48 * 3600 * 1000,
  fensterMs: 24 * 3600 * 1000,
  kleinsterFensterMs: 3 * 3600 * 1000,
  wiederholungen: 1,
  wartenMs: 1500,
  luckenSerieMax: 3,
  lesenZeitgrenzeMs: 120 * 1000,
  rechteZeitgrenzeMs: 180 * 1000,
};

/** Fehlercodes des Kotlin-Plugins, bei denen Wiederholen oder Halbieren nichts hilft. */
const ENDGUELTIG = new Set(["keine_berechtigung", "nicht_unterstuetzt", "nicht_verfuegbar", "ungueltig"]);
const endgueltig = (fehler) => !!fehler && (ENDGUELTIG.has(fehler.code) || /berechtigung|permission|SecurityException/i.test(String(fehler.message || "")));

/** Promise mit Zeitgrenze: antwortet es nicht in `ms`, kommt ein Fehler mit `text`. */
export function mitZeitgrenze(promise, ms, text) {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  let uhr;
  const grenze = new Promise((_, nein) => { uhr = setTimeout(() => nein(Object.assign(new Error(text), { code: "zeitgrenze" })), ms); });
  return Promise.race([promise, grenze]).finally(() => clearTimeout(uhr));
}

export const SYNC_PRAEFIX = "sync:healthconnect:";

// ---------------------------------------------------------------------------------------------------
// Reine Zuordnung
// ---------------------------------------------------------------------------------------------------

function quelleHc(roh, typ, zusatz) {
  const meta = roh.metadata || {};
  const grundId = meta.id || `${typ}:${zeitMs(roh.time ?? roh.startTime)}`;
  const q = {
    art: "healthconnect",
    id: zusatz === undefined ? grundId : `${grundId}#${zusatz}`,
    datei: `HealthConnect/${typ}`,
  };
  if (meta.dataOrigin) q.herkunft = String(meta.dataOrigin);
  return q;
}

function zoneVon(roh, feld = "zoneOffsetSek") {
  const s = roh[feld] ?? roh.startZoneOffsetSek;
  return typeof s === "number" && Number.isFinite(s) ? Math.round(s / 60) : undefined;
}

function mitZone(d, zoneMin) {
  if (zoneMin !== undefined) d.zoneMin = zoneMin;
  return d;
}

function zahl(w) {
  if (w === null || w === undefined || w === "") return null;
  const n = typeof w === "number" ? w : Number(w);
  return Number.isFinite(n) ? n : null;
}

function stufeNummer(s) {
  if (typeof s === "number") return s;
  if (typeof s === "string") {
    const k = s.trim().toUpperCase().replace(/^STAGE_TYPE_/, "");
    if (k in STUFEN_NAMEN) return STUFEN_NAMEN[k];
    if (/^\d+$/.test(k)) return Number(k);
  }
  return 0;
}

/** HeartRate (Serie) → Herzschlag[] je Einzelmessung. */
export function herzschlaegeAus(roh) {
  const aus = [];
  for (const r of roh) {
    const z = zoneVon(r, "startZoneOffsetSek");
    for (const s of r.samples || []) {
      const t = zeitMs(s.time);
      const bpm = zahl(s.beatsPerMinute);
      if (t === null || bpm === null) continue;
      aus.push(mitZone({ t, bpm, quelle: quelleHc(r, "HeartRate", t) }, z));
    }
  }
  return aus;
}

function punktwerte(roh, typ, feld, ziel) {
  const aus = [];
  for (const r of roh) {
    const t = zeitMs(r.time);
    const wert = zahl(r[feld]);
    if (t === null || wert === null) continue;
    aus.push(mitZone({ t, [ziel]: wert, quelle: quelleHc(r, typ) }, zoneVon(r)));
  }
  return aus;
}

/** SkinTemperature → Hauttemp[] je Abweichungswert (delta). `basisC` = Basis des Geräts, falls geliefert. */
export function hauttempAus(roh) {
  const aus = [];
  for (const r of roh) {
    const basisC = zahl(r.baselineCelsius);
    const z = zoneVon(r, "startZoneOffsetSek");
    for (const d of r.deltas || []) {
      const t = zeitMs(d.time);
      const deltaC = zahl(d.deltaCelsius);
      if (t === null || deltaC === null) continue;
      aus.push(mitZone({ t, deltaC, basisC, quelle: quelleHc(r, "SkinTemperature", t) }, z));
    }
  }
  return aus;
}

/** SleepSession → Schlaf[]. Phasen sortiert, unbekannte Stufen ausgelassen. */
export function schlafAus(roh) {
  const aus = [];
  for (const r of roh) {
    const von = zeitMs(r.startTime);
    const bis = zeitMs(r.endTime);
    if (von === null || bis === null || bis <= von) continue;
    const phasen = [];
    for (const st of r.stages || []) {
      const nr = stufeNummer(st.stage);
      const art = SCHLAFSTUFEN[nr] ?? null;
      const pv = zeitMs(st.startTime);
      const pb = zeitMs(st.endTime);
      if (!art || pv === null || pb === null || pb <= pv) continue;
      const p = { von: pv, bis: pb, art };
      if (nr === 2) p.unbestimmt = true;
      phasen.push(p);
    }
    phasen.sort((a, b) => a.von - b.von);
    const d = { von, bis, phasen, quelle: quelleHc(r, "SleepSession") };
    if (r.title) d.titel = String(r.title);
    aus.push(mitZone(d, zoneVon(r, "startZoneOffsetSek")));
  }
  return aus;
}

/** ExerciseSession → Training[]; Herzschläge im Zeitraum [von, bis] werden angehängt. */
export function trainingAus(roh, herzschlaege = []) {
  const sortiert = [...herzschlaege].sort((a, b) => a.t - b.t);
  const aus = [];
  for (const r of roh) {
    const von = zeitMs(r.startTime);
    const bis = zeitMs(r.endTime);
    if (von === null || bis === null || bis <= von) continue;
    const typNr = zahl(r.exerciseType) ?? 0;
    const d = {
      von,
      bis,
      art: TRAININGSARTEN[typNr] || `hc_${typNr}`,
      typNr,
      herzschlaege: sortiert.filter((h) => h.t >= von && h.t <= bis),
      quelle: quelleHc(r, "ExerciseSession"),
    };
    if (r.title) d.titel = String(r.title);
    aus.push(mitZone(d, zoneVon(r, "startZoneOffsetSek")));
  }
  return aus;
}

/**
 * Rohdatensätze einer Health-Connect-Datenart → Messpaket.
 * @param {string} typ z. B. "HeartRate"
 * @param {object[]} roh Datensätze im Brückenformat
 * @param {{herzschlaege?: object[]}} [zusatz] für ExerciseSession: Herzschläge zum Anhängen
 */
export function zuordnen(typ, roh, zusatz = {}) {
  const paket = leeresPaket();
  const liste = Array.isArray(roh) ? roh : [];
  switch (typ) {
    case "HeartRate": paket.herzschlag = herzschlaegeAus(liste); break;
    case "HeartRateVariabilityRmssd": paket.hrv = punktwerte(liste, typ, "heartRateVariabilityMillis", "rmssdMs"); break;
    case "RestingHeartRate": paket.ruhepuls = punktwerte(liste, typ, "beatsPerMinute", "bpm"); break;
    case "RespiratoryRate": paket.atemfrequenz = punktwerte(liste, typ, "rate", "proMin"); break;
    case "OxygenSaturation": paket.spo2 = punktwerte(liste, typ, "percentage", "prozent"); break;
    case "SkinTemperature": paket.hauttemp = hauttempAus(liste); break;
    case "SleepSession": paket.schlaf = schlafAus(liste); break;
    case "ExerciseSession": paket.training = trainingAus(liste, zusatz.herzschlaege || []); break;
    default: throw new Error(`Unbekannte Health-Connect-Datenart: ${typ}`);
  }
  return paket;
}

// ---------------------------------------------------------------------------------------------------
// Brücke und Abgleich
// ---------------------------------------------------------------------------------------------------

/** Brücke aus `ziel.MF.native.healthConnect` holen, oder null. */
export function findeBruecke(ziel = globalThis) {
  const b = ziel && ziel.MF && ziel.MF.native && ziel.MF.native.healthConnect;
  return b && typeof b.lesen === "function" ? b : null;
}

/** Ist Health Connect nutzbar? → { verfuegbar, grund } (grund: "kein_android" | Status der Brücke). */
export async function verfuegbar(bruecke) {
  if (!bruecke) return { verfuegbar: false, grund: "kein_android" };
  try {
    const r = await bruecke.verfuegbar();
    if (typeof r === "boolean") return { verfuegbar: r, grund: r ? "verfuegbar" : "nicht_verfuegbar" };
    return { verfuegbar: !!(r && r.verfuegbar), grund: (r && r.status) || "unbekannt", ...r };
  } catch (e) {
    return { verfuegbar: false, grund: "fehler", fehler: String(e && e.message ? e.message : e) };
  }
}

/** Leserechte anfragen → { erteilt: string[], fehlend: string[] }. */
export async function berechtigungen(bruecke, arten = RECORD_TYPEN, zeitgrenzeMs = VORGABEN.rechteZeitgrenzeMs) {
  if (!bruecke) return { erteilt: [], fehlend: [...arten] };
  const r = (await mitZeitgrenze(Promise.resolve(bruecke.berechtigungen(arten)), zeitgrenzeMs,
    "Health Connect hat auf die Rechte-Abfrage nicht geantwortet. Öffne Health Connect → App-Berechtigungen → MAEHR FIT und gib die Lese-Rechte frei; dann erneut „Verbinden“.")) || {};
  const erteilt = Array.isArray(r.erteilt) ? r.erteilt : [];
  return { erteilt, fehlend: arten.filter((a) => !erteilt.includes(a)) };
}

const text = (fehler) => String(fehler && fehler.message ? fehler.message : fehler);

/**
 * Inkrementeller Abgleich: je Datenart ab dem letzten Stand (minus Überlappung) bis jetzt lesen, in Tagesfenstern
 * (damit die Brücke nie zu große Antworten liefern muss), zuordnen, ablegen und nach jedem Fenster den Stand merken
 * ("sync:healthconnect:<Datenart>" → { bisMs, zeitpunktMs, anzahl gelesen in diesem Lauf }).
 *
 * Scheitert ein Fenster (Zeitüberschreitung, zu große Antwort, Quote von Health Connect), wird es halbiert und noch einmal
 * versucht; ein kleinstes Fenster, das auch nach Wiederholung scheitert, wird als Lücke gemeldet und übersprungen.
 * Der Stand bleibt dann am Beginn der ersten Lücke, der nächste Lauf liest sie wieder. Drei Lücken hintereinander (oder ein
 * endgültiger Fehler wie fehlendes Recht) beenden diese Art für diesen Lauf; die anderen Arten laufen weiter.
 * Nichts wird verschluckt: `arten[typ].fehler` und `arten[typ].luecken` nennen jeden Fehler, oben stehen `fehler` (Texte),
 * `zaehlung` (gelesene Datensätze je MF-Art), `zeitraum` (erster/letzter Kalendertag) und `luecken`.
 * `paket` im Ergebnis enthält nur die neu hinzugekommenen Datensätze.
 * @param {{bruecke:object, speicher:object, jetzt?:number, arten?:string[], vorgaben?:object,
 *   fortschritt?:(info:{typ:string, art:string, nr:number, von:number, gelesen:number, phase:string})=>void}} p
 */
export async function synchronisieren({ bruecke, speicher, jetzt = Date.now(), arten = RECORD_TYPEN, vorgaben = {}, fortschritt }) {
  if (!bruecke) throw new Error("Health Connect ist nur in der Android-App verfügbar.");
  const v = { ...VORGABEN, ...vorgaben };
  const warte = v.warte || ((ms) => new Promise((ok) => setTimeout(ok, ms)));
  const ergebnis = { arten: {}, neu: 0, ersetzt: 0, paket: leeresPaket(), zaehlung: {}, zeitraum: null, luecken: [], fehler: [] };
  const meldung = (info) => { try { fortschritt?.(info); } catch { /* Anzeige darf den Abgleich nie stören */ } };
  const reihenfolge = RECORD_TYPEN.filter((t) => arten.includes(t));
  for (const typ of reihenfolge) {
    const stand = await speicher.lies(SYNC_PRAEFIX + typ);
    const von = stand && typeof stand.bisMs === "number" ? stand.bisMs - v.ueberlappungMs : jetzt - v.ersterZeitraumMs;
    const bericht = { vonMs: von, bisMs: von, gelesen: 0, neu: 0, ersetzt: 0, luecken: [] };
    ergebnis.arten[typ] = bericht;
    const mfArt = ART_ZU_PAKET[typ];
    const nrGesamt = Math.max(1, Math.ceil((jetzt - von) / v.fensterMs));
    let ersteLuecke = null, serie = 0, nr = 0;

    /** Ein Fenster lesen; true = gelesen und abgelegt, false = Lücke. Wirft nur bei endgültigem Fehler oder Ablagefehler. */
    const fenster = async (a, e) => {
      let roh = null, letzterFehler = null;
      for (let versuch = 0; versuch <= v.wiederholungen && roh === null; versuch++) {
        try {
          roh = (await mitZeitgrenze(Promise.resolve(bruecke.lesen(typ, a, e)), v.lesenZeitgrenzeMs,
            `Health Connect hat beim Lesen von ${typ} nicht geantwortet (Zeitgrenze ${Math.round(v.lesenZeitgrenzeMs / 1000)} s).`)) || [];
        } catch (fehler) {
          letzterFehler = fehler;
          if (endgueltig(fehler)) throw fehler;
          if (e - a > v.kleinsterFensterMs) {
            // Fenster halbieren: kleinere Antworten, und die Lücke bleibt so klein wie möglich
            const mitte = a + Math.floor((e - a) / 2);
            const links = await fenster(a, mitte);
            const rechts = await fenster(mitte, e);
            return links && rechts;
          }
          if (versuch < v.wiederholungen) await warte(v.wartenMs);
        }
      }
      if (roh === null) {
        bericht.luecken.push({ vonMs: a, bisMs: e, fehler: text(letzterFehler) });
        ergebnis.luecken.push({ typ, vonMs: a, bisMs: e, fehler: text(letzterFehler) });
        if (ersteLuecke === null) ersteLuecke = a;
        bericht.fehler = bericht.fehler || text(letzterFehler);
        return false;
      }
      const paket = zuordnen(typ, roh, typ === "ExerciseSession" ? await herzschlaegeFuer(bruecke, roh) : {});
      for (const art of ARTEN) for (const d of paket[art]) {
        const tag = tagVon(art, d);
        if (!tag) continue;
        if (bericht.vonTag === undefined || tag < bericht.vonTag) bericht.vonTag = tag;
        if (bericht.bisTag === undefined || tag > bericht.bisTag) bericht.bisTag = tag;
      }
      const abgelegt = await speichereMessungen(speicher, paket);
      bericht.gelesen += roh.length;
      bericht.neu += abgelegt.neu;
      bericht.ersetzt += abgelegt.ersetzt;
      ergebnis.paket = paketeVereinen(ergebnis.paket, abgelegt.neuPaket);
      return true;
    };

    for (let a = von; a < jetzt; ) {
      const e = Math.min(a + v.fensterMs, jetzt);
      nr += 1;
      meldung({ typ, art: mfArt, nr, von: nrGesamt, gelesen: bericht.neu + bericht.ersetzt, phase: "lesen" });
      try {
        const gut = await fenster(a, e);
        serie = gut ? 0 : serie + 1;
        // Stand: bis zum Ende dieses Fensters, aber nie hinter die erste Lücke (die liest der nächste Lauf noch einmal)
        bericht.bisMs = ersteLuecke ?? e;
        await speicher.schreib(SYNC_PRAEFIX + typ, { bisMs: bericht.bisMs, zeitpunktMs: jetzt, anzahl: bericht.gelesen });
        if (serie >= v.luckenSerieMax) { bericht.fehler = `${bericht.fehler || "Lesefehler"} (abgebrochen nach ${serie} Lücken hintereinander)`; break; }
      } catch (fehler) {
        bericht.fehler = text(fehler);
        break;
      }
      a = e;
    }
    ergebnis.neu += bericht.neu;
    ergebnis.ersetzt += bericht.ersetzt;
    if (bericht.neu + bericht.ersetzt > 0) ergebnis.zaehlung[mfArt] = (ergebnis.zaehlung[mfArt] || 0) + bericht.neu + bericht.ersetzt;
    if (bericht.vonTag !== undefined) {
      if (!ergebnis.zeitraum) ergebnis.zeitraum = { von: bericht.vonTag, bis: bericht.bisTag };
      else {
        if (bericht.vonTag < ergebnis.zeitraum.von) ergebnis.zeitraum.von = bericht.vonTag;
        if (bericht.bisTag > ergebnis.zeitraum.bis) ergebnis.zeitraum.bis = bericht.bisTag;
      }
    }
    if (bericht.fehler) ergebnis.fehler.push(`${typ}: ${bericht.fehler}`);
  }
  return ergebnis;
}

/** Herzschläge für die Zeiträume der Trainings holen. Ohne Herzschlag-Recht: Training ohne Kurve. */
async function herzschlaegeFuer(bruecke, sitzungen) {
  const herzschlaege = [];
  for (const s of sitzungen) {
    const von = zeitMs(s.startTime);
    const bis = zeitMs(s.endTime);
    if (von === null || bis === null || bis <= von) continue;
    try {
      herzschlaege.push(...herzschlaegeAus((await bruecke.lesen("HeartRate", von, bis)) || []));
    } catch {
      return { herzschlaege: [] };
    }
  }
  return { herzschlaege };
}
