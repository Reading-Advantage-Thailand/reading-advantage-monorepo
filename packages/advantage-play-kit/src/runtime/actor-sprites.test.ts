import { describe, expect, it, vi } from "vitest";

import { createActorSpriteLayer, type ActorSpriteLike } from "./actor-sprites.js";
import { createRuntimeEdition } from "../testing/fixtures.js";

function createSprite(): ActorSpriteLike & Record<string, ReturnType<typeof vi.fn>> {
  const sprite = {
    setOrigin: vi.fn(() => sprite),
    setDisplaySize: vi.fn(() => sprite),
    setDepth: vi.fn(() => sprite),
    setPosition: vi.fn(() => sprite),
    setVisible: vi.fn(() => sprite),
    setFlipX: vi.fn(() => sprite),
    setAngle: vi.fn(() => sprite),
    setAlpha: vi.fn(() => sprite),
    destroy: vi.fn(),
  } as unknown as ActorSpriteLike & Record<string, ReturnType<typeof vi.fn>>;
  return sprite;
}

function createScene() {
  const created: (ActorSpriteLike & Record<string, ReturnType<typeof vi.fn>>)[] = [];
  const make = () => {
    const sprite = createSprite();
    created.push(sprite);
    return sprite;
  };
  return {
    created,
    add: {
      sprite: vi.fn(make),
      image: vi.fn(make),
      tileSprite: vi.fn(make),
    },
  };
}

describe("actor sprite layer", () => {
  const edition = createRuntimeEdition();
  const playerKey = Object.keys(edition.bindings)[0] as string;

  it("creates one sprite for an actor and then moves it every frame", () => {
    const scene = createScene();
    const layer = createActorSpriteLayer(scene, edition);

    expect(layer.place("player", playerKey, { x: 10, y: 20, width: 32 })).toBe(true);
    expect(layer.place("player", playerKey, { x: 90, y: 40, width: 32 })).toBe(true);
    expect(layer.place("player", playerKey, { x: 150, y: 60, width: 32 })).toBe(true);

    expect(scene.created, "one actor must own exactly one sprite").toHaveLength(1);
    const sprite = scene.created[0]!;
    expect(sprite.setPosition.mock.calls).toEqual([[10, 20], [90, 40], [150, 60]]);
  });

  it("gives each actor id its own sprite", () => {
    const scene = createScene();
    const layer = createActorSpriteLayer(scene, edition);

    layer.place("enemy:0", playerKey, { x: 1, y: 1, width: 16 });
    layer.place("enemy:1", playerKey, { x: 2, y: 2, width: 16 });
    layer.place("enemy:2", playerKey, { x: 3, y: 3, width: 16 });

    expect(scene.created).toHaveLength(3);
  });

  it("hides an actor that leaves the scene and shows it again when it returns", () => {
    const scene = createScene();
    const layer = createActorSpriteLayer(scene, edition);

    layer.place("enemy:0", playerKey, { x: 1, y: 1, width: 16 });
    layer.place("enemy:1", playerKey, { x: 2, y: 2, width: 16 });
    layer.sweep();

    layer.place("enemy:0", playerKey, { x: 5, y: 5, width: 16 });
    layer.sweep();
    expect(scene.created[1]!.setVisible).toHaveBeenLastCalledWith(false);

    layer.place("enemy:0", playerKey, { x: 5, y: 5, width: 16 });
    layer.place("enemy:1", playerKey, { x: 6, y: 6, width: 16 });
    layer.sweep();
    expect(scene.created[1]!.setVisible).toHaveBeenLastCalledWith(true);
    expect(scene.created, "a returning actor must reuse its sprite").toHaveLength(2);
  });

  it("reports a missing binding instead of drawing a placeholder", () => {
    const scene = createScene();
    const layer = createActorSpriteLayer(scene, edition);

    expect(layer.has("no:such-binding")).toBe(false);
    expect(layer.place("ghost", "no:such-binding", { x: 0, y: 0, width: 8 })).toBe(false);
    expect(scene.created).toHaveLength(0);
  });

  it("destroys every sprite it owns", () => {
    const scene = createScene();
    const layer = createActorSpriteLayer(scene, edition);

    layer.place("a", playerKey, { x: 0, y: 0, width: 8 });
    layer.place("b", playerKey, { x: 0, y: 0, width: 8 });
    layer.destroy();

    for (const sprite of scene.created) expect(sprite.destroy).toHaveBeenCalledOnce();
  });
});
