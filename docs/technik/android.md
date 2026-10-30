# Android-App bauen (APK)

> **Kernaussage.** Die Android-App ist eine dünne Hülle um dieselbe Datei `MF.html`, die auch im Browser läuft. Gebaut wird
> sie auf Loris' Rechner mit Android Studio; das dauert beim ersten Mal etwa eine Stunde (vor allem Downloads), danach wenige
> Minuten. Das fertige Paket (APK) wird direkt aufs Handy kopiert, nicht über den Play Store. Damit WHOOP-Daten ankommen,
> muss in der WHOOP-App die Freigabe an Health Connect eingeschaltet sein.

## Was im Repo schon fertig ist

| Teil | Ort |
|---|---|
| Android-Projekt (Capacitor 6, App-Kennung `de.maehrsteuern.fit`, Name „MAEHR FIT“) | `android/` |
| Health-Connect-Plugin (Kotlin, nur Lesen) | `android/plugins/healthconnect/` |
| App-Symbol „MF“ und Startbild in MBS-Grün | `android/app/src/main/res/` |
| Einstellungen | `capacitor.config.ts`, `package.json` |
| Kopie `MF.html → dist/index.html` | `android/bau_dist.py` (läuft in `npm run bau` mit) |

`npx cap add android` ist **nicht** nötig – das Projekt liegt schon im Repo. Fehlt `android/` einmal, mit
`git checkout -- android` wiederherstellen, nicht neu anlegen (sonst fehlen Plugin und Symbol).

## Einmal einrichten

1. **Programme installieren**
   - Node.js LTS (ab 18): <https://nodejs.org>
   - Python 3: Mac hat es meist (`python3 --version`), Windows: <https://www.python.org> (Haken „Add to PATH“)
   - Git
   - Android Studio (aktuelle Fassung): <https://developer.android.com/studio>. Beim ersten Start den Assistenten mit
     „Standard“ durchlaufen lassen; er lädt das Android SDK.
   - Im SDK Manager (Android Studio → Settings → Languages & Frameworks → Android SDK) **Android 14 (API 34)** anhaken.
2. **Repo holen**
   ```bash
   git clone https://github.com/maehrsteuern/maehr-fit.git
   cd maehr-fit
   ```

## Bauen

```bash
npm install                 # lädt Capacitor (einmalig, später nur nach Änderungen an package.json)
npm run bau                 # = python3 bau.py (MF.html) + python3 android/bau_dist.py (dist/index.html)
npx cap sync android        # kopiert dist/ in die App und richtet die Capacitor-Module ein
npx cap open android        # öffnet Android Studio
```

In Android Studio:

1. Warten, bis unten „Gradle sync“ fertig ist (beim ersten Mal 5–15 Minuten).
   - Fragt Android Studio nach einem „AGP Upgrade“: **ablehnen** („Don't ask again for this project“).
   - Meldung zur Java-Version („Unsupported class file major version“): Settings → Build, Execution, Deployment → Build Tools →
     Gradle → *Gradle JDK* auf eine Java-17- oder -21-Version stellen (z. B. „jbr-17“ oder „jbr-21“).
2. Menü **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
3. Unten rechts „APK(s) generated successfully“ → **locate**. Die Datei heißt
   `android/app/build/outputs/apk/debug/app-debug.apk`.

Ohne Oberfläche geht dasselbe mit `cd android && ./gradlew assembleDebug` (Windows: `gradlew.bat assembleDebug`).

## Aufs Handy bringen

1. Handy: Android 9 oder neuer (Health Connect gibt es erst ab Android 9; ab Android 14 ist es eingebaut, darunter aus dem
   Play Store „Health Connect“ installieren).
2. APK aufs Handy kopieren (USB, Cloud, E-Mail an sich selbst) und antippen. Android fragt einmal, ob die Quelle (z. B. „Dateien“)
   Apps installieren darf → erlauben.
   - Alternativ mit USB-Kabel und eingeschaltetem USB-Debugging: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
3. Play Protect warnt eventuell („unbekannte App“) → „Trotzdem installieren“. Das ist bei selbst gebauten Apps normal.

## WHOOP und Health Connect verbinden

1. **WHOOP-App** → „Mehr“ → „Integrationen“ (in manchen Fassungen „App-Einstellungen“) → **Health Connect** → einschalten und
   alle angebotenen Datenarten freigeben.
2. Einen Tag warten oder die WHOOP-App einmal öffnen, damit sie Daten schreibt. Kontrolle: Health Connect → „Daten und Zugriff“
   → z. B. „Schlaf“ → als Quelle steht WHOOP.
3. **MAEHR FIT** öffnen → „Daten“ → „Mit Health Connect verbinden“ → im Dialog alle Leserechte erlauben.
4. Kontrolle: Health Connect → „App-Berechtigungen“ → MAEHR FIT → dort stehen nur Leserechte.

Was WHOOP tatsächlich nach Health Connect schreibt, ist nicht vollständig belegt (`docs/technik/healthconnect.md`): Ruhepuls,
Atemfrequenz, Blutsauerstoff, Schlaf und Trainings ja; Herzratenvariabilität und Hauttemperatur vermutlich nicht. Darum
zusätzlich den **WHOOP-Export** einlesen: WHOOP-App → „Mehr“ → „App-Einstellungen“ → „Data Export“ → E-Mail-Link → ZIP
herunterladen → in MAEHR FIT unter „Daten“ wählen.

## Live-Puls über Bluetooth (ab Phase 2)

Die App liest den Puls des WHOOP-Bands live über Bluetooth (`docs/technik/bluetooth.md`). Dafür steht das Modul
`@capacitor-community/bluetooth-le` (Fassung 6.x, passend zu Capacitor 6) in `package.json`:

```bash
npm install                 # lädt @capacitor-community/bluetooth-le
npm run android:sync        # npx cap sync android trägt das Modul in android/capacitor.settings.gradle und capacitor.build.gradle ein
```

Die beiden Gradle-Dateien sind erzeugt („DO NOT EDIT“) und werden von `npx cap sync` überschrieben – nicht von Hand ändern. Die
Rechte (`BLUETOOTH_SCAN` mit `neverForLocation`, `BLUETOOTH_CONNECT`, alte Rechte bis Android 11) stehen schon im
`AndroidManifest.xml`. Beim ersten „Band verbinden“ fragt Android nach „Geräte in der Nähe“ → **Zulassen**. Vorher in der WHOOP-App
„Heart Rate Broadcast“ einschalten. Fehler „Plugin BluetoothLe not implemented“: `npx cap sync android` vergessen.

## Neu bauen nach Änderungen

```bash
git pull
npm run android:sync        # = npm run bau + npx cap sync android
```
Dann in Android Studio wieder **Build APK(s)** und die neue APK über die alte installieren (Daten bleiben erhalten, solange die
App nicht deinstalliert wird).

## Häufige Fehler

| Meldung | Abhilfe |
|---|---|
| `MF.html fehlt` | erst `python3 bau.py` (steckt in `npm run bau`) |
| `Could not find … capacitor-cordova-android-plugins` | `npx cap sync android` vergessen |
| `SDK location not found` | Android Studio einmal öffnen (legt `android/local.properties` an) oder dort `sdk.dir=…` eintragen |
| `minCompileSdk (35) … is greater than this module's compileSdkVersion` | jemand hat `healthConnectVersion` in `android/variables.gradle` erhöht – auf `1.1.0-alpha08` lassen |
| App startet, „Health Connect nicht verfügbar“ | Health Connect installieren bzw. aktualisieren (Play Store) |
| Freigabe-Dialog erscheint nicht | Health Connect aktualisieren; in Health Connect → App-Berechtigungen → MAEHR FIT von Hand freigeben |

## Prompt für Cowork (auf Loris' Rechner)

Zum Kopieren in eine neue Cowork-Sitzung auf dem Rechner, auf dem Android Studio läuft:

```text
Du arbeitest auf meinem Rechner. Ziel: die Android-App „MAEHR FIT“ aus dem Repo maehrsteuern/maehr-fit als Debug-APK bauen und mir sagen, wo die Datei liegt.

Regeln: Nichts committen oder pushen. Keine Einstellungen außerhalb des Repo-Ordners ändern, außer Programme zu installieren, wenn ich zustimme. Keine Gesundheitsdaten lesen oder hochladen. Bei jeder Frage, die eine Entscheidung braucht, erst fragen. Antworte auf Deutsch, zuerst in drei Sätzen ohne Fachsprache, was geklappt hat und was nicht.

Schritte:
1. Prüfe, ob installiert sind: git, node (ab 18), npm, python3, Android Studio mit Android SDK 34. Zeige mir, was fehlt, und frage, bevor du etwas installierst. Android Studio liegt auf dem Mac unter /Applications/Android Studio.app, unter Windows meist unter C:\Program Files\Android\Android Studio. Das SDK liegt meist unter ~/Library/Android/sdk (Mac) bzw. %LOCALAPPDATA%\Android\Sdk (Windows).
2. Wenn der Ordner ~/maehr-fit fehlt: git clone https://github.com/maehrsteuern/maehr-fit.git ~/maehr-fit. Sonst dort git pull. Frage mich, welchen Branch ich bauen will, und wechsle mit git checkout dorthin.
3. Im Repo-Ordner: npm install, dann npm run bau, dann npx cap sync android. Wenn npm run bau mit "MF.html fehlt" abbricht, führe python3 bau.py aus und wiederhole.
4. Wenn android/local.properties fehlt, lege sie mit einer Zeile sdk.dir=<Pfad zum Android SDK> an (unter Windows Backslashes verdoppeln).
5. Baue im Ordner android mit ./gradlew assembleDebug (Windows: gradlew.bat assembleDebug). Setze dafür JAVA_HOME auf die Java-Version von Android Studio (Mac: "/Applications/Android Studio.app/Contents/jbr/Contents/Home", Windows: "C:\Program Files\Android\Android Studio\jbr"). Ändere keine Versionsnummern in den Gradle-Dateien. Wenn der Bau scheitert, zeige mir die ersten 30 Zeilen der Fehlermeldung und schlage eine Lösung vor, bevor du etwas änderst.
6. Melde den vollen Pfad von android/app/build/outputs/apk/debug/app-debug.apk und die Dateigröße.
7. Wenn ein Handy per USB angeschlossen ist und "adb devices" es zeigt: frage, ob du die APK mit adb install -r installieren sollst.
8. Erkläre mir zum Schluss in einfachen Worten: In der WHOOP-App unter Mehr → Integrationen → Health Connect die Freigabe einschalten, dann in MAEHR FIT unter "Daten" auf "Mit Health Connect verbinden" tippen und alle Leserechte erlauben.
```
