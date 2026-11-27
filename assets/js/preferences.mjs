// Preferences are scoped to this installation and stored separately from the draft.
export function preference(name, basePath = document.body.dataset.basePath) {
  const key = "to-be-continued:preferences:" + encodeURIComponent(basePath) + ":" + name;
  return {
    read() { try { return localStorage.getItem(key); } catch { return null; } },
    write(value) { try { localStorage.setItem(key, value); } catch { /* Keep the current selection in memory. */ } },
  };
}
