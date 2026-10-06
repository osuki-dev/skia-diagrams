/** Async grammars share the same cancellation boundary as synchronous layouts. */
export function requestSceneAsync<T>(
  prepare: () => Promise<T>,
  schedule: (work: () => void) => { cancel(): void },
  commit: (value: T) => void,
  onError: (error: unknown) => void,
): () => void {
  let cancelled = false;
  const task = schedule(() => {
    if (cancelled) return;
    void prepare().then(
      (value) => {
        if (!cancelled) commit(value);
      },
      (error) => {
        if (!cancelled) onError(error);
      },
    );
  });
  return () => {
    cancelled = true;
    task.cancel();
  };
}
