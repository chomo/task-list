import { state, ui } from "./state.js";
import { loadState } from "./storage.js";
import { initSound, sCursor } from "./sound.js";
import {
  $, applySettings, tickClock, renderMenu, renderQuests, updateHeader,
  toggleMenu, syncMenuCollapse, reducedMotion, toggleQuickPanel, toggleSearchPanel,
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
  sCursor();
  toggleQuickPanel();
});
const fabSearchBtn = $("fabSearch");
if (fabSearchBtn) fabSearchBtn.addEventListener("click", () => {
  sCursor();
  toggleSearchPanel(true);
});

bindImport();
bindInput();
renderMenu(true);
renderQuests(false);
updateHeader();
setTimeout(() => { $("menu").classList.remove("locked"); }, reducedMotion() ? 60 : 620);
