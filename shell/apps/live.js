/* shell/apps/live.js – „Live-Puls“: Puls in Echtzeit vom Band, Training live aufzeichnen (docs/apps/live.md).
 *
 * Kernaussage: Oben steht ein Satz, was die Ansicht kann, darunter groß dein Puls jetzt und die Pulszone. Du verbindest das Band
 * (oder probierst den Demo-Puls), startest die Aufzeichnung und siehst Belastung, Dauer und – wenn das Band Herzschlag-Abstände
 * sendet – die Kurz-HRV. Die Linie zeigt die letzten drei Minuten, der Balken die Zeit je Zone. „Beenden“ speichert die Einheit
 * als Training (Quelle Bluetooth), und der Tag wird neu gerechnet. Jede Zahl öffnet ihren Beleg.
 *
 * Route: #/live[?von=atem|belastung] (Zurück-Link). Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx) → aufraeumen()
 * Takt: Ereignisse vom Band (etwa 1 je Sekunde); die Uhr der Dauer über requestAnimationFrame gegen performance.now(), kein Intervall.
 * Zustand der Aufzeichnung lebt hier im Modul, damit sie beim Wechsel der Ansicht weiterläuft. Rein und testbar: uhr(ms), pulsEinstellungen(ctx)
 */
import { t } from "../i18n/i18n.js";
import { esc, zahl, dauer, uhrzeit, belastungText } from "../format.js";
import { kernaussage, kopf, abschnitt, zahlKnopf, beleg } from "../ui.js";
import { segmentbalken, verlauf, kennzahlKachel } from "../viz/viz.js";
import { maxPulsAus } from "../kern.js";
import { liveZone, laufendeBelastung, hrvKurz, trainingMindestMs, pulsFormel, zonenGrenzen } from "../kern_live.js";
import * as puls from "../puls.js";
import { speichereMessungen } from "../../daten/ablage.js";

const ZONEN_KLASSE = ["vz-k0", "vz-k1", "vz-k2", "vz-k3", "vz-k4"];

/** Aufzeichnung (ein Lauf zur Zeit). */
const S = { stand: "bereit", startPerf: 0, pauseAb: 0, pauseMs: 0, herzschlaege: [], rr: [], bz: null, belastung: null, ergebnis: null, abo: null, einst: null, demo: false, geraet: null };

/** Dauer als Uhr: „4:07“ bzw. „1:02:07“. */
export function uhr(ms) {
  const s = Math.max(0, Math.floor((Number(ms) || 0) / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

/** Höchst- und Ruhepuls für die Zonen: Einstellungen (sonst aus dem Alter, Tanaka 2001) und Ruhepuls des heutigen Tages bzw. Mittel. */
export function pulsEinstellungen(ctx) {
  const e = { ...(ctx.demoEinstellungen || {}), ...Object.fromEntries(Object.entries(ctx.einst || {}).filter(([, w]) => w !== null && w !== undefined && w !== "")) };
  const maxPuls = Number(e.maxPuls) || maxPulsAus(Number(e.alter)).wert || null;
  const bild = ctx.erg?.tage?.get?.(ctx.heute) || ctx.bild || null;
  const rp = bild?.ruhepuls?.wert ?? bild?.basis?.ruhepuls?.mittel ?? (Number(e.ruhepuls) || null);
  const ruhepuls = Number.isFinite(rp) ? Math.round(rp) : null;
  return { maxPuls, ruhepuls, ok: !!(maxPuls && ruhepuls && maxPuls > ruhepuls) };
}

const laufzeit = () => (S.stand === "laeuft" ? performance.now() - S.startPerf - S.pauseMs : S.stand === "pause" ? S.pauseAb - S.startPerf - S.pauseMs : S.stand === "fertig" && S.ergebnis ? S.ergebnis.dauerMs : 0);

// ------------------------------------------------------------------ Markup (rein)
function standText(z) {
  if (z.demo && z.aktiv) return t("live_stand_demo");
  if (z.stand === "verbunden") return t("live_stand_verbunden", { name: z.geraet?.name || t("live_geraet_unbekannt") });
  if (z.stand === "suche") return t("live_stand_suche");
  if (z.stand === "wieder") return t("live_stand_wieder", { n: z.versuch });
  if (z.stand === "getrennt") return t("live_stand_getrennt");
  if (z.stand === "fehler") return t("live_stand_fehler", { text: z.fehler === "kein_bluetooth" ? t("live_kein_bluetooth") : z.fehler || "–" });
  return t("live_stand_aus");
}

function zoneText(bpm, E) {
  if (!E.ok) return t("live_zone_fehlt");
  const z = liveZone(bpm, E);
  return z === null ? "–" : z === 0 ? t("live_zone_unter") : t("live_zone", { zone: z });
}

/** Belege und Teile, die sich mit jedem Messwert ändern (schreibt ins Register der Shell). */
function belegeSetzen(B, E) {
  const l = puls.letzter();
  B("live:puls", { titel: t("live_puls"), wert: l ? `${zahl(l.bpm)} ${t("einheit_bpm")}` : t("live_warte"), formel: pulsFormel(),
    teile: l ? [{ name: t("live_uhrzeit"), wert: uhrzeit(l.t) }, ...(l.rrMs?.length ? [{ name: t("live_rr"), wert: l.rrMs.map((x) => zahl(x)).join(" · ") }] : [])] : [], quellen: l ? [l.quelle] : [] });
  const grenzen = E.ok ? zonenGrenzen(E.maxPuls, E.ruhepuls) : [];
  B("live:zone", { titel: t("live_zone_titel"), wert: l ? zoneText(l.bpm, E) : "–", formel: laufendeBelastung([], E)?.zonenFormel || null,
    teile: E.ok ? [{ name: t("live_max"), wert: `${zahl(E.maxPuls)} ${t("einheit_bpm")}` }, { name: t("live_ruhe"), wert: `${zahl(E.ruhepuls)} ${t("einheit_bpm")}` }, ...grenzen.map((g) => ({ name: t("live_zone", { zone: g.zone }), wert: t("live_ab", { wert: zahl(g.abBpm) }) }))] : [],
    quellen: l ? [l.quelle] : [] });
  const b = S.belastung, quellen = S.herzschlaege.map((h) => h.quelle);
  B("live:belastung", { titel: t("live_belastung"), wert: b ? `${belastungText(b.wertZehntel)} ${t("einheit_von21")}` : "–", formel: b?.formel || laufendeBelastung([], E)?.formel || null,
    teile: (b?.zonen || []).map((z) => ({ name: t("live_zone", { zone: z.zone }), wert: dauer(z.ms, { sekunden: true }) })), quellen });
  B("live:dauer", { titel: t("live_dauer"), wert: uhr(laufzeit()), formel: null,
    teile: S.herzschlaege.length ? [{ name: t("live_beginn"), wert: uhrzeit(S.herzschlaege[0].t) }, { name: t("live_pausen"), wert: dauer(S.pauseMs, { sekunden: true }) }, { name: t("live_anzahl"), wert: zahl(S.herzschlaege.length) }] : [], quellen: [] });
  const h = hrvKurz(rrQuelle());
  B("live:hrv", { titel: t("live_hrv"), wert: h.rmssdZehntel !== null ? `${zahl(h.rmssdZehntel / 10, 1)} ${t("einheit_ms")}` : t("live_zu_wenig_rr"), formel: h.formel,
    teile: [{ name: t("live_differenzen"), wert: zahl(h.n) }, { name: t("live_verworfen"), wert: zahl(h.verworfen) }], quellen: puls.verlauf().slice(-25).map((x) => x.quelle) });
  for (const z of b?.zonen || []) B(`live:zone-ms:${z.zone}`, { titel: t("live_zone", { zone: z.zone }), wert: dauer(z.ms, { sekunden: true }), formel: b.zonenFormel, teile: [], quellen });
  const v = puls.verlauf(), werte = v.map((x) => x.bpm);
  B("live:verlauf", { titel: t("live_verlauf_titel"), wert: l ? `${zahl(l.bpm)} ${t("einheit_bpm")}` : "–", formel: pulsFormel(),
    teile: v.length ? [{ name: t("live_tiefster"), wert: zahl(Math.min(...werte)) }, { name: t("live_hoechster"), wert: zahl(Math.max(...werte)) }, { name: t("live_anzahl"), wert: zahl(v.length) }] : [], quellen: v.map((x) => x.quelle) });
  for (const k of ["min", "max"]) B(`live:verlauf-${k}`, { titel: t(k === "min" ? "live_tiefster" : "live_hoechster"), wert: v.length ? `${zahl(k === "min" ? Math.min(...werte) : Math.max(...werte))} ${t("einheit_bpm")}` : "–", formel: null, teile: [], quellen: v.filter((x) => x.bpm === (k === "min" ? Math.min(...werte) : Math.max(...werte))).map((x) => x.quelle) });
}
/** RR-Abstände für die Kurz-HRV: der laufenden Aufzeichnung, sonst der letzten drei Minuten. */
const rrQuelle = () => (S.rr.length ? S.rr : puls.verlauf().flatMap((x) => x.rrMs || []));

function heldHtml(E) {
  const l = puls.letzter();
  return `<div class="lv-wert">${zahlKnopf("live:puls", l ? zahl(l.bpm) : "–", l ? `${t("live_puls")}: ${zahl(l.bpm)} ${t("einheit_bpm")}` : t("live_warte"))}<span class="lv-einheit">${esc(t("einheit_bpm"))}</span></div>
    <div class="lv-zone" data-zone="${l && E.ok ? liveZone(l.bpm, E) : ""}">${l && E.ok ? zahlKnopf("live:zone", zoneText(l.bpm, E)) : `<span class="mf-leise">${esc(l ? t("live_zone_fehlt") : t("live_warte"))}</span>`}</div>`;
}

function kachelnHtml() {
  const b = S.belastung, h = hrvKurz(rrQuelle()), mitRr = rrQuelle().length > 0;
  const k = [
    kennzahlKachel({ titel: t("live_belastung"), wert: b ? belastungText(b.wertZehntel) : belastungText(0), einheit: t("einheit_von21"), q: "live:belastung" }).html,
    kennzahlKachel({ titel: t("live_dauer"), wert: uhr(laufzeit()), q: "live:dauer" }).html.replace('class="mf-kachel"', 'class="mf-kachel" data-lv-dauer'),
  ];
  if (mitRr) k.push(kennzahlKachel({ titel: t("live_hrv"), wert: h.rmssdZehntel !== null ? zahl(h.rmssdZehntel / 10, 1) : "–", einheit: t("einheit_ms"), q: "live:hrv" }).html);
  return `<div class="mf-kacheln lv-kacheln">${k.join("")}</div>${puls.verlauf().length && !mitRr ? `<p class="mf-leise">${esc(t("live_kein_rr"))}</p>` : ""}`;
}

function zonenHtml() {
  const zonen = (S.belastung?.zonen || []).filter((z) => z.ms > 0);
  const max = zonen.reduce((a, z) => (z.ms > (a?.ms || 0) ? z : a), null);
  return segmentbalken({ titel: t("live_zonen_titel"), kernaussage: max ? t("live_zonen_kern", { zone: max.zone }) : t(S.stand === "laeuft" || S.stand === "pause" ? "live_zonen_unter" : "live_zonen_leer"),
    segmente: zonen.map((z) => ({ name: t("live_zone", { zone: z.zone }), wert: z.ms, text: dauer(z.ms, { sekunden: true }), q: `live:zone-ms:${z.zone}`, klasse: ZONEN_KLASSE[z.zone - 1] })) }).html;
}

function verlaufHtml() {
  const v = puls.verlauf(), l = v.at(-1);
  if (!l) return verlauf({ titel: t("live_verlauf_titel"), kernaussage: t("live_verlauf_leer"), punkte: [] }).html;
  const werte = v.map((x) => x.bpm), min = Math.min(...werte), max = Math.max(...werte);
  return verlauf({ titel: t("live_verlauf_titel"), kernaussage: t("live_verlauf_kern", { min: zahl(min), max: zahl(max) }), punkte: v.map((x) => ({ t: x.t, wert: x.bpm })),
    vonMs: l.t - puls.VERLAUF_MS, bisMs: l.t, q: "live:verlauf", text: zahl(l.bpm),
    kennzahlen: [{ name: t("live_zuletzt"), text: zahl(l.bpm), q: "live:puls" }, { name: t("live_tiefster"), text: zahl(min), q: "live:verlauf-min" }, { name: t("live_hoechster"), text: zahl(max), q: "live:verlauf-max" }] }).html;
}

function steuerHtml(z) {
  const verbunden = z.aktiv && z.stand === "verbunden" || z.stand === "wieder" || z.stand === "getrennt";
  const start = S.stand === "laeuft" ? t("live_pause") : S.stand === "pause" ? t("live_weiter") : t("live_start");
  return `<div class="mf-knopfreihe lv-steuer">
      <button type="button" class="mf-knopf primaer" data-lv="start"${verbunden || S.stand !== "bereit" && S.stand !== "fertig" ? "" : " disabled"}>${esc(start)}</button>
      <button type="button" class="mf-knopf" data-lv="stopp"${S.stand === "laeuft" || S.stand === "pause" ? "" : " hidden"}>${esc(t("live_stopp"))}</button>
    </div>
    <p class="mf-status lv-hinweis" role="status">${esc(S.stand === "laeuft" ? t("live_laeuft") : S.stand === "pause" ? t("live_pausiert") : verbunden ? "" : t("live_start_hinweis"))}</p>`;
}

function verbindungHtml(z, bt) {
  const an = z.aktiv;
  return `<p class="lv-stand" role="status" data-stand="${esc(an ? z.stand : "aus")}"><i aria-hidden="true"></i><span>${esc(standText(z))}</span></p>
    <div class="mf-knopfreihe">
      ${bt ? `<button type="button" class="mf-knopf${an ? "" : " primaer"}" data-lv="verbinden"${an && !z.demo ? " hidden" : ""}>${esc(t("live_verbinden"))}</button>` : ""}
      <button type="button" class="mf-knopf${bt || an ? "" : " primaer"}" data-lv="demo"${an && z.demo ? " hidden" : ""}>${esc(t("live_demo"))}</button>
      <button type="button" class="mf-knopf leise" data-lv="trennen"${an ? "" : " hidden"}>${esc(t("live_trennen"))}</button>
    </div>
    ${an ? "" : `<p class="mf-leise">${esc(t("live_whoop_hinweis"))}</p>`}`;
}

function ergebnisHtml() {
  const e = S.ergebnis;
  if (!e) return "";
  const link = e.trainingId ? `<a class="mf-knopf" href="#/belastung/training/${encodeURIComponent(e.trainingId)}">${esc(t("live_zum_training"))}</a>` : "";
  return `<div class="mf-hinweis lv-ergebnis" role="status"><p>${esc(e.text)}</p>${link ? `<div class="mf-knopfreihe">${link}</div>` : ""}</div>`;
}

export function ansicht(ctx) {
  const E = pulsEinstellungen(ctx), z = puls.zustand(), bt = puls.bluetoothArt(typeof window !== "undefined" ? window : globalThis);
  belegeSetzen(beleg(ctx.register), E);
  const zurueck = ctx.route?.abfrage?.von === "atem" ? "#/atem" : "#/belastung";
  return `<div class="mf-sicht" data-sicht="live">
    ${kopf(t("live_titel"), { zurueck })}
    ${kernaussage(esc(t(bt ? "live_kern" : "live_kern_ohne")))}
    <section class="mf-karte lv-verbindung" data-lv-teil="verbindung">${verbindungHtml(z, bt)}</section>
    <div class="mf-held lv-held" data-lv-teil="held">${heldHtml(E)}</div>
    <div data-lv-teil="kacheln">${kachelnHtml()}</div>
    ${abschnitt("", steuerHtml(z), "lv-steuerung")}
    <div data-lv-teil="ergebnis">${ergebnisHtml()}</div>
    <div class="mf-karte" data-lv-teil="verlauf">${verlaufHtml()}</div>
    <div class="mf-karte" data-lv-teil="zonen">${zonenHtml()}</div>
  </div>`;
}

// ------------------------------------------------------------------ Aufzeichnung (im Browser)
function aufnehmen(satz) {
  if (S.stand !== "laeuft") return;
  S.herzschlaege.push({ t: satz.t, bpm: satz.bpm, quelle: satz.quelle });
  if (satz.rrMs?.length) S.rr.push(...satz.rrMs);
  const r = laufendeBelastung([satz], S.einst, S.bz);
  if (r) { S.belastung = r; S.bz = r.zustand; }
}

async function speichern(ctx) {
  const hs = S.herzschlaege, dauerMs = Math.round(laufzeit());
  const wertText = belastungText(S.belastung?.wertZehntel ?? 0);
  S.stand = "fertig";
  if (S.demo) { S.ergebnis = { dauerMs, text: t("live_demo_ende", { dauer: dauer(dauerMs, { sekunden: true }), wert: wertText }) }; return; }
  if (hs.length < 2 || hs.at(-1).t - hs[0].t < trainingMindestMs()) { S.ergebnis = { dauerMs, text: t("live_zu_kurz") }; return; }
  const geraet = String(S.geraet?.name || S.geraet?.id || "ble").replace(/[^\w-]+/g, "_");
  const tr = { von: hs[0].t, bis: hs.at(-1).t, art: "sonst", herzschlaege: hs.slice(), quelle: { art: "ble", id: `live:${geraet}:${hs[0].t}` } };
  try {
    await puls.sichern();
    const speicher = window.MF?.speicher;
    if (!speicher) throw new Error("kein Speicher");
    await speichereMessungen(speicher, { training: [tr] });
    S.ergebnis = { dauerMs, trainingId: tr.quelle.id, text: t("live_gespeichert", { dauer: dauer(dauerMs, { sekunden: true }), wert: wertText }) };
    await window.MF?.shell?.neuLaden?.();
  } catch (e) { S.ergebnis = { dauerMs, text: t("live_fehler_speichern", { text: String(e?.message || e) }) }; }
}

export function binde(wurzel, ctx) {
  const sicht = wurzel.querySelector('[data-sicht="live"]');
  if (!sicht) return () => {};
  const E = pulsEinstellungen(ctx), B = beleg(ctx.register), bt = puls.bluetoothArt(window);
  const teil = (n) => sicht.querySelector(`[data-lv-teil="${n}"]`);
  let raf = 0, letzteSek = "";
  const neuZeichnen = (...namen) => {
    belegeSetzen(B, E);
    const z = puls.zustand();
    for (const n of namen) {
      if (n === "verbindung") teil(n).innerHTML = verbindungHtml(z, bt);
      if (n === "held") teil(n).innerHTML = heldHtml(E);
      if (n === "kacheln") teil(n).innerHTML = kachelnHtml();
      if (n === "verlauf") teil(n).innerHTML = verlaufHtml();
      if (n === "zonen") teil(n).innerHTML = zonenHtml();
      if (n === "ergebnis") teil(n).innerHTML = ergebnisHtml();
      if (n === "steuer") sicht.querySelector(".lv-steuerung").innerHTML = steuerHtml(z);
    }
  };
  const uhrSchleife = () => {
    if (S.stand !== "laeuft") return;
    const s = uhr(laufzeit());
    if (s !== letzteSek) { letzteSek = s; const el = sicht.querySelector("[data-lv-dauer] .zahl"); if (el) el.textContent = s; }
    raf = requestAnimationFrame(uhrSchleife);
  };
  const abAbo = puls.abonniere(() => neuZeichnen("held", "kacheln", "verlauf", "zonen"));
  const abZustand = puls.beobachte(() => neuZeichnen("verbindung", "steuer"));
  if (S.stand === "laeuft") raf = requestAnimationFrame(uhrSchleife);

  const verbinde = async (demo) => {
    try { await puls.verbinden({ demo, profil: "training" }); S.demo = demo; S.geraet = puls.zustand().geraet; }
    catch (e) { if (!/cancel|abgebrochen|chosen|NotFoundError/i.test(String(e?.name || "") + String(e?.message || ""))) console.warn(e); }
    neuZeichnen("verbindung", "steuer", "held", "kacheln", "verlauf");
  };
  const klick = async (ev) => {
    const k = ev.target.closest("[data-lv]");
    if (!k || k.disabled) return;
    const a = k.dataset.lv;
    if (a === "verbinden") return verbinde(false);
    if (a === "demo") return verbinde(true);
    if (a === "trennen") { if (S.stand === "laeuft" || S.stand === "pause") await stoppen(); await puls.trennen(); neuZeichnen("verbindung", "steuer"); return; }
    if (a === "start") {
      if (S.stand === "laeuft") { S.stand = "pause"; S.pauseAb = performance.now(); cancelAnimationFrame(raf); }
      else if (S.stand === "pause") { S.pauseMs += performance.now() - S.pauseAb; S.stand = "laeuft"; raf = requestAnimationFrame(uhrSchleife); }
      else {
        Object.assign(S, { stand: "laeuft", startPerf: performance.now(), pauseAb: 0, pauseMs: 0, herzschlaege: [], rr: [], bz: null, belastung: laufendeBelastung([], E), ergebnis: null, einst: E, demo: puls.zustand().demo, geraet: puls.zustand().geraet });
        if (!S.abo) S.abo = puls.abonniere(aufnehmen);
        raf = requestAnimationFrame(uhrSchleife);
      }
      neuZeichnen("steuer", "kacheln", "zonen", "ergebnis");
      return;
    }
    if (a === "stopp") await stoppen();
  };
  async function stoppen() {
    const ende = laufzeit();
    cancelAnimationFrame(raf);
    Object.assign(S, { stand: "pause", startPerf: 0, pauseMs: 0, pauseAb: ende }); // Uhr bei „ende“ anhalten (laufzeit() = ende)
    S.abo?.(); S.abo = null;
    await speichern(ctx);
    if (sicht.isConnected) neuZeichnen("steuer", "kacheln", "ergebnis");
  }
  sicht.addEventListener("click", klick);
  return () => { cancelAnimationFrame(raf); abAbo(); abZustand(); sicht.removeEventListener("click", klick); };
}
