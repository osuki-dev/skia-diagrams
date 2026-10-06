import type { Rect } from "../../types.ts";

/** Squarified treemap rows minimize their worst aspect ratio. Input order is
 * preserved; callers can sort siblings by weight before tiling. Geometry only,
 * with no renderer, font, hierarchy or theme ownership. */
export function squarify(weights: readonly number[], bounds: Rect): Rect[] {
  if (
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    bounds.width < 0 ||
    bounds.height < 0 ||
    !Number.isFinite(bounds.width * bounds.height) ||
    weights.some((weight) => !Number.isFinite(weight) || weight < 0)
  )
    throw new RangeError("Treemap weights and bounds must be finite and nonnegative");
  const result = weights.map(() => ({ x: bounds.x, y: bounds.y, width: 0, height: 0 }));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(total)) throw new RangeError("Treemap weight total exceeds numeric range");
  if (!total || !bounds.width || !bounds.height) return result;
  const entries = weights.flatMap((weight, index) => (weight ? [{ index, weight }] : []));
  let remaining = { ...bounds },
    cursor = 0,
    remainingWeight = total;
  while (cursor < entries.length) {
    const start = cursor;
    const short = Math.min(remaining.width, remaining.height);
    // Normalize to the remaining rectangle each row to avoid accumulating
    // rounding drift or overflowing the original width * height product.
    const area = remaining.width * remaining.height;
    let sum = 0,
      min = Infinity,
      max = 0,
      score = Infinity;
    while (cursor < entries.length) {
      const itemArea = (entries[cursor].weight / remainingWeight) * area;
      if (!Number.isFinite(itemArea) || itemArea <= 0)
        throw new RangeError("Treemap weight ratios exceed numeric range");
      const nextSum = sum + itemArea,
        nextMin = Math.min(min, itemArea),
        nextMax = Math.max(max, itemArea);
      const square = nextSum * nextSum,
        side = short * short;
      const alpha = square / (side * ((1 + Math.sqrt(5)) / 2));
      const nextScore = Math.max(nextMax / alpha, alpha / nextMin);
      if (cursor > start && nextScore > score) break;
      sum = nextSum;
      min = nextMin;
      max = nextMax;
      score = nextScore;
      cursor++;
    }
    const vertical = remaining.width >= remaining.height;
    const lastRow = cursor === entries.length;
    const strip = vertical
      ? lastRow
        ? remaining.width
        : Math.min(remaining.width, sum / remaining.height)
      : lastRow
        ? remaining.height
        : Math.min(remaining.height, sum / remaining.width);
    let offset = vertical ? remaining.y : remaining.x;
    let rowWeight = 0;
    for (let index = start; index < cursor; index++) {
      const entry = entries[index];
      rowWeight += entry.weight;
      const length =
        index === cursor - 1
          ? (vertical ? remaining.y + remaining.height : remaining.x + remaining.width) - offset
          : ((entry.weight / remainingWeight) * area) / strip;
      result[entry.index] = vertical
        ? { x: remaining.x, y: offset, width: strip, height: Math.max(0, length) }
        : { x: offset, y: remaining.y, width: Math.max(0, length), height: strip };
      offset += length;
    }
    remainingWeight -= rowWeight;
    if (vertical) {
      remaining.x += strip;
      remaining.width = Math.max(0, remaining.width - strip);
    } else {
      remaining.y += strip;
      remaining.height = Math.max(0, remaining.height - strip);
    }
  }
  return result;
}
