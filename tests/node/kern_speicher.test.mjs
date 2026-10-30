// Tests kern/speicher.js – Schnittstelle {lies, schreib, liste} mit der Map-Umsetzung.
// Fall: schreib("tagebuch:2026-10-30", {alkohol: true}) → lies liefert eine Kopie; liste("tagebuch:") sortiert.
// Grenzfälle: fehlender Schlüssel → undefined; leerer Schlüssel wird abgelehnt; Änderungen außen wirken nicht nach innen.
import test from "node:test";
import assert from "node:assert/strict";
import { speicherMap, istSpeicher, SCHLUESSEL } from "../../kern/speicher.js";

test("schreiben, lesen, auflisten", async () => {
  const s = speicherMap({ einstellungen: { alter: 32 } });
  assert.ok(istSpeicher(s));
  await s.schreib(SCHLUESSEL.tagebuch("2026-10-30"), { alkohol: true });
  await s.schreib(SCHLUESSEL.tagebuch("2026-10-29"), { alkohol: false });
  assert.deepEqual(await s.lies("tagebuch:2026-10-30"), { alkohol: true });
  assert.deepEqual(await s.liste("tagebuch:"), ["tagebuch:2026-10-29", "tagebuch:2026-10-30"]);
  assert.deepEqual(await s.liste(), ["einstellungen", "tagebuch:2026-10-29", "tagebuch:2026-10-30"]);
  assert.deepEqual(await s.lies("einstellungen"), { alter: 32 });
  assert.equal(s.groesse(), 3);
});

test("Kopien statt Verweise, Grenzfälle", async () => {
  const s = speicherMap();
  const w = { a: [1, 2] };
  await s.schreib("x", w);
  w.a.push(3);
  const gelesen = await s.lies("x");
  assert.deepEqual(gelesen, { a: [1, 2] });
  gelesen.a.push(9);
  assert.deepEqual(await s.lies("x"), { a: [1, 2] });
  assert.equal(await s.lies("fehlt"), undefined);
  await assert.rejects(s.schreib("", 1));
  assert.equal(istSpeicher({ lies() {} }), false);
  assert.equal(istSpeicher(null), false);
});
