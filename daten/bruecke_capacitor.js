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
 *   erteilt(arten)               → { erteilt: string[] }   (nur nachsehen, nie ein Dialog; für den Abgleich beim Start)
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
    erteilt: (arten) => p.erteilt({ arten }),
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

// ---------------------------------------------------------------------------------------------------
// Hintergrund-Abgleich, Mitteilungen und Widgets (Plugin "Hintergrund", android/plugins/hintergrund/, Kotlin).
// Angehängt am 01.11.2026 (docs/technik/hintergrund.md). Nur in der Android-App; im Browser bleibt alles leer.
// ---------------------------------------------------------------------------------------------------

/** Plugin "Hintergrund" holen, oder null. */
function hintergrundPlugin(ziel) {
  const cap = ziel && ziel.Capacitor;
  if (!cap) return null;
  if (typeof cap.isNativePlatform === "function" && !cap.isNativePlatform()) return null;
  if (cap.Plugins && cap.Plugins.Hintergrund) return cap.Plugins.Hintergrund;
  if (typeof cap.registerPlugin === "function") return cap.registerPlugin("Hintergrund");
  return null;
}

/**
 * Brücken einrichten: `MF.native.hintergrund`, `MF.native.mitteilungen`, `MF.native.widgets`, `MF.native.geraet`.
 *   hintergrund.status()                         → { aktiv, intervallMin, letzterLauf, naechsterLauf, hc, mitteilungen, widgets, geraet, … }
 *   hintergrund.jetzt()                          → startet sofort einen Lauf (Android entscheidet über den genauen Zeitpunkt)
 *   hintergrund.einstellen({ aktiv, intervallMin }) → plant den stündlichen Lauf neu (30, 60 oder 120 Minuten)
 *   hintergrund.eingangUebernehmen()             → { marke, dateien: { HeartRate: "jsonl", … } } (der Korb wird beiseitegelegt)
 *   hintergrund.eingangBestaetigen({ marke })    → beiseitegelegten Korb löschen
 *   hintergrund.kontextSchreiben({ json, marke, einstellungen }) → Messwerte der letzten Wochen für die Rechnung im Hintergrund
 *   hintergrund.zusammenfassungSchreiben({ json }) → Zusammenfassung für Mitteilung und Widgets (aktualisiert die Widgets)
 *   hintergrund.hcHintergrundAnfragen()          → { erteilt } (Health-Connect-Dialog „Im Hintergrund lesen“)
 *   hintergrund.beiWeg(fn)                       → fn("#/heute") nach Tippen auf Mitteilung oder Widget
 *   mitteilungen.einstellen({ morgen: { aktiv, uhrzeit }, erholung: { aktiv }, schlaf: { aktiv } }) (uhrzeit "07:30" oder "aufwachen")
 *   mitteilungen.test() · mitteilungen.recht() → { recht: "granted"|"denied"|"prompt" } · mitteilungen.rechtAnfragen()
 *   widgets.aktualisieren()
 *   geraet.akkuEinstellungen() · geraet.autostartEinstellungen() · geraet.mitteilungsEinstellungen() · geraet.healthConnect()
 * @returns {object|null} MF.native.hintergrund oder null ohne Plugin
 */
export function installiereHintergrundBruecke(ziel = globalThis) {
  const p = hintergrundPlugin(ziel);
  if (!p) return null;
  const hintergrund = {
    status: () => p.status(),
    jetzt: () => p.jetzt(),
    einstellen: (o) => p.einstellen(o || {}),
    eingangUebernehmen: () => p.eingangUebernehmen(),
    eingangBestaetigen: (o) => p.eingangBestaetigen(o || {}),
    kontextSchreiben: (o) => p.kontextSchreiben(o || {}),
    zusammenfassungSchreiben: (o) => p.zusammenfassungSchreiben(o || {}),
    widgetsAktualisieren: () => p.widgetsAktualisieren(),
    hcHintergrundAnfragen: () => p.hcHintergrundAnfragen(),
    beiWeg: (fn) => (typeof p.addListener === "function" ? p.addListener("weg", (e) => fn(e && e.weg)) : null),
  };
  const mitteilungen = {
    einstellen: (o) => p.mitteilungenEinstellen(o || {}),
    test: () => p.mitteilungTest(),
    recht: () => p.mitteilungenRecht(),
    rechtAnfragen: () => p.mitteilungenRechtAnfragen(),
  };
  const widgets = { aktualisieren: () => p.widgetsAktualisieren() };
  const geraet = {
    akkuEinstellungen: () => p.oeffnen({ ziel: "akku" }),
    autostartEinstellungen: () => p.oeffnen({ ziel: "autostart" }),
    mitteilungsEinstellungen: () => p.oeffnen({ ziel: "mitteilungen" }),
    healthConnect: () => p.oeffnen({ ziel: "healthconnect" }),
  };
  ziel.MF = ziel.MF || {};
  ziel.MF.native = ziel.MF.native || {};
  Object.assign(ziel.MF.native, { hintergrund, mitteilungen, widgets, geraet });
  return hintergrund;
}
