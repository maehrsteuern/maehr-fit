package de.maehrsteuern.fit.healthconnect

import android.app.Activity
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

/**
 * Datenschutzhinweis für Health Connect. Health Connect öffnet diese Seite aus dem Freigabe-Dialog
 * (Android 13: ACTION_SHOW_PERMISSIONS_RATIONALE, Android 14+: VIEW_PERMISSION_USAGE).
 * Bewusst ohne AppCompat, damit das Plugin nur Health Connect, Capacitor und Kotlin braucht.
 */
class DatenschutzActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val abstand = (24 * resources.displayMetrics.density).toInt()
        val text = TextView(this).apply {
            setText(R.string.mf_hc_datenschutz_text)
            textSize = 17f
            setLineSpacing(0f, 1.3f)
            setPadding(abstand, abstand, abstand, abstand)
        }
        setContentView(ScrollView(this).apply { addView(text) })
        title = getString(R.string.mf_hc_datenschutz_titel)
    }
}
