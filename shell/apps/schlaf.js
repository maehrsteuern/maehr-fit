/* shell/apps/schlaf.js – „Schlaf“: wie viel du gebraucht und wie viel du bekommen hast (docs/apps/schlaf.md).
 *
 * Kernaussage: Der Satz oben sagt, ob die Nacht deinen Schlafbedarf gedeckt hat. Darunter steht die Nacht als Bild: jede
 * Schlafphase ein Band über die Uhrzeit, Wachphasen als bernsteinfarbene Marken. Dann Bedarf gegen geschlafene Zeit als
 * Doppelbalken (der gestreifte Rest hat gefehlt) und vier Kacheln: Schlafleistung, Regelmäßigkeit (sieben Nächte als Punkte),
 * Schlafschuld und die Zeit im Bett. Aufklappbar steht, woraus sich dein Bedarf zusammensetzt. Jede Zahl öffnet ihren Beleg.
 *
 * Schnittstelle: ansicht(ctx) → HTML. Werte aus dem Tagesbild (shell/kern.js → kern/tag.js: Schlafleistung, Bedarf, Konsistenz).
 */
import { t } from "../i18n/i18n.js";
import { prozent, dauer, dauerKurz, uhrzeit, esc } from "../format.js";
import { kennzahlKachel, hypnogramm, bedarfBalken, minibogen, sparkline } from "../viz/viz.js";
import { letzteTage } from "./heute.js";
import { kernaussage, leererTag, kopf, zahlKnopf, beleg, tHtml } from "../ui.js";
import { belegeTag, phasenVon, PHASEN } from "../belege.js";

export function ansicht(ctx) {
  const { bild, tag, erg } = ctx, B = beleg(ctx.register);
  if (!bild || !bild.schlafRoh) return leererTag(ctx, t("schlaf_titel"), "schlaf_kern_leer", "schlaf");
  belegeTag(B, bild);
  const s = bild.schlaf, fehlt = s.bedarfMs - s.dauerMs;
  const satz = fehlt > 0
    ? tHtml("schlaf_kern_weniger", { wert: zahlKnopf(`schlaf-schuld:${tag}`, dauer(fehlt)) })
    : tHtml("schlaf_kern_genug", { wert: zahlKnopf(`schlaf-dauer:${tag}`, dauer(s.dauerMs)) });

  // Die Nacht als Hypnogramm: Phasen als Bänder über die Zeit, darunter die Summen je Phase
  const ph = phasenVon(s), gesamt = PHASEN.reduce((x, a) => x + (ph[a] || 0), 0) || 1;
  const anteilTiefRem = Math.round((((ph.tief || 0) + (ph.rem || 0)) / gesamt) * 100);
  const roh = bild.schlafRoh, abschnitte = Array.isArray(roh.phasen) ? roh.phasen.map((p) => ({ von: p.von, bis: p.bis ?? p.von + (p.ms || 0), art: p.art })) : [];
  const nacht = hypnogramm({ titel: t("schlaf_nacht_titel"), kernaussage: t("schlaf_phasen_kern", { wert: prozent(anteilTiefRem) }), phasen: abschnitte, vonMs: roh.von, bisMs: roh.bis, zeit: uhrzeit,
    summen: ["tief", "rem", "leicht", "wach"].map((a) => ({ art: a, name: t("phase_" + a), kurz: t("phase_kurz_" + a), text: dauer(ph[a] || 0), q: `schlaf-phase:${tag}:${a}` })) }).html;

  const bedarf = bedarfBalken({ titel: t("schlaf_bedarf_titel"), kernaussage: fehlt > 0 ? t("schlaf_bedarf_kern_schuld") : t("schlaf_bedarf_kern"),
    bedarf: { name: t("schlaf_bedarf"), wert: s.bedarfMs, text: dauerKurz(s.bedarfMs), q: `schlaf-bedarf:${tag}` },
    ist: { name: t("schlaf_geschlafen"), wert: s.dauerMs, text: dauerKurz(s.dauerMs), q: `schlaf-dauer:${tag}` },
    schuld: fehlt > 0 ? { name: t("schlaf_schuld_teil"), wert: fehlt, text: dauer(fehlt), q: `schlaf-schuld:${tag}` } : null }).html;

  // Regelmäßigkeit: sieben Nächte als Punktreihe (Höhe = Wert 0–100) in der Kachel
  const k = s.konsistenz || { wert: null };
  if (k.wert !== null) B(`schlaf-konstanz:${tag}`, { titel: t("kachel_konstanz"), wert: prozent(k.wert), formel: k.formel, teile: [], quellen: k.quellen || [] });
  const naechte = letzteTage(erg, tag, 7, (b) => b.schlaf?.konsistenz?.wert);
  const punktreihe = naechte.length ? sparkline({ breite: 120, hoehe: 30, plaetze: 7, min: 0, max: 100, alle: true, linie: false, radius: 3.5, klasse: "vz-punktreihe",
    aria: t("schlaf_konstanz_7"), punkte: naechte.map((x) => ({ x: x.x, wert: x.wert, klasse: "vz-akzent" })) }).svg : "";
  const kacheln = [
    kennzahlKachel({ titel: t("kachel_leistung"), wert: prozent(s.wert), q: `schlaf:${tag}`, bild: minibogen({ anteilBp: (s.wert || 0) * 100, klasse: "vz-akzent" }).svg,
      vergleich: { richtung: fehlt > 0 ? "runter" : "gleich", text: t("leistung_satz") } }),
    kennzahlKachel({ titel: t("kachel_konstanz"), wert: k.wert === null ? "–" : prozent(k.wert), q: k.wert === null ? "" : `schlaf-konstanz:${tag}`, bild: punktreihe, vergleich: { richtung: "neu", text: t("konstanz_satz") } }),
    kennzahlKachel({ titel: t("kachel_schuld"), wert: dauerKurz(Math.max(0, s.schuld)), q: `schlaf-schuld:${tag}`, vergleich: { richtung: s.schuld > 0 ? "runter" : "gleich", text: t("schuld_satz") } }),
    kennzahlKachel({ titel: t("kachel_zeiten"), wert: uhrzeit(roh.von), q: `schlaf-zeiten:${tag}`, vergleich: { richtung: "neu", text: t("zeiten_satz", { von: uhrzeit(roh.von), bis: uhrzeit(roh.bis) }) } }),
  ].map((x) => x.html).join("");

  const teile = (bild.bedarf.teile || []).filter((x) => x.ms !== 0).map((x) => `<div class="mf-teil"><span class="mf-teil-name">${esc(t("bedarf_" + x.name))}</span>${zahlKnopf(`schlaf-bedarf:${tag}`, dauer(x.ms))}</div>`).join("");
  return `<div class="mf-sicht" data-sicht="schlaf">
    ${kopf(t("schlaf_titel"))}
    ${kernaussage(satz)}
    <div class="mf-karte">${nacht}</div>
    <div class="mf-karte">${bedarf}</div>
    <div class="mf-kacheln mf-vier">${kacheln}</div>
    <details class="mf-gliederung"><summary>${esc(t("schlaf_bedarf_gliederung"))}</summary><div class="mf-gl-inhalt">${teile}</div></details>
  </div>`;
}
