#!/usr/bin/env python3
"""Kopiert MF.html (erzeugt von bau.py) nach dist/index.html – das ist der Web-Inhalt der Android-App.

Aufruf aus dem Repo-Stamm:  python3 android/bau_dist.py   (oder: npm run bau)
"""
import pathlib
import shutil
import sys

STAMM = pathlib.Path(__file__).resolve().parent.parent
QUELLE = STAMM / "MF.html"
ZIEL = STAMM / "dist" / "index.html"


def main() -> int:
    if not QUELLE.is_file():
        print("MF.html fehlt. Bitte zuerst 'python3 bau.py' ausführen.", file=sys.stderr)
        return 1
    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(QUELLE, ZIEL)
    print(f"dist/index.html aktualisiert ({QUELLE.stat().st_size // 1024} KB aus MF.html).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
