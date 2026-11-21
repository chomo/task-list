# Task List

JRPG-style task list. Daily task management as a command menu, inspired by the menu screens of Persona 3 Reload and Metaphor: ReFantazio.

## Features

- Main menu (QUESTS / NEW QUEST / SCHEDULE / RECORDS / SYSTEM) with diagonal cyan selection band, wipe transitions, and synthesized Web Audio sounds
- Tasks (quests): add, edit, complete, delete, subtasks, priorities, due dates, categories
- Start button marks a task as in progress (DOING)
- Filters, incremental search, sorting (due date / priority / created / manual drag)
- Month calendar (no week view), daily completion records
- Settings: sound, motion, data management, JSON export/import
- Default state: task list open, menu and search collapsed
- Mobile: header (date / achievement) hidden; quick-add and search live behind floating "+" and magnifier buttons so the list fills the screen

## Files

- `index.html` — single self-contained HTML file, no build step, no backend

## Open

Open `index.html` in a modern browser (Chrome / Safari, iOS Safari). Or serve it:

```sh
python3 -m http.server
```

## Data

All data stays on the device in `localStorage` under the key `tasklist-space-v1`. Nothing is sent anywhere.
