import { fail } from "./common.ts";
import { readYamlMapping } from "./yaml.ts";

export interface UsecaseJsonRow {
  key: string;
  accessibleKey: string;
  value: string;
}

/** Strict JSON tables preserve authored object order, including integer-looking keys. */
export function readUsecaseJson(
  source: string,
  line: number,
): {
  data: Record<string, unknown>;
  rows: UsecaseJsonRow[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    fail(line, `Invalid use-case JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    fail(line, "Use-case JSON must be an object");
  // Reuse the shared bounded metadata validator before traversing nested data.
  readYamlMapping(source, line, "Use-case JSON");
  const data = parsed as Record<string, unknown>;
  const tokens =
    source.match(/"(?:\\.|[^"\\])*"|[{}[\]:,]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ??
    [];
  let cursor = 0;
  const order = new Map<string, string[]>();
  const pointerPart = (key: string) => key.replace(/~/g, "~0").replace(/\//g, "~1");
  const scan = (pointer: string): void => {
    const token = tokens[cursor++];
    if (token === "{") {
      const keys: string[] = [];
      order.set(pointer, keys);
      while (tokens[cursor] !== "}") {
        const key = JSON.parse(tokens[cursor++]) as string;
        keys.push(key);
        cursor++; // colon, already validated by JSON.parse
        scan(`${pointer}/${pointerPart(key)}`);
        if (tokens[cursor] === ",") cursor++;
      }
      cursor++;
    } else if (token === "[") {
      let index = 0;
      while (tokens[cursor] !== "]") {
        scan(`${pointer}/${index++}`);
        if (tokens[cursor] === ",") cursor++;
      }
      cursor++;
    }
  };
  scan("");
  const rows: UsecaseJsonRow[] = [];
  const scalar = (value: unknown): string => (value === null ? "null" : String(value));
  const append = (key: string, accessibleKey: string, value: string) =>
    rows.push({ key, accessibleKey, value });
  const visit = (value: unknown, path: string, pointer: string): void => {
    if (Array.isArray(value)) {
      if (!value.length) append(path, path, "[]");
      else if (
        value.every(
          (item) => item === null || ["string", "number", "boolean"].includes(typeof item),
        )
      ) {
        value.forEach((item, index) => append(index ? "" : path, path, scalar(item)));
      } else
        value.forEach((item, index) => visit(item, `${path}[${index}]`, `${pointer}/${index}`));
    } else if (value !== null && typeof value === "object") {
      const keys = order.get(pointer) ?? Object.keys(value);
      if (!keys.length) append(path, path, "{}");
      for (const key of keys)
        visit(
          (value as Record<string, unknown>)[key],
          path ? `${path}.${key}` : key,
          `${pointer}/${pointerPart(key)}`,
        );
    } else append(path, path, scalar(value));
  };
  visit(data, "", "");
  return { data, rows };
}
