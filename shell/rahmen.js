/* shell/rahmen.js – Kopfleiste, Menü und Reiterleiste als reines Markup (ohne DOM, testbar).
 *
 * Kernaussage: Oben stehen genau fünf Dinge – Marke „MF“, Tageswahl ‹ heute ›, Hell/Dunkel, Sprache, Menü (Regel: höchstens
 * sechs, tests/node/ruhe.test.mjs). Unten stehen fünf Reiter: Heute · Schlaf · Belastung · Atem · Mehr. Alles sind echte Knöpfe
 * oder Links mit mindestens 44 px Tippfläche und einer Beschriftung für Screenreader.
 *
 * Unter der Kopfleiste steht in den Tagesansichten eine leise Zeile zum Abgleich mit Health Connect: „Zuletzt abgeglichen:
 * vor 3 Minuten · Aktualisieren“ (oder „Health Connect nicht verbunden · Verbinden“). Der Knopf trägt data-aktion="abgleich".
 *
 * Schnittstelle: kopfHtml({ tag, heute, erster, thema }) · menueHtml() · reiterHtml(aktiv) · REITER
 *   · zuletztText(ms, jetzt) · abgleichText(a, jetzt) · abgleichZeileHtml(a, jetzt)
 *   a = { hcVerfuegbar, bekannt, verbunden, laeuft, fehler, letzterMs } (Zustand der Shell, shell/shell.js)
 */
import { t, sprache, SPRACHEN } from "./i18n/i18n.js";
import { esc, tagName } from "./format.js";
import { IKON } from "./ui.js";
import { tagPlus } from "./kern.js";
import { EINTRAEGE } from "./apps/mehr.js";
import { zuletzt } from "./abgleich.js";

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
  return `<nav class="mf-reiter" aria-label="${esc(t("reiter_label"))}">${REITER.map((r) => `<a href="#/${r}"${r === aktiv ? ' aria-current="page"' : ""}><span class="mf-reiter-ikon">${IKON[r]}</span><span class="mf-reiter-text">${esc(t("reiter_" + r))}</span></a>`).join("")}</nav>`;
}

/** „vor 3 Minuten“, „gerade eben“, „vor 2 Tagen“ – Abstand zum letzten Abgleich in Worten. */
export function zuletztText(ms, jetzt = Date.now()) {
  const z = zuletzt(ms, jetzt);
  if (z.einheit === "nie") return t("abgleich_nie");
  if (z.einheit === "gerade") return t("abgleich_gerade");
  const einzahl = { minuten: "abgleich_minute", stunden: "abgleich_stunde", tage: "abgleich_tag" }[z.einheit];
  return z.n === 1 ? t(einzahl) : t("abgleich_" + z.einheit, { n: z.n });
}

/** Text der Abgleich-Zeile ohne Knopf: läuft, Fehler, zuletzt oder noch nie. */
export function abgleichText(a, jetzt = Date.now()) {
  if (a?.laeuft) return t("abgleich_laeuft");
  if (a?.fehler) return t("abgleich_fehler");
  return a?.letzterMs ? t("abgleich_zuletzt", { wann: zuletztText(a.letzterMs, jetzt) }) : t("abgleich_nie");
}

/** Leise Zeile über der Tagesansicht; leer, solange Health Connect fehlt (Browser) oder der Zustand noch geladen wird. */
export function abgleichZeileHtml(a, jetzt = Date.now()) {
  if (!a?.hcVerfuegbar || !a.bekannt) return "";
  const punkt = '<span class="mf-abgleich-punkt" aria-hidden="true">·</span>';
  if (!a.verbunden) return `<p class="mf-abgleich" data-abgleich-zeile><span>${esc(t("abgleich_nicht_verbunden"))}</span>${punkt}<a class="mf-abgleich-knopf" href="#/daten">${esc(t("abgleich_verbinden"))}</a></p>`;
  const knopf = a.laeuft ? "" : `${punkt}<button type="button" class="mf-abgleich-knopf" data-aktion="abgleich">${esc(t(a.fehler ? "abgleich_erneut" : "abgleich_aktualisieren"))}</button>`;
  return `<p class="mf-abgleich" data-abgleich-zeile${a.laeuft ? ' aria-busy="true"' : ""}><span>${esc(abgleichText(a, jetzt))}</span>${knopf}</p>`;
}
