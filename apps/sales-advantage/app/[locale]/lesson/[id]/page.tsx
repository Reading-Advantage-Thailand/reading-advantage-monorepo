"use client";

import { trpc } from "@/lib/trpc";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@reading-advantage/ui";
import { Button } from "@reading-advantage/ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { RoleplayRecorder } from "@/components/roleplay-recorder";
import { QuizComponent } from "@/components/quiz-component";
import { ChatTutor } from "@/components/chat-tutor";
import { use, useState } from "react";

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: lesson, isLoading, refetch } = trpc.sales.lesson.useQuery({ lessonId: id });
  const [marked, setMarked] = useState(false);

  if (isLoading || !lesson) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const l = lesson as unknown as {
    title: string;
    type: "theory" | "roleplay" | "quiz";
    content?: string;
    completed?: boolean;
    moduleId?: string;
    moduleSlug?: string;
    scenarios?: Array<{
      id: string;
      personaName: string;
      personaRole: string;
      situation: string;
      objective: string;
      prospectContextJson?: unknown;
      rubric: { name: string; criteriaJson: unknown };
    }>;
    quizQuestions?: Array<{
      id: string;
      question: string;
      optionsJson: string[];
      correctAnswer?: string;
      explanation?: string;
    }>;
  };

  async function handleMarkComplete() {
    // Use a tRPC mutation directly via fetch for simplicity (the mutation isn't on the router yet)
    await fetch("/api/lesson-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: id }),
    });
    setMarked(true);
    refetch();
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link
        href={`/module/${l.moduleSlug ?? ""}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{l.title}</h1>
      </div>

      {l.type === "theory" && (
        <Card>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none pt-6">
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(l.content ?? "") }} />
            <div className="mt-6">
              {marked || l.completed ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Completed</span>
                </div>
              ) : (
                <Button onClick={handleMarkComplete}>Mark Complete</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {l.type === "roleplay" && l.scenarios && (
        <div className="space-y-6">
          {l.scenarios.map((s) => (
            <RoleplayRecorder key={s.id} scenario={s} rubric={s.rubric} />
          ))}
        </div>
      )}

      {l.type === "quiz" && l.quizQuestions && (
        <QuizComponent lessonId={id} questions={l.quizQuestions} />
      )}

      <div className="mt-12 border-t pt-8">
        <ChatTutor lessonId={id} moduleId={l.moduleId} />
      </div>
    </div>
  );
}

function renderMarkdown(text: string): string {
  // Minimal: convert newlines to <p>, **bold**, *italic*, # heading
  return text
    .split(/\n\n+/)
    .map((para) => {
      if (para.startsWith("# ")) return `<h2>${para.slice(2)}</h2>`;
      if (para.startsWith("## ")) return `<h3>${para.slice(3)}</h3>`;
      if (para.startsWith("- ")) {
        const items = para.split("\n").map((l) => l.replace(/^- /, "")).map((l) => `<li>${l}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${para}</p>`;
    })
    .join("")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}