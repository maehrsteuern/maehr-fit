// Brücke Capacitor-Plugin @capacitor-community/bluetooth-le → Live-Puls (daten/ble_puls.js).
//
// Kernaussage: In der Android-App liest MAEHR FIT den Puls über ein fertiges Bluetooth-Modul („BluetoothLe“), das `npx cap sync`
// mit in die App baut (package.json). Android fragt beim ersten Verbinden nach der Erlaubnis „Geräte in der Nähe“; einen
// Standortzugriff braucht die App ab Android 12 nicht (neverForLocation in android/app/src/main/AndroidManifest.xml).
// Im Browser ist das Plugin nicht da – dann übernimmt daten/bruecke_webbluetooth.js oder der Demo-Puls.
//
// Geschrieben gegen die rohe Plugin-Schnittstelle (dieselben Aufrufe, die BleClient aus dem Paket intern macht, Fassung 6.x):
//   initialize({ androidNeverForLocation }) · isEnabled() → { value } · requestDevice({ services }) → { deviceId, name }
//   connect({ deviceId }) · disconnect({ deviceId }) · startNotifications / stopNotifications({ deviceId, service, characteristic })
//   Ereignisse: "disconnected|<deviceId>" und "notification|<deviceId>|<service>|<characteristic>" mit { value } (Hex-Text unter
//   Android, DataView im Web).
// Die Aufrufe laufen nacheinander (das Plugin verträgt keine parallelen GATT-Vorgänge).

import { HR_DIENST_UUID, HR_MESSUNG_UUID, hexZuBytes } from "./ble_puls.js";

/** Plugin-Objekt von Capacitor holen, oder null (Browser, Tests ohne Nachbildung). */
export function blePlugin(ziel = globalThis) {
  const cap = ziel && ziel.Capacitor;
  if (!cap) return null;
  if (typeof cap.isNativePlatform === "function" && !cap.isNativePlatform()) return null;
  if (cap.Plugins && cap.Plugins.BluetoothLe) return cap.Plugins.BluetoothLe;
  if (typeof cap.registerPlugin === "function") return cap.registerPlugin("BluetoothLe");
  return null;
}

/** Wert eines Ereignisses in Bytes: Hex-Text (Android) oder DataView/ArrayBuffer (Web). */
function alsDaten(wert) {
  if (typeof wert === "string") return hexZuBytes(wert);
  if (wert === undefined || wert === null) return new Uint8Array(0);
  return wert;
}

/**
 * Brücke einrichten.
 * @param {object} [ziel] meist window
 * @returns {object|null} null, wenn kein Plugin da ist
 */
export function capacitorBleBruecke(ziel = globalThis) {
  const p = blePlugin(ziel);
  if (!p) return null;
  let bereit = null, geraet = null, hoerer = [];
  const init = () => (bereit ||= p.initialize({ androidNeverForLocation: true }).catch((e) => { bereit = null; throw e; }));
  const ziel3 = () => ({ deviceId: geraet.id, service: HR_DIENST_UUID, characteristic: HR_MESSUNG_UUID });
  async function loesen() { const h = hoerer; hoerer = []; for (const x of h) { try { await x?.remove?.(); } catch { /* schon weg */ } } }

  return {
    art: "capacitor",
    async verfuegbar() {
      try {
        await init();
        const r = await p.isEnabled();
        return r && r.value ? { verfuegbar: true, grund: null } : { verfuegbar: false, grund: "bluetooth_aus" };
      } catch (e) { return { verfuegbar: false, grund: "keine_erlaubnis", text: String(e?.message || e) }; }
    },
    /** Öffnet die Geräteauswahl von Android (nur Pulsmesser mit Dienst 0x180D). */
    async waehle() {
      await init();
      const d = await p.requestDevice({ services: [HR_DIENST_UUID] });
      geraet = { id: d.deviceId, name: d.name || "" };
      return { ...geraet };
    },
    async verbinde({ beiDaten, beiTrennung }) {
      if (!geraet) throw new Error("kein Gerät gewählt");
      await init();
      await loesen();
      const z = ziel3();
      hoerer.push(await p.addListener(`disconnected|${z.deviceId}`, () => { loesen(); beiTrennung?.(); }));
      await p.connect({ deviceId: z.deviceId });
      hoerer.push(await p.addListener(`notification|${z.deviceId}|${z.service}|${z.characteristic}`, (ev) => beiDaten(alsDaten(ev && ev.value))));
      await p.startNotifications(z);
    },
    async trenne() {
      if (!geraet) return;
      const z = ziel3();
      await loesen();
      try { await p.stopNotifications(z); } catch { /* Verbindung schon weg */ }
      try { await p.disconnect({ deviceId: z.deviceId }); } catch { /* schon getrennt */ }
    },
  };
}
