"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import { useChatStream } from "@/lib/use-chat-stream";

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;

  const { data: lesson, isLoading } = trpc.codecamp.lesson.useQuery(
    { lessonId },
    { enabled: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId) }
  );

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
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </a>
        </Button>
        <h1 className="text-2xl font-bold">Lesson not found</h1>
        <p className="mt-2 text-muted-foreground">
          The lesson ID <code>{lessonId}</code> does not exist or is not yet published.
        </p>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <a href={`/module/${lesson.moduleId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Module
        </a>
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
          {lesson.content && Object.keys(lesson.content).length > 0 ? (
            <pre className="mt-4 overflow-x-auto rounded bg-muted p-4 text-sm">
              {JSON.stringify(lesson.content, null, 2)}
            </pre>
          ) : (
            <p className="mt-4 text-muted-foreground">
              No structured content available for this lesson yet.
            </p>
          )}
        </div>

        {/* Exercises */}
        {lesson.exercises.length > 0 && (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Exercises</h2>
            {lesson.exercises.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        )}

        {/* Quiz */}
        {lesson.quizQuestions.length > 0 && (
          <div className="mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Quiz</h2>
            <QuizComponent lessonId={lesson.id} questions={lesson.quizQuestions} />
          </div>
        )}

        {/* Chat Tutor */}
        <div className="mt-8 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Chat with AI Tutor</h2>
          <ChatTutor lessonId={lessonId} />
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
  questions,
}: {
  lessonId: string;
  questions: { id: string; question: string; options: string[] }[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const submitQuiz = trpc.codecamp.submitQuiz.useMutation({
    onSuccess: () => setSubmitted(true),
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

function ChatTutor({ lessonId }: { lessonId: string }) {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage } = useChatStream({ lessonId });

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
