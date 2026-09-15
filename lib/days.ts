/**
 * Days for the notepad.
 *
 * Programmes are broadcast from Ghana, so a day's notes follow Ghana's calendar.
 * A listener abroad who is still writing past their own midnight keeps the
 * whole programme on one page.
 */
export const PROGRAMME_TIME_ZONE = "Africa/Accra";

/** Browser storage key prefix. One entry per day that has notes. */
export const NOTE_PREFIX = "boc-podcast-notes-day-";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PROGRAMME_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The day as YYYY-MM-DD in Ghana. */
export function dayKey(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

export function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function noonUtc(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12);
}

/** "Today", "Yesterday", or a short date such as "Mon, Sep 14, 2026". */
export function dayLabel(key: string, today: string = dayKey()): string {
  if (!isDayKey(key) || !isDayKey(today)) return key;
  const daysAgo = Math.round((noonUtc(today) - noonUtc(key)) / 86_400_000);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return new Date(noonUtc(key)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
