# Live-Puls über Bluetooth

> **Kernaussage.** Das WHOOP-Band kann seinen Puls live über Bluetooth senden – nach demselben Standard wie Brustgurte. MAEHR FIT
> liest diesen Puls direkt, ohne WHOOP-Konto und ohne Netz: in Chrome am Rechner und auf Android-Handys sowie in der Android-App.
> Dafür musst du in der WHOOP-App einmal die Pulsübertragung („Heart Rate Broadcast“) einschalten. Ob WHOOP dabei auch die genauen
> Abstände zwischen den Herzschlägen mitsendet, ist nicht bestätigt; ohne sie gibt es Puls, Zonen und Belastung, aber keine
> Kurz-HRV und keine Kohärenz.

## 1. WHOOP vorbereiten: „Heart Rate Broadcast“

1. WHOOP-App öffnen → oben auf das Band-Symbol (Geräte) → **Geräteeinstellungen** (Device Settings) → **Heart Rate Broadcast** →
   einschalten bzw. „Start Broadcast“.
2. Das Licht am Band blinkt blau, solange es sendet. Erst dann taucht es bei der Gerätesuche auf.
3. In MAEHR FIT: „Belastung“ → „Training live aufzeichnen“ → **Band verbinden** → in der Liste das WHOOP-Band wählen.

**Nicht bestätigt (Stand 30.10.2026, Websuche):** Es gibt keinen offiziellen Hilfeartikel von WHOOP mit dem genauen Menüweg. Die
Beschreibungen stammen aus dem WHOOP-Community-Forum und Anleitungen von Drittanbietern; die Beschriftung unterscheidet sich je nach
App-Fassung („Device Settings → Heart Rate Broadcast“, „Strap Settings → HR Broadcast“). Dass das Band dabei den Standarddienst
Heart Rate 0x180D anbietet, sagen Drittanbieter (Zwift, Peloton, Pulsoid) und eine inoffizielle Untersuchung. **Ob die Meldungen
RR-Abstände enthalten (Flag-Bit 4), ist offen** – am echten Band prüfen: Live-Ansicht → Tipp auf den Puls → im Beleg stehen
„RR-Abstände (ms)“ oder nicht. Laut einer WHOOP-Forschungs-FAQ entstehen RR-Abstände bei WHOOP vor allem in Ruhe und im Schlaf,
kaum bei Bewegung.

Quellen (Websuche 30.10.2026): WHOOP-Community „Real-time heart rate and milestone Broadcast – Not Working“, „WHOOP connects to
cycling computer but HR is not broadcasted“; Pulsoid-Blog „How to connect WHOOP strap to Pulsoid app“; FulGaz-Hilfe „Using WHOOP
heart rate with FulGaz“; University of Arizona Sensor Lab, „WHOOP Unite Research FAQs“.

## 2. Was wo geht

| Umgebung | Live-Puls | Wie |
|---|---|---|
| Android-App (APK) | ja | Plugin `@capacitor-community/bluetooth-le` (`daten/bruecke_ble_capacitor.js`), Android fragt nach „Geräte in der Nähe“ |
| Chrome am Rechner (Windows, macOS, Linux) | ja | Web Bluetooth (`daten/bruecke_webbluetooth.js`), Chrome zeigt die Geräteliste |
| Chrome auf Android | ja | Web Bluetooth |
| Safari (iPhone, Mac), Firefox | nein | Browser kennt kein Web Bluetooth → ruhige Erklärung und Demo-Puls |
| MF.html als lokale Datei (`file:`) | **nicht geprüft** | Web Bluetooth verlangt eine sichere Umgebung (https oder localhost); ob Chrome `file:` zulässt, am Rechner testen. Sonst `python3 -m http.server` im Repo und `localhost:8000/MF.html` öffnen |
| Ohne Band | Demo-Puls | erfundener Puls der Musterperson (`kern/demo.js` → `demoPuls`), wird nie gespeichert |

Hinweis (nicht geprüft): Viele Pulsmesser bedienen nur wenige Verbindungen zugleich. Hängt schon Zwift, Peloton o. Ä. am Puls und
MAEHR FIT findet das Band nicht, dort zuerst trennen. Ob die WHOOP-App selbst dabei stört, am echten Band ausprobieren.

## 3. Technik

- Dienst **Heart Rate 0x180D**, Merkmal **Heart Rate Measurement 0x2A37** (Benachrichtigungen, etwa 1 je Sekunde).
  Byte 0 = Flags: Bit 0 Puls 16 statt 8 Bit · Bit 1/2 Hautkontakt erkannt/unterstützt · Bit 3 Energie (16 Bit, kJ) folgt ·
  Bit 4 RR-Abstände folgen (je 16 Bit, Einheit 1/1024 s). Little-endian. RR in ms = rund(Rohwert × 1000 ÷ 1024)
  (`formeln.json` „live.formel_puls“).
- Leser: `parseHerzfrequenzMessung(dataView)` → `{ bpm, rrMs, energieKj?, kontakt }` in `daten/ble_puls.js`; Puls 0 (kein
  Hautkontakt) wird verworfen.
- Strom: `livePuls({ bruecke, speicher })` → `{ start, stop, abonniere, beobachte, zustand, sichern }`. Datensatz
  `{ t, bpm, rrMs, quelle: { art: "ble", id: "<Gerät>:<t>" } }`; alle 10 s gesammelt nach `messung:herzschlag:<tag>` über
  `daten/ablage.js` (gleiche Kennung ersetzt). Trennung → neu verbinden nach 1, 2, 4, 8, 16, dann alle 30 s, bis „Trennen“.
- Brücken mit gleicher Form `{ art, verfuegbar, waehle, verbinde({ beiDaten, beiTrennung }), trenne }`:
  - Web Bluetooth: `navigator.bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }] })` → GATT → `heart_rate` →
    `heart_rate_measurement` → `startNotifications()`; Trennung über `gattserverdisconnected`.
  - Capacitor: rohe Plugin-Aufrufe `initialize({ androidNeverForLocation: true })`, `requestDevice({ services: [UUID] })`, `connect`,
    `startNotifications` mit den vollen 128-Bit-Kennungen; Ereignisse `notification|<id>|<dienst>|<merkmal>` (Wert als Hex-Text
    unter Android) und `disconnected|<id>`.
  - Demo: baut echte 0x2A37-Meldungen aus `demoPuls`, damit Leser und Strom mitgeprüft werden.
- Eine Verbindung für alle Ansichten: `shell/puls.js`.

## 4. Android-Rechte

In `android/app/src/main/AndroidManifest.xml` (Vorlage: README des Plugins, Abschnitt „Android 12 Bluetooth permissions“):
`BLUETOOTH_SCAN` mit `android:usesPermissionFlags="neverForLocation"` und `BLUETOOTH_CONNECT` (ab Android 12, API 31); bis
Android 11 (`maxSdkVersion="30"`) die alten `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`.
`bluetooth_le` ist als nicht zwingend markiert. Die App fragt keinen Standort ab Android 12.

## 5. Tests

`tests/node/daten_ble.test.mjs` (handgerechnete Meldungen 8/16 Bit, mit/ohne RR, Energie, Kontakt, Rundung; Strom mit Stapel und
Neuverbinden; alle drei Brücken mit Nachbildungen), `tests/node/kern_live.test.mjs`, `tests/node/shell_live.test.mjs`. Im Browser:
Playwright mit nachgebildetem `navigator.bluetooth` (Verbinden, Trennung, Neuverbinden, Training speichern).
**Am echten WHOOP-Band nicht geprüft** – das geht nur auf Loris' Handy bzw. Rechner.
