/** Shaped like the listen page, so nothing jumps when it arrives. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading the live broadcast">
      <div className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-3 w-24 rounded bg-sky-200/70" />
          <div className="mt-4 h-10 w-3/4 max-w-lg rounded bg-slate-200/80" />
          <div className="mt-4 h-4 w-full max-w-md rounded bg-slate-100" />
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
          <div className="h-5 w-32 rounded bg-slate-200/80" />
          <div className="mt-4 h-6 w-20 rounded-full bg-slate-200/70" />
          <div className="mt-5 h-12 w-36 rounded-full bg-slate-200/80" />
        </div>
        <div className="site-liquid-glass rounded-2xl p-5 sm:rounded-3xl sm:p-6">
          <div className="h-5 w-28 rounded bg-slate-200/80" />
          <div className="mt-4 h-9 w-40 rounded-xl bg-slate-100" />
          <div className="mt-4 h-48 w-full rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
