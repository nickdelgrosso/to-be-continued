export function chapterApplies(choice, fields) {
  return choice !== "omit" || fields.some(field => field.value.trim());
}

export function coverage(fields, tag) {
  const applicable = fields.filter(field => field.tags.includes(tag));
  const done = applicable.filter(field => field.value.trim()).length;
  const total = applicable.length;
  return { done, total, percent: total ? Math.round(100 * done / total) : null };
}
