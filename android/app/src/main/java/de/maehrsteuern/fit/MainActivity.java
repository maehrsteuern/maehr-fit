package de.maehrsteuern.fit;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import de.maehrsteuern.fit.healthconnect.HealthConnectPlugin;

/** Hülle der Web-App MF.html. Das Health-Connect-Plugin liegt im Modul android/plugins/healthconnect. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Eigene Plugins vor super.onCreate anmelden (Capacitor baut die Brücke in onCreate).
        registerPlugin(HealthConnectPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
