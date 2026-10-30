/* shell/apps/mehr.js – „Mehr“: Tagebuch, Trends, Daten und Einstellungen (Gliederung des fünften Reiters).
 *
 * Kernaussage: Hinter „Mehr“ liegen vier Bereiche als ruhige Liste – Tagebuch, Trends, Daten, Einstellungen – und der Hinweis,
 * dass MAEHR FIT Messwerte zeigt und keinen ärztlichen Rat gibt.
 *
 * Schnittstelle: ansicht(ctx) → HTML.
 */
import { t } from "../i18n/i18n.js";
import { esc } from "../format.js";
import { kernaussage, kopf, IKON } from "../ui.js";

export const EINTRAEGE = [
  { id: "tagebuch", titel: "tagebuch_titel", text: "mehr_tagebuch_text" },
  { id: "trends", titel: "trends_titel", text: "mehr_trends_text" },
  { id: "daten", titel: "daten_titel", text: "mehr_daten_text" },
  { id: "einstellungen", titel: "einstellungen_titel", text: "mehr_einstellungen_text" },
];

export function ansicht() {
  const zeilen = EINTRAEGE.map((e) => `<li><a class="mf-zeile" href="#/${e.id}"><span class="mf-pfeil-ikon" aria-hidden="true">${IKON[e.id]}</span><span class="mf-zeile-text"><strong>${esc(t(e.titel))}</strong><small>${esc(t(e.text))}</small></span><span class="mf-chevron">${IKON.rechts}</span></a></li>`).join("");
  return `<div class="mf-sicht" data-sicht="mehr">
    ${kopf(t("mehr_titel"))}
    ${kernaussage(esc(t("mehr_kern")))}
    <ul class="mf-liste">${zeilen}</ul>
    <p class="mf-hinweis" data-hinweis-medizin>${esc(t("hinweis_medizin"))}</p>
  </div>`;
}
