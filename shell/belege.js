/* shell/belege.js – meldet für einen Tag alle Zahlen samt Herkunft beim Beleg-Register an.
 *
 * Kernaussage: Jede Zahl, die eine Ansicht zeigt, hat einen Schlüssel „art:schluessel“ (data-q). Hier steht einmal, was das
 * Belegfenster zu jedem Schlüssel zeigt: Titel, Wert, Rechenweg mit Fundstelle (aus dem Kern), Bestandteile und die Messwerte
 * dahinter. Die Ansichten rufen belegeTag() auf und benutzen danach nur noch die Schlüssel.
 *
 * Eintrag: { titel, wert, formel: { text, fundstelle, pruefen }?, teile: [{ name, wert, gewicht? }], quellen: quelle[],
 *           fremd?: { text, q, href } }  – fremd: eine Zeile „WHOOP: 67 %“ mit Weg zum Vergleich (shell/apps/vergleich.js)
 * Fremdwerte: fremd:<feld>:<tag> (feld erholung|belastung|schlaf) – WHOOPs eigene Zahl mit CSV-Datei und Zeile.
 */
import { t } from "./i18n/i18n.js";
import { prozent, belastungText, dauer, dauerKurz, zahl, uhrzeit, mitVorzeichen } from "./format.js";

export const PHASEN = ["wach", "leicht", "tief", "rem"];
const basisTeile = (b, fmt) => (b && b.n ? [{ name: t("basis_mittel"), wert: fmt(b.mittel) }, { name: t("basis_streuung"), wert: fmt(b.streuung) }, { name: t("basis_n"), wert: zahl(b.n) }] : []);
const phasenMs = (p) => (Array.isArray(p) ? Object.fromEntries(PHASEN.map((a) => [a, p.filter((x) => x.art === a).reduce((s, x) => s + (x.ms ?? x.bis - x.von), 0)])) : p || {});
export const phasenVon = (schlaf) => phasenMs(schlaf?.phasen);

/** WHOOPs Zahlen eines Tages als Belege anmelden; liefert je Feld die Zeile für den MF-Beleg ({ text, q, href }) oder nichts. */
export const FREMD_FELDER = { erholung: ["erholung", (x) => prozent(x)], belastung: ["belastung", (x) => belastungText(x)], schlaf: ["schlafLeistung", (x) => prozent(x)] };
export function belegeFremd(B, bild) {
  const f = bild?.fremd, aus = {};
  if (!f) return aus;
  for (const [feld, [k, fmt]] of Object.entries(FREMD_FELDER)) {
    if (f[k] === null || f[k] === undefined) continue;
    const q = `fremd:${feld}:${bild.tag}`, text = fmt(f[k]);
    B(q, { titel: t("vgl_fremd_titel", { feld: t("vgl_feld_" + feld) }), wert: text, formel: f.formel, teile: [{ name: t("vgl_fremd_anbieter"), wert: "WHOOP" }], quellen: f.quelle ? [f.quelle] : [] });
    aus[feld] = { text, q, href: `#/vergleich?feld=${feld}&tag=${bild.tag}` };
  }
  return aus;
}

export function belegeTag(B, bild) {
  if (!bild) return;
  const tag = bild.tag, e = bild.erholung, bel = bild.belastung, s = bild.schlaf;
  const fremd = belegeFremd(B, bild);
  if (e && e.wert !== null && e.wert !== undefined) {
    B(`erholung:${tag}`, { titel: t("erholung"), wert: prozent(e.wert), formel: e.formel,
      teile: e.teile.map((x) => ({ name: t("teil_" + x.name), wert: t("punkte", { wert: mitVorzeichen(x.beitrag) }), gewicht: x.gewicht === null ? t("abzug") : prozent(x.gewicht) })), quellen: e.quellen || [], fremd: fremd.erholung });
    for (const x of e.teile) B(`erholung-teil:${tag}:${x.name}`, { titel: `${t("teil_" + x.name)} · ${t("beitrag_text")}`, wert: t("punkte", { wert: mitVorzeichen(x.beitrag) }), formel: x.formel || e.formel,
      teile: [...(x.messwert !== null && x.messwert !== undefined ? [{ name: t("messwert"), wert: zahl(x.messwert, 1) }] : []), { name: t("beleg_gewicht"), wert: x.gewicht === null ? t("abzug") : prozent(x.gewicht) }], quellen: x.quelle || [] });
  }
  B(`belastung:${tag}`, { titel: t("belastung_label"), wert: `${belastungText(bel.wert)} ${t("einheit_von21")}`, formel: bel.formel,
    teile: bel.zonen.map((z) => ({ name: t("zone_" + z.zone), wert: dauer(z.ms) })), quellen: bel.quellen || [], fremd: fremd.belastung });
  for (const z of bel.zonen) B(`zone:${tag}:${z.zone}`, { titel: t("zone_" + z.zone), wert: dauer(z.ms), formel: bel.formel, teile: [], quellen: z.quelle || [] });
  if (bild.schlafRoh) {
    const sq = s.quellen || [bild.schlafRoh.quelle];
    B(`schlaf:${tag}`, { titel: t("kachel_leistung"), wert: prozent(s.wert), formel: s.formel,
      teile: [{ name: t("schlaf_geschlafen"), wert: dauer(s.dauerMs) }, { name: t("schlaf_bedarf"), wert: dauer(s.bedarfMs) }], quellen: sq, fremd: fremd.schlaf });
    B(`schlaf-dauer:${tag}`, { titel: t("schlaf_geschlafen"), wert: dauerKurz(s.dauerMs), formel: s.formel,
      teile: PHASEN.filter((a) => a !== "wach").map((a) => ({ name: t("phase_" + a), wert: dauer(phasenVon(s)[a] || 0) })), quellen: sq });
    B(`schlaf-schuld:${tag}`, { titel: t("kachel_schuld"), wert: dauer(s.schuld), formel: s.formel,
      teile: [{ name: t("schlaf_bedarf"), wert: dauer(s.bedarfMs) }, { name: t("schlaf_geschlafen"), wert: dauer(s.dauerMs) }], quellen: sq });
    B(`schlaf-zeiten:${tag}`, { titel: t("kachel_zeiten"), wert: `${uhrzeit(bild.schlafRoh.von)}–${uhrzeit(bild.schlafRoh.bis)}`, formel: null, teile: [], quellen: sq });
    for (const a of PHASEN) B(`schlaf-phase:${tag}:${a}`, { titel: t("phase_" + a), wert: dauer(phasenVon(s)[a] || 0), formel: s.formel, teile: [],
      quellen: [{ ...bild.schlafRoh.quelle, id: `${bild.schlafRoh.quelle?.id || ""}#${a}` }] });
  }
  B(`schlaf-bedarf:${tag}`, { titel: t("schlaf_bedarf"), wert: dauer(bild.bedarf.ms), formel: bild.bedarf.formel,
    teile: (bild.bedarf.teile || []).map((x) => ({ name: t("bedarf_" + x.name), wert: dauer(x.ms) })), quellen: [] });
  if (bild.hrv) B(`hrv:${tag}`, { titel: t("kachel_hrv"), wert: `${zahl(bild.hrv.wert)} ${t("einheit_ms")}`,
    formel: { text: t("hrv_formel"), fundstelle: bild.basis.hrv.formel?.fundstelle, pruefen: bild.basis.hrv.formel?.pruefen },
    teile: [{ name: t("messwert"), wert: `${zahl(bild.hrv.wert)} ${t("einheit_ms")}` }, ...basisTeile(bild.basis.hrv, (x) => `${zahl(x, 1)} ${t("einheit_ms")}`)], quellen: bild.hrv.quellen });
  if (bild.ruhepuls) B(`ruhepuls:${tag}`, { titel: t("kachel_ruhepuls"), wert: `${zahl(bild.ruhepuls.wert)} ${t("einheit_bpm")}`,
    formel: { text: t("ruhepuls_formel"), fundstelle: bild.basis.ruhepuls.formel?.fundstelle, pruefen: bild.basis.ruhepuls.formel?.pruefen },
    teile: [{ name: t("messwert"), wert: `${zahl(bild.ruhepuls.wert)} ${t("einheit_bpm")}` }, ...basisTeile(bild.basis.ruhepuls, (x) => `${zahl(x, 1)} ${t("einheit_bpm")}`)], quellen: bild.ruhepuls.quellen });
}
