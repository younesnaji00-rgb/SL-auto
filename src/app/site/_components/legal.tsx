/** Shared prose layout for the legal pages (privacy, terms). */
export function LegalArticle({ updated, children }: { updated: string; children: React.ReactNode }) {
  return (
    <section className="py-12 sm:py-16">
      <article className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-[13px] text-[var(--muted)]">Last updated: {updated}</p>
        <div className="mt-8 space-y-10 text-[15.5px] leading-relaxed text-[var(--ink)] [&_h2]:text-[1.35rem] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:scroll-mt-28 [&_p]:mt-3 [&_p]:text-[var(--muted)] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:text-[var(--muted)] [&_a]:text-[var(--teal-deep)] [&_a]:underline">
          {children}
        </div>
      </article>
    </section>
  );
}
