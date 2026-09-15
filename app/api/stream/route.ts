import { NextResponse } from "next/server";
import { streamUrl } from "@/lib/icecast";

export const dynamic = "force-dynamic";

/**
 * Hands the listening address to the player when someone presses Listen.
 *
 * Fetched on demand rather than written into the page, so it is not in the
 * page source. With a single permanent link this only deters casual copying:
 * anyone reading the network tab can still see and save it.
 *
 * It is not withheld while off air. If on-air detection were ever wrong, a
 * refusal here would stop people listening to a programme that is actually
 * running.
 */
export async function GET() {
  const url = streamUrl();
  if (!url) {
    return NextResponse.json({ error: "The live stream has not been set up yet." }, { status: 503 });
  }
  return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
}
