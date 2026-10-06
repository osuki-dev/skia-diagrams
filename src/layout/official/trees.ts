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
    lineColor = vars?.lineColor ?? "gridStroke";
  const stack: { depth: number; x: number; y: number }[] = [
    { depth: -1, x: scene.padding + 10, y: scene.top },
  ];
  scene.text("/", scene.padding + 18, scene.top, undefined, labelColor, 600, size);
  const lowestIndent = Math.min(
    0,
    ...data.nodes.map((node) =>
      typeof node.indent === "number" ? node.indent : (node.indent?.length ?? 0),
    ),
  );
  let cursorY = scene.top + Math.max(34, size * 2.4);
  data.nodes.forEach((node, index) => {
    // Official syntax accepts both indented names and literal filesystem branches.
    const branch = node.name.match(/^([\s│┃]*)(?:[├└┣┗][─━]+\s*)/);
    const indent =
      typeof node.indent === "number"
        ? node.indent
        : (node.indent?.replace(/\t/g, "    ").length ?? (branch ? branch[1]!.length + 4 : 0));
    const depth = Math.floor((indent - lowestIndent) / 4),
      label = branch ? node.name.slice(branch[0].length) : node.name;
    const x =
        scene.padding +
        (depth + 1) *
          (scene.options.viewportWidth
            ? Math.min(
                step,
                (scene.options.viewportWidth - scene.padding * 2 - 100) / Math.max(1, depth + 1),
              )
            : step) +
        18,
      y = cursorY;
    const rowWidth = scene.options.viewportWidth
      ? Math.max(48, scene.options.viewportWidth - scene.padding - x - 14)
      : undefined;
    const labelHeight = scene.measure(label, { fontSize: size, maxWidth: rowWidth }).height;
    const descriptionHeight = node.descAnnotation
      ? scene.measure(node.descAnnotation, { fontSize: scene.fontSize * 0.8, maxWidth: rowWidth })
          .height + 2
      : 0;
    const rowHeight = Math.max(34, labelHeight + descriptionHeight + 8);
    while (stack.length && stack.at(-1)!.depth >= depth) stack.pop();
    const parent = stack.at(-1);
    if (parent)
      scene.line(
        [
          { x: parent.x, y: parent.y + 14 },
          { x: parent.x, y: y + 10 },
          { x: x - 8, y: y + 10 },
        ],
        lineColor,
      );
    if (parent && config?.lineThickness)
      Object.assign(scene.primitives.at(-1)!, {
        strokeWidth: Math.max(0.1, Math.min(12, config.lineThickness)),
      });
    const filename = label.replace(/\/$/, ""),
      extension = filename.includes(".") ? "." + filename.split(".").at(-1)! : "";
    const automatic = config?.filenameIcons?.[filename] ?? config?.extensionIcons?.[extension];
    const authoredIcon = node.iconAnnotation ?? automatic;
    const icon =
      authoredIcon && authoredIcon !== "none"
        ? authoredIcon.includes(":")
          ? authoredIcon
          : `${config?.defaultIconPack ?? "material-icon-theme"}:${authoredIcon}`
        : undefined;
    let iconLabel = "";
    if (icon) {
      if (!scene.icon(icon, { x: x - 6, y: y + 2, width: 18, height: 18 }))
        iconLabel = ` [icon:${icon}]`;
    } else if (authoredIcon !== "none" && config?.showIcons) {
      const folder = label.endsWith("/");
      if (!scene.icon(folder ? "folder" : "file", { x: x - 6, y: y + 2, width: 18, height: 18 })) {
        scene.box(
          { x: x - 6, y: y + 5, width: 16, height: 13 },
          "paletteFill:1",
          "palette:1",
          "rect",
        );
        if (folder)
          scene.box(
            { x: x - 6, y: y + 2, width: 8, height: 4 },
            "paletteFill:1",
            "palette:1",
            "rect",
          );
        else
          scene.line(
            [
              { x: x - 2, y: y + 10 },
              { x: x + 6, y: y + 10 },
            ],
            "palette:1",
          );
      }
    }
    scene.data(
      `treeview:${index}`,
      label,
      {
        x: x - 6,
        y,
        width: rowWidth
          ? rowWidth + 20
          : 26 + scene.measure(label + iconLabel, { fontSize: size }).width,
        height: rowHeight - 4,
      },
      undefined,
      [label, node.descAnnotation, node.iconAnnotation].filter(Boolean).join(" · "),
    );
    const completeHeight = scene.measure(label + iconLabel, {
      fontSize: size,
      fontWeight: depth === 0 ? 600 : 400,
      maxWidth: rowWidth,
    }).height;
    scene.text(label + iconLabel, x + 14, y, rowWidth, labelColor, depth === 0 ? 600 : 400, size);
    if (node.descAnnotation)
      scene.text(
        node.descAnnotation.replace(/^:::/, ""),
        x + 12,
        y + completeHeight + 2,
        rowWidth,
        "mutedText",
        400,
        scene.fontSize * 0.8,
      );
    stack.push({ depth, x: x - 8, y });
    cursorY += Math.max(rowHeight, completeHeight + descriptionHeight + 8);
  });
}
