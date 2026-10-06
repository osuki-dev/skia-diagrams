import { fail } from "./common.ts";

export interface C4Statement {
  text: string;
  /** One-based source line of the first non-whitespace character. */
  line: number;
}

/** Split declarations without treating quoted labels or multiline arguments as syntax. */
export function c4Statements(source: string): C4Statement[] {
  const statements: C4Statement[] = [];
  let buffer = "",
    hasText = false,
    line = 1,
    statementLine = 1,
    depth = 0,
    quote = false,
    escaped = false,
    completedCall = false;

  const append = (character: string) => {
    if (!hasText && character.trim()) {
      statementLine = line;
      hasText = true;
    }
    buffer += character;
  };
  const flush = () => {
    const text = buffer.trim();
    if (text) statements.push({ text, line: statementLine });
    buffer = "";
    hasText = false;
    completedCall = false;
  };

  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quote) {
      append(character);
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quote = false;
      if (character === "\n") line++;
      continue;
    }
    if (character === "%" && source[index + 1] === "%") {
      while (index < source.length && source[index] !== "\n") index++;
      if (index < source.length) {
        if (depth) append("\n");
        else if (!completedCall) flush();
        line++;
      }
      continue;
    }
    // Keep a completed boundary call pending so a brace on the next line belongs to it.
    if (completedCall && character.trim() && character !== "{") flush();
    if (character === '"') {
      quote = true;
      append(character);
    } else if (character === "(") {
      depth++;
      append(character);
    } else if (character === ")") {
      if (!depth) fail(line, "Unexpected C4 closing parenthesis");
      depth--;
      append(character);
      completedCall = depth === 0;
    } else if (!depth && character === "{") {
      append(character);
      flush();
    } else if (!depth && character === "}") {
      flush();
      append(character);
      flush();
    } else if (!depth && character === ";") {
      flush();
    } else if (character === "\n") {
      if (depth) append(character);
      else if (!completedCall) flush();
      line++;
    } else {
      append(character);
    }
  }
  if (quote) fail(statementLine, "Unclosed C4 quoted argument");
  if (depth) fail(statementLine, "Unclosed C4 argument list");
  flush();
  return statements;
}
