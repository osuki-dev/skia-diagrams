import { OfficialScene } from "./context.ts";
interface TreeData {
  config?: {
    treeView?: {
      rowIndent?: number;
      lineThickness?: number;
      showIcons?: boolean;
      defaultIconPack?: string;
      filenameIcons?: Record<string, string>;
      extensionIcons?: Record<string, string>;
    };
    themeVariables?: {
      treeView?: { labelFontSize?: string; labelColor?: string; lineColor?: string };
    };
  };
  nodes: {
    name: string;
    indent?: string | number;
    descAnnotation?: string;
    iconAnnotation?: string;
  }[];
}
export function treeview(scene: OfficialScene, data: TreeData): void {
  const config = data.config?.treeView,
    vars = data.config?.themeVariables?.treeView;
  const step = Math.max(12, Math.min(200, config?.rowIndent ?? 28));
  const size =
    scene.options.fontSize ??
    Math.max(8, Math.min(48, Number.parseFloat(vars?.labelFontSize ?? "") || scene.fontSize));
  const labelColor = vars?.labelColor ?? "nodeText",
    lineColor = vars?.lineColor ?? "gridStroke",
    iconSize = Math.max(16, size * 1.15),
    lineHeight = scene.measure("Ag", { fontSize: size }).height;
  const nodes = data.nodes.map((node) => {
    const branch = node.name.match(/^([\s│┃]*)(?:[├└┣┗][─━]+\s*)/);
    return {
      ...node,
      label: branch ? node.name.slice(branch[0].length) : node.name,
      indent:
        typeof node.indent === "number"
          ? node.indent
          : (node.indent?.replace(/\t/g, "    ").length ?? (branch ? branch[1]!.length + 4 : 0)),
    };
  });
  const hasIconColumn =
    !!config?.showIcons ||
    nodes.some((node) => !!node.iconAnnotation && node.iconAnnotation !== "none") ||
    !!config?.filenameIcons ||
    !!config?.extensionIcons;
  const indentation: number[] = [];
  const depths = nodes.map((node) => {
    while (indentation.length && node.indent < indentation.at(-1)!) indentation.pop();
    if (!indentation.length || node.indent > indentation.at(-1)!) indentation.push(node.indent);
    return indentation.length - 1;
  });
  const stack: { depth: number; x: number; endY: number }[] = [
    { depth: -1, x: scene.padding + iconSize / 2, endY: scene.top + lineHeight + 4 },
  ];
  scene.text("/", scene.padding + 3, scene.top, undefined, labelColor, 600, size);
  let cursorY = scene.top + Math.max(34, lineHeight + 12);
  nodes.forEach((node, index) => {
    const depth = depths[index]!,
      label = node.label,
      x = scene.padding + (depth + 1) * step,
      y = cursorY,
      centerY = y + Math.max(lineHeight, iconSize) / 2,
      filename = label.replace(/\/$/, ""),
      extension = filename.includes(".") ? "." + filename.split(".").at(-1)! : "",
      authoredIcon =
        node.iconAnnotation ??
        config?.filenameIcons?.[filename] ??
        config?.extensionIcons?.[extension],
      showIcon = authoredIcon !== "none" && (!!authoredIcon || !!config?.showIcons),
      textX = x + (hasIconColumn ? iconSize + 7 : 0),
      // Keep a stable hierarchy. Deep trees scroll instead of collapsing their indentation.
      rowWidth = scene.options.viewportWidth
        ? Math.max(160, scene.options.viewportWidth - scene.padding - textX)
        : undefined,
      weight = depth === 0 ? 600 : 400,
      labelHeight = scene.measure(label, {
        fontSize: size,
        fontWeight: weight,
        maxWidth: rowWidth,
      }).height,
      description = node.descAnnotation?.replace(/^:::/, ""),
      descriptionSize = size * 0.8,
      descriptionHeight = description
        ? scene.measure(description, { fontSize: descriptionSize, maxWidth: rowWidth }).height + 3
        : 0,
      rowHeight = Math.max(34, iconSize + 12, labelHeight + descriptionHeight + 12);
    while (stack.length && stack.at(-1)!.depth >= depth) stack.pop();
    const parent = stack.at(-1);
    if (parent) {
      // Extend each trunk once; sibling elbows never repeatedly paint the same segment.
      scene.line(
        [
          { x: parent.x, y: parent.endY },
          { x: parent.x, y: centerY },
          { x: x - 6, y: centerY },
        ],
        lineColor,
      );
      if (config?.lineThickness !== undefined)
        Object.assign(scene.primitives.at(-1)!, {
          strokeWidth: Math.max(0.1, Math.min(12, config.lineThickness)),
        });
      parent.endY = centerY;
    }
    if (showIcon) {
      const folder = label.endsWith("/") || (nodes[index + 1]?.indent ?? -1) > node.indent,
        icon = authoredIcon
          ? authoredIcon.includes(":")
            ? authoredIcon
            : `${config?.defaultIconPack ?? "material-icon-theme"}:${authoredIcon}`
          : folder
            ? "folder"
            : "file",
        iconY = centerY - iconSize / 2;
      if (!scene.icon(icon, { x, y: iconY, width: iconSize, height: iconSize })) {
        // A single outline avoids the seam and rounded capsule produced by overlapping boxes.
        const points = folder
          ? [
              [1, 4],
              [7, 4],
              [9, 6],
              [17, 6],
              [17, 15],
              [1, 15],
            ]
          : [
              [3, 1],
              [10, 1],
              [15, 6],
              [15, 17],
              [3, 17],
            ];
        const scaled = (p: number[]) => ({
          x: x + (p[0]! * iconSize) / 18,
          y: iconY + (p[1]! * iconSize) / 18,
        });
        scene.primitives.push({
          type: "path",
          points: points.map(scaled),
          closed: true,
          fill: folder ? "paletteFill:1" : "nodeFill",
          stroke: folder ? "palette:1" : "mutedText",
          strokeRole: "node",
        });
        if (!folder) {
          scene.line(
            [
              [10, 1],
              [10, 6],
              [15, 6],
            ].map(scaled),
            "mutedText",
          );
          Object.assign(scene.primitives.at(-1)!, { strokeRole: "node" });
        }
      }
    }
    scene.data(
      `treeview:${index}`,
      label,
      {
        x,
        y,
        width:
          textX -
          x +
          (rowWidth ?? scene.measure(label, { fontSize: size, fontWeight: weight }).width),
        height: rowHeight - 4,
      },
      undefined,
      [label, description, node.iconAnnotation].filter(Boolean).join(" · "),
    );
    scene.text(label, textX, y, rowWidth, labelColor, weight, size);
    if (description)
      scene.text(
        description,
        textX,
        y + labelHeight + 3,
        rowWidth,
        "mutedText",
        400,
        descriptionSize,
      );
    stack.push({
      depth,
      x: x + iconSize / 2,
      endY: hasIconColumn ? centerY + iconSize / 2 + 4 : y + labelHeight + descriptionHeight + 4,
    });
    cursorY += rowHeight;
  });
}
