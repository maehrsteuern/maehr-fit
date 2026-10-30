/* shell/apps/sync.js – „Sync“: Handy und Rechner verbinden (docs/apps/sync.md, Protokoll docs/technik/sync.md).
 *
 * Kernaussage: Hier verbindest du dein Handy mit dem MAEHR-FIT-Programm auf deinem Rechner. Einmal den QR-Code scannen (oder den
 * Code einfügen), danach schickt das Handy auf Knopfdruck alle neuen Messwerte über dein WLAN zum Rechner. Ohne gemeinsames WLAN
 * geht es über eine verschlüsselte Datei, die du in einen geteilten Ordner legst. Am Rechner siehst du hier die gekoppelten Handys.
 *
 * Route: #/sync. Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx) → aufräumen.
 * Zwei Gesichter: am Rechner (Speicher „rechner“, shell/speicher_server.js) Geräteliste, Koppeln mit QR, Eingangsordner;
 * sonst (Handy, Browser) Koppeln per Kamera/Code, „Jetzt abgleichen“, Entkoppeln, Export für den Ordner-Weg (.mfx).
 * Der Zustand wird nach dem Zeichnen geladen (binde) und die Ansicht dann an Ort und Stelle neu gezeichnet.
 */
import { t, locale } from "../i18n/i18n.js";
import { esc, zahl } from "../format.js";
import { kernaussage, kopf, zahlKnopf, beleg, abschnitt, tHtml } from "../ui.js";
import { syncEinrichten, syncJetzt, syncStatus, syncEntkoppeln, exportInhalt, mfxErstellen } from "../../daten/sync.js";

/** Zustand der Ansicht (modulweit, damit ein Neuzeichnen der Shell ihn nicht verliert). */
const Z = { geladen: false, modus: null, status: null, geraete: [], eingang: null, kopplung: null, meldung: "", laeuft: false };

const speicherVon = () => globalThis.MF?.shell?.speicher || globalThis.MF?.speicher || null;
const amRechner = () => speicherVon()?.art === "rechner" && typeof speicherVon()?.dienstAnfrage === "function";

/** „gerade eben“, „vor 12 Minuten“, „vor 3 Stunden“, „vor 2 Tagen“ (Intl.RelativeTimeFormat, Sprache der Oberfläche). */
export function vorZeit(ms, jetzt = Date.now()) {
  const s = Math.max(0, Math.round((jetzt - ms) / 1000));
  if (s < 60) return t("sync_gerade");
  const [wert, einheit] = s < 3600 ? [Math.round(s / 60), "minute"] : s < 86400 ? [Math.round(s / 3600), "hour"] : [Math.round(s / 86400), "day"];
  return new Intl.RelativeTimeFormat(locale(), { numeric: "always" }).format(-wert, einheit);
}
const uhr = (ms) => (ms ? new Intl.DateTimeFormat(locale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms)) : "–");

function kernHandy(B, s, jetzt) {
  if (!s?.gekoppelt) return esc(t("sync_kern_handy_neu"));
  if (!s.zuletzt) return esc(t("sync_kern_handy_bereit"));
  const quellen = [{ art: "sync", id: s.geraet, datei: `${s.host}:${s.port}` }];
  const q1 = B("sync:zuletzt", { titel: t("sync_beleg_zuletzt"), wert: uhr(s.zuletzt), teile: [{ name: t("sync_rechner"), wert: `${s.host}:${s.port}` }, { name: t("sync_fingerabdruck"), wert: s.fingerabdruck }], quellen });
  const q2 = B("sync:neu", { titel: t("sync_beleg_neu"), wert: zahl(s.neu), teile: [{ name: t("sync_teil_gesendet"), wert: zahl(s.gesendet) }, { name: t("sync_teil_neu"), wert: zahl(s.neu) }, { name: t("sync_teil_schon_da"), wert: zahl(s.ersetzt) }, { name: t("sync_teil_verschluesselt"), wert: t(s.verschluesselt ? "sync_ja" : "sync_nein") }], quellen });
  return tHtml("sync_kern_handy_ok", { zeit: zahlKnopf(q1, vorZeit(s.zuletzt, jetzt)), n: zahlKnopf(q2, zahl(s.neu)) });
}

function kernRechner(B, geraete, jetzt) {
  const gekoppelt = geraete.filter((g) => g.gekoppelt_am);
  if (!gekoppelt.length) return esc(t("sync_kern_rechner_neu"));
  const letzt = gekoppelt.filter((g) => g.sync_zuletzt).sort((a, b) => b.sync_zuletzt - a.sync_zuletzt)[0];
  const qg = B("sync:geraete", { titel: t("sync_geraete_titel"), wert: zahl(gekoppelt.length), teile: gekoppelt.map((g) => ({ name: g.name, wert: g.fingerabdruck })), quellen: gekoppelt.map((g) => ({ art: "sync", id: g.id })) });
  const g = zahlKnopf(qg, zahl(gekoppelt.length));
  const eins = gekoppelt.length === 1;
  if (!letzt) return tHtml(eins ? "sync_kern_rechner_eins_nie" : "sync_kern_rechner_mehr_nie", { g });
  const quellen = [{ art: "sync", id: letzt.id }];
  const q1 = B("sync:zuletzt", { titel: t("sync_beleg_zuletzt"), wert: uhr(letzt.sync_zuletzt), teile: [{ name: t("sync_geraet"), wert: letzt.name }], quellen });
  const q2 = B("sync:neu", { titel: t("sync_beleg_neu"), wert: zahl(letzt.sync_neu), teile: [{ name: t("sync_teil_neu"), wert: zahl(letzt.sync_neu) }, { name: t("sync_teil_schon_da"), wert: zahl(letzt.sync_ersetzt) }, { name: t("sync_teil_gesamt"), wert: zahl(letzt.sync_gesamt) }], quellen });
  return tHtml(eins ? "sync_kern_rechner_eins" : "sync_kern_rechner_mehr", { g, zeit: zahlKnopf(q1, vorZeit(letzt.sync_zuletzt, jetzt)), n: zahlKnopf(q2, zahl(letzt.sync_neu)) });
}

const karte = (titel, text, inhalt, id) => `<section class="mf-karte mf-abschnitt sy-karte" data-karte="${id}"><h2>${esc(titel)}</h2>${text ? `<p class="mf-leise">${esc(text)}</p>` : ""}${inhalt}<p class="mf-status" role="status" aria-live="polite" data-status="${id}"></p></section>`;
const knopf = (aktion, text, art = "") => `<button type="button" class="mf-knopf${art ? " " + art : ""}" data-aktion="${aktion}"${Z.laeuft ? " disabled" : ""}>${esc(text)}</button>`;

function ansichtHandy(ctx, B, jetzt) {
  const s = Z.status;
  const scanner = typeof globalThis.BarcodeDetector === "function" && !!globalThis.navigator?.mediaDevices?.getUserMedia;
  const koppeln = karte(t("sync_koppeln_titel"), t("sync_koppeln_text"), `
      ${scanner ? `<div class="mf-knopfreihe">${knopf("scannen", t("sync_scannen"), "primaer")}</div><div class="sy-kamera" data-kamera hidden><video playsinline muted aria-label="${esc(t("sync_kamera"))}"></video><div class="mf-knopfreihe">${knopf("scan-stopp", t("abbrechen"))}</div></div>` : `<p class="mf-hinweis">${esc(t("sync_kein_scanner"))}</p>`}
      <label class="mf-feld"><span>${esc(t("sync_code_feld"))}</span><textarea class="sy-code" name="code" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="MF-KOPPLUNG:…"></textarea></label>
      <div class="mf-knopfreihe">${knopf("koppeln", t("sync_koppeln_knopf"), scanner ? "" : "primaer")}</div>`, "koppeln");
  const verbunden = s?.gekoppelt ? karte(t("sync_verbunden_titel"), "", `
      <ul class="mf-liste sy-fakten">
        <li class="mf-zeile"><span class="mf-zeile-text"><strong>${esc(t("sync_rechner"))}</strong><small>${esc(`${s.host}:${s.port}`)}</small></span></li>
        <li class="mf-zeile"><span class="mf-zeile-text"><strong>${esc(t("sync_fingerabdruck"))}</strong><small class="sy-mono">${esc(s.fingerabdruck)}</small></span></li>
        <li class="mf-zeile"><span class="mf-zeile-text"><strong>${esc(t("sync_schutz"))}</strong><small>${esc(t(s.verschluesselt ? "sync_schutz_voll" : s.verschluesselt === false ? (s.ohneVerschluesselung === "geraet" ? "sync_schutz_signiert_geraet" : "sync_schutz_signiert") : "sync_schutz_offen"))}</small></span></li>
      </ul>
      ${s.fehler ? `<p class="mf-hinweis" data-sync-fehler>${esc(t("sync_letzter_fehler", { text: s.fehler.text }))}</p>` : ""}
      <div class="mf-knopfreihe">${knopf("jetzt", t("sync_jetzt"), "primaer")}</div>
      <div class="mf-knopfreihe" data-entkoppeln-start>${knopf("entkoppeln-frage", t("sync_entkoppeln"), "gefahr")}</div>
      <div class="mf-abschnitt" data-entkoppeln-frage hidden><p>${esc(t("sync_entkoppeln_frage"))}</p><div class="mf-knopfreihe">${knopf("entkoppeln-nein", t("abbrechen"))}${knopf("entkoppeln-ja", t("sync_entkoppeln_ja"), "gefahr")}</div></div>`, "jetzt") : "";
  const ordner = karte(t("sync_ordner_titel"), t("sync_ordner_text"), `
      <form class="mf-formular" data-mfx novalidate>
        <label class="mf-feld"><span>${esc(t("sync_passwort"))}</span><input type="password" name="passwort" minlength="8" autocomplete="new-password"><small>${esc(t("sync_passwort_hilfe"))}</small></label>
        <div class="mf-knopfreihe">${knopf("mfx", t("sync_ordner_knopf"))}</div>
      </form>`, "ordner");
  return `${kernaussage(Z.geladen ? kernHandy(B, s, jetzt) : esc(t("sync_kern_laedt")))}
    ${s?.gekoppelt ? verbunden : koppeln}
    ${ordner}`;
}

function ansichtRechner(ctx, B, jetzt) {
  const k = Z.kopplung;
  const koppeln = karte(t("sync_neu_titel"), t("sync_neu_text"), k ? `
      <div class="sy-qr" data-qr>${k.svg ? `<div class="sy-qr-bild" role="img" aria-label="${esc(t("sync_qr_label"))}">${k.svg}</div>` : `<p class="mf-hinweis">${esc(t("sync_qr_fehlt"))}</p>`}
        <label class="mf-feld"><span>${esc(t("sync_code_feld"))}</span><textarea class="sy-code" rows="3" readonly>${esc(k.text)}</textarea></label>
        <p class="mf-leise">${esc(t("sync_qr_gueltig", { zeit: uhr(k.ablauf), fp: k.fingerabdruck }))}</p></div>
      <div class="mf-knopfreihe">${knopf("qr-zu", t("sync_qr_fertig"))}</div>` : `
      <label class="mf-feld"><span>${esc(t("sync_geraet_name"))}</span><input name="name" maxlength="60" value="${esc(t("sync_geraet_standard"))}"></label>
      <div class="mf-knopfreihe">${knopf("qr", t("sync_qr_knopf"), "primaer")}</div>`, "qr");
  const zeilen = Z.geraete.map((g) => `<li class="mf-zeile sy-geraet"><span class="mf-zeile-text"><strong>${esc(g.name)}</strong><small>${esc(g.gekoppelt_am ? t("sync_geraet_zuletzt", { zeit: g.sync_zuletzt ? uhr(g.sync_zuletzt) : t("sync_noch_nie") }) : t("sync_geraet_wartet", { zeit: uhr(g.ablauf) }))} · <span class="sy-mono">${esc(g.fingerabdruck)}</span></small></span>
      <button type="button" class="mf-knopf leise" data-aktion="geraet-weg" data-id="${esc(g.id)}" aria-label="${esc(t("sync_entkoppeln_geraet", { name: g.name }))}">${esc(t("sync_entkoppeln"))}</button></li>`).join("");
  const geraete = abschnitt(t("sync_geraete_titel"), Z.geraete.length ? `<ul class="mf-liste">${zeilen}</ul>` : `<p class="mf-leise">${esc(t("sync_keine_geraete"))}</p>`);
  const e = Z.eingang;
  const dateien = (e?.dateien || []).slice(0, 5).map((d) => `<li class="mf-zeile"><span class="mf-zeile-text"><strong>${esc(d.datei)}</strong><small>${esc(d.ok ? t("sync_eingang_ok", { neu: zahl(d.neu), da: zahl(d.ersetzt), zeit: uhr(d.zeit) }) : t("sync_eingang_fehler", { text: d.fehler || "?" }))}</small></span></li>`).join("");
  const eingang = karte(t("sync_eingang_titel"), t("sync_eingang_text", { ordner: e?.ordner || "~/.maehrfit/eingang" }), `
      ${dateien ? `<ul class="mf-liste">${dateien}</ul>` : ""}
      <div class="mf-knopfreihe">${knopf("eingang", t("sync_eingang_knopf"))}</div>`, "eingang");
  return `${kernaussage(Z.geladen ? kernRechner(B, Z.geraete, jetzt) : esc(t("sync_kern_laedt")))}
    ${koppeln}${geraete}${eingang}`;
}

export function ansicht(ctx) {
  const B = beleg(ctx.register), jetzt = Date.now();
  const rechner = Z.modus ? Z.modus === "rechner" : amRechner();
  return `<div class="mf-sicht" data-sicht="sync" data-modus="${rechner ? "rechner" : "handy"}">
    ${kopf(t("sync_titel"), { zurueck: "#/mehr" })}
    ${rechner ? ansichtRechner(ctx, B, jetzt) : ansichtHandy(ctx, B, jetzt)}
    <p class="mf-leise sy-schutz">${esc(t("sync_heimnetz_hinweis"))}</p>
  </div>`;
}

async function laden() {
  const sp = speicherVon();
  Z.modus = amRechner() ? "rechner" : "handy";
  if (Z.modus === "rechner") {
    const [g, e] = await Promise.all([sp.dienstAnfrage("/api/geraete"), sp.dienstAnfrage("/api/eingang")]);
    Z.geraete = g.geraete || []; Z.eingang = e;
  } else if (sp) {
    Z.status = await syncStatus({ speicher: sp });
  }
  Z.geladen = true;
}

function herunterladen(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/octet-stream" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function binde(wurzel, ctx) {
  let lebt = true, strom = null, uhrScan = null;
  const neu = () => { const s = wurzel.querySelector('[data-sicht="sync"]'); if (lebt && s) s.outerHTML = ansicht(ctx); };
  // Nach dem Neuzeichnen kann die Karte gewechselt haben (z. B. Koppeln → Verbindung): dann die erste Statuszeile der Sicht nehmen.
  const status = (id, text) => { const el = wurzel.querySelector(`[data-status="${id}"]`) || wurzel.querySelector('[data-sicht="sync"] [data-status]'); if (el) el.textContent = text; };
  const fehlerText = (e) => String(e?.message || e);
  const scanStopp = () => { if (uhrScan) clearTimeout(uhrScan); uhrScan = null; strom?.getTracks().forEach((s) => s.stop()); strom = null; const k = wurzel.querySelector("[data-kamera]"); if (k) k.hidden = true; };
  async function arbeit(id, fn) {
    Z.laeuft = true;
    try { const text = await fn(); await laden(); Z.laeuft = false; neu(); if (text) status(id, text); }
    catch (e) { Z.laeuft = false; await laden().catch(() => {}); neu(); status(id, fehlerText(e)); }
  }
  async function koppeln(text) {
    await arbeit("koppeln", async () => { const r = await syncEinrichten(text, { speicher: speicherVon() }); return t("sync_gekoppelt", { host: r.host, fp: r.fingerabdruck }); });
  }
  async function scannen() {
    const box = wurzel.querySelector("[data-kamera]"), video = box?.querySelector("video");
    if (!box || !video) return;
    try {
      strom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      box.hidden = false; video.srcObject = strom; await video.play();
      const detektor = new globalThis.BarcodeDetector({ formats: ["qr_code"] });
      const schritt = async () => {
        if (!strom || !lebt) return;
        try {
          const treffer = (await detektor.detect(video)).find((c) => String(c.rawValue || "").startsWith("MF-KOPPLUNG:"));
          if (treffer) { scanStopp(); await koppeln(treffer.rawValue); return; }
        } catch { /* nächstes Bild */ }
        uhrScan = setTimeout(schritt, 250);
      };
      schritt();
    } catch (e) { scanStopp(); status("koppeln", t("sync_kamera_fehler", { text: fehlerText(e) })); }
  }

  wurzel.addEventListener("click", async (ev) => {
    const k = ev.target.closest("button[data-aktion]"); if (!k || k.disabled) return;
    const a = k.dataset.aktion, sp = speicherVon();
    if (a === "scannen") scannen();
    if (a === "scan-stopp") scanStopp();
    if (a === "koppeln") { const text = wurzel.querySelector('textarea[name="code"]')?.value || ""; if (!text.trim()) { status("koppeln", t("sync_code_leer")); return; } koppeln(text); }
    if (a === "jetzt") arbeit("jetzt", async () => { const r = await syncJetzt({ speicher: sp }); return t("sync_fertig", { n: zahl(r.gesendet), neu: zahl(r.neu) }); });
    if (a === "entkoppeln-frage" || a === "entkoppeln-nein") {
      const frage = a === "entkoppeln-frage";
      wurzel.querySelector("[data-entkoppeln-frage]").hidden = !frage; wurzel.querySelector("[data-entkoppeln-start]").hidden = frage;
      wurzel.querySelector(frage ? '[data-aktion="entkoppeln-nein"]' : '[data-aktion="entkoppeln-frage"]')?.focus();
    }
    if (a === "entkoppeln-ja") arbeit("koppeln", async () => { const r = await syncEntkoppeln({ speicher: sp }); return t(r.rechnerBestaetigt ? "sync_entkoppelt" : "sync_entkoppelt_lokal"); });
    if (a === "mfx") {
      const pw = wurzel.querySelector('form[data-mfx] input[name="passwort"]')?.value || "";
      if (pw.length < 8) { status("ordner", t("sync_passwort_kurz")); return; }
      status("ordner", t("sync_ordner_laeuft"));
      try {
        const inhalt = await exportInhalt(sp);
        herunterladen(`maehr-fit-${new Date().toISOString().slice(0, 10)}.mfx`, await mfxErstellen(inhalt, pw));
        status("ordner", t("sync_ordner_ok", { n: zahl(Object.keys(inhalt.eintraege).length) }));
      } catch (e) { status("ordner", fehlerText(e)); }
    }
    if (a === "qr") arbeit("qr", async () => { const name = wurzel.querySelector('input[name="name"]')?.value || ""; Z.kopplung = await sp.dienstAnfrage("/api/koppeln", { method: "POST", body: JSON.stringify({ name }) }); return ""; });
    if (a === "qr-zu") { Z.kopplung = null; arbeit("qr", async () => ""); }
    if (a === "geraet-weg") arbeit("qr", async () => { await sp.dienstAnfrage(`/api/geraete?id=${encodeURIComponent(k.dataset.id)}`, { method: "DELETE" }); return t("sync_entkoppelt"); });
    if (a === "eingang") arbeit("eingang", async () => { const r = await sp.dienstAnfrage("/api/eingang", { method: "POST" }); return t("sync_eingang_fertig", { n: zahl((r.meldungen || []).length) }); });
  });
  wurzel.addEventListener("submit", (ev) => { if (ev.target.closest("form[data-mfx]")) ev.preventDefault(); });
  laden().then(neu).catch((e) => { Z.geladen = true; neu(); status(Z.modus === "rechner" ? "qr" : "koppeln", fehlerText(e)); });
  return () => { lebt = false; scanStopp(); };
}

/** Nur für Tests: Zustand setzen. */
export function _zustand(teil) { Object.assign(Z, teil); return Z; }
