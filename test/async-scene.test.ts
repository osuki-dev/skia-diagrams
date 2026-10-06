import { expect, test } from "bun:test";
import { requestSceneAsync } from "../src/layout/request.ts";
import { SceneCache } from "../src/layout/cache.ts";
import { estimateText } from "../src/layout/measure.ts";

test("canceled async grammar requests never replace a newer scene", async () => {
  let resolve!: (value: string) => void;
  const ready = new Promise<string>((done) => {
    resolve = done;
  });
  const queued: (() => void)[] = [];
  const schedule = (work: () => void) => {
    queued.push(work);
    return { cancel() {} };
  };
  const committed: string[] = [];
  const cancel = requestSceneAsync(
    () => ready,
    schedule,
    (value) => committed.push(value),
    () => {
      throw new Error("unexpected failure");
    },
  );
  queued.shift()!();
  cancel();
  requestSceneAsync(
    async () => "latest",
    schedule,
    (value) => committed.push(value),
    () => {},
  );
  queued.shift()!();
  resolve("stale");
  await ready;
  await Promise.resolve();
  expect(committed).toEqual(["latest"]);
});

test("native async official grammars reuse serializable geometry across requests", async () => {
  const cache = new SceneCache();
  const source = 'packet-beta\n0-7: "Header"\n8-15: "Payload"';
  const result = await cache.prepareAsync("packet", source, estimateText, 14);
  expect(result.status).toBe("ready");
  if (result.status !== "ready") return;
  expect(result.scene.kind).toBe("packet");
  expect(
    await cache.prepareAsync(
      "packet",
      source,
      () => {
        throw new Error("cache must reuse metrics");
      },
      14,
    ),
  ).toBe(result);
});
