import { MENU } from "./config.js";
import { ui } from "./state.js";
import { sCursor, sDecide, sCancel, unlockAudio } from "./sound.js";
import { $, renderQuests, decideMenu, onMenuMove, pageSize, visibleTasks, reducedMotion, wipeInPanel } from "./ui.js";
import { goScreen, goBack, openDetail, toggleTask } from "./actions.js";

export function focusKbRow() {
  const el = document.querySelector(".trow.kb");
  if (el) el.scrollIntoView({ block: "nearest" });
}

function typingTarget(e) {
  const t = e.target;
  return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
}

export function bindInput() {
  document.addEventListener("keydown", (e) => {
    if ($("overlay").classList.contains("open")) {
      if (e.key === "Escape") { $("overlay").classList.remove("open"); sCancel(); }
      return;
    }
    if (typingTarget(e)) {
      if (e.key === "Escape") { e.target.blur(); }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const d = e.key === "ArrowDown" ? 1 : -1;
      if (ui.screen === "status" || ui.menuFocus) {
        ui.menuIndex = (ui.menuIndex + d + MENU.length) % MENU.length;
        onMenuMove();
      } else if (ui.screen === "quests") {
        const n = visibleTasks().length;
        if (n) {
          ui.kbIndex = Math.min(n - 1, Math.max(0, ui.kbIndex + d));
          ui.page = Math.floor(ui.kbIndex / pageSize()) + 1;
          sCursor(); renderQuests(false); focusKbRow();
        }
      }
    } else if (e.key === "Enter") {
      if (ui.screen === "status") { e.preventDefault(); decideMenu(); }
      else if (ui.screen === "quests") {
        const list = visibleTasks(); const t = list[ui.kbIndex];
        if (t) { e.preventDefault(); openDetail(t.id); }
      }
    } else if (e.key === " ") {
      if (ui.screen === "quests") {
        const list2 = visibleTasks(); const t2 = list2[ui.kbIndex];
        if (t2) { e.preventDefault(); toggleTask(t2.id, document.querySelector('.trow[data-id="' + t2.id + '"]')); }
      }
    } else if (e.key === "Escape") { goBack(); }
    else if (e.key === "n" || e.key === "N") {
      e.preventDefault(); ui.menuIndex = 1; sDecide(); goScreen("new", false);
    } else if (e.key === "/") {
      e.preventDefault();
      const wasOpen2 = ui.searchOpen;
      ui.searchOpen = true;
      if (ui.screen !== "quests") {
        ui.menuIndex = 0; goScreen("quests", false);
        setTimeout(() => { const s = $("searchBox"); if (s) s.focus(); }, reducedMotion() ? 40 : 420);
      } else { renderQuests(false); if (!wasOpen2) wipeInPanel(".search-body"); const s2 = $("searchBox"); if (s2) s2.focus(); }
    }
  });

  let touchX = null, touchY = null, touchEdge = false;
  document.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touchX = t.clientX; touchY = t.clientY; touchEdge = t.clientX < 26;
    unlockAudio();
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchX, dy = Math.abs(t.clientY - touchY);
    if (touchEdge && dx > 70 && dy < 60) goBack();
    touchX = null;
  }, { passive: true });
  document.addEventListener("pointerdown", () => { unlockAudio(); }, { once: true });
}
