import { expect, test } from "bun:test";
import { scheduleDiagramWork } from "../src/react/idle-scheduler.ts";
import { requestSceneAsync } from "../src/layout/request.ts";
test("idle scheduling has a bounded timeout and suppresses a late canceled callback", () => {
  let queued!: () => void,
    timeout = 0,
    called = 0,
    canceled = 0;
  const task = scheduleDiagramWork(() => called++, {
    idle(work, limit) {
      queued = work;
      timeout = limit;
      return {
        cancel() {
          canceled++;
        },
      };
    },
    timer() {
      throw new Error("idle should be used");
    },
  });
  expect(timeout).toBe(120);
  task.cancel();
  task.cancel();
  queued();
  expect(called).toBe(0);
  expect(canceled).toBe(1);
});
test("timer fallback yields preparation and cancellation still suppresses a pending rejection", async () => {
  let queued!: () => void, reject!: (reason: Error) => void;
  const promise = new Promise<string>((_, fail) => {
    reject = fail;
  });
  const commits: string[] = [],
    errors: unknown[] = [];
  const cancel = requestSceneAsync(
    () => promise,
    (work) =>
      scheduleDiagramWork(work, {
        timer(callback) {
          queued = callback;
          return { cancel() {} };
        },
      }),
    (value) => commits.push(value),
    (error) => errors.push(error),
  );
  expect(commits).toEqual([]);
  queued();
  cancel();
  reject(new Error("stale"));
  await promise.catch(() => {});
  await Promise.resolve();
  expect(commits).toEqual([]);
  expect(errors).toEqual([]);
});
