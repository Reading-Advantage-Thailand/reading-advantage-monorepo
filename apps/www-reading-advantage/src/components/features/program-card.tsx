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
  imageWidth?: number;
  imageHeight?: number;
  featured?: boolean;
};

/**
 * Renders one program card with a screenshot and its checked copy.
 * @param props The card copy, hook, and screenshot source.
 * @returns The rendered program card.
 */
export function ProgramCard({
  body,
  bullets,
  featured = false,
  forText,
  imageAlt,
  imageHeight,
  imageSrc,
  imageWidth,
  name,
  status,
  testId,
}: ProgramCardProps) {
  const content = (
    <>
      {imageSrc && imageAlt && (
        <div className={featured ? "bg-site-page md:w-48 md:shrink-0 md:self-center" : "bg-site-page"}>
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={imageWidth ?? 520}
            height={imageHeight ?? 360}
            className="h-auto w-full"
          />
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
        {body && <p className="text-sm leading-relaxed text-site-body">{body}</p>}
        {bullets.length > 0 && (
          <ul className="mt-auto list-disc space-y-2 pl-5 text-sm leading-relaxed text-site-body">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (featured) {
    return (
      <article
        data-testid={testId}
        className="flex self-start flex-col overflow-hidden rounded-3xl border border-site-border bg-white shadow-panel md:col-span-2 md:flex-row md:items-start"
      >
        {content}
      </article>
    );
  }

  return (
    <article
      data-testid={testId}
      className="flex self-start flex-col overflow-hidden rounded-3xl border border-site-border bg-white shadow-panel"
    >
      {content}
    </article>
  );
}
