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
 * Datenschicht: daten/verbinden.js installiert window.MF.daten (healthConnect.verfuegbar/verbinden, csvImport) auf demselben Speicher;
 *   nach jedem Einlesen liest die Shell die Messwerte neu aus dem Speicher.
 */
import { t, setzeSprache, sprache } from "./i18n/i18n.js";
import { esc } from "./format.js";
import { neuesRegister } from "./ui.js";
import { kopfHtml, menueHtml, reiterHtml, REITER } from "./rahmen.js";
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

const Z = { hcVerfuegbar: false, speicher: null, einst: {}, messwerte: null, demo: true, tagebuchEigen: {}, erg: null, tag: null, heute: null, register: neuesRegister(), aufraeumen: () => {} };
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
  Z.heute = Z.demo ? (Z.erg.letzter || kalender) : (Z.erg.letzter && Z.erg.letzter > kalender ? Z.erg.letzter : kalender);
  // Startet heute ohne Messwerte (Uhr noch nicht abgeglichen), zeigt die Shell den letzten Tag mit Werten
  if (!Z.tag || Z.tag > Z.heute || (Z.erg.erster && Z.tag < Z.erg.erster)) Z.tag = Z.erg.tage.has(Z.heute) || !Z.erg.letzter ? Z.heute : Z.erg.letzter;
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
  Z.tag = null; await ladeAlles(); zeichnen();
  return Number.isFinite(ergebnis.neu) ? ergebnis.neu + (ergebnis.ersetzt || 0) : anzahl(ergebnis);
}

const aktionen = {
  /** fortschritt({ art, nr, von, gelesen }) kommt vor jedem Lesefenster (daten/healthconnect.js); Rückgabe wie bei csvEinlesen. */
  async hcVerbinden(fortschritt) {
    const r = await window.MF.daten.healthConnect.verbinden(undefined, { fortschritt });
    const n = await eigeneDatenUebernehmen(r);
    const leer = (k) => !(Z.messwerte?.[k]?.length > 0);
    return {
      n, arten: r.zaehlung || {}, zeitraum: r.zeitraum || null, fehler: r.fehler || [], luecken: r.luecken || [],
      gespeichert: Z.erg.erster ? { von: Z.erg.erster, bis: Z.erg.letzter } : null,   // alles, was jetzt auf dem Gerät liegt
      ohneHrvRuhepuls: leer("hrv") && leer("ruhepuls"),
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
    Z.tag = null; await ladeAlles(); themaAnwenden(); spracheAnwenden();
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
    hcVerfuegbar: Z.hcVerfuegbar, csvVerfuegbar: typeof window.MF?.daten?.csvImport === "function",
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
  wurzel.innerHTML = `${kopfHtml({ tag: Z.tag, heute: Z.heute, erster: Z.erg.erster, thema: Z.einst.thema })}${menueHtml()}<main class="mf-haupt" id="mf-haupt" tabindex="-1">${chip ? `<div class="mf-sicht-chip">${chip}</div>` : ""}${inhalt}</main>${reiterHtml(aktiv)}`;
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
      const weg = wegLesen(location.hash);
      if (weg.teile[0] === "belastung" && weg.teile[1] === "training") location.hash = "#/belastung"; else zeichnen();
      document.querySelector(`[data-tag="${w}"]:not(:disabled)`)?.focus();
      return;
    }
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
  } catch (e) {
    console.error(e);
    const w = document.getElementById("mf-wurzel");
    if (w) w.innerHTML = `<main class="mf-haupt"><p class="mf-hinweis">${esc(t("fehler_start", { text: e?.message || e }))}</p></main>`;
  }
}

import { liveEinhaengen } from "./live.js";
liveEinhaengen(APPS);
if (typeof document !== "undefined" && document.getElementById("mf-wurzel")) start();
