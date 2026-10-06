import { describe, expect, test } from "bun:test";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { parseZenuml } from "../src/parse/extended-zenuml.ts";
import { layoutZenuml } from "../src/layout/extended-zenuml.ts";
import { estimateText } from "../src/layout/measure.ts";

describe("native ZenUML", () => {
  test("official cases produce finite native primitives and preserve message labels", () => {
    for (const fixture of catalog.types.find((type) => type.type === "zenuml")!.cases) {
      const parsed = parseZenuml(fixture.source)!;
      expect(parsed.kind).toBe("zenuml");
      if (parsed.kind !== "zenuml") throw new Error(fixture.id);
      const scene = layoutZenuml(parsed, estimateText)!;
      expect(scene.bounds.width).toBeGreaterThan(0);
      expect(scene.bounds.height).toBeGreaterThan(0);
      for (const primitive of scene.primitives) {
        if (primitive.type === "path")
          for (const point of primitive.points) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
          }
        else {
          expect(
            Number.isFinite(primitive.x + primitive.y + primitive.width + primitive.height),
          ).toBe(true);
          expect(primitive.x + primitive.width).toBeLessThanOrEqual(scene.bounds.width);
        }
      }
      for (const event of parsed.ir.events)
        if (event.label) expect(scene.accessibilityLabel).toContain(event.label);
    }
  });
  test("nested calls restore caller and early return uses innermost call", () => {
    const parsed = parseZenuml(`zenuml
Client->API.load() {
  Store.fetch() {
    if (cached) {
      return value
    }
  }
  Audit.record()
  return response
}
`)!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(
      parsed.ir.events
        .filter((event) => event.type === "call")
        .map((event) => [event.from, event.to]),
    ).toEqual([
      ["Client", "API"],
      ["API", "Store"],
      ["API", "Audit"],
    ]);
    expect(
      parsed.ir.events
        .filter((event) => event.type === "reply")
        .map((event) => [event.from, event.to, event.label]),
    ).toEqual([
      ["Store", "API", "value"],
      ["API", "Client", "response"],
    ]);
    const scene = layoutZenuml(parsed, estimateText)!;
    expect(
      scene.primitives.filter(
        (primitive) =>
          primitive.type === "shape" &&
          primitive.fill === "paletteFill:0" &&
          primitive.width === 10,
      ),
    ).toHaveLength(3);
  });
  test("compact syntax, multiline arguments, and following-line branches retain scope semantics", () => {
    const parsed = parseZenuml(`zenuml
Client->API.load(
  makeInput("a;{b}", nested(1, 2)),
  [1, 2]
) { if (cached) { Store.read(); return value; }
else if (refresh) { Store.refresh(); }
else { Store.load(); } Audit.record(); return response; }
`)!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    const calls = parsed.ir.events.filter((event) => event.type === "call");
    expect(calls.map((event) => [event.from, event.to])).toEqual([
      ["Client", "API"],
      ["API", "Store"],
      ["API", "Store"],
      ["API", "Store"],
      ["API", "Audit"],
    ]);
    expect(calls[0].label).toContain('makeInput("a;{b}", nested(1, 2))');
    expect(parsed.ir.events.filter((event) => event.type === "fragmentStart")).toHaveLength(1);
    expect(
      parsed.ir.events
        .filter((event) => event.type === "fragmentBranch")
        .map((event) => event.label),
    ).toEqual(["else if (refresh)", "else"]);
    const scene = layoutZenuml(parsed, estimateText)!;
    expect(
      scene.primitives.filter(
        (primitive) => primitive.type === "shape" && primitive.strokeRole === "frame",
      ),
    ).toHaveLength(1);
    expect(parsed.ir.data?.statements).toBeDefined();
  });
  test("async labels preserve emoticons, apostrophes, and URLs", () => {
    const parsed = parseZenuml("zenuml\nA->B: I'm happy :) https://example.com\n")!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(parsed.ir.events[0].label).toBe("I'm happy :) https://example.com");
    expect(() => parseZenuml("zenuml\nA.call(\n")).toThrow("Unclosed ZenUML arguments");
  });
  test("default hierarchical numbering matches official nested replies and fragment scopes", () => {
    const fixture = catalog.types
      .find((type) => type.type === "zenuml")!
      .cases.find((entry) => entry.id === "zenuml/009")!;
    const parsed = parseZenuml(fixture.source)!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(((parsed.ir.data?.numbering ?? []) as string[]).filter(Boolean)).toEqual([
      "1",
      "1.1",
      "1.1.1",
      "1.1.1.1",
      "1.1.1.2",
      "1.2",
    ]);
    const scene = layoutZenuml(parsed, estimateText)!;
    expect(
      scene.primitives
        .filter((primitive) => primitive.type === "text" && /^\d+(?:\.\d+)*$/.test(primitive.text))
        .map((primitive) => primitive.type === "text" && primitive.text)
        .sort(),
    ).toEqual(["1", "1.1", "1.1.1", "1.1.1.1", "1.1.1.2", "1.2"].sort());
    const assignment = parseZenuml("zenuml\na = A.load(); A.load() { return value; }\n")!;
    if (assignment.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(((assignment.ir.data?.numbering ?? []) as string[]).filter(Boolean)).toEqual([
      "1",
      "1.1",
      "2",
      "2.1",
    ]);
  });
  test("upstream critical, section, and reference scopes render native frames", () => {
    const parsed = parseZenuml(
      'zenuml\ncritical(locked) { section("Checkout") { A.load(); ref(A, B); } }\n',
    )!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(
      parsed.ir.events
        .filter((event) => event.type === "fragmentStart")
        .map((event) => event.flags?.[0]),
    ).toEqual(["critical", "section"]);
    const scene = layoutZenuml(parsed, estimateText)!;
    expect(
      scene.primitives.filter(
        (primitive) => primitive.type === "shape" && primitive.strokeRole === "frame",
      ),
    ).toHaveLength(3);
    expect(
      scene.primitives.some(
        (primitive) => primitive.type === "text" && primitive.text === "Critical",
      ),
    ).toBe(true);
    const creation = parseZenuml("zenuml\nnew A\n")!;
    expect(
      layoutZenuml(creation, estimateText)!.primitives.some(
        (primitive) => primitive.type === "text" && primitive.text === "«create»",
      ),
    ).toBe(true);
  });
  test("front matter and comments preserve header and source lines", () => {
    const parsed = parseZenuml(`---
title: Native sample
config:
  theme: dark
---
%% leading comment
%%{init: {"theme": "default"}}%%
zenuml
  A->B: Hello
`)!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(parsed.ir.title).toBe("Native sample");
    expect(parsed.ir.events[0].label).toBe("Hello");
    expect(parsed.ir.data?.config).toEqual({ theme: "dark" });
    expect(((parsed.ir.data?.statements ?? []) as { line: number }[])[0].line).toBe(9);
    expect(parseZenuml("%% comment\nzenuml\nA.m()")?.kind).toBe("zenuml");
  });
  test("init and initialize directives merge safely with front matter taking priority", () => {
    const parsed = parseZenuml(`---
title: Metadata title
config:
  theme: dark
  zenuml:
    width: 320
---
%%{init: {"theme": "default", "zenuml": {"width": 100, "height": 200}}}%%
%%{initialize: {"zenuml": {"height": 240}, "themeVariables": {"primaryColor": "#123456"}}}%%
%% comment
ZenUML
title Body title
A->B: Hello
`)!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(parsed.ir.title).toBe("Metadata title");
    expect(parsed.ir.data?.config).toEqual({
      theme: "dark",
      zenuml: { width: 320, height: 240 },
      themeVariables: { primaryColor: "#123456" },
    });
    expect(parsed.ir.events[0].label).toBe("Hello");
    expect(() => parseZenuml("%%{init: {bad: [}}%%\nzenuml\nA.m()\n")).toThrow();
  });
  test("participant groups, starter, declarations, return arrows, and divider numbering", () => {
    const parsed = parseZenuml(`zenuml
@startuml
group "Services" {
  @Database <<store>> [🗄️] A 180 as "Data Store" #aabbcc
  B
}
@Starter(A)
await const value = B.fetch(input = 1)
A-->B: response
== Next ==
critical(locked) {
  ref(A, B)
  frame("Work") { B.call().then() }
}
@enduml
`)!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(parsed.ir.nodes.find((node) => node.id === "A")?.metadata).toEqual({
      stereotype: "store",
      emoji: "🗄️",
      width: 180,
    });
    expect(parsed.ir.nodes.find((node) => node.id === "A")?.style?.fill).toBe("#aabbcc");
    expect(parsed.ir.nodes.every((node) => node.parent === "zen-group-0")).toBe(true);
    expect(parsed.ir.events[0].from).toBe("A");
    expect(((parsed.ir.data?.numbering ?? []) as string[]).filter(Boolean)).toEqual([
      "1",
      "1.1",
      "2",
      "4",
      "4.1",
      "4.2",
      "4.2.1",
    ]);
    const scene = layoutZenuml(parsed, estimateText)!;
    expect(
      scene.primitives.some(
        (primitive) => primitive.type === "shape" && primitive.id === "zen-group-0",
      ),
    ).toBe(true);
    expect(
      scene.primitives.some(
        (primitive) =>
          primitive.type === "text" &&
          primitive.text.includes("«store»") &&
          primitive.text.includes("🗄️ Data Store"),
      ),
    ).toBe(true);
    expect(
      scene.primitives.some((primitive) => primitive.type === "text" && primitive.text === "Next"),
    ).toBe(true);
    expect(
      scene.primitives.some(
        (primitive) => primitive.type === "text" && primitive.text === "[ref(A,B)]",
      ),
    ).toBe(true);
  });
  test("incomplete fragments, chained functions, Unicode names, and scoped creation", () => {
    const parsed = parseZenuml(`zenuml
/* hidden comment */
# hidden comment
' hidden comment
@Actor
"Client App"
<<service>>
服务 as "Service"
@starter("Client App")
readonly obj = new 服务(input = nested(1, 2)) { doWork().then(); 服务.; }
服务-->"Client App": Ready
opt
while
critical
section
== arbitrary ) { divider ==
`)!;
    if (parsed.kind !== "zenuml") throw new Error("Unexpected parse result");
    expect(parsed.ir.nodes.find((node) => node.id === "Client App")?.annotation).toBe("Actor");
    expect(parsed.ir.nodes.find((node) => node.id === "服务")?.metadata?.assignee).toBe("obj");
    expect(parsed.ir.events.filter((event) => event.type === "fragmentStart")).toHaveLength(4);
    const scene = layoutZenuml(parsed, estimateText)!;
    expect(scene.bounds.width).toBeGreaterThan(0);
    expect(
      scene.primitives.some(
        (primitive) =>
          primitive.type === "text" && primitive.text.includes("arbitrary ) { divider"),
      ),
    ).toBe(true);
  });
  test("native host icon resolver handles arbitrary annotations and named emoji without assets", () => {
    const parsed = parseZenuml("zenuml\n@CustomService A\n[cloud] B\nA->B: Hello\n")!;
    const requested: string[] = [];
    const scene = layoutZenuml(parsed, estimateText, {
      resolveIcon(name, bounds) {
        requested.push(name);
        return [{ type: "shape", shape: "circle", id: `host:${name}`, ...bounds, fill: "accent" }];
      },
    })!;
    expect(requested).toEqual(["CustomService", "cloud"]);
    expect(
      scene.primitives.filter(
        (primitive) => primitive.type === "shape" && primitive.id?.startsWith("host:"),
      ),
    ).toHaveLength(2);
    const unresolved = layoutZenuml(parsed, estimateText)!;
    expect(
      unresolved.primitives.filter(
        (primitive) =>
          primitive.type === "shape" && primitive.id?.startsWith("zenuml-unresolved-icon:"),
      ),
    ).toHaveLength(2);
  });
  test("host font sizes from 10 to 24 reach native labels and remain within scene bounds", () => {
    const parsed = parseZenuml(
      "zenuml\n@Actor <<person>> A as Client\n@Database B\nA->B: Query\n",
    )!;
    for (const fontSize of [10, 14, 24]) {
      const scene = layoutZenuml(parsed, estimateText, { fontSize })!;
      for (const primitive of scene.primitives)
        if (primitive.type === "text") {
          expect(primitive.fontSize).toBe(fontSize);
          expect(primitive.y + primitive.height).toBeLessThanOrEqual(scene.bounds.height);
        }
      const client = scene.primitives.find(
        (primitive) => primitive.type === "text" && primitive.text.includes("Client"),
      )!;
      const arrow = scene.primitives.find(
        (primitive) => primitive.type === "path" && primitive.end === "open",
      )!;
      if (client.type !== "text" || arrow.type !== "path") throw new Error("Missing actor/message");
      expect(client.y + client.height).toBeLessThan(arrow.points[0].y);
    }
  });
  test("malformed scopes and unrecognized syntax fail instead of silently disappearing", () => {
    expect(() => parseZenuml("zenuml\nA.call() {\n")).toThrow("Unclosed");
    expect(() => parseZenuml("zenuml\n}\n")).toThrow("Unmatched");
    expect(() => parseZenuml("zenuml\ninvalid ! syntax\n")).toThrow("Unsupported");
    expect(parseZenuml("flowchart LR\nA-->B")).toBeUndefined();
  });
});
