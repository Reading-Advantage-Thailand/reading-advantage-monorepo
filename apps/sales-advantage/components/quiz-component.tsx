"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@reading-advantage/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle } from "lucide-react";

export function QuizComponent({
  lessonId,
  questions,
}: {
  lessonId: string;
  questions: Array<{
    id: string;
    question: string;
    optionsJson: string[];
  }>;
}) {
  const t = useTranslations("quiz");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    results: Array<{
      questionId: string;
      correct: boolean;
      explanation: string;
    }>;
  } | null>(null);
  const submitQuiz = trpc.sales.submitQuiz.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function submit() {
    submitQuiz.mutate({ lessonId, answers });
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("score")}</CardTitle>
            <Badge variant={result.passed ? "default" : "destructive"}>
              {result.passed ? t("passed") : t("failed")}
            </Badge>
          </div>
          <div className="mt-2 text-4xl font-bold">{result.score}%</div>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q) => {
            const questionResult = result.results.find(
              (candidate) => candidate.questionId === q.id,
            );
            const correct = questionResult?.correct === true;
            return (
              <div key={q.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">{q.question}</p>
                    {questionResult?.explanation && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <strong>{t("explanation")}:</strong>{" "}
                        {questionResult.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!result.passed && (
            <Button
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              variant="outline"
            >
              {t("submit")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-3">
            <p className="font-medium">
              {idx + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.optionsJson.map((opt, oi) => (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted ${
                    answers[q.id] === opt ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button
          onClick={submit}
          disabled={
            Object.keys(answers).length !== questions.length ||
            submitQuiz.isPending
          }
          className="w-full"
        >
          {t("submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
