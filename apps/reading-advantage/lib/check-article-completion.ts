export async function checkArticleCompletion(
  userId: string,
  articleId: string
): Promise<{
  mcqCompleted: boolean;
  saqCompleted: boolean;
  laqCompleted: boolean;
  allCompleted: boolean;
  wasAlreadyCompleted?: boolean;
}> {
  try {
    const articleReadResponse = await fetch(
      `/api/v1/users/${userId}/activitylog`
    );
    
    let wasAlreadyCompleted = false;
    if (articleReadResponse.ok) {
      const responseData = await articleReadResponse.json();
      const activities = responseData.activityLogs || [];
      wasAlreadyCompleted = activities.some((activity: any) => 
        activity.activityType === 'article_read' && 
        activity.articleId === articleId && 
        activity.completed
      );
    }

    const userResponse = await fetch(`/api/v1/users/${userId}`);
    const userData = await userResponse.json();
    const hasLicense = userData.data?.licenseId;

    const mcqResponse = await fetch(
      `/api/v1/articles/${articleId}/questions/mcq`
    );
    const mcqData = await mcqResponse.json();
    const mcqCompleted = mcqData.state === 2;

    const saqResponse = await fetch(
      `/api/v1/articles/${articleId}/questions/sa`
    );
    const saqData = await saqResponse.json();
    const saqCompleted = saqData.state === 2;

    const laqResponse = await fetch(
      `/api/v1/articles/${articleId}/questions/laq`
    );
    const laqData = await laqResponse.json();
    const laqCompleted = laqData.state === 2;
    
    const allCompleted = hasLicense 
      ? mcqCompleted && saqCompleted && laqCompleted
      : mcqCompleted && saqCompleted;

    return {
      mcqCompleted,
      saqCompleted,
      laqCompleted,
      allCompleted,
      wasAlreadyCompleted,
    };
  } catch (error) {
    console.error("Error checking article completion:", error);
    return {
      mcqCompleted: false,
      saqCompleted: false,
      laqCompleted: false,
      allCompleted: false,
      wasAlreadyCompleted: false,
    };
  }
}
