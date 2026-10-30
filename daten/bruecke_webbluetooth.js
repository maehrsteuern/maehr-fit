// Brücke Web Bluetooth → Live-Puls (daten/ble_puls.js).
//
// Kernaussage: In Chrome am Rechner und in Chrome unter Android kann MF.html den Puls direkt vom Band lesen. Der Browser zeigt
// dabei selbst eine Liste der Pulsmesser in der Nähe; die App sieht nur das Gerät, das du dort auswählst. Safari und Firefox
// können das nicht – dann bleibt nur die Android-App oder der Demo-Puls. Der Browser verlangt eine sichere Umgebung (https oder
// localhost); ob es mit einer lokal geöffneten Datei (file:) geht, ist nicht geprüft (docs/technik/bluetooth.md).

/**
 * Brücke einrichten.
 * @param {object} [nav] navigator (Tests: Nachbildung)
 * @returns {object|null} null, wenn der Browser kein Web Bluetooth kennt
 */
export function webBluetoothBruecke(nav = globalThis.navigator) {
  const bt = nav && nav.bluetooth;
  if (!bt || typeof bt.requestDevice !== "function") return null;
  let geraet = null, merkmal = null, aufDaten = null, aufTrennung = null;

  function loesen() {
    if (merkmal && aufDaten) merkmal.removeEventListener("characteristicvaluechanged", aufDaten);
    if (geraet && aufTrennung) geraet.removeEventListener("gattserverdisconnected", aufTrennung);
    merkmal = null; aufDaten = null; aufTrennung = null;
  }

  return {
    art: "webbluetooth",
    async verfuegbar() {
      try {
        const da = typeof bt.getAvailability === "function" ? await bt.getAvailability() : true;
        return da ? { verfuegbar: true, grund: null } : { verfuegbar: false, grund: "kein_adapter" };
      } catch { return { verfuegbar: false, grund: "kein_adapter" }; }
    },
    /** Öffnet die Geräteauswahl des Browsers (nur nach einem Tipp des Nutzers erlaubt). */
    async waehle() {
      geraet = await bt.requestDevice({ filters: [{ services: ["heart_rate"] }] });
      return { id: geraet.id || "", name: geraet.name || "" };
    },
    async verbinde({ beiDaten, beiTrennung }) {
      if (!geraet) throw new Error("kein Gerät gewählt");
      loesen();
      aufTrennung = () => { loesen(); beiTrennung?.(); };
      geraet.addEventListener("gattserverdisconnected", aufTrennung);
      const server = await geraet.gatt.connect();
      const dienst = await server.getPrimaryService("heart_rate");
      merkmal = await dienst.getCharacteristic("heart_rate_measurement");
      aufDaten = (ev) => beiDaten(ev.target.value);
      merkmal.addEventListener("characteristicvaluechanged", aufDaten);
      await merkmal.startNotifications();
    },
    async trenne() {
      const m = merkmal, g = geraet;
      loesen();
      try { await m?.stopNotifications(); } catch { /* Verbindung schon weg */ }
      if (g?.gatt?.connected) g.gatt.disconnect();
    },
  };
}
