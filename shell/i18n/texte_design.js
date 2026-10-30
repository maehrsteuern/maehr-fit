/* shell/i18n/texte_design.js – Texte für das Kleid „Nacht“ (Heldenring, Kacheln, Schlafbild, Live-Herz, Beleg-Bogen).
 *
 * Kernaussage: Die neuen Bausteine des Designs bringen ein paar eigene Sätze mit. Sie stehen hier auf Deutsch und Englisch und
 * werden beim Laden in dieselbe Texttabelle wie alle anderen eingetragen (TEXTE aus shell/i18n/i18n.js); t() findet sie wie jeden
 * anderen Text. tests/node/shell_i18n.test.mjs prüft auch diese Datei (beide Sprachen, gleiche Platzhalter, keine Heilaussagen).
 */
import { TEXTE } from "./i18n.js";

export const TEXTE_DESIGN = {
  held_mittel_aria: ["Strich am Ring: dein Mittel der letzten 30 Tage, {wert}.", "Mark on the ring: your average over the last 30 days, {wert}."],
  held_woche: ["Letzte 7 Tage", "Last 7 days"],
  held_woche_aria: ["Erholung der letzten 7 Tage: {liste}.", "Recovery over the last 7 days: {liste}."],
  held_verlauf: ["Verlauf ansehen", "View history"],
  kachel_bild_aria: ["{titel}: Verlauf der letzten 7 Tage mit üblichem Bereich.", "{titel}: last 7 days with your usual range."],
  delta_zum_bedarf: ["zum Bedarf", "vs. need"],
  phase_kurz_wach: ["Wach", "Awake"], phase_kurz_rem: ["REM", "REM"], phase_kurz_leicht: ["Leicht", "Light"], phase_kurz_tief: ["Tief", "Deep"],
  schlaf_nacht_titel: ["Deine Nacht", "Your night"],
  schlaf_bedarf_kern_schuld: ["Der helle Balken ist dein Bedarf, der volle die geschlafene Zeit; der gestreifte Rest hat gefehlt.", "The light bar is your need, the solid one your time asleep; the striped rest was missing."],
  schlaf_schuld_teil: ["Fehlte", "Missing"],
  schlaf_konstanz_7: ["Regelmäßigkeit der letzten 7 Nächte", "Consistency over the last 7 nights"],
  belastung_zonenring_aria: ["Äußerer Ring: Zeit je Pulszone – {liste}.", "Outer ring: time per heart rate zone – {liste}."],
  belastung_geschaetzt: ["geschätzt aus Zonenanteilen", "estimated from zone shares"],
  training_kurve_aria: ["Pulskurve dieses Trainings, höchster Puls {wert} Schläge pro Minute.", "Heart rate curve of this workout, highest {wert} beats per minute."],
  live_zonenband_aria: ["Pulszonen 1 bis 5; die Marke zeigt deinen Puls jetzt.", "Heart rate zones 1 to 5; the marker shows your heart rate now."],
  beleg_beitraege: ["Beitrag je Bestandteil", "Contribution per component"],
  beleg_ziehen: ["Zum Schließen nach unten ziehen", "Drag down to close"],
  beleg_herkunft: ["Herkunft", "Origin"],
  laden_satz: ["Deine Werte werden geladen …", "Loading your values …"],
};
Object.assign(TEXTE, TEXTE_DESIGN);
