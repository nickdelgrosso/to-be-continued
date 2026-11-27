// One atomic write per edit or file import. Patch only edited fields so drafts
// survive reordering and temporarily removing questions from the guide.
export class DraftStore {
  constructor(getStorage, basePath) {
    this.getStorage = getStorage;
    this.key = `to-be-continued:handover:storage-v1:${encodeURIComponent(basePath)}`;
  }

  read() {
    const raw = this.getStorage().getItem(this.key);
    if (raw === null) return new Map();
    const record = JSON.parse(raw);
    if (!record || typeof record !== "object" || Array.isArray(record) ||
        Object.values(record).some(value => typeof value !== "string")) {
      throw new Error("Invalid local draft");
    }
    return new Map(Object.entries(record));
  }

  update(changes) {
    const values = this.read();
    for (const [key, value] of changes) {
      if (value === "") values.delete(key);
      else values.set(key, value);
    }
    this.replace(values);
    return values;
  }

  replace(values) {
    if (values.size) this.getStorage().setItem(this.key, JSON.stringify(Object.fromEntries(values)));
    else this.getStorage().removeItem(this.key);
  }
}
