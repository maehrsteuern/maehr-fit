"""tests/python/test_dienst.py – Dienst am Rechner (desktop/mf_dienst.py) und WHOOP-Import in Python (desktop/whoop_csv.py).

Kernaussage: Geprüft wird, dass der Rechner nur unterschriebene, frische und einmalige Sendungen annimmt, doppelte Messwerte
erkennt, WHOOP-Exporte genau wie die App einliest, den Eingangsordner abarbeitet und als echter Server richtig antwortet – auch
im Zusammenspiel mit dem Handy-Teil (daten/sync.js unter Node). Läuft mit `python3 -m pytest tests/python -q` oder
`python3 -m unittest discover -s tests/python -q`. Alle Werte sind erfunden (Musterperson).
"""
from __future__ import annotations

import hashlib
import http.client
import io
import json
import pathlib
import plistlib
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
import zipfile

WURZEL = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WURZEL / "desktop"))
sys.path.insert(0, str(WURZEL / "tests" / "python"))
import mf_dienst as d  # noqa: E402
import whoop_csv as w  # noqa: E402
import erzeuge_fixture_sync  # noqa: E402

FIXTURES = WURZEL / "daten" / "fixtures"
NAMEN = ["whoop_physiological_cycles.csv", "whoop_sleeps.csv", "whoop_workouts.csv", "whoop_journal_entries.csv"]
INTEROP = json.loads((FIXTURES / "sync_interop.json").read_text(encoding="utf-8"))
ERWARTET = json.loads((FIXTURES / "whoop_erwartet.json").read_text(encoding="utf-8"))
JETZT = 1793350800000  # 2026-10-30 08:20:00 UTC


def whoop_zip() -> bytes:
    puffer = io.BytesIO()
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED) as z:
        for n in NAMEN:
            z.writestr("my_whoop_data_2026_10_30/" + n.replace("whoop_", ""), (FIXTURES / n).read_text(encoding="utf-8"))
    return puffer.getvalue()


class Kopf(dict):
    """Wie http.server-Kopfzeilen: .get(name)."""


def signierter_kopf(g: dict, methode: str, pfad: str, koerper: bytes, zeit: int) -> Kopf:
    sig = d.signatur(d.aus_b64url(g["schluessel"]), methode, pfad, str(zeit), koerper)
    return Kopf({"X-MF-Geraet": g["id"], "X-MF-Zeit": str(zeit), "X-MF-Signatur": sig})


class MitAblage(unittest.TestCase):
    def setUp(self):
        self.ordner = pathlib.Path(tempfile.mkdtemp(prefix="mf-test-"))
        self.ablage = d.Ablage(self.ordner / "mf.sqlite")

    def tearDown(self):
        self.ablage.schliessen()
        shutil.rmtree(self.ordner, ignore_errors=True)


# ------------------------------------------------------------------------------------------------
class TestUnterschrift(unittest.TestCase):
    def test_fixture_aktuell(self):
        """sync_interop.json entspricht der Python-Seite (sonst: python3 tests/python/erzeuge_fixture_sync.py)."""
        self.assertEqual(erzeuge_fixture_sync.inhalt(), INTEROP)

    def test_rfc4231_fall2(self):
        # RFC 4231, Testfall 2: HMAC-SHA256("Jefe", "what do ya want for nothing?") = 5bdcc146…3843 (veröffentlichter Wert)
        f = INTEROP["hmac_rfc4231_fall2"]
        self.assertEqual(f["hmac"], "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843")

    def test_kanonischer_text_von_hand(self):
        # Rechenweg: "POST" \n "/api/sync" \n "1793350800000" \n sha256(Körper) – vier Zeilen, Hex in Kleinbuchstaben
        s = INTEROP["signatur"]
        self.assertEqual(s["kanonisch"].split("\n"), ["POST", "/api/sync", s["zeit"], hashlib.sha256(s["koerper"].encode()).hexdigest()])
        self.assertEqual(d.signatur(d.aus_b64url(s["schluessel_b64url"]), "post", "/api/sync", s["zeit"], s["koerper"].encode()), s["signatur"])

    def test_kopplung_text(self):
        roh = INTEROP["kopplung"]["text"]
        self.assertTrue(roh.startswith(d.KOPPEL_PRAEFIX))
        obj = json.loads(d.aus_b64url(roh[len(d.KOPPEL_PRAEFIX):]))
        self.assertEqual((obj["host"], obj["port"], obj["geraet_id"], obj["ablauf"]), ("192.168.178.20", 8765, "g0123456789ab", 1793351400000))
        self.assertEqual(len(d.aus_b64url(obj["schluessel"])), 32)

    @unittest.skipUnless(d.krypto_verfuegbar(), "cryptography fehlt")
    def test_verschluesselung_rundlauf(self):
        s, v = INTEROP["signatur"], INTEROP["sync_verschluesselt"]
        klar = d.koerper_entschluesseln(d.aus_b64url(s["schluessel_b64url"]), v, s["geraet"], s["zeit"])
        self.assertEqual(klar.decode(), s["koerper"])
        with self.assertRaises(d.Abgelehnt):   # andere Zeit = andere Zusatzdaten → GCM-Prüfung schlägt fehl
            d.koerper_entschluesseln(d.aus_b64url(s["schluessel_b64url"]), v, s["geraet"], str(int(s["zeit"]) + 1))
        m = INTEROP["mfx"]
        self.assertEqual(d.mfx_lesen(m["datei"], m["passwort"]), m["inhalt"])
        with self.assertRaises(ValueError):
            d.mfx_lesen(m["datei"], "falsch-falsch")


class TestPruefung(MitAblage):
    def test_gueltig_falsch_uhrzeit_wiederholung(self):
        g = self.ablage.geraet_anlegen("Handy", jetzt=JETZT)
        koerper = b'{"messungen":[]}'
        kopf = signierter_kopf(g, "POST", "/api/sync", koerper, JETZT)
        self.assertEqual(d.pruefe_anfrage(self.ablage, kopf, "POST", "/api/sync", koerper, JETZT)["id"], g["id"])
        # dieselbe Anfrage noch einmal → Wiederholung (409)
        with self.assertRaises(d.Abgelehnt) as e:
            d.pruefe_anfrage(self.ablage, kopf, "POST", "/api/sync", koerper, JETZT + 1000)
        self.assertEqual((e.exception.status, e.exception.grund), (409, "wiederholt"))
        # verfälschter Körper → Unterschrift passt nicht
        with self.assertRaises(d.Abgelehnt) as e:
            d.pruefe_anfrage(self.ablage, signierter_kopf(g, "POST", "/api/sync", koerper, JETZT + 1), "POST", "/api/sync", b'{"messungen":[1]}', JETZT)
        self.assertEqual(e.exception.grund, "unterschrift_falsch")
        # anderer Pfad → Unterschrift passt nicht
        with self.assertRaises(d.Abgelehnt):
            d.pruefe_anfrage(self.ablage, signierter_kopf(g, "POST", "/api/sync", koerper, JETZT + 2), "POST", "/api/export", koerper, JETZT)

    def test_uhrzeit_grenze_fuenf_minuten(self):
        g = self.ablage.geraet_anlegen("Handy", jetzt=JETZT)
        # genau 5:00 min daneben: noch gültig; 5:00,001 min: abgelehnt
        d.pruefe_anfrage(self.ablage, signierter_kopf(g, "GET", "/x", b"", JETZT - 300000), "GET", "/x", b"", JETZT)
        with self.assertRaises(d.Abgelehnt) as e:
            d.pruefe_anfrage(self.ablage, signierter_kopf(g, "GET", "/x", b"", JETZT + 300001), "GET", "/x", b"", JETZT)
        self.assertEqual(e.exception.grund, "uhrzeit")

    def test_kopplung_laeuft_ab_ausser_nach_erstem_kontakt(self):
        a = self.ablage.geraet_anlegen("A", jetzt=JETZT)
        b = self.ablage.geraet_anlegen("B", jetzt=JETZT)
        spaeter = JETZT + d.KOPPEL_GUELTIG_MS + 1
        d.pruefe_anfrage(self.ablage, signierter_kopf(b, "GET", "/x", b"", JETZT + 1000), "GET", "/x", b"", JETZT + 1000)  # B meldet sich rechtzeitig
        with self.assertRaises(d.Abgelehnt):
            d.pruefe_anfrage(self.ablage, signierter_kopf(a, "GET", "/x", b"", spaeter), "GET", "/x", b"", spaeter)
        self.assertIsNone(self.ablage.geraet(a["id"]), "abgelaufene, nie bestätigte Kopplung wird entfernt")
        d.pruefe_anfrage(self.ablage, signierter_kopf(b, "GET", "/y", b"", spaeter), "GET", "/y", b"", spaeter)

    def test_ohne_kopf_und_unbekannt(self):
        for kopf, grund in ((Kopf(), "unterschrift_fehlt"), (Kopf({"X-MF-Geraet": "gx", "X-MF-Zeit": str(JETZT), "X-MF-Signatur": "00"}), "unbekanntes_geraet"),
                            (Kopf({"X-MF-Geraet": "gx", "X-MF-Zeit": "gestern", "X-MF-Signatur": "00"}), "zeit_unlesbar")):
            with self.assertRaises(d.Abgelehnt) as e:
                d.pruefe_anfrage(self.ablage, kopf, "GET", "/x", b"", JETZT)
            self.assertEqual(e.exception.grund, grund)


class TestAblage(MitAblage):
    def test_doppelte_quelle_id_wird_ersetzt(self):
        x = {"t": 1793340000000, "bpm": 52, "zoneMin": 60, "quelle": {"art": "demo", "id": "m:1"}}
        r1 = self.ablage.messungen_speichern([{"art": "ruhepuls", "daten": x}], "test")
        r2 = self.ablage.messungen_speichern([{"art": "ruhepuls", "daten": x}], "test")
        r3 = self.ablage.messungen_speichern([{"art": "ruhepuls", "daten": {**x, "bpm": 51}}], "test")
        self.assertEqual((r1["neu"], r2["neu"], r2["ersetzt"], r3["ersetzt"]), (1, 0, 1, 1))
        self.assertEqual(self.ablage.anzahl_messungen(), 1)
        # Tag aus t + zoneMin: 1793340000000 = 2026-10-30 05:20 UTC → 06:20 bei +60 min → "2026-10-30"
        self.assertEqual(self.ablage.lies("messung:ruhepuls:2026-10-30"), [{**x, "bpm": 51}])
        # gleiche Kennung in einer anderen Art ist ein anderer Datensatz
        self.ablage.messungen_speichern([{"art": "hrv", "daten": {"t": x["t"], "rmssdMs": 58, "quelle": x["quelle"]}}], "test")
        self.assertEqual(self.ablage.anzahl_messungen(), 2)

    def test_ungueltiges_wird_gezaehlt(self):
        r = self.ablage.messungen_speichern([{"art": "unsinn", "daten": {}}, {"art": "hrv"}, "x", {"art": "tagebuch", "daten": {"eintraege": {}}}], "t")
        self.assertEqual((r["neu"], r["ungueltig"]), (0, 4))

    def test_speicher_schnittstelle(self):
        a = self.ablage
        tag = [{"t": 2, "bpm": 50, "quelle": {"id": "b"}}, {"t": 1, "bpm": 49, "quelle": {"id": "a"}}]
        a.schreib("messung:ruhepuls:2026-10-29", tag)
        self.assertEqual([x["t"] for x in a.lies("messung:ruhepuls:2026-10-29")], [1, 2], "sortiert wie daten/ablage.js")
        a.schreib("messung:ruhepuls:2026-10-29", tag[:1])       # Liste ersetzen: "a" fällt weg
        self.assertEqual([x["quelle"]["id"] for x in a.lies("messung:ruhepuls:2026-10-29")], ["b"])
        a.schreib("einstellungen", {"sprache": "de"})
        a.schreib("tagebuch:2026-10-29", {"tag": "2026-10-29", "eintraege": {"alkohol": False}})
        self.assertEqual(a.liste(""), ["einstellungen", "messung:ruhepuls:2026-10-29", "tagebuch:2026-10-29"])
        self.assertEqual(a.liste("messung:"), ["messung:ruhepuls:2026-10-29"])
        self.assertEqual(set(a.alle("tagebuch:")), {"tagebuch:2026-10-29"})
        a.schreib("einstellungen", None)
        a.schreib("messung:ruhepuls:2026-10-29", None)
        self.assertIsNone(a.lies("einstellungen"))
        self.assertEqual(a.liste(""), ["tagebuch:2026-10-29"])

    def test_messungen_seit(self):
        a = self.ablage
        a.messungen_speichern([{"art": "hrv", "daten": {"t": 1793340000000, "rmssdMs": 58, "quelle": {"id": "h1"}}}], "t", jetzt=1000)
        a.messungen_speichern([{"art": "hrv", "daten": {"t": 1793340000001, "rmssdMs": 60, "quelle": {"id": "h2"}}}], "t", jetzt=2000)
        self.assertEqual([m["daten"]["quelle"]["id"] for m in a.messungen_lesen(seit=1500)], ["h2"])
        self.assertEqual(len(a.messungen_lesen(art="hrv")), 2)
        self.assertEqual(len(a.messungen_lesen(art="schlaf")), 0)


class TestWhoopWieApp(unittest.TestCase):
    """desktop/whoop_csv.py liefert genau, was daten/csv_import.js liefert (daten/fixtures/whoop_erwartet.json)."""

    def test_import_gleich(self):
        dateien = [{"name": "export/" + n, "text": (FIXTURES / n).read_text(encoding="utf-8")} for n in NAMEN]
        r = w.importiere_whoop(dateien)
        r["tage"] = {a: [w.tag_von(a, x) for x in r["paket"][a]] for a in w.ARTEN}
        self.assertEqual(r, ERWARTET["import"])

    def test_von_hand(self):
        r = w.importiere_whoop([{"name": n, "text": (FIXTURES / n).read_text(encoding="utf-8")} for n in NAMEN])
        rp = r["paket"]["ruhepuls"][0]
        # Aufwachen 2026-10-24 06:58 bei UTC+02:00 = 04:58 UTC. Tage 1970-01-01 → 2026-01-01: 56·365 + 14 Schaltjahre = 20 454;
        # Jan–Sep 2026: 273; + 23 → 20 750 Tage · 86 400 000 = 1 792 800 000 000 ms; + 4 h 58 min (17 880 000 ms) = 1 792 817 880 000.
        self.assertEqual((rp["t"], rp["bpm"], rp["zoneMin"]), (1792817880000, 53, 120))
        # Hauttemperatur: Tausendstel 33 380 … 33 950, Median (4. von 7) = 33 500 → erste Zeile 33 420 − 33 500 = −80 → −0,08 °C
        ht = r["paket"]["hauttemp"][0]
        self.assertEqual((ht["basisC"], ht["deltaC"]), (33.5, -0.08))
        # Schlaf: 412 min · 60 000 = 24 720 000 ms
        self.assertEqual(r["paket"]["schlaf"][0]["schlafMs"], 24720000)

    def test_einzelwerte_gleich(self):
        for text, zone, erwartet in ERWARTET["zeiten"]:
            self.assertEqual(w.lese_zeit(text, zone), erwartet, (text, zone))
        for text, erwartet in ERWARTET["zahlen"]:
            self.assertEqual(w.lese_zahl(text), erwartet, text)
        for zone, t, erwartet in ERWARTET["versaetze"]:
            self.assertEqual(w.versatz_fuer(zone, t), erwartet, zone)
        for text, erwartet in ERWARTET["csv"]:
            self.assertEqual(w.parse_csv(text), erwartet, text)

    def test_js_round(self):
        self.assertEqual([w.js_round(x) for x in (2.5, -2.5, 0.49999, 3.5)], [3, -2, 0, 4])  # JS: Math.round, nicht round()


class TestEingang(MitAblage):
    def test_zip_csv_mfx_und_doppeltes(self):
        eingang = self.ordner / "eingang"
        e = d.Eingang(self.ablage, eingang, passwort=lambda: None)
        (eingang / "my_whoop_data.zip").write_bytes(whoop_zip())
        (eingang / "notiz.txt").write_text("nicht einlesen")
        (eingang / ".versteckt.csv").write_text("x")
        self.assertEqual(e.pruefen(warten_auf_ruhe=True), [], "erster Blick: Größe merken, noch nicht einlesen (Cloud schreibt evtl. noch)")
        m = e.pruefen(warten_auf_ruhe=True)
        self.assertEqual([(x["datei"], x["ok"], x["neu"]) for x in m], [("my_whoop_data.zip", True, 55)])
        # 55 = 6 HRV + 7 Ruhepuls + 7 Atem + 6 SpO2 + 7 Haut + 7 Schlaf + 5 Training + 3 Tagebuch + 7 WHOOP-Werte
        self.assertEqual(e.pruefen(), [], "bekannte Datei (gleicher Inhalt) nicht noch einmal")
        shutil.copy(FIXTURES / "whoop_sleeps.csv", eingang / "sleeps.csv")
        m = e.pruefen()
        self.assertEqual((m[0]["neu"], m[0]["ersetzt"]), (0, 14), "Schlaf + Atem schon aus dem ZIP bekannt (gleiche quelle.id)")

    @unittest.skipUnless(d.krypto_verfuegbar(), "cryptography fehlt")
    def test_mfx_braucht_passwort(self):
        eingang = self.ordner / "eingang"
        pw = {"wert": None}
        e = d.Eingang(self.ablage, eingang, passwort=lambda: pw["wert"])
        export = {"format": "maehr-fit-export", "version": 1, "erstelltMs": JETZT, "eintraege": {
            "messung:hrv:2026-10-30": [{"t": 1793340000000, "rmssdMs": 58, "quelle": {"art": "demo", "id": "muster:hrv:1"}}],
            "tagebuch:2026-10-30": {"tag": "2026-10-30", "eintraege": {"alkohol": False}, "quelle": {"art": "hand", "id": "tagebuch-2026-10-30"}}}}
        (eingang / "handy.mfx").write_text(d.mfx_erstellen(export, "Muster-Passwort-2026", 1000))
        m = e.pruefen()
        self.assertFalse(m[0]["ok"])
        pw["wert"] = "Muster-Passwort-2026"
        m = e.pruefen()   # nicht gemerkt, darum jetzt erneut versucht
        self.assertEqual((m[0]["ok"], m[0]["neu"]), (True, 1))
        self.assertEqual(self.ablage.lies("tagebuch:2026-10-30")["eintraege"], {"alkohol": False})

    def test_json_sicherung_der_shell(self):
        sicherung = {"app": "MAEHR FIT", "erstellt": "2026-10-30T08:00:00Z", "daten": {
            "messung:ruhepuls:2026-10-30": [{"t": 1793340000000, "bpm": 52, "quelle": {"id": "r1"}}], "einstellungen": {"sprache": "de"}}}
        p = self.ordner / "sicherung.json"
        p.write_text(json.dumps(sicherung))
        self.assertEqual(d.importiere_datei(self.ablage, p)["neu"], 1)
        self.assertIsNone(self.ablage.lies("einstellungen"), "Einstellungen des Handys überschreiben den Rechner nicht")


# ------------------------------------------------------------------------------------------------
class LiveServer(MitAblage):
    """Echter Server auf freien Ports: Rechner-Seite (127.0.0.1) und „Heimnetz“-Seite (hier ebenfalls 127.0.0.1)."""

    def setUp(self):
        super().setUp()
        html = self.ordner / "MF.html"
        html.write_text("<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" "
                        "content=\"default-src 'none'; connect-src 'none'\"><title>MAEHR FIT</title></head><body></body></html>", encoding="utf-8")
        self.eingang = d.Eingang(self.ablage, self.ordner / "eingang")
        self.dienst = d.Dienst(self.ablage, html, 0, "127.0.0.1", self.eingang)
        lokal = d.starte_server(self.dienst, "127.0.0.1", 0, lokal=True)
        self.port = self.dienst.port = lokal.server_address[1]
        self.lan_port = d.starte_server(self.dienst, "127.0.0.1", 0, lokal=False).server_address[1]

    def tearDown(self):
        for s in self.dienst.server:
            s.shutdown()
            s.server_close()
        super().tearDown()

    def rufe(self, methode, pfad, koerper=b"", kopf=None, lan=False, host=None):
        c = http.client.HTTPConnection("127.0.0.1", self.lan_port if lan else self.port, timeout=10)
        k = {"Host": host or f"127.0.0.1:{self.lan_port if lan else self.port}", **(kopf or {})}
        c.request(methode, pfad, body=koerper or None, headers=k)
        r = c.getresponse()
        inhalt = r.read()
        c.close()
        return r.status, dict(r.getheaders()), inhalt

    def test_status_und_html(self):
        s, _, b = self.rufe("GET", "/api/status")
        st = json.loads(b)
        self.assertEqual((s, st["app"], st["lokal"], st["protokoll"]), (200, "maehr-fit-dienst", True, 1))
        s, _, b = self.rufe("GET", "/api/status", lan=True)
        self.assertNotIn("lokal", json.loads(b), "Heimnetz bekommt nur das Nötigste")
        s, _, b = self.rufe("GET", "/")
        self.assertIn(f'<meta name="mf-dienst" content="{self.dienst.token}">', b.decode())
        self.assertIn("connect-src 'self'", b.decode())
        s, _, b = self.rufe("GET", "/", lan=True)
        self.assertNotIn("mf-dienst", b.decode(), "kein Sitzungsschlüssel ins Heimnetz")

    def test_schutz_rechner_seite(self):
        self.assertEqual(self.rufe("GET", "/api/speicher/liste")[0], 403)
        self.assertEqual(self.rufe("GET", "/api/status", host="boese.example:80")[0], 421, "DNS-Rebinding: fremder Host")
        self.assertEqual(self.rufe("GET", "/api/speicher/liste", lan=True, kopf={"X-MF-Lokal": self.dienst.token})[0], 403, "Sitzungsschlüssel gilt nur am Rechner")
        tok = {"X-MF-Lokal": self.dienst.token}
        self.assertEqual(self.rufe("PUT", "/api/speicher/wert?k=einstellungen", b'{"sprache":"en"}', tok)[0], 200)
        s, _, b = self.rufe("GET", "/api/speicher/wert?k=einstellungen", kopf=tok)
        self.assertEqual(json.loads(b), {"da": True, "wert": {"sprache": "en"}})
        self.assertEqual(json.loads(self.rufe("GET", "/api/speicher/wert?k=fehlt", kopf=tok)[2]), {"da": False, "wert": None})

    def test_cors_vorab(self):
        s, k, _ = self.rufe("OPTIONS", "/api/sync", lan=True, kopf={"Origin": "https://localhost", "Access-Control-Request-Method": "POST",
                                                                   "Access-Control-Request-Private-Network": "true"})
        self.assertEqual((s, k.get("Access-Control-Allow-Origin"), k.get("Access-Control-Allow-Private-Network")), (204, "https://localhost", "true"))
        self.assertEqual(self.rufe("OPTIONS", "/api/sync", lan=True, kopf={"Origin": "https://boese.example"})[0], 403)

    def test_sync_messungen_export(self):
        g = self.ablage.geraet_anlegen("Handy")
        koerper = json.dumps({"messungen": [{"art": "ruhepuls", "tag": "2026-10-30", "daten": {"t": 1793340000000, "bpm": 52, "quelle": {"id": "r1"}}}]}).encode()
        kopf = signierter_kopf(g, "POST", "/api/sync", koerper, d.jetzt_ms())
        s, _, b = self.rufe("POST", "/api/sync", koerper, kopf, lan=True)
        self.assertEqual((s, json.loads(b)["neu"]), (200, 1))
        self.assertEqual(self.rufe("POST", "/api/sync", koerper, kopf, lan=True)[0], 409, "Wiederholung")
        self.assertEqual(self.rufe("POST", "/api/sync", koerper, {**kopf, "X-MF-Signatur": "0" * 64}, lan=True)[0], 401)
        pfad = "/api/messungen?art=ruhepuls"
        s, _, b = self.rufe("GET", pfad, kopf=signierter_kopf(g, "GET", pfad, b"", d.jetzt_ms()), lan=True)
        self.assertEqual([m["daten"]["bpm"] for m in json.loads(b)["messungen"]], [52])
        self.assertEqual(self.rufe("GET", "/api/messungen", lan=True)[0], 401, "ohne Unterschrift keine Messwerte")
        s, k, b = self.rufe("GET", f"/api/export?token={self.dienst.token}")
        self.assertEqual((s, k["Content-Type"]), (200, "application/zip"))
        with zipfile.ZipFile(io.BytesIO(b)) as z:
            inhalt = json.loads(z.read("maehr-fit-export.json"))
        self.assertEqual(list(inhalt["eintraege"]), ["messung:ruhepuls:2026-10-30"])
        s, _, b = self.rufe("GET", "/api/geraete", kopf={"X-MF-Lokal": self.dienst.token})
        self.assertEqual(json.loads(b)["geraete"][0]["sync_neu"], 1)

    def test_koppeln_ueber_rechner_ansicht(self):
        s, _, b = self.rufe("POST", "/api/koppeln", b'{"name":"Testhandy"}', {"X-MF-Lokal": self.dienst.token})
        r = json.loads(b)
        self.assertEqual(s, 200)
        self.assertTrue(r["text"].startswith(d.KOPPEL_PRAEFIX))
        try:
            import qrcode  # noqa: F401
            self.assertIn("<svg", r["svg"])
        except ImportError:
            self.assertIsNone(r["svg"])

    def test_handy_teil_ohne_verschluesselung(self):
        """Fehlt am Rechner „cryptography“, schickt das Handy nur unterschrieben (Status meldet keine Verschlüsselung)."""
        alt = d.AESGCM
        d.AESGCM = None
        try:
            self.test_handy_teil_unter_node(erwarte_verschluesselt=False)
        finally:
            d.AESGCM = alt

    def test_handy_teil_unter_node(self, erwarte_verschluesselt=None):
        """Ende zu Ende: daten/sync.js (Node, echtes fetch) koppelt, schickt 1 200 Messwerte in 3 Stapeln, entkoppelt."""
        node = shutil.which("node")
        if not node:
            self.skipTest("node fehlt")
        g = self.ablage.geraet_anlegen("Node")
        text = d.kopplung_text("127.0.0.1", self.lan_port, g)
        r = subprocess.run([node, str(WURZEL / "tests" / "python" / "hilfe_sync_e2e.mjs"), text], capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr)
        aus = json.loads(r.stdout)
        self.assertEqual((aus["erster"]["gesendet"], aus["erster"]["stapel"], aus["erster"]["neu"]), (1200, 3, 1200))
        self.assertEqual(aus["erster"]["verschluesselt"], d.krypto_verfuegbar() if erwarte_verschluesselt is None else erwarte_verschluesselt)
        self.assertEqual((aus["zweiter"]["gesendet"], aus["dritter"]["gesendet"], aus["dritter"]["neu"]), (0, 400, 0), "nur geänderte Tage")
        self.assertEqual(self.ablage.anzahl_messungen(), 1200)
        self.assertTrue(aus["entkoppelt"]["rechnerBestaetigt"])
        self.assertIsNone(self.ablage.geraet(g["id"]))


class TestAutostart(unittest.TestCase):
    def setUp(self):
        self.home = pathlib.Path(tempfile.mkdtemp(prefix="mf-home-"))

    def tearDown(self):
        shutil.rmtree(self.home, ignore_errors=True)

    def test_alle_drei_systeme(self):
        for system, rel in (("Darwin", "Library/LaunchAgents/de.maehrsteuern.maehrfit.plist"), ("Linux", ".config/systemd/user/maehr-fit.service"),
                            ("Windows", "AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup/maehr-fit.cmd")):
            m = d.autostart("einrichten", system=system, home=self.home, python="/usr/bin/python3", skript="/pfad mit leer/mf_dienst.py", ausfuehren=False)
            ziel = self.home / rel
            self.assertTrue(ziel.exists(), (system, m))
            text = ziel.read_text(encoding="utf-8")
            self.assertIn("--kein-browser", text)
            if system == "Darwin":
                p = plistlib.loads(ziel.read_bytes())
                self.assertEqual((p["Label"], p["ProgramArguments"][1], p["RunAtLoad"]), ("de.maehrsteuern.maehrfit", "/pfad mit leer/mf_dienst.py", True))
            if system == "Linux":
                self.assertIn('ExecStart="/usr/bin/python3" "/pfad mit leer/mf_dienst.py"', text)
            d.autostart("entfernen", system=system, home=self.home, ausfuehren=False)
            self.assertFalse(ziel.exists(), system)

    def test_windows_aufgabenplanung(self):
        m = d.autostart("einrichten", system="Windows", home=self.home, art="schtasks", ausfuehren=False)
        self.assertTrue(any("schtasks /Create" in x and "ONLOGON" in x for x in m), m)


class TestBefehle(unittest.TestCase):
    def test_koppeln_status_import_export(self):
        ordner = pathlib.Path(tempfile.mkdtemp(prefix="mf-cli-"))
        try:
            def rufe(*args):
                return subprocess.run([sys.executable, str(WURZEL / "desktop" / "mf_dienst.py"), "--daten-ordner", str(ordner), "--lan-adresse", "192.168.178.20", *args],
                                      capture_output=True, text=True, timeout=60)
            r = rufe("koppeln", "--name", "Testhandy")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn(d.KOPPEL_PRAEFIX, r.stdout)
            self.assertIn("Fingerabdruck", r.stdout)
            zip_pfad = ordner / "export.zip"
            zip_pfad.write_bytes(whoop_zip())
            r = rufe("importieren", str(zip_pfad))
            self.assertIn("55 neu", r.stdout)
            r = rufe("exportieren", str(ordner / "sicherung.zip"))
            self.assertIn("55 Messwerte", r.stdout)
            self.assertIn("Testhandy", rufe("geraete").stdout)
        finally:
            shutil.rmtree(ordner, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
