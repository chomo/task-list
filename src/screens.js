import { THEMES, REC_FILTERS, KANBAN_COLS } from "./config.js";
import {
  pad, todayStr, fmtDate, fmtDateTime, isOverdue, isToday, priLabel, statusLabel, esc,
  parseTags, categories, allTags, doneTasks, createTask, recRange, recFilteredDone,
  completionStreak, taskStats, kanbanGroups, pageCount, pageSlice,
} from "./domain.js";
import { state, ui, uid } from "./state.js";
import { saveState, parseImport } from "./storage.js";
import { sCursor, sDecide, sCancel, sWarn } from "./sound.js";
import { $, toast, priBadge, tagChips, pagerHtml, bindPager, pageSize, renderMenu, renderQuests, updateHeader, reducedMotion, applySettings } from "./ui.js";
import { goScreen, goBack, toggleTask, startTask, revertTask, openDetail, openEdit, setTaskStatus } from "./actions.js";

/* ---------- detail (read-only) ---------- */
export function renderDetail(editId) {
  const t = editId ? state.tasks.filter((x) => x.id === editId)[0] : null;
  if (!t) { goScreen("quests", true); return; }
  const over = isOverdue(t), today = isToday(t) && t.status !== "done";
  const dueHtml = t.dueDate
    ? esc(fmtDate(t.dueDate)) + (over ? ' <span class="badge-over">OVERDUE</span>' : today ? ' <span class="badge-today">TODAY</span>' : "")
    : '<span style="color:var(--mut);font-weight:400">未設定</span>';
  const statusBadge = t.status === "done"
    ? '<span class="badge-today">完了 DONE</span>'
    : t.status === "doing" ? '<span class="badge-doing">進行中 DOING</span>' : '<span class="badge-pri p-normal">未完了</span>';
  let acts = "";
  if (t.status === "done") {
    acts = '<button type="button" class="btn gold" id="dRevert">未完了に戻す</button>';
  } else if (t.status === "doing") {
    acts = '<button type="button" class="btn gold" id="dToggle">完了にする</button>' +
      '<button type="button" class="btn ghost" id="dRevert">未完了に戻す</button>';
  } else {
    acts = '<button type="button" class="btn gold" id="dStart">開始</button>' +
      '<button type="button" class="btn gold" id="dToggle">完了にする</button>';
  }
  $("stage").innerHTML =
    '<div class="panel slidein">' +
      '<div class="backrow"><button type="button" id="backBtn">◀ TASKS へ戻る</button></div>' +
      '<h2><span class="en">DETAIL</span>タスク詳細</h2>' +
      '<div class="gold-rule"></div>' +
      '<div class="dtitle' + (t.status === "done" ? " done" : "") + '">' + esc(t.title) + '</div>' +
      '<div class="dbadges">' + statusBadge + priBadge(t) +
        (over ? '<span class="badge-over">OVERDUE</span>' : "") + (today ? '<span class="badge-today">TODAY</span>' : "") + '</div>' +
      '<div class="dgrid">' +
        '<div class="ditem"><span>期限</span><p>' + dueHtml + '</p></div>' +
        '<div class="ditem pri-' + t.priority + '"><span>優先度</span><p>' + priLabel(t.priority) + '</p></div>' +
        '<div class="ditem"><span>カテゴリ</span><p>' + (t.category ? esc(t.category) : '<span style="color:var(--mut);font-weight:400">未設定</span>') + '</p></div>' +
        '<div class="ditem"><span>状態</span><p>' + statusLabel(t) + '</p></div>' +
        '<div class="ditem"><span>作成日</span><p>' + (t.createdAt ? esc(fmtDateTime(t.createdAt)) : '<span style="color:var(--mut);font-weight:400">—</span>') + '</p></div>' +
        '<div class="ditem"><span>完了日時</span><p>' + (t.completedAt ? esc(fmtDateTime(t.completedAt)) : '<span style="color:var(--mut);font-weight:400">—（未完了）</span>') + '</p></div>' +
      '</div>' +
      '<div class="dsec"><span>メモ</span>' +
        (t.note ? '<div class="dnote">' + esc(t.note) + '</div>' : '<div class="dnote dim">（メモなし）</div>') + '</div>' +
      '<div class="dsec"><span>タグ</span>' +
        ((t.tags && t.tags.length)
          ? '<div class="dtags">' + tagChips(t, false) + '</div>'
          : '<div class="dempty">タグはない</div>') + '</div>' +
      '<div class="dacts">' +
        '<button type="button" class="btn" id="editBtn">編集</button>' +
        acts +
        '<button type="button" class="btn danger" id="delBtn">削除</button>' +
      '</div>' +
      '<div class="backrow-bottom"><button type="button" id="backBtnBottom">◀ TASKS へ戻る</button></div>' +
    '</div>';
  $("backBtn").addEventListener("click", goBack);
  $("backBtnBottom").addEventListener("click", goBack);
  $("editBtn").addEventListener("click", () => { openEdit(t.id); });
  const ds = $("dStart");
  if (ds) ds.addEventListener("click", () => { startTask(t.id); });
  const dtg = $("dToggle");
  if (dtg) dtg.addEventListener("click", () => { toggleTask(t.id, null); });
  const drv = $("dRevert");
  if (drv) drv.addEventListener("click", () => { revertTask(t.id); });
  $("delBtn").addEventListener("click", () => { confirmDelete(t); });
}

/* ---------- form (new / edit only) ---------- */
export function renderForm(editId) {
  const t = editId ? state.tasks.filter((x) => x.id === editId)[0] : null;
  if (editId && !t) { goScreen("quests", true); return; }
  ui.formPriority = t ? t.priority : "normal";
  const isNew = !t;
  $("stage").innerHTML =
    '<div class="panel slidein">' +
      (isNew ? "" : '<div class="backrow"><button type="button" id="backBtn">◀ 詳細へ戻る</button></div>') +
      '<h2><span class="en">' + (isNew ? "NEW TASK" : "EDIT") + "</span>" + (isNew ? "新規タスク追加" : "タスク編集") + "</h2>" +
      '<div class="gold-rule"></div>' +
      '<label class="f"><span>タイトル（必須・100文字まで）</span><input type="text" id="fTitle" maxlength="100" value="' + esc(t ? t.title : "") + '" placeholder="タスク名" /></label>' +
      '<label class="f"><span>メモ</span><textarea id="fNote" placeholder="メモ（改行可）">' + esc(t ? t.note : "") + "</textarea></label>" +
      '<div class="frow">' +
        '<label class="f"><span>期限（決戦日）</span><input type="date" id="fDue" value="' + esc(t ? t.dueDate : "") + '" /></label>' +
        '<label class="f"><span>カテゴリ（自由入力）</span><input type="text" id="fCat" list="catList" value="' + esc(t ? t.category : "") + '" placeholder="カテゴリ" />' +
        '<datalist id="catList">' + categories(state.tasks).map((c) => '<option value="' + esc(c) + '">').join("") + "</datalist></label>" +
        '<label class="f"><span>優先度</span><span class="seg" id="fPri">' +
          [["high", "高"], ["normal", "通常"], ["low", "低"]].map((p) =>
            '<button type="button" data-pri="' + p[0] + '" class="p-' + p[0] + (ui.formPriority === p[0] ? " on" : "") + '">' + p[1] + "</button>").join("") + "</span></label>" +
      "</div>" +
      '<label class="f"><span>タグ（複数可 — カンマ・空白で区切る）</span><input type="text" id="fTags" list="tagList" value="' + esc(t && t.tags ? t.tags.join(", ") : "") + '" placeholder="例：仕事, 買い物, 急ぎ" />' +
      '<datalist id="tagList">' + allTags(state.tasks).map((c) => '<option value="' + esc(c) + '">').join("") + "</datalist></label>" +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:28px">' +
        '<button type="button" class="btn" id="saveBtn">' + (isNew ? "追加する" : "保存する") + "</button>" +
        (isNew ? "" : '<button type="button" class="btn ghost" id="cancelBtn">キャンセル</button>') +
      "</div>" +
    "</div>";
  Array.prototype.forEach.call(document.querySelectorAll("#fPri [data-pri]"), (b) => {
    b.addEventListener("click", () => {
      ui.formPriority = b.getAttribute("data-pri"); sCursor();
      Array.prototype.forEach.call(document.querySelectorAll("#fPri [data-pri]"), (x) => {
        x.classList.toggle("on", x === b);
      });
    });
  });
  $("saveBtn").addEventListener("click", () => {
    const title = $("fTitle").value.trim();
    if (!title) { toast("タイトルを入力してほしい"); $("fTitle").focus(); return; }
    const tags = parseTags($("fTags").value);
    if (isNew) {
      state.tasks.unshift(createTask({
        id: uid(), title,
        note: $("fNote").value, dueDate: $("fDue").value,
        priority: ui.formPriority, category: $("fCat").value.trim(), tags,
      }));
      saveState(localStorage, state); sDecide(); toast("タスクを追加した");
      goScreen("quests", false);
    } else {
      t.title = title.slice(0, 100); t.note = $("fNote").value; t.dueDate = $("fDue").value;
      t.priority = ui.formPriority; t.category = $("fCat").value.trim(); t.tags = tags;
      saveState(localStorage, state); sDecide(); toast("保存した");
      goScreen("detail", true);
    }
  });
  const bb = $("backBtn");
  if (bb) bb.addEventListener("click", goBack);
  const cb = $("cancelBtn");
  if (cb) cb.addEventListener("click", goBack);
  setTimeout(() => { const f = $("fTitle"); if (f) f.focus(); }, reducedMotion() ? 30 : 400);
}

export function confirmDelete(t) {
  const ov = $("overlay");
  ov.innerHTML =
    '<div class="box"><h3><span class="en">DELETE</span>タスク破棄</h3>' +
    '<p>「<b>' + esc(t.title) + '</b>」を削除する。この操作は取り消せない。</p>' +
    '<div class="acts"><button type="button" class="btn danger" id="ovYes">削除する</button>' +
    '<button type="button" class="btn ghost" id="ovNo">やめる</button></div></div>';
  ov.classList.add("open");
  sWarn();
  $("ovNo").addEventListener("click", () => { ov.classList.remove("open"); sCancel(); });
  $("ovYes").addEventListener("click", () => {
    state.tasks = state.tasks.filter((x) => x.id !== t.id);
    saveState(localStorage, state); ov.classList.remove("open"); sDecide(); toast("タスクを破棄した");
    goScreen("quests", true);
  });
}

/* ---------- kanban (S05) ---------- */
function kcardHtml(t) {
  const over = isOverdue(t), today = isToday(t) && t.status !== "done";
  let meta = "";
  meta += priBadge(t);
  if (t.dueDate) meta += '<span class="due' + (over ? " over" : today ? " today" : "") + '">期限 ' + fmtDate(t.dueDate) + "</span>";
  if (over) meta += '<span class="badge-over">OVERDUE</span>';
  if (today) meta += '<span class="badge-today">TODAY</span>';
  if (t.category) meta += '<span class="cat">' + esc(t.category) + "</span>";
  meta += tagChips(t, false);
  const ci = t.status === "done" ? 2 : t.status === "doing" ? 1 : 0;
  let mv = "";
  if (ci > 0) mv += '<button type="button" data-kmove="-1" aria-label="' + KANBAN_COLS[ci - 1].ja + 'へ移動">◀</button>';
  if (ci < 2) mv += '<button type="button" data-kmove="1" aria-label="' + KANBAN_COLS[ci + 1].ja + 'へ移動">▶</button>';
  return '<div class="kcard p-' + t.priority + (t.status === "done" ? " done" : "") + (t.status === "doing" ? " doing" : "") + '" data-id="' + t.id + '" draggable="true" tabindex="0" role="button" aria-label="' + esc(t.title) + ' — 詳細を開く">' +
    '<div class="ktitle">' + esc(t.title) + '</div>' +
    '<div class="kmeta">' + meta + "</div>" +
    '<div class="kfoot"><span class="khint">ドラッグで移動</span><span class="kmove">' + mv + "</span></div>" +
  "</div>";
}

function kbPageKey(status) { return status === "doing" ? "kbPageDoing" : status === "done" ? "kbPageDone" : "kbPageTodo"; }

export function renderKanban() {
  const groups = kanbanGroups(state.tasks);
  const tabs = [["all", "全部"]].concat(KANBAN_COLS.map((c) => [c.status, c.ja]));
  const tabsHtml = tabs.map((tb) => {
    const n = tb[0] === "all" ? state.tasks.length : groups[tb[0]].length;
    return '<button type="button" class="chip' + (ui.kbTab === tb[0] ? " on" : "") + '" data-ktab="' + tb[0] + '" aria-pressed="' + (ui.kbTab === tb[0] ? "true" : "false") + '"><span>' + tb[1] + " " + n + "件</span></button>";
  }).join("");
  const cols = KANBAN_COLS.map((c) => {
    const list = groups[c.status];
    const key = kbPageKey(c.status);
    const psize = pageSize();
    const pages = Math.max(1, Math.ceil(list.length / psize));
    if (ui[key] > pages) ui[key] = pages;
    if (ui[key] < 1) ui[key] = 1;
    const pstart = (ui[key] - 1) * psize;
    const slice = list.slice(pstart, pstart + psize);
    return '<section class="kcol" data-status="' + c.status + '" aria-label="' + c.ja + '">' +
      '<div class="kcol-head"><span class="ken">' + c.en + '</span><span class="kja">' + c.ja + '</span>' +
      '<span class="kcount">' + list.length + "件</span></div>" +
      '<div class="kdrop" data-status="' + c.status + '">' +
      (list.length ? slice.map(kcardHtml).join("") : '<div class="kempty">タスクなし</div>') +
      "</div>" +
      pagerHtml(ui[key], pages, list.length, "data-kpage-" + c.status) +
      "</section>";
  }).join("");
  $("stage").innerHTML =
    '<div class="panel slidein"><h2><span class="en">KANBAN</span>かんばんチャート</h2><div class="gold-rule"></div>' +
    '<p class="lead"><span class="kdrag-text">カードをドラッグして列へ移すとステータスが変わる。</span>カードをタップすると詳細が開く。</p>' +
    '<div class="chips ktabs" role="group" aria-label="ステータスで表示を切り替え">' + tabsHtml + "</div>" +
    '<div class="kboard tab-' + ui.kbTab + '">' + cols + "</div></div>";
  Array.prototype.forEach.call(document.querySelectorAll("[data-ktab]"), (el) => {
    el.addEventListener("click", () => {
      ui.kbTab = el.getAttribute("data-ktab");
      sCursor(); renderKanban();
    });
  });
  KANBAN_COLS.forEach((c) => {
    const key = kbPageKey(c.status);
    bindPager("data-kpage-" + c.status,
      () => ui[key],
      (p) => { ui[key] = p; },
      () => { renderKanban(); });
  });
  bindKanban();
}

function bindKanban() {
  let dragId = null, dragged = false;
  Array.prototype.forEach.call(document.querySelectorAll(".kcard"), (card) => {
    const id = card.getAttribute("data-id");
    card.addEventListener("dragstart", (e) => {
      dragId = id; dragged = true;
      card.classList.add("dragging");
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", id); } catch (err) {} }
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      Array.prototype.forEach.call(document.querySelectorAll(".kdrop"), (d) => { d.classList.remove("dragover"); });
      setTimeout(() => { dragged = false; }, 0);
    });
    card.addEventListener("click", (e) => {
      if (dragged) return;
      const mv = e.target.closest("[data-kmove]");
      if (mv) {
        const cur = state.tasks.filter((x) => x.id === id)[0];
        const ci = KANBAN_COLS.findIndex((c) => cur && cur.status === c.status);
        const next = KANBAN_COLS[ci + (+mv.getAttribute("data-kmove"))];
        if (next) setTaskStatus(id, next.status);
        return;
      }
      openDetail(id);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); openDetail(id); }
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".kdrop"), (drop) => {
    drop.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      drop.classList.add("dragover");
    });
    drop.addEventListener("dragleave", () => { drop.classList.remove("dragover"); });
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
      let id = dragId;
      if (!id && e.dataTransfer) { try { id = e.dataTransfer.getData("text/plain"); } catch (err) {} }
      if (id) setTaskStatus(id, drop.getAttribute("data-status"));
      dragId = null;
    });
  });
  /* touch drag */
  let touchCard = null, touchGhost = null, touchMoved = false;
  function clearTouch() {
    if (touchGhost && touchGhost.parentNode) touchGhost.parentNode.removeChild(touchGhost);
    touchGhost = null;
    if (touchCard) touchCard.classList.remove("dragging");
    touchCard = null; touchMoved = false;
    Array.prototype.forEach.call(document.querySelectorAll(".kdrop"), (d) => { d.classList.remove("dragover"); });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".kcard"), (card) => {
    card.addEventListener("touchstart", () => {
      touchCard = card; touchMoved = false;
    }, { passive: true });
    card.addEventListener("touchmove", (e) => {
      if (!touchCard) return;
      const tc = e.changedTouches[0];
      if (!touchGhost) {
        touchGhost = card.cloneNode(true);
        touchGhost.classList.add("kghost");
        touchGhost.style.width = card.offsetWidth + "px";
        document.body.appendChild(touchGhost);
        card.classList.add("dragging");
      }
      touchMoved = true;
      touchGhost.style.left = (tc.clientX - touchGhost.offsetWidth / 2) + "px";
      touchGhost.style.top = (tc.clientY - 30) + "px";
      const el = document.elementFromPoint(tc.clientX, tc.clientY);
      const drop = el && el.closest ? el.closest(".kdrop") : null;
      Array.prototype.forEach.call(document.querySelectorAll(".kdrop"), (d) => { d.classList.toggle("dragover", d === drop); });
      e.preventDefault();
    }, { passive: false });
    card.addEventListener("touchend", (e) => {
      if (touchCard && touchMoved) {
        const tc = e.changedTouches[0];
        if (touchGhost) touchGhost.style.display = "none";
        const el = document.elementFromPoint(tc.clientX, tc.clientY);
        const drop = el && el.closest ? el.closest(".kdrop") : null;
        const id = touchCard.getAttribute("data-id");
        clearTouch();
        dragged = true;
        setTimeout(() => { dragged = false; }, 50);
        if (drop) setTaskStatus(id, drop.getAttribute("data-status"));
      } else clearTouch();
    });
    card.addEventListener("touchcancel", clearTouch);
  });
}

/* ---------- records (S06) ---------- */
export function recRowHtml(t) {
  let meta = "";
  meta += priBadge(t);
  if (t.completedAt) meta += '<span>完了 ' + esc(fmtDateTime(t.completedAt)) + "</span>";
  if (t.dueDate) meta += '<span>期限 ' + fmtDate(t.dueDate) + "</span>";
  if (t.category) meta += '<span class="cat">' + esc(t.category) + "</span>";
  meta += tagChips(t, false);
  return '<div class="trow p-' + t.priority + ' done" data-id="' + t.id + '">' +
    '<div class="pbar"></div>' +
    '<button type="button" class="check" data-act="toggle" aria-label="未完了に戻す"></button>' +
    '<div class="main" data-act="open"><div class="ttl">' + esc(t.title) + '</div><div class="meta">' + meta + "</div></div>" +
    '<div class="ops"><button type="button" data-act="toggle">未完了に戻す</button><button type="button" data-act="open">詳細</button></div>' +
  "</div>";
}

export function renderRecords() {
  const done = doneTasks(state.tasks);
  const byDay = {};
  done.forEach((t) => {
    if (t.completedAt) { const k = t.completedAt.slice(0, 10); byDay[k] = (byDay[k] || 0) + 1; }
  });
  const streak = completionStreak(state.tasks);
  const s = taskStats(state.tasks);
  const range = recRange(ui.recFilter);
  const list = recFilteredDone(state.tasks, ui.recFilter);
  const rsize = pageSize();
  const rpages = pageCount(list.length, rsize);
  if (ui.recPage > rpages) ui.recPage = rpages;
  if (ui.recPage < 1) ui.recPage = 1;
  const rlist = pageSlice(list, ui.recPage, rsize);
  const chips = REC_FILTERS.map((c) =>
    '<button type="button" class="chip' + (ui.recFilter === c[0] ? " on" : "") + '" data-recfilter="' + c[0] + '"><span>' + c[1] + "</span></button>").join("");
  $("stage").innerHTML =
    '<div class="panel slidein"><h2><span class="en">RECORDS</span>記録</h2><div class="gold-rule"></div>' +
    '<div class="statgrid">' +
      '<div class="statbox"><b>' + done.length + '</b><span>総完了数</span></div>' +
      '<div class="statbox gold"><b>' + streak + '<small>日</small></b><span>連続完了</span></div>' +
      '<div class="statbox"><b>' + (byDay[todayStr()] || 0) + '</b><span>今日の完了</span></div>' +
      '<div class="statbox"><b>' + s.rate + '<small>%</small></b><span>達成率</span></div>' +
    "</div>" +
    '<h3 style="font-family:var(--serif);color:#fff;margin:26px 0 10px">完了タスク — ' + esc(range.label) + "（" + list.length + '件）</h3>' +
    '<div class="chips" role="group" aria-label="期間フィルタ">' + chips + "</div>" +
    (list.length
      ? rlist.map(recRowHtml).join("") + pagerHtml(ui.recPage, rpages, list.length, "data-rpage")
      : '<div class="empty"><b>完了タスクはない</b>' + (ui.recFilter === "today" ? "今日完了したタスクはない。" : "この期間に完了したタスクはない。") + "期間を切り替えて確認できる。</div>") +
    "</div>";
  Array.prototype.forEach.call(document.querySelectorAll("[data-recfilter]"), (el) => {
    el.addEventListener("click", () => {
      ui.recFilter = el.getAttribute("data-recfilter");
      ui.recPage = 1;
      sCursor(); renderRecords();
    });
  });
  bindPager("data-rpage",
    () => ui.recPage,
    (p) => { ui.recPage = p; },
    () => { renderRecords(); });
  Array.prototype.forEach.call(document.querySelectorAll(".trow"), (row) => {
    row.addEventListener("click", (e) => {
      const id = row.getAttribute("data-id");
      const actEl = e.target.closest("[data-act]");
      const act = actEl ? actEl.getAttribute("data-act") : "open";
      if (act === "toggle") toggleTask(id, row);
      else openDetail(id);
    });
  });
}

/* ---------- system (S07) ---------- */
export function renderSystem() {
  const s = state.settings;
  const sw = (key, val) =>
    '<button type="button" class="switch" role="switch" aria-checked="' + val + '" data-set="' + key + '" aria-label="' + key + '"></button>';
  $("stage").innerHTML =
    '<div class="panel slidein"><h2><span class="en">SYSTEM</span>設定</h2><div class="gold-rule"></div>' +
    '<div class="setrow"><div class="t"><b>サウンド</b><span>Web Audio 合成音（ファイルなし）</span></div>' + sw("sound", s.sound) + "</div>" +
    '<div class="setrow"><div class="t"><b>音量</b><span>カーソル・決定・完了音の大きさ</span></div>' +
      '<span class="seg" id="volSeg">' + [1, 2, 3].map((v) =>
        '<button type="button" data-vol="' + v + '"' + (s.volume === v ? ' class="on"' : "") + ">" + ["", "小", "中", "大"][v] + "</button>").join("") + "</span></div>" +
    '<div class="setrow"><div class="t"><b>モーション</b><span>OFF でワイプとゆらぎを止め、フェードに置き換える</span></div>' + sw("motion", s.motion) + "</div>" +
    '<div class="setrow"><div class="t"><b>テーマ</b><span>ブルー（ディープブルー基調）／ダーク（デフォルト）／ホワイト（白基調）／イエロー（黄色基調）／レッド（赤基調）</span></div>' +
      '<span class="seg" id="themeSeg">' +
        THEMES.map((th) => '<button type="button" data-theme="' + th.id + '"' + (s.theme === th.id ? ' class="on"' : "") + ">" + th.label + "</button>").join("") +
      "</span></div>" +
    '<h3 style="font-family:var(--serif);color:#fff;margin:28px 0 4px">データ管理</h3><div class="gold-rule"></div>' +
    '<p class="lead">保存先はこの端末の localStorage（キー: tasklist-space-v1）。タスク ' + state.tasks.length + "件を保持中。</p>" +
    '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
      '<button type="button" class="btn gold" id="expBtn">JSON エクスポート</button>' +
      '<button type="button" class="btn ghost" id="impBtn">JSON インポート</button>' +
      '<button type="button" class="btn danger" id="wipeBtn">全データ削除</button>' +
    "</div></div>";
  Array.prototype.forEach.call(document.querySelectorAll("[data-set]"), (el) => {
    el.addEventListener("click", () => {
      const k = el.getAttribute("data-set");
      state.settings[k] = !state.settings[k];
      saveState(localStorage, state); applySettings(); sCursor(); renderSystem();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("#volSeg [data-vol]"), (b) => {
    b.addEventListener("click", () => {
      state.settings.volume = +b.getAttribute("data-vol");
      saveState(localStorage, state); sCursor(); renderSystem();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("#themeSeg [data-theme]"), (b) => {
    b.addEventListener("click", () => {
      state.settings.theme = b.getAttribute("data-theme");
      saveState(localStorage, state); applySettings(); sCursor(); renderSystem();
    });
  });
  $("expBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tasklist-" + todayStr() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => { URL.revokeObjectURL(a.href); }, 4000);
    sDecide(); toast("JSON を書き出した");
  });
  $("impBtn").addEventListener("click", () => { $("importFile").click(); });
  $("wipeBtn").addEventListener("click", () => {
    const ov = $("overlay");
    ov.innerHTML =
      '<div class="box"><h3><span class="en">ERASE</span>全データ削除</h3>' +
      "<p>タスクと設定をすべて削除する。この操作は取り消せない。先にエクスポートを勧める。</p>" +
      '<div class="acts"><button type="button" class="btn danger" id="ovYes">全て削除する</button>' +
      '<button type="button" class="btn ghost" id="ovNo">やめる</button></div></div>';
    ov.classList.add("open");
    $("ovNo").addEventListener("click", () => { ov.classList.remove("open"); sCancel(); });
    $("ovYes").addEventListener("click", () => {
      state.tasks = [];
      saveState(localStorage, state); ov.classList.remove("open"); toast("全データを削除した");
      renderSystem(); renderMenu(false); updateHeader();
    });
  });
}

export function bindImport() {
  $("importFile").addEventListener("change", function () {
    const f = this.files && this.files[0];
    this.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const { tasks, settings } = parseImport(r.result);
        state.tasks = tasks;
        if (settings) Object.assign(state.settings, settings);
        applySettings(); saveState(localStorage, state);
        toast("インポートした — " + tasks.length + "件");
        sDecide(); goScreen("quests", false);
      } catch (e) { toast("読み込めなかった — JSON の形式が違う"); }
    };
    r.readAsText(f);
  });
}
