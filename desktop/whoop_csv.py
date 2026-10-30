"""desktop/whoop_csv.py – WHOOP-Datenexport (CSV/ZIP) → normierte Messwerte, für den Rechner-Dienst.

Kernaussage: Dieselbe Übersetzung wie in der App (daten/csv_import.js, daten/zeit.js, daten/ablage.js), nur in Python, damit der
Rechner einen WHOOP-Export aus dem Eingangsordner selbst einlesen kann. Spaltennamen, Zeitzonen, Kennungen (quelle.id) und Rundung
sind Zeile für Zeile übernommen. Darum erkennt der Rechner einen Export, den das Handy schon geschickt hat, als „schon da“.
Ob beide Seiten gleich rechnen, prüft tests/python/test_dienst.py gegen daten/fixtures/whoop_erwartet.json (erzeugt von der App).

Nur Standardbibliothek. JavaScript-Eigenheiten, die wir nachbilden:
  - Math.round(x) = floor(x + 0.5) (Python round() rundet „zur geraden Zahl“, das wäre anders),
  - Number(text) (kein „1_000“, dafür „0x1A“),
  - Date.UTC rollt über (31. Februar → 3. März) statt einen Fehler zu werfen,
  - ganze Gleitkommazahlen werden als ganze Zahlen ausgegeben (JSON wie in der App: 45 statt 45.0).
"""
from __future__ import annotations

import io
import math
import re
import time
import zipfile
from datetime import datetime, timedelta, timezone

try:  # zoneinfo gibt es ab Python 3.9; unter Windows braucht es ggf. das Paket tzdata
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore

MS_MINUTE = 60000
_EPOCHE = datetime(1970, 1, 1, tzinfo=timezone.utc)

ARTEN = ["herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch", "fremdwerte"]


def js_round(x: float) -> int:
    """Math.round aus JavaScript."""
    return int(math.floor(x + 0.5))


def leeres_paket() -> dict:
    return {a: [] for a in ARTEN}


# ------------------------------------------------------------------------------------------------
# Zeit (daten/zeit.js)
# ------------------------------------------------------------------------------------------------

def _date_utc(j: int, mo: int, d: int, h: int = 0, mi: int = 0, se: int = 0, ms: int = 0) -> int:
    """Date.UTC mit Überlauf wie in JavaScript."""
    basis = datetime(j, mo, 1, tzinfo=timezone.utc)
    zeitpunkt = basis + timedelta(days=d - 1, hours=h, minutes=mi, seconds=se, milliseconds=ms)
    return int((zeitpunkt - _EPOCHE) // timedelta(milliseconds=1))


def _aus_ms(t: int) -> datetime:
    return _EPOCHE + timedelta(milliseconds=t)


def tag_iso(t: int, zone_min=None) -> str:
    """Kalendertag JJJJ-MM-TT; ohne zone_min in der Zeitzone des Rechners."""
    if isinstance(zone_min, (int, float)) and not isinstance(zone_min, bool) and math.isfinite(zone_min):
        d = _aus_ms(int(t + zone_min * MS_MINUTE))
        return f"{d.year:04d}-{d.month:02d}-{d.day:02d}"
    d = datetime.fromtimestamp(t / 1000)
    return f"{d.year:04d}-{d.month:02d}-{d.day:02d}"


def _iana_versatz(zone: str, utc_ms: int):
    if ZoneInfo is None:
        return None
    try:
        z = ZoneInfo(zone)
    except Exception:
        return None
    versatz = _aus_ms(int(math.floor(utc_ms / 1000) * 1000)).astimezone(z).utcoffset()
    if versatz is None:
        return None
    return js_round(versatz.total_seconds() / 60)


_VERSATZ_RE = re.compile(r"^(?:utc|gmt)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$", re.I | re.A)
_IANA_RE = re.compile(r"^[A-Za-z_]+/[A-Za-z_/+-]+$", re.A)


def zone_zu_minuten(zone, felder=None):
    if isinstance(zone, (int, float)) and not isinstance(zone, bool):
        return zone if math.isfinite(zone) else None
    if zone is None:
        return None
    text = str(zone).strip()
    if text == "":
        return None
    if re.fullmatch(r"z|utc|gmt", text, re.I):
        return 0
    m = _VERSATZ_RE.fullmatch(text)
    if m:
        minuten = int(m.group(2)) * 60 + int(m.group(3) or 0)
        return -minuten if m.group(1) == "-" else minuten
    if felder and _IANA_RE.fullmatch(text):
        wand = _date_utc(*felder)
        v = _iana_versatz(text, wand)
        if v is None:
            return None
        return _iana_versatz(text, wand - v * MS_MINUTE)
    return None


_ISO = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$", re.I | re.A)
_DE = re.compile(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$", re.A)
_US = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$", re.I | re.A)


def lese_zeit(text, zone=None):
    """Datum/Uhrzeit-Text → Unix-ms oder None (wie leseZeit in daten/zeit.js)."""
    if text is None:
        return None
    s = str(text).strip()
    if s == "":
        return None
    if re.fullmatch(r"\d{13}", s, re.A):
        return int(s)
    if re.fullmatch(r"\d{10}", s, re.A):
        return int(s) * 1000
    h = mi = se = ms = 0
    versatz_text = None
    m = _ISO.fullmatch(s)
    if m:
        j, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        h, mi, se = int(m.group(4) or 0), int(m.group(5) or 0), int(m.group(6) or 0)
        ms = int(m.group(7)[:3].ljust(3, "0")) if m.group(7) else 0
        versatz_text = m.group(8)
    elif (m := _DE.fullmatch(s)):
        d, mo, j = int(m.group(1)), int(m.group(2)), int(m.group(3))
        h, mi, se = int(m.group(4) or 0), int(m.group(5) or 0), int(m.group(6) or 0)
    elif (m := _US.fullmatch(s)):
        mo, d, j = int(m.group(1)), int(m.group(2)), int(m.group(3))
        h, mi, se = int(m.group(4) or 0), int(m.group(5) or 0), int(m.group(6) or 0)
        ampm = (m.group(7) or "").lower()
        if ampm == "pm" and h < 12:
            h += 12
        if ampm == "am" and h == 12:
            h = 0
    else:
        return None
    if mo < 1 or mo > 12 or d < 1 or d > 31 or h > 23 or mi > 59 or se > 60:
        return None
    felder = (j, mo, d, h, mi, se, ms)
    versatz = zone_zu_minuten(versatz_text) if versatz_text is not None else zone_zu_minuten(zone, felder)
    if versatz is not None:
        return _date_utc(*felder) - int(versatz * MS_MINUTE)
    # Ortszeit des Rechners (wie new Date(j, mo-1, d, …) in JavaScript)
    return int(time.mktime((j, mo, d, h, mi, se, 0, 0, -1))) * 1000 + ms


def versatz_fuer(zone, utc_ms):
    if zone is None or zone == "":
        return None
    fest = zone_zu_minuten(zone)
    if fest is not None:
        return fest
    return _iana_versatz(str(zone).strip(), utc_ms)


# ------------------------------------------------------------------------------------------------
# Ablage: Tag eines Datensatzes (daten/ablage.js)
# ------------------------------------------------------------------------------------------------

def bezugszeit(art: str, d: dict):
    if art == "schlaf":
        return d.get("bis")
    if art == "training":
        return d.get("von")
    if art in ("tagebuch", "fremdwerte"):
        return None
    return d.get("t")


def tag_von(art: str, d: dict, zone_min=None):
    """Kalendertag eines Datensatzes; Schlaf zählt zum Tag des Aufwachens."""
    if art in ("tagebuch", "fremdwerte"):
        return d.get("tag")
    z = d.get("zoneMin")
    z = z if isinstance(z, (int, float)) and not isinstance(z, bool) else zone_min
    bezug = bezugszeit(art, d)
    if not isinstance(bezug, (int, float)):
        return None
    return tag_iso(int(bezug), z)


# ------------------------------------------------------------------------------------------------
# CSV nach RFC 4180 (daten/csv_import.js parseCsv)
# ------------------------------------------------------------------------------------------------

def _rate_trenner(text: str) -> str:
    zaehl = {",": 0, ";": 0, "\t": 0}
    in_q = False
    for c in text:
        if c == '"':
            in_q = not in_q
        elif not in_q and c in "\n\r":
            break
        elif not in_q and c in zaehl:
            zaehl[c] += 1
    if zaehl[";"] > zaehl[","] and zaehl[";"] >= zaehl["\t"]:
        return ";"
    if zaehl["\t"] > zaehl[","]:
        return "\t"
    return ","


def parse_csv(text, trenner=None) -> dict:
    """→ {kopf: [...], zeilen: [{zeile, werte}], trenner}; zeile = physische Zeile, an der der Datensatz beginnt."""
    s = "" if text is None else str(text)
    if s[:1] == "﻿":
        s = s[1:]
    t = trenner or _rate_trenner(s)
    saetze: list[dict] = []
    feld = ""
    satz: list[str] = []
    in_q = False
    zeile = 1
    start = 1
    angefangen = False

    def satz_ende():
        nonlocal feld, satz, angefangen
        satz.append(feld)
        if not (len(satz) == 1 and satz[0] == "" and not angefangen):
            saetze.append({"zeile": start, "werte": satz})
        satz = []
        feld = ""
        angefangen = False

    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if in_q:
            if c == '"':
                if i + 1 < n and s[i + 1] == '"':
                    feld += '"'
                    i += 1
                else:
                    in_q = False
            else:
                if c == "\n" or (c == "\r" and not (i + 1 < n and s[i + 1] == "\n")):
                    zeile += 1
                feld += c
            i += 1
            continue
        if c == '"':
            in_q = True
            angefangen = True
        elif c == t:
            satz.append(feld)
            feld = ""
            angefangen = True
        elif c in "\r\n":
            if c == "\r" and i + 1 < n and s[i + 1] == "\n":
                i += 1
            satz_ende()
            zeile += 1
            start = zeile
        else:
            feld += c
            angefangen = True
        i += 1
    if feld != "" or satz or angefangen:
        satz_ende()
    kopf = [k.strip() for k in saetze[0]["werte"]] if saetze else []
    return {"kopf": kopf, "zeilen": saetze[1:], "trenner": t}


def norm_name(n) -> str:
    return re.sub(r"[^a-z0-9]", "", str("" if n is None else n).lower())


SPALTEN = {
    "zyklusStart": ["Cycle start time", "Cycle start"],
    "zyklusEnde": ["Cycle end time", "Cycle end"],
    "zone": ["Cycle timezone", "Timezone", "Time zone"],
    "erholung": ["Recovery score %", "Recovery score", "Recovery"],
    "ruhepuls": ["Resting heart rate (bpm)", "Resting heart rate", "RHR"],
    "hrv": ["Heart rate variability (ms)", "Heart rate variability", "HRV (ms)", "HRV"],
    "hauttemp": ["Skin temp (celsius)", "Skin temperature (celsius)", "Skin temp"],
    "spo2": ["Blood oxygen %", "Blood oxygen", "SpO2 %", "SpO2"],
    "tagesbelastung": ["Day Strain", "Strain"],
    "einschlafen": ["Sleep onset", "Sleep start time"],
    "aufwachen": ["Wake onset", "Sleep end time"],
    "schlafLeistung": ["Sleep performance %", "Sleep performance"],
    "atem": ["Respiratory rate (rpm)", "Respiratory rate"],
    "schlafMin": ["Asleep duration (min)"],
    "imBettMin": ["In bed duration (min)"],
    "leichtMin": ["Light sleep duration (min)"],
    "tiefMin": ["Deep (SWS) duration (min)", "Deep sleep duration (min)", "SWS duration (min)"],
    "remMin": ["REM duration (min)", "REM sleep duration (min)"],
    "wachMin": ["Awake duration (min)"],
    "bedarfMin": ["Sleep need (min)"],
    "schuldMin": ["Sleep debt (min)"],
    "effizienz": ["Sleep efficiency %", "Sleep efficiency"],
    "konstanz": ["Sleep consistency %", "Sleep consistency"],
    "nickerchen": ["Nap"],
    "trainingStart": ["Workout start time", "Workout start"],
    "trainingEnde": ["Workout end time", "Workout end"],
    "dauerMin": ["Duration (min)"],
    "aktivitaet": ["Activity name", "Activity", "Sport"],
    "trainingsbelastung": ["Activity Strain", "Workout strain"],
    "energie": ["Energy burned (cal)", "Energy burned (kcal)", "Calories"],
    "maxPuls": ["Max HR (bpm)", "Max heart rate (bpm)"],
    "mittelPuls": ["Average HR (bpm)", "Average heart rate (bpm)"],
    "zone1": ["HR Zone 1 %"], "zone2": ["HR Zone 2 %"], "zone3": ["HR Zone 3 %"], "zone4": ["HR Zone 4 %"], "zone5": ["HR Zone 5 %"],
    "distanz": ["Distance (meters)", "Distance (m)"],
    "frage": ["Question text", "Question"],
    "antwort": ["Answered yes", "Answer"],
    "notiz": ["Notes", "Note"],
}


def erkenne_datei(name, kopf=()):
    n = str(name or "").lower()
    if "physiological_cycles" in n or "physiological-cycles" in n:
        return "zyklen"
    if "sleeps" in n:
        return "schlaf"
    if "workouts" in n:
        return "training"
    if "journal_entries" in n or "journal" in n:
        return "tagebuch"
    k = {norm_name(x) for x in kopf}

    def hat(feld):
        return any(norm_name(x) in k for x in SPALTEN[feld])

    if hat("frage") and hat("antwort"):
        return "tagebuch"
    if hat("trainingStart"):
        return "training"
    if hat("erholung") or hat("tagesbelastung"):
        return "zyklen"
    if hat("einschlafen") and hat("aufwachen"):
        return "schlaf"
    return None


def _spalten_index(kopf):
    index = {}
    for i, k in enumerate(kopf):
        index[norm_name(k)] = i
    aus = {}
    for feld, namen in SPALTEN.items():
        for x in namen:
            if norm_name(x) in index:
                aus[feld] = index[norm_name(x)]
                break
    return aus


_DEZIMAL = re.compile(r"[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?", re.A)
_BASIS = re.compile(r"0([xXbBoO])([0-9a-fA-F]+)", re.A)


def _js_number(s: str):
    if _DEZIMAL.fullmatch(s):
        v = float(s)
        return v if math.isfinite(v) else None
    m = _BASIS.fullmatch(s)
    if m:
        try:
            return float(int(m.group(2), {"x": 16, "b": 2, "o": 8}[m.group(1).lower()]))
        except ValueError:
            return None
    return None


def lese_zahl(text):
    """„45.3“, „45,3“, „87 %“ → Zahl; „“, „n/a“ → None."""
    if text is None:
        return None
    s = re.sub(r"%$", "", str(text).strip()).strip()
    if s == "" or re.fullmatch(r"n/?a|null|none|-", s, re.I):
        return None
    if "," in s and "." not in s:
        s = s.replace(",", ".", 1)
    return _js_number(s)


def lese_ja_nein(text):
    s = str("" if text is None else text).strip().lower()
    if s in ("true", "yes", "ja", "1", "y", "wahr"):
        return True
    if s in ("false", "no", "nein", "0", "n", "falsch"):
        return False
    return None


def _min_zu_ms(m):
    return None if m is None else js_round(m * 60000)


def frage_schluessel(text) -> str:
    s = str("" if text is None else text).lower()
    s = s.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return re.sub(r"^_+|_+$", "", s)


AKTIVITAETEN = {
    "running": "laufen", "cycling": "radfahren", "walking": "gehen", "hiking": "wandern", "hiking/rucking": "wandern",
    "weightlifting": "gewichtheben", "strength trainer": "krafttraining", "functional fitness": "krafttraining",
    "yoga": "yoga", "hiit": "hiit", "swimming": "schwimmen_becken", "rowing": "rudern", "pilates": "pilates",
    "stretching": "dehnen", "soccer": "fussball", "tennis": "tennis", "spin": "heimtrainer", "elliptical": "crosstrainer",
    "activity": "sonstiges", "other": "sonstiges",
}


def _aktivitaet_kuerzel(name) -> str:
    k = str("" if name is None else name).strip().lower()
    return AKTIVITAETEN.get(k) or frage_schluessel(k) or "sonstiges"


def _median(werte):
    s = sorted(werte)
    if not s:
        return None
    m = len(s) >> 1
    return s[m] if len(s) % 2 else js_round((s[m - 1] + s[m]) / 2)


class _Zeile:
    def __init__(self, sp, satz, optionen):
        self.sp, self.satz, self.optionen = sp, satz, optionen

    def text(self, feld):
        i = self.sp.get(feld)
        if i is None:
            return None
        werte = self.satz["werte"]
        return (werte[i] if i < len(werte) else "").strip()

    def zahl(self, feld):
        return lese_zahl(self.text(feld))

    def zone(self):
        z = self.text("zone")
        return z if z else self.optionen.get("zone")

    def zeit(self, feld):
        return lese_zeit(self.text(feld), self.zone())

    def zone_min(self, t):
        z = self.zone()
        if z is None:
            return None
        return versatz_fuer(z, t)


def _quelle(datei, zeile, id_):
    return {"art": "csv", "id": id_, "datei": datei, "zeile": zeile}


def _mit_zone(d, zone_min):
    if zone_min is not None:
        d["zoneMin"] = zone_min
    return d


def _zyklen(datei, csv, optionen, paket, hinweise):
    haut_roh = []
    sp = _spalten_index(csv["kopf"])
    for satz in csv["zeilen"]:
        z = _Zeile(sp, satz, optionen)
        start = z.zeit("zyklusStart")
        if start is None:
            hinweise.append({"datei": datei, "zeile": satz["zeile"], "text": "Zyklusbeginn fehlt oder ist unlesbar – Zeile übersprungen."})
            continue
        wach = z.zeit("aufwachen")
        t = wach if wach is not None else start
        zone_min = z.zone_min(t)
        zusatz = {"zeitGeschaetzt": True} if wach is None else {}
        if wach is None:
            hinweise.append({"datei": datei, "zeile": satz["zeile"], "text": "Aufwachzeit fehlt – Zyklusbeginn als Messzeit genutzt."})
        basis = f"whoop:zyklus:{start}"

        def q(art):
            return _quelle(datei, satz["zeile"], f"{basis}:{art}")

        rhr = z.zahl("ruhepuls")
        if rhr is not None:
            paket["ruhepuls"].append(_mit_zone({"t": t, "bpm": rhr, **zusatz, "quelle": q("ruhepuls")}, zone_min))
        hrv = z.zahl("hrv")
        if hrv is not None:
            paket["hrv"].append(_mit_zone({"t": t, "rmssdMs": hrv, **zusatz, "quelle": q("hrv")}, zone_min))
        spo2 = z.zahl("spo2")
        if spo2 is not None:
            paket["spo2"].append(_mit_zone({"t": t, "prozent": spo2, **zusatz, "quelle": q("spo2")}, zone_min))
        haut = z.zahl("hauttemp")
        if haut is not None:
            haut_roh.append({"t": t, "mc": js_round(haut * 1000), "zoneMin": zone_min, "zusatz": zusatz, "quelle": q("hauttemp")})
        ende = z.zeit("zyklusEnde")
        if wach is not None:
            tag_bezug = wach
        elif ende is not None and ende > start:
            tag_bezug = start + (ende - start) // 2
        else:
            tag_bezug = start
        fw = {"erholung": z.zahl("erholung"), "belastung": z.zahl("tagesbelastung"), "schlafLeistung": z.zahl("schlafLeistung")}
        if any(v is not None for v in fw.values()):
            paket["fremdwerte"].append(_mit_zone({
                "tag": tag_iso(tag_bezug, z.zone_min(tag_bezug)), "t": t, "anbieter": "whoop", **fw, **zusatz, "quelle": q("fremdwerte"),
            }, zone_min))
    basis_mc = _median([h["mc"] for h in haut_roh])
    for h in haut_roh:
        paket["hauttemp"].append(_mit_zone({
            "t": h["t"], "deltaC": (h["mc"] - basis_mc) / 1000, "absolutC": h["mc"] / 1000, "basisC": basis_mc / 1000,
            "deltaBasis": "median_import", **h["zusatz"], "quelle": h["quelle"],
        }, h["zoneMin"]))


def _schlaf(datei, csv, optionen, paket, hinweise):
    sp = _spalten_index(csv["kopf"])
    for satz in csv["zeilen"]:
        z = _Zeile(sp, satz, optionen)
        von, bis = z.zeit("einschlafen"), z.zeit("aufwachen")
        if von is None or bis is None or bis <= von:
            hinweise.append({"datei": datei, "zeile": satz["zeile"], "text": "Einschlaf- oder Aufwachzeit fehlt oder ist unlesbar – Zeile übersprungen."})
            continue
        zone_min = z.zone_min(bis)
        basis = f"whoop:schlaf:{von}"
        d = {
            "von": von, "bis": bis, "phasen": [],
            "phasenSummen": {
                "wachMs": _min_zu_ms(z.zahl("wachMin")), "leichtMs": _min_zu_ms(z.zahl("leichtMin")),
                "tiefMs": _min_zu_ms(z.zahl("tiefMin")), "remMs": _min_zu_ms(z.zahl("remMin")),
            },
            "schlafMs": _min_zu_ms(z.zahl("schlafMin")), "imBettMs": _min_zu_ms(z.zahl("imBettMin")),
            "bedarfMs": _min_zu_ms(z.zahl("bedarfMin")), "schuldMs": _min_zu_ms(z.zahl("schuldMin")),
            "effizienzProzent": z.zahl("effizienz"), "konstanzProzent": z.zahl("konstanz"),
            "nickerchen": lese_ja_nein(z.text("nickerchen")) is True,
            "fremdwerte": {"anbieter": "whoop", "schlafLeistung": z.zahl("schlafLeistung")},
            "quelle": _quelle(datei, satz["zeile"], basis),
        }
        paket["schlaf"].append(_mit_zone(d, zone_min))
        atem = z.zahl("atem")
        if atem is not None:
            paket["atemfrequenz"].append(_mit_zone({"t": bis, "proMin": atem, "quelle": _quelle(datei, satz["zeile"], f"{basis}:atem")}, zone_min))


def _training(datei, csv, optionen, paket, hinweise):
    sp = _spalten_index(csv["kopf"])
    for satz in csv["zeilen"]:
        z = _Zeile(sp, satz, optionen)
        von, bis = z.zeit("trainingStart"), z.zeit("trainingEnde")
        dauer = _min_zu_ms(z.zahl("dauerMin"))
        if von is not None and bis is None and dauer is not None:
            bis = von + dauer
        if von is None or bis is None or bis <= von:
            hinweise.append({"datei": datei, "zeile": satz["zeile"], "text": "Trainingsbeginn oder -ende fehlt oder ist unlesbar – Zeile übersprungen."})
            continue
        name = z.text("aktivitaet") or ""
        zonen = [z.zahl(f) for f in ("zone1", "zone2", "zone3", "zone4", "zone5")]
        d = {
            "von": von, "bis": bis, "art": _aktivitaet_kuerzel(name), "name": name, "herzschlaege": [],
            "zonenProzent": None if all(x is None for x in zonen) else zonen,
            "maxPuls": z.zahl("maxPuls"), "mittelPuls": z.zahl("mittelPuls"), "energieKcal": z.zahl("energie"),
            "distanzM": z.zahl("distanz"),
            "fremdwerte": {"anbieter": "whoop", "belastung": z.zahl("trainingsbelastung")},
            "quelle": _quelle(datei, satz["zeile"], f"whoop:training:{von}"),
        }
        paket["training"].append(_mit_zone(d, z.zone_min(von)))


def _tagebuch(datei, csv, optionen, paket, hinweise):
    tage: dict[str, dict] = {}
    sp = _spalten_index(csv["kopf"])
    for satz in csv["zeilen"]:
        z = _Zeile(sp, satz, optionen)
        start = z.zeit("zyklusStart")
        frage = z.text("frage")
        if start is None or not frage:
            hinweise.append({"datei": datei, "zeile": satz["zeile"], "text": "Zyklusbeginn oder Frage fehlt – Zeile übersprungen."})
            continue
        ende = z.zeit("zyklusEnde")
        bezug = start + (ende - start) // 2 if ende is not None and ende > start else start
        tag = tag_iso(bezug, z.zone_min(bezug))
        if tag not in tage:
            tage[tag] = {"tag": tag, "eintraege": {}, "fragen": {}, "notizen": {},
                         "quelle": _quelle(datei, satz["zeile"], f"whoop:tagebuch:{tag}"), "zeilen": []}
        e = tage[tag]
        k = frage_schluessel(frage)
        ja = lese_ja_nein(z.text("antwort"))
        if ja is not None:
            e["eintraege"][k] = ja
        else:
            n = lese_zahl(z.text("antwort"))
            if n is not None:
                e["eintraege"][k] = n
        e["fragen"][k] = frage
        notiz = z.text("notiz")
        if notiz:
            e["notizen"][k] = notiz
        e["zeilen"].append(satz["zeile"])
    paket["tagebuch"].extend(tage.values())


def wie_js(wert):
    """Ganze Gleitkommazahlen → int (JSON wie JSON.stringify in der App)."""
    if isinstance(wert, float) and wert.is_integer() and abs(wert) < 2 ** 53:
        return int(wert)
    if isinstance(wert, dict):
        return {k: wie_js(v) for k, v in wert.items()}
    if isinstance(wert, list):
        return [wie_js(v) for v in wert]
    return wert


def importiere_whoop(dateien, optionen=None) -> dict:
    """dateien = [{name, text}] → {paket, hinweise, dateien: [{name, art, zeilen}]} (wie importiereWhoop)."""
    optionen = optionen or {}
    paket, hinweise, uebersicht = leeres_paket(), [], []
    for datei in dateien:
        name = re.split(r"[\\/]", str(datei.get("name") or ""))[-1]
        csv = parse_csv(datei.get("text"))
        art = erkenne_datei(name, csv["kopf"])
        uebersicht.append({"name": name, "art": art, "zeilen": len(csv["zeilen"])})
        if not art:
            hinweise.append({"datei": name, "zeile": 1, "text": "Datei nicht erkannt – nicht importiert."})
            continue
        {"zyklen": _zyklen, "schlaf": _schlaf, "training": _training, "tagebuch": _tagebuch}[art](name, csv, optionen, paket, hinweise)
    return {"paket": wie_js(paket), "hinweise": hinweise, "dateien": uebersicht}


def texte_aus_datei(name: str, daten: bytes) -> list[dict]:
    """Eine Datei (CSV oder ZIP des WHOOP-Exports) → [{name, text}]; ZIPs werden entpackt (nur .csv)."""
    if name.lower().endswith(".zip") or daten[:4] == b"PK\x03\x04":
        aus = []
        with zipfile.ZipFile(io.BytesIO(daten)) as z:
            for info in z.infolist():
                if info.is_dir() or not info.filename.lower().endswith(".csv"):
                    continue
                aus.append({"name": info.filename, "text": z.read(info).decode("utf-8", errors="replace")})
        return aus
    return [{"name": name, "text": daten.decode("utf-8", errors="replace")}]
