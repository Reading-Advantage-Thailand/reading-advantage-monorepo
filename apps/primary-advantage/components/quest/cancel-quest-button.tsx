"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

/**
 * Cancels an open quest through `DELETE /api/v1/quest/:questId` and refreshes the page.
 * @param props.questId The quest.
 * @returns The button and its error line.
 */
export function CancelQuestButton({ questId }: { questId: string }) {
  const t = useTranslations("Quest.teacher");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cancel = () => {
    setError(null);
    start(async () => {
      const response = await fetch(`/api/v1/quest/${questId}`, { method: "DELETE" });
      if (!response.ok) return setError(t("cancelError"));
      router.refresh();
    });
  };
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" disabled={pending} onClick={cancel} className="min-h-11 rounded-xl">
        {t("cancel")}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
