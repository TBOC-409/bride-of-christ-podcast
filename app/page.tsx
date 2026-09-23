import { ShieldCheck } from "lucide-react";
import { PodcastNotepad } from "@/components/podcast-notepad";
import { PodcastPlayer } from "@/components/podcast-player";
import { getStreamStatus } from "@/lib/icecast";
import { getStripLines } from "@/lib/strip";
import { getLiveVideoId, youtubeChannelId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Rendered with the latest known status so "now playing" is right on first paint.
  const channelId = youtubeChannelId();
  const [status, stripLines, liveVideoId] = await Promise.all([
    getStreamStatus(),
    getStripLines(),
    channelId ? getLiveVideoId(channelId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PodcastPlayer
        initialStatus={status}
        stripLines={stripLines}
        youtubeChannelId={channelId}
        liveVideoId={liveVideoId}
      />
      <PodcastNotepad />
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-1.5 px-4 pb-2 text-center text-xs text-navy-950/45 sm:px-6 lg:px-8">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold-600" aria-hidden />
        Live around the clock. The radio is for listening live and is not available to download.
      </p>
    </>
  );
}
