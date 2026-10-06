import type { Scene } from "../types.ts";

/** Start natural-size mindmaps at their authored root; other diagrams retain
 * their existing top-left reading order. Layout geometry remains unchanged. */
export function initialDiagramCamera(
  scene: Scene,
  viewport: { width: number; height: number; scale: number },
): { x: number; y: number } {
  if (scene.kind !== "mindmap") return { x: 0, y: 0 };
  const root = scene.primitives.find(
    (primitive) =>
      primitive.type === "shape" &&
      primitive.semantic?.kind === "node" &&
      primitive.semantic.part === "body" &&
      primitive.semantic.role === "root",
  );
  if (!root || root.type !== "shape") return { x: 0, y: 0 };
  return {
    x: Math.max(
      0,
      Math.min(
        Math.max(0, scene.bounds.width * viewport.scale - viewport.width),
        (root.x + root.width / 2 - scene.bounds.x) * viewport.scale - viewport.width / 2,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        Math.max(0, scene.bounds.height * viewport.scale - viewport.height),
        (root.y + root.height / 2 - scene.bounds.y) * viewport.scale - viewport.height / 2,
      ),
    ),
  };
}
