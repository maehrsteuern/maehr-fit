/* shell/apps/beleg.js – Belegfenster (Prüfpfad) als Bogen von unten.
 *
 * Kernaussage: Ein Tipp auf irgendeine Zahl öffnet dieses Fenster. Es sagt, was die Zahl ist, wie sie gerechnet wurde (Rechenweg
 * und Fundstelle aus dem Kern, unsichere Werte mit „noch zu prüfen“), aus welchen Teilen sie besteht und welche Messwerte dahinter
 * stehen – mit Art (Health Connect, CSV, Demo), Kennung und Datei/Zeile. Gibt es für den Tag eine Zahl von WHOOP, steht sie in einer
 * Zeile darunter („WHOOP: 67 %“) mit dem Weg zum Vergleich. Alle Zahlen laufen über einen einzigen Klick-Fang auf data-q in
 * shell/shell.js hierher.
 *
 * Aussehen: Griff oben (nach unten ziehen schließt), große Zahl, Rechenweg als Karte, Bestandteile mit Beitrag (Erholung) als Balken
 * links/rechts der Mitte, Messwerte als ruhige Karten. Ein Hinweis des Kerns (was nicht berücksichtigt wurde) steht leise darunter.
 *
 * Schnittstelle: belegHtml(eintrag, q) → HTML (rein) · oeffnen(dialog, eintrag, q) · ziehenSchliesst(dialog) · MAX_QUELLEN
 */
import { t, TEXTE } from "../i18n/i18n.js";
import { esc } from "../format.js";
import { IKON, zahlKnopf } from "../ui.js";
import { quellenAnzeige } from "../../daten/healthconnect.js";

export const MAX_QUELLEN = 25;

/** Messwerte dahinter als ruhige Karten: Art als Pille, Kennung, Datei und Zeile. */
function quellenKarten(quellen) {
  const q = (quellen || []).filter(Boolean);
  if (!q.length) return `<p class="mf-leise">${esc(t("beleg_keine_quellen"))}</p>`;
  const karten = q.slice(0, MAX_QUELLEN).map((x) => {
    const ort = [quellenAnzeige(x), x.datei, x.zeile !== undefined && x.zeile !== null ? `#${x.zeile}` : ""].filter(Boolean).join(" ");
    return `<li class="mf-quelle"><span class="mf-quelle-art">${esc(TEXTE["art_" + x.art] ? t("art_" + x.art) : x.art || "–")}</span><span class="mf-quelle-text"><span class="mf-quelle-id" title="${esc(t("beleg_kennung"))}">${esc(x.id || "–")}</span>${ort ? `<small title="${esc(t("beleg_ort"))}">${esc(ort)}</small>` : ""}</span></li>`;
  }).join("");
  const mehr = q.length > MAX_QUELLEN ? `<p class="mf-leise">${esc(t("beleg_weitere", { n: q.length - MAX_QUELLEN }))}</p>` : "";
  return `<ul class="mf-quellen">${karten}</ul>${mehr}`;
}

/** Bestandteile mit Zahl-Beitrag (Erholung): Balken nach links (Abzug) oder rechts (Zuschlag) um eine Mittellinie. */
function beitragsBalken(teile) {
  const max = Math.max(...teile.map((x) => Math.abs(x.beitrag)), 1e-9);
  return `<ul class="mf-beitraege">${teile.map((x) => {
    const anteil = Math.min(1, Math.abs(x.beitrag) / max), richtung = x.beitrag < 0 ? "minus" : "plus";
    return `<li class="mf-beitrag" data-richtung="${richtung}"><span class="mf-beitrag-name">${esc(x.name)}${x.gewicht ? ` <small>· ${esc(x.gewicht)}</small>` : ""}</span><span class="mf-beitrag-wert">${esc(x.wert)}</span><span class="mf-beitrag-spur" aria-hidden="true"><i style="--anteil:${anteil.toFixed(3)}"></i></span></li>`;
  }).join("")}</ul>`;
}

export function belegHtml(e, q = "") {
  const griff = `<div class="mf-beleg-griff" data-beleg-griff aria-hidden="true" title="${esc(t("beleg_ziehen"))}"><i></i></div>`;
  if (!e) return `${griff}<div class="mf-beleg-kopf"><h2 id="mf-beleg-titel">${esc(t("beleg_titel"))}</h2><button type="button" class="mf-rund" data-beleg-zu aria-label="${esc(t("schliessen"))}">${IKON.zu}</button></div><div class="mf-beleg-leib"><p>${esc(t("beleg_unbekannt"))}</p><p class="mf-leise">${esc(q)}</p></div>`;
  const f = e.formel;
  // Erklären vor Fachsprache: der einfache Satz (formeln.json „erklaerung“) steht über dem Rechenweg, sobald er vorhanden ist
  const erklaerung = f && f.erklaerung && f.erklaerung !== f.text ? `<p class="mf-formel-erklaerung" data-formel-erklaerung>${esc(f.erklaerung)}</p>` : "";
  const formel = f && f.text ? `<section class="mf-abschnitt"><h3 class="mf-beschriftung">${esc(t("beleg_formel"))}</h3>${erklaerung}<div class="mf-formel"><code>${esc(f.text)}</code>${f.fundstelle ? `<small>${esc(t("beleg_fundstelle", { text: f.fundstelle }))}</small>` : ""}${f.pruefen ? `<span><span class="mf-pruefen">${esc(t("beleg_pruefen"))}</span></span>` : ""}</div></section>` : "";
  const liste = e.teile || [], mitBeitrag = liste.length && liste.every((x) => Number.isFinite(x.beitrag));
  const tabelle = liste.length ? `<table class="mf-tab"><thead><tr><th>${esc(t("beleg_name"))}</th><th class="rechts">${esc(t("beleg_wert"))}</th>${liste.some((x) => x.gewicht) ? `<th class="rechts">${esc(t("beleg_gewicht"))}</th>` : ""}</tr></thead><tbody>${liste.map((x) => `<tr><td>${esc(x.name)}</td><td class="rechts">${esc(x.wert)}</td>${liste.some((y) => y.gewicht) ? `<td class="rechts">${esc(x.gewicht || "")}</td>` : ""}</tr>`).join("")}</tbody></table>` : "";
  const teile = liste.length ? `<section class="mf-abschnitt"><h3 class="mf-beschriftung">${esc(t(mitBeitrag ? "beleg_beitraege" : "beleg_teile"))}</h3>${mitBeitrag ? beitragsBalken(liste) : tabelle}${e.hinweis ? `<p class="mf-leise mf-beleg-hinweis" data-beleg-hinweis>${esc(e.hinweis)}</p>` : ""}</section>`
    : e.hinweis ? `<p class="mf-leise mf-beleg-hinweis" data-beleg-hinweis>${esc(e.hinweis)}</p>` : "";
  return `${griff}<div class="mf-beleg-kopf"><h2 id="mf-beleg-titel">${esc(e.titel)}</h2><button type="button" class="mf-rund" data-beleg-zu aria-label="${esc(t("schliessen"))}">${IKON.zu}</button></div>
    <div class="mf-beleg-leib" data-q-offen="${esc(q)}">
      <div class="mf-beleg-zahl"><p class="mf-beleg-wert">${esc(e.wert)}</p><p class="mf-leise">${esc(t("beleg_titel"))}</p></div>
      ${e.fremd ? `<p class="mf-beleg-fremd" data-beleg-fremd><span>WHOOP: ${zahlKnopf(e.fremd.q, e.fremd.text)}</span><a class="mf-link" href="${esc(e.fremd.href)}">${esc(t("vgl_zum_vergleich"))}</a></p>` : ""}
      ${formel}${teile}
      <section class="mf-abschnitt"><h3 class="mf-beschriftung">${esc(t("beleg_quellen"))}</h3>${quellenKarten(e.quellen)}</section>
    </div>`;
}

/** Bogen nach unten ziehen schließt ihn (Zeiger-Ereignisse, nur transform; unter 96 px schnappt er zurück). */
export function ziehenSchliesst(dialog) {
  if (!dialog || dialog._mfZiehen) return;
  dialog._mfZiehen = true;
  let start = null, dy = 0;
  dialog.addEventListener("pointerdown", (ev) => { if (!ev.target.closest("[data-beleg-griff], .mf-beleg-kopf")) return; start = ev.clientY; dy = 0; dialog.classList.add("mf-zieht"); dialog.setPointerCapture?.(ev.pointerId); });
  dialog.addEventListener("pointermove", (ev) => { if (start === null) return; dy = Math.max(0, ev.clientY - start); dialog.style.transform = dy ? `translateY(${dy}px)` : ""; });
  const ende = () => { if (start === null) return; start = null; dialog.classList.remove("mf-zieht"); dialog.style.transform = ""; if (dy > 96) dialog.close?.(); dy = 0; };
  dialog.addEventListener("pointerup", ende); dialog.addEventListener("pointercancel", ende);
}

export function oeffnen(dialog, eintrag, q) {
  ziehenSchliesst(dialog);
  dialog.innerHTML = belegHtml(eintrag, q);
  if (!dialog.open) { if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); }
  dialog.querySelector("[data-beleg-zu]")?.focus();
}
