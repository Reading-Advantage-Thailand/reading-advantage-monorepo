export class StoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryError";
  }
}

export class StoryNotFoundError extends StoryError {
  constructor(id: string) {
    super(`Story not found: ${id}`);
    this.name = "StoryNotFoundError";
  }
}

export class ChapterNotFoundError extends StoryError {
  constructor(storyId: string, chapterNumber?: number) {
    super(chapterNumber === undefined ? `Chapter not found: ${storyId}` : `Chapter not found: ${storyId}/${chapterNumber}`);
    this.name = "ChapterNotFoundError";
  }
}
