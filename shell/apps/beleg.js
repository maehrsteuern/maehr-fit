/* shell/apps/beleg.js – Belegfenster (Prüfpfad) als Bogen von unten.
 *
 * Kernaussage: Ein Tipp auf irgendeine Zahl öffnet dieses Fenster. Es sagt, was die Zahl ist, wie sie gerechnet wurde (Rechenweg
 * und Fundstelle aus dem Kern, unsichere Werte mit „noch zu prüfen“), aus welchen Teilen sie besteht und welche Messwerte dahinter
 * stehen – mit Art (Health Connect, CSV, Demo), Kennung und Datei/Zeile. Alle Zahlen laufen über einen einzigen Klick-Fang
 * auf data-q in shell/shell.js hierher.
 *
 * Schnittstelle: belegHtml(eintrag, q) → HTML (rein) · oeffnen(dialog, eintrag, q) · MAX_QUELLEN
 */
import { t, TEXTE } from "../i18n/i18n.js";
import { esc } from "../format.js";
import { IKON } from "../ui.js";

export const MAX_QUELLEN = 25;

function quellenTabelle(quellen) {
  const q = (quellen || []).filter(Boolean);
  if (!q.length) return `<p class="mf-leise">${esc(t("beleg_keine_quellen"))}</p>`;
  const zeilen = q.slice(0, MAX_QUELLEN).map((x) => `<tr><td>${esc(TEXTE["art_" + x.art] ? t("art_" + x.art) : x.art || "–")}</td><td>${esc(x.id || "–")}</td><td>${esc([x.datei, x.zeile !== undefined && x.zeile !== null ? `#${x.zeile}` : ""].filter(Boolean).join(" ") || "–")}</td></tr>`).join("");
  const mehr = q.length > MAX_QUELLEN ? `<p class="mf-leise">${esc(t("beleg_weitere", { n: q.length - MAX_QUELLEN }))}</p>` : "";
  return `<table class="mf-tab"><thead><tr><th>${esc(t("beleg_art"))}</th><th>${esc(t("beleg_kennung"))}</th><th>${esc(t("beleg_ort"))}</th></tr></thead><tbody>${zeilen}</tbody></table>${mehr}`;
}

export function belegHtml(e, q = "") {
  if (!e) return `<div class="mf-beleg-kopf"><h2 id="mf-beleg-titel">${esc(t("beleg_titel"))}</h2><button type="button" class="mf-rund" data-beleg-zu aria-label="${esc(t("schliessen"))}">${IKON.zu}</button></div><div class="mf-beleg-leib"><p>${esc(t("beleg_unbekannt"))}</p><p class="mf-leise">${esc(q)}</p></div>`;
  const f = e.formel;
  const formel = f && f.text ? `<section class="mf-abschnitt"><h3 class="mf-beschriftung">${esc(t("beleg_formel"))}</h3><div class="mf-formel"><code>${esc(f.text)}</code>${f.fundstelle ? `<small>${esc(t("beleg_fundstelle", { text: f.fundstelle }))}</small>` : ""}${f.pruefen ? `<span><span class="mf-pruefen">${esc(t("beleg_pruefen"))}</span></span>` : ""}</div></section>` : "";
  const teile = (e.teile || []).length ? `<section class="mf-abschnitt"><h3 class="mf-beschriftung">${esc(t("beleg_teile"))}</h3><table class="mf-tab"><thead><tr><th>${esc(t("beleg_name"))}</th><th class="rechts">${esc(t("beleg_wert"))}</th>${e.teile.some((x) => x.gewicht) ? `<th class="rechts">${esc(t("beleg_gewicht"))}</th>` : ""}</tr></thead><tbody>${e.teile.map((x) => `<tr><td>${esc(x.name)}</td><td class="rechts">${esc(x.wert)}</td>${e.teile.some((y) => y.gewicht) ? `<td class="rechts">${esc(x.gewicht || "")}</td>` : ""}</tr>`).join("")}</tbody></table></section>` : "";
  return `<div class="mf-beleg-kopf"><h2 id="mf-beleg-titel">${esc(e.titel)}</h2><button type="button" class="mf-rund" data-beleg-zu aria-label="${esc(t("schliessen"))}">${IKON.zu}</button></div>
    <div class="mf-beleg-leib" data-q-offen="${esc(q)}">
      <p class="mf-beleg-wert">${esc(e.wert)}</p>
      <p class="mf-leise">${esc(t("beleg_titel"))}</p>
      ${formel}${teile}
      <section class="mf-abschnitt"><h3 class="mf-beschriftung">${esc(t("beleg_quellen"))}</h3>${quellenTabelle(e.quellen)}</section>
    </div>`;
}

export function oeffnen(dialog, eintrag, q) {
  dialog.innerHTML = belegHtml(eintrag, q);
  if (!dialog.open) { if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); }
  dialog.querySelector("[data-beleg-zu]")?.focus();
}
