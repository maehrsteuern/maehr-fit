package de.maehrsteuern.fit.healthconnect

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.feature.ExperimentalFeatureAvailabilityApi
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Capacitor-Plugin "HealthConnect": liest Gesundheitsdaten aus Android Health Connect (nur Lesen, kein Netz).
 *
 * JavaScript-Seite: daten/bruecke_capacitor.js → window.MF.native.healthConnect.
 * Methoden:
 *   verfuegbar()                       → { verfuegbar, status, hauttemp, verlauf }
 *   berechtigungen({ arten })          → { erteilt: [Art] }   (öffnet den Freigabe-Dialog, wenn etwas fehlt)
 *   erteilt({ arten })                 → { erteilt: [Art] }   (nur nachsehen, nie ein Dialog – für den Abgleich beim App-Start)
 *   lesen({ art, vonMs, bisMs })       → { datensaetze: [...] } im Brückenformat (docs/technik/healthconnect.md)
 *   einstellungen()                    → öffnet Health Connect
 * Art = Health-Connect-Datenart ohne "Record": HeartRate, HeartRateVariabilityRmssd, RestingHeartRate,
 * RespiratoryRate, OxygenSaturation, SkinTemperature, SleepSession, ExerciseSession.
 *
 * Das Lesen selbst steckt in [HealthConnectLeser] (gemeinsam mit dem Hintergrund-Abgleich in android/plugins/hintergrund).
 */
@CapacitorPlugin(name = "HealthConnect")
@OptIn(ExperimentalFeatureAvailabilityApi::class)
class HealthConnectPlugin : Plugin() {

    private val bereich = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val vertrag = PermissionController.createRequestPermissionResultContract()
    private val leser by lazy { HealthConnectLeser(context) }
    private val rechtVerlauf = HealthConnectLeser.RECHT_VERLAUF
    private val arten = HealthConnectLeser.ARTEN

    override fun handleOnDestroy() {
        bereich.cancel()
        super.handleOnDestroy()
    }

    private fun sdkStatus(): Int = leser.sdkStatus()

    private fun client(): HealthConnectClient = leser.client()

    private fun funktion(merkmal: Int): Boolean = leser.funktion(merkmal)

    /** Lesbare Arten auf diesem Gerät (Hauttemperatur gibt es nicht überall). */
    private fun nutzbar(art: String): Boolean = leser.nutzbar(art)

    // ------------------------------------------------------------------------------------------------

    @PluginMethod
    fun verfuegbar(call: PluginCall) {
        val status = sdkStatus()
        val r = JSObject()
        r.put("verfuegbar", status == HealthConnectClient.SDK_AVAILABLE)
        r.put(
            "status",
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> "verfuegbar"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_noetig"
                else -> "nicht_installiert"
            },
        )
        if (status == HealthConnectClient.SDK_AVAILABLE) {
            r.put("hauttemp", funktion(HealthConnectFeatures.FEATURE_SKIN_TEMPERATURE))
            r.put("verlauf", funktion(HealthConnectFeatures.FEATURE_HEALTH_DATA_HISTORIC_READ))
        }
        call.resolve(r)
    }

    @PluginMethod
    fun einstellungen(call: PluginCall) {
        val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    private fun gewuenschteArten(call: PluginCall): List<String> {
        val liste = call.getArray("arten")?.toList<String>() ?: arten.keys.toList()
        return liste.filter { nutzbar(it) }
    }

    private fun rechteFuer(liste: List<String>): Set<String> {
        val rechte = liste.mapNotNull { HealthConnectLeser.leseRecht(it) }.toMutableSet()
        if (funktion(HealthConnectFeatures.FEATURE_HEALTH_DATA_HISTORIC_READ)) rechte.add(rechtVerlauf)
        return rechte
    }

    private fun erteilteArten(liste: List<String>, erteilt: Set<String>): JSObject {
        val r = JSObject()
        val ja = JSArray()
        liste.filter { a -> HealthConnectLeser.leseRecht(a)?.let { erteilt.contains(it) } == true }
            .forEach { ja.put(it) }
        r.put("erteilt", ja)
        r.put("verlauf", erteilt.contains(rechtVerlauf))
        return r
    }

    @PluginMethod
    fun berechtigungen(call: PluginCall) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect ist auf diesem Gerät nicht verfügbar.", "nicht_verfuegbar")
            return
        }
        val liste = gewuenschteArten(call)
        val rechte = rechteFuer(liste)
        // Nur die Datenrechte entscheiden, ob der Dialog nötig ist: Das Verlaufsrecht (ältere Daten) ist freiwillig. Fehlte es
        // und zählte mit, würde bei jedem Tippen auf „Verbinden“ wieder der Dialog starten (Health Connect blendet ihn nach
        // zwei Ablehnungen nicht mehr ein), und die Anfrage könnte ohne Antwort bleiben (Verdacht, am Handy zu prüfen).
        val datenRechte = liste.mapNotNull { arten[it] }.map { HealthPermission.getReadPermission(it) }.toSet()
        bereich.launch {
            try {
                val erteilt = client().permissionController.getGrantedPermissions()
                if (erteilt.containsAll(datenRechte)) {
                    call.resolve(erteilteArten(liste, erteilt))
                } else {
                    val intent = vertrag.createIntent(context, rechte)
                    startActivityForResult(call, intent, "berechtigungenErgebnis")
                }
            } catch (e: Exception) {
                call.reject(e.message ?: "Freigabe fehlgeschlagen", "fehler", e)
            }
        }
    }

    /** Schon erteilte Leserechte, ohne Dialog (die App gleicht beim Start damit nur freigegebene Arten ab). */
    @PluginMethod
    fun erteilt(call: PluginCall) {
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect ist auf diesem Gerät nicht verfügbar.", "nicht_verfuegbar")
            return
        }
        val liste = gewuenschteArten(call)
        bereich.launch {
            try {
                call.resolve(erteilteArten(liste, client().permissionController.getGrantedPermissions()))
            } catch (e: Exception) {
                call.reject(e.message ?: "Abfrage fehlgeschlagen", "fehler", e)
            }
        }
    }

    @ActivityCallback
    fun berechtigungenErgebnis(call: PluginCall?, ergebnis: ActivityResult) {
        if (call == null) return
        val liste = gewuenschteArten(call)
        bereich.launch {
            try {
                // Nach dem Dialog den tatsächlichen Stand abfragen (der Dialog meldet nur die neu erteilten).
                val erteilt = client().permissionController.getGrantedPermissions() +
                    vertrag.parseResult(ergebnis.resultCode, ergebnis.data)
                call.resolve(erteilteArten(liste, erteilt))
            } catch (e: Exception) {
                call.reject(e.message ?: "Freigabe fehlgeschlagen", "fehler", e)
            } finally {
                bridge.releaseCall(call)
            }
        }
    }

    // ------------------------------------------------------------------------------------------------

    @PluginMethod
    fun lesen(call: PluginCall) {
        val art = call.getString("art") ?: ""
        val bekannt = arten.containsKey(art)
        val vonMs = call.getLong("vonMs")
        val bisMs = call.getLong("bisMs")
        if (!bekannt || vonMs == null || bisMs == null || bisMs <= vonMs) {
            call.reject("Ungültige Anfrage: art, vonMs, bisMs angeben.", "ungueltig")
            return
        }
        if (sdkStatus() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("Health Connect ist auf diesem Gerät nicht verfügbar.", "nicht_verfuegbar")
            return
        }
        if (!nutzbar(art)) {
            call.reject("$art wird auf diesem Gerät nicht unterstützt.", "nicht_unterstuetzt")
            return
        }
        bereich.launch {
            try {
                val datensaetze = withContext(Dispatchers.IO) {
                    val aus = JSArray()
                    leser.lesen(art, vonMs, bisMs).forEach { aus.put(it) }
                    aus
                }
                val r = JSObject()
                r.put("datensaetze", datensaetze)
                call.resolve(r)
            } catch (e: SecurityException) {
                call.reject("Keine Leseberechtigung für $art.", "keine_berechtigung", e)
            } catch (e: Exception) {
                call.reject(e.message ?: "Lesen fehlgeschlagen", "fehler", e)
            }
        }
    }
}
