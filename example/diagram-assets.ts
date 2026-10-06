import { useMemo } from "react";
import { useImage } from "react-native-skia";
import { exampleIconUris } from "./assets/official/icon-definitions.ts";

export { resolveExampleIcon } from "./icon-resolver.ts";

/** Example-owned decoded resources. The library never fetches or bundles assets. */
export function useExampleDiagramAssets() {
  const favicon = useImage(require("./assets/official/mermaid-favicon.png"));
  const user = useImage(require("./assets/official/fa_user.png"));
  const book = useImage(require("./assets/official/fa_fa-book.png"));
  const skull = useImage(require("./assets/official/mdi_skull-outline.png"));
  return useMemo(
    () => ({
      images: new Map([
        ...(favicon ? [["https://mermaid.js.org/favicon.svg", favicon] as const] : []),
        ...(user ? [[exampleIconUris.fa_user, user] as const] : []),
        ...(book ? [[exampleIconUris["fa_fa-book"], book] as const] : []),
        ...(skull ? [[exampleIconUris["mdi_skull-outline"], skull] as const] : []),
      ]),
    }),
    [favicon, user, book, skull],
  );
}
