/* shell/format.js – Zahlen, Dauern, Uhrzeiten und Tage als lesbarer Text (DE/EN), ohne DOM.
 *
 * Kernaussage: Der Kern liefert ganze Einheiten (Millisekunden, Schläge, Prozent, Zehntel der Belastung). Diese Datei macht
 * daraus Text für Menschen – „7 h 52 min“, „78 %“, „12,4“, „Do., 30. Okt.“ – im Gebietsschema der gewählten Sprache.
 */
import { locale, sprache, t } from "./i18n/i18n.js";

export const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const attr = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join("");

export function zahl(n, stellen = 0) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "–";
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: stellen, maximumFractionDigits: stellen }).format(Number(n));
}
/** Punkte mit Vorzeichen: „+8,3“, „−2“ (Beitrag zur Erholung). */
export const mitVorzeichen = (n, stellen = 1) => (Number.isFinite(n) ? (n > 0 ? "+" : n < 0 ? "−" : "") + zahl(Math.abs(n), stellen) : "–");
export const prozent = (n) => (n === null || n === undefined ? "–" : zahl(n) + (sprache() === "de" ? "\u00a0%" : "%"));
/** Belastung: der Kern liefert Zehntel (0–210) → „12,4“. */
export const belastungText = (zehntel) => (Number.isFinite(zehntel) ? zahl(zehntel / 10, 1) : "–");
/** Dauer aus Millisekunden: „7 h 52 min“, „45 min“, „30 s“. */
export function dauer(ms, { sekunden = false } = {}) {
  if (!Number.isFinite(ms)) return "–";
  const neg = ms < 0, m = Math.round(Math.abs(ms) / 60000);
  if (sekunden && Math.abs(ms) < 60000) return `${Math.round(Math.abs(ms) / 1000)} s`;
  const h = Math.floor(m / 60), r = m % 60;
  return (neg ? "−" : "") + (h ? `${h} h${r ? ` ${r} min` : ""}` : `${r} min`);
}
/** Kurze Dauer für Achsen und Kacheln: „7:52 h“. */
export function dauerKurz(ms) {
  if (!Number.isFinite(ms)) return "–";
  const m = Math.round(Math.abs(ms) / 60000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")} h`;
}
export const uhrzeit = (ms) => new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
const datum = (iso) => { const [j, m, d] = iso.split("-").map(Number); return new Date(j, m - 1, d, 12); };
/** „Do., 30. Okt.“ / „Thu 30 Oct“ */
export const tagLang = (iso) => new Intl.DateTimeFormat(locale(), { weekday: "short", day: "numeric", month: "short" }).format(datum(iso));
/** „30.10.“ / „30/10“ für Achsen */
export const tagKurz = (iso) => new Intl.DateTimeFormat(locale(), { day: "numeric", month: "numeric" }).format(datum(iso));
/** Wochentag kurz „Do“ */
export const wochentag = (iso) => new Intl.DateTimeFormat(locale(), { weekday: "short" }).format(datum(iso)).replace(/\.$/, "");
/** Tag im Kopf: „heute“, „gestern“ oder „Do., 30. Okt.“ */
export function tagName(iso, heuteIso, gesternIso) {
  if (iso === heuteIso) return t("tag_heute").replace(/^./, (c) => c.toUpperCase());
  if (iso === gesternIso) return t("tag_gestern").replace(/^./, (c) => c.toUpperCase());
  return `${wochentag(iso)} ${tagKurz(iso)}`;
}
