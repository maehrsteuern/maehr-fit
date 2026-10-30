/* shell/ui.js – kleine gemeinsame Bausteine der Ansichten (reines Markup, ohne DOM, testbar in Node).
 *
 * Kernaussage: Jede Ansicht beginnt gleich – Titel, dann genau eine Kernaussage – und nutzt dieselben Knöpfe, Abschnitte und
 * Symbole. Wer eine Zahl zeigt, legt sie hier als Knopf mit data-q an und meldet ihren Beleg beim Register der Shell an.
 *
 * Schnittstelle:
 *   kernaussage(html)            <p class="mf-kern"> – genau einmal je Ansicht (tests/node/ruhe.test.mjs)
 *   kopf(titel, { zurueck })     Titelzeile mit optionalem Zurück-Link
 *   abschnitt(titel, inhalt)     Abschnitt mit leiser, versaler Überschrift
 *   zahlKnopf(q, text, aria?)    <button class="zahl" data-q="…">
 *   vergleich(wert, basis, fmt)  { richtung: hoch|runter|gleich|neu, text, aria } – gegen den üblichen Bereich (Mittel ± Streuung)
 *   neuesRegister()              Map der Belege; beleg(register)(q, eintrag) → q
 *   IKON                         Symbole (SVG, aria-hidden, Strich in currentColor)
 */
import { esc } from "./format.js";
import { t } from "./i18n/i18n.js";

export const kernaussage = (html) => `<p class="mf-kern">${html}</p>`;
/** Leerer Tag: ein Satz und ein Knopf zum letzten Tag mit Messwerten (falls es einen gibt). */
export const leererTag = (ctx, titel, satzSchluessel = "keine_daten_tag", sicht = "") =>
  `<div class="mf-sicht"${sicht ? ` data-sicht="${sicht}"` : ""}>${kopf(titel)}${kernaussage(esc(t(satzSchluessel)))}${ctx.erg?.letzter && ctx.erg.letzter !== ctx.tag ? `<div class="mf-knopfreihe"><button type="button" class="mf-knopf primaer" data-tag="letzter">${esc(t("zum_letzten_tag"))}</button></div>` : ""}</div>`;
export function kopf(titel, { zurueck = null } = {}) {
  const z = zurueck ? `<a class="mf-zurueck" href="${esc(zurueck)}">${IKON.links}<span>${esc(t("zurueck"))}</span></a>` : "";
  return `<header class="mf-titelzeile">${z}<h1>${esc(titel)}</h1></header>`;
}
export const abschnitt = (titel, inhalt, klasse = "") => `<section class="mf-abschnitt${klasse ? " " + klasse : ""}">${titel ? `<h2 class="mf-beschriftung">${esc(titel)}</h2>` : ""}${inhalt}</section>`;
export const zahlKnopf = (q, text, aria = "") => `<button type="button" class="zahl" data-q="${esc(q)}"${aria ? ` aria-label="${esc(aria)}"` : ""}>${esc(text)}</button>`;

export function vergleich(wert, basis, fmt = String) {
  if (!Number.isFinite(wert) || !basis || !basis.n || !Number.isFinite(basis.mittel)) return { richtung: "neu", text: t("vgl_neu"), aria: t("vgl_neu") };
  const s = Number(basis.streuung) || 0;
  const richtung = wert > basis.mittel + s ? "hoch" : wert < basis.mittel - s ? "runter" : "gleich";
  const text = t(richtung === "hoch" ? "vgl_hoch" : richtung === "runter" ? "vgl_runter" : "vgl_gleich");
  return { richtung, text, aria: `${text} (${t("mittel_text", { wert: fmt(basis.mittel) })})` };
}

export function neuesRegister() { return new Map(); }
export const beleg = (register) => (q, eintrag) => { register.set(q, eintrag); return q; };

const svg = (pfad) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${pfad}</svg>`;
export const IKON = {
  heute: svg('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'),
  schlaf: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  belastung: svg('<path d="M3 12h4l2-6 4 12 2-6h6"/>'),
  atem: svg('<path d="M4 9h10a3 3 0 1 0-3-3"/><path d="M4 13h14a3 3 0 1 1-3 3"/><path d="M4 17h6"/>'),
  mehr: svg('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  links: svg('<path d="M15 5l-7 7 7 7"/>'),
  rechts: svg('<path d="M9 5l7 7-7 7"/>'),
  thema: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none"/>'),
  menue: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  zu: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  tagebuch: svg('<path d="M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6"/>'),
  trends: svg('<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-4 3 3 5-6"/>'),
  daten: svg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>'),
  einstellungen: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
};

/** Wie t(), aber die Werte sind fertiges HTML (z. B. Zahl-Knöpfe); der Satz selbst wird maskiert. */
export function tHtml(schluessel, werteHtml = {}) {
  const roh = t(schluessel);
  return roh.split(/(\{\w+\})/).map((teil) => { const m = /^\{(\w+)\}$/.exec(teil); return m && werteHtml[m[1]] !== undefined ? String(werteHtml[m[1]]) : esc(teil); }).join("");
}
