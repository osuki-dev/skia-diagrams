export interface MermaidFence {
  start: number;
  end: number;
  source: string;
  closed: boolean;
}
/** CommonMark fences: at most three leading spaces, matching character and length. */
export function findMermaidFences(markdown: string): MermaidFence[] {
  const fences: MermaidFence[] = [];
  const lines = markdown.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  let offset = 0;
  let active:
    | { start: number; content: number; marker: string; length: number; mermaid: boolean }
    | undefined;
  for (const line of lines) {
    const bare = line.replace(/\r?\n$/, "");
    if (active) {
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(bare);
      if (close && close[1][0] === active.marker && close[1].length >= active.length) {
        if (active.mermaid)
          fences.push({
            start: active.start,
            end: offset + line.length,
            source: markdown.slice(active.content, offset).replace(/\r?\n$/, ""),
            closed: true,
          });
        active = undefined;
      }
    } else {
      const open = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(bare);
      if (open && !(open[1][0] === "`" && open[2].includes("`")))
        active = {
          start: offset,
          content: offset + line.length,
          marker: open[1][0],
          length: open[1].length,
          mermaid: open[2].trim().toLowerCase() === "mermaid",
        };
    }
    offset += line.length;
  }
  if (active?.mermaid)
    fences.push({
      start: active.start,
      end: markdown.length,
      source: markdown.slice(active.content),
      closed: false,
    });
  return fences;
}
