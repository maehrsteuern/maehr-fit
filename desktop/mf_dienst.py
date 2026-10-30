#!/usr/bin/env python3
"""desktop/mf_dienst.py – MAEHR FIT auf dem Rechner: ein kleines Programm, das die App zeigt und Messwerte sammelt.

Kernaussage: Das Programm läuft still auf deinem Rechner. Es zeigt dieselbe App (MF.html) im Browser, speichert alle Messwerte in
einer Datei in deinem Benutzerordner (~/.maehrfit/mf.sqlite) und nimmt neue Werte auf drei Wegen an: vom gekoppelten Handy im
Heimnetz, aus verschlüsselten Export-Dateien in einem geteilten Cloud-Ordner und aus WHOOP-Exporten (ZIP/CSV), die du in den
Eingangsordner legst. Nichts geht ins Internet; das Handy muss sich mit einem geheimen Schlüssel ausweisen (docs/technik/sync.md).

Aufruf (docs/technik/desktop.md):
  python3 desktop/mf_dienst.py                    starten, Browser öffnen
  python3 desktop/mf_dienst.py --kein-browser     starten ohne Browser (Autostart)
  python3 desktop/mf_dienst.py koppeln            Handy koppeln: QR-Code (oder Text) für 10 Minuten
  python3 desktop/mf_dienst.py geraete            gekoppelte Geräte zeigen
  python3 desktop/mf_dienst.py entkoppeln ID      ein Gerät entfernen
  python3 desktop/mf_dienst.py importieren DATEI  WHOOP-ZIP/CSV, .mfx oder .json sofort einlesen
  python3 desktop/mf_dienst.py exportieren Z.zip  Sicherung aller Messwerte als ZIP mit JSON
  python3 desktop/mf_dienst.py passwort           Passwort für .mfx-Dateien aus dem Cloud-Ordner hinterlegen
  python3 desktop/mf_dienst.py status             kurzer Zustand
  python3 desktop/mf_dienst.py --autostart einrichten|entfernen

Nur Standardbibliothek. Freiwillig (wird erkannt, sonst klare Meldung): `cryptography` (AES-GCM: verschlüsselte Übertragung und
.mfx-Dateien), `pystray` + `Pillow` (Symbol in der Taskleiste), `qrcode` (QR-Code im Terminal und in der Sync-Ansicht).
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import hmac
import io
import ipaddress
import json
import logging
import logging.handlers
import os
import pathlib
import platform
import secrets
import shutil
import socket
import sqlite3
import subprocess
import sys
import threading
import time
import webbrowser
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import whoop_csv  # noqa: E402

try:  # freiwillig: AES-GCM
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except Exception:  # pragma: no cover - je nach Rechner
    AESGCM = None

VERSION = "0.1.0"
PROTOKOLL = 1
APP_KENNUNG = "maehr-fit-dienst"
STANDARD_PORT = 8765
KOPPEL_GUELTIG_MS = 10 * 60 * 1000          # Kopplungscode gilt 10 Minuten (Entscheidung Loris)
MAX_ABWEICHUNG_MS = 5 * 60 * 1000           # Uhren von Handy und Rechner dürfen 5 Minuten auseinander liegen
MAX_STAPEL = 500                            # höchstens 500 Messwerte je Sendung
MAX_KOERPER = 32 * 1024 * 1024              # 32 MB je Anfrage
PBKDF2_ITERATIONEN = 600_000                # OWASP Password Storage Cheat Sheet (2023): PBKDF2-HMAC-SHA256 ≥ 600 000
PBKDF2_ITERATIONEN_MIN = 1_000              # Lesen: kleiner nur in Tests; größer als MAX wird abgelehnt (Schutz vor Dauerlast)
PBKDF2_ITERATIONEN_MAX = 10_000_000
EINGANG_TAKT_S = 30
KOPPEL_PRAEFIX = "MF-KOPPLUNG:"
MFX_FORMAT = "maehr-fit-mfx"
EXPORT_FORMAT = "maehr-fit-export"
INFO_VERSCHLUESSELUNG = b"mf-verschluesselung"
AAD_MFX = b"maehr-fit-mfx:1"
# Herkunft der Android-App (Capacitor) und des Browsers am Rechner; nur sie dürfen das Netz-API aus einer Seite heraus rufen.
ERLAUBTE_HERKUNFT = {"https://localhost", "http://localhost", "capacitor://localhost"}
ARTEN = whoop_csv.ARTEN

log = logging.getLogger("mf_dienst")


# ================================================================================================
# Hilfen: Base64url, Zeit, Ordner
# ================================================================================================

def b64url(daten: bytes) -> str:
    return base64.urlsafe_b64encode(daten).rstrip(b"=").decode("ascii")


def aus_b64url(text: str) -> bytes:
    text = str(text).strip()
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def jetzt_ms() -> int:
    return int(time.time() * 1000)


def daten_ordner(wunsch: str | None = None) -> pathlib.Path:
    """~/.maehrfit (oder --daten-ordner bzw. Umgebungsvariable MF_DATEN)."""
    pfad = pathlib.Path(wunsch or os.environ.get("MF_DATEN") or (pathlib.Path.home() / ".maehrfit")).expanduser()
    pfad.mkdir(parents=True, exist_ok=True)
    return pfad


def nur_fuer_mich(pfad: pathlib.Path) -> None:
    """Datei nur für den eigenen Benutzer lesbar (unter Windows wirkt das nicht; dort schützt das Benutzerprofil)."""
    try:
        os.chmod(pfad, 0o600)
    except OSError:
        pass


def lan_adresse() -> str | None:
    """Eigene Adresse im Heimnetz. Ein UDP-„connect“ schickt kein Paket; es fragt nur das Betriebssystem nach der Route."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.254.254.254", 1))
            adresse = s.getsockname()[0]
        return None if adresse.startswith("127.") else adresse
    except OSError:
        return None


# ================================================================================================
# Unterschrift und Verschlüsselung (docs/technik/sync.md)
# ================================================================================================

def kanonisch(methode: str, pfad: str, zeit: str | int, koerper: bytes) -> bytes:
    """Was unterschrieben wird: METHODE \\n Pfad (mit ?Abfrage) \\n Zeit (Unix-ms) \\n SHA-256(Körper) hex."""
    return f"{methode.upper()}\n{pfad}\n{zeit}\n{hashlib.sha256(koerper).hexdigest()}".encode("utf-8")


def signatur(schluessel: bytes, methode: str, pfad: str, zeit: str | int, koerper: bytes) -> str:
    """X-MF-Signatur = HMAC-SHA256(Schlüssel, kanonisch(...)) als Kleinbuchstaben-Hex."""
    return hmac.new(schluessel, kanonisch(methode, pfad, zeit, koerper), hashlib.sha256).hexdigest()


def aes_schluessel(schluessel: bytes) -> bytes:
    """Eigener Schlüssel für die Verschlüsselung, abgeleitet vom Kopplungsschlüssel (nie derselbe Schlüssel für zwei Zwecke)."""
    return hmac.new(schluessel, INFO_VERSCHLUESSELUNG, hashlib.sha256).digest()


def aad_sync(geraet: str, zeit: str | int) -> bytes:
    return f"{geraet}\n{zeit}".encode("utf-8")


def krypto_verfuegbar() -> bool:
    return AESGCM is not None


def _brauche_krypto(zweck: str) -> None:
    if AESGCM is None:
        raise Abgelehnt(415, "verschluesselung_fehlt",
                        f"{zweck} braucht die Erweiterung „cryptography“ (pip install cryptography).")


def koerper_entschluesseln(schluessel: bytes, obj: dict, geraet: str, zeit: str | int) -> bytes:
    _brauche_krypto("Verschlüsselte Übertragung")
    try:
        return AESGCM(aes_schluessel(schluessel)).decrypt(aus_b64url(obj["iv"]), aus_b64url(obj["daten"]), aad_sync(geraet, zeit))
    except Exception as e:
        raise Abgelehnt(400, "entschluesseln", "Inhalt ließ sich nicht entschlüsseln.") from e


def koerper_verschluesseln(schluessel: bytes, klartext: bytes, geraet: str, zeit: str | int, iv: bytes | None = None) -> dict:
    _brauche_krypto("Verschlüsselte Übertragung")
    iv = iv or secrets.token_bytes(12)
    return {"iv": b64url(iv), "daten": b64url(AESGCM(aes_schluessel(schluessel)).encrypt(iv, klartext, aad_sync(geraet, zeit)))}


def mfx_erstellen(inhalt: dict, passwort: str, iterationen: int = PBKDF2_ITERATIONEN, salz: bytes | None = None, iv: bytes | None = None) -> str:
    """Verschlüsselte Export-Datei (.mfx): PBKDF2-HMAC-SHA256 → AES-256-GCM über das JSON."""
    _brauche_krypto(".mfx-Dateien")
    salz, iv = salz or secrets.token_bytes(16), iv or secrets.token_bytes(12)
    schluessel = hashlib.pbkdf2_hmac("sha256", passwort.encode("utf-8"), salz, iterationen, 32)
    klartext = json.dumps(inhalt, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return json.dumps({
        "format": MFX_FORMAT, "version": 1,
        "kdf": {"name": "PBKDF2", "hash": "SHA-256", "iterationen": iterationen, "salz": b64url(salz)},
        "chiffre": {"name": "AES-GCM", "iv": b64url(iv)},
        "daten": b64url(AESGCM(schluessel).encrypt(iv, klartext, AAD_MFX)),
    }, ensure_ascii=False)


def mfx_lesen(text: str, passwort: str) -> dict:
    _brauche_krypto(".mfx-Dateien")
    obj = json.loads(text)
    if obj.get("format") != MFX_FORMAT or obj.get("version") != 1:
        raise ValueError("Keine MAEHR-FIT-Exportdatei (.mfx).")
    kdf = obj["kdf"]
    n = int(kdf["iterationen"])
    if not (PBKDF2_ITERATIONEN_MIN <= n <= PBKDF2_ITERATIONEN_MAX) or kdf.get("hash") != "SHA-256":
        raise ValueError("Unbekannte Schlüsselableitung in der .mfx-Datei.")
    schluessel = hashlib.pbkdf2_hmac("sha256", passwort.encode("utf-8"), aus_b64url(kdf["salz"]), n, 32)
    try:
        klartext = AESGCM(schluessel).decrypt(aus_b64url(obj["chiffre"]["iv"]), aus_b64url(obj["daten"]), AAD_MFX)
    except Exception as e:
        raise ValueError("Passwort falsch oder Datei beschädigt.") from e
    return json.loads(klartext.decode("utf-8"))


class Abgelehnt(Exception):
    """Anfrage abgelehnt: HTTP-Status, Kurzgrund (maschinenlesbar) und ein Satz für Menschen."""

    def __init__(self, status: int, grund: str, text: str = ""):
        super().__init__(text or grund)
        self.status, self.grund, self.text = status, grund, text or grund


# ================================================================================================
# Ablage in SQLite
# ================================================================================================

SCHEMA = """
CREATE TABLE IF NOT EXISTS messungen (
  id INTEGER PRIMARY KEY,
  art TEXT NOT NULL,
  tag TEXT NOT NULL,
  quelle_id TEXT NOT NULL,
  json TEXT NOT NULL,
  sortier INTEGER NOT NULL DEFAULT 0,
  geaendert INTEGER NOT NULL,
  herkunft TEXT,
  UNIQUE (art, quelle_id)
);
CREATE INDEX IF NOT EXISTS messungen_tag ON messungen (art, tag);
CREATE INDEX IF NOT EXISTS messungen_geaendert ON messungen (geaendert);
CREATE TABLE IF NOT EXISTS geraete (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schluessel TEXT NOT NULL,
  schluessel_hash TEXT NOT NULL,
  erstellt INTEGER NOT NULL,
  ablauf INTEGER NOT NULL,
  gekoppelt_am INTEGER,
  zuletzt INTEGER
);
CREATE TABLE IF NOT EXISTS nonces (
  geraet TEXT NOT NULL,
  signatur TEXT NOT NULL,
  zeit INTEGER NOT NULL,
  PRIMARY KEY (geraet, signatur)
);
CREATE TABLE IF NOT EXISTS sync_stand (
  geraet TEXT PRIMARY KEY,
  zuletzt INTEGER NOT NULL,
  neu INTEGER NOT NULL,
  ersetzt INTEGER NOT NULL,
  gesamt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS werte (
  schluessel TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  geaendert INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS eingang (
  datei TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  zeit INTEGER NOT NULL,
  ergebnis TEXT NOT NULL,
  PRIMARY KEY (datei, sha256)
);
"""


def _sortierwert(art: str, d: dict) -> int:
    """Wie daten/ablage.js: Schlaf nach Einschlafen, sonst nach Bezugszeit."""
    if art == "schlaf":
        w = d.get("von")
    else:
        w = whoop_csv.bezugszeit(art, d)
    return int(w) if isinstance(w, (int, float)) and not isinstance(w, bool) else 0


def _quelle_id(d: dict) -> str:
    q = d.get("quelle") if isinstance(d, dict) else None
    if isinstance(q, dict) and q.get("id") not in (None, ""):
        return str(q["id"])
    return "ohne-id:" + hashlib.sha256(json.dumps(d, sort_keys=True).encode("utf-8")).hexdigest()[:32]


def _json(wert) -> str:
    return json.dumps(wert, ensure_ascii=False, separators=(",", ":"))


def _messschluessel(schluessel: str):
    """"messung:<art>:<tag>" → (art, tag) oder None."""
    teile = schluessel.split(":")
    if len(teile) == 3 and teile[0] == "messung" and teile[1] and teile[2]:
        return teile[1], teile[2]
    return None


class Ablage:
    """Alle Messwerte und Geräte in einer SQLite-Datei. Ein Schloss für alle Fäden des Dienstes."""

    def __init__(self, pfad: pathlib.Path | str):
        self.pfad = pathlib.Path(pfad)
        neu = not self.pfad.exists()
        self.db = sqlite3.connect(str(self.pfad), check_same_thread=False, timeout=10)
        self.db.row_factory = sqlite3.Row
        self.schloss = threading.RLock()
        with self.schloss:
            self.db.execute("PRAGMA journal_mode=WAL")
            self.db.executescript(SCHEMA)
            self.db.commit()
        if neu:
            nur_fuer_mich(self.pfad)

    def schliessen(self) -> None:
        with self.schloss:
            self.db.close()

    # ---------- Messwerte
    def messungen_speichern(self, liste: list, herkunft: str, jetzt: int | None = None) -> dict:
        """[{art, tag?, daten}] ablegen. Gleiche (art, quelle.id) ersetzt den alten Datensatz (wie daten/ablage.js)."""
        jetzt = jetzt or jetzt_ms()
        neu = ersetzt = ungueltig = 0
        with self.schloss:
            for e in liste:
                art, daten = (e.get("art"), e.get("daten")) if isinstance(e, dict) else (None, None)
                if art not in ARTEN or not isinstance(daten, dict):
                    ungueltig += 1
                    continue
                tag = e.get("tag") or whoop_csv.tag_von(art, daten)
                if not isinstance(tag, str) or len(tag) != 10:
                    ungueltig += 1
                    continue
                qid = _quelle_id(daten)
                text = _json(daten)
                alt = self.db.execute("SELECT json, tag FROM messungen WHERE art=? AND quelle_id=?", (art, qid)).fetchone()
                if alt is None:
                    neu += 1
                elif alt["json"] != text or alt["tag"] != tag:
                    ersetzt += 1
                else:
                    ersetzt += 1
                    continue  # unverändert: Änderungszeit nicht verschieben
                self.db.execute(
                    "INSERT INTO messungen (art, tag, quelle_id, json, sortier, geaendert, herkunft) VALUES (?,?,?,?,?,?,?) "
                    "ON CONFLICT (art, quelle_id) DO UPDATE SET tag=excluded.tag, json=excluded.json, sortier=excluded.sortier, "
                    "geaendert=excluded.geaendert, herkunft=excluded.herkunft",
                    (art, tag, qid, text, _sortierwert(art, daten), jetzt, herkunft))
            self.db.commit()
        return {"neu": neu, "ersetzt": ersetzt, "ungueltig": ungueltig}

    def messungen_lesen(self, seit: int | None = None, art: str | None = None, von: str | None = None, bis: str | None = None, grenze: int = 50_000) -> list:
        bedingungen, werte = [], []
        if seit is not None:
            bedingungen.append("geaendert >= ?"); werte.append(seit)
        if art:
            bedingungen.append("art = ?"); werte.append(art)
        if von:
            bedingungen.append("tag >= ?"); werte.append(von)
        if bis:
            bedingungen.append("tag <= ?"); werte.append(bis)
        sql = "SELECT art, tag, json, geaendert FROM messungen" + (" WHERE " + " AND ".join(bedingungen) if bedingungen else "")
        sql += " ORDER BY geaendert, id LIMIT ?"
        with self.schloss:
            zeilen = self.db.execute(sql, (*werte, grenze)).fetchall()
        return [{"art": z["art"], "tag": z["tag"], "geaendert": z["geaendert"], "daten": json.loads(z["json"])} for z in zeilen]

    def anzahl_messungen(self) -> int:
        with self.schloss:
            return self.db.execute("SELECT COUNT(*) FROM messungen").fetchone()[0]

    # ---------- Speicher-Schnittstelle (kern/speicher.js) für die Browser-Ansicht am Rechner
    def liste(self, praefix: str = "") -> list:
        with self.schloss:
            mess = [f"messung:{z[0]}:{z[1]}" for z in self.db.execute("SELECT DISTINCT art, tag FROM messungen")]
            andere = [z[0] for z in self.db.execute("SELECT schluessel FROM werte")]
        return sorted(k for k in set(mess) | set(andere) if k.startswith(praefix))

    def lies(self, schluessel: str):
        ms = _messschluessel(schluessel)
        with self.schloss:
            if ms:
                zeilen = self.db.execute("SELECT json FROM messungen WHERE art=? AND tag=? ORDER BY sortier, id", ms).fetchall()
                return [json.loads(z[0]) for z in zeilen] if zeilen else None
            z = self.db.execute("SELECT json FROM werte WHERE schluessel=?", (schluessel,)).fetchone()
            return json.loads(z[0]) if z else None

    def schreib(self, schluessel: str, wert, herkunft: str = "rechner") -> None:
        """Wie speicher.schreib: Wert None löscht. messung:<art>:<tag> ersetzt die Liste dieses Tages."""
        ms = _messschluessel(schluessel)
        jetzt = jetzt_ms()
        with self.schloss:
            if ms:
                art, tag = ms
                liste = wert if isinstance(wert, list) else []
                ids = {_quelle_id(d) for d in liste if isinstance(d, dict)}
                for z in self.db.execute("SELECT quelle_id FROM messungen WHERE art=? AND tag=?", ms).fetchall():
                    if z[0] not in ids:
                        self.db.execute("DELETE FROM messungen WHERE art=? AND quelle_id=?", (art, z[0]))
                self.db.commit()
                if liste:
                    self.messungen_speichern([{"art": art, "tag": tag, "daten": d} for d in liste], herkunft, jetzt)
                return
            if wert is None:
                self.db.execute("DELETE FROM werte WHERE schluessel=?", (schluessel,))
            else:
                self.db.execute("INSERT INTO werte (schluessel, json, geaendert) VALUES (?,?,?) ON CONFLICT (schluessel) DO UPDATE "
                                "SET json=excluded.json, geaendert=excluded.geaendert", (schluessel, _json(wert), jetzt))
            self.db.commit()

    def alle(self, praefix: str = "") -> dict:
        """Alle Schlüssel mit Präfix samt Wert (für schnelles Laden der Browser-Ansicht)."""
        aus: dict = {}
        with self.schloss:
            if "messung:".startswith(praefix) or praefix.startswith("messung:"):
                for z in self.db.execute("SELECT art, tag, json FROM messungen ORDER BY art, tag, sortier, id"):
                    k = f"messung:{z[0]}:{z[1]}"
                    if k.startswith(praefix):
                        aus.setdefault(k, []).append(json.loads(z[2]))
            for z in self.db.execute("SELECT schluessel, json FROM werte"):
                if z[0].startswith(praefix):
                    aus[z[0]] = json.loads(z[1])
        return aus

    def alles_loeschen(self) -> None:
        with self.schloss:
            self.db.execute("DELETE FROM messungen")
            self.db.execute("DELETE FROM werte")
            self.db.commit()

    # ---------- Geräte
    def geraet_anlegen(self, name: str, jetzt: int | None = None) -> dict:
        jetzt = jetzt or jetzt_ms()
        schluessel = secrets.token_bytes(32)
        g = {"id": "g" + secrets.token_hex(6), "name": (name or "Handy")[:60], "schluessel": b64url(schluessel),
             "schluessel_hash": hashlib.sha256(schluessel).hexdigest(), "erstellt": jetzt, "ablauf": jetzt + KOPPEL_GUELTIG_MS}
        with self.schloss:
            self.db.execute("INSERT INTO geraete (id, name, schluessel, schluessel_hash, erstellt, ablauf) VALUES (?,?,?,?,?,?)",
                            (g["id"], g["name"], g["schluessel"], g["schluessel_hash"], g["erstellt"], g["ablauf"]))
            self.db.commit()
        return g

    def geraet(self, geraet_id: str):
        with self.schloss:
            z = self.db.execute("SELECT * FROM geraete WHERE id=?", (geraet_id,)).fetchone()
        return dict(z) if z else None

    def geraete(self) -> list:
        with self.schloss:
            zeilen = self.db.execute(
                "SELECT g.id, g.name, g.schluessel_hash, g.erstellt, g.ablauf, g.gekoppelt_am, g.zuletzt, s.zuletzt AS sync_zuletzt, "
                "s.neu AS sync_neu, s.ersetzt AS sync_ersetzt, s.gesamt AS sync_gesamt FROM geraete g LEFT JOIN sync_stand s ON s.geraet = g.id "
                "ORDER BY g.erstellt").fetchall()
        aus = []
        for z in zeilen:
            d = dict(z)
            d["fingerabdruck"] = d.pop("schluessel_hash")[:8]   # zum Vergleichen mit der Anzeige am Handy
            aus.append(d)
        return aus

    def geraet_entfernen(self, geraet_id: str) -> bool:
        with self.schloss:
            n = self.db.execute("DELETE FROM geraete WHERE id=?", (geraet_id,)).rowcount
            self.db.execute("DELETE FROM nonces WHERE geraet=?", (geraet_id,))
            self.db.execute("DELETE FROM sync_stand WHERE geraet=?", (geraet_id,))
            self.db.commit()
        return n > 0

    def abgelaufene_entfernen(self, jetzt: int) -> None:
        with self.schloss:
            self.db.execute("DELETE FROM geraete WHERE gekoppelt_am IS NULL AND ablauf < ?", (jetzt,))
            self.db.execute("DELETE FROM nonces WHERE zeit < ?", (jetzt - 2 * MAX_ABWEICHUNG_MS,))
            self.db.commit()

    def nonce_merken(self, geraet: str, sig: str, zeit: int) -> bool:
        """True, wenn diese Unterschrift neu ist; False bei Wiederholung (Replay)."""
        with self.schloss:
            try:
                self.db.execute("INSERT INTO nonces (geraet, signatur, zeit) VALUES (?,?,?)", (geraet, sig, zeit))
                self.db.commit()
                return True
            except sqlite3.IntegrityError:
                return False

    def kontakt(self, geraet: str, jetzt: int) -> None:
        with self.schloss:
            self.db.execute("UPDATE geraete SET zuletzt=?, gekoppelt_am=COALESCE(gekoppelt_am, ?) WHERE id=?", (jetzt, jetzt, geraet))
            self.db.commit()

    def sync_merken(self, geraet: str, jetzt: int, neu: int, ersetzt: int) -> None:
        with self.schloss:
            self.db.execute("INSERT INTO sync_stand (geraet, zuletzt, neu, ersetzt, gesamt) VALUES (?,?,?,?,?) ON CONFLICT (geraet) DO UPDATE "
                            "SET zuletzt=excluded.zuletzt, neu=excluded.neu, ersetzt=excluded.ersetzt, gesamt=sync_stand.gesamt + excluded.neu",
                            (geraet, jetzt, neu, ersetzt, neu))
            self.db.commit()

    # ---------- Eingangsordner
    def eingang_bekannt(self, datei: str, sha: str) -> bool:
        with self.schloss:
            return self.db.execute("SELECT 1 FROM eingang WHERE datei=? AND sha256=?", (datei, sha)).fetchone() is not None

    def eingang_merken(self, datei: str, sha: str, ergebnis: dict) -> None:
        with self.schloss:
            self.db.execute("INSERT OR REPLACE INTO eingang (datei, sha256, zeit, ergebnis) VALUES (?,?,?,?)", (datei, sha, jetzt_ms(), _json(ergebnis)))
            self.db.commit()

    def eingang_liste(self, n: int = 10) -> list:
        with self.schloss:
            zeilen = self.db.execute("SELECT datei, zeit, ergebnis FROM eingang ORDER BY zeit DESC LIMIT ?", (n,)).fetchall()
        return [{"datei": z[0], "zeit": z[1], **json.loads(z[2])} for z in zeilen]

    # ---------- Sicherung
    def export_inhalt(self) -> dict:
        """Sicherung im Format von daten/verbinden.js exportieren(): { format, version, erstelltMs, eintraege }."""
        return {"format": EXPORT_FORMAT, "version": 1, "erstelltMs": jetzt_ms(), "eintraege": self.alle("")}


# ================================================================================================
# Prüfen einer unterschriebenen Anfrage
# ================================================================================================

def pruefe_anfrage(ablage: Ablage, kopf, methode: str, pfad: str, koerper: bytes, jetzt: int | None = None) -> dict:
    """Unterschrift, Uhrzeit, Kopplung und Wiederholung prüfen. Gibt das Gerät zurück oder wirft Abgelehnt."""
    jetzt = jetzt or jetzt_ms()
    geraet_id, zeit_text, sig = kopf.get("X-MF-Geraet"), kopf.get("X-MF-Zeit"), kopf.get("X-MF-Signatur")
    if not geraet_id or not zeit_text or not sig:
        raise Abgelehnt(401, "unterschrift_fehlt", "Anfrage ohne Unterschrift.")
    try:
        zeit = int(zeit_text)
    except ValueError:
        raise Abgelehnt(401, "zeit_unlesbar", "Zeitangabe unlesbar.")
    if abs(jetzt - zeit) > MAX_ABWEICHUNG_MS:
        raise Abgelehnt(401, "uhrzeit", "Die Uhren von Handy und Rechner gehen mehr als 5 Minuten auseinander.")
    ablage.abgelaufene_entfernen(jetzt)
    g = ablage.geraet(geraet_id)
    if not g:
        raise Abgelehnt(401, "unbekanntes_geraet", "Dieses Gerät ist nicht (mehr) gekoppelt.")
    if g["gekoppelt_am"] is None and jetzt > g["ablauf"]:
        raise Abgelehnt(401, "kopplung_abgelaufen", "Der Kopplungscode ist abgelaufen.")
    erwartet = signatur(aus_b64url(g["schluessel"]), methode, pfad, zeit_text, koerper)
    if not hmac.compare_digest(erwartet, str(sig).lower()):
        raise Abgelehnt(401, "unterschrift_falsch", "Die Unterschrift passt nicht.")
    if not ablage.nonce_merken(geraet_id, erwartet, zeit):
        raise Abgelehnt(409, "wiederholt", "Diese Anfrage kam schon einmal an.")
    ablage.kontakt(geraet_id, jetzt)
    return g


# ================================================================================================
# Einlesen: Export-Dateien, WHOOP-ZIP/CSV
# ================================================================================================

def eintraege_aus_export(obj: dict) -> list:
    """MF-Sicherung (format maehr-fit-export oder Shell-Sicherung {app, daten}) → [{art, tag, daten}] (nur Messwerte)."""
    if obj.get("format") == EXPORT_FORMAT:
        eintraege = obj.get("eintraege") or {}
    elif obj.get("app") == "MAEHR FIT" and isinstance(obj.get("daten"), dict):
        eintraege = obj["daten"]
    else:
        raise ValueError("Unbekanntes Format (erwartet: Sicherung von MAEHR FIT).")
    aus = []
    for k, liste in eintraege.items():
        ms = _messschluessel(k)
        if ms and isinstance(liste, list):
            aus.extend({"art": ms[0], "tag": ms[1], "daten": d} for d in liste)
    return aus


def tagebuch_aus_export(obj: dict) -> dict:
    eintraege = obj.get("eintraege") if obj.get("format") == EXPORT_FORMAT else obj.get("daten")
    return {k: v for k, v in (eintraege or {}).items() if k.startswith("tagebuch:")}


class SpaeterErneut(ValueError):
    """Datei jetzt nicht lesbar, aber später vielleicht (Passwort oder Erweiterung fehlt) – nicht als erledigt merken."""


def importiere_datei(ablage: Ablage, pfad: pathlib.Path, passwort: str | None = None) -> dict:
    """Eine Datei einlesen. Ergebnis: {art, neu, ersetzt, ungueltig, hinweise} – wirft ValueError mit einem Satz für Menschen."""
    name = pfad.name
    daten = pfad.read_bytes()
    endung = pfad.suffix.lower()
    if endung in (".mfx", ".json"):
        text = daten.decode("utf-8")
        if endung == ".mfx" or '"' + MFX_FORMAT + '"' in text[:200]:
            if AESGCM is None:
                raise SpaeterErneut(".mfx-Dateien brauchen die Erweiterung „cryptography“ (pip install cryptography).")
            if not passwort:
                raise SpaeterErneut("Für .mfx-Dateien fehlt das Passwort (python3 desktop/mf_dienst.py passwort).")
            obj = mfx_lesen(text, passwort)
        else:
            obj = json.loads(text)
        ergebnis = ablage.messungen_speichern(eintraege_aus_export(obj), herkunft=f"datei:{name}")
        for k, v in tagebuch_aus_export(obj).items():
            if ablage.lies(k) is None:   # eigene Einträge am Rechner nicht überschreiben
                ablage.schreib(k, v)
        return {"art": "mfx" if endung == ".mfx" else "json", **ergebnis, "hinweise": 0}
    if endung in (".zip", ".csv"):
        texte = whoop_csv.texte_aus_datei(name, daten)
        r = whoop_csv.importiere_whoop(texte)
        if not any(d["art"] for d in r["dateien"]):
            raise ValueError("Keine WHOOP-Datei erkannt (erwartet: physiological_cycles, sleeps, workouts, journal_entries).")
        liste = [{"art": a, "tag": whoop_csv.tag_von(a, d), "daten": d} for a in ARTEN for d in r["paket"][a]]
        ergebnis = ablage.messungen_speichern(liste, herkunft=f"whoop:{name}")
        return {"art": "whoop", **ergebnis, "hinweise": len(r["hinweise"])}
    raise ValueError(f"Dateiart {endung or '(ohne Endung)'} wird nicht eingelesen.")


class Eingang:
    """Beobachtet den Eingangsordner (Standard ~/.maehrfit/eingang/) im Takt; Dateien werden nicht verschoben (Cloud-Ordner!)."""

    ENDUNGEN = {".mfx", ".json", ".zip", ".csv"}

    def __init__(self, ablage: Ablage, ordner: pathlib.Path, passwort=lambda: None, takt_s: int = EINGANG_TAKT_S):
        self.ablage, self.ordner, self.passwort, self.takt_s = ablage, ordner, passwort, takt_s
        self.ordner.mkdir(parents=True, exist_ok=True)
        self._groessen: dict = {}
        self._gewarnt: set = set()
        self._halt = threading.Event()
        self.zuletzt: int | None = None
        self.letzte_meldungen: list = []

    def pruefen(self, warten_auf_ruhe: bool = False) -> list:
        """Einmal durchsehen. warten_auf_ruhe: Datei erst nehmen, wenn ihre Größe seit dem letzten Durchgang gleich blieb."""
        meldungen = []
        for pfad in sorted(self.ordner.iterdir()):
            if not pfad.is_file() or pfad.name.startswith((".", "~$")) or pfad.suffix.lower() not in self.ENDUNGEN:
                continue
            groesse = pfad.stat().st_size
            if warten_auf_ruhe and self._groessen.get(pfad.name) != groesse:
                self._groessen[pfad.name] = groesse
                continue
            sha = hashlib.sha256(pfad.read_bytes()).hexdigest()
            if self.ablage.eingang_bekannt(pfad.name, sha):
                continue
            merken = True
            try:
                ergebnis = {"ok": True, **importiere_datei(self.ablage, pfad, self.passwort())}
                log.info("Eingang: %s eingelesen – %s neu, %s schon da", pfad.name, ergebnis["neu"], ergebnis["ersetzt"])
            except Exception as e:  # jede Datei für sich; eine kaputte hält die anderen nicht auf
                ergebnis = {"ok": False, "fehler": str(e)}
                merken = not isinstance(e, SpaeterErneut)   # fehlt nur Passwort/Erweiterung: beim nächsten Durchgang erneut
                if (pfad.name, sha) not in self._gewarnt:   # je Datei nur einmal ins Protokoll
                    self._gewarnt.add((pfad.name, sha))
                    log.warning("Eingang: %s nicht eingelesen – %s", pfad.name, e)
            if merken:
                self.ablage.eingang_merken(pfad.name, sha, ergebnis)
            meldungen.append({"datei": pfad.name, **ergebnis})
        self.zuletzt = jetzt_ms()
        if meldungen:
            self.letzte_meldungen = meldungen
        return meldungen

    def laufen(self) -> None:
        while not self._halt.wait(self.takt_s):
            try:
                self.pruefen(warten_auf_ruhe=True)
            except Exception:  # pragma: no cover
                log.exception("Eingang: Durchgang fehlgeschlagen")

    def starten(self) -> threading.Thread:
        self.pruefen(warten_auf_ruhe=False)
        faden = threading.Thread(target=self.laufen, name="eingang", daemon=True)
        faden.start()
        return faden

    def anhalten(self) -> None:
        self._halt.set()


# ================================================================================================
# QR-Code und Kopplungstext
# ================================================================================================

def kopplung_text(host: str, port: int, g: dict) -> str:
    """Inhalt des QR-Codes: MF-KOPPLUNG:<base64url(JSON)> mit host, port, geraet_id, schluessel, ablauf (Unix-ms)."""
    inhalt = {"v": PROTOKOLL, "host": host, "port": port, "geraet_id": g["id"], "schluessel": g["schluessel"],
              "ablauf": g["ablauf"], "name": g["name"]}
    return KOPPEL_PRAEFIX + b64url(_json(inhalt).encode("utf-8"))


def qr_svg(text: str) -> str | None:
    try:
        import qrcode
        import qrcode.image.svg
    except ImportError:
        return None
    bild = qrcode.make(text, image_factory=qrcode.image.svg.SvgPathImage, box_size=8, border=2)
    puffer = io.BytesIO()
    bild.save(puffer)
    return puffer.getvalue().decode("utf-8")


def qr_terminal(text: str) -> bool:
    try:
        import qrcode
    except ImportError:
        return False
    qr = qrcode.QRCode(border=2)
    qr.add_data(text)
    qr.make(fit=True)
    try:
        qr.print_ascii(invert=True)
    except UnicodeEncodeError:
        return False
    return True


# ================================================================================================
# HTTP-Dienst
# ================================================================================================

def html_fuer_rechner(html: str, token: str) -> str:
    """MF.html für den Browser am Rechner: Verbindungen zur eigenen Adresse erlauben und den Sitzungsschlüssel einsetzen."""
    html = html.replace("connect-src 'none'", "connect-src 'self'", 1)
    meta = f'<meta name="mf-dienst" content="{token}">'
    if '<meta charset="utf-8">' in html:
        return html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + meta, 1)
    return html.replace("<head>", "<head>\n" + meta, 1)


class Dienst:
    """Gemeinsamer Zustand der beiden Server (Rechner 127.0.0.1 und Heimnetz)."""

    def __init__(self, ablage: Ablage, html_pfad: pathlib.Path | None, port: int, lan: str | None, eingang: Eingang | None = None,
                 herkunft: set | None = None):
        self.ablage, self.html_pfad, self.port, self.lan, self.eingang = ablage, html_pfad, port, lan, eingang
        self.token = secrets.token_urlsafe(32)
        self.herkunft = set(herkunft or ERLAUBTE_HERKUNFT)
        self.server: list = []
        self.gestartet = jetzt_ms()

    def html(self) -> str:
        if self.html_pfad and self.html_pfad.exists():
            return self.html_pfad.read_text(encoding="utf-8")
        return ("<!doctype html><meta charset='utf-8'><title>MAEHR FIT</title><p>MF.html fehlt. Bitte im Repo "
                "<code>python3 bau.py</code> ausführen oder <code>--html</code> angeben.</p>")


def _ist_privat(adresse: str) -> bool:
    try:
        a = ipaddress.ip_address(adresse.split("%")[0])
    except ValueError:
        return False
    if isinstance(a, ipaddress.IPv6Address) and a.ipv4_mapped:
        a = a.ipv4_mapped
    return a.is_private or a.is_loopback or a.is_link_local


def _abfrage_ms(wert: str | None):
    """seit=… als Unix-ms oder ISO-Zeit (2026-10-30T08:00:00Z)."""
    if not wert:
        return None
    if wert.isdigit():
        return int(wert)
    from datetime import datetime, timezone
    try:
        d = datetime.fromisoformat(wert.replace("Z", "+00:00"))
    except ValueError:
        raise Abgelehnt(400, "seit_unlesbar", "seit= ist weder Unix-ms noch ISO-Zeit.")
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return int(d.timestamp() * 1000)


def baue_handler(dienst: Dienst, lokal: bool):
    """Handler-Klasse für einen der beiden Server. lokal=True: nur 127.0.0.1, mit Sitzungsschlüssel für die Browser-Ansicht."""

    class Handler(BaseHTTPRequestHandler):
        server_version = "MAEHR-FIT/" + VERSION
        sys_version = ""
        protocol_version = "HTTP/1.1"

        def log_message(self, format, *args):  # noqa: A002 - Signatur der Standardbibliothek
            log.debug("%s %s", self.address_string(), format % args)

        # ---------- Antworten
        def _kopf_gemeinsam(self):
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("X-Frame-Options", "DENY")
            herkunft = self.headers.get("Origin")
            if not lokal and herkunft in dienst.herkunft:
                self.send_header("Access-Control-Allow-Origin", herkunft)
                self.send_header("Vary", "Origin")

        def _senden(self, status: int, inhalt: bytes, art: str, extra: dict | None = None):
            self.send_response(status)
            self.send_header("Content-Type", art)
            self.send_header("Content-Length", str(len(inhalt)))
            self._kopf_gemeinsam()
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(inhalt)

        def _json(self, status: int, obj):
            self._senden(status, _json(obj).encode("utf-8"), "application/json; charset=utf-8")

        def _fehler(self, e: Abgelehnt):
            log.info("abgelehnt %s %s: %s", self.command, self.path, e.grund)
            self._json(e.status, {"ok": False, "grund": e.grund, "text": e.text})

        # ---------- Eingangsprüfungen
        def _koerper(self) -> bytes:
            laenge = int(self.headers.get("Content-Length") or 0)
            if laenge > MAX_KOERPER:
                raise Abgelehnt(413, "zu_gross", "Die Sendung ist zu groß.")
            return self.rfile.read(laenge) if laenge else b""

        def _wache(self):
            """Rechner-Server: nur Host 127.0.0.1/localhost (Schutz gegen DNS-Rebinding). Heimnetz: nur private Absender."""
            if lokal:
                host = (self.headers.get("Host") or "").lower()
                erlaubt = {f"127.0.0.1:{dienst.port}", f"localhost:{dienst.port}", f"[::1]:{dienst.port}"}
                if host not in erlaubt:
                    raise Abgelehnt(421, "host", "Unbekannter Hostname.")
            elif not _ist_privat(self.client_address[0]):
                raise Abgelehnt(403, "nicht_heimnetz", "Nur aus dem Heimnetz erreichbar.")

        def _berechtigt(self, abfrage: dict, koerper: bytes):
            """Rechner-Ansicht (Sitzungsschlüssel) oder unterschriebenes Gerät."""
            if lokal:
                token = self.headers.get("X-MF-Lokal") or (abfrage.get("token") or [None])[0]
                if token and hmac.compare_digest(str(token), dienst.token):
                    return None
            if self.headers.get("X-MF-Signatur"):
                return pruefe_anfrage(dienst.ablage, self.headers, self.command, self.path, koerper)
            raise Abgelehnt(401, "nicht_berechtigt", "Nur für gekoppelte Geräte oder die App am Rechner.")

        def _nur_lokal(self, abfrage: dict):
            token = self.headers.get("X-MF-Lokal")
            if not lokal or not token or not hmac.compare_digest(str(token), dienst.token):
                raise Abgelehnt(403, "nur_rechner", "Nur in der App am Rechner möglich.")

        # ---------- Wege
        def do_OPTIONS(self):  # noqa: N802
            herkunft = self.headers.get("Origin")
            if lokal or herkunft not in dienst.herkunft:
                self._senden(403, b"", "text/plain")
                return
            extra = {"Access-Control-Allow-Methods": "GET, POST, DELETE", "Access-Control-Max-Age": "600",
                     "Access-Control-Allow-Headers": "Content-Type, X-MF-Geraet, X-MF-Zeit, X-MF-Signatur, X-MF-Verschluesselt"}
            if self.headers.get("Access-Control-Request-Private-Network") == "true":
                extra["Access-Control-Allow-Private-Network"] = "true"
            self._senden(204, b"", "text/plain", extra)

        def do_HEAD(self):  # noqa: N802
            self.do_GET()

        def do_GET(self):  # noqa: N802
            self._weiter("GET")

        def do_POST(self):  # noqa: N802
            self._weiter("POST")

        def do_PUT(self):  # noqa: N802
            self._weiter("PUT")

        def do_DELETE(self):  # noqa: N802
            self._weiter("DELETE")

        def _weiter(self, methode: str):
            teile = urlsplit(self.path)
            abfrage = parse_qs(teile.query)
            try:
                self._wache()
                koerper = self._koerper() if methode in ("POST", "PUT", "DELETE") else b""
                self._weg(methode, teile.path, abfrage, koerper)
            except Abgelehnt as e:
                self._fehler(e)
            except (ValueError, KeyError, json.JSONDecodeError) as e:
                self._fehler(Abgelehnt(400, "unlesbar", f"Anfrage unlesbar: {e}"))
            except Exception:  # pragma: no cover
                log.exception("Fehler bei %s %s", methode, self.path)
                self._fehler(Abgelehnt(500, "intern", "Interner Fehler, siehe ~/.maehrfit/mf_dienst.log."))

        def _weg(self, methode: str, pfad: str, abfrage: dict, koerper: bytes):
            a = dienst.ablage
            if methode == "GET" and pfad in ("/", "/index.html", "/MF.html"):
                html = dienst.html()
                if lokal:
                    html = html_fuer_rechner(html, dienst.token)
                self._senden(200, html.encode("utf-8"), "text/html; charset=utf-8")
                return
            if methode == "GET" and pfad == "/api/status":
                self._json(200, self._status())
                return
            if methode == "POST" and pfad == "/api/sync":
                self._json(200, self._sync(koerper))
                return
            if methode == "GET" and pfad == "/api/messungen":
                self._berechtigt(abfrage, koerper)
                q = lambda k: (abfrage.get(k) or [None])[0]  # noqa: E731
                art = q("art")
                if art and art not in ARTEN:
                    raise Abgelehnt(400, "art", "Unbekannte Art.")
                liste = a.messungen_lesen(seit=_abfrage_ms(q("seit")), art=art, von=q("von"), bis=q("bis"))
                self._json(200, {"ok": True, "zeit": jetzt_ms(), "anzahl": len(liste), "messungen": liste})
                return
            if methode == "GET" and pfad == "/api/export":
                self._berechtigt(abfrage, koerper)
                inhalt = export_zip(a)
                name = f"maehr-fit-{time.strftime('%Y-%m-%d')}.zip"
                self._senden(200, inhalt, "application/zip", {"Content-Disposition": f'attachment; filename="{name}"'})
                return
            if methode == "DELETE" and pfad == "/api/geraet":
                g = pruefe_anfrage(a, self.headers, methode, self.path, koerper)   # ein Handy entkoppelt sich selbst
                a.geraet_entfernen(g["id"])
                self._json(200, {"ok": True})
                return
            if pfad.startswith("/api/speicher") or pfad in ("/api/geraete", "/api/koppeln", "/api/eingang"):
                self._nur_lokal(abfrage)
                self._rechner(methode, pfad, abfrage, koerper)
                return
            raise Abgelehnt(404, "unbekannt", "Diesen Weg gibt es nicht.")

        def _status(self) -> dict:
            basis = {"ok": True, "app": APP_KENNUNG, "version": VERSION, "protokoll": PROTOKOLL, "zeit": jetzt_ms(),
                     "verschluesselung": ["aes-256-gcm"] if krypto_verfuegbar() else [], "max_stapel": MAX_STAPEL}
            if not lokal:
                return basis
            e = dienst.eingang
            return {**basis, "lokal": True, "messungen": dienst.ablage.anzahl_messungen(),
                    "geraete": len(dienst.ablage.geraete()), "lan": {"adresse": dienst.lan, "port": dienst.port},
                    "eingang": {"ordner": str(e.ordner) if e else None, "zuletzt": e.zuletzt if e else None}}

        def _sync(self, koerper: bytes) -> dict:
            g = pruefe_anfrage(dienst.ablage, self.headers, "POST", self.path, koerper)
            obj = json.loads(koerper.decode("utf-8") or "{}")
            if isinstance(obj, dict) and "iv" in obj and "daten" in obj:
                klartext = koerper_entschluesseln(aus_b64url(g["schluessel"]), obj, g["id"], self.headers.get("X-MF-Zeit"))
                obj = json.loads(klartext.decode("utf-8"))
            liste = obj.get("messungen") if isinstance(obj, dict) else None
            if not isinstance(liste, list):
                raise Abgelehnt(400, "messungen_fehlt", "Feld „messungen“ fehlt.")
            if len(liste) > MAX_STAPEL:
                raise Abgelehnt(413, "stapel", f"Höchstens {MAX_STAPEL} Messwerte je Sendung.")
            jetzt = jetzt_ms()
            ergebnis = dienst.ablage.messungen_speichern(liste, herkunft=f"geraet:{g['id']}", jetzt=jetzt)
            if liste:
                dienst.ablage.sync_merken(g["id"], jetzt, ergebnis["neu"], ergebnis["ersetzt"])
            log.info("Sync von %s (%s): %s neu, %s schon da, %s ungültig", g["name"], g["id"], ergebnis["neu"], ergebnis["ersetzt"], ergebnis["ungueltig"])
            return {"ok": True, "zeit": jetzt, "geraet": g["id"], **ergebnis}

        def _rechner(self, methode: str, pfad: str, abfrage: dict, koerper: bytes):
            a = dienst.ablage
            q = lambda k: (abfrage.get(k) or [""])[0]  # noqa: E731
            if pfad == "/api/speicher/liste" and methode == "GET":
                self._json(200, {"schluessel": a.liste(q("praefix"))})
            elif pfad == "/api/speicher/alle" and methode == "GET":
                self._json(200, {"werte": a.alle(q("praefix"))})
            elif pfad == "/api/speicher/wert" and methode == "GET":
                w = a.lies(q("k"))
                self._json(200, {"da": w is not None, "wert": w})
            elif pfad == "/api/speicher/wert" and methode == "PUT":
                if not q("k"):
                    raise Abgelehnt(400, "schluessel", "Schlüssel fehlt.")
                a.schreib(q("k"), json.loads(koerper.decode("utf-8") or "null"))
                self._json(200, {"ok": True})
            elif pfad == "/api/speicher/alles" and methode == "DELETE":
                a.alles_loeschen()
                self._json(200, {"ok": True})
            elif pfad == "/api/geraete" and methode == "GET":
                self._json(200, {"geraete": a.geraete(), "zeit": jetzt_ms()})
            elif pfad == "/api/geraete" and methode == "DELETE":
                self._json(200, {"ok": a.geraet_entfernen(q("id"))})
            elif pfad == "/api/koppeln" and methode == "POST":
                if not dienst.lan:
                    raise Abgelehnt(409, "kein_heimnetz", "Der Rechner ist in keinem Heimnetz erreichbar (--lan-adresse).")
                name = (json.loads(koerper.decode("utf-8") or "{}") or {}).get("name") or "Handy"
                g = a.geraet_anlegen(name)
                text = kopplung_text(dienst.lan, dienst.port, g)
                self._json(200, {"ok": True, "geraet": g["id"], "name": g["name"], "ablauf": g["ablauf"], "text": text,
                                 "svg": qr_svg(text), "fingerabdruck": g["schluessel_hash"][:8]})
            elif pfad == "/api/eingang" and methode == "POST":
                e = dienst.eingang
                self._json(200, {"ok": True, "meldungen": e.pruefen() if e else [], "ordner": str(e.ordner) if e else None})
            elif pfad == "/api/eingang" and methode == "GET":
                e = dienst.eingang
                self._json(200, {"ordner": str(e.ordner) if e else None, "zuletzt": e.zuletzt if e else None, "dateien": a.eingang_liste()})
            else:
                raise Abgelehnt(404, "unbekannt", "Diesen Weg gibt es nicht.")

    return Handler


def export_zip(ablage: Ablage) -> bytes:
    puffer = io.BytesIO()
    inhalt = ablage.export_inhalt()
    with zipfile.ZipFile(puffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("maehr-fit-export.json", json.dumps(inhalt, ensure_ascii=False, indent=1))
        z.writestr("liesmich.txt", "Sicherung von MAEHR FIT. Format wie daten/verbinden.js exportieren(): "
                                   "eintraege = { \"messung:<art>:<JJJJ-MM-TT>\": [Messwerte] }. Wieder einlesen: "
                                   "Datei maehr-fit-export.json in den Eingangsordner legen.\n")
    return puffer.getvalue()


def starte_server(dienst: Dienst, adresse: str, port: int, lokal: bool) -> ThreadingHTTPServer:
    familie = socket.AF_INET6 if ":" in adresse else socket.AF_INET

    class Server(ThreadingHTTPServer):
        address_family = familie
        daemon_threads = True
        allow_reuse_address = True

    s = Server((adresse, port), baue_handler(dienst, lokal))
    threading.Thread(target=s.serve_forever, name=f"http-{'rechner' if lokal else 'heimnetz'}", daemon=True).start()
    dienst.server.append(s)
    return s


# ================================================================================================
# Autostart (macOS LaunchAgent, Linux systemd --user, Windows Autostart-Ordner oder Aufgabenplanung)
# ================================================================================================

AUTOSTART_NAME = "de.maehrsteuern.maehrfit"


def _xml(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def plist_text(python: str, skript: str, log_pfad: str) -> str:
    argumente = "".join(f"\n    <string>{_xml(a)}</string>" for a in (python, skript, "--kein-browser"))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{AUTOSTART_NAME}</string>
  <key>ProgramArguments</key>
  <array>{argumente}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>{_xml(log_pfad)}</string>
  <key>StandardErrorPath</key>
  <string>{_xml(log_pfad)}</string>
</dict>
</plist>
"""


def systemd_text(python: str, skript: str) -> str:
    def q(a):
        return '"' + a.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return f"""[Unit]
Description=MAEHR FIT – Dienst am Rechner (Messwerte vom Handy und aus dem Eingangsordner)
After=network-online.target

[Service]
Type=simple
ExecStart={q(python)} {q(skript)} --kein-browser --kein-tray
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
"""


def cmd_text(pythonw: str, skript: str) -> str:
    return f'@echo off\r\nrem MAEHR FIT – Dienst am Rechner (Autostart)\r\nstart "" /min "{pythonw}" "{skript}" --kein-browser\r\n'


def _pythonw(python: str) -> str:
    p = pathlib.Path(python)
    kandidat = p.with_name("pythonw.exe")
    return str(kandidat) if kandidat.exists() else python


def autostart(aktion: str, system: str | None = None, home: pathlib.Path | None = None, python: str | None = None,
              skript: str | None = None, art: str = "ordner", ausfuehren: bool = True) -> list:
    """Autostart einrichten oder entfernen. Gibt Meldungen (Sätze) zurück. ausfuehren=False schreibt nur Dateien (Tests)."""
    system = system or platform.system()
    home = pathlib.Path(home or pathlib.Path.home())
    python = python or sys.executable
    skript = skript or str(pathlib.Path(__file__).resolve())
    meldungen = []

    def rufe(befehl):
        if not ausfuehren:
            meldungen.append("(nicht ausgeführt) " + " ".join(befehl))
            return
        try:
            r = subprocess.run(befehl, capture_output=True, text=True, timeout=30)
            if r.returncode != 0:
                meldungen.append(f"Hinweis: {' '.join(befehl[:3])} … meldet: {(r.stderr or r.stdout).strip()[:200]}")
        except (OSError, subprocess.SubprocessError) as e:
            meldungen.append(f"Hinweis: {befehl[0]} nicht ausführbar ({e}).")

    if system == "Darwin":
        ziel = home / "Library" / "LaunchAgents" / f"{AUTOSTART_NAME}.plist"
        if aktion == "einrichten":
            ziel.parent.mkdir(parents=True, exist_ok=True)
            ziel.write_text(plist_text(python, skript, str(home / ".maehrfit" / "autostart.log")), encoding="utf-8")
            rufe(["launchctl", "unload", str(ziel)])
            rufe(["launchctl", "load", "-w", str(ziel)])
            meldungen.append(f"Autostart eingerichtet: {ziel} (startet bei jeder Anmeldung).")
        else:
            rufe(["launchctl", "unload", "-w", str(ziel)])
            ziel.unlink(missing_ok=True)
            meldungen.append(f"Autostart entfernt: {ziel}")
    elif system == "Linux":
        ziel = home / ".config" / "systemd" / "user" / "maehr-fit.service"
        hat_systemd = shutil.which("systemctl") is not None
        if aktion == "einrichten":
            ziel.parent.mkdir(parents=True, exist_ok=True)
            ziel.write_text(systemd_text(python, skript), encoding="utf-8")
            if hat_systemd or not ausfuehren:
                rufe(["systemctl", "--user", "daemon-reload"])
                rufe(["systemctl", "--user", "enable", "--now", "maehr-fit.service"])
            else:
                meldungen.append("systemctl fehlt – Datei geschrieben, aber nicht aktiviert.")
            meldungen.append(f"Autostart eingerichtet: {ziel} (systemd --user, startet nach der Anmeldung).")
        else:
            if hat_systemd or not ausfuehren:
                rufe(["systemctl", "--user", "disable", "--now", "maehr-fit.service"])
            ziel.unlink(missing_ok=True)
            meldungen.append(f"Autostart entfernt: {ziel}")
    elif system == "Windows":
        appdata = pathlib.Path(os.environ.get("APPDATA") or (home / "AppData" / "Roaming"))
        ziel = appdata / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup" / "maehr-fit.cmd"
        if art == "schtasks":
            if aktion == "einrichten":
                rufe(["schtasks", "/Create", "/F", "/SC", "ONLOGON", "/TN", "MAEHR FIT", "/TR", f'"{_pythonw(python)}" "{skript}" --kein-browser'])
                meldungen.append("Autostart eingerichtet: Aufgabenplanung, Aufgabe „MAEHR FIT“ (bei Anmeldung).")
            else:
                rufe(["schtasks", "/Delete", "/F", "/TN", "MAEHR FIT"])
                meldungen.append("Autostart entfernt: Aufgabe „MAEHR FIT“.")
        elif aktion == "einrichten":
            ziel.parent.mkdir(parents=True, exist_ok=True)
            ziel.write_text(cmd_text(_pythonw(python), skript), encoding="utf-8")
            meldungen.append(f"Autostart eingerichtet: {ziel} (Autostart-Ordner, startet bei jeder Anmeldung).")
        else:
            ziel.unlink(missing_ok=True)
            meldungen.append(f"Autostart entfernt: {ziel}")
    else:
        meldungen.append(f"Autostart für {system} ist nicht vorgesehen. Bitte von Hand einrichten (docs/technik/desktop.md).")
    return meldungen


# ================================================================================================
# Taskleisten-Symbol (freiwillig)
# ================================================================================================

def tray_starten(adresse: str, beenden) -> bool:
    """Symbol mit Menü (Öffnen, Handy koppeln, Beenden). Blockiert bis Beenden. False, wenn pystray/Pillow fehlen."""
    try:
        import pystray
        from PIL import Image, ImageDraw
    except Exception:
        log.info("Kein Symbol in der Taskleiste (freiwillig: pip install pystray Pillow). Beenden mit Strg+C.")
        return False
    bild = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    zeichner = ImageDraw.Draw(bild)
    zeichner.ellipse((4, 4, 60, 60), fill=(46, 125, 90, 255))
    zeichner.text((18, 22), "MF", fill=(255, 255, 255, 255))

    def ende(symbol, _):
        symbol.stop()
        beenden()

    menue = pystray.Menu(
        pystray.MenuItem("MAEHR FIT öffnen", lambda *_: webbrowser.open(adresse), default=True),
        pystray.MenuItem("Handy koppeln …", lambda *_: webbrowser.open(adresse + "#/sync")),
        pystray.MenuItem("Beenden", ende),
    )
    try:
        pystray.Icon("maehr-fit", bild, "MAEHR FIT", menue).run()
    except Exception as e:  # z. B. Linux ohne Desktop-Sitzung
        log.info("Taskleisten-Symbol nicht möglich (%s). Beenden mit Strg+C.", e)
        return False
    return True


# ================================================================================================
# Einstellungen, Start, Befehle
# ================================================================================================

def lies_einstellungen(ordner: pathlib.Path) -> dict:
    pfad = ordner / "einstellungen.json"
    try:
        return json.loads(pfad.read_text(encoding="utf-8")) if pfad.exists() else {}
    except (OSError, json.JSONDecodeError):
        log.warning("einstellungen.json unlesbar – Standardwerte.")
        return {}


def passwort_lesen(ordner: pathlib.Path) -> str | None:
    if os.environ.get("MF_ORDNER_PASSWORT"):
        return os.environ["MF_ORDNER_PASSWORT"]
    pfad = ordner / "ordner_passwort"
    return pfad.read_text(encoding="utf-8").strip() or None if pfad.exists() else None


def html_finden(wunsch: str | None, ordner: pathlib.Path) -> pathlib.Path | None:
    """--html, sonst MF.html im Repo (wird als Sicherung nach ~/.maehrfit/MF.html kopiert), sonst die Kopie dort."""
    if wunsch:
        return pathlib.Path(wunsch).expanduser().resolve()
    repo = pathlib.Path(__file__).resolve().parent.parent / "MF.html"
    kopie = ordner / "MF.html"
    if repo.exists():
        try:
            if not kopie.exists() or kopie.read_bytes() != repo.read_bytes():
                shutil.copyfile(repo, kopie)
        except OSError:
            pass
        return repo
    return kopie if kopie.exists() else None


def logging_einrichten(ordner: pathlib.Path, ausfuehrlich: bool = False) -> None:
    log.setLevel(logging.DEBUG if ausfuehrlich else logging.INFO)
    if log.handlers:
        return
    form = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%d %H:%M:%S")
    datei = logging.handlers.RotatingFileHandler(ordner / "mf_dienst.log", maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    datei.setFormatter(form)
    konsole = logging.StreamHandler()
    konsole.setFormatter(logging.Formatter("%(message)s"))
    log.addHandler(datei)
    log.addHandler(konsole)


def argumente(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="mf_dienst.py", description="MAEHR FIT am Rechner: App zeigen, Messwerte vom Handy und aus dem Eingangsordner sammeln.")
    p.add_argument("--port", type=int, help=f"Port (Standard {STANDARD_PORT})")
    p.add_argument("--lan-adresse", help="Adresse im Heimnetz (Standard: automatisch; „aus“ = nur dieser Rechner)")
    p.add_argument("--html", help="Pfad zu MF.html (Standard: MF.html im Repo)")
    p.add_argument("--daten-ordner", help="Ordner für Datenbank und Einstellungen (Standard ~/.maehrfit)")
    p.add_argument("--eingang", help="Eingangsordner (Standard ~/.maehrfit/eingang)")
    p.add_argument("--kein-browser", action="store_true", help="Browser beim Start nicht öffnen")
    p.add_argument("--kein-tray", action="store_true", help="kein Symbol in der Taskleiste")
    p.add_argument("--autostart", choices=["einrichten", "entfernen"], help="beim Anmelden automatisch starten")
    p.add_argument("--autostart-art", choices=["ordner", "schtasks"], default="ordner", help="nur Windows: Autostart-Ordner oder Aufgabenplanung")
    p.add_argument("--ausfuehrlich", action="store_true", help="jede Anfrage protokollieren")
    unter = p.add_subparsers(dest="befehl")
    k = unter.add_parser("koppeln", help="Handy koppeln (QR-Code, 10 Minuten gültig)")
    k.add_argument("--name", default="Handy")
    unter.add_parser("geraete", help="gekoppelte Geräte")
    e = unter.add_parser("entkoppeln", help="Gerät entfernen")
    e.add_argument("id")
    i = unter.add_parser("importieren", help="Datei sofort einlesen")
    i.add_argument("dateien", nargs="+")
    x = unter.add_parser("exportieren", help="Sicherung als ZIP")
    x.add_argument("ziel")
    unter.add_parser("passwort", help="Passwort für .mfx-Dateien hinterlegen")
    unter.add_parser("status", help="kurzer Zustand")
    unter.add_parser("start", help="Dienst starten (Standard)")
    return p.parse_args(argv)


def _zeit_text(ms) -> str:
    return time.strftime("%d.%m.%Y %H:%M", time.localtime(ms / 1000)) if ms else "–"


def main(argv=None) -> int:
    try:
        sys.stdout.reconfigure(errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass
    a = argumente(argv)
    ordner = daten_ordner(a.daten_ordner)
    logging_einrichten(ordner, a.ausfuehrlich)
    einst = lies_einstellungen(ordner)
    port = a.port or int(einst.get("port") or STANDARD_PORT)
    lan_wunsch = a.lan_adresse or einst.get("lan_adresse")
    lan_bindung = None if lan_wunsch == "aus" else (lan_wunsch or lan_adresse())
    # „0.0.0.0“ = auf allen Netzen lauschen; im QR-Code steht dann trotzdem die eigene Heimnetz-Adresse
    lan = lan_adresse() if lan_bindung in ("0.0.0.0", "::") else lan_bindung

    if a.autostart:
        for m in autostart(a.autostart, art=a.autostart_art):
            print(m)
        return 0

    ablage = Ablage(ordner / "mf.sqlite")
    befehl = a.befehl or "start"

    if befehl == "koppeln":
        if not lan:
            print("Dieser Rechner hat keine Adresse im Heimnetz. Ist das WLAN/LAN verbunden? (sonst --lan-adresse angeben)")
            return 1
        g = ablage.geraet_anlegen(a.name)
        text = kopplung_text(lan, port, g)
        print(f"\nHandy koppeln – gültig bis {_zeit_text(g['ablauf'])} (10 Minuten).")
        print("In MAEHR FIT auf dem Handy: Mehr → Sync → „Mit dem Rechner koppeln“, dann diesen Code scannen.\n")
        if not qr_terminal(text):
            print("(Kein QR-Code im Terminal – freiwillig: pip install qrcode. Stattdessen den Text einfügen:)\n")
        print(text)
        print(f"\nFingerabdruck zum Vergleichen: {g['schluessel_hash'][:8]} · Gerät {g['id']}")
        print(f"Der Dienst muss laufen und unter {lan}:{port} im Heimnetz erreichbar sein.")
        return 0
    if befehl == "geraete":
        geraete = ablage.geraete()
        if not geraete:
            print("Noch kein Gerät gekoppelt (python3 desktop/mf_dienst.py koppeln).")
        for g in geraete:
            zustand = "gekoppelt" if g["gekoppelt_am"] else f"wartet bis {_zeit_text(g['ablauf'])}"
            print(f"{g['id']}  {g['name']:<16} {zustand:<24} zuletzt {_zeit_text(g['zuletzt'])}  Fingerabdruck {g['fingerabdruck']}")
        return 0
    if befehl == "entkoppeln":
        print("Entfernt." if ablage.geraet_entfernen(a.id) else "Kein Gerät mit dieser Kennung.")
        return 0
    if befehl == "importieren":
        rc = 0
        for d in a.dateien:
            try:
                r = importiere_datei(ablage, pathlib.Path(d).expanduser(), passwort_lesen(ordner))
                print(f"{d}: {r['neu']} neu, {r['ersetzt']} schon da, {r['ungueltig']} ungültig, {r['hinweise']} Hinweise")
            except Exception as e:
                print(f"{d}: nicht eingelesen – {e}")
                rc = 1
        return rc
    if befehl == "exportieren":
        pathlib.Path(a.ziel).expanduser().write_bytes(export_zip(ablage))
        print(f"Sicherung geschrieben: {a.ziel} ({ablage.anzahl_messungen()} Messwerte)")
        return 0
    if befehl == "passwort":
        pw = getpass.getpass("Passwort für .mfx-Dateien (wie in der App beim Export): ")
        if not pw:
            print("Kein Passwort – nichts geändert.")
            return 1
        pfad = ordner / "ordner_passwort"
        pfad.write_text(pw, encoding="utf-8")
        nur_fuer_mich(pfad)
        print(f"Gespeichert in {pfad} (nur für deinen Benutzer lesbar).")
        return 0
    if befehl == "status":
        print(f"Daten: {ablage.pfad} · {ablage.anzahl_messungen()} Messwerte · {len(ablage.geraete())} Geräte")
        print(f"Verschlüsselung: {'ja (cryptography)' if krypto_verfuegbar() else 'nein – nur Unterschrift (pip install cryptography)'}")
        print(f"Heimnetz: {lan or 'aus'} · Port {port}")
        return 0

    # ---------- Dienst starten
    html = html_finden(a.html, ordner)
    eingang_ordner = pathlib.Path(a.eingang or einst.get("eingang") or (ordner / "eingang")).expanduser()
    eingang = Eingang(ablage, eingang_ordner, passwort=lambda: passwort_lesen(ordner), takt_s=int(einst.get("eingang_takt_s") or EINGANG_TAKT_S))
    dienst = Dienst(ablage, html, port, lan, eingang, herkunft=set(einst.get("erlaubte_herkunft") or ERLAUBTE_HERKUNFT))
    try:
        starte_server(dienst, "127.0.0.1", port, lokal=True)
    except OSError as e:
        print(f"Port {port} ist belegt ({e}). Läuft MAEHR FIT schon? Sonst: --port 8766")
        return 1
    if lan_bindung:
        try:
            starte_server(dienst, lan_bindung, port, lokal=False)
        except OSError as e:
            log.warning("Heimnetz-Adresse %s:%s nicht nutzbar (%s) – nur dieser Rechner.", lan, port, e)
            dienst.lan = None
    eingang.starten()
    adresse = f"http://127.0.0.1:{port}/"
    log.info("MAEHR FIT läuft: %s · Heimnetz: %s · Daten: %s · Eingang: %s", adresse,
             f"{dienst.lan}:{port}" if dienst.lan else "aus", ablage.pfad, eingang_ordner)
    log.info("Verschlüsselung: %s", "AES-GCM verfügbar" if krypto_verfuegbar() else "nicht verfügbar – Sendungen nur unterschrieben (pip install cryptography)")
    if html is None:
        log.warning("MF.html nicht gefunden – im Repo python3 bau.py ausführen oder --html angeben.")
    if not a.kein_browser:
        webbrowser.open(adresse)

    halt = threading.Event()

    def beenden():
        halt.set()

    if a.kein_tray or not tray_starten(adresse, beenden):
        try:
            while not halt.wait(1):
                pass
        except KeyboardInterrupt:
            pass
    for s in dienst.server:
        s.shutdown()
    eingang.anhalten()
    ablage.schliessen()
    log.info("MAEHR FIT beendet.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
