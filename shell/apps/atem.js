/* shell/apps/atem.js – „Atem“: geführte Atemübungen mit einem ruhigen Kreis (docs/apps/atem.md).
 *
 * Kernaussage: Du wählst eine Übung und folgst einem großen Kreis: Er wächst beim Einatmen, bleibt beim Halten stehen und wird
 * beim Ausatmen kleiner. In der Mitte stehen die Phase, ein Countdown und die Runde. Auf Wunsch vibriert das Gerät oder klingt
 * ein leiser Ton bei jedem Wechsel. Wer „weniger Bewegung“ eingestellt hat, sieht statt des Kreises einen Fortschrittsbalken.
 * Am Ende steht die geatmete Zeit im Tagebuch (Eintrag „atem“ in Millisekunden).
 *
 * Takt: requestAnimationFrame gegen performance.now() – kein Intervall-Zeitgeber, daher kein Abdriften; Pausen werden abgezogen.
 * Routen: #/atem (Liste) · #/atem/<name> (Sitzung). Schnittstelle: ansicht(ctx) → HTML, binde(wurzel, ctx) → aufraeumen()
 * Rein und testbar: gesamtDauer(uebung), phaseBei(uebung, ms), skalaFuer(art, anteil), skalenPlan(uebung), skalaBei(uebung, phase), phasenText(phase)
 */
import { t, TEXTE } from "../i18n/i18n.js";
import { dauer, esc } from "../format.js";
import { kernaussage, kopf, IKON } from "../ui.js";
import { atemKatalog, atemUebung } from "../kern.js";

export const SKALA_KLEIN = 0.55, SKALA_GROSS = 1;   // Darstellung des Kreises (keine Rechenregel)
export const MINDEST_MS = 10000;                    // kürzere Sitzungen werden nicht gespeichert (Darstellung, kein Messwert)

export const rundenDauer = (u) => (u.phasen || []).reduce((s, p) => s + p.ms, 0);
export const gesamtDauer = (u) => rundenDauer(u) * (u.runden || 1);

/** Wo steht die Übung nach `ms` Millisekunden? */
export function phaseBei(u, ms) {
  const rd = rundenDauer(u), gesamt = gesamtDauer(u);
  if (!rd || ms >= gesamt) return { fertig: true, runde: u.runden, index: u.phasen.length - 1, art: null, imPhaseMs: 0, phasenMs: 0, restMs: 0, gesamtMs: gesamt };
  const m = Math.max(0, ms), runde = Math.floor(m / rd) + 1;
  let rest = m % rd, index = 0;
  while (index < u.phasen.length - 1 && rest >= u.phasen[index].ms) { rest -= u.phasen[index].ms; index++; }
  const p = u.phasen[index];
  return { fertig: false, runde, index, art: p.art, imPhaseMs: rest, phasenMs: p.ms, restMs: p.ms - rest, gesamtMs: gesamt };
}

/** Größe des Kreises in einer Phase (sanft: Sinus-Kurve ein/aus). */
export function skalaFuer(art, anteil) {
  const f = Math.max(0, Math.min(1, anteil)), e = 0.5 - Math.cos(Math.PI * f) / 2;
  if (art === "ein") return SKALA_KLEIN + (SKALA_GROSS - SKALA_KLEIN) * e;
  if (art === "aus") return SKALA_GROSS - (SKALA_GROSS - SKALA_KLEIN) * e;
  if (art === "halten") return SKALA_GROSS;
  return SKALA_KLEIN;
}

/** Start- und Endgröße je Phase: Folgen gleicher Phasen (z. B. zweimal „ein“ beim Seufzer) teilen sich den Weg nach Dauer. */
export function skalenPlan(u) {
  const ph = u.phasen || [], plan = [];
  let jetzt = SKALA_KLEIN;
  for (let i = 0; i < ph.length; i++) {
    const art = ph[i].art;
    if (art !== "ein" && art !== "aus") { plan.push({ von: jetzt, bis: jetzt }); continue; }
    let j = i, summe = 0;
    while (j < ph.length && ph[j].art === art) summe += ph[j++].ms;
    const ziel = art === "ein" ? SKALA_GROSS : SKALA_KLEIN;
    for (let k = i; k < j; k++) { const bis = jetzt + ((ziel - (art === "ein" ? SKALA_KLEIN : SKALA_GROSS)) * ph[k].ms) / summe; plan.push({ von: jetzt, bis }); jetzt = bis; }
    i = j - 1;
  }
  return plan;
}
/** Größe des Kreises für eine Stelle aus phaseBei (sanft je Phase). */
export function skalaBei(u, p, plan = skalenPlan(u)) {
  const s = plan[p.index] || { von: SKALA_KLEIN, bis: SKALA_KLEIN }, f = p.phasenMs ? Math.max(0, Math.min(1, p.imPhaseMs / p.phasenMs)) : 1;
  return s.von + (s.bis - s.von) * (0.5 - Math.cos(Math.PI * f) / 2);
}
/** Text der Phase: eigene Beschriftung des Kerns (z. B. „nachatmen“), sonst die Art. */
export const phasenText = (ph) => (ph?.label && ph.label !== ph.art && TEXTE["phase_" + ph.label] ? t("phase_" + ph.label) : t("phase_" + (ph?.art || "ein")));

function liste(ctx) {
  const heute = ctx.atemHeuteMs || 0;
  const zeilen = atemKatalog().map((name) => {
    const u = atemUebung(name);
    return `<li><a class="mf-zeile" href="#/atem/${encodeURIComponent(u.name)}"><span class="mf-zeile-text"><strong>${esc(t("atem_" + u.name))}</strong><small>${esc(t("atem_" + u.name + "_text"))}</small><small>${esc(t("atem_dauer", { runden: u.runden, dauer: dauer(gesamtDauer(u)) }))}</small></span><span class="mf-chevron">${IKON.rechts}</span></a></li>`;
  }).join("");
  const satz = esc(t("atem_kern")) + (heute > 0 ? " " + esc(t("atem_heute", { wert: dauer(heute, { sekunden: true }) })) : "");
  return `<div class="mf-sicht" data-sicht="atem">${kopf(t("atem_titel"))}${kernaussage(satz)}<ul class="mf-liste">${zeilen}</ul></div>`;
}

const schalter = (id, titel, text, an) => `<label class="mf-schalter"><span class="mf-schalter-text"><span>${esc(titel)}</span><small>${esc(text)}</small></span><input type="checkbox" role="switch" data-at-option="${id}"${an ? " checked" : ""}></label>`;

function sitzung(ctx, name) {
  const u = atemUebung(name), p0 = u.phasen[0];
  return `<div class="mf-sicht" data-sicht="atem-sitzung">
    ${kopf(t("atem_" + u.name), { zurueck: "#/atem" })}
    ${kernaussage(esc(t("atem_sitzung_kern")))}
    <div class="at-buehne" data-zustand="bereit" data-uebung="${esc(u.name)}">
      <div class="at-kreisfeld">
        <div class="at-ring" aria-hidden="true"></div><div class="at-kreis" aria-hidden="true"></div>
        <div class="at-mitte"><span class="at-phase" aria-live="polite">${esc(t("atem_bereit"))}</span><span class="at-zahl" aria-hidden="true">${Math.round(p0.ms / 1000)}</span><span class="at-runde">${esc(t("runde", { n: 1, gesamt: u.runden }))}</span></div>
      </div>
      <div class="at-balken" role="progressbar" aria-label="${esc(t("atem_fortschritt"))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      <div class="at-steuer">
        <button type="button" class="mf-knopf primaer" data-at="start">${esc(t("atem_start"))}</button>
        <button type="button" class="mf-knopf" data-at="stopp" hidden>${esc(t("atem_stopp"))}</button>
      </div>
      <p class="mf-hinweis at-ergebnis" role="status" hidden></p>
    </div>
    <div class="mf-liste at-optionen">${schalter("vibration", t("atem_vibration"), t("atem_vibration_text"), !!ctx.einst?.haptik)}${schalter("ton", t("atem_ton"), t("atem_ton_text"), false)}</div>
  </div>`;
}

export function ansicht(ctx) {
  const teile = ctx.route?.teile || [];
  return teile[1] ? sitzung(ctx, decodeURIComponent(teile[1])) : liste(ctx);
}

// ------------------------------------------------------------------ Sitzung im Browser
function tonSpielen(audio, art) {
  if (!audio) return;
  const jetzt = audio.currentTime, osz = audio.createOscillator(), laut = audio.createGain();
  osz.type = "sine"; osz.frequency.value = art === "ein" ? 392 : art === "aus" ? 330 : 349;
  laut.gain.setValueAtTime(0, jetzt); laut.gain.linearRampToValueAtTime(0.05, jetzt + 0.05); laut.gain.linearRampToValueAtTime(0, jetzt + 0.45);
  osz.connect(laut).connect(audio.destination); osz.start(jetzt); osz.stop(jetzt + 0.5);
}

export function binde(wurzel, ctx) {
  const buehne = wurzel.querySelector(".at-buehne");
  if (!buehne) return () => {};
  const u = atemUebung(buehne.dataset.uebung), plan = skalenPlan(u);
  const $ = (s) => buehne.querySelector(s);
  const kreis = $(".at-kreis"), phaseEl = $(".at-phase"), zahlEl = $(".at-zahl"), rundeEl = $(".at-runde"), balken = $(".at-balken"), fuell = $(".at-balken > span");
  const startK = $('[data-at="start"]'), stoppK = $('[data-at="stopp"]'), ergebnis = $(".at-ergebnis");
  const opt = { vibration: !!ctx.einst?.haptik, ton: false };
  wurzel.querySelectorAll("[data-at-option]").forEach((el) => el.addEventListener("change", () => { opt[el.dataset.atOption] = el.checked; }));
  let zustand = "bereit", start = 0, pauseAb = 0, pauseSumme = 0, raf = 0, letzte = "", audio = null;
  const jetzt = () => performance.now();
  const setze = (z) => { zustand = z; buehne.dataset.zustand = z; };
  const zeige = (p) => {
    const schl = `${p.runde}:${p.index}`;
    if (schl !== letzte) {
      letzte = schl; phaseEl.textContent = phasenText(u.phasen[p.index]); rundeEl.textContent = t("runde", { n: p.runde, gesamt: u.runden });
      if (opt.vibration && navigator.vibrate) navigator.vibrate(30);
      if (opt.ton) tonSpielen(audio, p.art);
    }
    const sek = String(Math.ceil(p.restMs / 1000));
    if (zahlEl.textContent !== sek) zahlEl.textContent = sek;
    const anteil = p.phasenMs ? p.imPhaseMs / p.phasenMs : 1;
    kreis.style.setProperty("--at-skala", skalaBei(u, p, plan).toFixed(4));
    fuell.style.transform = `scaleX(${anteil.toFixed(3)})`;
    balken.setAttribute("aria-valuenow", String(Math.round(anteil * 100)));
  };
  const schleife = (zeit) => {
    if (zustand !== "laeuft") return;
    const p = phaseBei(u, zeit - start - pauseSumme);
    if (p.fertig) { beenden(gesamtDauer(u)); return; }
    zeige(p); raf = requestAnimationFrame(schleife);
  };
  async function beenden(ms) {
    cancelAnimationFrame(raf); setze("fertig");
    phaseEl.textContent = t("atem_fertig"); zahlEl.textContent = "";
    kreis.style.setProperty("--at-skala", String(SKALA_KLEIN));
    startK.textContent = t("atem_nochmal"); stoppK.hidden = true;
    ergebnis.hidden = false;
    if (ms >= MINDEST_MS) {
      ergebnis.textContent = t("atem_ergebnis", { dauer: dauer(ms, { sekunden: true }) });
      try { await ctx.atemSpeichern?.(Math.round(ms)); } catch (e) { ergebnis.textContent += " " + String(e?.message || e); }
    } else ergebnis.textContent = t("atem_ergebnis_kurz");
  }
  startK.addEventListener("click", () => {
    if (zustand === "laeuft") { setze("pause"); pauseAb = jetzt(); cancelAnimationFrame(raf); startK.textContent = t("atem_weiter"); phaseEl.textContent = t("atem_pause_text"); letzte = ""; return; }
    if (zustand === "pause") { pauseSumme += jetzt() - pauseAb; setze("laeuft"); startK.textContent = t("atem_pause"); raf = requestAnimationFrame(schleife); return; }
    // bereit oder fertig: neu beginnen
    if (opt.ton && !audio) { try { const AC = window.AudioContext || window.webkitAudioContext; audio = AC ? new AC() : null; } catch { audio = null; } }
    start = jetzt(); pauseSumme = 0; letzte = ""; ergebnis.hidden = true;
    setze("laeuft"); startK.textContent = t("atem_pause"); stoppK.hidden = false;
    raf = requestAnimationFrame(schleife);
  });
  wurzel.querySelector('[data-at-option="ton"]')?.addEventListener("change", (ev) => {
    if (ev.target.checked && !audio) { try { const AC = window.AudioContext || window.webkitAudioContext; audio = AC ? new AC() : null; } catch { audio = null; } }
  });
  stoppK.addEventListener("click", () => {
    const ms = (zustand === "pause" ? pauseAb : jetzt()) - start - pauseSumme;
    if (zustand === "pause") pauseSumme += jetzt() - pauseAb;
    beenden(Math.max(0, Math.min(ms, gesamtDauer(u))));
  });
  return () => { cancelAnimationFrame(raf); zustand = "weg"; try { audio?.close(); } catch { /* nichts */ } };
}
