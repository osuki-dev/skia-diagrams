/** Legal extremes: keep the existing 300-node cap, not a smaller QA-only subset. */
export const extremeFixtures = {
  ExtremeTall:
    "flowchart TD\n" +
    Array.from(
      { length: 299 },
      (_, i) =>
        `N${i}[${i === 0 ? "TOP" : "Node " + i}]-->N${i + 1}[${i === 298 ? "BOTTOM" : "Node " + (i + 1)}]`,
    ).join("\n"),
  ExtremeWide:
    "flowchart LR\n" +
    Array.from(
      { length: 299 },
      (_, i) =>
        `N${i}[${i === 0 ? "LEFT" : "Node " + i}]-->N${i + 1}[${i === 298 ? "RIGHT" : "Node " + (i + 1)}]`,
    ).join("\n"),
  ExtremeLabels: `flowchart TD\nA["${"Large label 123 ABC ".repeat(180)}"]-->B["${"Wrapped detail 456 DEF ".repeat(180)}"]`,
} as const;
