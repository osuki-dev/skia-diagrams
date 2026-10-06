import type { DiagramIconResolver } from "@osuki-dev/skia-diagrams";
import { exampleIconUris } from "./assets/official/icon-definitions.ts";

/** Actual upstream artwork, resolved by the example host instead of an icon font. */
export const resolveExampleIcon: DiagramIconResolver = (name, rect) => {
  const key =
    name === "fa:user"
      ? "fa_user"
      : ["fa:book", "fa fa-book"].includes(name)
        ? "fa_fa-book"
        : ["mdi:skull-outline", "mdi mdi-skull-outline"].includes(name)
          ? "mdi_skull-outline"
          : undefined;
  const asset = key ? exampleIconUris[key] : undefined;
  return asset ? [{ type: "image", asset, ...rect }] : undefined;
};
