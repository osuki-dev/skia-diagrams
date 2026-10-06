import { expect, test } from "bun:test";
import { layoutDiagram, parseDiagramAsync } from "../src/index.ts";
import { officialCatalog } from "../example/official-fixtures.ts";
import { estimateText } from "../src/layout/measure.ts";
import { alignArchitecture } from "../src/layout/official/architecture-alignment.ts";

const fixture = officialCatalog.types.find((type) => type.type === "architecture")!.cases[3];
for (const fontSize of [10, 14, 18, 24]) {
  test(`architecture alignment and group icons remain usable at ${fontSize}pt`, async () => {
    const scene = layoutDiagram(await parseDiagramAsync(fixture.source), undefined, { fontSize });
    const card = (id: string) => {
      const result = scene.primitives.find((p) => p.type === "shape" && p.id === id);
      if (result?.type !== "shape") throw new Error(`Missing ${id}`);
      return result;
    };
    const sources = ["src_a", "src_b", "src_c"].map(card);
    expect(sources[1].x - sources[0].x).toBe(sources[2].x - sources[1].x);
    expect(sources.every((p) => p.y === sources[0].y)).toBe(true);
    expect(card("db_two").x).toBe(card("src_b").x);
    expect(card("brief").x).toBe(card("src_b").x);
    expect(scene.primitives.some((p) => p.type === "text" && p.text.includes("[icon:"))).toBe(
      false,
    );
    for (const service of [
      "src_a",
      "src_b",
      "src_c",
      "db_one",
      "db_two",
      "db_three",
      "brief",
      "analyst",
      "delivery",
    ]) {
      const surface = card(service),
        interaction = scene.interactions!.find((hit) => hit.target === `architecture:${service}`)!;
      expect(interaction).toMatchObject({
        x: surface.x,
        y: surface.y,
        width: surface.width,
        height: surface.height,
      });
    }
    const headings = scene.primitives.filter(
      (p) => p.type === "text" && ["Sources", "Storage", "Output"].includes(p.text),
    );
    for (const heading of headings) {
      if (heading.type !== "text") continue;
      const inkWidth = estimateText(heading.text, {
        fontSize: heading.fontSize,
        fontWeight: heading.fontWeight,
        maxWidth: heading.width,
      }).width;
      // Native routes detour around header glyphs rather than hiding crossed text.
      for (const edge of scene.primitives.filter((p) => p.type === "path" && p.end === "arrow")) {
        if (edge.type !== "path") continue;
        for (let i = 1; i < edge.points.length; i++) {
          const a = edge.points[i - 1],
            b = edge.points[i];
          const crosses =
            a.x === b.x
              ? a.x > heading.x &&
                a.x < heading.x + inkWidth &&
                Math.max(a.y, b.y) > heading.y &&
                Math.min(a.y, b.y) < heading.y + heading.height
              : a.y === b.y &&
                a.y > heading.y &&
                a.y < heading.y + heading.height &&
                Math.max(a.x, b.x) > heading.x &&
                Math.min(a.x, b.x) < heading.x + inkWidth;
          expect(crosses).toBe(false);
        }
      }
    }
  });
}

test("architecture equality constraints reject contradictory ordered tracks", () => {
  expect(() =>
    alignArchitecture(
      new Map([
        ["a", { x: 0, y: 0 }],
        ["b", { x: 1, y: 0 }],
      ]),
      [
        { direction: "row", members: ["a", "b"] },
        { direction: "column", members: ["a", "b"] },
      ],
    ),
  ).toThrow("conflicting ordered tracks");
});

test("multiline architecture group titles reserve header space without covering services", async () => {
  const parsed = await parseDiagramAsync(
    "architecture-beta\ngroup g(cloud)[A long deployment boundary describing ownership and availability]\nservice s(server)[Server] in g",
  );
  for (const fontSize of [10, 14, 18, 24]) {
    const scene = layoutDiagram(parsed, undefined, { fontSize });
    const header = scene.primitives.find((p) => p.type === "text" && p.semantic?.kind === "frame"),
      service = scene.primitives.find((p) => p.type === "shape" && p.id === "s");
    if (header?.type !== "text" || service?.type !== "shape")
      throw new Error("Missing architecture header");
    expect(header.y + header.height).toBeLessThanOrEqual(service.y - 6);
    expect(header.y).toBeGreaterThanOrEqual(scene.bounds.y);
    expect(header.text).toContain("ownership and availability");
  }
});
