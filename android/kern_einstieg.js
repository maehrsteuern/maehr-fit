/* android/kern_einstieg.js – Einstieg für kern.bundle.js (gebaut von bau.py nach android/app/src/main/assets/kern.bundle.js).
 *
 * Kernaussage: Wenn die App geschlossen ist, rechnet Android die Tageswerte trotzdem – mit genau demselben Rechenkern wie die App.
 * Dafür baut bau.py aus dieser Datei, dem Kern (kern/), der Zuordnung von Health Connect (daten/) und den Texten (shell/i18n/)
 * ein einziges Skript ohne Module. Der Hintergrund-Abgleich (HintergrundAbgleichWorker.kt) lädt es in ein unsichtbares
 * Browserfenster, gibt ihm die Messwerte und bekommt die Zusammenfassung für Mitteilung und Widgets zurück.
 *
 * Schnittstelle (globalThis.MFKern):
 *   alleTage(daten, einst), tagAuswerten(tag, daten, einst), demoDaten({ bis, tage })      – wie kern/index.js
 *   heuteAusMessungen(paketJson, einstJson, jetztMs) → Zusammenfassung (daten/hintergrund.js)
 *   heuteAusEingang(kontextJson, eingangJson, einstJson, jetztMs) → Zusammenfassung
 *   zusammenfassung(paket, einst, { jetzt, quelle }), kontextAusPaket(paket, heute), eingangZuPaket(dateien)
 *   rechneAusNativ()  liest über die Java-Schnittstelle MFNativ (kontext(), eingang(), einstellungen(), jetzt()) und meldet
 *                     MFNativ.ergebnis(json) oder MFNativ.fehler(text) – so muss Android keine großen Texte in Skript einbetten.
 *   VERSION
 */
import * as K from "../kern/index.js";
import { heuteAusMessungen, heuteAusEingang, zusammenfassung, kontextAusPaket, eingangZuPaket, VERSION } from "../daten/hintergrund.js";

function rechneAusNativ() {
  const n = globalThis.MFNativ;
  if (!n) throw new Error("MFNativ fehlt");
  try {
    const z = heuteAusEingang(n.kontext(), n.eingang(), n.einstellungen(), Number(n.jetzt()));
    n.ergebnis(JSON.stringify(z));
  } catch (e) {
    n.fehler(String((e && e.stack) || e));
  }
}

globalThis.MFKern = {
  VERSION,
  alleTage: K.alleTage, tagAuswerten: K.tagAuswerten, demoDaten: K.demoDaten,
  heuteAusMessungen, heuteAusEingang, zusammenfassung, kontextAusPaket, eingangZuPaket, rechneAusNativ,
};
