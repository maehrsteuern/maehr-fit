/* shell/apps/belastung.js – „Belastung“: wie sehr dich der Tag gefordert hat (docs/apps/belastung.md).
 *
 * Kernaussage: Der Satz oben nennt die Belastung des Tages auf der Skala von 0 bis 21 und vergleicht sie mit deinen üblichen
 * Tagen. Der Bogen zeigt dieselbe Zahl, die Balken zeigen, wie lange dein Puls in welcher Zone lag, und darunter stehen die
 * Trainings. Ein Tipp auf ein Training öffnet seine Pulskurve. Jede Zahl öffnet ihren Beleg. „Training live aufzeichnen“ führt
 * zur Live-Ansicht (#/live, shell/apps/live.js).
 *
 * Routen: #/belastung (Tag) · #/belastung/training/<id> (ein Training). Schnittstelle: ansicht(ctx) → HTML.
 */
import { t } from "../i18n/i18n.js";
import { belastungText, dauer, uhrzeit, zahl, tagLang, esc } from "../format.js";
import { ring, zonen, zeitreihe } from "../viz/viz.js";
import { kernaussage, leererTag, kopf, abschnitt, zahlKnopf, vergleich, beleg, tHtml, IKON } from "../ui.js";
import { belegeTag } from "../belege.js";

/** Weg zur Live-Aufzeichnung (shell/apps/live.js). */
const liveLink = () => `<div class="mf-knopfreihe"><a class="mf-knopf" href="#/live?von=belastung" data-live-link>${IKON.belastung}<span>${esc(t("belastung_live"))}</span></a></div>`;
const artName = (art) => t("art_" + (["laufen", "rad", "kraft", "gehen"].includes(art) ? art : "sonst"));

function zonenDiagramm(zonenListe, qPraefix, titel, kern) {
  return zonen({ titel, kernaussage: kern, zonen: zonenListe.map((z) => ({ zone: z.zone, name: t("zone_" + z.zone), ms: z.ms, text: dauer(z.ms), q: `${qPraefix}:${z.zone}` })) }).html;
}
function zonenKern(zonenListe) {
  const max = zonenListe.reduce((a, z) => (z.ms > (a?.ms || 0) ? z : a), null);
  return max ? t("zonen_kern", { zone: max.zone }) : t("zonen_kern_leer");
}

function trainingBelege(B, tr) {
  const b = tr.belastung;
  B(`training:${tr.id}`, { titel: artName(tr.roh.art), wert: `${belastungText(b.wert)} ${t("einheit_von21")}`, formel: b.formel,
    teile: b.zonen.map((z) => ({ name: t("zone_" + z.zone), wert: dauer(z.ms) })), quellen: [tr.roh.quelle, ...(b.quellen || [])] });
  for (const z of b.zonen) B(`training-zone:${tr.id}:${z.zone}`, { titel: t("zone_" + z.zone), wert: dauer(z.ms), formel: b.formel, teile: [], quellen: z.quelle || [] });
}

function detail(ctx, id) {
  const { bild } = ctx, B = beleg(ctx.register);
  const tr = bild?.trainings.find((x) => x.id === id);
  if (!tr) return `<div class="mf-sicht" data-sicht="training">${kopf(t("belastung_titel"), { zurueck: "#/belastung" })}${kernaussage(esc(t("training_nicht_gefunden")))}</div>`;
  trainingBelege(B, tr);
  const hs = tr.roh.herzschlaege || [];
  // Pulskurve: höchstens 60 Punkte (jeder n-te Messwert), damit die Linie ruhig bleibt; jeder Punkt behält seine Quelle
  const jede = Math.max(1, Math.ceil(hs.length / 60));
  const punkte = hs.filter((_, i) => i % jede === 0 || i === hs.length - 1);
  punkte.forEach((h, i) => B(`puls:${tr.id}:${i}`, { titel: t("messwert"), wert: `${zahl(h.bpm)} ${t("einheit_bpm")}`, formel: null, teile: [{ name: uhrzeit(h.t), wert: `${zahl(h.bpm)} ${t("einheit_bpm")}` }], quellen: [h.quelle] }));
  const spitze = hs.reduce((m, h) => Math.max(m, h.bpm), 0);
  const kurve = zeitreihe({ titel: t("puls_titel"), kernaussage: t("puls_kern", { wert: zahl(spitze) }),
    reihen: punkte.map((h, i) => ({ name: uhrzeit(h.t), wert: h.bpm, text: `${zahl(h.bpm)}`, q: `puls:${tr.id}:${i}`, quelle: h.quelle })) }).html;
  const satz = tHtml("training_kern", { art: esc(artName(tr.roh.art)), von: esc(uhrzeit(tr.roh.von)), bis: esc(uhrzeit(tr.roh.bis)), wert: zahlKnopf(`training:${tr.id}`, belastungText(tr.belastung.wert)) });
  return `<div class="mf-sicht" data-sicht="training">
    ${kopf(artName(tr.roh.art), { zurueck: "#/belastung" })}
    ${kernaussage(satz)}
    <div class="mf-karte">${kurve}</div>
    <div class="mf-karte">${zonenDiagramm(tr.belastung.zonen, `training-zone:${tr.id}`, t("zonen_training_titel"), t("zonen_training_kern"))}</div>
  </div>`;
}

export function ansicht(ctx) {
  const teile = ctx.route?.teile || [];
  if (teile[1] === "training" && teile[2]) return detail(ctx, decodeURIComponent(teile[2]));
  const { bild, tag } = ctx, B = beleg(ctx.register);
  if (!bild) return leererTag(ctx, t("belastung_titel"), "keine_daten_tag", "belastung").replace(/<\/div>$/, `${liveLink()}</div>`);
  belegeTag(B, bild);
  const bel = bild.belastung, v = vergleich(bel.wert, bild.basis.belastung);
  const art = v.richtung === "hoch" ? "mehr" : v.richtung === "runter" ? "weniger" : "gleich";
  const satz = tHtml((tag === ctx.heute ? "belastung_kern_" : "belastung_tag_") + art, { tag: esc(tagLang(tag)), wert: zahlKnopf(`belastung:${tag}`, belastungText(bel.wert)) });
  const bogen = ring({ wert: belastungText(bel.wert), anteilBp: Math.round((bel.wert / 210) * 10000), beschriftung: t("belastung_label"), zweitzeile: t("einheit_von21"), q: `belastung:${tag}`, beschreibung: t("belastung_ring_desc") }).html;
  for (const tr of bild.trainings) trainingBelege(B, tr);
  const liste = bild.trainings.length
    ? `<ul class="mf-liste">${bild.trainings.map((tr) => `<li><a class="mf-zeile" href="#/belastung/training/${encodeURIComponent(tr.id)}"><span class="mf-zeile-text"><strong>${esc(artName(tr.roh.art))}</strong><small>${esc(t("training_zeile", { zeit: uhrzeit(tr.roh.von), dauer: dauer(tr.roh.bis - tr.roh.von) }))}</small></span><span class="mf-zeile-rechts"><span class="zahl-text">${esc(belastungText(tr.belastung.wert))}</span><span class="mf-chevron">${IKON.rechts}</span></span></a></li>`).join("")}</ul>`
    : `<p class="mf-hinweis">${esc(t("trainings_leer"))}</p>`;
  return `<div class="mf-sicht" data-sicht="belastung">
    ${kopf(t("belastung_titel"))}
    <div class="mf-held">${kernaussage(satz)}${bogen}</div>
    <div class="mf-karte">${zonenDiagramm(bel.zonen, `zone:${tag}`, t("zonen_titel"), zonenKern(bel.zonen))}</div>
    ${abschnitt(t("trainings_titel"), liste + liveLink())}
  </div>`;
}
