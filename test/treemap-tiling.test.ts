import { expect, test } from "bun:test";
import { squarify } from "../src/layout/official/treemap-tiling.ts";

test("squarified rows conserve weighted areas and remain disjoint within bounds", () => {
  const weights = [6, 6, 4, 3, 2, 2, 1, 0];
  for (const bounds of [
    { x: 10, y: 20, width: 600, height: 400 },
    { x: -10, y: 0, width: 80, height: 700 },
  ]) {
    const tiles = squarify(weights, bounds);
    tiles.forEach((tile, index) => {
      expect(tile.width * tile.height).toBeCloseTo(
        (weights[index] / 24) * bounds.width * bounds.height,
        6,
      );
      expect(tile.x).toBeGreaterThanOrEqual(bounds.x);
      expect(tile.y).toBeGreaterThanOrEqual(bounds.y);
      expect(tile.x + tile.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1e-8);
      expect(tile.y + tile.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1e-8);
      for (const other of tiles.slice(index + 1)) {
        const overlap =
          Math.min(tile.x + tile.width, other.x + other.width) - Math.max(tile.x, other.x);
        const vertical =
          Math.min(tile.y + tile.height, other.y + other.height) - Math.max(tile.y, other.y);
        expect(Math.min(overlap, vertical)).toBeLessThanOrEqual(1e-8);
      }
    });
  }
});

test("golden-ratio rows preserve equal weighted areas and empty totals stay finite", () => {
  const bounds = { x: 0, y: 0, width: 400, height: 400 };
  for (const tile of squarify([1, 1, 1, 1], bounds)) {
    expect(tile.width * tile.height).toBeCloseTo(40000, 6);
    expect(Math.max(tile.width / tile.height, tile.height / tile.width)).toBeLessThanOrEqual(4);
  }
  expect(squarify([0, 0], bounds)).toEqual([
    { x: 0, y: 0, width: 0, height: 0 },
    { x: 0, y: 0, width: 0, height: 0 },
  ]);
  expect(() => squarify([-1], bounds)).toThrow(RangeError);
});
