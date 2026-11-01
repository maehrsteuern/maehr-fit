package de.maehrsteuern.fit.hintergrund

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit

/**
 * Plant die Läufe: stündlich (WorkManager, Intervall 30/60/120 min, Spielraum 15 min, nur bei ausreichender Akkuladung),
 * sofort beim Öffnen der App (beschleunigter Einmal-Lauf) und zwei Wecker (AlarmManager, ohne Recht für exakte Wecker):
 * zur Uhrzeit des Morgenberichts und 30 Minuten vor der Schlafenszeit. Android kann Wecker im Ruhemodus um einige Minuten
 * verschieben; Xiaomi/MIUI stoppt ohne „Autostart“ alles (docs/technik/hintergrund.md).
 */
object Planer {
    const val NAME_STUENDLICH = "mf_abgleich"
    const val NAME_SOFORT = "mf_abgleich_sofort"
    const val SPIELRAUM_MIN = 15L
    const val ANLASS = "anlass"

    fun stuendlich(c: Context) {
        val wm = WorkManager.getInstance(c)
        if (!Einstellungen.aktiv(c)) { wm.cancelUniqueWork(NAME_STUENDLICH); return }
        val minuten = Einstellungen.intervallMin(c).toLong()
        val anfrage = PeriodicWorkRequestBuilder<HintergrundAbgleichWorker>(minuten, TimeUnit.MINUTES, SPIELRAUM_MIN, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiresBatteryNotLow(true).build())
            .setInputData(workDataOf(ANLASS to "stuendlich"))
            .addTag(NAME_STUENDLICH)
            .build()
        wm.enqueueUniquePeriodicWork(NAME_STUENDLICH, ExistingPeriodicWorkPolicy.UPDATE, anfrage)
    }

    /** Einmal-Lauf so bald wie möglich (beschleunigt, sonst normal, wenn das Kontingent aufgebraucht ist). */
    fun jetzt(c: Context, anlass: String = "jetzt") {
        val anfrage = OneTimeWorkRequestBuilder<HintergrundAbgleichWorker>()
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .setInputData(workDataOf(ANLASS to anlass))
            .build()
        WorkManager.getInstance(c).enqueueUniqueWork(NAME_SOFORT, ExistingWorkPolicy.REPLACE, anfrage)
    }

    /** Geplanter Zeitpunkt des nächsten stündlichen Laufs, oder null (nicht aus dem Hauptfaden aufrufen). */
    fun naechsterLauf(c: Context): Long? = runCatching {
        WorkManager.getInstance(c).getWorkInfosForUniqueWork(NAME_STUENDLICH).get(2, TimeUnit.SECONDS)
            .firstOrNull { it.state == WorkInfo.State.ENQUEUED }?.nextScheduleTimeMillis?.takeIf { it in 1 until Long.MAX_VALUE }
    }.getOrNull()

    // ------------------------------------------------------------------------------------------------
    // Wecker

    private fun wecker(c: Context, art: String): PendingIntent {
        val i = Intent(c, WeckerEmpfaenger::class.java).setAction("de.maehrsteuern.fit.WECKER_$art").putExtra("art", art)
        return PendingIntent.getBroadcast(c, if (art == "morgen") 8101 else 8102, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun stellen(c: Context, art: String, um: Long?) {
        val am = c.getSystemService(AlarmManager::class.java) ?: return
        val pi = wecker(c, art)
        am.cancel(pi)
        if (um != null && um > System.currentTimeMillis()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, um, pi)
    }

    /** Beide Wecker neu stellen (nach jedem Lauf, nach Änderungen, nach dem Neustart). */
    fun weckerStellen(c: Context) {
        val jetzt = System.currentTimeMillis()
        val u = Einstellungen.morgenUhrzeit(c)
        val morgen = if (Einstellungen.morgenAktiv(c) && u != Einstellungen.AUFWACHEN) {
            val min = Einstellungen.minutenAus(u) ?: 450
            val heute = Mitteilungen.heuteUm(min)
            if (heute > jetzt) heute else heute + 24 * 3_600_000L // Zeitumstellung: Abweichung von 1 h am Umstellungstag hingenommen
        } else null
        stellen(c, "morgen", morgen)
        val bett = Zusammenfassung.lesen(c)?.bettMs
        stellen(c, "schlaf", if (Einstellungen.schlafAktiv(c) && bett != null) bett - Mitteilungen.SCHLAF_VORLAUF_MIN * 60_000L else null)
    }

    /** Alles einplanen (App-Start, Neustart des Handys, Änderung der Einstellungen). */
    fun allesEinplanen(c: Context) {
        stuendlich(c)
        weckerStellen(c)
    }
}

/** Wecker: Morgenbericht → sofort einen Lauf (holt die Nacht und meldet); Schlafenszeit → Hinweis aus der letzten Zusammenfassung. */
class WeckerEmpfaenger : BroadcastReceiver() {
    override fun onReceive(c: Context, intent: Intent) {
        when (intent.getStringExtra("art")) {
            "morgen" -> Planer.jetzt(c, "morgen")
            "schlaf" -> Mitteilungen.pruefen(c, Zusammenfassung.lesen(c))
        }
        Planer.weckerStellen(c)
    }
}

/** Nach dem Neustart des Handys und nach einem App-Update: Läufe und Wecker wieder einplanen. */
class StartEmpfaenger : BroadcastReceiver() {
    override fun onReceive(c: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED -> Planer.allesEinplanen(c)
        }
    }
}
