import { ShieldCheck } from "lucide-react";
import { PodcastNotepad } from "@/components/podcast-notepad";
import { PodcastPlayer } from "@/components/podcast-player";
import { getStreamStatus } from "@/lib/icecast";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Rendered with the latest known status so "now playing" is right on first paint.
  const status = await getStreamStatus();

  return (
    <>
      <PodcastPlayer initialStatus={status}>
        <PodcastNotepad />
      </PodcastPlayer>
      <p className="mt-8 flex items-center justify-center gap-1.5 px-4 text-center text-xs text-navy-950/50">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden />
        The radio is for listening live and is not available to download.
      </p>
    </>
  );
}
