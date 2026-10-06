import { fixtures } from "./fixtures.ts";
import { cjkFixtures } from "./cjk-fixtures.ts";
import { shapeFixtures } from "./shape-fixtures.ts";
import { extremeFixtures } from "./extreme-fixtures.ts";
import { styleEdgeFixtures } from "./style-edge-fixtures.ts";
import { designFixtures } from "./design-fixtures.ts";
/** Authored interaction and stress examples; official fixtures remain verbatim. */
export const detailedFixtures: Record<string, string> = {
  Flowchart: `flowchart TD
Start([Receive request]) --> Queue[(Request queue)]
subgraph Intake [Request validation]
  Queue --> Decode[Decode payload]
  Decode --> Schema{Valid schema?}
  Schema -->|Yes| Identity[Verify identity]
  Schema -->|No| Invalid[Record validation error]
  Identity --> Access{Authorized?}
  Access -->|Yes| Dedupe{Already processed?}
  Access -->|No| Denied[Record access denial]
  Dedupe -->|Yes| Cached[Return cached result]
  Dedupe -->|No| Normalize[Normalize input]
end
subgraph Processing [Processing and recovery]
  Normalize --> Plan[Create execution plan]
  Plan worker-start@--> Execute[Run worker]
  Execute worker-result@--> Complete{Worker succeeded?}
  Complete worker-success@-->|Yes| Commit[(Commit result)]
  Complete worker-failure@-->|No| Retry{Retry budget available?}
  Retry retry-scheduled@-->|Yes| Backoff[Schedule backoff]
  Backoff worker-resume@--> Execute
  Retry retries-exhausted@-->|No| DeadLetter[(Dead letter queue)]
  Commit --> Audit[Append audit event]
end
subgraph Delivery [Delivery and observation]
  Audit --> Notify[Publish notification]
  Notify --> Delivered{Delivery confirmed?}
  Delivered -->|Yes| Metrics[Update metrics]
  Delivered -->|No| Outbox[(Pending delivery outbox)]
  Outbox --> Replay[Replay pending event]
  Replay --> Notify
  Metrics --> Done([Completed])
end
Invalid --> Failed([Rejected])
Denied --> Failed
DeadLetter manual-review@--> Review[Request manual review]
Review review-retry@-->|Approved| Backoff
Cached --> Done
click Review callback "Inspect the failed request"
click Audit "https://mermaid.js.org/syntax/flowchart.html" "View flowchart syntax"`,
  Sequence:
    "sequenceDiagram\nbox Team\nparticipant A as Alice\nactor B as Bob\nend\nparticipant C\nalt outer\nloop retry\nA->>+B: Request\nB->>B: self\nB-->>-A: Success\nend\nelse other\nNote right of C: first line<br/>second line\nB--)C: reply\nend",
  Class:
    "classDiagram\nclass Animal {\n+name: string\n+walk()\n}\nclass Dog {\n+breed: string\n+bark()\n}\nAnimal <|-- Dog\nDog *-- Collar\nDog ..> Owner : depends",
  State:
    "stateDiagram-v2\n[*]-->Running\nstate Running {\nstate f <<fork>>\nstate j <<join>>\nf-->A\nf-->B\nA-->j\nB-->j\n}\nRunning-->[*]\nnote right of Running: Request\nnote left of A\nline one\nline two\nend note",
  ER: 'erDiagram\nUSER {\nint id PK "primary key"\nstring name UK "display name"\n}\nORDER {\nint id PK\nint userId FK\n}\nUSER ||--o{ ORDER : places',
  Gantt:
    "gantt\ndateFormat DD/MM/YYYY\naxisFormat %d %b\nsection Work\nDone :done, a, 01/10/2026, 2d\nActive :active, b, after a, 3d\nCritical :crit, c, after b, 4d\nRelease :milestone, r, after c, 0d",
  Pie: 'pie\ntitle Resource mix\n"Request" : 24\n"Build" : 40\n"Review" : 36',
  GitGraph:
    'gitGraph\ncommit id:"initial"\nbranch feature\ncommit id:"work" tag:"v1"\ncheckout main\ncommit id:"main-work"\nmerge feature id:"merged"',
  Mindmap:
    "mindmap\n root((Request))\n  Big[Large branch]\n   A[Long label alpha]\n   B[Long label beta]\n   C[Long label gamma]\n  Small{{Small}}",
  Timeline:
    "timeline\ntitle Release history\nsection Planning\n2025 : Request : Prototype\nsection Delivery\n2026 : Test : Success",
  Journey:
    "journey\ntitle Build together\nsection Plan\nRequest : 3 : Me, Team\nReview : 4 : Team\nsection Ship\nSuccess : 5 : Me, Team",
  Quadrant:
    "quadrantChart\nx-axis Low --> High\ny-axis Small --> Large\nquadrant-1 Q1\nquadrant-2 Q2\nquadrant-3 Q3\nquadrant-4 Q4\nRequest: [0.3, 0.7]\nProject B: [0.8, 0.3]",
  XY: 'xychart-beta horizontal\nx-axis "Category" [a,b,c]\ny-axis "Amount" -10 --> 50\nbar [10,20,30]\nbar [20,30,40]\nline [-20,60,30]',
};
export const supportedTypes = Object.keys(detailedFixtures);
export const exampleFixtures: Record<string, string> = {
  ...fixtures,
  ...designFixtures,
  ...cjkFixtures,
  ...shapeFixtures,
  ...extremeFixtures,
  ...styleEdgeFixtures,
  // Retain the fixed-color case separately rather than silently overriding its
  // authored fill in dark mode. The portable detailed case uses cluster tokens.
  SequenceColored: detailedFixtures.Sequence.replace("box Team", "box rgb(220,240,255) Team"),
};
export const exampleNames = Object.keys(exampleFixtures);
export const subsetDescriptions: Record<string, string> = {
  Flowchart:
    "14 classic shapes, directed/marked/styled edges, nested local-direction subgraphs, plain or emphasized multiline labels.",
  Sequence:
    "Participants/actors, aliases, messages and activation, self messages, notes, nested fragments and participant boxes.",
  Class:
    "Class compartments and members; inheritance, composition, aggregation, dependency and realization edges.",
  State: "Initial/final/choice/fork/join, composite states, transitions and inline/block notes.",
  ER: "Entity tables with type/name/key/comment columns and relationship cardinalities.",
  Gantt:
    "Date formats, sections, dependencies, exclusions, done/active/critical tasks and milestones.",
  Pie: "Nonnegative numeric slices, title and legend.",
  GitGraph: "Commits, branch ordering, checkout, merges, tags and commit types.",
  Mindmap: "Indented trees, labels and classic node shapes.",
  Timeline: "Title, sections, periods and multiple events.",
  Journey: "Sections, actor lanes and scores from 1 to 5.",
  Quadrant: "Axes, quadrant labels and normalized points.",
  XY: "Numeric/category axes, axis titles, multiple grouped bars/lines, horizontal plots and clipping.",
  SyntaxError: "Invalid syntax falls back to source, never a partially drawn diagram.",
  Unsupported: "Unrecognized syntax falls back to source.",
  TooLarge: "More than 300 nodes or 600 edges/events is rejected before layout.",
  SequenceColored:
    "Explicit pale RGB box fill is preserved. In dark mode, inject appropriate foreground tokens for this authored fill; automatic defaults do not override explicit Mermaid styling.",
};
