import { THEMES, REC_FILTERS } from "./config.js";
import {
  pad, todayStr, fmtDate, fmtDateTime, isOverdue, isToday, priLabel, statusLabel, esc,
  parseTags, categories, allTags, doneTasks, createTask, recRange, recFilteredDone,
  completionStreak, taskStats, shiftMonth, pageCount, pageSlice,
} from "./domain.js";
import { state, ui, uid } from "./state.js";
import { saveState, parseImport } from "./storage.js";
import { sCursor, sDecide, sCancel, sWarn } from "./sound.js";
import { $, toast, priBadge, tagChips, pagerHtml, bindPager, pageSize, renderMenu, renderQuests, updateHeader, reducedMotion, applySettings } from "./ui.js";
import { goScreen, goBack, toggleTask, startTask, revertTask, openEdit } from "./actions.js";

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

/* ---------- schedule (S05) ---------- */
export function rowHtmlSimple(t) {
  const over = isOverdue(t);
  const doing = t.status === "doing";
  let meta = "";
  if (doing) meta += '<span class="badge-doing">進行中 DOING</span>';
  meta += priBadge(t);
  if (t.category) meta += '<span class="cat">' + esc(t.category) + "</span>";
  if (over) meta += '<span class="badge-over">OVERDUE</span>';
  meta += tagChips(t, false);
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
  return '<div class="trow p-' + t.priority + (t.status === "done" ? " done" : "") + (doing ? " doing" : "") + '" data-id="' + t.id + '">' +
    '<div class="pbar"></div>' +
    '<button type="button" class="check" data-act="toggle" aria-label="' + (t.status === "done" ? "未完了に戻す" : "完了にする") + '"></button>' +
    '<div class="main" data-act="open"><div class="ttl">' + esc(t.title) + '</div><div class="meta">' + meta + "</div></div>" +
    '<div class="ops">' + opsBtns + '<button type="button" data-act="open">詳細</button></div>' +
    '<div class="stamp"><b>COMPLETE</b></div></div>';
}

export function renderSchedule() {
  if (!ui.calCursor) { const n = new Date(); ui.calCursor = n.getFullYear() + "-" + pad(n.getMonth() + 1); }
  if (!ui.calSel) ui.calSel = todayStr();
  const parts = ui.calCursor.split("-"), y = +parts[0], mo = +parts[1];
  const first = new Date(y, mo - 1, 1), startDow = first.getDay();
  const days = new Date(y, mo, 0).getDate();
  const prevDays = new Date(y, mo - 1, 0).getDate();
  const byDate = {};
  state.tasks.forEach((t) => { if (t.dueDate) { (byDate[t.dueDate] = byDate[t.dueDate] || []).push(t); } });
  let cells = "";
  ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach((d) => { cells += '<div class="dowh">' + d + "</div>"; });
  const total = Math.ceil((startDow + days) / 7) * 7;
  for (let i = 0; i < total; i++) {
    let dnum, dstr, dim = false;
    if (i < startDow) { dnum = prevDays - startDow + 1 + i; const pm = new Date(y, mo - 2, dnum); dstr = pm.getFullYear() + "-" + pad(pm.getMonth() + 1) + "-" + pad(dnum); dim = true; }
    else if (i >= startDow + days) { dnum = i - startDow - days + 1; const nm = new Date(y, mo, dnum); dstr = nm.getFullYear() + "-" + pad(nm.getMonth() + 1) + "-" + pad(dnum); dim = true; }
    else { dnum = i - startDow + 1; dstr = y + "-" + pad(mo) + "-" + pad(dnum); }
    const list = byDate[dstr] || [];
    const hasOver = list.some((t) => t.status !== "done" && dstr < todayStr());
    const dots = list.slice(0, 4).map(() => '<i class="' + (hasOver ? "over" : "") + '"></i>').join("");
    cells += '<button type="button" class="cell' + (dim ? " dim" : "") + (dstr === todayStr() ? " today" : "") + (dstr === ui.calSel ? " sel" : "") + '" data-day="' + dstr + '">' +
      '<span class="n">' + dnum + "</span>" + (list.length ? '<span class="dots">' + dots + '</span><span class="cnt">' + list.length + "件</span>" : "") + "</button>";
  }
  const dayTasks = byDate[ui.calSel] || [];
  $("stage").innerHTML =
    '<div class="panel slidein"><h2><span class="en">SCHEDULE</span>カレンダー</h2><div class="gold-rule"></div>' +
    '<div class="calhead"><button type="button" id="calPrev">◀ PREV</button>' +
    '<span class="ym">' + y + " / " + pad(mo) + "<small>" + ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][mo - 1] + "</small></span>" +
    '<button type="button" id="calNext">NEXT ▶</button>' +
    '<button type="button" id="calToday">今日</button></div>' +
    '<div class="calgrid">' + cells + "</div>" +
    '<div class="daylist"><h3>' + fmtDate(ui.calSel) + " のタスク — " + dayTasks.length + "件</h3>" +
    (dayTasks.length
      ? dayTasks.map((t) => rowHtmlSimple(t)).join("")
      : '<div class="empty"><b>この日の決戦はない</b>期限がこの日のタスクはない。</div>') +
    "</div></div>";
  $("calPrev").addEventListener("click", () => { shiftMonthCursor(-1); });
  $("calNext").addEventListener("click", () => { shiftMonthCursor(1); });
  $("calToday").addEventListener("click", () => {
    const n = new Date(); ui.calCursor = n.getFullYear() + "-" + pad(n.getMonth() + 1); ui.calSel = todayStr();
    sCursor(); renderSchedule();
  });
  Array.prototype.forEach.call(document.querySelectorAll(".cell"), (c) => {
    c.addEventListener("click", () => { ui.calSel = c.getAttribute("data-day"); sCursor(); renderSchedule(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".daylist .trow"), (row) => {
    row.addEventListener("click", (e) => {
      const id = row.getAttribute("data-id");
      const actEl = e.target.closest("[data-act]");
      const act = actEl ? actEl.getAttribute("data-act") : "";
      if (act === "toggle") toggleTask(id, row);
      else if (act === "start") startTask(id);
      else if (act === "revert") revertTask(id);
      else openDetail(id);
    });
  });
}

export function shiftMonthCursor(d) {
  ui.calCursor = shiftMonth(ui.calCursor, d);
  sCursor(); renderSchedule();
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
