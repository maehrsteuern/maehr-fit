/* shell/apps/trends.js – „Trends“: Woche und Monat im Verlauf (docs/apps/trends.md).
 *
 * Kernaussage: Du wählst einen Messwert (Erholung, HRV, Ruhepuls, Schlafdauer) und einen Zeitraum (7 oder 30 Tage). Ein einziges
 * Diagramm zeigt die Tageswerte als Linie mit weich auslaufender Fläche und deinen üblichen Bereich als hellen Streifen; der gewählte
 * (sonst der letzte) Punkt trägt eine kleine Karte mit Tag und Wert. Messwert und Zeitraum wählst du in Pillen-Gruppen. Der Satz oben sagt, ob der letzte Wert
 * darüber, darunter oder darin liegt. Jeder Punkt öffnet seinen Beleg.
 *
 * Route: #/trends?feld=hrv&fenster=30. Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx). Kern (über shell/kern.js): trendPunkte → kern trend (Band = Mittel ± Streuung der Tage davor).
 */
import { t } from "../i18n/i18n.js";
import { prozent, zahl, dauerKurz, tagKurz, esc } from "../format.js";
import { zeitreihe } from "../viz/viz.js";
import { kernaussage, kopf, beleg, tHtml } from "../ui.js";
import { trendPunkte } from "../kern.js";

export const FELDER = ["erholung", "hrv", "ruhepuls", "schlaf"];
export const FENSTER = [7, 30];
const FORMAT = {
  erholung: (x) => prozent(Math.round(x)), hrv: (x) => `${zahl(x)} ${t("einheit_ms")}`, ruhepuls: (x) => `${zahl(x)} ${t("einheit_bpm")}`, schlaf: (x) => dauerKurz(x),
};

export function ansicht(ctx) {
  const a = ctx.route?.abfrage || {};
  const feld = FELDER.includes(a.feld) ? a.feld : "hrv", fenster = FENSTER.includes(Number(a.fenster)) ? Number(a.fenster) : 7;
  const B = beleg(ctx.register), fmt = FORMAT[feld];
  const punkte = trendPunkte(ctx.erg, feld, { fenster, bis: ctx.tag });
  for (const p of punkte) B(`trend:${feld}:${p.tag}`, { titel: `${t("feld_" + feld + "_titel")} · ${tagKurz(p.tag)}`, wert: fmt(p.wert), formel: p.formel,
    teile: p.basis?.n ? [{ name: t("basis_mittel"), wert: fmt(p.basis.mittel) }, { name: t("basis_streuung"), wert: fmt(p.basis.streuung) }, { name: t("basis_n"), wert: zahl(p.basis.n) }] : [], quellen: p.quellen || [] });
  const letzter = punkte[punkte.length - 1], b = letzter?.basis;
  let satz = esc(t("trends_kern_leer")), band = null;
  if (letzter && b?.n) {
    const s = Number(b.streuung) || 0;
    const oben = letzter.band ? letzter.band.oben : b.mittel + s, unten = letzter.band ? letzter.band.unten : b.mittel - s;
    const lage = letzter.wert > oben ? "drueber" : letzter.wert < unten ? "drunter" : "drin";
    satz = tHtml("trends_kern_" + lage, { feld: esc(t("feld_" + feld)) });
    const bd = letzter.band || { unten: b.mittel - s, oben: b.mittel + s };
    band = { unten: bd.unten, oben: bd.oben, text: t("band_ueblich") };
  }
  const titel = t("trends_chart_titel", { feld: t("feld_" + feld + "_titel"), fenster: t("fenster_" + fenster) });
  const diagramm = zeitreihe({ titel, kernaussage: t("trends_chart_kern"), band, abNull: feld === "erholung", flaeche: true, karten: true,
    reihen: punkte.map((p) => ({ name: tagKurz(p.tag), wert: p.wert, text: fmt(p.wert), q: `trend:${feld}:${p.tag}` })) }).html;
  const wahl = (art, werte, jetzt, name) => `<div class="mf-feld"><span id="tr-${art}">${esc(name)}</span><div class="mf-wahl mf-segment" style="--segmente:${werte.length}" role="group" aria-labelledby="tr-${art}">${werte.map((w) =>
    `<button type="button" data-tr-${art}="${w}" aria-pressed="${String(w) === String(jetzt)}">${esc(art === "feld" ? t("feld_" + w + "_titel") : t("fenster_" + w))}</button>`).join("")}</div></div>`;
  return `<div class="mf-sicht" data-sicht="trends" data-feld="${feld}" data-fenster="${fenster}">
    ${kopf(t("trends_titel"), { zurueck: "#/mehr" })}
    ${kernaussage(satz)}
    <div class="mf-formular">${wahl("feld", FELDER, feld, t("trends_feld"))}${wahl("fenster", FENSTER, fenster, t("trends_fenster"))}</div>
    <div class="mf-karte">${diagramm}</div>
  </div>`;
}

export function binde(wurzel) {
  const sicht = wurzel.querySelector('[data-sicht="trends"]');
  if (!sicht) return () => {};
  sicht.addEventListener("click", (ev) => {
    const k = ev.target.closest("button[data-tr-feld], button[data-tr-fenster]"); if (!k) return;
    const feld = k.dataset.trFeld || sicht.dataset.feld, fenster = k.dataset.trFenster || sicht.dataset.fenster;
    location.hash = `#/trends?feld=${feld}&fenster=${fenster}`;
  });
  return () => {};
}
