import { ShieldCheck } from "lucide-react";
import { PodcastNotepad } from "@/components/podcast-notepad";
import { PodcastPlayer } from "@/components/podcast-player";
import { getStreamStatus } from "@/lib/icecast";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Rendered with the latest known status so "now playing" is right on first paint.
  const status = await getStreamStatus();

  return (
    <section className="px-4 pb-12 pt-5 sm:px-6 sm:pt-10 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          {/* On wide screens the player stays in view while notes are written. */}
          <div className="lg:sticky lg:top-24">
            <PodcastPlayer initialStatus={status} />
          </div>
          <PodcastNotepad />
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
          The radio is for listening live and is not available to download.
        </p>
      </div>
    </section>
  );
}
