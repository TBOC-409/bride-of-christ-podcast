export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <section className="site-liquid-home site-page-header-grid relative isolate overflow-hidden px-4 py-14 text-slate-950 sm:px-6 sm:py-20 lg:px-8">
      <div className="site-liquid-blob site-liquid-blob-one pointer-events-none opacity-55" aria-hidden />
      <div className="site-liquid-blob site-liquid-blob-two pointer-events-none opacity-45" aria-hidden />
      <div className="relative mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">{intro}</p>}
      </div>
    </section>
  );
}
