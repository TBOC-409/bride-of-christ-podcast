/**
 * Watching the broadcast on YouTube.
 *
 * The site does not carry the video itself: it embeds YouTube's own player, so
 * watching counts on YouTube like any other view, and nobody has to paste a
 * link when a broadcast starts.
 *
 * The broadcast is found by asking the channel's live page which video is on
 * air, then embedding that video. YouTube's "whatever is live on this channel"
 * address (embed/live_stream) looks simpler but often answers an embedded
 * player with "An error occurred", so it is not used.
 */

/** The church's channel. Overridden with YOUTUBE_CHANNEL_ID if it ever changes. */
const DEFAULT_CHANNEL_ID = "UC3Obzx39hxf4XXvhFkDfWlA";

/** Channel ids are always "UC" followed by 22 more characters. */
const CHANNEL_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;

/** How long a found broadcast is reused before the channel is asked again. */
const CACHE_SECONDS = 120;
const TIMEOUT_MS = 6_000;

/** YouTube answers a plain server request differently from a listener's browser. */
const VIEWER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

export function youtubeChannelId(): string | null {
  const configured = process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;
  return CHANNEL_PATTERN.test(configured) ? configured : null;
}

/** Where to watch on YouTube itself, for anyone who would rather. */
export function liveWatchUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}/live`;
}

/** YouTube's player for one video. */
export function videoEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

/** The channel's current broadcast, as YouTube's own live page names it. */
export function readLiveVideoId(page: string): string | null {
  const canonical = page.match(
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/,
  );
  if (canonical) return canonical[1];
  // Older markup names the video only in the page's own data.
  const inline = page.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  return inline ? inline[1] : null;
}

/**
 * The video on air right now, or null when nothing is live and when the
 * channel cannot be reached. Never throws: watching is an extra, and a slow
 * answer from YouTube must not hold up the radio.
 */
export async function getLiveVideoId(channelId: string): Promise<string | null> {
  try {
    const response = await fetch(liveWatchUrl(channelId), {
      headers: { "User-Agent": VIEWER_AGENT, "Accept-Language": "en" },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return readLiveVideoId(await response.text());
  } catch {
    return null;
  }
}
