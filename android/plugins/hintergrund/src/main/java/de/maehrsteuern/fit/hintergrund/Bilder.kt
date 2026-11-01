package de.maehrsteuern.fit.hintergrund

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface

/**
 * Bilder für Mitteilung und Widgets, mit Canvas gezeichnet (RemoteViews können keine eigenen Ansichten).
 *
 * Kernaussage: Der Erholungsring sieht aus wie in der App – dunkle Nacht-Fläche, eine helle Spur, darüber der Bogen in der
 * Farbe der Stufe (grün, gelb, rot) mit leichtem Leuchten und runden Enden, in der Mitte die Zahl in schmaler, fetter Schrift.
 * Der Schlafbalken zeigt Schlaf gegen Bedarf. Farben nur aus res/values/colors.xml (dort mit Verweis auf shell/design/marke.css).
 */
object Bilder {

    fun dp(c: Context, wert: Float): Float = wert * c.resources.displayMetrics.density

    /** Farbe der Erholungsstufe auf dunkler Fläche (marke.css --m-d-erholung-*). */
    fun stufenFarbe(c: Context, stufe: String?): Int = c.getColor(
        when (stufe) {
            "gruen" -> R.color.mf_hg_erholung_gruen
            "gelb" -> R.color.mf_hg_erholung_gelb
            "rot" -> R.color.mf_hg_erholung_rot
            else -> R.color.mf_hg_neben
        },
    )

    /** Schmale fette Systemschrift (Barlow Condensed steckt nur als woff2 in der Web-App). */
    private val schmal: Typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)

    /**
     * Erholungsring.
     * @param wert 0–100 oder null (dann nur Spur und „–“)
     * @param groesseDp Kantenlänge des quadratischen Bilds
     * @param mitZahl Zahl in die Mitte zeichnen (Mitteilung, kleines Bild); false = Zahl kommt als Text darüber (Widget)
     * @param flaeche dunkle runde Fläche dahinter (großes Mitteilungsbild); false = durchsichtig (Widget hat eigene Fläche)
     */
    fun ring(c: Context, wert: Int?, stufe: String?, groesseDp: Float, mitZahl: Boolean, flaeche: Boolean): Bitmap {
        val px = dp(c, groesseDp).toInt().coerceAtLeast(24)
        val bild = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
        val leinwand = Canvas(bild)
        val mitte = px / 2f
        if (flaeche) {
            val f = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = c.getColor(R.color.mf_hg_nacht); style = Paint.Style.FILL }
            leinwand.drawCircle(mitte, mitte, mitte, f)
        }
        val strich = px * 0.085f
        val rand = strich / 2f + px * (if (flaeche) 0.11f else 0.05f)
        val rahmen = RectF(rand, rand, px - rand, px - rand)
        val spur = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = strich; color = c.getColor(R.color.mf_hg_spur) }
        leinwand.drawArc(rahmen, 0f, 360f, false, spur)
        val farbe = stufenFarbe(c, stufe)
        if (wert != null && wert > 0) {
            val bogen = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE; strokeWidth = strich; strokeCap = Paint.Cap.ROUND; color = farbe
                setShadowLayer(strich * 0.9f, 0f, 0f, (farbe and 0x00FFFFFF) or 0x80000000.toInt()) // Leuchten wie --m-d-glow-*
            }
            leinwand.drawArc(rahmen, -90f, 360f * wert.coerceIn(0, 100) / 100f, false, bogen)
        }
        if (mitZahl) {
            val zahl = wert?.toString() ?: "–"
            val schrift = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                typeface = schmal; color = c.getColor(R.color.mf_hg_tinte); textAlign = Paint.Align.CENTER; textSize = px * 0.34f
            }
            val prozent = Paint(schrift).apply { textSize = px * 0.14f; color = c.getColor(R.color.mf_hg_neben); textAlign = Paint.Align.LEFT }
            val breite = schrift.measureText(zahl)
            val y = mitte - (schrift.descent() + schrift.ascent()) / 2f
            leinwand.drawText(zahl, mitte, y, schrift)
            if (wert != null) leinwand.drawText("%", mitte + breite / 2f + px * 0.01f, y, prozent)
        }
        return bild
    }

    /** Schlaf gegen Bedarf: Spur über die volle Breite = Bedarf, Füllung bis zum Anteil (ab 100 % voll). */
    fun balken(c: Context, anteil: Int?, breiteDp: Float, hoeheDp: Float): Bitmap {
        val b = dp(c, breiteDp).toInt().coerceAtLeast(24)
        val h = dp(c, hoeheDp).toInt().coerceAtLeast(4)
        val bild = Bitmap.createBitmap(b, h, Bitmap.Config.ARGB_8888)
        val leinwand = Canvas(bild)
        val r = h / 2f
        val spur = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = c.getColor(R.color.mf_hg_spur) }
        leinwand.drawRoundRect(RectF(0f, 0f, b.toFloat(), h.toFloat()), r, r, spur)
        if (anteil != null && anteil > 0) {
            val f = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = c.getColor(R.color.mf_hg_akzent) }
            val ende = (b * anteil.coerceIn(0, 100) / 100f).coerceAtLeast(h.toFloat())
            leinwand.drawRoundRect(RectF(0f, 0f, ende, h.toFloat()), r, r, f)
        }
        return bild
    }
}
