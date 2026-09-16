/** Shaped like the listen page, so nothing jumps when it arrives. */
export default function Loading() {
  const card = "rounded-[2rem] border border-sky-wash-200 bg-white/70";
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading the radio">
      <div className="h-9 border-b border-sky-wash-200 bg-white/50" />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 sm:pt-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-8 lg:px-8">
        <div className={`${card} flex flex-col items-center px-5 pb-7 pt-6 sm:px-10 sm:pb-10`}>
          <div className="h-5 w-40 self-start rounded bg-sky-wash-200" />
          <div className="mt-6 aspect-square w-[min(74vw,19rem)] rounded-full border border-sky-wash-300 p-[17%]">
            <div className="h-full w-full rounded-full bg-sky-wash-200" />
          </div>
          <div className="mt-6 h-3 w-24 rounded-full bg-sky-wash-200" />
          <div className="mt-3 h-8 w-64 max-w-full rounded bg-sky-wash-200" />
          <div className="mt-8 h-20 w-20 rounded-full bg-navy-900/15" />
        </div>
        <div className={`${card} p-5 sm:p-7`}>
          <div className="h-3 w-28 rounded-full bg-sky-wash-200" />
          <div className="mt-3 h-8 w-56 rounded bg-sky-wash-200" />
          <div className="mt-4 h-10 w-32 rounded-full bg-sky-wash-200" />
          <div className="mt-4 h-64 rounded-2xl bg-sky-wash-100 sm:h-80" />
        </div>
      </div>
    </div>
  );
}
