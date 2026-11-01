package de.maehrsteuern.fit.hintergrund

import android.content.Context
import org.json.JSONObject

/**
 * Tageszusammenfassung für Mitteilung und Widgets (Schema: daten/hintergrund.js, Version 1).
 *
 * Kernaussage: Eine kleine Datei mit den Zahlen von heute – Erholung, Belastung, Schlaf – und dem Satz, der oben in „Heute“
 * steht. Sie kommt entweder aus der App (beim Verlassen, quelle "app") oder aus dem Lauf im Hintergrund (quelle "hintergrund").
 * Gespeichert in SharedPreferences "mf_zusammenfassung" (json + zeitpunkt). Android rechnet hier nichts: alle Zahlen und Texte
 * kommen fertig aus dem Rechenkern; hier wird nur gelesen.
 */
class Zusammenfassung(val roh: JSONObject) {
    private fun teil(name: String): JSONObject = roh.optJSONObject(name) ?: JSONObject()
    private fun zahlOderNull(o: JSONObject, feld: String): Double? = if (o.has(feld) && !o.isNull(feld)) o.optDouble(feld).takeIf { !it.isNaN() } else null
    private fun text(o: JSONObject, feld: String, ersatz: String = "–"): String = if (o.has(feld) && !o.isNull(feld)) o.optString(feld, ersatz) else ersatz

    val tag: String = roh.optString("tag", "")
    val istHeute: Boolean = roh.optBoolean("istHeute", false)
    val erzeugt: Long = roh.optLong("erzeugt", 0L)
    val quelle: String = roh.optString("quelle", "")
    val demo: Boolean = roh.optBoolean("demo", false)
    val leer: Boolean = roh.optBoolean("leer", false)
    val erholungWert: Int? = zahlOderNull(teil("erholung"), "wert")?.toInt()
    val stufe: String? = teil("erholung").optString("stufe", "").takeIf { it in listOf("gruen", "gelb", "rot") }
    val erholungText: String = text(teil("erholung"), "text")
    val belastungText: String = text(teil("belastung"), "text")
    val schlafText: String = text(teil("schlaf"), "text")
    val schlafBedarfText: String = text(teil("schlaf"), "bedarfText")
    val schlafDauerMs: Long? = zahlOderNull(teil("schlaf"), "dauerMs")?.toLong()
    val schlafBedarfMs: Long? = zahlOderNull(teil("schlaf"), "bedarfMs")?.toLong()
    val schlafAnteil: Int? = zahlOderNull(teil("schlaf"), "anteil")?.toInt()
    val kernaussage: String = roh.optString("kernaussage", "")
    val zeile: String = roh.optString("zeile", "")
    val schlafErkannt: Boolean = roh.optBoolean("schlafErkannt", false)
    val aufwachenMs: Long? = if (roh.has("aufwachenMs") && !roh.isNull("aufwachenMs")) roh.optLong("aufwachenMs") else null
    val bettMs: Long? = roh.optJSONObject("schlafenszeit")?.let { if (it.has("bettMs")) it.optLong("bettMs") else null }
    val schlafenszeitText: String? = roh.optJSONObject("schlafenszeit")?.optString("text")?.takeIf { it.isNotEmpty() }
    val stufeText: String = roh.optString("stufeText", "")
    val tagText: String = roh.optString("tagText", "")
    private val texte: JSONObject = roh.optJSONObject("texte") ?: JSONObject()

    /** Beschriftung aus der App (Sprache der App), sonst aus den Android-Ressourcen. */
    fun beschriftung(c: Context, schluessel: String, ersatzRes: Int): String = texte.optString(schluessel, "").ifEmpty { c.getString(ersatzRes) }

    /** „zuletzt 07:42“ in der Sprache der App. */
    fun zuletzt(c: Context, uhrzeit: String): String = texte.optString("zuletzt", "").ifEmpty { c.getString(R.string.mf_hg_zuletzt) }.replace("{zeit}", uhrzeit)

    /** Hat die Zusammenfassung echte Werte für Erholung? (Demodaten und leere Tage zählen nicht.) */
    val hatErholung: Boolean get() = !demo && !leer && erholungWert != null && stufe != null

    companion object {
        private const val NAME = "mf_zusammenfassung"

        fun lesen(c: Context): Zusammenfassung? {
            val text = c.getSharedPreferences(NAME, Context.MODE_PRIVATE).getString("json", null) ?: return null
            return runCatching { Zusammenfassung(JSONObject(text)) }.getOrNull()
        }

        fun zeitpunkt(c: Context): Long = c.getSharedPreferences(NAME, Context.MODE_PRIVATE).getLong("zeitpunkt", 0L)

        /** Schreiben; ungültiges JSON wird abgelehnt (die alte Zusammenfassung bleibt). */
        fun schreiben(c: Context, json: String): Zusammenfassung {
            val z = Zusammenfassung(JSONObject(json))
            c.getSharedPreferences(NAME, Context.MODE_PRIVATE).edit().putString("json", json).putLong("zeitpunkt", System.currentTimeMillis()).apply()
            return z
        }

        /** Beispielwerte für die Test-Mitteilung, solange es noch keine eigenen gibt (klar als Beispiel beschriftet). */
        fun beispiel(c: Context): Zusammenfassung {
            val o = JSONObject()
            o.put("tag", "").put("istHeute", true).put("erzeugt", System.currentTimeMillis()).put("quelle", "beispiel").put("demo", true)
            o.put("erholung", JSONObject().put("wert", 71).put("stufe", "gruen").put("text", c.getString(R.string.mf_hg_beispiel_erholung)))
            o.put("belastung", JSONObject().put("text", c.getString(R.string.mf_hg_beispiel_belastung)))
            o.put("schlaf", JSONObject().put("text", c.getString(R.string.mf_hg_beispiel_schlaf)).put("bedarfText", c.getString(R.string.mf_hg_beispiel_bedarf)).put("anteil", 92))
            o.put("kernaussage", c.getString(R.string.mf_hg_beispiel_kern))
            o.put("zeile", c.getString(R.string.mf_hg_beispiel_zeile))
            o.put("stufeText", c.getString(R.string.mf_hg_stufe_gruen))
            return Zusammenfassung(o)
        }
    }
}
