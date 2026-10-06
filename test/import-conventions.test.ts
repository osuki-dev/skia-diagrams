import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkImports } from "../scripts/check-imports.ts";

test("import guard handles type imports, re-exports, dynamic imports and TSX", () => {
  const root = mkdtempSync(join(tmpdir(), "skia-imports-"));
  try {
    for (const directory of ["src", "test", "scripts", "example"]) mkdirSync(join(root, directory));
    writeFileSync(join(root, "src/value.ts"), "export const value = 1;");
    writeFileSync(
      join(root, "src/component.tsx"),
      "export default function Component() { return null; }",
    );
    writeFileSync(
      join(root, "src/index.ts"),
      [
        'import type { Value } from "./value.js";',
        'export { value } from "./value";',
        'const lazy = import("./component.js");',
        'import "./value.js";',
        'import external from "external/package.js";',
      ].join("\n"),
    );
    expect(checkImports(root)).toHaveLength(4);
    checkImports(root, true);
    expect(checkImports(root)).toEqual([]);
    const source = readFileSync(join(root, "src/index.ts"), "utf8");
    expect(source).toContain('import("./component.tsx")');
    expect(source).toContain('"external/package.js"');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
