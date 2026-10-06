import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Establish domain cards first, then reveal each domain's strategies independently. */
export const cynefinMotion: DiagramMotionPolicy = (scene) => {
  const collector = createMotionCollector(scene);
  const order = ["complex", "complicated", "chaotic", "clear", "confusion"];
  for (const p of scene.primitives) {
    if (collector.number(p)) continue;
    const index = order.indexOf(p.semantic?.id.replace("cynefin:", "") ?? "");
    if (p.semantic?.role === "domain" && index >= 0) {
      const body = p.semantic.part === "body";
      collector.layer(p, `cynefin-${body ? "cards" : "labels"}:${index}`, {
        mode: body ? "scale" : "lift",
        center:
          body && p.type === "shape" ? { x: p.x + p.width / 2, y: p.y + p.height / 2 } : undefined,
        delay: index * 0.06 + (body ? 0.02 : 0.24),
      });
    } else if (p.type === "path")
      collector.layer(p, "cynefin-transitions", { mode: "trace", delay: 0.65 });
    else collector.static(p);
  }
  return collector.finish();
};
