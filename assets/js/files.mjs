export function showRawText(element, markdown) {
  element.textContent = markdown;
}

export async function copyMarkdown(markdown, clipboard = navigator.clipboard) {
  await clipboard.writeText(markdown);
}

export function downloadMarkdown(markdown, doc = document, urls = URL) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = urls.createObjectURL(blob);
  const link = doc.createElement("a");
  try {
    link.href = url;
    link.download = "HANDOVER.md";
    doc.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => urls.revokeObjectURL(url), 1000);
  }
}
