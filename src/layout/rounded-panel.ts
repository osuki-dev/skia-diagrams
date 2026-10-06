import type { Primitive, Rect } from "../types.ts";

/** Filled panel contour with only the selected outside corners rounded. */
export function roundedPanel(
  rect: Rect,
  radius: number,
  corners: readonly [boolean, boolean, boolean, boolean],
  fill: string,
): Extract<Primitive, { type: "path" }> {
  const r = Math.max(
    0,
    Math.min(Number.isFinite(radius) ? radius : 0, rect.width / 2, rect.height / 2),
  );
  const [tl, tr, br, bl] = corners.map((corner) => (corner ? r : 0));
  const { x, y, width, height } = rect;
  const right = x + width,
    bottom = y + height,
    k = 0.5522847498307936;
  const points = [{ x: x + tl, y }];
  const curves: NonNullable<Extract<Primitive, { type: "path" }>["curves"]> = [];
  const line = (px: number, py: number) => {
    const start = points[points.length - 1];
    const end = { x: px, y: py };
    curves.push({ control1: start, control2: end, end });
    points.push(end);
  };
  const corner = (c1x: number, c1y: number, c2x: number, c2y: number, px: number, py: number) => {
    const end = { x: px, y: py };
    curves.push({ control1: { x: c1x, y: c1y }, control2: { x: c2x, y: c2y }, end });
    points.push(end);
  };
  line(right - tr, y);
  corner(right - tr + k * tr, y, right, y + tr - k * tr, right, y + tr);
  line(right, bottom - br);
  corner(right, bottom - br + k * br, right - br + k * br, bottom, right - br, bottom);
  line(x + bl, bottom);
  corner(x + bl - k * bl, bottom, x, bottom - bl + k * bl, x, bottom - bl);
  line(x, y + tl);
  corner(x, y + tl - k * tl, x + tl - k * tl, y, x + tl, y);
  return { type: "path", points, curves, closed: true, fill, strokeWidth: 0 };
}
