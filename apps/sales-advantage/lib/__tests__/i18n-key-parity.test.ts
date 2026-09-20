// @vitest-environment node
import { describe, expect, it } from "vitest";

import enMessages from "../../messages/en.json";
import thMessages from "../../messages/th.json";

type MessageTree = Record<string, unknown>;

/**
 * Collects every leaf key from a nested locale dictionary by dot path.
 * @param tree Nested locale dictionary.
 * @param prefix Dot path of the parent node.
 * @returns Every leaf key, including nested segments.
 */
function collectMessageKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([segment, value]) => {
    const key = prefix ? `${prefix}.${segment}` : segment;
    return value !== null && typeof value === "object"
      ? collectMessageKeys(value as MessageTree, key)
      : [key];
  });
}

/**
 * Reads a leaf value from a locale dictionary by dot path.
 * @param messages Nested locale dictionary.
 * @param key Dot path of the message.
 * @returns The leaf value, or undefined when a segment is missing.
 */
function readAt(messages: MessageTree, key: string): unknown {
  let current: unknown = messages;
  for (const segment of key.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as MessageTree)[segment];
  }
  return current;
}

describe("Sales message dictionary key parity", () => {
  const enKeys = collectMessageKeys(enMessages as MessageTree).sort();
  const thKeys = collectMessageKeys(thMessages as MessageTree).sort();

  it("defines the exact same key set in both locales", () => {
    expect(thKeys).toEqual(enKeys);
  });

  it("defines every key as a non-empty string in both locales", () => {
    for (const key of enKeys) {
      expect(readAt(enMessages as MessageTree, key), `en: ${key}`).toBeTruthy();
    }
    for (const key of thKeys) {
      expect(readAt(thMessages as MessageTree, key), `th: ${key}`).toBeTruthy();
    }
  });
});
