import { DEFAULT_SETTINGS, THEMES } from "./config.js";

export function pad(n) { return (n < 10 ? "0" : "") + n; }

export function todayStr(now = new Date()) {
  return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
}

export function fmtDate(s) {
  if (!s) return "";
  const p = s.split("-");
  return p[0] + "/" + (+p[1]) + "/" + (+p[2]);
}

export function fmtDateTime(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export function isOverdue(t, today = todayStr()) {
  return !!(t.status !== "done" && t.dueDate && t.dueDate < today);
}

export function isToday(t, today = todayStr()) { return t.dueDate === today; }

export function priLabel(p) { return p === "high" ? "高" : p === "low" ? "低" : "通常"; }

export function statusLabel(t) {
  return t.status === "done" ? "完了" : t.status === "doing" ? "進行中" : "未完了";
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export function normalizeTheme(v) {
  if (v === "white" || v === "light") return "white";
  if (v === "blue" || v === "midnight") return "blue";
  if (v === "yellow") return "yellow";
  if (v === "red") return "red";
  return "dark";
}

export function themeAccent(theme) {
  const t = THEMES.find((x) => x.id === normalizeTheme(theme));
  return t ? t.accent : [0.54, 0.66, 0.78];
}

export function normalizeTags(v) {
  if (!Array.isArray(v)) return [];
  const seen = {}, out = [];
  v.forEach((g) => {
    if (typeof g !== "string") return;
    g = g.trim();
    if (g && !seen[g]) { seen[g] = 1; out.push(g); }
  });
  return out;
}

export function parseTags(s) {
  return normalizeTags(String(s == null ? "" : s).split(/[、,，・\s]+/));
}

export function categories(tasks) {
  const seen = {}, out = [];
  tasks.forEach((t) => { if (t.category && !seen[t.category]) { seen[t.category] = 1; out.push(t.category); } });
  return out;
}

export function allTags(tasks) {
  const seen = {}, out = [];
  tasks.forEach((t) => {
    (t.tags || []).forEach((g) => { if (g && !seen[g]) { seen[g] = 1; out.push(g); } });
  });
  return out;
}

export function openTasks(tasks) { return tasks.filter((t) => t.status !== "done"); }
export function doneTasks(tasks) { return tasks.filter((t) => t.status === "done"); }

export function createTask({ id, title, note = "", dueDate = "", priority = "normal", category = "", tags = [], now = new Date() }) {
  return {
    id, title: String(title).trim().slice(0, 100), note, dueDate,
    priority: ["high", "normal", "low"].includes(priority) ? priority : "normal",
    category: String(category).trim(), tags: normalizeTags(tags),
    status: "todo", createdAt: now.toISOString(), updatedAt: now.toISOString(), completedAt: "",
  };
}

export function touchTask(t, now = new Date()) {
  t.updatedAt = now instanceof Date ? now.toISOString() : String(now);
  return t;
}

export function normalizeTask(t) {
  if (t.status !== "done" && t.status !== "doing") t.status = "todo";
  t.tags = normalizeTags(t.tags);
  t.updatedAt = t.updatedAt || t.createdAt || new Date().toISOString();
  delete t.subtasks;
  return t;
}

export function normalizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === "object") {
    ["sound", "volume", "motion", "theme"].forEach((k) => {
      if (raw[k] !== undefined) s[k] = raw[k];
    });
  }
  s.theme = normalizeTheme(s.theme);
  return s;
}

export function nextStatus(status) {
  if (status === "todo") return "doing";
  if (status === "doing") return "done";
  return "todo";
}

export function kanbanGroups(tasks) {
  return {
    todo: tasks.filter((t) => t.status === "todo"),
    doing: tasks.filter((t) => t.status === "doing"),
    done: tasks.filter((t) => t.status === "done"),
  };
}

export function setStatus(t, status, now = new Date()) {
  t.status = status;
  t.completedAt = status === "done" ? (now instanceof Date ? now.toISOString() : String(now)) : "";
  return t;
}

export function visibleTasks(tasks, opts, today = todayStr()) {
  const { filter = "open", catFilter = "", tagFilter = "", search = "", sort = "due" } = opts;
  let list = tasks.slice();
  if (filter === "open") list = list.filter((t) => t.status !== "done");
  else if (filter === "today") list = list.filter((t) => t.status !== "done" && t.dueDate === today);
  else if (filter === "over") list = list.filter((t) => isOverdue(t, today));
  else if (filter === "cat") list = list.filter((t) => t.category === catFilter);
  else if (filter === "tag") list = list.filter((t) => (t.tags || []).indexOf(tagFilter) >= 0);
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((t) =>
      t.title.toLowerCase().indexOf(q) >= 0 || (t.note || "").toLowerCase().indexOf(q) >= 0 ||
      (t.category || "").toLowerCase().indexOf(q) >= 0 || (t.tags || []).join(" ").toLowerCase().indexOf(q) >= 0);
  }
  if (sort === "manual") return list;
  const pw = { high: 0, normal: 1, low: 2 };
  list.sort((a, b) => {
    const ao = isOverdue(a, today) ? 0 : 1, bo = isOverdue(b, today) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const ad = a.status === "done" ? 1 : 0, bd = b.status === "done" ? 1 : 0;
    if (ad !== bd) return ad - bd;
    if (sort === "due") {
      const av = a.dueDate || "9999", bv = b.dueDate || "9999";
      if (av !== bv) return av < bv ? -1 : 1;
      return pw[a.priority] - pw[b.priority];
    }
    if (sort === "priority") {
      if (pw[a.priority] !== pw[b.priority]) return pw[a.priority] - pw[b.priority];
      const av2 = a.dueDate || "9999", bv2 = b.dueDate || "9999";
      return av2 < bv2 ? -1 : av2 > bv2 ? 1 : 0;
    }
    return a.createdAt < b.createdAt ? -1 : 1;
  });
  return list;
}

export function searchConditions(opts) {
  const parts = [];
  if (opts.search) parts.push("検索「" + opts.search + "」");
  if (opts.filter !== "open") {
    const fmap = { all: "全て", today: "今日", over: "期限切れ", cat: "カテゴリ別", tag: "タグ別" };
    parts.push("表示：" + (fmap[opts.filter] || opts.filter));
    if (opts.filter === "cat" && opts.catFilter) parts.push("カテゴリ：" + opts.catFilter);
    if (opts.filter === "tag" && opts.tagFilter) parts.push("タグ：" + opts.tagFilter);
  }
  if (opts.sort !== "due") {
    const smap = { priority: "優先度順", created: "作成順", manual: "手動（ドラッグ）" };
    parts.push("並び：" + (smap[opts.sort] || opts.sort));
  }
  return parts;
}

export function groupQuests(visible, showDone, today = todayStr()) {
  const openList = visible.filter((t) => t.status !== "done");
  const doneList = visible.filter((t) => t.status === "done");
  const overList = openList.filter((t) => isOverdue(t, today));
  const restList = openList.filter((t) => !isOverdue(t, today));
  const flat = [];
  overList.forEach((t) => flat.push({ t, g: "over" }));
  restList.forEach((t) => flat.push({ t, g: "rest" }));
  if (showDone) doneList.forEach((t) => flat.push({ t, g: "done" }));
  return flat;
}

export function pagerNumbers(page, pages) {
  if (pages <= 7) {
    const out = [];
    for (let i = 1; i <= pages; i++) out.push(i);
    return out;
  }
  const nums = [1];
  if (page > 3) nums.push("…");
  for (let j = Math.max(2, page - 1); j <= Math.min(pages - 1, page + 1); j++) nums.push(j);
  if (page < pages - 2) nums.push("…");
  nums.push(pages);
  return nums;
}

export function pageCount(total, size) { return Math.max(1, Math.ceil(total / size)); }
export function pageSlice(list, page, size) { return list.slice((page - 1) * size, page * size); }

export function recDateStr(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export function recRange(filter, now = new Date()) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  if (filter === "today") return { from: recDateStr(day), to: recDateStr(day), label: "当日 — " + fmtDate(recDateStr(day)) };
  if (filter === "yesterday") {
    const y = new Date(day); y.setDate(y.getDate() - 1);
    return { from: recDateStr(y), to: recDateStr(y), label: "昨日 — " + fmtDate(recDateStr(y)) };
  }
  if (filter === "week") {
    const sun = new Date(day); sun.setDate(sun.getDate() - sun.getDay());
    const sat = new Date(sun); sat.setDate(sat.getDate() + 6);
    return { from: recDateStr(sun), to: recDateStr(sat), label: "今週 — " + fmtDate(recDateStr(sun)) + " 〜 " + fmtDate(recDateStr(sat)) };
  }
  if (filter === "month") {
    const f = new Date(day.getFullYear(), day.getMonth(), 1);
    const l = new Date(day.getFullYear(), day.getMonth() + 1, 0);
    return { from: recDateStr(f), to: recDateStr(l), label: "今月 — " + day.getFullYear() + "/" + (day.getMonth() + 1) + "月" };
  }
  return { from: "", to: "", label: "全期間" };
}

export function recFilteredDone(tasks, filter, now = new Date()) {
  const done = doneTasks(tasks).slice().sort((a, b) =>
    (b.completedAt || "") < (a.completedAt || "") ? -1 : (b.completedAt || "") > (a.completedAt || "") ? 1 : 0);
  if (filter === "all") return done;
  const r = recRange(filter, now);
  return done.filter((t) => {
    if (!t.completedAt) return false;
    const k = t.completedAt.slice(0, 10);
    return k >= r.from && k <= r.to;
  });
}

export function completionStreak(tasks, today = todayStr()) {
  const byDay = {};
  doneTasks(tasks).forEach((t) => {
    if (t.completedAt) byDay[t.completedAt.slice(0, 10)] = 1;
  });
  let streak = 0;
  const cur = new Date(today + "T00:00:00");
  if (!byDay[today]) cur.setDate(cur.getDate() - 1);
  for (;;) {
    const k = cur.getFullYear() + "-" + pad(cur.getMonth() + 1) + "-" + pad(cur.getDate());
    if (byDay[k]) { streak++; cur.setDate(cur.getDate() - 1); } else break;
  }
  return streak;
}

export function todayDoneCount(tasks, today = todayStr()) {
  return tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === today).length;
}

export function taskStats(tasks, today = todayStr()) {
  const open = openTasks(tasks), done = doneTasks(tasks), total = tasks.length;
  const next = open.filter((t) => t.dueDate)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0] || null;
  return {
    open: open.length, done: done.length, total,
    overdue: open.filter((t) => isOverdue(t, today)).length,
    todayN: open.filter((t) => isToday(t, today)).length,
    next,
  };
}

export function reorderTasks(tasks, srcId, dstId) {
  const a = tasks.findIndex((t) => t.id === srcId);
  const b = tasks.findIndex((t) => t.id === dstId);
  if (a < 0 || b < 0) return false;
  const [item] = tasks.splice(a, 1);
  tasks.splice(b, 0, item);
  return true;
}

export function moveTaskOrder(tasks, id, dir, visibleIds) {
  const vi = visibleIds.indexOf(id);
  if (vi < 0) return false;
  const target = visibleIds[vi + dir];
  if (!target) return false;
  return reorderTasks(tasks, id, target);
}

export function validateImportData(d) {
  const tasks = Array.isArray(d) ? d : d.tasks;
  if (!Array.isArray(tasks)) throw new Error("bad");
  tasks.forEach((t) => {
    if (!t.id || typeof t.title !== "string") throw new Error("bad");
    t.note = t.note || ""; t.dueDate = t.dueDate || "";
    t.priority = ["high", "normal", "low"].indexOf(t.priority) >= 0 ? t.priority : "normal";
    t.category = t.category || "";
    t.status = (t.status === "done" || t.status === "doing") ? t.status : "todo";
    t.tags = normalizeTags(t.tags);
    delete t.subtasks;
    t.createdAt = t.createdAt || new Date().toISOString();
    t.updatedAt = t.updatedAt || t.createdAt;
    t.completedAt = t.completedAt || "";
  });
  const settings = (d && !Array.isArray(d) && d.settings) ? normalizeSettings(d.settings) : null;
  return { tasks, settings };
}
