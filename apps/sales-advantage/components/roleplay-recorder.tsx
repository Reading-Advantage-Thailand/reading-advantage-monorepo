"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@reading-advantage/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@reading-advantage/ui";
import { Checkbox } from "@reading-advantage/ui";
import { Mic, Square, Send, RotateCcw, Loader2 } from "lucide-react";
import { RoleplayResult } from "./roleplay-result";

type State =
  | "idle"
  | "recording"
  | "recorded"
  | "uploading"
  | "evaluated"
  | "error";

export function RoleplayRecorder({
  scenario,
}: {
  scenario: {
    id: string;
    personaName: string;
    personaRole: string;
    situation: string;
    objective: string;
    prospectContextJson?: unknown;
  };
}) {
  const t = useTranslations("roleplay");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<
    Parameters<typeof RoleplayResult>[0]["result"] | null
  >(null);
  const [duration, setDuration] = useState(0);
  const [consentGiven, setConsentGiven] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
        stream.getTracks().forEach((t) => t.stop());
        setState("recorded");
      };
      startTimeRef.current = Date.now();
      mediaRecorderRef.current = mr;
      mr.start();
      setState("recording");
    } catch (err) {
      setError(t("micDenied"));
      setState("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function submit() {
    if (!audioBlob || !consentGiven) return;
    setState("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("scenarioId", scenario.id);
      fd.append("audio", audioBlob, "attempt.webm");
      fd.append("durationMs", String(duration * 1000));
      fd.append("consentGiven", "true");
      fd.append("retentionDays", "30");
      const res = await fetch("/api/roleplay-attempts", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || t("errors.uploadFailed"));
      }
      const data = await res.json();
      setResult(data.evaluation);
      setState("evaluated");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.evaluationFailed"),
      );
      setState("error");
    }
  }

  function reset() {
    setState("idle");
    setAudioBlob(null);
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setConsentGiven(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {scenario.personaName}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({scenario.personaRole})
          </span>
        </CardTitle>
        <CardDescription>{scenario.situation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium">Your objective:</p>
          <p className="mt-1 text-muted-foreground">{scenario.objective}</p>
        </div>

        {state === "idle" && (
          <Button onClick={startRecording} size="lg" className="w-full gap-2">
            <Mic className="h-4 w-4" /> {t("record")}
          </Button>
        )}

        {state === "recording" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <div className="h-3 w-3 animate-pulse rounded-full bg-destructive" />
              <span className="font-medium text-destructive">
                {t("recording")}
              </span>
            </div>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="lg"
              className="w-full gap-2"
            >
              <Square className="h-4 w-4" /> {t("stop")}
            </Button>
          </div>
        )}

        {state === "recorded" && audioUrl && (
          <div className="space-y-3">
            <audio
              src={audioUrl}
              controls
              className="w-full"
              aria-label={t("listen")}
            />
            <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
                aria-label={t("consentLabel")}
              />
              <span>{t("consentText")}</span>
            </label>
            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" /> {t("retry")}
              </Button>
              <Button
                onClick={submit}
                disabled={!consentGiven}
                className="flex-1 gap-2"
              >
                <Send className="h-4 w-4" /> {t("submit")}
              </Button>
            </div>
          </div>
        )}

        {state === "uploading" && (
          <div className="flex items-center justify-center gap-2 rounded-lg border p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("evaluating")}</span>
          </div>
        )}

        {state === "evaluated" && result && (
          <div className="space-y-3">
            <RoleplayResult result={result} />
            <Button onClick={reset} variant="outline" className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> {t("retry")}
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
            <Button onClick={reset} variant="outline" className="w-full">
              {t("retry")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
