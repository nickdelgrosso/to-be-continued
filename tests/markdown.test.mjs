import assert from "node:assert/strict";
import test from "node:test";
import { fromMarkdown, toMarkdown } from "../assets/js/markdown.mjs";

const guide = {
  version: 1,
  title: "Research Code Handover",
  project: [{ id: "title", label: "Project" }, { id: "author", label: "Contributor" }],
  chapters: [
    { subtitle: "Research context", questions: [{ id: "aim", text: "Why does it exist?" }, { id: "people", text: "Who uses it?" }] },
    { subtitle: "Everyday use", questions: [{ id: "workflow", text: "Where do you start?" }] },
  ],
};
const empty = new Map();
const one = new Map([["answer.aim", "I don't know yet."]]);

test("empty export is a versioned, standalone document with a final newline", () => {
  assert.equal(toMarkdown(guide, empty), '---\nhandover_version: 1\nquestion_order: []\n---\n\n# Research Code Handover\n');
  assert.deepEqual(fromMarkdown(guide, toMarkdown(guide, empty)), empty);
});

test("only written responses, descriptive sections and supplied metadata appear", () => {
  const values = new Map([...one, ["project.author", "A. Field"], ["answer.people", "  \n\t"]]);
  const output = toMarkdown(guide, values);
  assert.match(output, /Contributor: A\. Field\n/);
  assert.match(output, /## Research context\n\n### Why does it exist\?\n\nI don't know yet\.\n$/);
  for (const omitted of ["Everyday use", "Who uses it?", "Project:"]) assert.ok(!output.includes(omitted));
});

test("metadata alone round-trips, including punctuation, Unicode and spaces", () => {
  const values = new Map([["project.author", "  Zoë: Δ  "], ["project.title", "Plots < 3 & plots > 8"]]);
  assert.deepEqual(fromMarkdown(guide, toMarkdown(guide, values)), values);
});

test("Markdown, code, prompt-like headings, indentation and trailing whitespace survive a round trip", () => {
  const notes = [
    "    An indented start  ", "", "**Keep this**: 同じ観測", "", "```py",
    "    readings = [2, 5]  ", "```", "", "---", "", "### Who uses it?", "",
    "(my own heading)", "", "----", "", "## Everyday use", "", "### Where do you start?", "",
    "    more code", "\tAn indented ending  ", "",
  ].join("\n");
  const values = new Map([["answer.aim", notes], ["answer.people", "\n  The field team.\n\n"], ["answer.workflow", "  Last note.  "]]);
  const output = toMarkdown(guide, values);
  assert.ok(output.includes(notes));
  assert.deepEqual(fromMarkdown(guide, output), values);
  assert.deepEqual(fromMarkdown(guide, "\uFEFF" + output.replaceAll("\n", "\r\n")), values);
});

test("export is deterministic in guide order, independent of time and edit order", () => {
  const a = new Map([...one, ["answer.workflow", "Start small."], ["project.title", "Counts"]]);
  const b = new Map([...a].reverse());
  assert.equal(toMarkdown(guide, a), toMarkdown(guide, b));
  assert.equal(toMarkdown(guide, fromMarkdown(guide, toMarkdown(guide, a))), toMarkdown(guide, a));
});

test("uploaded answers follow IDs through a regroup, reorder and wording change", () => {
  const revised = {
    ...guide,
    chapters: [
      { subtitle: "In practice", questions: [{ id: "workflow", text: "Your first step?" }, { id: "aim", text: "What is the research aim?" }] },
    ],
  };
  const values = new Map([...one, ["answer.workflow", "Use the small notebook."]]);
  const opened = fromMarkdown(revised, toMarkdown(guide, values));
  assert.deepEqual(opened, values);
  const output = toMarkdown(revised, opened);
  assert.match(output, /## In practice\n\n### Your first step\?/);
  assert.ok(!output.includes("Research context"));
});

test("ordinary hand edits to an answer are read from the Markdown body", () => {
  const output = toMarkdown(guide, one).replace("I don't know yet.", "Now we know.\n\nSee `notes.md`.");
  assert.equal(fromMarkdown(guide, output).get("answer.aim"), "Now we know.\n\nSee `notes.md`.");
});

test("unversioned, incompatible, unknown and malformed files fail before returning a draft", () => {
  const good = toMarkdown(guide, one);
  const cases = [
    ["# A different document", "unversioned"],
    [good.replace("handover_version: 1", "handover_version: 2"), "version"],
    [good.replace('"aim"', '"retired"'), "unknown"],
    [good.replace('["aim"]', "oops"), "invalid"],
    [good.replace('["aim"]', '["aim","aim"]'), "invalid"],
    [good.replace('["aim"]', "[]"), "invalid"],
    [good.replace("### Why does it exist?", "Missing heading"), "invalid"],
  ];
  for (const [file, code] of cases) assert.throws(() => fromMarkdown(guide, file), { code });
});
