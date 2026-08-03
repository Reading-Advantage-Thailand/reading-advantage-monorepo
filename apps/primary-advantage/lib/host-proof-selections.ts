import "server-only";

import { getMultiTitleHostProofSelectedEdition } from "@reading-advantage/advantage-play-kit/editions";
import type { RuntimeEdition } from "@reading-advantage/advantage-play-kit/runtime";

let edition: RuntimeEdition | undefined;

/**
 * Returns the selected three-asset Dragon Flight edition for a server-rendered proof page.
 * @returns The accepted standard-pack edition without exposing a broader catalog to the client.
 */
export function getDragonFlightHostProofEdition(): RuntimeEdition {
  edition ??= getMultiTitleHostProofSelectedEdition();
  return edition;
}
