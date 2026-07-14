"use client";

import { FormEvent, useState } from "react";

type TutorLevel = "diagnostic" | "conceptual_hint" | "location_hint" | "partial_scaffold" | "worked_example";
type TutorResourceAction =
  | { type: "open"; target: string }
  | { type: "seek"; startSeconds: number; endSeconds: number }
  | { type: "highlight"; target: string };

interface TutorResource {
  id: string;
  kind: "video" | "diagram" | "lesson" | "repository" | "doc";
  title: string;
  action: TutorResourceAction;
}

interface TutorCoachResponse {
  ok: boolean;
  interventionId: string;
  intervention: {
    message: string;
    level: TutorLevel;
    diagnosticQuestion: string | null;
    misconceptionTags: string[];
  };
  resource: TutorResource | null;
}

/** Maps one trusted resource action into a concise, learner-visible button label. */
function resourceActionLabel(resource: TutorResource, thai: boolean): string {
  if (resource.action.type === "seek") return thai ? "เปิดช่วงวิดีโอ" : "Open video segment";
  if (resource.action.type === "highlight") return thai ? "เปิดแผนภาพ" : "Open diagram";
  return thai ? "เปิดแหล่งเรียนรู้" : "Open resource";
}

/**
 * Renders an accessible, activity-bound learner coach without collecting arbitrary repository data.
 * @param props Session identity, authored step, locale, and optional UI callbacks for support/resource actions.
 * @returns A compact intervention form and the latest server-validated response.
 */
export function TutorCoach({
  activitySessionId,
  stepId,
  locale,
  onSupportLevel,
  onTrustedResourceAction,
  onInterventionCreated,
}: {
  activitySessionId: string | null;
  stepId: string;
  locale: "th" | "en";
  onSupportLevel?: (level: TutorLevel) => void | Promise<void>;
  onTrustedResourceAction?: (resource: TutorResource) => void | Promise<void>;
  onInterventionCreated?: (interventionId: string) => void;
}) {
  const thai = locale === "th";
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<TutorCoachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resourcePending, setResourcePending] = useState(false);

  const requestHelp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activitySessionId || !message.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await fetch("/api/tutor/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          requestId: crypto.randomUUID(),
          activitySessionId,
          message: message.trim(),
          locale,
          stepId,
        }),
      });
      const payload = await result.json() as TutorCoachResponse | { error?: string };
      if (!result.ok || !("interventionId" in payload)) throw new Error("error" in payload ? payload.error ?? "Tutor request failed" : "Tutor request failed");
      await onSupportLevel?.(payload.intervention.level);
      setResponse(payload);
      setMessage("");
      onInterventionCreated?.(payload.interventionId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Tutor request failed");
    } finally {
      setPending(false);
    }
  };

  const useResource = async () => {
    if (!response?.resource || resourcePending) return;
    setResourcePending(true);
    setError(null);
    try {
      const result = await fetch("/api/tutor/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resource_use",
          interventionId: response.interventionId,
          resourceId: response.resource.id,
          actionType: response.resource.action.type,
        }),
      });
      if (!result.ok) {
        const payload = await result.json() as { error?: string };
        throw new Error(payload.error ?? "Resource action failed");
      }
      await onTrustedResourceAction?.(response.resource);
    } catch (resourceError) {
      setError(resourceError instanceof Error ? resourceError.message : "Resource action failed");
    } finally {
      setResourcePending(false);
    }
  };

  return (
    <section aria-labelledby="tutor-coach-heading" className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 id="tutor-coach-heading" className="text-xl font-semibold">{thai ? "โค้ชช่วยคิด" : "Think-it-through coach"}</h2>
        <p className="text-sm text-muted-foreground">{thai ? "บอกสิ่งที่คุณลองหรือคาดไว้ โค้ชจะเริ่มจากคำถามหรือคำใบ้เล็ก ๆ และไม่ตัดสินว่าคำตอบถูก" : "Describe what you tried or predict. The coach starts with a question or small hint and never decides correctness."}</p>
      </div>
      <form className="space-y-3" onSubmit={requestHelp}>
        <label className="block font-medium" htmlFor="tutor-message">{thai ? "ต้องการความช่วยเหลือเรื่องอะไร" : "What do you need help with?"}</label>
        <textarea
          id="tutor-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          maxLength={4_000}
          disabled={!activitySessionId || pending}
          className="w-full rounded-md border p-3"
          aria-describedby="tutor-boundary"
        />
        <p id="tutor-boundary" className="text-sm text-muted-foreground">{thai ? "ใช้เฉพาะข้อมูลของกิจกรรมนี้และขั้นตอนที่เลือก ไม่ได้อ่านไฟล์หรือข้อมูลลับในเครื่องของคุณ" : "Only this activity and selected step are used. The coach does not read local files or secrets."}</p>
        <button type="submit" disabled={!activitySessionId || !message.trim() || pending} className="min-h-11 rounded-md bg-blue-700 px-4 text-white disabled:opacity-60">
          {pending ? (thai ? "กำลังเตรียมคำใบ้…" : "Preparing a hint…") : (thai ? "ขอคำใบ้" : "Ask for a hint")}
        </button>
      </form>
      {response ? <div aria-live="polite" className="space-y-3 rounded-md bg-blue-50 p-4">
        <p>{response.intervention.message}</p>
        {response.intervention.diagnosticQuestion ? <p className="font-medium">{response.intervention.diagnosticQuestion}</p> : null}
        {response.resource ? <div className="space-y-2 rounded-md border border-blue-200 bg-white p-3">
          <p className="font-medium">{response.resource.title}</p>
          <button type="button" className="min-h-11 rounded-md border px-4" disabled={resourcePending} onClick={() => void useResource()}>{resourcePending ? (thai ? "กำลังเปิด…" : "Opening…") : resourceActionLabel(response.resource, thai)}</button>
        </div> : null}
      </div> : null}
      {error ? <p role="alert" className="text-red-700">{error}</p> : null}
    </section>
  );
}
