/** Monotonic identity boundary; no tokens or personal data enter query keys. */
let generation = 0;
let owner: string | null = null;
export const sessionOwner = () => owner;
export const setSessionOwner = (value: string | null) => { owner = value; };
export const sessionGeneration = () => generation;
const listeners = new Set<() => void>();
export function advanceSession() {
  ++generation;
  owner = null;
  for (const listener of listeners) listener();
  return generation;
}
export function onSessionChanged(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
