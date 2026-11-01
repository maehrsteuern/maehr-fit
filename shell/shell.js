/* shell/shell.js – Rahmen von MAEHR FIT: Kopfleiste, Reiterleiste, Wege (#/…), Zustand, Belegfenster.
 *
 * Kernaussage: Die Shell lädt beim Start die Messwerte (beim ersten Start die erfundene Musterperson), lässt den Kern daraus die
 * Tageswerte rechnen und zeigt die gewählte Ansicht. Oben stehen höchstens sechs Dinge (Marke, Tag ‹ heute ›, Hell/Dunkel,
 * Sprache, Menü), unten fünf Reiter (Heute · Schlaf · Belastung · Atem · Mehr). Ein einziger Klick-Fang auf data-q öffnet zu
 * jeder Zahl das Belegfenster. Tagebuch, Einstellungen und eingelesene Daten gehen über die Speicher-Schnittstelle.
 *
 * Wege: #/heute · #/schlaf · #/belastung[/training/<id>] · #/atem[/<übung>] · #/mehr · #/tagebuch[/wirkung] · #/trends?feld=&fenster=
 *       · #/daten · #/einstellungen · #/vergleich?feld=&tag= · #/mehr/pruefen
 * Speicher-Schlüssel: einstellungen · tagebuch:<JJJJ-MM-TT> (eigene Einträge) · messung:<art>:<JJJJ-MM-TT> (eigene Messwerte, abgelegt von
 *   der Datenschicht daten/ablage.js) · sync:… (Stand des Health-Connect-Abgleichs, daten/healthconnect.js)
 *   · hc:verbunden ({ zeitpunktMs, erteilt }) · hc:letzter_abgleich (ms) – Merkzeichen der Shell zum selbsttätigen Abgleich
 * Datenschicht: daten/verbinden.js installiert window.MF.daten (healthConnect.verfuegbar/verbinden/erteilt/synchronisieren, csvImport) auf demselben Speicher
 *   und richtet in der Android-App bei jedem Zugriff selbst die Health-Connect-Brücke ein (sucheBruecke → window.MF.native.healthConnect);
 *   nach jedem Einlesen liest die Shell die Messwerte neu aus dem Speicher.
 * Abgleich (shell/abgleich.js): Ist Health Connect schon einmal verbunden (hc:verbunden, ein Stand sync:healthconnect:… oder erteilte
 *   Rechte), holt die Shell nach dem ersten Bild im Hintergrund neue Werte – beim Start, bei Rückkehr in die App (visibilitychange,
 *   Capacitor „resume“, App-Plugin appStateChange) und auf Knopfdruck/Herunterziehen. Nie zwei gleichzeitig, selbsttätig höchstens
 *   einmal pro Minute. Danach: neu rechnen, Ansicht neu zeichnen, leise Meldung „12 neue Messwerte“ (bei 0 keine). hc:letzter_abgleich = ms.
 * Tag: tagWaehlen() (shell/abgleich.js) – „heute“, „letzter“ (heute noch ohne Werte) oder „hand“ (selbst geblättert); nur „hand“ bleibt stehen.
 */
import { t, setzeSprache, sprache } from "./i18n/i18n.js";
import { esc, zahl } from "./format.js";
import { neuesRegister, IKON } from "./ui.js";
import { kopfHtml, menueHtml, reiterHtml, abgleichZeileHtml, abgleichText, REITER } from "./rahmen.js";
import { neuerAbgleicher, istVerbunden, tagWaehlen, zugAuswerten, ZUG_SCHWELLE_PX, SCHLUESSEL as ABGLEICH } from "./abgleich.js";
import { vizTastatur } from "./viz/viz.js";
import { speicherServer } from "./speicher_server.js";
import { sprite } from "./icons.js";
import { ankommen, scrollMerken, scrollZurueck } from "./bewegung.js";
import { demo, tagIso, tagPlus, berechne } from "./kern.js";
import { installiere as datenInstallieren } from "../daten/verbinden.js";
import { leseMessungen } from "../daten/ablage.js";
import { oeffnen as belegOeffnen } from "./apps/beleg.js";
import * as heute from "./apps/heute.js";
import * as schlaf from "./apps/schlaf.js";
import * as belastung from "./apps/belastung.js";
import * as atem from "./apps/atem.js";
import * as tagebuch from "./apps/tagebuch.js";
import * as trends from "./apps/trends.js";
import * as daten from "./apps/daten.js";
import * as mehr from "./apps/mehr.js";
import * as vergleich from "./apps/vergleich.js";
import * as sync from "./apps/sync.js";

export { REITER };
export const APPS = { heute, schlaf, belastung, atem, tagebuch, trends, daten, einstellungen: daten, mehr, vergleich, sync };
const ZU_MEHR = new Set(["mehr", "tagebuch", "trends", "daten", "einstellungen", "vergleich", "sync"]);
// Alle Arten der Ablage (daten/ablage.js ARTEN): spo2/hauttemp gehen als Abzüge in die Erholung, fremdwerte (WHOOPs eigene Zahlen) in den Vergleich
export const DATEN_ARTEN = ["herzschlag", "hrv", "ruhepuls", "atemfrequenz", "spo2", "hauttemp", "schlaf", "training", "tagebuch", "fremdwerte"];

/** „#/belastung/training/x?feld=hrv“ → { teile: ["belastung","training","x"], abfrage: { feld: "hrv" } } */
export function wegLesen(hash) {
  const roh = String(hash || "").replace(/^#\/?/, "");
  const [pfad, such = ""] = roh.split("?");
  const teile = pfad.split("/").filter(Boolean);
  const abfrage = Object.fromEntries(new URLSearchParams(such));
  if (!teile.length || !APPS[teile[0]]) teile.splice(0, teile.length, "heute");
  return { teile, abfrage };
}

const Z = { hcVerfuegbar: false, speicher: null, einst: {}, messwerte: null, demo: true, tagebuchEigen: {}, erg: null, tag: null, tagModus: null, heute: null, kalender: null,
  abgleich: { bekannt: false, verbunden: false, laeuft: false, fehler: false, letzterMs: null, arten: null }, register: neuesRegister(), aufraeumen: () => {} };
// Tagesansichten mit der leisen Abgleich-Zeile oben (shell/rahmen.js abgleichZeileHtml)
const MIT_ABGLEICH = new Set(["heute", "schlaf", "belastung"]);
const anzahl = (d) => DATEN_ARTEN.reduce((s, k) => s + (Array.isArray(d?.[k]) ? d[k].length : 0), 0);

function themaAnwenden() {
  const th = Z.einst.thema || "dunkel", el = document.documentElement;
  if (th === "hell") el.dataset.theme = "light"; else if (th === "dunkel") el.dataset.theme = "dark"; else delete el.dataset.theme;
}
function spracheAnwenden() { setzeSprache(Z.einst.sprache || "de"); document.documentElement.lang = sprache(); document.title = t("app_name"); }

async function ladeAlles() {
  // Kleid „Nacht“: beim ersten Start dunkel (docs/technik/design_mf.md); umschalten über Kopfleiste oder Einstellungen
  Z.einst = { haptik: false, sprache: "de", thema: "dunkel", ...((await Z.speicher.lies("einstellungen")) || {}) };
  const eigen = {};
  for (const art of DATEN_ARTEN) eigen[art] = await leseMessungen(Z.speicher, art);
  Z.demo = !(eigen && anzahl(eigen) > 0);
  Z.messwerte = Z.demo ? demo({ heute: tagIso(Date.now()) }) : eigen;
  Z.tagebuchEigen = {};
  for (const k of await Z.speicher.liste("tagebuch:")) { const e = await Z.speicher.lies(k); if (e?.tag) Z.tagebuchEigen[e.tag] = e; }
  rechnen();
  const kalender = tagIso(Date.now());
  Z.kalender = kalender;
  Z.heute = Z.demo ? (Z.erg.letzter || kalender) : (Z.erg.letzter && Z.erg.letzter > kalender ? Z.erg.letzter : kalender);
  // Startet heute ohne Messwerte (Uhr noch nicht abgeglichen), zeigt die Shell den letzten Tag mit Werten (modus „letzter“);
  // kommen später Werte für heute (Abgleich), springt sie auf heute. Selbst geblätterte Tage (modus „hand“) bleiben stehen.
  const w = tagWaehlen({ tag: Z.tag, modus: Z.tagModus, heute: Z.heute, erster: Z.erg.erster, letzter: Z.erg.letzter, hatHeute: Z.erg.tage.has(Z.heute) });
  Z.tag = w.tag; Z.tagModus = w.modus;
}
/** Einstellungen für den Kern: bei Demodaten gelten die der Musterperson, soweit du nichts eingetragen hast. */
const einstFuerKern = () => ({ ...(Z.demo ? Z.messwerte.einstellungen || {} : {}), ...Object.fromEntries(Object.entries(Z.einst).filter(([, w]) => w !== null && w !== undefined && w !== "")) });
function rechnen() { Z.erg = berechne(Z.messwerte, einstFuerKern(), Z.tagebuchEigen); }

async function tagebuchSchreiben(tag, aendern) {
  const alt = Z.tagebuchEigen[tag] || { tag, eintraege: {}, quelle: { art: "hand", id: `tagebuch-${tag}` } };
  const neu = { ...alt, eintraege: aendern({ ...alt.eintraege }) };
  await Z.speicher.schreib(`tagebuch:${tag}`, neu);
  Z.tagebuchEigen[tag] = neu; rechnen();
}

function herunterladen(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Die Datenschicht hat schon in den Speicher geschrieben (messung:…); die Shell liest neu und rechnet. */
async function eigeneDatenUebernehmen(ergebnis) {
  if (!ergebnis || typeof ergebnis !== "object") throw new Error("keine Messwerte");
  Z.tag = null; Z.tagModus = null; await ladeAlles(); zeichnen();
  return Number.isFinite(ergebnis.neu) ? ergebnis.neu + (ergebnis.ersetzt || 0) : anzahl(ergebnis);
}

const aktionen = {
  /** fortschritt({ art, nr, von, gelesen }) kommt vor jedem Lesefenster (daten/healthconnect.js); Rückgabe wie bei csvEinlesen. */
  async hcVerbinden(fortschritt) {
    const r = await window.MF.daten.healthConnect.verbinden(undefined, { fortschritt });
    // Merken: verbunden (für den Abgleich beim nächsten Start) und wann zuletzt abgeglichen
    const jetzt = Date.now();
    await Z.speicher.schreib(ABGLEICH.verbunden, { zeitpunktMs: jetzt, erteilt: Array.isArray(r?.erteilt) ? r.erteilt : [] });
    await Z.speicher.schreib(ABGLEICH.letzter, jetzt);
    Object.assign(Z.abgleich, { bekannt: true, verbunden: true, fehler: false, letzterMs: jetzt, arten: Array.isArray(r?.erteilt) && r.erteilt.length ? r.erteilt : Z.abgleich.arten });
    const n = await eigeneDatenUebernehmen(r);
    const leer = (k) => !(Z.messwerte?.[k]?.length > 0);
    return {
      n, arten: r.zaehlung || {}, zeitraum: r.zeitraum || null, fehler: r.fehler || [], luecken: r.luecken || [],
      gespeichert: Z.erg.erster ? { von: Z.erg.erster, bis: Z.erg.letzter } : null,   // alles, was jetzt auf dem Gerät liegt
      ohneHrvRuhepuls: leer("hrv") && leer("ruhepuls"),
      herkunft: r.herkunft || null, schlafPhasen: r.schlafPhasen || null, // Diagnose: welche App schrieb was, Nächte mit/ohne Phasen (shell/apps/daten.js)
    };
  },
  async csvEinlesen(dateien) {
    // Dateien vorab als { name, bytes } übergeben: Blob.bytes() ist in neuen Browsern eine Methode, die daten/verbinden.js
    // sonst als Inhalt läse (Befund 30.10.2026, an die Datenschicht gemeldet).
    const liste = await Promise.all([...(dateien?.length !== undefined ? dateien : [dateien])].map(async (d) => ({ name: d.name, bytes: new Uint8Array(await d.arrayBuffer()) })));
    // Rückgabe für daten.js: Gesamtzahl, Anzahl je Art und eingelesener Zeitraum (daten/verbinden.js csvImport)
    const r = await window.MF.daten.csvImport(liste);
    const n = await eigeneDatenUebernehmen(r);
    return { n, arten: r.arten || {}, zeitraum: r.zeitraum || null, hinweise: r.hinweise || [] };
  },
  async exportieren() {
    const schluessel = await Z.speicher.liste("");
    const inhalt = {};
    for (const k of schluessel) inhalt[k] = await Z.speicher.lies(k);
    herunterladen(`maehr-fit-${tagIso(Date.now())}.json`, JSON.stringify({ app: "MAEHR FIT", erstellt: new Date().toISOString(), daten: inhalt }, null, 2));
    return schluessel.length;
  },
  async allesLoeschen() {
    if (Z.speicher.loescheAlles) await Z.speicher.loescheAlles();
    else for (const k of await Z.speicher.liste("")) await Z.speicher.schreib(k, undefined);
    Z.tag = null; Z.tagModus = null; await ladeAlles(); themaAnwenden(); spracheAnwenden();
    Object.assign(Z.abgleich, { verbunden: false, letzterMs: null, fehler: false, arten: null });
    location.hash = "#/heute"; zeichnen();
  },
  async einstellungenSetzen(teil) {
    Z.einst = { ...Z.einst, ...teil };
    await Z.speicher.schreib("einstellungen", Z.einst);
    themaAnwenden();
    if ("sprache" in teil) { spracheAnwenden(); rechnen(); zeichnen(); return; }
    if ("thema" in teil) { zeichnen(); return; }
    rechnen();
  },
};

function kontext(weg) {
  return {
    demoEinstellungen: Z.demo ? Z.messwerte.einstellungen || null : null, tag: Z.tag, heute: Z.heute, bild: Z.erg.tage.get(Z.tag) || null, erg: Z.erg, einst: Z.einst, demo: Z.demo, route: weg, register: Z.register,
    tagebuchEigen: Z.tagebuchEigen, atemHeuteMs: Number(Z.tagebuchEigen[Z.heute]?.eintraege?.atem) || 0,
    hcVerfuegbar: Z.hcVerfuegbar, abgleich: { ...Z.abgleich }, csvVerfuegbar: typeof window.MF?.daten?.csvImport === "function",
    aktionen,
    tagebuchSetzen: (tag, k, w) => tagebuchSchreiben(tag, (e) => ({ ...e, [k]: w })),
    atemSpeichern: (ms) => tagebuchSchreiben(Z.heute, (e) => ({ ...e, atem: (Number(e.atem) || 0) + ms, atemuebung: true })),
  };
}

let letzterWeg = "";
function zeichnen() {
  const wurzel = document.getElementById("mf-wurzel");
  const weg = wegLesen(location.hash), id = weg.teile[0], app = APPS[id];
  const wegText = weg.teile.join("/"), neu = wegText !== letzterWeg;
  if (neu) scrollMerken(letzterWeg);
  Z.aufraeumen(); Z.aufraeumen = () => {};
  Z.register = neuesRegister();
  const aktiv = ZU_MEHR.has(id) ? "mehr" : id;
  const chip = Z.demo && !["daten", "einstellungen", "atem", "mehr", "sync"].includes(id) ? `<div class="mf-chip" data-demo><i aria-hidden="true"></i><span>${esc(t("demo_chip"))}</span><a class="mf-knopf" href="#/daten">${esc(t("demo_verbinden"))}</a></div>` : "";
  let inhalt;
  try { inhalt = app.ansicht(kontext(weg)); } catch (e) { console.error(e); inhalt = `<p class="mf-hinweis">${esc(t("fehler_start", { text: e?.message || e }))}</p>`; }
  const zeile = MIT_ABGLEICH.has(id) ? abgleichZeileHtml({ hcVerfuegbar: Z.hcVerfuegbar, ...Z.abgleich }) : "";
  wurzel.innerHTML = `${kopfHtml({ tag: Z.tag, heute: Z.heute, erster: Z.erg.erster, thema: Z.einst.thema })}${menueHtml()}<main class="mf-haupt" id="mf-haupt" tabindex="-1">${zeile}${chip ? `<div class="mf-sicht-chip">${chip}</div>` : ""}${inhalt}</main>${reiterHtml(aktiv)}`;
  document.body.dataset.reiter = aktiv;
  if (typeof app.binde === "function") Z.aufraeumen = app.binde(wurzel.querySelector("#mf-haupt"), kontext(weg)) || (() => {});
  // Reiter merken sich die Stelle: zurück zu einer Ansicht = dieselbe Scrollhöhe; neue Ansichten tauchen gestaffelt auf
  if (neu) { scrollZurueck(wegText); letzterWeg = wegText; }
  ankommen(wurzel.querySelector("#mf-haupt"), { neu });
}

function menueSchalten(auf) {
  const m = document.getElementById("mf-menue"), k = document.querySelector('[data-kopf="menue"]');
  if (!m || !k) return;
  const offen = auf ?? m.hidden;
  m.hidden = !offen; k.setAttribute("aria-expanded", String(offen));
  if (offen) m.querySelector("a")?.focus();
}

function klicks() {
  vizTastatur(document);
  const dialog = document.getElementById("mf-beleg");
  document.addEventListener("click", (ev) => {
    const q = ev.target.closest("[data-q]");
    if (q) { ev.preventDefault(); belegOeffnen(dialog, Z.register.get(q.dataset.q), q.dataset.q); return; }
    if (ev.target.closest("[data-beleg-zu]")) { dialog.close?.(); dialog.removeAttribute("open"); return; }
    const tagK = ev.target.closest("[data-tag]");
    if (tagK) {
      const w = tagK.dataset.tag;
      Z.tag = w === "heute" ? Z.heute : w === "letzter" ? (Z.erg.letzter || Z.heute) : tagPlus(Z.tag, Number(w));
      if (Z.tag > Z.heute) Z.tag = Z.heute;
      if (Z.erg.erster && Z.tag < Z.erg.erster) Z.tag = Z.erg.erster;
      // „Zum letzten Tag“ folgt neuen Werten (modus letzter), heute bleibt heute, sonst bleibt der Tag stehen (hand)
      Z.tagModus = w === "letzter" ? "letzter" : Z.tag === Z.heute ? "heute" : "hand";
      const weg = wegLesen(location.hash);
      if (weg.teile[0] === "belastung" && weg.teile[1] === "training") location.hash = "#/belastung"; else zeichnen();
      document.querySelector(`[data-tag="${w}"]:not(:disabled)`)?.focus();
      return;
    }
    if (ev.target.closest('[data-aktion="abgleich"]')) { ev.preventDefault(); abgleichStarten({ erzwingen: true, grund: "knopf" }); return; }
    const kopfK = ev.target.closest("[data-kopf]");
    if (kopfK) {
      const a = kopfK.dataset.kopf;
      if (a === "menue") { menueSchalten(); return; }
      if (a === "thema") { const folge = { auto: "hell", hell: "dunkel", dunkel: "auto" }; aktionen.einstellungenSetzen({ thema: folge[Z.einst.thema || "auto"] }).then(() => document.querySelector('[data-kopf="thema"]')?.focus()); return; }
      if (a === "sprache") { aktionen.einstellungenSetzen({ sprache: sprache() === "de" ? "en" : "de" }).then(() => document.querySelector('[data-kopf="sprache"]')?.focus()); return; }
    }
    if (!ev.target.closest("#mf-menue")) menueSchalten(false);
  });
  dialog.addEventListener("click", (ev) => { if (ev.target === dialog) dialog.close?.(); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") menueSchalten(false); });
  window.addEventListener("hashchange", () => { menueSchalten(false); if (dialog.open) dialog.close?.(); zeichnen(); });
}

// ------------------------------------------------------------------ Abgleich mit Health Connect (Start, Rückkehr, Knopf, Herunterziehen)
const hcDaten = () => window.MF?.daten?.healthConnect;

async function abgleichAusfuehren() {
  Object.assign(Z.abgleich, { laeuft: true, fehler: false }); abgleichAnzeigen();
  try {
    const hc = hcDaten();
    // Nur freigegebene Arten lesen: erst ohne Dialog nachsehen, sonst die beim Verbinden gemerkten, sonst alle
    let arten = null;
    try { arten = (await hc.erteilt?.())?.erteilt || null; } catch { arten = null; }
    if (!arten?.length) arten = Z.abgleich.arten;
    const r = await hc.synchronisieren(arten?.length ? { arten } : {});
    const berichte = Object.values(r?.arten || {});
    if (berichte.length && berichte.every((b) => b.fehler)) throw new Error(berichte[0].fehler);
    Z.abgleich.letzterMs = Date.now();
    await Z.speicher.schreib(ABGLEICH.letzter, Z.abgleich.letzterMs);
    return { neu: Number(r?.neu) || 0 };
  } finally {
    Z.abgleich.laeuft = false;
  }
}
const abgleicher = neuerAbgleicher({ ausfuehren: abgleichAusfuehren });

/** Abgleich anstoßen; nur der erste von gleichzeitigen Anstößen zeichnet danach neu. */
async function abgleichStarten({ erzwingen = false, grund = "" } = {}) {
  if (!Z.hcVerfuegbar || !Z.abgleich.verbunden || typeof hcDaten()?.synchronisieren !== "function") return null;
  const schonLaufend = abgleicher.laeuft();
  let erg;
  try { erg = await abgleicher.anstossen({ erzwingen, grund }); } catch (e) {
    if (!schonLaufend) { console.warn("Abgleich:", e); Z.abgleich.fehler = true; abgleichAnzeigen(); }
    return null;
  }
  if (schonLaufend || erg?.uebersprungen) return erg;
  if (erg.neu > 0) {
    await ladeAlles();
    // Nicht mitten ins Tippen oder in ein offenes Belegfenster zeichnen; die Werte sind trotzdem schon neu gerechnet
    const dialogOffen = document.getElementById("mf-beleg")?.open;
    const tippt = document.activeElement?.matches?.("#mf-haupt input, #mf-haupt select, #mf-haupt textarea");
    if (dialogOffen || tippt) abgleichAnzeigen(); else zeichnen();
    meldung(erg.neu === 1 ? t("abgleich_neu_eins") : t("abgleich_neu", { n: zahl(erg.neu) }));
  } else abgleichAnzeigen();
  return erg;
}

/** Zeile „Zuletzt abgeglichen …“ und die Zeit in Daten auffrischen, ohne die Ansicht neu zu zeichnen. */
function abgleichAnzeigen() {
  const a = { hcVerfuegbar: Z.hcVerfuegbar, ...Z.abgleich };
  for (const el of document.querySelectorAll("[data-abgleich-zeile]")) { const html = abgleichZeileHtml(a); if (html) el.outerHTML = html; else el.remove(); }
  for (const el of document.querySelectorAll("[data-abgleich-zeit]")) el.textContent = abgleichText(a);
  for (const el of document.querySelectorAll('button.mf-knopf[data-aktion="abgleich"]')) el.disabled = !!a.laeuft;
}

let meldungZeit = 0;
/** Leise Meldung unten (verschwindet nach 3 s); kein Fenster, nichts zu bestätigen. */
function meldung(text) {
  let el = document.querySelector(".mf-toast");
  if (!el) { el = Object.assign(document.createElement("div"), { className: "mf-toast" }); el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.append(el); }
  el.textContent = text;
  requestAnimationFrame(() => el.classList.add("an"));
  clearTimeout(meldungZeit);
  meldungZeit = setTimeout(() => el.classList.remove("an"), 3000);
}

/** Zurück in der App: neuer Kalendertag → neu rechnen; dann abgleichen (höchstens einmal pro Minute). */
async function beiRueckkehr(grund) {
  if (tagIso(Date.now()) !== Z.kalender) { await ladeAlles(); zeichnen(); }
  else abgleichAnzeigen();
  abgleichStarten({ grund });
}

/** Herunterziehen oben auf der Seite (> 80 px) = Aktualisieren; die Anzeige bewegt sich nur per transform. */
function zugEinrichten() {
  const anzeige = Object.assign(document.createElement("div"), { className: "mf-zug", innerHTML: IKON.sync });
  anzeige.setAttribute("aria-hidden", "true");
  document.body.append(anzeige);
  let startY = null, bereit = false;
  const oben = () => (document.scrollingElement || document.documentElement).scrollTop;
  const ende = (ev) => {
    if (startY === null) return;
    startY = null;
    anzeige.classList.remove("zieht", "bereit"); anzeige.style.transform = ""; anzeige.style.opacity = "";
    if (bereit && ev.type === "touchend") abgleichStarten({ erzwingen: true, grund: "ziehen" });
    bereit = false;
  };
  document.addEventListener("touchstart", (ev) => {
    startY = null;
    if (ev.touches.length !== 1 || oben() > 0 || !Z.hcVerfuegbar || !Z.abgleich.verbunden || document.getElementById("mf-beleg")?.open) return;
    if (!document.querySelector("[data-abgleich-zeile]")) return;   // nur in den Tagesansichten
    startY = ev.touches[0].clientY; bereit = false;
  }, { passive: true });
  document.addEventListener("touchmove", (ev) => {
    if (startY === null) return;
    const z = zugAuswerten({ startY, y: ev.touches[0].clientY, scrollTop: oben() });
    bereit = z.bereit;
    anzeige.classList.add("zieht"); anzeige.classList.toggle("bereit", bereit);
    anzeige.style.transform = `translate(-50%, ${Math.round(z.ausschlag)}px) rotate(${Math.round(z.abstand * 2)}deg)`;
    anzeige.style.opacity = String(Math.min(1, z.abstand / ZUG_SCHWELLE_PX));
  }, { passive: true });
  document.addEventListener("touchend", ende, { passive: true });
  document.addEventListener("touchcancel", ende, { passive: true });
}

let uhr = 0;
/** „vor 3 Minuten“ weiterzählen, solange die App sichtbar ist (eine Auffrischung je Minute, kein Neuzeichnen). */
function uhrStellen() {
  clearTimeout(uhr);
  uhr = setTimeout(() => { if (document.visibilityState !== "hidden") abgleichAnzeigen(); uhrStellen(); }, 60 * 1000);
}

async function abgleichEinrichten() {
  try {
    if (Z.hcVerfuegbar) {
      const flag = await Z.speicher.lies(ABGLEICH.verbunden);
      const stand = await Z.speicher.liste("sync:healthconnect:");
      let erteilt = null;
      if (!flag && !stand.length) { try { erteilt = (await hcDaten()?.erteilt?.())?.erteilt || null; } catch { erteilt = null; } }
      Object.assign(Z.abgleich, {
        verbunden: istVerbunden({ flag, standSchluessel: stand, erteilt }),
        arten: Array.isArray(flag?.erteilt) && flag.erteilt.length ? flag.erteilt : erteilt?.length ? erteilt : null,
        letzterMs: Number(await Z.speicher.lies(ABGLEICH.letzter)) || null,
      });
    }
    Z.abgleich.bekannt = true;
    // Zeile nachtragen (das erste Bild kam ohne sie, damit der Start nicht wartet)
    if (MIT_ABGLEICH.has(wegLesen(location.hash).teile[0]) && !document.querySelector("[data-abgleich-zeile]")) {
      const html = abgleichZeileHtml({ hcVerfuegbar: Z.hcVerfuegbar, ...Z.abgleich });
      if (html) document.getElementById("mf-haupt")?.insertAdjacentHTML("afterbegin", html);
    }
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") beiRueckkehr("sichtbar"); });
    document.addEventListener("resume", () => beiRueckkehr("resume"));   // Capacitor meldet die Rückkehr auch als Dokument-Ereignis
    const app = window.Capacitor?.Plugins?.App;
    if (app && typeof app.addListener === "function") {
      Promise.resolve().then(() => app.addListener("appStateChange", (s) => { if (s?.isActive) beiRueckkehr("app"); })).catch(() => {});
    }
    zugEinrichten();
    uhrStellen();
    await abgleichStarten({ grund: "start" });
  } catch (e) { console.warn("Abgleich einrichten:", e); }
}

export async function start() {
  try {
    if (!document.querySelector(".mf-sprite")) document.body.insertAdjacentHTML("afterbegin", sprite());
    Z.speicher = await speicherServer();
    window.MF = Object.assign(window.MF || {}, { speicher: Z.speicher });
    try {
      datenInstallieren(window, { speicher: Z.speicher });
      Z.hcVerfuegbar = !!(await window.MF.daten.healthConnect.verfuegbar())?.verfuegbar;
    } catch (e) { console.warn("Datenschicht:", e); }
    await ladeAlles();
    themaAnwenden(); spracheAnwenden();
    window.MF = Object.assign(window.MF || {}, { shell: { neuLaden: async () => { await ladeAlles(); zeichnen(); }, speicher: Z.speicher } });
    klicks();
    zeichnen();
    // Erst das Bild, dann im Hintergrund abgleichen (blockiert nie den Start)
    abgleichEinrichten();
  } catch (e) {
    console.error(e);
    const w = document.getElementById("mf-wurzel");
    if (w) w.innerHTML = `<main class="mf-haupt"><p class="mf-hinweis">${esc(t("fehler_start", { text: e?.message || e }))}</p></main>`;
  }
}

import { liveEinhaengen } from "./live.js";
liveEinhaengen(APPS);
if (typeof document !== "undefined" && document.getElementById("mf-wurzel")) start();
