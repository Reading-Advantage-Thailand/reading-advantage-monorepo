"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { CheckCircle2, XCircle, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { useTranslations } from "next-intl";

type Result = {
  overallScore: number;
  passed: boolean;
  criteria: Array<{ criterion: string; score: number; feedback: string }>;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedNextAction: string;
  transcriptExcerpt?: string;
};

export function RoleplayResult({ result }: { result: Result }) {
  const t = useTranslations("result");
  const tone =
    result.overallScore >= 80
      ? "text-green-600 bg-green-50 border-green-200"
      : result.overallScore >= 60
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-red-600 bg-red-50 border-red-200";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("score")}</CardTitle>
          <Badge variant={result.passed ? "default" : "destructive"}>
            {result.passed ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" /> {t("passed")}
              </>
            ) : (
              <>
                <XCircle className="mr-1 h-3 w-3" /> {t("failed")}
              </>
            )}
          </Badge>
        </div>
        <div className={`mt-2 rounded-lg border p-4 ${tone}`}>
          <div className="text-4xl font-bold">{result.overallScore}/100</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium">{t("summary")}</p>
          <p className="mt-1 text-muted-foreground">{result.summary}</p>
        </div>

        {result.criteria.length > 0 && (
          <div>
            <p className="mb-2 font-medium">{t("criteria")}</p>
            <div className="space-y-2">
              {result.criteria.map((c, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.criterion}</span>
                    <span className="text-sm">{c.score}/100</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.strengths.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1 font-medium text-green-700">
              <TrendingUp className="h-3 w-3" /> {t("strengths")}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {result.weaknesses.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1 font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" /> {t("weaknesses")}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {result.weaknesses.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg bg-primary/5 p-3">
          <p className="flex items-center gap-1 font-medium text-primary">
            <Target className="h-3 w-3" /> {t("suggestedAction")}
          </p>
          <p className="mt-1 text-muted-foreground">{result.suggestedNextAction}</p>
        </div>

        {result.transcriptExcerpt && (
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer font-medium">{t("transcript")}</summary>
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {result.transcriptExcerpt}
            </p>
          </details>
        )}
      </CardContent>
    </Card>
  );
}