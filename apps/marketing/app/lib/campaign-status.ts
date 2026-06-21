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