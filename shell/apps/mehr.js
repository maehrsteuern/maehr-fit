/* shell/apps/mehr.js – „Mehr“: Tagebuch, Trends, Vergleich, Daten und Einstellungen (Gliederung des fünften Reiters).
 *
 * Kernaussage: Hinter „Mehr“ liegen die übrigen Bereiche als ruhige Liste – Tagebuch, Trends, Vergleich mit WHOOP, Daten,
 * Einstellungen, Sync (Handy ↔ Rechner) – und der Hinweis, dass MAEHR FIT Messwerte zeigt und keinen ärztlichen Rat gibt. Eine letzte Zeile nennt, wie viele
 * Formeln noch zu prüfen sind, und führt zu ihrer Liste (#/mehr/pruefen) mit Rechenweg und Fundstelle je Formel.
 *
 * Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx) (nur für #/mehr/mitteilungen). Formeln: shell/kern.js pruefListe() → kern/formeln.js
 * (kern/formeln/formeln.json). „Mitteilungen & Widgets“ liegt unter #/mehr/mitteilungen (shell/apps/mitteilungen.js), damit kein neuer
 * Weg in shell/shell.js nötig ist.
 */
import { t } from "../i18n/i18n.js";
import { esc, zahl } from "../format.js";
import { kernaussage, kopf, IKON, beleg, zahlKnopf, tHtml } from "../ui.js";
import { pruefListe } from "../kern.js";
import * as mitteilungen from "./mitteilungen.js";

export const EINTRAEGE = [
  { id: "tagebuch", titel: "tagebuch_titel", text: "mehr_tagebuch_text" },
  { id: "trends", titel: "trends_titel", text: "mehr_trends_text" },
  { id: "vergleich", titel: "vgl_titel", text: "mehr_vergleich_text", ikon: "trends" },
  { id: "daten", titel: "daten_titel", text: "mehr_daten_text" },
  { id: "einstellungen", titel: "einstellungen_titel", text: "mehr_einstellungen_text" },
  { id: "sync", titel: "sync_titel", text: "mehr_sync_text" },
  { id: "mehr/mitteilungen", titel: "mt_titel", text: "mehr_mitteilungen_text", ikon: "heute" },
];

const zeile = (href, ikon, titel, text, rechts = "") => `<li><a class="mf-zeile" href="${esc(href)}"><span class="mf-pfeil-ikon" aria-hidden="true">${IKON[ikon] || IKON.mehr}</span><span class="mf-zeile-text"><strong>${esc(titel)}</strong><small>${esc(text)}</small></span>${rechts}<span class="mf-chevron">${IKON.rechts}</span></a></li>`;

/** Wert einer Formel lesbar: Zahl mit Einheit, Liste oder Objekt kurz, ohne Wert „Rechenweg“. */
function wertText(f) {
  const w = f.wert;
  if (typeof w === "number") return `${zahl(w, Number.isInteger(w) ? 0 : 2)} ${f.einheit || ""}`.trim();
  if (Array.isArray(w)) return w.join(" · ");
  if (w && typeof w === "object") return Object.entries(w).map(([k, x]) => `${k} ${x}`).join(" · ");
  if (typeof w === "string") return w;
  return t("pruefen_rechenweg");
}

function pruefen(ctx) {
  const liste = pruefListe(), B = beleg(ctx.register);
  B("pruefen:anzahl", { titel: t("pruefen_anzahl_titel"), wert: zahl(liste.length), formel: null, teile: liste.map((f) => ({ name: f.schluessel, wert: wertText(f) })), quellen: [] });
  const zeilen = liste.map((f) => {
    const q = B(`formel:${f.schluessel}`, { titel: f.erklaerung || f.schluessel, wert: wertText(f), formel: f,
      teile: [{ name: t("pruefen_schluessel"), wert: f.schluessel }, { name: t("pruefen_einheit"), wert: f.einheit || "–" }], quellen: [] });
    return `<li class="mf-pruef-zeile"><div class="mf-zeile-text"><strong>${esc(f.erklaerung || f.schluessel)}</strong><small>${esc(f.fundstelle || "")}</small><small class="mf-leise"><code>${esc(f.schluessel)}</code></small></div><div class="mf-zeile-rechts">${zahlKnopf(q, wertText(f))}</div></li>`;
  }).join("");
  return `<div class="mf-sicht" data-sicht="pruefen">
    ${kopf(t("pruefen_titel"), { zurueck: "#/mehr" })}
    ${kernaussage(tHtml("pruefen_kern", { n: zahlKnopf("pruefen:anzahl", zahl(liste.length)) }))}
    <ul class="mf-liste">${zeilen}</ul>
  </div>`;
}

export function ansicht(ctx = {}) {
  if ((ctx.route?.teile || [])[1] === "pruefen") return pruefen(ctx);
  if ((ctx.route?.teile || [])[1] === "mitteilungen") return mitteilungen.ansicht(ctx);
  const zeilen = EINTRAEGE.map((e) => zeile(`#/${e.id}`, e.ikon || e.id, t(e.titel), t(e.text))).join("");
  const n = pruefListe().length;
  const pruefZeile = zeile("#/mehr/pruefen", "pruefen", t("mehr_pruefen_titel"), t("mehr_pruefen_text"), `<span class="mf-zeile-rechts"><span class="zahl-text" data-pruefen-anzahl>${esc(zahl(n))}</span></span>`);
  return `<div class="mf-sicht" data-sicht="mehr">
    ${kopf(t("mehr_titel"))}
    ${kernaussage(esc(t("mehr_kern")))}
    <ul class="mf-liste">${zeilen}</ul>
    <ul class="mf-liste">${pruefZeile}</ul>
    <p class="mf-hinweis" data-hinweis-medizin>${esc(t("hinweis_medizin"))}</p>
  </div>`;
}

/** Nur „Mitteilungen & Widgets“ braucht Knöpfe mit Wirkung; die Liste selbst sind reine Links. */
export function binde(wurzel, ctx = {}) {
  if ((ctx.route?.teile || [])[1] === "mitteilungen") return mitteilungen.binde(wurzel, ctx);
  return () => {};
}
