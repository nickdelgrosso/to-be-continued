import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempDisposableSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { fromMarkdown, guideFromQuestionnaire, toMarkdown } from "../assets/js/markdown.mjs";

const source = fileURLToPath(new URL("../", import.meta.url));
let scratch;
before(() => {
  scratch = mkdtempDisposableSync(join(tmpdir(), "to-be-continued-test-"));
  for (const item of ["assets", "content", "data", "docs", "layouts", "static", "hugo.toml"]) {
    cpSync(join(source, item), join(scratch.path, item), { recursive: true });
  }
});
after(() => scratch?.remove());

function build(baseURL) {
  execFileSync("hugo", ["--minify", "--cleanDestinationDir", "--baseURL", baseURL], { cwd: scratch.path, stdio: "pipe" });
  return readFileSync(join(scratch.path, "public", "index.html"), "utf8");
}

function publicText(path) {
  return readFileSync(join(scratch.path, "public", path), "utf8");
}

for (const path of ["/", "/a-lab/a-project/"]) {
  test(`all production assets and chapter links resolve under ${path}`, () => {
    const base = new URL(path, "https://pages.example.org");
    const html = build(base.href);
    assert.ok(html.includes(`data-base-path="${path}"`));
    assert.ok(html.includes("connect-src 'none'"));
    const published = readdirSync(join(scratch.path, "public"), { recursive: true });
    assert.deepEqual(published.filter(file => file.endsWith(".html")).sort(), [join("about", "index.html"), "index.html", join("references", "index.html")]);
    const reading = readFileSync(join(scratch.path, "public", "references", "index.html"), "utf8");
    const about = readFileSync(join(scratch.path, "public", "about", "index.html"), "utf8");
    for (const page of [html, reading, about]) assert.ok(page.includes(`rel="describedby" type="text/plain" href="${path}llms.txt"`));
    const index = publicText("llms.txt");
    assert.ok(index.startsWith("# To Be Continued.\n\n> "));
    assert.ok(index.includes(`(${base.href}handover/guide.md)`));
    for (const [, href] of index.matchAll(/\]\(([^)]+)\)/g)) {
      const url = new URL(href);
      assert.equal(url.origin, base.origin);
      assert.ok(url.pathname.startsWith(path));
      const target = url.pathname.slice(path.length) + (url.pathname.endsWith("/") ? "index.html" : "");
      assert.ok(existsSync(join(scratch.path, "public", target)), href);
    }
    for (const page of [html, reading]) assert.ok(page.includes(`href="${path}about/"`));
    assert.ok(about.includes(`href="${path}#workspace"`));
    assert.ok(about.includes(`href="${path}references/"`));
    assert.ok(about.includes('href="https://personalhel.github.io/RSE-hackathon/"'));
    assert.ok(html.includes('href="' + path + 'references/"'));
    assert.ok(reading.includes('href="' + path + '#workspace"'));
    assert.ok(reading.includes("CC BY 4.0"));
    for (const [, id] of reading.matchAll(/href="#([^"]+)"/g)) assert.ok(reading.includes('id="' + id + '"'));
    for (const [, id] of html.matchAll(/references\/#([^"]+)"/g)) assert.ok(reading.includes('id="' + id + '"'));
    assert.ok(!published.includes("docs"));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, "IDs, including every featured question, must be unique");
    const personas = JSON.parse(/<script[^>]+id="persona-data"[^>]*>(.*?)<\/script>/s.exec(html)[1]);
    for (const persona of personas.items) {
      if (persona.id === personas.default) continue;
      assert.ok(html.includes('value="' + persona.id + '"'));
      assert.ok(persona.illustration);
    }
    const assets = [...(html + reading + about).matchAll(/<(?:link|script|img|use)\b[^>]*?\s(?:src|href)="([^"]+)"/g)];
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

test("the published agent guide produces files that round-trip through the form’s format", () => {
  build("https://pages.example.org/guide/");
  const instructions = publicText("handover/guide.md");
  const questionnaire = JSON.parse(publicText("handover/questionnaire.json"));
  const guide = guideFromQuestionnaire(questionnaire);
  const ids = guide.chapters.flatMap(chapter => chapter.questions.map(question => question.id));
  assert.deepEqual([...instructions.matchAll(/^- `([\w-]+)` \*\*/gm)].map(match => match[1]), ids);

  const sample = /~~~~markdown\n([\s\S]*?)^~~~~$/m.exec(instructions)[1];
  const imported = fromMarkdown(guide, sample);
  assert.ok(imported.size);
  assert.equal(toMarkdown(guide, imported), sample);

  // Follow the instructions an agent receives, including the published module.
  const work = join(scratch.path, "public", "handover");
  const answers = Object.fromEntries(ids.map(id => [`answer.${id}`, `Field note for ${id}\n\n---\n\n### An observation\n\nΔ`]));
  for (const field of guide.project) answers[`project.${field.id}`] = `Project detail for ${field.id}`;
  writeFileSync(join(work, "answers.json"), JSON.stringify(answers));
  const script = /```js\n([\s\S]*?)^```$/m.exec(instructions)[1];
  execFileSync(process.execPath, ["--input-type=module", "-"], { cwd: work, input: script });
  const result = readFileSync(join(work, "HANDOVER.md"), "utf8");
  assert.deepEqual(Object.fromEntries(fromMarkdown(guide, result)), answers);
});

test("a changed question bank and grouping render without layout or application edits", () => {
  const data = {
    formatVersion: 7, documentTitle: "Field notes",
    project: { title: "Details", fields: [] },
    introduction: { title: "Welcome", paragraphs: ["Leave a note about the next field season."] },
    questions: {
      repeat: { text: "What would you repeat?" },
      stop: { text: "Where would you stop?", help: "Name the checkpoint.", example: "First inspect the plot.\n\n---\n\n### Decision\n\nStop at dusk." },
    },
    chapters: [{ id: "new", number: "I", title: "In the field", subtitle: "New grouping", intro: "A new order.", accent: "olive", questions: ["stop", "repeat"] }],
  };
  const path = join(scratch.path, "data", "guide.yaml");
  const original = readFileSync(path);
  try {
    // JSON is valid YAML. This fixture deliberately has a different group count
    // and mixes a multiline example with a prompt that has no optional fields.
    writeFileSync(path, JSON.stringify(data));
    const html = build("https://pages.example.org/guide/");
    assert.ok(html.includes('data-format-version="7"'));
    assert.ok(html.includes('href="#chapter-new"'));
    assert.ok(html.includes("New grouping"));
    assert.ok(html.includes('data-quick="Where would you stop?"'));
    assert.deepEqual([...html.matchAll(/data-field="answer\.([^"]+)"/g)].map(match => match[1]), ["stop", "repeat"]);
    assert.deepEqual(JSON.parse(publicText("handover/questionnaire.json")), data);
    const instructions = publicText("handover/guide.md");
    assert.ok(publicText("llms.txt").includes(data.introduction.paragraphs[0]));
    assert.ok(instructions.includes(data.questions.stop.help));
    assert.ok(instructions.includes("Speedrun: Where would you stop?"));
    assert.ok(instructions.includes("**What would you repeat?**"));
    assert.ok(!instructions.includes("`purpose`"));
    const example = /~~~~markdown\n([\s\S]*?)^~~~~$/m.exec(instructions)[1];
    assert.match(example, /handover_version: 7/);
    assert.match(example, /## New grouping\n\n### Where would you stop\?/);
    const model = guideFromQuestionnaire(data);
    const answers = fromMarkdown(model, example);
    assert.deepEqual([...answers.keys()], ["answer.stop"]);
    assert.ok(answers.get("answer.stop").includes("Stop at dusk."));
    assert.equal(toMarkdown(model, answers), example);
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
