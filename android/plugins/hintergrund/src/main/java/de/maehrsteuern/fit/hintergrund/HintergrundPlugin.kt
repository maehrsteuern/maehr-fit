package de.maehrsteuern.fit.hintergrund

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import de.maehrsteuern.fit.healthconnect.HealthConnectLeser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * Capacitor-Plugin "Hintergrund": Abgleich bei geschlossener App, Mitteilungen, Widgets.
 *
 * JavaScript-Seite: daten/bruecke_capacitor.js installiereHintergrundBruecke → MF.native.hintergrund / mitteilungen / widgets / geraet,
 * daten/hintergrund.js (Eingang übernehmen, Zusammenfassung spiegeln), shell/apps/mitteilungen.js (Einstellungen).
 * Methoden: status, jetzt, einstellen, eingangUebernehmen, eingangBestaetigen, kontextSchreiben, zusammenfassungSchreiben,
 *   widgetsAktualisieren, hcHintergrundAnfragen, mitteilungenEinstellen, mitteilungTest, mitteilungenRecht,
 *   mitteilungenRechtAnfragen, oeffnen({ ziel: akku|autostart|mitteilungen|healthconnect }).
 * Ereignis "weg" ({ weg: "#/heute" }): nach Tippen auf Mitteilung oder Widget (bleibt liegen, bis die App zuhört).
 */
@CapacitorPlugin(
    name = "Hintergrund",
    permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "mitteilungen")],
)
class HintergrundPlugin : Plugin() {

    private val bereich = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val vertrag = PermissionController.createRequestPermissionResultContract()

    override fun load() {
        val c = context
        Mitteilungen.kanaele(c)
        Planer.allesEinplanen(c)
        Planer.jetzt(c, "start")
        Vordergrund.sichtbar = true
        activity?.intent?.let { wegAus(it) }
    }

    override fun handleOnResume() { Vordergrund.sichtbar = true }

    override fun handleOnPause() { Vordergrund.sichtbar = false }

    override fun handleOnNewIntent(intent: Intent) { wegAus(intent) }

    override fun handleOnDestroy() {
        Vordergrund.sichtbar = false
        bereich.cancel()
    }

    /** Sprungziel aus Mitteilung/Widget an die App melden (nur erlaubte Wege), dann aus dem Intent entfernen. */
    private fun wegAus(intent: Intent) {
        val weg = intent.getStringExtra(Wege.EXTRA) ?: return
        intent.removeExtra(Wege.EXTRA)
        if (weg in Wege.ERLAUBT) notifyListeners("weg", JSObject().put("weg", weg), true)
    }

    private fun js(o: JSONObject): JSObject = JSObject(o.toString())

    // ------------------------------------------------------------------------------------------------
    // Abgleich

    @PluginMethod
    fun status(call: PluginCall) {
        val c = context
        bereich.launch {
            try {
                val r = withContext(Dispatchers.IO) { statusJson(c) }
                call.resolve(js(r))
            } catch (e: Exception) {
                call.reject(e.message ?: "Status nicht lesbar", "fehler", e)
            }
        }
    }

    private suspend fun statusJson(c: Context): JSONObject {
        val leser = HealthConnectLeser(c)
        val hcDa = leser.verfuegbar()
        val rechte = if (hcDa) runCatching { leser.erteilteRechte() }.getOrDefault(emptySet()) else emptySet()
        val hc = JSONObject().put("verfuegbar", hcDa).put("hintergrundMoeglich", hcDa && leser.hintergrundMoeglich())
            .put("hintergrundErteilt", rechte.contains(HealthConnectLeser.RECHT_HINTERGRUND))
            .put("lesenErteilt", HealthConnectLeser.ARTEN.keys.count { a -> HealthConnectLeser.leseRecht(a)?.let { rechte.contains(it) } == true })
        val mt = JSONObject().put("recht", Mitteilungen.recht(c, gefragt(c)))
            .put("morgen", JSONObject().put("aktiv", Einstellungen.morgenAktiv(c)).put("uhrzeit", Einstellungen.morgenUhrzeit(c)))
            .put("erholung", JSONObject().put("aktiv", Einstellungen.erholungAktiv(c)))
            .put("schlaf", JSONObject().put("aktiv", Einstellungen.schlafAktiv(c)))
        val w = JSONObject()
        WidgetMaler.anzahl(c).forEach { (k, n) -> w.put(k, n) }
        val eingang = JSONObject()
        Eingang.anzahl(c).forEach { (k, n) -> eingang.put(k, n) }
        val z = Zusammenfassung.lesen(c)
        return JSONObject()
            .put("aktiv", Einstellungen.aktiv(c))
            .put("intervallMin", Einstellungen.intervallMin(c))
            .put("letzterLauf", Einstellungen.letzterLauf(c) ?: JSONObject.NULL)
            .put("naechsterLauf", Planer.naechsterLauf(c) ?: JSONObject.NULL)
            .put("hc", hc)
            .put("mitteilungen", mt)
            .put("widgets", w)
            .put("eingang", eingang)
            .put("zusammenfassung", if (z == null) JSONObject.NULL else JSONObject().put("zeitpunkt", Zusammenfassung.zeitpunkt(c)).put("quelle", z.quelle).put("tag", z.tag))
            .put("geraet", JSONObject().put("hersteller", Build.MANUFACTURER ?: "").put("modell", Build.MODEL ?: "").put("android", Build.VERSION.SDK_INT))
    }

    @PluginMethod
    fun jetzt(call: PluginCall) {
        Planer.jetzt(context, "jetzt")
        call.resolve(JSObject().put("gestartet", true))
    }

    @PluginMethod
    fun einstellen(call: PluginCall) {
        val c = context
        Einstellungen.setzeHintergrund(c, call.getBoolean("aktiv", Einstellungen.aktiv(c)) ?: true, call.getInt("intervallMin", Einstellungen.intervallMin(c)) ?: Einstellungen.STANDARD_INTERVALL)
        Planer.stuendlich(c)
        call.resolve(JSObject().put("aktiv", Einstellungen.aktiv(c)).put("intervallMin", Einstellungen.intervallMin(c)))
    }

    @PluginMethod
    fun eingangUebernehmen(call: PluginCall) {
        val c = context
        bereich.launch {
            try { call.resolve(js(withContext(Dispatchers.IO) { Eingang.uebernehmen(c) })) } catch (e: Exception) { call.reject(e.message ?: "Eingang nicht lesbar", "fehler", e) }
        }
    }

    @PluginMethod
    fun eingangBestaetigen(call: PluginCall) {
        val marke = call.getString("marke")
        if (marke.isNullOrEmpty()) { call.reject("marke fehlt", "ungueltig"); return }
        val c = context
        bereich.launch {
            withContext(Dispatchers.IO) { Eingang.bestaetigen(c, marke) }
            call.resolve()
        }
    }

    @PluginMethod
    fun kontextSchreiben(call: PluginCall) {
        val json = call.getString("json")
        if (json.isNullOrEmpty()) { call.reject("json fehlt", "ungueltig"); return }
        val einst = call.getString("einstellungen")
        val c = context
        bereich.launch {
            try {
                withContext(Dispatchers.IO) {
                    JSONObject(json) // nur gültiges JSON ablegen
                    Eingang.kontextSchreiben(c, json)
                    if (!einst.isNullOrEmpty()) Einstellungen.setzeKernEinstellungen(c, JSONObject(einst).toString())
                }
                call.resolve()
            } catch (e: Exception) {
                call.reject(e.message ?: "Kontext nicht gespeichert", "fehler", e)
            }
        }
    }

    @PluginMethod
    fun zusammenfassungSchreiben(call: PluginCall) {
        val json = call.getString("json")
        if (json.isNullOrEmpty()) { call.reject("json fehlt", "ungueltig"); return }
        val c = context
        bereich.launch {
            try {
                withContext(Dispatchers.IO) {
                    Zusammenfassung.schreiben(c, json)
                    WidgetMaler.alle(c)
                    Planer.weckerStellen(c)
                }
                call.resolve()
            } catch (e: Exception) {
                call.reject(e.message ?: "Zusammenfassung ungültig", "ungueltig", e)
            }
        }
    }

    @PluginMethod
    fun widgetsAktualisieren(call: PluginCall) {
        val c = context
        bereich.launch {
            withContext(Dispatchers.IO) { WidgetMaler.alle(c) }
            val r = JSObject()
            WidgetMaler.anzahl(c).forEach { (k, n) -> r.put(k, n) }
            call.resolve(r)
        }
    }

    // ------------------------------------------------------------------------------------------------
    // Health Connect: Recht „Im Hintergrund lesen“

    @PluginMethod
    fun hcHintergrundAnfragen(call: PluginCall) {
        val leser = HealthConnectLeser(context)
        if (!leser.hintergrundMoeglich()) { call.resolve(JSObject().put("erteilt", false).put("moeglich", false)); return }
        bereich.launch {
            try {
                if (leser.erteilteRechte().contains(HealthConnectLeser.RECHT_HINTERGRUND)) {
                    call.resolve(JSObject().put("erteilt", true).put("moeglich", true))
                } else {
                    startActivityForResult(call, vertrag.createIntent(context, setOf(HealthConnectLeser.RECHT_HINTERGRUND)), "hcHintergrundErgebnis")
                }
            } catch (e: Exception) {
                call.reject(e.message ?: "Freigabe fehlgeschlagen", "fehler", e)
            }
        }
    }

    @ActivityCallback
    @Suppress("UNUSED_PARAMETER") // Capacitor verlangt die Signatur; der Stand wird danach frisch abgefragt
    fun hcHintergrundErgebnis(call: PluginCall?, ergebnis: ActivityResult) {
        if (call == null) return
        bereich.launch {
            try {
                val erteilt = HealthConnectLeser(context).erteilteRechte().contains(HealthConnectLeser.RECHT_HINTERGRUND)
                call.resolve(JSObject().put("erteilt", erteilt).put("moeglich", true))
                if (erteilt) Planer.jetzt(context, "recht")
            } catch (e: Exception) {
                call.reject(e.message ?: "Freigabe fehlgeschlagen", "fehler", e)
            } finally {
                bridge.releaseCall(call)
            }
        }
    }

    // ------------------------------------------------------------------------------------------------
    // Mitteilungen

    @PluginMethod
    fun mitteilungenEinstellen(call: PluginCall) {
        val c = context
        val morgen = call.getObject("morgen")
        Einstellungen.setzeMitteilungen(
            c,
            morgen?.getBoolean("aktiv", Einstellungen.morgenAktiv(c)) ?: Einstellungen.morgenAktiv(c),
            morgen?.getString("uhrzeit", Einstellungen.morgenUhrzeit(c)) ?: Einstellungen.morgenUhrzeit(c),
            call.getObject("erholung")?.getBoolean("aktiv", Einstellungen.erholungAktiv(c)) ?: Einstellungen.erholungAktiv(c),
            call.getObject("schlaf")?.getBoolean("aktiv", Einstellungen.schlafAktiv(c)) ?: Einstellungen.schlafAktiv(c),
        )
        Planer.weckerStellen(c)
        call.resolve()
    }

    @PluginMethod
    fun mitteilungTest(call: PluginCall) {
        val c = context
        if (Mitteilungen.recht(c, true) != "granted") { call.reject("Mitteilungen sind nicht erlaubt.", "kein_recht"); return }
        val z = Zusammenfassung.lesen(c)?.takeIf { it.hatErholung } ?: Zusammenfassung.beispiel(c)
        call.resolve(JSObject().put("gesendet", Mitteilungen.morgenbericht(c, z)).put("beispiel", z.quelle == "beispiel"))
    }

    private fun gefragt(c: Context) = c.getSharedPreferences("mf_hintergrund", Context.MODE_PRIVATE).getBoolean("mitteilungenGefragt", false)

    @PluginMethod
    fun mitteilungenRecht(call: PluginCall) {
        call.resolve(JSObject().put("recht", Mitteilungen.recht(context, gefragt(context))))
    }

    @PluginMethod
    fun mitteilungenRechtAnfragen(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("mitteilungen") != PermissionState.GRANTED) {
            context.getSharedPreferences("mf_hintergrund", Context.MODE_PRIVATE).edit().putBoolean("mitteilungenGefragt", true).apply()
            requestPermissionForAlias("mitteilungen", call, "mitteilungenRechtErgebnis")
        } else {
            call.resolve(JSObject().put("recht", Mitteilungen.recht(context, true)))
        }
    }

    @PermissionCallback
    fun mitteilungenRechtErgebnis(call: PluginCall) {
        call.resolve(JSObject().put("recht", Mitteilungen.recht(context, true)))
    }

    // ------------------------------------------------------------------------------------------------
    // System-Einstellungen öffnen (Akku, Xiaomi-Autostart, Mitteilungen, Health Connect)

    private fun versuche(vararg intents: Intent): Boolean {
        for (i in intents) {
            try {
                context.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                return true
            } catch (e: ActivityNotFoundException) {
                continue
            } catch (e: SecurityException) {
                continue
            }
        }
        return false
    }

    @PluginMethod
    fun oeffnen(call: PluginCall) {
        val p = context.packageName
        val details = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$p"))
        val ok = when (call.getString("ziel")) {
            "akku" -> versuche(
                Intent().setComponent(ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"))
                    .putExtra("package_name", p).putExtra("package_label", context.applicationInfo.loadLabel(context.packageManager).toString()),
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                details,
            )
            "autostart" -> versuche(
                Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
                details,
            )
            "mitteilungen" -> versuche(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, p), details)
            "healthconnect" -> versuche(
                Intent("android.health.connect.action.MANAGE_HEALTH_PERMISSIONS").putExtra(Intent.EXTRA_PACKAGE_NAME, p),
                Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS),
            )
            else -> { call.reject("Unbekanntes Ziel", "ungueltig"); return }
        }
        call.resolve(JSObject().put("geoeffnet", ok))
    }
}
