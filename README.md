# Task List

JRPG-style task list. Daily task management as a command menu, inspired by the menu screens of Persona 3 Reload and Metaphor: ReFantazio.

## Features

- Main menu (QUESTS / NEW QUEST / KANBAN / RECORDS / SYSTEM) with diagonal cyan selection band, wipe transitions, and synthesized Web Audio sounds
- Tasks (quests): add, edit, complete, delete, tags, priorities, due dates, categories
- Detail screen is read-only (status, priority, due date, category, created/completed dates, note, tags) with an Edit button; editing happens on a separate form screen that returns to the detail view after saving
- Kanban board (KANBAN): 3 status columns (未完了 / 進行中 / 完了), drag cards between columns on PC (touch drag + ◀▶ move buttons), status tabs on mobile only, per-column pager
- Diamond button (◇) on a task row advances to the next status (未完了 → 進行中 → 完了 → 未完了); COMPLETE effect and completedAt are recorded only when entering 完了
- Tags: multiple tags per task, free input (comma/space separated); filter the list by tag
- Priority badge (高 / 通常 / 低) on every task list row
- Theme: dark (default, generic dark mode) / blue (original deep blue) / white / yellow (bright yellow-based, amber diagonal band, gold accent, dark brown text) / red (red-based dark theme, deep crimson background, red diagonal band), switchable in SYSTEM, saved in localStorage; old dark migrates to dark, old blue/midnight migrates to blue
- Start button marks a task as in progress (DOING)
- Filters, incremental search, sorting (due date / priority / created / manual drag)
- RECORDS shows a list of completed tasks, default filter today (today / yesterday / this week / this month / all), no daily graph
- Pagination: 5 items per page on mobile, 30 on PC (task list, RECORDS, and kanban columns)
- Completion burst: Canvas 2D particle burst at the completed task's position (theme-tinted); no WebGPU background — the background is CSS only
- Settings: sound, motion, data management, JSON export/import
- Default state: task list open, menu and search collapsed
- Mobile: header (date / achievement) hidden; quick-add and search live behind floating "+" and magnifier buttons so the list fills the screen

## Files

```
index.html      thin shell: markup + <link> to styles.css + <script type="module" src="./src/main.js">
styles.css      all CSS (was the inline <style> block)
src/
  config.js     data split out of the HTML: MENU, THEMES, defaults, page sizes, filters
  domain.js     pure task logic, no DOM / no storage — the TDD core (see tests/)
  state.js      shared mutable state + ui singletons
  storage.js    localStorage load/save, migration, JSON import/export
  themes.js     theme class switching + accent colour
  sound.js      Web Audio synthesized sounds
  burst.js      Canvas 2D completion burst
  ui.js         DOM helpers, menu, status panel, task list, pager, FAB
  screens.js    detail / form / kanban / records / system screens
  actions.js    screen transitions, start/revert/complete/advance, kanban status moves, reorder
  input.js      keyboard + touch handlers
  main.js       init wiring
tests/
  test.js       node --test suite for domain/storage/themes (32 tests)
package.json    { "type": "module", "test": "node --test tests/test.js" }
AGENTS.md       guide for future AI work on this repo
```

No build step, no backend. ES modules with relative paths — works on GitHub Pages and from `file://`.

## Develop

```sh
npm test    # node --test tests/test.js (domain / storage / themes)
npm run check  # node --check on every src/*.js file
```

Pure logic lives in `src/domain.js` and is tested first (TDD): add a failing
test for a new behaviour, then implement it. UI code in `src/ui.js` /
`src/screens.js` renders from the shared `state`/`ui` singletons in
`src/state.js`; screen transitions and task actions live in `src/actions.js`.
Never commit to `main` — work on a topic branch and open a PR; the owner
merges PRs himself.

## Open

Open `index.html` in a modern browser (Chrome / Safari, iOS Safari). Or serve it:

```sh
python3 -m http.server
```

## Data

All data stays on the device in `localStorage` under the key `tasklist-space-v1`. Nothing is sent anywhere.
