import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Radio, ShieldCheck } from "lucide-react";
import { PodcastNotepad } from "@/components/podcast-notepad";
import { PodcastPlayer } from "@/components/podcast-player";
import { sessionDate, sessionTime } from "@/lib/format";
import { publishedSession } from "@/lib/sessions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const session = await publishedSession((await params).id);
  if (!session) return { title: "Session not found" };
  return {
    title: session.title,
    description: session.description ?? `A live audio session hosted by ${session.hostName}.`,
    alternates: { canonical: `/sessions/${session.id}` },
  };
}

export default async function SessionPage({ params }: { params: Params }) {
  const session = await publishedSession((await params).id);
  if (!session) notFound();

  const isLive = session.status === "LIVE";
  const hasEnded = session.status === "ENDED";

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 underline-offset-4 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />All sessions
        </Link>

        <header className="mt-4">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
              <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />Live now
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />{hasEnded ? "Ended" : "Upcoming"}
            </span>
          )}
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{session.title}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">Hosted by {session.hostName}</p>
          {session.scheduledAt && !isLive && (
            <p className="mt-2 text-sm text-slate-500">
              {sessionDate(session.scheduledAt)} · {sessionTime(session.scheduledAt)}
            </p>
          )}
          {session.description && <p className="mt-4 text-sm leading-7 text-slate-600">{session.description}</p>}
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Audio</h2>
            {hasEnded ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This session has ended. Your notes are still saved on this device.
              </p>
            ) : (
              <PodcastPlayer sessionId={session.id} isLive={isLive} />
            )}
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
              Sessions are for listening only and are not available to download.
            </p>
          </div>

          <PodcastNotepad sessionId={session.id} sessionTitle={session.title} />
        </div>
      </div>
    </section>
  );
}
