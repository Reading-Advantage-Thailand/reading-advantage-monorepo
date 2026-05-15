"use client";

import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import {
  ArrowLeft,
  Send,
} from "lucide-react";
import { ForkInstruction } from "@/components/fork-instruction";
import { ReviewHistory } from "@/components/review-history";
import { WorkflowTracker } from "@/components/workflow-tracker";
import { useState, useMemo } from "react";
import { useLocale } from "next-intl";
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

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Content</h2>
          <div className="mt-4">
            <LessonContent type={lesson.type} content={lesson.content} />
          </div>
        </div>

        {(lesson.type === "exercise" || lesson.moduleSlug === "real-world-practice") && exerciseRepos && exerciseRepos.length > 0 && (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Fork-Based Exercise</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete this exercise by forking the repository, making changes on a branch, and opening a Pull Request.
            </p>

            {lesson.moduleSlug === "real-world-practice" && moduleReviews.length > 0 && (() => {
              const reviewsByRepo = new Map<string, typeof moduleReviews[number]>();
              for (const review of moduleReviews) {
                const existing = reviewsByRepo.get(review.exerciseRepoId);
                if (!existing || review.createdAt > existing.createdAt) {
                  reviewsByRepo.set(review.exerciseRepoId, review);
                }
              }
              return (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold">Your Workflow</h3>
                  {Array.from(reviewsByRepo.entries()).map(([repoId, review]) => {
                    const repo = exerciseRepos?.find((r) => r.id === repoId);
                    return (
                      <WorkflowTracker
                        key={repoId}
                        issueTitle={repo?.description ?? "Practice Exercise"}
                        issueNumber={repo?.order ?? 1}
                        steps={[
                          { id: "claim", label: "Issue Claimed", description: "Pick an issue to work on", status: "completed" },
                          { id: "branch", label: "Branch Created", description: "Create a feature branch", status: "completed" },
                          { id: "pr", label: "PR Opened", description: "Open a pull request", status: review.reviewStatus !== "pending" ? "completed" : "in_progress" },
                          { id: "review", label: "Review Received", description: "Address feedback", status: review.reviewStatus === "needs_changes" || review.reviewStatus === "approved" ? "completed" : review.reviewStatus === "reviewed" ? "in_progress" : "pending" },
                          { id: "merge", label: "Merged", description: "Merge to main", status: review.reviewStatus === "approved" ? "in_progress" : "pending" },
                        ]}
                      />
                    );
                  })}
                </div>
              );
            })()}

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
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold">PR Review Feedback</h3>
                {moduleReviews.map((review) => (
                  <ReviewHistory
                    key={review.id}
                    prUrl={review.prUrl}
                    reviewStatus={review.reviewStatus}
                    summary={review.llmReviewSummary}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {lesson.exercises.length > 0 && (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Practice Exercises</h2>
            {lesson.exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        )}

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

        <div className="mt-8 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Chat with AI Tutor</h2>
          <ChatTutor lessonId={lessonId} moduleId={lesson.moduleId} />
        </div>
      </div>
    </div>
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
        aria-label="Exercise solution"
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
      if (data.score >= 70) {
        utils.codecamp.lesson.invalidate();
        utils.codecamp.moduleBySlug.invalidate();
        utils.codecamp.dashboard.invalidate();
      }
    },
  });

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
  const locale = useLocale();
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();

  const { data: conversations } = trpc.codecamp.conversations.useQuery();
  const saveMessage = trpc.codecamp.saveChatMessage.useMutation();

  const existingConv = conversations?.find(
    (c) => c.lessonId === lessonId || c.moduleId === moduleId
  );

  const { data: chatHistory } = trpc.codecamp.chatHistory.useQuery(
    { conversationId: existingConv?.id ?? "" },
    { enabled: !!existingConv?.id && !conversationId }
  );

  const initialMessages = useMemo(() => {
    if (!chatHistory?.messages) return undefined;
    return chatHistory.messages.map((m): { role: "user" | "assistant"; content: string } => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  }, [chatHistory]);

  const handleSend = async (message: string) => {
    const result = await saveMessage.mutateAsync({
      conversationId,
      message,
      lessonId,
      moduleId,
    });
    if (result.conversationId) {
      setConversationId(result.conversationId);
    }
  };

  const handleComplete = async (_message: string) => {
    const cid = conversationId ?? existingConv?.id;
    if (cid) {
      // Save assistant message server-side (future enhancement)
    }
  };

  const { messages, isLoading, sendMessage } = useChatStream({
    lessonId,
    moduleId,
    locale,
    initialMessages,
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
          onKeyDown={(e) => e.key === "Enter" && !isLoading && sendMessage(input)}
          placeholder="Ask about this lesson..."
          aria-label="Chat message"
          className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm"
        />
        <Button size="sm" onClick={() => sendMessage(input)} disabled={isLoading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
