import test from "node:test";
import assert from "node:assert/strict";
import {
  pad, todayStr, fmtDate, fmtDateTime, isOverdue, isToday,
  priLabel, statusLabel, esc, normalizeTheme, normalizeTags, parseTags,
  categories, allTags, openTasks, doneTasks, createTask, normalizeTask,
  normalizeSettings, visibleTasks, searchConditions, pagerNumbers,
  pageCount, pageSlice, recRange, recFilteredDone, completionStreak,
  taskStats, todayDoneCount, reorderTasks, moveTaskOrder, setStatus, groupQuests,
  nextStatus, kanbanGroups, touchTask,
} from "../src/domain.js";
import { PAGE_SIZE_MOBILE, PAGE_SIZE_PC } from "../src/config.js";
import { saveState, loadState, serializeState, parseImport } from "../src/storage.js";
import { applyTheme, accentRGB } from "../src/themes.js";

const T = "2026-11-21";
const mk = (o) => ({
  id: o.id || "t1", title: o.title || "x", note: o.note || "", dueDate: o.dueDate || "",
  priority: o.priority || "normal", category: o.category || "", tags: o.tags || [],
  status: o.status || "todo", createdAt: o.createdAt || "2026-11-20T09:00:00.000Z",
  updatedAt: o.updatedAt, completedAt: o.completedAt || "",
});
const fakeStore = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
};

/* ---------- dates / labels ---------- */
test("pad/fmtDate/fmtDateTime", () => {
  assert.equal(pad(3), "03");
  assert.equal(pad(12), "12");
  assert.equal(fmtDate("2026-11-21"), "2026/11/21");
  assert.equal(fmtDate(""), "");
  assert.equal(fmtDateTime("2026-11-21T09:05:00.000Z"), "2026/11/21 09:05");
  assert.equal(fmtDateTime(""), "");
  assert.equal(fmtDateTime("garbage"), "garbage");
  assert.equal(todayStr(new Date(2026, 10, 21)), "2026-11-21");
});

test("isOverdue/isToday use the given day", () => {
  assert.equal(isOverdue(mk({ dueDate: "2026-11-20" }), T), true);
  assert.equal(isOverdue(mk({ dueDate: "2026-11-21" }), T), false);
  assert.equal(isOverdue(mk({ dueDate: "2026-11-20", status: "done" }), T), false);
  assert.equal(isOverdue(mk({}), T), false);
  assert.equal(isToday(mk({ dueDate: "2026-11-21" }), T), true);
  assert.equal(isToday(mk({ dueDate: "2026-11-20" }), T), false);
});

test("priLabel/statusLabel/esc", () => {
  assert.equal(priLabel("high"), "高");
  assert.equal(priLabel("low"), "低");
  assert.equal(priLabel("normal"), "通常");
  assert.equal(priLabel("weird"), "通常");
  assert.equal(statusLabel(mk({ status: "done" })), "完了");
  assert.equal(statusLabel(mk({ status: "doing" })), "進行中");
  assert.equal(statusLabel(mk({})), "未完了");
  assert.equal(esc('<a href="x">&\'</a>'), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  assert.equal(esc(null), "");
});

/* ---------- themes ---------- */
test("normalizeTheme migrates legacy values", () => {
  assert.equal(normalizeTheme("white"), "white");
  assert.equal(normalizeTheme("light"), "white");
  assert.equal(normalizeTheme("blue"), "blue");
  assert.equal(normalizeTheme("midnight"), "blue");
  assert.equal(normalizeTheme("yellow"), "yellow");
  assert.equal(normalizeTheme("red"), "red");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("bogus"), "dark");
  assert.equal(normalizeTheme(undefined), "dark");
});

test("applyTheme toggles exactly one theme class", () => {
  const cls = new Set(["theme-blue"]);
  const list = {
    toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); },
    contains: (c) => cls.has(c),
  };
  applyTheme(list, "red");
  assert.deepEqual([...cls].sort(), ["theme-red"]);
  applyTheme(list, "bogus");
  assert.deepEqual([...cls].sort(), ["theme-dark"]);
});

test("accentRGB differs per theme", () => {
  assert.deepEqual(accentRGB("blue"), [0.0, 0.83, 1.0]);
  assert.deepEqual(accentRGB("red"), [1.0, 0.42, 0.42]);
  assert.deepEqual(accentRGB("yellow"), [0.96, 0.72, 0.0]);
  assert.deepEqual(accentRGB("white"), [0.0, 0.56, 0.72]);
  assert.deepEqual(accentRGB("dark"), [0.54, 0.66, 0.78]);
  assert.deepEqual(accentRGB("bogus"), [0.54, 0.66, 0.78]);
});

/* ---------- tags ---------- */
test("normalizeTags dedups and trims", () => {
  assert.deepEqual(normalizeTags([" a ", "a", "", "b", 3, null]), ["a", "b"]);
  assert.deepEqual(normalizeTags("nope"), []);
  assert.deepEqual(normalizeTags(undefined), []);
});

test("parseTags splits on comma/space/Japanese separators", () => {
  assert.deepEqual(parseTags("仕事, 買い物 急ぎ"), ["仕事", "買い物", "急ぎ"]);
  assert.deepEqual(parseTags("a、b，c・d"), ["a", "b", "c", "d"]);
  assert.deepEqual(parseTags(""), []);
  assert.deepEqual(parseTags(null), []);
});

test("categories/allTags collect in first-seen order", () => {
  const ts = [mk({ category: "仕事" }), mk({ category: "" }), mk({ category: "仕事" }), mk({ category: "家" })];
  assert.deepEqual(categories(ts), ["仕事", "家"]);
  const ts2 = [mk({ tags: ["a", "b"] }), mk({ tags: ["b", "c"] })];
  assert.deepEqual(allTags(ts2), ["a", "b", "c"]);
});

/* ---------- task factory / migration ---------- */
test("createTask fills defaults", () => {
  const t = createTask({ id: "x1", title: "hello" });
  assert.equal(t.status, "todo");
  assert.equal(t.priority, "normal");
  assert.deepEqual(t.tags, []);
  assert.equal(t.completedAt, "");
  assert.ok(t.createdAt);
  const t2 = createTask({ id: "x2", title: "  spaced  ", priority: "high", tags: ["a", "a"] });
  assert.equal(t2.title, "spaced");
  assert.deepEqual(t2.tags, ["a"]);
});

test("createTask sets updatedAt = createdAt", () => {
  const t = createTask({ id: "x1", title: "hello", now: new Date("2026-11-21T10:00:00.000Z") });
  assert.equal(t.createdAt, "2026-11-21T10:00:00.000Z");
  assert.equal(t.updatedAt, "2026-11-21T10:00:00.000Z");
});

test("touchTask stamps updatedAt", () => {
  const t = mk({ updatedAt: "2026-11-20T09:00:00.000Z" });
  touchTask(t, new Date("2026-11-21T10:00:00.000Z"));
  assert.equal(t.updatedAt, "2026-11-21T10:00:00.000Z");
  touchTask(t, "2026-11-21T11:00:00.000Z");
  assert.equal(t.updatedAt, "2026-11-21T11:00:00.000Z");
});

test("normalizeTask backfills updatedAt from createdAt", () => {
  const t = mk({});
  delete t.updatedAt;
  normalizeTask(t);
  assert.equal(t.updatedAt, "2026-11-20T09:00:00.000Z");
  const kept = mk({ updatedAt: "2026-11-21T08:00:00.000Z" });
  normalizeTask(kept);
  assert.equal(kept.updatedAt, "2026-11-21T08:00:00.000Z");
});

test("loadState backfills updatedAt for legacy tasks", () => {
  const store = fakeStore();
  const old = { tasks: [mk({ id: "o", title: "old" })], settings: {} };
  delete old.tasks[0].updatedAt;
  store.setItem("tasklist-space-v1", JSON.stringify(old));
  const loaded = loadState(store);
  assert.equal(loaded.tasks[0].updatedAt, "2026-11-20T09:00:00.000Z");
});

test("parseImport backfills updatedAt from createdAt", () => {
  const t = mk({ id: "a" });
  delete t.updatedAt;
  const ok = parseImport(JSON.stringify({ tasks: [t] }));
  assert.equal(ok.tasks[0].updatedAt, "2026-11-20T09:00:00.000Z");
  const kept = mk({ id: "b", updatedAt: "2026-11-21T08:00:00.000Z" });
  const ok2 = parseImport(JSON.stringify([kept]));
  assert.equal(ok2.tasks[0].updatedAt, "2026-11-21T08:00:00.000Z");
});

test("normalizeTask migrates old data (bad status, subtasks, raw tags)", () => {
  const t = mk({ status: "weird", tags: "not-array" });
  t.subtasks = [{ title: "old" }];
  normalizeTask(t);
  assert.equal(t.status, "todo");
  assert.deepEqual(t.tags, []);
  assert.equal("subtasks" in t, false);
  const d = mk({ status: "done" });
  normalizeTask(d);
  assert.equal(d.status, "done");
});

test("normalizeSettings keeps known keys and migrates theme", () => {
  const s = normalizeSettings({ sound: false, volume: 3, theme: "midnight", junk: 1 });
  assert.equal(s.sound, false);
  assert.equal(s.volume, 3);
  assert.equal(s.theme, "blue");
  assert.equal(s.junk, undefined);
  assert.equal(s.motion, true);
});

/* ---------- status transitions ---------- */
test("setStatus completes and reverts", () => {
  const t = mk({});
  setStatus(t, "doing", "2026-11-21T10:00:00.000Z");
  assert.equal(t.status, "doing");
  assert.equal(t.completedAt, "");
  setStatus(t, "done", "2026-11-21T10:05:00.000Z");
  assert.equal(t.status, "done");
  assert.equal(t.completedAt, "2026-11-21T10:05:00.000Z");
  setStatus(t, "todo", "2026-11-21T10:06:00.000Z");
  assert.equal(t.status, "todo");
  assert.equal(t.completedAt, "");
});

/* ---------- visibleTasks: filter / search / sort ---------- */
const sample = () => [
  mk({ id: "a", title: "buy milk", dueDate: "2026-11-20", priority: "low", category: "家", tags: ["買い物"] }),
  mk({ id: "b", title: "report", note: "urgent memo", dueDate: "2026-11-21", priority: "high", category: "仕事", tags: ["急ぎ"] }),
  mk({ id: "c", title: "call", dueDate: "2026-11-25", priority: "normal", status: "doing" }),
  mk({ id: "d", title: "done one", status: "done", completedAt: "2026-11-21T08:00:00.000Z" }),
  mk({ id: "e", title: "no date", priority: "high" }),
];
const base = { filter: "open", catFilter: "", tagFilter: "", search: "", sort: "due" };

test("visibleTasks filters", () => {
  const ts = sample();
  assert.deepEqual(visibleTasks(ts, { ...base }).map((t) => t.id), ["a", "b", "c", "e"]);
  assert.deepEqual(visibleTasks(ts, { ...base, filter: "all" }).map((t) => t.id), ["a", "b", "c", "e", "d"]);
  assert.deepEqual(visibleTasks(ts, { ...base, filter: "today" }).map((t) => t.id), ["b"]);
  assert.deepEqual(visibleTasks(ts, { ...base, filter: "over" }).map((t) => t.id), ["a"]);
  assert.deepEqual(visibleTasks(ts, { ...base, filter: "cat", catFilter: "仕事" }).map((t) => t.id), ["b"]);
  assert.deepEqual(visibleTasks(ts, { ...base, filter: "tag", tagFilter: "買い物" }).map((t) => t.id), ["a"]);
});

test("visibleTasks search hits title/note/category/tags", () => {
  const ts = sample();
  assert.deepEqual(visibleTasks(ts, { ...base, search: "MILK" }).map((t) => t.id), ["a"]);
  assert.deepEqual(visibleTasks(ts, { ...base, search: "urgent" }).map((t) => t.id), ["b"]);
  assert.deepEqual(visibleTasks(ts, { ...base, search: "仕事" }).map((t) => t.id), ["b"]);
  assert.deepEqual(visibleTasks(ts, { ...base, search: "急ぎ" }).map((t) => t.id), ["b"]);
  assert.deepEqual(visibleTasks(ts, { ...base, search: "zzz" }), []);
});

test("visibleTasks sorts overdue first, done last, due then priority", () => {
  const ts = sample();
  assert.deepEqual(visibleTasks(ts, { ...base, sort: "priority" }).map((t) => t.id), ["a", "b", "e", "c"]);
  assert.deepEqual(visibleTasks(ts, { ...base, sort: "created" }).map((t) => t.id), ["a", "b", "c", "e"]);
  const manual = visibleTasks(ts, { ...base, sort: "manual" });
  assert.deepEqual(manual.map((t) => t.id), ["a", "b", "c", "e"]);
});

test("searchConditions lists active conditions", () => {
  assert.deepEqual(searchConditions({ ...base }), []);
  assert.deepEqual(searchConditions({ ...base, search: "x", sort: "priority" }), ["検索「x」", "並び：優先度順"]);
  assert.deepEqual(searchConditions({ ...base, filter: "tag", tagFilter: "急ぎ" }), ["表示：タグ別", "タグ：急ぎ"]);
});

test("groupQuests orders overdue, rest, done", () => {
  const vis = visibleTasks(sample(), { ...base, filter: "all" });
  const flat = groupQuests(vis, true);
  assert.deepEqual(flat.map((f) => f.t.id + ":" + f.g), ["a:over", "b:rest", "c:rest", "e:rest", "d:done"]);
  assert.deepEqual(groupQuests(vis, false).map((f) => f.t.id), ["a", "b", "c", "e"]);
});

/* ---------- pagination ---------- */
test("pagerNumbers ellides long ranges", () => {
  assert.deepEqual(pagerNumbers(1, 1), [1]);
  assert.deepEqual(pagerNumbers(1, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(pagerNumbers(1, 10), [1, 2, "…", 10]);
  assert.deepEqual(pagerNumbers(5, 10), [1, "…", 4, 5, 6, "…", 10]);
  assert.deepEqual(pagerNumbers(10, 10), [1, "…", 9, 10]);
  assert.deepEqual(pagerNumbers(2, 10), [1, 2, 3, "…", 10]);
});

test("pageCount/pageSlice", () => {
  assert.equal(pageCount(0, 10), 1);
  assert.equal(pageCount(35, 10), 4);
  assert.equal(pageCount(30, 30), 1);
  assert.deepEqual(pageSlice([1, 2, 3, 4, 5], 2, 2), [3, 4]);
  assert.deepEqual(pageSlice([1, 2, 3], 5, 2), []);
});

/* ---------- records ---------- */
const fixedNow = new Date(2026, 10, 21, 12, 0, 0); // Saturday 2026-11-21

test("recRange covers today/yesterday/week/month/all", () => {
  assert.deepEqual(recRange("today", fixedNow), { from: "2026-11-21", to: "2026-11-21", label: "当日 — 2026/11/21" });
  assert.deepEqual(recRange("yesterday", fixedNow), { from: "2026-11-20", to: "2026-11-20", label: "昨日 — 2026/11/20" });
  const w = recRange("week", fixedNow);
  assert.equal(w.from, "2026-11-15"); // Sunday
  assert.equal(w.to, "2026-11-21");
  const m = recRange("month", fixedNow);
  assert.equal(m.from, "2026-11-01");
  assert.equal(m.to, "2026-11-30");
  assert.deepEqual(recRange("all", fixedNow), { from: "", to: "", label: "全期間" });
});

test("recFilteredDone filters by completed date, newest first", () => {
  const ts = [
    mk({ id: "a", status: "done", completedAt: "2026-11-21T08:00:00.000Z" }),
    mk({ id: "b", status: "done", completedAt: "2026-11-20T08:00:00.000Z" }),
    mk({ id: "c", status: "done", completedAt: "2026-11-15T08:00:00.000Z" }),
    mk({ id: "d", status: "done", completedAt: "" }),
    mk({ id: "e", status: "todo" }),
  ];
  assert.deepEqual(recFilteredDone(ts, "today", fixedNow).map((t) => t.id), ["a"]);
  assert.deepEqual(recFilteredDone(ts, "yesterday", fixedNow).map((t) => t.id), ["b"]);
  assert.deepEqual(recFilteredDone(ts, "week", fixedNow).map((t) => t.id), ["a", "b", "c"]);
  assert.deepEqual(recFilteredDone(ts, "month", fixedNow).map((t) => t.id), ["a", "b", "c"]);
  assert.deepEqual(recFilteredDone(ts, "all", fixedNow).map((t) => t.id), ["a", "b", "c", "d"]);
});

test("completionStreak counts back from today (or yesterday)", () => {
  const by = (days) => days.map((d, i) => mk({ id: "s" + i, status: "done", completedAt: d + "T08:00:00.000Z" }));
  assert.equal(completionStreak(by(["2026-11-21", "2026-11-20", "2026-11-19"]), T), 3);
  assert.equal(completionStreak(by(["2026-11-20", "2026-11-19"]), T), 2);
  assert.equal(completionStreak(by(["2026-11-19"]), T), 0);
  assert.equal(completionStreak([], T), 0);
});

test("taskStats counts open/done/overdue/today/next (no rate)", () => {
  const s = taskStats(sample(), T);
  assert.equal(s.open, 4);
  assert.equal(s.done, 1);
  assert.equal(s.total, 5);
  assert.equal("rate" in s, false);
  assert.equal(s.overdue, 1);
  assert.equal(s.todayN, 1);
  assert.equal(s.next.id, "a");
  assert.equal(taskStats([], T).next, null);
});

test("todayDoneCount counts tasks completed today only", () => {
  const ts = [
    mk({ id: "a", status: "done", completedAt: "2026-11-21T08:00:00.000Z" }),
    mk({ id: "b", status: "done", completedAt: "2026-11-20T08:00:00.000Z" }),
    mk({ id: "c", status: "done", completedAt: "" }),
    mk({ id: "d", status: "todo" }),
  ];
  assert.equal(todayDoneCount(ts, T), 1);
  assert.equal(todayDoneCount([], T), 0);
});

test("nextStatus cycles todo -> doing -> done -> todo", () => {
  assert.equal(nextStatus("todo"), "doing");
  assert.equal(nextStatus("doing"), "done");
  assert.equal(nextStatus("done"), "todo");
  assert.equal(nextStatus("bogus"), "todo");
});

test("kanbanGroups splits by status, keeps order", () => {
  const ts = [mk({ id: "a", status: "todo" }), mk({ id: "b", status: "doing" }), mk({ id: "c", status: "done" }), mk({ id: "d", status: "todo" })];
  const g = kanbanGroups(ts);
  assert.deepEqual(g.todo.map((t) => t.id), ["a", "d"]);
  assert.deepEqual(g.doing.map((t) => t.id), ["b"]);
  assert.deepEqual(g.done.map((t) => t.id), ["c"]);
});

test("page sizes: mobile 5, PC 30", () => {
  assert.equal(PAGE_SIZE_MOBILE, 5);
  assert.equal(PAGE_SIZE_PC, 30);
});

/* ---------- reorder ---------- */
test("reorderTasks/moveTaskOrder", () => {
  const ts = [mk({ id: "a" }), mk({ id: "b" }), mk({ id: "c" })];
  reorderTasks(ts, "a", "c");
  assert.deepEqual(ts.map((t) => t.id), ["b", "c", "a"]);
  reorderTasks(ts, "zzz", "a");
  assert.deepEqual(ts.map((t) => t.id), ["b", "c", "a"]);
  const ts2 = [mk({ id: "a" }), mk({ id: "b" }), mk({ id: "c" })];
  assert.equal(moveTaskOrder(ts2, "b", -1, ["a", "b", "c"]), true);
  assert.deepEqual(ts2.map((t) => t.id), ["b", "a", "c"]);
  assert.equal(moveTaskOrder(ts2, "b", -1, ["b", "a", "c"]), false);
});

/* ---------- storage ---------- */
test("saveState/loadState round-trip keeps tasks and settings", () => {
  const store = fakeStore();
  const state = { tasks: [mk({ id: "a", tags: ["x"] })], settings: { sound: false, volume: 3, motion: true, theme: "red" } };
  saveState(store, state);
  const loaded = loadState(store);
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].tags[0], "x");
  assert.equal(loaded.settings.theme, "red");
  assert.equal(loaded.settings.volume, 3);
});

test("loadState migrates old data and survives corrupt JSON", () => {
  const store = fakeStore();
  const old = { tasks: [{ id: "o", title: "old", status: "weird", subtasks: [1], tags: ["a", "a"] }], settings: { theme: "midnight" } };
  store.setItem("tasklist-space-v1", JSON.stringify(old));
  const loaded = loadState(store);
  assert.equal(loaded.tasks[0].status, "todo");
  assert.equal("subtasks" in loaded.tasks[0], false);
  assert.deepEqual(loaded.tasks[0].tags, ["a"]);
  assert.equal(loaded.settings.theme, "blue");
  store.setItem("tasklist-space-v1", "{broken");
  const fallback = loadState(store);
  assert.deepEqual(fallback.tasks, []);
  assert.equal(fallback.settings.theme, "dark");
  const empty = loadState(fakeStore());
  assert.deepEqual(empty.tasks, []);
});

test("serializeState produces the same key/format as the old app", () => {
  const s = serializeState({ tasks: [mk({ id: "a" })], settings: { sound: true, volume: 2, motion: true, theme: "dark" } });
  const d = JSON.parse(s);
  assert.equal(d.tasks[0].id, "a");
  assert.equal(d.settings.theme, "dark");
});

test("parseImport validates tasks and normalizes them", () => {
  const ok = parseImport(JSON.stringify({ tasks: [mk({ id: "a", status: "bad" })], settings: { theme: "light" } }));
  assert.equal(ok.tasks[0].status, "todo");
  assert.equal(ok.settings.theme, "white");
  const arr = parseImport(JSON.stringify([mk({ id: "b" })]));
  assert.equal(arr.tasks.length, 1);
  assert.throws(() => parseImport(JSON.stringify({ tasks: [{ title: "no id" }] })), /bad/);
  assert.throws(() => parseImport(JSON.stringify({ tasks: "nope" })), /bad/);
  assert.throws(() => parseImport("not json"), /bad/);
});
