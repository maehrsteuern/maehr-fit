// tests/node/shell_bau.test.mjs – Einzeldatei MF.html (bau.py).
// Kernaussage: Das eingecheckte MF.html entspricht dem Quelltext, enthält keine Importe und keine fremden Adressen mehr.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("MF.html ist aktuell (python3 bau.py --pruefen)", () => {
  const aus = execFileSync("python3", ["bau.py", "--pruefen"], { cwd: WURZEL, encoding: "utf8" });
  assert.match(aus, /aktuell/);
});

test("MF.html: ein Modul-Skript, keine Importe, keine Netzadressen, Stylesheets eingebettet", () => {
  const html = readFileSync(join(WURZEL, "MF.html"), "utf8");
  assert.equal((html.match(/<script type="module">/g) || []).length, 1);
  assert.doesNotMatch(html, /^\s*import\s.+from\s+"/m);
  assert.doesNotMatch(html, /<link rel="stylesheet"/);
  assert.doesNotMatch(html, /src="(?!data:)[^"]+"/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /font-family: 'Barlow Condensed'/);
});
