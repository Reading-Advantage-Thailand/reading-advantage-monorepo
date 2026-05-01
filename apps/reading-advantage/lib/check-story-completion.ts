export async function checkStoryCompletion(
  userId: string,
  storyId: string,
  chapterNumber: string
): Promise<{
  mcqCompleted: boolean;
  saqCompleted: boolean;
  laqCompleted: boolean;
  allCompleted: boolean;
  wasAlreadyCompleted?: boolean;
}> {
  try {
    // Check existing activity logs for STORIES_READ for this story/chapter
    const activityResponse = await fetch(`/api/v1/users/${userId}/activitylog`);
    let wasAlreadyCompleted = false;
    if (activityResponse.ok) {
      const responseData = await activityResponse.json();
      const activities = responseData.activityLogs || [];
      wasAlreadyCompleted = activities.some((activity: any) =>
        activity.activityType === 'stories_read' && activity.targetId?.startsWith(storyId) && activity.completed
      );
    }

    const mcqResponse = await fetch(
      `/api/v1/stories/${storyId}/${chapterNumber}/question/mcq`
    );
    const mcqData = await mcqResponse.json();
    const mcqCompleted = mcqData.state === 2;

    const saqResponse = await fetch(
      `/api/v1/stories/${storyId}/${chapterNumber}/question/sa`
    );
    const saqData = await saqResponse.json();
    const saqCompleted = saqData.state === 2;

    const laqResponse = await fetch(
      `/api/v1/stories/${storyId}/${chapterNumber}/question/laq`
    );
    const laqData = await laqResponse.json();
    const laqCompleted = laqData.state === 2;

    // For stories, consider all three types; if LA not present treat as true
    const allCompleted = mcqCompleted && saqCompleted && laqCompleted;

    return {
      mcqCompleted,
      saqCompleted,
      laqCompleted,
      allCompleted,
      wasAlreadyCompleted,
    };
  } catch (error) {
    console.error("Error checking story completion:", error);
    return {
      mcqCompleted: false,
      saqCompleted: false,
      laqCompleted: false,
      allCompleted: false,
      wasAlreadyCompleted: false,
    };
  }
}
