/* shell/speicher_server.js – Speicher-Schnittstelle des Kerns (kern/speicher.js) über den Dienst am Rechner (desktop/mf_dienst.py).
 *
 * Kernaussage: Öffnest du MAEHR FIT am Rechner über das kleine Programm dort, liegen deine Werte nicht im Browser, sondern in der
 * Datenbank des Programms (~/.maehrfit/mf.sqlite) – dort, wo auch die Werte vom Handy und aus dem Eingangsordner ankommen.
 * Diese Datei merkt das selbst: Antwortet der Dienst, spricht sie mit ihm; sonst nimmt sie wie bisher den Speicher des Browsers.
 *
 * Erkennung: Seite über http(s) geladen, der Dienst hat beim Ausliefern seinen Sitzungsschlüssel als <meta name="mf-dienst"> eingesetzt,
 *   und GET /api/status antwortet mit app "maehr-fit-dienst" und lokal: true. Sonst: speicherBrowser() (IndexedDB …).
 * Schnittstelle (Vertrag wie speicher_browser.js): { lies, schreib, liste, loesche, loescheAlles, art: "rechner", bereit }
 *   Zusätzlich: dienstAnfrage(pfad, init) für die Sync-Ansicht (Geräte, Koppeln, Eingangsordner).
 * Schneller Start: liste(praefix) holt alle Werte des Präfixes in einem Zug (GET /api/speicher/alle) und merkt sie sich kurz;
 *   die folgenden lies() kommen aus diesem Zwischenspeicher. schreib() hält ihn aktuell.
 */
import { speicherBrowser } from "./speicher_browser.js";

const FRISCH_MS = 3000;
const weg = (w) => w === undefined || w === null;

/** Sitzungsschlüssel aus der vom Dienst ausgelieferten Seite, sonst null. */
export function dienstToken(g = globalThis) {
  const proto = g.location?.protocol || "";
  if (!/^https?:$/.test(proto)) return null;
  const meta = g.document?.querySelector?.('meta[name="mf-dienst"]');
  const token = meta?.getAttribute?.("content");
  return token && token.length >= 16 ? token : null;
}

/** Speicher über den Dienst (ohne Prüfung, ob er antwortet – das macht speicherServer). */
export function ausDienst({ token, fetch: f = globalThis.fetch?.bind(globalThis), jetzt = () => Date.now() }) {
  const anfrage = async (pfad, init = {}) => {
    const r = await f(pfad, { ...init, headers: { "X-MF-Lokal": token, ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) } });
    let obj = null;
    try { obj = await r.json(); } catch { obj = null; }
    if (!r.ok) throw new Error(obj?.text || `Dienst am Rechner: Fehler ${r.status}`);
    return obj;
  };
  const zwischen = new Map();           // schluessel → { wert, zeit }
  const merke = (k, w) => zwischen.set(k, { wert: w, zeit: jetzt() });
  const kopie = (w) => (w === undefined ? undefined : structuredClone(w));
  const s = {
    art: "rechner", bereit: Promise.resolve(true), dienstAnfrage: anfrage,
    async lies(k) {
      const z = zwischen.get(k);
      if (z && jetzt() - z.zeit < FRISCH_MS) return kopie(z.wert);
      const r = await anfrage(`/api/speicher/wert?k=${encodeURIComponent(k)}`);
      const w = r.da ? r.wert : undefined;
      merke(k, w);
      return kopie(w);
    },
    async schreib(k, w) {
      await anfrage(`/api/speicher/wert?k=${encodeURIComponent(k)}`, { method: "PUT", body: JSON.stringify(weg(w) ? null : w) });
      merke(k, weg(w) ? undefined : structuredClone(w));
    },
    async liste(p = "") {
      const r = await anfrage(`/api/speicher/alle?praefix=${encodeURIComponent(p)}`);
      for (const [k, w] of Object.entries(r.werte || {})) merke(k, w);
      return Object.keys(r.werte || {}).sort();
    },
    async loescheAlles() { await anfrage("/api/speicher/alles", { method: "DELETE" }); zwischen.clear(); },
  };
  s.loesche = (k) => s.schreib(k, undefined);
  return s;
}

/**
 * Bester Speicher: der Dienst am Rechner, wenn er antwortet, sonst der Browser-Speicher.
 * @param {{ g?: object, fetch?: Function, rueckfall?: () => Promise<object> }} [optionen]
 */
export async function speicherServer({ g = globalThis, fetch: f = g.fetch?.bind(g), rueckfall = () => speicherBrowser(g) } = {}) {
  const token = dienstToken(g);
  if (token && typeof f === "function") {
    try {
      const r = await f("/api/status", { headers: { "X-MF-Lokal": token } });
      const s = r.ok ? await r.json() : null;
      if (s?.app === "maehr-fit-dienst" && s.lokal === true) return ausDienst({ token, fetch: f });
    } catch { /* Dienst nicht erreichbar: Browser-Speicher */ }
  }
  return rueckfall();
}
