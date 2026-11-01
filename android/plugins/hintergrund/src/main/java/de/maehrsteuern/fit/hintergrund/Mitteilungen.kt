package de.maehrsteuern.fit.hintergrund

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/** Sprungziele in die App (daten/hintergrund.js WEGE) – Tippen auf Mitteilung oder Widget öffnet MainActivity mit Extra "mf_weg". */
object Wege {
    const val EXTRA = "mf_weg"
    const val HEUTE = "#/heute"
    const val SCHLAF = "#/schlaf"
    const val ATEM = "#/atem"
    const val EINSTELLUNGEN = "#/mehr/mitteilungen"
    val ERLAUBT = setOf(HEUTE, SCHLAF, "#/belastung", ATEM, EINSTELLUNGEN)

    /** PendingIntent zum Öffnen der App an [weg]. Eigener requestCode je Weg, sonst teilen sich alle dasselbe Extra. */
    fun oeffnen(c: Context, weg: String): PendingIntent {
        val intent = (c.packageManager.getLaunchIntentForPackage(c.packageName) ?: Intent()).apply {
            putExtra(EXTRA, weg)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        return PendingIntent.getActivity(c, 7000 + weg.hashCode() % 1000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
}

/**
 * Mitteilungen von MAEHR FIT: Morgenbericht, Hinweis bei roter Erholung, Hinweis zur Schlafenszeit, stiller Abgleich-Hinweis.
 *
 * Kernaussage: Der Morgenbericht ist eine ruhige Mitteilung ohne Ton. Zugeklappt: Ring, Erholung und der Satz aus „Heute“.
 * Aufgeklappt: links der Ring, daneben drei Spalten Erholung · Belastung · Schlaf mit großen Zahlen, darunter der Satz.
 * Tippen öffnet „Heute“, der Knopf „Atemübung“ die Atemübung. Kleines Symbol: „MF“ einfarbig, Akzent MBS-Grün.
 * Gebaut mit Notification.Builder (Android 8+), ohne androidx.core und ohne @capacitor/local-notifications.
 */
object Mitteilungen {
    const val KANAL_MORGEN = "mf_morgenbericht"
    const val KANAL_HINWEIS = "mf_hinweise"
    const val KANAL_ABGLEICH = "mf_abgleich"
    const val ID_MORGEN = 1001
    const val ID_ERHOLUNG = 1002
    const val ID_SCHLAF = 1003
    const val ID_ABGLEICH = 1004
    /** Später als so viele Stunden nach der eingestellten Zeit (bzw. dem Aufwachen) kommt kein Morgenbericht mehr. */
    const val MORGEN_SPAETESTENS_H = 6L
    /** Hinweis zur Schlafenszeit so viele Minuten vorher. */
    const val SCHLAF_VORLAUF_MIN = 30L

    private fun nm(c: Context) = c.getSystemService(NotificationManager::class.java)

    /** Kanäle anlegen (Namen in der Sprache des Geräts; der Nutzer kann sie in den System-Einstellungen ändern). */
    fun kanaele(c: Context) {
        val m = nm(c) ?: return
        val morgen = NotificationChannel(KANAL_MORGEN, c.getString(R.string.mf_hg_kanal_morgen), NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = c.getString(R.string.mf_hg_kanal_morgen_text); setSound(null, null); enableVibration(false); setShowBadge(false)
        }
        val hinweis = NotificationChannel(KANAL_HINWEIS, c.getString(R.string.mf_hg_kanal_hinweis), NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = c.getString(R.string.mf_hg_kanal_hinweis_text); setSound(null, null); enableVibration(false); setShowBadge(false)
        }
        val abgleich = NotificationChannel(KANAL_ABGLEICH, c.getString(R.string.mf_hg_kanal_abgleich), NotificationManager.IMPORTANCE_MIN).apply {
            description = c.getString(R.string.mf_hg_kanal_abgleich_text); setSound(null, null); enableVibration(false); setShowBadge(false)
        }
        m.createNotificationChannels(listOf(morgen, hinweis, abgleich))
    }

    /** "granted" | "denied" | "prompt" (Android 13+: Laufzeitrecht; darunter zählt nur, ob Mitteilungen eingeschaltet sind). */
    fun recht(c: Context, gefragt: Boolean): String {
        val an = nm(c)?.areNotificationsEnabled() == true
        if (Build.VERSION.SDK_INT < 33) return if (an) "granted" else "denied"
        val erteilt = c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        return when {
            erteilt && an -> "granted"
            erteilt || gefragt -> "denied"
            else -> "prompt"
        }
    }

    private fun darf(c: Context) = recht(c, true) == "granted"

    private fun basis(c: Context, kanal: String, z: Zusammenfassung): Notification.Builder =
        Notification.Builder(c, kanal)
            .setSmallIcon(R.drawable.mf_glyph)
            .setColor(c.getColor(R.color.mf_hg_marke))
            .setContentIntent(Wege.oeffnen(c, Wege.HEUTE))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(true)
            .setWhen(if (z.erzeugt > 0) z.erzeugt else System.currentTimeMillis())
            .setCategory(Notification.CATEGORY_STATUS)
            .setVisibility(Notification.VISIBILITY_PRIVATE)

    private fun titel(c: Context, z: Zusammenfassung): String {
        val erholung = z.beschriftung(c, "erholung", R.string.mf_hg_erholung)
        return if (z.stufeText.isNotEmpty()) "$erholung ${z.erholungText} · ${z.stufeText}" else "$erholung ${z.erholungText}"
    }

    /** Zugeklappte und aufgeklappte Ansicht (DecoratedCustomViewStyle: Android setzt Kopfzeile, Symbol und Zeit selbst). */
    private fun ansichten(c: Context, z: Zusammenfassung): Pair<RemoteViews, RemoteViews> {
        val ringKlein = Bilder.ring(c, z.erholungWert, z.stufe, 40f, mitZahl = true, flaeche = true)
        val klein = RemoteViews(c.packageName, R.layout.mf_mitteilung_klein).apply {
            setImageViewBitmap(R.id.mf_mt_ring, ringKlein)
            setTextViewText(R.id.mf_mt_titel, titel(c, z))
            setTextViewText(R.id.mf_mt_text, z.kernaussage)
        }
        val ringGross = Bilder.ring(c, z.erholungWert, z.stufe, 88f, mitZahl = true, flaeche = true)
        val gross = RemoteViews(c.packageName, R.layout.mf_mitteilung_gross).apply {
            setImageViewBitmap(R.id.mf_mt_ring, ringGross)
            setContentDescription(R.id.mf_mt_ring, titel(c, z))
            setTextViewText(R.id.mf_mt_erholung_name, z.beschriftung(c, "erholung", R.string.mf_hg_erholung))
            setTextViewText(R.id.mf_mt_erholung_wert, z.erholungText)
            Farben.textFarbe(c, this, R.id.mf_mt_erholung_wert, Farben.stufeRes(z.stufe))
            setTextViewText(R.id.mf_mt_erholung_unter, z.stufeText)
            setTextViewText(R.id.mf_mt_belastung_name, z.beschriftung(c, "belastung", R.string.mf_hg_belastung))
            setTextViewText(R.id.mf_mt_belastung_wert, z.belastungText)
            setTextViewText(R.id.mf_mt_schlaf_name, z.beschriftung(c, "schlaf", R.string.mf_hg_schlaf))
            setTextViewText(R.id.mf_mt_schlaf_wert, z.schlafText)
            val bedarf = z.beschriftung(c, "bedarf", R.string.mf_hg_bedarf).replace("{wert}", z.schlafBedarfText)
            setTextViewText(R.id.mf_mt_schlaf_unter, if (z.schlafBedarfText == "–") "" else bedarf)
            setTextViewText(R.id.mf_mt_text, z.kernaussage)
            setViewVisibility(R.id.mf_mt_text, if (z.kernaussage.isEmpty()) View.GONE else View.VISIBLE)
        }
        return klein to gross
    }

    /** Morgenbericht (auch die Test-Mitteilung). Bei Fehlern im eigenen Aussehen: dieselbe Mitteilung als Textform (BigTextStyle). */
    fun morgenbericht(c: Context, z: Zusammenfassung): Boolean {
        if (!darf(c)) return false
        kanaele(c)
        val atem = Notification.Action.Builder(null, z.beschriftung(c, "atem", R.string.mf_hg_atem), Wege.oeffnen(c, Wege.ATEM)).build()
        // Sperrbildschirm: nur „MF Morgenbericht – Entsperren …“, keine Zahlen
        val oeffentlich = Notification.Builder(c, KANAL_MORGEN).setSmallIcon(R.drawable.mf_glyph).setColor(c.getColor(R.color.mf_hg_marke))
            .setContentTitle(c.getString(R.string.mf_hg_kanal_morgen)).setContentText(c.getString(R.string.mf_hg_oeffentlich)).build()
        val gemeinsam = { basis(c, KANAL_MORGEN, z).setContentTitle(titel(c, z)).setContentText(z.kernaussage).addAction(atem).setPublicVersion(oeffentlich) }
        val n = try {
            // Eigenes Aussehen: der Ring steckt schon in beiden Ansichten, darum kein großes Symbol daneben
            val (klein, gross) = ansichten(c, z)
            gemeinsam().setStyle(Notification.DecoratedCustomViewStyle()).setCustomContentView(klein).setCustomBigContentView(gross).build()
        } catch (e: RuntimeException) {
            gemeinsam().setLargeIcon(Bilder.ring(c, z.erholungWert, z.stufe, 64f, mitZahl = true, flaeche = true))
                .setStyle(Notification.BigTextStyle().bigText(z.kernaussage).setSummaryText(z.zeile)).build()
        }
        nm(c)?.notify(ID_MORGEN, n)
        return true
    }

    /** Textform (BigTextStyle) für die Hinweise: Satz als Text, Zahlenzeile als Zusammenfassung. */
    private fun hinweis(c: Context, id: Int, z: Zusammenfassung, titel: String, text: String, weg: String): Boolean {
        if (!darf(c)) return false
        kanaele(c)
        val n = basis(c, KANAL_HINWEIS, z)
            .setContentIntent(Wege.oeffnen(c, weg))
            .setLargeIcon(Bilder.ring(c, z.erholungWert, z.stufe, 64f, mitZahl = true, flaeche = true))
            .setContentTitle(titel)
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text).setSummaryText(z.zeile))
            .build()
        nm(c)?.notify(id, n)
        return true
    }

    fun hinweisErholung(c: Context, z: Zusammenfassung) = hinweis(c, ID_ERHOLUNG, z, titel(c, z), z.kernaussage, Wege.HEUTE)

    fun hinweisSchlaf(c: Context, z: Zusammenfassung): Boolean {
        val text = z.schlafenszeitText ?: return false
        return hinweis(c, ID_SCHLAF, z, c.getString(R.string.mf_hg_schlafenszeit_titel), text, Wege.SCHLAF)
    }

    /** Stille Mitteilung, falls Android den Lauf als Vordergrunddienst ausführt (nur Android 11 und älter bei „sofort“). */
    fun abgleichHinweis(c: Context): Notification {
        kanaele(c)
        return Notification.Builder(c, KANAL_ABGLEICH).setSmallIcon(R.drawable.mf_glyph).setColor(c.getColor(R.color.mf_hg_marke))
            .setContentTitle(c.getString(R.string.mf_hg_abgleich_laeuft)).setOngoing(true).setShowWhen(false).build()
    }

    // ------------------------------------------------------------------------------------------------
    // Regeln: wann was gemeldet wird (je Tag höchstens einmal)

    private fun heute(): String = LocalDate.now().toString()

    /** Zeitpunkt (ms) der Uhrzeit "HH:MM" heute in der Zeitzone des Geräts. */
    fun heuteUm(minuten: Int): Long = LocalDate.now().atStartOfDay().plusMinutes(minuten.toLong()).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

    /**
     * Nach jedem Lauf (und beim Wecker): Morgenbericht, sobald er fällig ist und die Erholung für heute feststeht;
     * Hinweis bei roter Erholung nur, wenn der Morgenbericht aus ist; Hinweis zur Schlafenszeit ab 30 Minuten vorher.
     * @return gesendete Arten
     */
    fun pruefen(c: Context, z: Zusammenfassung?, jetzt: Long = System.currentTimeMillis()): List<String> {
        if (z == null) return emptyList()
        val tag = heute()
        val gesendet = mutableListOf<String>()
        val heuteEcht = z.hatErholung && z.istHeute && z.tag == tag
        if (Einstellungen.morgenAktiv(c) && heuteEcht && !Einstellungen.gemeldet(c, "morgen", tag)) {
            val u = Einstellungen.morgenUhrzeit(c)
            val faellig = if (u == Einstellungen.AUFWACHEN) {
                z.schlafErkannt && (z.aufwachenMs ?: 0L) <= jetzt && jetzt - (z.aufwachenMs ?: 0L) < MORGEN_SPAETESTENS_H * 3_600_000L
            } else {
                val ab = heuteUm(Einstellungen.minutenAus(u) ?: 450)
                jetzt >= ab && jetzt - ab < MORGEN_SPAETESTENS_H * 3_600_000L
            }
            if (faellig && morgenbericht(c, z)) { Einstellungen.merkeGemeldet(c, "morgen", tag); gesendet.add("morgen") }
        }
        if (Einstellungen.erholungAktiv(c) && !Einstellungen.morgenAktiv(c) && heuteEcht && z.stufe == "rot" && !Einstellungen.gemeldet(c, "erholung", tag)) {
            if (hinweisErholung(c, z)) { Einstellungen.merkeGemeldet(c, "erholung", tag); gesendet.add("erholung") }
        }
        val bett = z.bettMs
        if (Einstellungen.schlafAktiv(c) && bett != null && !z.demo && !Einstellungen.gemeldet(c, "schlaf", tag)) {
            val ab = bett - SCHLAF_VORLAUF_MIN * 60_000L
            val bettTag = LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(bett), ZoneId.systemDefault()).toLocalDate().toString()
            if (jetzt in ab..bett && bettTag == tag && hinweisSchlaf(c, z)) { Einstellungen.merkeGemeldet(c, "schlaf", tag); gesendet.add("schlaf") }
        }
        return gesendet
    }
}

/** Farben für Text in Mitteilungen: System hell oder dunkel (values / values-night), Werte aus shell/design/marke.css. */
object Farben {
    fun stufeRes(stufe: String?): Int = when (stufe) {
        "gruen" -> R.color.mf_mt_erholung_gruen
        "gelb" -> R.color.mf_mt_erholung_gelb
        "rot" -> R.color.mf_mt_erholung_rot
        else -> R.color.mf_mt_text
    }

    /** Ab Android 12 löst die Mitteilungsleiste die Farbe selbst auf (folgt also hell/dunkel live), darunter fester Wert. */
    fun textFarbe(c: Context, ansicht: RemoteViews, id: Int, farbe: Int) {
        if (Build.VERSION.SDK_INT >= 31) ansicht.setColorStateList(id, "setTextColor", farbe) else ansicht.setTextColor(id, c.getColor(farbe))
    }
}
