import type { Point, Rect } from "../types.ts";

export interface LabelAnchor extends Point {
  id: string;
  width: number;
  height: number;
  radius?: number;
}
export type LabelObstacle = Rect | { cx: number; cy: number; radius: number };
export interface PlacedLabel extends Rect {
  id: string;
  /** A leader starts at the marker boundary, never through its center. */
  leader?: [Point, Point];
}

function obstacleBounds(obstacle: LabelObstacle): Rect {
  return "radius" in obstacle
    ? {
        x: obstacle.cx - obstacle.radius,
        y: obstacle.cy - obstacle.radius,
        width: obstacle.radius * 2,
        height: obstacle.radius * 2,
      }
    : obstacle;
}
export function labelIntersectsObstacle(rect: Rect, obstacle: LabelObstacle, gap = 0): boolean {
  if ("radius" in obstacle) {
    const dx = obstacle.cx - Math.max(rect.x, Math.min(rect.x + rect.width, obstacle.cx));
    const dy = obstacle.cy - Math.max(rect.y, Math.min(rect.y + rect.height, obstacle.cy));
    return dx * dx + dy * dy < (obstacle.radius + gap) ** 2;
  }
  return (
    rect.x < obstacle.x + obstacle.width + gap &&
    rect.x + rect.width + gap > obstacle.x &&
    rect.y < obstacle.y + obstacle.height + gap &&
    rect.y + rect.height + gap > obstacle.y
  );
}
/** Sparse uniform grid keeps ordinary collision queries local. */
class ObstacleGrid {
  private readonly cells = new Map<string, Set<LabelObstacle>>();
  constructor(private readonly cellSize = 64) {}
  private keys(rect: Rect): string[] {
    const keys: string[] = [];
    for (
      let y = Math.floor(rect.y / this.cellSize);
      y <= Math.floor((rect.y + rect.height) / this.cellSize);
      y++
    ) {
      for (
        let x = Math.floor(rect.x / this.cellSize);
        x <= Math.floor((rect.x + rect.width) / this.cellSize);
        x++
      ) {
        keys.push(`${x}:${y}`);
      }
    }
    return keys;
  }
  add(obstacle: LabelObstacle): void {
    for (const key of this.keys(obstacleBounds(obstacle))) {
      let cell = this.cells.get(key);
      if (!cell) this.cells.set(key, (cell = new Set()));
      cell.add(obstacle);
    }
  }
  blocked(rect: Rect, gap: number): boolean {
    const seen = new Set<LabelObstacle>();
    for (const key of this.keys({
      x: rect.x - gap,
      y: rect.y - gap,
      width: rect.width + gap * 2,
      height: rect.height + gap * 2,
    })) {
      for (const obstacle of this.cells.get(key) ?? []) {
        if (seen.has(obstacle)) continue;
        seen.add(obstacle);
        if (labelIntersectsObstacle(rect, obstacle, gap)) return true;
      }
    }
    return false;
  }
}
function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}
/**
 * Preserve authored data positions, placing measured labels around them. Eight
 * directional candidates are searched in bounded rings. Labels that cannot fit
 * use a reserved callout gutter instead of hiding text or moving the data.
 */
export function placeLabels(
  labels: readonly LabelAnchor[],
  plot: Rect,
  obstacles: readonly LabelObstacle[] = [],
  options: { gap?: number; gutterTop?: number; gutterWidth?: number } = {},
): PlacedLabel[] {
  const gap = options.gap ?? 6;
  const grid = new ObstacleGrid();
  for (const obstacle of obstacles) grid.add(obstacle);
  for (const label of labels) grid.add({ cx: label.x, cy: label.y, radius: label.radius ?? 0 });
  let gutterX = plot.x;
  let gutterY = Math.max(plot.y + plot.height + gap * 3, options.gutterTop ?? 0);
  // Authored markers may extend beyond the plot, so reserve their full extents.
  for (const obstacle of obstacles) {
    const bounds = obstacleBounds(obstacle);
    gutterY = Math.max(gutterY, bounds.y + bounds.height + gap * 3);
  }
  for (const label of labels) gutterY = Math.max(gutterY, label.y + (label.radius ?? 0) + gap * 3);
  const gutterWidth = Math.max(plot.width, options.gutterWidth ?? plot.width);
  let rowHeight = 0;
  const placed: PlacedLabel[] = [];
  for (const label of labels) {
    let result: Rect | undefined;
    let preferred = false;
    const radius = label.radius ?? 0;
    for (let ring = 0; ring < 6 && !result; ring++) {
      const distance = radius + gap + ring * Math.max(12, label.height * 0.75);
      const candidates: Rect[] = [
        {
          x: label.x + distance,
          y: label.y - label.height / 2,
          width: label.width,
          height: label.height,
        },
        {
          x: label.x - distance - label.width,
          y: label.y - label.height / 2,
          width: label.width,
          height: label.height,
        },
        {
          x: label.x - label.width / 2,
          y: label.y - distance - label.height,
          width: label.width,
          height: label.height,
        },
        {
          x: label.x - label.width / 2,
          y: label.y + distance,
          width: label.width,
          height: label.height,
        },
        {
          x: label.x + distance,
          y: label.y - distance - label.height,
          width: label.width,
          height: label.height,
        },
        {
          x: label.x - distance - label.width,
          y: label.y - distance - label.height,
          width: label.width,
          height: label.height,
        },
        { x: label.x + distance, y: label.y + distance, width: label.width, height: label.height },
        {
          x: label.x - distance - label.width,
          y: label.y + distance,
          width: label.width,
          height: label.height,
        },
      ];
      result = candidates.find(
        (candidate) => contains(plot, candidate) && !grid.blocked(candidate, gap / 2),
      );
      preferred = ring === 0 && !!result && candidates.indexOf(result) < 2;
    }
    if (!result) {
      if (gutterX > plot.x && gutterX + label.width > plot.x + gutterWidth) {
        gutterY += rowHeight + gap * 2;
        gutterX = plot.x;
        rowHeight = 0;
      }
      result = { x: gutterX, y: gutterY, width: label.width, height: label.height };
      gutterX += label.width + gap * 3;
      rowHeight = Math.max(rowHeight, label.height);
    }
    grid.add(result);
    let leader: [Point, Point] | undefined;
    if (!preferred) {
      const end = {
        x: Math.max(result.x, Math.min(result.x + result.width, label.x)),
        y: Math.max(result.y, Math.min(result.y + result.height, label.y)),
      };
      const dx = end.x - label.x,
        dy = end.y - label.y;
      const length = Math.hypot(dx, dy);
      if (length > radius + 1)
        leader = [
          { x: label.x + (dx / length) * radius, y: label.y + (dy / length) * radius },
          end,
        ];
    }
    placed.push({ id: label.id, ...result, ...(leader ? { leader } : {}) });
  }
  return placed;
}
