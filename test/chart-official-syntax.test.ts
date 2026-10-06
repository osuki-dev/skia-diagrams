import { describe, expect, test } from "bun:test";
import { parseDiagram } from "../src/parse/index.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };

function official(id: string) {
  const fixture = catalog.types.flatMap((type) => type.cases).find((item) => item.id === id);
  if (!fixture) throw new Error(`Unknown fixture ${id}`);
  const parsed = parseDiagram(fixture.source);
  if (parsed.kind === "error" || parsed.kind === "unsupported")
    throw new Error(JSON.stringify(parsed));
  return parsed.ir;
}

describe("official chart syntax", () => {
  test("timeline continuations belong to the preceding period", () => {
    expect(official("timeline/001").events[1].label).toBe("2004\nFacebook\nGoogle");
  });
  test("XY series names and per-point labels survive parsing", () => {
    expect(official("xyChart/002").events.map((event) => event.label)).toEqual([
      "avg",
      "p50",
      "p95",
    ]);
    const ir = official("xyChart/007");
    expect(ir.events[0].values).toEqual([25, 45, 72, 90]);
    expect(ir.data?.xyPointLabels).toEqual({ 0: ["Launch", "", "", "Target Hit"] });
  });
  test("Gantt supports implicit starts, hourly durations and dependency lists", () => {
    const ir = official("gantt/003");
    expect(ir.events[2].start).toBe(ir.events[0].end);
    expect(ir.events[3].end).toBe(ir.events[1].start);
    const minutes = official("gantt/005").events;
    expect(minutes[1].start).toBe(minutes[0].end);
    expect(minutes[1].end! - minutes[1].start!).toBe(600000);
  });
  test("custom weekend excludes the configured adjacent pair of days", () => {
    const ir = official("gantt/004");
    expect(ir.data?.ganttOptions).toEqual({ weekend: "friday" });
    expect(ir.events[0].end! - ir.events[0].start!).toBeGreaterThan(30 * 86400000);
  });
  test("excluding every weekday fails without attempting an unbounded schedule", () => {
    const parsed = parseDiagram(
      "gantt\nexcludes sunday,monday,tuesday,wednesday,thursday,friday,saturday\nA : 2024-01-01, 1d",
    );
    expect(parsed.kind).toBe("error");
    if (parsed.kind === "error") expect(parsed.error.message).toBe("All weekdays are excluded");
  });
  test("quadrant point classes and explicit overrides are preserved", () => {
    const ir = official("quadrantChart/003");
    expect(ir.events.filter((event) => event.type === "point")[1].label).toBe("Campaign B");
    expect(ir.data?.quadrantClasses).toHaveProperty("class2.radius", "10");
    expect(ir.data?.quadrantPoints).toHaveProperty("6.style.radius", "12");
  });
  test("cherry-pick preserves source identity and adds a distinct commit", () => {
    const ir = official("gitgraph/010");
    const picked = ir.events.find((event) => event.to === "MERGE");
    expect(picked?.from).toBe("release");
    expect(picked?.label).toStartWith("cherry-pick-");
  });
});

test("multiline mindmap markdown is one root with its authored children", () => {
  const ir = official("mindmap/013");
  expect(ir.nodes).toHaveLength(3);
  expect(ir.nodes[0].label).toBe("**Root** with\na second line\nUnicode works too: 🤓");
  expect(ir.edges.map(({ from, to }) => [from, to])).toEqual([
    ["node-0", "node-1"],
    ["node-0", "node-2"],
  ]);
});

test("official repeated Git commit labels retain distinct native graph identities", () => {
  const ir = official("gitgraph/015");
  expect(ir.nodes.filter((node) => node.label === "Boston")).toHaveLength(2);
  expect(new Set(ir.nodes.map((node) => node.id)).size).toBe(ir.nodes.length);
});

test("Unix Gantt dates retain numeric spans and format second-scale ticks", async () => {
  const { dateTicks, formatAxisDate, parseDate } = await import("../src/parse/dates.ts");
  const ir = official("gantt/010");
  expect(ir.events.map((event) => event.end! - event.start!)).toEqual([
    71000, 36000, 34000, 9000, 5000,
  ]);
  expect(dateTicks(0, 71000).map((time) => formatAxisDate(time, "%s"))).toEqual([
    "0",
    "10",
    "20",
    "30",
    "40",
    "50",
    "60",
    "70",
  ]);
  expect(parseDate("20", "X")).toBe(20000);
  expect(parseDate("20", "x")).toBe(20);
  expect(formatAxisDate(-1000, "%s")).toBe("-1");
});
