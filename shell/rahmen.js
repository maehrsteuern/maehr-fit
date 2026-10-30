/* shell/rahmen.js – Kopfleiste, Menü und Reiterleiste als reines Markup (ohne DOM, testbar).
 *
 * Kernaussage: Oben stehen genau fünf Dinge – Marke „MF“, Tageswahl ‹ heute ›, Hell/Dunkel, Sprache, Menü (Regel: höchstens
 * sechs, tests/node/ruhe.test.mjs). Unten stehen fünf Reiter: Heute · Schlaf · Belastung · Atem · Mehr. Alles sind echte Knöpfe
 * oder Links mit mindestens 44 px Tippfläche und einer Beschriftung für Screenreader.
 *
 * Schnittstelle: kopfHtml({ tag, heute, erster, thema }) · menueHtml() · reiterHtml(aktiv) · REITER
 */
import { t, sprache, SPRACHEN } from "./i18n/i18n.js";
import { esc, tagName } from "./format.js";
import { IKON } from "./ui.js";
import { tagPlus } from "./kern.js";
import { EINTRAEGE } from "./apps/mehr.js";

export const REITER = ["heute", "schlaf", "belastung", "atem", "mehr"];

export function kopfHtml({ tag, heute, erster = null, thema = "auto" }) {
  const name = tagName(tag, heute, tagPlus(heute, -1)), naechster = tag < heute, voriger = !erster || tag > erster;
  const sp = SPRACHEN.find((s) => s.id === sprache()) || SPRACHEN[0], th = t("thema", { wert: t("thema_" + (thema || "auto")) });
  return `<header class="mf-kopf" role="banner"><a class="mf-marke" href="#/heute" aria-label="${esc(t("marke_titel"))}">MF</a><div class="mf-tagwahl" role="group" aria-label="${esc(t("tag_waehlen", { tag: name }))}"><button type="button" class="mf-rund" data-tag="-1" aria-label="${esc(t("tag_vorher"))}"${voriger ? "" : " disabled"}>${IKON.links}</button><button type="button" class="mf-tag-text" data-tag="heute" title="${esc(t("tag_waehlen", { tag: name }))}">${esc(name)}</button><button type="button" class="mf-rund" data-tag="1" aria-label="${esc(t("tag_nachher"))}"${naechster ? "" : " disabled"}>${IKON.rechts}</button></div><button type="button" class="mf-rund" data-kopf="thema" aria-label="${esc(th)}" title="${esc(th)}">${IKON.thema}</button><button type="button" class="mf-rund" data-kopf="sprache" aria-label="${esc(t("sprache_wechseln"))}" title="${esc(t("sprache_wechseln"))}"><span class="mf-sprache-text">${esc(sp.kurz)}</span></button><button type="button" class="mf-rund" data-kopf="menue" aria-label="${esc(t("menue"))}" aria-haspopup="menu" aria-expanded="false" aria-controls="mf-menue">${IKON.menue}</button></header>`;
}

export function menueHtml() {
  return `<nav class="mf-menue" id="mf-menue" role="menu" aria-label="${esc(t("menue"))}" hidden>${EINTRAEGE.map((e) => `<a role="menuitem" href="#/${e.id}">${esc(t(e.titel))}</a>`).join("")}</nav>`;
}

export function reiterHtml(aktiv) {
  return `<nav class="mf-reiter" aria-label="${esc(t("reiter_label"))}">${REITER.map((r) => `<a href="#/${r}"${r === aktiv ? ' aria-current="page"' : ""}>${IKON[r]}<span>${esc(t("reiter_" + r))}</span></a>`).join("")}</nav>`;
}
