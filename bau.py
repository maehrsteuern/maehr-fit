#!/usr/bin/env python3
"""bau.py – baut MF.html, die eine Offline-Datei von MAEHR FIT (Vorbild: bau.py der MBS, hier bewusst klein).

Kernaussage: Aus shell/index.html wird eine einzige HTML-Datei, die ohne Netz läuft. Die Stylesheets und die Schriften werden
eingesetzt, und alle ES-Module (Shell und Kern) werden – ausgehend von shell/shell.js entlang ihrer Importe – in der richtigen
Reihenfolge zu einem einzigen Modul-Skript zusammengefügt. Jede Datei bleibt in ihrem eigenen Gültigkeitsbereich. Das Ergebnis ist
deterministisch: zweimal bauen ergibt dieselben Bytes.

Zweite Ausgabe (Android): android/app/src/main/assets/kern.bundle.js – derselbe Rechenkern als ein Skript ohne Module (eine sofort
ausgeführte Funktion, setzt globalThis.MFKern), Einstieg android/kern_einstieg.js. Der Hintergrund-Abgleich der App rechnet damit
die Tageszusammenfassung für Mitteilung und Widgets (docs/technik/hintergrund.md). MF.html bleibt davon unberührt.

Aufruf:  python3 bau.py            MF.html und kern.bundle.js neu schreiben, Größe ausgeben
         python3 bau.py --pruefen  nur vergleichen: Exit 1, wenn MF.html oder kern.bundle.js veraltet ist
"""
from __future__ import annotations
import json, pathlib, re, sys

WURZEL = pathlib.Path(__file__).resolve().parent
ZIEL = WURZEL / "MF.html"
EINSTIEG = "shell/shell.js"
BUNDLE_EINSTIEG = "android/kern_einstieg.js"
BUNDLE_ZIEL = WURZEL / "android/app/src/main/assets/kern.bundle.js"

IMPORT_RE = re.compile(r'^[ \t]*import\s+(?:(?P<default>[A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{(?P<namen>[^}]*)\}|\*\s+as\s+(?P<alle>[A-Za-z_$][\w$]*))?\s*(?:from\s+)?"(?P<pfad>[^"]+)"\s*(?:with\s*\{[^}]*\})?\s*;[ \t]*$', re.M)
EXPORT_FROM_RE = re.compile(r'^[ \t]*export\s+\{(?P<namen>[^}]*)\}\s*from\s+"(?P<pfad>[^"]+)"\s*;[ \t]*$', re.M)
EXPORT_DECL_RE = re.compile(r'^([ \t]*)export\s+(?:(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*))', re.M)
EXPORT_DEFAULT_RE = re.compile(r'^([ \t]*)export\s+default\s+', re.M)
EXPORT_LISTE_RE = re.compile(r'^[ \t]*export\s+\{([^}]*)\}\s*;[ \t]*$', re.M)


def lies(rel: str) -> str:
    return (WURZEL / rel).read_text(encoding="utf-8")


def aufloesen(basis: str, rel: str) -> str:
    teile = list(pathlib.PurePosixPath(basis).parent.parts)
    for seg in pathlib.PurePosixPath(rel).parts:
        if seg == "..":
            teile.pop()
        elif seg != ".":
            teile.append(seg)
    return "/".join(teile)


def modulname(rel: str) -> str:
    return "__m_" + re.sub(r"[^A-Za-z0-9]", "_", rel)


def abhaengigkeiten(rel: str) -> list[str]:
    t = lies(rel)
    return [aufloesen(rel, m.group("pfad")) for m in list(IMPORT_RE.finditer(t)) + list(EXPORT_FROM_RE.finditer(t))]


def reihenfolge(einstieg: str) -> list[str]:
    """Tiefensuche: jedes Modul nach seinen Abhängigkeiten; Kreise werden gemeldet."""
    fertig: list[str] = []
    laeuft: set[str] = set()

    def besuche(rel: str, kette: list[str]) -> None:
        if rel in fertig:
            return
        if rel in laeuft:
            raise SystemExit("Fehler: Import-Kreis " + " → ".join(kette + [rel]))
        if not (WURZEL / rel).exists():
            raise SystemExit(f"Fehler: {kette[-1] if kette else '?'} importiert {rel}, die Datei fehlt")
        laeuft.add(rel)
        if rel.endswith(".js"):
            for d in abhaengigkeiten(rel):
                besuche(d, kette + [rel])
        laeuft.discard(rel)
        fertig.append(rel)

    besuche(einstieg, [])
    return fertig


def namen_liste(roh: str) -> list[tuple[str, str]]:
    """„a, b as c“ → [("a","a"), ("b","c")] (Quelle, Ziel)."""
    paare = []
    for x in roh.split(","):
        x = x.strip()
        if not x:
            continue
        q, _, z = x.partition(" as ")
        paare.append((q.strip(), (z or q).strip()))
    return paare


def mehrfach_namen(rest: str) -> list[str]:
    """Weitere Namen einer Mehrfach-Deklaration `export const A = …, B = …;` (Kommas auf Klammerebene 0)."""
    namen, tiefe, zeichen = [], 0, None
    for i, z in enumerate(rest):
        if zeichen:
            zeichen = None if z == zeichen and rest[i - 1] != "\\" else zeichen
        elif z in "\"'`":
            zeichen = z
        elif z in "([{":
            tiefe += 1
        elif z in ")]}":
            tiefe -= 1
        elif z == ";" and tiefe == 0:
            break
        elif z == "," and tiefe == 0 and (n := re.match(r"\s*([A-Za-z_$][\w$]*)\s*=(?![=>])", rest[i + 1:])):
            namen.append(n.group(1))
    return namen


def gekapselt(rel: str) -> str:
    if rel.endswith(".json"):
        return f"// ===== {rel}\nconst {modulname(rel)} = {{ default: {json.dumps(json.loads(lies(rel)), ensure_ascii=False, separators=(',', ':'))} }};\n"
    t = lies(rel)
    exporte: list[str] = []

    def ersetze_import(m: re.Match) -> str:
        quelle = modulname(aufloesen(rel, m.group("pfad")))
        zeilen = []
        if m.group("default"):
            zeilen.append(f"const {m.group('default')} = {quelle}.default;")
        if m.group("namen") is not None:
            felder = ", ".join(q if q == z else f"{q}: {z}" for q, z in namen_liste(m.group("namen")))
            if felder:
                zeilen.append(f"const {{ {felder} }} = {quelle};")
        if m.group("alle"):
            zeilen.append(f"const {m.group('alle')} = {quelle};")
        return " ".join(zeilen)

    def ersetze_export_from(m: re.Match) -> str:
        quelle = modulname(aufloesen(rel, m.group("pfad")))
        # Weiterreichen ohne eigene Bindung (die Datei darf denselben Namen zusätzlich importieren)
        exporte.extend(f"{z}: {quelle}.{q}" for q, z in namen_liste(m.group("namen")))
        return ""

    t = EXPORT_FROM_RE.sub(ersetze_export_from, t)
    t = IMPORT_RE.sub(ersetze_import, t)
    for m in EXPORT_DECL_RE.finditer(t):
        exporte.append(m.group(2) or m.group(3) or m.group(4))
        if m.group(4):
            ende = t.find("\n", m.end())
            exporte.extend(mehrfach_namen(t[m.end():ende if ende >= 0 else None]))
    t = EXPORT_DECL_RE.sub(lambda m: m.group(0).replace("export ", "", 1), t)
    if EXPORT_DEFAULT_RE.search(t):
        t = EXPORT_DEFAULT_RE.sub(lambda m: m.group(1) + "const __standard = ", t, count=1)
        exporte.append("default: __standard")
    for m in EXPORT_LISTE_RE.finditer(t):
        exporte.extend(f"{z}: {q}" if q != z else q for q, z in namen_liste(m.group(1)))
    t = EXPORT_LISTE_RE.sub("", t)
    rueck = ", ".join(dict.fromkeys(exporte))
    return f"// ===== {rel}\nconst {modulname(rel)} = (() => {{\n{t.strip()}\nreturn {{ {rueck} }};\n}})();\n"


def baue() -> str:
    html = lies("shell/index.html")
    html = html.replace("<title>MAEHR FIT</title>", "<title>MAEHR FIT</title>\n<!-- Einzeldatei, erzeugt von bau.py – nicht von Hand ändern -->", 1)
    schriften = WURZEL / "shell/vendor/schriften.css"
    html = re.sub(r"<!--SCHRIFTEN-->.*?<!--/SCHRIFTEN-->", lambda m: ("<style>\n" + schriften.read_text(encoding="utf-8") + "</style>") if schriften.exists() else "", html, flags=re.S)
    html = re.sub(r'<link rel="stylesheet" href="(design/[\w.]+\.css)">', lambda m: "<style>\n" + lies("shell/" + m.group(1)).replace("</style", "<\\/style") + "</style>", html)
    code = '"use strict";\n' + "\n".join(gekapselt(rel) for rel in reihenfolge(EINSTIEG))
    code = code.replace("</script", "<\\/script")
    return html.replace('<script type="module" src="shell.js"></script>', '<script type="module">\n' + code + "</script>")


def baue_bundle() -> str:
    """kern.bundle.js: alle Module ab android/kern_einstieg.js in einer sofort ausgeführten Funktion (kein Modul-Skript)."""
    kopf = "/* kern.bundle.js – erzeugt von bau.py aus android/kern_einstieg.js (Kern, Zuordnung, Texte) – nicht von Hand ändern */\n"
    code = "\n".join(gekapselt(rel) for rel in reihenfolge(BUNDLE_EINSTIEG))
    return kopf + "(function () {\n\"use strict\";\n" + code.replace("</script", "<\\/script") + "})();\n"


def main(argv: list[str]) -> int:
    neu = baue()
    bundle = baue_bundle()
    if "--pruefen" in argv:
        alt = ZIEL.read_text(encoding="utf-8") if ZIEL.exists() else ""
        alt_bundle = BUNDLE_ZIEL.read_text(encoding="utf-8") if BUNDLE_ZIEL.exists() else ""
        if alt != neu:
            print("MF.html ist veraltet – python3 bau.py ausführen", file=sys.stderr)
            return 1
        if alt_bundle != bundle:
            print("kern.bundle.js ist veraltet – python3 bau.py ausführen", file=sys.stderr)
            return 1
        print("MF.html ist aktuell · kern.bundle.js ist aktuell")
        return 0
    ZIEL.write_text(neu, encoding="utf-8")
    BUNDLE_ZIEL.parent.mkdir(parents=True, exist_ok=True)
    BUNDLE_ZIEL.write_text(bundle, encoding="utf-8")
    module = reihenfolge(EINSTIEG)
    print(f"MF.html: {len(neu.encode('utf-8')) / 1000:.0f} KB · {len(module)} Module · Kern: {'kern/' if any(m.startswith('kern/') for m in module) else 'fehlt'}")
    print(f"kern.bundle.js: {len(bundle.encode('utf-8')) / 1000:.0f} KB · {len(reihenfolge(BUNDLE_EINSTIEG))} Module (android/app/src/main/assets/)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
