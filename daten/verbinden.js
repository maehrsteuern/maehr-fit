// Verbindungsstück der Datenschicht: stellt `window.MF.daten` bereit.
//
//   MF.daten.healthConnect.verfuegbar()        → { verfuegbar, grund }
//   MF.daten.healthConnect.verbinden(arten?, { fortschritt? }) → Rechte anfragen + abgleichen:
//     { …Messpaket, erteilt, fehlend, neu, ersetzt, arten (Bericht je Health-Connect-Art), zaehlung (gelesen je MF-Art),
//       zeitraum ({ von, bis } der gelesenen Datensätze), fehler (Texte), luecken,
//       herkunft ({ hrv: { "com.whoop.android": 12 }, … } schreibende Apps je MF-Art), schlafPhasen ({ mit, ohne } Nächte mit/ohne echte Schlafstufen) }
//     fortschritt({ typ, art, nr, von, gelesen, phase }) wird vor jedem Lesefenster gerufen (Anzeige „Lese Daten …“)
//   MF.daten.healthConnect.berechtigungen()    → { erteilt, fehlend }      (nur Rechte, ohne Abgleich)
//   MF.daten.healthConnect.erteilt()           → { erteilt, fehlend } | null (nur nachsehen, ohne Dialog; null = unbekannt)
//   MF.daten.healthConnect.synchronisieren()   → { …Messpaket, arten: {…}, neu, ersetzt }
//   MF.daten.csvImport(datei | dateien)        → { …Messpaket, neu, ersetzt, arten, zeitraum, hinweise, dateien }
//     arten = Anzahl eingelesener Datensätze je Art ({ schlaf: 7, training: 5, … }, nur Arten > 0, Summe = neu + ersetzt),
//     zeitraum = { von, bis } erster und letzter Kalendertag ("JJJJ-MM-TT") der eingelesenen Datensätze oder null
// "…Messpaket" = nur die neu hinzugekommenen Datensätze: { herzschlag: [], hrv: [], …, fremdwerte: [] }.
//   MF.daten.exportieren()                     → { format, version, erstelltMs, eintraege }
//   MF.daten.loeschen()                        → { geloescht }
//
// Alles landet im Speicher unter "messung:<art>:<JJJJ-MM-TT>" (siehe daten/ablage.js), doppelte quelle.id wird ersetzt.
// Der Speicher kommt von außen (Shell: IndexedDB, Tests: Map). Die Brücke wird bei jedem Aufruf neu gesucht,
// damit die Reihenfolge des Ladens (Capacitor vor oder nach der App) egal ist.

import * as hc from "./healthconnect.js";
import { installiereBruecke } from "./bruecke_capacitor.js";
import { importiereWhoop } from "./csv_import.js";
import { leseZip } from "./zip.js";
import { ARTEN, speichereMessungen, tagVon } from "./ablage.js";

/**
 * Health-Connect-Brücke suchen; fehlt sie, aus dem Capacitor-Plugin "HealthConnect" einrichten (nur in der Android-App).
 * Wird bei jedem Aufruf neu versucht, damit die Reihenfolge des Ladens egal ist. Im Browser (kein Capacitor) → null.
 */
export function sucheBruecke(ziel = globalThis) {
  return hc.findeBruecke(ziel) || installiereBruecke(ziel);
}

export const EXPORT_FORMAT = "maehr-fit-export";
const PRAEFIXE = ["messung:", hc.SYNC_PRAEFIX];

function istZip(name, bytes) {
  if (/\.zip$/i.test(name || "")) return true;
  return !!(bytes && bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4);
}

/** Eine Eingabe (File, {name,text}, {name,bytes}) in CSV-Texte auflösen; ZIPs werden entpackt. */
async function zuTexten(eingabe) {
  const name = eingabe.name || "unbenannt.csv";
  if (typeof eingabe.text === "string") return [{ name, text: eingabe.text }];
  // Achtung: Bei echten File-/Blob-Objekten ist `bytes` eine Methode (Blob.bytes()), kein Feld.
  let bytes = typeof eingabe.bytes === "function" ? new Uint8Array(await eingabe.bytes()) : eingabe.bytes;
  if (!bytes && typeof eingabe.arrayBuffer === "function") bytes = new Uint8Array(await eingabe.arrayBuffer());
  if (!bytes) return [];
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  const dec = new TextDecoder("utf-8");
  if (istZip(name, bytes)) {
    const inhalt = await leseZip(bytes);
    return inhalt.filter((e) => /\.csv$/i.test(e.name)).map((e) => ({ name: e.name, text: dec.decode(e.bytes) }));
  }
  return [{ name, text: dec.decode(bytes) }];
}

/** Erster und letzter Kalendertag eines Messpakets (Tag wie in der Ablage: Schlaf am Aufwachtag). */
export function zeitraumVon(paket) {
  let von = null, bis = null;
  for (const art of ARTEN) {
    for (const d of paket[art] || []) {
      const tag = tagVon(art, d);
      if (!tag) continue;
      if (von === null || tag < von) von = tag;
      if (bis === null || tag > bis) bis = tag;
    }
  }
  return von === null ? null : { von, bis };
}

/**
 * Datenschicht erzeugen.
 * @param {{ speicher: {lies,schreib,liste,loesche?}, bruecke?: object|(() => object|null), jetzt?: () => number,
 *           zone?: number|string }} p  zone: Zeitzone für CSV ohne Zeitzonenspalte (sonst Gerätezeitzone)
 */
export function erzeugeDaten({ speicher, bruecke = () => sucheBruecke(globalThis), jetzt = () => Date.now(), zone } = {}) {
  if (!speicher) throw new Error("erzeugeDaten: speicher fehlt (Schnittstelle kern/speicher.js).");
  const holeBruecke = typeof bruecke === "function" ? bruecke : () => bruecke;

  // Rückgaben enthalten die neu hinzugekommenen Datensätze zusätzlich als Messpaket-Felder auf oberster Ebene
  // ({ herzschlag: [...], hrv: [...], … }), damit die Shell sie direkt übernehmen kann (shell/shell.js).
  async function abgleichen(optionen = {}) {
    const r = await hc.synchronisieren({ bruecke: holeBruecke(), speicher, jetzt: jetzt(), ...optionen });
    const { paket, ...rest } = r;
    return { ...paket, ...rest };
  }

  return {
    healthConnect: {
      verfuegbar: () => hc.verfuegbar(holeBruecke()),
      /** Leserechte anfragen und, wenn mindestens eine Art freigegeben ist, gleich abgleichen. */
      async verbinden(arten = hc.RECORD_TYPEN, optionen = {}) {
        if (!holeBruecke()) throw new Error("Health Connect ist nur in der Android-App verfügbar.");
        const rechte = await hc.berechtigungen(holeBruecke(), arten);
        if (!rechte.erteilt.length) {
          throw new Error("Health Connect: keine Leseberechtigung erteilt.");
        }
        const sync = await abgleichen({ arten: rechte.erteilt, fortschritt: optionen.fortschritt });
        return { ...sync, erteilt: rechte.erteilt, fehlend: rechte.fehlend };
      },
      /** Leserechte nur anfragen, ohne abzugleichen. */
      berechtigungen: (arten = hc.RECORD_TYPEN) => hc.berechtigungen(holeBruecke(), arten),
      /** Schon erteilte Rechte nachsehen, ohne Dialog (null, wenn die App-Fassung das nicht kann). */
      erteilt: (arten = hc.RECORD_TYPEN) => hc.erteilteRechte(holeBruecke(), arten),
      synchronisieren: abgleichen,
    },

    /** Eine Datei oder mehrere (FileList, Array). CSV oder ZIP des WHOOP-Exports. */
    async csvImport(dateien) {
      const liste = dateien && typeof dateien.length === "number" && typeof dateien !== "string"
        ? Array.from(dateien) : [dateien].filter(Boolean);
      const texte = (await Promise.all(liste.map(zuTexten))).flat();
      const { paket, hinweise, dateien: uebersicht } = importiereWhoop(texte, { zone });
      if (!uebersicht.some((d) => d.art)) {
        // Nur Dateiname und Kopfzeile (Spaltennamen, nie Werte) melden, damit der Nutzer sie abfotografieren kann
        const kopfzeilen = hinweise.filter((h) => Array.isArray(h.kopf));
        const fehler = new Error("Keine WHOOP-Datei erkannt (erwartet: physiological_cycles, sleeps, workouts, journal_entries – deutsch: physiologische_zyklen, Schlaf, Trainings, logbuch_eintraege).");
        fehler.hinweise = hinweise;
        fehler.kopfzeilen = kopfzeilen;
        throw fehler;
      }
      const abgelegt = await speichereMessungen(speicher, paket);
      const arten = Object.fromEntries(ARTEN.map((a) => [a, paket[a].length]).filter(([, n]) => n > 0));
      return { ...abgelegt.neuPaket, neu: abgelegt.neu, ersetzt: abgelegt.ersetzt, arten, zeitraum: zeitraumVon(paket), hinweise, dateien: uebersicht };
    },

    /** Sicherung aller Messwerte: jede Art der Ablage (ARTEN, auch fremdwerte) unter "messung:…" plus Abgleichstand "sync:…". */
    async exportieren() {
      const eintraege = {};
      for (const p of PRAEFIXE) {
        for (const k of (await speicher.liste(p)).sort()) {
          const w = await speicher.lies(k);
          if (w !== null && w !== undefined) eintraege[k] = w;
        }
      }
      return { format: EXPORT_FORMAT, version: 1, erstelltMs: jetzt(), eintraege };
    },

    async loeschen() {
      let geloescht = 0;
      for (const p of PRAEFIXE) {
        for (const k of await speicher.liste(p)) {
          if (typeof speicher.loesche === "function") await speicher.loesche(k);
          else await speicher.schreib(k, null);
          geloescht += 1;
        }
      }
      return { geloescht };
    },
  };
}

/**
 * `ziel.MF.daten` einrichten (Shell ruft das einmal beim Start auf).
 * @param {object} [ziel] meist window
 * @param {{speicher?: object, zone?: number|string, jetzt?: () => number}} [optionen] speicher fehlt → ziel.MF.speicher
 */
export function installiere(ziel = globalThis, optionen = {}) {
  ziel.MF = ziel.MF || {};
  const speicher = optionen.speicher || ziel.MF.speicher;
  ziel.MF.daten = erzeugeDaten({
    speicher, bruecke: () => sucheBruecke(ziel), zone: optionen.zone, ...(optionen.jetzt ? { jetzt: optionen.jetzt } : {}),
  });
  return ziel.MF.daten;
}
