import { NextResponse } from "next/server";
import { liveStream } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hands a listener the Icecast mount, but only while the session is live.
 *
 * Fetched when someone presses play rather than written into the page, so the
 * address is not in view-source, and a saved copy stops working once the
 * session ends.
 *
 * This deters casual copying and nothing more. An Icecast mount is a plain HTTP
 * audio stream, and anyone reading the network tab can still record it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await liveStream(id);

  if (!session) {
    return NextResponse.json({ error: "This session is not live." }, { status: 404 });
  }
  if (!session.streamUrl) {
    return NextResponse.json({ error: "No audio stream is configured for this session." }, { status: 503 });
  }
  return NextResponse.json({ url: session.streamUrl }, { headers: { "Cache-Control": "no-store" } });
}
