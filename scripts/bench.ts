import { parseDiagram, layoutDiagram } from "../src/index.ts";
import { readFileSync, writeFileSync } from "node:fs";
const results: { name: string; parseMs: number; layoutMs: number; primitives: number }[] = [];
const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
for (const count of [20, 100, 300]) {
  const source = `flowchart TD\n${Array.from({ length: count - 1 }, (_, i) => `N${i} --> N${i + 1}`).join("\n")}`;
  const parseTimes: number[] = [],
    layoutTimes: number[] = [];
  let primitives = 0;
  for (let iteration = 0; iteration < 20; iteration++) {
    const start = performance.now(),
      parsed = parseDiagram(source),
      parsedAt = performance.now();
    const scene = layoutDiagram(parsed),
      done = performance.now();
    primitives = scene.primitives.length;
    if (iteration >= 5) {
      parseTimes.push(parsedAt - start);
      layoutTimes.push(done - parsedAt);
    }
  }
  const parseMs = median(parseTimes),
    layoutMs = median(layoutTimes);
  results.push({ name: `flowchart-${count}`, parseMs, layoutMs, primitives });
  console.log(
    JSON.stringify({
      count,
      parseMs,
      layoutMs,
      primitives,
      pictureMs: null,
      note: "Node estimate metrics; native Picture timing requires a release QA build",
    }),
  );
}
const sequence = `sequenceDiagram\n${Array.from({ length: 50 }, (_, i) => `A->>B: Message ${i}`).join("\n")}`;
const parseTimes: number[] = [],
  layoutTimes: number[] = [];
let primitives = 0;
for (let i = 0; i < 20; i++) {
  // Sub-millisecond single calls were noisy enough to fail the same revision.
  // Batch 200 operations per sample; retain the actual +30% threshold.
  const batch = 200,
    start = performance.now();
  for (let operation = 0; operation < batch; operation++) parseDiagram(sequence);
  const middle = performance.now(),
    parsed = parseDiagram(sequence),
    layoutStart = performance.now();
  for (let operation = 0; operation < batch; operation++)
    primitives = layoutDiagram(parsed).primitives.length;
  const end = performance.now();
  if (i >= 5) {
    parseTimes.push((middle - start) / batch);
    layoutTimes.push((end - layoutStart) / batch);
  }
}
results.push({
  name: "sequence-50",
  parseMs: median(parseTimes),
  layoutMs: median(layoutTimes),
  primitives,
});
console.log(JSON.stringify(results.at(-1)));
const baselinePath = `${import.meta.dir}/../test/benchmark-baseline.json`;
if (process.argv.includes("--update"))
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        environment:
          "Bun 1.4.2; local Linux; median of 15 after 5 warmups; sequence samples batch 200 calls; Node estimates, not device acceptance",
        results,
      },
      null,
      2,
    ) + "\n",
  );
if (process.argv.includes("--check")) {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as { results: typeof results };
  for (const result of results) {
    const previous = baseline.results.find((r) => r.name === result.name);
    if (!previous) throw new Error(`Missing baseline: ${result.name}`);
    for (const metric of ["parseMs", "layoutMs"] as const)
      if (result[metric] > previous[metric] * 1.3)
        throw new Error(
          `Regression >30%: ${result.name} ${metric}: ${result[metric]} > ${previous[metric] * 1.3}`,
        );
  }
  console.log(
    "Parse/layout median regression gate passed (+30%); device Picture/memory gate remains separate",
  );
}
