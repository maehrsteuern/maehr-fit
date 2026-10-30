// Kleiner ZIP-Leser ohne Fremdbibliothek, damit der WHOOP-Export als ZIP direkt eingelesen werden kann.
// Unterstützt "gespeichert" (Methode 0) und "deflate" (Methode 8) über DecompressionStream
// (in allen aktuellen Browsern, Android-WebView und Node ab 18). Kein ZIP64, keine Verschlüsselung.

const SIG_ENDE = 0x06054b50;
const SIG_VERZEICHNIS = 0x02014b50;
const SIG_LOKAL = 0x04034b50;

function findeEnde(ansicht) {
  const min = Math.max(0, ansicht.byteLength - 65557);
  for (let i = ansicht.byteLength - 22; i >= min; i--) {
    if (ansicht.getUint32(i, true) === SIG_ENDE) return i;
  }
  return -1;
}

async function entpacke(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw new Error("Dieses Gerät kann ZIP-Dateien nicht entpacken. Bitte die CSV-Dateien einzeln wählen.");
  }
  const strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

/**
 * ZIP-Inhalt lesen.
 * @param {ArrayBuffer|Uint8Array} daten
 * @returns {Promise<{name:string, bytes:Uint8Array}[]>} nur Dateien, keine Ordner
 */
export async function leseZip(daten) {
  const u8 = daten instanceof Uint8Array ? daten : new Uint8Array(daten);
  const ansicht = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const ende = findeEnde(ansicht);
  if (ende < 0) throw new Error("Keine gültige ZIP-Datei.");
  const anzahl = ansicht.getUint16(ende + 10, true);
  let pos = ansicht.getUint32(ende + 16, true);
  if (pos === 0xffffffff || anzahl === 0xffff) throw new Error("ZIP64 wird nicht unterstützt.");
  const namen = new TextDecoder("utf-8");
  const aus = [];
  for (let n = 0; n < anzahl; n++) {
    if (ansicht.getUint32(pos, true) !== SIG_VERZEICHNIS) throw new Error("ZIP-Verzeichnis beschädigt.");
    const flags = ansicht.getUint16(pos + 8, true);
    const methode = ansicht.getUint16(pos + 10, true);
    const groesse = ansicht.getUint32(pos + 20, true);
    const nameLaenge = ansicht.getUint16(pos + 28, true);
    const extraLaenge = ansicht.getUint16(pos + 30, true);
    const kommentarLaenge = ansicht.getUint16(pos + 32, true);
    const lokal = ansicht.getUint32(pos + 42, true);
    const name = namen.decode(u8.subarray(pos + 46, pos + 46 + nameLaenge));
    pos += 46 + nameLaenge + extraLaenge + kommentarLaenge;
    if (name.endsWith("/")) continue;
    if (flags & 1) throw new Error(`Verschlüsselte ZIP-Datei (${name}) wird nicht unterstützt.`);
    if (ansicht.getUint32(lokal, true) !== SIG_LOKAL) throw new Error("ZIP-Eintrag beschädigt.");
    const start = lokal + 30 + ansicht.getUint16(lokal + 26, true) + ansicht.getUint16(lokal + 28, true);
    const roh = u8.subarray(start, start + groesse);
    if (methode === 0) aus.push({ name, bytes: roh.slice() });
    else if (methode === 8) aus.push({ name, bytes: await entpacke(roh) });
    else throw new Error(`ZIP-Methode ${methode} (${name}) wird nicht unterstützt.`);
  }
  return aus;
}
