import assert from "node:assert/strict";
import { test } from "node:test";
import { chapterApplies, coverage } from "../assets/js/scope.mjs";

test("a chapter with a note remains applicable even after opting out", () => {
  assert.equal(chapterApplies("omit", [{ value: " " }]), false);
  assert.equal(chapterApplies("omit", [{ value: "ask Jo" }]), true);
  assert.equal(chapterApplies("unsure", []), true);
});

test("each overlapping topic counts applicable questions including unanswered ones", () => {
  const fields = [{ tags: ["personal", "technical"], value: "Ali" }, { tags: ["technical"], value: " " }];
  assert.deepEqual(coverage(fields, "technical"), { done: 1, total: 2, percent: 50 });
  assert.equal(coverage(fields, "personal").percent, 100);
  assert.equal(coverage(fields, "ethical").percent, null);
});
