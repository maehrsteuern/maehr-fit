/* shell/abgleich.js – Regeln für den selbsttätigen Health-Connect-Abgleich (rein, ohne DOM, testbar in Node).
 *
 * Kernaussage: Die App holt neue Werte von selbst – beim Start und jedes Mal, wenn du sie wieder öffnest. Damit das Handy nicht
 * ständig liest, läuft immer nur ein Abgleich gleichzeitig und höchstens einer pro Minute; nur „Aktualisieren“ (Knopf oder
 * Herunterziehen) darf früher. Nach dem Abgleich springt die Ansicht auf heute, wenn du vorher nur mangels Werten auf dem letzten
 * Tag mit Werten standest.
 *
 * Schnittstelle:
 *   ABGLEICH_ABSTAND_MS, ZUG_SCHWELLE_PX, SCHLUESSEL       technische Vorgaben (keine Rechenformeln, daher nicht in formeln.json)
 *   neuerAbgleicher({ ausfuehren, jetzt, abstandMs })      → { anstossen({ erzwingen, grund }), laeuft() }
 *   istVerbunden({ flag, standSchluessel, erteilt })      → true, wenn Health Connect schon einmal freigegeben wurde
 *   zuletzt(ms, jetzt)                                     → { einheit: "nie"|"gerade"|"minuten"|"stunden"|"tage", n }
 *   zugAuswerten({ startY, y, scrollTop, schwelle })       → { abstand, bereit } fürs Herunterziehen
 *   tagWaehlen({ tag, modus, heute, erster, letzter, hatHeute }) → { tag, modus } (modus: "heute" | "letzter" | "hand")
 */

/** Frühestens so viele Millisekunden nach dem letzten Start beginnt ein selbsttätiger Abgleich (technische Vorgabe). */
export const ABGLEICH_ABSTAND_MS = 60 * 1000;
/** So weit (CSS-Pixel) muss man oben auf der Seite herunterziehen, damit „Aktualisieren“ ausgelöst wird. */
export const ZUG_SCHWELLE_PX = 80;
/** Speicher-Schlüssel der Shell zum Abgleich (der Stand je Datenart liegt in der Datenschicht unter sync:healthconnect:…). */
export const SCHLUESSEL = { verbunden: "hc:verbunden", letzter: "hc:letzter_abgleich" };

/**
 * Abgleicher: bündelt Anstöße (Start, Rückkehr in die App, Knopf). Läuft schon einer, bekommt jeder weitere Anstoß dessen Ergebnis
 * (nie zwei gleichzeitig). Ohne `erzwingen` wird ein Anstoß innerhalb von `abstandMs` nach dem letzten Start übersprungen.
 * @param {{ ausfuehren: (info:{grund?:string}) => Promise<any>, jetzt?: () => number, abstandMs?: number }} p
 */
export function neuerAbgleicher({ ausfuehren, jetzt = () => Date.now(), abstandMs = ABGLEICH_ABSTAND_MS }) {
  let laufend = null, letzterStart = null;
  return {
    /** → Promise mit dem Ergebnis von ausfuehren, oder { uebersprungen: "zu_frueh" }. */
    anstossen({ erzwingen = false, grund = "" } = {}) {
      if (laufend) return laufend;
      const t = jetzt();
      if (!erzwingen && letzterStart !== null && t - letzterStart < abstandMs) return Promise.resolve({ uebersprungen: "zu_frueh" });
      letzterStart = t;
      laufend = (async () => {
        try { return await ausfuehren({ grund }); } finally { laufend = null; }
      })();
      return laufend;
    },
    laeuft: () => laufend !== null,
  };
}

/** Schon einmal verbunden? Merkzeichen der Shell, ein Stand der Datenschicht (= es wurde schon gelesen) oder erteilte Rechte. */
export function istVerbunden({ flag = null, standSchluessel = [], erteilt = null } = {}) {
  return !!flag || (Array.isArray(standSchluessel) && standSchluessel.length > 0) || (Array.isArray(erteilt) && erteilt.length > 0);
}

/** Abstand seit dem letzten Abgleich in Worten-Bausteinen: unter 1 min „gerade“, dann Minuten, Stunden, Tage (abgerundet). */
export function zuletzt(ms, jetzt = Date.now()) {
  if (!Number.isFinite(ms) || ms <= 0) return { einheit: "nie", n: 0 };
  const d = Math.max(0, jetzt - ms), min = Math.floor(d / 60000);
  if (min < 1) return { einheit: "gerade", n: 0 };
  if (min < 60) return { einheit: "minuten", n: min };
  const std = Math.floor(min / 60);
  if (std < 24) return { einheit: "stunden", n: std };
  return { einheit: "tage", n: Math.floor(std / 24) };
}

/**
 * Herunterziehen oben auf der Seite: zählt nur, solange die Seite ganz oben steht (scrollTop 0) und nach unten gezogen wird.
 * Der sichtbare Ausschlag ist gedämpft (halber Weg, höchstens 1,5 × Schwelle); ausgelöst wird ab `schwelle` Pixel echtem Zug.
 */
export function zugAuswerten({ startY, y, scrollTop = 0, schwelle = ZUG_SCHWELLE_PX }) {
  if (!Number.isFinite(startY) || !Number.isFinite(y) || scrollTop > 0) return { abstand: 0, ausschlag: 0, bereit: false };
  const abstand = Math.max(0, y - startY);
  return { abstand, ausschlag: Math.min(abstand / 2, schwelle * 0.75), bereit: abstand > schwelle };
}

/**
 * Welcher Tag wird gezeigt? (gleiche Regel beim Start, nach dem Einlesen und nach jedem Abgleich)
 * - modus "hand": du hast selbst geblättert → der Tag bleibt, solange er im Bereich [erster, heute] liegt.
 * - sonst: heute, wenn es heute Werte gibt (oder gar keine Werte); sonst der letzte Tag mit Werten (modus "letzter").
 *   Kommen später Werte für heute dazu, springt die Ansicht von "letzter" auf "heute".
 */
export function tagWaehlen({ tag = null, modus = null, heute, erster = null, letzter = null, hatHeute = false }) {
  if (modus === "hand" && tag && tag <= heute && (!erster || tag >= erster)) return { tag, modus };
  if (hatHeute || !letzter) return { tag: heute, modus: "heute" };
  return { tag: letzter, modus: "letzter" };
}
