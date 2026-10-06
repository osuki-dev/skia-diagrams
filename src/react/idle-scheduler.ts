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
const queue = new Set<() => void>();
let queuedTask: { cancel(): void } | undefined;
function scheduleNext() {
  if (queuedTask || queue.size === 0) return;
  const timer = setTimeout(() => {
    queuedTask = scheduleDiagramWork(() => {
      queuedTask = undefined;
      const job = queue.values().next().value;
      if (job) {
        queue.delete(job);
        try {
          job();
        } finally {
          scheduleNext();
        }
      }
    }, nativeDriver());
  }, 16);
  queuedTask = { cancel: () => clearTimeout(timer) };
}

export function scheduleDiagramWork(work: () => void, driver?: DeferredDriver): { cancel(): void } {
  if (!driver) {
    // All diagram instances share admission: mounting a page cannot run every
    // layout/recording in one idle callback burst. Cancel removes queued closures.
    const job = () => work();
    queue.add(job);
    scheduleNext();
    return {
      cancel() {
        queue.delete(job);
        if (queue.size === 0) {
          queuedTask?.cancel();
          queuedTask = undefined;
        }
      },
    };
  }
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
