import { DEFAULT_SETTINGS, DEFAULT_UI } from "./config.js";

export const state = { tasks: [], settings: { ...DEFAULT_SETTINGS } };
export const ui = { ...DEFAULT_UI };

export function uid() {
  if (typeof window !== "undefined" && window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
