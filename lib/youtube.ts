/**
 * Watching the broadcast on YouTube.
 *
 * The site does not carry the video itself: it embeds YouTube's own player, so
 * watching counts on YouTube like any other view, and nobody has to paste a
 * link when a broadcast starts.
 *
 * Finding the broadcast takes two steps, because YouTube answers a server
 * differently from a listener's browser: reading its pages from a host such as
 * Netlify returns a stripped page with no sign of what is live. So the
 * channel's feed names the newest videos, and YouTube's own API says which of
 * them is being broadcast at this moment. Without an API key nothing is shown,
 * rather than claiming a finished sermon is live.
 */

/** The church's channel. Overridden with YOUTUBE_CHANNEL_ID if it ever changes. */
const DEFAULT_CHANNEL_ID = "UC3Obzx39hxf4XXvhFkDfWlA";

/** Channel ids are always "UC" followed by 22 more characters. */
const CHANNEL_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;

/** How long an answer is reused before YouTube is asked again. */
const CACHE_SECONDS = 120;
const TIMEOUT_MS = 6_000;
/** Newest videos to ask about. A broadcast is always among the most recent. */
const CANDIDATES = 4;

export function youtubeChannelId(): string | null {
  const configured = process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;
  return CHANNEL_PATTERN.test(configured) ? configured : null;
}

function apiKey(): string | null {
  return process.env.YOUTUBE_API_KEY?.trim() || null;
}

/** Where to watch on YouTube itself, for anyone who would rather. */
export function liveWatchUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}/live`;
}

/** YouTube's player for one video. */
export function videoEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

/** The video ids in a channel's feed, newest first. */
export function readFeedVideoIds(feed: string): string[] {
  return [...feed.matchAll(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/g)].map((match) => match[1]);
}

/** The first video the API reports as being broadcast right now. */
export function readLiveFromApi(payload: unknown): string | null {
  const items = (payload as { items?: { id?: unknown; snippet?: { liveBroadcastContent?: unknown } }[] } | null)?.items;
  if (!Array.isArray(items)) return null;
  const live = items.find((item) => item?.snippet?.liveBroadcastContent === "live");
  return typeof live?.id === "string" ? live.id : null;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function fetchFeed(channelId: string): Promise<string[]> {
  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? readFeedVideoIds(await response.text()) : [];
  } catch {
    return [];
  }
}

/**
 * The video being broadcast at this moment, or null when there is none, when
 * no API key is set, and when YouTube cannot be reached. Never throws:
 * watching is an extra, and a slow answer must not hold up the radio.
 */
export async function getLiveVideoId(channelId: string): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;

  const ids = (await fetchFeed(channelId)).slice(0, CANDIDATES);
  if (!ids.length) return null;

  // One request for all of them: a handful of ids costs the same as one.
  const payload = await fetchJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.join(",")}&key=${encodeURIComponent(key)}`,
  );
  return readLiveFromApi(payload);
}
