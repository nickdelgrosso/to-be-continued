import { setupAppearance } from "./appearance.mjs";
import { preference } from "./preferences.mjs";

setupAppearance();
const persona = preference("persona").read();
if (persona) document.documentElement.dataset.persona = persona;
