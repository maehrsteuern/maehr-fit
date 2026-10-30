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
  plugins: {},
};

export default config;
