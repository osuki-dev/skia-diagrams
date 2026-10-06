import type { Primitive } from "../src/types.ts";
import { describe, expect, test } from "bun:test";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };
import { parseExtendedUml, type UmlData } from "../src/parse/extended-uml.ts";
import { layoutExtendedUml } from "../src/layout/extended-uml.ts";
import { lightTheme, resolveColor } from "../src/render/theme.ts";
import { estimateText } from "../src/layout/measure.ts";
describe("native official UML family", () => {
  for (const type of catalog.types.filter((t) =>
    ["requirementDiagram", "usecase", "c4", "zenuml"].includes(t.type),
  )) {
    test(`parses and measures unchanged ${type.name} examples`, () => {
      for (const fixture of type.cases) {
        const parsed = parseExtendedUml(fixture.source);
        expect(parsed, fixture.id).toBeDefined();
        expect(parsed?.kind, fixture.id).not.toBe("error");
        expect(parsed?.kind, fixture.id).not.toBe("unsupported");
        const scene = layoutExtendedUml(parsed!, estimateText);
        expect(scene?.primitives.length, fixture.id).toBeGreaterThan(0);
        expect(scene?.bounds.width, fixture.id).toBeGreaterThan(0);
        expect(scene?.bounds.height, fixture.id).toBeGreaterThan(0);
        for (const p of scene!.primitives) {
          for (const key of ["fill", "stroke", "color"] as const) {
            const value = (p as unknown as Record<string, string>)[key];
            if (value)
              expect(resolveColor(value, "#000", lightTheme)).toMatch(
                /^(#|rgba?\(|red$|blue$|green$|grey$|gray$|black$|white$|none$|transparent$)/i,
              );
          }

          if (p.type === "path") {
            for (const pt of p.points) {
              expect(Number.isFinite(pt.x)).toBe(true);
              expect(Number.isFinite(pt.y)).toBe(true);
            }
          } else {
            expect(Number.isFinite(p.x + p.y + p.width + p.height)).toBe(true);
          }
        }
      }
    });
  }
  test("preserves requirement fields and reverse direction semantics", () => {
    const p = parseExtendedUml(
      "requirementDiagram\nrequirement a {\nid: 3\ntext: A real requirement\nrisk: high\nverifymethod: test\n}\nelement b {\ntype: service\n}\na <- verifies - b",
    );
    expect(p?.kind).toBe("requirement");
    if (!p || p.kind === "error" || p.kind === "unsupported") return;
    expect((p.ir.data!.uml as UmlData).nodes.a.fields.text).toBe("A real requirement");
    expect(p.ir.edges[0].from).toBe("b");
    expect(p.ir.edges[0].to).toBe("a");
  });
  test("rejects malformed and unresolved statements", () => {
    expect(parseExtendedUml("requirementDiagram\nrequirement a {\nrisk: enormous\n}")?.kind).toBe(
      "error",
    );
    expect(parseExtendedUml('C4Context\nRel(a,b,"Uses")')?.kind).toBe("error");
  });
  test("C4 authored rows, links, backward arrows and Dynamic numbering", () => {
    const source =
      'C4Dynamic\nPerson(a,"Alice", "User", $link="https://example.com")\nSystem(b,"Backend")\nSystem(c,"Cache")\nRel_Back(a,b,"Uses")\nRel_R(b,c,"Caches", "HTTPS")\nUpdateLayoutConfig($c4ShapeInRow="2")';
    const parsed = parseExtendedUml(source)!;
    expect(parsed.kind).toBe("c4");
    if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("parse failed");
    expect(parsed.ir.edges[0]).toMatchObject({
      from: "a",
      to: "b",
      start: "arrow",
      end: "none",
      label: "1: Uses",
    });
    expect(parsed.ir.edges[1].label).toBe("2: Caches\n[HTTPS]");
    const scene = layoutExtendedUml(parsed, estimateText)!;
    expect(scene.interactions?.[0]).toMatchObject({
      id: "a",
      kind: "link",
      target: "https://example.com",
    });
    const cards = scene.primitives.filter(
      (p): p is Extract<Primitive, { type: "shape" }> => p.type === "shape" && Boolean(p.id),
    );
    expect(cards.find((p) => p.type === "shape" && p.id === "c")?.y).toBeGreaterThan(
      cards.find((p) => p.type === "shape" && p.id === "b")!.y,
    );
  });
  test("C4 context relation captions stay clear of neighboring connectors", () => {
    const fixture = catalog.types.find((type) => type.type === "c4")!.cases[0]!;
    const scene = layoutExtendedUml(parseExtendedUml(fixture.source)!, estimateText)!;
    const captions = scene.primitives.filter(
      (p): p is Extract<Primitive, { type: "text" }> =>
        p.type === "text" && p.semantic?.kind === "edge",
    );
    const routes = scene.primitives.filter(
      (p): p is Extract<Primitive, { type: "path" }> =>
        p.type === "path" && p.semantic?.kind === "edge",
    );
    // Clip each actual segment against the measured caption rectangle (Liang–Barsky).
    // This checks the final geometry rather than repeating placement candidates.
    const crosses = (
      caption: Extract<Primitive, { type: "text" }>,
      route: Extract<Primitive, { type: "path" }>,
    ) =>
      route.points.slice(1).some((end, index) => {
        const start = route.points[index]!;
        const dx = end.x - start.x,
          dy = end.y - start.y;
        let low = 0,
          high = 1;
        for (const [p, q] of [
          [-dx, start.x - caption.x],
          [dx, caption.x + caption.width - start.x],
          [-dy, start.y - caption.y],
          [dy, caption.y + caption.height - start.y],
        ]) {
          if (p === 0) {
            if (q < 0) return false;
          } else if (p < 0) low = Math.max(low, q / p);
          else high = Math.min(high, q / p);
          if (low > high) return false;
        }
        return true;
      });
    expect(captions).toHaveLength(routes.length);
    const contentBottom = Math.max(...scene.interactions!.map((node) => node.y + node.height));
    expect(captions.every((caption) => caption.y + caption.height <= contentBottom)).toBe(true);
    expect(captions.filter((caption) => routes.some((route) => crosses(caption, route)))).toEqual(
      [],
    );
    expect(
      captions.filter((caption) =>
        scene.interactions!.some(
          (node) =>
            caption.x < node.x + node.width &&
            caption.x + caption.width > node.x &&
            caption.y < node.y + node.height &&
            caption.y + caption.height > node.y,
        ),
      ),
    ).toEqual([]);
  });
  test("preserves frontmatter and lets C4 source layout override config", () => {
    const parsed = parseExtendedUml(
      '---\ntitle: Service landscape\nconfig:\n  c4:\n    c4ShapeInRow: 2\n    c4BoundaryInRow: 1\n---\nC4Context\nSystem(a,"API")\nUpdateLayoutConfig($c4ShapeInRow="3")',
    )!;
    if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("parse failed");
    expect(parsed.ir.title).toBe("Service landscape");
    expect((parsed.ir.data!.uml as UmlData).layout).toEqual({
      c4ShapeInRow: "3",
      c4BoundaryInRow: "1",
    });
  });
  test("C4 stereotypes and complete descriptions survive visual text layout", () => {
    const parsed = parseExtendedUml(
      'C4Container\nPerson_Ext(user,"User","A person with personal banking accounts.")\nSystemDb(database,"Database","Stores accounts and transactions.")\nContainer(api,"API","HTTP / JSON","Provides banking functionality.")',
    )!;
    if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("parse failed");
    const scene = layoutExtendedUml(parsed, estimateText)!;
    const text = scene.primitives
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    expect(text).toContain("[Person]");
    expect(text).toContain("[Software System]");
    expect(text).toContain("[Container: HTTP / JSON]");
    expect(text).toContain("A person with personal banking accounts.");
    expect(text).toContain("Stores accounts and transactions.");
    expect(text).toContain("Provides banking functionality.");
  });
  test("C4 full grammar accepts positional settings, named argument slots and accessibility", () => {
    const parsed = parseExtendedUml(
      'C4Context\naccTitle: Service model\naccDescr {\nDescribes the service boundaries.\n}\nSystem_Boundary(b,"Services", "tag", "https://boundary.test") { Person(a,"Alice",$sprite="person",$descr="A customer") System(s,"Service") }\nRelIndex(7,a,s,"Uses",$techn="HTTPS",$tags="edge-tag",$link="https://relation.test")\nUpdateElementStyle(s,"#abc","red","blue",true,"component")\nUpdateRelStyle(a,s,"green","red",10,20)\nUpdateLayoutConfig(2,1)',
    )!;
    expect(parsed.kind).toBe("c4");
    if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("parse failed");
    expect(parsed.ir.description).toBe("Describes the service boundaries.");
    expect(parsed.ir.clusters[0].label).toBe("Services\n[SYSTEM]");
    expect((parsed.ir.data!.uml as UmlData).nodes.a.fields.description).toBe("A customer");
    expect((parsed.ir.data!.uml as UmlData).layout).toMatchObject({
      c4ShapeInRow: "2",
      c4BoundaryInRow: "1",
    });
    expect(parsed.ir.nodes[1].style).toMatchObject({ fill: "#abc", color: "red", stroke: "blue" });
    expect(parsed.ir.edges[0].metadata).toMatchObject({
      techn: "HTTPS",
      tags: "edge-tag",
      link: "https://relation.test",
    });
    expect(parsed.ir.edges[0].style).toMatchObject({ stroke: "red", color: "green" });
  });
  test("Requirement compact declarations and multiline quoted fields retain content", () => {
    const p = parseExtendedUml(
      'requirementDiagram;requirement a { id:1;text:"First line\nSecond line; with { braces }";risk:High;verifymethod:Test; }',
    )!;
    expect(p.kind).toBe("requirement");
    if (p.kind === "error" || p.kind === "unsupported") throw new Error("parse failed");
    expect((p.ir.data!.uml as UmlData).nodes.a.fields.text).toBe(
      "First line\nSecond line; with { braces }",
    );
  });
  test("Requirement accessibility is semantic rather than a diagram title", () => {
    const parsed = parseExtendedUml(
      "requirementDiagram\naccTitle: Compliance\naccDescr {\nChecks a service requirement.\n}\nrequirement a {id:1; text: Checks service; risk:low; verifymethod:test;}",
    )!;
    if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("parse failed");
    expect(parsed.ir.title).toBeUndefined();
    expect(layoutExtendedUml(parsed, estimateText)!.accessibilityLabel).toContain(
      "Compliance. Checks a service requirement.",
    );
  });
  test("UML data targets preserve field values and authored link priority", () => {
    const p = parseExtendedUml(
      "requirementDiagram;requirement a {id:7;text: Verify orders;risk:low;verifymethod:test;}",
    )!;
    const scene = layoutExtendedUml(p, estimateText)!;
    expect(scene.interactions!.find((hit) => hit.target === "a:id")).toMatchObject({
      kind: "data",
      value: 7,
      tooltip: "id: 7",
    });
    expect(scene.interactions!.find((hit) => hit.target === "a:text")).toMatchObject({
      kind: "data",
      tooltip: "text: Verify orders",
    });
    const c4 = layoutExtendedUml(
      parseExtendedUml('C4Context;Person(a,"Alice",$link="https://example.test")')!,
      estimateText,
    )!;
    expect(c4.interactions!.filter((hit) => hit.id === "a")).toHaveLength(1);
    expect(c4.interactions![0].kind).toBe("link");
  });
  test("UML aliases named constructor and __proto__ are ordinary identifiers", () => {
    const sources = [
      "requirementDiagram;requirement constructor {id:1;text: Check service;risk:low;verifymethod:test;} element __proto__ {type:service;} __proto__ - satisfies -> constructor",
      'C4Context;System_Boundary(__proto__,"Boundary") {System(constructor,"Service")}Person(p,"Person");Rel(p,constructor,"Uses");UpdateElementStyle(constructor,"#abc")',
    ];
    for (const source of sources) {
      const parsed = parseExtendedUml(source)!;
      expect(parsed.kind).not.toBe("error");
      if (parsed.kind === "error" || parsed.kind === "unsupported") throw new Error("parse failed");
      const data = parsed.ir.data!.uml as UmlData;
      expect(Object.hasOwn(data.nodes, "constructor")).toBe(true);
      expect(Object.getPrototypeOf(data.nodes)).toBeNull();
      expect(layoutExtendedUml(parsed, estimateText)!.primitives.length).toBeGreaterThan(0);
    }
    expect(
      parseExtendedUml("requirementDiagram;element a {type:service;}a - satisfies -> constructor")
        ?.kind,
    ).toBe("error");
    expect(parseExtendedUml('C4Context;System(a,"Service");Rel(a,__proto__,"Uses")')?.kind).toBe(
      "error",
    );
  });
  test("Use Case inherited-looking aliases retain original IDs in native interactions", () => {
    const parsed = parseExtendedUml(
      'usecase-beta\nactor constructor\nsystemBoundary __proto__\n  toString("Manage account")\nend\nconstructor --> toString',
    )!;
    expect(parsed.kind).toBe("usecase");
    const scene = layoutExtendedUml(parsed, estimateText)!;
    expect(scene.interactions!.map((hit) => hit.id)).toContain("constructor");
    expect(scene.interactions!.map((hit) => hit.id)).toContain("toString");
  });
});
