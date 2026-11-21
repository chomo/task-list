import { state, ui } from "./state.js";
import { loadState } from "./storage.js";
import { initSound, sCursor } from "./sound.js";
import {
  $, applySettings, tickClock, renderMenu, renderQuests, updateHeader,
  toggleMenu, syncMenuCollapse, reducedMotion,
} from "./ui.js";
import { bindImport } from "./screens.js";
import { bindInput } from "./input.js";

const loaded = loadState(localStorage);
state.tasks = loaded.tasks;
Object.assign(state.settings, loaded.settings);
initSound(state.settings);
applySettings();
tickClock();
setInterval(tickClock, 20000);
ui.calCursor = null;

const menuToggleBtn = $("menuToggle");
if (menuToggleBtn) menuToggleBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
window.addEventListener("resize", syncMenuCollapse);

const fabAddBtn = $("fabAdd");
if (fabAddBtn) fabAddBtn.addEventListener("click", () => {
  ui.quickOpen = !ui.quickOpen;
  sCursor();
  renderQuests(false);
  if (ui.quickOpen) { const qi = $("quickTitle"); if (qi) qi.focus(); }
});
const fabSearchBtn = $("fabSearch");
if (fabSearchBtn) fabSearchBtn.addEventListener("click", () => {
  ui.searchOpen = !ui.searchOpen;
  sCursor();
  renderQuests(false);
  if (ui.searchOpen) { const si = $("searchBox"); if (si) si.focus(); }
});

bindImport();
bindInput();
renderMenu(true);
renderQuests(false);
updateHeader();
setTimeout(() => { $("menu").classList.remove("locked"); }, reducedMotion() ? 60 : 620);
