package de.maehrsteuern.fit.healthconnect

import android.content.Intent
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.feature.ExperimentalFeatureAvailabilityApi
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.RespiratoryRateRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SkinTemperatureRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.ZoneOffset
import kotlin.reflect.KClass
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
 */
@CapacitorPlugin(name = "HealthConnect")
@OptIn(ExperimentalFeatureAvailabilityApi::class)
class HealthConnectPlugin : Plugin() {

    private val bereich = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val anbieter = "com.google.android.apps.healthdata"
    private val vertrag = PermissionController.createRequestPermissionResultContract()

    /** Recht für Daten älter als 30 Tage vor der ersten Freigabe (nicht in connect-client 1.1.0-alpha08 als Konstante). */
    private val rechtVerlauf = "android.permission.health.READ_HEALTH_DATA_HISTORY"

    private val arten: Map<String, KClass<out Record>> = mapOf(
        "HeartRate" to HeartRateRecord::class,
        "HeartRateVariabilityRmssd" to HeartRateVariabilityRmssdRecord::class,
        "RestingHeartRate" to RestingHeartRateRecord::class,
        "RespiratoryRate" to RespiratoryRateRecord::class,
        "OxygenSaturation" to OxygenSaturationRecord::class,
        "SkinTemperature" to SkinTemperatureRecord::class,
        "SleepSession" to SleepSessionRecord::class,
        "ExerciseSession" to ExerciseSessionRecord::class,
    )

    override fun handleOnDestroy() {
        bereich.cancel()
        super.handleOnDestroy()
    }

    private fun sdkStatus(): Int = HealthConnectClient.getSdkStatus(context, anbieter)

    private fun client(): HealthConnectClient = HealthConnectClient.getOrCreate(context, anbieter)

    private fun funktion(merkmal: Int): Boolean =
        client().features.getFeatureStatus(merkmal) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE

    /** Lesbare Arten auf diesem Gerät (Hauttemperatur gibt es nicht überall). */
    private fun nutzbar(art: String): Boolean =
        arten.containsKey(art) && (art != "SkinTemperature" || funktion(HealthConnectFeatures.FEATURE_SKIN_TEMPERATURE))

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
        val rechte = liste.mapNotNull { arten[it] }.map { HealthPermission.getReadPermission(it) }.toMutableSet()
        if (funktion(HealthConnectFeatures.FEATURE_HEALTH_DATA_HISTORIC_READ)) rechte.add(rechtVerlauf)
        return rechte
    }

    private fun erteilteArten(liste: List<String>, erteilt: Set<String>): JSObject {
        val r = JSObject()
        val ja = JSArray()
        liste.filter { a -> arten[a]?.let { erteilt.contains(HealthPermission.getReadPermission(it)) } == true }
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
        val klasse = arten[art]
        val vonMs = call.getLong("vonMs")
        val bisMs = call.getLong("bisMs")
        if (klasse == null || vonMs == null || bisMs == null || bisMs <= vonMs) {
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
                    alleLesen(klasse, Instant.ofEpochMilli(vonMs), Instant.ofEpochMilli(bisMs)).forEach { aus.put(alsJson(it)) }
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

    /** Alle Seiten einer Abfrage lesen. */
    private suspend fun <T : Record> alleLesen(klasse: KClass<T>, von: Instant, bis: Instant): List<T> {
        val alle = mutableListOf<T>()
        var seite: String? = null
        do {
            val antwort = client().readRecords(
                ReadRecordsRequest(
                    recordType = klasse,
                    timeRangeFilter = TimeRangeFilter.between(von, bis),
                    ascendingOrder = true,
                    pageSize = 1000,
                    pageToken = seite,
                ),
            )
            alle.addAll(antwort.records)
            seite = antwort.pageToken
        } while (!seite.isNullOrEmpty())
        return alle
    }

    // ------------------------------------------------------------------------------------------------
    // Brückenformat: Feldnamen wie Health Connect, Zeiten als Unix-ms, Zeitzone als Sekunden-Versatz.

    private fun meta(m: Metadata): JSObject {
        val o = JSObject()
        o.put("id", m.id)
        o.put("dataOrigin", m.dataOrigin.packageName)
        o.put("lastModifiedTime", m.lastModifiedTime.toEpochMilli())
        return o
    }

    private fun basis(m: Metadata): JSObject {
        val o = JSObject()
        o.put("metadata", meta(m))
        return o
    }

    private fun zeitpunkt(o: JSObject, t: Instant, zone: ZoneOffset?) {
        o.put("time", t.toEpochMilli())
        zone?.let { o.put("zoneOffsetSek", it.totalSeconds) }
    }

    private fun zeitraum(o: JSObject, von: Instant, vonZone: ZoneOffset?, bis: Instant, bisZone: ZoneOffset?) {
        o.put("startTime", von.toEpochMilli())
        o.put("endTime", bis.toEpochMilli())
        vonZone?.let { o.put("startZoneOffsetSek", it.totalSeconds) }
        bisZone?.let { o.put("endZoneOffsetSek", it.totalSeconds) }
    }

    private fun alsJson(r: Record): JSObject {
        val o = basis(r.metadata)
        when (r) {
            is HeartRateRecord -> {
                zeitraum(o, r.startTime, r.startZoneOffset, r.endTime, r.endZoneOffset)
                val werte = JSArray()
                r.samples.forEach { s ->
                    val w = JSObject()
                    w.put("time", s.time.toEpochMilli())
                    w.put("beatsPerMinute", s.beatsPerMinute)
                    werte.put(w)
                }
                o.put("samples", werte)
            }
            is HeartRateVariabilityRmssdRecord -> {
                zeitpunkt(o, r.time, r.zoneOffset)
                o.put("heartRateVariabilityMillis", r.heartRateVariabilityMillis)
            }
            is RestingHeartRateRecord -> {
                zeitpunkt(o, r.time, r.zoneOffset)
                o.put("beatsPerMinute", r.beatsPerMinute)
            }
            is RespiratoryRateRecord -> {
                zeitpunkt(o, r.time, r.zoneOffset)
                o.put("rate", r.rate)
            }
            is OxygenSaturationRecord -> {
                zeitpunkt(o, r.time, r.zoneOffset)
                o.put("percentage", r.percentage.value)
            }
            is SkinTemperatureRecord -> {
                zeitraum(o, r.startTime, r.startZoneOffset, r.endTime, r.endZoneOffset)
                r.baseline?.let { o.put("baselineCelsius", it.inCelsius) }
                o.put("measurementLocation", r.measurementLocation)
                val deltas = JSArray()
                r.deltas.forEach { d ->
                    val w = JSObject()
                    w.put("time", d.time.toEpochMilli())
                    w.put("deltaCelsius", d.delta.inCelsius)
                    deltas.put(w)
                }
                o.put("deltas", deltas)
            }
            is SleepSessionRecord -> {
                zeitraum(o, r.startTime, r.startZoneOffset, r.endTime, r.endZoneOffset)
                r.title?.let { o.put("title", it) }
                val stufen = JSArray()
                r.stages.forEach { s ->
                    val w = JSObject()
                    w.put("startTime", s.startTime.toEpochMilli())
                    w.put("endTime", s.endTime.toEpochMilli())
                    w.put("stage", s.stage)
                    stufen.put(w)
                }
                o.put("stages", stufen)
            }
            is ExerciseSessionRecord -> {
                zeitraum(o, r.startTime, r.startZoneOffset, r.endTime, r.endZoneOffset)
                o.put("exerciseType", r.exerciseType)
                r.title?.let { o.put("title", it) }
            }
        }
        return o
    }
}
