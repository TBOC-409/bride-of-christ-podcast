/** Shaped like the session list, so nothing jumps when it arrives. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading sessions">
      <div className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-3 w-28 rounded bg-sky-200/70" />
          <div className="mt-4 h-10 w-3/4 max-w-lg rounded bg-slate-200/80" />
          <div className="mt-4 h-4 w-full max-w-md rounded bg-slate-100" />
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
            <div className="h-5 w-20 rounded-full bg-slate-200/80" />
            <div className="mt-4 h-6 w-2/3 rounded bg-slate-200/80" />
            <div className="mt-3 h-4 w-40 rounded bg-slate-100" />
            <div className="mt-5 h-11 w-32 rounded-full bg-slate-200/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
