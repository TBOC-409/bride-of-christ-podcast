/**
 * Watching the broadcast on YouTube.
 *
 * The site does not carry the video itself: it embeds YouTube's own player,
 * pointed at whatever is live on the church's channel. Watching therefore
 * counts on YouTube, like any other view, and nobody has to paste a link when
 * a broadcast starts.
 */

/** The church's channel. Overridden with YOUTUBE_CHANNEL_ID if it ever changes. */
const DEFAULT_CHANNEL_ID = "UC3Obzx39hxf4XXvhFkDfWlA";

/** Channel ids are always "UC" followed by 22 more characters. */
const CHANNEL_PATTERN = /^UC[A-Za-z0-9_-]{22}$/;

export function youtubeChannelId(): string | null {
  const configured = process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;
  return CHANNEL_PATTERN.test(configured) ? configured : null;
}

/** YouTube's player, showing whatever is live on the channel right now. */
export function liveEmbedUrl(channelId: string): string {
  return `https://www.youtube.com/embed/live_stream?channel=${channelId}&rel=0`;
}

/** Where to watch on YouTube itself, for anyone who would rather. */
export function liveWatchUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}/live`;
}
