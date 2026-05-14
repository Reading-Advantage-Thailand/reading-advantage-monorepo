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
}

/**
 * Renders lesson content based on lesson type.
 *
 * - **theory**: Renders sections with heading, body text, and code blocks.
 * - **exercise**: Renders exercise instructions.
 * - **quiz**: Renders quiz instructions.
 */
export function LessonContent({ type, content }: LessonContentProps) {
  if (type === "theory") {
    return <TheoryContent content={content} />;
  }

  if (type === "exercise") {
    return <InstructionsContent content={content} label="Exercise Instructions" />;
  }

  if (type === "quiz") {
    return <InstructionsContent content={content} label="Quiz Instructions" />;
  }

  return <EmptyContent />;
}

function TheoryContent({ content }: { content: Record<string, unknown> }) {
  const sections = Array.isArray(content.sections) ? (content.sections as TheorySection[]) : [];

  if (sections.length === 0) {
    return <EmptyContent />;
  }

  return (
    <div className="space-y-8">
      {sections.map((section, index) => (
        <section key={index} className="space-y-3">
          {section.heading ? (
            <h3 className="text-lg font-semibold text-foreground">{section.heading}</h3>
          ) : null}

          {section.body ? (
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {section.body}
            </p>
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

function EmptyContent() {
  return (
    <p className="text-muted-foreground">
      No structured content available for this lesson yet.
    </p>
  );
}
