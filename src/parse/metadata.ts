import { readFrontMatter } from "./frontmatter.ts";
import { readYamlMapping } from "./yaml.ts";

function isMapping(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
/** Deep mapping merge for official init/front-matter configuration, never prototypes. */
export function mergeDiagramConfig(
  ...values: (Record<string, unknown> | undefined)[]
): Record<string, unknown> | undefined {
  let result: Record<string, unknown> | undefined;
  for (const value of values) {
    if (!value) continue;
    result ??= Object.create(null) as Record<string, unknown>;
    for (const [key, item] of Object.entries(value)) {
      result[key] = isMapping(item)
        ? mergeDiagramConfig(isMapping(result[key]) ? result[key] : undefined, item)
        : item;
    }
  }
  return result;
}
/** Read metadata without running a diagram grammar; keep all diagnostic line offsets. */
export function readDiagramMetadata(source: string): ReturnType<typeof readFrontMatter> {
  const metadata = readFrontMatter(source);
  let directives: Record<string, unknown> | undefined;
  const cleaned = metadata.source.replace(
    /%%\{\s*(?:init|initialize)\s*:\s*([\s\S]*?)\}%%/g,
    (directive: string, body: string, offset: number) => {
      const line = metadata.source.slice(0, offset).split("\n").length;
      directives = mergeDiagramConfig(
        directives,
        readYamlMapping(body, line, "Initialization directive"),
      );
      return directive.replace(/[^\n]/g, " ");
    },
  );
  return { ...metadata, source: cleaned, config: mergeDiagramConfig(directives, metadata.config) };
}
