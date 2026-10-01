import { NextResponse } from "next/server";
import { checkLive, youtubeChannelId } from "@/lib/youtube";

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
  return NextResponse.json(check, { headers: { "Cache-Control": "public, max-age=30" } });
}
