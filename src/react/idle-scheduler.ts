interface DeferredDriver {
  idle?: (work: () => void, timeout: number) => { cancel(): void };
  timer: (work: () => void) => { cancel(): void };
}
function nativeDriver(): DeferredDriver {
  return {
    idle:
      typeof globalThis.requestIdleCallback === "function" &&
      typeof globalThis.cancelIdleCallback === "function"
        ? (work, timeout) => {
            const id = globalThis.requestIdleCallback(work, { timeout });
            return { cancel: () => globalThis.cancelIdleCallback(id) };
          }
        : undefined,
    timer: (work) => {
      const id = setTimeout(work, 0);
      return { cancel: () => clearTimeout(id) };
    },
  };
}
/** A bounded idle timeout prevents starvation; cancellation guards even late host callbacks. */
export function scheduleDiagramWork(
  work: () => void,
  driver: DeferredDriver = nativeDriver(),
): { cancel(): void } {
  let cancelled = false,
    started = false;
  const run = () => {
    if (!cancelled) {
      started = true;
      work();
    }
  };
  const task = driver.idle ? driver.idle(run, 120) : driver.timer(run);
  return {
    cancel() {
      if (cancelled) return;
      cancelled = true;
      if (!started) task.cancel();
    },
  };
}
