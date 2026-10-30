# Formeln von MAEHR FIT

> **Kernaussage.** MAEHR FIT rechnet jeden Morgen drei Zahlen: wie erholt du bist (Erholung 0–100), wie viel dein
> Körper am Tag geleistet hat (Belastung 0–21) und wie gut du geschlafen hast (Schlafleistung 0–100). Jede Zahl
> vergleicht dich mit dir selbst – mit deinen eigenen Werten der letzten Wochen, nicht mit anderen Menschen. Alle
> Gewichte, Grenzen und Dauern stehen mit Quelle in `kern/formeln/formeln.json`; was wir selbst festgelegt haben, ist
> dort mit `"pruefen": true` markiert. Die App beschreibt Messwerte und Tendenzen und gibt keinen medizinischen Rat.

Aufbau je Abschnitt: erst in einfachen Worten, dann die Rechnung, dann die Quellen. Schlüssel in `code` verweisen auf
`formeln.json`. Rechnen in ganzen Einheiten (Millisekunden, Zehntel, Promille); gerundet wird nur über `kern/rundung.js`
(kaufmännisch, DIN 1333).

---

## 1. Der Tag: vom Aufwachen bis zum Aufwachen

**In einfachen Worten.** Dein Tag beginnt, wenn du aus dem Hauptschlaf aufwachst, und endet beim nächsten Aufwachen.
So gehört ein spätes Training zum selben Tag und die Nacht danach zur Erholung des nächsten Morgens. Ein Schlaf unter drei
Stunden ist ein Nickerchen. Ohne Schlafdaten gilt Mitternacht bis Mitternacht.

**Rechnung.**
- Hauptschlaf des Tages T = längster Schlaf, der am Kalendertag T endet und ≥ `zeit.hauptschlaf_min` (3 h) dauert.
- Tagesfenster T = [Aufwachen T, Aufwachen T+1); fehlt ein Hauptschlaf, örtliche Mitternacht. Die Fenster stoßen lückenlos aneinander.
- Zeitumstellung: Uhrzeiten werden als örtliche Wanduhr gebildet; der 25.10.2026 hat 25 Stunden, der 29.03.2026 nur 23.
- Wochen nach ISO 8601 (Montag bis Sonntag, `zeit.iso_woche`).

**Quellen.** ISO 8601-1:2019; Tagesgrenzen und 3-Stunden-Grenze: eigene Festlegung MF.

---

## 2. Normalbereich (Basislinie)

**In einfachen Worten.** Dein Normalbereich ist dein Durchschnitt der letzten 30 Tage (für Verläufe: 7 Tage) und wie
stark deine Werte üblicherweise schwanken. Der heutige Tag zählt nicht mit, damit er sich mit seiner Vorgeschichte
vergleichen lässt. Erst ab 4 Tagen mit Messwerten wird verglichen.

**Rechnung.**
- Mittel = Summe ÷ n; Streuung s = √( Σ (x − Mittel)² ÷ (n − 1) ) (Stichproben-Standardabweichung).
- Fenster `basis.fenster.lang` = 30 Tage (Erholung), `basis.fenster.kurz` = 7 Tage (Trend, Schlafregelmäßigkeit).
- Mindestzahl `basis.min_n` = 4; darunter `genug = false`, der Teil fällt aus der Erholung heraus.
- HRV wird vorher logarithmiert: x = ln(RMSSD in ms) (`basis.hrv_ln`), weil RMSSD nach oben stärker ausschlägt.
- z-Wert: z = (x − Mittel) ÷ max(s, Mindeststreuung) (`statistik.z`, `erholung.streuung_min`).

**Quellen.** JCGM 100:2008 (GUM) 4.2.1/4.2.2; Shaffer & Ginsberg (2017), Front Public Health 5:258; Plews et al. (2012),
Eur J Appl Physiol 112:3729–3741; Plews et al. (2014), Int J Sports Physiol Perform 9:783–790; Bortz & Schuster (2010).

---

## 3. Erholung (0–100)

**In einfachen Worten.** Die Erholung vergleicht die letzte Nacht mit deinem Normalbereich. 50 Punkte heißt: ein für
dich ganz üblicher Morgen. Eine höhere HRV, ein niedrigerer Ruhepuls und ein gut gedeckter Schlafbedarf heben den Wert;
eine auffällige Atemfrequenz, Hauttemperatur oder Sauerstoffsättigung zieht Punkte ab. Grün ab 67, rot bis 33.

**Rechnung** (`erholung`).

| Teil | z-Wert | Gewicht |
|---|---|---|
| HRV | (ln RMSSD − Mittel) ÷ s | 500 ‰ |
| Ruhepuls | −(Puls − Mittel) ÷ s (umgekehrt) | 250 ‰ |
| Schlaf | (Schlafleistung − 85) ÷ 15 | 250 ‰ |

- Jeder z-Wert wird auf ±3 begrenzt (`erholung.z_grenze`).
- Beitrag = 20 Punkte × z × Gewicht ÷ (Summe der Gewichte der vorhandenen Teile) – fehlt ein Teil, werden die übrigen
  auf 100 % hochgerechnet. Ohne HRV und ohne Ruhepuls gibt es keinen Wert.
- Abzüge: Atemfrequenz 8 Punkte je Streuung über 1 Streuung Abweichung; Hauttemperatur 10 Punkte je °C über 0,5 °C
  Abweichung; Sauerstoffsättigung 5 Punkte je Prozentpunkt unter 95 %.
- Erholung = 50 + Σ Beiträge − Abzüge, auf eine Stelle je Beitrag, am Ende auf ganze Punkte gerundet, begrenzt auf 0..100.
- Stufe: grün ≥ 67, gelb 34–66, rot ≤ 33.

**Beispiel** (Test `kern_erholung.test.mjs`): HRV 60 ms bei Mittel 3,912/Streuung 0,2 → z 0,912 → +9,1; Ruhepuls 55 bei
58 ± 2 → +7,5; Schlaf 94 % → +3,0; Hauttemperatur +0,7 °C → −2,0; SpO2 94 % → −5,0 → 62,6 → **63 (gelb)**.

**Quellen.** Task Force ESC/NASPE (1996), Circulation 93:1043–1065 (RMSSD); Shaffer & Ginsberg (2017); Plews et al. (2012);
Miller et al. (2020), PLoS One 15:e0243693 (Atemfrequenz); Smarr et al. (2020), Sci Rep 10:21640 (Hauttemperatur);
WHO (2011), Pulse Oximetry Training Manual (95–100 %). Gewichte, Mitte, Punkte je z, Abzüge und Stufen: eigene Festlegung MF.

---

## 4. Belastung (0–21)

**In einfachen Worten.** Die Belastung zählt, wie lange und wie hoch dein Puls über den Tag war. Jeder Pulswert fällt
in eine von fünf Zonen, gemessen an deinem Spielraum zwischen Ruhe- und Maximalpuls. Minuten in hohen Zonen zählen mehr.
Die Kurve steigt anfangs schnell und dann immer flacher: doppelte Anstrengung bringt weniger als doppelte Punkte.

**Rechnung.**
1. Maximalpuls (wenn nicht eingestellt): 208 − 0,7 × Alter, ganzzahlig in Zehnteln gerechnet (`puls.max.tanaka`).
2. Zonen nach Karvonen: Puls liegt in Zone k, wenn 100 × (Puls − Ruhe) ≥ Grenze_k × (Max − Ruhe), Grenzen
   50/60/70/80/90 % (`belastung.zonen`). Darunter zählt nichts.
3. Zeit je Wert = Abstand zum nächsten Wert, höchstens 60 s (`belastung.luecke_max_ms`); der letzte Wert zählt 0.
4. Zonen-Minuten T = Σ Minuten in Zone k × k (`belastung.gewichte` 1–5).
5. Belastung = 21 × ln(1 + T ÷ 25) ÷ ln(1 + 700 ÷ 25), höchstens 21, in ganzen Zehnteln (`belastung`).
   Beispiele: T = 13 → 2,6; T = 90 → 9,5; T = 200 → 13,7; T = 400 → 17,7; T ≥ 700 → 21.
6. Tag: Zonenzeiten aller Trainings plus Alltag (Alltag ohne Trainingszeit) addieren, dann einmal die Kurve. Die
   Tagesbelastung ist deshalb nicht die Summe der Trainingswerte.

**Quellen.** Karvonen, Kentala & Mustala (1957), Ann Med Exp Biol Fenn 35:307–315; Tanaka, Monahan & Seals (2001),
J Am Coll Cardiol 37:153–156; Edwards (1993), The Heart Rate Monitor Book; Banister (1991), in: Physiological testing of the
high-performance athlete, S. 403–424. Skala 0–21, Kurve (25 und 700), 10-%-Stufen auf die Reserve und 60-s-Lücke:
eigene Festlegung MF.

---

## 5. Schlaf

**In einfachen Worten.** Die Schlafleistung sagt, wie viel von deinem Schlafbedarf du tatsächlich geschlafen hast –
Wachphasen zählen nicht. Der Bedarf beginnt bei 8 Stunden und wächst nach einem anstrengenden Tag und nach zu kurzen
Nächten; ein Nickerchen senkt ihn. Dazu kommen die Effizienz (wie viel der Bettzeit Schlaf war) und die Regelmäßigkeit
deiner Einschlafzeit.

**Rechnung.**
- Schlafleistung = geschlafen ÷ Bedarf × 100, höchstens 100, ganze Prozent (`schlaf.leistung`).
- Schlafbedarf der Nacht = 8 h (`schlaf.bedarf.basis`) + 1 min je Belastungspunkt des Vortags
  (`schlaf.bedarf.je_belastung`) + 25 % der Schlafschuld (`schlaf.bedarf.schuld_anteil`) − Nickerchen des Vortags; ≥ 0.
- Schlafschuld = Σ (Bedarf ohne Schuld − geschlafen) der letzten 7 Nächte, nicht unter 0 (`schlaf.schuld.fenster`).
- Effizienz = geschlafen ÷ im Bett in Promille; ≥ 850 ‰ gilt als gut (`schlaf.effizienz.gut`).
- Regelmäßigkeit = 100 − |Einschlafzeit − Mittel der letzten 7 Nächte| (min) × 100 ÷ 120, nicht unter 0
  (`schlaf.konsistenz.grenze`); Einschlafzeiten werden um Mitternacht zentriert (23:30 = −30 min).

**Beispiel** (Test `kern_schlaf.test.mjs`): 450 min geschlafen bei 480 min Bedarf → 93,75 → **94**; Effizienz 937,5 → 938 ‰;
Bedarf 8 h + 12,5 min (Belastung 12,5) + 15 min (1 h Schuld) − 20 min Nickerchen = **8 h 7,5 min**.

**Quellen.** Hirshkowitz et al. (2015), Sleep Health 1:40–43 (7–9 h für Erwachsene); Ohayon et al. (2017), Sleep Health
3:6–19 (Effizienz ≥ 85 %). Zuschläge, Schuldfenster, Schuldanteil und 120-min-Grenze: eigene Festlegung MF.

---

## 6. Atemübungen

**In einfachen Worten.** Fünf geführte Übungen mit festen Phasen. Ohne eigene Angabe dauert eine Übung etwa 5 Minuten.
Die App rechnet daraus den genauen Zeitplan, die Anzeige spielt ihn ab.

| Übung | Phasen (s) | Runden | Quelle |
|---|---|---|---|
| Box | 4 ein · 4 halten · 4 aus · 4 halten | 18 | Balban et al. (2023) |
| 4-7-8 | 4 ein · 7 halten · 8 aus | 4 | Weil (1999) |
| Kohärent | 5,5 ein · 5,5 aus (≈ 5,5/min) | 27 | Lehrer & Gevirtz (2014) |
| Seufzer | 2 ein · 1 nachatmen · 6 aus | 33 | Balban et al. (2023); Längen eigene Festlegung |
| Entspannung | 4 ein · 6 aus (6/min) | 30 | Van Diest et al. (2014) |

**Rechnung.** Runden = abgerundet (300 s ÷ Rundendauer), außer bei fester Rundenzahl (4-7-8). Zeitplan: Phasen
nacheinander, `[{von, bis, art, runde}]` in ms ab Start (`atem.plan`).

**Quellen.** Balban et al. (2023), Cell Rep Med 4:100895; Weil (1999), Breathing: The Master Key to Self Healing;
Lehrer & Gevirtz (2014), Front Psychol 5:756; Van Diest et al. (2014), Appl Psychophysiol Biofeedback 39:171–180.

---

## 7. Tagebuch: Zusammenhang mit der Erholung

**In einfachen Worten.** Du hakst abends an, was du gemacht hast. Die App vergleicht deine Erholung am Morgen danach:
nach Tagen mit dem Verhalten und nach Tagen ohne. Erst ab 5 Tagen je Gruppe gilt der Vergleich als aussagekräftig.
Er zeigt einen Zusammenhang, keinen Beweis.

**Rechnung** (`tagebuch.wirkung`). Für jeden Tag T mit Erholung: Eintrag des Vortags T−1 (ja/Zahl > 0 = „mit“,
nein/0 = „ohne“, kein Eintrag = zählt nicht). Differenz = Mittel „mit“ − Mittel „ohne“, eine Nachkommastelle.
Mindestzahl `tagebuch.min_n` = 5 je Gruppe.

**Quellen.** Mittelwertvergleich zweier Gruppen; Mindestzahl: eigene Festlegung MF.

---

## 8. Verläufe, Wochen, Monate

**In einfachen Worten.** Ein Verlauf zeigt einen Wert Tag für Tag mit einem grauen Band – deinem Normalbereich der
Tage davor. Wochen und Monate fassen Mittel, kleinsten und größten Wert und die Zahl der grünen, gelben und roten Tage zusammen.

**Rechnung.** Band = Mittel der `fenster` Vortage ± 1 × Streuung (`trend.band`). Wochen nach ISO 8601, Monate nach Kalender
(`zusammenfassung`).

**Quellen.** Plews et al. (2012) (gleitender Normalbereich); ISO 8601-1:2019; Bandbreite 1 Streuung: eigene Festlegung MF.

---

## 9. Offene Punkte für Loris (`"pruefen": true`)

Die vollständige Liste liefert `pruefListe()` aus `kern/formeln.js`. Gruppen:
- Erholung: Gewichte 50/25/25 %, Mitte 50, 20 Punkte je Streuung, Kappung ±3, Schlafziel 85 %/Skala 15, Mindeststreuungen,
  alle Abzüge, Stufengrenzen 67/33.
- Belastung: 10-%-Zonenstufen auf die Herzfrequenzreserve, Skala 21, Kurve (25 / 700), Lückenregel 60 s.
- Schlaf: +1 min je Belastungspunkt, 25 % Schuldanteil, 7-Nächte-Schuldfenster, Regelmäßigkeit 120 min.
- Allgemein: 30-Tage-Fenster, Mindest-n 4, Hauptschlaf ab 3 h, Phasenlängen des Seufzers, Tagebuch-Mindest-n 5, Trendband 1 Streuung.
