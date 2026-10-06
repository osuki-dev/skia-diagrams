import { expect, test } from "bun:test";
import { officialCatalog } from "../example/official-fixtures.ts";
import { parseOfficialAst } from "../src/parse/official-ast.ts";
import { layoutOfficial } from "../src/layout/official-ast.ts";
const kinds = new Set([
  "packet",
  "treeView",
  "architecture",
  "eventmodeling",
  "radar",
  "treemap",
  "wardley",
  "cynefin",
]);
for (const group of officialCatalog.types) {
  if (!kinds.has(group.type)) continue;
  for (const example of group.cases)
    test(`native official layout ${example.id}`, async () => {
      const parsed = await parseOfficialAst(example.source);
      if (!parsed || parsed.kind === "error" || parsed.kind === "unsupported")
        throw new Error(`Official fixture did not parse: ${example.id}`);
      expect(String(parsed.kind)).toBe(group.type.toLowerCase());
      expect(parsed.ir.data?.$type).toBeDefined();
      expect(JSON.stringify(parsed.ir.data)).not.toMatch(/"\$(?:container|cstNode|document)"/);
      const scene = layoutOfficial(parsed);
      expect(scene).toBeDefined();
      expect(scene!.primitives.length).toBeGreaterThan(0);
      expect(scene!.bounds.width).toBeGreaterThan(0);
      expect(scene!.bounds.height).toBeGreaterThan(0);
      for (const p of scene!.primitives) {
        if (p.type === "path")
          for (const point of p.points) {
            expect(Number.isFinite(point.x)).toBe(true);
            expect(Number.isFinite(point.y)).toBe(true);
          }
        else {
          expect(Number.isFinite(p.x + p.y + p.width + p.height)).toBe(true);
          expect(p.width).toBeGreaterThanOrEqual(0);
          expect(p.height).toBeGreaterThanOrEqual(0);
        }
      }
    });
}

test("packet ranges split at row boundaries and radar preserves keyed axis values", async () => {
  const packet = await parseOfficialAst('packet-beta\n0-35: "Header"');
  const scene = layoutOfficial(packet!)!;
  const boxes = scene.primitives.filter((p) => p.type === "shape");
  expect(boxes).toHaveLength(2);
  expect(boxes[0]!.width).toBe(32 * 22);
  expect(boxes[1]!.width).toBe(4 * 22);
  const radar = await parseOfficialAst(
    'radar-beta\naxis a["Alpha"], b["Beta"], c["Gamma"]\ncurve skills{c: 3, a: 4, b: 2}\nmax 5',
  );
  const chart = layoutOfficial(radar!)!;
  const curve = chart.primitives.find((p) => p.type === "path" && p.fill === "palette:0");
  expect(curve?.type).toBe("path");
  if (curve?.type === "path") expect(curve.points[0]!.y).toBeCloseTo(100);
});

test("event model temporal sequence has arrows without explicit source references", async () => {
  const parsed = await parseOfficialAst(
    "eventmodeling\ntf 01 ui CartUI\ntf 02 cmd AddItem\ntf 03 evt ItemAdded",
  );
  const scene = layoutOfficial(parsed!)!;
  expect(scene.primitives.filter((p) => p.type === "path" && p.end === "arrow")).toHaveLength(2);
  expect(scene.accessibilityLabel).toContain("UI / Automation");
  expect(scene.accessibilityLabel).toContain("Command / Read model");
});

test("authored treemap style and value formatting survive native layout", async () => {
  const group = officialCatalog.types.find((g) => g.type === "treemap")!;
  const styled = layoutOfficial((await parseOfficialAst(group.cases[2]!.source))!)!;
  expect(
    styled.primitives.some((p) => p.type === "shape" && p.fill === "red" && p.stroke === "#FFD600"),
  ).toBe(true);
  const budget = layoutOfficial((await parseOfficialAst(group.cases[6]!.source))!)!;
  expect(budget.accessibilityLabel).toContain("$700,000");
  expect(budget.accessibilityLabel).toContain("$1,500,000");
});

test("Wardley custom evolution and forces appear as semantic annotations", async () => {
  const group = officialCatalog.types.find((g) => g.type === "wardley")!;
  const stages = layoutOfficial((await parseOfficialAst(group.cases[11]!.source))!)!;
  expect(stages.accessibilityLabel).toContain("Unmodelled");
  expect(stages.accessibilityLabel).not.toContain("Genesis");
  const rich = layoutOfficial((await parseOfficialAst(group.cases[18]!.source))!)!;
  expect(rich.accessibilityLabel).toContain("Cloud Native");
  expect(rich.accessibilityLabel).toContain("Legacy Data");
  expect(rich.accessibilityLabel).toContain("User touchpoints");
});

test("hosts supply native icon primitives and retain ownership of them", async () => {
  const parsed = await parseOfficialAst("architecture-beta\nservice a(server)[API]");
  const owned = {
    type: "shape" as const,
    shape: "hexagon" as const,
    id: "host-icon",
    x: -10,
    y: 0,
    width: 18,
    height: 18,
    fill: "palette:2",
  };
  const scene = layoutOfficial(parsed!, undefined, {
    resolveIcon: (name) => (name === "server" ? [owned] : undefined),
  })!;
  expect(scene.primitives.some((p) => p.type === "shape" && p.id === "host-icon")).toBe(true);
  expect(owned.x).toBe(-10);
  const tree = await parseOfficialAst("treeView-beta\n    App.tsx icon(logos:react)");
  const fallback = layoutOfficial(tree!)!;
  expect(fallback.accessibilityLabel).toContain("icon:logos:react");
  const resolved = layoutOfficial(tree!, undefined, {
    resolveIcon: (name, r) =>
      name === "logos:react"
        ? [{ type: "shape", shape: "circle", ...r, fill: "palette:1" }]
        : undefined,
  })!;
  expect(resolved.accessibilityLabel).not.toContain("icon:logos:react");
});

test("all eight native types expose semantic data regions in logical scene bounds", async () => {
  for (const group of officialCatalog.types.filter((g) => kinds.has(g.type))) {
    const parsed = await parseOfficialAst(group.cases[0]!.source);
    const scene = layoutOfficial(parsed!)!;
    expect(scene.interactions!.length).toBeGreaterThan(0);
    for (const hit of scene.interactions!) {
      expect(hit.kind).toBe("data");
      expect(hit.label.length).toBeGreaterThan(0);
      expect(hit.tooltip!.length).toBeGreaterThan(0);
      expect(hit.width).toBeGreaterThan(0);
      expect(hit.height).toBeGreaterThan(0);
      expect(hit.x).toBeGreaterThanOrEqual(scene.bounds.x);
      expect(hit.y).toBeGreaterThanOrEqual(scene.bounds.y);
      expect(hit.x + hit.width).toBeLessThanOrEqual(scene.bounds.x + scene.bounds.width);
      expect(hit.y + hit.height).toBeLessThanOrEqual(scene.bounds.y + scene.bounds.height);
    }
  }
});

test("event model connectors terminate outside their source and destination cards", async () => {
  const parsed = await parseOfficialAst(
    "eventmodeling\ntf 01 ui CartUI\ntf 02 cmd AddItem\ntf 03 evt ItemAdded",
  );
  const scene = layoutOfficial(parsed!)!;
  const hits = scene.interactions!;
  const connections = scene.primitives.filter((p) => p.type === "path" && p.end === "arrow");
  const inside = (
    p: { x: number; y: number },
    r: { x: number; y: number; width: number; height: number },
  ) => p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height;
  for (const path of connections)
    if (path.type === "path") {
      for (const point of [path.points[0]!, path.points.at(-1)!])
        expect(hits.some((hit) => inside(point, hit))).toBe(false);
    }
});

test("Wardley arrow tips clear component circles and packet boundary labels remain separated", async () => {
  const group = officialCatalog.types.find((g) => g.type === "wardley")!;
  const scene = layoutOfficial((await parseOfficialAst(group.cases[0]!.source))!)!;
  const circles = scene.primitives.filter(
    (p) => p.type === "shape" && p.width === 12 && p.height === 12,
  );
  for (const path of scene.primitives)
    if (path.type === "path" && path.end === "arrow") {
      const end = path.points.at(-1)!;
      for (const circle of circles)
        if (circle.type === "shape")
          expect(Math.hypot(end.x - circle.x - 6, end.y - circle.y - 6)).toBeGreaterThanOrEqual(
            7.99,
          );
    }
  const packets = officialCatalog.types.find((g) => g.type === "packet")!;
  const packet = layoutOfficial((await parseOfficialAst(packets.cases[0]!.source))!)!;
  const labels = packet.primitives.filter((p) => p.type === "text" && /^\d+$/.test(p.text));
  for (let i = 0; i < labels.length; i++)
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i]!,
        b = labels[j]!;
      if (a.type === "text" && b.type === "text" && a.y === b.y)
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x).toBe(true);
    }
});

test("large host fonts retain chart headers, data regions and authored radar colors", async () => {
  for (const kind of ["wardley", "cynefin", "radar", "treemap"] as const) {
    const group = officialCatalog.types.find((g) => g.type === kind)!;
    const scene = layoutOfficial((await parseOfficialAst(group.cases[0]!.source))!, undefined, {
      fontSize: 24,
    })!;
    expect(scene.primitives.some((p) => p.type === "text" && p.fontSize >= 24)).toBe(true);
    expect(scene.interactions!.length).toBeGreaterThan(0);
    const title = scene.primitives.find(
      (p) => p.type === "text" && p.fontWeight === 600 && p.fontSize > 24,
    );
    if (title?.type === "text")
      expect(scene.interactions!.every((hit) => hit.y >= title.y + title.height)).toBe(true);
  }
  const radar = officialCatalog.types.find((g) => g.type === "radar")!;
  const scene = layoutOfficial((await parseOfficialAst(radar.cases[2]!.source))!)!;
  for (const color of ["#FF0000", "#00FF00", "#0000FF"])
    expect(scene.primitives.some((p) => p.type === "path" && p.stroke === color)).toBe(true);
});

test("Cynefin center polygon and responsive Wardley circle hits match visible geometry", async () => {
  const { hitTestInteraction } = await import("../src/react/hit-test.ts");
  const cynefin = officialCatalog.types.find((g) => g.type === "cynefin")!;
  const scene = layoutOfficial((await parseOfficialAst(cynefin.cases[0]!.source))!)!;
  const center = scene.interactions!.find((h) => h.id === "cynefin:confusion")!;
  expect(
    hitTestInteraction(scene, { x: center.x + center.width - 5, y: center.y + center.height / 2 })
      ?.id,
  ).toBe(center.id);
  expect(hitTestInteraction(scene, { x: center.x + 5, y: center.y + 5 })?.id).not.toBe(center.id);
  const wardley = officialCatalog.types.find((g) => g.type === "wardley")!;
  const large = layoutOfficial((await parseOfficialAst(wardley.cases[0]!.source))!, undefined, {
    fontSize: 24,
  })!;
  const hit = large.interactions!.find((h) => h.hit?.type === "circle")!;
  if (hit.hit?.type === "circle")
    expect(hitTestInteraction(large, { x: hit.hit.cx, y: hit.hit.cy })?.id).toBe(hit.id);
});

test("official AST preserves linked axis entries, metadata and architecture edge sides", async () => {
  const radar = await parseOfficialAst(
    `---\ntitle: Team skills\nconfig:\n  radar:\n    axisLabelFontSize: 18\n---\nradar-beta\naxis a["Alpha"], b["Beta"], c["Gamma"]\ncurve skills{c: 3, a: 4}\nmax 5`,
  );
  expect(radar?.kind).toBe("radar");
  if (radar && radar.kind !== "error" && radar.kind !== "unsupported") {
    expect(radar.ir.title).toBe("Team skills");
    expect(radar.ir.events[0].values).toEqual([4, 0, 3]);
    expect(radar.ir.data?.config).toEqual({ radar: { axisLabelFontSize: 18 } });
    expect(JSON.stringify(radar.ir.data)).toContain('"$refText":"a"');
  }
  const architecture = await parseOfficialAst(
    "architecture-beta\nservice a(server)[A]\nservice b(database)[B]\na:R --> L:b",
  );
  expect(architecture?.kind).toBe("architecture");
  if (architecture && architecture.kind !== "error" && architecture.kind !== "unsupported")
    expect(architecture.ir.data?.edges).toMatchObject([
      { lhsDir: "R", rhsDir: "L", rhsInto: true },
    ]);
});

test("official AST leaves other parsers to their registry and reports syntax positions", async () => {
  expect(await parseOfficialAst("flowchart TD\nA-->B")).toBeUndefined();
  expect(await parseOfficialAst('packet-beta\n0-3: "Header"\ninvalid')).toMatchObject({
    kind: "error",
    error: { kind: "syntax", line: 3 },
  });
  expect(await parseOfficialAst("---\ntitle: [bad]\n---\nradar-beta")).toMatchObject({
    kind: "error",
    error: { kind: "syntax" },
  });
});
