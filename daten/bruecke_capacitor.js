// Brücke Capacitor-Plugin → `window.MF.native.healthConnect`.
// Das Plugin "HealthConnect" (android/plugins/healthconnect/, Kotlin) ist nur in der Android-App vorhanden.
// Im Browser bleibt `MF.native.healthConnect` leer; die App zeigt dann "Nur in der Android-App".

/**
 * Plugin-Objekt von Capacitor holen, oder null (Browser, Tests).
 * Ohne gebündeltes @capacitor/core legt die native Brücke (native-bridge.js, Capacitor 6) selbst `Capacitor.Plugins.HealthConnect`
 * an (Methoden → `Capacitor.nativePromise`); `registerPlugin` gibt es nur mit @capacitor/core und ist hier der Ausweg.
 */
function plugin(ziel) {
  const cap = ziel && ziel.Capacitor;
  if (!cap) return null;
  if (typeof cap.isNativePlatform === "function" && !cap.isNativePlatform()) return null;
  if (cap.Plugins && cap.Plugins.HealthConnect) return cap.Plugins.HealthConnect;
  if (typeof cap.registerPlugin === "function") return cap.registerPlugin("HealthConnect");
  return null;
}

/**
 * Brücke einrichten. Methoden:
 *   verfuegbar()                 → { verfuegbar, status, hauttemp, verlauf }
 *   berechtigungen(arten)        → { erteilt: string[] }   (öffnet den Health-Connect-Dialog, wenn nötig)
 *   lesen(art, vonMs, bisMs)     → Datensätze im Brückenformat (docs/technik/healthconnect.md)
 *   einstellungen()              → öffnet die Health-Connect-Einstellungen
 * @returns {object|null} die Brücke oder null, wenn kein Plugin da ist
 */
export function installiereBruecke(ziel = globalThis) {
  const p = plugin(ziel);
  if (!p) return null;
  const bruecke = {
    verfuegbar: () => p.verfuegbar(),
    berechtigungen: (arten) => p.berechtigungen({ arten }),
    lesen: async (art, vonMs, bisMs) => {
      const r = await p.lesen({ art, vonMs: Math.round(vonMs), bisMs: Math.round(bisMs) });
      return (r && r.datensaetze) || [];
    },
    einstellungen: () => p.einstellungen(),
  };
  ziel.MF = ziel.MF || {};
  ziel.MF.native = ziel.MF.native || {};
  ziel.MF.native.healthConnect = bruecke;
  return bruecke;
}
