import Link from "next/link";
import { CalendarDays, Mic, Radio } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { primaryButton } from "@/components/styles";
import { sessionDate, sessionTime } from "@/lib/format";
import { liveAndUpcomingSessions } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessions = await liveAndUpcomingSessions();
  const live = sessions.filter((session) => session.status === "LIVE");
  const upcoming = sessions.filter((session) => session.status !== "LIVE");

  return (
    <>
      <PageHeader
        eyebrow="Listen with us"
        title="The Bride of Christ Podcast"
        intro="Live audio sessions you can join from anywhere, with a private notepad to capture what speaks to you."
      />
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {sessions.length === 0 && (
            <div className="site-liquid-glass rounded-2xl p-8 text-center sm:rounded-3xl sm:p-12">
              <Mic className="mx-auto h-8 w-8 text-sky-600" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">No sessions scheduled yet</h2>
              <p className="mt-2 text-sm text-slate-500">Check back soon for the next live audio session.</p>
            </div>
          )}

          {live.map((session) => (
            <article key={session.id} className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />Live now
              </span>
              <h2 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">{session.title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">Hosted by {session.hostName}</p>
              {session.description && <p className="mt-3 text-sm leading-7 text-slate-600">{session.description}</p>}
              <Link href={`/sessions/${session.id}`} className={`${primaryButton} mt-5 w-full sm:w-auto`}>
                Listen now
              </Link>
            </article>
          ))}

          {upcoming.map((session) => (
            <article key={session.id} className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />Upcoming
              </span>
              <h2 className="mt-3 text-lg font-bold text-slate-900 sm:text-xl">{session.title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">Hosted by {session.hostName}</p>
              <p className="mt-2 text-sm text-slate-500">
                {sessionDate(session.scheduledAt)} · {sessionTime(session.scheduledAt)}
              </p>
              {session.description && <p className="mt-3 text-sm leading-7 text-slate-600">{session.description}</p>}
              <Link href={`/sessions/${session.id}`} className="mt-4 inline-flex text-sm font-semibold text-sky-700 underline-offset-4 hover:underline">
                Session details
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
