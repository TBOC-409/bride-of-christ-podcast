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
 *
 * The live page answers with the newest video when nothing is being broadcast,
 * so the video is only shown once YouTube itself says it is live right now.
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

/** YouTube says this of a video that is being broadcast at this moment. */
const LIVE_NOW = '"isLiveNow":true';

/** Fetches a YouTube page as a viewer's browser would. Null when it cannot. */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": VIEWER_AGENT, "Accept-Language": "en" },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
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
 * The video being broadcast at this moment, or null when there is none and
 * when the channel cannot be reached. Never throws: watching is an extra, and
 * a slow answer from YouTube must not hold up the radio.
 */
export async function getLiveVideoId(channelId: string): Promise<string | null> {
  const livePage = await fetchPage(liveWatchUrl(channelId));
  if (!livePage) return null;
  const videoId = readLiveVideoId(livePage);
  if (!videoId) return null;
  if (livePage.includes(LIVE_NOW)) return videoId;

  // The live page names the newest video when nothing is being broadcast, so
  // the video's own page decides whether it is live at this moment.
  const videoPage = await fetchPage(`https://www.youtube.com/watch?v=${videoId}`);
  return videoPage?.includes(LIVE_NOW) ? videoId : null;
}
