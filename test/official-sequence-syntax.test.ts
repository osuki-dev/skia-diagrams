import { describe, expect, test } from "bun:test";
import { parseDiagram } from "../src/parse/index.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };

function sequence(source: string) {
  const parsed = parseDiagram(source);
  if (parsed.kind !== "sequence") throw new Error(JSON.stringify(parsed));
  return parsed.ir;
}

describe("official sequence syntax", () => {
  for (const fixture of catalog.types.find((type) => type.type === "sequenceDiagram")!.cases) {
    test(fixture.id, () => {
      const ir = sequence(fixture.source);
      expect(ir.nodes.length).toBeGreaterThan(0);
      expect(ir.nodes.every((node) => !node.id.includes("@{") && !node.id.includes("()"))).toBe(
        true,
      );
    });
  }

  test("participant metadata retains types, aliases and host-owned menu targets", () => {
    const ir = sequence(`sequenceDiagram
participant API@{ "type": "boundary", "alias": "Internal Name" } as External Name
participant DB@{ "type": "database" }
link API: Dashboard @ https://example.com/dashboard
links API: {"Wiki": "https://example.com/wiki"}
API->>DB: Query`);
    expect(ir.nodes[0]).toMatchObject({
      id: "API",
      label: "External Name",
      sequence: {
        type: "boundary",
        links: [
          { label: "Dashboard", url: "https://example.com/dashboard" },
          { label: "Wiki", url: "https://example.com/wiki" },
        ],
      },
    });
    expect(ir.nodes[1]).toMatchObject({ sequence: { type: "database" } });
  });

  test("creation and destruction preserve their position relative to messages", () => {
    const ir = sequence(`sequenceDiagram
create actor B as Bob
A->>B: Hello
destroy B
B-->>A: Goodbye`);
    expect(ir.events.map((event) => event.type)).toEqual([
      "create",
      "message",
      "destroy",
      "message",
    ]);
    expect(ir.nodes.find((node) => node.id === "B")).toMatchObject({
      shape: "circle",
      label: "Bob",
    });
  });

  test("connection endpoints and bidirectional arrows preserve marker information", () => {
    const ir = sequence(`sequenceDiagram
A()->>()B: Connected
B<<-->>A: Both directions`);
    expect(ir.events[0]).toMatchObject({
      from: "A",
      to: "B",
      flags: ["->>", "source-connected", "target-connected"],
    });
    expect(ir.events[1]).toMatchObject({ from: "B", to: "A", flags: ["<<-->>"] });
  });

  test("custom autonumber start and increment are independent of frame events", () => {
    const ir = sequence(`sequenceDiagram
autonumber 10 5
A->>B: One
loop Retry
B->>A: Two
end
autonumber off
A->>B: Three`);
    expect(
      ir.events.filter((event) => event.type === "message").map((event) => event.label),
    ).toEqual(["10. One", "15. Two", "Three"]);
  });

  test("invalid metadata fails with the original source line", () => {
    const parsed = parseDiagram("sequenceDiagram\nparticipant A@{type: []}\nA->>B: Hi");
    expect(parsed).toMatchObject({ kind: "error", error: { line: 2 } });
  });
});
