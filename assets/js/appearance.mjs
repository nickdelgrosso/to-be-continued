import { preference } from "./preferences.mjs";

export function setupAppearance() {
  const select = document.getElementById("colour-mode");
  const saved = preference("colour-mode");
  const system = matchMedia("(prefers-color-scheme: dark)");
  const initial = saved.read();
  if ([...select.options].some(option => option.value === initial)) select.value = initial;
  function apply() {
    document.documentElement.dataset.theme = select.value === "system" ? (system.matches ? "dark" : "light") : select.value;
  }
  select.disabled = false;
  select.addEventListener("change", () => { saved.write(select.value); apply(); });
  system.addEventListener("change", apply);
  apply();
}
