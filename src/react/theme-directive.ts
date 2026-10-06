import { readDiagramMetadata } from "../parse/metadata.ts";
import type { resolveDiagramTheme } from "../render/theme.ts";

/** Reading appearance does not run a diagram grammar; preparation owns syntax errors. */
export function readDiagramThemeDirective(
  source: string,
): Parameters<typeof resolveDiagramTheme>[2] {
  try {
    const { config } = readDiagramMetadata(source);
    const variables = config?.themeVariables;
    return {
      theme: config?.theme === "dark" ? "dark" : config?.theme === "light" ? "light" : undefined,
      variables:
        variables && typeof variables === "object" && !Array.isArray(variables)
          ? Object.fromEntries(
              Object.entries(variables).filter(
                ([key, value]) =>
                  typeof value === "string" ||
                  (key === "xyChart" &&
                    !!value &&
                    typeof value === "object" &&
                    !Array.isArray(value)),
              ),
            )
          : undefined,
    };
  } catch {
    return undefined;
  }
}
