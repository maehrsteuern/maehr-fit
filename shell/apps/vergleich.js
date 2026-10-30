/* shell/apps/vergleich.js – „Vergleich mit WHOOP“: WHOOP sagte X, MAEHR FIT rechnet Y (docs/apps/vergleich.md).
 *
 * Kernaussage: Wer einen WHOOP-Export einliest, bekommt WHOOPs eigene Zahlen für Erholung, Belastung und Schlafleistung mit.
 * Diese Ansicht stellt sie Tag für Tag neben die Zahlen von MAEHR FIT. Oben steht ein Satz, an wie vielen Tagen beide nah
 * beieinanderliegen, darunter je eine Linie für MAEHR FIT und für WHOOP, die Tabelle Tag für Tag und eine Übersicht mit mittlerem
 * Abstand und größter Abweichung. Ein Urteil, welche Zahl stimmt, gibt es nicht: WHOOPs Rechenweg ist nicht bekannt.
 *
 * Route: #/vergleich?feld=erholung|belastung|schlaf&tag=JJJJ-MM-TT (tag hebt eine Zeile hervor).
 * Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx). Rechnen: shell/kern.js vergleich(erg, feld) (Zehntel, formeln.json
 * „vergleich.abstand“, „vergleich.nah.*“). Belege: MF-Zahl → wie überall (erholung:/belastung:/schlaf:<tag>), WHOOP-Zahl →
 * fremd:<feld>:<tag> (Datei und Zeile im Export), Abstand → vergleich:<feld>:<tag>, Übersicht → vergleich-mittel:<feld>.
 */
import { t } from "../i18n/i18n.js";
import { zahl, mitVorzeichen, tagKurz, wochentag, esc } from "../format.js";
import { zeitreihe } from "../viz/viz.js";
import { kernaussage, kopf, abschnitt, zahlKnopf, beleg, tHtml } from "../ui.js";
import { belegeTag } from "../belege.js";
import { vergleich, VERGLEICH_FELDER } from "../kern.js";

const Q_MF = { erholung: "erholung", belastung: "belastung", schlaf: "schlaf" };
/** Zehntel → Anzeige: Erholung und Schlafleistung als Punkte 0–100, Belastung mit einer Nachkommastelle. */
const stellen = (feld, x) => (feld === "belastung" || x % 10 !== 0 ? 1 : 0);
const wertText = (feld, x) => (x === null || x === undefined ? "–" : zahl(x / 10, stellen(feld, x)));
const abstandText = (feld, x) => (x === null || x === undefined ? "–" : mitVorzeichen(x / 10, stellen(feld, x)));
const betragText = (feld, x) => (x === null || x === undefined ? "–" : zahl(x / 10, stellen(feld, x)));
const tagText = (tag) => `${wochentag(tag)} ${tagKurz(tag)}`;

/** Belege einer Kennzahl anmelden (MF-Tage über belegeTag, Abstände, Mittel). */
function belegeFeld(B, ctx, v) {
  const feldName = t("vgl_feld_" + v.feld);
  for (const z of v.zeilen) {
    belegeTag(B, ctx.erg.tage.get(z.tag));
    if (z.abstand === null) continue;
    B(`vergleich:${v.feld}:${z.tag}`, { titel: t("vgl_abstand_titel", { feld: feldName, tag: tagText(z.tag) }), wert: abstandText(v.feld, z.abstand), formel: v.formel,
      teile: [{ name: t("vgl_teil_mf"), wert: wertText(v.feld, z.mf) }, { name: t("vgl_teil_whoop"), wert: wertText(v.feld, z.whoop) }], quellen: z.quelle ? [z.quelle] : [] });
  }
  B(`vergleich-mittel:${v.feld}`, { titel: t("vgl_mittel_titel", { feld: feldName }), wert: betragText(v.feld, v.mittelAbstand), formel: v.formel,
    teile: [{ name: t("vgl_teil_n"), wert: zahl(v.n) }, { name: t("vgl_teil_nah"), wert: zahl(v.nah) }, { name: t("vgl_teil_grenze"), wert: betragText(v.feld, v.grenze) },
      { name: t("vgl_teil_differenz"), wert: abstandText(v.feld, v.mittelDifferenz) }],
    quellen: v.zeilen.filter((z) => z.abstand !== null && z.quelle).map((z) => z.quelle) });
}

function kernsatz(v) {
  const feld = esc(t("vgl_satz_" + v.feld));
  if (!v.n) return esc(t("vgl_kern_keine", { feld: t("vgl_satz_" + v.feld) }));
  const q = `vergleich-mittel:${v.feld}`;
  return tHtml("vgl_kern", { n: zahlKnopf(q, zahl(v.nah)), gesamt: zahlKnopf(q, zahl(v.n)), feld, grenze: zahlKnopf(q, betragText(v.feld, v.grenze)) });
}

function diagramme(v) {
  const beide = v.zeilen.filter((z) => z.abstand !== null);
  if (!beide.length) return "";
  const feldName = t("vgl_feld_" + v.feld), max = v.feld === "belastung" ? 21 : 100;
  const reihe = (wer) => beide.map((z) => ({ name: tagKurz(z.tag), wert: z[wer] / 10, text: wertText(v.feld, z[wer]), q: wer === "mf" ? `${Q_MF[v.feld]}:${z.tag}` : `fremd:${v.feld}:${z.tag}` }));
  const mf = zeitreihe({ titel: t("vgl_chart_mf", { feld: feldName }), kernaussage: t("vgl_chart_mf_kern"), min: 0, max, abNull: true, reihen: reihe("mf") }).html;
  const wh = zeitreihe({ titel: t("vgl_chart_whoop", { feld: feldName }), kernaussage: t("vgl_chart_whoop_kern"), min: 0, max, abNull: true, reihen: reihe("whoop") }).html;
  return `<div class="mf-vgl-paar"><div class="mf-karte" data-vgl-reihe="mf">${mf}</div><div class="mf-karte" data-vgl-reihe="whoop">${wh}</div></div>`;
}

function tageTabelle(v, aktiv) {
  if (!v.zeilen.length) return "";
  const zelle = (q, text, da) => (da ? zahlKnopf(q, text) : `<span class="mf-leise">–</span>`);
  const zeilen = [...v.zeilen].reverse().map((z) => `<tr${z.tag === aktiv ? ' class="mf-vgl-aktiv" aria-current="date"' : ""}><td>${esc(tagText(z.tag))}</td>
    <td class="rechts">${zelle(`${Q_MF[v.feld]}:${z.tag}`, wertText(v.feld, z.mf), z.mf !== null)}</td>
    <td class="rechts">${zelle(`fremd:${v.feld}:${z.tag}`, wertText(v.feld, z.whoop), z.whoop !== null)}</td>
    <td class="rechts">${zelle(`vergleich:${v.feld}:${z.tag}`, abstandText(v.feld, z.abstand), z.abstand !== null)}</td></tr>`).join("");
  return `<table class="mf-tab mf-vgl-tab"><thead><tr><th>${esc(t("vgl_sp_tag"))}</th><th class="rechts">${esc(t("vgl_sp_mf"))}</th><th class="rechts">${esc(t("vgl_sp_whoop"))}</th><th class="rechts">${esc(t("vgl_sp_abstand"))}</th></tr></thead><tbody>${zeilen}</tbody></table>`;
}

/** Übersicht je Messwert: Tage mit beiden Werten, mittlerer Abstand, größte Abweichung mit Tag – als Kärtchen statt breiter Tabelle (390 px). */
function uebersicht(alle) {
  const leer = `<span class="mf-leise">–</span>`;
  const stat = (titel, inhalt) => `<div class="mf-vgl-stat"><span class="mf-beschriftung">${esc(titel)}</span><span class="mf-vgl-stat-wert">${inhalt}</span></div>`;
  return `<ul class="mf-vgl-uebersicht">${alle.map((v) => {
    const q = `vergleich-mittel:${v.feld}`, g = v.groesste;
    const groesste = g ? `${zahlKnopf(`vergleich:${v.feld}:${g.tag}`, abstandText(v.feld, g.abstand))}<small class="mf-leise">${esc(t("vgl_am", { tag: tagText(g.tag) }))}</small>` : leer;
    return `<li><a class="mf-link" href="#/vergleich?feld=${v.feld}">${esc(t("vgl_feld_" + v.feld))}</a><div class="mf-vgl-stats">${stat(t("vgl_sp_tage"), zahlKnopf(q, zahl(v.n)))}${stat(t("vgl_sp_mittel"), v.n ? zahlKnopf(q, betragText(v.feld, v.mittelAbstand)) : leer)}${stat(t("vgl_sp_groesste"), groesste)}</div></li>`;
  }).join("")}</ul>`;
}

export function ansicht(ctx) {
  const a = ctx.route?.abfrage || {};
  const feld = VERGLEICH_FELDER.includes(a.feld) ? a.feld : "erholung";
  const B = beleg(ctx.register);
  const alle = VERGLEICH_FELDER.map((f) => vergleich(ctx.erg, f));
  const v = alle.find((x) => x.feld === feld);
  const hatFremd = ctx.erg.liste.some((b) => b.fremd);
  if (!hatFremd) {
    return `<div class="mf-sicht" data-sicht="vergleich">
      ${kopf(t("vgl_titel"), { zurueck: "#/mehr" })}
      ${kernaussage(esc(t("vgl_kern_leer")))}
      <div class="mf-knopfreihe"><a class="mf-knopf primaer" href="#/daten">${esc(t("vgl_daten_knopf"))}</a></div>
    </div>`;
  }
  for (const x of alle) belegeFeld(B, ctx, x);
  const wahl = `<div class="mf-feld"><span id="vgl-wahl">${esc(t("vgl_wahl"))}</span><div class="mf-wahl" role="group" aria-labelledby="vgl-wahl">${VERGLEICH_FELDER.map((f) =>
    `<button type="button" data-vgl-feld="${f}" aria-pressed="${f === feld}">${esc(t("vgl_feld_" + f))}</button>`).join("")}</div></div>`;
  const fehlt = v.nurWhoop ? `<p class="mf-hinweis" data-vgl-fehlt>${esc(t(v.feld === "belastung" ? "vgl_nur_whoop_belastung" : "vgl_nur_whoop", { n: zahl(v.nurWhoop) }))}</p>` : "";
  return `<div class="mf-sicht" data-sicht="vergleich" data-feld="${feld}">
    ${kopf(t("vgl_titel"), { zurueck: "#/mehr" })}
    ${kernaussage(kernsatz(v))}
    <p class="mf-leise">${esc(t("vgl_hinweis"))}</p>
    <div class="mf-formular">${wahl}</div>
    ${fehlt}
    ${diagramme(v)}
    ${abschnitt(t("vgl_tage_titel"), `<div class="mf-karte mf-vgl-tabelle">${tageTabelle(v, a.tag)}</div>`)}
    ${abschnitt(t("vgl_uebersicht"), `<div class="mf-karte mf-vgl-tabelle">${uebersicht(alle)}</div>`)}
  </div>`;
}

export function binde(wurzel) {
  const sicht = wurzel.querySelector('[data-sicht="vergleich"]');
  if (!sicht) return () => {};
  sicht.addEventListener("click", (ev) => {
    const k = ev.target.closest("button[data-vgl-feld]"); if (!k) return;
    location.hash = `#/vergleich?feld=${k.dataset.vglFeld}`;
  });
  return () => {};
}
