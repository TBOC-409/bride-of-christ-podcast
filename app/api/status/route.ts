import { NextResponse } from "next/server";
import { getStreamStatus } from "@/lib/icecast";

export const dynamic = "force-dynamic";

/**
 * Whether the church stream is on air, for the listen page and the church
 * portal's status view. Icecast is asked at most every few seconds however many
 * listeners are polling.
 */
export async function GET() {
  const status = await getStreamStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "public, max-age=5" } });
}
