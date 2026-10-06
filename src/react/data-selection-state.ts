import type { DiagramInteraction } from "../types.ts";

/** Toggle the exact authored data point. Display labels and targets can repeat,
 * so selection identity uses the layout's stable interaction ID. */
export function nextDataSelection(
  current: DiagramInteraction | undefined,
  interaction: DiagramInteraction,
): DiagramInteraction | undefined {
  if (interaction.kind !== "data") return current;
  return current?.kind === "data" && current.id === interaction.id ? undefined : interaction;
}
