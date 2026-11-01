#!/usr/bin/env python3
"""r_stub.py – erzeugt R.java-Stummel aus einem res/-Ordner und prüft die Ressourcen (für kotlin_pruefen.sh, ohne Gradle/aapt).

Kernaussage: Ohne Android-Werkzeuge gibt es keine R-Klasse. Dieses Skript liest die Ressourcen eines Moduls (Layouts, Bilder,
Texte, Farben, Maße, IDs) und schreibt eine R.java mit genau diesen Namen. Greift der Kotlin-Code auf einen Namen zu, den es nicht
gibt, schlägt die Übersetzung fehl. Zusätzlich: jede XML-Datei muss gültig sein, jeder Verweis @typ/name muss existieren, Widget-
und Mitteilungs-Layouts dürfen nur Ansichten enthalten, die RemoteViews erlauben, und DE/EN müssen dieselben Texte haben.

Aufruf: python3 r_stub.py <res-ordner> <paket> <ausgabe-ordner>     Exit 1 bei einem Befund.
"""
import pathlib, re, sys
import xml.etree.ElementTree as ET

ANDROID = "{http://schemas.android.com/apk/res/android}"
# Ansichten, die RemoteViews (Widgets, eigene Mitteilungen) aufblasen dürfen (developer.android.com, RemoteViews)
REMOTE = {"FrameLayout", "LinearLayout", "RelativeLayout", "GridLayout", "AnalogClock", "Button", "Chronometer", "ImageButton",
          "ImageView", "ProgressBar", "TextView", "ViewFlipper", "ListView", "GridView", "StackView", "AdapterViewFlipper", "ViewStub"}
WERTE = {"string": "string", "color": "color", "dimen": "dimen", "bool": "bool", "integer": "integer", "style": "style"}


def main(res: str, paket: str, aus: str) -> int:
    res_p = pathlib.Path(res)
    namen: dict[str, set[str]] = {k: set() for k in ["layout", "drawable", "xml", "mipmap", "id", *WERTE.values()]}
    befunde: list[str] = []
    texte: dict[str, set[str]] = {}
    baeume = []
    for datei in sorted(res_p.rglob("*.xml")):
        ordner = datei.parent.name
        art = ordner.split("-")[0]
        try:
            baum = ET.parse(datei)
        except ET.ParseError as e:
            befunde.append(f"{datei}: kein gültiges XML ({e})")
            continue
        baeume.append((datei, baum))
        if art in ("layout", "drawable", "xml", "mipmap"):
            namen[art].add(datei.stem)
        elif art == "values":
            for el in baum.getroot():
                typ = el.get("type") if el.tag == "item" else el.tag
                if typ in WERTE:
                    namen[WERTE[typ]].add(el.get("name").replace(".", "_"))
                if el.tag == "string":
                    texte.setdefault(ordner, set()).add(el.get("name"))
        for el in baum.iter():
            for wert in el.attrib.values():
                m = re.fullmatch(r"@\+id/(\w+)", wert)
                if m:
                    namen["id"].add(m.group(1))
    # Verweise prüfen
    for datei, baum in baeume:
        for el in baum.iter():
            for wert in list(el.attrib.values()) + [el.text or ""]:
                for typ, name in re.findall(r"^@(?!android:|\+)(\w+)/([\w.]+)$", wert.strip()):
                    if typ in namen and name.replace(".", "_") not in namen[typ]:
                        befunde.append(f"{datei.name}: Verweis @{typ}/{name} fehlt")
        if datei.parent.name == "layout" and re.match(r"mf_(widget|mitteilung)_", datei.stem):
            for el in baum.iter():
                if el.tag not in REMOTE:
                    befunde.append(f"{datei.name}: <{el.tag}> ist in RemoteViews nicht erlaubt")
    # DE und EN vollständig
    de, en = texte.get("values", set()), texte.get("values-en", set())
    if en and de != en:
        befunde.append(f"Texte DE/EN verschieden: nur DE {sorted(de - en)}, nur EN {sorted(en - de)}")
    ziel = pathlib.Path(aus) / pathlib.Path(*paket.split("."))
    ziel.mkdir(parents=True, exist_ok=True)
    zeilen = [f"package {paket};", "/** erzeugt von android/pruefung/r_stub.py – nur für die Kotlin-Prüfung */", "public final class R {"]
    nr = 0x7f000001
    for art, liste in sorted(namen.items()):
        if not liste:
            continue
        felder = []
        for n in sorted(liste):
            felder.append(f"public static final int {n} = {nr};")
            nr += 1
        zeilen.append(f"  public static final class {art} {{ {' '.join(felder)} }}")
    zeilen.append("}")
    (ziel / "R.java").write_text("\n".join(zeilen) + "\n", encoding="utf-8")
    for b in befunde:
        print("Befund:", b, file=sys.stderr)
    print(f"R.java für {paket}: " + ", ".join(f"{k} {len(v)}" for k, v in sorted(namen.items()) if v))
    return 1 if befunde else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
