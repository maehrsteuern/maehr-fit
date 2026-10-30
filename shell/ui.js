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
 *   IKON                         Symbole aus dem Sprite shell/icons.js (aria-hidden, Strich in currentColor)
 *   leererTag(ctx, titel, satz)  leere Ansicht: Strichbild, ein Satz, Knopf zum letzten Tag mit Werten
 */
import { esc } from "./format.js";
import { t } from "./i18n/i18n.js";
import "./i18n/texte_design.js";
import { ikon, leerBild } from "./icons.js";

export const kernaussage = (html) => `<p class="mf-kern">${html}</p>`;
/** Leerer Tag: ein Satz und ein Knopf zum letzten Tag mit Messwerten (falls es einen gibt). */
export const leererTag = (ctx, titel, satzSchluessel = "keine_daten_tag", sicht = "") =>
  `<div class="mf-sicht"${sicht ? ` data-sicht="${sicht}"` : ""}>${kopf(titel)}<div class="mf-leer">${leerBild({ schlaf: "schlaf", belastung: "belastung", heute: "heute" }[sicht] || "allgemein")}${kernaussage(esc(t(satzSchluessel)))}${ctx.erg?.letzter && ctx.erg.letzter !== ctx.tag ? `<div class="mf-knopfreihe"><button type="button" class="mf-knopf primaer" data-tag="letzter">${esc(t("zum_letzten_tag"))}</button></div>` : ""}</div></div>`;
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

// Symbole aus dem Sprite (shell/icons.js): ein Strich-Satz, 24 px, Farbe über currentColor
export const IKON = {
  heute: ikon("erholung"), schlaf: ikon("mond"), belastung: ikon("aktivitaet"), atem: ikon("wind"), mehr: ikon("mehr"),
  links: ikon("links"), rechts: ikon("rechts"), unten: ikon("unten"), thema: ikon("thema"), menue: ikon("menue"), zu: ikon("zu"),
  tagebuch: ikon("tagebuch"), trends: ikon("trends"), daten: ikon("daten"), einstellungen: ikon("einstellungen"), sync: ikon("sync"),
  herz: ikon("herz"), bluetooth: ikon("bluetooth"), kalender: ikon("kalender"), pruefen: ikon("pruefen"), vergleich: ikon("trends"),
};

/** Wie t(), aber die Werte sind fertiges HTML (z. B. Zahl-Knöpfe); der Satz selbst wird maskiert. */
export function tHtml(schluessel, werteHtml = {}) {
  const roh = t(schluessel);
  return roh.split(/(\{\w+\})/).map((teil) => { const m = /^\{(\w+)\}$/.exec(teil); return m && werteHtml[m[1]] !== undefined ? String(werteHtml[m[1]]) : esc(teil); }).join("");
}
