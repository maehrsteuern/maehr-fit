/* shell/apps/schlaf.js – „Schlaf“: wie viel du gebraucht und wie viel du bekommen hast (docs/apps/schlaf.md).
 *
 * Kernaussage: Der Satz oben sagt, ob die Nacht deinen Schlafbedarf gedeckt hat. Darunter stehen Bedarf und geschlafene Zeit
 * als zwei Balken, die Schlafphasen als ein geteilter Balken und vier Kacheln: Schlafleistung, Regelmäßigkeit, Schlafschuld und
 * die Zeit im Bett. Aufklappbar steht, woraus sich dein Bedarf zusammensetzt. Jede Zahl öffnet ihren Beleg.
 *
 * Schnittstelle: ansicht(ctx) → HTML. Werte aus dem Tagesbild (shell/kern.js → kern/tag.js: Schlafleistung, Bedarf, Konsistenz).
 */
import { t } from "../i18n/i18n.js";
import { prozent, dauer, dauerKurz, uhrzeit, esc } from "../format.js";
import { balken, segmentbalken, kennzahlKachel } from "../viz/viz.js";
import { kernaussage, leererTag, kopf, zahlKnopf, beleg, tHtml } from "../ui.js";
import { belegeTag, phasenVon, PHASEN } from "../belege.js";

const PHASEN_KLASSE = { wach: "vz-k3", leicht: "vz-k2", tief: "vz-k4", rem: "vz-k1" };

export function ansicht(ctx) {
  const { bild, tag } = ctx, B = beleg(ctx.register);
  if (!bild || !bild.schlafRoh) return leererTag(ctx, t("schlaf_titel"), "schlaf_kern_leer", "schlaf");
  belegeTag(B, bild);
  const s = bild.schlaf, fehlt = s.bedarfMs - s.dauerMs;
  const satz = fehlt > 0
    ? tHtml("schlaf_kern_weniger", { wert: zahlKnopf(`schlaf-schuld:${tag}`, dauer(fehlt)) })
    : tHtml("schlaf_kern_genug", { wert: zahlKnopf(`schlaf-dauer:${tag}`, dauer(s.dauerMs)) });

  const bedarf = balken({ titel: t("schlaf_bedarf_titel"), kernaussage: t("schlaf_bedarf_kern"), reihen: [
    { name: t("schlaf_bedarf"), wert: s.bedarfMs, text: dauerKurz(s.bedarfMs), q: `schlaf-bedarf:${tag}`, klasse: "vz-k0" },
    { name: t("schlaf_geschlafen"), wert: s.dauerMs, text: dauerKurz(s.dauerMs), q: `schlaf-dauer:${tag}`, klasse: "vz-k1" },
  ] }).html;

  const ph = phasenVon(s), gesamt = PHASEN.reduce((x, a) => x + (ph[a] || 0), 0) || 1;
  const anteilTiefRem = Math.round((((ph.tief || 0) + (ph.rem || 0)) / gesamt) * 100);
  const phasen = segmentbalken({ titel: t("schlaf_phasen_titel"), kernaussage: t("schlaf_phasen_kern", { wert: prozent(anteilTiefRem) }),
    segmente: PHASEN.map((a) => ({ name: t("phase_" + a), wert: ph[a] || 0, text: dauer(ph[a] || 0), q: `schlaf-phase:${tag}:${a}`, klasse: PHASEN_KLASSE[a] })) }).html;

  const k = s.konsistenz || { wert: null };
  if (k.wert !== null) B(`schlaf-konstanz:${tag}`, { titel: t("kachel_konstanz"), wert: prozent(k.wert), formel: k.formel, teile: [], quellen: k.quellen || [] });
  const kacheln = [
    kennzahlKachel({ titel: t("kachel_leistung"), wert: prozent(s.wert), q: `schlaf:${tag}`, vergleich: { richtung: fehlt > 0 ? "runter" : "gleich", text: t("leistung_satz") } }),
    kennzahlKachel({ titel: t("kachel_konstanz"), wert: k.wert === null ? "–" : prozent(k.wert), q: k.wert === null ? "" : `schlaf-konstanz:${tag}`, vergleich: { richtung: "neu", text: t("konstanz_satz") } }),
    kennzahlKachel({ titel: t("kachel_schuld"), wert: dauerKurz(Math.max(0, s.schuld)), q: `schlaf-schuld:${tag}`, vergleich: { richtung: s.schuld > 0 ? "runter" : "gleich", text: t("schuld_satz") } }),
    kennzahlKachel({ titel: t("kachel_zeiten"), wert: uhrzeit(bild.schlafRoh.von), q: `schlaf-zeiten:${tag}`, vergleich: { richtung: "neu", text: t("zeiten_satz", { von: uhrzeit(bild.schlafRoh.von), bis: uhrzeit(bild.schlafRoh.bis) }) } }),
  ].map((x) => x.html).join("");

  const teile = (bild.bedarf.teile || []).filter((x) => x.ms !== 0).map((x) => `<div class="mf-teil"><span class="mf-teil-name">${esc(t("bedarf_" + x.name))}</span>${zahlKnopf(`schlaf-bedarf:${tag}`, dauer(x.ms))}</div>`).join("");
  return `<div class="mf-sicht" data-sicht="schlaf">
    ${kopf(t("schlaf_titel"))}
    ${kernaussage(satz)}
    <div class="mf-karte">${bedarf}</div>
    <div class="mf-karte">${phasen}</div>
    <div class="mf-kacheln mf-vier">${kacheln}</div>
    <details class="mf-gliederung"><summary>${esc(t("schlaf_bedarf_gliederung"))}</summary><div class="mf-gl-inhalt">${teile}</div></details>
  </div>`;
}
