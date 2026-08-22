import { describe, expect, it, vi } from "vitest";

import { createCatalogStandardEdition } from "./catalog-standard-art.js";
import {
  createFlightParallax,
  FLIGHT_PARALLAX_KEYS,
  hasFlightParallax,
  tickFlightParallax,
} from "./flight-parallax.js";

describe("flight parallax", () => {
  it("detects far, mid, and near bindings on dragon titles", () => {
    const edition = createCatalogStandardEdition(
      ["dragon-rider/player-flight"],
      "/assets/apk/standard-pack-qc/",
      "dragon-flight",
    );
    expect(hasFlightParallax(edition)).toBe(true);
    expect(FLIGHT_PARALLAX_KEYS.every((key) => edition.bindings[key]?.file.startsWith("parallax-"))).toBe(true);
  });

  it("scrolls ground slowest and nearby air fastest", () => {
    const edition = createCatalogStandardEdition(
      ["dragon-rider/player-flight"],
      "/assets/apk/standard-pack-qc/",
      "dragon-flight",
    );
    const created: Array<{
      setDepth: ReturnType<typeof vi.fn>;
      setAlpha: ReturnType<typeof vi.fn>;
      setTilePosition: ReturnType<typeof vi.fn>;
    }> = [];
    const scene = {
      add: {
        tileSprite: vi.fn(() => {
          const sprite = {
            setOrigin: vi.fn(),
            setDepth: vi.fn(),
            setAlpha: vi.fn(),
            setTilePosition: vi.fn(),
            destroy: vi.fn(),
          };
          created.push(sprite);
          return sprite;
        }),
      },
    };
    const layers = createFlightParallax(scene, edition, 960, 540);
    expect(scene.add.tileSprite).toHaveBeenCalledTimes(3);
    expect(FLIGHT_PARALLAX_KEYS).toEqual([
      "world:parallax-near",
      "world:parallax-far",
      "world:parallax-mid",
    ]);
    expect(created[0]?.setDepth).toHaveBeenCalledWith(-30);
    expect(created[0]?.setAlpha).toHaveBeenCalledWith(1);
    expect(created[2]?.setDepth).toHaveBeenCalledWith(-18);
    tickFlightParallax(layers, 1000);
    expect(created.map((sprite) => sprite.setTilePosition.mock.calls[0]?.[1])).toEqual([
      18, 36, 64,
    ]);
  });
});
