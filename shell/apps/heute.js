/* shell/apps/heute.js – „Heute“: Ein Blick auf die Erholung des Tages (docs/apps/heute.md).
 *
 * Kernaussage: Oben steht ein Satz, wie erholt du heute bist, und darunter die eine große Zahl im Ring. Vier Kacheln zeigen
 * Belastung, Schlaf, HRV und Ruhepuls mit einem Pfeil gegenüber deinem üblichen Wert. Darunter lässt sich aufklappen, woraus
 * sich die Erholung zusammensetzt, und eine Linie zeigt die letzten sieben Tage. Jede Zahl öffnet ihren Beleg.
 *
 * Schnittstelle: ansicht(ctx) → HTML (rein, ohne DOM). ctx: { tag, bild, erg, register } (shell/shell.js)
 */
import { t } from "../i18n/i18n.js";
import { prozent, belastungText, dauerKurz, zahl, wochentag, tagLang, mitVorzeichen, esc } from "../format.js";
import { ring, kennzahlKachel, zeitreihe, fortschritt } from "../viz/viz.js";
import { kernaussage, leererTag, kopf, abschnitt, zahlKnopf, vergleich, beleg, tHtml } from "../ui.js";
import { belegeTag } from "../belege.js";
import { tagPlus } from "../kern.js";

export function kernsatz(bild, istHeute = true) {
  const e = bild?.erholung;
  if (!e || e.wert === null || e.wert === undefined) return esc(t("heute_kern_leer"));
  const satz1 = tHtml((istHeute ? "heute_kern_" : "tag_kern_") + e.stufe, { tag: esc(tagLang(bild.tag)), wert: zahlKnopf(`erholung:${bild.tag}`, prozent(e.wert)) });
  if (!bild.schlafRoh) return satz1;
  const kurz = bild.schlaf.dauerMs < bild.schlaf.bedarfMs;
  const ruhig = vergleich(bild.hrv?.wert, bild.basis.hrv).richtung !== "runter";
  return `${satz1} ${esc(t(`heute_nacht_${kurz ? "kurz" : "lang"}_${ruhig ? "ruhig" : "unruhig"}`))}`;
}

export function ansicht(ctx) {
  const { bild, tag, erg } = ctx, B = beleg(ctx.register);
  if (!bild) return leererTag(ctx, t("heute_titel"), "keine_daten_tag", "heute");
  belegeTag(B, bild);
  const e = bild.erholung, hatErholung = e && e.wert !== null && e.wert !== undefined;
  const held = hatErholung
    ? ring({ wert: zahl(e.wert), nach: "%", anteilBp: e.wert * 100, beschriftung: t("erholung"), zweitzeile: t("stufe_text", { stufe: t("stufe_" + e.stufe) }), stufe: e.stufe, q: `erholung:${tag}`, beschreibung: t("erholung_ring_desc") }).html
    : "";

  // Vier Kacheln
  const bel = bild.belastung, s = bild.schlaf;
  const kacheln = [
    kennzahlKachel({ titel: t("kachel_belastung"), wert: belastungText(bel.wert), einheit: t("einheit_von21"), q: `belastung:${tag}`,
      vergleich: vergleich(bel.wert, bild.basis.belastung, belastungText) }),
    kennzahlKachel({ titel: t("kachel_schlaf"), wert: bild.schlafRoh ? dauerKurz(s.dauerMs) : "–", q: bild.schlafRoh ? `schlaf-dauer:${tag}` : "",
      vergleich: bild.schlafRoh ? (s.dauerMs < s.bedarfMs ? { richtung: "runter", text: t("vgl_bedarf_unter") } : { richtung: "gleich", text: t("vgl_bedarf_gedeckt") }) : null }),
    kennzahlKachel({ titel: t("kachel_hrv"), wert: bild.hrv ? zahl(bild.hrv.wert) : "–", einheit: t("einheit_ms"), q: bild.hrv ? `hrv:${tag}` : "",
      vergleich: vergleich(bild.hrv?.wert, bild.basis.hrv, (x) => `${zahl(x)} ${t("einheit_ms")}`) }),
    kennzahlKachel({ titel: t("kachel_ruhepuls"), wert: bild.ruhepuls ? zahl(bild.ruhepuls.wert) : "–", einheit: t("einheit_bpm"), q: bild.ruhepuls ? `ruhepuls:${tag}` : "",
      vergleich: vergleich(bild.ruhepuls?.wert, bild.basis.ruhepuls, (x) => `${zahl(x)} ${t("einheit_bpm")}`) }),
  ].map((k) => k.html).join("");

  // Gliederung: Bestandteile der Erholung mit Gewichten
  // Je Teil: Beitrag in Punkten um die Mitte 50 und Gewicht; der Balken zeigt das Gewicht (Abzüge ohne Gewicht: kein Balken)
  const teile = hatErholung ? e.teile.map((x) => `<div class="mf-teil"><span class="mf-teil-name">${esc(t("teil_" + x.name))} <span class="mf-teil-gewicht">· ${esc(x.gewicht === null ? t("abzug") : t("gewicht", { wert: prozent(x.gewicht) }))}</span></span>${zahlKnopf(`erholung-teil:${tag}:${x.name}`, t("punkte", { wert: mitVorzeichen(x.beitrag) }))}${x.gewicht === null ? "" : fortschritt({ titel: t("gewicht", { wert: prozent(x.gewicht) }), wert: x.gewicht, ohneWert: true, klasse: "vz-k1" }).html}</div>`).join("") : "";
  const gliederung = hatErholung ? `<details class="mf-gliederung"><summary>${esc(t("heute_gliederung"))}</summary><div class="mf-gl-inhalt"><p class="mf-leise">${esc(t("heute_gliederung_satz"))}</p>${teile}</div></details>` : "";

  // Sieben Tage
  const tage = [];
  for (let i = 6; i >= 0; i--) { const b = erg.tage.get(tagPlus(tag, -i)); if (b?.erholung?.wert !== null && b?.erholung?.wert !== undefined) tage.push(b); }
  for (const b of tage) belegeTag(B, b);
  const gruen = tage.filter((b) => b.erholung.stufe === "gruen").length;
  const woche = zeitreihe({ titel: t("heute_woche_titel"), kernaussage: t("heute_woche_kern", { n: zahl(gruen), gesamt: zahl(tage.length) }), min: 0, max: 100,
    reihen: tage.map((b) => ({ name: wochentag(b.tag), wert: b.erholung.wert, text: prozent(b.erholung.wert), q: `erholung:${b.tag}`, klasse: "vz-" + b.erholung.stufe })) }).html;

  return `<div class="mf-sicht" data-sicht="heute">
    ${kopf(t("heute_titel"))}
    <div class="mf-held">${kernaussage(kernsatz(bild, tag === ctx.heute))}${held}</div>
    <div class="mf-kacheln mf-vier">${kacheln}</div>
    ${gliederung}
    ${abschnitt("", `<div class="mf-karte">${woche}</div>`)}
  </div>`;
}
