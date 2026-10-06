import { readYaml } from "./yaml.ts";
import { fail } from "./common.ts";

/** Preserve line numbers while reading Mermaid's YAML front matter safely. */
export function readFrontMatter(source: string): {
  source: string;
  title?: string;
  config?: Record<string, unknown>;
} {
  const match = /^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/.exec(source);
  if (!match) return { source };
  // Mermaid removes the indentation established by the first front-matter line.
  // This matters for quoted multiline values with unindented YAML comments.
  const indent = /^[ \t]*/.exec(match[1])?.[0] ?? "";
  const body = indent
    ? match[1]
        .split("\n")
        .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
        .join("\n")
    : match[1];
  let metadata: unknown;
  try {
    metadata = readYaml(body, 1, "Front matter");
  } catch (error) {
    // Do not transform valid block-scalar content containing quote-only lines.
    const compatible =
      error instanceof Error && error.message.includes("deficient indentation")
        ? legacyQuotedClosingIndent(body)
        : body;
    if (compatible === body) throw error;
    metadata = readYaml(compatible, 1, "Front matter");
  }

  if (metadata === null || metadata === undefined)
    return { source: match[0].replace(/[^\n]/g, " ") + source.slice(match[0].length) };
  if (typeof metadata !== "object" || Array.isArray(metadata))
    fail(1, "Front matter must be a mapping");
  const { title, config } = metadata as Record<string, unknown>;
  if (title !== undefined && typeof title !== "string")
    fail(1, "Front matter title must be a string");
  if (
    config !== undefined &&
    (config === null || typeof config !== "object" || Array.isArray(config))
  )
    fail(1, "Front matter config must be a mapping");
  return {
    source: match[0].replace(/[^\n]/g, " ") + source.slice(match[0].length),
    title: title as string | undefined,
    config: config as Record<string, unknown> | undefined,
  };
}

/** Mermaid's YAML 4 reader permits a closing quote at the mapping-key indent.
 * YAML 5 requires one more space; move only standalone closing delimiters.
 * The scalar content and every source line remain unchanged.
 */
function legacyQuotedClosingIndent(source: string): string {
  let quote: string | undefined;
  let keyIndent = 0;
  return source
    .split("\n")
    .map((line) => {
      let scanStart = 0;
      if (!quote) {
        const opening = /^([ \t]*)[^#"'[\]{}]+:[ \t]*(["'])/.exec(line);
        if (!opening) return line;
        quote = opening[2];
        keyIndent = opening[1].length;
        scanStart = opening[0].length;
      } else {
        const closing = /^([ \t]*)(["'])[ \t]*(?:#.*)?$/.exec(line);
        if (closing && closing[2] === quote && closing[1].length <= keyIndent) {
          quote = undefined;
          return " ".repeat(keyIndent + 1) + line.slice(closing[1].length);
        }
      }
      for (let index = scanStart; index < line.length; index++) {
        if (quote === '"' && line[index] === "\\") {
          index++;
          continue;
        }
        if (line[index] !== quote) continue;
        if (quote === "'" && line[index + 1] === "'") {
          index++;
          continue;
        }
        quote = undefined;
        break;
      }
      return line;
    })
    .join("\n");
}
