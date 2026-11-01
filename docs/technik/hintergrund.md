# Hintergrund-Abgleich, Mitteilungen und Widgets (Android)

> **Kernaussage.** Auch wenn MAEHR FIT geschlossen ist, holt das Handy etwa jede Stunde neue Werte aus Health Connect, rechnet
> mit demselben Rechenkern wie die App die Zahlen von heute und zeigt sie in drei Widgets und einem ruhigen Morgenbericht.
> Beim Öffnen übernimmt die App, was im Hintergrund ankam, ohne Doppelte. Damit das klappt, braucht es zwei Freigaben:
> „Im Hintergrund lesen“ in Health Connect und – auf Xiaomi-Handys – „Autostart“ samt ausgeschalteter Akku-Optimierung.

Bedienung: `docs/apps/mitteilungen.md` (Ansicht „Mitteilungen & Widgets“ unter Mehr). Bauen: `docs/technik/android.md`.

## Wie ein Lauf abläuft

```text
WorkManager (stündlich, Spielraum 15 min, nur bei ausreichender Akkuladung)   ─┐
App-Start (beschleunigter Einmal-Lauf) · Wecker zur Uhrzeit des Morgenberichts ─┴─► HintergrundAbgleichWorker
  1. Health Connect lesen (HealthConnectLeser, gemeinsam mit dem Plugin der App)
       je freigegebener Art: Änderungsliste seit dem gemerkten Token (getChanges)
       ohne Token (erster Lauf / Token älter als 30 Tage): letzte 2 Tage lesen, neues Token holen
     → files/eingang/<Typ>.jsonl   (Brückenformat, eine Zeile je Datensatz, gleiche metadata.id ersetzt die alte Zeile)
  2. Rechnen: kern.bundle.js in einer unsichtbaren WebView (Hauptfaden, höchstens 20 s)
       Eingabe: files/kontext.json (von der App) + Eingang + Einstellungen der App
  3. SharedPreferences „mf_zusammenfassung“ (json + zeitpunkt) → Widgets neu zeichnen → Mitteilungen prüfen → Wecker stellen
```

| Teil | Datei |
|---|---|
| Lauf | `android/plugins/hintergrund/…/HintergrundAbgleichWorker.kt` |
| Health Connect lesen (Plugin und Lauf) | `android/plugins/healthconnect/…/HealthConnectLeser.kt` |
| Eingangskorb, Kontext, Einstellungen | `…/hintergrund/Ablage.kt` (`Eingang`, `Einstellungen`) |
| Rechnen in der WebView | `…/hintergrund/KernRechner.kt`, Skript `android/app/src/main/assets/kern.bundle.js` (aus `android/kern_einstieg.js`, gebaut von `bau.py`) |
| Planung, Wecker, Neustart | `…/hintergrund/Planer.kt` (`Planer`, `WeckerEmpfaenger`, `StartEmpfaenger`) |
| Mitteilungen | `…/hintergrund/Mitteilungen.kt`, Layouts `res/layout/mf_mitteilung_*.xml` |
| Widgets | `…/hintergrund/Widgets.kt`, Layouts `res/layout/mf_widget_*.xml`, `res/xml/mf_widget_*_info.xml` |
| Ring und Balken (Canvas) | `…/hintergrund/Bilder.kt` |
| Brücke zur App | `…/hintergrund/HintergrundPlugin.kt` ↔ `daten/bruecke_capacitor.js` (`installiereHintergrundBruecke`) |
| App-Seite | `daten/hintergrund.js` (abholen, spiegeln, Zusammenfassung), `shell/apps/mitteilungen.js` |

## Dieselben Zahlen wie in der App

Android rechnet nichts selbst. Die Zusammenfassung kommt immer aus dem Rechenkern `kern/` – entweder in der App
(`daten/hintergrund.js spiegeln`, beim Öffnen und beim Verlassen) oder im Hintergrund über `kern.bundle.js`, das dieselben Dateien
enthält (Kern, Zuordnung `daten/healthconnect.js`, Texte `shell/i18n/i18n.js`, Zahlenformat `shell/format.js`).

- **Kontext.** Beim Verlassen schreibt die App die Messwerte, die der Kern für heute braucht, nach `files/kontext.json`:
  alle Arten der letzten `basis.fenster.lang` + 2 Tage (Basislinie), Herzschläge nur der letzten `schlaf.schuld.fenster` + 2 Tage
  (Belastung der Vortage für die Schlafschuld), Trainings älterer Tage ohne ihre Herzschläge. Ein Test belegt, dass der gekürzte
  Kontext auf den Punkt dieselbe Zusammenfassung ergibt wie alle Daten (`tests/node/daten_hintergrund.test.mjs`).
  Unveränderter Kontext wird nicht erneut geschickt (Fingerabdruck).
- **Eingang.** Was der Lauf seit dem letzten Öffnen gelesen hat, kommt dazu (gleiche `quelle.id` ersetzt).
- **Ohne eigene Werte** (Demodaten der Musterperson) schreibt die App eine leere Zusammenfassung: Widgets und Mitteilung zeigen
  nie erfundene Zahlen als echte. Nur die Test-Mitteilung zeigt Beispielzahlen und sagt das im Text.

Schema der Zusammenfassung: Kopf von `daten/hintergrund.js`. Beispiel (Musterperson, 30.10.2026):
`Erholung 71 % · Belastung 10,6 · Schlaf 7:42 h`, Satz „Du bist heute gut erholt: 71 %. Die Nacht war kürzer als dein Bedarf, aber ruhig.“

## Beim Öffnen: Eingang übernehmen

`daten/hintergrund.js einhaengen(window)` (eingehängt beim Laden von `shell/apps/mitteilungen.js`) wartet auf den Speicher der Shell,
dann:

1. `hintergrund.eingangUebernehmen()` – Android legt den Korb nach `files/abholung/<marke>/` und beginnt einen neuen.
2. Die App ordnet die Zeilen zu (`daten/healthconnect.js zuordnen`) und legt sie ab (`daten/ablage.js speichereMessungen`, ohne
   Doppelte). Trainings bekommen Herzschläge aus dem Korb und aus dem Speicher.
3. Erst danach `hintergrund.eingangBestaetigen({ marke })` – Android löscht den Korb. Scheitert Schritt 2, bleibt er liegen und kommt
   beim nächsten Öffnen wieder.
4. Kam etwas Neues, lädt die Shell neu (`MF.shell.neuLaden`); dann `spiegeln` (Kontext, Zusammenfassung, Widgets).

Bei jeder Rückkehr in die App wiederholt sich das; beim Verlassen wird nur gespiegelt.

## Grenzen (ehrlich)

| Grenze | Folge | Abhilfe |
|---|---|---|
| **Hintergrundrecht.** Health Connect lässt Apps im Hintergrund nur mit `READ_HEALTH_DATA_IN_BACKGROUND` lesen. Das gibt es ab Android 14 bzw. mit neuem Health Connect (`FEATURE_HEALTH_DATA_BACKGROUND_READ`). | Ohne Recht liest der Lauf nichts („ohne Hintergrundrecht – nichts gelesen“), rechnet aber mit dem, was da ist. Beim Öffnen der App läuft ein Lauf im Vordergrund – dann geht es auch ohne Recht. | „Im Hintergrund erlauben“ in „Mitteilungen & Widgets“, oder Health Connect → App-Berechtigungen → MAEHR FIT → „Zugriff im Hintergrund“. |
| **WHOOP muss zuerst schreiben.** Der Lauf sieht nur, was die WHOOP-App schon nach Health Connect gegeben hat. WHOOP gleicht selbst nur ab, wenn sie im Hintergrund laufen darf. | Morgenbericht kommt erst, wenn die Nacht in Health Connect steht – höchstens 6 Stunden nach der eingestellten Zeit, sonst an diesem Tag nicht. | WHOOP-App ebenfalls Autostart/Akku freigeben; „nach dem Aufwachen“ wählen. |
| **Xiaomi / MIUI / HyperOS** beenden Apps im Hintergrund und lassen sie nach einem Neustart nicht wieder an. | Kein stündlicher Lauf, keine Wecker, Widgets bleiben stehen. | Einstellungen → Apps → MAEHR FIT → **Autostart** an; **Akku-Sparmodus** → „Keine Einschränkungen“. Die Knöpfe in der App führen direkt hin (MIUI-Seiten `com.miui.securitycenter`/`com.miui.powerkeeper`, sonst die App-Info). |
| **WorkManager ist nicht pünktlich.** Android bündelt Läufe; „stündlich“ heißt 45–60 Minuten, im Ruhemodus seltener. | Zahlen im Widget sind bis zu einer Stunde alt („zuletzt HH:MM“ zeigt es). | Der Morgenbericht hat zusätzlich einen Wecker (`setAndAllowWhileIdle`, ohne Recht für exakte Wecker, wenige Minuten Spiel). |
| **Gelöschte Datensätze** in Health Connect übernimmt der Lauf nicht (nur neue und geänderte). | Ein in WHOOP gelöschtes Training bleibt in MF. | Selten; im Zweifel in „Daten“ neu einlesen. |
| **Änderungs-Token gilt 30 Tage.** | Nach langer Pause liest der Lauf nur die letzten 2 Tage; den Rest holt die App beim Öffnen. | – |
| **WebView** braucht den Hauptfaden und ein aktuelles „Android System WebView“. | Rechnen dauert typ. unter 1 s; nach 20 s bricht der Lauf ab und behält die alte Zusammenfassung. | WebView im Play Store aktuell halten. |

## Mitteilungen

- **Kanäle:** „MF Morgenbericht“ und „MF Hinweise“ (Wichtigkeit „Standard“, ohne Ton und ohne Vibration), „MF Abgleich“ (minimal,
  nur Android 11 und älter bei Sofort-Läufen als Vordergrunddienst).
- **Recht:** Android 13+ fragt einmal nach „Mitteilungen“ (Knopf „Mitteilungen erlauben“). Wer ablehnt, bekommt den Weg in die
  System-Einstellungen.
- **Aussehen:** kleines Symbol „MF“ einfarbig (`res/drawable/mf_glyph.xml`), Akzent MBS-Grün `#0A6551`. Eigenes Aussehen
  (`DecoratedCustomViewStyle`): zugeklappt Ring (40 dp) + „Erholung 71 % · Grün“ + Satz; aufgeklappt Ring (88 dp) links, drei
  Spalten Erholung · Belastung · Schlaf mit 26-sp-Zahlen, darunter der Satz. Schriften über die System-Stile
  `TextAppearance.Material.Notification*`, die Erholungsfarbe aus `values`/`values-night` (ab Android 12 löst die Leiste sie selbst
  auf, folgt also hell/dunkel live). Klappt das eigene Aussehen nicht, kommt dieselbe Mitteilung als `BigTextStyle` (Satz als Text,
  Zahlenzeile als Zusammenfassung, Ring als großes Symbol). Sperrbildschirm: nur „MF Morgenbericht – Entsperren …“.
- **Tippen** öffnet „Heute“, Knopf **„Atemübung“** öffnet `#/atem`. Sprünge laufen als Extra `mf_weg` an `MainActivity` und als
  Ereignis „weg“ in die App; nur Wege aus `daten/hintergrund.js WEGE` werden befolgt.
- **Regeln (je Tag höchstens einmal):** Morgenbericht ab der Uhrzeit (Standard 07:30) oder „nach dem Aufwachen“ (sobald der Lauf den
  Hauptschlaf von heute sieht), nur mit Erholung für heute, höchstens 6 h danach. Hinweis bei roter Erholung nur bei
  ausgeschaltetem Morgenbericht. Hinweis zur Schlafenszeit 30 min vorher: übliche Aufwachzeit (Median der letzten 7 Hauptschlafe,
  mindestens 3) minus Schlafbedarf der kommenden Nacht (`kern/tag.js bedarfNaechsteNacht`).

`@capacitor/local-notifications` ist **nicht** nötig: Kanäle, eigenes Aussehen, Bild-Symbol und Wecker gehen mit Bordmitteln
(`Notification.Builder`, `RemoteViews`, `AlarmManager`) besser und ohne weitere Abhängigkeit.

## Widgets

| Widget | Größe | Inhalt | Tippen |
|---|---|---|---|
| Erholung | 2 × 2 | Ring in Stufenfarbe, Zahl groß (schmal, fett), Stufe, „zuletzt 07:42“ | `#/heute` |
| Heute | 4 × 2 | Erholung · Belastung · Schlaf mit 30-sp-Zahlen, Satz aus „Heute“ (2 Zeilen), „zuletzt“ | `#/heute`, Spalten `#/belastung`/`#/schlaf` |
| Schlaf | 2 × 1 | Mond, Dauer, „Bedarf 8:05 h“, Balken Schlaf gegen Bedarf | `#/schlaf` |

Dunkle Fläche „Nacht“ (`--m-d-flaeche-1`) mit Haarlinie, Ecken ab Android 12 wie das System
(`@android:dimen/system_app_widget_background_radius`), Farben aus `shell/design/marke.css` (Verweise in `res/values/colors.xml`).
Vorschau in der Widget-Liste: ab Android 12 das echte Layout (`previewLayout`), davor Vektorbilder (`mf_vorschau_*.xml`).
Zeigt die Zusammenfassung nicht heute, sondern einen älteren Tag, steht unten dessen Name statt „zuletzt“. Ohne eigene Werte steht
ein Satz statt Zahlen. Ring und Balken zeichnet `Bilder.kt` mit Canvas (RemoteViews kennen keine eigenen Ansichten); die
Schrift ist die System-Schmalschrift `sans-serif-condensed` fett (Barlow Condensed liegt nur als woff2 in der Web-App).

## Prüfen ohne Android Studio

`bash android/pruefung/kotlin_pruefen.sh` (oder `npm run android:pruefen`) übersetzt alle Kotlin-Dateien mit kotlinc 1.9.24 gegen
android.jar 34, Health Connect 1.1.0-alpha08, activity 1.8.0, Coroutines 1.7.3, WorkManager 2.9.1 und Stummel für Capacitor
(`android/pruefung/stub`, Signaturen wie @capacitor/android 6.2.1) und R (`android/pruefung/r_stub.py`, prüft dabei XML, Verweise,
RemoteViews-Ansichten und DE/EN-Texte). Danach `MainActivity.java` mit javac. Fehlende Werkzeuge lädt es einmal nach
`~/.cache/mf-kotlin-pruefung`. Das ersetzt keinen Gradle-Bau (aapt2, Manifest, D8), fängt aber alle Fehler im Quelltext ab.

## Am Gerät zu prüfen (noch nie gelaufen)

1. Lauf im Hintergrund mit erteiltem Hintergrundrecht: kommen Zeilen in `files/eingang/` an (Status „Letzter Lauf … neue Messwerte“)?
2. WebView im Hintergrund ohne sichtbare Activity: rechnet sie (Zusammenfassung mit `quelle: "hintergrund"`)?
3. Aussehen der Mitteilung auf MIUI (MIUI ersetzt Teile der Mitteilungsleiste) in hell und dunkel.
4. Widgets auf dem MIUI-Startbildschirm: Größen 2 × 2, 4 × 2, 2 × 1, Ecken, Vorschau.
5. Wecker 07:30 im Ruhemodus mit Autostart an/aus.
