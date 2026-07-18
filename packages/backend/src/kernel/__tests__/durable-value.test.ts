import { describe, expect, it, vi } from "vitest";

import {
  canonicalizeDurableValue,
  decodeDurableValue,
  encodeDurableValue,
} from "../durable-value.js";

describe("durable value codec", () => {
  it("round-trips every supported primitive without collisions", () => {
    const values = [
      undefined,
      null,
      false,
      true,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -0,
      0,
      42.5,
      9_007_199_254_740_993n,
      "value",
    ];
    const canonical = values.map(canonicalizeDurableValue);
    expect(new Set(canonical)).toHaveLength(values.length);
    for (const value of values) {
      const replay = decodeDurableValue(encodeDurableValue(value));
      if (typeof value === "number" && Number.isNaN(value)) {
        expect(Number.isNaN(replay)).toBe(true);
      } else {
        expect(Object.is(replay, value)).toBe(true);
      }
    }
  });

  it("round-trips supported built-ins and sparse/null-prototype objects", () => {
    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.value = "null-prototype";
    const sparse = new Array<unknown>(4);
    sparse[1] = "present";
    const expression = new RegExp("lesson.+", "giu");
    expression.lastIndex = 7;
    const values = [
      expression,
      new URL("https://reading-advantage.com/path?q=1"),
      new Uint8Array([1, 2, 255]).buffer,
      new DataView(new Uint8Array([3, 4]).buffer),
      new Int8Array([-1, 2]),
      new Uint8Array([1, 2]),
      new Uint8ClampedArray([1, 255]),
      new Int16Array([-257, 258]),
      new Uint16Array([257, 65_535]),
      new Int32Array([-65_537, 65_538]),
      new Uint32Array([65_537]),
      new Float32Array([1.5]),
      new Float64Array([Math.PI]),
      new BigInt64Array([-2n, 3n]),
      new BigUint64Array([2n, 3n]),
      nullPrototype,
      sparse,
    ];
    const replay = values.map((value) =>
      decodeDurableValue(encodeDurableValue(value)));
    expect(replay[0]).toEqual(values[0]);
    expect((replay[0] as RegExp).lastIndex).toBe(7);
    expect(replay[1]).toEqual(values[1]);
    expect(replay.slice(2, 15).map((value) => value?.constructor.name))
      .toEqual(values.slice(2, 15).map((value) => value.constructor.name));
    expect(Object.getPrototypeOf(replay[15])).toBeNull();
    expect(replay[15]).toEqual(nullPrototype);
    expect(replay[16]).toHaveLength(4);
    expect(0 in (replay[16] as unknown[])).toBe(false);
    expect((replay[16] as unknown[])[1]).toBe("present");
  });

  it("preserves Map and Set insertion order, aliases, and cycles", () => {
    const leftMap = new Map<unknown, unknown>([["b", 2], ["a", 1]]);
    const rightMap = new Map<unknown, unknown>([["a", 1], ["b", 2]]);
    expect(canonicalizeDurableValue(leftMap)).not.toBe(
      canonicalizeDurableValue(rightMap),
    );
    expect(canonicalizeDurableValue(new Set([3, 2, 1]))).not.toBe(
      canonicalizeDurableValue(new Set([1, 2, 3])),
    );
    expect([
      ...(decodeDurableValue(encodeDurableValue(leftMap)) as Map<unknown, unknown>)
        .keys(),
    ]).toEqual(["b", "a"]);
    expect([
      ...(decodeDurableValue(encodeDurableValue(new Set([3, 2, 1]))) as Set<
        unknown
      >),
    ]).toEqual([3, 2, 1]);
    const shared = { id: "shared" };
    const cycle: { shared: typeof shared; self?: unknown } = { shared };
    cycle.self = cycle;
    const replay = decodeDurableValue(encodeDurableValue({
      cycle,
      left: shared,
      right: shared,
    })) as {
      cycle: { shared: unknown; self: unknown };
      left: unknown;
      right: unknown;
    };
    expect(replay.left).toBe(replay.right);
    expect(replay.cycle.shared).toBe(replay.left);
    expect(replay.cycle.self).toBe(replay.cycle);
  });

  it("preserves backing-buffer topology, view bounds, and RegExp state", () => {
    const sharedBuffer = new ArrayBuffer(16);
    new Uint8Array(sharedBuffer).set([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    const typed = new Uint16Array(sharedBuffer, 2, 3);
    const dataView = new DataView(sharedBuffer, 5, 6);
    const independentLeft = new Uint8Array([4, 5, 6]).buffer;
    const independentRight = new Uint8Array([4, 5, 6]).buffer;
    const expression = /lesson/gy;
    expression.lastIndex = 4;

    const replay = decodeDurableValue(encodeDurableValue({
      dataView,
      expression,
      independentLeft,
      independentRight,
      sharedBuffer,
      typed,
    })) as {
      dataView: DataView;
      expression: RegExp;
      independentLeft: ArrayBuffer;
      independentRight: ArrayBuffer;
      sharedBuffer: ArrayBuffer;
      typed: Uint16Array;
    };

    expect(replay.typed.buffer).toBe(replay.sharedBuffer);
    expect(replay.typed.byteOffset).toBe(2);
    expect(replay.typed.length).toBe(3);
    expect(replay.dataView.buffer).toBe(replay.sharedBuffer);
    expect(replay.dataView.byteOffset).toBe(5);
    expect(replay.dataView.byteLength).toBe(6);
    expect([...new Uint8Array(replay.sharedBuffer)])
      .toEqual([...new Uint8Array(sharedBuffer)]);
    expect(replay.independentLeft).not.toBe(replay.independentRight);
    expect([...new Uint8Array(replay.independentLeft)])
      .toEqual([...new Uint8Array(replay.independentRight)]);
    expect(replay.expression.lastIndex).toBe(4);

    const aliasBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    const aliased = {
      bytes: new Uint8Array(aliasBuffer),
      view: new DataView(aliasBuffer),
    };
    const independent = {
      bytes: new Uint8Array(new Uint8Array([1, 2, 3, 4]).buffer),
      view: new DataView(new Uint8Array([1, 2, 3, 4]).buffer),
    };
    expect(canonicalizeDurableValue(aliased)).not.toBe(
      canonicalizeDurableValue(independent),
    );
    const resetExpression = /lesson/gy;
    expect(canonicalizeDurableValue(expression)).not.toBe(
      canonicalizeDurableValue(resetExpression),
    );
  });

  const semanticDuplicateCases: readonly [
    string,
    "map" | "set",
    readonly unknown[],
  ][] = [
    [
      "Map 0/-0 keys",
      "map",
      [["map", [
        [["number", "0"], ["null"]],
        [["number", "-0"], ["string", "duplicate"]],
      ]]],
    ],
    [
      "Map NaN keys",
      "map",
      [["map", [
        [["number", "nan"], ["null"]],
        [["number", "nan"], ["string", "duplicate"]],
      ]]],
    ],
    [
      "Map string keys",
      "map",
      [["map", [
        [["string", "duplicate"], ["null"]],
        [["string", "duplicate"], ["number", "1"]],
      ]]],
    ],
    [
      "Map shared-reference keys",
      "map",
      [
        ["map", [
          [["reference", 1], ["null"]],
          [["reference", 1], ["number", "1"]],
        ]],
        ["object", "default", []],
      ],
    ],
    [
      "Set 0/-0 values",
      "set",
      [["set", [["number", "0"], ["number", "-0"]]]],
    ],
    [
      "Set NaN values",
      "set",
      [["set", [["number", "nan"], ["number", "nan"]]]],
    ],
    [
      "Set string values",
      "set",
      [["set", [["string", "duplicate"], ["string", "duplicate"]]]],
    ],
    [
      "Set shared-reference values",
      "set",
      [
        ["set", [["reference", 1], ["reference", 1]]],
        ["object", "default", []],
      ],
    ],
  ];

  it.each(semanticDuplicateCases)(
    "rejects %s before replay collection allocation or assignment",
    (_label, kind, nodes) => {
      const assignmentSpy = kind === "map"
        ? vi.spyOn(Map.prototype, "set")
        : vi.spyOn(Set.prototype, "add");
      const allocationSpy = kind === "map"
        ? vi.spyOn(globalThis, "Map")
        : vi.spyOn(globalThis, "Set");
      assignmentSpy.mockClear();
      allocationSpy.mockClear();
      let thrown: unknown;
      try {
        decodeDurableValue({
          format: "reading-advantage.durable-value.v1",
          root: ["reference", 0],
          nodes,
        });
      } catch (error) {
        thrown = error;
      }
      const allocationCount = allocationSpy.mock.calls.length;
      const assignmentCount = assignmentSpy.mock.calls.length;
      allocationSpy.mockRestore();
      assignmentSpy.mockRestore();
      expect(thrown).toBeInstanceOf(TypeError);
      expect(allocationCount).toBe(0);
      expect(assignmentCount).toBe(0);
    },
  );

  it("accepts distinct cyclic Map keys that share a value reference", () => {
    const replay = decodeDurableValue({
      format: "reading-advantage.durable-value.v1",
      root: ["reference", 0],
      nodes: [
        ["map", [
          [["reference", 1], ["reference", 3]],
          [["reference", 2], ["reference", 3]],
        ]],
        ["object", "default", [["self", ["reference", 1]]]],
        ["object", "default", [["self", ["reference", 2]]]],
        ["object", "default", [["label", ["string", "shared"]]]],
      ],
    }) as Map<{ self: unknown }, unknown>;
    const keys = [...replay.keys()];
    const values = [...replay.values()];
    expect(replay.size).toBe(2);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]?.self).toBe(keys[0]);
    expect(keys[1]?.self).toBe(keys[1]);
    expect(values[0]).toBe(values[1]);
  });

  it("accepts distinct cyclic Set values that share a nested reference", () => {
    const replay = decodeDurableValue({
      format: "reading-advantage.durable-value.v1",
      root: ["reference", 0],
      nodes: [
        ["set", [["reference", 1], ["reference", 2]]],
        ["object", "default", [
          ["self", ["reference", 1]],
          ["shared", ["reference", 3]],
        ]],
        ["object", "default", [
          ["self", ["reference", 2]],
          ["shared", ["reference", 3]],
        ]],
        ["object", "default", [["label", ["string", "shared"]]]],
      ],
    }) as Set<{ self: unknown; shared: unknown }>;
    const values = [...replay];
    expect(replay.size).toBe(2);
    expect(values[0]).not.toBe(values[1]);
    expect(values[0]?.self).toBe(values[0]);
    expect(values[1]?.self).toBe(values[1]);
    expect(values[0]?.shared).toBe(values[1]?.shared);
  });

  it("accepts equal bytes in independently referenced Map keys", () => {
    const replay = decodeDurableValue({
      format: "reading-advantage.durable-value.v1",
      root: ["reference", 0],
      nodes: [
        ["map", [
          [["reference", 1], ["number", "1"]],
          [["reference", 2], ["number", "2"]],
        ]],
        ["array-buffer", "0102"],
        ["array-buffer", "0102"],
      ],
    }) as Map<ArrayBuffer, number>;
    const keys = [...replay.keys()];
    expect(replay.size).toBe(2);
    expect(keys[0]).not.toBe(keys[1]);
    expect([...new Uint8Array(keys[0] as ArrayBuffer)])
      .toEqual([...new Uint8Array(keys[1] as ArrayBuffer)]);
  });

  it("accepts equal bytes in independently referenced Set values", () => {
    const replay = decodeDurableValue({
      format: "reading-advantage.durable-value.v1",
      root: ["reference", 0],
      nodes: [
        ["set", [["reference", 1], ["reference", 2]]],
        ["array-buffer", "0102"],
        ["array-buffer", "0102"],
      ],
    }) as Set<ArrayBuffer>;
    const values = [...replay];
    expect(replay.size).toBe(2);
    expect(values[0]).not.toBe(values[1]);
  });

  it("accepts shared Map values behind distinct primitive keys", () => {
    const replay = decodeDurableValue({
      format: "reading-advantage.durable-value.v1",
      root: ["reference", 0],
      nodes: [
        ["map", [
          [["string", "first"], ["reference", 1]],
          [["string", "second"], ["reference", 1]],
        ]],
        ["object", "default", [["label", ["string", "shared"]]]],
      ],
    }) as Map<string, unknown>;
    expect(replay.size).toBe(2);
    expect(replay.get("first")).toBe(replay.get("second"));
  });

  it("rejects unsupported runtime values before encoding", () => {
    expect(() => encodeDurableValue(() => undefined)).toThrow(/unsupported/iu);
    expect(() => encodeDurableValue(Symbol("private"))).toThrow(/unsupported/iu);
    expect(() => encodeDurableValue(new WeakMap())).toThrow(/unsupported/iu);
    expect(() => encodeDurableValue(new Date(Number.NaN))).toThrow(/invalid/iu);
    const symbolKey = { [Symbol("hidden")]: "value" };
    expect(() => encodeDurableValue(symbolKey)).toThrow(/symbol/iu);
    const accessor = Object.defineProperty({}, "secret", {
      enumerable: true,
      get: () => "value",
    });
    expect(() => encodeDurableValue(accessor)).toThrow(/accessor/iu);
    const hidden = Object.defineProperty({}, "hidden", { value: "value" });
    expect(() => encodeDurableValue(hidden)).toThrow(/hidden/iu);
    const invalidExpression = /lesson/g;
    invalidExpression.lastIndex = -1;
    expect(() => canonicalizeDurableValue(invalidExpression))
      .toThrow(/regular expression state/iu);
    expect(() => encodeDurableValue(invalidExpression))
      .toThrow(/regular expression state/iu);
  });

  it("fails closed for malformed or incompatible stored graphs", () => {
    const graph = (node: unknown): Record<string, unknown> => ({
      format: "reading-advantage.durable-value.v1",
      root: ["reference", 0],
      nodes: [node],
    });
    const malformed = [
      null,
      {},
      { format: "wrong", root: ["null"], nodes: [] },
      {
        format: "reading-advantage.durable-value.v1",
        root: ["null"],
        nodes: [],
        unexpected: true,
      },
      { format: "reading-advantage.durable-value.v1", root: "bad", nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["unknown"], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["null", "extra"], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["boolean", "yes"], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["number", "01"], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["number", 1], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["bigint", "01"], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["string", 1], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["reference", 1], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["reference", "0"], nodes: [] },
      { format: "reading-advantage.durable-value.v1", root: ["reference", 0], nodes: [["unknown"]] },
      { format: "reading-advantage.durable-value.v1", root: ["reference", 0], nodes: [["array", -1, []]] },
      { format: "reading-advantage.durable-value.v1", root: ["reference", 0], nodes: [["array-buffer", "xyz"]] },
      { format: "reading-advantage.durable-value.v1", root: ["reference", 0], nodes: [["regexp", "lesson", "g", -1]] },
      { format: "reading-advantage.durable-value.v1", root: ["reference", 0], nodes: [["typed-array", "Uint8Array", ["null"], 0, 1]] },
      graph(["array", 1, [], "unexpected"]),
      graph(["array", "1", []]),
      graph(["array", 1, [[0, ["null"], "unexpected"]]]),
      graph(["array", 1, [[-1, ["null"]]]]),
      graph(["array", 1, [[0.5, ["null"]]]]),
      graph(["array", 1, [["0", ["null"]]]]),
      graph(["array", 1, [["__proto__", ["null"]]]]),
      graph(["array", 1, [[1, ["null"]]]]),
      graph(["array", 1, [[0, ["null"]], [0, ["string", "duplicate"]]]]),
      graph(["array", 1, [[0, ["null", "unexpected"]]]]),
      graph(["object", "prototype", []]),
      graph(["object", "default", [], "unexpected"]),
      graph(["object", "default", [["key"]]]),
      graph(["object", "default", [[1, ["null"]]]]),
      graph([
        "object",
        "default",
        [["key", ["null"]], ["key", ["string", "duplicate"]]],
      ]),
      graph(["object", "default", [["key", ["string", 1]]]]),
      graph(["map", [], "unexpected"]),
      graph(["map", {}]),
      graph(["map", [[["string", "key"]]]]),
      graph(["map", [[["string", 1], ["null"]]]]),
      graph(["map", [[["string", "key"], ["null", "unexpected"]]]]),
      graph([
        "map",
        [
          [["string", "duplicate"], ["number", "1"]],
          [["string", "duplicate"], ["number", "2"]],
        ],
      ]),
      graph(["set", [], "unexpected"]),
      graph(["set", {}]),
      graph(["set", [["string", 1]]]),
      graph(["set", [["null", "unexpected"]]]),
      graph(["set", [["string", "duplicate"], ["string", "duplicate"]]]),
      graph(["date", "2026-07-18", "unexpected"]),
      graph(["date", 1]),
      graph(["array-buffer", 1]),
      {
        format: "reading-advantage.durable-value.v1",
        root: ["reference", 0],
        nodes: [
          ["typed-array", "UnknownArray", ["reference", 1], 0, 1],
          ["array-buffer", "00"],
        ],
      },
      {
        format: "reading-advantage.durable-value.v1",
        root: ["reference", 0],
        nodes: [
          ["typed-array", "Uint8Array", ["reference", 1], -1, 1],
          ["array-buffer", "00"],
        ],
      },
      {
        format: "reading-advantage.durable-value.v1",
        root: ["reference", 0],
        nodes: [
          ["typed-array", "DataView", ["reference", 1], 1, 2],
          ["array-buffer", "00"],
        ],
      },
      {
        format: "reading-advantage.durable-value.v1",
        root: ["reference", 0],
        nodes: [
          ["typed-array", "Uint16Array", ["reference", 1], 1, 1],
          ["array-buffer", "0000"],
        ],
      },
    ];
    for (const candidate of malformed) {
      expect(() => decodeDurableValue(candidate)).toThrow();
    }
  });
});
