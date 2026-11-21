import { THEMES } from "./config.js";
import { normalizeTheme, themeAccent } from "./domain.js";

export { themeAccent as accentRGB };

export function applyTheme(classList, theme) {
  const id = normalizeTheme(theme);
  THEMES.forEach((t) => classList.toggle("theme-" + t.id, t.id === id));
  return id;
}
