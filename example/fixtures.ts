export const fixtures: Record<string, string> = {
  Flowchart: "flowchart LR\nA[Start] --> B{Ready?}\nB -->|yes| C((Done))\nB -->|no| A",
  Sequence:
    "sequenceDiagram\nparticipant A as Alice\nparticipant B as Bob\nloop retry\nA->>+B: Hello\nB-->>-A: Welcome\nend",
  Class: "classDiagram\nclass Animal {\n+name: string\n+walk()\n}\nAnimal <|-- Dog",
  State: "stateDiagram-v2\n[*] --> Idle\nIdle --> Active : start\nActive --> [*]",
  ER: "erDiagram\nUSER {\nstring name\n}\nUSER ||--o{ POST : writes",
  Gantt:
    "gantt\ndateFormat YYYY-MM-DD\nsection Build\nParse :done, p, 2026-01-01, 2d\nDraw :crit, d, after p, 3d",
  Pie: 'pie\n"Cats" : 10\n"Dogs" : 20\n"Birds" : 5',
  GitGraph:
    'gitGraph\ncommit id: "first"\nbranch feature\ncheckout feature\ncommit\ncheckout main\nmerge feature',
  Mindmap: "mindmap\n  root((Ideas))\n    A[Parse]\n      Tokens\n    B[Render]",
  Timeline: "timeline\ntitle Releases\n2025 : Started\n2026 : Shipped",
  Journey: "journey\nsection Day\nCoffee : 5 : Me\nBuild : 4 : Me, Team",
  Quadrant: "quadrantChart\nx-axis Low --> High\nProject A: [0.3, 0.7]\nProject B: [0.8, 0.4]",
  XY: "xychart-beta\nx-axis [Jan, Feb, Mar]\ny-axis 0 --> 100\nbar [20, 40, 80]\nline [30, 60, 90]",
  SyntaxError: "flowchart TD\nA -->",
  Unsupported: "unknownDiagram\nA-->B",
  TooLarge: `flowchart TD\n${Array.from({ length: 301 }, (_, i) => `N${i}`).join("\n")}`,
};
