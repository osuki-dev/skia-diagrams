import { readFileSync } from "node:fs";
/** Frozen Mermaid 11.4.1 docs. Exclude only features explicitly outside the
 * requested design subset, never an example merely because our parser fails. */
export function officialExamples(): { name: string; source: string }[] {
  const examples: { name: string; source: string }[] = [];
  for (const file of ["flowchart", "sequenceDiagram"]) {
    const docs = readFileSync(`${import.meta.dir}/../fixtures/official/${file}.md`, "utf8");
    let index = 0;
    for (const match of docs.matchAll(/```mermaid(?:-example)?\s*\n([\s\S]*?)\n```/g)) {
      index++;
      const source = match[1].replace(/^---\n[\s\S]*?\n---\n/, "").trim();
      if (!/^(?:%%[^\n]*\n\s*)*(flowchart|graph|sequenceDiagram)\b/.test(source)) continue;
      if (
        /@\{|\bfa[bsrlkd]?:|(?:^|\n)\s*(?:create|destroy|links?|properties|details)\s|<<--?>>|~~~/.test(
          source,
        )
      )
        continue;
      // FontAwesome rendering, arbitrary metadata shapes, invisible links,
      // participant creation, menus and bidirectional arrows are not in §3.1/3.2.
      examples.push({ name: `${file}-${index}`, source });
    }
  }
  return examples;
}
