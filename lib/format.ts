/**
 * Session dates, always shown in Ghana time.
 *
 * Pages render on the server, whose clock is UTC. Naming the zone keeps the
 * displayed time correct wherever the site is hosted.
 */
const TIME_ZONE = "Africa/Accra";

export function sessionDate(value: Date | null): string {
  if (!value) return "Date to be announced";
  return value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

export function sessionTime(value: Date | null): string {
  if (!value) return "Time to be announced";
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}
