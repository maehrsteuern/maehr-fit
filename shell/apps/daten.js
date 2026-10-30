/* shell/apps/daten.js – „Daten“ und „Einstellungen“ (docs/apps/daten.md).
 *
 * Kernaussage: Hier verbindest du Health Connect (nur in der Android-App), liest eine CSV-Datei ein, sicherst alles als Datei
 * oder löschst alles. Nichts verlässt dein Gerät. In den Einstellungen trägst du Alter, Höchstpuls und Schlafbedarf ein und
 * wählst Sprache, Darstellung und Vibration; gespeichert wird sofort.
 *
 * Routen: #/daten · #/einstellungen. Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx).
 * Aktionen kommen von der Shell (ctx.aktionen): hcVerbinden, csvEinlesen(datei), exportieren, allesLoeschen, einstellungenSetzen(teil).
 * Health Connect und CSV liefert die Datenschicht als window.MF.daten.healthConnect.verbinden() und window.MF.daten.csvImport(datei).
 * Nach dem Einlesen steht unter der CSV-Karte, was ankam: „55 Messwerte eingelesen: 7 Schlaf, 5 Trainings, …“ und der Zeitraum
 * (csvEinlesen liefert { n, arten, zeitraum, hinweise }). Das Alter schätzt den Höchstpuls (Kern maxPulsAus, Tanaka 2001), solange
 * kein eigener eingetragen ist; der Ruhepuls (optional) gilt nur, wenn keine Nachtmessung ihn liefert (z. B. nur Live-Puls); der Grundbedarf Schlaf ersetzt den Wert aus formeln.json „schlaf.bedarf.basis“.
 */
import { t, SPRACHEN, TEXTE, sprache } from "../i18n/i18n.js";
import { zahl, esc, tagLang } from "../format.js";
import { kernaussage, kopf, zahlKnopf, beleg, tHtml } from "../ui.js";
import { maxPulsAus, schlafBasisStandardMs } from "../kern.js";
// Beschriftung „Ruhepuls“ steht in kern/i18n.js (shell/i18n wird parallel umgebaut)
import { kernText } from "../kern_echt.js";
import { ARTEN } from "../../daten/ablage.js";

/** „55 Messwerte eingelesen: 7 Schlaf, 5 Trainings, … Zeitraum: … bis ….“ – reiner Text für die Statuszeile. */
export function importText(r, dateien = []) {
  if (Number.isFinite(r)) return t("csv_ok", { n: zahl(r), datei: dateien.join(", ") });
  const arten = r?.arten || {};
  const liste = ARTEN.filter((a) => arten[a] > 0).map((a) => `${zahl(arten[a])} ${TEXTE["datenart_" + a] ? t("datenart_" + a) : a}`).join(", ");
  const summe = Object.values(arten).reduce((s, n) => s + (Number(n) || 0), 0);
  const saetze = [t("csv_ok_arten", { n: zahl(summe || r?.n || 0), liste: liste || "–" })];
  if (r?.zeitraum?.von) saetze.push(t("csv_zeitraum", { von: tagLang(r.zeitraum.von), bis: tagLang(r.zeitraum.bis) }));
  if (r?.hinweise?.length) saetze.push(t("csv_hinweise", { n: zahl(r.hinweise.length) }));
  return saetze.join(" · ");
}

const karte = (titel, text, inhalt, id) => `<section class="mf-karte mf-abschnitt" data-karte="${id}"><h2>${esc(titel)}</h2><p class="mf-leise">${esc(text)}</p>${inhalt}<p class="mf-status" role="status" aria-live="polite" data-status="${id}"></p></section>`;

function daten(ctx) {
  const hc = ctx.hcVerfuegbar
    ? `<div class="mf-knopfreihe"><button type="button" class="mf-knopf primaer" data-aktion="hc">${esc(t("hc_verbinden"))}</button></div>`
    : `<p class="mf-hinweis">${esc(t("hc_nur_android"))}</p>`;
  const csv = ctx.csvVerfuegbar
    ? `<div class="mf-knopfreihe"><label class="mf-knopf"><input type="file" accept=".csv,.zip,text/csv,application/zip" multiple class="mf-versteckt" data-aktion="csv">${esc(t("csv_waehlen"))}</label></div>`
    : `<p class="mf-hinweis">${esc(t("csv_fehlt"))}</p>`;
  return `<div class="mf-sicht" data-sicht="daten">
    ${kopf(t("daten_titel"), { zurueck: "#/mehr" })}
    ${kernaussage(esc(t(ctx.demo ? "daten_kern_demo" : "daten_kern_eigen")))}
    <p class="mf-leise">${esc(t("quelle_jetzt", { quelle: t(ctx.demo ? "quelle_demo" : "quelle_eigen") }))}</p>
    ${karte(t("hc_titel"), t("hc_text"), hc, "hc")}
    ${karte(t("csv_titel"), t("csv_text"), csv, "csv")}
    ${karte(t("export_titel"), t("export_text"), `<div class="mf-knopfreihe"><button type="button" class="mf-knopf" data-aktion="export">${esc(t("export_knopf"))}</button></div>`, "export")}
    ${karte(t("loeschen_titel"), t("loeschen_text"), `<div class="mf-knopfreihe" data-loeschen-start><button type="button" class="mf-knopf gefahr" data-aktion="loeschen-frage">${esc(t("loeschen_knopf"))}</button></div>
      <div class="mf-abschnitt" data-loeschen-frage hidden><p>${esc(t("loeschen_frage"))}</p><div class="mf-knopfreihe"><button type="button" class="mf-knopf" data-aktion="loeschen-nein">${esc(t("abbrechen"))}</button><button type="button" class="mf-knopf gefahr" data-aktion="loeschen-ja">${esc(t("loeschen_ja"))}</button></div></div>`, "loeschen")}
  </div>`;
}

/** Höchstpuls aus dem Alter schätzen und den Beleg dazu anmelden (Kern maxPulsAus, formeln.json „puls.max.tanaka“). */
function maxPulsBeleg(B, alter, demoAlter) {
  const a = Number(alter) || Number(demoAlter) || null;
  const g = maxPulsAus(a) || { wert: null, formel: null };
  B("maxpuls:schaetzung", { titel: t("einst_maxpuls"), wert: `${zahl(g.wert)} ${t("einheit_bpm")}`, formel: g.formel, teile: [{ name: t("einst_alter"), wert: zahl(a) }], quellen: [] });
  return g;
}

function einstellungen(ctx) {
  const e = ctx.einst || {}, B = beleg(ctx.register);
  const geschaetzt = maxPulsBeleg(B, e.alter, ctx.demoEinstellungen?.alter);
  const standardH = schlafBasisStandardMs() / 3600000;
  const stunden = Number(e.schlafBasisMs) ? Number(e.schlafBasisMs) / 3600000 : "";
  const feld = (name, label, eingabe, hilfe) => `<label class="mf-feld"><span>${esc(label)}</span>${eingabe}${hilfe ? `<small>${hilfe}</small>` : ""}</label>`;
  const auswahl = (name, werte, jetzt) => `<select name="${name}">${werte.map(([w, txt]) => `<option value="${esc(w)}"${String(w) === String(jetzt) ? " selected" : ""}>${esc(txt)}</option>`).join("")}</select>`;
  return `<div class="mf-sicht" data-sicht="einstellungen">
    ${kopf(t("einstellungen_titel"), { zurueck: "#/mehr" })}
    ${kernaussage(esc(t("einst_kern")))}
    <form class="mf-karte mf-formular" data-einstellungen novalidate>
      ${feld("alter", t("einst_alter"), `<input name="alter" type="number" inputmode="numeric" min="10" max="110" step="1" value="${esc(e.alter ?? "")}">`, esc(t("einst_alter_hilfe")))}
      ${feld("maxPuls", t("einst_maxpuls"), `<input name="maxPuls" type="number" inputmode="numeric" min="100" max="230" step="1" value="${esc(e.maxPuls ?? "")}" placeholder="${esc(zahl(geschaetzt.wert))}">`,
        tHtml("einst_maxpuls_hilfe", { wert: zahlKnopf("maxpuls:schaetzung", zahl(geschaetzt.wert)) }))}
      ${feld("ruhepuls", kernText("einst.ruhepuls", sprache()), `<input name="ruhepuls" type="number" inputmode="numeric" min="30" max="120" step="1" value="${esc(e.ruhepuls ?? "")}">`, esc(kernText("einst.ruhepuls.hilfe", sprache())))}
      ${feld("schlaf", t("einst_schlaf"), `<input name="schlaf" type="number" inputmode="decimal" min="4" max="12" step="0.25" value="${esc(stunden)}" placeholder="${esc(zahl(standardH, Number.isInteger(standardH) ? 0 : 2))}">`, esc(t("einst_schlaf_standard", { wert: zahl(standardH, Number.isInteger(standardH) ? 0 : 2) })))}
      ${feld("sprache", t("einst_sprache"), auswahl("sprache", SPRACHEN.map((s) => [s.id, s.name]), e.sprache || "de"))}
      ${feld("thema", t("einst_thema"), auswahl("thema", [["auto", t("thema_auto")], ["hell", t("thema_hell")], ["dunkel", t("thema_dunkel")]], e.thema || "auto"))}
    </form>
    <div class="mf-liste"><label class="mf-schalter"><span class="mf-schalter-text"><span>${esc(t("einst_haptik"))}</span><small>${esc(t("einst_haptik_text"))}</small></span><input type="checkbox" role="switch" name="haptik" data-einst-haptik${e.haptik ? " checked" : ""}></label></div>
    <p class="mf-status" role="status" aria-live="polite" data-status="einst"></p>
  </div>`;
}

export function ansicht(ctx) {
  return (ctx.route?.teile || [])[0] === "einstellungen" ? einstellungen(ctx) : daten(ctx);
}

export function binde(wurzel, ctx) {
  const A = ctx.aktionen || {};
  const status = (id, text) => { const el = document.querySelector(`[data-status="${id}"]`); if (el) el.textContent = text; };   // nach dem Einlesen ist die Ansicht neu gezeichnet
  const fehlerText = (e) => String(e?.message || e);
  wurzel.addEventListener("click", async (ev) => {
    const k = ev.target.closest("button[data-aktion]"); if (!k) return;
    const a = k.dataset.aktion;
    if (a === "hc") { try { const n = await A.hcVerbinden(); status("hc", t("hc_ok", { n: zahl(n) })); } catch (e) { status("hc", t("hc_fehler", { text: fehlerText(e) })); } }
    if (a === "export") { try { const n = await A.exportieren(); status("export", t("export_ok", { n: zahl(n) })); } catch (e) { status("export", fehlerText(e)); } }
    if (a === "loeschen-frage" || a === "loeschen-nein") {
      const frage = a === "loeschen-frage";
      wurzel.querySelector("[data-loeschen-frage]").hidden = !frage; wurzel.querySelector("[data-loeschen-start]").hidden = frage;
      (frage ? wurzel.querySelector('[data-aktion="loeschen-nein"]') : wurzel.querySelector('[data-aktion="loeschen-frage"]'))?.focus();
    }
    if (a === "loeschen-ja") { try { await A.allesLoeschen(); } catch (e) { status("loeschen", fehlerText(e)); } }
  });
  wurzel.querySelector('input[data-aktion="csv"]')?.addEventListener("change", async (ev) => {
    const dateien = ev.target.files; if (!dateien?.length) return;
    const namen = [...dateien].map((d) => d.name);
    try { const r = await A.csvEinlesen(dateien); status("csv", importText(r, namen)); } catch (e) { status("csv", t("csv_fehler", { text: fehlerText(e) })); }
  });
  const form = wurzel.querySelector("form[data-einstellungen]");
  const speichern = async (teil) => { try { await A.einstellungenSetzen(teil); status("einst", t("einst_gespeichert")); } catch (e) { status("einst", fehlerText(e)); } };
  form?.addEventListener("submit", (ev) => ev.preventDefault());
  form?.addEventListener("change", (ev) => {
    const el = ev.target, w = el.value;
    if (el.name === "alter") {
      const alter = w === "" ? null : Math.round(Number(w));
      speichern({ alter });
      // Schätzung sofort nachziehen (die Ansicht wird zum Halten des Fokus nicht neu gezeichnet)
      const g = maxPulsBeleg(beleg(ctx.register), alter, ctx.demoEinstellungen?.alter), text = zahl(g.wert);
      const mp = form.querySelector('input[name="maxPuls"]'); if (mp) mp.placeholder = text;
      const k = form.querySelector('[data-q="maxpuls:schaetzung"]'); if (k) k.textContent = text;
    }
    if (el.name === "maxPuls") speichern({ maxPuls: w === "" ? null : Math.round(Number(w)) });
    if (el.name === "ruhepuls") speichern({ ruhepuls: w === "" ? null : Math.round(Number(w)) });
    if (el.name === "schlaf") speichern({ schlafBasisMs: w === "" ? null : Math.round(Number(String(w).replace(",", ".")) * 3600000) });
    if (el.name === "sprache" || el.name === "thema") speichern({ [el.name]: w });
  });
  wurzel.querySelector("[data-einst-haptik]")?.addEventListener("change", (ev) => speichern({ haptik: ev.target.checked }));
  return () => {};
}
