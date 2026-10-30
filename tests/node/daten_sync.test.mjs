// tests/node/daten_sync.test.mjs – Abgleich Handy → Rechner (daten/sync.js), Speicher über den Dienst (shell/speicher_server.js),
// Sync-Ansicht (shell/apps/sync.js) und Gleichlauf des WHOOP-Imports mit desktop/whoop_csv.py.
// Kernaussage: Das Handy rechnet Unterschrift, Kopplungscode und Verschlüsselung Byte für Byte wie der Rechner (Vergleich mit
// daten/fixtures/sync_interop.json, erzeugt von der Python-Seite), schickt nur geänderte Tage in Stapeln zu höchstens 500,
// wiederholt bei Netzfehlern mit neuer Unterschrift und gibt bei falscher Unterschrift sofort auf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../../daten/sync.js";
import { speicherMap, istSpeicher } from "../../kern/speicher.js";
import { speicherServer, ausDienst, dienstToken } from "../../shell/speicher_server.js";
import * as syncSicht from "../../shell/apps/sync.js";
import { neuesRegister } from "../../shell/ui.js";
import { setzeSprache } from "../../shell/i18n/i18n.js";
import { erwartet } from "./whoop_erwartet_erzeugen.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
const F = JSON.parse(readFileSync(join(WURZEL, "daten/fixtures/sync_interop.json"), "utf8"));
const subtle = globalThis.crypto.subtle;

// ------------------------------------------------------------------------------------------------ SHA-256, HMAC, Base64url
test("SHA-256 und HMAC wie node:crypto (0–200 Bytes, 1 MB, Schlüssel länger als 64 Bytes)", () => {
  for (let n = 0; n <= 200; n++) {
    const b = randomBytes(n);
    assert.equal(S.hex(S.sha256(new Uint8Array(b))), createHash("sha256").update(b).digest("hex"), `Länge ${n}`);
  }
  const gross = randomBytes(1 << 20);
  assert.equal(S.hex(S.sha256(new Uint8Array(gross))), createHash("sha256").update(gross).digest("hex"));
  for (const kl of [0, 1, 32, 64, 65, 131]) {
    const k = randomBytes(kl), m = randomBytes(77);
    assert.equal(S.hex(S.hmacSha256(new Uint8Array(k), new Uint8Array(m))), createHmac("sha256", k).update(m).digest("hex"), `Schlüssel ${kl}`);
  }
  // Leerer Text: SHA-256("") = e3b0c442…b855 (FIPS 180-4, bekannter Wert)
  assert.equal(S.hex(S.sha256("")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("HMAC: RFC 4231 Testfall 2 (wie Python)", () => {
  const f = F.hmac_rfc4231_fall2;
  assert.equal(S.hex(S.hmacSha256(f.schluessel, f.nachricht)), f.hmac);
});

test("Base64url hin und zurück wie Buffer", () => {
  for (let n = 0; n < 70; n++) {
    const b = randomBytes(n);
    assert.equal(S.b64url(new Uint8Array(b)), b.toString("base64url"));
    assert.deepEqual(Buffer.from(S.ausB64url(b.toString("base64url"))), b);
  }
  assert.throws(() => S.ausB64url("ab!c"), /ungültiges Zeichen/);
});

// ------------------------------------------------------------------------------------------------ Gleichlauf mit Python
test("Unterschrift: kanonischer Text und HMAC gleich wie desktop/mf_dienst.py", () => {
  const s = F.signatur, k = S.ausB64url(s.schluessel_b64url);
  assert.equal(k.length, 32);
  assert.equal(S.kanonisch(s.methode, s.pfad, s.zeit, s.koerper), s.kanonisch);
  assert.equal(S.signatur(k, s.methode, s.pfad, s.zeit, s.koerper), s.signatur);
  assert.equal(S.signatur(k, "GET", "/api/messungen?seit=1793350000000&art=hrv", s.zeit, ""), s.signatur_leer_get);
  assert.deepEqual(S.signaturKopf({ geraet: s.geraet, schluessel: k, methode: "POST", pfad: s.pfad, zeit: Number(s.zeit), koerper: s.koerper }),
    { "X-MF-Geraet": s.geraet, "X-MF-Zeit": s.zeit, "X-MF-Signatur": s.signatur });
  assert.equal(S.hex(S.aesRoh(k)), F.aes_schluessel_hex);
  // Ein Bit im Körper anders → andere Unterschrift
  assert.notEqual(S.signatur(k, s.methode, s.pfad, s.zeit, s.koerper.replace("52", "53")), s.signatur);
});

test("Kopplungscode des Rechners lesen; abgelaufen, fremd, beschädigt", () => {
  const k = S.kopplungLesen(F.kopplung.text, F.kopplung.ablauf - 1);
  assert.deepEqual({ host: k.host, port: k.port, geraet: k.geraet, name: k.name }, { host: "192.168.178.20", port: 8765, geraet: "g0123456789ab", name: "Handy" });
  assert.equal(S.fingerabdruck(S.ausB64url(k.schluessel)), F.kopplung.fingerabdruck);
  assert.equal(S.basisAdresse(k.host, k.port), "http://192.168.178.20:8765");
  assert.throws(() => S.kopplungLesen(F.kopplung.text, F.kopplung.ablauf + 1), /abgelaufen/);
  assert.throws(() => S.kopplungLesen("hallo"), /kein Kopplungscode/);
  assert.throws(() => S.kopplungLesen("MF-KOPPLUNG:%%%"), /beschädigt/);
  const fremd = S.KOPPEL_PRAEFIX + S.b64url(S.utf8(JSON.stringify({ v: 1, host: "a b", port: 1, geraet_id: "g", schluessel: "", ablauf: 9e15 })));
  assert.throws(() => S.kopplungLesen(fremd), /Adresse/);
});

test("AES-GCM-Sendung und .mfx-Datei gleich wie Python (beide Richtungen)", { skip: !F.sync_verschluesselt && "Fixture ohne Verschlüsselung" }, async () => {
  const s = F.signatur, v = F.sync_verschluesselt, k = S.ausB64url(s.schluessel_b64url);
  const ich = await S.verschluesseln(subtle, S.aesRoh(k), S.utf8(s.koerper), S.ausB64url(v.iv_b64url), S.aadSync(s.geraet, s.zeit));
  assert.deepEqual(ich, { iv: v.iv, daten: v.daten });
  assert.equal(new TextDecoder().decode(await S.entschluesseln(subtle, S.aesRoh(k), v, S.aadSync(s.geraet, s.zeit))), s.koerper);
  const m = F.mfx;
  assert.deepEqual(await S.mfxLesen(m.datei, m.passwort), m.inhalt);
  const meine = JSON.parse(await S.mfxErstellen(m.inhalt, m.passwort, { iterationen: m.iterationen, salz: S.ausB64url(m.salz_b64url), iv: S.ausB64url(m.iv_b64url) }));
  assert.deepEqual(meine, JSON.parse(m.datei));
  await assert.rejects(S.mfxLesen(m.datei, "falsch-falsch"), /Passwort falsch/);
  await assert.rejects(S.mfxErstellen({}, "kurz"), /8 Zeichen/);
});

test("WHOOP-Import der App unverändert (desktop/whoop_csv.py rechnet gegen daten/fixtures/whoop_erwartet.json)", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(erwartet())), JSON.parse(readFileSync(join(WURZEL, "daten/fixtures/whoop_erwartet.json"), "utf8")),
    "neu erzeugen: node tests/node/whoop_erwartet_erzeugen.mjs, dann python3 -m pytest tests/python");
});

// ------------------------------------------------------------------------------------------------ Was ist neu, Stapel
test("aenderungen(): nur Tage mit neuem Fingerabdruck; stapeln(): 1 200 → 500 + 500 + 200", async () => {
  const sp = speicherMap({
    "messung:hrv:2026-10-29": [{ t: 1, rmssdMs: 50, quelle: { id: "a" } }],
    "messung:hrv:2026-10-30": [{ t: 2, rmssdMs: 51, quelle: { id: "b" } }, { t: 3, rmssdMs: 52, quelle: { id: "c" } }],
    "tagebuch:2026-10-30": { tag: "2026-10-30", eintraege: {} },
  });
  const erst = await S.aenderungen(sp, {});
  assert.equal(erst.messungen.length, 3);
  assert.equal(erst.tage, 2);
  assert.deepEqual(erst.messungen[0], { art: "hrv", tag: "2026-10-29", daten: { t: 1, rmssdMs: 50, quelle: { id: "a" } } });
  const dann = await S.aenderungen(sp, { abdruecke: { "messung:hrv:2026-10-29": erst.abdruecke["messung:hrv:2026-10-29"] } });
  assert.deepEqual(dann.messungen.map((m) => m.daten.quelle.id), ["b", "c"]);
  assert.deepEqual(S.stapeln(Array.from({ length: 1200 }, (_, i) => i)).map((s) => s.length), [500, 500, 200]);
  assert.deepEqual(S.stapeln([]), []);
});

// ------------------------------------------------------------------------------------------------ Gespräch mit dem Rechner (gespielt)
const KOPPLUNG = { host: "192.168.178.20", port: 8765, geraet: F.signatur.geraet, schluessel: F.signatur.schluessel_b64url, name: "Handy" };

/** Gespielter Rechner: prüft jede Unterschrift mit daten/sync.js selbst, antwortet nach Plan. */
function rechner(plan = []) {
  const anfragen = [];
  const fetch = async (url, init = {}) => {
    const u = new URL(url), pfad = u.pathname + u.search, kopf = init.headers || {};
    anfragen.push({ pfad, methode: init.method, kopf, koerper: init.body || "" });
    if (pfad === "/api/status") return antwort(200, { app: "maehr-fit-dienst", protokoll: 1, verschluesselung: [], max_stapel: 500 });
    const soll = S.signatur(S.ausB64url(KOPPLUNG.schluessel), init.method, pfad, kopf["X-MF-Zeit"], init.body || "");
    assert.equal(kopf["X-MF-Signatur"], soll, "Unterschrift stimmt");
    const schritt = plan.shift();
    if (schritt === "netz") throw new TypeError("Failed to fetch");
    if (typeof schritt === "number") return antwort(schritt, { ok: false, grund: schritt === 409 ? "wiederholt" : "x", text: `Fehler ${schritt}` });
    const n = JSON.parse(init.body || "{}").messungen?.length || 0;
    return antwort(200, { ok: true, neu: n, ersetzt: 0, ungueltig: 0 });
  };
  return { fetch, anfragen };
}
const antwort = (status, obj) => ({ ok: status >= 200 && status < 300, status, json: async () => obj });

async function handyMit(n) {
  const sp = speicherMap({ [S.SCHLUESSEL_KOPPLUNG]: KOPPLUNG });
  await sp.schreib("messung:herzschlag:2026-10-30", Array.from({ length: n }, (_, i) => ({ t: 1793340000000 + i * 1000, bpm: 60, quelle: { id: `h${i}` } })));
  return sp;
}

test("syncJetzt: 1 001 Messwerte in drei Stapeln, Stand danach, zweiter Lauf schickt nichts", async () => {
  let uhr = 1793350800000;
  const sp = await handyMit(1001), r = rechner();
  const e = await S.syncJetzt({ speicher: sp, fetch: r.fetch, jetzt: () => uhr++, warte: async () => {} });
  assert.deepEqual([e.gesendet, e.stapel, e.neu, e.verschluesselt, e.ohneVerschluesselung], [1001, 3, 1001, false, "rechner"]);
  const posts = r.anfragen.filter((a) => a.methode === "POST");
  assert.deepEqual(posts.map((p) => JSON.parse(p.koerper).messungen.length), [500, 500, 1]);
  assert.ok(new Set(posts.map((p) => p.kopf["X-MF-Zeit"])).size === 3, "jede Sendung mit eigener Zeit");
  const zwei = await S.syncJetzt({ speicher: sp, fetch: r.fetch, jetzt: () => uhr++, warte: async () => {} });
  assert.equal(zwei.gesendet, 0);
  const st = await S.syncStatus({ speicher: sp });
  assert.equal(st.gekoppelt, true);
  assert.equal(st.gesendet, 0);
});

test("syncJetzt: Netzfehler und 500 → neu unterschrieben wiederholt; 409 ebenso; 401 sofort aufgeben, Fehler gemerkt", async () => {
  let uhr = 1793350800000;
  const warte = [];
  const sp = await handyMit(3);
  const r = rechner(["netz", 500]);
  const e = await S.syncJetzt({ speicher: sp, fetch: r.fetch, jetzt: () => uhr++, warte: async (ms) => warte.push(ms) });
  assert.equal(e.gesendet, 3);
  assert.deepEqual(warte, S.WARTEN_MS);
  const zeiten = r.anfragen.filter((a) => a.methode === "POST").map((a) => a.kopf["X-MF-Zeit"]);
  assert.equal(new Set(zeiten).size, 3, "drei Versuche, drei Unterschriften");

  const sp2 = await handyMit(3), r2 = rechner([409]);
  assert.equal((await S.syncJetzt({ speicher: sp2, fetch: r2.fetch, jetzt: () => uhr++, warte: async () => {} })).gesendet, 3);

  const sp3 = await handyMit(3), r3 = rechner([401, 200]);
  await assert.rejects(S.syncJetzt({ speicher: sp3, fetch: r3.fetch, jetzt: () => uhr++, warte: async () => {} }), /Fehler 401/);
  assert.equal(r3.anfragen.filter((a) => a.methode === "POST").length, 1, "kein zweiter Versuch");
  const st = await S.syncStatus({ speicher: sp3 });
  assert.match(st.fehler.text, /401/);
  assert.equal(st.zuletzt, null, "nichts als erledigt gemerkt");

  const sp4 = await handyMit(3), r4 = rechner(["netz", "netz", "netz"]);
  await assert.rejects(S.syncJetzt({ speicher: sp4, fetch: r4.fetch, jetzt: () => uhr++, warte: async () => {} }), /nicht erreichbar/);
});

test("syncJetzt verschlüsselt, wenn der Rechner es anbietet; Inhalt nur mit dem Schlüssel lesbar", async () => {
  let uhr = 1793350800000;
  const sp = await handyMit(2), roh = [];
  const fetch = async (url, init = {}) => {
    const u = new URL(url);
    if (u.pathname === "/api/status") return antwort(200, { app: "maehr-fit-dienst", verschluesselung: ["aes-256-gcm"] });
    roh.push(init);
    return antwort(200, { ok: true, neu: 2 });
  };
  const e = await S.syncJetzt({ speicher: sp, fetch, jetzt: () => uhr++, warte: async () => {} });
  assert.equal(e.verschluesselt, true);
  assert.equal(e.ohneVerschluesselung, null);
  const obj = JSON.parse(roh[0].body);
  assert.deepEqual(Object.keys(obj).sort(), ["daten", "iv"]);
  assert.doesNotMatch(roh[0].body, /herzschlag/);
  const klar = await S.entschluesseln(subtle, S.aesRoh(S.ausB64url(KOPPLUNG.schluessel)), obj, S.aadSync(KOPPLUNG.geraet, roh[0].headers["X-MF-Zeit"]));
  assert.equal(JSON.parse(new TextDecoder().decode(klar)).messungen.length, 2);
});

test("syncJetzt ohne WebCrypto am Gerät: nur unterschrieben, Grund „geraet“", async () => {
  const sp = await handyMit(1);
  const fetch = async (url, init = {}) => (new URL(url).pathname === "/api/status" ? antwort(200, { app: "maehr-fit-dienst", verschluesselung: ["aes-256-gcm"] }) : antwort(200, { ok: true, neu: 1 }));
  const alt = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: (a) => a }, configurable: true });
  try {
    const e = await S.syncJetzt({ speicher: sp, fetch, warte: async () => {} });
    assert.deepEqual([e.verschluesselt, e.ohneVerschluesselung], [false, "geraet"]);
    assert.equal((await S.syncStatus({ speicher: sp })).ohneVerschluesselung, "geraet");
  } finally { Object.defineProperty(globalThis, "crypto", alt); }
});

test("syncEinrichten: meldet sich beim Rechner und legt die Kopplung ab; syncEntkoppeln löst sie", async () => {
  const text = F.kopplung.text, sp = speicherMap(), r = rechner();
  const jetzt = () => F.kopplung.ablauf - 60000;
  // Der gespielte Rechner prüft gegen KOPPLUNG – derselbe Schlüssel wie im Kopplungscode der Fixture
  const e = await S.syncEinrichten(text, { speicher: sp, fetch: r.fetch, jetzt });
  assert.deepEqual([e.host, e.port, e.fingerabdruck], ["192.168.178.20", 8765, F.kopplung.fingerabdruck]);
  assert.equal((await sp.lies(S.SCHLUESSEL_KOPPLUNG)).geraet, "g0123456789ab");
  assert.deepEqual(JSON.parse(r.anfragen.at(-1).koerper), { messungen: [] });
  const weg = await S.syncEntkoppeln({ speicher: sp, fetch: r.fetch, jetzt });
  assert.deepEqual(weg, { entfernt: true, rechnerBestaetigt: true });
  assert.equal(r.anfragen.at(-1).methode, "DELETE");
  assert.equal(await sp.lies(S.SCHLUESSEL_KOPPLUNG), null);
  await assert.rejects(S.syncJetzt({ speicher: sp, fetch: r.fetch }), /Noch nicht/);
});

test("exportInhalt: Messwerte und eigene Tagebucheinträge, keine Einstellungen oder Schlüssel", async () => {
  const sp = speicherMap({ "messung:hrv:2026-10-30": [{ t: 1 }], "tagebuch:2026-10-30": { tag: "2026-10-30" }, einstellungen: { alter: 38 }, [S.SCHLUESSEL_KOPPLUNG]: KOPPLUNG });
  const e = await S.exportInhalt(sp, 5);
  assert.deepEqual(Object.keys(e.eintraege), ["messung:hrv:2026-10-30", "tagebuch:2026-10-30"]);
  assert.equal(e.format, "maehr-fit-export");
});

// ------------------------------------------------------------------------------------------------ Speicher über den Dienst
function dienstAttrappe(token = "t".repeat(32)) {
  const werte = new Map(), aufrufe = [];
  const fetch = async (pfad, init = {}) => {
    aufrufe.push(pfad);
    if ((init.headers || {})["X-MF-Lokal"] !== token) return antwort(403, { text: "nein" });
    const u = new URL(pfad, "http://127.0.0.1:8765"), k = u.searchParams.get("k"), p = u.searchParams.get("praefix") || "";
    if (u.pathname === "/api/status") return antwort(200, { app: "maehr-fit-dienst", lokal: true });
    if (u.pathname === "/api/speicher/wert" && init.method === "PUT") { const w = JSON.parse(init.body); if (w === null) werte.delete(k); else werte.set(k, w); return antwort(200, { ok: true }); }
    if (u.pathname === "/api/speicher/wert") return antwort(200, { da: werte.has(k), wert: werte.get(k) ?? null });
    if (u.pathname === "/api/speicher/alle") return antwort(200, { werte: Object.fromEntries([...werte].filter(([x]) => x.startsWith(p))) });
    if (u.pathname === "/api/speicher/alles") { werte.clear(); return antwort(200, { ok: true }); }
    return antwort(404, {});
  };
  return { fetch, werte, aufrufe, token };
}
const seite = (token, protocol = "http:") => ({ location: { protocol }, document: { querySelector: (s) => (s.includes("mf-dienst") && token ? { getAttribute: () => token } : null) } });

test("speicherServer: erkennt den Dienst, erfüllt die Schnittstelle, liste() lädt vor, sonst Rückfall auf den Browser", async () => {
  const d = dienstAttrappe();
  const sp = await speicherServer({ g: seite(d.token), fetch: d.fetch, rueckfall: async () => { throw new Error("kein Rückfall erwartet"); } });
  assert.equal(sp.art, "rechner");
  assert.ok(istSpeicher(sp));
  await sp.schreib("einstellungen", { sprache: "en" });
  await sp.schreib("messung:hrv:2026-10-30", [{ t: 1 }]);
  assert.deepEqual(await sp.lies("einstellungen"), { sprache: "en" });
  assert.equal(await sp.lies("fehlt"), undefined);
  assert.deepEqual(await sp.liste("messung:"), ["messung:hrv:2026-10-30"]);
  const vorher = d.aufrufe.length;
  assert.deepEqual(await sp.lies("messung:hrv:2026-10-30"), [{ t: 1 }]);
  assert.equal(d.aufrufe.length, vorher, "aus dem Zwischenspeicher nach liste()");
  await sp.loesche("einstellungen");
  assert.equal(d.werte.has("einstellungen"), false);
  await sp.loescheAlles();
  assert.equal(d.werte.size, 0);

  const ersatz = { art: "browser" };
  assert.equal(await speicherServer({ g: seite(null), fetch: d.fetch, rueckfall: async () => ersatz }), ersatz, "ohne Sitzungsschlüssel");
  assert.equal(await speicherServer({ g: seite(d.token, "file:"), fetch: d.fetch, rueckfall: async () => ersatz }), ersatz, "als Datei geöffnet");
  assert.equal(await speicherServer({ g: seite("x".repeat(32)), fetch: d.fetch, rueckfall: async () => ersatz }), ersatz, "Dienst lehnt ab");
  assert.equal(await speicherServer({ g: seite(d.token), fetch: async () => { throw new TypeError("aus"); }, rueckfall: async () => ersatz }), ersatz, "Dienst aus");
  assert.equal(dienstToken(seite("kurz")), null);
  await assert.rejects(ausDienst({ token: "falsch".repeat(4), fetch: d.fetch }).lies("x"), /nein/);
});

// ------------------------------------------------------------------------------------------------ Sync-Ansicht
test("Sync-Ansicht: genau eine Kernaussage, jede Zahl ein Knopf mit Beleg (Handy und Rechner, DE/EN, alle Zustände)", () => {
  const jetzt = Date.now();
  const zustaende = [
    { modus: "handy", geladen: false, status: null },
    { modus: "handy", geladen: true, status: { gekoppelt: false } },
    { modus: "handy", geladen: true, status: { gekoppelt: true, host: "192.168.178.20", port: 8765, geraet: "g1", fingerabdruck: "ae216c2e", zuletzt: null } },
    { modus: "handy", geladen: true, status: { gekoppelt: true, host: "192.168.178.20", port: 8765, geraet: "g1", fingerabdruck: "ae216c2e", zuletzt: jetzt - 12 * 60000, neu: 48, gesendet: 60, ersetzt: 12, verschluesselt: true, fehler: { text: "x" } } },
    { modus: "rechner", geladen: true, geraete: [], eingang: { ordner: "/home/muster/.maehrfit/eingang", dateien: [] } },
    { modus: "rechner", geladen: true, geraete: [{ id: "g1", name: "Handy", fingerabdruck: "ae216c2e", gekoppelt_am: 1, ablauf: 2 }], eingang: null },
    { modus: "rechner", geladen: true, kopplung: { text: "MF-KOPPLUNG:abc", svg: "<svg></svg>", ablauf: jetzt + 600000, fingerabdruck: "ae216c2e" },
      geraete: [{ id: "g1", name: "Handy", fingerabdruck: "ae216c2e", gekoppelt_am: 1, ablauf: 2, sync_zuletzt: jetzt - 3600000, sync_neu: 48, sync_ersetzt: 0, sync_gesamt: 900 },
        { id: "g2", name: "Tablet", fingerabdruck: "11112222", gekoppelt_am: null, ablauf: jetzt + 1 }],
      eingang: { ordner: "/e", dateien: [{ datei: "a.zip", ok: true, neu: 55, ersetzt: 0, zeit: jetzt }, { datei: "b.mfx", ok: false, fehler: "Passwort" }] } },
  ];
  for (const s of ["de", "en"]) {
    setzeSprache(s);
    for (const z of zustaende) {
      syncSicht._zustand({ kopplung: null, ...z });
      const c = { register: neuesRegister(), route: { teile: ["sync"], abfrage: {} } };
      const html = syncSicht.ansicht(c);
      assert.equal((html.match(/class="mf-kern"/g) || []).length, 1, `${s} ${z.modus}`);
      for (const b of html.match(/<button\b[^>]*class="zahl[^"]*"[^>]*>/g) || []) {
        const q = /data-q="([^"]+)"/.exec(b);
        assert.ok(q && c.register.has(q[1]), `Beleg fehlt: ${b}`);
      }
      assert.doesNotMatch(html, /undefined|\{[a-z]+\}/, `${s} ${z.modus}: Platzhalter übrig`);
    }
  }
  syncSicht._zustand({ modus: "handy", geladen: true, status: zustaende[3].status });
  setzeSprache("de");
  assert.match(syncSicht.ansicht({ register: neuesRegister(), route: { teile: ["sync"] } }), /Dein Handy und dein Rechner sind verbunden; zuletzt <button[^>]*>vor 12 Minuten<\/button>, <button[^>]*>48<\/button> neue Messwerte\./);
  syncSicht._zustand({ modus: null, geladen: false, status: null, geraete: [], eingang: null });
});

test("vorZeit: gerade eben, Minuten, Stunden, Tage", () => {
  setzeSprache("de");
  const j = 1793350800000;
  assert.equal(syncSicht.vorZeit(j - 30000, j), "gerade eben");
  assert.equal(syncSicht.vorZeit(j + 5000, j), "gerade eben", "Uhr des Handys etwas vor");
  assert.equal(syncSicht.vorZeit(j - 12 * 60000, j), "vor 12 Minuten");
  assert.equal(syncSicht.vorZeit(j - 3 * 3600000, j), "vor 3 Stunden");
  assert.equal(syncSicht.vorZeit(j - 2 * 86400000, j), "vor 2 Tagen");
  setzeSprache("en");
  assert.equal(syncSicht.vorZeit(j - 12 * 60000, j), "12 minutes ago");
  setzeSprache("de");
});
