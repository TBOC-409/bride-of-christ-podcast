import { NextResponse } from "next/server";
import { youtubeChannelId, liveWatchUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

/**
 * Temporary: what this server actually receives from YouTube, so a failure to
 * find the live broadcast can be told apart from YouTube answering differently
 * to a server than to a listener's browser. Remove once the cause is known.
 */
export async function GET() {
  const channelId = youtubeChannelId();
  if (!channelId) return NextResponse.json({ error: "no channel" });
  const agent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
  try {
    const response = await fetch(liveWatchUrl(channelId), {
      headers: { "User-Agent": agent, "Accept-Language": "en" },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    const page = await response.text();
    return NextResponse.json({
      status: response.status,
      bytes: page.length,
      redirectedTo: response.url,
      hasCanonical: /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=/.test(page),
      hasLiveNow: page.includes('"isLiveNow":true'),
      consentWall: /consent\.youtube\.com|Before you continue|sign in to confirm/i.test(page),
      firstTitle: page.match(/<title>([^<]{0,80})/)?.[1] ?? null,
    });
  } catch (error) {
    return NextResponse.json({ threw: error instanceof Error ? error.message : String(error) });
  }
}
