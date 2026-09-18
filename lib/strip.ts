/**
 * The wording on the scrolling strip under the header.
 *
 * Church staff write it in the church portal, under Website > Radio strip, and
 * this site reads it from the church site. Nothing is stored here. If the
 * church site is unreachable, or has nothing set, the wording below is used, so
 * the strip is never empty and the radio is never held up by it.
 */

export const DEFAULT_STRIP_LINES = [
  "Live around the clock",
  "Church programmes most days",
  "Gospel music in between",
];

/** How long the wording is reused before the church site is asked again. */
const CACHE_SECONDS = 300;
const TIMEOUT_MS = 4_000;
const MAX_LINE = 120;
const MAX_LINES = 8;

export function churchSiteUrl(): string | null {
  return process.env.CHURCH_SITE_URL?.trim().replace(/\/$/, "") || null;
}

/** Keeps only readable lines, so a stray value cannot stretch the strip. */
export function readLines(payload: unknown): string[] {
  const lines = (payload as { lines?: unknown } | null)?.lines;
  if (!Array.isArray(lines)) return [];
  return lines
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.trim().slice(0, MAX_LINE))
    .filter(Boolean)
    .slice(0, MAX_LINES);
}

/** The lines to scroll. Never throws, never empty. */
export async function getStripLines(): Promise<string[]> {
  const site = churchSiteUrl();
  if (!site) return DEFAULT_STRIP_LINES;
  try {
    const response = await fetch(`${site}/api/radio-strip`, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return DEFAULT_STRIP_LINES;
    const lines = readLines(await response.json());
    return lines.length ? lines : DEFAULT_STRIP_LINES;
  } catch {
    // The church site is unreachable or slow: keep the site's own wording.
    return DEFAULT_STRIP_LINES;
  }
}
