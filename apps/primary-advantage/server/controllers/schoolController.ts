import {
  updateSchoolRankingModel,
  getSchoolLeaderboardModel,
} from "../models/schoolModel";

export const updateSchoolRankingController = async () => {
  try {
    const result = await updateSchoolRankingModel();
    if (!result?.success) {
      throw new Error(result?.error || "Failed to update school ranking");
    }
    return { success: true, message: "School ranking updated successfully" };
  } catch (error) {
    console.error("School Controller: Error updating school ranking:", error);
    throw new Error(
      "School Controller: Error updating school ranking: " + error,
    );
  }
};

export const getSchoolLeaderboardController = async (
  schoolId?: string,
  userId?: string,
) => {
  try {
    const result = await getSchoolLeaderboardModel(schoolId, userId);
    if (!result?.success) {
      throw new Error(result?.error || "Failed to fetch school leaderboard");
    }
    return { success: true, data: result.data };
  } catch (error) {
    console.error(
      "School Controller: Error fetching school leaderboard:",
      error,
    );
    throw new Error(
      "School Controller: Error fetching school leaderboard: " + error,
    );
  }
};
