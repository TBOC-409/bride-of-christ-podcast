/** Shaped like the listen page, so nothing jumps when it arrives. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading the radio">
      <div className="border-b border-haze-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 sm:flex-row sm:gap-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="h-28 w-28 shrink-0 rounded-3xl bg-haze-200 sm:h-36 sm:w-36" />
          <div className="w-full flex-1">
            <div className="h-3 w-40 rounded-full bg-haze-200" />
            <div className="mt-4 h-9 w-3/4 rounded bg-haze-200 sm:h-12" />
            <div className="mt-3 h-4 w-40 rounded bg-haze-100" />
            <div className="mt-6 h-12 w-44 rounded-full bg-haze-200" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="h-3 w-32 rounded-full bg-haze-200" />
        <div className="mt-3 h-8 w-64 rounded bg-haze-200" />
        <div className="mt-4 h-96 rounded-2xl border border-haze-200 bg-white sm:h-[30rem]" />
      </div>
    </div>
  );
}
