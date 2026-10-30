// Abgleich Handy → Rechner im Heimnetz (docs/technik/sync.md).
//
// Kernaussage: Das Handy schickt seine neuen Messwerte an den MAEHR-FIT-Dienst auf dem Rechner (desktop/mf_dienst.py), aber nur,
// wenn beide vorher gekoppelt wurden. Beim Koppeln zeigt der Rechner einen QR-Code mit einem geheimen Schlüssel; mit ihm
// unterschreibt das Handy jede Sendung, und der Rechner nimmt nur unterschriebene, frische Sendungen an. Kann der Rechner
// verschlüsseln, wird der Inhalt zusätzlich verschlüsselt. Nichts verlässt das Heimnetz.
//
// Aufbau: Der obere Teil ist rein (SHA-256, HMAC, Unterschrift, Kopplungscode, Auswahl der Änderungen) und ohne Netz testbar
// (tests/node/daten_sync.test.mjs gegen daten/fixtures/sync_interop.json, erzeugt von der Python-Seite). Der untere Teil
// spricht über ein hereingereichtes `fetch` mit dem Rechner.
//
//   syncEinrichten(qrText, { speicher, fetch?, jetzt?, name? })  → { geraet, host, port, verschluesselung, fingerabdruck }
//   syncJetzt({ speicher, fetch?, jetzt?, warte?, subtle? })     → { gesendet, neu, ersetzt, stapel, verschluesselt, zeit }
//   syncStatus({ speicher })                                     → { gekoppelt, geraet, host, port, zuletzt, neu, gesendet, … }
//   syncEntkoppeln({ speicher, fetch? })                         → { entfernt, rechnerBestaetigt }
//   mfxErstellen(inhalt, passwort, …) / mfxLesen(text, passwort, …)  verschlüsselte Export-Datei für den Ordner-Weg
//
// Speicher-Schlüssel: "sync:kopplung" (Rechner, Gerät, Schlüssel) und "sync:stand" (Fingerabdrücke der gesendeten Tage, letzter Lauf).

export const PROTOKOLL = 1;
export const KOPPEL_PRAEFIX = "MF-KOPPLUNG:";
export const SCHLUESSEL_KOPPLUNG = "sync:kopplung";
export const SCHLUESSEL_STAND = "sync:stand";
export const MAX_STAPEL = 500;               // höchstens 500 Messwerte je Sendung (wie MAX_STAPEL in desktop/mf_dienst.py)
export const VERSUCHE = 3;                   // je Stapel: erster Versuch + zwei Wiederholungen
export const WARTEN_MS = [1000, 4000];       // Pause vor der 2. und 3. Wiederholung
export const ZEITLIMIT_MS = 15000;
export const PBKDF2_ITERATIONEN = 600000;    // OWASP Password Storage Cheat Sheet (2023): PBKDF2-HMAC-SHA256 ≥ 600 000
export const MFX_FORMAT = "maehr-fit-mfx";
const INFO_VERSCHLUESSELUNG = "mf-verschluesselung";
const AAD_MFX = "maehr-fit-mfx:1";

// ===============================================================================================
// Bytes, Hex, Base64url, UTF-8
// ===============================================================================================

export const utf8 = (text) => new TextEncoder().encode(String(text));
export const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
export function b64url(bytes) {
  let aus = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    aus += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) aus += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) aus += B64[n & 63];
  }
  return aus;
}
export function ausB64url(text) {
  const s = String(text).trim().replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const aus = new Uint8Array(Math.floor((s.length * 3) / 4));
  let bits = 0, puffer = 0, j = 0;
  for (const c of s) {
    const w = B64.indexOf(c);
    if (w < 0) throw new Error("Base64url: ungültiges Zeichen");
    puffer = (puffer << 6) | w; bits += 6;
    if (bits >= 8) { bits -= 8; aus[j++] = (puffer >> bits) & 255; }
  }
  return aus.subarray(0, j);
}

// ===============================================================================================
// SHA-256 und HMAC-SHA256 (FIPS 180-4, RFC 2104) – ohne WebCrypto, damit die Unterschrift überall gleich und testbar ist
// ===============================================================================================

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 über Bytes (oder Text, dann UTF-8). → Uint8Array(32) */
export function sha256(eingabe) {
  const daten = typeof eingabe === "string" ? utf8(eingabe) : eingabe;
  const laenge = daten.length;
  const bloecke = Math.ceil((laenge + 9) / 64);
  const m = new Uint8Array(bloecke * 64);
  m.set(daten);
  m[laenge] = 0x80;
  const bits = laenge * 8;
  const ansicht = new DataView(m.buffer);
  ansicht.setUint32(m.length - 8, Math.floor(bits / 0x100000000));
  ansicht.setUint32(m.length - 4, bits >>> 0);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let b = 0; b < bloecke; b++) {
    for (let i = 0; i < 16; i++) w[i] = ansicht.getUint32(b * 64 + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += bb; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const aus = new Uint8Array(32);
  const av = new DataView(aus.buffer);
  for (let i = 0; i < 8; i++) av.setUint32(i * 4, h[i]);
  return aus;
}

/** HMAC-SHA256(schluessel, nachricht). → Uint8Array(32) */
export function hmacSha256(schluessel, nachricht) {
  let k = typeof schluessel === "string" ? utf8(schluessel) : schluessel;
  if (k.length > 64) k = sha256(k);
  const innen = new Uint8Array(64), aussen = new Uint8Array(64);
  for (let i = 0; i < 64; i++) { innen[i] = (k[i] ?? 0) ^ 0x36; aussen[i] = (k[i] ?? 0) ^ 0x5c; }
  const n = typeof nachricht === "string" ? utf8(nachricht) : nachricht;
  const a = new Uint8Array(64 + n.length); a.set(innen); a.set(n, 64);
  const b = new Uint8Array(96); b.set(aussen); b.set(sha256(a), 64);
  return sha256(b);
}

// ===============================================================================================
// Unterschrift (gleich wie kanonisch()/signatur() in desktop/mf_dienst.py)
// ===============================================================================================

/** METHODE \n Pfad (mit ?Abfrage) \n Zeit (Unix-ms) \n SHA-256(Körper) als Hex */
export function kanonisch(methode, pfad, zeit, koerper = "") {
  const k = typeof koerper === "string" ? utf8(koerper) : koerper;
  return `${String(methode).toUpperCase()}\n${pfad}\n${zeit}\n${hex(sha256(k))}`;
}

/** X-MF-Signatur = HMAC-SHA256(Schlüssel, kanonisch(…)) als Hex in Kleinbuchstaben. */
export function signatur(schluessel, methode, pfad, zeit, koerper = "") {
  return hex(hmacSha256(schluessel, kanonisch(methode, pfad, zeit, koerper)));
}

/** Die drei Kopfzeilen einer unterschriebenen Anfrage. */
export function signaturKopf({ geraet, schluessel, methode, pfad, zeit, koerper = "" }) {
  return { "X-MF-Geraet": geraet, "X-MF-Zeit": String(zeit), "X-MF-Signatur": signatur(schluessel, methode, pfad, zeit, koerper) };
}

/** Eigener Schlüssel für die Verschlüsselung (nie derselbe Schlüssel für Unterschrift und Verschlüsselung). */
export const aesRoh = (schluessel) => hmacSha256(schluessel, INFO_VERSCHLUESSELUNG);
export const aadSync = (geraet, zeit) => utf8(`${geraet}\n${zeit}`);
/** Kurzer Fingerabdruck des Schlüssels (8 Zeichen), steht auch am Rechner in der Geräteliste. */
export const fingerabdruck = (schluessel) => hex(sha256(schluessel)).slice(0, 8);

// ===============================================================================================
// Kopplungscode (QR-Inhalt)
// ===============================================================================================

/**
 * „MF-KOPPLUNG:<base64url(JSON)>“ lesen und prüfen. JSON: { v, host, port, geraet_id, schluessel, ablauf, name }.
 * @returns {{ host, port, geraet, schluessel: string, ablauf, name }}
 */
export function kopplungLesen(text, jetzt = Date.now()) {
  const roh = String(text ?? "").trim();
  if (!roh.startsWith(KOPPEL_PRAEFIX)) throw new Error("Das ist kein Kopplungscode von MAEHR FIT.");
  let obj;
  try { obj = JSON.parse(new TextDecoder().decode(ausB64url(roh.slice(KOPPEL_PRAEFIX.length)))); } catch { throw new Error("Der Kopplungscode ist beschädigt."); }
  if (obj.v !== PROTOKOLL) throw new Error("Der Kopplungscode stammt von einer anderen Version.");
  const port = Number(obj.port);
  if (typeof obj.host !== "string" || !/^[A-Za-z0-9.:\-[\]]+$/.test(obj.host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Im Kopplungscode fehlt die Adresse des Rechners.");
  }
  if (typeof obj.geraet_id !== "string" || !obj.geraet_id || ausB64url(obj.schluessel || "").length !== 32) {
    throw new Error("Im Kopplungscode fehlt der Schlüssel.");
  }
  if (!Number.isFinite(obj.ablauf) || jetzt > obj.ablauf) throw new Error("Der Kopplungscode ist abgelaufen. Bitte am Rechner einen neuen erzeugen.");
  return { host: obj.host, port, geraet: obj.geraet_id, schluessel: obj.schluessel, ablauf: obj.ablauf, name: obj.name || "" };
}

/** Adresse des Rechners im Heimnetz, aus dem Kopplungscode (keine feste Adresse im Code). */
export function basisAdresse(host, port) {
  const u = new URL("http:rechner");
  u.hostname = host;
  u.port = String(port);
  return u.origin;
}

// ===============================================================================================
// Was ist neu? (rein, mit eingereichtem Speicher)
// ===============================================================================================

/** Fingerabdruck eines Speicherwerts (Liste der Messwerte eines Tages). */
export const abdruck = (wert) => hex(sha256(JSON.stringify(wert ?? null))).slice(0, 32);

/** Liste in Stapel zu höchstens n Einträgen. */
export function stapeln(liste, n = MAX_STAPEL) {
  const aus = [];
  for (let i = 0; i < liste.length; i += n) aus.push(liste.slice(i, i + n));
  return aus;
}

/**
 * Tage, deren Messwerte sich seit dem letzten Abgleich geändert haben (Fingerabdruck je Schlüssel „messung:<art>:<tag>“).
 * @returns {Promise<{ messungen: {art, tag, daten}[], abdruecke: Object<string,string>, tage: number }>}
 */
export async function aenderungen(speicher, stand = {}) {
  const alt = stand.abdruecke || {};
  const abdruecke = {}, messungen = [];
  let tage = 0;
  for (const k of (await speicher.liste("messung:")).sort()) {
    const [, art, tag] = k.split(":");
    const wert = await speicher.lies(k);
    if (!Array.isArray(wert)) continue;
    const a = abdruck(wert);
    abdruecke[k] = a;
    if (alt[k] === a) continue;
    tage += 1;
    for (const daten of wert) messungen.push({ art, tag, daten });
  }
  return { messungen, abdruecke, tage };
}

// ===============================================================================================
// AES-GCM über WebCrypto (Sendung und .mfx-Datei)
// ===============================================================================================

const subtleVon = (s) => s || globalThis.crypto?.subtle || null;
const zufall = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export async function verschluesseln(subtle, roh, klartext, iv, aad) {
  const k = await subtle.importKey("raw", roh, { name: "AES-GCM" }, false, ["encrypt"]);
  const c = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, k, klartext));
  return { iv: b64url(iv), daten: b64url(c) };
}
export async function entschluesseln(subtle, roh, { iv, daten }, aad) {
  const k = await subtle.importKey("raw", roh, { name: "AES-GCM" }, false, ["decrypt"]);
  return new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: ausB64url(iv), additionalData: aad }, k, ausB64url(daten)));
}

async function pbkdf2(subtle, passwort, salz, iterationen) {
  const basis = await subtle.importKey("raw", utf8(passwort), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salz, iterations: iterationen }, basis, 256));
}

/** Verschlüsselte Export-Datei (.mfx) für den geteilten Ordner: PBKDF2-HMAC-SHA256 → AES-256-GCM (docs/technik/sync.md). */
export async function mfxErstellen(inhalt, passwort, { subtle, iterationen = PBKDF2_ITERATIONEN, salz = zufall(16), iv = zufall(12) } = {}) {
  const s = subtleVon(subtle);
  if (!s) throw new Error("Dieses Gerät kann nicht verschlüsseln (WebCrypto fehlt).");
  if (!passwort || String(passwort).length < 8) throw new Error("Das Passwort braucht mindestens 8 Zeichen.");
  const roh = await pbkdf2(s, passwort, salz, iterationen);
  const c = await verschluesseln(s, roh, utf8(JSON.stringify(inhalt)), iv, utf8(AAD_MFX));
  return JSON.stringify({ format: MFX_FORMAT, version: 1, kdf: { name: "PBKDF2", hash: "SHA-256", iterationen, salz: b64url(salz) }, chiffre: { name: "AES-GCM", iv: c.iv }, daten: c.daten });
}

export async function mfxLesen(text, passwort, { subtle } = {}) {
  const s = subtleVon(subtle);
  const obj = JSON.parse(text);
  if (obj.format !== MFX_FORMAT || obj.version !== 1) throw new Error("Keine MAEHR-FIT-Exportdatei (.mfx).");
  const roh = await pbkdf2(s, passwort, ausB64url(obj.kdf.salz), obj.kdf.iterationen);
  try {
    return JSON.parse(new TextDecoder().decode(await entschluesseln(s, roh, { iv: obj.chiffre.iv, daten: obj.daten }, utf8(AAD_MFX))));
  } catch { throw new Error("Passwort falsch oder Datei beschädigt."); }
}

/** Inhalt für die .mfx-Datei: alle Messwerte und eigenen Tagebucheinträge (Format wie daten/verbinden.js exportieren()). */
export async function exportInhalt(speicher, jetzt = Date.now()) {
  const eintraege = {};
  for (const p of ["messung:", "tagebuch:"]) {
    for (const k of (await speicher.liste(p)).sort()) { const w = await speicher.lies(k); if (w !== null && w !== undefined) eintraege[k] = w; }
  }
  return { format: "maehr-fit-export", version: 1, erstelltMs: jetzt, eintraege };
}

// ===============================================================================================
// Mit dem Rechner sprechen
// ===============================================================================================

export class SyncFehler extends Error {
  constructor(text, { status = 0, grund = "", wiederholbar = false } = {}) { super(text); this.status = status; this.grund = grund; this.wiederholbar = wiederholbar; }
}

const holeFetch = (f) => f || globalThis.fetch?.bind(globalThis);

async function anfrage(fetchFn, url, init) {
  const ab = typeof AbortController === "function" ? new AbortController() : null;
  const uhr = ab ? setTimeout(() => ab.abort(), ZEITLIMIT_MS) : null;
  let antwort;
  try {
    antwort = await fetchFn(url, { ...init, ...(ab ? { signal: ab.signal } : {}) });
  } catch (e) {
    throw new SyncFehler("Der Rechner ist nicht erreichbar. Läuft MAEHR FIT dort, und ist das Handy im selben WLAN?", { wiederholbar: true, grund: "netz" });
  } finally { if (uhr) clearTimeout(uhr); }
  let obj = null;
  try { obj = await antwort.json(); } catch { obj = null; }
  if (!antwort.ok) {
    const grund = obj?.grund || "";
    throw new SyncFehler(obj?.text || `Der Rechner antwortet mit Fehler ${antwort.status}.`, { status: antwort.status, grund, wiederholbar: antwort.status >= 500 || antwort.status === 409 });
  }
  return obj;
}

/** Unterschriebene Anfrage; bei Netzfehler, 5xx oder „wiederholt“ (409) neu unterschrieben bis zu VERSUCHE-mal. */
async function signiert({ fetchFn, kopplung, methode, pfad, koerperFn, jetzt, warte }) {
  const schluessel = ausB64url(kopplung.schluessel);
  let letzter;
  for (let v = 0; v < VERSUCHE; v++) {
    if (v > 0) await warte(WARTEN_MS[v - 1] ?? WARTEN_MS.at(-1));
    const zeit = jetzt();
    const koerper = koerperFn ? await koerperFn(zeit) : "";
    const kopf = { ...signaturKopf({ geraet: kopplung.geraet, schluessel, methode, pfad, zeit, koerper }), ...(koerper ? { "Content-Type": "application/json" } : {}) };
    try {
      return await anfrage(fetchFn, basisAdresse(kopplung.host, kopplung.port) + pfad, { method: methode, headers: kopf, ...(koerper ? { body: koerper } : {}) });
    } catch (e) {
      letzter = e;
      if (!e.wiederholbar) throw e;
    }
  }
  throw letzter;
}

/**
 * Mit dem Rechner koppeln: Code prüfen, beim Rechner melden (bestätigt die Kopplung innerhalb der 10 Minuten), Schlüssel ablegen.
 */
export async function syncEinrichten(qrText, { speicher = globalThis.MF?.speicher, fetch, jetzt = () => Date.now(), name = "Handy", warte = pause } = {}) {
  if (!speicher) throw new Error("syncEinrichten: speicher fehlt.");
  const k = kopplungLesen(qrText, jetzt());
  const fetchFn = holeFetch(fetch);
  const status = await anfrage(fetchFn, basisAdresse(k.host, k.port) + "/api/status", { method: "GET" });
  if (status?.app !== "maehr-fit-dienst") throw new Error("Unter dieser Adresse antwortet kein MAEHR-FIT-Dienst.");
  const kopplung = { host: k.host, port: k.port, geraet: k.geraet, schluessel: k.schluessel, name: k.name || name, eingerichtet: jetzt() };
  await signiert({ fetchFn, kopplung, methode: "POST", pfad: "/api/sync", koerperFn: async () => JSON.stringify({ messungen: [] }), jetzt, warte });
  await speicher.schreib(SCHLUESSEL_KOPPLUNG, kopplung);
  await speicher.schreib(SCHLUESSEL_STAND, { abdruecke: {}, letzter: null, geraet: k.geraet });
  return { geraet: k.geraet, host: k.host, port: k.port, verschluesselung: (status.verschluesselung || []).includes("aes-256-gcm"), fingerabdruck: fingerabdruck(ausB64url(k.schluessel)) };
}

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Neue und geänderte Messwerte an den Rechner schicken (Stapel ≤ 500). Der Stand wird erst nach dem letzten Stapel gesetzt;
 * bricht etwas ab, schickt der nächste Lauf dieselben Tage noch einmal (der Rechner erkennt Doppelte an quelle.id).
 */
export async function syncJetzt({ speicher = globalThis.MF?.speicher, fetch, jetzt = () => Date.now(), warte = pause, subtle, stapelGroesse = MAX_STAPEL } = {}) {
  if (!speicher) throw new Error("syncJetzt: speicher fehlt.");
  const kopplung = await speicher.lies(SCHLUESSEL_KOPPLUNG);
  if (!kopplung) throw new SyncFehler("Noch nicht mit einem Rechner gekoppelt.", { grund: "nicht_gekoppelt" });
  const fetchFn = holeFetch(fetch);
  const beginn = jetzt();
  const stand = (await speicher.lies(SCHLUESSEL_STAND)) || {};
  try {
    const status = await anfrage(fetchFn, basisAdresse(kopplung.host, kopplung.port) + "/api/status", { method: "GET" });
    const s = subtleVon(subtle);
    const rechnerKann = (status?.verschluesselung || []).includes("aes-256-gcm");
    const verschluesselt = !!s && rechnerKann;
    // Warum nur unterschrieben? „rechner“: dort fehlt cryptography; „geraet“: hier kein WebCrypto (z. B. Seite über http im WLAN geöffnet)
    const ohneGrund = verschluesselt ? null : rechnerKann ? "geraet" : "rechner";
    const { messungen, abdruecke, tage } = await aenderungen(speicher, stand);
    const schluessel = ausB64url(kopplung.schluessel);
    const roh = verschluesselt ? aesRoh(schluessel) : null;
    let neu = 0, ersetzt = 0, ungueltig = 0;
    const stapel = stapeln(messungen, Math.min(stapelGroesse, status?.max_stapel || MAX_STAPEL));
    for (const teil of stapel) {
      const klartext = JSON.stringify({ messungen: teil });
      const koerperFn = verschluesselt
        ? async (zeit) => JSON.stringify(await verschluesseln(s, roh, utf8(klartext), zufall(12), aadSync(kopplung.geraet, zeit)))
        : async () => klartext;
      const r = await signiert({ fetchFn, kopplung, methode: "POST", pfad: "/api/sync", koerperFn, jetzt, warte });
      neu += r.neu || 0; ersetzt += r.ersetzt || 0; ungueltig += r.ungueltig || 0;
    }
    const letzter = { zeit: jetzt(), gesendet: messungen.length, tage, neu, ersetzt, ungueltig, stapel: stapel.length, verschluesselt, ohneVerschluesselung: ohneGrund, dauerMs: jetzt() - beginn };
    await speicher.schreib(SCHLUESSEL_STAND, { ...stand, abdruecke, letzter, fehler: null, geraet: kopplung.geraet });
    return letzter;
  } catch (e) {
    await speicher.schreib(SCHLUESSEL_STAND, { ...stand, fehler: { zeit: jetzt(), text: String(e.message || e), grund: e.grund || "" } });
    throw e;
  }
}

/** Zustand für die Sync-Ansicht (ohne Netz). */
export async function syncStatus({ speicher = globalThis.MF?.speicher } = {}) {
  const kopplung = speicher ? await speicher.lies(SCHLUESSEL_KOPPLUNG) : null;
  const stand = (speicher && (await speicher.lies(SCHLUESSEL_STAND))) || {};
  if (!kopplung) return { gekoppelt: false };
  return {
    gekoppelt: true, geraet: kopplung.geraet, name: kopplung.name, host: kopplung.host, port: kopplung.port, eingerichtet: kopplung.eingerichtet,
    fingerabdruck: fingerabdruck(ausB64url(kopplung.schluessel)),
    zuletzt: stand.letzter?.zeit ?? null, neu: stand.letzter?.neu ?? null, gesendet: stand.letzter?.gesendet ?? null,
    ersetzt: stand.letzter?.ersetzt ?? null, verschluesselt: stand.letzter?.verschluesselt ?? null,
    ohneVerschluesselung: stand.letzter?.ohneVerschluesselung ?? null, fehler: stand.fehler || null,
  };
}

/** Kopplung lösen: beim Rechner abmelden (wenn erreichbar), dann Schlüssel löschen. */
export async function syncEntkoppeln({ speicher = globalThis.MF?.speicher, fetch, jetzt = () => Date.now(), warte = pause } = {}) {
  const kopplung = await speicher.lies(SCHLUESSEL_KOPPLUNG);
  if (!kopplung) return { entfernt: false, rechnerBestaetigt: false };
  let rechnerBestaetigt = false;
  try { await signiert({ fetchFn: holeFetch(fetch), kopplung, methode: "DELETE", pfad: "/api/geraet", jetzt, warte: async () => {} }); rechnerBestaetigt = true; } catch { /* Rechner aus: trotzdem lösen */ }
  await speicher.schreib(SCHLUESSEL_KOPPLUNG, null);
  await speicher.schreib(SCHLUESSEL_STAND, null);
  return { entfernt: true, rechnerBestaetigt };
}
