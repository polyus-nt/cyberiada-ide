import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { create } from 'zustand';

// Each document and simulation mode owns its drafts and last execution separately.
export const SimulatorStateContext = createContext<string | undefined>(undefined);
export const simulatorSessionState = create(() => ({ values: {} as Record<string, unknown> }));
const storagePrefix = 'simulator-drafts:v1:';
const documentKeys = new WeakMap<object, string>();

export function getSimulatorDocumentKey(document: { basename?: string | null }): string {
  const previous = documentKeys.get(document);
  const key = document.basename ?? previous ?? `unsaved:${crypto.randomUUID()}`;
  if (previous && previous !== key) {
    // Saving an untitled document or using Save As keeps its current simulator state.
    const rename = (entry: string) => {
      const [scope, name] = JSON.parse(entry) as [string, string];
      return scope === previous || scope === `${previous}:single` || scope === `${previous}:joint`
        ? JSON.stringify([key + scope.slice(previous.length), name])
        : undefined;
    };
    const values = { ...simulatorSessionState.getState().values };
    for (const [entry, value] of Object.entries(values)) {
      const target = rename(entry);
      if (target) values[target] = value;
    }
    simulatorSessionState.setState({ values });
    try {
      for (const entry of Object.keys(localStorage)) {
        if (!entry.startsWith(storagePrefix)) continue;
        const target = rename(entry.slice(storagePrefix.length));
        const value = localStorage.getItem(entry);
        if (target && value !== null) localStorage.setItem(storagePrefix + target, value);
      }
    } catch {
      // Memory still retains the state when persistent storage is unavailable.
    }
  }
  documentKeys.set(document, key);
  return key;
}

export function useSimulatorState<T>(
  name: string,
  initial: T | (() => T),
  persist = true
): [T, Dispatch<SetStateAction<T>>] {
  const scope = useContext(SimulatorStateContext);
  const key = scope === undefined ? undefined : JSON.stringify([scope, name]);
  const [fallback, setFallback] = useState<T>(() => {
    if (key !== undefined) {
      const values = simulatorSessionState.getState().values;
      if (Object.prototype.hasOwnProperty.call(values, key)) return values[key] as T;
      if (persist) {
        try {
          const saved = localStorage.getItem(storagePrefix + key);
          if (saved !== null) return JSON.parse(saved) as T;
        } catch {
          // An unavailable or damaged cache must not prevent opening the simulator.
        }
      }
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });
  const value = simulatorSessionState((state) =>
    key !== undefined && Object.prototype.hasOwnProperty.call(state.values, key)
      ? (state.values[key] as T)
      : fallback
  );
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (update) => {
      if (key === undefined) {
        setFallback(update);
        return;
      }
      const values = simulatorSessionState.getState().values;
      const current = Object.prototype.hasOwnProperty.call(values, key)
        ? (values[key] as T)
        : fallbackRef.current;
      const next = typeof update === 'function' ? (update as (previous: T) => T)(current) : update;
      simulatorSessionState.setState({ values: { ...values, [key]: next } });
      if (persist) {
        try {
          if (next === undefined) localStorage.removeItem(storagePrefix + key);
          else localStorage.setItem(storagePrefix + key, JSON.stringify(next));
        } catch {
          // Retain the in-memory draft even if persistent storage is unavailable or full.
        }
      }
    },
    [key, persist]
  );
  return [value, setValue];
}
