import { expect, test } from "bun:test";
import { requestSceneAsync } from "../src/layout/request.ts";
import { canRetainRecording, isCurrentRecording } from "../src/react/recording-boundary.ts";

test("source and width changes hide a previous final recording before asynchronous preparation", async () => {
  let requested = "source-a:320",
    committed: string | undefined = requested,
    prepared = requested;
  expect(isCurrentRecording(requested, committed, prepared)).toBe(true);
  requested = "source-b:375";
  expect(isCurrentRecording(requested, committed, prepared)).toBe(false);
  let finish!: (key: string) => void;
  const cancel = requestSceneAsync(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
    (work) => {
      work();
      return { cancel() {} };
    },
    (key) => {
      committed = key;
      prepared = key;
    },
    () => {},
  );
  requested = "source-c:430";
  cancel();
  finish("source-b:375");
  await Promise.resolve();
  expect(isCurrentRecording(requested, committed, prepared)).toBe(false);
  committed = requested;
  expect(isCurrentRecording(requested, committed, prepared)).toBe(false);
  prepared = requested;
  expect(isCurrentRecording(requested, committed, prepared)).toBe(true);
});

test("appearance preparation preserves the mounted timeline while geometry or replay changes retire it", () => {
  expect(canRetainRecording("source-a:320:fonts-a", "source-a:320:fonts-a", 1, 1)).toBe(true);
  expect(canRetainRecording("source-a:320:fonts-a", "source-a:375:fonts-a", 1, 1)).toBe(false);
  expect(canRetainRecording("source-a:320:fonts-a", "source-b:320:fonts-a", 1, 1)).toBe(false);
  expect(canRetainRecording("source-a:320:fonts-a", "source-a:320:fonts-b", 1, 1)).toBe(false);
  expect(canRetainRecording("source-a:320:fonts-a", "source-a:320:fonts-a", 1, 2)).toBe(false);
});
