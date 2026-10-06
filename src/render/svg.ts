import { modernShapeContours, contourSvg } from "./flow-shapes.ts";
import type { Point, Scene } from "../types.ts";
import {
  shapePoints,
  markerGeometry,
  markerShaft,
  circleMarkerCenter,
  cylinderGeometry,
  curveSegments,
  cubicMarkerShaft,
  erMarkerGeometry,
} from "./geometry.ts";
import { lightTheme, resolveColor, resolveStrokeWidth, type DiagramTheme } from "./theme.ts";
import { textRuns } from "./text.ts";
export function escapeXml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}
const pointsAttribute = (points: Point[]) => points.map((p) => `${p.x},${p.y}`).join(" ");
export function renderToSvg(scene: Scene, theme: DiagramTheme = lightTheme): string {
  const { bounds } = scene;
  const elements: string[] = [
    `<title>${escapeXml(scene.accessibilityLabel)}</title>`,
    `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${escapeXml(theme.background)}"/>`,
  ];
  let gradientIndex = 0;
  for (const p of scene.primitives) {
    let gradientFill: string | undefined;
    if (p.gradient && p.gradient.stops.length >= 2) {
      const id = `diagram-gradient-${gradientIndex++}`;
      gradientFill = `url(#${id})`;
      elements.push(
        `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${p.gradient.from.x}" y1="${p.gradient.from.y}" x2="${p.gradient.to.x}" y2="${p.gradient.to.y}">${p.gradient.stops
          .slice()
          .sort((a, b) => a.offset - b.offset)
          .map(
            (stop) =>
              `<stop offset="${Math.max(0, Math.min(1, stop.offset))}" stop-color="${escapeXml(resolveColor(stop.color, theme.nodeFill, theme))}"/>`,
          )
          .join("")}</linearGradient></defs>`,
      );
    }

    const opacity =
      p.opacity === undefined || !Number.isFinite(p.opacity)
        ? ""
        : ` opacity="${Math.max(0, Math.min(1, p.opacity))}"`;
    if (p.type === "image") {
      elements.push(
        `<image href="${escapeXml(p.asset)}" x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" preserveAspectRatio="none"${opacity}/>`,
      );
      continue;
    }
    if (p.type === "sector") {
      const inner = Math.max(0, Math.min(p.radius, p.innerRadius ?? 0));
      const point = (angle: number, radius = p.radius) =>
        `${p.cx + radius * Math.cos(angle)} ${p.cy + radius * Math.sin(angle)}`;
      // Two arcs also handle a single full-circle slice (SVG's identical endpoints cannot).
      const middle = p.startAngle + p.sweepAngle / 2,
        end = p.startAngle + p.sweepAngle;
      elements.push(
        `<path d="M${inner ? point(p.startAngle, inner) : `${p.cx} ${p.cy}`} L${point(p.startAngle)} A${p.radius} ${p.radius} 0 0 1 ${point(middle)} A${p.radius} ${p.radius} 0 0 1 ${point(end)}${inner ? ` L${point(end, inner)} A${inner} ${inner} 0 0 0 ${point(middle, inner)} A${inner} ${inner} 0 0 0 ${point(p.startAngle, inner)}` : ""} Z" fill="${gradientFill ?? escapeXml(resolveColor(p.fill, theme.nodeFill, theme))}" stroke="${escapeXml(resolveColor(p.stroke, theme.nodeStroke, theme))}" stroke-width="${resolveStrokeWidth(p, theme)}" stroke-linejoin="round"${opacity}/>`,
      );
      continue;
    }
    if (p.type === "text") {
      elements.push(
        `<text${opacity}${p.textOutline && p.textOutline.width > 0 ? ` stroke="${escapeXml(resolveColor(p.textOutline.color, theme.background, theme))}" stroke-width="${p.textOutline.width}" stroke-linejoin="round" paint-order="stroke fill"` : ""} font-family="${escapeXml(theme.fontFamily)}" font-size="${p.fontSize}"${p.fontWeight ? ` font-weight="${p.fontWeight}"` : ""} fill="${escapeXml(resolveColor(p.color, theme.nodeText, theme))}">${(p.literal
          ? (p.lineRuns?.map((line) =>
              line.map((run) => ({ text: run.text, bold: false, italic: false })),
            ) ?? p.text.split("\n").map((line) => textRuns(line, true)))
          : (p.lineRuns ?? p.text.split("\n").map((line) => textRuns(line)))
        )
          .map(
            (line, index) =>
              `<tspan x="${p.x}" y="${p.y + (p.lineBaselines?.[index] ?? p.fontSize + (index * p.height) / Math.max(1, (p.lineRuns ?? p.text.split("\n")).length))}">${line
                .map(
                  (run) =>
                    `<tspan${run.bold ? ' font-weight="700"' : ""}${run.italic ? ' font-style="italic"' : ""}>${escapeXml(run.text)}</tspan>`,
                )
                .join("")}</tspan>`,
          )
          .join("")}</text>`,
      );
      continue;
    }
    const fill =
      gradientFill ??
      escapeXml(resolveColor(p.fill, p.type === "path" ? "none" : theme.nodeFill, theme));
    const stroke = escapeXml(
      resolveColor(p.stroke, p.type === "path" ? theme.edgeStroke : theme.nodeStroke, theme),
    );
    const width = resolveStrokeWidth(p, theme);
    const style = `${opacity} fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${p.dash ? ` stroke-dasharray="${p.dash.join(" ")}"` : ""}`;
    if (p.type === "path") {
      const authored =
        p.curves && p.points[0]
          ? cubicMarkerShaft(p.points[0], p.curves, p.start, p.end, theme.arrowSize ?? 10)
          : undefined;
      const shaft = authored
        ? [authored.start]
        : markerShaft(p.points, p.start, p.end, theme.arrowSize ?? 10);
      if ((p.curves || p.smooth) && shaft.length)
        elements.push(
          `<path d="M${shaft[0].x} ${shaft[0].y} ${(authored?.curves ?? curveSegments(shaft))
            .map(
              (segment) =>
                `C${segment.control1.x} ${segment.control1.y} ${segment.control2.x} ${segment.control2.y} ${segment.end.x} ${segment.end.y}`,
            )
            .join(" ")}${p.closed ? " Z" : ""}" ${style}/>`,
        );
      else
        elements.push(
          `<${p.closed ? "polygon" : "polyline"} points="${pointsAttribute(shaft)}" ${style}/>`,
        );
      const curves = p.curves ?? (p.smooth ? curveSegments(p.points) : []);
      for (const [marker, tip, previous] of [
        [p.start, p.points[0], curves[0]?.control1 ?? p.points[1]],
        [
          p.end,
          p.curves?.at(-1)?.end ?? p.points.at(-1),
          curves.at(-1)?.control2 ?? p.points.at(-2),
        ],
      ] as const) {
        if (!marker || marker === "none" || !tip || !previous) continue;
        const er = erMarkerGeometry(marker, tip, previous);
        if (er) {
          for (const line of er.lines)
            elements.push(
              `<polyline points="${pointsAttribute(line)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
            );
          for (const center of er.circles)
            elements.push(
              `<circle cx="${center.x}" cy="${center.y}" r="4" fill="${escapeXml(theme.edgeTextBackground)}" stroke="${stroke}" stroke-width="${width}"/>`,
            );
          continue;
        }
        if (marker === "circle") {
          const center = circleMarkerCenter(tip, previous);
          elements.push(`<circle cx="${center.x}" cy="${center.y}" r="4" fill="${stroke}"/>`);
        } else {
          const geometry = markerGeometry(marker, tip, previous, theme.arrowSize ?? 10);
          for (const points of geometry.paths)
            elements.push(
              `<${geometry.closed ? "polygon" : "polyline"} points="${pointsAttribute(points)}" fill="${geometry.filled ? stroke : "none"}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
            );
        }
      }
      continue;
    }
    const modern = modernShapeContours(p.shape, p);
    if (modern !== undefined) {
      for (const contour of modern)
        elements.push(
          `<path d="${contourSvg(contour.commands)}" ${style.replace(`fill="${fill}"`, `fill="${contour.fill ? (contour.ink ? stroke : fill) : "none"}"`)}/>`,
        );
      continue;
    }
    if (p.shape === "circle" || p.shape === "doublecircle") {
      elements.push(
        `<ellipse cx="${p.x + p.width / 2}" cy="${p.y + p.height / 2}" rx="${p.width / 2}" ry="${p.height / 2}" ${style}/>`,
      );
      if (p.shape === "doublecircle")
        elements.push(
          `<ellipse cx="${p.x + p.width / 2}" cy="${p.y + p.height / 2}" rx="${Math.max(0, p.width / 2 - 5)}" ry="${Math.max(0, p.height / 2 - 5)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`,
        );
    } else if (p.shape === "cylinder") {
      const geometry = cylinderGeometry(p);
      const curves = (segments: typeof geometry.top) =>
        segments
          .map(
            (s) =>
              `C${s.control1.x} ${s.control1.y} ${s.control2.x} ${s.control2.y} ${s.end.x} ${s.end.y}`,
          )
          .join(" ");
      elements.push(
        `<path d="M${geometry.start.x} ${geometry.start.y} ${curves(geometry.top)} L${geometry.side.x} ${geometry.side.y} ${curves(geometry.bottom)} Z" ${style}/>`,
      );
      elements.push(
        `<path d="M${geometry.start.x} ${geometry.start.y} ${curves(geometry.rim)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`,
      );
    } else if (["rect", "round", "stadium", "subroutine"].includes(p.shape)) {
      elements.push(
        `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="${p.shape === "stadium" ? p.height / 2 : p.shape === "round" ? Math.max(0, Math.min(p.radius ?? theme.radius, p.width / 2, p.height / 2)) : 0}" ${style}/>`,
      );
      if (p.shape === "subroutine")
        elements.push(
          `<path d="M${p.x + 8} ${p.y}v${p.height}M${p.x + p.width - 8} ${p.y}v${p.height}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`,
        );
    } else
      elements.push(`<polygon points="${pointsAttribute(shapePoints(p.shape, p))}" ${style}/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">${elements.join("")}</svg>`;
}
