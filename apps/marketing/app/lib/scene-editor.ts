import type { ScriptScene } from "@/lib/script-schema";

export function reorderScenes(
  scenes: ScriptScene[],
  fromIndex: number,
  toIndex: number,
): ScriptScene[] {
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

export function addScene(scenes: ScriptScene[], scene: ScriptScene): ScriptScene[] {
  return [...scenes, scene];
}

export function removeScene(scenes: ScriptScene[], index: number): ScriptScene[] {
  if (index < 0 || index >= scenes.length) {
    return [...scenes];
  }
  return [...scenes.slice(0, index), ...scenes.slice(index + 1)];
}
