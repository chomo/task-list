import { LS_KEY } from "./config.js";
import { normalizeTask, normalizeSettings, validateImportData } from "./domain.js";

export function serializeState(state) {
  return JSON.stringify(state);
}

export function saveState(store, state) {
  try { store.setItem(LS_KEY, serializeState(state)); } catch (e) {}
}

export function loadState(store) {
  const state = { tasks: [], settings: normalizeSettings(null) };
  let raw = null;
  try { raw = store.getItem(LS_KEY); } catch (e) { return state; }
  if (!raw) return state;
  try {
    const d = JSON.parse(raw);
    if (d && Array.isArray(d.tasks)) {
      state.tasks = d.tasks;
      state.tasks.forEach(normalizeTask);
    }
    if (d && d.settings) {
      const merged = normalizeSettings(d.settings);
      const migrated = merged.theme !== d.settings.theme;
      state.settings = merged;
      if (migrated) saveState(store, state);
    }
  } catch (e) {}
  return state;
}

export function parseImport(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new Error("bad"); }
  return validateImportData(d);
}
