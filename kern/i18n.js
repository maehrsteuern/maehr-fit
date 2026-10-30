/* kern/i18n.js – Beschriftungen des Kerns auf Deutsch und Englisch.
 *
 * Kernaussage: Jede Beschriftung, die der Kern liefert (Zonen, Stufen, Tagebuch-Fragen, Formelnamen, Atemübungen),
 * steht hier einmal mit deutscher und englischer Fassung. t("schluessel", "en") holt sie; fehlt Englisch, kommt
 * Deutsch, fehlt der Schlüssel, kommt der Schlüssel selbst zurück. Texte der Oberfläche liegen in shell/i18n/.
 */

export const SPRACHEN = ["de", "en"];
export const STANDARD = "de";

/** Wörterbuch: schluessel → [de, en]. */
const W = {
  // Kennzahlen
  "erholung": ["Erholung", "Recovery"],
  "belastung": ["Belastung", "Strain"],
  "schlaf": ["Schlaf", "Sleep"],
  "schlaf.leistung": ["Schlafleistung", "Sleep performance"],
  "schlaf.bedarf": ["Schlafbedarf", "Sleep need"],
  "schlaf.schuld": ["Schlafschuld", "Sleep debt"],
  "schlaf.effizienz": ["Schlafeffizienz", "Sleep efficiency"],
  "schlaf.konsistenz": ["Regelmäßigkeit", "Consistency"],
  "hrv": ["Herzfrequenzvariabilität (HRV)", "Heart rate variability (HRV)"],
  "ruhepuls": ["Ruhepuls", "Resting heart rate"],
  "atem": ["Atemfrequenz", "Respiratory rate"],
  "spo2": ["Sauerstoffsättigung", "Blood oxygen"],
  "hauttemp": ["Hauttemperatur", "Skin temperature"],
  "basislinie": ["Normalbereich", "Baseline"],
  // Stufen
  "stufe.gruen": ["Grün – besser erholt als üblich", "Green – better recovered than usual"],
  "stufe.gelb": ["Gelb – im üblichen Bereich", "Yellow – within your usual range"],
  "stufe.rot": ["Rot – weniger erholt als üblich", "Red – less recovered than usual"],
  // Zonen
  "zone.0": ["Unter Zone 1", "Below zone 1"],
  "zone.1": ["Zone 1 – sehr leicht", "Zone 1 – very light"],
  "zone.2": ["Zone 2 – leicht", "Zone 2 – light"],
  "zone.3": ["Zone 3 – mittel", "Zone 3 – moderate"],
  "zone.4": ["Zone 4 – hart", "Zone 4 – hard"],
  "zone.5": ["Zone 5 – maximal", "Zone 5 – maximum"],
  // Schlafphasen
  "phase.wach": ["Wach", "Awake"],
  "phase.leicht": ["Leichtschlaf", "Light sleep"],
  "phase.tief": ["Tiefschlaf", "Deep sleep"],
  "phase.rem": ["REM-Schlaf", "REM sleep"],
  // Bedarfsteile
  "bedarf.basis": ["Grundbedarf", "Baseline need"],
  "bedarf.belastung": ["Ausgleich Belastung", "Strain adjustment"],
  "bedarf.schuld": ["Ausgleich Schlafschuld", "Sleep debt repayment"],
  "bedarf.nickerchen": ["Nickerchen", "Naps"],
  // Erholungsteile und Gründe
  "teil.hrv": ["HRV", "HRV"],
  "teil.ruhepuls": ["Ruhepuls", "Resting heart rate"],
  "teil.schlaf": ["Schlafleistung", "Sleep performance"],
  "teil.atem": ["Atemfrequenz", "Respiratory rate"],
  "teil.hauttemp": ["Hauttemperatur", "Skin temperature"],
  "teil.spo2": ["Sauerstoffsättigung", "Blood oxygen"],
  "grund.kein_messwert": ["kein Messwert", "no measurement"],
  "grund.basis_zu_klein": ["noch zu wenige Tage für den Normalbereich", "not enough days for a baseline yet"],
  "grund.zu_wenig_daten": ["zu wenige Daten", "not enough data"],
  // Formeln
  "formel.erholung": ["Formel Erholung", "Recovery formula"],
  "formel.belastung": ["Formel Belastung", "Strain formula"],
  "formel.belastung.karvonen": ["Pulszonen nach Karvonen", "Heart-rate zones (Karvonen)"],
  "formel.puls.max.tanaka": ["Maximalpuls nach Tanaka", "Maximum heart rate (Tanaka)"],
  "formel.schlaf.leistung": ["Formel Schlafleistung", "Sleep performance formula"],
  "formel.schlaf.bedarf": ["Formel Schlafbedarf", "Sleep need formula"],
  "formel.basis.mittel": ["Normalbereich", "Baseline"],
  "formel.basis.hrv_ln": ["Normalbereich HRV (logarithmiert)", "HRV baseline (log)"],
  "formel.tagebuch.wirkung": ["Vergleich Tagebuch", "Journal comparison"],
  "formel.trend.band": ["Band im Verlauf", "Trend band"],
  // Atemübungen
  "atem.box": ["Box-Atmung", "Box breathing"],
  "atem.vier-sieben-acht": ["4-7-8-Atmung", "4-7-8 breathing"],
  "atem.kohaerenz": ["Kohärente Atmung", "Coherent breathing"],
  "atem.seufzer": ["Physiologischer Seufzer", "Physiological sigh"],
  "atem.entspannung": ["Entspannungsatmung", "Relaxation breathing"],
  "atem.box.beschreibung": ["4 Sekunden ein, 4 halten, 4 aus, 4 halten.", "Breathe in 4 s, hold 4, out 4, hold 4."],
  "atem.vier-sieben-acht.beschreibung": ["4 Sekunden ein, 7 halten, 8 aus.", "Breathe in 4 s, hold 7, out 8."],
  "atem.kohaerenz.beschreibung": ["5,5 Sekunden ein, 5,5 aus – ruhig und gleichmäßig.", "Breathe in 5.5 s, out 5.5 – calm and even."],
  "atem.seufzer.beschreibung": ["Tief ein, kurz nachatmen, lange aus.", "Deep breath in, short top-up, long breath out."],
  "atem.entspannung.beschreibung": ["4 Sekunden ein, 6 aus.", "Breathe in 4 s, out 6."],
  "atem.phase.ein": ["Einatmen", "Breathe in"],
  "atem.phase.halten": ["Halten", "Hold"],
  "atem.phase.aus": ["Ausatmen", "Breathe out"],
  "atem.phase.halten2": ["Halten", "Hold"],
  "atem.phase.nachatmen": ["Nachatmen", "Top up"],
  // Tagebuch
  "tagebuch.alkohol": ["Alkohol", "Alcohol"],
  "tagebuch.koffein_spaet": ["Koffein nach 14 Uhr", "Caffeine after 2 pm"],
  "tagebuch.bildschirm_spaet": ["Bildschirm im Bett", "Screen in bed"],
  "tagebuch.spaete_mahlzeit": ["Späte Mahlzeit", "Late meal"],
  "tagebuch.meditation": ["Meditation", "Meditation"],
  "tagebuch.atemuebung": ["Atemübung", "Breathing exercise"],
  "tagebuch.kaltdusche": ["Kalt geduscht", "Cold shower"],
  "tagebuch.sauna": ["Sauna", "Sauna"],
  "tagebuch.lesen": ["Gelesen vor dem Schlafen", "Read before sleep"],
  "tagebuch.stress": ["Stressiger Tag", "Stressful day"],
  "tagebuch.krank": ["Krank gefühlt", "Felt sick"],
  "tagebuch.reisen": ["Unterwegs / Reise", "Travelling"],
  "tagebuch.hinweis.zu_wenig": [
    "Noch zu wenige Tage für einen Vergleich: je Gruppe braucht es mindestens {minN} (mit: {mit}, ohne: {ohne}). Das zeigt einen Zusammenhang, keinen Beweis.",
    "Not enough days to compare yet: each group needs at least {minN} (with: {mit}, without: {ohne}). This shows a correlation, not proof."],
  "tagebuch.hinweis.vergleich": [
    "Deine Erholung am Morgen danach war im Mittel {differenz} Punkte anders. Das zeigt einen Zusammenhang, keinen Beweis.",
    "Your recovery the next morning differed by {differenz} points on average. This shows a correlation, not proof."],
  // Allgemein
  "hinweis.kein_rat": ["Messwerte und Tendenzen, keine medizinische Beratung.", "Measurements and tendencies, not medical advice."],
  // Beleg Erholung: ausgelassene Teile in einer Zeile (shell/kern_echt.js)
  "erholung.nicht_beruecksichtigt": ["Nicht berücksichtigt: {liste}", "Not included: {liste}"],
  // Einstellungen: Ruhepuls als Rückfall (shell/apps/daten.js)
  "einst.ruhepuls": ["Ruhepuls (Schläge/min, optional)", "Resting heart rate (beats/min, optional)"],
  "einst.ruhepuls.hilfe": ["nur nötig, wenn keine Nachtmessung vorliegt, z. B. nur Live-Puls", "only needed without night measurements, e.g. live heart rate only"],
};

/**
 * Beschriftung holen.
 * @param {string} schluessel
 * @param {"de"|"en"} [sprache="de"]
 * @param {Object<string, string|number>} [platzhalter] ersetzt {name}
 * @returns {string}
 */
export function t(schluessel, sprache = STANDARD, platzhalter) {
  const e = W[schluessel];
  const i = Math.max(0, SPRACHEN.indexOf(sprache));
  let text = e ? e[i] || e[0] : schluessel;
  if (platzhalter) for (const [k, v] of Object.entries(platzhalter)) text = text.split("{" + k + "}").join(String(v));
  return text;
}

/** Gibt es den Schlüssel? */
export const hat = (schluessel) => Object.prototype.hasOwnProperty.call(W, schluessel);

/** Schlüssel, denen eine Sprache fehlt (für den Vollständigkeitstest). */
export const fehlend = () => Object.entries(W).filter(([, v]) => SPRACHEN.some((_, i) => !v[i])).map(([k]) => k);

/** Alle Schlüssel. */
export const alleSchluessel = () => Object.keys(W);
