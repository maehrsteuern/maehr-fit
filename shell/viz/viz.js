/* shell/viz/viz.js – eigene kleine SVG-Diagrammbibliothek von MAEHR FIT (ohne Fremdcode), im Stil von MBS shell/viz/viz.js.
 *
 * Kernaussage: Ein Diagramm beantwortet genau eine Frage. Darum hat jedes einen Titel und eine Kernaussage (ein Satz), zeichnet
 * ruhig (dünne Linien, wenige Beschriftungen, Farben nur über CSS-Klassen und Tokens) und liefert immer mit: das SVG, einen Satz mit
 * allen Werten (Textalternative) und eine aufklappbare Tabelle. Jeder Balken, Punkt und Abschnitt ist ein fokussierbares Ziel mit
 * data-quelle und – wenn vorhanden – data-q; der eine Klick-Fang der Shell (shell/shell.js) öffnet dazu das Belegfenster.
 *
 * Eingabe (gemeinsame Form): { titel, kernaussage, reihen: [{ name, wert (Zahl für die Geometrie), text (fertiger Wert),
 *   q? (Prüfpfad „art:schluessel“), quelle? ({ art, id, datei, zeile }), klasse? (vz-k0…k4, vz-gruen/gelb/rot) }], breite? }
 * Ausgabe jeder Funktion: { art, svg, text, html, ziele }
 *   svg   SVG-String mit role="img", aria-label (= text), <title>, <desc>
 *   text  Textalternative als Satz mit allen Werten
 *   html  fertiges Markup zum Einsetzen (<figure> mit Titel, Kernaussage, SVG und Tabelle bzw. Ring/Kachel)
 *   ziele [{ i, name, q, quelle }] – die klickbaren Ziele
 *
 * Schnittstelle:
 *   ring(e)            Heldenzahl in einem dünnen Ring: { wert, nach?, anteilBp (0–10.000), beschriftung, zweitzeile?, q, stufe?, beschreibung, titel? }
 *   kennzahlKachel(e)  eine Zahl mit Titel, Einheit, Vergleich zur Basislinie: { titel, wert, einheit?, q, quelle?, vergleich?: { richtung, text, aria } }
 *   balken(e)          waagerechte Balken, Name links, Wert rechts
 *   zonen(e)           Zeit je Pulszone als Balken (Farben vz-k0…k4 nach Zone): { titel, kernaussage, zonen: [{ zone, name, ms, text, q, quelle }] }
 *   zeitreihe(e)       Linie mit Punkten, optional Band { unten, oben, text } (üblicher Bereich); e.abNull = Achse ab 0
 *   segmentbalken(e)   ein Balken in Abschnitten nach Anteil (Schlafphasen), darunter Legende mit Zahlen als Knöpfe
 *   fortschritt(e)     schmaler Fortschrittsbalken 0–100: { titel, wert, text? }
 *   verlauf(e)         Live-Linie über ein festes Zeitfenster (Puls der letzten 3 min): { titel, kernaussage, punkte: [{ t, wert }], vonMs, bisMs, q, text, kennzahlen }
 *   vizTastatur(wurzel) Enter/Leertaste auf einem Ziel = Klick (einmal je Dokument)
 */
import { t } from "../i18n/i18n.js";

const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const f1 = (x) => (Math.round(x * 10) / 10).toString();
const SCHRIFT = 15, F_ZAHL = 0.6, F_NAME = 0.55;
const breiteVon = (s, f = F_NAME) => [...String(s)].length * SCHRIFT * f;
function kuerzen(s, platz) {
  if (breiteVon(s) <= platz) return String(s);
  const z = [...String(s)], max = Math.max(1, Math.floor(platz / (SCHRIFT * F_NAME)) - 1);
  return z.slice(0, max).join("").trimEnd() + "…";
}

function normal(e) {
  const reihen = (e.reihen || []).filter(Boolean).map((r, i) => ({ ...r, i, wert: Number(r.wert) || 0, text: r.text ?? String(r.wert ?? "") }));
  return { ...e, reihen, titel: e.titel || "", kernaussage: e.kernaussage || "", breite: Math.max(300, Number(e.breite) || 360) };
}
const datenQ = (r) => (r.q ? ` data-q="${esc(r.q)}"` : "");
const datenQuelle = (r) => (r.quelle ? ` data-quelle="${esc(JSON.stringify(r.quelle))}"` : "");
function zielAttr(r) {
  return `class="vz-ziel" tabindex="0" data-i="${r.i}"${datenQ(r)}${datenQuelle(r)} aria-label="${esc(t("vz_quelle_oeffnen", { name: r.name, wert: r.text }))}"`;
}
const tip = (r) => `<title>${esc(`${r.name}: ${r.text}`)}</title>`;
const punktEnde = (x) => String(x).replace(/[.\s]+$/, "");
function textAlt(N, extra = "") {
  const liste = N.reihen.map((r) => `${r.name}: ${r.text}`).join("; ");
  return [N.titel, N.kernaussage, liste, extra].filter(Boolean).map(punktEnde).join(". ") + ".";
}
const zahlKnopf = (r) => (r.q ? `<button type="button" class="zahl" data-q="${esc(r.q)}">${esc(r.text)}</button>` : esc(r.text));
function tabelle(N) {
  if (!N.reihen.length) return "";
  const zeilen = N.reihen.map((r) => `<tr><td>${esc(r.name)}</td><td class="rechts">${zahlKnopf(r)}</td></tr>`).join("");
  return `<details class="vz-tabelle"><summary>${esc(t("vz_tabelle"))}</summary><table class="mf-tab"><tbody>${zeilen}</tbody></table></details>`;
}
const svgHuelle = (N, art, hoehe, inhalt, text) =>
  `<svg class="vz-svg vz-${art}" viewBox="0 0 ${N.breite} ${hoehe}" width="100%" role="img" aria-label="${esc(text)}" focusable="false"><title>${esc(N.titel)}</title><desc>${esc(text)}</desc>${inhalt}</svg>`;
function figur(N, art, inhalt, mitTabelle = true) {
  const kopf = N.titel || N.kernaussage ? `<figcaption class="vz-kopf">${N.titel ? `<span class="vz-titel">${esc(N.titel)}</span>` : ""}${N.kernaussage ? `<span class="vz-kern">${esc(N.kernaussage)}</span>` : ""}</figcaption>` : "";
  const leib = N.reihen.length ? inhalt + (mitTabelle ? tabelle(N) : "") : `<p class="vz-leer">${esc(t("vz_leer"))}</p>`;
  return `<figure class="vz" data-vz="${art}">${kopf}${leib}</figure>`;
}
const ziele = (N) => N.reihen.map((r) => ({ i: r.i, name: r.name, q: r.q || "", quelle: r.quelle || null }));
function leer(N, art) { const text = [N.titel, t("vz_leer")].filter(Boolean).map(punktEnde).join(". ") + "."; return { art, svg: "", text, html: figur(N, art, ""), ziele: [] }; }

// ------------------------------------------------------------------ Ring (Heldenzahl wie MBS shell/ring.js)
export const RING_STRICH = 6;
export function ring(e = {}) {
  const g = Number(e.groesse) || 240, mitte = g / 2, bp = Math.max(0, Math.min(10000, Math.round(Number(e.anteilBp) || 0)));
  const r = (g - RING_STRICH) / 2, umfang = 2 * Math.PI * r, versatz = umfang * (1 - bp / 10000);
  const wert = String(e.wert ?? "–"), nach = e.nach ? String(e.nach) : "";
  const text = e.aria || [e.beschriftung, wert + (nach ? " " + nach : "")].filter(Boolean).join(": ") + (e.zweitzeile ? ". " + e.zweitzeile : "");
  const zeichen = Math.max(2.4, [...wert].length + 0.4 * [...nach].length);
  const ziffern = `<span class="rg-ziffern">${esc(wert)}</span>${nach ? `<span class="rg-nach">${esc(nach)}</span>` : ""}`;
  const zahlHtml = e.q
    ? `<button type="button" class="zahl rg-zahl" data-q="${esc(e.q)}" title="${esc(e.titel || text)}" aria-label="${esc(text)}">${ziffern}</button>`
    : `<span class="rg-zahl">${ziffern}</span>`;
  const bogen = bp > 0 ? `<circle class="rg-bogen" cx="${mitte}" cy="${mitte}" r="${f1(r)}" fill="none" stroke-width="${RING_STRICH}" stroke-linecap="round" stroke-dasharray="${umfang.toFixed(2)}" stroke-dashoffset="${versatz.toFixed(2)}" transform="rotate(-90 ${mitte} ${mitte})"/>` : "";
  const svg = `<svg class="rg-bild" viewBox="0 0 ${g} ${g}" role="img" aria-label="${esc(text)}" focusable="false"><desc>${esc(e.beschreibung || text)}</desc><circle class="rg-spur" cx="${mitte}" cy="${mitte}" r="${f1(r)}" fill="none" stroke-width="${RING_STRICH}"/>${bogen}</svg>`;
  const stufe = ["gruen", "gelb", "rot"].includes(e.stufe) ? ` rg-${e.stufe}` : e.leise ? " rg-leise" : "";
  const html = `<div class="rg${stufe}" data-vz="ring" data-bp="${bp}" style="--rg-groesse:${g}px;--rg-zeichen:${zeichen.toFixed(1)}">${svg}<div class="rg-mitte">${zahlHtml}${e.beschriftung ? `<span class="rg-label">${esc(e.beschriftung)}</span>` : ""}${e.zweitzeile ? `<span class="rg-zweit">${esc(e.zweitzeile)}</span>` : ""}</div></div>`;
  return { art: "ring", svg, text, html, ziele: e.q ? [{ i: 0, name: e.beschriftung || "", q: e.q, quelle: null }] : [], anteilBp: bp };
}

// ------------------------------------------------------------------ Kennzahl-Kachel
const PFEIL = { hoch: "↑", runter: "↓", gleich: "→", neu: "·" };
export function kennzahlKachel(e = {}) {
  const wert = String(e.wert ?? "–");
  const v = e.vergleich && PFEIL[e.vergleich.richtung] ? e.vergleich : null;
  const text = [e.titel, wert + (e.einheit ? " " + e.einheit : ""), v?.aria || v?.text].filter(Boolean).map(punktEnde).join(". ") + ".";
  const zahlHtml = e.q ? `<button type="button" class="zahl" data-q="${esc(e.q)}"${datenQuelle(e)} aria-label="${esc(text)}">${esc(wert)}</button>` : `<span class="zahl-text">${esc(wert)}</span>`;
  const vgl = v ? `<p class="mf-vergleich" data-richtung="${esc(v.richtung)}"><span class="mf-pfeil" aria-hidden="true">${PFEIL[v.richtung]}</span><span>${esc(v.text)}</span></p>` : "";
  const html = `<div class="mf-kachel" data-vz="kachel"><span class="mf-kachel-titel">${esc(e.titel)}</span><span class="mf-kachel-wert">${zahlHtml}${e.einheit ? `<span class="mf-einheit">${esc(e.einheit)}</span>` : ""}</span>${vgl}</div>`;
  return { art: "kachel", svg: "", text, html, ziele: e.q ? [{ i: 0, name: e.titel, q: e.q, quelle: e.quelle || null }] : [] };
}

// ------------------------------------------------------------------ Balken (waagerecht)
export function balken(e = {}) {
  const N = normal(e), B = N.breite;
  if (!N.reihen.length) return leer(N, "balken");
  const ZH = 36, LB = Math.min(150, Math.max(64, ...N.reihen.map((r) => breiteVon(r.name) + 12))), WB = Math.min(110, Math.max(48, ...N.reihen.map((r) => breiteVon(r.text, F_ZAHL) + 10)));
  const x0 = LB, x1 = B - WB, hi = Math.max(Number(e.max) || 0, ...N.reihen.map((r) => r.wert), 1);
  const H = N.reihen.length * ZH + 4;
  const zeilen = N.reihen.map((r, i) => {
    const y = i * ZH + 2, br = Math.max(r.wert > 0 ? 2 : 0, ((x1 - x0) * Math.max(0, r.wert)) / hi);
    const nm = kuerzen(r.name, LB - 12);
    return `<g ${zielAttr(r)}>${tip(r)}<rect class="vz-treffer" x="0" y="${y}" width="${B}" height="${ZH}"/>`
      + `<text class="vz-name" x="${LB - 10}" y="${y + 23}" text-anchor="end">${esc(nm)}</text>`
      + `<rect class="vz-spur" x="${x0}" y="${y + 14}" width="${f1(x1 - x0)}" height="8" rx="4" opacity=".5"/>`
      + `<rect class="vz-marke ${esc(r.klasse || "vz-k1")}" x="${x0}" y="${y + 12}" width="${f1(br)}" height="12" rx="4"/>`
      + `<text class="vz-wert" x="${x1 + 8}" y="${y + 23}">${esc(r.text)}</text></g>`;
  }).join("");
  const text = textAlt(N);
  const svg = svgHuelle(N, "balken", H, zeilen, text);
  return { art: "balken", svg, text, html: figur(N, "balken", svg, e.tabelle !== false), ziele: ziele(N) };
}

// ------------------------------------------------------------------ Pulszonen (Balken mit Zonenfarben)
const ZONEN_KLASSE = ["vz-k0", "vz-k1", "vz-k2", "vz-k3", "vz-k4"];
export function zonen(e = {}) {
  const reihen = (e.zonen || []).map((z) => ({ name: z.name, wert: Number(z.ms) || 0, text: z.text, q: z.q, quelle: z.quelle, klasse: ZONEN_KLASSE[(Number(z.zone) || 1) - 1] || "vz-k1" }));
  const erg = balken({ ...e, reihen });
  return { ...erg, art: "zonen", html: erg.html.replace('data-vz="balken"', 'data-vz="zonen"') };
}

// ------------------------------------------------------------------ Zeitreihe mit Band
export function zeitreihe(e = {}) {
  const N = normal(e), B = N.breite;
  if (!N.reihen.length) return leer(N, "zeitreihe");
  const H = 190, OB = 16, UN = 150, LI = 12, n = N.reihen.length;
  const letzterText = N.reihen[n - 1].text, RE = B - Math.max(44, breiteVon(letzterText, F_ZAHL) + 16);
  const w = N.reihen.map((r) => r.wert);
  const bd = e.band && Number.isFinite(Number(e.band.unten)) && Number.isFinite(Number(e.band.oben)) ? { unten: Number(e.band.unten), oben: Number(e.band.oben), text: e.band.text || "" } : null;
  let lo = Math.min(...w, ...(bd ? [bd.unten] : [])), hi = Math.max(...w, ...(bd ? [bd.oben] : []));
  if (e.abNull) lo = Math.min(0, lo);
  if (Number.isFinite(e.min)) lo = Math.min(lo, e.min);
  if (Number.isFinite(e.max)) hi = Math.max(hi, e.max);
  const luft = (hi - lo) * 0.12 || 1; if (!e.abNull) lo -= luft; hi += luft;
  const sp = hi - lo || 1;
  const sx = (i) => (n === 1 ? (LI + RE) / 2 : LI + (i / (n - 1)) * (RE - LI));
  const sy = (v) => UN - ((v - lo) / sp) * (UN - OB);
  const schritt = n > 1 ? (RE - LI) / (n - 1) : RE - LI, maxW = Math.max(...N.reihen.map((r) => breiteVon(r.name)));
  const jede = Math.max(1, Math.ceil((maxW + 10) / schritt));
  const linie = n > 1 ? `<polyline class="vz-linie" points="${w.map((v, i) => `${f1(sx(i))},${f1(sy(v))}`).join(" ")}"/>` : "";
  const punkte = N.reihen.map((r, i) => {
    const x = sx(i), y = sy(w[i]), letzter = i === n - 1;
    const name = (n - 1 - i) % jede === 0 ? (() => { const wn = breiteVon(r.name), nx = Math.min(Math.max(x, wn / 2 + 2), B - wn / 2 - 2); return `<text class="vz-name" x="${f1(nx)}" y="${H - 14}" text-anchor="middle">${esc(r.name)}</text>`; })() : "";
    const wert = letzter ? `<text class="vz-wert" x="${f1(x + 10)}" y="${f1(Math.max(y + 5, 14))}">${esc(r.text)}</text>` : "";
    return `<g ${zielAttr(r)}>${tip(r)}<circle class="vz-treffer" cx="${f1(x)}" cy="${f1(y)}" r="14"/><circle class="vz-punkt${r.klasse ? " " + esc(r.klasse) : ""}" cx="${f1(x)}" cy="${f1(y)}" r="${letzter ? 5 : 4}"/>${wert}${name}</g>`;
  }).join("");
  const achse = `<line class="vz-achse" x1="${LI}" x2="${f1(RE)}" y1="${UN + 6}" y2="${UN + 6}"/>`;
  const band = bd ? `<rect class="vz-band" x="${LI}" y="${f1(sy(bd.oben))}" width="${f1(RE - LI)}" height="${f1(Math.max(sy(bd.unten) - sy(bd.oben), 1))}" rx="4"/>` : "";
  const text = textAlt(N, bd?.text || "");
  const svg = svgHuelle(N, "zeitreihe", H, band + achse + linie + punkte, text);
  return { art: "zeitreihe", svg, text, html: figur(N, "zeitreihe", svg), ziele: ziele(N) };
}

// ------------------------------------------------------------------ Segmentbalken (Anteile, z. B. Schlafphasen)
export function segmentbalken(e = {}) {
  const N = normal({ ...e, reihen: e.segmente || e.reihen });
  if (!N.reihen.length) return leer(N, "segmentbalken");
  const B = N.breite, H = 18, summe = N.reihen.reduce((s, r) => s + Math.max(0, r.wert), 0) || 1;
  let x = 0;
  const teile = N.reihen.map((r) => {
    const b = (B * Math.max(0, r.wert)) / summe, el = `<g ${zielAttr(r)}>${tip(r)}<rect class="vz-marke ${esc(r.klasse || "vz-k1")}" x="${f1(x)}" y="2" width="${f1(Math.max(b - 2, 0))}" height="${H - 4}" rx="3"/></g>`;
    x += b; return el;
  }).join("");
  const text = textAlt(N);
  const svg = svgHuelle(N, "segment", H, teile, text).replace('class="vz-svg vz-segment"', 'class="vz-svg vz-segment" preserveAspectRatio="none" height="18"');
  const legende = `<ul class="vz-legende">${N.reihen.map((r) => `<li><i class="vz-farbe ${esc(r.klasse || "vz-k1")}" aria-hidden="true"></i><span>${esc(r.name)}</span>${zahlKnopf(r)}</li>`).join("")}</ul>`;
  return { art: "segmentbalken", svg, text, html: figur(N, "segmentbalken", svg + legende, false), ziele: ziele(N) };
}

// ------------------------------------------------------------------ Fortschritt
export function fortschritt(e = {}) {
  const w = Math.max(0, Math.min(100, Math.round(Number(e.wert) || 0)));
  const wt = e.text ?? String(w);
  const text = [e.titel, wt].filter(Boolean).join(": ");
  const B = 200, H = 6;
  const fuell = w > 0 ? `<rect class="vz-marke ${esc(e.klasse || "vz-k1")}" x="0" y="0" width="${f1((B * w) / 100)}" height="${H}" rx="3"/>` : "";
  const svg = `<svg class="vz-svg vz-fortschritt" viewBox="0 0 ${B} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="${esc(text)}" focusable="false"><title>${esc(e.titel || "")}</title><desc>${esc(text)}</desc><rect class="vz-spur" x="0" y="0" width="${B}" height="${H}" rx="3"/>${fuell}</svg>`;
  return { art: "fortschritt", svg, text, html: `<div class="vz-fortschritt-zeile" data-vz="fortschritt" data-wert="${w}">${svg}${e.ohneWert ? "" : `<span class="vz-f-wert">${esc(wt)}</span>`}</div>`, ziele: [], wert: w };
}

// ------------------------------------------------------------------ Verlauf (Live-Linie über ein festes Zeitfenster)
/**
 * Ruhige Linie über ein festes Zeitfenster (z. B. Puls der letzten 3 Minuten), für Live-Ansichten: ein einziges Ziel statt eines
 * je Punkt, darunter die wichtigen Zahlen als Knöpfe. Die x-Achse ist die Zeit (vonMs … bisMs), nicht die Reihenfolge.
 * Eingabe: { titel, kernaussage, punkte: [{ t, wert }], vonMs, bisMs, q?, text? (letzter Wert), kennzahlen?: [{ name, text, q? }], abNull? }
 */
export function verlauf(e = {}) {
  const punkte = (e.punkte || []).filter((p) => p && Number.isFinite(p.t) && Number.isFinite(Number(p.wert))).map((p) => ({ t: p.t, wert: Number(p.wert) }));
  const N = normal({ ...e, reihen: (e.kennzahlen || []).map((k) => ({ ...k, wert: 0 })) });
  if (punkte.length < 2) return leer({ ...N, reihen: [] }, "verlauf");
  const B = N.breite, H = 96, OB = 10, UN = H - 10, LI = 4;
  const letzter = punkte[punkte.length - 1], letzterText = String(e.text ?? letzter.wert), RE = B - Math.max(36, breiteVon(letzterText, F_ZAHL) + 14);
  const von = Number.isFinite(e.vonMs) ? e.vonMs : punkte[0].t, bis = Number.isFinite(e.bisMs) ? e.bisMs : letzter.t, spanne = Math.max(1, bis - von);
  const w = punkte.map((p) => p.wert);
  let lo = Math.min(...w), hi = Math.max(...w);
  if (e.abNull) lo = Math.min(0, lo);
  const luft = (hi - lo) * 0.15 || 5; lo -= e.abNull ? 0 : luft; hi += luft;
  const sx = (t) => LI + (Math.max(0, Math.min(spanne, t - von)) / spanne) * (RE - LI);
  const sy = (v) => UN - ((v - lo) / (hi - lo)) * (UN - OB);
  const linie = `<polyline class="vz-linie" points="${punkte.map((p) => `${f1(sx(p.t))},${f1(sy(p.wert))}`).join(" ")}"/>`;
  const lx = sx(letzter.t), ly = sy(letzter.wert);
  const ende = `<circle class="vz-punkt" cx="${f1(lx)}" cy="${f1(ly)}" r="4"/><text class="vz-wert" x="${f1(lx + 8)}" y="${f1(Math.min(Math.max(ly + 5, 14), H - 2))}">${esc(letzterText)}</text>`;
  const achse = `<line class="vz-achse" x1="${LI}" x2="${f1(RE)}" y1="${UN + 4}" y2="${UN + 4}"/>`;
  const text = [N.titel, N.kernaussage, ...N.reihen.map((r) => `${r.name}: ${r.text}`)].filter(Boolean).map(punktEnde).join(". ") + ".";
  const ziel = { i: 0, name: N.titel || "", text: letzterText, q: e.q || "", quelle: null };
  const inhalt = `<g ${zielAttr(ziel)}>${tip(ziel)}<rect class="vz-treffer" x="0" y="0" width="${B}" height="${H}"/>${achse}${linie}${ende}</g>`;
  const svg = svgHuelle(N, "verlauf", H, inhalt, text);
  const legende = N.reihen.length ? `<ul class="vz-legende">${N.reihen.map((r) => `<li><span>${esc(r.name)}</span>${zahlKnopf(r)}</li>`).join("")}</ul>` : "";
  return { art: "verlauf", svg, text, html: figur({ ...N, reihen: [ziel] }, "verlauf", svg + legende, false), ziele: e.q ? [{ i: 0, name: ziel.name, q: e.q, quelle: null }] : [] };
}

// ------------------------------------------------------------------ Tastatur (nur im Browser)
export function vizTastatur(wurzel = typeof document !== "undefined" ? document : null) {
  if (!wurzel || wurzel._vzTastatur) return;
  wurzel._vzTastatur = true;
  wurzel.addEventListener("keydown", (ev) => {
    const z = ev.target?.closest?.(".vz-ziel");
    if (!z || (ev.key !== "Enter" && ev.key !== " ")) return;
    ev.preventDefault();
    z.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}
