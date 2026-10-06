import type { Primitive, Rect, Scene } from "../types.ts";
import type {
  NumericMotion,
  PrimitiveMotion,
  PrimitiveMotionLayer,
  PrimitiveMotionPlan,
} from "./primitive-motion-plan.ts";
export type {
  NumericMotion,
  PrimitiveMotion,
  PrimitiveMotionLayer,
  PrimitiveMotionPlan,
} from "./primitive-motion-plan.ts";
export type DiagramMotionPolicy = (scene: Scene) => PrimitiveMotionPlan;
export type MotionLayerOptions = Omit<PrimitiveMotionLayer, "primitives" | "bounds" | "delay"> & {
  delay?: number;
  bounds?: Rect;
};

export function motionBounds(primitives: readonly Primitive[], fallback: Rect): Rect {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  const point = (px: number, py: number) => {
    x = Math.min(x, px);
    y = Math.min(y, py);
    right = Math.max(right, px);
    bottom = Math.max(bottom, py);
  };
  for (const p of primitives) {
    if (p.type === "path") {
      for (const pnt of p.points) point(pnt.x, pnt.y);
      for (const c of p.curves ?? []) {
        point(c.control1.x, c.control1.y);
        point(c.control2.x, c.control2.y);
        point(c.end.x, c.end.y);
      }
    } else {
      point(p.x, p.y);
      point(p.x + p.width, p.y + p.height);
    }
  }
  return Number.isFinite(x)
    ? { x: x - 8, y: y - 8, width: right - x + 16, height: bottom - y + 16 }
    : fallback;
}
/** Leaf policies own semantic classification. The collector guarantees one owner per original primitive. */
export function createMotionCollector(scene: Scene) {
  const staticPrimitives: Primitive[] = [],
    numbers: NumericMotion[] = [];
  const groups = new Map<string, { primitives: Primitive[]; options: MotionLayerOptions }>();
  const owned = new Set<Primitive>();
  return {
    static(p: Primitive) {
      if (!owned.has(p)) {
        owned.add(p);
        staticPrimitives.push(p);
      }
    },
    number(p: Primitive, timing?: { delay?: number; span?: number }): boolean {
      if (
        p.type !== "text" ||
        !p.motion ||
        !Number.isFinite(p.motion.value) ||
        numbers.length >= 24
      )
        return false;
      if (!owned.has(p)) {
        owned.add(p);
        numbers.push({
          ...timing,
          primitive: p,
          value: p.motion.value,
          decimals: Math.max(
            0,
            Math.min(10, Math.floor(Number.isFinite(p.motion.decimals) ? p.motion.decimals! : 0)),
          ),
          prefix: p.motion.prefix ?? "",
          suffix: p.motion.suffix ?? "",
        });
      }
      return true;
    },
    layer(p: Primitive, key: string, options: MotionLayerOptions) {
      if (owned.has(p)) return;
      owned.add(p);
      const group = groups.get(key) ?? { primitives: [], options };
      group.primitives.push(p);
      groups.set(key, group);
    },
    finish(): PrimitiveMotionPlan {
      for (const p of scene.primitives) if (!owned.has(p)) staticPrimitives.push(p);
      let layers = Array.from(groups.values(), ({ primitives, options }) => {
        const delay = Math.max(
          0,
          Math.min(0.98, Number.isFinite(options.delay) ? options.delay! : 0),
        );
        return {
          ...options,
          primitives,
          delay,
          span:
            options.span === undefined
              ? undefined
              : Math.max(
                  0.01,
                  Math.min(1 - delay, Number.isFinite(options.span) ? options.span : 1 - delay),
                ),
          bounds: options.bounds ?? motionBounds(primitives, scene.bounds),
        };
      });
      if (layers.length > 12) {
        const moving = new Set(layers.flatMap((layer) => layer.primitives));
        layers = [
          {
            primitives: scene.primitives.filter((p) => moving.has(p)),
            mode: "fade" as PrimitiveMotion,
            delay: 0,
            span: 1,
            bounds: scene.bounds,
          },
        ];
      }
      return { staticPrimitives, numbers, layers };
    },
  };
}
