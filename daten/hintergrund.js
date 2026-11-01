// daten/hintergrund.js – Brücke zwischen der App und dem Hintergrund-Abgleich der Android-Hülle (docs/technik/hintergrund.md).
//
// Kernaussage: Während die App zu ist, holt Android stündlich neue Werte aus Health Connect und legt sie in einen Eingangskorb
// (Dateien im privaten Speicher der App). Beim Öffnen übernimmt die App den Korb in ihren Speicher – ohne Doppelte – und leert
// ihn. Beim Verlassen gibt die App ihre eigene Tageszusammenfassung an Android zurück, damit Mitteilung und Widgets genau die
// Zahlen zeigen, die auch in der App stehen. Dieselbe Rechnung läuft im Hintergrund in einem unsichtbaren Browserfenster
// (android/kern_einstieg.js → kern.bundle.js), wenn die App geschlossen ist.
//
// Aufbau (alles rein, außer abholen/spiegeln/einhaengen, die die Brücke und den Speicher bekommen):
//   jsonlLesen(text)                                → Datensätze einer JSON-Lines-Datei (kaputte Zeilen übersprungen)
//   eingangZuPaket(dateien, { herzschlaege })       → Messpaket (Rohformat Health Connect → normiert, daten/healthconnect.js)
//   vereinen(...pakete)                              → Messpaket ohne Doppelte (gleiche quelle.id: der spätere gewinnt)
//   kontextAusPaket(paket, heute)                   → nur die Tage, die der Kern für heute braucht (Basislinie, Schlafschuld)
//   einstellungenFuerKern(einst)                    → wie shell/kern_echt.js: nur gültige Zahlen
//   zusammenfassung(paket, einst, { jetzt, quelle }) → Tageszusammenfassung für Mitteilung und Widgets (Schema unten)
//   heuteAusMessungen(paketJson, einstJson, jetzt)  → dasselbe aus JSON-Text (für die Android-Hülle)
//   heuteAusEingang(kontextJson, eingangJson, einstJson, jetzt) → Kontext der App + neuer Eingang, dann zusammenfassung
//   abholen({ speicher, bruecke })                  → Eingang in den Speicher übernehmen, dann bestätigen (Korb leeren)
//   spiegeln({ speicher, bruecke, jetzt })          → Kontext und Zusammenfassung an Android geben, Widgets nachführen
//   einhaengen(ziel)                                → in der Android-App: abholen beim Öffnen, spiegeln beim Verlassen
//
// Zusammenfassung (Version 1):
//   { version, tag, istHeute, erzeugt, quelle: "app"|"hintergrund", demo, sprache,
//     erholung: { wert, stufe, text }, belastung: { wert, zehntel, text }, schlaf: { wert, dauerMs, bedarfMs, text, bedarfText, anteil },
//     hrv: { wert } | null, ruhepuls: { wert } | null, kernaussage, zeile, schlafErkannt, aufwachenMs,
//     schlafenszeit: { bettMs, aufstehenMs, bedarfMs, text } | null, texte: { … Beschriftungen in der Sprache der App } }
// Kein Netz. Nur Zahlen aus dem Kern (kern/index.js), Texte aus shell/i18n/i18n.js, Zahlenformat aus shell/format.js.

import * as K from "../kern/index.js";
import { zuordnen, herzschlaegeAus, RECORD_TYPEN } from "./healthconnect.js";
import { ARTEN, leeresPaket, speichereMessungen, leseMessungen } from "./ablage.js";
import { installiereHintergrundBruecke } from "./bruecke_capacitor.js";
import { t, setzeSprache, sprache as aktuelleSprache } from "../shell/i18n/i18n.js";
import { zahl, prozent, belastungText, dauerKurz, uhrzeit, tagLang } from "../shell/format.js";

export const VERSION = 1;
/** Technische Vorgaben (keine Rechenformeln): Reserve-Tage über die Fenster des Kerns hinaus, Wartezeit beim Einhängen. */
export const VORGABEN = { reserveTage: 2, warteVersuche: 40, warteMs: 500 };
/** Arten, die die Zusammenfassung braucht (Tagebuch und WHOOP-Fremdwerte ändern keine der gezeigten Zahlen). */
const RECHEN_ARTEN = ARTEN.filter((a) => a !== "tagebuch" && a !== "fremdwerte");

const idVon = (d) => (d && d.quelle && d.quelle.id) || null;

// ---------------------------------------------------------------------------------------------------
// Eingang (Rohformat von Health Connect, je Datenart eine Datei <Typ>.jsonl)
// ---------------------------------------------------------------------------------------------------

/** JSON-Lines lesen → { datensaetze, fehler } (leere und kaputte Zeilen werden gezählt, nicht geworfen). */
export function jsonlLesen(text) {
  const datensaetze = [];
  let fehler = 0;
  for (const zeile of String(text || "").split(/\r?\n/)) {
    const z = zeile.trim();
    if (!z) continue;
    try {
      const o = JSON.parse(z);
      if (o && typeof o === "object") datensaetze.push(o); else fehler += 1;
    } catch { fehler += 1; }
  }
  return { datensaetze, fehler };
}

/** Datensätze im Brückenformat je Typ → Messpaket. `dateien` = { HeartRate: "jsonl…" | [ … ], … }. */
export function eingangZuPaket(dateien = {}, { herzschlaege = [] } = {}) {
  const roh = {};
  let fehler = 0;
  for (const typ of RECORD_TYPEN) {
    const inhalt = dateien[typ];
    if (inhalt === undefined || inhalt === null) continue;
    let liste;
    if (Array.isArray(inhalt)) liste = inhalt;
    else { const r = jsonlLesen(inhalt); liste = r.datensaetze; fehler += r.fehler; }
    // Doppelte Zeilen (gleiche Health-Connect-id, z. B. nach zwei Läufen): die letzte gilt
    const nachId = new Map();
    liste.forEach((d, i) => nachId.set((d.metadata && d.metadata.id) || `#${i}`, d));
    roh[typ] = [...nachId.values()];
  }
  const pakete = [];
  const herz = roh.HeartRate ? herzschlaegeAus(roh.HeartRate) : [];
  for (const typ of RECORD_TYPEN) {
    if (!roh[typ]) continue;
    pakete.push(typ === "ExerciseSession" ? zuordnen(typ, roh[typ], { herzschlaege: [...herzschlaege, ...herz] }) : zuordnen(typ, roh[typ]));
  }
  const paket = vereinen(...pakete);
  paket.fehlerZeilen = fehler;
  return paket;
}

/**
 * Pakete zusammenlegen: Ein Datensatz eines späteren Pakets ersetzt alle früheren mit derselben quelle.id (wie die Ablage).
 * Innerhalb eines Pakets bleibt alles stehen – manche Quellen teilen eine id für viele Einzelwerte (Demodaten: ein Pulstag).
 */
export function vereinen(...pakete) {
  const ziel = leeresPaket();
  for (const art of ARTEN) {
    let liste = [];
    for (const p of pakete) {
      if (!p || !Array.isArray(p[art]) || !p[art].length) continue;
      const neueIds = new Set(p[art].map(idVon).filter((x) => x !== null));
      if (neueIds.size) liste = liste.filter((d) => !neueIds.has(idVon(d)));
      liste.push(...p[art]);
    }
    ziel[art] = liste;
  }
  return ziel;
}

/** Anzahl Datensätze je Art (nur Arten mit Werten). */
export function zaehlen(paket) {
  const aus = {};
  for (const a of ARTEN) if (paket && Array.isArray(paket[a]) && paket[a].length) aus[a] = paket[a].length;
  return aus;
}

// ---------------------------------------------------------------------------------------------------
// Kontext: was der Kern für „heute“ braucht
// ---------------------------------------------------------------------------------------------------

/**
 * Nur die Tage behalten, die der Kern für heute braucht – Basislinie über basis.fenster.lang Tage, Schlafvergleich über
 * basis.fenster.kurz, Schlafschuld über schlaf.schuld.fenster Nächte (dafür die Belastung des jeweiligen Vortags, also Herzschläge).
 * Herzschläge sind die größte Art und werden nur für das Schuldfenster behalten; Trainings älterer Tage ohne ihre Herzschläge.
 */
export function kontextAusPaket(paket = {}, heute) {
  const lang = K.wert("basis.fenster.lang"), kurz = K.wert("basis.fenster.kurz"), schuld = K.wert("schlaf.schuld.fenster");
  const reserve = VORGABEN.reserveTage;
  const abAlle = K.mitternacht(K.plusTage(heute, -(Math.max(lang, kurz, schuld) + reserve)));
  const abHerz = K.mitternacht(K.plusTage(heute, -(schuld + reserve)));
  const aus = leeresPaket();
  for (const art of RECHEN_ARTEN) {
    for (const d of paket[art] || []) {
      if (!d) continue;
      const zeit = art === "schlaf" ? d.bis : art === "training" ? d.von : d.t;
      if (!Number.isFinite(zeit)) continue;
      if (art === "herzschlag") { if (zeit >= abHerz) aus.herzschlag.push(d); continue; }
      if (zeit < abAlle) continue;
      if (art === "training" && zeit < abHerz && Array.isArray(d.herzschlaege) && d.herzschlaege.length) aus.training.push({ ...d, herzschlaege: [] });
      else aus[art].push(d);
    }
  }
  return aus;
}

/** Einstellungen für den Kern, gereinigt wie in shell/kern_echt.js (berechne). */
export function einstellungenFuerKern(einst = {}) {
  const e = einst && typeof einst === "object" ? einst : {};
  const ganz = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.round(Number(x)) : undefined);
  return { alter: ganz(e.alter), maxPuls: ganz(e.maxPuls), ruhepuls: ganz(e.ruhepuls), schlafBasisMs: Number(e.schlafBasisMs) || undefined };
}

// ---------------------------------------------------------------------------------------------------
// Zusammenfassung
// ---------------------------------------------------------------------------------------------------

/** HRV-Basislinie zurück in Millisekunden (wie shell/kern_echt.js basisAnzeige), sonst Mittel/Streuung durch den Teiler. */
function basisMs(b, teiler) {
  if (!b || !b.n || b.mittel === null) return null;
  if (b.ln) { const s = b.streuung ?? 0; return { mittel: Math.exp(b.mittel), streuung: (Math.exp(b.mittel + s) - Math.exp(b.mittel - s)) / 2 }; }
  return { mittel: b.mittel / teiler, streuung: b.streuung === null ? 0 : b.streuung / teiler };
}

/** Übliche Aufwachzeit: Median der Minuten nach Mitternacht der letzten Hauptschlafe (mindestens drei). */
function ueblichesAufwachen(schlaefe, bisTag, tage = 7) {
  const minuten = [];
  for (let k = 0; k < tage; k++) {
    const tag = K.plusTage(bisTag, -k), s = K.hauptschlaf(tag, schlaefe);
    if (s) minuten.push(Math.round((s.bis - K.mitternacht(tag)) / K.MS_MINUTE));
  }
  if (minuten.length < 3) return null;
  minuten.sort((a, b) => a - b);
  return minuten[Math.floor(minuten.length / 2)];
}

/** Beschriftungen für Mitteilung und Widgets in der Sprache der App. */
function texte(s) {
  const T = (k, w) => t(k, w, s);
  return {
    erholung: T("hg_erholung"), belastung: T("hg_belastung"), schlaf: T("hg_schlaf"), atem: T("hg_atem"), zuletzt: T("hg_zuletzt"),
    bedarf: T("hg_bedarf"), stufe: { gruen: T("hg_stufe_gruen"), gelb: T("hg_stufe_gelb"), rot: T("hg_stufe_rot") },
    leer: T("hg_leer"), demo: T("hg_demo"), kanal: T("hg_kanal_morgen"), kanalHinweis: T("hg_kanal_hinweis"),
  };
}

/**
 * Tageszusammenfassung aus einem Messpaket. Tag = heute, wenn der Kern für heute Werte hat, sonst der letzte Tag mit Werten.
 * @param {object} paket normierte Messwerte (daten/ablage.js)
 * @param {object} [einst] Einstellungen der App (alter, maxPuls, ruhepuls, schlafBasisMs, sprache)
 * @param {{ jetzt?: number, quelle?: string, demo?: boolean }} [o]
 */
export function zusammenfassung(paket = {}, einst = {}, { jetzt = Date.now(), quelle = "app", demo = false } = {}) {
  const s = (einst && einst.sprache) || aktuelleSprache() || "de";
  const vorher = aktuelleSprache();
  setzeSprache(s); // Zahlenformat (shell/format.js) folgt der gewählten Sprache; danach zurück
  try {
    const heute = K.isoTag(jetzt);
    const daten = {};
    for (const a of RECHEN_ARTEN) daten[a] = Array.isArray(paket[a]) ? paket[a] : [];
    const a = K.auswerter(daten, einstellungenFuerKern(einst));
    const sp = a.spanne();
    const basis = { version: VERSION, erzeugt: jetzt, quelle, demo: !!demo, sprache: s, texte: texte(s) };
    if (!sp) return { ...basis, tag: heute, istHeute: true, leer: true, erholung: { wert: null, stufe: null, text: "–" }, belastung: { wert: null, zehntel: null, text: "–" },
      schlaf: { wert: null, dauerMs: null, bedarfMs: null, text: "–", bedarfText: "–", anteil: null }, hrv: null, ruhepuls: null,
      kernaussage: t("hg_kern_keine_daten", null, s), zeile: t("hg_kern_keine_daten", null, s), schlafErkannt: false, aufwachenMs: null, schlafenszeit: null };
    const tag = sp.bis < heute ? sp.bis : heute;
    const kt = a.tag(tag);
    const HRV = K.wert("einheit.hrv");
    const er = kt.erholung || {};
    const erWert = Number.isFinite(er.wert) ? er.wert : null;
    const be = kt.belastung;
    const zehntel = be && Number.isFinite(be.wertZehntel) ? be.wertZehntel : null;
    const sl = kt.schlaf;
    const roh = K.hauptschlaf(tag, daten.schlaf);
    const dauerMs = sl && Number.isFinite(sl.dauerMs) ? sl.dauerMs : null;
    const bedarfMs = sl && Number.isFinite(sl.bedarfMs) ? sl.bedarfMs : (kt.bedarf && Number.isFinite(kt.bedarf.ms) ? kt.bedarf.ms : null);
    const hrv = kt.messwerte.hrv && Number.isFinite(kt.messwerte.hrv.wert) ? { wert: kt.messwerte.hrv.wert / HRV } : null;
    const ruhepuls = kt.messwerte.ruhepuls && Number.isFinite(kt.messwerte.ruhepuls.wert) ? { wert: kt.messwerte.ruhepuls.wert } : null;
    const istHeute = tag === heute;

    // Kernaussage: dieselben Sätze wie „Heute“ (shell/apps/heute.js kernsatz), als reiner Text
    let kern;
    if (erWert === null || !er.stufe) kern = t("heute_kern_leer", null, s);
    else {
      kern = t((istHeute ? "heute_kern_" : "tag_kern_") + er.stufe, { tag: tagLang(tag), wert: prozent(erWert) }, s);
      if (roh && sl) {
        const kurz = dauerMs < bedarfMs;
        const b = basisMs(kt.basis.hrv, HRV);
        const ruhig = !(hrv && b && hrv.wert < b.mittel - (b.streuung || 0));
        kern += " " + t(`heute_nacht_${kurz ? "kurz" : "lang"}_${ruhig ? "ruhig" : "unruhig"}`, null, s);
      }
    }
    const T = texte(s);
    const erText = erWert === null ? "–" : prozent(erWert);
    const beText = zehntel === null ? "–" : belastungText(zehntel);
    const slText = dauerMs === null ? "–" : dauerKurz(dauerMs);
    const zeile = `${T.erholung} ${erText} · ${T.belastung} ${beText} · ${T.schlaf} ${slText}`;

    // Schlafenszeit für die kommende Nacht: übliche Aufwachzeit minus Bedarf der nächsten Nacht
    let schlafenszeit = null;
    const aufMin = ueblichesAufwachen(daten.schlaf, tag);
    const bedarfNaechste = kt.bedarfNaechsteNacht && Number.isFinite(kt.bedarfNaechsteNacht.ms) ? kt.bedarfNaechsteNacht.ms : null;
    if (aufMin !== null && bedarfNaechste !== null) {
      const aufstehenMs = K.lokal(K.plusTage(tag, 1), aufMin), bettMs = aufstehenMs - bedarfNaechste;
      schlafenszeit = { bettMs, aufstehenMs, bedarfMs: bedarfNaechste,
        text: t("hg_schlafenszeit_text", { bett: uhrzeit(bettMs), bedarf: dauerKurz(bedarfNaechste), auf: uhrzeit(aufstehenMs) }, s) };
    }
    return {
      ...basis, tag, istHeute, leer: false,
      erholung: { wert: erWert, stufe: erWert === null ? null : er.stufe || null, text: erText },
      belastung: { wert: zehntel === null ? null : zehntel / 10, zehntel, text: beText },
      schlaf: { wert: sl && Number.isFinite(sl.wert) ? sl.wert : null, dauerMs, bedarfMs, text: slText, bedarfText: bedarfMs === null ? "–" : dauerKurz(bedarfMs),
        anteil: dauerMs !== null && bedarfMs ? Math.round((dauerMs / bedarfMs) * 100) : null },
      hrv, ruhepuls, kernaussage: kern, zeile, schlafErkannt: !!roh && istHeute, aufwachenMs: roh ? roh.bis : null, schlafenszeit,
      tagText: istHeute ? t("tag_heute", null, s) : tagLang(tag), zahlen: { erholung: erText, belastung: beText, schlaf: slText }, stufeText: erWert === null ? "" : T.stufe[er.stufe] || "",
    };
  } finally {
    setzeSprache(vorher);
  }
}

const json = (x, ersatz) => { if (x === null || x === undefined || x === "") return ersatz; if (typeof x === "string") { try { return JSON.parse(x); } catch { return ersatz; } } return x; };

/** Für die Android-Hülle: Messpaket und Einstellungen als JSON-Text → Zusammenfassung (Objekt). */
export function heuteAusMessungen(paketJson, einstJson, jetzt = Date.now(), quelle = "hintergrund") {
  return zusammenfassung(json(paketJson, {}) || {}, json(einstJson, {}) || {}, { jetzt: Number(jetzt) || Date.now(), quelle });
}

/** Kontext der App (normiert) + Eingang (Rohformat je Typ) → Zusammenfassung. Herzschläge des Kontexts gehen an neue Trainings. */
export function heuteAusEingang(kontextJson, eingangJson, einstJson, jetzt = Date.now()) {
  const kontext = json(kontextJson, {}) || {};
  const eingang = eingangZuPaket(json(eingangJson, {}) || {}, { herzschlaege: kontext.herzschlag || [] });
  const r = zusammenfassung(vereinen(kontext, eingang), json(einstJson, {}) || {}, { jetzt: Number(jetzt) || Date.now(), quelle: "hintergrund" });
  r.eingang = zaehlen(eingang);
  return r;
}

// ---------------------------------------------------------------------------------------------------
// Mit Brücke und Speicher (nur in der Android-App)
// ---------------------------------------------------------------------------------------------------

/** Brücke des Hintergrund-Plugins (daten/bruecke_capacitor.js installiereHintergrundBruecke), oder null. */
export function findeBruecke(ziel = globalThis) {
  const b = ziel && ziel.MF && ziel.MF.native && ziel.MF.native.hintergrund;
  return b && typeof b.eingangUebernehmen === "function" ? b : null;
}

/**
 * Eingang übernehmen: Android gibt den Korb heraus (und legt einen neuen an), die App legt ab, dann wird bestätigt und gelöscht.
 * Scheitert das Ablegen, bleibt der Korb liegen und kommt beim nächsten Mal wieder (Doppelte fängt quelle.id ab).
 * @returns {Promise<{ neu:number, ersetzt:number, arten:object, fehlerZeilen:number, marke:string|null }>}
 */
export async function abholen({ speicher, bruecke }) {
  if (!bruecke || !speicher) return { neu: 0, ersetzt: 0, arten: {}, fehlerZeilen: 0, marke: null };
  const r = (await bruecke.eingangUebernehmen()) || {};
  const dateien = r.dateien || {};
  if (!Object.keys(dateien).length) { if (r.marke) await bruecke.eingangBestaetigen({ marke: r.marke }); return { neu: 0, ersetzt: 0, arten: {}, fehlerZeilen: 0, marke: r.marke || null }; }
  // Herzschläge aus dem Speicher für Trainings, deren Puls schon früher kam
  let herzschlaege = [];
  if (dateien.ExerciseSession) {
    const sitzungen = jsonlLesen(Array.isArray(dateien.ExerciseSession) ? dateien.ExerciseSession.map((x) => JSON.stringify(x)).join("\n") : dateien.ExerciseSession).datensaetze;
    const zeiten = sitzungen.map((x) => Number(x.startTime)).filter(Number.isFinite);
    if (zeiten.length) herzschlaege = await leseMessungen(speicher, "herzschlag", K.plusTage(K.isoTag(Math.min(...zeiten)), -1), K.plusTage(K.isoTag(Math.max(...zeiten)), 1));
  }
  const paket = eingangZuPaket(dateien, { herzschlaege });
  const abgelegt = await speichereMessungen(speicher, paket);
  if (r.marke) await bruecke.eingangBestaetigen({ marke: r.marke });
  return { neu: abgelegt.neu, ersetzt: abgelegt.ersetzt, arten: zaehlen(paket), fehlerZeilen: paket.fehlerZeilen || 0, marke: r.marke || null };
}

/** Kurzer Fingerabdruck eines Textes (FNV-1a, 32 Bit) – nur um unveränderten Kontext nicht erneut zu schicken. */
export function fingerabdruck(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${text.length.toString(36)}-${h.toString(36)}`;
}

let letzterKontext = null;

/**
 * Kontext und Zusammenfassung an Android geben und die Widgets nachführen. Ohne eigene Messwerte (Demodaten der App) wird eine
 * leere Zusammenfassung geschrieben – Widgets und Mitteilung zeigen nie erfundene Werte als echte.
 */
export async function spiegeln({ speicher, bruecke, jetzt = Date.now() }) {
  if (!bruecke || !speicher) return null;
  const heute = K.isoTag(jetzt);
  const ab = K.plusTage(heute, -(Math.max(K.wert("basis.fenster.lang"), K.wert("schlaf.schuld.fenster")) + VORGABEN.reserveTage + 1));
  const paket = leeresPaket();
  for (const art of RECHEN_ARTEN) paket[art] = await leseMessungen(speicher, art, ab);
  const einst = (await speicher.lies("einstellungen")) || {};
  const eigene = RECHEN_ARTEN.some((a) => paket[a].length);
  const kontext = kontextAusPaket(paket, heute);
  const kontextText = JSON.stringify(kontext);
  const marke = fingerabdruck(kontextText);
  if (marke !== letzterKontext && typeof bruecke.kontextSchreiben === "function") {
    await bruecke.kontextSchreiben({ json: kontextText, marke, einstellungen: JSON.stringify({ ...einstellungenFuerKern(einst), sprache: einst.sprache || "de" }) });
    letzterKontext = marke;
  }
  const z = zusammenfassung(eigene ? paket : {}, einst, { jetzt, quelle: "app", demo: !eigene });
  await bruecke.zusammenfassungSchreiben({ json: JSON.stringify(z) });
  if (typeof bruecke.widgetsAktualisieren === "function") await bruecke.widgetsAktualisieren();
  return z;
}

/** Nur für Tests: Merker des letzten Kontexts zurücksetzen. */
export function _zuruecksetzen() { letzterKontext = null; }

/** Erlaubte Sprungziele aus Mitteilung und Widget (alles andere wird ignoriert). */
export const WEGE = ["#/heute", "#/schlaf", "#/belastung", "#/atem", "#/mehr/mitteilungen"];

/**
 * In der Android-App einhängen: wartet auf den Speicher der Shell, übernimmt den Eingang (und lädt die Shell neu, wenn etwas
 * Neues kam), spiegelt die Zusammenfassung; danach bei jeder Rückkehr abholen, bei jedem Verlassen spiegeln. Sprünge aus
 * Mitteilung/Widget („weg“) setzen die Adresse. Im Browser und in Node tut die Funktion nichts.
 * @returns {object|null} Steuerobjekt { abholen, spiegeln } oder null
 */
export function einhaengen(ziel = globalThis) {
  if (!ziel || typeof ziel !== "object") return null;
  const bruecke = findeBruecke(ziel) || (installiereHintergrundBruecke(ziel) && findeBruecke(ziel));
  if (!bruecke || ziel.__mfHintergrund) return ziel && ziel.__mfHintergrund ? ziel.__mfHintergrund : null;
  const speicherVon = () => (ziel.MF && ((ziel.MF.shell && ziel.MF.shell.speicher) || ziel.MF.speicher)) || null;
  let laeuft = Promise.resolve();
  const nacheinander = (fn) => (laeuft = laeuft.then(fn, fn).catch((e) => { if (ziel.console) ziel.console.warn("Hintergrund:", e); }));
  const steuer = {
    abholen: () => nacheinander(async () => {
      const sp = speicherVon(); if (!sp) return null;
      const r = await abholen({ speicher: sp, bruecke });
      if (r.neu > 0 && ziel.MF.shell && typeof ziel.MF.shell.neuLaden === "function") await ziel.MF.shell.neuLaden();
      return r;
    }),
    spiegeln: () => nacheinander(async () => { const sp = speicherVon(); return sp ? spiegeln({ speicher: sp, bruecke }) : null; }),
  };
  ziel.__mfHintergrund = steuer;
  if (typeof bruecke.beiWeg === "function") bruecke.beiWeg((weg) => { if (WEGE.includes(weg) && ziel.location) ziel.location.hash = weg; });
  let versuche = 0;
  const start = () => {
    if (!speicherVon()) { if (++versuche < VORGABEN.warteVersuche && ziel.setTimeout) ziel.setTimeout(start, VORGABEN.warteMs); return; }
    steuer.abholen().then(() => steuer.spiegeln());
  };
  start();
  const doc = ziel.document;
  if (doc && typeof doc.addEventListener === "function") {
    doc.addEventListener("visibilitychange", () => { if (doc.visibilityState === "hidden") steuer.spiegeln(); else steuer.abholen().then(() => steuer.spiegeln()); });
  }
  return steuer;
}
