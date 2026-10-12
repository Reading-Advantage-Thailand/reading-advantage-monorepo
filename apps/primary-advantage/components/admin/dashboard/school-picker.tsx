"use client";

import { useRouter } from "@/i18n/navigation";
import { Panel } from "@/components/rpg/chrome";
import { SchoolSelect } from "@/components/admin/school-select";
import { dashboardHref, type AdoptionView } from "./href";
import type { DashboardRange } from "@reading-advantage/domain/primary-dashboards";

/**
 * The school selector at the top of the dashboard for a SYSTEM user (FR-14). It wraps the shared
 * school select and sets the URL value `school`; the range and the adoption view stay.
 * @param props.value The chosen school id, or an empty string.
 * @param props.range The open range.
 * @param props.by The adoption view.
 * @returns The panel with the selector.
 */
export function SchoolPicker({ value, range, by }: { value: string; range: DashboardRange; by: AdoptionView }) {
  const router = useRouter();
  return (
    <Panel className="gap-2 [&_[role=combobox]]:w-full">
      <SchoolSelect value={value} onChange={(school) => router.push(dashboardHref({ range, by, school }))} />
    </Panel>
  );
}
