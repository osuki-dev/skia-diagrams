import type { TextMeasurer } from "../types.ts";
import { textRuns } from "../render/text.ts";
/** Deterministic Node fallback; native callers inject Paragraph metrics. */
export const estimateText: TextMeasurer = (text, style) => {
  const sourceLines = textRuns(text, style.literal)
    .map((run) => run.text)
    .join("")
    .split("\n");
  const lines: string[] = [];
  for (const source of sourceLines) {
    let line = "",
      width = 0;
    for (const char of source) {
      const advance = (char.charCodeAt(0) > 255 ? 1 : 0.6) * style.fontSize;
      if (line && style.maxWidth !== undefined && width + advance > style.maxWidth) {
        lines.push(line);
        line = "";
        width = 0;
      }
      line += char;
      width += advance;
    }
    lines.push(line);
  }
  const widths = lines.map((line) =>
    [...line].reduce((sum, c) => sum + (c.charCodeAt(0) > 255 ? 1 : 0.6) * style.fontSize, 0),
  );
  return {
    width: Math.max(0, ...widths),
    height: Math.max(1, lines.length) * style.fontSize * 1.4,
    lines,
  };
};
