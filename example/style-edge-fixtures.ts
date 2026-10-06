/** Selectable native detail cases; the original thirteen before/after inputs stay unchanged. */
export const styleEdgeFixtures = {
  ClassMarkers:
    "classDiagram\nBase <|-- Child\nChild o-- Part : aggregate\nChild *-- Owned : compose\nChild ..|> Contract : realize\nChild ..> Peer : depend",
  ERMarkers:
    "erDiagram\nA ||--|| B : required\nB |o--o| C : optional\nC }|--|{ D : many\nD }o..o{ A : optional many",
  SequenceMarkers:
    "sequenceDiagram\nparticipant A as Sender\nparticipant B as Receiver\nA->B: plain\nB-->>A: return\nA-)B: async\nB--xA: destroy\nA->>A: self Request",
  StateMarkers:
    "stateDiagram-v2\n[*]-->Ready\nstate Decision <<choice>>\nReady-->Decision\nDecision-->Ready : retry\nDecision-->Done : yes\nDone-->[*]",
  XYBoundary:
    'xychart-beta\nx-axis "Region" [Request,JP,KR]\ny-axis "Value" -10 --> 10\nbar [-20,0,20]\nline [-20,20,0]',
} as const;
