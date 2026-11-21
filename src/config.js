export const LS_KEY = "tasklist-space-v1";

export const MENU = [
  { id: "quests", en: "TASKS", ja: "タスク一覧", desc: "未完了のタスクを確認する" },
  { id: "new", en: "NEW TASK", ja: "新規追加", desc: "新たなタスクを追加する" },
  { id: "kanban", en: "KANBAN", ja: "かんばん", desc: "ステータス別にタスクを並べる" },
  { id: "records", en: "RECORDS", ja: "記録", desc: "完了したタスクを確認する" },
  { id: "system", en: "SYSTEM", ja: "設定", desc: "音・演出・データを管理する" },
];

export const KANBAN_COLS = [
  { status: "todo", en: "TODO", ja: "未完了" },
  { status: "doing", en: "DOING", ja: "進行中" },
  { status: "done", en: "DONE", ja: "完了" },
];

export const THEMES = [
  { id: "blue", label: "ブルー", desc: "ディープブルー基調", accent: [0.0, 0.83, 1.0] },
  { id: "dark", label: "ダーク", desc: "一般的なダークモード", accent: [0.54, 0.66, 0.78] },
  { id: "white", label: "ホワイト", desc: "白基調", accent: [0.0, 0.56, 0.72] },
  { id: "yellow", label: "イエロー", desc: "黄色基調", accent: [0.96, 0.72, 0.0] },
  { id: "red", label: "レッド", desc: "赤基調", accent: [1.0, 0.42, 0.42] },
];

export const DEFAULT_SETTINGS = { sound: true, volume: 2, motion: true, theme: "dark" };

export const DEFAULT_UI = {
  screen: "quests", menuIndex: 0, menuFocus: false, menuOpen: false,
  filter: "open", sort: "due", catFilter: "", tagFilter: "", search: "", searchOpen: false, quickOpen: false,
  showDone: false, kbIndex: 0, editId: null,
  formPriority: "normal", warnedFor: "", recFilter: "today", page: 1, recPage: 1,
  kbTab: "all", kbPageTodo: 1, kbPageDoing: 1, kbPageDone: 1,
};

export const PAGE_SIZE_MOBILE = 5;
export const PAGE_SIZE_PC = 30;
export const PAGE_BREAKPOINT_PX = 639;

export const REC_FILTERS = [
  ["today", "当日"], ["yesterday", "昨日"], ["week", "今週"], ["month", "今月"], ["all", "全て"],
];

export const SORT_OPTIONS = [
  ["due", "期限順"], ["priority", "優先度順"], ["created", "作成順"], ["manual", "手動（ドラッグ）"],
];

export const FILTER_CHIPS = [
  ["open", "未完了"], ["all", "全て"], ["today", "今日"], ["over", "期限切れ"], ["cat", "カテゴリ別"], ["tag", "タグ別"],
];
