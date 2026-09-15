import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PodcastNotepad } from "@/components/podcast-notepad";
import { PodcastPlayer } from "@/components/podcast-player";
import { getStreamStatus } from "@/lib/icecast";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Rendered with the latest known status so "now playing" is right on first paint.
  const status = await getStreamStatus();

  return (
    <>
      <PageHeader
        eyebrow="Listen live"
        title="The Bride of Christ Podcast"
        intro="Our church radio, live around the clock: church programmes most days of the week, and gospel music in between. Listen from anywhere, and keep private notes as you go."
      />
      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2 lg:items-start">
          <div className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Live radio</h2>
            <PodcastPlayer initialStatus={status} />
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
              The radio is for listening live and is not available to download.
            </p>
          </div>
          <PodcastNotepad />
        </div>
      </section>
    </>
  );
}
