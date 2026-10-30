/* shell/apps/tagebuch.js – „Tagebuch“: was heute zutraf, und was mit der Erholung am nächsten Morgen zusammenhängt (docs/apps/tagebuch.md).
 *
 * Kernaussage: Du hakst mit großen Schaltern an, was am Tag zutraf (Alkohol, spätes Essen, draußen gewesen …). Gespeichert wird
 * sofort und nur auf deinem Gerät. Die Ansicht „Was hängt womit zusammen?“ vergleicht deine Erholung am Morgen danach – mit und
 * ohne das Verhalten – und sagt ehrlich, ob es schon genug Tage für eine Tendenz gibt.
 *
 * Routen: #/tagebuch (Formular für den gewählten Tag) · #/tagebuch/wirkung. Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx).
 * Kern (über shell/kern.js): tagebuchKatalog(), wirkung(erg, schluessel) → kern tagebuchWirkung; Speicher über ctx.tagebuchSetzen (shell/shell.js).
 */
import { t } from "../i18n/i18n.js";
import { prozent, zahl, dauer, tagLang, esc } from "../format.js";
import { balken } from "../viz/viz.js";
import { kernaussage, kopf, zahlKnopf, beleg, tHtml, IKON } from "../ui.js";
import { tagebuchKatalog, wirkung as wirkungRechnen } from "../kern.js";

const jaNein = (k) => k.art === "ja_nein" || k.art === "jaNein";
const ganz = (x) => (x === null || x === undefined ? x : Math.round(x));

function formular(ctx) {
  const e = ctx.bild?.tagebuch?.eintraege || ctx.tagebuchEigen?.[ctx.tag]?.eintraege || {};
  const zeilen = tagebuchKatalog().filter(jaNein).map((k) =>
    `<li><label class="mf-schalter"><span class="mf-schalter-text"><span>${esc(t("tb_" + k.schluessel))}</span><small>${esc(t("tb_" + k.schluessel + "_text"))}</small></span><input type="checkbox" role="switch" data-tb="${esc(k.schluessel)}"${e[k.schluessel] ? " checked" : ""}></label></li>`).join("");
  const atem = Number(e.atem) > 0 ? `<li><div class="mf-zeile"><span class="mf-zeile-text"><strong>${esc(t("tb_atem"))}</strong></span><span class="mf-zeile-rechts">${esc(dauer(Number(e.atem), { sekunden: true }))}</span></div></li>` : "";
  return `<div class="mf-sicht" data-sicht="tagebuch">
    ${kopf(t("tagebuch_titel"), { zurueck: "#/mehr" })}
    ${kernaussage(esc(t("tagebuch_kern")))}
    <section class="mf-abschnitt"><h2 class="mf-beschriftung">${esc(tagLang(ctx.tag))}</h2>
      <ul class="mf-liste mf-formular-liste">${zeilen}${atem}</ul>
      <p class="mf-status" role="status" aria-live="polite" data-tb-status></p>
    </section>
    <ul class="mf-liste"><li><a class="mf-zeile" href="#/tagebuch/wirkung"><span class="mf-zeile-text"><strong>${esc(t("tagebuch_wirkung_link"))}</strong></span><span class="mf-chevron">${IKON.rechts}</span></a></li></ul>
  </div>`;
}

function wirkung(ctx) {
  const B = beleg(ctx.register);
  const liste = tagebuchKatalog().filter(jaNein).map((k) => ({ k, w: wirkungRechnen(ctx.erg, k.schluessel) }));
  for (const { k, w } of liste) {
    const name = t("tb_" + k.schluessel), d = w.differenz;
    const teile = [{ name: t("wirkung_mit"), wert: `${prozent(ganz(w.mit.mittel))} · n = ${zahl(w.mit.n)}` }, { name: t("wirkung_ohne"), wert: `${prozent(ganz(w.ohne.mittel))} · n = ${zahl(w.ohne.n)}` }];
    B(`wirkung:${k.schluessel}`, { titel: name, wert: d === null ? "–" : `${d > 0 ? "+" : ""}${zahl(d)}`, formel: w.formel, teile, quellen: w.quellen || [] });
    B(`wirkung-mit:${k.schluessel}`, { titel: `${name} · ${t("wirkung_mit")}`, wert: prozent(ganz(w.mit.mittel)), formel: w.formel, teile: [teile[0]], quellen: w.quellen || [] });
    B(`wirkung-ohne:${k.schluessel}`, { titel: `${name} · ${t("wirkung_ohne")}`, wert: prozent(ganz(w.ohne.mittel)), formel: w.formel, teile: [teile[1]], quellen: w.quellen || [] });
  }
  const mitTendenz = liste.filter((x) => x.w.hinweis !== "zu_wenig" && x.w.differenz !== null).sort((a, b) => Math.abs(b.w.differenz) - Math.abs(a.w.differenz));
  const top = mitTendenz[0];
  const satz = top && top.w.differenz !== 0
    ? tHtml("wirkung_kern", { name: esc(t("tb_" + top.k.schluessel)), wert: zahlKnopf(`wirkung:${top.k.schluessel}`, zahl(Math.abs(top.w.differenz))), richtung: esc(t(top.w.differenz > 0 ? "wirkung_hoeher" : "wirkung_niedriger")) })
    : esc(t("wirkung_kern_leer"));
  const reihenfolge = [...mitTendenz, ...liste.filter((x) => !mitTendenz.includes(x))];
  const karten = reihenfolge.map(({ k, w }) => {
    const name = t("tb_" + k.schluessel);
    const diag = balken({ titel: name, kernaussage: t("wirkung_chart_kern", { mit: prozent(ganz(w.mit.mittel)), ohne: prozent(ganz(w.ohne.mittel)) }), max: 100, tabelle: false, reihen: [
      { name: t("wirkung_mit"), wert: w.mit.mittel ?? 0, text: prozent(ganz(w.mit.mittel)), q: `wirkung-mit:${k.schluessel}`, klasse: "vz-k2" },
      { name: t("wirkung_ohne"), wert: w.ohne.mittel ?? 0, text: prozent(ganz(w.ohne.mittel)), q: `wirkung-ohne:${k.schluessel}`, klasse: "vz-k0" },
    ] }).html;
    const zeile = w.differenz === null ? "" : `<p class="mf-leise">${tHtml("wirkung_zeile", { wert: zahlKnopf(`wirkung:${k.schluessel}`, `${w.differenz > 0 ? "+" : w.differenz < 0 ? "−" : ""}${zahl(Math.abs(w.differenz))}`), nmit: esc(zahl(w.mit.n)), nohne: esc(zahl(w.ohne.n)) })}</p>`;
    const wenig = w.hinweis === "zu_wenig" ? `<p class="mf-hinweis">${esc(t("wirkung_zu_wenig"))}</p>` : "";
    return `<div class="mf-karte mf-abschnitt" data-wirkung="${esc(k.schluessel)}">${diag}${zeile}${wenig}</div>`;
  }).join("");
  return `<div class="mf-sicht" data-sicht="wirkung">${kopf(t("wirkung_titel"), { zurueck: "#/tagebuch" })}${kernaussage(satz)}<p class="mf-hinweis">${esc(t("wirkung_tendenz"))}</p>${karten}</div>`;
}

export function ansicht(ctx) {
  return (ctx.route?.teile || [])[1] === "wirkung" ? wirkung(ctx) : formular(ctx);
}

export function binde(wurzel, ctx) {
  const status = wurzel.querySelector("[data-tb-status]");
  wurzel.querySelectorAll("input[data-tb]").forEach((el) => el.addEventListener("change", async () => {
    if (status) status.textContent = t("tagebuch_speichert");
    try { await ctx.tagebuchSetzen(ctx.tag, el.dataset.tb, el.checked); if (status) status.textContent = t("tagebuch_gespeichert"); }
    catch (e) { if (status) status.textContent = String(e?.message || e); }
  }));
  return () => {};
}
