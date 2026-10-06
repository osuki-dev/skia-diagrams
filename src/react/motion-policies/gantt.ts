import { createMotionCollector, type DiagramMotionPolicy } from "../motion-policy.ts";

/** Every task reveals from its own start date; schedule axes and labels stay anchored. */
export const ganttMotion: DiagramMotionPolicy = (scene) => {
  const motion = createMotionCollector(scene);
  const tasks = (scene.interactions ?? []).filter((item) => item.id.startsWith("gantt-"));
  const groupFor = (index: number) =>
    Math.min(3, Math.floor((index * 4) / Math.max(1, tasks.length)));
  const rectKey = (rect: { x: number; y: number; width: number; height: number }) =>
    `${rect.x}:${rect.y}:${rect.width}:${rect.height}`;
  const barRects = new Set(
    scene.primitives.flatMap((p) =>
      p.type === "shape" && p.motion?.axis === "x" ? [rectKey(p)] : [],
    ),
  );
  const tasksByPosition = new Map<string, number[]>();
  const regions = Array.from(
    { length: 4 },
    () => [] as { x: number; y: number; width: number; height: number }[],
  );
  for (let index = 0; index < tasks.length; index++) {
    const task = tasks[index];
    const key = `${Math.floor(task.x * 10)}:${Math.floor(task.y * 10)}`;
    const bucket = tasksByPosition.get(key) ?? [];
    bucket.push(index);
    tasksByPosition.set(key, bucket);
    if (tasks.length <= 128 && barRects.has(rectKey(task)))
      regions[groupFor(index)].push({
        x: task.x - 2,
        y: task.y - 2,
        width: task.width + 4,
        height: task.height + 4,
      });
  }
  for (const p of scene.primitives) {
    if (motion.number(p)) continue;
    if (p.type !== "shape") {
      motion.static(p);
      continue;
    }
    let index = -1;
    const x = Math.floor(p.x * 10),
      y = Math.floor(p.y * 10);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const candidate of tasksByPosition.get(`${x + dx}:${y + dy}`) ?? []) {
          const task = tasks[candidate];
          if (
            (index < 0 || candidate < index) &&
            Math.abs(task.x - p.x) < 0.1 &&
            Math.abs(task.y - p.y) < 0.1 &&
            Math.abs(task.width - p.width) < 0.1 &&
            Math.abs(task.height - p.height) < 0.1
          )
            index = candidate;
        }
    if (index < 0) {
      motion.static(p);
      continue;
    }
    const group = groupFor(index);
    if (p.shape === "diamond")
      motion.layer(p, `milestones:${group}`, { mode: "fade", delay: group * 0.12 + 0.15 });
    else if (p.motion?.axis === "y")
      motion.layer(p, `markers:${group}`, {
        mode: "draw-y",
        delay: group * 0.12,
        regions: [{ x: p.x - 2, y: p.y - 2, width: p.width + 4, height: p.height + 4 }],
      });
    else
      motion.layer(p, `tasks:${group}`, {
        mode: tasks.length > 128 ? "fade" : "draw-x",
        delay: group * 0.12,
        ...(tasks.length <= 128
          ? {
              regions: regions[group],
            }
          : {}),
      });
  }
  return motion.finish();
};
