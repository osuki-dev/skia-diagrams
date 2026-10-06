import type { NumericMotion } from "./primitive-motion-plan.ts";
import type { Primitive } from "../types.ts";

export function numericTiming(number: NumericMotion): { delay: number; span: number } {
  const delay = Math.max(0, Math.min(0.9, Number.isFinite(number.delay) ? number.delay! : 0));
  return {
    delay,
    span: Math.max(
      0.01,
      Math.min(1 - delay, Number.isFinite(number.span) ? number.span! : 1 - delay),
    ),
  };
}

/** Retain the original Paragraph when a counter cannot reproduce host typography.
 * Four bounded groups wait for their latest member rather than exposing labels early. */
export function createNumericFallbacks() {
  const groups = new Map<number, { primitives: Primitive[]; delay: number; span: number }>();
  return {
    add(number: NumericMotion, timing: { delay: number; span: number }) {
      const bucket = Math.min(3, Math.floor(timing.delay * 4));
      const group = groups.get(bucket) ?? { primitives: [], ...timing };
      group.primitives.push(number.primitive);
      group.delay = Math.max(group.delay, timing.delay);
      group.span = Math.max(group.span, timing.span);
      groups.set(bucket, group);
    },
    finish() {
      return Array.from(groups.values(), (group) => ({
        ...group,
        span: Math.min(group.span, 1 - group.delay),
      }));
    },
  };
}
