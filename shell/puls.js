/* shell/puls.js – eine Pulsquelle für alle Ansichten (Live, Atem).
 *
 * Kernaussage: Es gibt höchstens eine Verbindung zu einem Pulsmesser – zum WHOOP-Band, zu einem Brustgurt oder zum Demo-Puls. Sie
 * bleibt bestehen, wenn du zwischen den Ansichten wechselst, und jede Ansicht hört nur mit. Echte Messwerte landen alle zehn
 * Sekunden im Speicher (messung:herzschlag:<tag>); der Demo-Puls wird nie gespeichert. Die letzten drei Minuten hält die Quelle
 * für die Verlaufslinie bereit.
 *
 * Welche Brücke: Android-App → Capacitor-Plugin BluetoothLe · Chrome → Web Bluetooth · sonst nur Demo-Puls.
 * Schnittstelle: bluetoothArt(ziel?) · verbinden({ demo?, profil?, atemZyklusMs? }) · trennen() · abonniere(cb) · beobachte(cb)
 *   · zustand() · verlauf() · letzter() · sichern() · VERLAUF_MS
 */
import { livePuls } from "../daten/ble_puls.js";
import { webBluetoothBruecke } from "../daten/bruecke_webbluetooth.js";
import { capacitorBleBruecke, blePlugin } from "../daten/bruecke_ble_capacitor.js";
import { demoBruecke } from "../daten/bruecke_demo.js";

export const VERLAUF_MS = 180000; // Darstellung: Verlaufslinie der letzten drei Minuten

const P = { strom: null, demo: false, profil: null, zustand: { stand: "aus", geraet: null, versuch: 0, fehler: null }, letzte: [], abos: new Set(), beobachter: new Set() };

/** "capacitor" (Android-App mit Plugin), "webbluetooth" (Chrome) oder null. */
export function bluetoothArt(ziel = globalThis) {
  if (blePlugin(ziel)) return "capacitor";
  if (ziel?.navigator?.bluetooth && typeof ziel.navigator.bluetooth.requestDevice === "function") return "webbluetooth";
  return null;
}

const benachrichtige = (menge, x) => { for (const cb of menge) { try { cb(x); } catch (e) { console.error(e); } } };
export const zustand = () => ({ ...P.zustand, demo: P.demo, profil: P.profil, aktiv: !!P.strom });
export const verlauf = () => P.letzte.slice();
export const letzter = () => P.letzte.at(-1) || null;
export function abonniere(cb) { P.abos.add(cb); return () => P.abos.delete(cb); }
export function beobachte(cb) { P.beobachter.add(cb); return () => P.beobachter.delete(cb); }
export const sichern = () => (P.strom ? P.strom.sichern() : Promise.resolve(0));

/**
 * Verbinden. Beim echten Band öffnet das System die Geräteauswahl (nur nach einem Tipp erlaubt).
 * @param {{ demo?: boolean, profil?: "training"|"atem", atemZyklusMs?: number, ziel?: object }} [o]
 */
export async function verbinden({ demo = false, profil = "training", atemZyklusMs, ziel = globalThis } = {}) {
  if (P.strom) await trennen();
  const art = demo ? "demo" : bluetoothArt(ziel);
  const bruecke = art === "demo" ? demoBruecke({ profil, atemZyklusMs }) : art === "capacitor" ? capacitorBleBruecke(ziel) : art === "webbluetooth" ? webBluetoothBruecke(ziel.navigator) : null;
  if (!bruecke) throw new Error("kein_bluetooth");
  const speicher = demo ? null : ziel?.MF?.speicher || null;
  const strom = livePuls({ bruecke, speicher });
  P.strom = strom; P.demo = demo; P.profil = demo ? profil : null; P.letzte = [];
  strom.abonniere((satz) => {
    P.letzte.push(satz);
    const ab = satz.t - VERLAUF_MS;
    while (P.letzte.length && P.letzte[0].t < ab) P.letzte.shift();
    benachrichtige(P.abos, satz);
  });
  strom.beobachte((z) => { P.zustand = z; benachrichtige(P.beobachter, zustand()); });
  try { await strom.start(); } catch (e) { if (P.strom === strom) { P.strom = null; P.demo = false; } benachrichtige(P.beobachter, zustand()); throw e; }
  return zustand();
}

export async function trennen() {
  const s = P.strom;
  if (!s) return;
  P.strom = null;
  await s.stop();
  P.demo = false; P.profil = null;
  P.zustand = { stand: "aus", geraet: null, versuch: 0, fehler: null };
  benachrichtige(P.beobachter, zustand());
}
