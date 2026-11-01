#!/usr/bin/env bash
# android/pruefung/kotlin_pruefen.sh – übersetzt alle Kotlin-Quellen der Android-Hülle ohne Gradle und ohne Android Studio.
#
# Kernaussage: In der Cloud gibt es kein Android SDK. Damit Tipp- und Typfehler trotzdem vor dem ersten Bau auf Loris' Rechner
# auffallen, übersetzt dieses Skript die Kotlin-Dateien mit kotlinc 1.9.24 gegen android.jar (API 34), Health Connect
# 1.1.0-alpha08, androidx.activity 1.8.0, kotlinx-coroutines 1.7.3, WorkManager 2.9.1 und kleine Stummel für Capacitor
# (android/pruefung/stub, Signaturen wie @capacitor/android 6.2.1) und für die R-Klassen (r_stub.py aus den res/-Ordnern).
# Danach wird MainActivity.java mit javac übersetzt. Ein echter Gradle-Bau (aapt, Manifest-Zusammenführung, D8) ersetzt das
# nicht – es fängt aber alle Fehler im Quelltext ab.
#
# Aufruf (aus dem Repo-Stamm):  bash android/pruefung/kotlin_pruefen.sh
# Zwischenspeicher: $MF_PRUEF_CACHE (Standard ~/.cache/mf-kotlin-pruefung); dort fehlende Dateien werden einmal geladen.
set -euo pipefail
HIER="$(cd "$(dirname "$0")" && pwd)"
ANDROID="$(dirname "$HIER")"
CACHE="${MF_PRUEF_CACHE:-$HOME/.cache/mf-kotlin-pruefung}"
ARBEIT="$(mktemp -d)"
trap 'rm -rf "$ARBEIT"' EXIT
mkdir -p "$CACHE"

G=https://dl.google.com/dl/android/maven2
M=https://repo1.maven.org/maven2
holen() { # url ziel
  if [ ! -s "$CACHE/$2" ]; then echo "lade $2 …"; curl -sSfL --retry 4 --retry-delay 3 -o "$CACHE/$2.teil" "$1" && mv "$CACHE/$2.teil" "$CACHE/$2"; fi
}
aar() { # url name → name.jar (classes.jar aus dem AAR)
  if [ ! -s "$CACHE/$2.jar" ]; then holen "$1" "$2.aar"; unzip -p "$CACHE/$2.aar" classes.jar > "$CACHE/$2.jar"; fi
}

if [ ! -x "$CACHE/kotlinc/bin/kotlinc" ]; then
  holen https://github.com/JetBrains/kotlin/releases/download/v1.9.24/kotlin-compiler-1.9.24.zip kotlin-1.9.24.zip
  unzip -q -o "$CACHE/kotlin-1.9.24.zip" -d "$CACHE"
fi
if [ ! -s "$CACHE/android.jar" ]; then
  holen https://dl.google.com/android/repository/platform-34-ext7_r02.zip platform-34.zip
  unzip -p "$CACHE/platform-34.zip" 'android-34/android.jar' > "$CACHE/android.jar"
fi
aar $G/androidx/health/connect/connect-client/1.1.0-alpha08/connect-client-1.1.0-alpha08.aar connect-client
aar $G/androidx/activity/activity/1.8.0/activity-1.8.0.aar activity
aar $G/androidx/work/work-runtime/2.9.1/work-runtime-2.9.1.aar work-runtime
holen $M/org/jetbrains/kotlinx/kotlinx-coroutines-core-jvm/1.7.3/kotlinx-coroutines-core-jvm-1.7.3.jar coroutines-core.jar
holen $M/org/jetbrains/kotlinx/kotlinx-coroutines-android/1.7.3/kotlinx-coroutines-android-1.7.3.jar coroutines-android.jar
holen $M/com/google/guava/listenablefuture/1.0/listenablefuture-1.0.jar listenablefuture.jar

KCP="$CACHE/android.jar:$CACHE/connect-client.jar:$CACHE/activity.jar:$CACHE/work-runtime.jar:$CACHE/coroutines-core.jar:$CACHE/coroutines-android.jar:$CACHE/listenablefuture.jar"

# 1. Stummel: Capacitor + R-Klassen beider Module (mit Ressourcen-Prüfung)
mkdir -p "$ARBEIT/stub" "$ARBEIT/stubout" "$ARBEIT/out"
python3 "$HIER/r_stub.py" "$ANDROID/plugins/healthconnect/src/main/res" de.maehrsteuern.fit.healthconnect "$ARBEIT/stub"
python3 "$HIER/r_stub.py" "$ANDROID/plugins/hintergrund/src/main/res" de.maehrsteuern.fit.hintergrund "$ARBEIT/stub"
javac -nowarn -d "$ARBEIT/stubout" -cp "$CACHE/android.jar" $(find "$HIER/stub" "$ARBEIT/stub" -name '*.java') > "$ARBEIT/stub.log" 2>&1 || { grep -v "JAVA_TOOL_OPTIONS" "$ARBEIT/stub.log"; exit 1; }

# 2. Kotlin (beide Module zusammen, wie im App-Bau)
QUELLEN=$(find "$ANDROID/plugins" -path '*/src/main/java/*' -name '*.kt' | sort)
echo "kotlinc: $(echo "$QUELLEN" | wc -l) Dateien"
if ! "$CACHE/kotlinc/bin/kotlinc" -jvm-target 17 -Werror -cp "$KCP:$ARBEIT/stubout" -d "$ARBEIT/out" $QUELLEN > "$ARBEIT/kotlinc.log" 2>&1; then
  grep -v "JAVA_TOOL_OPTIONS" "$ARBEIT/kotlinc.log"; echo "Kotlin-Prüfung: Fehler (siehe oben)" >&2; exit 1
fi
grep -v "JAVA_TOOL_OPTIONS" "$ARBEIT/kotlinc.log" || true
test -s "$ARBEIT/out/de/maehrsteuern/fit/hintergrund/HintergrundAbgleichWorker.class"

# 3. MainActivity.java gegen die übersetzten Plugins (BridgeActivity als Stummel)
mkdir -p "$ARBEIT/app"
javac -nowarn -d "$ARBEIT/app" -cp "$CACHE/android.jar:$ARBEIT/stubout:$ARBEIT/out:$CACHE/kotlinc/lib/kotlin-stdlib.jar" \
  "$ANDROID/app/src/main/java/de/maehrsteuern/fit/MainActivity.java" > "$ARBEIT/javac.log" 2>&1 || { grep -v "JAVA_TOOL_OPTIONS" "$ARBEIT/javac.log"; exit 1; }
test -s "$ARBEIT/app/de/maehrsteuern/fit/MainActivity.class"
echo "Kotlin-Prüfung bestanden: $(find "$ARBEIT/out" -name '*.class' | wc -l) Klassen, MainActivity übersetzt."
