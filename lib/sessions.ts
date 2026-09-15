import { prisma } from "@/lib/db";

/**
 * What a listener is allowed to see about a session.
 *
 * The stream address is absent on purpose. It is handed out only by the stream
 * route, only at the moment someone presses play, and only while the session is
 * live, so it never sits in a page's source for anyone to copy.
 */
const LISTENER_FIELDS = {
  id: true,
  title: true,
  description: true,
  hostName: true,
  status: true,
  scheduledAt: true,
} as const;

/** Live first, then upcoming soonest first. */
export function liveAndUpcomingSessions() {
  return prisma.podcastSession.findMany({
    where: { published: true, status: { in: ["LIVE", "SCHEDULED"] } },
    orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
    select: LISTENER_FIELDS,
  });
}

export function publishedSession(id: string) {
  return prisma.podcastSession.findFirst({
    where: { id, published: true },
    select: LISTENER_FIELDS,
  });
}

/** The Icecast mount for a session, but only while it is actually live. */
export function liveStream(id: string) {
  return prisma.podcastSession.findFirst({
    where: { id, published: true, status: "LIVE" },
    select: { streamUrl: true },
  });
}

/** Every published session, for the sitemap. */
export function sessionsForSitemap() {
  return prisma.podcastSession.findMany({
    where: { published: true },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
}
