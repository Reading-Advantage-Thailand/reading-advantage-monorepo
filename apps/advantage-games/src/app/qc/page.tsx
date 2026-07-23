import { StandardPackQc, type StandardPackQcPreview } from "@/components/apk/StandardPackQc";
import preview from "@/lib/apk/standard-pack-qc-preview.json";

/**
 * Serves the finite, pinned Standard Pack quality-control preview.
 * @returns The browser QC route backed only by generated preview metadata and materialized media.
 */
export default function StandardPackQcPage() {
  return <StandardPackQc preview={preview as StandardPackQcPreview} />;
}
