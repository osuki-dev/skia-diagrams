import { parseEvents, constructFromEvents, getScalarValue, EVENT_ID, CORE_SCHEMA } from "js-yaml";
import { fail } from "./common.ts";

/** One bounded YAML reader for front matter and Mermaid object attributes. */
export function readYaml(
  source: string,
  line: number,
  description: string,
  keys?: string[],
): unknown {
  let value: unknown;
  try {
    const events = parseEvents(source, { maxDepth: 32 });
    // The native event stream preserves authored keys without a second parse or
    // an AST allocation. Each immediate mapping child alternates key/value.
    if (keys) {
      let depth = 0;
      let child = 0;
      for (const event of events) {
        if (event.type === EVENT_ID.POP) {
          depth--;
          continue;
        }
        if (depth === 2) {
          if (child++ % 2 === 0 && event.type === EVENT_ID.SCALAR)
            keys.push(getScalarValue(source, event));
        }
        if (
          event.type === EVENT_ID.DOCUMENT ||
          event.type === EVENT_ID.MAPPING ||
          event.type === EVENT_ID.SEQUENCE
        )
          depth++;
      }
    }
    const documents = constructFromEvents(events, { source, schema: CORE_SCHEMA, maxAliases: 100 });
    if (documents.length > 1) throw new Error("Expected a single YAML document");
    value = documents[0];
  } catch (error) {
    fail(
      line,
      `Invalid ${description.toLowerCase()}: ${error instanceof Error && error.message.includes("maxDepth") ? "exceeds nesting limits" : error instanceof Error ? error.message : String(error)}`,
    );
  }
  validateMetadata(value, line, description);
  return value;
}

export function readYamlMapping(
  source: string,
  line: number,
  description: string,
  keys?: string[],
): Record<string, unknown> {
  const value = readYaml(source, line, description, keys);
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(line, `${description} must be a mapping`);
  return value as Record<string, unknown>;
}

/** Bound aliases and nesting before configuration is passed to serializers/layouts. */
function validateMetadata(value: unknown, line: number, description: string): void {
  const seen = new WeakSet<object>(),
    ancestors = new WeakSet<object>();
  let aliases = 0,
    entries = 0;
  const visit = (current: unknown, depth: number) => {
    if (!current || typeof current !== "object") return;
    if (depth > 32 || ++entries > 20000) fail(line, `${description} exceeds configuration limits`);
    if (ancestors.has(current))
      fail(line, `Cyclic ${description.toLowerCase()} aliases are not supported`);
    if (seen.has(current)) {
      if (++aliases > 100) fail(line, `${description} exceeds alias limits`);
      return;
    }
    seen.add(current);
    ancestors.add(current);
    for (const child of Object.values(current)) visit(child, depth + 1);
    ancestors.delete(current);
  };
  visit(value, 0);
}
