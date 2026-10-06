/** All classic identities, plus directed/open/circle/cross terminals. */
export const shapeFixtures = {
  FlowchartShapes: `flowchart TD
A[Rectangle] --> B(Rounded)
B --> C([Stadium])
C --> D[[Subroutine]]
D --> E[(Database)]
E --> F((Circle))
F --> G>Flag]
G --> H{Decision}
H --> I{{Hexagon}}
I --> J[/Input/]
J --> K[\\Output\\]
K --> L[/Trapezoid\\]
L --> M[\\Inverse trapezoid/]
M --> N(((Double circle)))
N o--o A
C x--x F
H --- N`,
  FlowchartBranches:
    "flowchart TD\nA[Start] --> B[Check one]\nA --> C[Check two]\nB -->|one ready| D{Merge?}\nC -->|two ready| D\nD --> E([Finish])\nD -->|retry| A",
} as const;
