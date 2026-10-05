import { ReedyMeter, type ReedyMeterData } from "@/components/reedy/reedy-meter";

/**
 * The Reedy meter on the student home (FR-9). The home passes the month's entitlement; nothing
 * renders when the read failed, so the home shows no empty box.
 * @param props.data The entitlement numbers, or null.
 * @param props.t The `Reedy` translator.
 * @returns The meter, or nothing.
 */
export function ReedyMeterSlot({ data, t }: { data: ReedyMeterData | null; t: (key: string, values?: Record<string, string | number>) => string }): React.ReactNode {
  return data ? <ReedyMeter data={data} t={t} /> : null;
}
