import { DraftStore } from "./draft.mjs";
import { copyMarkdown, downloadMarkdown, showRawText } from "./files.mjs";
import { fromMarkdown, ImportError, toMarkdown } from "./markdown.mjs";

const byId = id => document.getElementById(id);
const form = byId("handover");
const messages = JSON.parse(byId("messages").textContent);
const controls = new Map([...form.querySelectorAll("[data-field]")].map(field => [field.dataset.field, field]));
const guide = {
  version: Number(form.dataset.formatVersion),
  title: form.dataset.documentTitle,
  project: [...form.querySelectorAll("[data-export-label]")].map(field => ({
    id: field.dataset.field.slice("project.".length),
    label: field.dataset.exportLabel,
  })),
  chapters: [...form.querySelectorAll("[data-chapter]")].map(section => ({
    subtitle: section.querySelector(".chapter-subtitle").textContent,
    questions: [...section.querySelectorAll("textarea")].map(field => ({
      id: field.dataset.field.slice("answer.".length),
      text: field.labels[0].textContent,
    })),
  })),
};
const store = new DraftStore(() => window.localStorage, document.body.dataset.basePath);
const edits = new Map();
let replacementPending = false;
let storedFields = 0;
let toastTimer;

function valuesOnPage() {
  const values = new Map();
  for (const [key, field] of controls) {
    if (field.value !== "") values.set(key, field.value);
  }
  return values;
}

function markdown() {
  return toMarkdown(guide, valuesOnPage());
}

function announce(message) {
  clearTimeout(toastTimer);
  byId("feedback").textContent = message;
  toastTimer = setTimeout(() => { byId("feedback").textContent = ""; }, 6500);
}

function storageStatus(state) {
  const status = byId("save-state");
  if (state === "unavailable" && byId("state-dot").dataset.state !== state) announce(messages.storageHelp);
  if (status.textContent !== messages[state]) status.textContent = messages[state];
  byId("state-dot").dataset.state = state;
  byId("storage-warning").hidden = state !== "unavailable";
}

function updateCount() {
  let count = 0;
  for (const [key, field] of controls) {
    if (key.startsWith("answer.") && field.value.trim()) count++;
  }
  byId("response-count").textContent = count === 0 ? messages.zero :
    count === 1 ? messages.one : messages.many.replace("{count}", count);
}

const needsResize = !CSS.supports("field-sizing", "content");
function resizeField(field) {
  if (!needsResize || field.tagName !== "TEXTAREA" || field.offsetHeight === 0) return;
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
}

function fill(values) {
  for (const [key, field] of controls) {
    const value = values.get(key) ?? "";
    if (field.value !== value) {
      field.value = value;
      resizeField(field);
    }
  }
  updateCount();
  if (!byId("preview-view").hidden) showRawText(byId("markdown"), markdown());
}

function restore() {
  try {
    const saved = store.read();
    storedFields = saved.size;
    fill(saved);
    storageStatus(saved.size ? "saved" : "local");
  } catch {
    storageStatus("unavailable");
  }
}

function persist() {
  try {
    let saved;
    if (replacementPending) {
      saved = valuesOnPage();
      store.replace(saved);
    } else {
      saved = store.update(edits);
    }
    storedFields = saved.size;
    edits.clear();
    replacementPending = false;
    fill(saved);
    storageStatus(saved.size ? "saved" : "local");
    return true;
  } catch {
    storageStatus("unavailable");
    return false;
  }
}

function replaceDraft(values) {
  edits.clear();
  replacementPending = true;
  fill(values);
  return persist();
}

form.addEventListener("submit", event => event.preventDefault());
form.addEventListener("input", event => {
  const field = event.target;
  if (!field.dataset.field) return;
  edits.set(field.dataset.field, field.value);
  resizeField(field);
  if (!persist()) updateCount();
});
window.addEventListener("storage", event => {
  if (event.key !== null && event.key !== store.key) return;
  if (replacementPending || edits.size) persist();
  else restore();
});

// Both views share the same form. Returning to Write restores the reading position.
const writeTab = byId("write-tab");
const previewTab = byId("preview-tab");
const contents = byId("contents-list");
const compact = matchMedia("(max-width: 45rem)");
let writePosition = 0;
function changeView(preview, restorePosition = true) {
  const write = byId("write-view");
  if (write.hidden === preview) return;
  if (preview) writePosition = window.scrollY;
  write.hidden = preview;
  byId("preview-view").hidden = !preview;
  for (const tab of [writeTab, previewTab]) {
    const active = (tab === previewTab) === preview;
    tab.tabIndex = active ? 0 : -1;
    tab.setAttribute("aria-selected", String(active));
  }
  if (preview) {
    showRawText(byId("markdown"), markdown());
    byId("workspace").scrollIntoView({ block: "start" });
  } else {
    if (needsResize) controls.forEach(resizeField);
    if (restorePosition) window.scrollTo(0, writePosition);
  }
  markCurrent();
}
for (const tab of [writeTab, previewTab]) {
  tab.addEventListener("click", () => changeView(tab === previewTab));
  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let next = tab === writeTab ? previewTab : writeTab;
    if (event.key === "Home") next = writeTab;
    if (event.key === "End") next = previewTab;
    next.focus();
    changeView(next === previewTab);
  });
}

const links = [...contents.querySelectorAll("nav a")];
const targets = links.map(link => byId(link.hash.slice(1)));
function markCurrent() {
  const top = document.querySelector(".toolbar").getBoundingClientRect().bottom + 40;
  let current = targets[0];
  for (const section of targets) {
    if (section.getBoundingClientRect().top > top) break;
    current = section;
  }
  for (const [index, link] of links.entries()) {
    if (targets[index] === current && !byId("write-view").hidden) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
let scrollFrame = 0;
window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { markCurrent(); scrollFrame = 0; });
}, { passive: true });
function fitContents() { contents.open = !compact.matches; }
compact.addEventListener("change", fitContents);
fitContents();
for (const link of links) {
  link.addEventListener("click", () => {
    changeView(false, false);
    if (compact.matches) contents.open = false;
  });
}
window.addEventListener("hashchange", () => {
  const target = byId(location.hash.slice(1));
  if (targets.includes(target) && byId("write-view").hidden) {
    changeView(false, false);
    target.scrollIntoView();
  }
});
if (needsResize) window.addEventListener("resize", () => controls.forEach(resizeField));

const exportDialog = byId("export-dialog");
const clearDialog = byId("clear-dialog");
const uploadDialog = byId("upload-dialog");
const replaceDialog = byId("replace-dialog");
const fileInput = byId("upload-file");
let pendingImport;
let readNumber = 0;

function openUpload() {
  byId("upload-error").textContent = "";
  if (!uploadDialog.open) uploadDialog.showModal();
}
function openImported(values) {
  const saved = replaceDraft(values);
  changeView(false, false);
  byId("project").focus();
  byId("project").scrollIntoView();
  announce(saved ? messages.imported : messages.importedUnsaved);
}
async function readFiles(files) {
  const attempt = ++readNumber;
  openUpload();
  const error = byId("upload-error");
  if (files.length !== 1) {
    error.textContent = messages.oneFile;
    return;
  }
  const file = files[0];
  try {
    const values = fromMarkdown(guide, await file.text());
    if (attempt !== readNumber || !uploadDialog.open) return;
    uploadDialog.close();
    if (valuesOnPage().size || storedFields || byId("state-dot").dataset.state === "unavailable") {
      pendingImport = values;
      byId("import-name").textContent = file.name;
      replaceDialog.showModal();
    } else {
      openImported(values);
    }
  } catch (failure) {
    if (attempt !== readNumber || !uploadDialog.open) return;
    error.textContent = failure instanceof ImportError ?
      messages[failure.code].replace("{expected}", guide.version).replace("{found}", () => failure.detail) : messages.readFailed;
  }
}
byId("choose-file").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) readFiles([...fileInput.files]);
  fileInput.value = "";
});
byId("confirm-replace").addEventListener("click", () => {
  const values = pendingImport;
  replaceDialog.close();
  openImported(values);
});
replaceDialog.addEventListener("close", () => { pendingImport = undefined; });
uploadDialog.addEventListener("close", () => { if (!uploadDialog.open) readNumber++; });

let dragDepth = 0;
function resetDrag() {
  dragDepth = 0;
  byId("drop-overlay").hidden = true;
  document.body.classList.remove("dragging");
}
function hasFiles(event) { return [...event.dataTransfer.types].includes("Files"); }
function acceptsDrop() { return !document.querySelector("dialog[open]") || uploadDialog.open; }
document.addEventListener("dragenter", event => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  if (!acceptsDrop()) return;
  dragDepth++;
  byId("drop-overlay").hidden = uploadDialog.open;
  document.body.classList.add("dragging");
});
document.addEventListener("dragover", event => {
  if (hasFiles(event)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = acceptsDrop() ? "copy" : "none";
  }
});
document.addEventListener("dragleave", event => {
  if (hasFiles(event) && --dragDepth <= 0) resetDrag();
});
document.addEventListener("drop", event => {
  if (!hasFiles(event)) return;
  event.preventDefault();
  resetDrag();
  if (acceptsDrop()) readFiles([...event.dataTransfer.files]);
});
window.addEventListener("blur", resetDrag);

async function copy() {
  try {
    await copyMarkdown(markdown());
    announce(messages.copied);
  } catch {
    changeView(true);
    const raw = byId("markdown");
    raw.focus();
    const range = document.createRange();
    range.selectNodeContents(raw);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    announce(messages.copyManually);
  }
}
for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", () => {
    switch (button.dataset.action) {
      case "export":
        byId("export-message").textContent = "";
        exportDialog.showModal();
        break;
      case "clear": clearDialog.showModal(); break;
      case "upload": openUpload(); break;
      case "copy": copy(); break;
    }
  });
}
for (const button of document.querySelectorAll("[data-close]")) {
  button.addEventListener("click", () => button.closest("dialog").close());
}
byId("download").addEventListener("click", () => {
  try {
    downloadMarkdown(markdown());
    exportDialog.close();
    announce(messages.downloaded);
  } catch {
    byId("export-message").textContent = messages.downloadFailed;
  }
});
byId("confirm-clear").addEventListener("click", () => {
  const saved = replaceDraft(new Map());
  clearDialog.close();
  announce(saved ? messages.cleared : messages.clearFailed);
});

restore();
for (const field of controls.values()) field.readOnly = false;
for (const button of document.querySelectorAll("[data-js]")) button.disabled = false;
markCurrent();
