import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const roots = ["src", "test", "scripts", "example"];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    if (["node_modules", "android", "ios", ".expo", "dist", "lib"].includes(name)) return [];
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Ignore examples in string literals and comments when inspecting module specifiers. */
function codePositions(source: string): Uint8Array {
  const positions = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (character === '"' || character === "'" || character === "`") {
      while (++index < source.length) {
        if (source[index] === "\\") index++;
        else if (source[index] === character) break;
      }
    } else if (source.startsWith("//", index)) {
      while (index < source.length && source[index] !== "\n") index++;
    } else if (source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      index = end < 0 ? source.length : end + 1;
    } else positions[index] = 1;
  }
  return positions;
}

/** Local TypeScript imports name the source file; tsc rewrites emitted extensions. */
export function checkImports(root = process.cwd(), fix = false): string[] {
  const failures: string[] = [];
  for (const file of roots.flatMap((name) => sourceFiles(join(root, name)))) {
    const source = readFileSync(file, "utf8");
    const positions = codePositions(source);
    const edits: { start: number; end: number; value: string }[] = [];
    // Includes erased type imports, re-exports, and dynamic imports.
    const specifiers = /\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)(["'])(\.[^"'\\\r\n]+)\1/g;
    for (const match of source.matchAll(specifiers)) {
      if (!positions[match.index!]) continue;
      const original = match[2];
      const base = resolve(dirname(file), original.replace(/\.(?:js|jsx|ts|tsx)$/, ""));
      const target = [
        base + ".ts",
        base + ".tsx",
        join(base, "index.ts"),
        join(base, "index.tsx"),
      ].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
      if (target) {
        const directoryImport = target.endsWith("/index.ts") || target.endsWith("/index.tsx");
        const explicitIndex = /\/index(?:\.(?:js|jsx|ts|tsx))?$/.test(original);
        const stem = original.replace(/\.(?:js|jsx|ts|tsx)$/, "");
        const expected =
          stem +
          (directoryImport && !explicitIndex ? "/index" : "") +
          (target.endsWith(".tsx") ? ".tsx" : ".ts");
        if (original !== expected) {
          failures.push(`${file}: ${original} must be ${expected}`);
          const start = match.index! + match[0].indexOf(match[1]) + 1;
          edits.push({ start, end: start + original.length, value: expected });
        }
      } else if (
        /\.(?:js|jsx|ts|tsx)$/.test(original) &&
        !existsSync(resolve(dirname(file), original))
      ) {
        failures.push(`${file}: missing local source ${original}`);
      }
    }
    if (fix && edits.length) {
      let updated = source;
      for (const edit of edits.sort((a, b) => b.start - a.start))
        updated = updated.slice(0, edit.start) + edit.value + updated.slice(edit.end);
      writeFileSync(file, updated);
    }
  }
  return failures;
}

if (import.meta.main) {
  const fix = process.argv.includes("--fix");
  const failures = checkImports(process.cwd(), fix);
  if (fix) console.log(`Normalized ${failures.length} local imports.`);
  else if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else console.log("All local TypeScript imports use their source extensions.");
}
