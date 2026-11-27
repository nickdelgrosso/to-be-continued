import { Marked } from "../vendor/marked.mjs";
import DOMPurify from "../vendor/purify.mjs";

function escapeText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const parser = new Marked({ gfm: true, renderer: {
  html(token) { return escapeText(token.text); },
  image(token) { return escapeText(token.text); },
  link(token) {
    const content = this.parser.parseInline(token.tokens);
    if (!/^(https?:\/\/|mailto:)/i.test(token.href)) return content;
    return '<a href="' + escapeText(token.href) + '">' + content + "</a>";
  },
} });

export function previewHTML(markdown) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n\n/, "");
  return parser.parse(body);
}

export function renderDocument(element, markdown) {
  const fragment = DOMPurify.sanitize(previewHTML(markdown), {
    RETURN_DOM_FRAGMENT: true,
    ALLOWED_TAGS: ["p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "li", "input", "pre", "code", "em", "strong", "del", "a", "table", "thead", "tbody", "tr", "td", "th"],
    ALLOWED_ATTR: ["href", "type", "disabled", "checked", "start", "align"],
    ALLOW_DATA_ATTR: false,
  });
  for (const link of fragment.querySelectorAll("a")) {
    link.rel = "noreferrer noopener";
    link.target = "_blank";
  }
  element.replaceChildren(fragment);
}
