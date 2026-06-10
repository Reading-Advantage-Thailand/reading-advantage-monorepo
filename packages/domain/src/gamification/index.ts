export { gamificationProfiles, achievements } from "@reading-advantage/db/schema";
export { getGamificationProfile } from "./queries.js";
export { updateGamificationXp } from "./mutations.js";
export { GAMIFICATION_PERMISSIONS } from "./permissions.js";
export { GamificationError, InsufficientXpError } from "./errors.js";
export {
  getGamificationProfileInputSchema,
  gamificationProfileSchema,
  updateGamificationXpInputSchema,
  type GetGamificationProfileInput,
  type GamificationProfile,
  type UpdateGamificationXpInput,
} from "./contracts.js";
