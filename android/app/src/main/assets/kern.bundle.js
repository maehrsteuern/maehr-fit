/* kern.bundle.js – erzeugt von bau.py aus android/kern_einstieg.js (Kern, Zuordnung, Texte) – nicht von Hand ändern */
(function () {
"use strict";
// ===== kern/formeln/formeln.json
const __m_kern_formeln_formeln_json = { default: {"stand":"2026-10-30","quelle":"Formeln und Konstanten von MAEHR FIT. Jeder Wert mit Fundstelle; \"pruefen\": true heißt: eigene Festlegung oder noch nicht am Originaltext bestätigt – Loris entscheidet. Texte beschreiben Messwerte und Tendenzen, keine Diagnosen.","eintraege":{"rundung.kaufmaennisch":{"wert":"halb_weg_von_null","einheit":"verfahren","fundstelle":"DIN 1333:1992-02 Zahlenangaben, Abschnitt Runden (kaufmännisches Runden: ab 5 aufrunden, Betrag)","text":"Ab der Hälfte wird vom Betrag her aufgerundet (2,5 → 3; −2,5 → −3), darunter abgerundet.","erklaerung":"So wird überall gerundet, damit dieselbe Rechnung immer dieselbe Zahl ergibt.","pruefen":false},"einheit.hrv":{"wert":10,"einheit":"Zehntel je ms","fundstelle":"eigene Festlegung MF (Zahlendarstellung: RMSSD mit einer Nachkommastelle als ganze Zehntel-Millisekunden)","erklaerung":"HRV wird in Zehntel-Millisekunden gespeichert, z. B. 45,3 ms als 453. So entstehen keine Rundungsfehler.","pruefen":false},"einheit.atem":{"wert":10,"einheit":"Zehntel je Atemzug/min","fundstelle":"eigene Festlegung MF (Zahlendarstellung)","erklaerung":"Atemzüge pro Minute in Zehnteln, z. B. 14,6 als 146.","pruefen":false},"einheit.spo2":{"wert":10,"einheit":"Zehntel je Prozentpunkt","fundstelle":"eigene Festlegung MF (Zahlendarstellung)","erklaerung":"Sauerstoffsättigung in Zehntel-Prozent, z. B. 96,8 % als 968.","pruefen":false},"einheit.hauttemp":{"wert":100,"einheit":"Hundertstel je °C","fundstelle":"eigene Festlegung MF (Zahlendarstellung)","erklaerung":"Abweichung der Hauttemperatur in Hundertstel Grad, z. B. +0,35 °C als 35.","pruefen":false},"hrv.messgroesse":{"wert":"rmssd","einheit":"ms","fundstelle":"Task Force of the ESC and NASPE (1996): Heart rate variability – standards of measurement, physiological interpretation, and clinical use. Circulation 93(5):1043–1065","text":"RMSSD = Wurzel aus dem Mittel der quadrierten Unterschiede aufeinanderfolgender Herzschlagabstände.","erklaerung":"Die HRV misst, wie stark die Abstände zwischen zwei Herzschlägen schwanken. Mehr Schwankung in Ruhe gilt als Zeichen guter Erholung.","pruefen":false},"statistik.streuung":{"wert":"stichprobe_n_minus_1","einheit":"verfahren","fundstelle":"JCGM 100:2008 (GUM), Abschnitt 4.2.2, Gl. (4): experimentelle Standardabweichung mit n − 1","text":"Streuung = Wurzel aus (Summe der quadrierten Abstände zum Mittel ÷ (n − 1)).","erklaerung":"Die Streuung sagt, wie weit deine Werte üblicherweise vom Mittel abweichen.","pruefen":false},"statistik.z":{"wert":"z_wert","einheit":"Streuungen","fundstelle":"Bortz J, Schuster C (2010): Statistik für Human- und Sozialwissenschaftler, 7. Aufl., Springer, Kap. 2.5 (z-Transformation)","text":"z = (heutiger Wert − Mittel) ÷ Streuung.","erklaerung":"Der z-Wert sagt, wie ungewöhnlich ein Tag für dich ist: 0 = wie immer, +1 = eine übliche Schwankung besser, −1 = eine schlechter.","pruefen":false},"zeit.iso_woche":{"wert":"montag","einheit":"Wochenbeginn","fundstelle":"ISO 8601-1:2019, Abschnitt 3.1.1.23 und 5.2.3 (Kalenderwoche: Montag bis Sonntag, Woche 1 enthält den ersten Donnerstag)","text":"Kalenderwoche nach ISO 8601: beginnt Montag; Woche 1 ist die Woche mit dem ersten Donnerstag des Jahres.","erklaerung":"Wochen laufen von Montag bis Sonntag, wie im deutschen Kalender.","pruefen":false},"zeit.hauptschlaf_min":{"wert":10800000,"einheit":"ms","fundstelle":"eigene Festlegung MF (3 Stunden)","text":"Hauptschlaf = längster Schlaf, der an diesem Kalendertag endet und mindestens 3 Stunden dauert; kürzere Schlafphasen sind Nickerchen.","erklaerung":"Ein Tag beginnt mit dem Aufwachen aus dem Hauptschlaf. Was kürzer als drei Stunden ist, zählt als Nickerchen.","pruefen":true},"zeit.nachfenster_nach_aufwachen":{"wert":10800000,"einheit":"ms","fundstelle":"eigene Festlegung MF (Nachtwerte, die WHOOP erst nach dem Aufwachen meldet, zählen bis 3 Stunden danach zur Nacht)","erklaerung":"Meldet das Band einen Nachtwert erst kurz nach dem Aufwachen, zählt er bis zu drei Stunden danach noch zur Nacht.","pruefen":true},"zusammenfuehren.ueberlappung":{"wert":500,"einheit":"Promille","fundstelle":"eigene Festlegung MF (zwei Datensätze, die sich zur Hälfte des kürzeren überdecken, sind dieselbe Nacht bzw. dasselbe Training)","erklaerung":"Kommt eine Nacht oder ein Training aus zwei Quellen und beide überdecken sich mindestens zur Hälfte, zählt es nur einmal.","pruefen":true},"zeit.tagesgrenzen":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF (Tag von Aufwachen bis Aufwachen; ohne Schlafdaten Mitternacht bis Mitternacht)","text":"Tag = vom Aufwachen aus dem Hauptschlaf bis zum Aufwachen am nächsten Morgen. Fehlt ein Hauptschlaf, gilt die örtliche Mitternacht.","erklaerung":"Dein Tag zählt vom Aufstehen bis zum nächsten Aufstehen – so gehört ein spätes Training noch zum selben Tag.","pruefen":false},"basis.fenster.kurz":{"wert":7,"einheit":"Tage","fundstelle":"Plews DJ, Laursen PB, Kilding AE, Buchheit M (2012): Heart rate variability in elite triathletes, is variation in variability the key to effective training? Eur J Appl Physiol 112(11):3729–3741 (gleitender 7-Tage-Mittelwert)","erklaerung":"Die letzten 7 Tage zeigen, wie es dir gerade geht.","pruefen":false},"basis.fenster.lang":{"wert":30,"einheit":"Tage","fundstelle":"eigene Festlegung MF (Monatsnormalbereich als Vergleich für die Erholung)","erklaerung":"Die letzten 30 Tage sind dein persönlicher Normalbereich. Mit ihm wird jeder Tag verglichen.","pruefen":true},"basis.min_n":{"wert":4,"einheit":"Tage","fundstelle":"eigene Festlegung MF, angelehnt an Plews DJ et al. (2014): Monitoring training with heart-rate variability: how much compliance is needed for valid assessment? Int J Sports Physiol Perform 9(5):783–790 (mindestens 3 Messungen je Woche)","erklaerung":"Erst ab 4 Tagen mit Messwerten wird ein Vergleich mit deinem Normalbereich gerechnet.","pruefen":true},"basis.hrv_ln":{"wert":"ln","einheit":"verfahren","fundstelle":"Shaffer F, Ginsberg JP (2017): An overview of heart rate variability metrics and norms. Front Public Health 5:258 (RMSSD ist schief verteilt, Logarithmus macht sie annähernd normalverteilt); Plews DJ et al. (2012), a. a. O. (ln RMSSD)","text":"Für HRV wird mit dem natürlichen Logarithmus ln(RMSSD in ms) gerechnet.","erklaerung":"HRV-Werte streuen nach oben stärker als nach unten. Mit dem Logarithmus werden Ausschläge in beide Richtungen vergleichbar.","pruefen":false},"basis.stellen":{"wert":4,"einheit":"Nachkommastellen","fundstelle":"eigene Festlegung MF (Zahlendarstellung für Mittel und Streuung)","erklaerung":"Mittelwert und Streuung werden auf 4 Nachkommastellen gerundet gespeichert.","pruefen":false},"basis.mittel":{"wert":null,"einheit":"formel","fundstelle":"JCGM 100:2008 (GUM), Abschnitt 4.2.1 Gl. (3) (arithmetisches Mittel) und 4.2.2 Gl. (4) (Streuung)","text":"Basislinie = Mittelwert und Streuung der Werte aus den Tagen vor dem betrachteten Tag (der Tag selbst zählt nicht mit).","erklaerung":"Deine Basislinie ist dein persönlicher Normalwert aus den vergangenen Tagen.","pruefen":false},"erholung":{"wert":null,"einheit":"formel","fundstelle":"Eigene Festlegung MF (Aufbau und Gewichte). Grundlagen: HRV-Messung nach Task Force (1996) und Shaffer & Ginsberg (2017); HRV im Vergleich zum eigenen 7-Tage-Mittel nach Plews et al. (2012); Ruhepuls als Trainings- und Erholungsmerkmal nach Buchheit (2014, Front. Physiol. 5:73); Atemfrequenz als Abweichung vom eigenen Normalwert nach Miller et al. (2020, PLoS One 15:e0243693, von WHOOP mitfinanziert); z-Werte nach Bortz & Schuster (2010).","text":"Erholung = {erholung.mitte} + {erholung.punkte_je_z} × (Anteil HRV × z HRV + Anteil Ruhepuls × (−z Ruhepuls) + Anteil Schlaf × z Schlaf) − Abzüge für auffällige Atemfrequenz, Hauttemperatur und Sauerstoffsättigung; begrenzt auf 0 bis 100. Gewichte HRV {erholung.gewicht.hrv|prozent}, Ruhepuls {erholung.gewicht.ruhepuls|prozent}, Schlaf {erholung.gewicht.schlaf|prozent}; fehlt ein Teil, werden die übrigen auf 100 % hochgerechnet.","erklaerung":"Die Erholung vergleicht die letzte Nacht mit deinem Normalbereich. 50 heißt: ein für dich üblicher Tag. Höhere HRV, niedrigerer Ruhepuls und genug Schlaf heben den Wert; auffällige Atmung, Temperatur oder Sättigung senken ihn.","pruefen":false},"erholung.mitte":{"wert":50,"einheit":"Punkte","fundstelle":"eigene Festlegung MF (ein für dich typischer Tag liegt in der Mitte der Skala)","erklaerung":"Ein ganz normaler Tag ergibt 50 Punkte.","pruefen":true},"erholung.punkte_je_z":{"wert":20,"einheit":"Punkte je Streuung","fundstelle":"eigene Festlegung MF","erklaerung":"Eine übliche Schwankung nach oben oder unten bewegt die Erholung um 20 Punkte.","pruefen":true},"erholung.z_grenze":{"wert":3,"einheit":"Streuungen","fundstelle":"eigene Festlegung MF (Ausreißer werden bei ±3 Streuungen abgeschnitten)","erklaerung":"Ein einzelner extremer Messwert zählt höchstens wie drei übliche Schwankungen.","pruefen":true},"erholung.gewicht.hrv":{"wert":500,"einheit":"Promille","fundstelle":"eigene Festlegung MF","erklaerung":"Die HRV zählt zur Hälfte.","pruefen":true},"erholung.gewicht.ruhepuls":{"wert":250,"einheit":"Promille","fundstelle":"eigene Festlegung MF","erklaerung":"Der Ruhepuls zählt zu einem Viertel. Niedriger als üblich hebt die Erholung.","pruefen":true},"erholung.gewicht.schlaf":{"wert":250,"einheit":"Promille","fundstelle":"eigene Festlegung MF","erklaerung":"Wie gut der Schlafbedarf gedeckt war, zählt zu einem Viertel.","pruefen":true},"erholung.schlaf.ziel":{"wert":85,"einheit":"Prozent Schlafleistung","fundstelle":"eigene Festlegung MF","text":"z Schlaf = (Schlafleistung − {erholung.schlaf.ziel}) ÷ {erholung.schlaf.skala}.","erklaerung":"85 % des Schlafbedarfs gelten als neutral; mehr hebt, weniger senkt die Erholung.","pruefen":true},"erholung.schlaf.skala":{"wert":15,"einheit":"Prozentpunkte je Streuung","fundstelle":"eigene Festlegung MF","erklaerung":"15 Prozentpunkte Schlafleistung wirken wie eine übliche Schwankung.","pruefen":true},"erholung.streuung_min":{"wert":{"hrv":0.05,"ruhepuls":1,"atem":3},"einheit":"ln-Einheiten | Schläge/min | Zehntel Atemzüge/min","fundstelle":"eigene Festlegung MF (Untergrenze, damit sehr gleichmäßige Wochen keine riesigen z-Werte erzeugen)","erklaerung":"Sind deine Werte ungewöhnlich gleichmäßig, wird mit einer Mindest-Schwankung gerechnet, damit kleine Ausschläge nicht übertrieben wirken.","pruefen":true},"erholung.atem.schwelle_z":{"wert":1,"einheit":"Streuungen","fundstelle":"eigene Festlegung MF; Hintergrund: Miller DJ et al. (2020): Analyzing changes in respiratory rate to predict the risk of COVID-19 infection. PLoS One 15(12):e0243693","erklaerung":"Weicht die nächtliche Atemfrequenz um mehr als eine übliche Schwankung ab, gibt es einen Abzug.","pruefen":true},"erholung.atem.strafe_je_z":{"wert":8,"einheit":"Punkte je Streuung über der Schwelle","fundstelle":"eigene Festlegung MF","erklaerung":"Je weitere übliche Schwankung Abweichung der Atemfrequenz: 8 Punkte Abzug.","pruefen":true},"erholung.hauttemp.schwelle":{"wert":50,"einheit":"Hundertstel °C","fundstelle":"eigene Festlegung MF; Hintergrund: Smarr BL et al. (2020): Feasibility of continuous fever monitoring using wearable devices. Sci Rep 10:21640","erklaerung":"Liegt die Hauttemperatur mehr als 0,5 °C neben deinem Normalwert, gibt es einen Abzug.","pruefen":true},"erholung.hauttemp.strafe_je_grad":{"wert":10,"einheit":"Punkte je °C über der Schwelle","fundstelle":"eigene Festlegung MF","erklaerung":"Je Grad über der Schwelle: 10 Punkte Abzug.","pruefen":true},"erholung.spo2.schwelle":{"wert":950,"einheit":"Zehntel Prozent","fundstelle":"World Health Organization (2011): Pulse Oximetry Training Manual, Genf (Normalbereich 95–100 %)","erklaerung":"Liegt die nächtliche Sauerstoffsättigung unter 95 %, gibt es einen Abzug.","pruefen":false},"erholung.spo2.strafe_je_prozent":{"wert":5,"einheit":"Punkte je Prozentpunkt unter der Schwelle","fundstelle":"eigene Festlegung MF","erklaerung":"Je Prozentpunkt unter 95 %: 5 Punkte Abzug.","pruefen":true},"erholung.stufe.gruen":{"wert":67,"einheit":"Punkte (ab)","fundstelle":"eigene Festlegung MF (verbreitete Drei-Band-Einteilung in Drittel)","erklaerung":"Ab 67 Punkten: grün – deutlich besser erholt als üblich.","pruefen":true},"erholung.stufe.rot":{"wert":33,"einheit":"Punkte (bis)","fundstelle":"eigene Festlegung MF (verbreitete Drei-Band-Einteilung in Drittel)","erklaerung":"Bis 33 Punkte: rot – weniger erholt als üblich. Dazwischen gelb.","pruefen":true},"puls.max.tanaka":{"wert":{"a_zehntel":2080,"b_zehntel":7},"einheit":"Zehntel Schläge/min | Zehntel Schläge/min je Lebensjahr","fundstelle":"Tanaka H, Monahan KD, Seals DR (2001): Age-predicted maximal heart rate revisited. J Am Coll Cardiol 37(1):153–156","text":"Maximalpuls = 208 − 0,7 × Alter (Schläge pro Minute), auf ganze Schläge gerundet.","erklaerung":"Wenn du deinen Maximalpuls nicht kennst, wird er aus dem Alter geschätzt. Du kannst ihn in den Einstellungen überschreiben.","pruefen":false},"belastung.karvonen":{"wert":null,"einheit":"formel","fundstelle":"Karvonen MJ, Kentala E, Mustala O (1957): The effects of training on heart rate; a longitudinal study. Ann Med Exp Biol Fenn 35(3):307–315","text":"Zonengrenze = Ruhepuls + Prozentsatz × (Maximalpuls − Ruhepuls). Ein Schlag liegt in Zone k, wenn 100 × (Puls − Ruhepuls) ≥ Grenze k × (Maximalpuls − Ruhepuls).","erklaerung":"Die Zonen richten sich nach deinem Pulsspielraum zwischen Ruhe und Maximum – so passen sie zu deinem Körper.","pruefen":false},"belastung.zonen":{"wert":[50,60,70,80,90],"einheit":"Prozent der Herzfrequenzreserve (Untergrenzen Zone 1–5)","fundstelle":"Methode: Karvonen et al. (1957), a. a. O.; 10-%-Stufen: verbreitete Praxiskonvention (Edwards S (1993): The Heart Rate Monitor Book, Fleet Feet Press, Sacramento – dort bezogen auf den Maximalpuls)","erklaerung":"Zone 1 beginnt bei 50 % deines Pulsspielraums, Zone 5 bei 90 %. Darunter zählt nichts zur Belastung.","pruefen":true},"belastung.gewichte":{"wert":[1,2,3,4,5],"einheit":"Faktor je Zone 1–5","fundstelle":"Edwards S (1993): The Heart Rate Monitor Book, Fleet Feet Press, Sacramento (Summated-Heart-Rate-Zone-TRIMP); Prinzip Trainingsimpuls: Banister EW (1991): Modeling elite athletic performance. In: MacDougall JD, Wenger HA, Green HJ (Hg.): Physiological testing of the high-performance athlete, 2. Aufl., Human Kinetics, S. 403–424","text":"Zonen-Minuten = Σ Minuten in Zone k × k.","erklaerung":"Eine Minute in Zone 5 zählt fünfmal so viel wie eine Minute in Zone 1.","pruefen":false},"belastung.luecke_max_ms":{"wert":60000,"einheit":"ms","fundstelle":"eigene Festlegung MF (Messlücken werden höchstens mit 60 Sekunden angerechnet)","text":"Jeder Pulswert gilt bis zum nächsten Messwert, höchstens 60 Sekunden; der letzte Wert einer Reihe zählt 0 Sekunden.","erklaerung":"Fehlen Messwerte, wird nicht geraten: eine Lücke zählt höchstens eine Minute.","pruefen":true},"belastung.skala_max":{"wert":21,"einheit":"Punkte","fundstelle":"eigene Festlegung MF (verbreitete Skala 0–21)","erklaerung":"Die Belastung reicht von 0 (keine) bis 21 (äußerst hoch).","pruefen":true},"belastung.kurve.b":{"wert":25,"einheit":"Zonen-Minuten","fundstelle":"eigene Festlegung MF","erklaerung":"Bestimmt, wie schnell die Kurve am Anfang steigt: 25 Zonen-Minuten ergeben schon gut 4 Punkte.","pruefen":true},"belastung.kurve.tmax":{"wert":700,"einheit":"Zonen-Minuten","fundstelle":"eigene Festlegung MF (etwa drei Stunden harter Ausdauer erreichen das Skalenende)","erklaerung":"Ab 700 Zonen-Minuten ist das Ende der Skala erreicht.","pruefen":true},"belastung":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF; Zonen nach Karvonen et al. (1957), Gewichtung nach Edwards (1993), Trainingsimpuls nach Banister (1991)","text":"Belastung = {belastung.skala_max} × ln(1 + T ÷ {belastung.kurve.b}) ÷ ln(1 + {belastung.kurve.tmax} ÷ {belastung.kurve.b}), höchstens {belastung.skala_max}, eine Nachkommastelle. T = Zonen-Minuten des Tages (alle Trainings plus Alltag, Alltag ohne Trainingszeit).","erklaerung":"Die Belastung zählt, wie lange und wie hoch dein Puls über den Tag war. Die Kurve steigt anfangs schnell und dann immer flacher: doppelt so viel Anstrengung bringt weniger als doppelt so viele Punkte.","pruefen":true},"schlaf.bedarf.basis":{"wert":28800000,"einheit":"ms","fundstelle":"Hirshkowitz M et al. (2015): National Sleep Foundation's sleep time duration recommendations: methodology and results summary. Sleep Health 1(1):40–43 (Erwachsene 18–64 Jahre: 7–9 Stunden; Mitte 8 Stunden gewählt)","erklaerung":"Grundbedarf 8 Stunden – die Mitte der Empfehlung für Erwachsene. Du kannst ihn in den Einstellungen ändern.","pruefen":false},"schlaf.bedarf.je_belastung":{"wert":60000,"einheit":"ms je Belastungspunkt","fundstelle":"eigene Festlegung MF","erklaerung":"Je Punkt Belastung am Vortag kommt eine Minute Schlafbedarf dazu.","pruefen":true},"schlaf.bedarf.schuld_anteil":{"wert":250,"einheit":"Promille","fundstelle":"eigene Festlegung MF","erklaerung":"Ein Viertel der aufgelaufenen Schlafschuld wird zum Bedarf der nächsten Nacht addiert.","pruefen":true},"schlaf.schuld.fenster":{"wert":7,"einheit":"Tage","fundstelle":"eigene Festlegung MF","text":"Schlafschuld = Summe (Bedarf ohne Schuld − geschlafene Zeit) der letzten 7 Nächte, nicht unter 0.","erklaerung":"Die Schlafschuld zählt, wie viel Schlaf dir in der letzten Woche gefehlt hat. Mehr Schlaf an einem Tag gleicht weniger an einem anderen aus.","pruefen":true},"schlaf.bedarf":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF; Grundbedarf nach Hirshkowitz et al. (2015)","text":"Schlafbedarf = Grundbedarf + {schlaf.bedarf.je_belastung|min} min je Belastungspunkt des Vortags + {schlaf.bedarf.schuld_anteil|prozent} der Schlafschuld − Nickerchen des Vortags; nicht unter 0.","erklaerung":"Wie viel Schlaf du heute Nacht brauchst: Grundbedarf, etwas mehr nach Anstrengung und nach zu kurzen Nächten, weniger nach einem Nickerchen.","pruefen":true},"schlaf.leistung":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF (Verhältnis geschlafene Zeit zu Bedarf)","text":"Schlafleistung = geschlafene Zeit (ohne Wachphasen) ÷ Schlafbedarf × 100, höchstens 100, ganze Prozent.","erklaerung":"Wie viel von deinem Schlafbedarf du tatsächlich geschlafen hast.","pruefen":false},"schlaf.effizienz.gut":{"wert":850,"einheit":"Promille","fundstelle":"Ohayon M et al. (2017): National Sleep Foundation's sleep quality recommendations: first report. Sleep Health 3(1):6–19 (Schlafeffizienz ≥ 85 % = gute Schlafqualität)","text":"Schlafeffizienz = geschlafene Zeit ÷ Zeit im Bett (in Promille).","erklaerung":"Welcher Anteil der Zeit im Bett wirklich Schlaf war. Ab 85 % gilt das als gut.","pruefen":false},"schlaf.konsistenz.grenze":{"wert":120,"einheit":"Minuten","fundstelle":"eigene Festlegung MF","text":"Konsistenz = 100 − Abweichung der Einschlafzeit vom Mittel der letzten 7 Nächte (min) × 100 ÷ {schlaf.konsistenz.grenze}, nicht unter 0.","erklaerung":"Wie regelmäßig du ins Bett gehst. Zwei Stunden Abweichung von deiner üblichen Zeit ergeben 0 Punkte.","pruefen":true},"atem.dauer_standard":{"wert":300000,"einheit":"ms","fundstelle":"Balban MY et al. (2023): Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Rep Med 4(1):100895 (5 Minuten täglich)","erklaerung":"Eine Übung dauert ohne eigene Angabe etwa 5 Minuten.","pruefen":false},"atem.box":{"wert":{"phasen":[{"art":"ein","ms":4000},{"art":"halten","ms":4000},{"art":"aus","ms":4000},{"art":"halten2","ms":4000}]},"einheit":"ms je Phase","fundstelle":"Balban MY et al. (2023), a. a. O. (Box Breathing: gleich lange Phasen Einatmen–Halten–Ausatmen–Halten)","erklaerung":"Box-Atmung: 4 Sekunden einatmen, 4 halten, 4 ausatmen, 4 halten – wie die vier Seiten eines Quadrats.","pruefen":false},"atem.vier-sieben-acht":{"wert":{"phasen":[{"art":"ein","ms":4000},{"art":"halten","ms":7000},{"art":"aus","ms":8000}],"runden":4},"einheit":"ms je Phase","fundstelle":"Weil A (1999): Breathing: The Master Key to Self Healing. Sounds True, Boulder (4-7-8-Atmung, vier Atemzüge je Übung)","erklaerung":"4-7-8: 4 Sekunden durch die Nase einatmen, 7 halten, 8 durch den Mund ausatmen. Vier Runden.","pruefen":false},"atem.kohaerenz":{"wert":{"phasen":[{"art":"ein","ms":5500},{"art":"aus","ms":5500}]},"einheit":"ms je Phase","fundstelle":"Lehrer PM, Gevirtz R (2014): Heart rate variability biofeedback: how and why does it work? Front Psychol 5:756 (Resonanzatmung um 0,1 Hz, etwa 4,5–7 Atemzüge je Minute)","erklaerung":"Kohärente Atmung: 5,5 Sekunden ein, 5,5 Sekunden aus – gut fünfeinhalb Atemzüge pro Minute, ruhig und gleichmäßig.","pruefen":false},"atem.seufzer":{"wert":{"phasen":[{"art":"ein","ms":2000},{"art":"ein","ms":1000,"label":"nachatmen"},{"art":"aus","ms":6000}]},"einheit":"ms je Phase","fundstelle":"Balban MY et al. (2023), a. a. O. (Cyclic Sighing: zweimal einatmen, lang ausatmen); Phasenlängen: eigene Festlegung MF","erklaerung":"Physiologischer Seufzer: tief einatmen, kurz nachatmen bis die Lunge ganz voll ist, dann lange und langsam ausatmen.","pruefen":true},"atem.entspannung":{"wert":{"phasen":[{"art":"ein","ms":4000},{"art":"aus","ms":6000}]},"einheit":"ms je Phase","fundstelle":"Van Diest I et al. (2014): Inhalation/exhalation ratio modulates the effect of slow breathing on heart rate variability and relaxation. Appl Psychophysiol Biofeedback 39(3–4):171–180 (6 Atemzüge je Minute, Ausatmen länger als Einatmen)","erklaerung":"4 Sekunden ein, 6 Sekunden aus: das längere Ausatmen wird von vielen als beruhigend erlebt.","pruefen":false},"atem.plan":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF","text":"Runden ohne eigene Angabe = abgerundet ({atem.dauer_standard|min} min ÷ Dauer einer Runde). Zeitplan = Phasen nacheinander, Runde für Runde, in Millisekunden ab Start.","erklaerung":"Der Zeitplan sagt der Animation, wann welche Phase beginnt und endet.","pruefen":false},"tagebuch.min_n":{"wert":5,"einheit":"Tage je Gruppe","fundstelle":"eigene Festlegung MF","erklaerung":"Ein Vergleich wird erst ab 5 Tagen mit und 5 Tagen ohne das Verhalten als aussagekräftig angezeigt.","pruefen":true},"tagebuch.wirkung":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF (Mittelwertvergleich zweier Gruppen; Zusammenhang, kein Ursachennachweis)","text":"Differenz = mittlere Erholung an Tagen nach einem Tag MIT dem Verhalten − mittlere Erholung an Tagen nach einem Tag OHNE. Tage ohne Eintrag zählen nicht.","erklaerung":"Vergleicht deine Erholung am Morgen danach. Das zeigt einen Zusammenhang, keinen Beweis.","pruefen":false},"trend.band":{"wert":1,"einheit":"Streuungen","fundstelle":"eigene Festlegung MF; angelehnt an Plews et al. (2012), a. a. O. (Normalbereich um den gleitenden Mittelwert)","text":"Band = Mittel der Vortage ± {trend.band} × Streuung.","erklaerung":"Das graue Band zeigt deinen Normalbereich der letzten Tage.","pruefen":true},"vergleich.abstand":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF (Gegenüberstellung je Tag; JCGM 100:2008 (GUM), Abschnitt 4.2.1 für das arithmetische Mittel)","text":"Abstand = Wert von MAEHR FIT − Wert von WHOOP am selben Tag. Mittlerer Abstand = Mittel der Beträge aller Tage mit beiden Werten; größte Abweichung = größter Betrag.","erklaerung":"Zeigt nur, wie weit beide Zahlen auseinanderliegen. Welche richtig ist, sagt der Abstand nicht.","pruefen":false},"vergleich.nah.erholung":{"wert":100,"einheit":"Zehntel Punkte","fundstelle":"eigene Festlegung MF","text":"Erholung: nah beieinander, wenn |MF − WHOOP| ≤ {vergleich.nah.erholung} Zehntel Punkte.","erklaerung":"Bei der Erholung (0–100) zählt ein Tag bis 10 Punkte Abstand als „nah beieinander“.","pruefen":true},"vergleich.nah.belastung":{"wert":20,"einheit":"Zehntel Punkte","fundstelle":"eigene Festlegung MF","text":"Belastung: nah beieinander, wenn |MF − WHOOP| ≤ {vergleich.nah.belastung} Zehntel Punkte.","erklaerung":"Bei der Belastung (0–21) zählt ein Tag bis 2 Punkte Abstand als „nah beieinander“.","pruefen":true},"vergleich.nah.schlaf":{"wert":100,"einheit":"Zehntel Punkte","fundstelle":"eigene Festlegung MF","text":"Schlafleistung: nah beieinander, wenn |MF − WHOOP| ≤ {vergleich.nah.schlaf} Zehntel Punkte.","erklaerung":"Bei der Schlafleistung (0–100) zählt ein Tag bis 10 Punkte Abstand als „nah beieinander“.","pruefen":true},"vergleich.fremdwert":{"wert":null,"einheit":"fremdwert","fundstelle":"WHOOP-Datenexport, Datei physiological_cycles.csv (Spalten „Recovery score %“, „Day Strain“, „Sleep performance %“)","text":"Fremdwert aus dem WHOOP-Export, Rechenweg nicht bekannt.","erklaerung":"WHOOP rechnet nach eigenem, nicht veröffentlichtem Verfahren. MAEHR FIT übernimmt die Zahl nur zum Vergleich.","pruefen":false},"zusammenfassung":{"wert":null,"einheit":"formel","fundstelle":"JCGM 100:2008 (GUM), Abschnitt 4.2.1 (arithmetisches Mittel); Wochen nach ISO 8601-1:2019","text":"Je Woche (Montag bis Sonntag) bzw. Kalendermonat: Mittelwert, kleinster und größter Wert, Anzahl Tage je Erholungsstufe.","erklaerung":"Fasst Wochen und Monate zusammen, damit du Entwicklungen auf einen Blick siehst.","pruefen":false},"live.rr.min_ms":{"wert":300,"einheit":"ms","fundstelle":"eigene Festlegung MF; angelehnt an Task Force of the ESC and NASPE (1996), a. a. O., Abschnitt „Artefakte und Ektopien“ (unplausible RR-Abstände vor der Auswertung entfernen); 300 ms entspricht 200 Schlägen/min","text":"Ein RR-Abstand unter {live.rr.min_ms} ms (über 200 Schläge pro Minute) gilt als Messfehler und wird verworfen.","erklaerung":"Sehr kurze Abstände zwischen zwei Schlägen sind fast immer Messfehler, keine echten Herzschläge.","pruefen":true},"live.rr.max_ms":{"wert":2000,"einheit":"ms","fundstelle":"eigene Festlegung MF; angelehnt an Task Force of the ESC and NASPE (1996), a. a. O. (unplausible RR-Abstände entfernen); 2000 ms entspricht 30 Schlägen/min","text":"Ein RR-Abstand über {live.rr.max_ms} ms (unter 30 Schläge pro Minute) gilt als ausgelassener Schlag und wird verworfen.","erklaerung":"Sehr lange Abstände entstehen meist, wenn das Band einen Schlag nicht erkannt hat.","pruefen":true},"live.rr.sprung_promille":{"wert":200,"einheit":"Promille des vorigen RR-Abstands","fundstelle":"Karlsson M, Hörnsten R, Rydberg A, Wiklund U (2012): Automatic filtering of outliers in RR intervals before analysis of heart rate variability in Holter recordings: a comparison with carefully edited data. Biomed Eng Online 11:2 (Prozentfilter, 20 % zum vorigen Abstand); Bezug auf den letzten gültigen Abstand: eigene Festlegung MF","text":"Ein RR-Abstand wird verworfen, wenn er um mehr als {live.rr.sprung_promille|prozent} vom letzten gültigen Abstand abweicht: 1000 × |RR − RR vorher| > {live.rr.sprung_promille} × RR vorher. Unterschiede werden nur zwischen zwei direkt aufeinanderfolgenden gültigen Abständen gebildet.","erklaerung":"Springt der Abstand zwischen zwei Schlägen plötzlich um mehr als ein Fünftel, ist das meist ein Messfehler oder ein Extraschlag – er zählt nicht mit.","pruefen":true},"live.hrv_kurz.fenster":{"wert":60,"einheit":"RR-Abstände","fundstelle":"eigene Festlegung MF (etwa eine Minute); angelehnt an Munoz ML et al. (2015): Validity of (ultra-)short recordings for heart rate variability measurements. PLoS One 10(9):e0138921 (RMSSD aus 30–60 s gut mit 5 min übereinstimmend)","erklaerung":"Die Kurz-HRV wird aus den letzten 60 Herzschlägen gerechnet – etwa eine Minute.","pruefen":true},"live.hrv_kurz.min_differenzen":{"wert":10,"einheit":"Differenzen","fundstelle":"eigene Festlegung MF; angelehnt an Munoz ML et al. (2015), a. a. O. (kürzeste geprüfte Aufnahme 10 s)","erklaerung":"Erst ab 10 gültigen Unterschieden aufeinanderfolgender Schläge wird eine Kurz-HRV angezeigt.","pruefen":true},"live.hrv_kurz":{"wert":null,"einheit":"formel","fundstelle":"Task Force of the ESC and NASPE (1996), a. a. O. (RMSSD); Artefaktfilter nach Karlsson et al. (2012), a. a. O.","text":"Kurz-HRV = Wurzel aus dem Mittel der quadrierten Unterschiede aufeinanderfolgender gültiger RR-Abstände, aus den letzten {live.hrv_kurz.fenster} Abständen; gültig sind Abstände von {live.rr.min_ms} bis {live.rr.max_ms} ms ohne Sprung über {live.rr.sprung_promille|prozent}. In Zehntel-Millisekunden, kaufmännisch gerundet.","erklaerung":"Wie stark die Abstände zwischen deinen Herzschlägen gerade schwanken – gemessen über etwa eine Minute. Ein Augenblickswert, kein Ersatz für die HRV der Nacht.","pruefen":false},"live.kohaerenz.min_zyklen":{"wert":2,"einheit":"Atemzüge","fundstelle":"eigene Festlegung MF","erklaerung":"Die Kohärenz wird erst gerechnet, wenn mindestens zwei ganze Atemzüge mit Herzschlägen vorliegen.","pruefen":true},"live.kohaerenz.max_zyklen":{"wert":6,"einheit":"Atemzüge","fundstelle":"eigene Festlegung MF (gleitendes Fenster, etwa eine Minute bei Resonanzatmung)","erklaerung":"Für die Anzeige zählen höchstens die letzten sechs Atemzüge, damit der Wert schnell auf dich reagiert.","pruefen":true},"live.kohaerenz":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF (vereinfachter Kohärenzwert); Hintergrund: Lehrer PM, Gevirtz R (2014), a. a. O. (bei Resonanzatmung schwingt der Puls im Atemtakt); McCraty R, Atkinson M, Tomasino D, Bradley RT (2009): The coherent heart. Integral Review 5(2):10–115 (Kohärenz als Anteil der Schwingung an einer Frequenz)","text":"Die RR-Abstände der letzten ganzen Atemzüge (mindestens {live.kohaerenz.min_zyklen}, höchstens {live.kohaerenz.max_zyklen}) werden gleichmäßig im Abstand ihres Mittels gelegt. Kohärenz = 100 × (Leistung der Schwingung im Atemtakt) ÷ (gesamte Streuung): a = 2/n × Σ (RR − Mittel) × cos(2π t/T), b = 2/n × Σ (RR − Mittel) × sin(2π t/T), Leistung = (a² + b²) ÷ 2, Streuung = Σ (RR − Mittel)² ÷ n; T = Dauer eines Atemzugs. Begrenzt auf 0 bis 100, ganze Zahl.","erklaerung":"Wie gleichmäßig dein Puls im Takt deines Atems steigt und fällt: 100 heißt, fast die ganze Schwankung folgt dem Atem; 0 heißt, sie hat mit dem Atem nichts zu tun. Eigener, vereinfachter Wert – nicht mit Werten anderer Apps vergleichbar.","pruefen":true},"live.training.min_ms":{"wert":60000,"einheit":"ms","fundstelle":"eigene Festlegung MF (kürzere Live-Aufzeichnungen sind meist Fehlstarts)","erklaerung":"Eine Live-Aufzeichnung wird erst ab einer Minute als Training gespeichert.","pruefen":true},"live.formel_puls":{"wert":null,"einheit":"formel","fundstelle":"Bluetooth SIG: Heart Rate Service Specification 1.0 (2011) und GATT Specification Supplement, Merkmal Heart Rate Measurement 0x2A37 (Flags, 8/16-Bit-Puls, Energie, RR-Abstände in 1/1024 s)","text":"Puls = Wert aus dem Merkmal 0x2A37 des Dienstes Heart Rate 0x180D (Bit 0 der Flags: 16 statt 8 Bit). RR-Abstand in ms = Rohwert × 1000 ÷ 1024, kaufmännisch gerundet.","erklaerung":"So kommt der Puls live vom Band: Das Band sendet etwa einmal pro Sekunde den aktuellen Puls und, wenn es kann, die Abstände zwischen den letzten Herzschlägen.","pruefen":false},"belastung.zonen_aus_prozent":{"wert":null,"einheit":"formel","fundstelle":"eigene Festlegung MF (Schätzung, wenn der Export nur Zonenanteile statt Pulswerte enthält, z. B. WHOOP-CSV „HR Zone 1–5 %“); Kurve und Gewichte wie „belastung“ (Edwards 1993, Banister 1991)","text":"Geschätzt: Für Trainings ohne einzelne Pulswerte gilt Zeit in Zone k = Dauer × Anteil k ÷ 100 (Anteile aus dem Export, ganze Millisekunden). Danach wie gemessen: Zonen-Minuten T = Σ Minuten in Zone k × k, Belastung = {belastung.skala_max} × ln(1 + T ÷ {belastung.kurve.b}) ÷ ln(1 + {belastung.kurve.tmax} ÷ {belastung.kurve.b}), höchstens {belastung.skala_max}, eine Nachkommastelle.","erklaerung":"Dein Export sagt nur, wie viel Prozent des Trainings du in jeder Zone warst. Daraus rechnen wir die Minuten je Zone und dann die Belastung wie sonst auch. Weil die Zonengrenzen des Anbieters etwas anders liegen können, ist das eine Schätzung.","pruefen":true}}} };

// ===== kern/formeln.js
const __m_kern_formeln_js = (() => {
/* kern/formeln.js – Formeln und Konstanten aus kern/formeln/formeln.json.
 *
 * Kernaussage: Jede Zahl, mit der MAEHR FIT rechnet (Gewichte, Grenzen, Zonen, Dauern), steht genau einmal in
 * formeln.json – mit Einheit, Fundstelle und einer Erklärung in einfachem Deutsch. Der Code fragt sie hier ab und
 * hat selbst keine Konstante. Unbekannte Schlüssel brechen sofort ab, damit kein Tippfehler still mit „undefined“
 * weiterrechnet. Unsichere Werte tragen "pruefen": true und lassen sich mit pruefListe() auflisten.
 *
 * Kein DOM, kein Netz, kein Speicher. Die JSON-Datei wird als ES-Modul eingebunden (Import-Attribut, ES2025).
 */
const DATEN = __m_kern_formeln_formeln_json.default;

let EINTRAEGE = DATEN.eintraege;

/** Formelsammlung austauschen (z. B. für Tests oder einen Bündler, der die JSON selbst einsetzt).
 *  @param {{eintraege: Object}} json */
function setzeFormeln(json) {
  if (!json || typeof json.eintraege !== "object") throw new Error("formeln: Objekt mit 'eintraege' erwartet");
  EINTRAEGE = json.eintraege;
}

/** Roh-Eintrag aus formeln.json; wirft bei unbekanntem Schlüssel. */
function eintrag(schluessel) {
  const e = EINTRAEGE[schluessel];
  if (!e) throw new Error("formeln: unbekannter Schlüssel '" + schluessel + "'");
  return e;
}

/** Nur der Wert eines Eintrags (Zahl, Text, Liste oder Objekt). */
const wert = (schluessel) => eintrag(schluessel).wert;

/** Zahl im deutschen Format (Komma), ohne Tausenderpunkt. */
const deZahl = (x) => String(x).replace(".", ",");

/** Platzhalter {schluessel} bzw. {schluessel|prozent} (Promille → %) oder {schluessel|min} (ms → Minuten) im Text ersetzen. */
function fuelle(text) {
  return text.replace(/\{([a-z0-9_.\-]+)(?:\|(prozent|min))?\}/gi, (_, s, f) => {
    const w = wert(s);
    if (f === "prozent") return deZahl(w / 10) + " %";
    if (f === "min") return deZahl(w / 60000);
    return deZahl(w);
  });
}

/**
 * Formel für Ergebnisobjekte und das Belegfenster.
 * @param {string} schluessel
 * @returns {{schluessel:string, text:string, fundstelle:string, wert:any, einheit:string, erklaerung:string, pruefen:boolean}}
 */
function formel(schluessel) {
  const e = eintrag(schluessel);
  return {
    schluessel,
    text: fuelle(e.text ?? e.erklaerung ?? ""),
    fundstelle: e.fundstelle,
    wert: e.wert,
    einheit: e.einheit,
    erklaerung: e.erklaerung ?? "",
    pruefen: !!e.pruefen,
  };
}

/** Alle Schlüssel der Formelsammlung. */
const alleSchluessel = () => Object.keys(EINTRAEGE);

/** Alle Einträge mit "pruefen": true (für die Meldung an Loris). */
const pruefListe = () => alleSchluessel().filter((s) => EINTRAEGE[s].pruefen).map(formel);
return { setzeFormeln, eintrag, wert, formel, alleSchluessel, pruefListe };
})();

// ===== kern/rundung.js
const __m_kern_rundung_js = (() => {
/* kern/rundung.js – die einzige Stelle, an der gerundet wird.
 *
 * Kernaussage: Gerundet wird überall gleich – kaufmännisch nach DIN 1333 (ab der Hälfte vom Betrag her auf).
 * Ganzzahlige Brüche (z. B. Summe ÷ Anzahl) werden exakt mit ganzen Zahlen gerundet, ohne Gleitkomma-Fehler.
 * Fundstelle: formeln.json "rundung.kaufmaennisch".
 */
const { formel } = __m_kern_formeln_js;

const RUNDUNG = "rundung.kaufmaennisch";
/** Formel zur Rundung (für Belegfenster). */
const rundungFormel = () => formel(RUNDUNG);

/**
 * Kaufmännisch runden auf `stellen` Nachkommastellen (DIN 1333).
 * Der Faktor (1 + EPSILON) gleicht Darstellungsfehler wie 1,005 × 100 = 100,4999… aus.
 * @param {number} x
 * @param {number} [stellen=0]
 * @returns {number|null} null bei fehlender oder ungültiger Zahl
 */
function rund(x, stellen = 0) {
  if (typeof x !== "number" || !Number.isFinite(x)) return null;
  const f = 10 ** stellen;
  const r = Math.round(Math.abs(x) * f * (1 + Number.EPSILON)) / f;
  return x < 0 && r !== 0 ? -r : r;
}

/**
 * Ganzzahligen Bruch zaehler ÷ nenner kaufmännisch auf eine ganze Zahl runden – exakt, ohne Gleitkomma.
 * @param {number} zaehler ganze Zahl
 * @param {number} nenner ganze Zahl ≠ 0
 * @returns {number}
 */
function rundBruch(zaehler, nenner) {
  if (!Number.isInteger(zaehler) || !Number.isInteger(nenner) || nenner === 0) throw new Error("rundBruch: ganze Zahlen, Nenner ≠ 0");
  const vz = Math.sign(zaehler) * Math.sign(nenner);
  const z = Math.abs(zaehler), n = Math.abs(nenner);
  const q = Math.floor(z / n), rest = z - q * n;
  const r = 2 * rest >= n ? q + 1 : q;
  return vz < 0 && r !== 0 ? -r : r;
}

/** Wert auf [unten, oben] begrenzen. */
const begrenze = (x, unten, oben) => Math.min(oben, Math.max(unten, x));
return { RUNDUNG, rundungFormel, rund, rundBruch, begrenze };
})();

// ===== kern/zeit.js
const __m_kern_zeit_js = (() => {
/* kern/zeit.js – Tage, Wochen, Dauern.
 *
 * Kernaussage: Ein Tag in MAEHR FIT läuft vom Aufwachen bis zum nächsten Aufwachen. So gehört das späte Training
 * noch zum selben Tag und die Nacht danach zur Erholung des nächsten Morgens. Gibt es keine Schlafdaten, gilt
 * Mitternacht bis Mitternacht in der Zeitzone des Geräts. Zeitumstellungen (23- oder 25-Stunden-Tage) werden über
 * die örtliche Uhrzeit des Geräts richtig behandelt, Kalenderrechnungen laufen über reine Datumsarithmetik.
 *
 * Alle Zeiten als Unix-Millisekunden. Kein DOM, kein Netz, kein Speicher.
 */
const { wert } = __m_kern_formeln_js;
const { rundBruch } = __m_kern_rundung_js;

// SI-Definitionen (keine fachlichen Konstanten): 1 s = 1000 ms, 1 min = 60 s, 1 h = 60 min.
const MS_SEKUNDE = 1000;
const MS_MINUTE = 60 * MS_SEKUNDE;
const MS_STUNDE = 60 * MS_MINUTE;
const MS_KALENDERTAG_UTC = 24 * MS_STUNDE; // nur für reine Datumsrechnung in UTC (ohne Zeitumstellung)

const zwei = (n) => String(n).padStart(2, "0");

/** Ist s ein Tag "JJJJ-MM-TT"? */
const istIsoTag = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function teile(tagIso) {
  if (!istIsoTag(tagIso)) throw new Error("zeit: Tag als 'JJJJ-MM-TT' erwartet, erhalten: " + tagIso);
  return [Number(tagIso.slice(0, 4)), Number(tagIso.slice(5, 7)), Number(tagIso.slice(8, 10))];
}

/** Örtlicher Kalendertag eines Zeitpunkts als "JJJJ-MM-TT". */
function isoTag(ms) {
  const d = new Date(ms);
  return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate());
}

/** Unix-ms der örtlichen Mitternacht (00:00) eines Tages. */
function mitternacht(tagIso) {
  const [j, m, t] = teile(tagIso);
  return new Date(j, m - 1, t).getTime();
}

/** Unix-ms einer örtlichen Uhrzeit: Tag + Minuten seit Mitternacht (Wanduhr; negative Minuten = Vorabend). */
function lokal(tagIso, minuten) {
  const [j, m, t] = teile(tagIso);
  return new Date(j, m - 1, t, 0, minuten).getTime();
}

/** Kalendertag um n Tage verschieben (reine Datumsrechnung, unabhängig von Zeitzone und Zeitumstellung). */
function plusTage(tagIso, n) {
  const [j, m, t] = teile(tagIso);
  const d = new Date(Date.UTC(j, m - 1, t) + n * MS_KALENDERTAG_UTC);
  return d.getUTCFullYear() + "-" + zwei(d.getUTCMonth() + 1) + "-" + zwei(d.getUTCDate());
}

/** Anzahl Kalendertage von a bis b (b − a). */
function tageZwischen(a, b) {
  const [ja, ma, ta] = teile(a), [jb, mb, tb] = teile(b);
  return Math.round((Date.UTC(jb, mb - 1, tb) - Date.UTC(ja, ma - 1, ta)) / MS_KALENDERTAG_UTC);
}

/** Länge des örtlichen Kalendertags in ms (23, 24 oder 25 Stunden bei Zeitumstellung). */
const tagLaengeMs = (tagIso) => mitternacht(plusTage(tagIso, 1)) - mitternacht(tagIso);

/** Wochentag 0 = Montag … 6 = Sonntag. */
function wochentag(tagIso) {
  const [j, m, t] = teile(tagIso);
  return (new Date(Date.UTC(j, m - 1, t)).getUTCDay() + 6) % 7;
}

/** ISO-Kalenderwoche "JJJJ-Www" (ISO 8601-1:2019; formeln.json "zeit.iso_woche"). */
function isoWoche(tagIso) {
  const donnerstag = plusTage(tagIso, 3 - wochentag(tagIso)); // Donnerstag derselben Woche bestimmt das Jahr
  const jahr = Number(donnerstag.slice(0, 4));
  const nr = Math.floor(tageZwischen(jahr + "-01-01", donnerstag) / 7) + 1;
  return jahr + "-W" + zwei(nr);
}

/** Montag der ISO-Woche eines Tages. */
const wochenBeginn = (tagIso) => plusTage(tagIso, -wochentag(tagIso));

/** Kalendermonat "JJJJ-MM". */
const monat = (tagIso) => (teile(tagIso), tagIso.slice(0, 7));

/** Minuten seit örtlicher Mitternacht des Kalendertags von ms (Wanduhr). */
function uhrMinuten(ms) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Dauer als reine Daten: auf ganze Minuten gerundet (kaufmännisch), dann in Stunden und Minuten zerlegt.
 * @param {number} ms
 * @returns {{h:number, min:number, negativ:boolean, gesamtMin:number}}
 */
function dauer(ms) {
  if (!Number.isFinite(ms)) return { h: 0, min: 0, negativ: false, gesamtMin: 0 };
  const gesamt = rundBruch(Math.round(ms), MS_MINUTE);
  const b = Math.abs(gesamt);
  return { h: Math.floor(b / 60), min: b % 60, negativ: gesamt < 0, gesamtMin: gesamt };
}

/** Schlafdauer im Bett (bis − von). */
const imBett = (s) => s.bis - s.von;

/**
 * Hauptschlaf eines Tages: längster Schlaf, der an diesem örtlichen Kalendertag endet und mindestens
 * "zeit.hauptschlaf_min" dauert. Gleich lang → der frühere.
 * @param {string} tagIso
 * @param {Array<{von:number,bis:number}>} schlaefe
 * @returns {object|null}
 */
function hauptschlaf(tagIso, schlaefe = []) {
  const min = wert("zeit.hauptschlaf_min");
  let best = null;
  for (const s of schlaefe) {
    if (!s || !(s.bis > s.von) || isoTag(s.bis) !== tagIso || imBett(s) < min) continue;
    if (!best || imBett(s) > imBett(best) || (imBett(s) === imBett(best) && s.von < best.von)) best = s;
  }
  return best;
}

/**
 * Tagesgrenzen: vom Aufwachen aus dem Hauptschlaf des Tages bis zum Aufwachen am Folgetag (formeln.json
 * "zeit.tagesgrenzen"). Fehlt ein Hauptschlaf, gilt die örtliche Mitternacht. Die Fenster aufeinanderfolgender
 * Tage stoßen lückenlos aneinander.
 * @param {string} tagIso
 * @param {object} [einstellungen] darf `schlaf` (Schlaf[]) tragen
 * @param {Array} [schlaefe] Schlafdatensätze (Vorrang vor einstellungen.schlaf)
 * @returns {{von:number, bis:number, beginn:"aufwachen"|"mitternacht", ende:"aufwachen"|"mitternacht", quellen:Array}}
 */
function tagesgrenzen(tagIso, einstellungen = {}, schlaefe) {
  const liste = schlaefe ?? einstellungen?.schlaf ?? [];
  const heute = hauptschlaf(tagIso, liste), morgen = hauptschlaf(plusTage(tagIso, 1), liste);
  let von = heute ? heute.bis : mitternacht(tagIso);
  let bis = morgen ? morgen.bis : mitternacht(plusTage(tagIso, 1));
  let beginn = heute ? "aufwachen" : "mitternacht", ende = morgen ? "aufwachen" : "mitternacht";
  if (!(bis > von)) { von = mitternacht(tagIso); bis = mitternacht(plusTage(tagIso, 1)); beginn = ende = "mitternacht"; }
  const quellen = [heute, morgen].filter(Boolean).map((s) => s.quelle).filter(Boolean);
  return { von, bis, beginn, ende, quellen };
}
return { MS_SEKUNDE, MS_MINUTE, MS_STUNDE, istIsoTag, isoTag, mitternacht, lokal, plusTage, tageZwischen, tagLaengeMs, wochentag, isoWoche, wochenBeginn, monat, uhrMinuten, dauer, hauptschlaf, tagesgrenzen };
})();

// ===== kern/atem.js
const __m_kern_atem_js = (() => {
/* kern/atem.js – Atemübungen und ihr Zeitplan.
 *
 * Kernaussage: Fünf geführte Atemübungen mit festen Phasen (einatmen, halten, ausatmen, halten). Jede Übung sagt,
 * wie lange jede Phase dauert, wie viele Runden sie ohne eigene Angabe hat und woher sie stammt. atemPlan rechnet
 * daraus den genauen Zeitplan in Millisekunden – die Oberfläche muss nur noch abspielen.
 *
 * Phasen und Fundstellen stehen in formeln.json ("atem.*"). Kein DOM, kein Netz, kein Speicher.
 */
const { formel, wert, eintrag } = __m_kern_formeln_js;
const { rund } = __m_kern_rundung_js;
const { MS_MINUTE } = __m_kern_zeit_js;

/** Namen der Übungen (Reihenfolge der Anzeige). */
const UEBUNGEN = ["box", "vier-sieben-acht", "kohaerenz", "seufzer", "entspannung"];
const PHASEN_ARTEN = ["ein", "halten", "aus", "halten2"];

/**
 * Atemübung laden.
 * @param {string} name einer aus UEBUNGEN
 * @returns {{name:string, phasen:Array<{art:string, ms:number, label:string}>, runden:number, zyklusMs:number, gesamtMs:number,
 *   atemzuegeProMinZehntel:number, fundstelle:string, beschreibung:string, formel:object, pruefen:boolean}}
 */
function atemUebung(name) {
  if (!UEBUNGEN.includes(name)) throw new Error("atem: unbekannte Übung '" + name + "'");
  const schluessel = "atem." + name, e = eintrag(schluessel);
  const phasen = e.wert.phasen.map((p) => ({ art: p.art, ms: p.ms, label: p.label ?? p.art }));
  const zyklusMs = phasen.reduce((a, p) => a + p.ms, 0);
  const runden = e.wert.runden ?? Math.max(1, Math.floor(wert("atem.dauer_standard") / zyklusMs));
  const f = formel(schluessel);
  return {
    name, phasen, runden, zyklusMs, gesamtMs: zyklusMs * runden,
    atemzuegeProMinZehntel: rund((10 * MS_MINUTE) / zyklusMs), // Atemzüge je Minute in Zehnteln (Anzeige)
    fundstelle: f.fundstelle, beschreibung: f.erklaerung, formel: f, pruefen: f.pruefen,
    rundenHerkunft: e.wert.runden ? "fundstelle" : "standarddauer",
  };
}

/**
 * Zeitplan einer Übung: alle Phasen Runde für Runde, Millisekunden ab Start.
 * @param {object|string} uebung Ergebnis von atemUebung oder Name
 * @param {number} [runden] Standard: uebung.runden
 * @returns {Array<{von:number, bis:number, art:string, label:string, runde:number}>}
 */
function atemPlan(uebung, runden) {
  const u = typeof uebung === "string" ? atemUebung(uebung) : uebung;
  const n = runden ?? u.runden;
  if (!Number.isInteger(n) || n < 0) throw new Error("atem: Runden als ganze Zahl ≥ 0 erwartet");
  const plan = [];
  let t = 0;
  for (let r = 1; r <= n; r++) {
    for (const p of u.phasen) { plan.push({ von: t, bis: t + p.ms, art: p.art, label: p.label, runde: r }); t += p.ms; }
  }
  return plan;
}

/** Formel zum Zeitplan (Belegfenster). */
const atemPlanFormel = () => formel("atem.plan");
return { UEBUNGEN, PHASEN_ARTEN, atemUebung, atemPlan, atemPlanFormel };
})();

// ===== kern/quellen.js
const __m_kern_quellen_js = (() => {
/* kern/quellen.js – Quellenlisten für den Prüfpfad.
 *
 * Kernaussage: Jede Zahl trägt die Liste der Datensätze, aus denen sie entstand. Diese Hilfen führen Listen
 * zusammen und entfernen Doppelte (gleiche Art, Kennung, Datei und Zeile), damit das Belegfenster jede Quelle
 * genau einmal zeigt.
 */

/** Schlüssel einer Quelle für den Vergleich. */
const quellSchluessel = (q) => [q.art, q.id, q.datei ?? "", q.zeile ?? ""].join("|");

/**
 * Quellenlisten (oder Einzelquellen) zusammenführen, Reihenfolge des ersten Auftretens, ohne Doppelte.
 * @param {...(Array|object|null|undefined)} listen
 * @returns {Array<object>}
 */
function vereinige(...listen) {
  const gesehen = new Set(), aus = [];
  for (const l of listen) {
    for (const q of Array.isArray(l) ? l : l ? [l] : []) {
      if (!q || typeof q !== "object") continue;
      const k = quellSchluessel(q);
      if (!gesehen.has(k)) { gesehen.add(k); aus.push(q); }
    }
  }
  return aus;
}
return { quellSchluessel, vereinige };
})();

// ===== kern/tagebuch.js
const __m_kern_tagebuch_js = (() => {
/* kern/tagebuch.js – Tagebuch und sein Zusammenhang mit der Erholung.
 *
 * Kernaussage: Im Tagebuch hakst du abends an, was du gemacht hast (z. B. Alkohol, spätes Essen, Meditation).
 * tagebuchWirkung vergleicht dann deine Erholung am Morgen DANACH: an Tagen nach dem Verhalten und an Tagen ohne.
 * Erst ab 5 Tagen je Gruppe gilt der Vergleich als aussagekräftig. Er zeigt einen Zusammenhang, keinen Beweis.
 *
 * Kein DOM, kein Netz, kein Speicher. Beschriftungen über kern/i18n.js ("tagebuch.<schluessel>").
 */
const { formel, wert } = __m_kern_formeln_js;
const { rund } = __m_kern_rundung_js;
const { plusTage } = __m_kern_zeit_js;
const { vereinige } = __m_kern_quellen_js;

/** Katalog der Tagebuch-Fragen. art "ja_nein" (true/false) oder "zahl" (z. B. Getränke; > 0 zählt als „mit“). */
const KATALOG = [
  { schluessel: "alkohol", art: "ja_nein" },
  { schluessel: "koffein_spaet", art: "ja_nein" },
  { schluessel: "bildschirm_spaet", art: "ja_nein" },
  { schluessel: "spaete_mahlzeit", art: "ja_nein" },
  { schluessel: "meditation", art: "ja_nein" },
  { schluessel: "atemuebung", art: "ja_nein" },
  { schluessel: "kaltdusche", art: "ja_nein" },
  { schluessel: "sauna", art: "ja_nein" },
  { schluessel: "lesen", art: "ja_nein" },
  { schluessel: "stress", art: "ja_nein" },
  { schluessel: "krank", art: "ja_nein" },
  { schluessel: "reisen", art: "ja_nein" },
];
const SCHLUESSEL = KATALOG.map((k) => k.schluessel);

/** Fragetext → Schlüssel: "Did you drink alcohol?" → "did_you_drink_alcohol" (gleiche Regel wie daten/csv_import.js frageSchluessel). */
const textSchluessel = (text) => String(text ?? "").toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/**
 * WHOOP-Fragetext → Schlüssel des Katalogs (KATALOG), wenn die Bedeutung eindeutig dieselbe ist; sonst null.
 * Verneinte Fragen („Kein Alkohol …“, „No caffeine …“) werden nie zugeordnet (die Antwort hätte die umgekehrte Bedeutung).
 * Nicht zugeordnet bleiben z. B. „Koffein konsumiert?“ (ohne Tageszeit; MF fragt nach Koffein am Nachmittag) und alle Fragen ohne
 * Gegenstück; sie bleiben unter ihrem eigenen Schlüssel im Datensatz erhalten (docs/technik/datenfluss.md, Abschnitt Tagebuch).
 */
function katalogSchluessel(fragetext) {
  const k = textSchluessel(fragetext);
  if (!k || /(^|_)(kein|keine|keinen|keiner|ohne|no|not|without|nicht)(_|$)/.test(k)) return null;
  const ohneNichtBildschirm = k.replace(/non_?screened/g, "").replace(/(ohne|nicht)_bildschirm\w*/g, "");
  const hat = (re, text = k) => re.test(text);
  if (hat(/(^|_)(read|reading|lesen|gelesen)(_|$)/) && hat(/(bed|bett|sleep|schlaf)/) && !hat(/(screen|bildschirm|tablet|handy|phone)/, ohneNichtBildschirm)) return "lesen";
  if (hat(/(screen|bildschirm|handy|phone|tablet|fernseh|(^|_)tv(_|$))/, ohneNichtBildschirm) && hat(/(bed|bett|schlaf|sleep)/)) return "bildschirm_spaet";
  if (hat(/(alkohol|alcohol)/)) return "alkohol";
  if (hat(/(koffein|caffeine|kaffee|coffee)/) && hat(/(spaet|late|nachmittag|afternoon|abend|evening|(^|_)after(_|$))/)) return "koffein_spaet";
  if (hat(/(^|_)(eat|ate|eaten|essen|gegessen|mahlzeit|meal)(_|$)/) && hat(/(bedtime|schlafengehen|close_to_bed|before_bed|before_sleep|kurz_vor|(^|_)(late|spaet)(_|$))/)) return "spaete_mahlzeit";
  if (hat(/medit/)) return "meditation";
  if (hat(/(kaltdusche|cold_shower|cold_bath|cold_plunge|ice_bath|eisbad|kalt\w*_gedusch|kalt\w*_gebadet)/)) return "kaltdusche";
  if (hat(/sauna/)) return "sauna";
  if (hat(/(breathwork|breathing_exercise|atemuebung|atemtechnik)/)) return "atemuebung";
  if (hat(/stress/)) return "stress";
  if (hat(/(^|_)(sick|ill|krank|unwohl|unwell|erkaeltet)(_|$)/)) return "krank";
  if (hat(/(travel|reise|gereist|unterwegs)/)) return "reisen";
  return null;
}

/**
 * Tagebuch-Datensatz des Imports (WHOOP-Fragen unter eigenen Schlüsseln, `fragen[schluessel]` = Fragetext) um die Katalogschlüssel
 * ergänzen. Beim Lesen angewendet, damit auch schon eingelesene Daten zählen. Mehrere Fragen auf denselben Schlüssel: ein „Ja“ gilt.
 * Ein schon vorhandener Eintrag unter dem Katalogschlüssel (vom Nutzer gesetzt) hat Vorrang.
 * @returns {object} Kopie des Datensatzes (unverändert, wenn es nichts zuzuordnen gibt)
 */
function mitKatalog(eintrag) {
  if (!eintrag || !eintrag.fragen || !eintrag.eintraege) return eintrag;
  const neu = {};
  for (const [k, text] of Object.entries(eintrag.fragen)) {
    const kat = katalogSchluessel(text);
    const v = eintrag.eintraege[k];
    if (!kat || typeof v !== "boolean" || kat === k || eintrag.eintraege[kat] !== undefined) continue;
    neu[kat] = neu[kat] === true ? true : v;
  }
  return Object.keys(neu).length ? { ...eintrag, eintraege: { ...eintrag.eintraege, ...neu } } : eintrag;
}

/** Eintrag deuten: true / Zahl > 0 → "mit", false / 0 → "ohne", sonst null (nicht erfasst). */
function gruppe(v) {
  if (v === true || (typeof v === "number" && v > 0)) return "mit";
  if (v === false || v === 0) return "ohne";
  return null;
}

/** Einträge eines Tages lesen: Tag-Objekt mit tagebuch {eintraege}, Tagebuch-Datensatz oder {eintraege}. */
const eintraegeVon = (t) => t?.tagebuch?.eintraege ?? t?.eintraege ?? null;
const quelleVon = (t) => t?.tagebuch?.quelle ?? t?.quelle ?? null;
/** Erholungswert eines Tages: Zahl oder {wert}. */
const erholungVon = (t) => (typeof t?.erholung === "number" ? t.erholung : t?.erholung?.wert);

/**
 * Mittlere Erholung am Folgetag mit und ohne Verhalten.
 * @param {Array<{tag:string, erholung:number|{wert:number}, tagebuch?:{eintraege:Object}}>} tage
 * @param {string} schluessel
 * @returns {{schluessel:string, mit:{mittel:number|null,n:number}, ohne:{mittel:number|null,n:number}, differenz:number|null,
 *   aussagekraeftig:boolean, minN:number, hinweis:string, hinweisSchluessel:string, paare:object[], formel:object, quellen:object[]}}
 */
function tagebuchWirkung(tage, schluessel) {
  const minN = wert("tagebuch.min_n");
  const nachTag = new Map((tage || []).filter((t) => t && t.tag).map((t) => [t.tag, t]));
  const summen = { mit: [0, 0], ohne: [0, 0] }, paare = [], quellen = [];
  for (const t of nachTag.values()) {
    const e = erholungVon(t);
    if (!Number.isFinite(e)) continue;
    const vortag = nachTag.get(plusTage(t.tag, -1));
    const g = gruppe(eintraegeVon(vortag)?.[schluessel]);
    if (!g) continue;
    summen[g][0] += e; summen[g][1] += 1;
    paare.push({ tagVerhalten: vortag.tag, tagErholung: t.tag, erholung: e, gruppe: g });
    quellen.push(quelleVon(vortag), t.erholung?.quellen);
  }
  const m = (g) => ({ mittel: summen[g][1] ? rund(summen[g][0] / summen[g][1], 1) : null, n: summen[g][1] });
  const mit = m("mit"), ohne = m("ohne");
  const differenz = mit.n && ohne.n ? rund(mit.mittel - ohne.mittel, 1) : null;
  const aussagekraeftig = mit.n >= minN && ohne.n >= minN;
  return { schluessel, mit, ohne, differenz, aussagekraeftig, minN, ...hinweis(mit, ohne, differenz, aussagekraeftig, minN), paare, formel: formel("tagebuch.wirkung"), quellen: vereinige(...quellen) };
}

/** Hinweistext (Deutsch) und i18n-Schlüssel; beschreibt nur, rät nichts. */
function hinweis(mit, ohne, differenz, ok, minN) {
  const schluss = " Das zeigt einen Zusammenhang, keinen Beweis.";
  if (!ok) {
    return { hinweisSchluessel: "tagebuch.hinweis.zu_wenig",
      hinweis: `Noch zu wenige Tage für einen Vergleich: je Gruppe braucht es mindestens ${minN} (mit: ${mit.n}, ohne: ${ohne.n}).` + schluss };
  }
  const betrag = String(Math.abs(differenz)).replace(".", ",");
  const richtung = differenz > 0 ? "höher" : differenz < 0 ? "niedriger" : "gleich hoch";
  const satz = differenz === 0 ? "Deine Erholung am Morgen danach war im Mittel gleich hoch."
    : `Deine Erholung am Morgen danach war im Mittel ${betrag} Punkte ${richtung}.`;
  return { hinweisSchluessel: "tagebuch.hinweis.vergleich", hinweis: satz + schluss };
}
return { KATALOG, SCHLUESSEL, katalogSchluessel, mitKatalog, gruppe, tagebuchWirkung };
})();

// ===== kern/belastung.js
const __m_kern_belastung_js = (() => {
/* kern/belastung.js – Belastung 0 bis 21.
 *
 * Kernaussage: Die Belastung zählt, wie lange und wie hoch dein Puls über den Tag war. Jeder Pulswert fällt in eine
 * von fünf Zonen – gemessen an deinem Spielraum zwischen Ruhe- und Maximalpuls (Karvonen 1957). Minuten in hohen
 * Zonen zählen mehr (Zone 5 fünffach, Edwards 1993). Die Summe wird auf die Skala 0 bis 21 gebracht, und zwar so,
 * dass doppelte Anstrengung weniger als doppelt so viele Punkte bringt (logarithmische Kurve, eigene Festlegung).
 *
 * Ohne einzelne Pulswerte (WHOOP-CSV: nur Anteile je Zone und Dauer) wird die Zeit je Zone aus Dauer × Anteil geschätzt und
 * genauso weitergerechnet; das Ergebnis trägt dann geschaetzt: true, grund "zonen_aus_prozent" (formeln.json
 * "belastung.zonen_aus_prozent").
 *
 * Ganzzahlig: Zeiten in ms, Zonenvergleich als ganzzahlige Ungleichung, Ergebnis in ganzen Zehnteln.
 * Kein DOM, kein Netz, kein Speicher.
 */
const { formel, wert } = __m_kern_formeln_js;
const { rund, rundBruch } = __m_kern_rundung_js;
const { MS_MINUTE } = __m_kern_zeit_js;
const { vereinige } = __m_kern_quellen_js;

/**
 * Maximalpuls aus dem Alter (Tanaka 2001): 208 − 0,7 × Alter, ganzzahlig in Zehnteln gerechnet.
 * @param {number} alter ganze Jahre
 * @returns {{bpm:number, formel:object}|null}
 */
function maxPulsTanaka(alter) {
  if (!Number.isInteger(alter) || alter <= 0) return null;
  const { a_zehntel, b_zehntel } = wert("puls.max.tanaka");
  return { bpm: rundBruch(a_zehntel - b_zehntel * alter, 10), formel: formel("puls.max.tanaka") };
}

/**
 * Untergrenzen der Zonen 1–5 in Schlägen/min (zur Anzeige; gerechnet wird mit der exakten Ungleichung in zoneVon).
 * @returns {Array<{zone:number, prozent:number, abBpm:number}>}
 */
function zonenGrenzen(maxPuls, ruhepuls) {
  const reserve = maxPuls - ruhepuls;
  return wert("belastung.zonen").map((p, i) => ({ zone: i + 1, prozent: p, abBpm: rund(ruhepuls + (p * reserve) / 100, 1) }));
}

/**
 * Zone eines Pulswerts (0 = unter Zone 1). Zone k, wenn 100 × (Puls − Ruhe) ≥ Grenze_k × (Max − Ruhe).
 * @returns {number} 0..5
 */
function zoneVon(bpm, maxPuls, ruhepuls) {
  const reserve = maxPuls - ruhepuls, links = 100 * (bpm - ruhepuls);
  const grenzen = wert("belastung.zonen");
  let z = 0;
  for (let k = 0; k < grenzen.length; k++) if (links >= grenzen[k] * reserve) z = k + 1;
  return z;
}

/** Pulsreihe prüfen und nach Zeit sortieren (Kopie). */
const sortiert = (hs) => (hs || []).filter((h) => h && Number.isFinite(h.t) && Number.isFinite(h.bpm)).slice().sort((a, b) => a.t - b.t);

/**
 * Zeit je Zone: jeder Wert gilt bis zum nächsten, höchstens "belastung.luecke_max_ms"; der letzte zählt 0.
 * @param {Array<{t:number,bpm:number,quelle?:object}>} herzschlaege
 * @returns {{zonen:Array<{zone:number, ms:number, quelle:object[]}>, ohneZoneMs:number}}
 */
function zeitInZonen(herzschlaege, maxPuls, ruhepuls) {
  const hs = sortiert(herzschlaege), luecke = wert("belastung.luecke_max_ms");
  const zonen = wert("belastung.zonen").map((_, i) => ({ zone: i + 1, ms: 0, quelle: [] }));
  const quellen = zonen.map(() => []);
  let ohneZoneMs = 0;
  for (let i = 0; i + 1 < hs.length; i++) {
    const ms = Math.min(luecke, hs[i + 1].t - hs[i].t);
    if (ms <= 0) continue;
    const z = zoneVon(hs[i].bpm, maxPuls, ruhepuls);
    if (z === 0) { ohneZoneMs += ms; continue; }
    zonen[z - 1].ms += ms;
    quellen[z - 1].push(hs[i].quelle);
  }
  zonen.forEach((z, i) => { z.quelle = vereinige(quellen[i]); });
  return { zonen, ohneZoneMs };
}

/**
 * Zeit je Zone aus Anteilen (WHOOP-CSV „HR Zone 1–5 %“): ms Zone k = rund(Dauer × Anteil k ÷ 100); der Rest der Dauer zählt
 * unter Zone 1. Quelle jeder Zone mit Zeit ist die Trainingszeile.
 * @param {number[]} zonenProzent Anteile Zone 1–5 in Prozent (null/leer = 0)
 * @param {number} dauerMs
 * @param {object} [quelle]
 * @returns {{zonen:Array<{zone:number, ms:number, quelle:object[]}>, ohneZoneMs:number}}
 */
function zeitAusProzent(zonenProzent, dauerMs, quelle) {
  const zonen = wert("belastung.zonen").map((_, i) => {
    const p = Number(zonenProzent?.[i]);
    const ms = Number.isFinite(p) && p > 0 && dauerMs > 0 ? rund((dauerMs * p) / 100) : 0;
    return { zone: i + 1, ms, quelle: ms > 0 && quelle ? [quelle] : [] };
  });
  const summe = zonen.reduce((a, z) => a + z.ms, 0);
  return { zonen, ohneZoneMs: Math.max(0, (dauerMs > 0 ? dauerMs : 0) - summe) };
}

/** Hat das Training brauchbare Pulswerte (mindestens zwei, dann gibt es eine Dauer)? */
const hatProben = (hs) => sortiert(hs).length >= 2;
/** Anteile je Zone vorhanden und Dauer positiv? */
const hatProzent = (x) => Array.isArray(x?.zonenProzent) && x.zonenProzent.some((p) => Number(p) > 0) && Number.isFinite(x.von) && Number.isFinite(x.bis) && x.bis > x.von;

/**
 * Zeit je Zone eines Trainings: aus den Pulswerten, sonst aus den Zonenanteilen (geschätzt).
 * @returns {{zonen:Array, ohneZoneMs:number, geschaetzt:boolean}}
 */
function zeitTraining(x, maxPuls, ruhepuls) {
  if (!hatProben(x.herzschlaege) && hatProzent(x)) return { ...zeitAusProzent(x.zonenProzent, x.bis - x.von, x.quelle), geschaetzt: true };
  return { ...zeitInZonen(x.herzschlaege, maxPuls, ruhepuls), geschaetzt: false };
}

/** Kennzeichen für geschätzte Ergebnisse; die Formel erklärt den Weg (ersetzt "belastung", der Kurventeil ist derselbe). */
const SCHAETZUNG = () => ({ geschaetzt: true, grund: "zonen_aus_prozent", formel: formel("belastung.zonen_aus_prozent"), formelGemessen: formel("belastung") });

/** Zonen-Millisekunden gewichtet: Σ ms × Gewicht (ganzzahlig). */
function trimpMs(zonen) {
  const g = wert("belastung.gewichte");
  return zonen.reduce((a, z) => a + z.ms * g[z.zone - 1], 0);
}

/**
 * Kurve Zonen-Minuten → Belastung in ganzen Zehnteln (formeln.json "belastung").
 * Zehntel = rund(10 × S × ln(1 + T/b) / ln(1 + Tmax/b)), höchstens 10 × S.
 * @param {number} tMs gewichtete Zonen-Millisekunden
 * @returns {number} 0..210
 */
function kurveZehntel(tMs) {
  if (!(tMs > 0)) return 0;
  const S = wert("belastung.skala_max"), b = wert("belastung.kurve.b"), tmax = wert("belastung.kurve.tmax");
  const T = tMs / MS_MINUTE;
  return Math.min(10 * S, rund((10 * S * Math.log(1 + T / b)) / Math.log(1 + tmax / b)));
}

/** Ergebnisobjekt aus Zonen bauen. */
function ergebnis(zonen, ohneZoneMs, extra = {}) {
  const t = trimpMs(zonen), wertZehntel = kurveZehntel(t);
  return {
    wert: wertZehntel / 10, wertZehntel, zonenMinuten: rund(t / MS_MINUTE, 1), trimpMs: t, zonen, ohneZoneMs,
    formel: formel("belastung"), zonenFormel: formel("belastung.karvonen"),
    quellen: vereinige(...zonen.map((z) => z.quelle)), ...extra,
  };
}

/** Prüfen, ob Max- und Ruhepuls brauchbar sind. */
const pulsOk = (maxPuls, ruhepuls) => Number.isFinite(maxPuls) && Number.isFinite(ruhepuls) && maxPuls > ruhepuls;

/**
 * Belastung einer Pulsreihe (z. B. eines Trainings). Ohne Pulswerte, aber mit zonenProzent und von/bis: geschätzt.
 * @param {{herzschlaege:Array, maxPuls:number, ruhepuls:number, zonenProzent?:number[], von?:number, bis?:number, quelle?:object}} arg
 * @returns {object|null} null, wenn Max-/Ruhepuls fehlen
 */
function belastung({ herzschlaege, maxPuls, ruhepuls, zonenProzent, von, bis, quelle } = {}) {
  if (!pulsOk(maxPuls, ruhepuls)) return null;
  const { zonen, ohneZoneMs, geschaetzt } = zeitTraining({ herzschlaege, zonenProzent, von, bis, quelle }, maxPuls, ruhepuls);
  return ergebnis(zonen, ohneZoneMs, { maxPuls, ruhepuls, grenzen: zonenGrenzen(maxPuls, ruhepuls), geschaetzt: false, ...(geschaetzt ? SCHAETZUNG() : {}) });
}

/**
 * Belastung eines Tages: Zonenzeiten aller Trainings plus Alltag (Alltag ohne Trainingszeiten), dann einmal die
 * Kurve. Die Tagesbelastung ist daher nicht die Summe der Trainingswerte. Trainings ohne Pulswerte mit zonenProzent
 * zählen geschätzt (zeitAusProzent); dann tragen sie und der Tag geschaetzt: true.
 * @param {Array<{von:number,bis:number,art?:string,herzschlaege:Array,zonenProzent?:number[],quelle?:object}>} trainings
 * @param {Array} alltag Herzschlag[] außerhalb der Trainings
 * @param {{maxPuls:number, ruhepuls:number}} puls
 * @returns {object|null}
 */
function belastungTag(trainings = [], alltag = [], { maxPuls, ruhepuls } = {}) {
  const tr = (trainings || []).filter(Boolean);
  // Ohne Max-/Ruhepuls geht es nur, wenn alles aus Zonenanteilen kommt (WHOOP-CSV): dann braucht die Rechnung keine Pulsgrenzen.
  const nurAnteile = tr.length > 0 && !(alltag || []).length && tr.every((x) => !hatProben(x.herzschlaege) && hatProzent(x));
  if (!pulsOk(maxPuls, ruhepuls) && !nurAnteile) return null;
  const imTraining = (t) => tr.some((x) => t >= x.von && t <= x.bis);
  const teile = tr.map((x) => ({ ...zeitTraining(x, maxPuls, ruhepuls), training: x }));
  teile.push({ ...zeitInZonen((alltag || []).filter((h) => h && !imTraining(h.t)), maxPuls, ruhepuls), geschaetzt: false, training: null });
  const zonen = wert("belastung.zonen").map((_, i) => ({
    zone: i + 1,
    ms: teile.reduce((a, p) => a + p.zonen[i].ms, 0),
    quelle: vereinige(...teile.map((p) => p.zonen[i].quelle)),
  }));
  const ohneZoneMs = teile.reduce((a, p) => a + p.ohneZoneMs, 0);
  const einzel = teile.filter((p) => p.training).map((p) => ergebnis(p.zonen, p.ohneZoneMs, {
    art: p.training.art ?? null, von: p.training.von, bis: p.training.bis,
    quellen: vereinige(p.training.quelle, p.training.weitereQuellen, ...p.zonen.map((z) => z.quelle)),
    geschaetzt: false, ...(p.geschaetzt ? SCHAETZUNG() : {}),
  }));
  return ergebnis(zonen, ohneZoneMs, {
    maxPuls, ruhepuls, grenzen: pulsOk(maxPuls, ruhepuls) ? zonenGrenzen(maxPuls, ruhepuls) : null, trainings: einzel,
    geschaetzt: false, ...(teile.some((p) => p.geschaetzt) ? SCHAETZUNG() : {}),
    alltagZonenMinuten: rund(trimpMs(teile.at(-1).zonen) / MS_MINUTE, 1),
    quellen: vereinige(...tr.map((x) => x.quelle), ...tr.map((x) => x.weitereQuellen), ...zonen.map((z) => z.quelle)),
  });
}
return { maxPulsTanaka, zonenGrenzen, zoneVon, zeitInZonen, zeitAusProzent, trimpMs, kurveZehntel, belastung, belastungTag };
})();

// ===== kern/basislinie.js
const __m_kern_basislinie_js = (() => {
/* kern/basislinie.js – persönlicher Normalbereich.
 *
 * Kernaussage: Die Basislinie ist dein eigener Normalwert: Mittelwert und übliche Schwankung (Streuung) der
 * vergangenen 7 oder 30 Tage. Der betrachtete Tag selbst zählt nicht mit, damit er sich mit seiner Vorgeschichte
 * vergleichen lässt. Gibt es zu wenige Tage, wird zwar gerechnet, aber `genug` ist falsch. HRV wird vorher
 * logarithmiert, weil ihre Werte nach oben stärker ausschlagen als nach unten (Shaffer & Ginsberg 2017).
 *
 * Eingabe in ganzen Einheiten (z. B. Zehntel-ms); Summen exakt ganzzahlig, Mittel und Streuung über rund()
 * (DIN 1333) auf "basis.stellen" Nachkommastellen. Kein DOM, kein Netz, kein Speicher.
 */
const { formel, wert } = __m_kern_formeln_js;
const { rund } = __m_kern_rundung_js;
const { isoTag, plusTage, istIsoTag } = __m_kern_zeit_js;
const { vereinige } = __m_kern_quellen_js;

/** Tag eines Messwerts: `tag` oder aus `t` (örtlich). */
const tagVon = (w) => (istIsoTag(w.tag) ? w.tag : Number.isFinite(w.t) ? isoTag(w.t) : null);

/**
 * Mittel und Stichproben-Streuung (n − 1, JCGM 100:2008 Gl. 4) einer Zahlenliste.
 * Ganze Zahlen werden exakt summiert; die Streuung zweistufig (erst Mittel, dann Abstände).
 * @param {number[]} xs
 * @returns {{mittel:number|null, streuung:number|null, n:number}}
 */
function mittelUndStreuung(xs) {
  const n = xs.length;
  if (n === 0) return { mittel: null, streuung: null, n };
  let summe = 0;
  for (const x of xs) summe += x;
  const mittel = summe / n;
  if (n === 1) return { mittel, streuung: null, n };
  let q = 0;
  for (const x of xs) q += (x - mittel) * (x - mittel);
  return { mittel, streuung: Math.sqrt(q / (n - 1)), n };
}

/**
 * Rollende Basislinie.
 * @param {Array<{tag?:string, t?:number, wert:number, quelle?:object, quellen?:object[]}>} werte ganze Einheiten
 * @param {object} [opt]
 * @param {number} [opt.tage]   Fenster in Kalendertagen (Standard "basis.fenster.lang")
 * @param {string} [opt.bis]    erster Tag NACH dem Fenster (exklusiv); Standard: Tag nach dem letzten Wert
 * @param {boolean} [opt.ln]    natürlichen Logarithmus nehmen ("basis.hrv_ln")
 * @param {number} [opt.teiler] Einheitenteiler vor dem ln (z. B. 10 für Zehntel-ms → ms)
 * @param {number} [opt.minN]   Mindestanzahl (Standard "basis.min_n")
 * @returns {{mittel:number|null, streuung:number|null, n:number, genug:boolean, minN:number, von:string|null, bis:string|null, ln:boolean, teiler:number, quellen:object[], formel:object}}
 */
function basislinie(werte, opt = {}) {
  const tage = opt.tage ?? wert("basis.fenster.lang");
  const minN = opt.minN ?? wert("basis.min_n");
  const ln = !!opt.ln, teiler = opt.teiler ?? 1;
  const stellen = wert("basis.stellen");
  const gueltig = (werte || []).filter((w) => w && Number.isFinite(w.wert) && tagVon(w) && (!ln || w.wert > 0));
  let bis = opt.bis ?? null;
  if (!bis && gueltig.length) bis = plusTage(gueltig.map(tagVon).sort().at(-1), 1);
  const von = bis ? plusTage(bis, -tage) : null;
  const imFenster = bis ? gueltig.filter((w) => { const d = tagVon(w); return d >= von && d < bis; }) : [];
  const xs = imFenster.map((w) => (ln ? Math.log(w.wert / teiler) : w.wert));
  const s = mittelUndStreuung(xs);
  return {
    mittel: s.mittel === null ? null : rund(s.mittel, stellen),
    streuung: s.streuung === null ? null : rund(s.streuung, stellen),
    n: s.n, genug: s.n >= minN && s.streuung !== null, minN, tage, von, bis, ln, teiler,
    quellen: vereinige(...imFenster.map((w) => w.quellen ?? w.quelle)),
    formel: formel(ln ? "basis.hrv_ln" : "basis.mittel"),
  };
}

/**
 * z-Wert gegen eine Basislinie (formeln.json "statistik.z"), Streuung mindestens `untergrenze`.
 * @param {number} x Wert in derselben Skala wie die Basislinie (bei ln schon logarithmiert)
 * @returns {number|null}
 */
function zWert(x, basis, untergrenze = 0) {
  if (!basis || basis.mittel === null || basis.streuung === null || !Number.isFinite(x)) return null;
  const s = Math.max(basis.streuung, untergrenze);
  return s > 0 ? (x - basis.mittel) / s : null;
}
return { mittelUndStreuung, basislinie, zWert };
})();

// ===== kern/erholung.js
const __m_kern_erholung_js = (() => {
/* kern/erholung.js – Erholung 0 bis 100.
 *
 * Kernaussage: Die Erholung vergleicht die letzte Nacht mit deinem persönlichen Normalbereich der vergangenen
 * 30 Tage. 50 Punkte heißt: ein für dich ganz üblicher Morgen. Eine höhere HRV, ein niedrigerer Ruhepuls und ein gut
 * gedeckter Schlafbedarf heben den Wert; eine auffällige Atemfrequenz, Hauttemperatur oder Sauerstoffsättigung
 * zieht Punkte ab. Jeder Teil steht mit Messwert, Normalbereich, Gewicht und Beitrag im Ergebnis (`teile`).
 *
 * Rechenweg (formeln.json "erholung"): z-Werte je Teil, gewichtet, × Punkte je Streuung, + Mitte, − Abzüge,
 * begrenzt auf 0..100 und kaufmännisch gerundet. Messwerte in ganzen Einheiten (Zehntel-ms, Zehntel-Atemzüge,
 * Zehntel-Prozent, Hundertstel-°C). Beschreibt Messwerte, stellt keine Diagnose. Kein DOM, kein Netz, kein Speicher.
 */
const { formel, wert } = __m_kern_formeln_js;
const { rund, begrenze } = __m_kern_rundung_js;
const { zWert } = __m_kern_basislinie_js;
const { vereinige } = __m_kern_quellen_js;

/** Rohdatensatz-Felder und Einheitenfaktor je Teil (Faktor aus formeln.json "einheit.*"). */
const ROH = {
  hrv: { feld: "rmssdMs", faktor: () => wert("einheit.hrv") },
  ruhepuls: { feld: "bpm", faktor: () => 1 },
  atem: { feld: "proMin", faktor: () => wert("einheit.atem") },
  spo2: { feld: "prozent", faktor: () => wert("einheit.spo2") },
  hauttemp: { feld: "deltaC", faktor: () => wert("einheit.hauttemp") },
};

/**
 * Messwert vereinheitlichen: Zahl (schon ganze Einheit), {wert, quellen} oder Rohdatensatz (z. B. {rmssdMs, quelle}).
 * @returns {{wert:number, quelle:object[]}|null}
 */
function messwert(x, teil) {
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? { wert: x, quelle: [] } : null;
  const roh = ROH[teil];
  if (roh && Number.isFinite(x[roh.feld]) && !Number.isFinite(x.wert)) {
    return { wert: rund(x[roh.feld] * roh.faktor()), quelle: vereinige(x.quelle) };
  }
  if (!Number.isFinite(x.wert)) return null;
  return { wert: x.wert, quelle: vereinige(x.quellen, x.quelle) };
}

/** Stufe zum Wert (formeln.json "erholung.stufe.*"). */
function stufe(w) {
  if (!Number.isFinite(w)) return null;
  if (w >= wert("erholung.stufe.gruen")) return "gruen";
  if (w <= wert("erholung.stufe.rot")) return "rot";
  return "gelb";
}

const basisKurz = (b) => (b ? { mittel: b.mittel, streuung: b.streuung, n: b.n, genug: b.genug, ln: b.ln } : null);
const ausgelassen = (name, roh, grund, schluessel) => ({ name, wert: roh?.wert ?? null, basis: null, z: null, gewicht: 0, beitrag: 0, quelle: roh?.quelle ?? [], ausgelassen: true, grund, formel: formel(schluessel) });

/** Hauptteil HRV: z aus ln(RMSSD in ms). */
function teilHrv(roh, basis) {
  const k = "erholung.gewicht.hrv";
  if (!roh) return ausgelassen("hrv", null, "kein_messwert", k);
  if (!basis?.genug) return ausgelassen("hrv", roh, "basis_zu_klein", k);
  const x = Math.log(roh.wert / wert("einheit.hrv"));
  return { name: "hrv", wert: roh.wert, x: rund(x, wert("basis.stellen")), basis: basisKurz(basis), z: zWert(x, basis, wert("erholung.streuung_min").hrv), richtung: 1, quelle: roh.quelle, formel: formel(k) };
}

/** Hauptteil Ruhepuls: umgekehrt – niedriger als üblich ist positiv. */
function teilRuhepuls(roh, basis) {
  const k = "erholung.gewicht.ruhepuls";
  if (!roh) return ausgelassen("ruhepuls", null, "kein_messwert", k);
  if (!basis?.genug) return ausgelassen("ruhepuls", roh, "basis_zu_klein", k);
  return { name: "ruhepuls", wert: roh.wert, basis: basisKurz(basis), z: zWert(roh.wert, basis, wert("erholung.streuung_min").ruhepuls), richtung: -1, quelle: roh.quelle, formel: formel(k) };
}

/** Hauptteil Schlaf: Schlafleistung gegen festes Ziel und feste Skala. */
function teilSchlaf(roh) {
  const k = "erholung.gewicht.schlaf";
  if (!roh) return ausgelassen("schlaf", null, "kein_messwert", k);
  const z = (roh.wert - wert("erholung.schlaf.ziel")) / wert("erholung.schlaf.skala");
  return { name: "schlaf", wert: roh.wert, basis: { mittel: wert("erholung.schlaf.ziel"), streuung: wert("erholung.schlaf.skala"), n: null, genug: true, ln: false }, z, richtung: 1, quelle: roh.quelle, formel: formel("erholung.schlaf.ziel") };
}

/** Abzug Atemfrequenz: Punkte × max(0, |z| − Schwelle). */
function abzugAtem(roh, basis) {
  const k = "erholung.atem.strafe_je_z";
  if (!roh) return ausgelassen("atem", null, "kein_messwert", k);
  if (!basis?.genug) return ausgelassen("atem", roh, "basis_zu_klein", k);
  const z = zWert(roh.wert, basis, wert("erholung.streuung_min").atem);
  const ueber = Math.max(0, Math.abs(z) - wert("erholung.atem.schwelle_z"));
  return { name: "atem", wert: roh.wert, basis: basisKurz(basis), z, gewicht: 0, beitrag: rund(-wert(k) * ueber, 1), abzug: true, quelle: roh.quelle, formel: formel(k) };
}

/** Abzug Hauttemperatur: Punkte je °C über der Schwelle (Abweichung kommt schon relativ zur Basis). */
function abzugHauttemp(roh) {
  const k = "erholung.hauttemp.strafe_je_grad";
  if (!roh) return ausgelassen("hauttemp", null, "kein_messwert", k);
  const ueber = Math.max(0, Math.abs(roh.wert) - wert("erholung.hauttemp.schwelle"));
  return { name: "hauttemp", wert: roh.wert, basis: null, z: null, gewicht: 0, beitrag: rund(-(wert(k) * ueber) / wert("einheit.hauttemp"), 1), abzug: true, quelle: roh.quelle, formel: formel(k) };
}

/** Abzug Sauerstoffsättigung: Punkte je Prozentpunkt unter der Schwelle. */
function abzugSpo2(roh) {
  const k = "erholung.spo2.strafe_je_prozent";
  if (!roh) return ausgelassen("spo2", null, "kein_messwert", k);
  const unter = Math.max(0, wert("erholung.spo2.schwelle") - roh.wert);
  return { name: "spo2", wert: roh.wert, basis: null, z: null, gewicht: 0, beitrag: rund(-(wert(k) * unter) / wert("einheit.spo2"), 1), abzug: true, quelle: roh.quelle, formel: formel(k) };
}

/**
 * Erholung eines Morgens.
 * @param {object} arg
 * @param {*} arg.hrv       nächtliche HRV (Zehntel-ms, {wert, quellen} oder Hrv-Datensatz)
 * @param {*} arg.ruhepuls  Ruhepuls (Schläge/min)
 * @param {*} arg.schlaf    Schlafleistung 0..100 (Zahl oder Ergebnis von schlafLeistung)
 * @param {*} [arg.atem]    Atemfrequenz (Zehntel/min)
 * @param {*} [arg.hauttemp] Abweichung der Hauttemperatur (Hundertstel °C)
 * @param {*} [arg.spo2]    Sauerstoffsättigung (Zehntel %)
 * @param {{hrv?:object, ruhepuls?:object, atem?:object}} arg.basis Basislinien (HRV logarithmiert)
 * @returns {{wert:number|null, stufe:string|null, roh:number|null, teile:object[], formel:object, quellen:object[], grund?:string}}
 */
function erholung({ hrv, ruhepuls, schlaf, atem, hauttemp, spo2, basis = {} } = {}) {
  const grenze = wert("erholung.z_grenze"), punkte = wert("erholung.punkte_je_z");
  const haupt = [
    teilHrv(messwert(hrv, "hrv"), basis.hrv),
    teilRuhepuls(messwert(ruhepuls, "ruhepuls"), basis.ruhepuls),
    teilSchlaf(messwert(schlaf, "schlaf")),
  ];
  const gewichte = { hrv: wert("erholung.gewicht.hrv"), ruhepuls: wert("erholung.gewicht.ruhepuls"), schlaf: wert("erholung.gewicht.schlaf") };
  const da = haupt.filter((t) => !t.ausgelassen && t.z !== null);
  const summeW = da.reduce((a, t) => a + gewichte[t.name], 0);
  for (const t of haupt) {
    if (t.ausgelassen || t.z === null) continue;
    t.z = begrenze(t.z, -grenze, grenze);
    t.gewicht = rund(gewichte[t.name] / summeW, 4);           // Anteil nach Hochrechnung auf 100 %
    t.beitrag = rund((punkte * t.richtung * t.z * gewichte[t.name]) / summeW, 1);
    t.z = rund(t.z, 4);
  }
  const abzuege = [abzugAtem(messwert(atem, "atem"), basis.atem), abzugHauttemp(messwert(hauttemp, "hauttemp")), abzugSpo2(messwert(spo2, "spo2"))];
  for (const a of abzuege) if (a.z !== null && a.z !== undefined) a.z = rund(a.z, 4);
  const teile = [...haupt, ...abzuege];
  const quellen = vereinige(...teile.map((t) => t.quelle));
  const physio = da.some((t) => t.name === "hrv" || t.name === "ruhepuls");
  if (!physio) return { wert: null, stufe: null, roh: null, teile, formel: formel("erholung"), quellen, grund: "zu_wenig_daten" };
  const roh = rund(wert("erholung.mitte") + teile.reduce((a, t) => a + (t.beitrag || 0), 0), 1);
  const w = begrenze(rund(roh), 0, 100);
  return { wert: w, stufe: stufe(w), roh, teile, formel: formel("erholung"), quellen };
}
return { messwert, stufe, erholung };
})();

// ===== kern/schlaf.js
const __m_kern_schlaf_js = (() => {
/* kern/schlaf.js – Schlafleistung und Schlafbedarf.
 *
 * Kernaussage: Die Schlafleistung sagt, wie viel von deinem Schlafbedarf du in der Nacht tatsächlich geschlafen
 * hast (Wachphasen zählen nicht). Der Schlafbedarf beginnt beim Grundbedarf von 8 Stunden und wächst nach einem
 * anstrengenden Tag und nach zu kurzen Nächten; ein Nickerchen senkt ihn. Dazu kommen zwei Begleitwerte: die
 * Effizienz (wie viel der Bettzeit Schlaf war) und die Regelmäßigkeit der Einschlafzeit.
 *
 * Alle Dauern in ganzen Millisekunden, Anteile in Promille, Prozent ganzzahlig über rundBruch (DIN 1333).
 */
const { formel, wert } = __m_kern_formeln_js;
const { rundBruch } = __m_kern_rundung_js;
const { uhrMinuten } = __m_kern_zeit_js;
const { vereinige } = __m_kern_quellen_js;

const PHASEN = ["wach", "leicht", "tief", "rem"];
const MINUTEN_HALBER_TAG = 12 * 60; // Wanduhr: 12 h, um Einschlafzeiten um Mitternacht zu zentrieren

/** Nicht negative endliche Zahl? */
const istMs = (x) => Number.isFinite(x) && x >= 0;

/**
 * Phasen zusammenfassen. Quellen der Phasenzeiten, in dieser Reihenfolge:
 *  1. Zeitachse `phasen` (Health Connect): Summe je Art.
 *  2. Summen je Phase `phasenSummen { wachMs, leichtMs, tiefMs, remMs }` (WHOOP-CSV, daten/csv_import.js): ohne Zeitachse.
 *  3. Nur `schlafMs` (geschlafene Zeit laut Export): Dauer ohne Phasen.
 *  4. Sonst die Zeit im Bett.
 * Die Dauer ist immer die geschlafene Zeit (leicht + tief + REM), nie die Bettzeit, sobald Phasen oder `schlafMs` bekannt sind.
 * @param {{von:number, bis:number, phasen?:Array<{von:number,bis:number,art:string}>, phasenSummen?:object, schlafMs?:number}} schlaf
 * @returns {{imBettMs:number, dauerMs:number, phasen:{wach:number,leicht:number,tief:number,rem:number}, anteile:Object, mitPhasen:boolean}}
 */
function schlafZusammenfassung(schlaf) {
  const imBettMs = Math.max(0, schlaf.bis - schlaf.von);
  const p = { wach: 0, leicht: 0, tief: 0, rem: 0 };
  const liste = Array.isArray(schlaf.phasen) ? schlaf.phasen : [];
  for (const ph of liste) if (ph && p[ph.art] !== undefined && ph.bis > ph.von) p[ph.art] += ph.bis - ph.von;
  let mitPhasen = liste.length > 0;
  if (!mitPhasen && schlaf.phasenSummen && typeof schlaf.phasenSummen === "object") {
    const s = schlaf.phasenSummen;
    const summen = { wach: s.wachMs, leicht: s.leichtMs, tief: s.tiefMs, rem: s.remMs };
    if (summen.leicht + summen.tief + summen.rem > 0 && [summen.leicht, summen.tief, summen.rem].every(istMs)) {
      for (const a of PHASEN) p[a] = istMs(summen[a]) ? Math.round(summen[a]) : 0;
      mitPhasen = true;
    }
  }
  const dauerMs = mitPhasen ? p.leicht + p.tief + p.rem : istMs(schlaf.schlafMs) && schlaf.schlafMs > 0 ? Math.min(Math.round(schlaf.schlafMs), imBettMs || Math.round(schlaf.schlafMs)) : imBettMs;
  const summe = p.wach + p.leicht + p.tief + p.rem;
  const anteile = {};
  for (const a of PHASEN) anteile[a] = summe > 0 ? rundBruch(p[a] * 1000, summe) : 0;
  return { imBettMs, dauerMs, phasen: p, anteile, mitPhasen };
}

/** Einschlafzeit in Minuten relativ zur örtlichen Mitternacht, zentriert: 23:30 → −30, 00:45 → +45. */
function einschlafMinute(schlaf) {
  const m = uhrMinuten(schlaf.von);
  return m >= MINUTEN_HALBER_TAG ? m - 2 * MINUTEN_HALBER_TAG : m;
}

/**
 * Konsistenz: Abweichung der Einschlafzeit vom Mittel früherer Nächte (formeln.json "schlaf.konsistenz.grenze").
 * @param {object} schlaf heutige Nacht
 * @param {object[]} vorher frühere Hauptschlafphasen (höchstens "basis.fenster.kurz" werden genutzt)
 * @returns {null|{wert:number, abweichungMin:number, mittelMin:number, n:number, formel:object}}
 */
function schlafKonsistenz(schlaf, vorher = []) {
  const fenster = wert("basis.fenster.kurz");
  const fruehere = (vorher || []).filter((s) => s && s.bis > s.von && s.von < schlaf.von)
    .sort((a, b) => b.von - a.von).slice(0, fenster);
  if (!fruehere.length) return null;
  const summe = fruehere.reduce((a, s) => a + einschlafMinute(s), 0);
  const mittelMin = rundBruch(summe, fruehere.length);
  const abweichungMin = Math.abs(einschlafMinute(schlaf) - mittelMin);
  const grenze = wert("schlaf.konsistenz.grenze");
  const w = Math.max(0, 100 - rundBruch(abweichungMin * 100, grenze));
  return { wert: w, abweichungMin, mittelMin, n: fruehere.length, formel: formel("schlaf.konsistenz.grenze") };
}

/**
 * Schlafleistung einer Nacht.
 * @param {object} arg
 * @param {object} arg.schlaf   Schlaf-Datensatz {von, bis, phasen, quelle}
 * @param {number|{ms:number}} arg.bedarf  Schlafbedarf in ms oder Ergebnis von schlafBedarf
 * @param {object[]} [arg.vorher] frühere Hauptschlafphasen für die Konsistenz
 * @returns {null|{wert:number, dauerMs:number, imBettMs:number, bedarfMs:number, schuld:number, phasen:Object, anteile:Object,
 *   effizienz:null|{promille:number, gut:boolean, formel:object}, konsistenz:object|null, formel:object, quellen:object[]}}
 */
function schlafLeistung({ schlaf, bedarf, vorher = [] } = {}) {
  if (!schlaf || !(schlaf.bis > schlaf.von)) return null;
  const z = schlafZusammenfassung(schlaf);
  const bedarfMs = typeof bedarf === "number" ? bedarf : bedarf?.ms ?? wert("schlaf.bedarf.basis");
  const w = bedarfMs > 0 ? Math.min(100, rundBruch(z.dauerMs * 100, bedarfMs)) : 100;
  const effizienz = z.mitPhasen && z.imBettMs > 0
    ? (() => { const promille = rundBruch(z.dauerMs * 1000, z.imBettMs); return { promille, gut: promille >= wert("schlaf.effizienz.gut"), formel: formel("schlaf.effizienz.gut") }; })()
    : null;
  return {
    wert: w, dauerMs: z.dauerMs, imBettMs: z.imBettMs, bedarfMs, schuld: Math.max(0, bedarfMs - z.dauerMs),
    phasen: z.phasen, anteile: z.anteile, effizienz, konsistenz: schlafKonsistenz(schlaf, vorher),
    formel: formel("schlaf.leistung"), quellen: vereinige(schlaf.quelle, schlaf.weitereQuellen, bedarf?.quellen),
  };
}

/**
 * Schlafschuld aus früheren Nächten (formeln.json "schlaf.schuld.fenster"): Summe (Bedarf − Dauer), nicht unter 0.
 * @param {Array<{bedarfMs:number, dauerMs:number}>} naechte die jüngsten zuerst oder zuletzt – es zählen die letzten `fenster` Einträge
 * @returns {number} ms
 */
function schlafSchuld(naechte = []) {
  const fenster = wert("schlaf.schuld.fenster");
  const liste = naechte.filter((n) => n && Number.isFinite(n.bedarfMs) && Number.isFinite(n.dauerMs)).slice(-fenster);
  return Math.max(0, liste.reduce((a, n) => a + n.bedarfMs - n.dauerMs, 0));
}

/** Belastung als ganze Zehntel lesen: Zahl 0..21, Ergebnis von belastung() oder {wertZehntel}. */
function belastungZehntel(b) {
  if (b === null || b === undefined) return 0;
  if (typeof b === "number") return Math.round(b * 10);
  if (Number.isInteger(b.wertZehntel)) return b.wertZehntel;
  return Number.isFinite(b.wert) ? Math.round(b.wert * 10) : 0;
}

/** Nickerchen als ms: Zahl oder Schlaf[] (Summe der geschlafenen Zeit). */
function nickerchenMs(n) {
  if (!n) return 0;
  if (typeof n === "number") return Math.max(0, n);
  return n.reduce((a, s) => a + schlafZusammenfassung(s).dauerMs, 0);
}

/**
 * Schlafbedarf der kommenden Nacht (formeln.json "schlaf.bedarf").
 * @param {object} arg
 * @param {number} [arg.basis] Grundbedarf in ms (Standard "schlaf.bedarf.basis")
 * @param {number|object} [arg.belastungGestern] Belastung des Vortags (0..21 oder Ergebnis von belastung)
 * @param {number} [arg.schuld] Schlafschuld in ms
 * @param {number|object[]} [arg.nickerchen] Nickerchen des Vortags (ms oder Schlaf[])
 * @returns {{ms:number, teile:Array<{name:string, ms:number, formel:object}>, formel:object, quellen:object[]}}
 */
function schlafBedarf({ basis, belastungGestern, schuld = 0, nickerchen } = {}) {
  const basisMs = Number.isFinite(basis) ? basis : wert("schlaf.bedarf.basis");
  const bz = belastungZehntel(belastungGestern);
  const teile = [
    { name: "basis", ms: basisMs, formel: formel("schlaf.bedarf.basis") },
    { name: "belastung", ms: rundBruch(bz * wert("schlaf.bedarf.je_belastung"), 10), formel: formel("schlaf.bedarf.je_belastung") },
    { name: "schuld", ms: rundBruch(Math.max(0, Math.round(schuld)) * wert("schlaf.bedarf.schuld_anteil"), 1000), formel: formel("schlaf.bedarf.schuld_anteil") },
    { name: "nickerchen", ms: nickerchenMs(nickerchen) > 0 ? -nickerchenMs(nickerchen) : 0, formel: formel("schlaf.bedarf") },
  ];
  const ms = Math.max(0, teile.reduce((a, t) => a + t.ms, 0));
  const quellen = vereinige(belastungGestern?.quellen, Array.isArray(nickerchen) ? nickerchen.map((s) => s.quelle) : null);
  return { ms, teile, formel: formel("schlaf.bedarf"), quellen };
}
return { PHASEN, schlafZusammenfassung, einschlafMinute, schlafKonsistenz, schlafLeistung, schlafSchuld, schlafBedarf };
})();

// ===== kern/trend.js
const __m_kern_trend_js = (() => {
/* kern/trend.js – Verläufe, Wochen und Monate.
 *
 * Kernaussage: Ein Trend zeigt einen Wert Tag für Tag zusammen mit deinem Normalbereich der Tage davor (graues
 * Band = Mittel ± eine übliche Schwankung). Wochen- und Monatszusammenfassungen verdichten die Tage auf Mittelwert,
 * kleinsten und größten Wert und zählen die Tage je Erholungsstufe.
 *
 * Eingabe: Tag-Objekte aus kern/tag.js. Kein DOM, kein Netz, kein Speicher.
 */
const { formel, wert } = __m_kern_formeln_js;
const { rund } = __m_kern_rundung_js;
const { basislinie, mittelUndStreuung } = __m_kern_basislinie_js;
const { isoWoche, monat, wochenBeginn, plusTage } = __m_kern_zeit_js;
const { vereinige } = __m_kern_quellen_js;

/** Lesbare Felder eines Tag-Objekts: Wert und Quellen. */
const FELDER = {
  erholung: { wert: (t) => t.erholung?.wert, quellen: (t) => t.erholung?.quellen },
  belastung: { wert: (t) => t.belastung?.wert, quellen: (t) => t.belastung?.quellen },
  schlaf: { wert: (t) => t.schlaf?.wert, quellen: (t) => t.schlaf?.quellen },
  schlafdauer: { wert: (t) => t.schlaf?.dauerMs, quellen: (t) => t.schlaf?.quellen },
  bedarf: { wert: (t) => t.bedarf?.ms, quellen: (t) => t.bedarf?.quellen },
  hrv: { wert: (t) => t.messwerte?.hrv?.wert, quellen: (t) => t.messwerte?.hrv?.quellen },
  ruhepuls: { wert: (t) => t.messwerte?.ruhepuls?.wert, quellen: (t) => t.messwerte?.ruhepuls?.quellen },
  atem: { wert: (t) => t.messwerte?.atem?.wert, quellen: (t) => t.messwerte?.atem?.quellen },
};

function feldVon(feld) {
  const f = FELDER[feld];
  if (!f) throw new Error("trend: unbekanntes Feld '" + feld + "'");
  return f;
}

const sortiert = (tage) => (tage || []).filter((t) => t && t.tag).slice().sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

/**
 * Verlauf eines Feldes mit Normalbereich aus den `fenster` Tagen davor.
 * @param {object[]} tage Tag-Objekte
 * @param {string} feld Schlüssel aus FELDER
 * @param {{fenster?:number}} [opt] Standard "basis.fenster.kurz"
 * @returns {Array<{tag:string, wert:number|null, basis:{mittel:number|null, streuung:number|null, n:number, genug:boolean, unten:number|null, oben:number|null}, quellen:object[]}>}
 */
function trend(tage, feld, { fenster } = {}) {
  const f = feldVon(feld), fen = fenster ?? wert("basis.fenster.kurz"), band = wert("trend.band");
  const liste = sortiert(tage);
  const werte = liste.map((t) => ({ tag: t.tag, wert: f.wert(t), quellen: f.quellen(t) })).filter((w) => Number.isFinite(w.wert));
  return liste.map((t) => {
    const b = basislinie(werte, { tage: fen, bis: t.tag });
    const mit = b.streuung !== null && b.mittel !== null;
    const w = f.wert(t);
    return {
      tag: t.tag, wert: Number.isFinite(w) ? w : null,
      basis: { mittel: b.mittel, streuung: b.streuung, n: b.n, genug: b.genug,
        unten: mit ? rund(b.mittel - band * b.streuung, 1) : null, oben: mit ? rund(b.mittel + band * b.streuung, 1) : null },
      quellen: vereinige(f.quellen(t)),
    };
  });
}
/** Formel zum Band (Belegfenster). */
const trendFormel = () => formel("trend.band");

/** Kennzahlen einer Werteliste: Mittel (1 Nachkommastelle), min, max, n. */
function kennzahlen(xs) {
  const ys = xs.filter(Number.isFinite);
  const s = mittelUndStreuung(ys);
  return { mittel: s.mittel === null ? null : rund(s.mittel, 1), min: ys.length ? Math.min(...ys) : null, max: ys.length ? Math.max(...ys) : null, n: ys.length };
}

/** Tage nach Schlüssel gruppieren und zusammenfassen. */
function zusammenfassen(tage, schluesselVon, grenzenVon) {
  const gruppen = new Map();
  for (const t of sortiert(tage)) {
    const k = schluesselVon(t.tag);
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(t);
  }
  return [...gruppen.entries()].map(([k, ts]) => {
    const stufen = { gruen: 0, gelb: 0, rot: 0 };
    for (const t of ts) if (stufen[t.erholung?.stufe] !== undefined) stufen[t.erholung.stufe] += 1;
    return {
      schluessel: k, ...grenzenVon(ts), tage: ts.length,
      erholung: kennzahlen(ts.map(FELDER.erholung.wert)),
      belastung: kennzahlen(ts.map(FELDER.belastung.wert)),
      schlaf: kennzahlen(ts.map(FELDER.schlaf.wert)),
      schlafdauerMs: kennzahlen(ts.map(FELDER.schlafdauer.wert)),
      trainings: ts.reduce((a, t) => a + (t.belastung?.trainings?.length ?? 0), 0),
      stufen, formel: formel("zusammenfassung"),
    };
  });
}

/** Wochen (ISO 8601, Montag–Sonntag). @returns {object[]} je Woche {woche, von, bis, tage, erholung, belastung, schlaf, schlafdauerMs, trainings, stufen} */
function wochenZusammenfassung(tage) {
  return zusammenfassen(tage, isoWoche, (ts) => { const von = wochenBeginn(ts[0].tag); return { von, bis: plusTage(von, 6) }; })
    .map((w) => ({ woche: w.schluessel, ...w }));
}

/** Kalendermonate. @returns {object[]} je Monat {monat, tage, erholung, …} */
function monatsZusammenfassung(tage) {
  return zusammenfassen(tage, monat, (ts) => ({ von: ts[0].tag, bis: ts.at(-1).tag })).map((m) => ({ monat: m.schluessel, ...m }));
}
return { FELDER, trend, trendFormel, wochenZusammenfassung, monatsZusammenfassung };
})();

// ===== kern/speicher.js
const __m_kern_speicher_js = (() => {
/* kern/speicher.js – Schnittstelle zum Speicher.
 *
 * Kernaussage: Der Kern speichert nie selbst. Wer etwas ablegen will, reicht ein Objekt mit drei Methoden herein:
 * lesen, schreiben, Schlüssel auflisten. Die Shell liefert dafür IndexedDB (shell/speicher_browser.js), die Tests
 * eine einfache Map aus dieser Datei. Daten bleiben so immer beim Nutzer, und der Kern bleibt ohne Nebenwirkungen.
 *
 * Vertrag (docs/technik/schnittstellen.md):
 *   speicher = {
 *     lies(schluessel)          -> Promise<any>        // undefined, wenn nichts abgelegt ist
 *     schreib(schluessel, wert) -> Promise<void>       // Wert muss strukturiert klonbar sein (JSON-artig)
 *     liste(praefix)            -> Promise<String[]>   // alle Schlüssel, die mit praefix beginnen, sortiert
 *   }
 * Schlüssel-Konvention: SCHLUESSEL unten (z. B. "tagebuch:2026-10-30").
 */

/** Empfohlene Schlüssel. */
const SCHLUESSEL = {
  einstellungen: "einstellungen",
  tagebuch: (tagIso) => "tagebuch:" + tagIso,
  tag: (tagIso) => "tag:" + tagIso,
  import: (id) => "import:" + id,
};

const METHODEN = ["lies", "schreib", "liste"];

/** Erfüllt s die Schnittstelle? */
const istSpeicher = (s) => !!s && METHODEN.every((m) => typeof s[m] === "function");

/** Tiefe Kopie, damit gespeicherte Werte nicht von außen verändert werden. */
const kopie = (w) => (w === undefined ? undefined : structuredClone(w));

/**
 * Speicher im Arbeitsspeicher (für Tests und als Rückfall ohne IndexedDB).
 * @param {Object<string, any>} [anfang] Startinhalt
 * @returns {{lies:Function, schreib:Function, liste:Function, groesse:Function}}
 */
function speicherMap(anfang = {}) {
  const m = new Map(Object.entries(anfang).map(([k, v]) => [k, kopie(v)]));
  const pruefe = (k) => { if (typeof k !== "string" || !k) throw new Error("speicher: Schlüssel als nicht leerer Text erwartet"); };
  return {
    async lies(schluessel) { pruefe(schluessel); return kopie(m.get(schluessel)); },
    async schreib(schluessel, wert) { pruefe(schluessel); m.set(schluessel, kopie(wert)); },
    async liste(praefix = "") { return [...m.keys()].filter((k) => k.startsWith(praefix)).sort(); },
    groesse: () => m.size,
  };
}
return { SCHLUESSEL, METHODEN, istSpeicher, speicherMap };
})();

// ===== kern/demo.js
const __m_kern_demo_js = (() => {
/* kern/demo.js – erfundene Messwerte der „Musterperson“.
 *
 * Kernaussage: Damit die App ohne echte Gesundheitsdaten vorgeführt und getestet werden kann, erzeugt diese Datei
 * 90 Tage glaubwürdige, aber vollständig erfundene Messwerte einer Musterperson (32 Jahre). Gleicher Startwert
 * (seed) → exakt dieselben Daten. Eingebaut sind typische Muster: unter der Woche früher auf, am Wochenende länger
 * Schlaf, 2–4 Trainings je Woche, an manchen Abenden Alkohol (niedrigere HRV am Morgen danach) und eine Woche krank.
 *
 * Alle Datensätze in der Form aus docs/technik/schnittstellen.md, quelle {art: "demo", id}. Die Zahlen hier sind
 * Spielwerte zur Erzeugung (keine Rechenkonstanten der Auswertung) und stehen deshalb nicht in formeln.json.
 */
const { lokal, plusTage, wochentag, MS_MINUTE, MS_SEKUNDE } = __m_kern_zeit_js;
const { rund } = __m_kern_rundung_js;
const { maxPulsTanaka } = __m_kern_belastung_js;
const { SCHLUESSEL: TAGEBUCH } = __m_kern_tagebuch_js;

/** Musterperson (erfunden). */
const MUSTERPERSON = { name: "Musterperson", alter: 32, ruhepulsBasis: 57, hrvBasisMs: 58, atemBasis: 14.4, spo2Basis: 96.8 };

/**
 * Zufallszahlen mit Startwert: mulberry32 (gemeinfrei, T. Ettinger). Liefert [0, 1).
 * @param {number} seed
 */
function zufall(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.normal = (m = 0, s = 1) => { const u = 1 - r(), v = r(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  r.ja = (p) => r() < p;
  r.zwischen = (a2, b2) => a2 + Math.floor(r() * (b2 - a2 + 1));
  return r;
}

/** Fisher-Yates-Mischen (deterministisch mit r, in jeder JS-Umgebung gleich). */
function mische(r, liste) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Trainingsarten mit Spielwerten: Dauer (min), Anteil Pulsreserve, Wirkung auf ln HRV in der Nacht danach. */
const ARTEN = {
  laufen: { dauer: [35, 55], hrr: 0.70, hrvLn: -0.05 },
  intervalle: { dauer: [40, 45], hrr: 0.62, hrvLn: -0.09 },
  kraft: { dauer: [45, 60], hrr: 0.52, hrvLn: -0.03 },
  rad: { dauer: [75, 110], hrr: 0.64, hrvLn: -0.08 },
};

/** Pulsreihe eines Trainings (alle 10 s). */
function trainingsPuls(r, art, von, minuten, ruhe, max, quelle) {
  const hs = [], schritte = (minuten * MS_MINUTE) / (10 * MS_SEKUNDE), res = max - ruhe;
  for (let i = 0; i <= schritte; i++) {
    const min = (i * 10) / 60;
    let p = ARTEN[art].hrr;
    if (art === "intervalle" && min >= 10 && min < 35) p = (min - 10) % 5 < 3 ? 0.88 : 0.6;
    if (art === "kraft" && Math.floor(min) % 6 < 1) p = 0.66;
    const anlauf = Math.min(1, min / 5), auslauf = Math.min(1, (minuten - min) / 4);
    const ziel = ruhe + 25 + (p * res - 25) * Math.min(anlauf, auslauf + 0.2);
    hs.push({ t: von + i * 10 * MS_SEKUNDE, bpm: Math.max(ruhe, rund(r.normal(ziel, 3))), quelle });
  }
  return hs;
}

/** Alltagspuls eines Tages (alle 2 min, aktive Abschnitte alle 30 s), ohne Trainingszeiten. */
function alltagsPuls(r, tag, aufMin, bettMin, ruhe, max, wochenende, krank, training, quelle) {
  const hs = [], abschnitte = [];
  if (!wochenende && !krank && r.ja(0.6)) abschnitte.push([8 * 60, 8 * 60 + 20, 0.5], [17 * 60 + 30, 17 * 60 + 50, 0.52]); // Rad zur Arbeit
  if (wochenende && !krank && r.ja(0.5)) abschnitte.push([15 * 60, 15 * 60 + 45, 0.42]);                                  // Spaziergang
  if (!krank) for (let k = 0; k < 3; k++) { const a = r.zwischen(aufMin + 60, Math.max(aufMin + 61, bettMin - 120)); abschnitte.push([a, a + 3, 0.5]); } // Treppen, Wege
  const aktiv = (m) => abschnitte.find(([a, b]) => m >= a && m < b);
  for (let m = aufMin; m < bettMin;) {
    const t = lokal(tag, m);
    const ab = aktiv(m);
    if (!(training && t >= training.von && t <= training.bis)) {
      const ziel = ab ? ruhe + ab[2] * (max - ruhe) + 10 : ruhe + 16 + (krank ? 8 : 0);
      hs.push({ t, bpm: rund(r.normal(ziel, ab ? 4 : 6)), quelle });
    }
    m += ab ? 0.5 : 2;
  }
  return hs;
}

/** Schlafphasen in Zyklen von etwa 90 Minuten. */
function phasen(r, von, bis, alkohol) {
  const ph = [];
  let t = von;
  const add = (art, min) => { const ende = Math.min(bis, t + rund(min * MS_MINUTE)); if (ende > t) ph.push({ von: t, bis: ende, art }); t = ende; };
  add("wach", alkohol ? r.zwischen(4, 8) : r.zwischen(8, 18));
  for (let z = 0; t < bis; z++) {
    add("leicht", r.zwischen(20, 30));
    add("tief", Math.max(5, 35 - z * 8 + r.zwischen(-4, 4) - (alkohol && z > 1 ? 5 : 0)));
    add("leicht", r.zwischen(10, 18));
    add("rem", Math.min(40, 10 + z * 7 + r.zwischen(-3, 3) - (alkohol ? 6 : 0)));
    if (r.ja(alkohol ? 0.55 : 0.25)) add("wach", r.zwischen(2, 7));
  }
  return ph;
}

/**
 * Demodaten erzeugen.
 * @param {{tage?:number, seed?:number, bis?:string}} [opt] bis = letzter Tag (Standard 2026-10-30)
 * @returns {{person:object, einstellungen:object, herzschlag:object[], hrv:object[], ruhepuls:object[], atemfrequenz:object[],
 *   spo2:object[], hauttemp:object[], schlaf:object[], training:object[], tagebuch:object[]}}
 */
function demoDaten({ tage = 90, seed = 20261030, bis = "2026-10-30" } = {}) {
  const r = zufall(seed), P = MUSTERPERSON, max = maxPulsTanaka(P.alter).bpm;
  const start = plusTage(bis, -(tage - 1));
  const krankVon = tage >= 30 ? Math.floor(tage * 0.6) : -1;
  const istKrank = (i) => i >= krankVon && i < krankVon + 7 && krankVon >= 0;
  const D = { herzschlag: [], hrv: [], ruhepuls: [], atemfrequenz: [], spo2: [], hauttemp: [], schlaf: [], training: [], tagebuch: [] };
  const q = (id) => ({ art: "demo", id: "demo-" + id });

  // Trainingstage je Woche: 2–4 zufällig gewählte Tage
  const plan = new Map();
  for (let i = 0; i < tage; i++) {
    const tag = plusTage(start, i);
    if (wochentag(tag) !== 0 && i !== 0) continue;
    const anzahl = r.zwischen(2, 4), tageDerWoche = mische(r, [0, 2, 4, 5, 6, 1, 3]).slice(0, anzahl);
    for (const w of tageDerWoche) { const d = plusTage(tag, w - wochentag(tag)); if (d >= start) plan.set(d, true); }
  }

  let vorabend = { alkohol: false, bildschirm: false, mahlzeit: false, meditation: false, stress: false, hrvLn: 0, bettMin: -60 };
  for (let i = 0; i < tage; i++) {
    const tag = plusTage(start, i), wt = wochentag(tag), wochenende = wt >= 5, krank = istKrank(i);
    // --- Nacht, die am Morgen von `tag` endet ---
    const aufMin = krank ? r.zwischen(500, 560) : wochenende ? rund(r.normal(525, 35)) : rund(r.normal(405, 8));
    const bettMin = vorabend.bettMin, nVon = lokal(tag, bettMin), nBis = lokal(tag, aufMin);
    const ph = phasen(r, nVon, nBis, vorabend.alkohol);
    D.schlaf.push({ von: nVon, bis: nBis, phasen: ph, quelle: q("schlaf-" + tag) });
    const lnHrv = Math.log(P.hrvBasisMs) + 0.04 * Math.sin(i / 9) + r.normal(0, 0.08) + vorabend.hrvLn
      + (vorabend.alkohol ? -0.2 : 0) + (vorabend.mahlzeit ? -0.04 : 0) + (vorabend.stress ? -0.05 : 0) + (vorabend.meditation ? 0.03 : 0) + (krank ? -0.25 : 0);
    for (let k = 1; k <= 3; k++) {
      D.hrv.push({ t: nVon + rund(((nBis - nVon) * k) / 4), rmssdMs: rund(Math.exp(lnHrv + r.normal(0, 0.05)), 1), quelle: q(`hrv-${tag}-${k}`) });
    }
    const rhr = P.ruhepulsBasis + r.normal(0, 1.3) + (vorabend.alkohol ? 4 : 0) + (vorabend.mahlzeit ? 1.5 : 0) + (vorabend.hrvLn < -0.06 ? 1.5 : 0) + (krank ? 6 : 0);
    D.ruhepuls.push({ t: nBis - 60 * MS_MINUTE, bpm: rund(rhr), quelle: q("ruhepuls-" + tag) });
    const mitte = nVon + rund((nBis - nVon) / 2);
    D.atemfrequenz.push({ t: mitte, proMin: rund(P.atemBasis + r.normal(0, 0.3) + (krank ? 1.8 : 0) + (vorabend.alkohol ? 0.4 : 0), 1), quelle: q("atem-" + tag) });
    D.spo2.push({ t: mitte, prozent: Math.min(99.5, rund(P.spo2Basis + r.normal(0, 0.5) - (krank ? 1.6 : 0), 1)), quelle: q("spo2-" + tag) });
    D.hauttemp.push({ t: mitte, deltaC: rund(r.normal(0, 0.12) + (krank ? 0.6 + 0.3 * Math.sin(((i - krankVon) / 6) * Math.PI) : 0) + (vorabend.alkohol ? 0.15 : 0), 2), quelle: q("hauttemp-" + tag) });

    // --- Tag ---
    const ruhe = rund(rhr);
    let training = null, hrvLn = 0;
    if (plan.get(tag) && !krank && !istKrank(i + 1)) {
      const art = wochenende ? (r.ja(0.6) ? "rad" : "laufen") : ["laufen", "intervalle", "kraft"][r.zwischen(0, 2)];
      const min = r.zwischen(...ARTEN[art].dauer), beginnMin = wochenende ? rund(r.normal(600, 30)) : rund(r.normal(1110, 15));
      const von = lokal(tag, beginnMin), quelle = q("training-" + tag);
      training = { von, bis: von + min * MS_MINUTE, art, herzschlaege: trainingsPuls(r, art, von, min, ruhe, max, quelle), quelle };
      D.training.push(training);
      hrvLn = ARTEN[art].hrvLn;
    }
    const freitagSamstag = wt === 4 || wt === 5;
    const e = {
      alkohol: !krank && r.ja(freitagSamstag ? 0.45 : 0.07),
      koffein_spaet: r.ja(0.15), bildschirm_spaet: r.ja(wochenende ? 0.5 : 0.35), spaete_mahlzeit: r.ja(0.2),
      meditation: r.ja(0.3), atemuebung: r.ja(0.25), kaltdusche: !krank && r.ja(0.15), sauna: !krank && r.ja(0.05),
      lesen: r.ja(0.4), stress: !wochenende && r.ja(0.25), krank, reisen: r.ja(0.02),
    };
    const eintraege = {};
    for (const k of TAGEBUCH) eintraege[k] = !!e[k];
    D.tagebuch.push({ tag, eintraege, quelle: q("tagebuch-" + tag) });
    const morgenWe = wochentag(plusTage(tag, 1)) >= 5;
    const bettAbend = rund(r.normal(morgenWe ? 0 : -85, morgenWe ? 35 : 20)) + (e.alkohol ? 30 : 0) + (e.bildschirm_spaet ? 20 : 0) - (krank ? 45 : 0);
    D.herzschlag.push(...alltagsPuls(r, tag, aufMin, 24 * 60 + bettAbend, ruhe, max, wochenende, krank, training, q("puls-" + tag)));
    // Nickerchen am Wochenende
    if (wochenende && !krank && r.ja(0.12)) {
      const nv = lokal(tag, 14 * 60), nb = nv + 25 * MS_MINUTE;
      D.schlaf.push({ von: nv, bis: nb, phasen: [{ von: nv, bis: nb, art: "leicht" }], quelle: q("nickerchen-" + tag) });
    }
    vorabend = { alkohol: e.alkohol, bildschirm: e.bildschirm_spaet, mahlzeit: e.spaete_mahlzeit, meditation: e.meditation, stress: e.stress, hrvLn, bettMin: bettAbend };
  }
  const ende = lokal(plusTage(bis, 1), 0); // nichts nach dem letzten Tag
  D.herzschlag = D.herzschlag.filter((h) => h.t < ende && !D.schlaf.some((s) => h.t >= s.von && h.t < s.bis));
  return { person: { ...P, maxPuls: max }, einstellungen: { alter: P.alter, maxPuls: max }, ...D };
}

/**
 * Erfundener Live-Puls der Musterperson (für „Demo-Puls“ in der Live-Ansicht und bei „Puls mitlesen“ im Atem).
 * Wie ein Brustgurt oder das WHOOP-Band liefert naechster() etwa jede Sekunde einen Datensatz { t, bpm, rrMs } – den Puls
 * und die Abstände der Herzschläge, die in dieser Sekunde geendet haben. Gleicher Startwert → exakt dieselbe Reihe.
 * Profil "training": Aufwärmen, dann Wellen um etwa 70 % der Pulsreserve. Profil "atem": ruhiger, leicht sinkender Puls,
 * der im Atemtakt (atemZyklusMs) steigt und fällt – so zeigt die Kohärenz etwas. Alle Zahlen sind Spielwerte.
 * @param {number} [seed]
 * @param {{profil?:"training"|"atem", atemZyklusMs?:number, startMs?:number, ruhe?:number, max?:number}} [optionen]
 * @returns {{naechster: () => {t:number, bpm:number, rrMs:number[]}}}
 */
function demoPuls(seed = 20261030, { profil = "training", atemZyklusMs = 10000, startMs = 0, ruhe = MUSTERPERSON.ruhepulsBasis, max = maxPulsTanaka(MUSTERPERSON.alter).bpm } = {}) {
  const r = zufall(seed), reserve = max - ruhe, T = atemZyklusMs > 0 ? atemZyklusMs : 10000;
  let schlag = 0, gemeldet = 0; // ms seit Start: Ende des letzten Schlags, letzte Meldung
  const zielPuls = (ms) => {
    const s = ms / 1000;
    if (profil === "atem") return ruhe + 12 - Math.min(6, s / 50);
    const anlauf = Math.min(1, s / 90), welle = 0.08 * Math.sin((2 * Math.PI * s) / 120);
    return ruhe + 30 + (0.68 * reserve - 30 + welle * reserve) * anlauf;
  };
  const tiefe = profil === "atem" ? 0.07 : 0.015; // Schwankung im Atemtakt (Spielwert)
  function naechsterSchlag() {
    const basis = 60000 / zielPuls(schlag);
    const rr = Math.max(320, rund(basis * (1 + tiefe * Math.sin((2 * Math.PI * schlag) / T)) + r.normal(0, profil === "atem" ? 20 : 4)));
    schlag += rr;
    return rr;
  }
  let offen = [];
  return {
    naechster() {
      const bis = gemeldet + 1000, rrMs = offen;
      offen = [];
      while (schlag < bis) { const rr = naechsterSchlag(); if (schlag <= bis) rrMs.push(rr); else offen.push(rr); }
      gemeldet = bis;
      const mittel = rrMs.length ? rrMs.reduce((s, x) => s + x, 0) / rrMs.length : 60000 / zielPuls(bis);
      return { t: startMs + bis, bpm: rund(60000 / mittel), rrMs };
    },
  };
}
return { MUSTERPERSON, zufall, demoDaten, demoPuls };
})();

// ===== kern/live.js
const __m_kern_live_js = (() => {
/* kern/live.js – Auswertung des Live-Pulses vom Band (Bluetooth, docs/apps/live.md).
 *
 * Kernaussage: Während du trainierst oder atmest, kommt etwa jede Sekunde ein Pulswert vom Band, oft mit den genauen Abständen
 * zwischen den letzten Herzschlägen. Diese Datei sagt, in welcher Pulszone du gerade bist, wie hoch die Belastung der laufenden
 * Einheit schon ist, wie stark die Herzschlag-Abstände in der letzten Minute schwanken (Kurz-HRV) und wie gleichmäßig dein Puls
 * dem Atemtakt folgt (Kohärenz). Zonen und Belastung kommen unverändert aus kern/belastung.js; alle Grenzen aus formeln.json.
 *
 * Ganzzahlig: Zeiten in ms, RR-Abstände in ms, Kurz-HRV in Zehntel-ms, Kohärenz in ganzen Punkten 0–100.
 * Kein DOM, kein Netz, kein Speicher.
 *
 * Schnittstelle:
 *   zoneVon(bpm, { maxPuls, ruhepuls })                      → 0..5 oder null (Einstellungen fehlen)
 *   laufendeBelastung(herzschlaege, { maxPuls, ruhepuls }, zustand?) → { wert, wertZehntel, zonen, trimpMs, ohneZoneMs, formel, zustand }
 *   rrFilter(rrMs)                                           → { gueltig: number[], paare: [[a,b]…], verworfen }
 *   hrvKurz(rrMs, fenster?)                                  → { rmssdZehntel|null, n, verworfen, formel, grund? }
 *   atemKohaerenz(rrMs, atemZyklusMs)                        → { wert: 0..100|null, zyklen, n, formel, grund? }
 *   trainingMindestMs() · pulsFormel()
 */
const { formel, wert } = __m_kern_formeln_js;
const { rund, begrenze } = __m_kern_rundung_js;
const { zoneVon: zoneBelastung, trimpMs, kurveZehntel } = __m_kern_belastung_js;
const { MS_MINUTE } = __m_kern_zeit_js;

const pulsOk = (e) => !!e && Number.isFinite(e.maxPuls) && Number.isFinite(e.ruhepuls) && e.maxPuls > e.ruhepuls;

/**
 * Zone eines Pulswerts – dieselbe Regel wie die Tagesbelastung (Karvonen 1957, Grenzen aus "belastung.zonen").
 * @param {number} bpm
 * @param {{maxPuls:number, ruhepuls:number}} einstellungen
 * @returns {number|null} 0 = unter Zone 1, 1..5, null wenn Max- oder Ruhepuls fehlen
 */
function zoneVon(bpm, einstellungen) {
  if (!pulsOk(einstellungen) || !Number.isFinite(bpm)) return null;
  return zoneBelastung(bpm, einstellungen.maxPuls, einstellungen.ruhepuls);
}

/** Leerer Zustand einer laufenden Einheit. */
const neuerZustand = () => ({ letzter: null, zonenMs: wert("belastung.zonen").map(() => 0), ohneZoneMs: 0, n: 0 });

/**
 * Belastung einer laufenden Einheit, Schritt für Schritt. Wer nur die neuen Herzschläge und den letzten Zustand übergibt,
 * erhält dasselbe Ergebnis wie belastung() über die ganze Reihe: Jeder Pulswert gilt bis zum nächsten, höchstens
 * "belastung.luecke_max_ms"; Zonen-Minuten gewichtet nach "belastung.gewichte"; Kurve nach "belastung".
 * @param {Array<{t:number,bpm:number}>} herzschlaege neue Herzschläge (zeitlich nach dem Zustand)
 * @param {{maxPuls:number, ruhepuls:number}} einstellungen
 * @param {object} [zustand] Rückgabe .zustand des letzten Aufrufs
 * @returns {object|null} null, wenn Max-/Ruhepuls fehlen
 */
function laufendeBelastung(herzschlaege, einstellungen, zustand) {
  if (!pulsOk(einstellungen)) return null;
  const z = zustand ? { ...zustand, zonenMs: zustand.zonenMs.slice() } : neuerZustand();
  const luecke = wert("belastung.luecke_max_ms");
  const neu = (herzschlaege || []).filter((h) => h && Number.isFinite(h.t) && Number.isFinite(h.bpm)).slice().sort((a, b) => a.t - b.t);
  for (const h of neu) {
    if (z.letzter && h.t > z.letzter.t) {
      const ms = Math.min(luecke, h.t - z.letzter.t);
      const zone = zoneBelastung(z.letzter.bpm, einstellungen.maxPuls, einstellungen.ruhepuls);
      if (zone === 0) z.ohneZoneMs += ms; else z.zonenMs[zone - 1] += ms;
    }
    if (!z.letzter || h.t >= z.letzter.t) z.letzter = { t: h.t, bpm: h.bpm };
    z.n += 1;
  }
  const zonen = z.zonenMs.map((ms, i) => ({ zone: i + 1, ms }));
  const t = trimpMs(zonen), wertZehntel = kurveZehntel(t);
  return {
    wert: wertZehntel / 10, wertZehntel, zonen, trimpMs: t, zonenMinuten: rund(t / MS_MINUTE, 1), ohneZoneMs: z.ohneZoneMs,
    formel: formel("belastung"), zonenFormel: formel("belastung.karvonen"), zustand: z,
  };
}

/**
 * Artefaktfilter für RR-Abstände: außerhalb [live.rr.min_ms, live.rr.max_ms] oder Sprung über live.rr.sprung_promille
 * zum letzten gültigen Abstand → verworfen (Karlsson et al. 2012). paare = direkt aufeinanderfolgende gültige Abstände.
 * @param {number[]} rrMs
 * @returns {{gueltig:number[], paare:Array<[number,number]>, verworfen:number}}
 */
function rrFilter(rrMs) {
  const min = wert("live.rr.min_ms"), max = wert("live.rr.max_ms"), sprung = wert("live.rr.sprung_promille");
  const gueltig = [], paare = [];
  let vorher = null, vorherDirekt = false, verworfen = 0;
  for (const roh of rrMs || []) {
    const rr = Math.round(Number(roh));
    const ok = Number.isFinite(rr) && rr >= min && rr <= max && (vorher === null || 1000 * Math.abs(rr - vorher) <= sprung * vorher);
    if (!ok) { verworfen += 1; vorherDirekt = false; continue; }
    if (vorher !== null && vorherDirekt) paare.push([vorher, rr]);
    gueltig.push(rr); vorher = rr; vorherDirekt = true;
  }
  return { gueltig, paare, verworfen };
}

/**
 * Kurz-HRV (RMSSD) über die letzten `fenster` RR-Abstände, nach dem Artefaktfilter.
 * Ganzzahlig: Summe der quadrierten Differenzen (ms²) ist ganz; Ergebnis = rund(√(100 × Summe ÷ n)) Zehntel-ms.
 * @param {number[]} rrMs RR-Abstände in ms, zeitlich geordnet
 * @param {number} [fenster] Standard: "live.hrv_kurz.fenster"
 * @returns {{rmssdZehntel:number|null, n:number, verworfen:number, formel:object, grund?:string}}
 */
function hrvKurz(rrMs, fenster = wert("live.hrv_kurz.fenster")) {
  const roh = (rrMs || []).slice(-Math.max(2, Math.floor(fenster)));
  const { paare, verworfen } = rrFilter(roh);
  const f = formel("live.hrv_kurz");
  if (paare.length < wert("live.hrv_kurz.min_differenzen")) return { rmssdZehntel: null, n: paare.length, verworfen, formel: f, grund: "zu_wenig_daten" };
  const summe = paare.reduce((s, [a, b]) => s + (b - a) * (b - a), 0);
  return { rmssdZehntel: rund(Math.sqrt((100 * summe) / paare.length)), n: paare.length, verworfen, formel: f };
}

/**
 * Kohärenz 0–100: Anteil der Schwankung der RR-Abstände, der genau im Atemtakt schwingt (eigene, vereinfachte Festlegung).
 * Es zählen die letzten ganzen Atemzüge (min/max aus formeln.json); die Abstände werden gleichmäßig im Abstand ihres Mittels
 * gelegt (t_i = i × Mittel), damit eine ganze Zahl von Atemzügen ohne Leck in die Rechnung geht.
 * @param {number[]} rrMs RR-Abstände in ms
 * @param {number} atemZyklusMs Dauer eines Atemzugs (ein + aus + halten) in ms
 * @returns {{wert:number|null, zyklen:number, n:number, verworfen:number, formel:object, grund?:string}}
 */
function atemKohaerenz(rrMs, atemZyklusMs) {
  const f = formel("live.kohaerenz");
  const T = Number(atemZyklusMs);
  const { gueltig, verworfen } = rrFilter(rrMs);
  const leer = (grund, zyklen = 0) => ({ wert: null, zyklen, n: 0, verworfen, formel: f, grund });
  if (!(T > 0)) return leer("kein_atemtakt");
  const summe = gueltig.reduce((s, x) => s + x, 0);
  const zyklen = Math.min(wert("live.kohaerenz.max_zyklen"), Math.floor(summe / T));
  if (zyklen < wert("live.kohaerenz.min_zyklen")) return leer("zu_wenig_daten", zyklen);
  // vom Ende her so viele Abstände nehmen, bis die Dauer der ganzen Atemzüge erreicht ist
  const ziel = zyklen * T, teil = [];
  let dauer = 0;
  for (let i = gueltig.length - 1; i >= 0 && dauer < ziel; i--) { teil.unshift(gueltig[i]); dauer += gueltig[i]; }
  const n = teil.length;
  const mittel = teil.reduce((s, x) => s + x, 0) / n;
  let a = 0, b = 0, streuung = 0;
  teil.forEach((rr, i) => {
    const d = rr - mittel, w = (2 * Math.PI * i * mittel) / T;
    a += d * Math.cos(w); b += d * Math.sin(w); streuung += d * d;
  });
  if (!(streuung > 0)) return { wert: 0, zyklen, n, verworfen, formel: f, grund: "keine_schwankung" };
  a = (2 * a) / n; b = (2 * b) / n;
  const leistung = (a * a + b * b) / 2;
  return { wert: begrenze(rund((100 * leistung) / (streuung / n)), 0, 100), zyklen, n, verworfen, formel: f };
}

/** Kürzeste Live-Aufzeichnung, die als Training gespeichert wird (formeln.json "live.training.min_ms"). */
const trainingMindestMs = () => wert("live.training.min_ms");

/** Formel zur Herkunft des Live-Pulses (Belegfenster). */
const pulsFormel = () => formel("live.formel_puls");
return { zoneVon, laufendeBelastung, rrFilter, hrvKurz, atemKohaerenz, trainingMindestMs, pulsFormel };
})();

// ===== kern/zusammenfuehren.js
const __m_kern_zusammenfuehren_js = (() => {
/* kern/zusammenfuehren.js – dieselbe Nacht und dasselbe Training aus mehreren Quellen zu einem Datensatz.
 *
 * Kernaussage: Kommt dieselbe Nacht oder dasselbe Training einmal aus Health Connect und einmal aus dem WHOOP-Export (CSV), sind das
 * zwei Datensätze mit verschiedener Kennung. Ohne Zusammenlegen zählte die zweite Nacht als Nickerchen und das Training doppelt
 * (Belastung doppelt). Zwei Datensätze gelten als derselbe, wenn sie sich mindestens zur Hälfte des kürzeren überdecken
 * (formeln.json "zusammenfuehren.ueberlappung"). Führend ist der Satz mit echten Daten (Schlafphasen bzw. Pulswerte, sonst
 * Phasensummen, sonst Health Connect, sonst der frühere); fehlende Felder (WHOOPs eigene Werte, Phasensummen, Zonenanteile,
 * Trainingsart) kommen aus dem anderen. Beide Quellen bleiben in `weitereQuellen` und damit im Belegfenster sichtbar.
 *
 * Punktwerte (HRV, Ruhepuls, Atemfrequenz, SpO2, Hauttemperatur) wählt `eineQuelle`: je Art und Nacht nur eine Quelle
 * (Health Connect, sonst CSV, sonst die übrigen), nie gemittelt.
 *
 * Reine Funktionen, kein DOM, kein Netz, kein Speicher.
 */
const { wert } = __m_kern_formeln_js;

/** Überdeckung in ms zweier Zeitspannen {von, bis}. */
const ueberdeckung = (a, b) => Math.min(a.bis, b.bis) - Math.max(a.von, b.von);

/** Gehören a und b zusammen (Überdeckung ≥ Anteil des kürzeren; ganzzahlig in Promille gerechnet)? */
function gleicherSatz(a, b) {
  const kurz = Math.min(a.bis - a.von, b.bis - b.von);
  if (!(kurz > 0)) return false;
  return ueberdeckung(a, b) * 1000 >= wert("zusammenfuehren.ueberlappung") * kurz;
}

const hatPhasen = (s) => Array.isArray(s.phasen) && s.phasen.length > 0;
const hatSummen = (s) => !!s.phasenSummen && [s.phasenSummen.leichtMs, s.phasenSummen.tiefMs, s.phasenSummen.remMs].some((x) => Number.isFinite(x) && x > 0);
const hatProben = (t) => Array.isArray(t.herzschlaege) && t.herzschlaege.length >= 2;
const istHc = (x) => x.quelle?.art === "healthconnect";
const leer = (v) => v === undefined || v === null || (Array.isArray(v) && v.length === 0);

/** Rang eines Satzes als führender Satz (größer = besser). */
const rangSchlaf = (s) => (hatPhasen(s) ? 4 : 0) + (hatSummen(s) ? 2 : 0) + (istHc(s) ? 1 : 0);
const rangTraining = (t) => (hatProben(t) ? 4 : 0) + (istHc(t) ? 1 : 0);

/** Unbestimmte Trainingsart aus Health Connect ("hc_<Nr>") oder "sonstiges" gilt als unbekannt. */
const artUnbekannt = (a) => !a || /^hc_/.test(a) || a === "sonstiges";

function vereine(lead, andere, art) {
  const aus = { ...lead };
  for (const o of andere) {
    for (const [k, v] of Object.entries(o)) {
      if (k === "quelle" || k === "weitereQuellen" || k === "von" || k === "bis") continue;
      if (art === "schlaf" && (k === "phasen" || (k === "phasenSummen" && hatPhasen(lead)))) continue;
      if (art === "training" && k === "herzschlaege") continue;
      if (art === "training" && k === "art") { if (artUnbekannt(aus.art) && !artUnbekannt(v)) aus.art = v; continue; }
      if (k === "fremdwerte" && aus.fremdwerte && v) { aus.fremdwerte = { ...v, ...Object.fromEntries(Object.entries(aus.fremdwerte).filter(([, x]) => x !== null && x !== undefined)) }; continue; }
      if (leer(aus[k]) && !leer(v)) aus[k] = v;
    }
  }
  aus.weitereQuellen = [...(lead.weitereQuellen || []), ...andere.flatMap((o) => [o.quelle, ...(o.weitereQuellen || [])])].filter(Boolean);
  return aus;
}

/**
 * Liste von Spannen {von, bis} zusammenlegen.
 * @param {object[]} liste
 * @param {"schlaf"|"training"} art
 * @returns {object[]} nach Beginn sortiert; Sätze ohne Gegenstück unverändert (gleiches Objekt)
 */
function zusammenlegen(liste, art) {
  const rang = art === "schlaf" ? rangSchlaf : rangTraining;
  const rest = (liste || []).filter((x) => x && x.bis >= x.von).slice().sort((a, b) => a.von - b.von || (istHc(b) - istHc(a)));
  const gruppen = [];
  for (const x of rest) {
    const g = gruppen.find((gr) => gr.some((y) => gleicherSatz(x, y)));
    if (g) g.push(x); else gruppen.push([x]);
  }
  return gruppen.map((g) => {
    if (g.length === 1) return g[0];
    const lead = g.reduce((b, x) => (rang(x) > rang(b) ? x : b), g[0]);
    return vereine(lead, g.filter((x) => x !== lead), art);
  }).sort((a, b) => a.von - b.von);
}

/** Datenbündel mit zusammengelegten Nächten und Trainings (die übrigen Arten unverändert). Mehrfaches Anwenden ändert nichts mehr. */
function zusammenfuehren(daten = {}) {
  return { ...daten, schlaf: zusammenlegen(daten.schlaf, "schlaf"), training: zusammenlegen(daten.training, "training") };
}

const RANG_QUELLE = ["healthconnect", "csv"];
/**
 * Messreihe auf eine Quelle beschränken: Health Connect, sonst CSV, sonst die erste vorhandene Art.
 * @param {Array<{quelle?:{art:string}}>} liste
 */
function eineQuelle(liste) {
  if (!liste || liste.length < 2) return liste || [];
  const arten = new Set(liste.map((x) => x.quelle?.art ?? ""));
  if (arten.size < 2) return liste;
  const wahl = RANG_QUELLE.find((a) => arten.has(a)) ?? [...arten][0];
  return liste.filter((x) => (x.quelle?.art ?? "") === wahl);
}
return { gleicherSatz, zusammenlegen, zusammenfuehren, eineQuelle };
})();

// ===== kern/tag.js
const __m_kern_tag_js = (() => {
/* kern/tag.js – alle Rechnungen eines Tages an einem Ort.
 *
 * Kernaussage: tagAuswerten nimmt alle Messwerte und baut daraus einen Tag: Erholung am Morgen, Belastung bis
 * zum nächsten Aufwachen, Schlafleistung der Nacht davor und den Schlafbedarf. Jeder Teil trägt Formel und Quellen.
 * Die Nacht, die am Morgen eines Tages endet, gehört zu diesem Tag; die Belastung des Vortags erhöht den
 * Schlafbedarf dieser Nacht. alleTage rechnet alle Tage am Stück und nutzt Zwischenergebnisse mehrfach.
 *
 * Datenbündel (normierte Messwerte aus docs/technik/schnittstellen.md):
 *   daten = { herzschlag: Herzschlag[] (Alltag), hrv: Hrv[], ruhepuls: Ruhepuls[], atemfrequenz: Atemfrequenz[],
 *             spo2: SpO2[], hauttemp: Hauttemp[], schlaf: Schlaf[], training: Training[], tagebuch: Tagebuch[] }
 *   einstellungen = { alter?, maxPuls?, ruhepuls? (Rückfall), schlafBasisMs? }
 * Kein DOM, kein Netz, kein Speicher.
 */
const { wert } = __m_kern_formeln_js;
const { rund, rundBruch } = __m_kern_rundung_js;
const { isoTag, plusTage, hauptschlaf, tagesgrenzen, istIsoTag } = __m_kern_zeit_js;
const { basislinie } = __m_kern_basislinie_js;
const { erholung } = __m_kern_erholung_js;
const { belastungTag, maxPulsTanaka } = __m_kern_belastung_js;
const { schlafLeistung, schlafBedarf, schlafSchuld, schlafZusammenfassung } = __m_kern_schlaf_js;
const { vereinige } = __m_kern_quellen_js;
const { zusammenlegen, eineQuelle } = __m_kern_zusammenfuehren_js;

const LISTEN = ["herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch"];
const nachT = (a, b) => a.t - b.t;
const nachVon = (a, b) => a.von - b.von;

/** Datenbündel prüfen und nach Zeit sortiert kopieren. */
function normiere(daten = {}) {
  const d = {};
  for (const k of LISTEN) d[k] = Array.isArray(daten[k]) ? daten[k].filter(Boolean).slice() : [];
  for (const k of ["herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp"]) d[k] = d[k].filter((x) => Number.isFinite(x.t)).sort(nachT);
  // Dieselbe Nacht / dasselbe Training aus Health Connect und WHOOP-CSV ist ein Datensatz (kern/zusammenfuehren.js)
  d.schlaf = zusammenlegen(d.schlaf.filter((s) => s.bis > s.von), "schlaf");
  d.training = zusammenlegen(d.training.filter((s) => s.bis >= s.von), "training");
  d.tagebuchNachTag = new Map(d.tagebuch.filter((x) => istIsoTag(x.tag)).map((x) => [x.tag, x]));
  return d;
}

/** Erster Index mit t ≥ grenze (Binärsuche, Liste nach t sortiert). */
function ersterAb(liste, grenze) {
  let lo = 0, hi = liste.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (liste[m].t < grenze) lo = m + 1; else hi = m; }
  return lo;
}
/** Ausschnitt von ≤ t < bis. */
const abschnitt = (liste, von, bis) => liste.slice(ersterAb(liste, von), ersterAb(liste, bis));

/** Mittelwert einer Messreihe in ganzen Einheiten: Feld × Faktor, je Wert gerundet, dann rundBruch. */
function mittelwert(liste, feld, faktor) {
  const xs = liste.filter((x) => Number.isFinite(x[feld]));
  if (!xs.length) return null;
  const summe = xs.reduce((a, x) => a + rund(x[feld] * faktor), 0);
  return { wert: rundBruch(summe, xs.length), n: xs.length, quellen: vereinige(...xs.map((x) => x.quelle)) };
}

/**
 * Auswerter mit Zwischenspeicher für ein Datenbündel.
 * @param {object} daten Datenbündel
 * @param {object} [einstellungen]
 * @returns {{tag:(tagIso:string)=>object, spanne:()=>{von:string,bis:string}|null}}
 */
function auswerter(daten, einstellungen = {}) {
  const D = normiere(daten);
  const memo = new Map();
  const merke = (k, f) => { if (!memo.has(k)) memo.set(k, f()); return memo.get(k); };
  const lang = wert("basis.fenster.lang"), kurz = wert("basis.fenster.kurz"), schuldFenster = wert("schlaf.schuld.fenster");
  const maxPuls = Number.isFinite(einstellungen.maxPuls) ? einstellungen.maxPuls : maxPulsTanaka(einstellungen.alter)?.bpm ?? null;

  const haupt = (tag) => merke("haupt:" + tag, () => hauptschlaf(tag, D.schlaf));
  const grenzen = (tag) => merke("grenzen:" + tag, () => tagesgrenzen(tag, einstellungen, D.schlaf));

  /** Nachtwerte des Morgens `tag`: Messungen während des Hauptschlafs (ohne Hauptschlaf: im Tagesfenster bis zur nächsten
   *  Nacht); Ruhepuls: erster Wert ab Schlafbeginn bis zum Beginn der nächsten Nacht. */
  const nacht = (tag) => merke("nacht:" + tag, () => {
    const s = haupt(tag), g = grenzen(tag);
    const naechste = haupt(plusTage(tag, 1)), ende = naechste ? Math.min(naechste.von, g.bis) : g.bis; // nächste Nacht gehört zum Folgetag
    const vonN = s ? s.von : g.von, bisN = s ? s.bis + 1 : ende;
    // Punktwerte je Art aus EINER Quelle (Health Connect, sonst CSV), nicht gemittelt. Gibt es im Schlaffenster nichts, zählt der Wert
    // der ersten Stunden nach dem Aufwachen ("zeit.nachfenster_nach_aufwachen"), denn manche Geräte melden ihn erst beim Synchronisieren.
    const nachN = s ? Math.min(bisN + wert("zeit.nachfenster_nach_aufwachen"), ende > bisN ? ende : Infinity) : null;
    const reihe = (liste, feld) => {
      const im = eineQuelle(abschnitt(liste, vonN, bisN).filter((x) => Number.isFinite(x[feld])));
      return im.length || nachN === null ? im : eineQuelle(abschnitt(liste, bisN, nachN).filter((x) => Number.isFinite(x[feld])));
    };
    const rp = eineQuelle(abschnitt(D.ruhepuls, vonN, Math.max(bisN, ende)).filter((x) => Number.isFinite(x.bpm)))[0];
    return {
      schlaf: s,
      hrv: mittelwert(reihe(D.hrv, "rmssdMs"), "rmssdMs", wert("einheit.hrv")),
      atem: mittelwert(reihe(D.atemfrequenz, "proMin"), "proMin", wert("einheit.atem")),
      spo2: mittelwert(reihe(D.spo2, "prozent"), "prozent", wert("einheit.spo2")),
      hauttemp: mittelwert(reihe(D.hauttemp, "deltaC"), "deltaC", wert("einheit.hauttemp")),
      ruhepuls: rp ? { wert: rund(rp.bpm), n: 1, quellen: vereinige(rp.quelle) } : null,
    };
  });

  /** Basislinie eines Nachtwerts aus den `lang` Tagen vor `tag`. */
  const basis = (tag, feld) => merke("basis:" + feld + ":" + tag, () => {
    const werte = [];
    for (let k = 1; k <= lang; k++) { const d = plusTage(tag, -k), m = nacht(d)[feld]; if (m) werte.push({ tag: d, wert: m.wert, quellen: m.quellen }); }
    return basislinie(werte, { tage: lang, bis: tag, ln: feld === "hrv", teiler: feld === "hrv" ? wert("einheit.hrv") : 1 });
  });

  /** Ruhepuls für die Zonen: gemessen, sonst Mittel der Basislinie, sonst Einstellung. */
  const ruhepulsFuerZonen = (tag) => nacht(tag).ruhepuls?.wert ?? (basis(tag, "ruhepuls").mittel !== null ? rund(basis(tag, "ruhepuls").mittel) : null) ?? einstellungen.ruhepuls ?? null;

  const belastung = (tag) => merke("belastung:" + tag, () => {
    const g = grenzen(tag);
    const trainings = D.training.filter((x) => x.von >= g.von && x.von < g.bis);
    const alltag = abschnitt(D.herzschlag, g.von, g.bis);
    if (!trainings.length && !alltag.length) return null;
    return belastungTag(trainings, alltag, { maxPuls, ruhepuls: ruhepulsFuerZonen(tag) });
  });

  /** Nickerchen im Tagesfenster (ohne die Hauptschlafphasen an den Rändern). */
  const nickerchen = (tag) => merke("nap:" + tag, () => {
    const g = grenzen(tag), h1 = haupt(tag), h2 = haupt(plusTage(tag, 1));
    return D.schlaf.filter((s) => s.bis >= g.von && s.bis < g.bis && s !== h1 && s !== h2);
  });

  const basisMs = Number.isFinite(einstellungen.schlafBasisMs) ? einstellungen.schlafBasisMs : undefined;
  const bedarfOhneSchuld = (tag) => merke("bos:" + tag, () => schlafBedarf({ basis: basisMs, belastungGestern: belastung(plusTage(tag, -1)), schuld: 0, nickerchen: nickerchen(plusTage(tag, -1)) }).ms);
  const dauer = (tag) => (haupt(tag) ? schlafZusammenfassung(haupt(tag)).dauerMs : null);
  const schuld = (tag) => merke("schuld:" + tag, () => {
    const naechte = [];
    for (let k = schuldFenster; k >= 1; k--) { const d = plusTage(tag, -k); if (dauer(d) !== null) naechte.push({ bedarfMs: bedarfOhneSchuld(d), dauerMs: dauer(d) }); }
    return schlafSchuld(naechte);
  });
  const bedarf = (tag) => merke("bedarf:" + tag, () => {
    const b = schlafBedarf({ basis: basisMs, belastungGestern: belastung(plusTage(tag, -1)), schuld: schuld(tag), nickerchen: nickerchen(plusTage(tag, -1)) });
    return { ...b, schuldMs: schuld(tag) };
  });

  const schlaf = (tag) => merke("schlaf:" + tag, () => {
    const vorher = [];
    for (let k = 1; k <= kurz; k++) { const s = haupt(plusTage(tag, -k)); if (s) vorher.push(s); }
    return schlafLeistung({ schlaf: haupt(tag), bedarf: bedarf(tag), vorher });
  });

  const tagObjekt = (tag) => merke("tag:" + tag, () => {
    const n = nacht(tag), sl = schlaf(tag);
    const basen = { hrv: basis(tag, "hrv"), ruhepuls: basis(tag, "ruhepuls"), atem: basis(tag, "atem") };
    const er = erholung({ hrv: n.hrv, ruhepuls: n.ruhepuls, schlaf: sl, atem: n.atem, hauttemp: n.hauttemp, spo2: n.spo2, basis: basen });
    const be = belastung(tag), bd = bedarf(tag), tb = D.tagebuchNachTag.get(tag) ?? null;
    return {
      tag, grenzen: grenzen(tag), erholung: er, belastung: be, schlaf: sl, bedarf: bd,
      bedarfNaechsteNacht: bedarf(plusTage(tag, 1)),
      messwerte: { hrv: n.hrv, ruhepuls: n.ruhepuls, atem: n.atem, spo2: n.spo2, hauttemp: n.hauttemp },
      basis: basen, tagebuch: tb,
      quellen: vereinige(grenzen(tag).quellen, er.quellen, be?.quellen, sl?.quellen, bd.quellen, tb?.quelle),
    };
  });

  /** Erster und letzter Tag mit Daten. */
  const spanne = () => {
    const tage = [
      ...D.schlaf.map((s) => isoTag(s.bis)), ...D.training.map((x) => isoTag(x.von)), ...D.tagebuch.map((x) => x.tag).filter(istIsoTag),
      ...["herzschlag", "hrv", "ruhepuls"].flatMap((k) => (D[k].length ? [isoTag(D[k][0].t), isoTag(D[k].at(-1).t)] : [])),
    ].sort();
    return tage.length ? { von: tage[0], bis: tage.at(-1) } : null;
  };
  return { tag: tagObjekt, spanne };
}

/**
 * Einen Tag auswerten.
 * @param {string} tagIso "JJJJ-MM-TT"
 * @param {object} daten Datenbündel
 * @param {object} [einstellungen]
 * @returns {{tag:string, grenzen:object, erholung:object, belastung:object|null, schlaf:object|null, bedarf:object, bedarfNaechsteNacht:object, messwerte:object, basis:object, tagebuch:object|null, quellen:object[]}}
 */
function tagAuswerten(tagIso, daten, einstellungen = {}) {
  if (!istIsoTag(tagIso)) throw new Error("tagAuswerten: Tag als 'JJJJ-MM-TT' erwartet");
  return auswerter(daten, einstellungen).tag(tagIso);
}

/**
 * Alle Tage vom ersten bis zum letzten Tag mit Daten, aufsteigend.
 * @returns {object[]} Tag-Objekte
 */
function alleTage(daten, einstellungen = {}) {
  const a = auswerter(daten, einstellungen), sp = a.spanne();
  if (!sp) return [];
  const aus = [];
  for (let d = sp.von; d <= sp.bis; d = plusTage(d, 1)) aus.push(a.tag(d));
  return aus;
}
return { auswerter, tagAuswerten, alleTage };
})();

// ===== kern/i18n.js
const __m_kern_i18n_js = (() => {
/* kern/i18n.js – Beschriftungen des Kerns auf Deutsch und Englisch.
 *
 * Kernaussage: Jede Beschriftung, die der Kern liefert (Zonen, Stufen, Tagebuch-Fragen, Formelnamen, Atemübungen),
 * steht hier einmal mit deutscher und englischer Fassung. t("schluessel", "en") holt sie; fehlt Englisch, kommt
 * Deutsch, fehlt der Schlüssel, kommt der Schlüssel selbst zurück. Texte der Oberfläche liegen in shell/i18n/.
 */

const SPRACHEN = ["de", "en"];
const STANDARD = "de";

/** Wörterbuch: schluessel → [de, en]. */
const W = {
  // Kennzahlen
  "erholung": ["Erholung", "Recovery"],
  "belastung": ["Belastung", "Strain"],
  "schlaf": ["Schlaf", "Sleep"],
  "schlaf.leistung": ["Schlafleistung", "Sleep performance"],
  "schlaf.bedarf": ["Schlafbedarf", "Sleep need"],
  "schlaf.schuld": ["Schlafschuld", "Sleep debt"],
  "schlaf.effizienz": ["Schlafeffizienz", "Sleep efficiency"],
  "schlaf.konsistenz": ["Regelmäßigkeit", "Consistency"],
  "hrv": ["Herzfrequenzvariabilität (HRV)", "Heart rate variability (HRV)"],
  "ruhepuls": ["Ruhepuls", "Resting heart rate"],
  "atem": ["Atemfrequenz", "Respiratory rate"],
  "spo2": ["Sauerstoffsättigung", "Blood oxygen"],
  "hauttemp": ["Hauttemperatur", "Skin temperature"],
  "basislinie": ["Normalbereich", "Baseline"],
  // Stufen
  "stufe.gruen": ["Grün – besser erholt als üblich", "Green – better recovered than usual"],
  "stufe.gelb": ["Gelb – im üblichen Bereich", "Yellow – within your usual range"],
  "stufe.rot": ["Rot – weniger erholt als üblich", "Red – less recovered than usual"],
  // Zonen
  "zone.0": ["Unter Zone 1", "Below zone 1"],
  "zone.1": ["Zone 1 – sehr leicht", "Zone 1 – very light"],
  "zone.2": ["Zone 2 – leicht", "Zone 2 – light"],
  "zone.3": ["Zone 3 – mittel", "Zone 3 – moderate"],
  "zone.4": ["Zone 4 – hart", "Zone 4 – hard"],
  "zone.5": ["Zone 5 – maximal", "Zone 5 – maximum"],
  // Schlafphasen
  "phase.wach": ["Wach", "Awake"],
  "phase.leicht": ["Leichtschlaf", "Light sleep"],
  "phase.tief": ["Tiefschlaf", "Deep sleep"],
  "phase.rem": ["REM-Schlaf", "REM sleep"],
  // Bedarfsteile
  "bedarf.basis": ["Grundbedarf", "Baseline need"],
  "bedarf.belastung": ["Ausgleich Belastung", "Strain adjustment"],
  "bedarf.schuld": ["Ausgleich Schlafschuld", "Sleep debt repayment"],
  "bedarf.nickerchen": ["Nickerchen", "Naps"],
  // Erholungsteile und Gründe
  "teil.hrv": ["HRV", "HRV"],
  "teil.ruhepuls": ["Ruhepuls", "Resting heart rate"],
  "teil.schlaf": ["Schlafleistung", "Sleep performance"],
  "teil.atem": ["Atemfrequenz", "Respiratory rate"],
  "teil.hauttemp": ["Hauttemperatur", "Skin temperature"],
  "teil.spo2": ["Sauerstoffsättigung", "Blood oxygen"],
  "grund.kein_messwert": ["kein Messwert", "no measurement"],
  "grund.basis_zu_klein": ["noch zu wenige Tage für den Normalbereich", "not enough days for a baseline yet"],
  "grund.zu_wenig_daten": ["zu wenige Daten", "not enough data"],
  // Formeln
  "formel.erholung": ["Formel Erholung", "Recovery formula"],
  "formel.belastung": ["Formel Belastung", "Strain formula"],
  "formel.belastung.karvonen": ["Pulszonen nach Karvonen", "Heart-rate zones (Karvonen)"],
  "formel.puls.max.tanaka": ["Maximalpuls nach Tanaka", "Maximum heart rate (Tanaka)"],
  "formel.schlaf.leistung": ["Formel Schlafleistung", "Sleep performance formula"],
  "formel.schlaf.bedarf": ["Formel Schlafbedarf", "Sleep need formula"],
  "formel.basis.mittel": ["Normalbereich", "Baseline"],
  "formel.basis.hrv_ln": ["Normalbereich HRV (logarithmiert)", "HRV baseline (log)"],
  "formel.tagebuch.wirkung": ["Vergleich Tagebuch", "Journal comparison"],
  "formel.trend.band": ["Band im Verlauf", "Trend band"],
  // Atemübungen
  "atem.box": ["Box-Atmung", "Box breathing"],
  "atem.vier-sieben-acht": ["4-7-8-Atmung", "4-7-8 breathing"],
  "atem.kohaerenz": ["Kohärente Atmung", "Coherent breathing"],
  "atem.seufzer": ["Physiologischer Seufzer", "Physiological sigh"],
  "atem.entspannung": ["Entspannungsatmung", "Relaxation breathing"],
  "atem.box.beschreibung": ["4 Sekunden ein, 4 halten, 4 aus, 4 halten.", "Breathe in 4 s, hold 4, out 4, hold 4."],
  "atem.vier-sieben-acht.beschreibung": ["4 Sekunden ein, 7 halten, 8 aus.", "Breathe in 4 s, hold 7, out 8."],
  "atem.kohaerenz.beschreibung": ["5,5 Sekunden ein, 5,5 aus – ruhig und gleichmäßig.", "Breathe in 5.5 s, out 5.5 – calm and even."],
  "atem.seufzer.beschreibung": ["Tief ein, kurz nachatmen, lange aus.", "Deep breath in, short top-up, long breath out."],
  "atem.entspannung.beschreibung": ["4 Sekunden ein, 6 aus.", "Breathe in 4 s, out 6."],
  "atem.phase.ein": ["Einatmen", "Breathe in"],
  "atem.phase.halten": ["Halten", "Hold"],
  "atem.phase.aus": ["Ausatmen", "Breathe out"],
  "atem.phase.halten2": ["Halten", "Hold"],
  "atem.phase.nachatmen": ["Nachatmen", "Top up"],
  // Tagebuch
  "tagebuch.alkohol": ["Alkohol", "Alcohol"],
  "tagebuch.koffein_spaet": ["Koffein nach 14 Uhr", "Caffeine after 2 pm"],
  "tagebuch.bildschirm_spaet": ["Bildschirm im Bett", "Screen in bed"],
  "tagebuch.spaete_mahlzeit": ["Späte Mahlzeit", "Late meal"],
  "tagebuch.meditation": ["Meditation", "Meditation"],
  "tagebuch.atemuebung": ["Atemübung", "Breathing exercise"],
  "tagebuch.kaltdusche": ["Kalt geduscht", "Cold shower"],
  "tagebuch.sauna": ["Sauna", "Sauna"],
  "tagebuch.lesen": ["Gelesen vor dem Schlafen", "Read before sleep"],
  "tagebuch.stress": ["Stressiger Tag", "Stressful day"],
  "tagebuch.krank": ["Krank gefühlt", "Felt sick"],
  "tagebuch.reisen": ["Unterwegs / Reise", "Travelling"],
  "tagebuch.hinweis.zu_wenig": [
    "Noch zu wenige Tage für einen Vergleich: je Gruppe braucht es mindestens {minN} (mit: {mit}, ohne: {ohne}). Das zeigt einen Zusammenhang, keinen Beweis.",
    "Not enough days to compare yet: each group needs at least {minN} (with: {mit}, without: {ohne}). This shows a correlation, not proof."],
  "tagebuch.hinweis.vergleich": [
    "Deine Erholung am Morgen danach war im Mittel {differenz} Punkte anders. Das zeigt einen Zusammenhang, keinen Beweis.",
    "Your recovery the next morning differed by {differenz} points on average. This shows a correlation, not proof."],
  // Allgemein
  "hinweis.kein_rat": ["Messwerte und Tendenzen, keine medizinische Beratung.", "Measurements and tendencies, not medical advice."],
  // Beleg Erholung: ausgelassene Teile in einer Zeile (shell/kern_echt.js)
  "erholung.nicht_beruecksichtigt": ["Nicht berücksichtigt: {liste}", "Not included: {liste}"],
  // Einstellungen: Ruhepuls als Rückfall (shell/apps/daten.js)
  "einst.ruhepuls": ["Ruhepuls (Schläge/min, optional)", "Resting heart rate (beats/min, optional)"],
  "einst.ruhepuls.hilfe": ["nur nötig, wenn keine Nachtmessung vorliegt, z. B. nur Live-Puls", "only needed without night measurements, e.g. live heart rate only"],
};

/**
 * Beschriftung holen.
 * @param {string} schluessel
 * @param {"de"|"en"} [sprache="de"]
 * @param {Object<string, string|number>} [platzhalter] ersetzt {name}
 * @returns {string}
 */
function t(schluessel, sprache = STANDARD, platzhalter) {
  const e = W[schluessel];
  const i = Math.max(0, SPRACHEN.indexOf(sprache));
  let text = e ? e[i] || e[0] : schluessel;
  if (platzhalter) for (const [k, v] of Object.entries(platzhalter)) text = text.split("{" + k + "}").join(String(v));
  return text;
}

/** Gibt es den Schlüssel? */
const hat = (schluessel) => Object.prototype.hasOwnProperty.call(W, schluessel);

/** Schlüssel, denen eine Sprache fehlt (für den Vollständigkeitstest). */
const fehlend = () => Object.entries(W).filter(([, v]) => SPRACHEN.some((_, i) => !v[i])).map(([k]) => k);

/** Alle Schlüssel. */
const alleSchluessel = () => Object.keys(W);
return { SPRACHEN, STANDARD, t, hat, fehlend, alleSchluessel };
})();

// ===== kern/index.js
const __m_kern_index_js = (() => {
/* kern/index.js – eine Tür zum Kern.
 *
 * Kernaussage: Die Shell und die Datenschicht holen alles, was der Kern kann, aus dieser einen Datei. Hier stehen
 * die Funktionen aus docs/technik/schnittstellen.md und einige kleine Ergänzungen (Kataloge, Kalenderhilfen).
 */

















const { UEBUNGEN } = __m_kern_atem_js;
const { KATALOG } = __m_kern_tagebuch_js;
const { maxPulsTanaka } = __m_kern_belastung_js;
/** Namen der Atemübungen. */
const atemKatalog = () => UEBUNGEN.slice();
/** Tagebuch-Fragen. */
const tagebuchKatalog = () => KATALOG.map((k) => ({ ...k }));
/** Maximalpuls aus dem Alter als {wert, formel} (Tanaka 2001). */
const maxPulsAus = (alter) => { const m = maxPulsTanaka(alter); return m ? { wert: m.bpm, formel: m.formel } : null; };
return { formel: __m_kern_formeln_js.formel, wert: __m_kern_formeln_js.wert, pruefListe: __m_kern_formeln_js.pruefListe, formelSchluessel: __m_kern_formeln_js.alleSchluessel, setzeFormeln: __m_kern_formeln_js.setzeFormeln, rund: __m_kern_rundung_js.rund, rundBruch: __m_kern_rundung_js.rundBruch, isoTag: __m_kern_zeit_js.isoTag, tagIso: __m_kern_zeit_js.isoTag, plusTage: __m_kern_zeit_js.plusTage, tagPlus: __m_kern_zeit_js.plusTage, mitternacht: __m_kern_zeit_js.mitternacht, lokal: __m_kern_zeit_js.lokal, tageZwischen: __m_kern_zeit_js.tageZwischen, tagLaengeMs: __m_kern_zeit_js.tagLaengeMs, wochentag: __m_kern_zeit_js.wochentag, isoWoche: __m_kern_zeit_js.isoWoche, monat: __m_kern_zeit_js.monat, dauer: __m_kern_zeit_js.dauer, hauptschlaf: __m_kern_zeit_js.hauptschlaf, tagesgrenzen: __m_kern_zeit_js.tagesgrenzen, MS_MINUTE: __m_kern_zeit_js.MS_MINUTE, MS_STUNDE: __m_kern_zeit_js.MS_STUNDE, basislinie: __m_kern_basislinie_js.basislinie, zWert: __m_kern_basislinie_js.zWert, erholung: __m_kern_erholung_js.erholung, stufe: __m_kern_erholung_js.stufe, belastung: __m_kern_belastung_js.belastung, belastungTag: __m_kern_belastung_js.belastungTag, maxPulsTanaka: __m_kern_belastung_js.maxPulsTanaka, zonenGrenzen: __m_kern_belastung_js.zonenGrenzen, zoneVon: __m_kern_belastung_js.zoneVon, schlafLeistung: __m_kern_schlaf_js.schlafLeistung, schlafBedarf: __m_kern_schlaf_js.schlafBedarf, schlafSchuld: __m_kern_schlaf_js.schlafSchuld, schlafKonsistenz: __m_kern_schlaf_js.schlafKonsistenz, schlafZusammenfassung: __m_kern_schlaf_js.schlafZusammenfassung, atemUebung: __m_kern_atem_js.atemUebung, atemPlan: __m_kern_atem_js.atemPlan, UEBUNGEN: __m_kern_atem_js.UEBUNGEN, tagebuchWirkung: __m_kern_tagebuch_js.tagebuchWirkung, TAGEBUCH_KATALOG: __m_kern_tagebuch_js.KATALOG, katalogSchluessel: __m_kern_tagebuch_js.katalogSchluessel, mitKatalog: __m_kern_tagebuch_js.mitKatalog, trend: __m_kern_trend_js.trend, wochenZusammenfassung: __m_kern_trend_js.wochenZusammenfassung, monatsZusammenfassung: __m_kern_trend_js.monatsZusammenfassung, TREND_FELDER: __m_kern_trend_js.FELDER, speicherMap: __m_kern_speicher_js.speicherMap, istSpeicher: __m_kern_speicher_js.istSpeicher, SPEICHER_SCHLUESSEL: __m_kern_speicher_js.SCHLUESSEL, demoDaten: __m_kern_demo_js.demoDaten, demoPuls: __m_kern_demo_js.demoPuls, MUSTERPERSON: __m_kern_demo_js.MUSTERPERSON, liveZone: __m_kern_live_js.zoneVon, laufendeBelastung: __m_kern_live_js.laufendeBelastung, rrFilter: __m_kern_live_js.rrFilter, hrvKurz: __m_kern_live_js.hrvKurz, atemKohaerenz: __m_kern_live_js.atemKohaerenz, pulsFormel: __m_kern_live_js.pulsFormel, tagAuswerten: __m_kern_tag_js.tagAuswerten, alleTage: __m_kern_tag_js.alleTage, auswerter: __m_kern_tag_js.auswerter, zusammenfuehren: __m_kern_zusammenfuehren_js.zusammenfuehren, zusammenlegen: __m_kern_zusammenfuehren_js.zusammenlegen, eineQuelle: __m_kern_zusammenfuehren_js.eineQuelle, gleicherSatz: __m_kern_zusammenfuehren_js.gleicherSatz, t: __m_kern_i18n_js.t, SPRACHEN: __m_kern_i18n_js.SPRACHEN, atemKatalog, tagebuchKatalog, maxPulsAus };
})();

// ===== daten/zeit.js
const __m_daten_zeit_js = (() => {
// Zeit-Hilfen der Datenschicht: Zeitangaben aus Health Connect und WHOOP-CSV in Unix-Millisekunden
// umrechnen und den Kalendertag (JJJJ-MM-TT) eines Zeitpunkts bestimmen.
// Rein: kein DOM, kein Netz, kein Speicher. Nur Intl für IANA-Zonen (z. B. "Europe/Berlin").

const MS_MINUTE = 60000;

/** Zahl mit führender Null (2 Stellen). */
function zwei(n) {
  return String(n).padStart(2, "0");
}

/**
 * Kalendertag eines Zeitpunkts.
 * @param {number} t Unix-Millisekunden
 * @param {number|null|undefined} zoneMin Abstand zur UTC in Minuten (z. B. +60 für MEZ). Fehlt er, gilt die Gerätezeitzone.
 * @returns {string} "JJJJ-MM-TT"
 */
function tagIso(t, zoneMin) {
  if (typeof zoneMin === "number" && Number.isFinite(zoneMin)) {
    const d = new Date(t + zoneMin * MS_MINUTE);
    return `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`;
  }
  const d = new Date(t);
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

/**
 * Zeitwert aus der Brücke: Zahl (ms) oder ISO-Text. Liefert ms oder null.
 */
function zeitMs(wert) {
  if (wert === null || wert === undefined || wert === "") return null;
  if (typeof wert === "number") return Number.isFinite(wert) ? Math.round(wert) : null;
  return leseZeit(String(wert));
}

/** Versatz einer IANA-Zone zu einem UTC-Zeitpunkt in Minuten, oder null bei unbekannter Zone. */
function ianaVersatz(zone, utcMs) {
  let format;
  try {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return null;
  }
  const teile = Object.fromEntries(format.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const alsUtc = Date.UTC(+teile.year, +teile.month - 1, +teile.day, +teile.hour % 24, +teile.minute, +teile.second);
  return Math.round((alsUtc - Math.floor(utcMs / 1000) * 1000) / MS_MINUTE);
}

/**
 * Zeitzonen-Text in Minuten Versatz. Versteht "UTC+01:00", "GMT-5", "+0100", "-05:30", "Z", "UTC"
 * und IANA-Namen ("Europe/Berlin", dann abhängig vom Zeitpunkt wegen Sommerzeit).
 * @param {string|number|null} zone
 * @param {number[]} felder [Jahr, Monat(1-12), Tag, Stunde, Minute, Sekunde, ms] der Wanduhrzeit (nur für IANA nötig)
 * @returns {number|null}
 */
function zoneZuMinuten(zone, felder) {
  if (typeof zone === "number" && Number.isFinite(zone)) return zone;
  if (zone === null || zone === undefined) return null;
  const text = String(zone).trim();
  if (text === "") return null;
  if (/^(z|utc|gmt)$/i.test(text)) return 0;
  const m = /^(?:utc|gmt)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
  if (m) {
    const min = Number(m[2]) * 60 + Number(m[3] || 0);
    return m[1] === "-" ? -min : min;
  }
  if (felder && /^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(text)) {
    // Wanduhrzeit → Zeitpunkt: zweimal nähern (genügt bei Sommerzeitwechseln).
    const wand = Date.UTC(felder[0], felder[1] - 1, felder[2], felder[3], felder[4], felder[5], felder[6]);
    let v = ianaVersatz(text, wand);
    if (v === null) return null;
    v = ianaVersatz(text, wand - v * MS_MINUTE);
    return v;
  }
  return null;
}

const MUSTER_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
const MUSTER_DE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const MUSTER_US = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i;

/**
 * Datum/Uhrzeit-Text in Unix-ms.
 * Formate: "2026-10-12 23:14:05", "2026-10-12T23:14:05Z", "...+02:00", "2026-10-12", "12.10.2026 23:14",
 * "10/12/2026 11:14:05 PM" (US-Reihenfolge Monat/Tag, weil WHOOP ein US-Anbieter ist), Epoche in s oder ms.
 * Zone: steht im Text ein Versatz, gilt er. Sonst `zone` (Minuten, "UTC+01:00" oder IANA). Sonst Gerätezeitzone.
 * @returns {number|null}
 */
function leseZeit(text, zone) {
  if (text === null || text === undefined) return null;
  const s = String(text).trim();
  if (s === "") return null;
  if (/^\d{13}$/.test(s)) return Number(s);
  if (/^\d{10}$/.test(s)) return Number(s) * 1000;

  let j, mo, d, h = 0, mi = 0, se = 0, ms = 0, versatzText = null;
  let m;
  if ((m = MUSTER_ISO.exec(s))) {
    [j, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    h = Number(m[4] || 0); mi = Number(m[5] || 0); se = Number(m[6] || 0);
    ms = m[7] ? Number(m[7].slice(0, 3).padEnd(3, "0")) : 0;
    versatzText = m[8] || null;
  } else if ((m = MUSTER_DE.exec(s))) {
    [d, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
    h = Number(m[4] || 0); mi = Number(m[5] || 0); se = Number(m[6] || 0);
  } else if ((m = MUSTER_US.exec(s))) {
    [mo, d, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
    h = Number(m[4] || 0); mi = Number(m[5] || 0); se = Number(m[6] || 0);
    const ampm = (m[7] || "").toLowerCase();
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  } else {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || se > 60) return null;

  const felder = [j, mo, d, h, mi, se, ms];
  const versatz = versatzText !== null ? zoneZuMinuten(versatzText) : zoneZuMinuten(zone, felder);
  if (versatz !== null) {
    return Date.UTC(j, mo - 1, d, h, mi, se, ms) - versatz * MS_MINUTE;
  }
  return new Date(j, mo - 1, d, h, mi, se, ms).getTime();
}

/** Versatz in Minuten, der für einen Zeitpunkt gilt (für `zoneMin` an Datensätzen), oder null. */
function versatzFuer(zone, utcMs) {
  if (zone === null || zone === undefined || zone === "") return null;
  const fest = zoneZuMinuten(zone);
  if (fest !== null) return fest;
  return ianaVersatz(String(zone).trim(), utcMs);
}
return { tagIso, zeitMs, zoneZuMinuten, leseZeit, versatzFuer };
})();

// ===== daten/ablage.js
const __m_daten_ablage_js = (() => {
// Ablage der normierten Messwerte im Speicher.
// Schlüssel: "messung:<art>:<JJJJ-MM-TT>" → Array von Datensätzen dieser Art an diesem Tag.
// Doppelte Datensätze (gleiche quelle.id) werden ersetzt, nicht verdoppelt.
// Der Speicher kommt von außen (Schnittstelle kern/speicher.js: lies, schreib, liste).

const { tagIso } = __m_daten_zeit_js;

/** Alle Arten eines Messpakets, in fester Reihenfolge. */
const ARTEN = [
  "herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch", "fremdwerte",
];

/** Leeres Messpaket: { herzschlag: [], hrv: [], … }. */
function leeresPaket() {
  return Object.fromEntries(ARTEN.map((a) => [a, []]));
}

/** Pakete zusammenlegen (ohne Abgleich, der passiert beim Ablegen). */
function paketeVereinen(...pakete) {
  const ziel = leeresPaket();
  for (const p of pakete) {
    if (!p) continue;
    // Schleife statt push(...p[a]): ein Abgleich über 90 Tage Herzschlag sprengt sonst den Aufrufstapel (> 100 000 Argumente)
    for (const a of ARTEN) if (Array.isArray(p[a])) for (const d of p[a]) ziel[a].push(d);
  }
  return ziel;
}

/** Anzahl Datensätze in einem Paket. */
function paketGroesse(paket) {
  return ARTEN.reduce((s, a) => s + (paket[a] ? paket[a].length : 0), 0);
}

/** Bezugszeitpunkt eines Datensatzes für Tag und Sortierung. Schlaf zählt zum Tag des Aufwachens. */
function bezugszeit(art, d) {
  if (art === "schlaf") return d.bis;
  if (art === "training") return d.von;
  if (art === "tagebuch" || art === "fremdwerte") return null;
  return d.t;
}

/** Kalendertag eines Datensatzes. */
function tagVon(art, d, zoneMin) {
  if (art === "tagebuch" || art === "fremdwerte") return d.tag;
  const z = typeof d.zoneMin === "number" ? d.zoneMin : zoneMin;
  return tagIso(bezugszeit(art, d), z);
}

function schluessel(art, tag) {
  return `messung:${art}:${tag}`;
}

/** Sortierung innerhalb eines Tages: Schlaf nach Einschlafen, sonst nach Bezugszeit. */
function sortierwert(art, d) {
  if (art === "schlaf") return d.von;
  const z = bezugszeit(art, d);
  return z === null ? 0 : z;
}

/**
 * Messpaket ablegen. Gleiche quelle.id ersetzt den alten Datensatz.
 * @param {{lies:Function, schreib:Function}} speicher
 * @param {object} paket
 * @param {{zoneMin?:number}} [optionen]
 * @returns {Promise<{neu:number, ersetzt:number, schluessel:string[], neuPaket:object}>} neuPaket = nur die neuen Datensätze
 */
async function speichereMessungen(speicher, paket, optionen = {}) {
  const gruppen = new Map();
  for (const art of ARTEN) {
    for (const d of paket[art] || []) {
      const tag = tagVon(art, d, optionen.zoneMin);
      if (!tag) continue;
      const k = schluessel(art, tag);
      if (!gruppen.has(k)) gruppen.set(k, { art, liste: [] });
      gruppen.get(k).liste.push(d);
    }
  }
  let neu = 0;
  let ersetzt = 0;
  const neuPaket = leeresPaket();
  for (const [k, { art, liste }] of gruppen) {
    const alt = (await speicher.lies(k)) || [];
    const nachId = new Map();
    for (const d of alt) nachId.set(d.quelle && d.quelle.id, d);
    for (const d of liste) {
      const id = d.quelle && d.quelle.id;
      if (nachId.has(id)) ersetzt += 1;
      else {
        neu += 1;
        neuPaket[art].push(d);
      }
      nachId.set(id, d);
    }
    const ergebnis = [...nachId.values()].sort((a, b) => sortierwert(art, a) - sortierwert(art, b));
    await speicher.schreib(k, ergebnis);
  }
  return { neu, ersetzt, schluessel: [...gruppen.keys()].sort(), neuPaket };
}

/** Alle Datensätze einer Art lesen (optional nur Tage von…bis, jeweils "JJJJ-MM-TT", einschließlich). */
async function leseMessungen(speicher, art, vonTag, bisTag) {
  const praefix = `messung:${art}:`;
  const schluesselListe = (await speicher.liste(praefix)).sort();
  const aus = [];
  for (const k of schluesselListe) {
    const tag = k.slice(praefix.length);
    if (vonTag && tag < vonTag) continue;
    if (bisTag && tag > bisTag) continue;
    const wert = await speicher.lies(k);
    if (Array.isArray(wert)) aus.push(...wert);
  }
  return aus;
}
return { ARTEN, leeresPaket, paketeVereinen, paketGroesse, bezugszeit, tagVon, schluessel, speichereMessungen, leseMessungen };
})();

// ===== daten/healthconnect.js
const __m_daten_healthconnect_js = (() => {
// Adapter Android Health Connect → normierte Messwerte (docs/technik/schnittstellen.md).
//
// Aufbau:
//  1. Die Brücke `window.MF.native.healthConnect` (vom Capacitor-Plugin, siehe daten/bruecke_capacitor.js) liefert
//     Rohdatensätze im "Brückenformat" (docs/technik/healthconnect.md): Feldnamen wie in Health Connect,
//     alle Zeiten als Unix-ms.
//  2. Die Zuordnung hier ist rein (keine Brücke, kein Speicher) und wird mit Fixtures getestet.
//  3. `synchronisieren` holt je Datenart nur das Neue seit dem letzten Abgleich und legt es im Speicher ab.
//
// Health Connect wird nur gelesen. Es gibt keine Netzverbindung.

const { zeitMs } = __m_daten_zeit_js;
const { ARTEN, leeresPaket, paketeVereinen, speichereMessungen, tagVon } = __m_daten_ablage_js;

/** Gelesene Health-Connect-Datenarten, in Abgleich-Reihenfolge (Training zuletzt, braucht Herzschlag). */
const RECORD_TYPEN = [
  "HeartRate",
  "HeartRateVariabilityRmssd",
  "RestingHeartRate",
  "RespiratoryRate",
  "OxygenSaturation",
  "SkinTemperature",
  "SleepSession",
  "ExerciseSession",
];

/** Health-Connect-Datenart → Art im Messpaket. */
const ART_ZU_PAKET = {
  HeartRate: "herzschlag",
  HeartRateVariabilityRmssd: "hrv",
  RestingHeartRate: "ruhepuls",
  RespiratoryRate: "atemfrequenz",
  OxygenSaturation: "spo2",
  SkinTemperature: "hauttemp",
  SleepSession: "schlaf",
  ExerciseSession: "training",
};

/**
 * Schlafstufen von Health Connect (SleepSessionRecord.STAGE_TYPE_*, Werte aus connect-client 1.1.0-alpha08)
 * → MF-Phasen. `null` = nicht verwertbar (Lücke).
 * SLEEPING (2) heißt "schläft, Stufe unbekannt": wird als "leicht" geführt und mit `unbestimmt: true` markiert.
 */
const SCHLAFSTUFEN = {
  0: null, // UNKNOWN
  1: "wach", // AWAKE
  2: "leicht", // SLEEPING (unbestimmt)
  3: "wach", // OUT_OF_BED
  4: "leicht", // LIGHT
  5: "tief", // DEEP
  6: "rem", // REM
  7: "wach", // AWAKE_IN_BED
};
const STUFEN_NAMEN = {
  UNKNOWN: 0, AWAKE: 1, SLEEPING: 2, OUT_OF_BED: 3, LIGHT: 4, DEEP: 5, REM: 6, AWAKE_IN_BED: 7,
};

/** Häufige Trainingsarten (ExerciseSessionRecord.EXERCISE_TYPE_*) → MF-Kürzel. Andere: "hc_<nummer>". */
const TRAININGSARTEN = {
  0: "sonstiges", 8: "radfahren", 9: "heimtrainer", 25: "crosstrainer", 33: "atemuebung", 36: "hiit",
  37: "wandern", 48: "pilates", 53: "rudern", 54: "rudergeraet", 56: "laufen", 57: "laufband", 64: "fussball",
  70: "krafttraining", 71: "dehnen", 73: "schwimmen_freiwasser", 74: "schwimmen_becken", 76: "tennis",
  79: "gehen", 81: "gewichtheben", 83: "yoga",
};

/** Ein Tag in Millisekunden. */
const TAG_MS = 24 * 3600 * 1000;

/**
 * Technische Vorgaben des Abgleichs (keine Rechenformeln, daher nicht in kern/formeln/formeln.json).
 * - rueckblickTage: Wie weit der allererste Abgleich zurückgreift (90 Tage, damit Basislinien und 30-Tage-Mittel gleich Futter
 *   haben). Health Connect gibt ohne Zusatzrecht (READ_HEALTH_DATA_HISTORY) ohnehin nur Daten bis 30 Tage vor der ersten Freigabe
 *   heraus; ältere Fenster kommen dann einfach leer zurück. Wer `ersterZeitraumMs` übergibt, überschreibt die Tage.
 * - ueberlappungMs: Jeder weitere Abgleich beginnt so viel früher als der letzte endete, weil WHOOP
 *   Daten verzögert nach Health Connect schreibt. Doppelte fängt der Abgleich über quelle.id ab.
 * - fensterMs: Größe eines Lesefensters. Ein Tag Herzschlag im Sekundentakt sind rund 86 400 Werte.
 * - kleinsterFensterMs: Scheitert ein Fenster, wird es halbiert, bis höchstens diese Größe erreicht ist (Befund 30.10.2026:
 *   Ein einzelnes gescheitertes Tagesfenster brach früher die ganze Art ab, die App zeigte nur Tage bis dorthin).
 * - wiederholungen / wartenMs: Versuche und Pause (ms) für ein kleinstes Fenster, bevor es als Lücke gilt.
 * - luckenSerieMax: So viele Lücken hintereinander, dann gibt der Abgleich diese Art für diesen Lauf auf.
 * - lesenZeitgrenzeMs / rechteZeitgrenzeMs: Antwortet die Brücke so lange nicht, wird der Aufruf mit einer Meldung beendet,
 *   statt endlos zu hängen (Lesen bzw. Rechte-Dialog).
 */
const VORGABEN = {
  rueckblickTage: 90,
  ueberlappungMs: 48 * 3600 * 1000,
  fensterMs: TAG_MS,
  kleinsterFensterMs: 3 * 3600 * 1000,
  wiederholungen: 1,
  wartenMs: 1500,
  luckenSerieMax: 3,
  lesenZeitgrenzeMs: 120 * 1000,
  rechteZeitgrenzeMs: 180 * 1000,
};

/** Fehlercodes des Kotlin-Plugins, bei denen Wiederholen oder Halbieren nichts hilft. */
const ENDGUELTIG = new Set(["keine_berechtigung", "nicht_unterstuetzt", "nicht_verfuegbar", "ungueltig"]);
const endgueltig = (fehler) => !!fehler && (ENDGUELTIG.has(fehler.code) || /berechtigung|permission|SecurityException/i.test(String(fehler.message || "")));

/** Promise mit Zeitgrenze: antwortet es nicht in `ms`, kommt ein Fehler mit `text`. */
function mitZeitgrenze(promise, ms, text) {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  let uhr;
  const grenze = new Promise((_, nein) => { uhr = setTimeout(() => nein(Object.assign(new Error(text), { code: "zeitgrenze" })), ms); });
  return Promise.race([promise, grenze]).finally(() => clearTimeout(uhr));
}

/** Beginn des allerersten Abgleichs in ms vor `jetzt` (aus den Vorgaben, s. o.). */
function ersterZeitraumMs(vorgaben = VORGABEN) {
  const v = { ...VORGABEN, ...vorgaben };
  return Number.isFinite(v.ersterZeitraumMs) ? v.ersterZeitraumMs : v.rueckblickTage * TAG_MS;
}

const SYNC_PRAEFIX = "sync:healthconnect:";

// ---------------------------------------------------------------------------------------------------
// Reine Zuordnung
// ---------------------------------------------------------------------------------------------------

function quelleHc(roh, typ, zusatz) {
  const meta = roh.metadata || {};
  const grundId = meta.id || `${typ}:${zeitMs(roh.time ?? roh.startTime)}`;
  const q = {
    art: "healthconnect",
    id: zusatz === undefined ? grundId : `${grundId}#${zusatz}`,
    datei: `HealthConnect/${typ}`,
  };
  if (meta.dataOrigin) q.herkunft = String(meta.dataOrigin);
  return q;
}

function zoneVon(roh, feld = "zoneOffsetSek") {
  const s = roh[feld] ?? roh.startZoneOffsetSek;
  return typeof s === "number" && Number.isFinite(s) ? Math.round(s / 60) : undefined;
}

function mitZone(d, zoneMin) {
  if (zoneMin !== undefined) d.zoneMin = zoneMin;
  return d;
}

function zahl(w) {
  if (w === null || w === undefined || w === "") return null;
  const n = typeof w === "number" ? w : Number(w);
  return Number.isFinite(n) ? n : null;
}

function stufeNummer(s) {
  if (typeof s === "number") return s;
  if (typeof s === "string") {
    const k = s.trim().toUpperCase().replace(/^STAGE_TYPE_/, "");
    if (k in STUFEN_NAMEN) return STUFEN_NAMEN[k];
    if (/^\d+$/.test(k)) return Number(k);
  }
  return 0;
}

/** HeartRate (Serie) → Herzschlag[] je Einzelmessung. */
function herzschlaegeAus(roh) {
  const aus = [];
  for (const r of roh) {
    const z = zoneVon(r, "startZoneOffsetSek");
    for (const s of r.samples || []) {
      const t = zeitMs(s.time);
      const bpm = zahl(s.beatsPerMinute);
      if (t === null || bpm === null) continue;
      aus.push(mitZone({ t, bpm, quelle: quelleHc(r, "HeartRate", t) }, z));
    }
  }
  return aus;
}

function punktwerte(roh, typ, feld, ziel) {
  const aus = [];
  for (const r of roh) {
    const t = zeitMs(r.time);
    const wert = zahl(r[feld]);
    if (t === null || wert === null) continue;
    aus.push(mitZone({ t, [ziel]: wert, quelle: quelleHc(r, typ) }, zoneVon(r)));
  }
  return aus;
}

/** SkinTemperature → Hauttemp[] je Abweichungswert (delta). `basisC` = Basis des Geräts, falls geliefert. */
function hauttempAus(roh) {
  const aus = [];
  for (const r of roh) {
    const basisC = zahl(r.baselineCelsius);
    const z = zoneVon(r, "startZoneOffsetSek");
    for (const d of r.deltas || []) {
      const t = zeitMs(d.time);
      const deltaC = zahl(d.deltaCelsius);
      if (t === null || deltaC === null) continue;
      aus.push(mitZone({ t, deltaC, basisC, quelle: quelleHc(r, "SkinTemperature", t) }, z));
    }
  }
  return aus;
}

/** SleepSession → Schlaf[]. Phasen sortiert, unbekannte Stufen ausgelassen. */
function schlafAus(roh) {
  const aus = [];
  for (const r of roh) {
    const von = zeitMs(r.startTime);
    const bis = zeitMs(r.endTime);
    if (von === null || bis === null || bis <= von) continue;
    const phasen = [];
    for (const st of r.stages || []) {
      const nr = stufeNummer(st.stage);
      const art = SCHLAFSTUFEN[nr] ?? null;
      const pv = zeitMs(st.startTime);
      const pb = zeitMs(st.endTime);
      if (!art || pv === null || pb === null || pb <= pv) continue;
      const p = { von: pv, bis: pb, art };
      if (nr === 2) p.unbestimmt = true;
      phasen.push(p);
    }
    phasen.sort((a, b) => a.von - b.von);
    const d = { von, bis, phasen, quelle: quelleHc(r, "SleepSession") };
    if (r.title) d.titel = String(r.title);
    // Der Tag einer Nacht ist der Aufwachtag (ablage.js bezugszeit = bis): deshalb gilt der Versatz am Ende der Sitzung
    // (bei Reisen über Zeitzonen unterscheidet er sich vom Versatz am Beginn); fehlt er, der vom Beginn.
    aus.push(mitZone(d, zoneVon(r, "endZoneOffsetSek")));
  }
  return aus;
}

/** Hat die Nacht echte Schlafstufen (Leicht/Tief/REM/Wach)? Nur "SLEEPING" (unbestimmt) oder gar keine Stufen → nein. */
function hatSchlafphasen(schlaf) {
  return Array.isArray(schlaf && schlaf.phasen) && schlaf.phasen.some((p) => !p.unbestimmt);
}

/**
 * Quelle/App-Zeile für den Beleg: "Health Connect · com.whoop.android" (nur für Health-Connect-Quellen, sonst "").
 * Die Shell hängt sie an die Quellenkarte (shell/apps/beleg.js), damit man sieht, welche App die Zahl nach Health Connect schrieb.
 */
function quellenAnzeige(quelle) {
  if (!quelle || quelle.art !== "healthconnect") return "";
  return quelle.herkunft ? `Health Connect · ${quelle.herkunft}` : "Health Connect";
}

/** ExerciseSession → Training[]; Herzschläge im Zeitraum [von, bis] werden angehängt. */
function trainingAus(roh, herzschlaege = []) {
  const sortiert = [...herzschlaege].sort((a, b) => a.t - b.t);
  const aus = [];
  for (const r of roh) {
    const von = zeitMs(r.startTime);
    const bis = zeitMs(r.endTime);
    if (von === null || bis === null || bis <= von) continue;
    const typNr = zahl(r.exerciseType) ?? 0;
    const d = {
      von,
      bis,
      art: TRAININGSARTEN[typNr] || `hc_${typNr}`,
      typNr,
      herzschlaege: sortiert.filter((h) => h.t >= von && h.t <= bis),
      quelle: quelleHc(r, "ExerciseSession"),
    };
    if (r.title) d.titel = String(r.title);
    aus.push(mitZone(d, zoneVon(r, "startZoneOffsetSek")));
  }
  return aus;
}

/**
 * Rohdatensätze einer Health-Connect-Datenart → Messpaket.
 * @param {string} typ z. B. "HeartRate"
 * @param {object[]} roh Datensätze im Brückenformat
 * @param {{herzschlaege?: object[]}} [zusatz] für ExerciseSession: Herzschläge zum Anhängen
 */
function zuordnen(typ, roh, zusatz = {}) {
  const paket = leeresPaket();
  const liste = Array.isArray(roh) ? roh : [];
  switch (typ) {
    case "HeartRate": paket.herzschlag = herzschlaegeAus(liste); break;
    case "HeartRateVariabilityRmssd": paket.hrv = punktwerte(liste, typ, "heartRateVariabilityMillis", "rmssdMs"); break;
    case "RestingHeartRate": paket.ruhepuls = punktwerte(liste, typ, "beatsPerMinute", "bpm"); break;
    case "RespiratoryRate": paket.atemfrequenz = punktwerte(liste, typ, "rate", "proMin"); break;
    case "OxygenSaturation": paket.spo2 = punktwerte(liste, typ, "percentage", "prozent"); break;
    case "SkinTemperature": paket.hauttemp = hauttempAus(liste); break;
    case "SleepSession": paket.schlaf = schlafAus(liste); break;
    case "ExerciseSession": paket.training = trainingAus(liste, zusatz.herzschlaege || []); break;
    default: throw new Error(`Unbekannte Health-Connect-Datenart: ${typ}`);
  }
  return paket;
}

// ---------------------------------------------------------------------------------------------------
// Brücke und Abgleich
// ---------------------------------------------------------------------------------------------------

/** Brücke aus `ziel.MF.native.healthConnect` holen, oder null. */
function findeBruecke(ziel = globalThis) {
  const b = ziel && ziel.MF && ziel.MF.native && ziel.MF.native.healthConnect;
  return b && typeof b.lesen === "function" ? b : null;
}

/** Ist Health Connect nutzbar? → { verfuegbar, grund } (grund: "kein_android" | Status der Brücke). */
async function verfuegbar(bruecke) {
  if (!bruecke) return { verfuegbar: false, grund: "kein_android" };
  try {
    const r = await bruecke.verfuegbar();
    if (typeof r === "boolean") return { verfuegbar: r, grund: r ? "verfuegbar" : "nicht_verfuegbar" };
    return { verfuegbar: !!(r && r.verfuegbar), grund: (r && r.status) || "unbekannt", ...r };
  } catch (e) {
    return { verfuegbar: false, grund: "fehler", fehler: String(e && e.message ? e.message : e) };
  }
}

/** Leserechte anfragen → { erteilt: string[], fehlend: string[] }. */
async function berechtigungen(bruecke, arten = RECORD_TYPEN, zeitgrenzeMs = VORGABEN.rechteZeitgrenzeMs) {
  if (!bruecke) return { erteilt: [], fehlend: [...arten] };
  const r = (await mitZeitgrenze(Promise.resolve(bruecke.berechtigungen(arten)), zeitgrenzeMs,
    "Health Connect hat auf die Rechte-Abfrage nicht geantwortet. Öffne Health Connect → App-Berechtigungen → MAEHR FIT und gib die Lese-Rechte frei; dann erneut „Verbinden“.")) || {};
  const erteilt = Array.isArray(r.erteilt) ? r.erteilt : [];
  return { erteilt, fehlend: arten.filter((a) => !erteilt.includes(a)) };
}

const text = (fehler) => String(fehler && fehler.message ? fehler.message : fehler);

/**
 * Schon erteilte Leserechte abfragen, ohne einen Dialog zu öffnen → { erteilt, fehlend }, oder null, wenn die Brücke das nicht kann
 * (ältere App-Fassung ohne Plugin-Methode „erteilt“) oder die Abfrage scheitert. Für den Abgleich beim Start der App.
 */
async function erteilteRechte(bruecke, arten = RECORD_TYPEN) {
  if (!bruecke || typeof bruecke.erteilt !== "function") return null;
  try {
    // Zeitgrenze wie beim Lesen: hängt die Abfrage, darf der Abgleich beim Start nicht für immer „läuft“ bleiben
    const r = (await mitZeitgrenze(Promise.resolve(bruecke.erteilt(arten)), VORGABEN.lesenZeitgrenzeMs, "Health Connect: Rechte-Abfrage ohne Antwort.")) || {};
    if (!Array.isArray(r.erteilt)) return null;
    return { erteilt: r.erteilt, fehlend: arten.filter((a) => !r.erteilt.includes(a)) };
  } catch {
    return null;
  }
}

/**
 * Inkrementeller Abgleich: je Datenart ab dem letzten Stand (minus Überlappung) bis jetzt lesen, in Tagesfenstern
 * (damit die Brücke nie zu große Antworten liefern muss), zuordnen, ablegen und nach jedem Fenster den Stand merken
 * ("sync:healthconnect:<Datenart>" → { bisMs, zeitpunktMs, anzahl gelesen in diesem Lauf }).
 *
 * Scheitert ein Fenster (Zeitüberschreitung, zu große Antwort, Quote von Health Connect), wird es halbiert und noch einmal
 * versucht; ein kleinstes Fenster, das auch nach Wiederholung scheitert, wird als Lücke gemeldet und übersprungen.
 * Der Stand bleibt dann am Beginn der ersten Lücke, der nächste Lauf liest sie wieder. Drei Lücken hintereinander (oder ein
 * endgültiger Fehler wie fehlendes Recht) beenden diese Art für diesen Lauf; die anderen Arten laufen weiter.
 * Nichts wird verschluckt: `arten[typ].fehler` und `arten[typ].luecken` nennen jeden Fehler, oben stehen `fehler` (Texte),
 * `zaehlung` (gelesene Datensätze je MF-Art), `zeitraum` (erster/letzter Kalendertag) und `luecken`.
 * `herkunft` nennt je MF-Art die schreibenden Apps (Paketname) mit Anzahl, `schlafPhasen` die Nächte mit/ohne echte Schlafstufen.
 * `paket` im Ergebnis enthält nur die neu hinzugekommenen Datensätze.
 * @param {{bruecke:object, speicher:object, jetzt?:number, arten?:string[], vorgaben?:object,
 *   fortschritt?:(info:{typ:string, art:string, nr:number, von:number, gelesen:number, phase:string})=>void}} p
 */
async function synchronisieren({ bruecke, speicher, jetzt = Date.now(), arten = RECORD_TYPEN, vorgaben = {}, fortschritt }) {
  if (!bruecke) throw new Error("Health Connect ist nur in der Android-App verfügbar.");
  const v = { ...VORGABEN, ...vorgaben };
  const warte = v.warte || ((ms) => new Promise((ok) => setTimeout(ok, ms)));
  const ergebnis = {
    arten: {}, neu: 0, ersetzt: 0, paket: leeresPaket(), zaehlung: {}, zeitraum: null, luecken: [], fehler: [],
    herkunft: {}, // gelesene Datensätze je MF-Art und App: { hrv: { "com.whoop.android": 12 } } (je quelle.id einmal gezählt)
    schlafPhasen: { mit: 0, ohne: 0 }, // gelesene Nächte mit/ohne echte Schlafstufen (leer → Schlafansicht zeigt 0 Minuten je Phase)
  };
  const meldung = (info) => { try { fortschritt?.(info); } catch { /* Anzeige darf den Abgleich nie stören */ } };
  const reihenfolge = RECORD_TYPEN.filter((t) => arten.includes(t));
  for (const typ of reihenfolge) {
    const stand = await speicher.lies(SYNC_PRAEFIX + typ);
    // Weiter ab dem letzten Stand (minus Überlappung) bis jetzt; ohne Stand: erster Abgleich, rueckblickTage zurück.
    // Leere Fenster (Tage ohne Werte) beenden die Schleife nicht; gescheiterte werden halbiert, wiederholt oder als Lücke gemeldet (s. u.).
    const von = stand && typeof stand.bisMs === "number" ? Math.min(stand.bisMs, jetzt) - v.ueberlappungMs : jetzt - ersterZeitraumMs(v);
    const bericht = { vonMs: von, bisMs: von, gelesen: 0, neu: 0, ersetzt: 0, luecken: [] };
    ergebnis.arten[typ] = bericht;
    const mfArt = ART_ZU_PAKET[typ];
    const nrGesamt = Math.max(1, Math.ceil((jetzt - von) / v.fensterMs));
    let ersteLuecke = null, serie = 0, nr = 0;
    const gezaehlt = new Set();
    /** Herkunft (App) und Schlafstufen der gelesenen Datensätze vermerken; Überlappung der Fenster zählt nicht doppelt. */
    const vermerke = (paket) => {
      for (const d of paket[mfArt]) {
        const id = d.quelle && d.quelle.id;
        if (gezaehlt.has(id)) continue;
        gezaehlt.add(id);
        const app = (d.quelle && d.quelle.herkunft) || "unbekannt";
        const h = (ergebnis.herkunft[mfArt] = ergebnis.herkunft[mfArt] || {});
        h[app] = (h[app] || 0) + 1;
        if (mfArt === "schlaf") ergebnis.schlafPhasen[hatSchlafphasen(d) ? "mit" : "ohne"] += 1;
      }
    };

    /** Ein Fenster lesen; true = gelesen und abgelegt, false = Lücke. Wirft nur bei endgültigem Fehler oder Ablagefehler. */
    const fenster = async (a, e) => {
      let roh = null, letzterFehler = null;
      for (let versuch = 0; versuch <= v.wiederholungen && roh === null; versuch++) {
        try {
          roh = (await mitZeitgrenze(Promise.resolve(bruecke.lesen(typ, a, e)), v.lesenZeitgrenzeMs,
            `Health Connect hat beim Lesen von ${typ} nicht geantwortet (Zeitgrenze ${Math.round(v.lesenZeitgrenzeMs / 1000)} s).`)) || [];
        } catch (fehler) {
          letzterFehler = fehler;
          if (endgueltig(fehler)) throw fehler;
          if (e - a > v.kleinsterFensterMs) {
            // Fenster halbieren: kleinere Antworten, und die Lücke bleibt so klein wie möglich
            const mitte = a + Math.floor((e - a) / 2);
            const links = await fenster(a, mitte);
            const rechts = await fenster(mitte, e);
            return links && rechts;
          }
          if (versuch < v.wiederholungen) await warte(v.wartenMs);
        }
      }
      if (roh === null) {
        bericht.luecken.push({ vonMs: a, bisMs: e, fehler: text(letzterFehler) });
        ergebnis.luecken.push({ typ, vonMs: a, bisMs: e, fehler: text(letzterFehler) });
        if (ersteLuecke === null) ersteLuecke = a;
        bericht.fehler = bericht.fehler || text(letzterFehler);
        return false;
      }
      const paket = zuordnen(typ, roh, typ === "ExerciseSession" ? await herzschlaegeFuer(bruecke, roh) : {});
      for (const art of ARTEN) for (const d of paket[art]) {
        const tag = tagVon(art, d);
        if (!tag) continue;
        if (bericht.vonTag === undefined || tag < bericht.vonTag) bericht.vonTag = tag;
        if (bericht.bisTag === undefined || tag > bericht.bisTag) bericht.bisTag = tag;
      }
      vermerke(paket);
      const abgelegt = await speichereMessungen(speicher, paket);
      bericht.gelesen += roh.length;
      bericht.neu += abgelegt.neu;
      bericht.ersetzt += abgelegt.ersetzt;
      ergebnis.paket = paketeVereinen(ergebnis.paket, abgelegt.neuPaket);
      return true;
    };

    for (let a = von; a < jetzt; ) {
      const e = Math.min(a + v.fensterMs, jetzt);
      nr += 1;
      meldung({ typ, art: mfArt, nr, von: nrGesamt, gelesen: bericht.neu + bericht.ersetzt, phase: "lesen" });
      try {
        const gut = await fenster(a, e);
        serie = gut ? 0 : serie + 1;
        // Stand: bis zum Ende dieses Fensters, aber nie hinter die erste Lücke (die liest der nächste Lauf noch einmal)
        bericht.bisMs = ersteLuecke ?? e;
        await speicher.schreib(SYNC_PRAEFIX + typ, { bisMs: bericht.bisMs, zeitpunktMs: jetzt, anzahl: bericht.gelesen });
        if (serie >= v.luckenSerieMax) { bericht.fehler = `${bericht.fehler || "Lesefehler"} (abgebrochen nach ${serie} Lücken hintereinander)`; break; }
      } catch (fehler) {
        bericht.fehler = text(fehler);
        break;
      }
      a = e;
    }
    ergebnis.neu += bericht.neu;
    ergebnis.ersetzt += bericht.ersetzt;
    if (bericht.neu + bericht.ersetzt > 0) ergebnis.zaehlung[mfArt] = (ergebnis.zaehlung[mfArt] || 0) + bericht.neu + bericht.ersetzt;
    if (bericht.vonTag !== undefined) {
      if (!ergebnis.zeitraum) ergebnis.zeitraum = { von: bericht.vonTag, bis: bericht.bisTag };
      else {
        if (bericht.vonTag < ergebnis.zeitraum.von) ergebnis.zeitraum.von = bericht.vonTag;
        if (bericht.bisTag > ergebnis.zeitraum.bis) ergebnis.zeitraum.bis = bericht.bisTag;
      }
    }
    if (bericht.fehler) ergebnis.fehler.push(`${typ}: ${bericht.fehler}`);
  }
  return ergebnis;
}

/** Herzschläge für die Zeiträume der Trainings holen. Ohne Herzschlag-Recht: Training ohne Kurve. */
async function herzschlaegeFuer(bruecke, sitzungen) {
  const herzschlaege = [];
  for (const s of sitzungen) {
    const von = zeitMs(s.startTime);
    const bis = zeitMs(s.endTime);
    if (von === null || bis === null || bis <= von) continue;
    try {
      herzschlaege.push(...herzschlaegeAus((await bruecke.lesen("HeartRate", von, bis)) || []));
    } catch {
      return { herzschlaege: [] };
    }
  }
  return { herzschlaege };
}
return { RECORD_TYPEN, ART_ZU_PAKET, SCHLAFSTUFEN, TRAININGSARTEN, TAG_MS, VORGABEN, mitZeitgrenze, ersterZeitraumMs, SYNC_PRAEFIX, herzschlaegeAus, hauttempAus, schlafAus, hatSchlafphasen, quellenAnzeige, trainingAus, zuordnen, findeBruecke, verfuegbar, berechtigungen, erteilteRechte, synchronisieren };
})();

// ===== daten/bruecke_capacitor.js
const __m_daten_bruecke_capacitor_js = (() => {
// Brücke Capacitor-Plugin → `window.MF.native.healthConnect`.
// Das Plugin "HealthConnect" (android/plugins/healthconnect/, Kotlin) ist nur in der Android-App vorhanden.
// Im Browser bleibt `MF.native.healthConnect` leer; die App zeigt dann "Nur in der Android-App".

/**
 * Plugin-Objekt von Capacitor holen, oder null (Browser, Tests).
 * Ohne gebündeltes @capacitor/core legt die native Brücke (native-bridge.js, Capacitor 6) selbst `Capacitor.Plugins.HealthConnect`
 * an (Methoden → `Capacitor.nativePromise`); `registerPlugin` gibt es nur mit @capacitor/core und ist hier der Ausweg.
 */
function plugin(ziel) {
  const cap = ziel && ziel.Capacitor;
  if (!cap) return null;
  if (typeof cap.isNativePlatform === "function" && !cap.isNativePlatform()) return null;
  if (cap.Plugins && cap.Plugins.HealthConnect) return cap.Plugins.HealthConnect;
  if (typeof cap.registerPlugin === "function") return cap.registerPlugin("HealthConnect");
  return null;
}

/**
 * Brücke einrichten. Methoden:
 *   verfuegbar()                 → { verfuegbar, status, hauttemp, verlauf }
 *   berechtigungen(arten)        → { erteilt: string[] }   (öffnet den Health-Connect-Dialog, wenn nötig)
 *   erteilt(arten)               → { erteilt: string[] }   (nur nachsehen, nie ein Dialog; für den Abgleich beim Start)
 *   lesen(art, vonMs, bisMs)     → Datensätze im Brückenformat (docs/technik/healthconnect.md)
 *   einstellungen()              → öffnet die Health-Connect-Einstellungen
 * @returns {object|null} die Brücke oder null, wenn kein Plugin da ist
 */
function installiereBruecke(ziel = globalThis) {
  const p = plugin(ziel);
  if (!p) return null;
  const bruecke = {
    verfuegbar: () => p.verfuegbar(),
    berechtigungen: (arten) => p.berechtigungen({ arten }),
    erteilt: (arten) => p.erteilt({ arten }),
    lesen: async (art, vonMs, bisMs) => {
      const r = await p.lesen({ art, vonMs: Math.round(vonMs), bisMs: Math.round(bisMs) });
      return (r && r.datensaetze) || [];
    },
    einstellungen: () => p.einstellungen(),
  };
  ziel.MF = ziel.MF || {};
  ziel.MF.native = ziel.MF.native || {};
  ziel.MF.native.healthConnect = bruecke;
  return bruecke;
}

// ---------------------------------------------------------------------------------------------------
// Hintergrund-Abgleich, Mitteilungen und Widgets (Plugin "Hintergrund", android/plugins/hintergrund/, Kotlin).
// Angehängt am 01.11.2026 (docs/technik/hintergrund.md). Nur in der Android-App; im Browser bleibt alles leer.
// ---------------------------------------------------------------------------------------------------

/** Plugin "Hintergrund" holen, oder null. */
function hintergrundPlugin(ziel) {
  const cap = ziel && ziel.Capacitor;
  if (!cap) return null;
  if (typeof cap.isNativePlatform === "function" && !cap.isNativePlatform()) return null;
  if (cap.Plugins && cap.Plugins.Hintergrund) return cap.Plugins.Hintergrund;
  if (typeof cap.registerPlugin === "function") return cap.registerPlugin("Hintergrund");
  return null;
}

/**
 * Brücken einrichten: `MF.native.hintergrund`, `MF.native.mitteilungen`, `MF.native.widgets`, `MF.native.geraet`.
 *   hintergrund.status()                         → { aktiv, intervallMin, letzterLauf, naechsterLauf, hc, mitteilungen, widgets, geraet, … }
 *   hintergrund.jetzt()                          → startet sofort einen Lauf (Android entscheidet über den genauen Zeitpunkt)
 *   hintergrund.einstellen({ aktiv, intervallMin }) → plant den stündlichen Lauf neu (30, 60 oder 120 Minuten)
 *   hintergrund.eingangUebernehmen()             → { marke, dateien: { HeartRate: "jsonl", … } } (der Korb wird beiseitegelegt)
 *   hintergrund.eingangBestaetigen({ marke })    → beiseitegelegten Korb löschen
 *   hintergrund.kontextSchreiben({ json, marke, einstellungen }) → Messwerte der letzten Wochen für die Rechnung im Hintergrund
 *   hintergrund.zusammenfassungSchreiben({ json }) → Zusammenfassung für Mitteilung und Widgets (aktualisiert die Widgets)
 *   hintergrund.hcHintergrundAnfragen()          → { erteilt } (Health-Connect-Dialog „Im Hintergrund lesen“)
 *   hintergrund.beiWeg(fn)                       → fn("#/heute") nach Tippen auf Mitteilung oder Widget
 *   mitteilungen.einstellen({ morgen: { aktiv, uhrzeit }, erholung: { aktiv }, schlaf: { aktiv } }) (uhrzeit "07:30" oder "aufwachen")
 *   mitteilungen.test() · mitteilungen.recht() → { recht: "granted"|"denied"|"prompt" } · mitteilungen.rechtAnfragen()
 *   widgets.aktualisieren()
 *   geraet.akkuEinstellungen() · geraet.autostartEinstellungen() · geraet.mitteilungsEinstellungen() · geraet.healthConnect()
 * @returns {object|null} MF.native.hintergrund oder null ohne Plugin
 */
function installiereHintergrundBruecke(ziel = globalThis) {
  const p = hintergrundPlugin(ziel);
  if (!p) return null;
  const hintergrund = {
    status: () => p.status(),
    jetzt: () => p.jetzt(),
    einstellen: (o) => p.einstellen(o || {}),
    eingangUebernehmen: () => p.eingangUebernehmen(),
    eingangBestaetigen: (o) => p.eingangBestaetigen(o || {}),
    kontextSchreiben: (o) => p.kontextSchreiben(o || {}),
    zusammenfassungSchreiben: (o) => p.zusammenfassungSchreiben(o || {}),
    widgetsAktualisieren: () => p.widgetsAktualisieren(),
    hcHintergrundAnfragen: () => p.hcHintergrundAnfragen(),
    beiWeg: (fn) => (typeof p.addListener === "function" ? p.addListener("weg", (e) => fn(e && e.weg)) : null),
  };
  const mitteilungen = {
    einstellen: (o) => p.mitteilungenEinstellen(o || {}),
    test: () => p.mitteilungTest(),
    recht: () => p.mitteilungenRecht(),
    rechtAnfragen: () => p.mitteilungenRechtAnfragen(),
  };
  const widgets = { aktualisieren: () => p.widgetsAktualisieren() };
  const geraet = {
    akkuEinstellungen: () => p.oeffnen({ ziel: "akku" }),
    autostartEinstellungen: () => p.oeffnen({ ziel: "autostart" }),
    mitteilungsEinstellungen: () => p.oeffnen({ ziel: "mitteilungen" }),
    healthConnect: () => p.oeffnen({ ziel: "healthconnect" }),
  };
  ziel.MF = ziel.MF || {};
  ziel.MF.native = ziel.MF.native || {};
  Object.assign(ziel.MF.native, { hintergrund, mitteilungen, widgets, geraet });
  return hintergrund;
}
return { installiereBruecke, installiereHintergrundBruecke };
})();

// ===== shell/i18n/i18n.js
const __m_shell_i18n_i18n_js = (() => {
/* shell/i18n/i18n.js – Texte der Oberfläche auf Deutsch und Englisch.
 *
 * Kernaussage: Jeder sichtbare Satz steht hier einmal auf Deutsch und einmal auf Englisch. Die Ansichten holen ihn mit
 * t("schluessel", { platzhalter }). Fehlt ein Text in einer Sprache, gilt Englisch, dann Deutsch (tests/node/shell_i18n.test.mjs
 * prüft, dass beide Sprachen vollständig sind). Ton: warm, „du“, keine medizinischen Aussagen – Messwerte und Tendenzen.
 *
 * Schnittstelle: t(schluessel, werte?, sprache?) · sprache() · setzeSprache(s) · locale(s?) · SPRACHEN · TEXTE
 */
const SPRACHEN = [{ id: "de", name: "Deutsch", kurz: "DE", locale: "de-DE" }, { id: "en", name: "English", kurz: "EN", locale: "en-GB" }];
let aktuell = "de";
const sprache = () => aktuell;
function setzeSprache(s) { if (SPRACHEN.some((x) => x.id === s)) aktuell = s; return aktuell; }
const locale = (s = aktuell) => (SPRACHEN.find((x) => x.id === s) || SPRACHEN[0]).locale;

/** [deutsch, englisch] */
const TEXTE = {
  // Rahmen
  app_name: ["MAEHR FIT", "MAEHR FIT"],
  marke_titel: ["MAEHR FIT – Startseite", "MAEHR FIT – home"],
  reiter_heute: ["Heute", "Today"], reiter_schlaf: ["Schlaf", "Sleep"], reiter_belastung: ["Belastung", "Strain"], reiter_atem: ["Atem", "Breathe"], reiter_mehr: ["Mehr", "More"],
  reiter_label: ["Hauptbereiche", "Main sections"],
  tag_vorher: ["Tag davor", "Previous day"], tag_nachher: ["Tag danach", "Next day"], tag_heute: ["heute", "today"], tag_gestern: ["gestern", "yesterday"],
  tag_waehlen: ["Tag: {tag}. Tippen springt zu heute.", "Day: {tag}. Tap to jump to today."],
  thema: ["Hell oder dunkel umschalten (jetzt: {wert})", "Switch light or dark (now: {wert})"],
  thema_auto: ["wie das Gerät", "like the device"], thema_hell: ["hell", "light"], thema_dunkel: ["dunkel", "dark"],
  sprache_wechseln: ["Sprache wechseln (jetzt: Deutsch)", "Change language (now: English)"],
  menue: ["Menü", "Menu"],
  demo_chip: ["Demodaten der Musterperson – alle Werte sind erfunden.", "Demo data of the sample person – all values are made up."],
  demo_verbinden: ["Eigene Daten verbinden", "Connect your own data"],
  schliessen: ["Schließen", "Close"], zurueck: ["Zurück", "Back"],
  laedt: ["Deine Werte werden geladen …", "Loading your values …"],
  fehler_start: ["Beim Start ist etwas schiefgegangen: {text}. Lade die Seite bitte neu.", "Something went wrong at start: {text}. Please reload the page."],
  zum_letzten_tag: ["Zum letzten Tag mit Messwerten", "Go to the last day with measurements"],
  keine_daten_tag: ["Für diesen Tag liegen noch keine Messwerte vor.", "There are no measurements for this day yet."],
  hinweis_medizin: ["MAEHR FIT zeigt Messwerte und Tendenzen. Es ist kein Medizinprodukt und ersetzt keinen ärztlichen Rat.", "MAEHR FIT shows measurements and trends. It is not a medical device and does not replace medical advice."],

  // Einheiten und Vergleich
  einheit_ms: ["ms", "ms"], einheit_bpm: ["S/min", "bpm"], einheit_von21: ["von 21", "of 21"], einheit_pro_min: ["/min", "/min"],
  vgl_hoch: ["über deinem Mittel", "above your average"], vgl_runter: ["unter deinem Mittel", "below your average"], vgl_gleich: ["wie üblich", "as usual"],
  vgl_neu: ["noch keine Basislinie", "no baseline yet"],
  vgl_bedarf_unter: ["unter deinem Bedarf", "below your need"], vgl_bedarf_gedeckt: ["Bedarf gedeckt", "need covered"],
  hrv_formel: ["HRV der Nacht = Mittel aller HRV-Messungen (RMSSD) während des Schlafs; verglichen mit dem Mittel deiner letzten 30 Tage.", "Night HRV = average of all HRV measurements (RMSSD) during sleep; compared with your average of the last 30 days."],
  ruhepuls_formel: ["Ruhepuls laut Messung am Morgen; verglichen mit dem Mittel deiner letzten 30 Tage.", "Resting heart rate as measured in the morning; compared with your average of the last 30 days."],
  basis_mittel: ["Mittel der letzten 30 Tage", "Average of the last 30 days"], basis_streuung: ["Streuung (üblicher Bereich ±)", "Spread (usual range ±)"], basis_n: ["Anzahl Tage", "Number of days"],
  messwert: ["Messwert", "Measurement"],
  vgl_aria: ["{name} {wert}, {vergleich} ({mittel})", "{name} {wert}, {vergleich} ({mittel})"],
  mittel_text: ["Mittel {wert}", "average {wert}"],
  stufe_gruen: ["grün", "green"], stufe_gelb: ["gelb", "yellow"], stufe_rot: ["rot", "red"],
  stufe_text: ["Bereich {stufe}", "{stufe} zone"],

  // Heute
  heute_titel: ["Heute", "Today"],
  heute_kern_gruen: ["Du bist heute gut erholt: {wert}.", "You are well recovered today: {wert}."],
  heute_kern_gelb: ["Du bist heute mittel erholt: {wert}.", "You are moderately recovered today: {wert}."],
  heute_kern_rot: ["Du bist heute wenig erholt: {wert}.", "You are not very recovered today: {wert}."],
  tag_kern_gruen: ["Am {tag} warst du gut erholt: {wert}.", "On {tag} you were well recovered: {wert}."],
  tag_kern_gelb: ["Am {tag} warst du mittel erholt: {wert}.", "On {tag} you were moderately recovered: {wert}."],
  tag_kern_rot: ["Am {tag} warst du wenig erholt: {wert}.", "On {tag} you were not very recovered: {wert}."],
  heute_kern_leer: ["Für diesen Tag fehlt noch die Nacht, darum gibt es keine Erholung.", "The night for this day is missing, so there is no recovery value."],
  heute_nacht_kurz_ruhig: ["Die Nacht war kürzer als dein Bedarf, aber ruhig.", "The night was shorter than you need, but calm."],
  heute_nacht_kurz_unruhig: ["Die Nacht war kürzer als dein Bedarf und etwas unruhig.", "The night was shorter than you need and a little restless."],
  heute_nacht_lang_ruhig: ["Die Nacht hat deinen Bedarf gedeckt und war ruhig.", "The night covered your need and was calm."],
  heute_nacht_lang_unruhig: ["Die Nacht hat deinen Bedarf gedeckt, war aber etwas unruhig.", "The night covered your need but was a little restless."],
  erholung: ["Erholung", "Recovery"],
  erholung_ring_desc: ["Der Bogen zeigt die Erholung von 0 bis 100 %.", "The arc shows recovery from 0 to 100 %."],
  kachel_belastung: ["Belastung heute", "Strain today"], kachel_schlaf: ["Schlaf", "Sleep"], kachel_hrv: ["HRV", "HRV"], kachel_ruhepuls: ["Ruhepuls", "Resting HR"],
  heute_gliederung: ["Woraus sich die Erholung zusammensetzt", "What recovery is made of"],
  heute_gliederung_satz: ["50 Punkte sind ein für dich üblicher Morgen. Die Messwerte der Nacht schieben die Zahl mit festen Gewichten nach oben oder unten, auffällige Werte ziehen Punkte ab. Tippe einen Wert an, um seine Herkunft zu sehen.", "50 points is a usual morning for you. The overnight measurements move the number up or down with fixed weights; unusual values deduct points. Tap a value to see where it comes from."],
  teil_hauttemp: ["Hauttemperatur", "Skin temperature"], teil_spo2: ["Sauerstoffsättigung", "Blood oxygen"],
  punkte: ["{wert} Punkte", "{wert} points"], beitrag_text: ["Beitrag zur Erholung", "Contribution to recovery"], abzug: ["Abzug", "deduction"],
  phase_nachatmen: ["Nachatmen", "Top up"],
  teil_hrv: ["Herzratenvariabilität (HRV)", "Heart rate variability (HRV)"], teil_ruhepuls: ["Ruhepuls", "Resting heart rate"], teil_schlaf: ["Schlafleistung", "Sleep performance"], teil_atem: ["Atemfrequenz", "Respiratory rate"],
  gewicht: ["Gewicht {wert}", "weight {wert}"],
  heute_woche_titel: ["Erholung der letzten 7 Tage", "Recovery over the last 7 days"],
  heute_woche_kern: ["An {n} von {gesamt} Tagen warst du im grünen Bereich.", "You were in the green zone on {n} of {gesamt} days."],
  band_ueblich: ["dein üblicher Bereich", "your usual range"],

  // Schlaf
  schlaf_titel: ["Schlaf", "Sleep"],
  schlaf_kern_weniger: ["Du hast {wert} weniger geschlafen, als du gebraucht hättest.", "You slept {wert} less than you needed."],
  schlaf_kern_genug: ["Du hast so lange geschlafen, wie du gebraucht hast: {wert}.", "You slept as long as you needed: {wert}."],
  schlaf_kern_leer: ["Für diese Nacht liegen keine Schlafdaten vor.", "There is no sleep data for this night."],
  schlaf_bedarf_titel: ["Bedarf und geschlafene Zeit", "Need and time asleep"],
  schlaf_bedarf_kern: ["Der Balken „Geschlafen“ zeigt, wie viel von deinem Bedarf die Nacht gedeckt hat.", "The “asleep” bar shows how much of your need the night covered."],
  schlaf_bedarf: ["Bedarf", "Need"], schlaf_geschlafen: ["Geschlafen", "Asleep"],
  schlaf_phasen_titel: ["Schlafphasen", "Sleep stages"],
  schlaf_phasen_kern: ["Tief- und Traumschlaf machten zusammen {wert} der Nacht aus.", "Deep and REM sleep together made up {wert} of the night."],
  phase_wach: ["Wach", "Awake"], phase_leicht: ["Leicht", "Light"], phase_tief: ["Tief", "Deep"], phase_rem: ["Traum (REM)", "REM"],
  schlaf_kacheln: ["Regelmäßigkeit und Schuld", "Consistency and debt"],
  kachel_konstanz: ["Regelmäßigkeit", "Consistency"], kachel_schuld: ["Schlafschuld", "Sleep debt"], kachel_leistung: ["Schlafleistung", "Sleep performance"], kachel_zeiten: ["Im Bett", "In bed"],
  konstanz_satz: ["Einschlafzeit der letzten 7 Nächte", "Bedtime over the last 7 nights"],
  schuld_satz: ["fehlt dir aus dieser Nacht", "missing from this night"],
  leistung_satz: ["vom Bedarf gedeckt", "of your need covered"],
  zeiten_satz: ["von {von} bis {bis}", "from {von} to {bis}"],
  schlaf_bedarf_gliederung: ["Woraus sich dein Bedarf zusammensetzt", "What your need is made of"],
  bedarf_basis: ["Grundbedarf", "Base need"], bedarf_belastung: ["Ausgleich für die Belastung von gestern", "Extra for yesterday’s strain"], bedarf_schuld: ["Anteil der Schlafschuld", "Share of sleep debt"], bedarf_nickerchen: ["Nickerchen", "Naps"],

  // Belastung
  belastung_titel: ["Belastung", "Strain"],
  belastung_kern_mehr: ["Heute hast du {wert} von 21 Belastung gesammelt, mehr als an deinen üblichen Tagen.", "Today you collected {wert} of 21 strain, more than on your usual days."],
  belastung_kern_weniger: ["Heute hast du {wert} von 21 Belastung gesammelt, weniger als an deinen üblichen Tagen.", "Today you collected {wert} of 21 strain, less than on your usual days."],
  belastung_kern_gleich: ["Heute hast du {wert} von 21 Belastung gesammelt, so viel wie an deinen üblichen Tagen.", "Today you collected {wert} of 21 strain, about as much as on your usual days."],
  belastung_tag_mehr: ["Am {tag} hast du {wert} von 21 Belastung gesammelt, mehr als an deinen üblichen Tagen.", "On {tag} you collected {wert} of 21 strain, more than on your usual days."],
  belastung_tag_weniger: ["Am {tag} hast du {wert} von 21 Belastung gesammelt, weniger als an deinen üblichen Tagen.", "On {tag} you collected {wert} of 21 strain, less than on your usual days."],
  belastung_tag_gleich: ["Am {tag} hast du {wert} von 21 Belastung gesammelt, so viel wie an deinen üblichen Tagen.", "On {tag} you collected {wert} of 21 strain, about as much as on your usual days."],
  belastung_ring_desc: ["Der Bogen zeigt die Belastung auf der Skala von 0 bis 21.", "The arc shows strain on the scale from 0 to 21."],
  belastung_label: ["Belastung", "Strain"],
  zonen_titel: ["Zeit in den Pulszonen", "Time in heart rate zones"],
  zonen_kern: ["Die meiste Zeit mit erhöhtem Puls lag in Zone {zone}.", "Most of your time with raised heart rate was in zone {zone}."],
  zonen_kern_leer: ["Heute lag dein Puls nie in einer Belastungszone.", "Today your heart rate never reached a strain zone."],
  zone_1: ["Zone 1 · sehr locker", "Zone 1 · very easy"], zone_2: ["Zone 2 · locker", "Zone 2 · easy"], zone_3: ["Zone 3 · mittel", "Zone 3 · moderate"], zone_4: ["Zone 4 · zügig", "Zone 4 · hard"], zone_5: ["Zone 5 · sehr zügig", "Zone 5 · very hard"],
  trainings_titel: ["Trainings", "Workouts"],
  belastung_kern_keine: ["Für diesen Tag liegen weder Pulswerte noch ein Training vor – MAEHR FIT rechnet deshalb keine Belastung.", "There are no heart-rate values and no workout for this day, so MAEHR FIT calculates no strain."],
  belastung_kern_keine_whoop: ["Für diesen Tag liegen weder Pulswerte noch ein Training vor – MAEHR FIT rechnet keine Belastung. WHOOP nennt {wert} von 21.", "There are no heart-rate values and no workout for this day, so MAEHR FIT calculates no strain. WHOOP reports {wert} of 21."],
  trainings_leer: ["An diesem Tag ist kein Training aufgezeichnet.", "No workout was recorded on this day."],
  training_zeile: ["{zeit} · {dauer}", "{zeit} · {dauer}"],
  art_laufen: ["Laufen", "Running"], art_rad: ["Radfahren", "Cycling"], art_kraft: ["Krafttraining", "Strength training"], art_gehen: ["Gehen", "Walking"], art_sonst: ["Training", "Workout"],
  training_kern: ["{art} von {von} bis {bis} brachte {wert} von 21 Belastung.", "{art} from {von} to {bis} brought {wert} of 21 strain."],
  puls_titel: ["Puls während des Trainings", "Heart rate during the workout"],
  puls_kern: ["Am höchsten lag dein Puls bei {wert} Schlägen pro Minute.", "Your heart rate peaked at {wert} beats per minute."],
  training_nicht_gefunden: ["Dieses Training gibt es an diesem Tag nicht.", "This workout does not exist on this day."],
  zonen_training_titel: ["Zonen in diesem Training", "Zones in this workout"],
  zonen_training_kern: ["So verteilte sich die Zeit dieses Trainings auf die Zonen.", "This is how the workout time was spread over the zones."],
  belastung_gliederung: ["Wie die Belastung entsteht", "How strain is built"],

  // Atem
  atem_titel: ["Atem", "Breathe"],
  atem_kern: ["Ruhiges Atmen kann helfen, zur Ruhe zu kommen. Wähle eine Übung, folge dem Kreis und atme im Takt.", "Calm breathing can help you settle. Pick an exercise, follow the circle and breathe in time."],
  atem_heute: ["Heute schon {wert} geatmet.", "Already {wert} of breathing today."],
  "atem_vier-sieben-acht": ["4-7-8-Atmung", "4-7-8 breathing"], "atem_vier-sieben-acht_text": ["Vier Sekunden ein, sieben halten, acht aus. Das lange Ausatmen macht ruhig.", "Four seconds in, hold for seven, out for eight. The long exhale is calming."],
  atem_kohaerenz: ["Gleichmäßig atmen", "Even breathing"], atem_kohaerenz_text: ["Gut fünf Sekunden ein und gut fünf aus, ohne Pause – etwa sechs Atemzüge pro Minute.", "Just over five seconds in and five out, no pause – about six breaths a minute."],
  atem_seufzer: ["Seufzer-Atmung", "Sigh breathing"], atem_seufzer_text: ["Tief einatmen, kurz nachatmen, dann lange und langsam ausatmen.", "Breathe in deeply, top up briefly, then breathe out long and slowly."],
  atem_entspannung: ["Lang ausatmen", "Long exhale"], atem_entspannung_text: ["Vier Sekunden ein, sechs aus. Einfach und gut für zwischendurch.", "Four seconds in, six out. Simple and good for a short break."],
  atem_box: ["Box-Atmung", "Box breathing"], atem_box_text: ["Vier Sekunden ein, halten, aus, halten – wie die vier Seiten eines Quadrats.", "Four seconds in, hold, out, hold – like the four sides of a square."],
  atem_dauer: ["{runden} Runden · etwa {dauer}", "{runden} rounds · about {dauer}"],
  atem_sitzung_kern: ["Setz dich bequem hin. Atme ein, wenn der Kreis wächst, und aus, wenn er kleiner wird.", "Sit comfortably. Breathe in as the circle grows and out as it shrinks."],
  phase_ein: ["Einatmen", "Breathe in"], phase_halten: ["Halten", "Hold"], phase_aus: ["Ausatmen", "Breathe out"], phase_halten2: ["Halten", "Hold"],
  atem_bereit: ["Bereit", "Ready"], atem_pause_text: ["Pause", "Paused"], atem_fertig: ["Geschafft", "Done"],
  runde: ["Runde {n} von {gesamt}", "Round {n} of {gesamt}"],
  atem_start: ["Starten", "Start"], atem_pause: ["Pause", "Pause"], atem_weiter: ["Weiter", "Resume"], atem_stopp: ["Beenden", "Stop"], atem_nochmal: ["Noch einmal", "Again"],
  atem_vibration: ["Vibration bei jedem Wechsel", "Vibrate at each change"], atem_vibration_text: ["nur auf Geräten, die das können", "only on devices that support it"],
  atem_ton: ["Leiser Ton bei jedem Wechsel", "Soft tone at each change"], atem_ton_text: ["ein kurzer, weicher Klang", "a short, soft sound"],
  atem_ergebnis: ["Du hast {dauer} ruhig geatmet. Das steht jetzt in deinem Tagebuch.", "You breathed calmly for {dauer}. It is now in your journal."],
  atem_ergebnis_kurz: ["Die Übung war kürzer als zehn Sekunden und wurde nicht gespeichert.", "The exercise was shorter than ten seconds and was not saved."],
  atem_fortschritt: ["Fortschritt der Phase", "Phase progress"],

  // Tagebuch
  tagebuch_titel: ["Tagebuch", "Journal"],
  tagebuch_kern: ["Hake an, was heute zutraf. So siehst du mit der Zeit, was mit deiner Erholung am nächsten Morgen zusammenhängt.", "Tick what applied today. Over time you will see what goes along with your recovery the next morning."],
  tagebuch_gespeichert: ["Gespeichert.", "Saved."], tagebuch_speichert: ["Wird gespeichert …", "Saving …"],
  tagebuch_wirkung_link: ["Was hängt womit zusammen?", "What goes with what?"],
  tb_alkohol: ["Alkohol getrunken", "Drank alcohol"], tb_alkohol_text: ["am Abend oder tagsüber", "in the evening or during the day"],
  tb_koffein_spaet: ["Koffein am Nachmittag", "Caffeine in the afternoon"], tb_koffein_spaet_text: ["Kaffee, Tee, Cola, Energydrink", "coffee, tea, cola, energy drink"],
  tb_bildschirm_spaet: ["Bildschirm im Bett", "Screen in bed"], tb_bildschirm_spaet_text: ["Handy, Tablet oder Fernseher", "phone, tablet or TV"],
  tb_spaete_mahlzeit: ["Spät gegessen", "Ate late"], tb_spaete_mahlzeit_text: ["kurz vor dem Schlafengehen", "shortly before going to bed"],
  tb_meditation: ["Meditiert", "Meditated"], tb_meditation_text: ["auch ein paar Minuten zählen", "a few minutes count too"],
  tb_atemuebung: ["Atemübung gemacht", "Did a breathing exercise"], tb_atemuebung_text: ["wird nach einer Übung im Reiter Atem selbst gesetzt", "set automatically after an exercise in the Breathe tab"],
  tb_kaltdusche: ["Kalt geduscht", "Cold shower"], tb_kaltdusche_text: ["oder kalt gebadet", "or a cold bath"],
  tb_sauna: ["Sauna", "Sauna"], tb_sauna_text: ["mindestens ein Gang", "at least one round"],
  tb_lesen: ["Vor dem Schlafen gelesen", "Read before sleep"], tb_lesen_text: ["auf Papier oder E-Reader", "on paper or an e-reader"],
  tb_stress: ["Stressiger Tag", "Stressful day"], tb_stress_text: ["so, wie du ihn empfunden hast", "as you felt it"],
  tb_krank: ["Unwohl gefühlt", "Felt unwell"], tb_krank_text: ["zum Beispiel erkältet", "for example a cold"],
  tb_reisen: ["Unterwegs gewesen", "Travelled"], tb_reisen_text: ["Reise, anderes Bett, andere Zeitzone", "trip, other bed, other time zone"],
  tb_atem: ["Atemübungen", "Breathing exercises"],
  wirkung_titel: ["Was hängt womit zusammen?", "What goes with what?"],
  wirkung_kern: ["An Tagen nach „{name}“ lag deine Erholung im Mittel {wert} Punkte {richtung}.", "On days after “{name}” your recovery was {wert} points {richtung} on average."],
  wirkung_hoeher: ["höher", "higher"], wirkung_niedriger: ["niedriger", "lower"],
  wirkung_kern_leer: ["Noch gibt es zu wenige Tage, um Zusammenhänge zu zeigen. Trag ein paar Tage lang ein, was zutraf.", "There are not enough days yet to show links. Log what applied for a few days."],
  wirkung_frage: ["Erholung am nächsten Morgen", "Recovery the next morning"],
  wirkung_chart_kern: ["Erholung am Morgen danach: mit {mit}, ohne {ohne}.", "Recovery the morning after: with {mit}, without {ohne}."],
  wirkung_zeile: ["Unterschied {wert} Punkte · {nmit} Tage mit, {nohne} Tage ohne", "Difference {wert} points · {nmit} days with, {nohne} days without"],
  wirkung_satz: ["mit: {mit} ({nmit} Tage) · ohne: {ohne} ({nohne} Tage)", "with: {mit} ({nmit} days) · without: {ohne} ({nohne} days)"],
  wirkung_mit: ["mit", "with"], wirkung_ohne: ["ohne", "without"],
  wirkung_tendenz: ["Eine Tendenz, kein Beweis: Auch andere Dinge können eine Rolle spielen.", "A trend, not proof: other things can play a part too."],
  wirkung_zu_wenig: ["Noch zu wenige Tage für eine Aussage.", "Not enough days yet for a statement."],
  wirkung_differenz: ["Unterschied", "Difference"],

  // Trends
  trends_titel: ["Trends", "Trends"],
  trends_kern_drueber: ["Deine {feld} lag zuletzt über deinem üblichen Bereich.", "Your {feld} was recently above your usual range."],
  trends_kern_drunter: ["Deine {feld} lag zuletzt unter deinem üblichen Bereich.", "Your {feld} was recently below your usual range."],
  trends_kern_drin: ["Deine {feld} lag zuletzt in deinem üblichen Bereich.", "Your {feld} was recently within your usual range."],
  trends_kern_leer: ["Für diesen Zeitraum gibt es noch zu wenige Werte.", "There are not enough values for this period yet."],
  trends_feld: ["Messwert", "Measurement"], trends_fenster: ["Zeitraum", "Period"],
  fenster_7: ["7 Tage", "7 days"], fenster_30: ["30 Tage", "30 days"],
  feld_erholung: ["Erholung", "recovery"], feld_hrv: ["HRV", "HRV"], feld_ruhepuls: ["Ruhepuls", "resting heart rate"], feld_schlaf: ["Schlafdauer", "sleep duration"],
  feld_erholung_titel: ["Erholung", "Recovery"], feld_hrv_titel: ["HRV", "HRV"], feld_ruhepuls_titel: ["Ruhepuls", "Resting heart rate"], feld_schlaf_titel: ["Schlafdauer", "Sleep duration"],
  trends_chart_titel: ["{feld}, {fenster}", "{feld}, {fenster}"],
  trends_chart_kern: ["Der helle Streifen ist dein üblicher Bereich aus den 30 Tagen davor.", "The light band is your usual range from the previous 30 days."],

  // Mehr
  mehr_titel: ["Mehr", "More"],
  mehr_kern: ["Hier findest du dein Tagebuch, deine Trends und alles rund um deine Daten.", "Here you find your journal, your trends and everything about your data."],
  mehr_tagebuch_text: ["Was heute zutraf und was es bewirkt", "What applied today and how it shows"],
  mehr_trends_text: ["Woche und Monat im Verlauf", "Week and month over time"],
  mehr_daten_text: ["Verbinden, einlesen, sichern, löschen", "Connect, import, back up, delete"],
  mehr_einstellungen_text: ["Alter, Puls, Schlafbedarf, Sprache", "Age, heart rate, sleep need, language"],
  daten_titel: ["Daten", "Data"], einstellungen_titel: ["Einstellungen", "Settings"],

  // Daten
  daten_kern_demo: ["Gerade siehst du erfundene Demodaten. Verbinde Health Connect oder lies eine CSV-Datei ein, um deine eigenen Werte zu sehen.", "You are looking at made-up demo data. Connect Health Connect or import a CSV file to see your own values."],
  daten_kern_eigen: ["Deine Daten liegen nur auf diesem Gerät. Du kannst sie jederzeit sichern oder löschen.", "Your data stays on this device only. You can back it up or delete it at any time."],
  hc_titel: ["Health Connect", "Health Connect"],
  hc_text: ["Liest Puls, HRV, Schlaf und Trainings von deiner Uhr oder deinem Ring – nur lesen, nichts wird gesendet.", "Reads heart rate, HRV, sleep and workouts from your watch or ring – read only, nothing is sent."],
  hc_verbinden: ["Verbinden", "Connect"],
  hc_nur_android: ["Health Connect gibt es nur in der Android-App von MAEHR FIT. In dieser Datei kannst du stattdessen eine CSV-Datei einlesen.", "Health Connect is only available in the MAEHR FIT Android app. In this file you can import a CSV file instead."],
  hc_ok: ["Verbunden: {n} Messwerte gelesen.", "Connected: {n} measurements read."],
  hc_fehler: ["Das Verbinden hat nicht geklappt: {text}", "Connecting did not work: {text}"],
  csv_titel: ["CSV-Datei einlesen", "Import a CSV file"],
  csv_text: ["Zum Beispiel der Datenexport von WHOOP (ZIP oder einzelne CSV-Dateien). Die Dateien bleiben auf diesem Gerät.", "For example the WHOOP data export (ZIP or single CSV files). The files stay on this device."],
  csv_waehlen: ["Datei wählen", "Choose file"],
  csv_fehlt: ["Das Einlesen von CSV-Dateien ist in dieser Fassung noch nicht eingebaut.", "Importing CSV files is not built into this version yet."],
  csv_ok: ["{n} Messwerte aus „{datei}“ eingelesen.", "{n} measurements imported from “{datei}”."],
  csv_fehler: ["Die Datei ließ sich nicht einlesen: {text}", "The file could not be imported: {text}"],
  export_titel: ["Eigene Daten sichern", "Back up your data"],
  export_text: ["Lädt alles, was MAEHR FIT gespeichert hat, als JSON-Datei herunter.", "Downloads everything MAEHR FIT has stored as a JSON file."],
  export_knopf: ["Als Datei sichern", "Save as file"], export_ok: ["Gesichert: {n} Einträge.", "Saved: {n} entries."],
  loeschen_titel: ["Alle Daten löschen", "Delete all data"],
  loeschen_text: ["Entfernt Tagebuch, Einstellungen und eingelesene Messwerte von diesem Gerät. Danach siehst du wieder die Demodaten.", "Removes journal, settings and imported measurements from this device. Afterwards you will see the demo data again."],
  loeschen_knopf: ["Alles löschen …", "Delete everything …"],
  loeschen_frage: ["Wirklich alles löschen? Das lässt sich nicht rückgängig machen.", "Really delete everything? This cannot be undone."],
  loeschen_ja: ["Ja, alles löschen", "Yes, delete everything"], abbrechen: ["Abbrechen", "Cancel"],
  loeschen_ok: ["Alles gelöscht.", "Everything deleted."],
  quelle_demo: ["Demodaten", "Demo data"], quelle_eigen: ["Eigene Daten", "Own data"],
  quelle_jetzt: ["Datenquelle: {quelle}", "Data source: {quelle}"],

  // Einstellungen
  einst_kern: ["Mit deinem Alter, deinem Höchstpuls und deinem Schlafbedarf werden Belastung und Schlaf genauer.", "Your age, maximum heart rate and sleep need make strain and sleep more precise."],
  einst_alter: ["Alter", "Age"], einst_alter_hilfe: ["in Jahren", "in years"],
  einst_maxpuls: ["Höchstpuls", "Maximum heart rate"], einst_maxpuls_hilfe: ["leer lassen: aus dem Alter geschätzt ({wert} S/min)", "leave empty: estimated from age ({wert} bpm)"],
  einst_schlaf: ["Grundbedarf Schlaf", "Base sleep need"], einst_schlaf_hilfe: ["in Stunden, z. B. 8 oder 7,5", "in hours, e.g. 8 or 7.5"],
  einst_sprache: ["Sprache", "Language"], einst_thema: ["Darstellung", "Appearance"],
  einst_haptik: ["Vibration", "Vibration"], einst_haptik_text: ["kurzes Vibrieren bei Atemübungen", "short vibration during breathing exercises"],
  einst_gespeichert: ["Einstellungen gespeichert.", "Settings saved."],

  // Beleg
  beleg_titel: ["Woher kommt diese Zahl?", "Where does this number come from?"],
  beleg_formel: ["Rechenweg", "Calculation"], beleg_fundstelle: ["Fundstelle: {text}", "Source: {text}"],
  beleg_pruefen: ["noch zu prüfen", "to be checked"],
  beleg_teile: ["Bestandteile", "Components"], beleg_quellen: ["Messwerte dahinter", "Measurements behind it"],
  beleg_art: ["Art", "Type"], beleg_kennung: ["Kennung", "ID"], beleg_ort: ["Datei / Zeile", "File / line"], beleg_name: ["Name", "Name"], beleg_wert: ["Wert", "Value"], beleg_gewicht: ["Gewicht", "Weight"],
  beleg_weitere: ["… und {n} weitere Messwerte", "… and {n} more measurements"],
  beleg_keine_quellen: ["Zu dieser Zahl gibt es keine einzelnen Messwerte.", "There are no individual measurements behind this number."],
  beleg_unbekannt: ["Zu dieser Zahl ist kein Beleg hinterlegt.", "No record is stored for this number."],
  art_healthconnect: ["Health Connect", "Health Connect"], art_csv: ["CSV-Datei", "CSV file"], art_demo: ["Demodaten", "Demo data"], art_hand: ["von Hand", "manual"],

  // Diagramme
  vz_tabelle: ["Werte als Tabelle", "Values as table"], vz_leer: ["Noch keine Werte für dieses Diagramm.", "No values for this chart yet."],
  vz_quelle_oeffnen: ["{name}: {wert} – Herkunft öffnen", "{name}: {wert} – open source"],

  // Vergleich mit WHOOP (shell/apps/vergleich.js, Phase 2)
  vgl_titel: ["Vergleich mit WHOOP", "Comparison with WHOOP"],
  vgl_feld_erholung: ["Erholung", "Recovery"], vgl_feld_belastung: ["Belastung", "Strain"], vgl_feld_schlaf: ["Schlafleistung", "Sleep performance"],
  vgl_satz_erholung: ["Erholung", "recovery"], vgl_satz_belastung: ["Belastung", "strain"], vgl_satz_schlaf: ["Schlafleistung", "sleep performance"],
  vgl_kern: ["An {n} von {gesamt} Tagen liegen MAEHR FIT und WHOOP bei der {feld} höchstens {grenze} Punkte auseinander.", "On {n} of {gesamt} days, MAEHR FIT and WHOOP are at most {grenze} points apart on {feld}."],
  vgl_kern_keine: ["Für die {feld} gibt es noch keinen Tag, an dem MAEHR FIT und WHOOP beide einen Wert haben.", "There is no day yet on which both MAEHR FIT and WHOOP have a value for {feld}."],
  vgl_kern_leer: ["Noch keine WHOOP-Werte eingelesen. Lies unter „Daten“ den WHOOP-Export ein, dann stehen hier beide Zahlen nebeneinander.", "No WHOOP values imported yet. Import the WHOOP export under “Data” and both numbers will appear side by side here."],
  vgl_daten_knopf: ["WHOOP-Export einlesen", "Import WHOOP export"],
  vgl_hinweis: ["WHOOP rechnet nach einem eigenen Verfahren, das nicht veröffentlicht ist. Hier steht nur nebeneinander, was beide sagen – nicht, welche Zahl stimmt.", "WHOOP calculates with its own method, which is not published. This page only puts both numbers side by side – it does not say which one is right."],
  vgl_wahl: ["Messwert", "Measurement"],
  vgl_chart_mf: ["MAEHR FIT · {feld}", "MAEHR FIT · {feld}"], vgl_chart_whoop: ["WHOOP · {feld}", "WHOOP · {feld}"],
  vgl_chart_mf_kern: ["So rechnet MAEHR FIT an diesen Tagen.", "What MAEHR FIT calculates on these days."],
  vgl_chart_whoop_kern: ["So steht es im WHOOP-Export.", "What the WHOOP export says."],
  vgl_tage_titel: ["Tag für Tag", "Day by day"], vgl_uebersicht: ["Übersicht", "Overview"],
  vgl_sp_tag: ["Tag", "Day"], vgl_sp_mf: ["MF", "MF"], vgl_sp_whoop: ["WHOOP", "WHOOP"], vgl_sp_abstand: ["Abstand", "Difference"],
  vgl_sp_feld: ["Messwert", "Measurement"], vgl_sp_tage: ["Tage", "Days"], vgl_sp_mittel: ["Mittlerer Abstand", "Mean difference"], vgl_sp_groesste: ["Größte Abweichung", "Largest deviation"],
  vgl_am: ["am {tag}", "on {tag}"],
  vgl_nur_whoop_belastung: ["An {n} Tagen fehlt der Wert von MAEHR FIT: An Tagen ohne Training gibt es bei MAEHR FIT keine Belastung, die sich mit WHOOP vergleichen ließe. Trainings nur aus dem WHOOP-Export schätzt MAEHR FIT aus den Zonenanteilen.", "On {n} days the MAEHR FIT value is missing: on days without a workout MAEHR FIT has no strain to compare with WHOOP. Workouts that only come from the WHOOP export are estimated by MAEHR FIT from the zone shares."],
  vgl_nur_whoop: ["An {n} Tagen fehlt der Wert von MAEHR FIT, zum Beispiel weil für deinen Normalbereich noch zu wenige Tage davor vorliegen.", "On {n} days the MAEHR FIT value is missing, for example because there are not yet enough earlier days for your normal range."],
  vgl_abstand_titel: ["Abstand · {feld} · {tag}", "Difference · {feld} · {tag}"], vgl_mittel_titel: ["Mittlerer Abstand · {feld}", "Mean difference · {feld}"],
  vgl_teil_mf: ["MAEHR FIT", "MAEHR FIT"], vgl_teil_whoop: ["WHOOP", "WHOOP"], vgl_teil_n: ["Tage mit beiden Werten", "Days with both values"],
  vgl_teil_nah: ["davon nah beieinander", "of which close together"], vgl_teil_differenz: ["Mittel MF − WHOOP (mit Vorzeichen)", "Mean MF − WHOOP (signed)"], vgl_teil_grenze: ["Grenze „nah beieinander“", "Limit “close together”"],
  vgl_fremd_titel: ["WHOOP · {feld}", "WHOOP · {feld}"], vgl_fremd_anbieter: ["Anbieter", "Provider"],
  vgl_zum_vergleich: ["Zum Vergleich mit MAEHR FIT", "Compare with MAEHR FIT"],
  heute_vgl_link: ["WHOOP-Werte dieses Tages im Vergleich", "WHOOP's numbers for this day in comparison"],
  mehr_vergleich_text: ["Was WHOOP sagte, was MAEHR FIT rechnet", "What WHOOP said, what MAEHR FIT calculates"],
  mehr_pruefen_titel: ["Formeln, die noch zu prüfen sind", "Formulas still to be checked"], mehr_pruefen_text: ["eigene Festlegungen, noch nicht bestätigt", "own settings, not yet confirmed"],
  pruefen_titel: ["Noch zu prüfen", "Still to be checked"],
  pruefen_kern: ["{n} Formeln beruhen auf eigenen Festlegungen oder sind noch nicht am Originaltext bestätigt. Im Beleg tragen sie den Hinweis „noch zu prüfen“.", "{n} formulas rest on our own settings or are not yet confirmed against the original text. In the record they carry the note “to be checked”."],
  pruefen_anzahl_titel: ["Formeln, die noch zu prüfen sind", "Formulas still to be checked"], pruefen_rechenweg: ["Rechenweg", "Calculation"],
  pruefen_schluessel: ["Schlüssel", "Key"], pruefen_einheit: ["Einheit", "Unit"],

  // Daten: Zusammenfassung nach dem Einlesen, Einstellungen (Phase 2)
  csv_ok_arten: ["{n} Messwerte eingelesen: {liste}", "{n} measurements imported: {liste}"],
  csv_zeitraum: ["Zeitraum: {von} bis {bis}", "Period: {von} to {bis}"],
  hc_laeuft: ["Lese Daten aus Health Connect … das kann bei der ersten Verbindung mehrere Minuten dauern. Bitte die App offen lassen.", "Reading data from Health Connect … the first connection can take several minutes. Please keep the app open."],
  hc_fortschritt: ["Lese {art}: Abschnitt {nr} von {von} · bisher {n} Messwerte", "Reading {art}: part {nr} of {von} · {n} measurements so far"],
  csv_laeuft: ["Lese „{datei}“ …", "Reading “{datei}” …"],
  hc_ok_arten: ["Verbunden: {n} Messwerte gelesen: {liste}", "Connected: {n} measurements read: {liste}"],
  hc_luecken: ["Nicht alles gelesen: {liste}. Tippe noch einmal auf „Verbinden“, dann wird nachgelesen.", "Not everything was read: {liste}. Tap “Connect” again to read the rest."],
  hc_gesamt: ["Auf dem Gerät gespeichert: {von} bis {bis}", "Stored on this device: {von} to {bis}"],
  hc_hrv_keine: ["HRV: 0 Werte – WHOOP liefert sie nicht über Health Connect.", "HRV: 0 values – WHOOP does not provide them through Health Connect."],
  hc_schlaf_phasen: ["Schlaf: {n} Nächte, davon {m} mit Phasen.", "Sleep: {n} nights, {m} of them with stages."],
  hc_herkunft: ["Geschrieben von: {liste}", "Written by: {liste}"],
  hc_ohne_hrv: ["Health Connect lieferte keine HRV und keinen Ruhepuls. Ohne beides lässt sich die Erholung nicht berechnen; dafür den WHOOP-Export (CSV) einlesen. Die Belastung braucht einen Ruhepuls: trage ihn in den Einstellungen ein.", "Health Connect delivered no HRV and no resting heart rate. Without them recovery cannot be calculated; import the WHOOP export (CSV) for that. Strain needs a resting heart rate: enter it in Settings."],
  csv_kopf_titel: ["Spaltennamen der Datei „{datei}“ (nur die Kopfzeile, keine Werte):", "Column names of the file “{datei}” (header row only, no values):"],
  csv_hinweise: ["Zeilen mit Hinweis (z. B. ohne Aufwachzeit): {n}", "Lines with a note (e.g. no wake-up time): {n}"],
  datenart_herzschlag: ["Herzschlag", "heart rate"], datenart_hrv: ["HRV", "HRV"], datenart_ruhepuls: ["Ruhepuls", "resting heart rate"], datenart_atemfrequenz: ["Atemfrequenz", "respiratory rate"],
  datenart_spo2: ["Sauerstoffsättigung", "blood oxygen"], datenart_hauttemp: ["Hauttemperatur", "skin temperature"], datenart_schlaf: ["Schlaf", "sleep"], datenart_training: ["Trainings", "workouts"],
  datenart_tagebuch: ["Tagebuch", "journal"], datenart_fremdwerte: ["WHOOP-Werte", "WHOOP values"],
  einst_schlaf_standard: ["in Stunden, z. B. 7,5 – leer lassen: {wert} h, die Mitte der Empfehlung für Erwachsene", "in hours, e.g. 7.5 – leave empty: {wert} h, the middle of the recommendation for adults"],
  // Sync: Handy ↔ Rechner (shell/apps/sync.js, docs/apps/sync.md)
  sync_gerade: ["gerade eben", "just now"],
  sync_titel: ["Sync", "Sync"], mehr_sync_text: ["Handy und Rechner verbinden", "Connect phone and computer"],
  art_sync: ["Abgleich", "Sync"], sync_ja: ["ja", "yes"], sync_nein: ["nein", "no"],
  sync_kern_laedt: ["Die Verbindung wird geprüft …", "Checking the connection …"],
  sync_kern_handy_neu: ["Dein Handy ist noch mit keinem Rechner verbunden. Starte MAEHR FIT auf dem Rechner, lass dir dort einen QR-Code zeigen und scanne ihn hier.", "Your phone is not connected to a computer yet. Start MAEHR FIT on your computer, show a QR code there and scan it here."],
  sync_kern_handy_bereit: ["Dein Handy und dein Rechner sind verbunden. Tippe auf „Jetzt abgleichen“, um deine Messwerte zum ersten Mal zu schicken.", "Your phone and your computer are connected. Tap “Sync now” to send your measurements for the first time."],
  sync_kern_handy_ok: ["Dein Handy und dein Rechner sind verbunden; zuletzt {zeit}, {n} neue Messwerte.", "Your phone and your computer are connected; last synced {zeit}, {n} new measurements."],
  sync_kern_rechner_neu: ["Noch ist kein Handy mit diesem Rechner verbunden. Erzeuge unten einen QR-Code und scanne ihn mit MAEHR FIT auf dem Handy.", "No phone is connected to this computer yet. Create a QR code below and scan it with MAEHR FIT on your phone."],
  sync_kern_rechner_eins: ["{g} Handy ist mit diesem Rechner verbunden; zuletzt {zeit}, {n} neue Messwerte.", "{g} phone is connected to this computer; last synced {zeit}, {n} new measurements."],
  sync_kern_rechner_mehr: ["{g} Handys sind mit diesem Rechner verbunden; zuletzt {zeit}, {n} neue Messwerte.", "{g} phones are connected to this computer; last synced {zeit}, {n} new measurements."],
  sync_kern_rechner_eins_nie: ["{g} Handy ist mit diesem Rechner verbunden und hat noch nichts geschickt.", "{g} phone is connected to this computer and has not sent anything yet."],
  sync_kern_rechner_mehr_nie: ["{g} Handys sind mit diesem Rechner verbunden; noch hat keines etwas geschickt.", "{g} phones are connected to this computer; none has sent anything yet."],
  sync_koppeln_titel: ["Mit dem Rechner koppeln", "Pair with your computer"],
  sync_koppeln_text: ["Am Rechner: MAEHR FIT öffnen → Sync → „QR-Code zeigen“. Der Code gilt 10 Minuten.", "On your computer: open MAEHR FIT → Sync → “Show QR code”. The code is valid for 10 minutes."],
  sync_scannen: ["QR-Code scannen", "Scan QR code"], sync_kamera: ["Kamerabild zum Scannen", "Camera view for scanning"],
  sync_kein_scanner: ["Dieses Gerät kann hier keine QR-Codes lesen. Kopiere den Code-Text vom Rechner und füge ihn unten ein.", "This device cannot read QR codes here. Copy the code text from your computer and paste it below."],
  sync_kamera_fehler: ["Die Kamera ließ sich nicht öffnen ({text}). Füge den Code-Text stattdessen unten ein.", "The camera could not be opened ({text}). Paste the code text below instead."],
  sync_code_feld: ["Code-Text", "Code text"], sync_code_leer: ["Bitte zuerst den Code-Text einfügen.", "Please paste the code text first."],
  sync_koppeln_knopf: ["Koppeln", "Pair"],
  sync_gekoppelt: ["Gekoppelt mit {host}. Fingerabdruck {fp} – er muss am Rechner gleich lauten.", "Paired with {host}. Fingerprint {fp} – it must match the one on your computer."],
  sync_verbunden_titel: ["Verbindung", "Connection"], sync_rechner: ["Rechner", "Computer"], sync_fingerabdruck: ["Fingerabdruck", "Fingerprint"],
  sync_schutz: ["Schutz", "Protection"],
  sync_schutz_voll: ["unterschrieben und verschlüsselt", "signed and encrypted"],
  sync_schutz_signiert: ["nur unterschrieben – der Rechner kann nicht verschlüsseln (dort „cryptography“ installieren)", "signed only – the computer cannot encrypt (install “cryptography” there)"],
  sync_schutz_signiert_geraet: ["nur unterschrieben – dieses Gerät kann hier nicht verschlüsseln (in der App oder über 127.0.0.1 geht es)", "signed only – this device cannot encrypt here (it works in the app or via 127.0.0.1)"],
  sync_schutz_offen: ["zeigt sich beim ersten Abgleich", "shown after the first sync"],
  sync_letzter_fehler: ["Letzter Versuch ging nicht: {text}", "Last attempt failed: {text}"],
  sync_jetzt: ["Jetzt abgleichen", "Sync now"],
  sync_fertig: ["Fertig: {n} Messwerte geschickt, davon {neu} neu für den Rechner.", "Done: {n} measurements sent, {neu} of them new to the computer."],
  sync_entkoppeln: ["Entkoppeln", "Unpair"], sync_entkoppeln_ja: ["Ja, entkoppeln", "Yes, unpair"],
  sync_entkoppeln_frage: ["Wirklich entkoppeln? Deine Messwerte bleiben auf beiden Geräten; für einen neuen Abgleich musst du neu koppeln.", "Really unpair? Your measurements stay on both devices; to sync again you need to pair again."],
  sync_entkoppeln_geraet: ["{name} entkoppeln", "Unpair {name}"],
  sync_entkoppelt: ["Entkoppelt.", "Unpaired."], sync_entkoppelt_lokal: ["Auf dem Handy entkoppelt. Der Rechner war nicht erreichbar – entferne das Gerät dort auch.", "Unpaired on the phone. The computer could not be reached – remove the device there as well."],
  sync_ordner_titel: ["Export für Ordner-Sync", "Export for folder sync"],
  sync_ordner_text: ["Kein gemeinsames WLAN? Lade eine verschlüsselte Datei herunter und lege sie in einen Ordner, den dein Rechner sieht (z. B. iCloud Drive, OneDrive, Google Drive). Der Rechner liest sie mit demselben Passwort ein.", "No shared Wi-Fi? Download an encrypted file and put it into a folder your computer can see (e.g. iCloud Drive, OneDrive, Google Drive). The computer reads it with the same password."],
  sync_passwort: ["Passwort für die Datei", "Password for the file"],
  sync_passwort_hilfe: ["mindestens 8 Zeichen; am Rechner einmal hinterlegen (mf_dienst.py passwort)", "at least 8 characters; store it once on the computer (mf_dienst.py passwort)"],
  sync_passwort_kurz: ["Das Passwort braucht mindestens 8 Zeichen.", "The password needs at least 8 characters."],
  sync_ordner_knopf: ["Verschlüsselte Datei herunterladen", "Download encrypted file"],
  sync_ordner_laeuft: ["Wird verschlüsselt …", "Encrypting …"], sync_ordner_ok: ["Datei erstellt ({n} Tage und Einträge). Lege sie in den geteilten Ordner.", "File created ({n} days and entries). Put it into the shared folder."],
  sync_neu_titel: ["Neues Handy koppeln", "Pair a new phone"],
  sync_neu_text: ["Erzeuge einen QR-Code und scanne ihn mit MAEHR FIT auf dem Handy (Mehr → Sync). Beide Geräte müssen im selben WLAN sein.", "Create a QR code and scan it with MAEHR FIT on your phone (More → Sync). Both devices must be on the same Wi-Fi."],
  sync_geraet_name: ["Name des Handys", "Name of the phone"], sync_geraet_standard: ["Mein Handy", "My phone"],
  sync_qr_knopf: ["QR-Code zeigen", "Show QR code"], sync_qr_fertig: ["Fertig", "Done"], sync_qr_label: ["QR-Code zum Koppeln", "QR code for pairing"],
  sync_qr_fehlt: ["Kein QR-Bild möglich (am Rechner fehlt die Erweiterung „qrcode“). Kopiere den Code-Text aufs Handy.", "No QR image possible (the “qrcode” extension is missing on the computer). Copy the code text to your phone."],
  sync_qr_gueltig: ["Gültig bis {zeit}. Fingerabdruck {fp}.", "Valid until {zeit}. Fingerprint {fp}."],
  sync_geraete_titel: ["Gekoppelte Handys", "Paired phones"], sync_keine_geraete: ["Noch keines.", "None yet."], sync_geraet: ["Gerät", "Device"],
  sync_geraet_zuletzt: ["zuletzt: {zeit}", "last: {zeit}"], sync_noch_nie: ["noch nie", "never"], sync_geraet_wartet: ["wartet auf das Handy bis {zeit}", "waiting for the phone until {zeit}"],
  sync_eingang_titel: ["Eingangsordner", "Inbox folder"],
  sync_eingang_text: ["Dateien in {ordner} liest der Rechner von selbst ein: WHOOP-Export (ZIP oder CSV) und verschlüsselte Dateien vom Handy (.mfx).", "The computer reads files in {ordner} by itself: WHOOP exports (ZIP or CSV) and encrypted files from your phone (.mfx)."],
  sync_eingang_knopf: ["Jetzt nachsehen", "Check now"], sync_eingang_fertig: ["{n} neue Dateien bearbeitet.", "{n} new files processed."],
  sync_eingang_ok: ["{neu} neu, {da} schon da · {zeit}", "{neu} new, {da} already there · {zeit}"], sync_eingang_fehler: ["nicht eingelesen: {text}", "not imported: {text}"],
  sync_beleg_zuletzt: ["Letzter Abgleich", "Last sync"], sync_beleg_neu: ["Neue Messwerte beim letzten Abgleich", "New measurements in the last sync"],
  sync_teil_gesendet: ["geschickt", "sent"], sync_teil_neu: ["neu für den Rechner", "new to the computer"], sync_teil_schon_da: ["schon da (gleiche Kennung)", "already there (same ID)"],
  sync_teil_verschluesselt: ["verschlüsselt", "encrypted"], sync_teil_gesamt: ["insgesamt von diesem Gerät", "total from this device"],
  sync_heimnetz_hinweis: ["Die Verbindung bleibt in deinem Heimnetz. Jede Sendung trägt eine Unterschrift mit eurem gemeinsamen Schlüssel; ohne ihn nimmt der Rechner nichts an.", "The connection stays in your home network. Every transfer is signed with your shared key; without it the computer accepts nothing."],
};

/** Text holen; {platzhalter} werden ersetzt. Fehlt die Sprache: Englisch, dann Deutsch, dann der Schlüssel. */
function t(schluessel, werte = null, s = aktuell) {
  const e = TEXTE[schluessel];
  let text = e ? (s === "en" ? e[1] : e[0]) || e[1] || e[0] : schluessel;
  if (werte) text = text.replace(/\{(\w+)\}/g, (m, k) => (werte[k] !== undefined && werte[k] !== null ? String(werte[k]) : m));
  return text;
}

// ------------------------------------------------------------------ Live-Puls (shell/apps/live.js) und Puls beim Atmen (shell/apps/atem.js)
// Angehängt in Phase 2; eigener Block, damit parallele Änderungen am Wörterbuch oben nicht kollidieren.
Object.assign(TEXTE, {
  live_titel: ["Live-Puls", "Live heart rate"],
  live_kern: ["Hier siehst du deinen Puls in Echtzeit, direkt vom Band. Verbinde es, starte die Aufzeichnung und beende sie am Schluss – dann zählt die Einheit als Training zu deinem Tag.", "Here you see your heart rate in real time, straight from your band. Connect it, start recording and stop at the end – the session then counts as a workout for your day."],
  live_kern_ohne: ["Dieses Gerät kann hier kein Bluetooth. In Chrome am Rechner, in Chrome auf Android oder in der Android-App von MAEHR FIT geht es. Bis dahin zeigt dir der Demo-Puls, wie es aussieht.", "This device cannot use Bluetooth here. It works in Chrome on a computer, in Chrome on Android or in the MAEHR FIT Android app. Until then, the demo heart rate shows you what it looks like."],
  live_whoop_hinweis: ["Beim WHOOP-Band muss dafür in der WHOOP-App „Heart Rate Broadcast“ eingeschaltet sein (Geräteeinstellungen). Das Licht am Band blinkt dann blau.", "For a WHOOP band, turn on “Heart Rate Broadcast” in the WHOOP app (device settings). The light on the band then flashes blue."],
  live_verbinden: ["Band verbinden", "Connect band"], live_demo: ["Demo-Puls", "Demo heart rate"], live_trennen: ["Trennen", "Disconnect"],
  live_stand_aus: ["Nicht verbunden.", "Not connected."], live_stand_suche: ["Suche nach dem Band …", "Looking for the band …"],
  live_stand_verbunden: ["Verbunden mit {name}.", "Connected to {name}."], live_stand_getrennt: ["Verbindung verloren.", "Connection lost."],
  live_stand_wieder: ["Verbindung verloren – neuer Versuch ({n}) …", "Connection lost – trying again ({n}) …"],
  live_stand_fehler: ["Verbinden hat nicht geklappt: {text}", "Could not connect: {text}"],
  live_stand_demo: ["Demo-Puls läuft – alle Werte sind erfunden und werden nicht gespeichert.", "Demo heart rate running – all values are made up and are not saved."],
  live_geraet_unbekannt: ["Pulsmesser", "heart rate monitor"], live_kein_bluetooth: ["kein Bluetooth", "no Bluetooth"],
  live_puls: ["Puls jetzt", "Heart rate now"], live_warte: ["warte auf den ersten Wert", "waiting for the first value"],
  live_zone: ["Zone {zone}", "Zone {zone}"], live_zone_unter: ["unter Zone 1", "below zone 1"], live_zone_titel: ["Pulszone", "Heart rate zone"],
  live_zone_fehlt: ["Für die Zone fehlen Höchst- oder Ruhepuls (Einstellungen).", "Max or resting heart rate missing for the zone (settings)."],
  live_belastung: ["Belastung", "Strain"], live_dauer: ["Dauer", "Duration"], live_hrv: ["Kurz-HRV", "Short HRV"],
  live_zonen_titel: ["Zeit je Zone", "Time per zone"], live_zonen_kern: ["Bisher am längsten in Zone {zone}.", "So far longest in zone {zone}."],
  live_zonen_unter: ["Bisher lag dein Puls unter Zone 1 – das zählt noch nicht zur Belastung.", "So far your heart rate has been below zone 1 – that does not count towards strain yet."],
  live_zonen_leer: ["Die Zeiten erscheinen, sobald die Aufzeichnung läuft.", "The times appear once recording is running."],
  live_verlauf_titel: ["Puls, letzte 3 Minuten", "Heart rate, last 3 minutes"], live_verlauf_kern: ["Zwischen {min} und {max} Schlägen pro Minute.", "Between {min} and {max} beats per minute."],
  live_verlauf_leer: ["Die Linie erscheint nach den ersten Werten.", "The line appears after the first values."],
  live_zuletzt: ["zuletzt", "latest"], live_tiefster: ["tiefster", "lowest"], live_hoechster: ["höchster", "highest"],
  live_start: ["Aufzeichnung starten", "Start recording"], live_pause: ["Pause", "Pause"], live_weiter: ["Weiter", "Resume"], live_stopp: ["Beenden", "Stop"],
  live_start_hinweis: ["Erst das Band verbinden, dann die Aufzeichnung starten.", "Connect the band first, then start recording."],
  live_laeuft: ["Aufzeichnung läuft.", "Recording."], live_pausiert: ["Aufzeichnung pausiert.", "Recording paused."],
  live_gespeichert: ["Gespeichert: {dauer} Training mit Belastung {wert}. Dein Tag ist neu gerechnet.", "Saved: {dauer} workout with strain {wert}. Your day has been recalculated."],
  live_zu_kurz: ["Die Aufzeichnung war kürzer als eine Minute und wurde nicht gespeichert.", "The recording was shorter than a minute and was not saved."],
  live_demo_ende: ["Probelauf mit dem Demo-Puls: {dauer}, Belastung {wert}. Erfundene Werte werden nicht gespeichert.", "Trial run with the demo heart rate: {dauer}, strain {wert}. Made-up values are not saved."],
  live_zum_training: ["Training ansehen", "View workout"], live_fehler_speichern: ["Speichern hat nicht geklappt: {text}", "Saving failed: {text}"],
  live_rr: ["RR-Abstände (ms)", "RR intervals (ms)"], live_uhrzeit: ["Uhrzeit", "Time"], live_max: ["Höchstpuls", "Max heart rate"], live_ruhe: ["Ruhepuls", "Resting heart rate"],
  live_beginn: ["Beginn", "Start"], live_pausen: ["Pausen", "Pauses"], live_differenzen: ["gültige Differenzen", "valid differences"], live_verworfen: ["verworfene Abstände", "discarded intervals"],
  live_anzahl: ["Messwerte", "Readings"], live_ab: ["ab {wert} S/min", "from {wert} bpm"],
  live_kein_rr: ["Das Band sendet keine RR-Abstände – ohne sie gibt es keine Kurz-HRV und keine Kohärenz.", "The band sends no RR intervals – without them there is no short HRV and no coherence."],
  live_zu_wenig_rr: ["Noch zu wenige Herzschläge für die Kurz-HRV.", "Not enough heartbeats yet for the short HRV."],
  art_ble: ["Bluetooth live", "Bluetooth live"],
  belastung_live: ["Training live aufzeichnen", "Record a workout live"],
  atem_live: ["Puls live ansehen", "View live heart rate"],
  atem_puls: ["Puls mitlesen", "Read heart rate"], atem_puls_text: ["zeigt Puls und Kohärenz vom Band neben dem Kreis", "shows heart rate and coherence from the band next to the circle"],
  atem_puls_verbinden: ["Verbinde das Band oder probiere den Demo-Puls.", "Connect the band or try the demo heart rate."],
  atem_puls_ohne_bt: ["Hier geht kein Bluetooth – probiere den Demo-Puls.", "Bluetooth is not available here – try the demo heart rate."],
  atem_kohaerenz_label: ["Kohärenz", "Coherence"], atem_kohaerenz_wartet: ["Kohärenz nach zwei Atemzügen", "coherence after two breaths"],
  atem_puls_erg_titel: ["Dein Puls bei dieser Übung", "Your heart rate during this exercise"],
  atem_puls_erg_satz: ["Dein Puls ging von {vor} auf {nach} Schläge pro Minute.", "Your heart rate went from {vor} to {nach} beats per minute."],
  atem_puls_vor: ["Puls zu Beginn", "Heart rate at start"], atem_puls_nach: ["Puls am Ende", "Heart rate at end"], atem_hrv_mittel: ["Kurz-HRV der Übung", "Short HRV of the exercise"],
  atem_puls_gespeichert: ["Die Pulswerte stehen mit im Tagebuch.", "The heart rate values are also saved in your journal."],
  atem_puls_demo: ["Erfundene Werte (Demo-Puls) – nicht gespeichert.", "Made-up values (demo heart rate) – not saved."],
});

// ------------------------------------------------------------------ Abgleich mit Health Connect beim Start und bei Rückkehr (shell/abgleich.js)
// Angehängt am 01.11.2026; eigener Block wie oben.
Object.assign(TEXTE, {
  abgleich_zuletzt: ["Zuletzt abgeglichen: {wann}", "Last synced: {wann}"],
  abgleich_gerade: ["gerade eben", "just now"],
  abgleich_minute: ["vor 1 Minute", "1 minute ago"], abgleich_minuten: ["vor {n} Minuten", "{n} minutes ago"],
  abgleich_stunde: ["vor 1 Stunde", "1 hour ago"], abgleich_stunden: ["vor {n} Stunden", "{n} hours ago"],
  abgleich_tag: ["vor 1 Tag", "1 day ago"], abgleich_tage: ["vor {n} Tagen", "{n} days ago"],
  abgleich_nie: ["Noch nicht abgeglichen", "Not synced yet"],
  abgleich_aktualisieren: ["Aktualisieren", "Refresh"],
  abgleich_laeuft: ["Neue Werte werden geholt …", "Fetching new values …"],
  abgleich_nicht_verbunden: ["Health Connect nicht verbunden", "Health Connect not connected"],
  abgleich_verbinden: ["Verbinden", "Connect"],
  abgleich_neu_eins: ["1 neuer Messwert", "1 new measurement"], abgleich_neu: ["{n} neue Messwerte", "{n} new measurements"],
  abgleich_nichts_neu: ["Keine neuen Messwerte.", "No new measurements."],
  abgleich_fehler: ["Abgleich hat nicht geklappt", "Sync did not work"], abgleich_erneut: ["Erneut versuchen", "Try again"],
  abgleich_jetzt: ["Jetzt abgleichen", "Sync now"],
  abgleich_whoop_hinweis: ["Neue Werte erscheinen, nachdem die WHOOP-App ihre Daten geholt hat.", "New values appear after the WHOOP app has fetched its data."],
  abgleich_ziehen: ["Zum Aktualisieren loslassen", "Release to refresh"],
  kachel_belastung_tag: ["Belastung", "Strain"],
});

// ------------------------------------------------------------------ Hintergrund-Abgleich, Mitteilungen und Widgets (daten/hintergrund.js, shell/apps/mitteilungen.js)
// Angehängt am 01.11.2026; eigener Block. hg_* gehen auch in die Mitteilung und die Widgets der Android-App (kern.bundle.js).
Object.assign(TEXTE, {
  hg_erholung: ["Erholung", "Recovery"], hg_belastung: ["Belastung", "Strain"], hg_schlaf: ["Schlaf", "Sleep"],
  hg_atem: ["Atemübung", "Breathing"], hg_zuletzt: ["zuletzt {zeit}", "updated {zeit}"], hg_bedarf: ["Bedarf {wert}", "Need {wert}"],
  hg_stufe_gruen: ["Grün", "Green"], hg_stufe_gelb: ["Gelb", "Yellow"], hg_stufe_rot: ["Rot", "Red"],
  hg_leer: ["Öffne MAEHR FIT, um deine Werte zu holen.", "Open MAEHR FIT to fetch your values."],
  hg_demo: ["Noch keine eigenen Werte – verbinde Health Connect in der App.", "No values of your own yet – connect Health Connect in the app."],
  hg_kern_keine_daten: ["Noch keine eigenen Werte – verbinde Health Connect in der App.", "No values of your own yet – connect Health Connect in the app."],
  hg_kanal_morgen: ["MF Morgenbericht", "MF morning report"], hg_kanal_hinweis: ["MF Hinweise", "MF notes"],
  hg_schlafenszeit_text: ["Für {bedarf} Schlaf bis {auf}: um {bett} ins Bett.", "For {bedarf} of sleep until {auf}: go to bed at {bett}."],

  mt_titel: ["Mitteilungen & Widgets", "Notifications & widgets"],
  mehr_mitteilungen_text: ["Morgenbericht, Abgleich im Hintergrund, Widgets", "Morning report, background sync, widgets"],
  mt_kern_browser: ["Morgenbericht, Widgets und der Abgleich bei geschlossener App gibt es nur in der Android-App von MAEHR FIT. Im Browser holst du neue Werte beim Öffnen.", "The morning report, widgets and syncing while the app is closed are only available in the MAEHR FIT Android app. In the browser, new values arrive when you open it."],
  mt_browser_punkte: ["Was die Android-App zusätzlich kann", "What the Android app adds"],
  mt_browser_1: ["jede Stunde neue Werte aus Health Connect, auch wenn die App zu ist", "new values from Health Connect every hour, even while the app is closed"],
  mt_browser_2: ["ein Morgenbericht mit Erholung, Belastung und Schlaf", "a morning report with recovery, strain and sleep"],
  mt_browser_3: ["drei Widgets für den Startbildschirm", "three widgets for the home screen"],
  mt_kern_laedt: ["Der Stand des Abgleichs wird geladen …", "Loading the sync status …"],
  mt_kern_aus: ["Der Abgleich im Hintergrund ist aus. Neue Werte kommen nur, wenn du die App öffnest.", "Background sync is off. New values only arrive when you open the app."],
  mt_kern_ohne_recht: ["MAEHR FIT darf Health Connect noch nicht im Hintergrund lesen. Erlaube es unten, dann kommen neue Werte auch bei geschlossener App.", "MAEHR FIT may not read Health Connect in the background yet. Allow it below, then new values arrive even while the app is closed."],
  mt_kern_an: ["MAEHR FIT holt alle {n} Minuten neue Werte, auch wenn die App zu ist. Zuletzt: {zeit}.", "MAEHR FIT fetches new values every {n} minutes, even while the app is closed. Last run: {zeit}."],
  mt_kern_an_nie: ["MAEHR FIT holt alle {n} Minuten neue Werte, auch wenn die App zu ist. Der erste Lauf steht noch aus.", "MAEHR FIT fetches new values every {n} minutes, even while the app is closed. The first run is still pending."],
  mt_kern_morgen_zeit: ["Der Morgenbericht kommt um {uhrzeit}.", "The morning report arrives at {uhrzeit}."],
  mt_kern_morgen_auf: ["Der Morgenbericht kommt, sobald deine Nacht da ist.", "The morning report arrives as soon as your night is in."],

  mt_abgleich_titel: ["Abgleich im Hintergrund", "Background sync"],
  mt_abgleich_text: ["Android holt neue Werte aus Health Connect, auch wenn MAEHR FIT geschlossen ist. Beim Öffnen übernimmt die App sie.", "Android fetches new values from Health Connect even while MAEHR FIT is closed. The app takes them over when you open it."],
  mt_abgleich_an: ["Im Hintergrund abgleichen", "Sync in the background"], mt_abgleich_an_text: ["braucht wenig Akku, läuft nur bei ausreichender Ladung", "uses little battery, only runs when the battery is not low"],
  mt_intervall: ["Wie oft", "How often"], mt_intervall_30: ["alle 30 Minuten", "every 30 minutes"], mt_intervall_60: ["jede Stunde", "every hour"], mt_intervall_120: ["alle 2 Stunden", "every 2 hours"],
  mt_letzter: ["Letzter Lauf", "Last run"], mt_naechster: ["Nächster Lauf", "Next run"], mt_nie: ["noch keiner", "none yet"],
  mt_ungefaehr: ["etwa {zeit}", "around {zeit}"],
  mt_ergebnis_ok: ["{n} neue Messwerte", "{n} new measurements"], mt_ergebnis_ok_eins: ["1 neuer Messwert", "1 new measurement"], mt_ergebnis_nichts: ["nichts Neues", "nothing new"],
  mt_ergebnis_ohne_recht: ["ohne Hintergrundrecht – nichts gelesen", "no background permission – nothing read"],
  mt_ergebnis_fehler: ["hat nicht geklappt: {text}", "did not work: {text}"], mt_ergebnis_aus: ["ausgeschaltet", "switched off"],
  mt_ergebnis_kein_hc: ["Health Connect fehlt auf dem Gerät", "Health Connect is missing on this device"],
  mt_hc_recht: ["Health Connect im Hintergrund", "Health Connect in the background"],
  mt_hc_ja: ["erlaubt", "allowed"], mt_hc_nein: ["nicht erlaubt", "not allowed"], mt_hc_geht_nicht: ["auf diesem Gerät nicht möglich (ab Android 14 bzw. neuem Health Connect)", "not possible on this device (needs Android 14 or a newer Health Connect)"],
  mt_hc_erlauben: ["Im Hintergrund erlauben", "Allow in the background"], mt_hc_oeffnen: ["Health Connect öffnen", "Open Health Connect"],
  mt_hc_hilfe: ["Alternativ in Health Connect: App-Berechtigungen → MAEHR FIT → „Zugriff im Hintergrund“ einschalten.", "Alternatively in Health Connect: App permissions → MAEHR FIT → turn on “Background access”."],
  mt_jetzt: ["Jetzt abgleichen", "Sync now"], mt_jetzt_gestartet: ["Der Abgleich läuft. Das Ergebnis steht gleich oben.", "Sync is running. The result appears above in a moment."],
  mt_beleg_lauf: ["Letzter Lauf im Hintergrund", "Last background run"], mt_teil_zeit: ["Zeitpunkt", "Time"], mt_teil_ergebnis: ["Ergebnis", "Result"],

  mt_morgen_titel: ["Morgenbericht", "Morning report"],
  mt_morgen_text: ["Eine ruhige Mitteilung mit Erholung, Belastung und Schlaf – ohne Ton.", "A quiet notification with recovery, strain and sleep – without sound."],
  mt_morgen_an: ["Morgenbericht senden", "Send morning report"], mt_morgen_an_text: ["einmal am Tag", "once a day"],
  mt_morgen_wann: ["Wann", "When"], mt_morgen_aufwachen: ["nach dem Aufwachen (sobald die Nacht da ist)", "after waking up (as soon as the night is in)"],
  mt_erholung_an: ["Hinweis bei roter Erholung", "Note on red recovery"], mt_erholung_an_text: ["nur, wenn der Morgenbericht aus ist", "only when the morning report is off"],
  mt_schlaf_an: ["Hinweis zur Schlafenszeit", "Bedtime note"], mt_schlaf_an_text: ["abends, aus deinem Schlafbedarf und deiner üblichen Aufwachzeit", "in the evening, from your sleep need and your usual wake-up time"],
  mt_recht_fehlt: ["Android zeigt Mitteilungen von MAEHR FIT noch nicht an.", "Android does not show notifications from MAEHR FIT yet."],
  mt_recht_erlauben: ["Mitteilungen erlauben", "Allow notifications"], mt_recht_einstellungen: ["Mitteilungs-Einstellungen", "Notification settings"],
  mt_test: ["Test-Mitteilung senden", "Send test notification"], mt_test_gesendet: ["Die Test-Mitteilung ist unterwegs.", "The test notification is on its way."],

  mt_xiaomi_titel: ["Xiaomi, Redmi, POCO", "Xiaomi, Redmi, POCO"],
  mt_xiaomi_text: ["Autostart erlauben und Akku-Optimierung für MAEHR FIT ausschalten – sonst stoppt das System den Abgleich im Hintergrund.", "Allow autostart and turn off battery optimisation for MAEHR FIT – otherwise the system stops background sync."],
  mt_andere_titel: ["Wenn nichts im Hintergrund ankommt", "If nothing arrives in the background"],
  mt_andere_text: ["Manche Handys beenden Apps im Hintergrund. Schalte dann die Akku-Optimierung für MAEHR FIT aus.", "Some phones stop apps in the background. Then turn off battery optimisation for MAEHR FIT."],
  mt_autostart: ["Autostart öffnen", "Open autostart"], mt_akku: ["Akku-Einstellungen öffnen", "Open battery settings"],

  mt_widgets_titel: ["Widgets", "Widgets"],
  mt_widgets_text: ["Startbildschirm lange gedrückt halten → „Widgets“ → MAEHR FIT → Erholung (2 × 2), Heute (4 × 2) oder Schlaf (2 × 1) auf den Bildschirm ziehen.", "Long-press the home screen → “Widgets” → MAEHR FIT → drag Recovery (2 × 2), Today (4 × 2) or Sleep (2 × 1) onto the screen."],
  mt_widgets_anzahl: ["Auf dem Startbildschirm: {n}", "On the home screen: {n}"],
  mt_widgets_jetzt: ["Widgets jetzt aktualisieren", "Update widgets now"], mt_widgets_fertig: ["Die Widgets zeigen jetzt die Werte aus der App.", "The widgets now show the values from the app."],
  mt_fehler: ["Das hat nicht geklappt: {text}", "That did not work: {text}"],
});
return { SPRACHEN, sprache, setzeSprache, locale, TEXTE, t };
})();

// ===== shell/format.js
const __m_shell_format_js = (() => {
/* shell/format.js – Zahlen, Dauern, Uhrzeiten und Tage als lesbarer Text (DE/EN), ohne DOM.
 *
 * Kernaussage: Der Kern liefert ganze Einheiten (Millisekunden, Schläge, Prozent, Zehntel der Belastung). Diese Datei macht
 * daraus Text für Menschen – „7 h 52 min“, „78 %“, „12,4“, „Do., 30. Okt.“ – im Gebietsschema der gewählten Sprache.
 */
const { locale, sprache, t } = __m_shell_i18n_i18n_js;

const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const attr = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join("");

function zahl(n, stellen = 0) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "–";
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: stellen, maximumFractionDigits: stellen }).format(Number(n));
}
/** Punkte mit Vorzeichen: „+8,3“, „−2“ (Beitrag zur Erholung). */
const mitVorzeichen = (n, stellen = 1) => (Number.isFinite(n) ? (n > 0 ? "+" : n < 0 ? "−" : "") + zahl(Math.abs(n), stellen) : "–");
const prozent = (n) => (n === null || n === undefined ? "–" : zahl(n) + (sprache() === "de" ? "\u00a0%" : "%"));
/** Belastung: der Kern liefert Zehntel (0–210) → „12,4“. */
const belastungText = (zehntel) => (Number.isFinite(zehntel) ? zahl(zehntel / 10, 1) : "–");
/** Dauer aus Millisekunden: „7 h 52 min“, „45 min“, „30 s“. */
function dauer(ms, { sekunden = false } = {}) {
  if (!Number.isFinite(ms)) return "–";
  const neg = ms < 0, m = Math.round(Math.abs(ms) / 60000);
  if (sekunden && Math.abs(ms) < 60000) return `${Math.round(Math.abs(ms) / 1000)} s`;
  const h = Math.floor(m / 60), r = m % 60;
  return (neg ? "−" : "") + (h ? `${h} h${r ? ` ${r} min` : ""}` : `${r} min`);
}
/** Kurze Dauer für Achsen und Kacheln: „7:52 h“. */
function dauerKurz(ms) {
  if (!Number.isFinite(ms)) return "–";
  const m = Math.round(Math.abs(ms) / 60000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`;
}
const uhrzeit = (ms) => new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
const datum = (iso) => { const [j, m, d] = iso.split("-").map(Number); return new Date(j, m - 1, d, 12); };
/** „Do., 30. Okt.“ / „Thu 30 Oct“ */
const tagLang = (iso) => new Intl.DateTimeFormat(locale(), { weekday: "short", day: "numeric", month: "short" }).format(datum(iso));
/** „30.10.“ / „30/10“ für Achsen */
const tagKurz = (iso) => new Intl.DateTimeFormat(locale(), { day: "numeric", month: "numeric" }).format(datum(iso));
/** Wochentag kurz „Do“ */
const wochentag = (iso) => new Intl.DateTimeFormat(locale(), { weekday: "short" }).format(datum(iso)).replace(/\.$/, "");
/** Tag im Kopf: „heute“, „gestern“ oder „Do., 30. Okt.“ */
function tagName(iso, heuteIso, gesternIso) {
  if (iso === heuteIso) return t("tag_heute").replace(/^./, (c) => c.toUpperCase());
  if (iso === gesternIso) return t("tag_gestern").replace(/^./, (c) => c.toUpperCase());
  return `${wochentag(iso)} ${tagKurz(iso)}`;
}
return { esc, attr, zahl, mitVorzeichen, prozent, belastungText, dauer, dauerKurz, uhrzeit, tagLang, tagKurz, wochentag, tagName };
})();

// ===== daten/hintergrund.js
const __m_daten_hintergrund_js = (() => {
// daten/hintergrund.js – Brücke zwischen der App und dem Hintergrund-Abgleich der Android-Hülle (docs/technik/hintergrund.md).
//
// Kernaussage: Während die App zu ist, holt Android stündlich neue Werte aus Health Connect und legt sie in einen Eingangskorb
// (Dateien im privaten Speicher der App). Beim Öffnen übernimmt die App den Korb in ihren Speicher – ohne Doppelte – und leert
// ihn. Beim Verlassen gibt die App ihre eigene Tageszusammenfassung an Android zurück, damit Mitteilung und Widgets genau die
// Zahlen zeigen, die auch in der App stehen. Dieselbe Rechnung läuft im Hintergrund in einem unsichtbaren Browserfenster
// (android/kern_einstieg.js → kern.bundle.js), wenn die App geschlossen ist.
//
// Aufbau (alles rein, außer abholen/spiegeln/einhaengen, die die Brücke und den Speicher bekommen):
//   jsonlLesen(text)                                → Datensätze einer JSON-Lines-Datei (kaputte Zeilen übersprungen)
//   eingangZuPaket(dateien, { herzschlaege })       → Messpaket (Rohformat Health Connect → normiert, daten/healthconnect.js)
//   vereinen(...pakete)                              → Messpaket ohne Doppelte (gleiche quelle.id: der spätere gewinnt)
//   kontextAusPaket(paket, heute)                   → nur die Tage, die der Kern für heute braucht (Basislinie, Schlafschuld)
//   einstellungenFuerKern(einst)                    → wie shell/kern_echt.js: nur gültige Zahlen
//   zusammenfassung(paket, einst, { jetzt, quelle }) → Tageszusammenfassung für Mitteilung und Widgets (Schema unten)
//   heuteAusMessungen(paketJson, einstJson, jetzt)  → dasselbe aus JSON-Text (für die Android-Hülle)
//   heuteAusEingang(kontextJson, eingangJson, einstJson, jetzt) → Kontext der App + neuer Eingang, dann zusammenfassung
//   abholen({ speicher, bruecke })                  → Eingang in den Speicher übernehmen, dann bestätigen (Korb leeren)
//   spiegeln({ speicher, bruecke, jetzt })          → Kontext und Zusammenfassung an Android geben, Widgets nachführen
//   einhaengen(ziel)                                → in der Android-App: abholen beim Öffnen, spiegeln beim Verlassen
//
// Zusammenfassung (Version 1):
//   { version, tag, istHeute, erzeugt, quelle: "app"|"hintergrund", demo, sprache,
//     erholung: { wert, stufe, text }, belastung: { wert, zehntel, text }, schlaf: { wert, dauerMs, bedarfMs, text, bedarfText, anteil },
//     hrv: { wert } | null, ruhepuls: { wert } | null, kernaussage, zeile, schlafErkannt, aufwachenMs,
//     schlafenszeit: { bettMs, aufstehenMs, bedarfMs, text } | null, texte: { … Beschriftungen in der Sprache der App } }
// Kein Netz. Nur Zahlen aus dem Kern (kern/index.js), Texte aus shell/i18n/i18n.js, Zahlenformat aus shell/format.js.

const K = __m_kern_index_js;
const { zuordnen, herzschlaegeAus, RECORD_TYPEN } = __m_daten_healthconnect_js;
const { ARTEN, leeresPaket, speichereMessungen, leseMessungen } = __m_daten_ablage_js;
const { installiereHintergrundBruecke } = __m_daten_bruecke_capacitor_js;
const { t, setzeSprache, sprache: aktuelleSprache } = __m_shell_i18n_i18n_js;
const { zahl, prozent, belastungText, dauerKurz, uhrzeit, tagLang } = __m_shell_format_js;

const VERSION = 1;
/** Technische Vorgaben (keine Rechenformeln): Reserve-Tage über die Fenster des Kerns hinaus, Wartezeit beim Einhängen. */
const VORGABEN = { reserveTage: 2, warteVersuche: 40, warteMs: 500 };
/** Arten, die die Zusammenfassung braucht (Tagebuch und WHOOP-Fremdwerte ändern keine der gezeigten Zahlen). */
const RECHEN_ARTEN = ARTEN.filter((a) => a !== "tagebuch" && a !== "fremdwerte");

const idVon = (d) => (d && d.quelle && d.quelle.id) || null;

// ---------------------------------------------------------------------------------------------------
// Eingang (Rohformat von Health Connect, je Datenart eine Datei <Typ>.jsonl)
// ---------------------------------------------------------------------------------------------------

/** JSON-Lines lesen → { datensaetze, fehler } (leere und kaputte Zeilen werden gezählt, nicht geworfen). */
function jsonlLesen(text) {
  const datensaetze = [];
  let fehler = 0;
  for (const zeile of String(text || "").split(/\r?\n/)) {
    const z = zeile.trim();
    if (!z) continue;
    try {
      const o = JSON.parse(z);
      if (o && typeof o === "object") datensaetze.push(o); else fehler += 1;
    } catch { fehler += 1; }
  }
  return { datensaetze, fehler };
}

/** Datensätze im Brückenformat je Typ → Messpaket. `dateien` = { HeartRate: "jsonl…" | [ … ], … }. */
function eingangZuPaket(dateien = {}, { herzschlaege = [] } = {}) {
  const roh = {};
  let fehler = 0;
  for (const typ of RECORD_TYPEN) {
    const inhalt = dateien[typ];
    if (inhalt === undefined || inhalt === null) continue;
    let liste;
    if (Array.isArray(inhalt)) liste = inhalt;
    else { const r = jsonlLesen(inhalt); liste = r.datensaetze; fehler += r.fehler; }
    // Doppelte Zeilen (gleiche Health-Connect-id, z. B. nach zwei Läufen): die letzte gilt
    const nachId = new Map();
    liste.forEach((d, i) => nachId.set((d.metadata && d.metadata.id) || `#${i}`, d));
    roh[typ] = [...nachId.values()];
  }
  const pakete = [];
  const herz = roh.HeartRate ? herzschlaegeAus(roh.HeartRate) : [];
  for (const typ of RECORD_TYPEN) {
    if (!roh[typ]) continue;
    pakete.push(typ === "ExerciseSession" ? zuordnen(typ, roh[typ], { herzschlaege: [...herzschlaege, ...herz] }) : zuordnen(typ, roh[typ]));
  }
  const paket = vereinen(...pakete);
  paket.fehlerZeilen = fehler;
  return paket;
}

/**
 * Pakete zusammenlegen: Ein Datensatz eines späteren Pakets ersetzt alle früheren mit derselben quelle.id (wie die Ablage).
 * Innerhalb eines Pakets bleibt alles stehen – manche Quellen teilen eine id für viele Einzelwerte (Demodaten: ein Pulstag).
 */
function vereinen(...pakete) {
  const ziel = leeresPaket();
  for (const art of ARTEN) {
    let liste = [];
    for (const p of pakete) {
      if (!p || !Array.isArray(p[art]) || !p[art].length) continue;
      const neueIds = new Set(p[art].map(idVon).filter((x) => x !== null));
      if (neueIds.size) liste = liste.filter((d) => !neueIds.has(idVon(d)));
      liste.push(...p[art]);
    }
    ziel[art] = liste;
  }
  return ziel;
}

/** Anzahl Datensätze je Art (nur Arten mit Werten). */
function zaehlen(paket) {
  const aus = {};
  for (const a of ARTEN) if (paket && Array.isArray(paket[a]) && paket[a].length) aus[a] = paket[a].length;
  return aus;
}

// ---------------------------------------------------------------------------------------------------
// Kontext: was der Kern für „heute“ braucht
// ---------------------------------------------------------------------------------------------------

/**
 * Nur die Tage behalten, die der Kern für heute braucht – Basislinie über basis.fenster.lang Tage, Schlafvergleich über
 * basis.fenster.kurz, Schlafschuld über schlaf.schuld.fenster Nächte (dafür die Belastung des jeweiligen Vortags, also Herzschläge).
 * Herzschläge sind die größte Art und werden nur für das Schuldfenster behalten; Trainings älterer Tage ohne ihre Herzschläge.
 */
function kontextAusPaket(paket = {}, heute) {
  const lang = K.wert("basis.fenster.lang"), kurz = K.wert("basis.fenster.kurz"), schuld = K.wert("schlaf.schuld.fenster");
  const reserve = VORGABEN.reserveTage;
  const abAlle = K.mitternacht(K.plusTage(heute, -(Math.max(lang, kurz, schuld) + reserve)));
  const abHerz = K.mitternacht(K.plusTage(heute, -(schuld + reserve)));
  const aus = leeresPaket();
  for (const art of RECHEN_ARTEN) {
    for (const d of paket[art] || []) {
      if (!d) continue;
      const zeit = art === "schlaf" ? d.bis : art === "training" ? d.von : d.t;
      if (!Number.isFinite(zeit)) continue;
      if (art === "herzschlag") { if (zeit >= abHerz) aus.herzschlag.push(d); continue; }
      if (zeit < abAlle) continue;
      if (art === "training" && zeit < abHerz && Array.isArray(d.herzschlaege) && d.herzschlaege.length) aus.training.push({ ...d, herzschlaege: [] });
      else aus[art].push(d);
    }
  }
  return aus;
}

/** Einstellungen für den Kern, gereinigt wie in shell/kern_echt.js (berechne). */
function einstellungenFuerKern(einst = {}) {
  const e = einst && typeof einst === "object" ? einst : {};
  const ganz = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.round(Number(x)) : undefined);
  return { alter: ganz(e.alter), maxPuls: ganz(e.maxPuls), ruhepuls: ganz(e.ruhepuls), schlafBasisMs: Number(e.schlafBasisMs) || undefined };
}

// ---------------------------------------------------------------------------------------------------
// Zusammenfassung
// ---------------------------------------------------------------------------------------------------

/** HRV-Basislinie zurück in Millisekunden (wie shell/kern_echt.js basisAnzeige), sonst Mittel/Streuung durch den Teiler. */
function basisMs(b, teiler) {
  if (!b || !b.n || b.mittel === null) return null;
  if (b.ln) { const s = b.streuung ?? 0; return { mittel: Math.exp(b.mittel), streuung: (Math.exp(b.mittel + s) - Math.exp(b.mittel - s)) / 2 }; }
  return { mittel: b.mittel / teiler, streuung: b.streuung === null ? 0 : b.streuung / teiler };
}

/** Übliche Aufwachzeit: Median der Minuten nach Mitternacht der letzten Hauptschlafe (mindestens drei). */
function ueblichesAufwachen(schlaefe, bisTag, tage = 7) {
  const minuten = [];
  for (let k = 0; k < tage; k++) {
    const tag = K.plusTage(bisTag, -k), s = K.hauptschlaf(tag, schlaefe);
    if (s) minuten.push(Math.round((s.bis - K.mitternacht(tag)) / K.MS_MINUTE));
  }
  if (minuten.length < 3) return null;
  minuten.sort((a, b) => a - b);
  return minuten[Math.floor(minuten.length / 2)];
}

/** Beschriftungen für Mitteilung und Widgets in der Sprache der App. */
function texte(s) {
  const T = (k, w) => t(k, w, s);
  return {
    erholung: T("hg_erholung"), belastung: T("hg_belastung"), schlaf: T("hg_schlaf"), atem: T("hg_atem"), zuletzt: T("hg_zuletzt"),
    bedarf: T("hg_bedarf"), stufe: { gruen: T("hg_stufe_gruen"), gelb: T("hg_stufe_gelb"), rot: T("hg_stufe_rot") },
    leer: T("hg_leer"), demo: T("hg_demo"), kanal: T("hg_kanal_morgen"), kanalHinweis: T("hg_kanal_hinweis"),
  };
}

/**
 * Tageszusammenfassung aus einem Messpaket. Tag = heute, wenn der Kern für heute Werte hat, sonst der letzte Tag mit Werten.
 * @param {object} paket normierte Messwerte (daten/ablage.js)
 * @param {object} [einst] Einstellungen der App (alter, maxPuls, ruhepuls, schlafBasisMs, sprache)
 * @param {{ jetzt?: number, quelle?: string, demo?: boolean }} [o]
 */
function zusammenfassung(paket = {}, einst = {}, { jetzt = Date.now(), quelle = "app", demo = false } = {}) {
  const s = (einst && einst.sprache) || aktuelleSprache() || "de";
  const vorher = aktuelleSprache();
  setzeSprache(s); // Zahlenformat (shell/format.js) folgt der gewählten Sprache; danach zurück
  try {
    const heute = K.isoTag(jetzt);
    const daten = {};
    for (const a of RECHEN_ARTEN) daten[a] = Array.isArray(paket[a]) ? paket[a] : [];
    const a = K.auswerter(daten, einstellungenFuerKern(einst));
    const sp = a.spanne();
    const basis = { version: VERSION, erzeugt: jetzt, quelle, demo: !!demo, sprache: s, texte: texte(s) };
    if (!sp) return { ...basis, tag: heute, istHeute: true, leer: true, erholung: { wert: null, stufe: null, text: "–" }, belastung: { wert: null, zehntel: null, text: "–" },
      schlaf: { wert: null, dauerMs: null, bedarfMs: null, text: "–", bedarfText: "–", anteil: null }, hrv: null, ruhepuls: null,
      kernaussage: t("hg_kern_keine_daten", null, s), zeile: t("hg_kern_keine_daten", null, s), schlafErkannt: false, aufwachenMs: null, schlafenszeit: null };
    const tag = sp.bis < heute ? sp.bis : heute;
    const kt = a.tag(tag);
    const HRV = K.wert("einheit.hrv");
    const er = kt.erholung || {};
    const erWert = Number.isFinite(er.wert) ? er.wert : null;
    const be = kt.belastung;
    const zehntel = be && Number.isFinite(be.wertZehntel) ? be.wertZehntel : null;
    const sl = kt.schlaf;
    const roh = K.hauptschlaf(tag, daten.schlaf);
    const dauerMs = sl && Number.isFinite(sl.dauerMs) ? sl.dauerMs : null;
    const bedarfMs = sl && Number.isFinite(sl.bedarfMs) ? sl.bedarfMs : (kt.bedarf && Number.isFinite(kt.bedarf.ms) ? kt.bedarf.ms : null);
    const hrv = kt.messwerte.hrv && Number.isFinite(kt.messwerte.hrv.wert) ? { wert: kt.messwerte.hrv.wert / HRV } : null;
    const ruhepuls = kt.messwerte.ruhepuls && Number.isFinite(kt.messwerte.ruhepuls.wert) ? { wert: kt.messwerte.ruhepuls.wert } : null;
    const istHeute = tag === heute;

    // Kernaussage: dieselben Sätze wie „Heute“ (shell/apps/heute.js kernsatz), als reiner Text
    let kern;
    if (erWert === null || !er.stufe) kern = t("heute_kern_leer", null, s);
    else {
      kern = t((istHeute ? "heute_kern_" : "tag_kern_") + er.stufe, { tag: tagLang(tag), wert: prozent(erWert) }, s);
      if (roh && sl) {
        const kurz = dauerMs < bedarfMs;
        const b = basisMs(kt.basis.hrv, HRV);
        const ruhig = !(hrv && b && hrv.wert < b.mittel - (b.streuung || 0));
        kern += " " + t(`heute_nacht_${kurz ? "kurz" : "lang"}_${ruhig ? "ruhig" : "unruhig"}`, null, s);
      }
    }
    const T = texte(s);
    const erText = erWert === null ? "–" : prozent(erWert);
    const beText = zehntel === null ? "–" : belastungText(zehntel);
    const slText = dauerMs === null ? "–" : dauerKurz(dauerMs);
    const zeile = `${T.erholung} ${erText} · ${T.belastung} ${beText} · ${T.schlaf} ${slText}`;

    // Schlafenszeit für die kommende Nacht: übliche Aufwachzeit minus Bedarf der nächsten Nacht
    let schlafenszeit = null;
    const aufMin = ueblichesAufwachen(daten.schlaf, tag);
    const bedarfNaechste = kt.bedarfNaechsteNacht && Number.isFinite(kt.bedarfNaechsteNacht.ms) ? kt.bedarfNaechsteNacht.ms : null;
    if (aufMin !== null && bedarfNaechste !== null) {
      const aufstehenMs = K.lokal(K.plusTage(tag, 1), aufMin), bettMs = aufstehenMs - bedarfNaechste;
      schlafenszeit = { bettMs, aufstehenMs, bedarfMs: bedarfNaechste,
        text: t("hg_schlafenszeit_text", { bett: uhrzeit(bettMs), bedarf: dauerKurz(bedarfNaechste), auf: uhrzeit(aufstehenMs) }, s) };
    }
    return {
      ...basis, tag, istHeute, leer: false,
      erholung: { wert: erWert, stufe: erWert === null ? null : er.stufe || null, text: erText },
      belastung: { wert: zehntel === null ? null : zehntel / 10, zehntel, text: beText },
      schlaf: { wert: sl && Number.isFinite(sl.wert) ? sl.wert : null, dauerMs, bedarfMs, text: slText, bedarfText: bedarfMs === null ? "–" : dauerKurz(bedarfMs),
        anteil: dauerMs !== null && bedarfMs ? Math.round((dauerMs / bedarfMs) * 100) : null },
      hrv, ruhepuls, kernaussage: kern, zeile, schlafErkannt: !!roh && istHeute, aufwachenMs: roh ? roh.bis : null, schlafenszeit,
      tagText: istHeute ? t("tag_heute", null, s) : tagLang(tag), zahlen: { erholung: erText, belastung: beText, schlaf: slText }, stufeText: erWert === null ? "" : T.stufe[er.stufe] || "",
    };
  } finally {
    setzeSprache(vorher);
  }
}

const json = (x, ersatz) => { if (x === null || x === undefined || x === "") return ersatz; if (typeof x === "string") { try { return JSON.parse(x); } catch { return ersatz; } } return x; };

/** Für die Android-Hülle: Messpaket und Einstellungen als JSON-Text → Zusammenfassung (Objekt). */
function heuteAusMessungen(paketJson, einstJson, jetzt = Date.now(), quelle = "hintergrund") {
  return zusammenfassung(json(paketJson, {}) || {}, json(einstJson, {}) || {}, { jetzt: Number(jetzt) || Date.now(), quelle });
}

/** Kontext der App (normiert) + Eingang (Rohformat je Typ) → Zusammenfassung. Herzschläge des Kontexts gehen an neue Trainings. */
function heuteAusEingang(kontextJson, eingangJson, einstJson, jetzt = Date.now()) {
  const kontext = json(kontextJson, {}) || {};
  const eingang = eingangZuPaket(json(eingangJson, {}) || {}, { herzschlaege: kontext.herzschlag || [] });
  const r = zusammenfassung(vereinen(kontext, eingang), json(einstJson, {}) || {}, { jetzt: Number(jetzt) || Date.now(), quelle: "hintergrund" });
  r.eingang = zaehlen(eingang);
  return r;
}

// ---------------------------------------------------------------------------------------------------
// Mit Brücke und Speicher (nur in der Android-App)
// ---------------------------------------------------------------------------------------------------

/** Brücke des Hintergrund-Plugins (daten/bruecke_capacitor.js installiereHintergrundBruecke), oder null. */
function findeBruecke(ziel = globalThis) {
  const b = ziel && ziel.MF && ziel.MF.native && ziel.MF.native.hintergrund;
  return b && typeof b.eingangUebernehmen === "function" ? b : null;
}

/**
 * Eingang übernehmen: Android gibt den Korb heraus (und legt einen neuen an), die App legt ab, dann wird bestätigt und gelöscht.
 * Scheitert das Ablegen, bleibt der Korb liegen und kommt beim nächsten Mal wieder (Doppelte fängt quelle.id ab).
 * @returns {Promise<{ neu:number, ersetzt:number, arten:object, fehlerZeilen:number, marke:string|null }>}
 */
async function abholen({ speicher, bruecke }) {
  if (!bruecke || !speicher) return { neu: 0, ersetzt: 0, arten: {}, fehlerZeilen: 0, marke: null };
  const r = (await bruecke.eingangUebernehmen()) || {};
  const dateien = r.dateien || {};
  if (!Object.keys(dateien).length) { if (r.marke) await bruecke.eingangBestaetigen({ marke: r.marke }); return { neu: 0, ersetzt: 0, arten: {}, fehlerZeilen: 0, marke: r.marke || null }; }
  // Herzschläge aus dem Speicher für Trainings, deren Puls schon früher kam
  let herzschlaege = [];
  if (dateien.ExerciseSession) {
    const sitzungen = jsonlLesen(Array.isArray(dateien.ExerciseSession) ? dateien.ExerciseSession.map((x) => JSON.stringify(x)).join("\n") : dateien.ExerciseSession).datensaetze;
    const zeiten = sitzungen.map((x) => Number(x.startTime)).filter(Number.isFinite);
    if (zeiten.length) herzschlaege = await leseMessungen(speicher, "herzschlag", K.plusTage(K.isoTag(Math.min(...zeiten)), -1), K.plusTage(K.isoTag(Math.max(...zeiten)), 1));
  }
  const paket = eingangZuPaket(dateien, { herzschlaege });
  const abgelegt = await speichereMessungen(speicher, paket);
  if (r.marke) await bruecke.eingangBestaetigen({ marke: r.marke });
  return { neu: abgelegt.neu, ersetzt: abgelegt.ersetzt, arten: zaehlen(paket), fehlerZeilen: paket.fehlerZeilen || 0, marke: r.marke || null };
}

/** Kurzer Fingerabdruck eines Textes (FNV-1a, 32 Bit) – nur um unveränderten Kontext nicht erneut zu schicken. */
function fingerabdruck(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${text.length.toString(36)}-${h.toString(36)}`;
}

let letzterKontext = null;

/**
 * Kontext und Zusammenfassung an Android geben und die Widgets nachführen. Ohne eigene Messwerte (Demodaten der App) wird eine
 * leere Zusammenfassung geschrieben – Widgets und Mitteilung zeigen nie erfundene Werte als echte.
 */
async function spiegeln({ speicher, bruecke, jetzt = Date.now() }) {
  if (!bruecke || !speicher) return null;
  const heute = K.isoTag(jetzt);
  const ab = K.plusTage(heute, -(Math.max(K.wert("basis.fenster.lang"), K.wert("schlaf.schuld.fenster")) + VORGABEN.reserveTage + 1));
  const paket = leeresPaket();
  for (const art of RECHEN_ARTEN) paket[art] = await leseMessungen(speicher, art, ab);
  const einst = (await speicher.lies("einstellungen")) || {};
  const eigene = RECHEN_ARTEN.some((a) => paket[a].length);
  const kontext = kontextAusPaket(paket, heute);
  const kontextText = JSON.stringify(kontext);
  const marke = fingerabdruck(kontextText);
  if (marke !== letzterKontext && typeof bruecke.kontextSchreiben === "function") {
    await bruecke.kontextSchreiben({ json: kontextText, marke, einstellungen: JSON.stringify({ ...einstellungenFuerKern(einst), sprache: einst.sprache || "de" }) });
    letzterKontext = marke;
  }
  const z = zusammenfassung(eigene ? paket : {}, einst, { jetzt, quelle: "app", demo: !eigene });
  await bruecke.zusammenfassungSchreiben({ json: JSON.stringify(z) });
  if (typeof bruecke.widgetsAktualisieren === "function") await bruecke.widgetsAktualisieren();
  return z;
}

/** Nur für Tests: Merker des letzten Kontexts zurücksetzen. */
function _zuruecksetzen() { letzterKontext = null; }

/** Erlaubte Sprungziele aus Mitteilung und Widget (alles andere wird ignoriert). */
const WEGE = ["#/heute", "#/schlaf", "#/belastung", "#/atem", "#/mehr/mitteilungen"];

/**
 * In der Android-App einhängen: wartet auf den Speicher der Shell, übernimmt den Eingang (und lädt die Shell neu, wenn etwas
 * Neues kam), spiegelt die Zusammenfassung; danach bei jeder Rückkehr abholen, bei jedem Verlassen spiegeln. Sprünge aus
 * Mitteilung/Widget („weg“) setzen die Adresse. Im Browser und in Node tut die Funktion nichts.
 * @returns {object|null} Steuerobjekt { abholen, spiegeln } oder null
 */
function einhaengen(ziel = globalThis) {
  if (!ziel || typeof ziel !== "object") return null;
  const bruecke = findeBruecke(ziel) || (installiereHintergrundBruecke(ziel) && findeBruecke(ziel));
  if (!bruecke || ziel.__mfHintergrund) return ziel && ziel.__mfHintergrund ? ziel.__mfHintergrund : null;
  const speicherVon = () => (ziel.MF && ((ziel.MF.shell && ziel.MF.shell.speicher) || ziel.MF.speicher)) || null;
  let laeuft = Promise.resolve();
  const nacheinander = (fn) => (laeuft = laeuft.then(fn, fn).catch((e) => { if (ziel.console) ziel.console.warn("Hintergrund:", e); }));
  const steuer = {
    abholen: () => nacheinander(async () => {
      const sp = speicherVon(); if (!sp) return null;
      const r = await abholen({ speicher: sp, bruecke });
      if (r.neu > 0 && ziel.MF.shell && typeof ziel.MF.shell.neuLaden === "function") await ziel.MF.shell.neuLaden();
      return r;
    }),
    spiegeln: () => nacheinander(async () => { const sp = speicherVon(); return sp ? spiegeln({ speicher: sp, bruecke }) : null; }),
  };
  ziel.__mfHintergrund = steuer;
  if (typeof bruecke.beiWeg === "function") bruecke.beiWeg((weg) => { if (WEGE.includes(weg) && ziel.location) ziel.location.hash = weg; });
  let versuche = 0;
  const start = () => {
    if (!speicherVon()) { if (++versuche < VORGABEN.warteVersuche && ziel.setTimeout) ziel.setTimeout(start, VORGABEN.warteMs); return; }
    steuer.abholen().then(() => steuer.spiegeln());
  };
  start();
  const doc = ziel.document;
  if (doc && typeof doc.addEventListener === "function") {
    doc.addEventListener("visibilitychange", () => { if (doc.visibilityState === "hidden") steuer.spiegeln(); else steuer.abholen().then(() => steuer.spiegeln()); });
  }
  return steuer;
}
return { VERSION, VORGABEN, jsonlLesen, eingangZuPaket, vereinen, zaehlen, kontextAusPaket, einstellungenFuerKern, zusammenfassung, heuteAusMessungen, heuteAusEingang, findeBruecke, abholen, fingerabdruck, spiegeln, _zuruecksetzen, WEGE, einhaengen };
})();

// ===== android/kern_einstieg.js
const __m_android_kern_einstieg_js = (() => {
/* android/kern_einstieg.js – Einstieg für kern.bundle.js (gebaut von bau.py nach android/app/src/main/assets/kern.bundle.js).
 *
 * Kernaussage: Wenn die App geschlossen ist, rechnet Android die Tageswerte trotzdem – mit genau demselben Rechenkern wie die App.
 * Dafür baut bau.py aus dieser Datei, dem Kern (kern/), der Zuordnung von Health Connect (daten/) und den Texten (shell/i18n/)
 * ein einziges Skript ohne Module. Der Hintergrund-Abgleich (HintergrundAbgleichWorker.kt) lädt es in ein unsichtbares
 * Browserfenster, gibt ihm die Messwerte und bekommt die Zusammenfassung für Mitteilung und Widgets zurück.
 *
 * Schnittstelle (globalThis.MFKern):
 *   alleTage(daten, einst), tagAuswerten(tag, daten, einst), demoDaten({ bis, tage })      – wie kern/index.js
 *   heuteAusMessungen(paketJson, einstJson, jetztMs) → Zusammenfassung (daten/hintergrund.js)
 *   heuteAusEingang(kontextJson, eingangJson, einstJson, jetztMs) → Zusammenfassung
 *   zusammenfassung(paket, einst, { jetzt, quelle }), kontextAusPaket(paket, heute), eingangZuPaket(dateien)
 *   rechneAusNativ()  liest über die Java-Schnittstelle MFNativ (kontext(), eingang(), einstellungen(), jetzt()) und meldet
 *                     MFNativ.ergebnis(json) oder MFNativ.fehler(text) – so muss Android keine großen Texte in Skript einbetten.
 *   VERSION
 */
const K = __m_kern_index_js;
const { heuteAusMessungen, heuteAusEingang, zusammenfassung, kontextAusPaket, eingangZuPaket, VERSION } = __m_daten_hintergrund_js;

function rechneAusNativ() {
  const n = globalThis.MFNativ;
  if (!n) throw new Error("MFNativ fehlt");
  try {
    const z = heuteAusEingang(n.kontext(), n.eingang(), n.einstellungen(), Number(n.jetzt()));
    n.ergebnis(JSON.stringify(z));
  } catch (e) {
    n.fehler(String((e && e.stack) || e));
  }
}

globalThis.MFKern = {
  VERSION,
  alleTage: K.alleTage, tagAuswerten: K.tagAuswerten, demoDaten: K.demoDaten,
  heuteAusMessungen, heuteAusEingang, zusammenfassung, kontextAusPaket, eingangZuPaket, rechneAusNativ,
};
return {  };
})();
})();
