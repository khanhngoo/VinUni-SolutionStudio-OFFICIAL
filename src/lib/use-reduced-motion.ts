"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * The OS "reduce motion" setting, as state.
 *
 * The server snapshot is `false` so the markup matches a default browser, and
 * the first client render corrects it — the alternative, guessing `true`, would
 * make every animation flicker off on hydration for the majority who never set
 * the preference.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
