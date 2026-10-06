export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}
/** Restricted Markdown emphasis only; never HTML, scripts, links or callbacks. */
export function textRuns(source: string, literal = false): TextRun[] {
  if (literal) return [{ text: source }];
  const runs: TextRun[] = [];
  let cursor = 0;
  for (const match of source.matchAll(/\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g)) {
    if (match.index > cursor) runs.push({ text: source.slice(cursor, match.index) });
    runs.push({
      text: match[1] ?? match[2] ?? match[3] ?? match[4],
      bold: match[1] !== undefined || match[2] !== undefined,
      italic: match[1] === undefined && match[2] === undefined,
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) runs.push({ text: source.slice(cursor) });
  return runs.length ? runs : [{ text: source }];
}
/** Preserve restricted emphasis across measured line breaks and ellipsis. */
export function runsForLines(source: string, lines: string[], literal = false): TextRun[][] {
  const runs = textRuns(source, literal),
    plain = runs.map((run) => run.text).join("");
  let offset = 0;
  return lines.map((line) => {
    const ellipsis = line.endsWith("…"),
      content = ellipsis ? line.slice(0, -1) : line;
    const found = plain.indexOf(content, offset),
      start = found < 0 ? offset : found;
    const end = start + content.length;
    let cursor = 0;
    const selected: TextRun[] = [];
    for (const run of runs) {
      const left = Math.max(start, cursor),
        right = Math.min(end, cursor + run.text.length);
      if (right > left)
        selected.push({ ...run, text: run.text.slice(left - cursor, right - cursor) });
      cursor += run.text.length;
    }
    if (ellipsis) selected.push({ text: "…" });
    offset = end;
    return selected;
  });
}
