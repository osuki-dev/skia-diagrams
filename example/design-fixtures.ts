/** Publishable examples matching the approved design board.
 * Semantic shapes and markers come from supported Mermaid syntax. */
import type { DiagramTheme } from "@osuki-dev/skia-diagrams";
import { mergeThemeOverrides } from "../src/render/theme.ts";

export const designFixtures: Record<string, string> = {
  Flowchart:
    "flowchart TD\nA(Start)-->B{Review}\nB-->|Revise|C(Update<br/>Content)\nB-->|Approve|D(Publish)\nC-->D\nstyle A fill:palette:0,stroke:accent\nstyle B fill:paletteFill:1,stroke:palette:1\nstyle C fill:headerFill\nstyle D fill:paletteFill:2,stroke:palette:2",
  Sequence:
    "sequenceDiagram\nparticipant C as Client\nparticipant A as API\nparticipant D as Database\nactivate C\nC->>+A: 1. request()\nA->>+D: 2. query()\nD-->>-A: 3. results()\nA-->>-C: 4. response()\ndeactivate C",
  Class:
    "classDiagram\nclass Animal {\n+name: String\n+age: Int\n+speak(): void\n+move(): void\n}\nclass Dog {\n+breed: String\n+owner: String\n+speak(): void\n+fetch(): void\n}\nAnimal <|-- Dog",
  State:
    "stateDiagram-v2\ndirection LR\n[*]-->Idle\nIdle-->Running : start()\nRunning-->Idle : stop()\nRunning-->[*] : finish()",
  ER: "erDiagram\ndirection LR\nUsers {\nint id PK\nvarchar name\nvarchar email\ndatetime created_at\n}\nPosts {\nint id PK\nvarchar title\ntext content\nint user_id FK\ndatetime created_at\n}\nUsers ||--o{ Posts : writes",
  Gantt:
    "gantt\ndateFormat YYYY-MM-DD\naxisFormat %b\nsection Delivery\nPlan :done, p, 2026-01-01, 31d\nBuild :crit, b, after p, 60d\nTest :active, t, after b, 30d\nLaunch :milestone, l, 2026-05-15, 0d",
  Pie: 'pie\n"Product" : 40\n"Marketing" : 25\n"Operations" : 20\n"Support" : 15',
  GitGraph:
    '---\nconfig:\n  gitGraph:\n    showCommitLabel: false\n---\ngitGraph\ncommit id:"init"\nbranch feature/login\ncommit id:"login"\nbranch feature/ui\ncommit id:"ui"\ncheckout feature/login\ncommit id:"auth"\ncheckout main\ncommit id:"main"\nmerge feature/login id:"login merge"\nmerge feature/ui id:"ui merge"\nbranch develop\ncommit id:"next"',
  Mindmap: "mindmap\n Idea\n  People\n  Process\n  Technology\n  Growth",
  Timeline:
    "timeline\nQ1 2024 : Kickoff : Jan 10\nQ2 2024 : Beta Release : Apr 3\nQ3 2024 : General Availability : Jul 1",
  Journey:
    "journey\nsection Adoption\nDiscover : 2 : User, Business\nTry : 3 : User\nAdopt : 5 : User, Business",
  Quadrant:
    "quadrantChart\nx-axis Low --> High\ny-axis Low --> High\nquadrant-1 Strategic Bets\nquadrant-2 Quick wins\nquadrant-3 Fill ins\nquadrant-4 Defer\nA: [0.25, 0.7]\nB: [0.75, 0.8]\nC: [0.8, 0.65]\nD: [0.25, 0.25]\nE: [0.7, 0.3]",
  XY: 'xychart-beta\nx-axis [Jan, Feb, Mar, Apr, May, Jun]\ny-axis "Amount" 0 --> 150\nbar "Product" [35, 45, 50, 65, 90, 95]\nbar "Marketing" [45, 55, 65, 80, 100, 110]\nbar "Sales" [40, 48, 47, 58, 75, 102]\nline "Total Users" [65, 78, 92, 105, 120, 137]',
};

/** Optional host configuration for the approved chart legend. */
export const designChartStyles = {
  pie: {
    labelColor: "#FFFFFF",
    outerStrokeWidth: 0,
    donutHole: 0,
    highlightScale: 1,
    textPosition: 0.64,
  },
  gantt: { table: true, taskHeader: "Task", showSections: false },
  gitgraph: { columnGap: 40, laneGap: 48, commitRadius: 7 },
  xychart: {
    legendPosition: "right" as const,
    legendMarker: "circle" as const,
    seriesLabels: ["Product", "Marketing", "Sales", "Total Users"],
    seriesPalette: [0, 1, 2, 1],
  },
};

/** Gallery and editor use the same approved defaults; host edits retain priority. */
export function approvedExampleTheme(...overrides: Partial<DiagramTheme>[]): Partial<DiagramTheme> {
  return overrides.reduce<Partial<DiagramTheme>>(
    (theme, override) => mergeThemeOverrides(theme, override) ?? theme,
    { layout: { typeStyles: designChartStyles } },
  );
}
