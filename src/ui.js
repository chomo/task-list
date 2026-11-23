import { MENU, PAGE_SIZE_MOBILE, PAGE_SIZE_PC, PAGE_BREAKPOINT_PX, FILTER_CHIPS, SORT_OPTIONS } from "./config.js";
import {
  pad, todayStr, fmtDate, isOverdue, isToday, priLabel, esc, normalizeTheme,
  categories, allTags, openTasks, doneTasks, createTask, visibleTasks as domainVisibleTasks,
  searchConditions as domainSearchConditions, pagerNumbers, pageCount, pageSlice,
  groupQuests, taskStats, todayDoneCount,
} from "./domain.js";
import { state, ui, uid } from "./state.js";
import { saveState } from "./storage.js";
import { applyTheme } from "./themes.js";
import { sCursor, sDecide } from "./sound.js";
import { goScreen, toggleTask, advanceTask, startTask, revertTask, openDetail, moveTask, reorder } from "./actions.js";

export function $(id) { return document.getElementById(id); }

let toastTimer = null;
export function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove("show"); }, 2200);
}

export function reducedMotion() {
  return !state.settings.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function applySettings() {
  state.settings.theme = normalizeTheme(state.settings.theme);
  document.body.classList.toggle("reduced", reducedMotion());
  applyTheme(document.body.classList, state.settings.theme);
}

export function updateHeader() {
  const s = taskStats(state.tasks);
  $("hsRemain").textContent = s.open;
  $("hsDone").textContent = s.done;
  $("hsTodayDone").textContent = todayDoneCount(state.tasks);
}

export function tickClock() {
  const d = new Date(), dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()];
  $("dateBig").textContent = (d.getMonth() + 1) + "/" + d.getDate();
  $("dowBig").textContent = dow;
  $("clockBig").textContent = pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export function pageSize() {
  return window.innerWidth <= PAGE_BREAKPOINT_PX ? PAGE_SIZE_MOBILE : PAGE_SIZE_PC;
}

export function tagChips(t, clickable) {
  return (t.tags || []).map((g) =>
    '<span class="tagchip' + (clickable ? " clickable" : "") + '" data-tag="' + esc(g) + '">#' + esc(g) + "</span>").join("");
}

export function priBadge(t) {
  return '<span class="badge-pri p-' + t.priority + '">優先度 ' + priLabel(t.priority) + "</span>";
}

export function pagerHtml(page, pages, total, attr) {
  if (pages <= 1) return "";
  let h = '<nav class="pager" aria-label="ページ切り替え">' +
    '<button type="button" ' + attr + '="prev"' + (page <= 1 ? " disabled" : "") + '><span>◀ 前へ</span></button>';
  pagerNumbers(page, pages).forEach((n) => {
    if (n === "…") h += '<span class="ellipsis">…</span>';
    else h += '<button type="button" ' + attr + '="' + n + '"' + (n === page ? ' class="on" aria-current="page"' : "") + '><span>' + n + "</span></button>";
  });
  h += '<button type="button" ' + attr + '="next"' + (page >= pages ? " disabled" : "") + '><span>次へ ▶</span></button>' +
    '<span class="pager-info">' + total + "件 — " + page + " / " + pages + " ページ</span></nav>";
  return h;
}

export function bindPager(attr, getPage, setPage, rerender) {
  Array.prototype.forEach.call(document.querySelectorAll("[" + attr + "]"), (el) => {
    el.addEventListener("click", () => {
      const v = el.getAttribute(attr);
      let p = getPage();
      if (v === "prev") p -= 1;
      else if (v === "next") p += 1;
      else p = parseInt(v, 10) || 1;
      setPage(p); sCursor(); rerender();
    });
  });
}

export function visibleTasks() {
  return domainVisibleTasks(state.tasks, ui);
}

export function searchConditions() {
  return domainSearchConditions(ui);
}

/* ---------- menu ---------- */
export function menuBadge(id) {
  if (id === "quests") return openTasks(state.tasks).length + "件";
  if (id === "kanban") {
    const n = state.tasks.filter((t) => t.status === "doing").length;
    return "進行中 " + n + "件";
  }
  if (id === "records") return doneTasks(state.tasks).length + "件完了";
  return "";
}

export function renderMenu(entering) {
  const wrap = $("menuItems");
  wrap.innerHTML = MENU.map((m, i) => {
    const sel = i === ui.menuIndex;
    const badge = menuBadge(m.id);
    return '<button type="button" class="mitem' + (sel ? " sel" : "") + (entering ? " enter" : "") + '" data-mi="' + i + '"' +
      (entering ? ' style="animation-delay:' + (i * 60) + 'ms"' : "") + ' aria-current="' + (sel ? "true" : "false") + '">' +
      '<span class="band"></span>' +
      '<span class="en">' + m.en + '</span><span class="ja">' + m.ja + '</span>' +
      '<span class="sub">' + esc(m.desc) + (badge ? '<span class="badge">' + badge + '</span>' : "") + '</span>' +
      '</button>';
  }).join("");
  Array.prototype.forEach.call(wrap.querySelectorAll(".mitem"), (el) => {
    el.addEventListener("click", () => {
      const i = +el.getAttribute("data-mi");
      if (!ui.menuOpen) {
        ui.menuOpen = true; sCursor(); syncMenuCollapse();
        return;
      }
      if (i !== ui.menuIndex) { ui.menuIndex = i; onMenuMove(); }
      else { decideMenu(); }
    });
  });
  syncBackdrop();
  syncMenuCollapse();
}

export function syncMenuCollapse() {
  const nav = $("menu"); if (!nav) return;
  const collapsed = !ui.menuOpen;
  nav.classList.toggle("collapsed", collapsed);
  nav.classList.toggle("expanded", ui.menuOpen);
  const tg = $("menuToggle");
  if (tg) {
    tg.setAttribute("aria-expanded", ui.menuOpen ? "true" : "false");
    tg.setAttribute("aria-label", ui.menuOpen ? "メニューを閉じる" : "メニューを開く");
    const lab = tg.querySelector(".mtog-label");
    if (lab) lab.textContent = ui.menuOpen ? "閉じる" : "開く";
    const ar = tg.querySelector(".mtog-arrow");
    if (ar) ar.textContent = ui.menuOpen ? "▲" : "▼";
  }
}

export function toggleMenu() {
  ui.menuOpen = !ui.menuOpen;
  sCursor();
  syncMenuCollapse();
}

export function syncBackdrop() {
  const angles = [118, 104, 132, 96, 124];
  document.documentElement.style.setProperty("--ang", angles[ui.menuIndex] + "deg");
  const lines = $("bgLines");
  if (lines) lines.style.backgroundPosition = (ui.menuIndex * -30) + "px 0, " + (ui.menuIndex * -14) + "px 0";
}

export function onMenuMove() {
  sCursor();
  renderMenu(false);
  const items = $("menuItems").querySelectorAll(".mitem");
  const el = items[ui.menuIndex];
  if (el) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  if (ui.screen === "status") renderStatus(false);
}

export function decideMenu() {
  const m = MENU[ui.menuIndex];
  const items = $("menuItems").querySelectorAll(".mitem");
  if (items[ui.menuIndex]) items[ui.menuIndex].classList.add("pop");
  sDecide();
  goScreen(m.id, false);
}

/* ---------- status (S01 right panel) ---------- */
export function renderStatus(anim) {
  const s = taskStats(state.tasks);
  const m = MENU[ui.menuIndex];
  $("stage").innerHTML =
    '<div class="panel status' + (anim ? " slidein" : "") + '">' +
      '<h2><span class="en">STATUS</span>今日の戦況</h2>' +
      '<div class="gold-rule"></div>' +
      '<div class="pat pat-' + ui.menuIndex + '"><span>' + m.en + ' — ' + esc(m.ja) + '</span></div>' +
      '<div class="statgrid">' +
        '<div class="statbox"><b>' + s.open + '</b><span>残タスク</span></div>' +
        '<div class="statbox gold"><b>' + s.todayN + '</b><span>今日が決戦日</span></div>' +
        '<div class="statbox red"><b>' + s.overdue + '</b><span>期限超過</span></div>' +
        '<div class="statbox"><b>' + todayDoneCount(state.tasks) + '</b><span>今日の完了数</span></div>' +
      '</div>' +
      (s.next
        ? '<p class="nextdue">次の決戦 — <b>' + esc(s.next.title) + '</b>　<span class="when">' + fmtDate(s.next.dueDate) + (isOverdue(s.next) ? " ・ 超過" : "") + '</span></p>'
        : '<p class="nextdue">期限つきのタスクはない。新たなタスクは <b>NEW TASK</b> から追加できる。</p>') +
      '<p class="lead" style="margin-top:18px">左のメニューから行き先を選べ。選択中の項目は <b style="color:var(--cyan)">' + m.en + '</b> — ' + esc(m.desc) + '。</p>' +
    '</div>';
}

/* ---------- quests (S02) ---------- */
export function rowHtml(t, idx) {
  const over = isOverdue(t), today = isToday(t) && t.status !== "done";
  const doing = t.status === "doing";
  let meta = "";
  if (doing) meta += '<span class="badge-doing">進行中 DOING</span>';
  meta += priBadge(t);
  if (t.dueDate) meta += '<span class="due' + (over ? " over" : today ? " today" : "") + '">期限 ' + fmtDate(t.dueDate) + "</span>";
  if (over) meta += '<span class="badge-over">OVERDUE</span>';
  if (today) meta += '<span class="badge-today">TODAY</span>';
  if (t.category) meta += '<span class="cat">' + esc(t.category) + "</span>";
  meta += tagChips(t, true);
  const mv = ui.sort === "manual" && ui.filter !== "cat"
    ? '<button type="button" class="mv" data-act="up" aria-label="上へ">▲</button><button type="button" class="mv" data-act="down" aria-label="下へ">▼</button>' : "";
  let opsBtns = "";
  if (t.status === "done") {
    opsBtns = '<button type="button" data-act="toggle">未完了に戻す</button>';
  } else if (doing) {
    opsBtns = '<button type="button" class="done-btn" data-act="toggle">完了にする</button>' +
      '<button type="button" data-act="revert">未完了に戻す</button>';
  } else {
    opsBtns = '<button type="button" class="start-btn" data-act="start">開始</button>' +
      '<button type="button" class="done-btn" data-act="toggle">完了にする</button>';
  }
  return '<div class="trow p-' + t.priority + (t.status === "done" ? " done" : "") + (doing ? " doing" : "") + (idx === ui.kbIndex ? " kb" : "") + '" data-id="' + t.id + '" draggable="' + (ui.sort === "manual") + '">' +
    '<div class="pbar"></div>' +
    '<button type="button" class="check" data-act="advance" aria-label="次のステータスへ進む（' + (t.status === "done" ? "未完了" : t.status === "doing" ? "完了" : "進行中") + '）"></button>' +
    '<div class="main" data-act="open"><div class="ttl">' + esc(t.title) + '</div><div class="meta">' + meta + "</div></div>" +
    '<div class="ops">' + mv + opsBtns + '<button type="button" data-act="open">詳細</button></div>' +
    '<div class="stamp"><b>COMPLETE</b></div>' +
  "</div>";
}

export function renderQuests(anim) {
  const list = visibleTasks();
  const flat = groupQuests(list, ui.showDone);
  const doneList = list.filter((t) => t.status === "done");
  const overList = flat.filter((f) => f.g === "over");
  if (ui.kbIndex >= flat.length) ui.kbIndex = Math.max(0, flat.length - 1);
  const psize = pageSize();
  const pages = pageCount(flat.length, psize);
  if (ui.page > pages) ui.page = pages;
  if (ui.page < 1) ui.page = 1;
  const pstart = (ui.page - 1) * psize;
  const slice = pageSlice(flat, ui.page, psize);
  const cats = categories(state.tasks);
  const tagOpts = allTags(state.tasks);
  const chips = FILTER_CHIPS
    .map((c) => '<button type="button" class="chip' + (ui.filter === c[0] ? " on" : "") + '" data-filter="' + c[0] + '"><span>' + c[1] + "</span></button>").join("");
  let idx = 0, rows = "";
  const conds = searchConditions();
  const condActive = conds.length > 0;
  const searchToggleHtml =
    '<button type="button" class="search-toggle' + (condActive ? " has-cond" : "") + '" id="searchToggle" aria-expanded="' + (ui.searchOpen ? "true" : "false") + '" aria-controls="searchBody">' +
      '<span class="st-label"><span class="st-en">SEARCH</span>検索・絞り込み</span>' +
      (condActive
        ? '<span class="st-cond">' + esc(conds.join(" ・ ")) + '</span><span class="st-badge">条件あり</span>'
        : '<span class="st-cond st-none">条件なし — 検索・フィルタ・並び替え</span>') +
      '<span class="st-state">' + (ui.searchOpen ? "閉じる" : "開く") + ' <span aria-hidden="true">' + (ui.searchOpen ? "▲" : "▼") + "</span></span>" +
    "</button>";
  idx = pstart;
  let lastG = "";
  slice.forEach((it) => {
    if (it.g !== lastG) {
      if (it.g === "over") rows += '<p class="grouplabel">OVERDUE — 期限超過</p>';
      else if (it.g === "rest" && overList.length) rows += '<p class="grouplabel normal">TASKS — タスク</p>';
      lastG = it.g;
    }
    rows += rowHtml(it.t, idx++);
  });
  let doneHtml = "";
  if (doneList.length) {
    doneHtml = '<div class="donehead"><span>完了済み — ' + doneList.length + '件</span>' +
      '<button type="button" id="doneToggle">' + (ui.showDone ? "畳む" : "展開する") + "</button></div>";
  }
  const pager = pagerHtml(ui.page, pages, flat.length, "data-qpage");
  $("stage").innerHTML =
    '<div class="panel' + (anim ? " slidein" : "") + '">' +
      '<h2><span class="en">TASKS</span>タスク一覧</h2><div class="gold-rule"></div>' +
      '<div class="quickadd' + (ui.quickOpen ? " open" : "") + '"><input type="text" id="quickTitle" placeholder="クイック追加 — タイトルを入力して Enter" maxlength="100" />' +
      '<button type="button" class="btn" id="quickBtn">追加</button></div>' +
      searchToggleHtml +
      '<div class="search-body" id="searchBody"' + (ui.searchOpen ? "" : " hidden") + '>' +
      '<div class="toolbar">' +
        '<input type="search" class="search" id="searchBox" placeholder="検索（タイトル・メモ・タグ） — / キー" value="' + esc(ui.search) + '" />' +
        '<select id="sortSel" aria-label="並び替え">' +
          SORT_OPTIONS.map((o) => '<option value="' + o[0] + '"' + (ui.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") +
        "</select>" +
        (ui.filter === "cat"
          ? '<select id="catSel" aria-label="カテゴリ">' + (cats.length ? cats.map((c) => '<option value="' + esc(c) + '"' + (ui.catFilter === c ? " selected" : "") + ">" + esc(c) + "</option>").join("") : '<option value="">（カテゴリなし）</option>') + "</select>"
          : "") +
        (ui.filter === "tag"
          ? '<select id="tagSel" aria-label="タグ">' + (tagOpts.length ? tagOpts.map((c) => '<option value="' + esc(c) + '"' + (ui.tagFilter === c ? " selected" : "") + ">#" + esc(c) + "</option>").join("") : '<option value="">（タグなし）</option>') + "</select>"
          : "") +
      "</div>" +
      '<div class="chips">' + chips + "</div>" +
      "</div>" +
      (list.length ? rows + doneHtml + pager
        : '<div class="empty"><b>タスクはない</b>条件に合うタスクが見つからない。NEW TASK から追加できる。</div>') +
    "</div>";
  syncFab(condActive);
  bindQuests();
}

export function syncFab(condActive) {
  document.body.classList.toggle("on-quests", ui.screen === "quests");
  const fa = $("fabAdd"), fs = $("fabSearch");
  if (fa) {
    fa.classList.toggle("on", ui.quickOpen);
    fa.setAttribute("aria-expanded", ui.quickOpen ? "true" : "false");
    fa.setAttribute("aria-label", ui.quickOpen ? "クイック追加を閉じる" : "クイック追加を開く");
  }
  if (fs) {
    fs.classList.toggle("on", ui.searchOpen);
    fs.classList.toggle("has-cond", !!condActive);
    fs.setAttribute("aria-expanded", ui.searchOpen ? "true" : "false");
    fs.setAttribute("aria-label", ui.searchOpen ? "検索を閉じる" : "検索を開く");
  }
}

export function wipeInPanel(sel) {
  if (reducedMotion()) return;
  const el = document.querySelector(sel);
  if (el) el.classList.add("wipe-in");
}

export function toggleQuickPanel() {
  if (ui.quickOpen) {
    const el = document.querySelector(".quickadd");
    if (reducedMotion() || !el) { ui.quickOpen = false; renderQuests(false); return; }
    if (el.classList.contains("wipe-out")) return;
    el.classList.remove("wipe-in"); el.classList.add("wipe-out");
    setTimeout(() => { ui.quickOpen = false; if (ui.screen === "quests") renderQuests(false); }, 150);
  } else {
    ui.quickOpen = true; renderQuests(false); wipeInPanel(".quickadd");
    const qi = $("quickTitle"); if (qi) qi.focus();
  }
}

export function toggleSearchPanel(focusAfter) {
  if (ui.searchOpen) {
    const el = document.querySelector(".search-body");
    if (reducedMotion() || !el) { ui.searchOpen = false; renderQuests(false); return; }
    if (el.classList.contains("wipe-out")) return;
    el.classList.remove("wipe-in"); el.classList.add("wipe-out");
    setTimeout(() => { ui.searchOpen = false; if (ui.screen === "quests") renderQuests(false); }, 150);
  } else {
    ui.searchOpen = true; renderQuests(false); wipeInPanel(".search-body");
    if (focusAfter) { const si = $("searchBox"); if (si) si.focus(); }
  }
}

export function bindQuests() {
  const stg = $("searchToggle");
  if (stg) stg.addEventListener("click", () => {
    sCursor();
    toggleSearchPanel(false);
  });
  const q = $("quickTitle");
  const addQuick = () => {
    const v = q.value.trim(); if (!v) return;
    state.tasks.unshift(createTask({ id: uid(), title: v }));
    saveState(localStorage, state); sDecide(); ui.kbIndex = 0; ui.page = 1; ui.quickOpen = false;
    renderQuests(false); renderMenu(false); updateHeader();
    toast("タスクを追加した");
  };
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") addQuick(); });
  $("quickBtn").addEventListener("click", addQuick);
  const sb = $("searchBox");
  sb.addEventListener("input", () => {
    ui.search = sb.value; ui.kbIndex = 0; ui.page = 1;
    const pos = sb.selectionStart;
    renderQuests(false);
    const n = $("searchBox"); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {}
  });
  $("sortSel").addEventListener("change", function () { ui.sort = this.value; ui.page = 1; renderQuests(false); });
  const cs = $("catSel");
  if (cs) cs.addEventListener("change", function () { ui.catFilter = this.value; ui.page = 1; renderQuests(false); });
  const ts = $("tagSel");
  if (ts) ts.addEventListener("change", function () { ui.tagFilter = this.value; ui.page = 1; renderQuests(false); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), (el) => {
    el.addEventListener("click", () => {
      ui.filter = el.getAttribute("data-filter");
      if (ui.filter === "cat" && !ui.catFilter) ui.catFilter = categories(state.tasks)[0] || "";
      if (ui.filter === "tag" && !ui.tagFilter) ui.tagFilter = allTags(state.tasks)[0] || "";
      ui.page = 1;
      sCursor(); renderQuests(false);
    });
  });
  const dt = $("doneToggle");
  if (dt) dt.addEventListener("click", () => { ui.showDone = !ui.showDone; ui.page = 1; sCursor(); renderQuests(false); });
  bindPager("data-qpage",
    () => ui.page,
    (p) => { ui.page = p; },
    () => { renderQuests(false); });
  Array.prototype.forEach.call(document.querySelectorAll(".trow"), (row) => {
    const id = row.getAttribute("data-id");
    row.addEventListener("click", (e) => {
      const tagEl = e.target.closest("[data-tag]");
      if (tagEl) {
        const wasSearchOpen = ui.searchOpen;
        ui.filter = "tag"; ui.tagFilter = tagEl.getAttribute("data-tag"); ui.searchOpen = true; ui.page = 1;
        sCursor(); renderQuests(false);
        if (!wasSearchOpen) wipeInPanel(".search-body");
        return;
      }
      const actEl = e.target.closest("[data-act]");
      const act = actEl ? actEl.getAttribute("data-act") : "open";
      if (act === "toggle") { toggleTask(id, row); }
      else if (act === "advance") { advanceTask(id, row); }
      else if (act === "start") { startTask(id); }
      else if (act === "revert") { revertTask(id); }
      else if (act === "up") { moveTask(id, -1); }
      else if (act === "down") { moveTask(id, 1); }
      else { openDetail(id); }
    });
    row.addEventListener("dragstart", () => { row.classList.add("dragging"); row.dataset.drag = "1"; });
    row.addEventListener("dragend", () => { row.classList.remove("dragging"); });
    row.addEventListener("dragover", (e) => { e.preventDefault(); });
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      const src = document.querySelector('.trow[data-drag="1"]');
      if (!src || src === row) return;
      const sid = src.getAttribute("data-id");
      reorder(sid, id);
    });
  });
}
