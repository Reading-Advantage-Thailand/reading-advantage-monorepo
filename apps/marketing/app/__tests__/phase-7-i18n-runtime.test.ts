import { describe, expect, it } from "vitest";
import {
  getMarketingAppName,
  getMarketingMessage,
  getMarketingStatusLabel,
  interpolateMarketingMessage,
} from "@/lib/i18n";

const messageKey = (key: string) =>
  key as Parameters<typeof getMarketingMessage>[0];

describe("Marketing i18n runtime contract", () => {
  it.each([
    ["ampersand", "$&"],
    ["backtick", "$`"],
    ["apostrophe", "$'"],
    ["dollar", "$$"],
  ])("preserves replacement token syntax in %s values", (_name, value) => {
    expect(
      interpolateMarketingMessage("prefix={value}:suffix", { value }),
    ).toBe(`prefix=${value}:suffix`);
  });

  it("preserves braces, HTML payloads, and multiple placeholders", () => {
    expect(
      interpolateMarketingMessage(
        "first={first}; second={second}; literal={{braces}}",
        {
          first: "<strong>$&</strong>",
          second: "value with {braces}",
        },
      ),
    ).toBe(
      "first=<strong>$&</strong>; second=value with {braces}; literal={{braces}}",
    );
  });

  it("does not reinterpret inserted placeholders in either value order", () => {
    expect(
      interpolateMarketingMessage("{first}:{second}", {
        first: "{second}",
        second: "B",
      }),
    ).toBe("{second}:B");

    const reverseOrder: Record<string, string | number> = Object.create(null);
    reverseOrder.second = 7;
    reverseOrder.first = "{second}";
    expect(interpolateMarketingMessage("{first}:{second}", reverseOrder)).toBe(
      "{second}:7",
    );
  });

  it("replaces repeated placeholders without rescanning their payload", () => {
    const payload = "<strong>$& {value}</strong>";
    expect(
      interpolateMarketingMessage("value={value}|{value}", { value: payload }),
    ).toBe(`value=${payload}|${payload}`);
  });

  it("preserves unknown and empty placeholders literally", () => {
    expect(
      interpolateMarketingMessage("known={known}; unknown={missing}; {}", {
        known: "value",
      }),
    ).toBe("known=value; unknown={missing}; {}");
  });

  it("uses own placeholder keys without prototype lookups", () => {
    const ownValues: Record<string, string | number> = Object.create(null);
    ownValues["__proto__"] = "own proto";
    ownValues["constructor"] = "own constructor";
    const inheritedValues = Object.create({ toString: "inherited" }) as Record<
      string,
      string | number
    >;

    expect(
      interpolateMarketingMessage(
        "{__proto__}:{constructor}:{toString}",
        ownValues,
      ),
    ).toBe("own proto:own constructor:{toString}");
    expect(
      interpolateMarketingMessage("{constructor}:{toString}", inheritedValues),
    ).toBe("{constructor}:{toString}");
  });

  it("uses exact interpolation semantics through the main accessor", () => {
    expect(getMarketingMessage("video.title", { name: "$& <$`> $' $$" })).toBe(
      "Video Production: $& <$`> $' $$",
    );
  });

  it("fails closed for prototype and unknown message keys", () => {
    for (const key of ["__proto__", "constructor", "toString", "unknown"]) {
      expect(getMarketingMessage(messageKey(key))).toBe(key);
      expect(getMarketingAppName(key)).toBe(key);
      expect(getMarketingStatusLabel(key)).toBe(key);
    }
  });

  it("provides browser metadata through the message accessor", () => {
    expect(getMarketingMessage("metadata.title")).toBe(
      "Marketing Production Platform",
    );
    expect(getMarketingMessage("metadata.description")).toBe(
      "Human-in-the-loop marketing production for Reading Advantage",
    );
  });

  it("provides the default motion direction through the message accessor", () => {
    expect(getMarketingMessage("video.defaultMotionDirection")).toBe("Static");
  });
});
