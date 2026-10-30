/* shell/bewegung.js – die wenigen Bewegungen von MAEHR FIT im Browser (Ankommen einer Ansicht, Hochzählen der Heldenzahl).
 *
 * Kernaussage: Wenn du eine Ansicht öffnest, erscheinen ihre Abschnitte kurz nacheinander (Deckkraft und 8 px nach oben, 200 ms,
 * gestaffelt – CSS in design_bewegung.css), und die große Zahl zählt in höchstens 450 ms auf ihren Wert hoch. Wer am Gerät
 * „weniger Bewegung“ eingestellt hat, sieht sofort alles an seinem Platz. Beim Zurückkehren zu einem Reiter steht die Seite wieder
 * dort, wo du warst.
 *
 * Schnittstelle: ankommen(haupt, { neu }) · hochzaehlen(el, ziel, stellen, sprache) · weniger() · scrollMerken(weg) · scrollZurueck(weg)
 * Takt: requestAnimationFrame gegen performance.now(), kein Intervall-Zeitgeber.
 */
export const DAUER_HOCHZAEHLEN_MS = 450;
export const weniger = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Zahl im Gebietsschema der Seite hochzählen (ease-out), am Ende exakt der Zielwert. */
export function hochzaehlen(el, ziel, stellen = 0, locale = document.documentElement.lang || "de") {
  if (!el || !Number.isFinite(ziel)) return;
  const fmt = new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
  const end = el.textContent;
  if (weniger()) return;
  const start = performance.now();
  const schritt = (jetzt) => {
    if (!el.isConnected) return;
    const f = Math.min(1, (jetzt - start) / DAUER_HOCHZAEHLEN_MS), e = 1 - (1 - f) ** 3;
    el.textContent = f < 1 ? fmt.format(ziel * e) : end;
    if (f < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

/** Nach dem Zeichnen: bei neuer Ansicht gestaffelt einblenden und die Heldenzahl hochzählen. */
export function ankommen(haupt, { neu = false } = {}) {
  const sicht = haupt?.querySelector(".mf-sicht");
  if (!sicht || !neu) return;
  sicht.classList.add("mf-neu");
  for (const el of sicht.querySelectorAll("[data-hochzaehlen]")) hochzaehlen(el, Number(el.dataset.hochzaehlen), Number(el.dataset.stellen) || 0);
}

const SCROLL = new Map();
export const scrollMerken = (weg) => { if (weg) SCROLL.set(weg, window.scrollY); };
export const scrollZurueck = (weg) => window.scrollTo(0, SCROLL.get(weg) || 0);
