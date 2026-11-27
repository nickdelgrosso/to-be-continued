import assert from "node:assert/strict";
import test from "node:test";
import { DraftStore } from "../assets/js/draft.mjs";

function memoryStorage() {
  const items = new Map();
  return {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
}

test("a new session restores exact text and adds edits without dropping retired fields", () => {
  const storage = memoryStorage();
  const first = new DraftStore(() => storage, "/guide/");
  const notes = new Map([["answer.aim", "  I am unsure.\n\n"], ["answer.retired", "Keep this for later."]]);
  first.replace(notes);
  const reopened = new DraftStore(() => storage, "/guide/");
  assert.deepEqual(reopened.read(), notes);
  reopened.update(new Map([["project.title", "Survey"]]));
  first.update(new Map([["answer.aim", ""]]));
  assert.deepEqual(reopened.read(), new Map([["project.title", "Survey"], ["answer.retired", "Keep this for later."]]));
});

test("clear and replacement affect only this installation, including when sharing an origin", () => {
  const storage = memoryStorage();
  const root = new DraftStore(() => storage, "/");
  const nested = new DraftStore(() => storage, "/two/guide/");
  const draft = new Map([["answer.aim", "notes"]]);
  root.replace(draft);
  nested.replace(draft);
  nested.replace(new Map([["project.title", "Different"]]));
  assert.deepEqual(nested.read(), new Map([["project.title", "Different"]]));
  nested.replace(new Map());
  assert.equal(nested.read().size, 0);
  assert.deepEqual(root.read(), draft);
});

test("blocked access, read errors and quota failures propagate without reporting a save", () => {
  const denied = () => { throw new Error("blocked"); };
  assert.throws(() => new DraftStore(denied, "/").read(), /blocked/);
  const storage = memoryStorage();
  const store = new DraftStore(() => storage, "/");
  const original = new Map([["answer.aim", "original"]]);
  store.replace(original);
  storage.setItem = denied;
  assert.throws(() => store.update(new Map([["answer.aim", "in memory"]])), /blocked/);
  assert.deepEqual(store.read(), original);
  storage.removeItem = denied;
  assert.throws(() => store.replace(new Map()), /blocked/);
  storage.getItem = denied;
  assert.throws(() => store.read(), /blocked/);
});

test("an unreadable saved draft is preserved until an explicit replacement", () => {
  const storage = memoryStorage();
  const store = new DraftStore(() => storage, "/");
  for (const invalid of ["{", "null", "[]", '{"answer.aim":5}']) {
    storage.setItem(store.key, invalid);
    assert.throws(() => store.update(new Map([["answer.aim", "fresh"]])));
    assert.equal(storage.getItem(store.key), invalid);
  }
});
