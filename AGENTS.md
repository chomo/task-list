# AGENTS.md — task-list

JRPG-menu task list. Single-page app, ES modules, no build step, no backend.
GitHub Pages serves `index.html` at the repo root.

## File map

- `index.html` — thin shell only (markup, fonts, `styles.css`, `src/main.js`).
- `styles.css` — all CSS.
- `src/config.js` — data split out of the HTML: `MENU`, `THEMES`, `DEFAULT_SETTINGS`,
  `DEFAULT_UI`, page sizes, filter/sort options. Edit data here, not in the HTML.
- `src/domain.js` — pure task logic, no DOM / no `window` / no storage. The TDD core.
  Task CRUD, status transitions incl. the advance cycle (`nextStatus`), kanban
  grouping (`kanbanGroups`), filters/search/sort, pagination math, RECORDS
  date ranges, streak/stats, reorder, import validation.
- `src/state.js` — shared mutable `state` / `ui` singletons. Every module imports
  these same objects; mutate their properties, never rebind them.
- `src/storage.js` — `localStorage` load/save (`tasklist-space-v1`), migration
  (old `subtasks` deleted, legacy theme values mapped), JSON import/export.
- `src/themes.js` — theme class switching + accent colour.
- `src/sound.js` — Web Audio synthesized sounds. `initSound(settings)` in `main.js`;
  `sCursor()` etc. no-op before init / without audio.
- `src/burst.js` — Canvas 2D completion burst (theme accent colour).
- `src/ui.js` — DOM helpers, menu, status panel, task list, pager, FAB.
- `src/screens.js` — detail / form / kanban / records / system screens.
- `src/actions.js` — screen transitions (`goScreen`/`goBack`), start/revert/complete/advance,
  kanban status moves (`setTaskStatus`), reorder. Imports renderers from `ui.js`/`screens.js` (deferred calls only —
  the ui↔actions import cycle is safe because nothing runs at module top level).
- `src/input.js` — keyboard + touch handlers.
- `src/main.js` — init wiring only.
- `tests/test.js` — `node --test` suite for domain/storage/themes.

## Rules

- Behaviour first: same screens, same `localStorage` key/format — existing user
  data must keep loading. Migration lives in `src/storage.js` + `domain.normalizeTask`.
- TDD: a new domain behaviour gets a failing test in `tests/test.js` first,
  then the implementation in `src/domain.js`.
- No comments in code except important matters. Examples as diffs, not full code.
- Verify before PR: `npm test` (32 tests) + `npm run check` (`node --check`
  every `src/*.js`) + headless-Chrome smoke test of the built page if the
  change touches rendering (seed `localStorage`, reload, check the list /
  complete / records / theme switch).
- Workflow: topic branch, push at the end (not per commit), open a PR.
  Never merge — the owner merges PRs himself.
- The Space version (`tasukurisuto` slug) stays a single HTML file by design;
  this repo is the multi-file version. Do not re-merge them.
