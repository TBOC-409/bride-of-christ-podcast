import { NextResponse } from "next/server";
import { apiKeyShape, checkLive, youtubeChannelId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * Whether the church is broadcasting on YouTube right now.
 *
 * The radio page asks this every minute, so a listener who opened it before
 * the service began still sees Watch appear, and sees it go when the service
 * ends. `result` says why there is nothing to watch (see LiveCheck), which is
 * how a missing or refused API key shows up without a broadcast to test with.
 * The key itself is never included.
 */
export async function GET() {
  const channelId = youtubeChannelId();
  const check = channelId ? await checkLive(channelId) : { videoId: null, result: "no-channel" };
  // When YouTube refuses the key, say what the saved key looks like (never
  // the key itself), so a typing slip can be told from a disabled key.
  const key = check.result.startsWith("api-") ? apiKeyShape() : undefined;
  return NextResponse.json({ ...check, ...(key ? { key } : {}) }, { headers: { "Cache-Control": "public, max-age=30" } });
}
