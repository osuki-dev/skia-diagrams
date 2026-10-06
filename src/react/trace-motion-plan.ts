import type { Primitive } from "../types.ts";
import type { PrimitiveMotionLayer } from "./primitive-motion-plan.ts";

/** Native trim applies only to stroke-only paths. A whole ineligible layer stays
 * in its original Picture, preserving both paint order and complete geometry. */
export function tracePaths(layer: PrimitiveMotionLayer, alreadyRecorded: number) {
  if (
    layer.mode !== "trace" ||
    !layer.primitives.length ||
    alreadyRecorded + layer.primitives.length > 64
  )
    return undefined;
  if (!layer.primitives.every((p) => p.type === "path" && (!p.fill || p.fill === "none")))
    return undefined;
  return layer.primitives as Extract<Primitive, { type: "path" }>[];
}
