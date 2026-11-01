package de.maehrsteuern.fit.hintergrund

import android.content.Context
import android.content.SharedPreferences
import java.io.File
import org.json.JSONObject

/**
 * Einstellungen und Stand des Hintergrund-Abgleichs (SharedPreferences "mf_hintergrund").
 *
 * Kernaussage: Hier merkt sich Android, ob der Abgleich läuft, wie oft, wann der Morgenbericht kommt, was heute schon
 * gemeldet wurde und wie der letzte Lauf ausging. Die App liest das über das Plugin (hintergrund.status()).
 * Technische Vorgaben, keine Rechenformeln (die stehen in kern/formeln/formeln.json).
 */
object Einstellungen {
    private const val NAME = "mf_hintergrund"
    val INTERVALLE = listOf(30, 60, 120)
    const val STANDARD_INTERVALL = 60
    const val STANDARD_UHRZEIT = "07:30"
    const val AUFWACHEN = "aufwachen"

    private fun p(c: Context): SharedPreferences = c.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun aktiv(c: Context) = p(c).getBoolean("aktiv", true)
    fun intervallMin(c: Context) = p(c).getInt("intervallMin", STANDARD_INTERVALL).let { if (it in INTERVALLE) it else STANDARD_INTERVALL }
    fun setzeHintergrund(c: Context, aktiv: Boolean, intervallMin: Int) {
        p(c).edit().putBoolean("aktiv", aktiv).putInt("intervallMin", if (intervallMin in INTERVALLE) intervallMin else STANDARD_INTERVALL).apply()
    }

    fun morgenAktiv(c: Context) = p(c).getBoolean("morgenAktiv", true)
    /** "HH:MM" oder [AUFWACHEN]. */
    fun morgenUhrzeit(c: Context): String = p(c).getString("morgenUhrzeit", STANDARD_UHRZEIT)?.let { if (it == AUFWACHEN || minutenAus(it) != null) it else null } ?: STANDARD_UHRZEIT
    fun erholungAktiv(c: Context) = p(c).getBoolean("erholungAktiv", false)
    fun schlafAktiv(c: Context) = p(c).getBoolean("schlafAktiv", false)
    fun setzeMitteilungen(c: Context, morgenAktiv: Boolean, uhrzeit: String, erholung: Boolean, schlaf: Boolean) {
        val u = if (uhrzeit == AUFWACHEN || minutenAus(uhrzeit) != null) uhrzeit else STANDARD_UHRZEIT
        p(c).edit().putBoolean("morgenAktiv", morgenAktiv).putString("morgenUhrzeit", u)
            .putBoolean("erholungAktiv", erholung).putBoolean("schlafAktiv", schlaf).apply()
    }

    /** "07:30" → 450 Minuten nach Mitternacht, sonst null. */
    fun minutenAus(uhrzeit: String): Int? {
        val m = Regex("^(\\d{1,2}):(\\d{2})$").find(uhrzeit) ?: return null
        val h = m.groupValues[1].toInt()
        val min = m.groupValues[2].toInt()
        return if (h in 0..23 && min in 0..59) h * 60 + min else null
    }

    /** Am Tag [tag] ("JJJJ-MM-TT") schon gemeldet? art = morgen | erholung | schlaf. */
    fun gemeldet(c: Context, art: String, tag: String) = p(c).getString("gemeldet_$art", null) == tag
    fun merkeGemeldet(c: Context, art: String, tag: String) { p(c).edit().putString("gemeldet_$art", tag).apply() }

    fun token(c: Context, art: String): String? = p(c).getString("token_$art", null)
    fun setzeToken(c: Context, art: String, token: String?) {
        p(c).edit().apply { if (token == null) remove("token_$art") else putString("token_$art", token) }.apply()
    }

    fun letzterLauf(c: Context): JSONObject? = p(c).getString("letzterLauf", null)?.let { runCatching { JSONObject(it) }.getOrNull() }
    fun merkeLauf(c: Context, lauf: JSONObject) { p(c).edit().putString("letzterLauf", lauf.toString()).apply() }

    /** Einstellungen der App für den Kern (alter, maxPuls, ruhepuls, schlafBasisMs, sprache) – geschrieben mit dem Kontext. */
    fun kernEinstellungen(c: Context): String = p(c).getString("kernEinstellungen", null) ?: "{}"
    fun setzeKernEinstellungen(c: Context, json: String) { p(c).edit().putString("kernEinstellungen", json).apply() }
}

/**
 * Eingangskorb und Kontext im privaten Speicher der App (files/), nie in Health Connect zurück, nie ins Netz.
 *
 *   files/eingang/<Typ>.jsonl        neue Datensätze aus Health Connect (Brückenformat), eine Zeile je Datensatz, ohne Doppelte (metadata.id)
 *   files/abholung/<marke>/<Typ>.jsonl  beiseitegelegter Korb, bis die App ihn übernommen hat (eingangBestaetigen)
 *   files/kontext.json               Messwerte der letzten Wochen aus der App (daten/hintergrund.js kontextAusPaket), normiert
 *
 * Alle Zugriffe laufen über eine Sperre, damit Lauf und App nie gleichzeitig dieselbe Datei schreiben.
 */
object Eingang {
    private val sperre = Any()

    private fun ordner(c: Context) = File(c.filesDir, "eingang").apply { mkdirs() }
    private fun abholung(c: Context) = File(c.filesDir, "abholung").apply { mkdirs() }
    private fun kontextDatei(c: Context) = File(c.filesDir, "kontext.json")

    private fun idVon(zeile: String): String? = runCatching { JSONObject(zeile).optJSONObject("metadata")?.optString("id")?.takeIf { it.isNotEmpty() } }.getOrNull()

    /** Atomar schreiben: erst Nebendatei, dann umbenennen. */
    private fun schreibe(datei: File, text: String) {
        val neu = File(datei.parentFile, datei.name + ".neu")
        neu.writeText(text, Charsets.UTF_8)
        if (!neu.renameTo(datei)) { datei.delete(); neu.renameTo(datei) }
    }

    /**
     * Datensätze einer Art anhängen; gleiche metadata.id ersetzt die alte Zeile.
     * @return Anzahl neuer (nicht ersetzter) Datensätze
     */
    fun anhaengen(c: Context, typ: String, datensaetze: List<JSONObject>): Int = synchronized(sperre) {
        if (datensaetze.isEmpty()) return 0
        val datei = File(ordner(c), "$typ.jsonl")
        val zeilen = LinkedHashMap<String, String>()
        if (datei.exists()) datei.readLines(Charsets.UTF_8).forEachIndexed { i, z -> if (z.isNotBlank()) zeilen[idVon(z) ?: "#alt$i"] = z }
        var neu = 0
        datensaetze.forEachIndexed { i, d ->
            val id = d.optJSONObject("metadata")?.optString("id")?.takeIf { it.isNotEmpty() } ?: "#neu${System.nanoTime()}_$i"
            if (!zeilen.containsKey(id)) neu++
            zeilen[id] = d.toString()
        }
        schreibe(datei, zeilen.values.joinToString("\n", postfix = "\n"))
        neu
    }

    /** Inhalt eines Ordners je Typ (Dateiname ohne .jsonl). */
    private fun lesenOrdner(o: File, ziel: MutableMap<String, StringBuilder>) {
        o.listFiles { f -> f.isFile && f.name.endsWith(".jsonl") }?.sortedBy { it.name }?.forEach { f ->
            ziel.getOrPut(f.name.removeSuffix(".jsonl")) { StringBuilder() }.append(f.readText(Charsets.UTF_8)).append('\n')
        }
    }

    /**
     * Korb für die App: Der laufende Eingang wird nach abholung/<marke> verschoben (ein neuer Korb beginnt leer). Liegen noch
     * unbestätigte Körbe, kommen sie mit (älteste zuerst). Rückgabe: { marke, dateien: { Typ: "jsonl" } }.
     */
    fun uebernehmen(c: Context): JSONObject = synchronized(sperre) {
        val marke = System.currentTimeMillis().toString().padStart(16, '0')
        val e = ordner(c)
        if ((e.listFiles()?.any { it.name.endsWith(".jsonl") }) == true) {
            val ziel = File(abholung(c), marke)
            if (!e.renameTo(ziel)) {
                ziel.mkdirs()
                e.listFiles()?.forEach { f -> f.copyTo(File(ziel, f.name), overwrite = true); f.delete() }
            }
        }
        val dateien = linkedMapOf<String, StringBuilder>()
        abholung(c).listFiles { f -> f.isDirectory && f.name <= marke }?.sortedBy { it.name }?.forEach { lesenOrdner(it, dateien) }
        val d = JSONObject()
        dateien.forEach { (typ, text) -> d.put(typ, text.toString()) }
        JSONObject().put("marke", marke).put("dateien", d)
    }

    /** Übernommene Körbe bis einschließlich [marke] löschen. */
    fun bestaetigen(c: Context, marke: String) = synchronized(sperre) {
        abholung(c).listFiles { f -> f.isDirectory && f.name <= marke }?.forEach { it.deleteRecursively() }
        Unit
    }

    /** Alles, was die App noch nicht übernommen hat (Korb + unbestätigte Körbe), als { Typ: "jsonl" } für die Rechnung. */
    fun fuerRechnung(c: Context): String = synchronized(sperre) {
        val dateien = linkedMapOf<String, StringBuilder>()
        abholung(c).listFiles { f -> f.isDirectory }?.sortedBy { it.name }?.forEach { lesenOrdner(it, dateien) }
        lesenOrdner(ordner(c), dateien)
        val d = JSONObject()
        dateien.forEach { (typ, text) -> d.put(typ, text.toString()) }
        d.toString()
    }

    /** Größe des Korbs in Datensätzen je Typ (für den Status). */
    fun anzahl(c: Context): Map<String, Int> = synchronized(sperre) {
        val aus = linkedMapOf<String, Int>()
        listOf(ordner(c)).plus(abholung(c).listFiles { f -> f.isDirectory }?.toList() ?: emptyList()).forEach { o ->
            o.listFiles { f -> f.name.endsWith(".jsonl") }?.forEach { f ->
                aus[f.name.removeSuffix(".jsonl")] = (aus[f.name.removeSuffix(".jsonl")] ?: 0) + f.readLines().count { it.isNotBlank() }
            }
        }
        aus
    }

    fun kontextSchreiben(c: Context, json: String) = synchronized(sperre) { schreibe(kontextDatei(c), json) }

    fun kontext(c: Context): String = synchronized(sperre) {
        val f = kontextDatei(c)
        if (f.exists()) f.readText(Charsets.UTF_8) else "{}"
    }
}
