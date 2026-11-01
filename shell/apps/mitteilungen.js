/* shell/apps/mitteilungen.js – „Mitteilungen & Widgets“ (aus „Mehr“, Weg #/mehr/mitteilungen; docs/apps/mitteilungen.md).
 *
 * Kernaussage: Hier stellst du ein, ob MAEHR FIT auch bei geschlossener App neue Werte holt, wann der Morgenbericht kommt und wie
 * du die Widgets auf den Startbildschirm bekommst. Oben steht in einem Satz, ob der Abgleich läuft und wann er zuletzt lief. Auf
 * Xiaomi-Handys braucht es zwei Schalter im System (Autostart, Akku) – die Knöpfe führen direkt dorthin. Im Browser gibt es das
 * alles nicht; die Seite sagt das ruhig in einem Satz.
 *
 * Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx) → aufräumen, setzeStatus(status) (Tests), ergebnisText(lauf), UHRZEITEN, INTERVALLE. Native Seite: daten/bruecke_capacitor.js
 *   (MF.native.hintergrund / mitteilungen / widgets / geraet), Plugin android/plugins/hintergrund/.
 * Beim Laden dieses Moduls hängt sich daten/hintergrund.js in der Android-App ein (Eingang beim Öffnen übernehmen, Zusammenfassung
 * beim Verlassen an Android geben). Im Browser und in Node passiert dabei nichts.
 */
import { t, locale } from "../i18n/i18n.js";
import { esc, zahl } from "../format.js";
import { kernaussage, kopf, zahlKnopf, beleg, tHtml, IKON } from "../ui.js";
import { vorZeit } from "./sync.js";
import { einhaengen } from "../../daten/hintergrund.js";

/** Zustand der Ansicht (modulweit, damit ein Neuzeichnen der Shell ihn nicht verliert). */
const Z = { geladen: false, status: null, laeuft: false, meldung: "" };

/** Auswahl der Uhrzeiten für den Morgenbericht: 05:00 bis 11:00 in Viertelstunden. */
export const UHRZEITEN = Array.from({ length: 25 }, (_, i) => { const m = 300 + i * 15; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; });
export const INTERVALLE = [30, 60, 120];

const nativ = () => globalThis.MF?.native || {};
const hatBruecke = () => typeof nativ().hintergrund?.status === "function";
const uhr = (ms) => (Number.isFinite(ms) && ms > 0 ? new Intl.DateTimeFormat(locale(), { weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ms)) : "–");
const XIAOMI = /xiaomi|redmi|poco/i;

/** Ergebnis eines Laufs als kurzer Satz. */
export function ergebnisText(lauf) {
  if (!lauf) return t("mt_nie");
  if (lauf.ergebnis === "ok") return lauf.neu === 1 ? t("mt_ergebnis_ok_eins") : lauf.neu > 0 ? t("mt_ergebnis_ok", { n: zahl(lauf.neu) }) : t("mt_ergebnis_nichts");
  if (lauf.ergebnis === "ohne_recht") return t("mt_ergebnis_ohne_recht");
  if (lauf.ergebnis === "kein_hc") return t("mt_ergebnis_kein_hc");
  if (lauf.ergebnis === "aus") return t("mt_ergebnis_aus");
  return t("mt_ergebnis_fehler", { text: lauf.fehler || "?" });
}

function kernNativ(B, s, jetzt) {
  if (!s) return esc(t("mt_kern_laedt"));
  if (!s.aktiv) return esc(t("mt_kern_aus"));
  if (s.hc && !s.hc.hintergrundErteilt) return esc(t("mt_kern_ohne_recht"));
  const m = s.mitteilungen?.morgen;
  const morgen = m?.aktiv ? " " + esc(m.uhrzeit === "aufwachen" ? t("mt_kern_morgen_auf") : t("mt_kern_morgen_zeit", { uhrzeit: m.uhrzeit })) : "";
  const l = s.letzterLauf;
  if (!l || !l.zeit) return esc(t("mt_kern_an_nie", { n: zahl(s.intervallMin) })) + morgen;
  const teile = [{ name: t("mt_teil_zeit"), wert: uhr(l.zeit) }, { name: t("mt_teil_ergebnis"), wert: ergebnisText(l) },
    ...Object.entries(l.arten || {}).map(([art, n]) => ({ name: art, wert: zahl(n) }))];
  const q = B("hintergrund:letzter", { titel: t("mt_beleg_lauf"), wert: uhr(l.zeit), teile, formel: null,
    quellen: Object.keys(l.arten || {}).map((art) => ({ art: "healthconnect", id: `eingang/${art}.jsonl`, datei: `files/eingang/${art}.jsonl` })) });
  return tHtml("mt_kern_an", { n: esc(zahl(s.intervallMin)), zeit: zahlKnopf(q, vorZeit(l.zeit, jetzt)) }) + morgen;
}

const KARTEN_IKON = { abgleich: "sync", morgen: "kalender", xiaomi: "einstellungen", widgets: "heute" };
const karte = (id, titel, text, inhalt) => `<section class="mf-karte mf-abschnitt mt-karte" data-karte="${id}"><h2 class="mt-titel"><span class="mf-pfeil-ikon" aria-hidden="true">${IKON[KARTEN_IKON[id]] || IKON.mehr}</span><span>${esc(titel)}</span></h2>${text ? `<p class="mf-leise">${esc(text)}</p>` : ""}${inhalt}</section>`;
const knopf = (aktion, text, art = "") => `<button type="button" class="mf-knopf${art ? " " + art : ""}" data-aktion="${aktion}"${Z.laeuft ? " disabled" : ""}>${esc(text)}</button>`;
const schalter = (name, titel, text, an) => `<label class="mf-schalter mt-schalter"><span class="mf-schalter-text"><span>${esc(titel)}</span><small>${esc(text)}</small></span><input type="checkbox" role="switch" name="${name}" data-einst="${name}"${an ? " checked" : ""}${Z.laeuft ? " disabled" : ""}></label>`;
const auswahl = (name, titel, werte, jetzt, aus = false) => `<label class="mf-feld mt-feld"><span>${esc(titel)}</span><select name="${name}" data-einst="${name}"${aus || Z.laeuft ? " disabled" : ""}>${werte.map(([w, txt]) => `<option value="${esc(w)}"${String(w) === String(jetzt) ? " selected" : ""}>${esc(txt)}</option>`).join("")}</select></label>`;
const fakt = (titel, wert, zusatz = "") => `<li class="mf-zeile mt-fakt"><span class="mf-zeile-text"><strong>${esc(titel)}</strong><small>${esc(wert)}</small></span>${zusatz}</li>`;

function ansichtNativ(B, s, jetzt) {
  const hc = s?.hc || {}, mt = s?.mitteilungen || {}, m = mt.morgen || { aktiv: false, uhrzeit: "07:30" };
  const naechster = s?.aktiv && s?.naechsterLauf ? t("mt_ungefaehr", { zeit: uhr(s.naechsterLauf) }) : "–";
  const hcWert = !hc.verfuegbar ? t("mt_ergebnis_kein_hc") : !hc.hintergrundMoeglich ? t("mt_hc_geht_nicht") : hc.hintergrundErteilt ? t("mt_hc_ja") : t("mt_hc_nein");
  const hcKnoepfe = hc.verfuegbar ? `<div class="mf-knopfreihe">${hc.hintergrundMoeglich && !hc.hintergrundErteilt ? knopf("hc-erlauben", t("mt_hc_erlauben"), "primaer") : ""}${knopf("hc-oeffnen", t("mt_hc_oeffnen"))}</div>
      ${hc.hintergrundMoeglich && !hc.hintergrundErteilt ? `<p class="mf-leise">${esc(t("mt_hc_hilfe"))}</p>` : ""}` : "";
  const abgleich = karte("abgleich", t("mt_abgleich_titel"), t("mt_abgleich_text"), `
      <div class="mf-liste mt-liste">${schalter("aktiv", t("mt_abgleich_an"), t("mt_abgleich_an_text"), !!s?.aktiv)}</div>
      ${auswahl("intervallMin", t("mt_intervall"), INTERVALLE.map((n) => [n, t("mt_intervall_" + n)]), s?.intervallMin || 60, !s?.aktiv)}
      <ul class="mf-liste mt-fakten">
        ${fakt(t("mt_letzter"), s?.letzterLauf?.zeit ? `${uhr(s.letzterLauf.zeit)} · ${ergebnisText(s.letzterLauf)}` : t("mt_nie"))}
        ${fakt(t("mt_naechster"), naechster)}
        ${fakt(t("mt_hc_recht"), hcWert)}
      </ul>
      ${hcKnoepfe}
      <div class="mf-knopfreihe">${knopf("jetzt", t("mt_jetzt"), hc.verfuegbar ? "" : "leise")}</div>`);
  const rechtFehlt = mt.recht && mt.recht !== "granted";
  const morgen = karte("morgen", t("mt_morgen_titel"), t("mt_morgen_text"), `
      ${rechtFehlt ? `<div class="mt-hinweis" role="note"><p>${esc(t("mt_recht_fehlt"))}</p><div class="mf-knopfreihe">${knopf(mt.recht === "denied" ? "mt-einstellungen" : "recht", mt.recht === "denied" ? t("mt_recht_einstellungen") : t("mt_recht_erlauben"), "primaer")}</div></div>` : ""}
      <div class="mf-liste mt-liste">${schalter("morgen", t("mt_morgen_an"), t("mt_morgen_an_text"), !!m.aktiv)}</div>
      ${auswahl("uhrzeit", t("mt_morgen_wann"), [["aufwachen", t("mt_morgen_aufwachen")], ...UHRZEITEN.map((u) => [u, u])], m.uhrzeit || "07:30", !m.aktiv)}
      <div class="mf-liste mt-liste">${schalter("erholung", t("mt_erholung_an"), t("mt_erholung_an_text"), !!mt.erholung?.aktiv)}${schalter("schlaf", t("mt_schlaf_an"), t("mt_schlaf_an_text"), !!mt.schlaf?.aktiv)}</div>
      <div class="mf-knopfreihe">${knopf("test", t("mt_test"))}</div>`);
  const xiaomi = XIAOMI.test(s?.geraet?.hersteller || "");
  const geraet = karte("xiaomi", xiaomi ? t("mt_xiaomi_titel") : t("mt_andere_titel"), xiaomi ? t("mt_xiaomi_text") : t("mt_andere_text"), `
      <div class="mf-knopfreihe">${xiaomi ? knopf("autostart", t("mt_autostart"), "primaer") : ""}${knopf("akku", t("mt_akku"))}</div>`);
  const w = s?.widgets || {}, n = (w.erholung || 0) + (w.heute || 0) + (w.schlaf || 0);
  const widgets = karte("widgets", t("mt_widgets_titel"), t("mt_widgets_text"), `
      <p class="mf-leise">${esc(t("mt_widgets_anzahl", { n: zahl(n) }))}</p>
      <div class="mf-knopfreihe">${knopf("widgets", t("mt_widgets_jetzt"))}</div>`);
  return `${kernaussage(kernNativ(B, s, jetzt))}
    <p class="mf-status mt-status" role="status" aria-live="polite" data-status="mitteilungen">${esc(Z.meldung)}</p>
    ${abgleich}${morgen}${geraet}${widgets}`;
}

function ansichtBrowser() {
  return `${kernaussage(esc(t("mt_kern_browser")))}
    <section class="mf-karte mf-abschnitt mt-karte" data-karte="browser"><h2 class="mt-titel"><span class="mf-pfeil-ikon" aria-hidden="true">${IKON.heute}</span><span>${esc(t("mt_browser_punkte"))}</span></h2>
      <ul class="mt-punkte"><li>${esc(t("mt_browser_1"))}</li><li>${esc(t("mt_browser_2"))}</li><li>${esc(t("mt_browser_3"))}</li></ul></section>`;
}

export function ansicht(ctx) {
  const B = beleg(ctx.register), jetzt = Date.now();
  const nativOk = hatBruecke();
  return `<div class="mf-sicht" data-sicht="mitteilungen" data-modus="${nativOk ? "android" : "browser"}">
    ${kopf(t("mt_titel"), { zurueck: "#/mehr" })}
    ${nativOk ? ansichtNativ(B, Z.geladen ? Z.status : null, jetzt) : ansichtBrowser()}
  </div>`;
}

/** Stand von außen setzen (Tests, Vorschau); null = wieder „wird geladen“. */
export function setzeStatus(status) { Z.status = status; Z.geladen = status !== null; Z.meldung = ""; Z.laeuft = false; }

async function laden() {
  Z.status = await nativ().hintergrund.status();
  Z.geladen = true;
}

/** Werte der Formularfelder → Einstellungen für Android. */
function lesenFormular(wurzel) {
  const an = (n) => !!wurzel.querySelector(`[data-einst="${n}"]`)?.checked;
  const w = (n) => wurzel.querySelector(`[data-einst="${n}"]`)?.value;
  return {
    hintergrund: { aktiv: an("aktiv"), intervallMin: Number(w("intervallMin")) || 60 },
    mitteilungen: { morgen: { aktiv: an("morgen"), uhrzeit: w("uhrzeit") || "07:30" }, erholung: { aktiv: an("erholung") }, schlaf: { aktiv: an("schlaf") } },
  };
}

export function binde(wurzel, ctx) {
  let lebt = true;
  if (!hatBruecke()) return () => { lebt = false; };
  const neu = () => { const s = wurzel.querySelector('[data-sicht="mitteilungen"]'); if (lebt && s) s.outerHTML = ansicht(ctx); };
  const fehlerText = (e) => t("mt_fehler", { text: String(e?.message || e) });
  async function arbeit(fn) {
    Z.laeuft = true; Z.meldung = ""; neu();
    try { Z.meldung = (await fn()) || ""; } catch (e) { Z.meldung = fehlerText(e); }
    try { await laden(); } catch { /* Stand bleibt */ }
    Z.laeuft = false; neu();
  }
  const N = nativ();
  const klick = (ev) => {
    const k = ev.target.closest("button[data-aktion]"); if (!k || k.disabled) return;
    const a = k.dataset.aktion;
    if (a === "jetzt") arbeit(async () => { await N.hintergrund.jetzt(); return t("mt_jetzt_gestartet"); });
    if (a === "hc-erlauben") arbeit(async () => { await N.hintergrund.hcHintergrundAnfragen(); return ""; });
    if (a === "hc-oeffnen") arbeit(async () => { await N.geraet.healthConnect(); return ""; });
    if (a === "recht") arbeit(async () => { await N.mitteilungen.rechtAnfragen(); return ""; });
    if (a === "mt-einstellungen") arbeit(async () => { await N.geraet.mitteilungsEinstellungen(); return ""; });
    if (a === "test") arbeit(async () => { await N.mitteilungen.test(); return t("mt_test_gesendet"); });
    if (a === "autostart") arbeit(async () => { await N.geraet.autostartEinstellungen(); return ""; });
    if (a === "akku") arbeit(async () => { await N.geraet.akkuEinstellungen(); return ""; });
    if (a === "widgets") arbeit(async () => { await globalThis.__mfHintergrund?.spiegeln(); await N.widgets.aktualisieren(); return t("mt_widgets_fertig"); });
  };
  const aenderung = (ev) => {
    const feld = ev.target.closest("[data-einst]"); if (!feld) return;
    const f = lesenFormular(wurzel);
    const hg = ["aktiv", "intervallMin"].includes(feld.dataset.einst);
    arbeit(async () => { if (hg) await N.hintergrund.einstellen(f.hintergrund); else await N.mitteilungen.einstellen(f.mitteilungen); return ""; });
  };
  // Wer aus den System-Einstellungen zurückkommt, sieht den neuen Stand
  const sichtbar = () => { if (document.visibilityState === "visible" && lebt) laden().then(neu).catch(() => {}); };
  wurzel.addEventListener("click", klick);
  wurzel.addEventListener("change", aenderung);
  document.addEventListener("visibilitychange", sichtbar);
  laden().then(neu).catch((e) => { Z.meldung = fehlerText(e); Z.geladen = true; neu(); });
  return () => { lebt = false; wurzel.removeEventListener("click", klick); wurzel.removeEventListener("change", aenderung); document.removeEventListener("visibilitychange", sichtbar); };
}

// In der Android-App: Eingang beim Öffnen übernehmen, Zusammenfassung beim Verlassen spiegeln (daten/hintergrund.js).
if (typeof window !== "undefined" && typeof document !== "undefined") einhaengen(window);
