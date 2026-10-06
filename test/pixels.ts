/** Changed pixels, not compressed PNG bytes; any changed RGBA channel counts.
 * At most 0.5% of pixels may differ. */
export function pixelDifference(actual: Uint8Array, expected: Uint8Array): number {
  if (actual.length !== expected.length || actual.length === 0 || actual.length % 4) return 1;
  let changed = 0;
  for (let i = 0; i < actual.length; i += 4) {
    if ([0, 1, 2, 3].some((channel) => actual[i + channel] !== expected[i + channel])) changed++;
  }
  return changed / (actual.length / 4);
}
