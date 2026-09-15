import { NextResponse } from "next/server";
import { getStreamStatus } from "@/lib/icecast";
import { listeningNow } from "@/lib/listeners";

export const dynamic = "force-dynamic";

/**
 * What is playing, for the listen page, and the live website listener count,
 * for the church portal. The stream is checked at most every few seconds
 * however many listeners are polling. The listener count is added on every
 * request instead of being cached with it, so it is never ten seconds stale.
 */
export async function GET() {
  const status = await getStreamStatus();
  return NextResponse.json(
    { ...status, websiteListeners: listeningNow() },
    { headers: { "Cache-Control": "public, max-age=5" } },
  );
}
