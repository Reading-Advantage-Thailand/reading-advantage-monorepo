/** One FAQ item with the checked question and answer copy. */
export type FaqItem = { q: string; a: string };

/** Props for a shared FAQ section. */
type FaqListProps = {
  testId: string;
  heading: string;
  items: FaqItem[];
};

/**
 * Renders a text-only FAQ section with native disclosure elements.
 * @param props The section hook, heading, and question-answer pairs.
 * @returns The rendered FAQ section.
 */
export function FaqList({ heading, items, testId }: FaqListProps) {
  return (
    <section data-testid={testId} className="bg-site-page py-20 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="mb-10 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          {heading}
        </h2>
        <div className="mx-auto max-w-3xl space-y-4">
          {items.map((item) => (
            <details
              key={item.q}
              className="rounded-2xl border border-site-border bg-white p-5 shadow-panel"
            >
              <summary className="cursor-pointer font-semibold text-slate-900">
                {item.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-site-body">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
