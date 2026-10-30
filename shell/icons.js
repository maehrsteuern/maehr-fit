/* shell/icons.js – ein Satz Strich-Symbole (24 px, Strich 1,75, runde Enden) als Inline-SVG-Sprite, und die Leer-Bilder.
 *
 * Kernaussage: Alle Symbole von MAEHR FIT sehen gleich aus – dünner Strich in der Schriftfarbe, runde Enden, kein Emoji. Sie stehen
 * einmal als <symbol> im Dokument (sprite(), von shell/shell.js beim Start eingesetzt) und werden überall mit <use> eingebunden
 * (ikon(name)). Die Leer-Bilder sind einfache Strichzeichnungen in Tokenfarben für „noch keine Werte“.
 *
 * Schnittstelle: IKONE (Name → Pfade) · sprite() → SVG-String · ikon(name, klasse?) → SVG-String · leerBild(art) → SVG-String
 */
export const IKONE = {
  erholung: '<path d="M12 4a8 8 0 1 1-7.6 5.5"/><path d="M12 12l3.6-3.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  herz: '<path d="M12 20s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.3a4.1 4.1 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z"/>',
  mond: '<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1z"/>',
  aktivitaet: '<path d="M3 12.5h3.6l2.2-6.5 4.4 13 2.4-6.5H21"/>',
  wind: '<path d="M3 8.5h10.5a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3 12.5h14.5a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3 16.5h6"/>',
  mehr: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  sync: '<path d="M19.5 10.5A7.6 7.6 0 0 0 6 7.2L4.5 8.8"/><path d="M4.5 4.5v4.3h4.3"/><path d="M4.5 13.5A7.6 7.6 0 0 0 18 16.8l1.5-1.6"/><path d="M19.5 19.5v-4.3h-4.3"/>',
  bluetooth: '<path d="M7 7.5l10 9-5 4.5v-18l5 4.5-10 9"/>',
  kalender: '<rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M8.5 3.5v4M15.5 3.5v4M4 10.5h16"/>',
  links: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  rechts: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  unten: '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
  oben: '<path d="M5.5 14.5L12 8l6.5 6.5"/>',
  thema: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none"/>',
  menue: '<path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"/>',
  zu: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  tagebuch: '<path d="M6.5 4h10.5a1 1 0 0 1 1 1v15H7.5a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M9 8.5h6M9 12h6"/>',
  trends: '<path d="M4 19.5V5"/><path d="M4 19.5h16"/><path d="M7.5 15l3.8-4 3 3 4.7-5.5"/>',
  daten: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6"/><path d="M5 12c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8"/>',
  einstellungen: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>',
  pruefen: '<path d="M12 3.5l7 3v5.2c0 4.3-3 7.6-7 8.8-4-1.2-7-4.5-7-8.8V6.5z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
};

const RAHMEN = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

/** Das Sprite: einmal ins Dokument (unsichtbar, ohne Platz). */
export const sprite = () => `<svg class="mf-sprite" aria-hidden="true" focusable="false" width="0" height="0">${Object.entries(IKONE).map(([n, p]) => `<symbol id="mf-i-${n}" viewBox="0 0 24 24">${p}</symbol>`).join("")}</svg>`;

/** Ein Symbol aus dem Sprite; unbekannte Namen ergeben „mehr“. */
export const ikon = (name, klasse = "") => `<svg class="mf-ikon${klasse ? " " + klasse : ""}" ${RAHMEN}><use href="#mf-i-${IKONE[name] ? name : "mehr"}"/></svg>`;

/** Leer-Bilder: ruhige Strichzeichnung, 120 × 88, Farben über Klassen (design.css .mf-leerbild …). */
const LEER = {
  schlaf: '<path class="lb-linie" d="M14 70h92"/><path class="lb-akzent" d="M70 22a20 20 0 1 0 18 28 16 16 0 0 1-18-28z"/><path class="lb-leise" d="M30 34h8l-8 9h8M42 22h6l-6 7h6"/>',
  belastung: '<path class="lb-linie" d="M14 70h92"/><path class="lb-akzent" d="M18 56h16l7-20 12 34 8-22h12l5-10h24"/>',
  heute: '<path class="lb-linie" d="M14 78h92"/><circle class="lb-leise" cx="60" cy="42" r="28"/><path class="lb-akzent" d="M60 14a28 28 0 0 1 26.6 19.3"/><circle class="lb-punkt" cx="60" cy="42" r="3"/>',
  allgemein: '<path class="lb-linie" d="M14 70h92"/><rect class="lb-leise" x="30" y="24" width="60" height="36" rx="10"/><path class="lb-akzent" d="M40 48l10-10 8 8 12-14"/>',
};
export const leerBild = (art = "allgemein") => `<svg class="mf-leerbild" viewBox="0 0 120 88" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${LEER[art] || LEER.allgemein}</svg>`;
