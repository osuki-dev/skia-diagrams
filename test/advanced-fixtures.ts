/** Regression surfaces for the implemented design subsets beyond the gallery. */
export const advancedFixtures = {
  "advanced-flowchart":
    "flowchart TD\nsubgraph outer [Outer title]\ndirection LR\nA[Alpha]-->B[Beta]\nsubgraph inner [Inner title]\ndirection TB\nC[Gamma]-->D[Delta]\nend\nB-->C\nend\nZ-->outer",
  "advanced-sequence":
    "sequenceDiagram\nbox rgb(220,240,255) Team\nparticipant A as Alice\nactor B as Bob\nend\nparticipant C\nalt outer\nloop inner\nA->>+B: work\nB->>B: self\nB-->>-A: done\nend\nelse other\nNote right of C: outside note\nB--)C: reply\nend",
  "advanced-state":
    "stateDiagram-v2\n[*]-->Running\nstate Running {\nstate f <<fork>>\nstate j <<join>>\nf-->A\nf-->B\nA-->j\nB-->j\n}\nRunning-->[*]\nnote right of Running: external\nnote left of A\nline one\nline two\nend note",
  "advanced-er":
    'erDiagram\nUSER {\nint id PK "primary key"\nstring name UK "display name"\n}\nORDER {\nint id PK\nint userId FK\n}\nUSER ||--o{ ORDER : places',
  "advanced-gantt":
    "gantt\ndateFormat DD/MM/YYYY\naxisFormat %d %b\nsection Work\nDone :done, a, 01/10/2026, 2d\nActive :active, b, after a, 3d\nCritical :crit, c, after b, 4d\nRelease :milestone, r, after c, 0d",
  "advanced-gitgraph":
    'gitGraph\ncommit id:"initial"\nbranch feature\ncommit id:"work" tag:"v1"\ncheckout main\ncommit id:"main-work"\nmerge feature id:"merged"',
  "advanced-mindmap":
    "mindmap\n root((Root))\n  Big[Large branch]\n   A[Long label alpha]\n   B[Long label beta]\n   C[Long label gamma]\n  Small{{Small}}",
  "advanced-quadrant":
    "quadrantChart\nx-axis Low --> High\ny-axis Small --> Large\nquadrant-1 Q1\nquadrant-2 Q2\nquadrant-3 Q3\nquadrant-4 Q4\nPoint: [0.3, 0.7]",
  "advanced-xychart":
    'xychart-beta horizontal\nx-axis "Category" [a,b,c]\ny-axis "Amount" -10 --> 50\nbar [10,20,30]\nbar [20,30,40]\nline [-20,60,30]',
  "advanced-wrapping":
    'flowchart LR\nA["`**中文流程图中文流程图中文流程图中文流程图中文流程图中文流程图中文流程图中文流程图**`"]-->B["结束"]',
};
