/** A prepared canvas is visible only for the request that produced it. This
 * synchronous boundary runs during render, before passive effects start work. */
export function isCurrentRecording(
  requestedKey: string,
  committedKey: string | undefined,
  preparedKey?: string,
): boolean {
  return (
    requestedKey === committedKey && (preparedKey === undefined || requestedKey === preparedKey)
  );
}

/** Appearance changes share a timeline; source, responsive layout, and explicit replay changes do not. */
export function canRetainRecording(
  preparedLayout: string | undefined,
  requestedLayout: string,
  preparedReplay?: string | number,
  requestedReplay?: string | number,
): boolean {
  return preparedLayout === requestedLayout && preparedReplay === requestedReplay;
}
