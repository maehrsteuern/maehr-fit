package de.maehrsteuern.fit.hintergrund

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * Rechnet die Tageszusammenfassung im Hintergrund mit dem Rechenkern der App (assets/kern.bundle.js, gebaut von bau.py).
 *
 * Kernaussage: Android hat keinen eigenen Rechenkern – es leiht sich den der App. Dafür öffnet es ein unsichtbares
 * Browserfenster (WebView) ohne Netz, lädt das Skript, reicht Kontext, Eingang und Einstellungen über eine kleine Schnittstelle
 * hinein und bekommt die Zusammenfassung als JSON zurück. Eine WebView darf nur im Hauptfaden leben; der Lauf wartet darum
 * höchstens [WARTEN_S] Sekunden auf das Ergebnis und räumt das Fenster danach immer weg.
 */
object KernRechner {
    const val WARTEN_S = 20L
    private const val SKRIPT = "kern.bundle.js"

    class Ergebnis(val json: String?, val fehler: String?)

    /** Schnittstelle für das Skript (globalThis.MFNativ, siehe android/kern_einstieg.js rechneAusNativ). */
    private class Schnittstelle(
        private val kontext: String,
        private val eingang: String,
        private val einstellungen: String,
        private val jetzt: Long,
        private val ziel: AtomicReference<Ergebnis>,
        private val fertig: CountDownLatch,
    ) {
        @JavascriptInterface fun kontext(): String = kontext
        @JavascriptInterface fun eingang(): String = eingang
        @JavascriptInterface fun einstellungen(): String = einstellungen
        @JavascriptInterface fun jetzt(): String = jetzt.toString()
        @JavascriptInterface fun ergebnis(json: String) { ziel.set(Ergebnis(json, null)); fertig.countDown() }
        @JavascriptInterface fun fehler(text: String) { ziel.set(Ergebnis(null, text)); fertig.countDown() }
    }

    /**
     * Nicht im Hauptfaden aufrufen (wartet auf ihn).
     * @return Ergebnis mit JSON der Zusammenfassung oder Fehlertext
     */
    @SuppressLint("SetJavaScriptEnabled")
    fun rechnen(c: Context, kontext: String, eingang: String, einstellungen: String, jetzt: Long = System.currentTimeMillis()): Ergebnis {
        if (Looper.myLooper() == Looper.getMainLooper()) return Ergebnis(null, "KernRechner im Hauptfaden aufgerufen")
        val skript = try {
            c.assets.open(SKRIPT).bufferedReader(Charsets.UTF_8).use { it.readText() }
        } catch (e: Exception) {
            return Ergebnis(null, "$SKRIPT fehlt (python3 bau.py)")
        }
        val app = c.applicationContext
        val haupt = Handler(Looper.getMainLooper())
        val fertig = CountDownLatch(1)
        val ziel = AtomicReference(Ergebnis(null, "Zeitüberschreitung nach $WARTEN_S s"))
        val fenster = AtomicReference<WebView?>(null)
        haupt.post {
            try {
                val w = WebView(app)
                fenster.set(w)
                w.settings.javaScriptEnabled = true
                w.settings.blockNetworkLoads = true
                w.settings.allowFileAccess = false
                w.settings.allowContentAccess = false
                w.addJavascriptInterface(Schnittstelle(kontext, eingang, einstellungen, jetzt, ziel, fertig), "MFNativ")
                w.webViewClient = object : WebViewClient() {
                    private var gestartet = false
                    override fun onPageFinished(view: WebView, url: String?) {
                        if (gestartet) return
                        gestartet = true
                        // Erst das Skript, dann die Rechnung; Ergebnis kommt über MFNativ.ergebnis/fehler
                        view.evaluateJavascript(skript) { _ ->
                            view.evaluateJavascript("(function(){try{MFKern.rechneAusNativ();}catch(e){MFNativ.fehler(String(e&&e.stack||e));}})();", null)
                        }
                    }
                }
                w.loadDataWithBaseURL(null, "<!doctype html><meta charset=\"utf-8\"><title>MF</title>", "text/html", "utf-8", null)
            } catch (e: Throwable) {
                ziel.set(Ergebnis(null, "WebView: ${e.message}"))
                fertig.countDown()
            }
        }
        try {
            fertig.await(WARTEN_S, TimeUnit.SECONDS)
        } finally {
            haupt.post {
                fenster.getAndSet(null)?.let { w ->
                    w.removeJavascriptInterface("MFNativ")
                    w.stopLoading()
                    w.destroy()
                }
            }
        }
        return ziel.get()
    }
}
