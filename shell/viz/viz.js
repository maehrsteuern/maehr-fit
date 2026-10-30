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
 *   sparkline(e)       kleine Linie ohne Achsen (Kachel, Held, Training): { punkte: [{ wert, x?, klasse?, name?, text?, q? }], band?, alle?, linie?, flaeche?, ziele?, beschriftung? }
 *   minibogen(e)       flacher Bogen 0–max (Kachel Belastung/Schlafleistung): { anteilBp, klasse?, aria }
 *   streifen(e)        dünner Balken in Abschnitten (Schlafphasen in der Kachel): { segmente: [{ wert, klasse, name, text }] }
 *   hypnogramm(e)      Schlafphasen über die Nacht als Bänder je Phase mit Zeitachse: { titel, kernaussage, phasen: [{ von, bis, art }], summen: [{ art, name, text, q }], zeit(ms) }
 *   bedarfBalken(e)    Bedarf gegen geschlafene Zeit mit Schuld-Abschnitt: { titel, kernaussage, bedarf, ist, schuld? } je { name, wert, text, q }
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
let NR = 0;
/** Eindeutige Kennung je Verlauf/Filter im Dokument (die Shell zeichnet neu, doppelte Kennungen wären falsch). */
const neueId = (p) => `${p}${(NR = (NR + 1) % 1e6)}`;
/** Verlauf in Tokenfarben: Stopps tragen Klassen (stop-color in design_viz.css), keine Farbwerte. */
const verlaufDef = (id, klasseA, klasseB, { x2 = 0, y2 = 1, deckA = 1, deckB = 1 } = {}) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" class="${klasseA}" stop-opacity="${deckA}"/><stop offset="1" class="${klasseB}" stop-opacity="${deckB}"/></linearGradient>`;
const svgHuelle = (N, art, hoehe, inhalt, text) =>
  `<svg class="vz-svg vz-${art}" viewBox="0 0 ${N.breite} ${hoehe}" width="100%" role="img" aria-label="${esc(text)}" focusable="false"><title>${esc(N.titel)}</title><desc>${esc(text)}</desc>${inhalt}</svg>`;
function figur(N, art, inhalt, mitTabelle = true) {
  const kopf = N.titel || N.kernaussage ? `<figcaption class="vz-kopf">${N.titel ? `<span class="vz-titel">${esc(N.titel)}</span>` : ""}${N.kernaussage ? `<span class="vz-kern">${esc(N.kernaussage)}</span>` : ""}</figcaption>` : "";
  const leib = N.reihen.length ? inhalt + (mitTabelle ? tabelle(N) : "") : `<p class="vz-leer">${esc(t("vz_leer"))}</p>`;
  return `<figure class="vz" data-vz="${art}">${kopf}${leib}</figure>`;
}
const ziele = (N) => N.reihen.map((r) => ({ i: r.i, name: r.name, q: r.q || "", quelle: r.quelle || null }));
function leer(N, art) { const text = [N.titel, t("vz_leer")].filter(Boolean).map(punktEnde).join(". ") + "."; return { art, svg: "", text, html: figur(N, art, ""), ziele: [] }; }

// ------------------------------------------------------------------ Ring (Heldenzahl): Verlaufsbogen mit Leuchten, Mittel-Strich, Zonenring
/**
 * Dicker Bogen in der Farbe der Stufe, der zum helleren Ton verläuft, dahinter ein ruhiges Leuchten (feGaussianBlur, statisch).
 * Optional: mittelBp – ein Strich quer über die Spur an der Stelle deines 30-Tage-Mittels; segmente – ein dünner äußerer Ring,
 * aufgeteilt nach Anteilen (Zeit je Pulszone); hochzaehlen – Zielzahl, die shell/bewegung.js beim Ankommen hochzählt.
 */
export const RING_STRICH = 14;
const punktAuf = (m, r, grad) => { const w = ((grad - 90) * Math.PI) / 180; return [m + r * Math.cos(w), m + r * Math.sin(w)]; };
export function ring(e = {}) {
  const g = Number(e.groesse) || 240, mitte = g / 2, bp = Math.max(0, Math.min(10000, Math.round(Number(e.anteilBp) || 0)));
  const seg = Array.isArray(e.segmente) && e.segmente.some((x) => Number(x.anteil) > 0) ? e.segmente.filter((x) => Number(x.anteil) > 0) : null;
  const r = (g - RING_STRICH) / 2 - (seg ? 12 : 0), umfang = 2 * Math.PI * r, versatz = umfang * (1 - bp / 10000);
  const wert = String(e.wert ?? "–"), nach = e.nach ? String(e.nach) : "";
  const mBp = Number.isFinite(Number(e.mittelBp)) && e.mittelBp !== null ? Math.max(0, Math.min(10000, Math.round(Number(e.mittelBp)))) : null;
  const text = e.aria || [e.beschriftung, wert + (nach ? " " + nach : "")].filter(Boolean).join(": ") + (e.zweitzeile ? ". " + e.zweitzeile : "") + (e.mittelText ? ". " + e.mittelText : "");
  const zeichen = Math.max(2.4, [...wert].length + 0.4 * [...nach].length);
  const zaehl = Number.isFinite(Number(e.hochzaehlen)) && e.hochzaehlen !== null ? ` data-hochzaehlen="${Number(e.hochzaehlen)}" data-stellen="${Number(e.stellen) || 0}"` : "";
  const ziffern = `<span class="rg-ziffern"${zaehl}>${esc(wert)}</span>${nach ? `<span class="rg-nach">${esc(nach)}</span>` : ""}`;
  const zahlHtml = e.q
    ? `<button type="button" class="zahl rg-zahl" data-q="${esc(e.q)}" title="${esc(e.titel || text)}" aria-label="${esc(text)}">${ziffern}</button>`
    : `<span class="rg-zahl">${ziffern}</span>`;
  const idV = neueId("rgv"), idF = neueId("rgf");
  const kreis = (klasse, breite, extra = "") => `<circle class="${klasse}" cx="${mitte}" cy="${mitte}" r="${f1(r)}" fill="none" stroke-width="${breite}"${extra}/>`;
  const dash = ` stroke-linecap="round" stroke-dasharray="${umfang.toFixed(2)}" stroke-dashoffset="${versatz.toFixed(2)}" transform="rotate(-90 ${mitte} ${mitte})"`;
  const defs = `<defs>${verlaufDef(idV, "rg-stopp-a", "rg-stopp-b", { x2: 1, y2: 1 })}<filter id="${idF}" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="${f1(RING_STRICH * 0.7)}"/></filter></defs>`;
  const bogen = bp > 0 ? `<g class="rg-bogengruppe">${kreis("rg-schein", RING_STRICH + 4, `${dash} filter="url(#${idF})"`)}${kreis("rg-bogen", RING_STRICH, `${dash} style="stroke:url(#${idV})"`)}${bp < 10000 ? (() => { const [x, y] = punktAuf(mitte, r, (bp / 10000) * 360); return `<circle class="rg-kopf" cx="${f1(x)}" cy="${f1(y)}" r="${f1(RING_STRICH / 2 - 3.5)}"/>`; })() : ""}</g>` : "";
  const strich = mBp !== null ? (() => { const a = (mBp / 10000) * 360, [x1, y1] = punktAuf(mitte, r - RING_STRICH / 2 - 5, a), [x2, y2] = punktAuf(mitte, r + RING_STRICH / 2 + 5, a); return `<line class="rg-mittel" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke-linecap="round"/>`; })() : "";
  let zonenRing = "";
  if (seg) {
    const rs = (g - 4) / 2, us = 2 * Math.PI * rs, summe = seg.reduce((s2, x) => s2 + Number(x.anteil), 0) || 1, luft = seg.length > 1 ? 4 : 0;
    let start = 0;
    zonenRing = seg.map((x) => {
      const laenge = (us * Number(x.anteil)) / summe, el = `<circle class="rg-zone ${esc(x.klasse || "vz-k1")}" cx="${mitte}" cy="${mitte}" r="${f1(rs)}" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="${f1(Math.max(laenge - luft, 0.5))} ${f1(us)}" transform="rotate(${f1((start / us) * 360 - 90)} ${mitte} ${mitte})"/>`;
      start += laenge; return el;
    }).join("");
  }
  const svg = `<svg class="rg-bild" viewBox="0 0 ${g} ${g}" role="img" aria-label="${esc(text)}" focusable="false"><desc>${esc(e.beschreibung || text)}</desc>${defs}${zonenRing}${kreis("rg-spur", RING_STRICH)}${bogen}${strich}</svg>`;
  const stufe = ["gruen", "gelb", "rot", "akzent"].includes(e.stufe) ? ` rg-${e.stufe}` : e.leise ? " rg-leise" : "";
  const zweit = e.zweitzeile ? `<span class="rg-zweit"${e.stufe && e.stufe !== "akzent" ? ` data-stufe="${esc(e.stufe)}"` : ""}>${e.stufe && e.stufe !== "akzent" ? '<i aria-hidden="true"></i>' : ""}${esc(e.zweitzeile)}</span>` : "";
  const html = `<div class="rg${stufe}" data-vz="ring" data-bp="${bp}" style="--rg-groesse:${g}px;--rg-zeichen:${zeichen.toFixed(1)}">${svg}<div class="rg-mitte">${e.beschriftung ? `<span class="rg-label">${esc(e.beschriftung)}</span>` : ""}${zahlHtml}${zweit}</div></div>`;
  return { art: "ring", svg, text, html, ziele: e.q ? [{ i: 0, name: e.beschriftung || "", q: e.q, quelle: null }] : [], anteilBp: bp };
}

// ------------------------------------------------------------------ Kennzahl-Kachel
/**
 * Eine Zahl mit Titel, Einheit und kleinem Bild (bild: fertiges SVG aus sparkline/minibogen/streifen) und dem Vergleich zur
 * Basislinie als Pille: delta { text, q } zeigt den Abstand mit Vorzeichen („+6 ms“) als Zahl-Knopf, daneben das Wort.
 * Ohne delta steht nur der Pfeil. Die ganze Kachel ist ein Tippziel (data-q wie die Zahl, data-tipp).
 */
const PFEIL = { hoch: "↑", runter: "↓", gleich: "→", neu: "·" };
export function kennzahlKachel(e = {}) {
  const wert = String(e.wert ?? "–");
  const v = e.vergleich && PFEIL[e.vergleich.richtung] ? e.vergleich : null;
  const d = v && e.delta && e.delta.text && e.delta.q ? e.delta : null;
  const text = [e.titel, wert + (e.einheit ? " " + e.einheit : ""), d ? d.text : "", v?.aria || v?.text].filter(Boolean).map(punktEnde).join(". ") + ".";
  const zahlHtml = e.q ? `<button type="button" class="zahl" data-q="${esc(e.q)}"${datenQuelle(e)} aria-label="${esc(text)}">${esc(wert)}</button>` : `<span class="zahl-text">${esc(wert)}</span>`;
  const pille = d
    ? `<button type="button" class="zahl mf-delta" data-q="${esc(d.q)}" data-richtung="${esc(v.richtung)}" aria-label="${esc(`${d.text}, ${v.text}`)}"><span aria-hidden="true">${PFEIL[v.richtung]}</span>${esc(d.text)}</button>`
    : v ? `<span class="mf-pfeil" aria-hidden="true">${PFEIL[v.richtung]}</span>` : "";
  const vgl = v ? `<p class="mf-vergleich" data-richtung="${esc(v.richtung)}">${pille}<span class="mf-vergleich-text">${esc(v.text)}</span></p>` : "";
  const bild = e.bild ? `<span class="mf-kachel-bild" aria-hidden="true">${e.bild}</span>` : "";
  const html = `<div class="mf-kachel" data-vz="kachel"${e.q ? ` data-tipp data-q="${esc(e.q)}"` : ""}><span class="mf-kachel-titel">${esc(e.titel)}</span><span class="mf-kachel-wert">${zahlHtml}${e.einheit ? `<span class="mf-einheit">${esc(e.einheit)}</span>` : ""}${e.marke ? `<span class="mf-kachel-marke">${esc(e.marke)}</span>` : ""}</span>${bild}${vgl}</div>`;
  return { art: "kachel", svg: "", text, html, ziele: e.q ? [{ i: 0, name: e.titel, q: e.q, quelle: e.quelle || null }] : [] };
}

// ------------------------------------------------------------------ Balken (waagerecht)
export function balken(e = {}) {
  const N = normal(e), B = N.breite;
  if (!N.reihen.length) return leer(N, "balken");
  const ZH = 36, LB = Math.min(150, Math.max(64, ...N.reihen.map((r) => breiteVon(r.name) + 12))), WB = Math.min(110, Math.max(48, ...N.reihen.map((r) => breiteVon(r.text, F_ZAHL) + 10)));
  const x0 = LB, x1 = B - WB, hi = Math.max(Number(e.max) || 0, ...N.reihen.map((r) => r.wert), 1);
  const H = N.reihen.length * ZH + 4;
  // Verlauf je Farbe (Zonen): vom hellen Anfang zur vollen Farbe, Füllung als Inline-Stil (schlägt die Klassenfarbe)
  const vId = {}, defs = e.verlauf ? `<defs>${[...new Set(N.reihen.map((r) => r.klasse || "vz-k1"))].map((k) => { vId[k] = neueId("vzb"); return verlaufDef(vId[k], "vz-stopp-" + k.slice(3), "vz-stopp-" + k.slice(3), { x2: 1, y2: 0, deckA: 0.45 }); }).join("")}</defs>` : "";
  const zeilen = N.reihen.map((r, i) => {
    const y = i * ZH + 2, br = Math.max(r.wert > 0 ? 2 : 0, ((x1 - x0) * Math.max(0, r.wert)) / hi);
    const nm = kuerzen(r.name, LB - 12);
    return `<g ${zielAttr(r)}>${tip(r)}<rect class="vz-treffer" x="0" y="${y}" width="${B}" height="${ZH}"/>`
      + `<text class="vz-name" x="${LB - 10}" y="${y + 23}" text-anchor="end">${esc(nm)}</text>`
      + `<rect class="vz-spur" x="${x0}" y="${y + 14}" width="${f1(x1 - x0)}" height="8" rx="4" opacity=".5"/>`
      + `<rect class="vz-marke ${esc(r.klasse || "vz-k1")}" x="${x0}" y="${y + 12}" width="${f1(br)}" height="12" rx="6"${e.verlauf ? ` style="fill:url(#${vId[r.klasse || "vz-k1"]})"` : ""}/>`
      + `<text class="vz-wert" x="${x1 + 8}" y="${y + 23}">${esc(r.text)}</text></g>`;
  }).join("");
  const text = textAlt(N);
  const svg = svgHuelle(N, "balken", H, defs + zeilen, text);
  return { art: "balken", svg, text, html: figur(N, "balken", svg, e.tabelle !== false), ziele: ziele(N) };
}

// ------------------------------------------------------------------ Pulszonen (Balken mit Zonenfarben)
const ZONEN_KLASSE = ["vz-k0", "vz-k1", "vz-k2", "vz-k3", "vz-k4"];
export function zonen(e = {}) {
  const reihen = (e.zonen || []).map((z) => ({ name: z.name, wert: Number(z.ms) || 0, text: z.text, q: z.q, quelle: z.quelle, klasse: ZONEN_KLASSE[(Number(z.zone) || 1) - 1] || "vz-k1" }));
  const erg = balken({ verlauf: true, ...e, reihen });
  return { ...erg, art: "zonen", html: erg.html.replace('data-vz="balken"', 'data-vz="zonen"') };
}

// ------------------------------------------------------------------ Zeitreihe mit Band
export function zeitreihe(e = {}) {
  const N = normal(e), B = N.breite;
  if (!N.reihen.length) return leer(N, "zeitreihe");
  const OBEN = e.karten ? 40 : 0, H = 190 + OBEN, OB = 16 + OBEN, UN = 150 + OBEN, LI = 12, n = N.reihen.length; // karten: Platz über der Linie für die Hinweiskarte
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
  // Fläche unter der Linie (Verlauf Akzent → durchsichtig), nur mit e.flaeche
  const idF = e.flaeche && n > 1 ? neueId("vzf") : "";
  const flaeche = idF ? `<defs>${verlaufDef(idF, "vz-stopp-flaeche", "vz-stopp-flaeche", { deckA: 0.34, deckB: 0 })}</defs><path class="vz-flaeche" style="fill:url(#${idF})" d="M${f1(sx(0))},${f1(UN)} ${w.map((v, i) => `L${f1(sx(i))},${f1(sy(v))}`).join(" ")} L${f1(sx(n - 1))},${f1(UN)} Z"/>` : "";
  // Hinweiskarte je Punkt (sichtbar bei Zeigen/Fokus, ohne Auswahl die des letzten Punkts – design_viz.css)
  const karte = (r, x, y) => {
    const zeile = `${r.name} · ${r.text}`, bk = Math.max(56, breiteVon(zeile, 0.58) + 20), hk = 28;
    const kx = Math.min(Math.max(x - bk / 2, 0), B - bk), ky = y - hk - 12 < 0 ? y + 12 : y - hk - 12;
    return `<g class="vz-tip" aria-hidden="true"><rect x="${f1(kx)}" y="${f1(ky)}" width="${f1(bk)}" height="${hk}" rx="8"/><text x="${f1(kx + bk / 2)}" y="${f1(ky + 19)}" text-anchor="middle">${esc(zeile)}</text></g>`;
  };
  const punkte = N.reihen.map((r, i) => {
    const x = sx(i), y = sy(w[i]), letzter = i === n - 1;
    const name = (n - 1 - i) % jede === 0 ? (() => { const wn = breiteVon(r.name), nx = Math.min(Math.max(x, wn / 2 + 2), B - wn / 2 - 2); return `<text class="vz-name" x="${f1(nx)}" y="${H - 14}" text-anchor="middle">${esc(r.name)}</text>`; })() : "";
    const wert = letzter ? `<text class="vz-wert" x="${f1(x + 10)}" y="${f1(Math.max(y + 5, 14))}">${esc(r.text)}</text>` : "";
    return `<g ${zielAttr(r)}>${tip(r)}<circle class="vz-treffer" cx="${f1(x)}" cy="${f1(y)}" r="14"/><circle class="vz-punkt${r.klasse ? " " + esc(r.klasse) : ""}" cx="${f1(x)}" cy="${f1(y)}" r="${letzter ? 5 : 4}"/>${wert}${name}${e.karten ? karte(r, x, y) : ""}</g>`;
  }).join("");
  const achse = `<line class="vz-achse" x1="${LI}" x2="${f1(RE)}" y1="${UN + 6}" y2="${UN + 6}"/>`;
  const band = bd ? `<rect class="vz-band" x="${LI}" y="${f1(sy(bd.oben))}" width="${f1(RE - LI)}" height="${f1(Math.max(sy(bd.unten) - sy(bd.oben), 1))}" rx="4"/>` : "";
  const text = textAlt(N, bd?.text || "");
  const svg = svgHuelle(N, "zeitreihe", H, band + flaeche + achse + linie + punkte, text).replace('class="vz-svg vz-zeitreihe"', `class="vz-svg vz-zeitreihe${e.karten ? " vz-mit-karten" : ""}${n > 14 ? " vz-dicht" : ""}"`);
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

// ------------------------------------------------------------------ Sparkline (Kachel, Held, Trainingszeile)
/**
 * Kleine Linie ohne Achsen. punkte[i].x legt den Platz fest (0…plaetze−1), sonst die Reihenfolge – so bleiben Lücken (Tage ohne
 * Wert) sichtbar. band { unten, oben } = üblicher Bereich als leiser Streifen. alle: jeder Punkt als Punkt in seiner Klasse (Stufe),
 * sonst nur der letzte. linie: false = nur Punkte (Punktreihe). ziele: Punkte sind fokussierbare Ziele mit data-q (Belege).
 * beschriftung: Namen unter den Punkten (z. B. Wochentag). Kein Diagramm mit eigener Frage, sondern ein Bildzeichen: Titel und Satz
 * stehen in der Kachel bzw. im Helden; aria/text trägt die Werte.
 */
export function sparkline(e = {}) {
  const pk = (e.punkte || []).map((p, i) => (p && Number.isFinite(Number(p.wert)) ? { ...p, i, x: Number.isFinite(p.x) ? p.x : i, wert: Number(p.wert) } : null)).filter(Boolean);
  const text = e.aria || pk.map((p) => `${p.name ?? ""} ${p.text ?? p.wert}`.trim()).join("; ");
  if (!pk.length) return { art: "sparkline", svg: "", text, html: "", ziele: [] };
  const B = Number(e.breite) || 120, beschr = !!e.beschriftung, HL = beschr ? 18 : 0, H = (Number(e.hoehe) || 32) + HL, R = Number(e.radius) || 3, rand = R + 2;
  const plaetze = Math.max(Number(e.plaetze) || 0, ...pk.map((p) => p.x + 1));
  const bd = e.band && Number.isFinite(Number(e.band.unten)) && Number.isFinite(Number(e.band.oben)) ? { unten: Number(e.band.unten), oben: Number(e.band.oben) } : null;
  let lo = Math.min(...pk.map((p) => p.wert), ...(bd ? [bd.unten] : []), ...(Number.isFinite(e.min) ? [e.min] : []));
  let hi = Math.max(...pk.map((p) => p.wert), ...(bd ? [bd.oben] : []), ...(Number.isFinite(e.max) ? [e.max] : []));
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const sx = (x) => (plaetze <= 1 ? B / 2 : rand + (x / (plaetze - 1)) * (B - 2 * rand)), sy = (v) => H - HL - rand - ((v - lo) / (hi - lo)) * (H - HL - 2 * rand);
  const band = bd ? `<rect class="vz-band" x="0" y="${f1(sy(bd.oben))}" width="${B}" height="${f1(Math.max(sy(bd.unten) - sy(bd.oben), 1))}" rx="3"/>` : "";
  const pfad = pk.map((p, i) => `${i ? "L" : "M"}${f1(sx(p.x))},${f1(sy(p.wert))}`).join(" ");
  const idF = e.flaeche && pk.length > 1 ? neueId("vzs") : "";
  const flaeche = idF ? `<defs>${verlaufDef(idF, "vz-stopp-flaeche", "vz-stopp-flaeche", { deckA: 0.3, deckB: 0 })}</defs><path class="vz-flaeche" style="fill:url(#${idF})" d="${pfad} L${f1(sx(pk.at(-1).x))},${H - HL} L${f1(sx(pk[0].x))},${H - HL} Z"/>` : "";
  const linie = e.linie !== false && pk.length > 1 ? `<path class="vz-linie vz-spark-linie" d="${pfad}"/>` : "";
  const punkt = (p, letzter) => `<circle class="vz-punkt vz-spark-punkt${p.klasse ? " " + esc(p.klasse) : ""}${letzter ? " vz-letzter" : ""}" cx="${f1(sx(p.x))}" cy="${f1(sy(p.wert))}" r="${letzter ? R + 0.8 : R}"/>`;
  const name = (p) => (beschr && p.name ? `<text class="vz-name vz-spark-name" x="${f1(sx(p.x))}" y="${H - 3}" text-anchor="middle">${esc(p.name)}</text>` : "");
  const zeigen = e.alle ? pk : pk.slice(-1);
  const punkte = e.ziele
    ? pk.map((p, i) => `<g ${zielAttr({ ...p, text: p.text ?? String(p.wert) })}>${tip({ name: p.name ?? "", text: p.text ?? String(p.wert) })}<circle class="vz-treffer" cx="${f1(sx(p.x))}" cy="${f1(sy(p.wert))}" r="${Math.max(12, R + 8)}"/>${e.alle || i === pk.length - 1 ? punkt(p, i === pk.length - 1) : ""}${name(p)}</g>`).join("")
    : zeigen.map((p) => punkt(p, p === pk.at(-1))).join("") + pk.map(name).join("");
  const rolle = e.ziele ? `role="group"` : `role="img"`;
  const svg = `<svg class="vz-svg vz-spark${e.klasse ? " " + esc(e.klasse) : ""}" viewBox="0 0 ${B} ${H}" width="100%" ${rolle} aria-label="${esc(text)}" focusable="false">${band}${flaeche}${linie}${punkte}</svg>`;
  return { art: "sparkline", svg, text, html: `<span class="vz-spark-huelle" data-vz="sparkline">${svg}</span>`, ziele: e.ziele ? pk.map((p) => ({ i: p.i, name: p.name || "", q: p.q || "", quelle: p.quelle || null })) : [] };
}

// ------------------------------------------------------------------ Minibogen (flacher Bogen für Kacheln)
/** Flacher Bogen über 120°: Spur, gefüllter Teil in der Klasse, Endpunkt. anteilBp 0–10.000. */
export function minibogen(e = {}) {
  const bp = Math.max(0, Math.min(10000, Math.round(Number(e.anteilBp) || 0)));
  const B = Number(e.breite) || 120, S = 6, rand = S / 2 + 1, halb = 60, R = (B - 2 * rand) / (2 * Math.sin((halb * Math.PI) / 180));
  const H = R * (1 - Math.cos((halb * Math.PI) / 180)) + 2 * rand, cx = B / 2, cy = rand + R;
  const p = (grad) => { const w = (grad * Math.PI) / 180; return [cx + R * Math.sin(w), cy - R * Math.cos(w)]; };
  const bogen = (von, bis) => { const [x0, y0] = p(von), [x1, y1] = p(bis); return `M${f1(x0)},${f1(y0)} A${f1(R)},${f1(R)} 0 0 1 ${f1(x1)},${f1(y1)}`; };
  const ende = -halb + (2 * halb * bp) / 10000, [ex, ey] = p(ende), k = esc(e.klasse || "vz-k1");
  const text = e.aria || "";
  const svg = `<svg class="vz-svg vz-minibogen" viewBox="0 0 ${B} ${f1(H)}" width="100%" role="img" aria-label="${esc(text)}" focusable="false"><path class="vz-mb-spur" d="${bogen(-halb, halb)}" fill="none" stroke-width="${S}" stroke-linecap="round"/>${bp > 0 ? `<path class="vz-mb-wert ${k}" d="${bogen(-halb, ende)}" fill="none" stroke-width="${S}" stroke-linecap="round"/><circle class="vz-mb-kopf ${k}" cx="${f1(ex)}" cy="${f1(ey)}" r="${S / 2 + 1.5}"/>` : ""}</svg>`;
  return { art: "minibogen", svg, text, html: svg, ziele: [], anteilBp: bp };
}

// ------------------------------------------------------------------ Streifen (dünner Segmentbalken für Kacheln)
export function streifen(e = {}) {
  const seg = (e.segmente || []).filter((x) => x && Number(x.wert) > 0);
  const B = Number(e.breite) || 120, H = Number(e.hoehe) || 10, summe = seg.reduce((s2, x) => s2 + Number(x.wert), 0) || 1, luft = 2;
  const text = e.aria || seg.map((x) => `${x.name}: ${x.text}`).join("; ");
  let x = 0;
  const teile = seg.map((r) => { const b = (B * Number(r.wert)) / summe, el = `<rect class="vz-marke ${esc(r.klasse || "vz-k1")}" x="${f1(x)}" y="0" width="${f1(Math.max(b - luft, 1))}" height="${H}" rx="${f1(Math.min(H / 2, 3))}"/>`; x += b; return el; }).join("");
  const svg = `<svg class="vz-svg vz-streifen" viewBox="0 0 ${B} ${H}" width="100%" preserveAspectRatio="none" role="img" aria-label="${esc(text)}" focusable="false">${teile}</svg>`;
  return { art: "streifen", svg, text, html: svg, ziele: [] };
}

// ------------------------------------------------------------------ Hypnogramm (Schlafphasen über die Nacht)
/**
 * Je Phase ein Band (oben Wach, dann Traum, Leicht, Tief), darin die Abschnitte der Nacht als abgerundete Streifen mit Verlauf;
 * Wachphasen als schmale bernsteinfarbene Marken. Feine Stufenlinien verbinden die Wechsel. Unten die Uhrzeit (volle Stunden).
 * Ein Ziel je Phase (alle Abschnitte dieser Phase, data-q aus summen) – Tippen öffnet den Beleg der Phase. Legende mit Summen.
 */
export const HYPNO_REIHE = ["wach", "rem", "leicht", "tief"];
export function hypnogramm(e = {}) {
  const summen = (e.summen || []).filter(Boolean);
  const N = normal({ ...e, reihen: summen.map((x) => ({ ...x, wert: 0 })) });
  const phasen = (e.phasen || []).filter((p) => p && Number.isFinite(p.von) && Number.isFinite(p.bis) && p.bis > p.von && HYPNO_REIHE.includes(p.art));
  if (!phasen.length) return leer({ ...N, reihen: [] }, "hypnogramm");
  const B = N.breite, name = (a) => { const x = summen.find((y) => y.art === a); return x?.kurz || x?.name || a; };
  const LB = Math.min(84, Math.max(...HYPNO_REIHE.map((a) => breiteVon(name(a)) + 10))), RE = B - 4, BH = 34, OB = 4, ACHSE = 26;
  const H = OB + HYPNO_REIHE.length * BH + ACHSE;
  const von = Number.isFinite(e.vonMs) ? e.vonMs : Math.min(...phasen.map((p) => p.von)), bis = Number.isFinite(e.bisMs) ? e.bisMs : Math.max(...phasen.map((p) => p.bis));
  const sx = (ms) => LB + ((Math.max(von, Math.min(bis, ms)) - von) / Math.max(1, bis - von)) * (RE - LB);
  const zeile = (a) => HYPNO_REIHE.indexOf(a), ym = (a) => OB + zeile(a) * BH + BH / 2;
  const ids = Object.fromEntries(HYPNO_REIHE.map((a) => [a, neueId("vzh")]));
  const defs = `<defs>${HYPNO_REIHE.map((a) => verlaufDef(ids[a], "vz-stopp-" + a, "vz-stopp-" + a, { deckA: 1, deckB: 0.62 })).join("")}</defs>`;
  const raster = HYPNO_REIHE.map((a) => `<line class="vz-hyp-raster" x1="${LB}" x2="${RE}" y1="${f1(ym(a))}" y2="${f1(ym(a))}"/>`).join("");
  const sortiert = [...phasen].sort((a, b) => a.von - b.von);
  const stufen = sortiert.slice(1).map((p, i) => { const v = sortiert[i]; return v.art === p.art ? "" : `<line class="vz-hyp-stufe" x1="${f1(sx(p.von))}" x2="${f1(sx(p.von))}" y1="${f1(ym(v.art))}" y2="${f1(ym(p.art))}"/>`; }).join("");
  const baender = HYPNO_REIHE.map((a) => {
    const teile = sortiert.filter((p) => p.art === a);
    if (!teile.length) return "";
    const s = summen.find((x) => x.art === a) || { name: a, text: "" }, r = { i: zeile(a), name: s.name, text: s.text || "", q: s.q };
    const hoehe = a === "wach" ? BH - 10 : 20, y = ym(a) - hoehe / 2;
    const rects = teile.map((p) => { const x0 = sx(p.von), b = Math.max(a === "wach" ? 3 : 2, sx(p.bis) - x0 - 0.5); return `<rect class="vz-hyp vz-hyp-${a}" x="${f1(x0)}" y="${f1(y)}" width="${f1(b)}" height="${hoehe}" rx="${a === "wach" ? 1.5 : f1(Math.min(4, b / 2))}" style="fill:url(#${ids[a]})"/>`; }).join("");
    return `<g ${zielAttr(r)}>${tip(r)}<rect class="vz-treffer" x="0" y="${f1(OB + zeile(a) * BH)}" width="${B}" height="${BH}"/><text class="vz-name vz-hyp-name" x="0" y="${f1(ym(a) + 5)}">${esc(kuerzen(name(a), LB - 10))}</text>${rects}</g>`;
  }).join("");
  // Zeitachse: volle Stunden; Beschriftung nur so dicht, wie Platz ist
  const stunde = 3600000, erste = Math.ceil(von / stunde) * stunde, marken = [];
  for (let m = erste; m <= bis; m += stunde) marken.push(m);
  const zeit = typeof e.zeit === "function" ? e.zeit : (ms) => String(new Date(ms).getHours());
  const proStunde = (RE - LB) / Math.max(1, (bis - von) / stunde), jede = Math.max(1, Math.ceil((breiteVon(zeit(erste), F_ZAHL) + 12) / proStunde));
  const yA = OB + HYPNO_REIHE.length * BH;
  const achse = `<line class="vz-achse" x1="${LB}" x2="${RE}" y1="${yA + 2}" y2="${yA + 2}"/>` + marken.map((m, i) => {
    const x = sx(m), wn = breiteVon(zeit(m), F_ZAHL), tx = Math.min(Math.max(x, LB + wn / 2), RE - wn / 2);
    return `<line class="vz-achse" x1="${f1(x)}" x2="${f1(x)}" y1="${yA + 2}" y2="${yA + 6}"/>${i % jede === 0 ? `<text class="vz-name vz-achsen-text" x="${f1(tx)}" y="${yA + 21}" text-anchor="middle">${esc(zeit(m))}</text>` : ""}`;
  }).join("");
  const text = textAlt(N);
  const svg = svgHuelle(N, "hypnogramm", H, defs + raster + stufen + baender + achse, text);
  const legende = `<ul class="vz-legende vz-legende-zwei">${N.reihen.map((r) => `<li><i class="vz-farbe vz-farbe-${esc(r.art)}" aria-hidden="true"></i><span>${esc(r.kurz || r.name)}</span>${zahlKnopf(r)}</li>`).join("")}</ul>`;
  return { art: "hypnogramm", svg, text, html: figur(N, "hypnogramm", svg + legende, false), ziele: ziele(N) };
}

// ------------------------------------------------------------------ Bedarf gegen geschlafene Zeit (Doppelbalken mit Schuld)
export function bedarfBalken(e = {}) {
  const b = e.bedarf, s = e.ist, sch = e.schuld && Number(e.schuld.wert) > 0 ? e.schuld : null;
  const reihen = [b, s, sch].filter(Boolean);
  const N = normal({ ...e, reihen });
  if (!b || !s) return leer({ ...N, reihen: [] }, "bedarf");
  const B = N.breite, hi = Math.max(Number(b.wert) || 0, Number(s.wert) || 0, 1), skala = (v) => (B * Math.max(0, Number(v) || 0)) / hi;
  const ZH = 46, BH = 14, idS = neueId("vzm"), idV = neueId("vzv");
  const defs = `<defs>${sch ? `<pattern id="${idS}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="vz-schuld-grund" width="6" height="6"/><line class="vz-schuld-strich" x1="0" y1="0" x2="0" y2="6" stroke-width="2.4"/></pattern>` : ""}${verlaufDef(idV, "vz-stopp-k1", "vz-stopp-hell", { x2: 1, y2: 0 })}</defs>`;
  const kopf = (r, y) => `<text class="vz-name" x="0" y="${y + 14}">${esc(r.name)}</text><text class="vz-wert" x="${B}" y="${y + 14}" text-anchor="end">${esc(r.text)}</text>`;
  const zeileB = `<g ${zielAttr({ ...N.reihen[0] })}>${tip(N.reihen[0])}<rect class="vz-treffer" x="0" y="0" width="${B}" height="${ZH}"/>${kopf(b, 0)}<rect class="vz-bedarf" x="0" y="24" width="${f1(skala(b.wert))}" height="${BH}" rx="${BH / 2}"/></g>`;
  const zeileS = `<g ${zielAttr({ ...N.reihen[1] })}>${tip(N.reihen[1])}<rect class="vz-treffer" x="0" y="${ZH}" width="${B}" height="${ZH}"/>${kopf(s, ZH)}<rect class="vz-bedarf-spur" x="0" y="${ZH + 24}" width="${f1(Math.max(skala(b.wert), skala(s.wert)))}" height="${BH}" rx="${BH / 2}"/><rect class="vz-ist" x="0" y="${ZH + 24}" width="${f1(skala(s.wert))}" height="${BH}" rx="${BH / 2}" style="fill:url(#${idV})"/></g>`;
  const zeileSch = sch ? `<g ${zielAttr({ ...N.reihen[2] })}>${tip(N.reihen[2])}<rect class="vz-schuld" x="${f1(skala(s.wert) + 3)}" y="${ZH + 24}" width="${f1(Math.max(skala(b.wert) - skala(s.wert) - 3, 2))}" height="${BH}" rx="${BH / 2}" style="fill:url(#${idS})"/></g>` : "";
  const text = textAlt(N);
  const svg = svgHuelle(N, "bedarfbalken", 2 * ZH, defs + zeileB + zeileS + zeileSch, text);
  const legende = sch ? `<ul class="vz-legende vz-legende-zwei"><li><i class="vz-farbe vz-farbe-schuld" aria-hidden="true"></i><span>${esc(sch.name)}</span>${zahlKnopf(N.reihen[2])}</li></ul>` : "";
  return { art: "bedarf", svg, text, html: figur(N, "bedarf", svg + legende), ziele: ziele(N) };
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
