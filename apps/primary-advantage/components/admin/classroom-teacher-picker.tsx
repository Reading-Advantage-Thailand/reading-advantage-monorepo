"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/rpg/chrome";

/** One teacher of the school as the picker shows it. */
interface PickerTeacher {
  id: string;
  name: string;
  email: string;
}

/**
 * The teacher check list of the class edit dialog. It lists the teachers of the class school.
 * The class owner row is checked, disabled, and labeled "Class owner".
 * @param props.schoolId The school of the class (the server uses it for SYSTEM only).
 * @param props.ownerId The user id of the class owner.
 * @param props.selectedIds The user ids of the teachers that are checked.
 * @param props.onChange Called with the new list of checked ids (the owner always in it).
 * @returns The picker panel.
 */
export function ClassroomTeacherPicker({
  schoolId,
  ownerId,
  selectedIds,
  onChange,
}: {
  schoolId?: string;
  ownerId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations("Admin.Classrooms.picker");
  const [teachers, setTeachers] = useState<PickerTeacher[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ role: "teacher", limit: "500" });
    if (schoolId) query.set("schoolId", schoolId);
    fetch(`/api/teachers?${query}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: { teachers?: PickerTeacher[] }) => {
        if (!active) return;
        setTeachers(data.teachers ?? []);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("failed");
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(ownerId && !next.includes(ownerId) ? [ownerId, ...next] : next);
  };

  return (
    <Panel className="gap-1 p-3" data-testid="classroom-teacher-picker">
      <p className="text-sm">{t("hint")}</p>
      {state === "loading" && <p role="status">{t("loading")}</p>}
      {state === "failed" && <p role="alert">{t("loadFailed")}</p>}
      {state === "ready" && teachers.length === 0 && <p>{t("empty")}</p>}
      <ul className="max-h-64 overflow-y-auto">
        {teachers.map((teacher) => {
          const isOwner = teacher.id === ownerId;
          return (
            <li key={teacher.id} className="border-b border-current/20 last:border-b-0">
              <label className="flex min-h-12 items-center gap-3 py-1">
                <input
                  type="checkbox"
                  className="size-5 shrink-0"
                  checked={isOwner || selectedIds.includes(teacher.id)}
                  disabled={isOwner}
                  onChange={() => toggle(teacher.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{teacher.name}</span>
                  <span className="block truncate text-xs opacity-75">{teacher.email}</span>
                </span>
                {isOwner && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">{t("owner")}</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-xs">{t("selected", { count: new Set([...selectedIds, ...(ownerId ? [ownerId] : [])]).size })}</p>
    </Panel>
  );
}
