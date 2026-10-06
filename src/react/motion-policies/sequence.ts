import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Lifelines keep their authored order while message trajectories follow source to target. */
export const sequenceMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  let maximum = 0;
  let hasNotes = false;
  let hasActivations = false;
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    if (semantic?.role === "message" && Number.isFinite(semantic.row))
      maximum = Math.max(maximum, semantic.row!);
    hasNotes ||= semantic?.role === "note";
    hasActivations ||= semantic?.role === "activation" || semantic?.role === "destruction";
  }
  const phases = hasNotes && hasActivations ? 3 : 4;
  for (const primitive of scene.primitives) {
    const semantic = primitive.semantic;
    const phase = Math.min(phases - 1, Math.floor(((semantic?.row ?? 0) * phases) / (maximum + 1)));
    const delay = 0.05 + phase * 0.19;
    if (semantic?.role === "message") {
      collector.layer(primitive, `message-${semantic.part}:${phase}`, {
        mode: primitive.type === "path" ? "trace" : "fade",
        delay: delay + (primitive.type === "text" ? 0.04 : 0),
        span: primitive.type === "path" ? 0.13 : 0.1,
      });
    } else if (semantic?.role === "activation" || semantic?.role === "destruction") {
      collector.layer(primitive, `activation:${phase}`, {
        mode: "fade",
        delay: delay + 0.13,
        span: 0.08,
      });
    } else if (semantic?.role === "note") {
      collector.layer(primitive, `note:${phase}`, {
        mode: "fade",
        delay: delay + 0.16,
        span: 0.09,
      });
    } else if (semantic?.role === "participant" && (semantic.row ?? -1) >= 0) {
      collector.layer(primitive, `message-label:${phase}`, {
        mode: "fade",
        delay: delay + 0.04,
        span: 0.1,
      });
    } else collector.static(primitive);
  }
  return collector.finish();
};
