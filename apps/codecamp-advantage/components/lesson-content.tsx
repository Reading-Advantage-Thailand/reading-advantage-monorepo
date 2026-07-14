import { useTranslations } from "next-intl";
import type { LessonResponse } from "@reading-advantage/types";

type LessonType = LessonResponse["type"];

interface LessonContentProps {
  type: LessonType;
  content: Record<string, unknown>;
}

interface TheorySection {
  heading?: string;
  body?: string;
  code?: string;
  youtubeId?: string;
  imagePath?: string;
}

/**
 * Renders lesson content based on lesson type.
 *
 * - **theory**: Renders sections with heading, body text, and code blocks.
 * - **exercise**: Renders exercise instructions.
 * - **quiz**: Renders quiz instructions.
 */
export function LessonContent({ type, content }: LessonContentProps) {
  const t = useTranslations("lesson");
  if (type === "theory") {
    return <TheoryContent content={content} />;
  }

  if (type === "exercise") {
    return <InstructionsContent content={content} label={t("exerciseInstructions")} />;
  }

  if (type === "quiz") {
    return <InstructionsContent content={content} label={t("quizInstructions")} />;
  }

  return <EmptyContent />;
}

function EmptyContent() {
  const t = useTranslations("lesson");
  return (
    <p className="text-muted-foreground">
      {t("noContent")}
    </p>
  );
}

function TheoryContent({ content }: { content: Record<string, unknown> }) {
  const sections = Array.isArray(content.sections)
    ? content.sections.filter((s): s is TheorySection => typeof s === "object" && s !== null)
    : [];

  if (sections.length === 0) {
    return <EmptyContent />;
  }

  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <section key={section.heading ?? index} className="space-y-3">
          {section.heading ? (
            <h3 className="text-lg font-semibold text-foreground">{section.heading}</h3>
          ) : null}

          {section.imagePath ? (
            <div className="my-4 overflow-hidden rounded-lg border bg-muted shadow-sm">
              <img
                src={section.imagePath}
                alt={section.heading ?? "Curriculum Illustration"}
                className="w-full h-auto object-cover max-h-[400px]"
              />
            </div>
          ) : null}

          {section.body ? (
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {section.body}
            </p>
          ) : null}

          {section.youtubeId ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted my-4 shadow-sm">
              <iframe
                src={`https://www.youtube.com/embed/${section.youtubeId}`}
                title={section.heading ?? "Video Tutorial"}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          {section.code ? (
            <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted p-4 text-sm">
              <code className="font-mono">{section.code}</code>
            </pre>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function InstructionsContent({
  content,
  label,
}: {
  content: Record<string, unknown>;
  label: string;
}) {
  const instructions =
    typeof content.instructions === "string" ? content.instructions : null;

  if (!instructions) {
    return <EmptyContent />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
        {instructions}
      </p>
    </div>
  );
}
