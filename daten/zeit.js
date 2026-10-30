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
export function tagIso(t, zoneMin) {
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
export function zeitMs(wert) {
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
export function zoneZuMinuten(zone, felder) {
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
export function leseZeit(text, zone) {
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
export function versatzFuer(zone, utcMs) {
  if (zone === null || zone === undefined || zone === "") return null;
  const fest = zoneZuMinuten(zone);
  if (fest !== null) return fest;
  return ianaVersatz(String(zone).trim(), utcMs);
}
