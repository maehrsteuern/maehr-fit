// tests/node/hilfe_whoop_de.mjs – erfundener deutscher WHOOP-Export (Musterperson) für den Ende-zu-Ende-Test.
// Kein Test, nur Hilfe (wird von daten_ende_zu_ende.test.mjs geladen). Alle Werte erfunden.
//
// Zehn Nächte: Aufwachen 22.10. bis 31.10.2026 (Heute = 31.10.), Berlin. Zeitumstellung am 25.10. um 03:00 (MESZ → MEZ):
// Zyklen, die vor der Umstellung beginnen, tragen "UTC+02:00", die danach "UTC+01:00" (oder in Variante C "Europe/Berlin").
// Eine Zeile Schlaf.csv ist ein Nickerchen (27.10. 14:00–14:40). Trainings: 23., 25., 27., 29., 30.10.
// Varianten der Datei: A = "," + ISO-Zeit + Dezimalpunkt (WHOOP wie bekannt), B = ";" + ISO-Zeit + Dezimalkomma + Ja/Nein,
// C = ";" + "TT.MM.JJJJ hh:mm" + Dezimalkomma + IANA-Zone, D = "," + ISO-Zeit + Dezimalkomma in Anführungszeichen.
// kopf: "de" (Kopfzeilen des Nutzers) oder "en" (englischer Export). reihenfolge: "auf" (älteste zuerst) oder "ab" (neueste zuerst, wie WHOOP).

export const KOEPFE = {
  de: {
    zyklusStart: "Startzeit des Zyklus", zyklusEnde: "Endzeit des Zyklus", zone: "Zeitzone des Zyklus", erholung: "Erholungswert %",
    ruhepuls: "Ruheherzfrequenz (Schläge pro Minute)", hrv: "Herzfrequenzvariabilität (ms)", hauttemp: "Hauttemperatur (Celsius)", spo2: "Blutsauerstoff %",
    tagesbelastung: "Tagesbelastung", energie: "Verbrannte Energie (cal)", maxPuls: "Max HF (Schläge pro Minute)", mittelPuls: "Durchschnittliche HF (Schläge pro Minute)",
    einschlafen: "Beginn des Schlafs", aufwachen: "Beginn des Aufwachens", schlafLeistung: "Schlafleistung %", atem: "Atemfrequenz (Atemzüge/Min.)",
    schlafMin: "Schlafdauer (Min.)", imBettMin: "Dauer im Bett (Min.)", leichtMin: "Dauer des Leichtschlafs (Min.)", tiefMin: "Dauer des Tiefschlafs (Min.)",
    remMin: "Dauer des REM-Schlafs (Min.)", wachMin: "Dauer des Aufwachens (Min.)", bedarfMin: "Schlafbedarf (Min.)", schuldMin: "Schlafdefizit (Min.)",
    effizienz: "Schlafeffizienz %", konstanz: "Schlafbeständigkeit %", nickerchen: "Nickerchen",
    trainingStart: "Startzeit des Trainings", trainingEnde: "Endzeit des Trainings", dauerMin: "Dauer (Min.)", aktivitaet: "Name der Aktivität",
    trainingsbelastung: "Aktivitätsbelastung", zone1: "HF-Zone 1 %", zone2: "HF-Zone 2 %", zone3: "HF-Zone 3 %", zone4: "HF-Zone 4 %", zone5: "HF-Zone 5 %", gps: "GPS aktiviert",
    frage: "Fragetext", antwort: "Beantwortet mit Ja", notiz: "Anmerkungen",
  },
  en: {
    zyklusStart: "Cycle start time", zyklusEnde: "Cycle end time", zone: "Cycle timezone", erholung: "Recovery score %",
    ruhepuls: "Resting heart rate (bpm)", hrv: "Heart rate variability (ms)", hauttemp: "Skin temp (celsius)", spo2: "Blood oxygen %",
    tagesbelastung: "Day Strain", energie: "Energy burned (cal)", maxPuls: "Max HR (bpm)", mittelPuls: "Average HR (bpm)",
    einschlafen: "Sleep onset", aufwachen: "Wake onset", schlafLeistung: "Sleep performance %", atem: "Respiratory rate (rpm)",
    schlafMin: "Asleep duration (min)", imBettMin: "In bed duration (min)", leichtMin: "Light sleep duration (min)", tiefMin: "Deep (SWS) duration (min)",
    remMin: "REM duration (min)", wachMin: "Awake duration (min)", bedarfMin: "Sleep need (min)", schuldMin: "Sleep debt (min)",
    effizienz: "Sleep efficiency %", konstanz: "Sleep consistency %", nickerchen: "Nap",
    trainingStart: "Workout start time", trainingEnde: "Workout end time", dauerMin: "Duration (min)", aktivitaet: "Activity name",
    trainingsbelastung: "Activity Strain", zone1: "HR Zone 1 %", zone2: "HR Zone 2 %", zone3: "HR Zone 3 %", zone4: "HR Zone 4 %", zone5: "HR Zone 5 %", gps: "GPS enabled",
    frage: "Question text", antwort: "Answered yes", notiz: "Notes",
  },
};

const MIN = 60000;
const tz = (d, h, mi) => (Date.UTC(2026, 9, d, h, mi) < Date.UTC(2026, 9, 25, 1, 0) ? 120 : 60); // MESZ bis 25.10. 03:00 Ortszeit (= 01:00 UTC)

/** Zehn Nächte. w = Aufwachtag im Oktober; on = Einschlafzeit am Vortag [h, min]; wa = Aufwachzeit [h, min]; Phasen in Minuten. */
export const NAECHTE = [
  { w: 22, on: [23, 5], wa: [6, 50], tief: 95, rem: 105, wach: 40, erh: 66, rhr: 54, hrv: 55.2, haut: 33.40, spo2: 96.0, belast: 10.4, atem: 14.6, leistung: 90, bedarf: 470, schuld: 30, eff: 92, kons: 80 },
  { w: 23, on: [23, 14], wa: [6, 58], tief: 98, rem: 113, wach: 52, erh: 67, rhr: 53, hrv: 52.0, haut: 33.42, spo2: 96.1, belast: 11.3, atem: 14.7, leistung: 88, bedarf: 470, schuld: 31, eff: 89, kons: 77 },
  { w: 24, on: [23, 40], wa: [7, 5], tief: 81, rem: 109, wach: 65, erh: 54, rhr: 55, hrv: 44.5, haut: 33.61, spo2: 95.8, belast: 8.9, atem: 15.1, leistung: 79, bedarf: 480, schuld: 52, eff: 85, kons: 71 },
  { w: 25, on: [23, 40], wa: [7, 5], tief: 90, rem: 100, wach: 50, erh: 62, rhr: 54, hrv: 48.0, haut: 33.50, spo2: 95.5, belast: 12.1, atem: 14.9, leistung: 83, bedarf: 480, schuld: 40, eff: 88, kons: 74 },
  { w: 26, on: [22, 55], wa: [6, 40], tief: 112, rem: 121, wach: 34, erh: 81, rhr: 51, hrv: 63.4, haut: 33.38, spo2: 96.4, belast: 6.2, atem: 14.4, leistung: 95, bedarf: 455, schuld: 12, eff: 93, kons: 82 },
  { w: 27, on: [23, 20], wa: [6, 40], tief: 104, rem: 113, wach: 35, erh: 74, rhr: 52, hrv: 58.9, haut: 33.47, spo2: 96.2, belast: 9.3, atem: 14.6, leistung: 90, bedarf: 460, schuld: 20, eff: 92, kons: 80 },
  { w: 28, on: [23, 5], wa: [6, 45], tief: 92, rem: 118, wach: 30, erh: 70, rhr: 53, hrv: 56.1, haut: 33.52, spo2: 95.9, belast: 13.0, atem: 14.5, leistung: 93, bedarf: 470, schuld: 18, eff: 93, kons: 79 },
  { w: 29, on: [23, 30], wa: [7, 10], tief: 85, rem: 95, wach: 70, erh: 49, rhr: 57, hrv: 41.3, haut: 33.95, spo2: 95.2, belast: 14.2, atem: 15.4, leistung: 76, bedarf: 490, schuld: 70, eff: 85, kons: 66 },
  { w: 30, on: [22, 50], wa: [6, 55], tief: 99, rem: 132, wach: 45, erh: 77, rhr: 52, hrv: 61.0, haut: 33.44, spo2: 96.3, belast: 12.6, atem: 14.3, leistung: 96, bedarf: 470, schuld: 10, eff: 91, kons: 81 },
  { w: 31, on: [23, 15], wa: [6, 30], tief: 88, rem: 99, wach: 38, erh: 72, rhr: 53, hrv: 57.7, haut: 33.46, spo2: 96.0, belast: 5.0, atem: 14.7, leistung: 85, bedarf: 465, schuld: 22, eff: 91, kons: 78 },
];
// Leichtschlaf = Zeit im Bett − Tief − REM − Wach (aus den Zeiten abgeleitet, damit Bettzeit, Phasensumme und Zeitstempel zusammenpassen).

export const NICKERCHEN = { d: 27, von: [14, 0], bis: [14, 40], leicht: 28, tief: 0, rem: 4, wach: 8 }; // 40 min im Bett
export const TRAININGS = [
  { d: 23, von: [17, 30], min: 50, name: "Laufen", belast: 10.2, energie: 520, maxHf: 172, mittelHf: 148, zonen: [6, 14, 40, 30, 10] },
  { d: 25, von: [18, 0], min: 60, name: "Krafttraining", belast: 8.1, energie: 380, maxHf: 150, mittelHf: 118, zonen: [20, 35, 30, 12, 3] },
  { d: 27, von: [17, 45], min: 45, name: "Radfahren", belast: 9.4, energie: 450, maxHf: 165, mittelHf: 140, zonen: [8, 22, 41, 24, 5] },
  { d: 29, von: [18, 15], min: 55, name: "Laufen", belast: 12.0, energie: 600, maxHf: 178, mittelHf: 152, zonen: [4, 10, 38, 33, 15] },
  { d: 30, von: [12, 30], min: 40, name: "Yoga", belast: 4.0, energie: 160, maxHf: 110, mittelHf: 92, zonen: [60, 30, 10, 0, 0] },
];

/** Tagebuch der deutschen WHOOP-App (Fragetexte erfunden nach dem Muster der App); je Zyklus (Aufwachtag w) einige Fragen. */
export const FRAGEN_DE = [
  ["Alkohol getrunken?", { 23: true, 24: true, 25: false, 26: false, 27: true, 28: false, 29: false, 30: true, 31: false }],
  ["Koffein konsumiert?", { 23: true, 24: true, 25: true, 26: true, 27: true, 28: true, 29: true, 30: true, 31: true }],
  ["Mit Bildschirmgerät im Bett?", { 23: true, 24: false, 25: true, 26: false, 27: true, 28: false, 29: true, 30: false, 31: true }],
  ["Kurz vor dem Schlafengehen gegessen?", { 23: false, 24: true, 25: false, 26: false, 27: true, 28: false, 29: false, 30: true, 31: false }],
  ["Meditiert?", { 23: false, 24: false, 25: true, 26: true, 27: false, 28: true, 29: false, 30: false, 31: true }],
  ["Krank oder unwohl gefühlt?", { 24: false, 25: false, 26: false, 27: false, 28: false, 29: true, 30: false }],
  ["Im Bett gelesen?", { 23: true, 24: false, 25: true, 26: true, 27: false, 28: true, 29: false, 30: true, 31: false }],
  ["Eisbad genommen?", { 25: true, 26: false, 27: false }],
];

const dez = (v, x) => (x === null || x === undefined || x === "" ? "" : v.dezimal === "," ? String(x).replace(".", ",") : String(x));
const zwei = (n) => String(n).padStart(2, "0");

/** Wahrer Versatz Berlins zu einem UTC-Zeitpunkt (MESZ bis 25.10.2026 01:00 UTC). */
const berlinMin = (ms) => (ms < Date.UTC(2026, 9, 25, 1, 0) ? 120 : 60);

function zeitText(v, ms, zoneMin) {
  if (v.zone === "IANA") zoneMin = berlinMin(ms); // IANA-Zone: Wanduhr stimmt für jeden Zeitpunkt einzeln
  const d = new Date(ms + zoneMin * MIN);
  const [J, M, T, h, mi] = [d.getUTCFullYear(), zwei(d.getUTCMonth() + 1), zwei(d.getUTCDate()), zwei(d.getUTCHours()), zwei(d.getUTCMinutes())];
  return v.zeit === "de" ? `${T}.${M}.${J} ${h}:${mi}` : `${J}-${M}-${T} ${h}:${mi}:00`;
}
const VARIANTEN = {
  A: { t: ",", zeit: "iso", dezimal: ".", jn: ["true", "false"], zone: "UTC" },
  B: { t: ";", zeit: "iso", dezimal: ",", jn: ["Ja", "Nein"], zone: "UTC" },
  C: { t: ";", zeit: "de", dezimal: ",", jn: ["Ja", "Nein"], zone: "IANA" },
  D: { t: ",", zeit: "iso", dezimal: ",", jn: ["Ja", "Nein"], zone: "UTC" },
};
const maskiere = (v, s) => (String(s).includes(v.t) || String(s).includes('"') || /[\r\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s));
const zeile = (v, werte) => werte.map((w) => maskiere(v, w)).join(v.t);

/** Zeitpunkt (UTC-ms) einer Ortszeit am Tag d (Oktober) in der Zone, die der Zyklus nennt. */
const utc = (d, h, mi, zoneMin) => Date.UTC(2026, 9, d, h, mi) - zoneMin * MIN;

/** Berechnete Nachtdaten: Einschlafen/Aufwachen in UTC-ms (Zone des Zyklus = Zone beim Einschlafen). */
export function nachtZeiten(n) {
  const zm = tz(n.w - 1, n.on[0], n.on[1]);
  const von = utc(n.w - 1, n.on[0], n.on[1], zm), bis = utc(n.w, n.wa[0], n.wa[1], zm);
  return { zm, von, bis, imBett: (bis - von) / MIN, leicht: (bis - von) / MIN - n.tief - n.rem - n.wach };
}

/**
 * Vier Dateien als [{name, text}].
 * @param {{variante?: "A"|"B"|"C"|"D", kopf?: "de"|"en", reihenfolge?: "auf"|"ab"}} opt
 */
export function baueDateien({ variante = "A", kopf = "de", reihenfolge = "auf" } = {}) {
  const v = VARIANTEN[variante], K = KOEPFE[kopf];
  const ordne = (liste) => (reihenfolge === "ab" ? [...liste].reverse() : liste);
  const zonenText = (zm, ms) => (v.zone === "IANA" ? "Europe/Berlin" : `UTC${zm >= 0 ? "+" : "-"}${zwei(Math.abs(zm) / 60)}:00`);
  const jn = (b) => v.jn[b ? 0 : 1];
  const zyk = [], sl = [], tr = [], lb = [];
  const zyklus = (n) => {
    const { zm, von } = nachtZeiten(n);
    const naechste = NAECHTE.find((x) => x.w === n.w + 1);
    const ende = naechste ? nachtZeiten(naechste).von : null;
    return { zm, start: von, ende };
  };
  for (const n of NAECHTE) {
    const { zm, von, bis, leicht } = nachtZeiten(n), z = zyklus(n);
    const schlaf = leicht + n.tief + n.rem, imBett = leicht + n.tief + n.rem + n.wach;
    const zt = (ms) => zeitText(v, ms, zm), zone = zonenText(zm, von);
    const kopfSpalten = [zt(z.start), z.ende === null ? "" : zt(z.ende), zone];
    const nachtSpalten = [zt(von), zt(bis), n.leistung, n.atem, schlaf, imBett, leicht, n.tief, n.rem, n.wach, n.bedarf, n.schuld, n.eff, n.kons].map((x, i) => (i < 2 ? x : dez(v, x)));
    zyk.push(zeile(v, [...kopfSpalten, dez(v, n.erh), dez(v, n.rhr), dez(v, n.hrv), dez(v, n.haut), dez(v, n.spo2), dez(v, n.belast), 2200, 150, 68, ...nachtSpalten.slice(0, 2), ...nachtSpalten.slice(2)]));
    sl.push(zeile(v, [...kopfSpalten, ...nachtSpalten, jn(false)]));
  }
  // Nickerchen als eigene Zeile in Schlaf.csv (Zyklus des 27.10.)
  {
    const n = NAECHTE.find((x) => x.w === NICKERCHEN.d), { zm } = nachtZeiten(n), z = zyklus(n);
    const von = utc(NICKERCHEN.d, NICKERCHEN.von[0], NICKERCHEN.von[1], zm), bis = utc(NICKERCHEN.d, NICKERCHEN.bis[0], NICKERCHEN.bis[1], zm);
    const zt = (ms) => zeitText(v, ms, zm);
    const schlaf = NICKERCHEN.leicht + NICKERCHEN.tief + NICKERCHEN.rem;
    sl.push(zeile(v, [zt(z.start), z.ende === null ? "" : zt(z.ende), zonenText(zm, von), zt(von), zt(bis), "", dez(v, 15), schlaf, schlaf + NICKERCHEN.wach, NICKERCHEN.leicht, NICKERCHEN.tief, NICKERCHEN.rem, NICKERCHEN.wach, "", "", "", "", jn(true)]));
  }
  for (const t of TRAININGS) {
    const n = NAECHTE.find((x) => x.w === t.d), { zm } = nachtZeiten(n), z = zyklus(n);
    const von = utc(t.d, t.von[0], t.von[1], zm), bis = von + t.min * MIN, zt = (ms) => zeitText(v, ms, zm);
    tr.push(zeile(v, [zt(z.start), z.ende === null ? "" : zt(z.ende), zonenText(zm, von), zt(von), zt(bis), t.min, t.name, dez(v, t.belast), t.energie, t.maxHf, t.mittelHf, ...t.zonen.map((x) => dez(v, x)), jn(true)]));
  }
  for (const [frage, antworten] of FRAGEN_DE) {
    for (const [w, ja] of Object.entries(antworten)) {
      const n = NAECHTE.find((x) => x.w === Number(w)), { zm } = nachtZeiten(n), z = zyklus(n), zt = (ms) => zeitText(v, ms, zm);
      lb.push(zeile(v, [zt(z.start), z.ende === null ? "" : zt(z.ende), zonenText(zm, z.start), frage, jn(ja), Number(w) === 29 && frage.startsWith("Alkohol") ? "Feier, 2 Gläser" : ""]));
    }
  }
  const kopfZeile = (felder) => zeile(v, felder.map((f) => K[f]));
  const KZ = ["zyklusStart", "zyklusEnde", "zone"];
  const NACHT = ["einschlafen", "aufwachen", "schlafLeistung", "atem", "schlafMin", "imBettMin", "leichtMin", "tiefMin", "remMin", "wachMin", "bedarfMin", "schuldMin", "effizienz", "konstanz"];
  const text = (k, zeilen) => [k, ...ordne(zeilen)].join("\r\n") + "\r\n";
  return [
    { name: "physiologische_zyklen.csv", text: text(kopfZeile([...KZ, "erholung", "ruhepuls", "hrv", "hauttemp", "spo2", "tagesbelastung", "energie", "maxPuls", "mittelPuls", ...NACHT]), zyk) },
    { name: "Schlaf.csv", text: text(kopfZeile([...KZ, ...NACHT, "nickerchen"]), sl) },
    { name: "Trainings.csv", text: text(kopfZeile([...KZ, "trainingStart", "trainingEnde", "dauerMin", "aktivitaet", "trainingsbelastung", "energie", "maxPuls", "mittelPuls", "zone1", "zone2", "zone3", "zone4", "zone5", "gps"]), tr) },
    { name: "logbuch_eintraege.csv", text: text(kopfZeile([...KZ, "frage", "antwort", "notiz"]), lb) },
  ];
}
