import assert from "node:assert/strict";
import test from "node:test";
import { copyMarkdown, downloadMarkdown, showRawText } from "../assets/js/files.mjs";

const text = "# Handover\n\n<b>Field notes & specimens</b>\n\n    Δ\n";

test("preview treats markup as literal text", () => {
  const target = { set innerHTML(_) { assert.fail("preview parsed HTML"); } };
  showRawText(target, text);
  assert.equal(target.textContent, text);
});

test("copy writes the exact Markdown and signals clipboard denial to the interface", async () => {
  let copied;
  await copyMarkdown(text, { writeText: async value => { copied = value; } });
  assert.equal(copied, text);
  await assert.rejects(copyMarkdown(text, { writeText: () => Promise.reject(new Error("denied")) }), /denied/);
});

test("download uses the named UTF-8 file and releases its temporary URL", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let file;
  let revoked;
  let clicked = false;
  let removed = false;
  const link = { click() { clicked = true; }, remove() { removed = true; } };
  const doc = {
    createElement: tag => { assert.equal(tag, "a"); return link; },
    body: { append: node => assert.equal(node, link) },
  };
  const urls = {
    createObjectURL(blob) { file = blob; return "blob:local"; },
    revokeObjectURL(url) { revoked = url; },
  };
  downloadMarkdown(text, doc, urls);
  assert.ok(clicked && removed);
  assert.equal(link.download, "HANDOVER.md");
  assert.equal(link.href, "blob:local");
  assert.equal(file.type, "text/markdown;charset=utf-8");
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new TextEncoder().encode(text));
  t.mock.timers.runAll();
  assert.equal(revoked, "blob:local");
});
