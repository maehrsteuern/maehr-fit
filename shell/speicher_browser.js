/* shell/speicher_browser.js – Speicher-Schnittstelle des Kerns (docs/technik/schnittstellen.md) im Browser.
 *
 * Kernaussage: Alles, was MAEHR FIT sich merkt (Tagebuch, Einstellungen, eingelesene Messwerte), liegt nur in diesem Browser bzw.
 * dieser App: zuerst in IndexedDB, wenn das nicht geht (privates Fenster, alte WebView) in localStorage, und notfalls nur im
 * Arbeitsspeicher, solange die Seite offen ist. Nichts geht ins Netz.
 *
 * Schnittstelle (Vertrag): { lies(schluessel) → Promise<any>, schreib(schluessel, wert) → Promise<void>, liste(praefix) → Promise<String[]> }
 * Zusätzlich: loesche(schluessel), loescheAlles() → Promise<void>, art ("indexeddb" | "localstorage" | "speicher")
 * schreib(schluessel, undefined) und schreib(schluessel, null) entfernen den Eintrag.
 */
const DB = "maehr-fit", ABLAGE = "werte", PRAEFIX = "mf.";
const weg = (w) => w === undefined || w === null;
/** loesche(k) für alle Formen: schreib(k, undefined) */
const mitLoesche = (s) => ({ ...s, loesche: (k) => s.schreib(k, undefined) });

function ausIndexedDb(idb) {
  const offen = new Promise((ok, fehler) => {
    const r = idb.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ABLAGE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
  const tx = async (modus, arbeit) => {
    const db = await offen;
    return new Promise((ok, fehler) => {
      const t = db.transaction(ABLAGE, modus), s = t.objectStore(ABLAGE);
      const r = arbeit(s);
      t.oncomplete = () => ok(r?.result);
      t.onerror = () => fehler(t.error);
      t.onabort = () => fehler(t.error);
    });
  };
  return {
    art: "indexeddb", bereit: offen.then(() => true),
    lies: (k) => tx("readonly", (s) => s.get(k)),
    schreib: async (k, w) => { await tx("readwrite", (s) => (weg(w) ? s.delete(k) : s.put(w, k))); },
    liste: async (p = "") => ((await tx("readonly", (s) => s.getAllKeys())) || []).map(String).filter((k) => k.startsWith(p)).sort(),
    loescheAlles: async () => { await tx("readwrite", (s) => s.clear()); },
  };
}

function ausLocalStorage(ls) {
  return {
    art: "localstorage", bereit: Promise.resolve(true),
    lies: async (k) => { const v = ls.getItem(PRAEFIX + k); return v === null ? undefined : JSON.parse(v); },
    schreib: async (k, w) => { if (weg(w)) ls.removeItem(PRAEFIX + k); else ls.setItem(PRAEFIX + k, JSON.stringify(w)); },
    liste: async (p = "") => Object.keys(ls).filter((k) => k.startsWith(PRAEFIX + p)).map((k) => k.slice(PRAEFIX.length)).sort(),
    loescheAlles: async () => { for (const k of Object.keys(ls)) if (k.startsWith(PRAEFIX)) ls.removeItem(k); },
  };
}

export function ausMap(m = new Map()) {
  return mitLoesche({
    art: "speicher", bereit: Promise.resolve(true),
    lies: async (k) => (m.has(k) ? structuredClone(m.get(k)) : undefined),
    schreib: async (k, w) => { if (weg(w)) m.delete(k); else m.set(k, structuredClone(w)); },
    liste: async (p = "") => [...m.keys()].filter((k) => k.startsWith(p)).sort(),
    loescheAlles: async () => m.clear(),
  });
}

/** Bester verfügbarer Speicher; prüft IndexedDB mit einem Probelauf und fällt sonst zurück. */
export async function speicherBrowser(g = globalThis) {
  try {
    if (g.indexedDB) { const s = ausIndexedDb(g.indexedDB); await s.bereit; await s.liste(""); return mitLoesche(s); }
  } catch { /* weiter mit localStorage */ }
  try {
    if (g.localStorage) { g.localStorage.setItem(PRAEFIX + "probe", "1"); g.localStorage.removeItem(PRAEFIX + "probe"); return mitLoesche(ausLocalStorage(g.localStorage)); }
  } catch { /* weiter im Arbeitsspeicher */ }
  return mitLoesche(ausMap());
}
