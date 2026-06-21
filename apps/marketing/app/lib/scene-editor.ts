export interface Scene {
  narration: string;
  imagePrompt: string;
  motionDirection: string;
}

export function reorderScenes(
  scenes: Scene[],
  fromIndex: number,
  toIndex: number,
): Scene[] {
  if (
    fromIndex < 0 ||
    fromIndex >= scenes.length ||
    toIndex < 0 ||
    toIndex >= scenes.length ||
    fromIndex === toIndex
  ) {
    return [...scenes];
  }
  const next = [...scenes];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function addScene(scenes: Scene[], scene: Scene): Scene[] {
  return [...scenes, scene];
}

export function removeScene(scenes: Scene[], index: number): Scene[] {
  if (index < 0 || index >= scenes.length) {
    return [...scenes];
  }
  return [...scenes.slice(0, index), ...scenes.slice(index + 1)];
}
