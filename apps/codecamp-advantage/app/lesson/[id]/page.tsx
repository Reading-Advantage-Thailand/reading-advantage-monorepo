"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import {
  ArrowLeft,
  Send,
  GitPullRequest,
  CheckCircle,
} from "lucide-react";
import { ForkInstruction } from "@/components/fork-instruction";
import { useState } from "react";
import { useChatStream } from "@/lib/use-chat-stream";
import { LessonContent } from "@/components/lesson-content";

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;

  const { data: lesson, isLoading } = trpc.codecamp.lesson.useQuery(
    { lessonId },
    { enabled: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId) }
  );

  const { data: exerciseRepos } = trpc.codecamp.exerciseRepos.useQuery(
    { moduleId: lesson?.moduleId ?? "" },
    { enabled: !!lesson?.moduleId }
  );

  const { data: prReviews } = trpc.codecamp.prReviews.useQuery();

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container py-12">
        <Button variant="ghost" className="mb-6" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Lesson not found</h1>
        <p className="mt-2 text-muted-foreground">
          The lesson ID <code>{lessonId}</code> does not exist or is not yet published.
        </p>
      </div>
    );
  }

  // Find PR reviews linked to this module's exercise repos
  const moduleReviews =
    prReviews?.filter((r) =>
      exerciseRepos?.some((repo) => repo.id === r.exerciseRepoId)
    ) ?? [];

  return (
    <div className="container py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href={`/module/${lesson.moduleSlug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Module
        </Link>
      </Button>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {lesson.type}
          </span>
          <h1 className="mt-2 text-3xl font-bold">{lesson.title}</h1>
          <p className="mt-2 text-muted-foreground">{lesson.description}</p>
        </div>

        {/* Lesson Content */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Content</h2>
          <div className="mt-4">
            <LessonContent type={lesson.type} content={lesson.content} />
          </div>
        </div>

        {/* Exercise Repos — for exercise-type lessons */}
        {lesson.type === "exercise" && exerciseRepos && exerciseRepos.length > 0 && (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Fork-Based Exercise</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete this exercise by forking the repository, making changes on a branch, and opening a Pull Request.
            </p>
            <div className="mt-4 space-y-6">
              {exerciseRepos.map((repo) => (
                <ForkInstruction
                  key={repo.id}
                  repoUrl={repo.repoUrl}
                  repoDescription={repo.description}
                  exerciseRepoId={repo.id}
                />
              ))}
            </div>
            {moduleReviews.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold">PR Review Feedback</h3>
                {moduleReviews.map((review) => (
                  <div key={review.id} className="rounded-lg bg-muted p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={review.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {review.prUrl.split("/").slice(-2).join("/")}
                      </a>
                      <PrReviewBadge status={review.reviewStatus} />
                    </div>
                    {review.llmReviewSummary && (
                      <p className="mt-2 text-muted-foreground">{review.llmReviewSummary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inline Exercises */}
        {lesson.exercises.length > 0 && (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Practice Exercises</h2>
            {lesson.exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        )}

        {/* Quiz */}
        {lesson.quizQuestions.length > 0 && (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Quiz</h2>
            <QuizComponent
              lessonId={lesson.id}
              moduleId={lesson.moduleId}
              questions={lesson.quizQuestions}
            />
          </div>
        )}

        {/* Chat Tutor */}
        <div className="mt-8 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Chat with AI Tutor</h2>
          <ChatTutor lessonId={lessonId} moduleId={lesson.moduleId} />
        </div>
      </div>
    </div>
  );
}

function PrReviewBadge({
  status,
}: {
  status: "pending" | "reviewed" | "needs_changes" | "approved";
}) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      icon: <GitPullRequest className="h-3 w-3" />,
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      icon: <GitPullRequest className="h-3 w-3" />,
    },
    needs_changes: {
      label: "Needs Changes",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      icon: <GitPullRequest className="h-3 w-3" />,
    },
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      icon: <CheckCircle className="h-3 w-3" />,
    },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function ExerciseCard({ exercise }: { exercise: { id: string; title: string; instructions: string; starterCode: string | null; hints: string[] } }) {
  const [code, setCode] = useState(exercise.starterCode ?? "");
  const submitExercise = trpc.codecamp.submitExercise.useMutation();

  return (
    <div className="mt-4 rounded-lg border p-4">
      <h3 className="font-medium">{exercise.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{exercise.instructions}</p>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="mt-3 h-32 w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm"
        placeholder="Write your solution here..."
      />
      <Button
        className="mt-3"
        size="sm"
        onClick={() => submitExercise.mutate({ exerciseId: exercise.id, code })}
        disabled={submitExercise.isPending}
      >
        {submitExercise.isPending ? "Submitting..." : "Submit Exercise"}
      </Button>
      {submitExercise.data && (
        <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
          <p className={submitExercise.data.passed ? "text-green-600" : "text-amber-600"}>
            {submitExercise.data.feedback}
          </p>
          {submitExercise.data.hints.length > 0 && (
            <ul className="mt-2 list-disc pl-4 text-muted-foreground">
              {submitExercise.data.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function QuizComponent({
  lessonId,
  moduleId: _moduleId,
  questions,
}: {
  lessonId: string;
  moduleId: string;
  questions: { id: string; question: string; options: string[] }[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const utils = trpc.useUtils();

  const submitQuiz = trpc.codecamp.submitQuiz.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      // Mark lesson as complete if quiz score is passing (>= 70%)
      if (data.score >= 70) {
        utils.codecamp.lesson.invalidate();
        utils.codecamp.moduleBySlug.invalidate();
        utils.codecamp.dashboard.invalidate();
        // Fire-and-forget progress update
        fetch("/api/trpc/codecamp.updateProgress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: { lessonId, status: "completed", score: data.score },
          }),
          credentials: "include",
        }).catch(() => {
          // Silent fail — progress is non-critical
        });
      }
    },
  });

  // Build a lookup for correct answers from the submission result
  const resultByQuestion = new Map(
    submitQuiz.data?.details.map((d) => [d.questionId, d]) ?? []
  );

  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="mt-4 space-y-6">
      {questions.map((q, idx) => {
        const result = resultByQuestion.get(q.id);
        return (
          <div key={q.id} className="rounded-lg border p-4">
            <p className="font-medium">
              {idx + 1}. {q.question}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt;
                const isCorrect = result?.correctAnswer === opt;
                const isWrong = isSelected && !result?.isCorrect;

                return (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected && !submitted ? "border-primary bg-primary/5" : "hover:bg-accent"
                    } ${submitted && isCorrect ? "border-green-500 bg-green-50" : ""} ${submitted && isWrong ? "border-red-500 bg-red-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={isSelected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      disabled={submitted}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
            {submitted && result && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium">Explanation:</span> {result.explanation}
              </p>
            )}
          </div>
        );
      })}
      {!submitted ? (
        <Button
          onClick={() =>
            submitQuiz.mutate({
              lessonId,
              answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
            })
          }
          disabled={!allAnswered || submitQuiz.isPending}
        >
          {submitQuiz.isPending ? "Submitting..." : "Submit Quiz"}
        </Button>
      ) : (
        <div className="rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">
            Quiz submitted! Score: {submitQuiz.data?.score ?? 0}%
          </p>
          <p className="text-sm">
            {submitQuiz.data?.correctCount ?? 0} / {submitQuiz.data?.total ?? 0} correct
          </p>
        </div>
      )}
    </div>
  );
}

function ChatTutor({ lessonId, moduleId }: { lessonId: string; moduleId: string }) {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();

  const { data: conversations } = trpc.codecamp.conversations.useQuery();
  const saveMessage = trpc.codecamp.saveChatMessage.useMutation();

  // Find existing conversation for this lesson
  const existingConv = conversations?.find(
    (c) => c.lessonId === lessonId || c.moduleId === moduleId
  );

  // Load history on mount when conversation is found
  const { data: chatHistory } = trpc.codecamp.chatHistory.useQuery(
    { conversationId: existingConv?.id ?? "" },
    { enabled: !!existingConv?.id && !conversationId }
  );

  const initialMessages: { role: "user" | "assistant"; content: string }[] = [];
  if (chatHistory?.messages) {
    for (const m of chatHistory.messages) {
      initialMessages.push({ role: m.role as "user" | "assistant", content: m.content });
    }
  }

  const handleSend = async (message: string) => {
    const result = await saveMessage.mutateAsync({
      conversationId,
      message,
      lessonId,
      moduleId,
      role: "user",
    });
    if (result.conversationId) {
      setConversationId(result.conversationId);
    }
  };

  const handleComplete = async (message: string) => {
    const cid = conversationId ?? existingConv?.id;
    if (cid) {
      await saveMessage.mutateAsync({
        conversationId: cid,
        message,
        lessonId,
        moduleId,
        role: "assistant",
      });
    }
  };

  const { messages, isLoading, sendMessage } = useChatStream({
    lessonId,
    moduleId,
    initialMessages: initialMessages.length > 0 ? initialMessages : undefined,
    onSend: handleSend,
    onComplete: handleComplete,
  });

  return (
    <div className="mt-4">
      <div className="h-64 overflow-y-auto rounded-lg border bg-muted/50 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ask a question about this lesson...</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-secondary px-4 py-2 text-sm">Thinking...</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about this lesson..."
          className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm"
        />
        <Button size="sm" onClick={() => sendMessage(input)} disabled={isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
