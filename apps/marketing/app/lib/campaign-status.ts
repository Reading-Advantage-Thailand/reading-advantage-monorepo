export type CampaignStatus = "draft" | "in-progress" | "complete" | "archived";

const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["in-progress"],
  "in-progress": ["complete"],
  complete: ["archived"],
  archived: [],
};

export function nextCampaignStatuses(status: string): CampaignStatus[] {
  return STATUS_TRANSITIONS[status as CampaignStatus] ?? [];
}

export function isValidCampaignStatusTransition(
  from: string,
  to: string,
): boolean {
  return (STATUS_TRANSITIONS[from as CampaignStatus] ?? []).includes(
    to as CampaignStatus,
  );
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "#e0e0e0",
  "in-progress": "#fff3e0",
  complete: "#e8f5e9",
  archived: "#f3e5f5",
};

/**
 * Maps a campaign status to its badge background color.
 * @param status The campaign status label.
 * @returns The hex color for the status badge, or the archived color for unknown statuses.
 */
export function campaignStatusColor(status: string): string {
  return STATUS_COLORS[status as CampaignStatus] ?? STATUS_COLORS.archived;
}