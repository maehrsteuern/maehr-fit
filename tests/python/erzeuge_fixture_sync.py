"""tests/python/erzeuge_fixture_sync.py – erzeugt daten/fixtures/sync_interop.json mit der Python-Seite (desktop/mf_dienst.py).

Kernaussage: Die Datei hält feste Beispiele (Schlüssel, Zeit, Inhalt) samt dem, was der Rechner daraus rechnet: Unterschrift,
Kopplungscode, verschlüsselte Sendung und .mfx-Datei. tests/node/daten_sync.test.mjs prüft, dass das Handy (daten/sync.js) genau
dasselbe rechnet; tests/python/test_dienst.py prüft, dass die Datei noch zur Python-Seite passt.
Aufruf: python3 tests/python/erzeuge_fixture_sync.py   (nur nötig, wenn sich das Protokoll ändert)
"""
import hashlib, hmac, json, pathlib, sys

WURZEL = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WURZEL / "desktop"))
import mf_dienst as d  # noqa: E402

ZIEL = WURZEL / "daten" / "fixtures" / "sync_interop.json"


def inhalt() -> dict:
    schluessel = bytes(range(1, 33))                                  # 01 02 … 20 (erfunden)
    geraet, zeit = "g0123456789ab", "1793350800000"                   # 2026-10-30 08:20:00 UTC
    koerper = json.dumps({"messungen": [{"art": "ruhepuls", "tag": "2026-10-30", "daten": {"t": 1793340000000, "bpm": 52, "zoneMin": 60,
                          "quelle": {"art": "demo", "id": "muster:ruhepuls:1"}}}]}, ensure_ascii=False, separators=(",", ":"))
    pfad = "/api/sync"
    aus = {
        "hinweis": "Erzeugt von tests/python/erzeuge_fixture_sync.py – nicht von Hand ändern. Erfundene Werte (Musterperson).",
        "signatur": {
            "schluessel_b64url": d.b64url(schluessel), "geraet": geraet, "methode": "POST", "pfad": pfad, "zeit": zeit, "koerper": koerper,
            "koerper_sha256": hashlib.sha256(koerper.encode()).hexdigest(),
            "kanonisch": d.kanonisch("POST", pfad, zeit, koerper.encode()).decode(),
            "signatur": d.signatur(schluessel, "POST", pfad, zeit, koerper.encode()),
            "signatur_leer_get": d.signatur(schluessel, "GET", "/api/messungen?seit=1793350000000&art=hrv", zeit, b""),
        },
        "hmac_rfc4231_fall2": {"schluessel": "Jefe", "nachricht": "what do ya want for nothing?",
                               "hmac": hmac.new(b"Jefe", b"what do ya want for nothing?", hashlib.sha256).hexdigest()},
        "kopplung": {"text": d.kopplung_text("192.168.178.20", 8765, {"id": geraet, "schluessel": d.b64url(schluessel), "ablauf": 1793351400000, "name": "Handy"}),
                     "ablauf": 1793351400000, "fingerabdruck": hashlib.sha256(schluessel).hexdigest()[:8]},
        "aes_schluessel_hex": d.aes_schluessel(schluessel).hex(),
    }
    if d.krypto_verfuegbar():
        iv = bytes(range(100, 112))
        aus["sync_verschluesselt"] = {"iv_b64url": d.b64url(iv), **d.koerper_verschluesseln(schluessel, koerper.encode(), geraet, zeit, iv=iv)}
        export = {"format": "maehr-fit-export", "version": 1, "erstelltMs": 1793350800000,
                  "eintraege": {"messung:hrv:2026-10-30": [{"t": 1793340000000, "rmssdMs": 58, "quelle": {"art": "demo", "id": "muster:hrv:1"}}]}}
        aus["mfx"] = {"passwort": "Muster-Passwort-2026", "iterationen": 1000, "salz_b64url": d.b64url(bytes(range(16))),
                      "iv_b64url": d.b64url(bytes(range(200, 212))), "inhalt": export,
                      "datei": d.mfx_erstellen(export, "Muster-Passwort-2026", 1000, bytes(range(16)), bytes(range(200, 212)))}
    return aus


if __name__ == "__main__":
    ZIEL.write_text(json.dumps(inhalt(), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"geschrieben: {ZIEL.relative_to(WURZEL)}")
