import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createElement, Fragment, isValidElement, type ReactNode } from "react";
import type { DiagramConfiguration, DiagramViewerIconProps } from "../src/react/provider.tsx";
import { mergeThemeOverrides } from "../src/render/theme.ts";

// Execute the production provider and toolbar JSX without loading native Skia.
// Native presentation is deliberately outside these configuration/action tests.
const providerSource = readFileSync(new URL("../src/react/provider.tsx", import.meta.url), "utf8");
const viewerSource = readFileSync(new URL("../src/react/index.tsx", import.meta.url), "utf8");
const iconSource = readFileSync(new URL("../src/react/viewer-icon.tsx", import.meta.url), "utf8");
const transpiler = new Bun.Transpiler({
  loader: "tsx",
  tsconfig: {
    compilerOptions: { jsx: "react", jsxFactory: "createElement", jsxFragmentFactory: "Fragment" },
  },
});
const ViewerIcon = runInNewContext(
  transpiler.transformSync(
    iconSource
      .slice(iconSource.indexOf("export function ViewerIcon"))
      .replace("export function", "function"),
  ) + "\nViewerIcon",
  { createElement, View: "icon-container" },
) as (
  props: DiagramViewerIconProps & {
    renderIcon?: DiagramConfiguration["renderViewerIcon"];
    children: ReactNode;
  },
) => ReactNode;

function provider(parent: DiagramConfiguration, configuration: DiagramConfiguration) {
  const source = providerSource.slice(providerSource.indexOf("export function DiagramProvider"));
  return runInNewContext(
    transpiler.transformSync(source.replace("export function", "function")) +
      "\nDiagramProvider(configuration).props.value",
    {
      configuration,
      createElement,
      DiagramContext: { Provider: "provider" },
      useDiagramConfiguration: () => parent,
      useMemo: (calculate: () => unknown) => calculate(),
      mergeThemeOverrides,
    },
  ) as DiagramConfiguration;
}

type ButtonProps = { accessibilityLabel: string; onPress: () => void; children?: ReactNode };
function nodes(node: ReactNode): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  if (node.type === ViewerIcon && isValidElement<Parameters<typeof ViewerIcon>[0]>(node))
    return nodes(ViewerIcon(node.props));
  return [node, ...nodes(node.props.children as ReactNode)];
}

function toolbar(
  options: {
    configuration?: DiagramConfiguration;
    renderViewerIcon?: DiagramConfiguration["renderViewerIcon"];
    exported?: "svg" | "png";
    labels?: Record<string, string>;
    ready?: boolean;
    exporting?: boolean;
    copy?: boolean;
    export?: boolean;
  } = {},
) {
  const actions: unknown[] = [];
  const source = viewerSource.slice(
    viewerSource.indexOf("<ScrollView\n          horizontal"),
    viewerSource.indexOf(
      "</ScrollView>",
      viewerSource.indexOf("<ScrollView\n          horizontal"),
    ) + "</ScrollView>".length,
  );
  const rendererResolution = viewerSource.match(/const renderViewerIcon = [^;]+;/)![0];
  const shared = (name: string) => ({ set: (value: number) => actions.push([name, value]) });
  const tree = runInNewContext(
    transpiler.transformSync(rendererResolution + "\nconst tree = (" + source + ");") + "\ntree",
    {
      createElement,
      Fragment,
      ScrollView: "scroll",
      Pressable: "button",
      Text: "text",
      ViewerIcon,
      configuration: options.configuration ?? {},
      props: {
        renderViewerIcon: options.renderViewerIcon,
        onClose: () => actions.push("close"),
        onCopySource: options.copy === false ? undefined : () => actions.push("copy"),
        onExport: options.export === false ? undefined : () => {},
        labels: options.labels,
      },
      theme: { nodeText: "#456789", radius: 8 },
      StyleSheet: { hairlineWidth: 0.5 },
      controlStyle: {},
      result: { status: options.ready === false ? "loading" : "ready" },
      fit: 0.42,
      motionMode: "system",
      exporting: options.exporting ?? false,
      exported: options.exported,
      exportDiagram: (kind: string) => actions.push(kind),
      withTiming: (value: number) => value,
      zoom: shared("zoom"),
      savedZoom: shared("savedZoom"),
      x: shared("x"),
      y: shared("y"),
      savedX: shared("savedX"),
      savedY: shared("savedY"),
    },
  ) as ReactNode;
  const all = nodes(tree);
  return {
    actions,
    icons: all.filter((node) => node.type === "host-icon").map((node) => node.props),
    text: all.filter((node) => node.type === "text").map((node) => node.props.children),
    containers: all.filter((node) => node.type === "icon-container").map((node) => node.props),
    buttons: all.filter((node) => node.type === "button").map((node) => node.props),
    press(label: string) {
      const button = all.find(
        (node) => node.type === "button" && node.props.accessibilityLabel === label,
      );
      expect(button).toBeDefined();
      (button!.props as ButtonProps).onPress();
    },
  };
}

const icon = (props: DiagramViewerIconProps) => createElement("host-icon", { ...props });

test("nested provider inherits viewer renderer and permits an explicit override", () => {
  const parent = { renderViewerIcon: icon, theme: { nodeText: "#123456" } };
  expect(provider(parent, {}).renderViewerIcon).toBe(icon);
  const replacement = () => null;
  const child = provider(parent, { renderViewerIcon: replacement });
  expect(child.renderViewerIcon).toBe(replacement);
  expect(child.theme?.nodeText).toBe("#123456");
  expect(parent.renderViewerIcon).toBe(icon);
});

test("viewer renders semantic icons with theme color and retains numeric/format labels", () => {
  const view = toolbar({ configuration: { renderViewerIcon: icon } });
  expect(view.icons).toEqual([
    { action: "close", color: "#456789", size: 24 },
    { action: "fit", color: "#456789", size: 22 },
    { action: "copy", color: "#456789", size: 18 },
  ]);
  expect(view.text).toEqual(["100%", "SVG", "PNG"]);
  expect(toolbar({ renderViewerIcon: icon, exported: "svg" }).icons.at(-1)?.action).toBe("success");
  expect(toolbar({ renderViewerIcon: icon, exported: "png" }).icons.at(-1)?.action).toBe("success");
});

test("local renderer overrides provider, and nullish output retains built-in glyphs", () => {
  const view = toolbar({ configuration: { renderViewerIcon: icon }, renderViewerIcon: () => null });
  expect(view.icons).toEqual([]);
  expect(view.text).toEqual(["×", "⤢", "100%", "</>", "SVG", "PNG"]);
  expect(toolbar({ renderViewerIcon: () => undefined, exported: "png" }).text.at(-1)).toBe("✓");
  expect(toolbar().text).toEqual(view.text);
});

test("custom graphics preserve actual toolbar callbacks and both zoom operations", () => {
  const view = toolbar({ renderViewerIcon: icon });
  for (const label of ["Close diagram", "Copy source", "Export SVG", "Export PNG"])
    view.press(label);
  expect(view.actions).toEqual(["close", "copy", "svg", "png"]);
  view.actions.length = 0;
  for (const [label, scale] of [
    ["Fit diagram", 0.42],
    ["Diagram actual size", 1],
  ] as const) {
    view.press(label);
    expect(view.actions.splice(0)).toEqual([
      ["zoom", scale],
      ["savedZoom", scale],
      ["x", 0],
      ["y", 0],
      ["savedX", 0],
      ["savedY", 0],
    ]);
  }
});

test("decorative icons cannot intercept touches or duplicate accessible toolbar actions", () => {
  const view = toolbar({
    renderViewerIcon: icon,
    exported: "svg",
    labels: { close: "Dismiss", svg: "Save vector" },
  });
  expect(view.containers).toHaveLength(4);
  for (const container of view.containers)
    expect(container).toMatchObject({
      pointerEvents: "none",
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
  for (const button of view.buttons) expect(button.accessibilityRole).toBe("button");
  view.press("Dismiss");
  view.press("Save vector");
  expect(view.actions).toEqual(["close", "svg"]);
});

test("partial icon sets fall back per action and obey existing action availability", () => {
  const render = (props: DiagramViewerIconProps) => (props.action === "close" ? icon(props) : null);
  const view = toolbar({ renderViewerIcon: render });
  expect(view.icons.map((item) => item.action)).toEqual(["close"]);
  expect(view.text).toEqual(["⤢", "100%", "</>", "SVG", "PNG"]);
  const loading = toolbar({ renderViewerIcon: icon, ready: false, copy: false });
  expect(loading.icons.map((item) => item.action)).toEqual(["close"]);
  expect(loading.buttons).toHaveLength(1);
  const unavailable = toolbar({ renderViewerIcon: icon, export: false });
  expect(unavailable.text).toEqual(["100%"]);
  const busy = toolbar({ renderViewerIcon: icon, exporting: true });
  expect(
    busy.buttons.filter((button) => button.disabled).map((button) => button.accessibilityLabel),
  ).toEqual(["Export SVG", "Export PNG"]);
});
