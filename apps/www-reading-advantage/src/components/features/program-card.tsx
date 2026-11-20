import Image from "next/image";

/** Copy for one program card, supplied by the features page locale scope. */
export type ProgramCardCopy = {
  name: string;
  forText: string;
  status: string;
  body: string;
  bullets: string[];
};

/** Props for a single program card. */
type ProgramCardProps = ProgramCardCopy & {
  testId: string;
  imageSrc?: string;
  imageAlt?: string;
};

/**
 * Renders one program card with a screenshot and its checked copy.
 * @param props The card copy, hook, and screenshot source.
 * @returns The rendered program card.
 */
export function ProgramCard({
  body,
  bullets,
  forText,
  imageAlt,
  imageSrc,
  name,
  status,
  testId,
}: ProgramCardProps) {
  return (
    <article
      data-testid={testId}
      className="flex h-full flex-col overflow-hidden rounded-3xl border border-site-border bg-white shadow-panel"
    >
      {imageSrc && imageAlt ? (
        <div className="bg-site-page">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={520}
            height={360}
            className="h-48 w-full object-cover object-top"
          />
        </div>
      ) : (
        <div
          className="flex h-48 items-center justify-center bg-site-page"
          aria-hidden="true"
        >
          <div className="h-16 w-16 rounded-2xl border border-site-border bg-white" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="text-lg font-semibold leading-snug text-slate-900">
          {name}
        </h3>
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-sky-800">
          {forText}
        </p>
        <p className="text-xs font-medium text-emerald-800">{status}</p>
        <p className="text-sm leading-relaxed text-site-body">{body}</p>
        {bullets.length > 0 && (
          <ul className="mt-auto list-disc space-y-2 pl-5 text-sm leading-relaxed text-site-body">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
