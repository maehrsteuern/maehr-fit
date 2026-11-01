package de.maehrsteuern.fit.hintergrund

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import de.maehrsteuern.fit.healthconnect.HealthConnectLeser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** Ob die App gerade sichtbar ist (gesetzt vom Plugin in handleOnResume/handleOnPause). Dann liest Health Connect auch ohne Hintergrundrecht. */
object Vordergrund {
    @Volatile var sichtbar = false
}

/**
 * Ein Lauf des Hintergrund-Abgleichs (stündlich, beim Öffnen der App, zur Uhrzeit des Morgenberichts).
 *
 * Kernaussage: Der Lauf fragt Health Connect, was seit dem letzten Mal neu ist, legt es in den Eingangskorb, rechnet mit dem
 * Rechenkern der App die Zusammenfassung von heute, zeichnet die Widgets neu und schickt den Morgenbericht, wenn er fällig ist.
 * Fehlt das Recht „Im Hintergrund lesen“, liest er nichts, rechnet aber mit dem, was schon da ist – nichts stürzt ab.
 *
 * Schritte:
 *  1. Health Connect: je freigegebener Art die Änderungsliste seit dem gemerkten Token; ohne Token (erster Lauf, Token älter als
 *     30 Tage) die letzten [ERSTES_FENSTER_TAGE] Tage lesen und ein neues Token holen. Ergebnis → Eingang (files/eingang/<Typ>.jsonl).
 *  2. Rechnen: kern.bundle.js in einer unsichtbaren WebView mit Kontext der App + Eingang + Einstellungen (KernRechner).
 *  3. Zusammenfassung speichern, Widgets neu zeichnen, Mitteilungen prüfen, Wecker neu stellen, Lauf merken.
 */
class HintergrundAbgleichWorker(c: Context, p: WorkerParameters) : CoroutineWorker(c, p) {

    companion object {
        /** Erster Lauf ohne Token: so viele Tage zurück (den langen Rückblick macht die App selbst beim Öffnen). */
        const val ERSTES_FENSTER_TAGE = 2L
        private const val TAG_MS = 24L * 3_600_000L
    }

    /**
     * Nur für „sofort“-Läufe auf Android 11 und älter: Dort führt WorkManager beschleunigte Läufe als Vordergrunddienst aus und
     * braucht eine (stille) Mitteilung. Ab Android 12 nutzt WorkManager dafür JobScheduler, ohne Mitteilung und ohne Diensttyp.
     */
    override suspend fun getForegroundInfo(): ForegroundInfo = ForegroundInfo(Mitteilungen.ID_ABGLEICH, Mitteilungen.abgleichHinweis(applicationContext))

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val c = applicationContext
        val anlass = inputData.getString(Planer.ANLASS) ?: "stuendlich"
        val lauf = JSONObject().put("zeit", System.currentTimeMillis()).put("anlass", anlass)
        if (!Einstellungen.aktiv(c) && anlass == "stuendlich") {
            Einstellungen.merkeLauf(c, lauf.put("ergebnis", "aus"))
            return@withContext Result.success()
        }
        // 1. Health Connect
        val gelesen = lesen(c)
        lauf.put("ergebnis", gelesen.ergebnis).put("neu", gelesen.neu).put("arten", JSONObject(gelesen.arten as Map<*, *>))
        gelesen.fehler?.let { lauf.put("fehler", it) }
        // 2. Rechnen (auch ohne neue Werte: der Tag schreitet fort, z. B. für „gestern“ → „heute“)
        val r = KernRechner.rechnen(c, Eingang.kontext(c), Eingang.fuerRechnung(c), Einstellungen.kernEinstellungen(c))
        val z = r.json?.let { runCatching { Zusammenfassung.schreiben(c, it) }.getOrNull() }
        if (z == null) {
            lauf.put("rechnen", r.fehler ?: "ungültiges Ergebnis")
            if (gelesen.ergebnis == "ok") lauf.put("ergebnis", "fehler").put("fehler", "Rechnen: ${r.fehler ?: "ungültiges Ergebnis"}")
        }
        // 3. Widgets, Mitteilungen, Wecker
        runCatching { WidgetMaler.alle(c) }
        val gesendet = runCatching { Mitteilungen.pruefen(c, z ?: Zusammenfassung.lesen(c)) }.getOrDefault(emptyList())
        if (gesendet.isNotEmpty()) lauf.put("gemeldet", gesendet.joinToString(","))
        runCatching { Planer.weckerStellen(c) }
        Einstellungen.merkeLauf(c, lauf.put("dauerMs", System.currentTimeMillis() - lauf.getLong("zeit")))
        Result.success()
    }

    private class Gelesen(val ergebnis: String, val neu: Int, val arten: Map<String, Int>, val fehler: String?)

    private suspend fun lesen(c: Context): Gelesen {
        val leser = HealthConnectLeser(c)
        if (!leser.verfuegbar()) return Gelesen("kein_hc", 0, emptyMap(), null)
        val rechte = try { leser.erteilteRechte() } catch (e: Exception) { return Gelesen("fehler", 0, emptyMap(), e.message) }
        val hintergrund = rechte.contains(HealthConnectLeser.RECHT_HINTERGRUND) && leser.hintergrundMoeglich()
        if (!hintergrund && !Vordergrund.sichtbar) return Gelesen("ohne_recht", 0, emptyMap(), null)
        val arten = linkedMapOf<String, Int>()
        var neu = 0
        var fehler: String? = null
        var ohneRecht = false
        for (art in HealthConnectLeser.ARTEN.keys) {
            val recht = HealthConnectLeser.leseRecht(art) ?: continue
            if (!rechte.contains(recht) || !leser.nutzbar(art)) continue
            try {
                val datensaetze = mutableListOf<JSONObject>()
                val token = Einstellungen.token(c, art)
                var naechster: String? = null
                if (token != null) {
                    val a = leser.aenderungen(token)
                    if (!a.abgelaufen) { datensaetze.addAll(a.datensaetze); naechster = a.naechsterToken }
                }
                if (naechster == null) {
                    // Erster Lauf oder Token abgelaufen: erst Token holen (nichts geht verloren), dann das Fenster lesen
                    naechster = leser.aenderungsToken(art)
                    val jetzt = System.currentTimeMillis()
                    datensaetze.addAll(leser.lesen(art, jetzt - ERSTES_FENSTER_TAGE * TAG_MS, jetzt))
                }
                val n = Eingang.anhaengen(c, art, datensaetze)
                Einstellungen.setzeToken(c, art, naechster)
                if (n > 0) arten[art] = n
                neu += n
            } catch (e: SecurityException) {
                ohneRecht = true
            } catch (e: Exception) {
                fehler = "$art: ${e.message}"
            }
        }
        val ergebnis = when {
            fehler != null -> "fehler"
            ohneRecht && neu == 0 -> "ohne_recht"
            else -> "ok"
        }
        return Gelesen(ergebnis, neu, arten, fehler)
    }
}
