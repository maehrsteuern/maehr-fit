package de.maehrsteuern.fit.hintergrund

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import java.text.DateFormat
import java.util.Date

/**
 * Drei Widgets für den Startbildschirm (AppWidgetProvider + RemoteViews, ohne Compose/Glance):
 *   Erholung (2 × 2): Ring mit Zahl und Stufe · Heute (4 × 2): Erholung · Belastung · Schlaf und der Satz ·
 *   Schlaf (2 × 1): letzte Nacht gegen den Bedarf als Balken.
 *
 * Kernaussage: Die Widgets zeigen genau die Zahlen der letzten Zusammenfassung (aus der App oder aus dem Lauf im Hintergrund),
 * unten klein „zuletzt HH:MM“. Tippen öffnet die App an der passenden Stelle. Ohne eigene Werte steht dort ein ruhiger Satz statt
 * erfundener Zahlen. Neu gezeichnet wird nach jedem Lauf, beim Verlassen der App und auf Knopfdruck („Widgets jetzt aktualisieren“).
 */
abstract class MfWidget : AppWidgetProvider() {
    abstract fun zeichnen(c: Context, z: Zusammenfassung?, groesse: Bundle?): RemoteViews

    override fun onUpdate(c: Context, m: AppWidgetManager, ids: IntArray) {
        val z = Zusammenfassung.lesen(c)
        ids.forEach { id -> m.updateAppWidget(id, zeichnen(c, z, m.getAppWidgetOptions(id))) }
    }

    override fun onAppWidgetOptionsChanged(c: Context, m: AppWidgetManager, id: Int, neu: Bundle) {
        m.updateAppWidget(id, zeichnen(c, Zusammenfassung.lesen(c), neu))
    }

    override fun onEnabled(c: Context) {
        // Erstes Widget: gleich einen Lauf anstoßen, damit es nicht leer bleibt
        Planer.jetzt(c, "widget")
    }
}

/** Gemeinsame Bausteine der drei Widgets. */
object WidgetMaler {
    val ARTEN = mapOf(
        "erholung" to ErholungWidget::class.java,
        "heute" to HeuteWidget::class.java,
        "schlaf" to SchlafWidget::class.java,
    )

    /** Alle platzierten Widgets neu zeichnen. */
    fun alle(c: Context) {
        val m = AppWidgetManager.getInstance(c) ?: return
        val z = Zusammenfassung.lesen(c)
        ARTEN.values.forEach { k ->
            val ids = m.getAppWidgetIds(ComponentName(c, k))
            if (ids.isEmpty()) return@forEach
            val maler = k.getDeclaredConstructor().newInstance()
            ids.forEach { id -> m.updateAppWidget(id, maler.zeichnen(c, z, m.getAppWidgetOptions(id))) }
        }
    }

    /** Anzahl platzierter Widgets je Art (für die Einstellungen in der App). */
    fun anzahl(c: Context): Map<String, Int> {
        val m = AppWidgetManager.getInstance(c) ?: return ARTEN.mapValues { 0 }
        return ARTEN.mapValues { (_, k) -> m.getAppWidgetIds(ComponentName(c, k)).size }
    }

    fun uhrzeit(ms: Long): String = DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(ms))

    /** „zuletzt 07:42“ – Zeitpunkt der Zusammenfassung; zeigt sie nicht heute, sondern einen älteren Tag: dessen Name („Fr., 30. Okt.“). */
    fun zuletzt(c: Context, z: Zusammenfassung?): String {
        if (z != null && !z.istHeute && !z.leer && z.tagText.isNotEmpty()) return z.tagText
        val ms = z?.erzeugt?.takeIf { it > 0 } ?: Zusammenfassung.zeitpunkt(c).takeIf { it > 0 } ?: return ""
        return z?.zuletzt(c, uhrzeit(ms)) ?: c.getString(R.string.mf_hg_zuletzt).replace("{zeit}", uhrzeit(ms))
    }

    /** Ohne eigene Werte: Satz statt Zahlen. */
    fun leerText(c: Context, z: Zusammenfassung?): String? = when {
        z == null -> c.getString(R.string.mf_hg_widget_leer)
        z.demo || z.leer -> z.beschriftung(c, "demo", R.string.mf_hg_widget_demo)
        else -> null
    }

    /** Breite in dp aus den Widget-Optionen (für größere Ringe bei größeren Widgets). */
    fun breiteDp(groesse: Bundle?, ersatz: Int): Int = groesse?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, ersatz)?.takeIf { it > 0 } ?: ersatz
    fun hoeheDp(groesse: Bundle?, ersatz: Int): Int = groesse?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, ersatz)?.takeIf { it > 0 } ?: ersatz
}

/** Erholung 2 × 2: Ring, Zahl in der Mitte, darunter Stufe und „zuletzt“. */
class ErholungWidget : MfWidget() {
    override fun zeichnen(c: Context, z: Zusammenfassung?, groesse: Bundle?): RemoteViews {
        val v = RemoteViews(c.packageName, R.layout.mf_widget_erholung)
        val seite = minOf(WidgetMaler.breiteDp(groesse, 110), WidgetMaler.hoeheDp(groesse, 110))
        val ring = (seite - 44).coerceIn(64, 160).toFloat()
        val leer = WidgetMaler.leerText(c, z)
        v.setImageViewBitmap(R.id.mf_w_ring, Bilder.ring(c, if (leer == null) z?.erholungWert else null, z?.stufe, ring, mitZahl = false, flaeche = false))
        v.setTextViewText(R.id.mf_w_zahl, if (leer == null) z?.erholungWert?.toString() ?: "–" else "–")
        v.setViewVisibility(R.id.mf_w_prozent, if (leer == null && z?.erholungWert != null) View.VISIBLE else View.GONE)
        v.setTextViewText(R.id.mf_w_name, z?.beschriftung(c, "erholung", R.string.mf_hg_erholung) ?: c.getString(R.string.mf_hg_erholung))
        v.setTextViewText(R.id.mf_w_stufe, if (leer == null) z?.stufeText ?: "" else "")
        v.setTextColor(R.id.mf_w_stufe, Bilder.stufenFarbe(c, z?.stufe))
        v.setTextViewText(R.id.mf_w_zuletzt, WidgetMaler.zuletzt(c, z))
        v.setContentDescription(R.id.mf_w_wurzel, listOfNotNull(c.getString(R.string.mf_hg_erholung), z?.erholungText, z?.stufeText).joinToString(" "))
        v.setOnClickPendingIntent(R.id.mf_w_wurzel, Wege.oeffnen(c, Wege.HEUTE))
        return v
    }
}

/** Heute 4 × 2: drei Spalten mit großen Zahlen, darunter der Satz aus „Heute“ und „zuletzt“. */
class HeuteWidget : MfWidget() {
    override fun zeichnen(c: Context, z: Zusammenfassung?, groesse: Bundle?): RemoteViews {
        val v = RemoteViews(c.packageName, R.layout.mf_widget_heute)
        val leer = WidgetMaler.leerText(c, z)
        val b = { key: String, res: Int -> z?.beschriftung(c, key, res) ?: c.getString(res) }
        v.setImageViewBitmap(R.id.mf_w_ring, Bilder.ring(c, if (leer == null) z?.erholungWert else null, z?.stufe, 22f, mitZahl = false, flaeche = false))
        v.setTextViewText(R.id.mf_w_erholung_name, b("erholung", R.string.mf_hg_erholung))
        v.setTextViewText(R.id.mf_w_erholung_wert, if (leer == null) z?.erholungText ?: "–" else "–")
        v.setTextColor(R.id.mf_w_erholung_wert, if (leer == null) Bilder.stufenFarbe(c, z?.stufe) else c.getColor(R.color.mf_hg_tinte))
        v.setTextViewText(R.id.mf_w_belastung_name, b("belastung", R.string.mf_hg_belastung))
        v.setTextViewText(R.id.mf_w_belastung_wert, if (leer == null) z?.belastungText ?: "–" else "–")
        v.setTextViewText(R.id.mf_w_schlaf_name, b("schlaf", R.string.mf_hg_schlaf))
        v.setTextViewText(R.id.mf_w_schlaf_wert, if (leer == null) z?.schlafText ?: "–" else "–")
        v.setTextViewText(R.id.mf_w_satz, leer ?: z?.kernaussage ?: "")
        v.setTextViewText(R.id.mf_w_zuletzt, WidgetMaler.zuletzt(c, z))
        v.setOnClickPendingIntent(R.id.mf_w_wurzel, Wege.oeffnen(c, Wege.HEUTE))
        v.setOnClickPendingIntent(R.id.mf_w_schlaf_spalte, Wege.oeffnen(c, Wege.SCHLAF))
        v.setOnClickPendingIntent(R.id.mf_w_belastung_spalte, Wege.oeffnen(c, "#/belastung"))
        return v
    }
}

/** Schlaf 2 × 1: Mond-Zeichen und Dauer groß, rechts „Bedarf 8:05 h“, darunter der Balken gegen den Bedarf. */
class SchlafWidget : MfWidget() {
    override fun zeichnen(c: Context, z: Zusammenfassung?, groesse: Bundle?): RemoteViews {
        val v = RemoteViews(c.packageName, R.layout.mf_widget_schlaf)
        val leer = WidgetMaler.leerText(c, z)
        val breite = (WidgetMaler.breiteDp(groesse, 110) - 28).coerceIn(60, 320).toFloat()
        v.setTextViewText(R.id.mf_w_zahl, if (leer == null) z?.schlafText ?: "–" else "–")
        v.setImageViewBitmap(R.id.mf_w_balken, Bilder.balken(c, if (leer == null) z?.schlafAnteil else null, breite, 6f))
        val bedarf = (z?.beschriftung(c, "bedarf", R.string.mf_hg_bedarf) ?: c.getString(R.string.mf_hg_bedarf)).replace("{wert}", z?.schlafBedarfText ?: "–")
        v.setTextViewText(R.id.mf_w_unter, if (leer == null) bedarf else WidgetMaler.zuletzt(c, z))
        v.setContentDescription(R.id.mf_w_wurzel, listOfNotNull(c.getString(R.string.mf_hg_schlaf), z?.schlafText, bedarf).joinToString(" "))
        v.setOnClickPendingIntent(R.id.mf_w_wurzel, Wege.oeffnen(c, Wege.SCHLAF))
        return v
    }
}
