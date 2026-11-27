import { chapterApplies, coverage } from "./scope.mjs";
import { preference } from "./preferences.mjs";

export function setupWriting({ form, contents, messages, onVisibilityChange, markCurrent }) {
  const byId = id => document.getElementById(id);
  const route = byId("route");
  const chapters = [...form.querySelectorAll("[data-chapter]")];
  const personaSelect = byId("persona");
  const personas = JSON.parse(byId("persona-data").textContent);
  const personaPref = preference("persona");
  let persona;
  function applyPersona() {
    persona = personas.items.find(item => item.id === personaSelect.value);
    document.documentElement.dataset.persona = persona.id;
    const tagline = document.querySelector(".tagline");
    tagline.textContent = persona.tagline || tagline.dataset.default;
    document.querySelector(".cover-art").src = personaSelect.selectedOptions[0].dataset.art;
    for (const section of chapters) {
      const id = section.dataset.chapter;
      const heading = byId("title-" + id);
      heading.textContent = persona.chapters?.[id] || heading.dataset.default;
      document.querySelector('[data-chapter-name="' + id + '"]').textContent = heading.textContent;
    }
  }
  const preferred = personaPref.read();
  if (personas.items.some(item => item.id === preferred)) personaSelect.value = preferred;
  applyPersona();
  personaSelect.addEventListener("change", () => { personaPref.write(personaSelect.value); applyPersona(); applyRoute(); });
  const scope = new Map([...document.querySelectorAll("[data-scope]")].map(select => [select.dataset.scope, select]));
  for (const [id, select] of scope) {
    const pref = preference("scope." + id);
    select.value = pref.read() || "unsure";
    select.addEventListener("change", () => { pref.write(select.value); applyRoute(); });
  }
  function resetScope() {
    for (const [id, select] of scope) {
      select.value = "unsure";
      preference("scope." + id).write(select.value);
    }
  }
  function applyRoute() {
    const applicable = [];
    const quick = route.value === "quick";
    form.classList.toggle("speedrun", quick);
    for (const section of chapters) {
      const questions = [...section.querySelectorAll(".question")];
      const fields = questions.map(question => ({ tags: question.dataset.tags.split(" "), value: question.querySelector("textarea").value }));
      const included = chapterApplies(scope.get(section.dataset.chapter)?.value, fields);
      if (included) applicable.push(...fields);
      for (const question of questions) {
        question.hidden = quick && !question.dataset.quick;
        const label = question.querySelector("label");
        const id = question.querySelector("textarea").dataset.field.slice("answer.".length);
        const wording = quick && question.dataset.quick ? (persona.quick?.[id] || question.dataset.quick) : (persona.prompts?.[id] || label.dataset.prompt);
        if (label.textContent !== wording) label.textContent = wording;
      }
      section.hidden = !included || questions.every(question => question.hidden);
      contents.querySelector('a[href="#' + section.id + '"]').hidden = section.hidden;
    }
    for (const output of document.querySelectorAll("[data-coverage]")) {
      const { done, total, percent } = coverage(applicable, output.dataset.coverage);
      output.textContent = total ? messages.fraction.replace("{done}", done).replace("{total}", total).replace("{percent}", percent) : messages.noneApplicable;
    }
    markCurrent();
  }
  route.addEventListener("change", () => { applyRoute(); onVisibilityChange(); });
  byId("route-picker").hidden = !form.querySelector("[data-quick]");
  applyRoute();
  return { refresh: applyRoute, resetScope };
}
