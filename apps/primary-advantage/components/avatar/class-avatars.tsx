"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ClassAvatar } from "@reading-advantage/game-contracts";
import { Button } from "@/components/ui/button";
import { AvatarPortrait } from "./portrait-canvas";

/**
 * The teacher's class avatar list (FR-6): a portrait per student and a reset button that calls
 * `POST /api/v1/classroom/:id/avatars/:userId/reset`.
 * @param props.classroomId The class.
 * @param props.students The students with their avatars.
 * @returns The list.
 */
export function ClassAvatars({ classroomId, students: initial }: { classroomId: string; students: ClassAvatar[] }) {
  const t = useTranslations("ClassAvatars");
  const [students, setStudents] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reset = (userId: string) => {
    setError(null);
    start(async () => {
      const response = await fetch(`/api/v1/classroom/${classroomId}/avatars/${userId}/reset`, { method: "POST" });
      if (!response.ok) return setError(t("loadError"));
      setStudents((list) => list.map((s) => (s.userId === userId ? { ...s, profile: null, loadout: {} } : s)));
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {students.map((s) => (
          <li key={s.userId} className="bg-card flex flex-col items-center gap-2 rounded-2xl border p-3 shadow-sm">
            {s.profile ? (
              <AvatarPortrait classId={s.profile.classId} pieces={Object.values(s.loadout)} tints={s.profile.tints} alt={s.name} className="max-w-40 rounded-xl" />
            ) : (
              <div className="bg-muted text-muted-foreground flex aspect-square w-full max-w-40 items-center justify-center rounded-xl text-center text-sm">{t("noAvatar")}</div>
            )}
            <span className="text-center text-base font-semibold">{s.name}</span>
            {s.profile ? (
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => reset(s.userId)} className="min-h-11 rounded-xl">
                {t("reset")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
