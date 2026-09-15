import { NextResponse } from "next/server";
import { isListenerId, recordListening, recordStopped } from "@/lib/listeners";

export const dynamic = "force-dynamic";

/**
 * Check-ins from players on this site: { id, playing }.
 *
 * A closing page sends its last check-in with navigator.sendBeacon, which
 * delivers it as plain text rather than JSON, so the body is parsed by hand to
 * accept both.
 */
export async function POST(request: Request) {
  let body: { id?: unknown; playing?: unknown } | null;
  try {
    body = JSON.parse(await request.text());
  } catch {
    body = null;
  }
  if (!body || !isListenerId(body.id)) {
    return NextResponse.json({ error: "Invalid check-in." }, { status: 400 });
  }
  if (body.playing === true) recordListening(body.id);
  else recordStopped(body.id);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
