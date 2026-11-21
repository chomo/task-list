import { isOverdue, reorderTasks, moveTaskOrder, setStatus, themeAccent } from "./domain.js";
import { state, ui } from "./state.js";
import { saveState } from "./storage.js";
import { sDecide, sCancel, sComplete, sWarn } from "./sound.js";
import { spawnBurst } from "./burst.js";
import { $, toast, reducedMotion, updateHeader, renderMenu, renderStatus, renderQuests, visibleTasks } from "./ui.js";
import { renderDetail, renderForm, renderSchedule, renderRecords, renderSystem } from "./screens.js";

export function goScreen(name, back) {
  ui.screen = name;
  document.body.classList.toggle("on-quests", name === "quests");
  ui.menuOpen = false;
  ui.menuFocus = (name === "status");
  const render = () => {
    if (name === "status") renderStatus(true);
    else if (name === "quests") renderQuests(true);
    else if (name === "new") renderForm(null);
    else if (name === "detail") renderDetail(ui.editId);
    else if (name === "edit") renderForm(ui.editId);
    else if (name === "schedule") renderSchedule();
    else if (name === "records") renderRecords();
    else if (name === "system") renderSystem();
    renderMenu(false);
    updateHeader();
    const st = $("stage");
    st.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  };
  if (reducedMotion()) { render(); return; }
  const w = $("wipe");
  w.classList.remove("go", "back"); void w.offsetWidth;
  if (back) w.classList.add("back");
  w.classList.add("go");
  setTimeout(render, 175);
  setTimeout(() => { w.classList.remove("go", "back"); }, 380);
}

export function goBack() {
  if (ui.screen === "edit") { sCancel(); goScreen("detail", true); return; }
  if (ui.screen === "detail") { sCancel(); goScreen("quests", true); return; }
  if (ui.screen !== "status") { sCancel(); goScreen("status", true); }
}

export function rerenderCurrent() {
  if (ui.screen === "schedule") renderSchedule();
  else if (ui.screen === "detail") renderDetail(ui.editId);
  else if (ui.screen === "records") renderRecords();
  else if (ui.screen === "quests") renderQuests(false);
}

export function moveTask(id, dir) {
  const vis = visibleTasks().map((t) => t.id);
  if (!moveTaskOrder(state.tasks, id, dir, vis)) return;
  saveState(localStorage, state);
  renderQuests(false);
}

export function reorder(srcId, dstId) {
  if (!reorderTasks(state.tasks, srcId, dstId)) return;
  saveState(localStorage, state);
  renderQuests(false);
}

export function startTask(id) {
  const t = state.tasks.filter((x) => x.id === id)[0];
  if (!t || t.status === "done" || t.status === "doing") return;
  setStatus(t, "doing");
  saveState(localStorage, state); sDecide();
  rerenderCurrent();
  renderMenu(false); updateHeader();
  toast("「" + t.title + "」を開始した — 進行中");
}

export function revertTask(id) {
  const t = state.tasks.filter((x) => x.id === id)[0];
  if (!t || t.status === "todo") return;
  setStatus(t, "todo");
  saveState(localStorage, state); sCancel();
  rerenderCurrent();
  renderMenu(false); updateHeader();
  toast("「" + t.title + "」を未完了に戻した");
}

export function toggleTask(id, rowEl) {
  const t = state.tasks.filter((x) => x.id === id)[0];
  if (!t) return;
  const rerender = () => { rerenderCurrent(); };
  if (t.status !== "done") {
    if (!reducedMotion()) {
      let bx = 0.5, by = 0.42;
      if (rowEl) {
        const rr = rowEl.getBoundingClientRect();
        bx = (rr.left + rr.width / 2) / Math.max(1, window.innerWidth);
        by = (rr.top + rr.height / 2) / Math.max(1, window.innerHeight);
      }
      spawnBurst($("burstCanvas"), bx, by, themeAccent(state.settings.theme));
    }
    const finish = () => {
      setStatus(t, "done");
      saveState(localStorage, state); rerender(); renderMenu(false); updateHeader();
      toast("COMPLETE — 「" + t.title + "」を完了した");
    };
    if (reducedMotion() || !rowEl) { sComplete(); finish(); return; }
    sComplete();
    rowEl.classList.add("completing");
    setTimeout(finish, 900);
  } else {
    setStatus(t, "todo");
    saveState(localStorage, state); sCancel(); rerender(); renderMenu(false); updateHeader();
    toast("「" + t.title + "」を未完了に戻した");
  }
}

export function openDetail(id) {
  const t = state.tasks.filter((x) => x.id === id)[0];
  if (!t) return;
  ui.editId = id;
  sDecide();
  if (isOverdue(t) && ui.warnedFor !== id) { ui.warnedFor = id; setTimeout(sWarn, 380); }
  goScreen("detail", false);
}

export function openEdit(id) {
  ui.editId = id;
  sDecide();
  goScreen("edit", false);
}
