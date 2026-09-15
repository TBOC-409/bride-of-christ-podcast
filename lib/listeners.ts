/**
 * A live count of people listening through this website.
 *
 * While someone's player is playing, their browser checks in every
 * HEARTBEAT_MS with an anonymous random ID. Anyone who has not checked in
 * within WINDOW_MS is no longer counted. Nothing personal is received or kept,
 * and nothing is written to disk: the count lives in memory and starts again
 * from zero whenever the site restarts or redeploys.
 *
 * It counts website listeners only. People on the Zeno app, another site that
 * embeds the stream, or the raw stream link never reach this server.
 */

/** How often a playing browser checks in. */
export const HEARTBEAT_MS = 45_000;

/**
 * How long a listener stays counted without checking in. Generous on purpose:
 * phones and background tabs slow a page's timers while the audio keeps
 * playing, so check-ins can arrive a minute or more apart.
 */
export const WINDOW_MS = 150_000;

/** A ceiling, so a flood of made-up IDs cannot grow memory without limit. */
const MAX_LISTENERS = 20_000;
const ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

type Registry = Map<string, number>;

/**
 * Kept on globalThis because Next.js can load this module separately for each
 * route. A plain module-level Map would give the check-in route and the status
 * route two different counts, and the status route would always report zero.
 */
function registry(): Registry {
  const holder = globalThis as unknown as { __bocListeners?: Registry };
  holder.__bocListeners ??= new Map();
  return holder.__bocListeners;
}

export function isListenerId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function prune(listeners: Registry, now: number): void {
  for (const [id, seen] of listeners) {
    if (now - seen > WINDOW_MS) listeners.delete(id);
  }
}

/** Mark a listener as playing now. Returns false only when the ceiling is reached. */
export function recordListening(id: string, now = Date.now()): boolean {
  const listeners = registry();
  if (!listeners.has(id) && listeners.size >= MAX_LISTENERS) {
    prune(listeners, now);
    if (listeners.size >= MAX_LISTENERS) return false;
  }
  listeners.set(id, now);
  return true;
}

export function recordStopped(id: string): void {
  registry().delete(id);
}

export function listeningNow(now = Date.now()): number {
  const listeners = registry();
  prune(listeners, now);
  return listeners.size;
}

/** Testing only. */
export function resetListeners(): void {
  registry().clear();
}
