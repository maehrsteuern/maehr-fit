package de.maehrsteuern.fit;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import de.maehrsteuern.fit.healthconnect.HealthConnectPlugin;
import de.maehrsteuern.fit.hintergrund.HintergrundPlugin;

/**
 * Hülle der Web-App MF.html. Eigene Plugins: Health Connect (android/plugins/healthconnect) sowie Hintergrund-Abgleich,
 * Mitteilungen und Widgets (android/plugins/hintergrund). Sprünge aus Mitteilung/Widget kommen als Extra "mf_weg" an und
 * werden vom Hintergrund-Plugin als Ereignis "weg" an die App gegeben (launchMode singleTask → onNewIntent).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Eigene Plugins vor super.onCreate anmelden (Capacitor baut die Brücke in onCreate).
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(HintergrundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
