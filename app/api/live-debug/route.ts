import { NextResponse } from "next/server";
import { youtubeChannelId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

const AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

async function look(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": AGENT, "Accept-Language": "en" },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    const body = await response.text();
    return {
      status: response.status,
      bytes: body.length,
      liveNow: body.includes('"isLiveNow":true'),
      liveContent: body.includes('"isLiveContent":true'),
      firstVideoId: body.match(/"videoId":"([A-Za-z0-9_-]{11})"|<yt:videoId>([A-Za-z0-9_-]{11})</)?.slice(1).find(Boolean) ?? null,
      title: body.match(/<title>([^<]{0,60})/)?.[1] ?? null,
    };
  } catch (error) {
    return { threw: error instanceof Error ? error.message : String(error) };
  }
}

/** Temporary: which YouTube sources answer this server usefully. */
export async function GET() {
  const channelId = youtubeChannelId();
  if (!channelId) return NextResponse.json({ error: "no channel" });
  const [rss, embed, watch] = await Promise.all([
    look(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`),
    look("https://www.youtube.com/embed/ybbxsb8nFrQ"),
    look("https://www.youtube.com/watch?v=ybbxsb8nFrQ"),
  ]);
  return NextResponse.json({ rss, embed, watch });
}
