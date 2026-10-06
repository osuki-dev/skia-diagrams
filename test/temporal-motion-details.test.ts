import { officialCatalog } from "../example/official-fixtures.ts";
import { expect, test } from "bun:test";
import { parseDiagramAsync, layoutDiagram, type Scene, type Primitive } from "../src/index.ts";
import { timelineMotion } from "../src/react/motion-policies/timeline.ts";
import { journeyMotion } from "../src/react/motion-policies/journey.ts";
import { eventmodelingMotion } from "../src/react/motion-policies/eventmodeling.ts";
import { packetMotion } from "../src/react/motion-policies/packet.ts";
const sources = {
  timeline: `timeline\n title Customer platform launch\n section Discovery and customer research\n January : Interviews : Requirements\n February : Prototype\n section Launch and feedback\n March : Launch`,
  journey: `journey\n title Complex customer experience\n section Discover\n Complete a long multi-line onboarding task and review all account permissions: 3: Customer, Support\n Resolve account configuration: 5: Customer, Support`,
  eventmodeling: `eventmodeling\ntf 01 ui CartUI\ntf 02 cmd AddItem { description: string }\ntf 03 evt ItemAdded { description: string }\ntf 04 rmo CartItems`,
  packet: `---\nconfig:\n packet:\n  bitOrder: descending\n  bitsPerRow: 16\n---\npacket\n0-7: "DATA"\n8-11: "TYPE"\n12: "EN"\n13-15: "RESERVED"`,
};
const policies = {
  timeline: timelineMotion,
  journey: journeyMotion,
  eventmodeling: eventmodelingMotion,
  packet: packetMotion,
};
function verifyOwnership(scene: Scene, primitives: Primitive[]) {
  expect(primitives).toHaveLength(scene.primitives.length);
  expect(new Set(primitives).size).toBe(scene.primitives.length);
  expect(primitives.every((p) => scene.primitives.includes(p))).toBe(true);
}
for (const kind of Object.keys(sources) as (keyof typeof sources)[]) {
  test(`${kind} owns exact final primitives and semantic motion groups`, async () => {
    const scene = layoutDiagram(await parseDiagramAsync(sources[kind]));
    const plan = policies[kind](scene);
    verifyOwnership(scene, [
      ...plan.staticPrimitives,
      ...plan.layers.flatMap((layer) => layer.primitives),
      ...plan.numbers.map((n) => n.primitive),
    ]);
    expect(plan.layers.length).toBeGreaterThan(1);
    expect(plan.layers.length).toBeLessThanOrEqual(12);
    expect(plan.layers.some((layer) => layer.mode !== "fade")).toBe(true);
    expect(new Set(plan.layers.map((layer) => layer.delay)).size).toBeGreaterThan(1);
    // Author chronology must survive layout changes and paint-order changes.
    const moved: Scene = {
      ...scene,
      primitives: [...scene.primitives].reverse().map((p, index) =>
        p.type === "path"
          ? {
              ...p,
              points: p.points.map((point) => ({
                ...point,
                x: index * 31,
                y: index * 17,
              })),
            }
          : { ...p, x: index * 31, y: index * 17 },
      ),
    };
    const timing = (motion: ReturnType<(typeof policies)[typeof kind]>) =>
      motion.layers
        .flatMap((layer) =>
          layer.primitives
            .filter((p) => p.semantic)
            .map((p) => `${p.semantic!.id}:${p.semantic!.role}:${layer.mode}:${layer.delay}`),
        )
        .sort();
    expect(timing(policies[kind](moved))).toEqual(timing(plan));
    expect(plan.numbers).toHaveLength(0);
  });
  for (const fontSize of [14, 24]) {
    test(`${kind} ${fontSize}px preserves compact labels and semantic detail at viewport boundaries`, async () => {
      const scene = layoutDiagram(await parseDiagramAsync(sources[kind]), undefined, { fontSize });
      for (const width of [320, 430]) {
        const compact = layoutDiagram(await parseDiagramAsync(sources[kind]), undefined, {
          fontSize,
          viewportWidth: width,
        });
        expect(compact.bounds.width).toBeLessThanOrEqual(width + 0.01);
        for (const p of compact.primitives) {
          if (p.type !== "text") continue;
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x + p.width).toBeLessThanOrEqual(width + 0.01);
        }
        const compactPlan = policies[kind](compact);
        verifyOwnership(compact, [
          ...compactPlan.staticPrimitives,
          ...compactPlan.layers.flatMap((layer) => layer.primitives),
          ...compactPlan.numbers.map((number) => number.primitive),
        ]);
        expect(compactPlan.layers.length).toBeLessThanOrEqual(12);
        expect(new Set(compactPlan.layers.map((layer) => layer.delay)).size).toBeGreaterThan(1);
        if (kind === "packet") {
          const tickTexts = compact.primitives.filter(
            (p) => p.type === "text" && /^\d+$/.test(p.text),
          );
          for (const tick of tickTexts) {
            if (tick.type !== "text") continue;
            expect(tick.fontSize).toBeGreaterThanOrEqual(Math.min(10, fontSize));
          }
          for (let a = 0; a < tickTexts.length; a++)
            for (let b = a + 1; b < tickTexts.length; b++) {
              const first = tickTexts[a]!,
                second = tickTexts[b]!;
              if (first.type !== "text" || second.type !== "text" || first.y !== second.y) continue;
              expect(first.x + first.width <= second.x || second.x + second.width <= first.x).toBe(
                true,
              );
            }
          expect(
            compact.primitives.some(
              (p) => p.type === "text" && p.text.includes("13–15") && p.text.includes("RESERVED"),
            ),
          ).toBe(true);
        }
      }
      if (kind === "timeline") {
        const cards = scene.interactions!.filter((i) => i.id.startsWith("timeline:event:"));
        const section = scene.primitives.find(
          (p) => p.type === "text" && p.text === "Discovery and customer research",
        )!;
        if (section.type !== "text") throw new Error("Missing section");
        expect(cards.every((card) => card.y >= section.y + section.height + 8)).toBe(true);
      }
      if (kind === "journey") {
        const actors = scene.interactions!.filter((i) => i.id.startsWith("journey:actor:"));
        const upper = actors.find((i) => i.id === "journey:actor:0:0")!,
          lower = actors.find((i) => i.id === "journey:actor:1:0")!;
        expect(upper.y + upper.height + 8).toBeLessThanOrEqual(lower.y);
        expect(
          scene.interactions!.some(
            (i) => i.id.startsWith("journey:score:") && i.hit?.type === "circle",
          ),
        ).toBe(true);
      }
    });
  }
}

const fixture = (id: string): string => {
  for (const type of officialCatalog.types) {
    const item = type.cases.find((example) => example.id === id);
    if (item) return item.source;
  }
  throw new Error(`Missing official fixture ${id}`);
};
for (const fontSize of [14, 24]) {
  test(`Packet descending bit order and bounded labels at ${fontSize}px`, async () => {
    const scene = layoutDiagram(await parseDiagramAsync(fixture("packet/003")), undefined, {
      fontSize,
    });
    const data = scene.interactions ?? [];
    expect(data.find((item) => item.label === "RESERVED")!.x).toBeLessThan(
      data.find((item) => item.label === "DATA")!.x,
    );
    for (const item of data) {
      const label = scene.primitives.find((p) => p.type === "text" && p.text === item.label)!;
      if (label.type !== "text") throw new Error("Packet label is absent");
      expect(label.y).toBeGreaterThanOrEqual(item.y);
      expect(label.y + label.height).toBeLessThanOrEqual(item.y + item.height);
    }
  });
  test(`Event streams preserve distinct lanes and identifiers at ${fontSize}px`, async () => {
    const scene = layoutDiagram(await parseDiagramAsync(fixture("eventmodeling/013")), undefined, {
      fontSize,
    });
    const texts = scene.primitives.filter((p) => p.type === "text");
    expect(texts.some((p) => p.text === "Stream: Inventory")).toBe(true);
    expect(texts.some((p) => p.text === "Stream: External")).toBe(true);
    expect(texts.filter((p) => p.text === "InventoryChanged")).toHaveLength(2);
    const data = scene.interactions ?? [];
    expect(data.find((p) => p.label === "Inventory.InventoryChanged")!.y).not.toBe(
      data.find((p) => p.label === "External.InventoryChanged")!.y,
    );
  });
}
test("Packet ascending bit order retains source field positions", async () => {
  const scene = layoutDiagram(await parseDiagramAsync(fixture("packet/001")));
  const data = scene.interactions ?? [];
  expect(data.find((item) => item.label === "Source Port")!.x).toBeLessThan(
    data.find((item) => item.label === "Destination Port")!.x,
  );
});
for (const fontSize of [14, 24]) {
  test(`Event data payloads remain visible below cards at ${fontSize}px`, async () => {
    const scene = layoutDiagram(await parseDiagramAsync(fixture("eventmodeling/004")), undefined, {
      fontSize,
    });
    const john = scene.primitives.find((p) => p.type === "text" && p.text.includes("avatar_john"));
    const jack = scene.primitives.find((p) => p.type === "text" && p.text.includes("avatar_jack"));
    expect(john).toBeDefined();
    expect(jack).toBeDefined();
    if (john?.type !== "text" || jack?.type !== "text") throw new Error("Payload text absent");
    const data = scene.interactions ?? [];
    const first = data.find((item) => item.id === "eventmodeling:02")!;
    const second = data.find((item) => item.id === "eventmodeling:04")!;
    expect(john.y).toBeGreaterThanOrEqual(first.y + first.height);
    expect(jack.y).toBeGreaterThanOrEqual(second.y + second.height);
    for (const payload of [john, jack]) {
      for (const path of scene.primitives) {
        if (path.type !== "path") continue;
        for (let index = 1; index < path.points.length; index++) {
          const a = path.points[index - 1]!,
            b = path.points[index]!;
          const crossing =
            a.x === b.x
              ? a.x > payload.x &&
                a.x < payload.x + payload.width &&
                Math.max(a.y, b.y) > payload.y &&
                Math.min(a.y, b.y) < payload.y + payload.height
              : a.y === b.y &&
                a.y > payload.y &&
                a.y < payload.y + payload.height &&
                Math.max(a.x, b.x) > payload.x &&
                Math.min(a.x, b.x) < payload.x + payload.width;
          expect(crossing).toBe(false);
        }
      }
      const lane = scene.primitives.find(
        (p) =>
          p.type === "shape" &&
          p.fill === "background" &&
          p.y <= payload.y &&
          p.y + p.height >= payload.y + payload.height,
      );
      expect(lane).toBeDefined();
    }
  });
}
