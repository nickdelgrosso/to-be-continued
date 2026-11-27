// The header carries only what cannot be recovered from the prose after regrouping.
// JSON flow sequences are also valid YAML, so the file needs no YAML runtime.
export function toMarkdown(guide, values) {
  const records = [];
  const order = [];
  const usedDividers = new Set();
  for (const chapter of guide.chapters) {
    let first = true;
    for (const question of chapter.questions) {
      const answer = values.get(`answer.${question.id}`) ?? "";
      if (!answer.trim()) continue;
      const heading = first ? `## ${chapter.subtitle}\n\n` : "";
      records.push(`${heading}### ${question.text}\n\n${answer}`);
      order.push(question.id);
      for (const line of answer.matchAll(/^-{3,}$/gm)) usedDividers.add(line[0]);
      first = false;
    }
  }

  let divider = "---";
  while (usedDividers.has(divider)) divider += "-";
  const header = `---\nhandover_version: ${guide.version}\nquestion_order: ${JSON.stringify(order)}\n---`;
  const intro = [header, `# ${guide.title}`];
  for (const field of guide.project) {
    const value = values.get(`project.${field.id}`) ?? "";
    if (value.trim()) intro.push(`${field.label}: ${value}`);
  }
  return [intro.join("\n\n"), ...records].join(`\n\n${divider}\n\n`) + "\n";
}

export class ImportError extends Error {
  constructor(code, detail = "") {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

export function fromMarkdown(guide, source) {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const header = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const version = header && /^handover_version:[ \t]*([^\n]+)$/m.exec(header[1]);
  if (!version) throw new ImportError("unversioned");
  if (version[1].trim() !== String(guide.version)) throw new ImportError("version", version[1].trim());

  const sequence = /^question_order:[ \t]*(\[[^\n]*\])[ \t]*$/m.exec(header[1]);
  let order;
  try {
    order = JSON.parse(sequence?.[1]);
  } catch {
    throw new ImportError("invalid");
  }
  if (!Array.isArray(order) || order.some(id => typeof id !== "string") || new Set(order).size !== order.length) {
    throw new ImportError("invalid");
  }
  const known = new Set(guide.chapters.flatMap(chapter => chapter.questions.map(question => question.id)));
  if (order.some(id => !known.has(id))) throw new ImportError("unknown");

  const body = text.slice(header[0].length).replace(/^\n/, "").replace(/\n$/, "");
  // Split only at a thematic break followed by a guide heading. Researchers can
  // freely use headings, code blocks and horizontal rules within their answers.
  const heading = "(?:## [^\\n]+\\n\\n)?### [^\\n]+\\n\\n";
  const firstBreak = new RegExp(`\\n\\n(-{3,})\\n\\n(?=${heading})`).exec(body);
  const parts = firstBreak ? body.split(new RegExp(`\\n\\n${firstBreak[1]}\\n\\n(?=${heading})`, "g")) : [body];
  if (parts.length !== order.length + 1) throw new ImportError("invalid");

  const values = new Map();
  const [title, ...metadata] = parts[0].split("\n\n");
  if (!/^# [^\n]+$/.test(title)) throw new ImportError("invalid");
  for (const line of metadata) {
    const field = guide.project.find(item => line.startsWith(`${item.label}: `));
    if (!field) throw new ImportError("unknown");
    const key = `project.${field.id}`;
    if (values.has(key) || line.includes("\n")) throw new ImportError("invalid");
    values.set(key, line.slice(field.label.length + 2));
  }
  const prompt = new RegExp(`^${heading}`);
  for (const [index, id] of order.entries()) {
    values.set(`answer.${id}`, parts[index + 1].replace(prompt, ""));
  }
  return values;
}
