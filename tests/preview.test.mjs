import assert from "node:assert/strict";
import { test } from "node:test";
import { previewHTML } from "../assets/js/preview.mjs";

test("rendered Markdown hides interchange metadata and supports tables and tasks", () => {
  const html = previewHTML("---\nhandover_version: 1\nquestion_order: []\n---\n\n# Report\n\n| x |\n|---|\n| y |\n\n- [x] checked");
  assert.match(html, /<h1>Report/); assert.match(html, /<table>/); assert.match(html, /checkbox/);
  assert.doesNotMatch(html, /handover_version/);
});

test("draft image URLs and raw markup are inert before DOM parsing", () => {
  const html = previewHTML("![map](/notes/private-image)\n\n<img src=/notes/raw>\n\n[paper](https://example.org/paper)");
  assert.doesNotMatch(html, /<img|private-image/i); assert.match(html, /&lt;img/);
  assert.match(html, /<a href="https:\/\/example.org\/paper">paper<\/a>/);
});
