package de.maehrsteuern.fit.healthconnect

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.changes.UpsertionChange
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
import androidx.health.connect.client.request.ChangesTokenRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.ZoneOffset
import kotlin.reflect.KClass
import org.json.JSONArray
import org.json.JSONObject

/**
 * Liest Health Connect (nur Lesen, kein Netz) und gibt Datensätze im Brückenformat zurück (docs/technik/healthconnect.md):
 * Feldnamen wie Health Connect, Zeiten als Unix-ms, Zeitzone als Sekunden-Versatz.
 *
 * Gemeinsam genutzt vom Capacitor-Plugin (HealthConnectPlugin, App offen) und vom Hintergrund-Abgleich
 * (android/plugins/hintergrund, HintergrundAbgleichWorker, App zu). Darum ohne Capacitor-Klassen: nur org.json.
 *
 * Neu für den Hintergrund: [aenderungsToken] und [aenderungen] lesen nur, was sich seit dem letzten Lauf geändert hat
 * (Health-Connect-Änderungsliste). Ein Token gilt laut Health Connect 30 Tage; danach meldet [Aenderungen.abgelaufen] true.
 */
@OptIn(ExperimentalFeatureAvailabilityApi::class)
class HealthConnectLeser(private val context: Context) {

    companion object {
        const val ANBIETER = "com.google.android.apps.healthdata"

        /** Recht für Daten älter als 30 Tage vor der ersten Freigabe (nicht in connect-client 1.1.0-alpha08 als Konstante). */
        const val RECHT_VERLAUF = "android.permission.health.READ_HEALTH_DATA_HISTORY"

        /** Recht zum Lesen, während die App nicht im Vordergrund ist (Android 14+ bzw. neues Health Connect). */
        const val RECHT_HINTERGRUND = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

        /** Art = Health-Connect-Datenart ohne "Record". Reihenfolge wie daten/healthconnect.js RECORD_TYPEN. */
        val ARTEN: Map<String, KClass<out Record>> = linkedMapOf(
            "HeartRate" to HeartRateRecord::class,
            "HeartRateVariabilityRmssd" to HeartRateVariabilityRmssdRecord::class,
            "RestingHeartRate" to RestingHeartRateRecord::class,
            "RespiratoryRate" to RespiratoryRateRecord::class,
            "OxygenSaturation" to OxygenSaturationRecord::class,
            "SkinTemperature" to SkinTemperatureRecord::class,
            "SleepSession" to SleepSessionRecord::class,
            "ExerciseSession" to ExerciseSessionRecord::class,
        )

        /** Leserecht einer Art, oder null für unbekannte Arten. */
        fun leseRecht(art: String): String? = ARTEN[art]?.let { HealthPermission.getReadPermission(it) }
    }

    /** Ergebnis einer Änderungsabfrage. */
    class Aenderungen(val datensaetze: List<JSONObject>, val naechsterToken: String?, val abgelaufen: Boolean)

    fun sdkStatus(): Int = HealthConnectClient.getSdkStatus(context, ANBIETER)

    fun verfuegbar(): Boolean = sdkStatus() == HealthConnectClient.SDK_AVAILABLE

    fun client(): HealthConnectClient = HealthConnectClient.getOrCreate(context, ANBIETER)

    fun funktion(merkmal: Int): Boolean =
        client().features.getFeatureStatus(merkmal) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE

    /** Kann dieses Gerät überhaupt im Hintergrund lesen? (Recht kann trotzdem fehlen.) */
    fun hintergrundMoeglich(): Boolean = verfuegbar() && funktion(HealthConnectFeatures.FEATURE_HEALTH_DATA_BACKGROUND_READ)

    /** Lesbare Arten auf diesem Gerät (Hauttemperatur gibt es nicht überall). */
    fun nutzbar(art: String): Boolean =
        ARTEN.containsKey(art) && (art != "SkinTemperature" || funktion(HealthConnectFeatures.FEATURE_SKIN_TEMPERATURE))

    suspend fun erteilteRechte(): Set<String> = client().permissionController.getGrantedPermissions()

    /** Alle Seiten einer Abfrage lesen. */
    suspend fun <T : Record> alleLesen(klasse: KClass<T>, von: Instant, bis: Instant): List<T> {
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

    /** Eine Art in einem Zeitraum lesen → Brückenformat. Wirft SecurityException ohne Leserecht. */
    suspend fun lesen(art: String, vonMs: Long, bisMs: Long): List<JSONObject> {
        val klasse = ARTEN[art] ?: throw IllegalArgumentException("Unbekannte Art $art")
        return alleLesen(klasse, Instant.ofEpochMilli(vonMs), Instant.ofEpochMilli(bisMs)).map { alsJson(it) }
    }

    /** Token für die Änderungsliste einer Art (ab jetzt). */
    suspend fun aenderungsToken(art: String): String {
        val klasse = ARTEN[art] ?: throw IllegalArgumentException("Unbekannte Art $art")
        return client().getChangesToken(ChangesTokenRequest(recordTypes = setOf(klasse)))
    }

    /** Alle Änderungen seit [token] (neue und geänderte Datensätze; Löschungen werden nicht übernommen). */
    suspend fun aenderungen(token: String): Aenderungen {
        val aus = mutableListOf<JSONObject>()
        var t = token
        while (true) {
            val antwort = client().getChanges(t)
            if (antwort.changesTokenExpired) return Aenderungen(aus, null, true)
            antwort.changes.forEach { c -> if (c is UpsertionChange) aus.add(alsJson(c.record)) }
            t = antwort.nextChangesToken
            if (!antwort.hasMore) break
        }
        return Aenderungen(aus, t, false)
    }

    // ------------------------------------------------------------------------------------------------
    // Brückenformat

    private fun meta(m: Metadata): JSONObject {
        val o = JSONObject()
        o.put("id", m.id)
        o.put("dataOrigin", m.dataOrigin.packageName)
        o.put("lastModifiedTime", m.lastModifiedTime.toEpochMilli())
        return o
    }

    private fun zeitpunkt(o: JSONObject, t: Instant, zone: ZoneOffset?) {
        o.put("time", t.toEpochMilli())
        zone?.let { o.put("zoneOffsetSek", it.totalSeconds) }
    }

    private fun zeitraum(o: JSONObject, von: Instant, vonZone: ZoneOffset?, bis: Instant, bisZone: ZoneOffset?) {
        o.put("startTime", von.toEpochMilli())
        o.put("endTime", bis.toEpochMilli())
        vonZone?.let { o.put("startZoneOffsetSek", it.totalSeconds) }
        bisZone?.let { o.put("endZoneOffsetSek", it.totalSeconds) }
    }

    /** Ein Datensatz im Brückenformat (dieselben Felder wie vor der Aufteilung im Plugin). */
    fun alsJson(r: Record): JSONObject {
        val o = JSONObject()
        o.put("metadata", meta(r.metadata))
        when (r) {
            is HeartRateRecord -> {
                zeitraum(o, r.startTime, r.startZoneOffset, r.endTime, r.endZoneOffset)
                val werte = JSONArray()
                r.samples.forEach { s ->
                    val w = JSONObject()
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
                val deltas = JSONArray()
                r.deltas.forEach { d ->
                    val w = JSONObject()
                    w.put("time", d.time.toEpochMilli())
                    w.put("deltaCelsius", d.delta.inCelsius)
                    deltas.put(w)
                }
                o.put("deltas", deltas)
            }
            is SleepSessionRecord -> {
                zeitraum(o, r.startTime, r.startZoneOffset, r.endTime, r.endZoneOffset)
                r.title?.let { o.put("title", it) }
                val stufen = JSONArray()
                r.stages.forEach { s ->
                    val w = JSONObject()
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
