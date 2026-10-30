/* shell/apps/heute.js – „Heute“: Ein Blick auf die Erholung des Tages (docs/apps/heute.md).
 *
 * Kernaussage: Oben steht ein Satz, wie erholt du heute bist, und darunter die eine große Zahl im leuchtenden Ring; ein feiner
 * Strich am Ring zeigt dein Mittel der letzten 30 Tage, darunter sieben Punkte für die letzten sieben Tage. Vier Kacheln zeigen
 * Belastung, Schlaf, HRV und Ruhepuls je mit kleinem Bild und dem Abstand zu deinem üblichen Wert als Pille („+6 ms“). Darunter
 * lässt sich aufklappen, woraus sich die Erholung zusammensetzt. Jede Zahl öffnet ihren Beleg. Gibt es für den Tag
 * WHOOPs eigene Zahlen (WHOOP-Export), führt ein kleiner Link zum Vergleich (#/vergleich).
 *
 * Schnittstelle: ansicht(ctx) → HTML (rein, ohne DOM). ctx: { tag, bild, erg, register } (shell/shell.js)
 */
import { t } from "../i18n/i18n.js";
import { prozent, belastungText, dauerKurz, dauer, zahl, wochentag, tagLang, mitVorzeichen, esc } from "../format.js";
import { ring, kennzahlKachel, fortschritt, sparkline, minibogen, streifen } from "../viz/viz.js";
import { kernaussage, leererTag, kopf, abschnitt, zahlKnopf, vergleich, beleg, tHtml } from "../ui.js";
import { belegeTag, phasenVon, PHASEN_KLASSE } from "../belege.js";
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

/** Werte eines Felds der letzten n Tage bis einschließlich tag: [{ x, tag, bild, wert }] (x = Platz 0…n−1, Lücken bleiben). */
export function letzteTage(erg, tag, n, wertVon) {
  const aus = [];
  for (let i = n - 1; i >= 0; i--) { const tg = tagPlus(tag, -i), b = erg.tage.get(tg), w = b ? wertVon(b) : null; if (w !== null && w !== undefined && Number.isFinite(Number(w))) aus.push({ x: n - 1 - i, tag: tg, bild: b, wert: Number(w) }); }
  return aus;
}
const mittelVon = (liste) => (liste.length ? liste.reduce((s, x) => s + x.wert, 0) / liste.length : null);
/** Abstand zum Mittel mit Vorzeichen, gerundet wie die Anzeige: „+6 ms“, „−1,2“, „±0“. */
function abstand(wert, mittel, fmt) {
  if (!Number.isFinite(wert) || !Number.isFinite(mittel)) return null;
  const d = wert - mittel, txt = fmt(Math.abs(d));
  return /^0([,.]0+)?(\s|$)/.test(txt) ? `±${txt}` : `${d > 0 ? "+" : "−"}${txt}`;
}

export function ansicht(ctx) {
  const { bild, tag, erg } = ctx, B = beleg(ctx.register);
  if (!bild) return leererTag(ctx, t("heute_titel"), "keine_daten_tag", "heute");
  belegeTag(B, bild);
  const e = bild.erholung, hatErholung = e && e.wert !== null && e.wert !== undefined;

  // Sieben Tage (Bildzeichen unter der Heldenzahl, jeder Punkt öffnet seinen Beleg) und 30-Tage-Mittel als Strich am Ring
  const tage = letzteTage(erg, tag, 7, (b) => b.erholung?.wert);
  for (const x of tage) belegeTag(B, x.bild);
  const gruen = tage.filter((x) => x.bild.erholung.stufe === "gruen").length;
  const mittel30 = mittelVon(letzteTage(erg, tagPlus(tag, -1), 30, (b) => b.erholung?.wert));
  const woche = sparkline({ breite: 224, hoehe: 30, radius: 4, alle: true, ziele: true, beschriftung: true, plaetze: 7, klasse: "vz-held-spark",
    aria: t("held_woche_aria", { liste: tage.map((x) => `${wochentag(x.tag)} ${prozent(x.wert)}`).join(", ") }),
    punkte: tage.map((x) => ({ x: x.x, wert: x.wert, name: wochentag(x.tag).slice(0, 2), text: prozent(x.wert), q: `erholung:${x.tag}`, klasse: "vz-" + x.bild.erholung.stufe })) });
  const held = hatErholung
    ? ring({ wert: zahl(e.wert), nach: "%", anteilBp: e.wert * 100, beschriftung: t("erholung"), zweitzeile: t("stufe_text", { stufe: t("stufe_" + e.stufe) }), stufe: e.stufe, q: `erholung:${tag}`,
      beschreibung: t("erholung_ring_desc"), groesse: 260, hochzaehlen: e.wert, mittelBp: mittel30 === null ? null : Math.round(mittel30 * 100),
      mittelText: mittel30 === null ? "" : t("held_mittel_aria", { wert: prozent(Math.round(mittel30)) }) }).html
      + `<div class="mf-held-woche"><span class="mf-beschriftung">${esc(t("held_woche"))}</span>${woche.html}<p class="mf-leise">${esc(t("heute_woche_kern", { n: zahl(gruen), gesamt: zahl(tage.length) }))} <a class="mf-link" href="#/trends?feld=erholung&amp;fenster=30">${esc(t("held_verlauf"))}</a></p></div>`
    : "";

  // Vier Kacheln, je mit kleinem Bild und dem Abstand zum Mittel als Pille
  const bel = bild.belastung, s = bild.schlaf;
  const spur = (feld, wertVon) => {
    const liste = letzteTage(erg, tag, 7, wertVon), basis = bild.basis[feld];
    const band = basis?.n ? { unten: basis.mittel - (Number(basis.streuung) || 0), oben: basis.mittel + (Number(basis.streuung) || 0) } : null;
    return liste.length ? sparkline({ breite: 120, hoehe: 30, plaetze: 7, band, flaeche: true, punkte: liste.map((x) => ({ x: x.x, wert: x.wert })), aria: t("kachel_bild_aria", { titel: t("kachel_" + feld) }) }).svg : "";
  };
  const ph = bild.schlafRoh ? phasenVon(s) : null;
  const ms = (x) => `${zahl(x)} ${t("einheit_ms")}`, bpm = (x) => `${zahl(x)} ${t("einheit_bpm")}`;
  const kacheln = [
    // Ohne Pulswerte und ohne Training (Ruhetag im WHOOP-Export) steht ein Strich statt einer Null als Messwert
    bel.gemessen
      ? kennzahlKachel({ titel: t("kachel_belastung"), wert: belastungText(bel.wert), einheit: t("einheit_von21"), q: `belastung:${tag}`,
        bild: minibogen({ anteilBp: Math.round((bel.wert / 210) * 10000), klasse: "vz-akzent" }).svg,
        vergleich: vergleich(bel.wert, bild.basis.belastung, belastungText), delta: { text: abstand(bel.wert, bild.basis.belastung?.n ? bild.basis.belastung.mittel : NaN, belastungText), q: `belastung:${tag}` } })
      : kennzahlKachel({ titel: t("kachel_belastung"), wert: "–", q: "" }),
    kennzahlKachel({ titel: t("kachel_schlaf"), wert: bild.schlafRoh ? dauerKurz(s.dauerMs) : "–", q: bild.schlafRoh ? `schlaf-dauer:${tag}` : "",
      bild: ph ? streifen({ segmente: ["tief", "rem", "leicht", "wach"].map((a) => ({ wert: ph[a] || 0, klasse: PHASEN_KLASSE[a], name: t("phase_" + a), text: dauer(ph[a] || 0) })) }).svg : "",
      vergleich: bild.schlafRoh ? (s.dauerMs < s.bedarfMs ? { richtung: "runter", text: t("vgl_bedarf_unter") } : { richtung: "gleich", text: t("vgl_bedarf_gedeckt") }) : null,
      delta: bild.schlafRoh ? { text: abstand(s.dauerMs, s.bedarfMs, (x) => dauer(x)), q: `schlaf-schuld:${tag}` } : null }),
    kennzahlKachel({ titel: t("kachel_hrv"), wert: bild.hrv ? zahl(bild.hrv.wert) : "–", einheit: t("einheit_ms"), q: bild.hrv ? `hrv:${tag}` : "",
      bild: spur("hrv", (b) => b.hrv?.wert),
      vergleich: vergleich(bild.hrv?.wert, bild.basis.hrv, ms), delta: bild.hrv ? { text: abstand(Math.round(bild.hrv.wert), bild.basis.hrv?.n ? bild.basis.hrv.mittel : NaN, ms), q: `hrv:${tag}` } : null }),
    kennzahlKachel({ titel: t("kachel_ruhepuls"), wert: bild.ruhepuls ? zahl(bild.ruhepuls.wert) : "–", einheit: t("einheit_bpm"), q: bild.ruhepuls ? `ruhepuls:${tag}` : "",
      bild: spur("ruhepuls", (b) => b.ruhepuls?.wert),
      vergleich: vergleich(bild.ruhepuls?.wert, bild.basis.ruhepuls, bpm), delta: bild.ruhepuls ? { text: abstand(Math.round(bild.ruhepuls.wert), bild.basis.ruhepuls?.n ? bild.basis.ruhepuls.mittel : NaN, bpm), q: `ruhepuls:${tag}` } : null }),
  ].map((k) => k.html).join("");

  // Gliederung: Bestandteile der Erholung mit Gewichten
  // Je Teil: Beitrag in Punkten um die Mitte 50 und Gewicht; der Balken zeigt das Gewicht (Abzüge ohne Gewicht: kein Balken)
  const teile = hatErholung ? e.teile.map((x) => `<div class="mf-teil"><span class="mf-teil-name">${esc(t("teil_" + x.name))} <span class="mf-teil-gewicht">· ${esc(x.gewicht === null ? t("abzug") : t("gewicht", { wert: prozent(x.gewicht) }))}</span></span>${zahlKnopf(`erholung-teil:${tag}:${x.name}`, t("punkte", { wert: mitVorzeichen(x.beitrag) }))}${x.gewicht === null ? "" : fortschritt({ titel: t("gewicht", { wert: prozent(x.gewicht) }), wert: x.gewicht, ohneWert: true, klasse: "vz-k1" }).html}</div>`).join("") : "";
  const gliederung = hatErholung ? `<details class="mf-gliederung"><summary>${esc(t("heute_gliederung"))}</summary><div class="mf-gl-inhalt"><p class="mf-leise">${esc(t("heute_gliederung_satz"))}</p>${teile}</div></details>` : "";

  return `<div class="mf-sicht" data-sicht="heute">
    ${kopf(t("heute_titel"))}
    <div class="mf-held mf-held-heute">${kernaussage(kernsatz(bild, tag === ctx.heute))}${held}</div>
    <div class="mf-kacheln mf-vier">${kacheln}</div>
    ${gliederung}
    ${bild.fremd ? `<p class="mf-vgl-link" data-heute-vergleich><a class="mf-link" href="#/vergleich?feld=erholung&amp;tag=${esc(tag)}">${esc(t("heute_vgl_link"))}</a></p>` : ""}
  </div>`;
}
