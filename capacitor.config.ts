// Capacitor-Einstellungen der Android-Hülle von MAEHR FIT.
// webDir "dist" enthält nur index.html = Kopie von MF.html (android/bau_dist.py, Aufruf über "npm run bau").
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.maehrsteuern.fit",
  appName: "MAEHR FIT",
  webDir: "dist",
  android: {
    // Keine gemischten Inhalte, kein Fernzugriff: die App lädt nur ihre eigene Datei.
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // Live-Puls (@capacitor-community/bluetooth-le): Texte der Android-Geräteauswahl auf Deutsch
    BluetoothLe: {
      displayStrings: { scanning: "Suche Pulsmesser …", cancel: "Abbrechen", availableDevices: "Gefundene Pulsmesser", noDeviceFound: "Kein Pulsmesser gefunden" },
    },
  },
};

export default config;
