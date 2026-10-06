export const flowchartDetailFixtures = {
  basic: "flowchart LR\nA(Receive request) --> B[Validate] --> C([Complete])",
  decision:
    'flowchart TD\nA[Receive] --> B{"Check the request<br/>and confirm all fields<br/>before continuing?"}\nB -->|valid| C[Accept]\nB -->|needs changes| D[Revise]\nD --> B\nC --> E((Done))',
  nested:
    "flowchart TD\nsubgraph outer [Request pipeline]\ndirection LR\nA[Receive] --> B[Prepare]\nsubgraph inner [Validation]\ndirection TB\nC{Ready?} -->|yes| D[Accept]\nC -->|no| E[Revise]\nE --> C\nend\nB --> C\nend\nZ([Start]) --> outer\nD --> F([Finish])",
  cjk: 'flowchart LR\nA["中文<br/>流程图"] -->|开始| B{"开始<br/>成功?"}\nB -->|成功| C([成功])',
  branch:
    "flowchart TD\nA[Start] --> B[Check one]\nA --> C[Check two]\nB -->|one ready| D[Merge]\nC -->|two ready| D\nD --> E[Finish]\nD -->|retry| A",
  sparse: "flowchart LR\nA[First]\nB[Second]\nC[Third]",
} as const;
