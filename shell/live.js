/* shell/live.js – hängt die Ansicht „Live-Puls“ in die Wege der Shell ein (#/live).
 *
 * Kernaussage: Die Live-Ansicht (shell/apps/live.js) kommt mit einem einzigen Aufruf in die Shell, ohne dass shell/shell.js
 * selbst wachsen muss: liveEinhaengen(APPS) trägt sie unter „live“ ein. Erreichbar ist sie aus „Belastung“
 * („Training live aufzeichnen“) und aus „Atem“ („Puls live ansehen“).
 *
 * Schnittstelle: liveEinhaengen(apps) → apps
 */
import * as live from "./apps/live.js";

export function liveEinhaengen(apps) {
  if (apps && !apps.live) apps.live = live;
  return apps;
}
