// Prüft die Regel „Kern ohne DOM, Netz, Speicher“ (CLAUDE.md): keine Browser-, Netz- oder Speicherzugriffe in kern/*.js,
// keine fremden Adressen, und kein Modul greift auf Math.random (Demodaten nur mit Startwert).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = new URL("../../kern/", import.meta.url);
const dateien = readdirSync(DIR).filter((f) => f.endsWith(".js"));
const VERBOTEN = [/\bdocument\./, /\bwindow\./, /\bfetch\(/, /localStorage/, /sessionStorage/, /indexedDB/, /XMLHttpRequest/, /WebSocket/, /https?:\/\//, /Math\.random/, /require\(/];

test("kern/*.js ohne DOM, Netz, Speicher, Zufall ohne Startwert", () => {
  assert.ok(dateien.length >= 14);
  for (const f of dateien) {
    const text = readFileSync(new URL(f, DIR), "utf8");
    for (const re of VERBOTEN) assert.ok(!re.test(text), `${f}: ${re}`);
  }
});

test("jede Datei beginnt mit einer Kernaussage", () => {
  for (const f of dateien) assert.match(readFileSync(new URL(f, DIR), "utf8"), /Kernaussage:/, f);
});
