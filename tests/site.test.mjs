import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempDisposableSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../", import.meta.url));
let scratch;
before(() => {
  scratch = mkdtempDisposableSync(join(tmpdir(), "to-be-continued-test-"));
  for (const item of ["assets", "data", "docs", "layouts", "static", "hugo.toml"]) {
    cpSync(join(source, item), join(scratch.path, item), { recursive: true });
  }
});
after(() => scratch?.remove());

function build(baseURL) {
  execFileSync("hugo", ["--minify", "--cleanDestinationDir", "--baseURL", baseURL], { cwd: scratch.path, stdio: "pipe" });
  return readFileSync(join(scratch.path, "public", "index.html"), "utf8");
}

for (const path of ["/", "/a-lab/a-project/"]) {
  test(`all production assets and chapter links resolve under ${path}`, () => {
    const base = new URL(path, "https://pages.example.org");
    const html = build(base.href);
    assert.ok(html.includes(`data-base-path="${path}"`));
    assert.ok(html.includes("connect-src 'none'"));
    const published = readdirSync(join(scratch.path, "public"), { recursive: true });
    assert.deepEqual(published.filter(file => file.endsWith(".html")), ["index.html"]);
    assert.ok(!published.includes("docs"));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, "IDs, including every featured question, must be unique");
    const personas = JSON.parse(/<script[^>]+id="persona-data"[^>]*>(.*?)<\/script>/s.exec(html)[1]);
    for (const persona of personas.items) {
      if (persona.id === personas.default) continue;
      assert.ok(html.includes('value="' + persona.id + '"'));
      assert.ok(persona.illustration);
    }
    const assets = [...html.matchAll(/<(?:link|script|img|use)\b[^>]*?\s(?:src|href)="([^"]+)"/g)];
    assert.ok(assets.length > 0);
    for (const [, asset] of assets) {
      const url = new URL(asset.replaceAll("&amp;", "&"), base);
      assert.equal(url.origin, base.origin);
      assert.ok(url.pathname.startsWith(path), asset);
      const file = join(scratch.path, "public", url.pathname.slice(path.length));
      assert.ok(existsSync(file), file);
      if (url.hash) assert.ok(readFileSync(file, "utf8").includes(`id="${url.hash.slice(1)}"`), asset);
    }
    for (const [, id] of html.matchAll(/<a\b[^>]*\shref="#([^"]+)"/g)) assert.ok(ids.includes(id), id);
    const chapters = html.split(/<section id="chapter-/).slice(1);
    for (const chapter of chapters) assert.equal((chapter.match(/data-quick="/g) || []).length, 1);
    const fields = [...html.matchAll(/<(?:input|textarea)\b[^>]*\sdata-field="([^"]+)"/g)].map(match => match[1]);
    assert.ok(fields.length);
    for (const field of fields) {
      const controlId = field.replace(".", "-");
      assert.ok(ids.includes(controlId));
      assert.ok(html.includes(`for="${controlId}"`));
    }
  });
}

test("a changed question bank and grouping render without layout or application edits", () => {
  const data = {
    formatVersion: 7, documentTitle: "Field notes",
    project: { title: "Details", fields: [] },
    introduction: { title: "Welcome", paragraphs: [] },
    questions: { repeat: { text: "What would you repeat?" }, stop: { text: "Where would you stop?" } },
    chapters: [{ id: "new", number: "I", title: "In the field", subtitle: "New grouping", intro: "A new order.", accent: "olive", questions: ["stop", "repeat"] }],
  };
  const path = join(scratch.path, "data", "guide.yaml");
  const original = readFileSync(path);
  try {
    // JSON is valid YAML. This fixture deliberately has a different group count
    // and no illustrations, help, examples or references.
    writeFileSync(path, JSON.stringify(data));
    const html = build("https://pages.example.org/guide/");
    assert.ok(html.includes('data-format-version="7"'));
    assert.ok(html.includes('href="#chapter-new"'));
    assert.ok(html.includes("New grouping"));
    assert.ok(html.includes('data-quick="Where would you stop?"'));
    assert.deepEqual([...html.matchAll(/data-field="answer\.([^"]+)"/g)].map(match => match[1]), ["stop", "repeat"]);
  } finally {
    writeFileSync(path, original);
  }
});

test("developer documentation builds as a separate, standalone HTML site", () => {
  const dest = join(scratch.path, "developer-output");
  execFileSync("hugo", ["--source", "docs", "--destination", dest], { cwd: scratch.path, stdio: "pipe" });
  const html = readFileSync(join(dest, "index.html"), "utf8");
  assert.equal(html, readFileSync(join(source, "docs", "index.html"), "utf8"));
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${anchor}"`));
  assert.deepEqual(readdirSync(dest), ["index.html"]);
});
