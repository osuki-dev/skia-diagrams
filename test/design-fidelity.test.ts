import { expect, test } from "bun:test";
import { parseDiagram, layoutDiagram, lightTheme, renderToSvg } from "../src/index.ts";
import { designFixtures, designChartStyles } from "../example/design-fixtures.ts";
import { resolveExampleIcon } from "../example/icon-resolver.ts";
import catalog from "./fixtures/official-mermaid/catalog.json" with { type: "json" };

test("official mindmap spacing remains bounded for native image export", () => {
  for (const fixture of catalog.types.find((type) => type.type === "mindmap")!.cases) {
    const scene = layoutDiagram(parseDiagram(fixture.source), undefined, {
      resolveIcon: resolveExampleIcon,
    });
    expect(scene.bounds.width * 2).toBeLessThan(8192);
    expect(scene.bounds.height * 2).toBeLessThan(8192);
  }
});

test("Gantt task/date table is host configurable and retains every data target", () => {
  for (const fontSize of [10, 14, 18, 24]) {
    const scene = layoutDiagram(parseDiagram(designFixtures.Gantt), undefined, {
      fontSize,
      typeStyles: designChartStyles,
    });
    expect(scene.primitives.filter((p) => p.type === "text").map((p) => p.text)).toContain("Task");
    const dates = scene.primitives.filter(
      (p): p is Extract<typeof p, { type: "text" }> =>
        p.type === "text" && p.color === "headerText" && p.text !== "Task",
    );
    // Authored %b labels retain both time boundaries; measured major ticks
    // may skip intermediate months at larger host font sizes.
    expect(dates.map((p) => p.text)).toContain("Jan");
    expect(dates.map((p) => p.text)).toContain("Jun");
    for (const date of dates)
      expect(["Jan", "Feb", "Mar", "Apr", "May", "Jun"]).toContain(date.text);
    const ordered = [...dates].sort((first, second) => first.x - second.x);
    for (let index = 1; index < ordered.length; index++)
      expect(
        ordered[index].x - ordered[index - 1].x - ordered[index - 1].width,
      ).toBeGreaterThanOrEqual(7.999);
    const border = scene.primitives.at(-1);
    if (border?.type !== "shape") throw new Error("Missing Gantt frame");
    expect(border.fill).toBe("transparent");
    expect(scene.interactions?.length).toBe(4);
    for (const target of scene.interactions ?? []) {
      expect(target.x).toBeGreaterThan(border.x);
      expect(target.x + target.width).toBeLessThanOrEqual(border.x + border.width);
      expect(target.y + target.height).toBeLessThanOrEqual(border.y + border.height);
    }
  }
  const ordinary = layoutDiagram(parseDiagram(designFixtures.Gantt));
  expect(ordinary.primitives.some((p) => p.type === "text" && p.text === "Task")).toBe(false);
  expect(ordinary.primitives.some((p) => p.type === "text" && p.text === "Delivery")).toBe(true);
});

test("approved state and entity specimens lay out from left to right", () => {
  for (const source of [designFixtures.State, designFixtures.ER]) {
    const scene = layoutDiagram(parseDiagram(source));
    expect(scene.bounds.width).toBeGreaterThan(scene.bounds.height);
  }
  const er = layoutDiagram(parseDiagram(designFixtures.ER));
  const key = er.primitives.find((p) => p.type === "text" && p.text === "PK")!;
  const name = er.primitives.find((p) => p.type === "text" && p.text === "id")!;
  const type = er.primitives.find((p) => p.type === "text" && p.text === "int")!;
  expect("x" in key && "x" in name && key.x < name.x).toBe(true);
  expect("x" in name && "x" in type && name.x < type.x).toBe(true);
});

test("state terminals are shared within a scope and distinct between concurrent regions", () => {
  const parsed = parseDiagram(`stateDiagram-v2
[*] --> Idle
Idle --> Running
Idle --> [*]
Running --> [*]
state Nested {
  [*] --> First
  First --> [*]
  --
  [*] --> Second
  Second --> [*]
}`);
  if (parsed.kind !== "state") throw new Error("Missing state graph");
  const endings = parsed.ir.nodes.filter((node) => node.role === "end");
  expect(endings.length).toBe(3);
  const root = endings.find((node) => !node.parent)!;
  expect(parsed.ir.edges.filter((edge) => edge.to === root.id).map((edge) => edge.from)).toEqual([
    "Idle",
    "Running",
  ]);
  const nested = endings.filter((node) => node.parent === "Nested");
  expect(nested.map((node) => node.metadata?.stateRegion).sort()).toEqual([0, 1]);
  expect(new Set(nested.map((node) => node.id)).size).toBe(2);
  const scene = layoutDiagram(parsed);
  expect(
    scene.primitives.filter(
      (primitive) => primitive.type === "shape" && primitive.shape === "doublecircle",
    ).length,
  ).toBe(3);
});

test("pie legend position remains host configurable and expresses real shares", () => {
  const right = layoutDiagram(parseDiagram('pie\n"One" : 1\n"Three" : 3'));
  const bottom = layoutDiagram(parseDiagram('pie\n"One" : 1\n"Three" : 3'), undefined, {
    typeStyles: { pie: { legendPosition: "bottom" } },
  });
  expect(right.primitives.some((p) => p.type === "text" && p.text === "75%")).toBe(true);
  expect(right.bounds.width).toBeGreaterThan(bottom.bounds.width);
  expect(bottom.bounds.height).toBeGreaterThan(right.bounds.height);
});

test("timeline cards precede their common baseline and quadrant regions carry shared color tokens", () => {
  const timeline = layoutDiagram(parseDiagram(designFixtures.Timeline));
  const cards = timeline.primitives.filter((p) => p.type === "shape" && p.shape === "round");
  const dots = timeline.primitives.filter((p) => p.type === "shape" && p.shape === "circle");
  expect(
    cards.every(
      (card) =>
        card.type === "shape" &&
        card.stroke === "accent" &&
        dots.every((dot) => dot.type === "shape" && dot.y > card.y + card.height),
    ),
  ).toBe(true);
  const quadrant = layoutDiagram(parseDiagram(designFixtures.Quadrant));
  const fills = new Set(
    quadrant.primitives.flatMap((primitive) =>
      primitive.fill?.startsWith("paletteFill:") ? [primitive.fill] : [],
    ),
  );
  expect(fills).toEqual(
    new Set(["paletteFill:0", "paletteFill:1", "paletteFill:2", "paletteFill:7"]),
  );
  const paletteFill = [
    "#ab1020",
    "#bc2030",
    "#cd3040",
    "#de4050",
    "#ef5060",
    "#fa6070",
    "#ac7080",
    "#bd8090",
  ];
  const svg = renderToSvg(quadrant, { ...lightTheme, paletteFill });
  for (const index of [0, 1, 2, 7]) expect(svg).toContain(`fill="${paletteFill[index]}"`);
});

test("journey actor activities preserve actual task membership", () => {
  const scene = layoutDiagram(
    parseDiagram(
      "journey\nDiscover : 2 : User, Business\nTry : 3 : User\nAdopt : 5 : User, Business",
    ),
  );
  expect(scene.primitives.filter((p) => p.type === "path" && p.closed)).toHaveLength(3);
  expect(scene.primitives.filter((p) => p.type === "text" && p.text === "Try")).toHaveLength(2);
  expect(scene.primitives.filter((p) => p.type === "path" && p.end === "arrow")).toHaveLength(2);
});

test("class annotations and notes remain visible native content", () => {
  const scene = layoutDiagram(
    parseDiagram(
      'classDiagram\nclass Service\n<<interface>> Service\nnote for Service "Uses a host font"\nnote "Shared contract"',
    ),
  );
  expect(
    scene.primitives.some(
      (p) => p.type === "text" && p.text.includes("«interface»") && p.text.includes("Service"),
    ),
  ).toBe(true);
  expect(scene.primitives.some((p) => p.type === "text" && p.text === "Uses a host font")).toBe(
    true,
  );
  expect(scene.primitives.some((p) => p.type === "text" && p.text === "Shared contract")).toBe(
    true,
  );
});

test("concurrent state regions retain separate initial states and a native divider", () => {
  const scene = layoutDiagram(
    parseDiagram("stateDiagram-v2\nstate Active {\n[*] --> A\nA --> B\n--\n[*] --> C\nC --> D\n}"),
  );
  expect(
    scene.primitives.filter((p) => p.type === "shape" && p.id?.startsWith("start-")),
  ).toHaveLength(2);
  expect(
    scene.primitives.filter(
      (p) => p.type === "path" && p.dash?.[0] === 5 && p.strokeRole === "frame",
    ),
  ).toHaveLength(1);
});

test("sequence creation, destruction and participant links have real native geometry", () => {
  const scene = layoutDiagram(
    parseDiagram(
      "sequenceDiagram\nparticipant Client\nClient->>Client: Prepare\ncreate participant Worker\nClient<<->>Worker: Start\ndestroy Worker\nWorker->>Client: Done\nlink Client: Docs @ https://example.com/docs",
    ),
  );
  const worker = scene.primitives.find((p) => p.type === "text" && p.text === "Worker");
  const client = scene.primitives.find((p) => p.type === "text" && p.text === "Client");
  expect(worker?.type === "text" && client?.type === "text" && worker.y > client.y).toBe(true);
  expect(
    scene.primitives.some((p) => p.type === "path" && p.start === "arrow" && p.end === "arrow"),
  ).toBe(true);
  expect(scene.interactions?.[0]?.target).toBe("https://example.com/docs");
  expect(scene.interactions?.[0]?.width).toBeGreaterThan(0);
});

test("sequence participant symbols and chart point styles retain authored semantics", () => {
  const sequence = layoutDiagram(
    parseDiagram(
      'sequenceDiagram\nparticipant Store@{ "type": "database" }\nparticipant Controller@{ "type": "control" }\nController->>Store: Fetch',
    ),
  );
  expect(sequence.primitives.some((p) => p.type === "shape" && p.shape === "cylinder")).toBe(true);
  expect(sequence.primitives.some((p) => p.type === "shape" && p.shape === "circle")).toBe(true);
  const quadrant = layoutDiagram(
    parseDiagram(
      "quadrantChart\nclassDef highlighted color: #ff0000, radius: 10px, stroke-color: #00ff00, stroke-width: 2px\nA:::highlighted: [0.2, 0.6]",
    ),
  );
  expect(
    quadrant.primitives.some(
      (p) =>
        p.type === "shape" &&
        p.shape === "circle" &&
        p.width === 20 &&
        p.fill === "#ff0000" &&
        p.stroke === "#00ff00" &&
        p.strokeWidth === 2,
    ),
  ).toBe(true);
});

test("terminal decision handoffs keep sibling stages aligned and preserve every authored arrow", () => {
  const scene = layoutDiagram(
    parseDiagram(
      "flowchart TD\nentry([Begin]) --> gate{Decision}\ngate -->|Revise|revision(Update<br/>Content)\ngate -->|Approve|release(Publish)\nrevision --> release",
    ),
  );
  const revision = scene.primitives.find((p) => p.type === "shape" && p.id === "revision")!;
  const release = scene.primitives.find((p) => p.type === "shape" && p.id === "release")!;
  expect(
    revision.type === "shape" &&
      release.type === "shape" &&
      revision.x < release.x &&
      revision.y === release.y &&
      revision.height === release.height,
  ).toBe(true);
  const arrows = scene.primitives.filter((p) => p.type === "path" && p.end === "arrow");
  expect(arrows).toHaveLength(4);
  expect(
    arrows.every(
      (p) =>
        p.type === "path" &&
        !p.smooth &&
        p.points.every(
          (point, index, points) =>
            index === 0 || point.x === points[index - 1].x || point.y === points[index - 1].y,
        ),
    ),
  ).toBe(true);
});

test("mindmap branch source order reads across each row", () => {
  const scene = layoutDiagram(parseDiagram(designFixtures.Mindmap));
  const locate = (label: string) =>
    scene.primitives.find((p) => p.type === "text" && p.text === label)!;
  const people = locate("People"),
    process = locate("Process"),
    technology = locate("Technology"),
    growth = locate("Growth");
  expect(people.type === "text" && process.type === "text" && people.x < process.x).toBe(true);
  expect(technology.type === "text" && growth.type === "text" && technology.x < growth.x).toBe(
    true,
  );
  expect(people.type === "text" && technology.type === "text" && people.y < technology.y).toBe(
    true,
  );
});

test("chart interactions expose authored values and exact pie sectors", () => {
  const pie = layoutDiagram(parseDiagram('pie\ntitle Shares\n"One" : 1\n"Three" : 3'));
  expect(pie.interactions?.map((item) => item.value)).toEqual([1, 3]);
  const hit = pie.interactions?.[0]?.hit;
  if (hit?.type !== "sector") throw new Error("Pie sector hit geometry missing");
  expect(hit.sweepAngle).toBeCloseTo(Math.PI / 2);
  const sector = pie.primitives.find((p) => p.type === "sector")!;
  expect(sector.type === "sector" && sector.cy === hit.cy).toBe(true);
  const xy = layoutDiagram(
    parseDiagram('xychart\nx-axis [Jan, Feb]\nbar "Product" [10, 20]\nline "Users" [15, 25]'),
  );
  expect(xy.interactions?.map((item) => item.value)).toEqual([10, 20, 15, 25]);
  expect(
    xy.interactions?.every((item) => item.width > 0 && item.height > 0 && item.kind === "data"),
  ).toBe(true);
});

test("flow assets use host geometry and retain authored label placement", () => {
  const parsed = parseDiagram(
    'flowchart TD\nA@{ img: "https://example.com/logo.png", label: "Host image", pos: "t", h: 60, constraint: "on" }',
  );
  const scene = layoutDiagram(parsed, undefined, {
    resolveImageSize: () => ({ width: 200, height: 100 }),
  });
  const image = scene.primitives.find((p) => p.type === "image");
  const label = scene.primitives.find((p) => p.type === "text" && p.text === "Host image");
  expect(
    image?.type === "image" &&
      image.width === 120 &&
      image.height === 60 &&
      image.asset === "https://example.com/logo.png",
  ).toBe(true);
  expect(
    label?.type === "text" && image?.type === "image" && label.y + label.height < image.y,
  ).toBe(true);
  const icon = parseDiagram(
    'flowchart TD\nA@{ icon: "host:user", form: "circle", label: "User", pos: "b", h: 60 }',
  );
  expect(() => layoutDiagram(icon)).toThrow("Native icon resolver is required");
  const resolved = layoutDiagram(icon, undefined, {
    resolveIcon: (_, bounds) => [{ type: "shape", shape: "diamond", ...bounds, fill: "accent" }],
  });
  expect(
    resolved.primitives.some(
      (p) => p.type === "shape" && p.shape === "diamond" && p.fill === "accent",
    ),
  ).toBe(true);
});

test("mindmap exact cubic coordinates move with authored titles", () => {
  const scene = layoutDiagram(parseDiagram("mindmap\n root((Idea))\n  People\n  Process"));
  const title = layoutDiagram(
    parseDiagram("---\ntitle: Mindmap\n---\nmindmap\n root((Idea))\n  People\n  Process"),
  );
  const curve = scene.primitives.find((p) => p.type === "path" && p.curves)!;
  const titledCurve = title.primitives.find((p) => p.type === "path" && p.curves)!;
  expect(curve.type === "path" && curve.curves?.length).toBe(1);
  expect(
    curve.type === "path" &&
      titledCurve.type === "path" &&
      titledCurve.curves![0].control1.y - curve.curves![0].control1.y,
  ).toBeCloseTo(
    curve.type === "path" && titledCurve.type === "path"
      ? titledCurve.points[0].y - curve.points[0].y
      : 0,
  );
});

test("timeline stems and baseline stop at marker perimeters and markers paint last", () => {
  const scene = layoutDiagram(parseDiagram(designFixtures.Timeline));
  const dots = scene.primitives.filter((p) => p.type === "shape" && p.shape === "circle");
  const paths = scene.primitives.filter((p) => p.type === "path" && p.strokeRole === "frame");
  for (const dot of dots) {
    if (dot.type !== "shape") continue;
    expect(dot.width).toBe(12);
    const center = { x: dot.x + dot.width / 2, y: dot.y + dot.height / 2 };
    for (const path of paths) {
      if (path.type !== "path") continue;
      for (let index = 1; index < path.points.length; index++) {
        const a = path.points[index - 1],
          b = path.points[index];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const t = Math.max(
          0,
          Math.min(1, ((center.x - a.x) * dx + (center.y - a.y) * dy) / (dx * dx + dy * dy)),
        );
        expect(Math.hypot(center.x - a.x - t * dx, center.y - a.y - t * dy)).toBeGreaterThanOrEqual(
          dot.width / 2 - 0.000001,
        );
      }
    }
  }
  expect(scene.primitives.slice(-dots.length)).toEqual(dots);
});

test("XY line segments stop at data point perimeters and Git connections stop at commits", () => {
  const xy = layoutDiagram(parseDiagram("xychart\nx-axis [Jan, Feb, Mar]\nline [10, 20, 30]"));
  const dots = xy.primitives.filter((p) => p.type === "shape" && p.shape === "circle");
  const segments = xy.primitives.filter((p) => p.type === "path" && p.strokeRole === "series");
  expect(segments).toHaveLength(2);
  for (const segment of segments)
    if (segment.type === "path")
      for (const point of segment.points)
        for (const dot of dots)
          if (dot.type === "shape") {
            expect(
              Math.hypot(point.x - dot.x - dot.width / 2, point.y - dot.y - dot.height / 2),
            ).toBeGreaterThanOrEqual(dot.width / 2 - 0.000001);
          }
  const git = layoutDiagram(parseDiagram('gitGraph\ncommit id:"one"\ncommit id:"two"'));
  const commits = git.primitives.filter((p) => p.type === "shape" && p.shape === "circle");
  const connection = git.primitives.find((p) => p.type === "path" && p.strokeRole === "series");
  expect(
    connection?.type === "path" &&
      commits.every(
        (dot) =>
          dot.type !== "shape" ||
          connection.points.every(
            (point) =>
              Math.hypot(point.x - dot.x - dot.width / 2, point.y - dot.y - dot.height / 2) >=
              dot.width / 2 - 0.000001,
          ),
      ),
  ).toBe(true);
});
