import type { LayoutOptions, ParsedDiagram, Scene, TextMeasurer } from "../types.ts";
import { estimateText } from "./measure.ts";
import { responsiveScene } from "./official/responsive.ts";
import { OfficialScene } from "./official/context.ts";
import { packet, radar, treemap } from "./official/charts.ts";
import { architecture } from "./official/architecture.ts";
import { treeview } from "./official/trees.ts";
import { wardley, cynefin } from "./official/maps.ts";
import { eventmodeling } from "./official/eventmodeling.ts";

/** Official ASTs are translated directly into replayable native primitives. */
export function layoutOfficial(
  parsed: ParsedDiagram,
  measure: TextMeasurer = estimateText,
  options: LayoutOptions = {},
): Scene | undefined {
  if (parsed.kind === "error" || parsed.kind === "unsupported") return undefined;
  if (
    ["wardley", "cynefin"].includes(parsed.kind) &&
    (options.fontSize ?? 14) > 14 &&
    options.viewportWidth === undefined
  )
    return responsiveScene(parsed, measure, options, layoutOfficial);
  const data = (parsed.ir as typeof parsed.ir & { data?: unknown }).data;
  if (!data || typeof data !== "object") return undefined;
  const scene = new OfficialScene(parsed.kind, measure, options, parsed.ir.title);
  switch (String(parsed.kind)) {
    case "packet":
      packet(scene, data as unknown as Parameters<typeof packet>[1]);
      break;
    case "radar":
      radar(scene, data as unknown as Parameters<typeof radar>[1]);
      break;
    case "treemap":
      treemap(scene, data as unknown as Parameters<typeof treemap>[1]);
      break;
    case "treeview":
      treeview(scene, data as unknown as Parameters<typeof treeview>[1]);
      break;
    case "architecture":
      architecture(scene, data as unknown as Parameters<typeof architecture>[1]);
      break;
    case "wardley":
      wardley(scene, data as unknown as Parameters<typeof wardley>[1]);
      break;
    case "cynefin":
      cynefin(scene, data as unknown as Parameters<typeof cynefin>[1]);
      break;
    case "eventmodeling":
      eventmodeling(scene, data as unknown as Parameters<typeof eventmodeling>[1]);
      break;
    default:
      return undefined;
  }
  return scene.finish();
}
