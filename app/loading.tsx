/** Shaped like the listen page, so nothing jumps when it arrives. */
export default function Loading() {
  return (
    <section className="animate-pulse px-4 pb-12 pt-5 sm:px-6 sm:pt-10 lg:px-8" aria-busy="true" aria-label="Loading the radio">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="site-liquid-glass rounded-3xl p-5 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-200/80" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 rounded-full bg-slate-200/80" />
              <div className="h-6 w-48 rounded bg-slate-200/80" />
              <div className="h-3.5 w-56 max-w-full rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-6 h-24 rounded-2xl bg-white/70" />
          <div className="mt-6 h-14 w-44 rounded-full bg-slate-200/80" />
        </div>
        <div className="site-liquid-glass rounded-3xl p-5 sm:p-6">
          <div className="h-9 w-36 rounded-xl bg-slate-200/80" />
          <div className="mt-4 h-10 w-32 rounded-full bg-slate-100" />
          <div className="mt-3 h-56 rounded-2xl bg-white/70 sm:h-72" />
        </div>
      </div>
    </section>
  );
}
